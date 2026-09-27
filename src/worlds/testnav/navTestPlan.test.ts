import { CellGrid, cellKey, navCellSource } from '../nav/cellGrid';
import { cellRoute } from '../nav/cellRoute';
import { NavAgent } from '../nav/navAgent';
import { findPath } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { DIR_W, NO_TILE, keyLevel, keyX, keyZ, tileKey } from '../nav/navTile';
import { slideOnCells } from '../nav/planeMove';
import { readNav, writeNav } from '../nav/navSerial';
import { wallLevel } from '../grid/shelfNav';
import { clearPlanWalls, SHELF_WALL, SHELF_WINDOW_PIECES } from '../grid/shelfWalls';
import {
  LAVA,
  NAV_TESTS,
  dropCells,
  OBSTACLE_MODEL,
  SPAWN,
  STOREY,
  navTestPlan,
  navTestWalls,
  GATE_MODEL,
  gateDir,
  gateTile,
  GOAL_FLOOR,
  lavaSpots,
  navTestPlate,
  START_FLOOR,
  tileCentre,
  type NavTest,
} from './navTestPlan';
import { PLATE_PROTOTYPE } from '../test/floorPlate';

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
  it('hat sechs Tests, jeder mit Start, Ziel und Knopf außerhalb der Kammer', () => {
    expect(NAV_TESTS.map((one) => one.id)).toEqual([
      'schraege',
      'treppe',
      'lava',
      'eng',
      'engste',
      'hindernis',
    ]);
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

  it('6 · plant um die gefallene Arbeitsplatte herum — vorher geradeaus, danach daneben', () => {
    const one = test('hindernis');
    const drop = one.drop!;
    const blockedTile = tileKey(drop.x, drop.z, 0);
    const from = { x: tileCentre(one.start.x), z: tileCentre(one.start.z) };
    const to = { x: tileCentre(one.goal.x), z: tileCentre(one.goal.z) };
    // Vorher: geradeaus, mitten über die Kachel, auf die sie fallen wird.
    const before = route(one);
    expect(before.complete).toBe(true);
    expect(before.tiles).toContain(blockedTile);
    // Sie fällt erst, wenn er losgegangen ist: zwischen Start und Kachel.
    expect(drop.trigger).toBeLessThan(one.start.z);
    expect(drop.trigger).toBeGreaterThan(drop.z);

    // Danach: auf einer Kopie des Graphen gesperrt, wie in der Welt
    // (`NavTestWorld.dropObstacle`) — Kachel und ihre zwei mal zwei Zellen.
    const copy = readNav(writeNav(graph));
    copy.slopeAt = (key) => plan.slopeAt(key);
    const cells = new Set(dropCells(drop));
    expect(cells.size).toBe(4);
    copy.cellBlocked = (ix, iz, level) => cells.has(cellKey(ix, iz, level));
    copy.setBlocked(blockedTile, true);
    const after = findPath(
      copy,
      tileKey(one.start.x, one.start.z, 0),
      tileKey(one.goal.x, one.goal.z, 0),
      { profile: HUMAN_PROFILE },
    );
    expect(after.complete).toBe(true);
    expect(after.tiles).not.toContain(blockedTile);
    const points = cellRoute(copy, after.tiles, from, to);
    expect(points).not.toBeNull();
    for (const point of points!)
      expect(Math.floor(point.x) === drop.x && Math.floor(point.z) === drop.z).toBe(false);
  });

  it('6 · nimmt als Hindernis eine Arbeitsplatte aus dem Regal', () => {
    expect(OBSTACLE_MODEL).toBe('restaurant-bits/kitchencounter_straight_A.glb');
  });

  it('4 · geht auch durch den engeren schrägen Gang — ohne die Kammer zu verlassen', () => {
    const one = test('eng');
    const tiles = route(one).tiles;
    // Zwischen den Schrägen x + z = 5 und x + z = 8 der Kammer, beide eingeschlossen
    // (auf ihnen steht die freie Hälfte der Kachel).
    for (const key of tiles) {
      const sum = keyX(key) - one.room.x + keyZ(key) - one.room.z;
      expect(sum).toBeGreaterThanOrEqual(5);
      expect(sum).toBeLessThanOrEqual(8);
    }
    const points = cellRoute(
      graph,
      tiles,
      { x: tileCentre(one.start.x), z: tileCentre(one.start.z) },
      { x: tileCentre(one.goal.x), z: tileCentre(one.goal.z) },
    )!;
    const grid = new CellGrid(navCellSource(graph, (key) => plan.slopeAt(key)));
    let p = { x: tileCentre(one.start.x), z: tileCentre(one.start.z) };
    for (const point of points)
      for (let i = 0; i < 300; i++) {
        const dx = point.x - p.x,
          dz = point.z - p.z,
          d = Math.hypot(dx, dz);
        if (d < 0.02) break;
        const step = Math.min(0.04, d);
        p = slideOnCells(grid, p.x, p.z, (dx / d) * step, (dz / d) * step);
      }
    expect(Math.hypot(p.x - tileCentre(one.goal.x), p.z - tileCentre(one.goal.z))).toBeLessThan(
      0.6,
    );
  });

  it('5 · geht auch durch den engsten schrägen Gang — eine Kachelreihe breit', () => {
    const one = test('engste');
    const tiles = route(one).tiles;
    for (const key of tiles) {
      const sum = keyX(key) - one.room.x + keyZ(key) - one.room.z;
      expect(sum).toBeGreaterThanOrEqual(5);
      expect(sum).toBeLessThanOrEqual(7);
    }
    const points = cellRoute(
      graph,
      tiles,
      { x: tileCentre(one.start.x), z: tileCentre(one.start.z) },
      { x: tileCentre(one.goal.x), z: tileCentre(one.goal.z) },
    );
    expect(points).not.toBeNull();
    const grid = new CellGrid(navCellSource(graph, (key) => plan.slopeAt(key)));
    let p = { x: tileCentre(one.start.x), z: tileCentre(one.start.z) };
    for (const point of points!)
      for (let i = 0; i < 300; i++) {
        const dx = point.x - p.x,
          dz = point.z - p.z,
          d = Math.hypot(dx, dz);
        if (d < 0.02) break;
        const step = Math.min(0.04, d);
        p = slideOnCells(grid, p.x, p.z, (dx / d) * step, (dz / d) * step);
      }
    expect(Math.hypot(p.x - tileCentre(one.goal.x), p.z - tileCentre(one.goal.z))).toBeLessThan(
      0.6,
    );
  });

  it('hat an jeder Kammer ein Tor im Rand, das im Plan für die NPCs zu ist', () => {
    for (const one of NAV_TESTS) {
      if (gateDir(one) === DIR_W) expect(one.gate.x).toBe(one.room.x);
      else expect(one.gate.z).toBe(one.room.z + one.room.d - 1);
      expect(one.gate.x).toBeGreaterThanOrEqual(one.room.x);
      expect(one.gate.x).toBeLessThan(one.room.x + one.room.w);
      expect(one.gate.z).toBeGreaterThanOrEqual(one.room.z);
      expect(one.gate.z).toBeLessThan(one.room.z + one.room.d);
      expect(graph.wall(gateTile(one), gateDir(one))?.kind).toBe('solid');
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

/**
 * **Ein Lauf wie im Spiel**, ohne Physik: der Läufer (`NavAgent`) sagt den
 * Wegpunkt, der Kreis gleitet in der Ebene seiner Etage (`slideOnCells`), und
 * die Höhe folgt der Treppe (`GridPlan.flightFloor`, gefragt an der Mitte und
 * am Rand wie `Npc.stairLift`) — sonst steht er auf dem Boden seiner Kachel.
 */
function walk(one: NavTest): { x: number; y: number; z: number }[] {
  const grid = new CellGrid(
    navCellSource(graph, (key) => plan.slopeAt(key), {
      flight: (tx, tz, level) => plan.flightOn(tileKey(tx, tz, level))?.dir ?? null,
      flightSide: (tx, tz, side, part, level) =>
        plan.flightSideOpen(tileKey(tx, tz, level), side, part),
    }),
  );
  const agent = new NavAgent({ girth: 0.29 });
  const goal = {
    x: tileCentre(one.goal.x),
    y: graph.levelY(one.goal.level),
    z: tileCentre(one.goal.z),
  };
  const p = {
    x: tileCentre(one.start.x),
    y: graph.levelY(one.start.level),
    z: tileCentre(one.start.z),
  };
  const dt = 1 / 60;
  const out = [{ ...p }];
  for (let i = 0; i < 60 * 30; i++) {
    const waypoint = agent.step(graph, p, goal, dt, i * dt).waypoint;
    if (!waypoint) break;
    const dx = waypoint.x - p.x,
      dz = waypoint.z - p.z,
      d = Math.hypot(dx, dz);
    // Auf einem Wegpunkt: stehen, bis der Läufer den nächsten sagt — am Ziel ist Schluss.
    if (d < 0.02) {
      if (Math.hypot(goal.x - p.x, goal.z - p.z) < 0.05) break;
      continue;
    }
    const here = graph.at(p.x, p.z, p.y);
    const level = here === NO_TILE ? 0 : keyLevel(here);
    const step = Math.min(1.5 * dt, d);
    const to = slideOnCells(grid, p.x, p.z, (dx / d) * step, (dz / d) * step, level);
    p.x = to.x;
    p.z = to.z;
    let floor: number | null = null;
    for (const [ox, oz] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const high = plan.flightFloor(p.x + ox * 0.29, p.z + oz * 0.29, p.y);
      if (high !== null && (floor === null || high > floor)) floor = high;
    }
    if (floor === null) {
      const key = graph.at(p.x, p.z, p.y);
      floor = key === NO_TILE ? 0 : graph.levelY(keyLevel(key));
    }
    p.y = floor;
    out.push({ ...p });
  }
  return out;
}

describe('Test Navigation — gelaufen wie im Spiel', () => {
  it('3 · geht die Treppe ganz hinauf und biegt erst oben ab — nicht von der Stufe herunter', () => {
    const one = test('lava');
    const track = walk(one);
    // Vor dem Podest ist er auf der Treppe, und zwar in ihrer Spalte: Wer auf
    // der obersten Stufe schon nach links abbog, trat seitlich vom Lauf und
    // stand dann unten neben dem Podest.
    for (const p of track)
      if (p.z >= LAVA.z + LAVA.d + 1)
        expect(Math.abs(p.x - tileCentre(one.start.x))).toBeLessThan(0.05);
    // Einmal oben, bleibt er oben.
    const up = track.findIndex((p) => p.y >= STOREY - 0.01);
    expect(up).toBeGreaterThan(0);
    for (const p of track.slice(up)) expect(p.y).toBeGreaterThan(STOREY - 0.5);
    const end = track[track.length - 1]!;
    expect(Math.hypot(end.x - tileCentre(one.goal.x), end.z - tileCentre(one.goal.z))).toBeLessThan(
      0.6,
    );
    expect(end.y).toBeCloseTo(STOREY);
  });

  it('2 · kommt die gerade Treppe hinauf bis aufs Ziel', () => {
    const one = test('treppe');
    const end = walk(one).at(-1)!;
    expect(Math.hypot(end.x - tileCentre(one.goal.x), end.z - tileCentre(one.goal.z))).toBeLessThan(
      0.6,
    );
    expect(end.y).toBeCloseTo(STOREY);
  });
});

describe('Test Navigation — Wände nur aus dem Regal', () => {
  const walls = navTestWalls();

  it('legt die geraden Wände aus der Fensterwand und die Schrägen aus der Prototypwand', () => {
    const allowed = new Set([
      SHELF_WINDOW_PIECES.full,
      SHELF_WINDOW_PIECES.half,
      SHELF_WALL,
      GATE_MODEL,
    ]);
    for (const wall of walls) expect(allowed.has(wall.path)).toBe(true);
    const slanted = walls.filter((wall) => Math.abs(Math.abs(wall.yaw) - Math.PI / 4) < 1e-9);
    // Zwei Schrägen zu je sechs Kacheln im schrägen Gang, im engen sechs und
    // sieben, im engsten sechs und acht.
    expect(slanted).toHaveLength(39);
    for (const wall of slanted) expect(wall.path).toBe(SHELF_WALL);
    expect(walls.some((wall) => wall.path === SHELF_WINDOW_PIECES.full)).toBe(true);
  });

  it('stellt je Kammer ein Tor aus dem Regal in die Lücke der Fensterwand', () => {
    const gates = walls.filter((wall) => wall.path === GATE_MODEL);
    expect(gates).toHaveLength(NAV_TESTS.length);
    for (const one of NAV_TESTS) {
      const west = gateDir(one) === DIR_W;
      const x = west ? one.gate.x : one.gate.x + 0.5,
        z = west ? one.gate.z + 0.5 : one.gate.z + 1;
      expect(gates.some((wall) => wall.x === x && wall.z === z)).toBe(true);
      // Und kein Fensterstück überdeckt dieselbe Stelle.
      const cover = walls.filter((wall) => {
        if (wall.path === GATE_MODEL || wall.y >= STOREY) return false;
        const reach = wall.path === SHELF_WINDOW_PIECES.full ? 1 : 0.5;
        return west
          ? wall.yaw !== 0 && wall.x === x && Math.abs(wall.z - z) < reach
          : wall.yaw === 0 && wall.z === z && Math.abs(wall.x - x) < reach;
      });
      expect(cover).toHaveLength(0);
    }
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

describe('Test Navigation — der Boden nur aus dem Regal', () => {
  it('legt überall den Prototyp-Boden, auch oben auf dem Podest', () => {
    expect(navTestPlate({ col: SPAWN.x, row: SPAWN.z, level: 0 })).toBe(PLATE_PROTOTYPE);
    expect(navTestPlate({ col: LAVA.x - 1, row: LAVA.z, level: 1 })).toBe(PLATE_PROTOTYPE);
    // Unter der Lava, eine Etage tiefer, ist es wieder der Prototyp-Boden.
    expect(navTestPlate({ col: LAVA.x, row: LAVA.z, level: 0 })).toBe(PLATE_PROTOTYPE);
  });

  it('legt auf Start und Ziel die grüne und die blaue Küchenfliese', () => {
    for (const one of NAV_TESTS) {
      expect(navTestPlate({ col: one.start.x, row: one.start.z, level: one.start.level })).toBe(
        START_FLOOR,
      );
      expect(navTestPlate({ col: one.goal.x, row: one.goal.z, level: one.goal.level })).toBe(
        GOAL_FLOOR,
      );
    }
    expect(START_FLOOR).toMatch(/floor_kitchen_small_green/);
    expect(GOAL_FLOOR).toMatch(/floor_kitchen_small_blue/);
  });

  it('lässt die Lava frei — dort liegen die Stacheln, eine Falle je Kachel', () => {
    for (let dz = 0; dz < LAVA.d; dz++)
      for (let dx = 0; dx < LAVA.w; dx++)
        expect(navTestPlate({ col: LAVA.x + dx, row: LAVA.z + dz, level: LAVA.level })).toBeNull();
    expect(lavaSpots()).toHaveLength(LAVA.w * LAVA.d);
    expect(lavaSpots()[0]).toEqual({ x: tileCentre(LAVA.x), z: tileCentre(LAVA.z) });
  });
});
