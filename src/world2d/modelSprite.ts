import * as THREE from 'three';

/**
 * **Aus einem 3D-Modell ein 2D-Bildchen** — zur Laufzeit, im Browser, ohne dass
 * irgendwo eine Bilddatei liegt.
 *
 * Phaser zeichnet Sprites, keine Netze: Ein `THREE.Mesh` lässt sich dort nicht
 * hinstellen, und ein zweiter WebGL-Renderer, der jedes Bild mitliefe, wäre für
 * eine Kachel von sechzehn Bildpunkten eine groteske Rechnung. Der Weg dazwischen
 * ist dieser hier: Das Modell wird **einmal** von einem kleinen, eigenen Renderer
 * abgelichtet — orthografisch, von schräg oben, auf durchsichtigem Grund —, und
 * was herauskommt, ist eine Leinwand. Leinwände versteht Phaser
 * (`textures.addCanvas`), und ebenso der Kachelkatalog (`tiles.ts`), der seine
 * Kacheln ohnehin schon malt statt lädt.
 *
 * Damit gilt für ein Modell dasselbe wie für alles andere hier: **nichts wird
 * ins Repository gelegt.** Der Companion Cube steht genau einmal im Code
 * (`worlds/portal/props.createCompanionCube`), die 3D-Welt baut ihn daraus, und
 * die 2D-Welt lichtet denselben Würfel ab. Wer ihn ändert, ändert beide.
 *
 * **Der Renderer lebt nur so lange wie der Aufruf.** Ein Browser gibt nur eine
 * Handvoll WebGL-Kontexte her, und der teure ist der des Spiels; dieser hier
 * wird gebaut, belichtet und sofort wieder abgeräumt. Gedacht ist das für den
 * **Aufbau** — ein Katalog, ein Sprite-Blatt —, nicht für die Bildschleife: Wer
 * pro Bild ein Modell ablichten will, hat das falsche Werkzeug in der Hand.
 *
 * Ohne WebGL (Testlauf in jsdom, abgeschaltete Grafikbeschleunigung) kommt
 * `null` zurück statt eines Absturzes — der Aufrufer malt dann selbst etwas
 * Flaches hin.
 */

export interface ModelSpriteOptions {
  /** Kantenlänge eines Bildes in Bildpunkten. Standard: eine Kachel (16). */
  size?: number;
  /**
   * Wie viele Drehungen nebeneinander auf dem Blatt stehen — 1 ist ein
   * einzelnes Bild, 8 ein Kreis in Schritten von 45°. Gedreht wird um die
   * Hochachse, um die Mitte des Modells.
   */
  frames?: number;
  /** Wie hoch die Kamera über dem Boden steht, in Radiant. Standard: 55°. */
  tilt?: number;
  /** Um wie viel das **erste** Bild schon gedreht ist. Standard: 30°. */
  turn?: number;
  /** Wie viel größer gerendert und dann verkleinert wird — gegen harte Kanten. */
  supersample?: number;
  /** Luft um das Modell herum, als Anteil der Kantenlänge. */
  margin?: number;
}

const DEFAULT_TILT = THREE.MathUtils.degToRad(55);
const DEFAULT_TURN = THREE.MathUtils.degToRad(30);
/** Die Achse, um die gedreht wird — die Hochachse der Welt. */
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Das Modell als Sprite-Blatt: `frames` Bilder nebeneinander, jedes `size`
 * Punkte breit und hoch, durchsichtig, wo nichts steht.
 *
 * Das Modell wird dafür **kurz ausgehängt** und danach dorthin zurückgehängt,
 * wo es stand — so darf auch etwas abgelichtet werden, das schon in einer Welt
 * steht, ohne dass es dabei aus ihr verschwindet.
 *
 * @returns die Leinwand, oder `null`, wenn dieser Browser kein WebGL hat.
 */
