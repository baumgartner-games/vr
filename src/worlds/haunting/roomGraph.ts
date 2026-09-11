import { DOOR_LOSS, WALL_LOSS } from './audio/hearing';
import { APRON, onApron, spacesOf, type HouseSpec, type Rect } from './house';
import { DIR_E, DIR_N, DIR_S, TILE, type Dir } from '../nav/navTile';
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
 *
 * **Aber nicht auf jeder Karte.** Es gibt diese Karte zweimal: die ganze
 * (`stationGraph`) und die des Monsters (`monsterGraph`), und der zweiten
 * fehlt die Zentrale samt der Schleuse, die dorthin führt. Das ist keine
 * Sparsamkeit, sondern die Regel: **Das Monster kennt die Einsatzzentrale
 * nicht.** Es patrouilliert nicht dorthin, sucht nicht dort, rechnet keinen
 * Weg dorthin und vermutet dort auch niemanden — sein Gedächtnis
 * (`monster/monsterMemory.ts`) legt seine Räume aus `spaces` an, und was
 * nicht darin steht, kann es nicht glauben. Der Techniker läuft weiter hinein
 * und hinaus; für ihn ist und bleibt die Zentrale ein Raum wie jeder andere.
 */
export const COMMAND = 'command';

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
   * Dasselbe, aber **gedämpft** — und ausdrücklich **nicht** auf die Türen
   * beschränkt.
   *
   * Jeder Durchgang schluckt Schritte: ein Türblatt `DOOR_LOSS`, eine Wand
   * ohne Tür `WALL_LOSS` (`audio/hearing.ts`, dieselben Zahlen). Ohne diesen
   * Aufschlag hört ein Monster einen Rennenden quer durch die halbe Station,
   * und es gibt kein Entkommen mehr, sondern nur noch ein Hinauszögern.
   *
   * **Wandnachbarn zählen mit, Wegnachbarn sind sie deshalb nicht.** Lange
   * rechnete diese Zahl nur über `neighbours()`, und das sind Türnachbarn:
   * Zwei Räume Wand an Wand ohne Tür dazwischen lagen für das Monster
   * (`monsterMemory.heard`) so weit auseinander wie der Umweg über den halben
   * Gang — im gewürfelten Haus mit Samen 3 sind das 100 m für zehn Meter
   * Luftlinie, also taub. Schall geht durch die Wand, gedämpft; **niemand**
   * geht dort hindurch, und `neighbours()` weiß von diesen Kanten deshalb
   * nichts.
   */
  earshot(a: string, b: string): number;
  /** Der nächste Schritt von `a` in Richtung `b` — `a` selbst am Ziel. */
  next(a: string, b: string): string;
  /**
   * **Die Türen dieses Knotens**, in der Reihenfolge des Bauplans.
   *
   * `neighbours` sagt, *wohin* es weitergeht; das reicht für die Wegsuche und
   * nicht für die Frage, an welcher Stelle jemand hinausgeht. Wer abfangen
   * oder lauern will, braucht die Tür selbst und nicht den Raum dahinter
   * (`monster/monsterIntercept.ts`). Die Haustür zählt zur Zentrale, wie
   * überall in dieser Karte.
   */
  doorsOf(id: string): readonly string[];
  /**
   * **Die Mitte einer Tür in Metern** — `null`, wenn es die Tür nicht gibt.
   *
   * Auf der Kante und nicht auf der Kachel: Der Bauplan sagt „an dieser
   * Kachel, in dieser Richtung", die Tür sitzt aber auf der Kante dazwischen.
   * Eine halbe Kachel ist gut ein Meter — und um so viel danebengerechnet
   * wartet ein Abfangender in der Wand neben der Tür.
   */
  doorPoint(id: string): FloorPoint | null;
  /** In welchem Knoten dieser Punkt liegt; leer außerhalb der Station. */
  spaceAt(point: FloorPoint): string;
}

const cache = new WeakMap<HouseSpec, StationGraph>();
const monsterCache = new WeakMap<HouseSpec, StationGraph>();

export function stationGraph(spec: HouseSpec): StationGraph {
  const known = cache.get(spec);
  if (known) return known;
  const built = buildGraph(spec, true);
  cache.set(spec, built);
  return built;
}

/**
 * **Dieselbe Station, wie das Monster sie kennt** — ohne die Zentrale und
 * ohne die Schleuse, die dorthin führt.
 *
 * Jede Stelle, die für das Monster entscheidet, fragt diese Karte: Routine
 * (`monsterRoutine.ts`), Gedächtnis, Abfangrechnung, Reisezeiten und die
 * Wegsuche seiner Navigatoren. Damit ist „das Monster geht nie in die
 * Zentrale" keine Prüfung, die man an fünf Stellen vergessen kann, sondern
 * eine Karte, auf der der Ort schlicht nicht vorkommt — und `spaceAt` gibt
 * für den Vorplatz `''` zurück, weil das Monster nicht einmal benennen kann,
 * wo der andere da gerade steht.
 */
export function monsterGraph(spec: HouseSpec): StationGraph {
  const known = monsterCache.get(spec);
  if (known) return known;
  const built = buildGraph(spec, false);
  monsterCache.set(spec, built);
  return built;
}

