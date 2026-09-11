import { MARKS, type HouseSpec } from './house';
import { Rng } from './rng';
import { freshThreat, readThreat, type ThreatState } from './threat';

/**
 * Die Versionsnummer, die jede `state`-Nachricht trägt. 6, seit die
 * zerstörten Kabinen im `HauntState` stehen (`destroyed`): Ein Client der
 * Version 5 wüsste nichts von ihnen und ließe Spieler in ein Wrack steigen.
 * 7, seit die Monster-Station übers Netz spielt (`net.ts`: Nachricht
 * `monster`, Felder `technician` und `ride` im Stand): Ein Gastgeber der
 * Version 6 würde die Eingaben des Monsterspielers stumm verwerfen, und ein
 * Telefon der Version 6 sähe den 2D-Techniker nie. 8, seit beide Seiten die
 * zuletzt gesehene Stelle des anderen mitführen (`ghosts`,
 * `rules/ghosts.ts`): Ein Gastgeber der Version 7 verlöre sie bei jedem
 * Stand, und ein Gerät der Version 7 zeichnete einen Marker, den es nie
 * bekommt. Alte Clients werden abgewiesen; nach dem Update alle Geräte neu
 * laden.
 */
export const STATION_PROTOCOL = 8;

/**
 * **Wie schnell die beiden Seiten sind** — und warum genau in dieser
 * Reihenfolge.
 *
 * Ein Monster, das langsamer geht als der Spieler, ist kein Monster, sondern
 * ein Wegweiser: Man dreht sich um, geht weiter und arbeitet in Ruhe. Also
 * **geht es schneller, als der Spieler geht** — wer nur spaziert, wird
 * eingeholt. Und **es rennt langsamer, als der Spieler rennt** — wer die
 * Verfolgung bemerkt und Puste hat, kommt davon. Zwischen diesen beiden
 * Zahlen liegt die ganze Spannung dieser Welt, und deshalb stehen sie hier
 * nebeneinander und nicht in drei Dateien verteilt.
 *
 * Die Spielerzahlen kommen aus `core/PlayerRig.ts` (`moveSpeed`,
 * `sprintFactor`). Wer den Sprintfaktor im Menü heruntersetzt, verzichtet
 * freiwillig auf diesen Vorsprung.
 */
export const PLAYER_WALK_SPEED = 2.6;
export const PLAYER_SPRINT_SPEED = 4.94;
/**
 * **Das Jagdtempo, das die Gewichte allein erreichen** — der Deckel *unter*
 * dem Deckel.
 *
 * Ohne ihn frisst der obere Deckel den Blutrausch auf: Ein Trainingslauf
 * schiebt `speed` und `hunt` so weit hoch, bis `Grundtempo × speed × hunt`
 * über `MONSTER_TOP_SPEED` liegt — und ab da ist jeder Aufschlag wirkungslos,
 * weil schon das gewöhnliche Jagen am Anschlag steht. Genau das ist beim
 * ersten Training nach dem Umbau passiert (1,15 × 1,55 ≈ 5,3 m/s, gekappt auf
 * 4,55), und der schöne neue Schub wäre eine Zahl ohne Wirkung gewesen.
 * Also: Die Gewichte kommen bis hierher, der Aufschlag trägt bis
 * `MONSTER_TOP_SPEED`.
 */
export const MONSTER_HUNT_SPEED = 4.4;
/** Kein Monster wird je so schnell wie ein rennender Spieler. */
export const MONSTER_TOP_SPEED = 4.55;

