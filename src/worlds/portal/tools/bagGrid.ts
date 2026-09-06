/**
 * Das Raster im magischen Beutel: wo die Fächer einer Seite liegen, wie
 * geblättert wird und welches Fach eine Hand meint.
 *
 * Gemeint sein kann ein Fach auf zwei Wegen, und beide enden hier: die
 * **Fingerspitze** steht darüber, wie schon immer — oder die **Ziellinie**
 * trifft es aus der Entfernung. Das Zweite ist der Grund, warum es dieses
 * Modul überhaupt gibt: ein Raster von zweieinhalb Zentimetern Fachbreite mit
 * der Fingerspitze zu treffen heißt, die Hand bis in den Beutel zu führen und
 * sie dort ruhig zu halten — mit dem Strahl zeigt man einfach hin.
 *
 * Bewusst ohne three.js, damit die Rechnung ohne Brille geprüft werden kann.
 */

import type { Vec3 } from './aim';

/** Die Mitte eines Fachs in der Rasterebene, im Raum des Beutels. */
export interface Cell {
  x: number;
  z: number;
}

/** Kein Fach — dasselbe „nichts", das jede Suche hier zurückgibt. */
export const NO_CELL = -1;

/**
 * Wie weit eine Hand von der Rasterebene weg sein darf und trotzdem in einem
 * Fach steht: darüber, darunter, und seitlich neben der Mitte.
 */
export interface Reach {
  /** Höhe der Rasterebene über dem Ursprung des Beutels. */
  plane: number;
  up: number;
  down: number;
  side: number;
}

/** Wie viele Seiten so viele Dinge füllen — mindestens eine, auch für nichts. */
export function pageCount(items: number, perPage: number): number {
  if (perPage < 1) return 1;
  return Math.max(1, Math.ceil(items / perPage));
}

/**
 * Geblättert wird im Kreis: hinter der letzten Seite kommt wieder die erste.
 *
 * Ein Beutel hat keinen Rand, an dem ein Pfeil grau wird. Er hat drei Seiten,
 * und wer einmal zu weit blättert, blättert einmal weiter statt umzukehren.
 */
export function turnPage(page: number, step: number, pages: number): number {
  const count = Math.max(1, Math.floor(pages));
  const wanted = Math.floor(page) + Math.floor(step);
  return ((wanted % count) + count) % count;
}

/**
 * Wo das n-te Fach einer Seite liegt: Spalten nach x, Zeilen nach z, und das
 * Ganze um die Mitte des Beutels herum.
 */
export function cellCentre(index: number, cols: number, rows: number, cell: number): Cell {
  const column = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: (column - (cols - 1) / 2) * cell,
    z: (row - (rows - 1) / 2) * cell,
  };
}

/**
 * Das Fach, dessen Mitte einem Punkt der Rasterebene am nächsten liegt —
 * `NO_CELL`, wenn keines nah genug ist.
 *
 * Gemessen wird im Quadrat (die größere der beiden Achsen), nicht im Kreis:
 * Fächer sind quadratisch, und ein Kreis ließe die Ecken kalt.
 */
export function nearestCell(x: number, z: number, cells: readonly Cell[], side: number): number {
  let nearest = NO_CELL;
  let closest = side;
  cells.forEach((cell, index) => {
    const gap = Math.max(Math.abs(x - cell.x), Math.abs(z - cell.z));
    if (gap >= closest) return;
    closest = gap;
    nearest = index;
  });
  return nearest;
}

/** Über welchem Fach ein Punkt steht — die Fingerspitze im Beutel. */
export function cellAtPoint(point: Vec3, cells: readonly Cell[], reach: Reach): number {
  if (point.y > reach.plane + reach.up || point.y < reach.plane - reach.down) return NO_CELL;
  return nearestCell(point.x, point.z, cells, reach.side);
}

/**
 * Wo eine Ziellinie die Rasterebene trifft — `null`, wenn sie das nicht tut.
 *
 * Getroffen wird nur **von oben**: ein Strahl, der waagerecht läuft, nach oben
 * zeigt oder unter der Ebene beginnt, sieht in den Beutel hinein wie durch
 * seinen Boden, und was durch den Boden gezeigt wird, ist nicht gemeint.
 * `range` deckelt das Ganze — der Beutel hängt in der anderen Hand und nicht
 * am anderen Ende der Halle.
 */
export function rayToPlane(
  origin: Vec3,
  direction: Vec3,
  plane: number,
  range: number,
): Cell | null {
  if (direction.y >= -1e-6) return null;
  const distance = (plane - origin.y) / direction.y;
  if (distance <= 0 || distance > range) return null;
  return {
    x: origin.x + direction.x * distance,
    z: origin.z + direction.z * distance,
  };
}

/**
 * Welches Fach eine Ziellinie meint — `NO_CELL`, wenn sie neben das Raster
 * oder ganz daran vorbei zeigt.
 */
export function cellAtRay(
  origin: Vec3,
  direction: Vec3,
  cells: readonly Cell[],
  reach: Reach,
  range: number,
): number {
  const hit = rayToPlane(origin, direction, reach.plane, range);
  if (!hit) return NO_CELL;
  return nearestCell(hit.x, hit.z, cells, reach.side);
}
