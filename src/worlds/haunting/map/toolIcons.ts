import * as THREE from 'three';
import { scannerFrame } from '../../portal/tools/scannerModel';

/**
 * **Die Werkzeuge einmal in 3D gerendert, danach als Bild** — die
 * Comic-Icons der 2D-Welt, gezogen aus genau den Modellen, die auch im
 * Headset in der Hand liegen.
 *
 * Vorher zeichnete die 2D-Welt ein **Loch** in ihre Oberfläche und ließ die
 * 3D-Welt das Werkzeug hindurch in den Bildschirm rendern. Das war unsichtbar,
 * sobald irgendetwas über dem WebGL-Canvas lag — und über ihm lag die ganze
 * 2D-Welt. Also andersherum: Das Modell wird **einmal** in einen eigenen,
 * kleinen Renderer gezeichnet, das Bild wird gepuffert, der GL-Kontext danach
 * weggeworfen. Was die 2D-Welt bekommt, ist ein ganz gewöhnliches Canvas, das
 * sie wie jedes andere Bild in einen Knopf hängt.
 *
 * **Single Source of Truth bleiben die 3D-Objekte.** Wer ein Werkzeug ändert,
 * ändert `buildToolModel` — das Icon zieht nach, ohne dass jemand ein zweites
 * Vektorbild pflegen muss.
 *
 * **Comic-Stil** macht `comicPixels`: Farben auf wenige Stufen rasten
 * (Posterisieren), dann eine dunkle Kontur um die Silhouette legen. Das ist
 * reine Pixelrechnung auf `ImageData` — ohne Browser prüfbar, und dieselbe
 * Handschrift wie die gezeichneten Figuren in `flatArt.ts`: flache Flächen,
 * harte Kante.
 */

/** Kantenlänge eines Icons in Bildpunkten — quadratisch, mit Alpha. */
export const ICON_SIZE = 160;
/** Auf so viele Stufen je Farbkanal wird gerastert. */
export const COMIC_STEPS = 4;
/** Wie dick die Kontur ist, in Bildpunkten. */
export const COMIC_OUTLINE = 3;
/** Ab diesem Alpha gilt ein Pixel als Fläche und nicht als Luft. */
export const COMIC_ALPHA = 96;
/** Die Konturfarbe — dieselbe Tinte wie in `flatArt.ART.ink`. */
export const COMIC_INK: readonly [number, number, number] = [14, 17, 22];

/** Die Werkzeuge der 2D-Runde, in der Reihenfolge, in der sie gepuffert werden. */
export const ICON_TOOLS: readonly string[] = ['flashlight', 'radar', 'xray', 'medkit'];

/** Ab diesem Anteil frisst die Kontur die Fläche und wird dünner gezogen. */
export const COMIC_INK_LIMIT = 0.7;

/**
 * **Posterisieren und Kontur** — auf den Pixeln selbst, an Ort und Stelle.
 *
 * Erst wird jede Fläche auf `steps` Helligkeitsstufen je Kanal gerastet: Aus
 * dem weichen Verlauf einer Kugel werden drei, vier Töne, und genau das macht
 * den Comic. Dann bekommt jedes Flächenpixel, das innerhalb von `outline`
 * Bildpunkten an Luft grenzt, die Tinte — die Kontur wird **nach innen**
 * gelegt, damit das Icon nicht wächst und in seinem Knopf bleibt.
 *
 * **Eine Kontur, die die ganze Fläche frisst, ist keine Kontur.** Der Rahmen
 * des Scanners ist nur ein paar Bildpunkte dick; mit drei Punkten Kontur wäre
 * er eine schwarze Scheibe, und Radar und Röntgen sähen gleich aus. Deshalb
 * wird die Kontur dünner gezogen, solange sie mehr als `COMIC_INK_LIMIT` der
 * Fläche einfärbt — bis zu einem Punkt, und dann gar nicht.
 */
