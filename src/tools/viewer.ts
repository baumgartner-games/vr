import * as THREE from 'three';
import { GhostHand } from '../core/HandVisuals';
import { holdHandPose } from '../core/handPoseStore';
import { createTool } from '../worlds/portal/tools';
import { IDENTITY } from '../worlds/portal/tools/aim';
import { ghostOnTool, poseOfHand, toolInGrip } from '../worlds/tune/handGrip';
import type { Tool } from '../worlds/portal/tools/Tool';
import type { Handedness } from '../core/XRInput';

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

/** Wie weit die Kamera über das Gezeigte hinaus Luft lässt. */
const PADDING = 1.12;
/** Grenzen für das Zoomen, als Faktor auf den eingepassten Abstand. */
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 2.6;
/** Wie schnell sich das Ding von selbst dreht, bis jemand es anfasst (rad/s). */
const IDLE_SPIN = 0.35;

const _box = new THREE.Box3();
const _bounds = new THREE.Box3();
const _centre = new THREE.Vector3();
const _size = new THREE.Vector3();
const _zero = new THREE.Vector3();
const _handspan = new THREE.Vector3(0.2, 0.2, 0.2);

/**
 * Ein Werkzeug zum Ansehen: eine Bühne, ein Modell, und Finger, die es drehen.
 *
 * Bewusst **kein** Stück Spiel: hier hält niemand etwas, es gibt keine Physik,
 * keinen Gürtel und keine Welt darum. Gebaut wird das Werkzeug aber mit
 * demselben `createTool`, mit dem es auch in der Hand landet — eine Seite, die
 * eine eigene, hübschere Kopie zeigt, zeigt irgendwann etwas anderes als das
 * Spiel, und dann ist sie falscher als keine Seite.
 *
 * Gedreht wird das **Werkzeug** und nicht die Kamera: ein Ding, das man in der
 * Hand dreht, dreht sich um sich selbst, und der Boden bleibt unten. Deshalb
 * hängt alles an einem Schwenk-Knoten, und der Zeiger schiebt dessen zwei
 * Winkel — mehr Freiheitsgrade braucht ein Blick auf ein Werkzeug nicht, und
 * eine Kamera, die auch noch schweben kann, verliert man sofort.
 */
export class ToolViewer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.01, 60);
  /** Dreht sich; darin hängt das Gezeigte, um seine eigene Mitte versetzt. */
  private readonly pivot = new THREE.Group();
  private readonly stage = new THREE.Group();

  private tool: Tool | null = null;
  private hand: GhostHand | null = null;
  private mode: HandMode = 'grip';
  private side: Handedness = 'right';

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
    this.scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x0a0f1c, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(0.6, 1.2, 0.9);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8ab4ff, 0.6);
    fill.position.set(-0.8, -0.3, -0.6);
    this.scene.add(fill);

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
    this.yaw = 0.6;
    this.pitch = 0.35;
    this.zoom = 1;
    this.spinning = true;
    this.apply();
    return true;
  }

  setHandMode(mode: HandMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.apply();
  }

  /** Läuft, solange die Seite ein Werkzeug zeigt. */
  start(): void {
    if (this.frame) return;
    this.clock.start();
    const tick = (): void => {
      this.frame = requestAnimationFrame(tick);
      const dt = Math.min(this.clock.getDelta(), 0.1);
      if (this.spinning) this.yaw += dt * IDLE_SPIN;
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
   */
  private apply(): void {
    const tool = this.tool;
    this.hand?.dispose();
    this.hand = null;
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
    }

    this.fit();
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
    this.hand?.dispose();
    this.hand = null;
    const tool = this.tool;
    this.tool = null;
    tool?.removeFromParent();
    tool?.disposeTool();
  }

  private render(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(width * ratio)) this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    const fitted = this.distance(this.camera.aspect);
    this.camera.position.set(0, 0, fitted * this.zoom);
    this.camera.near = Math.max(0.005, fitted * 0.02);
    this.camera.far = fitted * 12;
    this.camera.updateProjectionMatrix();
    this.pivot.rotation.set(this.pitch, this.yaw, 0);
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

  /** Doppeltipp: zurück auf die Ansicht, mit der die Seite aufgemacht hat. */
  private reset(): void {
    this.yaw = 0.6;
    this.pitch = 0.35;
    this.zoom = 1;
    this.spinning = true;
  }
}
