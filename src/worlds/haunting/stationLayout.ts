import { PLAN_DOOR_W, PLAN_WALL_T } from '../editor/levelPlan';
import { TILE, dirX, dirZ } from '../nav/navTile';
import { roomOf, spacesOf, type HouseRoom, type HouseSpec, type MarkId } from './house';
import {
  CARGO_SIZE,
  CONSOLE_SIZE,
  FIXTURE_CATALOG,
  LOCKER_SIZE,
  type FixtureSize,
} from './fixtureDimensions';
import { repairsFor } from './mission';
import { CARGO_PER_ROOM, cargoCounts } from './rules/cargo';
import { STATION_VENTS } from './vents/ventNet.data';
import { APPROACH_DEPTH, FLAP_WIDTH, flapApproach, flapWall } from './vents/ventPlacement';

export interface FloorPoint {
  readonly x: number;
  readonly z: number;
}
export interface FloorBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}
export interface StationPlacement extends FixtureSize {
  readonly id: string;
  readonly roomId: string;
  readonly kind: 'fixture' | 'cargo' | 'locker' | 'console';
  readonly markId?: MarkId;
  readonly repairId?: string;
  readonly x: number;
  readonly z: number;
  /** Rotation around Y; width/depth are LOCAL dimensions. Local +Z faces the approach. */
  readonly yaw: number;
  /** World-aligned extent including handles and closed doors. */
  readonly bounds: FloorBounds;
  readonly approach: FloorPoint;
}

export const STATION_PLAYER_RADIUS = 0.45;
export const STATION_WALL_CLEARANCE = 0.22;
const WALL_INSET = PLAN_WALL_T / 2 + STATION_WALL_CLEARANCE;
const MODULE_GAP = 0.12;
const APPROACH_GAP = STATION_PLAYER_RADIUS + 0.13;
/**
 * **Die Gasse zu einem Bedienplatz** — breiter als der Spieler selbst.
 *
 * Der Aufschlag auf den Radius ist der Grund für diese Zeile: Die Wegsuche
 * rastert in Vierteldezimetern und muss zusätzlich um Ecken kommen. Eine
 * Gasse, durch die der Spielerzylinder gerade eben noch passt, war schon der
 * Frachtschrank, vor dem der Techniker eine ganze Runde lang „Weg blockiert"
 * meldete: Zwischen zwei Modulen blieben acht Zentimeter, und acht Zentimeter
 * sind auf dem Papier ein Weg und im Raster keiner.
 */
const LANE = STATION_PLAYER_RADIUS + 0.13;
const cache = new WeakMap<HouseSpec, readonly StationPlacement[]>();

export function roomBounds(room: HouseRoom): FloorBounds {
  return {
    minX: room.rect.x * TILE,
    maxX: (room.rect.x + room.rect.w) * TILE,
    minZ: room.rect.z * TILE,
    maxZ: (room.rect.z + room.rect.d) * TILE,
  };
}

function roomMiddle(room: HouseRoom): FloorPoint {
  const b = roomBounds(room);
  return { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 };
}

/** Both incident rooms independently reserve the entire doorway and a deep landing. */
export function doorClearances(spec: HouseSpec, roomId: string): readonly FloorBounds[] {
  const width = PLAN_DOOR_W / 2 + STATION_PLAYER_RADIUS;
  const depth = 1.15;
  return spec.doors
    .filter((d) => d.a === roomId || d.b === roomId)
    .map((d) => {
      const x = (d.x + 0.5 + dirX(d.dir) * 0.5) * TILE;
      const z = (d.z + 0.5 + dirZ(d.dir) * 0.5) * TILE;
      const sign = d.a === roomId ? -1 : 1;
      const nx = dirX(d.dir) * sign,
        nz = dirZ(d.dir) * sign;
      return nx
        ? {
            minX: Math.min(x, x + nx * depth),
            maxX: Math.max(x, x + nx * depth),
            minZ: z - width,
            maxZ: z + width,
          }
        : {
            minX: x - width,
            maxX: x + width,
            minZ: Math.min(z, z + nz * depth),
            maxZ: Math.max(z, z + nz * depth),
          };
    });
}

