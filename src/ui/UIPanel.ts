import * as THREE from 'three';
import type { PointerHit, PointerTarget } from '../core/Pointer';
import type { Handedness } from '../core/XRInput';
import { drawMenuIcon, type MenuEntry } from './menu';
import { pageScroll } from './pageScroll';
import {
  SCREEN_BODY_TOP,
  SCREEN_FOOTER_H,
  SCREEN_H,
  SCREEN_PAD,
  SCREEN_W,
  controlAt,
  sameControl,
  screenCols,
  screenHead,
  type Rect,
  type ScreenControl,
  type ScreenHead,
} from './screenLayout';

/** Everything about a page except its title and its rows. */
export interface PageOptions {
  /** Icons in a grid instead of one row per entry. */
  grid?: boolean;
  /**
   * Wie viele Kacheln nebeneinander stehen — ohne Angabe `GRID_COLS`.
   *
   * Das Asset-Regal nimmt zwei, weil in seinen Kacheln keine Strichzeichnung
   * steht, sondern das Modell selbst: Bei drei Spalten ist es zu klein, um
   * zwei ähnliche Fässer auseinanderzuhalten, und darum geht es dort.
   */
  cols?: number;
  /** Replaces the standing footer while this page is shown. */
  hint?: string;
  /**
   * What makes this page *this* page.
   *
   * Re-applying a page with the same key keeps the scroll position and what
   * the pointer was resting on — and that matters far more than it sounds: a
   * page is re-applied every time a row is used, because using a row is what
   * changes its label. Without this, taking a tool off the shelf or stepping
   * a setting one notch threw you back to the top of the list, which for the
   * tool shelf means scrolling down again for every single tool.
   *
   * Defaults to the title, which is enough for a panel that only ever shows
   * one page (the kart's clipboard, the drone's settings).
   */
  key?: string;
  /** Where a page that really *is* new starts. */
  scroll?: number;
  /**
   * Wie viele Einträge am Anfang **stehen bleiben**, statt mitzuscrollen.
   *
   * Eins davon, immer: die *Zurück*-Zeile. Sie war bisher der erste Eintrag
   * einer normalen Liste und damit weg, sobald man drei Zeilen weit geblättert
   * hatte — und dann kommt man aus einer langen Seite nur wieder heraus, indem
   * man erst blind nach oben blättert. Eine Webseite lässt ihren Kopf auch
   * stehen. Angeheftete Einträge werden als Zeilen gezeichnet, auch auf einer
   * Rasterseite: dort ist es dann ein Kopfbalken über dem Raster, was genau
   * das ist, wonach es aussieht.
   */
  pinned?: number;
  /**
   * **Der Weg bis hierher**, klein über dem Titel — an der Stelle, an der
   * sonst _BAUMGARTNER VR_ steht. Dieselben Brotkrumen wie am Schirm
   * (`PageMenu.paintCrumbs`), nur ohne Knöpfe: Zurück geht es in der Brille
   * über die feste Zeile darunter.
   */
  crumb?: string;
  /**
   * **Reiter unter dem Titel** — dieselbe Reihe wie am Schirm
   * (`PageMenu`, `tabs`): Inventar, Katalog, Welten, Einstellungen. Ein Druck
   * darauf geht an `PanelOptions.onTab`.
   */
  tabs?: readonly PanelTab[];
  /** Welcher Reiter gerade offen ist, als Index in `tabs`. */
  tab?: number;
  /** Nur im Bildschirm-Format: der Knopf _Zurück_ links im Kopf. */
  back?: boolean;
  /** Nur im Bildschirm-Format: das Haus rechts im Kopf (_Von vorne_). */
  home?: boolean;
}

/** Ein Reiter über der Seite (`PageOptions.tabs`). */
export interface PanelTab {
  readonly label: string;
  readonly icon?: MenuEntry['icon'];
  readonly accent?: number;
}

export interface PanelOptions {
  width?: number;
  /**
   * **Hochkant** (der Normalfall, für die Tafeln an Werkzeugen) oder als
   * **Bildschirm** in 16:9 mit dem Kopf der Seite am Schirm: ◀ ▶, Reiter, ✕,
   * darunter Zurück, Titel und Haus (`ui/screenLayout.ts`). So steht das
   * Menü in der Brille vor dem Spieler (`XRMenu`).
   */
  layout?: 'portrait' | 'screen';
  title?: string;
  footer?: string;
  /** Eigenschaft statt Methode: Sie wird gespeichert und später einzeln gerufen. */
  onSelect?: (index: number, hand: Handedness | null) => void;
  /** Ein Reiter wurde gedrückt (`PageOptions.tabs`). */
  onTab?: (index: number, hand: Handedness | null) => void;
  /** Ein Knopf im Kopf des Bildschirms wurde gedrückt: ◀ ▶ ✕ ← ⌂. */
  onControl?: (
    control: 'prev' | 'next' | 'close' | 'back' | 'home',
    hand: Handedness | null,
  ) => void;
}

