import { generateHouse } from './house';
import { housePlan } from './plan';
import { clearPlanWalls, planShelfWalls, SHELF_WALL } from '../grid/shelfWalls';
import { keyLevel, keyX, keyZ, wallDir, wallTile, DIR_N } from '../nav/navTile';
import { wallCells } from '../portal/gridSnap';

/**
 * **Die Wände der Station aus dem Regal** (`HauntingWorld.placeStationWalls`)
 * — sie sperren genau die Kanten und Schrägen, die vorher der Plan sperrte,
 * jede einmal: keine Lücke, kein Stück doppelt. Gerechnet wie in der Welt
 * (`gridSnap.wallCells`, `GridWorld.collectWalls`), mit den Maßen der
 * Prototyp-Wand.
 */
describe('Die Station aus Regalwänden', () => {
  for (const test of [false, true])
    it(`deckt jede feste Wand und jede Schräge genau einmal${test ? ' — mit Testdeck' : ''}`, () => {
      const plan = housePlan(generateHouse(1, 8), new Set(), test);
      const wanted = new Set<string>();
      for (const [key, wall] of plan.graph.wallEntries()) {
        if (wall.kind !== 'solid') continue;
        const tile = wallTile(key);
        expect(keyLevel(tile)).toBe(0);
        wanted.add(
          wallDir(key) === DIR_N
            ? `${keyX(tile)},${keyZ(tile)},n`
            : `${keyX(tile) + 1},${keyZ(tile)},w`,
        );
      }
      const wantedSlopes = new Set(
        plan.saveSlopes().map(({ tile, slope }) => `${keyX(tile)},${keyZ(tile)},${slope}`),
      );
      expect(wanted.size).toBeGreaterThan(50);

      const edges: string[] = [];
      const slopes: string[] = [];
      for (const wall of planShelfWalls(plan)) {
        const half = { x: wall.path === SHELF_WALL ? 1 : 0.5, z: 0.185 };
        const turn = { x: 0, y: Math.sin(wall.yaw / 2), z: 0, w: Math.cos(wall.yaw / 2) };
        const cells = wallCells(wall.x, wall.z, turn, half);
        expect(cells).not.toBeNull();
        for (const edge of cells!.edges) edges.push(`${edge.x},${edge.z},${edge.dir}`);
        for (const one of cells!.slopes) slopes.push(`${one.x},${one.z},${one.slope}`);
      }
      expect(new Set(edges).size).toBe(edges.length);
      expect(new Set(edges)).toEqual(wanted);
      expect(new Set(slopes).size).toBe(slopes.length);
      expect(new Set(slopes)).toEqual(wantedSlopes);
    });

  it('lässt dem Plan nur Türen und Fenster (`clearPlanWalls`)', () => {
    const plan = housePlan(generateHouse(1, 8));
    clearPlanWalls(plan);
    for (const [, wall] of plan.graph.wallEntries()) expect(wall.kind).not.toBe('solid');
    expect(plan.saveSlopes()).toEqual([]);
  });
});
