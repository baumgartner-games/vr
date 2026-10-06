import * as THREE from 'three';
import { isHighlight } from './highlight';
import { isOutline } from './outlineShell';
import { PLAYER_CAPSULE_RADIUS } from '../physics/playerClearance';
import { LAYER_SELF_ONLY } from './PlayerAvatar';

/**
 * **Von oben ist die Figur nie verdeckt — was davorsteht, wird durchsichtig.**
 *
 * Gewünscht (Oktober 2026), als allgemeine Regel, die immer gilt: _„Im von
 * oben Modus sollte der Spieler nie verdeckt sein, dann sollten die Dinge die
 * ihn verdecken ghost gemacht werden."_ Gemeldet an einem Baum, unter dessen
 * Krone die Figur verschwand.
 *
 * Das Wand-Ghosting der Gitterwelten (`grid/GridWorld.stepWallGhosts`) kennt
 * nur Quader aus dem Grundriss und hingestellte Modelle, und es gibt es nur
 * dort. Diese Regel steht deshalb **in der Kamera** (`TopDownCamera.cut`) und
 * gilt in jeder Welt, für alles, was gezeichnet wird: Baumkronen, Möbel,
 * Spielelemente, Deko, Dächer ohne Ebenenmarke.
 *
 * **Gemessen wird am Zylinder, nicht am Körper.** Jede Figur hat dieselbe
 * Grundfläche — den Kreis der Spielerkapsel (`PLAYER_CAPSULE_RADIUS`) — und
 * für die Verdeckung ist sie ein Zylinder darüber (`FIGURE_HEIGHT`).
 * Schultern, Arme und Hände sind Hitboxen fürs Treffen und zählen hier nicht:
 * Bis Oktober 2026 gingen zwei Strahlen von den Schultern aus, und wer neben
 * einer Seitenwand stand, machte sie damit durchsichtig. Gewünscht: _„Jeder
 * Charakter hat doch eh die gleiche Grundfläche, nur daran wird das gemessen
 * bzw. ist für die verdeckung ein Zylinder."_
 *
 * **Wie gefragt wird.** Von den Punkten des Zylinders, die die Kamera sieht
 * (`FIGURE_POINTS`: die Achse unten, in der Mitte und oben, dazu sein linker
 * und rechter Rand quer zum Blick, unten und oben), geht je ein Strahl zur
 * Kamera. Was einer davon trifft, wird für dieses eine Bild durchsichtig und danach wieder fest
 * (`restore`), genau wie das Aufschneiden (`core/cutaway.ts`). Vorher siebt
 * eine billige Probe: Nur was mit seiner Hüllkugel an die Strecke Figur–Kamera
 * heranreicht (`nearSegment`), wird überhaupt Dreieck für Dreieck befragt.
 *
 * **Durchsichtig wird das ganze Ding**, nicht nur das getroffene Netz: Eine
 * Krone aus fünf Netzen, von denen zwei weg sind, ist ein Flickenteppich.
 * Das Ding ist der höchste Vorfahr, der kaum breiter ist (`sameThing`).
 *
 * **Nicht angefasst wird:**
 *
 * - was schon durchsichtig ist — Schilder, Glas und die Wände, die das
 *   Wand-Ghosting gerade weggenommen hat;
 * - der eigene Körper (`LAYER_SELF_ONLY`) und alles am Rig;
 * - Bündel (`InstancedMesh`, `BatchedMesh`): Durchsichtig würden dann alle
 *   Stücke darin, nicht nur das eine im Weg;
 * - Figuren mit Skelett — ein Strahl durch eine gehäutete Figur rechnet
 *   jeden Knochen, und eine andere Figur verdeckt nur kurz;
 * - was keine Strahlen annimmt (`raycast` leer): Das ist der Weg, ein Ding
 *   absichtlich fest zu lassen, etwa die Deckel über Räumen, die die Figur
 *   nicht sehen soll (`haunting/world3d/topDownFog.ts`).
 */

/**
 * **Die Marke für „bleibt fest"** (`userData`) — gesetzt am Möbel, auf dem die
 * Figur sitzt (`PortalWorld.sitOn`). Gemeldet: _„Das sofa sollte nicht
 * durchsichtig werden."_ Alles darunter wird nie durchsichtig.
 */
