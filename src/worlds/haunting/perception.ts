import { DOOR_LOSS, GLASS_LOSS, WALL_LOSS } from './audio/hearing';
import type { NavGraph } from '../nav/navGraph';
import { DIRS, TILE, neighbour, tileKey, type TileKey } from '../nav/navTile';
import type { SignalPoint } from './threat';

export const BOT_FOV = Math.PI * 0.62;
export const MONSTER_FOV = Math.PI * 0.72;
export const BOT_VISION = 16;
export const pointKey = (p: SignalPoint): TileKey =>
  tileKey(Math.floor(p.x / TILE), Math.floor(p.z / TILE));

/** Der Blickwinkel folgt der gezeichneten Figur: vorn ist lokal -Z. */
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

/** Was zwischen zwei Kacheln steht, in Metern Hörweite — nichts kostet nichts. */
function lossOf(wall: ReturnType<NavGraph['wall']>): number {
  if (!wall) return 0;
  if (wall.kind === 'door') return wall.open ? 0 : DOOR_LOSS;
  return wall.kind === 'window' ? GLASS_LOSS : WALL_LOSS;
}

/**
 * **Das akustische Feld** — was von einem Geräusch an welcher Kachel ankommt,
 * geflutet über den Weltgraphen.
 *
 * Schall folgt dem Boden: Wo keine Kachel ist, ist auch keine Kante, und über
 * das Vakuum neben der Station geht nichts. Eine **Wand dämpft, sie schneidet
 * nicht ab** — der Schritt in die Nachbarkachel hinter der Wand kostet
 * zusätzlich `WALL_LOSS`, hinter Glas `GLASS_LOSS`, hinter einem
 * geschlossenen Türblatt `DOOR_LOSS`; offen steht sie umsonst. Die Zahlen
 * stehen in `audio/hearing.ts` und nicht hier: Ein Geräusch, das der Spieler
 * hört und das Monster nicht, ist ein Fehler in einer Datei.
 *
 * Zurück kommen **effektive Meter** je Kachel — Weglänge plus Dämpfung. Was
 * jenseits von `range` liegt, steht gar nicht erst in der Karte.
 */
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
      const total = cost + TILE + lossOf(wall);
      if (total > range || total >= (costs.get(next) ?? Infinity)) continue;
      costs.set(next, total);
      queue.push({ key: next, cost: total });
    }
  }
  return costs;
}
