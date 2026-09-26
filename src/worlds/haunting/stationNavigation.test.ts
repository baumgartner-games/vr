import { moveOnCells, snapCell } from '../nav/cellGrid';
import type { NavGraph } from '../nav/navGraph';
import { TILE, tileKey, type TileKey } from '../nav/navTile';
import { routeLength, stepAlong, type RoutePose } from './navmesh/route';
import { doorEdges, generateHouse, roomCentre, roomOf, type HouseSpec } from './house';
import { stationCellGrid } from './map/stationCells';
import { housePlan } from './plan';
import { stationRoute } from './stationNavigation';
import { routeBlocked, stationLayout, type FloorPoint } from './stationLayout';
import { COMMAND_HOME, TRAINING_ROOMS, trainingSpawn } from './trainingLayout';

function goalFor(spec: HouseSpec, id: string): TileKey {
  const centre = roomCentre(roomOf(spec, id)!);
  return tileKey(centre.x, centre.z, 0);
}

function poseFor(spec: HouseSpec, id: string): RoutePose {
  const centre = roomCentre(roomOf(spec, id)!);
  return { x: (centre.x + 0.5) * TILE, z: (centre.z + 0.5) * TILE, yaw: 0 };
}

/**
 * **Ob ein 2×2-Block den ganzen Weg gehen kann** — mit der einen Bewegung
 * (`moveOnCells`) auf dem Zellgitter, das auch die Runde fragt
 * (`map/stationCells.ts`). Die alte Frage, ob eine Kapsel von 0,3 m an
 * Möbelkästen vorbeikommt, ist keine mehr: Über das Gehen entscheidet in allen
 * Welten allein das Gitter.
 */
function clearPath(
  spec: HouseSpec,
  graph: NavGraph,
  from: FloorPoint,
  points: readonly FloorPoint[],
): boolean {
  const grid = stationCellGrid(spec, graph);
  let at = { x: from.x, z: from.z };
  for (const point of points) {
    for (let i = 0; i < 4000; i++) {
      const dx = point.x - at.x,
        dz = point.z - at.z;
      const length = Math.hypot(dx, dz);
      if (length < 1e-6) break;
      const step = Math.min(0.05, length);
      const next = moveOnCells(grid, at, (dx / length) * step, (dz / length) * step);
      if (next.x === at.x && next.z === at.z) return false;
      at = next;
    }
    if (Math.hypot(point.x - at.x, point.z - at.z) > 1e-6) return false;
  }
  return grid.footprintFree(snapCell(at.x, at.z));
}

test.each([14])('walking routes in %i-room stations clear models and real door frames', (count) => {
  for (const seed of [2, 9, 1009]) {
    const spec = generateHouse(seed, count);
    const plan = housePlan(spec);
    const from = poseFor(spec, spec.entryRoom);
    for (const room of spec.rooms) {
      const route = stationRoute(spec, plan.graph, from, goalFor(spec, room.id));
      expect({ seed, goal: room.id, complete: route.complete, grounded: route.grounded }).toEqual({
        seed,
        goal: room.id,
        complete: true,
        grounded: true,
      });
      expect({
        seed,
        goal: room.id,
        clear: clearPath(spec, plan.graph, from, route.points!),
      }).toEqual({
        seed,
        goal: room.id,
        clear: true,
      });
    }
  }
});

test('a route walks straight where the block fits and diagonally along corners', () => {
  const spec = generateHouse(2, 8);
  const plan = housePlan(spec);
  const from = poseFor(spec, spec.entryRoom);
  const target = poseFor(spec, 'r2');
  const route = stationRoute(spec, plan.graph, from, target, 0.3);
  expect(route.complete).toBe(true);
  expect(route.points!.at(-1)).toEqual({ x: target.x, z: target.z });
  expect(clearPath(spec, plan.graph, from, route.points!)).toBe(true);
  // Gezogen, nicht als Treppe: weniger Punkte als halbe Meter Weg.
  const length = routeLength({ ...from, velocity: 0 }, route);
  expect(route.points!.length).toBeLessThan(length / 0.5);
});

