import * as THREE from 'three';
import { TextPlane } from '../../ui/TextPlane';

/**
 * **Die Werkzeugleiste am Modell** — eine Tafel mit Tasten, die neben der
 * Miniatur schwebt und mit ihr mitgeht.
 *
 * Sie ist absichtlich **kein** Handgelenk-Menü. Das Menü ist die richtige
 * Antwort auf „stell etwas ein und mach es wieder zu"; ein Editor ist das
 * Gegenteil davon — man wechselt zwischen Boden und Wand zwanzigmal in einer
 * Minute, und dreimal Menü aufklappen je Wechsel ist die Sorte Bedienung, nach
 * der man aufhört zu bauen. Also hängt jedes Werkzeug an einem Knopf, den man
 * sieht, und der Knopf, der gerade gilt, leuchtet.
 *
 * Gebaut wie die Wandkonsole des Navigationslabors (`navlab/NavConsole.ts`) und
 * aus demselben Grund: Jede Taste trägt die Farbe dessen, was sie schaltet, und
 * was an ist, steht ein Stück tiefer und leuchtet. Ohne diese Rückmeldung
 * drückt man in der Brille zweimal — einmal, und dann noch einmal, weil man
 * nicht sieht, ob das erste angekommen ist.
 */

/** Eine Taste: was sie schaltet, wie sie heißt, in welcher Farbe. */
export interface PanelKey {
  id: string;
  label: string;
  color: number;
}

const PAD_W = 0.19;
const PAD_H = 0.075;
const GAP_X = 0.025;
const GAP_Y = 0.055;
const TITLE_H = 0.05;

interface Pad {
  id: string;
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
}

export class EditorPanel extends THREE.Group {
  private readonly pads: Pad[] = [];

  constructor(title: string, rows: readonly (readonly PanelKey[])[], accent = 0x9ad9ff) {
    super();
    this.name = 'editor-panel';

    const widest = Math.max(1, ...rows.map((row) => row.length));
    const width = widest * PAD_W + (widest + 1) * GAP_X;
    const height = TITLE_H + 0.06 + rows.length * (PAD_H + GAP_Y);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x161c28, roughness: 0.85 }),
    );
    this.add(back);

    const heading = new TextPlane({
      width: width - 0.04,
      height: TITLE_H,
      title,
      align: 'center',
      accent,
    });
    heading.position.set(0, height / 2 - TITLE_H / 2 - 0.012, 0.013);
    this.add(heading);

    rows.forEach((row, rowIndex) => {
      const span = row.length * PAD_W + (row.length - 1) * GAP_X;
      row.forEach((key, index) => {
        const x = -span / 2 + PAD_W / 2 + index * (PAD_W + GAP_X);
        const y = height / 2 - TITLE_H - 0.05 - rowIndex * (PAD_H + GAP_Y) - PAD_H / 2;

        const pad = new THREE.Mesh(
          new THREE.BoxGeometry(PAD_W, PAD_H, 0.018),
          new THREE.MeshStandardMaterial({
            color: key.color,
            roughness: 0.4,
            emissive: new THREE.Color(key.color),
            emissiveIntensity: 0,
          }),
        );
        pad.position.set(x, y, 0.02);
        pad.name = `editor-pad:${key.id}`;
        this.add(pad);
        this.pads.push({ id: key.id, mesh: pad });

        const label = new TextPlane({
          width: PAD_W + 0.02,
          height: 0.035,
          title: key.label,
          align: 'center',
          accent: key.color,
        });
        label.position.set(x, y - PAD_H / 2 - 0.024, 0.013);
        this.add(label);
      });
    });
  }

  /** Die Tasten, so wie der Zeiger sie braucht. */
  keys(): readonly { id: string; mesh: THREE.Object3D }[] {
    return this.pads.map((pad) => ({ id: pad.id, mesh: pad.mesh }));
  }

  /**
   * Zieht die Tasten am Zustand nach: Was gilt, leuchtet und steht tiefer.
   *
   * Zwei Rückmeldungen für dasselbe, und beide braucht es: Das Leuchten sieht
   * man aus dem Augenwinkel, den Tiefstand auch dann noch, wenn die Tafel
   * gerade von der Seite steht.
   */
  setActive(ids: ReadonlySet<string>): void {
    for (const pad of this.pads) {
      const on = ids.has(pad.id);
      pad.mesh.material.emissiveIntensity = on ? 0.85 : 0;
      pad.mesh.position.z = on ? 0.014 : 0.02;
    }
  }
}
