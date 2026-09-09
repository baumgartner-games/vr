import { PLAN_DOOR_H, PLAN_DOOR_W } from '../../editor/levelPlan';
import { TILE } from '../../nav/navTile';
import { DRONE_CAP, DRONE_Y, type DronePose, type DroneRoute } from '../droneRoute';
import { generateHouse, roomCentre, roomOf, type HouseSpec } from '../house';
import { WALL_T, doorAxis, doorCentre, wallSegments } from '../map/geometry';
import { emptySnapshot } from '../map/mapSnapshot';
import { housePlan } from '../plan';
import { stationRoute } from '../stationNavigation';
import { routeBlocked, stationLayout, type FloorBounds, type FloorPoint } from '../stationLayout';
import { COMMAND_HOME } from '../trainingLayout';
import { pathLength, snapshotSegmentClear, totalTurn } from './index';

/**
 * Die Glättung, gemessen an ganzen Stationen — headless, ohne three.js.
 *
 * Zwei Prüfungen, die voneinander nichts wissen: die Quader der Wegsuche
 * (`routeBlocked`, wie die 3D-Welt sie baut) und die Wände des `MapSnapshot`
 * (die Geometrie der 2D-Welt; nur die Raumwände — die Vorplatzhülle der
 * Karte trägt ihre Schleuse heute an der falschen Kante, siehe HANDOVER.md).
 * Ein Weg, der beide besteht, geht nicht durch eine Wand, egal welche der
 * beiden Seiten man ihm glaubt.
 *
 * `NAV_METRICS=1 npx jest stationSmoothing` druckt die Tabelle für HANDOVER.md.
 */

const SEEDS = [2, 9, 1009];
const ROOMS = 14;
const RADIUS = 0.45;

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

