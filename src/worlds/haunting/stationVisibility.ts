import { TILE } from '../nav/navTile';
import { doorMiddle, roomAt, type HouseDoor, type HouseSpec } from './house';

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

/**
 * **Wie weit man von oben um die Ecke sieht**, in Metern: Eine offene Tür,
 * deren Mitte näher liegt, zeigt den Raum dahinter.
 */
export const TOP_DOWN_REACH = 6;

/**
 * **Was man von oben sieht: den eigenen Raum und was hinter nahen Türen
 * liegt.**
 *
 * Die Brille fragt, ob eine Türöffnung im Blickfeld liegt
 * (`HauntingWorld.cullRoomArt`) — von oben liegt aber *jede* Tür im Bild, und
 * die Kamera schaut über alle Wände hinweg in die Nachbarräume, samt dem, was
 * darin steht und geht. Von oben zählt deshalb nicht die Kamera, sondern die
 * Figur: Sichtbar ist ihr Raum und, über offene Türen, was innerhalb von
 * `reach` Metern an ihr liegt. Alles andere deckt die Welt zu
 * (`world3d/topDownFog.ts`). `null` heißt wie oben: Die Figur steht in keinem
 * Raum der Station, und es bleibt alles sichtbar.
 */
export function topDownRooms(
  spec: HouseSpec,
  viewer: { x: number; z: number },
  shut: readonly string[],
  reach = TOP_DOWN_REACH,
): Set<string> | null {
  return visibleStationRooms(spec, viewer, shut, (door) => {
    const middle = doorMiddle(door);
    return Math.hypot(middle.x - viewer.x, middle.z - viewer.z) <= reach;
  });
}