export const KEEP_SOLID = 'bgvrKeepSolid';

/** Wie viel Deckkraft übrig bleibt — wie bei den Wänden (`GridWorld`). */
export const OCCLUDER_OPACITY = 0.25;

/** Wie hoch der Zylinder der Figur ist, in Metern — die stehende Spielerkapsel. */
export const FIGURE_HEIGHT = 1.7;

/** Wie weit unten der Zylinder anfängt — knapp über dem Boden, der nie verdeckt. */
const FIGURE_BASE = 0.15;

/**
 * **Der Rand des Zylinders, ein Hauch nach innen**: Eine Wand, an der die
 * Kapsel anliegt, berührt den Rand genau — und ein Strahl, der an ihr
 * entlangstreift, soll sie nicht treffen.
 */
const FIGURE_EDGE = PLAYER_CAPSULE_RADIUS - 0.03;

/**
 * **Die Punkte des Zylinders, von denen aus gefragt wird** — Höhe über den
 * Füßen und Versatz quer zur Blickrichtung, in Metern.
 */
export const FIGURE_POINTS: readonly { up: number; side: number }[] = [
  { up: FIGURE_BASE, side: 0 },
  { up: FIGURE_HEIGHT / 2, side: 0 },
  { up: FIGURE_HEIGHT, side: 0 },
  { up: FIGURE_BASE, side: -FIGURE_EDGE },
  { up: FIGURE_BASE, side: FIGURE_EDGE },
  { up: FIGURE_HEIGHT, side: -FIGURE_EDGE },
  { up: FIGURE_HEIGHT, side: FIGURE_EDGE },
];

/**
 * **Was näher an der Figur liegt, zählt nicht**, in Metern entlang des
 * Strahls: Das ist, was sie in der Hand hat — und was man trägt, soll man
 * sehen.
 */
export const OCCLUDER_NEAR = 0.3;

/**
 * **Wie weit die Strecke Figur–Kamera für die Vorprobe aufgedickt wird**, in
 * Metern: so weit, dass jeder Strahl des Zylinders darin liegt.
 */
export const SEGMENT_SLACK = Math.hypot(FIGURE_HEIGHT / 2, PLAYER_CAPSULE_RADIUS) + 0.05;

/**
 * **Bis wohin ein Vorfahr noch dasselbe Ding ist** (`thingOf`): höchstens
 * `THING_SPAN` breit, und kaum breiter als das getroffene Netz selbst
 * (`THING_GROWTH` mal so breit plus `THING_SLACK`). Die Krone und der Stamm
 * eines Baums sind ein Ding; der Stuhl und die kleine Welt, in der er steht,
 * sind es nicht.
 */
export const THING_SPAN = 8;
export const THING_GROWTH = 1.5;
export const THING_SLACK = 1;

/** Ob ein Vorfahr der Breite `span` noch zum Netz der Breite `base` gehört. */
export function sameThing(base: number, span: number): boolean {
  return span <= Math.min(THING_SPAN, base * THING_GROWTH + THING_SLACK);
}

/**
 * **Reicht eine Kugel an die Strecke von `a` nach `b` heran?** Abstand der
 * Mitte zur Strecke, verglichen mit dem Radius plus `slack`.
 */
export function nearSegment(
  a: THREE.Vector3,
  b: THREE.Vector3,
  centre: THREE.Vector3,
  radius: number,
  slack = SEGMENT_SLACK,
): boolean {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const length = abx * abx + aby * aby + abz * abz;
  let t =
    length > 0
      ? ((centre.x - a.x) * abx + (centre.y - a.y) * aby + (centre.z - a.z) * abz) / length
      : 0;
  t = Math.min(1, Math.max(0, t));
  const dx = a.x + abx * t - centre.x;
  const dy = a.y + aby * t - centre.y;
  const dz = a.z + abz * t - centre.z;
  const reach = radius + slack;
  return dx * dx + dy * dy + dz * dz <= reach * reach;
}

