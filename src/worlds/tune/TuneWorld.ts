import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { TextPlane } from '../../ui/TextPlane';
import { WristMenu } from '../../ui/WristMenu';
import type { MenuEntry } from '../../ui/menu';
import { InputModel } from './InputModel';
import { AccelRecording, formatAccel, recordLines } from './accelRecord';
import { PANEL, PANEL_Z } from './inputPanel';
import { VibeBench, KNOB_REACH } from './VibeBench';
import {
  hapticPattern,
  nextPatternId,
  pulsesBetween,
  saveHapticPattern,
  type HapticPattern,
} from './haptics';
import { ToolRange, MOUNT_REACH, ZONE_RADIUS, type RangeGrip } from './ToolRange';
import { LANE, LANE_MID, LANE_WIDTH, PARTITION, POSE_ROOM, swapTargets } from './lane';
import { HoverBox } from './HoverBox';
import { HAND_SHARE_CHANNEL, packHandShare, type HandShare } from './handShare';
import { HANDLE_REACH } from './StandFrame';
import { GripStand, HAND_REACH } from './GripStand';
import {
  clampGrip,
  clearGripSettings,
  DEFAULT_GRIP,
  formatGrip,
  gripSettings,
  onGripChange,
  saveGripSettings,
  type GripSettings,
} from './gripSettings';
import { ghostOnTool, handFromGhost, poseOfHand, toolInGrip, type Pose } from './handGrip';
import {
  clampRange,
  clearRangeSettings,
  formatRange,
  onRangeChange,
  rangeSettings,
  saveRangeSettings,
  type RangeSettings,
} from './rangeSettings';
import { SeeThrough } from './seeThrough';
import { nudgeGrip, FINE_FACTOR, type Grip } from './fineTune';
import { GRAB_GLOW } from '../../core/colors';
import {
  clonePose,
  defaultHoldPose,
  formatHandPose,
  GRAB_POSE_ID,
  HOLD_HAND_POSE,
  type HandPose,
} from '../../core/handPose';
import {
  holdHandPose,
  idleHandPose,
  saveHoldHandPose,
  saveIdleHandPose,
} from '../../core/handPoseStore';
import { boneColors, saveBoneColors, saveTrackedGlove, trackedGlove } from '../../core/handLook';
import { packShortGear } from '../portal/tools/shortCode';
import { BOX_HAND_COLOR, GhostHand } from '../../core/HandVisuals';
import { createControllerHandle } from '../../core/controllerHandle';
import { createAxes, disposeAxes } from '../../core/axesCross';
import { GRIP_TO_RAY } from '../portal/tools/gripFit';
import { eyeHeights, saveEyeHeights, seatedLift } from '../../core/posture';
import {
  formatPose,
  gripForHold,
  holdPoseFrom,
  readPose,
  type HoldPose,
  type PoseReadout,
} from '../portal/tools/toolPose';
import { savePose } from '../portal/tools/poseStore';
import { HandTool } from '../portal/tools/HandTool';
import { aimQuaternion, type Tool } from '../portal/tools/Tool';
import { applyGearConfig, gearCode, parseGearCode, toolGearCode } from '../portal/tools/gearConfig';
import { TOOL_IDS } from '../portal/tools';
import type { WorldContext } from '../../core/types';
import type { ControllerState, Handedness } from '../../core/XRInput';

const ROOM = { half: 3.4, height: 3, thickness: 0.3 };
/**
 * Wie oft die beiden Handtafeln höchstens neu gezeichnet werden.
 *
 * Eine Zahl in Grad ändert sich bei jeder Handbewegung in jedem Bild, und
 * jedes Neuzeichnen malt eine Leinwand neu — mit 90 Hz ist das der billigste
 * Weg, ein Headset stocken zu lassen. Fünfmal je Sekunde liest sich flüssig
 * und ist zu langsam zum Flackern. Eingefrorene Zahlen kommen sofort: dort
 * ändert sich danach nichts mehr.
 */
const TILT_REFRESH = 0.2;

/** Ein Knopf an der Wand: die Tafel, was sie tut und was gerade daraufsteht. */
interface WallButton {
  plane: TextPlane;
  /** Ob **Greifen** ihn auch drückt — für alles, was etwas in die Hand gibt. */
  grab?: boolean;
  /** @param hand welche Hand darauf gezeigt hat, wenn bekannt. */
  run(hand: Handedness | null): void;
  /** Schreibt die aktuelle Beschriftung — über `label`, nie direkt. */
  refresh(): void;
  /** Was zuletzt daraufstand. Ein Canvas ohne Not neu zu zeichnen ist teuer. */
  last: string;
}

/**
 * Die Boxhand am zweiten Stand hängt gerade an einer Hand.
 *
 * Sie wird dabei wirklich **umgehängt** (`Object3D.attach`) statt Bild für
 * Bild nachgerechnet: eine Hand, die ein Ding hält, hält es 1:1, und ein
 * Umhängen kann keine Rundungsfehler aufsummieren. Zurück ans Werkzeug geht
 * sie beim Loslassen, und dann ist ihre Lage darin die neue Haltung.
 */
interface GripDrag {
  hand: Handedness;
  /** Wessen Haltung geschrieben wird — die Seite, die der Stand zeigt. */
  side: Handedness;
  /** Das Werkzeug, um das es geht. */
  toolId: string;
  /** Die Haltung vor dem Zupacken, für den Abbruch. */
  before: HandPose;
}

/** Eine Hand zieht gerade an einem Griff eines der beiden Stände. */
interface StandDrag<T> {
  hand: Handedness;
  grip: 'height' | 'place';
  /** Wo die Hand beim Zupacken war — gerechnet wird immer dagegen. */
  start: THREE.Vector3;
  before: T;
}

/**
 * Ein Werkzeug liegt im Halter und wartet darauf, dass eine Hand sich dazu
 * legt.
 *
 * Es liegt dort **auf die Scheibe gerichtet** — das ist die halbe Antwort, die
 * der Halter schon gibt. Gemessen wird nur noch die andere Hälfte: wo die Hand
 * ist, wenn sie es so hält, wie sie es halten will.
 */
/** Eine Haltung, wie ein Werkzeug sie trägt: die Zahlen und die Hand dazu. */
interface HeldPose {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  hand: Handedness;
}

interface Mounted {
  tool: Tool;
  /** Die Hand, aus der es kam — ihre Knöpfe bestätigen. */
  hand: Handedness;
  /**
   * Die Haltung, die es beim Ablegen hatte — samt der Hand, für die sie gilt
   * (`Tool.holdHand`). `A` legt genau die zurück, und ohne die Seite läge
   * danach eine links gemessene Haltung als rechte im Werkzeug.
   */
  before: HeldPose;
  /**
   * Ob Trigger und Greifen schon zählen dürfen.
   *
   * Wer ein Werkzeug im Menü auswählt, drückt dabei genau die Taste, die im
   * Halter „gemessen, gib es mir zurück" heißt — und hatte das Ding damit im
   * selben Bild wieder in der Hand, ohne es je im Halter gesehen zu haben. Ein
   * frisch aus dem Menü gelegtes Werkzeug wartet deshalb, bis beide Tasten
   * einmal oben waren; wer es selbst hineinlegt, hält die Taste ohnehin nicht.
   */
  armed: boolean;
}

/**
 * Feinjustage: der Geist am Werkzeug hängt an der Hand, die den Knopf *nicht*
 * gedrückt hat — und zwar um ein Zehntel untersetzt (`fineTune.ts`).
 */
interface Fine {
  /** Die ziehende Hand. */
  hand: Handedness;
  /** Wessen Haltung dargestellt wird — die Hand, der das Werkzeug gehört. */
  owner: Handedness;
  ghost: GhostHand;
  /** Der Griff, an dem der Geist beim Zupacken hing. */
  grip: Grip;
  /** Wo die ziehende Hand beim Zupacken war. */
  from: Grip;
  /** Die Zielkorrektur der haltenden Hand; die Haltung rechnet dagegen. */
  aim: THREE.Quaternion;
  /** Wie die Hand am Werkzeug gezeichnet wird — der Geist trägt sie. */
  pose: HandPose;
  /** Die Haltung vor dem Zupacken, für den Abbruch — samt ihrer Hand. */
  before: HeldPose;
}

/** Die Haltung, die ein Werkzeug gerade trägt — zum Zurücklegen. */
function heldPose(tool: Tool): HeldPose {
  return {
    position: tool.holdPosition.clone(),
    rotation: tool.holdRotation.clone(),
    hand: tool.holdHand,
  };
}

/** Was der Griff auf der Vibrationsbank gerade macht. */
interface Buzz {
  hand: Handedness;
  /** Sekunden seit dem Zupacken — der Zeiger im Muster. */
  elapsed: number;
}

/**
 * Eine Messung im Poseraum — zweimal dasselbe, für zwei Zwecke.
 *
 * `pose` ist, was **gespeichert** wird: die Haltung im Griffraum, in der Form,
 * in der jede andere Haltung dieses Spiels steht. `share` ist, was **gesendet**
 * wird: die Lage der Hand im Raum des Werkzeugs, weil ein Zuschauer im Browser
 * keinen Griff hat, gegen den er das verrechnen könnte (`handShare.ts`).
 */
interface Measured {
  pose: HandPose;
  /** Was im Kasten schwebt, oder `null` für die blanke Hand. */
  toolId: string | null;
  /**
   * Ob dahinter wirklich eine **gesehene** Hand steht.
   *
   * `false` heißt: die Brille sieht sie gerade nicht, und was hier steht, ist
   * die eingestellte Haltung — gut genug zum Zeigen, nichts zum Speichern.
   */
  live: boolean;
  share: HandShare;
}

/**
 * Wie oft eine geteilte Haltung hinausgeht.
 *
 * Zwanzigmal je Sekunde — dieselbe Rate, mit der die Sitzung ohnehin die Köpfe
 * und Hände verschickt (`NetSession.POSE_INTERVAL`). Schneller sähe niemand,
 * langsamer ruckelte die Hand drüben.
 */
const SHARE_INTERVAL = 1 / 20;

/**
 * Auf diesem Kanal reisen Konfig-Codes zwischen den Mitspielern.
 *
 * Ein Kanal und keine eigene Nachrichtenart: die Sitzung trägt beliebige
 * Welt-Nachrichten (`NetSession.emit`), und was hier hin und her geht, ist
 * nichts weiter als eine Zeile Text.
 */
const _hand = new THREE.Vector3();
const _position = new THREE.Vector3();
const _rotation = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _toolPosition = new THREE.Vector3();
const _toolRotation = new THREE.Quaternion();
const _aim = new THREE.Quaternion();
const _holdPosition = new THREE.Vector3();
const _holdRotation = new THREE.Quaternion();
const _matrix = new THREE.Matrix4();
const _gripPosition = new THREE.Vector3();
const _gripRotation = new THREE.Quaternion();
const _posePosition = new THREE.Vector3();
const _poseRotation = new THREE.Quaternion();
const _inverseMatrix = new THREE.Matrix4();
/** Nur für die letzte Zeile der Handtafel: vom Griffraum in den Strahlraum. */
const _between = new THREE.Quaternion();
/**
 * Und dieselbe Drehung, wie sie **im Code** steht (`GRIP_TO_RAY`) — als Grad
 * neben der gemessenen. Gerechnet und nicht getippt: ändert sich die Konstante,
 * ändert sich die Zahl auf der Tafel mit, und niemand vergleicht eine Messung
 * mit einer Zahl, die es nicht mehr gibt.
 */
const CODED_AIM = Math.round((2 * Math.acos(Math.min(1, Math.abs(GRIP_TO_RAY.w))) * 180) / Math.PI);
const DEG = 180 / Math.PI;

/**
 * Eingaberaum: a room whose only job is to show you what your hands are doing.
 *
 * Every other world answers the question "did that button register?" with the
 * game itself — you pull something and see whether anything happens, and when
 * nothing does you have no idea whether the runtime missed the press, the tool
 * ignored it or the hand was never tracked at all. That is a bad way to set up
 * a grip, and an impossible way to work out a hand-tracking gesture.
 *
 * So, **an der vorderen Wand**: two **controllers in the air** at eye level,
 * turning as yours turn, every button lighting up as it goes down and the
 * stick and trigger actually moving. With bare hands they give way to five
 * bars — how far each finger is folded onto the palm — and the two lamps for
 * what that was read as: **middle, ring and little finger on the palm is
 * Greifen, the index finger on the palm is the Trigger**
 * (`handGestures.ts`). On the wall behind them the same thing in words, so it
 * can be read at a glance and out loud.
 *
 * **An der rechten Wand hängen die Zahlen**, die man ablesen und nicht
 * anfassen will: die eigene **Augenhöhe**, im Stehen und im Sitzen, und die
 * **Werte-Tafel** mit der letzten Messung samt Konfig-Code. Die Augenhöhe
 * steht hier und nicht nur im Menü, weil ohne sie keine Zahl aus dem Gang
 * stimmt — ein Headset kennt sie nicht (`core/posture.ts`).
 *
 * Ein **Tisch mit einer Geisterhand** stand dort einmal, und die Idee war
 * gut: eine Handhaltung im Leeren einzustellen ist Raten, weil der Arm sich
 * mitbewegt, und auf einer Tischplatte nicht. Nur war er ein **zweiter** Weg
 * zu derselben Antwort, mit eigener Bedienung und eigener Gelegenheit,
 * versehentlich etwas anderes einzustellen als nebenan. Seit die Hand selbst
 * ein **Werkzeug** ist (`tools/HandTool.ts`), fällt er weg: man legt sie in
 * den Halter im Gang wie eine Pistole.
 *
 * **An der linken Wand steht eine Bank mit einem Griff darauf.** Der lässt
 * sich nicht bewegen, nur anfassen — und solange man ihn hält, spielt der
 * Controller das Muster, das an der Wand ausgewählt ist: gar nichts, ein
 * Antippen, ein Rückstoß, eine Salve, ein Herzschlag (`haptics.ts`). Vibration
 * ist die einzige Rückmeldung, die man nicht sehen kann; einen Ort, an dem man
 * sie in Ruhe nebeneinanderhalten kann, gab es bisher nicht.
 *
 * **Hier läuft niemand** — normalerweise. Der Stick bewegt nicht und dreht
 * nicht (`PlayerRig.locked`), weil der ganze Sinn ist, eine Haltung zu halten
 * und sie anzusehen, und ein Stick, der einen dabei aus dem Raum trägt, ist
 * nur Lärm. Nur: die Tafeln stehen rechts, die Bank links, und wer im Sessel
 * sitzt, kommt an keins von beidem. Also gibt es an der Wand einen **Knopf,
 * der den Stick freigibt** — ausdrücklich und sichtbar, statt dass es einfach
 * so geht.
 *
 * **Hinter dem Rücken, durch die Tür in der Rückwand, liegt der Schießgang.**
 * Er ist von links nach rechts gelesen ein Arbeitsablauf: das Werkzeug-Menü,
 * der Halter, der Griffstand, die Werte. Wer im Gang steht und nach vorn
 * schaut, hat links das **Werkzeug-Menü** an der Wand — eine Kachel je
 * Werkzeug, zu, bis man sie aufmacht. **Trigger oder Greifen** legt das
 * gewählte in die zeigende Hand und gleichzeitig als Kopie auf den zweiten
 * Stand: man wählt einmal, nicht zweimal.
 *
 * Dann kommen **zwei Justierstände** nebeneinander, jeder mit **seiner eigenen
 * Zielscheibe** am Ende des Gangs, genau vor sich. Sie beantworten die beiden
 * Hälften derselben Frage.
 *
 * Der **erste** hält ein Werkzeug auf seine Scheibe gerichtet: *wie halte ich
 * das Ding?*
 *
 * - Ein Werkzeug in den Halter halten — es rastet ein und liegt **exakt auf
 *   die Scheibe gerichtet**. Damit ist die Zielrichtung keine Unbekannte mehr.
 * - Die Hand ans Werkzeug führen, dorthin, wo man es halten will, und mit
 *   **Greifen oder Trigger** bestätigen. Was dazwischen liegt, *ist* die
 *   Haltung (`toolPose.ts`) — und das Werkzeug springt damit in die Hand
 *   zurück, wo man sofort sieht, ob es die Scheibe trifft.
 * - Auf dem Boden liegt dabei ein **Kreis**. Wer hineintritt, macht die Welt
 *   durchsichtig und seine **virtuelle Hand unsichtbar**: in einer AR-Sitzung
 *   sieht man dann die *echte* Hand am virtuellen Werkzeug und legt sie daran,
 *   statt zu raten, wo eine Boxhand aufhört. Es ist die einzige Stelle im
 *   Spiel, an der ein Schritt etwas schaltet, und sie hat einen Grund: genau
 *   hier sind beide Hände voll, und beide Hände voll heißt, dass niemand einen
 *   Knopf drückt. Ein von Hand geschaltetes AR bleibt davon unberührt.
 * - **Feinjustieren** für die letzten zwei Millimeter: die aktuelle Haltung
 *   wird geladen und als Geisterhand ans Werkzeug gestellt, und die *andere*
 *   Hand zieht sie zurecht — ein Zentimeter an der eigenen Hand ist ein
 *   Millimeter am Geist (`fineTune.ts`). Eine ausgestreckte Hand zittert um
 *   mehr als das, was hier eingestellt wird; untersetzt tut sie es nicht mehr.
 *
 * Der **zweite** steht rechts daneben, außerhalb des Kreises, und hält eine
 * unbewegliche **Kopie** desselben Werkzeugs mit einer **festen Boxhand**
 * daran: *wie umfasst die Hand es?* Die Kopie kann man nicht nehmen und nicht
 * schieben — sie ist der feste Punkt —, die Boxhand dagegen greifen, drehen,
 * verschieben und loslassen. Wo sie beim Loslassen liegt, *ist* die
 * Handhaltung an diesem Werkzeug (`handGrip.ts`). Darunter hängt ein Knopf, der
 * sie zurücksetzt, dort, wo man steht, wenn man ihn braucht.
 *
 * Zwei Stände, weil es zwei Größen sind: an einer Pistole zeigt der
 * Zeigefinger dorthin, wohin der Lauf zeigt, und das sieht richtig aus.
 * Dieselbe Haltung an einer Taschenlampe zeigt schräg in die Luft, weil deren
 * Kegel dort hinausgeht, wo bei der Pistole der Lauf sitzt — die Zielrichtung
 * stimmt, die Faust darum herum nicht.
 *
 * Und rechts an der Wand stehen die **Knöpfe** beider Stände — Höhe und Ort
 * gehen an den Griffen am Ausleger, alles andere hier — und hängt die
 * **Werte-Tafel**: dieselben Zahlen wie im Raum, in drei Zeilen, mit dem
 * Konfig-Code darunter. **AR an** ist einer dieser Knöpfe, für alle, die die
 * Welt durchsichtig haben wollen, ohne im Kreis zu stehen (`seeThrough.ts`).
 *
 * Everything else is the portal lab's, which is exactly why this is a world
 * and not a menu page: the belt, the tool shelf and the whole *Einstellungen →
 * Hände* tree come with it, so the hand you are watching is the hand you are
 * setting up.
 */
