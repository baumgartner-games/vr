import { TILE } from '../../nav/navTile';
import { generateHouse, roomCentre, roomOf, type HouseDoor, type HouseSpec } from '../house';
import { doorCentre, slide, walkable } from '../map/geometry';
import { FlatRound } from '../map/flatRound';
import { housePlan } from '../plan';
import { COMMAND } from '../roomGraph';
import { stationRoute } from '../stationNavigation';
import type { FloorPoint } from '../stationLayout';
import { COMMAND_HOME } from '../trainingLayout';

/**
 * **Ob man den geglätteten Weg in der 2D-Welt auch gehen kann.**
 *
 * Die Geometrieprüfungen (`stationSmoothing.test.ts`) sagen, dass der Weg
 * keine Wand schneidet. Das Bewegungsmodell der 2D-Welt ist aber eine eigene
 * Rechnung: `walkable` rückt jeden Raum um halbe Wanddicke plus Körperradius
 * ein und lässt Türen nur als kleine Insel zu; `slide` verwirft jeden
 * Schritt, der dort hinausführt. Hier läuft ein Körper mit dem Radius des
 * 2D-Monsters den Weg Schritt für Schritt ab — und jeder Schritt muss ganz
 * ankommen, ohne Gleiten, ohne Verwerfen.
 */

/** Wie in `flatRound.ts`: der Radius des 2D-Monsters und der Aufschlag der Wegsuche. */
const MONSTER_RADIUS = 0.4;
const ROUTE_COMFORT = 0.05;
/** Ein Schritt bei zwei Metern je Sekunde und dreißig Bildern. */
const STRIDE = 0.07;
/** Ab hier gilt ein Wegpunkt als erreicht (`StationNpcNavigator`). */
const REACHED = 0.035;

const SEEDS = [2, 9, 1009];

function poseFor(spec: HouseSpec, id: string): FloorPoint & { yaw: number } {
  const centre = roomCentre(roomOf(spec, id)!);
  return { x: (centre.x + 0.5) * TILE, z: (centre.z + 0.5) * TILE, yaw: 0 };
}

interface Walk {
  /** Wo der Körper am Ende steht. */
  at: FloorPoint;
  /** Wie oft `slide` einen Schritt verworfen oder verkürzt hat. */
  refused: number;
  steps: number;
}

/** Läuft die Wegpunkte mit `slide` ab, wie es `stepMonster` in der 2D-Welt tut. */
function walk(
  spec: HouseSpec,
  shut: readonly string[],
  from: FloorPoint,
  points: readonly FloorPoint[],
): Walk {
  let at: FloorPoint = { x: from.x, z: from.z };
  let refused = 0;
  let steps = 0;
  for (const point of points) {
    for (let guard = 0; guard < 10000; guard++) {
      const dx = point.x - at.x,
        dz = point.z - at.z;
      const distance = Math.hypot(dx, dz);
      if (distance <= REACHED) break;
      const travel = Math.min(distance, STRIDE);
      const wanted = { x: at.x + (dx / distance) * travel, z: at.z + (dz / distance) * travel };
      const next = slide(spec, shut, at, wanted.x - at.x, wanted.z - at.z, MONSTER_RADIUS);
      steps++;
      if (Math.hypot(next.x - wanted.x, next.z - wanted.z) > 1e-9) {
        refused++;
        // Verworfen: So käme das Monster nie an. Abbrechen, der Test sagt es.
        return { at: next, refused, steps };
      }
      at = next;
    }
  }
  return { at, refused, steps };
}

function pairs(
  spec: HouseSpec,
): Array<{ from: string; to: string; start: FloorPoint; goal: FloorPoint }> {
  const entry = poseFor(spec, spec.entryRoom);
  const list = spec.rooms
    .filter((room) => room.id !== spec.entryRoom)
    .map((room) => ({
      from: spec.entryRoom,
      to: room.id,
      start: entry,
      goal: poseFor(spec, room.id),
    }));
  list.push({ from: COMMAND, to: spec.entryRoom, start: { ...COMMAND_HOME, yaw: 0 }, goal: entry });
  const first = spec.rooms[0]!,
    last = spec.rooms.at(-1)!;
  list.push({
    from: last.id,
    to: first.id,
    start: poseFor(spec, last.id),
    goal: poseFor(spec, first.id),
  });
  return list;
}

