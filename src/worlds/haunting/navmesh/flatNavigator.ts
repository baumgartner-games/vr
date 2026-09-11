import type { NavGraph } from '../../nav/navGraph';
import { TILE, dirX, dirZ } from '../../nav/navTile';
import type { DroneRoute } from '../droneRoute';
import type { HouseDoor, HouseSpec } from '../house';
import { COMMAND, type StationGraph } from '../roomGraph';
import type { FloorPoint } from '../stationLayout';
import { stationRoute, type RouteAvoid } from '../stationNavigation';
import { StationTravelPlan } from '../stationTravelPlan';
import { pointSegmentDistance } from './snapshotClearance';

/**
 * **Die Rasterwegsuche der 3D-Welt für die 2D-Runde** — ein Cursor auf einer
 * Route aus `stationRoute`, mehr nicht.
 *
 * Beide Welten stehen auf demselben Kachelgitter, also gibt es nur **eine**
 * Wegsuche: der A* mit 0,25-m-Schritt samt Schnurzug (`stationNavigation.ts`,
 * `navmesh/pathSmoothing.ts`) auf dem `NavGraph` aus `housePlan`. Was hier
 * dazukommt, ist das, was `StationNpcNavigator` für das Monster im Headset
 * tut — Route halten, Wegpunkte abhaken, bei Bedarf neu rechnen —, aber mit
 * der Sparsamkeit, die eine Runde braucht, die in Tests tausendfach ohne Bild
 * ausgespielt wird: Ein Weg kostet in Jest um die 90 ms, und der Navigator
 * des Headsets plant alle 0,55 s neu, was für eine 600-Sekunden-Runde nicht
 * zu bezahlen wäre. Hier wird neu geplant, wenn es **keine** Route gibt, wenn
 * sich eine **Sperre** geändert hat (`graph.version`), wenn das Ziel um mehr
 * als `GOAL_TOLERANCE` gewandert ist — und dann frühestens nach `HOLD` — oder
 * wenn der Läufer die Route verlassen hat (`OFF_ROUTE`).
 *
 * **Gesperrte Türen bleiben Spielregel.** Die Wegsuche kennt sie als
 * blockiert und würde sie umgehen; das ist gewollt, solange es einen Umweg
 * gibt. Gibt es keinen (`route.complete === false` und das Ende liegt nicht
 * im Zielraum), führt die Route stattdessen **bis vor die erste gesperrte
 * Tür** auf dem Raumweg (`StationGraph.next`), und `FlatLeg.door` nennt sie —
 * dort wartet das Monster und splittert Holz, wie es das vor der Wegsuche
 * auch tat (`map/flatRound.ts`). Der Radius ist der des Läufers, so wie ihn
 * auch `geometry.slide` benutzt.
 *
 * **Und einen Umweg, der zu lang ist, geht es nicht.** Das war der Fehler,
 * mit dem man das Monster einsperren konnte: Der Spieler schloss immer die
 * Tür vor ihm, die Wegsuche fand brav einen Umweg über den halben Grundriss,
 * und weil das jedes Mal wieder gelang, lief das Vieh eine Runde lang im
 * Kreis, ohne je anzukommen. Wer `detourLimit` mitgibt (in Metern, also
 * Laufzeit mal Tempo), bekommt jetzt die andere Antwort: Kostet der Umweg um
 * die gesperrte Tür mehr als das, führt die Route **vor die Tür** und
 * `FlatLeg.door` nennt sie — das Monster zieht am Riegel, statt zu laufen.
 * Verglichen wird auf der Raumkarte und nicht mit einem zweiten Rasterlauf:
 * ein Dijkstra über vierzig Knoten kostet nichts, ein A* über 50 000 Zellen
 * neunzig Millisekunden.
 */

/** So weit darf die gemiedene Stelle wandern, bevor eine neue Route fällig ist, in Metern. */
export const AVOID_TOLERANCE = 1.5;

/** Ab so vielen Metern Wanderung des Ziels lohnt sich eine neue Route. */
export const GOAL_TOLERANCE = 0.75;
/** So lange wird eine Route mindestens gelaufen, bevor ein gewandertes Ziel eine neue bekommt, in Sekunden. */
export const HOLD = 0.5;
/** Ab diesem Abstand zur laufenden Strecke gilt der Läufer als abgekommen, in Metern. */
export const OFF_ROUTE = 0.75;
/** Wie nah man einem Wegpunkt kommen muss, damit er als erreicht gilt, in Metern. */
export const REACHED = 0.08;
/**
 * Bis zu diesem Abstand gilt ein Wegpunkt auch als erledigt, wenn man schon
 * **hinter** ihm steht: Wer mit großen Zeitschritten läuft (der Techniker der
 * Bot-Runde mit 0,1 s), schießt über die dicht gesetzten Bogenstützen hinaus
 * und liefe sonst zu jeder zurück.
 */
