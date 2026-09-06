import {
  boundsAround,
  emptyBounds,
  fitMap,
  toMetres,
  toPixels,
  toScreen,
  toWorld,
  type MapBounds,
} from './mapFit';

/** Ein Labor: breiter als tief, wie fast jede Karte dieses Spiels. */
const LAB: MapBounds = { minX: -30, minZ: -20, maxX: 30, maxZ: 20 };

describe('Wie eine Welt auf ein Blatt kommt', () => {
  it('legt die Mitte der Welt in die Mitte des Bildes', () => {
    const fit = fitMap(LAB, 400, 300);
    const middle = toScreen(fit, { x: 0, z: 0 });
    expect(middle.x).toBeCloseTo(200, 6);
    expect(middle.y).toBeCloseTo(150, 6);
  });

  it('legt Norden nach oben und Osten nach rechts', () => {
    const fit = fitMap(LAB, 400, 300, { turn: false });
    // −Z ist Norden: oben heißt kleineres y.
    expect(toScreen(fit, { x: 0, z: -10 }).y).toBeLessThan(150);
    expect(toScreen(fit, { x: 10, z: 0 }).x).toBeGreaterThan(200);
  });

  it('passt so ein, dass nichts über den Rand steht', () => {
    const fit = fitMap(LAB, 400, 300, { turn: false });
    for (const spot of [
      { x: LAB.minX, z: LAB.minZ },
      { x: LAB.maxX, z: LAB.minZ },
      { x: LAB.minX, z: LAB.maxZ },
      { x: LAB.maxX, z: LAB.maxZ },
    ]) {
      const point = toScreen(fit, spot);
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(400);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(300);
    }
  });

  it('füllt die Achse, an der es klemmt, wirklich aus', () => {
    // 60 × 40 Meter in 400 × 300 Punkte: die Breite klemmt, also steht die
    // Welt links und rechts fast am Rand — sonst ist die Karte zu klein.
    const fit = fitMap(LAB, 400, 300, { turn: false, padding: 0 });
    expect(toScreen(fit, { x: LAB.minX, z: 0 }).x).toBeCloseTo(0, 6);
    expect(toScreen(fit, { x: LAB.maxX, z: 0 }).x).toBeCloseTo(400, 6);
  });

  /**
   * Die Zahl, wegen der es diesen Test gibt: Ein Tipp, der zehn Zentimeter
   * danebengeht, drückt den falschen Knopf — und man sieht der Karte nicht an,
   * dass sie schuld war.
   */
  it('findet jeden Punkt wieder, hin und zurück', () => {
    for (const turn of [false, true]) {
      const fit = fitMap(LAB, 420, 900, { turn });
      for (const spot of [
        { x: 0, z: 0 },
        { x: 12.5, z: -7.25 },
        { x: -29, z: 19 },
        { x: 30, z: -20 },
      ]) {
        const back = toWorld(fit, toScreen(fit, spot));
        expect(back.x).toBeCloseTo(spot.x, 9);
        expect(back.z).toBeCloseTo(spot.z, 9);
      }
    }
  });

  describe('quer legen', () => {
    it('legt eine breite Welt in ein hochkantes Bild quer', () => {
      expect(fitMap(LAB, 420, 900).turn).toBe(true);
      expect(fitMap(LAB, 900, 420).turn).toBe(false);
    });

    it('legt eine tiefe Welt in ein breites Bild quer', () => {
      const tower: MapBounds = { minX: -10, minZ: -40, maxX: 10, maxZ: 40 };
      expect(fitMap(tower, 900, 420).turn).toBe(true);
      expect(fitMap(tower, 420, 900).turn).toBe(false);
    });

    it('gehorcht, wenn jemand es ausdrücklich sagt', () => {
      expect(fitMap(LAB, 420, 900, { turn: false }).turn).toBe(false);
      expect(fitMap(LAB, 900, 420, { turn: true }).turn).toBe(true);
    });

    // 60 × 40 Meter auf einem Telefon: aufrecht klemmt die Breite (60 m auf
    // 420 Punkte), quer die Tiefe (40 m auf dieselben 420). Das ist der
    // Faktor, um den die Drehung die Karte größer macht — die Hälfte.
    it('macht die Karte dabei wirklich größer', () => {
      const upright = fitMap(LAB, 420, 900, { turn: false });
      const turned = fitMap(LAB, 420, 900, { turn: true });
      expect(turned.scale / upright.scale).toBeCloseTo(1.5, 6);
    });

    it('dreht nach links: Norden zeigt dann nach links', () => {
      const fit = fitMap(LAB, 420, 900, { turn: true });
      expect(toScreen(fit, { x: 0, z: -10 }).x).toBeLessThan(fit.centre.x);
      expect(toScreen(fit, { x: 10, z: 0 }).y).toBeLessThan(fit.centre.y);
    });
  });

  it('nimmt eine andere Mitte an — die Minikarte, die jemandem folgt', () => {
    const fit = fitMap(LAB, 400, 300, { centre: { x: 20, z: -10 } });
    const middle = toScreen(fit, { x: 20, z: -10 });
    expect(middle.x).toBeCloseTo(200, 6);
    expect(middle.y).toBeCloseTo(150, 6);
  });

  it('zoomt', () => {
    const one = fitMap(LAB, 400, 300);
    const two = fitMap(LAB, 400, 300, { zoom: 2 });
    expect(two.scale).toBeCloseTo(one.scale * 2, 6);
  });

  it('rechnet Meter in Punkte und zurück', () => {
    const fit = fitMap(LAB, 400, 300);
    expect(toMetres(fit, toPixels(fit, 3.5))).toBeCloseTo(3.5, 9);
  });

  it('geht mit einer Welt ohne Ausdehnung um, statt durch null zu teilen', () => {
    const point = fitMap({ minX: 5, minZ: 5, maxX: 5, maxZ: 5 }, 400, 300);
    expect(Number.isFinite(point.scale)).toBe(true);
    expect(point.scale).toBeGreaterThan(0);
    const empty = fitMap(emptyBounds(), 400, 300);
    expect(Number.isFinite(toScreen(empty, { x: 0, z: 0 }).x)).toBe(true);
  });

  describe('der Ausschnitt um ein paar Punkte', () => {
    it('umschließt sie samt Rand', () => {
      const box = boundsAround(
        [
          { x: 1, z: 2 },
          { x: -3, z: 8 },
        ],
        1,
      );
      expect(box).toEqual({ minX: -4, minZ: 1, maxX: 2, maxZ: 9 });
    });

    it('gibt für nichts einen leeren Ausschnitt statt Unendlich', () => {
      expect(boundsAround([])).toEqual(emptyBounds());
    });
  });
});