/** Ob ein Material schon durchsichtig ist — dann bleibt das Netz, wie es ist. */
function seeThrough(material: THREE.Material | THREE.Material[]): boolean {
  if (Array.isArray(material)) return material.some(seeThrough);
  return material.transparent || !material.depthWrite;
}

/** Ein Netz, wie es vor dem Durchsichtigwerden war. */
interface Saved {
  mesh: THREE.Mesh;
  material: THREE.Material | THREE.Material[];
  visible: boolean;
}

export class OccluderGhosts {
  /** Was für dieses Bild durchsichtig ist. */
  private readonly saved: Saved[] = [];
  /** Die durchsichtigen Zwillinge, je Original einer — geteilt, nie je Netz. */
  private twins = new Map<THREE.Material, THREE.Material>();
  /** Zu welchem Ding ein Netz gehört (`thingOf`), einmal gerechnet. */
  private things = new WeakMap<THREE.Object3D, THREE.Object3D>();
  private readonly candidates: THREE.Mesh[] = [];
  private readonly hits: THREE.Intersection[] = [];
  private readonly raycaster = new THREE.Raycaster();

  constructor(private readonly opacity = OCCLUDER_OPACITY) {}

  /** Wie viele Netze gerade durchsichtig sind — für Tests und Anzeigen. */
  get count(): number {
    return this.saved.length;
  }

  /**
   * **Alles durchsichtig machen, was zwischen Figur und Kamera steht** — für
   * ein Bild. Danach `restore`, ohne Bedingung.
   *
   * @param root die Szene
   * @param camera die Kamera von oben, Matrix schon gesetzt
   * @param rig die Figur — sie und alles an ihr bleibt
   * @param feet die Höhe ihrer Füße
   */
  apply(root: THREE.Object3D, camera: THREE.Camera, rig: THREE.Object3D, feet: number): void {
    const eye = camera.getWorldPosition(_eye);
    _aim.set(rig.position.x, feet + FIGURE_HEIGHT / 2, rig.position.z);
    this.candidates.length = 0;
    this.gather(root, rig, camera.layers, eye);
    if (this.candidates.length === 0) return;
    // Quer zur Blickrichtung, waagerecht: die Ränder des Zylinders.
    _side.set(eye.z - _aim.z, 0, _aim.x - eye.x);
    if (_side.lengthSq() < 1e-9) _side.set(1, 0, 0);
    _side.normalize();
    this.raycaster.layers.mask = camera.layers.mask;
    const chosen = new Set<THREE.Object3D>();
    for (const point of FIGURE_POINTS) {
      _from.set(rig.position.x, feet + point.up, rig.position.z).addScaledVector(_side, point.side);
      _dir.subVectors(eye, _from);
      const far = _dir.length();
      if (far <= OCCLUDER_NEAR) continue;
      this.raycaster.set(_from, _dir.divideScalar(far));
      this.raycaster.near = OCCLUDER_NEAR;
      this.raycaster.far = far;
      for (const mesh of this.candidates) {
        if (chosen.has(mesh)) continue;
        this.hits.length = 0;
        mesh.raycast(this.raycaster, this.hits);
        if (this.hits.length > 0) chosen.add(mesh);
      }
    }
    const done = new Set<THREE.Object3D>();
    for (const mesh of chosen) {
      const thing = this.thingOf(mesh, root);
      if (done.has(thing)) continue;
      done.add(thing);
      this.fade(thing, rig);
    }
  }

  /** **Und wieder fest**, sobald das Bild steht — genau das, was `apply` angefasst hat. */
  restore(): void {
    for (let i = this.saved.length - 1; i >= 0; i--) {
      const one = this.saved[i]!;
      one.mesh.material = one.material;
      one.mesh.visible = one.visible;
    }
    this.saved.length = 0;
  }

  /** Die Zwillinge weg — beim Wechsel der Welt, deren Materialien dann gehen. */
  forget(): void {
    this.restore();
    for (const twin of this.twins.values()) twin.dispose();
    this.twins = new Map();
    this.things = new WeakMap();
  }

