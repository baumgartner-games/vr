import { DIR_S, TILE } from '../nav/navTile';
import { APRON, STATION_BOUNDS, type Rect } from './house';

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

/** Metres: the return point stands in the middle of the command floor. */
export const COMMAND_HOME = { x: 0, z: (APRON.z + 2.5) * TILE } as const;

/** Fünfzehn Meter östlich des Stationsrands — so viel Luft wie vorher (sechs Kacheln). */
const EAST = STATION_BOUNDS.x + STATION_BOUNDS.w + 15;
const NORTH = STATION_BOUNDS.z;

/**
 * Four independent teaching rooms, fifteen metres east of the mission. Five
 * metres separate each neighbouring pair. They belong in the physics/grid
 * plan only during test mode, never in the mission graph. Kacheln zu einem
 * Meter, dieselben Maße wie vorher (5 × 4 Kacheln zu 2,5 m → 12 × 10 m).
 */
export const TRAINING_ROOMS: readonly TrainingRoom[] = [
  { id: 'safe', name: 'Safe und Schutzschrank', x: EAST, z: NORTH, w: 12, d: 10 },
  { id: 'tools', name: 'Ausrüstung und Scanner', x: EAST + 17, z: NORTH, w: 12, d: 10 },
  { id: 'repairs', name: 'Reparaturen und Rätsel', x: EAST, z: NORTH + 15, w: 12, d: 10 },
  { id: 'models', name: 'Modelle, Schotts und Effekte', x: EAST + 17, z: NORTH + 15, w: 20, d: 15 },
];

/** Das Übungsschott mitten in der Modellhalle, wie bisher. */
export const TRAINING_DOOR = {
  id: 'training-door',
  x: EAST + 17 + 15,
  z: NORTH + 15 + 7,
  dir: DIR_S,
} as const;

/** Keep exhibits out of this radius around each trainingSpawn(), in metres. */
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
  return { x: (room.x + room.w / 2) * TILE, y: 0, z: (room.z + room.d) * TILE - 3 };
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
