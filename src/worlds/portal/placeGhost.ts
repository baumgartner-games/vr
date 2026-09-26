/**
 * **Der Geist des Getragenen** — eine durchscheinende Kopie genau dort, wo das
 * Stück beim Hinstellen landet: grün, wenn es dort Platz hat, rot, wenn
 * nicht (`decorPlace.restOn`, `mountBlocked`).
 *
 * Das Gitter am Boden (`placeGrid.ts`) sagt, **welche Kacheln**; der Geist
 * sagt **wie**: auf dem Tisch statt darunter, flach an der Wand statt davor,
 * und in welcher Drehung. Beides zusammen beantwortet die Frage, die das
 * hängende Stück am Haken nicht beantwortet — von oben hängt es eine
 * Körperlänge über dem Boden, und aus der Aufsicht liegt seine Landestelle
 * perspektivisch woanders.
 *
 * Die Kopie teilt sich Geometrie mit dem Original (`Object3D.clone` kopiert
 * keine Puffer) und bekommt zwei geteilte Materialien. Freigegeben werden
 * deshalb nur die Materialien, nie die Geometrie — die gehört dem Modell.
 */
import * as THREE from 'three';

const OK_COLOR = 0x4fe08a;
const BAD_COLOR = 0xff4d4d;
const OPACITY = 0.45;

export class PlaceGhost {
  readonly root = new THREE.Group();
  private source: THREE.Object3D | null = null;
  private copy: THREE.Object3D | null = null;
  private valid: boolean | null = null;
  private readonly ok = ghostMaterial(OK_COLOR);
  private readonly bad = ghostMaterial(BAD_COLOR);

  constructor() {
    this.root.name = 'place-ghost';
    this.root.visible = false;
    // Der Geist ist eine Anzeige: kein Schatten, kein Strahl, kein Saum.
    this.root.renderOrder = 2;
  }

  /**
   * Den Geist von `source` an diese Stelle setzen.
   *
   * @param yaw Drehung um die Hochachse, in Bogenmaß
   */
  show(source: THREE.Object3D, x: number, y: number, z: number, yaw: number, valid: boolean): void {
    if (source !== this.source) this.rebuild(source);
    if (valid !== this.valid) {
      this.valid = valid;
      const skin = valid ? this.ok : this.bad;
      this.copy?.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.isMesh) mesh.material = skin;
      });
    }
    this.root.position.set(x, y, z);
    this.root.rotation.set(0, yaw, 0);
    this.root.visible = true;
  }

  hide(): void {
    this.root.visible = false;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.ok.dispose();
    this.bad.dispose();
    this.copy = null;
    this.source = null;
  }

  private rebuild(source: THREE.Object3D): void {
    if (this.copy) this.root.remove(this.copy);
    this.source = source;
    this.valid = null;
    const copy = source.clone(true);
    copy.position.set(0, 0, 0);
    copy.quaternion.identity();
    // Was am Original sonst noch hängt — Saum, Umriss, Hilfslinien —, bleibt
    // weg: Gemeint ist nur das Modell selbst.
    const drop: THREE.Object3D[] = [];
    copy.traverse((object) => {
      object.castShadow = false;
      object.receiveShadow = false;
      object.raycast = () => {};
      object.renderOrder = 10;
      if (
        object !== copy &&
        !(object as THREE.Mesh).isMesh &&
        object.type !== 'Group' &&
        object.type !== 'Object3D'
      )
        drop.push(object);
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && mesh.name.startsWith('outline')) drop.push(mesh);
    });
    for (const object of drop) object.removeFromParent();
    this.copy = copy;
    this.root.add(copy);
  }
}

function ghostMaterial(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: OPACITY,
    depthWrite: false,
    // **Über allem**: Von oben hängt das Getragene genau über seiner
    // Landestelle und deckte den Geist sonst zu — dieselbe Überlegung wie beim
    // Rahmen des Gitters (`placeGrid.ts`).
    depthTest: false,
  });
}