describe('Der geglättete Weg in der 2D-Welt', () => {
  it.each(SEEDS)(
    'lässt sich mit Seed %i Schritt für Schritt gehen — kein Schritt wird verworfen',
    (seed) => {
      const spec = generateHouse(seed, 14);
      const graph = housePlan(spec).graph;
      for (const pair of pairs(spec)) {
        const route = stationRoute(
          spec,
          graph,
          { ...pair.start, yaw: 0 },
          pair.goal,
          MONSTER_RADIUS + ROUTE_COMFORT,
        );
        expect({ ...pair, complete: route.complete }).toEqual({ ...pair, complete: true });
        // Jeder Wegpunkt ist für den Körper ein erlaubter Standort …
        for (const point of route.points!)
          expect({ ...pair, point, walkable: walkable(spec, [], point, MONSTER_RADIUS) }).toEqual({
            ...pair,
            point,
            walkable: true,
          });
        // … und der Weg dazwischen wird ganz gegangen, bis ans Ziel.
        const result = walk(spec, [], pair.start, route.points!);
        const arrived = Math.hypot(result.at.x - pair.goal.x, result.at.z - pair.goal.z) < 0.05;
        expect({ ...pair, refused: result.refused, arrived }).toEqual({
          ...pair,
          refused: 0,
          arrived: true,
        });
      }
    },
  );

  it('endet vor einer gesperrten Tür, ohne dass ein Schritt verworfen wird', () => {
    const spec = generateHouse(2, 14);
    const from = poseFor(spec, spec.entryRoom);
    // Die erste Tür, die der Weg vom Eingang aus nimmt, wird gesperrt.
    const open = stationRoute(
      spec,
      housePlan(spec).graph,
      from,
      poseFor(spec, spec.rooms.at(-1)!.id),
      0.45,
    );
    const crossed = (door: HouseDoor): boolean => {
      const at = doorCentre(door);
      let previous: FloorPoint = from;
      for (const point of open.points!) {
        const horizontal = door.dir === 0 || door.dir === 2;
        const a = horizontal ? previous.z - at.z : previous.x - at.x;
        const b = horizontal ? point.z - at.z : point.x - at.x;
        if (a * b < 0) return true;
        previous = point;
      }
      return false;
    };
    const door = spec.doors.find((d) => d.id !== spec.frontDoor && crossed(d))!;
    expect(door).toBeDefined();
    const shut = [door.id];
    const route = stationRoute(
      spec,
      housePlan(spec, new Set(shut)).graph,
      from,
      poseFor(spec, spec.rooms.at(-1)!.id),
      MONSTER_RADIUS + ROUTE_COMFORT,
    );
    const result = walk(spec, shut, from, route.points!);
    expect(result.refused).toBe(0);
    if (!route.complete) {
      // Der Teilweg bleibt diesseits des Türblatts.
      const at = doorCentre(door);
      const horizontal = door.dir === 0 || door.dir === 2;
      const side = horizontal ? Math.sign(from.z - at.z) : Math.sign(from.x - at.x);
      const end = horizontal ? Math.sign(result.at.z - at.z) : Math.sign(result.at.x - at.x);
      expect(end).toBe(side);
    }
  });

  // Zwei Samen und eine halbe Minute: Jede Wegsuche kostet in Jest um die
  // hundert Millisekunden, und `flatRound.test.ts` fährt schon vier Samen.
  it.each([1, 2])('trägt das Monster der 2D-Welt mit Seed %i durch mehrere Räume', (seed) => {
    const round = new FlatRound(seed, { roll: seed });
    const spaces = new Set<string>();
    let stuck = 0,
      longest = 0;
    let last = { x: round.monster.x, z: round.monster.z };
    for (let t = 0; t < 30; t += 1 / 30) {
      round.step(1 / 30, { x: 0, z: 0, sprint: false });
      spaces.add(round.monster.space);
      if (Math.hypot(round.monster.x - last.x, round.monster.z - last.z) < 1e-4) stuck++;
      else stuck = 0;
      longest = Math.max(longest, stuck);
      last = { x: round.monster.x, z: round.monster.z };
    }
    // Es kommt herum — und bleibt nie länger als ein paar Sekunden auf der
    // Stelle stehen (die Routine selbst hält kurz inne, eine Wand nicht).
    expect(spaces.size).toBeGreaterThanOrEqual(3);
    expect(longest).toBeLessThan(30 * 5);
  });
});
