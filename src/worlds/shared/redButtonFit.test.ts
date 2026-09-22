import { kaykitHeightScale } from '../../core/kaykitHeight';
import { KAYKIT_SCALE } from '../../core/kaykitFit';
import {
  BUTTON_DOME_R,
  BUTTON_HEAD_H,
  BUTTON_PEDESTAL_H,
  BUTTON_REST_Y,
  redButtonStack,
} from './redButtonFit';

/**
 * Die beiden gekauften Dateien, in den Einheiten ihrer Quelle und wie sie mit
 * dem Maßstab ihres Pakets im Spiel ankommen (`core/kaykitFit.KAYKIT_SCALE`).
 * Nachgemessen in den Dateien selbst — hier stehen sie als **Eingabe** für die
 * Rechnung und nicht als deren Ergebnis: Was das Spiel daraus macht, misst es
 * am geladenen Netz (`redButton.ts`), und genau das soll dieser Test
 * nachvollziehen können, ohne ein Netz zu laden.
 */
const COLUMN = { width: 0.7, height: 1.4 };
const PAWN = { width: 0.75, height: 1.215 };

describe('Die Maße des roten Knopfes', () => {
  /**
   * Der Vertrag, an dem sechs Stellen hängen: Zeigerziel **und** Trefferkörper
   * (`zones/navigation.ts`, dreimal `zones/kitchen.ts`, der Umbauschalter,
   * `grid/fixtures/button.ts`). Er hat den Umbau auf die Regalmodelle
   * unverändert überlebt, und ein Test, der das festhält, ist billiger als die
   * Suche nach sechs verschobenen Trefferkörpern.
   */
  it('lässt Kuppel, Säule und Ruhehöhe, wo sie waren', () => {
    expect(BUTTON_DOME_R).toBe(0.17);
    expect(BUTTON_PEDESTAL_H).toBe(0.95);
    expect(BUTTON_REST_Y).toBeCloseTo(1.01, 10);
  });

  /**
   * Der Kopf ist so hoch, wie die Kuppel breit war — abgeleitet und nicht
   * erfunden. Seine eigene Breite fällt aus dem Modell ab und bleibt dabei
   * **unter** dem Trefferhalbmesser: Der Knopf ist nie knapper zu treffen, als
   * er aussieht.
   */
  it('gibt dem Kopf die Breite der Kuppel als Höhe', () => {
    expect(BUTTON_HEAD_H).toBeCloseTo(0.34, 10);
    const width = BUTTON_HEAD_H * (PAWN.width / PAWN.height);
    expect(width).toBeCloseTo(0.2099, 4);
    expect(width / 2).toBeLessThan(BUTTON_DOME_R);
  });

  /**
   * Und die Umrechnung selbst, mit derselben Funktion, die das Spiel benutzt
   * (`core/kaykitHeight.kaykitHeightScale`): Beide Pakete stehen auf 0,5, die
   * Säule kommt damit 0,70 m hoch an und muss auf 0,95 m wachsen, die
   * Spielfigur kommt 0,608 m hoch an und muss auf 0,34 m schrumpfen.
   */
  it('rechnet beide Modelle auf ihre Zielhöhe', () => {
    const column = kaykitHeightScale(COLUMN.height * KAYKIT_SCALE, BUTTON_PEDESTAL_H);
    expect(COLUMN.height * KAYKIT_SCALE * column).toBeCloseTo(BUTTON_PEDESTAL_H, 10);
    expect(column).toBeCloseTo(1.3571, 4);
    // Der Maßstab ist gleichmäßig: Eine Säule, die nur in der Höhe gestreckt
    // würde, wäre ein Brett. Breiter als der Kasten, den die Küche um sie
    // stellt (0,6 m, `zones/kitchen.ts`), darf sie dabei nicht werden.
    const thick = COLUMN.width * KAYKIT_SCALE * column;
    expect(thick).toBeCloseTo(0.475, 3);
    expect(thick).toBeLessThan(0.6);

    const pawn = kaykitHeightScale(PAWN.height * KAYKIT_SCALE, BUTTON_HEAD_H);
    expect(PAWN.height * KAYKIT_SCALE * pawn).toBeCloseTo(BUTTON_HEAD_H, 10);
    expect(pawn).toBeCloseTo(0.5597, 4);
  });
});

describe('Sockel und Kopf aufeinanderstellen', () => {
  /**
   * Der Normalfall, mit der Zahl, die `dungeon/column.glb` wirklich hergibt:
   * Die Säule trägt unter dem Rand des Fußes sechs Zentimeter unter ihrer
   * Oberkante — dort, wo ihre Pyramide noch Stein hat. Der Kopf sitzt also
   * ein wenig tiefer, als die Säule hoch ist, und schluckt die Spitze.
   */
  it('stellt den Kopf dorthin, wo der Sockel trägt', () => {
    const stack = redButtonStack(0.89);
    expect(stack.foot).toBeCloseTo(0.89, 10);
    expect(stack.head).toBe(BUTTON_HEAD_H);
    expect(stack.top).toBeCloseTo(1.23, 10);
    // Und derselbe Ort, von der Kuppel aus gesehen: Dort hängt die Figur, und
    // deshalb fährt sie mit, wenn die Kuppel eintaucht.
    expect(stack.lift).toBeCloseTo(0.89 - BUTTON_REST_Y, 10);
    expect(BUTTON_REST_Y + stack.lift).toBeCloseTo(stack.foot, 10);
  });

  /**
   * Die Kuppel liegt dabei **im** Kopf und nicht darüber oder darunter — sonst
   * wäre der Kern, der von ihr übrig bleibt, zu sehen, und der Trefferkörper
   * stünde woanders als das, was man trifft.
   */
  it('hält die Kuppel innerhalb des Kopfes', () => {
    const stack = redButtonStack(0.89);
    expect(BUTTON_REST_Y).toBeGreaterThan(stack.foot);
    expect(BUTTON_REST_Y).toBeLessThan(stack.top);
  });

  /**
   * Zwei Schranken, und beide sind Notausgänge für ein **anderes** Modell:
   * Höher als die gerechnete Säule darf der Kopf nicht klettern — sonst
   * schwebt er —, und tiefer als die halbe Kuppel darf er nicht einsinken —
   * sonst steckt er im Sockel.
   */
  it('lässt den Kopf weder schweben noch versinken', () => {
    expect(redButtonStack(2).foot).toBe(BUTTON_PEDESTAL_H);
    expect(redButtonStack(0).foot).toBeCloseTo(BUTTON_PEDESTAL_H - BUTTON_DOME_R, 10);
    expect(redButtonStack(-5).foot).toBeCloseTo(BUTTON_PEDESTAL_H - BUTTON_DOME_R, 10);
  });

  /**
   * Und wo gar nichts gemessen wurde — ein leeres Netz, ein Strahl, der nichts
   * trifft —, gilt die gerechnete Säulenhöhe: dieselbe Antwort, die der Knopf
   * vor dem Umbau gegeben hätte.
   */
  it('fällt auf die gerechnete Säule zurück, wo sich nichts messen lässt', () => {
    expect(redButtonStack(Number.NaN).foot).toBe(BUTTON_PEDESTAL_H);
    expect(redButtonStack(Number.POSITIVE_INFINITY).foot).toBe(BUTTON_PEDESTAL_H);
    expect(redButtonStack(Number.NaN).top).toBeCloseTo(BUTTON_PEDESTAL_H + BUTTON_HEAD_H, 10);
  });
});
