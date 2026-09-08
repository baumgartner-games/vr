import { TILE } from '../nav/navTile';
import { APRON, HOUSE, type Rect } from './house';
import {
  COMMAND_HOME,
  TRAINING_ROOMS,
  TRAINING_SPAWN_RADIUS,
  trainingBounds,
  trainingRoomAt,
  trainingSpawn,
} from './trainingLayout';

function gap(a: Rect, b: Rect): number {
  return Math.max(a.x - b.x - b.w, b.x - a.x - a.w, a.z - b.z - b.d, b.z - a.z - a.d);
}

test('the four teaching rooms have separate full-size floors far outside the mission', () => {
  expect(TRAINING_ROOMS.map((room) => room.id).sort()).toEqual([
    'models',
    'repairs',
    'safe',
    'tools',
  ]);
  for (const room of TRAINING_ROOMS) {
    expect(room.x - (HOUSE.x + HOUSE.w)).toBeGreaterThanOrEqual(6);
    expect(gap(room, HOUSE)).toBeGreaterThanOrEqual(6);
    expect(gap(room, APRON)).toBeGreaterThanOrEqual(6);
    expect(room.w * TILE).toBe(room.id === 'models' ? 20 : 12.5);
    expect(room.d * TILE).toBe(room.id === 'models' ? 15 : 10);
    for (const coordinate of [room.x, room.z, room.w, room.d]) {
      expect(Number.isInteger(coordinate)).toBe(true);
    }
  }
  for (let a = 0; a < TRAINING_ROOMS.length; a++) {
    for (let b = a + 1; b < TRAINING_ROOMS.length; b++) {
      expect(gap(TRAINING_ROOMS[a]!, TRAINING_ROOMS[b]!)).toBeGreaterThanOrEqual(2);
    }
  }
});

test('each spawn and its reserved standing area lie well inside its own physical floor', () => {
  for (const room of TRAINING_ROOMS) {
    const spawn = trainingSpawn(room.id);
    const bounds = trainingBounds(room.id);
    expect(spawn.y).toBe(0);
    expect(trainingRoomAt(spawn.x, spawn.z)?.id).toBe(room.id);
    expect(spawn.x - bounds.minX).toBeGreaterThanOrEqual(1.25 * TILE);
    expect(bounds.maxX - spawn.x).toBeGreaterThanOrEqual(1.25 * TILE);
    expect(spawn.z - bounds.minZ).toBeGreaterThanOrEqual(1.25 * TILE);
    expect(bounds.maxZ - spawn.z).toBeGreaterThanOrEqual(1.25 * TILE);
    for (const dx of [-TRAINING_SPAWN_RADIUS, TRAINING_SPAWN_RADIUS]) {
      for (const dz of [-TRAINING_SPAWN_RADIUS, TRAINING_SPAWN_RADIUS]) {
        expect(trainingRoomAt(spawn.x + dx, spawn.z + dz)?.id).toBe(room.id);
      }
    }
    expect(spawn.z).toBeGreaterThan((bounds.minZ + bounds.maxZ) / 2);
  }
});

test('the command return point stands on the apron with enough capsule clearance', () => {
  expect(COMMAND_HOME.x - APRON.x * TILE).toBeGreaterThanOrEqual(TRAINING_SPAWN_RADIUS);
  expect((APRON.x + APRON.w) * TILE - COMMAND_HOME.x).toBeGreaterThanOrEqual(TRAINING_SPAWN_RADIUS);
  expect(COMMAND_HOME.z - APRON.z * TILE).toBeGreaterThanOrEqual(TRAINING_SPAWN_RADIUS);
  expect((APRON.z + APRON.d) * TILE - COMMAND_HOME.z).toBeGreaterThanOrEqual(TRAINING_SPAWN_RADIUS);
  expect(trainingRoomAt(COMMAND_HOME.x, COMMAND_HOME.z)).toBeNull();
});

test('room lookup uses metres and rejects the empty space between rooms and invalid positions', () => {
  for (const room of TRAINING_ROOMS) {
    const bounds = trainingBounds(room.id);
    expect(trainingRoomAt(bounds.minX, bounds.minZ)?.id).toBe(room.id);
    expect(trainingRoomAt(bounds.maxX, bounds.maxZ)).toBeNull();
    expect(trainingRoomAt(bounds.maxX + TILE / 2, bounds.minZ + TILE)).toBeNull();
  }
  expect(trainingRoomAt(HOUSE.x * TILE, HOUSE.z * TILE)).toBeNull();
  expect(trainingRoomAt(NaN, 0)).toBeNull();
  expect(trainingRoomAt(Infinity, Infinity)).toBeNull();
});
