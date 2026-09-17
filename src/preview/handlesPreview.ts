/**
 * **Der Prüfstand der Griffe** — dasselbe für die Küchengeräte, was der
 * Musterbogen für den Avatar ist (`src/preview/avatarPreview.ts`).
 *
 * Wo eine Hand ein Ding anfasst, rechnet ein Test nach
 * (`worlds/test/zones/kitchenGrab.test.ts`): welche Stange, wie lang, wohin
 * die Faustachse zeigt. Was er **nicht** kann, ist die eine Frage, um die es
 * dabei geht — _sieht das aus wie eine Pfanne in einer Hand?_ Genau daran ist
 * dieser Teil des Spiels zweimal gescheitert: Der Löscher zielte quer zur
 * Hand, der Topf hatte den Stiel der Pfanne mitten in seiner Suppe, und beides
 * stand in Zahlen da, die für sich stimmten.
 *
 * Also stehen die Zahlen hier als Bild. Zwei Reihen von Ansichten:
 *
 * - **roh**: das Gerät in seinem eigenen Raum, mit einem großen Achsenkreuz im
 *   Ursprung und den **Haltezylindern** darüber (`core/grabHandles.HoldBar`).
 *   Die Frage dazu: Liegt der Zylinder auf dem Griff des Modells?
 * - **Griff**: dasselbe Gerät, gelegt mit `holdFor(handle)`, dazu eine grobe
 *   Hand im Griffraum und die Kamera dort, wo das Auge steht. Die Frage dazu:
 *   Liegt es so in der Faust, wie ein Mensch es hielte?
 *
 * Sie wird **nicht mitgebaut**: `vite.config.ts` kennt nur `index.html`,
 * `tools.html` und `inputs.html`, also gibt es sie nur im Entwicklungsserver.
 * `tools/handle-shot.mjs` (`npm run handles`) schießt alle Ansichten in
 * Dateien, sodass ein Vorher und ein Nachher nebeneinanderliegen.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createAxes } from '../core/axesCross';
import { holdFor, type GrabHandle } from '../core/grabHandles';
import { KITCHEN_SCALE } from '../core/kitchenFit';
import { HANDLE_BAR_ALPHA, HANDLE_BAR_COLOR } from '../core/handleView';
import { kitchenHandles } from '../worlds/test/zones/kitchenGrab';
import type { KitchenItem } from '../worlds/test/zones/kitchenRecipes';

const WIDTH = 1400;
const HEIGHT = 900;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT);
renderer.setClearColor(0xe8e4dc, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.append(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xbfd8f0, 0xc8a882, 2.4));
const sun = new THREE.DirectionalLight(0xfff4e2, 1.6);
sun.position.set(2.5, 5, 3);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x9fc4e8, 0.8);
fill.position.set(-3, 2, -2);
scene.add(fill);

const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/kitchen.glb`);

/**
 * **Ein Gerät, so wie die Küche es abnimmt** — dieselbe Kette wie
 * `core/kitchenModel.takeUtensil` und `kitchen.addStation`: das Netz mit dem
 * Material `Kitchen_Utensils`, der Ursprung unten in seiner Mitte, der halbe
 * Küchenmaßstab darum und ein Träger, der ihn wieder aufhebt. Nachgebaut und
 * nicht aufgerufen, weil `takeUtensil` das Netz aus seinem Möbel **heraus**
 * hängt und hier drei Kopien desselben Geräts nebeneinanderstehen.
 */
function utensilOf(node: string): THREE.Object3D | null {
  const group = gltf.scene.getObjectByName(node);
  if (!group) return null;
  let part: THREE.Mesh | null = null;
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as THREE.Material | THREE.Material[];
    const one = Array.isArray(material) ? material[0] : material;
    if (one?.name === 'Kitchen_Utensils') part = mesh;
  });
  if (!part) return null;
  const clone = (part as THREE.Mesh).clone();
  clone.geometry.computeBoundingBox();
  const bounds = clone.geometry.boundingBox!;
  const centre = bounds.getCenter(new THREE.Vector3());
  clone.position.set(-centre.x, -bounds.min.y, -centre.z);
  clone.rotation.set(0, 0, 0);
  clone.scale.set(1, 1, 1);
  const loose = new THREE.Group();
  loose.scale.setScalar(KITCHEN_SCALE);
  loose.add(clone);
  const holder = new THREE.Group();
  holder.add(loose);
  return holder;
}

/**
 * **Eine grobe Hand im Griffraum** — Unterarm entlang +Z, Daumen nach +Y,
 * Zeigefinger nach -Z, dazu das Achsenkreuz des Raums selbst.
 *
 * Bewusst kein Handmodell: Gefragt ist, wie das Gerät zur **Faustachse** liegt,
 * und drei Klötze sagen das deutlicher als eine Hand mit Fingern, die man in
 * dieser Größe ohnehin nicht liest.
 */
function handProxy(): THREE.Object3D {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.8 });
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.28, 16), skin);
  arm.rotation.x = Math.PI / 2;
  arm.position.set(0, 0, 0.2);
  group.add(arm);
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.09, 0.09), skin));
  const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.07, 12), skin);
  thumb.position.set(0, 0.06, 0.01);
  group.add(thumb);
  group.add(createAxes(0.12));
  return group;
}

