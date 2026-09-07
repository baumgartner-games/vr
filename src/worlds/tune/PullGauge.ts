import * as THREE from 'three';
import type { ControllerState } from '../../core/XRInput';

/**
 * **Wie weit gezogen?** — die beiden analogen Eingaben eines Controllers als
 * Balken.
 *
 * Trigger und Griff sind die einzigen Eingaben an einem Quest-Controller, die
 * *nicht* nur an oder aus sind: Das Gamepad meldet für beide einen Wert
 * zwischen 0 und 1 (`XRInput`, `buttons[0].value` und `buttons[1].value`), und
 * WebXR sagt getrennt davon, ab wann die Laufzeitumgebung das ein „Drücken"
 * nennt. Genau diese zwei Auskünfte gingen im Eingaberaum bisher verloren: Ein
 * Leuchtpunkt kennt nur zwei Zustände, und ein halb gezogener Trigger sah aus
 * wie ein gar nicht gezogener — bis er umsprang.
 *
 * Hier stehen beide nebeneinander: Der **Balken** ist der analoge Wert und
 * läuft in jedem Bild mit, der **Farbumschlag** ist der Moment, in dem die
 * Laufzeitumgebung „gedrückt" sagt. Wer wissen will, ob sein Trigger wirklich
 * bis zum Anschlag geht oder ob der Auslösepunkt zu früh liegt, sieht hier
 * beides gleichzeitig — und die **Marken bei der Hälfte und ganz oben** machen
 * aus „ziemlich weit" ein Maß.
 *
 * Die Balken hängen an der Tafelwand und nicht am Modell, und das ist Absicht:
 * Das Modell dreht sich mit der Hand mit (`InputModel`), eine Füllstandsanzeige
 * darauf stünde die halbe Zeit auf dem Kopf.
 */

/** Wie hoch die Skala ist, in Metern. */
const SCALE = 0.19;
/** Wie breit ein Balken ist. */
const BAR = 0.05;
/** Wie weit die beiden auseinanderstehen. */
const SPREAD = 0.045;

/** Links der Trigger, rechts der Griff — dieselbe Reihenfolge wie auf der Tafel. */
const INPUTS = ['trigger', 'squeeze'] as const;

export class PullGauge extends THREE.Group {
  private readonly bars: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];
  private readonly owned: THREE.Material[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];

  constructor(readonly side: 'left' | 'right') {
    super();
    this.name = `pull-gauge-${side}`;

    const plate = this.own(
      new THREE.MeshStandardMaterial({ color: 0x101724, roughness: 0.8, metalness: 0.05 }),
    );
    this.add(this.box([BAR * 2 + SPREAD * 2 + 0.04, SCALE + 0.05, 0.012], [0, 0, -0.008], plate));

    const track = this.own(new THREE.MeshStandardMaterial({ color: 0x24304a, roughness: 0.6 }));
    const tick = this.own(new THREE.MeshBasicMaterial({ color: 0x6f7d99, toneMapped: false }));

    INPUTS.forEach((_input, index) => {
      const x = (index === 0 ? -1 : 1) * SPREAD;
      this.add(this.box([BAR, SCALE, 0.008], [x, 0, 0], track));

      const material = this.own(
        new THREE.MeshStandardMaterial({ color: 0x24304a, roughness: 0.5, emissive: 0x4aa8ff }),
      );
      // Der Balken wächst von unten: die Geometrie ist eine ganze Skala hoch,
      // und `scale.y` schneidet sie ab. Ein Balken, der von der Mitte aus
      // wüchse, wäre eine Waage und keine Anzeige.
      const bar = this.box([BAR - 0.012, SCALE, 0.006], [x, 0, 0.006], material);
      this.add(bar);
      this.bars.push(bar);
    });

    // Die Hälfte und der Anschlag. Ohne sie ist ein Balken „ziemlich weit
    // oben"; mit ihnen ist er halb oder ganz.
    for (const fraction of [0.5, 1]) {
      const y = -SCALE / 2 + SCALE * fraction;
      this.add(this.box([BAR * 2 + SPREAD * 2 + 0.02, 0.003, 0.004], [0, y, 0.014], tick));
    }
  }

  /**
   * Setzt beide Balken auf das, was gerade anliegt.
   *
   * Eine getrackte Hand hat kein Gamepad und damit keinen analogen Wert — dort
   * steht die Anzeige still und tritt hinter die Fingerbalken zurück
   * (`InputModel`).
   */
  show(state: ControllerState | null): void {
    this.visible = !!state?.tracked && !state.isHand;
    if (!this.visible || !state) return;
    INPUTS.forEach((input, index) => {
      const button = state[input];
      // **Ohne Gamepad bleibt nur die Taste.** Manche Geräte melden über
      // WebXR ein `select`, aber keinen Achsenwert; dann steht der Balken auf
      // ganz oder ganz unten, und das ist immer noch die Wahrheit.
      const value = button.value || (button.pressed ? 1 : 0);
      const filled = Math.min(1, Math.max(0, value));
      const bar = this.bars[index]!;
      bar.scale.y = Math.max(filled, 0.004);
      bar.position.y = -SCALE / 2 + (bar.scale.y * SCALE) / 2;
      bar.material.emissive.setHex(button.pressed ? 0x5ee0a0 : 0x4aa8ff);
      bar.material.emissiveIntensity = 0.3 + filled * 1.3;
    });
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    this.geometries.length = 0;
    for (const material of this.owned) material.dispose();
    this.owned.length = 0;
    this.removeFromParent();
  }

  private own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }

  private box<T extends THREE.Material>(
    size: readonly [number, number, number],
    at: readonly [number, number, number],
    material: T,
  ): THREE.Mesh<THREE.BoxGeometry, T> {
    const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
    this.geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(at[0], at[1], at[2]);
    return mesh;
  }
}
