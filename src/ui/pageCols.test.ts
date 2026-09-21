import { COLS_MAX, COLS_MIN, COL_WIDTH, clampColumns, fitColumns, stepColumns } from './pageCols';

/**
 * **Die Spalten des Rasters** — die Rechnung hinter dem gemeldeten Befund
 * „Auf Desktop sind 2 Columns sehr klein".
 */
describe('die Spalten aus der Fensterbreite', () => {
  it('gibt einem Telefon zwei', () => {
    expect(fitColumns(390)).toBe(2);
  });

  it('gibt einem Schreibtisch mehr', () => {
    expect(fitColumns(1200)).toBe(6);
    expect(fitColumns(1600)).toBe(8);
  });

  it('rundet ab statt auf', () => {
    // Knapp unter drei Kacheln sind zwei Spalten und nicht drei zu enge.
    expect(fitColumns(COL_WIDTH * 3 - 1)).toBe(2);
    expect(fitColumns(COL_WIDTH * 3)).toBe(3);
  });

  it('bleibt in den Grenzen', () => {
    expect(fitColumns(100)).toBe(COLS_MIN);
    expect(fitColumns(0)).toBe(COLS_MIN);
    expect(fitColumns(Number.NaN)).toBe(COLS_MIN);
    expect(fitColumns(100000)).toBe(COLS_MAX);
  });
});

describe('die beiden Knöpfe', () => {
  it('zählen um eins weiter', () => {
    expect(stepColumns(3, 1)).toBe(4);
    expect(stepColumns(3, -1)).toBe(2);
  });

  it('halten an den Enden an, statt umzuspringen', () => {
    expect(stepColumns(COLS_MIN, -1)).toBe(COLS_MIN);
    expect(stepColumns(COLS_MAX, 1)).toBe(COLS_MAX);
  });

  it('nehmen auch Unsinn aus dem Speicher an', () => {
    expect(clampColumns(Number.NaN)).toBe(COLS_MIN);
    expect(clampColumns(-4)).toBe(COLS_MIN);
    expect(clampColumns(99)).toBe(COLS_MAX);
    expect(clampColumns(2.4)).toBe(2);
  });
});