function clearOfBoxes(
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

function clearOfMapWalls(
  spec: HouseSpec,
  from: FloorPoint,
  points: readonly FloorPoint[],
  radius: number,
): boolean {
  // Der Snapshot hält die Wandmitte; die Wegsuche hält den Radius zur
  // Wandfläche, also zur Mitte den Radius plus die halbe Dicke.
  const clear = snapshotSegmentClear(
    { ...emptySnapshot(), walls: wallSegments(spec) },
    radius + WALL_T / 2 - 1e-6,
  );
  let previous = from;
  for (const point of points) {
    if (!clear(previous, point)) return false;
    previous = point;
  }
  return true;
}

interface Pair {
  seed: number;
  from: string;
  to: string;
  start: DronePose;
  goal: FloorPoint;
}

/** Dieselben Start-Ziel-Paare für vorher und nachher. */
function pairs(): Array<{ spec: HouseSpec; pair: Pair }> {
  const list: Array<{ spec: HouseSpec; pair: Pair }> = [];
  for (const seed of SEEDS) {
    const spec = generateHouse(seed, ROOMS);
    const entry = poseFor(spec, spec.entryRoom);
    for (const room of spec.rooms) {
      if (room.id === spec.entryRoom) continue;
      list.push({
        spec,
        pair: {
          seed,
          from: spec.entryRoom,
          to: room.id,
          start: entry,
          goal: poseFor(spec, room.id),
        },
      });
    }
    list.push({
      spec,
      pair: {
        seed,
        from: 'command',
        to: spec.entryRoom,
        start: { ...COMMAND_HOME, yaw: 0 },
        goal: entry,
      },
    });
    // Und einmal quer: vom letzten Zimmer ins erste, ohne den Eingang.
    const first = spec.rooms[0]!,
      last = spec.rooms.at(-1)!;
    list.push({
      spec,
      pair: {
        seed,
        from: last.id,
        to: first.id,
        start: poseFor(spec, last.id),
        goal: poseFor(spec, first.id),
      },
    });
  }
  return list;
}

interface Metric {
  length: number;
  points: number;
  /** Summe der Richtungswechsel, in Grad. */
  turn: number;
}

function measure(from: FloorPoint, route: DroneRoute): Metric {
  const points = route.points!;
  return {
    length: pathLength(from, points),
    points: points.length,
    turn: (totalTurn(from, points) * 180) / Math.PI,
  };
}

function add(a: Metric, b: Metric): Metric {
  return { length: a.length + b.length, points: a.points + b.points, turn: a.turn + b.turn };
}

describe('Geglättete Wege durch die Station', () => {
  const cases = pairs();

  it('sind vollständig, nicht länger und mit weniger Wegpunkten als das Raster', () => {
    const rows: string[] = [];
    let before: Metric = { length: 0, points: 0, turn: 0 };
    let after: Metric = { length: 0, points: 0, turn: 0 };
    for (const { spec, pair } of cases) {
      const graph = housePlan(spec).graph;
      const raw = stationRoute(spec, graph, pair.start, pair.goal, RADIUS, 0, false);
      const smooth = stationRoute(spec, graph, pair.start, pair.goal, RADIUS, 0, true);
      expect({ ...pair, complete: smooth.complete }).toEqual({ ...pair, complete: true });
      expect(smooth.points!.at(-1)).toEqual(raw.points!.at(-1));
      const a = measure(pair.start, raw),
        b = measure(pair.start, smooth);
      // Je Paar: nie länger. Die Punktzahl je Paar kann der Kurvenschleifer
      // um ein paar Stützpunkte anheben (längere Schenkel, weitere Bögen);
      // über alle Paare zusammen muss die Glättung deutlich etwas bringen.
      expect({ ...pair, shorter: b.length <= a.length + 1e-6 }).toEqual({ ...pair, shorter: true });
      before = add(before, a);
      after = add(after, b);
      rows.push(
        `| ${pair.seed} | ${pair.from} → ${pair.to} | ${a.length.toFixed(2)} | ${b.length.toFixed(2)} | ${a.points} | ${b.points} | ${a.turn.toFixed(0)} | ${b.turn.toFixed(0)} |`,
      );
    }
    if (process.env.NAV_METRICS) {
      const table = [
        '| Seed | Start → Ziel | Länge vorher (m) | Länge nachher (m) | Punkte vorher | Punkte nachher | Drehung vorher (°) | Drehung nachher (°) |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |',
        ...rows,
        `| Σ | ${cases.length} Paare | ${before.length.toFixed(2)} | ${after.length.toFixed(2)} | ${before.points} | ${after.points} | ${before.turn.toFixed(0)} | ${after.turn.toFixed(0)} |`,
      ].join('\n');
      process.stdout.write(`\n${table}\n`);
    }
    // Die gelieferten Punkte sind zum großen Teil Bogenstützen des
    // Kurvenschleifers (alle 12 cm); die verschwinden nicht, nur die Treppen.
    expect(after.points).toBeLessThan(before.points * 0.7);
    expect(after.turn).toBeLessThan(before.turn * 0.5);
    expect(after.length).toBeLessThan(before.length);
  });

  it('bleiben frei von Wänden, Türrahmen und Modulen — nach beiden Geometrien', () => {
    for (const { spec, pair } of cases) {
      const graph = housePlan(spec).graph;
      const route = stationRoute(spec, graph, pair.start, pair.goal, RADIUS);
      const boxes = [...stationLayout(spec).map((p) => p.bounds), ...walls(spec)];
      expect({ ...pair, boxes: clearOfBoxes(pair.start, route.points!, boxes, RADIUS) }).toEqual({
        ...pair,
        boxes: true,
      });
      expect({
        ...pair,
        map: clearOfMapWalls(spec, pair.start, route.points!, RADIUS),
      }).toEqual({ ...pair, map: true });
    }
  });

  it('gehen durch eine Tür mitten hindurch und nicht schräg am Pfosten entlang', () => {
    for (const { spec, pair } of cases) {
      const graph = housePlan(spec).graph;
      const route = stationRoute(spec, graph, pair.start, pair.goal, RADIUS);
      let previous: FloorPoint = pair.start;
      let crossings = 0;
      for (const point of route.points!) {
        for (const door of spec.doors) {
          // Wo eine Strecke die Türlinie kreuzt, muss der Körper in der
          // Öffnung Platz haben und die Strecke fast senkrecht durchgehen:
          // Eine Abkürzung passt nur mit Radius plus Spielraum durch die
          // 1,2 m, das lässt keinen schrägen Schnitt am Pfosten zu.
          const centre = doorCentre(door);
          const along = doorAxis(door.dir);
          const across = along === 'x' ? 'z' : 'x';
          const a = previous[across] - centre[across],
            b = point[across] - centre[across];
          if (a * b >= 0) continue;
          const t = a / (a - b);
          const hit = previous[along] + t * (point[along] - previous[along]);
          if (Math.abs(hit - centre[along]) > TILE / 2) continue;
          crossings++;
          const slack = PLAN_DOOR_W / 2 - RADIUS;
          const angle =
            (Math.atan2(
              Math.abs(point[along] - previous[along]),
              Math.abs(point[across] - previous[across]),
            ) *
              180) /
            Math.PI;
          expect({
            ...pair,
            door: door.id,
            hit,
            centred: Math.abs(hit - centre[along]) <= slack + 1e-6,
          }).toEqual({ ...pair, door: door.id, hit, centred: true });
          expect({ ...pair, door: door.id, angle: Math.min(angle, 20) }).toEqual({
            ...pair,
            door: door.id,
            angle,
          });
        }
        previous = point;
      }
      expect({ ...pair, crossings: Math.min(crossings, 1) }).toEqual({ ...pair, crossings: 1 });
    }
  });

  it('gelten auch für den Flug der Drohne über niedrige Module hinweg', () => {
    const spec = generateHouse(2, 8);
    const from = poseFor(spec, spec.entryRoom);
    const graph = housePlan(spec).graph;
    for (const room of spec.rooms) {
      if (room.id === spec.entryRoom) continue;
      const goal = poseFor(spec, room.id);
      const raw = stationRoute(spec, graph, from, goal, 0.22, DRONE_Y - DRONE_CAP, false);
      const route = stationRoute(spec, graph, from, goal, 0.22, DRONE_Y - DRONE_CAP);
      expect(route.complete).toBe(true);
      expect(route.points!.at(-1)).toEqual({ x: goal.x, z: goal.z });
      const boxes = [
        ...stationLayout(spec)
          .filter((p) => p.height > DRONE_Y - DRONE_CAP)
          .map((p) => p.bounds),
        ...walls(spec),
      ];
      expect(clearOfBoxes(from, route.points!, boxes, 0.22)).toBe(true);
      expect(pathLength(from, route.points!)).toBeLessThanOrEqual(
        pathLength(from, raw.points!) + 1e-6,
      );
    }
  });

  it('halten vor einer geschlossenen Tür an, statt sie zu kürzen', () => {
    const spec = generateHouse(2, 8);
    const plan = housePlan(spec);
    const door = spec.doors.find((d) => d.id === spec.frontDoor)!;
    plan.door(door.x, door.z, door.dir, 0, false);
    const route = stationRoute(
      spec,
      plan.graph,
      { ...COMMAND_HOME, yaw: 0 },
      poseFor(spec, spec.entryRoom),
    );
    expect(route.complete).toBe(false);
    expect(route.points!.every((p) => p.z < door.z * TILE)).toBe(true);
  });
});
