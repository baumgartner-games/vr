import { TILE } from '../nav/navTile';
import { roomAt, type HouseDoor, type HouseSpec } from './house';

/** Conservative room portals: never hides the current room or looks through a shut door. */
export function visibleStationRooms(
  spec: HouseSpec,
  viewer: { x: number; z: number },
  shut: readonly string[],
  doorInView: (door: HouseDoor) => boolean,
): Set<string> | null {
  const room = roomAt(spec, Math.floor(viewer.x / TILE), Math.floor(viewer.z / TILE));
  // The command deck, external views and labs need the complete model.
  if (!room) return null;
  const visible = new Set([room.id]);
  const queue = [room.id];
  for (let index = 0; index < queue.length; index++) {
    const from = queue[index]!;
    for (const door of spec.doors) {
      if (!door.b || shut.includes(door.id)) continue;
      const next = door.a === from ? door.b : door.b === from ? door.a : null;
      if (!next || visible.has(next) || !doorInView(door)) continue;
      visible.add(next);
      queue.push(next);
    }
  }
  return visible;
}
