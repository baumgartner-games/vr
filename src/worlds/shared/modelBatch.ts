import * as THREE from 'three';
import { isOutline } from '../../core/outlineShell';

/**
 * **Viele gleiche Stücke aus dem Regal, wenige Zeichenaufrufe** — die Wände,
 * die eine Welt selbst aufstellt (`PortalWorld.placeModel`).
 *
 * Die Station in Haunting steht aus 338 Wänden aus dem Regal
 * (`prototype-bits/Wall.glb`, `Wall_Half.glb`), und jede war ein eigenes
 * Netz mit eigenem Material: ein Zeichenaufruf je Wand und Durchgang. Gezählt
 * in einem beleuchteten Raum waren das 59 von 138 Aufrufen des Hauptbilds (in
 * der Brille zweimal) und 264 von 363 Aufrufen, wenn eine Deckenleuchte ihre
 * sechs Schattenseiten neu zeichnet. Dieselbe Geometrie, dasselbe Aussehen —
 * das ist genau der Fall für `THREE.InstancedMesh`.
 *
 * Gebaut wird **je Feld von `cell` Metern, je Ebene, je Geometrie und je
 * Aussehen** ein Bündel. Das Feld hält das Aussieben am Leben: Ein Bündel über
 * die ganze Station stünde in jedem Blickkegel und in jeder Würfelseite einer
 * Schattenkarte.
 *
 * Und derselbe Trick wie beim Grundriss (`grid/gridBatch.ts`): **Die Stücke
 * bleiben stehen und werden nur unsichtbar.** Körper, Collider, Zellgitter,
 * Greifen und jeder Strahl arbeiten an ihnen weiter, denn three prüft beim
 * Abtasten keine Sichtbarkeit; gezeichnet wird das Bündel. Das Bündel selbst
 * fängt keinen Strahl (`raycast` tut nichts) — sonst hätte jeder Zeiger zwei
 * Wände unter sich.
 *
 * **Was gerade nicht ins Bündel gehört, steht einzeln da** (`loose`): ein
 * Stück in der Hand, eines, das leuchtet, weil eine Hand es berührt, eines,
 * das gerade unsichtbar ist. Seine Stellen im Bündel werden auf null
 * geschrumpft, und seine eigenen Netze kommen zurück — ohne Neubau, das ist
 * eine Matrix je Netz. Neu gebaut wird nur, wenn Stücke dazukommen, wegfallen,
 * woanders stehen oder anders aussehen, und dann erst, wenn eine Weile
 * (`settle`) nichts mehr passiert ist: Beim Laden kommen die Wände einzeln an,
 * und dreihundert Neubauten hintereinander wären das Gegenteil von dem, wofür
 * es das hier gibt. Bis dahin steht alles einzeln, wie vorher.
 *
 * **Von oben** (`show(false)`) steht ebenfalls alles einzeln: Dort werden
 * Wände vor der Figur durchsichtig (`grid/modelGhost.ts`), und das geht nur je
 * Stück.
 */

/** Ein Stück, wie es die Welt führt — hier zählt nur, woran das Bild hängt. */
export interface BatchItem {
  object: THREE.Object3D;
  removed?: boolean;
}

interface Source {
  mesh: THREE.Mesh;
  bundle: Bundle;
  index: number;
}

interface Bundle {
  mesh: THREE.InstancedMesh;
  /** Die Matrizen, wie sie im Bündel stehen, solange niemand einzeln steht. */
  matrices: THREE.Matrix4[];
}

