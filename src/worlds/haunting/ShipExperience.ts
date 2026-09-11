import * as THREE from 'three';
import './haunting.css';
// **Das Optionsmenü trägt die Klassen der 2D-Welt** (`map/optionsMenu.ts`:
// `.flat__panel`, `.flat__option`, `.flat__note`) — und deren Stil steht in
// `map/flat.css`. Der kam bisher nur mit, wenn jemand vorher einmal die
// 2D-Welt aufgemacht hatte; wer im Schiff anfing, bekam das Zahnrad als
// nackte Liste. Seit die Kopfzeile der Seite hier aus ist, führt genau dieses
// Menü zu Menü, Verbindung und VR — es darf nicht davon abhängen, wo man
// vorher war.
import './map/flat.css';
import { playTone } from '../../core/Audio';
import { ShipAudio, type ShipAudioFrame } from './shipAudio';
import { HauntingAudio, NOISE, levelLabel } from './audio';
import { pressPageButton } from '../../core/pageHud';
import {
  head,
  key,
  leaveKeys,
  note,
  renderOptions,
  SHARED,
  soundKeys,
  switchViewKey,
  watchKey,
  type OptionItem,
} from './map/optionsMenu';
import { VIEW_LABELS } from './rules/lobby';
import type { MapRound, MapSnapshot } from './map/mapSnapshot';
import type { MapGoal } from './map/mapView';
import { ObjectiveCompass } from './objectiveCompass';
import { hudTasks, hudTasksVisible, roundHud, taskPips, type HudTask } from './rules/roundHud';
import {
  archiveGoals,
  canCarryPart,
  carriedPart,
  fullHandsText,
  type DroppedPart,
} from './rules/archiveGoals';
import { LAYER_SELF_ONLY } from '../../core/PlayerAvatar';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';
import type { MenuEntry } from '../../ui/menu';
import { MirrorSurface } from '../shared/Mirror';
import { ShipEffects } from './ShipEffects';
import { CONDENSATION_FRAGMENT } from './helmetCondensation';
import { PLAN_DOOR_H, PLAN_DOOR_W } from '../editor/levelPlan';
import { TILE, dirX, dirZ } from '../nav/navTile';
import { DEFAULT_LIGHTING, lightingPreset, type BotLighting } from './botLighting';
import {
  MONSTER_FIELDS,
  TECHNICIAN_FIELDS,
  clampTuning,
  copyTuning,
  fieldText,
  type BotTuning,
} from './botTuning';
import { TrainingRun, TRAINING_DEFAULTS, inBand, type TrainingSide } from './botTraining';
import { simulationSpeedLabel } from './simulationSpeed';
import { botArchivist, describeSetup, loadSetup, powersOf } from './rules/roundSetup';
import { intentOf, INTENT_HINTS, INTENT_LABELS, INTENTS } from './rules/lobby';
import type { MonsterCue, MonsterPace } from './monsterRoutine';
import {
  APRON,
  COMMAND_LIFT,
  MARKS,
  roomAt,
  roomCode,
  roomOf,
  type HouseRoom,
  type HouseSpec,
} from './house';
import { HauntingDesktopControls } from './desktopControls';
import { HauntingComfort } from './HauntingComfort';
import { FlashlightTool } from '../portal/tools/FlashlightTool';
import { XrayTool } from '../portal/tools/XrayTool';
import { addOutline, removeOutline, type OutlineLook } from '../../core/outlineShell';
import { RadarTool } from '../portal/tools/RadarTool';
import type { Tool } from '../portal/tools/Tool';
import { stationLayout, safeRoomSpawn } from './stationLayout';
import {
  buildBrokenLocker,
  buildCargoCabinet,
  buildSafetyLocker,
  LOCKER_SIZE,
} from './fixtureModels';
import { CabinWreck } from './rules/cabinWreck';
import { cargoKey, cargoLabel, cargoOf, type CargoMark } from './rules/cargo';
import { CARGO_OPEN_SECONDS, choreProgress, stepChore, type Chore } from './rules/chore';
import { archiveRadio } from './rules/archiveRadio';
import {
  COMMAND_HOME,
  TRAINING_ROOMS,
  TRAINING_DOOR,
  trainingRoomAt,
  trainingSpawn,
  type TrainingRoomId,
} from './trainingLayout';
import { buildTrainingDeck } from './trainingDeck';
import {
  MONSTERS,
  PLAYER_SPRINT_SPEED,
  PLAYER_WALK_SPEED,
  ROOM_COUNTS,
  lockerCode,
  puzzleFor,
  puzzleSolved,
  repairsFor,
  type Repair,
  type PuzzleState,
  type StationOptions,
} from './mission';
import { SHIP, animateCreature, buildCrewmate, label } from './shipArt';
import type { HauntState } from './net';
import type { RoutePath, RoutePose } from './navmesh/route';
import { MissionBot } from './missionBot';
import { ShipControls } from './world3d/shipControls';

interface ShipHost {
  ctx: WorldContext;
  spec(): HouseSpec;
  state(): HauntState;
  say(text: string): void;
  configure(options: StationOptions): void;
  start(): void;
  test(): void;
  stations?(): void;
  /**
   * **Die Ansicht wechseln, mitten in der Runde** (`HauntingWorld.switchView`).
   * Im Schiff gibt es dafür genau einen Knopf — „2D von oben" —, und er steht
   * nur im Panel des Technikers: Wer nicht spielt, hat nichts zu wechseln.
   */
  switchView?(view: '2d' | '3d'): void;
  door(id: string): void;
  doorOpen?(id: string): boolean;
  doorLocked?(id: string): boolean;
  travel(at: THREE.Vector3): void;
  route(from: RoutePose, room: HouseRoom): RoutePath | null;
  routeTo?(from: RoutePose, target: { x: number; z: number }): RoutePath | null;
  routeVersion?(): number;
  danger?(pose: RoutePose): { x: number; z: number } | null;
  visible?(from: { x: number; z: number }, to: { x: number; z: number }): boolean;
  /** Die Gewichte beider Bots und ihr Zeitraffer — nur in der Bot-Runde. */
  tuning?(): BotTuning;
  retune?(tuning: BotTuning): void;
  simulationSpeed?(): number;
  cycleSimulationSpeed?(): number;
  /** Wie das Deck in der Bot-Runde ausgeleuchtet ist. */
  lighting?(): BotLighting;
  setLighting?(lighting: Partial<BotLighting>): void;
  equip?(id: 'flashlight' | 'xray' | 'radar' | 'off', hand: Handedness): void;
  carried?(hand: Handedness): Tool | null;
  floatingTorch?(): FlashlightTool | null;
  takeFloatingTorch?(): void;
  /** Der Stand als Karte und der Gang des Monsters — für das Hörmodell (`audio/`). */
  mapSnapshot?(): MapSnapshot;
  /** Die Ziele des Technikers, das nächste zuerst — für den Kompass am oberen Bildrand. */
  objectives?(): MapGoal[];
  monsterPace?(): MonsterPace;
  /** Sauerstoff, Anzug-Leben und Kabinen der laufenden Runde (`rules/`). */
  round?(): MapRound | null;
  /** Ein Geräusch des Spielers für die Ohren des Monsters (`audio/cues.ts`, `NOISE`). */
  noise?(at: { x: number; z: number }, loudness: number): void;
}
interface Screen {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
}
interface Cabinet {
  id: string;
  room: string;
  group: THREE.Group;
  leaf: THREE.Mesh;
  /** Was drinliegt — bei einer leeren Kiste nichts, und dann fehlt auch das Modell. */
  loot: string;
  /** Was von außen draufsteht: „Kiste 2 · blau". */
  mark: string;
  /** Woran hängt, ob die Kiste erledigt ist (`cargoKey`). */
  key: string;
  lootMesh: THREE.Object3D | null;
  scanner: THREE.Object3D;
  scanSubject: { object: THREE.Object3D } | null;
  at: THREE.Vector3;
  leafY: number;
  leafHeight: number;
}
interface Locker {
  id: string;
  group: THREE.Group;
  leaf: THREE.Mesh;
  leafY: number;
  leafHeight: number;
  code: string;
  open: boolean;
  /** Die Teile des heilen Modells — unsichtbar, solange die Kabine ein Wrack ist. */
  parts: THREE.Object3D[];
  /** Das Wrack-Modell (`buildBrokenLocker`), solange die Kabine zerstört ist. */
  wreck: THREE.Group | null;
  /**
   * **Die Schlitze vor den Augen**, solange man drinsteckt — gebaut beim
   * ersten Verstecken, danach nur noch ein- und ausgeblendet.
   */
  slits: THREE.Group | null;
  /** Was den Geist wieder zum Schrank macht — `null`, solange niemand drinsteckt. */
  ghost: (() => void) | null;
}

/** Wie durchsichtig der Schrank von innen ist — ein Geist, kein Glas. */
const LOCKER_GHOST_OPACITY = 0.28;
interface Door {
  id: string;
  leaves: [THREE.Mesh, THREE.Mesh];
  amount: number;
  at: THREE.Vector3;
  panel: Screen;
  light: THREE.MeshBasicMaterial;
}
interface Console {
  repair: Repair;
  screen: Screen;
  at: THREE.Vector3;
  selected: number;
  training?: boolean;
  practice?: PuzzleState;
  solved?: boolean;
}
const _head = new THREE.Vector3(),
  _pos = new THREE.Vector3(),
  _direction = new THREE.Vector3(),
  _walk = new THREE.Vector3(),
  _side = new THREE.Vector3(),
  _wish = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
/**
 * **Der Saum um die Zielkiste** (`core/outlineShell.ts`) — dasselbe Gelb wie
 * das Randdreieck auf der Karte und der Kompass, damit „das da vorn" und „das
 * am Bildrand" erkennbar dieselbe Sache sind. Schmal gehalten: Ein breiter
 * Saum macht aus einer Kiste auf zehn Metern einen gelben Klotz.
 */
const GOAL_SEAM: OutlineLook = { width: 0.014, maxGrow: 0.05, color: 0xffd84a };
/**
 * Wie weit das Röntgengerät die Kennzeichen einblendet, in Metern.
 *
 * Es ist ein Gerät für den Raum, in dem man steht, und keine Stationskarte:
 * Wer damit von der Tür aus alle vierzig Kisten lesen könnte, bräuchte weder
 * Archivar noch Suche. Acht Meter sind die lange Seite eines Raums.
 */
const XRAY_LABEL_RANGE = 8;
const PANEL_RANGE = 3.5;
const HAND_LABEL = {
  off: 'frei',
  flashlight: 'Taschenlampe',
  radar: 'Radar',
  xray: 'Röntgengerät',
  medkit: 'Medkit',
  part: 'Ersatzteil',
} as const;

