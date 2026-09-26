import { controlHints, hintText, type HintContext, type HintItem } from '../core/controlHints';
import './controlHints.css';

/**
 * **Die Tastenhilfe am Schirm** — eine dezente Zeile unten in der Mitte
 * (`core/controlHints.ts` rechnet, was darin steht).
 *
 * Gezeichnet wird nur, wenn sich der Text geändert hat: `App` fragt jedes
 * Bild, und dreißig Knoten sechzigmal je Sekunde neu zu setzen wäre Arbeit,
 * die niemand sieht.
 *
 * **Abschaltbar** unter _Menü → Eingaben → Tastenhilfe_ (`hintsOn`), gemerkt
 * im Browser. Wer die Knöpfe kennt, braucht keine Zeile im Bild.
 */
export class ControlHints {
  readonly element: HTMLElement;
  private text = '';

  constructor(host: HTMLElement = document.body) {
    this.element = document.createElement('div');
    this.element.className = 'hints';
    this.element.hidden = true;
    // Eine Zeile, die sich mit jedem Blick ändert, soll ein Screenreader nicht
    // jedes Mal vorlesen; die Bedienung steht an den Knöpfen selbst.
    this.element.setAttribute('aria-hidden', 'true');
    host.append(this.element);
  }

  /** Die Lage dieses Bildes — oder `null`: nichts zeigen. */
  update(ctx: HintContext | null): void {
    const items = ctx && hintsOn() ? controlHints(ctx) : [];
    const text = hintText(items);
    if (text === this.text) return;
    this.text = text;
    this.element.hidden = items.length === 0;
    this.element.dataset['device'] = ctx?.device ?? '';
    this.element.dataset['menu'] = ctx?.menu ?? '';
    // Die Sonderzone, für die Lage: Im Baukasten steht unten die Leiste.
    this.element.dataset['zone'] = ctx?.menu ? '' : (ctx?.zone?.kind ?? '');
    this.element.replaceChildren(...items.map(chip));
  }

  dispose(): void {
    this.element.remove();
  }
}

function chip(item: HintItem): HTMLElement {
  const node = document.createElement('span');
  // Das Schildchen der Sonderzone: nur ein Name, keine Taste.
  if (item.tag) {
    node.className = 'hints__zone';
    node.textContent = item.label;
    return node;
  }
  node.className = 'hints__item';
  const key = document.createElement('kbd');
  key.className = 'hints__key';
  key.textContent = item.key;
  node.append(key, document.createTextNode(item.label));
  return node;
}

// --- die Einstellung ---------------------------------------------------------

const KEY = 'bgvr.hints';
let cached: boolean | null = null;
const listeners = new Set<() => void>();

/** Ob die Tastenhilfe gezeigt wird — ab Werk ja. */
export function hintsOn(): boolean {
  if (cached !== null) return cached;
  try {
    cached = globalThis.localStorage?.getItem(KEY) !== '0';
  } catch {
    cached = true;
  }
  return cached;
}

export function setHintsOn(on: boolean): void {
  cached = on;
  try {
    globalThis.localStorage?.setItem(KEY, on ? '1' : '0');
  } catch {
    // Ohne Speicher gilt es eben nur bis zum Neuladen.
  }
  for (const listener of listeners) listener();
}

export function onHintsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
