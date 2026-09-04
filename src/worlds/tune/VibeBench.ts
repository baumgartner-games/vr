import * as THREE from 'three';
import { GRAB_GLOW, GRAB_TINT } from '../../core/colors';

/** Wie nah eine Hand an den Griff muss, damit sie ihn halten kann. */
export const KNOB_REACH = 0.2;

const _local = new THREE.Vector3();

/**
 * Eine Bank mit einem Griff darauf, und der Griff bewegt sich nicht.
 *
 * Das ist Absicht und der ganze Witz. Vibration ist die einzige Rückmeldung
 * des Spiels, die man **nicht sehen** kann — man kann sie nur fühlen, und
 * fühlen kann man sie nur, wenn die Hand ruhig an etwas Festem liegt. Ein
 * Gegenstand, den man greift und der dann mitkommt, prüft die Physik; hier
 * geht es aber darum, ob „mittel" und „stark" sich wirklich unterscheiden und
 * ob eine Salve als Salve ankommt. Also: anfassen ja, mitnehmen nein.
 *
 * Der Griff trägt die Greiffarbe aus `core/colors.ts` und leuchtet auf, sobald
 * eine Hand nah genug ist — dieselbe Sprache wie überall sonst, damit niemand
 * raten muss, wo man zufassen darf. Welches Muster dann läuft, sagt
 * `haptics.ts`; diese Datei ist nur das Möbelstück.
 */
export class VibeBench extends THREE.Group {
  /** Das Einzige hier, das eine Hand anfassen darf. */
  readonly knob: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;

  private readonly owned: THREE.Material[] = [];
  private held = false;

  constructor(height = 0.95) {
    super();
    this.name = 'vibe-bench';

    const wood = this.own(
      new THREE.MeshStandardMaterial({ color: 0x4c4457, roughness: 0.8, metalness: 0.05 }),
    );
    const steel = this.own(
      new THREE.MeshStandardMaterial({ color: 0x59617a, roughness: 0.4, metalness: 0.6 }),
    );

    const top = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.45), wood);
    top.position.y = height;
    this.add(top);

    for (const sx of [-1, 1] as const) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, height, 0.06), steel);
      leg.position.set(sx * 0.32, height / 2, 0);
      this.add(leg);
    }

    // Ein Pilz auf einem Sockel: hoch genug, dass die Faust nicht auf der
    // Platte aufsetzt, und dick genug, dass man ihn ganz umschließt.
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.14, 16), steel);
    post.position.set(0, height + 0.095, 0);
    this.add(post);

    this.knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.05, 0.07, 20),
      this.own(
        new THREE.MeshStandardMaterial({
          color: GRAB_TINT,
          roughness: 0.55,
          emissive: new THREE.Color(GRAB_TINT).multiplyScalar(0.3),
        }),
      ),
    );
    this.knob.position.set(0, height + 0.2, 0);
    this.add(this.knob);
  }

  /** Der Griff leuchtet, solange eine Hand ihn hat oder erreichen könnte. */
  setKnobGlow(active: boolean): void {
    if (active === this.held) return;
    this.held = active;
    this.knob.material.color.setHex(active ? GRAB_GLOW : GRAB_TINT);
    this.knob.material.emissive
      .setHex(active ? GRAB_GLOW : GRAB_TINT)
      .multiplyScalar(active ? 0.5 : 0.3);
  }

  /** Wie weit ein Punkt vom Griff weg ist, in Metern. */
  knobDistance(worldPoint: THREE.Vector3): number {
    this.knob.updateWorldMatrix(true, false);
    return this.knob.getWorldPosition(_local).distanceTo(worldPoint);
  }

  dispose(): void {
    this.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose();
    });
    for (const material of this.owned) material.dispose();
    this.removeFromParent();
  }

  private own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }
}