/** Station-only interactions. All game state belongs to the VR host snapshot. */
export class ShipExperience {
  readonly root = new THREE.Group();
  readonly bay = new THREE.Group();
  private readonly targets: THREE.Object3D[] = [];
  private readonly screens: Screen[] = [];
  private readonly cabinets: Cabinet[] = [];
  /**
   * **Die Kiste, die gerade den Saum trägt**, und die Netze, an denen er hängt
   * (`core/outlineShell.ts`). Gemerkt wird beides, weil der Durchlauf über die
   * Szene (`core/graphicsScene.ts`) jede Sekunde seine eigene, schwarze Kontur
   * darüberlegt: Sie jedes Bild neu einzustellen ist billig, sie jedes Bild an
   * allen vierzig Kisten abzuräumen wäre es nicht.
   */
  private seamOn = '';
  private readonly seams: THREE.Mesh[] = [];
  private readonly doors: Door[] = [];
  private readonly lockers: Locker[] = [];
  private readonly desktop: HauntingDesktopControls;
  private readonly comfort: HauntingComfort | null;
  private readonly torch = new THREE.Group();
  private readonly heldLamp = new FlashlightTool();
  /**
   * **Die zweite Taschenlampe — die in der linken Hand.**
   *
   * Am Gürtel hängt sie an beiden Hüften (`HauntingWorld.beltLoadout`), und
   * am Schirm muss sie deshalb auch in beide Hände passen. Es ist ein zweites
   * Exemplar und nicht dasselbe umgehängt: Ein Modell kann nur an einer
   * Stelle im Szenengraph hängen, und „umhängen" wäre genau der Weg, auf dem
   * eine Lampe verloren geht.
   */
  private readonly leftLamp = new FlashlightTool();
  private readonly handheldRadar = new RadarTool();
  private readonly handheldXray = new XrayTool();
  private readonly scanner = new THREE.Group();
  private floatingTorch: FlashlightTool | null = null;
  private interactionCooldown = 0;
  /**
   * **Der Handgriff, der gerade läuft** (`rules/chore.ts`) — heute nur das
   * Aufklappen einer Kiste. Er steht hier und nicht im Stand der Runde: Ein
   * halb offener Deckel ist nichts, was über die Leitung gehen müsste, und
   * wer die Ansicht wechselt, fängt ihn ohnehin neu an.
   */
  private chore: Chore | null = null;
  /**
   * **Was der Archivar zuletzt gefunkt hat** (`rules/archiveRadio.ts`) — der
   * Schlüssel seiner Lage, nicht der Satz. Ein Funkgerät, das alle zwei
   * Sekunden dasselbe sagt, schalten Menschen ab.
   */
  private radioed = '';
  private readonly heldMedkit = new THREE.Group();
  /** Das Ersatzteil in der Hand — sichtbar, solange der Techniker eines trägt. */
  private readonly heldPart = new THREE.Group();
  /**
   * Die Ersatzteile, die im Gang liegen, als Modelle — je Teil eines, gebaut
   * beim ersten Ablegen und danach nur noch ein- und ausgeblendet. Was wo
   * liegt, steht im Stand (`HauntState.dropped`) und nicht hier: Diese Karte
   * ist die Anzeige dazu und nicht die Wahrheit.
   */
  private readonly droppedParts = new Map<string, THREE.Object3D>();
  private rightItem: 'flashlight' | 'medkit' | 'part' | 'off' = 'flashlight';
  /**
   * **Ob die Lampe in der rechten Hand brennt.** Bis hierher gab es dafür
   * keinen Schalter: Die Lampe leuchtete, sobald sie in der Hand lag, und aus
   * war sie nur, wenn man die Hand leerte (`cycleRight`). Wer wissen wollte,
   * ob er gerade Licht macht, musste an die Wand schauen — und wer es
   * ausmachen wollte (das Monster sieht eine brennende Lampe, `threat.ts`),
   * verlor dabei das Gerät aus der Hand. Jetzt ist es ein eigener Zustand,
   * und „Benutzen" legt ihn um, wenn nichts vor einem liegt.
   */
  private torchLit = true;
  /** Bilder, die ein Druck auf „Benutzen" noch auf seinen Strahl wartet (`armUse`). */
  private usePending = 0;
  /** Ob dieser Druck etwas getroffen hat. */
  private useHit = false;
  private labMirror: MirrorSurface | null = null;
  private visibleRooms: ReadonlySet<string> | null = null;
  private readonly crosshair = document.createElement('div');
  private readonly consoles: Console[] = [];
  private readonly effects = new ShipEffects();
  private readonly audioHead = new THREE.Vector3();
  private hasAudioHead = false;
  /** Wann welches Wrack Funken wirft (`rules/cabinWreck.ts`). */
  private readonly wreckClock = new CabinWreck();
  private readonly suit = new THREE.Group();
  private readonly wound = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.13),
    new THREE.MeshBasicMaterial({ color: 0x942e35, transparent: true, opacity: 0.88 }),
  );
  private readonly visor: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly status: Screen;
  /** Sauerstoff und Anzug-Leben, nur in der Brille (`paintHud`). */
  private readonly hud: Screen;
  private readonly command: Screen;
  private readonly dom = document.createElement('section');
  /**
   * **Der Stock und die drei Knöpfe der 2D-Welt** über der 3D-Szene
   * (`world3d/shipControls.ts`) — dieselbe Steuerung, ob man die Station von
   * oben oder von innen spielt. Nur im Browser: In der Brille hat man
   * Controller, und ein Knopf im DOM ist dort unsichtbar.
   */
  private controls: ShipControls | null = null;
  /**
   * **Das Optionsmenü der 2D-Welt, hier über dem Schiff** (`map/optionsMenu.ts`)
   * — nur im Browser. In der Brille gibt es das Handgelenkmenü, und ein Panel
   * im DOM ist dort unsichtbar. Der Rahmen trägt die Klassen der 2D-Welt,
   * damit `flat.css` das Panel an dieselbe Stelle setzt wie dort.
   */
  private readonly optionsRoot = document.createElement('div');
  private readonly optionsPanel = document.createElement('div');
  private optionsOpen = false;
  /**
   * **Ob die Tafel zugeklappt ist.** Sie steht links über der Station, und
   * links steht auch die Station: Wer zielt, will sehen, worauf. Zugeklappt
   * bleibt die Titelzeile — Anzug, Systeme, Sauerstoff —, dazu die zwei
   * Knöpfe, die wieder hinausführen: aufklappen und das Zahnrad. Der Stand
   * überlebt jedes Neuzeichnen (`paintDom` baut den Inhalt bei jeder Änderung
   * neu), nicht aber das Verlassen der Welt.
   */
  private folded = false;
  /** Ob „Mission, Ausrüstung & Testdeck" offen stand, als zugeklappt wurde. */
  private mainOpen = false;
  /** Dasselbe für das Testdeck darin. */
  private testsOpen = false;
  /** Der Kompass am oberen Bildrand — nur am Desktop; in der Brille gibt es ihn (noch) nicht. */
  private compass: ObjectiveCompass | null = null;
  private sensorMode: 'off' | 'flashlight' | 'radar' | 'xray' = 'off';
  private audioOn = true;
  private readonly audio = new ShipAudio();
  private readonly hearingAudio = new HauntingAudio();
  private readonly audioFrame: ShipAudioFrame = {
    listener: { x: 0, z: 0 },
    forward: { x: 0, z: -1 },
    monster: null,
    kind: 'stalker',
    active: false,
    test: true,
    venting: false,
  };
  private readonly lastSoundAt = new THREE.Vector3();
  private actionHand: Handedness | null = null;
  private focusedTarget: THREE.Object3D | null = null;
  private audioTimer = 0;
  private paintTimer = 0;
  /** Der Streifen in der Brille wird einmal je Sekunde gemalt — öfter springt die Uhr nicht. */
  private hudTimer = 0;
  private effectTimer = 0;
  private stamp = '';
  private hiddenWas = false;
  private savedRigFrozen = false;
  private missionBot: MissionBot | null = null;
  /**
   * Die Justage-Tafel wird **einmal** gebaut und danach nur noch umgehängt.
   *
   * Der Rest der Anzeige entsteht bei jeder Änderung neu, und das ist dort
   * richtig. Hier wäre es falsch: Ein Schieberegler, der beim Ziehen dreißigmal
   * je Sekunde durch einen neuen ersetzt wird, lässt sich nicht ziehen.
   */
  private readonly tunePanel = document.createElement('details');
  private tunePanelReady = false;
  private readonly tuneLabels = new Map<string, HTMLElement>();
  private readonly tuneInputs = new Map<string, HTMLInputElement>();
  private training: TrainingRun | null = null;
  private trainingNote = '';
  private trainingLine: HTMLElement | null = null;
  private trainedAt = 0;
  private simulated: THREE.Object3D | null = null;
  private followBot = true;
  private readonly followEye = new THREE.Vector3();
  private readonly followTarget = new THREE.Vector3();
  private readonly messages: string[] = [];
  private flatFlight = 0;
  private disposed = false;
  private readonly bayLight = new THREE.PointLight(0xddefff, 0, 6, 2);
  private readonly suitColors = new Map<THREE.MeshStandardMaterial, THREE.Color>();
  private suitImmersive: boolean | null = null;
  private readonly lockerHome = new THREE.Vector3();

  constructor(private readonly host: ShipHost) {
    this.root.name = 'orbital-interactions';
    this.comfort = this.player
      ? new HauntingComfort({
          rig: host.ctx.rig,
          camera: host.ctx.camera,
          input: host.ctx.input,
          presenting: () => host.ctx.renderer.xr.isPresenting,
          enabled: () => !host.ctx.menu.isOpen,
          changed: () => host.ctx.refreshWorldMenu(),
        })
      : null;
    this.command = this.screen(2.8, 1.5, 768);
    this.command.mesh.position.set(-3.2, 1.7, APRON.z * TILE + 0.25);
    this.root.add(this.command.mesh);
    this.bind(this.command.mesh, (uv) => {
      if (!uv) return;
      const index = Math.floor((1 - uv.y) * 6);
      this.commandAction(index);
    });
    this.buildCabinets();
    this.buildConsoles();
    this.buildDoors();
    this.buildBay();
    this.status = this.screen(1.1, 0.62, 768);
    this.status.mesh.name = 'mission-status-panel';
    this.status.mesh.position.set(0, 0, -1.2);
    this.status.mesh.visible = false;
    this.status.mesh.material.depthTest = false;
    this.status.mesh.renderOrder = 999;
    host.ctx.camera.add(this.status.mesh);
    this.bind(this.status.mesh, () => {
      if (this.crew.hidden) this.leaveLocker();
      else if (['lost', 'won'].includes(this.host.state().phase)) this.host.start();
    });
    // **Der Streifen im Blickfeld**: In der Brille ist das DOM unsichtbar, und
    // der Statusschirm kommt nur im Versteck und am Ende. Sauerstoff, Anzug und
    // die drei Aufträge müssen aber die ganze Runde da sein — klein, unten im
    // Blickfeld, an der Kamera wie `status`, ohne Tiefentest, damit keine Wand
    // ihn verdeckt.
    //
    // **Er hängt auch am Desktop dort.** Vorher gab es ihn nur im Headset, und
    // wer die Station am Bildschirm spielte, las seinen Sauerstoff aus einer
    // Zeile im Menü und seine Aufträge aus gar nichts. Zwei Zeilen wie in der
    // 2D-Welt (`map/flatMode.ts`), aus derselben Rechnung (`rules/roundHud.ts`).
    this.hud = this.screen(0.42, 0.15, 640);
    this.hud.mesh.name = 'mission-hud-strip';
    this.hud.mesh.position.set(0, -0.34, -1);
    this.hud.mesh.visible = false;
    this.hud.mesh.material.depthTest = false;
    this.hud.mesh.material.transparent = true;
    this.hud.mesh.renderOrder = 999;
    host.ctx.camera.add(this.hud.mesh);
    this.visor = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 1.25),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms: { fogAmount: { value: 0 }, damage: { value: 0 }, time: { value: 0 } },
        vertexShader:
          'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: CONDENSATION_FRAGMENT,
      }),
    );
    this.visor.name = 'helmet-condensation';
    this.visor.position.z = -0.58;
    this.visor.renderOrder = 998;
    if (host.ctx.role === 'vr') {
      host.ctx.camera.add(this.visor);
      this.buildSuit();
      host.ctx.wear('helmet');
      this.dom.className = 'orbital-player';
      this.dom.setAttribute('aria-label', 'Haunting Spielsteuerung');
      this.dom.addEventListener('click', this.domClick);
      this.crosshair.className = 'orbital-crosshair';
      this.crosshair.setAttribute('aria-hidden', 'true');
      this.optionsRoot.className = 'flat orbital-options';
      this.optionsRoot.hidden = true;
      this.optionsPanel.className = 'flat__panel';
      this.optionsPanel.setAttribute('aria-label', 'Optionen');
      this.optionsPanel.addEventListener('click', (event) => this.optionsClick(event));
      this.optionsRoot.append(this.optionsPanel);
      // **Die Kopfzeile der Seite geht aus, solange das Schiff läuft**
      // (`haunting.css`, `body.orbital-on #hud`). Sie lag mit `z-index: 5`
      // über dem oberen Rand, den diese Welt selbst braucht — Kompass und
      // Tafel —, und sagte dort dasselbe dreimal: Menü, Verbindung und VR
      // stehen im Zahnrad der Tafel (`shipOptions`). Eine Klasse und kein
      // `hidden`, weil die Seite ihr `hidden` beim Verlassen der Brille selbst
      // wieder setzt (`main.ts`, `onSessionChanged`) und den Streifen sonst
      // mitten in der Runde zurückholte.
      document.body.classList.add('orbital-on');
      document.body.append(this.dom, this.crosshair, this.optionsRoot);
      if (host.objectives) {
        this.compass = new ObjectiveCompass();
        document.body.append(this.compass.element);
      }
    }
    this.root.add(this.bay, this.effects.root);
    this.root.add(this.bayLight);
    this.buildTorch();
    this.desktop = new HauntingDesktopControls({
      rig: host.ctx.rig,
      pointer: host.ctx.pointer,
      enabled: () => this.player && !host.ctx.menu.isOpen,
      presenting: () => host.ctx.renderer.xr.isPresenting,
      simulation: () => this.crew.simulation && !this.followBot,
      canMove: () =>
        (this.crew.simulation || !this.crew.hidden) &&
        this.crew.hp > 0 &&
        (!this.crew.simulation || !this.followBot),
      cycleHand: (hand) => (hand === 'left' ? this.cycleSensor() : this.cycleRight()),
      drop: () => this.dropPart(),
      interact: () => {
        if (['lost', 'won'].includes(this.host.state().phase)) {
          this.host.start();
          return true;
        }
        if (this.crew.hidden && !this.crew.simulation) {
          this.leaveLocker();
          return true;
        }
        if (this.rightItem === 'medkit') {
          this.heal();
          return true;
        }
        // **Auf nichts gezielt? Dann ist Benutzen der Lichtschalter.** Ob
        // wirklich nichts vor einem liegt, sagt aber erst der Strahl, den
        // `desktopControls` gleich darauf auslöst — also wird der Druck nur
        // vorgemerkt (`armUse`) und zwei Bilder später abgerechnet.
        this.armUse();
        return false;
      },
    });
    // Die Steuerung der 2D-Welt, hier über der Szene: nur für den, der wirklich
    // läuft, und nur im Browser (`world3d/shipControls.ts`).
    if (this.player)
      this.controls = new ShipControls({
        interact: () => this.pressUse(),
        cycleLeft: () => this.cycleSensor(),
        cycleRight: () => this.cycleRight(),
      });
    this.paint();
  }

  /**
   * **Der große Knopf.** Er tut genau das, was am Desktop das `E` tut: erst
   * die Sonderfälle (eine zu Ende gespielte Runde, ein Schutzschrank, ein
   * Medkit in der Hand), sonst löst er das aus, worauf man zielt — über
   * denselben Zeiger, auf dem auch der Trigger der Brille sitzt. Ein zweiter
   * Weg dorthin wäre ein zweiter Weg, der irgendwann anders aussieht.
   */
  private pressUse(): void {
    if (['lost', 'won'].includes(this.host.state().phase)) {
      this.host.start();
      return;
    }
    if (this.crew.hidden && !this.crew.simulation) {
      this.leaveLocker();
      this.paint();
      return;
    }
    if (this.rightItem === 'medkit') {
      this.heal();
      return;
    }
    // **Liegt nichts vor einem, macht dieser Knopf das Licht.** Der Besitzer
    // hat es so bestellt: „Wenn ich auf keine Kiste oder Tür schaue, will ich
    // mit Benutzen die Taschenlampe an- und ausmachen können." Auf dem
    // Telefon ist das der einzige Lichtschalter, der nicht in einem Menü
    // liegt; am Desktop tut `E` dasselbe.
    this.armUse();
    const pointer = this.host.ctx.pointer;
    pointer.setKeyboardTrigger(true);
    pointer.setKeyboardTrigger(false);
  }

  /**
   * **Einen Druck auf „Benutzen" vormerken.**
   *
   * Ob etwas vor einem liegt, weiß hier niemand: Der Zeiger malt seinen
   * Strahl erst im nächsten Bild (`Pointer.update`), und der gemerkte
   * Hover-Zustand (`focusedTarget`) hängt am Finger auf der Leinwand und ist
   * nach dem Loslassen leer — ein zweiter Strahl nur zum Nachsehen wäre ein
   * zweiter Weg, der irgendwann anders zielt als der erste.
   *
   * Also zählt dieser Druck zwei Bilder ab. Trifft der Strahl in dieser Zeit
   * etwas (`bind`, `onSelect` setzt `useHit`), war es ein Handgriff und sonst
   * nichts. Trifft er nichts, war „Benutzen" gemeint als Lichtschalter.
   */
  private armUse(): void {
    if (this.crew.simulation || this.crew.hidden || this.crew.hp <= 0) return;
    this.useHit = false;
    this.usePending = 2;
  }

  /** Die Abrechnung dazu, einmal je Bild (`update`). */
  private stepUse(): void {
    if (this.usePending === 0) return;
    this.usePending -= 1;
    if (this.usePending > 0 || this.useHit) return;
    // Ein Handgriff, der gerade läuft (eine Kiste geht auf), ist auch einer:
    // Wer dabei noch einmal drückt, will nicht das Licht umlegen.
    if (this.busy) return;
    this.toggleTorch();
  }

  /**
   * **Der Stock bewegt das Rig.** Dieselbe Rechnung wie in `FlatControls`:
   * Blickrichtung flach, quer dazu die Seite, beides mit dem Stock gewichtet.
   * Gesetzt wird nur, solange der Daumen liegt — sonst nähme dieser Stock der
   * Tastatur jedes Bild wieder den Wunsch weg, den sie gerade gesetzt hat.
   *
   * Getempo wie überall in dieser Runde (`mission.ts`): Arbeitstempo, und
   * jenseits des Sprintrings das Fluchttempo. Wer die 2D-Welt gespielt hat,
   * läuft hier genauso schnell.
   */
  private stepStick(): void {
    const controls = this.controls;
    if (!controls || controls.hidden) return;
    const stick = controls.move;
    if (stick.magnitude <= 0) return;
    const crew = this.crew;
    if (crew.hp <= 0 || (!!crew.hidden && !crew.simulation) || crew.simulation) return;
    const rig = this.host.ctx.rig;
    rig.getHeadForward(_walk);
    _side.copy(_walk).cross(UP).normalize();
    _wish.set(0, 0, 0).addScaledVector(_walk, -stick.z).addScaledVector(_side, stick.x);
    if (_wish.lengthSq() > 1) _wish.normalize();
    rig.setIntent(
      _wish.multiplyScalar(stick.sprint ? PLAYER_SPRINT_SPEED : PLAYER_WALK_SPEED),
      false,
    );
  }

  /** Was auf den drei Knöpfen steht — Hände und das Ding vor einem. */
  private paintControls(): void {
    const controls = this.controls;
    if (!controls) return;
    const ctx = this.host.ctx;
    const crew = this.crew;
    controls.hidden =
      ctx.renderer.xr.isPresenting || ctx.menu.isOpen || crew.simulation || crew.hp <= 0;
    if (controls.hidden) return;
    const label = this.crosshair.dataset.label ?? '';
    controls.setLabels({
      left: this.keyLabel('left'),
      right: this.keyLabel('right'),
      // „E: Benutzen" ist die Beschriftung des Fadenkreuzes; auf dem Knopf
      // steht das `E` nicht, denn dort drückt man mit dem Daumen.
      target: this.focusedTarget ? label.replace(/^E:\s*/, '') : '',
      // Und wenn nichts vor einem liegt, steht auf dem Knopf, was er dann tut.
      idle: this.rightItem === 'flashlight' && this.torchLit ? 'Licht aus' : 'Licht an',
    });
  }

  private get crew() {
    return this.host.state().crew;
  }
  private get player(): boolean {
    return this.host.ctx.role === 'vr';
  }
  private get active(): boolean {
    const phase = this.host.state().phase;
    return this.player && (phase === 'running' || this.crew.options.test) && !this.crew.simulation;
  }

  private screen(width: number, height: number, pixels = 512): Screen {
    const canvas = document.createElement('canvas');
    canvas.width = pixels;
    canvas.height = Math.round((pixels * height) / width);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    );
    const screen = { mesh, canvas, ctx: canvas.getContext('2d')!, texture };
    this.screens.push(screen);
    return screen;
  }
  private bind(
    object: THREE.Object3D,
    action: (uv: THREE.Vector2 | null) => void,
    wearable = false,
  ): void {
    if (!this.player) return;
    this.targets.push(object);
    this.host.ctx.pointer.add({
      object,
      ignore: (hand) => wearable && hand === 'left',
      onHover: () => {
        this.host.ctx.rig.getHeadPosition(_head);
        object.getWorldPosition(_pos);
        if (_head.distanceTo(_pos) > PANEL_RANGE || (this.crew.simulation && !wearable)) {
          if (this.focusedTarget === object) {
            this.focusedTarget = null;
            this.crosshair.dataset.label = '';
          }
          return;
        }
        this.focusedTarget = object;
        const text = object.userData.interactionLabel as string | undefined;
        if (this.crosshair.dataset.label !== (text ?? 'E: Benutzen'))
          this.crosshair.dataset.label = text ?? 'E: Benutzen';
      },
      onBlur: () => {
        if (this.focusedTarget === object) {
          this.focusedTarget = null;
          this.crosshair.dataset.label = '';
        }
      },
      onSelect: (hit) => {
        this.host.ctx.rig.getHeadPosition(_head);
        object.getWorldPosition(_pos);
        // Zu weit weg ist wie nichts: Was drei Meter entfernt im Strahl liegt,
        // hat man nicht vor sich (`armUse` macht daraus den Lichtschalter).
        if (_head.distanceTo(_pos) > PANEL_RANGE || (this.crew.simulation && !wearable)) return;
        // **In Reichweite — also ein Handgriff.** Auch dann, wenn er gleich
        // abgewiesen wird: Wer zweimal schnell auf dieselbe Tür drückt, meint
        // beim zweiten Mal die Tür und nicht das Licht (`armUse`).
        this.useHit = true;
        if (this.interactionCooldown > 0) return;
        if (this.crew.hidden && !this.crew.simulation) {
          this.leaveLocker();
          this.paint();
          return;
        }
        this.lastSoundAt.copy(hit.point);
        this.actionHand = hit.hand;
        action(hit.uv);
        this.comfort?.pulse('interact', hit.hand);
        this.paint();
      },
    });
  }
  private mesh(
    size: [number, number, number],
    color: number,
    parent: THREE.Object3D,
    at: [number, number, number],
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.25 }),
    );
    mesh.position.set(...at);
    parent.add(mesh);
    return mesh;
  }

  private buildCabinets(): void {
    const spec = this.host.spec();
    const layout = stationLayout(spec);
    // Was in welcher Kiste liegt, würfelt das Schiff nicht mehr selbst: Es
    // liest dieselbe Liste wie Karte, Netz und Archiv (`rules/cargo.ts`).
    for (const slot of cargoOf(spec)) {
      const at = layout.find((p) => p.id === slot.id);
      if (!at) continue;
      this.cabinet(
        slot.id,
        slot.roomId,
        new THREE.Vector3(at.x, 0, at.z),
        slot.loot.kind === 'empty' ? '' : cargoKey(slot),
        at.yaw,
        cargoLabel(slot),
        cargoKey(slot),
        slot.mark,
      );
    }
    for (const room of spec.rooms) {
      const safe = layout.find((p) => p.id === `locker-${room.id}`)!;
      this.locker(
        room.id,
        new THREE.Vector3(safe.x, 0, safe.z),
        safe.yaw,
        lockerCode(spec.seed, room.id),
      );
    }
    this.cabinet('test-supply', '', new THREE.Vector3(2.8, 0, APRON.z * TILE + 0.7), 'test-kit');
  }
  private cabinet(
    id: string,
    room: string,
    at: THREE.Vector3,
    loot: string,
    yaw = 0,
    mark = 'Fracht',
    key = loot || id,
    badgeMark?: CargoMark,
  ): void {
    const { root: g, door: leaf, lootMount, screenMount } = buildCargoCabinet(badgeMark);
    g.position.copy(at);
    g.rotation.y = yaw;
    g.name = id;
    // Das Kennzeichen steht außen auf dem Blatt — als Farbband und Nummer am
    // Modell (`fixtureModels.buildCargoCabinet`) und hier noch einmal in
    // Schrift: Wer „Kiste 2, blaues Band" zugerufen bekommt, muss beides an
    // der Kiste wiederfinden können, im Licht wie im Kegel der Lampe.
    const badge = label(loot === 'test-kit' ? 'TESTAUSRÜSTUNG' : mark.toUpperCase(), 0.65, 0.13);
    badge.position.copy(screenMount).sub(leaf.position);
    leaf.add(badge);
    // **Eine leere Kiste bekommt kein Modell und kein Schild.** Sie ist von
    // außen keine andere Kiste als die volle — das ist der ganze Sinn —, und
    // wer sie aufmacht, sieht nichts, statt ein leeres Regal mit Beschriftung.
    const lootMesh = loot
      ? this.mesh([0.28, 0.16, 0.22], loot === 'medkit' ? 0xc9ddcb : SHIP.amber, g, [
          lootMount.x,
          lootMount.y,
          lootMount.z,
        ])
      : null;
    // **Hier hing einmal ein amberfarbenes Schild mit dem Inhalt am Schrank**,
    // dauerhaft sichtbar, quer durch den halben Raum lesbar. Es war das
    // größte Leck: Solange es hing, war jede Frage an den Archivar überflüssig
    // — und bei einem Menschen am Archiv wäre es sein ganzer Platz gewesen.
    // Was drin liegt, sagt jetzt das Röntgengerät (`scanner`) oder die offene
    // Kiste selbst.
    const scanner = label(mark, 0.7, 0.16, SHIP.cyan);
    scanner.material.depthTest = false;
    scanner.material.transparent = true;
    scanner.material.opacity = 0.85;
    scanner.position.set(0, 0.75, 0.34);
    scanner.renderOrder = 50;
    scanner.visible = false;
    g.add(scanner);
    this.cabinets.push({
      id,
      room,
      group: g,
      leaf,
      loot,
      mark,
      key,
      lootMesh,
      scanner,
      scanSubject: lootMesh ? { object: lootMesh } : null,
      at,
      leafY: leaf.position.y,
      leafHeight: 1.15,
    });
    g.userData.roomId = room;
    this.root.add(g);
    leaf.userData.interactionLabel = 'E: Frachtschrank öffnen / schließen';
    this.bind(leaf, () => this.openCabinet(id));
    if (lootMesh) {
      lootMesh.userData.interactionLabel = `E: ${lootLabel(this.host.spec(), loot)} nehmen`;
      this.bind(lootMesh, () => this.takeLoot(id));
    }
  }
  /**
   * **Eine Kiste aufklappen kostet fünf Sekunden** (`rules/chore.ts`) — und
   * wer dabei losgeht, hat sie umsonst getan. Umschauen ist erlaubt: Gemessen
   * wird die Stelle, nicht der Blick.
   *
   * Zumachen und Hineinsehen kosten nichts: Der Deckel ist schon offen, und
   * eine zweite Wartezeit vor „Leer." wäre nur eine Strafe fürs Nachsehen.
   */
  private openCabinet(id: string): void {
    if (!this.active) return;
    if (this.chore) {
      // Derselbe Knopf bricht ab — sonst wird man den Balken nur los, indem
      // man wegläuft.
      const stopped = this.chore;
      this.chore = null;
      this.host.say(`${stopped.label} abgebrochen.`);
      if (stopped.id === id) return;
    }
    if ((id === 'test-supply' || id.startsWith('training')) && !this.crew.options.test) {
      this.host.say('Testschrank: zuerst TEST / OHNE MONSTER drücken.');
      return;
    }
    const box = this.cabinets.find((c) => c.id === id);
    if (!this.crew.opened.includes(id)) {
      this.host.ctx.rig.getHeadPosition(_head);
      this.chore = {
        kind: 'cargo',
        id,
        label: `${box?.mark ?? 'Kiste'} öffnen`,
        at: { x: _head.x, z: _head.z },
        left: CARGO_OPEN_SECONDS,
        total: CARGO_OPEN_SECONDS,
      };
      return;
    }
    if (box && !box.loot && !this.crew.inventory.includes(box.key)) {
      // **Die leere Kiste kostet zwei Griffe.** Aufmachen macht Geräusch,
      // Hineinsehen kostet den zweiten Moment — und erst danach ist sie
      // erledigt und leuchtet nirgends mehr als Ziel.
      this.crew.inventory.push(box.key);
      this.host.say('Leer.');
      this.sound('door');
      return;
    } else this.crew.opened = this.crew.opened.filter((x) => x !== id);
    this.sound('door');
  }
  /**
   * **Den laufenden Handgriff weiterzählen** (`rules/chore.ts`). Abgebrochen
   * wird, wer sich von der Stelle rührt — ein gedrehter Kopf zählt nicht —,
   * und auch, wer sich versteckt oder die Runde verlässt.
   */
  private stepChore(dt: number, head: THREE.Vector3): void {
    const chore = this.chore;
    if (!chore) return;
    const steady =
      this.active && !!this.player && !this.crew.hidden && this.host.state().phase === 'running';
    const step = stepChore(chore, dt, { x: head.x, z: head.z }, steady);
    if (step.kind === 'running') {
      this.chore = step.chore;
      return;
    }
    this.chore = null;
    if (step.kind === 'broken') {
      this.host.say(`${chore.label} abgebrochen.`);
      return;
    }
    if (!this.crew.opened.includes(chore.id)) this.crew.opened.push(chore.id);
    this.sound('door');
  }

  /** Der Handgriff, an dem gerade gearbeitet wird — für den Streifen und Tests. */
  get busy(): Readonly<Chore> | null {
    return this.chore;
  }

  /**
   * **Der Archivar funkt auch, wenn er ein Bot ist** (`rules/archiveRadio.ts`).
   *
   * Der Besitzer hat es in einem Satz gesagt: „Ich will in VR, wenn ich mit
   * Bots spiele, auch die Hilfe-Kommunikation vom Archivar." Bis hierher
   * bekam er dessen Auskunft **still** — die Zielkiste leuchtete, ein Tipp auf
   * die Karte schlug die Akte auf. In der Brille schaut aber niemand auf eine
   * Karte, während hinter ihm eine Tür knarrt.
   *
   * Gefunkt wird nur, wo in der Zentrale ein Bot das Archiv hält
   * (`rules/roundSetup.botArchivist`): Sitzt dort ein Mensch, ist das Sagen sein Platz,
   * und eine Stimme daneben nähme ihm seinen einzigen Beitrag weg. Und nur für
   * den, der die Runde spielt — in der Bot-Runde redet der Modelltechniker
   * selbst (`missionBot.ts`).
   */
  private stepArchiveRadio(): void {
    const state = this.host.state();
    const helping =
      this.active &&
      !!this.player &&
      !this.crew.simulation &&
      state.phase === 'running' &&
      botArchivist(loadSetup());
    if (!helping) {
      this.radioed = '';
      return;
    }
    const call = archiveRadio(this.host.spec(), state);
    if (!call || call.key === this.radioed) return;
    this.radioed = call.key;
    this.host.say(call.text);
  }

  private takeLoot(id: string): void {
    const c = this.cabinets.find((c) => c.id === id);
    if (!c || !this.active || !this.crew.opened.includes(id) || this.crew.inventory.includes(id))
      return;
    const spec = this.host.spec();
    const state = this.host.state();
    const part = spec.tasks.some((t) => t.id === c.loot);
    // **Eine Hand, ein Ersatzteil.** Die zweite Kiste geht auf, das Teil darin
    // bleibt liegen — sonst sammelte man in Ruhe alle drei ein und klapperte
    // danach die Konsolen ab, und der halbe Weg durch das Schiff fiele weg.
    // Die Kiste bleibt dabei **offen und unerledigt**: Wer zurückkommt, findet
    // sie so vor, wie er sie verlassen hat.
    if (part && !canCarryPart(spec, state)) {
      this.host.say(fullHandsText(spec, state));
      this.sound('error');
      return;
    }
    if (c.loot === 'test-kit') {
      if (!this.crew.options.test) return;
      for (const item of ['radar', 'xray', 'medkit'])
        if (!this.crew.inventory.includes(item)) this.crew.inventory.push(item);
      state.taken = spec.tasks.map((t) => t.id);
    } else if (part) {
      // **`taken` sagt „war einmal draußen", `inventory` sagt „ist in der
      // Hand".** Bis eben kannte das Schiff nur `taken`, und weil das nie
      // wieder herausgenommen wird, hätte ein abgelegtes Teil die Konsole
      // weiter aufgesperrt. Die 2D-Runde macht es seit jeher so; jetzt beide.
      if (!state.taken.includes(c.loot)) state.taken.push(c.loot);
      this.crew.inventory.push(c.loot);
      this.forgetDropped(c.loot);
      this.rightItem = 'part';
    } else this.crew.inventory.push(c.loot);
    this.crew.inventory.push(id);
    if (this.host.ctx.renderer.xr.isPresenting) {
      if (c.loot === 'radar' || c.loot === 'xray') this.host.equip?.(c.loot, 'left');
      else if (c.loot === 'test-kit') this.host.equip?.('radar', 'left');
      // Die rechte Hand hält jetzt das Teil — die Lampe wandert nach links,
      // wo die zweite ohnehin am Gürtel hängt.
      else if (part) this.host.equip?.('flashlight', 'left');
    }
    this.host.say(
      part
        ? `${lootLabel(spec, c.loot)} in der Hand. ${this.targetCall(c.loot)}`
        : `${lootLabel(spec, c.loot)} aufgenommen · Werkzeuge greifen und seitlich am Gürtel ablegen. Web: 1 / 2 wechseln.`,
    );
    this.sound('success');
    this.paint();
    this.host.ctx.refreshWorldMenu();
  }

  /**
   * **Was der Archivar dazu sagt** — und ob er überhaupt jemand ist, der
   * etwas sagt.
   *
   * Sitzt am Archiv ein **Bot**, gibt es niemanden zum Fragen: Dann sagt er
   * den Zielraum an, sobald das Teil in der Hand ist. Sitzt dort ein
   * **Mensch**, ist genau das seine Aufgabe — und der Techniker bekommt hier
   * nur den Hinweis, dass er fragen muss. Dieselbe Regel wie beim HUD-Streifen
   * (`hudTasksVisible`) und bei der Zielgenauigkeit (`goalPrecision`).
   */
  private targetCall(itemId: string): string {
    const order = archiveGoals(this.host.spec(), this.host.state()).find(
      (one) => one.itemId === itemId,
    );
    if (!powersOf(loadSetup()).archive)
      return 'Archiv fragen, wohin damit. Ablegen: G / Taste im Panel.';
    return order?.console
      ? `Archiv: damit in ${order.console.roomName} — ${order.title}. Ablegen: G.`
      : 'Ablegen: G.';
  }

  /**
   * **Das Ersatzteil aus der Hand legen.**
   *
   * Es fällt nicht, es wird abgestellt: Der Gürtel zeigt, dass ein Werkzeug,
   * das man loslässt, dort liegt, wo man stand — mehr Physik braucht ein
   * Ersatzteil nicht, und ein Teil, das unter eine Konsole rollt, wäre eine
   * verlorene Runde. Wo es liegt, geht in den Stand (`HauntState.dropped`);
   * der Archivar sieht es aber erst, wenn es `DROPPED_SEEN` Sekunden dort
   * liegt (`rules/archiveGoals.ts`).
   */
  dropPart(): void {
    const spec = this.host.spec();
    const state = this.host.state();
    const id = carriedPart(spec, state);
    // Außerhalb der Runde sagt die Taste gar nichts: Wer im Van auf `G`
    // kommt, soll keine Meldung bekommen, die er nicht abbestellen kann.
    if (!this.active) return;
    if (!id) {
      this.host.say('Kein Ersatzteil in der Hand.');
      return;
    }
    const held = this.crew.inventory.indexOf(id);
    if (held >= 0) this.crew.inventory.splice(held, 1);
    this.host.ctx.rig.getHeadPosition(_head);
    const dropped: DroppedPart = { id, x: _head.x, z: _head.z, since: state.time };
    state.dropped = [...(state.dropped ?? []).filter((one) => one.id !== id), dropped];
    if (this.rightItem === 'part') this.rightItem = 'flashlight';
    if (this.host.ctx.renderer.xr.isPresenting) this.host.equip?.('flashlight', 'right');
    this.host.say(`${lootLabel(spec, id)} abgelegt. Wieder aufnehmen: E.`);
    this.sound('door');
    this.paint();
    this.host.ctx.refreshWorldMenu();
  }

  /** Ein liegendes Teil wieder aufnehmen — wenn die Hand frei ist. */
  private takeDropped(id: string): void {
    const spec = this.host.spec();
    const state = this.host.state();
    if (!this.active) return;
    if (!canCarryPart(spec, state)) {
      this.host.say(fullHandsText(spec, state));
      this.sound('error');
      return;
    }
    this.forgetDropped(id);
    this.crew.inventory.push(id);
    this.rightItem = 'part';
    if (this.host.ctx.renderer.xr.isPresenting) this.host.equip?.('flashlight', 'left');
    this.host.say(`${lootLabel(spec, id)} wieder in der Hand. ${this.targetCall(id)}`);
    this.sound('success');
    this.paint();
    this.host.ctx.refreshWorldMenu();
  }

  /** Das Teil liegt nicht mehr da — weder im Stand noch als Modell im Gang. */
  private forgetDropped(id: string): void {
    const state = this.host.state();
    if (state.dropped?.length) state.dropped = state.dropped.filter((one) => one.id !== id);
    const mesh = this.droppedParts.get(id);
    if (mesh) mesh.visible = false;
  }

  /**
   * **Die liegenden Teile im Gang nachführen** — aus dem Stand, nicht aus dem
   * Gedächtnis dieser Klasse.
   *
   * So sieht auch ein Techniker, der mitten in der Runde dazukommt oder dessen
   * Stand vom Gastgeber kommt, was auf dem Boden liegt. Gebaut wird ein Modell
   * beim ersten Mal, danach nur noch gestellt und ein- oder ausgeblendet.
   */
  private stepDropped(): void {
    const state = this.host.state();
    const lying = state.dropped ?? [];
    for (const [id, mesh] of this.droppedParts) {
      const part = lying.find((one) => one.id === id);
      mesh.visible = !!part;
      if (part) mesh.position.set(part.x, 0.16, part.z);
    }
    for (const part of lying) {
      if (this.droppedParts.has(part.id)) continue;
      const mesh = this.mesh([0.28, 0.16, 0.22], SHIP.amber, this.root, [part.x, 0.16, part.z]);
      mesh.name = `dropped-${part.id}`;
      mesh.userData.interactionLabel = `E: ${lootLabel(this.host.spec(), part.id)} aufnehmen`;
      this.droppedParts.set(part.id, mesh);
      this.bind(mesh, () => this.takeDropped(part.id));
    }
  }

  private locker(id: string, at: THREE.Vector3, yaw: number, code: string): void {
    const { root: group, door: leaf } = buildSafetyLocker();
    const parts = [...group.children];
    group.position.copy(at);
    group.rotation.y = yaw;
    const title = label('SCHUTZSCHRANK', 0.75, 0.14);
    title.position.set(0, 2.04, 0.415);
    group.add(title);
    const keypad = this.screen(0.6, 0.58, 256);
    keypad.mesh.position.set(0, 1.4, 0.425);
    group.add(keypad.mesh);
    keypad.mesh.userData.locker = id;
    keypad.mesh.userData.interactionLabel = 'E: In den Schutzschrank';
    group.userData.roomId = id;
    this.root.add(group);
    this.lockers.push({
      id,
      group,
      leaf,
      leafY: leaf.position.y,
      leafHeight: 1.95,
      code,
      open: false,
      parts,
      wreck: null,
      slits: null,
      ghost: null,
    });
    this.bind(keypad.mesh, (uv) => {
      if (!uv || !this.active) return;
      const locker = this.lockers.find((l) => l.id === id)!;
      if (locker.open) {
        this.enterLocker(locker);
        return;
      }
      this.lockerDigit(id, 0);
    });
  }
  /**
   * **Der Schutzschrank hat keinen Code mehr** — ein Tipp, und man ist drin;
   * ein zweiter, und man ist draußen. Genau wie in der 2D-Welt. Der Code war
   * eine Frage an den Archivar mitten auf der Flucht, und die Flucht hat
   * dafür keine drei Sekunden: Wer vor der Kabine stand und die erste Ziffer
   * suchte, war schon gestellt. `digit` bleibt in der Signatur, weil das
   * Tastenfeld und das Panel ihn noch schicken; er sagt nichts mehr.
   */
  private lockerDigit(id: string, _digit: number): void {
    if (!this.active) return;
    if (this.crew.hidden) {
      this.leaveLocker();
      return;
    }
    if (!this.inLockerRoom(id)) return;
    const locker = this.lockers.find((l) => l.id === id);
    if (!locker) return;
    if (this.wrecked(id)) {
      this.refuseWreck();
      return;
    }
    this.enterLocker(locker);
  }
  private enterLocker(locker: Locker): void {
    if (this.crew.hidden) {
      this.leaveLocker();
      return;
    }
    if (!this.inLockerRoom(locker.id)) return;
    if (this.wrecked(locker.id)) {
      this.refuseWreck();
      return;
    }
    this.host.ctx.rig.getHeadPosition(this.lockerHome);
    this.lockerHome.y = 0;
    this.host.travel(locker.group.position.clone());
    this.crew.hidden = locker.id;
    locker.open = false;
    this.ghostLocker(locker, true);
    this.host.say('Geschützt. AUSGANG vor dir antippen oder E drücken, um herauszutreten.');
    this.sound('door');
  }
  /**
   * **Der Schrank als Geist, mit Lüftungsschlitzen.** Wer drinsteckt, stand
   * vorher in einem Kasten, dessen Rückseiten der Renderer wegließ — der Raum
   * schien durch die Wände, als gäbe es keinen Schrank. Jetzt bleibt er da,
   * aber durchsichtig: Jedes Teil bekommt eine eigene, blasse Kopie seines
   * Materials (die Originale teilen sich alle Möbel, also nie anfassen), und
   * vor den Augen liegen dunkle Schlitze, durch die man hinaussieht. Beim
   * Heraustreten kommt alles zurück, Kopien werden entsorgt.
   */
  private ghostLocker(locker: Locker, on: boolean): void {
    if (on === !!locker.ghost) return;
    if (!on) {
      locker.ghost?.();
      locker.ghost = null;
      return;
    }
    const restores: Array<() => void> = [];
    for (const part of locker.parts)
      part.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        const mesh = node as THREE.Mesh;
        const original = mesh.material;
        const pale = (Array.isArray(original) ? original : [original]).map((one) => {
          const copy = one.clone();
          copy.transparent = true;
          copy.opacity = LOCKER_GHOST_OPACITY;
          copy.side = THREE.DoubleSide;
          copy.depthWrite = false;
          return copy;
        });
        mesh.material = Array.isArray(original) ? pale : pale[0]!;
        restores.push(() => {
          mesh.material = original;
          for (const copy of pale) copy.dispose();
        });
      });
    if (!locker.slits) {
      locker.slits = buildLockerSlits();
      locker.group.add(locker.slits);
    }
    locker.slits.visible = true;
    const slits = locker.slits;
    restores.push(() => {
      slits.visible = false;
    });
    locker.ghost = () => {
      for (const restore of restores) restore();
    };
  }
  /** Ob diese Kabine ein Wrack ist — die Liste steht im Stand (`HauntState.destroyed`). */
  private wrecked(id: string): boolean {
    return this.host.state().destroyed.includes(id);
  }
  private refuseWreck(): void {
    this.host.say('Die Kabine ist zerstört — sie schützt niemanden mehr. Eine andere suchen.');
    this.sound('error');
  }
  /**
   * **Das Modell tauschen**, sobald die Kabine als zerstört gilt — oder
   * zurück, wenn eine neue Runde die Liste leert. Das heile Modell bleibt
   * unsichtbar im Baum, weil Schild und Tastenfeld daran hängen und weil ein
   * Wrack in derselben Runde nie wieder heil wird; das Wrack kommt dazu und
   * geht mit seinen Ressourcen wieder weg.
   */
  private setWrecked(locker: Locker, wrecked: boolean): void {
    for (const part of locker.parts) part.visible = !wrecked;
    if (wrecked && !locker.wreck) {
      locker.wreck = buildBrokenLocker().root;
      locker.group.add(locker.wreck);
    } else if (!wrecked && locker.wreck) {
      locker.group.remove(locker.wreck);
      disposeObject(locker.wreck);
      locker.wreck = null;
    }
    locker.open = false;
  }
  private inLockerRoom(id: string): boolean {
    this.host.ctx.rig.getHeadPosition(_head);
    if (id.startsWith('training-'))
      return (
        this.crew.options.test &&
        trainingRoomAt(_head.x, _head.z)?.id === id.slice('training-'.length)
      );
    return (
      roomAt(this.host.spec(), Math.floor(_head.x / TILE), Math.floor(_head.z / TILE))?.id === id
    );
  }
  private leaveLocker(): void {
    if (!this.crew.hidden) return;
    if (this.crew.simulation) {
      this.crew.hidden = '';
      return;
    }
    this.interactionCooldown = 0.2;
    if (this.crew.hidden) {
      this.host.ctx.rig.frozen = false;
      this.host.travel(this.lockerHome);
    }
    const locker = this.lockers.find((l) => l.id === this.crew.hidden);
    if (locker) {
      locker.open = true;
      this.ghostLocker(locker, false);
    }
    this.crew.hidden = '';
    this.host.say('Schutzschrank verlassen.');
    this.sound('door');
  }

  private buildConsoles(): void {
    const layout = stationLayout(this.host.spec());
    for (const repair of repairsFor(this.host.spec())) {
      const at = layout.find((p) => p.id === `console-${repair.id}`)!;
      this.addConsole(repair, new THREE.Vector3(at.x, 0, at.z), at.yaw);
    }
  }
  private addConsole(repair: Repair, at: THREE.Vector3, yaw = 0, training = false): void {
    const g = new THREE.Group();
    g.position.copy(at);
    g.rotation.y = yaw;
    this.mesh([1.18, 0.16, 0.5], SHIP.trim, g, [0, 0.08, 0]);
    this.mesh([0.58, 0.62, 0.32], SHIP.dark, g, [0, 0.44, -0.05]);
    this.mesh([1.18, 0.95, 0.24], SHIP.trim, g, [0, 1.16, 0]);
    const screen = this.screen(1.05, 0.83);
    screen.mesh.position.set(0, 1.16, 0.125);
    g.add(screen.mesh);
    g.userData.roomId = training ? null : repair.roomId;
    this.root.add(g);
    g.updateMatrixWorld(true);
    const point = screen.mesh.getWorldPosition(new THREE.Vector3());
    screen.mesh.userData.interactionLabel = `E: ${repair.title}`;
    const console: Console = {
      repair,
      screen,
      at: point,
      selected: -1,
      training,
      ...(training ? { practice: { open: false, links: [], digits: [1, 1, 1] } } : {}),
    };
    this.consoles.push(console);
    this.bind(screen.mesh, (uv) => {
      if (uv) this.repairInput(repair.id, uv.x, 1 - uv.y);
    });
  }
  private repairInput(id: string, x: number, y: number): void {
    if (!this.active || this.crew.hidden) return;
    this.host.ctx.rig.getHeadPosition(_head);
    const console = this.consoles
      .filter((c) => c.repair.id === id && (!c.training || this.crew.options.test))
      .sort((a, b) => a.at.distanceToSquared(_head) - b.at.distanceToSquared(_head))[0]!;
    if (!console) return;
    const repair = console.repair;
    if (console.training && console.solved) {
      console.practice = { open: false, links: [], digits: [1, 1, 1] };
      console.solved = false;
      console.selected = -1;
      this.paint();
      return;
    }
    if (!console.training && this.host.state().done.includes(id)) return;
    const p = console.practice ?? puzzleFor(this.crew, id);
    if (!p.open) {
      // **In der Hand, nicht irgendwo im Schiff.** Vorher stand hier `taken`,
      // und das wird nie wieder entfernt: Wer das Teil ablegte, konnte die
      // Konsole trotzdem öffnen. Dieselbe Prüfung wie in der 2D-Runde — nur
      // der Testschrank bleibt außen vor, der gibt alle drei Teile auf einmal
      // aus, und ein Test ist keine Runde.
      const hasPart =
        this.crew.inventory.includes(repair.itemId) ||
        (this.crew.options.test && this.host.state().taken.includes(repair.itemId));
      if (!console.training && !hasPart) {
        this.host.say(`Abdeckung verriegelt: ${repair.item} fehlt. Archiv fragen.`);
        this.burst('sparks', console.at);
        this.sound('error');
        return;
      }
      p.open = true;
      this.sound('door');
      return;
    }
    if (repair.puzzle === 'wires') {
      const row = Math.floor((y - 0.27) / 0.16);
      if (row < 0 || row > 3) return;
      if (x < 0.42) console.selected = row;
      else if (x > 0.58 && console.selected >= 0) {
        p.links[console.selected] = row;
        console.selected = -1;
      }
    } else if (repair.puzzle === 'sequence') {
      if (y < 0.4) return;
      const digit = Math.min(4, Math.floor(x * 4) + 1);
      p.links.push(digit);
      if (p.links.length === 3 && p.links.join('') !== repair.code) {
        p.links = [];
        this.sound('error');
      }
    } else {
      const column = Math.min(2, Math.floor(x * 3));
      if (y < 0.73 && y > 0.35) p.digits[column] = ((p.digits[column] ?? 1) % 4) + 1;
      if (y < 0.75) return;
      if (!puzzleSolved(repair, p)) this.sound('error');
    }
    if (puzzleSolved(repair, p)) {
      if (console.training) {
        console.solved = true;
        this.host.say('Übung geschafft. Display erneut betätigen: Übung zurücksetzen.');
        this.sound('success');
        this.paint();
        return;
      }
      this.host.state().done.push(id);
      // **Das Teil ist verbaut** und damit aus der Hand — sonst trüge der
      // Techniker den ganzen Rest der Runde eine Filterpatrone mit sich
      // herum, die es nicht mehr gibt, und die nächste Kiste bliebe zu.
      const used = this.crew.inventory.indexOf(repair.itemId);
      if (used >= 0) this.crew.inventory.splice(used, 1);
      this.host.state().fuse = true;
      // **Hier geht kein Licht mehr von selbst an.** Eine reparierte Konsole
      // machte früher die Lampe ihres Raums an, und weil das an der Tafel
      // vorbeiging, brannten am Ende der Runde drei Lampen, die niemand
      // geschaltet hatte. Licht macht die Schalttafel, höchstens zwei
      // Räume, und nur solange sie es sich leistet (`rules/lamps.ts`).
      this.host.say(
        `${repair.title}: fertig. ${this.host.state().done.length === 3 ? 'Zur Einsatzzentrale zurückkehren!' : 'Nächsten Auftrag beim Archiv erfragen.'}`,
      );
      this.sound('success');
    } else this.sound('click');
    this.paint();
  }

  private buildDoors(): void {
    const occupied = new Set<string>();
    for (const d of [
      ...this.host.spec().doors,
      { id: 'test-bay', x: 2, z: 4, dir: 3 as const },
      ...(this.crew.options.test ? [TRAINING_DOOR] : []),
    ]) {
      const g = new THREE.Group();
      g.position.set(
        (d.x + 0.5 + dirX(d.dir) * 0.5) * TILE,
        0,
        (d.z + 0.5 + dirZ(d.dir) * 0.5) * TILE,
      );
      g.rotation.y = dirX(d.dir) === 0 ? 0 : Math.PI / 2;
      const boundary = `${g.position.x}:${g.position.z}:${g.rotation.y}`;
      if (occupied.has(boundary)) continue;
      occupied.add(boundary);
      const light = new THREE.MeshBasicMaterial({ color: 0x91ffd0, toneMapped: false });
      const housing = this.mesh([PLAN_DOOR_W + 0.2, 0.15, 0.2], SHIP.dark, g, [
        0,
        PLAN_DOOR_H + 0.12,
        0,
      ]);
      housing.name = `door-status-${d.id}`;
      for (const side of [-1, 1]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(PLAN_DOOR_W * 0.67, 0.065, 0.015), light);
        bar.position.set(0, 0, side * 0.109);
        housing.add(bar);
      }
      const leaves = [-1, 1].map((side) => {
        const m = this.mesh([PLAN_DOOR_W / 2, PLAN_DOOR_H - 0.04, 0.14], 0x617781, g, [
          (side * PLAN_DOOR_W) / 4,
          PLAN_DOOR_H / 2,
          0,
        ]);
        this.mesh([0.035, PLAN_DOOR_H - 0.18, 0.16], SHIP.dark, m, [
          (-side * PLAN_DOOR_W) / 4 + side * 0.05,
          0,
          0,
        ]);
        return m;
      }) as [THREE.Mesh, THREE.Mesh];
      const panel = this.screen(0.34, 0.36);
      panel.mesh.position.set(PLAN_DOOR_W / 2 + 0.28, 1.25, 0.18);
      g.add(panel.mesh);
      panel.mesh.userData.interactionLabel = 'E: Schiebetür bedienen';
      const back = panel.mesh.clone();
      back.rotation.y = Math.PI;
      back.position.z = -0.18;
      g.add(back);
      this.root.add(g);
      const at = g.position.clone();
      this.doors.push({
        id: d.id,
        leaves,
        amount: this.host.state().shut.includes(d.id) ? 0 : 1,
        at,
        panel,
        light,
      });
      const action = (): void => {
        if (d.id === 'test-bay' || d.id === TRAINING_DOOR.id) {
          this.host.say(
            this.crew.options.test
              ? 'Übungsdeck bereit. Die Tür öffnet beim Näherkommen.'
              : 'Übungsdeck gesperrt. Test am Terminal in der Zentrale starten.',
          );
          return;
        }
        if (!this.active) return;
        this.host.door(d.id);
        this.sound('door');
      };
      this.bind(panel.mesh, action);
      this.bind(back, action);
    }
  }

  private buildBay(): void {
    if (!this.crew.options.test) return;
    this.labMirror = buildTrainingDeck({
      root: this.bay,
      spec: this.host.spec(),
      cabinet: (id, at, loot) => this.cabinet(id, '', at, loot),
      locker: (id, at, code) => this.locker(id, at, 0, code),
      console: (repair, at) => this.addConsole(repair, at, 0, true),
      button: (mesh, action) => this.bind(mesh, action),
      visit: (id) => this.visitLab(id),
      home: () => this.home(),
      effect: (kind, at) => {
        this.burst(kind, at);
        this.sound('error');
      },
    });
    const lift = label(
      `TESTDECK
SAFE · WERKZEUGE · RÄTSEL · MODELLE
ANTIPPEN: ZUM SAFE-RAUM`,
      1.8,
      0.65,
    );
    lift.position.set((COMMAND_LIFT.x + 0.5) * TILE, 1.55, COMMAND_LIFT.z * TILE + 0.35);
    this.root.add(lift);
    this.bind(lift, () => this.visitLab('safe'));
  }

  private buildTorch(): void {
    if (!this.player) return;
    this.torch.name = 'desktop-held-tool';
    this.heldLamp.name = 'desktop-flashlight';
    this.heldLamp.setBeamGuide(false);
    this.heldLamp.setLit(true);
    this.mesh([0.15, 0.2, 0.07], 0xcad8c9, this.heldMedkit, [0, 0, 0]);
    this.mesh([0.035, 0.105, 0.009], 0x80352f, this.heldMedkit, [0, 0, -0.041]);
    this.mesh([0.095, 0.033, 0.009], 0x80352f, this.heldMedkit, [0, 0, -0.047]);
    // Das Ersatzteil sieht in der Hand aus wie in der Kiste — derselbe Kasten,
    // dieselbe Farbe. Wer es aufhebt, soll nicht raten müssen, ob er wirklich
    // das hat, was er gesucht hat.
    this.heldPart.name = 'desktop-held-part';
    this.mesh([0.28, 0.16, 0.22], SHIP.amber, this.heldPart, [0, 0, 0]);
    this.torch.add(this.heldLamp, this.heldMedkit, this.heldPart);
    this.host.ctx.camera.add(this.torch);
    this.torch.position.set(0.24, -0.24, -0.4);
    this.scanner.name = 'desktop-held-scanner';
    this.scanner.position.set(-0.3, -0.26, -0.52);
    this.leftLamp.name = 'desktop-flashlight-left';
    this.leftLamp.setBeamGuide(false);
    this.leftLamp.setLit(true);
    this.scanner.add(this.handheldRadar, this.handheldXray, this.leftLamp);
    this.host.ctx.camera.add(this.scanner);
    this.handheldXray.setSubjects(() => this.scanSubjects);
  }
  setVisibleRooms(ids: ReadonlySet<string> | null): void {
    this.visibleRooms = ids;
    for (const object of this.root.children) {
      const roomId = object.userData.roomId as string | undefined;
      if (roomId && !roomId.startsWith('training')) object.visible = !ids || ids.has(roomId);
    }
  }
  get flashlightActive(): boolean {
    return (
      this.player &&
      (this.host.ctx.renderer.xr.isPresenting
        ? ['left', 'right'].some((hand) => {
            const tool = this.host.carried?.(hand as Handedness);
            return tool instanceof FlashlightTool && tool.lit;
          })
        : (this.rightItem === 'flashlight' && this.heldLamp.lit) ||
          (this.sensorMode === 'flashlight' && this.leftLamp.lit)) &&
      !this.crew.hidden &&
      !this.crew.simulation
    );
  }
  /**
   * **Die rechte Hand durchschalten**: frei, Lampe, Medkit — und das
   * Ersatzteil, solange er eines trägt.
   *
   * Die **Taschenlampe steht immer in der Liste**, auch wenn die Fracht noch
   * unberührt ist: Sie hängt von Anfang an an beiden Hüften und kann nicht
   * verloren gehen (`HauntingWorld.beltLoadout`). „Frei" bleibt trotzdem
   * erreichbar — Dunkelheit ist in diesem Haus eine Entscheidung und kein
   * Verlust: Wer die Lampe ausmacht, ist für das Monster schwerer zu sehen
   * (`threat.ts`), und die andere Hand hat ohnehin noch eine.
   */
  private cycleRight(): void {
    const carried = !!carriedPart(this.host.spec(), this.host.state());
    const items = [
      'off',
      'flashlight',
      ...(this.crew.inventory.includes('medkit') ? ['medkit'] : []),
      ...(carried ? ['part'] : []),
    ] as Array<'off' | 'flashlight' | 'medkit' | 'part'>;
    this.rightItem = items[(items.indexOf(this.rightItem) + 1) % items.length]!;
    this.host.say(
      this.rightItem === 'off'
        ? 'Rechte Hand frei.'
        : this.rightItem === 'medkit'
          ? 'Medkit gewählt. E zum Heilen.'
          : this.rightItem === 'part'
            ? `${lootLabel(this.host.spec(), carriedPart(this.host.spec(), this.host.state()))} in der Hand. G legt es ab.`
            : 'Taschenlampe eingeschaltet.',
    );
    if (this.rightItem === 'flashlight') this.torchLit = true;
    if (this.host.ctx.renderer.xr.isPresenting)
      this.host.equip?.(this.rightItem === 'flashlight' ? 'flashlight' : 'off', 'right');
    this.stamp = '';
    this.paint();
  }

  /**
   * **Licht an, Licht aus.**
   *
   * Die Lampe bleibt dabei in der Hand — das ist der Unterschied zu
   * `cycleRight`, das die Hand *leert*, um es dunkel zu machen. Wer im Dunkeln
   * steht, weil das Monster nahe ist (eine brennende Lampe sieht es weiter,
   * `threat.ts`), will danach mit einem Druck wieder Licht und nicht erst
   * zweimal durch die Hand blättern.
   *
   * Ist die Hand mit etwas anderem belegt, nimmt dieser Griff die Lampe
   * zurück in die Hand und macht sie an: Ein Lichtschalter, der beim ersten
   * Druck nichts tut, ist im Dunkeln keiner. Das Ersatzteil geht dabei nicht
   * verloren — getragen wird, was im Inventar steht, `rightItem` sagt nur,
   * was man sieht (`updateTools`).
   */
  private toggleTorch(): void {
    if (this.rightItem === 'flashlight') this.torchLit = !this.torchLit;
    else {
      this.rightItem = 'flashlight';
      this.torchLit = true;
    }
    this.host.say(this.torchLit ? 'Taschenlampe an.' : 'Taschenlampe aus.');
    if (this.host.ctx.renderer.xr.isPresenting)
      this.host.equip?.(this.torchLit ? 'flashlight' : 'off', 'right');
    this.stamp = '';
    this.paint();
  }

  /**
   * **Was auf dem rechten Knopf steht.** Bei der Lampe gehört ihr Schalter
   * dazu: „Taschenlampe an" oder „Taschenlampe aus" — vorher stand dort nur
   * „Taschenlampe", und ob sie brennt, musste man an der Wand ablesen.
   */
  private get rightLabel(): string {
    return this.rightItem === 'flashlight'
      ? `Taschenlampe ${this.torchLit ? 'an' : 'aus'}`
      : HAND_LABEL[this.rightItem];
  }

  /**
   * **Dieselbe Auskunft, kurz genug für den runden Knopf.** Dort ist Platz
   * für neun Zeichen, danach schneidet `flat.css` mit „…" ab — „Taschenlampe
   * an" stand als „Taschenl…" da, und genau das Wort, um das es geht, fehlte.
   * Auf den Knöpfen heißt sie deshalb „Lampe"; in der Tafel, wo eine ganze
   * Zeile Platz ist, bleibt sie die Taschenlampe.
   */
  private keyLabel(side: 'left' | 'right'): string {
    if (side === 'left')
      // Die linke Lampe hat keinen eigenen Schalter: Sie brennt, solange sie
      // in der Hand liegt (`updateTools`).
      return this.sensorMode === 'flashlight' ? 'Lampe an' : HAND_LABEL[this.sensorMode];
    return this.rightItem === 'flashlight'
      ? `Lampe ${this.torchLit ? 'an' : 'aus'}`
      : HAND_LABEL[this.rightItem];
  }
  private buildSuit(): void {
    const avatar = this.host.ctx.avatar;
    avatar.traverse((object) => {
      const material = (object as THREE.Mesh).material;
      if (
        material &&
        !Array.isArray(material) &&
        material instanceof THREE.MeshStandardMaterial &&
        material.color.getHex() !== 0x1d2434 &&
        !this.suitColors.has(material)
      ) {
        this.suitColors.set(material, material.color.clone());
        material.color.setHex(0xc6d5d5);
      }
    });
    this.suit.name = 'astronaut-chest-rig';
    avatar.add(this.suit);
    this.mesh([0.32, 0.24, 0.075], 0xd3dcd7, this.suit, [0, 0, -0.15]);
    this.mesh([0.2, 0.11, 0.015], SHIP.dark, this.suit, [0, 0.02, -0.196]);
    const badge = label('EVA / 03', 0.16, 0.046);
    badge.position.set(0, 0.025, -0.207);
    badge.rotation.y = Math.PI;
    this.suit.add(badge);
    for (const side of [-1, 1])
      this.mesh([0.035, 0.45, 0.055], SHIP.amber, this.suit, [side * 0.15, 0, -0.12]);
    this.wound.position.set(0.03, -0.2, -0.185);
    this.wound.rotation.y = Math.PI;
    this.suit.add(this.wound);
    this.updateSuitVisibility();
  }
  private updateSuitVisibility(): void {
    const immersive = this.host.ctx.renderer.xr.isPresenting;
    if (this.suitImmersive === immersive) return;
    this.suitImmersive = immersive;
    const avatar = this.host.ctx.avatar;
    avatar.traverse((object) => {
      object.layers.set(LAYER_SELF_ONLY);
      if (immersive) object.layers.enable(0);
    });
    avatar.head.traverse((object) => object.layers.set(LAYER_SELF_ONLY));
  }

  private commandAction(index: number): void {
    if (!this.player) return;
    const options = { ...this.crew.options };
    if (index === 1) this.host.start();
    if (index === 2) this.host.test();
    if (index === 3) {
      options.rooms =
        ROOM_COUNTS[(ROOM_COUNTS.indexOf(options.rooms as 14) + 1) % ROOM_COUNTS.length]!;
      this.host.configure(options);
    }
    if (index === 4) {
      options.monster =
        MONSTERS[(MONSTERS.findIndex((m) => m.id === options.monster) + 1) % MONSTERS.length]!.id;
      this.host.configure(options);
    }
    if (index === 5 && options.test) {
      options.bright = !options.bright;
      this.crew.options = options;
      this.host.say(
        options.bright ? 'Testlicht an.' : 'Test im Dunkeln. Es gibt weiterhin kein Monster.',
      );
    }
  }

  /**
   * **Die linke Hand durchschalten** — und auch hier steht die Taschenlampe
   * in der Liste.
   *
   * Sie hängt an **beiden** Hüften (`HauntingWorld.beltLoadout`), seit der
   * Techniker in der rechten Hand ein Ersatzteil tragen kann: Wer das Teil
   * hält, hätte sonst genau dann keine Lampe, wenn er quer durch das dunkle
   * Schiff muss. Zwei Lampen sind zwei Exemplare, keine umgehängte —
   * Umhängen ist der Weg, auf dem eine verloren geht.
   */
  private cycleSensor(): void {
    const modes: Array<typeof this.sensorMode> = ['off', 'flashlight'];
    if (this.crew.inventory.includes('radar')) modes.push('radar');
    if (this.crew.inventory.includes('xray')) modes.push('xray');
    this.sensorMode = modes[(modes.indexOf(this.sensorMode) + 1) % modes.length]!;
    if (this.host.ctx.renderer.xr.isPresenting) this.host.equip?.(this.sensorMode, 'left');
    this.host.ctx.refreshWorldMenu();
    this.host.say(
      {
        off: 'Linke Hand frei. Radar und Röntgengerät liegen in der Fracht.',
        flashlight: 'Taschenlampe links eingeschaltet.',
        radar: 'Bewegungsradar in der Hand · am Gürtel seitlich ablegbar.',
        xray: 'Röntgengerät in der Hand · durch den Rahmen nach Fracht suchen.',
      }[this.sensorMode],
    );
  }

  /**
   * **Den Saum auf eine Kiste setzen und von der vorigen abnehmen.**
   *
   * Er hängt an den Netzen des Kastens selbst und nicht an einem eigenen Ring
   * daneben: Wer die Kiste sieht, sieht das Ziel, und wer um die Ecke schaut,
   * sieht beides nicht. Jedes Bild neu eingestellt, weil der Durchlauf über die
   * Szene die Kontur sonst binnen einer Sekunde wieder schwarz färbt.
   */
  private seam(id: string): void {
    if (id !== this.seamOn) {
      for (const mesh of this.seams) removeOutline(mesh);
      this.seams.length = 0;
      this.seamOn = id;
      const cabinet = id ? this.cabinets.find((one) => one.id === id) : undefined;
      for (const child of cabinet?.group.children ?? [])
        if ((child as THREE.Mesh).isMesh) this.seams.push(child as THREE.Mesh);
    }
    for (const mesh of this.seams) addOutline(mesh, GOAL_SEAM);
  }

  private get scanSubjects(): readonly { object: THREE.Object3D }[] {
    return this.cabinets
      .filter((cabinet) => !!cabinet.scanSubject && !this.crew.inventory.includes(cabinet.id))
      .map((cabinet) => cabinet.scanSubject!);
  }

  /**
   * **Das Ersatzteil in die Faust der Brille legen** — oder zurück in den
   * Streifen vor der Kamera.
   *
   * In der Brille gehört es an den Griff des rechten Controllers: Dort ist
   * die Hand, und ein Teil, das vor der Kamera schwebt, wäre in der Brille
   * ein Aufkleber auf der Scheibe. Am Schirm hängt es dagegen im Streifen mit
   * Lampe und Medkit, wie jedes andere Ding in der rechten Hand.
   */
  private carryInHand(inHand: boolean): void {
    const grip = this.host.ctx.input.get('right')?.grip;
    const wanted: THREE.Object3D = inHand && grip ? grip : this.torch;
    const held = wanted !== this.torch;
    if (this.heldPart.parent === wanted) return;
    wanted.add(this.heldPart);
    this.heldPart.position.set(0, held ? -0.02 : 0, held ? -0.12 : 0);
  }

  private updateTools(dt: number): void {
    const ctx = this.host.ctx;
    const immersive = ctx.renderer.xr.isPresenting;
    const available = this.player && !this.crew.simulation && !this.crew.hidden && this.crew.hp > 0;
    // **Das Ersatzteil bleibt in der Hand, auch wenn die Hand etwas anderes
    // zeigt.** `rightItem` sagt nur, was man *sieht*; getragen wird, was im
    // Inventar steht (`carriedPart`). Sonst wäre ein Umschalten auf die Lampe
    // ein Weg, das Teil verschwinden zu lassen.
    const part = carriedPart(this.host.spec(), this.host.state());
    if (!part && this.rightItem === 'part') this.rightItem = 'flashlight';
    this.torch.visible = available && !immersive && this.rightItem !== 'off';
    this.heldLamp.visible = this.rightItem === 'flashlight';
    this.heldLamp.setLit(this.torch.visible && this.rightItem === 'flashlight' && this.torchLit);
    this.heldMedkit.visible = this.rightItem === 'medkit';
    // In der Brille hält die Hand selbst das Teil: Der Griff des rechten
    // Controllers ist die Hand, und das Modell hängt daran, solange es
    // getragen wird. Nur beim Wechsel umgehängt — jedes Bild neu einhängen
    // hieße, den Szenengraph je Bild anzufassen.
    const inHand = !!part && available && immersive;
    this.carryInHand(inHand);
    this.heldPart.visible = inHand || (!immersive && this.rightItem === 'part');
    this.scanner.visible = available && !immersive && this.sensorMode !== 'off';
    this.handheldRadar.visible = this.sensorMode === 'radar';
    this.handheldXray.visible = this.sensorMode === 'xray';
    this.leftLamp.visible = this.sensorMode === 'flashlight';
    this.leftLamp.setLit(this.scanner.visible && this.sensorMode === 'flashlight');
    this.stepDropped();
    ctx.camera.getWorldDirection(_direction);
    this.handheldRadar.setContact(this.crew.options.test ? null : this.host.state().monster);
    if (this.scanner.visible && this.sensorMode === 'radar')
      this.handheldRadar.updateDisplay(dt, _head, _direction);
    this.handheldXray.updateView(
      this.root,
      _head,
      this.scanner.visible && this.sensorMode === 'xray',
    );
    if (immersive)
      for (const hand of ['left', 'right'] as const) {
        const tool = this.host.carried?.(hand);
        if (tool instanceof FlashlightTool) tool.setBeamGuide(false);
        if (tool instanceof RadarTool)
          tool.setContact(this.crew.options.test ? null : this.host.state().monster);
        if (tool instanceof XrayTool) tool.setSubjects(() => this.scanSubjects);
      }
    const floating = this.host.floatingTorch?.();
    if (floating?.visible && floating !== this.floatingTorch) {
      this.floatingTorch = floating;
      floating.userData.interactionLabel = 'E: Taschenlampe aufnehmen';
      this.bind(floating, () => {
        if (ctx.renderer.xr.isPresenting) {
          this.host.say('Taschenlampe mit dem Griff greifen.');
          return;
        }
        this.host.ctx.pointer.remove(floating);
        if (this.focusedTarget === floating) {
          this.focusedTarget = null;
          this.crosshair.dataset.label = '';
        }
        this.host.takeFloatingTorch?.();
        this.floatingTorch = null;
        this.rightItem = 'flashlight';
        this.host.say('Taschenlampe aufgenommen. 2 legt sie weg und nimmt sie wieder zur Hand.');
      });
    }
  }

  private heal(): void {
    const index = this.crew.inventory.indexOf('medkit');
    if (!this.active || index < 0 || this.crew.hp === 3 || this.crew.hp === 0) {
      this.host.say('Medkit nötig, oder Anzug bereits intakt.');
      return;
    }
    this.crew.inventory.splice(index, 1);
    this.crew.hp = Math.min(3, this.crew.hp + 1);
    this.crew.invulnerable = 3;
    if (!this.crew.inventory.includes('medkit') && this.rightItem === 'medkit')
      this.rightItem = 'off';
    this.sound('success');
    this.host.say('Wunde versorgt. Ein Treffer geheilt.');
    this.host.ctx.refreshWorldMenu();
  }

  update(dt: number): void {
    const ctx = this.host.ctx;
    const state = this.host.state();
    const crew = this.crew;
    this.stepTraining();
    ctx.rig.getHeadPosition(_head);
    this.interactionCooldown = Math.max(0, this.interactionCooldown - dt);
    this.stepUse();
    this.stepChore(dt, _head);
    this.stepArchiveRadio();
    this.updateTools(dt);
    const lab = crew.options.test ? trainingRoomAt(_head.x, _head.z) : null;
    this.bay.visible = crew.options.test;
    this.bayLight.intensity = this.player && lab ? 34 : 0;
    if (lab) this.bayLight.position.set(_head.x, 2.6, _head.z);
    if (this.labMirror)
      this.labMirror.visible =
        this.player && lab?.id === 'models' && _head.distanceTo(this.labMirror.position) < 8;
    this.command.mesh.visible = true;
    for (const door of this.doors) {
      const locked =
        this.host.doorLocked?.(door.id) ??
        (door.id === 'test-bay' || door.id === TRAINING_DOOR.id
          ? !crew.options.test
          : state.shut.includes(door.id));
      const goal = Number(this.host.doorOpen?.(door.id) ?? !locked);
      door.light.color.setHex(locked ? 0xff5267 : 0x78ffd0);
      const before = door.amount;
      door.amount += Math.sign(goal - before) * Math.min(Math.abs(goal - before), dt * 2.5);
      door.leaves.forEach(
        (leaf, i) =>
          (leaf.position.x = (i ? 1 : -1) * (PLAN_DOOR_W / 4 + (door.amount * PLAN_DOOR_W) / 2)),
      );
    }
    // **Der Saum sitzt auf der Zielkiste** — aber nur, wenn die Kiste
    // überhaupt verraten werden darf: Bei einem Menschen am Archiv nennt
    // `objectives()` den Raum (`rules/roundSetup.goalPrecision`), und dann
    // leuchtet hier nichts.
    const goal = this.host.objectives?.()[0];
    this.seam(goal?.kind === 'crate' ? goal.id : '');
    // Das Röntgengerät blendet die Kennzeichen der noch vollen Kisten ein —
    // sein Schild hing hier jahrelang unbenutzt herum, während stattdessen ein
    // Inhaltsschild dauerhaft am Schrank klebte.
    const scanning = this.sensorMode === 'xray' && !crew.hidden && crew.hp > 0;
    for (const cabinet of this.cabinets) {
      const opened = crew.opened.includes(cabinet.id);
      const amount = THREE.MathUtils.damp(cabinet.leaf.scale.y, opened ? 0.025 : 1, 8, dt);
      cabinet.leaf.scale.y = amount;
      cabinet.leaf.position.y = cabinet.leafY + ((1 - amount) * cabinet.leafHeight) / 2;
      if (cabinet.lootMesh) cabinet.lootMesh.visible = !crew.inventory.includes(cabinet.id);
      cabinet.group.visible =
        (cabinet.id !== 'test-supply' || crew.options.test) &&
        (!cabinet.room || !this.visibleRooms || this.visibleRooms.has(cabinet.room));
      cabinet.scanner.visible =
        scanning &&
        cabinet.group.visible &&
        !!cabinet.scanSubject &&
        !crew.inventory.includes(cabinet.id) &&
        cabinet.at.distanceToSquared(_head) < XRAY_LABEL_RANGE * XRAY_LABEL_RANGE;
    }
    for (const locker of this.lockers) {
      // Zerstört ist, was im Stand steht — auch bei einer Runde, die man mit
      // schon aufgerissenen Kabinen betritt, und zurück auf heil beim Reset.
      const wrecked = this.wrecked(locker.id);
      if (wrecked !== !!locker.wreck) this.setWrecked(locker, wrecked);
      if (wrecked) continue;
      const amount = THREE.MathUtils.damp(locker.leaf.scale.y, locker.open ? 0.025 : 1, 8, dt);
      locker.leaf.scale.y = amount;
      locker.leaf.position.y = locker.leafY + ((1 - amount) * locker.leafHeight) / 2;
    }
    for (const id of this.wreckClock.step(dt, state.destroyed)) {
      const locker = this.lockers.find((l) => l.id === id);
      if (locker) this.burst('sparks', _pos.copy(locker.group.position).setY(1.5));
    }
    this.effects.update(dt);
    if (this.player) {
      this.updateSuitVisibility();
      this.status.mesh.visible =
        (!crew.simulation && !!crew.hidden) || state.phase === 'lost' || state.phase === 'won';
      this.visor.visible =
        !crew.simulation && (crew.exertion > 0.005 || crew.hp < 3 || !!crew.hidden);
      this.visor.material.uniforms.fogAmount!.value = crew.exertion;
      this.visor.material.uniforms.time!.value += dt;
      this.visor.material.uniforms.damage!.value = Math.max(
        crew.hidden ? 0.2 : 0,
        (3 - crew.hp) / 3,
      );
      ctx.avatar.head.getWorldPosition(_pos);
      ctx.avatar.worldToLocal(_pos);
      this.suit.position.set(_pos.x, _pos.y - 0.62, _pos.z);
      this.suit.rotation.y = ctx.avatar.bodyYaw;
      this.wound.visible = crew.hp < 3;
      const hidden = (!crew.simulation && !!crew.hidden) || crew.hp === 0;
      if (hidden !== this.hiddenWas) {
        if (hidden) this.savedRigFrozen = ctx.rig.frozen;
        ctx.rig.frozen = hidden || this.savedRigFrozen;
        this.hiddenWas = hidden;
      }
      // **Das Panel und das Weltmenü teilen sich die linke Bildhälfte** — und
      // lagen deshalb auf 1280×800 übereinander (Befund: y ≈ 460–590). Wer
      // das Menü aufmacht, will das Menü; das Panel kommt zurück, sobald es
      // zu ist. Dieselbe Regel wie beim Fadenkreuz eine Zeile weiter.
      this.dom.hidden = ctx.renderer.xr.isPresenting || ctx.menu.isOpen;
      this.crosshair.hidden = ctx.renderer.xr.isPresenting || ctx.menu.isOpen;
      this.optionsRoot.hidden =
        !this.optionsOpen || ctx.renderer.xr.isPresenting || ctx.menu.isOpen;
      this.paintControls();
      this.stepStick();
      this.dom.classList.toggle('is-keys', !this.controls?.hidden);
      this.stepCompass(ctx, state.phase === 'running' && !crew.simulation);
      // Solange die Mission läuft, nie in der Bot-Runde und nie im Menü: Ohne
      // Runde gibt es nichts zu zählen, und wer einer Bot-Runde zusieht, hat
      // weder Sauerstoff noch Aufträge. In der Brille **und** am Desktop —
      // beide spielen dieselbe Station und brauchen dieselbe Anzeige.
      const round =
        state.phase === 'running' && !crew.simulation ? (this.host.round?.() ?? null) : null;
      this.hud.mesh.visible = !!round;
      this.hudTimer -= dt;
      // **Der Ladebalken läuft schneller als die Uhr.** Ein Balken, der
      // viermal je Sekunde springt, sieht aus wie ein Ruckeln; solange ein
      // Handgriff läuft, wird deshalb jedes Bild gemalt.
      if (round && (this.hudTimer <= 0 || this.chore)) {
        // Viermal je Sekunde nachsehen, aber nur malen, wenn sich der Text
        // geändert hat: Die Uhr springt einmal je Sekunde, ein erledigter
        // Auftrag soll aber nicht bis zur nächsten vollen Sekunde warten.
        this.hudTimer = 0.25;
        this.paintHud(round);
      }
      this.stepSound(dt, _head);
      this.stepSimulation(dt);
      this.desktop.update(dt);
      this.comfort?.update(dt);
    } else {
      this.status.mesh.visible = false;
      this.hud.mesh.visible = false;
    }
    this.paintTimer -= dt;
    if (this.paintTimer <= 0) {
      this.paintTimer = 0.12;
      this.paint();
    }
  }

  /** Der Kompass folgt dem Blick: Himmelsrichtungen und die Ziele des Technikers. */
  private stepCompass(ctx: WorldContext, running: boolean): void {
    if (!this.compass) return;
    const shown = running && !ctx.renderer.xr.isPresenting && !ctx.menu.isOpen;
    this.compass.element.hidden = !shown;
    // Und die Tafel rückt unter ihn — oder an den oberen Rand, wenn er weg
    // ist. Vorher blieben die 44 px seiner Zeile auch dann frei, wenn dort
    // nichts stand (`haunting.css`, `--orbital-head`).
    this.dom.classList.toggle('has-compass', shown);
    if (!shown) return;
    ctx.camera.getWorldDirection(_direction);
    const yaw = Math.atan2(-_direction.x, -_direction.z);
    this.compass.update(yaw, { x: _head.x, z: _head.z }, this.host.objectives?.() ?? []);
  }

  private paint(): void {
    if (this.disposed) return;
    const state = this.host.state();
    const crew = this.crew;
    this.rows(this.command, [
      'HAUNTING / ORBITAL · 1 VR + 2 HANDYS',
      'MISSION STARTEN',
      'TEST / OHNE MONSTER',
      `SKELD · FESTE KARTE · ${crew.options.rooms} RÄUME`,
      `GEGNER: ${MONSTERS.find((m) => m.id === crew.options.monster)!.name}`,
      crew.options.test
        ? `TESTLICHT: ${crew.options.bright ? 'HELL' : 'DUNKEL'} · ANTIPPEN`
        : 'TESTLABOR: MIT TEST ÖFFNEN',
    ]);
    for (const door of this.doors) {
      const locked =
        this.host.doorLocked?.(door.id) ??
        (door.id === 'test-bay' || door.id === TRAINING_DOOR.id
          ? !crew.options.test
          : state.shut.includes(door.id));
      this.rows(door.panel, [
        locked ? 'GESPERRT' : 'BEREIT',
        door.id === 'test-bay' || door.id === TRAINING_DOOR.id ? 'ÜBUNGSDECK' : 'SCHOTT',
        locked ? 'ANTIPPEN' : 'AUTOMATIK',
      ]);
    }
    for (const screen of this.screens)
      if (screen.mesh.userData.locker) {
        const id = screen.mesh.userData.locker as string;
        const locker = this.lockers.find((l) => l.id === id);
        if (this.wrecked(id)) this.rows(screen, ['ZERSTÖRT', 'KEIN SCHUTZ']);
        else
          this.rows(screen, ['SCHUTZ', locker?.open ? 'OFFEN' : 'BEREIT', 'ANTIPPEN: VERSTECKEN']);
      }
    for (const console of this.consoles) this.paintRepair(console);
    this.paintStatus();
    this.paintDom();
  }
  private base(screen: Screen, title: string): CanvasRenderingContext2D {
    const c = screen.ctx;
    c.fillStyle = '#081823';
    c.fillRect(0, 0, screen.canvas.width, screen.canvas.height);
    c.strokeStyle = '#33556a';
    c.lineWidth = 3;
    c.strokeRect(2, 2, screen.canvas.width - 4, screen.canvas.height - 4);
    c.fillStyle = '#7de9ec';
    c.font = 'bold 30px system-ui';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(
      title,
      screen.canvas.width / 2,
      screen.canvas.height * 0.12,
      screen.canvas.width - 30,
    );
    return c;
  }
  private rows(screen: Screen, rows: string[]): void {
    const key = rows.join('|');
    if (screen.mesh.userData.paint === key) return;
    screen.mesh.userData.paint = key;
    const c = this.base(screen, '');
    const { width: w, height: h } = screen.canvas;
    rows.forEach((row, i) => {
      c.fillStyle = i === 2 ? '#184c48' : i % 2 ? '#142e3c' : '#0e222e';
      c.fillRect(9, (i * h) / rows.length + 4, w - 18, h / rows.length - 8);
      c.fillStyle = i === 2 ? '#a9ffdf' : '#dcebf0';
      c.font = `600 ${Math.min(34, (h / rows.length) * 0.43)}px system-ui`;
      c.fillText(row, w / 2, ((i + 0.5) * h) / rows.length, w - 35);
    });
    screen.texture.needsUpdate = true;
  }
  private paintRepair(console: Console): void {
    const { screen, repair } = console;
    const p = console.practice ?? puzzleFor(this.crew, repair.id);
    const done = console.training ? console.solved : this.host.state().done.includes(repair.id);
    if (done || !p.open) {
      this.rows(screen, [
        repair.title.toUpperCase(),
        done ? 'SYSTEM ONLINE' : `BENÖTIGT: ${repair.item}`,
        done
          ? console.training
            ? 'ANTIPPEN: ÜBUNG ZURÜCKSETZEN'
            : 'NÄCHSTEN AUFTRAG ERFRAGEN'
          : 'ABDECKUNG ANTIPPEN',
      ]);
      return;
    }
    const key = JSON.stringify([p, console.selected]);
    if (screen.mesh.userData.paint === key) return;
    screen.mesh.userData.paint = key;
    const c = this.base(screen, repair.title.toUpperCase());
    const w = screen.canvas.width,
      h = screen.canvas.height;
    c.font = '24px system-ui';
    c.fillStyle = '#b6c9d4';
    if (repair.puzzle === 'wires') {
      c.fillText('Start wählen → gleiches Symbol verbinden', w / 2, h * 0.21);
      const colors = ['#f5aa71', '#70def0', '#dcb5ff', '#b3d57b'],
        symbols = ['▲', '●', '■', '◆'];
      for (let i = 0; i < 4; i++) {
        const y = h * (0.35 + i * 0.16);
        c.font = '38px sans-serif';
        c.fillStyle = colors[i]!;
        c.fillText(`${console.selected === i ? '› ' : ''}${symbols[i]}`, w * 0.18, y);
        c.fillStyle = colors[repair.order[i]!]!;
        c.fillText(symbols[repair.order[i]!]!, w * 0.82, y);
        const link = p.links[i];
        if (link !== undefined && link >= 0) {
          c.strokeStyle = colors[i]!;
          c.lineWidth = 8;
          c.beginPath();
          c.moveTo(w * 0.27, y);
          c.lineTo(w * 0.73, h * (0.35 + link * 0.16));
          c.stroke();
        }
      }
    } else if (repair.puzzle === 'sequence') {
      c.fillText('Archiv: Freigabefolge durchgeben', w / 2, h * 0.3);
      c.font = '48px monospace';
      c.fillText(p.links.join(' ') || '— — —', w / 2, h * 0.46);
      for (let i = 0; i < 4; i++) c.fillText(String(i + 1), ((i + 0.5) * w) / 4, h * 0.72);
    } else {
      c.fillText('Archiv: Frequenzen ansagen · Ziffern drehen', w / 2, h * 0.3);
      c.font = '64px monospace';
      for (let i = 0; i < 3; i++)
        c.fillText(String(p.digits[i] ?? 1), ((i + 0.5) * w) / 3, h * 0.55);
      c.font = '32px system-ui';
      c.fillText('FREQUENZEN BESTÄTIGEN', w / 2, h * 0.86);
    }
    screen.texture.needsUpdate = true;
  }
  private paintStatus(): void {
    const hidden = !!this.crew.hidden;
    const phase = this.host.state().phase;
    if (!hidden && phase !== 'won' && phase !== 'lost') return;
    const title = hidden
      ? 'SCHUTZSCHRANK / GESCHÜTZT'
      : phase === 'won'
        ? 'MISSION ERFÜLLT'
        : 'MISSION GESCHEITERT';
    const c = this.base(this.status, title);
    const w = this.status.canvas.width,
      h = this.status.canvas.height;
    c.fillStyle = '#d8e7ec';
    c.font = '29px system-ui';
    c.fillText(
      hidden
        ? 'Du bist sicher. Der Ausgang ist jederzeit offen.'
        : phase === 'won'
          ? 'Alle Systeme repariert. Die Crew ist gerettet.'
          : 'Dein Anzug wurde beschädigt. Die Runde ist vorbei.',
      w / 2,
      h * 0.4,
      w - 36,
    );
    c.fillStyle = '#16494f';
    c.fillRect(22, h * 0.58, w - 44, h * 0.32);
    c.fillStyle = '#adffe8';
    c.font = 'bold 42px system-ui';
    c.fillText(
      hidden ? 'AUSGANG · ANTIPPEN / E' : 'NEU STARTEN · ANTIPPEN / E',
      w / 2,
      h * 0.78,
      w - 44,
    );
    this.status.texture.needsUpdate = true;
  }
  /**
   * **Die Aufträge des Technikers**, wie der Streifen sie zeigt — dieselbe
   * Rechnung wie das 2D-HUD (`rules/roundHud.ts`), damit beide Anzeigen
   * dasselbe zählen. Die Raumnamen kommen aus dem Bauplan.
   */
  private hudTasks(): HudTask[] {
    const spec = this.host.spec();
    const state = this.host.state();
    return hudTasks({
      repairs: repairsFor(spec),
      roomName: (id) => roomOf(spec, id)?.name ?? id,
      done: state.done,
      taken: state.taken,
      inventory: this.crew.inventory,
    });
  }

  /**
   * Der Streifen im Blickfeld, zwei Zeilen: oben links die Uhr, oben rechts
   * die Anzug-Leben, darunter die drei Aufträge — voll, halb, leer, und
   * daneben der nächste im Klartext. Was dort steht und wann es rot wird,
   * rechnet `rules/roundHud.ts` — dieselbe Regel wie auf den Telefonen und in
   * der 2D-Welt. Gemalt wird nur, wenn sich etwas geändert hat; die Uhr tut
   * das einmal je Sekunde.
   */
  private paintHud(round: MapRound): void {
    const hud = roundHud(round);
    // **Die zweite Zeile gibt es nur, wenn er allein spielt**
    // (`hudTasksVisible`): Sitzt am Archiv ein Mensch, ist das Wissen dessen
    // Platz, und der Techniker holt es sich am Funk. Die erste Zeile — Uhr
    // und Anzug — bleibt in jedem Fall; das ist sein Anzug.
    const orders = hudTasksVisible(powersOf(loadSetup()));
    const tasks = orders ? this.hudTasks() : [];
    const pips = taskPips(tasks);
    // Der nächste offene Auftrag ist der, der zählt; sind alle fertig, geht es
    // zurück in die Einsatzzentrale, und genau das steht dann dort.
    const next = tasks.find((task) => task.step < 2);
    const line = !orders ? '' : next ? `${next.room}: ${next.title}` : 'Zurück zur Einsatzzentrale';
    // **Der Handgriff kommt als dritte Zeile dazu** (`rules/chore.ts`): Er
    // gehört in denselben Streifen und nicht in ein zweites Fenster — in der
    // Brille gibt es kein zweites Fenster, und am Desktop sähe man ihn dort
    // nicht, weil man auf die Kiste schaut.
    const chore = this.chore;
    const filled = chore ? Math.round(choreProgress(chore) * 40) : 0;
    const key = `${hud.oxygen}|${hud.suit}|${hud.color}|${pips}|${line}|${orders}|${chore?.label ?? ''}|${filled}`;
    if (this.hud.mesh.userData.paint === key) return;
    this.hud.mesh.userData.paint = key;
    const c = this.hud.ctx;
    const { width: w, height: h } = this.hud.canvas;
    // Ohne Auftragszeile ist der Streifen **eine** Zeile hoch und nicht eine
    // halbleere Tafel: Die Uhr rückt in die Mitte, die Trennlinie fällt weg.
    // Läuft ein Handgriff, braucht die zweite Zeile ihren Platz trotzdem — der
    // Balken steht dort, und die Uhr bleibt darüber stehen: Wer eine Kiste
    // aufklappt, verliert seinen Sauerstoffstand nicht aus den Augen.
    const top = orders || chore ? h * 0.5 : h;
    const pad = h * 0.16;
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(8, 24, 35, 0.78)';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = hud.low ? hud.color : '#33556a';
    c.lineWidth = 4;
    c.strokeRect(2, 2, w - 4, h - 4);
    c.textBaseline = 'middle';
    c.fillStyle = hud.color;
    c.textAlign = 'left';
    c.font = `bold ${Math.round(top * 0.56)}px system-ui`;
    c.fillText(hud.oxygen, pad, top / 2, w * 0.55);
    c.textAlign = 'right';
    c.font = `${Math.round(top * 0.5)}px system-ui`;
    c.fillStyle = round.suit > 0 ? '#adffe8' : hud.color;
    c.fillText(hud.suit, w - pad, top / 2, w * 0.4);
    if (!orders) {
      this.paintChore(chore, top, h);
      this.hud.texture.needsUpdate = true;
      return;
    }
    // Die Trennlinie macht aus zwei Zeilen zwei Zeilen und nicht einen Absatz.
    c.strokeStyle = '#1e3a4a';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(pad, top);
    c.lineTo(w - pad, top);
    c.stroke();
    c.textAlign = 'left';
    c.fillStyle = next ? '#7de9ec' : '#adffe8';
    c.font = `${Math.round(top * 0.52)}px system-ui`;
    c.fillText(pips, pad, top + (h - top) / 2);
    const pipsWidth = c.measureText(pips).width;
    c.fillStyle = '#d8e7ec';
    c.font = `${Math.round(top * 0.42)}px system-ui`;
    c.fillText(line, pad + pipsWidth + pad * 0.7, top + (h - top) / 2, w - pipsWidth - pad * 3);
    this.paintChore(chore, top, h);
    this.hud.texture.needsUpdate = true;
  }

  /**
   * **Der Balken über dem Streifen**, solange ein Handgriff läuft: eine Zeile
   * Text und ein Fortschritt, mehr nicht. Er liegt **über** dem Streifen und
   * schiebt ihn nicht beiseite — wer eine Kiste aufklappt, will die Uhr nicht
   * verlieren, und ein Streifen, der dabei die Höhe wechselt, springt im
   * Blickfeld.
   */
  private paintChore(chore: Chore | null, top: number, h: number): void {
    if (!chore) return;
    const c = this.hud.ctx;
    const { width: w } = this.hud.canvas;
    const pad = h * 0.16;
    // Nur die untere Zeile gehört dem Balken — die Uhr darüber bleibt stehen.
    c.fillStyle = 'rgba(8, 24, 35, 0.96)';
    c.fillRect(2, top, w - 4, h - top - 2);
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillStyle = '#c8ffd9';
    c.font = `${Math.round((h - top) * 0.42)}px system-ui`;
    const text = `${chore.label} · stillstehen`;
    c.fillText(text, pad, top + (h - top) * 0.34, w * 0.55);
    const barY = top + (h - top) * 0.62;
    const barH = Math.max(5, (h - top) * 0.24);
    c.fillStyle = 'rgba(140, 170, 230, 0.24)';
    c.fillRect(pad, barY, w - pad * 2, barH);
    c.fillStyle = '#8ff0b0';
    c.fillRect(pad, barY, (w - pad * 2) * choreProgress(chore), barH);
  }

  private nearby(): {
    cabinet?: Cabinet;
    console?: Console;
    room?: HouseRoom;
    door?: Door;
    locker?: Locker;
  } {
    this.host.ctx.rig.getHeadPosition(_head);
    const spec = this.host.spec();
    const room = roomAt(spec, Math.floor(_head.x / TILE), Math.floor(_head.z / TILE)) ?? undefined;
    return {
      cabinet: this.cabinets.find(
        (c) =>
          (c.id === 'test-supply' || c.id.startsWith('training')
            ? this.crew.options.test
            : c.room === room?.id) && _head.distanceTo(_pos.copy(c.at).setY(1)) < 2.8,
      ),
      console: this.consoles.find(
        (c) =>
          (c.training
            ? this.crew.options.test && !!trainingRoomAt(_head.x, _head.z)
            : c.repair.roomId === room?.id) && _head.distanceTo(c.at) < PANEL_RANGE,
      ),
      room,
      locker: this.lockers.find(
        (l) =>
          this.inLockerRoom(l.id) &&
          _head.distanceTo(_pos.copy(l.group.position).setY(1.4)) < PANEL_RANGE,
      ),
      door: this.doors.find((d) => _head.distanceTo(_pos.copy(d.at).setY(1)) < 2.8),
    };
  }
  private paintDom(): void {
    if (!this.player) return;
    const state = this.host.state(),
      crew = this.crew,
      near = this.nearby();
    const signature = JSON.stringify([
      crew.options,
      crew.hp,
      crew.hidden,
      crew.inventory,
      crew.opened,
      crew.puzzles,
      crew.simulation,
      this.followBot,
      this.sensorMode,
      this.rightItem,
      state.phase,
      state.done,
      near.cabinet?.id,
      near.console?.repair.id,
      near.console?.practice,
      near.console?.selected,
      near.console?.solved,
      near.room?.id,
      near.door?.id,
      near.locker?.id,
      near.locker?.open,
      state.destroyed,
      this.messages,
    ]);
    const intentText = `Techniker: ${{ mission: 'Mission erfüllen', flee: 'Flucht vor Gefahr', hide: 'Leise im Schutzschrank' }[this.missionBot?.survival ?? 'mission']} · Monster: ${{ patrol: 'Patrouille', investigate: 'Geräusch untersuchen', hunt: 'Verfolgung', search: 'Letzte Position absuchen' }[crew.threat.mode]}`;
    const currentIntent = this.dom.querySelector('[data-ai-intent]');
    if (currentIntent) currentIntent.textContent = intentText;
    // Die Uhr läuft außerhalb der Signatur: Sie ändert sich jede Sekunde, und
    // ein Titel, der deshalb jede Sekunde neu gebaut wird, nähme dem Spieler
    // die Knöpfe unter dem Finger weg. Also nur der eine Text.
    const round = state.phase === 'running' ? (this.host.round?.() ?? null) : null;
    const oxygenText = round ? ` · ${roundHud(round).oxygen}` : '';
    const currentOxygen = this.dom.querySelector('[data-oxygen]');
    if (currentOxygen && currentOxygen.textContent !== oxygenText)
      currentOxygen.textContent = oxygenText;
    if (signature === this.stamp) return;
    this.stamp = signature;
    // Welche Klappen offen standen, steht an ihnen selbst — und solange die
    // Tafel zugeklappt ist, gibt es sie nicht. Deshalb wird beides gemerkt:
    // Wer zuklappt und wieder aufklappt, findet sein „Mission, Ausrüstung &
    // Testdeck" so vor, wie er es verlassen hat.
    const expanded =
      this.dom.querySelector<HTMLDetailsElement>('details[data-main]')?.open ?? this.mainOpen;
    const testsExpanded =
      this.dom.querySelector<HTMLDetailsElement>('details[data-tests]')?.open ?? this.testsOpen;
    this.mainOpen = expanded;
    this.testsOpen = testsExpanded;
    this.dom.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = `ORBITAL · ${state.phase === 'won' ? 'MISSION ERFÜLLT' : state.phase === 'lost' ? 'MISSION GESCHEITERT' : crew.simulation ? 'TEST / SICHERE BOT-RUNDE / MONSTER' : crew.options.test ? 'TEST / KEIN MONSTER' : 'MISSION'} · ANZUG ${crew.hp}/3 · ${state.done.length}/3 SYSTEME`;
    const oxygen = document.createElement('span');
    oxygen.dataset['oxygen'] = '';
    oxygen.textContent = oxygenText;
    title.append(oxygen);
    this.dom.append(title);
    // **Zuklappen.** Die Tafel steht über der Station, und auf dem Telefon
    // ließ sie von ihr wenig übrig. Der Knopf davor räumt sie weg, bis auf die
    // Titelzeile und diese zwei Knöpfe — wer sie wiederhaben will, drückt
    // denselben Knopf. Er steht vor dem Zahnrad, weil er häufiger gebraucht
    // wird als alles darunter.
    const fold = document.createElement('button');
    fold.textContent = this.folded ? '▾ Aufklappen' : '▴ Zuklappen';
    fold.dataset.action = 'fold';
    fold.setAttribute('aria-expanded', String(!this.folded));
    this.dom.append(fold);
    // **Das Zahnrad der 2D-Welt** (`showOptions`): Zentrale, 2D von oben,
    // Menü, Verbindung, VR, Ton, Runde verlassen — dieselben Einträge mit
    // denselben Worten wie dort, statt loser Knöpfe, die dasselbe anders
    // nannten. Oben, weil es eine Ansicht ist und kein Handgriff — und
    // zugeklappt der einzige Weg nach draußen, deshalb bleibt es stehen.
    const options = document.createElement('button');
    options.textContent = '⚙ Optionen';
    options.dataset.action = 'options';
    this.dom.append(options);
    this.dom.classList.toggle('is-folded', this.folded);
    if (this.folded) return;
    if (crew.simulation) {
      const camera = document.createElement('button');
      camera.textContent = this.followBot ? 'Freie Kamera' : 'Bot folgen';
      camera.dataset.action = 'follow-bot';
      this.dom.append(camera);
      const overview = document.createElement('button');
      overview.textContent = 'Kartenübersicht';
      overview.dataset.action = 'overview';
      this.dom.append(overview);
      const legend = document.createElement('div');
      legend.textContent =
        'KI-Wege: Cyan = Techniker · Rot = Monster · Ring = Ziel · Flächen = Blickfelder · Orange = Hörbereich bei Sprint (Wände dämpfen) · FUNK = Standort / Gefahr / Auftrag';
      this.dom.append(legend);
      const intent = document.createElement('div');
      intent.dataset.aiIntent = '';
      intent.textContent = intentText;
      this.dom.append(intent);
    }
    if (state.phase === 'lost' || state.phase === 'won') {
      const result = document.createElement('div');
      result.className = 'orbital-result';
      result.setAttribute('role', 'alert');
      const message = document.createElement('p');
      message.textContent =
        state.phase === 'lost'
          ? 'Dein Anzug wurde zerstört. Die Runde ist vorbei.'
          : 'Alle Reparaturen abgeschlossen. Die Crew ist gerettet.';
      const restart = document.createElement('button');
      restart.textContent = 'Runde neu starten';
      restart.dataset.action = 'start';
      result.append(message, restart);
      this.dom.append(result);
    }
    if (crew.hidden) {
      const exit = document.createElement('button');
      exit.textContent = 'Schutzschrank verlassen';
      exit.dataset.action = 'leave';
      this.dom.append(exit);
    }
    const hint = document.createElement('div');
    hint.className = 'orbital-player__keys';
    hint.textContent = crew.simulation
      ? this.followBot
        ? 'Kamera folgt dem Bot · Freie Kamera zum Erkunden wählen'
        : 'Freie Kamera · WASD fliegen · Leertaste ↑ · Strg ↓ · Umschalt schneller'
      : `WASD · Strg ducken · E benutzen (frei vor dir: Licht ${this.rightItem === 'flashlight' && this.torchLit ? 'aus' : 'an'}) · 1: ${this.sensorMode === 'off' ? 'Hand frei' : HAND_LABEL[this.sensorMode]} · 2: ${this.rightItem === 'off' ? 'Hand frei' : this.rightLabel}`;
    this.dom.append(hint);
    const panel = document.createElement('details');
    panel.dataset.main = '';
    panel.open = expanded;
    const heading = document.createElement('summary');
    heading.textContent = 'Mission, Ausrüstung & Testdeck';
    panel.append(heading);
    this.dom.append(panel);
    const row = document.createElement('div');
    row.className = 'orbital-player__actions';
    panel.append(row);
    const button = (text: string, action: string, into: HTMLElement = row): void => {
      const b = document.createElement('button');
      b.textContent = text;
      b.dataset.action = action;
      into.append(b);
    };
    if ((!near.room && !crew.simulation) || crew.hp === 0) {
      // **Dieselben drei Absichten wie im Van und in der Brille**
      // (`rules/lobby.ts`). Vorher standen hier „Mission starten" und „Test
      // ohne Monster", daneben in der Brille „TEST / ohne Monster" und im Van
      // „Test ohne Monster (2D)" — dreimal dasselbe, dreimal anders benannt.
      // Die Verteilung kommt aus dem Speicher (`loadSetup`), weil sie dort
      // ohnehin bei jeder Änderung landet: So sagt die Zeile darunter
      // dasselbe wie die Tafel im Van, ohne einen zweiten Draht dorthin.
      const setup = loadSetup();
      const active = intentOf(setup);
      for (const intent of INTENTS)
        button(
          `${intent === active ? '● ' : ''}${INTENT_LABELS[intent]} — ${INTENT_HINTS[intent]}`,
          `intent:${intent}`,
        );
      const line = document.createElement('div');
      line.className = 'orbital-player__setup';
      line.textContent = describeSetup(setup);
      row.append(line);
      button(`Skeld · ${crew.options.rooms} Räume`, 'rooms');
      button(MONSTERS.find((m) => m.id === crew.options.monster)!.name, 'monster');
    }
    button(`Linke Hand: ${HAND_LABEL[this.sensorMode]}`, 'sensor');
    button(`Rechte Hand: ${this.rightLabel}`, 'right');
    button('Medkit', 'heal');
    // **Ablegen steht nur da, wenn etwas abzulegen ist.** Ein Knopf, der bei
    // leeren Händen nichts tut, ist einer, den man mitten in der Flucht trifft.
    if (carriedPart(this.host.spec(), state))
      button(
        `${lootLabel(this.host.spec(), carriedPart(this.host.spec(), state))} ablegen (G)`,
        'drop',
      );
    if (crew.hidden) button('Schutzschrank verlassen', 'leave');
    if (near.cabinet && !crew.hidden) {
      button(`${near.cabinet.mark} öffnen / schließen`, `open:${near.cabinet.id}`);
      if (crew.opened.includes(near.cabinet.id) && near.cabinet.loot)
        button(
          `Nehmen: ${lootLabel(this.host.spec(), near.cabinet.loot)}`,
          `loot:${near.cabinet.id}`,
        );
    }
    if (near.door && !crew.hidden) button('Schiebetür bedienen', `door:${near.door.id}`);
    if (near.console && !crew.hidden) {
      const r = near.console.repair,
        p = near.console.practice ?? puzzleFor(crew, r.id);
      const box = document.createElement('div');
      box.className = 'orbital-player__puzzle';
      panel.append(box);
      const caption = document.createElement('p');
      caption.textContent = `${r.title} · ${p.open ? (r.puzzle === 'wires' ? 'Kabelstart → passendes Symbol' : 'Archiv nach dem Code fragen') : `Benötigt: ${r.item}`}`;
      box.append(caption);
      if (near.console.training && near.console.solved)
        button('Übung geschafft — zurücksetzen', `repair:${r.id}:0.5:0.5`, box);
      else if (!p.open) button('Wartungskasten öffnen', `repair:${r.id}:0.5:0.5`, box);
      else if (r.puzzle === 'wires') {
        const symbols = ['▲', '●', '■', '◆'];
        for (let i = 0; i < 4; i++) {
          button(`Start ${symbols[i]}`, `repair:${r.id}:0.2:${0.35 + i * 0.16}`, box);
          button(`Anschluss ${symbols[r.order[i]!]}`, `repair:${r.id}:0.8:${0.35 + i * 0.16}`, box);
        }
      } else if (r.puzzle === 'sequence') {
        for (let i = 1; i <= 4; i++) button(String(i), `repair:${r.id}:${(i - 0.5) / 4}:0.7`, box);
      } else {
        for (let i = 0; i < 3; i++)
          button(`Frequenz ${i + 1}: ${p.digits[i]}`, `repair:${r.id}:${(i + 0.5) / 3}:0.5`, box);
        button('Bestätigen', `repair:${r.id}:0.5:0.9`, box);
      }
    }
    if (near.locker && !crew.hidden) {
      const box = document.createElement('div');
      panel.append(box);
      const caption = document.createElement('span');
      const wrecked = this.wrecked(near.locker.id);
      caption.textContent = wrecked
        ? 'Kabine zerstört — kein Schutz mehr. '
        : 'Schutzschrank — ohne Code, einfach hinein. ';
      box.append(caption);
      // Keine Knöpfe an einem Wrack: Es nimmt keinen Gast.
      if (!wrecked) button('Verstecken', `locker:${near.locker.id}:1`, box);
    }
    if (crew.options.test) {
      const details = document.createElement('details');
      details.dataset.tests = '';
      details.open = testsExpanded;
      const summary = document.createElement('summary');
      summary.textContent = 'Test / Räume / Simulation';
      details.append(summary);
      panel.append(details);
      button(crew.options.bright ? 'Testlicht aus' : 'Testlicht an', 'light', details);
      button(crew.simulation ? 'Bot-Runde beenden' : 'Bot-Runde anschauen', 'simulate', details);
      if (crew.simulation) {
        button(simulationSpeedLabel(this.host.simulationSpeed?.() ?? 1), 'tempo', details);
        button(
          `Licht: ${lightingPreset(this.host.lighting?.() ?? DEFAULT_LIGHTING).label}`,
          'deck-light',
          details,
        );
      }
      button('Zur Zentrale', 'home', details);
      details.append(this.buildTunePanel());
      for (const lab of TRAINING_ROOMS) button(lab.name, `lab:${lab.id}`, details);
      for (const room of this.host.spec().rooms)
        button(`Testbesuch: ${room.name} / ${roomCode(room.id)}`, `visit:${room.id}`, details);
      if (crew.simulation) {
        button('Höher fliegen', 'up', details);
        button('Tiefer fliegen', 'down', details);
        const log = document.createElement('div');
        log.className = 'orbital-radio';
        log.setAttribute('role', 'log');
        log.setAttribute('aria-label', 'Simulierter Funkverkehr');
        for (const message of this.messages) {
          const row = document.createElement('div');
          row.textContent = message;
          log.append(row);
        }
        this.dom.append(log);
      }
    }
  }
  /**
   * **Die Justage- und Trainingstafel der Bot-Runde.**
   *
   * Links die Zahlen des Monsters, rechts die des Technikers — dieselben, mit
   * denen die Runde wirklich gespielt wird (`botTuning.ts`). Darunter die drei
   * Knöpfe, die eine Suche anwerfen: Das Training spielt hunderte Runden
   * ohne Bild aus (`roundSim.ts`) und schiebt die Gewichte auf „der Techniker
   * gewinnt 60–70 %" zu. Es rechnet **zwischen den Bildern** weiter, sonst
   * stünde hier ein eingefrorener Tab.
   */
  private tuning(): BotTuning {
    return clampTuning(this.host.tuning?.() ?? null);
  }

  private applyTuning(tuning: BotTuning): void {
    this.host.retune?.(clampTuning(tuning));
    this.refreshTuneLabels();
  }

  private buildTunePanel(): HTMLElement {
    if (this.tunePanelReady) return this.tunePanel;
    this.tunePanelReady = true;
    const panel = this.tunePanel;
    panel.className = 'orbital-tuning';
    const summary = document.createElement('summary');
    summary.textContent = 'Bots justieren & trainieren';
    panel.append(summary);
    const hint = document.createElement('p');
    hint.textContent =
      'Dieselben Zahlen, mit denen die Runde läuft. Das Training sucht Gewichte, ' +
      'mit denen der Techniker im Schnitt 60–70 % der Runden gewinnt.';
    panel.append(hint);

    const group = (
      title: string,
      fields: ReadonlyArray<{
        id: string;
        label: string;
        unit: string;
        min: number;
        max: number;
        step: number;
      }>,
      side: 'monster' | 'technician',
    ): void => {
      const box = document.createElement('div');
      box.className = 'orbital-tuning__group';
      const heading = document.createElement('h4');
      heading.textContent = title;
      box.append(heading);
      for (const field of fields) {
        const key = `${side}:${field.id}`;
        const row = document.createElement('label');
        row.className = 'orbital-tuning__row';
        const name = document.createElement('span');
        name.textContent = field.label;
        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(field.min);
        input.max = String(field.max);
        input.step = String(field.step);
        input.dataset.tune = key;
        const value = document.createElement('output');
        input.addEventListener('input', () => {
          const tuning = copyTuning(this.tuning());
          (tuning[side] as unknown as Record<string, number>)[field.id] = Number(input.value);
          this.applyTuning(tuning);
        });
        row.append(name, input, value);
        box.append(row);
        this.tuneLabels.set(key, value);
        this.tuneInputs.set(key, input);
      }
      panel.append(box);
    };
    group('Monster', MONSTER_FIELDS, 'monster');
    group('Techniker', TECHNICIAN_FIELDS, 'technician');

    const actions = document.createElement('div');
    actions.className = 'orbital-player__actions';
    const button = (text: string, run: () => void): void => {
      const element = document.createElement('button');
      element.type = 'button';
      element.textContent = text;
      element.addEventListener('click', run);
      actions.append(element);
    };
    button('Monster trainieren', () => this.startTraining('monster'));
    button('Techniker trainieren', () => this.startTraining('technician'));
    button('Beide trainieren', () => this.startTraining('both'));
    button('Training abbrechen', () => {
      this.training = null;
      this.trainingNote = 'Training abgebrochen.';
      this.refreshTuneLabels();
    });
    button('Auf Auslieferung zurück', () => {
      this.training = null;
      this.trainingNote = 'Ausgelieferte Gewichte wiederhergestellt.';
      this.applyTuning(clampTuning(null));
    });
    panel.append(actions);
    const line = document.createElement('div');
    line.className = 'orbital-tuning__status';
    line.setAttribute('role', 'status');
    this.trainingLine = line;
    panel.append(line);
    this.refreshTuneLabels();
    return panel;
  }

  private startTraining(side: TrainingSide): void {
    this.training = new TrainingRun(
      this.tuning(),
      side,
      40,
      TRAINING_DEFAULTS,
      Date.now() & 0xffff || 1,
    );
    this.trainingNote = 'Training läuft …';
    this.refreshTuneLabels();
  }

  private stepTraining(): void {
    const run = this.training;
    if (!run) return;
    // Zehn Millisekunden **je echtem Bild** und nicht je gerechnetem: Im
    // Zeitraffer läuft dieselbe Aktualisierung achtmal, und achtzig
    // Millisekunden Training je Bild sind kein Training mehr, sondern ein
    // Ruckeln.
    const now = Date.now();
    if (now - this.trainedAt < 14) return;
    this.trainedAt = now;
    run.advance(10);
    const state = run.state;
    if (state.step > 0 || run.finished) this.host.retune?.(state.tuning);
    if (run.finished) {
      this.training = null;
      this.trainingNote = `Training fertig: Techniker gewinnt ${Math.round(
        state.duo * 100,
      )} % zu zweit und ${Math.round(state.rate * 100)} % mit Zentrale (${
        inBand({ duo: state.duo, crew: state.rate })
          ? 'in beiden Zielbändern'
          : 'noch neben einem Zielband'
      }), ${state.step} Schritte.`;
      this.log(`BOT-TRAINING: ${this.trainingNote}`);
    } else
      this.trainingNote = `Training ${Math.round(run.fraction * 100)} % · beste Quoten ${Math.round(
        state.duo * 100,
      )} % / ${Math.round(state.rate * 100)} %`;
    this.refreshTuneLabels();
  }

  private refreshTuneLabels(): void {
    if (!this.tunePanelReady) return;
    const tuning = this.tuning();
    for (const [key, label] of this.tuneLabels) {
      const [side, id] = key.split(':') as ['monster' | 'technician', string];
      const fields = side === 'monster' ? MONSTER_FIELDS : TECHNICIAN_FIELDS;
      const field = fields.find((one) => one.id === id);
      if (!field) continue;
      const value = (tuning[side] as unknown as Record<string, number>)[id]!;
      label.textContent = fieldText(field, value);
      const input = this.tuneInputs.get(key);
      if (input && document.activeElement !== input) input.value = String(value);
    }
    if (this.trainingLine) this.trainingLine.textContent = this.trainingNote;
  }

  /**
   * **Ein Geräusch des Monsters** — genau in dem Bild, in dem es seinen
   * Anlass hat (`monsterRoutine.ts`).
   */
  monsterCue(cue: MonsterCue, at: { x: number; z: number }): void {
    if (!cue) return;
    if (cue === 'breach') {
      this.burst('smoke', _pos.set(at.x, 1.1, at.z));
      this.burst('sparks', _pos.set(at.x, 1.45, at.z));
      this.log('Das Monster reißt die Kabine auf — Rauch und Funken.');
    }
    if (cue === 'scream') this.log('Das Monster schreit vor der Kabine.');
    if (!this.audioOn) return;
    // Ein geöffneter Schrank ist ein lauteres Klacken und kein eigenes Geräusch.
    const kind = cue === 'sniff' ? 'klack' : cue;
    this.audio.play(kind, at, this.crew.options.monster, cue === 'sniff' ? 1.6 : 1);
  }

  /**
   * **Eine Lampe flackert oder geht aus** (`rules/lamps.ts`) — das Sirren dort,
   * wo sie hängt. Es kommt zweimal: einmal, wenn die letzten Sekunden
   * anbrechen, und einmal, wenn es dunkel wird. Die erste Warnung ist der
   * Grund, warum es das Geräusch gibt: Man steht selten unter der Lampe, die
   * gleich ausgeht.
   */
  lampCue(at: { x: number; z: number }): void {
    if (!this.audioOn) return;
    this.audio.play('lamp', at);
  }

  /**
   * **Das Optionsmenü auf- oder zuklappen** und dabei neu schreiben — es
   * ist klein, und ein Menü, das beim Aufmachen einen alten Stand zeigt,
   * ist schlimmer als eines, das jedes Mal neu entsteht.
   */
  showOptions(open: boolean): void {
    this.optionsOpen = open;
    if (open) renderOptions(this.optionsPanel, this.shipOptions());
    this.optionsRoot.hidden = !open;
  }

  /**
   * **Die Einträge des Schiffs** — dieselben wie in der 2D-Welt
   * (`FlatMode.renderOptions`), ohne die zwei, die es im Schiff nicht gibt
   * (Zielpfade, die Sichtmodi des Zuschauers), und mit „Zentrale" statt
   * „Karte" unter „Aufmachen": Die Karte von oben *ist* hier die andere
   * Ansicht, und die steht als „2D ↔ 3D" weiter unten.
   */
  private shipOptions(): OptionItem[] {
    const crew = this.crew;
    const items: OptionItem[] = [
      head(crew.simulation ? 'Zuschauer' : 'Techniker'),
      head(SHARED.view),
      note(`Realitätsnah · ${SHARED.playerView}`),
      watchKey(crew.simulation),
      head(SHARED.open),
    ];
    if (this.host.stations)
      items.push(
        key({ stations: '' }, 'Zentrale', 'Zurück in die Lobby · Rolle wechseln, Aufbau ändern'),
      );
    items.push(
      key(
        { pagemenu: '' },
        SHARED.menu,
        'Das Weltmenü der Seite: Welt wechseln, VR, Einstellungen',
      ),
      key({ pagenet: '' }, SHARED.net, SHARED.netHint),
      // **Und der Weg in die Brille.** Er hing bis hierher am Streifen der
      // Seite (`index.html`, `#hud-vr`), und der ist in dieser Welt aus. Der
      // Knopf ist nicht abgebaut, nur versteckt — dieser Eintrag drückt ihn
      // stellvertretend, genau wie es das Telefon tut (`stationUi`).
      key({ pagevr: '' }, 'VR', 'Mit der Brille weiterspielen — dieselbe Runde, dasselbe Schiff'),
      ...soundKeys({
        effects: this.audioOn ? levelLabel(this.hearingAudio.levels.effects) : 'aus',
        ambient: this.audioOn ? levelLabel(this.hearingAudio.levels.ambient) : 'aus',
      }),
    );
    if (this.host.switchView && !crew.simulation)
      items.push(switchViewKey('2d', VIEW_LABELS['2d']));
    items.push(...leaveKeys());
    return items;
  }

  private optionsClick(event: Event): void {
    const pressed = (event.target as HTMLElement | null)?.closest('button');
    if (!pressed) return;
    const data = pressed.dataset;
    if (data['watch'] !== undefined) this.toggleSimulation();
    else if (data['stations'] !== undefined) this.host.stations?.();
    else if (data['pagemenu'] !== undefined) this.host.ctx.menu.toggle();
    else if (data['pagenet'] !== undefined) pressPageButton('net');
    else if (data['pagevr'] !== undefined) pressPageButton('vr');
    else if (data['audio'] === 'effects' || data['audio'] === 'ambient') {
      // Ein Regler, der auf „aus" steht, weil der ganze Ton aus ist, schaltet
      // ihn erst wieder an — sonst dreht man an etwas, das man nicht hört.
      if (!this.audioOn) {
        this.audioOn = true;
        this.audio.setEnabled(true);
        this.hearingAudio.setEnabled(true);
      } else this.hearingAudio.cycle(data['audio']);
      renderOptions(this.optionsPanel, this.shipOptions());
      return;
    } else if (data['switchView'] === '2d') this.host.switchView?.('2d');
    else if (data['leave'] !== undefined) this.host.stations?.();
    else if (data['closeOptions'] === undefined) return;
    this.showOptions(false);
    this.stamp = '';
    this.paint();
  }

  private readonly domClick = (event: Event): void => {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]')
      ?.dataset.action;
    if (!action) return;
    this.host.ctx.rig.getHeadPosition(this.lastSoundAt);
    this.actionHand = null;
    const [kind, id, a, b] = action.split(':');
    if (kind === 'start') this.host.start();
    else if (kind === 'test') this.host.test();
    // Die drei Kacheln der Lobby, hier als Knöpfe: Spielen ist die Mission,
    // Trainieren der sichere Test, Zuschauen die Bot-Runde.
    else if (kind === 'intent') {
      if (id === 'watch') this.toggleSimulation();
      else if (id === 'train') this.host.test();
      else this.host.start();
    } else if (kind === 'stations') this.host.stations?.();
    else if (kind === 'fold') this.folded = !this.folded;
    else if (kind === 'options') this.showOptions(!this.optionsOpen);
    else if (kind === 'flat-view') this.host.switchView?.('2d');
    else if (kind === 'overview') {
      this.followBot = false;
      if (!this.host.ctx.renderer.xr.isPresenting) {
        this.host.ctx.rig.setHeadWorldPosition(new THREE.Vector3(0, 90, -22));
        this.host.ctx.camera.lookAt(0, 0, -22);
        this.host.ctx.rig.updateMatrixWorld(true);
      }
    } else if (kind === 'follow-bot') this.followBot = !this.followBot;
    else if (kind === 'rooms') this.commandAction(3);
    else if (kind === 'monster') this.commandAction(4);
    else if (kind === 'light') this.commandAction(5);
    else if (kind === 'sensor') this.cycleSensor();
    else if (kind === 'right') this.cycleRight();
    else if (kind === 'heal') this.heal();
    else if (kind === 'drop') this.dropPart();
    else if (kind === 'leave') this.leaveLocker();
    else if (kind === 'menu') this.host.ctx.menu.toggle();
    else if (kind === 'open') this.openCabinet(id!);
    else if (kind === 'loot') this.takeLoot(id!);
    else if (kind === 'repair') this.repairInput(id!, Number(a), Number(b));
    else if (kind === 'locker') this.lockerDigit(id!, Number(a));
    else if (kind === 'door') this.host.door(id!);
    else if (kind === 'simulate') this.toggleSimulation();
    else if (kind === 'tempo') this.host.cycleSimulationSpeed?.();
    else if (kind === 'deck-light') this.host.setLighting?.({});
    else if (kind === 'up') this.flatFlight = 1;
    else if (kind === 'down') this.flatFlight = -1;
    else if (kind === 'visit' && this.crew.options.test) this.visit(id!);
    else if (kind === 'home') this.home();
    else if (kind === 'lab') this.visitLab(id as TrainingRoomId);
    this.stamp = '';
    this.paint();
  };

  menu(): MenuEntry[] {
    const row = (id: string, text: string, sub: string, run: () => void): MenuEntry => ({
      id: `orbital:${id}`,
      label: text,
      sub,
      icon: 'cube',
      accent: SHIP.cyan,
      run,
    });
    const rows = [
      ...(this.comfort?.menu() ?? []),
      row(
        'sensor',
        `Linke Hand: ${HAND_LABEL[this.sensorMode]}`,
        'Greifbares Gerät · Radar / Röntgen / leere Hand',
        () => this.cycleSensor(),
      ),
      row('heal', `Medkit · Anzug ${this.crew.hp}/3`, 'Ein Medkit heilt einen Treffer', () =>
        this.heal(),
      ),
      row(
        'leave',
        'Schutzschrank verlassen',
        this.crew.hidden ? 'Du bist versteckt' : 'Kein Schutzschrank aktiv',
        () => this.leaveLocker(),
      ),
      row(
        'audio',
        `Ton: ${this.audioOn ? 'an' : 'aus'}`,
        'Maschinen, Schritte, Sensor und Türen',
        () => {
          this.audioOn = !this.audioOn;
          this.audio.setEnabled(this.audioOn);
          this.hearingAudio.setEnabled(this.audioOn);
        },
      ),
      row(
        'ambient',
        `Ambiente: ${levelLabel(this.hearingAudio.levels.ambient)}`,
        'Brummen der Station, Dunkelheit, Knarren — aus, leise oder normal',
        () => {
          this.hearingAudio.cycle('ambient');
        },
      ),
    ];
    if (['won', 'lost'].includes(this.host.state().phase))
      rows.unshift(
        row('restart', 'Runde neu starten', 'Neue Mission mit denselben Einstellungen', () =>
          this.host.start(),
        ),
      );
    if (this.crew.options.test) {
      rows.push({
        id: 'orbital:labs',
        label: 'Testdeck: einzelne Übungsräume',
        sub: 'Abseits der Mission · mit Anleitung und Lösung',
        icon: 'cube',
        accent: SHIP.amber,
        children: TRAINING_ROOMS.map((lab) =>
          row(`lab:${lab.id}`, lab.name, 'Zum sicheren Übungsraum', () => this.visitLab(lab.id)),
        ),
      });
      rows.push(
        row(
          'simulation',
          this.crew.simulation ? 'Bot-Runde beenden' : 'Bot-Runde anschauen',
          'Techniker sammelt Ersatzteile, repariert Systeme und kehrt heim · freie Flugkamera',
          () => this.toggleSimulation(),
        ),
      );
      rows.push({
        id: 'orbital:visits',
        label: 'Testbesuch in einem Raum',
        sub: 'Reparaturen, Schränke und Ausrüstung ausprobieren',
        icon: 'cube',
        accent: SHIP.amber,
        children: this.host
          .spec()
          .rooms.map((r) =>
            row(`visit:${r.id}`, `${r.name} / ${roomCode(r.id)}`, MARKS[r.signature], () =>
              this.visit(r.id),
            ),
          ),
      });
    }
    rows.push(
      row('home', 'Zur Einsatzzentrale', 'Im Test oder nach Rundenende', () => {
        if (this.crew.options.test || this.host.state().phase !== 'running') this.home();
        else this.host.say('Während der Mission zu Fuß zur Zentrale zurückkehren.');
      }),
    );
    return rows;
  }
  private visit(id: string): void {
    const room = this.host.spec().rooms.find((r) => r.id === id);
    if (!room || !this.crew.options.test) return;
    this.leaveLocker();
    const c = safeRoomSpawn(this.host.spec(), room.id);
    this.host.travel(new THREE.Vector3(c.x, 0, c.z));
  }
  private visitLab(id: TrainingRoomId): void {
    if (!this.crew.options.test || !TRAINING_ROOMS.some((r) => r.id === id)) return;
    this.leaveLocker();
    if (this.crew.simulation) this.toggleSimulation();
    const at = trainingSpawn(id);
    this.host.travel(new THREE.Vector3(at.x, at.y, at.z));
    this.host.say(
      `${TRAINING_ROOMS.find((r) => r.id === id)!.name} · E / Trigger zum Ausprobieren. Kein Monster.`,
    );
  }
  private home(): void {
    this.leaveLocker();
    if (this.crew.simulation) this.toggleSimulation();
    this.host.travel(new THREE.Vector3(COMMAND_HOME.x, 0, COMMAND_HOME.z));
  }

  get botPose() {
    return this.missionBot?.pose ?? null;
  }

  get botNavigation() {
    return this.missionBot?.navigation ?? null;
  }

  get botPosition(): THREE.Vector3 | null {
    return this.crew.simulation ? (this.simulated?.position ?? null) : null;
  }

  /** Begins a complete, repeatable mission demonstration on the safe test deck. */
  startBotRound(): void {
    if (!this.crew.options.test) return;
    this.leaveLocker();
    const state = this.host.state();
    state.phase = 'running';
    state.time = 0;
    state.done = [];
    state.taken = [];
    state.dropped = [];
    state.lit = [];
    state.shut = [];
    state.fuse = false;
    // Eine neue Bot-Runde beginnt mit heilen Kabinen (`rules/roundRules.ts`).
    state.destroyed = [];
    this.crew.hp = 3;
    this.crew.opened = [];
    this.crew.inventory = [];
    this.crew.puzzles = {};
    this.crew.simulation = true;
    this.followBot = true;
    for (const panel of this.dom.querySelectorAll('details')) panel.open = false;
    this.host.ctx.rig.frozen = true;
    this.hiddenWas = false;
    if (!this.simulated) {
      this.simulated = buildCrewmate();
      this.simulated.name = 'simulated-astronaut';
    }
    this.root.add(this.simulated);
    this.messages.length = 0;
    this.missionBot = new MissionBot({
      spec: this.host.spec(),
      state,
      route: (from, target) => this.host.routeTo?.(from, target) ?? null,
      revision: () => this.host.routeVersion?.() ?? 0,
      danger: (pose) => this.host.danger?.(pose) ?? null,
      visible: (from, to) => this.host.visible?.(from, to) ?? false,
      tuning: () => this.tuning().technician,
      say: (text) => this.log(text),
    });
    this.simulated.position.set(this.missionBot.pose.x, 0, this.missionBot.pose.z);
    if (this.host.ctx.renderer.xr.isPresenting)
      this.host.travel(new THREE.Vector3(COMMAND_HOME.x, 6, COMMAND_HOME.z + 5));
    else this.followBotCamera(0, true);
    this.host.ctx.refreshWorldMenu();
    this.stamp = '';
  }

  private toggleSimulation(): void {
    if (!this.crew.options.test) return;
    if (!this.crew.simulation) {
      this.startBotRound();
      return;
    }
    this.leaveBotRound();
  }

  /**
   * **Die Vorführung im Schiff beenden** — ohne sie gleich wieder als die
   * andere anzufangen. Die Welt braucht das, wenn der Zuschauer von innen nach
   * oben wechselt (`HauntingWorld.swapDemo`): Erst muss der Modelltechniker
   * weg, sonst läuft er unter der Karte weiter.
   */
  leaveBotRound(): void {
    if (!this.crew.simulation) return;
    this.crew.hidden = '';
    this.crew.simulation = false;
    this.missionBot = null;
    this.simulated?.removeFromParent();
    this.host.ctx.rig.frozen = false;
    this.host.ctx.refreshWorldMenu();
    this.home();
  }
  private stepSimulation(dt: number): void {
    if (!this.crew.simulation || !this.simulated) return;
    const ctx = this.host.ctx;
    if (ctx.renderer.xr.isPresenting || !this.followBot) {
      const left = ctx.input.get('left')?.thumbstick,
        right = ctx.input.get('right')?.thumbstick;
      ctx.camera.getWorldDirection(_direction);
      _direction.y = 0;
      _direction.normalize();
      ctx.rig.position.addScaledVector(_direction, -(left?.y ?? 0) * dt * 4);
      ctx.rig.position.x += -_direction.z * (left?.x ?? 0) * dt * 4;
      ctx.rig.position.z += _direction.x * (left?.x ?? 0) * dt * 4;
      ctx.rig.position.y += (-(right?.y ?? 0) + this.flatFlight) * dt * 12;
      this.flatFlight *= Math.max(0, 1 - dt * 2);
      ctx.rig.position.y = Math.max(0, Math.min(120, ctx.rig.position.y));
      ctx.rig.updateMatrixWorld(true);
    }
    const beforeX = this.simulated.position.x,
      beforeZ = this.simulated.position.z;
    this.missionBot?.update(dt);
    this.simulated.visible = !this.crew.hidden;
    if (this.missionBot) {
      this.simulated.position.set(this.missionBot.pose.x, 0, this.missionBot.pose.z);
      this.simulated.rotation.y = this.missionBot.pose.yaw + Math.PI;
    }
    if (
      Math.hypot(this.simulated.position.x - beforeX, this.simulated.position.z - beforeZ) > 0.001
    )
      animateCreature(this.simulated, performance.now() / 1000);
    else
      for (const limb of this.simulated.children) {
        if (limb.name === 'arm' || limb.name === 'leg')
          limb.rotation.x = THREE.MathUtils.damp(limb.rotation.x, 0, 10, dt);
      }
    this.followBotCamera(dt);
  }
  private followBotCamera(dt: number, immediately = false): void {
    const ctx = this.host.ctx;
    if (!this.followBot || !this.simulated || ctx.renderer.xr.isPresenting) return;
    this.followTarget.copy(this.simulated.position);
    this.followTarget.x += 8;
    this.followTarget.y += 12;
    this.followTarget.z += 10;
    ctx.rig.getHeadPosition(this.followEye);
    this.followEye.lerp(this.followTarget, immediately ? 1 : 1 - Math.exp(-3 * Math.max(0, dt)));
    ctx.rig.setHeadWorldPosition(this.followEye);
    this.followTarget.copy(this.simulated.position).y += 1;
    ctx.camera.lookAt(this.followTarget);
    ctx.rig.updateMatrixWorld(true);
  }
  private log(text: string): void {
    this.messages.push(text);
    if (this.messages.length > 4) this.messages.shift();
    this.host.say(text);
  }

  burst(kind: string, at: THREE.Vector3): void {
    if (kind !== 'sparks' && kind !== 'smoke' && kind !== 'fire') return;
    this.effects.emit(kind, at);
    if (this.audioOn && kind === 'sparks') this.audio.play('spark', at);
  }
  private stepSound(dt: number, head: THREE.Vector3): void {
    if (!this.audioOn) return;
    this.audioTimer -= dt;
    this.effectTimer -= dt;
    const state = this.host.state();
    const room = roomAt(this.host.spec(), Math.floor(head.x / TILE), Math.floor(head.z / TILE));
    if (this.audioTimer <= 0) {
      const step = Math.min(0.1, dt + 0.05 - this.audioTimer);
      this.audioTimer = 0.05;
      this.host.ctx.camera.getWorldDirection(_direction);
      const frame = this.audioFrame;
      const travelled = this.hasAudioHead ? this.audioHead.distanceTo(head) : 0;
      frame.playerSpeed =
        !this.crew.simulation && travelled < 0.8 ? travelled / Math.max(0.02, step) : 0;
      frame.exertion = this.crew.simulation ? 0 : this.crew.exertion;
      this.audioHead.copy(head);
      this.hasAudioHead = true;
      frame.listener.x = head.x;
      frame.listener.z = head.z;
      frame.forward.x = _direction.x;
      frame.forward.z = _direction.z;
      frame.monster = state.monster;
      frame.kind = this.crew.options.monster;
      frame.active = state.monsterOn && !this.crew.simulation;
      // Der Herzschlag ist das Einzige, was bei einer Verfolgung über den
      // Abstand nach hinten Auskunft gibt: je näher, desto schneller.
      const chased =
        state.monster && this.crew.threat.mode === 'hunt' && !this.crew.hidden
          ? Math.max(0, 1 - Math.hypot(state.monster.x - head.x, state.monster.z - head.z) / 18)
          : 0;
      frame.chase = this.crew.options.test && !this.crew.simulation ? 0 : chased;
      frame.test = this.crew.options.test;
      frame.venting = this.crew.venting > 0;
      const engine = stationLayout(this.host.spec()).find((p) => p.id === 'console-engine');
      frame.machine = engine;
      frame.engineRepaired = state.done.includes('engine');
      // Schritte, Rufe und Herzschlag spielt das Paket Audio auf dem Hörmodell
      // der Karte (um Ecken, durch Wände gedämpft); `ShipAudio` behält die
      // übrigen Geräusche und bekommt dasselbe Modell für ihre Entfernung.
      const snapshot = this.host.mapSnapshot?.();
      frame.hearing = snapshot ? this.hearingAudio.lookup(snapshot, frame.listener) : undefined;
      frame.footsteps = !snapshot;
      if (snapshot) {
        this.hearingAudio.update(step, {
          snapshot,
          listener: {
            at: frame.listener,
            forward: frame.forward,
            speed: frame.playerSpeed,
            concealed: !!this.crew.hidden,
          },
          kind: frame.kind,
          active: frame.active,
          monster: { pace: this.host.monsterPace?.(), chase: frame.chase },
        });
        frame.playerSpeed = 0;
        frame.chase = 0;
      }
      this.audio.update(step, frame);
    }
    if (room?.kind === 'werkstatt' && this.effectTimer <= 0 && !state.done.includes('engine')) {
      this.effectTimer = 4;
      const engine = stationLayout(this.host.spec()).find((p) => p.id === 'console-engine');
      if (engine) this.burst('smoke', _pos.set(engine.x, 0.6, engine.z));
    }
  }
  private sound(kind: 'door' | 'click' | 'success' | 'error' | 'step', gain = 0.035): void {
    // Das Monster hört das Hantieren auch bei stummgeschaltetem Ton.
    this.host.noise?.(
      this.lastSoundAt,
      kind === 'door' ? NOISE.door : kind === 'click' ? NOISE.click : NOISE.interact,
    );
    if (!this.audioOn) return;
    if (kind === 'door') {
      this.audio.play('door', this.lastSoundAt);
      this.comfort?.pulse('door', this.actionHand);
      return;
    }
    if (kind === 'success') this.comfort?.pulse('success', this.actionHand);
    if (kind === 'error') this.comfort?.pulse('error', this.actionHand);
    const from = kind === 'step' ? 65 : kind === 'error' ? 260 : kind === 'success' ? 620 : 480;
    playTone({
      type: kind === 'error' ? 'sawtooth' : 'sine',
      from,
      to: kind === 'success' ? 920 : from * 0.5,
      duration: 0.15,
      gain,
    });
  }
  dispose(): void {
    // The view owns the shelter return position and demo navigator. A role
    // change must release both before their state outlives those controllers.
    if (this.player) {
      this.leaveLocker();
      if (this.missionBot && this.crew.simulation) this.toggleSimulation();
    }
    this.disposed = true;
    this.desktop.dispose();
    this.comfort?.dispose();
    this.crosshair.remove();
    this.torch.removeFromParent();
    this.heldLamp.disposeTool();
    this.scanner.removeFromParent();
    this.handheldXray.disposeTool();
    this.handheldRadar.disposeTool();
    this.leftLamp.disposeTool();
    // Das Teil in der Hand hängt in der Brille am Controller und nicht am
    // Streifen — wer nur den Streifen wegräumt, lässt es dort zurück.
    this.heldPart.removeFromParent();
    disposeObject(this.heldPart);
    disposeObject(this.heldMedkit);
    this.status.mesh.removeFromParent();
    disposeObject(this.status.mesh);
    this.hud.mesh.removeFromParent();
    disposeObject(this.hud.mesh);
    this.dom.remove();
    this.dom.removeEventListener('click', this.domClick);
    document.body.classList.remove('orbital-on');
    this.controls?.dispose();
    this.controls = null;
    this.optionsRoot.remove();
    this.compass?.dispose();
    this.compass = null;
    for (const target of this.targets) this.host.ctx.pointer.remove(target);
    this.effects.dispose();
    this.audio.dispose();
    this.hearingAudio.dispose();
    for (const [material, color] of this.suitColors) material.color.copy(color);
    if (this.player) {
      this.host.ctx.wear(null);
      this.host.ctx.avatar.traverse((o) => o.layers.set(LAYER_SELF_ONLY));
      this.host.ctx.rig.frozen = false;
    }
    this.visor.removeFromParent();
    this.suit.removeFromParent();
    disposeObject(this.visor);
    disposeObject(this.suit);
    disposeObject(this.root);
    this.root.removeFromParent();
  }
}

