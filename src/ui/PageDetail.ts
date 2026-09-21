import * as THREE from 'three';
import { createLighting } from '../worlds/shared/environment';
import { wheelPixels, wheelStep } from '../core/wheelZoom';
import { DETAIL_POSE, detailDrag, detailGutter, detailZoom, type DetailPose } from './detailDrag';
import { PREVIEW_RETRY } from './previewGrid';
import type { DetailFacts, DetailOptions, DetailView } from './previewGrid';
import type { MenuModelFactory } from './WristMenu';

/**
 * **Ein Stück aus dem Regal, groß und zum Anfassen.**
 *
 * Die Kachel im Katalog zeigt das Modell (`ui/PagePreviews.ts`), und sie zeigt
 * es klein, gedreht und ohne Frage zurück. Gewünscht war eine Seite dahinter:
 * „Name des Assets, darunter voll das 3D-Modell, welches ich durch Swipen
 * drehen kann, Pinch zum Zoomen; seitlich sollte etwas Platz sein, da ich
 * runterscrollen möchte in dem Menü, um darunter weitere Infos zu sehen
 * (Grid-Boden in der Vorschau anzeigen, Bounding Box anzeigen, bei Charakteren
 * will ich die Animation auswählen können)."
 *
 * Genau das steht hier — der Teil davon, der three.js ist. Den Rahmen, die
 * Schalter und den Steckbrief baut die Seite (`ui/PageMenu.ts`); sie reicht
 * nur einen Kasten herüber und bekommt eine Steuerung zurück
 * (`previewGrid.DetailView`).
 *
 * ## Gedreht wird die Kamera und nicht das Modell
 *
 * Das ist der Unterschied zwischen einer Vorschau, unter der ein Gitterboden
 * liegt, und einer, bei der der Boden mitkippt. Das Modell steht still, wie es
 * in der Welt stünde; die Kamera fährt um seinen Mittelpunkt herum (Drehung
 * um die Hochachse, Kippung gedeckelt, Abstand als Zoom). Damit bleibt das
 * Gitter waagerecht, die Hülle achsenparallel — und beides sagt dann wirklich
 * etwas über das Ding aus.
 *
 * ## Die Mitte dreht, der Saum scrollt
 *
 * Auf einem Telefon liegen zwei Gesten übereinander: Wischen dreht, Wischen
 * scrollt. Ein Finger kann nur eine davon meinen, und ein Modell, das die
 * ganze Breite für sich nimmt, ist ein Menü, aus dem man nicht mehr
 * herauskommt. Also gehört dem Modell nur die **Mitte**: ein Kasten mit
 * `touch-action: none`, links und rechts ein Saum von `DETAIL_GUTTER`, der dem
 * Browser gehört (`ui/detailDrag.ts`). Wer weiterlesen will, wischt am Rand.
 *
 * ## Und sie läuft nur, solange sie zu sehen ist
 *
 * Dieselbe Disziplin wie im Raster: Die Schleife entsteht mit der Seite und
 * ist mit ihr wieder weg, samt `dispose` und `forceContextLoss`; das Raster
 * hält solange still (`ui/PageMenu.syncPreviews`), damit nie zwei
 * WebGL-Kontexte für dieselbe Seite offen sind.
 */

/** Wie weit die Kamera aufmacht. Eng genug, dass nichts perspektivisch kippt. */
const FOV = 32;

/** Wie viel Luft um das Ding bleibt, wenn der Zoom auf eins steht. */
const MARGIN = 1.25;

/** Wie viel eine Raste am Rad zoomt. */
const WHEEL_FACTOR = 1.2;

/** Die Farbe des Gitterbodens und die der Hülle — dieselbe Familie wie das Regal. */
const FLOOR_COLOR = 0x5d7898;
const FLOOR_MID = 0x8fb4d8;
const BOUNDS_COLOR = 0x7fd6a6;

/**
 * **Woher die Bewegungen zu einer Vorschau-Id kommen.**
 *
 * `height` ist die Höhe des Modells in den Maßen seiner **Quelle** und sagt,
 * welches der beiden Skelette der Sammlung gemeint ist
 * (`core/kaykitClips.kaykitRigOf`). **`null` heißt „kein Skelett"** — dann
 * kommen höchstens die Spuren der Datei selbst zurück, und die
 * Bewegungsbibliothek wird gar nicht erst geholt. Ein Fass, das dafür 560 kB
 * lädt, ist ein Fass, das 560 kB zu viel lädt.
 */
