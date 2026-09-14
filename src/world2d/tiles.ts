import type { MeshStandardMaterial } from 'three';
import { TILE_PX, type TileId } from './level';
import { renderModelSprite } from './modelSprite';
import { createCompanionCube } from '../worlds/portal/props';

/**
 * **Der Kachelkatalog** — was es in der 2D-Welt zu bauen gibt, und wie es
 * aussieht.
 *
 * Es gibt keine Bilddateien. Jede Kachel wird beim Start **gezeichnet**, in
 * Canvas 2D, sechzehn mal sechzehn Bildpunkte, in der Farbwelt der Vorlage:
 * sattes Gras, dunkles Wasser mit hellen Kämmen, sandige Wege, graue Mauern
 * mit heller Oberkante. Das ist absichtlich einfach — Kacheln, die man in
 * einer Stunde nachmalen kann, sind Kacheln, die jemand später gegen echte
 * tauscht, ohne dass sich sonst etwas ändert: Der Katalog bleibt derselbe,
 * nur `draw` wird zum Bild.
 *
 * **Eine Kachel wird nicht gemalt, sondern abgelichtet**: der Companion Cube.
 * Er steht als 3D-Modell im Code (`worlds/portal/props.createCompanionCube`),
 * und `modelSprite.ts` macht daraus beim ersten Zeichnen ein Bildchen — ein
 * Modell, zwei Welten, keine Bilddatei im Repository. Ohne WebGL bleibt eine
 * flach gemalte Ersatzkachel, damit der Katalog auch in jsdom vollständig ist.
 *
 * **Fest oder nicht** steht hier, bei der Kachel, und nirgends sonst: Eine
 * Mauer hält auf, Gras nicht, Wasser hält auf (bis es eine Brücke gibt).
 * Phaser liest das für die Kollision, der Editor zeigt es, und die 3D-Welt
 * wird daraus eines Tages eine Wand bauen.
 */

export interface TileDef {
  id: TileId;
  name: string;
  /** Die Farbe, die für die Kachel steht — Palette und Miniatur. */
  color: string;
  /** Ob man hindurchkann. */
  solid: boolean;
  /** Auf welche Ebene sie gehört, als Vorschlag für den Editor. */
  layer: 'ground' | 'objects' | 'overlay';
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void;
}

