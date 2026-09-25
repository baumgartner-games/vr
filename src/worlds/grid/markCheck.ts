import { CellGrid, snapCell, type CellPos } from '../nav/cellGrid';
import type { MarkRole } from './fixtures/mark';

/**
 * **Die Wandtests prüfen** — von jeder Startmarke aus das Zellgitter fluten
 * und jede grüne und rote Marke dagegenhalten (`fixtures/mark.ts`).
 *
 * Geflutet wird mit genau der Regel, mit der gegangen wird: Ein 2×2-Block
 * kommt von Stellung zu Stellung, wenn der Block am Ziel frei ist
 * (`CellGrid.canStep`, acht Richtungen). Eine Kachel gilt als erreicht, wenn
 * die Mitte eines erreichten Blocks in ihr liegt — dort stünde die Figur.
 *
 * Geflutet wird nur um die Marken herum (`MARK_MARGIN` Kacheln): Draußen,
 * wo das Gitter für den Spieler schweigt (`voidIsFree`), liefe die Flut sonst
 * bis an den Rand der Zahlen.
 */

export interface Mark {
  id: string;
  role: MarkRole;
  /** Die Kachel. */
  x: number;
  z: number;
  level: number;
}

/** Wie weit um die Marken herum geflutet wird, in Kacheln. */
export const MARK_MARGIN = 12;

export type Verdict = 'pass' | 'fail';

export function checkMarks(grid: CellGrid, marks: readonly Mark[]): Map<string, Verdict> {
  const out = new Map<string, Verdict>();
  const starts = marks.filter((mark) => mark.role === 'start');
  if (starts.length === 0) return out;
  const levels = new Set(marks.map((mark) => mark.level));
  for (const level of levels) {
    const here = marks.filter((mark) => mark.level === level);
    const reached = flood(
      grid,
      here.filter((mark) => mark.role === 'start'),
      here,
      level,
    );
    for (const mark of here) {
      const hit = tileReached(reached, mark.x, mark.z);
      if (mark.role === 'start') out.set(mark.id, hit ? 'pass' : 'fail');
      else if (mark.role === 'go') out.set(mark.id, hit ? 'pass' : 'fail');
      else out.set(mark.id, hit ? 'fail' : 'pass');
    }
  }
  return out;
}

/** Wie viele bestanden sind, und von wie vielen — für die Zeile am Handgelenk. */
export function markSummary(verdicts: ReadonlyMap<string, Verdict>): string {
  if (verdicts.size === 0) return '';
  let pass = 0;
  for (const verdict of verdicts.values()) if (verdict === 'pass') pass++;
  return `Wandtests: ${pass} von ${verdicts.size} bestanden`;
}

function key(cx: number, cz: number): number {
  return (cx + 4096) * 8192 + (cz + 4096);
}

function tileReached(reached: ReadonlySet<number>, x: number, z: number): boolean {
  for (let cz = 2 * z; cz <= 2 * z + 1; cz++)
    for (let cx = 2 * x; cx <= 2 * x + 1; cx++) if (reached.has(key(cx, cz))) return true;
  return false;
}

function flood(
  grid: CellGrid,
  starts: readonly Mark[],
  all: readonly Mark[],
  level: number,
): Set<number> {
  const reached = new Set<number>();
  if (starts.length === 0) return reached;
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const mark of all) {
    minX = Math.min(minX, mark.x);
    maxX = Math.max(maxX, mark.x);
    minZ = Math.min(minZ, mark.z);
    maxZ = Math.max(maxZ, mark.z);
  }
  const lo = { cx: 2 * (minX - MARK_MARGIN), cz: 2 * (minZ - MARK_MARGIN) };
  const hi = { cx: 2 * (maxX + MARK_MARGIN) + 1, cz: 2 * (maxZ + MARK_MARGIN) + 1 };
  const queue: CellPos[] = [];
  for (const start of starts) {
    const at = snapCell(start.x + 0.5, start.z + 0.5);
    const free = grid.footprintFree(at, level)
      ? at
      : grid.nearestFree(start.x + 0.5, start.z + 0.5, level, 1);
    if (!free || reached.has(key(free.cx, free.cz))) continue;
    reached.add(key(free.cx, free.cz));
    queue.push(free);
  }
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head]!;
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dz === 0) continue;
        const next = { cx: at.cx + dx, cz: at.cz + dz };
        if (next.cx < lo.cx || next.cx > hi.cx || next.cz < lo.cz || next.cz > hi.cz) continue;
        const k = key(next.cx, next.cz);
        if (reached.has(k) || !grid.canStep(at, next, level)) continue;
        reached.add(k);
        queue.push(next);
      }
  }
  return reached;
}
