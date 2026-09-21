import { drawMenuIcon, type MenuEntry } from './menu';
import { MenuNav } from './menuNav';
import type { PagePreviewLayer } from './previewGrid';
import './pageMenu.css';

/**
 * **Dasselbe Menü als Seite** — für alle, die keine Handgelenke im Bild haben.
 *
 * In der Brille hängt das Menü am Arm (`WristMenu.ts`): ein Panel aus
 * Leinwand und Dreiecken, mit dem Strahl der anderen Hand bedient. Im
 * Browserfenster gab es bisher **dasselbe Panel**, frei vor die Kamera
 * gehängt — und am Telefon war das ein Bild von einem Menü, kein Menü: winzig,
 * mit dem Daumen kaum zu treffen, und hinter jeder 2D-Welt verschwunden, die
 * den Bildschirm für sich brauchte. Der Besitzer wollte es anders: **im Web
 * ein Knopf oben links, und dahinter ein Menü, das auf dem Handy zuerst
 * funktioniert** — eine Komponente für die Startseite und für jede Welt im
 * Browser, mobile first.
 *
 * Hier steht sie. Sie zeichnet **denselben Baum** (`MenuEntry`), den auch die
 * Handgelenke bekommen, mit denselben Ikonen (`drawMenuIcon`) und auf
 * **demselben Weg** (`MenuNav`): Wer im Browser drei Ebenen tief in den
 * Einstellungen steht, die Brille aufsetzt und dort das Menü öffnet, steht
 * auf derselben Seite. Was eine Zeile tut, weiß sie nicht — sie ruft `run`
 * und zeichnet neu, wie das Panel am Arm.
 *
 * Auf dem Telefon ist sie ein **Blatt von unten**, so breit wie der
 * Bildschirm, mit Zeilen, die ein Daumen trifft; ab 640 Punkten Breite ein
 * Kasten unter dem Knopf oben links (`pageMenu.css`). Zurück geht es über
 * den Pfeil im Kopf, nicht über eine Zeile in der Liste: Eine Webseite lässt
 * ihren Kopf auch stehen.
 *
 * Welche der beiden Fassungen gerade gilt, entscheidet `WristMenus`: mit
 * aufgesetzter Brille die Handgelenke, sonst diese Seite. Kein three.js — nur
 * DOM, damit ein Test sie ohne Browser aufschlagen kann (`pageMenu.test.ts`).
 *
 * **Auch die drehenden Modelle nicht.** Eine Kachel des Asset-Regals zeigt
 * nicht ihre Ikone, sondern das Ding selbst (`MenuEntry.preview`) — und das
 * ist three.js. Die Seite hält dafür nur den Platz frei: ein Quadrat je
 * Kachel (`.pmenu__prev`) und den **scrollenden Kasten**, in den eine
 * Vorschauschicht ihre Leinwand hängen darf (`previewGrid.ts`,
 * `PagePreviewLayer`). Gezeichnet wird dahinter (`PagePreviews.ts`); kommt
 * niemand, bleibt im Quadrat die Ikone stehen, die dort ohnehin stünde.
 */

interface Page {
  title: string;
  entries: MenuEntry[];
  grid: boolean;
  /** Spalten im Raster, wenn die Seite eigene will (`MenuEntry.cols`). */
  cols?: number;
  /** Antippen **nimmt** die Zeile (Werkzeugregal); der Pfeil öffnet ihre Seite. */
  take: boolean;
  /** Id des Eintrags, zu dem die Seite gehört. */
  id: string;
}

export interface PageMenuOptions {
  title?: string;
  /** Der geteilte Weg durch den Baum — derselbe wie an den Handgelenken. */
  nav?: MenuNav;
  /** Woran das Menü hängt; ohne Angabe `document.body`. */
  host?: HTMLElement;
  /** Auf- oder zugegangen — für den Knopf, der es öffnet (`aria-expanded`). */
  onToggle?: (open: boolean) => void;
}

/** Wie groß eine Ikone gezeichnet wird, in Bildpunkten der Leinwand. */
const ICON_PX = 64;

export class PageMenu {
  /** Das Ganze: Hintergrund zum Wegtippen und das Blatt darauf. */
  readonly element: HTMLElement;
  private readonly sheet: HTMLElement;
  private readonly backButton: HTMLButtonElement;
  private readonly titleEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  /**
   * Der scrollende Kasten. Er trägt zweierlei: die Liste mit den Zeilen und
   * die Leinwand der Vorschau — **beide** im selben Inhalt, damit sie beim
   * Scrollen zusammenbleiben (`PagePreviews.ts`).
   */
  private readonly stage: HTMLElement;
  private readonly list: HTMLElement;
  private readonly footEl: HTMLElement;

