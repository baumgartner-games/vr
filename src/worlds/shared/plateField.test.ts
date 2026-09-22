import { PLATE_SIZE, PLATE_SKIRT, plateDark, plateSpots, type PlateArea } from './plateField';
import { FIELD } from '../test/layout';
import { TILE } from '../nav/navTile';

/**
 * **Die Probe auf den Plattenboden.**
 *
 * Der Boden selbst ist ein Bild und lässt sich nur in der Brille beurteilen —
 * die **Entscheidung, welche Kachel eine Platte bekommt**, ist dagegen
 * Arithmetik, und genau die steht hier auf dem Prüfstand. Drei Zusagen sind es,
 * und jede von ihnen ist in der Brille ein Fehler, den niemand im Boden sucht:
 *
 * - **Lückenlos.** Der Ring deckt sein Rechteck vollständig und ohne
 *   Doppelung ab; eine ausgelassene Platte wäre ein Loch im Boden, eine
 *   doppelte ein Flimmern.
 * - **Das Gelände bleibt frei** — aber nur, soweit eine ganze Platte
 *   hineinpasst. Wer die Regel eines Tages auf „berührt" verschärft, bekommt
 *   einen Meter nackte Leinwand rings um den gebauten Boden und soll hier
 *   darüber stolpern.
 * - **Und es ist wirklich ein Schachbrett**: Nachbarn sind verschieden,
 *   Diagonalnachbarn gleich.
 */

/** Ein Rechteck, das aufgeht: 8 × 6 Meter sind 4 × 3 ganze Platten. */
const EVEN: PlateArea = { x: 0, z: 0, w: 8, d: 6 };

/** Und eines, das nicht aufgeht — so wie das Gelände der Testwelt. */
const ODD: PlateArea = { x: -3, z: -5, w: 7, d: 9 };

/** Der Schlüssel einer Platte, damit sich Doppelungen zählen lassen. */
const at = (x: number, z: number): string => `${x}|${z}`;

describe('plateDark', () => {
  it('wechselt mit jedem Schritt und bleibt über die Diagonale gleich', () => {
    expect(plateDark(0, 0)).toBe(false);
    expect(plateDark(1, 0)).toBe(true);
    expect(plateDark(0, 1)).toBe(true);
    expect(plateDark(1, 1)).toBe(false);
  });

  it('rechnet auch links und nördlich vom Nullpunkt weiter', () => {
    // `%` gibt in JavaScript bei negativen Zahlen ein negatives Ergebnis — ohne
    // die Korrektur stünden westlich des Geländes zwei gleiche Felder
    // nebeneinander, und zwar genau an der Naht bei Spalte 0.
    expect(plateDark(-1, 0)).toBe(true);
    expect(plateDark(-1, -1)).toBe(false);
    expect(plateDark(-7, 4)).toBe(true);
  });
});

