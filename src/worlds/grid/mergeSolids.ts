import type { PlanSolid } from './solids';
import { TILE } from '../nav/navTile';

/**
 * **Bodenkacheln zu Rechtecken zusammenfassen** — `GridWorld` baut je
 * Bodenkachel einen Quader mit Körper und Netz. Die Station fasst ihre Böden
 * je Raum zusammen (`haunting/plan.ts`), die Stadt ihre Wiese
 * (`city/cityPlan.ts`): Dort wären es sonst 37 584 Quader samt Körpern in der
 * Physik — der größte Teil dessen, was die Brille in der Stadt ins Stocken
 * brachte.
 */

/** Ein Schlüssel für alles, was gleich sein muss, damit zwei Quader einer werden. */
export function likeness(solid: PlanSolid, ...more: number[]): string {
  return [
    solid.level ?? 'x',
    solid.y.toFixed(3),
    solid.h.toFixed(3),
    ...more.map((n) => n.toFixed(3)),
  ].join('|');
}

export function cellKey(x: number, z: number): string {
  return `${x.toFixed(3)}:${z.toFixed(3)}`;
}

/**
 * Bodenkacheln zu Rechtecken: zeilenweise so weit nach Osten, wie es geht,
 * dann so viele Zeilen nach Süden, wie die ganze Breite noch Boden ist —
 * dieselbe Zerlegung wie bei den Gangstreifen (`house.stationRooms`).
 */
export function mergeFloors(tiles: readonly PlanSolid[]): PlanSolid[] {
  const groups = new Map<string, Map<string, PlanSolid>>();
  for (const tile of tiles) {
    const key = likeness(tile);
    const group = groups.get(key) ?? new Map<string, PlanSolid>();
    group.set(cellKey(tile.x, tile.z), tile);
    groups.set(key, group);
  }
  const out: PlanSolid[] = [];
  for (const group of groups.values()) {
    const cells = new Set(group.keys());
    const sorted = [...group.values()].sort((a, b) => a.z - b.z || a.x - b.x);
    for (const start of sorted) {
      if (!cells.has(cellKey(start.x, start.z))) continue;
      let w = 1;
      while (cells.has(cellKey(start.x + w * TILE, start.z))) w++;
      const rowFull = (dz: number): boolean => {
        for (let dx = 0; dx < w; dx++)
          if (!cells.has(cellKey(start.x + dx * TILE, start.z + dz * TILE))) return false;
        return true;
      };
      let d = 1;
      while (rowFull(d)) d++;
      for (let dz = 0; dz < d; dz++)
        for (let dx = 0; dx < w; dx++)
          cells.delete(cellKey(start.x + dx * TILE, start.z + dz * TILE));
      out.push({
        ...start,
        x: start.x + ((w - 1) * TILE) / 2,
        z: start.z + ((d - 1) * TILE) / 2,
        w: w * TILE,
        d: d * TILE,
      });
    }
  }
  return out;
}