export function renderModelSprite(
  model: THREE.Object3D,
  options: ModelSpriteOptions = {},
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const size = Math.max(1, Math.round(options.size ?? 16));
  const frames = Math.max(1, Math.round(options.frames ?? 1));
  const tilt = options.tilt ?? DEFAULT_TILT;
  const turn = options.turn ?? DEFAULT_TURN;
  const scale = Math.max(1, Math.round(options.supersample ?? 4));
  const margin = options.margin ?? 0.08;

  const sheet = document.createElement('canvas');
  sheet.width = size * frames;
  sheet.height = size;
  const ctx = sheet.getContext('2d');
  if (!ctx) return null;

  // **Wo das Modell herkommt, dorthin kommt es zurück.** `Object3D.add` hängt
  // es aus seinem bisherigen Elternteil aus; gemerkt wird das hier und im
  // `finally` wieder eingehängt.
  const home = model.parent;
  let renderer: THREE.WebGLRenderer | null = null;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
  } catch {
    return null;
  }

  try {
    renderer.setPixelRatio(1);
    renderer.setSize(size * scale, size * scale, false);
    renderer.setClearAlpha(0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    model.removeFromParent();
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) return null;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    if (!(sphere.radius > 0)) return null;

    // Zwei Gruppen: die innere schiebt die Mitte des Modells auf den Ursprung,
    // die äußere dreht. So dreht sich das Modell um **sich**, und nicht um
    // einen Punkt irgendwo daneben — sonst wanderte es zwischen den Bildern
    // aus dem Ausschnitt.
    const pivot = new THREE.Group();
    pivot.position.copy(sphere.center).negate();
    pivot.add(model);
    const spin = new THREE.Group();
    spin.add(pivot);

    const scene = new THREE.Scene();
    // Zwei Lichter, sonst ist ein `MeshStandardMaterial` schwarz: Himmel und
    // Boden von oben, dazu eine Sonne von links vorn, damit der Würfel drei
    // verschieden helle Seiten hat und nicht wie eine Scheibe aussieht.
    const sky = new THREE.HemisphereLight(0xffffff, 0x5a6070, 2.4);
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-1, 2, 1.4);
    scene.add(spin, sky, sun);

    const away = sphere.radius * 4;
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, away + sphere.radius * 2);
    camera.position.set(0, Math.sin(tilt) * away, Math.cos(tilt) * away);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);

    // **Der Ausschnitt so eng wie möglich, aber für alle Bilder derselbe.**
    // Die Hüllkugel wäre der einfache Weg und verschenkt bei einem Würfel ein
    // Drittel der Kantenlänge an Luft — sechzehn Bildpunkte haben nichts zu
    // verschenken. Also werden die acht Ecken der Hülle durch jede Drehung und
    // durch die Kamera geschickt, und was am weitesten hinausragt, gibt das Maß.
    const angles: number[] = [];
    for (let frame = 0; frame < frames; frame++) angles.push(turn + (frame * Math.PI * 2) / frames);
    const corner = new THREE.Vector3();
    let half = 0;
    for (const angle of angles) {
      for (let bit = 0; bit < 8; bit++) {
        corner
          .set(
            (bit & 1 ? box.max.x : box.min.x) - sphere.center.x,
            (bit & 2 ? box.max.y : box.min.y) - sphere.center.y,
            (bit & 4 ? box.max.z : box.min.z) - sphere.center.z,
          )
          .applyAxisAngle(UP, angle)
          .applyMatrix4(camera.matrixWorldInverse);
        half = Math.max(half, Math.abs(corner.x), Math.abs(corner.y));
      }
    }
    half *= 1 + margin;
    camera.left = -half;
    camera.right = half;
    camera.top = half;
    camera.bottom = -half;
    camera.updateProjectionMatrix();

    const source = renderer.domElement;
    for (const [frame, angle] of angles.entries()) {
      spin.rotation.y = angle;
      renderer.render(scene, camera);
      ctx.drawImage(source, 0, 0, size * scale, size * scale, frame * size, 0, size, size);
    }
    spin.clear();
    pivot.clear();
    return sheet;
  } catch {
    return null;
  } finally {
    model.removeFromParent();
    if (home) home.add(model);
    renderer.dispose();
    // Ohne das gibt der Browser den Kontext erst irgendwann zurück, und davon
    // hat er nur eine Handvoll.
    renderer.forceContextLoss();
  }
}