/** Ein gestreutes, aber wiederholbares Muster — für Gras, Sand, Steinplatten. */
function hash(x: number, y: number, salt: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  w = 1,
  h = 1,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

const grass =
  (dark: boolean) => (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => {
    px(ctx, x, y, dark ? '#3f8f3c' : '#4fa64a', s, s);
    for (let i = 0; i < 6; i++) {
      const gx = x + Math.floor(hash(x, y, i) * s);
      const gy = y + Math.floor(hash(y, x, i + 9) * s);
      px(ctx, gx, gy, dark ? '#357a33' : '#3f8f3c');
      px(ctx, gx, gy - 1, dark ? '#5fb85a' : '#6cc865');
    }
  };

export const TILES: readonly TileDef[] = [
  { id: 1, name: 'Gras', color: '#4fa64a', solid: false, layer: 'ground', draw: grass(false) },
  {
    id: 2,
    name: 'Gras, dunkel',
    color: '#3f8f3c',
    solid: false,
    layer: 'ground',
    draw: grass(true),
  },
  {
    id: 3,
    name: 'Blumenwiese',
    color: '#5cb857',
    solid: false,
    layer: 'ground',
    draw(ctx, x, y, s) {
      grass(false)(ctx, x, y, s);
      for (let i = 0; i < 3; i++) {
        const fx = x + 2 + Math.floor(hash(x, y, 30 + i) * (s - 4));
        const fy = y + 2 + Math.floor(hash(y, x, 40 + i) * (s - 4));
        px(ctx, fx, fy, i % 2 ? '#ffd23f' : '#ff5c8a');
        px(ctx, fx - 1, fy, '#ffffff');
        px(ctx, fx + 1, fy, '#ffffff');
      }
    },
  },
  {
    id: 4,
    name: 'Weg',
    color: '#d9b877',
    solid: false,
    layer: 'ground',
    draw(ctx, x, y, s) {
      px(ctx, x, y, '#d9b877', s, s);
      for (let i = 0; i < 5; i++) {
        const gx = x + Math.floor(hash(x, y, 50 + i) * s);
        const gy = y + Math.floor(hash(y, x, 60 + i) * s);
        px(ctx, gx, gy, '#c4a462', 2, 1);
      }
    },
  },
  {
    id: 5,
    name: 'Sand',
    color: '#ecd98e',
    solid: false,
    layer: 'ground',
    draw(ctx, x, y, s) {
      px(ctx, x, y, '#ecd98e', s, s);
      for (let i = 0; i < 4; i++) {
        const gx = x + Math.floor(hash(x, y, 70 + i) * s);
        const gy = y + Math.floor(hash(y, x, 80 + i) * s);
        px(ctx, gx, gy, '#dcc77a');
      }
    },
  },
  {
    id: 6,
    name: 'Wasser',
    color: '#2f6fd1',
    solid: true,
    layer: 'ground',
    draw(ctx, x, y, s) {
      px(ctx, x, y, '#2f6fd1', s, s);
      px(ctx, x + 2, y + 4, '#5d95ea', 5, 1);
      px(ctx, x + 9, y + 9, '#5d95ea', 5, 1);
      px(ctx, x + 4, y + 13, '#255cb0', 4, 1);
    },
  },
  {
    id: 7,
    name: 'Steinboden',
    color: '#9da3a8',
    solid: false,
    layer: 'ground',
    draw(ctx, x, y, s) {
      px(ctx, x, y, '#9da3a8', s, s);
      px(ctx, x, y + s / 2 - 1, '#858b91', s, 1);
      px(ctx, x + s / 2 - 1, y, '#858b91', 1, s / 2);
      px(ctx, x + 3, y + s / 2, '#858b91', 1, s / 2);
      px(ctx, x + 1, y + 1, '#b3b8bd', 3, 1);
    },
  },
  {
    id: 8,
    name: 'Holzboden',
    color: '#b3813f',
    solid: false,
    layer: 'ground',
    draw(ctx, x, y, s) {
      px(ctx, x, y, '#b3813f', s, s);
      for (let row = 0; row < s; row += 4) px(ctx, x, y + row, '#8f6430', s, 1);
      px(ctx, x + 6, y + 1, '#8f6430', 1, 3);
      px(ctx, x + 12, y + 9, '#8f6430', 1, 3);
    },
  },
  {
    id: 9,
    name: 'Mauer',
    color: '#7b7f86',
    solid: true,
    layer: 'objects',
    draw(ctx, x, y, s) {
      px(ctx, x, y, '#6b6f76', s, s);
      px(ctx, x, y, '#a2a7ad', s, 3);
      for (let row = 3; row < s; row += 4) {
        px(ctx, x, y + row, '#4d5157', s, 1);
        const shift = ((row / 4) % 2) * 4;
        for (let col = shift; col < s; col += 8) px(ctx, x + col, y + row + 1, '#4d5157', 1, 3);
      }
    },
  },
  {
    id: 10,
    name: 'Baum',
    color: '#2e7d3a',
    solid: true,
    layer: 'objects',
    draw(ctx, x, y, _s) {
      px(ctx, x + 6, y + 10, '#6b4423', 4, 6);
      px(ctx, x + 2, y + 2, '#2e7d3a', 12, 10);
      px(ctx, x + 4, y, '#2e7d3a', 8, 2);
      px(ctx, x + 1, y + 4, '#2e7d3a', 1, 6);
      px(ctx, x + 14, y + 4, '#2e7d3a', 1, 6);
      px(ctx, x + 4, y + 3, '#4caf50', 4, 2);
      px(ctx, x + 3, y + 6, '#4caf50', 2, 3);
      px(ctx, x + 9, y + 8, '#1f5a2a', 4, 3);
    },
  },
  {
    id: 11,
    name: 'Busch',
    color: '#3c9a48',
    solid: true,
    layer: 'objects',
    draw(ctx, x, y, _s) {
      px(ctx, x + 3, y + 5, '#2e7d3a', 10, 9);
      px(ctx, x + 5, y + 3, '#2e7d3a', 6, 2);
      px(ctx, x + 5, y + 6, '#4caf50', 3, 2);
      px(ctx, x + 9, y + 9, '#1f5a2a', 3, 3);
    },
  },
  {
    id: 12,
    name: 'Fels',
    color: '#8f8a80',
    solid: true,
    layer: 'objects',
    draw(ctx, x, y, _s) {
      px(ctx, x + 3, y + 6, '#6f6a62', 10, 8);
      px(ctx, x + 5, y + 3, '#8f8a80', 7, 4);
      px(ctx, x + 4, y + 5, '#8f8a80', 9, 6);
      px(ctx, x + 6, y + 4, '#b5b0a6', 3, 2);
      px(ctx, x + 3, y + 13, '#524e47', 10, 1);
    },
  },
  {
    id: 13,
    name: 'Zaun',
    color: '#a0703a',
    solid: true,
    layer: 'objects',
    draw(ctx, x, y, s) {
      px(ctx, x, y + 5, '#a0703a', s, 2);
      px(ctx, x, y + 10, '#a0703a', s, 2);
      px(ctx, x + 2, y + 2, '#7a5328', 3, 12);
      px(ctx, x + 11, y + 2, '#7a5328', 3, 12);
    },
  },
  {
    id: 14,
    name: 'Kiste',
    color: '#b8863b',
    solid: true,
    layer: 'objects',
    draw(ctx, x, y, _s) {
      px(ctx, x + 2, y + 3, '#b8863b', 12, 11);
      px(ctx, x + 2, y + 3, '#d9a65a', 12, 1);
      px(ctx, x + 2, y + 3, '#7a5328', 1, 11);
      px(ctx, x + 13, y + 3, '#7a5328', 1, 11);
      px(ctx, x + 2, y + 13, '#7a5328', 12, 1);
      px(ctx, x + 4, y + 5, '#7a5328', 8, 1);
      px(ctx, x + 4, y + 11, '#7a5328', 8, 1);
    },
  },
  {
    id: 15,
    name: 'Tür',
    color: '#5a3a1e',
    solid: false,
    layer: 'objects',
    draw(ctx, x, y, _s) {
      px(ctx, x + 3, y + 1, '#5a3a1e', 10, 15);
      px(ctx, x + 4, y + 2, '#7a5328', 8, 13);
      px(ctx, x + 10, y + 8, '#ffd23f', 1, 1);
    },
  },
  {
    id: 16,
    name: 'Dach',
    color: '#b23a3a',
    solid: false,
    layer: 'overlay',
    draw(ctx, x, y, s) {
      px(ctx, x, y, '#b23a3a', s, s);
      for (let row = 0; row < s; row += 4) {
        px(ctx, x, y + row, '#8a2a2a', s, 1);
        const shift = ((row / 4) % 2) * 4;
        for (let col = shift; col < s; col += 8) px(ctx, x + col, y + row + 1, '#8a2a2a', 1, 3);
      }
    },
  },
  {
    id: 17,
    name: 'Baumkrone',
    color: '#3a9a46',
    solid: false,
    layer: 'overlay',
    draw(ctx, x, y, _s) {
      px(ctx, x + 1, y + 1, '#2e7d3a', 14, 14);
      px(ctx, x + 3, y, '#2e7d3a', 10, 1);
      px(ctx, x + 3, y + 3, '#4caf50', 4, 3);
      px(ctx, x + 10, y + 9, '#1f5a2a', 4, 4);
    },
  },
  {
    id: 18,
    name: 'Brücke',
    color: '#c69455',
    solid: false,
    layer: 'objects',
    draw(ctx, x, y, s) {
      px(ctx, x, y, '#c69455', s, s);
      for (let row = 0; row < s; row += 3) px(ctx, x, y + row, '#9a6f36', s, 1);
      px(ctx, x, y, '#6b4423', 2, s);
      px(ctx, x + s - 2, y, '#6b4423', 2, s);
    },
  },
  {
    id: 19,
    name: 'Companion Cube',
    color: '#c9d2e0',
    solid: true,
    layer: 'objects',
    draw(ctx, x, y, s) {
      const sprite = companionCubeSprite(s);
      if (!sprite) {
        drawFlatCube(ctx, x, y, s);
        return;
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, x, y, s, s);
    },
  },
];

// --- Der eine Würfel, der aus 3D kommt --------------------------------------

/**
 * Das abgelichtete Modell, je Kantenlänge einmal. `null` heißt: Dieser Browser
 * kann kein WebGL — dann bleibt es bei der flachen Ersatzkachel, und zwar
 * dauerhaft, statt es bei jeder Kachel neu zu versuchen.
 */
const cubeSprites = new Map<number, HTMLCanvasElement | null>();

function companionCubeSprite(size: number): HTMLCanvasElement | null {
  const known = cubeSprites.get(size);
  if (known !== undefined) return known;
  // Kantenlänge 1: Der Ausschnitt wird aus der Hülle des Modells gerechnet,
  // die Zahl selbst ist dem Bildchen also egal.
  const cube = createCompanionCube(1);
  const sprite = renderModelSprite(cube, { size, margin: 0.02 });
  // Das Modell hat seinen Zweck erfüllt: Geometrie, Material und die Leinwand
  // seiner Textur wieder hergeben, sonst bleibt für ein Bildchen von sechzehn
  // Punkten ein ganzes Netz im Speicher liegen.
  cube.geometry.dispose();
  const material = cube.material as MeshStandardMaterial;
  material.map?.dispose();
  material.dispose();
  cubeSprites.set(size, sprite);
  return sprite;
}

/** Der Würfel flach gemalt — für jeden Browser ohne WebGL. */
function drawFlatCube(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const inset = Math.max(1, Math.round(s / 8));
  const side = s - inset * 2;
  px(ctx, x + inset, y + inset, '#c9d2e0', side, side);
  px(ctx, x + inset, y + inset, '#eef2f8', side, 1);
  px(ctx, x + inset, y + s - inset - 1, '#7f8ea6', side, 1);
  const plate = Math.max(1, Math.round(s / 6));
  for (const [cx, cy] of [
    [x + inset, y + inset],
    [x + s - inset - plate, y + inset],
    [x + inset, y + s - inset - plate],
    [x + s - inset - plate, y + s - inset - plate],
  ] as const) {
    px(ctx, cx, cy, '#7f8ea6', plate, plate);
  }
  const heart = Math.max(2, Math.round(s / 4));
  const at = Math.round((s - heart) / 2);
  px(ctx, x + at, y + at, '#ff6ea3', heart, heart);
}

/** Die Kennungen, durch die man nicht hindurchkommt. */
export const SOLID_TILES: ReadonlySet<TileId> = new Set(
  TILES.filter((t) => t.solid).map((t) => t.id),
);

export function tileDef(id: TileId): TileDef | undefined {
  return TILES.find((tile) => tile.id === id);
}

/**
 * **Alle Kacheln in einer Reihe** — die Leinwand, die Phaser als Kachelsatz
 * bekommt. Spalte `id` ist die Kachel `id`; Spalte 0 bleibt leer und steht
 * für die leere Zelle, damit Kennung und Spalte dieselbe Zahl sind.
 */
export function drawTileset(size = TILE_PX): HTMLCanvasElement {
  const last = Math.max(...TILES.map((t) => t.id));
  const canvas = document.createElement('canvas');
  canvas.width = (last + 1) * size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    for (const tile of TILES) tile.draw(ctx, tile.id * size, 0, size);
  }
  return canvas;
}

/** Eine einzelne Kachel als kleines Bild — für die Palette des Editors. */
export function drawTileThumb(tile: TileDef, size = TILE_PX * 2): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.scale(size / TILE_PX, size / TILE_PX);
    tile.draw(ctx, 0, 0, TILE_PX);
  }
  return canvas;
}
