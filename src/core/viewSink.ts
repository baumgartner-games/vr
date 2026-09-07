/**
 * **Die Federung der Sicht beim Landen** — das Kissen unter der Kamera.
 *
 * Ein Körper in der Physik landet hart: Die Kapsel trifft die Fläche, die
 * Geschwindigkeit ist im selben Bild null, und in der Brille sieht das aus,
 * als wäre man in Beton eingeschlagen. Auf Beton ist das auch richtig. Auf
 * einer Matte ist es falsch — dort sinkt man ein, das Material gibt nach und
 * schiebt einen wieder heraus, und genau diese halbe Sekunde ist der
 * Unterschied zwischen „aufgeschlagen“ und „abgesprungen“.
 *
 * Gefedert wird deshalb **nur die Sicht** und nicht der Körper. Die Kapsel
 * steht, wo sie steht; sie hat weder etwas zu suchen im Kissen noch darunter.
 * Was nachgibt, ist die Höhe, in der der Kopf über seinen Füßen sitzt — genau
 * wie beim Ducken, und aus demselben Grund: In der Brille gehört die Kamera
 * dem Headset, und das Einzige, was man ihr sagen kann, ist, wie hoch ihr
 * Zimmer steht.
 *
 * Gerechnet wird eine gewöhnliche gedämpfte Feder. Sie ist absichtlich
 * **unterdämpft** (`damping` deutlich unter `2·√stiffness`): Ein Kissen, das
 * ohne Überschwingen zurückkommt, fühlt sich an wie Sand. Der kleine Rückstoß
 * darüber hinaus ist das, was es als Kissen erkennbar macht.
 *
 * Die Datei kennt weder Three.js noch die Physik — sie rechnet mit zwei Zahlen
 * und lässt sich deshalb ohne Brille nachmessen (`viewSink.test.ts`).
 */

/** Wie sich ein Kissen anfühlt. */
export interface Cushion {
  /**
   * Welcher Anteil der Fallgeschwindigkeit als Einsinken ankommt.
   *
   * Nicht alles: Beine, Knie und die Matte selbst schlucken den Rest, und wer
   * aus fünf Metern mit fünf Metern pro Sekunde in den Boden führe, sähe eine
   * Sekunde lang nur noch Matte.
   */
  absorb: number;
  /** Wie tief es höchstens nachgibt, in Metern. */
  maxDepth: number;
  /** Wie weit es beim Zurückfedern über die Ruhelage hinausschießt, in Metern. */
  maxRise: number;
  /** Federkonstante in 1/s² — wie hart es zurückdrückt. */
  stiffness: number;
  /** Dämpfung in 1/s — wie schnell es zur Ruhe kommt. */
  damping: number;
}

/**
 * Das Kissen, das in der Kletterhalle liegt: gut 20 cm Einsinken aus sechs
 * Metern Fall, in gut einer halben Sekunde wieder oben, mit einem kleinen
 * Nachfedern.
 */
export const CRASH_PAD: Cushion = {
  absorb: 0.35,
  maxDepth: 0.3,
  maxRise: 0.08,
  stiffness: 90,
  damping: 12,
};

/**
 * Wie lange ein Rechenschritt der Feder höchstens sein darf.
 *
 * Eine Feder mit `stiffness` 90 und einem Bild von 100 ms explodiert im
 * expliziten Verfahren — und ein Bild von 100 ms hat man genau dann, wenn
 * gerade etwas nachlädt. Deshalb wird ein langes Bild in mehrere kurze
 * zerlegt statt in einem Sprung gerechnet.
 */
const MAX_STEP = 1 / 120;

/** Ab wann die Feder als angekommen gilt und ganz abgeschaltet wird. */
const AT_REST = { depth: 1e-4, rate: 1e-3 };

/** Was die Federung zwischen zwei Bildern trägt. */
export interface ViewSink {
  /** Wie weit die Sicht gerade unter ihrer Ruhelage sitzt, in Metern. */
  depth: number;
  /** Und wie schnell sie das gerade ändert — positiv heißt: sinkt weiter. */
  rate: number;
}

export function newViewSink(): ViewSink {
  return { depth: 0, rate: 0 };
}

/**
 * Ein Aufprall auf dem Kissen.
 *
 * @param speed Wie schnell es dabei nach unten ging, in m/s (positiv)
 */
export function landOnCushion(sink: ViewSink, speed: number, pad: Cushion = CRASH_PAD): void {
  if (speed <= 0) return;
  // Der schnellere Aufprall gewinnt. Zwei Landungen in zwei Bildern sind
  // dieselbe Landung, und die zweite darf die erste nicht abschwächen.
  sink.rate = Math.max(sink.rate, speed * pad.absorb);
}

/**
 * Ein Bild Federung. Gibt zurück, wie weit die Sicht jetzt einsinkt — nie
 * negativ heißt hier nichts: Über der Ruhelage steht eine negative Tiefe, und
 * genau das ist das Nachfedern.
 */
export function stepViewSink(sink: ViewSink, dt: number, pad: Cushion = CRASH_PAD): number {
  if (sink.depth === 0 && sink.rate === 0) return 0;
  let left = Math.min(Math.max(dt, 0), 0.25);
  while (left > 0) {
    const h = Math.min(left, MAX_STEP);
    left -= h;
    sink.rate += (-pad.stiffness * sink.depth - pad.damping * sink.rate) * h;
    sink.depth += sink.rate * h;
    // An den Anschlägen ist die Feder zu Ende, und mit ihr die Geschwindigkeit
    // in diese Richtung — sonst federte sie aus dem Anschlag heraus zurück,
    // als wäre sie dort noch gespannt gewesen.
    if (sink.depth > pad.maxDepth) {
      sink.depth = pad.maxDepth;
      if (sink.rate > 0) sink.rate = 0;
    } else if (sink.depth < -pad.maxRise) {
      sink.depth = -pad.maxRise;
      if (sink.rate < 0) sink.rate = 0;
    }
  }
  if (Math.abs(sink.depth) < AT_REST.depth && Math.abs(sink.rate) < AT_REST.rate) {
    sink.depth = 0;
    sink.rate = 0;
  }
  return sink.depth;
}
