import { fillRect, setDoor, wallRect } from './navBuild';
import { NavGraph } from './navGraph';
import { DIR_E, tileKey, type TileKey } from './navTile';
import {
  CELL,
  CellGrid,
  blockStart,
  cellsFor,
  moveOnCells,
  cellCentre,
  navCellSource,
  slopeBlocks,
  snapCell,
  type CellSource,
  type Slope,
} from './cellGrid';

/** Ein Zimmer von 4 × 3 Kacheln (0…3, 0…2) mit Außenwänden. */
function room(slopes = new Map<TileKey, Slope>()): { graph: NavGraph; grid: CellGrid } {
  const graph = new NavGraph([0]);
  fillRect(graph, { x: 0, z: 0, w: 4, d: 3 });
  wallRect(graph, { x: 0, z: 0, w: 4, d: 3 });
  return { graph, grid: new CellGrid(navCellSource(graph, (key) => slopes.get(key) ?? null)) };
}

/**
 * Ein Bild in **Zellen**: `#` ist gesperrt, `.` frei. Kanten gibt es darin
 * keine — es prüft nur die Regel für Blöcke und Schritte.
 */
class Picture extends CellGrid {
  constructor(private readonly rows: readonly string[]) {
    const always: CellSource = { floor: () => true, open: () => true, slope: () => null };
    super(always);
  }
  override cellFree(ix: number, iz: number): boolean {
    const row = this.rows[iz];
    return row !== undefined && row[ix] === '.';
  }
}