export const PASSED = 0.5;
/** Wie weit vor einer gesperrten Tür der Wartepunkt liegt, in Metern (wie `geometry.doorPath`). */
const WAIT_DEPTH = 0.9;

export interface FlatLeg {
  /** Ob die Route bis ans Ziel führt. */
  complete: boolean;
  /** Wo sie endet — `null` ohne Route. */
  end: FloorPoint | null;
  /** Die gesperrte Tür, vor die die Route führt, weil es keinen Umweg gibt. */
  door: HouseDoor | null;
  /** Ob in diesem Aufruf neu gerechnet wurde. */
  planned: boolean;
}

export class FlatNavigator {
  private readonly travel = new StationTravelPlan();
  private route: DroneRoute | null = null;
  private cursor = 0;
  /** Wo die Route anfing — die Strecke zum ersten Wegpunkt beginnt dort. */
  private origin: FloorPoint = { x: 0, z: 0 };
  /** Das Ziel, das der Aufrufer zuletzt wollte — nicht der Wartepunkt vor einer Tür. */
  private wanted: FloorPoint = { x: Infinity, z: Infinity };
  /** Wohin die Route gerechnet wurde: das Ziel oder der Wartepunkt vor der Tür. */
  private goal: FloorPoint | null = null;
  /** Die zuletzt gemiedene Stelle — wandert sie, wird neu gerechnet. */
  private avoid: RouteAvoid | null = null;
  private version = -1;
  private plannedAt = -Infinity;
  private complete = false;
  private door: HouseDoor | null = null;
  /** Wie oft gerechnet wurde — für Tests und die Messung. */
  plans = 0;

  constructor(
    private readonly spec: HouseSpec,
    private readonly rooms: StationGraph,
    private readonly radius: number,
  ) {}

  /** Die Wegpunkte, die noch vor dem Läufer liegen. */
  get remaining(): readonly FloorPoint[] {
    return this.route?.points?.slice(this.cursor) ?? [];
  }

  /** Der Punkt, zu dem die Route gerechnet wurde — für Tests und die Routen-Ebene der Karte. */
  get target(): FloorPoint | null {
    return this.goal;
  }

  /** Beim nächsten `aim` wird auf jeden Fall neu gerechnet. */
  invalidate(): void {
    this.route = null;
  }

  /**
   * Sorgt dafür, dass eine Route von `at` zu `goal` da ist — die alte, wenn
   * sie noch taugt, sonst eine neue — und sagt, wohin sie führt.
   */
  aim(
    at: FloorPoint,
    goal: FloorPoint,
    shut: readonly string[],
    time: number,
    avoid: RouteAvoid | null = null,
    detourLimit = Infinity,
  ): FlatLeg {
    const graph = this.travel.graph(this.spec, shut, false);
    const wandered = Math.hypot(goal.x - this.wanted.x, goal.z - this.wanted.z);
    const stale =
      !this.route ||
      graph.version !== this.version ||
      (wandered > GOAL_TOLERANCE && time - this.plannedAt >= HOLD) ||
      this.dreadMoved(avoid, time) ||
      this.strayed(at);
    if (!stale) return this.leg(false);

    this.avoid = avoid ? { at: { ...avoid.at }, radius: avoid.radius, weight: avoid.weight } : null;
    this.wanted = { x: goal.x, z: goal.z };
    this.version = graph.version;
    this.plannedAt = time;
    this.door = null;
    const goalSpace = this.rooms.spaceAt(goal) || this.rooms.spaceAt(at);
    // **Erst fragen, ob sich der Umweg überhaupt lohnt** — auf der Raumkarte,
    // bevor ein einziger Rasterweg gerechnet ist. Lohnt er nicht, wird gleich
    // der Wartepunkt vor der Tür angesteuert und nur ein Weg gerechnet.
    const worth = Number.isFinite(detourLimit)
      ? this.tooFarAround(at, goalSpace, shut, detourLimit)
      : null;
    if (worth) {
      this.door = worth;
      this.plan(graph, at, waitPoint(worth, at));
      return this.leg(true);
    }
    this.plan(graph, at, goal);
    // Kein Umweg: bis vor die erste gesperrte Tür auf dem Raumweg, und dort warten.
    if (!this.complete) {
      const end = this.end();
      const endSpace = end ? this.rooms.spaceAt(end) : '';
      const door = endSpace === goalSpace ? null : this.blockingDoor(at, goalSpace, shut);
      if (door) {
        this.door = door;
        this.plan(graph, at, waitPoint(door, at));
      }
    }
    return this.leg(true);
  }

