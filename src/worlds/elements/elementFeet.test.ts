import { GridPlan } from '../grid/gridPlan';
import { CELL, CellGrid, navCellSource, type CellPos } from '../nav/cellGrid';
import { PLAYER_PLANE_RADIUS, slideOnCells } from '../nav/planeMove';
import { ELEMENTS } from './elementCatalog';
import { FACES, onCells, spotCells, spotElement, type ElementSpot } from './elementPlace';

/**
 * **Die Füße gegen jedes Spielelement** — kein Element lässt jemanden hinein,
 * aus keiner der vier Richtungen, wie auch immer es gedreht ist.
 *
 * Jedes Element des Katalogs steht dafür **allein** auf einem Boden, einmal
 * je Blickrichtung. Dieselbe Kette wie in einer Welt, ohne Szene: Das Element
 * sperrt seine Zellen (`elementPlace.spotCells` = `GridWorld.blockFootprint`),
 * die Menge geht als `blocked` in `navCellSource` (so fragt `cellTaken`),
 * darauf ein `CellGrid` — und dagegen läuft ein Block von 2 × 2 Zellen, so
 * groß wie die Figur (vgl. `grid/blockFootprint.test.ts`).
 *
 * Früher prüfte das das Test Restaurant über seine eigenen Stellen
 * (`restaurantFeet.test.ts`); die Welt ist leer, und die Zusage gehört ohnehin
 * dem Element und nicht einer Welt.
 */

/**
 * Wo das Element steht: mitten auf einem Boden von 17 × 17 Kacheln — so groß,
 * dass auch das Landungsschiff des Weltraums (6 × 5 Kacheln) in jeder
 * Drehung rundum Boden hat.
 */
const AT = { x: 5, z: 5 };
const plan = new GridPlan([0]);
plan.floor({ x: 0, z: 0, w: 17, d: 17 });

const grids = new Map<string, CellGrid>();

/** Das Gitter mit genau einer gesperrten Stelle — je Stelle einmal gebaut. */
function gridWith(spot: ElementSpot): CellGrid {
  // Gleiche Grundfläche, gleiches Gitter: Eine Kachel ist in jeder Drehung
  // dieselbe Kachel, und das Gitter zu bauen ist das Teure hier.
  const key = footprint(spot);
  const known = grids.get(key);
  if (known) return known;
  const cells = new Set(spotCells(spot));
  const grid = new CellGrid(
    navCellSource(plan.graph, () => null, {
      voidIsFree: false,
      blocked: (ix, iz, level) => level === 0 && cells.has(`${ix},${iz},${level}`),
    }),
  );
  grids.set(key, grid);
  return grid;
}

/** Die gesperrten Zellen einer Stelle als Schlüssel. */
function footprint(spot: ElementSpot): string {
  return [...spotCells(spot)].sort().join(' ');
}

/** Die Zellen eines Elements als Rechteck. */
function box(spot: ElementSpot): { x0: number; x1: number; z0: number; z1: number } {
  const keys = spotCells(spot).map((key) => key.split(',').map(Number) as [number, number]);
  const xs = keys.map(([x]) => x);
  const zs = keys.map(([, z]) => z);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}

/** Ob ein Punkt in den Zellen eines Elements liegt. */
function inside(spot: ElementSpot, x: number, z: number): boolean {
  const b = box(spot);
  return x > b.x0 * CELL && x < (b.x1 + 1) * CELL && z > b.z0 * CELL && z < (b.z1 + 1) * CELL;
}

/**
 * Jedes Element in jede Richtung — außer dem, durch das man läuft: Gras und
 * Blumen sperren nichts (`GameElement.solid`, `natureCatalog.test.ts`).
 */
const SPOTS: ElementSpot[] = ELEMENTS.flatMap((element) =>
  FACES.map((face) => ({ id: `${element.id}:${face}`, element: element.id, ...AT, face })),
).filter((spot) => spotCells(spot).length > 0);

describe('Spielelemente — die Füße', () => {
  it('sperrt jede Zelle unter jedem Element, in jeder Drehung', () => {
    for (const spot of SPOTS) {
      const grid = gridWith(spot);
      const cells = spotCells(spot);
      // Eine Kachel hat vier Zellen; ein schmaler Baum steht auf einer.
      expect(cells.length).toBeGreaterThanOrEqual(onCells(spotElement(spot)) ? 1 : 4);
      for (const key of cells) {
        const [ix, iz] = key.split(',').map(Number) as [number, number];
        expect({ id: spot.id, solid: grid.cellSolid(ix, iz, 0) }).toEqual({
          id: spot.id,
          solid: true,
        });
      }
    }
  });

  it('lässt keinen 2 × 2-Block hinein — aus keiner der vier Richtungen', () => {
    // Ein Baum auf einer Zelle ist schmaler als jeder Block: Hineinschieben
    // lässt sich da nichts, nur daneben stehen.
    for (const spot of SPOTS.filter((one) => !onCells(spotElement(one)))) {
      const grid = gridWith(spot);
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
      // Allein auf dem Boden ist jede Seite frei: Jeder Anlauf zählt.
      expect(approaches.length).toBeGreaterThanOrEqual(4);
      for (const [outside, touching] of approaches) {
        expect({ id: spot.id, outside, free: grid.footprintFree(outside) }).toEqual({
          id: spot.id,
          outside,
          free: true,
        });
        expect({ id: spot.id, touching, step: grid.canStep(outside, touching) }).toEqual({
          id: spot.id,
          touching,
          step: false,
        });
      }
    }
  });

  it('läuft lange gegen jedes Element und steht nie darauf', () => {
    const dirs: ReadonlyArray<readonly [number, number]> = [
      [0, -1],
      [0, 1],
      [1, 0],
      [-1, 0],
    ];
    // Das Gleiten hängt nur an den gesperrten Zellen — jede Grundfläche einmal.
    const seen = new Set<string>();
    for (const spot of SPOTS) {
      if (seen.has(footprint(spot))) continue;
      seen.add(footprint(spot));
      const grid = gridWith(spot);
      const b = box(spot);
      const cx = ((b.x0 + b.x1 + 1) / 2) * CELL;
      const cz = ((b.z0 + b.z1 + 1) / 2) * CELL;
      const hw = ((b.x1 - b.x0 + 1) / 2) * CELL;
      const hd = ((b.z1 - b.z0 + 1) / 2) * CELL;
      for (const [ux, uz] of dirs) {
        let p = {
          x: cx - ux * (hw + 1 + PLAYER_PLANE_RADIUS),
          z: cz - uz * (hd + 1 + PLAYER_PLANE_RADIUS),
        };
        for (let i = 0; i < 200; i++) p = slideOnCells(grid, p.x, p.z, ux * 0.05, uz * 0.05);
        expect({ id: spot.id, dir: [ux, uz], in: inside(spot, p.x, p.z) }).toEqual({
          id: spot.id,
          dir: [ux, uz],
          in: false,
        });
      }
    }
  });
});
