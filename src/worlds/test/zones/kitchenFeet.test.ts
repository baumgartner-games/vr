import { CellGrid, footprintCellKeys, navCellSource } from '../../nav/cellGrid';
import { PLAYER_PLANE_RADIUS, slideOnCells } from '../../nav/planeMove';
import { testPlan } from '../testPlan';
import { kitchenBlocks, type KitchenBlock } from './kitchenBlocks';

/**
 * **Auf ein Küchenmöbel kommt man nicht, auch nicht, wenn man lange dagegen
 * läuft.**
 *
 * Gemeldet: _„ich komme als Spieler auf Möbel rauf wie in der Küche, wenn ich
 * nur einfach dagegen laufe … auf dem 2D-Grid die Logik behalten"_. Die Küche
 * stand nur als Körper in der Physik; die Ebene, in der der Spieler geht,
 * kannte sie nicht. Jetzt sperrt jeder Kasten seine Zellen
 * (`KitchenZone.footprintCells`, `TestWorld.cellBlocked`) — hier dieselbe
 * Rechnung gegen den Grundriss der Testwelt, ohne Szene.
 */
const blocks = kitchenBlocks().map((one) => one.block);
const cells = new Set(blocks.flatMap((b) => footprintCellKeys(b.x, b.z, b.w, b.d)));
const plan = testPlan();
const grid = new CellGrid(
  navCellSource(plan.graph, () => null, {
    voidIsFree: true,
    blocked: (ix, iz, level) => level === 0 && cells.has(`${ix},${iz},${level}`),
  }),
);

function inside(b: KitchenBlock, x: number, z: number, margin = 0): boolean {
  return Math.abs(x - b.x) < b.w / 2 + margin && Math.abs(z - b.z) < b.d / 2 + margin;
}

describe('die Füße in der Küche', () => {
  it('trägt jede Zelle unter einem Möbel als gesperrt ein', () => {
    for (const b of blocks) {
      const keys = footprintCellKeys(b.x, b.z, b.w, b.d);
      expect(keys.length).toBeGreaterThanOrEqual(4);
      for (const key of keys) {
        const [ix, iz] = key.split(',').map(Number) as [number, number];
        expect(grid.cellSolid(ix, iz, 0)).toBe(true);
      }
    }
  });

  it('läuft aus allen vier Richtungen gegen jedes Möbel und steht nie darauf', () => {
    const dirs: ReadonlyArray<readonly [number, number]> = [
      [0, -1],
      [0, 1],
      [1, 0],
      [-1, 0],
    ];
    let tried = 0;
    for (const b of blocks) {
      for (const [ux, uz] of dirs) {
        // Einen Meter vor der Seite, von der aus gelaufen wird.
        const x = b.x - ux * (b.w / 2 + 1);
        const z = b.z - uz * (b.d / 2 + 1);
        if (blocks.some((other) => inside(other, x, z, PLAYER_PLANE_RADIUS))) continue;
        tried++;
        let p = { x, z };
        for (let i = 0; i < 200; i++) p = slideOnCells(grid, p.x, p.z, ux * 0.05, uz * 0.05);
        for (const other of blocks) expect(inside(other, p.x, p.z)).toBe(false);
      }
    }
    expect(tried).toBeGreaterThan(20);
  });
});
