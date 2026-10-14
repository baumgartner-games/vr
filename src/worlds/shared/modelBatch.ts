import * as THREE from 'three';
import { isOutline } from '../../core/outlineShell';
import { asFloat, sameLook } from './mergeByLook';

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
  mesh: THREE.InstancedMesh | THREE.BatchedMesh;
  /** Sein eigenes Material — abgeschrieben, damit das Stück seines behält. */
  material: THREE.Material;
  /** Das Feld, zu dem es gehört (`ModelBatch.cellOf`). */
  cell: string;
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
  /** Seit dem Bauen verändert (gerückt, weg, anders) — steht bis zum Umbau einzeln. */
  stale: boolean;
  /** Das Feld, in dem es gebündelt ist. */
  cell: string;
  /** Die Knoten, deren Matrizen gerade stillgelegt sind (`freeze`). */
  frozen: THREE.Object3D[];
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _inverse = new THREE.Matrix4();
const _at = new THREE.Vector3();
const noRaycast = (): void => {};
/** So viele Stücke je Bild werden auf ein neues Aussehen geprüft. */
const LOOKS_PER_FRAME = 8;

/**
 * **Verschiedene Modelle, ein Zeichenaufruf** — wenn die Grafikkarte
 * `WEBGL_multi_draw` kann (`allowMultiDraw`, gesetzt vom `App`).
 *
 * Instanziert wird nur, was **dieselbe Geometrie** hat. Die Stadt besteht aber
 * aus Dutzenden verschiedener Häuser, Laternen, Bäume und Straßenstücke, alle
 * mit demselben Texturatlas — gezählt 118 Bündel je Auge, fast jedes mit ein,
 * zwei Stücken. Gewünscht: _„Mach weiter mit der Performance in der Stadt bzw.
 * in allen Welten. Ich will weiterhin einen Level Editor nutzen können. Wir
 * können das mit Kopien und einfrieren gerne machen."_ Ein `THREE.BatchedMesh`
 * nimmt alle Geometrien eines Aussehens in einem Feld auf und zeichnet sie mit
 * **einem** Aufruf; ein Stück, das einzeln stehen muss, wird darin nur
 * ausgeblendet (`setVisibleAt`) — der Editor merkt davon nichts.
 *
 * Ohne die Erweiterung zerlegt three einen `BatchedMesh` in einen Aufruf je
 * Stück; dann bleibt es bei den Instanzen.
 */
let multiDraw = false;

/** Ob Bündel aus verschiedenen Geometrien gebaut werden dürfen — siehe oben. */
export function allowMultiDraw(on: boolean): void {
  multiDraw = on;
}

