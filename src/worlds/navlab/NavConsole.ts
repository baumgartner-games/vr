import * as THREE from 'three';
import { TextPlane } from '../../ui/TextPlane';
import { NAV_LAYERS, anyLayer, type NavLayer, type NavLayerState } from '../nav/navLayers';

/**
 * **Die Konsole an der Wand** — eine Taste je Ebene und eine für alle, mit
 * denen man die Navigation sichtbar macht, ohne ins Handgelenk-Menü zu gehen.
 *
 * Das Menü kann dasselbe, und trotzdem ist die Konsole nicht doppelt gemoppelt:
 * Wer im Labor steht und wissen will, warum ein Zombie stehen bleibt, hat die
 * Hände voll und den Blick auf dem Zombie. Ein Knopf an der Wand ist einen
 * Griff entfernt; ein Menü sind drei.
 *
 * **Jede Taste trägt die Farbe ihrer Ebene** (`nav/navLayers.ts`) — dieselbe,
 * in der die Linien danach im Raum liegen. Damit muss niemand die Beschriftung
 * lesen, um die Zuordnung zu finden: Man drückt Violett und sieht Violett.
 *
 * Die erste Taste ist der große Griff: alles an, wenn nichts an ist, sonst
 * alles aus.
 */

/** Was eine Taste schaltet: eine Ebene, oder alle auf einmal. */
export type ConsoleKey = NavLayer | 'all';

interface Pad {
  key: ConsoleKey;
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  color: number;
}

const PLATE_W = 2.4;
/**
 * Wie hoch die Platte ist — **eine Reihe je drei Tasten**, und es sind acht.
 *
 * Die Zahl hängt an `NAV_LAYERS`: Wer dort eine Ebene hinzufügt, bekommt eine
 * vierte Reihe, sobald es zehn Tasten sind. Sie steht deshalb als Rechnung da
 * und nicht als gemessene 1,8 — eine Taste, die unten aus der Platte
 * herausragt, sieht in der Brille aus wie ein Fehler und ist einer.
 */
const PLATE_H = 0.42 + Math.ceil((NAV_LAYERS.length + 1) / 3) * 0.46;
const PAD_W = 0.66;
const PAD_H = 0.3;
const COLS = 3;

export class NavConsole extends THREE.Group {
  private readonly pads: Pad[] = [];

  constructor() {
    super();
    this.name = 'nav-console';

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(PLATE_W, PLATE_H, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x1d2434, roughness: 0.8 }),
    );
    this.add(back);

    const title = new TextPlane({
      width: PLATE_W - 0.2,
      height: 0.22,
      title: 'NAVIGATION ZEIGEN',
      align: 'center',
      accent: 0x39d0ff,
    });
    title.position.set(0, PLATE_H / 2 - 0.18, 0.05);
    this.add(title);

    const keys: { key: ConsoleKey; label: string; color: number }[] = [
      { key: 'all', label: 'Alles', color: 0xffc857 },
      ...NAV_LAYERS.map((layer) => ({
        key: layer.id as ConsoleKey,
        label: layer.label,
        color: layer.color,
      })),
    ];

    keys.forEach((entry, index) => {
      const column = index % COLS;
      const row = Math.floor(index / COLS);
      const x = (column - (COLS - 1) / 2) * (PAD_W + 0.08);
      const y = PLATE_H / 2 - 0.52 - row * 0.46;

      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(PAD_W, PAD_H, 0.07),
        new THREE.MeshStandardMaterial({
          color: entry.color,
          roughness: 0.4,
          emissive: new THREE.Color(entry.color),
          emissiveIntensity: 0,
        }),
      );
      pad.position.set(x, y, 0.06);
      pad.name = `nav-pad:${entry.key}`;
      this.add(pad);
      this.pads.push({ key: entry.key, mesh: pad, color: entry.color });

      const label = new TextPlane({
        width: PAD_W + 0.06,
        height: 0.15,
        title: entry.label,
        align: 'center',
        accent: entry.color,
      });
      label.position.set(x, y - PAD_H / 2 - 0.1, 0.05);
      this.add(label);
    });
  }

  /** Die Tasten, so wie der Zeiger sie braucht. */
  keys(): readonly { key: ConsoleKey; mesh: THREE.Object3D }[] {
    return this.pads.map((pad) => ({ key: pad.key, mesh: pad.mesh }));
  }

  /**
   * Zieht die Tasten am Zustand nach: Was an ist, leuchtet.
   *
   * Ohne diese Rückmeldung drückt man in der Brille zweimal — einmal, und dann
   * noch einmal, weil man nicht sieht, ob das erste angekommen ist.
   */
  refresh(state: Readonly<NavLayerState>): void {
    for (const pad of this.pads) {
      const on = pad.key === 'all' ? anyLayer(state) : state[pad.key];
      pad.mesh.material.emissiveIntensity = on ? 0.85 : 0;
      pad.mesh.position.z = on ? 0.045 : 0.06;
    }
  }
}
