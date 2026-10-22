import * as THREE from 'three';
import { kaykitModel } from '../../core/kaykitModel';
import { baseTile, hexCentre, hexKey, type Hex, type PlacedTile, type TileSpec } from './hexRules';
import { dressTile, groundPatches, riverFlow, type GroundKind } from './hexDressing';
import {
  WATER_FRAGMENT,
  WATER_VERTEX,
  fanMaterial,
  swayMaterial,
  waterUniforms,
} from './hexAnimate';
import { bevelNodeMaterial } from './hexNodeLooks';

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

/** Wie stark sich was im Wind biegt (`swayMaterial`). */
const SWAY_BEND = { tree: 0.3, grain: 2.4, bush: 1.6 } as const;

/** Ein Netz einer Datei: was gezeichnet wird und wie es in der Datei sitzt. */
interface Part {
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.Material;
  readonly matrix: THREE.Matrix4;
  readonly castShadow: boolean;
  /** Eine Grundkachel — trägt je Kopie, wie ihr Wasser fließt (`aFlow`). */
  readonly flows?: boolean;
}

/**
 * Was eine Kopie ohne Fluss trägt: `w` 1 heißt stehendes Wasser. Ein Fluss
 * trägt Arme hinein (`x`, Bitmaske), hinaus (`y`), die Lage der Mitte den
 * Fluss hinab (`z`) und `w` 2 (`hexAnimate.WATER_FRAGMENT`).
 */
