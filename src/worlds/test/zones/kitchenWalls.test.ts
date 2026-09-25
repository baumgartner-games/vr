import { MODEL_ARCHES } from '../../portal/props';
import { wallCells } from '../../portal/gridSnap';
import { kitchenWallModels } from './kitchenWalls';

/** Die halben Grundflächen, nachgemessen an den Dateien (× 0,5 wie alles aus der Werkstatt). */
const HALVES: Record<string, { x: number; z: number }> = {
  'restaurant-bits/wall.glb': { x: 1, z: 0.125 },
  'restaurant-bits/wall_half.glb': { x: 0.5, z: 0.125 },
  'restaurant-bits/wall_doorway.glb': { x: 1, z: 0.125 },
  'restaurant-bits/wall_window_closed_curtains_green.glb': { x: 1, z: 0.225 },
};

describe('Die Küchenwände aus dem Regal', () => {
  const walls = kitchenWallModels();

  it('rasten alle auf dem Gitter ein — gerade als Kanten, schräg als Schrägen', () => {
    for (const wall of walls) {
      const turn = { x: 0, y: Math.sin(wall.yaw / 2), z: 0, w: Math.cos(wall.yaw / 2) };
      const cells = wallCells(
        wall.x,
        wall.z,
        turn,
        HALVES[wall.path]!,
        undefined,
        MODEL_ARCHES[wall.path],
      );
      expect({ wall, snapped: cells !== null }).toEqual({ wall, snapped: true });
    }
  });

  it('teilen keine Fuge — nichts steht doppelt', () => {
    const seen = new Map<string, number>();
    walls.forEach((wall, index) => {
      const turn = { x: 0, y: Math.sin(wall.yaw / 2), z: 0, w: Math.cos(wall.yaw / 2) };
      const cells = wallCells(wall.x, wall.z, turn, HALVES[wall.path]!)!;
      for (const edge of cells.edges) {
        const key = `${edge.x},${edge.z},${edge.dir}`;
        expect({ key, first: seen.get(key) ?? index }).toEqual({ key, first: index });
        seen.set(key, index);
      }
    });
  });

  it('lässt die Durchgänge offen', () => {
    const door = walls.find((wall) => wall.path === 'restaurant-bits/wall_doorway.glb')!;
    const cells = wallCells(
      door.x,
      door.z,
      { x: 0, y: 0, z: 0, w: 1 },
      HALVES[door.path]!,
      undefined,
      MODEL_ARCHES[door.path],
    )!;
    expect(cells.edges).toHaveLength(0);
    // Zwei Pfosten, je eine Zelle zu beiden Seiten der Fuge.
    expect(cells.cells).toHaveLength(4);
  });
});