/** Panoramic ports remain visible instead of disappearing behind a tall cabinet. */
function windowClearances(spec: HouseSpec, roomId: string): FloorBounds[] {
  return spec.windows
    .filter((window) => window.roomId === roomId)
    .map((window) => {
      const dx = dirX(window.dir),
        dz = dirZ(window.dir);
      const x = (window.x + 0.5 + dx * 0.5) * TILE;
      const z = (window.z + 0.5 + dz * 0.5) * TILE;
      return dx
        ? {
            minX: Math.min(x, x - dx * 0.95),
            maxX: Math.max(x, x - dx * 0.95),
            minZ: z - 0.88,
            maxZ: z + 0.88,
          }
        : {
            minX: x - 0.88,
            maxX: x + 0.88,
            minZ: Math.min(z, z - dz * 0.95),
            maxZ: Math.max(z, z - dz * 0.95),
          };
    });
}

/** Closed modules never occupy the walking capsule from a doorway to the room centre. */
export function roomDoorRoutes(spec: HouseSpec, room: HouseRoom): readonly FloorPoint[] {
  return spec.doors
    .filter((d) => d.a === room.id || d.b === room.id)
    .map((d) => ({
      x: (d.x + 0.5 + dirX(d.dir) * 0.5) * TILE,
      z: (d.z + 0.5 + dirZ(d.dir) * 0.5) * TILE,
    }));
}

/**
 * **An jeder gemeinsamen Innenwand bleibt ein Streifen frei** — ein Erbe
 * der alten Wandschächte (`mission.ventPairs`), das das Layout weiter
 * braucht: Diese Freiräume haben über hundert Seeds mitentschieden, wo
 * Regale, Tanks und Konsolen stehen, und darauf sind Wege (`stationNavigation`)
 * und die Gewichte der Bots (`botTraining`, 800 Runden) gemessen. Wer sie
 * streicht, baut jedes Zimmer um. Die Gitter oben an der Wand gibt es nicht
 * mehr; die Regel „vor einer gemeinsamen Wand steht nichts" ist geblieben.
 */
interface SharedWall {
  a: string;
  b: string;
  x: number;
  z: number;
  dir: number;
}
const sharedWallsCache = new WeakMap<HouseSpec, SharedWall[]>();
function sharedWalls(spec: HouseSpec): SharedWall[] {
  const cached = sharedWallsCache.get(spec);
  if (cached) return cached;
  const walls: SharedWall[] = [];
  const spaces = spacesOf(spec);
  for (let i = 0; i < spaces.length; i++)
    for (let j = i + 1; j < spaces.length; j++) {
      const a = spaces[i]!;
      const b = spaces[j]!;
      for (const [one, two] of [
        [a, b],
        [b, a],
      ] as const) {
        const r = one.rect;
        const s = two.rect;
        if (r.x + r.w === s.x && Math.max(r.z, s.z) < Math.min(r.z + r.d, s.z + s.d))
          walls.push({ a: one.id, b: two.id, x: s.x, z: Math.max(r.z, s.z) + 0.5, dir: 1 });
        if (r.z + r.d === s.z && Math.max(r.x, s.x) < Math.min(r.x + r.w, s.x + s.w))
          walls.push({ a: one.id, b: two.id, x: Math.max(r.x, s.x) + 0.5, z: s.z, dir: 2 });
      }
    }
  sharedWallsCache.set(spec, walls);
  return walls;
}

function sharedWallLandings(spec: HouseSpec, roomId: string): readonly FloorPoint[] {
  return sharedWalls(spec)
    .filter((v) => v.a === roomId || v.b === roomId)
    .map((v) => {
      const sign = v.a === roomId ? -1 : 1;
      return {
        x: v.x * TILE + (v.dir === 1 ? (sign * TILE) / 2 : 0),
        z: v.z * TILE + (v.dir === 2 ? (sign * TILE) / 2 : 0),
      };
    });
}

