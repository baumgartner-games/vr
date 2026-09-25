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
  /**
   * **Eine schräge Wand** (`GridPlan.slope`, die Ecken der Station): um
   * diesen Winkel gedreht, statt längs x oder z. Sie ist ein Stück, so lang
   * wie die Diagonale ihrer Kachel.
   */
  yaw?: number;
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
  if (solid.yaw) {
    // Die Schräge (`gridPlan.slopeSolid`): längs ihrer eigenen x-Achse √2 lang.
    if (Math.abs(Math.abs(solid.yaw) - Math.PI / 4) > 1e-6) return null;
    return {
      x: solid.x,
      z: solid.z,
      length: solid.w,
      alongX: true,
      base: solid.y - solid.h / 2,
      height: solid.h,
      yaw: solid.yaw,
    };
  }
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
  // Eine Schräge ist ein halbes Stück, gestreckt über die Diagonale.
  if (run.yaw) return [{ along: 0, length: run.length + 2 * WALL_REACH, half: true }];
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

/**
 * **Ein Durchgang oder ein Fenster aus dem Regal** an einer Stelle der Station
 * — in seiner eigenen Größe (`kaykitFit.KAYKIT_FILE_SCALE`), mit der Mitte auf
 * der Kante, längs der Wand gedreht. `solids` sind die Quader des Grundrisses,
 * die an seiner Stelle stehen (Sturz, Brüstung, Pfosten): Wird einer davon von
 * oben durchsichtig, wird es das Stück auch.
 */
export interface StationFeature {
  path: string;
  x: number;
  z: number;
  alongX: boolean;
  base: number;
  solids: THREE.Object3D[];
}

/** Ein Teil eines Stücks: eine Geometrie mit ihrem Material, auf null gestellt. */
interface UnitPart {
  geometry: THREE.BufferGeometry;
  /** Vom Netz der Datei in das auf null gestellte Stück. */
  matrix: THREE.Matrix4;
  /** Der Name des Materials — gleich benannte teilen sich eines (`prototype_texture`, `glass`). */
  material: string;
}

/** Ein Stück aus dem Regal, auf null gestellt: Mitte in x und z, Unterkante auf null. */
interface Unit {
  parts: UnitPart[];
  /** Länge (x) und Höhe (y) in Metern. */
  length: number;
  height: number;
}

const _box = new THREE.Box3();
const _m = new THREE.Matrix4();
const _t = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

/** Die Wände, Durchgänge und Fenster einer Station — geladen, gebaut, und beim Umbau wieder weg. */
export class StationWalls {
  private readonly group = new THREE.Group();
  /** Von oben: eine Gruppe je Lauf oder Stück, geschlüsselt nach den Quadern darunter. */
  private readonly single = new Map<THREE.Object3D, THREE.Group>();
  /** Aus den Augen: die verschmolzenen Felder. */
  private readonly merged: THREE.Mesh[] = [];
  private readonly ghosts = new ModelGhosts(0.25);
  /** Welche Quader einer Gruppe gerade durchsichtig sind. */
  private readonly faded = new Map<THREE.Group, Set<THREE.Object3D>>();
  private readonly owned: { dispose(): void }[] = [];
  private gone = false;
  private topDown: boolean | null = null;

  /**
   * @param runs     die Läufe, jeder mit dem Quader des Grundrisses, der ihn trägt
   * @param features Durchgänge und Fenster (`StationFeature`)
   * @param ready    gerufen, sobald alles wirklich dasteht — dann dürfen die
   *                 Quader aus dem Bild
   */
  constructor(
    root: THREE.Object3D,
    private readonly runs: readonly { solid: THREE.Object3D; run: WallRun }[],
    private readonly features: readonly StationFeature[],
    private readonly ready: () => void,
  ) {
    this.group.name = 'station-walls';
    this.group.userData.level = 0;
    root.add(this.group);
    if (!canLoadModels() || runs.length + features.length === 0) return;
    const paths = [
      ...new Set([STATION_WALL, STATION_WALL_HALF, ...features.map((one) => one.path)]),
    ];
    void import('../../../core/kaykitModel').then(async (module) => {
      const models = await Promise.all(paths.map((path) => module.kaykitModel(path)));
      this.build(new Map(paths.map((path, i) => [path, models[i] ?? null])));
    });
  }

  /** Von oben oder aus den Augen — je Bild gefragt, getauscht nur beim Wechsel. */
  setTopDown(on: boolean): void {
    if (this.topDown === on) return;
    this.topDown = on;
    for (const group of new Set(this.single.values())) group.visible = on;
    for (const mesh of this.merged) mesh.visible = !on;
    if (!on) this.ghost(null, false);
  }

