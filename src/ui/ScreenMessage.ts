import './screenMessage.css';

/**
 * **Eine Meldung am Schirm, die man wegklicken kann** — _die_ eine Form für
 * alles, was im Spiel als DOM über dem Bild steht und etwas sagt: die
 * Willkommens-Karte (`ui/WorldWelcome.ts`), die Karte und der Tipp im
 * Restaurant, die Einblendungen des Schiffs und der Rollen im Haunting, die
 * Box nach einem Sturz aus der Welt.
 *
 * Gewünscht war: _„Mach die Meldungen schließbar. Alle Meldungen im Web sollen
 * dieselbe UI benutzen, die man schließen kann."_ Vorher gab es fünf Formen
 * nebeneinander — ein Knopf _Verstanden_, ein ✕ von 28 px nur im Tipp, ein
 * Knopf _Schließen_ in der Sturz-Box, und die Restaurant-Karte, die am Telefon
 * mitten im Bild stand und sich gar nicht schließen ließ.
 *
 * **Eine Form, zwei Größen**: `card` (Kopfzeile, Titel, Text — und was der
 * Aufrufer in `body` dazuhängt) und `pill` (eine Zeile). Beide haben rechts
 * dasselbe ✕: sichtbar ein Kreis von 28 px, getroffen wird aber ein Feld von
 * 44 × 44 px (`screenMessage.css`) — ein Daumen am Telefon trifft kein
 * Zeichen von 28 px. Das Zeichen selbst malt das CSS (`::before`), damit
 * `textContent` der Meldung ihr Text bleibt und kein „✕" dranhängt.
 *
 * **Was Schließen bedeutet, sagt der Aufrufer** (`onClose`): Die
 * Willkommens-Karte gilt als _verstanden_, der Tipp schaltet die
 * Einsteigerhilfe aus, die Restaurant-Karte bleibt bis zum nächsten Schild
 * weg. `hide()` nimmt sie dagegen still weg, ohne `onClose` — dann, wenn
 * nicht der Spieler, sondern der Lauf der Dinge sie wegräumt.
 *
 * **`Esc`** schließt die zuletzt geöffnete Karte, die es erlaubt (`escape`,
 * ab Werk bei `card` ja, bei `pill` nein: Ein Tipp, der mit `Esc` die ganze
 * Hilfe ausschaltet, wäre eine Falle). Ein Menü, das `Esc` schon selbst
 * genommen hat (`preventDefault`), geht vor; in Eingabefeldern bleibt `Esc`
 * dem Feld.
 */
export type MessageKind = 'card' | 'pill';

export interface ScreenMessageOptions {
  /** `card` (ab Werk) mit Kopfzeile und Titel, `pill` für eine Zeile. */
  readonly kind?: MessageKind;
  /** Zusätzliche Klassen: Ort, Farbe, Größe (`welcome`, `plateup-card`, …). */
  readonly className?: string;
  /** Das Element — `section` für eine Karte, die für sich steht. */
  readonly tag?: 'div' | 'section';
  readonly kicker?: string;
  readonly title?: string;
  readonly text?: string;
  /**
   * Was das ✕ tut, als Tooltip (`title`). Vorgelesen wird immer
   * „Schließen" — dasselbe Wort an jeder Meldung.
   */
  readonly closeHint?: string;
  /** Ob `Esc` sie schließt. Ab Werk: `card` ja, `pill` nein. */
  readonly escape?: boolean;
  /** Ob sie für Vorleser eine Statusmeldung ist (`role="status"`). Ab Werk ja. */
  readonly live?: boolean;
  /** Ob sie gleich zu sehen ist. Ab Werk nein — erst mit `show()`. */
  readonly open?: boolean;
  /** Das ✕ oder `Esc` — der Spieler will sie weg. */
  readonly onClose?: () => void;
}

/** Das Wort am ✕, für Vorleser — an jeder Meldung dasselbe. */
export const CLOSE_LABEL = 'Schließen';

export class ScreenMessage {
  readonly element: HTMLElement;
  /** Alles außer dem ✕ — wer mehr braucht (Knöpfe, Chips), hängt es hier an. */
  readonly body: HTMLElement;
  readonly kickerNode: HTMLElement;
  readonly titleNode: HTMLElement;
  readonly textNode: HTMLElement;
  readonly closeButton: HTMLButtonElement;
  readonly kind: MessageKind;
  private readonly escape: boolean;
  private onClose: (() => void) | undefined;

