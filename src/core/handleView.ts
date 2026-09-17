import * as THREE from 'three';
import { createAxes, disposeAxes } from './axesCross';
import { graphics, onGraphicsChange } from './graphicsSettings';
import type { GrabHandle, HoldBar, Vec3 } from './grabHandles';

/**
 * **Die unsichtbaren Griffe sichtbar machen** — ein Achsenkreuz an jeder
 * Stelle, an der eine Hand andockt.
 *
 * Ein Griff ist absichtlich nichts, was man sieht: Man nimmt die Pfanne am
 * Stiel, nicht einen Punkt am Stiel (`core/grabHandles.ts`). Nur lässt sich
 * eine Lage, die man nicht sieht, auch nicht beurteilen — „Pitch 45°" heißt
 * nichts, solange unklar ist, um welche Achse und gegen was. Also gibt es ein
 * Häkchen im Grafik-Menü (`graphicsSettings.showHandles`, ab Werk **aus**),
 * und dahinter steht diese Datei.
 *
 * **Ein Achsenkreuz und keine Kugel**, obwohl der Auftrag beides erlaubt: Eine
 * Kugel sagt, *wo* ein Griff liegt, und das ist die kleinere Hälfte der
 * Auskunft. Die größere ist, *wie herum* er liegt — die Achse, an der die
 * Faust hängt, und das Vorne, wohin der Zeigefinger zeigt. Das Kreuz gibt es
 * schon (`core/axesCross.ts`), es zeigt beides, und sein weißer Arm ist genau
 * das -Z, das ein Griff „vorne" nennt.
 *
 * **Klein**, und das ist keine Sparsamkeit: Acht Kreuze am Tellerrand in der
 * Größe eines Werkzeugkreuzes wären ein Igel. Vier Zentimeter Armlänge sind
 * eine Fingerbreite — man sieht die Richtung und noch den Teller darunter.
 *
 * **Und ohne Tiefenprüfung**, wie die Hitboxen daneben (`physics/HitboxView.ts`):
 * Ein Griff, den das Ding verdeckt, zu dem er gehört, beantwortet keine Frage
 * — der Griff unter dem Teller ist genau der Fall.
 *
 * **Und wo ein Haltezylinder dabeisteht, steht er auch da**
 * (`grabHandles.HoldBar`). Das Kreuz sagt, wie herum ein Griff liegt; der
 * Zylinder sagt, **worauf** — die Stange des Modells, an der die Hand liegt.
 * Erst mit ihm lässt sich die Frage beantworten, um die es beim Einmessen
 * geht: Deckt sich der Griff mit dem Stiel der Pfanne, mit den Ohren des
 * Topfes, mit dem Bügel des Löschers? Ein Punkt und drei Pfeile beantworten
 * sie nicht, und genau deshalb standen alle drei eine Weile falsch herum.
 *
 * Gehängt wird an das Netz selbst: Die Griffe stehen im Raum des Dings, und
 * ein Kind dieses Raums macht jede Drehung mit, ohne dass hier je Bild etwas
 * nachgerechnet würde.
 */

/** Wie lang die Arme eines Griffkreuzes sind, in Metern. */
export const HANDLE_AXES_SIZE = 0.04;

/** Der Name, unter dem ein Kreuz am Netz hängt — damit man es wiederfindet. */
export const HANDLE_VIEW_NAME = 'grab-handle-axes';

/**
 * **Die Farbe eines Haltezylinders** — grün, und zwar dasselbe Grün wie der
 * +Y-Arm des Achsenkreuzes daneben (`axesCross.AXIS_Y`): Beide beschreiben,
 * woran die Faust liegt, und zwei Farben für eine Sache wären eine Farbe zu
 * viel.
 */
export const HANDLE_BAR_COLOR = 0x5ee0a0;

/** Wie durchscheinend er ist — man soll die Stange darunter noch sehen. */
export const HANDLE_BAR_ALPHA = 0.35;

/** Aus wie vielen Seiten seine Wand besteht. Rund genug, billig genug. */
const BAR_SIDES = 16;

const _from = new THREE.Vector3();
const _to = new THREE.Vector3();

/**
 * **Die Kreuze eines Dings** — angelegt, abgeräumt und auf Zuruf ein- und
 * ausgeblendet.
 *
 * Eine Instanz je Welt reicht: Sie merkt sich, was sie gehängt hat, hört am
 * Grafik-Menü zu (`onGraphicsChange`) und schaltet alles auf einmal um. Wer
 * ein Netz wegwirft, sagt es mit `forget`, sonst räumt `dispose` am Ende auf.
 */
