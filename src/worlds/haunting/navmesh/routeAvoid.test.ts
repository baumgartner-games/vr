import { generateHouse } from '../house';
import { stationGraph } from '../roomGraph';
import { StationTravelPlan } from '../stationTravelPlan';
import { stationRoute, type RouteAvoid } from '../stationNavigation';
import type { FloorPoint } from '../stationLayout';

/**
 * **Teuer, nicht verboten.** Die Wegsuche kennt seit dem fliehenden Techniker
 * eine Stelle, die Aufschlag kostet (`RouteAvoid`): Er soll um das Monster
 * herumgehen, wenn der Umweg zu bezahlen ist — und an ihm vorbei, wenn es gar
 * nicht anders geht. Unendliche Kosten wären eine Wand, und eine Wand, die
 * sich bewegt, sperrt irgendwann jemanden ein, der dann stehen bleibt.
 */

const RADIUS = 0.35;

function station(seed = 3) {
  const spec = generateHouse(seed, 14);
  // Derselbe Graph wie in der Runde (`navmesh/flatNavigator.ts`): keine Tür gesperrt.
  return {
    spec,
    graph: new StationTravelPlan().graph(spec, [], false),
    rooms: stationGraph(spec),
  };
}

function route(
  world: ReturnType<typeof station>,
  from: FloorPoint,
  to: FloorPoint,
  avoid: RouteAvoid | null = null,
) {
  return stationRoute(
    world.spec,
    world.graph,
    { x: from.x, z: from.z, yaw: 0 },
    to,
    RADIUS,
    0,
    true,
    avoid,
  );
}

/** Wie nah eine Bahn einer Stelle kommt, in Metern. */
function closest(points: readonly FloorPoint[], at: FloorPoint): number {
  let near = Infinity;
  for (const point of points) near = Math.min(near, Math.hypot(point.x - at.x, point.z - at.z));
  return near;
}

/**
 * **Wie viel Angst eine Bahn kostet**: die Nähe zur gemiedenen Stelle, über
 * die ganze Strecke aufsummiert. Genau diese Zahl macht die Wegsuche klein —
 * nicht der Abstand an einer einzelnen Stelle.
 */
function dread(points: readonly FloorPoint[], from: FloorPoint, avoid: RouteAvoid): number {
  let sum = 0;
  let last = from;
  for (const point of points) {
    const steps = Math.max(1, Math.round(Math.hypot(point.x - last.x, point.z - last.z) / 0.25));
    for (let i = 1; i <= steps; i++) {
      const at = {
        x: last.x + ((point.x - last.x) * i) / steps,
        z: last.z + ((point.z - last.z) * i) / steps,
      };
      const d = Math.hypot(at.x - avoid.at.x, at.z - avoid.at.z);
      if (d < avoid.radius) sum += avoid.weight * (1 - d / avoid.radius);
    }
    last = point;
  }
  return sum;
}

describe('Eine Stelle, die die Wegsuche meidet', () => {
  it('nimmt lieber den Umweg als den Vorbeigang', () => {
    const world = station();
    const spaces = world.rooms.spaces;
    let better = 0;
    let pairs = 0;
    for (let i = 0; i + 3 < spaces.length; i += 3) {
      const from = world.rooms.centre(spaces[i]!);
      const to = world.rooms.centre(spaces[i + 3]!);
      const plain = route(world, from, to).points ?? [];
      if (plain.length < 4) continue;
      // Mitten auf die Bahn: genau dort steht das Monster.
      const middle = plain[Math.floor(plain.length / 2)]!;
      const avoid: RouteAvoid = { at: middle, radius: 7, weight: 8 };
      const detour = route(world, from, to, avoid);
      expect(detour.complete).toBe(true);
      const shy = detour.points ?? [];
      pairs++;
      // Die geflohene Bahn kostet nie *mehr* Angst als die kürzeste …
      const plainDread = dread(plain, from, avoid);
      const shyDread = dread(shy, from, avoid);
      expect(shyDread).toBeLessThanOrEqual(plainDread + 1e-6);
      if (shyDread < plainDread - 1) {
        better++;
        // … und wo sie weniger kostet, hält sie auch mehr Abstand.
        expect(closest(shy, middle)).toBeGreaterThan(closest(plain, middle));
      }
    }
    expect(pairs).toBeGreaterThan(1);
    // Mindestens irgendwo in der Station gibt es einen Bogen, und er wird genommen.
    expect(better).toBeGreaterThan(0);
  });

  it('geht trotzdem hindurch, wenn es keinen Bogen gibt', () => {
    const world = station();
    const spaces = world.rooms.spaces;
    const from = world.rooms.centre(spaces[0]!);
    const to = world.rooms.centre(spaces[spaces.length - 1]!);
    const middle = (route(world, from, to).points ?? [])[2] ?? from;
    // Ein Gewicht, das jede Alternative schlagen müsste — und trotzdem kommt
    // er an: Die Stelle ist teuer, nicht gesperrt.
    const desperate = route(world, from, to, { at: middle, radius: 12, weight: 400 });
    expect(desperate.complete).toBe(true);
    expect((desperate.points ?? []).length).toBeGreaterThan(1);
  });

  it('lässt den Weg in Ruhe, wenn die Stelle weit weg liegt', () => {
    const world = station();
    const spaces = world.rooms.spaces;
    const from = world.rooms.centre(spaces[0]!);
    const to = world.rooms.centre(spaces[1]!);
    const plain = route(world, from, to);
    const far = route(world, from, to, { at: { x: -400, z: -400 }, radius: 7, weight: 20 });
    expect(far.points).toEqual(plain.points);
  });
});
