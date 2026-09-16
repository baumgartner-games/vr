import {
  BUILD_AHEAD,
  buildFree,
  overlaps,
  tileAhead,
  tilesOf,
  turnAround,
  turnedSize,
  whyNotBuilt,
  type BuildSpot,
} from './kitchenBuild';

/**
 * **Der Umbau, nachgerechnet** (`kitchenBuild.ts`).
 *
 * Zwei Fehler sind es, die man im Headset erst merkt, wenn die Küche schon
 * halb verstellt ist: ein Möbel, das in der Wand steckt, und zwei Möbel auf
 * derselben Kachel. Beide sind hier eine Zeile.
 */

/** Die Küche, wie sie im Grundriss steht — 24 × 11 Kacheln (`layout.KITCHEN`). */
const BOUNDS = { w: 24, d: 11 };

/** Ein Stück Grundfläche, kurz geschrieben. */
function spot(x: number, z: number, w = 1, d = 1): BuildSpot {
  return { x, z, w, d };
}

describe('welche Kachel gemeint ist', () => {
  /**
   * Der Ursprung liegt hier auf null, damit in den Fällen die **Kachel**
   * steht und nicht eine Verschiebung, die man im Kopf abziehen muss.
   */
  const origin = { x: 0, z: 0 };

  test('die Kachel vor der Figur, nicht die, auf der sie steht', () => {
    // Mitte der Kachel 2/3, Blick nach Süden (+z): gemeint ist 2/4.
    expect(tileAhead({ x: 2.5, z: 3.5 }, { x: 0, z: 1 }, origin)).toEqual({ x: 2, z: 4 });
    // Und nach Norden entsprechend 2/2.
    expect(tileAhead({ x: 2.5, z: 3.5 }, { x: 0, z: -1 }, origin)).toEqual({ x: 2, z: 2 });
  });

  test('die halbe Kachel reicht über die eigene Kante und nicht weiter', () => {
    // Genau eine Kachelkante voraus: `BUILD_AHEAD` ist größer als 0,5 …
    expect(BUILD_AHEAD).toBeGreaterThan(0.5);
    // … und kleiner als 1,5, sonst spränge das Ziel über die Nachbarkachel.
    expect(BUILD_AHEAD).toBeLessThan(1.5);
  });

  test('die Länge der Richtung zählt nicht — nur wohin sie zeigt', () => {
    const near = tileAhead({ x: 2.5, z: 3.5 }, { x: 0, z: 1 }, origin);
    const far = tileAhead({ x: 2.5, z: 3.5 }, { x: 0, z: 40 }, origin);
    expect(far).toEqual(near);
  });

  test('ohne Richtung gilt die eigene Kachel', () => {
    expect(tileAhead({ x: 5.2, z: 6.8 }, { x: 0, z: 0 }, origin)).toEqual({ x: 5, z: 6 });
  });

  test('der Ursprung der Zone wird herausgerechnet', () => {
    // Dieselbe Stelle, aber die Zone fängt bei x = 12 / z = −31 an
    // (`layout.KITCHEN`) — herauskommen muss die Kachel **relativ** dazu.
    expect(tileAhead({ x: 14.5, z: -27.5 }, { x: 0, z: 1 }, { x: 12, z: -31 })).toEqual({
      x: 2,
      z: 4,
    });
  });
});

describe('was eine Grundfläche belegt', () => {
  test('eine Kachel ist eine Kachel', () => {
    expect(tilesOf(spot(3, 4))).toEqual([{ x: 3, z: 4 }]);
  });

  test('die Spüle belegt zwei nebeneinander', () => {
    expect(tilesOf(spot(5, 0, 2, 1))).toEqual([
      { x: 5, z: 0 },
      { x: 6, z: 0 },
    ]);
  });

  test('überlappen heißt: eine gemeinsame Kachel', () => {
    expect(overlaps(spot(5, 0, 2, 1), spot(6, 0))).toBe(true);
    expect(overlaps(spot(5, 0, 2, 1), spot(7, 0))).toBe(false);
    // Aneinander ist nicht ineinander — eine Zeile aus Schränken ist erlaubt.
    expect(overlaps(spot(3, 4), spot(4, 4))).toBe(false);
  });
});

describe('ob hier Platz ist', () => {
  const taken = [spot(3, 4), spot(5, 0, 2, 1)];

  test('freie Kachel', () => {
    expect(buildFree(spot(8, 6), taken, BOUNDS)).toBe(true);
    expect(whyNotBuilt(spot(8, 6), taken, BOUNDS)).toBeNull();
  });

  test('besetzte Kachel sagt, was los ist', () => {
    expect(buildFree(spot(3, 4), taken, BOUNDS)).toBe(false);
    expect(whyNotBuilt(spot(3, 4), taken, BOUNDS)).toBe('Hier steht schon etwas');
  });

  test('ein breites Möbel stößt auch seitlich an', () => {
    // Zwei Kacheln ab 4/0 greifen in die Spüle ab 5/0 hinein.
    expect(buildFree(spot(4, 0, 2, 1), taken, BOUNDS)).toBe(false);
  });

  test('außerhalb der Küche geht nicht — auch nicht knapp', () => {
    expect(buildFree(spot(-1, 3), taken, BOUNDS)).toBe(false);
    expect(buildFree(spot(23, 3, 2, 1), taken, BOUNDS)).toBe(false);
    expect(buildFree(spot(0, 11), taken, BOUNDS)).toBe(false);
    expect(whyNotBuilt(spot(0, 11), taken, BOUNDS)).toBe('Das steht dann außerhalb der Küche');
    // Die letzte Kachel gehört noch dazu.
    expect(buildFree(spot(23, 10), taken, BOUNDS)).toBe(true);
  });
});

describe('drehen', () => {
  test('vier Vierteldrehungen sind eine ganze', () => {
    expect(turnAround(0)).toBe(1);
    expect(turnAround(1)).toBe(2);
    expect(turnAround(2)).toBe(3);
    expect(turnAround(3)).toBe(0);
  });

  test('bei ungerader Drehung stehen Breite und Tiefe über Kreuz', () => {
    expect(turnedSize([2, 1], 0)).toEqual({ w: 2, d: 1 });
    expect(turnedSize([2, 1], 1)).toEqual({ w: 1, d: 2 });
    expect(turnedSize([2, 1], 2)).toEqual({ w: 2, d: 1 });
    expect(turnedSize([2, 1], 3)).toEqual({ w: 1, d: 2 });
  });
});