  constructor(options: ScreenMessageOptions = {}) {
    this.kind = options.kind ?? 'card';
    this.escape = options.escape ?? this.kind === 'card';
    this.onClose = options.onClose;

    this.element = document.createElement(options.tag ?? 'div');
    this.element.className = ['msg', `msg--${this.kind}`, options.className ?? ''].join(' ').trim();
    if (options.live ?? true) {
      this.element.setAttribute('role', 'status');
      this.element.setAttribute('aria-live', 'polite');
    }
    this.element.hidden = !options.open;

    this.body = document.createElement('div');
    this.body.className = 'msg__body';
    this.kickerNode = document.createElement('p');
    this.kickerNode.className = 'msg__kicker';
    this.titleNode = document.createElement(this.kind === 'card' ? 'h2' : 'strong');
    this.titleNode.className = 'msg__title';
    this.textNode = document.createElement(this.kind === 'card' ? 'p' : 'span');
    this.textNode.className = 'msg__text';
    this.body.append(this.kickerNode, this.titleNode, this.textNode);
    this.setKicker(options.kicker ?? '');
    this.setTitle(options.title ?? '');
    this.setText(options.text ?? '');

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'msg__close';
    close.setAttribute('aria-label', CLOSE_LABEL);
    close.title = options.closeHint ?? CLOSE_LABEL;
    // Der Druck gehört dem Knopf und nicht dem Spiel darunter (Stöcke am Glas,
    // Zeigersperre am Schreibtisch).
    close.addEventListener('pointerdown', (event) => event.stopPropagation());
    close.addEventListener('click', (event) => {
      event.stopPropagation();
      this.close();
    });
    this.closeButton = close;

    this.element.append(this.body, close);
    if (this.escape) watchEscape(this);
  }

  /** Steht sie gerade da? */
  get open(): boolean {
    return !this.element.hidden;
  }

  setKicker(text: string): void {
    setLine(this.kickerNode, text);
  }

  setTitle(text: string): void {
    setLine(this.titleNode, text);
  }

  setText(text: string): void {
    setLine(this.textNode, text);
  }

  /** Was das ✕ tut — für Meldungen, die es erst später wissen. */
  setOnClose(onClose: (() => void) | undefined): void {
    this.onClose = onClose;
  }

  show(): void {
    if (this.open) return;
    this.element.hidden = false;
    if (this.escape) watchEscape(this);
  }

  /** Still weg — ohne `onClose`, weil nicht der Spieler sie wegnimmt. */
  hide(): void {
    this.element.hidden = true;
  }

  /** Der Spieler will sie weg (✕ oder `Esc`): weg damit, und `onClose`. */
  close(): void {
    this.hide();
    this.onClose?.();
  }

  dispose(): void {
    this.hide();
    unwatchEscape(this);
    this.element.remove();
  }
}

/**
 * **Eine Zeile als Pille, mit ✕** — für Meldungen, die jedes Mal neu gebaut
 * werden (der Tipp im Restaurant). Dasselbe wie `new ScreenMessage` mit
 * `kind: 'pill'`, nur gleich sichtbar.
 */
export function messagePill(
  text: string,
  onClose: () => void,
  options: Omit<ScreenMessageOptions, 'kind' | 'text' | 'onClose'> = {},
): HTMLElement {
  return new ScreenMessage({ ...options, kind: 'pill', text, onClose, open: true }).element;
}

function setLine(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
  node.hidden = !text;
}

// --- Esc ---------------------------------------------------------------------

/** Die Meldungen, die auf `Esc` hören — die zuletzt geöffnete zuletzt. */
const escapable: ScreenMessage[] = [];
let listening = false;

function watchEscape(message: ScreenMessage): void {
  const at = escapable.indexOf(message);
  if (at >= 0) escapable.splice(at, 1);
  escapable.push(message);
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('keydown', onEscape);
}

function unwatchEscape(message: ScreenMessage): void {
  const at = escapable.indexOf(message);
  if (at >= 0) escapable.splice(at, 1);
}

/**
 * `Esc` schließt die oberste offene Meldung — sofern niemand sonst die Taste
 * schon genommen hat (ein Menü) und kein Eingabefeld den Fokus hat. Eine
 * Meldung, die nicht mehr im Dokument hängt, zählt nicht.
 */
export function onEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
  for (let i = escapable.length - 1; i >= 0; i--) {
    const message = escapable[i]!;
    if (!message.open || !message.element.isConnected) continue;
    event.preventDefault();
    message.close();
    return;
  }
}