export class HandleView {
  private readonly shown = new Map<THREE.Object3D, THREE.Group>();
  private readonly stop: () => void;

  constructor() {
    this.stop = onGraphicsChange(() => this.refresh());
  }

  /** Ob die Kreuze gerade gezeigt werden sollen. */
  static get on(): boolean {
    return graphics().showHandles;
  }

  /**
   * **Die Griffe dieses Netzes anzeigen** — ein Kreuz je Stelle, als Kind des
   * Netzes.
   *
   * Angelegt wird immer, sichtbar geschaltet nur, wenn das Häkchen sitzt: Ein
   * Kreuz, das erst beim Umschalten entsteht, entstünde in dem Augenblick für
   * jedes Ding der Küche auf einmal, und das sieht man.
   */
  attach(object: THREE.Object3D, handles: readonly GrabHandle[]): void {
    this.forget(object);
    if (handles.length === 0) return;
    const group = new THREE.Group();
    group.name = HANDLE_VIEW_NAME;
    group.visible = HandleView.on;
    for (const spot of handles) {
      const cross = createAxes(HANDLE_AXES_SIZE);
      cross.name = `${HANDLE_VIEW_NAME}-${spot.id}`;
      cross.position.set(spot.pose.position.x, spot.pose.position.y, spot.pose.position.z);
      cross.quaternion.set(
        spot.pose.rotation.x,
        spot.pose.rotation.y,
        spot.pose.rotation.z,
        spot.pose.rotation.w,
      );
      // Über allem, wie die Hitboxen: Ein Griff unter dem Teller ist sonst nie
      // zu sehen — und er ist einer der beiden, um die es beim Teller geht.
      cross.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        const material = mesh.material as THREE.Material;
        material.depthTest = false;
        material.transparent = true;
        mesh.renderOrder = 999;
      });
      group.add(cross);
      const bar = spot.hold ? this.barMesh(spot.id, spot.hold, spot.pose.position) : null;
      if (bar) group.add(bar);
    }
    object.add(group);
    this.shown.set(object, group);
  }

  /**
   * **Ein Haltezylinder als Netz** — die Stange, um den Griff herum gelegt.
   *
   * Sie steht in der Mitte des Griffs und zeigt in ihre eigene Richtung, und
   * das ist ausdrücklich **nicht** die Achse der Faust: Ein Pfannenstiel liegt
   * waagerecht in einer senkrechten Faust (`grabHandles.HoldBar`). Gedreht wird
   * deshalb aus der +Y-Achse des Zylinders in `bar.along` und nicht aus der
   * Drehung des Griffs.
   *
   * Offen an den Enden (`openEnded`), durchscheinend und ohne Tiefenprüfung:
   * Gesucht wird die Stange **darin**, nicht der Zylinder davor.
   */
  private barMesh(id: string, bar: HoldBar, at: Vec3): THREE.Object3D | null {
    if (!(bar.length > 0) || !(bar.radius > 0)) return null;
    const shape = new THREE.CylinderGeometry(
      bar.radius,
      bar.radius,
      bar.length,
      BAR_SIDES,
      1,
      true,
    );
    const skin = new THREE.MeshBasicMaterial({
      color: HANDLE_BAR_COLOR,
      transparent: true,
      opacity: HANDLE_BAR_ALPHA,
      side: THREE.DoubleSide,
      depthTest: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(shape, skin);
    mesh.name = `${HANDLE_VIEW_NAME}-${id}-bar`;
    mesh.renderOrder = 999;
    mesh.position.set(at.x, at.y, at.z);
    _from.set(0, 1, 0);
    _to.set(bar.along.x, bar.along.y, bar.along.z);
    if (_to.lengthSq() > 1e-12) mesh.quaternion.setFromUnitVectors(_from, _to.normalize());
    return mesh;
  }

  /** Die Kreuze dieses Netzes wieder abnehmen und freigeben. */
  forget(object: THREE.Object3D): void {
    const group = this.shown.get(object);
    if (!group) return;
    this.shown.delete(object);
    for (const child of [...group.children]) {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        mesh.removeFromParent();
        continue;
      }
      disposeAxes(child);
    }
    group.removeFromParent();
  }

  /** Alles auf den Stand des Häkchens bringen. */
  refresh(): void {
    const on = HandleView.on;
    for (const group of this.shown.values()) group.visible = on;
  }

  dispose(): void {
    this.stop();
    for (const object of [...this.shown.keys()]) this.forget(object);
  }
}