test('the seed2 route avoids the tall locker crossed by the old tile-centre route', () => {
  const spec = generateHouse(2, 8);
  const plan = housePlan(spec);
  const from = poseFor(spec, spec.entryRoom);
  const locker = stationLayout(spec).find((p) => p.id === 'locker-r3')!;
  const route = stationRoute(spec, plan.graph, from, goalFor(spec, 'r0'), 0.3);
  expect(route.complete).toBe(true);
  expect(clearPath(spec, plan.graph, from, route.points!)).toBe(true);
  const pose = { ...from };
  for (let frame = 0; frame < 12000 && route.points!.length; frame++) {
    const previous = { ...pose };
    stepAlong(pose, route, 1 / 90);
    expect(routeBlocked(previous, pose, locker.bounds, 0.3)).toBe(false);
  }
  expect(route.points).toHaveLength(0);
  expect(routeLength(pose, route)).toBe(0);
});

test('the command return point reaches every randomly positioned entrance with the lift closed', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const spec = generateHouse(seed, 8);
    const route = stationRoute(
      spec,
      housePlan(spec).graph,
      { ...COMMAND_HOME, yaw: 0 },
      goalFor(spec, spec.entryRoom),
    );
    expect({ seed, complete: route.complete }).toEqual({ seed, complete: true });
  }
});

/**
 * **Vier Felder Gang sind breit genug** — für jeden, der auf einem 2×2-Block
 * geht (Techniker der Runde, Bots, Monster: `AGENT_CELLS`). Seit die Gänge
 * zwei Kacheln schmal sind (`stationRules.ts`), kommt der Block von der
 * Zentrale in jeden Raum der Station, samt der Einrichtung, die Zellen sperrt,
 * und geht den Weg auch Zelle für Zelle ab (`clearPath`).
 */
test('the block of bots and monster reaches every room through the four-field corridors', () => {
  for (const seed of [1, 7, 42]) {
    const spec = generateHouse(seed, 14);
    const graph = housePlan(spec).graph;
    for (const room of spec.rooms) {
      const route = stationRoute(spec, graph, { ...COMMAND_HOME, yaw: 0 }, goalFor(spec, room.id));
      expect({ seed, room: room.name, complete: route.complete }).toEqual({
        seed,
        room: room.name,
        complete: true,
      });
      expect({
        seed,
        room: room.name,
        clear: clearPath(spec, graph, COMMAND_HOME, route.points!),
      }).toEqual({ seed, room: room.name, clear: true });
    }
  }
});

test('closing the front door invalidates the cached path; reopening restores it', () => {
  const spec = generateHouse(2, 8);
  const plan = housePlan(spec);
  const from = { ...COMMAND_HOME, yaw: 0 };
  const goal = goalFor(spec, spec.entryRoom);
  const door = spec.doors.find((d) => d.id === spec.frontDoor)!;
  expect(stationRoute(spec, plan.graph, from, goal).complete).toBe(true);
  for (const edge of doorEdges(door)) plan.door(edge.x, edge.z, edge.dir, 0, false);
  const closed = stationRoute(spec, plan.graph, from, goal);
  expect(closed.grounded).toBe(true);
  expect(closed.complete).toBe(false);
  // Die Zentrale liegt nördlich der Schleuse: Der Teilweg bleibt davor.
  expect(closed.points!.every((p) => p.z < door.z * TILE)).toBe(true);
  for (const edge of doorEdges(door)) plan.door(edge.x, edge.z, edge.dir, 0, true);
  expect(stationRoute(spec, plan.graph, from, goal).complete).toBe(true);
});

test('an off-grid starting point is reported without a fallback teleport', () => {
  const spec = generateHouse(1, 8);
  const plan = housePlan(spec);
  const route = stationRoute(
    spec,
    plan.graph,
    { x: 200, z: 200, yaw: 0 },
    goalFor(spec, spec.entryRoom),
  );
  expect(route).toEqual({ points: [], complete: false, grounded: false });
});

test('remote teaching rooms do not enter the mission route raster', () => {
  const spec = generateHouse(2, 8);
  const normal = housePlan(spec);
  const training = housePlan(spec, new Set(), true);
  const from = poseFor(spec, spec.entryRoom);
  const goal = goalFor(spec, 'r0');
  expect(stationRoute(spec, training.graph, from, goal)).toEqual(
    stationRoute(spec, normal.graph, from, goal),
  );
  for (const room of TRAINING_ROOMS) {
    const spawn = trainingSpawn(room.id);
    expect(stationRoute(spec, training.graph, { ...spawn, yaw: 0 }, goal).grounded).toBe(false);
  }
});
