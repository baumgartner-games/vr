/**
 * **Flächen setzen** (`areaPaint.ts`) — das Rechteck aus zwei Ecken, die
 * Stellen darin und die Auswahl zwischen Ziehen, Tippen und Nachfrage.
 */
import {
  AREA_CONFIRM,
  AreaSelect,
  areaCount,
  areaPlan,
  areaRect,
  areaSize,
  cornerAt,
  needsConfirm,
  tileAt,
  wallLine,
} from './areaPaint';

/** Eine Bodenplatte: eine Kachel, flach. */
const FLOOR = { x: 0.5, z: 0.5 };
/** Ein Tisch von zwei mal einer Kachel. */
const TABLE = { x: 1, z: 0.5 };
/** Eine Wand aus dem Regal: zwei Meter lang, 25 cm dick, von Westen nach Osten. */
const WALL = { x: 1, z: 0.125 };

describe('areaRect', () => {
  it('ist dasselbe Rechteck, in welcher Ecke man auch anfängt', () => {
    const a = areaRect({ col: 3, row: -2 }, { col: 1, row: 0 });
    const b = areaRect({ col: 1, row: 0 }, { col: 3, row: -2 });
    expect(a).toEqual(b);
    expect(a).toEqual({ minCol: 1, maxCol: 3, minRow: -2, maxRow: 0 });
    expect(areaCount(a)).toBe(9);
    expect(areaSize(a)).toBe('3 × 3');
  });

  it('fragt erst ab mehr als vier Kacheln', () => {
    expect(AREA_CONFIRM).toBe(4);
    expect(needsConfirm(areaRect({ col: 0, row: 0 }, { col: 1, row: 1 }))).toBe(false);
    expect(needsConfirm(areaRect({ col: 0, row: 0 }, { col: 4, row: 0 }))).toBe(true);
  });

  it('liest die Kachel wie die Positionsanzeige — mit floor, auch im Minus', () => {
    expect(tileAt(8.4, -33.1)).toEqual({ col: 8, row: -34 });
    expect(tileAt(Number.NaN, 0)).toBeNull();
  });
});

describe('areaPlan', () => {
  it('legt einen Boden auf jede Kachel, auf die Kachelmitte', () => {
    const plan = areaPlan(areaRect({ col: 0, row: 0 }, { col: 2, row: 1 }), FLOOR, 0);
    expect(plan.slots).toHaveLength(6);
    expect(plan.slots[0]).toEqual({ x: 0.5, z: 0.5, yaw: 0 });
    expect(plan.slots[5]).toEqual({ x: 2.5, z: 1.5, yaw: 0 });
    expect(plan.tiles).toHaveLength(6);
    expect(plan.edges).toHaveLength(0);
  });

  it('legt einen zwei Kacheln breiten Tisch auf jede zweite, auf die Fuge', () => {
    const plan = areaPlan(areaRect({ col: 0, row: 0 }, { col: 4, row: 0 }), TABLE, 0);
    // Fünf Kacheln breit: zwei Tische, und der Rest bleibt frei.
    expect(plan.slots.map((slot) => slot.x)).toEqual([1, 3]);
    expect(plan.tiles).toHaveLength(4);
  });

  it('dreht die Grundfläche mit dem, was in der Hand liegt', () => {
    const plan = areaPlan(areaRect({ col: 0, row: 0 }, { col: 0, row: 3 }), TABLE, Math.PI / 2);
    expect(plan.slots.map((slot) => slot.z)).toEqual([1, 3]);
    expect(plan.slots.every((slot) => slot.yaw === Math.PI / 2)).toBe(true);
  });

  it('setzt eines, auch wenn das Rechteck kleiner ist als das Stück', () => {
    expect(areaPlan(areaRect({ col: 0, row: 0 }, { col: 0, row: 0 }), TABLE, 0).slots).toHaveLength(
      1,
    );
  });

  it('zieht Wände um das Rechteck herum, quer gedreht, auf die Fugen', () => {
    const plan = areaPlan(areaRect({ col: 0, row: 0 }, { col: 3, row: 1 }), WALL, 0);
    // Vier breit, zwei tief: je zwei Wände oben und unten, je eine links und rechts.
    expect(plan.slots).toHaveLength(6);
    expect(plan.tiles).toHaveLength(0);
    const north = plan.slots.filter((slot) => slot.z === 0);
    expect(north.map((slot) => slot.x)).toEqual([1, 3]);
    expect(north.every((slot) => slot.yaw === 0)).toBe(true);
    const west = plan.slots.filter((slot) => slot.x === 0 && slot.yaw !== 0);
    expect(west).toEqual([{ x: 0, z: 1, yaw: Math.PI / 2 }]);
    // Je Kachel Wandlänge ein Stück Kante: 4 + 4 + 2 + 2.
    expect(plan.edges).toHaveLength(12);
  });

  it('macht aus einer einzigen Reihe eine gerade Wand', () => {
    const row = areaPlan(areaRect({ col: 0, row: 5 }, { col: 5, row: 5 }), WALL, 0);
    expect(row.slots.map((slot) => [slot.x, slot.z])).toEqual([
      [1, 5],
      [3, 5],
      [5, 5],
    ]);
    const column = areaPlan(areaRect({ col: 2, row: 0 }, { col: 2, row: 3 }), WALL, 0);
    expect(column.slots).toEqual([
      { x: 2, z: 1, yaw: Math.PI / 2 },
      { x: 2, z: 3, yaw: Math.PI / 2 },
    ]);
  });
});

