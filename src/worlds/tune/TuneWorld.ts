import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { TextPlane } from '../../ui/TextPlane';
import { InputModel } from './InputModel';
import { GhostTable, RAIL_REACH } from './GhostTable';
import { VibeBench, KNOB_REACH } from './VibeBench';
import {
  clampTable,
  clearTableSettings,
  GHOST_LABELS,
  nextGhostKind,
  onTableChange,
  saveTableSettings,
  tableFieldLabel,
  tableSettings,
  TABLE_FIELDS,
  type TableField,
  type TableSettings,
} from './tableSettings';
import {
  hapticPattern,
  nextPatternId,
  pulsesBetween,
  saveHapticPattern,
  type HapticPattern,
} from './haptics';
import { ToolRange, LANE, MOUNT_REACH } from './ToolRange';
import { SeeThrough } from './seeThrough';
import { nudgeGrip, FINE_FACTOR, type Grip } from './fineTune';
import { GRAB_GLOW } from '../../core/colors';
import {
  clonePose,
  formatHandPose,
  GRAB_POSE_ID,
  type HandPose,
} from '../../core/handPose';
import { saveHoldHandPose, saveIdleHandPose } from '../../core/handPoseStore';
import { GhostHand } from '../../core/HandVisuals';
import { foldCurls } from '../../core/handGestures';
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
import { aimQuaternion, type Tool } from '../portal/tools/Tool';
import { toolGearCode } from '../portal/tools/gearConfig';
import type { WorldContext } from '../../core/types';
import type { ControllerState, Handedness } from '../../core/XRInput';

const ROOM = { half: 3.4, height: 3, thickness: 0.3 };
/** Where the two models hang: eye height, an arm's length out, one per side. */
const MODEL_Y = 1.42;
const MODEL_Z = -1.15;
const MODEL_X = 0.34;

/** Ein Knopf an der Wand: die Tafel, was sie tut und was gerade daraufsteht. */
interface WallButton {
  plane: TextPlane;
  /** @param hand welche Hand darauf gezeigt hat, wenn bekannt. */
  run(hand: Handedness | null): void;
  /** Schreibt die aktuelle Beschriftung — über `label`, nie direkt. */
  refresh(): void;
  /** Was zuletzt daraufstand. Ein Canvas ohne Not neu zu zeichnen ist teuer. */
  last: string;
}

/**
 * Der Geist hängt gerade an einer Hand: sie dreht ihn oder sie schiebt ihn.
 *
 * Gerechnet wird immer gegen den Stand beim Zupacken und nie gegen den letzten
 * Frame — sonst summieren sich Rundungsfehler zu einem Geist, der langsam
 * davonwandert, und das über eine Minute Feinjustage.
 */
interface Drive {
  kind: 'rotate' | 'move';
  hand: Handedness;
  startPosition: THREE.Vector3;
  startRotation: THREE.Quaternion;
  before: TableSettings;
}

/** Eine Hand wird gerade gegen den Geist gelegt. */
interface Fitting {
  hand: Handedness;
  toolId: string | null;
  before: HandPose;
}

/**
 * Ein Werkzeug liegt im Halter und wartet darauf, dass eine Hand sich dazu
 * legt.
 *
 * Es liegt dort **auf die Scheibe gerichtet** — das ist die halbe Antwort, die
 * der Halter schon gibt. Gemessen wird nur noch die andere Hälfte: wo die Hand
 * ist, wenn sie es so hält, wie sie es halten will.
 */
interface Mounted {
  tool: Tool;
  /** Die Hand, aus der es kam — ihre Knöpfe bestätigen. */
  hand: Handedness;
  /** Die Haltung, die es beim Ablegen hatte. `A` legt genau die zurück. */
  before: { position: THREE.Vector3; rotation: THREE.Quaternion };
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
  /** Die Haltung vor dem Zupacken, für den Abbruch. */
  before: { position: THREE.Vector3; rotation: THREE.Quaternion };
}

/** Was der Griff auf der Vibrationsbank gerade macht. */
interface Buzz {
  hand: Handedness;
  /** Sekunden seit dem Zupacken — der Zeiger im Muster. */
  elapsed: number;
}

