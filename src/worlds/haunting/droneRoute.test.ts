import { generateHouse, roomCentre, roomOf, type HouseRoom } from './house';
import { housePlan, DRONE_PROFILE } from './plan';
import {
  routeLength,
  routeTo,
  shortestTurn,
  stepAlong,
  tileAt,
  type DronePose,
} from './droneRoute';
import { wallState } from '../nav/navGraph';
import { powerOf } from '../nav/navProfile';
import { DIRS, TILE, neighbour, tileCentreX, tileCentreZ } from '../nav/navTile';
import type { NavGraph } from '../nav/navGraph';

/**
 * **Die Drohne fliegt nicht die Luftlinie.**
 *
 * Das ist die Regel, an der in dieser Welt drei Rollen hängen: Die Drohne
 * macht keine Tür auf, also hängt ihre Reichweite daran, was der VR-Spieler
 * und der Hacker offen gelassen haben. Eine Drohne, die stattdessen einfach
 * auf das angetippte Zimmer zuhält, fliegt durch die Wand — und dann ist die
 * geschlossene Tür Kulisse und der Hacker Deko.
 *
 * Nachgerechnet wird deshalb nicht der Aufruf von `findPath`, sondern der
 * **Flug**: Ein Weg wird ganz abgeflogen, und dabei darf die Bahn nie eine
 * Wand kreuzen. Ein Test, der nur prüft, dass eine Wegsuche stattfindet,
 * überlebt jeden Umbau; einer, der die Bahn nachfliegt, nicht.
 */

const SEED = 31337;
const spec = generateHouse(SEED);

/** In welchem Zimmer ein Punkt in Metern liegt. */
function roomAt(x: number, z: number): HouseRoom | null {
  const tx = Math.floor(x / TILE);
  const tz = Math.floor(z / TILE);
  return (
    spec.rooms.find(
      (room) =>
        tx >= room.rect.x &&
        tx < room.rect.x + room.rect.w &&
        tz >= room.rect.z &&
        tz < room.rect.z + room.rect.d,
    ) ?? null
  );
}

/** Ob zwischen zwei Punkten in Metern eine Wand steht, die die Drohne aufhält. */
function crossesWall(graph: NavGraph, ax: number, az: number, bx: number, bz: number): boolean {
  const from = tileAt(ax, az);
  const to = tileAt(bx, bz);
  if (from === to) return false;
  for (const dir of DIRS) {
    if (neighbour(from, dir) !== to) continue;
    return !wallState(graph.wall(from, dir), powerOf(DRONE_PROFILE)).walk;
  }
  // Nicht einmal benachbart: Sie hat eine Kachel übersprungen, und was
  // dazwischen liegt, hat niemand gefragt.
  return true;
}

/** Einen Weg wirklich abfliegen und dabei jeden Kachelwechsel mitschreiben. */
function fly(
  graph: NavGraph,
  pose: DronePose,
  goal: number,
): { steps: number; crossings: string[]; arrived: boolean } {
  const crossings: string[] = [];
  let route = routeTo(graph, pose, goal);
  let steps = 0;
  let last = { x: pose.x, z: pose.z };
  // 60 Bilder je Sekunde, zwei Minuten — mehr als genug für jedes Haus.
  while (steps < 7200) {
    steps++;
    // Zweimal je Sekunde neu suchen, genau wie in der Welt.
    if (steps % 30 === 0) route = routeTo(graph, pose, goal);
    const moving = stepAlong(pose, route, 1 / 60);
    if (tileAt(pose.x, pose.z) !== tileAt(last.x, last.z)) {
      if (crossesWall(graph, last.x, last.z, pose.x, pose.z)) {
        crossings.push(
          `${last.x.toFixed(2)},${last.z.toFixed(2)} → ${pose.x.toFixed(2)},${pose.z.toFixed(2)}`,
        );
      }
    }
    last = { x: pose.x, z: pose.z };
    if (!moving) break;
  }
  return { steps, crossings, arrived: tileAt(pose.x, pose.z) === goal };
}

function poseAt(room: HouseRoom): DronePose {
  const at = roomCentre(room);
  return { x: (at.x + 0.5) * TILE, z: (at.z + 0.5) * TILE, yaw: 0 };
}

function goalOf(room: HouseRoom): number {
  const at = roomCentre(room);
  return tileAt((at.x + 0.5) * TILE, (at.z + 0.5) * TILE);
}

