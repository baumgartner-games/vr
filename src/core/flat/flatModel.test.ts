import {
  CUT_HEIGHT,
  DEFAULT_SCALE,
  LIFT,
  LIFT_MAX,
  MAX_SCALE,
  MAX_SPAN,
  MIN_SCALE,
  PHONE_SCALE,
  boundsOf,
  boxOf,
  clampScale,
  classify,
  drawOrder,
  inView,
  liftOf,
  scaleForWidth,
  shade,
  toScreen,
  viewBounds,
  type FlatBox,
  type FlatHull,
} from './flatModel';

/**
 * **Die Karte von oben wird aus der Welt gelesen, nicht gezeichnet**
 * (`flatModel.ts`). Was daraus ein Boden, eine Wand oder ein Möbelstück wird,
 * entscheidet allein die Hülle — und genau dort sieht man einen Fehler nicht:
 * Eine Decke, die als Boden zählt, deckt die halbe Welt zu, und ein Himmel im
 * Ausschnitt schrumpft die Karte auf einen Punkt. Beides fällt im Bild erst
 * auf, wenn man schon darin steht.
 */
function hull(
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
): FlatHull {
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

describe('Was ein Stück Welt von oben ist', () => {
  it('nennt eine flache, breite Platte einen Boden', () => {
    expect(classify(hull(-5, -0.1, -5, 5, 0, 5))).toBe('floor');
    // Eine Stufe ist auch etwas, worauf man steht.
    expect(classify(hull(0, 0, 0, 2, 0.2, 1))).toBe('floor');
  });

  it('nennt etwas Hohes und Dünnes eine Wand', () => {
    expect(classify(hull(0, 0, 0, 6, 3, 0.2))).toBe('wall');
    expect(classify(hull(0, 0, 0, 0.2, 3, 6))).toBe('wall');
  });

  it('nennt einen Turm kein Wandstück, auch wenn er bis zur Decke reicht', () => {
    // In beiden Richtungen gleich groß: ein Schrank, keine Wand.
    expect(classify(hull(0, 0, 0, 1, 3, 1))).toBe('prop');
  });

  it('nennt alles dazwischen ein Möbelstück', () => {
    expect(classify(hull(0, 0, 0, 1.2, 0.8, 0.8))).toBe('prop');
    // Flach, aber winzig: eine Münze auf dem Boden ist kein Boden.
    expect(classify(hull(0, 0, 0, 0.3, 0.02, 0.3))).toBe('prop');
  });

  it('lässt den Himmel weg, damit die Karte nicht auf einen Punkt schrumpft', () => {
    const sky = MAX_SPAN + 10;
    expect(classify(hull(-sky, -1, -sky, sky, 400, sky))).toBeNull();
  });

  it('lässt weg, was zu klein ist, um es von oben zu sehen', () => {
    expect(classify(hull(0, 0, 0, 0.02, 0.02, 0.02))).toBeNull();
  });

  /**
   * Der wichtigste Fall: Eine Karte von oben ist ein **Schnitt**. Ohne ihn
   * liegt die Decke über allem, und die Welt ist eine graue Fläche.
   */
  it('schneidet über dem Kopf ab — Decken und Dächer gehören nicht auf die Karte', () => {
    const ceiling = hull(-5, 3, -5, 5, 3.2, 5);
    expect(classify(ceiling, 0)).toBeNull();
    // Steht der Spieler ein Stockwerk höher, gehört dieselbe Platte wieder dazu.
    expect(classify(ceiling, 3)).toBe('floor');
  });

  it('nimmt eine Wand mit, die unten anfängt und über den Schnitt hinausragt', () => {
    expect(classify(hull(0, 0, 0, 6, CUT_HEIGHT + 2, 0.2), 0)).toBe('wall');
  });
});

describe('Aus einer Hülle ein Stück Karte', () => {
  it('nimmt Mitte, Maße und Unterkante', () => {
    expect(boxOf(hull(-1, 0.5, 2, 3, 2.5, 6), 'prop', '#ff0000')).toEqual({
      x: 1,
      z: 4,
      w: 4,
      d: 4,
      base: 0.5,
      height: 2,
      kind: 'prop',
      color: '#ff0000',
    });
  });
});

describe('Der Ausschnitt', () => {
  const box = (x: number, z: number, w = 2, d = 2): FlatBox => ({
    x,
    z,
    w,
    d,
    base: 0,
    height: 1,
    kind: 'prop',
    color: '#fff',
  });

  it('legt sich um alle Stücke', () => {
    expect(boundsOf([box(0, 0), box(10, -4)])).toEqual({
      minX: -1,
      minZ: -5,
      maxX: 11,
      maxZ: 1,
    });
  });

  it('bleibt auch ohne Stücke eine Fläche und nicht Unendlich', () => {
    const empty = boundsOf([]);
    expect(Number.isFinite(empty.minX) && Number.isFinite(empty.maxZ)).toBe(true);
  });

  it('sagt, was im Bild liegt — großzügig am Rand', () => {
    const view = { minX: 0, minZ: 0, maxX: 10, maxZ: 10 };
    expect(inView(box(5, 5), view)).toBe(true);
    expect(inView(box(-3, 5), view)).toBe(false);
    // Knapp draußen zählt noch dazu: die aufgestellte Vorderseite ragt herein.
    expect(inView(box(-1.4, 5), view)).toBe(true);
  });
});

describe('Die Reihenfolge beim Zeichnen', () => {
  const at = (z: number, kind: FlatBox['kind'], base = 0): FlatBox => ({
    x: 0,
    z,
    w: 1,
    d: 1,
    base,
    height: 1,
    kind,
    color: '#fff',
  });

  it('legt Böden unter alles andere', () => {
    expect(drawOrder(at(9, 'floor'), at(0, 'wall'))).toBeLessThan(0);
    expect(drawOrder(at(0, 'wall'), at(9, 'floor'))).toBeGreaterThan(0);
  });

  it('zeichnet Südliches später, damit es Nördliches verdeckt', () => {
    expect(drawOrder(at(0, 'wall'), at(4, 'wall'))).toBeLessThan(0);
    expect([at(4, 'prop'), at(0, 'wall'), at(2, 'prop')].sort(drawOrder).map((b) => b.z)).toEqual([
      0, 2, 4,
    ]);
  });

  /**
   * Der Boden ist der Fall, in dem „weiter südlich zuletzt" falsch wäre: Böden
   * liegen flach übereinander, und der größte gehört nach ganz unten. Sonst
   * deckt die Wüste die Häuser zu, die auf ihr stehen.
   */
  it('legt unter den Böden den größten zuerst', () => {
    const big: FlatBox = { ...at(9, 'floor'), w: 300, d: 300 };
    const small: FlatBox = { ...at(0, 'floor'), w: 4, d: 4 };
    expect(drawOrder(big, small)).toBeLessThan(0);
    expect([small, big].sort(drawOrder)[0]).toBe(big);
  });

  it('stellt bei gleicher Tiefe das Tiefere zuerst', () => {
    expect(drawOrder(at(2, 'prop', 0), at(2, 'prop', 3))).toBeLessThan(0);
  });
});

describe('Die Kamera von oben', () => {
  const camera = { centreX: 10, centreZ: -4, scale: 50 };

  it('legt die Mitte in die Bildmitte und Norden nach oben', () => {
    expect(toScreen(camera, 800, 600, 10, -4)).toEqual({ x: 400, y: 300 });
    // Weiter nördlich (kleineres z) heißt weiter oben auf dem Bild.
    expect(toScreen(camera, 800, 600, 10, -5).y).toBeLessThan(300);
    // Weiter östlich heißt weiter rechts.
    expect(toScreen(camera, 800, 600, 12, -4).x).toBe(500);
  });

  it('sagt, welchen Ausschnitt ein Bild zeigt', () => {
    expect(viewBounds(camera, 800, 600)).toEqual({
      minX: 2,
      maxX: 18,
      minZ: -10,
      maxZ: 2,
    });
  });

  it('hebt Hohes weiter an als Flaches — aber nie über den Deckel', () => {
    expect(liftOf(0)).toBe(0);
    expect(liftOf(1)).toBeCloseTo(LIFT, 6);
    expect(liftOf(2)).toBeCloseTo(2 * LIFT, 6);
    // Ein zehn Meter hoher Turm verdeckt sonst alles hinter sich.
    expect(liftOf(10)).toBe(LIFT_MAX);
    expect(liftOf(-3)).toBe(0);
  });

  it('fängt auf einem Telefon kleiner an und hält den Zoom in Grenzen', () => {
    expect(scaleForWidth(390)).toBe(PHONE_SCALE);
    expect(scaleForWidth(1280)).toBe(DEFAULT_SCALE);
    expect(clampScale(1)).toBe(MIN_SCALE);
    expect(clampScale(1e6)).toBe(MAX_SCALE);
    expect(clampScale(70)).toBe(70);
  });
});

describe('Abdunkeln und Aufhellen', () => {
  it('mischt gegen Schwarz und gegen Weiß', () => {
    expect(shade('#808080', -1)).toBe('#000000');
    expect(shade('#808080', 1)).toBe('#ffffff');
    expect(shade('#808080', 0)).toBe('#808080');
  });

  it('versteht die kurze Schreibweise und lässt Unsinn in Ruhe', () => {
    expect(shade('#fff', -1)).toBe('#000000');
    expect(shade('rgb(1,2,3)', -0.5)).toBe('rgb(1,2,3)');
  });
});