const STILL: readonly [number, number, number, number] = [0, 0, 0, 1];

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
  /** Je Kopie, wie ihr Wasser fließt — nur bei Grundkacheln (`Part.flows`). */
  private readonly flows: number[] = [];
  dirty = false;

  constructor(
    private readonly parent: THREE.Object3D,
    private readonly part: Part,
  ) {
    this.mesh = this.build(16);
  }

  /** Gibt zurück, die wievielte Kopie es ist — für `setFlow`. */
  add(world: THREE.Matrix4): number {
    this.matrices.push(new THREE.Matrix4().multiplyMatrices(world, this.part.matrix));
    this.flows.push(...STILL);
    this.dirty = true;
    return this.matrices.length - 1;
  }

  setFlow(index: number, flow: readonly number[]): void {
    for (let k = 0; k < 4; k++) this.flows[index * 4 + k] = flow[k]!;
    this.dirty = true;
  }

  clear(): void {
    this.matrices.length = 0;
    this.flows.length = 0;
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
    const flow = this.mesh.geometry.getAttribute('aFlow') as
      THREE.InstancedBufferAttribute | undefined;
    if (flow) {
      (flow.array as Float32Array).set(this.flows);
      flow.needsUpdate = true;
    }
  }

  dispose(): void {
    this.parent.remove(this.mesh);
    if (this.part.flows) this.mesh.geometry.dispose();
    this.mesh.dispose();
  }

  private build(capacity: number): THREE.InstancedMesh {
    let geometry = this.part.geometry;
    if (this.part.flows) {
      // Eine eigene Hülle um dieselben Ecken, mit einer Spalte je Kopie dazu:
      // Die Vorlage teilt sich das Brett mit der Kachel in der Hand.
      if (this.mesh) this.mesh.geometry.dispose();
      const source = geometry;
      geometry = new THREE.BufferGeometry();
      for (const [name, attribute] of Object.entries(source.attributes))
        geometry.setAttribute(name, attribute);
      geometry.setIndex(source.index);
      for (const g of source.groups) geometry.addGroup(g.start, g.count, g.materialIndex);
      geometry.setAttribute(
        'aFlow',
        new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4),
      );
    }
    const mesh = new THREE.InstancedMesh(geometry, this.part.material, capacity);
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
    if (model.startsWith(GROUND)) {
      const parts = this.ground(model);
      this.parts.set(model, parts);
      const done = Promise.resolve(parts);
      this.pending.set(model, done);
      return done;
    }
    // Mit `/` vorn liegt das Modell in einem anderen Paket des Regals (Blumen, Büsche).
    const path = model.startsWith('/') ? model.slice(1) : PACK + model;
    const job = kaykitModel(path).then((holder) => {
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
            const own = bevelEdges(material.clone());
            this.ownMaterials.push(own);
            out.push({
              geometry,
              material: own,
              matrix: new THREE.Matrix4(),
              castShadow: false,
              flows: true,
            });
          } else {
            out.push({
              geometry: mesh.geometry,
              material: this.animated(model, mesh.name, material),
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

  /** Die plattgedrückten Kacheln und die Böden gehören hier und nicht der Vorlage. */
  dispose(): void {
    for (const geometry of this.owned) geometry.dispose();
    this.owned.length = 0;
    for (const material of this.ownMaterials) {
      (material as THREE.MeshStandardMaterial).map?.dispose();
      material.dispose();
    }
    this.ownMaterials.length = 0;
    for (const material of this.moving.values()) material.dispose();
    this.moving.clear();
  }

  private readonly ownMaterials: THREE.Material[] = [];
  /** Kopien der Vorlage mit Bewegung (`hexAnimate.ts`) — die Textur gehört der Vorlage. */
  private readonly moving = new Map<string, THREE.Material>();

  /**
   * **Was sich bewegt, bekommt eine eigene Kopie des Materials** — Bäume und
   * Weizen wiegen sich, Mühlenflügel drehen sich. Die Vorlage teilen sich
   * alle Welten mit KayKit-Modellen; die bleibt still.
   */
  private animated(model: string, mesh: string, material: THREE.Material): THREE.Material {
    const kind = mesh.includes('_fan')
      ? 'fan'
      : model.startsWith('decoration/nature/tree')
        ? 'tree'
        : model.endsWith('building_grain.glb')
          ? 'grain'
          : model.startsWith('/forest-nature/')
            ? 'bush'
            : null;
    if (!kind) return material;
    const key = `${kind}|${material.uuid}`;
    let own = this.moving.get(key);
    if (!own) {
      own = material.clone();
      if (kind === 'fan') own = fanMaterial(own);
      // Das Maß wächst mit dem Quadrat der Höhe (`swayMaterial`): Weizen und
      // Büsche sind niedrig und brauchen mehr, damit man sie überhaupt sieht.
      // Erst gemeldet _„Das Weizen bewegt sich viel zu stark."_ (damals ein
      // anderes Maß), dann _„Weizen und Büsche sollten sich vom Wind auch
      // bewegen lassen."_
      else own = swayMaterial(own, SWAY_BEND[kind]);
      this.moving.set(key, own);
    }
    return own;
  }

  /**
   * **Ein Stück Boden** (`hexDressing.groundPatches`) als „Modell" — so geht es
   * denselben Weg in die Bündel wie Häuser und Bäume. Die Adresse sagt Gelände
   * und Form: `ground:field:run3` (drei Kanten ab Kante 0, `runGeometry`) oder
   * `ground:field:ring` (der äußere Ring von Kante 0). Gedreht wird es wie
   * eine Deko.
   *
   * Stadt: braune Erde. Wald: ein dunkleres Grün. Weizen: brauner Acker mit
   * Furchen — die Kornfelder mit Höhe stehen darauf (`hexDressing`), und der
   * Acker bleibt ringsum als Rand zu sehen.
   */
  private ground(model: string): Part[] {
    const [, kind, form] = model.split(':') as [string, GroundKind, string];
    const geometry = (y: number): THREE.BufferGeometry =>
      form === 'ring'
        ? sectorGeometry(RING_INNER, 1, y)
        : runGeometry(Number(form.slice(3)) || 1, y, kind === 'water' ? BAY_BOW : undefined);
    const flat = (colour: number, map: THREE.Texture | null, offset: number): THREE.Material => {
      const material = new THREE.MeshStandardMaterial({
        color: colour,
        map,
        roughness: 1,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: offset,
      });
      const own = bevelEdges(material);
      this.ownMaterials.push(own);
      return own;
    };
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material): Part => {
      this.owned.push(geometry);
      return { geometry, material, matrix: new THREE.Matrix4(), castShadow: false };
    };
    switch (kind) {
      // **Jedes Gelände auf seiner eigenen Höhe** — gemeldet: _„bei einigen
      // Tiles gibt es ein Z-Fighting"_. Wo zwei Böden sich am Rand berühren
      // oder ein wenig überlappen, flimmerten sie auf derselben Höhe ineinander;
      // jetzt liegt immer derselbe oben.
      case 'house':
        return [part(geometry(0.012), flat(0x8a6644, null, -4))];
      case 'forest':
        return [part(geometry(0.018), flat(0x6b8f30, null, -6))];
      case 'field':
        return [part(geometry(0.024), flat(0xffffff, fieldTexture(), -8))];
      case 'water':
        return [part(geometry(0.03), flat(WATER_COLOUR, null, -10))];
    }
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

/**
 * **Jede Kachel bekommt eine sichtbare, weiche Kante** — im Shader, die
 * Modelle bleiben, wie sie sind. Gewünscht: _„Die Hex-Tiles an sich sollen
 * nicht nahtlos aneinander liegen, sondern sie sind am Rand etwas eingedrückt
 * bzw. abgerundet. Das könnten wir über einen Shader lösen statt das Model
 * anzufassen."_
 *
 * Die Stelle in der Kachel ist die Lage im eigenen Netz (`position`): Die
 * Kacheln und Böden sind in den Maßen des Regals gebacken (Kante zu Kante 2,
 * Mittelpunkt 0), gedreht und verschoben wird erst mit der Instanzmatrix.
 * Der Abstand zur Kante eines Sechsecks ist das Größte der drei
 * Skalarprodukte mit den Kantennormalen (0°, 60°, 120°). Nah an der Kante
 * wird es dunkler (die Fuge), knapp davor heller (die Rundung, die das Licht
 * fängt) — auf der Oberseite, nicht an den Seitenwänden.
 *
 * Gibt das Material zurück, das gezeichnet wird — im neuen Renderer ein
 * eigenes Knotenmaterial (`hexNodeLooks.bevelNodeMaterial`).
 */
function bevelEdges<M extends THREE.Material>(material: M): M {
  const node = bevelNodeMaterial(material, BEVEL);
  if (node) return node as unknown as M;
  material.onBeforeCompile = (shader) => {
    // Dazu glitzert das Wasser, wenn Animationen an sind (`hexAnimate.ts`).
    waterUniforms(shader.uniforms);
    const head = 'varying vec3 vHexLocal;\nvarying vec2 vHexWorld;\nvarying vec4 vFlow;';
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${head}\nattribute vec4 aFlow;`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvHexLocal = position;\nvFlow = aFlow;\n${WATER_VERTEX}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\n${head}\nuniform float uHexTime;\nuniform float uHexAnim;`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        if (vHexLocal.y > -0.05) {
          vec2 p = vHexLocal.xz;
          float d = max(abs(p.x), max(abs(dot(p, vec2(0.5, 0.8660254))), abs(dot(p, vec2(-0.5, 0.8660254)))));
          float edge = 1.0 - d;
          float groove = 1.0 - smoothstep(0.0, ${BEVEL.toFixed(3)}, edge);
          float lip = smoothstep(${(BEVEL * 0.4).toFixed(3)}, ${BEVEL.toFixed(3)}, edge)
            * (1.0 - smoothstep(${BEVEL.toFixed(3)}, ${(BEVEL * 1.8).toFixed(3)}, edge));
          diffuseColor.rgb *= mix(1.0, 0.52, groove * groove);
          diffuseColor.rgb += lip * 0.07;
        }
        ${WATER_FRAGMENT}`,
      );
  };
  material.customProgramCacheKey = () => 'hexland-bevel-flow';
  material.needsUpdate = true;
  return material;
}

/** Wie breit die Rundung an der Kante ist, als Anteil des halben Durchmessers. */
const BEVEL = 0.075;

/** Die Adressen der Böden beginnen so (`HexModels.ground`). */
const GROUND = 'ground:';
/** Auf Fluss- und Wegkacheln beginnt der Boden erst so weit draußen (Anteil der Kante). */
const RING_INNER = 0.55;
/**
 * **Wie weit die Grenze innen von der Mitte abrückt**, je Länge des Laufs,
 * als Anteil des Halbmessers — positiv in das Stück hinein. Paare, die sich
 * eine Kachel teilen (1 und 5, 2 und 4, 3 und 3), haben entgegengesetzte
 * Zahlen: Dann laufen ihre beiden Kurven genau aufeinander, ohne Spalt.
 */
const RUN_BOW: Readonly<Record<number, number>> = { 1: 0.16, 2: 0.1, 3: 0, 4: -0.1, 5: -0.16 };

/** Wie tief die Bucht des Wasser-Endstücks reicht (Mitte der Kurve, in Eckabständen). */
const BAY_BOW = -0.15;
/** Die Farbe des Wassers in der Bucht — wie das Wasser der Ufer-Kacheln. */
const WATER_COLOUR = 0x56a9e2;

/**
 * **Ein Lauf von `length` Kanten ab Kante 0** — außen die Kachelkante, gerade
 * und scharf; innen eine Kurve durch die Nähe der Mitte (eine quadratische
 * Kurve von Ecke zu Ecke, deren Mitte bei `RUN_BOW` liegt). So sind die
 * Grenzen zwischen zwei Gebieten auf einer Kachel weich, die zur Nachbarkachel
 * nicht.
 */
function runGeometry(length: number, y: number, bowOverride?: number): THREE.BufferGeometry {
  const r = 2 / Math.sqrt(3);
  const corner = (j: number): THREE.Vector2 => {
    const a = ((60 * j + 30) * Math.PI) / 180;
    return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
  };
  const shape = new THREE.Shape();
  const start = corner(-1);
  shape.moveTo(start.x, start.y);
  const last = Math.min(length, 6);
  for (let j = 0; j < last; j++) {
    const c = corner(j);
    shape.lineTo(c.x, c.y);
  }
  if (length < 6) {
    const end = corner(length - 1);
    const bisector = ((length - 1) * 30 * Math.PI) / 180;
    const bow = (bowOverride ?? RUN_BOW[length] ?? 0) * r;
    const mid = new THREE.Vector2(Math.cos(bisector) * bow, Math.sin(bisector) * bow);
    const chord = start.clone().add(end).multiplyScalar(0.5);
    // Die Mitte einer quadratischen Kurve liegt halb zwischen Sehnenmitte und Stützpunkt.
    const control = mid.multiplyScalar(2).sub(chord);
    shape.quadraticCurveTo(control.x, control.y, start.x, start.y);
  }
  const flat = new THREE.ShapeGeometry(shape, 12);
  // Aus der Ebene des Bildes (x, y) wird der Boden (x, z), knapp über der Oberseite.
  const from = flat.getAttribute('position');
  const position = new Float32Array(from.count * 3);
  const normal = new Float32Array(from.count * 3);
  const uv = new Float32Array(from.count * 2);
  for (let i = 0; i < from.count; i++) {
    const x = from.getX(i);
    const z = from.getY(i);
    position.set([x, y, z], i * 3);
    normal.set([0, 1, 0], i * 3);
    uv.set([x * 1.5, z * 1.5], i * 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  // Beim Umklappen auf den Boden kehrt sich die Laufrichtung der Dreiecke um —
  // ohne den Tausch zeigten sie nach unten und blieben schwarz.
  const index = flat.index ? Array.from(flat.index.array) : [];
  for (let i = 0; i + 2 < index.length; i += 3) {
    const b = index[i + 1]!;
    index[i + 1] = index[i + 2]!;
    index[i + 2] = b;
  }
  geometry.setIndex(index);
  flat.dispose();
  return geometry;
}

/**
 * **Das Dreieck von der Mitte bis an Kante 0** — oder sein äußerer Teil ab
 * `inner`, bis `outer` (beides Anteile, 1 ist die Kante). In Einheiten des
 * Regals, knapp über der Oberseite (`y`). Die Texturkoordinaten sind die
 * Lage in der Ebene, damit die Furchen über die ganze Kachel gleich laufen.
 */
function sectorGeometry(inner: number, outer: number, y: number): THREE.BufferGeometry {
  const r = 2 / Math.sqrt(3);
  const a = { x: Math.cos(-Math.PI / 6) * r, z: Math.sin(-Math.PI / 6) * r };
  const b = { x: Math.cos(Math.PI / 6) * r, z: Math.sin(Math.PI / 6) * r };
  const points: Array<[number, number]> = [];
  if (inner > 0) {
    points.push([a.x * inner, a.z * inner], [b.x * outer, b.z * outer], [a.x * outer, a.z * outer]);
    points.push([a.x * inner, a.z * inner], [b.x * inner, b.z * inner], [b.x * outer, b.z * outer]);
  } else {
    // Mitte, dann B vor A: so zeigt die Fläche nach oben.
    points.push([0, 0], [b.x * outer, b.z * outer], [a.x * outer, a.z * outer]);
  }
  const position = new Float32Array(points.length * 3);
  const uv = new Float32Array(points.length * 2);
  points.forEach(([x, z], i) => {
    position.set([x, y, z], i * 3);
    uv.set([x * 1.5, z * 1.5], i * 2);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  return geometry;
}

/** **Der Acker unter dem Weizen** — braune Erde mit dunkleren Furchen. */
function fieldTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#93704a';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#7a5a38';
  for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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
  for (const patch of groundPatches(spec)) {
    _q.setFromAxisAngle(_up, -patch.edge * (Math.PI / 3));
    out.push({
      model: `${GROUND}${patch.kind}:${patch.ring ? 'ring' : `run${patch.length}`}`,
      local: new THREE.Matrix4().makeRotationFromQuaternion(_q),
    });
  }
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
  /** Wo die Grundkachel jeder Kachel in den Bündeln steht — für den Fluss. */
  private readonly bases = new Map<string, Array<{ batch: Batch; index: number }>>();
  /** Jede Kopie jeder Kachel in den Bündeln, mit ihrer Ruhelage — für `hop`. */
  private readonly parts = new Map<
    string,
    Array<{ batch: Batch; index: number; rest: THREE.Matrix4 }>
  >();
  /** Kacheln, die gerade springen: wie weit im Sprung (negativ: wartet noch). */
  private readonly hops = new Map<string, number>();

  /**
   * **Ein fertiger Auftrag springt** — alle Kacheln seines Gebiets hüpfen kurz
   * hoch und plumpsen mit einem kleinen Nachfedern zurück, von der
   * Auftragskachel aus leicht versetzt wie eine Welle. Gewünscht: _„wenn ein
   * Auftrag abgeschlossen ist, dass dann die Tiles, die dem Auftrag dazu
   * gehörten, alle leicht nach oben gehen und dann runterfallen auf die
   * normale Position wieder, wie so ein gemeinsamer Sprung bzw. wie bei Lego
   * spielen, wenn am Ende das Objekt fertig ist."_ Gibt zurück, wie lange
   * er dauert, in Sekunden.
   */
  hop(tiles: readonly Hex[], from: Hex): number {
    let last = 0;
    for (const t of tiles) {
      const key = hexKey(t.q, t.r);
      if (!this.parts.has(key)) continue;
      const dq = t.q - from.q;
      const dr = t.r - from.r;
      const rings = (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
      this.hops.set(key, -rings * HOP_STAGGER);
      last = Math.max(last, rings * HOP_STAGGER);
    }
    // So lange dauert der ganze Sprung, bis die letzte Kachel liegt.
    return last + HOP_TIME;
  }

  /** Einmal je Bild, vor `flush`: die springenden Kacheln ein Stück weiter. */
  animate(dt: number): void {
    for (const [key, t] of this.hops) {
      const now = t + dt;
      const parts = this.parts.get(key);
      if (!parts) {
        this.hops.delete(key);
        continue;
      }
      const u = now / HOP_TIME;
      const done = u >= 1;
      if (done) this.hops.delete(key);
      else this.hops.set(key, now);
      if (u < 0) continue;
      const y = done ? 0 : hopHeight(u);
      _hop.makeTranslation(0, y, 0);
      for (const { batch, index, rest } of parts) {
        batch.matrices[index]!.multiplyMatrices(_hop, rest);
        batch.dirty = true;
      }
    }
  }

  /** Zählt jedes `clear` — eine Kachel, die noch lud, als geleert wurde, kommt nicht mehr dazu. */
  private generation = 0;
  /** Die Pfeile der Flussrichtung (`showArrows`), einer je Arm. */
  private readonly arrows: THREE.InstancedMesh;

  /**
   * `tiles` ist das Brett in der Reihenfolge des Legens — die Richtung der
   * Flüsse hängt daran (`hexDressing.riverFlow`).
   */
  constructor(
    private readonly models: HexModels,
    private readonly tiles: () => ReadonlyMap<string, PlacedTile>,
  ) {
    this.root.name = 'hexland-board';
    this.arrows = new THREE.InstancedMesh(
      arrowGeometry(),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        toneMapped: false,
      }),
      64,
    );
    this.arrows.count = 0;
    this.arrows.frustumCulled = false;
    this.arrows.renderOrder = 3;
    this.arrows.visible = false;
    this.arrows.name = 'hexland-river-arrows';
    this.root.add(this.arrows);
  }

  /**
   * **Pfeile auf den Flüssen** — gewünscht: _„Füge eine Grafik-Option ein, um
   * Pfeil-Richtungen anzeigen zu können bei den Flüssen."_
   */
  showArrows(on: boolean): void {
    this.arrows.visible = on;
  }

  async add(tile: PlacedTile): Promise<void> {
    const list = pieces(tile.spec);
    const generation = this.generation;
    const loaded = await Promise.all(list.map((p) => this.models.load(p.model)));
    // Inzwischen geleert (neue Partie, anderer Modus) — die Kachel gehört zum
    // alten Brett. Oder sie liegt schon: Zweimal gezeichnet flimmerten beide
    // Kopien ineinander.
    const key = hexKey(tile.q, tile.r);
    if (this.disposed || generation !== this.generation || this.bases.has(key)) return;
    const at = tileMatrix(tile.q, tile.r, tile.rot);
    const bases: Array<{ batch: Batch; index: number }> = [];
    const all: Array<{ batch: Batch; index: number; rest: THREE.Matrix4 }> = [];
    list.forEach((piece, i) => {
      _m.multiplyMatrices(at, piece.local);
      for (const part of loaded[i]!) {
        const batch = this.batch(part);
        const index = batch.add(_m);
        if (part.flows) bases.push({ batch, index });
        all.push({ batch, index, rest: batch.matrices[index]!.clone() });
      }
    });
    this.bases.set(key, bases);
    this.parts.set(key, all);
    this.updateFlow();
  }

  clear(): void {
    this.generation++;
    for (const batch of this.batches.values()) batch.clear();
    this.bases.clear();
    this.parts.clear();
    this.hops.clear();
    this.arrows.count = 0;
  }

  /**
   * **Die Fließrichtung neu** (`hexDressing.riverFlow`) — bei jeder Kachel, denn
   * eine neue kann zwei Flüsse verbinden und einen umdrehen.
   */
  private updateFlow(): void {
    const tiles = this.tiles();
    const flows = riverFlow(tiles);
    for (const [key, list] of this.bases) {
      const f = flows.get(key);
      const value = f ? [f.into, f.out, f.centre, 2] : STILL;
      for (const { batch, index } of list) batch.setFlow(index, value);
    }
    // Je Arm ein Pfeil, halb zwischen Mitte und Kante: hinaus zeigt er zur
    // Kante, herein zur Mitte.
    const placed: THREE.Matrix4[] = [];
    for (const [key, f] of flows) {
      const tile = tiles.get(key);
      if (!tile || !this.bases.has(key)) continue;
      const at = tileMatrix(tile.q, tile.r, tile.rot);
      for (let e = 0; e < 6; e++) {
        const out = (f.out >> e) & 1;
        if (!out && !((f.into >> e) & 1)) continue;
        const a = (e * Math.PI) / 3;
        _q.setFromAxisAngle(_up, -a + (out ? 0 : Math.PI));
        const local = new THREE.Matrix4().compose(
          _p.set(Math.cos(a) * 0.55, 0.03, Math.sin(a) * 0.55),
          _q,
          _s.setScalar(1),
        );
        placed.push(new THREE.Matrix4().multiplyMatrices(at, local));
      }
    }
    const arrows = this.arrows;
    if (placed.length > arrows.instanceMatrix.count) {
      const size = 2 ** Math.ceil(Math.log2(placed.length));
      arrows.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(size * 16), 16);
    }
    placed.forEach((m, i) => arrows.setMatrixAt(i, m));
    arrows.count = placed.length;
    arrows.instanceMatrix.needsUpdate = true;
  }

  /** Einmal je Bild: was sich geändert hat, auf die Grafikkarte. */
  flush(): void {
    for (const batch of this.batches.values()) batch.flush();
  }

  dispose(): void {
    this.disposed = true;
    for (const batch of this.batches.values()) batch.dispose();
    this.batches.clear();
    this.arrows.geometry.dispose();
    (this.arrows.material as THREE.Material).dispose();
    this.arrows.dispose();
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

/** Wie lange ein Sprung dauert, und wie weit der Nachbar später losspringt, in Sekunden. */
const HOP_TIME = 0.75;
const HOP_STAGGER = 0.06;
/** Wie hoch, in Metern. */
const HOP_HEIGHT = 0.55;
const _hop = new THREE.Matrix4();

/**
 * **Die Höhe im Sprung** bei `u` (0…1): schnell hoch, kurz oben, dann fallen
 * mit zweimal kleinem Nachfedern — wie ein Steinchen, das aufgesetzt wird.
 */
function hopHeight(u: number): number {
  const up = 0.35;
  if (u < up) return HOP_HEIGHT * Math.sin(((u / up) * Math.PI) / 2);
  const v = (u - up) / (1 - up);
  // Fallen (Parabel) bis 55 %, dann zwei kleine Hüpfer.
  if (v < 0.55) return HOP_HEIGHT * (1 - (v / 0.55) ** 2);
  if (v < 0.82) return HOP_HEIGHT * 0.16 * Math.sin(((v - 0.55) / 0.27) * Math.PI);
  return HOP_HEIGHT * 0.05 * Math.sin(((v - 0.82) / 0.18) * Math.PI);
}

/**
 * **Ein Pfeil**, flach, mit der Spitze nach +x — in Maßen der Kachel
 * (Kante zu Mitte 1): Schaft und Spitze zusammen 0,4 lang.
 */
function arrowGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.2, -0.035);
  shape.lineTo(0.04, -0.035);
  shape.lineTo(0.04, -0.1);
  shape.lineTo(0.2, 0);
  shape.lineTo(0.04, 0.1);
  shape.lineTo(0.04, 0.035);
  shape.lineTo(-0.2, 0.035);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  // Die Form liegt in x/y; aufs Brett gelegt, Vorderseite nach oben (Spitze bleibt bei +x).
  geometry.rotateX(-Math.PI / 2);
  return geometry;
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
