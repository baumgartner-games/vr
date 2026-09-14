import { TILE_PX } from './level';

/**
 * **Der Held von oben** — ein kleiner Kerl in grüner Tunika, mit Mütze,
 * gezeichnet wie auf dem SNES: sechzehn mal sechzehn Bildpunkte, vier
 * Blickrichtungen, zwei Schritte je Richtung.
 *
 * Kein Bild aus einer Datei, sondern gemalt beim Start — aus demselben Grund
 * wie die Kacheln (`tiles.ts`): Wer später echte Grafik will, tauscht die
 * Leinwand gegen ein Bild und lässt alles andere stehen.
 *
 * Die Bilder liegen in einer Reihe: Richtung × 2 + Schritt. Die Reihenfolge
 * der Richtungen ist `HERO_DIRS`, und `heroFrame` rechnet sie aus.
 */

export const HERO_DIRS = ['down', 'left', 'right', 'up'] as const;
export type HeroDir = (typeof HERO_DIRS)[number];

/** Welches Bild der Reihe: Richtung und Schritt (0 oder 1). */
export function heroFrame(dir: HeroDir, step: 0 | 1): number {
  return HERO_DIRS.indexOf(dir) * 2 + step;
}

/** Aus einer Bewegungsrichtung (Bild-x rechts, Bild-y unten) die Blickrichtung. */
export function heroDir(dx: number, dy: number, previous: HeroDir): HeroDir {
  if (dx === 0 && dy === 0) return previous;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

const INK = {
  skin: '#f2c6a0',
  hair: '#c98a3c',
  cap: '#2e8b3a',
  capDark: '#1f6a2c',
  tunic: '#3fa64a',
  tunicDark: '#2e8b3a',
  belt: '#6b4423',
  boots: '#5a3a1e',
  eye: '#1b1b1b',
  outline: '#1b2a1e',
} as const;

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

/** Ein Held, in eine Richtung schauend, ein Bein vorn oder das andere. */
function drawOne(ctx: CanvasRenderingContext2D, ox: number, dir: HeroDir, step: 0 | 1): void {
  const s = step === 0 ? -1 : 1;
  // Umriss als Grund, damit die Figur sich vom Gras abhebt.
  px(ctx, ox + 4, 1, INK.outline, 8, 14);
  px(ctx, ox + 3, 3, INK.outline, 10, 9);
  // Mütze und Kopf.
  px(ctx, ox + 5, 2, INK.cap, 6, 3);
  px(ctx, ox + 4, 4, INK.capDark, 8, 1);
  px(ctx, ox + 5, 5, INK.skin, 6, 4);
  px(ctx, ox + 5, 5, INK.hair, 6, 1);
  // Gesicht je nach Richtung.
  if (dir === 'down') {
    px(ctx, ox + 6, 7, INK.eye);
    px(ctx, ox + 9, 7, INK.eye);
  } else if (dir === 'left') {
    px(ctx, ox + 6, 7, INK.eye);
  } else if (dir === 'right') {
    px(ctx, ox + 9, 7, INK.eye);
  } else {
    px(ctx, ox + 5, 5, INK.hair, 6, 3);
  }
  // Tunika mit Gürtel.
  px(ctx, ox + 4, 9, INK.tunic, 8, 4);
  px(ctx, ox + 4, 11, INK.belt, 8, 1);
  px(ctx, ox + (dir === 'left' ? 4 : 10), 9, INK.tunicDark, 2, 2);
  // Beine: eins vor, eins zurück — der Schritt.
  px(ctx, ox + 5, 13, INK.boots, 2, 2 + (s > 0 ? 1 : 0));
  px(ctx, ox + 9, 13, INK.boots, 2, 2 + (s < 0 ? 1 : 0));
}

/** Die ganze Reihe — vier Richtungen, zwei Schritte — als eine Leinwand. */
export function drawHeroSheet(size = TILE_PX): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size * HERO_DIRS.length * 2;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    for (const dir of HERO_DIRS) {
      for (const step of [0, 1] as const) drawOne(ctx, heroFrame(dir, step) * size, dir, step);
    }
  }
  return canvas;
}
