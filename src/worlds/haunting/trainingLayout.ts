import { DIR_S, TILE } from '../nav/navTile';
import { APRON, HOUSE, type Rect } from './house';

export type TrainingRoomId = 'safe' | 'tools' | 'repairs' | 'models';

/** Tile coordinates, directly usable with GridPlan.room(). */
export interface TrainingRoom extends Rect {
  id: TrainingRoomId;
  name: string;
}

export interface TrainingBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Metres: the return point stays a full metre inside the command floor. */
export const COMMAND_HOME = { x: 0, z: (APRON.z + 1.6) * TILE } as const;

const EAST = HOUSE.x + HOUSE.w + 6;
const NORTH = HOUSE.z;

/**
 * Four independent teaching rooms, at least six empty tiles east of the
 * mission. Two empty tiles separate each neighbouring pair. They belong in
 * the physics/grid plan only during test mode, never in the mission graph.
 */
export const TRAINING_ROOMS: readonly TrainingRoom[] = [
  { id: 'safe', name: 'Safe und Schutzschrank', x: EAST, z: NORTH, w: 5, d: 4 },
  { id: 'tools', name: 'Ausrüstung und Scanner', x: EAST + 7, z: NORTH, w: 5, d: 4 },
  { id: 'repairs', name: 'Reparaturen und Rätsel', x: EAST, z: NORTH + 6, w: 5, d: 4 },
  { id: 'models', name: 'Modelle, Schotts und Effekte', x: EAST + 7, z: NORTH + 6, w: 8, d: 6 },
];

/** Keep exhibits out of this radius around each trainingSpawn(), in metres. */
export const TRAINING_DOOR = {
  id: 'training-door',
  x: EAST + 13,
  z: NORTH + 9,
  dir: DIR_S,
} as const;

export const TRAINING_SPAWN_RADIUS = 0.8;

/** Metres, with half-open boundaries matching the normal station room lookup. */
export function trainingRoomAt(x: number, z: number): TrainingRoom | null {
  return (
    TRAINING_ROOMS.find(
      (room) =>
        x >= room.x * TILE &&
        x < (room.x + room.w) * TILE &&
        z >= room.z * TILE &&
        z < (room.z + room.d) * TILE,
    ) ?? null
  );
}

/** Metres: approach exhibits from the south, looking north (yaw zero). */
export function trainingSpawn(id: TrainingRoomId): { x: number; y: 0; z: number } {
  const room = roomById(id);
  return { x: (room.x + room.w / 2) * TILE, y: 0, z: (room.z + room.d - 1.25) * TILE };
}

/** Interior floor footprint in metres; wall thickness is deliberately not included. */
export function trainingBounds(id: TrainingRoomId): TrainingBounds {
  const room = roomById(id);
  return {
    minX: room.x * TILE,
    maxX: (room.x + room.w) * TILE,
    minZ: room.z * TILE,
    maxZ: (room.z + room.d) * TILE,
  };
}

function roomById(id: TrainingRoomId): TrainingRoom {
  const room = TRAINING_ROOMS.find((candidate) => candidate.id === id);
  if (!room) throw new RangeError(`Unknown training room: ${id}`);
  return room;
}