  private readonly nav: MenuNav;
  private readonly offNav: () => void;
  private readonly onToggle: ((open: boolean) => void) | null;

  private root: MenuEntry[] = [];
  private rootTitle: string;
  private stack: Page[] = [];
  private open = false;
  /** Wie weit jede Seite geblättert war, in Bildpunkten, nach Id. */
  private readonly scrolls = new Map<string, number>();
  /** Welche Seite gerade in der Liste steht — `''`, wenn sie neu gebaut werden muss. */
  private renderedPage = '';
  /** Wer die kleinen Modelle zeichnet, wenn es jemanden gibt. */
  private previews: PagePreviewLayer | null = null;
  /** Ob die Brille auf ist — dann zeichnet das Handgelenk und nicht die Seite. */
  private presenting = false;

  constructor(options: PageMenuOptions = {}) {
    this.rootTitle = options.title ?? 'Menü';
    this.nav = options.nav ?? new MenuNav();
    this.onToggle = options.onToggle ?? null;

    this.element = el('div', 'pmenu');
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-label', this.rootTitle);

    this.sheet = el('div', 'pmenu__sheet');
    this.sheet.tabIndex = -1;

    const head = el('header', 'pmenu__head');
    this.backButton = iconButton('pmenu__nav pmenu__back', 'Zurück', 'M14 6l-6 6 6 6');
    this.backButton.hidden = true;
    this.titleEl = el('h2', 'pmenu__title');
    const close = iconButton('pmenu__nav pmenu__close', 'Schließen', 'M6 6l12 12M18 6L6 18');
    head.append(this.backButton, this.titleEl, close);

    this.statusEl = el('p', 'pmenu__status');
    this.statusEl.setAttribute('aria-live', 'polite');
    this.list = el('div', 'pmenu__list');
    // Gescrollt wird der Kasten, nicht die Liste: Die Leinwand der Vorschau
    // liegt als zweites Kind darin und wird damit von derselben Hand bewegt
    // wie die Kacheln (`PagePreviews.ts`). Ein Neubau der Liste tauscht nur
    // deren Kinder aus und lässt die Leinwand deshalb stehen.
    this.stage = el('div', 'pmenu__stage');
    this.stage.append(this.list);
    this.footEl = el('p', 'pmenu__foot');

    this.sheet.append(head, this.statusEl, this.stage, this.footEl);
    this.element.append(this.sheet);
    (options.host ?? document.body).append(this.element);

    // Neben das Blatt tippen macht es zu — auf dem Telefon der einzige Weg,
    // der ohne Zielen geht.
    this.element.addEventListener('click', (event) => {
      if (event.target === this.element) this.toggle(false);
    });
    close.addEventListener('click', () => this.toggle(false));
    this.backButton.addEventListener('click', () => {
      this.keepScroll();
      this.nav.pop();
    });
    this.list.addEventListener('click', (event) => this.onListClick(event));
    window.addEventListener('keydown', this.onKeyDown);

    this.offNav = this.nav.onChange(() => this.applyNav());
    this.applyNav();
  }

  get isOpen(): boolean {
    return this.open;
  }

  /**
   * Einen Baum aufs Blatt legen, **ohne den Spieler zu bewegen** — dieselbe
   * Zusage wie am Handgelenk: Der Baum wird bei jeder Änderung neu gebaut, und
   * die Seite, auf der man war, wird danach wieder aufgeschlagen (`menuNav`).
   */
  setRoot(entries: MenuEntry[], title = this.rootTitle): void {
    this.root = entries;
    this.rootTitle = title;
    this.nav.prune(entries);
    this.applyNav();
  }

  /** Das Untermenü eines Wurzeleintrags aufschlagen — und das Menü dazu öffnen. */
  openSubmenu(id: string): void {
    const entry = this.root.find((candidate) => candidate.id === id);
    if (!entry?.children) return;
    this.keepScroll();
    this.nav.goTo([id]);
    this.toggle(true);
  }

  setStatus(status: string): void {
    this.statusEl.textContent = status;
  }

