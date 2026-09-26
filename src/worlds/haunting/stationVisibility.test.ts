import { APRON_INNER, generateHouse, isPassage, spacesOf, type HouseDoor } from './house';
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

  const own = (door: HouseDoor): boolean => door.a === security.id || door.b === security.id;
  const hallDoor = spec.doors.find((door) => own(door) && door.b)!;
  const hall = hallDoor.a === security.id ? hallDoor.b! : hallDoor.a;
  /** Der ganze Gang: alle Stücke, die über Durchgänge am ersten hängen. */
  const corridor = (() => {
    const out = new Set([hall]);
    for (let grew = true; grew;) {
      grew = false;
      for (const door of spec.doors) {
        if (!isPassage(door) || !door.b) continue;
        for (const [from, to] of [
          [door.a, door.b],
          [door.b, door.a],
        ] as const)
          if (out.has(from) && !out.has(to)) {
            out.add(to);
            grew = true;
          }
      }
    }
    return out;
  })();

  it('bei geschlossenen Türen nur den eigenen Raum', () => {
    expect(topDownRooms(spec, centre, [], () => false)).toEqual(new Set([security.id]));
  });

  it('hinter der offenen Tür den ganzen Nachbarraum — den Gang mit allen Stücken', () => {
    const seen = topDownRooms(spec, centre, [], (door) => door.id === hallDoor.id)!;
    expect(corridor.size).toBeGreaterThan(1);
    expect(seen).toEqual(new Set([security.id, ...corridor]));
    // MedBay und Electrical liegen einen Meter neben der Wand, aber ohne Tür.
    expect(seen.has(named('MedBay'))).toBe(false);
    expect(seen.has(named('Electrical'))).toBe(false);
  });

  it('nicht weiter als bis zum Nachbarn, auch wenn dessen Türen offen stehen', () => {
    const seen = topDownRooms(spec, centre, [], () => true)!;
    const beyond = spec.doors
      .filter(
        (door) => !isPassage(door) && door.b && (corridor.has(door.a) || corridor.has(door.b)),
      )
      .flatMap((door) => [door.a, door.b!])
      .filter((id) => id !== security.id && !corridor.has(id));
    expect(beyond.length).toBeGreaterThan(0);
    for (const id of beyond) {
      const direct = spec.doors.some(
        (door) => own(door) && (door.a === id || door.b === id) && !isPassage(door),
      );
      expect(seen.has(id)).toBe(direct);
    }
  });

  it('sieht durch eine verriegelte Tür nicht hindurch, auch wenn das Blatt offen ist', () => {
    const doors = spec.doors.filter(own);
    expect(
      topDownRooms(
        spec,
        centre,
        doors.map((d) => d.id),
        () => true,
      ),
    ).toEqual(new Set([security.id]));
  });

  it('aus einem Gangstück sieht man den ganzen Gang', () => {
    const piece = [...corridor].pop()!;
    const room = spacesOf(spec).find((space) => space.id === piece)!;
    const tile = room.shape ? [...room.shape.keys()][0]!.split(',').map(Number) : null;
    const at = tile
      ? { x: tile[0]! + 0.5, z: tile[1]! + 0.5 }
      : { x: room.rect.x + room.rect.w / 2, z: room.rect.z + room.rect.d / 2 };
    const seen = topDownRooms(spec, at, [], () => false)!;
    for (const id of corridor) expect(seen.has(id)).toBe(true);
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
