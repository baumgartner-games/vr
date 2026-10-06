import type { LaidLine, RunStyle, SignLayout } from './signLayout';
import { cssColor, type SignSettings } from './signSettings';

/**
 * **Wie ein Schild auf eine Leinwand kommt** — für die Tafel in der Welt
 * (`SignBoard.ts`) und für dasselbe Schild groß im Menü (`signSheet.ts`).
 *
 * Zwei Zeichner für denselben Text wären nach dem ersten Unterschied zwei
 * Schilder: Was auf der Tafel fett und eingerückt steht, muss es auch auf dem
 * Blatt sein. Deshalb stehen hier die Zeilen, die Bilder und die drei Töne,
 * und beide Seiten rufen nur noch `paintLines`.
 */

/** Ein Bild, das das Schild zeigen soll — und wie weit es damit ist. */
export interface SignImage {
  image: HTMLImageElement;
  ready: boolean;
  failed: boolean;
}

/**
 * **Die Bilder eines Schildes** — geladen beim ersten Fragen nach ihrem
 * Seitenverhältnis.
 *
 * `onChange(true)`: ein Bild ist da, der Text muss **einmal** neu umbrechen.
 * `onChange(false)`: eines geht nicht, nur der Platzhalter ändert sich.
 */
export class SignImages {
  private readonly images = new Map<string, SignImage>();

  constructor(private readonly onChange: (relayout: boolean) => void) {}

  get(url: string): SignImage | undefined {
    return this.images.get(url);
  }

  /**
   * Das Seitenverhältnis eines Bildes — und der Anstoß, es zu laden.
   *
   * Der Umbruch fragt danach; solange die Antwort `null` ist, bekommt das Bild
   * ein 16:9-Loch. Ein fehlendes Bild darf ein Schild nicht leer lassen: Dann
   * steht dort ein Rahmen mit seinem Alternativtext, und der Rest des Textes
   * bleibt lesbar.
   */
  aspectOf(url: string): number | null {
    const known = this.images.get(url);
    if (known) {
      if (!known.ready || known.failed) return null;
      return known.image.naturalWidth / Math.max(1, known.image.naturalHeight);
    }
    if (!/^(https?:|data:)/i.test(url)) {
      this.images.set(url, { image: new Image(), ready: false, failed: true });
      return null;
    }
    const image = new Image();
    const entry: SignImage = { image, ready: false, failed: false };
    this.images.set(url, entry);
    // Ohne diese Zeile wird die Leinwand beim Zeichnen „vergiftet" und die
    // Textur lässt sich nicht mehr hochladen — das Schild bliebe schwarz.
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      entry.ready = true;
      this.onChange(true);
    };
    image.onerror = () => {
      entry.failed = true;
      this.onChange(false);
    };
    image.src = url;
    return null;
  }

  clear(): void {
    this.images.clear();
  }
}

/**
 * **Die Zeilen eines Schildes zeichnen** — ab `offset` (gerollt), so viel,
 * wie in `view` Bildpunkte Höhe passt. Der Aufrufer hat den Ursprung schon an
 * die linke obere Ecke der Textfläche geschoben und dort abgeschnitten.
 */
export function paintLines(
  ctx: CanvasRenderingContext2D,
  layout: SignLayout,
  settings: SignSettings,
  images: SignImages,
  area: { width: number; offset: number; view: number },
): void {
  for (const line of layout.lines) {
    // Was ober- oder unterhalb liegt, wird nicht gezeichnet: Bei einem
    // langen Aushang ist das der Unterschied zwischen einem Bild und einem
    // Ruckler.
    if (line.y + line.height < area.offset - 40) continue;
    if (line.y > area.offset + area.view + 40) break;
    paintLine(ctx, line, area.width, settings, images);
  }
}

function paintLine(
  ctx: CanvasRenderingContext2D,
  line: LaidLine,
  width: number,
  settings: SignSettings,
  images: SignImages,
): void {
  if (line.rule) {
    ctx.strokeStyle = withAlpha(settings.color, 0.35);
    ctx.lineWidth = Math.max(1, line.height * 0.06);
    ctx.beginPath();
    ctx.moveTo(0, line.y + line.height / 2);
    ctx.lineTo(width, line.y + line.height / 2);
    ctx.stroke();
    return;
  }

  if (line.image) {
    paintImage(ctx, line, width, settings, images);
    return;
  }

  if (line.quote) {
    ctx.fillStyle = withAlpha(settings.color, 0.4);
    ctx.fillRect(0, line.y + 2, Math.max(2, line.height * 0.08), line.height - 4);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (const run of line.runs) {
    ctx.font = fontOf(run.style);
    ctx.fillStyle = toneColor(settings, run.style.tone);
    const y = line.y + line.baseline;
    ctx.fillText(run.text, run.x, y);
    if (run.link) {
      // Ein Link wird unterstrichen und nicht blau: Die Farbe gehört dem
      // Schild, die Unterstreichung dem Link.
      ctx.fillRect(run.x, y + run.style.size * 0.14, run.width, Math.max(1, run.style.size * 0.05));
    }
  }
}

function paintImage(
  ctx: CanvasRenderingContext2D,
  line: LaidLine,
  width: number,
  settings: SignSettings,
  images: SignImages,
): void {
  const box = line.image!;
  const entry = images.get(box.url);
  if (entry?.ready && !entry.failed) {
    ctx.drawImage(entry.image, box.x, line.y, box.width, box.height);
    return;
  }
  // Platzhalter: ein Rahmen mit dem Alternativtext. „Lädt" und „geht nicht"
  // sehen verschieden aus — sonst wartet man auf ein Bild, das nie kommt.
  ctx.strokeStyle = withAlpha(settings.color, 0.35);
  ctx.lineWidth = 2;
  ctx.strokeRect(box.x, line.y, box.width, box.height);
  ctx.fillStyle = withAlpha(settings.color, 0.6);
  ctx.font = `400 ${Math.round(line.height * 0.12)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(
    entry?.failed ? `Bild nicht ladbar · ${box.alt || box.url}` : `Bild lädt · ${box.alt}`,
    box.x + box.width / 2,
    line.y + box.height / 2,
    Math.min(width, box.width) - 20,
  );
  ctx.textAlign = 'left';
}

export function fontOf(style: RunStyle): string {
  const family = style.mono ? 'ui-monospace, monospace' : 'system-ui, sans-serif';
  const weight = style.bold ? 700 : 400;
  const slant = style.italic ? 'italic ' : '';
  return `${slant}${weight} ${Math.round(style.size)}px ${family}`;
}

/**
 * Die drei Töne einer Tafel — **eine** Farbe, drei Stärken.
 *
 * Eine zweite Farbe zu erfinden ginge schief: Sie müsste zum Hintergrund
 * passen, und den stellt der Spieler ein. Also bekommt die Überschrift die
 * volle Farbe, der Fließtext ein wenig weniger und das Beiläufige (Code,
 * Zitat) deutlich weniger. Das reicht, damit eine Gliederung eine ist.
 */
function toneColor(settings: SignSettings, tone: RunStyle['tone']): string {
  if (tone === 'accent') return cssColor(settings.color);
  if (tone === 'muted') return withAlpha(settings.color, 0.62);
  return withAlpha(settings.color, 0.88);
}

export function withAlpha(color: number, alpha: number): string {
  const value = Math.max(0, Math.round(color));
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}
