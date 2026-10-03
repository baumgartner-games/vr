import * as THREE from 'three';
import { canLoadModels } from '../../core/chefFit';
import type { SolidBlock } from '../grid/GridWorld';
import { DETAIL_OVERLAY } from '../../ui/previewGrid';
import { CELL as CELL_SIZE } from '../nav/cellGrid';
import type { KitchenItem } from '../test/zones/kitchenRecipes';
import { paintWallpaper } from '../house/wallpaperSkin';
import { builtPart, isBuiltPart } from './builtParts';
import { elementLit, type ElementPart, type GameElement } from './elementCatalog';
import {
  rotateOffset,
  spotCells,
  spotCentre,
  spotElement,
  spotFace,
  spotFront,
  spotSize,
  spotSolid,
  spotYaw,
  type ElementSpot,
} from './elementPlace';

/**
 * **Was eine Welt können muss, um Spielelemente hinzustellen** — fünf
 * Handgriffe, alle schon da (`TestRestaurantWorld.elementHost`).
 *
 * Eine Schnittstelle und keine Basisklasse: Die Welt bleibt, was sie ist
 * (eine `GridWorld`), und reicht nur durch, was sie ohnehin hat. Die Methoden
 * dort sind geschützt; die Welt baut sich dafür ein Objekt aus Pfeilen,
 * statt sie öffentlich zu machen.
 */
export interface ElementHost {
  /**
   * **Zellen sperren und den unsichtbaren Kasten stellen** — sofort
   * (`GridWorld.blockSolid`). Mitte und Maße in Metern.
   */
  blockSolid(
    cx: number,
    cz: number,
    w: number,
    d: number,
    height: number,
    level?: number,
  ): SolidBlock;
  /**
   * **Wie hoch der Boden einer Etage liegt** (`ElementSpot.level`), in Metern
   * — ohne die Antwort steht alles auf null.
   */
  floorY?(level: number): number;
  /**
   * **Das Bodenstück als festes Stück der Welt** (`PortalWorld.placeModel`):
   * die Mitte seiner Hülle auf `at`, gedreht um `yaw`.
   */
  placeModel(path: string, at: THREE.Vector3, yaw: number): Promise<unknown>;
  /** Wie groß ein Modell ist, wie es aus dem Regal kommt — `null`, wenn keines kam. */
  measure(path: string): Promise<THREE.Vector3 | null>;
  /** Eine eigene Kopie aus dem Regal (`kaykitModel`) — `null`, wenn keine kam. */
  load(path: string): Promise<THREE.Object3D | null>;
  /** Ins Bild damit — und merken, damit es beim Aufräumen mitgeht. */
  add(object: THREE.Object3D): void;
  /** Ob die Welt noch steht; nach dem Aufräumen wird nichts mehr hingestellt. */
  alive(): boolean;
}

/** **Ein hingestelltes Element** — was die Welt danach damit tut. */
export interface PlacedElement {
  readonly spot: ElementSpot;
  readonly element: GameElement;
  /**
   * **Der Anker an der Vorderkante** — auf dem Boden, in der Mitte der Seite,
   * auf die das Element schaut, und mit ihm gedreht (+z zeigt nach draußen,
   * zu dem, der davorsteht). Er hängt schon im Bild, bevor ein Modell kam:
   * Wer daran etwas Benutzbares hängt, muss nicht warten.
   */
  readonly anchor: THREE.Object3D;
  /**
   * **Wo abgelegt wird**, in Metern über dem Boden — die Oberkante des Teils
   * mit `surface`, sonst die des ersten: die Platte, der Rost, der Rand der
   * Kiste, das Brett. Gemessen, sobald die Modelle da sind; kam keines, eine
   * Arbeitsplatte (`FALLBACK_TOP`).
   */
  readonly top: number;
  /** Die gesperrten Zellen (`cellKey`) — dieselben wie `elementPlace.spotCells`. */
  readonly cells: readonly string[];
  /** Zellen und Kasten zusammen — für `GridWorld.unblockSolid`. */
  readonly block: SolidBlock;
  /** Die Modelle obenauf, je Teil — `null`, wo keines kam oder das Teil als Stück der Welt steht. */
  readonly parts: readonly (THREE.Object3D | null)[];
  /**
   * **Das Bodenstück als Stück der Welt**, sobald es steht — was
   * `ElementHost.placeModel` zurückgab (`null`: keines). Wer das Element
   * wieder wegnimmt (umstellen im Bau-Modus), räumt es damit ab.
   */
  readonly base: Promise<unknown> | null;
}

