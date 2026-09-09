import type { NavGraph } from '../nav/navGraph';
import { DIRS, TILE, neighbour, tileKey, type TileKey } from '../nav/navTile';
import type { SignalPoint } from './threat';

export const BOT_FOV = Math.PI * 0.62;
export const MONSTER_FOV = Math.PI * 0.72;
export const BOT_VISION = 16;
export const pointKey = (p: SignalPoint): TileKey =>
  tileKey(Math.floor(p.x / TILE), Math.floor(p.z / TILE));

/** Yaw follows the rendered actor: forward is local -Z. */
export function inView(
  from: SignalPoint,
  yaw: number,
  to: SignalPoint,
  range: number,
  fov: number,
): boolean {
  const dx = to.x - from.x,
    dz = to.z - from.z;
  const distance = Math.hypot(dx, dz);
  return (
    distance <= range &&
    (distance < 0.01 || (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) / distance >= Math.cos(fov / 2))
  );
}

/** Sound follows occupied floor cells. Shared walls attenuate; vacuum has no edge. */
export function acousticField(
  graph: NavGraph,
  source: SignalPoint,
  range: number,
): Map<TileKey, number> {
  const start = pointKey(source);
  const costs = new Map<TileKey, number>();
  if (!graph.has(start)) return costs;
  const queue = [{ key: start, cost: 0 }];
  costs.set(start, 0);
  while (queue.length) {
    queue.sort((a, b) => b.cost - a.cost);
    const { key, cost } = queue.pop()!;
    if (cost !== costs.get(key)) continue;
    for (const dir of DIRS) {
      const next = neighbour(key, dir);
      if (!graph.has(next)) continue;
      const wall = graph.wall(key, dir);
      const loss = !wall || (wall.kind === 'door' && wall.open) ? 0 : wall.kind === 'door' ? 4 : 9;
      const total = cost + TILE + loss;
      if (total > range || total >= (costs.get(next) ?? Infinity)) continue;
      costs.set(next, total);
      queue.push({ key: next, cost: total });
    }
  }
  return costs;
}
