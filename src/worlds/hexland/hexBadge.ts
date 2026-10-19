import * as THREE from 'three';
import { faceCamera } from '../../ui/billboard';
import type { QuestTerrain } from './hexRules';
import { TERRAIN_COLOUR, drawHexIcon } from './hexIcon';

/** Ein Stück Text auf dem Abzeichen, mit eigener Farbe. */
export interface BadgeSpan {
  text: string;
  colour?: string | undefined;
}

/**
 * **Das Abzeichen eines Auftrags** — klein: vorn das Gelände als Sechseck in
 * seiner Farbe, daneben groß, wie weit es ist („3/5"). Gewünscht zuerst:
 * _„Bei den Aufträgen erkenne ich zwar wie viele, aber nicht was gemacht
 * werden soll … ein kleines Icon"_, dann: _„Können wir die Mission-Tiles
 * anders darstellen? Aktuell verdecken diese viel … nur das Icon, aber mit
 * X/Y rendern."_ Was dazugehört, zeigen die Ränder am Boden
 * (`HexlandWorld.drawQuestRims`); die Erklärung steht in der Liste oben rechts.
 */
export class QuestBadge extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private shown = '';

  constructor(width = 1.25) {
    // Doppelt so fein gemalt wie gemessen (320 × 128) — am Handy sonst unscharf.
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 256;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    super(
      new THREE.PlaneGeometry(width, (width * 128) / 320),
      // **Immer vor allem anderen** — gemeldet: _„Der Text wird leider verdeckt
      // von hohen Elementen. Bitte immer darüber setzen."_ Ohne Tiefenprüfung
      // und spät gezeichnet liegt das Abzeichen über Bäumen und Häusern.
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        toneMapped: false,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.renderOrder = 8;
    this.canvas = canvas;
    this.texture = texture;
    this.name = 'hexland-quest-badge';
    faceCamera(this);
  }

  /**
   * `title` steht neben dem Sechseck: „3/5" auf dem Brett, „6" an der Kachel in
   * der Hand — als Text oder in Stücken mit eigener Farbe (das X in „X/Y",
   * wenn die Kachel in der Hand es ändert). `ring` färbt den Rand statt des
   * Geländes.
   */
  show(terrain: QuestTerrain, title: string | readonly BadgeSpan[], ring?: string): void {
    const spans = typeof title === 'string' ? [{ text: title }] : title;
    const text = spans.map((s) => s.text).join('');
    const key = `${terrain}|${spans.map((s) => `${s.text}:${s.colour ?? ''}`).join('|')}|${ring ?? ''}`;
    if (key === this.shown) return;
    this.shown = key;
    const g = this.canvas.getContext('2d');
    if (!g) return;
    g.setTransform(2, 0, 0, 2, 0, 0);
    const h = 128;
    g.clearRect(0, 0, 320, h);
    g.font = '800 72px system-ui, sans-serif';
    const full = g.measureText(text).width;
    const textWidth = Math.min(200, full);
    // Die Pille so breit wie nötig, mittig auf der Leinwand.
    const w = 112 + textWidth + 28;
    const x0 = (320 - w) / 2;
    g.beginPath();
    g.roundRect(x0 + 3, 3, w - 6, h - 6, (h - 6) / 2);
    g.fillStyle = 'rgba(16, 20, 32, 0.88)';
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = ring ?? TERRAIN_COLOUR[terrain];
    g.stroke();

    const icon = document.createElement('canvas');
    icon.width = icon.height = 192;
    const t = terrain;
    drawHexIcon(icon, { base: 'land', edges: [t, t, t, t, t, t], seed: 1 });
    g.drawImage(icon, x0 + 14, (h - 96) / 2, 96, 96);

    g.textAlign = 'left';
    g.textBaseline = 'middle';
    // Zu breit: Die Stücke rücken zusammen wie `fillText` mit Höchstbreite.
    const squeeze = full > 200 ? 200 / full : 1;
    let x = x0 + 112;
    for (const span of spans) {
      const w = g.measureText(span.text).width * squeeze;
      g.fillStyle = span.colour ?? '#ffffff';
      g.fillText(span.text, x, h / 2 + 3, w);
      x += w;
    }
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
