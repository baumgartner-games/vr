import * as THREE from 'three';
import { isHighlight } from '../../core/highlight';
import { isOutline } from '../../core/outlineShell';

/**
 * **Durchsichtig wie eine Wand — für das, was man selbst hingestellt hat.**
 *
 * Das Wand-Ghosting (`wallGhost.ts`, `GridWorld.stepWallGhosts`) kannte bis
 * hierher nur die Quader aus dem Grundriss. Eine Wand aus dem Regal ist aber
 * kein Quader, sondern ein Modell (`portal/props.ModelKind`) — und blieb von
 * oben stehen, während die gebaute daneben durchsichtig wurde. Gemeldet: „platzierte
 * Wände verhalten sich nicht wie die anderen Wände und werden durchsichtig."
 *
 * **Die Auswahl ist dieselbe**: Ein hingestelltes Modell kommt mit seinem
 * Kasten in dieselbe Rechnung wie jede Wand (`wallsHiding`), und was die sagt,
 * gilt für beide. Hier steht nur, wie ein Modell durchsichtig **wird** — und
 * das geht anders als bei einem Quader, weil ein Modell viele Netze mit
 * eigenen Materialien hat und keine Sorte, deren zweite Palette man nehmen
 * könnte (`GridWorld.ghostFor`).
 *
 * Also bekommt jedes Material einen **durchsichtigen Zwilling**, einmal
 * gebaut und danach geteilt; getauscht wird am Netz und nicht am Material.
 * `transparent` am Material selbst umzulegen, machte jedes Fass derselben
 * Datei durchsichtig, und three.js baute den Shader dabei jedes Mal neu —
 * derselbe Grund wie bei der zweiten Palette der Quader.
 */
export class ModelGhosts {
  /** Was gerade durchsichtig ist — und wie es vorher aussah. */
  private readonly faded = new Map<THREE.Object3D, Faded[]>();
  /** Die Zwillinge, je Original einer. */
  private readonly twins = new Map<THREE.Material, THREE.Material>();

  /** @param opacity Wie viel von der Deckkraft übrig bleibt — wie bei den Wänden. */
  constructor(private readonly opacity: number) {}

  /** Wie viele Modelle gerade durchsichtig sind — für Tests und Anzeigen. */
  get count(): number {
    return this.faded.size;
  }

  /**
   * **Genau diese Modelle sind jetzt durchsichtig**, alle anderen wieder
   * nicht. Getauscht wird nur, was sich geändert hat — jedes Bild alle
   * Materialien neu zuzuweisen wäre für three.js jedes Bild ein neuer Zustand.
   */
  apply(objects: Iterable<THREE.Object3D>): void {
    const want = new Set(objects);
    for (const [object, saved] of this.faded) {
      if (want.has(object)) continue;
      restore(saved);
      this.faded.delete(object);
    }
    for (const object of want) {
      if (!this.faded.has(object)) this.faded.set(object, this.fade(object));
    }
  }

  /** Alles zurück auf sein eigenes Material. */
  clear(): void {
    this.apply([]);
  }

  /** Zurück, und die Zwillinge weg — beim Verlassen der Welt. */
  dispose(): void {
    this.clear();
    for (const twin of this.twins.values()) twin.dispose();
    this.twins.clear();
  }

  private fade(root: THREE.Object3D): Faded[] {
    const saved: Faded[] = [];
    root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      // **Der gelbe Saum bleibt**, wie er ist: Er zeigt, was man gleich nimmt,
      // und gehört dem Hervorheben (`core/highlight.ts`), nicht diesem Modell.
      if (!mesh.isMesh || isHighlight(mesh)) return;
      saved.push({ mesh, material: mesh.material, visible: mesh.visible });
      // **Der schwarze Rand des Comics geht solange weg**: Eine Wand, die
      // durchsichtig ist und ihren Umriss behält, ist ein Drahtmodell.
      if (isOutline(mesh)) {
        mesh.visible = false;
        return;
      }
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((one) => this.twin(one))
        : this.twin(mesh.material);
    });
    return saved;
  }

  private twin(material: THREE.Material): THREE.Material {
    const had = this.twins.get(material);
    if (had) return had;
    const made = material.clone();
    made.transparent = true;
    made.opacity = material.opacity * this.opacity;
    // Wie bei den Wänden: Was durchsichtig ist, schreibt nicht in den
    // Tiefenpuffer — sonst verdeckt es die Figur trotzdem, nur unsichtbar.
    made.depthWrite = false;
    this.twins.set(material, made);
    return made;
  }
}

/** Ein Netz, wie es vor dem Durchsichtigwerden war. */
interface Faded {
  mesh: THREE.Mesh;
  material: THREE.Material | THREE.Material[];
  visible: boolean;
}

function restore(saved: readonly Faded[]): void {
  for (const one of saved) {
    one.mesh.material = one.material;
    one.mesh.visible = one.visible;
  }
}
