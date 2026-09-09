import { PLAN_DOOR_H } from '../editor/levelPlan';
import { TILE, tileKey, type TileKey } from '../nav/navTile';
import { DRONE_CAP, DRONE_Y, routeLength, stepAlong, type DronePose } from './droneRoute';
import { generateHouse, roomCentre, roomOf, type HouseSpec } from './house';
import { housePlan } from './plan';
import { stationRoute } from './stationNavigation';
import { routeBlocked, stationLayout, type FloorBounds, type FloorPoint } from './stationLayout';
import { COMMAND_HOME, TRAINING_ROOMS, trainingSpawn } from './trainingLayout';

function goalFor(spec: HouseSpec, id: string): TileKey {
  const centre = roomCentre(roomOf(spec, id)!);
  return tileKey(centre.x, centre.z, 0);
}

function poseFor(spec: HouseSpec, id: string): DronePose {
  const centre = roomCentre(roomOf(spec, id)!);
  return { x: (centre.x + 0.5) * TILE, z: (centre.z + 0.5) * TILE, yaw: 0 };
}

function walls(spec: HouseSpec): FloorBounds[] {
  return housePlan(spec)
    .solids()
    .filter((s) => (s.kind === 'wall' || s.kind === 'door') && s.y - s.h / 2 < PLAN_DOOR_H)
    .map((s) => ({
      minX: s.x - s.w / 2,
      maxX: s.x + s.w / 2,
      minZ: s.z - s.d / 2,
      maxZ: s.z + s.d / 2,
    }));
}

function clearPath(
  from: FloorPoint,
  points: readonly FloorPoint[],
  boxes: readonly FloorBounds[],
  radius: number,
): boolean {
  let previous = from;
  for (const point of points) {
    if (boxes.some((box) => routeBlocked(previous, point, box, radius))) return false;
    previous = point;
  }
  return true;
}

test.each([14])('walking routes in %i-room stations clear models and real door frames', (count) => {
  for (const seed of [2, 9, 1009]) {
    const spec = generateHouse(seed, count);
    const plan = housePlan(spec);
    const from = poseFor(spec, spec.entryRoom);
    const boxes = [...stationLayout(spec).map((p) => p.bounds), ...walls(spec)];
    for (const room of spec.rooms) {
      const route = stationRoute(spec, plan.graph, from, goalFor(spec, room.id));
      expect({ seed, goal: room.id, complete: route.complete, grounded: route.grounded }).toEqual({
        seed,
        goal: room.id,
        complete: true,
        grounded: true,
      });
      expect(clearPath(from, route.points!, boxes, 0.45)).toBe(true);
    }
  }
});

test('a flying route rounds corners with short, collision-clear curve samples', () => {
  const spec = generateHouse(2, 8);
  const from = poseFor(spec, spec.entryRoom);
  const target = poseFor(spec, 'r2');
  const route = stationRoute(spec, housePlan(spec).graph, from, target, 0.22, DRONE_Y - DRONE_CAP);
  expect(route.complete).toBe(true);
  expect(route.points!.at(-1)).toEqual({ x: target.x, z: target.z });
  const boxes = [
    ...stationLayout(spec)
      .filter((p) => p.height > DRONE_Y - DRONE_CAP)
      .map((p) => p.bounds),
    ...walls(spec),
  ];
  expect(clearPath(from, route.points!, boxes, 0.22)).toBe(true);
  let curvedSamples = 0;
  const points = [from, ...route.points!];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]!,
      b = points[i]!,
      c = points[i + 1]!;
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const ex = c.x - b.x,
      ez = c.z - b.z;
    if (Math.hypot(dx, dz) > 0.13 || Math.hypot(ex, ez) > 0.13) continue;
    if (Math.abs(dx * ez - dz * ex) < 1e-7) continue;
    curvedSamples++;
    // A hard architectural right angle is now several smaller heading changes.
    const cosine = (dx * ex + dz * ez) / (Math.hypot(dx, dz) * Math.hypot(ex, ez));
    expect(Math.acos(Math.max(-1, Math.min(1, cosine)))).toBeLessThan(Math.PI / 3);
  }
  expect(curvedSamples).toBeGreaterThanOrEqual(3);
});

test('the seed2 route avoids the tall locker crossed by the old tile-centre route', () => {
  const spec = generateHouse(2, 8);
  const plan = housePlan(spec);
  const from = poseFor(spec, spec.entryRoom);
  const locker = stationLayout(spec).find((p) => p.id === 'locker-r3')!;
  const route = stationRoute(
    spec,
    plan.graph,
    from,
    goalFor(spec, 'r0'),
    0.22,
    DRONE_Y - DRONE_CAP,
  );
  expect(route.complete).toBe(true);
  expect(clearPath(from, route.points!, [locker.bounds], 0.22)).toBe(true);
  const pose = { ...from };
  for (let frame = 0; frame < 12000 && route.points!.length; frame++) {
    const previous = { ...pose };
    stepAlong(pose, route, 1 / 90);
    expect(routeBlocked(previous, pose, locker.bounds, 0.22)).toBe(false);
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

test('closing the front door invalidates the cached path; reopening restores it', () => {
  const spec = generateHouse(2, 8);
  const plan = housePlan(spec);
  const from = { ...COMMAND_HOME, yaw: 0 };
  const goal = goalFor(spec, spec.entryRoom);
  const door = spec.doors.find((d) => d.id === spec.frontDoor)!;
  expect(stationRoute(spec, plan.graph, from, goal).complete).toBe(true);
  plan.door(door.x, door.z, door.dir, 0, false);
  const closed = stationRoute(spec, plan.graph, from, goal);
  expect(closed.grounded).toBe(true);
  expect(closed.complete).toBe(false);
  expect(closed.points!.every((p) => p.z > (door.z + 1) * TILE)).toBe(true);
  plan.door(door.x, door.z, door.dir, 0, true);
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
  expect(route).toEqual({ tiles: [], points: [], complete: false, grounded: false });
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
