import * as THREE from 'three';
import { canLoadModels } from '../../../core/chefFit';

/**
 * **Der Hebel an der Tür** — statt der Schalttafel mit „GESPERRT"/„BEREIT".
 *
 * Gewünscht war: _„Du kannst übrigens für die Schalttafel an der Tür
 * stattdessen Wall Lever nutzen (auch Farbe rot und grün), Hebelposition
 * gedreht oder sonst das Ganze drehen, wenn umgeschaltet wurde."_ Also hängt
 * neben jeder Tür auf beiden Seiten ein Wandhebel aus dem Regal
 * (`platformer/red|green/lever_wall_base_A_*.glb`): **grün mit dem Griff
 * nach oben**, solange die Tür aufgeht, **rot mit dem Griff nach unten**,
 * solange sie gesperrt ist. Beide Farben sind geladen, gezeigt wird eine; der
 * Griff kippt beim Umschalten in einer Viertelsekunde um.
 *
 * Bedient wird er wie vorher die Tafel (`ShipExperience.bind`): Der Treffer
 * ist ein unsichtbarer Kasten um den Hebel, damit ihn Zeiger und Hand
 * finden, bevor und auch wenn das Modell nicht kommt.
 */
export const LEVER_GREEN = 'platformer/green/lever_wall_base_A_green.glb';
export const LEVER_RED = 'platformer/red/lever_wall_base_A_red.glb';

/** Wie weit der Griff gekippt wird — nach oben offen, nach unten gesperrt. */
export const LEVER_TILT = 1.0;
/** Wie schnell er umlegt, in Bogenmaß je Sekunde. */
const LEVER_SPEED = LEVER_TILT * 2 * 4;

/** Wie groß der Hebel an der Wand ist (Grundplatte), in Metern. */
export const LEVER_SIZE = { width: 0.18, height: 0.27 };

/** Eine Farbe des Hebels: das Modell, und das Gelenk mit dem Griff daneben. */
interface Colour {
  model: THREE.Object3D;
  handle: THREE.Object3D | null;
}

export class DoorLever {
  /** Hängt an der Wand, +z zeigt in den Raum. */
  readonly root = new THREE.Group();
  /** Der unsichtbare Treffer für Zeiger und Hand. */
  readonly hit: THREE.Mesh;
  private green: Colour | null = null;
  private red: Colour | null = null;
  private tilt = -LEVER_TILT;
  private gone = false;

  constructor() {
    this.root.name = 'door-lever';
    this.hit = new THREE.Mesh(
      new THREE.BoxGeometry(LEVER_SIZE.width + 0.1, LEVER_SIZE.height + 0.1, 0.3),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    this.hit.name = 'door-lever-hit';
    this.hit.position.z = 0.15;
    this.root.add(this.hit);
    if (!canLoadModels()) return;
    void import('../../../core/kaykitModel').then(async (module) => {
      const [green, red] = await Promise.all([
        module.kaykitModel(LEVER_GREEN),
        module.kaykitModel(LEVER_RED),
      ]);
      if (this.gone || !green || !red) return;
      this.green = this.mount(green);
      this.red = this.mount(red);
    });
  }

  /** Den Stand zeigen — `dt` legt den Griff um, statt ihn springen zu lassen. */
  set(locked: boolean, dt: number): void {
    const goal = locked ? LEVER_TILT : -LEVER_TILT;
    const step = Math.min(Math.abs(goal - this.tilt), LEVER_SPEED * dt);
    this.tilt += Math.sign(goal - this.tilt) * step;
    for (const [colour, shown] of [
      [this.green, !locked],
      [this.red, locked],
    ] as const) {
      if (!colour) continue;
      colour.model.visible = shown;
      if (colour.handle) {
        colour.handle.visible = shown;
        colour.handle.rotation.x = this.tilt;
      }
    }
  }

  dispose(): void {
    this.gone = true;
    this.hit.geometry.dispose();
    (this.hit.material as THREE.Material).dispose();
    this.root.removeFromParent();
  }

  /**
   * Ein Hebel des Regals an die Wand: Grundplatte auf `LEVER_SIZE`, ihre
   * Rückseite auf der Wand; der Griff (der Knoten ohne `base`) bekommt ein
   * Gelenk an der Vorderseite der Platte, um das er kippt.
   */
  private mount(model: THREE.Object3D): Colour {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3();
    let base: THREE.Object3D | null = null;
    let handle: THREE.Object3D | null = null;
    model.traverse((object) => {
      if (!(object as THREE.Mesh).isMesh) return;
      if (/base/i.test(object.name)) base = object;
      else handle = object;
    });
    box.setFromObject(base ?? model);
    const wide = box.max.x - box.min.x;
    const scale = wide > 1e-6 ? LEVER_SIZE.width / wide : 1;
    model.scale.multiplyScalar(scale);
    model.updateMatrixWorld(true);
    box.setFromObject(base ?? model);
    model.position.set(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -box.min.z);
    // Die Vorderkante der Platte, gemessen, **bevor** das Modell eingehängt
    // wird — danach wäre `setFromObject` in Weltkoordinaten.
    model.updateMatrixWorld(true);
    const front = new THREE.Box3().setFromObject(base ?? model).max.z;
    this.root.add(model);
    model.updateMatrixWorld(true);
    let pivot: THREE.Object3D | null = null;
    const grip = handle as THREE.Object3D | null;
    if (grip) {
      // Das Gelenk sitzt vorn auf der Grundplatte, in ihrer Mitte.
      pivot = new THREE.Group();
      pivot.name = 'door-lever-pivot';
      pivot.position.set(0, 0, front);
      this.root.add(pivot);
      pivot.updateMatrixWorld(true);
      pivot.attach(grip);
      // Aus der Kopie herausgelöst — und trotzdem Geometrie der Vorlage.
      grip.userData.sharedAssets = true;
    }
    // Das Gelenk hängt neben dem Modell und nicht darin — sonst kippte es mit
    // dessen Maßstab. Zu sehen ist erst einmal nichts, `set` entscheidet.
    model.visible = false;
    if (pivot) pivot.visible = false;
    return { model, handle: pivot };
  }
}