/** So hoch ist eine Arbeitsplatte — die Ablage, solange nichts gemessen ist. */
export const FALLBACK_TOP = 0.5;

/** Ein Teil, wie es hingestellt wurde — für das nächste, das darauf oder darin sitzt. */
interface Laid {
  /** Die Hülle im Bild (`null`, wenn das Teil als Stück der Welt steht). */
  readonly holder: THREE.Object3D | null;
  /** Oberkante über dem Boden. */
  readonly top: number;
  /** Für `inside`: Maßstab, Drehungen und Versatz, die das nächste übernimmt. */
  readonly scale: number;
  readonly tilt: readonly [number, number, number];
  readonly yaw: number;
  readonly shift: THREE.Vector3;
}

/**
 * **Ein Spielelement hinstellen.**
 *
 * **Zuerst die Sperre, und zwar noch bevor irgendetwas geladen wird**: Zellen
 * und Kasten stehen, sobald dieser Aufruf zurückkehrt — auch wenn danach kein
 * Modell kommt (kein WebGL, keine Leitung, ein falscher Name). Das Gitter ist
 * die Wahrheit (`docs/agents/zellgitter.md`), und ein Möbel, durch das man
 * läuft, solange es lädt, ist eines, durch das man läuft.
 *
 * Dann die Teile: das erste als festes Stück der Welt (`placeModel` — von oben
 * durchsichtig wie jede Wand, gebündelt gezeichnet), alles darauf nur als
 * Bild, gemessen und mit der Unterseite auf der Oberkante dessen, worauf es
 * steht. Braucht schon das erste Teil einen eigenen Maßstab oder ein
 * Umlegen — oder kann das Element selbst leuchten (`elementLit`) —, steht es
 * ebenfalls nur als Bild da; den Körper hat ohnehin der Kasten.
 */
