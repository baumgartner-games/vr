import { onApron, spacesOf, type HouseSpec } from './house';
import { TILE } from '../nav/navTile';
import { stationLayout, type FloorPoint } from './stationLayout';
import { COMMAND_HOME } from './trainingLayout';
import type { RoutineWorld } from './monsterRoutine';

/**
 * **Die Station als Karte aus Knoten und Kanten** — Räume, Gänge, die
 * Einsatzzentrale, und wer an wen grenzt.
 *
 * Für die Wegsuche im Spiel ist das viel zu grob; für alles, was *darüber*
 * entscheidet, ist es genau richtig. Die Routine des Monsters
 * (`monsterRoutine.ts`) fragt „welche Räume grenzen an diesen hier"; das
 * Training (`roundSim.ts`) spielt hunderte Runden aus und darf dafür keinen
 * Rasterlauf über 50 000 Zellen anwerfen. Beide bekommen dieselbe Karte, und
 * damit hat das Trainingsergebnis auch mit dem zu tun, was im Headset
 * passiert.
 *
 * **Die Zentrale ist ein Knoten wie jeder andere.** Sie steht nicht im
 * Bauplan (`spec.rooms`), aber der Techniker geht dorthin zurück, und ein
 * Ziel, das auf keiner Karte steht, kostet erfahrungsgemäß eine Stunde
 * Suche. Sie heißt `COMMAND` und hängt an der Schleuse.
 */
export const COMMAND = 'command';

/** Was eine geschlossene Schiebetür an Schritten schluckt, in Metern Hörweite. */
const DOOR_LOSS = 9;

export interface StationGraph extends RoutineWorld {
  /** Alle Knoten: Räume, Gänge und die Zentrale. */
  readonly spaces: readonly string[];
  /** Nur die Missionsräume — dort steht Fracht, dort wird repariert. */
  readonly rooms: readonly string[];
  neighbours(id: string): readonly string[];
  centre(id: string): FloorPoint;
  locker(id: string): FloorPoint | null;
  /** Kürzeste Weglänge über Türen, in Metern; `Infinity` ohne Verbindung. */
  distance(a: string, b: string): number;
  /**
   * Dasselbe, aber **gedämpft**: Jede Wand mit einer Tür darin schluckt
   * Schritte. Ohne diesen Aufschlag hört ein Monster einen Rennenden quer
   * durch die halbe Station, und es gibt kein Entkommen mehr, sondern nur
   * noch ein Hinauszögern (vgl. `perception.acousticField`).
   */
  earshot(a: string, b: string): number;
  /** Der nächste Schritt von `a` in Richtung `b` — `a` selbst am Ziel. */
  next(a: string, b: string): string;
  /** In welchem Knoten dieser Punkt liegt; leer außerhalb der Station. */
  spaceAt(point: FloorPoint): string;
}

const cache = new WeakMap<HouseSpec, StationGraph>();

export function stationGraph(spec: HouseSpec): StationGraph {
  const known = cache.get(spec);
  if (known) return known;
  const spaces = spacesOf(spec);
  const ids = [...spaces.map((room) => room.id), COMMAND];
  const centres = new Map<string, FloorPoint>(
    spaces.map((room) => [
      room.id,
      {
        x: (room.rect.x + room.rect.w / 2) * TILE,
        z: (room.rect.z + room.rect.d / 2) * TILE,
      },
    ]),
  );
  centres.set(COMMAND, { x: COMMAND_HOME.x, z: COMMAND_HOME.z });
  const links = new Map<string, string[]>(ids.map((id) => [id, []]));
  const join = (a: string, b: string): void => {
    if (a === b) return;
    if (!links.get(a)?.includes(b)) links.get(a)?.push(b);
    if (!links.get(b)?.includes(a)) links.get(b)?.push(a);
  };
  for (const door of spec.doors) join(door.a, door.b ?? COMMAND);
  const lockers = new Map<string, FloorPoint>();
  for (const placement of stationLayout(spec))
    if (placement.kind === 'locker') lockers.set(placement.roomId, placement.approach);

  // Floyd–Warshall über höchstens vierzig Knoten: einmal je Station, danach
  // ist „wie weit ist es von hier nach da" eine Feldabfrage.
  const index = new Map<string, number>(ids.map((id, i) => [id, i]));
  const size = ids.length;
  const cost = new Float64Array(size * size).fill(Infinity);
  const muffle = new Float64Array(size * size).fill(Infinity);
  const via = new Int32Array(size * size).fill(-1);
  for (let i = 0; i < size; i++) {
    cost[i * size + i] = 0;
    muffle[i * size + i] = 0;
  }
  for (const [id, neighbours] of links)
    for (const other of neighbours) {
      const i = index.get(id)!,
        j = index.get(other)!;
      const a = centres.get(id)!,
        b = centres.get(other)!;
      cost[i * size + j] = Math.hypot(a.x - b.x, a.z - b.z);
      muffle[i * size + j] = cost[i * size + j]! + DOOR_LOSS;
      via[i * size + j] = j;
    }
  for (let k = 0; k < size; k++)
    for (let i = 0; i < size; i++) {
      const ik = cost[i * size + k]!;
      if (!Number.isFinite(ik)) continue;
      for (let j = 0; j < size; j++) {
        const total = ik + cost[k * size + j]!;
        if (total < cost[i * size + j]!) {
          cost[i * size + j] = total;
          via[i * size + j] = via[i * size + k]!;
        }
        const quiet = muffle[i * size + k]! + muffle[k * size + j]!;
        if (quiet < muffle[i * size + j]!) muffle[i * size + j] = quiet;
      }
    }
  const graph: StationGraph = {
    spaces: ids,
    rooms: spec.rooms.map((room) => room.id),
    neighbours: (id) => links.get(id) ?? [],
    centre: (id) => centres.get(id) ?? { x: 0, z: 0 },
    locker: (id) => lockers.get(id) ?? null,
    distance: (a, b) => {
      const i = index.get(a),
        j = index.get(b);
      return i === undefined || j === undefined ? Infinity : cost[i * size + j]!;
    },
    earshot: (a, b) => {
      const i = index.get(a),
        j = index.get(b);
      return i === undefined || j === undefined ? Infinity : muffle[i * size + j]!;
    },
    next: (a, b) => {
      const i = index.get(a),
        j = index.get(b);
      if (i === undefined || j === undefined) return a;
      const step = via[i * size + j]!;
      return step < 0 ? a : ids[step]!;
    },
    spaceAt: (point) => {
      for (const room of spaces) {
        const r = room.rect;
        if (
          point.x >= r.x * TILE &&
          point.x < (r.x + r.w) * TILE &&
          point.z >= r.z * TILE &&
          point.z < (r.z + r.d) * TILE
        )
          return room.id;
      }
      return onApron(Math.floor(point.x / TILE), Math.floor(point.z / TILE)) ? COMMAND : '';
    },
  };
  cache.set(spec, graph);
  return graph;
}