const _hand = new THREE.Vector3();
const _position = new THREE.Vector3();
const _rotation = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _delta = new THREE.Quaternion();
const _start = new THREE.Quaternion();
const _tableRotation = new THREE.Quaternion();
const _inverse = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _ghostPosition = new THREE.Vector3();
const _ghostRotation = new THREE.Quaternion();
const _identity = new THREE.Quaternion();
const _toolPosition = new THREE.Vector3();
const _toolRotation = new THREE.Quaternion();
const _aim = new THREE.Quaternion();
const _matrix = new THREE.Matrix4();
const _gripPosition = new THREE.Vector3();
const _gripRotation = new THREE.Quaternion();
const _posePosition = new THREE.Vector3();
const _poseRotation = new THREE.Quaternion();
const _inverseMatrix = new THREE.Matrix4();
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
 * **An der rechten Wand steht ein Tisch**, und darauf liegt ein Geist: eine
 * Kugelhand, eine Boxhand oder ein Quest-Controller, je nachdem, welche der
 * drei Darstellungen man gerade justieren will. Das ist der zweite Teil der
 * Antwort und der wichtigere für die Haltung: eine Handhaltung im Leeren
 * einzustellen ist Raten, weil der Arm sich mitbewegt. Auf einem Tisch nicht.
 *
 * Und dort wird auch **nicht mehr getippt**. An der Wand stehen keine
 * Zahlenfelder mehr, sondern drei Handgriffe:
 *
 * - **Geist drehen** — die *andere* Hand dreht sich, der Geist dreht sich mit;
 *   ihr Trigger schreibt die Lage fest.
 * - **Geist bewegen** — dasselbe für x, y und z.
 * - **Justieren** — jetzt legst *du* deine Hand so hin, dass sie mit dem Geist
 *   deckungsgleich ist, und dein Trigger schreibt daraus die Haltung. Genau
 *   das, was der Werkzeug-Justierer in der Luft tut, nur gegen einen Tisch,
 *   der stillsteht.
 *
 * Daneben hängt die **Werte-Tafel**: was zuletzt gemessen wurde, in Zahlen zum
 * Vorlesen, und darunter der Konfig-Code für genau diese Hand in genau dieser
 * Darstellung — kurz genug zum Abtippen, weil er nichts anderes enthält.
 *
 * Dass der virtuelle Tisch mit dem echten zusammenfällt, hängt an einer Zahl,
 * die kein Headset kennt: der eigenen Augenhöhe. Deshalb stehen die beiden
 * Knöpfe **Stehhöhe messen** und **Sitzhöhe messen** hier und nicht nur im
 * Menü — man merkt den Fehler an diesem Tisch, also gehört er hierhin
 * korrigiert (`core/posture.ts`).
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
 * nur Lärm. Nur: der Tisch steht rechts, die Bank links, und wer im Sessel
 * sitzt, kommt an keins von beidem. Also gibt es an der Wand einen **Knopf,
 * der den Stick freigibt** — ausdrücklich und sichtbar, statt dass es einfach
 * so geht.
 *
 * **Hinter dem Rücken, durch die Tür in der Rückwand, liegt der Schießgang.**
 * Ein Gang, eine Zielscheibe am Ende, ein Halter daneben — und damit die
 * Antwort auf die Frage, die der Tisch nicht beantworten kann. Der Tisch sagt,
 * *wo* eine Hand liegt; ein Werkzeug aber liegt nicht richtig, es **zeigt**
 * richtig. Also:
 *
 * - Ein Werkzeug in den Halter halten — es rastet ein und liegt **exakt auf
 *   die Scheibe gerichtet**. Damit ist die Zielrichtung keine Unbekannte mehr.
 * - Die Hand ans Werkzeug führen, dorthin, wo man es halten will, und mit
 *   **Greifen oder Trigger** bestätigen. Was dazwischen liegt, *ist* die
 *   Haltung (`toolPose.ts`) — und das Werkzeug springt damit in die Hand
 *   zurück, wo man sofort sieht, ob es die Scheibe trifft.
 * - **Feinjustieren** für die letzten zwei Millimeter: die aktuelle Haltung
 *   wird geladen und als Geisterhand ans Werkzeug gestellt, und die *andere*
 *   Hand zieht sie zurecht — ein Zentimeter an der eigenen Hand ist ein
 *   Millimeter am Geist (`fineTune.ts`). Eine ausgestreckte Hand zittert um
 *   mehr als das, was hier eingestellt wird; untersetzt tut sie es nicht mehr.
 * - **AR an** macht die Wände durchsichtig. Läuft die Sitzung als
 *   `immersive-ar`, steht dahinter das echte Zimmer — und man sieht endlich
 *   die virtuelle Hand *neben* der eigenen statt nur anstelle von ihr
 *   (`seeThrough.ts`).
 *
 * An der linken Wand des Gangs stehen die Knöpfe und hängt die Tafel mit den
 * Werten: dieselben sechs Zahlen wie am Tisch, und darunter der Konfig-Code.
 *
 * Everything else is the portal lab's, which is exactly why this is a world
 * and not a menu page: the belt, the tool shelf, the **Werkzeug-Justierer**
 * and the whole *Einstellungen → Hände* tree come with it, so the hand you are
 * watching is the hand you are setting up.
 */
