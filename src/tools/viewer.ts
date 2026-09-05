import * as THREE from 'three';
import { GhostHand } from '../core/HandVisuals';
import { holdHandPose } from '../core/handPoseStore';
import { createTool } from '../worlds/portal/tools';
import { IDENTITY } from '../worlds/portal/tools/aim';
import { addGripFronts, arrowPoints, createArrow } from '../worlds/portal/tools/grip';
import { readPose } from '../worlds/portal/tools/toolPose';
import { ghostOnTool, poseOfHand, toolInGrip } from '../worlds/tune/handGrip';
import type { Ray } from './alignHand';
import type { Pose } from '../worlds/tune/handGrip';
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
  /** Es bringt sein eigenes Licht mit — das Bühnenlicht geht dann aus. */
  ownLight?: boolean;
  /** Wie schräg von oben man daraufsieht; ohne Angabe fast von vorn. */
  pitch?: number;
  /** Wie schnell es sich von selbst dreht (rad/s). */
  spin?: number;
  /** Alles oberhalb dieser Höhe wird weggeschnitten — ein Dach nimmt die Sicht. */
  cut?: number | null;
  /** Es liegt flach — breit und niedrig — und wird enger eingepasst. */
  flat?: boolean;
}

/** Wie weit die Kamera über das Gezeigte hinaus Luft lässt. */
const PADDING = 1.12;
/** Grenzen für das Zoomen, als Faktor auf den eingepassten Abstand. */
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 2.6;
/** Wie schnell sich das Ding von selbst dreht, bis jemand es anfasst (rad/s). */
const IDLE_SPIN = 0.35;
/**
 * Und wie schnell sich eine **Welt** dreht: deutlich langsamer.
 *
 * Ein Werkzeug dreht man vor der Nase, eine Welt sieht man an. Eine volle
 * Runde dauert damit knapp eine Minute — lang genug, um irgendwo hinzusehen,
 * ohne dass es schon weitergezogen ist.
 */
const WORLD_SPIN = 0.14;
/**
 * Und wie schräg von oben: gut 30°.
 *
 * Von vorn ist eine Welt eine Silhouette, von genau oben ein Grundriss ohne
 * Höhe. Dazwischen liegt das Bild, an dem man beides erkennt — wo was steht
 * und wie hoch es ist.
 */
const WORLD_PITCH = 0.55;
/**
 * Wie hoch der Schnitt durch eine Welt mit Dach höchstens liegt.
 *
 * Etwas über Kopfhöhe: Wände bleiben Wände, Tische, Türen und Schilder bleiben
 * drin, und der Deckel ist weg.
 */
const CUT_HEIGHT = 2.4;

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

/**
 * **Wohin das Werkzeug zielt**, als Pfeil: aus seinem Nullpunkt nach -Z.
 *
 * Dass es -Z ist, ist keine Setzung dieser Seite, sondern die Regel des Spiels:
 * ein gehaltenes Werkzeug wird aus dem Griff auf den Zeigestrahl gedreht, und
 * von da an *ist* sein eigenes -Z die Zielrichtung (`tools/aim.ts`). Der Pfeil
 * zeichnet also nichts Neues — er macht das sichtbar, wonach ohnehin
 * geschossen, geleuchtet und gegriffen wird. Er hängt an denen, die wirklich
 * zielen (`alignToAim`); Boxhand, Controller, Flügel und Beutel zeigen
 * nirgendwohin und bekommen deshalb keinen.
 *
 * **Weiß**, denn die anderen Farben sind vergeben: der Griff grün, sein Pfeil
 * rosa, die Hand hellblau und ihre Linie bernsteinfarben. Weiß liest sich
 * daneben wie ein Laserstrahl, und genau das ist gemeint.
 *
 * Etwas länger als die Fingerlinie, damit die beiden auch dann noch
 * auseinanderzuhalten sind, wenn sie übereinanderliegen — das ist ja der
 * Zustand, den man herstellen will.
 */
const AIM_LINE_COLOR = 0xf2f6ff;
const AIM_LINE_SCALE = 5;
const AIM_LINE_MIN = 0.16;
const AIM_LINE_MAX = 1.1;

const _box = new THREE.Box3();
const _bounds = new THREE.Box3();
const _centre = new THREE.Vector3();
const _size = new THREE.Vector3();
const _zero = new THREE.Vector3();
const _handspan = new THREE.Vector3(0.2, 0.2, 0.2);
const _down = new THREE.Vector3(0, -1, 0);
/** Für den Weg aus der Bühne in den Raum des Werkzeugs (`gripAim`). */
const _inverse = new THREE.Matrix4();
const _local = new THREE.Matrix4();
const _at = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

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
 * Eine **Welt** (`showWorld`) ist davon kein Sonderfall, sondern ein großes
 * Ding: dieselbe Bühne, dieselben zwei Winkel, dieselben Finger — nur schräger
 * von oben, langsamer gedreht, mit ihrem eigenen Licht und, wenn sie ein Dach
 * hat, unter dem Dach aufgeschnitten.
 */
