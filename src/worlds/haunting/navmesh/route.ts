import type { FloorPoint } from '../stationLayout';

/**
 * **Was auf einem gesuchten Weg gefahren wird** — die Typen und die Bahn.
 *
 * Die Datei hieß `droneRoute.ts`, solange es eine Drohne gab: Sie war die
 * Einzige, die einen Weg *abflog*, und die Höhe ihrer Kuppel stand darin
 * neben der Bahn. Die Drohne ist weg, die Bahn nicht — sie trägt heute den
 * Modelltechniker (`missionBot.ts`, `rules/technicianBot.ts`) und das Monster
 * (`navmesh/flatNavigator.ts`, `stationNpcNavigator.ts`). Deshalb steht sie
 * jetzt im Paket `nav` und heißt nach dem, was sie ist: ein Weg und der
 * Schritt darauf.
 *
 * **Gesucht wird woanders** (`stationNavigation.stationRoute`): Dort entsteht
 * die Punktkette, hier wird sie abgefahren. Die Trennung ist der Grund, aus
 * dem beides ohne three.js nachzurechnen ist — dass eine Bahn nie eine Wand
 * kreuzt, ist eine Spielregel und keine Kulisse.
 */

/** Wie schnell auf einem Weg gefahren wird, in Metern je Sekunde. */
export const ROUTE_SPEED = 3.4;

/**
 * Wie schnell sich die Blickrichtung dreht, in Bogenmaß je Sekunde.
 *
 * Die Bahn dreht nicht mit: Gedreht wird nur der Blick. Wer seinen Kurs erst
 * fliegt, wenn er sich fertig gedreht hat, träfe die Ecke nicht mehr; wer
 * seine Blickrichtung an jeder Ecke umspringen lässt, ist im Bild ein Schnitt
 * und keine Bewegung.
 */
export const ROUTE_TURN = 2.6;

/** Wo jemand ist und wohin er schaut. */
export interface RoutePose {
  x: number;
  z: number;
  /** Blickrichtung als `three`-Gierwinkel: `atan2(dx, dz)`. */
  yaw: number;
  /** Continuous travel speed survives a route replan. */
  velocity?: number;
}

/**
 * Der Weg, der noch vor ihm liegt — eine Punktkette in Metern.
 *
 * `points[0]` ist der **nächste** Punkt und nicht der, auf dem er steht: Ein
 * Weg, der mit dem eigenen Standort anfängt, lässt ihn im ersten Bild
 * rückwärts zucken.
 */
export interface RoutePath {
  points: FloorPoint[];
  /**
   * Ob die Suche bis ans Ziel gekommen ist.
   *
   * `false` heißt nicht „Fehler", sondern **hier ist zu**: Zurück kommt der
   * beste Teilweg, er wird bis vor die geschlossene Tür gegangen, und dort
   * bleibt er stehen.
   */
  complete: boolean;
  /** Ob es überhaupt einen Startpunkt im Raster gab. */
  grounded: boolean;
}

/**
 * **Ein Stück des Weges gehen.** Gibt zurück, ob noch etwas übrig ist.
 *
 * Der ganze Bildschritt wird über die Punkte hinweg verbraucht: An einem
 * dicht gesetzten Zwischenpunkt darf kein Bild verloren gehen, sonst hängt
 * die Bewegung an der Bildrate statt an der Uhr. Beschleunigt und gebremst
 * wird über `pose.velocity`; kurz vor dem Ziel wird die Geschwindigkeit auf
 * die Reststrecke gedeckelt, damit niemand über den letzten Punkt hinausrutscht.
 */
export function stepAlong(
  pose: RoutePose,
  route: RoutePath,
  dt: number,
  speed = ROUTE_SPEED,
): boolean {
  const points = route.points;
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
  let turnBudget = ROUTE_TURN * time;
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
 * Ein Winkel, der immer weiter wächst, ist nach der dritten Drehung eine
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
 * Wie weit auf diesem Weg noch zu gehen ist, in Metern.
 *
 * Gerechnet wird die Bahn, die wirklich genommen wird, und nicht die
 * Luftlinie: Eine Zahl, die „6 m" sagt, während der Weg einmal um den Flur
 * führt, ist schlimmer als gar keine.
 */
export function routeLength(pose: RoutePose, route: RoutePath): number {
  let sum = 0;
  let x = pose.x;
  let z = pose.z;
  for (const point of route.points) {
    sum += Math.hypot(point.x - x, point.z - z);
    x = point.x;
    z = point.z;
  }
  return sum;
}
