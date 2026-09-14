import { TILE } from '../nav/navTile';
import { FloorModel } from './flatFloor';
import { freshFigure, stepFigure } from './flatFigure';
import { TERRAIN_STEP, terrainGraph } from './terrainGraph';

/**
 * **Ein Gelände als Raster**: sanfte Hänge geht man hinauf, steile nicht,
 * und die Höhe unter den Füßen kommt aus dem Höhenfeld.
 */
describe('Das Gelände als Raster', () => {
  const gentle = (x: number): number => Math.max(0, x) * 0.3; // 0,75 m je Kachel
  const cliff = (x: number): number => (x > 10 ? 6 : 0);
  const bounds = { minX: 0, minZ: 0, maxX: 25, maxZ: 5 };

  it('trägt einen sanften Hang hinauf, mit der Höhe des Feldes unter den Füßen', () => {
    const terrain = { heightAt: gentle, bounds, step: TERRAIN_STEP };
    const graph = terrainGraph(terrain);
    expect(graph.size).toBe(10 * 2);
    const floor = new FloorModel(graph, { heightAt: (x) => gentle(x), step: TERRAIN_STEP });
    const figure = freshFigure({ x: 1, z: 1.25, level: 0 });
    for (let i = 0; i < 60; i++) stepFigure(floor, figure, { x: 1, z: 0, sprint: false }, 0.1);
    expect(figure.x).toBeGreaterThan(5 * TILE);
    expect(floor.height(figure)).toBeCloseTo(gentle(figure.x));
  });

  it('hält vor einer Felsstufe an', () => {
    const graph = terrainGraph({ heightAt: cliff, bounds });
    const floor = new FloorModel(graph, { heightAt: (x) => cliff(x), step: TERRAIN_STEP });
    const figure = freshFigure({ x: 1, z: 1.25, level: 0 });
    for (let i = 0; i < 60; i++) stepFigure(floor, figure, { x: 1, z: 0, sprint: false }, 0.1);
    expect(figure.x).toBeLessThan(10);
  });
});
