import * as THREE from 'three';
import { GhostHand } from '../core/HandVisuals';
import { holdHandPose } from '../core/handPoseStore';
import { createTool } from '../worlds/portal/tools';
import { IDENTITY } from '../worlds/portal/tools/aim';
import { addGripFronts } from '../worlds/portal/tools/grip';
import { readPose } from '../worlds/portal/tools/toolPose';
import { ghostOnTool, poseOfHand, toolInGrip } from '../worlds/tune/handGrip';
import type { HoldPose, PoseReadout } from '../worlds/portal/tools/toolPose';
import type { Tool } from '../worlds/portal/tools/Tool';
import type { Handedness } from '../core/XRInput';
import type { WorldPreview } from '../core/types';

/**
 * Was die Boxhand gerade zeigen soll.
 *
 * Die drei Zustände sind nicht drei Ansichten desselben Bildes, sondern zwei
 * verschiedene **Bezugspunkte** — und genau darum geht es beim Ansehen:
 *
 * - `off` — nur das Werkzeug. Für die Form, ohne eine Hand davor.
 * - `grip` — der **Griffraum**: die Hand steht still, das Werkzeug liegt darin,
 *   dort, wohin `holdPosition` und `holdRotation` es legen. Das ist das Bild aus
 *   der Brille: „so halte ich das Ding".
 * - `tool` — der **Werkzeugraum**: das Werkzeug steht still, die Hand liegt
 *   daran. Das ist das Bild vom zweiten Justierstand: „so umfasst die Hand es".
 *
 * Zwischen beiden liegt dieselbe Messung — was sich unterscheidet, ist, welches
 * von beiden aufrecht steht. Am Werkzeug sieht man, ob der Griff in der Faust
 * sitzt; in der Hand sieht man, wohin das Ding dabei zeigt.
 */
export type HandMode = 'off' | 'grip' | 'tool';

/** Was ein Ding auf der Bühne noch braucht, wenn es kein Werkzeug ist. */
export interface ShowOptions {
  /** Läuft jedes Bild, mit den Sekunden seit dem Aufstellen — für ein Tor, das wirbelt. */
  animate?(time: number): void;
  /** Räumt weg, was `createTool` nicht gebaut hat — Texturen, Schilder. */
  dispose?(): void;
}

/** Wie weit die Kamera über das Gezeigte hinaus Luft lässt. */
const PADDING = 1.12;
/** Grenzen für das Zoomen, als Faktor auf den eingepassten Abstand. */
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 2.6;
/** Wie schnell sich das Ding von selbst dreht, bis jemand es anfasst (rad/s). */
const IDLE_SPIN = 0.35;
/**
 * Und wie schnell sich der Blick in einer Welt dreht.
 *
 * Deutlich langsamer: ein Werkzeug dreht sich vor der Nase, eine Welt steht
 * still und man schaut sich in ihr um. Eine volle Runde dauert damit knapp
 * eine Minute — lang genug, um irgendwo hinzusehen, ohne dass es weiterzieht.
 */
const WORLD_SPIN = 0.11;
/** Der Öffnungswinkel, mit dem alles anfängt; in einer Welt zoomt er. */
const FOV = 38;
const FOV_MIN = 22;
const FOV_MAX = 78;
/** Vorn und hinten in einer Welt: nah genug für eine Wand, weit genug für Berge. */
const WORLD_NEAR = 0.1;
const WORLD_FAR = 2000;

/**
 * Die Linie am Zeigefinger: warm, damit sie nicht als Teil der Hand gelesen
 * wird, und lang genug, um sie mit dem Werkzeug vergleichen zu können.
 *
 * Ihre Länge ist ein Vielfaches des Halbmessers dessen, was auf der Bühne
 * steht — eine feste Länge wäre bei der Pistole ein Faden und beim Hängegleiter
 * ein Strich. Geklemmt wird sie trotzdem: unter einer Handbreit sieht man sie
 * nicht, über einem Meter ist sie nur noch im Weg.
 */
const FINGER_LINE_COLOR = 0xffc857;
const FINGER_LINE_SCALE = 4;
const FINGER_LINE_MIN = 0.12;
const FINGER_LINE_MAX = 0.9;

const _box = new THREE.Box3();
const _bounds = new THREE.Box3();
const _centre = new THREE.Vector3();
const _size = new THREE.Vector3();
const _zero = new THREE.Vector3();
const _handspan = new THREE.Vector3(0.2, 0.2, 0.2);
const _look = new THREE.Euler(0, 0, 0, 'YXZ');

