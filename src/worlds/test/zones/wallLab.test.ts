import { CellGrid, navCellSource, type Slope } from '../../nav/cellGrid';
import { slideOnCells } from '../../nav/planeMove';
import { GridPlan } from '../../grid/gridPlan';
import { DIR_E, DIR_N, DIR_S, DIR_W, tileKey, type Dir, type TileKey } from '../../nav/navTile';
import { wallCells } from '../../portal/gridSnap';
import { WALL_LAB } from '../layout';
import { testPlan } from '../testPlan';
import { LAB_WALL, ensureWallLab, wallLabModels } from './wallLab';

const plan = testPlan();

/**
 * **Das Gitter mit den Regalwänden des Parcours** — dieselbe Rechnung wie in
 * der Welt (`gridSnap.wallCells`, `GridWorld.refreshWallSlopes`), mit den
 * Maßen der Prototyp-Wand: 2 m bzw. 1 m lang, 0,37 m dick.
 */
function labGrid(): CellGrid {
  const edges = new Set<string>();
  const slopes = new Map<TileKey, Slope>();
  for (const wall of wallLabModels()) {
    const half = { x: wall.path === LAB_WALL ? 1 : 0.5, z: 0.185 };
    const turn = { x: 0, y: Math.sin(wall.yaw / 2), z: 0, w: Math.cos(wall.yaw / 2) };
    const cells = wallCells(wall.x, wall.z, turn, half);
    expect(cells).not.toBeNull();
    for (const edge of cells!.edges) edges.add(`${edge.x},${edge.z},${edge.dir}`);
    for (const one of cells!.slopes) slopes.set(tileKey(one.x, one.z, 0), one.slope);
  }
  const closed = (tx: number, tz: number, dir: Dir): boolean => {
    if (dir === DIR_N) return edges.has(`${tx},${tz},n`);
    if (dir === DIR_S) return edges.has(`${tx},${tz + 1},n`);
    if (dir === DIR_W) return edges.has(`${tx},${tz},w`);
    return edges.has(`${tx + 1},${tz},w`);
  };
  void DIR_E;
  return new CellGrid(
    navCellSource(plan.graph, (key) => slopes.get(key) ?? null, {
      voidIsFree: true,
      walls: closed,
    }),
  );
}

const grid = labGrid();

/** Wie der Spieler läuft: in der Ebene, an den Wänden entlang (`PhysicsLocomotion.plane`). */
function walk(from: { x: number; z: number }, dx: number, dz: number, frames = 300) {
  let p = { ...from };
  for (let i = 0; i < frames; i++) p = slideOnCells(grid, p.x, p.z, dx, dz);
  return p;
}

const X = WALL_LAB.x,
  Z = WALL_LAB.z;

describe('Der Wandparcours', () => {
  it('1 · hält an der geraden Wand, ohne dass der Körper hineinragt', () => {
    // Die Wand steht auf der Fuge x = X + 2, von Z + 2 bis Z + 8.
    const west = walk({ x: X + 0.5, z: Z + 5 }, 0.04, 0);
    expect(west.x + 0.24).toBeLessThan(X + 2 - 0.1);
    const east = walk({ x: X + 3.5, z: Z + 5 }, -0.04, 0);
    expect(east.x - 0.24).toBeGreaterThan(X + 2 + 0.1);
  });

  it('3 · lässt durch die Lücke von einer Kachel', () => {
    // Vor der Lücke (Z + 4) nach Osten: hindurch.
    const through = walk({ x: X + 8, z: Z + 4.5 }, 0.04, 0, 200);
    expect(through.x).toBeGreaterThan(X + 10);
  });

  it('4 · lässt durch den Gang von einem Meter', () => {
    const through = walk({ x: X + 11.5, z: Z + 1 }, 0, 0.04, 250);
    expect(through.z).toBeGreaterThan(Z + 8);
  });

  it('5 · lässt niemanden über die Schräge — auch nicht schräg hinein', () => {
    // „╱" über (13 + i, 6 − i): Die Linie ist x + z = X + Z + 20 (Meter), von
    // (X + 13, Z + 7) bis (X + 17, Z + 3). Um ihre Enden herum darf man — wie
    // bei der geraden Wand —, durch sie hindurch nicht.
    const line = X + Z + 20;
    for (const [dx, dz] of [
      [0.04, 0.04],
      [0.05, 0.02],
      [0.02, 0.05],
      [0.04, 0],
      [0, 0.04],
    ]) {
      let p = { x: X + 13.5, z: Z + 4.5 };
      for (let i = 0; i < 300; i++) {
        p = slideOnCells(grid, p.x, p.z, dx!, dz!);
        const along = p.x - p.z - (X - Z);
        if (along > 6 && along < 14) expect(p.x + p.z).toBeLessThan(line);
      }
    }
  });

  it('5 · gleitet an der Schräge entlang, statt stehen zu bleiben', () => {
    // Nach Westen gegen die „╱": die Wand hinunter nach Südwesten.
    const p = walk({ x: X + 17.5, z: Z + 4.5 }, -0.04, 0, 120);
    expect(p.z).toBeGreaterThan(Z + 5.5);
    expect(p.x + p.z).toBeGreaterThan(X + Z + 20);
  });

  it('7 · lässt durch den schrägen Gang', () => {
    // Zwischen x + z = 12 und x + z = 14 (Meter im Parcours), von Südwest nach Nordost.
    const p = walk({ x: X + 1.4, z: Z + 11.6 }, 0.03, -0.03, 120);
    expect(p.x).toBeGreaterThan(X + 4);
    expect(p.x + p.z).toBeGreaterThan(X + Z + 12);
    expect(p.x + p.z).toBeLessThan(X + Z + 14);
  });

  it('8 · lässt niemanden durch den Knick von gerader Wand in die Schräge', () => {
    // Von innen (Südosten) nach Nordwesten gegen den Knick.
    for (const [dx, dz] of [
      [-0.04, -0.04],
      [-0.05, -0.02],
      [-0.02, -0.05],
    ]) {
      const p = walk({ x: X + 17, z: Z + 11 }, dx!, dz!);
      // Innen heißt: südlich der Nordwand (Z + 8), östlich der Westwand
      // (X + 14) und südöstlich der Schräge (x + z > X + Z + 24).
      expect(p.x + p.z).toBeGreaterThan(X + Z + 24);
      expect(p.z).toBeGreaterThan(Z + 8);
    }
  });
});

describe('Ein gespeicherter Stand ohne Parcours', () => {
  it('bekommt seinen Boden dazu — die Wände kommen aus dem Regal', () => {
    const old = new GridPlan([0]);
    old.floor({ x: -2, z: -2, w: 4, d: 4 });
    ensureWallLab(old);
    expect(old.graph.has(tileKey(X, Z, 0))).toBe(true);
    const version = old.version;
    ensureWallLab(old);
    expect(old.version).toBe(version);
  });
});

describe('Die Testwelt ohne Planwände', () => {
  it('hat keine feste Wand mehr im Grundriss und keine Schräge', () => {
    for (const [, wall] of plan.graph.wallEntries()) expect(wall.kind).not.toBe('solid');
    expect(plan.saveSlopes()).toHaveLength(0);
  });
});
