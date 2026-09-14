import { flowField } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { TILE, keyLevel, tileKey, type TileKey } from '../nav/navTile';
import { solidBounds } from '../grid/solids';
import {
  BENCHES,
  COLS,
  COUNTERS,
  CRATES,
  CROSSING,
  GATE,
  MAP,
  MARKS,
  ROWS,
  SPAWN,
  STALLS,
  cellsOf,
  centreX,
  centreZ,
  markAt,
  streetPlan,
  tileX,
  tileZ,
  walkable,
} from './streetPlan';

const plan = streetPlan();
const at = (col: number, row: number, level = 0): TileKey => tileKey(tileX(col), tileZ(row), level);
const spawn = at(SPAWN.col, SPAWN.row);

/** Alle Kacheln, auf denen laut Zeichnung Boden liegt. */
function walkableCells(): { col: number; row: number }[] {
  const out: { col: number; row: number }[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (walkable(col, row)) out.push({ col, row });
    }
  }
  return out;
}

describe('Die Straßenküche als Zeichnung', () => {
  it('ist 24 mal 16 Kacheln, jede Zeile gleich lang', () => {
    expect(MAP).toHaveLength(ROWS);
    for (const line of MAP) expect(line).toHaveLength(COLS);
  });

  it('mauert die Karte ringsherum mit Bordstein zu', () => {
    for (let col = 0; col < COLS; col++) {
      expect(markAt(col, 0)).toBe(MARKS.kerb);
      expect(markAt(col, ROWS - 1)).toBe(MARKS.kerb);
    }
    for (let row = 0; row < ROWS; row++) {
      expect(markAt(0, row)).toBe(MARKS.kerb);
      expect(markAt(COLS - 1, row)).toBe(MARKS.kerb);
    }
  });

  /**
   * **Die Tabellen und die Zeichnung müssen sich einig sein.**
   *
   * Die Blickrichtung einer Küchenzeile steht in einer Tabelle, ihre Lage in
   * der Zeichnung — zwei Stellen, und deshalb dieser Test. Ohne ihn verschiebt
   * jemand ein `K` um eine Kachel, und die Zeile steht danach halb daneben,
   * ohne dass etwas fehlschlägt.
   */
  it('deckt jede Küchenzeile der Zeichnung mit genau einer Reihe der Tabelle ab', () => {
    const drawn = new Set(
      [...cellsOf(MARKS.counter), ...cellsOf(MARKS.stove)].map((one) => `${one.col},${one.row}`),
    );
    const listed = new Set<string>();
    for (const run of COUNTERS) {
      for (let i = 0; i < run.count; i++) {
        const key = `${run.along === 'x' ? run.col + i : run.col},${run.along === 'z' ? run.row + i : run.row}`;
        expect(listed.has(key)).toBe(false);
        listed.add(key);
      }
    }
    expect([...listed].sort()).toEqual([...drawn].sort());
  });

  it('deckt jeden Marktstand der Zeichnung mit genau einer Reihe der Tabelle ab', () => {
    const drawn = new Set(cellsOf(MARKS.stall).map((one) => `${one.col},${one.row}`));
    const listed = new Set<string>();
    for (const stall of STALLS) {
      for (let i = 0; i < stall.count; i++) {
        listed.add(
          `${stall.along === 'x' ? stall.col + i : stall.col},${stall.along === 'z' ? stall.row + i : stall.row}`,
        );
      }
    }
    expect([...listed].sort()).toEqual([...drawn].sort());
  });

  it('stellt jede Bank der Zeichnung auf', () => {
    const drawn = cellsOf(MARKS.bench).map((one) => `${one.col},${one.row}`);
    expect(BENCHES.map((one) => `${one.col},${one.row}`).sort()).toEqual(drawn.sort());
  });
});

