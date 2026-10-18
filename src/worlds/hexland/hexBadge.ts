import * as THREE from 'three';
import { faceCamera } from '../../ui/billboard';
import { TERRAIN_LABEL, type QuestTerrain } from './hexRules';
import { TERRAIN_COLOUR, drawHexIcon } from './hexIcon';

/**
 * **Das Schild eines Auftrags** — vorn das Gelände als Sechseck in seiner
 * Farbe, daneben groß, was verlangt ist: „Stadt 2 / 5", „Weizen 4".
 *
 * Gewünscht: _„Bei den Aufträgen erkenne ich zwar wie viele, aber nicht was
 * gemacht werden soll? ‚Stadt: 5', ‚Fluss: X', ‚Weizen: X' usw. Ggf. wäre hier
 * ein kleines Icon … gut?"_ Ein `TextPlane` kann nur Text; das hier malt das
 * Bildchen der Kachelleiste (`hexIcon.ts`) mit auf die Leinwand.
 */
export class QuestBadge extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private shown = '';

  constructor(width = 2.2) {
    const canvas = document.createElement('canvas');
    // Doppelt so fein wie gezeichnet — am Handy mit hoher Pixeldichte sonst unscharf.
    canvas.width = 1024;
    canvas.height = 384;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    super(
      new THREE.PlaneGeometry(width, (width * 192) / 512),
      // **Immer vor allem anderen** — gemeldet: _„Der Text wird leider verdeckt
      // von hohen Elementen. Bitte immer darüber setzen."_ Ohne Tiefenprüfung
      // und spät gezeichnet liegt das Schild über Bäumen und Häusern, wie die
      // Tafeln mit `front` (`ui/TextPlane.ts`).
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

  /** `title` steht neben dem Geländenamen („2 / 5"), `sub` klein darunter. */
  show(terrain: QuestTerrain, title: string, sub: string): void {
    const key = `${terrain}|${title}|${sub}`;
    if (key === this.shown) return;
    this.shown = key;
    const g = this.canvas.getContext('2d');
    if (!g) return;
    // In Punkten der alten Leinwand (512 × 192), doppelt so fein gemalt.
    const w = this.canvas.width / 2;
    const h = this.canvas.height / 2;
    g.setTransform(2, 0, 0, 2, 0, 0);
    g.clearRect(0, 0, w, h);
    g.beginPath();
    g.roundRect(4, 4, w - 8, h - 8, 36);
    g.fillStyle = 'rgba(16, 20, 32, 0.9)';
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = TERRAIN_COLOUR[terrain];
    g.stroke();

    const icon = document.createElement('canvas');
    icon.width = icon.height = 300;
    const t = terrain;
    drawHexIcon(icon, { base: 'land', edges: [t, t, t, t, t, t], seed: 1 });
    g.drawImage(icon, 20, (h - 150) / 2, 150, 150);

    g.textAlign = 'left';
    g.fillStyle = '#ffffff';
    g.font = '700 64px system-ui, sans-serif';
    g.fillText(`${TERRAIN_LABEL[terrain]} ${title}`, 186, 98, w - 206);
    g.fillStyle = '#c9d2e6';
    g.font = '500 32px system-ui, sans-serif';
    g.fillText(sub, 188, 148, w - 206);
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
