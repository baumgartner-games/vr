import { layoutSign } from './signLayout';
import { parseSign } from './signMarkup';
import { fontOf, paintLines, SignImages } from './signPaint';
import { SIGN_PAD } from './SignBoard';
import { clampSign, cssColor, fontPixels, type SignSettings } from './signSettings';
import type { MenuSheet } from '../../ui/menu';

/**
 * **Ein Schild als Blatt im Menü** (`MenuEntry.sheet`) — dasselbe Schild,
 * nur groß.
 *
 * Gewünscht: _„wenn ich sign posts anwähle, dass diese wie die menüs
 * gerendert werden (z. B. katalog) also auch groß mit einem x."_ Wer ein
 * Schild anwählt, bekommt also nicht mehr eine Liste von Zeilen, in der
 * Überschriften und Fettes verloren gehen, sondern das Schild selbst: seine
 * Farben, seine Gliederung, seine Bilder — so breit, wie die Seite ist, und
 * so lang, wie der Text ist. Gerollt wird die Seite, nicht das Schild.
 *
 * **Die Schrift wächst mit**, wie auf der Tafel: Was dort 4 cm auf 1,20 m
 * waren, ist hier derselbe Anteil der Breite. Zwei Grenzen gibt es dazu —
 * nach unten, damit eine breite Tafel mit kleiner Schrift am Telefon lesbar
 * bleibt, und nach oben, damit eine schmale mit großer Schrift nicht drei
 * Wörter je Zeile hat.
 */

/** Kleinste Grundschrift in CSS-Punkten — darunter liest am Telefon niemand. */
const MIN_FONT = 17;
/** Größte Grundschrift als Anteil der Breite: gut zwanzig Zeichen je Zeile. */
const MAX_FONT = 1 / 18;
/**
 * Und in CSS-Punkten: Am breiten Schirm wäre ein Anteil der Breite eine
 * Plakatschrift, mit der Überschrift über eine halbe Bildschirmhöhe.
 */
const MAX_FONT_CSS = 26;
/** Größter Rand in CSS-Punkten — auf einem breiten Schirm wäre ein Anteil zu viel. */
const MAX_PAD = 32;
/**
 * Höher wird die Leinwand nicht. Browser verweigern größere (die Grenze liegt
 * je nach Gerät bei 16 000 bis 32 000 Punkten), und ein Aushang, der länger
 * ist, ist ein Buch.
 */
const MAX_HEIGHT = 16000;

export class SignSheet implements MenuSheet {
  readonly settings: SignSettings;
  private readonly listeners = new Set<() => void>();
  private readonly images = new SignImages(() => {
    this.painted.clear();
    for (const listener of [...this.listeners]) listener();
  });
  /**
   * **Je Breite eine Leinwand** — dieselbe Breite noch einmal ist umsonst.
   * Und zwei Leser (die Seite am Schirm, der Bildschirm in der nachgestellten
   * Brille) malen einander nichts über.
   */
  private readonly painted = new Map<string, HTMLCanvasElement>();

  constructor(
    readonly text: string,
    settings: Partial<SignSettings>,
  ) {
    this.settings = clampSign(settings);
  }

  paint(width: number, scale: number): HTMLCanvasElement {
    const w = Math.max(64, Math.round(width));
    const key = `${w}:${scale}`;
    const known = this.painted.get(key);
    if (known) return known;
    const canvas = document.createElement('canvas');
    // Ein Fenster, das man in der Breite zieht, hinterlässt keinen Stapel.
    if (this.painted.size >= 3) this.painted.clear();
    this.painted.set(key, canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    const settings = this.settings;
    const pad = Math.min(w * SIGN_PAD, MAX_PAD * scale);
    const font = Math.min(
      Math.max(fontPixels(settings, w), MIN_FONT * scale),
      w * MAX_FONT,
      MAX_FONT_CSS * scale,
    );
    const layout = layoutSign(parseSign(this.text, { markdown: settings.markdown }), {
      width: w - pad * 2,
      fontSize: font,
      align: settings.align,
      measure: (text, style) => {
        ctx.font = fontOf(style);
        return ctx.measureText(text).width;
      },
      imageAspect: (url) => this.images.aspectOf(url),
    });

    const h = Math.min(MAX_HEIGHT, Math.ceil(layout.height + pad * 2));
    // Größe setzen leert die Leinwand und alle Einstellungen des Kontexts.
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = cssColor(settings.background);
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(pad, pad);
    paintLines(ctx, layout, settings, this.images, {
      width: w - pad * 2,
      offset: 0,
      view: h,
    });
    ctx.restore();
    return canvas;
  }

  listen(onChange: () => void): () => void {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  }
}
