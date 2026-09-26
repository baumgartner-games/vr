import { CellGrid, navCellSource } from '../nav/cellGrid';
import { cellRoute } from '../nav/cellRoute';
import { findPath } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { keyLevel, keyX, keyZ, tileKey } from '../nav/navTile';
import { slideOnCells } from '../nav/planeMove';
import { readNav, writeNav } from '../nav/navSerial';
import { wallLevel } from '../grid/shelfNav';
import { clearPlanWalls, SHELF_WALL, SHELF_WINDOW_PIECES } from '../grid/shelfWalls';
import {
  LAVA,
  NAV_TESTS,
  SPAWN,
  STOREY,
  navTestPlan,
  navTestWalls,
  tileCentre,
  type NavTest,
} from './navTestPlan';

const plan = navTestPlan();
const graph = plan.graph;

function test(id: string): NavTest {
  return NAV_TESTS.find((one) => one.id === id)!;
}

/** Der grobe Weg eines Menschen von der grünen zur blauen Platte. */
function route(one: NavTest) {
  return findPath(
    graph,
    tileKey(one.start.x, one.start.z, one.start.level),
    tileKey(one.goal.x, one.goal.z, one.goal.level),
    { profile: HUMAN_PROFILE },
  );
}

describe('Test Navigation — die Kammern', () => {
  it('hat drei Tests, jeder mit Start, Ziel und Knopf außerhalb der Kammer', () => {
    expect(NAV_TESTS.map((one) => one.id)).toEqual(['schraege', 'treppe', 'lava']);
    for (const one of NAV_TESTS) {
      expect(graph.walkable(tileKey(one.start.x, one.start.z, one.start.level))).toBe(true);
      expect(graph.walkable(tileKey(one.goal.x, one.goal.z, one.goal.level))).toBe(true);
      const { room, button } = one;
      const inside =
        button.x >= room.x &&
        button.x < room.x + room.w &&
        button.z >= room.z &&
        button.z < room.z + room.d;
      expect(inside).toBe(false);
      expect(graph.walkable(tileKey(button.x, button.z, 0))).toBe(true);
    }
    expect(graph.walkable(tileKey(Math.floor(SPAWN.x), Math.floor(SPAWN.z), 0))).toBe(true);
  });

  it('findet in jeder Kammer einen Weg ans Ziel — und einen für den 2 × 2-Block', () => {
    for (const one of NAV_TESTS) {
      const found = route(one);
      expect(found.complete).toBe(true);
      const from = { x: tileCentre(one.start.x), z: tileCentre(one.start.z) };
      const to = { x: tileCentre(one.goal.x), z: tileCentre(one.goal.z) };
      expect(cellRoute(graph, found.tiles, from, to)).not.toBeNull();
    }
  });

  it('1 · geht durch den schrägen Gang und nicht durch seine Wände', () => {
    const one = test('schraege');
    const found = route(one);
    const points = cellRoute(
      graph,
      found.tiles,
      { x: tileCentre(one.start.x), z: tileCentre(one.start.z) },
      { x: tileCentre(one.goal.x), z: tileCentre(one.goal.z) },
    )!;
    // Gelaufen wie im Spiel: in der Ebene, mit dem Kreis des Spielers.
    const grid = new CellGrid(navCellSource(graph, (key) => plan.slopeAt(key)));
    let p = { x: tileCentre(one.start.x), z: tileCentre(one.start.z) };
    for (const point of points) {
      for (let i = 0; i < 300; i++) {
        const dx = point.x - p.x,
          dz = point.z - p.z,
          d = Math.hypot(dx, dz);
        if (d < 0.02) break;
        const step = Math.min(0.04, d);
        p = slideOnCells(grid, p.x, p.z, (dx / d) * step, (dz / d) * step);
        // Zwischen den Linien x + z = 6 (x von 0 bis 6) und x + z = 8 (x von
        // 2 bis 8) der Kammer — dort, wo beide stehen.
        const sum = p.x + p.z - one.room.x - one.room.z;
        const along = p.x - one.room.x;
        if (along > 2 && along < 6) {
          expect(sum).toBeGreaterThan(6);
          expect(sum).toBeLessThan(8);
        }
      }
    }
    expect(Math.hypot(p.x - tileCentre(one.goal.x), p.z - tileCentre(one.goal.z))).toBeLessThan(
      0.6,
    );
  });

  it('2 · nimmt die Treppe aufs Podest — den Lauf hinauf, nicht seitlich auf die oberste Stufe', () => {
    const one = test('treppe');
    const tiles = route(one).tiles;
    expect(tiles.some((key) => keyLevel(key) === 0)).toBe(true);
    expect(keyLevel(tiles[tiles.length - 1]!)).toBe(1);
    // Auf den Lauf kommt er von unten, nicht von der Seite (`navPath.sidestep`):
    // Jede Treppenkachel seines Wegs und die davor liegen in ihrer Spalte.
    tiles.forEach((key, index) => {
      if (graph.flightAt(key) === null) return;
      expect(keyX(key)).toBe(one.start.x);
      expect(keyX(tiles[index - 1]!)).toBe(one.start.x);
    });
  });

  it('plant auf einer Kopie des Plangraphen genauso (`GridWorld.navFromPlan`)', () => {
    const copy = readNav(writeNav(graph));
    copy.slopeAt = graph.slopeAt;
    copy.flightAt = graph.flightAt;
    for (const one of NAV_TESTS) {
      const found = findPath(
        copy,
        tileKey(one.start.x, one.start.z, one.start.level),
        tileKey(one.goal.x, one.goal.z, one.goal.level),
        { profile: HUMAN_PROFILE },
      );
      expect(found.tiles).toEqual(route(one).tiles);
    }
  });

  it('3 · geht oben links um die Lava herum, nie hinein', () => {
    const tiles = route(test('lava')).tiles;
    for (const key of tiles) expect(graph.tile(key)?.hazard ?? 0).toBe(0);
    const top = tiles.filter((key) => keyLevel(key) === 1);
    // Links an der Lava vorbei: eine Kachel westlich von ihr, auf dem Podest.
    expect(top.some((key) => keyX(key) < LAVA.x)).toBe(true);
    // Und geradeaus wäre es kürzer gewesen — die Lava liegt zwischen Treppe und Ziel.
    const goal = test('lava').goal;
    expect(goal.x).toBeGreaterThanOrEqual(LAVA.x);
    expect(goal.x).toBeLessThan(LAVA.x + LAVA.w);
    expect(goal.z).toBeLessThan(LAVA.z);
    expect(top.some((key) => keyZ(key) >= LAVA.z + LAVA.d)).toBe(true);
  });
});

