import { PLAN_DOOR_W, PLAN_WALL_T } from '../editor/levelPlan';
import type { NavGraph } from '../nav/navGraph';
import {
  TILE,
  keyX,
  keyZ,
  keyLevel,
  tileCentreX,
  tileCentreZ,
  tileKey,
  wallDir,
  wallTile,
  dirX,
  dirZ,
  type TileKey,
} from '../nav/navTile';
import type { RoutePath, RoutePose } from './navmesh/route';
import { missionExtent, type HouseSpec } from './house';
import { SMOOTH_MARGIN, pullString } from './navmesh';
import { pointSegmentDistance } from './navmesh/snapshotClearance';
import { routeBlocked, stationLayout, type FloorBounds, type FloorPoint } from './stationLayout';

/** Quarter-metre samples resolve the tight turn after a 1.2m doorway. */
const SUBDIVISIONS = 10;
const STEP = TILE / SUBDIVISIONS;
const HALF = STEP / 2;
const DIR_X = [0, 1, 0, -1] as const;
const DIR_Z = [-1, 0, 1, 0] as const;

interface RouteGrid {
  spec: HouseSpec;
  version: number;
  radius: number;
  minX: number;
  minZ: number;
  width: number;
  depth: number;
  valid: Uint8Array;
  edges: Uint8Array;
  wallCosts: Uint8Array;
  obstacles: FloorBounds[];
  /**
   * Die Quader kachelweise in Fächern (`BUCKET` breit), jeder um `BUCKET_PAD`
   * verbreitert: `segmentClear` fragt nur die Fächer, die eine Strecke berührt,
   * statt bei jeder Prüfung alle paar hundert Wände der Station abzuklappern —
   * der Kurvenschleifer und der Schnurzug prüfen je Weg tausende Strecken.
   */
  buckets: number[][];
  bucketMinX: number;
  bucketMinZ: number;
  bucketWidth: number;
  bucketDepth: number;
  /** Je Quader ein Stempel, damit eine Strecke über mehrere Fächer ihn nur einmal prüft. */
  checked: Uint32Array;
  check: number;
  costs: Float64Array;
  parents: Int32Array;
  seen: Uint32Array;
  closed: Uint32Array;
  epoch: number;
  heap: number[];
  priorities: number[];
}

/** Zwei zwischengespeicherte Raster decken die Radien ab, die im Spiel laufen. */
const cache = new WeakMap<NavGraph, RouteGrid[]>();

/** Fachgröße des Quaderindexes in Metern — eine Kachel. */
const BUCKET = TILE;
/**
 * Um so viel wird jeder Quader beim Einsortieren verbreitert: mehr als der
 * größte Radius (0,5) plus die Luft des Schnurzugs (`SMOOTH_MARGIN`), damit
 * eine Strecke ihre Fächer ohne eigenen Aufschlag abfragen kann.
 */
const BUCKET_PAD = 0.75;

/**
 * Collision-aware station navigation. It retains the coarse architectural
 * graph and samples only movement at 0.25m resolution. Door frames, closed
 * doors and fitted module footprints use the same metre dimensions as art
 * and physics.
 *
 * Search arrays are reused; geometry is rebuilt only when graph.version or
 * the generated station changes. Missing floor and blocked destinations
 * produce a safe partial route, never a teleport or a straight-line fallback.
 *
 * `avoid` macht eine Stelle **teuer, aber nicht unpassierbar**: Jeder
 * Rasterschritt in ihrem Umkreis kostet einen Aufschlag, der zur Mitte hin
 * wächst. Damit läuft ein Techniker, der das Monster gesehen hat, lieber den
 * Umweg als an ihm vorbei — und wenn es gar nicht anders geht, eben doch
 * vorbei (`rules/technicianBot.ts`). Unendliche Kosten wären eine Wand, und
 * eine Wand, die sich bewegt, sperrt irgendwann jemanden ein.
 *
 * `smooth` pulls the raster path straight (`navmesh/pathSmoothing.ts`): first
 * wherever a swept capsule with an extra `SMOOTH_MARGIN` fits, then through the
 * remaining raster chains (door runs, aisles) with the plain radius the raster
 * itself was validated with. `false` keeps the raw raster corners and exists
 * for measuring the difference.
 */
