import { findPath } from '../nav/navPath';
import { PLAN_DOOR_H, PLAN_WALL_H } from '../editor/levelPlan';
import { tileCentreX, tileCentreZ, tileIndexAt, tileKey, type TileKey } from '../nav/navTile';
import { DRONE_PROFILE } from './plan';
import type { NavGraph } from '../nav/navGraph';

/**
 * **Wie die Drohne durch das Haus kommt** — und warum das eine eigene Datei ist.
 *
 * Sie fliegt **nicht** auf das Zimmer zu, das der Pilot antippt. Sie sucht
 * einen Weg im Navigationsgraphen (`nav/navPath.ts`) und fliegt ihn Kachel für
 * Kachel ab. Der Unterschied ist der ganze Rest des Spiels: Eine Drohne, die
 * die Luftlinie nimmt, fliegt durch die Wand, und dann ist die Tür, die der
 * Hacker zugemacht hat, keine Tür mehr, sondern Kulisse. Mit Wegsuche hängt
 * ihre Reichweite an dem, was der VR-Spieler und der Hacker offen gelassen
 * haben — Abhängigkeit in beide Richtungen, ohne eine einzige Sonderregel.
 *
 * **Steht hier und nicht in der Welt**, damit ein Test das nachrechnen kann,
 * ohne three.js zu starten: dass zwischen zwei aufeinanderfolgenden Kacheln
 * des Weges wirklich keine Wand steht, ist eine Spielregel und keine Kulisse
 * — und eine Regel, die niemand nachprüft, ist beim nächsten Umbau am Profil
 * eine Behauptung. Der Test dazu fliegt einen Weg ganz ab und schaut nach,
 * dass die Bahn das Haus nie verlässt.
 *
 * **Sie fliegt auf Kachelmitten und nicht auf einer geglätteten Schnur.** Für
 * die NPCs zieht `navPath.pullString` den Weg gerade, weil ein Zombie, der
 * Ecken mitnimmt, besser aussieht. Hier ist das Gegenteil richtig: Der Pilot
 * soll an der Bahn *sehen*, dass sie einen Weg sucht — und die Bahn zwischen
 * zwei Kachelmitten liegt beweisbar in diesen beiden Kacheln, während eine
 * geglättete Abkürzung um eine Ecke an der Wand kratzt.
 */

/** Wie schnell sie fliegt, in Metern je Sekunde. */
export const DRONE_SPEED = 3.4;

/**
 * Wie weit sie über ihre eigene Mitte hinausragt: die Kuppel über dem Rumpf.
 *
 * Steht hier, weil die Zahl darunter aus ihr folgt — und weil eine Höhe, die
 * nur die Welt kennt, sich nicht nachrechnen lässt, ohne three.js zu starten.
 */
export const DRONE_CAP = 0.125;

/** Und wie viel Luft zwischen Kuppel und Türsturz bleibt. */
const DOOR_GAP = 0.12;

/**
 * **Wie hoch sie schwebt — und die Zahl ist keine, sondern eine Rechnung.**
 *
 * Sie hing eine Weile auf 2,15 m, und das waren knapp dreißig Zentimeter zu
 * viel: Ein Türsturz sitzt bei `PLAN_DOOR_H` (2,10 m), und die Kuppel stand
 * damit gut fünf Zentimeter *im* Sturz. Im Bild des Piloten schob sich bei
 * jeder Tür ein Balken von oben herein, und im Haus flog eine Drohne durch den
 * Rahmen, den sie eigentlich hätte durchqueren sollen. Zu niedrig war die Decke nicht: Ein
 * Zimmer mit 2,8 m und Türen mit 2,1 m ist ein Haus und kein Fehler.
 *
 * Also folgt die Höhe der Tür und nicht dem Gefühl: Oberkante der Kuppel
 * `DOOR_GAP` unter dem Sturz. Das bleibt deutlich über Augenhöhe — der Grund,
 * aus dem sie überhaupt hoch fliegt (auf 1,80 m stand im Bild eine Stuhllehne
 * vor dem halben Zimmer) — und passt trotzdem durch jede Tür des Hauses.
 */
export const DRONE_Y = PLAN_DOOR_H - DRONE_CAP - DOOR_GAP;

/** Die Decke, unter der das alles passieren muss — nur zum Nachrechnen. */
export const DRONE_ROOF = PLAN_WALL_H;

/**
 * Wie schnell sie sich dreht, in Bogenmaß je Sekunde.
 *
 * Die Bahn dreht nicht mit: Gedreht wird nur das Bild. Eine Drohne, die ihren
 * Kurs erst fliegt, wenn sie sich fertig gedreht hat, träfe die Ecke nicht
 * mehr; eine, die ihre Blickrichtung an jeder Kachel um 90° umspringen lässt,
 * ist im Kamerabild ein Schnitt und kein Flug.
 */
export const DRONE_TURN = 2.6;

/** Wie nah an einer Kachelmitte sie als angekommen gilt. */
export const WAYPOINT = 0.25;