describe('Test Navigation — Wände nur aus dem Regal', () => {
  const walls = navTestWalls();

  it('legt die geraden Wände aus der Fensterwand und die Schrägen aus der Prototypwand', () => {
    const allowed = new Set([SHELF_WINDOW_PIECES.full, SHELF_WINDOW_PIECES.half, SHELF_WALL]);
    for (const wall of walls) expect(allowed.has(wall.path)).toBe(true);
    const slanted = walls.filter((wall) => Math.abs(Math.abs(wall.yaw) - Math.PI / 4) < 1e-9);
    // Zwei Schrägen zu je sechs Kacheln im schrägen Gang.
    expect(slanted).toHaveLength(12);
    for (const wall of slanted) expect(wall.path).toBe(SHELF_WALL);
    expect(walls.some((wall) => wall.path === SHELF_WINDOW_PIECES.full)).toBe(true);
  });

  it('stellt Brüstungen auf dem Podest eine Etage höher', () => {
    const high = walls.filter((wall) => wall.y > STOREY);
    expect(high.length).toBeGreaterThan(0);
    for (const wall of high) expect(wall.y).toBeCloseTo(STOREY + 1.4);
  });

  it('räumt feste Wände und Schrägen aus dem Plan der Welt', () => {
    const bare = navTestPlan();
    clearPlanWalls(bare);
    expect([...bare.graph.wallEntries()].filter(([, wall]) => wall.kind === 'solid')).toHaveLength(
      0,
    );
    expect(bare.saveSlopes()).toHaveLength(0);
  });

  it('rechnet die Etage einer Wand nach ihrer Unterkante (`wallLevel`)', () => {
    expect(wallLevel(graph, 0)).toBe(0);
    expect(wallLevel(graph, STOREY)).toBe(1);
    expect(wallLevel(graph, 0.3)).toBe(0);
  });
});