  /**
   * Wer die kleinen Modelle zeichnet — oder `null`, dann zeichnet sie niemand.
   *
   * Gesetzt wird das von `WristMenus`, wenn eine Welt ihre Modellfabrik
   * abgibt, und beim Verlassen wieder weggenommen. Die Seite selbst weiß
   * nichts über three.js und will es auch nicht wissen: Sie reicht ihren
   * Rahmen und ihre Liste hinüber und sagt Bescheid, wenn sie auf- oder
   * zugeht.
   */
  setPreviews(layer: PagePreviewLayer | null): void {
    if (layer === this.previews) return;
    this.previews?.dispose();
    this.previews = layer;
    if (!layer) {
      // Ohne Vorschau steht in den Quadraten wieder die Ikone — aber nur,
      // wenn gerade jemand hinsieht.
      if (this.open) this.render();
      return;
    }
    layer.mount(this.stage, this.onPreviewReady);
    layer.setPresenting(this.presenting);
    if (!this.open) return;
    // Erst die Kacheln, dann die Schleife: Der Beobachter bekommt sonst eine
    // leere Liste und lädt nichts.
    this.render();
    layer.setOpen(true);
  }

  /**
   * Brille auf oder ab. In der Brille ist die Seite ohnehin zu (`WristMenus`);
   * gesagt wird es der Vorschau trotzdem, denn eine zweite Zeichenschleife
   * neben einer XR-Sitzung ist genau das, was dort fehlt.
   */
  setPresenting(on: boolean): void {
    this.presenting = on;
    this.previews?.setPresenting(on);
  }

  toggle(force?: boolean): void {
    const next = force ?? !this.open;
    if (next === this.open) return;
    this.open = next;
    this.element.hidden = !next;
    if (next) {
      this.render();
      this.previews?.setOpen(true);
      this.sheet.focus({ preventScroll: true });
    } else {
      this.previews?.setOpen(false);
      this.keepScroll();
      // Eine versteckte Liste vergisst ihre Blätterstellung; beim nächsten
      // Öffnen wird sie neu gebaut und dort aufgeschlagen, wo sie verlassen wurde.
      this.renderedPage = '';
    }
    this.onToggle?.(next);
  }

  /** Die offene Seite neu zeichnen — eine Zeile, deren Text sich änderte. */
  refresh(): void {
    if (this.open) this.render();
  }

  dispose(): void {
    this.offNav();
    this.previews?.dispose();
    this.previews = null;
    window.removeEventListener('keydown', this.onKeyDown);
    this.element.remove();
  }

  // --- Seiten -------------------------------------------------------------

  private get page(): Page {
    return this.stack[this.stack.length - 1]!;
  }

  /** Der Weg aus dem geteilten Merkzettel, als Stapel von Seiten. */
  private applyNav(): void {
    this.stack = [
      { title: this.rootTitle, entries: this.root, grid: false, take: false, id: 'root' },
    ];
    let level: MenuEntry[] = this.root;
    for (const id of this.nav.path) {
      const entry = level.find((candidate) => candidate.id === id);
      if (!entry?.children) break;
      this.stack.push(pageOf(entry));
      level = entry.children;
    }
    if (this.open) this.render();
  }

  private keepScroll(): void {
    this.scrolls.set(this.page.id, this.stage.scrollTop);
  }

  /**
   * Die Seite zeichnen — **und dabei stehen lassen, was schon steht.**
   *
   * Der Baum wird ständig neu gebaut: die Bildraten-Zeile zweimal die Sekunde,
   * jede Zeile bei jedem Druck, die Peer-Liste bei jedem Kommen und Gehen.
   * Am Handgelenk ist das ein neues Bild auf derselben Leinwand; im DOM wäre
   * es ein neuer Knopf unter dem Finger — und ein Tipp, der auf dem alten
   * anfängt und auf dem neuen endet, ist kein Klick. Also werden die frischen
   * Zeilen mit den stehenden verglichen, und nur eine, die sich wirklich
   * geändert hat, wird getauscht. Die Blätterstellung bleibt dabei, wo sie
   * ist; nur eine **andere** Seite fängt dort an, wo sie verlassen wurde.
   */
  private render(): void {
    const page = this.page;
    this.titleEl.textContent = page.title;
    this.backButton.hidden = this.stack.length <= 1;
    this.list.classList.toggle('pmenu__list--grid', page.grid);
    // Die Spaltenzahl steht als CSS-Variable am Raster und nicht als Klasse:
    // So kann eine Seite zwei Spalten wollen (das Asset-Regal), ohne dass für
    // jede denkbare Zahl eine Regel im Stylesheet steht.
    this.list.style.setProperty('--pmenu-cols', String(page.cols ?? 3));
    this.footEl.textContent = page.take
      ? 'Antippen nimmt es in die Hand · der Pfeil öffnet die Einstellungen'
      : '';
    const ready = this.hasModel;
    const fresh = page.entries.map((entry, index) =>
      page.grid ? tile(entry, index, ready) : row(entry, index, page.take, ready),
    );
    const standing = [...this.list.children] as HTMLElement[];
    const sameRows =
      this.renderedPage === page.id &&
      standing.length === fresh.length &&
      standing.every((node, index) => node.dataset['key'] === fresh[index]!.dataset['key']);
    if (sameRows) {
      standing.forEach((node, index) => {
        const next = fresh[index]!;
        if (node.outerHTML !== next.outerHTML) node.replaceWith(next);
      });
    } else {
      this.list.replaceChildren(...fresh);
      this.stage.scrollTop = this.scrolls.get(page.id) ?? 0;
    }
    this.renderedPage = page.id;
    // Zum Schluss, und immer: Welche Quadrate jetzt dastehen, weiß nur, wer
    // gerade neu gezeichnet hat.
    this.previews?.observe(page.id, [...this.list.querySelectorAll<HTMLElement>('[data-preview]')]);
  }

