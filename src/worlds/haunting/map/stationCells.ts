import {
  CellGrid,
  FOOTPRINT,
  boxCells,
  cellCentre,
  cellKey,
  moveOnCells,
  navCellSource,
  snapCell,
} from '../../nav/cellGrid';
import type { NavGraph } from '../../nav/navGraph';
import { missionExtent, type HouseSpec } from '../house';
import { StationTravelPlan } from '../stationTravelPlan';
import { fixtureBlocks } from './geometry';

/**
 * **Die Station auf dem Zellgitter** — dasselbe System wie in jeder anderen
 * Welt (`nav/cellGrid.ts`, `docs/agents/zellgitter.md`).
 *
 * Bis hierher hatte Haunting seine eigene Bewegung: Rechtecke mit
 * eingezogenen Rändern, Türinseln und Kreise um Möbel (`geometry.walkable`,
 * `slide`), dazu ein eigenes Raster für die Wegsuche. Jetzt entscheidet über
 * „kann man hier stehen, kommt man hier durch" auch in der Station allein das
 * Zellgitter:
 *
 * - **Wände und Türen** kommen aus dem Bauplan der Station (`housePlan` über
 *   `StationTravelPlan`) — derselbe Plan, aus dem die 3D-Hülle gebaut wird.
 *   Eine Tür ist offen, solange ihr Blatt offen ist; wer sie schließt, gibt
 *   ihre Kennung in die Liste (`grid(closed)`).
 * - **Die Einrichtung** sperrt ihre Zellen (`stationFixtureCells`): Jede
 *   Zelle, in die ein Möbel des Packers (`stationLayout`) mindestens 15 cm
 *   ragt — dieselbe Regel wie für die Möbel der anderen Welten
 *   (`GridPlan.furnitureCells`).
 * - **Figuren** stehen auf einem Block von `AGENT_CELLS` Zellen je Seite und
 *   bewegen sich mit `moveOnCells` — ganz, längs x, längs z oder gar nicht.
 *
 * Die Lehrzimmer des Testdecks gehören nicht dazu: Dort bewegt die Physik
 * (`HauntingWorld.kernelInput`, `canStand`).
 */

/** Wie viele Zellen je Seite Techniker und Monster belegen: 2 × 2, ein Meter. */
export const AGENT_CELLS = FOOTPRINT;

/**
 * **Wie weit zwei Figuren logisch auseinander stehen** — von Blockmitte zu
 * Blockmitte, nicht von der gezeichneten Stelle aus. Gezeichnet wird
 * dazwischen interpoliert; getroffen wird, wer auf dem Block steht.
 */
export function blockGap(
  a: { x: number; z: number },
  b: { x: number; z: number },
  size = AGENT_CELLS,
): number {
  const p = cellCentre(snapCell(a.x, a.z, size), size),
    q = cellCentre(snapCell(b.x, b.z, size), size);
  return Math.hypot(p.x - q.x, p.z - q.z);
}

/** So weit muss ein Möbel in eine Zelle ragen, damit es sie sperrt — wie `GridPlan`. */
const FIXTURE_OVERLAP = 0.15;

const fixtureCache = new WeakMap<HouseSpec, ReadonlySet<string>>();

/** Die Zellen, auf denen Einrichtung der Station steht, als `ix,iz,0`. */
export function stationFixtureCells(spec: HouseSpec): ReadonlySet<string> {
  const known = fixtureCache.get(spec);
  if (known) return known;
  const out = new Set<string>();
  for (const box of fixtureBlocks(spec))
    for (const cell of boxCells(box, FIXTURE_OVERLAP)) out.add(cellKey(cell.ix, cell.iz, 0));
  fixtureCache.set(spec, out);
  return out;
}

/**
 * Ein Zellgitter über einem Graphen der Station samt ihrer Einrichtung —
 * begrenzt auf Station und Zentrale (`missionExtent`): Die Lehrzimmer des
 * Testdecks stehen zwar im Graphen, gehören aber nicht zur Mission.
 */
export function stationCellGrid(spec: HouseSpec, graph: NavGraph): CellGrid {
  const fixtures = stationFixtureCells(spec);
  const extent = missionExtent(spec);
  const source = navCellSource(graph, () => null, {
    blocked: (ix, iz, level) => fixtures.has(cellKey(ix, iz, level)),
  });
  return new CellGrid({
    ...source,
    floor: (tx, tz, level) =>
      tx >= extent.x &&
      tx < extent.x + extent.w &&
      tz >= extent.z &&
      tz < extent.z + extent.d &&
      source.floor(tx, tz, level),
  });
}

/**
 * **Die Zellen einer laufenden Runde** — ein Graph, dessen Türen den
 * geschlossenen Blättern folgen, und das Gitter darauf.
 */
export class StationCells {
  private readonly travel = new StationTravelPlan();
  private cells: CellGrid | null = null;
  private cellsFor: NavGraph | null = null;

  constructor(private readonly spec: HouseSpec) {}

  /** Das Gitter mit diesen Türen zu — der Graph wird nur bei einer Änderung angefasst. */
  grid(closed: readonly string[]): CellGrid {
    const graph = this.travel.graph(this.spec, closed, false);
    if (this.cellsFor !== graph || !this.cells) {
      this.cellsFor = graph;
      this.cells = stationCellGrid(this.spec, graph);
    }
    return this.cells;
  }

  /** Ob eine Figur hier stehen kann: ihr Block ist frei. */
  canStand(closed: readonly string[], at: { x: number; z: number }, size = AGENT_CELLS): boolean {
    return this.grid(closed).footprintFree(snapCell(at.x, at.z, size), 0, size);
  }

  /** Ein Schritt auf dem Gitter (`moveOnCells`). */
  move(
    closed: readonly string[],
    at: { x: number; z: number },
    dx: number,
    dz: number,
    size = AGENT_CELLS,
  ): { x: number; z: number } {
    return moveOnCells(this.grid(closed), at, dx, dz, 0, size);
  }
}