function lootLabel(spec: HouseSpec, id: string): string {
  return (
    spec.tasks.find((t) => t.id === id)?.label ??
    {
      radar: 'Bewegungsradar',
      xray: 'Röntgenscanner',
      medkit: 'Medkit',
      'test-kit': 'Alle Werkzeuge + Medkit',
    }[id] ??
    id
  );
}
function disposeObject(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : []) {
      materials.add(material);
      const map = (material as THREE.MeshBasicMaterial).map;
      if (map) textures.add(map);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}

/**
 * **Die Lüftungsschlitze des Schrankgeists**: sechs dunkle Stäbe in
 * Augenhöhe, innen an der Tür, mit Luft dazwischen. Sie sind das Einzige am
 * Schrank, das von innen undurchsichtig bleibt — genau das, was man durch
 * einen Spind sieht: Streifen von Licht.
 */
function buildLockerSlits(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'locker-slits';
  const material = new THREE.MeshBasicMaterial({ color: 0x0a0d12 });
  const width = LOCKER_SIZE.width - 0.3;
  const z = LOCKER_SIZE.depth / 2 - 0.03;
  for (let i = 0; i < 6; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(width, 0.035, 0.01), material);
    bar.position.set(0, 1.42 + i * 0.075, z);
    group.add(bar);
  }
  group.visible = false;
  return group;
}
