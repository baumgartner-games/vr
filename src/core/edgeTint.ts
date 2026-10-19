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
 * und setzt deren Farbe als Hintergrund von `<html>` und `<body>` (und als
 * `theme-color` für alle, die es noch lesen). Dann ist der
 * Schleier so hell wie der Himmel darunter und nicht mehr zu sehen.
 *
 * **Die Leinwand selbst bekommt keine Farbe** — und der Streifen unter der
 * Uhr, der einmal hier stand, ist wieder weg. WebKit verlängert die Farbe
 * eines fest positionierten Kastens über den ganzen Schirm auch in den
 * unteren Rand: Mit Farbe an der Leinwand lag unten ein grau-grüner Balken
 * statt der Welt. Und der Streifen färbte zwar die Statusleiste, verwischt
 * blieb der Inhalt darunter trotzdem (Menüknopf, Auftragsliste). Gegen das
 * Verwischen in der installierten App hilft nur, nicht unter der Uhr zu
 * zeichnen — `apple-mobile-web-app-status-bar-style` ist deshalb `black`
 * (`index.html`).
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
  constructor(private readonly enabled: boolean) {
    this.meta = document.querySelector('meta[name="theme-color"]');
    this.metaDefault = this.meta?.content ?? null;
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
    return [document.documentElement, document.body];
  }
}
