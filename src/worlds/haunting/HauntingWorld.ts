import { NavigationOverlay } from './navigationOverlay';
import * as THREE from 'three';
import { GridWorld } from '../grid/GridWorld';
import { PLAN_DOOR_H, PLAN_DOOR_W, PLAN_WALL_H, PLAN_WALL_T } from '../editor/levelPlan';
import {
  DIRS,
  DIR_E,
  DIR_N,
  DIR_S,
  TILE,
  dirX,
  dirZ,
  keyX,
  keyZ,
  tileKey,
  type Dir,
} from '../nav/navTile';
import { FlashlightTool } from '../portal/tools/FlashlightTool';
import { playSlam, playSwitch } from '../../core/Audio';
import { pickHost } from '../../net/host';
import {
  generateHouse,
  onApron,
  roomAt,
  roomCentre,
  roomOf,
  spacesOf,
  stationBounds,
  tilesOf,
  DRONE_HOME,
  APRON_INNER,
  APRON_OUTER,
  VAN_ID,
  type HouseDoor,
  type HouseRoom,
  type HouseSpec,
  type Rect,
} from './house';
import { housePlan } from './plan';
import {
  droneFov,
  lampAfter,
  routeLength,
  stepAlong,
  tileAt,
  wrapAngle,
  DRONE_Y,
  DRONE_CAP,
  HOP_TIME,
  LAMP_MIN,
  type DronePose,
  type DroneRoute,
  type DroneStatus,
} from './droneRoute';
import { flickerLevel, freshSpook, stepHaunt, type Spook } from './haunt';
import { fitView, homeView, pannedView, zoomedView, type ArchiveView } from './archiveView';
import {
  buildShip,
  buildCorridorBeacons,
  buildCreature,
  buildCrewmate,
  animateCreature,
  roomAccent,
  type StationBeacon,
} from './shipArt';
import type { WatchFollow, WatchLens } from './watchLens';
import { ShipExperience } from './ShipExperience';
import { safeRoomSpawn, stationLayout } from './stationLayout';
import { COMMAND_HOME, TRAINING_DOOR, trainingRoomAt } from './trainingLayout';
import { stationLighting } from './stationLighting';
import {
  stepThreat,
  threatTarget,
  threatAlert,
  hearNoises,
  ENTITY_PROFILES,
  type HeardNoise,
  type NoiseSource,
} from './threat';
import { Hearing } from './audio/hearing';
import { stepLoudness } from './audio/cues';
import { acousticField, pointKey, inView, BOT_FOV, BOT_VISION, MONSTER_FOV } from './perception';
import { visibleStationRooms } from './stationVisibility';
import { stationRoute } from './stationNavigation';
import { StationNpcNavigator } from './stationNpcNavigator';
import { loadTuning, saveTuning, clampTuning, type BotTuning } from './botTuning';
import {
  DEFAULT_LIGHTING,
  alarmPulse,
  beaconAngle,
  clampLighting,
  nextLighting,
  type BotLighting,
} from './botLighting';
import { MonsterRoutine, paceSpeed, type RoutineOutput } from './monsterRoutine';
import { MonsterMemory, shutPairs } from './monster/monsterMemory';
import { graphEstimator, type Estimator } from './monster/monsterIntercept';
import { stationGraph } from './roomGraph';
import { nextSimulationSpeed, simulationRepeats, type SimulationSpeed } from './simulationSpeed';
import { AutomaticDoors } from './automaticDoors';
import { StationTravelPlan } from './stationTravelPlan';
import {
  freshCrew,
  freshStamina,
  grantBurst,
  MONSTERS,
  PLAYER_SPRINT_SPEED,
  ROOM_COUNTS,
  repairRoom,
  repairsFor,
  stationOptions,
  stepStamina,
  takeCrewHit,
  stepVitals,
  TROT,
  type StationOptions,
} from './mission';
import { Rng, rollSeed } from './rng';
import { StationUi } from './stationUi';
import { extractMapSnapshot } from './map/extract';
import { worldMapSource } from './map/worldSource';
import { taskCargo } from './rules/cargo';
import { RoundRules } from './rules/roundRules';
import {
  HOLD_RANGE,
  SLAM_HOLD,
  chooseLock,
  freshLocks,
  holdUntil,
  isChosen,
  releaseLock,
  slamDoor,
  stepLocks,
  toggleLock,
  type DoorLocks,
} from './rules/doorLocks';
import { freshGhosts, markGhost } from './rules/ghosts';
import { freshLamps, lampGlow, lampOut, stepLamps, switchLamp, type Lamps } from './rules/lamps';
import {
  cycleMonster,
  cycleWho,
  flatRoleOf,
  goalPrecision,
  loadSetup,
  powersOf,
  roundKindOf,
  saveSetup,
  WHO_LABELS,
  type RoundSetup,
} from './rules/roundSetup';
import {
  applyIntent,
  intentOf,
  loadLobby,
  saveLobby,
  VIEW_LABELS,
  type Intent,
  type LobbyChoice,
} from './rules/lobby';
import {
  asIntent,
  HOST_BUSY,
  opensFlat,
  ROOM_BUSY,
  startBlocker,
  startedRound,
  startEntries,
  type RoundKind,
  type WorldMenuState,
} from './rules/worldMenu';
import type { MapGoal } from './map/mapView';
import { VentFlapArt } from './vents/ventArt';
import { VentNet } from './vents/ventGraph';
import { VentTravel, type VentRider } from './vents/ventTravel';
import { NpcVentRide, VENTING_CEILING, VENTING_FLOOR } from './vents/npcVentRide';
import type { MonsterDriver } from './monster/monsterDriver';
import { NetMonsterControl } from './monster/netMonsterControl';
import { NetMonsterPort } from './monster/netMonsterPort';
import type { MapSnapshot } from './map/mapSnapshot';
import type { FlatMode } from './map/flatMode';
import type { FlatOptions } from './map/flatRound';
import type { ToolIcons } from './map/toolIcons';
import { MOVE_TIME, ownerOf, seatOf, type Claim, type StationId } from './stations';
import {
  claimMessage,
  droneMessage,
  flipMessage,
  HAUNT_CHANNEL,
  HAUNT_ROOM,
  pickGameHost,
  readClaim,
  readDrone,
  readFlip,
  readMonsterInput,
  readState,
  stateMessage,
  type DroneState,
  type HauntState,
} from './net';
import type { GridPlan } from '../grid/gridPlan';
import type { MenuEntry } from '../../ui/menu';
import type { WorldContext } from '../../core/types';
import type { PlanSolidKind } from '../grid/solids';
import type { Handedness } from '../../core/XRInput';
import type { Npc } from '../npc/Npc';

/**
 * **Haunting** — einer im Haus, die anderen in der Einsatzzentrale.
 *
 * Ein Spiel, in dem vier Leute dasselbe Haus kennen und keiner es in
 * derselben Sprache beschreiben kann. Der **Archivar** kennt Namen
 * („Bibliothek"), der **Späher** kennt Formen („L-förmig, zwei Türen"), der
 * **Drohnenpilot** kennt ein Zimmer *jetzt*, der **Hacker** kennt Schalter
 * ohne Ort — und der VR-Spieler kennt nur, was in seinem Lichtkegel steht,
 * ist dafür aber der Einzige mit Händen. Die Aufgabe ist simpel: drei Sachen
 * finden und in die Einsatzzentrale bringen. Schwer ist sie, weil niemand dem anderen eine
 * Koordinate sagen kann.
 *
 * **Eine Quelle, viele Projektionen.** Über die Leitung geht der *Same* und
 * nicht das Haus (`house.ts`): Jedes Gerät baut denselben Grundriss selbst,
 * und deshalb ist die Drohnenkamera eine Kamera in der **eigenen** Kopie der
 * Welt und kein Videostrom. Was wirklich fließt, sind ein paar Dutzend Bytes
 * je Sekunde — Monsterposition, Türen, Licht, Aufgaben (`net.ts`).
 *
 * **Wer rechnet, ist der VR-Spieler** (`pickGameHost`). Die sonst übliche
 * Regel — wer am längsten in der Welt steht — würde hier einem Web-Spieler das
 * Monster geben, und wenn der den Laptop zuklappt, nimmt er die Runde mit. Im
 * Haus steht genau einer, und der geht so schnell nicht weg.
 *
 * **Das Monster ist ausgeschaltet, bis jemand es einschaltet.** Nicht aus
 * Vorsicht, sondern weil es die Rollen erst spielbar macht: Wer Archiv,
 * Späher, Drohne und Tafel einmal in Ruhe ausprobieren will, soll das können,
 * ohne dass ihm dabei jemand in den Nacken atmet. Der Schalter sitzt im
 * Handgelenkmenü und gehört dem, der die Brille aufhat — die Entscheidung, ob
 * es gruselig wird, trifft der, dem es passiert.
 */

/** Wie oft der Gastgeber den Stand verschickt, und jeder seinen Platz ansagt. */
const STATE_RATE = 1 / 4;
/** Und wie oft der Pilot seine Drohne ansagt. */
const DRONE_RATE = 1 / 10;

/**
 * Wie schnell sich der Rumpf bei den Zuschauern in den angesagten Winkel
 * dreht, als Anteil des Restes je Sekunde. Hoch genug, dass der Lichtkegel dem
 * Piloten folgt, statt hinterherzuschleifen; niedrig genug, dass die zehn
 * Ansagen je Sekunde nicht als zehn Stufen zu sehen sind.
 */
const DRONE_TURN = 14;

/**
 * Wie weit nach oben oder unten der Pilot schauen darf — 81°, fast senkrecht.
 *
 * Waagerecht dreht er **ganz** herum (der Anschlag bei gut zwei Dritteln einer
 * halben Umdrehung ist weg: Wer wissen will, ob ihm etwas folgt, muss sich
 * umdrehen können, und das Zurückstellen kostet einen Tipp auf den Blickstock).
 * Senkrecht bleibt ein Rest Anschlag, und zwar nicht aus Bequemlichkeit: Über
 * den Scheitel hinaus steht das Bild auf dem Kopf, und ein Lichtkegel, der
 * dabei nach hinten kippt, sagt dem VR-Spieler das Gegenteil von dem, was der
 * Pilot ansagt.
 */
const TILT_MOST = Math.PI * 0.45;

/**
 * Wie fein das Bild hinter der offenen Bedienung noch ist: ein Bildpunkt je
 * zehn CSS-Punkte. Als **Anteil** und nicht als Kachelgröße, weil die Leinwand
 * damit auf jedem Gerät dieselben Klötzchen zeigt — auf einem Telefon mit
 * dreifacher Dichte wären feste Bildpunkte drittel so groß.
 */
const VEIL_RATIO = 0.1;

/**
 * Der Raumscan nimmt nur die Decke ab. Ein Schnitt unter Türhöhe würde hohe
 * Server, Reaktoren und Schutzschränke ebenfalls abschneiden. Wandkanten und
 * Türzustände werden knapp unter diesem Schnitt als Scanmarkierungen ergänzt.
 */
const PAPER_CUT = PLAN_WALL_H - 0.08;

/**
 * Auf welcher Höhe die Türzeichen liegen: knapp unter dem Schnitt, und damit
 * über den Flächen, die das Blatt freiräumen (`maskAround`) — ein Zeichen,
 * das unter der Maske liegt, ist keines.
 */
const PAPER_MARK_Y = PAPER_CUT - 0.01;

/**
 * Helle cyanfarbene Scanlinien für Wandkanten und Türzeichen.
 */
const PAPER_INK = 0xadebff;

/**
 * Und der eine dunkle Strich: **das Blatt einer geschlossenen Tür.**
 *
 * Eine zugestellte Lücke in derselben hellen Farbe wäre schlicht Wand — man
 * müsste die Bögen zählen, um zu merken, dass dort eine Tür ist. Dunkel in
 * einer hellen Wand ist dagegen genau das, was es sein soll: etwas, das den
 * Durchgang zumacht.
 */
const PAPER_SHUT = 0x142d42;

/**
 * **Wie schräg der Fernseher auf das Haus schaut**, in Bogenmaß.
 *
 * Zehn Grad neben dem Lot. Senkrecht von oben ist ein Grundriss — man sieht,
 * wo etwas steht, aber nicht, dass es steht; ein Bett und ein Teppich sind
 * dann derselbe Fleck. Die zehn Grad geben jedem Möbel eine Flanke und jeder
 * Wand eine Höhe, ohne dass die Wände sich gegenseitig verdecken. Weiter
 * geschrägt fängt die Südwand an, das halbe Haus zuzudecken.
 */
const SHOW_PITCH = (Math.PI / 180) * 80;

/** Der Öffnungswinkel dazu — eng genug, dass das Haus nicht gestaucht wirkt. */
const SHOW_FOV = 42;

/**
 * Wie viele Meter im Bild stehen, wenn der Zuschauer jemandem folgt.
 *
 * Ein Zimmer ist zweieinhalb Kacheln breit; neun Meter zeigen den Verfolgten
 * mit seinen Türen und dem, was gerade um die Ecke kommt — enger wäre ein
 * Guckloch, weiter wäre wieder das ganze Deck, und dafür gibt es „Frei".
 */
const WATCH_FOLLOW_SPAN = 9;

/**
 * **Und wo ihm die Decke abgenommen wird.**
 *
 * Dieselbe Antwort wie in der Vorschau des Werkzeugkastens (`tools/worldCut.ts`):
 * eine Handbreit unter der Decke, damit Wände Wände bleiben und der Deckel
 * weg ist. Gemacht wird es hier mit einer Schnittebene und nicht mit der
 * vorderen Kappe der Kamera — die steht schräg im Raum, und ein schräger
 * Schnitt ließe hinten die halbe Decke stehen.
 */
const SHOW_CUT = PLAN_WALL_H - 0.4;

/** Der Himmel über dem Zuschauer: heller Tag, nicht die Nacht der anderen. */
const SHOW_SKY = 0x020711;

/** Wohin die Zuschauerkamera gerade gezogen wird — ein Vektor, kein Müll je Bild. */
const _showTarget = new THREE.Vector3();

/** Wie nah man an eine Sache heran muss, um sie mitzunehmen. */

/** Wie hell eine brennende Zimmerlampe ist, wenn niemand an ihr rüttelt. */
const LAMP_ON = 48;

/** Die Lampe eines Zimmers: das Licht und das Glas, das zeigt, dass es an ist. */
interface Lamp {
  at: THREE.Vector3;
  color: number;
  glass: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
}

const _lampOff = new THREE.Color(0x010203);
const _beaconOff = new THREE.Color(0x2b0d10);
const _beaconOn = new THREE.Color(0xff4d55);
const _lampOn = new THREE.Color(0xfff0cf);
const _head = new THREE.Vector3();
const _feet = new THREE.Vector3();
/** Der Schlag eines Spielers am Steuer hat keine Richtung — `takeHit` liest keine. */
const _strike = new THREE.Vector3();
const _size = new THREE.Vector2();
/** Die Schnittebene, die dem Zuschauer die Decke abnimmt — einmal gebaut. */
const _lid = new THREE.Plane(new THREE.Vector3(0, -1, 0), SHOW_CUT);
const _noLid: THREE.Plane[] = [];
const _lidOn = [_lid];

export class HauntingWorld extends GridWorld {
  /** Der Bauplan dieser Runde. Steht vor dem ersten `layout()` fest. */
  private spec: HouseSpec = generateHouse(rollSeed(), 8);
  private state: HauntState = freshState(this.spec.seed);

  /** Alles, was zum Haus gehört und nicht aus dem Kachelplan kommt. */
  private readonly stage = new THREE.Group();
  /** Und alles, was sich bewegt — für die Sichten, die das nicht sehen dürfen. */
  private readonly live = new THREE.Group();
  /**
   * Die Einsatzzentrale steht in einer eigenen Gruppe, weil sie ein neues Haus **überlebt**:
   * `buildHouse` räumt seine Gruppe leer, und eine Einsatzzentrale, die beim zweiten
   * Grundriss verschwindet, ist ein Spielabbruch mit Ansage.
   */
  private readonly vanRig = new THREE.Group();

  private readonly lamps = new Map<string, Lamp>();
  private experience: ShipExperience | null = null;
  private mountedRole = '';
  private flatTechnician = false;
  private pendingBotRound = false;
  private pendingRestart = false;
  private readonly automaticDoors = new AutomaticDoors();
  private hearing = new Map<number, number>();
  /** Das Hörmodell des Pakets Audio, die Geräusche des Spielers seit dem letzten Horchen und was davon ankam. */
  private readonly hearingModel = new Hearing();
  private readonly noiseQueue: NoiseSource[] = [];
  private heard: HeardNoise[] = [];
  /** Wohin das Monster schaut, wenn es steht und horcht (`monsterRoutine.ts`, `face`). */
  private monsterFace: { x: number; z: number } | null = null;
  private perceptionClock = 0;
  private readonly travelPlan = new StationTravelPlan();
  private readonly technicians = new Map<string, number>();
  private lampPool: THREE.PointLight[] = [];
  private testLight: THREE.AmbientLight | null = null;
  private commandLight: THREE.SpotLight | null = null;
  private readonly fixtureSlabs: THREE.Object3D[] = [];
  private readonly fixtureMaterial = new THREE.MeshBasicMaterial({ visible: false });
  private nextPhoneRender = 0;
  private phoneRenderView = '';
  private sightTimer = 0;
  private monsterSeesPlayer = false;
  private stationTorch: FlashlightTool | null = null;
  private torchImmersive = false;
  private readonly roomArt = new Map<string, THREE.Object3D>();
  private readonly roomFrustum = new THREE.Frustum();
  private readonly roomProjection = new THREE.Matrix4();
  private readonly doorwayBounds = new THREE.Box3();
  private readonly culledHead = new THREE.Vector3(Infinity, Infinity, Infinity);
  private readonly culledRotation = new THREE.Quaternion();
  private readonly cullRotation = new THREE.Quaternion();
  private cullTimer = 0;
  private culledDoors = '';
  private readonly navigationOverlay = new NavigationOverlay();
  private monsterNavigator: StationNpcNavigator | null = null;
  private monsterArt: THREE.Object3D | null = null;
  /**
   * **Der Körper des Technikers, der in 2D spielt.**
   *
   * Seine Stelle steht seit `STATION_PROTOCOL` 7 im Stand
   * (`HauntState.technician`) — die Karte des Monster-Telefons zeichnet ihn
   * daraus längst, die 3D-Welt aber gar nicht: Wer am Fernseher zusah, sah
   * eine leere Station, in der Türen von selbst aufgingen. Ein einfacher
   * Crewmate (`shipArt.buildCrewmate`) reicht; er läuft nicht, er steht dort,
   * wo der Stand ihn hinsetzt.
   */
  private technicianArt: THREE.Object3D | null = null;
  /** Worauf die Kamera des Zuschauers gerade zielt, wenn sie jemandem folgt. */
  private readonly showFocus = new THREE.Vector3();
  /** Ob sie schon einmal gezielt hat — der erste Sprung darf hart sein. */
  private showAimed = false;
  /** Die Drehleuchten der Gänge — sichtbar nur bei Alarmbeleuchtung. */
  private beacons: StationBeacon[] = [];
  /** Die Gewichte beider Bots — aus dem Browser-Speicher, veränderbar im Test. */
  private tuning: BotTuning = loadTuning();
  /** Kabinen, Anzug, Sauerstoff — die Rundenregeln (`rules/roundRules.ts`). */
  private readonly rules = new RoundRules(() => this.state);
  /** Was das Monster gerade vorhat (`monsterRoutine.ts`). */
  private routine: MonsterRoutine | null = null;
  /**
   * **Das Gedächtnis des Monsters** (`monster/monsterMemory.ts`) — dasselbe
   * Stück wie in der 2D-Runde und in der Trainingssimulation. Geschrieben wird
   * es in der Routine; von hier kommt nur, was die Routine nicht sehen kann:
   * eine fertig gewordene Reparatur.
   */
  private brain: MonsterMemory | null = null;
  private estimator: Estimator | null = null;
  /** Wie viele Reparaturen zuletzt fertig waren — daran hängt der Schub. */
  private repaired = 0;
  /** Die Puste des Technikers (`mission.ts`) — in 3D wie in 2D. */
  private readonly stamina = freshStamina();
  private decision: RoutineOutput | null = null;
  private readonly routineDice = new Rng(0x4d4f4e53);
  /**
   * Der Schrank, in den das Monster jemanden hat **flüchten sehen** — leer,
   * solange das Verstecken unbeobachtet blieb. Nur er löst Schrei und
   * Aufreißen aus; ein unbemerktes Versteck bleibt ein Versteck.
   */
  private watchedLocker = '';
  private sawPlayerAt = -Infinity;
  private simulationSpeed: SimulationSpeed = 1;
  /** Wie das Deck in der Bot-Runde ausgeleuchtet ist (`botLighting.ts`). */
  private botLighting: BotLighting = { ...DEFAULT_LIGHTING };
  private previousFeet: THREE.Vector3 | null = null;
  /**
   * **Das Lüftungsnetz und die Fahrt des Monsters darin** (`vents/`). Beide
   * von außen lesbar, damit ein Steuer übers Netz `ventRide.enter`, `exit`
   * und `cancel` rufen kann. Das Netz wird einmal gebaut: Der Grundriss ist
   * über alle Seeds derselbe (`house.ts`), und `ventGraph.test.ts` prüft die
   * Daten gegen mehrere davon.
   */
  readonly vents: VentNet = new VentNet(this.spec);
  readonly ventRide: VentTravel = new VentTravel(this.vents);
  /** Fahrt, Lotse und Körper-Handgriffe des NPC-Monsters — nur solange es eines gibt. */
  private npcRide: NpcVentRide | null = null;
  /** Die Klappen in 3D, von denen eine offen stehen kann. */
  private ventArt: VentFlapArt | null = null;
  /**
   * **Das Steuer der Station `monster` übers Netz** (`monster/netMonsterControl.ts`):
   * führt beim Gastgeber aus, was das Telefon sagt — in 3D über `stepRoutine`,
   * in der 2D-Welt als `round.driver`. Es sieht immer die Runde, die gerade
   * läuft: die 2D-Runde, solange `flat` steht, sonst das NPC-Monster.
   */
  private readonly netMonster = new NetMonsterControl({
    house: () => (this.flatShared ? this.flat!.round.house : this.spec),
    state: () => this.state,
    rider: () => (this.flatShared ? this.flat!.round.monster : this.monsterRider()),
    ride: () => (this.flatShared ? this.flat!.round.ventRide : this.ventRide),
    // Die Buchführung der Sperren und die Uhr: Ohne sie kann das Monster
    // keine Stahltür aufziehen (`rules/doorLocks.ts`).
    locks: () => (this.flatShared ? this.flat!.round.locks : this.locks),
    time: () => this.state.time,
    occupied: () => ownerOf(this.currentClaims(), 'monster') !== '',
  });
  /**
   * Ein Spieler am Steuer des Monsters (`monster/monsterDriver.ts`); `null`
   * oder inaktiv heißt: die Routine. Die Welt fragt nur, wessen Entscheidung
   * sie ausführt — heute ist das immer das Steuer übers Netz.
   */
  monsterDriver: MonsterDriver | null = this.netMonster;
  /** Und die andere Seite: das Steuer auf diesem Telefon, wenn es an der Station sitzt. */
  private netPort: NetMonsterPort | null = null;
  private monsterTimer = 0;

  /** Das Monster, solange es eines gibt — nur beim Gastgeber ein echter NPC. */
  private monster: Npc | null = null;
  /**
   * **Was das Monster gerade anstellt** (`haunt.ts`).
   *
   * Die Zustandsmaschine läuft bei **allen** und nicht nur beim Gastgeber:
   * Aus ihr kommt das Flackern der Lampe, und das soll jeder sehen, ohne dass
   * es jemand ansagt. Angewendet — Licht aus, Tür zu — wird trotzdem nur beim
   * Gastgeber; bei allen anderen fällt das Ergebnis auf den Boden, und der
   * Stand kommt eine Viertelsekunde später ohnehin über die Leitung.
   */
  private spook: Spook = freshSpook();
  /** Wer welche Tür gesperrt hat, und wie lange zugefallene halten (`rules/doorLocks.ts`) — beim Gastgeber. */
  private locks: DoorLocks = freshLocks();
  /** Welche Lampen die Tafel angemacht hat und wie lange sie noch brennen (`rules/lamps.ts`) — beim Gastgeber. */
  private lampBook: Lamps = freshLamps();
  /** Die Verteilung der nächsten Runde: Techniker, Monster, Plätze (`rules/roundSetup.ts`). */
  private setup: RoundSetup = loadSetup();
  /** Bei allen anderen nur ein Klotz an der angesagten Stelle. */
  private blob: THREE.Object3D | null = null;