/**
 * **Kein Akku, der abläuft — eine Sperre, die man abwartet.**
 *
 * Vorher lief ein einziger Akku durch: Er ging vom ersten Bild an runter, war
 * nach vier Minuten leer, und danach lag die Drohne im Haus herum. Das ist
 * keine Entscheidung, sondern ein Countdown — der Pilot konnte nichts falsch
 * machen, nur zu lange dabei sein, und wer spät an das Gerät kam, bekam eine
 * Leiche. Eine Runde, in der die Rolle nach vier Minuten aufhört, ist eine
 * Rolle weniger.
 *
 * An seiner Stelle stehen jetzt zwei Sachen, und beide erholen sich:
 *
 * - **Die Wechselsperre.** Ein Zimmerwechsel kostet `HOP_TIME` Sekunden, in
 *   denen kein neuer Wechsel geht. Damit ist die Drohne kein Suchscheinwerfer
 *   mehr, der das Haus in einer Minute abklappert — wer sie irgendwohin
 *   schickt, hat sich für dieses Zimmer entschieden und wartet, bis das
 *   nächste dran ist. Genau das ist die Frage, die der Van sich zurufen soll:
 *   *welches Zimmer als Nächstes?*
 * - **Das Licht.** Der Scheinwerfer zehrt an einer eigenen Ladung, und die
 *   **füllt sich wieder auf**, sobald er aus ist. Er bleibt damit eine
 *   Entscheidung (Licht heißt sehen und gesehen werden), ohne je endgültig zu
 *   sein.
 *
 * Beides zusammen macht aus dem Countdown einen Takt: Der Pilot kann sich
 * verausgaben und sich wieder erholen, und niemand verliert seine Station.
 */

/** Wie viele Sekunden zwischen zwei Zimmerwechseln liegen. */
export const HOP_TIME = 14;

/** Wie lange der Scheinwerfer aus einer vollen Ladung leuchtet, in Sekunden. */
export const LAMP_LIFE = 45;

/**
 * Und wie lange er von leer auf voll braucht — länger, als er hält.
 *
 * Andersherum wäre der Knopf keine Entscheidung mehr: Was sich schneller
 * füllt, als es sich leert, ist immer an.
 */
export const LAMP_FILL = 75;

/**
 * Ab wie viel Ladung er sich überhaupt wieder einschalten lässt.
 *
 * Ohne diese Schwelle klickt der Pilot an einer leeren Lampe: an, sofort
 * wieder aus, an, aus. Ein Knopf, der eine Zehntelsekunde hält, ist kaputt —
 * einer, der erst ab einem Rest wieder angeht, ist eine Ansage.
 */
export const LAMP_MIN = 0.08;

/**
 * Und wie lange dasselbe **am Van** dauert — dreimal so schnell, und dort
 * zehrt der Scheinwerfer überhaupt nicht.
 *
 * Der Vorplatz ist damit kein Abstellgleis, sondern eine Entscheidung: Wer
 * zurückfliegt, ist zwei Zimmerwechsel lang nicht im Haus und kommt dafür mit
 * voller Ladung wieder. Ohne diesen Unterschied wäre „zurück zum Van" ein
 * Knopf, den niemand je drückt.
 */
export const LAMP_HOME = 25;

/**
 * Die Ladung nach `dt` Sekunden — leerer, wenn er brennt, voller, wenn nicht.
 *
 * Steht hier und nicht in der Welt, damit die Anzeige beim Piloten und die
 * Rechnung im Haus dieselbe ist: Zwei Exemplare derselben Formel antworten
 * irgendwann verschieden, und dann zeigt der Balken eine Minute an, die es
 * nicht gibt.
 */
export function lampAfter(charge: number, dt: number, on: boolean, home = false): number {
  // **Am Van hängt sie am Kabel.** Sie zehrt dort nicht, egal ob der
  // Scheinwerfer brennt, und sie füllt sich schneller als im Haus. Das ist die
  // Erholung, die es sonst nirgends gibt — und damit der eine Grund, aus dem
  // ein Pilot freiwillig zurückfliegt, statt mit halber Ladung
  // weiterzustochern. Draußen sieht er ohnehin nichts, was ihm jemand
  // abnehmen müsste.
  if (home) return Math.min(1, charge + dt / LAMP_HOME);
  const step = on ? -dt / LAMP_LIFE : dt / LAMP_FILL;
  return Math.min(1, Math.max(0, charge + step));
}

/** Wie viele Sekunden Licht in dieser Ladung noch stecken. */
export function lampSeconds(charge: number): number {
  return Math.max(0, charge * LAMP_LIFE);
}

/** Und wie viele Sekunden es noch dauert, bis sie wieder voll ist. */
export function lampRefill(charge: number, home = false): number {
  return Math.max(0, (1 - charge) * (home ? LAMP_HOME : LAMP_FILL));
}