  /** Die Netze, deren Hüllkugel an die Strecke Figur–Kamera reicht. */
  private gather(
    node: THREE.Object3D,
    rig: THREE.Object3D,
    layers: THREE.Layers,
    eye: THREE.Vector3,
  ): void {
    for (const child of node.children) {
      if (!child.visible || child === rig) continue;
      // **Worauf die Figur sitzt, das verdeckt sie nicht** (`KEEP_SOLID`):
      // Sitzend steckt sie im Sofa, und jeder Strahl von ihr ginge hindurch.
      if (child.userData[KEEP_SOLID]) continue;
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && this.counts(mesh, layers)) {
        const geometry = mesh.geometry;
        if (!geometry.boundingSphere) geometry.computeBoundingSphere();
        const sphere = geometry.boundingSphere;
        if (sphere) {
          _centre.copy(sphere.center).applyMatrix4(mesh.matrixWorld);
          const radius = sphere.radius * mesh.matrixWorld.getMaxScaleOnAxis();
          if (nearSegment(_aim, eye, _centre, radius)) this.candidates.push(mesh);
        }
      }
      if (child.children.length > 0) this.gather(child, rig, layers, eye);
    }
  }

  /** Ob dieses Netz überhaupt durchsichtig werden darf. */
  private counts(mesh: THREE.Mesh, layers: THREE.Layers): boolean {
    if (!mesh.layers.test(layers)) return false;
    if (mesh.layers.mask === 1 << LAYER_SELF_ONLY) return false;
    if ((mesh as Partial<THREE.InstancedMesh>).isInstancedMesh) return false;
    if ((mesh as unknown as { isBatchedMesh?: boolean }).isBatchedMesh) return false;
    if ((mesh as Partial<THREE.SkinnedMesh>).isSkinnedMesh) return false;
    if (isHighlight(mesh) || isOutline(mesh)) return false;
    return !seeThrough(mesh.material);
  }

  /**
   * **Das Ding, zu dem ein Netz gehört** — der höchste Vorfahr unter der
   * Szene, der noch kaum breiter ist als das Netz (`sameThing`). Gerechnet
   * einmal je Netz: Ein Baum wird nicht plötzlich ein Haus.
   */
  private thingOf(mesh: THREE.Object3D, root: THREE.Object3D): THREE.Object3D {
    const had = this.things.get(mesh);
    if (had) return had;
    let thing = mesh;
    const base = spanOf(mesh);
    for (let up = mesh.parent; up && up !== root; up = up.parent) {
      const span = spanOf(up);
      if (!Number.isFinite(span) || !sameThing(base, span)) break;
      thing = up;
    }
    this.things.set(mesh, thing);
    return thing;
  }

  private fade(thing: THREE.Object3D, rig: THREE.Object3D): void {
    thing.traverseVisible((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || node === rig || isHighlight(mesh)) return;
      // **Der schwarze Rand des Comics geht solange weg**: Ein Ding, das
      // durchsichtig ist und seinen Umriss behält, ist ein Drahtmodell.
      if (isOutline(mesh)) {
        this.saved.push({ mesh, material: mesh.material, visible: mesh.visible });
        mesh.visible = false;
        return;
      }
      if (seeThrough(mesh.material)) return;
      this.saved.push({ mesh, material: mesh.material, visible: mesh.visible });
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((one) => this.twin(one))
        : this.twin(mesh.material);
    });
  }

  private twin(material: THREE.Material): THREE.Material {
    const had = this.twins.get(material);
    if (had) return had;
    const made = material.clone();
    made.transparent = true;
    made.opacity = material.opacity * this.opacity;
    // Was durchsichtig ist, schreibt nicht in den Tiefenpuffer — sonst
    // verdeckte es die Figur trotzdem, nur unsichtbar.
    made.depthWrite = false;
    this.twins.set(material, made);
    return made;
  }
}

/** Die waagerechte Breite eines Objekts samt Kindern, in Metern. */
function spanOf(object: THREE.Object3D): number {
  _box.setFromObject(object);
  if (_box.isEmpty()) return Infinity;
  _box.getSize(_size);
  return Math.max(_size.x, _size.z);
}

const _eye = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _side = new THREE.Vector3();
const _from = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _centre = new THREE.Vector3();
const _box = new THREE.Box3();
const _size = new THREE.Vector3();