describe('AreaSelect', () => {
  it('ziehen: drücken, ziehen, loslassen — und die Ecken stehen', () => {
    const select = new AreaSelect();
    select.down({ col: 0, row: 0 });
    select.move({ col: 2, row: 1 });
    expect(select.up({ col: 3, row: 1 })).toBe(true);
    expect(select.rect()).toEqual({ minCol: 0, maxCol: 3, minRow: 0, maxRow: 1 });
  });

  it('tippen: der erste Tipp ist eine Ecke, der zweite die andere', () => {
    const select = new AreaSelect();
    select.down({ col: 1, row: 1 });
    expect(select.up({ col: 1, row: 1 })).toBe(false);
    expect(select.phase).toBe('second');
    select.down({ col: 4, row: 2 });
    expect(select.up({ col: 4, row: 2 })).toBe(true);
    expect(select.rect()).toEqual({ minCol: 1, maxCol: 4, minRow: 1, maxRow: 2 });
  });

  it('zweimal auf dieselbe Kachel getippt ist eine Kachel', () => {
    const select = new AreaSelect();
    select.down({ col: 1, row: 1 });
    select.up({ col: 1, row: 1 });
    select.down({ col: 1, row: 1 });
    expect(select.up({ col: 1, row: 1 })).toBe(true);
    expect(areaCount(select.rect()!)).toBe(1);
  });

  it('fragt, und ein neuer Druck fängt von vorn an', () => {
    const select = new AreaSelect();
    select.down({ col: 0, row: 0 });
    select.up({ col: 5, row: 5 });
    select.ask();
    expect(select.phase).toBe('confirm');
    select.down({ col: 9, row: 9 });
    expect(select.phase).toBe('drag');
    expect(select.rect()).toEqual({ minCol: 9, maxCol: 9, minRow: 9, maxRow: 9 });
  });

  it('Esc nimmt erst die Auswahl zurück und meldet dann, dass nichts mehr da ist', () => {
    const select = new AreaSelect();
    select.down({ col: 0, row: 0 });
    expect(select.reset()).toBe(true);
    expect(select.reset()).toBe(false);
    expect(select.rect()).toBeNull();
  });
});

