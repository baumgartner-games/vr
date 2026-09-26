/**
 * **Die Meldungen des Schiffs am Bildschirm** — eine kurze Einblendung.
 *
 * Was das Schiff sagt (`ShipHost.say` → `announce` → `ctx.notify`), landete
 * am Bildschirm und am Telefon nur im Status des Handgelenk-Menüs, das dort
 * niemand ansieht: „Geschützt.", „Leer.", „Erst die Runde starten …" — alles
 * stumm. Jetzt steht die neueste Meldung zwei bis drei Sekunden lang oben im
 * Bild und ersetzt die vorige. In der Brille bleibt es beim Handgelenk.
 *
 * **Wo sie steht** (`toastPlace`): oben mittig, unter dem Kompass — und nie
 * über der Tafel (`.orbital-player`). Ist neben der Tafel Platz (Desktop,
 * Telefon quer), steht sie daneben; sonst (Telefon hochkant, die Tafel geht
 * über die ganze Breite) direkt darunter. Unten liegen Tastenhilfe, Streifen
 * und die Knöpfe am Glas, dort also nicht.
 */

/** Ein Rechteck in Bildschirmpunkten, wie `getBoundingClientRect` es gibt. */
export interface ToastRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Wohin die Einblendung kommt: linke Kante, Oberkante, Breite. */
export interface ToastSpot {
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

/** So breit höchstens, in Punkten. */
export const TOAST_MAX_WIDTH = 360;
/** Darunter ist neben der Tafel kein Platz mehr — dann darunter. */
export const TOAST_MIN_WIDTH = 220;
/** Abstand zu Rand, Tafel und Kompass. */
export const TOAST_GAP = 8;

/**
 * **Wo die Einblendung steht.** `panel` ist die Tafel (oder `null`), `others`
 * alles andere, was schon im Bild liegt: Kompass, Tastenhilfe, die Knöpfe am
 * Glas. `top` ist die obere sichere Kante.
 *
 * Zwei Sorten Hindernis, nach ihrer Lage:
 *
 * - **Leisten** — alles, was im oberen Drittel endet (Kompass, Tastenhilfe
 *   oben, der Werkzeugknopf): Die Einblendung geht darunter.
 * - **Knöpfe an der Seite** — was in der oberen Hälfte anfängt und tiefer
 *   reicht (am Telefon quer Zielstock und `A`): Sie begrenzen den freien
 *   Streifen neben der Tafel nach rechts.
 *
 * Was ganz unten liegt (Tastenhilfe am Desktop, Sticks hochkant), stört oben
 * nicht und zählt nicht.
 */
export function toastPlace(
  view: { readonly width: number; readonly height: number },
  top: number,
  panel: ToastRect | null,
  others: readonly ToastRect[] = [],
): ToastSpot {
  const gap = TOAST_GAP;
  const bars = others.filter((o) => o.bottom <= view.height * 0.3);
  const sides = others.filter((o) => o.bottom > view.height * 0.3 && o.top < view.height * 0.5);
  const under = (rects: readonly ToastRect[], left: number, right: number): number =>
    rects.reduce(
      (at, o) => (o.left < right && o.right > left ? Math.max(at, o.bottom + gap) : at),
      top,
    );

  // Neben der Tafel, rechts davon — bis zum ersten Knopf, mittig im Streifen.
  if (panel) {
    const from = panel.right + gap;
    const to = sides.reduce(
      (edge, o) => (o.left > from ? Math.min(edge, o.left - gap) : edge),
      view.width - gap,
    );
    const room = to - from;
    if (room >= TOAST_MIN_WIDTH) {
      const width = Math.min(TOAST_MAX_WIDTH, room);
      const left = from + (room - width) / 2;
      return { left, top: under(bars, left, left + width), width };
    }
  }
  // Sonst mittig — unter der Tafel und unter den Leisten.
  const width = Math.min(TOAST_MAX_WIDTH, view.width - 2 * gap);
  const left = (view.width - width) / 2;
  return { left, top: under(panel ? [...bars, panel] : bars, left, left + width), width };
}

/** **Wie lange sie steht**: zwei Sekunden, für lange Sätze bis drei. */
export function toastSeconds(text: string): number {
  return Math.min(3, 2 + text.length / 80);
}

/** Die Einblendung selbst: ein Element, die neueste Meldung, ein Zeitgeber. */
export class ShipToast {
  readonly element: HTMLDivElement;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'orbital-toast';
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');
    this.element.hidden = true;
  }

  /** Zeigen — die neueste ersetzt die vorige, der Zeitgeber fängt neu an. */
  show(text: string, spot: ToastSpot): void {
    this.element.textContent = text;
    this.move(spot);
    this.element.hidden = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.hide(), toastSeconds(text) * 1000);
  }

  /** Umsetzen, ohne den Zeitgeber anzufassen (die Tafel ist gewachsen). */
  move(spot: ToastSpot): void {
    const style = this.element.style;
    const px = (n: number): string => `${Math.round(n)}px`;
    if (style.left !== px(spot.left)) style.left = px(spot.left);
    if (style.top !== px(spot.top)) style.top = px(spot.top);
    if (style.width !== px(spot.width)) style.width = px(spot.width);
  }

  hide(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.element.hidden = true;
  }

  dispose(): void {
    this.hide();
    this.element.remove();
  }
}
