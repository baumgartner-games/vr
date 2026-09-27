import { spotCells, spotFace, spotFront, type ElementSpot } from '../elements/elementPlace';
import { CELL, CellGrid, navCellSource, standable, type CellPos } from '../nav/cellGrid';
import { PLAYER_PLANE_RADIUS, slideOnCells } from '../nav/planeMove';
import { MENU } from './guestWishes';
import {
  allElements,
  kitchenSpots,
  restaurantPlan,
  spawn,
  stationElements,
} from './restaurantPlan';

/**
 * **Die Füße im Test Restaurant** — kein Spielelement lässt jemanden hinein,
 * und vor jeder Station kann man stehen.
 *
 * Dieselbe Kette wie in der Welt, ohne Szene: Jedes Element sperrt seine
 * Zellen (`elementPlace.spotCells` = `GridWorld.blockFootprint`), die Menge
 * geht als `blocked` in `navCellSource` (so fragt `cellTaken`), darauf ein
 * `CellGrid` — und dagegen läuft ein Block von 2 × 2 Zellen, so groß wie die
 * Figur (vgl. `grid/blockFootprint.test.ts`, `test/zones/kitchenFeet.test.ts`).
 */
const spots = allElements(MENU.map((dish) => dish.id));
const cells = new Set(spots.flatMap(spotCells));
const plan = restaurantPlan();
const grid = new CellGrid(
  navCellSource(plan.graph, () => null, {
    voidIsFree: true,
    blocked: (ix, iz, level) => level === 0 && cells.has(`${ix},${iz},${level}`),
  }),
);

/** Die Zellen eines Elements als Rechteck. */
function box(spot: ElementSpot): { x0: number; x1: number; z0: number; z1: number } {
  const keys = spotCells(spot).map((key) => key.split(',').map(Number) as [number, number]);
  const xs = keys.map(([x]) => x);
  const zs = keys.map(([, z]) => z);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}

/** Ob ein Punkt in den Zellen eines Elements liegt. */
function inside(spot: ElementSpot, x: number, z: number, margin = 0): boolean {
  const b = box(spot);
  return (
    x > b.x0 * CELL - margin &&
    x < (b.x1 + 1) * CELL + margin &&
    z > b.z0 * CELL - margin &&
    z < (b.z1 + 1) * CELL + margin
  );
}

describe('Test Restaurant — die Füße', () => {
  it('sperrt jede Zelle unter jedem Element', () => {
    for (const spot of spots)
      for (const key of spotCells(spot)) {
        const [ix, iz] = key.split(',').map(Number) as [number, number];
        expect({ id: spot.id, solid: grid.cellSolid(ix, iz, 0) }).toEqual({
          id: spot.id,
          solid: true,
        });
      }
  });

  it('lässt keinen 2 × 2-Block in ein Element — aus keiner der vier Richtungen', () => {
    let tried = 0;
    for (const spot of spots) {
      const b = box(spot);
      // Ein Block bei `cx` belegt `cx − 1` und `cx`: davor steht er bei
      // `x0 − 1`, hinein ginge es bei `x0` — von Osten `x1 + 2` und `x1 + 1`.
      const approaches: Array<[CellPos, CellPos]> = [];
      for (let cz = b.z0 + 1; cz <= b.z1; cz++) {
        approaches.push([
          { cx: b.x0 - 1, cz },
          { cx: b.x0, cz },
        ]);
        approaches.push([
          { cx: b.x1 + 2, cz },
          { cx: b.x1 + 1, cz },
        ]);
      }
      for (let cx = b.x0 + 1; cx <= b.x1; cx++) {
        approaches.push([
          { cx, cz: b.z0 - 1 },
          { cx, cz: b.z0 },
        ]);
        approaches.push([
          { cx, cz: b.z1 + 2 },
          { cx, cz: b.z1 + 1 },
        ]);
      }
      for (const [outside, touching] of approaches) {
        if (!grid.footprintFree(outside)) continue;
        tried++;
        expect({ id: spot.id, touching, step: grid.canStep(outside, touching) }).toEqual({
          id: spot.id,
          touching,
          step: false,
        });
      }
    }
    expect(tried).toBeGreaterThan(spots.length * 2);
  });

  it('läuft lange gegen jedes Element und steht nie darauf', () => {
    const dirs: ReadonlyArray<readonly [number, number]> = [
      [0, -1],
      [0, 1],
      [1, 0],
      [-1, 0],
    ];
    let tried = 0;
    for (const spot of spots) {
      const b = box(spot);
      const cx = ((b.x0 + b.x1 + 1) / 2) * CELL;
      const cz = ((b.z0 + b.z1 + 1) / 2) * CELL;
      const hw = ((b.x1 - b.x0 + 1) / 2) * CELL;
      const hd = ((b.z1 - b.z0 + 1) / 2) * CELL;
      for (const [ux, uz] of dirs) {
        const x = cx - ux * (hw + 1);
        const z = cz - uz * (hd + 1);
        if (spots.some((other) => inside(other, x, z, PLAYER_PLANE_RADIUS))) continue;
        tried++;
        let p = { x, z };
        for (let i = 0; i < 200; i++) p = slideOnCells(grid, p.x, p.z, ux * 0.05, uz * 0.05);
        for (const other of spots)
          expect({ id: other.id, in: inside(other, p.x, p.z) }).toEqual({
            id: other.id,
            in: false,
          });
      }
    }
    expect(tried).toBeGreaterThan(40);
  });

  it('kommt vom Ankunftsort vor jede Station — auch in den Gang zwischen zwei Reihen', () => {
    const start = spawn();
    const from: CellPos = { cx: Math.round(start.x / CELL), cz: Math.round(start.z / CELL) };
    expect(grid.footprintFree(from)).toBe(true);
    let checked = 0;
    for (const kitchen of kitchenSpots())
      for (const spot of stationElements(kitchen)) {
        // Ein halber Meter vor der Vorderkante: Dort steht die Figur.
        const front = spotFront(spot);
        const out = spotFace(spot) === 'S' ? 0.5 : -0.5;
        const at = { x: front.x, z: front.z + out };
        expect({ id: spot.id, standable: standable(grid, at.x, at.z) }).toEqual({
          id: spot.id,
          standable: true,
        });
        const to: CellPos = { cx: Math.round(at.x / CELL), cz: Math.round(at.z / CELL) };
        expect({ id: spot.id, path: grid.findPath(from, to) !== null }).toEqual({
          id: spot.id,
          path: true,
        });
        checked++;
      }
    expect(checked).toBeGreaterThan(30);
  });
});