export class TuneWorld extends PortalWorld {
  private readonly models = new Map<Handedness, InputModel>();
  /**
   * Eine Tafel je Hand: was gedrückt ist, und darunter die Lage des Geräts.
   * Es waren einmal zwei übereinander — zusammen zu viel Fläche und trotzdem
   * zu kleine Schrift (`inputPanel.ts`).
   */
  private readonly boards = new Map<Handedness, TextPlane>();
  /** Die Fläche, auf der alles davon hängt. */
  private panel: THREE.Group | null = null;
  /** Schilder ohne eigenes Leben — sie werden nur beim Aufräumen gebraucht. */
  private readonly plates: TextPlane[] = [];
  /** Die Tafel der Aufnahme, und was gerade darauf steht. */
  private recordBoard: TextPlane | null = null;
  private recordLine = '';
  /** Sekunden seit dem letzten Neuzeichnen der Aufnahme-Tafel. */
  private recordAge = 0;
  /** Die laufende Aufnahme, und die letzte beendete daneben. */
  private recording: AccelRecording | null = null;
  private lastRecording: AccelRecording | null = null;
  /** Die eingefrorene Lage je Hand — Boxhand und Zylinder, wo sie dann lagen. */
  private readonly freezes = new Map<Handedness, THREE.Group>();
  /** Die Zahlen dazu, solange sie eingefroren sind. */
  private readonly frozen = new Map<Handedness, string>();
  /** Was zuletzt auf einer Handtafel stand — ein Canvas ohne Not ist teuer. */
  private readonly tiltLines = new Map<Handedness, string>();
  /**
   * Sekunden seit dem letzten Neuzeichnen — **je Tafel**, nicht eine für
   * beide. Mit einer gemeinsamen Uhr gewann immer dieselbe Hand: sie setzte
   * die Uhr zurück, und die andere kam nie an die Reihe, solange sich beide
   * bewegten.
   */
  private readonly tiltAge = new Map<Handedness, number>();
  /** Das Achsenkreuz des Raums — es steht still, und alles andere dreht sich dagegen. */
  private worldAxes: THREE.Group | null = null;
  private readonly buttons: WallButton[] = [];
  private bench: VibeBench | null = null;
  private range: ToolRange | null = null;
  /** Der zweite Stand: die Kopie mit der Boxhand daran. */
  private grip: GripStand | null = null;
  /** Die große Tafel im Raum: letzte Messung und ihr Code. */
  private valueBoard: TextPlane | null = null;
  /** Dieselben Werte noch einmal, an der linken Wand des Schießgangs. */
  private rangeBoard: TextPlane | null = null;
  private lastValueText = '';
  /**
   * Wände, Boden und Decke — und nur die. Der AR-Knopf blendet genau diese
   * Gruppe weg; Bank, Stände, Scheibe und alle Schilder bleiben stehen,
   * weil man sie ja gerade ansehen will.
   */
  private readonly shellGroup = new THREE.Group();
  private readonly seeThrough = new SeeThrough();
  /** Was im Halter liegt, und was gerade daran feinjustiert wird. */
  private mounted: Mounted | null = null;
  private fine: Fine | null = null;
  /**
   * Ein Werkzeug, das eben aus dem Halter kam und erst wieder heraus muss,
   * bevor es erneut einrasten darf — sonst schnappt es in derselben Frame
   * zurück, in der es in die Hand gesprungen ist.
   */
  private mountBlocked: Tool | null = null;
  /**
   * Wo die beiden Stände stehen — im Speicher, und beim Ziehen live.
   *
   * Beim Schieben an einem Griff ändert sich die Zahl jede Frame, und
   * `localStorage` jede Frame zu beschreiben (und danach ein Dutzend Schilder
   * neu zu zeichnen) ist genau die Sorte Kleinigkeit, die ein Headset stocken
   * lässt. Also läuft der Zug hier durch, und geschrieben wird beim Loslassen.
   */
  private rangeState: RangeSettings = rangeSettings();
  private rangeDrag: StandDrag<RangeSettings> | null = null;
  private unsubscribeChat: (() => void) | null = null;
  private unsubscribeRange: (() => void) | null = null;
  private gripState: GripSettings = gripSettings();
  private gripDrag: StandDrag<GripSettings> | null = null;
  private unsubscribeGrip: (() => void) | null = null;
  /** Wer gerade die Boxhand am zweiten Stand in der Hand hat. */
  private handDrag: GripDrag | null = null;
  /** Das Werkzeug-Menü, das frei vor dem Spieler hängt. */
  private toolMenu: WristMenu | null = null;
  /** Ob der Kopf im Kreis am ersten Stand steht — und ob *er* das AR anhat. */
  private inZone = false;
  private zoneAr = false;
  private buzz: Buzz | null = null;
  private pattern: HapticPattern = hapticPattern();
  /** Was zuletzt gemessen wurde — die Werte-Tafel lebt davon. */
  private readout: PoseReadout | null = null;
  private readoutFor = '';
  private code = '';
  private readonly shell = new THREE.MeshStandardMaterial({
    color: 0xe9edf5,
    roughness: 0.8,
    metalness: 0.05,
  });
  private readonly floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x9aa4bb,
    roughness: 0.9,
  });

  // --- der Poseraum ---------------------------------------------------------

  /** Der Schwebekasten hinter der Trennwand — und die Zone, die er meint. */
  private hover: HoverBox | null = null;
  /** Was gerade darin hängt. `null`, solange er leer ist. */
  private hoverTool: Tool | null = null;
  /** Die Tafel daneben: gemessene Haltung, Finger, Konfig-Code. */
  private poseBoard: TextPlane | null = null;
  private poseLine = '';
  /**
   * Wessen Haltung gerade geteilt wird — die Hand **ohne** Controller.
   *
   * `null` heißt: niemand schaut zu. Gemessen wird trotzdem weiter, damit die
   * Tafel im Raum etwas anzeigt; über die Leitung geht nur, was hier steht.
   */
  private sharing: Handedness | null = null;
  /**
   * Und die Hand, die den Knopf gedrückt hat: **ihr** Trigger hält fest.
   *
   * Sie ist die mit dem Controller — die andere hat gerade keinen, sonst gäbe
   * es hier nichts zu messen. Damit drückt niemand mit der Hand, die er
   * gerade stillhalten soll.
   */
  private sharingFrom: Handedness | null = null;
  /** Sekunden seit der letzten gesendeten Haltung — 20 Hz sind genug. */
  private shareAge = 0;
  /** Und seit dem letzten Neuzeichnen der Tafel — die darf langsamer sein. */
  private poseAge = 0;
  /** Der Konfig-Code der zuletzt gemessenen Haltung. */
  private poseCode = '';

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    // No walking, no snap turn — the head still goes wherever it likes. Der
    // Knopf an der Wand gibt das Drehen wieder frei.
    ctx.rig.locked = true;
    for (const button of this.buttons) {
      ctx.pointer.add({
        object: button.plane,
        grab: button.grab,
        onSelect: (hit) => button.run(hit.hand),
        onHover: () => button.plane.setHighlight(true),
        onBlur: () => button.plane.setHighlight(false),
      });
    }
    // Eine Änderung kommt aus mehreren Richtungen — Knopf, Griff am Ausleger,
    // Messung — und muss immer beides nachziehen: den Stand und die
    // Beschriftungen.
    this.buildToolMenu(ctx);
    // Was ein anderer schickt, landet direkt in den Speichern — und sagt, was
    // es war. Ein Code, der still einträgt, ist genau der, den man hinterher
    // nicht mehr los wird.
    // Nur Zeilen, die eine Maschine geschrieben hat: was jemand von Hand tippt,
    // wird nie angewandt, auch wenn es zufällig wie ein Code aussieht.
    this.unsubscribeChat = ctx.net.onChat((message, from) => {
      if (message.kind === 'code') this.receiveGear(message.text, from);
    });
    this.unsubscribeRange = onRangeChange(() => this.showRange(rangeSettings()));
    this.unsubscribeGrip = onGripChange(() => this.showGrip(gripSettings()));
    this.showRange(rangeSettings());
    this.showGrip(gripSettings());
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    this.updateRecording(dt, ctx);
    for (const side of ['left', 'right'] as const) {
      this.tiltAge.set(side, (this.tiltAge.get(side) ?? 0) + dt);
      // Das Modell zuerst: seine Zeile steht mit auf der Tafel darunter.
      const controller = ctx.input.get(side);
      const line = this.models.get(side)?.show(controller) ?? '';
      this.updateBoard(side, controller, line);
    }
    if (this.toolMenu) {
      ctx.rig.getHeadMatrix(_matrix);
      this.toolMenu.update(dt, ctx.input, _matrix);
    }
    this.updateZone(ctx);
    this.updateRange(ctx);
    this.updateRangeGrips(ctx);
    this.updateGripStand(ctx);
    this.updateFine(ctx);
    this.updateBuzz(dt, ctx);
    this.updatePoseRoom(dt, ctx);
  }

  override dispose(ctx: WorldContext): void {
    ctx.rig.locked = false;
    // Wer den Raum aus dem Kreis heraus verlässt, nimmt sonst unsichtbare
    // Hände mit in die nächste Welt.
    ctx.hands.hidden = false;
    this.inZone = false;
    // Eine Boxhand, die noch an einer Hand hängt, gehört zurück ans Werkzeug —
    // sonst geht sie mit dem Stand weg und die Hand behält ein Kind, das es
    // nicht mehr gibt.
    this.grip?.reclaim();
    // Eine durchsichtig gelassene Welt bliebe durchsichtig — die Materialien
    // gehören zwar dieser Welt, der Himmel und der Hintergrund aber nicht.
    this.cancelFine(true);
    this.releaseMount(false, true);
    this.seeThrough.reset(ctx.scene, this.shellGroup, ctx.renderer);
    this.unsubscribeChat?.();
    this.unsubscribeChat = null;
    this.unsubscribeRange?.();
    this.unsubscribeRange = null;
    this.unsubscribeGrip?.();
    this.unsubscribeGrip = null;
    for (const model of this.models.values()) model.dispose();
    this.models.clear();
    for (const board of this.boards.values()) board.dispose();
    this.boards.clear();
    this.recordBoard?.dispose();
    this.recordBoard = null;
    this.recording = null;
    this.lastRecording = null;
    for (const plate of this.plates) plate.dispose();
    this.plates.length = 0;
    this.panel?.removeFromParent();
    this.panel = null;
    if (this.worldAxes) disposeAxes(this.worldAxes);
    this.worldAxes = null;
    for (const side of ['left', 'right'] as const) this.clearFreeze(side);
    for (const freeze of this.freezes.values()) freeze.removeFromParent();
    this.freezes.clear();
    for (const button of this.buttons) {
      ctx.pointer.remove(button.plane);
      button.plane.dispose();
    }
    this.buttons.length = 0;
    this.toolMenu?.dispose();
    this.toolMenu = null;
    this.valueBoard?.dispose();
    this.valueBoard = null;
    this.rangeBoard?.dispose();
    this.rangeBoard = null;
    this.range?.dispose();
    this.range = null;
    this.grip?.dispose();
    this.grip = null;
    // Die Schwerelosigkeit gehört diesem Raum: wer ihn verlässt, nimmt sonst
    // eine Zone mit, deren Kasten längst weg ist.
    this.floatZone = null;
    this.hover?.dispose();
    this.hover = null;
    this.hoverTool = null;
    this.poseBoard?.dispose();
    this.poseBoard = null;
    this.poseLine = '';
    this.sharing = null;
    this.sharingFrom = null;
    this.mountBlocked = null;
    this.rangeDrag = null;
    this.gripDrag = null;
    this.handDrag = null;
    this.bench?.dispose();
    this.bench = null;
    this.buzz = null;
    this.shell.dispose();
    this.floorMaterial.dispose();
    super.dispose(ctx);
  }

  protected override spawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 0.9);
  }

  protected override skyColor(): number {
    return 0x121826;
  }

  protected override lightIntensity(): number {
    return 0.9;
  }

  protected override welcome(): string {
    return 'Prüfen: die Wand · Einmessen: der Schießgang hinter dir (Menü, Halter, Griffstand)';
  }

  /**
   * Die Boxhand auf der einen Hüfte, die Pistole auf der anderen: die beiden
   * Dinge, für die man herkommt — die Hand selbst und etwas, das sie hält.
   */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [
      ['hand-box', 'left'],
      ['pistol', 'right'],
    ];
  }

  /**
   * The whole room, and no props: this place is about the hands, not about
   * crates. (`buildProps` is never reached — the base class only calls it from
   * the `buildEnvironment` this replaces.)
   */
  protected override buildEnvironment(): void {
    const { half, height, thickness } = ROOM;
    const room = new THREE.Group();
    room.name = 'tune-room';
    this.root.add(room);
    // Alles Tragende in eine eigene Gruppe: der AR-Knopf blendet genau die
    // weg, und nichts, was daraufsteht.
    this.shellGroup.name = 'tune-shell';
    room.add(this.shellGroup);
    const shellGroup = this.shellGroup;

    this.slab(
      shellGroup,
      this.floorMaterial,
      [half * 2, thickness, half * 2],
      [0, -thickness / 2, 0],
      true,
    );
    this.slab(
      shellGroup,
      this.shell,
      [half * 2, thickness, half * 2],
      [0, height + thickness / 2, 0],
      false,
    );
    // Decke drüber: die Vorschau schneidet den Raum darunter auf.
    this.roof = height;
    this.slab(shellGroup, this.shell, [half * 2, height, thickness], [0, height / 2, -half], true);
    this.slab(shellGroup, this.shell, [thickness, height, half * 2], [-half, height / 2, 0], false);
    this.slab(shellGroup, this.shell, [thickness, height, half * 2], [half, height / 2, 0], false);

    // Die Rückwand hat eine Tür: dahinter liegt der Schießgang. Zwei Stücke
    // links und rechts, ein Sturz darüber — eine Wand mit Loch gibt es in
    // einem Kasten nicht.
    const door = LANE.left + 0.15;
    const side = (half - door) / 2;
    for (const sign of [-1, 1]) {
      this.slab(
        shellGroup,
        this.shell,
        [half - door, height, thickness],
        [sign * (door + side), height / 2, half],
        false,
      );
    }
    this.slab(
      shellGroup,
      this.shell,
      [door * 2, height - LANE.height, thickness],
      [0, (height + LANE.height) / 2, half],
      false,
    );

    // **Die Tafelwand**: alles, was man hier abliest, auf einer Fläche gut
    // zwei Meter vor dem Spieler. Die Maße stehen in `inputPanel.ts` und sind
    // dort geprüft — dass nichts vor etwas anderem steht, und dass man für das
    // Ganze den Kopf nicht drehen muss. Vorher hing es an der Vorderwand, vier
    // Meter weg: die Schrift war ein halbes Grad hoch, und die Modelle standen
    // aus Spielersicht mitten auf den Zahlen dahinter.
    const panel = new THREE.Group();
    panel.name = 'input-panel';
    panel.position.z = PANEL_Z;
    room.add(panel);
    this.panel = panel;

    const title = this.panelBoard(panel, PANEL.title, {
      title: 'Eingaberaum',
      body: 'Greifen = drei Finger an der Handfläche · Trigger = Zeigefinger',
      align: 'center',
      accent: 0x4aa8ff,
    });
    this.plates.push(title);

    // Die Aufnahme und ihr Knopf, nebeneinander in der obersten Zeile.
    const record = this.panelBoard(panel, PANEL.record, {
      title: 'Aufnahme',
      body: recordLines(null, null),
      accent: 0x5ee0a0,
    });
    this.recordBoard = record;
    this.plates.push(record);

    const recordButton = this.wallButton(
      panel,
      PANEL.recordButton.width,
      PANEL.recordButton.height,
      () => this.toggleRecording(),
    );
    recordButton.plane.position.set(PANEL.recordButton.x, PANEL.recordButton.y, 0);
    recordButton.refresh = () => {
      this.label(
        recordButton,
        this.recording ? 'Aufnahme beenden' : 'Aufnahme starten',
        this.recording ? 'Greifen setzt eine Marke' : 'Misst, wie stark die Hand beschleunigt',
        this.recording ? GRAB_GLOW : 0x5ee0a0,
      );
    };

    for (const side of ['left', 'right'] as const) {
      const sign = side === 'left' ? -1 : 1;

      const model = new InputModel(side);
      model.position.set(sign * PANEL.model.x, PANEL.model.y, 0);
      panel.add(model);
      this.models.set(side, model);

      // Die Tafel steht unter dem Modell, zu dem sie gehört: was gedrückt ist,
      // und darunter die **Lage** des Geräts als Zahl. Es waren einmal zwei
      // Tafeln übereinander, jede mit langen Zeilen — zusammen zu viel Fläche
      // und trotzdem zu kleine Schrift.
      const board = this.panelBoard(
        panel,
        { ...PANEL.board, x: sign * PANEL.board.x },
        { title: handLabel(side), body: 'nicht getrackt', accent: 0x9fe3ff },
      );
      this.boards.set(side, board);

      const freeze = new THREE.Group();
      freeze.name = `freeze-${side}`;
      freeze.visible = false;
      freeze.position.set(sign * PANEL.freeze.x, PANEL.freeze.y, 0);
      panel.add(freeze);
      this.freezes.set(side, freeze);
    }

    // **Das Achsenkreuz des Raums** — auf dem Boden zwischen einem selbst und
    // der Tafelwand, und daneben die Legende. Auf dem Boden und nicht auf
    // Brusthöhe: dort stand es eine Weile, mitten im Blick auf die Tafeln und
    // genau dort, wo man die Hände hält. Ein Kreuz allein sagt „hier sind drei
    // Achsen"; erst mit den Worten daneben sagt es, welche. Die Legende liegt
    // dabei tief genug, dass die unterste Zeile der Tafelwand sie nicht
    // verdeckt.
    this.worldAxes = createAxes(0.45);
    this.worldAxes.position.set(0, 0.02, -1.9);
    room.add(this.worldAxes);

    const legend = new TextPlane({
      width: 1.1,
      height: 0.5,
      title: 'Achsen',
      body:
        'X rot — nach rechts\n' +
        'Y grün — nach oben\n' +
        'Z blau — nach hinten\n' +
        '−Z weiß — nach VORN',
      accent: 0x9fe3ff,
    });
    legend.position.set(-1.05, 0.4, -1.9);
    room.add(legend);
    this.plates.push(legend);

    this.buildTurnButton(room);
    this.buildValues(room);
    this.buildBench(room);
    this.buildRange(room);
  }

  /**
   * Kein Horizont in diesem Raum.
   *
   * Jede Welt bekommt von der Basis eine Fläche bis zum Rand des Sichtbaren.
   * Hier steht sie in einem geschlossenen Kasten und ist deshalb nie zu
   * sehen — bis auf den einen Fall, auf den es hier ankommt: **AR an**, und
   * dann liegt sie als graue Platte über dem echten Fußboden. Ein Raum, der
   * durchsichtig werden können muss, hat keinen Boden, der es nicht kann.
   */
  protected override horizonColor(): number | null {
    return null;
  }

  // --- der Knopf, der das Drehen freigibt -----------------------------------

  /**
   * Er sagt selbst, was er aufhebt: *Hier läuft niemand — antippen erlaubt
   * Drehen und Gehen.* Das Schild daneben, das dasselbe sagte, ist weg; eins
   * von beidem reicht, und der Knopf ist das, was man drücken kann.
   */
  private buildTurnButton(room: THREE.Group): void {
    const { half, thickness } = ROOM;
    const button = this.wallButton(room, 1.5, 0.34, () => {
      const ctx = this.context;
      if (!ctx) return;
      ctx.rig.locked = !ctx.rig.locked;
      this.refreshButtons();
      ctx.notify(ctx.rig.locked ? 'Stick gesperrt' : 'Stick frei — bewegen und drehen');
    });
    // Außen an der Wand, neben der Tafelwand vorbei: die hängt in Lesenähe und
    // deckt aus Spielersicht alles, was mittig dahinter steht. Das Schild „Hier
    // läuft niemand" stand einmal daneben und sagte dasselbe wie der Knopf —
    // eins von beidem reicht, und der Knopf ist das, was man drücken kann.
    button.plane.position.set(2.35, 0.72, -half + thickness / 2 + 0.02);
    button.refresh = () => {
      const locked = this.context?.rig.locked !== false;
      this.label(
        button,
        locked ? 'Stick freigeben' : 'Stick sperren',
        locked
          ? 'Hier läuft niemand — antippen erlaubt Drehen und Gehen'
          : 'Stick dreht und geht · Gang hinter dir',
        locked ? 0x6f7d99 : GRAB_GLOW,
      );
    };
  }

  // --- die Werte-Ecke an der rechten Wand -----------------------------------

  /**
   * Wo einmal der Tisch stand, steht jetzt nur noch, was er nicht war.
   *
   * Der Tisch mit der Geisterhand hatte eine gute Idee — eine Wahrheit zum
   * Anfassen, damit man eine Haltung nicht gegen ein Gefühl einstellt — und
   * einen Fehler: er war ein **zweiter** Weg. Dieselbe Handhaltung ließ sich
   * dort gegen einen Geist legen und im Gang gegen ein Werkzeug messen, mit
   * zwei Bedienungen, zwei Erklärungen und zwei Gelegenheiten, verschiedene
   * Dinge einzustellen und sich hinterher zu wundern. Seit die Hand selbst ein
   * **Werkzeug** ist (`tools/HandTool.ts`), braucht es ihn nicht mehr: man
   * legt sie in den Halter wie eine Pistole.
   *
   * Geblieben sind die beiden Zahlen, die nichts mit dem Tisch zu tun hatten
   * und trotzdem an ihm hingen — die eigene **Augenhöhe**, im Stehen und im
   * Sitzen (`core/posture.ts`) —, und die **Werte-Tafel**, auf der die letzte
   * Messung samt ihrem Konfig-Code steht. Beides liest man ab, statt es
   * anzufassen, also hängt es an der Wand und nicht auf einem Möbelstück.
   */
  private buildValues(room: THREE.Group): void {
    const { half, thickness } = ROOM;

    const sign = new TextPlane({
      width: 1.6,
      height: 0.42,
      title: 'Augenhöhe und Werte',
      body: 'Erst die eigene Höhe messen — ohne sie stimmt keine Zahl aus dem Gang',
      accent: 0x9fe3ff,
      align: 'center',
    });
    sign.position.set(half - thickness / 2 - 0.02, 2.3, -0.3);
    sign.rotation.y = -Math.PI / 2;
    room.add(sign);

    for (const [index, key] of (['stand', 'sit'] as const).entries()) {
      const button = this.wallButton(room, 0.86, 0.28, () => this.measureEye(key));
      button.plane.position.set(
        half - thickness / 2 - 0.02,
        1.95,
        -0.3 + (index === 0 ? 0.46 : -0.46),
      );
      button.plane.rotation.y = -Math.PI / 2;
      button.refresh = () => {
        this.label(
          button,
          key === 'stand'
            ? `Stehhöhe: ${eyeHeights().stand} cm`
            : `Sitzhöhe: ${eyeHeights().sit} cm`,
          key === 'stand'
            ? 'Aufstehen, drücken — die Brille misst'
            : 'Hinsetzen, drücken — die Brille misst',
          0x4aa8ff,
        );
      };
    }

    // Breit, weil ein Konfig-Code breit ist, und tiefer, weil man sie abliest
    // statt sie zu drücken.
    const values = new TextPlane({
      width: 1.5,
      height: 0.66,
      title: 'Noch nichts justiert',
      body: 'Werkzeug in den Halter, Hand daran, Greifen oder Trigger',
      accent: 0x5ee0a0,
    });
    values.position.set(half - thickness / 2 - 0.02, 1.4, -0.3);
    values.rotation.y = -Math.PI / 2;
    room.add(values);
    this.valueBoard = values;
  }

  /**
   * Die eigene Augenhöhe, gemessen statt geschätzt.
   *
   * `camera.position.y` ist die Kopfhöhe der Brille über dem Zimmerboden und
   * damit genau die Zahl, um die es geht — der Sitz-Lift rechnet nicht mit
   * hinein, weil er am Rig hängt und nicht an der Kamera darin.
   */
  private measureEye(key: 'stand' | 'sit'): void {
    const ctx = this.context;
    if (!ctx) return;
    const centimetres = Math.round(ctx.rig.camera.position.y * 100);
    if (centimetres < 40) {
      ctx.notify('Dafür muss die Brille auf sein');
      return;
    }
    const values = saveEyeHeights({ [key]: centimetres });
    ctx.rig.seatHeight = seatedLift(values);
    ctx.rig.flatEyeHeight = values.stand / 100;
    this.refreshButtons();
    ctx.notify(`${key === 'stand' ? 'Stehhöhe' : 'Sitzhöhe'}: ${values[key]} cm`);
  }

  /** Der Justierstand auf denselben Stand — derselbe einzige Weg dorthin. */
  private showRange(settings: RangeSettings): void {
    this.rangeState = settings;
    this.range?.apply(settings);
    this.alignTargets();
    this.refreshButtons();
  }

  /** Der zweite Stand auf denselben Stand — derselbe einzige Weg dorthin. */
  private showGrip(settings: GripSettings): void {
    this.gripState = settings;
    const stand = this.grip;
    if (!stand) {
      this.refreshButtons();
      return;
    }
    stand.apply(settings);
    this.alignTargets();
    if (!stand.setTool(settings.tool) && settings.tool !== DEFAULT_GRIP.tool) {
      // Eine Id aus einer Fassung, die dieses Werkzeug noch kannte: dann liegt
      // eben wieder die Pistole da. Ein leerer Stand wäre die schlechteste der
      // möglichen Antworten darauf.
      saveGripSettings({ tool: DEFAULT_GRIP.tool });
      return;
    }
    this.placeGripHand();
    this.refreshButtons();
  }

  /**
   * Wer auf welche Scheibe zielt.
   *
   * Beide Stände bringen je eine mit, und beide lassen sich quer durch den Gang
   * schieben — spätestens seit die beiden einmal die Seiten getauscht haben,
   * zeigte jeder auf die Scheibe des anderen. Die Scheiben bleiben deshalb
   * hängen, wo sie hängen, und die **Zuordnung** dreht sich: der linke Stand
   * nimmt die linke Scheibe (`lane.ts`, `swapTargets`).
   */
  private alignTargets(): void {
    const range = this.range;
    const grip = this.grip;
    if (!range || !grip) return;
    const swap = swapTargets(
      this.rangeState.x / 100,
      this.gripState.x / 100,
      range.disc.position.x,
      grip.disc.position.x,
    );
    range.aimAt(swap ? grip.disc : range.disc);
    grip.aimAt(swap ? range.disc : grip.disc);
  }

  /**
   * Die Boxhand an ihren Platz: dorthin, wo die eingestellte Haltung sie hin
   * legt.
   *
   * Gerechnet wird im Raum der Kopie (`handGrip.ts`), und die Hand hängt auch
   * dort — deshalb steht hier eine Ortslage und keine Weltlage. Während sie an
   * einer echten Hand hängt, wird nichts gestellt: sie gehört dann der Hand.
   */
  private placeGripHand(): void {
    const stand = this.grip;
    const ctx = this.context;
    if (!stand || !ctx || this.handDrag) return;
    const tool = stand.tool;
    if (!tool) return;
    const side = this.gripState.side;
    // Die Kopie in die Gestalt bringen, die sie **in dieser Hand** hat. Die
    // meisten Werkzeuge sehen in jeder Hand gleich aus; die Drohne schiebt ihr
    // Deck zur Seite, damit der Griff dieser Hand auf dem Ursprung sitzt, und
    // der Hammer seinen Stiel entlang der Achse. Ohne diese Zeile stünde am
    // Stand ein anderer Gegenstand als der, den man später hält — und die
    // Boxhand landete um genau diese Verschiebung daneben (`Tool.showHeldBy`).
    tool.showHeldBy(side);
    const pose = ctx.hands.editablePose(side, this.gripState.tool);
    const ghost = stand.setHand(side, pose);
    if (!ghost) return;
    const local = this.gripLocal(tool, side);
    const at = ghostOnTool(local, poseOfHand(pose));
    ghost.position.set(at.position.x, at.position.y, at.position.z);
    ghost.quaternion.set(at.rotation.x, at.rotation.y, at.rotation.z, at.rotation.w);
  }

  /**
   * Die Lage des Werkzeugs im Griff, so wie eine Hand sie ihm gäbe.
   *
   * Gelesen wird sie am **echten** Werkzeug und nicht an der Kopie: die Kopie
   * ist Geometrie, die Zahl gehört dem Ding, das am ersten Stand eingemessen
   * wurde. Und die Zielkorrektur kommt von der Hand, um die es geht — ein
   * Werkzeug, das zielt, hängt im Zeigestrahl und nicht in der Faust.
   */
  private gripLocal(copy: Tool, side: Handedness): Pose {
    const tool = this.tool(copy.toolId) ?? copy;
    aimQuaternion(aims(tool) ? (this.context?.input.get(side) ?? null) : null, _aim);
    // Und zwar die Haltung **dieser** Hand: gemessen ist sie an einer, die
    // andere rechnet das Werkzeug daraus (`Tool.holdIn`). Ohne das stünde die
    // Boxhand am Stand an der Stelle der anderen Hand.
    tool.holdIn(side, _holdPosition, _holdRotation);
    return toolInGrip({ position: _holdPosition, rotation: _holdRotation }, _aim);
  }

  /**
   * Die Handhaltung, bei der die Boxhand **genau im Werkzeug** steht.
   *
   * Das ist der Nullpunkt, den ein Mensch an diesem Stand meint: `ghostOnTool`
   * setzt die Hand an `Lage-im-Griff⁻¹ · Haltung`, und für `Haltung =
   * Lage-im-Griff` bleibt davon die Ruhe übrig. Krümmung und Spreizung kommen
   * aus der gebauten Faust — beim Zurücksetzen soll auch die Hand wieder zu
   * sein.
   */
  private gripHomePose(side: Handedness): HandPose {
    const tool = this.grip?.tool;
    if (!tool) return clonePose(HOLD_HAND_POSE);
    // Die Finger der Faust, die zu **diesem** Werkzeug gebaut ist: am
    // Standardgriff liegt der Zeigefinger am Rahmen, am Stiel des Hammers ist er
    // mit in der Faust.
    const fist = defaultHoldPose(side, tool.toolId);
    const readout = readPose(this.gripLocal(tool, side) as HoldPose);
    return { ...fist, ...readout };
  }

  /** "Rechte Hand · Pistole" — welche Hand, und was sie hält. */
  private poseTitle(hand: Handedness, toolId: string | null): string {
    if (!toolId) return handLabel(hand);
    if (toolId === GRAB_POSE_ID) return `${handLabel(hand)} · Objekt`;
    return `${handLabel(hand)} · ${this.tool(toolId)?.label ?? toolId}`;
  }

  /**
   * Die Werte-Tafel: was zuletzt gemessen wurde, und der Code dafür.
   *
   * Beides gehört zusammen und beides wird abgelesen: die Zahlen, um sie
   * jemandem zu sagen, und der Code, um sie jemandem zu *geben*. Er trägt nur
   * diese eine Hand in dieser einen Darstellung — deshalb passt er auf eine
   * Tafel, auf der sonst keine vierzig Zeichen Platz hätten.
   */
  private showValues(): void {
    const readout = this.readout;
    const title = readout
      ? `x ${readout.x} y ${readout.y} z ${readout.z} cm`
      : 'Noch nichts justiert';
    // Drei Zeilen statt einer: wer, wie schräg, und der Code. Aneinandergeklebt
    // war das ein Absatz, in dem die Tafel den Rest wegkürzte — und weggekürzt
    // wurde immer der Code, weil er hinten steht.
    const body = readout
      ? `${this.readoutFor}\npitch ${readout.pitch}°  yaw ${readout.yaw}°  roll ${readout.roll}°\n${this.code}`
      : 'Werkzeug in den Halter, Hand daran, Greifen oder Trigger';
    const line = `${title}|${body}`;
    if (line === this.lastValueText) return;
    this.lastValueText = line;
    // Beide Tafeln zeigen dasselbe: gemessen wird im Gang, abgelesen wird da,
    // wo man gerade steht — wer im Gang steht, läuft für seine eigenen Zahlen
    // nicht zurück in den Raum, und umgekehrt.
    const accent = readout ? 0x5ee0a0 : 0x6f7d99;
    this.valueBoard?.setText(title, body, accent);
    this.rangeBoard?.setText(title, body, accent);
  }

  // --- der Schießgang -------------------------------------------------------

  /**
   * Der Gang hinter der Rückwand: Wände, Scheibe, **zwei** Stände, Knöpfe,
   * Tafel.
   *
   * Er ist bewusst schmal und **portalfrei**: hier wird gezielt und nicht
   * gespielt, und ein Portal mitten im Gang wäre das Ende jeder Messung.
   *
   * Die beiden Stände stehen nebeneinander, weil sie zusammengehören und
   * nacheinander drankommen: links der **Halter** mit der Zielscheibe dahinter
   * (wie halte ich es?), rechts der **Griffstand** mit der Kopie und der
   * Boxhand (wie umfasst die Hand es?). Dazwischen liegt genug Luft, dass die
   * Hand am einen nicht die Griffe des anderen streift — das ist die einzige
   * harte Anforderung an die Aufstellung.
   */
  private buildRange(room: THREE.Group): void {
    const { half, thickness } = ROOM;
    const z0 = half;
    const middle = z0 + LANE.length / 2;
    const width = LANE_WIDTH + thickness * 2;
    const shellGroup = this.shellGroup;

    this.slab(
      shellGroup,
      this.floorMaterial,
      [width, thickness, LANE.length],
      [LANE_MID, -thickness / 2, middle],
      false,
    );
    this.slab(
      shellGroup,
      this.shell,
      [width, thickness, LANE.length],
      [LANE_MID, LANE.height + thickness / 2, middle],
      false,
    );
    // Links und rechts stehen nicht mehr gleich weit weg: rechts liegt hinter
    // der Trennwand der Poseraum (`lane.ts`).
    for (const [sign, edge] of [
      [1, LANE.left],
      [-1, LANE.right],
    ] as const) {
      this.slab(
        shellGroup,
        this.shell,
        [thickness, LANE.height, LANE.length],
        [sign * (edge + thickness / 2), LANE.height / 2, middle],
        false,
      );
    }
    this.slab(
      shellGroup,
      this.shell,
      [width, LANE.height, thickness],
      [LANE_MID, LANE.height / 2, z0 + LANE.length + thickness / 2],
      false,
    );

    // Und vorn das Stück, das der Raum nicht mehr abdeckt: seine Rückwand ist
    // nur so breit wie er selbst, der Gang seit dieser Runde breiter. Ohne
    // diese Platte stünde der Poseraum vorn offen ins Nichts.
    const overhang = LANE.right - half;
    if (overhang > 0) {
      this.slab(
        shellGroup,
        this.shell,
        [overhang, LANE.height, thickness],
        [-(half + overhang / 2), LANE.height / 2, z0],
        false,
      );
    }

    const range = new ToolRange();
    range.position.set(0, 0, z0);
    room.add(range);
    this.range = range;

    const grip = new GripStand();
    grip.position.set(0, 0, z0);
    room.add(grip);
    this.grip = grip;

    // Jede Scheibe hält, was auf sie geschossen wird — sonst fliegt jede Kugel
    // durch sie hindurch in die Wand, und man sieht nicht, ob man getroffen
    // hat.
    for (const disc of [range.disc, grip.disc]) {
      disc.updateWorldMatrix(true, false);
      this.physics?.addStatic(disc);
    }

    // Über der Tür und zum Raum hin: man liest es, wenn man sich umdreht, und
    // nicht erst, wenn man schon drinsteht.
    const sign = new TextPlane({
      width: 2.4,
      height: 0.26,
      title: 'Schießgang',
      body: 'Links das Werkzeug-Menü · dann der Halter im Kreis · dann die Boxhand am Werkzeug · rechts die Werte und die Tür in den Poseraum',
      accent: 0xffc857,
      align: 'center',
    });
    sign.position.set(0, (ROOM.height + LANE.height) / 2, z0 - thickness / 2 - 0.02);
    sign.rotation.y = Math.PI;
    room.add(sign);

    this.buildRangeButton(range);
    this.buildGripPanel(grip);
    this.buildRangePanels(room, z0);
    this.buildPoseRoom(room, z0);
  }

  /**
   * Das Werkzeug-Menü: **vor dem Spieler**, nicht an der Wand.
   *
   * Zuerst hing es als Kachelraster an der Wand des Gangs, und das hatte zwei
   * Fehler auf einmal. Es war ein **zweites** Menü — dieselbe Liste wie im
   * Handgelenkmenü, nur mit eigener Bedienung, eigenem Aussehen und einer
   * eigenen Stelle, an der es künftig auseinanderläuft. Und es hing dort, wo
   * es gebaut wurde, statt dort, wo man steht: wer am Griffstand arbeitet,
   * dreht sich zum Aussuchen einmal um die eigene Achse.
   *
   * Jetzt ist es dasselbe Panel wie am Handgelenk (`ui/WristMenu.ts`), nur mit
   * `anchor: 'view'` — es hängt frei in der Luft vor dem Kopf, hat keinen
   * runden Knopf und wird von einem Schild am Halter aufgemacht. Trigger *oder*
   * Greifen wählt aus, weil das Regal eine **Nimm-Seite** ist.
   *
   * Und die Auswahl legt das Werkzeug gleich **in den Halter**: man wählt es,
   * um es einzumessen, und der Weg dorthin führt ohnehin nur über den Halter.
   */
  private buildToolMenu(ctx: WorldContext): void {
    const menu = new WristMenu(ctx.pointer, {
      anchor: 'view',
      title: 'Werkzeug wählen',
      footer: 'Trigger oder Greifen legt es in den Halter',
    });
    menu.name = 'tune-tool-menu';
    // In den Raum des Rigs: das Panel rechnet seine Lage gegen den Kopf, und
    // der lebt dort. An der Welt hinge es schief, sobald der Spieler sich dreht.
    ctx.rig.add(menu);
    menu.setModelFactory((id) => this.tool(id));
    menu.setRoot(this.toolMenuRows(), 'Werkzeug wählen', true);
    menu.toggle(false);
    this.toolMenu = menu;
  }

  /** Eine Zeile je Werkzeug — dieselbe Liste, die auch das Regal zeigt. */
  private toolMenuRows(): MenuEntry[] {
    return TOOL_IDS.map((id) => {
      const tool = this.tool(id);
      return {
        id: `tune-tool:${id}`,
        label: tool?.label ?? id,
        sub: this.gripState.tool === id ? 'liegt im Halter' : tool?.hint,
        icon: tool?.icon ?? 'tools',
        accent: this.gripState.tool === id ? GRAB_GLOW : (tool?.accent ?? 0x9d7bff),
        preview: id,
        run: (hand) => this.pickTool(id, hand),
      };
    });
  }

  /** Auf oder zu — und beim Aufmachen weicht das Handgelenkmenü. */
  private setToolMenu(open: boolean): void {
    const menu = this.toolMenu;
    if (!menu) return;
    if (open) {
      this.context?.menu.toggle(false);
      menu.setRoot(this.toolMenuRows(), 'Werkzeug wählen', true);
    }
    menu.toggle(open);
    this.refreshButtons();
  }

  /**
   * Ein Werkzeug aus dem Menü: in die zeigende Hand und sofort **in den
   * Halter**.
   *
   * Beides, weil beides gemeint ist. Man wählt ein Werkzeug, um es einzumessen,
   * und dazu muss es erst in eine Hand (nur eine gehaltene lässt sich ablegen)
   * und dann in die Aufnahme. Diesen Weg von Hand zu gehen ist kein Erkenntnis-
   * gewinn, sondern Arbeit. Der Griffstand bekommt dieselbe Id gleich mit —
   * `mountTool` sorgt dafür.
   */
  private pickTool(id: string, pointing: Handedness | null): void {
    const ctx = this.context;
    if (!ctx) return;
    this.cancelHandDrag(true);
    const hand: Handedness = pointing ?? this.gripState.side;
    // Was im Halter liegt, muss erst heraus: zwei Werkzeuge in einer Aufnahme
    // gibt es nicht.
    this.releaseMount(false, true);
    this.equipTool(ctx, hand, id);
    const tool = this.host?.heldTool(hand) ?? null;
    if (tool) {
      // Ungespannt: der Trigger, der die Zeile ausgewählt hat, ist in diesem
      // Bild noch unten und darf nicht auch schon die Messung abschließen.
      this.mountTool(tool, hand, false);
    } else {
      // Ohne getrackte Hand kommt nichts in den Halter — das sagt `equipTool`
      // schon. Der Griffstand bekommt das Werkzeug trotzdem: dort wird es auch
      // ohne Hand gebraucht.
      saveGripSettings({ tool: id, side: hand });
    }
    this.setToolMenu(false);
  }

  /**
   * Der Knopf **unter** dem Halter: das Werkzeug-Menü auf und zu.
   *
   * Dort, weil das Werkzeug dort landet. Ein Schild an der Wand hätte man
   * suchen müssen; dieses steht neben dem Loch, in das es gleich fällt.
   */
  private buildRangeButton(range: ToolRange): void {
    const button = this.wallButton(range.panel, 0.66, 0.22, () =>
      this.setToolMenu(!(this.toolMenu?.isOpen ?? false)),
    );
    button.refresh = () => {
      const open = this.toolMenu?.isOpen ?? false;
      this.label(
        button,
        open ? 'Menü zu' : 'Werkzeug wählen',
        open ? 'Trigger oder Greifen legt es hier hinein' : `${TOOL_IDS.length} Werkzeuge`,
        open ? GRAB_GLOW : 0x4aa8ff,
      );
    };
  }

  /**
   * Der Knopf **unter** dem Griffstand: die Handhaltung zurück auf die Faust.
   *
   * Er hängt am Stand und nicht an der Wand, weil man ihn genau dann braucht,
   * wenn man dort steht und die Boxhand so verschoben hat, dass sie nirgends
   * mehr hingehört. Zur Wand zu laufen, um das zurückzunehmen, ist der Umweg,
   * der einen davon abhält, es überhaupt zu probieren. An der Wand steht
   * derselbe Knopf trotzdem noch — wer ihn dort sucht, findet ihn dort.
   */
  private buildGripPanel(grip: GripStand): void {
    const button = this.wallButton(grip.panel, 0.62, 0.2, () => this.resetGripPose());
    button.refresh = () => {
      this.label(button, 'Griff zurücksetzen', handLabel(this.gripState.side), 0xffc857);
    };
  }

  /**
   * Die Knöpfe und die Werte-Tafel an der **rechten** Wand des Gangs.
   *
   * Rechts, weil links das Werkzeug-Menü hängt und die Reihenfolge im Gang die
   * Reihenfolge der Arbeit sein soll: Werkzeug wählen, in den Halter, Griff
   * nachziehen, Zahlen ablesen.
   */
  private buildRangePanels(room: THREE.Group, z0: number): void {
    // Auf der Gangseite der **Trennwand**, also genau dort, wo früher die Wand
    // stand: der Gang ist rechts breiter geworden, seine Knöpfe sind deshalb
    // keinen Zentimeter weiter weg (`lane.ts`).
    const x = -(LANE.left - 0.02);

    // Zwei Spalten statt einer langen Reihe: acht Knöpfe untereinander reichen
    // sonst bis auf den Boden, und der unterste ist der, den man am seltensten
    // findet und am häufigsten braucht.
    for (const [index, row] of this.rangeRows().entries()) {
      const button = this.wallButton(room, 0.9, 0.28, row.run);
      button.plane.position.set(
        x,
        1.95 - Math.floor(index / 2) * 0.32,
        z0 + (index % 2 === 0 ? 1.74 : 0.78),
      );
      button.plane.rotation.y = Math.PI / 2;
      button.refresh = () => row.refresh(button);
    }

    // Die Tafel hängt weiter hinten an derselben Wand: man liest sie im
    // Vorbeigehen zur Scheibe, und sie ist nichts zum Drücken. Groß, weil auf
    // ihr **alles** stehen soll — eine Werte-Tafel, die kürzt, lässt genau die
    // Zahl weg, für die man hergekommen ist. Sie steht **hinter** der Tür in
    // den Poseraum: in der Tür hinge sie in der Luft.
    const values = new TextPlane({
      width: 1.7,
      height: 0.9,
      title: 'Noch nichts justiert',
      body: 'Werkzeug in den Halter, Hand daran, Greifen oder Trigger',
      accent: 0x5ee0a0,
    });
    values.position.set(x, 1.5, z0 + PARTITION.doorTo + 0.95);
    values.rotation.y = Math.PI / 2;
    room.add(values);
    this.rangeBoard = values;
  }

  // --- der Poseraum hinter der Trennwand ------------------------------------

  /**
   * **Der Poseraum**: der Streifen rechts hinter der Trennwand, mit dem
   * Schwebekasten darin.
   *
   * Er beantwortet eine dritte Frage, die die beiden Stände nicht können.
   * Der Halter misst, *wie ich ein Werkzeug halte*, der Griffstand, *wie die
   * gezeichnete Hand es umfasst* — und beide messen die Hand **am Controller**.
   * Eine Hand am Controller ist aber eine Faust um einen Zylinder, und was
   * eine Hand mit einem Gegenstand wirklich macht, sieht anders aus. Wer eine
   * Handhaltung *realistischer* haben will, muss die **blanke** Hand messen,
   * und das geht erst, seit sie einen Handschuh tragen kann (`gloveFit.ts`).
   *
   * Also drei Dinge an einem Ort:
   *
   * - Der **Schwebekasten** hält, was man hineinlegt: eine durchsichtige Kiste
   *   in der Luft, in der die Schwerkraft aufhört (`HoverBox.ts`,
   *   `PortalWorld.floatZone`). Man lässt ein Werkzeug darin los, es bleibt
   *   liegen, und man rückt es zurecht, bis es so hängt, wie man es halten
   *   will.
   * - Der **Schalter an der Wand** zieht getrackten Händen den Handschuh an.
   *   Ohne ihn misst man gegen eine Reihe Kugeln, und eine Reihe Kugeln hat
   *   keine Handfläche, an der man etwas ausrichten könnte.
   * - Der **Knopf daneben** färbt jeden Knochen einzeln ein
   *   (`core/bonePalette.ts`). Fünf gleich weiße Röhren sagen nicht, welcher
   *   Finger welcher ist und wo sein zweiter Knochen anfängt — und genau das
   *   ist die Frage, sobald man eine Zahl je Knochen einstellt.
   * - Der **Teilen-Knopf** schickt die Haltung der *anderen* Hand live an alle
   *   im Raum — und damit an die Werkzeugseite, die sich als Zuschauer
   *   verbindet (`handShare.ts`). Der Trigger der Hand, die gedrückt hat,
   *   hält sie fest.
   *
   * Warum die andere Hand: wer misst, hat eine Hand am Gegenstand und braucht
   * die zweite zum Drücken. Beide Hände frei gäbe es nur ohne Controller, und
   * dann gäbe es auch keinen Trigger.
   */
  private buildPoseRoom(room: THREE.Group, z0: number): void {
    const shellGroup = this.shellGroup;
    const wall = PARTITION.thickness;

    // Die Trennwand: zwei Stücke und ein Sturz — dieselbe Machart wie die
    // Rückwand des Raums, denn es ist dieselbe Aufgabe.
    for (const [from, to] of [
      [0, PARTITION.doorFrom],
      [PARTITION.doorTo, LANE.length],
    ] as const) {
      const span = to - from;
      if (span <= 0) continue;
      this.slab(
        shellGroup,
        this.shell,
        [wall, LANE.height, span],
        [PARTITION.x, LANE.height / 2, z0 + from + span / 2],
        false,
      );
    }
    this.slab(
      shellGroup,
      this.shell,
      [wall, LANE.height - PARTITION.doorHeight, PARTITION.doorTo - PARTITION.doorFrom],
      [
        PARTITION.x,
        (LANE.height + PARTITION.doorHeight) / 2,
        z0 + (PARTITION.doorFrom + PARTITION.doorTo) / 2,
      ],
      false,
    );

    // Über der Tür, zum Gang hin: man liest es im Vorbeigehen, und genau dann
    // will man wissen, was dahinter liegt.
    const sign = new TextPlane({
      width: 1.5,
      height: 0.22,
      title: 'Poseraum',
      body: 'Schwerelos justieren · Handschuh an die blanke Hand · Haltung teilen',
      accent: 0x9d7bff,
      align: 'center',
    });
    sign.position.set(
      -(LANE.left - 0.02),
      (LANE.height + PARTITION.doorHeight) / 2,
      z0 + (PARTITION.doorFrom + PARTITION.doorTo) / 2,
    );
    sign.rotation.y = Math.PI / 2;
    room.add(sign);
    this.plates.push(sign);

    // Der Kasten selbst, auf Arbeitshöhe in der Mitte des Streifens.
    const box = new HoverBox(POSE_ROOM.box);
    box.position.set(POSE_ROOM.x, POSE_ROOM.height, z0 + POSE_ROOM.z);
    room.add(box);
    this.hover = box;
    // Von hier an schwebt alles, was darin losgelassen wird.
    this.floatZone = box;

    // Die Tafeln stehen an der **Außenwand**, also hinter dem Kasten aus
    // Sicht dessen, der durch die Tür kommt: Kasten im Blick, Zahlen dahinter,
    // beides in einer Ansicht. Genau das macht die Tafelwand im Raum vorn auch.
    const x = -(LANE.right - 0.02);
    const z = z0 + POSE_ROOM.z;

    const title = new TextPlane({
      width: 1.8,
      height: 0.28,
      title: 'Schwebekasten',
      body: 'Werkzeug hineinhalten und loslassen · blanke Hand daran · Trigger der anderen Hand speichert',
      accent: 0x9d7bff,
      align: 'center',
    });
    title.position.set(x, 2.42, z);
    title.rotation.y = Math.PI / 2;
    room.add(title);
    this.plates.push(title);

    const board = new TextPlane({
      width: 1.8,
      height: 0.6,
      title: 'Noch nichts gemessen',
      body: 'Handpose teilen drücken — gemessen wird die andere Hand',
      accent: 0x6f7d99,
    });
    board.position.set(x, 1.98, z);
    board.rotation.y = Math.PI / 2;
    room.add(board);
    this.poseBoard = board;

    for (const [index, row] of this.poseRows().entries()) {
      const button = this.wallButton(room, 0.94, 0.28, row.run);
      button.plane.position.set(x, 1.9 - index * 0.32, z + 1.2);
      button.plane.rotation.y = Math.PI / 2;
      button.refresh = () => row.refresh(button);
    }
  }

  /** Die vier Knöpfe an der Außenwand des Poseraums. */
  private poseRows(): Array<{
    refresh: (button: WallButton) => void;
    run: (hand: Handedness | null) => void;
  }> {
    return [
      {
        refresh: (button) => {
          const on = trackedGlove();
          this.label(
            button,
            on ? 'Handschuh: an' : 'Handschuh: aus',
            on
              ? 'Blanke Hände tragen ihn, auf den echten Knochen'
              : 'Blanke Hände sind Kugeln an den Gelenken',
            on ? GRAB_GLOW : 0x4aa8ff,
          );
        },
        run: () => this.toggleTrackedGlove(),
      },
      {
        refresh: (button) => {
          const on = boneColors();
          this.label(
            button,
            on ? 'Knochenfarben: an' : 'Knochenfarben: aus',
            on ? 'Ein Ton je Finger, eine Stufe je Knochen' : 'Alle Knochen in der Farbe der Hand',
            on ? GRAB_GLOW : 0x5ee0a0,
          );
        },
        run: () => this.toggleBoneColors(),
      },
      {
        refresh: (button) => {
          const side = this.sharing;
          const peers = this.context?.net.peers.size ?? 0;
          this.label(
            button,
            side ? `Teilen läuft: ${handLabel(side)}` : 'Handpose teilen',
            side
              ? `Trigger ${handLabel(this.sharingFrom ?? side)} speichert · an ${peers}`
              : 'Zeigen mit der Hand am Controller — geteilt wird die andere',
            side ? GRAB_GLOW : 0x9d7bff,
          );
        },
        run: (hand) => this.toggleShare(hand),
      },
      {
        refresh: (button) => {
          this.label(
            button,
            'Pose senden',
            this.poseCode || 'Erst messen, dann senden',
            this.poseCode ? 0x5ee0a0 : 0x6f7d99,
          );
        },
        run: () => this.sendPoseCode(),
      },
    ];
  }

  /**
   * Der Schalter an der Wand: Handschuh an die blanke Hand — oder wieder ab.
   *
   * Er steht hier und nicht nur im Menü, weil man ihn genau hier braucht: eine
   * Reihe Gelenkkugeln hat keine Handfläche, und an eine Handfläche legt man
   * einen Gegenstand.
   */
  private toggleTrackedGlove(): void {
    const on = saveTrackedGlove(!trackedGlove());
    this.context?.hands.refreshPoses();
    this.refreshButtons();
    this.context?.notify(
      on ? 'Handschuh an den blanken Händen' : 'Blanke Hände wieder als Gelenkkugeln',
    );
  }

  /**
   * **Knochenfarben an, Knochenfarben aus.**
   *
   * Der Knopf daneben, und aus demselben Grund: hier misst man eine Hand, und
   * eine einfarbige Hand sagt nicht, welcher Finger welcher ist und wo sein
   * zweiter Knochen anfängt. Angeschaltet bekommt jeder Finger einen Ton und
   * jeder Knochen darin eine Stufe (`bonePalette.ts`) — an der Boxhand, am
   * Handschuh und an den Gelenkkugeln gleichermaßen, damit man auch dann noch
   * dasselbe vergleicht.
   *
   * Er ist eine Einstellung wie jede andere und bleibt an, bis jemand ihn
   * ausmacht: wer eine Haltung über mehrere Sitzungen einstellt, will nicht
   * jedes Mal von vorn anfangen.
   */
  private toggleBoneColors(): void {
    const on = saveBoneColors(!boneColors());
    this.context?.hands.refreshPoses();
    this.refreshButtons();
    this.context?.notify(
      on ? 'Knochenfarben an — ein Ton je Finger' : 'Knochenfarben aus — wieder eine Hand',
    );
  }

  /**
   * **Teilen an, teilen aus** — und zwar immer für die *andere* Hand.
   *
   * Gezeigt hat die Hand mit dem Controller; geteilt wird die daneben. Das ist
   * keine Höflichkeit, sondern die einzige Aufteilung, die aufgeht: die
   * gemessene Hand liegt am Gegenstand und darf sich nicht rühren, also muss
   * die andere drücken — und die andere ist die mit dem Gerät darin.
   */
  private toggleShare(pointing: Handedness | null): void {
    const ctx = this.context;
    if (!ctx) return;
    if (this.sharing) {
      this.sharing = null;
      this.sharingFrom = null;
      this.refreshButtons();
      ctx.notify('Teilen beendet');
      return;
    }
    const from = pointing ?? 'right';
    const side: Handedness = from === 'left' ? 'right' : 'left';
    this.sharing = side;
    this.sharingFrom = from;
    this.shareAge = Number.POSITIVE_INFINITY;
    this.refreshButtons();
    const peers = ctx.net.peers.size;
    ctx.notify(
      `${handLabel(side)} wird geteilt · Trigger ${handLabel(from)} speichert` +
        (peers > 0 ? ` · ${peers} sehen zu` : ' · noch niemand verbunden'),
    );
  }

  /**
   * Der gemessene Konfig-Code an alle im Raum — als Chat-Zeile wie jeder
   * andere, damit er drüben mit einem Knopf *Kopieren* im Panel steht.
   */
  private sendPoseCode(): void {
    const ctx = this.context;
    if (!ctx || !this.poseCode) {
      this.context?.notify('Erst eine Hand messen — Handpose teilen drücken');
      return;
    }
    const side = this.sharing ?? this.gripState.side;
    const label = `${this.poseTitle(side, this.hoverTool?.toolId ?? null)} · Poseraum`;
    ctx.say(this.poseCode, { kind: 'code', note: label });
    const peers = ctx.net.peers.size;
    ctx.notify(
      peers > 0 ? `Gesendet an ${peers}: ${label}` : `${label}: im Chat — noch niemand verbunden`,
    );
  }

  /**
   * Ein Bild im Poseraum: was schwebt, was die Hand tut, und wer davon etwas
   * erfährt.
   */
  private updatePoseRoom(dt: number, ctx: WorldContext): void {
    const box = this.hover;
    if (!box) return;

    const floating = this.floatingTool();
    if (floating !== this.hoverTool) {
      this.hoverTool = floating;
      box.setOccupied(Boolean(floating));
      this.refreshButtons();
    }

    const side = this.sharing;
    if (!side) {
      this.showPose(null);
      return;
    }

    const measured = this.measurePose(ctx, side);
    // Dieselbe Bremse wie an den Handtafeln: eine Zahl, die sich mit jeder
    // Handbewegung ändert, malt sonst in jedem Bild eine Leinwand neu.
    this.poseAge += dt;
    if (this.poseAge >= TILT_REFRESH) {
      this.poseAge = 0;
      this.showPose(measured);
    }
    // **Der Trigger der anderen Hand hält fest.** Ein Knopf an der Wand ginge
    // auch — nur müsste man dafür die Hand vom Gegenstand nehmen, und genau
    // die soll liegen bleiben. Festgehalten wird nur eine **gesehene** Hand:
    // die eingestellte auf sich selbst zu schreiben ist keine Messung.
    const from = this.sharingFrom;
    const saved = measured.live && Boolean(from && ctx.input.get(from)?.trigger.justPressed);
    if (saved) this.savePose(ctx, side, measured);

    this.shareAge += dt;
    if (!saved && this.shareAge < SHARE_INTERVAL) return;
    this.shareAge = 0;
    ctx.net.emit(HAND_SHARE_CHANNEL, packHandShare({ ...measured.share, saved }));
  }

  /**
   * **Was die Hand gerade tut**, gemessen gegen das, was im Kasten schwebt.
   *
   * Die Kette ist dieselbe wie am Griffstand (`handGrip.ts`) und aus demselben
   * Grund: der Griff kürzt sich heraus. Gerechnet wird im Raum des Werkzeugs —
   * dort liegt die Hand, und dort ist die Antwort ablesbar, ohne dass jemand
   * einen Controller in der messenden Hand halten müsste.
   *
   * Hängt **nichts** im Kasten, bleibt die halbe Messung übrig, und sie ist die
   * nützlichere Hälfte: die **Finger**. Eine blanke Hand misst das Headset
   * ohnehin (`handGestures.foldCurls`), und bis hierher landete das nirgends —
   * die Grundhaltung behält damit ihre Lage und bekommt die Krümmung der
   * echten Hand.
   *
   * Und sieht die Brille die Hand gerade **nicht** — sie liegt hinter dem
   * Werkzeug, oder der Handschuh ist aus —, dann steht statt der Messung die
   * **eingestellte** Haltung da (`live: false`). Das ist genau das, was die
   * Brille in diesem Moment auch zeichnet, es geht weiter über die Leitung, und
   * damit sieht der Zuschauer im Browser das Werkzeug im Kasten auch dann. Nur
   * gespeichert wird es nicht: eine Haltung auf sich selbst zu schreiben ist
   * keine Messung.
   */
  private measurePose(ctx: WorldContext, side: Handedness): Measured {
    const hand = ctx.hands.drawnHandOf(side);
    const tool = this.hoverTool;
    const toolId = tool?.toolId ?? null;
    const base = toolId ? holdHandPose(side, toolId) : idleHandPose(side);
    const curls = hand ? ctx.hands.trackedCurlsOf(side) : null;
    // **Und jede Kugel einzeln.** Die Krümmungen bleiben daneben stehen — sie
    // sind das, was auf der Tafel steht und was in den Kurzcode geht —, aber
    // gespeichert wird, was die Brille wirklich sieht: je Knochen ein Winkel,
    // je Finger eine Fächerung (`core/handBones.ts`). Sieht sie die Hand
    // gerade nicht, fällt der Gelenkteil weg statt auf Null zu stehen; eine
    // Null wäre eine flach ausgestreckte Hand und keine fehlende Messung.
    const joints = hand ? ctx.hands.trackedBonesOf(side) : null;
    const pose: HandPose = { ...clonePose(base), curls: curls ?? clonePose(base).curls };
    if (joints) pose.joints = joints;
    else delete pose.joints;

    let at: PoseReadout = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 };
    if (tool && hand) {
      tool.updateWorldMatrix(true, false);
      hand.updateWorldMatrix(true, false);
      _matrix.copy(tool.matrixWorld).invert().multiply(hand.matrixWorld);
      // Der Maßstab des Handschuhs fällt hier heraus: gemessen wird, **wo**
      // die Hand liegt, und eine große Hand liegt nicht anders als eine
      // kleine.
      _matrix.decompose(_posePosition, _poseRotation, _scale);
      const ghost: Pose = {
        position: { x: _posePosition.x, y: _posePosition.y, z: _posePosition.z },
        rotation: {
          x: _poseRotation.x,
          y: _poseRotation.y,
          z: _poseRotation.z,
          w: _poseRotation.w,
        },
      };
      at = readPose(ghost as HoldPose);
      Object.assign(pose, readPose(handFromGhost(this.gripLocal(tool, side), ghost) as HoldPose));
    } else if (tool) {
      // Keine Hand zu sehen: die eingestellte Haltung ans Werkzeug legen —
      // dieselbe Rechnung, die auch der Griffstand für seine Boxhand macht.
      at = readPose(ghostOnTool(this.gripLocal(tool, side), poseOfHand(pose)) as HoldPose);
    }

    // Der Kurzcode wird **hier** gebaut und nicht aus dem Speicher geholt: was
    // auf der Tafel steht, soll die Haltung sein, die man gerade sieht, und
    // nicht die, die zuletzt gespeichert wurde.
    const code = packShortGear({
      toolId: toolId ?? '',
      hand: side,
      grip: [pose.x, pose.y, pose.z, pose.pitch, pose.yaw, pose.roll],
      fingers: { curls: pose.curls, spread: pose.spread },
    });
    return {
      pose,
      toolId,
      live: hand !== null,
      share: {
        hand: side,
        toolId,
        at: readoutValues(at),
        curls: pose.curls,
        spread: pose.spread,
        joints: pose.joints ?? null,
        code,
        saved: false,
      },
    };
  }

  /** Die gemessene Haltung in den Speicher — dorthin, wo die Brille sie liest. */
  private savePose(ctx: WorldContext, side: Handedness, measured: Measured): void {
    const { pose, toolId } = measured;
    if (toolId) saveHoldHandPose(side, toolId, pose);
    else saveIdleHandPose(side, pose);
    ctx.hands.refreshPoses();
    this.placeGripHand();
    this.poseCode = measured.share.code;
    this.refreshButtons();
    const controller = this.sharingFrom ? ctx.input.get(this.sharingFrom) : null;
    controller?.pulse(0.6, 40);
    ctx.notify(`Gespeichert: ${this.poseTitle(side, toolId)} · ${measured.share.code}`);
  }

  /**
   * Die Tafel im Poseraum — höchstens ein paar Mal je Sekunde, wie jede andere
   * Tafel hier: eine Zahl, die sich mit jeder Handbewegung ändert, malt sonst
   * in jedem Bild eine Leinwand neu.
   */
  private showPose(measured: Measured | null): void {
    const board = this.poseBoard;
    if (!board) return;
    if (!measured) {
      const title = 'Noch nichts gemessen';
      const body = 'Handpose teilen drücken — gemessen wird die andere Hand';
      const line = `${title}|${body}`;
      if (line === this.poseLine) return;
      this.poseLine = line;
      board.setText(title, body, 0x6f7d99);
      return;
    }
    const { pose, toolId, share, live } = measured;
    // **Gesehen oder eingestellt** — das ist der Unterschied, auf den es hier
    // ankommt, und deshalb steht er im Titel und nicht in einer Fußnote: die
    // Zahlen sehen in beiden Fällen gleich aus.
    const title = live
      ? this.poseTitle(share.hand, toolId)
      : `${this.poseTitle(share.hand, toolId)} — eingestellt`;
    const body = live
      ? `${formatHandPose(pose)}\n${share.code}`
      : trackedGlove()
        ? 'Keine Hand zu sehen — Hand ins Blickfeld halten'
        : 'Keine Hand zu sehen — Handschuh einschalten: blanke Hände sind sonst nur Gelenkkugeln';
    const line = `${title}|${body}`;
    if (line === this.poseLine) return;
    this.poseLine = line;
    if (live) this.poseCode = share.code;
    board.setText(title, body, live ? (toolId ? 0x5ee0a0 : 0x9d7bff) : 0x6f7d99);
    // Der Knopf *Pose senden* trägt den Code als Beschriftung — er gehört zu
    // dem, was gerade auf der Tafel steht, und nicht zu dem von vorhin.
    this.refreshButtons();
  }

  /**
   * Der Kreis auf dem Boden am ersten Stand.
   *
   * Ein Schritt hinein macht die Welt durchsichtig und die **virtuelle Hand
   * unsichtbar**; ein Schritt heraus nimmt beides zurück. Das ist die einzige
   * Stelle im Spiel, an der ein Schritt etwas schaltet, und sie hat einen
   * Grund: genau hier hat man beide Hände voll — eine hält das Werkzeug, die
   * andere soll daneben liegen —, und beide Hände voll heißt, dass niemand
   * einen Knopf drückt.
   *
   * Unsichtbar wird die Hand, weil die echte daneben liegen soll. In einer
   * AR-Sitzung sieht man sie dann wirklich, und der Vergleich, um den es hier
   * geht, ist kein Vergleich mehr, sondern ein Blick.
   *
   * Ein von Hand eingeschaltetes AR bleibt an, wenn man den Kreis verlässt: der
   * Kreis nimmt nur zurück, was er selbst angeschaltet hat.
   */
  private updateZone(ctx: WorldContext): void {
    const range = this.range;
    if (!range) return;
    ctx.rig.getHeadMatrix(_matrix);
    _position.setFromMatrixPosition(_matrix);
    const inside = range.zoneDistance(_position) <= ZONE_RADIUS;
    if (inside === this.inZone) return;
    this.inZone = inside;
    range.setZoneActive(inside);
    ctx.hands.hidden = inside;
    if (inside && !this.seeThrough.active) {
      this.zoneAr = true;
      this.setSeeThrough(true);
    } else if (!inside && this.zoneAr) {
      this.zoneAr = false;
      this.setSeeThrough(false);
    }
    this.refreshButtons();
    ctx.notify(
      inside
        ? 'Im Kreis: Welt durchsichtig, virtuelle Hand aus — die echte ans Werkzeug legen'
        : 'Aus dem Kreis heraus — Hand wieder da',
    );
  }

  /** Die Knöpfe an der rechten Wand des Gangs. */
  private rangeRows(): Array<{
    refresh: (button: WallButton) => void;
    run: (hand: Handedness | null) => void;
  }> {
    return [
      {
        refresh: (button) => {
          const on = this.seeThrough.active;
          this.label(
            button,
            on ? 'AR: an' : 'AR: aus',
            on ? 'Wände sind durchsichtig' : 'Wände wegblenden',
            on ? GRAB_GLOW : 0x4aa8ff,
          );
        },
        run: () => this.toggleSeeThrough(),
      },
      {
        refresh: (button) => {
          const busy = this.fine !== null;
          this.label(
            button,
            busy ? 'Feinjustiert … Trigger legt fest' : 'Feinjustieren',
            busy
              ? `Andere Hand bewegt · ${Math.round(1 / FINE_FACTOR)}:1 · A bricht ab`
              : 'Aktuelle Haltung laden und nachziehen',
            busy ? GRAB_GLOW : 0xffc857,
          );
        },
        run: (hand) => this.beginFine(hand),
      },
      {
        refresh: (button) => {
          this.label(
            button,
            this.mounted ? `Zurück: ${this.mounted.tool.label}` : 'Halter ist leer',
            this.mounted ? 'Unverändert zurück in die Hand' : 'Ein Werkzeug hineinhalten',
            this.mounted ? 0xffc857 : 0x6f7d99,
          );
        },
        run: () => this.releaseMount(false),
      },
      {
        refresh: (button) => {
          const busy = this.handDrag !== null;
          this.label(
            button,
            busy ? 'Boxhand hängt an der Hand' : `Griffhand: ${handLabel(this.gripState.side)}`,
            busy
              ? 'Loslassen speichert · A bricht ab'
              : 'Welche der beiden am zweiten Stand umfasst',
            busy ? GRAB_GLOW : 0x9fe3ff,
          );
        },
        run: () => this.flipGripSide(),
      },
      {
        refresh: (button) => {
          this.label(
            button,
            `Kopie: ${this.toolLabel(this.gripState.tool)}`,
            'Werkzeug in die Hand nehmen und drücken',
            0x9fe3ff,
          );
        },
        run: (hand) => this.copyToGrip(hand),
      },
      {
        refresh: (button) => {
          this.label(
            button,
            'Griff zurücksetzen',
            `Faust um ${this.toolLabel(this.gripState.tool)} · ${handLabel(this.gripState.side)}`,
            0xffc857,
          );
        },
        run: () => this.resetGripPose(),
      },
      {
        refresh: (button) => {
          this.label(button, 'Halter zurücksetzen', formatRange(this.rangeState), 0xffc857);
        },
        run: () => {
          this.rangeDrag = null;
          this.showRange(clearRangeSettings());
          this.context?.notify('Justierstand zurückgesetzt');
        },
      },
      {
        refresh: (button) => {
          this.label(button, 'Griffstand zurücksetzen', formatGrip(this.gripState), 0xffc857);
        },
        run: () => {
          this.gripDrag = null;
          this.showGrip(clearGripSettings());
          this.context?.notify('Griffstand zurückgesetzt');
        },
      },
      {
        refresh: (button) => {
          const peers = this.context?.net.peers.size ?? 0;
          this.label(
            button,
            'Werkzeug senden',
            peers > 0
              ? `${this.toolLabel(this.gripState.tool)} an ${peers}`
              : 'In den eigenen Chat',
            peers > 0 ? 0x5ee0a0 : 0x9fe3ff,
          );
        },
        run: () => this.sendGear('tool'),
      },
      {
        refresh: (button) => {
          const peers = this.context?.net.peers.size ?? 0;
          this.label(
            button,
            'Alles senden',
            peers > 0 ? `Ganze Ausrüstung an ${peers}` : 'In den eigenen Chat',
            peers > 0 ? 0x5ee0a0 : 0x9fe3ff,
          );
        },
        run: () => this.sendGear('all'),
      },
    ];
  }

  // --- Einstellungen an die Mitspieler --------------------------------------

  /**
   * Den eigenen Konfig-Code an alle im Raum schicken.
   *
   * Der Sinn ist der Raum selbst: hier wird eingemessen, und was einer
   * eingemessen hat, wollen die anderen haben — bisher ging das nur über eine
   * Zeile, die jemand vorliest und ein anderer abtippt. Vierzig Zeichen in
   * einer Brille abzutippen ist kein Übertragungsweg, sondern eine Mutprobe.
   *
   * Verschickt wird der **Code** und nicht der Datensatz: dieselbe Zeile, die
   * auch auf der Tafel steht, mit derselben Prüfsumme davor. Was ankommt, ist
   * damit entweder gültig oder wird verworfen, und es gibt nur einen Weg
   * hinein statt zweier, die auseinanderlaufen können.
   *
   * Er geht als **Chat-Zeile**, und das ist der halbe Zweck: drüben steht er
   * damit im Panel — mit Uhrzeit, mit der Angabe, wofür er gilt, und mit einem
   * Knopf *Kopieren* daneben. Auch allein im Raum lohnt der Knopf deshalb: dann
   * legt er den Code in den eigenen Verlauf, wo man ihn abholen kann, statt in
   * eine Meldung, die nach vier Sekunden weg ist.
   *
   * @param what `'tool'` schickt genau das, was gerade eingemessen wird —
   *             kurz genug, dass es auch über eine dünne Leitung sofort da
   *             ist. `'all'` schickt die ganze Ausrüstung.
   */
  private sendGear(what: 'tool' | 'all'): void {
    const ctx = this.context;
    if (!ctx) return;

    const { side, tool } = this.gripState;
    const code = what === 'all' ? gearCode() : toolGearCode(tool, side);
    const label =
      what === 'all' ? 'Ganze Ausrüstung' : `${this.toolLabel(tool)} · ${handLabel(side)}`;
    // Der Code geht als **Chat-Zeile** hinaus und nicht über einen eigenen
    // Kanal: dann steht er drüben im Panel, mit einem Knopf *Kopieren* daneben
    // und einer Uhrzeit davor. Genau dafür wird er verschickt — jemand will ihn
    // aufschreiben, weiterschicken oder ins Werkzeug eintragen, und keine
    // Brille der Welt tippt ihn ab. Angewandt wird er beim Empfänger trotzdem,
    // siehe `receiveGear`.
    ctx.say(code, { kind: 'code', note: label });
    const peers = ctx.net.peers.size;
    ctx.notify(
      peers > 0
        ? `Gesendet an ${peers}: ${label} (${code.length} Zeichen)`
        : `${label}: ${code.length} Zeichen im Chat — noch niemand verbunden`,
    );
  }

  /**
   * Und die Gegenrichtung: ein Code kommt herein, wird gelesen und eingetragen.
   *
   * Geprüft wird er wie jeder andere auch — was über das Netz kommt, ist nicht
   * vertrauenswürdiger als etwas Abgetipptes, nur schneller.
   */
  private receiveGear(code: string, from: string): void {
    const ctx = this.context;
    if (!ctx) return;
    const config = parseGearCode(code);
    if (!config) {
      ctx.notify('Konfig-Code von einem Mitspieler war unlesbar');
      return;
    }
    const applied = applyGearConfig(config);
    this.applyStoredConfig();
    this.showGrip(gripSettings());
    const who = ctx.net.peers.get(from)?.name ?? 'Mitspieler';
    ctx.notify(`Von ${who}: ${applied}`);
  }

  /** Wie ein Werkzeug heißt — die Id nur, wenn es keines mehr gibt. */
  private toolLabel(id: string): string {
    return this.tool(id)?.label ?? id;
  }

  /** Die andere Hand am zweiten Stand. Die Boxhand kommt neu und gespiegelt. */
  private flipGripSide(): void {
    if (this.handDrag) {
      this.cancelHandDrag(true);
      return;
    }
    const next = saveGripSettings({ side: this.gripState.side === 'left' ? 'right' : 'left' });
    this.context?.notify(`Griffstand: ${handLabel(next.side)}`);
  }

  /**
   * Das Werkzeug aus der zeigenden Hand als Kopie auf den zweiten Stand.
   *
   * Es liegt normalerweise schon dort — der Halter legt es hin, sobald man
   * etwas einmisst —, aber nicht jeder kommt über den Halter: wer nur den
   * Griff nachziehen will, hat sein Werkzeug in der Hand und sonst nichts.
   */
  private copyToGrip(pointing: Handedness | null): void {
    const ctx = this.context;
    if (!ctx) return;
    const hand: Handedness = pointing ?? this.gripState.side;
    const tool = this.host?.heldTool(hand) ?? null;
    if (!tool) {
      ctx.notify('Erst ein Werkzeug in die Hand nehmen');
      return;
    }
    this.cancelHandDrag(true);
    const next = saveGripSettings({ tool: tool.toolId, side: hand });
    ctx.notify(`Griffstand: ${tool.label} · ${handLabel(next.side)}`);
  }

  /**
   * Die Handhaltung an diesem Werkzeug zurück auf **die Hand am Werkzeug**.
   *
   * Die naheliegende Antwort wäre die gebaute Faust — sechs Nullen. Nur ist
   * eine Handhaltung ein Versatz im **Griffraum**, und die Null darin ist der
   * Griffpunkt des Controllers, nicht das Werkzeug: setzt man auf Null zurück,
   * springt die Boxhand um den Versatz *und* um die 30° zwischen Faust und
   * Zeigestrahl vom Werkzeug weg und liegt sichtbar daneben. Genau das war die
   * Beschwerde, und es ist derselbe schiefe Nullpunkt, der die eingemessenen
   * Zahlen weit weg von 0,0,0 aussehen lässt.
   *
   * Der Nullpunkt, den man hier haben will, sitzt **am Werkzeug**: die Haltung,
   * bei der die Boxhand genau in der Kopie steht, also `Lage-im-Griff` selbst
   * (`ghostOnTool(local, local)` ist die Ruhe). Von dort aus justiert man nach
   * außen, statt sich erst wieder heranzutasten.
   */
  private resetGripPose(): void {
    const ctx = this.context;
    if (!ctx) return;
    this.cancelHandDrag(true);
    const { side, tool } = this.gripState;
    saveHoldHandPose(side, tool, this.gripHomePose(side));
    ctx.hands.refreshPoses();
    this.placeGripHand();
    this.refreshButtons();
    ctx.notify(`Griff zurückgesetzt: ${this.toolLabel(tool)} · ${handLabel(side)}`);
  }

  /** Die Welt durchsichtig oder wieder fest — der eine Weg dorthin. */
  private setSeeThrough(on: boolean): void {
    const ctx = this.context;
    if (!ctx) return;
    this.seeThrough.apply(on, ctx.scene, this.shellGroup, ctx.renderer);
    this.refreshButtons();
  }

  // --- die Tafel einer Hand -------------------------------------------------

  /**
   * **Was gedrückt ist, und wie das Gerät dabei liegt** — beides auf einer
   * Tafel unter dem Modell, und auf Knopfdruck eingefroren.
   *
   * Man sieht in der Brille, wie das Modell mitkippt; was man *nicht* sieht,
   * sind die Zahlen dahinter. Und nur Zahlen kann man weitersagen: „so halte
   * ich den Controller wirklich" ist als Satz wertlos und als
   * `P -74 · Y 12 · R -31` eine Messung, aus der eine Grundhaltung wird.
   *
   * Gelesen wird der **Griffraum** — der Raum, in dem jede Haltung, jeder
   * Halterzylinder und jede Faust dieses Spiels stehen — als Euler XYZ in
   * Grad, also genau in der Schreibweise einer `HandPose`. Was hier steht,
   * kann man ohne Umrechnung nebeneinanderlegen.
   *
   * Es waren einmal **zwei Tafeln** übereinander, eine für die Tasten und eine
   * für die Lage, jede 1,5 m breit an der vier Meter entfernten Wand. Zusammen
   * war das zu viel Fläche und trotzdem zu kleine Schrift: drei lange Zeilen
   * brachen um, und die letzte fiel weg. Jetzt ist es eine Tafel in Lesenähe
   * mit kurzen Zeilen (`inputPanel.ts`, `tiltOf`).
   *
   * **Greifen friert ein.** Der Stick bewegt in diesem Raum nichts, man steht
   * also ohnehin still; was fehlt, ist ein Weg, eine Zahl festzuhalten, ohne
   * sie im selben Moment durch das Hinsehen zu verändern. Ein Druck auf den
   * Griffknopf hält die Lage fest, ein zweiter gibt sie wieder frei — und dazu
   * stellt sich neben das Modell, was diese Lage bedeutet: die **Boxhand** in
   * der Faust um den **Handgriff des Geräts** (`CONTROLLER_HAND_POSE`,
   * `createControllerHandle`). Man liest die Zahl also nicht nur, man sieht
   * auch, was das Spiel daraus macht.
   *
   * **Während einer Aufnahme setzt derselbe Knopf eine Marke** und friert
   * nichts ein: dann ist der Griffknopf die Stoppuhr, und zwei Bedeutungen
   * zugleich hat er nicht.
   */
  private updateBoard(side: Handedness, state: ControllerState | null, line: string): void {
    const board = this.boards.get(side);
    const model = this.models.get(side);
    if (!board || !model) return;
    const live = state?.tracked ? tiltOf(state) : null;

    if (state && state.squeeze.justPressed) {
      if (this.recording) {
        const mark = this.recording.mark(side);
        state.pulse(0.6, 35);
        this.context?.notify(`Marke ${mark.index}: ${formatAccel(mark.value)}`);
        // Eine Marke ist der eine Moment, für den man den Knopf drückt: die
        // steht sofort da und wartet nicht auf die nächste Zeichenrunde.
        this.showRecording(true);
        // Getrackte Hände haben kein Gerät, dessen Lage man festhalten könnte.
      } else if (!state.isHand) {
        if (this.frozen.has(side)) {
          this.clearFreeze(side);
          state.pulse(0.5, 30);
        } else if (live) {
          this.setFreeze(side, state, live);
          state.pulse(0.5, 30);
        }
      }
    }

    const held = this.frozen.get(side);
    const pose = held ?? live ?? 'nicht getrackt';
    const text = `${line || 'nicht getrackt'}\n${pose}`;
    // Höchstens ein paar Mal je Sekunde: eine Zahl, die sich mit jedem Bild um
    // ein Grad ändert, ist keine Anzeige, sondern ein Flackern — und jedes
    // Neuzeichnen kostet eine Leinwand. Eine gedrückte **Taste** kommt dagegen
    // sofort: genau dafür ist dieser Raum da.
    const pressed = line !== model.lastLine;
    if (text === this.tiltLines.get(side)) return;
    if (!held && !pressed && (this.tiltAge.get(side) ?? 0) < TILT_REFRESH) return;
    this.tiltAge.set(side, 0);
    this.tiltLines.set(side, text);
    model.lastLine = line;
    board.setText(
      held ? `${handLabel(side)} · eingefroren` : handLabel(side),
      held ? `${text}\nGreifen gibt wieder frei` : text,
      held ? 0xffc857 : 0x9fe3ff,
    );
  }

  /** Die Lage festhalten — samt Boxhand und Zylinder darin. */
  private setFreeze(side: Handedness, state: ControllerState, line: string): void {
    const freeze = this.freezes.get(side);
    if (!freeze) return;
    this.clearFreeze(side);
    this.frozen.set(side, line);

    const anchor = state.grip.visible ? state.grip : state.targetRay;
    freeze.quaternion.copy(anchor.quaternion);
    freeze.add(createControllerHandle(side));
    // Und das Achsenkreuz dazu: eingefroren will man nicht nur die Zahl sehen,
    // sondern auch, um welche Achsen sie gemeint ist.
    freeze.add(createAxes(0.14));

    // Die Faust um genau diesen Zylinder, wie sie in `handPose.ts` steht —
    // und **gebaut** und nicht gespeichert: hier soll stehen, was das Spiel
    // aus der Lage macht, nicht, was jemand vorhin eingestellt hat.
    const pose = defaultHoldPose(side, side === 'left' ? 'controller-left' : 'controller-right');
    const hand = new GhostHand(side, pose, {
      look: 'bones',
      color: BOX_HAND_COLOR,
      opacity: 0.55,
    });
    const at = poseOfHand(pose);
    hand.position.set(at.position.x, at.position.y, at.position.z);
    hand.quaternion.set(at.rotation.x, at.rotation.y, at.rotation.z, at.rotation.w);
    freeze.add(hand);
    freeze.visible = true;
  }

  /** Und wieder auftauen: alles weg, was beim Einfrieren entstanden ist. */
  private clearFreeze(side: Handedness): void {
    this.frozen.delete(side);
    // Die Zeile gilt nicht mehr — ohne das bliebe die aufgetaute Tafel stehen,
    // weil der neue Text zufällig derselbe ist.
    this.tiltLines.delete(side);
    const freeze = this.freezes.get(side);
    if (!freeze) return;
    for (const child of [...freeze.children]) {
      if (child instanceof GhostHand) child.dispose();
      else disposeAxes(child);
    }
    freeze.visible = false;
  }

  /** Der AR-Knopf: die Welt durchsichtig, und den Himmel weg. */
  private toggleSeeThrough(): void {
    const ctx = this.context;
    if (!ctx) return;
    const on = !this.seeThrough.active;
    // Von Hand geschaltet gilt von Hand: der Kreis am Halter nimmt danach
    // nichts mehr zurück, was er nicht selbst angeschaltet hat.
    this.zoneAr = false;
    this.setSeeThrough(on);
    if (!on) {
      ctx.notify('AR aus');
      return;
    }
    ctx.notify(
      SeeThrough.passthrough(ctx.renderer)
        ? 'AR an — das Zimmer steht hinter der Welt'
        : 'AR an — diese Sitzung zeigt keine Kamera, die Welt ist nur durchsichtig',
    );
  }

  // --- ein Werkzeug im Halter -----------------------------------------------

  /**
   * Jede Frame: liegt etwas im Halter, und was macht die Hand damit?
   *
   * Eingerastet wird, sobald ein gehaltenes Werkzeug den Halter berührt — kein
   * Knopf, kein Loslassen. Man legt etwas ab, indem man es hinlegt; alles
   * andere wäre eine Regel, die man sich merken muss.
   */
  private updateRange(ctx: WorldContext): void {
    const range = this.range;
    if (!range) return;

    const mounted = this.mounted;
    if (mounted) {
      // Während der Feinjustage gehören die Knöpfe dem Geist.
      if (this.fine) return;
      const controller = ctx.input.get(mounted.hand);
      if (!controller?.tracked) return;
      if (controller.primary.justPressed) {
        this.releaseMount(true);
        return;
      }
      // Erst die Hand aufmachen, dann bestätigen — siehe `Mounted.armed`.
      if (!mounted.armed) {
        if (!controller.trigger.pressed && !controller.squeeze.pressed) mounted.armed = true;
        return;
      }
      // Greifen *oder* Trigger: mit Controller liegt der Daumen am einen, der
      // Zeigefinger am anderen, und welcher davon gerade frei ist, hängt
      // daran, wie man das Ding hält — also zählen beide.
      if (controller.trigger.justPressed || controller.squeeze.justPressed) {
        this.measureMount(ctx, controller, mounted);
      }
      return;
    }

    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand || !controller.tracked) continue;
      const tool = this.host?.heldTool(hand) ?? null;
      if (!tool || tool.parked) continue;
      tool.updateWorldMatrix(true, false);
      tool.getWorldPosition(_hand);
      if (range.mountDistance(_hand) > MOUNT_REACH) {
        if (this.mountBlocked === tool) this.mountBlocked = null;
        continue;
      }
      // Das eben herausgekommene Werkzeug rastet erst wieder ein, wenn es
      // einmal draußen war.
      if (this.mountBlocked === tool) continue;
      this.mountTool(tool, hand);
      return;
    }
  }

  /**
   * Die Griffe am Ausleger, das Waffenregal — und was gerade leuchtet.
   *
   * Ein Stand, den man verschieben kann, muss sich auch **ungewollt**
   * verschieben lassen können, sonst greift ihn niemand an. Deshalb hängen die
   * beiden Griffe einen knappen Meter zur Seite: nichts, was die Hand am
   * Werkzeug streift, und trotzdem ohne einen Schritt erreichbar. Gerechnet
   * wird gegen den Stand beim Zupacken und nicht gegen das letzte Bild —
   * dieselbe Regel wie am zweiten Stand, und aus demselben Grund.
   */
  private updateRangeGrips(ctx: WorldContext): void {
    const range = this.range;
    if (!range) return;
    // Während der Feinjustage zieht eine Hand am Geist, und die drückt dabei
    // Greifen — die Griffe des Standes haben in dieser Minute Pause, sonst
    // verschiebt sich unter der Messung der Bezugspunkt.
    if (this.fine) {
      range.setGlow(null);
      return;
    }

    const drag = this.rangeDrag;
    if (drag) {
      const controller = ctx.input.get(drag.hand);
      if (!controller?.tracked || !controller.squeeze.pressed) {
        this.rangeDrag = null;
        // Erst beim Loslassen in den Speicher — und dann einmal richtig.
        this.showRange(saveRangeSettings(this.rangeState));
        ctx.notify(formatRange(this.rangeState));
        return;
      }
      handPosition(controller, _hand);
      this.showRange(
        clampRange(
          drag.grip === 'height'
            ? { ...drag.before, height: drag.before.height + (_hand.y - drag.start.y) * 100 }
            : {
                ...drag.before,
                x: drag.before.x + (_hand.x - drag.start.x) * 100,
                z: drag.before.z + (_hand.z - drag.start.z) * 100,
              },
        ),
      );
      range.setGlow(drag.grip);
      return;
    }

    let glow: RangeGrip | 'mount' | null = null;
    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand || !controller.tracked) continue;
      handPosition(controller, _hand);

      // Ein Werkzeug in der Hand sucht die Aufnahme, eine leere Hand die
      // Griffe und das Regal — dieselbe Hand kann nicht beides wollen.
      if (this.host?.heldTool(hand)) {
        if (!this.mounted && range.mountDistance(_hand) <= MOUNT_REACH) glow ??= 'mount';
        continue;
      }

      for (const grip of ['height', 'place'] as const) {
        if (range.gripDistance(grip, _hand) > HANDLE_REACH) continue;
        glow ??= grip;
        if (!controller.squeeze.justPressed) break;
        this.rangeDrag = {
          hand,
          grip,
          start: _hand.clone(),
          before: { ...this.rangeState },
        };
        controller.pulse(0.4, 25);
        ctx.notify(
          grip === 'height'
            ? 'Höhe: Hand heben und senken, dann loslassen'
            : 'Ort: Hand bewegen, dann loslassen',
        );
        break;
      }
    }
    range.setGlow(glow);
  }

  // --- der zweite Stand: die Boxhand am Werkzeug -----------------------------

  /**
   * Jede Frame am Griffstand: die beiden Griffe am Ausleger — und die Boxhand.
   *
   * Sie ist das Einzige hier, was mitkommt. Die Kopie des Werkzeugs bleibt, wo
   * sie ist: sie *ist* der feste Punkt, und ein fester Punkt, den man
   * versehentlich mitnimmt, ist keiner. Angefasst wird mit **Greifen**,
   * losgelassen mit dem Loslassen — dieselbe Bedienung wie an jedem Griff in
   * diesem Raum —, und erst das Loslassen schreibt in den Speicher.
   */
  private updateGripStand(ctx: WorldContext): void {
    const stand = this.grip;
    if (!stand) return;
    // Während der Feinjustage am ersten Stand zieht eine Hand an einem Geist
    // und hält dabei Greifen — dieser Stand hat in dieser Minute Pause, sonst
    // nimmt dieselbe Geste zwei Dinge auf einmal.
    if (this.fine && !this.handDrag) {
      stand.setGlow(null);
      return;
    }

    const held = this.handDrag;
    if (held) {
      const controller = ctx.input.get(held.hand);
      if (!controller?.tracked) {
        this.cancelHandDrag(true);
        ctx.notify('Hand weg — abgebrochen');
        return;
      }
      // `A` bricht ab und legt die Boxhand zurück, wo sie war.
      if (controller.primary.justPressed) {
        this.cancelHandDrag(true);
        ctx.notify('Abgebrochen');
        return;
      }
      // Live auf die Tafel, aber noch nicht in den Speicher: bis zum
      // Loslassen kostet ein Abbruch nichts.
      const measured = this.measureGripHand();
      if (measured) {
        this.readout = readoutOfHand(measured);
        this.readoutFor = `${this.poseTitle(held.side, held.toolId)} · Griff`;
        this.showValues();
      }
      if (!controller.squeeze.pressed) this.finishHandDrag(ctx, controller);
      stand.setGlow('hand');
      return;
    }

    const drag = this.gripDrag;
    if (drag) {
      const controller = ctx.input.get(drag.hand);
      if (!controller?.tracked || !controller.squeeze.pressed) {
        this.gripDrag = null;
        // Erst beim Loslassen in den Speicher — und dann einmal richtig.
        this.showGrip(saveGripSettings(this.gripState));
        ctx.notify(formatGrip(this.gripState));
        return;
      }
      handPosition(controller, _hand);
      this.showGrip(
        clampGrip(
          drag.grip === 'height'
            ? { ...drag.before, height: drag.before.height + (_hand.y - drag.start.y) * 100 }
            : {
                ...drag.before,
                x: drag.before.x + (_hand.x - drag.start.x) * 100,
                z: drag.before.z + (_hand.z - drag.start.z) * 100,
              },
        ),
      );
      stand.setGlow(drag.grip);
      return;
    }

    let glow: string | null = null;
    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand || !controller.tracked) continue;
      // Eine Hand mit Werkzeug hat hier nichts zu greifen: sie ist auf dem Weg
      // in den Halter nebenan.
      if (this.host?.heldTool(hand)) continue;
      handPosition(controller, _hand);

      if (stand.handDistance(_hand) <= HAND_REACH) {
        glow ??= 'hand';
        if (!controller.squeeze.justPressed) continue;
        this.beginHandDrag(ctx, controller, hand);
        // Und Schluss für diese Frame: liegen beide Hände daran, nähme sonst
        // die zweite sie der ersten in derselben Frame wieder weg.
        stand.setGlow('hand');
        return;
      }

      for (const key of ['height', 'place'] as const) {
        if (stand.gripDistance(key, _hand) > HANDLE_REACH) continue;
        glow ??= key;
        if (!controller.squeeze.justPressed) break;
        this.gripDrag = {
          hand,
          grip: key,
          start: _hand.clone(),
          before: { ...this.gripState },
        };
        controller.pulse(0.4, 25);
        ctx.notify(
          key === 'height'
            ? 'Höhe: Hand heben und senken, dann loslassen'
            : 'Ort: Hand bewegen, dann loslassen',
        );
        break;
      }
    }
    stand.setGlow(glow);
  }

  /** Die Boxhand wandert an die Hand — 1:1, per Umhängen statt per Rechnung. */
  private beginHandDrag(ctx: WorldContext, controller: ControllerState, hand: Handedness): void {
    const stand = this.grip;
    const ghost = stand?.handObject;
    if (!stand || !ghost) return;
    const { side, tool } = this.gripState;
    handAnchor(controller).attach(ghost);
    this.handDrag = {
      hand,
      side,
      toolId: tool,
      before: ctx.hands.editablePose(side, tool),
    };
    controller.pulse(0.4, 25);
    this.refreshButtons();
    ctx.notify(`${this.poseTitle(side, tool)} · hinlegen, wie sie greifen soll`);
  }

  /**
   * Loslassen schreibt: wo die Boxhand am Werkzeug hängt, *ist* die Haltung.
   *
   * Nur die sechs Zahlen — Krümmung und Spreizung sind keine Frage von „wo
   * liegt die Hand" und bleiben, wie sie eingestellt sind.
   */
  private finishHandDrag(ctx: WorldContext, controller: ControllerState): void {
    const held = this.handDrag;
    if (!held) return;
    this.handDrag = null;
    this.grip?.reclaim();
    const pose = this.measureGripHand();
    if (!pose) {
      this.placeGripHand();
      return;
    }
    saveHoldHandPose(held.side, held.toolId, pose);
    ctx.hands.refreshPoses();
    this.readout = readoutOfHand(pose);
    this.readoutFor = `${this.poseTitle(held.side, held.toolId)} · Griff`;
    this.code = toolGearCode(held.toolId, held.side);
    controller.pulse(0.6, 40);
    this.refreshButtons();
    ctx.notify(`${this.readoutFor}: ${formatHandPose(pose)}`);
  }

  /** Nimmt die Boxhand zurück ans Werkzeug; `restore` verwirft die Bewegung. */
  private cancelHandDrag(restore: boolean): void {
    const held = this.handDrag;
    if (!held) return;
    this.handDrag = null;
    this.grip?.reclaim();
    if (restore) {
      // Die Tafel hat die ganze Zeit den Vorschauwert gezeigt, und der gilt
      // jetzt nicht mehr.
      this.readout = readoutOfHand(held.before);
      this.readoutFor = this.poseTitle(held.side, held.toolId);
    }
    this.placeGripHand();
    this.refreshButtons();
  }

  /**
   * Was gerade zwischen Kopie und Boxhand liegt, als Handhaltung.
   *
   * Gerechnet wird im Raum der Kopie: deren Weltmatrix rückwärts auf die der
   * Boxhand gelegt, und das Ergebnis durch die Lage des Werkzeugs im Griff
   * zurück in den Griffraum (`handGrip.ts`). Der Stand kommt darin nicht vor —
   * er darf also mitten in einer Messung verschoben werden.
   */
  private measureGripHand(): HandPose | null {
    const ctx = this.context;
    const stand = this.grip;
    const tool = stand?.tool;
    const ghost = stand?.handObject;
    if (!ctx || !stand || !tool || !ghost) return null;
    const side = this.handDrag?.side ?? this.gripState.side;
    const toolId = this.handDrag?.toolId ?? this.gripState.tool;

    tool.updateWorldMatrix(true, false);
    ghost.updateWorldMatrix(true, false);
    _matrix.copy(_inverseMatrix.copy(tool.matrixWorld).invert()).multiply(ghost.matrixWorld);
    _matrix.decompose(_position, _rotation, _scale);

    const measured = handFromGhost(this.gripLocal(tool, side), {
      position: _position,
      rotation: _rotation,
    });
    const readout = readPose(measured as HoldPose);
    return {
      ...clonePose(ctx.hands.editablePose(side, toolId)),
      x: readout.x,
      y: readout.y,
      z: readout.z,
      pitch: readout.pitch,
      yaw: readout.yaw,
      roll: readout.roll,
    };
  }

  /**
   * Legt ein Werkzeug in den Halter: aus der Hand heraus, in die Aufnahme
   * hinein — und die zeigt auf die Scheibe.
   */
  private mountTool(tool: Tool, hand: Handedness, armed = true): Mounted | null {
    const ctx = this.context;
    const range = this.range;
    if (!ctx || !range || !this.host?.parkTool(tool)) {
      this.context?.notify('Werkzeug lässt sich nicht ablegen');
      return null;
    }
    // Es hängt ab jetzt **in** der Aufnahme und nicht bloß an derselben Stelle
    // wie sie: `parkTool` lässt es an der Welt stehen, hier wird es ein Kind
    // des Halters. Damit kann es gar nicht mehr von ihm wegdriften — auch
    // nicht, wenn der Stand gleich am Griff verschoben wird.
    range.mount.add(tool);
    tool.position.set(0, 0, 0);
    tool.quaternion.identity();
    tool.scale.set(1, 1, 1);
    // Und in der Gestalt, die es **in dieser Hand** hat: ein Werkzeug, das sein
    // Modell im Griff verschiebt (Drohne, Hammer), stünde sonst im Halter
    // anders da als in der Faust — und gemessen würde dann die Verschiebung
    // mit. Wer es zweihändig hereintrug, hätte es sogar mittig liegen sehen.
    tool.showHeldBy(hand);
    tool.updateWorldMatrix(true, false);
    // Und der Stand selbst geht aus dem Weg: was man jetzt ansieht, ist die
    // Hand am Werkzeug.
    range.setOccupied(true);

    const mounted: Mounted = {
      tool,
      hand,
      before: heldPose(tool),
      armed,
    };
    this.mounted = mounted;
    this.mountBlocked = null;
    this.rangeDrag = null;
    // Der zweite Stand arbeitet immer an dem, was man gerade einmisst — sonst
    // müsste man dasselbe Werkzeug zweimal auswählen, einmal je Stand.
    if (this.gripState.tool !== tool.toolId || this.gripState.side !== hand) {
      this.cancelHandDrag(true);
      saveGripSettings({ tool: tool.toolId, side: hand });
    }
    ctx.input.get(hand)?.pulse(0.4, 25);
    this.refreshButtons();
    ctx.notify(`${tool.label} zeigt auf die Scheibe · Hand daran, dann Greifen oder Trigger`);
    return mounted;
  }

  /**
   * Der Trigger schließt ab: was zwischen Griff und Werkzeug liegt, *ist* die
   * Haltung — dieselbe Rechnung wie überall, nur hängt das Werkzeug hier
   * nicht irgendwo, sondern auf der Ziellinie.
   */
  private measureMount(ctx: WorldContext, controller: ControllerState, mounted: Mounted): void {
    const { tool, hand } = mounted;
    const anchor = handAnchor(controller);
    anchor.updateWorldMatrix(true, false);
    anchor.matrixWorld.decompose(_position, _rotation, _scale);
    tool.updateWorldMatrix(true, false);
    tool.matrixWorld.decompose(_toolPosition, _toolRotation, _scale);
    aimQuaternion(aims(tool) ? controller : null, _aim);

    this.applyHold(
      tool,
      holdPoseFrom({ position: _position, rotation: _rotation }, _aim, {
        position: _toolPosition,
        rotation: _toolRotation,
      }),
      `${tool.label} · ${handLabel(hand)}`,
      hand,
    );

    this.mounted = null;
    this.mountBlocked = tool;
    this.range?.setOccupied(false);
    this.host?.unparkTool(tool);
    controller.pulse(0.6, 40);
    this.refreshButtons();
    this.showValues();
    ctx.notify(`${tool.label}: ${formatPose(this.readout!)}`);
  }

  /**
   * Eine gemessene Haltung ans Werkzeug, in den Speicher und auf die Tafel —
   * der eine Weg dorthin, damit Messung und Feinjustage nicht auseinanderlaufen.
   */
  private applyHold(tool: Tool, pose: HoldPose, caption: string, hand: Handedness): void {
    tool.holdPosition.set(pose.position.x, pose.position.y, pose.position.z);
    tool.holdRotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w);
    // **Und an welcher Hand gemessen wurde.** Die Zahlen gelten für *diese*
    // Hand; die andere rechnet das Werkzeug daraus (`Tool.holdIn`). Ohne diese
    // Zeile läse eine links gemessene Haltung gleich im nächsten Bild als
    // rechte, und das Werkzeug spränge aus der Hand, in der es gerade lag.
    tool.holdHand = hand;
    if (tool instanceof HandTool) {
      // Die Boxhand *ist* die Hand: was an ihr gemessen wird, gehört in die
      // Grundhaltung dieser Hand und nicht in den Werkzeug-Speicher. Eine
      // zweite Kopie derselben Zahlen wäre nur eine, die irgendwann abweicht.
      tool.storeMeasured(hand);
      this.context?.hands.refreshPoses();
    } else {
      savePose(tool.toolId, pose, hand);
    }
    // Der zweite Stand hängt an dieser Zahl: die Boxhand steht relativ zur
    // Lage des Werkzeugs im Griff, und die hat sich gerade geändert.
    this.placeGripHand();
    this.readout = readPose(pose);
    this.readoutFor = caption;
    this.code = toolGearCode(tool.toolId, hand);
  }

  /**
   * Das Werkzeug aus dem Halter zurück in seine Hand.
   *
   * @param restore legt die Haltung von vor dem Ablegen zurück — das ist der
   *                Abbruch mit `A`. Der Knopf an der Wand nimmt das Werkzeug
   *                nur heraus und lässt alles Bestätigte stehen.
   */
  private releaseMount(restore: boolean, quiet = false): void {
    const mounted = this.mounted;
    if (!mounted) {
      if (!quiet) this.context?.notify('Im Halter liegt nichts');
      return;
    }
    this.cancelFine(false);
    if (restore) {
      mounted.tool.holdPosition.copy(mounted.before.position);
      mounted.tool.holdRotation.copy(mounted.before.rotation);
      mounted.tool.holdHand = mounted.before.hand;
    }
    this.mounted = null;
    this.mountBlocked = mounted.tool;
    this.range?.setOccupied(false);
    this.host?.unparkTool(mounted.tool);
    this.refreshButtons();
    if (!quiet) this.context?.notify(`${mounted.tool.label} zurück in der Hand`);
  }

  // --- die Feinjustage ------------------------------------------------------

  /**
   * Lädt die Haltung, die gerade gilt, und stellt sie als Geisterhand ans
   * Werkzeug.
   *
   * Gezogen wird mit der Hand, die den Knopf **nicht** gedrückt hat — sonst
   * müsste man den Strahl erst wieder von der Wand nehmen. Liegt noch nichts
   * im Halter, wandert das Werkzeug der drückenden Hand hinein: der Knopf
   * soll tun, was er verspricht, und nicht erklären, was vorher zu tun wäre.
   */
  private beginFine(pointing: Handedness | null): void {
    const ctx = this.context;
    if (!ctx) return;
    if (this.fine) {
      this.cancelFine(true);
      ctx.notify('Abgebrochen');
      return;
    }

    let mounted = this.mounted;
    if (!mounted) {
      const owner: Handedness = pointing ?? 'right';
      const tool = this.host?.heldTool(owner) ?? null;
      if (!tool) {
        ctx.notify('Erst ein Werkzeug in den Halter legen');
        return;
      }
      mounted = this.mountTool(tool, owner);
      if (!mounted) return;
    }

    const hand: Handedness = pointing === 'left' ? 'right' : 'left';
    const driver = ctx.input.get(hand);
    if (!driver?.tracked) {
      ctx.notify(`${handLabel(hand)} nicht getrackt`);
      return;
    }

    const { tool } = mounted;
    const owner = ctx.input.get(mounted.hand);
    aimQuaternion(aims(tool) ? owner : null, _aim);
    tool.updateWorldMatrix(true, false);
    tool.matrixWorld.decompose(_toolPosition, _toolRotation, _scale);
    // Die Haltung **der Hand, der das Werkzeug gehört**: gemessen ist sie an
    // einer, die andere rechnet das Werkzeug daraus (`Tool.holdIn`). Und genau
    // in deren Rahmen schreibt die Feinjustage sie gleich auch wieder zurück
    // (`applyHold` mit `fine.owner`) — läse der Hinweg die rohe Haltung, spränge
    // der Geist an einer links eingemessenen Uhr um die Spiegelung daneben.
    tool.holdIn(mounted.hand, _holdPosition, _holdRotation);
    const hold: HoldPose = { position: _holdPosition, rotation: _holdRotation };
    // Der Rückweg: wo läge die Hand, wenn sie das Werkzeug so hielte, wie es
    // gerade hängt? Genau dort steht der Geist.
    const grip = gripForHold({ position: _toolPosition, rotation: _toolRotation }, _aim, hold);

    const pose = ctx.hands.editablePose(mounted.hand, tool.toolId);
    const ghost = new GhostHand(mounted.hand, pose, { color: 0xffc857 });
    this.root.add(ghost);

    handAnchor(driver).updateWorldMatrix(true, false);
    handAnchor(driver).matrixWorld.decompose(_position, _rotation, _scale);

    this.fine = {
      hand,
      owner: mounted.hand,
      ghost,
      grip: {
        position: { x: grip.position.x, y: grip.position.y, z: grip.position.z },
        rotation: { ...grip.rotation },
      },
      from: {
        position: _position.clone(),
        rotation: _rotation.clone(),
      },
      aim: _aim.clone(),
      pose,
      before: heldPose(tool),
    };
    this.placeGhost(this.fine, grip);
    driver.pulse(0.4, 25);
    this.refreshButtons();
    ctx.notify(
      `${tool.label} · ${handLabel(hand)} zieht, ${Math.round(1 / FINE_FACTOR)}:1 · Trigger legt fest`,
    );
  }

  /**
   * Jede Frame der Feinjustage: der Geist übernimmt ein Zehntel dessen, was
   * die Hand seit dem Zupacken getan hat, und was zwischen ihm und dem
   * Werkzeug liegt, steht sofort auf der Tafel.
   */
  private updateFine(ctx: WorldContext): void {
    const fine = this.fine;
    const mounted = this.mounted;
    if (!fine || !mounted) return;

    const controller = ctx.input.get(fine.hand);
    if (!controller?.tracked) {
      this.cancelFine(true);
      ctx.notify('Hand weg — abgebrochen');
      return;
    }
    if (controller.primary.justPressed) {
      this.cancelFine(true);
      ctx.notify('Abgebrochen');
      return;
    }

    const anchor = handAnchor(controller);
    anchor.updateWorldMatrix(true, false);
    anchor.matrixWorld.decompose(_position, _rotation, _scale);
    const grip = nudgeGrip(fine.grip, fine.from, { position: _position, rotation: _rotation });
    this.placeGhost(fine, grip);

    const { tool } = mounted;
    tool.updateWorldMatrix(true, false);
    tool.matrixWorld.decompose(_toolPosition, _toolRotation, _scale);
    const pose = holdPoseFrom(grip, fine.aim, {
      position: _toolPosition,
      rotation: _toolRotation,
    });
    // Live auf die Tafel, aber noch nicht in den Speicher: bis zum Trigger
    // kostet ein Abbruch nichts.
    this.readout = readPose(pose);
    this.readoutFor = `${tool.label} · ${handLabel(fine.owner)} · fein`;
    this.showValues();

    if (!controller.trigger.justPressed) return;
    this.applyHold(tool, pose, `${tool.label} · ${handLabel(fine.owner)}`, fine.owner);
    // Was bestätigt ist, ist bestätigt: ab hier legt auch ein Abbruch nicht
    // mehr die Haltung von vor der Feinjustage zurück, sondern diese.
    mounted.before = heldPose(tool);
    this.cancelFine(false);
    controller.pulse(0.6, 40);
    this.refreshButtons();
    this.showValues();
    ctx.notify(`${tool.label}: ${formatPose(this.readout!)}`);
  }

  /**
   * Der Geist an seinen Platz: er hängt am Griff, plus dem Versatz, mit dem
   * die Hand an diesem Werkzeug gezeichnet wird. Ohne den stünde er einen
   * Zentimeter neben der Hand, die man gleich damit vergleicht.
   */
  private placeGhost(fine: Fine, grip: Grip): void {
    _gripPosition.set(grip.position.x, grip.position.y, grip.position.z);
    _gripRotation.set(grip.rotation.x, grip.rotation.y, grip.rotation.z, grip.rotation.w);
    _posePosition.set(fine.pose.x / 100, fine.pose.y / 100, fine.pose.z / 100);
    _poseRotation.setFromEuler(
      _euler.set(fine.pose.pitch / DEG, fine.pose.yaw / DEG, fine.pose.roll / DEG, 'XYZ'),
    );
    fine.ghost.position.copy(_posePosition).applyQuaternion(_gripRotation).add(_gripPosition);
    fine.ghost.quaternion.copy(_gripRotation).multiply(_poseRotation);
    // Der Geist hängt an der Welt, nicht am Raum — steht der Raum irgendwo
    // anders, muss die Weltlage zurückgerechnet werden.
    this.root.updateWorldMatrix(true, false);
    _matrix
      .compose(fine.ghost.position, fine.ghost.quaternion, _scale.set(1, 1, 1))
      .premultiply(_inverseMatrix.copy(this.root.matrixWorld).invert());
    _matrix.decompose(fine.ghost.position, fine.ghost.quaternion, _scale);
  }

  /** Nimmt den Geist weg; `restore` legt die Haltung von vorher zurück. */
  private cancelFine(restore: boolean): void {
    const fine = this.fine;
    if (!fine) return;
    this.fine = null;
    fine.ghost.dispose();
    const tool = this.mounted?.tool;
    if (restore && tool) {
      tool.holdPosition.copy(fine.before.position);
      tool.holdRotation.copy(fine.before.rotation);
      tool.holdHand = fine.before.hand;
      // Auch die Tafel zurück: sie hat die ganze Feinjustage über den
      // Vorschauwert gezeigt, und der gilt jetzt nicht mehr.
      this.readout = readPose(fine.before);
      this.readoutFor = `${tool.label} · ${handLabel(fine.owner)}`;
    }
    this.refreshButtons();
  }

  // --- die Vibrationsbank ---------------------------------------------------

  private buildBench(room: THREE.Group): void {
    const { half, thickness } = ROOM;
    const bench = new VibeBench();
    bench.position.set(-half + 0.75, 0, -0.3);
    bench.rotation.y = Math.PI / 2;
    room.add(bench);
    this.bench = bench;

    const sign = new TextPlane({
      width: 1.6,
      height: 0.42,
      title: 'Vibration',
      body: 'Den türkisen Griff festhalten — solange du hältst, läuft das gewählte Muster',
      accent: 0xffc857,
      align: 'center',
    });
    sign.position.set(-half + thickness / 2 + 0.02, 2.3, -0.3);
    sign.rotation.y = Math.PI / 2;
    room.add(sign);

    const button = this.wallButton(room, 1.1, 0.34, () => {
      this.pattern = saveHapticPattern(nextPatternId(this.pattern.id));
      this.refreshButtons();
      this.context?.notify(`Vibration: ${this.pattern.label}`);
    });
    button.plane.position.set(-half + thickness / 2 + 0.02, 1.62, -0.3);
    button.plane.rotation.y = Math.PI / 2;
    button.refresh = () => {
      this.label(button, `Muster: ${this.pattern.label}`, this.pattern.sub, 0xffc857);
    };

    const list = new TextPlane({
      width: 1.1,
      height: 0.6,
      title: 'Zur Auswahl',
      body: 'Kein Vibrieren · Leicht · Mittel · Stark · Doppelklopfen · Salve · Herzschlag · Anschwellen · Dauerbrummen',
      accent: 0x6f7d99,
    });
    list.position.set(-half + thickness / 2 + 0.02, 1.0, -0.3);
    list.rotation.y = Math.PI / 2;
    room.add(list);
  }

  /**
   * Der Griff auf der Bank: nur anfassen, nichts bewegen.
   *
   * Er *soll* sich nicht mitnehmen lassen. Ein Ding, das man greift und das
   * dann mitkommt, prüft die Physik; hier geht es um das Brummen, und das
   * fühlt man am besten, wenn die Hand still an einer festen Sache liegt.
   */
  private updateBuzz(dt: number, ctx: WorldContext): void {
    const bench = this.bench;
    if (!bench) return;

    const buzz = this.buzz;
    if (buzz) {
      const controller = ctx.input.get(buzz.hand);
      if (!controller?.tracked || !controller.squeeze.pressed) {
        this.buzz = null;
        bench.setKnobGlow(false);
        return;
      }
      const next = buzz.elapsed + dt;
      for (const pulse of pulsesBetween(this.pattern, buzz.elapsed, next)) {
        controller.pulse(pulse.intensity, pulse.duration);
      }
      buzz.elapsed = next;
      bench.setKnobGlow(true);
      return;
    }

    let near = false;
    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand || !controller.tracked) continue;
      handPosition(controller, _hand);
      if (bench.knobDistance(_hand) > KNOB_REACH) continue;
      near = true;
      if (!controller.squeeze.justPressed) continue;
      this.buzz = { hand, elapsed: 0 };
      ctx.notify(`${this.pattern.label} · ${this.pattern.sub}`);
      break;
    }
    bench.setKnobGlow(near);
  }

  // --- Knöpfe an der Wand ---------------------------------------------------

  /**
   * Eine Tafel, auf die gezeigt und gedrückt wird. Der Pointer nimmt sie erst
   * in `init` an — hier wird nur gebaut, weil die Welt zu diesem Zeitpunkt
   * noch keinen Kontext hat.
   */
  /**
   * Eine Tafel an ihrem Platz auf der Tafelwand — die Maße kommen aus
   * `inputPanel.ts`, damit der Test sie prüfen kann und nicht die Brille.
   */
  private panelBoard(
    parent: THREE.Object3D,
    rect: { x: number; y: number; width: number; height: number },
    text: { title: string; body: string; accent: number; align?: 'left' | 'center' },
  ): TextPlane {
    const plane = new TextPlane({
      width: rect.width,
      height: rect.height,
      title: text.title,
      body: text.body,
      accent: text.accent,
      align: text.align,
    });
    plane.position.set(rect.x, rect.y, 0);
    parent.add(plane);
    return plane;
  }

  // --- die Aufnahme ---------------------------------------------------------

  /**
   * **Aufnehmen, wie stark die Hand beschleunigt** — Knopf an, Bewegung
   * machen, Knopf aus.
   *
   * Es ist die eine Größe in diesem Spiel, zu der niemand ein Gefühl hat: ein
   * Meter je Sekunde ist ein Schritt, aber „40 m/s²" sagt nichts, bis man es
   * einmal neben der eigenen Bewegung gesehen hat. Genau solche Zahlen stehen
   * aber in den Schwellen — der Schlag des Hammers, das Tempo eines Wurfs, das
   * Schütteln der Sektflasche —, und bisher hieß Einstellen: probieren, bis
   * etwas passiert.
   *
   * Während sie läuft, setzt **Greifen** eine Marke: der Wert genau in dem
   * Moment, in dem man den Knopf drückt. Ohne das misst man den Wurf und liest
   * hinterher den Höchstwert des Abbremsens ab. Die Zuggeste am Ende der
   * Aufnahme friert deshalb auch nichts ein — solange aufgenommen wird, gehört
   * der Griffknopf der Marke (`updateBoard`).
   */
  private toggleRecording(): void {
    const ctx = this.context;
    if (this.recording) {
      this.lastRecording = this.recording;
      this.recording = null;
      const peak = this.lastRecording.peak();
      ctx?.notify(`Aufnahme beendet · Max ${formatAccel(peak.value)}`);
    } else {
      this.recording = new AccelRecording();
      this.lastRecording = null;
      ctx?.notify('Aufnahme läuft · Greifen setzt eine Marke');
    }
    this.recordLine = '';
    this.refreshButtons();
    this.showRecording(true);
  }

  /**
   * Ein Bild der Aufnahme: beide Hände füttern und die Tafel nachziehen.
   *
   * Gemessen wird an demselben Punkt der Hand, an dem auch alles andere hängt
   * (dem Griffpunkt) — und **jedes** Bild, auch wenn die Tafel nur fünfmal je
   * Sekunde neu gezeichnet wird. Ein Gipfel dauert zwei Bilder; wer nur zum
   * Zeichnen misst, misst ihn nicht.
   */
  private updateRecording(dt: number, ctx: WorldContext): void {
    const recording = this.recording;
    if (recording) {
      recording.tick(dt);
      for (const side of ['left', 'right'] as const) {
        const controller = ctx.input.get(side);
        recording.feed(side, controller?.tracked ? handPosition(controller, _hand) : null, dt);
      }
    }
    this.recordAge += dt;
    this.showRecording();
  }

  /**
   * Die Tafel der Aufnahme — neu gezeichnet nur, wenn sich der Text ändert,
   * und höchstens ein paar Mal je Sekunde: eine laufende Uhr ändert ihn in
   * jedem Bild, und eine 512er-Leinwand je Bild ist der billigste Weg, ein
   * Headset zum Stocken zu bringen.
   */
  private showRecording(force = false): void {
    const board = this.recordBoard;
    if (!board) return;
    if (!force && this.recordAge < TILT_REFRESH) return;
    const text = recordLines(this.recording, this.lastRecording);
    if (text === this.recordLine) return;
    this.recordAge = 0;
    this.recordLine = text;
    board.setText('Aufnahme', text, this.recording ? GRAB_GLOW : 0x5ee0a0);
  }

  private wallButton(
    parent: THREE.Object3D,
    width: number,
    height: number,
    run: (hand: Handedness | null) => void,
    grab = false,
  ): WallButton {
    const plane = new TextPlane({ width, height, title: '', accent: 0x9fe3ff, align: 'center' });
    parent.add(plane);
    const button: WallButton = { plane, grab, run, refresh: () => undefined, last: '' };
    this.buttons.push(button);
    return button;
  }

  /** Alle Beschriftungen neu — jede Änderung geht hier durch. */
  private refreshButtons(): void {
    for (const button of this.buttons) button.refresh();
    this.showValues();
  }

  /**
   * Eine Beschriftung, aber nur, wenn sie sich geändert hat.
   *
   * Beim Schieben an der Griffleiste läuft das hier jede Frame durch; ein
   * Dutzend 512er-Canvas pro Frame neu zu zeichnen ist der billigste Weg, ein
   * Headset zum Stocken zu bringen — und elf davon stehen dabei ohnehin still.
   */
  private label(button: WallButton, title: string, body: string, accent: number): void {
    const line = `${title}|${body}|${accent}`;
    if (line === button.last) return;
    button.last = line;
    button.plane.setText(title, body, accent);
  }
}