/**
 * Ein Werkzeug zum Ansehen: eine Bühne, ein Modell, und Finger, die es drehen.
 *
 * Bewusst **kein** Stück Spiel: hier hält niemand etwas, es gibt keine Physik
 * und keinen Gürtel. Gebaut wird das Werkzeug aber mit demselben `createTool`,
 * mit dem es auch in der Hand landet — eine Seite, die eine eigene, hübschere
 * Kopie zeigt, zeigt irgendwann etwas anderes als das Spiel, und dann ist sie
 * falscher als keine Seite.
 *
 * Gedreht wird das **Werkzeug** und nicht die Kamera: ein Ding, das man in der
 * Hand dreht, dreht sich um sich selbst, und der Boden bleibt unten. Deshalb
 * hängt alles an einem Schwenk-Knoten, und der Zeiger schiebt dessen zwei
 * Winkel — mehr Freiheitsgrade braucht ein Blick auf ein Werkzeug nicht, und
 * eine Kamera, die auch noch schweben kann, verliert man sofort.
 *
 * Für eine **Welt** kehrt sich genau das um (`showWorld`): dort steht der
 * Blick mitten darin und dreht sich, denn eine Welt sieht man von innen an.
 * Es sind dieselben zwei Winkel und dieselben Finger — nur bewegen sie diesmal
 * die Kamera.
 */
