import {
  NO_CELL,
  cellAtPoint,
  cellAtRay,
  cellCentre,
  nearestCell,
  pageCount,
  rayToPlane,
  turnPage,
  type Cell,
  type Reach,
} from './bagGrid';

/** Dieselbe Aufteilung, mit der der Beutel arbeitet: drei mal zwei, 5,2 cm. */
const COLS = 3;
const ROWS = 2;
const CELL = 0.052;
const PER_PAGE = COLS * ROWS;

const CELLS: Cell[] = Array.from({ length: PER_PAGE }, (_, index) =>
  cellCentre(index, COLS, ROWS, CELL),
);

const REACH: Reach = { plane: 0.035, up: 0.13, down: 0.06, side: CELL * 0.6 };

describe('pageCount', () => {
  it('teilt die Sorten auf so viele Seiten auf, wie sie brauchen', () => {
    expect(pageCount(17, PER_PAGE)).toBe(3);
    expect(pageCount(12, PER_PAGE)).toBe(2);
    expect(pageCount(13, PER_PAGE)).toBe(3);
  });

  it('gibt auch für einen leeren Beutel eine Seite her', () => {
    expect(pageCount(0, PER_PAGE)).toBe(1);
    expect(pageCount(3, 0)).toBe(1);
  });
});

describe('turnPage', () => {
  it('blättert vorwärts und rückwärts', () => {
    expect(turnPage(0, 1, 3)).toBe(1);
    expect(turnPage(2, -1, 3)).toBe(1);
  });

  it('blättert im Kreis statt am Rand stehenzubleiben', () => {
    expect(turnPage(2, 1, 3)).toBe(0);
    expect(turnPage(0, -1, 3)).toBe(2);
  });

  it('bleibt bei einer einzigen Seite auf ihr', () => {
    expect(turnPage(0, 1, 1)).toBe(0);
    expect(turnPage(0, -1, 1)).toBe(0);
  });
});

describe('cellCentre', () => {
  it('legt das Raster um die Mitte des Beutels', () => {
    const middle = CELLS.reduce((sum, cell) => ({ x: sum.x + cell.x, z: sum.z + cell.z }), {
      x: 0,
      z: 0,
    });
    expect(middle.x).toBeCloseTo(0, 10);
    expect(middle.z).toBeCloseTo(0, 10);
  });

  it('setzt Spalten nach x und Zeilen nach z, je eine Fachbreite auseinander', () => {
    expect(CELLS[0]!).toEqual({ x: -CELL, z: -CELL / 2 });
    expect(CELLS[1]!.x).toBeCloseTo(0, 10);
    expect(CELLS[2]!.x).toBeCloseTo(CELL, 10);
    expect(CELLS[3]!.z).toBeCloseTo(CELL / 2, 10);
  });

  it('gibt keinem Fach die Stelle eines anderen', () => {
    const places = new Set(CELLS.map((cell) => `${cell.x.toFixed(6)}/${cell.z.toFixed(6)}`));
    expect(places.size).toBe(PER_PAGE);
  });
});

describe('nearestCell', () => {
  it('nimmt das Fach, über dessen Mitte gezeigt wird', () => {
    CELLS.forEach((cell, index) => {
      expect(nearestCell(cell.x, cell.z, CELLS, REACH.side)).toBe(index);
    });
  });

  it('nimmt bei einem Punkt zwischen zwei Fächern das nähere', () => {
    const left = CELLS[0]!;
    expect(nearestCell(left.x + CELL * 0.2, left.z, CELLS, REACH.side)).toBe(0);
  });

  it('lässt neben dem Raster alle Fächer kalt', () => {
    expect(nearestCell(CELL * 4, 0, CELLS, REACH.side)).toBe(NO_CELL);
  });
});

describe('cellAtPoint', () => {
  it('findet das Fach unter einer Fingerspitze in der Öffnung', () => {
    const cell = CELLS[4]!;
    expect(cellAtPoint({ x: cell.x, y: REACH.plane + 0.02, z: cell.z }, CELLS, REACH)).toBe(4);
  });

  it('lässt eine Hand hoch über dem Beutel in Ruhe', () => {
    const cell = CELLS[4]!;
    const above = { x: cell.x, y: REACH.plane + REACH.up + 0.01, z: cell.z };
    expect(cellAtPoint(above, CELLS, REACH)).toBe(NO_CELL);
  });

  it('lässt eine Hand unter dem Boden des Beutels in Ruhe', () => {
    const cell = CELLS[4]!;
    const below = { x: cell.x, y: REACH.plane - REACH.down - 0.01, z: cell.z };
    expect(cellAtPoint(below, CELLS, REACH)).toBe(NO_CELL);
  });
});

describe('rayToPlane', () => {
  it('trifft senkrecht von oben genau darunter', () => {
    const hit = rayToPlane({ x: 0.02, y: 0.5, z: -0.03 }, { x: 0, y: -1, z: 0 }, REACH.plane, 2);
    expect(hit).not.toBeNull();
    expect(hit!.x).toBeCloseTo(0.02, 10);
    expect(hit!.z).toBeCloseTo(-0.03, 10);
  });

  it('rechnet den schrägen Strahl auf die Ebene herunter', () => {
    // Ein halber Meter Fallhöhe bei 45°: der Treffer liegt einen halben Meter
    // weiter vorn.
    const drop = 0.5;
    const s = Math.SQRT1_2;
    const hit = rayToPlane(
      { x: 0, y: REACH.plane + drop, z: 0.5 },
      { x: 0, y: -s, z: -s },
      REACH.plane,
      4,
    );
    expect(hit).not.toBeNull();
    expect(hit!.z).toBeCloseTo(0.5 - drop, 10);
  });

  it('trifft nichts von unten, waagerecht oder nach oben', () => {
    expect(rayToPlane({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, REACH.plane, 2)).toBeNull();
    expect(rayToPlane({ x: 0, y: 0.5, z: 0 }, { x: 0, y: 0, z: -1 }, REACH.plane, 2)).toBeNull();
    // Von unterhalb der Ebene nach unten: der Strahl läuft von ihr weg.
    expect(
      rayToPlane({ x: 0, y: REACH.plane - 0.1, z: 0 }, { x: 0, y: -1, z: 0 }, REACH.plane, 2),
    ).toBeNull();
  });

  it('trifft nichts, was zu weit weg ist', () => {
    const far = { x: 0, y: REACH.plane + 3, z: 0 };
    expect(rayToPlane(far, { x: 0, y: -1, z: 0 }, REACH.plane, 1.5)).toBeNull();
  });
});

describe('cellAtRay', () => {
  it('zeigt aus der Entfernung auf dasselbe Fach wie ein Finger darüber', () => {
    CELLS.forEach((cell, index) => {
      const origin = { x: cell.x, y: REACH.plane + 0.6, z: cell.z + 0.6 };
      const direction = { x: 0, y: -Math.SQRT1_2, z: -Math.SQRT1_2 };
      expect(cellAtRay(origin, direction, CELLS, REACH, 1.5)).toBe(index);
      expect(cellAtPoint({ x: cell.x, y: REACH.plane, z: cell.z }, CELLS, REACH)).toBe(index);
    });
  });

  it('meint kein Fach, wenn der Strahl am Raster vorbeigeht', () => {
    const origin = { x: 0.4, y: REACH.plane + 0.5, z: 0 };
    expect(cellAtRay(origin, { x: 0, y: -1, z: 0 }, CELLS, REACH, 1.5)).toBe(NO_CELL);
  });
});