interface Placed {
  item: BatchItem;
  sources: Source[];
  /** Wo das Stück beim Bauen stand — daran erkennt `step`, dass es umzog. */
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
  look: string;
  loose: boolean;
  /** Die Knoten, deren Matrizen gerade stillgelegt sind (`freeze`). */
  frozen: THREE.Object3D[];
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _inverse = new THREE.Matrix4();
const _at = new THREE.Vector3();
const noRaycast = (): void => {};
/** So viele Stücke je Bild werden auf ein neues Aussehen geprüft. */
const LOOKS_PER_FRAME = 8;

/** Wie ein Material aussieht — gleich aussehende Stücke teilen sich ein Bündel. */
export function lookOf(material: THREE.Material): string {
  const standard = material as THREE.MeshStandardMaterial;
  return [
    material.type,
    material.name,
    standard.color?.getHex() ?? '',
    standard.emissive?.getHex() ?? '',
    standard.map?.uuid ?? '',
    standard.roughness ?? '',
    standard.metalness ?? '',
    material.transparent ? 1 : 0,
    material.opacity,
    material.side,
    material.vertexColors ? 1 : 0,
  ].join('|');
}

/** Die Netze eines Stücks, die ins Bündel dürfen: sichtbar, ein Material, kein Saum. */
function meshesOf(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  const visit = (object: THREE.Object3D): void => {
    if (!object.visible) return;
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) {
      const plain =
        !isOutline(mesh) &&
        !(mesh as THREE.SkinnedMesh).isSkinnedMesh &&
        !(mesh as THREE.InstancedMesh).isInstancedMesh &&
        !Array.isArray(mesh.material) &&
        !!mesh.material;
      if (plain) out.push(mesh);
      // Ein Saum oder ein Sonderfall bleibt, wie er ist — und was darunter
      // hängt, gehört zu ihm.
      if (!plain) return;
    }
    for (const child of object.children) visit(child);
  };
  visit(root);
  return out;
}

export class ModelBatch {
  readonly group = new THREE.Group();
  private readonly placed = new Map<BatchItem, Placed>();
  /** Dieselben wie `placed`, als Liste für den Rundlauf in `drifted`. */
  private order: Placed[] = [];
  private readonly bundles: Bundle[] = [];
  private readonly materials: THREE.Material[] = [];
  /** Die Stücke, die beim letzten Bauen dabei waren — in derselben Reihenfolge. */
  private members: BatchItem[] = [];
  private dirty = false;
  private quiet = 0;
  private shown = false;
  /** Rundlauf für den Blick auf das Aussehen: je Bild nur ein Teil der Stücke. */
  private lookCursor = 0;

  /**
   * @param parent wo die Bündel hängen — dieselbe Gruppe wie die Stücke, damit
   *               beide im selben Raum stehen
   * @param cell   Kantenlänge eines Feldes in Metern
   * @param settle so lange muss nichts passiert sein, bevor neu gebaut wird (s)
   */
  constructor(
    private readonly parent: THREE.Object3D,
    private readonly cell = 16,
    private readonly settle = 0.5,
  ) {
    this.group.name = 'model-batch';
    parent.add(this.group);
  }

  /** Wie viele Zeichenaufrufe die Bündel höchstens kosten — für Tests und Messungen. */
  get bundleCount(): number {
    return this.bundles.length;
  }

  /** Ob gerade das Bündel zu sehen ist und nicht die einzelnen Stücke. */
  get batched(): boolean {
    return this.shown;
  }

  /**
   * Einmal je Bild.
   *
   * @param show   ob gebündelt werden darf (aus den Augen ja, von oben nein)
   * @param items  die Stücke der Welt, die in Frage kommen
   * @param loose  ob ein Stück gerade einzeln stehen muss
   */
  step(
    dt: number,
    show: boolean,
    items: readonly BatchItem[],
    loose: (item: BatchItem) => boolean,
  ): void {
    if (!show) {
      this.showSingles();
      return;
    }
    if (!this.dirty && (this.othersThan(items) || this.drifted())) {
      this.dirty = true;
      this.quiet = 0;
      this.members = [...items];
    }
    if (this.dirty) {
      this.showSingles();
      // Solange noch Stücke kommen oder gehen, wird nicht gebaut.
      if (this.othersThan(items)) {
        this.members = [...items];
        this.quiet = 0;
      } else this.quiet += dt;
      if (this.quiet < this.settle) return;
      this.build(items);
      this.dirty = false;
    }
    this.showBatch(loose);
  }

  dispose(): void {
    this.showSingles();
    this.clear();
    this.placed.clear();
    this.order = [];
    this.members = [];
    this.group.removeFromParent();
  }

