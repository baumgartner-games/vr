import { GridPlan } from '../grid/gridPlan';
import { DIR_E, DIR_N, DIR_S, TILE, tileKey } from '../nav/navTile';
import { FloorModel, STEP_LIMIT, WALL_HALF, rampProgress, type FloorRamp } from './flatFloor';
import { FIGURE_RADIUS, freshFigure, stepFigure } from './flatFigure';

/**
 * **Das Bodenmodell** — was eine Figur auf dem Kachelgraphen kann und was
 * nicht: durch offene Türen, nicht durch Wände, nicht ins Leere, über die
 * Treppe in den ersten Stock und zurück.
 */
function twoRooms(): GridPlan {
  // Zwei Zimmer nebeneinander, eine Tür in der Wand dazwischen (bei z = 1).
  const plan = new GridPlan([0]);
  plan.room({ x: 0, z: 0, w: 3, d: 3 }, { walls: true });
  plan.room({ x: 3, z: 0, w: 3, d: 3 }, { walls: true });
  plan.door(2, 1, DIR_E, 0, false);
  return plan;
}

const R = FIGURE_RADIUS;

describe('Das Bodenmodell', () => {
  it('lässt eine Figur auf dem Boden stehen, aber nicht in der Wand und nicht im Leeren', () => {
    const floor = new FloorModel(twoRooms().graph);
    expect(floor.walkable({ x: 3.75, z: 3.75, level: 0 }, R)).toBe(true);
    // Direkt an der Außenwand: der Halbmesser plus die halbe Wand passen nicht.
    expect(floor.walkable({ x: WALL_HALF + R - 0.05, z: 3.75, level: 0 }, R)).toBe(false);
    expect(floor.walkable({ x: WALL_HALF + R + 0.05, z: 3.75, level: 0 }, R)).toBe(true);
    expect(floor.walkable({ x: -2, z: 3.75, level: 0 }, R)).toBe(false);
    expect(floor.exists({ x: 20, z: 20, level: 0 })).toBe(false);
  });

  it('gleitet an der Wand entlang, statt darin zu stecken', () => {
    const floor = new FloorModel(twoRooms().graph);
    // Schräg gegen die Nordwand: nach Norden geht es nicht, nach Osten schon.
    const to = floor.slide({ x: 2, z: 0.6, level: 0 }, 1, -1, R);
    expect(to.x).toBeGreaterThan(2.5);
    // Bis an die Wand, nicht hinein: Halbmesser plus halbe Wandstärke bleiben.
    expect(to.z).toBeGreaterThanOrEqual(WALL_HALF + R - 0.01);
    expect(to.z).toBeLessThan(0.6);
  });

  it('kommt durch eine offene Tür und nicht durch eine geschlossene', () => {
    const plan = twoRooms();
    const floor = new FloorModel(plan.graph);
    const from = { x: 3 * TILE - 0.9, z: 1.5 * TILE, level: 0 };
    const shut = floor.slide(from, 1.6, 0, R);
    expect(shut.x).toBeLessThan(3 * TILE - WALL_HALF - R + 0.01);
    plan.door(2, 1, DIR_E, 0, true);
    const open = floor.slide(from, 1.6, 0, R);
    expect(open.x).toBeGreaterThan(3 * TILE);
    // Neben der Öffnung bleibt die Wand: ein Stummel je Seite.
    const beside = floor.slide({ x: 3 * TILE - 0.9, z: 1 * TILE + 0.3, level: 0 }, 1.6, 0, R);
    expect(beside.x).toBeLessThan(3 * TILE);
    // Die Tür ist auch die, die der Knopf meint.
    const near = floor.nearestDoor({ x: 3 * TILE - 0.9, z: 1.5 * TILE, level: 0 }, 1.6);
    expect(near?.id).toBe(plan.graph.wall(tileKey(2, 1, 0), DIR_E)?.id);
  });

  it('nimmt eine Stufe bis zur Grenze der Physik und keine höhere', () => {
    const plan = new GridPlan([0]);
    plan.room({ x: 0, z: 0, w: 2, d: 1 }, { walls: true });
    const floor = new FloorModel(plan.graph);
    plan.graph.setTile(tileKey(1, 0, 0), { rise: STEP_LIMIT - 0.02 });
    const low = floor.slide({ x: 1.6, z: 1.25, level: 0 }, 1.5, 0, R);
    expect(low.x).toBeGreaterThan(TILE);
    plan.graph.setTile(tileKey(1, 0, 0), { rise: STEP_LIMIT + 0.3 });
    const high = floor.slide({ x: 1.6, z: 1.25, level: 0 }, 1.5, 0, R);
    expect(high.x).toBeLessThan(TILE);
    expect(floor.height({ x: 3.75, z: 1.25, level: 0 })).toBeCloseTo(STEP_LIMIT + 0.3);
  });

  it('geht die Treppe hinauf in den ersten Stock und wieder hinunter', () => {
    const plan = new GridPlan([0, 3.1]);
    plan.room({ x: 0, z: 0, w: 2, d: 3 }, { walls: true });
    plan.room({ x: 0, z: 0, w: 2, d: 3, level: 1 }, { walls: true });
    // Die Treppe auf (0,0) nach Süden mündet auf (0,1) oben.
    plan.stairs(0, 0, DIR_S, 0);
    const floor = new FloorModel(plan.graph, {
      ramps: [{ level: 0, tx: 0, tz: 0, dir: DIR_S, rise: 3.1 }],
    });
    const figure = freshFigure({ x: 1.25, z: 0.6, level: 0 });
    // Halb die Treppe hinauf: halbe Höhe.
    expect(floor.height({ x: 1.25, z: 1.25, level: 0 })).toBeCloseTo(1.55);
    for (let i = 0; i < 40; i++) stepFigure(floor, figure, { x: 0, z: 1, sprint: false }, 0.1);
    expect(figure.level).toBe(1);
    expect(figure.z).toBeGreaterThan(TILE);
    expect(floor.height(figure)).toBeCloseTo(3.1);
    // Oben gibt es die Kachel über der Treppe nicht — zurück nach Norden geht es die Treppe hinunter.
    for (let i = 0; i < 40; i++) stepFigure(floor, figure, { x: 0, z: -1, sprint: false }, 0.1);
    expect(figure.level).toBe(0);
    expect(figure.z).toBeLessThan(TILE);
  });

  it('kennt Kästen als Hindernis und die Sicht durch Fenster', () => {
    const plan = new GridPlan([0]);
    plan.room({ x: 0, z: 0, w: 4, d: 1 }, { walls: true });
    plan.window(1, 0, DIR_N, 0);
    plan.wall(1, 0, DIR_E, 0);
    const floor = new FloorModel(plan.graph, {
      obstacles: [{ level: 0, minX: 7.5, minZ: 0.5, maxX: 8.5, maxZ: 1.5 }],
    });
    expect(floor.walkable({ x: 8, z: 1, level: 0 }, R)).toBe(false);
    expect(floor.walkable({ x: 9.5, z: 1, level: 0 }, R)).toBe(true);
    // Die Wand zwischen Kachel 1 und 2 sperrt die Sicht, das Fenster nicht.
    expect(floor.lineOfSight({ x: 1, z: 1.2, level: 0 }, { x: 6, z: 1.2, level: 0 })).toBe(false);
    expect(floor.lineOfSight({ x: 1, z: 1.2, level: 0 }, { x: 3.5, z: 1.2, level: 0 })).toBe(true);
    expect(floor.lineOfSight({ x: 1, z: 1.2, level: 0 }, { x: 1, z: 1.2, level: 1 })).toBe(false);
  });

  it('führt über eine Rampe auf ein Podest, aber nicht über die Rampenseite', () => {
    // Rampe auf (1,0) nach Osten hinauf, Podest auf (2,0) 1,2 m hoch.
    const plan = new GridPlan([0]);
    plan.room({ x: 0, z: 0, w: 3, d: 2 }, { walls: true });
    plan.put('ramp', 1, 0, DIR_E, 0);
    plan.put('platform', 2, 0, DIR_E, 0);
    const floor = new FloorModel(plan.graph, {
      ramps: [{ level: 0, tx: 1, tz: 0, dir: DIR_E, rise: 1.2 }],
    });
    const figure = freshFigure({ x: 0.9, z: 1.25, level: 0 });
    for (let i = 0; i < 40; i++) stepFigure(floor, figure, { x: 1, z: 0, sprint: false }, 0.1);
    expect(figure.x).toBeGreaterThan(2 * TILE);
    expect(floor.height(figure)).toBeCloseTo(1.2);
    // Von der Seite (z = 1 → z = 0) kommt man nicht auf die Rampe.
    const side = floor.slide({ x: 1.5 * TILE, z: 3.5, level: 0 }, 0, -1.5, R);
    expect(side.z).toBeGreaterThan(TILE);
    // Und vom Boden nicht direkt aufs Podest.
    const up = floor.slide({ x: 2.5 * TILE, z: 3.5, level: 0 }, 0, -1.5, R);
    expect(up.z).toBeGreaterThan(TILE);
  });

  it('rechnet den Fortschritt auf einer Rampe in ihrer Richtung', () => {
    const ramp: FloorRamp = { level: 0, tx: 2, tz: 3, dir: DIR_N, rise: 1 };
    expect(rampProgress(ramp, 2.5 * TILE, 4 * TILE - 0.01)).toBeCloseTo(0, 1);
    expect(rampProgress(ramp, 2.5 * TILE, 3 * TILE + 0.01)).toBeCloseTo(1, 1);
  });
});
