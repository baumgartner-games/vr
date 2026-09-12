import { el, setData } from './dom';

/**
 * **Die Bausteine der Haunting-Oberfläche** — ein Knopf, eine Kachel, eine
 * Zeile, eine Überschrift, eine Meldung.
 *
 * Haunting hat viele Knöpfe und Panels: das Zahnrad-Menü der 2D-Welt, das
 * der Zentrale auf dem Telefon, die Linse des Zuschauers, die Tafel der
 * Verteilung, die Reiter der Rollen, die Raumakte, das Rätsel. Lange hat
 * jede dieser Stellen ihren Knopf selbst gebaut — `strong` hinein, `small`
 * dazu, `data-*` dran, `is-active`, `aria-pressed` —, und jede ein wenig
 * anders. Das war fünfmal derselbe Knopf und fünfmal ein anderer Fehler.
 *
 * Hier steht er einmal. **Was ein Baustein ist, steht hier; wo er steht,
 * sagt der, der ihn einhängt.** Deshalb nimmt jeder Baustein eine eigene
 * Klasse dazu (`role__watch-key`, `flat__toast`): Die Form kommt aus
 * `widgets.css`, die Lage aus dem Blatt der Stelle. Kein three.js, kein
 * Rundenstand — Text hinein, DOM heraus.
 */

/** Was jeder Knopf annehmen kann, gleich wie er aussieht. */
interface KeyCommon {
  /** Die `data-*`-Schlüssel, an denen der Wirt den Druck erkennt (`setData`). */
  data?: Readonly<Record<string, string>>;
  /** Leuchtet (`is-active`) — die gewählte Einstellung. */
  active?: boolean;
  /** Als `aria-pressed` — nur für Schalter mit an/aus. */
  pressed?: boolean;
  disabled?: boolean;
  /** Der Titel: der Grund, warum er gerade nicht geht, oder ein Hinweis. */
  title?: string;
  ariaLabel?: string;
}

/**
 * **Zwei Bauweisen, ein Knopf.** `text` ist die eine Zeile, so wie sie da
 * steht („Mensch", „Schließen"); `label` steht groß (`strong`) und `sub`,
 * wenn es eines gibt, klein darunter (`small`) — der Listenknopf, die
 * Rollenpille, der Wahlknopf der Linse.
 */
export type KeySpec = KeyCommon & ({ text: string } | { label: string; sub?: string });

/** Ein Knopf. Die Klasse bringt die Stelle mit; `ui-option` und `ui-pill` stehen in `widgets.css`. */
export function key(className: string, spec: KeySpec): HTMLButtonElement {
  const node = el('button', className);
  node.type = 'button';
  if ('text' in spec) node.textContent = spec.text;
  else {
    node.append(el('strong', '', spec.label));
    if (spec.sub) node.append(el('small', '', spec.sub));
  }
  if (spec.data) setData(node, spec.data);
  if (spec.active) node.classList.add('is-active');
  if (spec.pressed !== undefined)
    node.setAttribute('aria-pressed', spec.pressed ? 'true' : 'false');
  if (spec.disabled) node.disabled = true;
  if (spec.title) node.title = spec.title;
  if (spec.ariaLabel) node.setAttribute('aria-label', spec.ariaLabel);
  return node;
}

/**
 * **Der Listenknopf** (`ui-option`): Name groß, Zeile klein, linksbündig —
 * das Menü der 2D-Welt, das der Zentrale, die Linse des Zuschauers. `go` ist
 * der grüne Rand für „los", `leave` der rote für „hinaus".
 */
export function optionKey(
  spec: KeySpec & { tone?: 'go' | 'leave' },
  className = '',
): HTMLButtonElement {
  const classes = ['ui-option'];
  if (spec.tone) classes.push(`ui-option--${spec.tone}`);
  if (className) classes.push(className);
  return key(classes.join(' '), spec);
}