describe('Die Drohne navigiert im Graphen', () => {
  const plan = housePlan(spec);
  const entry = roomOf(spec, spec.entryRoom) ?? spec.rooms[0]!;

  it('kommt in jedes Zimmer, ohne je eine Wand zu kreuzen', () => {
    for (const room of spec.rooms) {
      const pose = poseAt(entry);
      const flight = fly(plan.graph, pose, goalOf(room));
      expect(flight.crossings).toEqual([]);
      expect(flight.arrived).toBe(true);
      expect(roomAt(pose.x, pose.z)?.id).toBe(room.id);
    }
  });

  /**
   * **Die Gegenprobe zur Luftlinie.**
   *
   * Es muss mindestens ein Zimmer geben, das von der Haustür aus schräg hinter
   * einer Wand liegt — sonst wäre der Test oben auch für eine Drohne grün, die
   * einfach geradeaus fliegt, und würde nichts festhalten.
   */
  it('nimmt einen Umweg, wo die Luftlinie durch eine Wand ginge', () => {
    const start = poseAt(entry);
    const detours = spec.rooms.filter((room) => {
      const goal = goalOf(room);
      const route = routeTo(plan.graph, start, goal);
      if (route.tiles.length === 0) return false;
      const straight = Math.hypot(tileCentreX(goal) - start.x, tileCentreZ(goal) - start.z);
      return routeLength(start, route) > straight + TILE;
    });
    expect(detours.length).toBeGreaterThan(0);
  });

  /**
   * Der Weg besteht aus Nachbarkacheln, und zwischen zwei Nachbarn steht keine
   * Wand. Das ist dieselbe Zusage wie oben, nur als Blick auf den Weg statt
   * auf die Bahn — und sie ist die, die eine Kachel-Abkürzung auffliegen
   * lässt.
   */
  it('reiht nur Nachbarkacheln aneinander', () => {
    const start = poseAt(entry);
    for (const room of spec.rooms) {
      const route = routeTo(plan.graph, start, goalOf(room));
      let x = start.x;
      let z = start.z;
      for (const tile of route.tiles) {
        const nx = tileCentreX(tile);
        const nz = tileCentreZ(tile);
        expect(crossesWall(plan.graph, x, z, nx, nz)).toBe(false);
        x = nx;
        z = nz;
      }
    }
  });
});

describe('Wo sie stehen bleibt', () => {
  const inner = spec.doors.find((door) => door.b !== null)!;

  it('meldet einen Teilweg, wenn der Hacker die Tür zumacht', () => {
    const plan = housePlan(spec, new Set([inner.id]));
    const pose: DronePose = {
      x: (inner.x + 0.5) * TILE,
      z: (inner.z + 0.5) * TILE,
      yaw: 0,
    };
    const behind = neighbour(tileAt(pose.x, pose.z), inner.dir);
    const route = routeTo(plan.graph, pose, behind);
    expect(route.grounded).toBe(true);
    expect(route.complete).toBe(false);
    // Und sie fliegt nicht trotzdem hin.
    fly(plan.graph, pose, behind);
    expect(tileAt(pose.x, pose.z)).not.toBe(behind);
  });

  it('sagt Bescheid, wenn sie gar nicht im Graphen steht', () => {
    const plan = housePlan(spec);
    const outside: DronePose = { x: 400, z: 400, yaw: 0 };
    const route = routeTo(plan.graph, outside, goalOf(spec.rooms[0]!));
    expect(route.grounded).toBe(false);
    expect(route.tiles).toEqual([]);
  });
});

describe('Wie sie sich dreht', () => {
  it('nimmt den kürzeren Bogen über den Sprung bei ±180°', () => {
    expect(shortestTurn(3, -3)).toBeCloseTo(2 * Math.PI - 6, 6);
    expect(shortestTurn(-3, 3)).toBeCloseTo(6 - 2 * Math.PI, 6);
    expect(shortestTurn(0, 1)).toBeCloseTo(1, 6);
  });

  /**
   * **Der Ort hängt nicht an der Drehung.**
   *
   * Die Bahn geht auf Kachelmitten zu, und nur das Bild dreht sich nach. Wer
   * es andersherum baut — erst drehen, dann fliegen —, lässt eine Drohne, die
   * gerade falsch herum steht, die Ecke schneiden, und dann steckt sie in der
   * Wand. Hier steht sie zu Beginn genau verkehrt und kommt trotzdem an.
   */
  it('kommt auch aus einer 180°-Wende beim ersten Wegpunkt an', () => {
    const plan = housePlan(spec);
    const entry = roomOf(spec, spec.entryRoom) ?? spec.rooms[0]!;
    const pose = poseAt(entry);
    const goal = goalOf(spec.rooms[spec.rooms.length - 1]!);
    const route = routeTo(plan.graph, pose, goal);
    const first = route.tiles[0];
    if (first === undefined) throw new Error('Dieses Haus hat nur ein Zimmer');
    // Genau verkehrt herum: die Blickrichtung zeigt vom Wegpunkt weg.
    pose.yaw = Math.atan2(pose.x - tileCentreX(first), pose.z - tileCentreZ(first));

    const before = routeLength(pose, route);
    for (let i = 0; i < 120; i++) stepAlong(pose, route, 1 / 60);
    expect(routeLength(pose, route)).toBeLessThan(before);
    expect(tileAt(pose.x, pose.z)).not.toBe(goalOf(entry));
  });
});