/**
 * **Eine Stelle, die man meiden möchte** — teuer, nicht verboten. Der
 * Aufschlag je Rasterschritt ist `weight` in der Mitte und fällt zum Rand des
 * `radius` linear auf null. Ein Schritt kostet sonst 1, ein Meter also vier:
 * `weight = 4` heißt „ein Meter neben der Gefahr ist so teuer wie ein Meter
 * Umweg".
 *
 * **Und in der Mitte steht ein Kern** (`core`), in dem jeder Rasterschritt
 * pauschal `coreWeight` kostet — voreingestellt tausend. Der weiche Trichter
 * allein war zu wenig: Vier Kosten je Schritt sind ein Meter Umweg, und wer
 * fliehen will, nimmt dafür jederzeit den Gang *durch* den Verfolger. Der Kern
 * ist die Schlagreichweite plus eine Kachel; er bleibt endlich teuer und damit
 * passierbar, denn eine Wand, die sich bewegt, sperrt irgendwann jemanden ein.
 * Tausend Kosten sind dabei über zweihundert Meter Umweg — so weit ist keine
 * Station, also wird der Kern nur betreten, wenn es *gar* keinen Weg daneben
 * gibt.
 *
 * Der Kern gilt auch für den Schnurzug: Was der A* umgangen hat, darf die
 * Glättung nicht wieder geradeziehen (`coreCrossed`).
 */
export interface RouteAvoid {
  at: FloorPoint;
  radius: number;
  weight: number;
  /** Der harte Kern in Metern — 0 oder fehlend heißt: nur der weiche Trichter. */
  core?: number;
  /** Was ein Rasterschritt im Kern kostet; ohne Angabe `CORE_WEIGHT`. */
  coreWeight?: number;
}

/**
 * **Was ein Rasterschritt im Kern kostet**, wenn niemand etwas anderes sagt.
 * Ein Schritt ist 0,25 m und kostet sonst 1 — tausend sind also 250 m Umweg.
 */
export const CORE_WEIGHT = 1000;

/** Ob die Strecke von `a` nach `b` durch den harten Kern führt. */
export function coreCrossed(avoid: RouteAvoid | null, a: FloorPoint, b: FloorPoint): boolean {
  const core = avoid?.core ?? 0;
  if (!avoid || !(core > 0)) return false;
  return pointSegmentDistance(avoid.at, a, b) < core;
}

