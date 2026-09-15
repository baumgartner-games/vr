import { KITCHEN_NAMES, KITCHEN_PIECES, KITCHEN_SCALE, kitchenPiece } from './kitchenFit';

/**
 * **Die Maße der Quelldatei**, in Metern und ungeteilt — abgelesen aus
 * `public/models/kitchen.glb` (Breite, Höhe, Tiefe je Knoten).
 *
 * Sie stehen hier, damit die Halbierung nachrechenbar bleibt: Der Katalog
 * nennt die **fertigen** Maße, und ohne diese Liste daneben wäre nicht mehr zu
 * sehen, woher sie kommen. Wer die Quelle austauscht, trägt hier die neuen ein
 * und sieht am fehlschlagenden Test, was im Katalog nachzuziehen ist.
 */
const SOURCE: Readonly<Record<string, readonly [number, number, number]>> = {
  'plate-counter': [2, 1.12, 2.12],
  extinguisher: [2, 2.5, 2],
  sink: [4, 2.3, 2.12],
  bin: [2, 0.9, 2],
  table: [2, 1, 2],
  'serve-counter': [2, 0.91, 2],
  board: [2, 1.15, 2],
  'plate-rack': [4, 1.13, 1.93],
  pass: [4, 1.05, 2.02],
  counter: [2, 1, 2.12],
  stove: [2, 1.1, 2.13],
  'stove-pot': [2, 1.73, 2.13],
  'stove-pan': [2, 1.35, 2.44],
};

/**
 * Am Katalog gibt es nichts zu rechnen — er ist eine Liste. Drei Sachen an ihm
 * fielen trotzdem schon auf, und alle drei kosten eine Zeile: dass ein Name
 * doppelt vorkommt, dass ein Möbel keine Grundfläche hat, und dass ein
 * fremder Name aus dem Netz eine Ausnahme wirft, statt `undefined` zu geben.
 */
describe('der Möbelkatalog', () => {
  it('hat lauter eigene Namen und Beschriftungen', () => {
    expect(new Set(KITCHEN_NAMES).size).toBe(KITCHEN_PIECES.length);
    for (const piece of KITCHEN_PIECES) {
      expect(piece.label.length).toBeGreaterThan(2);
      expect(piece.name).toMatch(/^[a-z][a-z-]*$/);
    }
  });

  it('gibt jedem Möbel eine Grundfläche und eine Höhe', () => {
    for (const piece of KITCHEN_PIECES) {
      const [x, z] = piece.tiles;
      // Ganze Kacheln, mindestens eine — das Raster ist ein Meter
      // (`worlds/nav/navTile.TILE`), und ein halbes Möbel passt darauf nicht.
      expect(Number.isInteger(x)).toBe(true);
      expect(Number.isInteger(z)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(1);
      expect(z).toBeGreaterThanOrEqual(1);
      expect(piece.height).toBeGreaterThan(0.1);
      // Nichts ist höher als ein Raum hoch ist.
      expect(piece.height).toBeLessThan(4);
    }
  });

  it('findet ein Möbel nach Namen und verschluckt sich nicht an Fremdtext', () => {
    expect(kitchenPiece('sink')?.label).toBe('Spüle');
    // Die Namen kommen über das Netz in einem Plan an — was dort steht, hat
    // niemand geprüft.
    expect(kitchenPiece('../../etc/passwd')).toBeUndefined();
    expect(kitchenPiece('')).toBeUndefined();
  });

  /**
   * **Die Quelle ist doppelt so groß, wie eine Küche sein darf**, und der
   * Katalog nennt die halbierten Maße. Das ist die Zahl, an der die ganze
   * Küche hängt: Neben einem Koch von 1,60 m reichte ein Tresen ungeteilt bis
   * über die Augen.
   */
  it('nennt die Maße der Quelle halbiert', () => {
    expect(KITCHEN_SCALE).toBe(0.5);
    for (const piece of KITCHEN_PIECES) {
      const source = SOURCE[piece.name];
      expect({ name: piece.name, known: source !== undefined }).toEqual({
        name: piece.name,
        known: true,
      });
      if (!source) continue;
      const [w, h, d] = source;
      // Auf den halben Zentimeter genau und nicht genauer: Der Katalog rundet
      // auf zwei Stellen, und ein Test, der auf die zwölfte prüft, prüft
      // Fließkomma statt Möbel.
      const off = Math.abs(piece.height - h * KITCHEN_SCALE);
      expect({ name: piece.name, fits: off <= 0.005 + 1e-9 }).toEqual({
        name: piece.name,
        fits: true,
      });
      // Gerundet und nicht aufgerundet: Ein Schrank von 1,06 m Tiefe auf zwei
      // Kacheln stellt eine ganze Zeile mit einem Meter Luft dazwischen auf.
      expect({ name: piece.name, tiles: piece.tiles }).toEqual({
        name: piece.name,
        tiles: [
          Math.max(1, Math.round(w * KITCHEN_SCALE)),
          Math.max(1, Math.round(d * KITCHEN_SCALE)),
        ],
      });
    }
  });

  /**
   * **In dieser Fassung der Quelle hängt keines.** Der Katalog führte das
   * Ausgaberegal einmal als hängendes Stück von 3,52 m; die Datei sagt etwas
   * anderes — es fängt wie jedes andere Möbel bei y = 0 an. Das war kein
   * Schönheitsfehler: Ein hängendes Stück bekommt weder Körper noch
   * Wegaufschlag, und man lief mitten durch das Regal hindurch.
   */
  it('lässt kein Möbel hängen, solange keines hängt', () => {
    expect(KITCHEN_PIECES.filter((piece) => piece.hanging)).toEqual([]);
  });
});