  /**
   * **Das Licht, unter dem der Archivar liest.**
   *
   * Sein Blatt darf nicht davon abhängen, ob im Haus jemand die Lampe
   * angemacht hat: Eine Akte ist eine Bauzeichnung und kein Kamerabild. Zwei
   * Lichter also, die immer in der Szene stehen und auf null gedreht sind —
   * hochgedreht wird nur für diesen einen Zeichendurchgang. Auf null gedreht
   * statt herausgenommen, weil three.js jeden Shader neu baut, sobald sich die
   * **Zahl** der Lichter ändert; ihre Stärke kostet nichts.
   */
  private paperLight: THREE.AmbientLight | null = null;
  private paperSun: THREE.DirectionalLight | null = null;
  /**
   * **Und das Tageslicht, unter dem der Fernseher läuft.**
   *
   * Dieselbe Bauart, anderer Zweck: Der Zuschauer sitzt nicht im Spiel,
   * sondern davor. Ein Fernseher, auf dem vier Leute im Dunkeln stochern, ist
   * für den Zuschauer ein schwarzes Bild — und der Grusel gehört ohnehin
   * denen, die drinstecken. Also heller Tag, und die Nacht bleibt im Haus.
   */
  private showLight: THREE.AmbientLight | null = null;
  private showSun: THREE.DirectionalLight | null = null;
  /** Die Kamera über dem ganzen Haus, zehn Grad neben dem Lot. */
  private showCam: THREE.PerspectiveCamera | null = null;
  /** Ob der Welt gerade die Decke abgenommen ist — nur für den Zuschauer. */
  private lidOff = false;
  /**
   * **Was neben dem aufgeschlagenen Zimmer liegt, gehört nicht aufs Blatt.**
   *
   * Vier dunkle Flächen, die alles außerhalb des Zimmerrechtecks zudecken —
   * die Akte des Archivars ist eine Seite je Zimmer und keine Karte. Ohne sie
   * sieht er den ganzen Hausausschnitt, kann die Zimmer nebeneinanderlegen und
   * hat damit genau die Übersicht, die er sich eigentlich erst erarbeiten
   * soll. Das ist keine Kosmetik: Es ist die Regel, an der seine Rolle hängt.
   */
  private readonly paperMask = new THREE.Group();
  /**
   * **Die Türzeichen auf dem Blatt** — je Tür eines, und zwei Sorten.
   *
   * Ein Grundriss zeichnet Türen, er fotografiert sie nicht: eine offene als
   * Schwelle mit dem Bogen, den das Blatt schlägt, eine geschlossene als
   * ausgefüllte Lücke. So bleiben Durchgänge auch im kleinen Raumbild auf
   * einem Telefon erkennbar.
   *
   * Sie hängen im Blatt und nicht in der Welt: Der VR-Spieler sieht echte
   * Türen und braucht keine Symbole, und ein Kreidestrich, der im Haus
   * herumschwebt, wäre ein Fehler mit Ansage.
   */
  private readonly paperDoors = new THREE.Group();
  /** Die Wandlinien je Zimmer — sichtbar ist immer nur das aufgeschlagene. */
  private readonly roomWalls = new Map<string, THREE.Object3D>();
  /** Welches Zeichen zu welcher Tür gehört — offen und zu, fertig gebaut. */
  private readonly doorMarks = new Map<
    string,
    { open: THREE.Object3D; shut: THREE.Object3D; arc: THREE.Object3D }
  >();
  /** Der Papierton liegt auf der Leinwand und nicht in der Szene. */
  private tinted = false;
  /** Und ob das Bild gerade grob gerastert hinter der Bedienung liegt. */
  private veiled = false;

  private droneBody: THREE.Object3D | null = null;
  /**
   * **Die Wiege, in der Kamera, Kuppel und Scheinwerfer hängen.**
   *
   * Sie kippt nach oben und unten; nach links und rechts dreht sich der ganze
   * Rumpf. Getrennt, weil ein Kopter, der sich zum Hochschauen selbst auf den
   * Rücken legt, für den VR-Spieler nach Absturz aussieht — und seine
   * Positionslampe mit auf den Kopf stellt.
   */
  private droneHead: THREE.Object3D | null = null;
  private droneCam: THREE.PerspectiveCamera | null = null;
  /** Der Scheinwerfer, den der Pilot schaltet — und den alle sehen. */
  private droneLamp: THREE.SpotLight | null = null;
  /** Die Kuppel darüber: dass sie leuchtet, sieht man auch von hinten. */
  private droneGlass: THREE.MeshBasicMaterial | null = null;
  private topCam: THREE.OrthographicCamera | null = null;
  private drone: DroneState = {
    x: 0,
    z: 0,
    yaw: 0,
    pitch: 0,
    target: '',
    hop: 0,
    lamp: 1,
    // **Sie fängt mit brennendem Scheinwerfer an**, und das ist keine
    // Bequemlichkeit: Sie steht an der Einsatzzentrale, dort zehrt der Kegel nichts, und ohne
    // ihn schaut der Pilot in seinem ersten Bild in eine schwarze Nacht und
    // hält das Gerät für kaputt. Was er stattdessen sieht, ist die Hauswand
    // mit der Tür darin — und nebenbei, wozu der Knopf oben rechts gut ist.
    light: true,
  };
  /**
   * **Wohin der Pilot schaut, wenn er nicht geradeaus schaut.**
   *
   * Ein Winkel neben der Flugrichtung, kein zweiter Kurs: Die Drohne fliegt
   * ihre Bahn weiter, sie **dreht sich nur darauf**. Andersherum wäre das
   * Wischen eine zweite Steuerung, die gegen die Wegsuche arbeitet — und die
   * eine Regel, an der hier alles hängt („sie fliegt keine Luftlinie"), wäre
   * durch eine Fingerbewegung ausgehebelt.
   *
   * **Gedreht wird der Rumpf und nicht die Kamera.** Vorher saß der Winkel an
   * der Kamera allein, und das war eine Bildeinstellung: Der Pilot sah zur
   * Seite, der Scheinwerfer leuchtete weiter geradeaus, und im Haus stand eine
   * Drohne, die stur in eine Richtung starrte, während ihr Pilot etwas ganz
   * anderes ansagte. Der Kegel ist das Einzige, was der Pilot dem VR-Spieler
   * wirklich geben kann — er muss dorthin zeigen, wo der Pilot hinsieht.
   */
  private droneLook = 0;
  /**
   * **Und wie weit der Kopf dabei nach oben oder unten sieht** — positiv nach
   * oben.
   *
   * Ein Zimmer hat nicht nur Ecken, sondern auch eine Decke und einen Boden:
   * Was unter dem Tisch liegt und was über der Tür hängt, findet niemand, der
   * nur waagerecht schwenken kann. Begrenzt bleibt es trotzdem — eine Drohne,
   * die senkrecht nach oben starrt, weiß nicht mehr, wo vorn ist, und der
   * VR-Spieler sähe einen Lichtkegel, der ihm nichts mehr sagt.
   */
  private dronePitch = 0;
  /** Wo sie steht und wohin sie schaut — die Bahn rechnet `droneRoute.ts`. */
  private dronePose: DronePose = { x: 0, z: 0, yaw: 0 };
  /** Der Weg, den sie gerade abfliegt, und wie oft er neu gesucht wird. */
  private droneRoute: DroneRoute = { tiles: [], complete: true, grounded: true };
  private droneThink = 0;
  private droneGraphVersion = -1;
  private droneVisualYaw = Math.PI;
  /** Ob ich sie gerade selbst fliege — der Wechsel darauf ist die Übergabe. */
  private piloting = false;
  /** Woran erkannt wird, dass der Scheinwerfer wirklich umgelegt wurde. */
  private droneLit = false;
  /** Die Zimmer, in denen sie schon war — das Einzige, was der Pilot behält. */
  private readonly droneSeen = new Set<string>();
  /**
   * **Wie der Archivar sein Blatt gerade hält** (`archiveView.ts`).
   *
   * Eingepasst ist immer das ganze Zimmer; hier steht nur, wie weit er darüber
   * hinaus herangegangen ist und wohin er geschoben hat. Ein *relativer*
   * Ausschnitt und keine zweite Kamera: Wer ein anderes Zimmer aufschlägt,
   * bekommt wieder das ganze — und die Rechnung dahin ist dieselbe geblieben.
   */
  private archive: ArchiveView = homeView();
  /**
   * Die halben Kanten des Blattes und des Bildes, in Metern.
   *
   * Sie fallen beim Zielen der Kamera an (`aimArchive`) und hängen an Zimmer
   * *und* Bildform: Ein gedrehtes Telefon ist ein anderes Blatt. Drei Zahlen
   * und nicht zwei, weil oben ein Streifen des Bildes hinter der Kopfzeile
   * liegt: `half` und `sheet` sind das **Blatt**, an dem die Verschiebung
   * endet, `tall` ist das ganze **Bild** — und ein Wisch über das Bild rechnet
   * mit dem Bild, sonst folgt das Blatt dem Finger nicht.
   */
  private archiveFit = { half: 5, sheet: 5, tall: 5 };

  private ui: StationUi | null = null;
  /** Die laufende 2D-Runde (`map/flatMode.ts`), von „Bot-Runde", „Mission" oder „Test" gestartet. */
  private flat: FlatMode | null = null;
  /**
   * Ob diese 2D-Welt einer Runde im Netz **zusieht**, statt selbst eine zu
   * rechnen. Dann kommt der Snapshot aus der 3D-Welt und nicht aus ihr.
   */
  private flatWatching = false;
  /**
   * Ob die laufende 2D-Runde **die gemeinsame Runde** ist (Mission und Test:
   * wer sie spielt, ist der Techniker und rechnet sie für alle Telefone —
   * `stepFlat`) oder eine lokale Vorführung (Bot-Runde: kein Herzschlag, kein
   * Stand für andere, wie die 3D-Bot-Runde).
   */
  private flatShared = false;
  /** Die gepufferten Werkzeugbilder der 2D-Welt (`map/toolIcons.ts`). */
  private flatIcons: ToolIcons | null = null;
  private flatLoading = false;
  /**
   * **Was ich vorhabe und wie ich es sehen will** — die Wahl der Lobby
   * (`rules/lobby.ts`), gemerkt im Browser: Wer am Telefon spielt, setzt sie
   * nicht jedes Mal neu. Der alte Schalter „2D-Welt von oben" wird dabei
   * einmal mitgelesen und danach vergessen.
   */
  private lobbyChoice: LobbyChoice = loadLobby();
  /**
   * **„2D-Welt von oben"** — nur noch die Ansicht dieser Wahl. Eine
   * Einstellung und kein Start: Sie sagt, wie die *nächste* Runde aussieht,
   * die danach wie jede andere gewählt wird — Bot-Runde, Mission oder Test.
   */
  private get flatWanted(): boolean {
    return this.lobbyChoice.view === '2d';
  }
  /**
   * Wer wo sitzt — und **wann das hier ankam**.
   *
   * Angesagt wird eine Dauer, und eine Dauer altert: Wer sie so stehen lässt,
   * wie sie ankam, hält jeden für jünger, als er ist — besonders den, dessen
   * Tab im Hintergrund liegt und deshalb seltener etwas schickt. Dieselbe
   * Rechnung wie `NetSession.seniorityOf`, aus demselben Grund.
   */
  private readonly claims = new Map<string, Claim & { heardAt: number }>();
  /** An welches Gerät ich gerade gehe, und seit wann ich dort sitze. */
  private wanted: StationId | null = null;
  /**
   * **Seit wann**, nicht **wie lange**.
   *
   * Aufsummierte Bildzeiten wären hier falsch, und man sieht es erst mit zwei
   * Geräten: Ein Browser-Tab im Hintergrund bekommt kaum noch Bilder, seine
   * Dauer wächst also langsamer als die des Tabs, den gerade jemand ansieht —
   * und dann gewinnt beim Streit um ein Gerät nicht der, der zuerst da war,
   * sondern der, dessen Fenster oben liegt. Die Uhr läuft überall gleich.
   */
  private seatedAt = clock();
  private hostId = '';
  private sendTimer = 0;
  private droneTimer = 0;
  /**
   * Woran erkannt wird, dass sich an den Türen etwas geändert hat — und das
   * Fragezeichen heißt „noch nie gebaut". Es unterscheidet den ersten Aufbau
   * von einer Tür, die zufällt: Nur die zweite macht ein Geräusch.
   */
  private builtDoors = '?';

  // --- die Welt ------------------------------------------------------------

  protected override layout(): GridPlan {
    return housePlan(this.spec, new Set(this.state.shut), this.state.crew.options.test);
  }

  protected override worldId(): string {
    return 'haunting';
  }

  protected override editorTitle(): string {
    return 'Haunting / Orbital';
  }

  /**
   * **Draußen ist Abend, nicht Nacht.**
   *
   * Der Himmel ist das Einzige an dieser Welt, das nichts kostet und trotzdem
   * überall ankommt: Er steht hinter dem Haus, wenn man davorsteht, und er ist
   * das, was in einem Fenster oder in der offenen Haustür steht, wenn man
   * drinnen davor steht. Genau deshalb ist er ein Dämmerungsblau und kein
   * Schwarz — eine schwarze Scheibe in einer schwarzen Wand ist kein Fenster.
   */
  protected override skyColor(): number {
    return 0x020711;
  }

  protected override horizonColor(): number | null {
    return null;
  }

  /** Fast nichts — aber nicht *ganz* nichts: die eigenen Hände muss man sehen. */
  protected override lightIntensity(): number {
    return 0;
  }

  protected override tint(): Partial<Record<PlanSolidKind, number>> {
    return { floor: 0x3a4b58, wall: 0x728590, wood: 0x4c6370, door: 0x536d7b };
  }

  protected override batchGridGeometry(): boolean {
    return true;
  }

  protected override gridDoorVisible(): boolean {
    return false;
  }

  protected override slidingGridDoors(): boolean {
    return true;
  }