  /** Ob zu dieser Vorschau-Id schon ein Modell steht — dann bleibt die Ikone weg. */
  private readonly hasModel = (id: string): boolean => this.previews?.has(id) ?? false;

  /** Ein Modell ist angekommen: die Kachel darunter noch einmal zeichnen. */
  private readonly onPreviewReady = (): void => {
    if (this.open) this.render();
  };

  // --- Bedienung ----------------------------------------------------------

  private onListClick(event: Event): void {
    const target = event.target as HTMLElement;
    const more = target.closest<HTMLElement>('[data-more]');
    const hit = more ?? target.closest<HTMLElement>('[data-index]');
    if (!hit || !this.list.contains(hit)) return;
    const index = Number(more ? more.dataset['more'] : hit.dataset['index']);
    const entry = this.page.entries[index];
    if (!entry) return;
    // Der Pfeil einer Nimm-Zeile geht in ihre Einstellungen; die Zeile selbst
    // nimmt. Überall sonst öffnet die Zeile ihre Seite, wenn sie eine hat.
    const descend = entry.children && (more !== null || !(this.page.take && entry.run));
    if (descend) {
      this.keepScroll();
      // **Bevor** der Weg umgestellt wird: Wer erst beim Aufschlagen etwas
      // laden will, soll es beim ersten Bild der neuen Seite schon getan
      // haben (`MenuEntry.onOpen`).
      entry.onOpen?.();
      this.nav.push(entry.id);
      return;
    }
    entry.run?.(null);
    this.render();
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (this.open && event.key === 'Escape') this.toggle(false);
  };
}

// --- Bausteine --------------------------------------------------------------

/** Eine Menüseite aus dem Eintrag, der sie öffnet — wie am Handgelenk. */
function pageOf(entry: MenuEntry): Page {
  const grid = entry.grid ?? false;
  return {
    title: entry.label,
    entries: entry.children ?? [],
    grid,
    ...(entry.cols === undefined ? {} : { cols: entry.cols }),
    take: entry.take ?? grid,
    id: entry.id,
  };
}

function row(
  entry: MenuEntry,
  index: number,
  take: boolean,
  ready: (id: string) => boolean,
): HTMLElement {
  const accent = cssColor(entry.accent);
  const node = el('button', 'pmenu__row');
  node.type = 'button';
  node.dataset['index'] = String(index);
  node.dataset['id'] = entry.id;
  node.dataset['key'] = `row:${entry.id}`;
  node.style.setProperty('--accent', accent);
  if (entry.selected) node.classList.add('is-selected');
  if (entry.checked !== undefined) {
    node.setAttribute('role', 'switch');
    node.setAttribute('aria-checked', entry.checked ? 'true' : 'false');
  }
  if (entry.caption) node.title = entry.caption;

  node.append(face(entry, accent, ready));

  const text = el('span', 'pmenu__text');
  text.append(el('strong', '', entry.label));
  if (entry.sub) text.append(el('small', '', entry.sub));
  node.append(text);

  if (entry.badge) node.append(el('span', 'pmenu__badge', entry.badge));

  if (entry.checked !== undefined) {
    const toggle = el('span', 'pmenu__switch');
    if (entry.checked) toggle.classList.add('is-on');
    node.append(toggle);
  } else if (entry.children) {
    if (take && entry.run) {
      // Zwei Ziele in einer Zeile: Die Zeile nimmt, der Pfeil steigt ab. Ein
      // Knopf im Knopf ist kein gültiges DOM, also liegt der Pfeil daneben —
      // die Zeile wird dafür schmaler (`pmenu__row--split`).
      node.classList.add('pmenu__row--split');
      const wrap = el('div', 'pmenu__pair');
      wrap.dataset['key'] = `pair:${entry.id}`;
      const more = iconButton('pmenu__more', `${entry.label}: Einstellungen`, 'M9 6l6 6-6 6');
      more.dataset['more'] = String(index);
      more.style.setProperty('--accent', accent);
      wrap.append(node, more);
      return wrap;
    }
    node.append(chevron());
  } else if (entry.selected) {
    node.append(el('span', 'pmenu__dot'));
  }
  return node;
}

