import {
  MIXEDBAG_NAMES,
  MIXEDBAG_PIECES,
  MIXEDBAG_SCALE,
  mixedbagHeight,
  mixedbagPiece,
  mixedbagStand,
  mixedbagTop,
} from './mixedbagFit';
import { kitchenPiece } from './kitchenFit';

/**
 * **Der dritte Katalog, nachgerechnet.**
 *
 * Wie beim zweiten (`dinerFit.test.ts`) ist er **geschrieben** und nicht
 * getippt (`tools/mixedbag-model.mjs --list`), und genau deshalb steht hier
 * etwas: Was eine Maschine erzeugt, liest niemand Zeile für Zeile durch.
 * Geprüft sind die Zusagen, auf die sich der Rest verlässt — nicht die 59
 * Zahlenreihen selbst, sondern dass sie zueinander passen.
 */
describe('der Katalog der Wundertüte', () => {
  it('trägt neunundfünfzig Stücke', () => {
    expect(MIXEDBAG_PIECES).toHaveLength(59);
    expect(MIXEDBAG_NAMES).toHaveLength(MIXEDBAG_PIECES.length);
  });

  it('nennt jeden Namen und jede Beschriftung genau einmal', () => {
    expect(new Set(MIXEDBAG_NAMES).size).toBe(MIXEDBAG_NAMES.length);
    const labels = MIXEDBAG_PIECES.map((piece) => piece.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('gibt jedem Stück eine deutsche Beschriftung und keinen Dateinamen', () => {
    for (const piece of MIXEDBAG_PIECES) {
      expect({ name: piece.name, label: piece.label }).not.toEqual({
        name: piece.name,
        label: piece.name,
      });
    }
  });

  it('findet ein Stück nach Namen und keines, das es nicht gibt', () => {
    expect(mixedbagPiece('fire_extinguisher')?.label).toBe('Feuerlöscher');
    expect(mixedbagPiece('gibtesnicht')).toBeUndefined();
    // Die Namen kommen aus einem Katalog in einen Plan — geprüft hat sie
    // dort niemand.
    expect(mixedbagPiece('')).toBeUndefined();
  });

  /**
   * **Mindestens eine Kachel, höchstens zwei**, und die Kachelzahl ist das
   * **gerundete** Maß — dieselbe Zusage wie im zweiten Katalog, denn sie hängt
   * an derselben Rechnung im Werkzeug.
   */
  it('rundet jede Grundfläche auf mindestens eine und höchstens zwei Kacheln', () => {
    for (const piece of MIXEDBAG_PIECES) {
      const [w, d] = piece.tiles;
      const [sw, sd] = piece.span;
      expect({ name: piece.name, w, d }).toEqual({
        name: piece.name,
        w: Math.max(1, Math.round(sw)),
        d: Math.max(1, Math.round(sd)),
      });
      expect({ name: piece.name, ok: w >= 1 && w <= 2 && d >= 1 && d <= 2 }).toEqual({
        name: piece.name,
        ok: true,
      });
    }
  });

  /**
   * **Kein Stück ist größer als seine Quelle erlaubt.** Das größte Stück der
   * Wundertüte ist das Zirkuszelt mit 3,48 m in der Quelle, halbiert also
   * 1,74 m. Was im Spiel breiter wäre als zwei Kacheln, käme aus einer anderen
   * Datei als der, für die dieser Katalog geschrieben ist — oder aus einem
   * Lauf ohne `MIXEDBAG_SCALE`.
   */
  it('bleibt mit jedem Maß unter zwei Kacheln', () => {
    expect(MIXEDBAG_SCALE).toBe(0.5);
    for (const piece of MIXEDBAG_PIECES) {
      const [w, d] = piece.span;
      expect({ name: piece.name, w: w <= 2.01, d: d <= 2.01 }).toEqual({
        name: piece.name,
        w: true,
        d: true,
      });
    }
  });

  /**
   * **Die Oberkante liegt über der Unterkante**, und zwar bei jedem Stück —
   * die Probe auf die Verwechslung, für die es `foot` gibt: `height` ist die
   * Oberkante **über dem Ursprung** und nicht die Höhe des Stücks. Bei den
   * beiden Hängeketten ist sie null und `foot` knapp einen Meter negativ.
   */
  it('lässt jede Oberkante über ihrer Unterkante liegen', () => {
    for (const piece of MIXEDBAG_PIECES) {
      expect({ name: piece.name, positive: mixedbagHeight(piece) > 0 }).toEqual({
        name: piece.name,
        positive: true,
      });
    }
  });

  /**
   * **Was unter seinem Ursprung liegt, wird angehoben — was darüber steht,
   * nicht.** Dieselbe Regel wie im zweiten Katalog (`dinerStand`), hier an den
   * beiden Sorten nachgerechnet, die es in dieser Quelle gibt: die Kette, die
   * unter ihrem Haken hängt, und der Löscher, der auf seinem Fuß steht.
   */
  it('hebt nur an, was unter seinem Ursprung liegt', () => {
    const chain = mixedbagPiece('chain_hanging_A')!;
    expect(chain.height).toBe(0);
    expect(mixedbagStand(chain)).toBeCloseTo(0.9386);
    expect(mixedbagTop(chain)).toBeCloseTo(0.9386);
    expect(mixedbagHeight(chain)).toBeCloseTo(0.9386);

    const tank = mixedbagPiece('fire_extinguisher')!;
    expect(tank.foot).toBeUndefined();
    expect(mixedbagStand(tank)).toBe(0);
    expect(mixedbagTop(tank)).toBeCloseTo(0.6025);
  });

  it('stellt jedes Stück auf oder über den Boden', () => {
    for (const piece of MIXEDBAG_PIECES) {
      const bottom = (piece.foot ?? 0) + mixedbagStand(piece);
      expect({ name: piece.name, sunk: bottom < -0.001 }).toEqual({
        name: piece.name,
        sunk: false,
      });
    }
  });

  /**
   * **Der Löscher der Küche ist genau dieses Stück, und er ist so hoch, wie
   * der Möbelkatalog es sagt.**
   *
   * Das ist die einzige Stelle, an der diese Datei bisher gebraucht wird
   * (`core/kitchenFit.ts`, `extinguisher`), und die Zusage ist dieselbe wie
   * dort für den zweiten Katalog: Die Höhe wird **nicht** abgeschrieben,
   * sondern gerechnet — Arbeitsplatte plus Löscher. Wer die Quelle austauscht
   * und die Zahl im Möbelkatalog stehen lässt, bekommt das hier rot und nicht
   * erst im Bild.
   */
  it('trägt den Feuerlöscher, auf dem die Küche ihren Möbeleintrag rechnet', () => {
    const piece = kitchenPiece('extinguisher')!;
    const over = piece.over!.at(-1)!;
    expect({ file: over.file, node: over.node }).toEqual({
      file: 'mixedbag',
      node: 'fire_extinguisher',
    });
    const tank = mixedbagPiece(over.node)!;
    expect(piece.height).toBeCloseTo(over.at + mixedbagHeight(tank), 3);
  });
});
