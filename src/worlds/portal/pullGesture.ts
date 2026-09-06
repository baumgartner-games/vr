/**
 * **Das Zucken**, mit dem ein Gegenstand geflogen kommt.
 *
 * Gefasst ist er schnell: zielen, Grip drücken, und die Hand hat ihn am Haken.
 * Ob er auch *kommt*, ist eine zweite Frage — und die beantwortet nicht ein
 * Knopf, sondern eine Bewegung: die Hand zuckt zum Körper, und der Gegenstand
 * folgt. Genau so zieht ein Mensch etwas zu sich, und genau deshalb muss es
 * niemand lernen.
 *
 * Vorher war das ein **Winkel**: Handgelenk um 30° nach oben kippen. Das ist
 * eine Geste, die man sich merken muss, und sie ging beim Hantieren nebenbei
 * los — wer die Hand mit einem gefassten Ding hebt, kippt sie dabei.
 *
 * Gemessen wird das **Näherkommen**, nicht das Tempo der Hand im Raum:
 *
 * ```
 *   Tempo = (Abstand vorher − Abstand jetzt) / Zeit
 * ```
 *
 * Zwei Dinge fallen damit von selbst weg. Wer **geht**, nimmt die Hand mit:
 * Körper und Hand bewegen sich zusammen, der Abstand bleibt, das Tempo ist
 * null. Und wer die Hand **quer** vor sich herzieht, kommt dem Körper nicht
 * näher — nur der Anteil der Bewegung, der wirklich zum Körper zeigt, zählt.
 *
 * Gemittelt wird über ein **kurzes Fenster** und nicht über ein Bild: bei 90
 * Bildern je Sekunde ist eines eine Elfmillisekunden-Momentaufnahme, und ein
 * Tracker, der einmal zittert, wäre darin ein Zucken von 10 m/s. Über 50
 * Millisekunden zählt so ein Ausreißer nur noch zu einem Fünftel — und ein
 * echtes Zucken, das länger dauert als das Fenster, steht mit seinem **ganzen**
 * Tempo da. Das ist der Unterschied zu einem Tiefpass: der zöge eine Schwelle,
 * die in Metern je Sekunde angeschrieben steht, still nach unten, weil eine
 * kurze Bewegung ihn nie ganz durchläuft.
 *
 * Frei von three.js, wie alles hier, was gerechnet und nicht gezeichnet wird.
 */

import type { Vec3 } from './tools/aim';

/**
 * Über so viel Zeit wird gemittelt, in Sekunden.
 *
 * Kurz genug, dass ein Zucken (eine gute Zwanzigstelsekunde und mehr) ganz
 * hineinpasst, lang genug, dass ein einzelnes Bild darin untergeht.
 */
export const PULL_WINDOW = 0.05;

/**
 * Über so viel Zeit hinweg wird ein Zucken noch als eines gezählt.
 *
 * Größere Pausen (ein neues Bild nach einem Ruckler, ein Wechsel der Welt)
 * fangen von vorn an, statt aus einem alten Abstand eine Bewegung zu rechnen,
 * die nie stattgefunden hat.
 */
export const PULL_GAP = 0.25;

/**
 * Wie schnell sich eine Hand dem Körper nähert — Bild für Bild.
 *
 * Eine je Hand: die Messung braucht den Abstand des letzten Bildes, und zwei
 * Hände haben zwei davon.
 */
export class PullMeter {
  /** Der Abstand im letzten Bild, oder `null` vor dem ersten. */
  private last: number | null = null;
  /** Die Bilder im Fenster: wie viel näher, und in welcher Zeit. */
  private readonly frames: { closed: number; dt: number }[] = [];
  /** Das gemittelte Tempo, in Metern je Sekunde. */
  private speed = 0;

  /**
   * Ein Bild weiter.
   *
   * @param hand wo die Hand ist
   * @param body wo der Körper ist — der Kopf reicht: der Arm zieht dorthin,
   *             und ein zweiter Punkt auf Brusthöhe ändert am Vorzeichen
   *             nichts.
   * @param dt   die Zeit seit dem letzten Bild
   * @returns das gemittelte Tempo zum Körper hin, in Metern je Sekunde.
   *          Negativ heißt: die Hand geht weg.
   */
  feed(hand: Vec3, body: Vec3, dt: number): number {
    const gap = Math.hypot(hand.x - body.x, hand.y - body.y, hand.z - body.z);
    const last = this.last;
    this.last = gap;
    if (last === null || dt <= 0 || dt > PULL_GAP) {
      this.frames.length = 0;
      this.speed = 0;
      return 0;
    }

    this.frames.push({ closed: last - gap, dt });
    // Alles, was älter ist als das Fenster, fliegt vorn heraus — aber nie das
    // letzte Bild: bei einer Bildzeit über dem Fenster wäre die Liste sonst
    // leer und das Tempo null, ausgerechnet nach einem langen Bild.
    let span = this.frames.reduce((sum, frame) => sum + frame.dt, 0);
    while (this.frames.length > 1 && span - this.frames[0]!.dt >= PULL_WINDOW) {
      span -= this.frames.shift()!.dt;
    }
    const closed = this.frames.reduce((sum, frame) => sum + frame.closed, 0);
    this.speed = closed / span;
    return this.speed;
  }

  /** Das Tempo des letzten Bildes, ohne zu messen. */
  get current(): number {
    return this.speed;
  }

  /** Von vorn: die Hand ist weg, die Welt gewechselt, der Griff gelöst. */
  reset(): void {
    this.last = null;
    this.frames.length = 0;
    this.speed = 0;
  }
}

/**
 * Wie weit ein Zucken zur Schwelle gediehen ist — 0 bis 1, für den Strahl
 * zwischen Hand und Gegenstand.
 *
 * Ohne Schwelle (`limit` 0) ist es immer 1: dann kommt der Gegenstand, sobald
 * er gefasst ist, und ein Strahl, der sich erst spannen müsste, führte nur
 * vor, was schon passiert ist.
 */
export function pullTension(speed: number, limit: number): number {
  if (limit <= 0) return 1;
  return Math.max(0, Math.min(1, speed / limit));
}

/** Ob dieses Zucken den Zug auslöst. */
export function pullTriggered(speed: number, limit: number): boolean {
  return limit <= 0 || speed >= limit;
}