/**
 * **Wie weit die Drohnenkamera schaut** — waagerecht festgenagelt, senkrecht
 * ausgerechnet.
 *
 * `THREE.PerspectiveCamera.fov` ist der **senkrechte** Winkel, und genau das
 * ist die Falle, sobald das Bild seine Form ändert: Dieselbe Zahl ist im
 * Kinostreifen ein Weitwinkel und im hochkanten Vollbild ein Fernrohr. Der
 * Pilot merkt davon nur, dass er auf einmal nichts mehr findet.
 *
 * Festgehalten wird deshalb, was er wirklich braucht — **wie viel vom Zimmer
 * links und rechts ins Bild passt** —, und der senkrechte Winkel fällt daraus
 * ab. Die Grenzen halten das Ergebnis im Erträglichen: Unter `MIN` wird das
 * Bild zum Guckloch, über `MAX` biegt sich das Haus an den Rändern.
 */
export const DRONE_HFOV = 118;
const FOV_MIN = 66;
const FOV_MAX = 104;

export function droneFov(aspect: number): number {
  const wide = Math.max(0.05, aspect);
  const half = Math.tan((DRONE_HFOV * Math.PI) / 360) / wide;
  const fov = (Math.atan(half) * 360) / Math.PI;
  return Math.min(FOV_MAX, Math.max(FOV_MIN, fov));
}

/** Wie langsam sie im schärfsten Bogen noch fliegt, als Anteil vom Tempo. */
const SLOW = 0.35;

/**
 * **Was der Pilot über seinen Flug erfährt** — und mehr weiß eine Drohne auch
 * nicht.
 *
 * Kein Grundriss und keine Abzweigung: Die gehören dem Archivar, und eine
 * Station, die beides sähe, lotste allein. Was hier steht, ist das, was ein
 * Blick auf die eigene Anzeige hergibt — wo sie schwebt, wie weit noch, und ob
 * überhaupt.
 */
export interface DroneStatus {
  /**
   * `blocked` ist die Zeile, auf die es ankommt: Sie ist die Stelle, an der
   * aus einer Wegsuche eine Ansage an den Rest des Vans wird — *irgendwo
   * dazwischen ist zu, macht auf*.
   */
  kind: 'idle' | 'flying' | 'blocked';
  /** Das Zimmer, über dem sie gerade schwebt — `''`, wenn es keines ist. */
  here: string;
  /** Wie weit sie auf ihrer Bahn noch zu fliegen hat, in Metern. */
  metres: number;
}

/** Wo sie ist und wohin sie schaut. */
export interface DronePose {
  x: number;
  z: number;
  /** Blickrichtung als `three`-Gierwinkel: `atan2(dx, dz)`. */
  yaw: number;
  /** Continuous flight speed survives a route replan. */
  velocity?: number;
}

/**
 * Der Weg, der noch vor ihr liegt.
 *
 * `tiles[0]` ist die **nächste** Kachelmitte und nicht die, auf der sie steht:
 * Ein Weg, der mit dem eigenen Standort anfängt, lässt sie im ersten Bild
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
   * besten Teilweg zurück, sie fliegt ihn bis vor die geschlossene Tür und
   * bleibt dort stehen. Genau das soll der Pilot sehen.
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
 * **Den Weg suchen** — von dort, wo sie gerade schwebt, zu einer Kachel.
 *
 * Neu gesucht wird zweimal je Sekunde und nicht nur beim Antippen: Der Hacker
 * macht Türen zu, *während* sie unterwegs ist, und eine Drohne, die ihren Weg
 * beim Start ein für alle Mal berechnet hat, fliegt danach durch eine
 * geschlossene Tür. Billig ist das, weil ein Haus achtundvierzig Kacheln hat.
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
 * **Ein Stück des Weges fliegen.** Gibt zurück, ob noch etwas übrig ist.
 *
 * Die Bahn geht immer von Kachelmitte zu Kachelmitte der **nächsten** Kachel,
 * und beide grenzen aneinander — damit liegt jeder Punkt der Bahn in einer der
 * beiden Kacheln, und die Drohne kann gar nicht durch eine Wand geraten. Das
 * ist der Grund für die Kachelmitten und nicht Bequemlichkeit: Eine Abkürzung
 * über eine Ecke wäre schöner und hätte keine solche Zusage.
 *
 * Gedreht wird getrennt davon (`turnTowards`) und langsamer, als geflogen
 * wird; wer scharf abbiegt, fliegt dabei langsamer. Beides kostet keine
 * Genauigkeit — der Ort bleibt auf der Bahn —, sieht aber aus wie ein Flug
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
 * Der Blick des Piloten dreht **ganz** herum, seit die alte Sperre bei gut
 * zwei Dritteln einer halben Umdrehung weg ist — und ein Winkel, der immer
 * weiter wächst, ist nach dem dritten Wisch eine Zahl, mit der weder die
 * Anzeige noch der Empfänger etwas anfangen kann. Gedreht wird also im Kreis
 * und nicht auf einer Geraden.
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
 * Wie weit sie noch zu fliegen hat, in Metern — für die Anzeige beim Piloten.
 *
 * Gerechnet wird die Bahn, die sie wirklich nimmt, und nicht die Luftlinie:
 * Eine Zahl, die „6 m" sagt, während die Drohne einmal um den Flur muss, ist
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
