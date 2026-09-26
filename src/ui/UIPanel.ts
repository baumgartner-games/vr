import * as THREE from 'three';
import type { PointerHit, PointerTarget } from '../core/Pointer';
import type { Handedness } from '../core/XRInput';
import { drawMenuIcon, type MenuEntry } from './menu';
import { pageScroll } from './pageScroll';

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
}

export interface PanelOptions {
  width?: number;
  title?: string;
  footer?: string;
  /** Eigenschaft statt Methode: Sie wird gespeichert und später einzeln gerufen. */
  onSelect?: (index: number, hand: Handedness | null) => void;
}

const CANVAS_W = 768;
const CANVAS_H = 1280;
const PAD = 34;
const HEADER_H = 150;
const FOOTER_H = 76;

/** So lange steht eine Meldung in der Fußzeile, dann kommt der Hinweis zurück. */
const STATUS_MS = 10000;

function now(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

const ROW_H = 122;
const ROW_GAP = 14;

/** Spalten im Raster, wo keine Seite etwas anderes sagt (`PageOptions.cols`). */
const GRID_COLS = 3;
const GRID_GAP = 16;
/** Wie hoch eine Kachel über ihre Breite hinaus ist: die Zeile mit dem Namen. */
const CELL_LABEL_H = 44;

/** Die Breite einer Kachel folgt der Spaltenzahl, die Höhe ihr. */
function cellWidth(cols: number): number {
  return Math.floor((CANVAS_W - PAD * 2 - GRID_GAP * (cols - 1)) / cols);
}

/**
 * A canvas-textured panel that shows a page of menu entries — as a list, or as
 * a grid of icons. It only needs a UV coordinate to hit-test, so pointing and
 * poking work the same way.
 */
export class UIPanel extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: THREE.CanvasTexture;
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

  constructor(options: PanelOptions = {}) {
    const width = options.width ?? 0.3;
    const height = (width * CANVAS_H) / CANVAS_W;
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    super(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }),
    );

    this.texture = texture;
    this.ctx = canvas.getContext('2d')!;
    this.title = options.title ?? '';
    this.footer = options.footer ?? '';
    this.onSelect = options.onSelect;
    this.name = 'ui-panel';
    this.renderOrder = 10;
    this.geometry.computeBoundingBox();
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
    this.entries = entries;
    this.grid = options.grid ?? false;
    this.cols = Math.max(1, Math.floor(options.cols ?? GRID_COLS));
    this.pinned = Math.min(Math.max(0, Math.floor(options.pinned ?? 0)), entries.length);
    this.hint = options.hint ?? '';
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
   * Damit stellt `WristMenu` die kleinen Modelle vor die richtige Stelle, ohne
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
      return this.anchorOf(PAD + 58, HEADER_H + index * (ROW_H + ROW_GAP) + ROW_H / 2, ROW_H * 0.6);
    }
    const slot = index - this.pinned - this.scroll;
    if (slot < 0 || slot >= this.visibleCount) return null;
    if (!this.grid) {
      return this.anchorOf(
        PAD + 58,
        this.bodyTop + slot * (ROW_H + ROW_GAP) + ROW_H / 2,
        ROW_H * 0.6,
      );
    }
    const cellW = this.cellW;
    const column = slot % this.cols;
    const row = Math.floor(slot / this.cols);
    return this.anchorOf(
      PAD + column * (cellW + GRID_GAP) + cellW / 2,
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
      x: (x / CANVAS_W - 0.5) * width,
      y: (0.5 - y / CANVAS_H) * height,
      size: (size / CANVAS_H) * height,
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
    const next = THREE.MathUtils.clamp(Math.round(offset), 0, this.maxScroll);
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
    return this.scrollTo(this.scroll + rows * (this.grid ? this.cols : 1));
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
        this.setHover(hit.uv ? this.indexAt(hit.uv) : -1);
      },
      onBlur: () => {
        this.hovered.hand = null;
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
  }

  private handleSelect(hit: PointerHit): void {
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

  /** Die Breite einer Kachel auf dieser Seite. */
  private get cellW(): number {
    return cellWidth(this.cols);
  }

  /** Und ihre Höhe: quadratisch für das Bild, plus die Zeile mit dem Namen. */
  private get cellH(): number {
    return this.cellW + CELL_LABEL_H;
  }

  /** Wo der scrollende Teil anfängt: unter dem Titel und dem Kopfbalken. */
  private get bodyTop(): number {
    return HEADER_H + this.pinned * (ROW_H + ROW_GAP);
  }

  /** How many entries fit on one page — der Kopfbalken nimmt Platz weg. */
  private get pageSize(): number {
    const body = CANVAS_H - this.bodyTop - FOOTER_H;
    return this.grid
      ? Math.max(this.cols, Math.floor(body / (this.cellH + GRID_GAP)) * this.cols)
      : Math.max(1, Math.floor(body / (ROW_H + ROW_GAP)));
  }

  /** The furthest down this page can go without scrolling past its last row. */
  private get maxScroll(): number {
    return Math.max(0, this.entries.length - this.pinned - this.pageSize);
  }

  private get visibleCount(): number {
    return Math.min(this.entries.length - this.pinned - this.scroll, this.pageSize);
  }

  private indexAt(uv: THREE.Vector2): number {
    const x = uv.x * CANVAS_W;
    let y = (1 - uv.y) * CANVAS_H - HEADER_H;
    if (y < 0 || x < PAD || x > CANVAS_W - PAD) return -1;

    if (this.pinned > 0) {
      const row = Math.floor(y / (ROW_H + ROW_GAP));
      if (row < this.pinned) return y % (ROW_H + ROW_GAP) > ROW_H ? -1 : row;
      y -= this.pinned * (ROW_H + ROW_GAP);
    }

    if (this.grid) {
      const cellW = this.cellW;
      const cellH = this.cellH;
      const column = Math.floor((x - PAD) / (cellW + GRID_GAP));
      const row = Math.floor(y / (cellH + GRID_GAP));
      if (column < 0 || column >= this.cols || row < 0) return -1;
      if ((x - PAD) % (cellW + GRID_GAP) > cellW) return -1;
      if (y % (cellH + GRID_GAP) > cellH) return -1;
      const index = row * this.cols + column;
      return index < this.visibleCount ? this.pinned + this.scroll + index : -1;
    }

    const index = Math.floor(y / (ROW_H + ROW_GAP));
    if (index < 0 || index >= this.visibleCount) return -1;
    if (y % (ROW_H + ROW_GAP) > ROW_H) return -1;
    return this.pinned + this.scroll + index;
  }

  private cardHeight(): number {
    const count = this.visibleCount;
    const body = this.grid
      ? Math.ceil(count / this.cols) * (this.cellH + GRID_GAP)
      : count * (ROW_H + ROW_GAP);
    return Math.min(CANVAS_H, this.bodyTop + body + FOOTER_H);
  }

  private draw(): void {
    const ctx = this.ctx;
    const cardH = this.cardHeight();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.beginPath();
    ctx.roundRect(0, 0, CANVAS_W, cardH, 40);
    ctx.fillStyle = 'rgba(9, 14, 26, 0.93)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(140, 180, 255, 0.35)';
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#8ea0c4';
    ctx.font = '600 26px system-ui, sans-serif';
    ctx.fillText(
      fitText(ctx, this.crumb ? this.crumb.toUpperCase() : 'BAUMGARTNER VR', CANVAS_W - PAD * 2),
      PAD,
      62,
    );

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 46px system-ui, sans-serif';
    ctx.fillText(this.title, PAD, 118);

    // Der Kopfbalken zuerst: er steht, egal wie weit die Liste darunter
    // gescrollt ist — auf einer Rasterseite genauso, dort als Zeile über den
    // Kacheln.
    for (let i = 0; i < this.pinned; i++) {
      this.drawRow(this.entries[i]!, HEADER_H + i * (ROW_H + ROW_GAP), i === this.hover);
    }

    for (let i = 0; i < this.visibleCount; i++) {
      const index = this.pinned + this.scroll + i;
      const entry = this.entries[index]!;
      if (this.grid) {
        const column = i % this.cols;
        const row = Math.floor(i / this.cols);
        this.drawCell(
          entry,
          PAD + column * (this.cellW + GRID_GAP),
          this.bodyTop + row * (this.cellH + GRID_GAP),
          index === this.hover,
        );
      } else {
        this.drawRow(entry, this.bodyTop + i * (ROW_H + ROW_GAP), index === this.hover);
      }
    }
    this.drawScrollbar(cardH);

    const footer =
      this.status ||
      // Eine lange Seite unter einer anderen (angeheftetes _Zurück_): Blättern
      // und Zurück in einer Zeile — `B`/`Y` ist sonst nirgends zu lesen.
      (this.scrollable
        ? this.pinned > 0
          ? 'Stick oder wischen blättert · B/Y zurück'
          : 'Stick oder Trigger halten und wischen blättert'
        : '') ||
      this.hint ||
      this.footer;
    if (footer) {
      ctx.fillStyle = this.status ? '#9fd0ff' : '#71809e';
      ctx.font = '400 24px system-ui, sans-serif';
      ctx.fillText(clip(ctx, footer, CANVAS_W - PAD * 2), PAD, cardH - 34);
    }

    this.texture.needsUpdate = true;
  }

  /** Where in a long page we are, drawn along the right edge. */
  private drawScrollbar(cardH: number): void {
    if (!this.scrollable) return;
    const ctx = this.ctx;
    const top = this.bodyTop - 6;
    const height = cardH - FOOTER_H - top;
    const x = CANVAS_W - 24;
    const rows = this.entries.length - this.pinned;
    const portion = this.pageSize / rows;
    const thumb = Math.max(40, height * portion);
    const travel = (height - thumb) * (this.scroll / Math.max(1, rows - this.pageSize));

    ctx.beginPath();
    ctx.roundRect(x, top, 9, height, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x, top + travel, 9, thumb, 5);
    ctx.fillStyle = 'rgba(174, 208, 255, 0.9)';
    ctx.fill();
  }

  private drawRow(entry: MenuEntry, y: number, hovered: boolean): void {
    const ctx = this.ctx;
    const accent = toCss(entry.accent ?? 0x4aa8ff);
    const active = hovered && this.flash > 0;

    ctx.beginPath();
    ctx.roundRect(PAD, y, CANVAS_W - PAD * 2 - (this.scrollable ? 18 : 0), ROW_H, 24);
    ctx.fillStyle = active
      ? withAlpha(accent, 0.45)
      : hovered
        ? withAlpha(accent, 0.22)
        : 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.strokeStyle = hovered ? accent : 'rgba(255,255,255,0.12)';
    ctx.stroke();

    let textX = PAD + 30;
    if (entry.preview) {
      // Der Platz bleibt frei: davor steht ein kleines Modell im Raum
      // (`WristMenu.updatePreviews`), und eine Strichzeichnung darunter wäre
      // nur Unruhe.
      textX = PAD + 100;
    } else if (entry.icon) {
      drawMenuIcon(ctx, entry.icon, PAD + 58, y + ROW_H / 2, 52, accent);
      textX = PAD + 100;
    } else {
      ctx.beginPath();
      ctx.roundRect(PAD + 18, y + 22, 8, ROW_H - 44, 4);
      ctx.fillStyle = accent;
      ctx.fill();
      textX = PAD + 46;
    }

    const rightEdge =
      CANVAS_W - PAD - (entry.children ? 60 : entry.checked !== undefined ? 110 : 30);
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
      const left = CANVAS_W - PAD - 24 - width;
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
      ctx.moveTo(CANVAS_W - PAD - 46, y + ROW_H / 2 - 14);
      ctx.lineTo(CANVAS_W - PAD - 32, y + ROW_H / 2);
      ctx.lineTo(CANVAS_W - PAD - 46, y + ROW_H / 2 + 14);
      ctx.stroke();
    } else if (entry.selected) {
      ctx.beginPath();
      ctx.arc(CANVAS_W - PAD - 34, y + ROW_H / 2, 9, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    }

    if (entry.badge) {
      ctx.font = '600 20px system-ui, sans-serif';
      const width = ctx.measureText(entry.badge).width + 26;
      ctx.beginPath();
      ctx.roundRect(CANVAS_W - PAD - 70 - width, y + 18, width, 34, 17);
      ctx.fillStyle = withAlpha(accent, 0.25);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillText(entry.badge, CANVAS_W - PAD - 70 - width + 13, y + 42);
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
    // davorsteht (`WristMenu.updatePreviews`), bleibt es leer: Eine
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