describe('Die Straßenküche als Grundriss', () => {
  it('legt Boden auf alles außer Bordstein und Marktstand', () => {
    const cells = walkableCells();
    const ground = [...plan.graph.tileKeys()].filter((key) => keyLevel(key) === 0);
    expect(ground).toHaveLength(cells.length);
    for (const cell of cells) expect(plan.graph.has(at(cell.col, cell.row))).toBe(true);
    for (const stall of cellsOf(MARKS.stall)) {
      expect(plan.graph.has(at(stall.col, stall.row))).toBe(false);
    }
  });

  it('hält die Startkachel frei', () => {
    expect(walkable(SPAWN.col, SPAWN.row)).toBe(true);
    expect(plan.graph.has(spawn)).toBe(true);
    expect(plan.blocksOn(spawn)).toHaveLength(0);
    expect(plan.fixturesOn(spawn)).toHaveLength(0);
    // Und sie liegt auf der Fahrbahn, dort, wo die Zeichnung sie hinstellt.
    expect(markAt(SPAWN.col, SPAWN.row)).toBe(MARKS.street);
  });

  /**
   * **Der Test, wegen dem der Grundriss in einer eigenen Datei steht.**
   *
   * Eine Ecke, in die man nicht kommt, merkt man sonst erst nach dem Laden,
   * nach dem Aufsetzen, nach dem Hinlaufen. Hier fällt sie in Millisekunden
   * auf — und zwar für **jede** freie Kachel auf einmal, weil das
   * Strömungsfeld ohnehin alle erreichbaren auf einen Schlag durchrechnet
   * (`nav/navPath.flowField`).
   */
  it('lässt einen vom Startplatz auf jede freie Kachel laufen', () => {
    const field = flowField(plan.graph, [spawn], { profile: HUMAN_PROFILE });
    const stranded = walkableCells().filter((cell) => !field.cost.has(at(cell.col, cell.row)));
    expect(stranded).toEqual([]);
  });

  it('stellt das Tor zurück in den Hub auf', () => {
    const gates = plan.fixtures().filter((one) => one.kind === 'gate');
    expect(gates).toHaveLength(1);
    const gate = gates[0]!;
    expect(gate.props.world).toBe('hub');
    expect(gate.props.label).toBe('→ Hub');
    expect(typeof gate.props.accent).toBe('number');
    expect(gate.x).toBe(tileX(GATE.col));
    expect(gate.z).toBe(tileZ(GATE.row));
    // Es steht nicht auf der Startkachel — ein Tor neben dem Spawn ist eines,
    // durch das man beim ersten Schritt fällt.
    expect(
      Math.abs(gate.x - tileX(SPAWN.col)) + Math.abs(gate.z - tileZ(SPAWN.row)),
    ).toBeGreaterThan(2);
  });

  /** Auf dem Zebrastreifen steht nichts — sonst ist er keiner. */
  it('lässt den Zebrastreifen frei', () => {
    for (let dz = 0; dz < CROSSING.rows; dz++) {
      for (let dx = 0; dx < CROSSING.cols; dx++) {
        const col = CROSSING.col + dx;
        const row = CROSSING.row + dz;
        expect(markAt(col, row)).toBe(MARKS.zebra);
        const tile = at(col, row);
        expect(plan.blocksOn(tile)).toHaveLength(0);
        expect(plan.fixturesOn(tile)).toHaveLength(0);
      }
    }
    // Und keine Küchenzeile liegt darauf.
    for (const cell of [...cellsOf(MARKS.counter), ...cellsOf(MARKS.stove)]) {
      expect(cell.col >= CROSSING.col && cell.col < CROSSING.col + CROSSING.cols).toBe(false);
    }
  });

  it('setzt die Küchenzeilen und die Bänke als Bausteine', () => {
    const counters = plan.blocks().filter((one) => one.kind === 'counter');
    expect(counters).toHaveLength(COUNTERS.reduce((sum, run) => sum + run.count, 0));
    expect(plan.blocks().filter((one) => one.kind === 'bench')).toHaveLength(BENCHES.length);
  });

  it('macht die Kachel unter einer Küchenzeile teurer, ohne sie zu sperren', () => {
    const tile = at(COUNTERS[0]!.col, COUNTERS[0]!.row);
    expect(plan.graph.tile(tile)!.cost).toBeGreaterThan(1);
  });

  it('lässt die Kisten lose auf freien Kacheln liegen', () => {
    expect(CRATES.length).toBeGreaterThanOrEqual(3);
    for (const crate of CRATES) {
      expect(plan.graph.has(at(crate.col, crate.row))).toBe(true);
      expect(plan.blocksOn(at(crate.col, crate.row))).toHaveLength(0);
    }
  });

  it('hält eine zweite Etage für das Podest bereit — noch leer', () => {
    expect(plan.graph.levels).toHaveLength(2);
    expect([...plan.graph.tileKeys()].some((key) => keyLevel(key) === 1)).toBe(false);
  });

  it('legt einen einzigen portalfähigen Boden über die ganze Karte', () => {
    const ground = plan.solids().filter((one) => one.portal);
    expect(ground).toHaveLength(1);
    expect(ground[0]!.w).toBeCloseTo(COLS * TILE);
    expect(ground[0]!.d).toBeCloseTo(ROWS * TILE);
  });

  it('bleibt mit allem innerhalb des Bordsteins', () => {
    const box = solidBounds(plan.solids())!;
    expect(box.minX).toBeGreaterThanOrEqual(centreX(0) - TILE / 2 - 0.2);
    expect(box.maxX).toBeLessThanOrEqual(centreX(COLS - 1) + TILE / 2 + 0.2);
    expect(box.minZ).toBeGreaterThanOrEqual(centreZ(0) - TILE / 2 - 0.2);
    expect(box.maxZ).toBeLessThanOrEqual(centreZ(ROWS - 1) + TILE / 2 + 0.2);
  });

  it('legt die Mitte der Karte auf die Null, damit die Mittellinie dort liegt', () => {
    expect(tileX(COLS / 2)).toBe(0);
    expect(centreX(COLS / 2)).toBeCloseTo(TILE / 2);
  });
});
