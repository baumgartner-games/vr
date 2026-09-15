/**
 * **Der Musterbogen der Figur** — jede Kopf-, Jacken- und Hutsorte in vier
 * Ansichten, damit man eine Änderung an der Optik sieht, statt sie zu ahnen.
 *
 * Die Optik des Avatars ist das eine am Projekt, was kein Jest-Test abnehmen
 * kann: `avatarBody.test.ts` prüft Proportionen und Rechnung, aber ob eine
 * Figur nach Koch aussieht, entscheidet das Auge aus 16 m Höhe unter 55°
 * (`core/topDownPose.ts`). Diese Seite stellt genau diese Kamera hin — und
 * `tools/avatar-shot.mjs` schießt sie in Bilddateien, sodass ein Vorher und
 * ein Nachher nebeneinanderliegen.
 *
 * Sie wird **nicht mitgebaut**: `vite.config.ts` kennt nur `index.html` und
 * `tools.html`, also gibt es sie nur im Entwicklungsserver.
 */
import * as THREE from 'three';
import { AvatarBody } from '../core/AvatarBody';
import { BODY_KINDS, HEAD_KINDS } from '../core/avatarLook';
import { HEADGEAR_KINDS, type HeadgearKind } from '../core/headgear';

const WIDTH = 1600;
const HEIGHT = 900;

/** Die Farben der Rollen, wie sie das Netz vergibt — eine je Figur im Bogen. */
const ROLES = [0xc9453c, 0x3f6fb5, 0x3f9d6a, 0xe0a13a, 0x8455b5, 0x2fa8a0, 0xd86f9c, 0x6d7683];

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT);
renderer.setClearColor(0xe8e4dc, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.append(renderer.domElement);

const scene = new THREE.Scene();
// Dasselbe Licht, das die Vorbilder haben: kühler Himmel, warmer Boden, ein
// weicher Hauptstrahl von schräg oben. Hartes Licht macht aus jeder Rundung
// eine Kante, und der ganze Stil lebt von Rundungen.
scene.add(new THREE.HemisphereLight(0xbfd8f0, 0xc8a882, 2.0));
const sun = new THREE.DirectionalLight(0xfff4e2, 1.9);
sun.position.set(2.5, 5, 3);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x9fc4e8, 0.7);
fill.position.set(-3, 2, -2);
scene.add(fill);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 0.95 }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const head = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };

/**
 * `?hat=chef` zeigt alle Sorten mit derselben Mütze (die Vorgabe, weil es um
 * die Figur geht), `?hat=all` geht das Hutregal durch, `?walk=1` lässt sie
 * laufen — daran sieht man Beine und Ärmel in Bewegung.
 */
const params = new URLSearchParams(location.search);
const hatChoice = params.get('hat') ?? 'chef';
const walking = params.get('walk') === '1';

const count = Math.max(HEAD_KINDS.length, BODY_KINDS.length, hatChoice === 'all' ? 8 : 5);
const spacing = 1.7;
const bodies: AvatarBody[] = [];
for (let i = 0; i < count; i++) {
  const body = new AvatarBody({ color: ROLES[i % ROLES.length]!, hands: true });
  body.position.set((i - (count - 1) / 2) * spacing, 0, 0);
  const hat: HeadgearKind =
    hatChoice === 'all' ? HEADGEAR_KINDS[i % HEADGEAR_KINDS.length]! : (hatChoice as HeadgearKind);
  body.setLook({
    head: HEAD_KINDS[i % HEAD_KINDS.length]!,
    body: BODY_KINDS[i % BODY_KINDS.length]!,
    hat,
  });
  scene.add(body);
  bodies.push(body);
}

// Im Stand genügt ein Bild; zum Laufen werden ein paar Schritte vorgespult,
// damit die Beine mitten im Schritt stehen und nicht am Anfang.
const steps = walking ? 40 : 1;
for (let step = 0; step < steps; step++) {
  for (const body of bodies) {
    if (walking) body.position.z -= 0.035;
    head.position.set(0, 1.62, 0);
    head.quaternion.identity();
    body.update(1 / 60, head, null, null);
  }
}

const views: Array<{ name: string; position: THREE.Vector3; look: THREE.Vector3; fov: number }> = [
  // Von vorn und von der Seite: der Blick, den ein Mitspieler in der Brille hat.
  {
    name: 'front',
    position: new THREE.Vector3(0, 1.3, -5.6),
    look: new THREE.Vector3(0, 1.0, 0),
    fov: 45,
  },
  {
    name: 'three-quarter',
    position: new THREE.Vector3(3.8, 2.4, -4.6),
    look: new THREE.Vector3(0, 0.95, 0),
    fov: 45,
  },
  {
    name: 'side',
    position: new THREE.Vector3(5.8, 1.3, 0),
    look: new THREE.Vector3(0, 1.0, 0),
    fov: 45,
  },
  // Und die Kamera, unter der wirklich gespielt wird: 16 m, 55° Neigung, 30°
  // Öffnung (`core/topDownPose.ts`). Was hier nicht lesbar ist, ist es nirgends.
  {
    name: 'topdown',
    position: new THREE.Vector3(0, 13.1, -9.2),
    look: new THREE.Vector3(0, 0.8, 0),
    fov: 30,
  },
];

const camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.05, 200);

function draw(index: number): void {
  const view = views[index] ?? views[0]!;
  camera.fov = view.fov;
  camera.position.copy(view.position);
  camera.lookAt(view.look);
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
