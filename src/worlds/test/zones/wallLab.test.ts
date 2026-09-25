import { CellGrid, gateStep, navCellSource } from '../../nav/cellGrid';
import { GridPlan } from '../../grid/gridPlan';
import { tileKey } from '../../nav/navTile';
import { ensureWallLab } from './wallLab';
import { WALL_LAB } from '../layout';
import { testPlan } from '../testPlan';

const plan = testPlan();
const grid = new CellGrid(
  navCellSource(plan.graph, (key) => plan.slopeAt(key), { voidIsFree: true }),
);

/** Wie der Spieler läuft: ganz, nur x, nur z, gar nicht (`PhysicsLocomotion.gateCells`). */
function walk(from: { x: number; z: number }, dx: number, dz: number, frames = 300) {
  const memory = { lastFree: null as { x: number; z: number } | null };
  let p = { ...from };
  for (let i = 0; i < frames; i++) {
    const full = { x: p.x + dx, z: p.z + dz },
      alongX = { x: p.x + dx, z: p.z },
      alongZ = { x: p.x, z: p.z + dz };
    if (gateStep(grid, p, full, memory)) p = full;
    else if (gateStep(grid, p, alongX, memory)) p = alongX;
    else if (gateStep(grid, p, alongZ, memory)) p = alongZ;
  }
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
    // „╱" über (13 + i, 6 − i): Die Linie ist x + z = X + Z + 20 (Meter).
    const line = X + Z + 20;
    for (const [dx, dz] of [
      [0.04, 0.04],
      [0.05, 0.02],
      [0.02, 0.05],
      [0.04, 0],
      [0, 0.04],
    ]) {
      const p = walk({ x: X + 13.5, z: Z + 4.5 }, dx!, dz!);
      expect(p.x + p.z).toBeLessThan(line);
    }
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
  it('bekommt ihn dazu — Boden, Wände und Schrägen', () => {
    const old = new GridPlan([0]);
    old.floor({ x: -2, z: -2, w: 4, d: 4 });
    ensureWallLab(old);
    expect(old.graph.has(tileKey(X, Z, 0))).toBe(true);
    expect(old.slopeAt(tileKey(X + 13, Z + 6, 0))).toBe('slash');
    // Ein zweites Mal ändert nichts.
    const version = old.version;
    ensureWallLab(old);
    expect(old.version).toBe(version);
  });
});
