import {
  DINER_NAMES,
  DINER_PIECES,
  DINER_SCALE,
  dinerHeight,
  dinerPiece,
  dinerStand,
  dinerTop,
} from './dinerFit';

/**
 * **Der zweite Möbelkatalog, nachgerechnet.**
 *
 * Er ist **geschrieben** und nicht getippt (`tools/diner-model.mjs --list`),
 * und genau deshalb steht hier etwas: Was eine Maschine erzeugt, liest
 * niemand Zeile für Zeile durch. Was diese Suite prüft, sind die Zusagen, auf
 * die sich der Rest verlässt — nicht die 146 Zahlen selbst, sondern dass sie
 * zueinander passen.
 */
describe('der Katalog der zweiten Küche', () => {
  it('trägt hundertsechsundvierzig Stücke', () => {
    expect(DINER_PIECES).toHaveLength(146);
    expect(DINER_NAMES).toHaveLength(DINER_PIECES.length);
  });

  it('nennt jeden Namen und jede Beschriftung genau einmal', () => {
    expect(new Set(DINER_NAMES).size).toBe(DINER_NAMES.length);
    const labels = DINER_PIECES.map((piece) => piece.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('gibt jedem Stück eine deutsche Beschriftung und keinen Dateinamen', () => {
    for (const piece of DINER_PIECES) {
      expect({ name: piece.name, label: piece.label }).not.toEqual({
        name: piece.name,
        label: piece.name,
      });
    }
  });

  it('findet ein Stück nach Namen und keines, das es nicht gibt', () => {
    expect(dinerPiece('kitchencounter_straight_A')?.label).toBe('Küchenzeile A');
    expect(dinerPiece('gibtesnicht')).toBeUndefined();
  });

  /**
   * **Mindestens eine Kachel, höchstens zwei**, und die Kachelzahl ist das
   * **gerundete** Maß.
   *
   * Beides hängt am Schauraum: Der packt seine Reihen aus `tiles` und stellt
   * daneben eine Kachel Luft (`zones/dinerPlan.ts`). Ein Stück, das drei
   * Kacheln belegte, sprengte keine Reihe — aber ein Stück, dessen Kachelzahl
   * nicht zu seinem Maß passt, stünde im Schauraum entweder im Nachbarn oder
   * mit zwei Metern Luft daneben.
   */
  it('rundet jede Grundfläche auf mindestens eine und höchstens zwei Kacheln', () => {
    for (const piece of DINER_PIECES) {
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
   * **Kein Stück ist größer als seine Quelle erlaubt.** Die Quelle ist auf
   * einem Raster von 2 × 2 m gebaut, und das größte Stück darin belegt vier
   * Zellen — die große Bodenplatte, 4 × 4 m, halbiert (`DINER_SCALE`) also
   * zwei Kacheln im Quadrat. Ein Stück, das im Spiel breiter wäre, käme aus
   * einer anderen Datei als der, für die dieser Katalog geschrieben ist.
   */
  it('bleibt mit jedem Maß im halbierten Raster der Quelle', () => {
    expect(DINER_SCALE).toBe(0.5);
    for (const piece of DINER_PIECES) {
      const [w, d] = piece.span;
      expect({ name: piece.name, w: w <= 2.01, d: d <= 2.01 }).toEqual({
        name: piece.name,
        w: true,
        d: true,
      });
    }
  });

  /**
   * **Die Oberkante liegt über der Unterkante**, und zwar bei jedem Stück.
   *
   * Eine Zusage über zwei gemessene Zahlen, und sie wäre albern, wenn sie nicht
   * genau die Verwechslung ausschlösse, für die es `foot` gibt: `height` ist
   * die Oberkante **über dem Ursprung** und nicht die Höhe des Stücks. Bei den
   * Bodenplatten ist sie null und `foot` negativ; wer die beiden vertauschte,
   * bekäme Möbel mit negativer Höhe und merkte es erst an einer Tafel, die im
   * Boden steckt.
   */
  it('lässt jede Oberkante über ihrer Unterkante liegen', () => {
    for (const piece of DINER_PIECES) {
      const height = dinerHeight(piece);
      expect({ name: piece.name, positive: height > 0 }).toEqual({
        name: piece.name,
        positive: true,
      });
    }
  });

  /**
   * **Was unter seinem Ursprung liegt, wird angehoben — was darüber hängt,
   * nicht.** Das ist die ganze Regel von `dinerStand`, und an ihr hängen die
   * Tafeln, die Körper und die Stellen, an denen ein Stück steht.
   */
  it('hebt nur an, was unter seinem Ursprung liegt', () => {
    const plate = dinerPiece('floor_kitchen')!;
    expect(plate.foot).toBeCloseTo(-0.25);
    expect(dinerStand(plate)).toBeCloseTo(0.25);
    expect(dinerTop(plate)).toBeCloseTo(0.25);

    const cabinet = dinerPiece('kitchencabinet')!;
    expect(cabinet.foot).toBeCloseTo(1);
    expect(dinerStand(cabinet)).toBe(0);
    expect(dinerTop(cabinet)).toBeCloseTo(2);
    expect(dinerHeight(cabinet)).toBeCloseTo(1);

    const counter = dinerPiece('kitchencounter_straight_A')!;
    expect(counter.foot).toBeUndefined();
    expect(dinerStand(counter)).toBe(0);
    expect(dinerHeight(counter)).toBeCloseTo(0.5);
  });

  /**
   * **Kein Stück steckt nach dem Anheben noch im Boden.** Die Probe auf
   * `dinerStand` über den ganzen Katalog statt auf drei Beispiele: Wer die
   * Regel gegen eine Liste tauscht, bekommt sie rot.
   */
  it('stellt jedes Stück auf oder über den Boden', () => {
    for (const piece of DINER_PIECES) {
      const bottom = (piece.foot ?? 0) + dinerStand(piece);
      expect({ name: piece.name, sunk: bottom < -0.001 }).toEqual({
        name: piece.name,
        sunk: false,
      });
    }
  });

  /**
   * **Die Küchenzeile ist so hoch wie die der ersten Küche.** Das ist die
   * Probe darauf, dass der Maßstab stimmt — und die einzige Zahl, an der man
   * zwei Kataloge aus zwei Quellen gegeneinander messen kann: Eine
   * Arbeitsplatte auf 0,50 m passt zum Koch von 1,60 m, eine auf 1,00 m
   * reichte ihm bis über die Brust.
   */
  it('stellt seine Arbeitsplatte auf dieselbe Höhe wie die erste Küche', () => {
    expect(dinerHeight(dinerPiece('kitchencounter_straight_A')!)).toBeCloseTo(0.5, 2);
    expect(dinerHeight(dinerPiece('kitchencounter_straight_B')!)).toBeCloseTo(0.5, 2);
    expect(dinerHeight(dinerPiece('kitchentable_A')!)).toBeCloseTo(0.5, 2);
  });

  /**
   * **Kein Essen im Katalog.** Das Werkzeug siebt 79 Stücke aus
   * (`tools/diner-model.mjs`, `SKIP`), weil diese Küche ihr Essen selbst baut
   * (`zones/kitchenProps.ts`). Die Zusage steht hier und nicht nur im
   * Werkzeug: Wer das Sieb herausnimmt, bekommt eine Datei, die anderthalb
   * Megabyte schwerer ist, und soll das absichtlich tun.
   */
  it('lässt das Essen des Baukastens draußen', () => {
    for (const name of DINER_NAMES) {
      expect({ name, food: /^(food_|stew_)/.test(name) }).toEqual({ name, food: false });
    }
    expect(DINER_NAMES.filter((name) => name.startsWith('icecream_'))).toEqual([
      'icecream_machine',
    ]);
  });
});
