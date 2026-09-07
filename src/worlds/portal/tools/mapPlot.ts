import {
  keyLevel,
  tileCentreX,
  tileCentreZ,
  wallDir,
  wallTile,
  DIR_N,
  TILE,
} from '../../nav/navTile';
import type { NavGraph } from '../../nav/navGraph';

/**
 * **Die Karte in der Hand, als Rechnung** — welcher Boden, welche Wände und
 * welche Türen um den Träger herum liegen, und wo sie auf dem Blatt landen.
 *
 * Woher die Karte weiß, wie die Welt aussieht: aus dem **Kachelgitter**
 * (`worlds/nav/navGraph.ts`). Das ist keine Notlösung, sondern die einzige
 * ehrliche Quelle, die es hier gibt — jede Welt tastet sich beim Aufbau
 * selbst ab (`PortalWorld.bakeNavigation`), und was dabei herauskommt, ist
 * genau die Frage, die eine Karte beantwortet: Wo kann ich hin, und was steht
 * im Weg? Eine zweite, eigens gepflegte Kartenbeschreibung je Welt wäre eine
 * Liste, die nach der dritten Änderung lügt.
 *
 * **Ein Ausschnitt und keine Übersicht.** Die Karte zeigt einen Kasten um den
 * Träger herum — voreingestellt vierzig Meter Kantenlänge —, und der wandert
 * mit ihm. Eine Karte, die immer die ganze Welt zeigt, ist in Dust ein
 * grauer Fleck und in der Kletterhalle ein Punkt; eine, die mitwandert, ist
 * das, wofür man eine Karte in die Hand nimmt.
 *
 * **Norden ist oben, immer.** Die Alternative wäre, das Blatt mitzudrehen, und
 * sie ist verführerisch — aber wer die Karte in der Hand hält, dreht sie
 * ohnehin selbst dorthin, wo er sie lesen will. Was sich dreht, ist der
 * **Pfeil** darauf.
 *
 * Ohne three.js und ohne Leinwand: Was hier herauskommt, sind Zahlen in
 * Blattkoordinaten (0…1 in beiden Richtungen, y nach unten wie auf jeder
 * Leinwand), und die lassen sich ohne Brille nachrechnen. Gezeichnet wird in
 * `MapTool.ts`.
 */

/** Der Ausschnitt: Mitte in Weltmetern, Kantenlänge in Metern. */
export interface MapWindow {
  x: number;
  z: number;
  /** Kantenlänge des gezeigten Quadrats in Metern. */
  span: number;
  /** Auf welcher Etage geschaut wird — Kacheln anderer Etagen bleiben draußen. */
  level: number;
}

/** Ein Punkt auf dem Blatt: 0…1 von links und **von oben**. */
export interface Sheet {
  u: number;
  v: number;
}

/** Ein Stück Boden — die Kachel, auf der man stehen kann. */
export interface MapTile {
  /** Mitte auf dem Blatt. */
  at: Sheet;
  /** Kantenlänge einer Kachel auf dem Blatt. */
  size: number;
  /** Ob dort gerade nichts durchkommt (`NavGraph.isBlocked`). */
  blocked: boolean;
}

/** Eine Wand, eine Tür oder ein Fenster — als Strecke auf dem Blatt. */
export interface MapWall {
  from: Sheet;
  to: Sheet;
  kind: 'solid' | 'door' | 'window';
  /** Nur bei Türen: ob sie offen steht. */
  open: boolean;
}

/** Was die Karte gerade zeigt. */
export interface MapPlot {
  tiles: MapTile[];
  walls: MapWall[];
  /** Wie viele Kacheln geprüft wurden — die Karte sagt es, wenn es keine gab. */
  scanned: number;
}

/**
 * Weltkoordinaten auf das Blatt.
 *
 * Norden oben heißt: **kleines z ist oben**. Das ist die eine Zeile, an der
 * sich eine Karte verrät, wenn sie falsch ist — in three.js zeigt −z nach
 * vorn, und wer das Vorzeichen vergisst, bekommt eine gespiegelte Welt, in
 * der jeder Weg nach links führt.
 */
