import { TILE } from '../../nav/navTile';
import { APRON, spacesOf, type HouseSpec } from '../house';
import { COMMAND } from '../roomGraph';
import {
  DOOR_WIDTH,
  doorAxis,
  doorCentre,
  rectCentre,
  rectPolygon,
  wallSegments,
} from './geometry';
import { stationLayout } from '../stationLayout';
import type { MapSource } from './mapSource';
import type {
  MapBounds,
  MapFixture,
  MapLight,
  MapRoom,
  MapSegment,
  MapSnapshot,
} from './mapSnapshot';

/**
 * **Vom laufenden Spiel zum Snapshot** — reiner Lesezugriff.
 *
 * Die Räume kommen aus dem Bauplan, denn die 3D-Welt baut ihre Wände aus
 * genau diesen Rechtecken: Die Bounding-Box eines Zimmers *ist* sein
 * Rechteck mal `TILE`. Alles Bewegliche kommt aus `MapSource`.
 */

/** Der Name der Zentrale auf der Karte. */
export const COMMAND_NAME = 'Einsatzzentrale';

/** Wie weit eine Deckenlampe leuchtet, in Metern — ein ganzes Zimmer. */
export const LAMP_RADIUS = 8;

const wallCache = new WeakMap<HouseSpec, MapSegment[]>();

/** Die Wände einer Station, einmal gerechnet und danach geteilt. */
export function wallsOf(spec: HouseSpec): MapSegment[] {
  let walls = wallCache.get(spec);
  if (!walls) {
    walls = [...wallSegments(spec), ...apronWalls(spec)];
    wallCache.set(spec, walls);
  }
  return walls;
}

/** Der Vorplatz: Hülle mit Fenstern, offen nur an der Schleuse. */
function apronWalls(spec: HouseSpec): MapSegment[] {
  const front = spec.doors.find((door) => door.id === spec.frontDoor);
  const x0 = APRON.x * TILE,
    z0 = APRON.z * TILE,
    x1 = (APRON.x + APRON.w) * TILE,
    z1 = (APRON.z + APRON.d) * TILE;
  const segments: MapSegment[] = [
    { a: { x: x0, z: z1 }, b: { x: x1, z: z1 }, roomId: COMMAND, kind: 'window' },
    { a: { x: x0, z: z0 }, b: { x: x0, z: z1 }, roomId: COMMAND, kind: 'window' },
    { a: { x: x1, z: z0 }, b: { x: x1, z: z1 }, roomId: COMMAND, kind: 'window' },
  ];
  // Die Nordwand ist die Glasfront zur Kantine, mit der Schleuse darin.
  if (front && doorAxis(front.dir) === 'x') {
    const at = doorCentre(front);
    segments.push(
      {
        a: { x: x0, z: z0 },
        b: { x: at.x - DOOR_WIDTH / 2, z: z0 },
        roomId: COMMAND,
        kind: 'glass',
      },
      {
        a: { x: at.x + DOOR_WIDTH / 2, z: z0 },
        b: { x: x1, z: z0 },
        roomId: COMMAND,
        kind: 'glass',
      },
    );
  } else
    segments.push({ a: { x: x0, z: z0 }, b: { x: x1, z: z0 }, roomId: COMMAND, kind: 'glass' });
  return segments;
}

export function roomsOf(spec: HouseSpec, lit: readonly string[]): MapRoom[] {
  const rooms: MapRoom[] = spacesOf(spec).map((room) => ({
    id: room.id,
    name: room.name,
    kind: room.kind,
    polygon: rectPolygon(room.rect),
    centre: rectCentre(room.rect),
    circulation: !!room.circulation,
    lit: lit.includes(room.id),
    safe: false,
  }));
  rooms.push({
    id: COMMAND,
    name: COMMAND_NAME,
    polygon: rectPolygon(APRON),
    centre: rectCentre(APRON),
    circulation: false,
    lit: true,
    safe: true,
  });
  return rooms;
}

const fixtureCache = new WeakMap<HouseSpec, MapFixture[]>();

