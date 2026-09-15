import {
  KITCHEN_NAMES,
  KITCHEN_PIECES,
  KITCHEN_SCALE,
  kitchenDeck,
  kitchenPiece,
} from './kitchenFit';

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

  /**
   * **Die Arbeitsfläche liegt nie über dem Möbel.** `deck` steht nur dort, wo
   * es von `height` abweicht — und es weicht immer nach **unten** ab: `height`
   * ist beim Herd mit dem Topf die Oberkante des Topfes, `deck` die der
   * Platte. Andersherum wäre ein Brötchen, das über dem Deckel schwebt.
   */
  it('legt jede Arbeitsfläche auf oder unter die Oberkante', () => {
    for (const piece of KITCHEN_PIECES) {
      const deck = kitchenDeck(piece);
      expect({ name: piece.name, ok: deck > 0.1 && deck <= piece.height + 1e-9 }).toEqual({
        name: piece.name,
        ok: true,
      });
    }
    // Ohne eigenen Eintrag ist die Oberkante die Arbeitsfläche.
    expect(kitchenDeck(kitchenPiece('counter')!)).toBe(kitchenPiece('counter')!.height);
    // Und mit: der Herd, nicht der Topfdeckel.
    expect(kitchenDeck(kitchenPiece('stove-pot')!)).toBe(0.55);
  });

  /**
   * **Was einen Topf trägt, ist eine Ablage und hat eine eigene Höhe.** Ohne
   * beides läge der Topf nach dem ersten Abstellen in der Luft — oder gar
   * nicht, weil das Möbel keine Fläche hat, auf die er darf.
   */
  it('gibt jedem Möbel mit losem Gerät eine Fläche darunter', () => {
    const holding = KITCHEN_PIECES.filter((piece) => piece.holds);
    expect(holding.map((piece) => piece.name)).toEqual(['extinguisher', 'stove-pot', 'stove-pan']);
    for (const piece of holding) {
      expect({ name: piece.name, worktop: piece.worktop === true }).toEqual({
        name: piece.name,
        worktop: true,
      });
      expect(kitchenDeck(piece)).toBeLessThan(piece.height);
    }
  });

  /**
   * **Der Versatz bleibt in der Kachel.** Er gleicht einen überstehenden Griff
   * aus (`KitchenPiece.align`, der Pfannenstiel) oder ein Möbel, das flacher
   * ist als seine Nachbarn (das Schneidebrett), und ist damit ein paar
   * Zentimeter — wer hier einen halben Meter einträgt, stellt ein Möbel auf
   * die Nachbarkachel, ohne dass der Grundriss davon wüsste.
   */
  it('rückt kein Möbel weiter als eine halbe Kachel aus der Mitte', () => {
    const shifted = KITCHEN_PIECES.filter((piece) => piece.align);
    expect(shifted.map((piece) => piece.name)).toEqual(['board', 'stove-pan']);
    for (const piece of KITCHEN_PIECES) {
      const [x, z] = piece.align ?? [0, 0];
      expect(Math.max(Math.abs(x), Math.abs(z))).toBeLessThan(0.5);
    }
    // Gemessen an der Datei: Der Korpus reicht von z = −0,610 bis z = +0,453,
    // seine Mitte liegt also bei −0,078 — genau so weit rückt er zurück.
    expect(kitchenPiece('stove-pan')!.align).toEqual([0, 0.078]);
  });

  /**
   * **Die Vorderkante des Schneidebretts fluchtet mit der Küchenzeile.**
   *
   * Es ist flacher als sie — 2,00 m gegen 2,12 m in der Quelle —, und
   * mittig auf derselben Kachelmitte sprang es vorn wie hinten drei
   * Zentimeter zurück. Sichtbar ist davon nur die **Vorderkante**: Dort steht
   * die Figur, dort greift sie zu. Der Versatz ist deshalb der **ganze**
   * halbe Tiefenunterschied nach Süden und nicht die Hälfte davon — hinten
   * wird die Lücke dafür doppelt so groß, und die zeigt zur Wand.
   *
   * Gerechnet aus `SOURCE` und nicht abgeschrieben: Wer die Quelle
   * austauscht, sieht hier, dass der Versatz nachzumessen ist.
   */
  it('stellt das Schneidebrett vorn bündig zur Küchenzeile', () => {
    const board = kitchenPiece('board')!;
    const counter = kitchenPiece('counter')!;
    const front = (name: string) => (SOURCE[name]![2] * KITCHEN_SCALE) / 2;
    const [ax, az] = board.align!;
    expect(ax).toBe(0);
    // Nach Süden, also auf die Seite, an der die Figur steht.
    expect(az).toBeGreaterThan(0);
    // Auf den halben Zentimeter genau wie überall in diesem Katalog: Die
    // Quellmaße daneben sind auf zwei Stellen gerundet.
    expect(Math.abs(front('board') + az - front('counter'))).toBeLessThanOrEqual(0.005 + 1e-9);
    // Und hinten bleibt genau die doppelte Lücke stehen — kein Versehen,
    // sondern der Preis für die bündige Vorderkante.
    const gap = front('counter') - front('board') + az;
    expect(gap).toBeCloseTo(2 * az, 2);
    expect(board.tiles).toEqual(counter.tiles);
  });

  /**
   * **Der Feuerlöscher steht auf einem Hocker, und der Hocker ist die
   * Ablage.** In der Datei ist `extinguisher` zweigeteilt wie ein Herd mit
   * Topf: ein Korpus bis 1,00 m (Quellmaß) und darüber ein eigenes Netz aus
   * `Kitchen_Utensils` bis 2,50 m. `height` ist die Oberkante des Löschers,
   * `deck` die des Hockers — wer beides verwechselt, stellt den Löscher beim
   * Zurückstellen auf seine eigene Kappe.
   */
  it('nimmt den Feuerlöscher vom Hocker und legt ihn auf den Hocker zurück', () => {
    const piece = kitchenPiece('extinguisher')!;
    expect(piece.holds).toBe('extinguisher');
    // Ohne Ablage meldet sich die Stelle nicht, und dann wird auch nichts
    // abgenommen (`worlds/test/zones/kitchen.ts`, `addStations`).
    expect(piece.worktop).toBe(true);
    // Der Hocker: halbe Höhe des Korpus aus der Quelle (1,00 m).
    expect(kitchenDeck(piece)).toBeCloseTo(1 * KITCHEN_SCALE, 2);
    // Der Löscher darüber: gut drei Viertel Meter hoch.
    expect(piece.height - kitchenDeck(piece)).toBeCloseTo(0.75, 2);
  });
});
