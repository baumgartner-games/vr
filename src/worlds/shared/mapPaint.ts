import { toPixels, toScreen, type MapFit } from './mapFit';
import type { MapLayers, MapMark, MapScene } from './mapScene';

/**
 * **Die Karte, gemalt** — die einzige Datei der Kartenschicht, die einen
 * Bildschirm kennt.
 *
 * Alles darunter ist Rechnung: `mapFit.ts` sagt, wo etwas landet,
 * `mapScene.ts` sagt, was überhaupt daraufkommt, und beide sind ohne Browser
 * prüfbar. Hier wird nur noch gezeichnet — und zwar in einen ganz gewöhnlichen
 * `CanvasRenderingContext2D`. Das ist der Grund, warum dieselbe Karte an drei
 * Stellen stehen kann, ohne dreimal gebaut zu werden:
 *
 * - auf der **Werkzeugseite** in einem `<canvas>` im Bild,
 * - in der **Brille** als `CanvasTexture` auf einer Tafel (`MapTool`),
 * - und, mit einer anderen Mitte und einem größeren Maßstab, als
 *   **Minikarte**, die jemandem folgt (`fitMap({ centre })`).
 *
 * Gemalt wird von unten nach oben: Grund, Kacheln, Wände, Verbindungen, Wege,
 * und zuletzt, was sich bewegt. Die Reihenfolge ist die Sortierung — ein
 * Zombie unter einer Kachel wäre keiner.
 */

/** Die Farben einer Karte. Zahlen wie überall im Spiel, nicht `#rrggbb`. */
export interface MapStyle {
  /** Der Grund, auf dem alles liegt. `null` lässt durchscheinen, was da war. */
  ground: number | null;
  tile: number;
  /** Die oberste Etage — sie liegt heller darüber. */
  upper: number;
  blocked: number;
  /** Was wehtut: die Stachelgrube, das Feuer, das Wasser. */
  hazard: number;
  wall: number;
  ledge: number;
  link: number;
  path: number;
  /** Beschriftungen und Ringe. */
  ink: number;
}

/** Dieselben Farben wie die Debug-Linien im Raum (`nav/navLayers.ts`). */
export const MAP_STYLE: MapStyle = {
  ground: 0x0b111c,
  tile: 0x39d0ff,
  upper: 0x9fe3ff,
  blocked: 0xff3bd0,
  hazard: 0xff8a2f,
  wall: 0xff5a5a,
  ledge: 0xffc857,
  link: 0x9d7bff,
  path: 0x5ee0a0,
  ink: 0xe8ecf7,
};

export interface PaintOptions {
  layers?: MapLayers;
  style?: MapStyle;
  /** Namen an die Marken schreiben. Auf einer Minikarte: aus. */
  labels?: boolean;
  /** Wie groß ein Punkt auf der Karte mindestens ist, in Bildpunkten. */
  markSize?: number;
}

const ALL: MapLayers = { tiles: true, walls: true, links: true, paths: true };