/** **Die Pille** (`ui-pill`): der kleine Knopf am Rand — Schließen, Karte, Zoom. */
export function pillKey(spec: KeySpec, className = ''): HTMLButtonElement {
  return key(className ? `ui-pill ${className}` : 'ui-pill', spec);
}

/**
 * **Die Zeilen eines Knopfs unter dem Daumen**: Beschriftung klein oben,
 * Wert groß darunter — „Wechseln / Lampe", „Linke Hand / Radar",
 * „Interagieren / Klappe öffnen". Zum Nachfüllen mit `replaceChildren`.
 */
export function captioned(caption: string, value: string): HTMLElement[] {
  return [el('small', '', caption), el('strong', '', value)];
}

/** Andersherum: Name groß, Zeile klein — der große „Benutzen" mit dem Ziel darunter. */
export function labelled(label: string, sub: string): HTMLElement[] {
  return [el('strong', '', label), el('small', '', sub)];
}

/** Die Töne einer Kachel: `warn` gelb, `live` in der Farbe der Station, `calm` grau. */
export type NoteTone = 'warn' | 'live' | 'calm';

/**
 * **Die Hinweiskachel** (`ui-note`): Titel und Satz, mit einem Ton am linken
 * Rand. Drei Töne und nicht fünf — eine Oberfläche, in der jede zweite Zeile
 * leuchtet, hat keine Betonung mehr.
 */
export function note(tone: NoteTone, title: string, text: string, className = ''): HTMLElement {
  const node = el('div', `ui-note is-${tone}${className ? ` ${className}` : ''}`);
  node.append(el('strong', '', title), el('span', '', text));
  return node;
}

/**
 * **Eine Zeile mit Begriff und Auskunft** (`ui-fact`) — die Zeile einer Akte.
 * `warn` färbt den Wert, `valueClass` gibt ihm eine eigene Form (der Code,
 * den man durchs Zimmer ruft).
 */
export function fact(
  label: string,
  value: string,
  options: { warn?: boolean; valueClass?: string } = {},
): HTMLElement {
  const row = el('div', `ui-fact${options.warn ? ' is-warn' : ''}`);
  row.append(el('span', '', label), el('b', options.valueClass ?? '', value));
  return row;
}

/**
 * **Die Zwischenüberschrift** (`ui-head`): klein, gesperrt, Großbuchstaben —
 * und rechts eine Beisage, wenn es eine gibt („nur sehen").
 */
export function head(title: string, aside = '', className = ''): HTMLElement {
  const node = el('strong', `ui-head${className ? ` ${className}` : ''}`);
  node.append(el('span', '', title));
  if (aside) node.append(el('span', 'ui-head-aside', aside));
  return node;
}

/** Wie lange eine Meldung stehen bleibt, in Sekunden. */
export const TOAST_SECONDS = 3.2;

/**
 * **Eine Meldung, die von selbst wieder geht** (`ui-toast`). Der Ton kommt
 * als `is-<ton>` an die Pille — die 2D-Welt färbt gut, schlecht und Warnung;
 * wer keinen braucht, lässt ihn weg. Leer ist sie unsichtbar, und die Stelle,
 * die sie einhängt, sagt mit ihrer Klasse, wo sie liegt.
 */
export class Toast {
  readonly element: HTMLElement;
  private readonly base: string;
  private left = 0;

  constructor(className = '') {
    this.base = className ? `ui-toast ${className}` : 'ui-toast';
    this.element = el('div', this.base);
  }

  say(text: string, tone = ''): void {
    if (!text) return;
    this.element.textContent = text;
    this.element.className = tone ? `${this.base} is-${tone}` : this.base;
    this.left = TOAST_SECONDS;
  }

  /** Ob gerade etwas steht. */
  get shown(): boolean {
    return this.left > 0;
  }

  step(dt: number): void {
    if (this.left <= 0) return;
    this.left = Math.max(0, this.left - dt);
    if (this.left <= 0) {
      this.element.textContent = '';
      this.element.className = this.base;
    }
  }
}