  /** Der Wegpunkt, auf den es gerade zugeht — `null` am Ende der Route. */
  next(at: FloorPoint): FloorPoint | null {
    const points = this.route?.points;
    if (!points) return null;
    while (this.cursor < points.length) {
      const point = points[this.cursor]!;
      const gap = Math.hypot(point.x - at.x, point.z - at.z);
      if (gap > REACHED) {
        const from = this.cursor > 0 ? points[this.cursor - 1]! : this.origin;
        const beyond =
          (point.x - from.x) * (at.x - point.x) + (point.z - from.z) * (at.z - point.z);
        if (gap > PASSED || beyond <= 0) return point;
      }
      this.cursor++;
    }
    return null;
  }

  /**
   * Ob die gemiedene Stelle so weit gewandert ist, dass die alte Route nichts
   * mehr taugt — oder ob es gerade erst eine gibt (oder keine mehr). Dieselbe
   * Sparsamkeit wie beim Ziel: frühestens nach `HOLD`.
   */
  private dreadMoved(avoid: RouteAvoid | null, time: number): boolean {
    const had = this.avoid;
    if (!had && !avoid) return false;
    if (!had || !avoid) return true;
    if (time - this.plannedAt < HOLD) return false;
    return (
      Math.hypot(avoid.at.x - had.at.x, avoid.at.z - had.at.z) > AVOID_TOLERANCE ||
      Math.abs(avoid.weight - had.weight) > 0.5
    );
  }

  private plan(graph: NavGraph, at: FloorPoint, goal: FloorPoint): void {
    this.route = stationRoute(
      this.spec,
      graph,
      { x: at.x, z: at.z, yaw: 0 },
      goal,
      this.radius,
      0,
      true,
      this.avoid,
    );
    this.cursor = 0;
    this.origin = { x: at.x, z: at.z };
    this.goal = { x: goal.x, z: goal.z };
    this.complete = this.route.complete;
    this.plans++;
  }

  private leg(planned: boolean): FlatLeg {
    return { complete: this.complete, end: this.end(), door: this.door, planned };
  }

  private end(): FloorPoint | null {
    const points = this.route?.points;
    if (!points) return null;
    return points.length ? points[points.length - 1]! : this.origin;
  }

  /** Ob der Läufer weiter als `OFF_ROUTE` neben der Strecke steht, die er gerade geht. */
  private strayed(at: FloorPoint): boolean {
    const points = this.route?.points;
    if (!points || this.cursor >= points.length) return false;
    const from = this.cursor > 0 ? points[this.cursor - 1]! : this.origin;
    return pointSegmentDistance(at, from, points[this.cursor]!) > OFF_ROUTE;
  }

  /** Die erste gesperrte Tür auf dem Raumweg von `at` nach `goalSpace`. */
  private blockingDoor(
    at: FloorPoint,
    goalSpace: string,
    shut: readonly string[],
  ): HouseDoor | null {
    return (
      lockedDoorsBetween(this.spec, this.rooms, this.rooms.spaceAt(at), goalSpace, shut)[0] ?? null
    );
  }

  /**
   * **Die gesperrte Tür, an der Ziehen billiger ist als Herumlaufen** —
   * `null`, wenn keine im Weg steht oder der Umweg sein Geld wert ist.
   *
   * Gerechnet wird auf der Raumkarte: der Weg *durch* die Tür
   * (`StationGraph.distance`, die kennt keine Riegel) gegen den Weg *um sie
   * herum* (`aroundLocks`, derselbe Graph ohne die gesperrten Kanten). Was
   * der Umweg mehr kostet, ist der Preis; ist er höher als `limit` Meter,
   * lohnt der Riegel. Ein Umweg, den es gar nicht gibt, kostet unendlich viel
   * — auch dann führt die Route vor die Tür, so wie bisher.
   */
  private tooFarAround(
    at: FloorPoint,
    goalSpace: string,
    shut: readonly string[],
    limit: number,
  ): HouseDoor | null {
    const from = this.rooms.spaceAt(at);
    if (!from || !goalSpace || from === goalSpace) return null;
    const door = lockedDoorsBetween(this.spec, this.rooms, from, goalSpace, shut)[0];
    if (!door) return null;
    const around = aroundLocks(this.spec, this.rooms, from, goalSpace, shut);
    return around - this.rooms.distance(from, goalSpace) > limit ? door : null;
  }
}

