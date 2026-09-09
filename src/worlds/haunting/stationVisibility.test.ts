import { generateHouse, spacesOf } from './house';
import { safeRoomSpawn } from './stationLayout';
import { visibleStationRooms } from './stationVisibility';

describe('room visibility', () => {
  const spec = generateHouse(193, 8);
  const room = spec.rooms[0]!;
  const viewer = safeRoomSpawn(spec, room.id);

  it('keeps the occupied room even when no doorway is in view', () => {
    expect(visibleStationRooms(spec, viewer, [], () => false)).toEqual(new Set([room.id]));
  });

  it('can retain every connected room without incorrectly hiding an open sightline', () => {
    expect(visibleStationRooms(spec, viewer, [], () => true)).toEqual(
      new Set(spacesOf(spec).map((room) => room.id)),
    );
  });

  it('does not render rooms behind closed doors', () => {
    const doors = spec.doors.filter((d) => d.a === room.id || d.b === room.id).map((d) => d.id);
    expect(visibleStationRooms(spec, viewer, doors, () => true)).toEqual(new Set([room.id]));
  });

  it('uses the complete station from an external or command view', () => {
    expect(visibleStationRooms(spec, { x: 1000, z: 1000 }, [], () => false)).toBeNull();
  });
});
