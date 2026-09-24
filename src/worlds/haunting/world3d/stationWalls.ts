import * as THREE from 'three';
import { canLoadModels } from '../../../core/chefFit';
import { ModelGhosts } from '../../grid/modelGhost';
import type { PlanSolid } from '../../grid/solids';
import { PLAN_WALL_H, PLAN_WALL_T } from '../../editor/levelPlan';
import { TILE } from '../../nav/navTile';

/**
 * **Die Wände der Station kommen aus dem Regal** — die graue Prototyp-Wand mit
 * dem gelben Rand unten (`prototype-bits/Wall.glb`).
 *
 * Gewünscht war: _„Dann will ich die Wände dort ändern, zu der im Foto
 * angehängten Wall mit dem gelben Rand unten … Dann sollen bei der Space
 * Station diese Wände genutzt werden."_ — dieselbe Umstellung, die die
 * Testwelt schon hinter sich hat: Grundriss auf dem Kachelgitter, das Bild aus
 * dem Regal.
 *
 * **Der Grundriss bleibt, wie er ist.** Die Quader der Wandläufe
 * (`plan.StationPlan.solids`, `mergeWalls`) tragen weiter Körper, Wegsuche und
 * Ghosting; sie werden nur unsichtbar, sobald die Wand aus dem Regal dasteht
 * (`HauntingWorld.solidMaterial`). Kommt die Datei nicht an — kein WebGL, ein
 * Checkout ohne die gekauften Pakete —, bleiben sie stehen und sind die Wand.
 * Tür- und Fensterteile (Sturz, Brüstung, Pfosten) sind keine Läufe und
 * bleiben gebaute Quader.
 *
 * **Ein Lauf wird mit Stücken von zwei Kacheln belegt** und, wenn er ungerade
 * ist, mit einem halben am Ende (`Wall_Half.glb`) — beide im Maßstab der
 * grünen Restaurantwand (`core/kaykitFit.KAYKIT_FILE_SCALE`: 2 × 2 m und
 * 1 × 2 m). Gestreckt wird nur in die Höhe, auf die Wandhöhe der Station
 * (`PLAN_WALL_H`, 2,8 m): Die Türen sind 2,1 m hoch, und eine Wand von 2 m
 * stünde niedriger als der Türsturz darüber.
 *
 * **Zwei Bilder derselben Wand**, wie beim Grundriss selbst
 * (`GridWorld.showGhostBatches`): Von oben steht jeder Lauf einzeln da, damit
 * er durchsichtig werden kann, wenn er die Figur verdeckt (`ghost`); aus den
 * Augen sind die Läufe zu wenigen Netzen je Feld von `CELL` Metern
 * verschmolzen — in der Brille zählt jeder Zeichenaufruf, und dort wird nicht
 * geghostet.
 */
export const STATION_WALL = 'prototype-bits/Wall.glb';
export const STATION_WALL_HALF = 'prototype-bits/Wall_Half.glb';

/**
 * **Wie weit ein Lauf über seine Enden hinausreicht**, je Ende in Metern.
 *
 * Die Wand aus dem Regal ist dicker als der Quader darunter (0,27 statt
 * `PLAN_WALL_T` 0,2 m) und hat an den Enden eine Fase. Stoßen zwei Läufe über
 * Eck aneinander, bliebe in der Ecke ein Loch von der halben Wanddicke; um die
 * halbe Dicke des Quaders verlängert, schließt sie.
 */
export const WALL_REACH = PLAN_WALL_T / 2;

/** Wie groß ein Feld ist, zu dem die Läufe für die Augen verschmolzen werden. */
export const CELL = 16;

/** Ein gerader Wandlauf in Weltmetern — Mitte, Länge, Richtung, Fuß und Höhe. */
export interface WallRun {
  x: number;
  z: number;
  length: number;
  alongX: boolean;
  base: number;
  height: number;
}

/** Ein Stück eines Laufs: die Mitte längs des Laufs (von seiner Mitte aus) und die Länge. */
export interface WallPiece {
  along: number;
  length: number;
  half: boolean;
}

/**
 * **Ob ein Quader ein Wandlauf ist** — und wenn ja, welcher.
 *
 * Voll hoch, eine Wanddicke tief, ganze Kacheln lang und kein Türteil: genau
 * das, was `StationPlan.solids` zu Läufen zusammenlegt. Ein Sturz über der Tür
 * ist kürzer als die Wand, ein Fensterpfosten keine Kachel lang.
 */
export function wallRun(solid: PlanSolid): WallRun | null {
  if (solid.kind !== 'wall' || solid.door !== undefined) return null;
  if (solid.h < PLAN_WALL_H - 1e-6) return null;
  const alongX = solid.w > solid.d;
  const length = alongX ? solid.w : solid.d;
  const thick = alongX ? solid.d : solid.w;
  if (Math.abs(thick - PLAN_WALL_T) > 1e-6) return null;
  const tiles = length / TILE;
  if (tiles < 1 - 1e-6 || Math.abs(tiles - Math.round(tiles)) > 1e-6) return null;
  return {
    x: solid.x,
    z: solid.z,
    length,
    alongX,
    base: solid.y - solid.h / 2,
    height: solid.h,
  };
}

