import { TILE } from '../nav/navTile';
import type {
  FlatBounds,
  FlatEntity,
  FlatLevel,
  FlatPoint,
  FlatSnapshot,
  FlatWall,
} from './flatSnapshot';

/**
 * **Die Ebenen-Karte** — ein Canvas, das eine Welt von oben zeichnet,
 * Etage für Etage.
 *
 * Der Wunsch dahinter: Wer im ersten Stock steht, soll das Erdgeschoss
 * darunter sehen, **leicht verschwommen** — so, wie man durch ein Modell
 * hindurchschaut. Also wird gezeichnet, was der Blick von oben erfasst:
 * erst die Etagen unter der des Betrachters, weich (`ctx.filter = blur`)
 * und blass, je tiefer desto mehr; dann die eigene Etage scharf; die Etagen
 * darüber gar nicht, denn deren Boden ist die Decke über dem Kopf.
 *
 * Alles andere ist die vertraute Karte (`haunting/map/mapView.ts`, deren
 * Gesten hier in kleiner Form wiederkehren): schieben, zoomen, tippen,
 * einer Figur folgen. Sie kennt nur das Bild (`FlatSnapshot`) und nichts
 * von der Welt dahinter.
 */
export interface LevelMapOptions {
  /** Wer die Karte anschaut — seine Etage ist die scharfe. */
  viewerId?: string;
  onTap?: (at: FlatPoint, level: number) => void;
  minScale?: number;
  maxScale?: number;
  gestures?: boolean;
}

const INK = {
  ground: '#0b0e14',
  tile: '#232a36',
  tileLine: '#1a2029',
  riseTint: '#3a4658',
  blocked: '#2b2530',
  wall: '#c9d3e6',
  wallCore: '#5c6a80',
  window: '#7fc9ff',
  door: '#ffd54a',
  doorClosed: '#e08f3a',
  barred: '#ff5c5c',
  box: '#3c4759',
  boxLid: '#56657c',
  boxLine: '#8fa0bb',
  stairs: '#9ad6a4',
  player: '#ffffff',
  playerFill: '#4aa8ff',
  peer: '#7fe39a',
  npc: '#ff8a5c',
  mark: '#ffd54a',
  label: '#e8ecf7',
} as const;

/** Wie stark die Etagen darunter verschwimmen, in Punkten je Etage Abstand. */
export const BLUR_PER_LEVEL = 2.2;
/** Wie blass sie werden — die erste darunter ist noch gut zu lesen. */
export const FADE_PER_LEVEL = 0.4;
/** Mehr als zwei Etagen tief sieht man nicht mehr. */
export const LEVELS_SEEN_BELOW = 2;
const TAP_SLOP = 8;
/** Größer wird kein Etagenbild — darüber wird jedes Bild direkt gemalt. */
const LAYER_LIMIT = 4096;

interface LevelLayer {
  canvas: HTMLCanvasElement;
  version: number;
  scale: number;
  blur: number;
  dpr: number;
  margin: number;
  originX: number;
  originZ: number;
}

/** Eine Bodenfarbe zwischen tief (dunkel) und hoch (hell), t in 0…1. */
function shade(t: number): string {
  const k = Math.max(0, Math.min(1, t));
  const r = Math.round(0x23 + (0x5a - 0x23) * k);
  const g = Math.round(0x2a + (0x66 - 0x2a) * k);
  const b = Math.round(0x36 + (0x7a - 0x36) * k);
  return `rgb(${r}, ${g}, ${b})`;
}
const WHEEL_RATE = 0.0016;

export class LevelMap {
  readonly element = document.createElement('div');
  readonly canvas = document.createElement('canvas');
  private snapshot: FlatSnapshot | null = null;
  private centre: FlatPoint = { x: 0, z: 0 };
  /** Punkte je Meter. */
  scale = 12;
  private readonly minScale: number;
  private readonly maxScale: number;
  private followId: string | null;
  private viewerLevel = 0;
  private width = 1;
  private height = 1;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pressed: { x: number; y: number; moved: boolean } | null = null;
  private pinch = 0;
  private readonly disposers: Array<() => void> = [];
  /**
   * **Jede Etage einmal gemalt, dann nur noch geschoben.** Ein Weichzeichner
   * über einem vollen Bildschirm kostet je Bild mehr als das ganze übrige
   * Zeichnen; mit tausend Kacheln darunter ebenso. Deshalb wird jede Etage
   * in ihr eigenes Bild gezeichnet — beim ersten Mal und wenn sich Maßstab,
   * Fassung oder Weichzeichner ändern — und danach nur noch an die Stelle
   * gesetzt, an die die Kamera gerade schaut.
   */
  private readonly layers = new Map<number, LevelLayer>();