export function stationRoute(
  spec: HouseSpec,
  graph: NavGraph,
  from: RoutePose,
  goal: TileKey | FloorPoint,
  clearance = 0.45,
  smooth = true,
  avoid: RouteAvoid | null = null,
): RoutePath {
  const empty = (grounded: boolean): RoutePath => ({ points: [], complete: false, grounded });
  if (
    !Number.isFinite(from.x + from.z + clearance) ||
    (typeof goal === 'number' ? keyLevel(goal) !== 0 : !Number.isFinite(goal.x + goal.z))
  )
    return empty(false);
  const radius = Math.max(0.08, Math.min(0.5, clearance));
  let grids = cache.get(graph);
  if (!grids) cache.set(graph, (grids = []));
  let grid = grids.find((g) => g.radius === radius);
  if (!grid || grid.version !== graph.version || grid.spec !== spec) {
    const built = buildGrid(spec, graph, radius);
    if (!built) return empty(false);
    if (grid) grids.splice(grids.indexOf(grid), 1);
    if (grids.length >= 2) grids.shift();
    grids.push(built);
    grid = built;
  }
  const start = nearestStart(grid, graph, from);
  if (start < 0) return empty(false);
  const target =
    typeof goal === 'number'
      ? { x: tileCentreX(goal), z: tileCentreZ(goal) }
      : { x: goal.x, z: goal.z };
  const gx = Math.round(target.x / STEP - 0.5) - grid.minX;
  const gz = Math.round(target.z / STEP - 0.5) - grid.minZ;
  const targetIndex =
    gx >= 0 && gx < grid.width && gz >= 0 && gz < grid.depth ? gz * grid.width + gx : -1;
  const epoch = ++grid.epoch;
  // A wrap takes years of continuous play; avoid stale visit stamps even then.
  if (epoch >= 0xffffffff) {
    grid.seen.fill(0);
    grid.closed.fill(0);
    grid.epoch = 1;
  }
  const stamp = grid.epoch;
  const heuristic = (index: number): number =>
    Math.abs((index % grid!.width) - gx) + Math.abs(Math.floor(index / grid!.width) - gz);
  grid.heap.length = 0;
  grid.priorities.length = 0;
  grid.seen[start] = stamp;
  grid.costs[start] = 0;
  grid.parents[start] = -1;
  push(grid, start, heuristic(start));
  let best = start;
  let bestDistance = heuristic(start);
  let complete = false;
  while (grid.heap.length) {
    const current = pop(grid);
    if (grid.closed[current] === stamp) continue;
    grid.closed[current] = stamp;
    const distance = heuristic(current);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = current;
    }
    if (current === targetIndex && !obstructed(grid, pointAt(grid, current), target, radius)) {
      best = current;
      complete = true;
      break;
    }
    const edges = grid.edges[current]!;
    for (let dir = 0; dir < 4; dir++) {
      if (!(edges & (1 << dir))) continue;
      const next = current + DIR_Z[dir]! * grid.width + DIR_X[dir]!;
      if (grid.closed[next] === stamp) continue;
      const cost =
        grid.costs[current]! + 1 + grid.wallCosts[next]! * 0.12 + dread(grid, avoid, next);
      if (grid.seen[next] === stamp && cost >= grid.costs[next]!) continue;
      grid.seen[next] = stamp;
      grid.costs[next] = cost;
      grid.parents[next] = current;
      push(grid, next, cost + heuristic(next));
    }
  }
  const reversed: FloorPoint[] = [];
  for (let at = best; at >= 0; at = grid.parents[at]!) reversed.push(pointAt(grid, at));
  reversed.reverse();
  const points: FloorPoint[] = [];
  // Keep exact corners, dropping only points on the same straight segment.
  for (const point of reversed) {
    const a = points[points.length - 2];
    const b = points[points.length - 1];
    if (a && b && ((a.x === b.x && b.x === point.x) || (a.z === b.z && b.z === point.z)))
      points[points.length - 1] = point;
    else points.push(point);
  }
  if (complete && points.length) points.push(target);
  // Replanning halfway along a segment must not send the actor backwards to
  // the nearest sample. Only skip it when the new segment is physically clear.
  while (
    points.length > 1 &&
    !coreCrossed(avoid, from, points[1]!) &&
    segmentClear(grid, graph, from, points[1]!)
  )
    points.shift();
  if (points[0] && Math.hypot(points[0].x - from.x, points[0].z - from.z) < 0.001) points.shift();
  // **Was der A* umgangen hat, zieht die Glättung nicht wieder gerade.** Der
  // Schnurzug fragt nur, ob die Kapsel zwischen zwei Punkten durchpasst — und
  // durch den Gang, in dem das Monster steht, passt sie natürlich. Genau so
  // entstand der Bogen um den Verfolger und danach die Abkürzung quer
  // hindurch. Der Kern ist deshalb für die Glättung eine Wand, obwohl er für
  // die Suche nur teuer ist.
  const free = (a: FloorPoint, b: FloorPoint): boolean => !coreCrossed(avoid, a, b);
  const pulled = smooth
    ? pullString(
        from,
        points,
        (a, b) => free(a, b) && segmentClear(grid, graph, a, b, radius + SMOOTH_MARGIN),
        { tight: (a, b) => free(a, b) && segmentClear(grid, graph, a, b) },
      )
    : points;
  return { points: softenCorners(grid, graph, from, pulled, avoid), grounded: true, complete };
}

/**
 * Round an architectural corner only when the full swept capsule fits the curve.
 * Sampling a quadratic gives the controller a continuous flight tangent; tight
 * door jambs reduce the bend until safe instead of clipping through their frame.
 * Straight legs and the exact requested destination remain unchanged.
 */
function softenCorners(
  grid: RouteGrid,
  graph: NavGraph,
  from: FloorPoint,
  points: readonly FloorPoint[],
  avoid: RouteAvoid | null = null,
): FloorPoint[] {
  const result: FloorPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const corner = points[i]!;
    const before = i === 0 ? from : points[i - 1]!;
    const after = points[i + 1];
    if (!after) {
      result.push(corner);
      continue;
    }
    const inX = corner.x - before.x,
      inZ = corner.z - before.z;
    const outX = after.x - corner.x,
      outZ = after.z - corner.z;
    const inLength = Math.hypot(inX, inZ),
      outLength = Math.hypot(outX, outZ);
    if (inLength < 0.08 || outLength < 0.08 || Math.abs(inX * outZ - inZ * outX) < 1e-5) {
      result.push(corner);
      continue;
    }
    let accepted: FloorPoint[] | null = null;
    for (let bend = Math.min(1.2, inLength * 0.44, outLength * 0.44); bend >= 0.04; bend *= 0.5) {
      const start = {
        x: corner.x - (inX / inLength) * bend,
        z: corner.z - (inZ / inLength) * bend,
      };
      const end = {
        x: corner.x + (outX / outLength) * bend,
        z: corner.z + (outZ / outLength) * bend,
      };
      const samples = [start];
      const steps = Math.max(3, Math.ceil((bend * 2) / 0.12));
      for (let step = 1; step <= steps; step++) {
        const t = step / steps,
          u = 1 - t;
        samples.push({
          x: u * u * start.x + 2 * u * t * corner.x + t * t * end.x,
          z: u * u * start.z + 2 * u * t * corner.z + t * t * end.z,
        });
      }
      let previous = result[result.length - 1] ?? from;
      const safe =
        samples.every((sample) => {
          const clear =
            !coreCrossed(avoid, previous, sample) && segmentClear(grid, graph, previous, sample);
          previous = sample;
          return clear;
        }) &&
        !coreCrossed(avoid, end, after) &&
        segmentClear(grid, graph, end, after);
      if (safe) {
        accepted = samples;
        break;
      }
    }
    result.push(...(accepted ?? [corner]));
  }
  return result;
}

