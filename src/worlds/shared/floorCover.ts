import type { PlanSolid } from '../grid/solids';
import { PLATE_SIZE } from './plateField';

/**
 * **Wo ein Bodenstück aus dem Regal liegt, liegt keine Platte** — und wie hoch
 * der Boden ist, in den es gelegt wird. Reine Rechnung, ohne three.js.
 *
 * Gemeldet war: _„wenn ich kitchen floor setze, [soll] der prototype floor
 * damit ersetzt werden (und nur angezeigt werden, wenn der kitchen floor
 * zerstört bzw. entfernt wird)"_. Das Bodenstück wird dafür bündig in den
 * Boden gelegt (`PortalWorld.sinkFloor`), und die Platten unter ihm gehen aus
 * dem Bild, solange es dort liegt (`GridWorld.coverFloor`). Was hier steht,
 * sind die beiden Fragen dazu: **welche Höhe** und **welche Platten**.
 */

/** Eine Kachelmitte in Weltmetern — so, wie `gridSnap.tilesCovered` sie liefert. */
export interface CoverTile {
  readonly x: number;
  readonly z: number;
}

/**
 * **Die Oberkanten der Böden je Kachel** — aus den Bodenquadern des
 * Grundrisses, eine Liste je Kachel (unter dem Podest liegen zwei Böden).
 */
export type FloorTops = Map<string, number[]>;

/** Der Schlüssel einer Kachel aus ihrer Mitte in Metern. */
export function coverKey(x: number, z: number, size: number = PLATE_SIZE): string {
  return `${Math.floor(x / size)}/${Math.floor(z / size)}`;
}

/** Einen Bodenquader in die Tabelle schreiben — jede Kachel, die er trägt. */
export function addFloorTops(tops: FloorTops, solid: PlanSolid, size: number = PLATE_SIZE): void {
  if (solid.kind !== 'floor') return;
  const top = solid.y + solid.h / 2;
  const west = solid.x - solid.w / 2;
  const north = solid.z - solid.d / 2;
  const cols = Math.max(1, Math.round(solid.w / size));
  const rows = Math.max(1, Math.round(solid.d / size));
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const key = coverKey(west + (c + 0.5) * size, north + (r + 0.5) * size, size);
      const list = tops.get(key);
      if (!list) tops.set(key, [top]);
      else if (!list.includes(top)) list.push(top);
    }
  }
}

/**
 * **Wie weit über dem Boden ein Stück noch „darauf“ gemeint ist**, in Metern:
 * Ein Bodenstück wird aus der Hand losgelassen, also irgendwo zwischen Knie
 * und Brust — gesucht wird der Boden darunter, und zwar der oberste, der
 * nicht höher als das Stück selbst liegt.
 */
const REACH_ABOVE = 0.05;

/**
 * **Die Höhe, in die ein Bodenstück gelegt wird** — die höchste Oberkante unter
 * seinen Kacheln, die nicht über `below` liegt; `null`, wenn unter keiner
 * Kachel ein Boden ist.
 *
 * Die höchste und nicht die häufigste: Ein Stück, das halb über einer
 * Treppenstufe hinge, soll auf ihr liegen und nicht in ihr stecken.
 */
export function floorTopUnder(
  tops: FloorTops,
  tiles: readonly CoverTile[],
  below: number,
  size: number = PLATE_SIZE,
): number | null {
  let best: number | null = null;
  for (const tile of tiles) {
    for (const top of tops.get(coverKey(tile.x, tile.z, size)) ?? []) {
      if (top > below + REACH_ABOVE) continue;
      if (best === null || top > best) best = top;
    }
  }
  return best;
}

/** Was ein Bodenstück deckt: seine Kacheln und die Höhe, auf der es liegt. */
export interface Cover {
  readonly tiles: readonly CoverTile[];
  readonly top: number;
}

/** Eine Platte, so wie ein Plattenboden sie kennt: die Mitte ihrer Oberseite. */
export interface CoverSeat {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * **Wie nah eine Platte an der Höhe des Bodenstücks liegen muss**, um als
 * gedeckt zu gelten — die Etage darüber (das Podest) bleibt liegen.
 */
const SAME_FLOOR = 0.1;

/**
 * **Die Platten, die zu sehen bleiben** — alle, die kein Bodenstück deckt.
 * Die Reihenfolge bleibt, wie sie war.
 */
export function uncoveredSeats<T extends CoverSeat>(
  seats: readonly T[],
  covers: Iterable<Cover>,
  size: number = PLATE_SIZE,
): T[] {
  const hidden = new Map<string, number[]>();
  for (const cover of covers) {
    for (const tile of cover.tiles) {
      const key = coverKey(tile.x, tile.z, size);
      const list = hidden.get(key);
      if (list) list.push(cover.top);
      else hidden.set(key, [cover.top]);
    }
  }
  if (hidden.size === 0) return [...seats];
  return seats.filter((seat) => {
    const tops = hidden.get(coverKey(seat.x, seat.z, size));
    return !tops?.some((top) => Math.abs(top - seat.y) < SAME_FLOOR);
  });
}