/** Ob gerade so gebündelt wird — für das Schild in der Brille. */
export function multiDrawAllowed(): boolean {
  return multiDraw;
}

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
  private bundles: Bundle[] = [];
  /** Die Stücke, die beim letzten Bauen dabei waren — in derselben Reihenfolge. */
  private members: BatchItem[] = [];
  /** Dieselben als Menge, solange gerade etwas umgebaut wird (`dirty`). */
  private memberSet: Set<BatchItem> | null = null;
  /** Neu gebaute Stücke, die `showBatch` noch nie gesehen hat. */
  private readonly fresh = new Set<Placed>();
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
   * **Im Editor bleibt das Bündel stehen.** Kommt ein Stück dazu, fällt eines
   * weg oder rückt eines, steht nur dieses einzeln (`stale`), bis eine Weile
   * nichts mehr geschehen ist — dann werden **nur die Felder** neu gebaut, die
   * es betrifft (`rebuild`). Bis Oktober 2026 fiel bei jeder Änderung die
   * ganze Welt in einzelne Stücke zurück und wurde danach ganz neu gebündelt:
   * in der Stadt über tausend Aufrufe für eine halbe Sekunde, dann ein Ruck.
   * Gewünscht: _„Ich will weiterhin einen Level Editor nutzen können."_
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
    const others = this.othersThan(items);
    if (others) this.members = [...items];
    // Ruhig ist es erst, wenn kein Stück mehr kommt, geht oder rückt.
    if (others || this.drifted()) {
      if (!this.dirty) this.memberSet = new Set(this.members);
      else if (others) this.memberSet = new Set(this.members);
      this.dirty = true;
      this.quiet = 0;
    } else if (this.dirty) this.quiet += dt;
    if (this.dirty && this.quiet >= this.settle) {
      this.rebuild(items);
      this.dirty = false;
      this.memberSet = null;
    }
    // Noch nie gebündelt: Bis zum ersten Bau steht alles einzeln, wie vorher.
    if (!this.bundles.length && !this.placed.size) return;
    this.showBatch(loose);
  }

  dispose(): void {
    this.showSingles();
    for (const bundle of this.bundles) disposeBundle(bundle);
    this.bundles = [];
    for (const one of this.placed.values()) unbatch(one);
    this.placed.clear();
    this.fresh.clear();
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

  /**
   * Ein gebündeltes Stück steht woanders, ist weg oder sieht anders aus — es
   * wird als `stale` markiert und steht bis zum Umbau einzeln.
   */
  private drifted(): boolean {
    let any = false;
    for (const one of this.order) {
      if (one.stale) continue;
      const object = one.item.object;
      if (
        one.item.removed ||
        !object.position.equals(one.position) ||
        !object.quaternion.equals(one.quaternion) ||
        !object.scale.equals(one.scale) ||
        (this.memberSet !== null && !this.memberSet.has(one.item))
      ) {
        one.stale = true;
        any = true;
      }
    }
    // Das Aussehen wird im Rundlauf nachgesehen, ein paar Stücke je Bild: Ein
    // Farbeimer ist selten, und über dreihundert Zeichenketten je Bild wären
    // teurer als der Anlass. Wer gerade einzeln steht (etwa weil er unter
    // einer Hand aufleuchtet), wird dabei übergangen.
    const all = this.order;
    for (let n = 0; n < Math.min(LOOKS_PER_FRAME, all.length); n++) {
      this.lookCursor = (this.lookCursor + 1) % all.length;
      const one = all[this.lookCursor]!;
      if (one.loose || one.stale) continue;
      if (looks(one.sources.map((source) => source.mesh)) !== one.look) {
        one.stale = true;
        any = true;
      }
    }
    return any;
  }

  // --- bauen ----------------------------------------------------------------

  /**
   * **Nur die Felder neu, in denen sich etwas getan hat** — beim ersten Mal
   * sind das alle. Ein Feld ist hier Ort und Ebene (`cellOf`); jedes Bündel
   * gehört zu genau einem.
   */
  private rebuild(items: readonly BatchItem[]): void {
    this.parent.updateWorldMatrix(true, false);
    _inverse.copy(this.parent.matrixWorld).invert();
    const alive = new Set<BatchItem>();
    for (const item of items) if (!item.removed) alive.add(item);

    // Welche Felder: wo ein verändertes Stück stand und wo es jetzt steht,
    // und wo ein neues hinkam.
    const dirty = new Set<string>();
    const cells = new Map<BatchItem, string>();
    const cellNow = (item: BatchItem): string => {
      let cell = cells.get(item);
      if (cell === undefined) {
        item.object.updateWorldMatrix(true, false);
        cell = this.cellOf(item.object);
        cells.set(item, cell);
      }
      return cell;
    };
    for (const one of this.placed.values()) {
      if (one.stale || !alive.has(one.item)) {
        dirty.add(one.cell);
        if (alive.has(one.item)) dirty.add(cellNow(one.item));
      }
    }
    for (const item of alive) if (!this.placed.has(item)) dirty.add(cellNow(item));
    if (!dirty.size) {
      this.members = [...items];
      return;
    }

    // Die alten Bündel dieser Felder weg, ihre Stücke wieder einzeln.
    this.bundles = this.bundles.filter((bundle) => {
      if (!dirty.has(bundle.cell)) return true;
      disposeBundle(bundle);
      return false;
    });
    for (const [item, one] of this.placed) {
      if (!dirty.has(one.cell) && alive.has(item)) continue;
      unbatch(one);
      this.placed.delete(item);
      this.fresh.delete(one);
    }

    interface Part {
      placed: Placed;
      mesh: THREE.Mesh;
      matrix: THREE.Matrix4;
    }
    const groups = new Map<string, Part[]>();
    for (const item of alive) {
      if (this.placed.has(item)) continue;
      const cell = cellNow(item);
      if (!dirty.has(cell)) continue;
      const object = item.object;
      object.updateWorldMatrix(true, true);
      // Auch ein Stück ohne Netze für das Bündel wird gemerkt — sonst gälte
      // sein Feld bei jeder Änderung anderswo als neu.
      const meshes = meshesOf(object);
      const placed: Placed = {
        item,
        sources: [],
        position: object.position.clone(),
        quaternion: object.quaternion.clone(),
        scale: object.scale.clone(),
        look: looks(meshes),
        loose: false,
        stale: false,
        cell,
        frozen: [],
      };
      this.placed.set(item, placed);
      this.fresh.add(placed);
      for (const mesh of meshes) {
        const material = mesh.material as THREE.Material;
        const key = multiDraw
          ? `${cell}|${sameLook(material)}|${mesh.castShadow ? 1 : 0}|${mesh.receiveShadow ? 1 : 0}|${colorSize(mesh)}`
          : `${cell}|${mesh.geometry.uuid}|${lookOf(material)}|${mesh.castShadow ? 1 : 0}`;
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
      const mesh = multiDraw
        ? batchedOf(parts, material)
        : new THREE.InstancedMesh(first.mesh.geometry, material, parts.length);
      mesh.name = 'model-batch';
      mesh.castShadow = first.mesh.castShadow;
      mesh.receiveShadow = first.mesh.receiveShadow;
      mesh.userData.level = levelOf(first.placed.item.object);
      mesh.raycast = noRaycast;
      mesh.visible = this.shown;
      const bundle: Bundle = { mesh, material, cell: first.placed.cell, matrices: [] };
      parts.forEach((part, index) => {
        mesh.setMatrixAt(index, part.matrix);
        bundle.matrices.push(part.matrix);
        part.placed.sources.push({ mesh: part.mesh, bundle, index });
      });
      if ((mesh as THREE.InstancedMesh).isInstancedMesh)
        (mesh as THREE.InstancedMesh).instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
      // Steht still: Die Matrix des Bündels ist die Einheitsmatrix und bleibt es.
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      this.group.add(mesh);
      this.bundles.push(bundle);
    }
    this.order = [...this.placed.values()];
    this.members = [...items];
    this.lookCursor = 0;
  }

  /** Das Feld eines Stücks: Ort in `cell`-Metern und Ebene. */
  private cellOf(object: THREE.Object3D): string {
    object.getWorldPosition(_at);
    return `${Math.floor(_at.x / this.cell)}:${Math.floor(_at.z / this.cell)}|${levelOf(object)}`;
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
    for (const one of this.order) {
      const wanted = one.stale || loose(one.item) || !one.item.object.visible;
      if (!first && wanted === one.loose && !this.fresh.has(one)) continue;
      one.loose = wanted;
      if (wanted) thaw(one);
      else freeze(one);
      for (const source of one.sources) {
        source.mesh.visible = wanted;
        const bundle = source.bundle.mesh;
        if ((bundle as THREE.BatchedMesh).isBatchedMesh) {
          (bundle as THREE.BatchedMesh).setVisibleAt(source.index, !wanted);
          continue;
        }
        bundle.setMatrixAt(source.index, wanted ? ZERO : source.bundle.matrices[source.index]!);
        touched.add(source.bundle);
      }
    }
    this.fresh.clear();
    for (const bundle of touched)
      (bundle.mesh as THREE.InstancedMesh).instanceMatrix.needsUpdate = true;
    if (first) for (const bundle of this.bundles) bundle.mesh.visible = true;
  }
}

/** Ein Bündel ganz weg — Netz, Puffer und sein eigenes Material. */
function disposeBundle(bundle: Bundle): void {
  bundle.mesh.removeFromParent();
  bundle.mesh.dispose();
  bundle.material.dispose();
}

/** Ein Stück aus dem Bündel nehmen: es steht wieder einzeln und darf sich rühren. */
function unbatch(one: Placed): void {
  for (const source of one.sources) source.mesh.visible = true;
  one.sources.length = 0;
  one.loose = false;
  thaw(one);
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
  // **Und der Matrizenlauf steigt gar nicht erst hinab.** Stillgelegt kostet
  // jeder Knoten trotzdem einen Aufruf je Bild; in Haunting sind das rund
  // 1 700 Knoten in 300 Stücken, gemessen gut 0,6 ms (`npm run
  // perf:haunting`). Gezeichnet wird ein Stück im Bündel ohnehin nicht — das
  // Bündel zeichnet es —, und `thaw` gibt den Lauf wieder frei.
  if (one.frozen[0] === one.item.object) one.item.object.updateMatrixWorld = skipFrozen;
}

/** Der Matrizenlauf für ein Stück im Bündel: nur, wenn ein Elter ihn erzwingt. */
function skipFrozen(this: THREE.Object3D, force?: boolean): void {
  if (force) THREE.Object3D.prototype.updateMatrixWorld.call(this, force);
  else this.matrixWorldNeedsUpdate = false;
}

/** Und wieder freigeben — wer einzeln steht, darf sich bewegen. */
function thaw(one: Placed): void {
  if (Object.prototype.hasOwnProperty.call(one.item.object, 'updateMatrixWorld'))
    delete (one.item.object as { updateMatrixWorld?: unknown }).updateMatrixWorld;
  for (const node of one.frozen) {
    node.matrixAutoUpdate = true;
    node.matrixWorldAutoUpdate = true;
  }
  one.frozen.length = 0;
}

/**
 * **Ein Bündel aus verschiedenen Geometrien** (`multiDraw`). Die Reihenfolge
 * der Stücke ist die der Teile — `index` in `Source` ist die Nummer der Instanz.
 *
 * Ausgesiebt wird je Bündel wie bei den Instanzen (das Feld hält es klein),
 * nicht je Stück: Das spart die Rechnung je Bild, und die Liste der Aufrufe
 * muss nur neu, wenn ein Stück ein- oder ausgeblendet wird.
 */
function batchedOf(
  parts: readonly { mesh: THREE.Mesh }[],
  material: THREE.Material,
): THREE.BatchedMesh {
  const withColor = colorSize(parts[0]!.mesh);
  const unique = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  for (const { mesh } of parts)
    if (!unique.has(mesh.geometry)) unique.set(mesh.geometry, plainOf(mesh.geometry, withColor));
  let vertices = 0;
  let indices = 0;
  for (const plain of unique.values()) {
    vertices += plain.getAttribute('position').count;
    indices += plain.getIndex()!.count;
  }
  const batched = new THREE.BatchedMesh(parts.length, vertices, indices, material);
  batched.perObjectFrustumCulled = false;
  batched.sortObjects = false;
  const ids = new Map<THREE.BufferGeometry, number>();
  for (const [source, plain] of unique) ids.set(source, batched.addGeometry(plain));
  for (const { mesh } of parts) batched.addInstance(ids.get(mesh.geometry)!);
  return batched;
}

const plainCache = [
  new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>(),
  new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>(),
];

/**
 * **Jede Geometrie in derselben Form**: Ort, Normale, Texturkoordinate (und
 * Farbe, wenn das Material sie liest), als Fließkomma und mit Index — ein
 * `BatchedMesh` verlangt, dass alle Geometrien darin dieselben Spalten haben,
 * und die Modelle aus dem Regal sind teils gepackt (16 Bit), teils nicht.
 * Einmal je Geometrie gerechnet; die Kopie lädt nie zur Grafikkarte hoch, das
 * Bündel schreibt sie in seinen eigenen Puffer.
 */
function plainOf(geometry: THREE.BufferGeometry, color: number): THREE.BufferGeometry {
  const cache = plainCache[color ? 1 : 0]!;
  const known = cache.get(geometry);
  if (known) return known;
  const plain = new THREE.BufferGeometry();
  const position = geometry.getAttribute('position');
  plain.setAttribute('position', asFloat(position));
  const normal = geometry.getAttribute('normal');
  if (normal) plain.setAttribute('normal', asFloat(normal));
  else plain.computeVertexNormals();
  const uv = geometry.getAttribute('uv');
  plain.setAttribute(
    'uv',
    uv ? asFloat(uv) : new THREE.BufferAttribute(new Float32Array(position.count * 2), 2),
  );
  if (color) {
    const source = geometry.getAttribute('color');
    plain.setAttribute(
      'color',
      source
        ? asFloat(source)
        : new THREE.BufferAttribute(new Float32Array(position.count * color).fill(1), color),
    );
  }
  const index = geometry.getIndex();
  if (index) plain.setIndex(Array.from(index.array as ArrayLike<number>));
  else plain.setIndex(Array.from({ length: position.count }, (_, i) => i));
  cache.set(geometry, plain);
  return plain;
}

/** Wie viele Farbwerte je Ecke das Material liest — 0, wenn es keine liest. */
function colorSize(mesh: THREE.Mesh): number {
  if (!(mesh.material as THREE.Material).vertexColors) return 0;
  return mesh.geometry.getAttribute('color')?.itemSize ?? 3;
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
