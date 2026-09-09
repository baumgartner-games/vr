import { findPath } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { TILE, dirX, dirZ, tileKey } from '../nav/navTile';
import {
  APRON,
  generateHouse,
  roomAt,
  roomCentre,
  roomOf,
  spacesOf,
  stationBounds,
  tilesOf,
} from './house';
import { housePlan } from './plan';
import { stationLayout } from './stationLayout';

/** Architecture regressions: the ship must really have transit floor and empty hull cavities. */
describe('separated orbital ship modules', () => {
  test.each([14])('%i mission rooms stay connected through independent galleries', (count) => {
    for (const seed of [1, 42, 991]) {
      const spec = generateHouse(seed, count);
      const spaces = spacesOf(spec);
      const plan = housePlan(spec);
      expect(spec.rooms).toHaveLength(count);
      expect(spec.passages!.length).toBeGreaterThanOrEqual(3);
      expect(roomOf(spec, spec.entryRoom)!.name).toBe('Andockkorridor');
      expect(roomOf(spec, spec.entryRoom)!.circulation).toBe(true);
      for (const room of spec.rooms) {
        expect(room.rect.w).toBeGreaterThanOrEqual(4);
        expect(room.rect.d).toBeGreaterThanOrEqual(4);
        const doors = spec.doors.filter((d) => d.a === room.id || d.b === room.id);
        expect(doors.length).toBeGreaterThanOrEqual(1);
        for (const door of doors) {
          const other = roomOf(spec, door.a === room.id ? door.b! : door.a)!;
          expect(other.circulation).toBe(true);
        }
        const centre = roomCentre(room);
        const start = roomCentre(roomOf(spec, spec.entryRoom)!);
        expect(
          findPath(plan.graph, tileKey(start.x, start.z), tileKey(centre.x, centre.z), {
            profile: HUMAN_PROFILE,
          }).complete,
        ).toBe(true);
      }
      const holes = tilesOf(stationBounds(spec)).filter((tile) => !roomAt(spec, tile.x, tile.z));
      expect(holes.length).toBeGreaterThan(0);
      for (const tile of holes) expect(plan.graph.has(tileKey(tile.x, tile.z))).toBe(false);
      for (const room of spaces)
        for (const tile of tilesOf(room.rect)) {
          expect(
            spaces.filter(
              (candidate) =>
                tile.x >= candidate.rect.x &&
                tile.x < candidate.rect.x + candidate.rect.w &&
                tile.z >= candidate.rect.z &&
                tile.z < candidate.rect.z + candidate.rect.d,
            ),
          ).toHaveLength(1);
          expect(plan.graph.has(tileKey(tile.x, tile.z))).toBe(true);
        }
      for (const corridor of spec.passages!)
        expect(stationLayout(spec).filter((item) => item.roomId === corridor.id)).toHaveLength(0);
      const entrance = spec.doors.find((d) => d.id === spec.frontDoor)!;
      expect(entrance.z + dirZ(entrance.dir)).toBe(APRON.z);
      expect(roomAt(spec, entrance.x, entrance.z)!.circulation).toBe(true);
      for (const window of spec.windows) {
        expect(roomAt(spec, window.x + dirX(window.dir), window.z + dirZ(window.dir))).toBeNull();
        expect(plan.graph.wall(tileKey(window.x, window.z), window.dir)?.kind).toBe('window');
      }
      const area = spaces.reduce((sum, room) => sum + room.rect.w * room.rect.d, 0);
      expect([...plan.graph.tileKeys()]).toHaveLength(area + APRON.w * APRON.d);
      expect((stationBounds(spec).x + stationBounds(spec).w) * TILE).toBe(50);
    }
  });
});

test('Skeld rooms and doors retain their identity and position across seeds and legacy room counts', () => {
  const geometry = (seed: number, count: number) => {
    const spec = generateHouse(seed, count);
    return {
      rooms: spec.rooms.map(({ id, name, rect, kind, signature }) => ({
        id,
        name,
        rect,
        kind,
        signature,
      })),
      doors: spec.doors,
      passages: spec.passages,
    };
  };
  const fixed = geometry(1, 14);
  expect(fixed.rooms.map((r) => r.name)).toEqual([
    'Cafeteria',
    'Upper Engine',
    'Reactor',
    'Security',
    'MedBay',
    'Lower Engine',
    'Electrical',
    'Storage',
    'Weapons',
    'O2',
    'Navigation',
    'Admin',
    'Shields',
    'Communications',
  ]);
  for (const seed of [2, 42, 991])
    for (const count of [6, 8, 10, 12, 14]) expect(geometry(seed, count)).toEqual(fixed);
});