/**
 * **Die Puste** — der Grund, warum die Ungleichung oben überhaupt noch eine
 * Spannung hat.
 *
 * Lange galt hier nur die halbe Wahrheit: Das Monster war langsamer als ein
 * rennender Spieler, und rennen konnte man unbegrenzt. Damit war jede Jagd in
 * dem Augenblick entschieden, in dem der Spieler den Stick nach vorn drückte —
 * er lief einfach so lange geradeaus, bis das Vieh aufgab. Es gab keinen
 * Grund, eine Tür zuzuziehen, um eine Ecke zu brechen oder in einen Schacht zu
 * steigen, und deshalb tat es auch niemand.
 *
 * Jetzt hat der Sprint einen Boden: `PLAYER_STAMINA` Sekunden, danach fällt
 * das Tempo auf den **Trab** (`TROT`), und der liegt unter dem, was ein
 * jagendes Monster kann. Eine gerade Flucht endet damit; eine Flucht mit einem
 * Riegel, einer Sichtlinienbrechung oder einem Schacht darin nicht. Genau das
 * ist der Takt, den dieses Spiel haben soll.
 *
 * Nachgerechnet: Abstand 8 m, der Spieler sprintet 5 s und gewinnt dabei rund
 * 2,7 m; danach trabt er mit 3,56 m/s, das Monster jagt mit rund 4,40 m/s und
 * holt 0,85 m/s auf — Kontakt nach etwa 18 s gerader Flucht. Ein Riegel
 * dazwischen kostet das Monster rund 4 s, ein Sichtabriss macht aus der Jagd
 * wieder eine Suche.
 */
export const PLAYER_STAMINA = 5;
/** Was vom Sprint übrig bleibt, wenn die Puste weg ist — derselbe Anteil wie beim Bot. */
export const TROT = 0.72;
/** Wie lange es dauert, die Puste beim Gehen wieder vollständig aufzufüllen, in Sekunden. */
export const STAMINA_REGEN = 8;
/**
 * Der kurze Schub nach einem Treffer, in Sekunden (Dead by Daylight nennt es
 * „Sprint Burst"). Ein Treffer ohne Vorsprung wäre gleich der nächste: Man
 * steht benommen da, wo man getroffen wurde, und das Monster steht daneben.
 * In dieser Zeit sprintet der Spieler, ohne Puste zu verbrauchen.
 */
export const HIT_BURST = 1.5;
/** Das Tempo, das nach der Puste übrig bleibt, in m/s. */
export const PLAYER_TROT_SPEED = PLAYER_SPRINT_SPEED * TROT;

/**
 * Der Zustand der Puste: verbleibende Sprintsekunden und der laufende Schub
 * nach einem Treffer. Eine Zahl zu wenig, und man kann nicht unterscheiden,
 * ob jemand am Ende ist oder gerade geschont wird.
 */
export interface Stamina {
  /** Sekunden Sprint, die noch da sind. */
  left: number;
  /** Sekunden Schub, in denen der Sprint nichts kostet. */
  burst: number;
}

export function freshStamina(): Stamina {
  return { left: PLAYER_STAMINA, burst: 0 };
}

/** Nach einem Treffer: der Schub, unabhängig davon, wie leer die Puste war. */
export function grantBurst(stamina: Stamina): void {
  stamina.burst = HIT_BURST;
}

/**
 * **Ein Zeitschritt der Puste** — und heraus kommt der Anteil des
 * Sprinttempos, der gerade wirklich zur Verfügung steht: 1 solange Puste oder
 * Schub da sind, sonst `TROT`.
 *
 * Wer nicht sprintet, füllt auf — in `STAMINA_REGEN` Sekunden von leer auf
 * voll. Bewusst langsamer als das Leerlaufen: Sonst wäre der Sprint nur ein
 * Knopf, den man im Takt drückt, und die Jagd endete nie.
 */