function sharedWallClearances(spec: HouseSpec, roomId: string): FloorBounds[] {
  return sharedWalls(spec)
    .filter((v) => v.a === roomId || v.b === roomId)
    .map((v) => {
      const sign = v.a === roomId ? -1 : 1,
        x = v.x * TILE,
        z = v.z * TILE;
      return v.dir === 1
        ? {
            minX: Math.min(x, x + sign * 1.8),
            maxX: Math.max(x, x + sign * 1.8),
            minZ: z - 0.85,
            maxZ: z + 0.85,
          }
        : {
            minX: x - 0.85,
            maxX: x + 0.85,
            minZ: Math.min(z, z + sign * 1.8),
            maxZ: Math.max(z, z + sign * 1.8),
          };
    });
}

/**
 * Die Standplätze vor den Lüftungsklappen des Raums (`vents/ventNet.data.ts`):
 * Von dort steigt das Monster ein, dort kommt es heraus — die Gasse zur
 * Raummitte bleibt frei wie die einer Tür. Das Netz ist Daten und hängt
 * nicht am Seed; deshalb braucht es hier keinen Bauplan.
 */
export function ventApproaches(roomId: string): readonly FloorPoint[] {
  return STATION_VENTS.flaps.filter((flap) => flap.roomId === roomId).map(flapApproach);
}

/**
 * Vor einer Klappe steht nichts: so tief wie der Standplatz plus der
 * Spielerhalbmesser, und je einen halben Meter neben die Klappe. Knapp
 * gehalten, damit die Regel möglichst wenige Zimmer umbaut (siehe oben).
 */
function ventClearances(roomId: string): FloorBounds[] {
  const depth = APPROACH_DEPTH + STATION_PLAYER_RADIUS + 0.05;
  const half = FLAP_WIDTH / 2 + 0.1;
  return STATION_VENTS.flaps
    .filter((flap) => flap.roomId === roomId)
    .map((flap) => {
      const wall = flapWall(flap);
      const nx = dirX(flap.dir),
        nz = dirZ(flap.dir);
      return nx !== 0
        ? {
            minX: Math.min(wall.x, wall.x - nx * depth),
            maxX: Math.max(wall.x, wall.x - nx * depth),
            minZ: wall.z - half,
            maxZ: wall.z + half,
          }
        : {
            minX: wall.x - half,
            maxX: wall.x + half,
            minZ: Math.min(wall.z, wall.z - nz * depth),
            maxZ: Math.max(wall.z, wall.z - nz * depth),
          };
    });
}

export function footprintsOverlap(a: FloorBounds, b: FloorBounds, gap = 0): boolean {
  return (
    a.minX < b.maxX + gap - 1e-7 &&
    a.maxX > b.minX - gap + 1e-7 &&
    a.minZ < b.maxZ + gap - 1e-7 &&
    a.maxZ > b.minZ - gap + 1e-7
  );
}

/** Conservative swept player capsule: slab test against an expanded footprint. */
export function routeBlocked(
  a: FloorPoint,
  b: FloorPoint,
  box: FloorBounds,
  radius = STATION_PLAYER_RADIUS,
): boolean {
  let enter = 0,
    leave = 1;
  for (const [from, to, min, max] of [
    [a.x, b.x, box.minX - radius, box.maxX + radius],
    [a.z, b.z, box.minZ - radius, box.maxZ + radius],
  ]) {
    const delta = to! - from!;
    if (Math.abs(delta) < 1e-8) {
      if (from! < min! || from! > max!) return false;
    } else {
      const t0 = (min! - from!) / delta,
        t1 = (max! - from!) / delta;
      enter = Math.max(enter, Math.min(t0, t1));
      leave = Math.min(leave, Math.max(t0, t1));
      if (enter > leave + 1e-7) return false;
    }
  }
  return true;
}

type Request = Pick<StationPlacement, 'id' | 'roomId' | 'kind' | 'markId' | 'repairId'> &
  FixtureSize;