/** Der Haltezylinder eines Griffs, in derselben Farbe wie im Spiel. */
function barMesh(handle: GrabHandle): THREE.Object3D | null {
  const bar = handle.hold;
  if (!bar) return null;
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(bar.radius, bar.radius, bar.length, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: HANDLE_BAR_COLOR,
      transparent: true,
      opacity: HANDLE_BAR_ALPHA,
      side: THREE.DoubleSide,
      depthTest: false,
      toneMapped: false,
    }),
  );
  mesh.renderOrder = 999;
  mesh.position.set(handle.pose.position.x, handle.pose.position.y, handle.pose.position.z);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(bar.along.x, bar.along.y, bar.along.z).normalize(),
  );
  return mesh;
}

/** Welches Gerät aus welchem Möbel kommt (`core/kitchenFit.KitchenPiece.holds`). */
const SHOW: { item: KitchenItem; node: string }[] = [
  { item: 'pan', node: 'stove-pan' },
  { item: 'pot', node: 'stove-pot' },
  { item: 'extinguisher', node: 'extinguisher' },
];

interface Stand {
  readonly label: string;
  readonly group: THREE.Group;
  /** `true` für die Rohansicht — dort wird im Modellraum gedreht, nicht im Griffraum. */
  readonly raw: boolean;
}

const stands: Stand[] = [];
const bounds = new THREE.Box3();
const extent = new THREE.Vector3();

for (const { item, node } of SHOW) {
  const measured = utensilOf(node);
  if (!measured) continue;
  // Die Maße kommen aus der **gemessenen Hülle**, genau wie in der Küche
  // (`kitchen.markHandles`) — die Griffe sind Anteile davon.
  scene.add(measured);
  measured.updateMatrixWorld(true);
  const size = bounds.setFromObject(measured).getSize(extent).clone();
  scene.remove(measured);
  const handles = kitchenHandles(item, { width: size.x, depth: size.z, height: size.y });

  const raw = new THREE.Group();
  raw.add(utensilOf(node)!);
  raw.add(createAxes(Math.max(size.x, size.y, size.z) * 0.6));
  for (const spot of handles) {
    const bar = barMesh(spot);
    if (bar) raw.add(bar);
    const cross = createAxes(0.06);
    cross.position.set(spot.pose.position.x, spot.pose.position.y, spot.pose.position.z);
    cross.quaternion.set(
      spot.pose.rotation.x,
      spot.pose.rotation.y,
      spot.pose.rotation.z,
      spot.pose.rotation.w,
    );
    raw.add(cross);
  }
  scene.add(raw);
  stands.push({ label: `${item}-roh`, group: raw, raw: true });

  for (const spot of handles) {
    const stand = new THREE.Group();
    stand.add(handProxy());
    const piece = utensilOf(node)!;
    const hold = holdFor(spot);
    piece.position.set(hold.position.x, hold.position.y, hold.position.z);
    piece.quaternion.set(hold.rotation.x, hold.rotation.y, hold.rotation.z, hold.rotation.w);
    const bar = barMesh(spot);
    if (bar) piece.add(bar);
    stand.add(piece);
    scene.add(stand);
    stands.push({ label: `${item}-${spot.id}`, group: stand, raw: false });
  }
}

const camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 0.02, 50);

/**
 * **Wohin der Zeigestrahl im Griffraum läuft** — `gripFit.GRIP_TO_RAY`, also
 * 30° unter der Faustachse. Der Spieler schaut ihm entgegen, und „oben" steht
 * senkrecht darauf: Das ist die Lage, in der eine Pfanne waagerecht liegen
 * muss, wenn sie waagerecht liegen soll.
 */
const RAY = new THREE.Vector3(0, -0.5, -0.866).normalize();
const UP = new THREE.Vector3(0, 0.866, -0.5).normalize();
const RIGHT = new THREE.Vector3().crossVectors(RAY, UP).normalize();

const HAND_ANGLES = [
  { name: 'auge', dir: RAY.clone().negate(), up: UP.clone() },
  { name: 'links', dir: RIGHT.clone().negate(), up: UP.clone() },
  { name: 'oben', dir: UP.clone(), up: RAY.clone().negate() },
];

const RAW_ANGLES = [
  { name: 'x', dir: new THREE.Vector3(1, 0.15, 0), up: new THREE.Vector3(0, 1, 0) },
  { name: 'z', dir: new THREE.Vector3(0, 0.15, 1), up: new THREE.Vector3(0, 1, 0) },
  { name: 'oben', dir: new THREE.Vector3(0, 1, 0.001), up: new THREE.Vector3(0, 0, 1) },
];

const views: Array<{ name: string; stand: THREE.Group; dir: THREE.Vector3; up: THREE.Vector3 }> =
  [];
for (const stand of stands) {
  for (const angle of stand.raw ? RAW_ANGLES : HAND_ANGLES) {
    views.push({
      name: `${stand.label}-${angle.name}`,
      stand: stand.group,
      dir: angle.dir.clone().normalize(),
      up: angle.up,
    });
  }
}

function draw(index: number): void {
  const view = views[index] ?? views[0]!;
  for (const stand of stands) stand.group.visible = stand.group === view.stand;
  const box = new THREE.Box3().setFromObject(view.stand);
  const centre = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  camera.up.copy(view.up);
  camera.position.copy(centre).addScaledVector(view.dir, radius * 2.6);
  camera.lookAt(centre);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}

draw(0);

declare global {
  interface Window {
    previewDraw: (index: number) => void;
    previewViews: string[];
  }
}
window.previewDraw = draw;
window.previewViews = views.map((view) => view.name);