export class ToolViewer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 60);
  /** Dreht sich; darin hängt das Gezeigte, um seine eigene Mitte versetzt. */
  private readonly pivot = new THREE.Group();
  private readonly stage = new THREE.Group();
  /** Das Licht der Bühne — in einer Welt aus, die bringt ihr eigenes mit. */
  private readonly studio = new THREE.Group();

  private tool: Tool | null = null;
  /** Ein Ding, das kein Werkzeug ist — ein Tor, ein Beutel-Objekt. Ohne Hand. */
  private object: THREE.Object3D | null = null;
  private options: ShowOptions = {};
  private shownFor = 0;
  private hand: GhostHand | null = null;
  /** Die Linie am Zeigefinger — sie hängt an der Hand und geht mit ihr. */
  private fingerLine: THREE.Line | null = null;
  /** Und je eine je Griff: wohin dieser Griff zeigt. */
  private gripFronts: THREE.LineSegments[] = [];
  private mode: HandMode = 'grip';
  private side: Handedness = 'right';
  /**
   * Steht eine Welt auf der Bühne, dann steht der Blick **in** ihr: hier
   * seine Stelle und die Richtung, auf die der Doppeltipp zurückgeht.
   */
  private world: { eye: THREE.Vector3; home: number } | null = null;

  /** Halbmesser des Gezeigten, und der Faktor, den die Finger daraus machen. */
  private radius = 0.12;
  private zoom = 1;
  private yaw = 0.6;
  private pitch = 0.35;
  private spinning = true;

  private readonly pointers = new Map<number, THREE.Vector2>();
  private pinch = 0;
  private lastTap = 0;
  private frame = 0;
  private clock = new THREE.Clock();

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setClearAlpha(0);
    this.scene.add(this.pivot);
    this.pivot.add(this.stage);

    // Licht wie in den Welten: ein Himmel, damit nichts schwarz bleibt, und eine
    // Sonne von vorn oben, damit Kanten Kanten sind.
    this.scene.add(this.studio);
    this.studio.add(new THREE.HemisphereLight(0x9fc4ff, 0x0a0f1c, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(0.6, 1.2, 0.9);
    this.studio.add(sun);
    const fill = new THREE.DirectionalLight(0x8ab4ff, 0.6);
    fill.position.set(-0.8, -0.3, -0.6);
    this.studio.add(fill);

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  /** Welches Werkzeug gezeigt wird. `null` räumt die Bühne. */
  show(id: string | null): boolean {
    this.clear();
    if (!id) return false;
    const tool = createTool(id);
    if (!tool) return false;
    this.tool = tool;
    this.stage.add(tool);
    // Wo an diesem Werkzeug vorne ist, sieht man am Griff — jedem Griff, den es
    // trägt, auch den beiden am Drohnendeck. Einmal beim Aufstellen und nicht
    // in `apply`: das läuft bei jedem Zug am Regler, und dann hinge nach zehn
    // Sekunden ein Bündel Linien daran.
    this.gripFronts = addGripFronts(tool);
    this.yaw = 0.6;
    this.pitch = 0.35;
    this.zoom = 1;
    this.spinning = true;
    this.apply();
    return true;
  }

  /**
   * Irgendein Ding zum Ansehen, das kein Werkzeug ist. Es steht, wie es
   * gebaut wurde, ohne Hand daneben; die Kamera passt sich ein wie sonst.
   */
  showObject(object: THREE.Object3D, options: ShowOptions = {}): void {
    this.clear();
    this.object = object;
    this.options = options;
    this.shownFor = 0;
    this.stage.add(object);
    this.yaw = 0.6;
    this.pitch = 0.25;
    this.zoom = 1;
    this.spinning = true;
    this.fit();
  }

  /**
   * Eine **Welt** auf die Bühne — und dabei kehrt sich alles um.
   *
   * Ein Werkzeug dreht man vor sich; in einer Welt steht man. Deshalb bewegt
   * sich hier nicht das Gezeigte, sondern der Blick: die Kamera steht am
   * Startpunkt der Welt, und Ziehen dreht sie, wie man den Kopf dreht. Ein
   * Haus von außen ist ein grauer Kasten, und ein Berg von 1000 Metern eine
   * Platte mit einer Beule — von innen ist beides der Ort, um den es geht.
   *
   * Ihr Licht bringt die Welt selbst mit; das Bühnenlicht geht dafür aus.
   */
  showWorld(preview: WorldPreview): void {
    this.clear();
    this.object = preview.object;
    this.options = {
      animate: (time) => preview.animate?.(time),
      dispose: () => preview.dispose(),
    };
    this.shownFor = 0;
    this.stage.position.set(0, 0, 0);
    this.stage.add(preview.object);
    this.world = { eye: preview.eye.clone(), home: preview.yaw };
    this.studio.visible = false;
    this.yaw = preview.yaw;
    this.pitch = 0;
    this.zoom = 1;
    this.spinning = true;
  }

  setHandMode(mode: HandMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.apply();
  }

  /** Welches Werkzeug auf der Bühne steht — der Editor fragt danach. */
  get toolId(): string | null {
    return this.tool?.toolId ?? null;
  }

  /** Die Hand, für die die Bühne rechnet. Eine, und immer dieselbe. */
  get handSide(): Handedness {
    return this.side;
  }

  /** Das langsame Kreisen an oder aus — beim Justieren steht das Ding still. */
  setSpinning(on: boolean): void {
    this.spinning = on;
  }

  /** Die Lage des Werkzeugs im Griff, wie sie gerade gilt. */
  holdReadout(): PoseReadout | null {
    const tool = this.tool;
    return tool ? readPose({ position: tool.holdPosition, rotation: tool.holdRotation }) : null;
  }

  /** Und dieselbe Lage, wie das Werkzeug **gebaut** wurde — der Weg zurück. */
  factoryReadout(): PoseReadout | null {
    const tool = this.tool;
    return tool
      ? readPose({ position: tool.factoryPosition, rotation: tool.factoryRotation })
      : null;
  }

  /**
   * Eine neue Lage im Griff, oder `null` für die gebaute.
   *
   * Nicht neu eingepasst: wer am Regler zieht, will sehen, dass sich etwas
   * bewegt. Die Kamera passt sich aber an *alles* an, was auf der Bühne steht —
   * schiebt man das Werkzeug drei Zentimeter aus der Hand, rückte sie
   * anderthalb hinterher, und die Hälfte der Bewegung wäre wieder weg.
   *
   * @param refit einmal doch, nämlich wenn die Lage nicht am Regler entsteht,
   *              sondern beim Aufstellen — dann steht noch gar kein Bild, das
   *              man festhalten müsste.
   */
  setHoldPose(pose: HoldPose | null, refit = false): void {
    const tool = this.tool;
    if (!tool) return;
    if (pose) {
      tool.holdPosition.set(pose.position.x, pose.position.y, pose.position.z);
      tool.holdRotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w);
    } else {
      tool.resetHold();
    }
    this.apply(refit);
  }

  /** Im Speicher steht eine neue Handhaltung: Hand noch einmal hinstellen. */
  refresh(): void {
    this.apply(false);
  }

  /** Läuft, solange die Seite ein Werkzeug zeigt. */
  start(): void {
    if (this.frame) return;
    this.clock.start();
    const tick = (): void => {
      this.frame = requestAnimationFrame(tick);
      const dt = Math.min(this.clock.getDelta(), 0.1);
      if (this.spinning) this.yaw += dt * (this.world ? WORLD_SPIN : IDLE_SPIN);
      this.shownFor += dt;
      this.options.animate?.(this.shownFor);
      this.render();
    };
    this.frame = requestAnimationFrame(tick);
  }

  stop(): void {
    if (!this.frame) return;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  dispose(): void {
    this.stop();
    this.clear();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.renderer.dispose();
  }

  // --- die Bühne stellen -----------------------------------------------------

  /**
   * Werkzeug und Hand an ihre Plätze, und die Kamera darauf einpassen.
   *
   * Die beiden Modi rechnen mit derselben Kette wie der Eingaberaum
   * (`tune/handGrip.ts`), nur ohne Zielkorrektur: die kommt aus einem
   * Controller, und hier gibt es keinen. Was die Seite zeigt, ist damit die
   * Lage, in der ein Werkzeug **gebaut** ist — dieselbe, die auch ein Browser
   * ohne Brille zeichnet (`Tool.applyHold` ohne Griff).
   *
   * @param refit ob die Kamera sich neu einpassen darf. Beim Justieren nicht:
   *              siehe `setHoldPose`.
   */
  private apply(refit = true): void {
    const tool = this.tool;
    this.dropHand();
    if (!tool) return;

    // Dieselbe Zeile wie am Griffstand: ein Werkzeug, dessen Modell sich im
    // Griff verschiebt (das Drohnen-Deck, der Stiel des Hammers), zeigt sonst
    // eine Gestalt, die es in keiner Hand hat (`Tool.showHeldBy`).
    tool.showHeldBy(this.side);
    const pose = holdHandPose(this.side, tool.toolId);
    const local = toolInGrip(
      { position: tool.holdPosition, rotation: tool.holdRotation },
      IDENTITY,
    );

    if (this.mode === 'tool' || this.mode === 'off') {
      // Das Werkzeug steht aufrecht in seinem eigenen Raum.
      tool.position.set(0, 0, 0);
      tool.quaternion.identity();
    } else {
      // Der Griffraum: der Ursprung ist der Griffpunkt der Hand, das Werkzeug
      // liegt darin. Genau das tut `applyHold` ohne Controller.
      tool.position.copy(tool.holdPosition);
      tool.quaternion.copy(tool.holdRotation);
    }

    if (this.mode !== 'off') {
      const hand = new GhostHand(this.side, pose, { color: 0x9fe3ff, opacity: 0.9 });
      const at = this.mode === 'tool' ? ghostOnTool(local, poseOfHand(pose)) : poseOfHand(pose);
      hand.position.set(at.position.x, at.position.y, at.position.z);
      hand.quaternion.set(at.rotation.x, at.rotation.y, at.rotation.z, at.rotation.w);
      this.stage.add(hand);
      this.hand = hand;
      this.addFingerLine(hand);
    }

    if (refit) this.fit();
    this.sizeFingerLine();
  }

  /**
   * Die Linie, in die der **Zeigefinger** zeigt.
   *
   * Sie hängt an der Fingerspitze und nicht in der Bühne: die Spitze weiß
   * selbst, wohin sie zeigt — ihr -Z ist die Richtung —, und damit geht die
   * Linie jede Krümmung und jede Verschiebung der Hand mit, ohne dass hier
   * irgendetwas nachgerechnet werden müsste.
   *
   * Eine `Line` und kein Mesh, und das ist mehr als eine Sparsamkeit: die
   * Kamera misst nur sichtbare **Meshes** (`measure`), also passt sie sich an
   * das Werkzeug an und nicht an eine Linie, die absichtlich über den Rand
   * hinausgeht.
   */
  private addFingerLine(hand: GhostHand): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: FINGER_LINE_COLOR, transparent: true, opacity: 0.85 }),
    );
    line.name = 'finger-line';
    hand.indexTip.add(line);
    this.fingerLine = line;
  }

  /** Ihre Länge, sobald feststeht, wie groß das Gezeigte ist. */
  private sizeFingerLine(): void {
    if (!this.fingerLine) return;
    const length = Math.min(
      FINGER_LINE_MAX,
      Math.max(FINGER_LINE_MIN, this.radius * FINGER_LINE_SCALE),
    );
    this.fingerLine.scale.z = length;
  }

  /**
   * Hand samt Linie weg.
   *
   * Die Linie einzeln: `GhostHand.dispose` räumt Meshes ab, und eine `Line`
   * ist keines — ihre Geometrie bliebe bei jedem Werkzeugwechsel liegen.
   */
  private dropHand(): void {
    const line = this.fingerLine;
    this.fingerLine = null;
    if (line) {
      line.removeFromParent();
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.hand?.dispose();
    this.hand = null;
  }

  /**
   * Die Mitte des Gezeigten in den Drehpunkt, und die Kamera so weit weg, dass
   * alles hineinpasst.
   *
   * Um die Mitte und nicht um den Ursprung: der Ursprung eines Werkzeugs ist
   * sein Griffpunkt, und der sitzt bei einer Lanze einen halben Meter von ihrem
   * Kopf entfernt. Ein Ding, das um seinen Griffpunkt kreist, wandert dabei aus
   * dem Bild.
   */
  private fit(): void {
    this.stage.position.set(0, 0, 0);
    this.stage.updateWorldMatrix(true, true);
    this.measure();
    _box.getCenter(_centre);
    _box.getSize(_size);
    this.stage.position.copy(_centre).multiplyScalar(-1);
    // Die **Kugel** um das Gezeigte und nicht sein Kasten: es dreht sich, und
    // ein Kasten hat je nach Blickwinkel eine andere Breite. Eine Kugel hat
    // immer dieselbe, und damit springt das Bild beim Drehen nicht.
    this.radius = Math.max(_size.length() / 2, 0.02);
  }

  /**
   * Wie weit die Kamera wegmuss, damit alles ins Bild passt — mit dem
   * **schmaleren** der beiden Öffnungswinkel gerechnet.
   *
   * Auf einem Telefon ist das der waagerechte, auf einem breiten Fenster der
   * senkrechte. Nur mit dem senkrechten gerechnet stünde ein Werkzeug auf dem
   * Telefon links und rechts über den Rand hinaus.
   */
  private distance(aspect: number): number {
    const vertical = (this.camera.fov * Math.PI) / 360;
    const horizontal = Math.atan(Math.tan(vertical) * aspect);
    return (this.radius * PADDING) / Math.sin(Math.min(vertical, horizontal));
  }

  /**
   * Wie groß das Gezeigte ist — gemessen an dem, was man **sieht**.
   *
   * `Box3.setFromObject` fragt nicht danach: es nimmt jede Geometrie im Baum,
   * auch die ausgeschalteten. Bei der Taschenlampe ist das ein sechs Meter
   * langer Lichtkegel, der nur nicht gezeichnet wird — die Kamera wich davor
   * zurück, bis die Lampe ein Punkt in der Mitte war. Also dasselbe Verfahren
   * wie im Handgelenk-Menü: sichtbare Meshes, sonst nichts. Lichter, Kameras
   * und Zielpunkte fallen damit gleich mit heraus.
   */
  private measure(): void {
    _box.makeEmpty();
    this.stage.traverseVisible((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const bounds = mesh.geometry.boundingBox;
      if (!bounds) return;
      _bounds.copy(bounds).applyMatrix4(mesh.matrixWorld);
      _box.union(_bounds);
    });
    // Ein Werkzeug ganz ohne sichtbares Mesh gibt es nicht, aber eine leere
    // Kiste ergäbe eine Kamera im Nichts. Dann eben eine Handbreit.
    if (_box.isEmpty()) _box.setFromCenterAndSize(_zero, _handspan);
  }

  private clear(): void {
    this.dropHand();
    // Die Linien an den Griffen einzeln: `disposeTool` räumt ab, was das
    // Werkzeug selbst gebaut hat, und eine Linie, die diese Seite drangehängt
    // hat, gehört nicht dazu.
    for (const line of this.gripFronts) {
      line.removeFromParent();
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.gripFronts = [];
    this.world = null;
    this.studio.visible = true;
    const tool = this.tool;
    this.tool = null;
    tool?.removeFromParent();
    tool?.disposeTool();
    const object = this.object;
    this.object = null;
    if (object) {
      object.removeFromParent();
      object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(material)) material.forEach(disposeMaterial);
        else if (material) disposeMaterial(material);
      });
    }
    this.options.dispose?.();
    this.options = {};
  }

  private render(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(width * ratio)) this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;

    const world = this.world;
    if (world) {
      // In der Welt: die Kamera steht, wo der Spieler stünde, und dreht sich.
      // Gezoomt wird am Öffnungswinkel — ein Schritt zurück ginge hier durch
      // die Wand.
      this.pivot.rotation.set(0, 0, 0);
      this.camera.position.copy(world.eye);
      _look.set(this.pitch, this.yaw, 0);
      this.camera.quaternion.setFromEuler(_look);
      this.camera.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, FOV * this.zoom));
      this.camera.near = WORLD_NEAR;
      this.camera.far = WORLD_FAR;
    } else {
      const fitted = this.distance(this.camera.aspect);
      this.camera.position.set(0, 0, fitted * this.zoom);
      this.camera.quaternion.identity();
      this.camera.fov = FOV;
      this.camera.near = Math.max(0.005, fitted * 0.02);
      this.camera.far = fitted * 12;
      this.pivot.rotation.set(this.pitch, this.yaw, 0);
    }
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  // --- Finger ----------------------------------------------------------------

  private readonly onDown = (event: PointerEvent): void => {
    this.canvas.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, new THREE.Vector2(event.clientX, event.clientY));
    // Der erste Griff beendet das Kreisen: ab jetzt gehört die Drehung dem, der
    // sie in der Hand hat.
    this.spinning = false;
    if (this.pointers.size === 2) this.pinch = this.spread();
    const now = event.timeStamp;
    if (now - this.lastTap < 320) this.reset();
    this.lastTap = now;
  };

  private readonly onMove = (event: PointerEvent): void => {
    const last = this.pointers.get(event.pointerId);
    if (!last) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    last.set(event.clientX, event.clientY);

    if (this.pointers.size >= 2) {
      // Zwei Finger zoomen, und zwar nur das: gleichzeitig zu drehen macht aus
      // jedem Zoom eine kleine Drehung, die niemand wollte.
      const spread = this.spread();
      if (this.pinch > 0 && spread > 0) this.setZoom(this.zoom * (this.pinch / spread));
      this.pinch = spread;
      return;
    }

    const scale = 4 / Math.max(240, Math.min(this.canvas.clientWidth, this.canvas.clientHeight));
    this.yaw += dx * scale;
    // Nicht überkopf: eine Ansicht, die auf dem Kopf steht, dreht sich beim
    // nächsten Wischen andersherum, und dann weiß man nicht mehr, wo oben war.
    this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch + dy * scale));
  };

  private readonly onUp = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinch = 0;
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.spinning = false;
    this.setZoom(this.zoom * (event.deltaY > 0 ? 1.12 : 1 / 1.12));
  };

  private setZoom(value: number): void {
    this.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
  }

  private spread(): number {
    const [a, b] = [...this.pointers.values()];
    return a && b ? a.distanceTo(b) : 0;
  }

  /**
   * Doppeltipp: zurück auf die Ansicht, mit der die Seite aufgemacht hat.
   *
   * Und **neu eingepasst**, denn beim Justieren wird das absichtlich nicht
   * getan: eine Hand, die dabei aus dem Bild gewandert ist, holt man so
   * zurück, ohne die Einstellung anzufassen.
   */
  private reset(): void {
    this.zoom = 1;
    this.spinning = true;
    if (this.world) {
      // In einer Welt gibt es nichts einzupassen: die steht, wo sie steht, und
      // `fit` würde sie um ihre eigene Mitte verschieben.
      this.yaw = this.world.home;
      this.pitch = 0;
      return;
    }
    this.yaw = 0.6;
    this.pitch = 0.35;
    this.fit();
    this.sizeFingerLine();
  }
}

/**
 * Ein Material samt seiner Bilder freigeben.
 *
 * `Material.dispose()` lässt Texturen liegen — was bei einem Werkzeug nichts
 * ausmacht und bei einer Welt eine Menge ist: jedes Schild ist eine
 * Leinwand-Textur, dazu das Raster des Bodens und die Erde am Mondhimmel.
 * Wer sich zehn Welten ansieht, hätte sie sonst alle noch im Speicher.
 */
function disposeMaterial(material: THREE.Material): void {
  const textured = material as THREE.Material & { map?: THREE.Texture | null };
  textured.map?.dispose();
  material.dispose();
}