const CANVAS_W = 768;
const CANVAS_H = 1280;
/** Wie hoch ein Panel im Verhältnis zu seiner Breite ist (hochkant). */
export const PANEL_ASPECT = CANVAS_H / CANVAS_W;
/** Und im Bildschirm-Format: 16:9. */
export const SCREEN_ASPECT = SCREEN_H / SCREEN_W;
const PAD = 34;
const HEADER_H = 150;
const FOOTER_H = 76;
/** Die Reihe der Reiter unter dem Titel, samt Luft darunter. */
const TAB_H = 104;
const TAB_GAP = 8;

/** So lange steht eine Meldung in der Fußzeile, dann kommt der Hinweis zurück. */
const STATUS_MS = 10000;

function now(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

const ROW_H = 122;
const ROW_GAP = 14;
/** Zwischen zwei Spalten von Zeilen (nur im Bildschirm-Format). */
const ROW_COL_GAP = 18;

/** Spalten im Raster, wo keine Seite etwas anderes sagt (`PageOptions.cols`). */
const GRID_COLS = 3;
const GRID_GAP = 16;
/** Wie hoch eine Kachel über ihre Breite hinaus ist: die Zeile mit dem Namen. */
const CELL_LABEL_H = 44;

/** Der Kreis, wo der Strahl auf dem Panel aufsetzt — Radius in Bruchteilen der Panelbreite. */
const MARKER_R = 0.009;

/**
 * A canvas-textured panel that shows a page of menu entries — as a list, or as
 * a grid of icons. It only needs a UV coordinate to hit-test, so pointing and
 * poking work the same way.
 */
export class UIPanel extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: THREE.CanvasTexture;
  /** Hochkant oder Bildschirm (`PanelOptions.layout`). */
  private readonly screen: boolean;
  /** Die Leinwand in Bildpunkten. */
  private readonly cw: number;
  private readonly ch: number;
  private readonly pad: number;
  /**
   * **Der Kreis, wo der Strahl aufsetzt** — gewünscht: _„ich will dann ja mit
   * einem strahl sehen auf welches element ich zeige (und am bildschirm
   * erscheint zusätzlich dort ein kleiner kreis)"_. Ein Ring als Kind des
   * Panels, kein Neuzeichnen der Leinwand: Er wandert jedes Bild mit.
   */
  private readonly marker: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private entries: MenuEntry[] = [];
  private grid = false;
  /** Spalten dieser Seite; die Breite einer Kachel hängt daran. */
  private cols = GRID_COLS;
  private pinned = 0;
  private hover = -1;
  private title: string;
  private crumb = '';
  private footer: string;
  private hint = '';
  private status = '';
  /** Wann die Meldung kam (`performance.now()`) — sie geht nach `STATUS_MS`. */
  private statusAt = 0;
  /** Index of the first entry drawn — a long page is scrolled, not cut off. */
  private scroll = 0;
  /** Which page is on show; a change is what resets the scroll. */
  private pageKey = '';
  private flash = 0;
  private onSelect?: (index: number, hand: Handedness | null) => void;
  private onTab?: (index: number, hand: Handedness | null) => void;
  private onControl?: PanelOptions['onControl'];
  private tabs: readonly PanelTab[] = [];
  private tab = -1;
  /** Der Reiter unter dem Strahl, oder `-1` (hochkant). */
  private hoverTab = -1;
  /** Der Kopf des Bildschirms (`ui/screenLayout.ts`), neu bei jeder Seite. */
  private head: ScreenHead | null = null;
  private back = false;
  private home = false;
  /** Der Knopf oder Reiter im Kopf unter dem Strahl (Bildschirm). */
  private hoverControl: ScreenControl | null = null;

  constructor(options: PanelOptions = {}) {
    const screen = options.layout === 'screen';
    const cw = screen ? SCREEN_W : CANVAS_W;
    const ch = screen ? SCREEN_H : CANVAS_H;
    const width = options.width ?? 0.3;
    const height = (width * ch) / cw;
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    super(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }),
    );

    this.screen = screen;
    this.cw = cw;
    this.ch = ch;
    this.pad = screen ? SCREEN_PAD : PAD;
    this.texture = texture;
    this.ctx = canvas.getContext('2d')!;
    this.title = options.title ?? '';
    this.footer = options.footer ?? '';
    this.onSelect = options.onSelect;
    this.onTab = options.onTab;
    this.onControl = options.onControl;
    this.name = 'ui-panel';
    this.renderOrder = 10;
    this.geometry.computeBoundingBox();

    const r = width * MARKER_R;
    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(r * 0.55, r, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        depthTest: false,
        toneMapped: false,
      }),
    );
    this.marker.name = 'ui-panel-marker';
    this.marker.renderOrder = 13;
    this.marker.visible = false;
    // Der Ring ist kein Ziel: Ein Strahl, der ihn träfe, träfe das Panel nicht.
    this.marker.raycast = () => {};
    this.add(this.marker);

    if (screen) this.head = screenHead(0, { back: false, home: false }, cw);
    this.draw();
  }

  /**
   * Puts a page on the panel. The same page twice keeps its place — see
   * `PageOptions.key`.
   */
  setPage(title: string, entries: MenuEntry[], options: PageOptions = {}): void {
    const key = options.key ?? title;
    this.title = title;
    this.crumb = options.crumb ?? '';
    this.tabs = options.tabs ?? [];
    this.tab = options.tab ?? -1;
    this.entries = entries;
    this.grid = options.grid ?? false;
    this.cols = this.screen
      ? screenCols(this.grid, options.cols, this.cw)
      : Math.max(1, Math.floor(options.cols ?? GRID_COLS));
    this.pinned = Math.min(Math.max(0, Math.floor(options.pinned ?? 0)), entries.length);
    this.hint = options.hint ?? '';
    this.back = options.back ?? false;
    this.home = options.home ?? false;
    if (this.screen) {
      this.head = screenHead(this.tabs.length, { back: this.back, home: this.home }, this.cw);
    }
    this.scroll = pageScroll({
      previousKey: this.pageKey,
      key,
      current: this.scroll,
      ...(options.scroll === undefined ? {} : { remembered: options.scroll }),
      entries: entries.length - this.pinned,
      pageSize: this.pageSize,
    });
    // What the pointer rested on only survives on the page it belonged to.
    if (key !== this.pageKey) {
      this.hover = -1;
      this.hovered.index = -1;
    }
    this.pageKey = key;
    this.draw();
  }

  /** True while the page holds more than fits — then the stick has a job. */
  get scrollable(): boolean {
    return this.entries.length - this.pinned > this.pageSize;
  }

  /** How far down the page currently sits — what a caller remembers for later. */
  get scrollOffset(): number {
    return this.scroll;
  }

  /** Wie viele Einträge auf einmal daraufpassen — das Maß fürs Wischen. */
  get rowsPerPage(): number {
    return this.pageSize;
  }

  /**
   * Wo das Bild eines Eintrags gerade sitzt — in Metern, im Raum des Panels.
   *
   * Damit stellt `XRMenu` die kleinen Modelle vor die richtige Stelle, ohne
   * etwas über Kacheln, Kopfbalken und Blätterstand wissen zu müssen. `null`
   * für alles, was gerade **nicht zu sehen** ist; daran hängt drüben auch, was
   * geladen wird und was wieder weggeräumt werden darf.
   *
   * **Auch eine Kachel hat jetzt eine Stelle.** Hier stand für jede Rasterseite
   * ein `null` — Kacheln zeigten Strichzeichnungen, und für ein Modell war
   * „kein Platz". Für das Asset-Regal ist das Bild in der Kachel aber der
   * ganze Zweck: Ein Ordner voller Fässer, alle mit demselben Ordnersymbol,
   * ist ein Regal, aus dem man nichts findet. Der Anker sitzt in der Mitte des
   * oberen Quadrats — über dem Namen, dort, wo sonst die Ikone steht.
   */
  rowAnchor(index: number): { x: number; y: number; size: number } | null {
    // Der Kopfbalken ist immer eine Zeile, auch über einem Raster.
    if (index < this.pinned) {
      return this.anchorOf(
        this.pad + 58,
        this.headerH + index * (ROW_H + ROW_GAP) + ROW_H / 2,
        ROW_H * 0.6,
      );
    }
    const slot = index - this.pinned - this.scroll;
    if (slot < 0 || slot >= this.visibleCount) return null;
    if (!this.grid) {
      const rect = this.rowRect(slot);
      return this.anchorOf(rect.x + 58, rect.y + ROW_H / 2, ROW_H * 0.6);
    }
    const cellW = this.cellW;
    const column = slot % this.cols;
    const row = Math.floor(slot / this.cols);
    return this.anchorOf(
      this.pad + column * (cellW + GRID_GAP) + cellW / 2,
      this.bodyTop + row * (this.cellH + GRID_GAP) + cellW / 2,
      // Etwas kleiner als das Quadrat: Ein Modell, das die Kachel ausfüllt,
      // ragt beim Drehen über ihren Rand hinaus.
      cellW * 0.62,
    );
  }

  /** Aus Bildpunkten der Leinwand wird eine Stelle in Metern auf dem Panel. */
  private anchorOf(x: number, y: number, size: number): { x: number; y: number; size: number } {
    const width = this.geometry.parameters.width;
    const height = this.geometry.parameters.height;
    return {
      x: (x / this.cw - 0.5) * width,
      y: (0.5 - y / this.ch) * height,
      size: (size / this.ch) * height,
    };
  }

  /**
   * Springt an eine Stelle, statt sich um Zeilen weiterzuschieben.
   *
   * Das Wischen rechnet gegen den Stand beim Zupacken und nicht gegen den
   * letzten Frame — sonst driftet die Liste unter dem Finger weg, sobald ein
   * einziger Frame ausfällt.
   *
   * @returns true, wenn sich wirklich etwas bewegt hat
   */
  scrollTo(offset: number): boolean {
    // Immer auf den Anfang einer Reihe: Zwei Spalten, die um eins versetzt
    // anfangen, schieben jede Kachel beim Blättern in die andere Spalte.
    const step = this.perRow;
    const next = THREE.MathUtils.clamp(Math.round(offset / step) * step, 0, this.maxScroll);
    if (next === this.scroll) return false;
    this.scroll = next;
    this.hover = -1;
    this.hovered.index = -1;
    this.draw();
    return true;
  }

  /**
   * Moves the page by whole rows. More tools than rows is the normal case now,
   * so the shelf scrolls instead of quietly hiding the bottom of the list.
   *
   * @returns true when something actually moved
   */
  scrollBy(rows: number): boolean {
    if (!this.scrollable) return false;
    return this.scrollTo(this.scroll + rows * this.perRow);
  }

  setStatus(status: string): void {
    this.statusAt = now();
    if (this.status === status) return;
    this.status = status;
    this.draw();
  }

  /**
   * Entry the pointer currently rests on, with the hand that points at it —
   * und **wo** auf dem Panel der Strahl aufsetzt (`v`, 0 unten bis 1 oben).
   *
   * Das `v` ist das, woraus das Wischen entsteht: Trigger halten und die Hand
   * bewegen ist genau eine Änderung dieser einen Zahl.
   */
  hovered: { index: number; hand: Handedness | null; v: number } = {
    index: -1,
    hand: null,
    v: 0,
  };

  asPointerTarget(): PointerTarget {
    return {
      object: this,
      onHover: (hit) => {
        this.hovered.hand = hit.hand;
        if (hit.uv) this.hovered.v = hit.uv.y;
        this.showMarker(hit);
        if (this.screen) {
          this.setHoverControl(hit.uv ? this.controlAt(hit.uv) : null);
        } else {
          this.setHoverTab(hit.uv ? this.tabAt(hit.uv) : -1);
        }
        this.setHover(hit.uv ? this.indexAt(hit.uv) : -1);
      },
      onBlur: () => {
        this.hovered.hand = null;
        this.marker.visible = false;
        this.setHoverTab(-1);
        this.setHoverControl(null);
        this.setHover(-1);
      },
      onSelect: (hit) => this.handleSelect(hit),
    };
  }

  /** Redraws after an entry changed, e.g. a toggle. */
  refresh(): void {
    this.draw();
  }

  update(dt: number): void {
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt);
      this.draw();
    }
    // **Eine Meldung ist eine Meldung und keine Fußzeile.** Sie blieb bisher
    // stehen, bis die nächste kam — und weil jede Welt beim Betreten eine
    // schickt, stand an ihrer Stelle praktisch nie, wie man zurückkommt
    // („B zurück"). Nach `STATUS_MS` gibt sie den Platz wieder frei.
    if (this.status && now() - this.statusAt > STATUS_MS) {
      this.status = '';
      this.draw();
    }
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.marker.geometry.dispose();
    this.marker.material.dispose();
  }

  /** Der Ring an die Stelle, an der der Strahl aufsetzt — eine Spur vor dem Panel. */
  private showMarker(hit: PointerHit): void {
    if (hit.poke || !hit.uv) {
      this.marker.visible = false;
      return;
    }
    const { width, height } = this.geometry.parameters;
    this.marker.position.set((hit.uv.x - 0.5) * width, (hit.uv.y - 0.5) * height, 0.002);
    this.marker.visible = true;
  }

  private handleSelect(hit: PointerHit): void {
    if (this.screen) {
      const control = hit.uv ? this.controlAt(hit.uv) : null;
      if (control) {
        this.flash = 0.18;
        if (control.kind === 'tab') this.onTab?.(control.index, hit.hand);
        else this.onControl?.(control.kind, hit.hand);
        return;
      }
    }
    const tab = !this.screen && hit.uv ? this.tabAt(hit.uv) : -1;
    if (tab >= 0) {
      this.flash = 0.18;
      this.onTab?.(tab, hit.hand);
      return;
    }
    const index = hit.uv ? this.indexAt(hit.uv) : -1;
    if (index < 0) return;
    this.flash = 0.18;
    this.setHover(index);
    this.onSelect?.(index, hit.hand);
  }

  private setHover(index: number): void {
    this.hovered.index = index;
    if (this.hover === index) return;
    this.hover = index;
    this.draw();
  }

  private setHoverTab(index: number): void {
    if (this.hoverTab === index) return;
    this.hoverTab = index;
    this.draw();
  }

  private setHoverControl(control: ScreenControl | null): void {
    if (sameControl(this.hoverControl, control)) return;
    this.hoverControl = control;
    this.draw();
  }

  /** Der Knopf im Kopf an dieser Stelle (Bildschirm). */
  private controlAt(uv: THREE.Vector2): ScreenControl | null {
    return this.head ? controlAt(this.head, uv.x * this.cw, (1 - uv.y) * this.ch) : null;
  }

  /** Wo die Liste anfängt: unter dem Titel — und unter den Reitern, wenn es welche gibt. */
  private get headerH(): number {
    if (this.screen) return SCREEN_BODY_TOP;
    return this.tabs.length > 0 ? HEADER_H + TAB_H : HEADER_H;
  }

  private get footerH(): number {
    return this.screen ? SCREEN_FOOTER_H : FOOTER_H;
  }

  /** Der Reiter unter dieser Stelle, oder `-1` (hochkant). */
  private tabAt(uv: THREE.Vector2): number {
    if (this.tabs.length === 0) return -1;
    const x = uv.x * CANVAS_W - PAD;
    const y = (1 - uv.y) * CANVAS_H - HEADER_H;
    if (y < 0 || y > TAB_H - 14 || x < 0 || x > CANVAS_W - PAD * 2) return -1;
    const width = (CANVAS_W - PAD * 2) / this.tabs.length;
    return Math.min(this.tabs.length - 1, Math.floor(x / width));
  }

  /** Wie viele Zeilen nebeneinander stehen — hochkant eine, als Bildschirm zwei. */
  private get rowCols(): number {
    return this.screen ? screenCols(false) : 1;
  }

  /** Wie viele Einträge eine Reihe weiterschiebt. */
  private get perRow(): number {
    return this.grid ? this.cols : this.rowCols;
  }

  /** Wie breit der Inhalt ist — rechts Platz für den Rollbalken. */
  private get bodyW(): number {
    return this.cw - this.pad * 2;
  }

  /** Die Stelle einer Zeile im sichtbaren Teil der Liste. */
  private rowRect(slot: number): Rect {
    const cols = this.rowCols;
    const gutter = this.scrollable ? 18 : 0;
    const w = (this.bodyW - gutter - ROW_COL_GAP * (cols - 1)) / cols;
    const column = slot % cols;
    const row = Math.floor(slot / cols);
    return {
      x: this.pad + column * (w + ROW_COL_GAP),
      y: this.bodyTop + row * (ROW_H + ROW_GAP),
      w,
      h: ROW_H,
    };
  }

  /** Die Breite einer Kachel auf dieser Seite. */
  private get cellW(): number {
    return Math.floor((this.bodyW - GRID_GAP * (this.cols - 1)) / this.cols);
  }

  /** Und ihre Höhe: quadratisch für das Bild, plus die Zeile mit dem Namen. */
  private get cellH(): number {
    return this.cellW + CELL_LABEL_H;
  }

  /** Wo der scrollende Teil anfängt: unter dem Titel und dem Kopfbalken. */
  private get bodyTop(): number {
    return this.headerH + this.pinned * (ROW_H + ROW_GAP);
  }

  /** How many entries fit on one page — der Kopfbalken nimmt Platz weg. */
  private get pageSize(): number {
    const body = this.ch - this.bodyTop - this.footerH;
    return this.grid
      ? Math.max(this.cols, Math.floor(body / (this.cellH + GRID_GAP)) * this.cols)
      : Math.max(1, Math.floor(body / (ROW_H + ROW_GAP))) * this.rowCols;
  }

  /** The furthest down this page can go without scrolling past its last row. */
  private get maxScroll(): number {
    const rows = this.entries.length - this.pinned;
    const over = Math.max(0, rows - this.pageSize);
    // Auf eine ganze Reihe aufgerundet — sonst fängt die letzte Seite mitten
    // in einer Reihe an.
    return Math.ceil(over / this.perRow) * this.perRow;
  }

  private get visibleCount(): number {
    return Math.max(0, Math.min(this.entries.length - this.pinned - this.scroll, this.pageSize));
  }

  private indexAt(uv: THREE.Vector2): number {
    const x = uv.x * this.cw;
    let y = (1 - uv.y) * this.ch - this.headerH;
    if (y < 0 || x < this.pad || x > this.cw - this.pad) return -1;

    if (this.pinned > 0) {
      const row = Math.floor(y / (ROW_H + ROW_GAP));
      if (row < this.pinned) return y % (ROW_H + ROW_GAP) > ROW_H ? -1 : row;
      y -= this.pinned * (ROW_H + ROW_GAP);
    }

    if (this.grid) {
      const cellW = this.cellW;
      const cellH = this.cellH;
      const column = Math.floor((x - this.pad) / (cellW + GRID_GAP));
      const row = Math.floor(y / (cellH + GRID_GAP));
      if (column < 0 || column >= this.cols || row < 0) return -1;
      if ((x - this.pad) % (cellW + GRID_GAP) > cellW) return -1;
      if (y % (cellH + GRID_GAP) > cellH) return -1;
      const index = row * this.cols + column;
      return index < this.visibleCount ? this.pinned + this.scroll + index : -1;
    }

    const absY = y + this.bodyTop;
    for (let slot = 0; slot < this.visibleCount; slot++) {
      const rect = this.rowRect(slot);
      if (x >= rect.x && x <= rect.x + rect.w && absY >= rect.y && absY <= rect.y + rect.h) {
        return this.pinned + this.scroll + slot;
      }
    }
    return -1;
  }

  private cardHeight(): number {
    // Ein Bildschirm bleibt ein Bildschirm, auch wenn die Seite kurz ist.
    if (this.screen) return this.ch;
    const count = this.visibleCount;
    const body = this.grid
      ? Math.ceil(count / this.cols) * (this.cellH + GRID_GAP)
      : count * (ROW_H + ROW_GAP);
    return Math.min(this.ch, this.bodyTop + body + this.footerH);
  }

  private draw(): void {
    const ctx = this.ctx;
    const cardH = this.cardHeight();
    const pad = this.pad;
    ctx.clearRect(0, 0, this.cw, this.ch);

    ctx.beginPath();
    ctx.roundRect(0, 0, this.cw, cardH, 40);
    ctx.fillStyle = 'rgba(9, 14, 26, 0.93)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(140, 180, 255, 0.35)';
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if (this.screen) {
      this.drawScreenHead();
    } else {
      ctx.fillStyle = '#8ea0c4';
      ctx.font = '600 26px system-ui, sans-serif';
      ctx.fillText(
        fitText(ctx, this.crumb ? this.crumb.toUpperCase() : 'BAUMGARTNER VR', this.cw - pad * 2),
        pad,
        62,
      );

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 46px system-ui, sans-serif';
      ctx.fillText(this.title, pad, 118);
      this.drawTabs();
    }

    // Der Kopfbalken zuerst: er steht, egal wie weit die Liste darunter
    // gescrollt ist — auf einer Rasterseite genauso, dort als Zeile über den
    // Kacheln.
    for (let i = 0; i < this.pinned; i++) {
      this.drawRow(
        this.entries[i]!,
        { x: pad, y: this.headerH + i * (ROW_H + ROW_GAP), w: this.bodyW, h: ROW_H },
        i === this.hover,
      );
    }

    for (let i = 0; i < this.visibleCount; i++) {
      const index = this.pinned + this.scroll + i;
      const entry = this.entries[index]!;
      if (this.grid) {
        const column = i % this.cols;
        const row = Math.floor(i / this.cols);
        this.drawCell(
          entry,
          pad + column * (this.cellW + GRID_GAP),
          this.bodyTop + row * (this.cellH + GRID_GAP),
          index === this.hover,
        );
      } else {
        this.drawRow(entry, this.rowRect(i), index === this.hover);
      }
    }
    this.drawScrollbar(cardH);

    const footer =
      this.status ||
      // Eine lange Seite unter einer anderen (angeheftetes _Zurück_): Blättern
      // und Zurück in einer Zeile — `B`/`Y` ist sonst nirgends zu lesen.
      (this.scrollable
        ? this.pinned > 0 || this.back
          ? 'Stick oder wischen blättert · B/Y zurück'
          : 'Stick oder Trigger halten und wischen blättert'
        : '') ||
      this.hint ||
      this.footer;
    if (footer) {
      ctx.fillStyle = this.status ? '#9fd0ff' : '#71809e';
      ctx.font = '400 24px system-ui, sans-serif';
      ctx.fillText(clip(ctx, footer, this.cw - pad * 2), pad, cardH - (this.screen ? 22 : 34));
    }

    this.texture.needsUpdate = true;
  }

  /**
   * **Der Kopf des Bildschirms** — wie die Seite am Schirm: ◀ ▶ und die
   * Reiter oben, ✕ rechts; darunter Zurück, der Weg und der Titel, das Haus.
   */
  private drawScreenHead(): void {
    const head = this.head;
    if (!head) return;
    const ctx = this.ctx;
    const hot = (control: ScreenControl): boolean => sameControl(this.hoverControl, control);

    if (head.prev) this.drawRoundButton(head.prev, 'prev', hot({ kind: 'prev' }));
    if (head.next) this.drawRoundButton(head.next, 'next', hot({ kind: 'next' }));
    this.drawRoundButton(head.close, 'close', hot({ kind: 'close' }));
    if (head.back) this.drawRoundButton(head.back, 'back', hot({ kind: 'back' }));
    if (head.home) this.drawRoundButton(head.home, 'home', hot({ kind: 'home' }));

    ctx.save();
    ctx.textAlign = 'center';
    head.tabs.forEach((rect, index) => {
      const tab = this.tabs[index]!;
      const accent = toCss(tab.accent ?? 0x4aa8ff);
      const on = index === this.tab;
      const over = hot({ kind: 'tab', index });
      ctx.beginPath();
      ctx.roundRect(rect.x + TAB_GAP / 2, rect.y, rect.w - TAB_GAP, rect.h, 18);
      ctx.fillStyle = on
        ? 'rgba(140, 170, 230, 0.2)'
        : over
          ? 'rgba(140, 170, 230, 0.16)'
          : 'rgba(140, 170, 230, 0.06)';
      ctx.fill();
      if (over) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = accent;
        ctx.stroke();
      }
      if (on) {
        ctx.fillStyle = accent;
        ctx.fillRect(rect.x + TAB_GAP / 2 + 14, rect.y + rect.h - 6, rect.w - TAB_GAP - 28, 6);
      }
      // Ikone links neben dem Wort, wie am Schreibtisch (`.pmenu__tab`).
      // Erst kleiner, dann ohne Ikone, dann gekürzt: „Einstellungen" soll
      // ganz dastehen.
      const room = rect.w - TAB_GAP - 24;
      const fits = (px: number, withIcon: boolean): boolean => {
        ctx.font = `600 ${px}px system-ui, sans-serif`;
        return ctx.measureText(tab.label).width <= room - (withIcon ? 44 : 0);
      };
      const icon = Boolean(tab.icon) && [28, 25].some((px) => fits(px, true));
      if (!icon) [28, 25, 22].some((px) => fits(px, false));
      const label = clip(ctx, tab.label, icon ? room - 44 : room);
      const textW = ctx.measureText(label).width;
      const total = textW + (icon ? 44 : 0);
      let x = rect.x + rect.w / 2 - total / 2;
      if (icon && tab.icon) {
        drawMenuIcon(ctx, tab.icon, x + 18, rect.y + rect.h / 2, 36, accent);
        x += 44;
      }
      ctx.fillStyle = on || over ? '#ffffff' : '#8ea0c4';
      ctx.textAlign = 'left';
      ctx.fillText(label, x, rect.y + rect.h / 2 + 10);
      ctx.textAlign = 'center';
    });
    ctx.restore();

    const text = head.text;
    ctx.fillStyle = '#8ea0c4';
    ctx.font = '600 22px system-ui, sans-serif';
    if (this.crumb)
      ctx.fillText(fitText(ctx, this.crumb.toUpperCase(), text.w), text.x, text.crumbY);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 42px system-ui, sans-serif';
    ctx.fillText(
      clip(ctx, this.title, text.w),
      text.x,
      this.crumb ? text.titleY : (text.crumbY + text.titleY) / 2 + 8,
    );
  }

  /** Ein runder Knopf im Kopf mit seinem Zeichen — wie `.pmenu__nav` am Schirm. */
  private drawRoundButton(
    rect: Rect,
    glyph: 'prev' | 'next' | 'close' | 'back' | 'home',
    hot: boolean,
  ): void {
    const ctx = this.ctx;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const r = rect.w / 2;
    const active = hot && this.flash > 0;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
    ctx.fillStyle = active
      ? 'rgba(140, 170, 230, 0.5)'
      : hot
        ? 'rgba(140, 170, 230, 0.3)'
        : 'rgba(140, 170, 230, 0.12)';
    ctx.fill();
    ctx.lineWidth = hot ? 3 : 2;
    ctx.strokeStyle = hot ? '#ffffff' : 'rgba(255,255,255,0.18)';
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const s = r * 0.36;
    ctx.beginPath();
    switch (glyph) {
      case 'prev':
      case 'back':
        ctx.moveTo(cx + s * 0.45, cy - s);
        ctx.lineTo(cx - s * 0.55, cy);
        ctx.lineTo(cx + s * 0.45, cy + s);
        break;
      case 'next':
        ctx.moveTo(cx - s * 0.45, cy - s);
        ctx.lineTo(cx + s * 0.55, cy);
        ctx.lineTo(cx - s * 0.45, cy + s);
        break;
      case 'close':
        ctx.moveTo(cx - s, cy - s);
        ctx.lineTo(cx + s, cy + s);
        ctx.moveTo(cx + s, cy - s);
        ctx.lineTo(cx - s, cy + s);
        break;
      case 'home':
        ctx.moveTo(cx - s, cy - s * 0.1);
        ctx.lineTo(cx, cy - s);
        ctx.lineTo(cx + s, cy - s * 0.1);
        ctx.lineTo(cx + s, cy + s);
        ctx.lineTo(cx - s, cy + s);
        ctx.closePath();
        break;
    }
    ctx.stroke();
    ctx.restore();
  }

  /**
   * **Die Reiter** — gleich breit über die ganze Zeile, Ikone über dem Wort,
   * der offene mit seiner Farbe unterstrichen. Wie am Schirm (`.pmenu__tab`).
   */
  private drawTabs(): void {
    const tabs = this.tabs;
    if (tabs.length === 0) return;
    const ctx = this.ctx;
    const width = (CANVAS_W - PAD * 2) / tabs.length;
    const top = HEADER_H - 6;
    const height = TAB_H - 14;
    ctx.save();
    ctx.textAlign = 'center';
    tabs.forEach((tab, index) => {
      const x = PAD + index * width;
      const accent = `#${(tab.accent ?? 0x4aa8ff).toString(16).padStart(6, '0')}`;
      const on = index === this.tab;
      const hot = index === this.hoverTab;
      ctx.beginPath();
      ctx.roundRect(x + TAB_GAP / 2, top, width - TAB_GAP, height, 18);
      ctx.fillStyle = on
        ? 'rgba(140, 170, 230, 0.2)'
        : hot
          ? 'rgba(140, 170, 230, 0.14)'
          : 'rgba(140, 170, 230, 0.06)';
      ctx.fill();
      if (on) {
        ctx.fillStyle = accent;
        ctx.fillRect(x + TAB_GAP / 2 + 12, top + height - 6, width - TAB_GAP - 24, 6);
      }
      if (tab.icon) drawMenuIcon(ctx, tab.icon, x + width / 2, top + 30, 34, accent);
      ctx.fillStyle = on || hot ? '#ffffff' : '#8ea0c4';
      // Erst kleiner, dann gekürzt: „Einstellungen" soll ganz dastehen.
      const room = width - TAB_GAP - 12;
      ctx.font = '600 22px system-ui, sans-serif';
      for (const px of [18, 15]) {
        if (ctx.measureText(tab.label).width <= room) break;
        ctx.font = `600 ${px}px system-ui, sans-serif`;
      }
      ctx.fillText(clip(ctx, tab.label, room), x + width / 2, top + 76);
    });
    ctx.restore();
  }

  /** Where in a long page we are, drawn along the right edge. */
  private drawScrollbar(cardH: number): void {
    if (!this.scrollable) return;
    const ctx = this.ctx;
    const top = this.bodyTop - 6;
    const height = cardH - this.footerH - top;
    const x = this.cw - 24;
    const rows = this.entries.length - this.pinned;
    const portion = this.pageSize / rows;
    const thumb = Math.max(40, height * portion);
    const travel = (height - thumb) * (this.scroll / Math.max(1, this.maxScroll));

    ctx.beginPath();
    ctx.roundRect(x, top, 9, height, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x, top + travel, 9, thumb, 5);
    ctx.fillStyle = 'rgba(174, 208, 255, 0.9)';
    ctx.fill();
  }

  private drawRow(entry: MenuEntry, rect: Rect, hovered: boolean): void {
    const ctx = this.ctx;
    const accent = toCss(entry.accent ?? 0x4aa8ff);
    const active = hovered && this.flash > 0;
    const { x, y } = rect;
    const right = x + rect.w;

    ctx.beginPath();
    ctx.roundRect(x, y, rect.w, ROW_H, 24);
    ctx.fillStyle = active
      ? withAlpha(accent, 0.45)
      : hovered
        ? withAlpha(accent, 0.22)
        : 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.strokeStyle = hovered ? accent : 'rgba(255,255,255,0.12)';
    ctx.stroke();

    let textX = x + 30;
    if (entry.preview) {
      // Der Platz bleibt frei: davor steht ein kleines Modell im Raum
      // (`XRMenu.updatePreviews`), und eine Strichzeichnung darunter wäre
      // nur Unruhe.
      textX = x + 100;
    } else if (entry.icon) {
      drawMenuIcon(ctx, entry.icon, x + 58, y + ROW_H / 2, 52, accent);
      textX = x + 100;
    } else {
      ctx.beginPath();
      ctx.roundRect(x + 18, y + 22, 8, ROW_H - 44, 4);
      ctx.fillStyle = accent;
      ctx.fill();
      textX = x + 46;
    }

    const rightEdge = right - (entry.children ? 60 : entry.checked !== undefined ? 110 : 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 36px system-ui, sans-serif';
    ctx.fillText(clip(ctx, entry.label, rightEdge - textX), textX, y + (entry.sub ? 52 : 74));

    if (entry.sub) {
      ctx.fillStyle = '#93a3c4';
      ctx.font = '400 25px system-ui, sans-serif';
      ctx.fillText(clip(ctx, entry.sub, rightEdge - textX), textX, y + 90);
    }

    if (entry.checked !== undefined) {
      const width = 74;
      const height = 38;
      const left = right - 24 - width;
      const top = y + ROW_H / 2 - height / 2;
      ctx.beginPath();
      ctx.roundRect(left, top, width, height, height / 2);
      ctx.fillStyle = entry.checked ? accent : 'rgba(255,255,255,0.14)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        left + (entry.checked ? width - height / 2 : height / 2),
        top + height / 2,
        height / 2 - 5,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else if (entry.children) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(right - 46, y + ROW_H / 2 - 14);
      ctx.lineTo(right - 32, y + ROW_H / 2);
      ctx.lineTo(right - 46, y + ROW_H / 2 + 14);
      ctx.stroke();
    } else if (entry.selected) {
      ctx.beginPath();
      ctx.arc(right - 34, y + ROW_H / 2, 9, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    }

    if (entry.badge) {
      ctx.font = '600 20px system-ui, sans-serif';
      const width = ctx.measureText(entry.badge).width + 26;
      ctx.beginPath();
      ctx.roundRect(right - 70 - width, y + 18, width, 34, 17);
      ctx.fillStyle = withAlpha(accent, 0.25);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillText(entry.badge, right - 70 - width + 13, y + 42);
    }
  }

  private drawCell(entry: MenuEntry, x: number, y: number, hovered: boolean): void {
    const ctx = this.ctx;
    const cellW = this.cellW;
    const cellH = this.cellH;
    const accent = toCss(entry.accent ?? 0x4aa8ff);
    const active = hovered && this.flash > 0;

    ctx.beginPath();
    ctx.roundRect(x, y, cellW, cellH, 22);
    ctx.fillStyle = active
      ? withAlpha(accent, 0.45)
      : hovered
        ? withAlpha(accent, 0.22)
        : 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.strokeStyle = hovered ? accent : 'rgba(255,255,255,0.12)';
    ctx.stroke();

    // Das obere Quadrat der Kachel gehört dem Bild — und wo ein **Modell**
    // davorsteht (`XRMenu.updatePreviews`), bleibt es leer: Eine
    // Strichzeichnung darunter wäre nur Unruhe, genau wie in einer Zeile.
    if (entry.icon && !entry.preview) {
      drawMenuIcon(ctx, entry.icon, x + cellW / 2, y + cellW / 2, cellW * 0.52, accent);
    }

    // A grid can be a choice as well as a shelf — then one cell is the one
    // that is on, and a dot in the corner says which.
    if (entry.selected) {
      ctx.beginPath();
      ctx.arc(x + cellW - 18, y + 18, 7, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 24px system-ui, sans-serif';
    ctx.fillText(clip(ctx, entry.label, cellW - 20), x + cellW / 2, y + cellH - 16);
    ctx.textAlign = 'left';
  }
}

function toCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function withAlpha(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function clip(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

/**
 * Kürzt eine Zeile **von vorn**, bis sie passt — bei Brotkrumen ist die
 * Stufe direkt über der Seite die wichtigste, und die steht hinten.
 */
function fitText(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`… ${cut}`).width > width) cut = cut.slice(1);
  return `… ${cut.trimStart()}`;
}