function handPosition(controller: ControllerState, target: THREE.Vector3): THREE.Vector3 {
  const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
  return anchor.getWorldPosition(target);
}

/** The node a hand hangs on: the grip, or the ray when there is no grip. */
function handAnchor(controller: ControllerState): THREE.Object3D {
  return controller.grip.visible ? controller.grip : controller.targetRay;
}

/**
 * Die sechs Zahlen einer Handhaltung, wie sie auf der Tafel stehen.
 *
 * Eine `HandPose` trägt sie schon in genau dieser Einheit — Zentimeter und
 * Grad —, also ist das ein Umpacken und keine Umrechnung. Der Umweg über
 * Meter und Quaternion und wieder zurück wäre einer, der jedes Mal ein
 * bisschen rundet.
 */
function readoutOfHand(pose: HandPose): PoseReadout {
  return {
    x: pose.x,
    y: pose.y,
    z: pose.z,
    pitch: pose.pitch,
    yaw: pose.yaw,
    roll: pose.roll,
  };
}

/** Eine Handhaltung als Pose: Zentimeter werden Meter, Grad werden Bogenmaß. */
/**
 * Ob für dieses Werkzeug die **Zielkorrektur** gilt: für alles, was zielt, und
 * sonst für nichts. Was in der Faust sitzt, bekommt die Ruhe — auch der
 * **Beutel**, der seit dieser Runde im Griff liegt wie jedes andere Werkzeug,
 * das nicht zielt. Er hing eine Weile aufrecht im Raum und war hier die
 * Ausnahme. Dieselbe Frage stellt die Werkzeugseite (`viewer.aimOf`).
 */
