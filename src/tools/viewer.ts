import * as THREE from 'three';
import { GhostHand, handColor } from '../core/HandVisuals';
import { holdHandPose } from '../core/handPoseStore';
import {
  GRIP_FINGER_MOVES,
  GRIP_POSE_ID,
  HELD_BUTTONS,
  buttonCurls,
  fingerMovesOf,
  type FingerButtons,
} from '../core/handPose';
import { createTool } from '../worlds/portal/tools';
import { TOOL_HOME, stageForGrip } from './handStage';
import { GRIP_TO_RAY, STANDARD_GRIP_IN_HAND } from '../worlds/portal/tools/gripFit';
import { IDENTITY, type Quat } from '../worlds/portal/tools/aim';
import {
  GRIP_LENGTH,
  addGripFronts,
  arrowPoints,
  createArrow,
  createGripShape,
} from '../worlds/portal/tools/grip';
import { HANDLE_COLOR } from '../core/controllerHandle';
import { createAxes, disposeAxes } from '../core/axesCross';
import { holdForOtherHand, readPose } from '../worlds/portal/tools/toolPose';
import {
  composePose,
  ghostOnTool,
  invertPose,
  poseOfHand,
  toolInGrip,
} from '../worlds/tune/handGrip';
import {
  NO_INPUT,
  flyDolly,
  flyLook,
  flyStep,
  isMoving,
  type FlyInput,
  type FlyView,
} from './flyCamera';
import type { Ray } from './alignHand';
import type { Pose } from '../worlds/tune/handGrip';
import type { HoldPose, PoseReadout } from '../worlds/portal/tools/toolPose';
import type { Tool } from '../worlds/portal/tools/Tool';
import type { Handedness } from '../core/XRInput';
import type { WorldPreview } from '../core/types';

/**
 * Was neben dem Werkzeug zu sehen ist — und das sind **zwei verschiedene
 * Hände**, nicht zweimal dieselbe aus zwei Winkeln.
 *
 * Lange waren die beiden Ansichten dasselbe Bild in zwei Rahmen: einmal stand
 * die Hand still und das Werkzeug lag darin, einmal stand das Werkzeug still
 * und die Hand lag daran. Wer sich den Pinsel ansah, sah zweimal genau
 * dasselbe — „da ist kein Unterschied" war die richtige Beobachtung. Es gibt
 * aber wirklich zwei Bilder, und sie zeigen zwei verschiedene Dinge:
 *
 * - `off` — **Hand aus**: nur das Werkzeug. Für die Form, ohne eine Hand davor.
 * - `vr` — **Hand in VR**, wie es in der Brille aussieht: die gezeichnete Hand
 *   liegt so am Werkzeug, wie die Haltung dieses Werkzeugs es sagt. Hier soll
 *   der Pinsel wie ein Stift gehalten aussehen und die Pistole wie eine
 *   Pistole — hier ist der Unterschied zu Hause, den es in echt nicht gibt.
 * - `controller` — **Hand in echt**, wie die Hand wirklich hält: die Hand nach
 *   vorn ausgestreckt wie an einer Pistole, der **Halterzylinder** aufrecht in
 *   ihr (rot, weil er hier nicht das Werkzeug meint, sondern das Gerät), und
 *   der Zeigestrahl läuft von seiner **oberen Kante** geradeaus auf die
 *   Scheibe. Das ist die Haltung, an der man sich orientiert. Das Werkzeug
 *   bleibt als **Geist** stehen — in der echten Hand liegt keines, aber ohne
 *   es wüsste man nicht mehr, wovon das Bild handelt. Es ist deshalb für jedes
 *   Werkzeug dasselbe Bild, und das ist keine Schwäche, sondern die Auskunft:
 *   **echt hält man den Pinsel wie die Waffe.**
 *
 *   Hier stand eine Weile die Faust um den **Handgriff des Geräts**
 *   (`CONTROLLER_HAND_POSE` um `CONTROLLER_HANDLE`, ein Zylinder entlang der
 *   Z-Achse des Griffraums). Die beiden sind **47° in Pitch** auseinander — es
 *   sind zwei Modelle desselben Handgriffs, und nur eines kann stimmen. Es ist
 *   dieses: an ihm hängt jede Faust, jedes Werkzeug und jede Zahl dieses
 *   Spiels.
 *
 * **Die Welt bleibt dabei stehen.** Werkzeug und Zielscheibe stehen in jeder
 * Ansicht an derselben Stelle, und die Kamera passt sich nur an die beiden an;
 * was sich beim Umschalten bewegt, ist die Hand und sonst nichts. Vorher lag
 * am Controller der Griffraum in der Bühne, das Werkzeug war weg und die
 * Scheibe stand plötzlich schräg unten links — zwei Bilder, die man nicht
 * vergleichen konnte.
 *
 * **Und sie steht bei jedem Werkzeug gleich herum.** Die Bühne wird so
 * gedreht, dass die echte Hand überall dieselbe Lage hat und ihr Zeigestrahl
 * waagerecht quer durchs Bild auf die Scheibe läuft (`tools/handStage.ts`) —
 * in allen drei Ansichten dieselbe Drehung, sonst spränge beim Umschalten
 * wieder die Welt. Schräg im Bild liegt danach nur noch, was auch in der Hand
 * schräg liegt: die Taschenlampe zeigt an der Scheibe vorbei, weil man sie so
 * hält.
 *
 * Der grüne **Halterzylinder** gehört zum Werkzeug und bleibt, wo er ist: er
 * ist das, was alle Waffen einander ähnlich macht. Der rote Zylinder daneben
 * ist etwas anderes — nicht Teil eines Werkzeugs, sondern das Gerät in der
 * echten Hand.
 */
export type HandMode = 'off' | 'controller' | 'vr';

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
  /**
   * Läuft jedes Bild mit den **Sekunden seit dem letzten** — für eine Welt,
   * die nicht nur wirbelt, sondern rechnet (`shared/livePreview.ts`).
   *
   * Getrennt von `animate`, weil die beiden verschiedene Fragen beantworten:
   * „wie spät ist es" dreht einen Ring, „wie lange ist es her" macht einen
   * Simulationsschritt. Eine Physik, der man die Uhrzeit gibt, springt beim
   * ersten Bild um eine halbe Minute.
   */
  step?(dt: number): void;
}

/** Ein Tipp auf die Bühne, umgerechnet in den Raum des Gezeigten. */
export interface StagePick {
  /** Das vorderste getroffene Ding. */
  object: THREE.Object3D;
  /** Wo es getroffen wurde — in den Koordinaten der gezeigten Welt. */
  point: THREE.Vector3;
}

/** Wie weit die Kamera über das Gezeigte hinaus Luft lässt. */
const PADDING = 1.12;

/**
 * **Die Zielscheibe**: dort, wohin die Hand zeigt.
 *
 * Ein Werkzeug auf einer leeren Bühne hat kein Vorne — man sieht eine Pistole
 * und eine Hand und dreht sie, bis man glaubt zu wissen, wo der Lauf hinzeigt.
 * Also steht dort etwas, worauf man zeigt: eine Zielscheibe auf dem
 * **Zeigestrahl der Hand** — nicht des Werkzeugs. Das Bild ist damit das aus
 * der Brille, wenn man den Controller auf etwas richtet: die weiße Linie läuft
 * sauber nach vorn auf die Scheibe, und das Werkzeug liegt dabei so in der
 * Hand, wie es eben liegt. Wer wissen will, ob das Werkzeug **selbst** dorthin
 * zielt, sieht auf seinen violetten Pfeil daneben: beim Hammer, beim Beutel
 * oder am Controller gibt es keinen, und genau das ist die Auskunft.
 *
 * Abstand und Größe hängen an dem, was auf der Bühne steht: vor einer Pistole
 * eine Handbreit Scheibe eine Armlänge weit weg, vor dem Hängegleiter eine
 * meterweit. Sie zählt beim Einpassen **mit**, sonst stünde sie außerhalb des
 * Bildes; das Werkzeug wird dadurch kleiner, und dafür gibt es das Zoomen.
 */
const TARGET_DISTANCE = 2.4;
const TARGET_MIN_DISTANCE = 0.3;
const TARGET_RADIUS = 0.45;
const TARGET_MIN_RADIUS = 0.055;
const TARGET_RED = 0xe0433a;
const TARGET_WHITE = 0xf2f6ff;
/**
 * Grenzen für das Zoomen, als Faktor auf den eingepassten Abstand.
 *
 * Für eine **Welt** eine andere Untergrenze als für ein Werkzeug, und das ist
 * der Unterschied zwischen „nah heran" und „hinein": ein halber Meter vor einer
 * Zange ist nah, ein halber Kilometer vor einem Tal ist die Übersicht. Eine
 * Welt darf deshalb bis auf ein Zwanzigstel des eingepassten Abstands heran —
 * wer noch näher will, nimmt die freie Kamera und fliegt.
 */