  // --- was sich geändert hat ------------------------------------------------

  /** Andere Stücke als beim letzten Blick — eines kam dazu oder fiel weg. */
  private othersThan(items: readonly BatchItem[]): boolean {
    const members = this.members;
    if (items.length !== members.length) return true;
    for (let i = 0; i < items.length; i++) if (items[i] !== members[i]) return true;
    return false;
  }

  /** Ein gebündeltes Stück steht woanders, ist weg oder sieht anders aus. */
  private drifted(): boolean {
    for (const one of this.placed.values()) {
      if (one.item.removed) return true;
      const object = one.item.object;
      if (
        !object.position.equals(one.position) ||
        !object.quaternion.equals(one.quaternion) ||
        !object.scale.equals(one.scale)
      )
        return true;
    }
    // Das Aussehen wird im Rundlauf nachgesehen, ein paar Stücke je Bild: Ein
    // Farbeimer ist selten, und über dreihundert Zeichenketten je Bild wären
    // teurer als der Anlass. Wer gerade einzeln steht (etwa weil er unter
    // einer Hand aufleuchtet), wird dabei übergangen.
    const all = this.order;
    for (let n = 0; n < Math.min(LOOKS_PER_FRAME, all.length); n++) {
      this.lookCursor = (this.lookCursor + 1) % all.length;
      const one = all[this.lookCursor]!;
      if (one.loose) continue;
      if (looks(one.sources.map((source) => source.mesh)) !== one.look) return true;
    }
    return false;
  }

  // --- bauen ----------------------------------------------------------------

  private clear(): void {
    for (const bundle of this.bundles) {
      bundle.mesh.removeFromParent();
      bundle.mesh.dispose();
    }
    this.bundles.length = 0;
    for (const material of this.materials) material.dispose();
    this.materials.length = 0;
  }