export class ToolViewer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.01, 60);
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
  /** Der Zielpfeil am Werkzeug — `null`, wenn dieses Werkzeug nicht zielt. */
  private aimLine: THREE.LineSegments | null = null;
  private mode: HandMode = 'grip';
  private side: Handedness = 'right';
  /** Wie schnell sich das Gezeigte von selbst dreht — eine Welt langsamer. */
  private spin = IDLE_SPIN;
  /** Die Ansicht, auf die der Doppeltipp zurückgeht. */
  private home = { yaw: 0.6, pitch: 0.35 };
  /**
   * Höhe eines waagerechten Schnitts durch das Gezeigte, oder `null`.
   *
   * Die Ebene dazu liegt im Raum und nicht am Modell, das Modell dreht sich
   * aber — deshalb wird sie in jedem Bild neu aus der Lage der Bühne gerechnet
   * (`render`). Sonst wanderte der Schnitt beim Drehen durch die Welt.
   */
  private cut: number | null = null;
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

  /** Halbmesser des Gezeigten, und der Faktor, den die Finger daraus machen. */
  private radius = 0.12;
  /** Halbmesser seines Grundrisses und seine halbe Höhe — für Flaches. */
  private footprint = 0.12;
  private height = 0.12;
  /** Liegt es flach wie eine Welt? Dann wird enger eingepasst (`distance`). */
  private flat = false;
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
    // Und der Zielpfeil, sofern dieses Werkzeug zielt: am Werkzeug selbst und in
    // seinem Nullpunkt, denn dort steht der Strahl, auf den es gedreht wird.
    if (tool.alignToAim) {
      const line = createArrow(AIM_LINE_COLOR, AIM_LINE_MIN);
      line.name = 'tool-aim';
      tool.add(line);
      this.aimLine = line;
    }
    this.flat = false;
    this.home = { yaw: 0.6, pitch: 0.35 };
    this.yaw = this.home.yaw;
    this.pitch = this.home.pitch;
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
    this.home = { yaw: 0.6, pitch: options.pitch ?? 0.25 };
    this.yaw = this.home.yaw;
    this.pitch = this.home.pitch;
    this.zoom = 1;
    this.spinning = true;
    this.spin = options.spin ?? IDLE_SPIN;
    this.studio.visible = !options.ownLight;
    this.flat = options.flat ?? false;
    this.setCut(options.cut ?? null);
    this.fit();
  }

  /**
   * Eine **Welt** auf die Bühne: wie ein Ding, nur größer.
   *
   * Sie wird eingepasst wie ein Werkzeug — ganz drauf, von weit weg —, und
   * angesehen wird sie **schräg von oben**. Darum geht es hier: um den
   * Überblick. Wer wissen will, ob ihm eine Welt gefällt, will zuerst ihren
   * Grundriss sehen — die Runde, das Tal, die vier Zimmer.
   *
   * Drei Dinge sind anders als bei einem Werkzeug. Sie dreht sich **langsamer**
   * (eine Welt ist keine Zange vor der Nase). Ihr **Licht** bringt sie selbst
   * mit, das Bühnenlicht geht dafür aus. Und hat sie ein **Dach**, wird sie
   * darunter aufgeschnitten wie ein Puppenhaus — sonst zeigte die
   * Vogelperspektive von einem Haus genau das, was ein Haus verbirgt.
   */
  showWorld(preview: WorldPreview): void {
    this.showObject(preview.object, {
      animate: (time) => preview.animate?.(time),
      dispose: () => preview.dispose(),
      ownLight: true,
      flat: true,
      spin: WORLD_SPIN,
      pitch: WORLD_PITCH,
      // Ein Stück unter der Decke, und nie höher als Kopfhöhe: Wände, die man
      // noch als Wände erkennt, aber kein Deckel mehr darüber.
      cut:
        preview.roof === null || preview.roof === undefined
          ? null
          : Math.min(preview.roof - 0.3, CUT_HEIGHT),
    });
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

  /** Ob an diesem Werkzeug überhaupt ein Griff sitzt — sonst gibt es nichts auszurichten. */
  get hasGrip(): boolean {
    return this.gripFronts.length > 0;
  }

  /** Und ob es zielt — dann gibt es den weißen Pfeil und den Knopf dazu. */
  get hasAim(): boolean {
    return this.aimLine !== null;
  }

  /**
   * **Die Hand und ihre Linie**, im Raum des Werkzeugs — die Größe, an der der
   * Regler zieht (`ghostOnTool`).
   *
   * Genommen aus den Weltmatrizen und nicht nachgerechnet: die Linie hängt an
   * der Fingerspitze, geht also jede Krümmung mit, und was hier herauskommt,
   * ist genau das, was auf dem Schirm steht. Wer die Hand daran ausrichtet,
   * richtet sie an dem aus, was er sieht.
   */
  handAim(): { hand: Pose; finger: Ray } | null {
    const tool = this.tool;
    const hand = this.hand;
    const finger = this.fingerLine;
    if (!tool || !hand || !finger) return null;
    this.intoTool(tool);
    const line = rayIn(finger);
    _local.multiplyMatrices(_inverse, hand.matrixWorld).decompose(_at, _quat, _scale);
    return {
      hand: {
        position: { x: _at.x, y: _at.y, z: _at.z },
        rotation: { x: _quat.x, y: _quat.y, z: _quat.z, w: _quat.w },
      },
      finger: line,
    };
  }

  /**
   * Der Pfeil am **Griff**, ebenfalls im Raum des Werkzeugs.
   *
   * Trägt ein Werkzeug **mehrere** Griffe (das Drohnendeck hat zwei), gewinnt
   * der, der der Fingerspitze am nächsten liegt — man richtet an dem Griff aus,
   * an dem die Hand schon ungefähr liegt, und nicht am erstbesten im Baum.
   */
  gripAim(): Ray | null {
    const tool = this.tool;
    const finger = this.fingerLine;
    if (!tool || this.gripFronts.length === 0) return null;
    this.intoTool(tool);
    const from = finger ? rayIn(finger).origin : { x: 0, y: 0, z: 0 };
    let nearest: Ray | null = null;
    let closest = Infinity;
    for (const front of this.gripFronts) {
      const ray = rayIn(front);
      const gap = Math.hypot(ray.origin.x - from.x, ray.origin.y - from.y, ray.origin.z - from.z);
      if (gap < closest) {
        closest = gap;
        nearest = ray;
      }
    }
    return nearest;
  }

  /** Und der **Zielpfeil** des Werkzeugs: sein Nullpunkt, sein -Z. */
  toolAim(): Ray | null {
    const tool = this.tool;
    const line = this.aimLine;
    if (!tool || !line) return null;
    this.intoTool(tool);
    return rayIn(line);
  }

  /** Frische Matrizen, und der Weg aus der Bühne in den Raum des Werkzeugs. */
  private intoTool(tool: Tool): void {
    this.stage.updateWorldMatrix(true, true);
    _inverse.copy(tool.matrixWorld).invert();
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
      if (this.spinning) this.yaw += dt * this.spin;
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
    this.sizeLines();
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

  /**
   * Die Längen der beiden gezeichneten Richtungen, sobald feststeht, wie groß
   * das Gezeigte ist.
   *
   * Beide als Vielfaches des Halbmessers und beide geklemmt: eine feste Länge
   * wäre am Hängegleiter ein Strich und an der Pistole ein Faden. Die
   * Fingerlinie wird dabei **skaliert** — sie ist ein Strich, dem das nichts
   * tut —, der Zielpfeil bekommt seine Punkte **neu**: eine Skalierung zöge
   * seine Widerhaken mit in die Länge, und dann wäre er kein Pfeil mehr.
   */
  private sizeLines(): void {
    if (this.fingerLine) {
      this.fingerLine.scale.z = Math.min(
        FINGER_LINE_MAX,
        Math.max(FINGER_LINE_MIN, this.radius * FINGER_LINE_SCALE),
      );
    }
    if (this.aimLine) {
      const length = Math.min(AIM_LINE_MAX, Math.max(AIM_LINE_MIN, this.radius * AIM_LINE_SCALE));
      this.aimLine.geometry.setFromPoints(arrowPoints(length));
    }
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
    // Für etwas Flaches wird zusätzlich der Grundriss gemerkt — warum, steht
    // an `distance`.
    this.footprint = Math.max(Math.hypot(_size.x, _size.z) / 2, 0.02);
    this.height = Math.max(_size.y / 2, 0.01);
  }

  /**
   * Wie weit die Kamera wegmuss, damit alles ins Bild passt — mit dem
   * **schmaleren** der beiden Öffnungswinkel gerechnet.
   *
   * Auf einem Telefon ist das der waagerechte, auf einem breiten Fenster der
   * senkrechte. Nur mit dem senkrechten gerechnet stünde ein Werkzeug auf dem
   * Telefon links und rechts über den Rand hinaus.
   *
   * Für etwas **Flaches** wird anders gerechnet, und der Unterschied ist keine
   * Feinheit: die Kugel um eine Welt ist so hoch wie breit, eine Welt aber ist
   * ein Grundriss mit ein bisschen Höhe darauf. Auf die Kugel eingepasst stand
   * das Dunkelhaus als Briefmarke in einer leeren Fläche — halb so weit weg
   * ist es das, was jemand sehen wollte. Gerechnet wird deshalb mit dem
   * Grundriss (der sich beim Drehen nicht ändert) und der Höhe, die unter dem
   * Blickwinkel dazukommt. Und zwar mit dem Winkel der **Ausgangsansicht**:
   * eine Kamera, die beim Kippen mitfährt, fühlt sich an wie ein Bild, das
   * nicht stillhält.
   */
  private distance(aspect: number): number {
    const vertical = (this.camera.fov * Math.PI) / 360;
    const horizontal = Math.atan(Math.tan(vertical) * aspect);
    if (!this.flat) return (this.radius * PADDING) / Math.sin(Math.min(vertical, horizontal));
    const tilt = this.home.pitch;
    const high = this.footprint * Math.sin(tilt) + this.height * Math.cos(tilt);
    return PADDING * Math.max(this.footprint / Math.tan(horizontal), high / Math.tan(vertical));
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
    const visit = (object: THREE.Object3D): void => {
      // Kulisse zählt nicht mit: der Himmel einer Welt ist eine Kugel von 560
      // Metern und ihr Boden eine Platte von tausend — eingepasst auf die
      // beiden wäre jede Welt ein Punkt in der Mitte. Gezeichnet werden sie
      // trotzdem, sie stehen ja dahinter.
      if (!object.visible || object.userData.backdrop) return;
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        const bounds = mesh.geometry.boundingBox;
        if (bounds) {
          _bounds.copy(bounds).applyMatrix4(mesh.matrixWorld);
          _box.union(_bounds);
        }
      }
      for (const child of object.children) visit(child);
    };
    visit(this.stage);
    // Ein Werkzeug ganz ohne sichtbares Mesh gibt es nicht, aber eine leere
    // Kiste ergäbe eine Kamera im Nichts. Dann eben eine Handbreit.
    if (_box.isEmpty()) _box.setFromCenterAndSize(_zero, _handspan);
  }

  /**
   * Den waagerechten Schnitt setzen oder aufheben.
   *
   * Die Ebene wird beim Renderer angemeldet und dort in jedem Bild gelesen;
   * ihre Zahlen füllt `render` nach, sobald die Drehung des Bildes feststeht.
   */
  private setCut(height: number | null): void {
    this.cut = height;
    this.renderer.clippingPlanes = height === null ? [] : [this.plane];
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
    const aim = this.aimLine;
    this.aimLine = null;
    if (aim) {
      aim.removeFromParent();
      aim.geometry.dispose();
      (aim.material as THREE.Material).dispose();
    }
    this.studio.visible = true;
    this.spin = IDLE_SPIN;
    this.setCut(null);
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

    const fitted = this.distance(this.camera.aspect);
    this.camera.position.set(0, 0, fitted * this.zoom);
    this.camera.near = Math.max(0.005, fitted * 0.02);
    this.camera.far = fitted * 12;
    this.camera.updateProjectionMatrix();
    this.pivot.rotation.set(this.pitch, this.yaw, 0);

    // Der Schnitt gehört dem Modell und nicht dem Raum: er liegt waagerecht in
    // der Welt, die sich dreht. Also wird die Ebene aus der Lage der Bühne
    // gerechnet, nachdem die Drehung dieses Bildes steht.
    if (this.cut !== null) {
      this.pivot.updateMatrixWorld(true);
      this.plane.set(_down, this.cut);
      this.plane.applyMatrix4(this.stage.matrixWorld);
    }
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
    this.yaw = this.home.yaw;
    this.pitch = this.home.pitch;
    this.zoom = 1;
    this.spinning = true;
    this.fit();
    this.sizeLines();
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

/**
 * Eine Linie, wie sie im Raum des Werkzeugs liegt: ihr eigener Nullpunkt und
 * ihr -Z.
 *
 * Beide Linien sind entlang **-Z ihres eigenen Knotens** gezeichnet — die am
 * Finger von (0,0,0) nach (0,0,-1), die am Griff von der Mitte zur Spitze des
 * Pfeils —, und deshalb steht die ganze Auskunft in ihrer Matrix.
 * `transformDirection` normiert dabei mit, was das Stauchen des Griffs
 * herausrechnet.
 */
function rayIn(line: THREE.Object3D): Ray {
  _local.multiplyMatrices(_inverse, line.matrixWorld);
  _at.setFromMatrixPosition(_local);
  _dir.set(0, 0, -1).transformDirection(_local);
  return {
    origin: { x: _at.x, y: _at.y, z: _at.z },
    direction: { x: _dir.x, y: _dir.y, z: _dir.z },
  };
}
