import { fillRect } from '../nav/navBuild';
import { NavGraph } from '../nav/navGraph';
import {
  CELL,
  CellGrid,
  cellKey,
  footprintCellKeys,
  navCellSource,
  standable,
  type CellPos,
} from '../nav/cellGrid';

/**
 * **Was `GridWorld.blockFootprint` verspricht** — geprüft an derselben Kette,
 * durch die die Welt es schickt: Schlüssel aus `footprintCellKeys` in eine
 * Menge, die Menge als `blocked` in `navCellSource` (so fragt `cellTaken`),
 * darauf ein `CellGrid`. Eine `GridWorld` selbst braucht WebGL und Rapier;
 * was sie hier hinzufügt, ist genau diese Menge und diese Frage.
 */
function world(): {
  grid: CellGrid;
  block: (cx: number, cz: number, w: number, d: number) => void;
} {
  const graph = new NavGraph([0]);
  fillRect(graph, { x: 0, z: 0, w: 10, d: 8 });
  const blocked = new Set<string>();
  const grid = new CellGrid(
    navCellSource(graph, () => null, {
      voidIsFree: true,
      blocked: (ix, iz, level) => blocked.has(cellKey(ix, iz, level)),
    }),
  );
  const block = (cx: number, cz: number, w: number, d: number): void => {
    for (const key of footprintCellKeys(cx, cz, w, d)) blocked.add(key);
  };
  return { grid, block };
}

/** Die vier Richtungen, aus denen man auf ein Möbel zuläuft. */
const SIDES: ReadonlyArray<readonly [string, number, number]> = [
  ['Westen', -1, 0],
  ['Osten', 1, 0],
  ['Norden', 0, -1],
  ['Süden', 0, 1],
];

describe('GridWorld.blockFootprint — Möbel sperren ihre Zellen', () => {
  it('sperrt für eine Kachel genau ihre vier Zellen', () => {
    // Die Kachel (3, 2): Mitte bei (3,5 | 2,5), ein Meter im Quadrat.
    expect(footprintCellKeys(3.5, 2.5, 1, 1).sort()).toEqual(
      [cellKey(6, 4), cellKey(7, 4), cellKey(6, 5), cellKey(7, 5)].sort(),
    );
    const { grid, block } = world();
    block(3.5, 2.5, 1, 1);
    for (let iz = 2; iz <= 7; iz++)
      for (let ix = 4; ix <= 9; ix++) {
        const inside = ix >= 6 && ix <= 7 && iz >= 4 && iz <= 5;
        expect(grid.cellFree(ix, iz)).toBe(!inside);
      }
  });

  it('lässt keinen 2 × 2-Block hinein — aus keiner der vier Richtungen', () => {
    const { grid, block } = world();
    block(3.5, 2.5, 1, 1);
    // Stellungen eines 2 × 2-Blocks liegen auf Zellecken; die Kachel reicht
    // von Zelle 6 bis 7, ein Block bei `cx` belegt `cx − 1` und `cx`. Der
    // letzte freie Platz davor ist also 5 (bzw. 9 von Osten), der erste
    // gesperrte 6 (bzw. 8).
    const centre: CellPos = { cx: 7, cz: 5 };
    for (const [side, dx, dz] of SIDES) {
      const outside = { cx: centre.cx + dx * 2, cz: centre.cz + dz * 2 };
      const touching = { cx: centre.cx + dx, cz: centre.cz + dz };
      expect({ side, free: grid.footprintFree(outside) }).toEqual({ side, free: true });
      expect({ side, step: grid.canStep(outside, touching) }).toEqual({ side, step: false });
    }
    // Und über Eck ebenso wenig.
    expect(grid.canStep({ cx: 5, cz: 3 }, { cx: 6, cz: 4 })).toBe(false);
    expect(grid.canStep({ cx: 9, cz: 7 }, { cx: 8, cz: 6 })).toBe(false);
  });

  it('lässt den Spieler auf der Kachel nirgends stehen, daneben aber schon', () => {
    const { grid, block } = world();
    block(3.5, 2.5, 1, 1);
    for (const x of [3.1, 3.5, 3.9])
      for (const z of [2.1, 2.5, 2.9]) expect(standable(grid, x, z)).toBe(false);
    // Einen halben Meter vor der Vorderkante (Figur 2 × 2 Zellen: ein Meter breit).
    expect(standable(grid, 3.5, 3.5 + CELL)).toBe(true);
  });

  it('sperrt für einen Tisch auf 2 × 2 Kacheln sechzehn Zellen, und keine daneben', () => {
    const { grid, block } = world();
    // Mitte auf der Kachelecke (5 | 4): Kacheln 4…5 × 3…4.
    block(5, 4, 2, 2);
    expect(footprintCellKeys(5, 4, 2, 2)).toHaveLength(16);
    for (let iz = 5; iz <= 10; iz++)
      for (let ix = 7; ix <= 12; ix++) {
        const inside = ix >= 8 && ix <= 11 && iz >= 6 && iz <= 9;
        expect(grid.cellFree(ix, iz)).toBe(!inside);
      }
    // Von jeder Seite: der Platz davor frei, der Schritt hinein nicht.
    expect(grid.canStep({ cx: 7, cz: 8 }, { cx: 8, cz: 8 })).toBe(false);
    expect(grid.canStep({ cx: 13, cz: 8 }, { cx: 12, cz: 8 })).toBe(false);
    expect(grid.canStep({ cx: 10, cz: 5 }, { cx: 10, cz: 6 })).toBe(false);
    expect(grid.canStep({ cx: 10, cz: 11 }, { cx: 10, cz: 10 })).toBe(false);
    for (const at of [
      { cx: 7, cz: 8 },
      { cx: 13, cz: 8 },
      { cx: 10, cz: 5 },
      { cx: 10, cz: 11 },
    ])
      expect(grid.footprintFree(at)).toBe(true);
  });
});
