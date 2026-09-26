import { APRON_INNER, generateHouse, spacesOf } from './house';
import { TILE } from '../nav/navTile';
import { safeRoomSpawn } from './stationLayout';
import {
  FULL_VIEW,
  portalRooms,
  topDownRooms,
  visibleStationRooms,
  type ViewRect,
} from './stationVisibility';

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

describe('von oben', () => {
  const spec = generateHouse(1, 14);
  const named = (name: string): string => spec.rooms.find((room) => room.name === name)!.id;
  const security = spec.rooms.find((room) => room.name === 'Security')!;
  const centre = {
    x: security.rect.x + security.rect.w / 2,
    z: security.rect.z + security.rect.d / 2,
  };

  it('zeigt den eigenen Raum und den Gang vor der nahen Tür — nicht die Räume hinter der Wand', () => {
    const seen = topDownRooms(spec, centre, [])!;
    expect(seen.has(security.id)).toBe(true);
    // Die Querung zum Reactor beginnt hinter der Westtür.
    const hall = spec.doors.find((door) => door.a === security.id || door.b === security.id)!;
    expect(seen.has(hall.a === security.id ? hall.b! : hall.a)).toBe(true);
    // MedBay und Electrical liegen einen Meter neben der Wand, aber ohne Tür.
    expect(seen.has(named('MedBay'))).toBe(false);
    expect(seen.has(named('Electrical'))).toBe(false);
    // Und der Reactor ist zwölf Meter weit weg, hinter dem Ende der Querung.
    expect(seen.has(named('Reactor'))).toBe(false);
  });

  it('sieht durch eine verriegelte Tür nicht hindurch', () => {
    const doors = spec.doors.filter((d) => d.a === security.id || d.b === security.id);
    expect(
      topDownRooms(
        spec,
        centre,
        doors.map((d) => d.id),
      ),
    ).toEqual(new Set([security.id]));
  });
});

describe('durch Türen hindurch (portalRooms)', () => {
  const spec = generateHouse(1, 14);
  const room = spec.rooms[0]!;
  const viewer = safeRoomSpawn(spec, room.id);
  const own = (door: { a: string; b: string | null }): boolean =>
    door.a === room.id || door.b === room.id;
  const neighbours = new Set(
    spec.doors.filter((door) => door.b && own(door)).map((d) => (d.a === room.id ? d.b! : d.a)),
  );

  it('ohne Tür im Bild nur der eigene Raum', () => {
    expect(portalRooms(spec, viewer, [], () => null)).toEqual(new Set([room.id]));
  });

  it('mit jeder Tür im ganzen Bild dasselbe wie die grobe Rechnung', () => {
    expect(portalRooms(spec, viewer, [], () => FULL_VIEW)).toEqual(
      visibleStationRooms(spec, viewer, [], () => true),
    );
  });

  it('sieht nicht durch eine Tür, die außerhalb des Fensters der vorigen liegt', () => {
    const left: ViewRect = { x0: -1, y0: -1, x1: -0.2, y1: 1 };
    const right: ViewRect = { x0: 0.2, y0: -1, x1: 1, y1: 1 };
    const seen = portalRooms(spec, viewer, [], (door) => (own(door) ? left : right))!;
    expect(seen).toEqual(new Set([room.id, ...neighbours]));
    expect(seen.size).toBeLessThan(spacesOf(spec).length);
  });

  it('eine geschlossene Tür bleibt zu', () => {
    const doors = spec.doors.filter(own).map((d) => d.id);
    expect(portalRooms(spec, viewer, doors, () => FULL_VIEW)).toEqual(new Set([room.id]));
  });

  it('aus der Einsatzzentrale: der Eingangsraum durch die Glaswand', () => {
    const entry = spec.rooms.find((one) => one.id === spec.entryRoom)!;
    const apron = { x: (entry.rect.x + entry.rect.w / 2) * TILE, z: (APRON_INNER + 0.5) * TILE };
    expect(portalRooms(spec, apron, [], () => null)).toEqual(new Set([spec.entryRoom]));
  });

  it('draußen bleibt es beim ganzen Modell', () => {
    expect(portalRooms(spec, { x: 1000, z: 1000 }, [], () => null)).toBeNull();
  });
});