export function comicPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  options: { steps?: number; outline?: number; alpha?: number } = {},
): void {
  const steps = Math.max(2, Math.floor(options.steps ?? COMIC_STEPS));
  const outline = Math.max(0, Math.floor(options.outline ?? COMIC_OUTLINE));
  const cut = options.alpha ?? COMIC_ALPHA;
  const solid = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const a = pixels[i * 4 + 3]!;
    if (a < cut) {
      // Halbdurchsichtige Ränder gibt es im Comic nicht: entweder Fläche oder Luft.
      pixels[i * 4 + 3] = 0;
      continue;
    }
    solid[i] = 1;
    pixels[i * 4 + 3] = 255;
    for (let c = 0; c < 3; c++) pixels[i * 4 + c] = quantize(pixels[i * 4 + c]!, steps);
  }
  if (!outline) return;
  let area = 0;
  for (const one of solid) area += one;
  if (!area) return;
  for (let reach = outline; reach >= 1; reach--) {
    const edge: number[] = [];
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (solid[i] && nearAir(solid, width, height, x, y, reach)) edge.push(i);
      }
    if (edge.length > area * COMIC_INK_LIMIT && reach > 1) continue;
    if (edge.length > area * COMIC_INK_LIMIT) return;
    for (const i of edge) {
      pixels[i * 4] = COMIC_INK[0];
      pixels[i * 4 + 1] = COMIC_INK[1];
      pixels[i * 4 + 2] = COMIC_INK[2];
    }
    return;
  }
}

/** Eine Farbe auf `steps` Stufen rasten, mit voller Aussteuerung von Schwarz bis Weiß. */
function quantize(value: number, steps: number): number {
  const level = Math.round((value / 255) * (steps - 1));
  return Math.max(0, Math.min(255, Math.round((level / (steps - 1)) * 255)));
}

/** Ob innerhalb von `reach` Bildpunkten Luft liegt — auch der Bildrand zählt als Luft. */
function nearAir(
  solid: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  reach: number,
): boolean {
  for (let dy = -reach; dy <= reach; dy++)
    for (let dx = -reach; dx <= reach; dx++) {
      if (dx * dx + dy * dy > reach * reach) continue;
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return true;
      if (!solid[ny * width + nx]) return true;
    }
  return false;
}

/** Was die 2D-Welt von den Icons braucht — ein Bild je Werkzeug, oder keines. */
export interface ToolIconSource {
  icon(tool: string): CanvasImageSource | null;
}

/**
 * **Der Puffer.** Beim ersten Zugriff wird ein winziger Renderer angelegt,
 * jedes Werkzeug einmal gezeichnet, das Bild in ein 2D-Canvas übernommen und
 * der GL-Kontext wieder freigegeben. Danach ist das hier reiner Speicher: Die
 * 2D-Welt fragt in jedem Bild nach demselben Canvas und bekommt es ohne
 * Rechnung.
 *
 * Geht kein WebGL (jsdom, ein Telefon ohne Kontext), bleibt der Puffer leer
 * und `icon` antwortet `null` — die 2D-Welt zeigt dann ihren Knopf ohne Bild
 * statt gar nicht.
 */
export class ToolIcons implements ToolIconSource {
  private readonly images = new Map<string, HTMLCanvasElement>();
  private baked = false;

  constructor(private readonly size = ICON_SIZE) {}

  /** Das gepufferte Bild eines Werkzeugs; `null`, solange oder falls es keines gibt. */
  icon(tool: string): HTMLCanvasElement | null {
    if (!this.baked) this.bake();
    return this.images.get(tool) ?? null;
  }

  /** Ob überhaupt etwas im Puffer liegt — für Anzeigen und Tests. */
  get ready(): boolean {
    return this.images.size > 0;
  }

