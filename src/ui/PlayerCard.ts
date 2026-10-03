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
  /**
   * _Details_ an der Figur — sie groß ansehen, wie ein Stück im Katalog
   * (`outfitMenu.OUTFIT_DETAIL`). Ohne Angabe gibt es den Knopf nicht.
   */
  onDetail?: () => void;
  /** _Aussehen speichern_ — mit dem Spitznamen aus dem Feld darüber. */
  onSave: (name: string) => void;
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
  /** Der Spitzname zum Bearbeiten — nur unter _Aussehen_ statt des Namens. */
  private readonly nick: HTMLInputElement;
  private readonly nickLabel: HTMLLabelElement;
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
    // **Die Figur im Detail** — gewünscht: _„Bei dem charakter vorschau bild
    // will ich einen button haben, mit dem ich den charakter im detail ansehen
    // kann wie bei katalog items."_ In der Ecke des Bilds, und ein Druck
    // darauf dreht die Figur nicht.
    if (options.onDetail) {
      const detail = button('pcard__detail', '⤢ Details', () => options.onDetail?.());
      detail.title = 'Deine Figur im Detail ansehen';
      detail.addEventListener('pointerdown', (event) => event.stopPropagation());
      this.stage.append(detail);
    }

    const text = el('div', 'pcard__text');
    this.nameEl = el('strong', 'pcard__name');
    // **Der Spitzname gehört zur Figur** — gewünscht: _„in dem charakter
    // anpassen des aussehens, will ich auch den nicknamen ändern können"_.
    // Gespeichert wird er mit demselben Knopf wie das Aussehen.
    this.nickLabel = el('label', 'pcard__nick');
    this.nick = el('input');
    this.nick.type = 'text';
    this.nick.maxLength = 24;
    this.nick.autocomplete = 'off';
    this.nick.spellcheck = false;
    this.nick.placeholder = 'Dein Name';
    this.nickLabel.append(el('span', '', 'Spitzname'), this.nick);
    this.nick.addEventListener('input', () => this.refresh());
    this.nick.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      if (!this.save.disabled) this.save.click();
    });
    this.lookEl = el('small', 'pcard__look');
    this.customize = button('pcard__edit', 'Aussehen anpassen', () => options.onCustomize());
    this.save = button('pcard__edit', 'Aussehen speichern', () =>
      options.onSave(this.nick.value.trim()),
    );
    this.reset = button('pcard__reset', 'Aussehen zurücksetzen', () => options.onReset());
    text.append(this.nameEl, this.nickLabel, this.lookEl, this.customize, this.save, this.reset);

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
    this.nick.value = this.options.name();
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
    this.save.disabled = !this.options.dirty() && !this.renamed();
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

  /** Ob im Feld ein anderer Name steht als der, den man hat. */
  private renamed(): boolean {
    return this.editing && this.nick.value.trim() !== this.options.name().trim();
  }

  private paintMode(): void {
    this.customize.hidden = this.editing;
    this.nameEl.hidden = this.editing;
    this.nickLabel.hidden = !this.editing;
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