function wallCandidates(room: HouseRoom, request: Request): StationPlacement[] {
  const b = roomBounds(room),
    centre = roomMiddle(room),
    candidates: StationPlacement[] = [];
  // North, east, south, west: rear toward hull, controls toward the room.
  for (const side of [0, 1, 2, 3]) {
    const horizontal = side % 2 === 0;
    const min = (horizontal ? b.minX : b.minZ) + WALL_INSET + request.width / 2;
    const max = (horizontal ? b.maxX : b.maxZ) - WALL_INSET - request.width / 2;
    const positions = [min, max, (min + max) / 2];
    for (let offset = min + 0.18; offset < max; offset += 0.18) positions.push(offset);
    for (const along of positions) {
      const nx = side === 1 ? -1 : side === 3 ? 1 : 0;
      const nz = side === 0 ? 1 : side === 2 ? -1 : 0;
      const x = horizontal
        ? along
        : (side === 1 ? b.maxX : b.minX) + nx * (WALL_INSET + request.depth / 2);
      const z = horizontal
        ? (side === 0 ? b.minZ : b.maxZ) + nz * (WALL_INSET + request.depth / 2)
        : along;
      const halfX = (horizontal ? request.width : request.depth) / 2;
      const halfZ = (horizontal ? request.depth : request.width) / 2;
      const approach = {
        x: x + nx * (request.depth / 2 + APPROACH_GAP),
        z: z + nz * (request.depth / 2 + APPROACH_GAP),
      };
      if (
        approach.x < b.minX + PLAN_WALL_T / 2 + STATION_PLAYER_RADIUS ||
        approach.x > b.maxX - PLAN_WALL_T / 2 - STATION_PLAYER_RADIUS ||
        approach.z < b.minZ + PLAN_WALL_T / 2 + STATION_PLAYER_RADIUS ||
        approach.z > b.maxZ - PLAN_WALL_T / 2 - STATION_PLAYER_RADIUS
      )
        continue;
      candidates.push({
        ...request,
        x,
        z,
        yaw: side === 0 ? 0 : side === 1 ? -Math.PI / 2 : side === 2 ? Math.PI : Math.PI / 2,
        bounds: { minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ },
        approach,
      });
    }
  }
  // Prefer corners: doors and circulation usually use the middle of walls.
  return candidates.sort(
    (a, b) =>
      (b.x - centre.x) ** 2 +
      (b.z - centre.z) ** 2 -
      ((a.x - centre.x) ** 2 + (a.z - centre.z) ** 2),
  );
}

/** A small number of functional islands may occupy the otherwise empty quadrants. */
function islandCandidates(room: HouseRoom, request: Request): StationPlacement[] {
  const b = roomBounds(room),
    centre = roomMiddle(room);
  const candidates: StationPlacement[] = [];
  for (const fx of [0.2, 0.3, 0.4, 0.6, 0.7, 0.8])
    for (const fz of [0.2, 0.3, 0.4, 0.6, 0.7, 0.8]) {
      const x = b.minX + (b.maxX - b.minX) * fx;
      const z = b.minZ + (b.maxZ - b.minZ) * fz;
      const dx = centre.x - x,
        dz = centre.z - z;
      const yaw =
        Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) : dz > 0 ? 0 : Math.PI;
      const rotated = Math.abs(Math.sin(yaw)) > 0.5;
      const halfX = (rotated ? request.depth : request.width) / 2;
      const halfZ = (rotated ? request.width : request.depth) / 2;
      const bounds = { minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ };
      if (
        bounds.minX < b.minX + WALL_INSET ||
        bounds.maxX > b.maxX - WALL_INSET ||
        bounds.minZ < b.minZ + WALL_INSET ||
        bounds.maxZ > b.maxZ - WALL_INSET
      )
        continue;
      candidates.push({
        ...request,
        x,
        z,
        yaw,
        bounds,
        approach: {
          x: x + Math.sin(yaw) * (request.depth / 2 + APPROACH_GAP),
          z: z + Math.cos(yaw) * (request.depth / 2 + APPROACH_GAP),
        },
      });
    }
  return candidates;
}

