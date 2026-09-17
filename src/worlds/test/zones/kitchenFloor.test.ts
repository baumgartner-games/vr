import { TILE } from '../../nav/navTile';
import { CHECKER_TILE } from '../../shared/environment';
import { HORIZON_COLORS, KITCHEN } from '../layout';
import {
  KITCHEN_CHECKER,
  KITCHEN_CHECKER_DARK,
  KITCHEN_CHECKER_JOINT,
  KITCHEN_CHECKER_LIFT,
  KITCHEN_CHECKER_LIGHT,
  checkerRepeat,
} from './kitchenFloor';
import { KITCHEN_FLOOR } from './kitchenPlan';

/**
 * **Der Küchenboden, nachgerechnet** — alles außer dem Bild (`kitchenFloor.ts`).
 *
 * Gezeichnet wird hier nichts: Eine Leinwand gibt es unter Jest nicht, und ob
 * ein Schachbrett hübsch aussieht, beantwortet ohnehin nur die Brille. Was ein
 * Test beantworten kann, ist genau das, woran dieser Boden scheitern würde,
 * ohne dass es jemandem auffällt:
 *
 * - **Er sitzt schief.** Ein Feld, das kein Teiler der Kachel ist, läuft über
 *   vierundzwanzig Meter aus dem Raster heraus — und dann liegt die Fuge quer
 *   unter der Küchenzeile statt an ihr entlang. Von oben sieht man das als
 *   „irgendwas stimmt nicht" und sucht es beim Möbel.
 * - **Er verschwimmt mit dem Boden daneben.** Die Küche grenzt ohne Zaun an
 *   das Schachbrett des Geländes (`HORIZON_COLORS`), und zwei ähnliche Bretter
 *   nebeneinander sind kein Raum, sondern ein Fehler im Bild.
 * - **Er streitet mit dem Estrich unter sich.** Zwei Flächen auf derselben
 *   Höhe flackern gegeneinander, sobald die Kamera flach darübersteht.
 */

