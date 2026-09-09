import { MARKS, roomCentre, roomOf, spacesOf, type HouseSpec } from './house';
import { Rng } from './rng';
import { freshThreat, readThreat, type ThreatState } from './threat';

export const STATION_PROTOCOL = 5;
export const ROOM_COUNTS = [14] as const;
export type MonsterKind = 'stalker' | 'crawler' | 'sentinel';
export const MONSTERS: ReadonlyArray<{
  id: MonsterKind;
  name: string;
  detail: string;
  speed: number;
  vent: number;
}> = [
  {
    id: 'stalker',
    name: 'Der Verlorene',
    detail:
      'Ein verlassener EVA-Anzug. Hört Schritte über weite Strecken und sucht die letzte bekannte Position ab.',
    speed: 1.3,
    vent: 28,
  },
  {
    id: 'crawler',
    name: 'Schachtläufer',
    detail: 'Niedrig und schnell. Rasches Kratzen verrät seine häufigen Wartungsschachtwechsel.',
    speed: 1.8,
    vent: 16,
  },
  {
    id: 'sentinel',
    name: 'Wächter',
    detail:
      'Defekter Sicherheitsroboter. Erkennt Licht aus großer Entfernung und ist an schweren Metalltritten zu hören.',
    speed: 1.05,
    vent: 38,
  },
];
export interface StationOptions {
  rooms: number;
  monster: MonsterKind;
  test: boolean;
  bright: boolean;
}
export interface Repair {
  id: string;
  title: string;
  roomId: string;
  itemId: string;
  item: string;
  hint: string;
  code: string;
  puzzle: 'wires' | 'sequence' | 'tune';
  order: number[];
}
export interface PuzzleState {
  open: boolean;
  links: number[];
  digits: number[];
}
export interface CrewState {
  options: StationOptions;
  hp: number;
  invulnerable: number;
  exertion: number;
  pulse: number;
  hidden: string;
  inventory: string[];
  opened: string[];
  puzzles: Record<string, PuzzleState>;
  venting: number;
  simulation: boolean;
  threat: ThreatState;
}

export function stationOptions(value: unknown): StationOptions {
  const v = record(value);
  const rooms = 14;
  return {
    rooms,
    monster: v.monster === 'crawler' || v.monster === 'sentinel' ? v.monster : 'stalker',
    test: v.test === true,
    bright: v.bright === true,
  };
}

export function freshCrew(options: StationOptions = stationOptions(null)): CrewState {
  return {
    options: { ...options },
    hp: 3,
    invulnerable: 0,
    exertion: 0,
    pulse: 72,
    hidden: '',
    inventory: [],
    opened: [],
    puzzles: {},
    venting: 0,
    simulation: false,
    threat: freshThreat(),
  };
}

/** Bounded, finite snapshots, including late joins and damaged/old packets. */
export function readCrew(value: unknown): CrewState {
  const v = record(value);
  const c = freshCrew(stationOptions(v.options));
  c.hp = Math.round(bounded(v.hp, 0, 3, 3));
  c.invulnerable = bounded(v.invulnerable, 0, 4, 0);
  c.exertion = bounded(v.exertion, 0, 1, 0);
  c.pulse = Math.round(bounded(v.pulse, 50, 180, 72));
  c.hidden = typeof v.hidden === 'string' ? v.hidden.slice(0, 16) : '';
  c.inventory = strings(v.inventory);
  c.opened = strings(v.opened);
  c.venting = bounded(v.venting, 0, 3, 0);
  c.simulation = v.simulation === true && c.options.test;
  c.threat = readThreat(v.threat);
  const puzzles = record(v.puzzles);
  for (const id of ['engine', 'oxygen', 'uplink']) {
    const p = record(puzzles[id]);
    c.puzzles[id] = {
      open: p.open === true,
      links: numbers(p.links, 4),
      digits: numbers(p.digits, 3),
    };
  }
  if (c.options.test) {
    c.hp = 3;
    c.hidden = '';
    c.threat = freshThreat();
  }
  return c;
}

const repairCache = new WeakMap<HouseSpec, Repair[]>();
export function repairsFor(spec: HouseSpec): Repair[] {
  const cached = repairCache.get(spec);
  if (cached) return cached;
  const rng = new Rng(spec.seed ^ 0x53484950);
  const kinds = ['werkstatt', 'bad', 'musikzimmer'];
  const names = ['Antrieb wiederherstellen', 'Lebenserhaltung stabilisieren', 'Notsignal senden'];
  const used = new Set<string>();
  const repairs = ['engine', 'oxygen', 'uplink'].map((id, i) => {
    const task = spec.tasks[i]!;
    const room =
      spec.rooms.find((r) => r.kind === kinds[i] && !used.has(r.id)) ??
      spec.rooms.find((r) => !used.has(r.id))!;
    used.add(room.id);
    return {
      id,
      title: names[i]!,
      roomId: room.id,
      itemId: task.id,
      item: task.label,
      hint: `${task.label}: ${task.hint}. Reparatur bei ${MARKS[room.signature]} (${room.name}).`,
      code: Array.from({ length: 3 }, () => rng.int(4) + 1).join(''),
      puzzle: (['wires', 'sequence', 'tune'] as const)[i]!,
      order: rng.shuffle([0, 1, 2, 3]),
    };
  });
  repairCache.set(spec, repairs);
  return repairs;
}