export async function placeElement(host: ElementHost, spot: ElementSpot): Promise<PlacedElement> {
  const element = spotElement(spot);
  const face = spotFace(spot);
  const yaw = spotYaw(spot);
  const centre = spotCentre(spot);
  // Gesperrt wird, was sperrt (`spotSolid`): die Grundfläche, beim Baum nur
  // der Stamm, bei Gras nichts — dann auch kein Kasten.
  const [w, d] = spotSolid(spot);
  const block: SolidBlock =
    w > 0 && d > 0
      ? host.blockSolid(centre.x, centre.z, w, d, element.height, spot.level ?? 0)
      : { cells: [], mesh: new THREE.Mesh() };
  // Das Bild darf neben seinen Zellen stehen (`ElementSpot.offset`), die
  // Sperre nicht — sie steht schon.
  const [sx, sz] = spot.offset ?? [0, 0];
  // **Auf einer Ablage** (`ElementSpot.y`): alles um ihre Oberkante höher.
  const lift = spot.y ?? 0;
  // **Auf einer Etage** (`ElementSpot.level`): auf ihrem Boden. Die Oberkante
  // einer Ablage ist schon die ganze Höhe und zählt dann allein.
  const level = spot.level ?? 0;
  const ground = lift > 0 ? lift : level > 0 ? (host.floorY?.(level) ?? 0) : 0;

  const anchor = new THREE.Group();
  anchor.name = `element:${spot.id}`;
  const front = spotFront(spot);
  anchor.position.set(front.x + sx, ground, front.z + sz);
  // Damit es mit seiner Etage verschwindet (`core/cutaway.ts`), wie die
  // Wände oben — der Anker hier, die Teile beim Hinlegen.
  if (level > 0) anchor.userData.level = level;
  anchor.rotation.y = yaw;
  host.add(anchor);

  let base: Promise<unknown> | null = null;
  const placed = (top: number, parts: readonly (THREE.Object3D | null)[]): PlacedElement => ({
    spot,
    element,
    anchor,
    top,
    cells: block.cells,
    block,
    parts,
    base,
  });
  if (!canLoadModels())
    return placed(
      ground + FALLBACK_TOP,
      element.parts.map(() => null),
    );

  const [first] = element.parts;
  // Ein Element, das selbst leuchten kann (`elementLit`), braucht auch sein
  // erstes Teil als Bild: Nur ein Bild lässt sich unter den Anker der Station
  // hängen, und nur was dort hängt, bekommt den Saum.
  // Und eines mit eigener Sperre (`GameElement.solid`) auch: Als festes Stück
  // bekäme die ganze Krone eines Baums einen Körper, nicht nur der Stamm.
  // Und was auf einer Ablage steht, ist nur Bild: Den Körper hat die Ablage.
  const fixed =
    !!first && plainFloor(first) && !elementLit(element) && !element.solid && lift === 0;
  // Alles auf einmal holen, gestellt wird danach der Reihe nach: Was obenauf
  // liegt, braucht die Oberkante dessen, worauf es liegt.
  const [size, ...models] = await Promise.all([
    fixed && first ? host.measure(first.model) : Promise.resolve(null),
    ...element.parts.map((part, i) =>
      i === 0 && fixed
        ? Promise.resolve(null)
        : isBuiltPart(part.model)
          ? Promise.resolve(builtPart(part.model))
          : host.load(part.model),
    ),
  ]);
  if (!host.alive())
    return placed(
      FALLBACK_TOP,
      element.parts.map(() => null),
    );

  const laid: (Laid | null)[] = [];
  const views: (THREE.Object3D | null)[] = [];
  element.parts.forEach((part, i) => {
    const [ox, oz] = rotateOffset(face, part.at ?? [0, 0]);
    const x = centre.x + sx + ox;
    const z = centre.z + sz + oz;
    if (i === 0 && fixed) {
      if (!size) {
        laid.push(null);
        views.push(null);
        return;
      }
      base = host.placeModel(
        part.model,
        new THREE.Vector3(x, ground + size.y / 2, z),
        yaw + (part.yaw ?? 0),
      );
      laid.push({
        holder: null,
        top: ground + size.y,
        scale: 1,
        tilt: [0, 0, 0],
        yaw: 0,
        shift: new THREE.Vector3(),
      });
      views.push(null);
      return;
    }
    const loaded = models[i] ?? null;
    const model = loaded && part.node ? pickNode(loaded, part.node) : loaded;
    if (!model) {
      laid.push(null);
      views.push(null);
      return;
    }
    if (part.wallpaper) paintWallpaper(model, part.wallpaper);
    const one = part.pose
      ? layPosed(model, part, yaw, centre.x + sx, centre.z + sz, ground)
      : part.inside
        ? layInside(model, laid[i - 1] ?? null)
        : layOn(model, part, yaw, x, z, baseOf(part, i, laid, ground));
    if (!one) {
      laid.push(null);
      views.push(null);
      return;
    }
    if (one.holder && level > 0) one.holder.userData.level = level;
    if (one.holder && one.holder.parent === null) host.add(one.holder);
    laid.push(one);
    views.push(one.holder);
  });

  const surface = element.parts.findIndex((part) => part.surface);
  const top = laid[surface >= 0 ? surface : 0]?.top ?? laid[0]?.top ?? ground + FALLBACK_TOP;
  return placed(top, views);
}

/**
 * **Ob das erste Teil als Stück der Welt stehen kann** — so, wie es aus dem
 * Regal kommt. `placeModel` kennt weder Maßstab noch Umlegen.
 */
function plainFloor(part: ElementPart): boolean {
  if (isBuiltPart(part.model)) return false;
  return (
    part.height === undefined &&
    part.scale === undefined &&
    part.tilt === undefined &&
    part.size === undefined &&
    part.pose === undefined &&
    part.node === undefined
  );
}