function buildGrid(spec: HouseSpec, graph: NavGraph, radius: number): RouteGrid | null {
  // Test rooms are reached by teleport. Their remote floors must never enlarge
  // the mission movement raster or make an off-map actor seem routable.
  const bounds = missionExtent(spec);
  const tiles = [...graph.tileKeys()].filter(
    (key) =>
      keyLevel(key) === 0 &&
      keyX(key) >= bounds.x &&
      keyX(key) < bounds.x + bounds.w &&
      keyZ(key) >= bounds.z &&
      keyZ(key) < bounds.z + bounds.d,
  );
  if (!tiles.length) return null;
  let minX = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxZ = -Infinity;
  for (const tile of tiles) {
    minX = Math.min(minX, keyX(tile) * SUBDIVISIONS);
    minZ = Math.min(minZ, keyZ(tile) * SUBDIVISIONS);
    maxX = Math.max(maxX, keyX(tile) * SUBDIVISIONS + SUBDIVISIONS - 1);
    maxZ = Math.max(maxZ, keyZ(tile) * SUBDIVISIONS + SUBDIVISIONS - 1);
  }
  const width = maxX - minX + 1;
  const depth = maxZ - minZ + 1;
  // Bounds come from a generated station, not arbitrary editor worlds.
  if (width * depth > 120000) return null;
  const size = width * depth;
  const valid = new Uint8Array(size);
  for (const tile of tiles)
    for (let z = 0; z < SUBDIVISIONS; z++)
      for (let x = 0; x < SUBDIVISIONS; x++)
        valid[
          (keyZ(tile) * SUBDIVISIONS + z - minZ) * width + keyX(tile) * SUBDIVISIONS + x - minX
        ] = 1;
  const obstacles: FloorBounds[] = stationLayout(spec).map((p) => ({ ...p.bounds }));
  for (const [key, wall] of graph.wallEntries()) {
    const tile = wallTile(key);
    if (keyLevel(tile) !== 0) continue;
    const dir = wallDir(key);
    const x = (keyX(tile) + 0.5 + dirX(dir) * 0.5) * TILE;
    const z = (keyZ(tile) + 0.5 + dirZ(dir) * 0.5) * TILE;
    if (
      x < bounds.x * TILE ||
      x > (bounds.x + bounds.w) * TILE ||
      z < bounds.z * TILE ||
      z > (bounds.z + bounds.d) * TILE
    )
      continue;
    const horizontal = dirZ(dir) !== 0;
    const opening = wall.kind === 'door' && wall.open && !wall.barred;
    const spans = opening
      ? [
          [-TILE / 2, -PLAN_DOOR_W / 2],
          [PLAN_DOOR_W / 2, TILE / 2],
        ]
      : [[-TILE / 2, TILE / 2]];
    for (const [start, end] of spans)
      obstacles.push({
        minX: x + (horizontal ? start! : -PLAN_WALL_T / 2),
        maxX: x + (horizontal ? end! : PLAN_WALL_T / 2),
        minZ: z + (horizontal ? -PLAN_WALL_T / 2 : start!),
        maxZ: z + (horizontal ? PLAN_WALL_T / 2 : end!),
      });
  }
  // Rasterize both node centres and edge midpoints. This catches thin walls
  // that a test of only the two endpoints could accidentally step across.
  const rasterWidth = width * 2 + 1;
  const rasterDepth = depth * 2 + 1;
  const raster = new Uint8Array(rasterWidth * rasterDepth);
  for (const box of obstacles) {
    const x0 = Math.max(0, Math.ceil((box.minX - radius) / HALF - minX * 2));
    const x1 = Math.min(rasterWidth - 1, Math.floor((box.maxX + radius) / HALF - minX * 2));
    const z0 = Math.max(0, Math.ceil((box.minZ - radius) / HALF - minZ * 2));
    const z1 = Math.min(rasterDepth - 1, Math.floor((box.maxZ + radius) / HALF - minZ * 2));
    for (let z = z0; z <= z1; z++) raster.fill(1, z * rasterWidth + x0, z * rasterWidth + x1 + 1);
  }
  for (let z = 0; z < depth; z++)
    for (let x = 0; x < width; x++)
      if (raster[(z * 2 + 1) * rasterWidth + x * 2 + 1]) valid[z * width + x] = 0;
  const edges = new Uint8Array(size);
  const wallCosts = new Uint8Array(size);
  for (let z = 0; z < depth; z++)
    for (let x = 0; x < width; x++) {
      const at = z * width + x;
      if (!valid[at]) continue;
      // Prefer the open middle of a passage when several routes are equally
      // short. A route grazing every obstacle leaves no room for a safe curve.
      // This is a cost preference, so narrow but passable doors remain usable.
      for (let reach = 1; reach <= 2; reach++)
        for (let direction = 0; direction < 4; direction++) {
          const nx = x + DIR_X[direction]! * reach,
            nz = z + DIR_Z[direction]! * reach;
          if (nx < 0 || nx >= width || nz < 0 || nz >= depth || !valid[nz * width + nx])
            wallCosts[at]! += reach === 1 ? 4 : 1;
        }
      for (let dir = 0; dir < 4; dir++) {
        const nx = x + DIR_X[dir]!,
          nz = z + DIR_Z[dir]!;
        if (nx < 0 || nx >= width || nz < 0 || nz >= depth || !valid[nz * width + nx]) continue;
        if (!raster[(z * 2 + 1 + DIR_Z[dir]!) * rasterWidth + x * 2 + 1 + DIR_X[dir]!])
          edges[at]! |= 1 << dir;
      }
    }
  const bucketMinX = Math.floor((minX * STEP) / BUCKET) - 1;
  const bucketMinZ = Math.floor((minZ * STEP) / BUCKET) - 1;
  const bucketWidth = Math.ceil(((minX + width) * STEP) / BUCKET) + 2 - bucketMinX;
  const bucketDepth = Math.ceil(((minZ + depth) * STEP) / BUCKET) + 2 - bucketMinZ;
  const buckets: number[][] = Array.from({ length: bucketWidth * bucketDepth }, () => []);
  obstacles.forEach((box, index) => {
    const x0 = Math.max(0, Math.floor((box.minX - BUCKET_PAD) / BUCKET) - bucketMinX);
    const x1 = Math.min(bucketWidth - 1, Math.floor((box.maxX + BUCKET_PAD) / BUCKET) - bucketMinX);
    const z0 = Math.max(0, Math.floor((box.minZ - BUCKET_PAD) / BUCKET) - bucketMinZ);
    const z1 = Math.min(bucketDepth - 1, Math.floor((box.maxZ + BUCKET_PAD) / BUCKET) - bucketMinZ);
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) buckets[z * bucketWidth + x]!.push(index);
  });
  return {
    spec,
    version: graph.version,
    radius,
    minX,
    minZ,
    width,
    depth,
    valid,
    edges,
    wallCosts,
    obstacles,
    buckets,
    bucketMinX,
    bucketMinZ,
    bucketWidth,
    bucketDepth,
    checked: new Uint32Array(obstacles.length),
    check: 0,
    costs: new Float64Array(size),
    parents: new Int32Array(size),
    seen: new Uint32Array(size),
    closed: new Uint32Array(size),
    epoch: 0,
    heap: [],
    priorities: [],
  };
}

