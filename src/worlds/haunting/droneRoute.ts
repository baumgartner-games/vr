import { findPath } from '../nav/navPath';
import { PLAN_DOOR_H } from '../editor/levelPlan';
import { tileCentreX, tileCentreZ, tileIndexAt, tileKey, type TileKey } from '../nav/navTile';
import { DRONE_PROFILE } from './plan';
import type { NavGraph } from '../nav/navGraph';

/**
 * **Wie ein Wesen einen Weg durch das Haus abläuft** — Kachel für Kachel,
 * mit Beschleunigung, Bremsen und einer Drehung, die dem Kurs nachläuft.
 *
 * Die Datei hieß nach der Drohne, die zuerst so flog; die Rolle ist
 * gestrichen, der Weg geblieben: Der Modelltechniker (`missionBot.ts`) und
 * der Monsternavigator (`stationNpcNavigator.ts`) laufen dieselben Bahnen,
 * und `stationNavigation.ts` rechnet sie. Die Namen (`DronePose`,
 * `DroneRoute`) bleiben, bis das Paket Navmesh sie umbenennt — vier Dateien
 * hängen daran.
 *
 * Es wird **nicht** auf das Ziel zu gelaufen, sondern ein Weg im
 * Navigationsgraphen (`nav/navPath.ts`) gesucht und Kachel für Kachel
 * abgegangen. Der Unterschied ist der ganze Rest des Spiels: Wer die
 * Luftlinie nimmt, geht durch die Wand, und dann ist die Tür, die die
 * Schalttafel zugemacht hat, keine Tür mehr, sondern Kulisse.
 *
 * **Steht hier und nicht in der Welt**, damit ein Test das nachrechnen kann,
 * ohne three.js zu starten: dass zwischen zwei aufeinanderfolgenden Kacheln
 * des Weges wirklich keine Wand steht, ist eine Spielregel und keine Kulisse.
 * Der Test dazu läuft einen Weg ganz ab und schaut nach, dass die Bahn das
 * Haus nie verlässt.
 *
 * **Kachelmitten und keine geglättete Schnur.** Die Bahn zwischen zwei
 * Kachelmitten liegt beweisbar in diesen beiden Kacheln, während eine
 * geglättete Abkürzung um eine Ecke an der Wand kratzt. Wer eine Kurve will,
 * gibt `DroneRoute.points` mit (`stationNavigation.ts`, kollisionsgeprüft).
 */

/** Das Grundtempo, wenn ein Aufrufer keines mitgibt, in Metern je Sekunde. */
export const DRONE_SPEED = 3.4;

/**
 * Wie weit ein Flieger über seine eigene Mitte hinausragt — und die Höhe, mit
 * der `stationNavigation.ts` einen Weg für ihn prüft (`height`). Von der
 * Drohne geerbt und nur noch in den Tests der Wegsuche in Gebrauch.
 */
export const DRONE_CAP = 0.125;

/** Und wie viel Luft zwischen Kuppel und Türsturz bleibt. */
const DOOR_GAP = 0.12;

/** Die Flughöhe: Oberkante `DOOR_GAP` unter dem Türsturz (`PLAN_DOOR_H`). */
export const DRONE_Y = PLAN_DOOR_H - DRONE_CAP - DOOR_GAP;

/**
 * Wie schnell sich die Blickrichtung dreht, in Bogenmaß je Sekunde.
 *
 * Die Bahn dreht nicht mit: Gedreht wird nur der Blick. Wer seinen Kurs erst
 * geht, wenn er sich fertig gedreht hat, träfe die Ecke nicht mehr.
 */
export const DRONE_TURN = 2.6;

/** Wie nah an einer Kachelmitte man als angekommen gilt. */
export const WAYPOINT = 0.25;

/** Wie langsam man im schärfsten Bogen noch geht, als Anteil vom Tempo. */
const SLOW = 0.35;

