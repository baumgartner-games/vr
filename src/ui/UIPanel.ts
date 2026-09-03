import * as THREE from 'three';
import type { PointerHit, PointerTarget } from '../core/Pointer';

export interface PanelItem {
  id: string;
  label: string;
  sub?: string;
  badge?: string;
  accent?: number;
  disabled?: boolean;
  selected?: boolean;
}

export interface PanelOptions {
  width?: number;
  height?: number;
  title?: string;
  footer?: string;
  onSelect?(id: string): void;
}

const CANVAS_W = 768;
const CANVAS_H = 1024;
const PAD = 34;
const HEADER_H = 150;
const ROW_H = 122;
const ROW_GAP = 14;
const FOOTER_H = 76;
const MAX_ROWS = Math.floor((CANVAS_H - HEADER_H - FOOTER_H) / (ROW_H + ROW_GAP));

/**
 * A canvas-textured panel with a list of buttons. Works with laser pointing and
 * with direct poking, because it only needs a UV coordinate to hit-test.
 */
export class UIPanel extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: THREE.CanvasTexture;
  private items: PanelItem[] = [];
  private hover = -1;
  private title: string;
  private footer: string;
  private status = '';
  private flash = 0;
  private onSelect?: (id: string) => void;

  constructor(options: PanelOptions = {}) {
    const width = options.width ?? 0.3;
    const height = options.height ?? (width * CANVAS_H) / CANVAS_W;
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

  setItems(items: PanelItem[]): void {
    this.items = items;
    this.draw();
  }

  setTitle(title: string): void {
    this.title = title;
    this.draw();
  }

  setStatus(status: string): void {
    if (this.status === status) return;
    this.status = status;
    this.draw();
  }

  /** Registers this panel with the pointer system. */
  asPointerTarget(): PointerTarget {
    return {
      object: this,
      onHover: (hit) => this.handleHover(hit),
      onBlur: () => this.setHover(-1),
      onSelect: (hit) => this.handleSelect(hit),
    };
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

  private handleHover(hit: PointerHit): void {
    this.setHover(hit.uv ? this.indexAt(hit.uv) : -1);
  }

  private handleSelect(hit: PointerHit): void {
    const index = hit.uv ? this.indexAt(hit.uv) : -1;
    const item = this.items[index];
    if (!item || item.disabled) return;
    this.flash = 0.18;
    this.setHover(index);
    this.onSelect?.(item.id);
  }

  private setHover(index: number): void {
    if (this.hover === index) return;
    this.hover = index;
    this.draw();
  }

  private indexAt(uv: THREE.Vector2): number {
    const y = (1 - uv.y) * CANVAS_H;
    const x = uv.x * CANVAS_W;
    if (x < PAD || x > CANVAS_W - PAD) return -1;
    const local = y - HEADER_H;
    if (local < 0) return -1;
    const index = Math.floor(local / (ROW_H + ROW_GAP));
    if (index < 0 || index >= Math.min(this.items.length, MAX_ROWS)) return -1;
    if (local - index * (ROW_H + ROW_GAP) > ROW_H) return -1;
    return index;
  }

  /** Height of the drawn card — the panel only uses as much as it needs. */
  private cardHeight(): number {
    const rows = Math.min(this.items.length, MAX_ROWS);
    return Math.min(CANVAS_H, HEADER_H + rows * (ROW_H + ROW_GAP) + FOOTER_H);
  }

  private draw(): void {
    const ctx = this.ctx;
    const cardH = this.cardHeight();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    roundRect(ctx, 0, 0, CANVAS_W, cardH, 40);
    ctx.fillStyle = 'rgba(9, 14, 26, 0.93)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(140, 180, 255, 0.35)';
    ctx.stroke();

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#8ea0c4';
    ctx.font = '600 26px system-ui, sans-serif';
    ctx.fillText('BAUMGARTNER VR', PAD, 62);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 46px system-ui, sans-serif';
    ctx.fillText(this.title, PAD, 118);

    for (let i = 0; i < Math.min(this.items.length, MAX_ROWS); i++) {
      const item = this.items[i]!;
      this.drawRow(item, HEADER_H + i * (ROW_H + ROW_GAP), i === this.hover);
    }

    const footer = this.status || this.footer;
    if (footer) {
      ctx.fillStyle = this.status ? '#9fd0ff' : '#71809e';
      ctx.font = '400 24px system-ui, sans-serif';
      ctx.fillText(clip(ctx, footer, CANVAS_W - PAD * 2), PAD, cardH - 34);
    }

    this.texture.needsUpdate = true;
  }

  private drawRow(item: PanelItem, y: number, hovered: boolean): void {
    const ctx = this.ctx;
    const accent = `#${(item.accent ?? 0x4aa8ff).toString(16).padStart(6, '0')}`;
    const active = hovered && this.flash > 0;

    roundRect(ctx, PAD, y, CANVAS_W - PAD * 2, ROW_H, 24);
    ctx.fillStyle = item.disabled
      ? 'rgba(255, 255, 255, 0.03)'
      : active
        ? hexToRgba(accent, 0.45)
        : hovered
          ? hexToRgba(accent, 0.22)
          : 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.strokeStyle = item.disabled
      ? 'rgba(255,255,255,0.08)'
      : hovered
        ? accent
        : 'rgba(255,255,255,0.12)';
    ctx.stroke();

    // Accent bar
    if (!item.disabled) {
      roundRect(ctx, PAD + 18, y + 22, 8, ROW_H - 44, 4);
      ctx.fillStyle = accent;
      ctx.fill();
    }

    const textX = PAD + 46;
    ctx.fillStyle = item.disabled ? '#5a6480' : '#ffffff';
    ctx.font = '600 36px system-ui, sans-serif';
    ctx.fillText(clip(ctx, item.label, CANVAS_W - textX - PAD - 60), textX, y + 52);

    if (item.sub) {
      ctx.fillStyle = item.disabled ? '#4b546c' : '#93a3c4';
      ctx.font = '400 25px system-ui, sans-serif';
      ctx.fillText(clip(ctx, item.sub, CANVAS_W - textX - PAD - 20), textX, y + 90);
    }

    if (item.selected) {
      ctx.beginPath();
      ctx.arc(CANVAS_W - PAD - 34, y + ROW_H / 2, 9, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    }

    if (item.badge) {
      ctx.font = '600 20px system-ui, sans-serif';
      const w = ctx.measureText(item.badge).width + 26;
      roundRect(ctx, CANVAS_W - PAD - 22 - w, y + 18, w, 34, 17);
      ctx.fillStyle = hexToRgba(accent, 0.25);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillText(item.badge, CANVAS_W - PAD - 22 - w + 13, y + 42);
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function hexToRgba(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clip(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}