  constructor(private readonly options: LevelMapOptions = {}) {
    this.element.className = 'levelmap';
    this.canvas.className = 'levelmap__canvas';
    this.element.append(this.canvas);
    this.minScale = options.minScale ?? 4;
    this.maxScale = options.maxScale ?? 48;
    this.followId = options.viewerId ?? null;
    if (options.gestures !== false) this.listen();
  }

  setSnapshot(snapshot: FlatSnapshot): void {
    const first = !this.snapshot;
    this.snapshot = snapshot;
    if (first) this.fit();
  }

  /** Die Etage, die scharf gezeichnet wird — von der verfolgten Figur, sonst gesetzt. */
  setViewerLevel(level: number): void {
    this.viewerLevel = level;
  }

  get level(): number {
    return this.viewerLevel;
  }

  follow(id: string | null): void {
    this.followId = id;
  }

  /** Die ganze Welt ins Bild. */
  fit(): void {
    const bounds = this.snapshot?.bounds;
    if (!bounds) return;
    this.measure();
    const w = Math.max(TILE, bounds.maxX - bounds.minX),
      d = Math.max(TILE, bounds.maxZ - bounds.minZ);
    this.centre = { x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2 };
    this.scale = this.clampScale(Math.min(this.width / w, this.height / d) * 0.92);
  }

  toScreen(x: number, z: number): { x: number; y: number } {
    return {
      x: this.width / 2 + (x - this.centre.x) * this.scale,
      y: this.height / 2 + (z - this.centre.z) * this.scale,
    };
  }

  toWorld(px: number, py: number): FlatPoint {
    return {
      x: this.centre.x + (px - this.width / 2) / this.scale,
      z: this.centre.z + (py - this.height / 2) / this.scale,
    };
  }