/**
 * **Was außer den Pflichtmodulen noch im Raum steht.**
 *
 * Die Liste ist ein Wunsch und keine Zusage: Was nicht mehr sicher passt,
 * fällt weg (`packRoom`). Deshalb steht das Wichtigste vorn.
 *
 * **Die Kantine hat drei Tische, eine Ausgabe und eine Wasseraufbereitung.**
 * Sie war der größte Raum der Station und der leerste — zwei Möbel auf
 * zwanzig mal siebzehn Metern, und ein Monster, das hindurchläuft, hat nichts,
 * hinter dem es verschwinden könnte. **Und in fast jedem anderen Raum steht
 * jetzt etwas in der Mitte**: ein Tisch, eine Werkbank, eine Kiste. Ein Raum
 * mit lauter Möbeln an den Wänden ist eine Turnhalle; erst die Insel in der
 * Mitte macht daraus einen Ort, um den man herumlaufen und hinter dem man
 * stehen bleiben kann.
 */
function roomDressing(room: HouseRoom): MarkId[] {
  switch (room.kind) {
    case 'bad':
      return ['bett', 'spuele', 'klavier', room.signature];
    case 'kueche':
      return ['esstisch', 'esstisch', 'ausgabe', 'esstisch', 'spuele', 'standuhr'];
    case 'bibliothek':
      return ['esstisch', 'buecher', 'klavier', 'sessel'];
    case 'schlafzimmer':
      return ['esstisch', 'bett', 'sessel', 'kiste'];
    case 'kammer':
      return ['kiste', 'esstisch', 'standuhr', 'kiste'];
    case 'werkstatt':
      return ['werkbank', 'standuhr', 'buecher', 'kiste'];
    case 'wohnzimmer':
      return ['werkbank', 'standuhr', 'klavier'];
    case 'musikzimmer':
      return ['esstisch', 'buecher', 'sessel', 'klavier'];
    case 'kinderzimmer':
      return ['bett', 'spuele', 'buecher', 'kiste'];
    case 'esszimmer':
      return ['esstisch', 'esstisch', 'spuele', 'standuhr'];
  }
}

/**
 * @param requests Pflichtmodule — passt eines nicht, ist die Stellung ungültig.
 * @param spares Module, die vor der Deko drankommen, aber wie sie wegfallen
 *   dürfen: die dritte Kiste eines Raums. Eine Kiste ist kein Grund, einen
 *   Grundriss für unbaubar zu erklären.
 */