  private build(items: readonly BatchItem[]): void {
    this.showSingles();
    this.clear();
    this.placed.clear();
    this.order = [];
    this.lookCursor = 0;
    this.members = [...items];
    this.parent.updateWorldMatrix(true, false);
    _inverse.copy(this.parent.matrixWorld).invert();

    interface Part {
      placed: Placed;
      mesh: THREE.Mesh;
      matrix: THREE.Matrix4;
    }
    const groups = new Map<string, Part[]>();
    for (const item of items) {
      if (item.removed) continue;
      const object = item.object;
      object.updateWorldMatrix(true, true);
      const meshes = meshesOf(object);
      if (!meshes.length) continue;
      const placed: Placed = {
        item,
        sources: [],
        position: object.position.clone(),
        quaternion: object.quaternion.clone(),
        scale: object.scale.clone(),
        look: looks(meshes),
        loose: false,
        frozen: [],
      };
      this.placed.set(item, placed);
      this.order.push(placed);
      object.getWorldPosition(_at);
      const cell = `${Math.floor(_at.x / this.cell)}:${Math.floor(_at.z / this.cell)}`;
      const level = levelOf(object);
      for (const mesh of meshes) {
        const material = mesh.material as THREE.Material;
        const key = `${cell}|${level}|${mesh.geometry.uuid}|${lookOf(material)}|${mesh.castShadow ? 1 : 0}`;
        const matrix = new THREE.Matrix4().multiplyMatrices(_inverse, mesh.matrixWorld);
        const list = groups.get(key) ?? [];
        list.push({ placed, mesh, matrix });
        groups.set(key, list);
      }
    }

    for (const parts of groups.values()) {
      const first = parts[0]!;
      // **Ein eigenes Material je Bündel**, abgeschrieben vom ersten Stück:
      // Das Material eines Stücks gehört dem Stück — leuchtet es auf, weil
      // eine Hand es berührt, soll nicht die ganze Wand mitleuchten.
      const material = (first.mesh.material as THREE.Material).clone();
      this.materials.push(material);
      const mesh = new THREE.InstancedMesh(first.mesh.geometry, material, parts.length);
      mesh.name = 'model-batch';
      mesh.castShadow = first.mesh.castShadow;
      mesh.receiveShadow = first.mesh.receiveShadow;
      mesh.userData.level = levelOf(first.placed.item.object);
      mesh.raycast = noRaycast;
      mesh.visible = false;
      const bundle: Bundle = { mesh, matrices: [] };
      parts.forEach((part, index) => {
        mesh.setMatrixAt(index, part.matrix);
        bundle.matrices.push(part.matrix);
        part.placed.sources.push({ mesh: part.mesh, bundle, index });
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
      // Steht still: Die Matrix des Bündels ist die Einheitsmatrix und bleibt es.
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      this.group.add(mesh);
      this.bundles.push(bundle);
    }
  }

  // --- zeigen ---------------------------------------------------------------

  /** Alles einzeln, die Bündel weg — genau das Bild von vorher. */
  private showSingles(): void {
    if (!this.shown) return;
    this.shown = false;
    for (const bundle of this.bundles) bundle.mesh.visible = false;
    for (const one of this.placed.values()) {
      for (const source of one.sources) source.mesh.visible = true;
      one.loose = false;
      thaw(one);
    }
  }

  /** Die Bündel, und nur wer gerade einzeln stehen muss, steht einzeln. */
  private showBatch(loose: (item: BatchItem) => boolean): void {
    const first = !this.shown;
    this.shown = true;
    const touched = new Set<Bundle>();
    for (const one of this.placed.values()) {
      const wanted = loose(one.item) || !one.item.object.visible;
      if (!first && wanted === one.loose) continue;
      one.loose = wanted;
      if (wanted) thaw(one);
      else freeze(one);
      for (const source of one.sources) {
        source.mesh.visible = wanted;
        source.bundle.mesh.setMatrixAt(
          source.index,
          wanted ? ZERO : source.bundle.matrices[source.index]!,
        );
        touched.add(source.bundle);
      }
    }
    for (const bundle of touched) bundle.mesh.instanceMatrix.needsUpdate = true;
    if (first) for (const bundle of this.bundles) bundle.mesh.visible = true;
  }
}

/**
 * **Die Matrizen eines gebündelten Stücks stilllegen** — dieselbe Überlegung
 * wie bei den Quadern des Grundrisses (`GridWorld.freezeBatched`): three rechnet
 * vor jedem Bild jede Matrix der Szene neu, auch die eines unsichtbaren
 * Netzes, und eine Wand aus dem Regal ist fünf Knoten tief. In Haunting sind
 * das 1 690 der 6 768 Knoten der Szene. Solange ein Stück im Bündel steht,
 * bewegt es sich nicht (sonst stünde es einzeln, `loose`, oder das Bündel würde
 * neu gebaut, `drifted`), und seine Weltmatrizen — die Strahlen und Greifen
 * weiter brauchen — stehen richtig: Vorher wird einmal gerechnet.
 */
function freeze(one: Placed): void {
  if (one.frozen.length) return;
  one.item.object.updateWorldMatrix(true, true);
  one.item.object.traverse((node) => {
    if (!node.matrixAutoUpdate || !node.matrixWorldAutoUpdate) return;
    node.matrixAutoUpdate = false;
    node.matrixWorldAutoUpdate = false;
    one.frozen.push(node);
  });
}

/** Und wieder freigeben — wer einzeln steht, darf sich bewegen. */
function thaw(one: Placed): void {
  for (const node of one.frozen) {
    node.matrixAutoUpdate = true;
    node.matrixWorldAutoUpdate = true;
  }
  one.frozen.length = 0;
}

/** Das Aussehen aller Netze eines Stücks in einer Zeile. */
function looks(meshes: readonly THREE.Mesh[]): string {
  return meshes.map((mesh) => lookOf(mesh.material as THREE.Material)).join('§');
}

/** Die Ebene eines Stücks (`userData.level`, `core/cutaway.ts`) — ohne Angabe null. */
function levelOf(object: THREE.Object3D): number {
  for (let at: THREE.Object3D | null = object; at; at = at.parent) {
    const level = at.userData.level as number | undefined;
    if (typeof level === 'number') return level;
  }
  return 0;
}