  /** Ein Bild zeichnen — je Bild einmal, die Figur der Welt folgt der Kamera. */
  draw(): void {
    const s = this.snapshot;
    const ctx = this.canvas.getContext('2d');
    if (!s || !ctx) return;
    this.measure();
    const followed = this.followId ? s.entities.find((one) => one.id === this.followId) : null;
    if (followed) {
      this.centre = { x: followed.x, z: followed.z };
      this.viewerLevel = followed.level;
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = INK.ground;
    ctx.fillRect(0, 0, this.width, this.height);

    const viewer = Math.max(0, Math.min(s.levels.length - 1, this.viewerLevel));
    for (let level = Math.max(0, viewer - LEVELS_SEEN_BELOW); level <= viewer; level++) {
      const one = s.levels[level];
      if (!one) continue;
      const depth = viewer - level;
      const blur = depth > 0 ? BLUR_PER_LEVEL * depth : 0;
      ctx.save();
      if (depth > 0) ctx.globalAlpha = Math.max(0.15, 1 - FADE_PER_LEVEL * depth);
      const layer = this.layerFor(s, one, blur, dpr);
      if (layer) {
        const at = this.toScreen(layer.originX, layer.originZ);
        ctx.drawImage(
          layer.canvas,
          at.x - layer.margin,
          at.y - layer.margin,
          layer.canvas.width / dpr,
          layer.canvas.height / dpr,
        );
      } else {
        // Ohne zweites Canvas (Tests, alte Browser) direkt — dann auch der
        // Weichzeichner direkt, wo es ihn gibt.
        if (blur > 0 && 'filter' in ctx) ctx.filter = `blur(${blur.toFixed(1)}px)`;
        this.drawLevel(ctx, one, depth === 0, (x, z) => this.toScreen(x, z));
      }
      ctx.restore();
    }
    for (const entity of s.entities) {
      const depth = viewer - entity.level;
      if (depth < 0 || depth > LEVELS_SEEN_BELOW) continue;
      ctx.save();
      if (depth > 0) ctx.globalAlpha = Math.max(0.2, 1 - FADE_PER_LEVEL * depth);
      this.drawEntity(ctx, entity);
      ctx.restore();
    }
  }

  /** Das Bild einer Etage aus dem Speicher — oder frisch gemalt, wenn es nicht mehr passt. */
  private layerFor(
    snapshot: FlatSnapshot,
    one: FlatLevel,
    blur: number,
    dpr: number,
  ): LevelLayer | null {
    const had = this.layers.get(one.level);
    if (
      had &&
      had.version === snapshot.version &&
      had.scale === this.scale &&
      had.blur === blur &&
      had.dpr === dpr
    )
      return had;
    const bounds = snapshot.bounds;
    const margin = Math.ceil(blur * 3) + 2;
    const width = Math.ceil((bounds.maxX - bounds.minX) * this.scale) + 2 * margin;
    const height = Math.ceil((bounds.maxZ - bounds.minZ) * this.scale) + 2 * margin;
    // Zu groß für ein Bild (ein Gelände nah heran): dann jedes Bild direkt.
    if (width * dpr > LAYER_LIMIT || height * dpr > LAYER_LIMIT) {
      this.layers.delete(one.level);
      return null;
    }
    const canvas = had?.canvas ?? document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (blur > 0 && 'filter' in ctx) ctx.filter = `blur(${blur.toFixed(1)}px)`;
    const scale = this.scale;
    this.drawLevel(ctx, one, blur === 0, (x, z) => ({
      x: (x - bounds.minX) * scale + margin,
      y: (z - bounds.minZ) * scale + margin,
    }));
    const layer: LevelLayer = {
      canvas,
      version: snapshot.version,
      scale: this.scale,
      blur,
      dpr,
      margin,
      originX: bounds.minX,
      originZ: bounds.minZ,
    };
    this.layers.set(one.level, layer);
    return layer;
  }

  private drawLevel(
    ctx: CanvasRenderingContext2D,
    one: FlatLevel,
    sharp: boolean,
    project: (x: number, z: number) => { x: number; y: number },
  ): void {
    const scale = this.scale;
    // Boden: jede Kachel ein Feld, angehobener Boden heller — im Gelände
    // (`terrainGraph.ts`) als Höhenschichten von der tiefsten bis zur höchsten.
    let low = Infinity,
      high = -Infinity;
    for (const tile of one.tiles) {
      if (tile.rise < low) low = tile.rise;
      if (tile.rise > high) high = tile.rise;
    }
    const span = high - low;
    for (const tile of one.tiles) {
      const p = project(tile.tx * TILE, tile.tz * TILE);
      const size = TILE * scale;
      ctx.fillStyle = tile.blocked
        ? INK.blocked
        : span > 0.2
          ? shade((tile.rise - low) / span)
          : INK.tile;
      ctx.fillRect(p.x, p.y, size + 0.5, size + 0.5);
      if (scale >= 7 && sharp) {
        ctx.strokeStyle = INK.tileLine;
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x + 0.5, p.y + 0.5, size, size);
      }
      if (tile.rise > 0.2 && scale >= 9 && one.tiles.length < 400) {
        ctx.fillStyle = INK.label;
        ctx.font = `${Math.max(9, scale * 0.6)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`+${tile.rise.toFixed(1)}`, p.x + size / 2, p.y + size / 2);
      }
    }
    // Kästen: Grundfläche und ein hellerer Deckel.
    for (const box of one.boxes) {
      const a = project(box.minX, box.minZ),
        b = project(box.maxX, box.maxZ);
      ctx.fillStyle = INK.box;
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      const inset = Math.min(4, (b.x - a.x) * 0.15);
      ctx.fillStyle = INK.boxLid;
      ctx.fillRect(a.x + inset, a.y + inset, b.x - a.x - 2 * inset, b.y - a.y - 2 * inset);
      ctx.strokeStyle = INK.boxLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(a.x + 0.5, a.y + 0.5, b.x - a.x - 1, b.y - a.y - 1);
      if (box.label && scale >= 9) {
        ctx.fillStyle = INK.label;
        ctx.font = `${Math.max(9, scale * 0.5)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(box.label, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
    }
    // Treppen und Rampen: ein Pfeil in Laufrichtung.
    for (const link of one.links) {
      if (link.kind !== 'stairs' && link.kind !== 'ladder') continue;
      const ramp = link.ramp;
      const from = project(link.from.x, link.from.z);
      const to = ramp
        ? project(
            link.from.x + (link.to.x - link.from.x) * 0.45,
            link.from.z + (link.to.z - link.from.z) * 0.45,
          )
        : project(link.to.x, link.to.z);
      ctx.strokeStyle = INK.stairs;
      ctx.lineWidth = Math.max(2, scale * 0.14);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const head = Math.max(5, scale * 0.35);
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - head * Math.cos(angle - 0.5), to.y - head * Math.sin(angle - 0.5));
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - head * Math.cos(angle + 0.5), to.y - head * Math.sin(angle + 0.5));
      ctx.stroke();
      if (scale >= 8) {
        ctx.fillStyle = INK.stairs;
        ctx.font = `${Math.max(9, scale * 0.5)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(
          link.to.level > link.from.level ? `↑ E${link.to.level}` : `↓ E${link.to.level}`,
          from.x,
          from.y - 4,
        );
      }
    }
    // Wände: ein dunkler Kern, eine helle Kante — Fenster dünn und hell,
    // Türen als Öffnung mit Blatt.
    ctx.lineCap = 'butt';
    for (const wall of one.walls) {
      if (wall.kind === 'door') continue;
      const a = project(wall.a.x, wall.a.z),
        b = project(wall.b.x, wall.b.z);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      if (wall.kind === 'window') {
        ctx.strokeStyle = INK.window;
        ctx.lineWidth = Math.max(1.5, scale * 0.12);
      } else {
        ctx.strokeStyle = INK.wallCore;
        ctx.lineWidth = Math.max(3, scale * 0.28);
        ctx.stroke();
        ctx.strokeStyle = INK.wall;
        ctx.lineWidth = Math.max(1, scale * 0.1);
      }
      ctx.stroke();
    }
    for (const wall of one.walls) if (wall.kind === 'door') this.drawDoor(ctx, wall, project);
  }

  private drawDoor(
    ctx: CanvasRenderingContext2D,
    door: FlatWall,
    project: (x: number, z: number) => { x: number; y: number },
  ): void {
    const a = project(door.a.x, door.a.z),
      b = project(door.b.x, door.b.z);
    const width = (door.width ?? 1.2) * this.scale;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const stub = Math.max(0, (length - width) / 2) / length;
    const ux = (b.x - a.x) / length,
      uy = (b.y - a.y) / length;
    ctx.strokeStyle = INK.wallCore;
    ctx.lineWidth = Math.max(3, this.scale * 0.28);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x + (b.x - a.x) * stub, a.y + (b.y - a.y) * stub);
    ctx.moveTo(b.x - (b.x - a.x) * stub, b.y - (b.y - a.y) * stub);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    // Das Blatt: zu quer in der Öffnung, offen als zwei Stummel neben ihr.
    const mx = (a.x + b.x) / 2,
      my = (a.y + b.y) / 2;
    ctx.strokeStyle = door.barred ? INK.barred : door.open ? INK.door : INK.doorClosed;
    ctx.lineWidth = Math.max(2, this.scale * 0.16);
    ctx.beginPath();
    if (door.open) {
      const leaf = width * 0.22;
      ctx.moveTo(mx - ux * (width / 2), my - uy * (width / 2));
      ctx.lineTo(mx - ux * (width / 2 - leaf), my - uy * (width / 2 - leaf));
      ctx.moveTo(mx + ux * (width / 2), my + uy * (width / 2));
      ctx.lineTo(mx + ux * (width / 2 - leaf), my + uy * (width / 2 - leaf));
    } else {
      ctx.moveTo(mx - ux * (width / 2), my - uy * (width / 2));
      ctx.lineTo(mx + ux * (width / 2), my + uy * (width / 2));
    }
    ctx.stroke();
  }

  private drawEntity(ctx: CanvasRenderingContext2D, entity: FlatEntity): void {
    const p = this.toScreen(entity.x, entity.z);
    const r = Math.max(4, this.scale * 0.3);
    const colour =
      entity.colour ??
      (entity.kind === 'player'
        ? INK.playerFill
        : entity.kind === 'peer'
          ? INK.peer
          : entity.kind === 'npc'
            ? INK.npc
            : INK.mark);
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    if (entity.kind !== 'mark') {
      // Der Blick: vorn ist -z gedreht um yaw (wie in three.js).
      const fx = -Math.sin(entity.yaw),
        fz = -Math.cos(entity.yaw);
      ctx.strokeStyle = entity.kind === 'player' ? INK.player : colour;
      ctx.lineWidth = Math.max(2, r * 0.35);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + fx * r * 1.9, p.y + fz * r * 1.9);
      ctx.stroke();
    }
    if (entity.kind === 'player') {
      ctx.strokeStyle = INK.player;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (entity.label && this.scale >= 6) {
      ctx.fillStyle = INK.label;
      ctx.font = `${Math.max(10, this.scale * 0.55)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(entity.label, p.x, p.y + r + 3);
    }
  }

  private measure(): void {
    const rect = this.element.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || this.element.clientWidth || 1));
    const height = Math.max(1, Math.round(rect.height || this.element.clientHeight || 1));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (width !== this.width || height !== this.height || this.canvas.width !== width * dpr) {
      this.width = width;
      this.height = height;
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
    }
  }

  private clampScale(scale: number): number {
    return Math.max(this.minScale, Math.min(this.maxScale, scale));
  }

  panBy(dx: number, dy: number): void {
    this.followId = null;
    this.centre = { x: this.centre.x - dx / this.scale, z: this.centre.z - dy / this.scale };
  }

  zoomAt(px: number, py: number, factor: number): void {
    const before = this.toWorld(px, py);
    this.scale = this.clampScale(this.scale * factor);
    const after = this.toWorld(px, py);
    this.centre = {
      x: this.centre.x + (before.x - after.x),
      z: this.centre.z + (before.z - after.z),
    };
  }

  /** Ein Tipp auf die Karte — an die Welt, in Metern und mit der scharfen Etage. */
  tap(px: number, py: number): void {
    this.options.onTap?.(this.toWorld(px, py), this.viewerLevel);
  }

  private listen(): void {
    const el = this.element;
    el.style.touchAction = 'none';
    const local = (event: PointerEvent): { x: number; y: number } => {
      const rect = el.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const down = (event: PointerEvent): void => {
      const p = local(event);
      this.pointers.set(event.pointerId, p);
      if (this.pointers.size === 1) this.pressed = { ...p, moved: false };
      else this.pinch = this.span();
      try {
        el.setPointerCapture?.(event.pointerId);
      } catch {
        // synthetische Zeiger in Tests
      }
    };
    const move = (event: PointerEvent): void => {
      const was = this.pointers.get(event.pointerId);
      if (!was) return;
      const p = local(event);
      this.pointers.set(event.pointerId, p);
      if (this.pointers.size === 1) {
        const dx = p.x - was.x,
          dy = p.y - was.y;
        if (this.pressed && Math.hypot(p.x - this.pressed.x, p.y - this.pressed.y) > TAP_SLOP)
          this.pressed.moved = true;
        if (this.pressed?.moved) this.panBy(dx, dy);
      } else if (this.pointers.size === 2) {
        const span = this.span();
        if (this.pinch > 0 && span > 0) {
          const mid = this.middle();
          this.zoomAt(mid.x, mid.y, span / this.pinch);
        }
        this.pinch = span;
        if (this.pressed) this.pressed.moved = true;
      }
    };
    const up = (event: PointerEvent): void => {
      if (!this.pointers.has(event.pointerId)) return;
      const p = this.pointers.get(event.pointerId)!;
      this.pointers.delete(event.pointerId);
      if (this.pointers.size === 0) {
        if (this.pressed && !this.pressed.moved) this.tap(p.x, p.y);
        this.pressed = null;
      }
      this.pinch = 0;
    };
    const wheel = (event: WheelEvent): void => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      this.zoomAt(
        event.clientX - rect.left,
        event.clientY - rect.top,
        Math.exp(-event.deltaY * WHEEL_RATE),
      );
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    this.disposers.push(() => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    });
  }

  private span(): number {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private middle(): { x: number; y: number } {
    const [a, b] = [...this.pointers.values()];
    return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : { x: 0, y: 0 };
  }

  boundsOf(): FlatBounds | null {
    return this.snapshot?.bounds ?? null;
  }

  dispose(): void {
    for (const off of this.disposers) off();
    this.disposers.length = 0;
    this.layers.clear();
    this.element.remove();
  }
}