  /** Eine Hand bleibt frei — in diesem Haus will man eine Lampe halten. */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [['flashlight', 'right']];
  }

  protected override welcome(): string {
    return 'HAUNTING / ORBITAL · Sichere Einsatzzentrale. Mission oder Test am Terminal wählen. Archiv + Einsatzkontrolle auf zwei Handys.';
  }

  /** Man fängt **draußen** an, an der Einsatzzentrale, mit dem Haus vor sich. */
  protected override spawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(COMMAND_HOME.x, 0, COMMAND_HOME.z);
  }

  /** Portal-lab cubes and dominoes have no place in the station. */
  protected override buildProps(): void {}

  /**
   * **Wohin ein Verfolger läuft.**
   *
   * Nicht immer zum Spieler: Läuft irgendwo ein Radio, geht er dorthin. Das
   * ist der einzige Hebel, den der Hacker auf das Monster hat — und der
   * Grund, warum ein Schalter mit der Aufschrift `X` etwas wert sein kann.
   */
  protected override npcTarget(target: THREE.Vector3): THREE.Vector3 | null {
    if (
      this.state.phase !== 'running' ||
      (this.state.crew.options.test && !this.state.crew.simulation) ||
      this.state.crew.hp === 0
    )
      return null;
    // Im Schacht wird nicht gelaufen: kein Ziel, der Körper steht (`vents/npcVentRide.ts`).
    if (this.ventRide.busy) return null;
    const room = this.state.loud[0];
    if (room) {
      const found = roomOf(this.spec, room);
      if (found) {
        const at = safeRoomSpawn(this.spec, found.id);
        return target.set(at.x, 0, at.z);
      }
    }
    // Alles andere entscheidet die Routine (`monsterRoutine.ts`): Verfolgung,
    // Absuchen, Patrouille, Seitenwechsel, Auflauern — und der Weg zu einer
    // Kabine, in die es jemanden hat flüchten sehen. Kein allwissendes
    // Nachlaufen: Ohne Wahrnehmung steht dort ein geratener Raum und nicht
    // die Stelle, an der der Spieler wirklich ist.
    const goal = this.decision?.goal;
    if (!goal) return null;
    return target.set(goal.x, 0, goal.z);
  }

  /**
   * **Ein Bild aus dem Kopf des Monsters** — beim Gastgeber gerechnet.
   *
   * Herein geht, was es wahrnehmen darf: die erinnerte Stelle aus
   * `threat.ts`, ob es gerade wirklich hinsieht, in welchem Raum sein
   * Gegenüber steht (nur für den Riecher, mit dem es den Nachbarraum errät)
   * und ob es jemanden in einen Schrank hat steigen sehen. Heraus kommt ein
   * Ziel, ein Tempo und höchstens ein Geräusch.
   */
  private stepRoutine(dt: number, head: THREE.Vector3): void {
    const crew = this.state.crew;
    if (!this.monster || !this.routine) return;
    const at = this.monster.feet(_feet);
    const here = roomAt(this.spec, Math.floor(at.x / TILE), Math.floor(at.z / TILE));
    const quarry = roomAt(this.spec, Math.floor(head.x / TILE), Math.floor(head.z / TILE));
    if (this.monsterSeesPlayer) this.sawPlayerAt = this.state.time;
    // Ein Rückzug in den Schrank ist nur dann verraten, wenn eben noch
    // jemand hingesehen hat.
    if (crew.hidden && this.state.time - this.sawPlayerAt < 1.5) this.watchedLocker = crew.hidden;
    if (!crew.hidden) this.watchedLocker = '';
    const piloted = this.monsterDriver?.active() === true;
    const decision = piloted
      ? this.monsterDriver!.decide(dt)
      : this.routine.step(stationGraph(this.spec), {
          dt,
          at: { x: at.x, z: at.z },
          here: here?.id ?? '',
          signal: threatTarget(crew),
          seen: this.monsterSeesPlayer,
          quarry: quarry?.id ?? null,
          caught: this.watchedLocker,
          rng: () => this.routineDice.next(),
          memory: this.brain ?? undefined,
          estimator: this.estimator ?? undefined,
          base: MONSTERS.find((m) => m.id === crew.options.monster)!.speed,
          time: this.state.time,
          // Ob der Techniker rennt, steht schon in der Anstrengung: Der Visier
          // beschlägt nach einer Sekunde Sprint (`stepVitals`), und genau das
          // ist die Zahl, die auch übers Netz geht.
          sprinting: crew.exertion > 0.3,
          stamina: { left: this.stamina.left, trot: PLAYER_SPRINT_SPEED * TROT },
          ...threatAlert(crew),
        });
    // Der Lotse biegt das Ziel der Routine auf eine Klappe um, wenn der
    // Schacht lohnt (`vents/ventPilot.ts`); ein Spieler am Steuer fährt selbst.
    const rider = this.monsterRider();
    this.decision =
      piloted || !this.npcRide || !rider
        ? decision
        : this.npcRide.steer(decision, rider, this.state.time, stationGraph(this.spec));
    this.monsterFace = decision.face;
    const base = MONSTERS.find((m) => m.id === crew.options.monster)!.speed;
    this.monster.setSpeed(paceSpeed(base, this.tuning.monster, decision.pace, decision.boost));
    if (decision.cue) this.experience?.monsterCue(decision.cue, { x: at.x, z: at.z });
    // Ein Spieler am Steuer trifft den Techniker im Freien mit dem Knopf —
    // `takeHit` prüft Abstand und Sichtlinie wie bei einem Schlag des NPC.
    if (decision.strike && piloted && !decision.cabin) this.takeHit(_strike, 1);
    else if (decision.strike)
      this.breakLocker(decision.goal ?? { x: at.x, z: at.z }, decision.cabin);
  }

  /** Das Monster als Reiter der Fahrt: Füße, Blick, Raum — `null` ohne Monster. */
  monsterRider(): VentRider | null {
    if (!this.monster) return null;
    const at = this.monster.feet(_feet);
    const here = roomAt(this.spec, Math.floor(at.x / TILE), Math.floor(at.z / TILE));
    return { x: at.x, z: at.z, yaw: this.monster.model.rotation.y, space: here?.id ?? '' };
  }

  /**
   * **Die aufgerissene Kabine**: Rauch, Funken, die Kabine ist für den Rest
   * der Runde hin (`HauntState.destroyed`) — und ein Treffer nur, wenn die
   * Crew genau in dieser Kabine steckt. Das Monster reißt auch leere Kabinen
   * auf, wenn es jemanden darin vermutet (`monsterRoutine.ts`).
   */
  private breakLocker(at: { x: number; z: number }, room: string): void {
    const crew = this.state.crew;
    this.rules.destroyCabin(room);
    this.experience?.burst('smoke', new THREE.Vector3(at.x, 1.1, at.z));
    this.experience?.burst('sparks', new THREE.Vector3(at.x, 1.5, at.z));
    if (!room || crew.hidden !== room) return;
    crew.hidden = '';
    this.watchedLocker = '';
    if (takeCrewHit(crew, this.state.phase === 'running')) {
      grantBurst(this.stamina);
      if (crew.hp === 0) {
        this.state.phase = 'lost';
        this.removeMonster();
        this.announce('MISSION GESCHEITERT · Im Schutzschrank gestellt.');
      } else this.announce(`Der Schutzschrank ist aufgerissen · Anzug ${crew.hp}/3. Weglaufen!`);
    } else if (crew.options.test)
      this.announce('TEST · Das Monster reißt den Schutzschrank auf — im Test ohne Schaden.');
  }

  protected override buildEnvironment(): void {
    // The generic world's hemisphere/directional lights ignore interior walls.
    // A station uses local fixtures and the player's torch, including in simple mode.
    this.root.getObjectByName('lighting')?.removeFromParent();
    super.buildEnvironment();
    this.roof = PLAN_WALL_H;
    this.navigationOverlay.setRooms(this.spec);
    this.root.add(this.navigationOverlay.root);
    this.root.add(this.stage);
    this.root.add(this.live);
    this.root.add(this.vanRig);
    this.buildHouse();
    this.buildVan();
    this.buildDrone();
  }

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    // Der Nebel hat die Farbe des Himmels und nicht die der Nacht: Was in ihm
    // verschwindet, soll in die Dämmerung verschwinden und nicht in ein Loch.
    // Etwas dünner als vorher, damit von der Einsatzzentrale aus überhaupt ein Haus zu sehen
    // ist — drinnen ändert das nichts, dort ist auf zwölf Meter ohnehin eine
    // Wand.
    ctx.scene.fog = new THREE.FogExp2(0x020711, 0.008);
    ctx.net.on(HAUNT_CHANNEL, (data, from) => this.receive(data, from));
    // Der Bordstock der Seite bleibt hier aus: Diese Welt bringt ihren eigenen
    // mit — in 2D den der gezeichneten Szene, im Schiff denselben über der
    // 3D-Ansicht (`world3d/shipControls.ts`). Zwei Stöcke übereinander wären
    // einer zu viel.
    ctx.touchStick(false);
    this.joinTable(ctx);

    this.setupRole(ctx);
    this.applyLights();
  }

  private setupRole(ctx: WorldContext): void {
    this.mountedRole = ctx.role;
    this.ui?.dispose();
    this.ui = null;
    this.clearStationViews();
    this.wanted = null;
    this.claims.delete(ctx.net.localId);
    ctx.net.emit(HAUNT_CHANNEL, { kind: 'technician', active: ctx.role === 'vr' });
    if (ctx.role === 'vr') {
      // Nur in der Brille schwebt eine eingeschaltete Taschenlampe in der Einsatzzentrale —
      // man muss sie im Dunkeln ja finden können.
      if (!this.stationTorch) {
        const torch = this.placeTool(
          'flashlight',
          new THREE.Vector3(0.6, 1.1, (APRON_INNER + 0.6) * TILE),
          undefined,
          true,
        );
        if (torch instanceof FlashlightTool) this.stationTorch = torch;
      }
      this.torchImmersive = ctx.renderer.xr.isPresenting;
      this.stationTorch?.setBeamGuide(false);
      this.stationTorch?.setLit(true);
    } else {
      this.pendingBotRound = false;
      this.stationTorch?.setLit(false);
      this.buildStationViews();
      this.netPort = new NetMonsterPort({
        snapshot: () => this.mapSnapshot(),
        state: () => this.state,
        owned: () => seatOf(this.currentClaims(), ctx.net.localId) === 'monster',
      });
      this.ui = new StationUi({
        spec: () => this.spec,
        state: () => this.state,
        drone: () => this.drone,
        claims: () => this.currentClaims(),
        me: () => ctx.net.localId,
        technician: () => {
          this.flatTechnician = true;
        },
        menu: () => ctx.menu.toggle(),
        botRound: () => this.startRound('bot', ctx),
        mission: () => this.startRound('mission', ctx),
        test: () => this.startRound('test', ctx),
        flatMode: () => this.toggleFlatWanted(),
        flatWanted: () => this.flatWanted,
        lobby: () => this.lobbyChoice,
        setLobby: (choice) => this.setLobby(choice),
        setup: () => this.setup,
        setSetup: (setup) => this.applySetup(setup),
        startSetup: () => this.startRound(intentOf(this.setup), ctx),
        snapshot: () => this.mapSnapshot(),
        monsterPort: () => this.netPort,
        notify: (text) => ctx.notify(text),
        round: () => this.rules.status(this.state),
        restart: () => {
          if (this.isHost) {
            this.flatTechnician = true;
            this.pendingRestart = true;
          }
        },
        link: () => ({
          peers: [...ctx.net.peers.values()].filter((p) => p.world === 'haunting').length,
          vr: [...ctx.net.peers.values()].some(
            (p) =>
              p.world === 'haunting' &&
              (p.role === 'vr' || clock() - (this.technicians.get(p.id) ?? -Infinity) < 3000),
          ),
          room: ctx.net.room,
        }),
        nameOf: (peer) => ctx.net.peers.get(peer)?.name ?? 'jemand',
        seat: () => seatOf(this.currentClaims(), ctx.net.localId),
        wanted: () => this.wanted,
        arriving: () => Math.max(0, MOVE_TIME - this.seated),
        sit: (station) => this.sit(station),
        flip: (id, on) => this.flip(id, on),
        flyTo: (roomId) => this.setDroneTarget(roomId),
        droneStatus: () => this.droneStatus(),
        droneSeen: () => this.droneSeen,
        droneLight: () => this.toggleDroneLight(),
        droneLook: () => this.droneLook,
        dronePitch: () => this.dronePitch,
        droneTurn: (radians) => this.turnDroneView(this.droneLook + radians, this.dronePitch),
        droneTilt: (radians) => this.turnDroneView(this.droneLook, this.dronePitch + radians),
        droneFace: () => this.turnDroneView(0, 0),
        archiveView: () => this.archive,
        archiveZoom: (factor) => this.zoomArchive(factor),
        archivePan: (dx, dz) => this.panArchive(dx, dz),
        archiveHome: () => {
          this.archive = homeView();
        },
      });
    }
    this.applyLights();
  }

  override dispose(ctx: WorldContext): void {
    this.navigationOverlay.dispose();
    ctx.net.off(HAUNT_CHANNEL);
    ctx.touchStick(true);
    ctx.scene.fog = null;
    // Die Leinwand gehört der ganzen Seite und nicht dieser Welt: Was hier an
    // ihr verstellt wurde, geht hier auch wieder ab.
    this.veilView(false);
    this.paperTint(false);
    // Die Schnittebene gehört dem Renderer und nicht dieser Welt: Wer sie
    // stehen ließe, schnitte der nächsten Welt die Decke ab.
    this.liftLid(false);
    this.flat?.dispose();
    this.flat = null;
    this.flatShared = false;
    this.flatIcons = null;
    this.ui?.dispose();
    this.ui = null;
    this.netPort = null;
    this.experience?.dispose();
    this.experience = null;
    this.releaseMonster();
    this.dropFixtures();
    this.fixtureMaterial.dispose();
    this.roomArt.clear();
    dispose(this.stage);
    dispose(this.live);
    dispose(this.vanRig);
    dispose(this.paperMask);
    dispose(this.paperDoors);
    this.doorMarks.clear();
    this.roomWalls.clear();
    this.lamps.clear();
    this.monster = null;
    this.monsterArt = null;
    this.blob = null;
    this.stationTorch = null;
    this.automaticDoors.clear();
    this.travelPlan.clear();
    this.technicians.clear();
    this.hostId = '';
    this.mountedRole = '';
    this.flatTechnician = false;
    this.pendingBotRound = false;
    this.pendingRestart = false;
    this.droneBody = null;
    this.droneHead = null;
    this.droneCam = null;
    this.droneLamp = null;
    this.droneGlass = null;
    this.topCam = null;
    this.paperLight = null;
    this.paperSun = null;
    this.paperTint(false);
    super.dispose(ctx);
  }

  // --- was gebaut wird ------------------------------------------------------

  /** Lampen, Merkmale, Aufgaben und der Sicherungskasten — alles aus dem Plan. */
  private buildHouse(): void {
    this.experience?.dispose();
    this.experience = null;
    this.dropFixtures();
    dispose(this.stage);
    this.lamps.clear();
    const art = buildShip(this.spec);
    this.stage.add(art);
    this.ventArt = new VentFlapArt(this.spec, this.vents);
    this.stage.add(this.ventArt.group);
    this.roomArt.clear();
    for (const group of art.children) {
      const id = group.userData.roomId as string | undefined;
      if (id) this.roomArt.set(id, group);
    }
    this.cullTimer = 0;
    this.culledHead.set(Infinity, Infinity, Infinity);
    this.buildFixtureColliders();
    this.lampPool = Array.from({ length: 2 }, () => {
      const light = new THREE.PointLight(0xcce8e6, 0, 15, 2);
      this.stage.add(light);
      return light;
    });
    this.testLight = new THREE.AmbientLight(0xd5e9f3, 0);
    this.testLight.userData.dynamicIntensity = true;
    this.stage.add(this.testLight);
    for (const room of spacesOf(this.spec)) this.buildLamp(room.id, roomCentre(room));
    this.beacons = buildCorridorBeacons(this.spec);
    for (const beacon of this.beacons) this.stage.add(beacon.root);
    if (this.context) this.mountExperience(this.context);
    if (this.ui) this.buildDoorMarks();
    this.nextPhoneRender = 0;
  }

  private buildFixtureColliders(): void {
    for (const placement of stationLayout(this.spec)) {
      // A hiding locker has an accessible interior; a filled box would trap its user.
      if (placement.kind === 'locker') continue;
      const { minX, maxX, minZ, maxZ } = placement.bounds;
      const slab = this.slab(
        this.stage,
        this.fixtureMaterial,
        [maxX - minX, placement.height, maxZ - minZ],
        [(minX + maxX) / 2, placement.height / 2, (minZ + maxZ) / 2],
        false,
      );
      slab.visible = false;
      this.fixtureSlabs.push(slab);
    }
    // On initial load PortalWorld bakes after buildEnvironment; subsequent rounds
    // replace the GridPlan first, so GridWorld rebuilds and rebakes on its next update.
  }

  private dropFixtures(): void {
    for (const slab of this.fixtureSlabs) this.dropSlab(slab);
    this.fixtureSlabs.length = 0;
  }

  private travelGraph() {
    return this.travelPlan.graph(
      this.spec,
      this.state.shut,
      this.state.crew.options.test,
      this.state.shut.filter((id) => this.automaticDoors.isOpen(id)),
    );
  }

  private mountExperience(ctx: WorldContext): void {
    this.experience?.dispose();
    this.experience = new ShipExperience({
      ctx,
      spec: () => this.spec,
      state: () => this.state,
      say: (text) => this.announce(text),
      configure: (options) => this.configureStation(options),
      start: () => this.startMission(),
      test: () => this.testMission(),
      stations: () => {
        this.flatTechnician = false;
        this.pendingBotRound = false;
        ctx.menu.toggle(false);
      },
      door: (id) => this.manualDoor(id),
      round: () => this.rules.status(this.state),
      doorOpen: (id) =>
        id === 'test-bay' ? this.state.crew.options.test : this.automaticDoors.isOpen(id),
      doorLocked: (id) =>
        id === 'test-bay' ? !this.state.crew.options.test : this.state.shut.includes(id),
      travel: (at) => this.movePlayerTo(ctx, at),
      equip: (id, hand) => {
        if (id === 'off') this.stowCarriedTool(hand);
        else {
          if (this.carriedTool(hand)?.toolId !== id) this.equipTool(ctx, hand, id);
          const tool = this.carriedTool(hand);
          // An inventory choice uses the trigger, not the grip. Keep the gift
          // in the hand until its first deliberate grip/release gesture.
          if (tool) tool.regrip = !ctx.input.get(hand)?.squeeze.pressed;
        }
      },
      carried: (hand) => this.carriedTool(hand),
      mapSnapshot: () => this.mapSnapshot(),
      objectives: () => this.objectives(),
      monsterPace: () => this.decision?.pace ?? 'still',
      noise: (at, loudness) => {
        this.noiseQueue.push({ at: { x: at.x, z: at.z }, loudness });
      },
      floatingTorch: () => this.stationTorch,
      takeFloatingTorch: () => {
        if (this.stationTorch) {
          const entry = this.props.find((prop) => prop.object === this.stationTorch);
          if (entry) this.removeProp(entry, false);
          this.stationTorch = null;
        }
      },
      tuning: () => this.tuning,
      retune: (tuning) => {
        this.tuning = clampTuning(tuning);
        saveTuning(this.tuning);
        this.routine?.retune(this.tuning.monster);
      },
      simulationSpeed: () => this.simulationSpeed,
      cycleSimulationSpeed: () => {
        this.simulationSpeed = nextSimulationSpeed(this.simulationSpeed);
        return this.simulationSpeed;
      },
      lighting: () => this.botLighting,
      setLighting: (lighting) => {
        // Ohne Angabe geht es eine Stellung weiter — das ist der Knopf in der
        // Tafel; mit Angabe setzt jemand einzelne Werte.
        this.botLighting = Object.keys(lighting).length
          ? clampLighting({ ...this.botLighting, ...lighting })
          : nextLighting(this.botLighting);
        this.applyLights();
      },
      routeVersion: () => this.travelGraph().version,
      visible: (from, to) => this.clearSight(from, to),
      danger: (pose) => {
        const monster = this.state.monster;
        if (!monster || this.state.crew.venting > 0) return null;
        const seen =
          inView(pose, pose.yaw + Math.PI, monster, BOT_VISION, BOT_FOV) &&
          this.clearSight(
            { ...pose, y: 1.65 },
            { ...monster, y: this.state.crew.options.monster === 'crawler' ? 0.52 : 1.5 },
          );
        const velocity = this.monster?.entry.body.linvel();
        const heard =
          !!velocity &&
          Math.hypot(velocity.x, velocity.z) > 0.1 &&
          (this.hearing.get(pointKey(pose)) ?? Infinity) < 8;
        return seen || heard ? monster : null;
      },
      routeTo: (from, target) => stationRoute(this.spec, this.travelGraph(), from, target),
      route: (from, room) => {
        const c = roomCentre(room);
        return stationRoute(this.spec, this.travelGraph(), from, tileKey(c.x, c.z, 0));
      },
    });
    this.stage.add(this.experience.root);
  }

  private buildLamp(roomId: string, at: { x: number; z: number }): void {
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 12),
      new THREE.MeshBasicMaterial({ color: 0x2b3040, toneMapped: false }),
    );
    glass.rotation.x = Math.PI / 2;
    glass.position.set((at.x + 0.5) * TILE, PLAN_WALL_H - 0.14, (at.z + 0.5) * TILE);
    this.stage.add(glass);
    this.lamps.set(roomId, {
      glass,
      at: glass.position.clone(),
      color: new THREE.Color(0xd9edff)
        .lerp(new THREE.Color(roomAccent(roomOf(this.spec, roomId)?.kind ?? '')), 0.22)
        .getHex(),
    });
  }

  /** Die Einsatzzentrale vor der Haustür: der Ablagetisch und die Monitore. */
  private buildVan(): void {
    const x = -5;
    // Die Reihe an der Kantinenfront: Wer hier sitzt, schaut durch die
    // Scheibe in den Raum, den die Drohne gleich abfliegt.
    const z = (APRON_INNER + 0.05) * TILE;
    const metal = new THREE.MeshStandardMaterial({
      color: 0x39414f,
      roughness: 0.5,
      metalness: 0.4,
    });

    const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.1), metal);
    table.position.set(x, 0.85, z);
    this.vanRig.add(table);
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), metal);
      leg.position.set(x + side * 1.05, 0.42, z);
      this.vanRig.add(leg);
    }

    // Ein Monitor je Station. Sie zeigen (noch) nicht, was die Stationen sehen
    // — aber sie sagen, wer gerade an welchem Gerät sitzt, und das ist die
    // Auskunft, für die der VR-Spieler den Weg zurückgeht. Der fünfte ist der
    // Fernseher: kein Gerät, sondern das Fenster für die, die zusehen.
    const colors = [0xffc857, 0xff6b6b, 0x5ee0a0, 0xb98cff];
    const step = 0.55;
    colors.forEach((color, index) => {
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.46, 0.32),
        new THREE.MeshBasicMaterial({ color, toneMapped: false, opacity: 0.55, transparent: true }),
      );
      screen.position.set(x + (index - (colors.length - 1) / 2) * step, 1.4, z - 0.5);
      this.vanRig.add(screen);

      // **Und ein Platz davor, in derselben Farbe.** Vier Leute sitzen an
      // diesem Tisch, und der VR-Spieler sieht von ihnen nichts als vier
      // Monitore — ein Hocker je Gerät macht aus der Ansage „ich hab den
      // grünen" eine Stelle im Raum, an der jemand sitzt. Sie stehen hinter
      // dem Tisch, also südlich davon: Wer die Brille aufsetzt, steht
      // zwischen ihnen und dem Haus und läuft nicht durch sie hindurch.
      const stool = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.08, 14),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.6,
          emissive: color,
          emissiveIntensity: 0.25,
        }),
      );
      stool.position.set(x - 0.9 + index * 0.6, 0.52, z + 1.3);
      this.vanRig.add(stool);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.48, 0.07), metal);
      post.position.set(x - 0.9 + index * 0.6, 0.24, z + 1.3);
      this.vanRig.add(post);
    });

    this.buildPad();
    this.buildDusk();
  }

  /**
   * **Der Hangar der Drohne** — ein Ring auf dem Vorplatz, dort, wo sie steht.
   *
   * Ohne ihn ist `DRONE_HOME` eine Zahl in einer Datei: Die Drohne schwebt
   * über einer Stelle, die genauso aussieht wie jede andere, und „zurück zur
   * Einsatzzentrale" heißt für den, der im Haus steht, nichts. Mit ihr ist es ein Ort, auf
   * den man zeigen kann.
   */
  private buildPad(): void {
    const x = (DRONE_HOME.x + 0.5) * TILE;
    const z = (DRONE_HOME.z + 0.5) * TILE;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.46, 24),
      new THREE.MeshBasicMaterial({ color: 0x5ee0a0, toneMapped: false, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    // Einen Zentimeter über dem Boden: In derselben Ebene streiten sich zwei
    // Flächen um jeden Bildpunkt, und das flimmert.
    ring.position.set(x, 0.01, z);
    this.vanRig.add(ring);
  }

  /**
   * **Die Abendsonne über dem Vorplatz** — und warum sie in Wahrheit eine
   * Leuchte ist.
   *
   * Draußen soll es Licht geben und drinnen nicht, und das ist mit einer
   * richtigen Sonne genau dann zu haben, wenn jemand die Schatten bezahlt: Ein
   * `DirectionalLight` scheint ohne Schattenkarte **durch das Dach**, und die
   * Schattenkarte gibt es nur in der Stufe „Comic" (`core/graphicsSettings.ts`,
   * ausgeliefert wird „Einfach"). Eine Sonne, die in der Auslieferung das halbe
   * Haus aufhellt, nimmt diesem Spiel das Einzige, worauf es steht.
   *
   * Also hängt hier ein **Scheinwerfer tief über dem Vorplatz** statt einer
   * Sonne am Himmel. Er ist warm wie ein später Nachmittag, sein Kegel zeigt auf den
   * Vorplatz, und vor allem: Seine Reichweite (`distance`) endet ein paar
   * Meter hinter der Hauswand. Was davon in das Zimmer hinter der Haustür
   * fällt, ist ein Rest — und der sieht aus wie das, was er sein soll: Licht,
   * das durch Tür und Fenster hereinfällt. Im zweiten Zimmer ist davon nichts
   * mehr übrig, weil dort die Reichweite zu Ende ist.
   */
  private buildDusk(): void {
    const sun = new THREE.SpotLight(0xb7e2ef, 22, 5.5, 1.05, 0.5, 2);
    // Aus Südwesten und von oben: Von genau oben glänzt nur der Boden, von der
    // Seite bekommt auch die Hauswand etwas ab — und die ist das, worauf der
    // Pilot in seinem ersten Bild schaut.
    sun.position.set(-2.2, 2.7, (APRON_OUTER + 0.9) * TILE);
    sun.target.position.set(-1.5, 0, (APRON_OUTER + 0.9) * TILE);
    this.vanRig.add(sun);
    this.vanRig.add(sun.target);
    this.commandLight = sun;
  }

  /**
   * **Die Drohne steht bei allen im Haus** — auch in der Brille.
   *
   * Eine Weile gab es sie nur bei den Web-Spielern, weil nur die eine Kamera
   * daran brauchen. Mit dem Scheinwerfer geht das nicht mehr: Ein Licht, das
   * der VR-Spieler nicht sieht, ist keine Hilfe, sondern eine
   * Helligkeitseinstellung — und die halbe Rolle des Piloten wäre weg. Der
   * Körper kostet nichts, die Kameras kommen weiterhin nur dort dazu, wo eine
   * Station sie aufmacht.
   */
  private buildDrone(): void {
    const body = new THREE.Group();

    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.1, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x5ee0a0, toneMapped: false }),
    );
    body.add(shell);
    // Die Positionslampe: schwach, immer an, und sie sagt nur „hier bin ich".
    // Kurze Reichweite mit Absicht — eine, die bis an die Decke trägt, färbt
    // dem Piloten den oberen Bildrand grün und nimmt dem Haus sein Dunkel.

    // **Der Kopf sitzt in einer Wiege.** Kuppel, Scheinwerfer und Kamera hängen
    // daran; nach oben und unten kippt sie, nach links und rechts dreht sich
    // der ganze Rumpf. Ein Kopter, der sich zum Hochschauen selbst auf den
    // Rücken legt, sähe für den VR-Spieler nach Absturz aus — und drehte
    // nebenbei seine Positionslampe mit.
    const head = new THREE.Group();
    body.add(head);
    this.droneHead = head;

    // Die Kuppel über dem Scheinwerfer. Sie leuchtet mit, damit man von
    // *überall* sieht, dass das Licht an ist — der Kegel zeigt nach vorn, und
    // wer hinter der Drohne steht, sähe sonst nichts.
    const glass = new THREE.MeshBasicMaterial({ color: 0x123024, toneMapped: false });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), glass);
    dome.position.set(0, 0.05, 0.1);
    head.add(dome);
    this.droneGlass = glass;

    // Ein Kegel und kein Punktlicht: Eine Drohne, die rundherum leuchtet,
    // nimmt dem Haus das Dunkel — mit dem Kegel muss der Pilot **zielen**, und
    // dafür muss ihm jemand sagen, wohin.
    const lamp = new THREE.SpotLight(0xdff2ff, 0, 16, 0.42, 0.55, 1.6);
    lamp.position.set(0, 0.02, 0.1);
    lamp.target.position.set(0, -0.6, 3);
    head.add(lamp);
    head.add(lamp.target);
    this.droneLamp = lamp;

    this.live.add(body);
    this.droneBody = body;
    this.parkDrone();
    this.applyDroneLight();
  }

  /** Die Kameras, aus denen die Stationen ihr Bild bekommen. */
  private buildStationViews(): void {
    // Der Öffnungswinkel steht hier nur als Startwert: Was der Pilot wirklich
    // sieht, hängt an der Form seines Bildes und wird beim Zeichnen gerechnet
    // (`droneRoute.droneFov`) — ein Kinostreifen und ein hochkantes Vollbild
    // brauchen zwei verschiedene senkrechte Winkel für denselben Ausblick.
    const droneCam = new THREE.PerspectiveCamera(droneFov(1), 1, 0.05, 60);
    droneCam.rotation.order = 'YXZ';
    // **Sie schaut nach vorn, und „vorn" ist +Z.** Der Gierwinkel der Drohne
    // ist `atan2(dx, dz)`, damit zeigt ihre lokale +Z-Achse in die
    // Flugrichtung — eine Kamera von der Stange schaut aber nach −Z. Ohne die
    // halbe Drehung flog der Pilot rückwärts durch das Haus und der
    // Scheinwerfer leuchtete hinter ihm her.
    // Und sie bleibt dort: Was der Pilot wischt, dreht den **Rumpf**, und die
    // Kamera hängt daran (`turnDroneView`).
    droneCam.rotation.y = Math.PI;
    // Und sie sitzt **vor** der Drohne, nicht in ihr: Rumpf und Lampenkuppel
    // stehen im Weg, sobald die Kamera nach vorn schaut, und eine nahe
    // Schnittebene löste das nur, indem sie ein Loch in alles andere schnitte.
    droneCam.position.set(0, 0.03, 0.28);
    // In die Wiege und nicht an den Rumpf: Der Pilot schaut dorthin, wohin
    // sein Scheinwerfer leuchtet, und beide kippen deshalb an einem Stück.
    this.droneHead?.add(droneCam);
    this.droneCam = droneCam;

    // Draw the dossier border last, including over transparent trim above the
    // camera cut. No geometry from neighbouring rooms may reveal the layout.
    const dark = new THREE.MeshBasicMaterial({
      color: 0x0a0d14,
      toneMapped: false,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    for (let i = 0; i < 4; i++) {
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), dark);
      quad.renderOrder = 10000;
      quad.rotation.x = -Math.PI / 2;
      this.paperMask.add(quad);
    }
    this.paperMask.visible = false;
    this.root.add(this.paperMask);

    this.paperDoors.visible = false;
    this.root.add(this.paperDoors);
    this.buildDoorMarks();

    const paper = new THREE.AmbientLight(0xc7ecff, 0);
    this.root.add(paper);
    this.paperLight = paper;
    const sun = new THREE.DirectionalLight(0xffffff, 0);
    sun.position.set(6, 14, 4);
    this.root.add(sun);
    this.paperSun = sun;

    // Der Archivar schaut senkrecht von oben auf **ein** Zimmer. Der Ausschnitt
    // wird beim Zeichnen gesetzt, weil er vom gewählten Zimmer abhängt.
    const top = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 40);
    top.rotation.order = 'YXZ';
    top.rotation.x = -Math.PI / 2;
    this.root.add(top);
    this.topCam = top;

    // **Der Fernseher**: das ganze Haus, zehn Grad neben dem Lot. Wohin er
    // rückt, hängt an der Form des Bildes und wird beim Zeichnen gerechnet
    // (`aimShow`) — ein hochkantes Telefon und ein Fernseher quer brauchen
    // zwei verschiedene Abstände für dasselbe Haus.
    const show = new THREE.PerspectiveCamera(SHOW_FOV, 1, 0.5, 160);
    show.rotation.order = 'YXZ';
    show.rotation.x = -SHOW_PITCH;
    this.root.add(show);
    this.showCam = show;

    const day = new THREE.AmbientLight(0xeaf2ff, 0);
    this.root.add(day);
    this.showLight = day;
    const noon = new THREE.DirectionalLight(0xfff6e6, 0);
    noon.position.set(9, 18, 14);
    this.root.add(noon);
    this.showSun = noon;
  }

  /** Role changes must not leave extra cameras or global lights behind. */
  private clearStationViews(): void {
    for (const object of [
      this.droneCam,
      this.topCam,
      this.showCam,
      this.paperLight,
      this.paperSun,
      this.showLight,
      this.showSun,
    ]) {
      if (object instanceof THREE.DirectionalLight) object.shadow.map?.dispose();
      object?.removeFromParent();
    }
    this.droneCam = null;
    this.topCam = null;
    this.showCam = null;
    this.paperLight = null;
    this.paperSun = null;
    this.showLight = null;
    this.showSun = null;
    dispose(this.paperMask);
    dispose(this.paperDoors);
    this.doorMarks.clear();
    this.roomWalls.clear();
    this.paperTint(false);
    this.veilView(false);
    this.liftLid(false);
    this.nextPhoneRender = 0;
  }

  /**
   * **Ein Türzeichen für jede Tür**, offen und zu, fertig gebaut.
   *
   * Gebaut und dann nur noch ein- und ausgeblendet: Die Türen gehen im Spiel
   * dauernd auf und zu (der Hacker legt Schalter um), und Geometrie, die
   * dabei jedes Mal neu entsteht, ist ein Speicherleck mit Zeitplan.
   *
   * Die Zeichen sind die aus einem Grundriss: **offen** ein schmaler Strich in
   * der Öffnung und der Viertelbogen, den das Blatt schlägt; **zu** die
   * ausgefüllte Lücke. Zusätzlich zur Farbe macht die Form den Zustand lesbar.
   */
  private buildDoorMarks(): void {
    dispose(this.paperDoors);
    this.doorMarks.clear();
    this.roomWalls.clear();
    const ink = new THREE.MeshBasicMaterial({
      color: PAPER_INK,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const shutInk = new THREE.MeshBasicMaterial({
      color: PAPER_SHUT,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

    for (const room of spacesOf(this.spec)) {
      const walls = this.wallsOf(room, ink);
      walls.visible = false;
      this.paperDoors.add(walls);
      this.roomWalls.set(room.id, walls);
    }

    for (const door of this.spec.doors) {
      const { x, z, alongX } = doorEdge(door);
      const open = new THREE.Group();
      const shut = new THREE.Group();

      // **Offen ist die Lücke selbst die Auskunft**: Zwischen den beiden
      // Wandstücken bleibt Platz, und der Bogen sagt, dass dort eine Tür
      // schwingt und keine Wand fehlt. Ein Strich quer durch die Lücke stand
      // hier einmal — er machte den Durchgang optisch wieder zu.
      const pivot = new THREE.Group();
      const arc = new THREE.Mesh(
        new THREE.RingGeometry(PLAN_DOOR_W - 0.07, PLAN_DOOR_W, 20, 1, 0, Math.PI / 2),
        ink,
      );
      arc.rotation.x = -Math.PI / 2;
      pivot.add(arc);
      open.add(pivot);

      // Und zu: das Blatt steht in der Lücke, **dunkel** in der hellen Wand.
      // Ein heller Pfropfen wäre schlicht Wand gewesen — man müsste die Bögen
      // zählen, um zu merken, dass dort überhaupt eine Tür ist.
      const plug = new THREE.Mesh(
        new THREE.PlaneGeometry(PLAN_DOOR_W, PLAN_WALL_T + 0.12),
        shutInk,
      );
      plug.rotation.x = -Math.PI / 2;
      if (!alongX) plug.rotation.z = Math.PI / 2;
      shut.add(plug);

      for (const mark of [open, shut]) {
        mark.position.set(x, PAPER_MARK_Y, z);
        mark.visible = false;
        this.paperDoors.add(mark);
      }
      this.doorMarks.set(door.id, { open, shut, arc: pivot });
    }
  }

  /**
   * **Die Wände eines Zimmers, als Linien auf dem Blatt.**
   *
   * Sie sind der Grund, aus dem die Türen vorher im Zimmer zu schweben
   * schienen: Der Schnitt geht durch jede Wand, und eine aufgeschnittene Wand
   * ist von oben ein offener Kasten — man sieht durch sie hindurch. Der
   * Archivar sah also einen Boden, ein paar Möbel und einen Bogen im Nichts.
   * Gezeichnet wird deshalb, was gemeint ist: ein Strich auf jeder Kante, die
   * das Zimmer begrenzt, mit einer **Lücke, wo eine Tür sitzt** (zwei
   * Wandstücke links und rechts davon, genau wie die Pfosten im Haus).
   *
   * Gebaut wird je Zimmer und nicht je Haus: Auf dem Blatt liegt immer nur
   * eines, und zwei Zimmer teilen sich zwar eine Wand, aber jedes zeichnet
   * seine eigene — das kostet ein paar Rechtecke und spart die Frage, wem sie
   * gehört.
   */
  private wallsOf(room: HouseRoom, ink: THREE.Material): THREE.Object3D {
    const group = new THREE.Group();
    // **Bis in die Ecke hinein.** Eine Linie, die genau an der Kachelkante
    // endet, lässt in jeder Zimmerecke ein Quadrat von einer halben Wandstärke
    // frei — vier schwarze Zähne im hellen Rahmen. Also ragt jede Linie an
    // ihren Enden um genau diese halbe Stärke über die Kante hinaus.
    const reach = TILE / 2 + PLAN_WALL_T / 2;

    for (const tile of tilesOf(room.rect)) {
      for (const dir of DIRS) {
        const nx = tile.x + dirX(dir);
        const nz = tile.z + dirZ(dir);
        const next = roomAt(this.spec, nx, nz);
        if (next && next.id === room.id) continue;
        // **Genau die Kanten, an denen im Haus wirklich eine Wand steht**
        // (`plan.innerWalls` und die Außenmauer): zwischen zwei verschiedenen
        // Zimmern und am Rand des Hauses. Eine Kachel ohne Zimmer *im* Haus
        // wäre eine Lücke im Bauplan und bekommt auch dort keine Wand.
        const edge = edgeCentre(tile.x, tile.z, dir);
        const door = this.doorAt(tile.x, tile.z, dir);
        const parts: Array<[number, number]> = door
          ? [
              [reach - PLAN_DOOR_W / 2, -(reach + PLAN_DOOR_W / 2) / 2],
              [reach - PLAN_DOOR_W / 2, (reach + PLAN_DOOR_W / 2) / 2],
            ]
          : [[reach * 2, 0]];
        for (const [len, shift] of parts) {
          const bar = new THREE.Mesh(new THREE.PlaneGeometry(len, PLAN_WALL_T), ink);
          bar.rotation.x = -Math.PI / 2;
          if (!edge.alongX) bar.rotation.z = Math.PI / 2;
          bar.position.set(
            edge.x + (edge.alongX ? shift : 0),
            PAPER_MARK_Y - 0.005,
            edge.z + (edge.alongX ? 0 : shift),
          );
          group.add(bar);
        }
      }
    }
    return group;
  }

  /** Ob auf dieser Kachelkante eine Tür sitzt — egal, von welcher Seite gefragt. */
  private doorAt(x: number, z: number, dir: Dir): HouseDoor | undefined {
    const edge = edgeCentre(x, z, dir);
    return this.spec.doors.find((door) => {
      const at = doorEdge(door);
      return Math.abs(at.x - edge.x) < 0.01 && Math.abs(at.z - edge.z) < 0.01;
    });
  }

  /**
   * **Welche Zeichen gerade gelten** — und es sind nur die des aufgeschlagenen
   * Zimmers.
   *
   * Die Zeichen liegen über den Flächen, die alles andere freiräumen; ohne
   * diese Auswahl schwebten die Türen der Nachbarzimmer über dem schwarzen
   * Rand und machten aus dem Blatt doch wieder eine Karte.
   */
  private markDoors(roomId: string): void {
    const room = roomOf(this.spec, roomId) ?? this.spec.rooms[0];
    const shut = new Set(this.state.shut);
    for (const [id, walls] of this.roomWalls) walls.visible = id === room?.id;
    for (const door of this.spec.doors) {
      const mark = this.doorMarks.get(door.id);
      if (!mark) continue;
      const mine = !!room && (door.a === room.id || door.b === room.id);
      const closed = shut.has(door.id);
      mark.open.visible = mine && !closed;
      mark.shut.visible = mine && closed;
      if (mine && room && !closed) this.swingInto(mark.arc, door, room);
    }
  }

  /**
   * **Den Türbogen in das aufgeschlagene Zimmer drehen.**
   *
   * Der Bogen ist ein Viertelkreis vom Pfosten aus: Er fängt in der Wand an
   * (dort steht das Blatt, wenn die Tür zu ist) und endet quer im Zimmer (dort
   * steht es offen). Welcher der beiden Pfosten der Angelpunkt ist, hängt
   * daran, auf welcher Seite das Zimmer liegt — der gebaute Bogen läuft von
   * seiner örtlichen +X-Achse nach −Z, und gedreht wird er so, dass aus diesen
   * beiden Richtungen „die Wand entlang" und „ins Zimmer hinein" wird.
   */
  private swingInto(pivot: THREE.Object3D, door: HouseDoor, room: HouseRoom): void {
    const edge = doorEdge(door);
    // Die Wandrichtung, und die Richtung ins Zimmer: Die eine liegt fest, die
    // andere zeigt dorthin, wo die Mitte des Zimmers liegt.
    let ax = edge.alongX ? 1 : 0;
    let az = edge.alongX ? 0 : 1;
    const mid = roomCentre(room);
    const inx = edge.alongX ? 0 : Math.sign((mid.x + 0.5) * TILE - edge.x) || 1;
    const inz = edge.alongX ? Math.sign((mid.z + 0.5) * TILE - edge.z) || 1 : 0;
    // Beide Drehsinne sind möglich; der gebaute Bogen kennt nur einen. Zeigt
    // das Paar in die falsche Richtung herum, hängt er am anderen Pfosten.
    if (ax * inz - az * inx > 0) {
      ax = -ax;
      az = -az;
    }
    pivot.rotation.y = Math.atan2(-az, ax);
    pivot.position.set((-ax * PLAN_DOOR_W) / 2, 0, (-az * PLAN_DOOR_W) / 2);
  }

  // --- der Stand ------------------------------------------------------------

  /** Wie lange ich schon an meinem Gerät sitze, in Sekunden. */
  private get seated(): number {
    return (clock() - this.seatedAt) / 1000;
  }

  private get isHost(): boolean {
    return this.hostId !== '' && this.hostId === this.context?.net.localId;
  }

  /**
   * **Ein Bild — oder bei Zeitraffer mehrere hintereinander.**
   *
   * Die Bot-Runde lässt sich beschleunigen (`simulationSpeed.ts`), und das
   * geschieht hier und nirgends sonst: Statt einen Zeitschritt zu strecken —
   * womit der Techniker beim ersten ×8 durch eine Wand stünde — rechnet die
   * Welt in einem echten Bild mehrere ganz normale. Nur der letzte Durchgang
   * schickt Netzpakete und frischt die Anzeigen auf; alles andere wäre acht
   * gleiche Nachrichten je Bild.
   */
  override update(dt: number, ctx: WorldContext): void {
    const repeats = this.state.crew.simulation ? simulationRepeats(this.simulationSpeed, dt) : 1;
    for (let i = 0; i < repeats; i++) this.tick(dt, ctx, i === repeats - 1);
  }

  private tick(dt: number, ctx: WorldContext, last = true): void {
    if (this.flat) {
      // Die 2D-Welt rechnet sich selbst; der 3D-Pfad steht still. Das Netz
      // läuft weiter: Wer 2D spielt, ist der Techniker der gemeinsamen Runde —
      // die lokale Bot-Runde rechnet nur für sich.
      this.context = ctx;
      if (this.flatShared) this.stepFlat(dt, ctx);
      else this.flat.update(dt);
      // **Der Zuschauer am Netz braucht die Türblätter.** Sein Bild kommt aus
      // `worldSnapshot()`, und ob ein Blatt offen steht, weiß nur der
      // Türautomat — der sonst im 3D-Pfad läuft, den die 2D-Welt stillstellt.
      // Ohne diesen Schritt blieben für ihn alle Türen für immer zu.
      if (this.flatWatching) this.applyDoors(dt);
      this.tickNet(dt, ctx, last);
      return;
    }
    if (this.flatTechnician) ctx = { ...ctx, role: 'vr' };
    if (this.mountedRole !== ctx.role) {
      this.context = ctx;
      this.setupRole(ctx);
      this.mountExperience(ctx);
      ctx.refreshWorldMenu();
    }
    super.update(dt, ctx);
    if (this.stationTorch && this.torchImmersive !== ctx.renderer.xr.isPresenting) {
      this.torchImmersive = ctx.renderer.xr.isPresenting;
      if (this.stationTorch.visible) this.stationTorch.setLit(true);
    }
    this.refreshHost(ctx);
    if (this.pendingRestart && this.isHost && ctx.role === 'vr') {
      this.pendingRestart = false;
      this.startMission();
    }
    if (this.pendingBotRound && this.isHost && ctx.role === 'vr') {
      this.pendingBotRound = false;
      this.testMission();
      this.experience?.startBotRound();
    }

    if (this.isHost) {
      this.state.time += dt;
      // Zugefallene Türen gehen von selbst wieder auf (`rules/doorLocks.ts`).
      const locks = stepLocks(this.locks, this.state.shut, this.state.time);
      if (locks.opened.length) this.state.shut = locks.shut;
      // Und die Lampen gehen von selbst wieder aus — erst das Flackern, dann
      // das Geräusch, dann dunkel (`rules/lamps.ts`).
      const lamps = stepLamps(this.lampBook, this.state.lit, this.state.time);
      for (const room of lamps.flicker) this.lampSound(room);
      if (lamps.out.length) {
        this.state.lit = lamps.lit;
        for (const room of lamps.out) this.lampSound(room);
      }
      const oxygen = this.rules.step(this.state);
      if (oxygen) {
        this.removeMonster();
        this.announce(oxygen.text);
      }
      this.trackMonster();
      this.noticeRepairs();
      this.checkItems(ctx);
      this.stepCrew(dt, ctx);
      this.state.ride = this.ventRide.phase;
    }

    this.stepSpook(dt);
    this.applyDoors(dt);
    // **Das Licht wird je Bild gesetzt und nicht je Änderung**, seit es
    // flackert: Eine Lampe, die nur beim Umlegen eines Schalters angefasst
    // wird, zuckt nicht. Sieben Lampen je Bild kosten nichts.
    this.applyLights(dt);
    this.cullRoomArt(dt, ctx);
    this.applyBlob();
    this.experience?.update(dt);
    if (this.monsterArt && this.monster) {
      // Wer steht und horcht, dreht sich zur Richtung des Geräuschs.
      if (this.monsterFace && this.state.monster)
        this.monster.model.rotation.y = Math.atan2(
          -(this.monsterFace.x - this.state.monster.x),
          -(this.monsterFace.z - this.state.monster.z),
        );
      this.monsterArt.rotation.y = this.monster.model.rotation.y;
      this.monsterArt.visible = this.state.crew.venting <= 0;
      animateCreature(this.monsterArt, this.state.time);
    }
    this.showTechnician();
    this.flyDrone(dt);
    // **Das Overlay läuft auch außerhalb der Simulation** (Paket U4/M4): Es
    // war an die Bot-Runde gebunden, weil es dafür gebaut wurde — der
    // Zuschauer braucht es aber gerade dann, wenn Menschen spielen.
    const overlay = this.state.crew.simulation || this.insightWanted();
    this.navigationOverlay.update(overlay, [
      this.experience?.botNavigation ?? null,
      this.monsterNavigator?.navigation ?? null,
      {
        at: this.dronePose,
        points: this.droneRoute.points ?? [],
        goal: this.droneRoute.points?.at(-1) ?? null,
      },
    ]);

    this.navigationOverlay.insight(this.insightWanted() ? (this.decision?.insight ?? null) : null);
    this.perceptionClock -= dt;
    if (overlay && this.perceptionClock <= 0) {
      this.perceptionClock = 0.15;
      const bot = this.experience?.botPose;
      const monster = this.state.monster;
      this.navigationOverlay.perception(
        bot
          ? {
              ...bot,
              y: 1.65,
              targetY: this.state.crew.options.monster === 'crawler' ? 0.52 : 1.5,
              yaw: bot.yaw + Math.PI,
              range: BOT_VISION,
              fov: BOT_FOV,
            }
          : null,
        monster && this.state.crew.venting <= 0
          ? {
              ...monster,
              y: this.state.crew.options.monster === 'crawler' ? 0.52 : 1.5,
              yaw: this.monster?.model.rotation.y ?? 0,
              range: ENTITY_PROFILES[this.state.crew.options.monster].vision,
              fov: MONSTER_FOV,
            }
          : null,
        new Map(
          [...this.hearing].filter(
            ([, distance]) => distance < ENTITY_PROFILES[this.state.crew.options.monster].hearing,
          ),
        ),
        (from, to) => this.clearSight(from, to),
      );
    }
    this.tickNet(dt, ctx, last);
  }

  /**
   * **Ein Bild der 2D-Welt als gemeinsame Runde.** Die Runde rechnet sich
   * selbst (`map/flatMode.ts`); hier wird ihr Stand zum Stand der Welt — die
   * Übernahme ist dieselbe wie bei einem fremden Gastgeber (`adopt`), samt
   * neuem Haus, wenn die 2D-Welt eine neue Runde würfelt. Dazu kommt, was
   * die 2D-Runde nicht selbst führt: die Stelle des Technikers (er hat kein
   * Rig), die Phase der Schachtfahrt und das Signal `venting`, an dem alle
   * anderen Geräte das verborgene Monster erkennen. Das Steuer der
   * Monster-Station hängt sich als `driver` ein, sobald die Runde keins hat.
   */
  private stepFlat(dt: number, ctx: WorldContext): void {
    const flat = this.flat!;
    if (!flat.round.driver) flat.round.driver = this.netMonster;
    flat.update(dt);
    const round = flat.round;
    this.adopt(round.haunt);
    // Eine Buchführung für beide: Was die Tafel am Telefon sperrt und was der
    // Techniker in der 2D-Runde sperrt, teilt sich denselben einen Riegel.
    this.locks = round.locks;
    const player = round.player;
    round.haunt.technician = {
      x: player.x,
      z: player.z,
      yaw: player.yaw,
      moving: round.entities().find((entity) => entity.id === 'player')?.moving ?? false,
    };
    round.haunt.ride = round.ventRide.phase;
    round.haunt.crew.venting = round.ventRide.concealed
      ? Math.min(VENTING_CEILING, Math.max(VENTING_FLOOR, round.ventRide.timer))
      : 0;
    this.refreshHost(ctx);
  }

  /**
   * **Der Netzteil eines Bildes** — Herzschlag, Stand, Platz, Monster-Steuer.
   * Aus `tick` herausgelöst, weil er auch läuft, wenn die 2D-Welt den
   * 3D-Pfad stillstellt: Die Telefone sähen sonst eine Runde, die niemand
   * mehr ansagt.
   */
  private tickNet(dt: number, ctx: WorldContext, last: boolean): void {
    if (!last) return;
    this.sendTimer -= dt;
    if (this.sendTimer <= 0) {
      this.sendTimer = STATE_RATE;
      // Der 2D-Spieler ist ein Techniker wie der im Headset (`refreshHost`).
      if (ctx.role === 'vr' || this.flatShared) ctx.net.emit(HAUNT_CHANNEL, { kind: 'technician' });
      if (this.isHost) ctx.net.emit(HAUNT_CHANNEL, stateMessage(this.state));
      if (this.wanted) ctx.net.emit(HAUNT_CHANNEL, claimMessage(this.wanted, this.seated));
    }
    // Das Steuer der Monster-Station, im Takt der Drohne — nur solange man
    // die Station besitzt; der Gastgeber hört nur auf den Besitzer (`receive`).
    this.monsterTimer -= dt;
    if (this.monsterTimer <= 0) {
      this.monsterTimer = DRONE_RATE;
      const input = this.netPort?.message();
      if (input) {
        if (this.isHost) this.receive(input, ctx.net.localId);
        else ctx.net.emit(HAUNT_CHANNEL, input);
      }
    }
    if (this.wanted) {
      // **Die eigene Sitzdauer steht auch in der eigenen Liste.** Nur die
      // Ansage zu füllen und den eigenen Eintrag auf null stehen zu lassen war
      // der Fehler, den erst zwei Geräte zeigen: Jeder hielt den anderen für
      // den Älteren, und beide sahen „weggeschubst".
      this.claims.set(ctx.net.localId, {
        id: ctx.net.localId,
        station: this.wanted,
        seniority: this.seated,
        heardAt: clock(),
      });
    }

    this.expireClaims();
    this.ui?.refresh();
  }

  /** Wer die Runde rechnet — der VR-Spieler, sonst der Älteste. */
  private refreshHost(ctx: WorldContext): void {
    const here = [...ctx.net.peers.values()].filter((peer) => peer.world === ctx.net.world);
    const candidates = [
      // Wer die 2D-Welt spielt, ist der Techniker dieser Runde — und rechnet sie.
      {
        id: ctx.net.localId,
        seniority: ctx.net.localSeniority,
        vr: ctx.role === 'vr' || this.flatShared,
      },
      ...here.map((peer) => ({
        id: peer.id,
        seniority: ctx.net.seniorityOf(peer),
        vr: peer.role === 'vr' || clock() - (this.technicians.get(peer.id) ?? -Infinity) < 3000,
      })),
    ];
    const next = pickGameHost(candidates) || pickHost(candidates);
    if (next === this.hostId) return;
    const wasHost = this.hostId === ctx.net.localId;
    this.hostId = next;
    if (wasHost) this.releaseMonster();
    if (
      next === ctx.net.localId &&
      !this.flatShared &&
      this.state.phase === 'running' &&
      this.state.monsterOn &&
      this.state.monster &&
      !this.state.crew.options.test &&
      !this.state.crew.simulation
    ) {
      if (this.blob) this.blob.visible = false;
      this.spawnMonster(this.state.monster);
    }
  }

  private receive(data: unknown, from: string): void {
    if (typeof data === 'object' && data !== null && 'kind' in data && data.kind === 'technician') {
      if ('active' in data && data.active === false) this.technicians.delete(from);
      else this.technicians.set(from, clock());
      return;
    }
    const state = readState(data);
    if (state && from !== this.context?.net.localId && from === this.hostId) {
      // In der gemeinsamen 2D-Runde ist der eigene Stand der Stand (`stepFlat`).
      if (!this.flatShared) this.adopt(state);
      return;
    }
    const claim = readClaim(data, from);
    if (claim) {
      this.claims.set(from, { ...claim, heardAt: clock() });
      return;
    }
    const drone = readDrone(data);
    if (
      drone &&
      from !== this.context?.net.localId &&
      seatOf(this.currentClaims(), from) === 'drone'
    ) {
      // Die Stelle wird gesetzt, der Winkel wird **angefahren**: Er steht in
      // der Nachricht (`net.DroneState.yaw`), weil eine Drohne, die im Stehen
      // schwenkt, keinen Weg hinterlässt, aus dem er sich ableiten ließe — und
      // ein gesetzter Winkel bei zehn Ansagen je Sekunde sichtbar ruckelt.
      // Remote positions are interpolated in turnDroneBody, never snapped per packet.
      this.drone = drone;
      this.applyDroneLight();
      return;
    }
    const flip = readFlip(data);
    if (flip && this.isHost && ['hack', 'scout'].includes(seatOf(this.currentClaims(), from) ?? ''))
      this.applyFlip(flip.id, flip.on);
    // Stock und Knöpfe der Monster-Station — nur vom Besitzer, wie der Schalter.
    const input = readMonsterInput(data);
    if (input && this.isHost && seatOf(this.currentClaims(), from) === 'monster')
      this.netMonster.accept(input);
  }

  /**
   * **Die Ansprüche, wie sie jetzt gelten** — jede angesagte Dauer plus die
   * Zeit, die seit ihrer Ankunft vergangen ist. Der eigene Platz kommt von der
   * eigenen Uhr und nicht aus der Liste.
   */
  private currentClaims(): Claim[] {
    const me = this.context?.net.localId ?? '';
    const now = clock();
    const out: Claim[] = [];
    for (const claim of this.claims.values()) {
      const seniority =
        claim.id === me ? this.seated : claim.seniority + (now - claim.heardAt) / 1000;
      out.push({ id: claim.id, station: claim.station, seniority });
    }
    return out;
  }

  /** Wer sich zehn Sekunden nicht gemeldet hat, sitzt an keinem Gerät mehr. */
  private expireClaims(): void {
    const me = this.context?.net.localId ?? '';
    const now = clock();
    for (const [peer, claim] of this.claims) {
      if (peer !== me && now - claim.heardAt > 10000) this.claims.delete(peer);
    }
  }

  /** Den Stand des Gastgebers übernehmen — samt Haus, wenn es ein anderes ist. */
  private adopt(next: HauntState): void {
    if (
      next.seed !== this.spec.seed ||
      next.crew.options.rooms !== this.spec.rooms.length ||
      next.crew.options.test !== this.state.crew.options.test
    ) {
      this.spec = generateHouse(next.seed, next.crew.options.rooms);
      this.state = next;
      this.spook = freshSpook();
      this.automaticDoors.clear();
      this.grid?.replaceWith(housePlan(this.spec, new Set(next.shut), next.crew.options.test));
      this.builtDoors = '?';
      this.buildHouse();
      this.parkDrone();
      return;
    }
    this.state = next;
  }

  // --- was im Haus passiert -------------------------------------------------

  /** Der Gastgeber liest die Stelle des Monsters ab und sagt sie an. */
  private trackMonster(): void {
    if (!this.state.monsterOn) {
      this.state.monster = null;
      return;
    }
    if (!this.monster) return;
    const at = this.monster.feet(_feet);
    this.state.monster = { x: at.x, z: at.z };
  }

  /**
   * **Eine fertige Reparatur ist ein Ereignis der Station** — und das Monster
   * merkt es.
   *
   * Die Konsole fährt hoch, die Sicherung fällt (`HauntState.fuse`), im Modul
   * flackert das Licht. Wer das hört und sieht, weiß, dass dort eben jemand
   * gestanden hat; das ist kein Hellsehen, sondern der Schluss, den jedes Tier
   * zieht. Also: eine Aufruhr-Notiz auf diesen Raum (`MonsterMemory.disturbed`
   * — ausdrücklich **keine** Sichtung, denn über die Laufrichtung sagt sie
   * nichts) und ein Schub aufs Tempo für `MonsterTuning.rush` Sekunden.
   *
   * Gelesen wird `state.done`, nicht der Rätselcode: Der wächst im Schiff
   * (`ShipExperience`), in der 2D-Runde und beim Modelltechniker an drei
   * verschiedenen Stellen, und alle drei laufen hier zusammen.
   */
  private noticeRepairs(): void {
    const done = this.state.done;
    if (done.length <= this.repaired) {
      this.repaired = done.length;
      return;
    }
    for (const entry of done.slice(this.repaired)) {
      const room = repairRoom(this.spec, entry);
      if (!room) continue;
      this.brain?.disturbed(room, stationGraph(this.spec).centre(room), this.state.time);
      this.routine?.hurry(this.tuning.monster.rush);
    }
    this.repaired = done.length;
  }

  /** Bei allen anderen steht an dieser Stelle ein Klotz — mehr braucht es nicht. */
  private applyBlob(): void {
    if (this.isHost) {
      if (this.blob) this.blob.visible = false;
      return;
    }
    const at = this.state.monster;
    if (!at) {
      if (this.blob) this.blob.visible = false;
      return;
    }
    if (this.blob && this.blob.name !== `creature-${this.state.crew.options.monster}`) {
      this.blob.removeFromParent();
      dispose(this.blob);
      this.blob = null;
    }
    if (!this.blob) {
      const blob = buildCreature(this.state.crew.options.monster);
      this.live.add(blob);
      this.blob = blob;
    }
    this.blob.visible = true;
    this.blob.position.set(at.x, 0, at.z);
    this.blob.visible = this.state.crew.venting <= 0;
    animateCreature(this.blob, this.state.time);
  }

  /**
   * **Aufheben, indem man hingeht.**
   *
   * Kein Griff, keine Physik: Was hier eingesammelt wird, sind keine Kisten,
   * sondern Aufgaben — und ein Andenken, das man dreimal danebengreift, weil
   * es im Dunkeln liegt, macht das Spiel nicht schwerer, sondern zäher.
   * Schwer soll die Frage sein, in *welchem* Zimmer es liegt.
   */
  private checkItems(ctx: WorldContext): void {
    if (ctx.role !== 'vr' || this.state.phase !== 'running' || this.state.crew.simulation) return;
    ctx.rig.getHeadPosition(_head);
    if (
      this.state.done.length >= 3 &&
      this.state.crew.hp > 0 &&
      onApron(Math.floor(_head.x / TILE), Math.floor(_head.z / TILE))
    ) {
      this.state.phase = 'won';
      this.removeMonster();
      this.announce('MISSION ERFÜLLT · Alle Systeme online. Crew zurück in der Zentrale.');
    }
  }

  protected override takeHit(_direction: THREE.Vector3, _strength: number): void {
    const ctx = this.context;
    if (!ctx || !this.monster) return;
    // Ein Spieler am Steuer trifft nur mit dem Knopf, nicht durch Berührung
    // (`monster/monsterHelm.ts`); `stepRoutine` ruft dann selbst hierher.
    if (this.monsterDriver?.active() && !this.decision?.strike) return;
    ctx.rig.getHeadPosition(_head);
    const at = this.monster.feet(_feet);
    if (
      this.ventRide.busy ||
      !roomAt(this.spec, Math.floor(_head.x / TILE), Math.floor(_head.z / TILE)) ||
      Math.hypot(at.x - _head.x, at.z - _head.z) > 1.65 ||
      !this.monsterLineOfSight()
    )
      return;
    if (!this.isHost || !takeCrewHit(this.state.crew, this.state.phase === 'running')) return;
    // Der kurze Schub nach dem Treffer (`mission.HIT_BURST`): Drei Sekunden
    // Unverwundbarkeit nützen nichts, wenn man sie im Griff des Monsters
    // absteht.
    grantBurst(this.stamina);
    for (const hand of ['left', 'right'] as const) this.context?.input.get(hand)?.pulse(0.65, 120);
    playSwitch(false);
    if (this.state.crew.hp === 0) {
      this.state.phase = 'lost';
      this.removeMonster();
      this.announce(
        'MISSION GESCHEITERT · Drei Treffer. Neuer Versuch oder sicherer Test im Missionsmenü.',
      );
    } else
      this.announce(
        `Treffer · Anzug ${this.state.crew.hp}/3. Abstand gewinnen, Schutzschrank oder Medkit nutzen.`,
      );
    this.context?.refreshWorldMenu();
  }

  private stepCrew(dt: number, ctx: WorldContext): void {
    if (ctx.role !== 'vr') return;
    if (this.state.crew.options.test && this.state.crew.simulation) {
      this.state.crew.hp = 3;
      if (!this.monster && this.state.phase === 'running') {
        this.state.monsterOn = true;
        this.spawnMonster(safeRoomSpawn(this.spec, this.spec.rooms[2]!.id));
      }
    }
    const bot = this.state.crew.simulation ? this.experience?.botPose : null;
    if (this.state.crew.simulation && !bot) return;
    if (bot) _head.set(bot.x, 1.65, bot.z);
    else ctx.rig.getHeadPosition(_head);
    const speed =
      this.previousFeet && dt > 0
        ? Math.min(6, Math.hypot(_head.x - this.previousFeet.x, _head.z - this.previousFeet.z) / dt)
        : 0;
    if (!this.previousFeet) this.previousFeet = _head.clone();
    else this.previousFeet.copy(_head);
    const monster = this.state.monster;
    const distance = monster ? Math.hypot(monster.x - _head.x, monster.z - _head.z) : Infinity;
    stepVitals(this.state.crew, dt, speed, distance);
    // **Die Puste** (`mission.ts`, `core/PlayerRig.sprintScale`). Bis eben galt
    // der Sprint hier unbegrenzt, und damit war jede Verfolgung entschieden,
    // sobald der Spieler den Stock nach vorn drückte. Jetzt sind es fünf
    // Sekunden, danach Trab — und eine Flucht braucht eine Tür, eine Ecke oder
    // einen Schacht statt einer geraden Linie. Der Modelltechniker der
    // Bot-Runde hat seine eigene Puste (`rules/technicianBot.ts`), deshalb
    // hängt das hier am echten Gestell und nicht an ihm.
    const dash = stepStamina(this.stamina, dt, !bot && ctx.rig.sprinting && speed > 0.1);
    if (!bot) ctx.rig.sprintScale = dash;
    this.sightTimer -= dt;
    if (this.sightTimer <= 0) {
      this.sightTimer = 0.1;
      this.monsterSeesPlayer = distance < 24 && this.monsterLineOfSight();
      // --- Die zuletzt gesehene Stelle, beide Richtungen (`rules/ghosts.ts`).
      // Sie hängt an denselben Prüfungen wie Alarmleiter und Bot-Furcht: Ein
      // eigener Sichttest daneben wäre eine zweite Wahrheit, und der Marker
      // zeigte woandershin als das, was das Monster tut. Der Blick des
      // Technikers kommt aus der Kamera (im Modelltechniker aus seiner Pose,
      // deren Winkel wie bei der Drohne um π gedreht steht).
      let facing = bot ? bot.yaw + Math.PI : 0;
      if (!bot) {
        ctx.camera.getWorldDirection(_feet);
        facing = Math.atan2(-_feet.x, -_feet.z);
      }
      const ghosts = this.state.ghosts;
      ghosts.technician = markGhost(
        ghosts.technician,
        this.monsterSeesPlayer,
        { x: _head.x, z: _head.z },
        facing,
        this.state.time,
      );
      // Andersherum sieht der Techniker das Monster, wenn es in seinem Kegel
      // steht und keine Wand dazwischen ist — dieselbe Rechnung, mit der der
      // Modelltechniker vor ihm flieht (`danger`). Im Schacht sieht ihn
      // niemand.
      const sighted =
        !!monster &&
        this.state.crew.venting === 0 &&
        inView(_head, facing, monster, BOT_VISION, BOT_FOV) &&
        this.clearSight(
          { x: _head.x, z: _head.z, y: _head.y },
          { ...monster, y: this.state.crew.options.monster === 'crawler' ? 0.52 : 1.5 },
        );
      ghosts.monster = markGhost(
        ghosts.monster,
        sighted,
        monster ?? { x: 0, z: 0 },
        this.monster?.model.rotation.y ?? 0,
        this.state.time,
      );
      this.hearing = monster && this.nav ? acousticField(this.nav, monster, 24) : new Map();
      // Was das Monster hört, rechnet das Hörmodell der Karte (`audio/hearing.ts`):
      // die eigenen Schritte nach Tempo, dazu das Hantieren aus `ShipExperience`.
      const sources = this.noiseQueue.splice(0);
      const loudness = stepLoudness(speed, !bot && ctx.rig.crouch > 0.15);
      if (loudness > 0) sources.push({ at: { x: _head.x, z: _head.z }, loudness });
      this.heard =
        monster && sources.length
          ? hearNoises(
              this.hearingModel,
              this.mapSnapshot(),
              monster,
              sources,
              this.tuning.monster.hearing,
            )
          : [];
    }
    stepThreat(
      this.state.crew,
      dt,
      {
        player: { x: _head.x, z: _head.z },
        monster,
        noises: this.heard,
        crouched: !bot && ctx.rig.crouch > 0.15,
        flashlight: bot ? !this.state.crew.hidden : (this.experience?.flashlightActive ?? false),
        inView:
          !!monster && inView(monster, this.monster?.model.rotation.y ?? 0, _head, 24, MONSTER_FOV),
        lineOfSight: this.monsterSeesPlayer,
        insideStation: !!roomAt(this.spec, Math.floor(_head.x / TILE), Math.floor(_head.z / TILE)),
      },
      // **Die Gewichte gehören auch hierher.** Ohne sie rechnete das Headset
      // mit dem rohen Kreaturprofil, während 2D und Training mit
      // `profil × tuning` rechneten — dasselbe Monster hatte in der Brille ein
      // zweieinhalbmal längeres Gedächtnis als das, gegen das es abgestimmt
      // wurde (`threat.stepThreat`).
      { vision: this.tuning.monster.vision, memory: this.tuning.monster.memory },
    );
    if (this.state.crew.options.test && !this.state.crew.simulation) {
      this.state.monsterOn = false;
      this.state.monster = null;
      this.state.crew.hp = 3;
      if (this.monster) this.removeMonster();
      return;
    }
    if (!this.monster || !this.state.monsterOn || this.state.phase !== 'running') return;
    // Im Schacht: nichts hören, nicht laufen, nicht treffen — nur fahren
    // (`vents/npcVentRide.ts`). Ein Spieler am Steuer steigt selbst aus.
    const rider = this.monsterRider();
    if (this.ventRide.busy && this.npcRide && rider)
      this.npcRide.step(dt, rider, this.monsterDriver?.active() !== true);
    else this.stepRoutine(dt, _head);
    // Das Signal für alle Leser von `venting`: Modell, Klotz, Bot-Wahrnehmung,
    // Karte, Treffer — gesetzt nach `stepVitals`, das jedes Bild `dt` abzieht.
    this.state.crew.venting = this.npcRide?.venting() ?? 0;
    this.ventArt?.setOpen(this.ventRide.openFlap?.id ?? null);
  }

  private clearSight(
    from: { x: number; z: number; y?: number },
    to: { x: number; z: number; y?: number },
  ): boolean {
    const physics = this.physics;
    if (!physics) return false;
    const dx = to.x - from.x,
      dz = to.z - from.z;
    const dy = (to.y ?? 1.5) - (from.y ?? 1.5);
    const distance = Math.hypot(dx, dy, dz);
    if (distance < 0.04) return true;
    const ray = new physics.rapier.Ray(
      { x: from.x, y: from.y ?? 1.5, z: from.z },
      { x: dx / distance, y: dy / distance, z: dz / distance },
    );
    return !physics.world.castRay(
      ray,
      distance - 0.03,
      true,
      physics.rapier.QueryFilterFlags.ONLY_FIXED,
    );
  }

  /** Fixed-collider ray: doors, walls and tall modules hide the player. */
  private monsterLineOfSight(): boolean {
    const physics = this.physics;
    const monster = this.monster;
    const ctx = this.context;
    if (!physics || !monster || !ctx) return false;
    const bot = this.state.crew.simulation ? this.experience?.botPose : null;
    if (bot) _head.set(bot.x, 1.65, bot.z);
    else ctx.rig.getHeadPosition(_head);
    monster.feet(_feet);
    const eye = this.state.crew.options.monster === 'crawler' ? 0.52 : 1.5;
    const dx = _head.x - _feet.x;
    const dy = _head.y - (Math.max(0, _feet.y) + eye);
    const dz = _head.z - _feet.z;
    const distance = Math.hypot(dx, dy, dz);
    if (distance < 0.04) return true;
    const ray = new physics.rapier.Ray(
      { x: _feet.x, y: Math.max(0, _feet.y) + eye, z: _feet.z },
      { x: dx / distance, y: dy / distance, z: dz / distance },
    );
    return !physics.world.castRay(
      ray,
      distance - 0.03,
      true,
      physics.rapier.QueryFilterFlags.ONLY_FIXED,
    );
  }

  private manualDoor(id: string): void {
    if (!this.isHost || this.context?.role !== 'vr' || this.state.phase !== 'running') return;
    const door = this.spec.doors.find((d) => d.id === id);
    const trainingDoor = this.state.crew.options.test && id === TRAINING_DOOR.id;
    if (!door && !trainingDoor) return;
    // Gewollt gesperrt ist immer nur eine Tür — auch vor Ort (`rules/doorLocks.ts`).
    const out = toggleLock(this.locks, this.state.shut, id, this.state.time);
    this.state.shut = out.shut;
    // Eine Tür, die gerade erst frei geworden ist, lässt sich nicht sofort
    // wieder sperren. Wortlos wäre das ein kaputter Riegel — also sagen wir es.
    if (out.blocked)
      this.announce('Der Riegel ist noch warm. Diese Tür bleibt einen Moment offen.');
  }

  /** Ein Schalter der Tafel, angewendet beim Gastgeber. */
  private applyFlip(id: string, on: boolean): void {
    const entry = this.spec.switches.find((one) => one.id === id);
    if (!entry) return;

    // Licht: höchstens zwei Räume gleichzeitig, und die dritte Lampe macht die
    // älteste aus — derselbe Handel wie bei dem einen Riegel (`rules/lamps.ts`).
    if (entry.kind === 'light') {
      if (on === this.state.lit.includes(entry.target)) return;
      const out = switchLamp(this.lampBook, this.state.lit, entry.target, this.state.time);
      this.state.lit = out.lit;
      if (out.dropped) this.lampSound(out.dropped);
      return;
    }

    if (entry.kind === 'radio') {
      const list = this.state.loud;
      const at = list.indexOf(entry.target);
      if (on && at < 0) list.push(entry.target);
      if (!on && at >= 0) list.splice(at, 1);
      return;
    }
    // Türen: `on` heißt offen, und die Liste führt die geschlossenen. Gewollt
    // gesperrt ist immer nur eine — die vorherige geht dabei auf; eine
    // zugefallene darf die Tafel jederzeit freigeben (`rules/doorLocks.ts`).
    this.state.shut = on
      ? releaseLock(this.locks, this.state.shut, entry.target, this.state.time)
      : chooseLock(this.locks, this.state.shut, entry.target, this.state.time);
  }

  /** Vom Hacker aus: bitten, nicht selbst tun. Gerechnet wird beim Gastgeber. */
  private flip(id: string, on: boolean): void {
    if (this.isHost) this.applyFlip(id, on);
    else this.context?.net.emit(HAUNT_CHANNEL, flipMessage(id, on));
  }

  /**
   * Sliding doors change only their collider and navigation wall. The station
   * hull stays allocated; unchanged snapshots do not trigger graph updates.
   */
  /**
   * **Wer gerade in einem Durchgang stehen könnte** — Techniker, Monster,
   * Drohne, der Modelltechniker und die Mitspieler übers Netz, in Metern.
   *
   * Zwei Stellen brauchen dieselbe Liste, und sie müssen sich einig sein: Die
   * Schiebetür hält den Durchgang auf, solange jemand darin steht
   * (`AutomaticDoors`), und der Spuk sucht sich eine Tür, in der niemand steht
   * (`haunt.slammable`). Eine Liste — sonst hält die eine auf, was die andere
   * zuschlägt.
   */
  private doorOccupants(): Array<{ x: number; y?: number; z: number }> {
    const occupants: Array<{ x: number; y?: number; z: number }> = [];
    if (this.context?.role === 'vr') occupants.push(this.context.rig.getHeadPosition(_head));
    if (this.state.monster) occupants.push(this.state.monster);
    occupants.push(this.drone);
    const bot = this.experience?.botPosition;
    if (bot) occupants.push(bot);
    for (const peer of this.context?.net.peers.values() ?? []) {
      if (
        peer.world === 'haunting' &&
        peer.pose &&
        (peer.role === 'vr' || clock() - (this.technicians.get(peer.id) ?? -Infinity) < 3000)
      )
        occupants.push({ x: peer.pose.head[0], y: peer.pose.head[1], z: peer.pose.head[2] });
    }
    return occupants;
  }

  private applyDoors(dt: number): void {
    const now = this.state.shut.join(',') + `/test:${this.state.crew.options.test}`;
    const before = this.builtDoors;
    this.builtDoors = now;
    const shut = new Set(this.state.shut);
    const doors = this.state.crew.options.test
      ? [...this.spec.doors, TRAINING_DOOR]
      : this.spec.doors;
    const occupants = this.doorOccupants();
    for (const door of doors) {
      const at = doorEdge(door);
      const open = this.automaticDoors.step(door.id, at, shut.has(door.id), occupants, dt);
      this.setSlidingGridDoor(door.x, door.z, door.dir, open);
    }
    if (now !== before) this.hearSlam(before, shut);
  }

  /**
   * **Eine Tür, die zufällt, macht ein Geräusch — aber nur im Haus.**
   *
   * In der Einsatzzentrale bleibt es still, und das ist keine Sparsamkeit: Der Hacker legt
   * seine Schalter blind um, und ein Schlag im Lautsprecher sagte ihm, dass
   * gerade *irgendwo* eine Tür zugefallen ist — geschenkt und ohne Zuruf.
   * Genau das ist die Sorte Auskunft, die diese Welt keiner Station umsonst
   * gibt (`stations.ts`). Der im Haus dagegen soll es hören: Es ist das
   * Einzige, was ihm sagt, dass das Monster eben an einer Tür vorbeigekommen
   * ist, ohne dass er es gesehen hat.
   *
   * Beim allerersten Aufbau schweigt es (`builtDoors` steht dann auf `?`):
   * Wer in eine laufende Runde kommt, in der schon eine Tür zu ist, hat sie
   * nicht zufallen hören.
   */
  private hearSlam(before: string, shut: ReadonlySet<string>): void {
    if (before === '?' || this.context?.role !== 'vr') return;
    const had = new Set(before ? before.split(',') : []);
    for (const id of shut) {
      if (id === TRAINING_DOOR.id) continue;
      if (had.has(id)) continue;
      playSlam();
      return;
    }
  }

  /**
   * **Der Spuk: bei allen gerechnet, nur beim Gastgeber angewendet.**
   *
   * Gerechnet wird er überall, weil aus ihm das Flackern kommt und ein Zucken,
   * das jedes Gerät für sich aus derselben Monsterposition ableitet, keine
   * einzige Nachricht kostet. Angewendet — Licht aus, Tür zu — wird er beim
   * Gastgeber, und von dort kommt er als ganz gewöhnlicher Stand zurück: Für
   * den Hacker sieht ein Licht, das das Monster ausgemacht hat, aus wie eines,
   * das jemand ausgemacht hat. Genau so soll es sein.
   */
  private stepSpook(dt: number): void {
    const out = stepHaunt(
      this.spook,
      {
        spec: this.spec,
        monster: this.state.monsterOn ? this.state.monster : null,
        lit: this.state.lit,
        shut: this.state.shut,
        occupants: this.doorOccupants(),
      },
      dt,
    );
    this.spook = out.spook;
    if (!this.isHost) return;

    // Auch der Spuk geht durch die Buchführung: Eine Lampe, die das Monster
    // ausmacht, ist danach keine der zwei geschalteten mehr (`rules/lamps.ts`).
    if (out.lightOut && this.state.lit.includes(out.lightOut))
      this.state.lit = lampOut(this.lampBook, this.state.lit, out.lightOut);
    if (out.doorShut && !this.state.shut.includes(out.doorShut))
      this.state.shut = slamDoor(this.locks, this.state.shut, out.doorShut, this.state.time);
  }

  /**
   * **Das Sirren einer Lampe**, die flackert oder gerade ausgegangen ist —
   * dort, wo sie hängt, und nicht am Ohr (`rules/lamps.ts`). Die 2D-Geräte
   * hören es über den Stand: Für sie ist ein Raum, der dunkel wird, ein Raum,
   * der dunkel wird.
   */
  private lampSound(roomId: string): void {
    const lamp = this.lamps.get(roomId);
    if (!lamp) return;
    this.experience?.lampCue({ x: lamp.at.x, z: lamp.at.z });
  }

  /**
   * Die Lampen, wie sie **jetzt** brennen — samt dem Zucken der einen, in
   * deren Zimmer das Monster steht (`haunt.flickerLevel`).
   *
   * Das Glas geht denselben Weg wie das Licht: Eine Kugel, die in voller
   * Helligkeit weiterleuchtet, während der Raum darunter blinkt, sieht aus
   * wie ein Fehler in der Beleuchtung und nicht wie eine Lampe, die gleich
   * ausgeht.
   */
  private applyLights(dt = 1): void {
    const bright = this.state.crew.options.test && this.state.crew.options.bright;
    this.context?.rig.getHeadPosition(_head);
    if (this.ui?.station === 'drone' && this.droneBody) _head.copy(this.droneBody.position);
    const tileX = Math.floor(_head.x / TILE);
    const tileZ = Math.floor(_head.z / TILE);
    const viewRoom = roomAt(this.spec, tileX, tileZ);
    const poweredDeck =
      onApron(tileX, tileZ) || (!!viewRoom && this.state.lit.includes(viewRoom.id));
    const lighting = stationLighting(
      this.state.crew,
      !!trainingRoomAt(_head.x, _head.z),
      poweredDeck,
    );
    // In der Bot-Runde entscheidet die Schalttafel und nicht die Runde: Wer
    // zuschaut, will dieselbe Szene einmal hell und einmal im Alarmlicht
    // sehen (`botLighting.ts`).
    const deck = this.state.crew.simulation ? this.botLighting : null;
    if (deck) {
      lighting.ambient = deck.ambient;
      lighting.lamps = deck.lamps;
    }
    // Notlicht ist eine halbe Lampe und keine andere: dieselben Leuchten,
    // gedimmt. Ein eigener Lampensatz dafür wäre ein zweiter Satz Fehler.
    const lampScale = deck?.emergency ? 0.42 : 1;
    if (this.testLight)
      this.testLight.intensity = THREE.MathUtils.damp(
        this.testLight.intensity,
        lighting.ambient,
        8,
        dt,
      );
    if (this.commandLight) this.commandLight.intensity = lighting.command;
    // **Im Test und in der Bot-Runde ist alles hell**, und weil es nur zwei
    // Punktleuchten gibt, brennt dort nur die des eigenen Raums. In der Mission
    // ist das nicht mehr nötig: Dort brennen ohnehin höchstens zwei Lampen
    // (`rules/lamps.ts`), und dass eine davon zwei Türen weiter leuchtet, ist
    // genau die Auskunft, für die der Hacker sie angemacht hat.
    const wideOpen = bright || this.state.crew.simulation;
    const active = [...this.lamps.entries()].filter(
      ([id]) => lighting.lamps && (wideOpen ? id === viewRoom?.id : this.state.lit.includes(id)),
    );
    active.sort((a, b) => a[1].at.distanceToSquared(_head) - b[1].at.distanceToSquared(_head));
    for (let i = 0; i < this.lampPool.length; i++) {
      const light = this.lampPool[i]!;
      const entry = active[i];
      light.intensity = 0;
      if (entry) {
        const [id, lamp] = entry;
        // Zwei Arten zu zucken, und die dunklere gewinnt: das Monster im Raum
        // (`haunt.ts`) und die Lampe, deren Zeit abläuft (`rules/lamps.ts`).
        const haunted = !bright && id === this.spook.room ? flickerLevel(this.spook.since) : 1;
        const glow = Math.min(haunted, lampGlow(this.lampBook, id, this.state.time));
        light.position.copy(lamp.at);
        light.color.setHex(lamp.color);
        light.intensity = LAMP_ON * glow * lampScale;
      }
    }
    for (const [id, lamp] of this.lamps)
      lamp.glass.material.color.lerpColors(
        _lampOff,
        _lampOn,
        !lighting.dark && (deck ? deck.lamps : bright || this.state.lit.includes(id))
          ? lampGlow(this.lampBook, id, this.state.time)
          : 0,
      );
    this.applyBeacons(deck?.alarm ?? this.state.phase === 'lost');
  }

  /**
   * **Die roten Drehleuchten in den Gängen.**
   *
   * Jede hat ihren eigenen Versatz — zwölf Spiegel, die im Gleichtakt drehen,
   * sehen aus wie eine Animation und nicht wie eine Station. Die Rechnung
   * dahinter steht in `botLighting.ts`, damit sie geprüft ist: Ein Winkel,
   * der immer weiterwächst, bleibt nach einer Stunde stehen.
   */
  private applyBeacons(alarm: boolean): void {
    if (!this.beacons.length) return;
    for (const beacon of this.beacons) {
      beacon.root.visible = alarm;
      if (!alarm) continue;
      beacon.mirror.rotation.y = beaconAngle(this.state.time, beacon.offset);
      const glow = 0.35 + alarmPulse(this.state.time, beacon.offset) * 0.65;
      beacon.lamp.material.color.copy(_beaconOff).lerp(_beaconOn, glow);
      beacon.mirror.material.color.copy(_beaconOff).lerp(_beaconOn, glow);
    }
  }

  /** Hide detail meshes in rooms that no open doorway can currently reveal. */
  private cullRoomArt(dt: number, ctx: WorldContext): void {
    const full = !!this.ui || this.state.crew.simulation;
    ctx.rig.getHeadPosition(_head);
    const camera = ctx.renderer.xr.isPresenting ? ctx.renderer.xr.getCamera() : ctx.camera;
    camera.updateWorldMatrix(true, false);
    camera.getWorldQuaternion(this.cullRotation);
    this.cullTimer -= dt;
    const doors = this.state.shut.join(',');
    if (
      !full &&
      this.cullTimer > 0 &&
      doors === this.culledDoors &&
      this.culledHead.distanceToSquared(_head) < 0.25 &&
      Math.abs(this.culledRotation.dot(this.cullRotation)) > 0.9995
    )
      return;
    this.cullTimer = 0.2;
    this.culledDoors = doors;
    this.culledHead.copy(_head);
    this.culledRotation.copy(this.cullRotation);
    this.roomFrustum.setFromProjectionMatrix(
      this.roomProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    );
    const visible = full
      ? null
      : visibleStationRooms(this.spec, _head, this.state.shut, (door) => {
          const edge = doorEdge(door);
          const half = PLAN_DOOR_W / 2;
          this.doorwayBounds.min.set(
            edge.x - (edge.alongX ? half : 0.1),
            0,
            edge.z - (edge.alongX ? 0.1 : half),
          );
          this.doorwayBounds.max.set(
            edge.x + (edge.alongX ? half : 0.1),
            PLAN_DOOR_H,
            edge.z + (edge.alongX ? 0.1 : half),
          );
          // A generous margin prevents edge popping while turning in a headset.
          this.doorwayBounds.expandByScalar(0.7);
          return this.roomFrustum.intersectsBox(this.doorwayBounds);
        });
    for (const [id, group] of this.roomArt) group.visible = !visible || visible.has(id);
    this.experience?.setVisibleRooms(visible);
  }

  // --- die Drohne -----------------------------------------------------------

  /**
   * **Die Drohne startet draußen, über ihrem Ring auf dem Vorplatz.**
   *
   * Eine Weile parkte sie im Zimmer hinter der Haustür, weil es vor dem Haus
   * keine Kacheln gab und die Wegsuche mit einem Startpunkt außerhalb des
   * Graphen nichts anfängt. Seit der Vorplatz zum Gitter gehört (`house.APRON`)
   * ist das andersherum richtig: Der Pilot setzt sich hin und sieht die Einsatzzentrale,
   * den Vorplatz und die Hauswand mit der Tür darin — die erste Ansage, die in der
   * Einsatzzentrale fällt. Vorher sah er ein dunkles Zimmer und wusste weder, wo er ist,
   * noch wohin.
   */
  private parkDrone(): void {
    const body = this.droneBody;
    if (!body) return;
    // **Mit dem Rücken zur Einsatzzentrale und dem Haus im Bild.** Der Gierwinkel ist
    // `atan2(dx, dz)`, und nach Norden ist das π — wer hier eine Null
    // hinschreibt, setzt den Piloten in seinem ersten Bild vor eine
    // Tischplatte.
    const yaw = Math.PI;
    this.dronePose = { x: (DRONE_HOME.x + 0.5) * TILE, z: (DRONE_HOME.z + 0.5) * TILE, yaw };
    body.position.set(this.dronePose.x, DRONE_Y, this.dronePose.z);
    body.rotation.y = yaw;
    this.droneLook = 0;
    this.dronePitch = 0;
    if (this.droneHead) this.droneHead.rotation.x = 0;
    this.drone = {
      x: this.dronePose.x,
      z: this.dronePose.z,
      yaw,
      pitch: 0,
      target: '',
      hop: 0,
      lamp: this.drone.lamp,
      light: this.drone.light,
    };
    this.droneRoute = { tiles: [], complete: true, grounded: true };
    this.droneSeen.clear();
    this.droneSeen.add(VAN_ID);
  }

  /**
   * **Ein Zimmer antippen heißt: such dir einen Weg dorthin.**
   *
   * Nicht „flieg dorthin". Der Unterschied ist der ganze Rest des Spiels — was
   * dabei herauskommt, hängt an den Türen, und die gehören dem VR-Spieler und
   * dem Hacker (`droneRoute.ts`). Ein zweites Antippen desselben Zimmers ruft
   * sie zurück auf der Stelle: Ein Knopf, der nur eine Richtung kennt, ist auf
   * einem Telefon ein Knopf, den man versehentlich drückt und nicht mehr los
   * wird.
   */
  private setDroneTarget(roomId: string): void {
    if (this.drone.target === roomId) {
      // **Abbrechen geht immer.** Die Sperre steht gegen das nächste Zimmer,
      // nicht gegen die Umkehr — ein Knopf, der eine falsche Eingabe eine ganze
      // Sperre lang festhält, ist auf einem Telefon eine Strafe fürs
      // Danebentippen.
      this.drone.target = '';
      this.droneRoute = { tiles: [], complete: true, grounded: true };
      this.droneThink = 0;
      this.context?.net.emit(HAUNT_CHANNEL, droneMessage(this.drone));
      return;
    }
    // Und sie fliegt nicht dorthin, wo sie schon schwebt: Das kostete eine
    // Sperre für einen Flug von null Metern.
    if (this.drone.hop > 0 || (!this.drone.target && this.droneRoom() === roomId)) return;
    this.drone.target = roomId;
    this.drone.hop = HOP_TIME;
    // **Beim Losfliegen schaut sie wieder nach vorn** — und nur dann.
    //
    // Umsehen dreht seit Neuestem ganz herum, und genau deshalb braucht der
    // Start diese Zeile: Wer gerade nach hinten geschaut hat und dann ein
    // Zimmer antippt, flöge sonst rückwärts los und sähe von seinem eigenen
    // Flug die Wand, die hinter ihm wegzieht. Zurückgestellt wird **nur** hier
    // und nicht laufend: Ein Blick, den die Welt jede Sekunde wieder
    // geradezieht, ist kein Blick, sondern ein Gummiband — sobald sie fliegt,
    // gehört der Kopf wieder dem Piloten.
    this.turnDroneView(0, 0);
    this.droneRoute = { tiles: [], complete: true, grounded: true };
    this.droneThink = 0;
    this.context?.net.emit(HAUNT_CHANNEL, droneMessage(this.drone));
  }

  /** Der Scheinwerfer — vom Piloten geschaltet, bei allen im Haus zu sehen. */
  private toggleDroneLight(): void {
    // Aus geht immer; an nur, wenn wirklich noch etwas in der Ladung steckt.
    if (!this.drone.light && this.drone.lamp < LAMP_MIN) return;
    this.drone.light = !this.drone.light;
    this.applyDroneLight();
    playSwitch(this.drone.light);
    this.context?.net.emit(HAUNT_CHANNEL, droneMessage(this.drone));
  }

  /**
   * **Umsehen, ohne umzukehren** — in beiden Achsen.
   *
   * Was der Pilot wischt, ist ihr Kopf und nicht ihr Kurs: Die Bahn kommt
   * weiter aus der Wegsuche. Waagerecht dreht sich dabei der ganze Rumpf
   * (`faceDrone`), senkrecht nur die Wiege mit Kamera, Kuppel und
   * Scheinwerfer — ein Kopter, der sich zum Hochschauen auf den Rücken legt,
   * sähe im Haus nach Absturz aus.
   *
   * **Waagerecht geht es ganz herum** (`wrapAngle`): Der alte Anschlag bei gut
   * zwei Dritteln einer halben Umdrehung war als Schutz gegen den verlorenen
   * Horizont gedacht und war in Wahrheit eine Drohne, die sich nicht umsehen
   * kann — wer hören will, ob hinter ihr etwas steht, dreht sich um. Zurück
   * geradeaus kommt der Pilot mit einem Tipp auf den Blickstock, und solange
   * sein Blick daneben steht, leuchtet der. Senkrecht bleibt der Anschlag
   * (`TILT_MOST`), denn über den Scheitel hinaus steht das Bild auf dem Kopf.
   */
  private turnDroneView(yaw: number, pitch: number): void {
    this.droneLook = wrapAngle(yaw);
    this.dronePitch = Math.min(TILT_MOST, Math.max(-TILT_MOST, pitch));
    this.faceDrone();
  }

  /**
   * **Den Rumpf dorthin drehen, wo der Pilot hinsieht** — Flugrichtung plus
   * Blickwinkel, und die Kamera hängt als Kind daran.
   *
   * Nur beim Piloten: Bei allen anderen ist der Winkel eine angesagte Zahl, in
   * die sich der Rumpf hineindreht (`turnDroneBody`). Zwei Stellen, die
   * denselben Rumpf drehen, drehten ihn gegeneinander.
   */
  private faceDrone(): void {
    const body = this.droneBody;
    if (!body || !this.piloting) return;
    body.rotation.y = this.dronePose.yaw + this.droneLook;
    this.drone.yaw = body.rotation.y;
    // Nach oben sehen heißt: die Wiege *gegen* die X-Achse kippen. Eine
    // Drehung um +X legt die Blickachse nach unten — das Vorzeichen sieht man
    // einer Zahl nicht an, im Bild dafür sofort.
    if (this.droneHead) this.droneHead.rotation.x = -this.dronePitch;
    this.drone.pitch = this.dronePitch;
  }

  /**
   * **Bei allen anderen dreht sich die Drohne hin, statt zu springen.**
   *
   * Der Winkel kommt zehnmal je Sekunde über die Leitung; direkt gesetzt wäre
   * das ein Ruckeln in zehn Stufen, und ausgerechnet der Lichtkegel im Haus
   * würde dabei springen. Der Nachlauf ist bildratenunabhängig — bei 45 Hz
   * dieselbe Zeit wie bei 120 — und nimmt immer den kürzeren Bogen: Ohne das
   * dreht sich eine Drohne, die über den Vollkreis läuft, einmal komplett
   * andersherum.
   */
  private turnDroneBody(dt: number): void {
    const body = this.droneBody;
    if (!body) return;
    const step = 1 - Math.exp(-Math.max(0, dt) * DRONE_TURN);
    body.position.x += (this.drone.x - body.position.x) * step;
    body.position.z += (this.drone.z - body.position.z) * step;
    body.position.y = DRONE_Y - Math.abs(Math.sin(this.state.time * 1.7)) * 0.025;
    const gap = Math.atan2(
      Math.sin(this.drone.yaw - body.rotation.y),
      Math.cos(this.drone.yaw - body.rotation.y),
    );
    body.rotation.y += gap * step;
    // Die Wiege braucht den kürzeren Bogen nicht: Sie kippt nur zwischen zwei
    // Anschlägen und kommt nie über den Vollkreis.
    const head = this.droneHead;
    if (head) head.rotation.x += (-this.drone.pitch - head.rotation.x) * step;
  }

  private applyDroneLight(): void {
    const on =
      this.drone.light && this.drone.lamp > 0 && !stationLighting(this.state.crew, false).dark;
    // Nur bei Wechsel: Diese Zeile läuft in jedem Bild, und eine Farbe, die
    // sechzigmal je Sekunde auf denselben Wert gesetzt wird, ist sechzigmal
    // je Sekunde ein `needsUpdate` an einem Material, das sich nicht geändert
    // hat.
    if (on === this.droneLit) return;
    this.droneLit = on;
    if (this.droneLamp) this.droneLamp.intensity = on ? 7 : 0;
    if (this.droneGlass) this.droneGlass.color.setHex(on ? 0xdff2ff : 0x123024);
  }

  /**
   * **Geflogen wird auf Zimmer und nicht auf Punkte.**
   *
   * Der Pilot tippt auf die Karte, die Drohne sucht sich den Weg — mit einem
   * Profil, das über Möbel hinwegfliegt und **keine Tür aufmacht**. Wohin sie
   * kommt, hängt damit daran, was der VR-Spieler und der Hacker offen gelassen
   * haben: Abhängigkeit in beide Richtungen, ohne eine einzige Sonderregel.
   */
  private flyDrone(dt: number): void {
    const body = this.droneBody;
    if (!body) return;
    // **Sperre und Ladung laufen bei allen mit**, nicht nur beim Piloten. Sonst
    // stünden beide Uhren still, sobald niemand am Gerät sitzt — und der
    // Nächste, der sich hinsetzt, erbte eine Sperre von vor drei Minuten und
    // eine Lampe, die sich in der Zwischenzeit nicht erholt hat.
    this.drone.hop = Math.max(0, this.drone.hop - dt);
    this.drone.lamp = lampAfter(this.drone.lamp, dt, this.drone.light, this.droneRoom() === VAN_ID);

    const mine = seatOf(this.currentClaims(), this.context?.net.localId ?? '') === 'drone';
    if (!mine) {
      // Bei allen anderen ist sie nur eine angesagte Stelle — die Bahn rechnet
      // der Pilot, und zweimal gerechnet käme sie zweimal woanders an.
      this.piloting = false;
      this.applyDroneLight();
      this.turnDroneBody(dt);
      return;
    }

    if (!this.piloting) {
      // **Wer sich gerade erst hingesetzt hat, übernimmt sie da, wo sie
      // steht.** Die eigene Bahn steht noch am Hangar aus `parkDrone`; ohne
      // diese Zeile springt die Drohne im ersten Bild eines Pilotenwechsels
      // zurück ins Zimmer hinter der Haustür — und der Vorgänger sieht es.
      this.piloting = true;
      this.dronePose = { x: this.drone.x, z: this.drone.z, yaw: body.rotation.y };
      // **Wer sich hinsetzt, schaut geradeaus.** Der Winkel des Vorgängers
      // steckt schon in der Drehung des Rumpfes, die hier gerade zur
      // Flugrichtung erklärt wird; ein zweites Mal daraufgerechnet stünde die
      // Drohne quer, und der Neue hielte sein erstes Bild für kaputt. Die
      // Wiege dagegen steht absolut — ihren Winkel übernimmt er, statt ihn zu
      // vergessen, sonst ruckte das Bild beim Platzwechsel waagerecht.
      this.droneLook = 0;
      this.dronePitch = this.drone.pitch;
      this.droneRoute = { tiles: [], complete: true, grounded: true };
      this.droneThink = 0;
    }

    if (this.drone.target) this.stepDrone(dt);
    this.spendLamp();

    body.position.set(this.dronePose.x, DRONE_Y, this.dronePose.z);
    this.drone.x = this.dronePose.x;
    this.drone.z = this.dronePose.z;
    // Erst die Bahn, dann der Blick darauf: `faceDrone` rechnet beides
    // zusammen und schreibt den Winkel in die Ansage.
    this.faceDrone();
    const yawRate = wrapAngle(this.dronePose.yaw - this.droneVisualYaw) / Math.max(dt, 0.001);
    this.droneVisualYaw = this.dronePose.yaw;
    body.rotation.z = THREE.MathUtils.damp(
      body.rotation.z,
      Math.max(-0.09, Math.min(0.09, -yawRate * 0.035)),
      5,
      dt,
    );
    body.position.y = DRONE_Y - Math.abs(Math.sin(this.state.time * 1.7)) * 0.025;
    this.noteDroneRoom();

    this.droneTimer -= dt;
    if (this.droneTimer <= 0) {
      this.droneTimer = DRONE_RATE;
      this.context?.net.emit(HAUNT_CHANNEL, droneMessage(this.drone));
    }
  }

  /**
   * Ein Stück des Weges — und der Weg kommt aus dem Navigationsgraphen
   * (`droneRoute.ts`, mit Test, der einen Weg wirklich abfliegt).
   *
   * **Neu gesucht wird zweimal je Sekunde**, nicht nur beim Antippen: Der
   * Hacker macht Türen zu, während sie unterwegs ist, und eine Drohne, die
   * ihren Weg beim Start ein für alle Mal berechnet hat, fliegt danach durch
   * eine geschlossene Tür. Billig ist das, weil ein Haus achtundvierzig
   * Kacheln hat.
   *
   * Findet der Graph keinen Weg, bleibt der beste Teilweg übrig — sie fliegt
   * also bis vor die verschlossene Tür und bleibt dort. Genau das soll der
   * Pilot sehen: nicht „Fehler", sondern *hier ist zu*, und die Station sagt
   * es ihm auch mit Worten (`droneStatus`).
   */
  /**
   * **Die Kachel, auf die sie gerade zufliegt** — Zimmermitte oder Hangar.
   *
   * Die Einsatzzentrale ist hier ein Ziel wie jedes andere und kein Sonderfall im Flug:
   * Was sie unterscheidet, ist nur, dass ihre Kachel nicht aus der
   * Zimmerliste kommt. Die Wegsuche dahinter ist dieselbe — samt der Haustür,
   * die zu sein kann.
   */
  private droneGoal(): { x: number; z: number } | null {
    if (this.drone.target === VAN_ID) return DRONE_HOME;
    const room = roomOf(this.spec, this.drone.target);
    return room ? roomCentre(room) : null;
  }

  private stepDrone(dt: number): void {
    const graph = this.travelGraph();
    const goal = this.droneGoal();
    if (!graph || !goal) return;

    this.droneThink -= dt;
    if (this.droneThink <= 0 || this.droneGraphVersion !== graph.version) {
      this.droneThink = this.droneRoute.complete ? 30 : 0.5;
      this.droneGraphVersion = graph.version;
      this.droneRoute = stationRoute(
        this.spec,
        graph,
        this.dronePose,
        tileKey(goal.x, goal.z, 0),
        0.22,
        DRONE_Y - DRONE_CAP,
      );
      if (!this.droneRoute.grounded) {
        // Kein Startpunkt: Sie schwebt neben dem Gitter — dorthin kommt sie
        // nur, wenn jemand am Haus etwas geändert hat, während sie flog.
        this.parkDrone();
        return;
      }
    }

    if (!stepAlong(this.dronePose, this.droneRoute, dt)) {
      // Angekommen — oder vor einer Tür, die zu ist. Beides heißt: Sie steht.
      // Das Ziel bleibt stehen, damit der Pilot in der Station sieht, wohin
      // sie wollte, statt eine Anzeige zu bekommen, die sich selbst löscht.
      if (this.droneRoute.complete) this.drone.target = '';
    }
  }

  /**
   * **Wenn die Ladung alle ist, geht das Licht von selbst aus** — und zwar
   * beim Piloten, damit es alle mitbekommen.
   *
   * Heruntergezählt hat `flyDrone` schon, bei jedem in der Einsatzzentrale. Hier steht nur der
   * Schluss daraus: Eine Lampe, die bei null einfach weiterbrennt, wäre eine
   * Anzeige und keine Ladung — und der Pilot, der sie danach ausschaltet,
   * bekäme einen Knopf, der nichts tut.
   */
  private spendLamp(): void {
    if (!this.drone.light || this.drone.lamp > 0) return;
    this.drone.light = false;
    this.applyDroneLight();
    playSwitch(false);
    this.context?.net.emit(HAUNT_CHANNEL, droneMessage(this.drone));
  }

  /** In welchem Zimmer sie gerade ist — und dass sie dort einmal war. */
  private droneRoom(): string {
    const tile = tileAt(this.drone.x, this.drone.z);
    const x = keyX(tile);
    const z = keyZ(tile);
    const room = roomAt(this.spec, x, z);
    if (room) return room.id;
    // Der Vorplatz ist für den Piloten ein Ort wie ein Zimmer: Dort steht die
    // Einsatzzentrale, dort lädt sie, und dorthin schickt er sie zurück.
    return onApron(x, z) ? VAN_ID : '';
  }

  private noteDroneRoom(): void {
    const room = this.droneRoom();
    if (room) this.droneSeen.add(room);
  }

  /**
   * **Was der Pilot über seinen Flug erfährt.**
   *
   * Nur so viel, wie eine Drohne wirklich weiß: wo sie ist, wie weit sie noch
   * zu fliegen hat und ob sie überhaupt hinkommt. Kein Grundriss und keine
   * Abzweigung — die gehören dem Archivar. Die eine Zeile, auf die es
   * ankommt, ist `blocked`: Sie ist die Stelle, an der aus einer Wegsuche eine
   * Ansage an den Rest der Einsatzzentrale wird — „irgendwo dazwischen ist zu, macht
   * auf".
   */
  private droneStatus(): DroneStatus {
    const here = this.droneRoom();
    if (!this.drone.target) return { kind: 'idle', here, metres: 0 };
    const metres = routeLength(this.dronePose, this.droneRoute);
    if (!this.droneRoute.complete) return { kind: 'blocked', here, metres };
    return { kind: 'flying', here, metres };
  }

  // --- die Einsatzzentrale ---------------------------------------------------

  /** Sich an ein Gerät setzen. Wer schon länger dort sitzt, bleibt sitzen. */
  private sit(station: StationId): void {
    if (this.wanted === station) return;
    this.wanted = station;
    this.seatedAt = clock();
    const ctx = this.context;
    if (!ctx) return;
    this.claims.set(ctx.net.localId, {
      id: ctx.net.localId,
      station,
      seniority: 0,
      heardAt: clock(),
    });
    ctx.net.emit(HAUNT_CHANNEL, claimMessage(station, 0));
  }

  // --- gezeichnet wird je Station verschieden --------------------------------

  /**
   * **Zwei Sichten kommen aus der Welt, zwei aus dem Grundriss.**
   *
   * Drohne und Archiv brauchen Geometrie — man soll ein Klavier von einer
   * Werkbank unterscheiden. Der Späher darf sie ausdrücklich *nicht* haben,
   * und die Schalttafel hat mit dem Haus gar nichts zu tun; beide zeichnet die
   * Oberfläche selbst (`stationUi.ts`). Deshalb steht hier nur die Hälfte.
   *
   * **Und nicht in jedem Bild.** Das Archiv ist ein Standbild — es ändert sich,
   * wenn jemand ein anderes Zimmer aufschlägt, und sonst nie. Ein
   * Überwachungsbild, das alle zwei Sekunden zuckt, ist auf einem Telefon
   * nicht der Kompromiss, sondern der Ton, den man haben will.
   */
  override render(ctx: WorldContext): boolean {
    if (this.flat) {
      const renderer = ctx.renderer;
      renderer.setScissorTest(false);
      renderer.setClearColor(0x070a10, 1);
      renderer.clear();
      return true;
    }
    const ui = this.ui;
    if (!ui) {
      this.nextPhoneRender = 0;
      this.liftLid(this.state.crew.simulation);
      return false;
    }
    // Phone dashboards keep their DOM/radar updates, but their optional 3D
    // camera needs at most 15 frames/s. Return before clear to retain the image.
    const now = clock();
    // **Der Blick des Zuschauers gehört in den Schlüssel.** Ohne ihn blieb das
    // Bild stehen, wenn er den Platz wechselte: Die Drossel sah dieselbe
    // Station und dasselbe Zimmer und hielt das alte Bild für frisch.
    const lens: Readonly<WatchLens> = ui.watchLens;
    const view = `${ui.station}:${lens.seat}:${lens.follow}:${ui.selected}:${this.spec.seed}:${ui.veiled}`;
    if (view === this.phoneRenderView && now < this.nextPhoneRender) return true;
    this.phoneRenderView = view;
    this.nextPhoneRender = now + 1000 / 15;
    // **Welchen Platz das Bild zeigt** und nicht, an welchem man sitzt: Der
    // Zuschauer schlüpft in die Rollen der anderen (`watchLens.ts`), und für
    // die Kamera ist das dieselbe Frage wie bei einem, der wirklich dort sitzt.
    const station = ui.shownStation;
    const archive = station === 'archive';
    const show = station === 'watch';
    this.veilView(ui.veiled);
    // Die Decke bleibt nur dem Zuschauer weg, und sie geht nur bei Wechsel ab:
    // Eine Schnittebene, die je Bild kommt und geht, baut three.js jedes Mal
    // jeden Shader neu.
    this.liftLid(show);
    const rect = ui.viewport();
    const renderer = ctx.renderer;
    renderer.getSize(_size);
    renderer.setScissorTest(false);
    renderer.setClearColor(show ? SHOW_SKY : 0x05070c, 1);
    renderer.clear();
    if (!rect) return true;

    const aspect = rect.w / Math.max(1, rect.h);
    // **Was oben schon vergeben ist**, als Anteil des Bildes: Kopfzeile und
    // Auftragsstreifen liegen darüber. Beide Kameras, die ein Ganzes zeigen —
    // der Grundriss des Archivars und das Haus des Fernsehers —, lassen den
    // Streifen frei, statt ihre obere Kante darunter zu schieben.
    const head = Math.min(0.5, ui.headroom() / Math.max(1, rect.h));
    const camera = station === 'drone' ? this.droneCam : show ? this.showCam : this.topCam;
    if (!camera) return true;
    if (archive) this.aimArchive(ui.selected, aspect, head);
    if (show) this.aimShow(aspect, head, ui.station === 'watch' ? lens.follow : 'free');

    // Der Archivar sieht **keine Lebewesen**: keinen Mitspieler, kein Monster,
    // keine Drohne. Sein Blatt ist ein Grundriss und keine Überwachung.
    this.live.visible = !archive;
    ctx.avatars.visible = !archive;
    if (this.paperLight) this.paperLight.intensity = archive ? 2.2 : 0;
    if (this.paperSun) this.paperSun.intensity = archive ? 1.4 : 0;
    this.paperMask.visible = archive;
    this.paperDoors.visible = archive;
    if (archive) this.markDoors(ui.selected);
    this.paperTint(archive);
    // **Der Zuschauer sieht Tag.** Der Nebel gehört zum Grusel derer, die
    // drinstecken; über dem Puppenhaus wäre er nur eine Milchglasscheibe.
    const fog = ctx.scene.fog;
    if (show || archive) ctx.scene.fog = null;
    const creatureVisible = this.monster?.holder.visible;
    if (archive && this.monster) this.monster.holder.visible = false;
    if (this.showLight) this.showLight.intensity = show ? 3.4 : 0;
    if (this.showSun) this.showSun.intensity = show ? 2.2 : 0;

    const y = _size.y - rect.y - rect.h;
    renderer.setScissorTest(true);
    renderer.setScissor(rect.x, y, rect.w, rect.h);
    renderer.setViewport(rect.x, y, rect.w, rect.h);
    if (camera instanceof THREE.PerspectiveCamera && !show) {
      camera.aspect = aspect;
      // **Der Öffnungswinkel hängt an der Form des Bildes.** Der Pilot zieht
      // sein Bild vom Kinostreifen aufs Vollbild und zurück; bliebe der
      // senkrechte Winkel dabei stehen, sähe er im Streifen fast nichts mehr
      // nach oben und im hochkanten Vollbild fast nichts mehr zur Seite
      // (`droneRoute.droneFov`). Der Fernseher behält seinen Winkel und rückt
      // stattdessen ab (`aimShow`): Ein Haus, das man von außen ansieht, soll
      // nicht mit dem Fenster die Perspektive wechseln.
      camera.fov = droneFov(camera.aspect);
      camera.updateProjectionMatrix();
    }
    renderer.render(ctx.scene, camera);
    if (this.monster && creatureVisible !== undefined)
      this.monster.holder.visible = creatureVisible;
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, _size.x, _size.y);
    this.live.visible = true;
    ctx.avatars.visible = true;
    if (this.paperLight) this.paperLight.intensity = 0;
    if (this.paperSun) this.paperSun.intensity = 0;
    if (this.showLight) this.showLight.intensity = 0;
    if (this.showSun) this.showSun.intensity = 0;
    ctx.scene.fog = fog;
    this.paperMask.visible = false;
    this.paperDoors.visible = false;
    return true;
  }

  /**
   * **Dem Haus die Decke abnehmen** — für den Zuschauer, und nur für ihn.
   *
   * Eine Schnittebene am Renderer statt einer nahen Kappe an der Kamera: Die
   * steht zehn Grad schräg im Raum, und ein Schnitt senkrecht zu ihrer
   * Blickrichtung ließe hinten die halbe Decke stehen. Und nur bei **Wechsel**,
   * weil three.js jeden Shader neu baut, sobald sich die Zahl der Ebenen
   * ändert — je Bild wäre das ein Ruckeln ohne Grund.
   */
  private liftLid(on: boolean): void {
    const renderer = this.context?.renderer;
    if (!renderer || on === this.lidOff) return;
    this.lidOff = on;
    renderer.clippingPlanes = on ? _lidOn : _noLid;
  }

  /**
   * **Den Fernseher so weit weg stellen, dass das Haus hineinpasst.**
   *
   * Der Öffnungswinkel bleibt und der Abstand wandert — andersherum sähe
   * dasselbe Haus auf einem Telefon nach Fischauge und auf einem Fernseher
   * nach Teleobjektiv aus. Gerechnet wird beides einzeln, quer und der Länge
   * nach, und die schlimmere der beiden Zahlen gewinnt: Ein hochkantes Handy
   * hat quer zu wenig Platz, ein Fernseher der Länge nach.
   */
  private aimShow(aspect: number, head: number, follow: WatchFollow = 'free'): void {
    const camera = this.showCam;
    if (!camera) return;
    const target =
      follow === 'technician'
        ? this.technicianFocus()
        : follow === 'monster'
          ? this.state.monster
          : null;
    if (target) {
      // **Nachziehen, nicht springen.** Der Stand kommt zehnmal je Sekunde
      // über die Leitung; eine Kamera, die auf jeden Punkt schnappt, ruckelt
      // sichtbar — dieselbe Vorsicht wie beim Rumpf der Drohne.
      this.showFocus.lerp(_showTarget.set(target.x, 0, target.z), this.showAimed ? 0.18 : 1);
      this.showAimed = true;
      const rise = Math.tan(((SHOW_FOV / 2) * Math.PI) / 180);
      const deep = WATCH_FOLLOW_SPAN / Math.max(0.2, 1 - head);
      const far = Math.max(deep / (2 * rise), WATCH_FOLLOW_SPAN / (2 * rise * aspect));
      const look = this.showFocus.z - (head / 2) * deep;
      camera.position.set(
        this.showFocus.x,
        Math.sin(SHOW_PITCH) * far,
        look + Math.cos(SHOW_PITCH) * far,
      );
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      return;
    }
    this.showAimed = false;
    const bounds = stationBounds(this.spec);
    const cx = (bounds.x + bounds.w / 2) * TILE;
    const cz = (bounds.z + bounds.d / 2) * TILE;
    // Ein Kachelrand ringsum: Das Haus soll im Bild stehen und nicht daran
    // kleben — und im Süden liegt der Vorplatz mit der Einsatzzentrale, die man gern
    // mitsieht, wenn die Drohne heimkommt.
    const wide = (bounds.w + 1) * TILE;
    // Nach Süden ein Stück mehr: Dort liegen der Vorplatz und die Einsatzzentrale, und wer
    // zusieht, will sehen, wie die Drohne heimkommt und was auf dem Tisch
    // landet. Und oben der Streifen für die Zeilen, die über dem Bild liegen.
    const deep = ((bounds.d + 3.4) * TILE) / Math.max(0.2, 1 - head);
    const rise = Math.tan(((SHOW_FOV / 2) * Math.PI) / 180);
    const far = Math.max(deep / (2 * rise), wide / (2 * rise * aspect));
    const look = cz + 1.2 * TILE - (head / 2) * deep;
    camera.position.set(cx, Math.sin(SHOW_PITCH) * far, look + Math.cos(SHOW_PITCH) * far);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  /**
   * **Wo der Techniker steht** — aus dem Stand, wenn er in 2D spielt, sonst
   * aus dem Modelltechniker der Bot-Runde und zuletzt aus der Pose des
   * Mitspielers im Headset. Drei Quellen für eine Person, weil dieselbe Rolle
   * an drei Geräten hängen kann; ohne alle drei würde die Kamera des
   * Zuschauers je nachdem, wer spielt, ins Leere zeigen.
   */
  private technicianFocus(): { x: number; z: number } | null {
    const flat = this.state.technician;
    if (flat) return { x: flat.x, z: flat.z };
    const bot = this.experience?.botPose;
    if (bot) return { x: bot.x, z: bot.z };
    for (const peer of this.context?.net.peers.values() ?? [])
      if (peer.world === 'haunting' && peer.role === 'vr' && peer.pose)
        return { x: peer.pose.head[0]!, z: peer.pose.head[2]! };
    return null;
  }

  /**
   * **Ob gerade jemand zusieht und die Absichten des Monsters sehen will.**
   *
   * Es hängt an der Station und nicht an einer Einstellung der Welt: Das
   * Overlay ist Zuschauerwissen (Paket M4), und wer mitspielt, darf es nie
   * sehen — ein Techniker mit dem Glaubensbild vor sich weiß, welche Zimmer
   * gerade sicher sind.
   */
  private insightWanted(): boolean {
    const ui = this.ui;
    return !!ui && ui.station === 'watch' && ui.watchLens.insight;
  }

  /**
   * **Den Techniker aus der 2D-Welt in die 3D-Welt stellen.**
   *
   * Er hat kein Rig und keine Avatar-Pose; alles, was von ihm über die
   * Leitung kommt, ist `HauntState.technician` — Stelle, Blick, und ob er
   * geht. Genau daraus wird hier ein Körper. Ohne ihn war der Fernseher eine
   * leere Station, in der Türen von selbst aufgingen, und der Zuschauer
   * konnte der Runde nicht folgen, obwohl sie vor ihm lief.
   */
  private showTechnician(): void {
    const at = this.state.technician;
    if (!at) {
      if (this.technicianArt) this.technicianArt.visible = false;
      return;
    }
    if (!this.technicianArt) {
      this.technicianArt = buildCrewmate();
      this.technicianArt.name = 'flat-technician';
      this.live.add(this.technicianArt);
    }
    const body = this.technicianArt;
    // Im Schrank und im Schacht ist er weg — dasselbe, was die Karte tut.
    body.visible = !this.state.crew.hidden && this.state.crew.venting <= 0;
    body.position.set(at.x, 0, at.z);
    // Der Crewmate schaut nach +z, die Welt rechnet Blickrichtungen nach -z
    // (`map/mapSnapshot`, Kopf der Datei) — dieselbe halbe Drehung wie beim
    // Modelltechniker der Bot-Runde (`ShipExperience`).
    body.rotation.y = at.yaw + Math.PI;
    if (at.moving) animateCreature(body, this.state.time);
    else for (const limb of body.children) limb.rotation.x = 0;
  }

  /**
   * **Das Bild hinter der Bedienung wird grob.**
   *
   * Die Schalttafel des Piloten liegt auf durchsichtigem Grund über seinem
   * Kamerabild — und ein bewegtes Bild unter Knöpfen zieht den Blick immer auf
   * sich. Statt es zuzudecken (dann wäre der Vollbild-Grund umsonst) wird es
   * **gerastert**: Man sieht weiter, dass die Drohne fliegt und ob das Licht
   * brennt, aber nichts mehr, worauf man hinsehen müsste.
   *
   * Gerastert wird über die **Auflösung** und nicht über einen Filter: Die
   * Leinwand bekommt für diese Zeit einen winzigen Bildspeicher, den der
   * Browser hart hochskaliert (`image-rendering: pixelated`). Das kostet
   * nichts — es zeichnet weniger, nicht mehr —, es ist wirklich verpixelt und
   * nicht weichgezeichnet, und es ist genau die Stelle, an der später ein
   * eigener Filter (CRT, Rauschen) sitzen wird.
   *
   * Nur bei Wechsel: `setPixelRatio` legt den Bildspeicher neu an.
   */
  private veilView(on: boolean): void {
    const renderer = this.context?.renderer;
    if (!renderer || on === this.veiled) return;
    // In der Brille wird nicht gerastert — dort gibt es diese Bedienung nicht,
    // und eine halbierte Auflösung im Headset wäre kein Effekt, sondern ein
    // Fehler.
    if (renderer.xr.isPresenting) return;
    this.veiled = on;
    renderer.setPixelRatio(on ? VEIL_RATIO : Math.min(window.devicePixelRatio, 1.25));
    renderer.domElement.style.imageRendering = on ? 'pixelated' : '';
  }

  /**
   * Kühler Raumscan mit etwas mehr Kontrast. Der Filter sitzt auf der Leinwand
   * und wird nur beim Rollenwechsel umgeschaltet.
   */
  private paperTint(on: boolean): void {
    if (on === this.tinted) return;
    this.tinted = on;
    const canvas = this.context?.renderer.domElement;
    if (canvas) canvas.style.filter = on ? 'saturate(0.6) contrast(1.16) brightness(1.12)' : '';
  }

  /**
   * Die Kamera des Archivars über das aufgeschlagene Zimmer stellen.
   *
   * **Und unter die Decke.** Das Haus hat eine, sonst käme Licht von oben
   * hinein — von oben sieht man deshalb zuerst den Deckel. Die vordere
   * Schnittebene liegt darum knapp darunter: Was näher an der Kamera ist als
   * `near`, wird weggeschnitten, und das ist genau die Decke. Ein Puppenhaus
   * mit abgenommenem Dach, ohne dass irgendwo Geometrie verschwinden muss.
   */
  private aimArchive(roomId: string, aspect: number, head: number): void {
    const camera = this.topCam;
    const room = roomOf(this.spec, roomId) ?? this.spec.rooms[0];
    if (!camera || !room) return;
    const cx = (room.rect.x + room.rect.w / 2) * TILE;
    const cz = (room.rect.z + room.rect.d / 2) * TILE;
    const above = PLAN_WALL_H + 6;
    // **Beide Seiten einzeln gemessen**, und erst dann auf das Seitenverhältnis
    // aufgeblasen. Vorher stand hier die längere Seite für beide, und ein
    // 4×2-Zimmer lag als schmaler Streifen in der Mitte eines halbleeren
    // Blattes — auf einem Telefon ist das die Hälfte des Bildschirms für nichts.
    // **Ein Rand, der das Zimmer nicht anstößt.** Die Wandlinien liegen auf den
    // Kachelkanten und ragen zur Hälfte nach draußen; ein Blatt, das genau am
    // Zimmer endet, schneidet sie an. Ein halbes Feld Luft ringsum ist der
    // Unterschied zwischen „der Grundriss steht im Bild" und „der Grundriss
    // klebt am Rand" — und auf einem Telefon ist genau das die Frage, ob man
    // ihn ganz sieht.
    const padX = framed(room.rect.w * TILE);
    const padZ = framed(room.rect.d * TILE);
    // **Eingepasst wird in die freie Fläche, nicht in das Bild.** Oben liegen
    // Kopfzeile und Auftragsstreifen darüber; ein Zimmer, das genau das Bild
    // füllt, steckt mit seiner Nordwand dahinter. Also wird für die Fläche
    // *unter* den Zeilen gerechnet und der Ausschnitt danach nach oben
    // verlängert — das Zimmer rutscht nach unten, und oben bleibt frei, was
    // ohnehin verdeckt ist.
    const free = Math.max(0.2, 1 - head);
    const half = Math.max(padX, (padZ * aspect) / free);
    const tall = half / aspect;
    const sheet = tall * free;
    // **Das eingepasste Blatt ist das Maß für alles Weitere.** Es ändert sich
    // mit dem Zimmer und mit der Form des Fensters; ein Ausschnitt, der auf
    // dem vorigen Blatt erlaubt war, hängt sonst halb daneben (`fitView`).
    this.archiveFit = { half, sheet, tall };
    const view = fitView(this.archive, half, sheet);
    this.archive = view;
    const hw = half / view.zoom;
    const hh = tall / view.zoom;
    // Die halbe verdeckte Höhe, in Metern: So weit rückt die Kamera nach
    // Norden, damit das Zimmer unter den Zeilen hervorkommt.
    const lift = hh * head;
    // Verschoben wird die Kamera und nicht das Blatt: Die Maske ringsum rechnet
    // ohnehin von der Kameramitte aus, und ein verschobenes Blatt wäre eine
    // zweite Wahrheit darüber, wo das Zimmer steht.
    camera.position.set(cx + view.x, above, cz + view.z - lift);
    camera.left = -hw;
    camera.right = hw;
    camera.top = hh;
    camera.bottom = -hh;
    // Die Decke ausblenden, hohe Einrichtungsgegenstände vollständig zeigen.
    camera.near = above - PAPER_CUT;
    camera.far = above + 2;
    camera.updateProjectionMatrix();
    this.maskAround(room.rect, camera.position.x, camera.position.z, hw, hh);
  }

  /**
   * **Näher heran ans Blatt** — die Zange auf dem Telefon, das Rad am Laptop.
   *
   * Der Anschlag steckt in `archiveView.ts` und nicht hier: Wie weit ein
   * Archivar heranziehen darf, ist eine Regel und keine Kameraeinstellung.
   */
  private zoomArchive(factor: number): void {
    const { half, sheet } = this.archiveFit;
    this.archive = zoomedView(this.archive, factor, half, sheet);
  }

  /**
   * **Und das Blatt darunter durchschieben.**
   *
   * Herein kommen Anteile des Bildes (`StationHost.archivePan`), gerechnet
   * wird in Metern: Eine ganze Bildbreite ist `2 · half / zoom` Meter, und
   * genau deshalb schiebt derselbe Wisch im Zoom weniger weit — das Blatt
   * folgt dem Finger und nicht einer Zahl.
   *
   * **Umgekehrtes Vorzeichen**, weil der Finger das Blatt zieht und nicht die
   * Kamera: Wer nach rechts wischt, schiebt das Zimmer nach rechts, also die
   * Kamera nach links.
   */
  private panArchive(dx: number, dz: number): void {
    const { half, sheet, tall } = this.archiveFit;
    const zoom = this.archive.zoom;
    this.archive = pannedView(
      this.archive,
      (-dx * 2 * half) / zoom,
      (-dz * 2 * tall) / zoom,
      half,
      sheet,
    );
  }

  /**
   * Die vier Flächen um das aufgeschlagene Zimmer legen.
   *
   * Ein Rand von einer halben Wandstärke bleibt frei: Die Wände sitzen auf den
   * Kachelkanten und ragen zur Hälfte nach draußen — ohne den Rand wäre das
   * Zimmer auf dem Blatt eines ohne Wände.
   */
  private maskAround(rect: Rect, cx: number, cz: number, hw: number, hh: number): void {
    // **Genau eine halbe Wandstärke**, und keinen Zentimeter mehr: Die Wände
    // sitzen auf den Kachelkanten und ragen zur Hälfte nach draußen, also
    // endet das Blatt an ihrer Außenkante. Vorher stand hier eine ganze
    // Wandstärke, und in dem Streifen dazwischen schaute der Boden des
    // Nachbarzimmers hervor — ein zweiter heller Rand um den ersten, der wie
    // eine doppelte Wand aussah.
    const edge = PLAN_WALL_T / 2;
    const x0 = rect.x * TILE - edge;
    const x1 = (rect.x + rect.w) * TILE + edge;
    const z0 = rect.z * TILE - edge;
    const z1 = (rect.z + rect.d) * TILE + edge;
    // **Knapp unter dem Schnitt und mit ihm zusammen gewandert.** Die Flächen
    // müssen unter der vorderen Kappe liegen, sonst schneidet die Kamera das
    // Blatt weg statt die Decke — und der Archivar sähe das halbe Haus. Sie
    // dürfen aber auch nicht tiefer als nötig hängen: Was zwischen ihnen und
    // dem Schnitt steht, bleibt sichtbar. Die Türzeichen liegen eine Handbreit
    // darüber (`PAPER_MARK_Y`) und werden deshalb nicht zugedeckt.
    const y = PAPER_CUT - 0.03;
    const spans: Array<[number, number, number, number]> = [
      [cx - hw, cz - hh, cx + hw, z0],
      [cx - hw, z1, cx + hw, cz + hh],
      [cx - hw, z0, x0, z1],
      [x1, z0, cx + hw, z1],
    ];
    this.paperMask.children.forEach((quad, index) => {
      const [ax, az, bx, bz] = spans[index]!;
      const w = Math.max(0, bx - ax);
      const d = Math.max(0, bz - az);
      quad.scale.set(Math.max(w, 0.001), Math.max(d, 0.001), 1);
      quad.position.set((ax + bx) / 2, y, (az + bz) / 2);
      quad.visible = w > 0.001 && d > 0.001;
    });
  }

  // --- das Menü in der Brille ------------------------------------------------

  override menu(): MenuEntry[] {
    // Ein nachgebautes Weltobjekt (Replay-Tests) hat die Tafel nicht; dann gilt der Anfang.
    const setup = (this.setup ??= loadSetup());
    const entry = (id: string, label: string, sub: string, run: () => void): MenuEntry => ({
      id,
      label,
      sub,
      icon: 'cube',
      accent: 0x65dce5,
      run,
    });
    // **Die Ansicht — dieselbe Wahl wie das Segment „2D | 3D" im Van.** Sie
    // heißt hier nicht mehr „2D-Welt von oben: an/aus": Ein Kästchen, das
    // aussieht, als starte es etwas, war der Befund; ein Segment mit zwei
    // Namen sagt, worin man gleich steht. In der Brille steht es fest — die
    // Karte von oben macht in einer XR-Sitzung nicht auf (`opensFlat`).
    const immersive = this.context?.renderer.xr.isPresenting ?? false;
    const view = entry(
      'haunt:view',
      `Ansicht: ${VIEW_LABELS[immersive ? '3d' : this.lobbyChoice.view]}`,
      immersive
        ? 'In der Brille immer das Schiff · die Karte von oben gibt es nur am Fenster'
        : 'Antippen wechselt · gilt für Spielen, Zuschauen und Trainieren',
      () => {
        if (immersive)
          this.context?.notify('In der Brille gibt es nur das Schiff — die Karte von oben nicht.');
        else this.toggleFlatWanted();
      },
    );
    if (this.context?.role !== 'vr')
      return [
        entry(
          'haunt:technician',
          'Als Techniker am Desktop testen',
          'Übernimmt die VR-Rolle ohne Headset · WASD und Maus',
          () => {
            this.flatTechnician = true;
          },
        ),
        view,
      ];
    return [
      // **Was? — dieselben drei Kacheln wie im Van und im Optionsmenü der
      // 2D-Welt** (`rules/lobby.ts`, gerechnet in `rules/worldMenu.ts`):
      // Spielen · Zuschauen · Trainieren, in derselben Reihenfolge und mit
      // denselben Worten. Die aktive ist markiert, und wo gerade keine Runde
      // losgehen kann, steht der Grund als ganzer Satz an der Stelle, an der
      // sonst die Erklärung steht — vorher stand dort ein Eintrag, der nichts
      // tat und nichts sagte.
      ...startEntries(this.startState()).map((row) =>
        entry(row.id, `${row.active ? '● ' : ''}${row.label}`, row.sub, () => {
          if (row.starts && this.context) this.startRound(row.starts, this.context);
          else if (row.blocked) this.context?.notify(row.blocked);
        }),
      ),
      ...(!immersive
        ? [
            entry(
              'haunt:roles',
              'Zur Zentrale / Rolle wechseln',
              'Archiv, Einsatzkontrolle, Drohne oder Zuschauer',
              () => {
                this.flatTechnician = false;
                this.pendingBotRound = false;
                this.context?.menu.toggle(false);
              },
            ),
          ]
        : []),
      view,
      entry(
        'haunt:light',
        `Testlicht: ${this.state.crew.options.bright ? 'an' : 'aus'}`,
        // Der Schalter gehört zum Test und tat in einer Mission nichts, ohne
        // ein Wort dazu — dieselbe Falle wie bei den Starts.
        this.state.crew.options.test
          ? 'Auch im Dunkeln ohne Monster testen'
          : 'Nur im Test · in der Mission bleibt es dunkel',
        () => {
          if (!this.state.crew.options.test) {
            this.context?.notify('Das Testlicht gehört zum Test — erst „TEST / ohne Monster".');
            return;
          }
          this.state.crew.options.bright = !this.state.crew.options.bright;
        },
      ),
      entry(
        'haunt:rooms',
        `Station: ${this.state.crew.options.rooms} Räume`,
        'Feste Skeld-Karte · neue Aufgaben',
        () =>
          this.configureStation({
            ...this.state.crew.options,
            rooms:
              ROOM_COUNTS[
                (ROOM_COUNTS.indexOf(this.state.crew.options.rooms as 14) + 1) % ROOM_COUNTS.length
              ]!,
          }),
      ),
      entry(
        'haunt:setup-technician',
        `Techniker: ${WHO_LABELS[setup.technician]}`,
        'Wer den Anzug trägt — ein Mensch am Stock oder der Techniker aus Zahlen',
        () => this.applySetup({ ...setup, technician: cycleWho(setup.technician) }),
      ),
      entry(
        'haunt:setup-monster',
        `Monster: ${WHO_LABELS[setup.monster]}`,
        'Aus Zahlen, am Stock (nur 2D) oder aus — der sichere Test',
        () => this.applySetup({ ...setup, monster: cycleMonster(setup.monster) }),
      ),
      entry(
        'haunt:setup-seats',
        `Zentrale: ${setup.seats.length ? setup.seats.map((seat) => WHO_LABELS[seat.who]).join('/') : 'keine Plätze'}`,
        'Archivar, Schalttafel, Späher · Bot-Plätze geben dem Techniker die Auskunft selbst',
        () => this.cycleSeats(),
      ),
      entry(
        'haunt:monster-kind',
        `Gegner: ${MONSTERS.find((m) => m.id === this.state.crew.options.monster)!.name}`,
        'Drei Erscheinungen mit anderem Tempo und Schachtverhalten',
        () =>
          this.configureStation({
            ...this.state.crew.options,
            monster:
              MONSTERS[
                (MONSTERS.findIndex((m) => m.id === this.state.crew.options.monster) + 1) %
                  MONSTERS.length
              ]!.id,
          }),
      ),
      ...(this.experience?.menu() ?? []),
    ];
  }

  /**
   * **Der Stand, aus dem die Start-Einträge gerechnet werden**
   * (`rules/worldMenu.ts`).
   *
   * Dieselbe Rechnung läuft zweimal: einmal beim Bauen des Menüs, damit die
   * Zeile schon sagt, ob und warum nicht — und einmal beim Druck, denn
   * zwischen Aufschlagen und Drücken kann ein zweiter Techniker den Raum
   * betreten haben.
   */
  private startState(): WorldMenuState {
    const ctx = this.context;
    return {
      role: ctx?.role ?? 'desktop',
      immersive: ctx?.renderer.xr.isPresenting ?? false,
      hostId: this.hostId,
      me: ctx?.net.localId ?? '',
      phase: this.state.phase,
      flatWanted: this.flatWanted,
      intent: intentOf(this.setup ?? loadSetup()),
      occupied: ctx ? this.roomOccupied(ctx) : false,
    };
  }

  /**
   * Ob in diesem Raum schon jemand anders den Techniker spielt — im Headset
   * oder als Techniker am Desktop, der sich seit weniger als drei Sekunden
   * gemeldet hat (`receive`, `kind: 'technician'`).
   */
  private roomOccupied(ctx: WorldContext): boolean {
    return [...ctx.net.peers.values()].some(
      (peer) =>
        peer.world === ctx.net.world &&
        (peer.role === 'vr' || clock() - (this.technicians.get(peer.id) ?? -Infinity) < 3000),
    );
  }

  /** Die Plätze der Zentrale im Menü der Brille: alle Bot → alle Mensch → keine → alle Bot. */
  private cycleSeats(): void {
    const seats = this.setup.seats;
    const allBot = seats.length > 0 && seats.every((seat) => seat.who === 'bot');
    const next: RoundSetup['seats'] = allBot
      ? seats.map((seat) => ({ ...seat, who: 'human' }))
      : seats.length
        ? []
        : (['archive', 'panel', 'scout'] as const).map((role) => ({ role, who: 'bot' }));
    this.applySetup({ ...this.setup, seats: next });
  }

  private joinTable(ctx: WorldContext): void {
    if (!ctx.net.connected)
      ctx.join(new URLSearchParams(location.search).get('room') || HAUNT_ROOM);
  }

  /** Die Ansicht umlegen — nur die Einstellung, keine Runde. */
  private toggleFlatWanted(): void {
    this.setLobby({ ...this.lobbyChoice, view: this.flatWanted ? '3d' : '2d' });
  }

  /**
   * Die Wahl der Lobby übernehmen: merken und die Anzeigen nachziehen. Van,
   * Brillenmenü und 2D-Optionsmenü zeigen dieselbe Wahl — wer sie an einer
   * Stelle umstellt, soll sie nicht an der nächsten noch alt vorfinden.
   */
  private setLobby(choice: LobbyChoice): void {
    this.lobbyChoice = choice;
    saveLobby(choice);
    this.ui?.refresh();
    this.context?.refreshWorldMenu();
  }

  /**
   * **Welchen der beiden Plätze dieses Gerät hat** — für `applyIntent`. Wer
   * in der Zentrale an der Station „Monster" sitzt, ist das Monster; alle
   * anderen sind der Techniker, wie überall sonst in diesem Spiel.
   */
  private myPlace(): 'technician' | 'monster' {
    const ctx = this.context;
    return ctx && seatOf(this.currentClaims(), ctx.net.localId) === 'monster'
      ? 'monster'
      : 'technician';
  }

  /**
   * **Eine Runde starten — in 2D oder 3D, je nach Ansicht.** Herein kommt die
   * Absicht der Lobby (Spielen · Zuschauen · Trainieren); die alten drei
   * Namen (`mission`, `test`, `bot`) gehen ebenso, solange sie noch irgendwo
   * stehen (`asIntent`). Steht die Ansicht auf „2D von oben", läuft jede
   * davon als `FlatMode`; sonst wie bisher im Schiff. **In der Brille immer
   * im Schiff** — die Karte von oben gibt es dort nicht (`opensFlat`).
   */
  private startRound(what: Intent | RoundKind, ctx: WorldContext): void {
    // Die Absicht schreibt Techniker und Monster auf die Tafel; die Plätze der
    // Zentrale bleiben, wie sie verteilt sind (`rules/lobby.applyIntent`).
    // **Wer selbst am Monster sitzt, bleibt das Monster**: „Zuschauen" darf
    // ihm die Runde nicht wegnehmen, und „Spielen" heißt für ihn, dass der
    // Techniker den Zahlen gehört.
    this.applySetup(applyIntent(this.setup, asIntent(what), this.myPlace()));
    const setup = this.setup;
    // **Die Checkbox „2D-Welt von oben" gilt in der Brille nicht.** Sie steht
    // im Browser und überlebt Tage; wer sie irgendwann im Van angehakt hat und
    // später die Brille aufsetzte, landete hier in `openFlat` — und das steigt
    // in einer XR-Sitzung wortlos wieder aus. Der Druck auf „Mission starten"
    // tat dann gar nichts. In der Brille gibt es das Schiff.
    if (opensFlat(this.startState())) {
      const options = this.state.crew.options;
      const role = flatRoleOf(setup);
      this.openFlat(ctx, {
        monster: options.monster,
        tuning: this.tuning,
        test: setup.monster === 'off',
        role,
        setup,
        powers: powersOf(setup),
        // Wer zusieht, will alles sehen; wer spielt, sieht, was der Techniker sieht.
        mode: role === 'watch' ? 'omniscient' : 'realistic',
      });
      return;
    }
    // Im Schiff steuert nur der Techniker aus Fleisch; ein Monster aus Fleisch
    // gibt es dort (noch) nicht — es rechnet die Routine.
    const inShip = roundKindOf(setup);
    // **Das Panel klappt zu — aber nur, wenn wirklich etwas losgeht.** Sonst
    // stand es mitten in der Runde, die gerade angefangen hat, und sah aus, als
    // wäre nichts passiert. Umgekehrt darf es bei einer Absage gerade *nicht*
    // zugehen: Die Meldung steht in der Statuszeile des Panels und wäre mit ihm
    // weg (`App.notify`). `requestBotRound` und `openFlat` machen es genauso.
    if (inShip === 'bot') {
      this.requestBotRound(ctx);
      return;
    }
    const started = inShip === 'mission' ? this.startMission() : this.testMission();
    if (started) ctx.menu.toggle(false);
  }

  /** Die Tafel schreiben — und allen Anzeigen sagen, dass sie sich geändert hat. */
  private applySetup(setup: RoundSetup): void {
    this.setup = setup;
    saveSetup(setup);
    this.ui?.refresh();
    this.context?.refreshWorldMenu();
  }

  /**
   * **Die Ziele des Technikers, in Reihenfolge** — für den Kompass am oberen
   * Bildrand: je Reparatur erst das Ersatzteil, dann die Konsole; sind alle
   * drei erledigt, die Zentrale. Dieselbe Regel wie in der 2D-Welt
   * (`FlatRound.objectives`).
   */
  objectives(): MapGoal[] {
    const state = this.state;
    const layout = stationLayout(this.spec);
    // **Wie genau ein Ziel benannt werden darf, entscheidet die Verteilung**
    // (`rules/roundSetup.goalPrecision`): Sitzt ein Mensch am Archiv, bekommt
    // der Techniker den Raum und nicht die Kiste — sonst läse der Archivar ihm
    // vor, was er ohnehin vor sich leuchten sieht.
    const precision = goalPrecision(this.setup);
    const out: MapGoal[] = [];
    for (const repair of repairsFor(this.spec)) {
      if (state.done.includes(repair.itemId)) continue;
      const task = this.spec.tasks.find((t) => t.id === repair.itemId);
      const carried = state.crew.inventory.includes(repair.itemId);
      // Seit jeder Raum zwei bis drei Kisten hat, heißt die richtige nicht mehr
      // `cargo-<raum>`, sondern steht in der einen Liste (`rules/cargo.ts`).
      // Vorher fand `find` hier nichts, und der Kompass zeigte für ein noch
      // gar nicht geholtes Teil schon auf die Konsole.
      const cargo = task ? layout.find((p) => p.id === taskCargo(this.spec, task.id).id) : null;
      const console = layout.find((p) => p.id === `console-${repair.id}`);
      if (!carried && cargo) {
        if (precision === 'crate')
          out.push({
            id: cargo.id,
            at: { x: cargo.approach.x, z: cargo.approach.z },
            label: task?.label ?? repair.item,
            next: false,
            kind: 'crate',
            precision: 'exact',
          });
        else {
          const centre = stationGraph(this.spec).centre(cargo.roomId);
          out.push({
            id: `room:${cargo.roomId}`,
            at: { x: centre.x, z: centre.z },
            label: roomOf(this.spec, cargo.roomId)?.name ?? cargo.roomId,
            next: false,
            kind: 'room',
            precision: 'room',
          });
        }
      } else if (console)
        out.push({
          id: console.id,
          at: { x: console.approach.x, z: console.approach.z },
          label: repair.title,
          next: false,
          kind: 'console',
          precision: 'exact',
        });
    }
    if (!out.length)
      out.push({
        id: 'van',
        at: { x: COMMAND_HOME.x, z: COMMAND_HOME.z },
        label: 'Zurück zur Zentrale',
        next: false,
        kind: 'van',
        precision: 'exact',
      });
    out[0]!.next = true;
    return out;
  }

  /**
   * **Die 2D-Welt öffnen.** Solange sie läuft, rechnet `FlatMode` die Runde
   * selbst (`map/flatRound.ts`) und `tick`/`render` fassen die 3D-Welt nicht
   * an. Mission und Test sind dabei **die gemeinsame Runde**: Wer sie spielt,
   * ist der Techniker, wird Gastgeber und sagt den Stand an (`stepFlat`,
   * `tickNet`); die Telefone sehen, schalten und spielen das Monster wie bei
   * einem Techniker im Schiff. Die Bot-Runde bleibt eine lokale Vorführung.
   * Eine laufende 2D-Runde wird durch die neue ersetzt.
   */
  private openFlat(ctx: WorldContext, options: FlatOptions): void {
    if (this.flat) this.closeFlat();
    if (this.flatLoading) return;
    const shared = options.role !== 'watch';
    // Ein Techniker je Raum — dieselbe Regel wie bei der Bot-Runde: Wer 2D
    // spielt, wird Gastgeber der gemeinsamen Runde, und zwei davon gäbe es nicht.
    const occupied = this.roomOccupied(ctx);
    // **Und genau derselbe belegte Raum ist für den Zuschauer die gute
    // Nachricht.** Spielt im Raum wirklich jemand, sieht er *dieser* Runde zu
    // (`FlatModeHost.watchSnapshot`) statt einer Vorführung daneben; ist der
    // Raum leer, bleibt es bei der lokalen Bot-Runde wie bisher.
    const live = !shared && occupied;
    if (shared && occupied) {
      ctx.notify('2D-Welt nicht verfügbar: Ein anderer Techniker spielt bereits in diesem Raum.');
      return;
    }
    this.flatLoading = true;
    // Die 2D-Welt (samt CSS und der Registry-Discovery mit `import.meta.glob`)
    // kommt erst, wenn jemand sie will: So bleibt sie aus dem 3D-Pfad und
    // aus den Tests der Welt heraus.
    void Promise.all([
      import('./map/flatMode'),
      import('./map/toolIcons'),
      import('./registry/discover'),
    ])
      .then(([mode, icons, discover]) => {
        this.flatLoading = false;
        // Im Headset gibt es keine Karte von oben — dort bleibt die Brille.
        if (this.flat || ctx.renderer.xr.isPresenting) return;
        if (discover.REGISTERED_FILES.length === 0)
          console.warn('Haunting: keine *.register.ts gefunden');
        // Die gemeinsame Runde läuft auf demselben Samen wie das Haus der
        // Telefone — ein anderer Same wäre eine andere Karte. Die lokale
        // Bot-Runde darf würfeln.
        this.flatShared = shared;
        this.flatWatching = live;
        this.flat = new mode.FlatMode(shared || live ? this.spec.seed : rollSeed(), options, {
          exit: () => this.closeFlat(),
          notify: (text) => ctx.notify(text),
          // Nur beim Zusehen am Netz: Szene und Karte kommen aus dem Stand,
          // den der Gastgeber ansagt. Das `insight` weiß nur, wer das Monster
          // rechnet — alle anderen bekommen `null` und sehen die Runde ohne
          // den Kopf des Gegners.
          ...(live
            ? {
                watchSnapshot: (): MapSnapshot => this.worldSnapshot(),
                insight: () => this.decision?.insight ?? null,
              }
            : {}),
        });
        if (live) ctx.notify('Zuschauen: Du siehst die Runde, die in diesem Raum läuft.');
        // Die Werkzeuge einmal aus ihren 3D-Modellen rendern und puffern;
        // die 2D-Welt hängt die fertigen Bilder in ihren Knopf (`toolIcons.ts`).
        this.flatIcons ??= new icons.ToolIcons();
        this.flat.setToolIcons(this.flatIcons);
        document.body.append(this.flat.element);
        ctx.menu.toggle(false);
        this.ui?.refresh();
        ctx.refreshWorldMenu();
      })
      .catch((error: unknown) => {
        this.flatLoading = false;
        console.error('Haunting: 2D-Welt konnte nicht geladen werden', error);
      });
  }

  /**
   * Die 2D-Welt verlassen — zurück dorthin, wo sie gestartet wurde
   * (Einsatzzentrale oder Techniker). War es die gemeinsame Runde, ist sie
   * damit vorbei: ein frischer Stand auf demselben Haus, wie `newRound` ihn
   * baut — und angesagt, damit die Telefone nicht auf einer verwaisten Runde
   * sitzen.
   */
  private closeFlat(): void {
    if (!this.flat) return;
    this.flat.dispose();
    this.flat = null;
    this.flatWatching = false;
    if (this.flatShared) {
      this.flatShared = false;
      this.state = freshState(this.spec.seed, this.state.crew.options);
      this.rules.reset();
      this.netMonster.reset();
      if (this.isHost) this.context?.net.emit(HAUNT_CHANNEL, stateMessage(this.state));
    }
    this.ui?.refresh();
    this.context?.refreshWorldMenu();
  }

  /** Der Stand der Station als Karte — reiner Lesezugriff (`map/extract.ts`). */
  mapSnapshot(): MapSnapshot {
    // Der Zuschauer am Netz rechnet keine Runde — seine eigene steht still,
    // und ihr Snapshot wäre eine zweite, falsche Station.
    if (this.flat && !this.flatWatching) return this.flat.round.snapshot();
    return this.worldSnapshot();
  }

  /**
   * **Die 3D-Welt als Karte** — auch dann, wenn eine 2D-Welt darüber liegt.
   * Der Zuschauer in 2D zeichnet genau das: den Stand, den der Gastgeber
   * ansagt (`map/worldSource.ts`), und nicht seine eigene stillstehende Runde.
   */
  private worldSnapshot(): MapSnapshot {
    return extractMapSnapshot(
      worldMapSource({
        spec: () => this.spec,
        state: () => this.state,
        drone: () => this.drone,
        lamps: () =>
          [...this.lamps.entries()].map(([id, lamp]) => ({
            id,
            x: lamp.at.x,
            z: lamp.at.z,
            color: `#${lamp.color.toString(16).padStart(6, '0')}`,
            intensity: 1,
          })),
        doorOpen: (id) => this.automaticDoors.isOpen(id),
        // Wie lange die Sperre noch hält — der Balken über der Tür
        // (`rules/doorLocks.ts`, `map/mapView.ts`).
        doorHold: (id) => {
          if (!this.state.shut.includes(id)) return null;
          const until = holdUntil(this.locks, id);
          if (until === null) return null;
          const total = isChosen(this.locks, id) ? HOLD_RANGE[1] : SLAM_HOLD;
          return { left: Math.max(0, until - this.state.time), total };
        },
        player: () => {
          // Der Techniker in der 2D-Welt eines anderen Geräts hat kein Rig:
          // Seine Stelle kommt aus dem Stand (`HauntState.technician`).
          const technician = this.state.technician;
          if (technician) return { ...technician, sprinting: this.state.crew.exertion > 0.3 };
          const ctx = this.context;
          if (!ctx || (ctx.role !== 'vr' && !this.flatTechnician)) return null;
          ctx.rig.getHeadPosition(_head);
          ctx.camera.getWorldDirection(_feet);
          return {
            x: _head.x,
            z: _head.z,
            yaw: Math.atan2(-_feet.x, -_feet.z),
            moving: false,
            sprinting: this.state.crew.exertion > 0.3,
          };
        },
        torch: () => ({
          lit: !!this.stationTorch?.visible && this.experience?.flashlightActive === true,
          held: this.experience?.flashlightActive ? 'flashlight' : '',
        }),
        bot: () => this.experience?.botPose ?? null,
        monsterYaw: () => this.monster?.model.rotation.y ?? 0,
        round: () => this.rules.status(this.state),
        vents: () => {
          const open = this.ventRide.openFlap;
          return { flaps: this.vents.items(open ? [open.id] : []), links: this.vents.mapLinks() };
        },
        peers: () =>
          [...(this.context?.net.peers.values() ?? [])]
            .filter((peer) => peer.world === 'haunting' && peer.role === 'vr' && peer.pose)
            .map((peer) => ({
              id: peer.id,
              name: peer.name,
              x: peer.pose!.head[0]!,
              z: peer.pose!.head[2]!,
              yaw: 0,
            })),
      }),
    );
  }

  private requestBotRound(ctx: WorldContext): void {
    // Hier zählt **nur** der belegte Raum und nicht die Rolle: Die Bot-Runde
    // ist gerade das, was auch ein Zuschauer am Desktop anwirft — sie macht
    // ihn dafür selbst zum Techniker (`flatTechnician`).
    if (this.roomOccupied(ctx)) {
      this.pendingBotRound = false;
      ctx.notify(ROOM_BUSY);
      return;
    }
    this.flatTechnician = true;
    this.pendingBotRound = true;
    ctx.menu.toggle(false);
  }

  /** Stop local authority without erasing the snapshot another host continues. */
  private releaseMonster(): void {
    if (this.monsterArt) {
      this.monsterArt.removeFromParent();
      dispose(this.monsterArt);
      this.monsterArt = null;
    }
    this.director?.clear();
    this.monsterNavigator = null;
    this.routine = null;
    this.brain = null;
    this.estimator = null;
    this.decision = null;
    this.watchedLocker = '';
    this.monster = null;
    this.npcRide?.reset();
    this.npcRide = null;
    this.ventArt?.setOpen(null);
  }

  private removeMonster(): void {
    this.releaseMonster();
    this.state.monster = null;
    this.state.monsterOn = false;
    this.state.crew.venting = 0;
  }

  /** @returns ob die Mission wirklich losgegangen ist. */
  private startMission(): boolean {
    // Früher stand hier ein stummes `return`: kein Gastgeber oder nicht der
    // Techniker, und der Knopf tat nichts, ohne ein Wort dazu. Jetzt sagt er,
    // was fehlt (`rules/worldMenu.ts`).
    const blocked = startBlocker(this.startState(), 'mission') ?? (this.isHost ? null : HOST_BUSY);
    if (blocked) {
      this.context?.notify(blocked);
      return false;
    }
    const start = startedRound('mission');
    const options = { ...this.state.crew.options, test: start.test, bright: start.bright };
    this.newRound(options);
    this.state.phase = start.phase;
    this.state.monsterOn = start.monsterOn;
    const far = roomOf(this.spec, this.spec.fuse.roomId) ?? this.spec.rooms[0]!;
    const at = safeRoomSpawn(this.spec, far.id);
    this.spawnMonster(at);
    // **Die Station beginnt dunkel**, und sie bleibt es, wenn niemand schaltet.
    // Vorher gingen hier alle vierzehn Lampen an, und weil `applyLights` nur
    // die des eigenen Raums brennen ließ, sah es aus, als ginge beim Betreten
    // von selbst das Licht an — ein Automatismus, den niemand gebaut hatte und
    // der der Taschenlampe die Aufgabe wegnahm. Licht macht jetzt die Tafel,
    // höchstens zwei Räume gleichzeitig, und nicht für immer (`rules/lamps.ts`).
    this.state.lit = [];
    this.announce(
      'Mission läuft. Die Station ist dunkel: Taschenlampe an, Licht macht die Einsatzkontrolle. Archiv: Aufträge und Codes. Nach drei Reparaturen zurück zur Zentrale.',
    );
    return true;
  }

  private spawnMonster(at: { x: number; z: number }): void {
    const kind = MONSTERS.find((m) => m.id === this.state.crew.options.monster)!;
    this.monster =
      this.director?.spawn({
        kind: 'zombie',
        brain: 'chase',
        speed: kind.speed,
        health: 10000,
        at: new THREE.Vector3(at.x, 0, at.z),
      }) ?? null;
    this.routine = new MonsterRoutine(this.tuning.monster);
    this.brain = new MonsterMemory(stationGraph(this.spec), () =>
      shutPairs(this.spec.doors, this.state.shut),
    );
    this.estimator = graphEstimator(stationGraph(this.spec));
    this.repaired = this.state.done.length;
    this.watchedLocker = '';
    // Ein erster Beschluss noch vor dem ersten Bild: Sonst stünde das Monster
    // genau so lange ohne Ziel herum, wie es dauert, bis die Wahrnehmung das
    // erste Mal läuft — und in einer Bot-Runde ohne Techniker wäre das für
    // immer.
    this.decision = this.routine.step(stationGraph(this.spec), {
      dt: 0,
      at,
      here: roomAt(this.spec, Math.floor(at.x / TILE), Math.floor(at.z / TILE))?.id ?? '',
      signal: null,
      seen: false,
      quarry: null,
      caught: '',
      rng: () => this.routineDice.next(),
    });
    if (this.monster) {
      const navigator = new StationNpcNavigator(
        () => this.spec,
        () => this.travelGraph(),
      );
      this.monsterNavigator = navigator;
      // Ein Spieler am Steuer bekommt keinen Weg gesucht: Sein Ziel liegt
      // einen Meter voraus und wandert mit ihm — eine Rasterwegsuche je Bild
      // wäre Arbeit für nichts. Er läuft geradeaus, Rapier hält ihn an Wänden.
      this.monster.setNavigator((input) =>
        this.monsterDriver?.active()
          ? { x: input.target.x, z: input.target.z }
          : navigator.step(input),
      );
      this.monster.model.visible = false;
      this.monsterArt = buildCreature(this.state.crew.options.monster);
      this.monsterArt.position.y = -this.monster.skin.height / 2;
      this.monster.holder.add(this.monsterArt);
      this.npcRide = new NpcVentRide(
        this.vents,
        this.ventRide,
        this.ventBody(),
        kind.id,
        kind.speed * this.tuning.monster.speed,
      );
    }
  }

  /**
   * **Die drei Handgriffe am Rapier-Körper**, die die Fahrt braucht
   * (`vents/npcVentRide.ts`). Während der Fahrt bleibt der Körper an der
   * Einstiegsklappe stehen — unsichtbar, ohne Ziel, Geschwindigkeit null;
   * ihn unter den Boden zu setzen hieße, ihn fallen zu lassen (`Npc.land`).
   * Drüben wird er versetzt wie ein Portal es täte (`Npc.warp`): Position,
   * vorige Position für die Zwischenbilder, und die Collider nachgezogen.
   */
  private ventBody() {
    return {
      hold: () => this.monster?.entry.body.setLinvel({ x: 0, y: 0, z: 0 }, true),
      place: (at: { x: number; z: number }) => {
        const monster = this.monster;
        if (!monster) return;
        const body = monster.entry.body;
        const y = monster.skin.height / 2 + 0.06;
        body.setTranslation({ x: at.x, y, z: at.z }, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        monster.holder.position.set(at.x, monster.skin.height / 2, at.z);
        monster.entry.previousPosition.set(at.x, y, at.z);
        this.physics?.syncColliders();
      },
      effect: (flap: { id: string; at: { x: number; z: number } }) => {
        this.experience?.burst('smoke', new THREE.Vector3(flap.at.x, 0.45, flap.at.z));
        const head = this.previousFeet;
        if (head && Math.hypot(head.x - flap.at.x, head.z - flap.at.z) < 12) playSlam();
      },
    };
  }

  /** @returns ob der Test wirklich losgegangen ist. */
  private testMission(): boolean {
    const blocked = startBlocker(this.startState(), 'test') ?? (this.isHost ? null : HOST_BUSY);
    if (blocked) {
      this.context?.notify(blocked);
      return false;
    }
    const start = startedRound('test');
    this.newRound({ ...this.state.crew.options, test: start.test, bright: start.bright });
    this.state.phase = start.phase;
    this.state.crew.opened = ['test-supply'];
    this.announce(
      'TEST AKTIV · Kein Monster, kein Schaden. Testschrank rechts ist bestückt; Labor geöffnet. Testlicht lässt sich abschalten.',
    );
    return true;
  }

  private configureStation(options: StationOptions): void {
    // Eine neue Station ist eine neue Runde und braucht denselben Gastgeber
    // wie sie — und sagt es genauso, statt den Menüeintrag ins Leere laufen
    // zu lassen.
    const blocked = startBlocker(this.startState(), 'mission') ?? (this.isHost ? null : HOST_BUSY);
    if (blocked) {
      this.context?.notify(blocked);
      return;
    }
    this.newRound(stationOptions(options));
    this.announce(
      `Neue Station: ${this.spec.rooms.length} Räume. Mission oder sicheren Test wählen.`,
    );
  }

  private newRound(options: StationOptions = this.state.crew.options): void {
    if (!this.isHost) return;
    this.removeMonster();
    this.rules.reset();
    this.spook = freshSpook();
    this.locks = freshLocks();
    this.lampBook = freshLamps();
    this.automaticDoors.clear();
    this.spec = generateHouse(rollSeed(), options.rooms);
    this.state = freshState(this.spec.seed, options);
    this.previousFeet = null;
    this.sightTimer = 0;
    this.monsterSeesPlayer = false;
    this.grid?.replaceWith(housePlan(this.spec, new Set(), options.test));
    this.builtDoors = '?';
    if (this.blob) {
      dispose(this.blob);
      this.blob.removeFromParent();
      this.blob = null;
    }
    this.buildHouse();
    this.parkDrone();
    if (this.context) this.movePlayerTo(this.context, this.spawnPoint());
    this.context?.net.emit(HAUNT_CHANNEL, stateMessage(this.state));
    this.context?.refreshWorldMenu();
  }
}

/**
 * **Eine Gruppe leeren und dabei wirklich freigeben.**
 *
 * `Group.clear()` nimmt die Kinder heraus und lässt Geometrien und Materialien
 * im Grafikspeicher stehen. Bei einer Welt, die man einmal betritt, fällt das
 * nie auf; bei einer, die je Runde ein neues Haus baut, ist es nach dem
 * fünften Abend das Haus, das nicht mehr lädt.
 */
function dispose(group: THREE.Object3D): void {
  for (const child of [...group.children]) {
    child.traverse((one) => {
      const mesh = one as Partial<THREE.Mesh>;
      mesh.geometry?.dispose();
      const material = mesh.material;
      for (const part of Array.isArray(material) ? material : material ? [material] : []) {
        (part as THREE.MeshBasicMaterial).map?.dispose();
        part.dispose();
      }
    });
    group.remove(child);
  }
}

/** Eine Uhr, die auch dann weiterläuft, wenn dieser Tab keine Bilder bekommt. */
function clock(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function freshState(seed: number, options: StationOptions = stationOptions(null)): HauntState {
  return {
    seed,
    phase: 'briefing',
    crew: freshCrew(options),
    time: 0,
    monsterOn: false,
    monster: null,
    shut: [],
    lit: [],
    loud: [],
    fuse: false,
    taken: [],
    done: [],
    destroyed: [],
    technician: null,
    ride: 'out',
    ghosts: freshGhosts(),
  };
}

/**
 * **Wo eine Tür wirklich sitzt** — auf der Kante und nicht auf der Kachel.
 *
 * Der Bauplan sagt „an dieser Kachel, in dieser Richtung"; gezeichnet wird auf
 * der Kante dazwischen. Der Späherschirm setzt seinen Punkt großzügig in die
 * Kachelmitte, weil dort ein Pixel reicht — auf dem Blatt des Archivars läge
 * das Zeichen dann anderthalb Meter neben der Tür, mitten im Zimmer.
 *
 * `alongX` sagt, wie die Kante liegt: nach Norden und Süden läuft sie quer
 * (entlang X), nach Osten und Westen längs. Dieselbe Unterscheidung wie beim
 * Bauen der Wände (`levelBuild`), und aus demselben Grund.
 */
function doorEdge(door: { x: number; z: number; dir: Dir }): {
  x: number;
  z: number;
  alongX: boolean;
} {
  return edgeCentre(door.x, door.z, door.dir);
}

/**
 * Die Mitte einer Kachelkante, in Metern — und wie sie liegt.
 *
 * `alongX` sagt, ob die Kante quer läuft (nach Norden und Süden) oder längs
 * (nach Osten und Westen). Dieselbe Unterscheidung wie beim Bauen der Wände
 * (`levelBuild`), und aus demselben Grund: Danach richtet sich jedes Rechteck,
 * das auf einer Wand liegt.
 */
function edgeCentre(x: number, z: number, dir: Dir): { x: number; z: number; alongX: boolean } {
  const alongX = dir === DIR_N || dir === DIR_S;
  return {
    x: (x + (dir === DIR_E ? 1 : alongX ? 0.5 : 0)) * TILE,
    z: (z + (dir === DIR_S ? 1 : alongX ? 0 : 0.5)) * TILE,
    alongX,
  };
}

/**
 * **Wie viel Luft ein Zimmer auf dem Blatt ringsum bekommt** — halbe Kante
 * plus Rand, in Metern.
 *
 * Anteilig und nicht als feste Zahl: Ein fester Rand von anderthalb Metern ist
 * bei einem 15-Meter-Saal ein Strich und bei einer 5-Meter-Kammer ein Drittel
 * des Blattes. Der Anteil hält beide Blätter gleich voll; der Mindestrand
 * sorgt dafür, dass die Wandlinie nicht die Bildkante anschneidet — sie liegt
 * auf der Kachelkante und ragt zur Hälfte nach draußen.
 */
function framed(size: number): number {
  return size / 2 + Math.max(TILE * 0.25, size * 0.06);
}
