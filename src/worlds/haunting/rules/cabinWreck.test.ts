import { CabinWreck, SPARK_MAX, SPARK_MIN } from './cabinWreck';

/** Eine feste Folge von Würfen — derselbe Takt bei jedem Lauf. */
function rolls(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length]!;
}

describe('Wann ein Wrack funkt', () => {
  it('wirft in unregelmäßigem Takt zwischen drei und sechs Sekunden Funken', () => {
    const wreck = new CabinWreck(rolls([0.1, 0.9, 0.5, 0.3, 0.7]));
    const DT = 1 / 30;
    const moments: number[] = [];
    for (let t = 0; t < 120; t += DT) if (wreck.step(DT, ['r3']).includes('r3')) moments.push(t);
    expect(moments.length).toBeGreaterThanOrEqual(120 / SPARK_MAX - 1);
    expect(moments.length).toBeLessThanOrEqual(120 / SPARK_MIN);
    const gaps = moments.slice(1).map((moment, i) => moment - moments[i]!);
    for (const gap of gaps) {
      expect(gap).toBeGreaterThanOrEqual(SPARK_MIN - DT);
      expect(gap).toBeLessThanOrEqual(SPARK_MAX + DT);
    }
    // Unregelmäßig heißt: nicht immer dieselbe Pause.
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeGreaterThan(1);
  });

  it('gibt jedem Wrack seinen eigenen Takt und nennt beide im selben Bild, wenn es sich trifft', () => {
    const wreck = new CabinWreck(rolls([0, 0]));
    // Beide fällig nach genau SPARK_MIN Sekunden — in einem Schritt.
    expect(wreck.step(SPARK_MIN, ['r1', 'r2'])).toEqual(['r1', 'r2']);
    // Danach beginnt für beide eine neue Pause; nichts sofort wieder.
    expect(wreck.step(0.5, ['r1', 'r2'])).toEqual([]);
  });

  it('funkt erst nach einer vollen Pause und hört auf, sobald die Kabine nicht mehr zerstört ist', () => {
    const wreck = new CabinWreck(() => 0);
    expect(wreck.step(0.1, ['r1'])).toEqual([]);
    expect(wreck.step(SPARK_MIN, ['r1'])).toEqual(['r1']);
    // Neue Runde: Liste leer — kein Funke, und der Zähler ist vergessen.
    for (let i = 0; i < 300; i++) expect(wreck.step(0.1, [])).toEqual([]);
    expect(wreck.step(SPARK_MIN - 0.1, ['r1'])).toEqual([]);
    expect(wreck.step(0.2, ['r1'])).toEqual(['r1']);
  });

  it('nimmt keinen negativen Zeitschritt als Rückwärtsgang', () => {
    const wreck = new CabinWreck(() => 0);
    wreck.step(SPARK_MIN - 0.5, ['r1']);
    expect(wreck.step(-5, ['r1'])).toEqual([]);
    expect(wreck.step(0.5, ['r1'])).toEqual(['r1']);
  });
});