function aims(tool: Tool): boolean {
  return tool.alignToAim;
}

/**
 * Die Lage eines Geräts als **drei Zeilen** — und zwar in **zwei Räumen**,
 * denn genau das ist die Verwirrung, um die es hier geht.
 *
 * - **Zeigestrahl**: der Raum, dessen -Z dorthin läuft, wohin man zeigt.
 *   Gelesen als Euler `YXZ`, also in der Reihenfolge, in der ein Flugzeug oder
 *   eine Kamera geführt wird: erst gieren, dann nicken, dann rollen. Darin
 *   heißt „geradeaus gezielt" **Pitch 0**, und ein Rollen um die Zeigeachse
 *   ändert **nur** den Roll. Das ist die Zeile, die man liest.
 * - **Griffraum**: der Raum, in dem jede Haltung, jeder Halterzylinder und
 *   jede Faust dieses Spiels stehen, gelesen als Euler `XYZ` — die
 *   Schreibweise jeder `HandPose`. Das ist die Zeile, die man mir sagt.
 *
 * Dass die beiden so weit auseinanderliegen, ist der ganze Punkt: der
 * Handgriff eines Quest-Controllers steht schräg zu seinem Strahl, und wer
 * geradeaus zielt, hat im Griffraum deshalb einen kräftigen Pitch stehen — die
 * gemeldeten 45° waren keine Fehlmessung, sondern das Gerät. Und weil die
 * beiden Räume gegeneinander verdreht sind, verteilt sich ein Rollen um den
 * Strahl im Griffraum auf **Yaw und Roll zugleich**: auch das ist kein Fehler,
 * sondern eine Drehung, die dort nun einmal um keine einzelne Achse geht.
 *
 * Die dritte Zeile misst genau diesen Versatz: **wie weit der Strahl gegen den
 * Griff steht**, wie das Gerät selbst ihn meldet. Sie ist der Grund, warum es
 * diese Tafel gibt — im Code steht dafür bisher eine geschätzte Zahl
 * (`GRIP_TO_RAY`), und hier steht beides nebeneinander.
 *
 * Eine **getrackte Hand** hat weder Griff noch Gerät; dort tritt das
 * **Handgelenk** an die Stelle des Griffs, und die dritte Zeile sagt, wie weit
 * der Pinch-Strahl dagegen steht. Vorher stand dort gar nichts, weil
 * `hand.quaternion` die Ruhe ist — die Gelenke tragen die Drehung, nicht die
 * Gruppe darum.
 */
