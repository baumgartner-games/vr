import * as THREE from 'three';
import { faceCamera } from '../../ui/billboard';
import type { QuestTerrain } from './hexRules';
import { TERRAIN_COLOUR, drawHexIcon } from './hexIcon';

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

  /** `title` steht neben dem Sechseck: „3/5" auf dem Brett, „6" an der Kachel in der Hand. */
  show(terrain: QuestTerrain, title: string): void {
    const key = `${terrain}|${title}`;
    if (key === this.shown) return;
    this.shown = key;
    const g = this.canvas.getContext('2d');
    if (!g) return;
    g.setTransform(2, 0, 0, 2, 0, 0);
    const h = 128;
    g.clearRect(0, 0, 320, h);
    g.font = '800 72px system-ui, sans-serif';
    const textWidth = Math.min(200, g.measureText(title).width);
    // Die Pille so breit wie nötig, mittig auf der Leinwand.
    const w = 112 + textWidth + 28;
    const x0 = (320 - w) / 2;
    g.beginPath();
    g.roundRect(x0 + 3, 3, w - 6, h - 6, (h - 6) / 2);
    g.fillStyle = 'rgba(16, 20, 32, 0.88)';
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = TERRAIN_COLOUR[terrain];
    g.stroke();

    const icon = document.createElement('canvas');
    icon.width = icon.height = 192;
    const t = terrain;
    drawHexIcon(icon, { base: 'land', edges: [t, t, t, t, t, t], seed: 1 });
    g.drawImage(icon, x0 + 14, (h - 96) / 2, 96, 96);

    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffffff';
    g.fillText(title, x0 + 112, h / 2 + 3, 200);
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