/**
 * **Nur ein Stück aus einer Datei** (`ElementPart.node`) — der Hut der Hexe,
 * nicht die Hexe. Was an Knochen hängt, kommt in seiner Ruhelage, so wie es
 * modelliert ist: ohne Skelett, als gewöhnliches Netz mit derselben Geometrie
 * und demselben Material.
 *
 * @returns die Netze des Knotens in einer Gruppe — `null`, wenn es ihn nicht gibt
 */
function pickNode(model: THREE.Object3D, name: string): THREE.Object3D | null {
  model.updateMatrixWorld(true);
  const node = model.getObjectByName(name);
  if (!node) return null;
  const out = new THREE.Group();
  out.name = `node:${name}`;
  node.traverse((object) => {
    const source = object as THREE.Mesh;
    if (!source.isMesh) return;
    const mesh = new THREE.Mesh(source.geometry, source.material);
    mesh.name = source.name;
    mesh.castShadow = source.castShadow;
    mesh.receiveShadow = source.receiveShadow;
    // Ein Netz an Knochen steht in seiner Ruhelage schon dort, wo die
    // Geometrie es sagt; ein starres trägt seine Lage im Knoten.
    if (!(object as THREE.SkinnedMesh).isSkinnedMesh)
      source.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
    out.add(mesh);
  });
  return out.children.length > 0 ? out : null;
}

/**
 * **Ein Teil frei in den Raum stellen** (`ElementPart.pose`): auf Maß bringen
 * (`size`, `height`, `fit`, `scale`), mit der Mitte seiner Unterseite in den
 * Ursprung, drehen, auf `at` setzen, um die Mitte der Grundfläche strecken
 * (`stretch`) — und das Ganze mit dem Element drehen.
 */
function layPosed(
  model: THREE.Object3D,
  part: ElementPart,
  elementYaw: number,
  x: number,
  z: number,
  y: number,
): Laid | null {
  const pose = part.pose!;
  const holder = new THREE.Group();
  holder.add(model);
  let box = new THREE.Box3().setFromObject(holder);
  if (box.isEmpty()) return null;
  const raw = box.getSize(new THREE.Vector3());
  const ratio = (want: number, have: number): number => (have > 1e-6 ? want / have : 1);
  if (part.size)
    holder.scale.set(
      ratio(part.size[0], raw.x),
      ratio(part.size[1], raw.y),
      ratio(part.size[2], raw.z),
    );
  else if (part.height !== undefined) holder.scale.setScalar(ratio(part.height, raw.y));
  else if (part.fit !== undefined) holder.scale.setScalar(ratio(part.fit, Math.max(raw.x, raw.z)));
  else holder.scale.setScalar(part.scale ?? 1);
  box = new THREE.Box3().setFromObject(holder);
  holder.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);

  const posed = new THREE.Group();
  posed.add(holder);
  posed.position.set(pose.at[0], pose.at[1], pose.at[2]);
  if (pose.quat) posed.quaternion.set(pose.quat[0], pose.quat[1], pose.quat[2], pose.quat[3]);
  else if (pose.rot) posed.rotation.set(pose.rot[0], pose.rot[1], pose.rot[2], 'YXZ');
  const stretched = new THREE.Group();
  stretched.add(posed);
  if (part.stretch) stretched.scale.set(part.stretch[0], part.stretch[1], part.stretch[2]);
  const outer = new THREE.Group();
  outer.add(stretched);
  outer.position.set(x, y, z);
  outer.rotation.y = elementYaw;
  const top = new THREE.Box3().setFromObject(outer).max.y;
  return {
    holder: outer,
    top,
    scale: 1,
    tilt: [0, 0, 0],
    yaw: elementYaw,
    shift: new THREE.Vector3(),
  };
}

