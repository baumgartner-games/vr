import type * as THREE from 'three';

/**
 * **Die Statusleiste soll die Farbe der Welt haben, nicht die der Seite.**
 *
 * Gemeldet an einem Foto vom iPad: _„oben wird anscheinend etwas blurry"_ —
 * über dem hellen Himmel von Hexland lag unter Uhr und Datum ein grauer,
 * verwischter Streifen. Im Browser am Rechner ist dort nichts.
 *
 * Safari 26 (iPhone, iPad) legt unter die Statusleiste einen Weichzeichner
 * und **färbt ihn aus der Seite**: aus dem, was am Rand liegt, und wo das eine
 * Leinwand ohne Farbe ist, aus dem Hintergrund von `<html>`. Das ist bei uns
 * `--bg`, fast schwarz — und über einer hellen Welt wird daraus ein grauer
 * Schleier. `theme-color` liest Safari 26 nicht mehr.
 *
 * Deshalb liest `EdgeTint` nach dem Bild die **oberste Zeile der Leinwand**
 * und setzt deren Farbe als Hintergrund von `<html>`, `<body>` und der
 * Leinwand (und als `theme-color` für alle, die es noch lesen). Dann ist der
 * Schleier so hell wie der Himmel darunter und nicht mehr zu sehen.
 *
 * **Und als App vom Home-Bildschirm verwischt iOS 26 den Inhalt darunter.**
 * Gemeldet, nachdem die Farbe schon stimmte: _„Die blurrnes ist noch nicht
 * gefixt"_ — in der installierten App, und unscharf wird der **Inhalt**, der
 * oben an den Rand kommt. Das ist der Scroll-Edge-Effekt von Liquid Glass:
 * eine Unschärfe, die rund 40 pt von oben ausläuft, ohne Schalter in CSS
 * oder Meta. WebKit lässt ihn nur weg, wenn am oberen Rand ein fest
 * positionierter Kasten über die ganze Breite liegt, der **eine** deckende
 * Farbe malt und höher als 10 px ist (`LocalFrameView::fixedContainerEdges`).
 * Die Leinwand ist so ein Kasten, malt aber Kacheln — viele Farben.
 *
 * Deshalb liegt in der installierten App ein **Streifen** unter der Uhr
 * (`strip`): so hoch wie der sichere Rand oben, mindestens 12 px, in
 * derselben Farbe wie der obere Bildrand. Unter der Uhr steht ohnehin nichts,
 * was man lesen müsste; Knöpfe und Leisten liegen darüber (`z-index`).
 *
 * Gelesen wird zweimal je Sekunde und nur auf iPhone und iPad
 * (`isAppleHandheld`): `readPixels` wartet auf die Grafikkarte, und kein
 * anderes Gerät braucht es. Nie in der Brille. Auf der Startseite gilt
 * wieder der Stil (`clear`).
 */
const EVERY_MS = 500;

/** Unter dieser Abweichung je Kanal wird nichts neu gesetzt. */
const SAME = 3;

export class EdgeTint {
  private last = -Infinity;
  private color: [number, number, number] | null = null;
  private row = new Uint8Array(0);
  private meta: HTMLMetaElement | null = null;
  private metaDefault: string | null = null;
  private readonly strip: HTMLElement | null = null;

  /** `strip`: als App vom Home-Bildschirm — der Streifen unter der Uhr. */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly enabled: boolean,
    strip = false,
  ) {
    this.meta = document.querySelector('meta[name="theme-color"]');
    this.metaDefault = this.meta?.content ?? null;
    if (enabled && strip) {
      this.strip = document.createElement('div');
      this.strip.className = 'edge-strip';
      this.strip.setAttribute('aria-hidden', 'true');
      // Über der Leinwand, unter HUD (5) und Menü (20).
      this.strip.style.cssText =
        'position:fixed;top:0;left:0;right:0;z-index:1;pointer-events:none;' +
        'height:max(env(safe-area-inset-top, 0px), 12px);background-color:var(--bg)';
      document.body.appendChild(this.strip);
    }
  }

  /** Direkt nach dem Bild aufrufen — danach ist der Puffer leer. */
  sample(renderer: THREE.WebGLRenderer, now: number): void {
    if (!this.enabled || now - this.last < EVERY_MS) return;
    this.last = now;
    const gl = renderer.getContext();
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    if (width <= 0 || height <= 0) return;
    if (this.row.length !== width * 4) this.row = new Uint8Array(width * 4);
    // WebGL zählt von unten: die oberste Zeile ist `height - 1`.
    gl.readPixels(0, height - 1, width, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.row);
    let r = 0;
    let g = 0;
    let b = 0;
    for (let i = 0; i < this.row.length; i += 4) {
      r += this.row[i];
      g += this.row[i + 1];
      b += this.row[i + 2];
    }
    this.apply([Math.round(r / width), Math.round(g / width), Math.round(b / width)]);
  }

  /** Zurück zum Stil der Seite — Startseite, Brille. */
  clear(): void {
    if (this.color === null) return;
    this.color = null;
    for (const el of this.targets()) el.style.removeProperty('background-color');
    this.strip?.style.setProperty('background-color', 'var(--bg)');
    if (this.meta && this.metaDefault !== null) this.meta.content = this.metaDefault;
  }

  private apply(color: [number, number, number]): void {
    const prev = this.color;
    if (prev && color.every((c, i) => Math.abs(c - prev[i]) < SAME)) return;
    this.color = color;
    const css = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    for (const el of this.targets()) el.style.backgroundColor = css;
    if (this.meta) this.meta.content = css;
  }

  private targets(): HTMLElement[] {
    const out = [document.documentElement, document.body, this.canvas];
    if (this.strip) out.push(this.strip);
    return out;
  }
}