export function lockerCode(seed: number, room: string): string {
  const rng = new Rng(seed ^ ((Number(room.slice(1)) + 1) * 7919));
  return Array.from({ length: 3 }, () => rng.int(4) + 1).join('');
}

export function puzzleFor(crew: CrewState, id: string): PuzzleState {
  return (crew.puzzles[id] ??= { open: false, links: [], digits: [1, 1, 1] });
}

/** Returns true only after all physical connections / code inputs are correct. */
export function puzzleSolved(repair: Repair, puzzle: PuzzleState): boolean {
  if (!puzzle.open) return false;
  if (repair.puzzle === 'wires')
    return [0, 1, 2, 3].every((i) => puzzle.links[i] === repair.order.indexOf(i));
  if (repair.puzzle === 'sequence') return puzzle.links.join('') === repair.code;
  return puzzle.digits.join('') === repair.code;
}

/** Damage is disabled independently of NPC existence in the rehearsal. */
export function takeCrewHit(crew: CrewState, running: boolean): boolean {
  if (
    !running ||
    crew.options.test ||
    crew.hidden ||
    crew.invulnerable > 0 ||
    crew.hp <= 0 ||
    crew.venting > 0
  )
    return false;
  crew.hp = Math.max(0, crew.hp - 1);
  crew.invulnerable = 3;
  return true;
}

export function stepVitals(
  crew: CrewState,
  dt: number,
  speed: number,
  monsterDistance: number,
): void {
  const step = bounded(dt, 0, 0.1, 0);
  crew.invulnerable = Math.max(0, crew.invulnerable - step);
  crew.venting = Math.max(0, crew.venting - step);
  // A short sprint should be felt immediately: visible breath after ~1 second,
  // saturated exertion after 4 seconds; the visor clears over 5 seconds walking.
  crew.exertion = Math.max(0, Math.min(1, crew.exertion + (speed > 3.6 ? 0.25 : -0.2) * step));
  const danger =
    crew.options.test || !Number.isFinite(monsterDistance)
      ? 0
      : Math.max(0, 1 - monsterDistance / 15);
  // This is game telemetry, never a real-world heart-rate reading.
  crew.pulse = Math.round(72 + crew.exertion * 38 + danger * 58 + (3 - crew.hp) * 5);
}

/** Real shared walls only; no shortcut can reach the protected command deck. */
const ventsCache = new WeakMap<
  HouseSpec,
  Array<{ a: string; b: string; x: number; z: number; dir: number }>
>();
export function ventPairs(
  spec: HouseSpec,
): Array<{ a: string; b: string; x: number; z: number; dir: number }> {
  const cached = ventsCache.get(spec);
  if (cached) return cached;
  const pairs: Array<{ a: string; b: string; x: number; z: number; dir: number }> = [];
  const spaces = spacesOf(spec);
  for (let i = 0; i < spaces.length; i++)
    for (let j = i + 1; j < spaces.length; j++) {
      const a = spaces[i]!;
      const b = spaces[j]!;
      for (const [one, two] of [
        [a, b],
        [b, a],
      ] as const) {
        const r = one.rect;
        const s = two.rect;
        if (r.x + r.w === s.x && Math.max(r.z, s.z) < Math.min(r.z + r.d, s.z + s.d))
          pairs.push({ a: one.id, b: two.id, x: s.x, z: Math.max(r.z, s.z) + 0.5, dir: 1 });
        if (r.z + r.d === s.z && Math.max(r.x, s.x) < Math.min(r.x + r.w, s.x + s.w))
          pairs.push({ a: one.id, b: two.id, x: Math.max(r.x, s.x) + 0.5, z: s.z, dir: 2 });
      }
    }
  ventsCache.set(spec, pairs);
  return pairs;
}

export function ventDestination(spec: HouseSpec, from: string, target: string): string | null {
  const neighbours = ventPairs(spec).flatMap((p) =>
    p.a === from ? [p.b] : p.b === from ? [p.a] : [],
  );
  const goal = roomOf(spec, target);
  if (!goal || neighbours.length === 0) return null;
  const g = roomCentre(goal);
  return neighbours.sort((a, b) => {
    const p = roomCentre(roomOf(spec, a)!);
    const q = roomCentre(roomOf(spec, b)!);
    return Math.hypot(p.x - g.x, p.z - g.z) - Math.hypot(q.x - g.x, q.z - g.z);
  })[0]!;
}

function record(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}
function bounded(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}
function strings(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((s): s is string => typeof s === 'string' && s.length <= 40).slice(0, 32)
    : [];
}
function numbers(v: unknown, count: number): number[] {
  return Array.isArray(v) ? v.slice(0, count).map((n) => Math.round(bounded(n, -1, 4, -1))) : [];
}