function tile(entry: MenuEntry, index: number, ready: (id: string) => boolean): HTMLElement {
  const accent = cssColor(entry.accent);
  const node = el('button', 'pmenu__tile');
  node.type = 'button';
  node.dataset['index'] = String(index);
  node.dataset['id'] = entry.id;
  node.dataset['key'] = `tile:${entry.id}`;
  node.style.setProperty('--accent', accent);
  if (entry.selected) node.classList.add('is-selected');
  if (entry.caption) node.title = entry.caption;
  node.append(face(entry, accent, ready), el('strong', '', entry.label));
  if (entry.caption) node.append(el('small', '', entry.caption));
  if (entry.badge) node.append(el('span', 'pmenu__badge', entry.badge));
  return node;
}

/**
 * **Was links (oder oben) in der Zeile steht** — und das ist zweierlei.
 *
 * Ohne `preview` die Ikone wie bisher. Mit `preview` ein **Quadrat**, in das
 * eine Vorschauschicht ihr drehendes Modell zeichnet (`PagePreviews.ts`).
 * Das Quadrat steht auch dann da, wenn niemand zeichnet — es hält den Platz,
 * damit im Raster kein Loch entsteht —, und solange kein Modell angekommen
 * ist, steht die Ikone darin. Erst wenn eines steht, geht sie weg: zwei
 * Bilder übereinander wären nur Unruhe, und genau so hält es auch das Panel
 * am Handgelenk.
 */
function face(entry: MenuEntry, accent: string, ready: (id: string) => boolean): HTMLElement {
  const id = entry.preview;
  if (!id) return icon(entry, accent);
  const box = el('span', 'pmenu__prev');
  box.dataset['preview'] = id;
  if (!ready(id)) box.append(icon(entry, accent));
  return box;
}

/**
 * Die Ikone der Zeile, gezeichnet mit demselben Stift wie am Handgelenk.
 * Ohne Ikone bleibt ein farbiger Punkt — und ohne Leinwand (jsdom) bleibt
 * die Fläche leer, was einem Test egal ist.
 */
function icon(entry: MenuEntry, accent: string): HTMLElement {
  if (!entry.icon) {
    const dot = el('span', 'pmenu__icon pmenu__icon--blank');
    dot.style.setProperty('--accent', accent);
    return dot;
  }
  const canvas = document.createElement('canvas');
  canvas.className = 'pmenu__icon';
  canvas.width = ICON_PX;
  canvas.height = ICON_PX;
  const ctx = canvas.getContext('2d');
  if (ctx) drawMenuIcon(ctx, entry.icon, ICON_PX / 2, ICON_PX / 2, ICON_PX * 0.68, accent);
  return canvas;
}

function chevron(): HTMLElement {
  const node = el('span', 'pmenu__chevron');
  node.setAttribute('aria-hidden', 'true');
  node.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>';
  return node;
}

/** Ein runder Knopf mit einem Strich darauf — Zurück, Schließen, der Pfeil. */
function iconButton(className: string, label: string, path: string): HTMLButtonElement {
  const node = el('button', className);
  node.type = 'button';
  node.setAttribute('aria-label', label);
  node.title = label;
  // Feste Zeichenkette, kein fremder Text: `path` kommt aus dieser Datei.
  node.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" /></svg>`;
  return node;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  // `textContent`, nie `innerHTML`: Beschriftungen kommen auch von Mitspielern.
  if (text) node.textContent = text;
  return node;
}

/** Aus der Zahl des Eintrags (`0x4aa8ff`) die Farbe, die CSS versteht. */
export function cssColor(accent: number | undefined): string {
  return `#${(accent ?? 0x4aa8ff).toString(16).padStart(6, '0')}`;
}