/** Der Aufschlag eines Rasterfelds, das in der Nähe der gemiedenen Stelle liegt. */
function dread(grid: RouteGrid, avoid: RouteAvoid | null, index: number): number {
  if (!avoid) return 0;
  const core = avoid.core ?? 0;
  if (!(avoid.radius > 0 && avoid.weight > 0) && !(core > 0)) return 0;
  const at = pointAt(grid, index);
  const d = Math.hypot(at.x - avoid.at.x, at.z - avoid.at.z);
  // **Der Kern zuerst.** Er ist keine Verschärfung des Trichters, sondern eine
  // eigene Aussage: „hier steht das Monster" — und sie gilt auch dann, wenn
  // der Trichter längst auf null abgefallen wäre.
  const hard = core > 0 && d < core ? (avoid.coreWeight ?? CORE_WEIGHT) : 0;
  const soft = d < avoid.radius && avoid.weight > 0 ? avoid.weight * (1 - d / avoid.radius) : 0;
  return hard + soft;
}

function pointAt(grid: RouteGrid, index: number): FloorPoint {
  return {
    x: (grid.minX + (index % grid.width) + 0.5) * STEP,
    z: (grid.minZ + Math.floor(index / grid.width) + 0.5) * STEP,
  };
}

function nearestStart(grid: RouteGrid, graph: NavGraph, from: FloorPoint): number {
  const x = Math.round(from.x / STEP - 0.5) - grid.minX;
  const z = Math.round(from.z / STEP - 0.5) - grid.minZ;
  let best = -1,
    distance = Infinity;
  for (let dz = -2; dz <= 2; dz++)
    for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx,
        nz = z + dz;
      if (nx < 0 || nx >= grid.width || nz < 0 || nz >= grid.depth) continue;
      const index = nz * grid.width + nx;
      if (!grid.valid[index]) continue;
      const point = pointAt(grid, index);
      const far = Math.hypot(point.x - from.x, point.z - from.z);
      if (far < distance && segmentClear(grid, graph, from, point)) {
        best = index;
        distance = far;
      }
    }
  return best;
}