  /** Der Quader `solid` ist gerade durchsichtig — oder nicht mehr; sein Stück folgt ihm. */
  ghost(solid: THREE.Object3D | null, on: boolean): void {
    if (solid === null) this.faded.clear();
    else {
      const group = this.single.get(solid);
      if (!group) return;
      const set = this.faded.get(group) ?? new Set<THREE.Object3D>();
      if (on) set.add(solid);
      else set.delete(solid);
      if (set.size) this.faded.set(group, set);
      else this.faded.delete(group);
    }
    this.ghosts.apply(this.faded.keys());
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

  private build(models: ReadonlyMap<string, THREE.Object3D | null>): void {
    // **Ein Material je Name** für alle Stücke: Sie teilen die Textur des
    // Pakets, und so lassen sie sich zusammen zeichnen. Die Materialien der
    // übrigen Kopien gehen gleich wieder weg.
    const materials = new Map<string, THREE.Material>();
    const units = new Map<string, Unit>();
    for (const [path, model] of models) {
      if (!model) continue;
      for (const material of materialsOf(model)) {
        if (!materials.has(material.name)) materials.set(material.name, material);
        else material.dispose();
      }
      const unit = unitOf(model);
      if (unit) units.set(path, unit);
    }
    this.owned.push(...materials.values());
    const wall = units.get(STATION_WALL);
    const short = units.get(STATION_WALL_HALF);
    if (this.gone || !wall || !short) {
      for (const one of materials.values()) one.dispose();
      this.owned.length = 0;
      return;
    }

    const cells = new Map<string, Placed[]>();
    const place = (
      keys: readonly THREE.Object3D[],
      parts: Placed[],
      x: number,
      z: number,
    ): void => {
      const group = this.pieceGroup(parts, materials);
      if (!group) return;
      for (const key of keys) this.single.set(key, group);
      const cell = `${Math.floor(x / CELL)}:${Math.floor(z / CELL)}`;
      cells.set(cell, [...(cells.get(cell) ?? []), ...parts]);
    };
    for (const { solid, run } of this.runs) {
      const parts = runPieces(run).flatMap((piece) => {
        const unit = piece.half ? short : wall;
        return placedParts(unit, pieceMatrix(run, piece, unit));
      });
      place([solid], parts, run.x, run.z);
    }
    for (const feature of this.features) {
      const unit = units.get(feature.path);
      if (!unit) continue;
      _q.setFromAxisAngle(_up, feature.alongX ? 0 : Math.PI / 2);
      const at = new THREE.Matrix4().compose(
        new THREE.Vector3(feature.x, feature.base, feature.z),
        _q,
        new THREE.Vector3(1, 1, 1),
      );
      place(feature.solids, placedParts(unit, at), feature.x, feature.z);
    }
    for (const parts of cells.values())
      for (const [name, material] of materials) {
        const shape = bake(parts.filter((part) => part.material === name));
        if (!shape) continue;
        this.owned.push(shape);
        const mesh = this.mesh(shape, material, 'station-wall-cell');
        mesh.visible = this.topDown !== true;
        this.group.add(mesh);
        this.merged.push(mesh);
      }
    this.ready();
  }

  /** Von oben: ein Lauf oder Stück als eigene Gruppe, ein Netz je Material. */
  private pieceGroup(
    parts: readonly Placed[],
    materials: ReadonlyMap<string, THREE.Material>,
  ): THREE.Group | null {
    const group = new THREE.Group();
    group.name = 'station-wall-run';
    group.visible = this.topDown === true;
    for (const [name, material] of materials) {
      const shape = bake(parts.filter((part) => part.material === name));
      if (!shape) continue;
      this.owned.push(shape);
      group.add(this.mesh(shape, material, 'station-wall-part'));
    }
    if (group.children.length === 0) return null;
    this.group.add(group);
    return group;
  }

  private mesh(shape: THREE.BufferGeometry, material: THREE.Material, name: string): THREE.Mesh {
    const mesh = new THREE.Mesh(shape, material);
    mesh.name = name;
    // Glas wirft keinen Schatten — sonst hielte das Fenster das Licht auf.
    mesh.castShadow = !material.transparent;
    mesh.receiveShadow = true;
    mesh.userData.level = 0;
    return mesh;
  }
}

interface Placed {
  geometry: THREE.BufferGeometry;
  matrix: THREE.Matrix4;
  material?: string;
}

/** Die Teile eines Stücks an ihrem Platz: `at` mal ihre eigene Matrix. */
function placedParts(unit: Unit, at: THREE.Matrix4): Placed[] {
  return unit.parts.map((part) => ({
    geometry: part.geometry,
    matrix: new THREE.Matrix4().multiplyMatrices(at, part.matrix),
    material: part.material,
  }));
}

/** Wo ein Wandstück steht: auf dem Lauf, gedreht in seine Richtung, gestreckt auf Länge und Höhe. */
function pieceMatrix(run: WallRun, piece: WallPiece, unit: Unit): THREE.Matrix4 {
  const x = run.x + (run.alongX ? piece.along : 0);
  const z = run.z + (run.alongX ? 0 : piece.along);
  _q.setFromAxisAngle(_up, run.yaw ?? (run.alongX ? 0 : Math.PI / 2));
  _m.compose(
    new THREE.Vector3(x, run.base, z),
    _q,
    new THREE.Vector3(piece.length / unit.length, run.height / unit.height, 1),
  );
  return new THREE.Matrix4().copy(_m);
}

/** Die Netze einer Datei, gemessen und gemeinsam auf null gestellt. */
function unitOf(model: THREE.Object3D): Unit | null {
  model.position.set(0, 0, 0);
  model.updateMatrixWorld(true);
  _box.setFromObject(model);
  const length = _box.max.x - _box.min.x;
  const height = _box.max.y - _box.min.y;
  if (!(length > 1e-6) || !(height > 1e-6)) return null;
  _t.makeTranslation(-(_box.min.x + _box.max.x) / 2, -_box.min.y, -(_box.min.z + _box.max.z) / 2);
  const parts: UnitPart[] = [];
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    parts.push({
      geometry: mesh.geometry,
      matrix: new THREE.Matrix4().multiplyMatrices(_t, mesh.matrixWorld),
      material: mesh.material.name,
    });
  });
  return parts.length ? { parts, length, height } : null;
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

/**
 * **Viele Stücke zu einer Geometrie**, die Matrizen eingebacken.
 *
 * Gelesen wird über `fromBufferAttribute`/`getComponent` und nicht aus dem
 * Puffer: Die Dateien des Regals sind quantisiert (`Int16`, normalisiert),
 * und erst diese Zugriffe rechnen daraus Meter. Geschrieben wird in `Float32`.
 */
export function bake(
  parts: readonly { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 }[],
): THREE.BufferGeometry | null {
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
