import { generateHouse } from '../house';
import { stationGraph } from '../roomGraph';
import { StationTravelPlan } from '../stationTravelPlan';
import { coreCrossed, stationRoute, type RouteAvoid } from '../stationNavigation';
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
  smooth = true,
) {
  return stationRoute(
    world.spec,
    world.graph,
    { x: from.x, z: from.z, yaw: 0 },
    to,
    RADIUS,
    smooth,
    avoid,
  );
}

/**
 * **Der Kern des fliehenden Technikers**, in Metern — Schlagreichweite
 * (1,7 m) plus eine Kachel (2,5 m), wie `rules/technicianBot.DREAD_CORE`.
 */
const CORE = 4.2;

/** Wie viele Abschnitte einer Bahn durch den harten Kern führen. */
function crossings(points: readonly FloorPoint[], from: FloorPoint, avoid: RouteAvoid): number {
  let hits = 0;
  let last = from;
  for (const point of points) {
    if (coreCrossed(avoid, last, point)) hits++;
    last = point;
  }
  return hits;
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
      // **Fast immer weniger Angst — und nie nennenswert mehr.**
      //
      // Es stand hier einmal „nie mehr", und das war ein Versehen, das eine
      // Möblierung lang gut ging: Der Trichter ist ein **Preis** auf der
      // Wegsuche, keine Zusage. Gibt es einen Bogen, wird er genommen (oft
      // bis auf null Angst herunter). Gibt es keinen, bleiben beide Bahnen im
      // Trichter, und dann wiegt die Suche Länge gegen Nähe ab — und der
      // Schnurzug gibt hinterher noch ein Prozent davon zurück, weil er nur
      // fragt, ob die Kapsel durchpasst. Genau dafür gibt es den harten Kern
      // (`RouteAvoid.core`, Test darunter): Der ist die Zusage.
      const plainDread = dread(plain, from, avoid);
      const shyDread = dread(shy, from, avoid);
      expect(shyDread).toBeLessThanOrEqual(plainDread * 1.05);
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

  it('führt nicht durch den harten Kern, solange es irgendwie anders geht', () => {
    const world = station();
    const spaces = world.rooms.spaces;
    const core = CORE;
    let clean = 0;
    let pairs = 0;
    for (let i = 0; i + 3 < spaces.length; i += 3) {
      const from = world.rooms.centre(spaces[i]!);
      const to = world.rooms.centre(spaces[i + 3]!);
      const plain = route(world, from, to).points ?? [];
      if (plain.length < 4) continue;
      // Mitten auf die kürzeste Bahn: genau dort steht das Monster.
      const middle = plain[Math.floor(plain.length / 2)]!;
      const avoid: RouteAvoid = { at: middle, radius: 7, weight: 8, core };
      // Der rohe Rasterweg (ohne Schnurzug) ist das Maß: Was der A* um den
      // Kern herumgeführt hat, darf die Glättung nicht wieder geradeziehen.
      const raw = route(world, from, to, avoid, false).points ?? [];
      const shy = route(world, from, to, avoid).points ?? [];
      if (!raw.length || !shy.length) continue;
      pairs++;
      expect(crossings(shy, from, avoid)).toBeLessThanOrEqual(crossings(raw, from, avoid));
      if (crossings(raw, from, avoid) === 0) {
        clean++;
        expect(crossings(shy, from, avoid)).toBe(0);
      }
    }
    expect(pairs).toBeGreaterThan(1);
    // Und in der Regel gibt es einen Weg daneben — sonst prüfte der Test nichts.
    expect(clean).toBeGreaterThan(0);
  });

  it('geht durch den Kern, wenn es keinen Weg daneben gibt', () => {
    const world = station();
    const spaces = world.rooms.spaces;
    const from = world.rooms.centre(spaces[0]!);
    const to = world.rooms.centre(spaces[spaces.length - 1]!);
    const middle = (route(world, from, to).points ?? [])[2] ?? from;
    // Ein Kern, der die halbe Station verschluckt — und er kommt trotzdem an.
    const desperate = route(world, from, to, { at: middle, radius: 2, weight: 1, core: 30 });
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