/**
 * **Die Stücke eines Laufs** — ganze Wände zu zwei Kacheln, am Ende eine halbe.
 *
 * Alles in Metern und schon um `WALL_REACH` gestreckt: Die Stücke reichen
 * zusammen von `−length/2 − WALL_REACH` bis `+length/2 + WALL_REACH`.
 */
export function runPieces(run: WallRun): WallPiece[] {
  const tiles = Math.round(run.length / TILE);
  const stretch = (run.length + 2 * WALL_REACH) / run.length;
  const pieces: WallPiece[] = [];
  let from = -run.length / 2;
  for (let left = tiles; left > 0;) {
    const half = left === 1;
    const length = (half ? 1 : 2) * TILE;
    pieces.push({ along: (from + length / 2) * stretch, length: length * stretch, half });
    from += length;
    left -= half ? 1 : 2;
  }
  return pieces;
}

/** Ein Stück aus dem Regal, auf null gestellt: Mitte in x und z, Unterkante auf null. */
interface Unit {
  geometry: THREE.BufferGeometry;
  /** Vom Netz der Datei in dieses auf null gestellte Stück. */
  matrix: THREE.Matrix4;
  /** Länge (x) und Höhe (y) in Metern. */
  length: number;
  height: number;
}

const _box = new THREE.Box3();
const _m = new THREE.Matrix4();
const _t = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

/** Die Wände einer Station — geladen, gebaut, und beim Umbau wieder weg. */
export class StationWalls {
  private readonly group = new THREE.Group();
  /** Von oben: ein Netz je Lauf, geschlüsselt nach dem Quader, über dem es steht. */
  private readonly single = new Map<THREE.Object3D, THREE.Mesh>();
  /** Aus den Augen: die verschmolzenen Felder. */
  private readonly merged: THREE.Mesh[] = [];
  private readonly ghosts = new ModelGhosts(0.25);
  private readonly faded = new Set<THREE.Object3D>();
  private readonly owned: { dispose(): void }[] = [];
  private gone = false;
  private topDown: boolean | null = null;

  /**
   * @param runs    die Läufe, jeder mit dem Quader des Grundrisses, der ihn trägt
   * @param ready   gerufen, sobald die Wände wirklich dastehen — dann dürfen
   *                die Quader aus dem Bild
   */
  constructor(
    root: THREE.Object3D,
    private readonly runs: readonly { solid: THREE.Object3D; run: WallRun }[],
    private readonly ready: () => void,
  ) {
    this.group.name = 'station-walls';
    this.group.userData.level = 0;
    root.add(this.group);
    if (!canLoadModels() || runs.length === 0) return;
    void import('../../../core/kaykitModel').then(async (module) => {
      const [full, half] = await Promise.all([
        module.kaykitModel(STATION_WALL),
        module.kaykitModel(STATION_WALL_HALF),
      ]);
      this.build(full, half);
    });
  }

  /** Von oben oder aus den Augen — je Bild gefragt, getauscht nur beim Wechsel. */
  setTopDown(on: boolean): void {
    if (this.topDown === on) return;
    this.topDown = on;
    for (const mesh of this.single.values()) mesh.visible = on;
    for (const mesh of this.merged) mesh.visible = !on;
    if (!on) this.ghost(null, false);
  }

  /** Der Lauf über diesem Quader ist gerade durchsichtig — oder nicht mehr. */
  ghost(solid: THREE.Object3D | null, on: boolean): void {
    if (solid === null) this.faded.clear();
    else {
      const mesh = this.single.get(solid);
      if (!mesh) return;
      if (on) this.faded.add(mesh);
      else this.faded.delete(mesh);
    }
    this.ghosts.apply(this.faded);
  }

  dispose(): void {
    this.gone = true;
    this.ghosts.dispose();
    for (const one of this.owned) one.dispose();
    this.owned.length = 0;
    this.single.clear();
    this.merged.length = 0;
    this.group.removeFromParent();
  }

  private build(full: THREE.Object3D | null, half: THREE.Object3D | null): void {
    const wall = full ? unitOf(full) : null;
    const short = half ? unitOf(half) : null;
    const material = full ? materialOf(full) : null;
    if (half) for (const one of materialsOf(half)) one.dispose();
    if (this.gone || !wall || !short || !material) {
      material?.dispose();
      return;
    }
    this.owned.push(material);

    const cells = new Map<string, Placed[]>();
    for (const { solid, run } of this.runs) {
      const parts: Placed[] = runPieces(run).map((piece) => {
        const unit = piece.half ? short : wall;
        return { geometry: unit.geometry, matrix: pieceMatrix(run, piece, unit) };
      });
      const shape = bake(parts);
      if (!shape) continue;
      this.owned.push(shape);
      const mesh = this.mesh(shape, material, 'station-wall-run');
      mesh.visible = this.topDown === true;
      this.single.set(solid, mesh);
      const key = `${Math.floor(run.x / CELL)}:${Math.floor(run.z / CELL)}`;
      const cell = cells.get(key) ?? [];
      cell.push(...parts);
      cells.set(key, cell);
    }
    for (const parts of cells.values()) {
      const shape = bake(parts);
      if (!shape) continue;
      this.owned.push(shape);
      const mesh = this.mesh(shape, material, 'station-wall-cell');
      mesh.visible = this.topDown !== true;
      this.merged.push(mesh);
    }
    this.ready();
  }