/** Eine Farbzahl als CSS-Farbe, wahlweise durchsichtig. */
export function cssColor(value: number, alpha = 1): string {
  const hex = `#${(value >>> 0).toString(16).padStart(6, '0')}`;
  if (alpha >= 1) return hex;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Malt die Karte in den Kontext — das ganze Bild, jedes Mal neu.
 *
 * Kein Nachführen einzelner Marken: Eine Karte dieser Größe kostet ein paar
 * hundert Rechtecke, und der Aufwand, herauszufinden, welches sich geändert
 * hat, ist größer als der, alle zu malen. Was sich lohnt, ist die **Frequenz**
 * — ein Aufrufer darf gern nur fünfmal je Sekunde neu malen (`MapTool`).
 */
export function paintMap(
  ctx: CanvasRenderingContext2D,
  scene: MapScene,
  fit: MapFit,
  options: PaintOptions = {},
): void {
  const style = options.style ?? MAP_STYLE;
  const layers = options.layers ?? ALL;
  const size = options.markSize ?? 7;

  ctx.save();
  ctx.clearRect(0, 0, fit.width, fit.height);
  if (style.ground !== null) {
    ctx.fillStyle = cssColor(style.ground);
    ctx.fillRect(0, 0, fit.width, fit.height);
  }
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (layers.tiles) paintTiles(ctx, scene, fit, style);
  if (layers.walls) {
    paintLines(ctx, scene.walls, fit, cssColor(style.wall, 0.95), Math.max(1.5, size * 0.34));
    paintLines(ctx, scene.ledges, fit, cssColor(style.ledge, 0.9), Math.max(1.5, size * 0.28));
  }
  if (layers.links) paintLinks(ctx, scene, fit, style, size);
  if (layers.paths) paintPaths(ctx, scene, fit, style, size);
  for (const mark of scene.marks) paintMark(ctx, mark, fit, style, size, options.labels ?? true);
  ctx.restore();
}

/**
 * Die Kacheln, Etage für Etage von unten nach oben.
 *
 * Ein Quadrat mit einer Fuge dazwischen und nicht eine durchgehende Fläche:
 * Man soll dem Boden ansehen, dass er aus Kacheln besteht — das ist die
 * Auflösung, in der die Wegsuche denkt, und wer sie nicht sieht, wundert sich
 * über Wege, die einen halben Meter neben der Wand verlaufen.
 */
function paintTiles(
  ctx: CanvasRenderingContext2D,
  scene: MapScene,
  fit: MapFit,
  style: MapStyle,
): void {
  const side = Math.max(
    1,
    toPixels(fit, scene.tile) - Math.max(1, toPixels(fit, scene.tile) * 0.12),
  );
  const top = scene.tiles.reduce((high, tile) => Math.max(high, tile.level), 0);
  const order = [...scene.tiles].sort((a, b) => a.level - b.level);
  const point = { x: 0, y: 0 };
  for (const tile of order) {
    toScreen(fit, tile, point);
    ctx.fillStyle = tile.blocked
      ? cssColor(style.blocked, 0.75)
      : tile.hazard
        ? cssColor(style.hazard, 0.55)
        : cssColor(
            tile.level === top && top > 0 ? style.upper : style.tile,
            0.16 + tile.level * 0.06,
          );
    ctx.fillRect(point.x - side / 2, point.y - side / 2, side, side);
  }
}

function paintLines(
  ctx: CanvasRenderingContext2D,
  lines: MapScene['walls'],
  fit: MapFit,
  color: string,
  width: number,
): void {
  if (lines.length === 0) return;
  const a = { x: 0, y: 0 };
  const b = { x: 0, y: 0 };
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (const line of lines) {
    toScreen(fit, { x: line.ax, z: line.az }, a);
    toScreen(fit, { x: line.bx, z: line.bz }, b);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
}

/** Verbindungen gestrichelt: Sie sind kein Weg, sondern ein Übergang. */
function paintLinks(
  ctx: CanvasRenderingContext2D,
  scene: MapScene,
  fit: MapFit,
  style: MapStyle,
  size: number,
): void {
  ctx.setLineDash([size * 0.6, size * 0.5]);
  paintLines(ctx, scene.links, fit, cssColor(style.link, 0.9), Math.max(1, size * 0.24));
  ctx.setLineDash([]);
}

function paintPaths(
  ctx: CanvasRenderingContext2D,
  scene: MapScene,
  fit: MapFit,
  style: MapStyle,
  size: number,
): void {
  ctx.strokeStyle = cssColor(style.path, 0.95);
  ctx.lineWidth = Math.max(1.5, size * 0.3);
  const point = { x: 0, y: 0 };
  for (const path of scene.paths) {
    if (path.length < 2) continue;
    ctx.beginPath();
    path.forEach((spot, index) => {
      toScreen(fit, spot, point);
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }
}

/**
 * Eine Marke — und jede Sorte hat ihre eigene Form.
 *
 * Nicht nur ihre Farbe: Auf einer Karte von der Größe einer Handfläche sind
 * fünf Sorten Punkt in fünf Farben fünf Punkte. Ein Knopf ist ein Quadrat, ein
 * Spieler ein Pfeil, ein Ziel ein Ring, ein NPC eine Scheibe mit einem
 * Lebensbalken darüber. Das erkennt man auch dann, wenn die Karte klein ist
 * und der Rest der Welt gerade wichtiger.
 */
function paintMark(
  ctx: CanvasRenderingContext2D,
  mark: MapMark,
  fit: MapFit,
  style: MapStyle,
  size: number,
  labels: boolean,
): void {
  const at = toScreen(fit, mark);
  const color = cssColor(mark.color);

  if (mark.kind === 'button') {
    const half = size * 0.9;
    ctx.fillStyle = color;
    ctx.strokeStyle = cssColor(style.ink, 0.85);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(at.x - half, at.y - half, half * 2, half * 2);
    ctx.fill();
    ctx.stroke();
  } else if (mark.kind === 'target') {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, size * 0.34);
    ctx.beginPath();
    ctx.arc(at.x, at.y, size * 1.1, 0, Math.PI * 2);
    ctx.stroke();
  } else if (mark.kind === 'player') {
    // Ein Pfeil, der zeigt, wohin geschaut wird. In der Welt ist −Z vorn, auf
    // der Karte ist das oben — und quer gelegt eine Vierteldrehung weiter.
    const heading = (mark.yaw ?? 0) + (fit.turn ? Math.PI / 2 : 0);
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(-heading);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.3);
    ctx.lineTo(size * 0.9, size);
    ctx.lineTo(0, size * 0.45);
    ctx.lineTo(-size * 0.9, size);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = mark.kind === 'point' ? cssColor(mark.color, 0.5) : color;
    ctx.beginPath();
    ctx.arc(at.x, at.y, size * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  if (mark.health !== undefined && mark.health < 1) {
    const wide = size * 2.2;
    const high = Math.max(2, size * 0.36);
    const top = at.y - size * 2;
    ctx.fillStyle = cssColor(0x10141c, 0.85);
    ctx.fillRect(at.x - wide / 2, top, wide, high);
    ctx.fillStyle = cssColor(
      mark.health > 0.6 ? 0x5ee0a0 : mark.health > 0.3 ? 0xffc857 : 0xff3b2f,
    );
    ctx.fillRect(at.x - wide / 2, top, Math.max(1, wide * mark.health), high);
  }

  if (!labels || !mark.label) return;
  ctx.font = `${Math.round(size * 1.5)}px system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  // **Unter der Marke und mittig**, nicht daneben: Ein Name rechts daneben
  // schiebt sich bei zwei Knöpfen nebeneinander übereinander, und am rechten
  // Rand läuft er aus dem Bild. Mittig wächst er nach beiden Seiten, und die
  // Zeile darunter bleibt frei.
  const half = ctx.measureText(mark.label).width / 2;
  const x = Math.min(Math.max(at.x, half + 2), fit.width - half - 2);
  const y = at.y + size * 1.3;
  // Erst ein dunkler Rand, dann die Schrift: Eine Beschriftung über hellen
  // Kacheln und dunklem Grund ist sonst mal lesbar und mal nicht.
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = cssColor(0x05070d, 0.9);
  ctx.strokeText(mark.label, x, y);
  ctx.fillStyle = cssColor(style.ink);
  ctx.fillText(mark.label, x, y);
}