describe('plateSpots', () => {
  it('deckt seinen Ring lückenlos und ohne Doppelung ab', () => {
    const spots = plateSpots(EVEN, 2, 4);
    // 4 + 2·2 = 8 Spalten, 3 + 2·2 = 7 Zeilen, minus die 4 · 3 des Rechtecks.
    expect(spots).toHaveLength(8 * 7 - 4 * 3);
    expect(new Set(spots.map((one) => at(one.x, one.z))).size).toBe(spots.length);
  });

  it('lässt ein Rechteck, das aufgeht, exakt aus', () => {
    for (const spot of plateSpots(EVEN, 2, 4)) {
      const insideX = spot.x > EVEN.x && spot.x < EVEN.x + EVEN.w;
      const insideZ = spot.z > EVEN.z && spot.z < EVEN.z + EVEN.d;
      expect(insideX && insideZ).toBe(false);
    }
  });

  it('lässt ein Rechteck, das nicht aufgeht, bis an seine Kante zuwachsen', () => {
    // Die Randplatte ragt einen Meter hinein — und liegt dort unter dem
    // gebauten Boden begraben. Das ist die Alternative zu einem Meter nackter
    // Leinwand zwischen Boden und Schürze, siehe `plateSpots`.
    const over = plateSpots(ODD, 2, 4).filter(
      (one) =>
        one.x - 1 < ODD.x + ODD.w &&
        one.x + 1 > ODD.x &&
        one.z - 1 < ODD.z + ODD.d &&
        one.z + 1 > ODD.z,
    );
    expect(over.length).toBeGreaterThan(0);
    for (const one of over) {
      // Ganz drin liegt keine: mindestens eine Kante muss draußen sein.
      const outX = one.x - 1 < ODD.x || one.x + 1 > ODD.x + ODD.w;
      const outZ = one.z - 1 < ODD.z || one.z + 1 > ODD.z + ODD.d;
      expect(outX || outZ).toBe(true);
    }
  });

  it('setzt keine Platte, die ganz im Rechteck liegt', () => {
    for (const hole of [EVEN, ODD]) {
      for (const spot of plateSpots(hole, 2, 6)) {
        const inX = spot.x - 1 >= hole.x && spot.x + 1 <= hole.x + hole.w;
        const inZ = spot.z - 1 >= hole.z && spot.z + 1 <= hole.z + hole.d;
        expect(inX && inZ).toBe(false);
      }
    }
  });

  it('reicht auf jeder Seite mindestens so weit hinaus wie bestellt', () => {
    const skirt = 6;
    const spots = plateSpots(ODD, 2, skirt);
    const xs = spots.map((one) => one.x);
    const zs = spots.map((one) => one.z);
    expect(Math.min(...xs) - 1).toBeLessThanOrEqual(ODD.x - skirt);
    expect(Math.max(...xs) + 1).toBeGreaterThanOrEqual(ODD.x + ODD.w + skirt);
    expect(Math.min(...zs) - 1).toBeLessThanOrEqual(ODD.z - skirt);
    expect(Math.max(...zs) + 1).toBeGreaterThanOrEqual(ODD.z + ODD.d + skirt);
  });

  it('legt jede Platte auf das Raster der Rechteckecke', () => {
    for (const spot of plateSpots(ODD, 2, 6)) {
      // `Math.abs`, weil `%` links vom Nullpunkt `-0` liefert und `toBe` das
      // von `0` unterscheidet (`Object.is`).
      expect(Math.abs((spot.x - 1 - ODD.x) % 2)).toBe(0);
      expect(Math.abs((spot.z - 1 - ODD.z) % 2)).toBe(0);
    }
  });

  it('gibt Nachbarn verschiedene und Diagonalnachbarn gleiche Töne', () => {
    const shades = new Map(plateSpots(EVEN, 2, 4).map((one) => [at(one.x, one.z), one.dark]));
    for (const [key, dark] of shades) {
      const [x, z] = key.split('|').map(Number) as [number, number];
      const side = shades.get(at(x + 2, z));
      if (side !== undefined) expect(side).toBe(!dark);
      const corner = shades.get(at(x + 2, z + 2));
      if (corner !== undefined) expect(corner).toBe(dark);
    }
  });

  it('teilt sich ungefähr hälftig auf hell und dunkel auf', () => {
    // Zwei Bündel, und beide sollen ähnlich groß sein: Ein Schachbrett, das zu
    // 90 % aus einem Ton bestünde, wäre keines.
    const spots = plateSpots(EVEN, 2, 6);
    const dark = spots.filter((one) => one.dark).length;
    expect(Math.abs(dark - spots.length / 2)).toBeLessThan(spots.length * 0.05);
  });
});

describe('die Schürze der Testwelt', () => {
  /** Das Gelände in Metern — eine Kachel ist ein Meter (`nav/navTile.TILE`). */
  const field: PlateArea = {
    x: FIELD.x * TILE,
    z: FIELD.z * TILE,
    w: FIELD.w * TILE,
    d: FIELD.d * TILE,
  };

  it('kostet 4 059 Platten, und das ist die Zahl, die das Bild bezahlt', () => {
    // 20 Dreiecke je Platte (`Floor_Prototype.glb`, nachgezählt an der Datei)
    // sind rund 81 000 je Bild — und zwei Zeichenaufrufe, weil es zwei
    // `InstancedMesh` sind. Wer die Schürze verbreitert oder die Platte
    // verkleinert, sieht hier, was es kostet.
    const spots = plateSpots(field);
    expect(spots).toHaveLength(4059);
    expect(spots.filter((one) => one.dark).length).toBe(2029);
  });

  it('lässt das gebaute Gelände frei — bis auf den begrabenen Rand', () => {
    const half = PLATE_SIZE / 2;
    for (const spot of plateSpots(field)) {
      const inX = spot.x - half >= field.x && spot.x + half <= field.x + field.w;
      const inZ = spot.z - half >= field.z && spot.z + half <= field.z + field.d;
      expect(inX && inZ).toBe(false);
    }
  });

  it('bleibt bequem innerhalb des Bodens bis zum Horizont', () => {
    // Die Schürze liegt auf dem texturierten Kasten (`environment.createGround`,
    // 500 m Halbmesser) — eine Platte, die darüber hinausragte, schwebte.
    for (const spot of plateSpots(field)) {
      expect(Math.abs(spot.x)).toBeLessThan(400);
      expect(Math.abs(spot.z)).toBeLessThan(400);
    }
  });

  it('reicht so weit hinaus, wie der Schattenkasten breit ist', () => {
    const xs = plateSpots(field).map((one) => one.x);
    expect(Math.min(...xs) - PLATE_SIZE / 2).toBeLessThanOrEqual(field.x - PLATE_SKIRT);
  });
});