describe('wallLine — eine Wand ziehen wie in Die Sims', () => {
  const HALF_WALL = { x: 0.5, z: 0.125 };

  it('rastet auf die Ecke zwischen den Kacheln', () => {
    expect(cornerAt(2.4, -0.6)).toEqual({ col: 2, row: -1 });
    expect(cornerAt(Number.NaN, 0)).toBeNull();
  });

  it('legt ganze Stücke auf die Fuge und am Ende das halbe', () => {
    const line = wallLine({ col: 0, row: 0 }, { col: 5, row: 0 }, WALL, 0, true);
    expect(line.diagonal).toBe(false);
    expect(line.length).toBe(5);
    expect(line.end).toEqual({ col: 5, row: 0 });
    expect(line.slots.map((slot) => [slot.x, slot.z, slot.half])).toEqual([
      [1, 0, false],
      [3, 0, false],
      [4.5, 0, true],
    ]);
    expect(line.slots[2]!.stretch).toBe(0.5);
    expect(line.edges).toHaveLength(5);
    for (const edge of line.edges) expect(edge).toMatchObject({ z: 0, alongX: true });
  });

  it('endet ohne halbes Stück eine Kachel früher', () => {
    const line = wallLine({ col: 0, row: 0 }, { col: 5, row: 0 }, WALL, 0, false);
    expect(line.slots).toHaveLength(2);
    expect(line.end).toEqual({ col: 4, row: 0 });
    expect(wallLine({ col: 0, row: 0 }, { col: 1, row: 0 }, WALL, 0, false).slots).toEqual([]);
  });

  it('zieht in jede Richtung — nach Westen und nach Norden auch', () => {
    const west = wallLine({ col: 3, row: 2 }, { col: -1, row: 2 }, WALL, 0, true);
    expect(west.slots.map((slot) => slot.x)).toEqual([2, 0]);
    const north = wallLine({ col: 3, row: 2 }, { col: 3, row: -2 }, WALL, 0, true);
    expect(north.slots.map((slot) => [slot.x, slot.z])).toEqual([
      [3, 1],
      [3, -1],
    ]);
    // Quer zur Getragenen: eine Vierteldrehung weiter, wie beim Rand der Fläche.
    expect(Math.abs(north.slots[0]!.yaw)).toBeCloseTo(Math.PI / 2);
  });

  it('nimmt die gerade Wand, der ein schiefer Zug am nächsten kommt', () => {
    const line = wallLine({ col: 0, row: 0 }, { col: 6, row: 1 }, WALL, 0, true);
    expect(line.diagonal).toBe(false);
    expect(line.end).toEqual({ col: 6, row: 0 });
  });

  it('legt unter 45° je Kachel ein ganzes Stück, gekürzt auf die Diagonale', () => {
    // Nach Nordosten: ╱.
    const line = wallLine({ col: 0, row: 0 }, { col: 3, row: -3 }, WALL, 0, true);
    expect(line.diagonal).toBe(true);
    expect(line.slots).toHaveLength(3);
    expect(line.length).toBeCloseTo(3 * Math.SQRT2);
    expect(line.slots.map((slot) => [slot.x, slot.z])).toEqual([
      [0.5, -0.5],
      [1.5, -1.5],
      [2.5, -2.5],
    ]);
    expect(line.slots[0]!.yaw).toBeCloseTo(Math.PI / 4);
    expect(line.slots[0]!.stretch).toBeCloseTo(Math.SQRT2 / 2);
    expect(line.tiles).toEqual([
      { x: 0.5, z: -0.5 },
      { x: 1.5, z: -1.5 },
      { x: 2.5, z: -2.5 },
    ]);
    // Und dieselben Kacheln als Striche quer durch (`PlaceGrid.showSlants`).
    expect(line.slants).toEqual([
      { x: 0, z: -1, slope: 'slash' },
      { x: 1, z: -2, slope: 'slash' },
      { x: 2, z: -3, slope: 'slash' },
    ]);
    // Nach Südosten: ╲.
    const back = wallLine({ col: 0, row: 0 }, { col: 2, row: 2 }, WALL, 0, true);
    expect(back.slots[0]!.yaw).toBeCloseTo(-Math.PI / 4);
    expect(back.slants.map((slant) => slant.slope)).toEqual(['backslash', 'backslash']);
    // Gerade Wände haben Fugen und keine Striche.
    expect(wallLine({ col: 0, row: 0 }, { col: 4, row: 0 }, WALL, 0, true).slants).toEqual([]);
  });

  it('setzt ein halbes Stück Kachel für Kachel', () => {
    const line = wallLine({ col: 0, row: 0 }, { col: 0, row: 3 }, HALF_WALL, 0, false);
    expect(line.slots.map((slot) => slot.z)).toEqual([0.5, 1.5, 2.5]);
    expect(line.slots.every((slot) => !slot.half && slot.stretch === 1)).toBe(true);
  });

  it('ist leer, solange Start und Ende dieselbe Ecke sind', () => {
    expect(wallLine({ col: 1, row: 1 }, { col: 1, row: 1 }, WALL, 0, true).slots).toEqual([]);
  });
});