export class TuneWorld extends PortalWorld {
  private readonly models = new Map<Handedness, InputModel>();
  private readonly boards = new Map<Handedness, TextPlane>();
  private readonly buttons: WallButton[] = [];
  private table: GhostTable | null = null;
  private bench: VibeBench | null = null;
  private range: ToolRange | null = null;
  /** Die große Tafel neben dem Tisch: letzte Messung und ihr Code. */
  private valueBoard: TextPlane | null = null;
  /** Dieselben Werte noch einmal, an der linken Wand des Schießgangs. */
  private rangeBoard: TextPlane | null = null;
  private lastValueText = '';
  /**
   * Wände, Boden und Decke — und nur die. Der AR-Knopf blendet genau diese
   * Gruppe weg; Tisch, Bank, Halter, Scheibe und alle Schilder bleiben stehen,
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
   * Der Stand der Dinge, im Speicher.
   *
   * Beim Schieben an der Griffleiste ändert sich die Höhe jede Frame, und
   * `localStorage` jede Frame zu beschreiben (und danach neun Schilder neu zu
   * zeichnen) ist genau die Sorte Kleinigkeit, die ein Headset stocken lässt.
   * Also läuft der Zug hier durch, und geschrieben wird beim Loslassen.
   */
  private state: TableSettings = tableSettings();
  /** Meldet sich ab, wenn die Welt geht — sonst hört ein toter Tisch weiter zu. */
  private unsubscribe: (() => void) | null = null;
  /** Wer gerade die Leiste hält, wo seine Hand war und wie hoch der Tisch stand. */
  private lift: { hand: Handedness; startY: number; startHeight: number } | null = null;
  private drive: Drive | null = null;
  private fitting: Fitting | null = null;
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

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    // No walking, no snap turn — the head still goes wherever it likes. Der
    // Knopf an der Wand gibt das Drehen wieder frei.
    ctx.rig.locked = true;
    for (const button of this.buttons) {
      ctx.pointer.add({
        object: button.plane,
        onSelect: (hit) => button.run(hit.hand),
        onHover: () => button.plane.setHighlight(true),
        onBlur: () => button.plane.setHighlight(false),
      });
    }
    // Eine Änderung kommt aus vier Richtungen — Knopf, Tastatur, Griffleiste,
    // Geisterzug — und muss immer beides nachziehen: den Tisch und die
    // Beschriftungen.
    this.unsubscribe = onTableChange(() => this.showTable(tableSettings()));
    this.showTable(tableSettings());
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    for (const side of ['left', 'right'] as const) {
      const model = this.models.get(side);
      const board = this.boards.get(side);
      if (!model || !board) continue;
      const line = model.show(ctx.input.get(side));
      // A canvas redraw per frame for a line that has not changed is the
      // cheapest way there is to make a headset stutter.
      if (line === model.lastLine) continue;
      model.lastLine = line;
      board.setText(side === 'left' ? 'Linke Hand' : 'Rechte Hand', line, 0x9fe3ff);
    }
    this.updateLift(ctx);
    this.updateDrive(ctx);
    this.updateFitting(ctx);
    this.updateRange(ctx);
    this.updateFine(ctx);
    this.updateBuzz(dt, ctx);
  }

  override dispose(ctx: WorldContext): void {
    ctx.rig.locked = false;
    // Eine durchsichtig gelassene Welt bliebe durchsichtig — die Materialien
    // gehören zwar dieser Welt, der Himmel und der Hintergrund aber nicht.
    this.cancelFine(true);
    this.releaseMount(false, true);
    this.seeThrough.reset(ctx.scene, this.shellGroup, ctx.renderer);
    this.unsubscribe?.();
    this.unsubscribe = null;
    for (const model of this.models.values()) model.dispose();
    this.models.clear();
    for (const board of this.boards.values()) board.dispose();
    this.boards.clear();
    for (const button of this.buttons) {
      ctx.pointer.remove(button.plane);
      button.plane.dispose();
    }
    this.buttons.length = 0;
    this.valueBoard?.dispose();
    this.valueBoard = null;
    this.rangeBoard?.dispose();
    this.rangeBoard = null;
    this.range?.dispose();
    this.range = null;
    this.mountBlocked = null;
    this.table?.dispose();
    this.table = null;
    this.bench?.dispose();
    this.bench = null;
    this.lift = null;
    this.drive = null;
    this.fitting = null;
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
    return 'Prüfen: Wand und Tisch · Werkzeug einmessen: Schießgang hinter dir';
  }

  /**
   * The adjuster on one hip and the pistol on the other: the two things you
   * come here to set up, one measured against the other.
   */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [
      ['adjust', 'left'],
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

    this.slab(shellGroup, this.floorMaterial, [half * 2, thickness, half * 2], [0, -thickness / 2, 0], true);
    this.slab(shellGroup, this.shell, [half * 2, thickness, half * 2], [0, height + thickness / 2, 0], false);
    this.slab(shellGroup, this.shell, [half * 2, height, thickness], [0, height / 2, -half], true);
    this.slab(shellGroup, this.shell, [thickness, height, half * 2], [-half, height / 2, 0], false);
    this.slab(shellGroup, this.shell, [thickness, height, half * 2], [half, height / 2, 0], false);

    // Die Rückwand hat eine Tür: dahinter liegt der Schießgang. Zwei Stücke
    // links und rechts, ein Sturz darüber — eine Wand mit Loch gibt es in
    // einem Kasten nicht.
    const door = LANE.half + 0.15;
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

    const title = new TextPlane({
      width: 2.4,
      height: 0.44,
      title: 'Eingaberaum',
      body: 'Greifen = Mittel-, Ring- und kleiner Finger an der Handfläche · Trigger = Zeigefinger',
      accent: 0x4aa8ff,
      align: 'center',
    });
    title.position.set(0, 2.32, -half + thickness / 2 + 0.02);
    room.add(title);

    for (const side of ['left', 'right'] as const) {
      const sign = side === 'left' ? -1 : 1;

      const model = new InputModel(side);
      model.position.set(sign * MODEL_X, MODEL_Y, MODEL_Z);
      room.add(model);
      this.models.set(side, model);

      // The words go straight behind the model it belongs to, so the eye does
      // not have to hunt for which board is which hand.
      const board = new TextPlane({
        width: 1.5,
        height: 0.5,
        title: side === 'left' ? 'Linke Hand' : 'Rechte Hand',
        body: 'nicht getrackt',
        accent: 0x9fe3ff,
      });
      board.position.set(sign * 0.82, 1.62, -half + thickness / 2 + 0.02);
      room.add(board);
      this.boards.set(side, board);
    }

    const hint = new TextPlane({
      width: 2.6,
      height: 0.4,
      title: 'Hier läuft niemand',
      body: 'Stick bewegt und dreht nicht — der Knopf rechts daneben gibt ihn frei',
      accent: 0x6f7d99,
      align: 'center',
    });
    hint.position.set(0, 0.72, -half + thickness / 2 + 0.02);
    room.add(hint);

    this.buildTurnButton(room);
    this.buildTable(room);
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
   * Direkt neben dem Hinweis, dass hier niemand läuft — dort wird man ihn
   * suchen, und dort widerspricht er dem Schild, das gerade gelesen wurde.
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
    button.plane.position.set(1.9, 0.72, -half + thickness / 2 + 0.02);
    button.refresh = () => {
      const locked = this.context?.rig.locked !== false;
      this.label(
        button,
        locked ? 'Stick freigeben' : 'Stick sperren',
        locked ? 'Antippen erlaubt Drehen und Gehen' : 'Stick dreht und geht · zum Tisch rechts',
        locked ? 0x6f7d99 : GRAB_GLOW,
      );
    };
  }

  // --- der Tisch mit der Geisterhand ----------------------------------------

  private buildTable(room: THREE.Group): void {
    const { half, thickness } = ROOM;
    const table = new GhostTable();
    // Rechts an der Wand, quer dazu: die Platte zeigt in den Raum, damit man
    // seitlich davorsitzen und die eigene Hand danebenlegen kann.
    table.position.set(half - 0.75, 0, -0.3);
    table.rotation.y = -Math.PI / 2;
    room.add(table);
    this.table = table;

    const sign = new TextPlane({
      width: 1.6,
      height: 0.42,
      title: 'Tisch mit Geist',
      body: 'Höhe wie dein echter Tisch, dann die Hand darauflegen · türkise Leiste hebt ihn',
      accent: 0x9fe3ff,
      align: 'center',
    });
    sign.position.set(half - thickness / 2 - 0.02, 2.3, -0.3);
    sign.rotation.y = -Math.PI / 2;
    room.add(sign);

    // Die Werte-Tafel: breit, weil ein Konfig-Code breit ist, und ganz außen,
    // weil man sie abliest statt sie zu drücken.
    const values = new TextPlane({
      width: 1.1,
      height: 0.5,
      title: 'Noch nichts justiert',
      body: 'Justieren drücken, Hand auf den Geist legen, Trigger',
      accent: 0x5ee0a0,
    });
    values.position.set(half - thickness / 2 - 0.02, 1.62, 0.95);
    values.rotation.y = -Math.PI / 2;
    room.add(values);
    this.valueBoard = values;

    for (const [index, row] of this.tableRows().entries()) {
      const button = this.wallButton(room, 0.86, 0.26, row.run);
      const column = index % 2;
      const line = Math.floor(index / 2);
      button.plane.position.set(
        half - thickness / 2 - 0.02,
        1.95 - line * 0.3,
        -0.3 + (column === 0 ? 0.46 : -0.46),
      );
      button.plane.rotation.y = -Math.PI / 2;
      button.refresh = () => row.refresh(button);
    }
  }

  /**
   * Die Knopfleiste an der Wand hinter dem Tisch.
   *
   * Die einzelnen Zahlen stehen bewusst **nicht** mehr darauf. Eine Neigung
   * von -87° einzutippen, um zu sehen, ob die Hand jetzt richtig liegt, ist
   * genau die Arbeit, die man in einer Brille nicht machen will — man sieht
   * die Lage ja, also soll man sie auch anfassen dürfen. Geblieben ist die
   * Tischhöhe, weil die als einzige gegen einen Zollstock gemessen wird und
   * nicht gegen das Auge.
   */
  private tableRows(): Array<{ refresh(button: WallButton): void; run(hand: Handedness | null): void }> {
    const height = TABLE_FIELDS.find((field) => field.key === 'height')!;
    return [
      {
        refresh: (button) => {
          this.label(
            button,
            `Geist: ${GHOST_LABELS[this.state.kind]}`,
            'Gliedmaßen · Boxhand · Quest-Controller',
            0x9fe3ff,
          );
        },
        run: () => {
          const next = saveTableSettings({ kind: nextGhostKind(this.state.kind) });
          this.context?.notify(`Auf dem Tisch: ${GHOST_LABELS[next.kind]}`);
        },
      },
      {
        refresh: (button) => {
          this.label(
            button,
            this.state.side === 'left' ? 'Seite: links' : 'Seite: rechts',
            'Welche der beiden daliegt',
            0x9fe3ff,
          );
        },
        run: () => {
          const next = saveTableSettings({
            side: this.state.side === 'left' ? 'right' : 'left',
          });
          this.context?.notify(next.side === 'left' ? 'Linke Hand liegt' : 'Rechte Hand liegt');
        },
      },
      {
        refresh: (button) => {
          const busy = this.drive?.kind === 'rotate';
          this.label(
            button,
            busy ? 'Dreht … Trigger legt fest' : 'Geist drehen',
            busy ? 'Andere Hand drehen · A bricht ab' : 'Mit der anderen Hand drehen',
            busy ? GRAB_GLOW : 0xffc857,
          );
        },
        run: (hand) => this.beginDrive('rotate', hand),
      },
      {
        refresh: (button) => {
          const busy = this.drive?.kind === 'move';
          this.label(
            button,
            busy ? 'Schiebt … Trigger legt fest' : 'Geist bewegen',
            busy ? 'Andere Hand bewegen · A bricht ab' : 'Mit der anderen Hand schieben',
            busy ? GRAB_GLOW : 0xffc857,
          );
        },
        run: (hand) => this.beginDrive('move', hand),
      },
      {
        refresh: (button) => {
          const busy = this.fitting !== null;
          this.label(
            button,
            busy ? 'Hand auf den Geist legen' : 'Justieren',
            busy ? 'Deckungsgleich, dann Trigger' : 'Hand deckungsgleich legen, Trigger speichert',
            busy ? GRAB_GLOW : 0x5ee0a0,
          );
        },
        run: () => this.beginFitting(),
      },
      {
        refresh: (button) => {
          this.label(
            button,
            `${height.label}: ${tableFieldLabel(height, this.state.height)}`,
            height.sub,
            0x9fe3ff,
          );
        },
        run: () => this.askTableField(height),
      },
      {
        refresh: (button) => {
          this.label(
            button,
            `Stehhöhe: ${eyeHeights().stand} cm`,
            'Aufstehen, drücken — die Brille misst',
            0x4aa8ff,
          );
        },
        run: () => this.measureEye('stand'),
      },
      {
        refresh: (button) => {
          this.label(
            button,
            `Sitzhöhe: ${eyeHeights().sit} cm`,
            'Hinsetzen, drücken — die Brille misst',
            0x4aa8ff,
          );
        },
        run: () => this.measureEye('sit'),
      },
      {
        refresh: (button: WallButton) => {
          this.label(button, 'Geist zurücksetzen', 'Höhe, Lage und Ausrichtung', 0xffc857);
        },
        run: () => {
          this.cancelDrive();
          this.fitting = null;
          clearTableSettings();
          this.context?.notify('Tisch zurückgesetzt');
        },
      },
    ];
  }

  /** Tisch und Schilder auf denselben Stand — der einzige Weg dorthin. */
  private showTable(settings: TableSettings): void {
    this.state = settings;
    this.table?.apply(settings, this.ghostPose());
    this.refreshButtons();
    this.showValues();
  }

  /**
   * Die Haltung, in der der Geist auf dem Tisch liegt: die, die die Hand
   * gerade *wirklich* trägt.
   *
   * Sonst läge dort die Grundhaltung, während man den Griff am Werkzeug
   * justiert — und man verglichen die falschen Finger miteinander. Nur die
   * Krümmung kommt daraus; wo der Geist liegt, sagt der Tisch.
   */
  private ghostPose(): HandPose | undefined {
    const ctx = this.context;
    if (!ctx) return undefined;
    return ctx.hands.editablePose(this.state.side, this.poseId());
  }

  /**
   * Unter welchem Namen die Haltung dieser Hand gespeichert ist: `null` für
   * die leere Hand, sonst die Id dessen, was sie hält (`grab` für ein Objekt).
   */
  private poseId(): string | null {
    return this.context?.hands.heldToolOf(this.state.side) ?? null;
  }

  /** Eine Zahl des Tisches über die Tastatur — Zentimeter und Grad. */
  private askTableField(field: TableField): void {
    const before = this.state[field.key];
    this.askNumber({
      title: field.label,
      sub: `Tisch · ${field.min} bis ${field.max} ${field.unit}`.trim(),
      value: String(before),
      hint: field.sub,
      // Live: der Tisch bewegt sich, während die Zahl noch getippt wird. 74
      // sagt auf dem Papier nichts, ein Tisch auf Ellbogenhöhe alles.
      preview: (value) => {
        saveTableSettings({ [field.key]: value } as Partial<TableSettings>);
      },
      // Abgebrochen heißt abgebrochen — sonst bliebe die letzte getippte
      // Ziffer als Einstellung stehen.
      cancel: () => {
        saveTableSettings({ [field.key]: before } as Partial<TableSettings>);
      },
      commit: (value) => {
        const applied = saveTableSettings({ [field.key]: value } as Partial<TableSettings>);
        this.context?.notify(`${field.label}: ${tableFieldLabel(field, applied[field.key])}`);
      },
    });
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

  // --- den Geist anfassen ---------------------------------------------------

  /**
   * Der Geist hängt ab jetzt an der *anderen* Hand als der, die den Knopf
   * gedrückt hat. Das ist keine Willkür: man zeigt mit der einen an die Wand
   * und dreht mit der anderen, und wer den Knopf mit der Hand drückt, die
   * gleich ziehen soll, müsste den Strahl erst wieder wegnehmen.
   */
  private beginDrive(kind: 'rotate' | 'move', pointing: Handedness | null): void {
    const ctx = this.context;
    if (!ctx) return;
    // Ein Zug, der schon läuft, wird vom selben Knopf wieder abgestellt — nur
    // nicht von der Hand, die gerade zieht: deren Trigger gehört dem Zug, und
    // ihr Strahl streicht beim Drehen ohnehin über die halbe Wand.
    if (this.drive) {
      if (this.drive.hand === pointing) return;
      const running = this.drive.kind;
      this.cancelDrive();
      if (running === kind) {
        ctx.notify('Abgebrochen');
        return;
      }
    }
    this.fitting = null;
    const hand: Handedness = pointing === 'left' ? 'right' : 'left';
    const controller = ctx.input.get(hand);
    if (!controller?.tracked) {
      ctx.notify(`${handLabel(hand)} nicht getrackt`);
      return;
    }
    handAnchor(controller).updateWorldMatrix(true, false);
    handAnchor(controller).matrixWorld.decompose(_position, _rotation, _scale);
    this.drive = {
      kind,
      hand,
      startPosition: _position.clone(),
      startRotation: _rotation.clone(),
      before: { ...this.state },
    };
    controller.pulse(0.4, 25);
    this.refreshButtons();
    ctx.notify(
      kind === 'rotate'
        ? `${handLabel(hand)} dreht den Geist · Trigger legt fest`
        : `${handLabel(hand)} schiebt den Geist · Trigger legt fest`,
    );
  }

  /**
   * Jede Frame eines Zuges: der Geist übernimmt, was die Hand seit dem
   * Zupacken getan hat.
   *
   * Gerechnet wird im Raum des Tisches, nicht im Weltraum — der Tisch steht
   * quer an der Wand, und eine Drehung, die im Weltraum um die Senkrechte
   * geht, ist im Tischraum eine um dessen Querachse. Ohne diesen Wechsel dreht
   * sich der Geist um die falsche Achse, und zwar auf eine Art, die man in der
   * Brille nur als „das ist doch verkehrt" beschreiben kann.
   */
  private updateDrive(ctx: WorldContext): void {
    const drive = this.drive;
    const table = this.table;
    if (!drive || !table) return;

    const controller = ctx.input.get(drive.hand);
    if (!controller?.tracked) {
      this.cancelDrive();
      ctx.notify('Hand weg — abgebrochen');
      return;
    }
    // `A` bricht ab und lässt den Geist da, wo er war.
    if (controller.primary.justPressed) {
      const before = drive.before;
      this.cancelDrive();
      this.showTable(saveTableSettings(before));
      ctx.notify('Abgebrochen');
      return;
    }

    const anchor = handAnchor(controller);
    anchor.updateWorldMatrix(true, false);
    anchor.matrixWorld.decompose(_position, _rotation, _scale);
    table.updateWorldMatrix(true, false);
    table.getWorldQuaternion(_tableRotation);
    _inverse.copy(_tableRotation).invert();

    if (drive.kind === 'rotate') {
      // Was die Hand seit dem Zupacken gedreht hat, in den Tischraum gebracht
      // und auf die Lage von damals gelegt.
      // dq = jetzt · damals⁻¹, und dann in den Raum des Tisches gedreht:
      // Tisch⁻¹ · dq · Tisch. Ohne diese Umrechnung dreht der Geist um die
      // Achsen der Welt statt um seine eigenen.
      _delta.copy(_rotation).multiply(_start.copy(drive.startRotation).invert());
      _delta.premultiply(_inverse).multiply(_tableRotation);
      _euler.set(
        drive.before.pitch / DEG,
        drive.before.yaw / DEG,
        drive.before.roll / DEG,
        'XYZ',
      );
      _ghostRotation.setFromEuler(_euler).premultiply(_delta);
      _euler.setFromQuaternion(_ghostRotation, 'XYZ');
      this.showTable(
        clampTable({
          ...drive.before,
          pitch: Math.round(_euler.x * DEG),
          yaw: Math.round(_euler.y * DEG),
          roll: Math.round(_euler.z * DEG),
        }),
      );
    } else {
      _ghostPosition.copy(_position).sub(drive.startPosition).applyQuaternion(_inverse);
      this.showTable(
        clampTable({
          ...drive.before,
          x: drive.before.x + _ghostPosition.x * 100,
          y: drive.before.y + _ghostPosition.y * 100,
          z: drive.before.z + _ghostPosition.z * 100,
        }),
      );
    }

    if (!controller.trigger.justPressed) return;
    // Erst der Trigger schreibt in den Speicher — bis dahin zieht der Geist
    // nur mit, und ein Abbruch kostet nichts.
    const saved = saveTableSettings(this.state);
    this.cancelDrive();
    controller.pulse(0.6, 40);
    this.showTable(saved);
    ctx.notify(
      drive.kind === 'rotate'
        ? `Lage gespeichert: ${Math.round(saved.pitch)}/${Math.round(saved.yaw)}/${Math.round(saved.roll)}°`
        : `Ort gespeichert: ${round1(saved.x)}/${round1(saved.y)}/${round1(saved.z)} cm`,
    );
  }

  private cancelDrive(): void {
    if (!this.drive) return;
    this.drive = null;
    this.refreshButtons();
  }

  // --- die Hand gegen den Geist legen ---------------------------------------

  /**
   * Ab jetzt zählt der Trigger der Hand, die auf dem Tisch liegt — nicht der
   * des Knopfes. Genau darum steht im Auftrag „nicht auf den Button
   * notwendig": man liegt mit der Hand auf dem Tisch und kommt gar nicht mehr
   * an die Wand.
   */
  private beginFitting(): void {
    const ctx = this.context;
    if (!ctx) return;
    if (this.fitting) {
      this.fitting = null;
      this.refreshButtons();
      ctx.notify('Abgebrochen');
      return;
    }
    this.cancelDrive();
    const hand = this.state.side;
    const controller = ctx.input.get(hand);
    if (!controller?.tracked) {
      ctx.notify(`${handLabel(hand)} nicht getrackt`);
      return;
    }
    const toolId = this.poseId();
    this.fitting = { hand, toolId, before: ctx.hands.editablePose(hand, toolId) };
    controller.pulse(0.4, 25);
    this.refreshButtons();
    ctx.notify(`${this.poseTitle(hand, toolId)} · Hand auf den Geist, dann Trigger`);
  }

  /**
   * Der Trigger schließt die Justage ab: was zwischen Griff und Geist liegt,
   * *ist* die Haltung.
   *
   * Dieselbe Rechnung wie im Werkzeug-Justierer (`toolPose.ts`), nur steht
   * hier statt eines geparkten Werkzeugs ein Tisch, der sich nicht bewegt —
   * und das ist der ganze Vorteil: der Vergleichspunkt zittert nicht mit dem
   * Arm mit. Keine Zielkorrektur, weil eine Hand nirgendwohin zielt.
   */
  private updateFitting(ctx: WorldContext): void {
    const fitting = this.fitting;
    const table = this.table;
    const ghost = table?.ghostObject ?? null;
    if (!fitting || !ghost) return;

    const controller = ctx.input.get(fitting.hand);
    if (!controller?.tracked) return;
    if (controller.primary.justPressed) {
      this.fitting = null;
      this.refreshButtons();
      ctx.notify('Abgebrochen');
      return;
    }
    if (!controller.trigger.justPressed) return;

    const anchor = handAnchor(controller);
    anchor.updateWorldMatrix(true, false);
    anchor.matrixWorld.decompose(_position, _rotation, _scale);
    ghost.updateWorldMatrix(true, false);
    ghost.matrixWorld.decompose(_ghostPosition, _ghostRotation, _scale);

    const measured = holdPoseFrom(
      { position: _position, rotation: _rotation },
      _identity.identity(),
      { position: _ghostPosition, rotation: _ghostRotation },
    );
    const readout = readPose(measured);
    // Die sechs Zahlen kommen aus der Messung; Spreizung und — mit Controller —
    // die Finger bleiben, wie sie waren.
    const pose: HandPose = {
      ...clonePose(fitting.before),
      x: readout.x,
      y: readout.y,
      z: readout.z,
      pitch: readout.pitch,
      yaw: readout.yaw,
      roll: readout.roll,
    };
    // Bei einer blanken Hand misst das Headset die Finger ohnehin jede Frame —
    // ohne sie sähe die Hand mit Controller nie so aus wie die echte daneben.
    const curls = foldCurls(controller.fold);
    if (curls) pose.curls = curls;

    if (fitting.toolId) saveHoldHandPose(fitting.hand, fitting.toolId, pose);
    else saveIdleHandPose(fitting.hand, pose);
    ctx.hands.refreshPoses();

    this.readout = readout;
    this.readoutFor = `${this.poseTitle(fitting.hand, fitting.toolId)} · ${GHOST_LABELS[this.state.kind]}`;
    this.code = toolGearCode(fitting.toolId, fitting.hand);
    this.fitting = null;
    controller.pulse(0.6, 40);
    this.refreshButtons();
    this.showTable(tableSettings());
    ctx.notify(`${this.readoutFor}: ${formatHandPose(pose)}`);
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
    const body = readout
      ? `${this.readoutFor} · pitch ${readout.pitch}° yaw ${readout.yaw}° roll ${readout.roll}° · ${this.code}`
      : 'Justieren drücken, Hand auf den Geist legen, Trigger';
    const line = `${title}|${body}`;
    if (line === this.lastValueText) return;
    this.lastValueText = line;
    // Beide Tafeln zeigen dasselbe: am Tisch justiert man die Hand, im Gang
    // das Werkzeug, und wer im Gang steht, läuft für seine eigenen Zahlen
    // nicht zurück in den Raum.
    const accent = readout ? 0x5ee0a0 : 0x6f7d99;
    this.valueBoard?.setText(title, body, accent);
    this.rangeBoard?.setText(title, body, accent);
  }

  /**
   * Die Griffleiste am Tisch: anfassen und schieben.
   *
   * Das ist die Hälfte, die man in der Brille braucht — die andere ist die
   * Tastatur, wenn der Zollstock danebenliegt. Gerechnet wird gegen die Höhe,
   * die beim Zupacken galt, nicht gegen die letzte Frame: sonst summieren sich
   * Rundungsfehler zu einem Tisch, der langsam davonwandert.
   */
  private updateLift(ctx: WorldContext): void {
    const table = this.table;
    if (!table) return;

    const lift = this.lift;
    if (lift) {
      const controller = ctx.input.get(lift.hand);
      if (!controller?.tracked || !controller.squeeze.pressed) {
        this.lift = null;
        table.setRailGlow(false);
        // Erst beim Loslassen in den Speicher — und dann einmal richtig.
        this.showTable(saveTableSettings({ height: this.state.height }));
        ctx.notify(`Tischhöhe: ${Math.round(this.state.height)} cm`);
        return;
      }
      handPosition(controller, _hand);
      this.showTable(
        clampTable({ ...this.state, height: lift.startHeight + (_hand.y - lift.startY) * 100 }),
      );
      table.setRailGlow(true);
      return;
    }

    let near = false;
    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand || !controller.tracked) continue;
      // Eine Hand, die gerade den Geist zieht, greift nicht nebenbei den Tisch.
      if (this.drive?.hand === hand) continue;
      handPosition(controller, _hand);
      if (table.railDistance(_hand) > RAIL_REACH) continue;
      near = true;
      if (!controller.squeeze.justPressed) continue;
      this.lift = { hand, startY: _hand.y, startHeight: this.state.height };
      controller.pulse(0.4, 25);
      break;
    }
    table.setRailGlow(near);
  }

  // --- der Schießgang -------------------------------------------------------

  /**
   * Der Gang hinter der Rückwand: Wände, Scheibe, Halter, Knöpfe, Tafel.
   *
   * Er ist bewusst schmal und **portalfrei**: hier wird gezielt und nicht
   * gespielt, und ein Portal mitten im Gang wäre das Ende jeder Messung.
   */
  private buildRange(room: THREE.Group): void {
    const { half, thickness } = ROOM;
    const z0 = half;
    const middle = z0 + LANE.length / 2;
    const width = LANE.half * 2 + thickness * 2;
    const shellGroup = this.shellGroup;

    this.slab(shellGroup, this.floorMaterial, [width, thickness, LANE.length], [0, -thickness / 2, middle], false);
    this.slab(shellGroup, this.shell, [width, thickness, LANE.length], [0, LANE.height + thickness / 2, middle], false);
    for (const sign of [-1, 1]) {
      this.slab(
        shellGroup,
        this.shell,
        [thickness, LANE.height, LANE.length],
        [sign * (LANE.half + thickness / 2), LANE.height / 2, middle],
        false,
      );
    }
    this.slab(
      shellGroup,
      this.shell,
      [width, LANE.height, thickness],
      [0, LANE.height / 2, z0 + LANE.length + thickness / 2],
      false,
    );

    const range = new ToolRange();
    range.position.set(0, 0, z0);
    room.add(range);
    this.range = range;
    // Die Scheibe hält, was auf sie geschossen wird — sonst fliegt jede Kugel
    // durch sie hindurch in die Wand, und man sieht nicht, ob man getroffen
    // hat.
    range.disc.updateWorldMatrix(true, false);
    this.physics?.addStatic(range.disc);

    // Über der Tür und zum Raum hin: man liest es, wenn man sich umdreht, und
    // nicht erst, wenn man schon drinsteht.
    const sign = new TextPlane({
      width: 1.9,
      height: 0.26,
      title: 'Schießgang',
      body: 'Werkzeug in den Halter · Hand daran · Greifen oder Trigger',
      accent: 0xffc857,
      align: 'center',
    });
    sign.position.set(0, (ROOM.height + LANE.height) / 2, z0 - thickness / 2 - 0.02);
    sign.rotation.y = Math.PI;
    room.add(sign);

    for (const [index, row] of this.rangeRows().entries()) {
      const button = this.wallButton(room, 0.92, 0.28, row.run);
      button.plane.position.set(LANE.half - 0.02, 1.92 - index * 0.34, z0 + 1.2);
      button.plane.rotation.y = -Math.PI / 2;
      button.refresh = () => row.refresh(button);
    }

    // Die Tafel hängt weiter hinten an derselben Wand: man liest sie im
    // Vorbeigehen zur Scheibe, und sie ist nichts zum Drücken.
    const values = new TextPlane({
      width: 1.2,
      height: 0.52,
      title: 'Noch nichts justiert',
      body: 'Werkzeug in den Halter, Hand daran, Greifen oder Trigger',
      accent: 0x5ee0a0,
    });
    values.position.set(LANE.half - 0.02, 1.62, z0 + 2.9);
    values.rotation.y = -Math.PI / 2;
    room.add(values);
    this.rangeBoard = values;
  }

  /** Die Knöpfe an der linken Wand des Gangs. */
  private rangeRows(): Array<{ refresh(button: WallButton): void; run(hand: Handedness | null): void }> {
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
    ];
  }

  /** Der AR-Knopf: die Welt durchsichtig, und den Himmel weg. */
  private toggleSeeThrough(): void {
    const ctx = this.context;
    if (!ctx) return;
    const on = !this.seeThrough.active;
    this.seeThrough.apply(on, ctx.scene, this.shellGroup, ctx.renderer);
    this.refreshButtons();
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
      range.setGlow(true);
      // Während der Feinjustage gehören die Knöpfe dem Geist.
      if (this.fine) return;
      const controller = ctx.input.get(mounted.hand);
      if (!controller?.tracked) return;
      if (controller.primary.justPressed) {
        this.releaseMount(true);
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

    let near = false;
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
      near = true;
      // Das eben herausgekommene Werkzeug rastet erst wieder ein, wenn es
      // einmal draußen war.
      if (this.mountBlocked === tool) continue;
      this.mountTool(tool, hand);
      break;
    }
    range.setGlow(near);
  }

  /**
   * Legt ein Werkzeug in den Halter: aus der Hand heraus, in die Aufnahme
   * hinein — und die zeigt auf die Scheibe.
   */
  private mountTool(tool: Tool, hand: Handedness): Mounted | null {
    const ctx = this.context;
    const range = this.range;
    if (!ctx || !range || !this.host?.parkTool(tool)) {
      this.context?.notify('Werkzeug lässt sich nicht ablegen');
      return null;
    }
    // `parkTool` hängt es an die Welt und lässt es stehen; hier bekommt es die
    // Lage des Halters, in dessen Raum umgerechnet.
    range.mount.updateWorldMatrix(true, false);
    this.root.updateWorldMatrix(true, false);
    _matrix.copy(this.root.matrixWorld).invert().multiply(range.mount.matrixWorld);
    _matrix.decompose(tool.position, tool.quaternion, _scale);
    tool.updateWorldMatrix(true, false);

    const mounted: Mounted = {
      tool,
      hand,
      before: {
        position: tool.holdPosition.clone(),
        rotation: tool.holdRotation.clone(),
      },
    };
    this.mounted = mounted;
    this.mountBlocked = null;
    ctx.input.get(hand)?.pulse(0.4, 25);
    this.refreshButtons();
    ctx.notify(`${tool.label} zeigt auf die Scheibe · Hand daran, dann Greifen oder Trigger`);
    return mounted;
  }

  /**
   * Der Trigger schließt ab: was zwischen Griff und Werkzeug liegt, *ist* die
   * Haltung — dieselbe Rechnung wie im Werkzeug-Justierer, nur hängt das
   * Werkzeug hier nicht irgendwo, sondern auf der Ziellinie.
   */
  private measureMount(ctx: WorldContext, controller: ControllerState, mounted: Mounted): void {
    const { tool, hand } = mounted;
    const anchor = handAnchor(controller);
    anchor.updateWorldMatrix(true, false);
    anchor.matrixWorld.decompose(_position, _rotation, _scale);
    tool.updateWorldMatrix(true, false);
    tool.matrixWorld.decompose(_toolPosition, _toolRotation, _scale);
    aimQuaternion(tool.alignToAim ? controller : null, _aim);

    this.applyHold(
      tool,
      holdPoseFrom(
        { position: _position, rotation: _rotation },
        _aim,
        { position: _toolPosition, rotation: _toolRotation },
      ),
      `${tool.label} · ${handLabel(hand)}`,
      hand,
    );

    this.mounted = null;
    this.mountBlocked = tool;
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
    savePose(tool.toolId, pose);
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
    }
    this.mounted = null;
    this.mountBlocked = mounted.tool;
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
    aimQuaternion(tool.alignToAim ? owner : null, _aim);
    tool.updateWorldMatrix(true, false);
    tool.matrixWorld.decompose(_toolPosition, _toolRotation, _scale);
    const hold: HoldPose = { position: tool.holdPosition, rotation: tool.holdRotation };
    // Der Rückweg: wo läge die Hand, wenn sie das Werkzeug so hielte, wie es
    // gerade hängt? Genau dort steht der Geist.
    const grip = gripForHold(
      { position: _toolPosition, rotation: _toolRotation },
      _aim,
      hold,
    );

    const pose = ctx.hands.editablePose(mounted.hand, tool.toolId);
    const ghost = new GhostHand(mounted.hand, pose, 0xffc857);
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
      before: {
        position: tool.holdPosition.clone(),
        rotation: tool.holdRotation.clone(),
      },
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
    mounted.before = {
      position: tool.holdPosition.clone(),
      rotation: tool.holdRotation.clone(),
    };
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
  private wallButton(
    room: THREE.Group,
    width: number,
    height: number,
    run: (hand: Handedness | null) => void,
  ): WallButton {
    const plane = new TextPlane({ width, height, title: '', accent: 0x9fe3ff, align: 'center' });
    room.add(plane);
    const button: WallButton = { plane, run, refresh: () => undefined, last: '' };
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

function handLabel(hand: Handedness): string {
  return hand === 'left' ? 'Linke Hand' : 'Rechte Hand';
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