/**
 * **Die Möbel der Station**, wie `stationLayout` sie stellt — einmal je
 * Bauplan gerechnet. Kryokapsel, Tische und Kisten sind auf der Karte reine
 * Deko; Fracht, Schrank und Konsole stehen hier als Klotz *und* in `items`
 * mit ihrem Zustand.
 */
export function fixturesOf(spec: HouseSpec): MapFixture[] {
  let fixtures = fixtureCache.get(spec);
  if (!fixtures) {
    fixtures = stationLayout(spec).map((placement) => ({
      id: placement.id,
      kind: placement.kind,
      ...(placement.markId ? { mark: placement.markId } : {}),
      roomId: placement.roomId,
      at: { x: placement.x, z: placement.z },
      yaw: placement.yaw,
      width: placement.width,
      depth: placement.depth,
    }));
    fixtureCache.set(spec, fixtures);
  }
  return fixtures;
}

/** Die Restzeit einer Sperre, wenn die Quelle eine Uhr führt. */
function holdOf(source: MapSource, id: string): { hold?: { left: number; total: number } } {
  const hold = source.doorHold?.(id);
  return hold ? { hold } : {};
}

export function boundsOf(rooms: readonly MapRoom[]): MapBounds {
  const bounds: MapBounds = { minX: Infinity, minZ: Infinity, maxX: -Infinity, maxZ: -Infinity };
  for (const room of rooms)
    for (const point of room.polygon) {
      bounds.minX = Math.min(bounds.minX, point.x);
      bounds.minZ = Math.min(bounds.minZ, point.z);
      bounds.maxX = Math.max(bounds.maxX, point.x);
      bounds.maxZ = Math.max(bounds.maxZ, point.z);
    }
  if (!Number.isFinite(bounds.minX)) return { minX: 0, minZ: 0, maxX: 0, maxZ: 0 };
  return bounds;
}

export function extractMapSnapshot(source: MapSource, kind: '3d' | 'flat' = '3d'): MapSnapshot {
  const spec = source.spec();
  const state = source.state();
  const rooms = roomsOf(spec, state.lit);
  const lights: MapLight[] = source.lamps().map((lamp) => ({
    id: lamp.id,
    roomId: lamp.id,
    at: { x: lamp.x, z: lamp.z },
    on: state.lit.includes(lamp.id) && lamp.intensity > 0,
    radius: LAMP_RADIUS,
    kind: 'lamp',
    color: lamp.color,
  }));
  const apron = rectCentre(APRON);
  lights.push({
    id: COMMAND,
    roomId: COMMAND,
    at: apron,
    on: true,
    radius: Math.max(APRON.w, APRON.d) * TILE,
    kind: 'command',
  });
  return {
    seed: spec.seed,
    time: state.time,
    source: kind,
    bounds: boundsOf(rooms),
    rooms,
    doors: spec.doors.map((door) => ({
      id: door.id,
      a: door.a,
      b: door.b ?? COMMAND,
      at: doorCentre(door),
      axis: doorAxis(door.dir),
      width: DOOR_WIDTH,
      open: source.doorOpen(door.id),
      locked: state.shut.includes(door.id),
      material: door.material,
      ...holdOf(source, door.id),
    })),
    walls: wallsOf(spec),
    lights: [...lights, ...source.carriedLights()],
    entities: [...source.entities()],
    items: [...source.items()],
    power: true,
    ...(source.round ? { round: source.round() } : {}),
    ...(source.ventLinks ? { ventLinks: source.ventLinks() } : {}),
    fixtures: fixturesOf(spec),
    ...(source.noises ? { noises: source.noises() } : {}),
    // Die Ghost-Marker reisen im Stand mit (`rules/ghosts.ts`) — jede Quelle
    // führt sie, ob 3D-Welt oder 2D-Runde, also braucht es dafür keinen
    // eigenen Getter in `MapSource`.
    ghosts: state.ghosts,
    // Dasselbe für die Blutspur (`rules/blood.ts`): Sie steht im Stand, also
    // reicht der Snapshot sie durch — gezeichnet wird sie in 2D, gerochen in
    // der Routine des Monsters.
    ...(state.blood?.length ? { blood: state.blood } : {}),
  };
}
