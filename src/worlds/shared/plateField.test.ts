import {
  PLATE_SIZE,
  PLATE_SKIRT,
  floorPlateModels,
  floorPlateSpots,
  plateSpots,
  type PlateArea,
} from './plateField';
import type { PlanSolid } from '../grid/solids';
import { FIELD } from '../test/layout';
import { TILE } from '../nav/navTile';

/**
 * **Die Probe auf den Plattenboden.**
 *
 * Der Boden selbst ist ein Bild und lässt sich nur in der Brille beurteilen —
 * die **Entscheidung, welche Kachel eine Platte bekommt**, ist dagegen
 * Arithmetik, und genau die steht hier auf dem Prüfstand. Vier Zusagen sind
 * es, und jede von ihnen ist in der Brille ein Fehler, den niemand im Boden
 * sucht:
 *
 * - **Lückenlos.** Der Ring deckt sein Rechteck vollständig und ohne
 *   Doppelung ab; eine ausgelassene Platte wäre ein Loch im Boden, eine
 *   doppelte ein Flimmern.
 * - **Das Gelände bleibt frei** — aber nur, soweit eine ganze Platte
 *   hineinpasst. Wer die Regel eines Tages auf „berührt" verschärft, bekommt
 *   einen Meter nackte Leinwand rings um den gebauten Boden und soll hier
 *   darüber stolpern.
 * - **Auf einer Kachel liegt genau eine Platte.** Der gebaute Boden ist
 *   zweistöckig gedacht — eine Masse über das ganze Gelände und Kacheln
 *   darauf —, und wer beide Lagen belegte, zahlte für die untere, ohne sie je
 *   zu sehen.
 * - **Und die Kosten stehen in einer Zahl.** Wer die Schürze verbreitert oder
 *   die Platte verkleinert, sieht hier, was es kostet.
 */

/** Ein Rechteck, das aufgeht: 8 × 6 Meter sind 8 × 6 Platten von einer Kachel. */
const EVEN: PlateArea = { x: 0, z: 0, w: 8, d: 6 };

/** Und eines, das links und nördlich vom Nullpunkt anfängt. */
const ODD: PlateArea = { x: -3, z: -5, w: 7, d: 9 };

/** Der Schlüssel einer Platte, damit sich Doppelungen zählen lassen. */
const at = (x: number, z: number): string => `${x}|${z}`;

/** Ein Bodenquader in Weltmetern — Mitte, Kantenlängen, Etage. */
function floor(x: number, z: number, w: number, d: number, top: number, level = 0): PlanSolid {
  return { kind: 'floor', x, y: top - 0.15, z, w, h: 0.3, d, level };
}