describe('Das Zellgitter — halbe Kacheln, Figuren auf 2×2', () => {
  it('rechnet in halben Metern', () => {
    expect(CELL).toBe(0.5);
    expect(snapCell(1.24, -0.26)).toEqual({ cx: 2, cz: -1 });
    expect(cellCentre({ cx: 3, cz: -2 })).toEqual({ x: 1.5, z: -1 });
  });

  it('stellt eine Figur auf jede Kachel und auf jede Fuge ohne Wand', () => {
    const { grid } = room();
    // Kachelmitten (ungerade Zellzahl) und Fugen zwischen zwei Kacheln (gerade).
    expect(grid.footprintFree({ cx: 1, cz: 1 })).toBe(true);
    expect(grid.footprintFree({ cx: 2, cz: 1 })).toBe(true);
    expect(grid.footprintFree({ cx: 2, cz: 2 })).toBe(true);
    // Mit dem Rücken zur Außenwand passt niemand über sie hinaus.
    expect(grid.footprintFree({ cx: 0, cz: 1 })).toBe(false);
    expect(grid.footprintFree({ cx: 8, cz: 1 })).toBe(false);
    expect(grid.footprintFree({ cx: 7, cz: 5 })).toBe(true);
  });

  it('sperrt eine Fuge, über die eine Wand läuft — und öffnet sie mit der Tür', () => {
    const { graph, grid } = room();
    graph.setWall(tileKey(1, 1), DIR_E, { kind: 'solid' });
    // Die Fuge x = 2 m in Zeile 1: zwischen Kachel 1 und 2.
    expect(grid.footprintFree({ cx: 4, cz: 3 })).toBe(false);
    // Eine Zeile höher ist dieselbe Fuge frei — die Wand ist nur eine Kachel lang.
    expect(grid.footprintFree({ cx: 4, cz: 1 })).toBe(true);
    // Halb über der Wand geht auch nicht: Mitte auf der Kachelgrenze z = 1 m.
    expect(grid.footprintFree({ cx: 4, cz: 2 })).toBe(false);
    setDoor(graph, tileKey(1, 1), DIR_E, 'd', true);
    expect(grid.footprintFree({ cx: 4, cz: 3 })).toBe(true);
    setDoor(graph, tileKey(1, 1), DIR_E, 'd', false);
    expect(grid.footprintFree({ cx: 4, cz: 3 })).toBe(false);
  });

  it('lässt eine Schräge zwei Zellen ihrer Kachel sperren — [ ][x] / [x][ ]', () => {
    expect(slopeBlocks('slash', 1, 0)).toBe(true);
    expect(slopeBlocks('slash', 0, 1)).toBe(true);
    expect(slopeBlocks('slash', 0, 0)).toBe(false);
    expect(slopeBlocks('slash', 1, 1)).toBe(false);
    expect(slopeBlocks('backslash', 0, 0)).toBe(true);
    expect(slopeBlocks('backslash', 1, 1)).toBe(true);
    const { grid } = room(new Map([[tileKey(2, 1), 'slash' as Slope]]));
    // Kachel (2, 1) sind die Zellen 4…5 × 2…3.
    expect(grid.cellFree(5, 2)).toBe(false);
    expect(grid.cellFree(4, 3)).toBe(false);
    expect(grid.cellFree(4, 2)).toBe(true);
    expect(grid.cellFree(5, 3)).toBe(true);
    // Auf der Kachel selbst steht niemand mehr ...
    expect(grid.footprintFree({ cx: 5, cz: 3 })).toBe(false);
    // ... aber mit ihrer freien Nordwestzelle als Ecke des Blocks schon —
    // von Nordwesten an die Wand heran ...
    expect(grid.footprintFree({ cx: 4, cz: 2 })).toBe(true);
    // ... und genauso mit der Südostzelle, von der anderen Seite.
    expect(grid.footprintFree({ cx: 6, cz: 4 })).toBe(true);
    // Wer eine der beiden gesperrten Zellen mitnähme, passt nicht.
    expect(grid.footprintFree({ cx: 5, cz: 2 })).toBe(false);
    expect(grid.footprintFree({ cx: 4, cz: 3 })).toBe(false);
  });

  it('geht in acht Richtungen, und schräg zählt nur das Ziel — die Außenecke', () => {
    // Das Bild des Besitzers: zwei Hindernisse, die sich nur über Eck berühren.
    const grid = new Picture(['#..', '...', '..#']);
    const from = { cx: 1, cz: 2 }; // Zellen (0..1, 1..2)
    const to = { cx: 2, cz: 1 }; // Zellen (1..2, 0..1)
    expect(grid.footprintFree(from)).toBe(true);
    expect(grid.footprintFree(to)).toBe(true);
    // Beide geraden Zwischenstellungen sind versperrt ...
    expect(grid.footprintFree({ cx: 2, cz: 2 })).toBe(false);
    expect(grid.footprintFree({ cx: 1, cz: 1 })).toBe(false);
    // ... und trotzdem ist der Schrägschritt erlaubt.
    expect(grid.canStep(from, to)).toBe(true);
    // Zwei Zellen weit ist kein Schritt.
    expect(grid.canStep(from, { cx: 3, cz: 2 })).toBe(false);
  });

  it('findet einen Weg an einer Schräge entlang — schräg, ohne Zickzack', () => {
    // Eine Diagonale quer durch ein freies Feld: Zellen auf x + z = 7 gesperrt.
    const rows: string[] = [];
    for (let z = 0; z < 8; z++) {
      let row = '';
      for (let x = 0; x < 8; x++) row += x + z === 7 ? '#' : '.';
      rows.push(row);
    }
    const grid = new Picture(rows);
    const path = grid.findPath({ cx: 1, cz: 5 }, { cx: 5, cz: 1 });
    expect(path).not.toBeNull();
    // Nur Schrägschritte, auf der nordwestlichen Seite der Wand.
    expect(path!.length).toBe(5);
    for (let i = 1; i < path!.length; i++) {
      expect(Math.abs(path![i]!.cx - path![i - 1]!.cx)).toBe(1);
      expect(Math.abs(path![i]!.cz - path![i - 1]!.cz)).toBe(1);
    }
    // Durch die Wand hindurch gibt es keinen Weg auf die andere Seite.
    expect(grid.findPath({ cx: 1, cz: 1 }, { cx: 7, cz: 7 })).toBeNull();
  });

  it('findet die nächste freie Stellung und durchquert eine offene Tür', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 2, d: 1 });
    fillRect(graph, { x: 2, z: 0, w: 2, d: 1 });
    wallRect(graph, { x: 0, z: 0, w: 2, d: 1 });
    wallRect(graph, { x: 2, z: 0, w: 2, d: 1 });
    const grid = new CellGrid(navCellSource(graph, () => null));
    expect(grid.findPath({ cx: 1, cz: 1 }, { cx: 7, cz: 1 })).toBeNull();
    setDoor(graph, tileKey(1, 0), DIR_E, 'mitte', true);
    const path = grid.findPath({ cx: 1, cz: 1 }, { cx: 7, cz: 1 });
    expect(path?.map((at) => at.cx)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    // Nah an der Wand steht man logisch auf der Kachelmitte daneben.
    expect(grid.nearestFree(0.1, 0.3)).toEqual({ cx: 1, cz: 1 });
  });

  it('lässt den Spieler außerhalb des Grundrisses in Ruhe, wenn es verlangt ist', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 1, d: 1 });
    const strict = new CellGrid(navCellSource(graph, () => null));
    const loose = new CellGrid(navCellSource(graph, () => null, { voidIsFree: true }));
    expect(strict.footprintFree({ cx: 10, cz: 10 })).toBe(false);
    expect(loose.footprintFree({ cx: 10, cz: 10 })).toBe(true);
  });
});

