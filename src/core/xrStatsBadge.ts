import * as THREE from 'three';

const WIDTH = 512;
const HEIGHT = 96;

/**
 * **Die Bildrate in der Brille, während man spielt** — ein kleines Schild am
 * unteren Rand des Blickfelds, nur mit _Grafik → Bildrate zeigen_.
 *
 * Bis hierher stand die Zahl nur im Menü, und **mit offenem Menü rechnet die
 * Brille anders**: Foveated Rendering ist dann aus (`GraphicsQuality.setMenuOpen`),
 * und das Menü zeichnet selbst. Abgelesen wurde also ein Bild, das es beim
 * Spielen nie gibt. Gemeldet: _„120 Hz eingestellt, jetzt 30-25 hz. Können wir
 * das noch weiter erhöhen?"_ — dafür braucht es die Zahl beim Spielen, und
 * daneben, was bremst: CPU, Grafikkarte (`GpuTimer`), Zeichenaufrufe und die
 * Rate, mit der die Brille gerade wirklich läuft.
 *
 * Ein Netz, ein Zeichenaufruf je Auge, neu gemalt alle halbe Sekunde.
 */
export class XrStatsBadge {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly canvas = document.createElement('canvas');
  private readonly texture: THREE.CanvasTexture;

  constructor() {
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.03),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.mesh.name = 'xr-stats-badge';
    // Unten links im Blick, eine halbe Armlänge vor dem Auge.
    this.mesh.position.set(-0.13, -0.16, -0.45);
    this.mesh.renderOrder = 10001;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.write(['Bildrate wird gemessen …']);
  }

  /** Die Zeilen neu malen. */
  write(lines: readonly string[]): void {
    const c = this.canvas.getContext('2d');
    if (!c) return;
    c.clearRect(0, 0, WIDTH, HEIGHT);
    c.fillStyle = 'rgba(8, 14, 22, 0.78)';
    c.fillRect(0, 0, WIDTH, HEIGHT);
    c.fillStyle = '#d7f5ea';
    c.font = 'bold 34px system-ui';
    c.textBaseline = 'middle';
    lines.slice(0, 2).forEach((line, i) => {
      c.font = i === 0 ? 'bold 34px system-ui' : '26px system-ui';
      c.fillText(line, 14, i === 0 ? 30 : 72);
    });
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.texture.dispose();
  }
}