describe('plateSpots', () => {
  it('deckt seinen Ring lückenlos und ohne Doppelung ab', () => {
    const spots = plateSpots(EVEN, 1, 4);
    // 8 + 2·4 = 16 Spalten, 6 + 2·4 = 14 Zeilen, minus die 8 · 6 des Rechtecks.
    expect(spots).toHaveLength(16 * 14 - 8 * 6);
    expect(new Set(spots.map((one) => at(one.x, one.z))).size).toBe(spots.length);
  });

  it('lässt ein Rechteck aus ganzen Kacheln exakt aus', () => {
    // Mit einer Platte von einer Kachel geht jedes Kachelrechteck restlos auf:
    // Es gibt keine Platte mehr, die halb im Gelände liegt.
    for (const hole of [EVEN, ODD]) {
      for (const spot of plateSpots(hole, 1, 4)) {
        const insideX = spot.x > hole.x && spot.x < hole.x + hole.w;
        const insideZ = spot.z > hole.z && spot.z < hole.z + hole.d;
        expect(insideX && insideZ).toBe(false);
      }
    }
  });

  it('reicht auf jeder Seite mindestens so weit hinaus wie bestellt', () => {
    const skirt = 6;
    const spots = plateSpots(ODD, 1, skirt);
    const xs = spots.map((one) => one.x);
    const zs = spots.map((one) => one.z);
    expect(Math.min(...xs) - 0.5).toBeLessThanOrEqual(ODD.x - skirt);
    expect(Math.max(...xs) + 0.5).toBeGreaterThanOrEqual(ODD.x + ODD.w + skirt);
    expect(Math.min(...zs) - 0.5).toBeLessThanOrEqual(ODD.z - skirt);
    expect(Math.max(...zs) + 0.5).toBeGreaterThanOrEqual(ODD.z + ODD.d + skirt);
  });

  it('legt jede Platte auf das Raster der Rechteckecke', () => {
    for (const spot of plateSpots(ODD, 1, 6)) {
      // `Math.abs`, weil `%` links vom Nullpunkt `-0` liefert und `toBe` das
      // von `0` unterscheidet (`Object.is`).
      expect(Math.abs((spot.x - 0.5 - ODD.x) % 1)).toBe(0);
      expect(Math.abs((spot.z - 0.5 - ODD.z) % 1)).toBe(0);
    }
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

  it('ist eine Kachel je Platte und stößt damit an die nächste', () => {
    expect(PLATE_SIZE).toBe(TILE);
  });

  it('kostet 26 688 Platten, und das ist die Zahl, die das Bild bezahlt', () => {
    // (77 + 2·48) · (105 + 2·48) − 77 · 105. Bei 20 Dreiecken je Platte
    // (`Floor_Prototype.glb`, nachgezählt an der Datei) sind das 533 760
    // Dreiecke in **einem** Zeichenaufruf, weil es ein `InstancedMesh` ist.
    expect(PLATE_SKIRT).toBe(48);
    expect(plateSpots(field)).toHaveLength(26688);
  });

  it('lässt das gebaute Gelände vollständig frei', () => {
    // Dort liegen eigene Platten, eine je Bodenkachel (`floorPlateSpots`) —
    // eine zweite Lage darunter wäre bezahlt und nie zu sehen.
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

  it('reicht so weit hinaus, wie bestellt ist', () => {
    const xs = plateSpots(field).map((one) => one.x);
    expect(Math.min(...xs) - PLATE_SIZE / 2).toBeLessThanOrEqual(field.x - PLATE_SKIRT);
  });
});

describe('floorPlateSpots', () => {
  const always = (): string => 'a.glb';

  it('legt auf jede Kachel eines Quaders genau eine Platte', () => {
    const spots = floorPlateSpots([floor(1.5, 2.5, 3, 5, 0)], always);
    expect(spots).toHaveLength(15);
    expect(new Set(spots.map((one) => at(one.x, one.z))).size).toBe(15);
    // Die Mitten liegen auf halben Kacheln, so wie die Kacheln selbst.
    for (const spot of spots) {
      expect(Math.abs((spot.x - 0.5) % 1)).toBe(0);
      expect(Math.abs((spot.z - 0.5) % 1)).toBe(0);
    }
  });

  it('nimmt die Oberkante und nicht die Mitte des Quaders', () => {
    const spots = floorPlateSpots([floor(0.5, 0.5, 1, 1, 2.8)], always);
    expect(spots[0]?.y).toBeCloseTo(2.8, 9);
  });

  it('lässt die höhere Kachel über der Masse gewinnen', () => {
    // Genau der Fall aus der Testwelt: eine Masse über das ganze Gelände mit
    // Oberkante −0,02 und eine begehbare Kachel darauf mit Oberkante 0.
    const spots = floorPlateSpots([floor(1.5, 1.5, 3, 3, -0.02), floor(1.5, 1.5, 1, 1, 0)], always);
    expect(spots).toHaveLength(9);
    const middle = spots.find((one) => one.x === 1.5 && one.z === 1.5);
    expect(middle?.y).toBe(0);
  });

  it('hält die Etagen auseinander', () => {
    // Unter dem Podest wird durchgelaufen: sein Deck und das Gelände darunter
    // sind dieselbe Kachel und zwei Böden.
    const spots = floorPlateSpots(
      [floor(0.5, 0.5, 1, 1, 0, 0), floor(0.5, 0.5, 1, 1, 2.8, 1)],
      always,
    );
    expect(spots.map((one) => one.y).sort()).toEqual([0, 2.8]);
  });

  it('überspringt, was keine Platte bekommt', () => {
    const spots = floorPlateSpots([floor(1.5, 0.5, 3, 1, 0)], (tile) =>
      tile.col === 1 ? null : 'a.glb',
    );
    expect(spots.map((one) => one.x)).toEqual([0.5, 2.5]);
  });

  it('sieht nur Böden an', () => {
    const wall: PlanSolid = { kind: 'wall', x: 0.5, y: 1.4, z: 0.5, w: 1, h: 2.8, d: 0.2 };
    expect(floorPlateSpots([wall], always)).toEqual([]);
  });
});

describe('floorPlateModels', () => {
  it('sagt, worauf ein Quader wartet', () => {
    expect(floorPlateModels(floor(0.5, 0.5, 1, 1, 0), () => 'a.glb')).toEqual(['a.glb']);
  });

  it('sammelt jede Datei einmal und in fester Reihenfolge', () => {
    // Der Schlüssel eines Bündels (`grid/gridBatch.batchKey`) — aus derselben
    // Menge muss immer derselbe Text werden, sonst zerfällt ein Bündel in zwei.
    const files = floorPlateModels(floor(1.5, 0.5, 3, 1, 0), (tile) =>
      tile.col === 1 ? 'b.glb' : 'a.glb',
    );
    expect(files).toEqual(['a.glb', 'b.glb']);
  });

  it('gibt nichts heraus, wo nichts hinkommt', () => {
    // Eine leere Liste heißt: Dieser Quader bleibt sichtbar, wie er ist.
    expect(floorPlateModels(floor(0.5, 0.5, 1, 1, 0), () => null)).toEqual([]);
  });
});
