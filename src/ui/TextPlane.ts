import * as THREE from 'three';

export interface TextPlaneOptions {
  width: number;
  height?: number;
  title: string;
  body?: string;
  accent?: number;
  background?: string;
  align?: 'left' | 'center';
}

const RES = 512;

/** A flat, canvas-rendered label — for signage, hints and world gates. */
export class TextPlane extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private options: TextPlaneOptions;

  constructor(options: TextPlaneOptions) {
    const height = options.height ?? options.width * 0.42;
    const canvas = document.createElement('canvas');
    canvas.width = RES;
    canvas.height = Math.round((RES * height) / options.width);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    super(
      new THREE.PlaneGeometry(options.width, height),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }),
    );

    this.canvas = canvas;
    this.texture = texture;
    this.options = options;
    this.name = `text-plane:${options.title}`;
    this.geometry.computeBoundingBox();
    this.draw();
  }

  /** New words, and — for anything that changes with them — a new accent. */
  setText(title: string, body?: string, accent?: number): void {
    this.options = { ...this.options, title, body, accent: accent ?? this.options.accent };
    this.draw();
  }

  setHighlight(active: boolean): void {
    this.material.opacity = active ? 1 : 0.9;
    this.scale.setScalar(active ? 1.04 : 1);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }

  private draw(): void {
    const { title, body, accent = 0x4aa8ff, background, align = 'left' } = this.options;
    const ctx = this.canvas.getContext('2d')!;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const accentCss = `#${accent.toString(16).padStart(6, '0')}`;

    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.roundRect(4, 4, w - 8, h - 8, 26);
    ctx.fillStyle = background ?? 'rgba(9, 14, 26, 0.86)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = accentCss;
    ctx.stroke();

    const centered = align === 'center';
    ctx.textAlign = centered ? 'center' : 'left';
    const x = centered ? w / 2 : 40;

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(h * 0.24)}px system-ui, sans-serif`;
    ctx.fillText(title, x, h * (body ? 0.36 : 0.58), w - 80);

    if (body) {
      // Lieber kleiner als abgeschnitten.
      //
      // Vorher hing die Schriftgröße allein an der Höhe der Tafel, und wer
      // nicht hineinpasste, bekam drei Punkte — auf einer Werte-Tafel heißt das
      // dann, dass genau die Zahl fehlt, für die man hergekommen ist. Jetzt
      // wird so weit verkleinert, bis alles hineinpasst; erst wenn selbst das
      // nicht reicht, wird gekürzt. Eine Zeile, die man kaum noch liest, ist
      // immer noch besser als eine, die nicht da ist.
      const top = h * 0.5;
      const room = h * 0.92 - top;
      const start = Math.round(h * 0.13);
      const floor = Math.max(11, Math.round(h * 0.055));
      ctx.fillStyle = '#9fb0d0';
      let fontSize = start;
      let lines: string[] = [];
      for (;;) {
        ctx.font = `400 ${fontSize}px system-ui, sans-serif`;
        lines = wrap(ctx, body, w - 80);
        if (lines.length * fontSize * 1.3 <= room || fontSize <= floor) break;
        fontSize -= 1;
      }
      const lineHeight = fontSize * 1.3;
      const maxLines = Math.max(1, Math.floor(room / lineHeight));
      lines.slice(0, maxLines).forEach((line, index) => {
        const isLast = index === maxLines - 1 && lines.length > maxLines;
        ctx.fillText(isLast ? `${line} …` : line, x, top + fontSize + index * lineHeight, w - 80);
      });
    }

    this.texture.needsUpdate = true;
  }
}

/**
 * Umbruch — und ein `\n` bricht, wo es steht.
 *
 * Ein Zeilenumbruch von Hand ist die einzige Möglichkeit, drei Zahlenreihen
 * untereinander zu stellen statt sie zu einem Absatz zu verkleben, in dem man
 * sie sucht.
 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}
