import { housePlan } from '../plan';
import { generateHouse } from '../house';
import { runPieces, WALL_REACH, wallRun } from './stationWalls';
import { PLAN_WALL_H } from '../../editor/levelPlan';

/**
 * **Die Wände der Station aus dem Regal** — nachgerechnet, was ohne Brille
 * nachzurechnen ist: welche Quader Läufe sind, und womit ein Lauf belegt wird.
 */
describe('Wandläufe der Station', () => {
  const solids = housePlan(generateHouse(1, 14)).solids();

  it('sind die vollen Wände — Tür- und Fensterteile bleiben Quader', () => {
    const runs = solids.filter((solid) => wallRun(solid) !== null);
    expect(runs.length).toBeGreaterThan(50);
    for (const solid of runs) expect(solid.h).toBeCloseTo(PLAN_WALL_H, 6);
    // Ein Sturz über einer Tür ist kürzer als die Wand, ein Fensterpfosten keine Kachel lang.
    const parts = solids.filter((solid) => solid.kind === 'wall' && wallRun(solid) === null);
    expect(parts.length).toBeGreaterThan(0);
    expect(solids.filter((solid) => solid.door).every((solid) => wallRun(solid) === null)).toBe(
      true,
    );
  });

  it('werden mit Stücken von zwei Kacheln belegt und am ungeraden Ende mit einem halben', () => {
    const run = { x: 0, z: 0, length: 5, alongX: true, base: 0, height: PLAN_WALL_H };
    const pieces = runPieces(run);
    expect(pieces.map((piece) => piece.half)).toEqual([false, false, true]);
    // Lückenlos von einem Ende zum anderen, um `WALL_REACH` hinaus.
    const first = pieces[0]!;
    const last = pieces[pieces.length - 1]!;
    expect(first.along - first.length / 2).toBeCloseTo(-run.length / 2 - WALL_REACH, 6);
    expect(last.along + last.length / 2).toBeCloseTo(run.length / 2 + WALL_REACH, 6);
    for (let i = 1; i < pieces.length; i++) {
      const a = pieces[i - 1]!;
      const b = pieces[i]!;
      expect(a.along + a.length / 2).toBeCloseTo(b.along - b.length / 2, 6);
    }
  });

  it('und ein Lauf von einer Kachel ist ein halbes Stück', () => {
    const pieces = runPieces({ x: 0, z: 0, length: 1, alongX: false, base: 0, height: 2.8 });
    expect(pieces).toHaveLength(1);
    expect(pieces[0]!.half).toBe(true);
  });
});

describe('Schräge Wände der Station', () => {
  it('macht aus jeder Schräge ein gedrehtes Stück über die Diagonale', () => {
    const plan = housePlan(generateHouse(3, 14));
    const slanted = plan.solids().filter((solid) => solid.yaw);
    expect(slanted.length).toBeGreaterThan(0);
    for (const solid of slanted) {
      const run = wallRun(solid)!;
      expect(run).not.toBeNull();
      expect(Math.abs(run.yaw!)).toBeCloseTo(Math.PI / 4);
      expect(run.length).toBeCloseTo(Math.SQRT2);
      const pieces = runPieces(run);
      expect(pieces).toHaveLength(1);
      expect(pieces[0]!.length).toBeCloseTo(Math.SQRT2 + 2 * WALL_REACH);
      expect(run.height).toBeCloseTo(PLAN_WALL_H);
    }
  });
});
