import { findPath } from '../nav/navPath';
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
 * Die Ladung nach `dt` Sekunden — leerer, wenn er brennt, voller, wenn nicht.
 *
 * Steht hier und nicht in der Welt, damit die Anzeige beim Piloten und die
 * Rechnung im Haus dieselbe ist: Zwei Exemplare derselben Formel antworten
 * irgendwann verschieden, und dann zeigt der Balken eine Minute an, die es
 * nicht gibt.
 */
export function lampAfter(charge: number, dt: number, on: boolean): number {
  const step = on ? -dt / LAMP_LIFE : dt / LAMP_FILL;
  return Math.min(1, Math.max(0, charge + step));
}

/** Wie viele Sekunden Licht in dieser Ladung noch stecken. */
export function lampSeconds(charge: number): number {
  return Math.max(0, charge * LAMP_LIFE);
}

/** Und wie viele Sekunden es noch dauert, bis sie wieder voll ist. */
export function lampRefill(charge: number): number {
  return Math.max(0, (1 - charge) * LAMP_FILL);
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

/** Die Drehung um höchstens `most` Bogenmaß auf `want` zu — den kürzeren Weg. */
export function turnTowards(yaw: number, want: number, most: number): number {
  const turn = shortestTurn(yaw, want);
  if (Math.abs(turn) <= most) return want;
  return yaw + Math.sign(turn) * most;
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
  for (const tile of route.tiles) {
    const gx = tileCentreX(tile);
    const gz = tileCentreZ(tile);
    sum += Math.hypot(gx - x, gz - z);
    x = gx;
    z = gz;
  }
  return sum;
}