  /**
   * Alle Werkzeuge einmal rendern. Ein Renderer, eine Szene, ein Licht — und
   * am Ende `dispose`, damit kein zweiter GL-Kontext neben dem der Welt
   * stehen bleibt (Browser geben davon nur eine Handvoll her).
   */
  private bake(): void {
    this.baked = true;
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      // `preserveDrawingBuffer`, weil das Bild **nach** dem Zeichnen abgeholt
      // wird: ohne das ist der Puffer bis dahin schon wieder leer.
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(1);
      renderer.setSize(this.size, this.size, false);
      renderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene();
      const key = new THREE.DirectionalLight(0xffffff, 2.6);
      key.position.set(1.2, 2, 2);
      scene.add(key, new THREE.AmbientLight(0x9aa8c8, 1.6));
      const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 10);
      for (const tool of ICON_TOOLS) {
        const model = buildToolModel(tool);
        scene.add(model);
        frame(camera, model);
        renderer.render(scene, camera);
        const image = this.grab(renderer);
        if (image) this.images.set(tool, image);
        scene.remove(model);
        disposeModel(model);
      }
    } catch {
      // Kein WebGL: Der Knopf bleibt ohne Bild, die Runde läuft weiter.
      this.images.clear();
    } finally {
      renderer?.dispose();
      renderer?.forceContextLoss?.();
    }
  }

  /** Das gerenderte Bild abholen und in Comic-Stil bringen. */
  private grab(renderer: THREE.WebGLRenderer): HTMLCanvasElement | null {
    const size = this.size;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(renderer.domElement, 0, 0, size, size);
    const image = ctx.getImageData(0, 0, size, size);
    comicPixels(image.data, size, size);
    ctx.putImageData(image, 0, 0);
    return canvas;
  }
}

/** Die Kamera so stellen, dass das Modell das Bild füllt, mit etwas Luft. */
function frame(camera: THREE.PerspectiveCamera, model: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(model);
  const centre = box.getCenter(new THREE.Vector3());
  const radius = Math.max(0.04, box.getSize(new THREE.Vector3()).length() / 2);
  const distance = (radius * 1.12) / Math.tan((camera.fov * Math.PI) / 360);
  camera.position.set(centre.x + distance * 0.42, centre.y + distance * 0.34, centre.z + distance);
  camera.lookAt(centre);
  camera.updateProjectionMatrix();
}

function disposeModel(model: THREE.Object3D): void {
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose?.();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach((one) => one.dispose());
    else material?.dispose?.();
  });
}

/** Grobe, wiedererkennbare Klötze: ein Stab, ein Scanner, ein Koffer. */
export function buildToolModel(tool: string): THREE.Object3D {
  const group = new THREE.Group();
  if (tool === 'flashlight') {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.035, 0.26, 18),
      new THREE.MeshStandardMaterial({ color: 0x2b3242, roughness: 0.45, metalness: 0.55 }),
    );
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.035, 0.07, 18),
      new THREE.MeshStandardMaterial({ color: 0x3a4256, roughness: 0.4, metalness: 0.6 }),
    );
    head.position.y = 0.16;
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.045, 18),
      new THREE.MeshBasicMaterial({ color: 0xffe9b0 }),
    );
    lens.position.y = 0.196;
    lens.rotation.x = -Math.PI / 2;
    group.add(body, head, lens);
    group.rotation.z = -0.9;
  } else if (tool === 'radar' || tool === 'xray') {
    group.add(scannerFrame(tool === 'radar' ? 0x7ff0ff : 0xb8a0ff));
    group.rotation.x = -0.4;
  } else if (tool === 'medkit') {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.14, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xe6f0e8, roughness: 0.6 }),
    );
    const cross = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.03, 0.002),
      new THREE.MeshBasicMaterial({ color: 0xff4d55 }),
    );
    cross.position.z = 0.091;
    const cross2 = cross.clone();
    cross2.rotation.z = Math.PI / 2;
    group.add(box, cross, cross2);
  } else {
    group.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.16, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x8fa0ff }),
      ),
    );
  }
  return group;
}