/** Wo ein Wesen ist und wohin es schaut. */
export interface DronePose {
  x: number;
  z: number;
  /** Blickrichtung als `three`-Gierwinkel: `atan2(dx, dz)`. */
  yaw: number;
  /** Continuous flight speed survives a route replan. */
  velocity?: number;
}

/**
 * Der Weg, der noch vor einem liegt.
 *
 * `tiles[0]` ist die **nächste** Kachelmitte und nicht die, auf der man steht:
 * Ein Weg, der mit dem eigenen Standort anfängt, lässt einen im ersten Bild
 * rückwärts zur Mitte der eigenen Kachel zucken.
 */
export interface DroneRoute {
  tiles: TileKey[];
  /** Optional collision-cleared world-space path used by the station's fitted models. */
  points?: Array<{ x: number; z: number }>;
  /**
   * Ob der Graph bis ans Ziel gekommen ist.
   *
   * `false` heißt nicht „Fehler", sondern **hier ist zu**: `findPath` gibt den
   * besten Teilweg zurück, man geht ihn bis vor die geschlossene Tür und
   * bleibt dort stehen.
   */
  complete: boolean;
  /** Ob es überhaupt einen Startpunkt im Graphen gab. */
  grounded: boolean;
}

/** Auf welcher Kachel ein Punkt in Metern liegt. */
export function tileAt(x: number, z: number, level = 0): TileKey {
  return tileKey(tileIndexAt(x), tileIndexAt(z), level);
}

/**
 * **Den Weg suchen** — von dort, wo man gerade steht, zu einer Kachel, mit
 * dem Profil eines Fliegers, der über Möbel hinwegkommt und keine Tür
 * aufmacht (`DRONE_PROFILE`).
 *
 * Neu gesucht wird laufend und nicht nur beim Start: Die Schalttafel macht
 * Türen zu, *während* man unterwegs ist. Billig ist das, weil ein Haus
 * achtundvierzig Kacheln hat.
 */
export function routeTo(graph: NavGraph, from: DronePose, goal: TileKey): DroneRoute {
  const found = findPath(graph, tileAt(from.x, from.z), goal, { profile: DRONE_PROFILE });
  return {
    tiles: found.tiles.slice(1),
    complete: found.complete,
    grounded: found.tiles.length > 0,
  };
}

/**
 * **Ein Stück des Weges gehen.** Gibt zurück, ob noch etwas übrig ist.
 *
 * Die Bahn geht immer von Kachelmitte zu Kachelmitte der **nächsten** Kachel,
 * und beide grenzen aneinander — damit liegt jeder Punkt der Bahn in einer der
 * beiden Kacheln, und niemand kann durch eine Wand geraten. Das ist der Grund
 * für die Kachelmitten und nicht Bequemlichkeit: Eine Abkürzung über eine
 * Ecke wäre schöner und hätte keine solche Zusage.
 *
 * Gedreht wird getrennt davon (`turnTowards`) und langsamer, als gegangen
 * wird; wer scharf abbiegt, geht dabei langsamer. Beides kostet keine
 * Genauigkeit — der Ort bleibt auf der Bahn —, sieht aber aus wie ein Gang
 * statt wie ein Schieberegler.
 */
export function stepAlong(
  pose: DronePose,
  route: DroneRoute,
  dt: number,
  speed = DRONE_SPEED,
): boolean {
  if (route.points) return stepCurve(pose, route.points, dt, speed);
  const next = route.tiles[0];
  if (next === undefined) return false;
  const gx = tileCentreX(next);
  const gz = tileCentreZ(next);
  const dx = gx - pose.x;
  const dz = gz - pose.z;
  const far = Math.hypot(dx, dz);
  if (far < WAYPOINT) {
    route.tiles.shift();
    return route.tiles.length > 0;
  }

  const want = Math.atan2(dx, dz);
  pose.yaw = turnTowards(pose.yaw, want, DRONE_TURN * dt);
  // Im Bogen langsamer: Was sie sich zu drehen hat, zieht sie vom Tempo ab.
  // Nie ganz auf null — sonst bliebe sie in einer 180°-Wende stehen.
  const off = Math.abs(shortestTurn(pose.yaw, want));
  const ease = SLOW + (1 - SLOW) * Math.max(0, Math.cos(off));
  const step = Math.min(far, speed * ease * dt);
  pose.x += (dx / far) * step;
  pose.z += (dz / far) * step;
  return true;
}

