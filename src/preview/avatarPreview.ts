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
import { HEADGEAR_KINDS, buildHeadgear, headgearFor, type HeadgearKind } from '../core/headgear';
import { FIGURE_CHEF, FIGURE_PATHS, asFigure } from '../core/avatarFigures';

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
 * laufen — daran sieht man das Watscheln. Und `?squish=2&tempo=1` stellt
 * Stärke und Tempo der Stauchung von Hand (`core/squish.ts`): Diese Seite hat
 * kein Menü, und die Frage, wie viel davon gut aussieht, beantwortet ohnehin
 * nur ein Bild neben dem anderen.
 *
 * Für das **Atmen im Stehen** gibt es dieselben zwei Schalter noch einmal:
 * `?idle=1&idleTempo=2`. Es ist die Bewegung, die man hier am besten sieht —
 * ohne `?walk=1` steht die ganze Reihe still, und dann ist alles, was sich
 * bewegt, der Atem.
 *
 * Und `?built=1` setzt die **gebaute** Kochmütze auf (`core/chefHat.ts`,
 * `headgearFor`) — das Modell nimmt dafür seine eigene ab. Ohne diesen
 * Schalter bekommt man sie auf dieser Seite gar nicht zu sehen: Wer das
 * Modell trägt, trägt auch dessen Mütze (`AvatarBody.setHeadgear`), und damit
 * wäre ausgerechnet das Stück unsichtbar, das hier zu prüfen ist. Es ist
 * zugleich die Probe auf den **fremden Kopf**: Die Mütze wird auf den
 * gemessenen Halbmesser dieses Kopfes skaliert, genau wie sie es auf dem
 * Kopfknochen einer KayKit-Figur täte.
 */
const params = new URLSearchParams(location.search);
const hatChoice = params.get('hat') ?? 'chef';
const walking = params.get('walk') === '1';
const squish = params.has('squish') ? Number(params.get('squish')) : null;
const tempo = params.has('tempo') ? Number(params.get('tempo')) : null;
const idle = params.has('idle') ? Number(params.get('idle')) : null;
const idleTempo = params.has('idleTempo') ? Number(params.get('idleTempo')) : null;
const builtHat = params.get('built');

/**
 * **`?figure=…` setzt eine Figur aus dem Regal an die Stelle des Kochs**
 * (`core/avatarFigures.ts`).
 *
 * `?figure=all` stellt die ganze kuratierte Liste nebeneinander — das ist die
 * Ansicht, an der man sieht, ob die Höhenregel stimmt: Alle Köpfe müssen auf
 * **derselben** Höhe stehen (`figureLift`, `CHEF_EYE`), und zwar auf der des
 * Kochs, denn an ihr hängen Hände, Werkzeug und Kamera. Eine einzelne Adresse
 * (`?figure=adventurers/characters/Knight.glb`) setzt dieselbe Figur in jede
 * Spalte und damit jedem Hut einen anderen Kopf darunter — zusammen mit
 * `?hat=all` ist das die Probe auf den Sitz der Mütze.
 *
 * Und `?walk=1` gilt hier genauso: Eine Figur aus dem Regal geht mit ihrer
 * eigenen Bewegung, und ob sie dabei rutscht oder läuft, sieht man nur in
 * Bewegung.
 */
const figureChoice = params.get('figure') ?? FIGURE_CHEF;
const figureList = figureChoice === 'all' ? FIGURE_PATHS : null;

const count = Math.max(
  HEAD_KINDS.length,
  BODY_KINDS.length,
  hatChoice === 'all' ? 8 : 5,
  figureList?.length ?? 0,
);
const spacing = figureList || figureChoice !== FIGURE_CHEF ? 1.35 : 1.15;
/** Welche Figur in welcher Spalte steht — `previewDressed` wartet darauf. */
const wanted: string[] = [];
const bodies: AvatarBody[] = [];
for (let i = 0; i < count; i++) {
  const body = new AvatarBody({ color: ROLES[i % ROLES.length]!, hands: true });
  body.position.set((i - (count - 1) / 2) * spacing, 0, 0);
  const hat: HeadgearKind =
    hatChoice === 'all' ? HEADGEAR_KINDS[i % HEADGEAR_KINDS.length]! : (hatChoice as HeadgearKind);
  const figure = asFigure(figureList ? figureList[i % figureList.length] : figureChoice);
  wanted.push(figure);
  body.setLook({
    head: HEAD_KINDS[i % HEAD_KINDS.length]!,
    body: BODY_KINDS[i % BODY_KINDS.length]!,
    hat,
    figure,
  });
  if (squish !== null && Number.isFinite(squish)) body.squish = squish;
  if (tempo !== null && Number.isFinite(tempo)) body.squishSpeed = tempo;
  if (idle !== null && Number.isFinite(idle)) body.idleSquish = idle;
  if (idleTempo !== null && Number.isFinite(idleTempo)) body.idleSquishSpeed = idleTempo;
  scene.add(body);
  bodies.push(body);
}