function tiltOf(state: ControllerState): string {
  const ray = state.targetRay.quaternion;
  const grip = gripSpaceOf(state);
  const yxz = _euler.setFromQuaternion(ray, 'YXZ');
  // **Kurze Zeilen**, denn die Tafel ist schmal und soll groß schreiben: `Y`,
  // `P` und `R` stehen für Yaw, Pitch und Roll, und welcher Raum gemeint ist,
  // sagt der Anfang der Zeile. Ausgeschrieben brach jede Zeile um, und die
  // Schrift schrumpfte auf die Hälfte, bis am Ende eine Zeile fehlte.
  const line = [`Strahl YXZ  Y ${deg(yxz.y)}°  P ${deg(yxz.x)}°  R ${deg(yxz.z)}°`];
  if (grip) {
    const xyz = _euler.setFromQuaternion(grip, 'XYZ');
    line.push(
      `${state.isHand ? 'Gelenk' : 'Griff'} XYZ  P ${deg(xyz.x)}°  ` +
        `Y ${deg(xyz.y)}°  R ${deg(xyz.z)}°`,
    );
    // Der Weg vom Griff zum Strahl — die Zahl, die das **Gerät** selbst kennt,
    // und daneben die, die im Code dafür steht. Nur nebeneinander sind sie eine
    // Auskunft: eine gemessene Zahl allein sagt nicht, ob sie neu ist.
    _between.copy(grip).invert().multiply(ray);
    const total = 2 * Math.acos(Math.min(1, Math.abs(_between.w)));
    line.push(`Griff→Strahl ${deg(total)}° (Code ${CODED_AIM}°)`);
  }
  return line.join('\n');
}

/**
 * Der Raum, gegen den hier gemessen wird: der **Griffraum** am Controller, das
 * **Handgelenk** an einer getrackten Hand — oder nichts, wenn die Brille
 * weder das eine noch das andere meldet.
 */
function gripSpaceOf(state: ControllerState): THREE.Quaternion | null {
  if (!state.isHand) return state.grip.visible ? state.grip.quaternion : null;
  const wrist = state.hand.joints['wrist'];
  return wrist?.visible ? wrist.quaternion : null;
}

function deg(radians: number): number {
  return Math.round((radians * 180) / Math.PI);
}

function handLabel(hand: Handedness): string {
  return hand === 'left' ? 'Linke Hand' : 'Rechte Hand';
}

/** Sechs Zahlen aus einer Ablesung — die Reihenfolge, in der jede Pose reist. */
function readoutValues(readout: PoseReadout): number[] {
  return [readout.x, readout.y, readout.z, readout.pitch, readout.yaw, readout.roll];
}
