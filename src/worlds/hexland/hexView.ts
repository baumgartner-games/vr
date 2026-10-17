import * as THREE from 'three';
import { kaykitModel } from '../../core/kaykitModel';
import { baseTile, hexCentre, type PlacedTile, type TileSpec } from './hexRules';
import { dressTile } from './hexDressing';

/**
 * **Wie groß eine Kachel des Regals hier wird.** Im Regal ist sie 2 breit
 * (Kante zu Kante) und 1 dick; mit 1,5 sind es 3 m, und ein Haus steht einem
 * bis zum Knie. Klein genug, dass man in der Brille über dem Dorf steht wie
 * über einer Modellbahn, groß genug, dass man von oben die Häuser zählt.
 */
export const HEX_SCALE = 1.5;
/** Kante zu Kante, in Metern. */
export const HEX_WIDTH = 2 * HEX_SCALE;

const PACK = 'medieval-hexagon/';

/** Ein Netz einer Datei: was gezeichnet wird und wie es in der Datei sitzt. */
interface Part {
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.Material;
  readonly matrix: THREE.Matrix4;
  readonly castShadow: boolean;
}

/**
 * **Ein Bündel je Netz** (`InstancedMesh`) — und nicht ein Modell je Haus.
 *
 * Ein Brett mit hundert Kacheln trägt leicht tausend Bäume und Häuser; als
 * einzelne Modelle wären das tausend Zeichenaufrufe, und die Quest schafft
 * nicht einmal ein Fünftel davon ruhig (`docs/agents/performance.md`). So ist
 * jedes Modell **ein** Aufruf, egal wie oft es steht. Das Bündel wächst in
 * Verdopplungen; ein neues Haus schreibt nur seine Matrix dazu.
 */
class Batch {
  mesh: THREE.InstancedMesh;
  readonly matrices: THREE.Matrix4[] = [];
  dirty = false;

  constructor(
    private readonly parent: THREE.Object3D,
    private readonly part: Part,
  ) {
    this.mesh = this.build(16);
  }

  add(world: THREE.Matrix4): void {
    this.matrices.push(new THREE.Matrix4().multiplyMatrices(world, this.part.matrix));
    this.dirty = true;
  }

  clear(): void {
    this.matrices.length = 0;
    this.dirty = true;
  }

  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    if (this.matrices.length > this.mesh.instanceMatrix.count) {
      let size = this.mesh.instanceMatrix.count;
      while (size < this.matrices.length) size *= 2;
      this.parent.remove(this.mesh);
      this.mesh.dispose();
      this.mesh = this.build(size);
    }
    this.matrices.forEach((m, i) => this.mesh.setMatrixAt(i, m));
    this.mesh.count = this.matrices.length;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.parent.remove(this.mesh);
    this.mesh.dispose();
  }

  private build(capacity: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(this.part.geometry, this.part.material, capacity);
    mesh.count = 0;
    // Das Brett wächst in alle Richtungen; eine Hüllkugel nachzuführen kostet
    // mehr, als ein paar Dutzend Bündel ungeprüft zu zeichnen.
    mesh.frustumCulled = false;
    mesh.castShadow = this.part.castShadow;
    mesh.receiveShadow = true;
    mesh.name = 'hexland-batch';
    this.parent.add(mesh);
    return mesh;
  }
}

/**
 * **Die Modelle des Regals, zerlegt in ihre Netze** — einmal geladen, von
 * Brett und Vorschau gemeinsam benutzt. Geometrie und Material gehören der
 * Vorlage (`kaykitModel`), weggeräumt wird hier nur, was hier gebaut ist.
 */
export class HexModels {
  private readonly parts = new Map<string, Part[]>();
  private readonly pending = new Map<string, Promise<Part[]>>();
  private readonly owned: THREE.BufferGeometry[] = [];

  load(model: string): Promise<Part[]> {
    const known = this.pending.get(model);
    if (known) return known;
    const job = kaykitModel(PACK + model).then((holder) => {
      const out: Part[] = [];
      if (holder) {
        // In den Maßen der Datei, nicht in denen des Regals: Groß gemacht wird hier.
        holder.scale.set(1, 1, 1);
        holder.updateMatrixWorld(true);
        holder.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;
          const material = Array.isArray(mesh.material) ? mesh.material[0]! : mesh.material;
          // Die Kacheln selbst werden plattgedrückt (`flatTop`) — die Deko bleibt, wie sie ist.
          if (model.startsWith('tiles/')) {
            const geometry = flatTop(mesh.geometry, mesh.matrixWorld);
            this.owned.push(geometry);
            out.push({ geometry, material, matrix: new THREE.Matrix4(), castShadow: false });
          } else {
            out.push({
              geometry: mesh.geometry,
              material,
              matrix: mesh.matrixWorld.clone(),
              castShadow: true,
            });
          }
        });
      }
      this.parts.set(model, out);
      return out;
    });
    this.pending.set(model, job);
    return job;
  }

  /** Die plattgedrückten Kacheln gehören hier und nicht der Vorlage. */
  dispose(): void {
    for (const geometry of this.owned) geometry.dispose();
    this.owned.length = 0;
  }

  /** Was schon da ist — `undefined`: noch nicht geladen. */
  now(model: string): Part[] | undefined {
    return this.parts.get(model);
  }
}

/**
 * **Wie tief die Oberseite einer Kachel im Regal reicht**, in seinen Einheiten.
 * Darüber liegt alles, was man von oben sieht: Wiese und Weg auf 0, die Fase
 * am Rand auf −0,05, Flusswasser auf −0,1, Seen und Ufer auf −0,2. Darunter
 * beginnt die Seitenwand (bis −1).
 */