/** Worauf ein Teil steht: die Oberkante eines früheren, oder der Boden. */
function baseOf(part: ElementPart, i: number, laid: readonly (Laid | null)[], ground = 0): number {
  const on = part.on ?? (part.stack ? i - 1 : null);
  if (on === null) return ground;
  // Kam das Teil darunter nicht, steht dieses auf der Höhe einer Platte —
  // nicht auf dem Boden, wo es im Kasten verschwände. Und was in einer Kiste
  // liegt, liegt um `sink` tiefer als ihr Rand.
  return (laid[on]?.top ?? ground + FALLBACK_TOP) - (part.sink ?? 0);
}

/**
 * **Ein Teil hinlegen**: auf Maß bringen, umlegen, drehen, mit der
 * Unterseite auf `y` und der Mitte seiner Hülle über (`x`, `z`).
 */
function layOn(
  model: THREE.Object3D,
  part: ElementPart,
  elementYaw: number,
  x: number,
  z: number,
  y: number,
): Laid | null {
  const raw = new THREE.Box3().setFromObject(model);
  if (raw.isEmpty()) return null;
  const tall = raw.max.y - raw.min.y;
  let scale = part.height !== undefined && tall > 1e-6 ? part.height / tall : (part.scale ?? 1);
  const tilt = part.tilt ?? ([0, 0, 0] as const);
  const yaw = elementYaw + (part.yaw ?? 0);
  const spin = pose(model, scale, tilt, yaw);
  spin.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(spin);
  if (box.isEmpty()) return null;
  // **Auf Breite** (`fit`): erst umgelegt messen, dann gleichmäßig nachziehen.
  const wide = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  if (part.fit !== undefined && wide > 1e-6) {
    const more = part.fit / wide;
    model.scale.multiplyScalar(more);
    scale *= more;
    spin.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(spin);
  }
  // **Bündig** (`flush`): Die Oberkante liegt fest, die Unterkante folgt der Dicke.
  if (part.flush !== undefined) y -= part.flush + (box.max.y - box.min.y);
  // **Am Ursprung** (`rooted`): der Stamm auf der Stelle, die Wurzeln im Boden.
  const shift = part.rooted
    ? new THREE.Vector3()
    : new THREE.Vector3(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  spin.position.copy(shift);
  const holder = new THREE.Group();
  holder.add(spin);
  holder.position.set(x, y, z);
  const top = part.rooted ? y + box.max.y : y + box.max.y - box.min.y;
  return { holder, top, scale, tilt, yaw, shift };
}

/**
 * **Ein Teil in das davor setzen** — mit genau dessen Maßstab, Drehungen und
 * Versatz, also so, wie beide Dateien zueinander gebaut sind. Das Eis sitzt
 * so unter dem Rand seiner Wanne und nicht auf ihm.
 */
function layInside(model: THREE.Object3D, outer: Laid | null): Laid | null {
  if (!outer?.holder) return null;
  const spin = pose(model, outer.scale, outer.tilt, outer.yaw);
  spin.position.copy(outer.shift);
  outer.holder.add(spin);
  return { ...outer };
}

/** Maßstab und Umlegen innen, die Drehung um die Hochachse außen. */
function pose(
  model: THREE.Object3D,
  scale: number,
  tilt: readonly [number, number, number],
  yaw: number,
): THREE.Group {
  model.scale.multiplyScalar(scale);
  const tilted = new THREE.Group();
  tilted.rotation.set(tilt[0], tilt[1], tilt[2]);
  tilted.add(model);
  const spin = new THREE.Group();
  spin.rotation.y = yaw;
  spin.add(tilted);
  return spin;
}

/**
 * **Ein Element als ein Modell** — für die Kachel im Möbelkatalog
 * (`PortalWorld.elementMenu`). Gebaut von `placeElement` selbst, mit einem
 * Gastgeber, der nichts sperrt und alles in eine Gruppe legt: Die Kachel zeigt
 * so genau das, was hingestellt wird — Platte, Brett und Messer, Stapel und
 * Portionierer —, und nicht nur das Bodenstück. Gemeldet war: _„Werden die
 * Möbel im Möbel Menü nicht korrekt angezeigt"_.
 *
 * **Und mit dem, was darauf steht** (`GameElement.holds`): Topf und Pfanne sind
 * keine Teile, sondern Dinge der Küche; `holds` zeichnet sie, wie die Station
 * sie zeigt (`dishView.KaykitDishView.view`).
 *
 * @param kaykitModel der Lader des Regals (`core/kaykitModel`) — hereingereicht,
 *   damit diese Datei ohne ihn prüfbar bleibt
 * @returns die Gruppe, die Mitte der Grundfläche im Ursprung — `null`, wenn
 *   kein Modell kam
 */
export async function elementModel(
  id: string,
  kaykitModel: (path: string) => Promise<THREE.Object3D | null>,
  holds?: (item: KitchenItem, on: readonly KitchenItem[]) => Promise<THREE.Object3D>,
): Promise<THREE.Group | null> {
  const group = new THREE.Group();
  group.name = `element-model:${id}`;
  const host: ElementHost = {
    blockSolid: () => ({ cells: [], mesh: new THREE.Mesh() }),
    placeModel: async (path, at, yaw) => {
      const model = await kaykitModel(path);
      if (!model) return null;
      const box = new THREE.Box3().setFromObject(model);
      const centre = box.getCenter(new THREE.Vector3());
      model.position.sub(centre);
      const holder = new THREE.Group();
      holder.add(model);
      holder.position.copy(at);
      holder.rotation.y = yaw;
      group.add(holder);
      return holder;
    },
    measure: async (path) => {
      const model = await kaykitModel(path);
      if (!model) return null;
      const box = new THREE.Box3().setFromObject(model);
      return box.isEmpty() ? null : box.getSize(new THREE.Vector3());
    },
    load: (path) => kaykitModel(path),
    add: (object) => group.add(object),
    alive: () => true,
  };
  const probe: ElementSpot = { id, element: id, x: 0, z: 0 };
  const [w, d] = spotSize(probe);
  const placed = await placeElement(host, { ...probe, x: -w / 2, z: -d / 2 });
  await placed.base;
  const item = placed.element.holds;
  if (item && holds) {
    const shown = await holds(item, placed.element.holdsOn ?? []);
    shown.position.y = placed.top;
    group.add(shown);
  }
  return group.children.some((child) => child.children.length > 0) ? group : null;
}

/** Die gesperrten Zellen im Bild — dasselbe Rot wie im KayKit-Editor. */
const CELLS_BLOCKED = 0xe0463c;
/** Die Linien des Zellgitters darum. */
const CELLS_LINE = 0x8a93a3;
/** Die Linien der Kacheln — kräftiger als die der Zellen. */
const CELLS_TILE = 0xd0d6e0;
/** Der Pfeil an der Vorderseite. */
const CELLS_FRONT = 0x46b86a;
/** Knapp über dem Boden, damit nichts mit ihm flimmert. */
const CELLS_LIFT = 0.004;

/**
 * **Die Belegung auf dem Zellgitter als Bild** — für die Detailseite eines
 * Elements im Möbelkatalog (`PortalWorld.elementMenu`, hinter dem ⓘ).
 * Gewünscht: _„wie das Grid bzw die Position ist von dem ganzen (Grid Flächen
 * Belegung)"_.
 *
 * Unter dem Modell (`elementModel`, Mitte der Grundfläche im Ursprung): jede
 * Zelle, die das Element sperrt, rot — gerechnet über `spotCells`, also genau
 * die, die `GridWorld.blockFootprint` sperrt —, darum eine Kachel Rand mit
 * Zell- und Kachellinien, und vorn ein grüner Pfeil: Dort ist die
 * Vorderseite, und davor steht, wer es benutzt. Das ist kein Möbel und keine
 * gebaute Geometrie einer Welt, sondern eine Anzeige wie der Gitterboden der
 * Detailseite oder die roten Zellen im KayKit-Editor.
 */
export function elementCellsOverlay(id: string): THREE.Group {
  const group = new THREE.Group();
  group.name = `element-cells:${id}`;
  // Nicht mitgemessen: Die Maße auf der Detailseite sind die des Möbels.
  group.userData[DETAIL_OVERLAY] = true;
  // **Gezeichnet an einer Stelle auf dem Gitter** (Nordwestecke 0, 0) und
  // dann so verschoben, dass die Mitte der Grundfläche im Ursprung liegt wie
  // beim Modell (`elementModel`). So liegen Zell- und Kachellinien da, wo sie
  // in der Welt lägen — auch unter einem schmalen Baum, der mittig auf einer
  // einzigen Zelle steht (`elementPlace.onCells`).
  const shifted: ElementSpot = { id, element: id, x: 0, z: 0 };
  const [w, d] = spotSize(shifted);
  group.position.set(-w / 2, 0, -d / 2);

  const fill = new THREE.MeshBasicMaterial({
    color: CELLS_BLOCKED,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const inset = 0.03;
  const cell = new THREE.PlaneGeometry(CELL_SIZE - 2 * inset, CELL_SIZE - 2 * inset);
  cell.rotateX(-Math.PI / 2);
  // **Die Umrisse durch das Möbel hindurch** (`depthTest: false`): Eine
  // Arbeitsplatte deckt ihre vier Zellen ganz, und die roten Flächen darunter
  // sähe man sonst nur am Rand.
  const edges: number[] = [];
  const y0 = CELLS_LIFT;
  for (const key of spotCells(shifted)) {
    const [ix, iz] = key.split(',').map(Number) as [number, number];
    const quad = new THREE.Mesh(cell, fill);
    quad.position.set((ix + 0.5) * CELL_SIZE, y0, (iz + 0.5) * CELL_SIZE);
    group.add(quad);
    const [ax, az] = [ix * CELL_SIZE + inset, iz * CELL_SIZE + inset];
    const [bx, bz] = [(ix + 1) * CELL_SIZE - inset, (iz + 1) * CELL_SIZE - inset];
    edges.push(ax, y0, az, bx, y0, az, bx, y0, az, bx, y0, bz);
    edges.push(bx, y0, bz, ax, y0, bz, ax, y0, bz, ax, y0, az);
  }
  const outline = new THREE.BufferGeometry();
  outline.setAttribute('position', new THREE.Float32BufferAttribute(edges, 3));
  const through = new THREE.LineSegments(
    outline,
    new THREE.LineBasicMaterial({ color: CELLS_BLOCKED, depthTest: false, transparent: true }),
  );
  through.renderOrder = 10;
  group.add(through);

  // Das Gitter: eine Kachel Rand um die Kacheln der Grundfläche, Zellen fein,
  // Kacheln kräftig.
  const x0 = -1;
  const x1 = Math.ceil(w) + 1;
  const z0 = -1;
  const z1 = Math.ceil(d) + 1;
  const thin: number[] = [];
  const bold: number[] = [];
  const y = CELLS_LIFT * 2;
  for (let x = x0; x <= x1 + 1e-6; x += CELL_SIZE) {
    const lines = Math.abs(x - Math.round(x)) < 1e-6 ? bold : thin;
    lines.push(x, y, z0, x, y, z1);
  }
  for (let z = z0; z <= z1 + 1e-6; z += CELL_SIZE) {
    const lines = Math.abs(z - Math.round(z)) < 1e-6 ? bold : thin;
    lines.push(x0, y, z, x1, y, z);
  }
  for (const [points, color] of [
    [thin, CELLS_LINE],
    [bold, CELLS_TILE],
  ] as const) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    group.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color })));
  }

  // Der Pfeil vor der Vorderkante, nach vorn (+z) zeigend.
  const arrow = new THREE.Shape();
  arrow.moveTo(-0.18, 0);
  arrow.lineTo(0.18, 0);
  arrow.lineTo(0, 0.3);
  arrow.closePath();
  const tip = new THREE.ShapeGeometry(arrow);
  // Die Form liegt in x/y; gekippt zeigt +y nach +z.
  tip.rotateX(Math.PI / 2);
  const front = new THREE.Mesh(
    tip,
    new THREE.MeshBasicMaterial({ color: CELLS_FRONT, side: THREE.DoubleSide, depthWrite: false }),
  );
  front.position.set(w / 2, CELLS_LIFT * 3, d + 0.1);
  group.add(front);
  return group;
}