/** Wie hell eine Farbe wirkt, von 0 bis 1 — die übliche Gewichtung der Kanäle. */
function brightness(color: number): number {
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Der Helligkeitssprung zwischen den beiden Feldern eines Bretts. */
function step(one: number, other: number): number {
  return Math.abs(brightness(one) - brightness(other));
}

/** Wie warm eine Farbe ist: Rot minus Blau, von −1 bis 1. */
function warmth(color: number): number {
  return (((color >> 16) & 0xff) - (color & 0xff)) / 255;
}

describe('das Muster liegt im Kachelraster', () => {
  /**
   * **Ein halbes Feld je halber Kachel** — und damit zwei mal zwei Felder auf
   * jeder Kachel, auf der ein Möbel steht.
   */
  it('teilt die Kachel und erfindet kein eigenes Maß', () => {
    expect(KITCHEN_CHECKER).toBeCloseTo(0.5, 6);
    expect(TILE / KITCHEN_CHECKER).toBe(2);
    expect(Number.isInteger(TILE / KITCHEN_CHECKER)).toBe(true);
  });

  /**
   * **Die Leinwand geht ganzzahlig über die Zone.** Sie trägt zwei mal zwei
   * Felder, bei halben Feldern also einen Quadratmeter — über eine Zone aus
   * ganzen Kacheln kommt damit genau ihre Kachelzahl heraus und nichts
   * Krummes. Eine krumme Zahl hieße: Das Muster wird an einer Kante mitten im
   * Feld abgeschnitten.
   *
   * Gerechnet wird gegen das **Rechteck** und nicht gegen zwei abgeschriebene
   * Zahlen: Die Küche ist schon zweimal gewachsen (zuletzt um die Werkhalle,
   * `layout.KITCHEN`), und ein Test, der die alte Breite festhält, hält nichts
   * über das Muster fest, sondern nur über die Zahl von gestern.
   */
  it('wiederholt sich ganzzahlig über das Rechteck der Küche', () => {
    const repeat = checkerRepeat(KITCHEN);
    expect(repeat.x).toBe(KITCHEN.w);
    expect(repeat.z).toBe(KITCHEN.d);
    expect(Number.isInteger(repeat.x)).toBe(true);
    expect(Number.isInteger(repeat.z)).toBe(true);
  });

  /** Und dasselbe für jedes andere Rechteck aus ganzen Kacheln. */
  it('bleibt ganzzahlig, wenn die Küche wächst', () => {
    expect(checkerRepeat({ x: 0, z: 0, w: 7, d: 3 })).toEqual({ x: 7, z: 3 });
  });
});

describe('der Küchenboden hebt sich vom Boden daneben ab', () => {
  /**
   * **Feiner als draußen.** Ein Feld des Geländes ist einen Meter groß
   * (`CHECKER_TILE`); die Küche halbiert das. Aus derselben Höhe sieht man
   * damit zwei Bretter mit zwei Frequenzen — und genau das macht die Kante
   * zwischen ihnen zu einer Schwelle statt zu einem Versehen.
   */
  it('hat halb so große Felder wie das Gelände', () => {
    expect(KITCHEN_CHECKER).toBeCloseTo(CHECKER_TILE / 2, 6);
  });

  /**
   * **Und mehr als doppelt so viel Kontrast.** Draußen ist grau auf weiß, also
   * zwei helle Töne dicht beieinander; drinnen liegt ein dunkles Feld neben
   * einem cremefarbenen. Der Sprung ist das, was aus 16 m Höhe zuerst ankommt.
   */
  it('springt zwischen seinen Feldern weiter als der Boden draußen', () => {
    const inside = step(KITCHEN_CHECKER_LIGHT, KITCHEN_CHECKER_DARK);
    const outside = step(HORIZON_COLORS.ground, HORIZON_COLORS.checker);
    expect(inside).toBeGreaterThan(outside * 2);
  });

  /**
   * **Kein Feld der Küche ist ein Feld des Geländes.** Das dunkle liegt weit
   * unter beiden Tönen draußen, das helle ist deutlich **wärmer** als das
   * kühle Weiß dort — ein zweites Grau daneben wäre dasselbe Brett mit einer
   * anderen Feldgröße gewesen.
   */
  it('borgt sich keinen der beiden Töne von draußen', () => {
    for (const outside of [HORIZON_COLORS.ground, HORIZON_COLORS.checker]) {
      expect(brightness(KITCHEN_CHECKER_DARK)).toBeLessThan(brightness(outside) - 0.3);
      expect(warmth(KITCHEN_CHECKER_LIGHT)).toBeGreaterThan(warmth(outside) + 0.05);
    }
    expect(warmth(HORIZON_COLORS.checker)).toBeLessThanOrEqual(0);
  });

  /**
   * **Die Fuge ist dunkler als beide Felder** und liegt damit auf dem hellen.
   * Eine helle Fuge hätte das cremefarbene Feld zerschnitten und auf dem
   * dunklen ein Gitter gezogen, das dort niemand braucht.
   */
  it('zieht eine dunkle Fuge und keine helle', () => {
    expect(brightness(KITCHEN_CHECKER_JOINT)).toBeLessThan(brightness(KITCHEN_CHECKER_LIGHT));
    expect(brightness(KITCHEN_CHECKER_JOINT)).toBeGreaterThan(brightness(KITCHEN_CHECKER_DARK));
  });
});

describe('der Belag liegt über dem Estrich und nicht darin', () => {
  /**
   * **Über der Oberkante des Grundrissbodens**, aber nur um Haaresbreite: Auf
   * derselben Höhe flackerten die beiden Flächen gegeneinander, und einen
   * Zentimeter höher stünde jedes Möbel der Küche sichtbar im Boden — es setzt
   * auf `KITCHEN_FLOOR` auf und nicht auf dem Belag.
   */
  it('liegt zwei Millimeter über dem Boden, auf dem die Möbel stehen', () => {
    expect(KITCHEN_CHECKER_LIFT).toBeGreaterThan(0);
    expect(KITCHEN_CHECKER_LIFT).toBeLessThan(0.005);
    expect(KITCHEN_FLOOR + KITCHEN_CHECKER_LIFT).toBeCloseTo(0.022, 6);
  });
});