function segmentClear(
  grid: RouteGrid,
  graph: NavGraph,
  from: FloorPoint,
  to: FloorPoint,
  radius = grid.radius,
): boolean {
  if (obstructed(grid, from, to, radius)) return false;
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / HALF));
  for (let i = 0; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const z = from.z + ((to.z - from.z) * i) / steps;
    if (!graph.has(tileKey(Math.floor(x / TILE), Math.floor(z / TILE), 0))) return false;
  }
  return true;
}

/** Ob ein Quader die Strecke sperrt — geprüft werden nur die Fächer, die sie berührt. */
function obstructed(grid: RouteGrid, from: FloorPoint, to: FloorPoint, radius: number): boolean {
  const x0 = Math.max(0, Math.floor(Math.min(from.x, to.x) / BUCKET) - grid.bucketMinX);
  const x1 = Math.min(
    grid.bucketWidth - 1,
    Math.floor(Math.max(from.x, to.x) / BUCKET) - grid.bucketMinX,
  );
  const z0 = Math.max(0, Math.floor(Math.min(from.z, to.z) / BUCKET) - grid.bucketMinZ);
  const z1 = Math.min(
    grid.bucketDepth - 1,
    Math.floor(Math.max(from.z, to.z) / BUCKET) - grid.bucketMinZ,
  );
  if (++grid.check >= 0xffffffff) {
    grid.checked.fill(0);
    grid.check = 1;
  }
  const stamp = grid.check;
  for (let z = z0; z <= z1; z++)
    for (let x = x0; x <= x1; x++)
      for (const index of grid.buckets[z * grid.bucketWidth + x]!) {
        if (grid.checked[index] === stamp) continue;
        grid.checked[index] = stamp;
        if (routeBlocked(from, to, grid.obstacles[index]!, radius)) return true;
      }
  return false;
}

function push(grid: RouteGrid, node: number, priority: number): void {
  let at = grid.heap.length;
  grid.heap.push(node);
  grid.priorities.push(priority);
  while (at > 0) {
    const parent = (at - 1) >> 1;
    if (grid.priorities[parent]! <= priority) break;
    grid.heap[at] = grid.heap[parent]!;
    grid.priorities[at] = grid.priorities[parent]!;
    at = parent;
  }
  grid.heap[at] = node;
  grid.priorities[at] = priority;
}

function pop(grid: RouteGrid): number {
  const first = grid.heap[0]!;
  const last = grid.heap.pop()!;
  const priority = grid.priorities.pop()!;
  if (!grid.heap.length) return first;
  let at = 0;
  while (at * 2 + 1 < grid.heap.length) {
    let child = at * 2 + 1;
    if (child + 1 < grid.heap.length && grid.priorities[child + 1]! < grid.priorities[child]!)
      child++;
    if (priority <= grid.priorities[child]!) break;
    grid.heap[at] = grid.heap[child]!;
    grid.priorities[at] = grid.priorities[child]!;
    at = child;
  }
  grid.heap[at] = last;
  grid.priorities[at] = priority;
  return first;
}
