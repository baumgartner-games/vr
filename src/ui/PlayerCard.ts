import { appearance, appearanceSummary, onAppearanceChange } from '../core/appearance';
import type { PageAside } from './PageMenu';
import { openPreviewScene, turnByDrag, type PreviewScene } from './WardrobeMenu';
import './playerCard.css';

/**
 * **Der Spieler im Inventar** — rechts neben den Werkzeugen, wie die Figur im
 * Inventar von Minecraft (`App.inventoryRoot`, `PageMenu` mit `aside`).
 *
 * Gewünscht war: „rechts den Spieler so wie er aussieht mit einem Button um
 * diesen optisch zu gestalten/anzupassen." Die Figur ist **dieselbe kleine
 * Szene wie in der Umkleide** (`WardrobeMenu.PreviewScene`): ein eigener
 * Renderer, der nur läuft, solange die Karte zu sehen ist (`show`) — beim
 * Wechsel auf einen anderen Reiter und beim Zumachen ist er wieder weg. Der
 * Knopf darunter öffnet die Umkleide selbst; gestaltet wird dort und nicht
 * hier, damit es dafür genau eine Seite gibt.
 *
 * Am Telefon steht die Karte als Streifen **über** den Kacheln: Figur links,
 * Name und Knopf rechts (`playerCard.css`). Die Kacheln bleiben, was sie im
 * Katalog sind — gewünscht war, „bei der Kachel Variante" zu bleiben.
 */
export interface PlayerCardOptions {
  /** Die Id der Seite, neben der die Karte steht. */
  page: string;
  /** Wie der Spieler heißt — steht über der Beschreibung. */
  name: () => string;
  /** _Aussehen anpassen_ wurde gedrückt. */
  onCustomize: () => void;
}

export class PlayerCard implements PageAside {
  readonly page: string;
  readonly element: HTMLElement;

  private readonly stage: HTMLElement;
  private readonly nameEl: HTMLElement;
  private readonly lookEl: HTMLElement;
  private readonly name: () => string;
  private readonly offLook: () => void;
  private view: PreviewScene | null = null;
  private shown = false;

  constructor(options: PlayerCardOptions) {
    this.page = options.page;
    this.name = options.name;

    this.element = el('aside', 'pcard');
    this.element.setAttribute('aria-label', 'Deine Figur');
    this.stage = el('div', 'pcard__stage');
    this.stage.setAttribute('aria-hidden', 'true');
    this.stage.addEventListener('pointerdown', (event) => turnByDrag(event, this.stage, this.view));

    const text = el('div', 'pcard__text');
    this.nameEl = el('strong', 'pcard__name');
    this.lookEl = el('small', 'pcard__look');
    const customize = el('button', 'pcard__edit', 'Aussehen anpassen');
    customize.type = 'button';
    customize.addEventListener('click', () => options.onCustomize());
    text.append(this.nameEl, this.lookEl, customize);

    this.element.append(this.stage, text);
    this.offLook = onAppearanceChange(() => this.refresh());
  }

  show(on: boolean): void {
    if (on === this.shown) return;
    this.shown = on;
    if (!on) {
      this.view?.dispose();
      this.view = null;
      return;
    }
    this.view = openPreviewScene(this.stage);
    // Ohne zweiten WebGL-Kontext bleibt die Karte ohne Bild — Name und Knopf
    // sind trotzdem da, und um die geht es beim Anpassen.
    this.stage.hidden = this.view === null;
    this.refresh();
  }

  dispose(): void {
    this.show(false);
    this.offLook();
    this.element.remove();
  }

  private refresh(): void {
    if (!this.shown) return;
    const look = appearance();
    this.nameEl.textContent = this.name() || 'Du';
    this.lookEl.textContent = appearanceSummary(look);
    this.view?.body.setLook(look);
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  // `textContent`, nie `innerHTML`: Der Name kommt vom Spieler.
  if (text) node.textContent = text;
  return node;
}