const ZOOM_MIN = 0.45;
const ZOOM_MIN_WORLD = 0.05;
const ZOOM_MAX = 2.6;
/**
 * Wie schnell sich eine **Welt** von selbst dreht, bis jemand sie anfasst
 * (rad/s): langsam, eine volle Runde dauert knapp eine Minute — lang genug,
 * um irgendwo hinzusehen, ohne dass es schon weitergezogen ist.
 *
 * Ein **Werkzeug** dreht sich nicht mehr von selbst. Es drehte sich eine
 * Weile, und das nahm ihm das Einzige, was man an ihm wissen will: wo vorne
 * ist. Jetzt steht es still, mit der Zielscheibe davor, und wer es von der
 * anderen Seite sehen will, dreht es.
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
 * **Die freie Kamera**: wie schnell sie fliegt, und wie schnell sie am Rad
 * vorrückt.
 *
 * Nicht in festen Metern je Sekunde, sondern nach dem **Abstand zu dem, was man
 * ansieht** — so, wie jede Karte fliegt: von weit draußen legt ein Druck
 * Kilometer zurück, mitten in der Welt Meter. Eine feste Zahl kann das nicht:
 * dieselbe ist im Dunkelhaus ein Katapult und in den Alpen ein Stillstand
 * (deren Kulisse misst vier Kilometer im Halbmesser), und beide stehen in
 * derselben Liste von Welten.
 *
 * Gemessen wird bis an die **Kugel um das Gezeigte** und nicht bis zu deren
 * Mitte: wer drinnen ist, ist da, und dort gilt der langsame Gang — ein
 * Hundertstel des Halbmessers je Sekunde. Draußen ist es ein Anteil des
 * Abstands, und weil der beim Anfliegen schrumpft, bremst der Flug von selbst
 * ab, statt an der Welt vorbeizuschießen.
 *
 * Nach oben begrenzt die halbe Größe des Gezeigten je Sekunde: schneller
 * gesehen ist die Welt weg, bevor man den Finger hebt. Die beiden festen Zahlen
 * darum herum sind nur der Notnagel für eine Bühne, auf der etwas sehr Kleines
 * oder sehr Großes steht.
 */
const FLY_SPEED_SHARE = 0.5;
const FLY_SPEED_SLOW = 0.01;
const FLY_SPEED_FAST = 0.5;
const FLY_SPEED_MIN = 0.8;
const FLY_SPEED_MAX = 2000;
/** Was ein Rasten am Rad schiebt, gemessen an einer Sekunde Flug. */
const FLY_DOLLY_STEP = 0.35;
/**
 * Vorn und hinten im Flug: nah genug für eine Wand vor der Nase, weit genug
 * für den Himmel dahinter — der ist eine Kugel von 560 Metern, der Boden eine
 * Platte von tausend, und beide zählen beim Einpassen nicht mit.
 */
const FLY_NEAR = 0.05;
const FLY_FAR = 2400;

/**
 * Wie hoch der Schnitt durch eine Welt mit Dach höchstens liegt.
 *
 * Etwas über Kopfhöhe: Wände bleiben Wände, Tische, Türen und Schilder bleiben
 * drin, und der Deckel ist weg.
 */
const CUT_HEIGHT = 2.4;

/** Wie weit ein Finger wandern darf, damit sein Aufsetzen ein Tipp bleibt. */
const TAP_SLOP = 9;
/** Und wie lange er dabei liegen darf, in Millisekunden. */
const TAP_TIME = 600;
/** Die Draufsicht: fast senkrecht, aber eben nur fast (`lookDown`). */
const TOP_PITCH = 1.25;

/**
 * **Der Zeigestrahl der Hand**, als weiße Linie — dieselbe, die in der Brille
 * aus dem Quest-Controller nach vorn läuft.
 *
 * Sie gehört dem **Gerät** und nicht den Fingern: sie steht im Griffraum, 30°
 * unter dessen -Z (`GRIP_TO_RAY`), und liegt damit genau dort, wo der
 * Zeigefinger einer Hand ohne gezogenen Trigger entlangzeigt. Deshalb ändert
 * sich an ihr auch nichts, wenn der Trigger kommt — der krümmt einen Finger,
 * nicht den Controller.
 *
 * Vorher hing hier eine bernsteinfarbene Linie an der **Fingerspitze**, und
 * die machte jede Krümmung mit: sie wanderte beim Drücken des Triggers weg,
 * ging an der Zielscheibe vorbei, und aus dem Bild „so zeigt die Hand" wurde
 * „so steht gerade dieser eine Finger". Die Scheibe steht ohnehin auf diesem
 * Strahl (`placeTarget`) — mit ihm zeigt die Hand auf jeder Werkzeugseite
 * genau dorthin, wie in der Brille.
 */
const HAND_LINE_COLOR = 0xf2f6ff;
const HAND_LINE_MIN = 0.12;
/** So weit über den Abstand zur Scheibe hinaus laufen die beiden Linien. */
const LINE_BEYOND = 1.15;

/**
 * **Wohin das Werkzeug zielt**, als Pfeil: aus seinem Nullpunkt nach -Z.
 *
 * Dass es -Z ist, ist keine Setzung dieser Seite, sondern die Regel des Spiels:
 * ein gehaltenes Werkzeug wird aus dem Halter auf den Zeigestrahl gedreht, und
 * von da an *ist* sein eigenes -Z die Zielrichtung (`tools/aim.ts`). Der Pfeil
 * zeichnet also nichts Neues — er macht das sichtbar, wonach ohnehin
 * geschossen, geleuchtet und gegriffen wird. Er hängt an denen, die wirklich
 * zielen (`alignToAim`); Boxhand, Controller, Flügel und Beutel zeigen
 * nirgendwohin und bekommen deshalb keinen.
 *
 * **Violett**, denn die anderen Farben sind vergeben: der Halter grün, sein
 * Pfeil rosa, die Hand hellblau und ihr Zeigestrahl weiß. Er liegt bei einem
 * richtig eingemessenen Werkzeug *auf* dem weißen Strahl — zwei weiße Linien
 * übereinander wären zusammen eine, und dann sähe man nicht mehr, ob es zwei
 * sind.
 *
 * Genauso lang wie der Zeigestrahl, bis hinter die Scheibe: liegen die beiden
 * übereinander, treffen sie dieselbe Stelle — das ist ja der Zustand, den man
 * herstellen will.
 */
const AIM_LINE_COLOR = 0xb388ff;
const AIM_LINE_MIN = 0.16;

/** Wie gläsern die gezeichnete Hand neben der echten steht (`apply`). */
const VR_GHOST_OPACITY = 0.4;

/** Wie lang die Arme des Achsenkreuzes im Bearbeiten-Modus sind. */
const AXES_SIZE = 0.13;

const _box = new THREE.Box3();
const _bounds = new THREE.Box3();
const _centre = new THREE.Vector3();
const _size = new THREE.Vector3();
const _zero = new THREE.Vector3();
const _handspan = new THREE.Vector3(0.2, 0.2, 0.2);
const _down = new THREE.Vector3(0, -1, 0);
/** Der Blick der freien Kamera, in derselben Reihenfolge wie sie ihn führt. */
const _look = new THREE.Euler(0, 0, 0, 'YXZ');
/** Für den Weg aus der Bühne in den Rahmen der echten Hand (`intoHand`). */
const _inverse = new THREE.Matrix4();
const _frame = new THREE.Matrix4();
const _local = new THREE.Matrix4();
/** Die Stelle im Bild, an der getippt wurde, in Bildkoordinaten von −1 bis 1. */
const _ndc = new THREE.Vector2();
/** Die Lage eines Meshes in dem Raum, in dem gerade gemessen wird. */
const _measured = new THREE.Matrix4();
const _identity = new THREE.Matrix4();
/** Die Drehung der Bühne, zum Herausrechnen. */
const _unturn = new THREE.Matrix4();
const _at = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _holdPosition = new THREE.Vector3();
const _holdRotation = new THREE.Quaternion();
/** Der Zeigestrahl der Hand im Griffraum: 30° unter dem -Z des Griffs (`GRIP_TO_RAY`). */
const _aimQuat = new THREE.Quaternion(GRIP_TO_RAY.x, GRIP_TO_RAY.y, GRIP_TO_RAY.z, GRIP_TO_RAY.w);
const _rayInGrip = new THREE.Vector3(0, 0, -1).applyQuaternion(_aimQuat);
/**
 * **Wo der Zeigestrahl anfängt**, im Griffraum: an der **oberen Kante** des
 * Halterzylinders.
 *
 * Der Nullpunkt des Griffraums ist die *Mitte* der Faust — dort sitzt die
 * Mitte des Zylinders, eine halbe Faustbreite tiefer. Ein Strahl, der dort
 * anfängt, läuft eine Handbreit unter dem Lauf des Werkzeugs her: zwei
 * parallele Linien, von denen man beim Hinsehen keine der beiden glaubt. Aus
 * der oberen Kante gezogen liegt er da, wo an einer Pistole der Lauf sitzt —
 * und damit fast genau auf dem Zielpfeil des Werkzeugs.
 *
 * Verschoben wird nur das **Bild**: die Richtung bleibt, und die Zielscheibe
 * wandert mit (`placeTarget`), also zeigt die Linie weiter genau auf sie.
 */
const _rayFromGrip = new THREE.Vector3(0, GRIP_LENGTH / 2, 0)
  .applyQuaternion(
    new THREE.Quaternion(
      STANDARD_GRIP_IN_HAND.rotation.x,
      STANDARD_GRIP_IN_HAND.rotation.y,
      STANDARD_GRIP_IN_HAND.rotation.z,
      STANDARD_GRIP_IN_HAND.rotation.w,
    ),
  )
  .add(
    new THREE.Vector3(
      STANDARD_GRIP_IN_HAND.position.x,
      STANDARD_GRIP_IN_HAND.position.y,
      STANDARD_GRIP_IN_HAND.position.z,
    ),
  );
