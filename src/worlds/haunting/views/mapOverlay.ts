import type { MapView } from '../map/mapView';

/**
 * **Eine zweite Leinwand über der Karte** — für das, was `MapView` nicht
 * zeichnet und nicht zeichnen soll.
 *
 * Die Karte gehört dem Paket `map` und wird hier nicht kopiert und nicht
 * geändert: Sie bekommt ihre Layer, und was eine Rolle darüber hinaus zeigen
 * will — den verblassenden Punkt des Spähers, das Radio auf der Schalttafel,
 * den Zielraum des Archivars —, malt sie auf dieses Blatt. Es liegt genau
 * über dem Canvas der Karte, rechnet mit `map.toScreen` in dieselben
 * Bildpunkte und lässt Finger durch (`pointer-events: none`), damit Ziehen,
 * Zoomen und Tippen bei der Karte bleiben.
 */
export class MapOverlay {
  readonly canvas = document.createElement('canvas');

  constructor(private readonly map: MapView) {
    this.canvas.className = 'mapoverlay';
    this.map.element.append(this.canvas);
  }

  /** Ein Bild: leeren, dann malen lassen. Größe und Dichte wie die Karte. */
  draw(paint: (ctx: CanvasRenderingContext2D, map: MapView) => void): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const rect = this.map.canvas.getBoundingClientRect();
    const w = rect.width || 320,
      h = rect.height || 320;
    const dpr = Math.min(
      2,
      Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1),
    );
    const pw = Math.max(1, Math.round(w * dpr)),
      ph = Math.max(1, Math.round(h * dpr));
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    paint(ctx, this.map);
  }

  dispose(): void {
    this.canvas.remove();
  }
}

/** Ein Punkt mit Hof — hell bei `glow` 1, blass bei 0. */
export function dot(
  ctx: CanvasRenderingContext2D,
  at: { x: number; y: number },
  radius: number,
  color: string,
  alpha: number,
  glow: number,
): void {
  if (glow > 0) {
    const halo = ctx.createRadialGradient(
      at.x,
      at.y,
      radius * 0.5,
      at.x,
      at.y,
      radius * (1.6 + glow * 2.4),
    );
    halo.addColorStop(0, withAlpha(color, 0.5 * glow));
    halo.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius * (1.6 + glow * 2.4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Ein Schildchen mit Text neben einem Punkt. */
export function tag(
  ctx: CanvasRenderingContext2D,
  at: { x: number; y: number },
  text: string,
  color: string,
): void {
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const width = ctx.measureText(text).width + 10;
  const x = at.x + 9,
    y = at.y - 12;
  ctx.fillStyle = 'rgba(7, 10, 16, 0.85)';
  ctx.fillRect(x, y - 8, width, 16);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y - 8, width, 16);
  ctx.fillStyle = color;
  ctx.fillText(text, x + 5, y);
}

/** `#rrggbb` mit Deckkraft — für Verläufe, die keine Klasse kennen. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}