/**
 * **Wie weit es von `from` nach `to` ist, wenn die gesperrten Türen keine
 * Türen mehr sind** — in Metern, `Infinity` ohne Umweg.
 *
 * Ein Dijkstra über die paar Dutzend Knoten der Raumkarte. Die fertige Matrix
 * des Graphen (`distance`) taugt dafür nicht: Die kennt die Riegel nicht, und
 * genau darum geht es hier.
 */
function aroundLocks(
  spec: HouseSpec,
  rooms: StationGraph,
  from: string,
  to: string,
  shut: readonly string[],
): number {
  const closed = new Set(shut);
  // **Eine Kante ist erst dicht, wenn *jede* Tür darin gesperrt ist.** Zwei
  // Räume können zwei Durchgänge teilen; wer die Kante schon beim ersten
  // Riegel für zu hält, rechnet einen Umweg von unendlich aus und schickt das
  // Monster an eine Tür, neben der eine offene steht.
  const doors = new Map<string, { total: number; shut: number }>();
  for (const door of spec.doors) {
    const key = pairKey(door.a, door.b);
    const count = doors.get(key) ?? { total: 0, shut: 0 };
    count.total++;
    if (closed.has(door.id)) count.shut++;
    doors.set(key, count);
  }
  const blocked = new Set(
    [...doors].filter(([, count]) => count.shut === count.total).map(([key]) => key),
  );
  const cost = new Map<string, number>([[from, 0]]);
  const open = new Set<string>([from]);
  while (open.size) {
    let here = '';
    let best = Infinity;
    for (const id of open) {
      const seen = cost.get(id) ?? Infinity;
      if (seen < best) {
        best = seen;
        here = id;
      }
    }
    if (!here) break;
    open.delete(here);
    if (here === to) return best;
    const a = rooms.centre(here);
    for (const next of rooms.neighbours(here)) {
      if (blocked.has(pairKey(here, next))) continue;
      const b = rooms.centre(next);
      const step = best + Math.hypot(a.x - b.x, a.z - b.z);
      if (step >= (cost.get(next) ?? Infinity)) continue;
      cost.set(next, step);
      open.add(next);
    }
  }
  return cost.get(to) ?? Infinity;
}

function pairKey(a: string, b: string | null): string {
  const far = b ?? COMMAND;
  return a < far ? `${a}|${far}` : `${far}|${a}`;
}

/**
 * **Die gesperrten Türen auf dem Raumweg** von `from` nach `to`, in der
 * Reihenfolge, in der man sie trifft; leer, wenn keine im Weg steht.
 *
 * Der Navigator nimmt die erste davon als Wartepunkt. Der Techniker der
 * Bot-Runde rechnet damit den **Preis** eines Fluchtwegs: Eine gesperrte Tür
 * ist für ihn keine Wand, sondern ein Riegel, an dem er ziehen muss, während
 * das Monster näher kommt (`rules/technicianBot.ts`).
 */
export function lockedDoorsBetween(
  spec: HouseSpec,
  rooms: StationGraph,
  from: string,
  to: string,
  shut: readonly string[],
): HouseDoor[] {
  const out: HouseDoor[] = [];
  if (!from || !to) return out;
  let here = from;
  for (let hops = 0; here !== to && hops < rooms.spaces.length; hops++) {
    const next = rooms.next(here, to);
    if (next === here) break;
    const door = spec.doors.find((d) => connects(d, here, next));
    if (!door) break;
    if (shut.includes(door.id)) out.push(door);
    here = next;
  }
  return out;
}

function connects(door: HouseDoor, a: string, b: string): boolean {
  const far = door.b ?? COMMAND;
  return (door.a === a && far === b) || (far === a && door.a === b);
}

/** Die Mitte der Öffnung — auf der Wand, wie `geometry.doorCentre`. */
function doorMiddle(door: HouseDoor): FloorPoint {
  return {
    x: (door.x + 0.5 + dirX(door.dir) * 0.5) * TILE,
    z: (door.z + 0.5 + dirZ(door.dir) * 0.5) * TILE,
  };
}

/** Der Punkt `WAIT_DEPTH` vor der Tür, auf der Seite, auf der `from` steht. */
function waitPoint(door: HouseDoor, from: FloorPoint): FloorPoint {
  const centre = doorMiddle(door);
  const nx = dirX(door.dir),
    nz = dirZ(door.dir);
  const side = Math.sign((from.x - centre.x) * nx + (from.z - centre.z) * nz) || -1;
  return { x: centre.x + nx * side * WAIT_DEPTH, z: centre.z + nz * side * WAIT_DEPTH };
}
