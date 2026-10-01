import { appearanceSummary, onAppearanceChange, type Appearance } from '../core/appearance';
import type { PageAside } from './PageMenu';
import { openPreviewScene, turnByDrag, type PreviewScene } from './previewScene';
import './playerCard.css';

/**
 * **Der Spieler im Inventar** — rechts neben den Werkzeugen, wie die Figur im
 * Inventar von Minecraft (`App.inventoryRoot`, `PageMenu` mit `aside`).
 *
 * Gewünscht war: „rechts den Spieler so wie er aussieht mit einem Button um
 * diesen optisch zu gestalten/anzupassen." Die Figur ist eine kleine eigene
 * Szene (`ui/previewScene.ts`): ein eigener Renderer, der nur läuft, solange
 * die Karte zu sehen ist (`show`) — beim Wechsel auf einen anderen Reiter und
 * beim Zumachen ist er wieder weg.
 *
 * **Zwei Gesichter.** Auf der Seite _Inventar_ steht unter der Figur
 * _Aussehen anpassen_; das schlägt _Aussehen_ im selben Menü auf
 * (`ui/outfitMenu.ts`), und dort bleibt die Karte stehen (`covers`) — mit
 * _Aussehen speichern_ und _Aussehen zurücksetzen_ statt des einen Knopfs.
 * Gewünscht: _„dass es in dem tab menü eingebunden bleibt, also wie im
 * zweiten bild, nur dass dann der button ‚Aussehen speichern' ist, und
 * aussehen zurücksetzen als button noch."_ Die Figur trägt dort den Entwurf
 * (`look`), nicht das Gespeicherte. Wer die Seiten verlässt, ohne zu
 * speichern, verwirft ihn (`onLeave`).
 *
 * Am Telefon steht die Karte als Streifen **über** den Kacheln: Figur links,
 * Name und Knöpfe rechts (`playerCard.css`). Die Kacheln bleiben, was sie im
 * Katalog sind — gewünscht war, „bei der Kachel Variante" zu bleiben.
 */
export interface PlayerCardOptions {
  /** Die Id der Seite, neben der die Karte steht. */
  page: string;
  /** Wie der Spieler heißt — steht über der Beschreibung. */
  name: () => string;
  /** Was die Figur trägt — der Entwurf, solange es einen gibt. */
  look: () => Appearance;
  /** Seiten, auf denen die Karte zum Bearbeiten dasteht (Speichern, Zurücksetzen). */
  edits: (page: string) => boolean;
  /** Ob es etwas zu speichern gibt. */
  dirty: () => boolean;
  /** _Aussehen anpassen_ wurde gedrückt. */
  onCustomize: () => void;
  /** _Aussehen speichern_. */
  onSave: () => void;
  /** _Aussehen zurücksetzen_. */
  onReset: () => void;
  /** Die Seiten zum Bearbeiten sind verlassen — oder die Karte ist weg. */
  onLeave: () => void;
}

export class PlayerCard implements PageAside {
  readonly page: string;
  readonly element: HTMLElement;

  private readonly options: PlayerCardOptions;
  private readonly stage: HTMLElement;
  private readonly nameEl: HTMLElement;
  private readonly lookEl: HTMLElement;
  private readonly customize: HTMLButtonElement;
  private readonly save: HTMLButtonElement;
  private readonly reset: HTMLButtonElement;
  private readonly offLook: () => void;
  private view: PreviewScene | null = null;
  private shown = false;
  private editing = false;
  /** Was die Figur in der Szene zuletzt angezogen bekam. */
  private worn = '';

  constructor(options: PlayerCardOptions) {
    this.options = options;
    this.page = options.page;

    this.element = el('aside', 'pcard');
    this.element.setAttribute('aria-label', 'Deine Figur');
    this.stage = el('div', 'pcard__stage');
    this.stage.setAttribute('aria-hidden', 'true');
    this.stage.addEventListener('pointerdown', (event) => turnByDrag(event, this.stage, this.view));

    const text = el('div', 'pcard__text');
    this.nameEl = el('strong', 'pcard__name');
    this.lookEl = el('small', 'pcard__look');
    this.customize = button('pcard__edit', 'Aussehen anpassen', () => options.onCustomize());
    this.save = button('pcard__edit', 'Aussehen speichern', () => options.onSave());
    this.reset = button('pcard__reset', 'Aussehen zurücksetzen', () => options.onReset());
    text.append(this.nameEl, this.lookEl, this.customize, this.save, this.reset);

    this.element.append(this.stage, text);
    this.paintMode();
    this.offLook = onAppearanceChange(() => this.refresh());
  }

  covers(page: string): boolean {
    return this.options.edits(page);
  }

  onPage(page: string): void {
    const editing = this.options.edits(page);
    if (editing === this.editing) {
      this.refresh();
      return;
    }
    this.editing = editing;
    this.paintMode();
    if (!editing) this.options.onLeave();
    this.refresh();
  }

  show(on: boolean): void {
    if (on === this.shown) return;
    this.shown = on;
    if (!on) {
      this.view?.dispose();
      this.view = null;
      if (this.editing) {
        this.editing = false;
        this.paintMode();
        this.options.onLeave();
      }
      return;
    }
    this.view = openPreviewScene(this.stage);
    this.worn = '';
    // Ohne zweiten WebGL-Kontext bleibt die Karte ohne Bild — Name und Knöpfe
    // sind trotzdem da, und um die geht es beim Anpassen.
    this.stage.hidden = this.view === null;
    this.refresh();
  }

  /** Neu zeichnen — nach jeder Wahl im Entwurf und nach jedem Speichern. */
  refresh(): void {
    if (!this.shown) return;
    const look = this.options.look();
    this.nameEl.textContent = this.name();
    this.lookEl.textContent = appearanceSummary(look);
    this.save.disabled = !this.options.dirty();
    // Die Seite zeichnet zweimal die Sekunde neu; angezogen wird nur, was
    // sich wirklich geändert hat.
    const key = `${look.head}|${look.hat}|${look.body}|${look.figure}`;
    if (!this.view || key === this.worn) return;
    this.worn = key;
    this.view.body.setLook(look);
  }

  dispose(): void {
    this.show(false);
    this.offLook();
    this.element.remove();
  }

  private name(): string {
    return this.options.name() || 'Du';
  }

  private paintMode(): void {
    this.customize.hidden = this.editing;
    this.save.hidden = !this.editing;
    this.reset.hidden = !this.editing;
    this.element.classList.toggle('pcard--edit', this.editing);
  }
}

function button(className: string, label: string, run: () => void): HTMLButtonElement {
  const node = el('button', className, label);
  node.type = 'button';
  node.addEventListener('click', run);
  return node;
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