  private mesh(shape: THREE.BufferGeometry, material: THREE.Material, name: string): THREE.Mesh {
    const mesh = new THREE.Mesh(shape, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.level = 0;
    this.group.add(mesh);
    return mesh;
  }
}

interface Placed {
  geometry: THREE.BufferGeometry;
  matrix: THREE.Matrix4;
}

/** Wo ein Stück steht: auf dem Lauf, gedreht in seine Richtung, gestreckt auf Länge und Höhe. */
function pieceMatrix(run: WallRun, piece: WallPiece, unit: Unit): THREE.Matrix4 {
  const x = run.x + (run.alongX ? piece.along : 0);
  const z = run.z + (run.alongX ? 0 : piece.along);
  _q.setFromAxisAngle(_up, run.alongX ? 0 : Math.PI / 2);
  _m.compose(
    new THREE.Vector3(x, run.base, z),
    _q,
    new THREE.Vector3(piece.length / unit.length, run.height / unit.height, 1),
  );
  return new THREE.Matrix4().multiplyMatrices(_m, unit.matrix);
}

/** Das eine Netz einer Datei, gemessen und auf null gestellt. */
function unitOf(model: THREE.Object3D): Unit | null {
  let mesh: THREE.Mesh | null = null;
  let count = 0;
  model.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      mesh = object as THREE.Mesh;
      count++;
    }
  });
  if (!mesh || count !== 1) return null;
  const only = mesh as THREE.Mesh;
  model.position.set(0, 0, 0);
  model.updateMatrixWorld(true);
  _box.setFromObject(model);
  const length = _box.max.x - _box.min.x;
  const height = _box.max.y - _box.min.y;
  if (!(length > 1e-6) || !(height > 1e-6)) return null;
  _t.makeTranslation(-(_box.min.x + _box.max.x) / 2, -_box.min.y, -(_box.min.z + _box.max.z) / 2);
  return {
    geometry: only.geometry,
    matrix: new THREE.Matrix4().multiplyMatrices(_t, only.matrixWorld),
    length,
    height,
  };
}

function materialsOf(model: THREE.Object3D): THREE.Material[] {
  const out: THREE.Material[] = [];
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const one of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) out.push(one);
  });
  return out;
}

function materialOf(model: THREE.Object3D): THREE.Material | null {
  const all = materialsOf(model);
  for (const extra of all.slice(1)) extra.dispose();
  return all[0] ?? null;
}

/**
 * **Viele Stücke zu einer Geometrie**, die Matrizen eingebacken.
 *
 * Gelesen wird über `fromBufferAttribute`/`getComponent` und nicht aus dem
 * Puffer: Die Dateien des Regals sind quantisiert (`Int16`, normalisiert),
 * und erst diese Zugriffe rechnen daraus Meter. Geschrieben wird in `Float32`.
 */
export function bake(parts: readonly Placed[]): THREE.BufferGeometry | null {
  const first = parts[0]?.geometry;
  if (!first || !first.attributes.position) return null;
  const names = Object.keys(first.attributes)
    .filter((name) => name === 'position' || name === 'normal' || name === 'uv')
    .filter((name) => parts.every((part) => part.geometry.attributes[name] !== undefined));
  let vertices = 0;
  for (const part of parts) vertices += part.geometry.attributes.position!.count;
  const out = new THREE.BufferGeometry();
  const vector = new THREE.Vector3();
  const normal = new THREE.Matrix3();
  for (const name of names) {
    const size = first.attributes[name]!.itemSize;
    const values = new Float32Array(vertices * size);
    let at = 0;
    for (const part of parts) {
      const source = part.geometry.attributes[name] as THREE.BufferAttribute;
      if (name === 'normal') normal.getNormalMatrix(part.matrix);
      for (let i = 0; i < source.count; i++) {
        if (name === 'position' || name === 'normal') {
          vector.fromBufferAttribute(source, i);
          if (name === 'position') vector.applyMatrix4(part.matrix);
          else vector.applyMatrix3(normal).normalize();
          values[at] = vector.x;
          values[at + 1] = vector.y;
          values[at + 2] = vector.z;
        } else for (let c = 0; c < size; c++) values[at + c] = source.getComponent(i, c);
        at += size;
      }
    }
    out.setAttribute(name, new THREE.BufferAttribute(values, size));
  }
  const index: number[] = [];
  let offset = 0;
  for (const part of parts) {
    const geometry = part.geometry;
    const count = geometry.attributes.position!.count;
    if (geometry.index)
      for (let i = 0; i < geometry.index.count; i++) index.push(offset + geometry.index.getX(i));
    else for (let i = 0; i < count; i++) index.push(offset + i);
    offset += count;
  }
  out.setIndex(index);
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}