const _forward = new THREE.Vector3(0, 0, 1);
/** Nichts abschneiden — dieselbe leere Liste, statt jedes Bild eine neue. */
const _noPlanes: THREE.Plane[] = [];

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
 * An einem **Werkzeug** ist es sogar nur *einer*: das Ziehen giert, das Nicken
 * bleibt auf dem Winkel, mit dem die Ansicht aufmacht (`onMove`). Ein Werkzeug
 * steht da, wie es in der Hand steht, und man will es von allen Seiten sehen —
 * nicht von oben und unten.
 *
 * Eine **Welt** (`showWorld`) ist davon kein Sonderfall, sondern ein großes
 * Ding: dieselbe Bühne, dieselben zwei Winkel — und sie behält beide, denn bei
 * ihr *ist* der Blick von oben das Thema —, dieselben Finger, nur schräger von
 * oben, langsamer gedreht, mit ihrem eigenen Licht und, wenn sie ein Dach hat,
 * unter dem Dach aufgeschnitten.
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
  /** Der weiße Zeigestrahl — er steht im Griffraum, nicht an der Hand. */
  private handLine: THREE.Line | null = null;
  /** Und je eine je Halterzylinder: wohin dieser zeigt. */
  private gripFronts: THREE.LineSegments[] = [];
  /** Der rote Handgriff des Controllers — nur in der Ansicht *Hand in echt*. */
  private handle: THREE.Mesh | null = null;
  /** Der Griffraum als Knoten: dort läge der Controller, der dieses Werkzeug hält. */
  private rig: THREE.Group | null = null;
  /** Das Achsenkreuz im Bearbeiten-Modus — der Rahmen der echten Hand. */
  private axes: THREE.Group[] = [];
  /** Beim Justieren: Achsen dazu, und in echt wandert das Werkzeug statt der Hand. */
  private editing = false;
  /**
   * **Die Lage des Griffraums beim Justieren in echt** — eingefroren.
   *
   * Sie wird genommen, sobald das Justieren im Griffraum anfängt, und gilt bis
   * es endet oder ein anderes Werkzeug kommt (`apply`). Zwei Dinge zugleich:
   * Der Anblick ist im ersten Bild derselbe wie beim Ansehen — sonst kippte
   * die Bühne beim Druck auf *Bearbeiten* um die Lage-im-Griff weg —, und die
   * Bühne steht danach still, während der Regler zieht: eingefroren heißt,
   * dass das Werkzeug wandert und nicht die Ansicht. Nachgeführt wäre das
   * Gegenteil — dann stünde das Werkzeug und die Hand drehte sich darunter.
   */
  private gripBase: Pose | null = null;
  /**
   * **Die Drehung, die die echte Hand hinstellt** (`HAND_IN_STAGE`) — oder
   * `null`, solange sie neu gerechnet werden darf.
   *
   * Beim Ansehen wird sie in jedem `apply` frisch aus der Lage des Griffraums
   * gerechnet; beim **Justieren** ist sie eingefroren, aus demselben Grund wie
   * `gripBase`: in *Hand in VR* steht das Werkzeug still und die gezeichnete
   * Hand wandert daran. Führte die Bühne die echte Hand dabei nach, drehte sich
   * stattdessen das Werkzeug unter ihr weg, und man justierte gegen ein Bild,
   * das sich mitbewegt.
   */
  private align: THREE.Quaternion | null = null;
  /** Die gezeichnete Hand als Geist — nur beim Justieren in *Hand in echt*. */
  private vrHand: GhostHand | null = null;
  /** Der Zielpfeil am Werkzeug — `null`, wenn dieses Werkzeug nicht zielt. */
  private aimLine: THREE.LineSegments | null = null;
  /** Die Zielscheibe auf dem Zeigestrahl der Hand, und wie weit weg sie steht. */
  private target: THREE.Group | null = null;
  private targetDistance = 0;
  private mode: HandMode = 'vr';
  /**
   * **Welche Hand die Seite zeigt** — die Wahl aus dem Kopf der Seite.
   *
   * Getrennt von `side`, weil zwei Werkzeuge sie nicht haben: einen linken
   * Controller hält man links und sonst nirgends. Bei allen anderen ist das
   * hier die Antwort, und `side` folgt.
   */
  private wanted: Handedness = 'right';
  /** Was die Knöpfe gerade tun — Griffknopf gedrückt, Trigger nicht, wie beim Halten. */
  private buttons: FingerButtons = HELD_BUTTONS;
  private side: Handedness = 'right';
  /** Wie schnell sich das Gezeigte von selbst dreht — nur eine Welt tut das. */
  private spin = 0;
  /** Die Ansicht, auf die der Doppeltipp zurückgeht. */
  private home = { ...TOOL_HOME };
  /** Wie groß das Gezeigte ist, Kante für Kante — für die Draufsicht. */
  private readonly extent = new THREE.Vector3();
  /** Ob gerade senkrecht von oben gesehen wird (`lookDown`). */
  private topDown = false;
  /**
   * Höhe eines waagerechten Schnitts durch das Gezeigte, oder `null`.
   *
   * Die Ebene dazu liegt im Raum und nicht am Modell, das Modell dreht sich
   * aber — deshalb wird sie in jedem Bild neu aus der Lage der Bühne gerechnet
   * (`render`). Sonst wanderte der Schnitt beim Drehen durch die Welt.
   */
  private cut: number | null = null;
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  /** Dieselbe Ebene als Liste, wie der Renderer sie will. */
  private readonly planes = [this.plane];

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

  /**
   * Die **freie Kamera**, oder `null` für die Ansicht von außen.
   *
   * Zwei Ansichten, ein Bild: von außen dreht sich die Bühne vor einer Kamera,
   * die auf ihrem Abstand sitzt; im Flug steht die Bühne still und die Kamera
   * geht darin herum. Beides zugleich gibt es nicht — deshalb ein Feld, das
   * entweder etwas ist oder nichts, und keine zweite Sorte Winkel daneben.
   */
  private fly: FlyView | null = null;
  private flyInput: FlyInput = NO_INPUT;

  private readonly pointers = new Map<number, THREE.Vector2>();
  private pinch = 0;
  private lastTap = 0;
  /** Ob der letzte Zeiger allein herunterging — ein Zangengriff ist kein Tipp. */
  private lastAlone = false;
  private frame = 0;
  private clock = new THREE.Clock();
  /**
   * **Wer einen Tipp auf die Bühne bekommt** — `null`, solange niemand fragt.
   *
   * Ein Tipp ist hier kein `click`: Auf dieser Bühne wird gedreht, gezoomt und
   * geflogen, und jede dieser Bewegungen fängt mit einem Finger auf dem Glas
   * an. Als Tipp zählt deshalb nur, was **an einer Stelle** anfängt und
   * aufhört (`TAP_SLOP`, `TAP_TIME`) — alles andere war eine Drehung.
   */
  onTap: ((pick: StagePick | null) => void) | null = null;
  private readonly picker = new THREE.Raycaster();
  /** Wo der Finger aufgesetzt hat, und wie weit er seitdem gewandert ist. */
  private tapFrom: THREE.Vector2 | null = null;
  private tapMoved = 0;
  private tapTime = 0;

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
    // Die Hand, für die gerechnet wird: die rechte — außer bei dem einen
    // Werkzeug, das es je Hand gibt. Ein linker Controller in einer rechten
    // Hand ist ein Bild, das es in der Brille nicht gibt.
    this.side = sideOfTool(id) ?? this.wanted;
    // Die Zielscheibe: gebaut mit Halbmesser eins, Größe und Ort kommen in
    // `placeTarget`, sobald feststeht, wie groß das Werkzeug ist.
    this.target = createTarget();
    this.stage.add(this.target);
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
    this.home = { ...TOOL_HOME };
    this.yaw = this.home.yaw;
    this.pitch = this.home.pitch;
    this.zoom = 1;
    // Ein Werkzeug steht still: wo vorne ist, sagt die Zielscheibe, und ein
    // Ding, das sich wegdreht, während man hinsieht, sagt es nicht.
    this.spinning = false;
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
    this.home = { yaw: TOOL_HOME.yaw, pitch: options.pitch ?? 0.25 };
    this.yaw = this.home.yaw;
    this.pitch = this.home.pitch;
    this.zoom = 1;
    // Von selbst dreht sich nur, was darum bittet — eine Welt.
    this.spin = options.spin ?? 0;
    this.spinning = this.spin > 0;
    // Eine neue Bühne fängt von außen an; die Draufsicht ist ein Griff, den
    // jemand tut, und keine Einstellung, die über den Wechsel hinweg gilt.
    this.topDown = false;
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
    const live = preview.live;
    this.showObject(preview.object, {
      animate: (time) => preview.animate?.(time),
      // Eine laufende Welt rechnet, statt sich zu drehen: Wer einen Zombie
      // beim Laufen zusieht, will nicht, dass ihm dabei die Karte unter den
      // Füßen weggedreht wird. Der Schritt wird gedeckelt — ein Tab im
      // Hintergrund liefert sonst Sprünge von Sekunden, und darin läuft
      // niemand mehr durch eine Tür, sondern durch die Wand daneben.
      step: live ? (dt) => live.step(Math.min(dt, 0.05)) : undefined,
      dispose: () => preview.dispose(),
      ownLight: true,
      flat: true,
      spin: live ? 0 : WORLD_SPIN,
      pitch: WORLD_PITCH,
      // Ein Stück unter der Decke, und nie höher als Kopfhöhe: Wände, die man
      // noch als Wände erkennt, aber kein Deckel mehr darüber.
      cut:
        preview.roof === null || preview.roof === undefined
          ? null
          : Math.min(preview.roof - 0.3, CUT_HEIGHT),
    });
  }

  /** Ob die freie Kamera gerade fliegt. */
  get flying(): boolean {
    return this.fly !== null;
  }

  /**
   * **Freie Kamera an oder aus** — und zwar ohne Schnitt im Bild.
   *
   * Beim Einschalten übernimmt die Kamera genau die Stelle, an der die Ansicht
   * von außen gerade steht: die Bühne dreht sich zurück in ihre eigene Lage,
   * und die Kamera nimmt die Drehung auf sich. Gerechnet wird das nicht mit
   * Winkeln, sondern über die Matrizen — die Lage der Kamera *im Raum der
   * Bühne* ist die gesuchte Antwort, und die kann man ablesen statt sie
   * herzuleiten.
   *
   * Der Grund dafür ist mehr als Bequemlichkeit: von außen liegt die Welt
   * schräg, weil man von schräg oben auf sie sieht. Flöge man in dieser Lage
   * los, ginge „hoch" nicht nach oben, sondern um genau diese Schräge daneben.
   * Also steht die Welt im Flug aufrecht, und die Kamera ist die, die schief
   * hängt.
   */
  setFlying(on: boolean): void {
    if (on === (this.fly !== null)) return;
    this.flyInput = NO_INPUT;
    if (!on) {
      this.fly = null;
      this.spinning = false;
      return;
    }
    this.spinning = false;
    // Ein Bild rechnen, damit Kamera und Bühne dort stehen, wo man sie sieht.
    this.place();
    this.pivot.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    _local.copy(this.pivot.matrixWorld).invert().multiply(this.camera.matrixWorld);
    _local.decompose(_at, _quat, _scale);
    _look.setFromQuaternion(_quat);
    this.fly = {
      position: { x: _at.x, y: _at.y, z: _at.z },
      yaw: _look.y,
      pitch: _look.x,
    };
  }

  /** Was die Knöpfe (oder die Tasten) gerade sagen. */
  setFlyInput(input: FlyInput): void {
    this.flyInput = input;
  }

  /** Wie schnell sie fliegt — nach dem Abstand zu dem, was auf der Bühne steht. */
  private get flySpeed(): number {
    const view = this.fly;
    const away = view ? Math.hypot(view.position.x, view.position.y, view.position.z) : 0;
    const outside = Math.max(0, away - this.radius);
    const slow = Math.max(FLY_SPEED_MIN, this.radius * FLY_SPEED_SLOW);
    const fast = Math.min(FLY_SPEED_MAX, Math.max(slow, this.radius * FLY_SPEED_FAST));
    return Math.min(fast, Math.max(slow, outside * FLY_SPEED_SHARE));
  }

  /**
   * Die Ansicht wechseln — und dabei **beide Einfrierungen auftauen**.
   *
   * Beim Justieren stehen zwei Dinge still: die Lage des Griffraums
   * (`gripBase`) und die Drehung der Bühne auf die echte Hand (`align`). Sie
   * gehören zusammen — die eine sagt, wo die Hand steht, die andere, wie das
   * Bild darauf schaut —, und beim Wechsel der Ansicht wurde bisher nur die
   * erste neu genommen. Danach standen sie auf zwei verschiedenen Ständen: die
   * Bühne schaute noch auf die Hand von vorhin, der Griffraum stand aber auf
   * dem Stand von jetzt, und jedes Grad, das man inzwischen am Regler gedreht
   * hatte, drehte die ganze Vorschau mit. „Ich ändere Roll, und die Ansicht
   * dreht sich" — genau das, und es passierte erst nach einem Tabwechsel.
   *
   * Zusammen aufgetaut heben sie sich im ersten Bild wieder auf: die Hand steht
   * im Bild, wo sie stehen soll, und schräg ist wieder nur das Werkzeug.
   */
  setHandMode(mode: HandMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.gripBase = null;
    this.align = null;
    this.apply();
  }

  /**
   * **Die Achsen einblenden** — im Bearbeiten-Modus, und nur dort.
   *
   * **Ein** Kreuz, und es steht dort, wo die sechs Zahlen des Reglers gelten:
   * im **Rahmen der echten Hand** — am Griffpunkt, gedreht auf den
   * Zeigestrahl (`tools/handFrame.ts`). X rot, Y grün, Z blau, und -Z weiß
   * nach vorn (`core/axesCross.ts`) — dieselben Farben wie im Eingaberaum,
   * dieselben Achsen, um die Pitch, Yaw und Roll drehen, und sein weißer Arm
   * liegt auf der weißen Linie des Zeigestrahls. Vorher standen zwei da,
   * eines im Werkzeug und eines im Griffraum, weil die Zahlen je nach Ansicht
   * im einen oder im anderen Raum galten.
   */
  setEditing(on: boolean): void {
    if (this.editing === on) return;
    this.editing = on;
    // **Mit** Einpassen: in *Hand in echt* wechselt dabei der Nullpunkt der
    // Bühne vom Werkzeug in den Griffraum, und was dabei aus dem Bild liefe,
    // holt die Kamera zurück. Zoom und Drehung bleiben, wo sie sind.
    this.apply();
  }

  /**
   * **Griffknopf und Trigger** an der Hand auf der Bühne: der Zeigefinger am
   * Abzug, der Daumen auf der Krone der Stoppuhr, die Hand, die den Griff
   * loslässt — dieselbe Rechnung wie in der Brille (`buttonCurls`). Nur die
   * Finger bewegen sich; die Hand bleibt, wo sie liegt.
   */
  setButtons(buttons: FingerButtons): void {
    this.buttons = buttons;
    const tool = this.tool;
    if (!tool) return;
    // In *Hand in echt* hält die feste Hand einen Controller — ihre Finger
    // liegen am **Halterzylinder**, wie beim Aufbau (`apply`) —, und daneben
    // hängt die gezeichnete Hand als Geist am Werkzeug. Der Geist wurde hier
    // vergessen: er blieb beim Drücken von *Trigger* stehen, während die feste
    // Hand den Finger zog, und zeigte damit dauerhaft etwas anderes an als der
    // Knopf oben sagte.
    if (this.hand) {
      this.hand.setCurls(
        this.mode === 'controller'
          ? buttonCurls(holdHandPose(this.side, GRIP_POSE_ID), GRIP_FINGER_MOVES, buttons)
          : this.curlsFor(tool),
      );
    }
    this.vrHand?.setCurls(this.curlsFor(tool));
  }

  /** Die Finger dieser Hand an diesem Werkzeug bei den Knöpfen, die gerade gelten. */
  private curlsFor(tool: Tool): number[] {
    const pose = holdHandPose(this.side, tool.toolId);
    return buttonCurls(pose, fingerMovesOf(tool.toolId), this.buttons);
  }

  /** Welches Werkzeug auf der Bühne steht — der Editor fragt danach. */
  get toolId(): string | null {
    return this.tool?.toolId ?? null;
  }

  /** Ob es angezogen wird (`Tool.worn`) — dann ist seine Lage die Handhaltung. */
  get worn(): boolean {
    return this.tool?.worn ?? false;
  }

  /**
   * Die **Zielkorrektur** dieses Werkzeugs: `GRIP_TO_RAY` für alles, was auf
   * den Zeigestrahl gedreht wird, die Ruhe für alles, was in der Faust sitzt
   * (`alignToAim`). Im Spiel entscheidet `Tool.applyHold` genauso — und die
   * Seite muss es genauso tun, sonst zeigt sie Controller, Boxhand und
   * Flügel um 30° gegen die Hand verdreht und speichert die 30° beim ersten
   * Zug am Regler als Haltung ab.
   *
   * Der **Beutel** war eine Weile der Fall dazwischen: er hing aufrecht im
   * Raum und folgte der Hand nur in Teilen ihrer Drehung. Diese Ausnahme gibt
   * es nicht mehr — er sitzt im Griffraum wie jedes andere Werkzeug, das nicht
   * zielt, und wird hier wie jedes andere gerechnet.
   */
  aimOf(): Quat {
    const tool = this.tool;
    if (!tool) return GRIP_TO_RAY;
    return tool.alignToAim ? GRIP_TO_RAY : IDENTITY;
  }

  /** Die Hand, für die die Bühne gerade rechnet. */
  get handSide(): Handedness {
    return this.side;
  }

  /**
   * **Die Hand wechseln.**
   *
   * Eine gemessene Haltung gehört einer Hand; die andere rechnet das Werkzeug
   * daraus — gespiegelt oder gedreht (`Tool.holdIn`). Genau das soll man hier
   * ansehen können, denn genau dort fällt auf, wenn eine Uhr in der linken
   * Hand ihr Blatt wegdreht.
   *
   * Zwei Werkzeuge hören nicht darauf: die beiden Controller *sind* eine
   * Seite. Sie behalten ihre, und der Schalter oben steht bei ihnen still.
   */
  setHandSide(side: Handedness): void {
    this.wanted = side;
    const next = sideOfTool(this.toolId) ?? side;
    if (next === this.side) return;
    this.side = next;
    // Die Bühne richtet sich nach der Hand, und die ist jetzt eine andere:
    // neu einpassen statt die eingefrorene Drehung der alten behalten.
    this.align = null;
    this.gripBase = null;
    this.apply(true);
  }

  /** Das langsame Kreisen an oder aus — beim Justieren steht das Ding still. */
  setSpinning(on: boolean): void {
    this.spinning = on;
  }

  /**
   * Die Lage des Werkzeugs im Griff, wie sie gerade gilt — **in der gezeigten
   * Hand**.
   *
   * Die Zahlen im Bearbeiten-Feld gehören zu dem, was man sieht. Wer die linke
   * Hand ansieht und daran zieht, zieht an der linken Haltung; welche der
   * beiden das Werkzeug als seine gemessene führt, ist eine Buchführung
   * darunter (`Tool.holdHand`).
   */
  holdReadout(): PoseReadout | null {
    const tool = this.tool;
    if (!tool) return null;
    tool.holdIn(this.side, _holdPosition, _holdRotation);
    return readPose({ position: _holdPosition, rotation: _holdRotation });
  }

  /** Und dieselbe Lage, wie das Werkzeug **gebaut** wurde — der Weg zurück. */
  factoryReadout(): PoseReadout | null {
    const tool = this.tool;
    if (!tool) return null;
    const factory: HoldPose = { position: tool.factoryPosition, rotation: tool.factoryRotation };
    return readPose(tool.factoryHand === this.side ? factory : holdForOtherHand(factory));
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
      // Die Zahlen kommen aus der Hand, die gerade gezeigt wird — also gelten
      // sie für sie. Ohne diese Zeile läge eine links gezogene Haltung als
      // rechte im Werkzeug und wäre im nächsten Bild wieder gespiegelt.
      tool.holdHand = this.side;
    } else {
      tool.resetHold();
    }
    this.apply(refit);
  }

  /** Ob am Werkzeug überhaupt ein Halterzylinder sitzt — sonst gibt es nichts auszurichten. */
  get hasGrip(): boolean {
    return this.gripFronts.length > 0;
  }

  /** Und ob es zielt — dann gibt es den violetten Pfeil und den Knopf dazu. */
  get hasAim(): boolean {
    return this.aimLine !== null;
  }

  /**
   * **Die Hand und ihre Fingerlinie**, im Rahmen der echten Hand — dem Raum,
   * in dem der Regler zieht (`intoHand`, `tools/handFrame.ts`).
   *
   * Genommen aus den Weltmatrizen und nicht nachgerechnet: die Richtung ist das
   * -Z der **Fingerspitze**, geht also jede Krümmung mit, und was hier
   * herauskommt, ist genau die Hand, die auf dem Schirm steht. Gezeichnet wird
   * sie nicht mehr — beim Justieren steht der Finger ohnehin am Rahmen
   * (`main.ts`, `applyButtons`), und eine zweite Linie neben dem Zeigestrahl
   * sagte nur noch, wie weit dieser eine Finger gerade gekrümmt ist.
   */
  handAim(): { hand: Pose; finger: Ray } | null {
    const hand = this.hand;
    if (!hand || !this.intoHand()) return null;
    const line = rayIn(hand.indexTip);
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
   * Der Pfeil am **Halterzylinder**, ebenfalls im Rahmen der echten Hand.
   *
   * Trägt ein Werkzeug **mehrere** (das Drohnendeck hat zwei), gewinnt der, der
   * der Fingerspitze am nächsten liegt — man richtet an dem Zylinder aus, an
   * dem die Hand schon ungefähr liegt, und nicht am erstbesten im Baum.
   */
  gripAim(): Ray | null {
    const hand = this.hand;
    if (this.gripFronts.length === 0 || !this.intoHand()) return null;
    const from = hand ? rayIn(hand.indexTip).origin : { x: 0, y: 0, z: 0 };
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
    const line = this.aimLine;
    if (!line || !this.intoHand()) return null;
    return rayIn(line);
  }

  /**
   * Frische Matrizen, und der Weg aus der Bühne in den **Rahmen der echten
   * Hand** — den Raum, in dem der Regler zieht (`tools/handFrame.ts`).
   *
   * Er liegt im Griffraum, gedreht auf den Zeigestrahl (`GRIP_TO_RAY`): sein
   * Nullpunkt ist der Griffpunkt, sein -Z die Blickrichtung der Hand. Alles,
   * was diese Seite misst — Hand, Fingerlinie, Zylinderpfeil, Zielpfeil —,
   * kommt deshalb in *diesem* Raum heraus, und die Rechnungen daneben
   * (`alignHand.ts`) rechnen darin weiter. Vorher war es der Raum des
   * **Werkzeugs**, und damit hing die Richtung, in die der Regler schob, an
   * dem Ding, das man gerade verstellte.
   *
   * `false`, solange keine Bühne steht: ohne Griffraum gibt es den Rahmen
   * nicht, und eine Linie in einem Raum, den es nicht gibt, ist keine Auskunft.
   */
  private intoHand(): boolean {
    const rig = this.rig;
    if (!rig) return false;
    this.stage.updateWorldMatrix(true, true);
    _frame.makeRotationFromQuaternion(_aimQuat);
    _frame.premultiply(rig.matrixWorld);
    _inverse.copy(_frame).invert();
    return true;
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
      // Gedrückte Knöpfe bewegen die Kamera Bild für Bild und nicht ruckweise
      // beim Drücken: fliegen ist eine Bewegung und kein Sprung.
      if (this.fly && isMoving(this.flyInput)) {
        this.fly = flyStep(this.fly, this.flyInput, dt, this.flySpeed);
      }
      this.shownFor += dt;
      this.options.animate?.(this.shownFor);
      this.options.step?.(dt);
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
   * **Eine Bühne, zwei Hände.**
   *
   * Werkzeug und Zielscheibe stehen in *jeder* Ansicht an derselben Stelle: das
   * Werkzeug in seinem eigenen Raum, die Scheibe davor auf dem Zeigestrahl, und
   * die ganze Bühne darunter auf die echte Hand gedreht (`tools/handStage.ts`).
   * Auch die Kamera passt sich nur an die beiden an
   * (`fit`, `placeTarget`) und nicht an die Hand. Wer umschaltet, sieht deshalb
   * **dieselbe Welt** und darin eine andere Hand — und nur so kann man die
   * beiden überhaupt vergleichen. Vorher sprang beim Umschalten die halbe
   * Szene: am Controller lag der Griffraum in der Bühne, das Werkzeug war weg,
   * und die Zielscheibe stand plötzlich schräg unten links.
   *
   * Was sich ändert, ist die Hand:
   *
   * - **in VR** liegt die gezeichnete Hand am Werkzeug — dieselbe Kette wie im
   *   Eingaberaum (`tune/handGrip.ts`), mit derselben **Zielkorrektur**: die
   *   kommt sonst aus einem Controller, und hier gibt es keinen, also steht sie
   *   als Zahl da (`GRIP_TO_RAY`). Ohne sie zeigte die Seite Hand und Werkzeug
   *   um genau diese 30° gegeneinander verdreht.
   * - **in echt** liegt im Griffraum der rote Handgriff des Geräts und die
   *   Faust darum. Der Griffraum ist dabei genau der, in dem das Werkzeug
   *   hängt (`Lage-im-Griff⁻¹`) — der Controller steht also dort, wo er beim
   *   Halten dieses Werkzeugs wirklich stünde, und das Werkzeug steht daneben,
   *   wo es dabei wäre.
   *
   * Das Werkzeug war in dieser Ansicht eine Weile **gläsern**, weil man ja
   * ein Gerät in der Hand hat und keine Lampe. Nur ist genau das die Ansicht,
   * in der man die Lage des Werkzeugs beurteilt — und ein Ding bei 22 %
   * Deckkraft beurteilt niemand. Es steht deshalb überall gleich fest da; wo
   * die *echte* Hand ist, sagt der rote Handgriff.
   *
   * **Wer steht, und wer wandert.** Solange man nur hinsieht, steht das
   * Werkzeug: dann kann man zwischen den Ansichten hin und her schalten, ohne
   * dass die Welt springt. Beim **Justieren** steht das, was man *nicht*
   * verstellt — und in *Hand in echt* verstellt man das Werkzeug: die eigene
   * Hand ist die eigene Hand, die rückt man nicht, sondern man legt das
   * Werkzeug hinein. Dort liegt der Nullpunkt der Bühne deshalb im
   * **Griffraum**, Hand und Zylinder stehen still, und das Werkzeug wandert
   * darin — samt der gezeichneten Hand, die daran hängt.
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
    const aim = this.aimOf();
    // Die Haltung **dieser** Hand: gemessen ist sie an einer, die andere
    // rechnet das Werkzeug daraus (`Tool.holdIn`).
    tool.holdIn(this.side, _holdPosition, _holdRotation);
    const local = toolInGrip({ position: _holdPosition, rotation: _holdRotation }, aim);

    // Der **Griffraum** als Knoten: dort, wo der Controller läge, der dieses
    // Werkzeug hält. Daran hängt alles, was dem Gerät gehört — der
    // Zeigestrahl, und in echt der Handgriff samt Faust.
    const rig = new THREE.Group();
    rig.name = 'grip-space';
    const held = this.mode === 'controller' && this.editing;
    if (held) {
      // Griffraum als Bühne: die Hand steht, das Werkzeug liegt darin — aber
      // **in der Lage, in der man es eben angesehen hat**. Die eingefrorene
      // Lage (`gripBase`) ist genau die des Griffraums beim Ansehen, und
      // solange der Regler noch nicht gezogen wurde, heben sich die beiden
      // Posen auf: das Werkzeug steht dann bei der Ruhe, also da, wo es im
      // Zweig darunter steht. Ohne sie kippte die Bühne beim Druck auf
      // *Bearbeiten* um die ganze Lage-im-Griff — bei der Taschenlampe gut
      // 30° —, und das sah aus, als hätte die Kamera sich verstellt.
      const base = (this.gripBase ??= invertPose(local));
      const at = composePose(base, local);
      rig.position.set(base.position.x, base.position.y, base.position.z);
      rig.quaternion.set(base.rotation.x, base.rotation.y, base.rotation.z, base.rotation.w);
      tool.position.set(at.position.x, at.position.y, at.position.z);
      tool.quaternion.set(at.rotation.x, at.rotation.y, at.rotation.z, at.rotation.w);
    } else {
      // Nichts eingefroren, solange nicht im Griffraum justiert wird: der
      // nächste Wechsel dorthin friert die Lage neu ein, die dann gilt.
      this.gripBase = null;
      // Werkzeugraum als Bühne: das Werkzeug steht in seinem eigenen Raum, und
      // der Griffraum liegt darin. Wie das Ganze dann im Bild hängt, sagt die
      // Drehung der Bühne weiter unten — die richtet sich nach der Hand.
      tool.position.set(0, 0, 0);
      tool.quaternion.identity();
      const grip = invertPose(local);
      rig.position.set(grip.position.x, grip.position.y, grip.position.z);
      rig.quaternion.set(grip.rotation.x, grip.rotation.y, grip.rotation.z, grip.rotation.w);
    }
    this.stage.add(rig);
    this.rig = rig;

    // Und die **Bühne auf die echte Hand gedreht** (`tools/handStage.ts`): der
    // Griffraum steht bei jedem Werkzeug woanders — bei der Taschenlampe gut
    // 30° tiefer als bei der Pistole —, und mit ihm stand die Hand mal so und
    // mal so im Bild. Diese Drehung nimmt genau den Unterschied heraus: sie
    // legt den Rahmen der echten Hand auf jeder Seite auf dieselbe Lage, und
    // was schräg bleibt, ist dann wirklich das Werkzeug. Beim Justieren bleibt
    // sie eingefroren (`align`).
    if (!this.editing) this.align = null;
    if (!this.align) {
      const turn = stageForGrip(rig.quaternion, this.side);
      this.align = new THREE.Quaternion(turn.x, turn.y, turn.z, turn.w);
    }
    this.stage.quaternion.copy(this.align);

    this.addHandLine(rig);

    if (this.mode === 'controller') {
      // **Die Faust am Halterzylinder** — die Hand nach vorn ausgestreckt, wie
      // an einer Pistole. Der Zylinder steht dabei aufrecht in ihr, und der
      // Zeigestrahl läuft von seiner oberen Kante geradeaus auf die Scheibe:
      // genau die Haltung, an der man sich orientiert.
      //
      // Hier stand eine Weile die Faust um den **Handgriff des Geräts**
      // (`CONTROLLER_HAND_POSE` um `CONTROLLER_HANDLE`, ein Zylinder entlang
      // der Z-Achse des Griffraums). Die beiden sind **47° in Pitch**
      // auseinander — es sind zwei Modelle desselben Handgriffs, und nur eines
      // kann stimmen. Es ist dieses: an ihm hängt jede Faust, jedes Werkzeug
      // und jede Zahl dieses Spiels, und es ist das, was man in der Hand
      // wiedererkennt.
      const handle = createGripShape({ color: HANDLE_COLOR });
      const at = STANDARD_GRIP_IN_HAND;
      handle.position.set(at.position.x, at.position.y, at.position.z);
      handle.quaternion.set(at.rotation.x, at.rotation.y, at.rotation.z, at.rotation.w);
      rig.add(handle);
      this.handle = handle;
      const pose = holdHandPose(this.side, GRIP_POSE_ID);
      const hand = new GhostHand(this.side, pose, { color: handColor(), opacity: 1 });
      hand.setCurls(buttonCurls(pose, GRIP_FINGER_MOVES, this.buttons));
      const on = poseOfHand(pose);
      hand.position.set(on.position.x, on.position.y, on.position.z);
      hand.quaternion.set(on.rotation.x, on.rotation.y, on.rotation.z, on.rotation.w);
      rig.add(hand);
      this.hand = hand;

      // Und beim Justieren **die gezeichnete Hand dazu**, als Geist am
      // Werkzeug: sie hängt daran und geht deshalb mit, wenn man das Werkzeug
      // in der stehenden Faust verschiebt. Genau das ist die Auskunft — was
      // ich hier bewege, bewegt drüben die Hand mit, und meine eigene bleibt,
      // wo sie ist. Gläsern, damit man sie von der festen echten Hand
      // unterscheidet: fest ist, was wirklich da ist.
      if (held) {
        const vrPose = holdHandPose(this.side, tool.toolId);
        const ghost = new GhostHand(this.side, vrPose, {
          color: handColor(),
          opacity: VR_GHOST_OPACITY,
        });
        ghost.setCurls(this.curlsFor(tool));
        const at = poseOfHand(vrPose);
        ghost.position.set(at.position.x, at.position.y, at.position.z);
        ghost.quaternion.set(at.rotation.x, at.rotation.y, at.rotation.z, at.rotation.w);
        rig.add(ghost);
        this.vrHand = ghost;
      }
    } else if (this.mode === 'vr') {
      // **Nicht durchsichtig**: ein Geist ist gläsern, damit man die eigene
      // Hand dahinter sieht — hier gibt es keine, und was man ansieht, soll
      // aussehen wie das, was in der Brille an der Hand steckt.
      const pose = holdHandPose(this.side, tool.toolId);
      const hand = new GhostHand(this.side, pose, { color: handColor(), opacity: 1 });
      hand.setCurls(this.curlsFor(tool));
      const at = ghostOnTool(local, poseOfHand(pose));
      hand.position.set(at.position.x, at.position.y, at.position.z);
      hand.quaternion.set(at.rotation.x, at.rotation.y, at.rotation.z, at.rotation.w);
      this.stage.add(hand);
      this.hand = hand;
    }

    if (this.editing) {
      // Das Kreuz gehört dem Griffraum und ist doch um die Zielkorrektur
      // gedreht: es zeigt den Rahmen der echten Hand, in dem der Regler zieht
      // (siehe `setEditing`).
      const inHand = createAxes(AXES_SIZE);
      inHand.quaternion.copy(_aimQuat);
      rig.add(inHand);
      this.axes = [inHand];
    }

    this.placeTarget();
    if (refit) this.fit();
    this.sizeLines();
  }

  /**
   * Die Zielscheibe auf den **Zeigestrahl der Hand** stellen.
   *
   * Der Strahl liegt im Griffraum 30° unter dessen -Z (`GRIP_TO_RAY`) — bei
   * jedem Werkzeug, auch bei einem, das nicht zielt: er gehört der Hand, nicht
   * dem Ding in ihr. In der Ansicht *In der Hand* ist der Griffraum die Bühne;
   * in den beiden anderen steht das Werkzeug aufrecht, und der Griffraum liegt
   * darin bei `Lage-im-Griff⁻¹` — derselbe Weg, den die Hand nimmt
   * (`ghostOnTool`).
   *
   * Größe und Abstand nach dem, was ohne die Scheibe auf der Bühne steht: erst
   * messen, dann stellen. Sonst zählte die Scheibe sich selbst mit und rückte
   * mit jedem Aufstellen ein Stück weiter weg.
   */
  private placeTarget(): void {
    const target = this.target;
    const rig = this.rig;
    if (!target || !rig) return;
    target.visible = false;
    this.stage.updateWorldMatrix(true, true);
    // Gemessen wird das **Werkzeug** und nicht, was gerade sonst noch dasteht:
    // Größe und Abstand der Scheibe gehören zum Werkzeug, und eine Scheibe, die
    // beim Umschalten der Hand ihren Platz wechselt, ist keine Welt mehr.
    this.measure(this.tool ? [this.tool] : [this.stage]);
    _box.getSize(_size);
    const radius = Math.max(_size.length() / 2, 0.02);
    this.targetDistance = Math.max(TARGET_MIN_DISTANCE, radius * TARGET_DISTANCE);
    target.scale.setScalar(Math.max(TARGET_MIN_RADIUS, radius * TARGET_RADIUS));

    // Von derselben Kante wie die Linie (`_rayFromGrip`) — sonst zielte die
    // Linie an der Scheibe vorbei.
    _at.copy(_rayFromGrip).applyQuaternion(rig.quaternion).add(rig.position);
    _dir.copy(_rayInGrip).applyQuaternion(rig.quaternion);
    target.position.copy(_at).addScaledVector(_dir, this.targetDistance);
    // Die Scheibe schaut die Hand an: ihr +Z ist die Fläche, und die zeigt
    // den Strahl zurück.
    target.quaternion.setFromUnitVectors(_forward, _dir.negate());
    target.visible = true;
  }

  /**
   * Der **Zeigestrahl**: die weiße Linie, die in der Brille aus dem Controller
   * kommt.
   *
   * Sie hängt in der Bühne und nicht an der Hand — sie gehört dem Gerät, das
   * die Hand hält. Ihr Nullpunkt ist der **Griffpunkt** (dort sitzt der
   * Controller in der Faust), ihre Richtung dessen -Z, um die Zielkorrektur
   * gekippt (`GRIP_TO_RAY`). Damit steht sie in jeder Ansicht dort, wo die
   * Zielscheibe steht, und ändert sich weder mit dem Trigger noch mit dem
   * Griffknopf.
   *
   * Eine `Line` und kein Mesh, und das ist mehr als eine Sparsamkeit: die
   * Kamera misst nur sichtbare **Meshes** (`measure`), also passt sie sich an
   * das Werkzeug an und nicht an eine Linie, die absichtlich über den Rand
   * hinausgeht.
   */
  private addHandLine(rig: THREE.Group): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: HAND_LINE_COLOR, transparent: true, opacity: 0.9 }),
    );
    line.name = 'hand-ray';
    line.position.copy(_rayFromGrip);
    line.quaternion.copy(_aimQuat);
    rig.add(line);
    this.handLine = line;
  }

  /**
   * Die Längen der beiden gezeichneten Richtungen, sobald feststeht, wo die
   * Zielscheibe steht: beide bis ein Stück hinter sie.
   *
   * Eine feste Länge wäre am Hängegleiter ein Strich und an der Pistole ein
   * Faden. Der Zeigestrahl wird dabei **skaliert** — er ist ein Strich, dem
   * das nichts tut —, der Zielpfeil bekommt seine Punkte **neu**: eine
   * Skalierung zöge seine Widerhaken mit in die Länge, und dann wäre er kein
   * Pfeil mehr.
   */
  private sizeLines(): void {
    const reach = this.targetDistance * LINE_BEYOND;
    if (this.handLine) {
      this.handLine.scale.z = Math.max(HAND_LINE_MIN, reach);
    }
    if (this.aimLine) {
      this.aimLine.geometry.setFromPoints(arrowPoints(Math.max(AIM_LINE_MIN, reach)));
    }
  }

  /**
   * Hand samt Zeigestrahl weg.
   *
   * Die Linie einzeln: `GhostHand.dispose` räumt Meshes ab, und eine `Line`
   * ist keines — ihre Geometrie bliebe bei jedem Werkzeugwechsel liegen.
   */
  private dropHand(): void {
    for (const cross of this.axes) disposeAxes(cross);
    this.axes = [];
    this.vrHand?.dispose();
    this.vrHand = null;
    const line = this.handLine;
    this.handLine = null;
    if (line) {
      line.removeFromParent();
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    const handle = this.handle;
    this.handle = null;
    if (handle) {
      handle.removeFromParent();
      handle.geometry.dispose();
      (handle.material as THREE.Material).dispose();
    }
    this.hand?.dispose();
    this.hand = null;
    this.rig?.removeFromParent();
    this.rig = null;
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
    const roots = this.tool ? (this.target ? [this.tool, this.target] : [this.tool]) : [this.stage];
    // Bei einem Werkzeug zählen **Werkzeug und Zielscheibe** und sonst nichts.
    // Das ist die Welt, in der die Hand steht, und sie darf sich beim
    // Umschalten der Hand nicht bewegen — sonst vergleicht man zwei Bilder,
    // die verschieden weit weg sind.
    this.measure(roots);
    _box.getCenter(_centre);
    _box.getSize(_size);
    // Gemessen wird in der **Welt**, verschoben wird im **Drehpunkt**: der
    // dreht sich (`place`), und eine Mitte, die man aus der Welt abliest und
    // ungedreht wieder einsetzt, landet um genau diese Drehung daneben. Das
    // war das schräg im Bild hängende Werkzeug mit der leeren Ecke daneben.
    _centre.applyQuaternion(_quat.copy(this.pivot.quaternion).invert());
    this.stage.position.copy(_centre).multiplyScalar(-1);
    // Die **Kugel** um das Gezeigte und nicht sein Kasten: es dreht sich, und
    // ein Kasten hat je nach Blickwinkel eine andere Breite. Eine Kugel hat
    // immer dieselbe, und damit springt das Bild beim Drehen nicht.
    this.radius = Math.max(_size.length() / 2, 0.02);
    // Für etwas Flaches wird zusätzlich der Grundriss gemerkt — warum, steht
    // an `distance`.
    this.footprint = Math.max(Math.hypot(_size.x, _size.z) / 2, 0.02);
    this.height = Math.max(_size.y / 2, 0.01);

    // Und dasselbe noch einmal **ungedreht**, für die Draufsicht (`topZoom`).
    // Der Kasten oben ist der um die schräg im Raum liegende Welt: Er ist so
    // hoch wie breit, sobald man sie kippt, und aus ihm ließen sich die Kanten
    // nicht ablesen — bei diesem Labor stand 48 Meter Höhe darin, wo drei
    // Meter Wand stehen.
    this.pivot.updateWorldMatrix(true, false);
    _unturn.copy(this.pivot.matrixWorld).invert();
    this.measure(roots, _unturn);
    _box.getSize(this.extent);
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
    // **Von oben das Rechteck statt des Kreises darum.** Sonst wird der
    // Grundriss als Kugel eingepasst, und das ist beim Drehen auch richtig: Was
    // sich dreht, darf dabei nicht aus dem Bild wandern. In der Draufsicht
    // dreht sich nichts mehr, und dann zahlt man den Unterschied zwischen
    // Diagonale und Kante als Luft ringsum — beim Labor von 75 × 51 Metern in
    // einem breiten Fenster mehr als ein Drittel. Gerechnet wird mit den
    // Kanten des **ungedrehten** Kastens (`extent`): quer die Breite, längs die
    // Tiefe unter dem Kippwinkel plus die Höhe, die dabei aufragt.
    const wide = this.topDown ? this.extent.x / 2 : this.footprint;
    const along = this.topDown ? this.extent.z / 2 : this.footprint;
    const tall = this.topDown ? this.extent.y / 2 : this.height;
    const high = along * Math.sin(tilt) + tall * Math.cos(tilt);
    return PADDING * Math.max(wide / Math.tan(horizontal), high / Math.tan(vertical));
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
  private measure(roots: readonly THREE.Object3D[] = [this.stage], frame?: THREE.Matrix4): void {
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
          // Mit `frame` in einem anderen Raum als der Welt: Der Kasten wird
          // dafür **einmal** umgerechnet, aus der Geometrie heraus. Wer statt
          // dessen den fertigen Weltkasten nachträglich drehte, bekäme den
          // Kasten *um* den gedrehten Kasten — und der ist größer als das Ding
          // darin.
          _bounds
            .copy(bounds)
            .applyMatrix4(_measured.copy(mesh.matrixWorld).premultiply(frame ?? _identity));
          _box.union(_bounds);
        }
      }
      for (const child of object.children) visit(child);
    };
    for (const root of roots) visit(root);
    // Ein Werkzeug ganz ohne sichtbares Mesh gibt es nicht, aber eine leere
    // Kiste ergäbe eine Kamera im Nichts. Dann eben eine Handbreit.
    if (_box.isEmpty()) _box.setFromCenterAndSize(_zero, _handspan);
  }

  /**
   * Den waagerechten Schnitt setzen oder aufheben.
   *
   * Angemeldet wird die Ebene erst im Bild (`render`): dort steht fest, ob sie
   * gerade gilt — im Flug nämlich nicht, siehe dort — und dort stehen auch
   * ihre Zahlen, die von der Drehung dieses Bildes abhängen.
   */
  private setCut(height: number | null): void {
    this.cut = height;
  }

  private clear(): void {
    this.dropHand();
    // Eine neue Welt fängt von außen an: der Flug gehört der, die man verlässt.
    this.fly = null;
    this.flyInput = NO_INPUT;
    // Und die eingefrorene Lage gehört dem Werkzeug, das gerade weggeht.
    this.gripBase = null;
    // Die Drehung auf die echte Hand ebenso: ein Ding ohne Hand — eine Welt,
    // ein Beutel-Objekt — steht wieder aufrecht, wie es gebaut wurde.
    this.align = null;
    this.stage.quaternion.identity();
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
    const target = this.target;
    this.target = null;
    this.targetDistance = 0;
    if (target) {
      target.removeFromParent();
      target.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
    }
    this.studio.visible = true;
    this.spin = 0;
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
    this.place();

    // Der Schnitt gehört dem Modell und nicht dem Raum: er liegt waagerecht in
    // der Welt, die sich dreht. Also wird die Ebene aus der Lage der Bühne
    // gerechnet, nachdem die Drehung dieses Bildes steht.
    //
    // **Im Flug gilt er nicht.** Er ist die Antwort auf die Vogelperspektive —
    // von oben sieht man sonst nur den Deckel —, und wer *drin* ist, will das
    // Zimmer so, wie es ist, mit Decke. Ein aufgeschnittenes Haus von innen
    // wäre ein Haus ohne Dach, und das ist keine Welt, sondern ein Modell.
    const cutting = this.cut !== null && !this.fly;
    if (cutting) {
      this.pivot.updateMatrixWorld(true);
      this.plane.set(_down, this.cut ?? 0);
      this.plane.applyMatrix4(this.stage.matrixWorld);
    }
    this.renderer.clippingPlanes = cutting ? this.planes : _noPlanes;
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Kamera und Bühne an ihre Plätze — das, was ein Bild ausmacht, noch bevor
   * eines gezeichnet wird. `setFlying` braucht genau dasselbe, um die Ansicht
   * zu übernehmen, die gerade zu sehen ist.
   *
   * Die beiden Fälle sind zwei Ansichten und nicht zwei Einstellungen: **von
   * außen** sitzt die Kamera auf ihrem Abstand und die Bühne dreht sich vor
   * ihr; **im Flug** steht die Bühne aufrecht still und die Kamera geht darin
   * herum.
   *
   * Die **vordere Ebene** hängt am wirklichen Abstand und nicht am
   * eingepassten — das ist der Unterschied zwischen „ich kann heranzoomen" und
   * „ab hier wird alles durchsichtig". Die hintere bleibt beim eingepassten:
   * sie soll den Hintergrund halten, auch wenn man dicht heranfährt.
   */
  private place(): void {
    const view = this.fly;
    if (view) {
      this.pivot.rotation.set(0, 0, 0);
      this.camera.position.set(view.position.x, view.position.y, view.position.z);
      this.camera.quaternion.setFromEuler(_look.set(view.pitch, view.yaw, 0));
      this.camera.near = Math.max(FLY_NEAR, this.radius * 0.001);
      this.camera.far = Math.max(FLY_FAR, this.radius * 20);
    } else {
      const fitted = this.distance(this.camera.aspect);
      const away = fitted * this.zoom;
      this.camera.position.set(0, 0, away);
      this.camera.quaternion.identity();
      this.camera.near = Math.max(0.005, away * 0.02);
      this.camera.far = fitted * 12 + away;
      this.pivot.rotation.set(this.pitch, this.yaw, 0);
    }
    this.camera.updateProjectionMatrix();
  }

  // --- Finger ----------------------------------------------------------------

  private readonly onDown = (event: PointerEvent): void => {
    this.canvas.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, new THREE.Vector2(event.clientX, event.clientY));
    // Der erste Griff beendet das Kreisen: ab jetzt gehört die Drehung dem, der
    // sie in der Hand hat.
    this.spinning = false;
    if (this.pointers.size === 2) this.pinch = this.spread();
    // Ein **Doppeltipp** sind zwei Tipps mit *einem* Finger. Der zweite Finger
    // eines Zangengriffs kommt genauso schnell hinterher wie ein zweiter Tipp —
    // und stellte damit jedes Mal die Ansicht zurück, kaum dass man zu zoomen
    // anfing. Genau das war „er springt wieder heraus, sobald ich neu zoome".
    const alone = this.pointers.size === 1;
    const now = event.timeStamp;
    if (alone && this.lastAlone && now - this.lastTap < 320) this.reset();
    this.lastAlone = alone;
    this.lastTap = now;

    // Der Anfang eines möglichen Tipps. Ein zweiter Finger macht daraus einen
    // Zangengriff, und der ist keiner mehr.
    if (alone) {
      this.tapFrom = new THREE.Vector2(event.clientX, event.clientY);
      this.tapMoved = 0;
      this.tapTime = now;
    } else {
      this.tapFrom = null;
    }
  };

  private readonly onMove = (event: PointerEvent): void => {
    const last = this.pointers.get(event.pointerId);
    if (!last) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    last.set(event.clientX, event.clientY);
    this.tapMoved += Math.hypot(dx, dy);

    if (this.pointers.size >= 2) {
      // Zwei Finger zoomen, und zwar nur das: gleichzeitig zu drehen macht aus
      // jedem Zoom eine kleine Drehung, die niemand wollte. Im Flug gibt es
      // nichts zu zoomen — dort schieben sie nach vorn und zurück.
      const spread = this.spread();
      if (this.pinch > 0 && spread > 0) {
        if (this.fly)
          this.fly = flyDolly(this.fly, (spread / this.pinch - 1) * this.flySpeed * 0.6);
        else this.setZoom(this.zoom * (this.pinch / spread));
      }
      this.pinch = spread;
      return;
    }

    const scale = 4 / Math.max(240, Math.min(this.canvas.clientWidth, this.canvas.clientHeight));
    // Im Flug dreht dasselbe Wischen den **Blick** statt der Bühne — dieselbe
    // Bewegung, dieselben Vorzeichen: die Welt geht mit dem Finger mit.
    if (this.fly) {
      this.fly = flyLook(this.fly, dx * scale, dy * scale);
      return;
    }
    this.yaw += dx * scale;
    // Ein **Werkzeug dreht sich nur um seine Y-Achse**: es steht in der
    // Ansicht, wie es in der Hand steht, und es soll auch beim Umsehen so
    // stehen bleiben. Wer daran zieht, will es von allen Seiten sehen und
    // nicht von oben und unten — der Blickwinkel von schräg vorn ist die
    // Ansicht, mit der die Seite aufmacht, und die bleibt jetzt die einzige.
    // Bei einer Welt bleibt das Nicken: dort *ist* die Vogelperspektive das,
    // worum es geht, und man will von ihr aus auch flacher heransehen.
    if (this.tool) return;
    // Nicht überkopf: eine Ansicht, die auf dem Kopf steht, dreht sich beim
    // nächsten Wischen andersherum, und dann weiß man nicht mehr, wo oben war.
    this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch + dy * scale));
  };

  private readonly onUp = (event: PointerEvent): void => {
    const alone = this.pointers.size === 1;
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinch = 0;

    const from = this.tapFrom;
    this.tapFrom = null;
    if (!alone || !from || !this.onTap) return;
    if (this.tapMoved > TAP_SLOP || event.timeStamp - this.tapTime > TAP_TIME) return;
    this.onTap(this.pick(event.clientX, event.clientY));
  };

  /**
   * Was an dieser Stelle des Bildes steht — in den Koordinaten der gezeigten
   * Welt und nicht in denen der Bühne.
   *
   * Der Unterschied ist keine Feinheit: Die Bühne ist um die Mitte des
   * Gezeigten verschoben und im Drehpunkt gedreht (`fit`, `place`). Ein Punkt,
   * den man aus der Szene abliest und ungedreht als „dort steht der Zombie
   * gleich" einsetzt, landet um genau diese Verschiebung daneben.
   */
  private pick(clientX: number, clientY: number): StagePick | null {
    const rect = this.canvas.getBoundingClientRect();
    _ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.picker.setFromCamera(_ndc, this.camera);
    for (const hit of this.picker.intersectObject(this.stage, true)) {
      if (!hit.object.visible) continue;
      return { object: hit.object, point: this.stage.worldToLocal(hit.point.clone()) };
    }
    return null;
  }

  /**
   * **Senkrecht von oben** — die Ansicht, in der ein Grundriss ein Grundriss
   * ist.
   *
   * Nicht ganz senkrecht: Bei exakt 90° sieht man von einer Wand nur ihre
   * Oberkante, und eine Welt aus Strichen ist schwerer zu lesen als eine, in
   * der man den Wänden ihre Höhe ansieht. Ein Hauch schräg lässt sie stehen.
   */
  lookDown(): void {
    this.fly = null;
    this.spinning = false;
    this.topDown = true;
    this.yaw = 0;
    this.pitch = TOP_PITCH;
    // Die Ansicht, auf die der Doppeltipp zurückgeht, ist ab jetzt diese: Wer
    // von oben zusieht und zwischendurch etwas heranholt, will beim
    // Zurückstellen wieder von oben sehen und nicht wieder von schräg vorn.
    this.home = { yaw: 0, pitch: TOP_PITCH };
    this.zoom = 1;
    this.fit();
    this.sizeLines();
  }

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.spinning = false;
    if (this.fly) {
      this.fly = flyDolly(this.fly, (event.deltaY > 0 ? -1 : 1) * this.flySpeed * FLY_DOLLY_STEP);
      return;
    }
    this.setZoom(this.zoom * (event.deltaY > 0 ? 1.12 : 1 / 1.12));
  };

  /**
   * Näher heran, aber nicht durch das Gezeigte hindurch — und für eine Welt
   * viel näher als für ein Werkzeug (`ZOOM_MIN_WORLD`).
   */
  private setZoom(value: number): void {
    const near = this.flat ? ZOOM_MIN_WORLD : ZOOM_MIN;
    this.zoom = Math.max(near, Math.min(ZOOM_MAX, value));
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
    const flying = this.fly !== null;
    this.fly = null;
    this.yaw = this.home.yaw;
    this.pitch = this.home.pitch;
    this.zoom = 1;
    this.spinning = !flying && this.spin > 0;
    this.fit();
    this.sizeLines();
    // Im Flug bleibt die freie Kamera an — sie stellt sich nur wieder dorthin,
    // wo sie losgeflogen ist. Wer sie loswerden will, hat den Knopf dafür.
    if (flying) this.setFlying(true);
  }
}

