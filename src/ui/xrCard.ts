import type { HintItem } from '../core/controlHints';

/**
 * **Wie eine Tafel in der Brille aussieht** — dieselbe Sprache wie die Leisten
 * am Schirm (`--hud-*` in `style.css`): dunkles Blau, fast deckend, runde
 * Ecken, weiße Schrift, graue Nebenzeilen, die Akzentfarbe der Welt als
 * Streifen, und die Knöpfe als Chips mit hellem Rand.
 *
 * Nur Malen auf eine Leinwand; wer sie ins Bild stellt, ist `ui/XRGuide.ts`.
 */

export const CARD_BG = 'rgba(10, 16, 30, 0.94)';
export const CARD_LINE = 'rgba(255, 255, 255, 0.14)';
export const CARD_INK = '#f4f7ff';
export const CARD_DIM = '#a9b6d3';
export const CARD_FONT = 'system-ui, "Segoe UI", Roboto, sans-serif';

export function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * Grund, Rand und Akzentstreifen (`stripe`: oben oder links).
 *
 * `behind`: Der Inhalt steht schon auf der Leinwand, und der Grund kommt
 * **darunter** (`destination-over`) — so kann eine Tafel erst ihren Inhalt
 * setzen und dann so hoch werden, wie er es braucht.
 */
export function paintFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  accent: number,
  stripe: 'top' | 'left',
  radius = 36,
  behind = false,
): void {
  if (!behind) ctx.clearRect(0, 0, w, h);
  ctx.save();
  if (behind) {
    // Unter dem Inhalt ist die Reihenfolge umgekehrt: erst der Streifen,
    // dann der Grund darunter.
    ctx.clearRect(0, h, w, ctx.canvas.height - h);
    ctx.globalCompositeOperation = 'destination-over';
  }
  ctx.beginPath();
  ctx.roundRect(3, 3, w - 6, h - 6, radius);
  ctx.clip();
  const paintStripe = (): void => {
    ctx.fillStyle = css(accent);
    if (stripe === 'top') ctx.fillRect(0, 0, w, 10);
    else ctx.fillRect(0, 0, 12, h);
  };
  const paintGround = (): void => {
    ctx.fillStyle = CARD_BG;
    ctx.fillRect(0, 0, w, h);
  };
  if (behind) {
    paintStripe();
    paintGround();
  } else {
    paintGround();
    paintStripe();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(3, 3, w - 6, h - 6, radius);
  ctx.lineWidth = 3;
  ctx.strokeStyle = CARD_LINE;
  ctx.stroke();
}

/** Umbruch auf eine Breite — höchstens `max` Zeilen, die letzte mit „…". */
export function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  max: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  kept[max - 1] = `${kept[max - 1]!} …`;
  return kept;
}

/**
 * **Das ✕ zum Schließen** — eine runde Scheibe im Ton der Knöpfe, ein Ring in
 * der Akzentfarbe und darin ein kräftiges Kreuz. Gemalt als zwei Striche und
 * nicht als Schriftzeichen: Ob eine Schrift das „✕" überhaupt kennt, weiß man
 * in der Brille erst, wenn dort ein leeres Kästchen steht.
 *
 * `x`/`y` ist die Mitte, `r` der Halbmesser, alles in Leinwandpixeln.
 */
export function paintClose(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  accent: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r - 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(40, 52, 78, 0.96)';
  ctx.fill();
  ctx.lineWidth = Math.max(3, r * 0.1);
  ctx.strokeStyle = css(accent);
  ctx.stroke();
  const arm = r * 0.4;
  ctx.beginPath();
  ctx.moveTo(x - arm, y - arm);
  ctx.lineTo(x + arm, y + arm);
  ctx.moveTo(x + arm, y - arm);
  ctx.lineTo(x - arm, y + arm);
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(4, r * 0.18);
  ctx.strokeStyle = CARD_INK;
  ctx.stroke();
  ctx.restore();
}

/**
 * **Ein Chip: der Knopf im Kästchen, daneben was er tut** — wie
 * `.hints__item` am Schirm. Gibt die Breite zurück, die er braucht.
 */
export function chipWidth(ctx: CanvasRenderingContext2D, item: HintItem, size: number): number {
  ctx.font = `700 ${size}px ${CARD_FONT}`;
  const key = ctx.measureText(item.key).width + size * 0.9;
  ctx.font = `500 ${size}px ${CARD_FONT}`;
  return key + size * 0.45 + ctx.measureText(item.label).width;
}

export function paintChip(
  ctx: CanvasRenderingContext2D,
  item: HintItem,
  x: number,
  y: number,
  size: number,
): number {
  ctx.font = `700 ${size}px ${CARD_FONT}`;
  const keyW = ctx.measureText(item.key).width + size * 0.9;
  const boxH = size * 1.55;
  ctx.beginPath();
  ctx.roundRect(x, y - boxH / 2, keyW, boxH, size * 0.35);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.stroke();
  ctx.fillStyle = CARD_INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.key, x + keyW / 2, y + size * 0.04);
  ctx.font = `500 ${size}px ${CARD_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = CARD_INK;
  const labelX = x + keyW + size * 0.45;
  ctx.fillText(item.label, labelX, y + size * 0.04);
  ctx.textBaseline = 'alphabetic';
  return labelX + ctx.measureText(item.label).width - x;
}

/**
 * Chips in Reihen, links bündig ab `x`, höchstens `width` breit. Gibt die
 * Höhe zurück, die sie gebraucht haben.
 */
export function paintChips(
  ctx: CanvasRenderingContext2D,
  items: readonly HintItem[],
  x: number,
  y: number,
  width: number,
  size: number,
): number {
  const rowH = size * 2.1;
  const gap = size * 1.1;
  let cx = x;
  let cy = y + rowH / 2;
  for (const item of items) {
    const need = chipWidth(ctx, item, size);
    if (cx > x && cx + need > x + width) {
      cx = x;
      cy += rowH;
    }
    cx += paintChip(ctx, item, cx, cy, size) + gap;
  }
  return items.length ? cy + rowH / 2 - y : 0;
}