function packRoom(
  spec: HouseSpec,
  room: HouseRoom,
  requests: readonly Request[],
  spares: readonly Request[] = [],
): StationPlacement[] {
  const centre = roomMiddle(room),
    clearances = [
      ...doorClearances(spec, room.id),
      ...sharedWallClearances(spec, room.id),
      ...ventClearances(room.id),
      ...(spec.passages ? windowClearances(spec, room.id) : []),
    ],
    routes = [
      ...roomDoorRoutes(spec, room),
      ...sharedWallLandings(spec, room.id),
      ...ventApproaches(room.id),
    ];
  const candidates = requests.map((request) => ({
    request,
    positions: wallCandidates(room, request).filter(
      (p) =>
        !clearances.some((clear) => footprintsOverlap(p.bounds, clear)) &&
        !routes.some((door) => routeBlocked(door, centre, p.bounds)) &&
        !routeBlocked(centre, centre, p.bounds, 0.7),
    ),
  }));
  candidates.sort((a, b) => a.positions.length - b.positions.length);
  const placed: StationPlacement[] = [];
  function place(index: number): boolean {
    if (index === candidates.length) return true;
    for (const p of candidates[index]!.positions) {
      if (
        placed.some(
          (other) =>
            footprintsOverlap(p.bounds, other.bounds, MODULE_GAP) ||
            routeBlocked(centre, p.approach, other.bounds, LANE) ||
            routeBlocked(centre, other.approach, p.bounds, LANE),
        )
      )
        continue;
      placed.push(p);
      if (place(index + 1)) return true;
      placed.pop();
    }
    return false;
  }
  if (!place(0))
    throw new Error(`No safe station furniture layout: seed ${spec.seed}, room ${room.id}`);
  // Secondary room dressing is optional. It may never displace a required control,
  // reduce the player's access, or make a previously safe navigation route narrower.
  const extras = spec.passages
    ? roomDressing(room)
    : room.marks.filter((mark) => mark.id !== room.signature).map((mark) => mark.id);
  const optional: Request[] = [
    ...spares,
    ...extras.map((markId, index) => ({
      id: `fixture-${room.id}-extra-${index}`,
      roomId: room.id,
      kind: 'fixture' as const,
      markId,
      ...FIXTURE_CATALOG[markId],
    })),
  ];
  optional.forEach((request) => {
    const markId = request.markId;
    const island =
      spec.passages && !!markId && ['bett', 'esstisch', 'werkbank', 'kiste'].includes(markId);
    const candidate = [
      ...(island ? islandCandidates(room, request) : []),
      ...wallCandidates(room, request),
    ].find(
      (p) =>
        !clearances.some((clear) => footprintsOverlap(p.bounds, clear)) &&
        !routes.some((door) => routeBlocked(door, centre, p.bounds)) &&
        !routeBlocked(centre, centre, p.bounds, 0.7) &&
        !placed.some(
          (other) =>
            footprintsOverlap(p.bounds, other.bounds, MODULE_GAP) ||
            routeBlocked(centre, p.approach, other.bounds, LANE) ||
            routeBlocked(centre, other.approach, p.bounds, LANE),
        ),
    );
    if (candidate) placed.push(candidate);
  });
  return placed;
}

/** Shared deterministic geometry for art, interaction, colliders and teleports. */
export function stationLayout(spec: HouseSpec): readonly StationPlacement[] {
  const known = cache.get(spec);
  if (known) return known;
  const repairs = repairsFor(spec),
    counts = cargoCounts(spec),
    placements: StationPlacement[] = [];
  for (const room of spec.rooms) {
    // **Zwei Kisten je Raum sind Pflicht, die dritte ist ein Wunsch.** Suchen
    // soll sich lohnen, und dafür braucht es mehr Kisten als Inhalte — aber
    // ein Raum, dessen Grundriss nur für zwei reicht, ist kein Fehler im Haus.
    const cargo = (n: number): Request => ({
      id: `cargo-${room.id}-${n}`,
      roomId: room.id,
      kind: 'cargo',
      ...CARGO_SIZE,
    });
    const wanted = counts.get(room.id) ?? CARGO_PER_ROOM[0];
    const requests: Request[] = [
      {
        id: `fixture-${room.id}`,
        roomId: room.id,
        kind: 'fixture',
        markId: room.signature,
        ...FIXTURE_CATALOG[room.signature],
      },
      ...Array.from({ length: CARGO_PER_ROOM[0] }, (_, i) => cargo(i + 1)),
      { id: `locker-${room.id}`, roomId: room.id, kind: 'locker', ...LOCKER_SIZE },
    ];
    const spares = Array.from({ length: Math.max(0, wanted - CARGO_PER_ROOM[0]) }, (_, i) =>
      cargo(CARGO_PER_ROOM[0] + i + 1),
    );
    const repair = repairs.find((r) => r.roomId === room.id);
    if (repair)
      requests.push({
        id: `console-${repair.id}`,
        roomId: room.id,
        kind: 'console',
        repairId: repair.id,
        ...CONSOLE_SIZE,
      });
    placements.push(...packRoom(spec, room, requests, spares));
  }
  cache.set(spec, placements);
  return placements;
}

/** The continuous room centre is reserved before modules are placed, even in 2×2 rooms. */
export function safeRoomSpawn(spec: HouseSpec, roomId: string): FloorPoint {
  const room = roomOf(spec, roomId);
  if (!room) throw new Error(`Unknown station room: ${roomId}`);
  stationLayout(spec);
  return roomMiddle(room);
}