describe('Blöcke jeder Größe und die eine Bewegung', () => {
  const open: CellSource = { floor: () => true, open: () => true, slope: () => null };

  it('stellt 1×1 in eine Zellmitte, 2×2 auf eine Zellecke, 3×3 wieder in eine Mitte', () => {
    expect(snapCell(0.3, 0.3, 1)).toEqual({ cx: 0, cz: 0 });
    expect(cellCentre({ cx: 0, cz: 0 }, 1)).toEqual({ x: 0.25, z: 0.25 });
    expect(snapCell(0.3, 0.3, 2)).toEqual({ cx: 1, cz: 1 });
    expect(snapCell(0.3, 0.3, 3)).toEqual({ cx: 0, cz: 0 });
    expect(blockStart(0, 3)).toBe(-1);
    expect(cellsFor(0.5)).toBe(1);
    expect(cellsFor(0.6)).toBe(2);
    expect(cellsFor(1)).toBe(2);
  });

  it('prüft jede Kachelkante im Inneren eines großen Blocks', () => {
    const { graph } = room();
    graph.setWall(tileKey(1, 1), DIR_E, { kind: 'solid' });
    const grid = new CellGrid(navCellSource(graph, () => null));
    // 1×1 passt neben die Wand, 3×3 über sie nicht.
    expect(grid.footprintFree({ cx: 3, cz: 3 }, 0, 1)).toBe(true);
    expect(grid.footprintFree({ cx: 4, cz: 3 }, 0, 3)).toBe(false);
    expect(grid.footprintFree({ cx: 5, cz: 3 }, 0, 3)).toBe(true);
  });

  it('gleitet an einer Wand entlang und kommt nicht hindurch', () => {
    const { grid } = room();
    // An der Nordwand: nach Norden geht nichts, schräg bleibt die Ostbewegung.
    const at = { x: 1.5, z: 0.5 };
    const moved = moveOnCells(grid, at, 0.2, -0.2);
    expect(moved.x).toBeCloseTo(1.7);
    expect(snapCell(moved.x, moved.z).cz).toBe(1);
    // Hundert kleine Schritte nach Westen enden an der Westwand, nicht dahinter.
    let p = { x: 1.5, z: 1.5 };
    for (let i = 0; i < 100; i++) p = moveOnCells(grid, p, -0.05, 0);
    expect(p.x).toBeGreaterThanOrEqual(0.25);
    expect(grid.footprintFree(snapCell(p.x, p.z))).toBe(true);
  });

  it('schlüpft in kleinen Schritten über Eck, wie es das Bild erlaubt', () => {
    // [w][ ][ ] / [p][p][ ] / [p][p][w] → rechts oben, in Zellen.
    const grid = new Picture(['#..', '...', '..#']);
    let p = cellCentre({ cx: 1, cz: 2 });
    for (let i = 0; i < 20; i++) p = moveOnCells(grid, p, 0.025, -0.025);
    expect(snapCell(p.x, p.z)).toEqual({ cx: 2, cz: 1 });
    // Gerade in die Ecke hinein geht es dagegen nicht.
    let q = cellCentre({ cx: 1, cz: 2 });
    for (let i = 0; i < 20; i++) q = moveOnCells(grid, q, 0.05, 0);
    expect(snapCell(q.x, q.z)).toEqual({ cx: 1, cz: 2 });
  });

  it('lässt aus einem gesperrten Block heraus', () => {
    const grid = new CellGrid({ ...open, floor: (tx) => tx >= 0 });
    const at = { x: 0.1, z: 1 };
    expect(grid.footprintFree(snapCell(at.x, at.z))).toBe(false);
    expect(moveOnCells(grid, at, 0.3, 0).x).toBeCloseTo(0.4);
  });
});
