import { slopeBlocks } from '../../nav/cellGrid';
import { keyLevel, keyX, keyZ } from '../../nav/navTile';
import { generateHouse } from '../house';
import { housePlan } from '../plan';
import { StationCells, stationCellGrid } from './stationCells';

/**
 * **An den schrägen Ecken der Station entlang** — wie in jeder anderen
 * Gitterwelt (`nav/planeMove.ts`).
 *
 * Gemeldet: _„auf der Testwelt klappt das Wandgleiten super, bei Haunting
 * anscheinend nicht"_. Der Techniker ging noch mit `moveOnCells` (ganz, nur x,
 * nur z, diagonal) und stockte an jeder Schräge.
 */
describe('Der Techniker an einer schrägen Wand', () => {
  const spec = generateHouse(1, 8);
  const plan = housePlan(spec);
  const grid = stationCellGrid(spec, plan.graph);
  const cells = new StationCells(spec);

  /** Jede Schräge der Station mit einer Stelle davor, auf der man steht. */
  function slants(): Array<{
    x: number;
    z: number;
    tx: number;
    tz: number;
    nx: number;
    nz: number;
  }> {
    const out = [];
    for (const key of plan.graph.tileKeys()) {
      if (keyLevel(key) !== 0) continue;
      const tx = keyX(key),
        tz = keyZ(key);
      const slope = grid.slopeAt(tx, tz);
      if (!slope) continue;
      // Nur die Mitte eines Laufs von mindestens drei Kacheln — an den Enden
      // stößt man gleich an die nächste Wand.
      const along = slope === 'slash' ? [1, -1] : [1, 1];
      if (
        grid.slopeAt(tx + along[0]!, tz + along[1]!) !== slope ||
        grid.slopeAt(tx - along[0]!, tz - along[1]!) !== slope
      )
        continue;
      // Die freie Zelle der Kachel, auf deren Seite Boden ist.
      for (const [sx, sz] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ] as const) {
        if (slopeBlocks(slope, sx, sz) || grid.cellSolid(tx * 2 + sx, tz * 2 + sz)) continue;
        // Die Normale der Linie, zur freien Zelle hin.
        const nx = sx === 0 ? -Math.SQRT1_2 : Math.SQRT1_2,
          nz = sz === 0 ? -Math.SQRT1_2 : Math.SQRT1_2;
        // Und dahinter muss Station sein, nicht das Nichts jenseits der Hülle.
        const solidAt = (d: number): boolean =>
          grid.cellSolid(Math.floor((tx + 0.5 + nx * d) * 2), Math.floor((tz + 0.5 + nz * d) * 2));
        if (solidAt(0.6) || solidAt(1.2)) continue;
        // Und die beiden Nachbarkacheln auf dieser Seite frei — keine
        // Mauerecke, die mit der Schräge eine Lücke bildet, schmaler als der
        // Techniker (dort bleibt er stehen, `planeMove.slideCircle`).
        const ox = tx + (nx > 0 ? 1 : -1),
          oz = tz + (nz > 0 ? 1 : -1);
        const open = (x: number, z: number): boolean =>
          !grid.slopeAt(x, z) &&
          !grid.cellSolid(x * 2, z * 2) &&
          !grid.cellSolid(x * 2 + 1, z * 2 + 1);
        if (!open(ox, tz) || !open(tx, oz)) continue;
        out.push({ x: tx + 0.5 + nx * 0.6, z: tz + 0.5 + nz * 0.6, tx, tz, nx, nz });
        break;
      }
    }
    return out;
  }

  it('hat Schrägen, an denen man es prüfen kann', () => {
    expect(slants().length).toBeGreaterThan(2);
  });

  it('gleitet an jeder Schräge entlang, ohne ein Bild stehen zu bleiben', () => {
    for (const one of slants()) {
      // Längs der Wand, in beide Richtungen, mit einem Zug hinein — so, wie
      // man am Stock drückt.
      for (const way of [1, -1]) {
        const tx = -one.nz * way,
          tz = one.nx * way;
        const dx = (tx * 0.9 - one.nx * 0.3) * 0.05,
          dz = (tz * 0.9 - one.nz * 0.3) * 0.05;
        let p = { x: one.x, z: one.z };
        let last: { x: number; z: number } | null = null;
        for (let i = 0; i < 8; i++) {
          const next = cells.slide([], p, dx, dz);
          const step = { x: next.x - p.x, z: next.z - p.z };
          // Jedes Bild ein Stück weiter, solange die Schräge daneben steht —
          // und, sobald man an ihr liegt, jedes Bild derselbe Schritt: kein
          // Zickzack aus „nur x", „nur z", „schräg".
          expect(Math.hypot(step.x, step.z)).toBeGreaterThan(0.02);
          if (last && i >= 4) {
            expect(step.x).toBeCloseTo(last.x, 4);
            expect(step.z).toBeCloseTo(last.z, 4);
          }
          last = step;
          p = next;
        }
      }
    }
  });

  it('bleibt in einer Ecke, schmaler als er, stehen, statt hin und her zu springen', () => {
    // Die Schräge „╲" auf (−8, −37) und zwei Mauerecken bilden ein Dreieck,
    // in das der Techniker nicht passt. Dort pendelte er Bild für Bild
    // zwischen zwei Stellen (`planeMove.slideCircle`).
    expect(grid.slopeAt(-8, -37)).toBe('backslash');
    let p = { x: -7.0757, z: -36.9243 };
    const trail: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < 30; i++) {
      p = cells.slide([], p, 0.0212, 0.0424);
      trail.push(p);
    }
    for (let i = trail.length - 10; i < trail.length; i++)
      expect(Math.hypot(trail[i]!.x - trail[i - 1]!.x, trail[i]!.z - trail[i - 1]!.z)).toBeLessThan(
        1e-6,
      );
  });
});
