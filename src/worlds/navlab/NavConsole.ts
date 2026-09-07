import * as THREE from 'three';
import { TextPlane } from '../../ui/TextPlane';
import { anyLayer, type NavLayer, type NavLayerState } from '../nav/navLayers';
import type { NavSwitchState } from '../nav/navSwitches';
import {
  LABEL_H,
  PAD_H,
  PAD_W,
  PLATE_H,
  PLATE_W,
  consolePads,
  consoleTitles,
  labelY,
  switchOf,
  type ConsoleKey,
} from './consoleLayout';

/**
 * **Die Konsole an der Wand** — zwei Blöcke, und der Abstand dazwischen ist die
 * halbe Erklärung.
 *
 * Oben **zeigen** (`nav/navLayers.ts`): eine Taste je Ebene und eine für alle.
 * Unten **schalten** (`nav/navSwitches.ts`): Fläche, Hindernisse,
 * Verbindungen. Der Unterschied ist der zwischen „ich sehe die Kiste" und „die
 * Kiste zählt" — wer beides in eine Reihe legte, hätte eine Konsole, auf der
 * „Verbindungen" zweimal steht und zweierlei meint.
 *
 * Das Menü kann dasselbe, und trotzdem ist die Konsole nicht doppelt gemoppelt:
 * Wer im Labor steht und wissen will, warum ein Zombie stehen bleibt, hat die
 * Hände voll und den Blick auf dem Zombie. Ein Knopf an der Wand ist einen
 * Griff entfernt; ein Menü sind drei.
 *
 * **Jede Taste trägt die Farbe ihrer Ebene** — dieselbe, in der die Linien
 * danach im Raum liegen. Damit muss niemand die Beschriftung lesen, um die
 * Zuordnung zu finden: Man drückt Violett und sieht Violett.
 *
 * Die erste Taste ist der große Griff: alles an, wenn nichts an ist, sonst
 * alles aus.
 *
 * **Wo was sitzt, steht nicht hier**, sondern in `consoleLayout.ts` — dort
 * kann ein Test nachmessen, dass nichts aus der Platte hängt.
 */

export { switchOf, type ConsoleKey };

interface Pad {
  key: ConsoleKey;
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
}

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

    for (const title of consoleTitles()) {
      const plane = new TextPlane({
        width: PLATE_W - 0.2,
        height: title.height,
        title: title.text,
        align: 'center',
        accent: title.color,
      });
      plane.position.set(0, title.y, 0.05);
      this.add(plane);
    }

    for (const spot of consolePads()) {
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(PAD_W, PAD_H, 0.07),
        new THREE.MeshStandardMaterial({
          color: spot.color,
          roughness: 0.4,
          emissive: new THREE.Color(spot.color),
          emissiveIntensity: 0,
        }),
      );
      pad.position.set(spot.x, spot.y, 0.06);
      pad.name = `nav-pad:${spot.key}`;
      this.add(pad);
      this.pads.push({ key: spot.key, mesh: pad });

      const label = new TextPlane({
        width: PAD_W + 0.06,
        height: LABEL_H,
        title: spot.label,
        align: 'center',
        accent: spot.color,
      });
      label.position.set(spot.x, labelY(spot), 0.05);
      this.add(label);
    }
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
  refresh(state: Readonly<NavLayerState>, switches: Readonly<NavSwitchState>): void {
    for (const pad of this.pads) {
      const id = switchOf(pad.key);
      const on = id
        ? switches[id]
        : pad.key === 'all'
          ? anyLayer(state)
          : state[pad.key as NavLayer];
      pad.mesh.material.emissiveIntensity = on ? 0.85 : 0;
      pad.mesh.position.z = on ? 0.045 : 0.06;
    }
  }
}