function buildGraph(spec: HouseSpec, knowsCommand: boolean): StationGraph {
  const spaces = spacesOf(spec);
  const ids = knowsCommand ? [...spaces.map((room) => room.id), COMMAND] : spaces.map((r) => r.id);
  const centres = new Map<string, FloorPoint>(
    spaces.map((room) => [
      room.id,
      {
        x: (room.rect.x + room.rect.w / 2) * TILE,
        z: (room.rect.z + room.rect.d / 2) * TILE,
      },
    ]),
  );
  if (knowsCommand) centres.set(COMMAND, { x: COMMAND_HOME.x, z: COMMAND_HOME.z });
  const links = new Map<string, string[]>(ids.map((id) => [id, []]));
  const join = (a: string, b: string): void => {
    if (a === b) return;
    if (!links.get(a)?.includes(b)) links.get(a)?.push(b);
    if (!links.get(b)?.includes(a)) links.get(b)?.push(a);
  };
  const doorsBySpace = new Map<string, string[]>(ids.map((id) => [id, []]));
  const doorPoints = new Map<string, FloorPoint>();
  for (const door of spec.doors) {
    // Die Schleuse führt nach draußen, und draußen ist für das Monster nichts:
    // keine Kante, kein Wartepunkt, kein Ausgang, den es bewachen könnte.
    if (door.b === null && !knowsCommand) continue;
    const behind = door.b ?? COMMAND;
    join(door.a, behind);
    doorsBySpace.get(door.a)?.push(door.id);
    doorsBySpace.get(behind)?.push(door.id);
    doorPoints.set(door.id, doorCentre(door));
  }
  // **Wandnachbarn**: Räume, deren Rechtecke aneinanderstoßen. Für den Schall
  // ist das eine Kante, für die Wegsuche nicht — sie steht deshalb nur in der
  // gedämpften Matrix und nicht in `links`. Die Zentrale bringt ihr eigenes
  // Rechteck mit (den Vorplatz), sonst wäre die Fensterfront zur Kantine für
  // das Gehör eine Wand ohne Ende.
  const rects = new Map<string, Rect>(spaces.map((room) => [room.id, room.rect]));
  if (knowsCommand) rects.set(COMMAND, APRON);
  const walls: Array<[string, string]> = [];
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const a = rects.get(ids[i]!),
        b = rects.get(ids[j]!);
      if (a && b && touching(a, b)) walls.push([ids[i]!, ids[j]!]);
    }

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
  for (const [id, other] of walls) {
    const i = index.get(id)!,
      j = index.get(other)!;
    const a = centres.get(id)!,
      b = centres.get(other)!;
    // Die Tür in derselben Wand gewinnt: Sie schluckt weniger als das
    // Mauerwerk daneben, und die Strecke ist dieselbe.
    const through = Math.hypot(a.x - b.x, a.z - b.z) + WALL_LOSS;
    if (through < muffle[i * size + j]!) {
      muffle[i * size + j] = through;
      muffle[j * size + i] = through;
    }
  }
  for (let k = 0; k < size; k++)
    for (let i = 0; i < size; i++) {
      const ik = cost[i * size + k]!;
      const quietIk = muffle[i * size + k]!;
      if (!Number.isFinite(ik) && !Number.isFinite(quietIk)) continue;
      for (let j = 0; j < size; j++) {
        if (Number.isFinite(ik)) {
          const total = ik + cost[k * size + j]!;
          if (total < cost[i * size + j]!) {
            cost[i * size + j] = total;
            via[i * size + j] = via[i * size + k]!;
          }
        }
        const quiet = quietIk + muffle[k * size + j]!;
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
    doorsOf: (id) => doorsBySpace.get(id) ?? [],
    doorPoint: (id) => doorPoints.get(id) ?? null,
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
      return knowsCommand && onApron(Math.floor(point.x / TILE), Math.floor(point.z / TILE))
        ? COMMAND
        : '';
    },
  };
  return graph;
}

/**
 * Ob zwei Rechtecke eine Wand teilen — sie müssen sich auf einer Seite
 * berühren und dabei ein Stück von mehr als null Kacheln gemeinsam haben. Eine
 * Ecke, die eine andere Ecke berührt, ist keine Wand.
 */
function touching(a: Rect, b: Rect): boolean {
  const alongX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const alongZ = Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z);
  if (a.x + a.w === b.x || b.x + b.w === a.x) return alongZ > 0;
  if (a.z + a.d === b.z || b.z + b.d === a.z) return alongX > 0;
  return false;
}

/**
 * Die Mitte einer Türkante, in Metern.
 *
 * Dieselbe Rechnung wie in `haunt.ts` und `HauntingWorld.edgeCentre`, nur
 * gleich in Metern: Nach Norden und Süden liegt die Kante quer zur Kachel,
 * nach Osten und Westen längs.
 */
function doorCentre(door: { x: number; z: number; dir: Dir }): FloorPoint {
  const alongX = door.dir === DIR_N || door.dir === DIR_S;
  return {
    x: (door.x + (alongX ? 0.5 : door.dir === DIR_E ? 1 : 0)) * TILE,
    z: (door.z + (alongX ? (door.dir === DIR_S ? 1 : 0) : 0.5)) * TILE,
  };
}