export function stepStamina(stamina: Stamina, dt: number, sprinting: boolean): number {
  const step = Math.max(0, Math.min(0.25, dt));
  // **Gefragt wird vor dem Abziehen und nicht danach.** Andersherum gälte die
  // Sekunde, die die Puste gerade aufbraucht, schon als Trab, und aus fünf
  // Sekunden Sprint würden je nach Bildrate 4,75 oder 4,98 — eine Zahl, die
  // von der Grafikkarte abhinge.
  const burst = stamina.burst > 0;
  stamina.burst = Math.max(0, stamina.burst - step);
  if (burst) return 1;
  if (!sprinting) {
    stamina.left = Math.min(PLAYER_STAMINA, stamina.left + (step * PLAYER_STAMINA) / STAMINA_REGEN);
    return 1;
  }
  const left = stamina.left > 0;
  stamina.left = Math.max(0, stamina.left - step);
  return left ? 1 : TROT;
}
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
    speed: 2.95,
    vent: 28,
  },
  {
    id: 'crawler',
    name: 'Schachtläufer',
    detail: 'Niedrig und schnell. Rasches Kratzen verrät seine häufigen Wartungsschachtwechsel.',
    speed: 3.2,
    vent: 16,
  },
  {
    id: 'sentinel',
    name: 'Wächter',
    detail:
      'Defekter Sicherheitsroboter. Erkennt Licht aus großer Entfernung und ist an schweren Metalltritten zu hören.',
    speed: 2.8,
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
  c.invulnerable = bounded(v.invulnerable, 0, 12, 0);
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
    if (!c.simulation) {
      c.hidden = '';
      c.threat = freshThreat();
    }
  }
  return c;
}

const repairCache = new WeakMap<HouseSpec, Repair[]>();
export function repairsFor(spec: HouseSpec): Repair[] {
  const cached = repairCache.get(spec);
  if (cached) return cached;
  const rng = new Rng(spec.seed ^ 0x53484950);
  const kinds = ['werkstatt', 'bad', 'musikzimmer'];
  const names = ['Antrieb wiederherstellen', 'Nahrungsversorgung sichern', 'Notsignal senden'];
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

/**
 * **In welchem Raum eine erledigte Reparatur erledigt wurde.**
 *
 * `HauntState.done` ist über die Jahre uneinheitlich befüllt worden: Das
 * Schiff schreibt die Kennung der Reparatur hinein (`engine`), die 2D-Runde
 * die des Ersatzteils (`itemId`), der Modelltechniker wieder die erste. Wer
 * daraus einen Raum machen will — und das will seit M2 das Monster —, darf
 * sich auf keine der beiden Schreibweisen verlassen; also nimmt diese Zeile
 * beide. `''`, wenn der Eintrag zu keiner Reparatur gehört.
 */
export function repairRoom(spec: HouseSpec, entry: string): string {
  const repair = repairsFor(spec).find((r) => r.id === entry || r.itemId === entry);
  return repair?.roomId ?? '';
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
  crew.invulnerable = HIT_GRACE;
  return true;
}

/**
 * **Wie lange der Anzug nach einem Treffer unverwundbar ist**, in Sekunden.
 *
 * Es waren drei — und drei Sekunden im Griff eines Monsters, das schneller
 * ist als man selbst, sind keine Pause, sondern der nächste Treffer mit
 * Anlauf. Sechs reichen, um sich zu drehen, die Tür zu finden und zwei
 * Zimmer weit zu kommen; das Monster hält derweil inne (`monsterRoutine.
 * rest`, `HIT_LULL`), denn eine Unverwundbarkeit, die es nicht merkt, ist
 * ein Vieh, das einem an den Fersen klebt, bis die Uhr abgelaufen ist.
 */
export const HIT_GRACE = 6;
/** Und so lange steht das Monster nach dem Treffer still — kürzer als die Schonfrist, damit der Techniker geht. */
export const HIT_LULL = 4;

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
    (crew.options.test && !crew.simulation) || !Number.isFinite(monsterDistance)
      ? 0
      : Math.max(0, 1 - monsterDistance / 15);
  // This is game telemetry, never a real-world heart-rate reading.
  crew.pulse = Math.round(72 + crew.exertion * 38 + danger * 58 + (3 - crew.hp) * 5);
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
