/**
 * **Das Rollen** — von selbst und von Hand.
 *
 * Ein Schild in einer Lobby trägt mehr, als auf die Tafel passt: der Plan für
 * den Abend, die Regeln, die Liste, wer wann dran ist. Also läuft der Text
 * hoch. Drei Zeilen Arithmetik, und jede davon ist ein Fehler, den man erst in
 * der Brille bemerkt:
 *
 * - **Was hineinpasst, rollt nicht.** Ein Text mit vier Zeilen, der langsam
 *   nach oben aus dem Bild wandert und dann wieder von unten hereinkommt, ist
 *   kein Schild, sondern eine Laufschrift — und unlesbar.
 * - **Oben und unten wird gewartet.** Ohne die Pause beginnt der Text erneut,
 *   bevor die letzte Zeile gelesen ist, und der Anfang ist weg, bevor jemand
 *   hingesehen hat.
 * - **Von Hand gewinnt.** Wer den Daumen an den Stick legt, will lesen, wo er
 *   will; das automatische Rollen wartet dann, statt dagegenzuhalten.
 *
 * Reine Zahlen, deshalb geprüft statt ausprobiert.
 */

export interface ScrollLimits {
  /** Wie hoch der Text zusammen ist, in Pixeln der Leinwand. */
  content: number;
  /** Und wie viel davon zu sehen ist. */
  view: number;
}

export interface AutoScrollState {
  /** Wie weit der Text nach oben geschoben ist. */
  offset: number;
  /** Sekunden, die noch stillgestanden wird — am Anfang und am Ende. */
  wait: number;
}

export interface AutoScrollOptions extends ScrollLimits {
  /** Pixel pro Sekunde. 0 heißt: gar nicht. */
  speed: number;
  /** Wie lange oben und unten gewartet wird. */
  pause?: number;
}

/** Wie lange ein Schild am Anfang und am Ende stehen bleibt. */
export const SCROLL_PAUSE = 2.5;

/** Wie weit man höchstens rollen kann; nie unter null. */
export function maxScroll(limits: ScrollLimits): number {
  return Math.max(0, limits.content - limits.view);
}

/** Hält den Wert im Erlaubten — auch dann, wenn der Text kürzer geworden ist. */
export function clampScroll(offset: number, limits: ScrollLimits): number {
  if (!Number.isFinite(offset)) return 0;
  return Math.min(maxScroll(limits), Math.max(0, offset));
}

/** Der Anfangszustand: ganz oben, und die erste Pause schon angesetzt. */
export function newAutoScroll(pause = SCROLL_PAUSE): AutoScrollState {
  return { offset: 0, wait: pause };
}

/**
 * Ein Bild automatisches Rollen.
 *
 * Am Ende angekommen wird gewartet und danach **an den Anfang gesprungen** —
 * nicht zurückgerollt. Rückwärts laufender Text liest sich wie ein Fehler, und
 * der Sprung ist genau das, was ein Aushang tut, wenn er wieder von vorn
 * beginnt.
 */
export function stepAutoScroll(
  state: AutoScrollState,
  dt: number,
  options: AutoScrollOptions,
): AutoScrollState {
  const pause = options.pause ?? SCROLL_PAUSE;
  const limit = maxScroll(options);
  // Es passt hinein, oder es soll gar nicht laufen: dann steht es oben.
  if (limit <= 0 || options.speed <= 0) return { offset: 0, wait: pause };
  const step = Math.max(0, dt);

  if (state.wait > 0) {
    const wait = state.wait - step;
    if (wait > 0) return { offset: clampScroll(state.offset, options), wait };
    // Die Pause am **Ende** ist zugleich der Sprung zurück an den Anfang.
    if (state.offset >= limit - 1e-6) return { offset: 0, wait: pause };
    return { offset: clampScroll(state.offset, options), wait: 0 };
  }

  const offset = state.offset + options.speed * step;
  if (offset >= limit) return { offset: limit, wait: pause };
  return { offset, wait: 0 };
}

/**
 * Rollen von Hand: der ausgelenkte Stick, ein Bild lang.
 *
 * Die tote Zone ist keine Kosmetik. Ein Stick, der in Ruhe 0,04 meldet — und
 * das tun sie alle —, schöbe ein Schild sonst in einer Minute quer durch
 * seinen Text, ohne dass jemand ihn angefasst hätte.
 */
export const STICK_DEAD_ZONE = 0.2;
/** Wie schnell der voll ausgelenkte Stick rollt, in Zeilenhöhen pro Sekunde. */
export const STICK_LINES_PER_SECOND = 6;

export function stickScroll(
  offset: number,
  axis: number,
  dt: number,
  lineHeight: number,
  limits: ScrollLimits,
): number {
  if (!Number.isFinite(axis) || Math.abs(axis) < STICK_DEAD_ZONE)
    return clampScroll(offset, limits);
  // Aus der toten Zone heraus wieder bei null anfangen: sonst springt es beim
  // Antippen um ein Fünftel Tempo los.
  const scaled =
    (Math.sign(axis) * (Math.abs(axis) - STICK_DEAD_ZONE)) / Math.max(1e-6, 1 - STICK_DEAD_ZONE);
  return clampScroll(
    offset + scaled * STICK_LINES_PER_SECOND * lineHeight * Math.max(0, dt),
    limits,
  );
}

/** Ob der Stick gerade wirklich bedient wird — dann pausiert das Automatische. */
export function stickActive(axis: number): boolean {
  return Number.isFinite(axis) && Math.abs(axis) >= STICK_DEAD_ZONE;
}
