import * as THREE from 'three';
import type { PointerHit, PointerTarget } from '../core/Pointer';
import type { Handedness } from '../core/XRInput';
import { drawMenuIcon, type MenuEntry } from './menu';

export interface PanelOptions {
  width?: number;
  title?: string;
  footer?: string;
  onSelect?(index: number, hand: Handedness | null): void;
}

const CANVAS_W = 768;
const CANVAS_H = 1280;
const PAD = 34;
const HEADER_H = 150;
const FOOTER_H = 76;

const ROW_H = 122;
const ROW_GAP = 14;
const MAX_ROWS = Math.floor((CANVAS_H - HEADER_H - FOOTER_H) / (ROW_H + ROW_GAP));

const GRID_COLS = 3;
const GRID_GAP = 16;
const CELL_W = Math.floor((CANVAS_W - PAD * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);
const CELL_H = CELL_W + 44;
const MAX_GRID_ROWS = Math.floor((CANVAS_H - HEADER_H - FOOTER_H) / (CELL_H + GRID_GAP));

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
  private hover = -1;
  private title: string;
  private footer: string;
  private hint = '';
  private status = '';
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

  /** @param hint replaces the standing footer while this page is shown. */
  setPage(title: string, entries: MenuEntry[], grid = false, hint?: string): void {
    this.title = title;
    this.entries = entries;
    this.grid = grid;
    this.hint = hint ?? '';
    this.hover = -1;
    this.draw();
  }

  setStatus(status: string): void {
    if (this.status === status) return;
    this.status = status;
    this.draw();
  }

  /** Entry the pointer currently rests on, with the hand that points at it. */
  hovered: { index: number; hand: Handedness | null } = { index: -1, hand: null };

  asPointerTarget(): PointerTarget {
    return {
      object: this,
      onHover: (hit) => {
        this.hovered.hand = hit.hand;
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

  private get visibleCount(): number {
    return Math.min(this.entries.length, this.grid ? MAX_GRID_ROWS * GRID_COLS : MAX_ROWS);
  }

  private indexAt(uv: THREE.Vector2): number {
    const x = uv.x * CANVAS_W;
    const y = (1 - uv.y) * CANVAS_H - HEADER_H;
    if (y < 0 || x < PAD || x > CANVAS_W - PAD) return -1;

    if (this.grid) {
      const column = Math.floor((x - PAD) / (CELL_W + GRID_GAP));
      const row = Math.floor(y / (CELL_H + GRID_GAP));
      if (column < 0 || column >= GRID_COLS || row < 0) return -1;
      if ((x - PAD) % (CELL_W + GRID_GAP) > CELL_W) return -1;
      if (y % (CELL_H + GRID_GAP) > CELL_H) return -1;
      const index = row * GRID_COLS + column;
      return index < this.visibleCount ? index : -1;
    }

    const index = Math.floor(y / (ROW_H + ROW_GAP));
    if (index < 0 || index >= this.visibleCount) return -1;
    if (y % (ROW_H + ROW_GAP) > ROW_H) return -1;
    return index;
  }

  private cardHeight(): number {
    const count = this.visibleCount;
    const body = this.grid
      ? Math.ceil(count / GRID_COLS) * (CELL_H + GRID_GAP)
      : count * (ROW_H + ROW_GAP);
    return Math.min(CANVAS_H, HEADER_H + body + FOOTER_H);
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
    ctx.fillText('BAUMGARTNER VR', PAD, 62);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 46px system-ui, sans-serif';
    ctx.fillText(this.title, PAD, 118);

    for (let i = 0; i < this.visibleCount; i++) {
      const entry = this.entries[i]!;
      if (this.grid) {
        const column = i % GRID_COLS;
        const row = Math.floor(i / GRID_COLS);
        this.drawCell(
          entry,
          PAD + column * (CELL_W + GRID_GAP),
          HEADER_H + row * (CELL_H + GRID_GAP),
          i === this.hover,
        );
      } else {
        this.drawRow(entry, HEADER_H + i * (ROW_H + ROW_GAP), i === this.hover);
      }
    }

    const footer = this.status || this.hint || this.footer;
    if (footer) {
      ctx.fillStyle = this.status ? '#9fd0ff' : '#71809e';
      ctx.font = '400 24px system-ui, sans-serif';
      ctx.fillText(clip(ctx, footer, CANVAS_W - PAD * 2), PAD, cardH - 34);
    }

    this.texture.needsUpdate = true;
  }

  private drawRow(entry: MenuEntry, y: number, hovered: boolean): void {
    const ctx = this.ctx;
    const accent = toCss(entry.accent ?? 0x4aa8ff);
    const active = hovered && this.flash > 0;

    ctx.beginPath();
    ctx.roundRect(PAD, y, CANVAS_W - PAD * 2, ROW_H, 24);
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
    if (entry.icon) {
      drawMenuIcon(ctx, entry.icon, PAD + 58, y + ROW_H / 2, 52, accent);
      textX = PAD + 100;
    } else {
      ctx.beginPath();
      ctx.roundRect(PAD + 18, y + 22, 8, ROW_H - 44, 4);
      ctx.fillStyle = accent;
      ctx.fill();
      textX = PAD + 46;
    }

    const rightEdge = CANVAS_W - PAD - (entry.children ? 60 : entry.checked !== undefined ? 110 : 30);
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
      ctx.arc(left + (entry.checked ? width - height / 2 : height / 2), top + height / 2, height / 2 - 5, 0, Math.PI * 2);
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
    const accent = toCss(entry.accent ?? 0x4aa8ff);
    const active = hovered && this.flash > 0;

    ctx.beginPath();
    ctx.roundRect(x, y, CELL_W, CELL_H, 22);
    ctx.fillStyle = active
      ? withAlpha(accent, 0.45)
      : hovered
        ? withAlpha(accent, 0.22)
        : 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.strokeStyle = hovered ? accent : 'rgba(255,255,255,0.12)';
    ctx.stroke();

    if (entry.icon) {
      drawMenuIcon(ctx, entry.icon, x + CELL_W / 2, y + CELL_W / 2, CELL_W * 0.52, accent);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 24px system-ui, sans-serif';
    ctx.fillText(clip(ctx, entry.label, CELL_W - 20), x + CELL_W / 2, y + CELL_H - 16);
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