const TOP_DEPTH = 0.25;

/**
 * **Eine Kachel ohne Stufen** — jede Ecke ihrer Oberseite auf genau 0.
 *
 * Gewünscht: _„Die hex tiles sollen nicht unterschiedlich hoch sein sondern
 * eine grade Fläche ergeben"_ und dann, als der Fluss noch eine Handbreit tiefer
 * lag als der See: _„Ne keine Stufen, alles eben erdig bitte"_. Die Kacheln
 * des Regals sind modelliert — Flussbett, Seeufer, die Fase an jeder Kante —,
 * und all das sind Höhen. Plattgedrückt bleibt die Zeichnung (Wasser ist blau,
 * weil die Textur blau ist), und das Brett ist eine Fläche ohne Fugen.
 *
 * Gebacken in eine eigene Geometrie in Metern der Kachel: Die Vorlage teilen
 * sich alle Kopien im Regal, und die Datei ist gepackt (`KHR_mesh_quantization`),
 * also erst in Kommazahlen, dann flach. Die Normalen der flachen Ecken zeigen
 * danach gerade nach oben, sonst läge noch das Licht der alten Böschung darauf.
 */
function flatTop(source: THREE.BufferGeometry, matrix: THREE.Matrix4): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const pos = source.getAttribute('position');
  const nor = source.getAttribute('normal');
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
  const positions = new Float32Array(pos.count * 3);
  const normals = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
    if (nor) n.fromBufferAttribute(nor, i).applyMatrix3(normalMatrix).normalize();
    else n.set(0, 1, 0);
    if (v.y > -TOP_DEPTH) {
      v.y = 0;
      n.set(0, 1, 0);
    }
    v.toArray(positions, i * 3);
    n.toArray(normals, i * 3);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  const uv = source.getAttribute('uv');
  if (uv) geometry.setAttribute('uv', uv);
  if (source.index) geometry.setIndex(source.index);
  for (const group of source.groups)
    geometry.addGroup(group.start, group.count, group.materialIndex);
  geometry.computeBoundingSphere();
  return geometry;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/** **Wo eine Kachel steht** — Mitte, Drehung und Maßstab in einer Matrix. */
export function tileMatrix(
  q: number,
  r: number,
  rot: number,
  out = new THREE.Matrix4(),
): THREE.Matrix4 {
  const c = hexCentre(q, r, HEX_WIDTH);
  _q.setFromAxisAngle(_up, -rot * (Math.PI / 3));
  return out.compose(_p.set(c.x, 0, c.z), _q, _s.setScalar(HEX_SCALE));
}

/** Die Stücke einer Kachel in ihren eigenen Maßen: Grundkachel und Ausstattung. */
function pieces(spec: TileSpec): Array<{ model: string; local: THREE.Matrix4 }> {
  const base = baseTile(spec.base);
  const out = [{ model: base.model, local: new THREE.Matrix4() }];
  for (const d of dressTile(spec)) {
    _q.setFromAxisAngle(_up, d.yaw);
    out.push({
      model: d.model,
      local: new THREE.Matrix4().compose(_p.set(d.x, 0, d.z), _q, _s.setScalar(d.scale)),
    });
  }
  return out;
}

/**
 * **Alle gelegten Kacheln** als Bündel. Eine neue Kachel schreibt ihre Stücke
 * dazu (`add`); erst wenn alle ihre Modelle geladen sind, denn eine Kachel ohne
 * Häuser, die eine Sekunde später welche hat, sieht aus wie ein Fehler.
 */
export class HexBoardView {
  readonly root = new THREE.Group();
  private readonly batches = new Map<THREE.BufferGeometry, Batch>();
  private disposed = false;

  constructor(private readonly models: HexModels) {
    this.root.name = 'hexland-board';
  }

  async add(tile: PlacedTile): Promise<void> {
    const list = pieces(tile.spec);
    const loaded = await Promise.all(list.map((p) => this.models.load(p.model)));
    if (this.disposed) return;
    const at = tileMatrix(tile.q, tile.r, tile.rot);
    list.forEach((piece, i) => {
      _m.multiplyMatrices(at, piece.local);
      for (const part of loaded[i]!) this.batch(part).add(_m);
    });
  }

  clear(): void {
    for (const batch of this.batches.values()) batch.clear();
  }

  /** Einmal je Bild: was sich geändert hat, auf die Grafikkarte. */
  flush(): void {
    for (const batch of this.batches.values()) batch.flush();
  }

  dispose(): void {
    this.disposed = true;
    for (const batch of this.batches.values()) batch.dispose();
    this.batches.clear();
  }

  private batch(part: Part): Batch {
    let batch = this.batches.get(part.geometry);
    if (!batch) {
      batch = new Batch(this.root, part);
      this.batches.set(part.geometry, batch);
    }
    return batch;
  }
}

/**
 * **Die Kachel in der Hand** — die oberste vom Stapel, schwebend über dem
 * Feld, auf das man gezeigt hat. Einzelne Netze und kein Bündel: Es ist genau
 * eine, und sie wird bei jeder neuen Kachel neu gebaut.
 */
export async function buildTileGroup(models: HexModels, spec: TileSpec): Promise<THREE.Group> {
  const group = new THREE.Group();
  group.name = 'hexland-tile';
  const list = pieces(spec);
  const loaded = await Promise.all(list.map((p) => models.load(p.model)));
  list.forEach((piece, i) => {
    for (const part of loaded[i]!) {
      const mesh = new THREE.Mesh(part.geometry, part.material);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.multiplyMatrices(piece.local, part.matrix);
      mesh.castShadow = true;
      group.add(mesh);
    }
  });
  group.scale.setScalar(HEX_SCALE);
  return group;
}