/**
 * Die Zielscheibe, mit Halbmesser eins in der XY-Ebene: fünf Ringe, rot und
 * weiß im Wechsel, rot in der Mitte. Beidseitig, denn beim Drehen sieht man
 * sie auch von hinten, und eine Scheibe, die von hinten verschwindet, ist ein
 * Loch im Bild.
 */
function createTarget(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'aim-target';
  const rings = 5;
  for (let i = 0; i < rings; i++) {
    const inner = i / rings;
    const outer = (i + 1) / rings;
    const geometry =
      i === 0 ? new THREE.CircleGeometry(outer, 40) : new THREE.RingGeometry(inner, outer, 40);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? TARGET_RED : TARGET_WHITE,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    // Jeder Ring eine Spur vor dem nächsten, damit sie nicht ineinander flimmern.
    mesh.position.z = (rings - i) * 0.0005;
    group.add(mesh);
  }
  return group;
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
 * Eine Linie, wie sie im Rahmen der echten Hand liegt (`intoHand`): ihr
 * eigener Nullpunkt und ihr -Z.
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

/**
 * Die Hand, die zu einem Werkzeug **gehört** — `null`, wenn es beide kann.
 *
 * Nur die beiden Controller haben eine: einen linken Controller hält man
 * links, und ein linkes Gerät in einer rechten Hand ist ein Bild, das es in
 * der Brille nicht gibt. Alles andere folgt dem Schalter im Kopf der Seite.
 */
function sideOfTool(id: string | null): Handedness | null {
  if (id === 'controller-left') return 'left';
  if (id === 'controller-right') return 'right';
  return null;
}
