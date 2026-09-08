import { doorParts } from '../editor/levelBuild';
import { DIR_N, DIR_S, TILE, dirX, dirZ, tileKey, type Dir } from '../nav/navTile';
import type { NavGraph } from '../nav/navGraph';
import type { GridPlan } from './gridPlan';
import type { PlanSolid } from './solids';

/** A sliding door changes one blocker and two graph entries, never the station architecture. */
export function changeSlidingDoor(
  plan: GridPlan,
  nav: NavGraph | null,
  at: { x: number; z: number; dir: Dir; level?: number },
  open: boolean,
  removeLeaf: (id: string) => void,
  addLeaf: (solid: PlanSolid) => void,
): boolean {
  const level = at.level ?? 0;
  const key = tileKey(at.x, at.z, level);
  const facts = plan.graph.wall(key, at.dir);
  if (!facts || facts.kind !== 'door' || facts.open === open) return false;
  plan.graph.setWall(key, at.dir, { ...facts, open });
  nav?.setWall(key, at.dir, { ...facts, open });
  removeLeaf(facts.id);
  if (!open) {
    const x = (at.x + 0.5 + dirX(at.dir) * 0.5) * TILE;
    const z = (at.z + 0.5 + dirZ(at.dir) * 0.5) * TILE;
    const leaf = doorParts(
      x,
      plan.graph.levelY(level),
      z,
      at.dir === DIR_N || at.dir === DIR_S,
      false,
      facts.id,
    ).find((part) => part.door === facts.id)!;
    addLeaf(leaf);
  }
  return true;
}