/**
 * **Die gebaute Kochmütze aufsetzen** — `?built=1` auf den **gebauten** Kopf,
 * `?built=model` auf den des Modells (`core/chefHat.ts`).
 *
 * Beides muss man einzeln sehen können, weil die beiden Köpfe verschieden
 * sind: der gebaute eine gefaste Kiste (`HEAD_SPREAD`), der des Modells eine
 * rundere, flachere Kugel mit Ohren (`core/chefFace.ts`). Und sehen kann man
 * die gebaute Mütze auf dieser Seite sonst gar nicht: Wer das Modell trägt,
 * trägt dessen eigene Mütze (`AvatarBody.setHeadgear`).
 *
 * Auf dem Modellkopf ist es zugleich die Probe auf den **fremden Kopf**: Sein
 * Halbmesser wird gemessen, `headgearFor` skaliert darauf, und die Mütze kommt
 * in die **Mitte** der Hülle — der Ursprung des Modellkopfes liegt zwischen
 * den Augen und nicht in seiner Mitte. Genau diese beiden Zahlen braucht auch,
 * wer sie an den Kopfknochen einer KayKit-Figur hängt.
 *
 * Gemessen wird, **nachdem** das Modell da ist: Vorher gibt es nichts zu
 * messen, und deshalb steht das hier und nicht beim Aufbau.
 */
const dressed = new Set<AvatarBody>();
function wearBuiltHat(body: AvatarBody, tint: number): void {
  if (dressed.has(body)) return;
  const face = body.head.getObjectByName('head');
  const worn = body.head.getObjectByName('hat');
  if (!face || !worn) return;
  dressed.add(body);
  worn.visible = false;
  if (builtHat === 'model') {
    body.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(face);
    const size = box.getSize(new THREE.Vector3());
    // Die **kleinere** der beiden Hälften: Der Modellkopf ist flacher als er
    // breit ist, und in seiner Breite stecken die Ohren. Ein Hut, der nach der
    // Breite skaliert, schwebt als Sombrero über einem zu kleinen Schädel.
    const hat = headgearFor('chef', Math.min(size.x, size.y) / 2, tint);
    if (!hat) return;
    hat.position.copy(body.head.worldToLocal(box.getCenter(new THREE.Vector3())));
    body.head.add(hat);
    return;
  }
  // Der gebaute Kopf war die ganze Zeit da, nur ausgeblendet — das Modell
  // wirft ihn nicht weg, es stellt sich davor.
  face.visible = false;
  for (const child of body.head.children) {
    if (child.name.startsWith('avatar-head-')) child.visible = true;
  }
  const hat = buildHeadgear('chef', tint);
  if (hat) body.head.add(hat);
}

/**
 * **Posiert wird vor jedem Bild, nicht einmal beim Laden.**
 *
 * Das Modell der Figur kommt asynchron (`core/chefModel.ts`), und wer einmal
 * beim Laden posiert, fotografiert den Stand davor: Der Kopf hing dann noch
 * dort, wo die gebaute Figur ihn hatte, und die Hände auch. Genau dieser
 * Fehler kostete beim Umbau zwei Durchgänge, in denen dieselbe falsche
 * Stellung zweimal als „unverändert" dastand.
 */
function pose(): void {
  if (builtHat) bodies.forEach((body, i) => wearBuiltHat(body, ROLES[i % ROLES.length]!));
  const steps = walking ? 40 : 1;
  for (let step = 0; step < steps; step++) {
    for (const body of bodies) {
      if (walking) body.position.z -= 0.035;
      head.position.set(0, 1.62, 0);
      head.quaternion.identity();
      body.update(1 / 60, head, null, null);
    }
  }
  if (walking) for (const body of bodies) body.position.z = 0;
}

const views: Array<{ name: string; position: THREE.Vector3; look: THREE.Vector3; fov: number }> = [
  // Von vorn und von der Seite: der Blick, den ein Mitspieler in der Brille hat.
  {
    name: 'front',
    position: new THREE.Vector3(0, 0.9, -4.6),
    look: new THREE.Vector3(0, 0.75, 0),
    fov: 45,
  },
  {
    name: 'three-quarter',
    position: new THREE.Vector3(3.0, 1.8, -3.6),
    look: new THREE.Vector3(0, 0.7, 0),
    fov: 45,
  },
  {
    name: 'side',
    position: new THREE.Vector3(4.4, 0.9, 0),
    look: new THREE.Vector3(0, 0.75, 0),
    fov: 45,
  },
  // Und die Kamera, unter der wirklich gespielt wird: 16 m, 55° Neigung, 30°
  // Öffnung (`core/topDownPose.ts`). Was hier nicht lesbar ist, ist es nirgends.
  {
    name: 'topdown',
    position: new THREE.Vector3(0, 13.1, -9.2),
    look: new THREE.Vector3(0, 0.5, 0),
    fov: 30,
  },
];

const camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.05, 200);

function draw(index: number): void {
  pose();
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
    previewDressed: () => boolean;
  }
}
window.previewDraw = draw;
window.previewViews = views.map((view) => view.name);
/**
 * **Ob jede Figur ihr Modell schon anhat** — die Frage, auf die
 * `tools/avatar-shot.mjs` wartet, bevor es auslöst.
 *
 * `networkidle` ist dafür zu früh: Die Datei ist dann geladen, aber noch nicht
 * zerlegt, eingefärbt und angezogen (`core/chefModel.ts`, `AvatarBody`). Wer
 * in diesem Moment fotografiert, bekommt die **gebaute** Figur aufs Bild und
 * hält sie für die geladene — genau dieser Irrtum hat hier schon zwei Mal ein
 * „unverändert" erzeugt, wo in Wirklichkeit zwei verschiedene Figuren standen.
 */
window.previewDressed = () =>
  bodies.every((body, i) => {
    // Eine Figur aus dem Regal kommt ebenso asynchron — und wer auf sie nicht
    // wartet, fotografiert den Koch und hält ihn für den Ritter.
    const figure = wanted[i] ?? FIGURE_CHEF;
    if (figure !== FIGURE_CHEF) {
      return body.children.some((child) => child.name === `avatar-figure:${figure}`);
    }
    return Boolean(body.head.getObjectByName('head'));
  });