export type MenuClipSource = (id: string, height: number | null) => Promise<THREE.AnimationClip[]>;

export class PageDetail implements DetailView {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 500);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly lighting: THREE.Group;
  /** Der Kasten über der Mitte: Er nimmt die Gesten, der Saum daneben nicht. */
  private readonly grab: HTMLElement;
  private readonly clock = new THREE.Clock();

  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private action: THREE.AnimationAction | null = null;
  private floor: THREE.GridHelper | null = null;
  private bounds: THREE.Box3Helper | null = null;
  /** Die Hülle in Weltmaßen — Gitter, Kasten und Kamera rechnen daran. */
  private readonly box = new THREE.Box3();
  private readonly target = new THREE.Vector3();
  /** Wie weit die Kamera bei Zoom eins stünde. */
  private reach = 1;

  private clips: THREE.AnimationClip[] = [];
  private names: string[] = [];
  private options: DetailOptions = { floor: false, bounds: false, clip: null };
  private pose: DetailPose = DETAIL_POSE;

  private frame = 0;
  /** Sekunden seit dem Aufschlagen — dieselbe Uhr wie im Raster. */
  private now = 0;
  private asked = -1;
  private width = 0;
  private height = 0;
  private gone = false;

  /** Die Finger auf der Mitte, nach Zeiger-Id. */
  private readonly touches = new Map<number, { x: number; y: number }>();
  /** Der Abstand zweier Finger beim letzten Bild — `0`, solange nur einer liegt. */
  private pinch = 0;
  private wheelAcc = 0;

  constructor(
    private readonly host: HTMLElement,
    private readonly id: string,
    private readonly factory: MenuModelFactory,
    private readonly clipsOf: MenuClipSource | null,
    private readonly onFacts: (facts: DetailFacts) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'pmenu__big';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    host.append(this.renderer.domElement);

    this.grab = document.createElement('div');
    this.grab.className = 'pmenu__grab';
    host.append(this.grab);

    this.lighting = createLighting(1);
    this.scene.add(this.lighting);

    this.grab.addEventListener('pointerdown', this.onDown);
    this.grab.addEventListener('pointermove', this.onMove);
    this.grab.addEventListener('pointerup', this.onUp);
    this.grab.addEventListener('pointercancel', this.onUp);
    // **Nicht passiv**: Ein Rad über der Mitte zoomt das Modell, und dazu muss
    // das Scrollen der Seite ausbleiben. Am Saum daneben hängt kein Zuhörer,
    // dort scrollt es wie überall.
    this.grab.addEventListener('wheel', this.onWheel, { passive: false });

    this.clock.getDelta();
    this.frame = requestAnimationFrame(this.loop);
  }

  set(options: DetailOptions): void {
    this.options = options;
    this.applyFloor();
    this.applyBounds();
    this.applyClip();
  }

  dispose(): void {
    this.gone = true;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.grab.removeEventListener('pointerdown', this.onDown);
    this.grab.removeEventListener('pointermove', this.onMove);
    this.grab.removeEventListener('pointerup', this.onUp);
    this.grab.removeEventListener('pointercancel', this.onUp);
    this.grab.removeEventListener('wheel', this.onWheel);
    this.grab.remove();
    this.action?.stop();
    this.action = null;
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.dropFloor();
    this.dropBounds();
    // **Das Modell selbst wird nicht freigegeben**: Geometrie und Textur
    // gehören der Vorlage im Speicher und allen anderen Kopien
    // (`core/kaykitModel.ts`, `userData.sharedAssets`). Weg ist hier nur der
    // Rahmen darum.
    this.model?.removeFromParent();
    this.model = null;
    this.lighting.removeFromParent();
    this.renderer.domElement.remove();
    this.renderer.dispose();
    // `dispose` allein gibt den Kontext nicht überall zurück, und eine Seite,
    // die zehn Modelle hintereinander aufschlägt, braucht ihn zehnmal.
    this.renderer.forceContextLoss();
  }

  // --- das Bild -------------------------------------------------------------

  private readonly loop = (): void => {
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.now += dt;
    if (!this.fit()) return;
    if (!this.model) this.take();
    this.mixer?.update(dt);
    this.place();
    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Die Leinwand auf die Größe des Kastens bringen — und sagen, ob es
   * überhaupt etwas zu zeichnen gibt. Ein Kasten, der gerade aufklappt, ist
   * null hoch.
   */
  private fit(): boolean {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (width <= 0 || height <= 0) return false;
    if (width === this.width && height === this.height) return true;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = `${width}px`;
    this.renderer.domElement.style.height = `${height}px`;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // Der Saum links und rechts gehört dem Scrollen — eine Stelle rechnet ihn
    // (`ui/detailDrag.ts`), beide setzen ihn.
    const gutter = detailGutter(width);
    this.grab.style.left = `${gutter}px`;
    this.grab.style.right = `${gutter}px`;
    return true;
  }

  /**
   * Das Modell holen, sobald es da ist — `null` heißt „noch nicht" und wird
   * nicht gemerkt (dieselbe Zusage wie im Raster, `previewGrid.ts`).
   */
  private take(): void {
    if (this.now - this.asked < PREVIEW_RETRY) return;
    this.asked = this.now;
    const model = this.factory(this.id);
    if (!model) return;
    this.model = model;
    this.scene.add(model);
    model.updateMatrixWorld(true);
    this.box.setFromObject(model);
    if (this.box.isEmpty()) this.box.setFromCenterAndSize(_zero, _one);
    this.box.getCenter(this.target);
    this.box.getSize(_size);
    // Der Abstand, aus dem die Hülle gerade ins Bild passt: die halbe Diagonale
    // geteilt durch den halben Öffnungswinkel. Gerechnet über die Diagonale und
    // nicht über die Höhe, damit eine breite Wand beim Drehen nicht aus dem
    // Bild läuft.
    this.reach = Math.max((_size.length() / 2 / Math.sin((FOV * Math.PI) / 360)) * MARGIN, 0.05);
    this.mixer = new THREE.AnimationMixer(model);
    this.report(this.clipsOf !== null);
    this.askClips(model, _size.y);
    // Was die Schalter schon sagen wollten, gilt jetzt für ein Modell, das es
    // gibt.
    this.set(this.options);
  }

  /** Kamera auf ihren Platz: um den Mittelpunkt herum, im Abstand des Zooms. */
  private place(): void {
    const dist = this.reach / this.pose.zoom;
    const cos = Math.cos(this.pose.pitch);
    this.camera.position.set(
      this.target.x + Math.sin(this.pose.yaw) * cos * dist,
      this.target.y + Math.sin(this.pose.pitch) * dist,
      this.target.z + Math.cos(this.pose.yaw) * cos * dist,
    );
    this.camera.lookAt(this.target);
  }

  // --- was gemessen wurde ---------------------------------------------------

  /** Kantenlängen, Dreiecke, Bewegungen — an die Seite, die es hinschreibt. */
  private report(loading: boolean): void {
    if (this.gone) return;
    this.box.getSize(_size);
    this.onFacts({
      size: [_size.x, _size.y, _size.z],
      triangles: triangles(this.model),
      clips: [...this.names],
      loading,
    });
  }

  /**
   * **Die Bewegungen nachfragen** — die eigenen der Datei und, bei einer
   * Figur, die ihres Skeletts (`core/kaykitClips.ts`).
   *
   * `height` ist die Höhe in den Maßen der **Quelle**: Der Maßstab des Pakets
   * sitzt auf der Gruppe, die der Lader herausgibt (`core/kaykitFit.ts`), also
   * wird er hier wieder herausgerechnet. An dieser Zahl hängt, welches der
   * beiden Skelette gemeint ist, und sie ist in Metern eine andere.
   */
  private askClips(model: THREE.Object3D, metres: number): void {
    const source = this.clipsOf;
    if (!source) return;
    // **Nur eine Figur fragt nach einem Skelett.** Ohne `SkinnedMesh` bleibt
    // es bei dem, was in der Datei selbst steht — und das ist bei 4456 von
    // 4470 Dateien nichts.
    const height = skinned(model) ? metres / (model.scale.y || 1) : null;
    void source(this.id, height).then((clips) => {
      if (this.gone) return;
      this.clips = clips;
      this.names = clips.map((clip) => clip.name);
      this.report(false);
      this.applyClip();
    });
  }

  // --- die Schalter ---------------------------------------------------------

  private applyFloor(): void {
    if (!this.options.floor || !this.model) {
      this.dropFloor();
      return;
    }
    if (this.floor) return;
    this.box.getSize(_size);
    // Ein Gitter in Kachelschritten (`nav/navTile.TILE`, 1 m): So sieht man am
    // Boden, wie viele Kacheln das Ding belegen wird, wenn es hingestellt wird
    // (`worlds/portal/placeGrid.ts`).
    const span = Math.max(2, Math.ceil(Math.max(_size.x, _size.z) * 2));
    const grid = new THREE.GridHelper(span, span, FLOOR_MID, FLOOR_COLOR);
    grid.position.set(this.target.x, this.box.min.y, this.target.z);
    this.scene.add(grid);
    this.floor = grid;
  }

  private dropFloor(): void {
    if (!this.floor) return;
    this.floor.removeFromParent();
    this.floor.geometry.dispose();
    disposeMaterial(this.floor.material);
    this.floor = null;
  }

  private applyBounds(): void {
    if (!this.options.bounds || !this.model) {
      this.dropBounds();
      return;
    }
    if (this.bounds) return;
    const helper = new THREE.Box3Helper(this.box, new THREE.Color(BOUNDS_COLOR));
    this.scene.add(helper);
    this.bounds = helper;
  }

  private dropBounds(): void {
    if (!this.bounds) return;
    this.bounds.removeFromParent();
    this.bounds.geometry.dispose();
    disposeMaterial(this.bounds.material);
    this.bounds = null;
  }

  /**
   * Die gewählte Bewegung spielen — oder keine, und dann steht das Modell
   * wieder so, wie es in der Datei liegt.
   */
  private applyClip(): void {
    const mixer = this.mixer;
    if (!mixer) return;
    const wanted = this.options.clip;
    if (this.action?.getClip().name === wanted) return;
    this.action?.stop();
    this.action = null;
    // **Zurück in die Ruhelage**, bevor eine andere Bewegung anfängt: Ein
    // `stop` allein lässt die Knochen dort stehen, wo die letzte Spur sie
    // hingelegt hat, und „keine" sähe dann aus wie ein Standbild.
    mixer.stopAllAction();
    mixer.setTime(0);
    if (wanted === null) return;
    const clip = this.clips.find((candidate) => candidate.name === wanted);
    if (!clip) return;
    const action = mixer.clipAction(clip);
    action.reset();
    action.play();
    this.action = action;
  }

  // --- die Gesten -----------------------------------------------------------

  private readonly onDown = (event: PointerEvent): void => {
    this.grab.setPointerCapture(event.pointerId);
    this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.pinch = 0;
  };

  private readonly onMove = (event: PointerEvent): void => {
    const last = this.touches.get(event.pointerId);
    if (!last) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    last.x = event.clientX;
    last.y = event.clientY;
    if (this.touches.size >= 2) {
      // **Zwei Finger kneifen und drehen nicht.** Wer mit zwei Fingern
      // zusammenzieht, meint den Zoom; ihn nebenher auch drehen zu lassen,
      // machte aus jedem Kneifen einen Schlenker.
      const span = this.span();
      if (this.pinch > 0 && span > 0) this.pose = detailZoom(this.pose, span / this.pinch);
      this.pinch = span;
      return;
    }
    this.pose = detailDrag(this.pose, dx, dy, this.width, this.height);
  };

  private readonly onUp = (event: PointerEvent): void => {
    this.touches.delete(event.pointerId);
    this.pinch = 0;
    if (this.grab.hasPointerCapture(event.pointerId)) {
      this.grab.releasePointerCapture(event.pointerId);
    }
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const step = wheelStep(this.wheelAcc, wheelPixels(event));
    this.wheelAcc = step.acc;
    if (step.step === 0) return;
    this.pose = detailZoom(this.pose, step.step < 0 ? WHEEL_FACTOR : 1 / WHEEL_FACTOR);
  };

  /** Der Abstand der ersten beiden Finger, in Bildpunkten. */
  private span(): number {
    const [a, b] = [...this.touches.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}

/** Ob in diesem Baum ein Skelett steckt — daran hängt die Frage nach Bewegungen. */
function skinned(root: THREE.Object3D): boolean {
  let found = false;
  root.traverse((object) => {
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) found = true;
  });
  return found;
}

/** Wie viele Dreiecke in diesem Baum stecken — einmal gezählt, nicht je Bild. */
function triangles(root: THREE.Object3D | null): number {
  if (!root) return 0;
  let sum = 0;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const count = mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position')?.count ?? 0;
    sum += Math.floor(count / 3);
  });
  return sum;
}

/** Ein Helfer hat sein eigenes Material — anders als das Modell darunter. */
function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  for (const one of Array.isArray(material) ? material : [material]) one.dispose();
}

const _size = new THREE.Vector3();
const _zero = new THREE.Vector3();
const _one = new THREE.Vector3(1, 1, 1);