/** Spend the whole frame across curve samples: no dropped frame at a waypoint. */
function stepCurve(
  pose: DronePose,
  points: Array<{ x: number; z: number }>,
  dt: number,
  speed: number,
): boolean {
  if (!points.length) {
    pose.velocity = 0;
    return false;
  }
  if (!Number.isFinite(dt + speed) || dt <= 0 || speed <= 0) return true;
  const time = Math.min(0.1, dt);
  const end = points[points.length - 1]!;
  const braking =
    points.length < 12 ? Math.sqrt(5 * Math.hypot(end.x - pose.x, end.z - pose.z)) : speed;
  const target = Math.min(speed, Math.max(0.15, braking));
  const previous = pose.velocity ?? 0;
  const next =
    previous + Math.sign(target - previous) * Math.min(Math.abs(target - previous), 2.5 * time);
  pose.velocity = next;
  let travel = (previous + next) * 0.5 * time;
  let turnBudget = DRONE_TURN * time;
  while (points.length && travel > 0) {
    const point = points[0]!;
    const dx = point.x - pose.x,
      dz = point.z - pose.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 1e-7) {
      points.shift();
      continue;
    }
    const portion = Math.min(distance, travel);
    const want = Math.atan2(dx, dz);
    const turn = Math.min(turnBudget, Math.abs(shortestTurn(pose.yaw, want)));
    pose.yaw = turnTowards(pose.yaw, want, turn);
    turnBudget -= turn;
    pose.x += (dx / distance) * portion;
    pose.z += (dz / distance) * portion;
    travel -= portion;
    if (portion === distance) {
      pose.x = point.x;
      pose.z = point.z;
      points.shift();
    }
  }
  if (!points.length) pose.velocity = 0;
  return points.length > 0;
}

/** Die Drehung um höchstens `most` Bogenmaß auf `want` zu — den kürzeren Weg. */
export function turnTowards(yaw: number, want: number, most: number): number {
  const turn = shortestTurn(yaw, want);
  if (Math.abs(turn) <= most) return want;
  return yaw + Math.sign(turn) * most;
}

/**
 * Derselbe Winkel, aber zwischen −π und π.
 *
 * Ein Winkel, der immer weiter wächst, ist nach der dritten Umdrehung eine
 * Zahl, mit der weder eine Anzeige noch ein Empfänger etwas anfangen kann.
 * Gedreht wird also im Kreis und nicht auf einer Geraden.
 */
export function wrapAngle(yaw: number): number {
  return shortestTurn(0, yaw);
}

/** Der kürzere der beiden Bögen zwischen zwei Winkeln, in Bogenmaß. */
export function shortestTurn(from: number, to: number): number {
  let turn = (to - from) % (Math.PI * 2);
  if (turn > Math.PI) turn -= Math.PI * 2;
  if (turn < -Math.PI) turn += Math.PI * 2;
  return turn;
}

/**
 * Wie weit noch zu gehen ist, in Metern.
 *
 * Gerechnet wird die Bahn, die man wirklich nimmt, und nicht die Luftlinie:
 * Eine Zahl, die „6 m" sagt, während der Weg einmal um den Flur führt, ist
 * schlimmer als gar keine.
 */
export function routeLength(pose: DronePose, route: DroneRoute): number {
  let sum = 0;
  let x = pose.x;
  let z = pose.z;
  const count = route.points?.length ?? route.tiles.length;
  for (let i = 0; i < count; i++) {
    const gx = route.points ? route.points[i]!.x : tileCentreX(route.tiles[i]!);
    const gz = route.points ? route.points[i]!.z : tileCentreZ(route.tiles[i]!);
    sum += Math.hypot(gx - x, gz - z);
    x = gx;
    z = gz;
  }
  return sum;
}