export function toSheet(window: MapWindow, x: number, z: number): Sheet {
  const half = window.span / 2;
  return {
    u: (x - window.x + half) / window.span,
    v: (z - window.z + half) / window.span,
  };
}

/** Ob ein Blattpunkt überhaupt auf dem Blatt liegt — mit einem Rand Zugabe. */
export function onSheet(at: Sheet, margin = 0): boolean {
  return at.u >= -margin && at.u <= 1 + margin && at.v >= -margin && at.v <= 1 + margin;
}

/**
 * Was in diesem Ausschnitt zu sehen ist.
 *
 * Durchlaufen wird das ganze Gitter und nicht ein Bereich daraus, und das ist
 * Absicht: Ein `NavGraph` führt seine Kacheln in einer `Map`, ohne Index über
 * die Fläche. Die größte Karte dieses Projekts (Dust) hat ein paar tausend
 * Kacheln — ein Durchlauf darüber kostet weniger als das Zeichnen des Blattes,
 * und die Karte zeichnet ohnehin nur ein paarmal in der Sekunde neu.
 */
export function plotMap(graph: NavGraph, window: MapWindow): MapPlot {
  const tiles: MapTile[] = [];
  const walls: MapWall[] = [];
  const size = TILE / window.span;
  let scanned = 0;

  for (const key of graph.tileKeys()) {
    scanned++;
    if (keyLevel(key) !== window.level) continue;
    const at = toSheet(window, tileCentreX(key), tileCentreZ(key));
    // Eine halbe Kachel Zugabe: Was mit seiner Mitte knapp draußen liegt, ragt
    // mit seiner Kante noch herein.
    if (!onSheet(at, size)) continue;
    tiles.push({ at, size, blocked: graph.isBlocked(key) });
  }

  for (const [wall, facts] of graph.wallEntries()) {
    const key = wallTile(wall);
    if (keyLevel(key) !== window.level) continue;
    // Dieselbe Rechnung wie beim Bauen (`editor/levelBuild.ts`): Eine Wand
    // sitzt auf der Kante nach Norden bzw. nach Osten, also eine halbe Kachel
    // neben der Mitte — und läuft von dort quer über die volle Kachelbreite.
    const alongX = wallDir(wall) === DIR_N;
    const x = tileCentreX(key) + (alongX ? 0 : TILE / 2);
    const z = tileCentreZ(key) + (alongX ? -TILE / 2 : 0);
    const half = TILE / 2;
    const from = toSheet(window, alongX ? x - half : x, alongX ? z : z - half);
    const to = toSheet(window, alongX ? x + half : x, alongX ? z : z + half);
    if (!onSheet(from, size) && !onSheet(to, size)) continue;
    walls.push({
      from,
      to,
      kind: facts.kind,
      open: facts.kind === 'door' && facts.open,
    });
  }

  return { tiles, walls, scanned };
}

/**
 * **Auf welcher Etage man steht.**
 *
 * Eine Karte zeigt ein Stockwerk und nicht alle übereinander — in Dust liegen
 * vier davon aufeinander, und übereinandergelegt wären sie ein Knäuel aus
 * Wänden, das nichts mehr sagt. Genommen wird die Etage, auf deren Boden der
 * Kopf am ehesten steht: `EYE` über dem Boden ist ein Mensch, der dort steht,
 * und wer dazwischen in der Luft hängt, bekommt die nähere von beiden.
 */
export const EYE = 1.6;

export function nearestLevel(levels: readonly number[], y: number): number {
  let best = 0;
  let closest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < levels.length; i++) {
    const distance = Math.abs(y - (levels[i] ?? 0) - EYE);
    if (distance >= closest) continue;
    closest = distance;
    best = i;
  }
  return best;
}
