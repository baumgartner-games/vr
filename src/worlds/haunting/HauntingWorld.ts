import { lampBook as sceneLamps } from '../../core/lamps/lampBook';
import { cellKey } from '../nav/cellGrid';
import { stationFixtureCells } from './map/stationCells';
import { NavigationOverlay } from './navigationOverlay';
import * as THREE from 'three';
import { ProgramHold } from '../../core/programHold';
import { FurnishedWorld } from '../grid/FurnishedWorld';
import { PLAN_DOOR_H, PLAN_WALL_H, PLAN_WALL_T } from '../editor/levelPlan';
import {
  DIRS,
  DIR_E,
  DIR_N,
  DIR_S,
  TILE,
  dirX,
  dirZ,
  keyLevel,
  keyX,
  keyZ,
  wallDir,
  wallTile,
  type Dir,
} from '../nav/navTile';
import { FlashlightTool } from '../portal/tools/FlashlightTool';
import type { Tool } from '../portal/tools/Tool';
import { StunGrenadeTool } from '../portal/tools/StunGrenadeTool';
import { playSlam, playSwitch } from '../../core/Audio';
import { yawOfForward } from '../../core/walkFrame';
import { pickHost } from '../../net/host';
import type { Peer } from '../../net/NetSession';
import type { PeerPose } from '../../net/types';
import {
  generateHouse,
  onApron,
  roomAt,
  roomTiles,
  cutOf,
  cutSides,
  cutWalls,
  roomCentre,
  roomOf,
  spacesOf,
  stationBounds,
  APRON,
  COMMAND_HOME,
  type HouseDoor,
  type HouseRoom,
  type HouseSpec,
  type Rect,
  STATION_DOOR_W,
  doorEdges,
  isPassage,
  leafDoors,
  doorMiddle,
  doorWidth,
} from './house';
import { housePlan } from './plan';
import { flickerLevel, freshSpook } from './haunt';
import { fitView, homeView, pannedView, zoomedView, type ArchiveView } from './archiveView';
import {
  buildShip,
  buildCorridorBeacons,
  label,
  roomAccent,
  SHIP,
  type StationBeacon,
} from './shipArt';
import { StationWalls, wallRun, type StationFeature, type WallRun } from './world3d/stationWalls';
import {
  buttonPressed,
  DOOR_OPEN_DEPTH,
  DoorButtons,
  type ButtonDoor,
} from './world3d/doorButtons';
import { buildActor, type ShipActor } from './actorArt';
import { defaultLens, throughEyes, type WatchLens } from './watchLens';
import { ShipExperience } from './ShipExperience';
import { safeRoomSpawn, stationLayout } from './stationLayout';
import { COMMAND_DESKS, crewPlacement, deskOf, type CommandDesk } from './world3d/commandSeats';
import {
  COMMAND_SPOTS,
  LINK_SPOT,
  LOUNGE_SPOTS,
  MONSTER_SPOT,
  SETTINGS_SPOT,
  SUIT_SPOT,
  inFront,
  TERMINAL_TILES,
  chairSpot,
  deskSpot,
  gearSlot,
  playerRank,
  spawnSlot,
} from './world3d/commandRoom';
import type { ElementSpot } from '../elements/elementPlace';
import { placeElement, type ElementHost, type PlacedElement } from '../elements/elementView';
import { kaykitModel } from '../../core/kaykitModel';
import type { Usable } from '../../core/usable';
import { lampReach, stationLighting } from './stationLighting';
import { ENTITY_PROFILES } from './threat';
import { acousticField, BOT_FOV, BOT_VISION, MONSTER_FOV } from './perception';
import { FULL_VIEW, portalRooms, topDownRooms, type ViewRect } from './stationVisibility';
import { FlatKernel } from './flatKernel';
import { KernelLocomotion } from './kernelLocomotion';
import { loadTuning, saveTuning, clampTuning, type BotTuning } from './botTuning';
import {
  DEFAULT_LIGHTING,
  alarmPulse,
  beaconAngle,
  clampLighting,
  nextLighting,
  type BotLighting,
} from './botLighting';
import { clampSimulationSpeed, simulationRepeats, type SimulationSpeed } from './simulationSpeed';
import { AutomaticDoors } from './automaticDoors';
import {
  freshCrew,
  MONSTERS,
  PLAYER_WALK_SPEED,
  repairsFor,
  stationOptions,
  stickPace,
  type StationOptions,
} from './mission';
import { Rng } from './rng';
import { StationUi } from './stationUi';
import type { ArchiveDesk } from './views/archiveDesk';
import { extractMapSnapshot } from './map/extract';
import { worldMapSource } from './map/worldSource';
import { taskCargo } from './rules/cargo';
import { orderDone } from './rules/archiveGoals';
import { freshGlitch, stepGlitch, type DoorGlitch } from './rules/doorGlitch';
import { RoundRules } from './rules/roundRules';
import {
  HOLD_RANGE,
  SLAM_HOLD,
  chooseLock,
  lockBlock,
  LOCK_BLOCK_TEXT,
  LOCK_COOLDOWN,
  freshLocks,
  holdUntil,
  isChosen,
  releaseLock,
  toggleLock,
  type DoorLocks,
} from './rules/doorLocks';
import { dropAlpha } from './rules/blood';
import { freshGhosts, ghostAge, ghostAlpha, GHOST_LIVE } from './rules/ghosts';
import { freshLamps, lampGlow, switchLamp, type Lamps } from './rules/lamps';
import {
  ABILITIES,
  ABILITY_HINTS,
  ABILITY_LABELS,
  COLOURS,
  goalPrecision,
  loadSetup,
  lockTechnician,
  roundKindOf,
  sameSetup,
  saveSetup,
  SEAT_LABELS,
  roleName,
  seatAbilities,
  VR_KEEPS_TECHNICIAN,
  withPower,
  withWho,
  type MyRole,
  type RoundSetup,
  type SeatId,
} from './rules/roundSetup';
import {
  applyIntent,
  intentOf,
  loadLobby,
  saveLobby,
  type Intent,
  type LobbyChoice,
} from './rules/lobby';
import {
  asIntent,
  HOST_BUSY,
  ROOM_BUSY,
  ROUND_STOPPED,
  SHIP_NEEDS_TECHNICIAN,
  SHIP_OCCUPIED,
  SUIT_FIRST,
  SUIT_OFF,
  SUIT_ON,
  DESK_IN_VR,
  DESK_SUITED,
  shipStart,
  startBlocker,
  startedRound,
  STOP_SENT,
  type RoundKind,
  type WorldMenuState,
} from './rules/worldMenu';
import { FLOW, roundMode, type RoundMode } from './rules/roundFlow';
import { pageHauntMenu } from './rules/menuPages';
import type { MapGoal } from './map/mapView';
import { VentFlapArt } from './vents/ventArt';
import { VentNet } from './vents/ventGraph';
import { VentTravel } from './vents/ventTravel';
import { VENTING_CEILING, VENTING_FLOOR } from './vents/npcVentRide';
import type { MonsterDriver } from './monster/monsterDriver';
import { NetMonsterControl } from './monster/netMonsterControl';
import { NetMonsterPort } from './monster/netMonsterPort';
import { rescueHeight } from '../shared/fallRescue';
import type { MapSnapshot } from './map/mapSnapshot';
import { FlatRound, type FlatEvent, type FlatInput } from './map/flatRound';
import { ownerOf, seatOf, seating, type Claim, type StationId } from './stations';
import {
  claimMessage,
  flipMessage,
  releaseMessage,
  handoverMessage,
  HAUNT_CHANNEL,
  hauntRoomFrom,
  pickGameHost,
  readClaim,
  readFlip,
  readPin,
  pinMessage,
  readHandover,
  readRelease,
  readMonsterInput,
  readSetupMessage,
  readSharedSetup,
  readStart,
  readState,
  readStop,
  setupMessage,
  startMessage,
  stateMessage,
  stopMessage,
  type HauntBooks,
  type HauntState,
  type MonsterBook,
} from './net';
import type { GridPlan } from '../grid/gridPlan';
import { clearPlanWalls, planShelfWalls } from '../grid/shelfWalls';
import type { PhysicsBody } from '../../physics/PhysicsWorld';
import type { MenuEntry } from '../../ui/menu';
import { BlueprintArt } from './world3d/blueprintArt';
import { TopDownFog } from './world3d/topDownFog';
import { loadBlueprintShown, saveBlueprintShown } from './world3d/blueprint';
import type { ToolChoice, WorldContext } from '../../core/types';
import type { HintZone } from '../../core/controlHints';
import type { PlanSolid, PlanSolidKind } from '../grid/solids';
import type { PlateTile } from '../shared/plateField';
import type { Handedness } from '../../core/XRInput';
import { CommandBots } from './world3d/commandBots';
import {
  MAX_BOTS,
  MISSING_TEXT,
  ROUND_TYPE_LABELS,
  fillSeats,
  loadCrew,
  monsterPaceLabel,
  nextBotCount,
  nextMonsterPace,
  saveCrew,
  type CrewSettings,
  type Takers,
} from './rules/crewBots';

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
const _zero = new THREE.Vector3();
/** Der Stock in Ruhe — wenn das Gestell außerhalb der Karte steht oder im Schrank. */
const IDLE_INPUT: FlatInput = { x: 0, z: 0, sprint: false };
/** Der Bogen einer Tür auf dem Blatt des Archivars — symbolisch, nicht so breit wie die Öffnung. */
const PAPER_ARC = 1.2;
const STATE_RATE = 1 / 4;
/**
 * Wie oft die Sitzordnung der Zentrale im Schiff neu gerechnet wird, in
 * Millisekunden (`crewPlace`) — so oft, wie die Plätze angesagt werden.
 */
const CREW_PLACE_RATE = 250;
/**
 * **So lange rückt man auf den Startplatz nach**, in Sekunden gespielter
 * Bilder (`settleSpawn`) — die Mitspieler melden sich nach dem Verbinden
 * innerhalb einer, höchstens zweier Sekunden. Gezählt in Bildern und nicht
 * auf der Uhr: Ein Tab im Hintergrund bekommt keine, und wer erst danach
 * hinschaut, soll trotzdem auf seinem Platz stehen.
 */
const SPAWN_SETTLE = 4;
/** Die Pose, die einen Mitspieler aus dem Bild nimmt (`RemoteAvatars.placement`). */
const HIDDEN_POSE: PeerPose = {
  head: [0, 0, 0, 0, 0, 0, 1],
  left: null,
  right: null,
  hidden: true,
};
/**
 * Wie lange nach einem eigenen Tipp auf die Tafel der Stand des Gastgebers
 * sie **nicht** überschreibt, in Millisekunden — genug für Hin- und Rückweg
 * über die Leitung, kurz genug, dass eine abgewiesene Änderung nicht stehen
 * bleibt.
 */
const SETUP_GRACE = 1500;
/** Was das Telefon sagt, wenn der Start an den Techniker im Schiff geht. */
export const START_SENT = 'Start geht an den Techniker im Schiff — die Runde beginnt bei ihm.';
/** Und was der Gastgeber einem Startwunsch entgegnet, solange seine Runde läuft. */
export const ROUND_RUNNING = 'Die Runde läuft schon — ein zweiter Start bricht sie nicht ab.';
/**
 * **Wie lange ein frischer Gastgeber auf die Übergabe des alten wartet**, in
 * Sekunden.
 *
 * Solange er wartet, rechnet er nicht: Zwei, die gleichzeitig das Monster
 * bewegen, ziehen es zwischen sich hin und her, und wer zusieht, sieht ein
 * zuckendes Vieh. Zwei Sekunden sind acht Ansagen im Stand-Takt — reichlich
 * Zeit für eine Nachricht, die schon unterwegs ist, und kurz genug, dass eine
 * Runde nicht stehen bleibt, wenn der alte Gastgeber gar nicht mehr da ist
 * (zugeklappter Laptop: dann kommt nie eine Übergabe, und die Runde muss
 * trotzdem weitergehen).
 */
const HANDOVER_WAIT = 2;

/**
 * **Was das Telefon am Monster hört, wenn niemand den Anzug trägt.** Das
 * Monster jagt im Schiff, und das Schiff rechnet dort, wo der Techniker ist
 * (`stepKernel`, Rolle `vr`). Bis zum 1-m-Gitter öffnete das Telefon dafür die
 * gemalte Karte mit einem Techniker aus Zahlen; die Karte ist weg
 * (`docs/plan-haunting-1m.md`), also braucht die Runde einen Techniker im
 * Raum — einen Menschen oder eine Bot-Runde auf einem Bildschirm.
 */
export const MONSTER_NEEDS_TECHNICIAN =
  'Monster ohne Techniker: Erst muss jemand im Schiff stehen — Brille, „Web 3D" oder „Zuschauen" auf einem Bildschirm.';

/** Und wie oft das Telefon am Monster seinen Stock ansagt. */
const MONSTER_RATE = 1 / 10;
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
/** Und der Öffnungswinkel, wenn der Zuschauer durch die Augen des Technikers sieht. */
const EYES_FOV = 78;
/** Augenhöhe für den Techniker, der nur Ort und Gierwinkel schickt (Bot, 2D), in Metern. */
const EYES_HEIGHT = 1.6;

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
/** So hell brennt eine Deckenleuchte der Einsatzzentrale (`buildDusk`) — Tageslicht. */
const COMMAND_LAMP = 28;
/** Und so weit reicht sie, in Metern — bis knapp hinter die Fensterfront. */
const COMMAND_LAMP_REACH = 12;
/** Wie schnell ihr Licht abfällt — flacher als echt, damit die Ecken nicht absaufen. */
const COMMAND_LAMP_DECAY = 1.2;
/** Die Farbe: kühles Tageslicht statt warmer Abendlampe. */
const COMMAND_DAYLIGHT = 0xf2f6ff;
/** Die Figur, die der Monster-Anzug leiht — der Roboter des Verlorenen (`actorFit.ts`). */
const MONSTER_FIGURE = 'mystery-monthly-4/12-june-2024-robot/characters/Robot_Two.glb';
/** Die Farbe des Monsters — dieselbe wie sein Platz am Telefon (`haunting.css`). */
const MONSTER_COLOUR = 0xff4d55;
/** Wie hell das Licht um das Monster ist, das ein Mensch steuert (`monsterSight`). */
const MONSTER_SIGHT = 14;

/** Die Lampe eines Zimmers: das Licht und das Glas, das zeigt, dass es an ist. */
interface Lamp {
  at: THREE.Vector3;
  /** Wie weit ihr Licht reicht: bis knapp hinter die fernste Ecke ihres Raums (`lampReach`). */
  reach: number;
  color: number;
  glass: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
}

const _lampOff = new THREE.Color(0x010203);
const _beaconOff = new THREE.Color(0x2b0d10);
const _beaconOn = new THREE.Color(0xff4d55);
const _lampOn = new THREE.Color(0xfff0cf);
/** Das Glas im Notfall — dasselbe Rot wie die Drehleuchten. */
const _lampAlarm = new THREE.Color(0xff3a30);
/** Das Licht der Raumlampen im Notfall. */
const LAMP_ALARM = 0xff2a18;
const _head = new THREE.Vector3();
const _feet = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _landing = new THREE.Vector3();
const _couch = new THREE.Vector3();
const _walker = new THREE.Vector3();
/** Zeilen der Welt, die der Rechner _Spiel-Einstellungen_ nicht mehr zeigt (`menu`). */
const DROPPED = new Set([
  'grid:day',
  'orbital:home',
  'orbital:restart',
  'orbital:sensor',
  'orbital:heal',
  'orbital:leave',
]);
/** Die Mitte des Sofas der Sitzecke (`world3d/commandRoom.LOUNGE_SPOTS`, zwei Kacheln). */
const COUCH_CENTRE = { x: 5, z: APRON.z + 11.5 };
const _down = new THREE.Vector3(0, -1, 0);
/** Wie hoch über der Stelle der Bodenstrahl beim Versetzen ansetzt, in Metern. */
const RESPAWN_PROBE = 3;
const _size = new THREE.Vector2();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
/** Die Schnittebene, die dem Zuschauer die Decke abnimmt — einmal gebaut. */
const _lid = new THREE.Plane(new THREE.Vector3(0, -1, 0), SHOW_CUT);
const _noLid: THREE.Plane[] = [];
const _lidOn = [_lid];

/**
 * **Der Same der Station — fest.** Der Grundriss ist die Skeld-Karte, aber
 * Fenster, Sicherungskasten, Aufgaben und Schalttafel würfelt der Same
 * (`house.generateHouse`). Seit die Station im Baukasten umgebaut wird, steht
 * sie jedes Mal gleich da: Was umgebaut wird, soll beim nächsten Laden an
 * derselben Stelle passen.
 */
export const STATION_SEED = 1;

export class HauntingWorld extends FurnishedWorld {
  /**
   * **Die Ansicht von oben ist die des Kerns** (`core/TopDownCamera.ts`):
   * dieselbe Szene, in der die Brille steht, schräg von oben — aufgeschnitten
   * über der Ebene des Rigs, Wände vor der Figur durchsichtig, Gitterlinien
   * auf Wunsch. Bis September 2026 malte Haunting hier eine eigene 2D-Karte
   * (`map/flatMode.ts`, `map/flatScene.ts`) und schützte sie mit dieser
   * Marke; die Karte ist weg (Plan H, `docs/plan-haunting-1m.md`), die Runde
   * rechnet unverändert (`flatKernel.ts`), nur ihr Bild ist jetzt das Schiff.
   */
  readonly ownsFlat = false;

  /** Der Bauplan dieser Runde. Steht vor dem ersten `layout()` fest. */
  private spec: HouseSpec = generateHouse(STATION_SEED, 8);
  /** Die Wände der Station aus dem Regal (`placeStationWalls`) — und für welches Haus. */
  private stationShelf: PhysicsBody[] = [];
  private stationShelfFor = '';
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
  /**
   * **Ob dieses Gerät den Anzug trägt** — also der Techniker ist. Bis Oktober
   * 2026 war die Brille das von selbst, und ein Bildschirm wurde es über die
   * Startseite oder den Reiter „Techniker" (damals `flatTechnician`). Jetzt
   * zieht man den Anzug **am Ständer in der Einsatzzentrale** an
   * (`world3d/commandRoom.SUIT_SPOT`), in der Brille wie am Bildschirm.
   * Gewünscht: _„Der techniker muss den techniker anzug ausrüsten der als
   * interaktion item rumsteht."_ Gerechnet wird mit der Rolle, die daraus
   * folgt (`roleCtx`): im Anzug `vr`, ohne ihn nicht.
   */
  private suited = false;
  /**
   * **An welchem Rechner der Zentrale ich sitze** — `null`, solange ich
   * herumlaufe. Wer nicht im Anzug steckt, ist eine Figur in der Zentrale wie
   * jede andere; erst `A` an einem der vier Monitore setzt ihn auf dessen Platz,
   * und dann liegt die Seite der Zentrale (`StationUi`) über dem Bild.
   * Gewünscht: _„Auch die techniker mit dem handy bekommen ganz normal
   * rumlaufende charaktere wie spieler von oben, können nur mit einem computer
   * in der einsatzzentrale interagieren um deren plätze dort einzunehmen."_
   */
  private atDesk = false;
  /**
   * **Mein Startplatz** (`world3d/commandRoom.spawnSlot`) und wann ich dort
   * abgesetzt wurde. Die Spielernummer kennt man erst, wenn die Leitung steht
   * — beim Betreten aus dem Hub verbindet die Welt sich selbst (`joinTable`),
   * und die Mitspieler melden sich eine Sekunde später. Solange man noch nicht
   * losgegangen ist, rückt man deshalb ein paar Sekunden lang auf den Platz
   * nach, der jetzt stimmt (`settleSpawn`).
   */
  private spawnRank = 0;
  /** Wie viele Sekunden noch nachgerückt wird — gezählt in Bildern, nicht auf der Uhr. */
  private spawnSettle = 0;
  private readonly spawnedHere = new THREE.Vector3();
  /** Die Spielelemente der Zentrale, wie sie stehen (`placeCommandRoom`). */
  private readonly commandPlaced: PlacedElement[] = [];
  /** Die Körper ihrer Grundflächen in der Physik — zum Abräumen. */
  private readonly commandSlabs: THREE.Mesh[] = [];
  /** Die Anker, an denen `A` hängt — Monitore, Anzug, Rechner. */
  private readonly commandUsables: THREE.Object3D[] = [];
  /**
   * **Was am Ständer hängt** — Beine, Rumpf, Rucksack, Helm. Trägt jemand den
   * Anzug, hängt er nicht mehr dort (`showSuitStand`): So sieht jeder in der
   * Zentrale, ob der Techniker schon draußen ist.
   */
  private suitParts: THREE.Object3D[] = [];
  /** Was am Monster-Ständer hängt — leer, solange ihn jemand trägt. */
  private monsterParts: THREE.Object3D[] = [];
  /** Die Bürostühle vor den Rechnern, je Farbplatz — dort sitzt, wer Platz nimmt. */
  private readonly chairAnchors = new Map<CommandDesk['station'], THREE.Object3D>();
  /** Die Schilder der Zentrale und was zuletzt darauf gemalt wurde (`refreshSigns`). */
  private readonly commandSigns: Array<{
    id: string;
    x: number;
    y: number;
    z: number;
    /** Wohin es schaut, um die Hochachse — 0 nach Süden. */
    yaw: number;
    colour: number;
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null;
    text: string;
  }> = [];
  private signClock = 0;
  /** Ob dieses Gerät den Monster-Anzug trägt (`toggleMonsterSuit`). */
  private monsterSuited = false;
  /** Rundentyp und Bots der Zentrale (`rules/crewBots.ts`) — je Gerät gespeichert. */
  private crewSettings: CrewSettings = loadCrew();
  /**
   * **Das Monster-Tempo der laufenden Runde** (`CrewSettings.monsterPace`):
   * die eigene Einstellung — oder die, die ein anderes Gerät beim Start
   * mitgeschickt hat (`startCrewRound`). Gerechnet wird nur beim Gastgeber.
   */
  private monsterPace = this.crewSettings.monsterPace;
  /** Die Bots der Zentrale als Figuren (`world3d/commandBots.ts`). */
  private crewBots: CommandBots | null = null;
  /** Ob beim letzten Bild eine Runde lief — für `CommandBots.release`. */
  private botsInRound = false;
  /** Ob es gerade das Monster steuert — eine Runde mit Monster läuft (`driveMonster`). */
  private drivingMonster = false;
  /**
   * **Was das Monster im Dunkeln sieht** — ein schwaches rotes Licht um die
   * eigene Figur, nur auf dem Gerät dessen, der es steuert (die Szene gehört
   * jedem Gerät selbst). Ohne es stand der Monster-Spieler in einer dunklen
   * Station und sah nichts; die Karte des Telefons hatte ihm gezeigt, was das
   * Monster wahrnimmt.
   */
  private readonly monsterSight = new THREE.PointLight(0xff5a5a, 0, 8, 2);
  /** Hochgezählt beim Abräumen: Was danach noch aus dem Netz kommt, wird verworfen. */
  private commandRound = 0;
  /** Welche Seite der Zentrale nach dem Ablegen des Anzugs aufgeht (`leaveSuit`). */
  private pendingConsole: MyRole | 'setup' | null = null;
  /**
   * Ob der Bordstock der Seite gerade gezeigt wird (`WorldContext.touchStick`)
   * — gemerkt, damit `syncTouchStick` ihn nur bei einem Wechsel anfasst.
   */
  private stickShown: boolean | null = null;
  /** Der Strahl, der beim Versetzen den Boden sucht (`movePlayerTo`). */
  private readonly floorRay = new THREE.Raycaster();
  private pendingBotRound = false;
  private readonly automaticDoors = new AutomaticDoors();
  private hearing = new Map<number, number>();
  private perceptionClock = 0;
  private readonly technicians = new Map<string, number>();
  /**
   * **Wo die Zentrale im Schiff sitzt** (`world3d/commandSeats.ts`), je
   * Mitspieler — für `RemoteAvatars.placement`. Ein paarmal in der Sekunde
   * neu gerechnet (`crewPlace`), nicht je Bild und Mitspieler: Die Ansprüche
   * ändern sich in Sekunden, nicht in Millisekunden.
   */
  private crewPlaces = new Map<string, PeerPose>();
  private crewPlacedAt = -Infinity;
  private lampPool: THREE.PointLight[] = [];
  private testLight: THREE.AmbientLight | null = null;
  /** Die Deckenleuchten der Einsatzzentrale (`buildDusk`). */
  private readonly commandLights: THREE.PointLight[] = [];
  private readonly fixtureSlabs: THREE.Object3D[] = [];
  private readonly fixtureMaterial = new THREE.MeshBasicMaterial({ visible: false });
  private nextPhoneRender = 0;
  private phoneRenderView = '';
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
  private culledTopDown = false;
  private readonly navigationOverlay = new NavigationOverlay();
  /**
   * **Die Grundriss-Vorlage am Boden** (`world3d/blueprint.ts`) — zum
   * Vergleichen, wo das Raster von der Zeichnung abweicht. Aus, bis jemand
   * sie einschaltet; gemerkt wird es je Gerät.
   */
  private readonly blueprint = new BlueprintArt();
  private blueprintShown = loadBlueprintShown();
  /** Von oben die Deckel über Räumen, die die Figur nicht sieht (`world3d/topDownFog.ts`). */
  private fog: TopDownFog | null = null;
  /**
   * **Der Rechenkern** (`flatKernel.ts`): die 2D-Runde, die im Schiff des
   * Gastgebers rechnet. `null`, bis das erste Bild ihn stellt oder nachdem
   * eine neue Runde, ein Ansichtswechsel oder eine Übergabe ihn abgelöst hat.
   */
  private kernel: FlatKernel | null = null;
  /** Der Stock geht in den Kern statt in die Physik (`kernelLocomotion.ts`). */
  private kernelLoco: KernelLocomotion | null = null;
  /** Der Kopf nach dem letzten Nachführen — die Differenz ist der Schritt des Körpers im Spielraum. */
  private kernelHead: THREE.Vector3 | null = null;
  /** Bücher, die auf den nächsten Kern warten (Übergabe, Ansichtswechsel). */
  private pendingBooks: HauntBooks | null = null;
  /**
   * **Der Körper des Technikers, der in 2D spielt.**
   *
   * Seine Stelle steht seit `STATION_PROTOCOL` 7 im Stand
   * (`HauntState.technician`) — die Karte des Monster-Telefons zeichnet ihn
   * daraus längst, die 3D-Welt aber gar nicht: Wer am Fernseher zusah, sah
   * eine leere Station, in der Türen von selbst aufgingen. Ein Akteur der
   * Sorte `crew` reicht (`actorArt.buildActor`): das Mannequin aus dem Regal,
   * bis es da ist der gebaute Crewmate, und beide stehen dort, wo der Stand
   * ihn hinsetzt.
   */
  private technicianArt: ShipActor | null = null;
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
  /**
   * Was `PlayerRig.pace` je Bild liest — seit die Puste in der 2D-Runde
   * gerechnet wird (`flatKernel.ts`), bleibt sie hier bei 1: Der Wunsch der
   * Bedienung wird am Tempo des Gestells normiert (`kernelInput`), das
   * Tempo selbst macht die Runde.
   */
  /**
   * **Der Würfel der Routine kommt aus dem Samen der Station** — wie in der
   * 2D-Runde (`FlatRound`, `seed ^ roll`). Vorher stand hier eine Konstante,
   * und eine Brillenrunde war aus ihrem Samen nicht nachzuspielen.
   */
  private routineDice = new Rng(0x4d4f4e53);
  /** Der Würfel der Stationsfehler — eigener Strom, damit er das Monster nicht verschiebt. */
  private readonly glitchDice = new Rng(0x53434854);
  /** Welches Schott gerade grundlos offen steht (`rules/doorGlitch.ts`) — beim Gastgeber. */
  private glitch: DoorGlitch = freshGlitch(() => this.glitchDice.next());
  private simulationSpeed: SimulationSpeed = 1;
  /** Wie das Deck in der Bot-Runde ausgeleuchtet ist (`botLighting.ts`). */
  private botLighting: BotLighting = { ...DEFAULT_LIGHTING };
  /**
   * **Das Lüftungsnetz und die Fahrt des Monsters darin** (`vents/`). Beide
   * von außen lesbar, damit ein Steuer übers Netz `ventRide.enter`, `exit`
   * und `cancel` rufen kann. Das Netz wird einmal gebaut: Der Grundriss ist
   * über alle Seeds derselbe (`house.ts`), und `ventGraph.test.ts` prüft die
   * Daten gegen mehrere davon.
   */
  readonly vents: VentNet = new VentNet(this.spec);
  readonly ventRide: VentTravel = new VentTravel(this.vents);
  /** Die Klappen in 3D, von denen eine offen stehen kann. */
  private ventArt: VentFlapArt | null = null;
  /**
   * **Das Steuer der Station `monster` übers Netz** (`monster/netMonsterControl.ts`):
   * führt beim Gastgeber aus, was das Telefon sagt — als `driver` der Runde,
   * die gerade rechnet: des Kerns (`flatKernel.ts`), einer `FlatRound`.
   */
  private readonly netMonster = new NetMonsterControl({
    house: () => this.runningRound()?.house ?? this.spec,
    state: () => this.state,
    rider: () => this.runningRound()?.monster ?? null,
    ride: () => this.runningRound()?.ventRide ?? this.ventRide,
    // Die Buchführung der Sperren und die Uhr: Ohne sie kann das Monster
    // keine Stahltür aufziehen (`rules/doorLocks.ts`).
    locks: () => this.locks,
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

  /** Wer welche Tür gesperrt hat, und wie lange zugefallene halten (`rules/doorLocks.ts`) — beim Gastgeber. */
  private locks: DoorLocks = freshLocks();
  /** Welche Lampen die Tafel angemacht hat und wie lange sie noch brennen (`rules/lamps.ts`) — beim Gastgeber. */
  private lampBook: Lamps = freshLamps();
  /** Die Verteilung der nächsten Runde: Techniker, Monster, Plätze (`rules/roundSetup.ts`). */
  private setup: RoundSetup = loadSetup();
  /**
   * **Wann dieses Gerät die Tafel zuletzt selbst angefasst hat** (`clock()`).
   *
   * Die Tafel des Gastgebers kommt viermal je Sekunde mit dem Stand, und die
   * eigene Änderung ist gerade erst zu ihm unterwegs: Wer den fremden Stand
   * sofort übernähme, sähe seinen Tipp für einen Augenblick zurückspringen,
   * bevor er vom Gastgeber wiederkommt. Solange `SETUP_GRACE` läuft, gilt
   * deshalb die eigene Tafel.
   */
  private setupTouchedAt = -Infinity;
  /** Bei allen anderen nur das Monster an der angesagten Stelle (`actorArt.ts`). */
  private blob: ShipActor | null = null;
  /** Für welche Runde die Shader schon vorab übersetzt sind (`warmShaders`). */
  private warmedFor = '';
  /**
   * **Die Programme des alten Hauses** (`core/programHold.ts`): Beim Neubau
   * der Station (`newRound`, `mountExperience`) geben die alten Materialien
   * ihre Shader erst her, wenn das neue Haus übersetzt ist (`warmShaders`).
   */
  private readonly programs = new ProgramHold();
  /** Die gebaute Station und wofür (`buildHouse`) — bleibt, solange der Plan gleich ist. */
  private shipArt: THREE.Group | null = null;
  private shipArtKey = '';
  /** Wie lange die Runde schon läuft, bis vorab übersetzt wird. */
  private warmClock = 0;
  /** Die flachen Flecken auf dem Boden — Weltgeometrie, damit sie in der Brille steht. */
  private bloodArt: THREE.Group | null = null;
  /**
   * **Der Ghost des Monsters** (`rules/ghosts.ts`): eine halbdurchsichtige
   * Kopie des Monstermodells an der zuletzt gesehenen Stelle. Auch das ist
   * Weltgeometrie und kein Bildschirmzeichen — sonst gäbe es sie im Headset
   * nicht, und ausgerechnet dort braucht man sie am meisten.
   */
  private ghostArt: ShipActor | null = null;
  /** Die eine Scheibe, aus der alle Blutflecken gemacht sind. */
  private bloodShape: THREE.CircleGeometry | null = null;

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

  private topCam: THREE.OrthographicCamera | null = null;
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
  /** Welches Zimmer der Archivar aufgeschlagen hat — `''` heißt: keine Akte. */
  private archiveRoom = '';
  /**
   * **Der Tisch des Archivars** (`views/archiveDesk.ts`): das Loch, durch das
   * diese Welt ein einzelnes Zimmer zeichnet, und die zwei Griffe dazu. Er
   * geht über `RoleHost.extra` an die Rollenansicht; die 2D-Welt hat keinen
   * und zeigt an derselben Stelle eine herangezoomte Karte.
   */
  private readonly desk: ArchiveDesk = {
    open: (roomId) => {
      this.archiveRoom = roomOf(this.spec, roomId)?.id ?? '';
      this.archive = homeView();
    },
    view: () => this.archive,
    zoom: (factor) => this.zoomArchive(factor),
    pan: (dx, dz) => this.panArchive(dx, dz),
    home: () => {
      this.archive = homeView();
    },
  };

  private ui: StationUi | null = null;
  /**
   * **Was ich vorhabe und wer ich bin** — die Wahl der Lobby
   * (`rules/lobby.ts`), gemerkt im Browser: Wer am Telefon spielt, setzt sie
   * nicht jedes Mal neu.
   */
  private lobbyChoice: LobbyChoice = loadLobby();
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
  /**
   * **Bis wann auf die Übergabe des alten Gastgebers gewartet wird**, auf der
   * Uhr dieses Geräts (`clock()`); `0` heißt: es wird nicht gewartet.
   *
   * Solange die Frist läuft, rechnet dieses Gerät die Runde **nicht** weiter,
   * obwohl es schon Gastgeber ist. Das ist der Unterschied zwischen einem
   * Wechsel und einem Riss: Ohne die Frist rechnen für einen Augenblick beide,
   * der alte und der neue, und schieben sich zwei Monsterpositionen zu.
   */
  private handoverUntil = 0;
  private sendTimer = 0;
  /**
   * Woran erkannt wird, dass sich an den Türen etwas geändert hat — und das
   * Fragezeichen heißt „noch nie gebaut". Es unterscheidet den ersten Aufbau
   * von einer Tür, die zufällt: Nur die zweite macht ein Geräusch.
   */
  private builtDoors = '?';
  /** Die Wandläufe dieses Neubaus, je Quader des Grundrisses (`gridSolidBuilt`). */
  private wallRuns = new Map<THREE.Object3D, WallRun>();
  /** Sturz, Brüstung und Pfosten je Tür- oder Fensterkante (`onOpening`). */
  private openingSolids = new Map<string, THREE.Object3D[]>();
  private openings = new Map<string, 'door' | 'window'>();
  private openingPlan: GridPlan | null = null;
  private openingVersion = -1;
  /** Die Wände aus dem Regal über diesen Läufen (`world3d/stationWalls.ts`). */
  private stationWalls: StationWalls | null = null;
  /** Das Material der Wandquader — unsichtbar, sobald die Wände aus dem Regal stehen. */
  private runMaterial: THREE.Material | null = null;
  /** Die Knöpfe vor und hinter jeder Tür (`world3d/doorButtons.ts`). */
  private doorButtons: DoorButtons | null = null;
  private buttonDoors: ButtonDoor[] = [];
  /** Auf welchen Türknöpfen gerade jemand steht — je Bild neu (`pressButtons`). */
  private readonly pressedDoors = new Set<string>();
  /** Vor welchen Türen jemand höchstens zwei Felder entfernt steht (`DOOR_OPEN_DEPTH`). */
  private readonly approachedDoors = new Set<string>();
  /** Welche Türen `applyDoors` in diesem Bild offen hat — für das Bild der Blätter. */
  private readonly openDoors = new Set<string>();

  // --- die Welt ------------------------------------------------------------

  protected override layout(): GridPlan {
    this.planFor = this.state.shut.length ? '' : `${this.spec.seed}|${this.spec.rooms.length}`;
    return this.stationPlan(new Set(this.state.shut));
  }
  /**
   * Für welche Station das Gitter steht — eine neue Runde auf derselben
   * Station tauscht es nicht noch einmal aus (`newRound`): Die Türen stellt
   * ohnehin jedes Bild `applyDoors`, und der Neubau des Gitters kostete beim
   * Rundenstart eine Viertelsekunde.
   */
  private planFor = '';

  /**
   * **Der Grundriss der Station ohne feste Wände** — die stehen als
   * Regalstücke (`placeStationWalls`), genau wie in der Testwelt. Gewünscht:
   * _„die haunting nutzt nicht die gleichen walls wie in test welt, da in
   * haunting die wände nicht sauber durchgängig sind. Bitte sowas komplett
   * vermeiden"_. Türen und Fenster bleiben Teil des Plans.
   *
   * Die Runde selbst (Monster, Bots, Wege, `StationTravelPlan`) rechnet weiter
   * mit dem vollen Grundriss aus `housePlan` — sie hängt am Samen, nicht an
   * dem, was hier steht.
   */
  private stationPlan(shut: ReadonlySet<string>): GridPlan {
    const plan = housePlan(this.spec, new Set(shut));
    clearPlanWalls(plan);
    return plan;
  }

  /**
   * **Die Wände der Station aus dem Regal aufstellen** — aus den festen
   * Wänden und Schrägen des vollen Grundrisses (`shelfWalls.planShelfWalls`):
   * ungestreckte ganze und halbe `prototype-bits/Wall.glb` auf den Fugen, unter
   * 45° ein Stück je Kachel. Eingerastet sind sie Wände auf dem Zellgitter
   * (`GridWorld.collectWalls`), und im Baukasten lassen sie sich verschieben
   * und ersetzen. Ein anderes Haus (Raumzahl, Test) räumt die alten weg.
   */
  private placeStationWalls(): void {
    const key = `${this.spec.seed}:${this.spec.rooms.length}`;
    if (key === this.stationShelfFor || !this.context || !this.physics) return;
    for (const entry of this.stationShelf) if (!entry.removed) this.removeProp(entry, true);
    this.stationShelf = [];
    this.stationShelfFor = key;
    for (const wall of planShelfWalls(housePlan(this.spec)))
      void this.placeModel(wall.path, new THREE.Vector3(wall.x, wall.y, wall.z), wall.yaw).then(
        (entry) => {
          if (!entry) return;
          // Kam es an, als schon ein anderes Haus stand: gleich wieder weg.
          if (this.stationShelfFor !== key) this.removeProp(entry, true);
          else this.stationShelf.push(entry);
        },
      );
  }

  /**
   * **Die Einrichtung der Station sperrt ihre Zellen** — auch für den
   * Spieler, den die Physik trägt (Mitspieler, Lehrzimmer): Möbel des Packers
   * (`stationLayout`) stehen nicht als Bausteine im Plan, und über das Gehen
   * entscheidet allein das Gitter (`map/stationCells.ts`).
   */
  protected override cellBlocked(ix: number, iz: number, level: number): boolean {
    return stationFixtureCells(this.spec).has(cellKey(ix, iz, level));
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

  /**
   * Die Wand im Grau der Wand aus dem Regal: Tür- und Fensterteile bleiben
   * gebaute Quader und stehen zwischen den Läufen aus `prototype-bits/Wall.glb`.
   */
  protected override tint(): Partial<Record<PlanSolidKind, number>> {
    return { floor: 0x3a4b58, wall: 0x8b9099, wood: 0x4c6370, door: 0x536d7b };
  }

  /**
   * **Keine Bündel**: Von oben macht der Kern Wände vor der Figur durchsichtig
   * (`core/TopDownCamera.ts`, Ghosting), und das geht nur je Quader. Damit die
   * Zahl der Quader trotzdem klein bleibt, legt `StationPlan.solids()` Böden
   * je Raum und Wände in Läufen zusammen (`plan.ts`).
   */
  protected override batchGridGeometry(): boolean {
    return false;
  }

  protected override gridDoorVisible(): boolean {
    return false;
  }

  protected override slidingGridDoors(): boolean {
    return true;
  }

  /**
   * **Der Boden der Station ist die Bodenplatte aus dem Regal** — `Floor`,
   * die erste der drei im Prototyp-Paket (`prototype-bits/Floor.glb`), eine je
   * Kachel. Gewünscht war: _„Nutze als Floor innerhalb der Space Station bitte
   * den Floor Floor, also der erste."_ Wie in der Testwelt verschwinden die
   * Bodenquader darunter, sobald die Platten liegen (`GridWorld.plateArrived`);
   * wo keine Kachel ist, ist Weltraum.
   */
  protected override floorPlate(_tile: PlateTile): string | null {
    return STATION_FLOOR;
  }

  /**
   * Die Wandläufe, Türstürze und Fensterteile bekommen ein eigenes Material —
   * es geht aus, wenn Wände, Durchgänge und Fenster aus dem Regal stehen
   * (`world3d/stationWalls.ts`).
   */
  protected override solidMaterial(solid: PlanSolid): THREE.Material {
    const base = super.solidMaterial(solid);
    if (!wallRun(solid) && !this.onOpening(solid)) return base;
    this.runMaterial ??= base.clone();
    return this.runMaterial;
  }

  protected override gridSolidBuilt(mesh: THREE.Mesh, solid: PlanSolid): void {
    const run = wallRun(solid);
    if (run) {
      this.wallRuns.set(mesh, run);
      return;
    }
    const key = this.onOpening(solid);
    if (!key) return;
    const list = this.openingSolids.get(key) ?? [];
    list.push(mesh);
    this.openingSolids.set(key, list);
  }

  /**
   * **Ob ein Quader zu einer Tür oder einem Fenster gehört** — ein Sturz, eine
   * Brüstung, ein Pfosten — und wenn ja, der Schlüssel ihrer Kante.
   */
  private onOpening(solid: PlanSolid): string | null {
    if (solid.kind !== 'wall' || solid.door !== undefined || wallRun(solid)) return null;
    const key = edgeKeyAt(solid.x, solid.z, solid.w > solid.d);
    return this.openingEdges().has(key) ? key : null;
  }

  /** Die Kanten mit Tür oder Fenster im Plan, je Planstand einmal gerechnet. */
  private openingEdges(): ReadonlyMap<string, 'door' | 'window'> {
    const plan = this.grid;
    if (!plan) return new Map();
    if (this.openingPlan === plan && this.openingVersion === plan.version) return this.openings;
    this.openingPlan = plan;
    this.openingVersion = plan.version;
    this.openings = new Map();
    for (const [key, wall] of plan.graph.wallEntries()) {
      if (wall.kind === 'solid') continue;
      const tile = wallTile(key);
      if (keyLevel(tile) !== 0) continue;
      const dir = wallDir(key);
      const at = edgeCentre(keyX(tile), keyZ(tile), dir);
      this.openings.set(edgeKeyAt(at.x, at.z, at.alongX), wall.kind);
    }
    return this.openings;
  }

  /** Der Grundriss steht neu — also auch Wände, Durchgänge und Fenster aus dem Regal. */
  protected override gridRebuilt(): void {
    this.stationWalls?.dispose();
    const runs = [...this.wallRuns].map(([solid, run]) => ({ solids: [solid], run }));
    this.wallRuns = new Map();
    const features = this.stationFeatures();
    this.openingSolids = new Map();
    const material = this.runMaterial;
    if (material) material.visible = true;
    this.stationWalls = new StationWalls(this.root, runs, features, () => {
      if (material) material.visible = false;
    });
  }

  /**
   * **Die Durchgänge und Fenster aus dem Regal** — an jeder Tür der breite
   * Durchgang (`STATION_DOORWAY_WIDE`, zwei Kacheln) bzw. der schmale für eine
   * einzelne Kante, an jedem Fenster das schmale Fenster mit grauem Rahmen
   * (`STATION_WINDOW`).
   */
  private stationFeatures(): StationFeature[] {
    const out: StationFeature[] = [];
    // Ein offener Durchgang hat keinen Rahmen (`HouseDoor.passage`).
    const doors: Array<{ x: number; z: number; dir: Dir; span?: number }> = [
      ...leafDoors(this.spec),
    ];
    const doorEdgeKeys = new Set<string>();
    for (const door of doors) {
      const middle = doorMiddle(door);
      const alongX = edgeCentre(door.x, door.z, door.dir).alongX;
      const solids: THREE.Object3D[] = [];
      for (const edge of doorEdges(door)) {
        const at = edgeCentre(edge.x, edge.z, edge.dir);
        const key = edgeKeyAt(at.x, at.z, at.alongX);
        doorEdgeKeys.add(key);
        solids.push(...(this.openingSolids.get(key) ?? []));
      }
      out.push({
        path: doorWidth(door) > STATION_DOOR_W ? STATION_DOORWAY_WIDE : STATION_DOORWAY,
        x: middle.x,
        z: middle.z,
        alongX,
        base: 0,
        solids,
      });
    }
    for (const [key, kind] of this.openingEdges()) {
      if (kind !== 'window' || doorEdgeKeys.has(key)) continue;
      const at = edgeOfKey(key);
      out.push({ path: STATION_WINDOW, ...at, base: 0, solids: this.openingSolids.get(key) ?? [] });
    }
    return out;
  }

  protected override wallGhosted(mesh: THREE.Mesh, on: boolean): void {
    this.stationWalls?.ghost(mesh, on);
  }

  /**
   * **An jeder Hüfte eine Taschenlampe** — und deshalb kann keine verloren
   * gehen.
   *
   * Lange hing nur rechts eine, „damit eine Hand frei bleibt". Seit der
   * Techniker in der rechten Hand ein Ersatzteil trägt, war genau das die
   * Falle: Teil in der Hand, Lampe abgelegt, und der Weg zur Konsole ging
   * durch ein dunkles Schiff. Zwei Lampen kosten nichts — eine Hüfte merkt
   * sich ihre Bestückung und lässt nachwachsen, was von ihr kam
   * (`PortalWorld.stowTool`), also ist auch eine hingeworfene Lampe nach dem
   * nächsten Griff wieder da.
   */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [
      ['flashlight', 'left'],
      ['flashlight', 'right'],
    ];
  }

  /**
   * **Die Bildschirmhand des Kerns bleibt leer.** Was der Techniker am
   * Bildschirm in den Händen hält — Lampe, Radar, Röntgen, Medkit —, zeichnet
   * das Schiff selbst vor der Kamera (`ShipExperience.updateTools`); eine
   * zweite Lampe in der Hand des Kerns wäre eine zu viel.
   */
  protected override defaultScreenTool(): string | null {
    return null;
  }

  /**
   * **Der Werkzeug-Knopf** (`#hud-tool`): die Liste des Schiffs — Hand (leer)
   * vom Kern, Taschenlampe, Radar, Röntgen, Medkit (`ShipExperience.toolChoice`).
   * Ohne Schiff (in der Zentrale) gibt es keinen Knopf.
   */
  override toolChoice(): ToolChoice | null {
    if (!this.context || !this.experience || this.context.role !== 'vr') return null;
    return this.experience.toolChoice();
  }

  /**
   * **`A` benutzt** (am Schreibtisch `E`, `PlayerRig.requestUse`): erst die
   * Sonderfälle des Schiffs — Runde vorbei, im Schrank, Medkit in der Hand
   * (`ShipExperience.useSpecial`) —, dann das Ding vor der Figur über den
   * Kern (`pickUsable`), und liegt nichts vor einem, ist der Druck der
   * Lichtschalter (`ShipExperience.useEmpty`), wie der Besitzer es bestellt
   * hat.
   */
  protected override useForward(ctx: WorldContext): boolean {
    // **Als Monster ist `A` der eine Knopf des Monsters**: Klappe, Tür, Kabine
    // (`monster/monsterHelm.interact`) — wie der Knopf am Telefon.
    if (this.drivingMonster) {
      this.netPort?.act('interact');
      return true;
    }
    const experience = this.experience;
    if (experience?.useSpecial()) return true;
    if (super.useForward(ctx)) return true;
    return experience?.useEmpty() ?? false;
  }

  protected override welcome(): string {
    return 'HAUNTING / ORBITAL · Sichere Einsatzzentrale. Techniker: Anzug am Ständer anziehen. Zentrale: an einem Monitor Platz nehmen. Raum-Code am Rechner „Verbindung".';
  }

  /**
   * **Man fängt in der Einsatzzentrale an — jeder auf seinem Platz.** Bis
   * Oktober 2026 standen alle auf derselben Stelle (`COMMAND_HOME`), Figur in
   * Figur. Jetzt hat jede Spielernummer ihren Startplatz
   * (`world3d/commandRoom.spawnSlot`): Spieler 1 vorn links, die nächsten
   * daneben, ab dem fünften die zweite Reihe.
   */
  protected override spawnPoint(): THREE.Vector3 {
    const ctx = this.context;
    const slot = spawnSlot(ctx ? this.rankNow(ctx) : 0);
    return new THREE.Vector3(slot.x, 0, slot.z);
  }

  /**
   * **Wer versetzt wird, landet auf dem Boden — nicht darin.** Das Schiff
   * setzt den Spieler an vielen Stellen um (Zentrale, Schutzschrank, neue
   * Runde, Testlabor), immer mit `y = 0`; wo der Boden dort nicht genau bei
   * null liegt — eine Platte, ein Podest, das Labor —, steckte er bis zu den
   * Knien darin und kam ohne Sprung nicht heraus. Deshalb wird vorher
   * gemessen: ein Strahl von oben auf die festen Flächen, und die Füße kommen
   * auf die höchste darunter (`fallRescue.rescueHeight`). Trifft er nichts,
   * bleibt die Zahl, die jemand gesagt hat.
   */
  protected override movePlayerTo(ctx: WorldContext, at: THREE.Vector3, yaw?: number): void {
    const probe = RESPAWN_PROBE;
    this.floorRay.set(_probe.set(at.x, at.y + probe, at.z), _down);
    this.floorRay.far = probe * 2;
    const hits = this.floorRay
      .intersectObjects(this.solids, false)
      .map((hit) => hit.point.y)
      .filter((y) => y <= at.y + 1.2);
    const y = rescueHeight(hits, at.y, 0.02);
    super.movePlayerTo(ctx, _landing.set(at.x, y, at.z), yaw);
    // Die Figur der Runde geht mit — wenn die Stelle auf der Karte begehbar ist.
    this.kernel?.place({ x: at.x, z: at.z });
    this.kernelHead = null;
  }

  /**
   * **Was diese Welt von selbst hinstellt** (`FurnishedWorld.spots`): die
   * Sitzecke der Einsatzzentrale — Sofa, Couchtisch, Sessel, Kakteen
   * (`world3d/commandRoom.LOUNGE_SPOTS`). Auf Sofa und Sessel setzt man sich
   * mit `A`, wie überall (`opens: 'sit'`).
   */
  protected override spots(): readonly ElementSpot[] {
    return LOUNGE_SPOTS;
  }

  /** Portal-lab cubes and dominoes have no place in the station — nur ihre Wände aus dem Regal. */
  protected override buildProps(): void {
    this.placeStationWalls();
  }

  /** Was das Monster an einer gesperrten Tür getan hat — Geräusch und Welle (`monster/monsterWalk.ts`). */

  /** Eine Welle auf der Karte: wer, wo, wie weit (`reachOf`), wann — wie `FlatRound.wave`. */

  /** Die Schritte des Monsters als Wellen — derselbe Takt wie in der 2D-Runde. */

  /** Das Monster als Reiter der Fahrt: Füße, Blick, Raum — `null` ohne Monster. */

  protected override buildEnvironment(): void {
    // The generic world's hemisphere/directional lights ignore interior walls.
    // A station uses local fixtures and the player's torch, including in simple mode.
    this.root.getObjectByName('lighting')?.removeFromParent();
    super.buildEnvironment();
    this.roof = PLAN_WALL_H;
    this.navigationOverlay.setRooms(this.spec);
    this.root.add(this.navigationOverlay.root);
    this.root.add(this.blueprint.mesh);
    this.blueprint.show(this.blueprintShown);
    this.root.add(this.stage);
    this.root.add(this.live);
    this.root.add(this.vanRig);
    this.buildHouse();
    this.buildVan();
  }

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    // Wo der Spawn gerade abgesetzt hat — und mit welcher Nummer (`settleSpawn`).
    this.spawnRank = this.rankNow(ctx);
    const slot = spawnSlot(this.spawnRank);
    this.spawnedHere.set(slot.x, 0, slot.z);
    this.spawnSettle = SPAWN_SETTLE;
    // **Das Board schaltet auch die Lampen aus dem Regal** (`core/Lamps.ts`):
    // Eine Lampe, an der niemand den Betrieb eingestellt hat, brennt, wenn
    // ihr Raum Licht hat — dieselbe Frage wie für das Glas der Raumlampe.
    sceneLamps.controller = (x, z) => this.boardLit(x, z);
    // **Der Stock geht in den Kern** (`kernelLocomotion.ts`): Die Physik der
    // Welt bleibt darunter, für Requisiten und Hände — und für das Labor,
    // das die Karte nicht kennt.
    this.kernelLoco = new KernelLocomotion(ctx.rig.locomotion);
    ctx.rig.locomotion = this.kernelLoco;
    // Der Nebel hat die Farbe des Himmels und nicht die der Nacht: Was in ihm
    // verschwindet, soll in die Dämmerung verschwinden und nicht in ein Loch.
    // Etwas dünner als vorher, damit von der Einsatzzentrale aus überhaupt ein Haus zu sehen
    // ist — drinnen ändert das nichts, dort ist auf zwölf Meter ohnehin eine
    // Wand.
    ctx.scene.fog = new THREE.FogExp2(0x020711, 0.008);
    ctx.net.on(HAUNT_CHANNEL, (data, from) => this.receive(data, from));
    this.joinTable(ctx);
    // **Die Bots der Einsatzzentrale** (`world3d/commandBots.ts`) — so viele,
    // wie der Rechner _Spiel-Einstellungen_ sagt.
    this.crewBots = new CommandBots({
      spawn: (kind, at, yaw) =>
        this.director?.spawn({ kind, brain: 'errand', at: at.clone(), yaw }) ?? null,
      remove: (npc) => {
        this.director?.remove(npc);
      },
      couchTaken: () => this.couchTaken(),
    });
    this.crewBots.setCount(this.crewSettings.bots);
    // Wer am Rechner sitzt, sitzt am Tisch; alle anderen laufen (`crewPlace`).
    ctx.avatars.placement = (peer) => this.crewPlace(peer);
    this.placeCommandRoom();
    // Die Sitzecke steht als Möbel des Katalogs da (`spots`), wie in jeder Welt.
    this.furnishSpots();

    // **Niemand kommt im Anzug an** — auch die Brille nicht. Den Anzug zieht
    // man am Ständer an (`suited`), die Plätze nimmt man an den Monitoren.
    this.setupRole(this.roleCtx(ctx));
    this.applyLights();
  }

  /**
   * **Die Rolle, mit der diese Welt rechnet** — die Rolle des Geräts, nur der
   * Anzug entscheidet: Im Anzug ist jedes Gerät `vr` (der Techniker), ohne
   * ihn ist auch die Brille ein Mitspieler der Zentrale (`desktop`). Die
   * Portalwelt darunter fragt die Rolle nie; Hände, Brille und Kamera hängen
   * an der Sitzung (`renderer.xr`) und bleiben, was sie sind.
   */
  private roleCtx(ctx: WorldContext): WorldContext {
    if (this.suited && ctx.role !== 'vr') return { ...ctx, role: 'vr' };
    if (!this.suited && ctx.role === 'vr') return { ...ctx, role: 'desktop' };
    return ctx;
  }

  /**
   * **Der Bordstock der Seite** (`#touch`: Stock, Zielstock, `A`/`B`) ist die
   * Steuerung des Technikers auf dem Handy. Er ruht nur, solange die Seite
   * der Zentrale (`StationUi`) über dem Bild liegt — wer den Stock nimmt
   * (`takeStick`), bekommt ihn, wer an den Tisch zurückgeht, gibt ihn ab.
   * Bis zum 1-m-Gitter brachte diese Welt einen eigenen Stock mit; der ist
   * weg (`docs/plan-haunting-1m.md`).
   */
  private syncTouchStick(ctx: WorldContext): void {
    const shown = !this.ui || this.suited;
    if (shown === this.stickShown) return;
    this.stickShown = shown;
    ctx.touchStick(shown);
  }

  private setupRole(ctx: WorldContext): void {
    this.mountedRole = ctx.role;
    this.ui?.dispose();
    this.ui = null;
    this.clearStationViews();
    this.wanted = null;
    this.claims.delete(ctx.net.localId);
    ctx.net.emit(HAUNT_CHANNEL, { kind: 'technician', active: ctx.role === 'vr' });
    // **Das Tempo der Runde gilt für jeden Stock** (`mission.ts`, `PlayerRig.pace`):
    // Brille, Tastatur und Bildschirmstock rennen 2,6 m/s — Schleichen und
    // Stehen machen die Zonen daraus (`mission.stickPace`). Einen Sprint gibt
    // es für den Techniker nicht mehr.
    ctx.rig.pace = ctx.role === 'vr' ? () => PLAYER_WALK_SPEED : null;
    if (ctx.role === 'vr') {
      // Nur in der Brille schwebt eine eingeschaltete Taschenlampe in der Einsatzzentrale —
      // man muss sie im Dunkeln ja finden können.
      // Auf dem Ausrüstungstisch neben dem Anzug (`commandRoom.GEAR_SPOT`).
      this.placeTableTorch(ctx);
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
      // **Die Seite der Zentrale kommt erst am Rechner** (`openConsole`):
      // Bis dahin läuft man als Figur durch die Einsatzzentrale.
      this.atDesk = false;
      const page = this.pendingConsole;
      this.pendingConsole = null;
      if (page) this.openConsole(page);
    }
    this.applyLights();
  }

  /**
   * **Die Seite der Zentrale** (`StationUi`) — gebaut, sobald man sich an
   * einen Rechner setzt (`openConsole`), und abgebaut beim Aufstehen.
   */
  private stationUi(ctx: WorldContext): StationUi {
    return new StationUi({
      spec: () => this.spec,
      state: () => this.state,
      claims: () => this.currentClaims(),
      me: () => ctx.net.localId,
      technician: () => this.takeStick(),
      leave: () => this.standUp(),
      stopRound: () => this.stopRound(ctx),
      menu: () => ctx.menu.toggle(),
      vr: () => this.roomHasVr(),
      lobby: () => this.lobbyChoice,
      setLobby: (choice) => this.setLobby(choice),
      setup: () => this.setup,
      setSetup: (setup) => this.applySetup(setup),
      // **„Echte Runde starten" ist immer die echte Runde** (`rules/roundFlow.ts`):
      // Die Übung ist der Stand vor dem Start, kein zweiter Start daneben.
      startSetup: () => this.startRound('play', ctx),
      snapshot: () => this.mapSnapshot(),
      monsterPort: () => this.netPort,
      notify: (text) => ctx.notify(text),
      round: () => this.rules.status(this.state),
      restart: () => {
        // Auch hier kein stummes `return`: Wer nicht rechnet, startet keine
        // Runde — und erfährt es, statt einen toten Knopf zu drücken.
        // Wer am Rechner sitzt, trägt keinen Anzug: Der Neustart geht den
        // Weg jedes Starts aus der Zentrale — zum Gastgeber im Anzug.
        this.startRound('play', ctx);
      },
      link: () => ({
        peers: [...ctx.net.peers.values()].filter((p) => p.world === 'haunting').length,
        vr: [...ctx.net.peers.values()].some((p) => this.wearsSuit(p)),
        room: ctx.net.room,
        technician: this.suitName(ctx),
      }),
      nameOf: (peer) => ctx.net.peers.get(peer)?.name ?? 'jemand',
      seat: () => seatOf(this.currentClaims(), ctx.net.localId),
      // **Kein Hinlaufen mehr** (`MOVE_TIME`): Man ist schon zum Rechner
      // gelaufen, also steht die Karte sofort da. Gewünscht: _„Wenn ich mit
      // einem interagiere, braucht es keinen countdown"_.
      arriving: () => 0,
      sit: (station) => this.sit(station),
      door: (id) => this.panelSwitch('door', id),
      light: (id) => this.panelSwitch('light', id),
      pin: (at) => this.setPin(at),
      archiveDesk: () => this.desk,
    });
  }

  override dispose(ctx: WorldContext): void {
    this.crewBots?.dispose();
    this.crewBots = null;
    this.navigationOverlay.dispose();
    this.blueprint.dispose();
    this.fog?.dispose();
    this.fog = null;
    ctx.rig.pace = null;
    this.kernel = null;
    this.kernelLoco = null;
    this.pendingBooks = null;
    ctx.net.off(HAUNT_CHANNEL);
    ctx.touchStick(true);
    this.stickShown = null;
    // Die Avatare gehören der Seite: In der nächsten Welt steht jeder wieder, wo er steht.
    ctx.avatars.placement = null;
    this.crewPlaces.clear();
    this.crewPlacedAt = -Infinity;
    ctx.scene.fog = null;
    // Die Leinwand gehört der ganzen Seite und nicht dieser Welt: Was hier an
    // ihr verstellt wurde, geht hier auch wieder ab.
    this.paperTint(false);
    // Die Schnittebene gehört dem Renderer und nicht dieser Welt: Wer sie
    // stehen ließe, schnitte der nächsten Welt die Decke ab.
    this.liftLid(false);
    this.ui?.dispose();
    this.ui = null;
    this.atDesk = false;
    // Die geliehene Figur des Monsters geht mit der Welt zurück.
    if (this.monsterSuited) ctx.dress?.(null);
    this.monsterSuited = false;
    this.drivingMonster = false;
    this.monsterSight.intensity = 0;
    this.monsterSight.removeFromParent();
    this.netPort = null;
    this.dropCommandRoom();
    this.experience?.dispose();
    this.experience = null;
    this.releaseMonster();
    this.dropFixtures();
    this.fixtureMaterial.dispose();
    this.roomArt.clear();
    // **Die Akteure zuerst, und einzeln.** Sie tragen Figuren aus dem Regal,
    // deren Geometrie der Vorlage im Speicher und allen anderen Kopien gehört
    // (`core/kaykitModel.ts`); `dispose(this.live)` weiter unten kennt diese
    // Ausnahme nicht und gäbe sie allen weg. `ShipActor.dispose` hält an der
    // richtigen Stelle an — und nimmt den Körper gleich aus `live` heraus.
    this.releaseActors();
    this.doorButtons?.dispose();
    this.doorButtons = null;
    this.stationWalls?.dispose();
    this.stationWalls = null;
    this.runMaterial?.dispose();
    this.runMaterial = null;
    this.shipArt = null;
    this.shipArtKey = '';
    dispose(this.stage);
    dispose(this.live);
    this.bloodShape?.dispose();
    this.bloodShape = null;
    dispose(this.vanRig);
    this.commandLights.length = 0;
    dispose(this.paperMask);
    dispose(this.paperDoors);
    this.doorMarks.clear();
    this.roomWalls.clear();
    this.lamps.clear();
    this.stationTorch = null;
    this.automaticDoors.clear();
    this.technicians.clear();
    this.hostId = '';
    this.mountedRole = '';
    this.suited = false;
    this.spawnSettle = 0;
    this.pendingBotRound = false;
    this.topCam = null;
    this.paperLight = null;
    this.paperSun = null;
    this.paperTint(false);
    super.dispose(ctx);
    this.programs.release();
  }

  // --- was gebaut wird ------------------------------------------------------

  /** Lampen, Merkmale, Aufgaben und der Sicherungskasten — alles aus dem Plan. */
  private buildHouse(): void {
    this.experience?.dispose();
    this.experience = null;
    this.dropFixtures();
    this.doorButtons?.dispose();
    this.doorButtons = null;
    // **Dieselbe Station wird nicht neu gebaut.** Jeder Rundenstart und jedes
    // Zurück in die Zentrale ruft `newRound`, und der Samen ist fest
    // (`STATION_SEED`): Wände, Böden und Einbauten kamen jedes Mal genau so
    // wieder, für gut eine halbe Sekunde ohne Bild. Gleicher Samen, gleiche
    // Zahl Räume — dann bleibt die Geometrie stehen (`buildShip` ist reine
    // Rechnung aus dem Plan); was die Runde ändert, hängt nicht daran.
    const artKey = `${this.spec.seed}|${this.spec.rooms.length}`;
    const kept = artKey === this.shipArtKey ? this.shipArt : null;
    kept?.removeFromParent();
    dispose(this.stage);
    this.lamps.clear();
    const art = kept ?? buildShip(this.spec);
    this.shipArt = art;
    this.shipArtKey = artKey;
    this.stage.add(art);
    this.ventArt = new VentFlapArt(this.spec, this.vents);
    this.stage.add(this.ventArt.group);
    this.fog?.dispose();
    this.fog = new TopDownFog(this.spec);
    this.root.add(this.fog.group);
    this.roomArt.clear();
    for (const group of art.children) {
      const id = group.userData.roomId as string | undefined;
      if (id) this.roomArt.set(id, group);
    }
    this.cullTimer = 0;
    this.culledHead.set(Infinity, Infinity, Infinity);
    this.buildFixtureColliders();
    this.lampPool = Array.from({ length: LAMP_POOL }, () => {
      const light = new THREE.PointLight(0xcce8e6, 0, 15, 2);
      // **Keine Schattenkarte**: Ein Raum ist hell oder dunkel, Schatten
      // wirft nur die Taschenlampe. Ihr Licht endet am Rand ihres Raums
      // (`stationLighting.lampReach`, gesetzt in `applyLights`). `castShadow`
      // bleibt wirklich aus — eine Punktleuchte mit dem Schalter, aber ohne
      // Karte, lässt WebGL jeden beleuchteten Zeichenaufruf verwerfen.
      light.castShadow = false;
      this.stage.add(light);
      return light;
    });
    this.testLight = new THREE.AmbientLight(0xd5e9f3, 0);
    this.testLight.userData.dynamicIntensity = true;
    this.stage.add(this.testLight);
    for (const room of spacesOf(this.spec))
      this.buildLamp(room.id, roomCentre(room), lampReach(room.rect, TILE, PLAN_WALL_H - 0.14));
    this.beacons = buildCorridorBeacons(this.spec);
    for (const beacon of this.beacons) {
      // Hängt unter der Decke: Von oben geht die Leuchte mit ihr weg.
      beacon.root.userData.level = 1;
      this.stage.add(beacon.root);
    }
    this.buttonDoors = [...leafDoors(this.spec)];
    this.doorButtons = new DoorButtons(this.stage, this.buttonDoors);
    if (this.context) this.mountExperience(this.context);
    if (this.ui) this.buildDoorMarks();
    this.nextPhoneRender = 0;
  }

  /**
   * **Wer auf einem Türknopf steht** — und die Knöpfe danach einfärben.
   *
   * Grün, solange die Tür aufgeht, rot, solange sie gesperrt ist
   * (`doorLocked`); eingedrückt, wenn jemand darauf steht. Dieselben Bewohner
   * wie bei der Automatik (`doorOccupants`), damit Knopf und Tür sich einig
   * sind.
   */
  private pressButtons(ctx: WorldContext): void {
    const occupants = this.doorOccupants();
    // **Auch die eigenen Füße** — am Schirm ist der Techniker die Figur, die
    // läuft (`suited`, dann ist `ctx.role` hier `vr`), und deren Kopf
    // steht nicht unbedingt in `doorOccupants`.
    if (ctx.role === 'vr') occupants.push({ x: ctx.rig.position.x, z: ctx.rig.position.z });
    this.pressedDoors.clear();
    this.approachedDoors.clear();
    for (const door of this.buttonDoors) {
      if (buttonPressed(door, occupants)) this.pressedDoors.add(door.id);
      // Auf geht das Blatt schon zwei Felder vor der Tür (`DOOR_OPEN_DEPTH`).
      if (buttonPressed(door, occupants, DOOR_OPEN_DEPTH)) this.approachedDoors.add(door.id);
    }
    this.doorButtons?.update((id) => ({
      locked: this.doorLocked(id),
      pressed: this.pressedDoors.has(id),
    }));
  }

  /**
   * **Ob das Blatt einer Tür offen steht** — für das Bild und für die Sicht von
   * oben dieselbe Antwort. Gewünscht: _„wenn der nächste Raum sichtbar
   * geschaltet wird (von oben) auch die Tür bereits aufgehen, bzw. beide sind
   * aneinander gekoppelt (für den jeweiligen Spieler)"_. Vorher fragte die
   * Sicht nur die Automatik (`openDoors`), das Blatt dazu noch, ob jemand zwei
   * Felder davor steht (`approachedDoors`) — der Nachbar stand schon offen da,
   * die Tür noch zu. Beides rechnet jeder Spieler bei sich.
   */
  private leafOpen(id: string): boolean {
    return this.openDoors.has(id) && this.approachedDoors.has(id);
  }

  /** Ob eine Tür gesperrt ist. */
  private doorLocked(id: string): boolean {
    return this.state.shut.includes(id);
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

  private mountExperience(ctx: WorldContext): void {
    this.programs.hold(ctx.scene);
    this.experience?.dispose();
    this.experience = new ShipExperience({
      ctx,
      spec: () => this.spec,
      state: () => this.state,
      say: (text) => this.announce(text),
      configure: (options) => this.configureStation(options),
      start: () => this.startMission(),
      test: () => this.testMission(),
      stop: () => this.stopRound(ctx),
      // „Zur Einsatzzentrale": den Anzug ablegen und an den Aufbau der Zentrale.
      stations: () => this.leaveSuit('setup'),
      door: (id) => this.manualDoor(id),
      // Was im Schiff `bind` bekommt, ist auch beim Kern benutzbar
      // (`PortalWorld.addUsable`): `A`, Saum und Hinweis über der Figur.
      usable: (object, usable, options) => this.addUsable(object, usable, options),
      unusable: (object) => this.removeUsable(object),
      handFree: (hand) => this.handUsesFreely(hand),
      round: () => this.rules.status(this.state),
      // **Die Blätter fahren erst auf, wenn jemand zwei Felder davor steht**
      // (`pressButtons`, `DOOR_OPEN_DEPTH`) — rein fürs Auge: Durchlassen tut
      // die Automatik.
      // Offen ist, was `applyDoors` entschieden hat — beim Gastgeber mit Kern
      // fährt die Runde die Türen, und die Automatik rechnet dann gar nicht.
      doorOpen: (id) => this.leafOpen(id),
      doorLocked: (id) => this.doorLocked(id),
      travel: (at, yaw) => this.movePlayerTo(ctx, at, yaw),
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
      monsterPace: () => this.kernel?.round.decided?.pace ?? 'still',
      noise: (at, loudness) => this.kernel?.round.noise(at, loudness),
      floatingTorch: () => this.stationTorch,
      gear: () => [...this.tableGear],
      takeGear: (id) => this.takeGear(id),
      blastGrenade: (at) => this.blastGrenade(at),
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
        this.runningRound()?.retune(this.tuning);
      },
      blueprint: () => this.blueprintShown,
      setBlueprint: (on) => {
        this.blueprintShown = on;
        saveBlueprintShown(on);
        this.blueprint.show(on);
      },
      simulationSpeed: () => this.simulationSpeed,
      setSimulationSpeed: (speed) => {
        this.simulationSpeed = clampSimulationSpeed(speed);
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
      botPose: () => (this.kernel?.botActive ? this.kernel.pose : null),
      botStage: () => this.kernel?.botStage ?? '',
    });
    this.stage.add(this.experience.root);
  }

  private buildLamp(roomId: string, at: { x: number; z: number }, reach: number): void {
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 12),
      new THREE.MeshBasicMaterial({ color: 0x2b3040, toneMapped: false }),
    );
    glass.rotation.x = Math.PI / 2;
    glass.position.set((at.x + 0.5) * TILE, PLAN_WALL_H - 0.14, (at.z + 0.5) * TILE);
    // Deckenkram: Von oben geht die Scheibe mit der Decke weg (`core/cutaway.ts`).
    glass.userData.level = 1;
    this.stage.add(glass);
    this.lamps.set(roomId, {
      glass,
      at: glass.position.clone(),
      reach,
      color: new THREE.Color(0xd9edff)
        .lerp(new THREE.Color(roomAccent(roomOf(this.spec, roomId)?.kind ?? '')), 0.22)
        .getHex(),
    });
  }

  /**
   * **Die Einsatzzentrale vor der Haustür** — hier nur noch das Licht. Tisch,
   * Monitore und Hocker sind seit Oktober 2026 Spielelemente an eigenen
   * Stellen (`placeCommandRoom`, `world3d/commandRoom.ts`).
   */
  private buildVan(): void {
    this.buildDusk();
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
    // **Hell erleuchtet, überall** (Oktober 2026): _„In der Einsatzzentrale
    // soll licht an sein, sodass der gesamte bereich beleuchtet ist."_ Statt
    // des einen Abendscheinwerfers, der fünf Meter um die Mitte ausleuchtete,
    // hängen vier Deckenleuchten in einer Reihe über die ganze Zentrale —
    // vier und nicht mehr, weil jedes Licht in der Brille jedes Pixel kostet. Punkt-
    // und keine gerichteten Lichter, aus demselben Grund wie oben: Ihre
    // Reichweite (`distance`) endet kurz hinter der Fensterfront, und in der
    // Kantine kommt davon nur ein Rest an. Ohne Schatten, wie die Lampen der
    // Station.
    //
    // **Und hell wie bei Tag** (Oktober 2026): _„Dann finde ich es in dem raum
    // immer noch düster. Es soll in dem raum so erleuchtet sein, als wenn
    // tageslicht da ist."_ Seit die Zentrale quadratisch ist, hängen die vier
    // als Raster von 2 × 2 über ihr, heller, kühler und mit flacherem Abfall
    // (`COMMAND_LAMP_DECAY`), damit auch die Ecken hell sind.
    for (const fx of [0.25, 0.75])
      for (const fz of [0.25, 0.75]) {
        const light = new THREE.PointLight(
          COMMAND_DAYLIGHT,
          COMMAND_LAMP,
          COMMAND_LAMP_REACH,
          COMMAND_LAMP_DECAY,
        );
        light.position.set(
          (APRON.x + APRON.w * fx) * TILE,
          PLAN_WALL_H - 0.35,
          (APRON.z + APRON.d * fz) * TILE,
        );
        this.vanRig.add(light);
        this.commandLights.push(light);
      }
  }

  /** Die Kameras, aus denen die Stationen ihr Bild bekommen. */
  private buildStationViews(): void {
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
    // **Dieses Licht gehört der Ansicht und nicht der Grafikstufe.** Es steht
    // beim Bauen auf 0 und geht erst an, wenn jemand den Archivtisch
    // aufschlägt; ohne diese Marke merkte sich der Durchlauf über die Szene
    // die 0 als seine Grundhelligkeit und drehte es sekündlich wieder aus
    // (`core/graphicsScene.dimAmbient`).
    paper.userData.dynamicIntensity = true;
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
    // Dieselbe Marke wie beim Archivlicht darüber, aus demselben Grund.
    day.userData.dynamicIntensity = true;
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

    for (const door of leafDoors(this.spec)) {
      const { x, z, alongX } = doorEdge(door);
      const open = new THREE.Group();
      const shut = new THREE.Group();

      // **Offen ist die Lücke selbst die Auskunft**: Zwischen den beiden
      // Wandstücken bleibt Platz, und der Bogen sagt, dass dort eine Tür
      // schwingt und keine Wand fehlt. Ein Strich quer durch die Lücke stand
      // hier einmal — er machte den Durchgang optisch wieder zu.
      const pivot = new THREE.Group();
      const arc = new THREE.Mesh(
        // Symbolisch wie ein Flügel gezeichnet — nicht so breit wie die Öffnung,
        // sonst striche der Bogen die Nachbarkachel mit.
        new THREE.RingGeometry(PAPER_ARC - 0.07, PAPER_ARC, 20, 1, 0, Math.PI / 2),
        ink,
      );
      arc.rotation.x = -Math.PI / 2;
      pivot.add(arc);
      open.add(pivot);

      // Und zu: das Blatt steht in der Lücke, **dunkel** in der hellen Wand.
      // Ein heller Pfropfen wäre schlicht Wand gewesen — man müsste die Bögen
      // zählen, um zu merken, dass dort überhaupt eine Tür ist.
      const plug = new THREE.Mesh(
        new THREE.PlaneGeometry(doorWidth(door), PLAN_WALL_T + 0.12),
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

    for (const tile of roomTiles(room)) {
      // An einer schrägen Ecke ist die schräge Wand die Grenze (unten).
      const cut = cutOf(room, tile.x, tile.z);
      for (const dir of DIRS) {
        if (cut && cutSides(cut.corner).includes(dir)) continue;
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
        // Ein offener Durchgang ist keine Wand: Der Gang läuft durch.
        if (door && isPassage(door)) continue;
        const parts: Array<[number, number]> = door
          ? [
              [reach - STATION_DOOR_W / 2, -(reach + STATION_DOOR_W / 2) / 2],
              [reach - STATION_DOOR_W / 2, (reach + STATION_DOOR_W / 2) / 2],
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
    for (const wall of cutWalls(room)) {
      const length = Math.hypot(wall.b.x - wall.a.x, wall.b.z - wall.a.z) + PLAN_WALL_T;
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(length, PLAN_WALL_T), ink);
      bar.rotation.order = 'YXZ';
      bar.rotation.y = -Math.atan2(wall.b.z - wall.a.z, wall.b.x - wall.a.x);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set((wall.a.x + wall.b.x) / 2, PAPER_MARK_Y - 0.005, (wall.a.z + wall.b.z) / 2);
      group.add(bar);
    }
    return group;
  }

  /** Ob auf dieser Kachelkante eine Tür sitzt — egal, von welcher Seite gefragt. */
  private doorAt(x: number, z: number, dir: Dir): HouseDoor | undefined {
    const edge = edgeCentre(x, z, dir);
    return this.spec.doors.find((door) =>
      doorEdges(door).some((one) => {
        const at = edgeCentre(one.x, one.z, one.dir);
        return Math.abs(at.x - edge.x) < 0.01 && Math.abs(at.z - edge.z) < 0.01;
      }),
    );
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
    pivot.position.set((-ax * doorWidth(door)) / 2, 0, (-az * doorWidth(door)) / 2);
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
   * **Ob dieses Gerät gerade auf die Übergabe des Vorgängers wartet.** Es ist
   * schon Gastgeber und rechnet trotzdem noch nicht — genau die Lücke, in der
   * sonst zwei dieselbe Runde rechnen (`HANDOVER_WAIT`).
   */
  private get waitingHandover(): boolean {
    return this.handoverUntil > clock();
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
    ctx = this.roleCtx(ctx);
    this.syncTouchStick(ctx);
    this.settleSpawn(ctx, dt);
    this.showSuitStand(ctx);
    this.refreshSigns(false, dt);
    if (this.mountedRole !== ctx.role) {
      this.context = ctx;
      this.setupRole(ctx);
      this.mountExperience(ctx);
      ctx.refreshWorldMenu();
    }
    // **Das Menü hängt an der Runde, in der man ist** („Runde starten" oder
    // ihr Abbruch) — also wird es neu gebaut, sobald sie sich ändert: Start,
    // Abbruch, Ende, oder ein Stand vom Gastgeber.
    const mode = this.roundMode();
    if (mode !== this.shownMode) {
      this.shownMode = mode;
      ctx.refreshWorldMenu();
    }
    super.update(dt, ctx);
    // Die Bots der Zentrale: Ist die Runde vorbei, sitzen und schlendern sie wieder.
    if (this.crewBots) {
      const running = this.state.phase === 'running';
      if (this.botsInRound && !running) this.crewBots.release();
      this.botsInRound = running;
      this.crewBots.update(dt);
    }
    if (this.stationTorch && this.torchImmersive !== ctx.renderer.xr.isPresenting) {
      this.torchImmersive = ctx.renderer.xr.isPresenting;
      if (this.stationTorch.visible) this.stationTorch.setLit(true);
    }
    this.refreshHost(ctx);
    if (this.pendingBotRound && this.isHost && ctx.role === 'vr') {
      this.pendingBotRound = false;
      this.testMission();
      this.experience?.startBotRound();
    }

    // **Der Gastgeber rechnet nichts selbst** — die 2D-Runde ist der Kern
    // (`flatKernel.ts`): Stock hinein, Stellung heraus. Was hier vorher
    // stand (Riegel, Lampen, Uhr, Spuk, Wahrnehmung, Routine, Schlag), steht
    // dort einmal für beide Welten.
    if (this.isHost && !this.waitingHandover && ctx.role === 'vr') this.stepKernel(dt, ctx);
    else if (this.kernelLoco) this.kernelLoco.active = false;
    this.driveMonster(ctx, dt);
    // Wer am Rechner saß und mit `A` aufgestanden ist, macht auch die Seite zu.
    if (this.atDesk && !this.sittingOn && !ctx.renderer.xr.isPresenting) this.standUp();
    this.applyDoors(dt);
    this.pressButtons(ctx);
    this.stationWalls?.setTopDown(ctx.topDown);
    this.applyLights(dt);
    this.cullRoomArt(dt, ctx);
    this.applyBlob(dt);
    this.warmShaders(dt, ctx);
    this.paintTrail();
    this.paintGhost(dt);
    this.stepGear(ctx);
    this.stepGrenades();
    this.experience?.update(dt);
    this.showTechnician(dt);
    // **Das Overlay läuft auch außerhalb der Simulation** (Paket U4/M4): Es
    // war an die Bot-Runde gebunden, weil es dafür gebaut wurde — der
    // Zuschauer braucht es aber gerade dann, wenn Menschen spielen.
    const overlay = this.state.crew.simulation || this.insightWanted();
    this.navigationOverlay.update(overlay, [
      this.kernel?.botActive ? this.kernel.botNavigation : null,
      this.kernel && this.state.monsterOn ? this.kernel.monsterNavigation : null,
    ]);

    // Der Gastgeber hat die Absichten aus seinem Beschluss, alle anderen aus
    // dem Stand, den er ansagt (`HauntState.insight`).
    this.navigationOverlay.insight(this.insightWanted() ? (this.state.insight ?? null) : null);
    this.perceptionClock -= dt;
    if (overlay && this.perceptionClock <= 0) {
      this.perceptionClock = 0.15;
      const bot = this.experience?.botPose;
      const monster = this.state.monster;
      // Das akustische Feld ist nur Anzeige — gerechnet, wenn jemand hinsieht.
      this.hearing =
        monster && this.nav
          ? acousticField(this.nav, monster, 24, (key, dir) => this.shelfWallAt(key, dir))
          : new Map();
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
              yaw: this.kernel?.round.monster.yaw ?? 0,
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

  /** Die Runde, die gerade rechnet — der Kern —, oder `null`. */
  private runningRound(): FlatRound | null {
    return this.kernel?.round ?? null;
  }

  /**
   * **Der Rechenkern steht — oder wird gestellt.** Eine neue Runde, ein
   * neues Haus, eine Übergabe: Jedes Mal gehört der Stand
   * einem anderen Objekt, und die Runde, die ihn rechnet, wird neu aufgesetzt
   * — mit den Büchern, die bis dahin geführt wurden (`pendingBooks`), und
   * dem Techniker dort, wo das Gestell gerade steht.
   */
  private ensureKernel(ctx: WorldContext): FlatKernel {
    const stale =
      !this.kernel ||
      this.kernel.round.haunt !== this.state ||
      this.kernel.round.house.seed !== this.spec.seed;
    if (!stale) return this.kernel!;
    // In der Bot-Runde ist das Gestell ein Zuschauer und keine Figur: Der
    // Techniker aus Zahlen fängt in der Zentrale an (`FlatKernel.startBot`).
    let at: { x: number; z: number; yaw: number } | undefined;
    if (!this.state.crew.simulation) {
      ctx.rig.getHeadPosition(_head);
      at = { x: _head.x, z: _head.z, yaw: this.lookYaw(ctx) };
    }
    const kernel = new FlatKernel(this.spec.seed, this.state, this.pendingBooks ?? {}, {
      tuning: this.tuning,
      setup: this.setup,
      at,
    });
    this.pendingBooks = null;
    kernel.round.driver = this.netMonster;
    kernel.round.monsterPace = this.monsterPace;
    kernel.round.onLamp = (_kind, room) => this.lampSound(room);
    // Eine Buchführung für alle: Tafel, Techniker vor Ort und Runde teilen
    // sich Riegel und Lampen (`rules/doorLocks.ts`, `rules/lamps.ts`).
    this.locks = kernel.round.locks;
    this.lampBook = kernel.round.lampBook;
    this.kernelHead = null;
    this.kernel = kernel;
    return kernel;
  }

  /**
   * **Ein Bild des Kerns.** Der Mensch am Stock oder der Techniker aus
   * Zahlen bewegt die Figur der Runde; danach wird das Gestell dorthin
   * gesetzt, wo sie steht, und was die Runde meldet, wird angesagt.
   */
  private stepKernel(dt: number, ctx: WorldContext): void {
    const kernel = this.ensureKernel(ctx);
    const round = kernel.round;
    const crew = this.state.crew;
    const hpBefore = crew.hp;
    // Was die Runde vom Schiff wissen muss und nicht im Stand steht.
    round.torch = this.experience?.flashlightActive === true;
    let events;
    if (crew.simulation) {
      // **Die Bot-Runde**: der Techniker aus Zahlen der 2D-Welt
      // (`rules/technicianBot.ts`), im Test ohne Schaden und mit Monster.
      if (!kernel.botActive) kernel.startBot(this.tuning.technician, () => this.routineDice.next());
      if (crew.options.test) {
        crew.hp = 3;
        this.state.monsterOn = true;
      }
      if (this.kernelLoco) this.kernelLoco.active = false;
      events = kernel.stepBot(dt);
    } else {
      if (kernel.botActive) kernel.stopBot();
      const input = this.kernelInput(ctx, kernel);
      events = kernel.step(dt, input ?? IDLE_INPUT);
      if (input) this.followKernel(ctx, kernel);
    }
    for (const event of events) this.relay(event);
    // Was das Schiff aus der Runde liest: Absichten für die Zuschauer,
    // Schacht und Verbergen für alle Geräte.
    this.state.insight = round.decided?.insight ?? undefined;
    this.state.ride = round.ventRide.phase;
    crew.venting = round.ventRide.concealed
      ? Math.min(VENTING_CEILING, Math.max(VENTING_FLOOR, round.ventRide.timer))
      : 0;
    this.ventArt?.setOpen(round.ventRide.openFlap?.id ?? null);
    if (crew.hp < hpBefore) {
      for (const hand of ['left', 'right'] as const) ctx.input.get(hand)?.pulse(0.65, 120);
      playSwitch(false);
    }
    if (this.state.phase !== 'running' && this.state.phase !== 'briefing' && hpBefore > 0)
      this.context?.refreshWorldMenu();
  }

  /**
   * **Der Stock der Runde aus der Bedienung des Schiffs**: Brille, Tastatur
   * oder Bildschirmstock haben ihren Wunsch im Gestell abgelegt
   * (`KernelLocomotion.wish`); dazu Sprint, Ducken, der Blick des Kopfes und
   * der Schritt, den der Körper im Spielraum selbst getan hat. `null`, wenn
   * das Gestell außerhalb der Karte steht (Übungslabor): Dann trägt die
   * Physik, und die Figur wartet.
   */
  private kernelInput(ctx: WorldContext, kernel: FlatKernel): FlatInput | null {
    const loco = this.kernelLoco;
    if (!loco) return null;
    ctx.rig.getHeadPosition(_head);
    if (this.state.crew.hidden) {
      // Im Schrank: Das Gestell steht dort, wo das Schiff es hingestellt hat;
      // die Figur der Runde steht davor. Kein Schritt, kein Nachführen.
      loco.active = true;
      this.kernelHead = null;
      return null;
    }
    if (!kernel.round.canStand(_head)) {
      loco.active = false;
      this.kernelHead = null;
      return null;
    }
    if (!loco.active) {
      loco.active = true;
      kernel.place(_head);
    }
    const shift = this.kernelHead
      ? { x: _head.x - this.kernelHead.x, z: _head.z - this.kernelHead.z }
      : { x: 0, z: 0 };
    const wish = ctx.rig.paused ? _zero : loco.wish;
    const pace = PLAYER_WALK_SPEED;
    const wished = Math.hypot(wish.x, wish.z);
    // **Drei Zonen** (`mission.stickPace`): stehen, schleichen, rennen — am
    // Glas, am Pad, in der Brille und mit Tasten (die immer voll ausschlagen,
    // also rennen). Kein Sprint mehr obendrauf; `Strg` schleicht.
    const magnitude = stickPace(wished / pace);
    return {
      x: magnitude > 0 ? (wish.x / wished) * magnitude : 0,
      z: magnitude > 0 ? (wish.z / wished) * magnitude : 0,
      sprint: false,
      crouch: ctx.rig.crouch > 0.15 || this.experience?.sneaking === true,
      yaw: this.lookYaw(ctx),
      shift,
    };
  }

  /**
   * **Wohin die Figur schaut** — der Gierwinkel für die Runde. Aus den Augen
   * ist das die Kamera; von oben schaut die Kamera des Kerns immer nach
   * Norden (`core/TopDownCamera.ts`), also zählt dort das Gestell, das
   * `FlatControls` in die Laufrichtung dreht.
   */
  private lookYaw(ctx: WorldContext): number {
    if (ctx.topDown) {
      ctx.rig.getWorldDirection(_feet);
      // `Object3D.getWorldDirection` gibt +Z; das Gestell schaut nach −Z.
      return yawOfForward(-_feet.x, -_feet.z);
    }
    ctx.camera.getWorldDirection(_feet);
    return Math.atan2(-_feet.x, -_feet.z);
  }

  /** Das Gestell dorthin, wo die Figur der Runde steht — der Kopf über ihre Füße. */
  private followKernel(ctx: WorldContext, kernel: FlatKernel): void {
    const rig = ctx.rig;
    rig.getHeadPosition(_head);
    const player = kernel.round.player;
    rig.position.x += player.x - _head.x;
    rig.position.z += player.z - _head.z;
    rig.updateMatrixWorld(true);
    this.kernelLoco?.resync(rig);
    this.kernelHead ??= new THREE.Vector3();
    rig.getHeadPosition(this.kernelHead);
  }

  /** Was die Runde meldet, sagt das Schiff an — groß, was zählt, klein, was nur Auskunft ist. */
  private relay(event: FlatEvent): void {
    if (this.state.crew.simulation) this.experience?.log(event.text);
    if (event.kind === 'bad' || event.kind === 'good') this.announce(event.text);
    else this.say(event.text);
  }

  /**
   * **Der Netzteil eines Bildes** — Herzschlag, Stand, Platz, Monster-Steuer.
   * Aus `tick` herausgelöst, damit er in einem Stück lesbar bleibt: Die
   * Telefone sähen sonst eine Runde, die niemand mehr ansagt.
   */
  private tickNet(dt: number, ctx: WorldContext, last: boolean): void {
    if (!last) return;
    this.sendTimer -= dt;
    if (this.sendTimer <= 0) {
      this.sendTimer = STATE_RATE;
      // Der 2D-Spieler ist ein Techniker wie der im Headset (`refreshHost`).
      if (ctx.role === 'vr') ctx.net.emit(HAUNT_CHANNEL, { kind: 'technician' });
      // Die Tafel reist mit dem Stand: So steht sie auf allen Geräten gleich,
      // und ein Telefon, das später dazukommt, sieht die Verteilung, die gilt.
      if (this.isHost) ctx.net.emit(HAUNT_CHANNEL, stateMessage(this.state, this.setup));
      if (this.wanted) ctx.net.emit(HAUNT_CHANNEL, claimMessage(this.wanted, this.seated));
    }
    // Das Steuer der Monster-Station — nur solange man die Station besitzt;
    // der Gastgeber hört nur auf den Besitzer (`receive`).
    this.monsterTimer -= dt;
    if (this.monsterTimer <= 0) {
      this.monsterTimer = MONSTER_RATE;
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

  /**
   * **Gastgeber ist, wer Techniker ist** (`net.pickGameHost`) — in der Brille,
   * am Bildschirm von oben oder aus den Augen, das ist dieselbe Rolle.
   * Spielt niemand, rechnet der Älteste.
   *
   * **Und wechselt der Techniker, wird übergeben.** Der alte Gastgeber schickt
   * dem neuen den ganzen Stand samt der Buchführung, die sonst nie über die
   * Leitung geht (`net.handoverMessage`); der neue wartet `HANDOVER_WAIT`
   * Sekunden darauf und rechnet solange nicht. Vorher erbte der Nachfolger
   * eine Runde mit gesperrten Türen ohne Frist, Lampen ohne Restzeit und einem
   * Monster, das den Techniker nie gesehen hatte.
   */
  private refreshHost(ctx: WorldContext): void {
    const here = [...ctx.net.peers.values()].filter((peer) => peer.world === ctx.net.world);
    const candidates = [
      // Wer den Anzug trägt, ist der Techniker dieser Runde — und rechnet sie.
      {
        id: ctx.net.localId,
        seniority: ctx.net.localSeniority,
        technician: ctx.role === 'vr' || this.suited,
      },
      ...here.map((peer) => ({
        id: peer.id,
        seniority: ctx.net.seniorityOf(peer),
        technician: this.wearsSuit(peer, ctx.net.world),
      })),
    ];
    const next = pickGameHost(candidates) || pickHost(candidates);
    if (next === this.hostId) return;
    const wasHost = this.hostId === ctx.net.localId;
    const before = this.hostId;
    this.hostId = next;
    // **Erst übergeben, dann loslassen.** `releaseMonster` wirft das Gedächtnis
    // weg; wer danach einpackt, schickt eine leere Buchführung.
    if (wasHost && next !== '' && next !== ctx.net.localId) this.handOver(ctx, next);
    if (wasHost) this.releaseMonster();
    // Wer einen Gastgeber ablöst, der eben noch da war, wartet auf dessen
    // Übergabe. Beim ersten Gastgeber einer Runde (`before === ''`) gibt es
    // nichts zu warten: Da war keiner, der etwas zu übergeben hätte.
    if (next === ctx.net.localId && before !== '' && this.state.phase === 'running')
      this.handoverUntil = clock() + HANDOVER_WAIT * 1000;
    if (
      next === ctx.net.localId &&
      this.state.phase === 'running' &&
      this.state.monsterOn &&
      this.state.monster &&
      !this.state.crew.options.test &&
      !this.state.crew.simulation
    ) {
      // Der neue Gastgeber stellt den Kern im nächsten Bild aus dem Stand und
      // den übergebenen Büchern (`ensureKernel`).
      this.kernel = null;
    }
  }

  private receive(data: unknown, from: string): void {
    if (typeof data === 'object' && data !== null && 'kind' in data && data.kind === 'technician') {
      if ('active' in data && data.active === false) this.technicians.delete(from);
      else this.technicians.set(from, clock());
      return;
    }
    // **Die Übergabe** (`net.handoverMessage`) — nur an den, für den sie
    // gedacht ist, und nur, wenn er die Runde inzwischen wirklich rechnet.
    const handover = readHandover(data);
    if (handover) {
      if (handover.to === this.context?.net.localId && this.isHost) {
        this.takeHandover(handover.state, handover.books);
      }
      return;
    }
    const state = readState(data);
    if (state && from !== this.context?.net.localId && from === this.hostId) {
      if (!this.stale(state)) this.adopt(state);
      // **Die Tafel des Gastgebers gilt** — außer in der Schonfrist nach einem
      // eigenen Tipp, der gerade erst zu ihm unterwegs ist.
      const shared = readSharedSetup(data);
      if (shared && clock() - this.setupTouchedAt > SETUP_GRACE) this.adoptSetup(shared);
      return;
    }
    const claim = readClaim(data, from);
    if (claim) {
      this.claims.set(from, { ...claim, heardAt: clock() });
      return;
    }
    if (readRelease(data)) {
      this.claims.delete(from);
      this.crewPlacedAt = -Infinity;
      return;
    }
    // **Die Tafel darf jeder im Raum stellen** — angewendet wird sie beim
    // Gastgeber, und mit dem nächsten Stand steht sie überall. Nur den Anzug
    // gibt es nicht zu vergeben, solange eine Brille im Raum ist.
    const wished = readSetupMessage(data);
    if (wished) {
      const ctx = this.context;
      if (ctx && this.isHost && from !== ctx.net.localId)
        this.applySetup(lockTechnician(wished, this.roomHasTechnician(ctx)), false);
      return;
    }
    // **Und starten darf auch jeder** — der Gastgeber fängt an, mit der
    // Tafel, die der Wunsch mitbringt. Eine laufende Runde bricht er dafür
    // nicht ab: Ein Tipp aus der Zentrale ist kein Notschalter.
    const start = readStart(data);
    if (start) {
      const ctx = this.context;
      if (!this.isHost || !ctx || from === ctx.net.localId) return;
      if (this.state.phase === 'running') {
        this.say(ROUND_RUNNING);
        return;
      }
      this.applySetup(lockTechnician(start.setup, this.roomHasTechnician(ctx)), false);
      if (start.crew) this.startCrewRound(ctx, start.crew);
      else this.startRound(start.intent, ctx);
      return;
    }
    // **Und stoppen darf auch jeder** — zurück in den Test, beim Gastgeber.
    if (readStop(data)) {
      const ctx = this.context;
      if (this.isHost && ctx && from !== ctx.net.localId) this.stopRound(ctx);
      return;
    }
    // **Die Markierung der Zentrale** (`HauntState.pin`): setzen darf jeder,
    // der eine Karte hat; der Gastgeber trägt sie in den Stand.
    const pin = readPin(data);
    if (pin !== undefined) {
      if (this.isHost) this.applyPin(pin);
      return;
    }
    const flip = readFlip(data);
    // **Schalten darf, wer die Tafel hält** — ein Farbplatz mit „Schalttafel"
    // auf der Tafel des Gastgebers (`rules/roundSetup.Seat.powers`). Vorher
    // war es das Gerät `hack`; jetzt ist das Gerät ein Stuhl, und was darauf
    // liegt, sagt die Verteilung.
    const seat = seatOf(this.currentClaims(), from);
    if (
      flip &&
      this.isHost &&
      seat &&
      COLOURS.includes(seat as SeatId as (typeof COLOURS)[number]) &&
      this.setup.seats[seat as SeatId].powers.panel
    )
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
    if (next.seed !== this.spec.seed || next.crew.options.rooms !== this.spec.rooms.length) {
      this.spec = generateHouse(next.seed, next.crew.options.rooms);
      this.state = next;
      this.automaticDoors.clear();
      this.planFor = '';
      this.grid?.replaceWith(this.stationPlan(new Set(next.shut)));
      this.builtDoors = '?';
      this.buildHouse();
      this.placeStationWalls();
      return;
    }
    this.state = next;
  }

  /**
   * **Ein Stand, der hinter dem eigenen zurückliegt, wird verworfen.**
   *
   * Beim Wechsel des Gastgebers überschneiden sich für einen Augenblick zwei
   * Absender: Die letzte Ansage des alten ist noch unterwegs, während der neue
   * schon rechnet. Wer sie annimmt, springt in der Zeit zurück — die Uhr läuft
   * rückwärts, eine eben reparierte Konsole ist wieder offen. Also gilt: Auf
   * demselben Haus und in derselben laufenden Runde zählt nur, was **neuer**
   * ist als das, was schon dasteht.
   *
   * Für alles andere gilt die Regel nicht: Eine neue Runde fängt bei null an,
   * und ein `briefing` nach einem `running` ist ein Abbruch und kein Nachzügler.
   */
  private stale(next: HauntState): boolean {
    return (
      next.seed === this.state.seed &&
      next.phase === 'running' &&
      this.state.phase === 'running' &&
      next.time < this.state.time
    );
  }

  /**
   * **Die Buchführung, zum Mitnehmen** — aus der Runde, die gerade rechnet
   * (dem Kern, `flatKernel.ts`) oder, wenn gerade keine läuft, den Büchern,
   * die auf die nächste warten.
   */
  private books(): HauntBooks {
    const running = this.kernel?.round.books();
    const carried = running ?? this.pendingBooks;
    // Ohne laufende Runde führen Tafel und Techniker vor Ort Riegel und
    // Lampen selbst (`this.locks`, `this.lampBook`) — die gehen mit.
    return {
      locks: carried?.locks ?? this.locks,
      lamps: carried?.lamps ?? this.lampBook,
      spook: carried?.spook ?? freshSpook(),
      trail: carried?.trail ?? { until: 0, from: null, walked: 0 },
      memory: carried?.memory ?? emptyBook(),
    };
  }

  /** Den ganzen Stand samt Buchführung an den neuen Gastgeber schicken. */
  private handOver(ctx: WorldContext, to: string): void {
    if (this.state.phase !== 'running') return;
    ctx.net.emit(HAUNT_CHANNEL, handoverMessage(to, this.state, this.books()));
  }

  /**
   * **Und die andere Seite: annehmen und ab jetzt rechnen.**
   *
   * Der Stand geht durch denselben Weg wie jeder fremde (`adopt`), damit ein
   * Hauswechsel auch hier ein Hauswechsel bleibt; die Buchführung kommt
   * danach, weil `adopt` bei einem neuen Haus den Spuk zurücksetzt.
   */
  private takeHandover(state: HauntState, books: HauntBooks): void {
    if (!this.stale(state)) this.adopt(state);
    this.loadBooks(books);
    this.handoverUntil = 0;
  }

  /**
   * **Die Buchführung übernehmen** — vom alten Gastgeber.
   * Der Kern wird damit neu gestellt (`ensureKernel`): Eine Runde, die mit
   * fremden Büchern weiterrechnet, ist eine andere Runde.
   */
  private loadBooks(books: HauntBooks): void {
    this.pendingBooks = books;
    this.locks = books.locks;
    this.lampBook = books.lamps;
    this.kernel = null;
  }

  // --- was im Haus passiert -------------------------------------------------

  /**
   * **Alle drei Körper aus dem Regal wegräumen** — Monster, Erinnerung,
   * Techniker.
   *
   * Sie stehen in `this.live` und würden dort vom groben `dispose` mit
   * erwischt; der kennt die Ausnahme für geteilte Geometrie nicht (siehe
   * `dispose` am Dateiende). Eine eigene Zeile also, und zwar **vor** jedem
   * Aufräumen der Gruppe, in der sie hängen.
   */
  private releaseActors(): void {
    for (const actor of [this.blob, this.ghostArt, this.technicianArt]) actor?.dispose();
    this.blob = null;
    this.ghostArt = null;
    this.technicianArt = null;
  }

  /**
   * **Das Monster, gezeichnet aus dem Stand** — beim Gastgeber wie bei allen
   * anderen. Es gibt keinen NPC-Körper mehr: Die Runde rechnet, wo es steht
   * und wohin es schaut (`flatKernel.ts`), das Schiff stellt die Figur hin.
   *
   * **Das Tempo kommt aus dem Weg und nicht aus einer Ansage**: Wie weit das
   * Monster seit dem letzten Bild gekommen ist, geteilt durch die Zeit, ist
   * genau die Zahl, aus der die Figur ihren Gang zieht
   * (`core/kaykitFigureFit.gaitFor`) — ein Stalker auf der Jagd rennt damit
   * wirklich, statt seine Beine im Gehschritt zu schwenken.
   */
  private applyBlob(dt: number): void {
    const at = this.state.monster;
    const shown =
      at &&
      this.state.monsterOn &&
      (this.state.phase === 'running' || this.state.phase === 'briefing') &&
      this.state.crew.venting <= 0;
    if (!at || !shown) {
      if (this.blob) this.blob.root.visible = false;
      return;
    }
    if (this.blob && this.blob.kind !== this.state.crew.options.monster) {
      this.blob.dispose();
      this.blob = null;
    }
    if (!this.blob) {
      this.blob = buildActor(this.state.crew.options.monster);
      this.live.add(this.blob.root);
    }
    const body = this.blob.root;
    // Wer das Monster selbst steuert, ist es: Seine eigene Figur steht dort.
    body.visible = !this.drivingMonster;
    const step = Math.hypot(body.position.x - at.x, body.position.z - at.z);
    body.position.set(at.x, 0, at.z);
    if (this.kernel) body.rotation.y = this.kernel.round.monster.yaw;
    this.blob.update(dt, dt > 0 ? step / dt : 0);
  }

  /**
   * **Die Shader der Runde vorab übersetzen** — einmal, wenn sie losgeht.
   *
   * three.js übersetzt das Programm eines Materials erst, wenn es zum ersten
   * Mal gezeichnet wird, und wartet dann darauf (`getProgramInfoLog`). In der
   * Station heißt „zum ersten Mal": beim ersten Betreten eines Raums, dessen
   * Einrichtung bis dahin ausgeblendet war (`cullRoomArt`), und beim ersten
   * Blick auf das Monster. Gemessen waren das beim Gang durch alle Räume zehn
   * bis dreizehn neue Programme, jedes ein Ruckler mitten im Laufen — auf einer
   * Quest je Programm leicht eine Zehntelsekunde.
   *
   * `renderer.compile` geht über **alle** Materialien der Szene, auch die
   * ausgeblendeten, und übersetzt sie für die Lichter, die gerade brennen.
   * Das Warten fällt damit auf den Start der Runde, wo ohnehin das Licht
   * ausgeht, und die Grafikkarte übersetzt im Hintergrund weiter, während man
   * losläuft.
   *
   * **Und erst eine Sekunde nach dem Start** (`WARM_AFTER`): Im Bild des
   * Starts selbst brennen für einen Augenblick Lichter, die gleich wieder
   * ausgehen (die Übungsleuchte, die zweite Lampe am Schirm), und ein Programm
   * gilt nur für genau die Zahl an Lichtern, für die es übersetzt ist. Vorab
   * übersetzt für die falsche Zahl wären dreißig Programme umsonst gewesen —
   * gemessen. Bis dahin steht auch das Monster (`applyBlob`).
   */
  private warmShaders(dt: number, ctx: WorldContext): void {
    const running = this.state.phase === 'running';
    const options = this.state.crew.options;
    const key = `${this.spec.seed}|${this.spec.rooms.length}|${options.monster}|${options.test}`;
    // **Auch nach jedem Neubau**, nicht nur einmal je Runde: Solange die
    // alten Materialien ihre Programme halten (`programs`), ist das Übersetzen
    // fast nur Nachschlagen — und erst danach dürfen sie gehen.
    if (!(running && key !== this.warmedFor) && !this.programs.holding) {
      this.warmClock = 0;
      return;
    }
    this.warmClock += dt;
    if (this.warmClock < WARM_AFTER) return;
    this.warmClock = 0;
    if (running) {
      this.warmedFor = key;
      // Und den Geist, zu dem der Techniker beim Tod wird (`setSpirit`).
      if (ctx.role === 'vr') ctx.avatar.warmSpirit(ctx.renderer, ctx.camera, ctx.scene);
    }
    // `compile` stellt die Programme nur an; wo der Treiber nebenher übersetzen
    // kann (`KHR_parallel_shader_compile`, die Quest kann es), wartet erst das
    // erste Zeichnen auf sie. `compileAsync` wäre dasselbe mit einem
    // Versprechen hinterher — und das warf an Stoffen ohne Programm
    // (`currentProgram` leer) einen Fehler in einen Zeitgeber.
    ctx.renderer.compile(ctx.scene, ctx.camera);
    this.programs.release();
  }

  /**
   * **Die Blutspur auf dem Boden** (`rules/blood.ts`) — flache Flecken als
   * **Weltgeometrie** und nicht als Zeichen auf dem Bildschirm.
   *
   * Das ist der ganze Unterschied: Ein Bildschirmzeichen gibt es in der
   * Brille nicht, weil dort zwei Augen zwei Bilder bekommen und niemand ein
   * Overlay dazwischenlegt. Was auf dem Boden liegt, liegt für beide Augen
   * dort, wo es liegt — dieselbe Überlegung wie bei der schwarzen Kante
   * (`core/outlineShell.ts`), die aus demselben Grund keine Nachbearbeitung
   * ist.
   *
   * Die Scheiben werden **einmal gebaut und wiederverwendet**: höchstens
   * `blood.DROP_LIMIT` Stück, überzählige werden unsichtbar geschaltet statt
   * weggeworfen. Ein Fleck, der bei jedem Tropfen neu entsteht und beim
   * nächsten Bild wieder zerfällt, kostet mehr als die ganze Spur wert ist.
   */
  private paintTrail(): void {
    const drops = this.state.blood ?? [];
    if (!this.bloodArt) {
      if (!drops.length) return;
      this.bloodArt = new THREE.Group();
      this.bloodArt.name = 'blood';
      this.live.add(this.bloodArt);
    }
    const art = this.bloodArt;
    while (art.children.length < drops.length) art.add(this.bloodSpot());
    for (let i = 0; i < art.children.length; i++) {
      const spot = art.children[i] as THREE.Mesh;
      const drop = drops[i];
      const alpha = drop ? dropAlpha(drop, this.state.time) : 0;
      spot.visible = alpha > 0;
      if (!drop || alpha <= 0) continue;
      // Jeder Fleck ist ein bisschen anders groß — sonst liegt dort eine Reihe
      // gestanzter Punkte und keine Spur. Die Größe kommt aus dem Zeitstempel
      // und nicht aus dem Zufall, damit jedes Gerät dieselben Flecken malt.
      const size = 0.1 + 0.09 * Math.abs(Math.sin(drop.since * 12.9898));
      spot.position.set(drop.x, BLOOD_Y, drop.z);
      spot.scale.set(size, size, size);
      const material = spot.material as THREE.MeshBasicMaterial;
      material.opacity = BLOOD_OPACITY * alpha;
    }
  }

  /** Eine Scheibe Blut: flach auf dem Boden, ohne Tiefenschrift, ohne Licht. */
  private bloodSpot(): THREE.Mesh {
    this.bloodShape ??= new THREE.CircleGeometry(1, 10);
    const spot = new THREE.Mesh(
      this.bloodShape,
      new THREE.MeshBasicMaterial({
        color: BLOOD_COLOR,
        transparent: true,
        opacity: BLOOD_OPACITY,
        depthWrite: false,
      }),
    );
    spot.rotation.x = -Math.PI / 2;
    spot.renderOrder = -1;
    return spot;
  }

  /**
   * **Der Ghost des Monsters** (`rules/ghosts.ts`, Paket M3c): eine
   * halbdurchsichtige Kopie des Monstermodells an der Stelle, an der der
   * Techniker es zuletzt gesehen hat.
   *
   * **Und nur, solange er das echte nicht sieht.** Ein Ghost neben dem
   * leibhaftigen Vieh ist keine Erinnerung, sondern ein zweiter Gegner — und
   * er verriete obendrein, wie alt die Sichtung ist, die man gerade selbst
   * hat. Ob er es sieht, steht schon im Marker: `markGhost` versetzt ihn bei
   * jedem Sichtkontakt, also heißt ein Alter unter `GHOST_LIVE` genau „es
   * steht gerade im Blick". Ein zweiter Sichttest hier wäre eine zweite
   * Wahrheit.
   */
  private paintGhost(dt: number): void {
    const ghost = this.state.monsterOn ? this.state.ghosts.monster : null;
    const now = this.state.time;
    const alpha = ghost ? ghostAlpha(ghost, now) : 0;
    const show = !!ghost && alpha > 0 && ghostAge(ghost, now) >= GHOST_LIVE;
    const kind = this.state.crew.options.monster;
    if (this.ghostArt && this.ghostArt.kind !== kind) {
      this.ghostArt.dispose();
      this.ghostArt = null;
    }
    if (show && !this.ghostArt) {
      // **Ein zweiter Akteur derselben Sorte**, und der Anstrich macht die
      // Erinnerung daraus (`actorArt.setGhost`): durchsichtig, kalt leuchtend,
      // ohne Tiefenschreiben. Eigene Materialien braucht dafür niemand mehr zu
      // klonen — `buildCreature` gibt jedem Aufruf seine eigenen, und auch die
      // Figur aus dem Regal bekommt sie je Kopie (`core/kaykitModel.freshCopy`).
      this.ghostArt = buildActor(kind);
      this.ghostArt.root.name = `ghost-${kind}`;
      this.live.add(this.ghostArt.root);
    }
    if (!this.ghostArt) return;
    const art = this.ghostArt.root;
    art.visible = show;
    // **Eine Erinnerung geht nicht** — sie steht, wo sie zuletzt gesehen
    // wurde. Das Bild braucht sie trotzdem: Ohne einen Takt stünde die Figur
    // aus dem Regal in ihrer Bindepose mit ausgestreckten Armen da.
    this.ghostArt.update(dt, 0);
    if (!show || !ghost) return;
    art.position.set(ghost.x, 0, ghost.z);
    art.rotation.y = ghost.yaw;
    this.ghostArt.setGhost(GHOST_SOLID * alpha);
  }

  /** Schläge des NPC-Hirns gibt es hier nicht mehr (`setNavigator`, `reach` 0): getroffen wird in `stepCrew`. */

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
  private manualDoor(id: string): void {
    if (!this.isHost || this.context?.role !== 'vr' || !this.stepping) return;
    const door = leafDoors(this.spec).find((d) => d.id === id);
    if (!door) return;
    // Gewollt gesperrt ist immer nur eine Tür, sie hält bis zum Ablauf, und
    // die nächste wartet — auch vor Ort, auch im Test (`rules/doorLocks.ts`).
    const out = toggleLock(this.locks, this.state.shut, id, this.state.time);
    this.state.shut = out.shut;
    // Ein Riegel, der wortlos nichts tut, gilt als kaputt — also sagen wir, warum.
    if (out.blocked) this.announce(LOCK_BLOCK_TEXT[out.blocked]);
  }

  /** Ein Schalter der Tafel, angewendet beim Gastgeber. */
  private applyFlip(id: string, on: boolean): void {
    const entry = this.spec.switches.find((one) => one.id === id);
    if (!entry) return;

    if (entry.kind === 'light') {
      if (on === this.state.lit.includes(entry.target)) return;
      // **Licht im Test-Zustand ohne Budget** (`stepping`, aber nicht
      // `running`): Vor und nach der Mission ist die Station hell, und eine
      // Lampe ist dort ein Schalter — an oder aus, ohne Frist.
      if (this.state.phase !== 'running') {
        this.flipLampPlain(entry.target);
        return;
      }
      // Sonst höchstens zwei Räume gleichzeitig, und die dritte Lampe macht
      // die älteste aus — derselbe Handel wie bei dem einen Riegel (`rules/lamps.ts`).
      const out = switchLamp(this.lampBook, this.state.lit, entry.target, this.state.time);
      this.state.lit = out.lit;
      if (out.dropped) this.lampSound(out.dropped);
      return;
    }

    // Türen: `on` heißt offen, und die Liste führt die geschlossenen. Gewollt
    // gesperrt ist immer nur eine, sie hält bis zum Ablauf, die nächste wartet
    // — **im Test wie in der Mission**, sonst sähe der Test nie den Balken;
    // eine zugefallene darf die Tafel jederzeit freigeben, die gehaltene nicht
    // (`rules/doorLocks.ts`).
    if (on) {
      if (lockBlock(this.locks, this.state.shut, entry.target, this.state.time) === 'held') return;
      this.state.shut = releaseLock(this.locks, this.state.shut, entry.target, this.state.time);
    } else this.state.shut = chooseLock(this.locks, this.state.shut, entry.target, this.state.time);
  }

  /**
   * **Die zwei Griffe der Schalttafel**, über die Karte und über die
   * Schalterliste derselben Tafel (`views/panelRole.ts`).
   *
   * Geschaltet wird nach wie vor über die Tafel aus `panel.ts` und nicht an
   * ihr vorbei: Wer etwas antippt, wofür es keinen Schalter gibt (eine Tür,
   * die nicht im Grundriss steht), bekommt `''` zurück und die Ansicht sagt
   * genau das. **Versteckt ist nichts mehr**: Die halbe Tafel lag lange hinter
   * dem Sicherungskasten, und wer die Fähigkeit hielt, bekam für das Licht im
   * Upper Engine „dafür gibt es keinen Schalter" — der Besitzer wollte das
   * nicht. Was die Tafel knapp hält, sind Riegel und Lampenbudget.
   *
   * **Einen dritten Griff gab es einmal**: den Schallköder, ein Radio je zwei
   * Zimmer. Er ist gestrichen (`panel.ts`) — wer den richtigen Knopf gefunden
   * hatte, parkte das Monster in einer Ecke, und der Rest der Runde fand ohne
   * es statt.
   *
   * @returns die Zeile für den Spieler, oder `''`, wenn es dafür keinen
   *   Schalter gibt.
   */
  private panelSwitch(kind: 'door' | 'light', target: string): string {
    // **Auch vor dem Start schaltet die Tafel** — das ist der Test-Zustand, in
    // dem die Rollen ausprobiert werden (`applyFlip`). Nur nach dem Ende einer
    // Runde nicht mehr: Dann steht die Station, bis jemand sie stoppt oder
    // neu startet.
    if (!this.stepping) return 'Die Runde ist vorbei — erst stoppen oder neu starten.';
    const entry = this.spec.switches.find((one) => one.kind === kind && one.target === target);
    if (!entry) return '';
    const on =
      kind === 'door' ? !this.state.shut.includes(target) : this.state.lit.includes(target);
    // **Warum ein Schott gerade nicht geht, weiß jedes Gerät** — aus dem
    // Stand (`held`, `cooling`), nicht nur der Gastgeber aus seiner
    // Buchführung: gehalten, belegt, warm (`rules/doorLocks.lockBlock`).
    if (kind === 'door') {
      const block = lockBlock(this.doorBooks(), this.state.shut, target, this.state.time);
      if (block) return LOCK_BLOCK_TEXT[block];
    }
    this.flip(entry.id, !on);
    if (kind === 'door') return on ? 'Schott gesperrt.' : 'Schott freigegeben.';
    return on ? 'Licht aus.' : 'Licht an.';
  }

  /** Was über die Riegel bekannt ist: beim Gastgeber die Buchführung, sonst der Stand. */
  private doorBooks(): Pick<DoorLocks, 'chosen' | 'cooling'> {
    if (this.isHost) return this.locks;
    return { chosen: this.state.held ?? '', cooling: this.state.cooling ?? [] };
  }

  /**
   * **Was auf dem Ausrüstungstisch liegt** (`commandRoom.gearSlot`): die
   * Lampe (`stationTorch`, eigener Weg), in jeder Runde eine Blendgranate,
   * in der Übung dazu Röntgen und Radar. Gewünscht: _„in der übungsrunde
   * kann dort z. B. auch das röntgen gerät drauf gelegt werden."_ Liegt da,
   * bis es jemand nimmt (Hand oder `E`) — dann steht es auch im Inventar und
   * kommt erst mit der nächsten Runde wieder. Was nicht mehr dazugehört
   * (Röntgen nach der Übung), verschwindet vom Tisch. Nur für den Techniker:
   * Andere Geräte haben keinen Tisch voller Werkzeug.
   */
  private stepGear(ctx: WorldContext): void {
    const state = this.state;
    const own = (this.suited || ctx.role === 'vr') && !state.crew.simulation;
    const practice =
      own && (state.phase === 'briefing' || (state.phase === 'running' && state.crew.options.test));
    const wanted = new Set<string>(
      own && (state.phase === 'briefing' || state.phase === 'running')
        ? practice
          ? TABLE_GEAR
          : ['stun-grenade']
        : [],
    );
    TABLE_GEAR.forEach((id, index) => {
      const tool = this.tableGear.get(id);
      const entry = tool ? this.props.find((prop) => prop.object === tool) : undefined;
      if (tool && (!entry || tool.heldBy)) {
        // Genommen — mit der Hand oder vom Schirm (`takeGear`).
        this.tableGear.delete(id);
        this.gearTaken.add(id);
        if (!state.crew.inventory.includes(id)) state.crew.inventory.push(id);
        return;
      }
      if (!wanted.has(id)) {
        if (entry) this.removeProp(entry, false);
        this.tableGear.delete(id);
        return;
      }
      if (tool || this.gearTaken.has(id) || state.crew.inventory.includes(id)) return;
      const at = gearSlot(index + 1);
      const placed = this.placeTool(id, new THREE.Vector3(at.x, at.y, at.z), GEAR_TURN, true);
      if (placed) this.tableGear.set(id, placed);
    });
  }
  private readonly tableGear = new Map<string, Tool>();
  /** Was in dieser Runde schon vom Tisch genommen wurde — kommt erst mit der nächsten wieder. */
  private readonly gearTaken = new Set<string>();

  /** Vom Schirm aus nehmen (`E`): das Werkzeug vom Tisch, ins Inventar. */
  private takeGear(id: string): void {
    const tool = this.tableGear.get(id);
    const entry = tool ? this.props.find((prop) => prop.object === tool) : undefined;
    if (entry) this.removeProp(entry, false);
    this.tableGear.delete(id);
    this.gearTaken.add(id);
    if (!this.state.crew.inventory.includes(id)) this.state.crew.inventory.push(id);
  }

  /**
   * **Neue Runde, leere Hände** — gewünscht: _„beim start einer runde sollen
   * den spielern in haunting die werkzeuge wegenommen werden. Es muss dann
   * geschaut werden und neu in die hand genommen werden wie bei der
   * taschenlampe."_ Hände und Gürtel werden leer (`clearCarriedGear`), was
   * noch auf dem Tisch lag, geht, und die Lampe liegt wieder dort
   * (`placeTableTorch`); den Rest legt `stepGear` im nächsten Bild hin.
   */
  private resetGear(ctx: WorldContext): void {
    if (!this.suited && ctx.role !== 'vr') return;
    this.clearCarriedGear();
    for (const tool of [...this.tableGear.values(), this.stationTorch]) {
      const entry = tool ? this.props.find((prop) => prop.object === tool) : undefined;
      if (entry) this.removeProp(entry, false);
    }
    this.tableGear.clear();
    this.gearTaken.clear();
    this.stationTorch = null;
    this.placeTableTorch(ctx);
  }

  /** Die Lampe auf den Ausrüstungstisch (`commandRoom.gearSlot(0)`), eingeschaltet. */
  private placeTableTorch(ctx: WorldContext): void {
    if (this.stationTorch) return;
    const at = gearSlot(0);
    const torch = this.placeTool(
      'flashlight',
      new THREE.Vector3(at.x, at.y, at.z),
      GEAR_TURN,
      true,
    );
    if (torch instanceof FlashlightTool) this.stationTorch = torch;
    this.torchImmersive = ctx.renderer.xr.isPresenting;
    this.stationTorch?.setBeamGuide(false);
    this.stationTorch?.setLit(true);
  }

  /**
   * **Gezündete Blendgranaten** (`tools/StunGrenadeTool.ts`) — je Bild an
   * beiden Händen nachgesehen; was gezündet wurde, geht an die Runde
   * (`FlatRound.stun`), und es blitzt.
   */
  private stepGrenades(): void {
    for (const hand of ['left', 'right'] as const) {
      const tool = this.carriedTool(hand);
      if (!(tool instanceof StunGrenadeTool)) continue;
      const blast = tool.takeBlast();
      if (blast) this.blastGrenade(blast);
    }
  }

  /** Eine Blendgranate geht hoch — aus der Hand oder vom Schirm (`G`). */
  private blastGrenade(at: { x: number; y?: number; z: number }): void {
    const index = this.state.crew.inventory.indexOf('stun-grenade');
    if (index >= 0) this.state.crew.inventory.splice(index, 1);
    this.experience?.flashAt(new THREE.Vector3(at.x, at.y ?? 1.2, at.z));
    const round = this.kernel?.round;
    if (!round) {
      this.say('Die Blendgranate verpufft.');
      return;
    }
    round.stun({ x: at.x, z: at.z });
  }

  /**
   * **Eine Markierung auf der Karte setzen** — oder mit `null` wegnehmen.
   * Wie der Schalter: bitten, nicht selbst tun; der Gastgeber trägt sie in
   * den Stand, und mit dem nächsten Stand steht sie überall.
   */
  private setPin(at: { x: number; z: number } | null): void {
    if (this.isHost) this.applyPin(at);
    else this.context?.net.emit(HAUNT_CHANNEL, pinMessage(at));
    // Sofort auch hier, damit der Finger nicht auf den nächsten Stand wartet.
    if (at) this.state.pin = at;
    else delete this.state.pin;
  }

  private applyPin(at: { x: number; z: number } | null): void {
    if (at) this.state.pin = { x: at.x, z: at.z };
    else delete this.state.pin;
  }

  /** Von der Schalttafel aus: bitten, nicht selbst tun. Gerechnet wird beim Gastgeber. */
  private flip(id: string, on: boolean): void {
    if (this.isHost) this.applyFlip(id, on);
    else this.context?.net.emit(HAUNT_CHANNEL, flipMessage(id, on));
  }

  /** Ob die Station gerade bespielt wird — Mission oder Test, nicht nach dem Ende. */
  private get stepping(): boolean {
    return this.state.phase === 'running' || this.state.phase === 'briefing';
  }

  /**
   * **Eine Lampe ohne Budget** — der Test-Zustand kennt kein Lampenbudget
   * (`FlatRound.switchLight` tut dort dasselbe): an oder aus, ohne Frist. Die
   * Türen dagegen laufen auch im Test mit ihren Fristen (`applyFlip`).
   */
  private flipLampPlain(target: string): void {
    this.state.lit = this.state.lit.includes(target)
      ? this.state.lit.filter((one) => one !== target)
      : [...this.state.lit, target];
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
    const bot = this.experience?.botPosition;
    if (bot) occupants.push(bot);
    for (const peer of this.context?.net.peers.values() ?? []) {
      if (peer.pose && this.wearsSuit(peer))
        occupants.push({ x: peer.pose.head[0], y: peer.pose.head[1], z: peer.pose.head[2] });
    }
    occupants.push(...this.monsterWalkers());
    return occupants;
  }

  /**
   * **Auch der Monster-Anzug geht durch die Tür** — solange keine Runde
   * läuft. Gewünscht: _„aktuell kann ja der spieler mit dem techniker anzug
   * durch die tür, aber es soll auch das monster können (solange keine runde
   * eben aktiv ist)"_. In der Runde ist er das Monster (`state.monster`).
   * Wer ihn trägt: ich (`monsterSuited`) oder wer den Platz `monster` hält.
   */
  private monsterWalkers(): Array<{ x: number; z: number }> {
    const ctx = this.context;
    if (!ctx || this.state.phase === 'running') return [];
    const out: Array<{ x: number; z: number }> = [];
    if (this.monsterSuited) {
      ctx.rig.getHeadPosition(_walker);
      out.push({ x: _walker.x, z: _walker.z });
    }
    const owner = ownerOf(this.currentClaims(), 'monster');
    const peer = owner ? ctx.net.peers.get(owner) : undefined;
    if (peer?.pose) out.push({ x: peer.pose.head[0]!, z: peer.pose.head[2]! });
    return out;
  }

  private applyDoors(dt: number): void {
    const now = this.state.shut.join(',') + `/test:${this.state.crew.options.test}`;
    const before = this.builtDoors;
    this.builtDoors = now;
    const shut = new Set(this.state.shut);
    const doors = this.spec.doors;
    // **Die abkühlenden Riegel hinaus an alle** (`rules/doorLocks.ts`). Die
    // Buchführung bleibt beim Gastgeber; diese eine Liste daraus muss über
    // die Leitung, weil sonst der Hacker vierzig Sekunden lang einen Schalter
    // vor sich hat, der nichts tut und nicht sagt warum.
    if (this.isHost) {
      this.state.cooling = this.locks.cooling;
      this.state.held = this.locks.chosen;
    }
    // **Und ab und zu fährt ein Schott von selbst auf** — beim Gastgeber
    // ohne Kern; sonst tut es die Runde (`rules/doorGlitch.ts`).
    // Gerechnet beim Gastgeber, angewendet über dieselbe Mechanik wie jedes
    // andere Auffahren: ein Bewohner, der keiner ist. Gesperrte Schotts sind
    // nicht dabei — der Riegel ist die eine Entscheidung der Tafel.
    const glitch =
      this.isHost && !this.kernel
        ? stepGlitch(
            this.glitch,
            doors.filter((door) => !isPassage(door) && !shut.has(door.id)).map((door) => door.id),
            this.state.time,
            () => this.glitchDice.next(),
          ).id
        : '';
    const occupants = this.doorOccupants();
    const kernel = this.isHost ? this.kernel : null;
    // Beim Gastgeber mit Kern fährt die Runde die Türen — der Monster-Anzug
    // steht dort als Gast davor (`FlatRound.guests`).
    if (kernel) kernel.round.guests = this.monsterWalkers();
    for (const door of doors) {
      // Ein offener Durchgang ist immer offen — kein Blatt, keine Automatik.
      if (isPassage(door)) {
        this.openDoors.add(door.id);
        continue;
      }
      const at = doorEdge(door);
      const ghosts = door.id === glitch ? [...occupants, { x: at.x, z: at.z }] : occupants;
      // Beim Gastgeber fährt die Runde die Blätter (`FlatRound.stepDoors`,
      // dieselbe Automatik).
      const open = kernel
        ? kernel.round.doorOpen(door.id)
        : this.automaticDoors.step(door.id, at, shut.has(door.id), ghosts, dt);
      if (open) this.openDoors.add(door.id);
      else this.openDoors.delete(door.id);
      for (const edge of doorEdges(door)) this.setSlidingGridDoor(edge.x, edge.z, edge.dir, open);
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
      if (had.has(id)) continue;
      playSlam();
      return;
    }
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
  /** **Brennt an dieser Stelle Licht?** — das Board (`state.lit`), vor der Mission überall. */
  private boardLit(x: number, z: number): boolean {
    const bright =
      (this.state.crew.options.test && this.state.crew.options.bright) ||
      this.state.phase === 'briefing';
    if (bright) return true;
    const room = roomAt(this.spec, Math.floor(x / TILE), Math.floor(z / TILE));
    return !!room && this.state.lit.includes(room.id);
  }

  private applyLights(dt = 1): void {
    // **Vor der Mission ist die Station hell** — der Test-Zustand, in dem
    // jeder herumläuft und Rollen ausprobiert; dunkel wird es mit dem Start
    // (`startMission`). Das Testlicht des Trainings bleibt daneben bestehen.
    const bright =
      (this.state.crew.options.test && this.state.crew.options.bright) ||
      this.state.phase === 'briefing';
    this.context?.rig.getHeadPosition(_head);
    const tileX = Math.floor(_head.x / TILE);
    const tileZ = Math.floor(_head.z / TILE);
    const viewRoom = roomAt(this.spec, tileX, tileZ);
    const poweredDeck =
      onApron(tileX, tileZ) || (!!viewRoom && this.state.lit.includes(viewRoom.id));
    const lighting = stationLighting(this.state.crew, poweredDeck);
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
    // **Und im Notfall rot** — gewünscht: _„dass Lampen ggf dort in rot
    // ‚Notfall' leuchten sollen und blinken bzw. wie diese Dreh Lichter"_.
    // Dieselben Leuchten, die brennen, pulsieren rot im Takt der Drehleuchten
    // (`alarmPulse`); die Lampen aus dem Regal mit _Notlicht_ drehen sich
    // (`core/Lamps.ts`, `lampBook.alarm`).
    const emergency = !!deck?.emergency || !!deck?.alarm || this.state.phase === 'lost';
    sceneLamps.alarm = emergency;
    const alarmGlow = emergency ? 0.25 + 0.75 * alarmPulse(this.state.time) : 1;
    if (this.testLight)
      this.testLight.intensity = THREE.MathUtils.damp(
        this.testLight.intensity,
        lighting.ambient,
        8,
        dt,
      );
    for (const light of this.commandLights) light.intensity = COMMAND_LAMP * lighting.command;
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
        const spook = this.runningRound()?.spook ?? null;
        const haunted = !bright && spook && id === spook.room ? flickerLevel(spook.since) : 1;
        const glow = Math.min(haunted, lampGlow(this.lampBook, id, this.state.time));
        light.position.copy(lamp.at);
        light.distance = lamp.reach;
        light.color.setHex(emergency ? LAMP_ALARM : lamp.color);
        light.intensity = LAMP_ON * glow * lampScale * alarmGlow;
      }
    }
    for (const [id, lamp] of this.lamps)
      lamp.glass.material.color.lerpColors(
        _lampOff,
        emergency ? _lampAlarm : _lampOn,
        !lighting.dark && (deck ? deck.lamps : bright || this.state.lit.includes(id))
          ? lampGlow(this.lampBook, id, this.state.time) * alarmGlow
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

  /**
   * Hide detail meshes in rooms that no open doorway can currently reveal.
   *
   * **Von oben zählt die Figur und nicht die Kamera** (`topDownRooms`): Die
   * Kamera über der Station hat jede Tür im Bild, und die Frage „liegt die
   * Öffnung im Blickfeld" war dort immer ja — die Nachbarräume standen offen
   * da, samt dem, was darin läuft. Dazu schaltete das Telefon des
   * Technikers das Ausblenden ganz ab, weil `ui` gesetzt war; ganz sehen darf
   * aber nur, wer zuschaut (Tafel, Archiv, Bot-Runde), und nicht, wer den
   * Techniker am Bordstock spielt. Von oben decken die Deckel zu, was die
   * Figur nicht sieht (`world3d/topDownFog.ts`).
   */
  private cullRoomArt(dt: number, ctx: WorldContext): void {
    const full = (!!this.ui && !this.suited) || this.state.crew.simulation;
    const topDown = ctx.topDown && !full;
    this.fog?.setTopDown(topDown);
    ctx.rig.getHeadPosition(_head);
    // **Die Kamera des Spielers, auch in der Brille** — nicht `xr.getCamera()`.
    // Deren Weltmatrix stammt aus dem letzten Bild und kennt eine Drehung des
    // Körpers (Einrasten um 45° oder 90°) erst ein Bild später; dann stünde für
    // ein Bild genau das ausgeblendet, was jetzt vor einem liegt. Die Kamera des
    // Spielers trägt die Kopfhaltung als lokale Matrix unter dem Körper und die
    // Projektion über beide Augen (`WebXRManager.updateUserCamera`) — mit der
    // frischen Matrix des Körpers darüber ist sie aktuell.
    const camera = ctx.camera;
    camera.updateWorldMatrix(true, false);
    camera.getWorldQuaternion(this.cullRotation);
    this.cullTimer -= dt;
    // Von oben zählt, welche Blätter gerade offen stehen (`topDownRooms`,
    // `leafOpen`) — dieselben, die das Bild auffahren lässt.
    const doors =
      this.state.shut.join(',') +
      (topDown ? `/${[...this.openDoors].filter((id) => this.leafOpen(id)).join(',')}` : '');
    if (
      !full &&
      this.cullTimer > 0 &&
      doors === this.culledDoors &&
      topDown === this.culledTopDown &&
      this.culledHead.distanceToSquared(_head) < 0.25 &&
      Math.abs(this.culledRotation.dot(this.cullRotation)) > 0.9995
    )
      return;
    this.cullTimer = 0.2;
    this.culledDoors = doors;
    this.culledTopDown = topDown;
    this.culledHead.copy(_head);
    this.culledRotation.copy(this.cullRotation);
    this.roomFrustum.setFromProjectionMatrix(
      this.roomProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    );
    const visible = full
      ? null
      : topDown
        ? topDownRooms(this.spec, _head, this.state.shut, (door) => this.leafOpen(door.id))
        : portalRooms(this.spec, _head, this.state.shut, (door) => {
            const edge = doorEdge(door);
            const half = doorWidth(door) / 2;
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
            if (!this.roomFrustum.intersectsBox(this.doorwayBounds)) return null;
            return doorwayRect(this.doorwayBounds, this.roomProjection);
          });
    for (const [id, group] of this.roomArt) group.visible = !visible || visible.has(id);
    this.experience?.setVisibleRooms(visible);
    this.fog?.update(topDown ? visible : null);
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
    const lens: Readonly<WatchLens> = ui.station === 'watch' ? ui.watchLens : defaultLens();
    const view = `${ui.station}:${lens.seat}:${lens.follow}:${lens.eyes}:${lens.zoom}:${lens.pan.x}:${lens.pan.z}:${this.archiveRoom}:${this.spec.seed}`;
    if (view === this.phoneRenderView && now < this.nextPhoneRender) return true;
    this.phoneRenderView = view;
    this.nextPhoneRender = now + 1000 / 15;
    // **Welchen Platz das Bild zeigt** und nicht, an welchem man sitzt: Der
    // Zuschauer schlüpft in die Rollen der anderen (`watchLens.ts`), und für
    // die Kamera ist das dieselbe Frage wie bei einem, der wirklich dort sitzt.
    const shown = ui.shownView;
    const archive = shown === 'archive';
    const show = shown === 'watch';
    // **Durch die Augen des Technikers** bleibt das Haus, wie er es sieht:
    // mit Decke, mit Nebel, ohne das Tageslicht des Puppenhauses.
    const eyes = show && throughEyes(lens);
    // Die Decke bleibt nur dem Zuschauer weg, und sie geht nur bei Wechsel ab:
    // Eine Schnittebene, die je Bild kommt und geht, baut three.js jedes Mal
    // jeden Shader neu.
    this.liftLid(show && !eyes);
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
    const camera = show ? this.showCam : this.topCam;
    if (!camera) return true;
    if (archive) this.aimArchive(this.archiveRoom, aspect, head);
    if (show) this.aimShow(aspect, head, lens);

    // Der Archivar sieht **keine Lebewesen**: keinen Mitspieler, kein Monster,
    // keine Drohne. Sein Blatt ist ein Grundriss und keine Überwachung.
    this.live.visible = !archive;
    ctx.avatars.visible = !archive;
    if (this.paperLight) this.paperLight.intensity = archive ? 2.2 : 0;
    if (this.paperSun) this.paperSun.intensity = archive ? 1.4 : 0;
    this.paperMask.visible = archive;
    this.paperDoors.visible = archive;
    // **Auf dem Blatt brennt kein Licht.** Die Deckenlampen liegen knapp
    // unter der Schnittebene und standen deshalb als graue Scheiben mitten
    // in jedem Zimmer — eine Auskunft, die der Archivar gar nicht geben
    // soll: Ob es hell ist, sieht der Techniker selbst, und der Grundriss
    // wird davon nur unruhig. Nur ausgeblendet, nicht abgebaut; die anderen
    // Ansichten brauchen sie unverändert.
    for (const lamp of this.lamps.values()) lamp.glass.visible = !archive;
    if (archive) this.markDoors(this.archiveRoom);
    this.paperTint(archive);
    // **Der Zuschauer sieht Tag.** Der Nebel gehört zum Grusel derer, die
    // drinstecken; über dem Puppenhaus wäre er nur eine Milchglasscheibe.
    const fog = ctx.scene.fog;
    if ((show && !eyes) || archive) ctx.scene.fog = null;
    const creatureVisible = this.blob?.root.visible;
    if (archive && this.blob) this.blob.root.visible = false;
    if (this.showLight) this.showLight.intensity = show && !eyes ? 3.4 : 0;
    if (this.showSun) this.showSun.intensity = show && !eyes ? 2.2 : 0;

    const y = _size.y - rect.y - rect.h;
    renderer.setScissorTest(true);
    renderer.setScissor(rect.x, y, rect.w, rect.h);
    renderer.setViewport(rect.x, y, rect.w, rect.h);
    renderer.render(ctx.scene, camera);
    if (this.blob && creatureVisible !== undefined) this.blob.root.visible = creatureVisible;
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
    for (const lamp of this.lamps.values()) lamp.glass.visible = true;
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
  private aimShow(aspect: number, head: number, lens: Readonly<WatchLens>): void {
    const camera = this.showCam;
    if (!camera) return;
    const follow = lens.seat === 'deck' ? lens.follow : 'free';
    // **Durch seine Augen**: Die Kamera steht im Kopf des Technikers — wo
    // immer der gerade ist (`technicianEyes`). Gibt es keinen, bleibt es beim
    // Fenster über ihm, damit das Bild nicht schwarz wird.
    if (throughEyes(lens) && this.technicianEyes(camera)) {
      camera.fov = EYES_FOV;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      this.showAimed = false;
      return;
    }
    // Zurück aufs Puppenhaus: der feste Blick von schräg oben.
    camera.fov = SHOW_FOV;
    camera.rotation.set(-SHOW_PITCH, 0, 0);
    const target =
      follow === 'technician'
        ? this.technicianFocus()
        : follow === 'monster'
          ? this.state.monster
          : null;
    // **Zoom und Flug** (`watchLens.ts`): näher heißt ein kleineres Fenster,
    // und die Verschiebung reist mit — neben dem Verfolgten her oder über
    // das freie Deck.
    const zoom = Math.max(1, lens.zoom);
    const pan = lens.pan;
    if (target) {
      // **Nachziehen, nicht springen.** Der Stand kommt zehnmal je Sekunde
      // über die Leitung; eine Kamera, die auf jeden Punkt schnappt, ruckelt
      // sichtbar — dieselbe Vorsicht wie beim Rumpf der Drohne.
      this.showFocus.lerp(_showTarget.set(target.x, 0, target.z), this.showAimed ? 0.18 : 1);
      this.showAimed = true;
      const rise = Math.tan(((SHOW_FOV / 2) * Math.PI) / 180);
      const span = WATCH_FOLLOW_SPAN / zoom;
      const deep = span / Math.max(0.2, 1 - head);
      const far = Math.max(deep / (2 * rise), span / (2 * rise * aspect));
      const look = this.showFocus.z + pan.z - (head / 2) * deep;
      camera.position.set(
        this.showFocus.x + pan.x,
        Math.sin(SHOW_PITCH) * far,
        look + Math.cos(SHOW_PITCH) * far,
      );
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      return;
    }
    this.showAimed = false;
    const bounds = stationBounds(this.spec);
    const cx = (bounds.x + bounds.w / 2) * TILE + pan.x;
    const cz = (bounds.z + bounds.d / 2) * TILE + pan.z;
    // Ein Kachelrand ringsum: Das Haus soll im Bild stehen und nicht daran
    // kleben — und im Süden liegt der Vorplatz mit der Einsatzzentrale, die man gern
    // mitsieht, wenn die Drohne heimkommt.
    const wide = ((bounds.w + 1) * TILE) / zoom;
    // Nach Süden ein Stück mehr: Dort liegen der Vorplatz und die Einsatzzentrale, und wer
    // zusieht, will sehen, wie die Drohne heimkommt und was auf dem Tisch
    // landet. Und oben der Streifen für die Zeilen, die über dem Bild liegen.
    const deep = ((bounds.d + 3.4) * TILE) / zoom / Math.max(0.2, 1 - head);
    const rise = Math.tan(((SHOW_FOV / 2) * Math.PI) / 180);
    const far = Math.max(deep / (2 * rise), wide / (2 * rise * aspect));
    const look = cz + (1.2 * TILE) / zoom - (head / 2) * deep;
    camera.position.set(cx, Math.sin(SHOW_PITCH) * far, look + Math.cos(SHOW_PITCH) * far);
    camera.aspect = aspect;
    // **Die hintere Kappe wandert mit.** Ein hochkant gehaltenes Telefon
    // schiebt die Kamera weit hinaus (quer ist wenig Platz), und mit einer
    // festen Kappe lag das ganze Haus dahinter: schwarzes Bild, kein Fehler
    // im Log. Die Zahl ist deshalb keine Einstellung, sondern eine Rechnung —
    // der Abstand plus die halbe Ausdehnung des Hauses, großzügig.
    camera.far = far + Math.max(deep, wide) + 20;
    camera.updateProjectionMatrix();
  }

  /**
   * **Wo der Techniker steht** — aus dem Stand, wenn er in 2D spielt, sonst
   * aus dem Modelltechniker der Bot-Runde und zuletzt aus der Pose des
   * Mitspielers im Headset. Drei Quellen für eine Person, weil dieselbe Rolle
   * an drei Geräten hängen kann; ohne alle drei würde die Kamera des
   * Zuschauers je nachdem, wer spielt, ins Leere zeigen.
   */
  /**
   * **Die Kamera in den Kopf des Technikers stellen** — für „Durch seine
   * Augen" (`watchLens.throughEyes`). Dieselben drei Quellen wie
   * `technicianFocus`, nur mit Blickrichtung: Die Brille schickt ihre ganze
   * Kopfpose (`PeerPose.head`, Ort und Drehung), Modelltechniker und
   * 2D-Techniker nur Ort und Gierwinkel — die stehen dann in Augenhöhe und
   * schauen geradeaus. Gibt `false` zurück, wenn niemand da ist.
   */
  private technicianEyes(camera: THREE.PerspectiveCamera): boolean {
    const suit = this.suitPeer();
    if (suit?.pose) {
      const h = suit.pose.head;
      camera.position.set(h[0], h[1], h[2]);
      camera.quaternion.set(h[3], h[4], h[5], h[6]);
      return true;
    }
    const bot = this.experience?.botPose;
    const flat = this.state.technician;
    const pose = bot ?? flat;
    if (!pose) return false;
    // Gierwinkel wie beim Crewmate (`showTechnician`): Der schaut nach +z,
    // die Kamera nach -z — eine halbe Drehung dazwischen.
    camera.position.set(pose.x, EYES_HEIGHT, pose.z);
    camera.rotation.set(0, pose.yaw + Math.PI, 0);
    return true;
  }

  private technicianFocus(): { x: number; z: number } | null {
    const flat = this.state.technician;
    if (flat) return { x: flat.x, z: flat.z };
    const bot = this.experience?.botPose;
    if (bot) return { x: bot.x, z: bot.z };
    const suit = this.suitPeer();
    if (suit?.pose) return { x: suit.pose.head[0]!, z: suit.pose.head[2]! };
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
   * **Den Techniker eines anderen Geräts ins Schiff stellen.**
   *
   * Er hat kein Rig und keine Avatar-Pose; alles, was von ihm über die
   * Leitung kommt, ist `HauntState.technician` — Stelle, Blick, und ob er
   * geht. Genau daraus wird hier ein Körper. Ohne ihn war der Fernseher eine
   * leere Station, in der Türen von selbst aufgingen, und der Zuschauer
   * konnte der Runde nicht folgen, obwohl sie vor ihm lief.
   */
  private showTechnician(dt: number): void {
    const at = this.state.technician;
    if (!at) {
      if (this.technicianArt) this.technicianArt.root.visible = false;
      return;
    }
    if (!this.technicianArt) {
      this.technicianArt = buildActor('crew');
      this.technicianArt.root.name = 'flat-technician';
      this.live.add(this.technicianArt.root);
    }
    const body = this.technicianArt.root;
    // Im Schrank und im Schacht ist er weg — dasselbe, was die Karte tut.
    body.visible = !this.state.crew.hidden && this.state.crew.venting <= 0;
    body.position.set(at.x, 0, at.z);
    // Der Crewmate schaut nach +z, die Welt rechnet Blickrichtungen nach -z
    // (`map/mapSnapshot`, Kopf der Datei) — dieselbe halbe Drehung wie beim
    // Modelltechniker der Bot-Runde (`ShipExperience`).
    body.rotation.y = at.yaw + Math.PI;
    // **Ein `moving` und kein Tempo**: Mehr sagt der Stand über ihn nicht
    // (`HauntState.technician`), also wird daraus ein Gehschritt
    // (`actorFit.ACTOR_PACE`) — wer rennt, sagt eine Zahl.
    this.technicianArt.update(dt, at.moving);
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

  /** Welcher Modus zuletzt im Menü stand (`roundMode`) — ändert er sich, wird es neu gebaut. */
  private shownMode: RoundMode | null = null;

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
    // **Feststecken — und heraus.** Der Wunsch des Besitzers: Wer in der
    // Brille im Boden steckt (eine Platte, ein Podest, ein Sprung ins Nichts),
    // soll sich am Handgelenk selbst retten können. Der Eintrag steht in
    // jeder Lage des Menüs, denn festgesteckt wird nicht nur in der Runde.
    const rescue = entry(
      'haunt:rescue',
      'Feststecken? Zurück auf den Boden',
      'Setzt dich mitten in dein Zimmer · draußen: in die Zentrale',
      () => {
        if (this.context) this.unstickPlayer(this.context);
      },
    );
    // **Der Baukasten** — Regal, Spielmodus, Weltänderungen, dasselbe Menü
    // wie in der Testwelt (`PortalWorld.menu`). Gewünscht: _„ich will in
    // haunting auch die möglichkeit haben, die welt umzubauen im baukasten
    // modus"_. Die Station ist fest (`STATION_SEED`); was umgebaut wird, geht
    // als Weltänderungen heraus und wird in den Code übernommen. Die Zeilen
    // stehen flach in der Liste: Die Tabelle der Bereiche
    // (`ui/menuGroups.MENU_PLACEMENT`) stellt Werkzeuge, Beutel und Regal nach
    // _Bauen & Gestalten_ und die Weltänderungen in die Werkstatt — ein
    // eigener Eintrag „Baukasten" blieb dabei leer zurück.
    const build = super.menu();
    // **Der Rechner _Spiel-Einstellungen_** (Oktober 2026, `openSettings`):
    // Rundentyp, „Runde starten", die Bots der Zentrale, Plätze & Fähigkeiten,
    // dann ausgegraut, was hier nicht einzustellen ist, und Ansicht, Ton,
    // Entwickler-Einstellungen, Feststecken. Gewünscht war genau diese Liste —
    // ohne Statuszeile, ohne drei Starts, ohne Wege zum Anzug oder zur
    // Zentrale, ohne Tageslauf und ohne die Ausrüstung des Anzugs.
    const crew = (this.crewSettings ??= loadCrew());
    const ctx = this.context;
    const mode = this.roundMode();
    const running = mode === 'real' || mode === 'demo';
    const typeName = ROUND_TYPE_LABELS[crew.type];
    const fill = ctx ? fillSeats(setup, crew, this.takers(ctx)) : null;
    const startSub = !fill
      ? typeName
      : fill.missing
        ? MISSING_TEXT[fill.missing]
        : `${typeName} · ${fill.bots.length ? `Bots: ${fill.bots.map((seat) => SEAT_LABELS[seat]).join(', ')}` : 'ohne Bots'}`;
    const wearer = ctx ? this.suitName(ctx) : null;
    const monsterWearer = this.monsterName();
    const owners = seating(this.currentClaims());
    const sitter = (seat: SeatId): string | null => {
      const owner = owners.get(seat as StationId);
      if (!owner) return null;
      return owner === ctx?.net.localId
        ? (ctx?.net.name ?? 'du')
        : (ctx?.net.peers.get(owner)?.name ?? 'jemand');
    };
    const suitRow = (seat: 'technician' | 'monster', name: string | null): MenuEntry => ({
      ...entry(
        `haunt:seat-${seat}`,
        name ? `${SEAT_LABELS[seat]}: ${name}` : SEAT_LABELS[seat],
        name
          ? `${name} trägt den ${seat === 'monster' ? 'Monster-' : 'Techniker-'}Anzug`
          : 'Ziehe den Anzug an, um diese Rolle einzunehmen',
        () =>
          this.context?.notify(
            `Der ${seat === 'monster' ? 'Monster-' : 'Techniker-'}Anzug hängt am Ständer an der Nordwand der Einsatzzentrale — hingehen, A drücken.`,
          ),
      ),
      disabled: name !== null,
    });
    const greyed = (id: string, label: string, sub: string): MenuEntry => ({
      ...entry(id, label, sub, () => undefined),
      disabled: true,
    });
    const rows: MenuEntry[] = [
      entry(
        'haunt:round-type',
        `Rundentyp: ${typeName}`,
        crew.type === 'practice'
          ? 'Hell, ohne Monster · antippen: „Echte Runde"'
          : 'Dunkel, mit Monster · antippen: „Übungsrunde"',
        () => {
          this.crewSettings = {
            ...crew,
            type: crew.type === 'practice' ? 'real' : 'practice',
          };
          saveCrew(this.crewSettings);
          this.context?.refreshWorldMenu();
        },
      ),
      running
        ? entry('haunt:stop', FLOW.stop, FLOW.stopHint, () => {
            if (this.context) this.stopRound(this.context);
          })
        : entry('haunt:start', 'Runde starten', startSub, () => {
            if (this.context) this.startCrewRound(this.context);
          }),
      entry(
        'haunt:bots',
        `Bots in der Einsatzzentrale: ${crew.bots}`,
        `0 bis ${MAX_BOTS} · sitzen auf dem Sofa oder laufen umher · übernehmen beim Start die freien Plätze`,
        () => {
          this.crewSettings = { ...crew, bots: nextBotCount(crew.bots) };
          saveCrew(this.crewSettings);
          this.crewBots?.setCount(this.crewSettings.bots);
          this.context?.refreshWorldMenu();
        },
      ),
      // **Plätze & Fähigkeiten**: Techniker und Monster nimmt man mit dem
      // Anzug; an den Farbplätzen stellt man nur ein, was sie können — wer
      // dort sitzt, entscheidet, wer sich hinsetzt, und sonst ein Bot.
      suitRow('technician', wearer),
      suitRow('monster', monsterWearer),
      ...COLOURS.map((seat): MenuEntry => ({
        id: `haunt:seat-${seat}`,
        label: SEAT_LABELS[seat],
        sub: `${roleName(seatAbilities(setup, seat)) || 'keine Fähigkeit'} · ${sitter(seat) ?? 'frei — ein Bot übernimmt, wenn einer übrig ist'}`,
        icon: 'cube',
        accent: deskOf(seat)?.colour ?? 0x65dce5,
        children: ABILITIES.map((ability): MenuEntry => ({
          ...entry(
            `haunt:power-${seat}-${ability}`,
            ABILITY_LABELS[ability],
            ABILITY_HINTS[ability],
            () =>
              this.applySetup(
                withPower(this.setup, seat, ability, !this.setup.seats[seat].powers[ability]),
              ),
          ),
          checked: setup.seats[seat].powers[ability],
        })),
      })),
      greyed(
        'haunt:rooms',
        `Station: ${this.state.crew.options.rooms} Räume`,
        'Feste Skeld-Karte · hier nicht einstellbar',
      ),
      entry(
        'haunt:monster-pace',
        `Monster-Tempo: ${monsterPaceLabel(crew.monsterPace)}`,
        'Wie viel schneller als du das Monster laufen kann · antippen: nächste Stufe',
        () => {
          this.crewSettings = { ...crew, monsterPace: nextMonsterPace(crew.monsterPace) };
          saveCrew(this.crewSettings);
          this.setMonsterPace(this.crewSettings.monsterPace);
          this.context?.refreshWorldMenu();
        },
      ),
      greyed(
        'haunt:monster-kind',
        `Gegner: ${MONSTERS.find((m) => m.id === this.state.crew.options.monster)!.name}`,
        'Hier nicht einstellbar',
      ),
      rescue,
      // Was die Welt sonst mitbringt; Tageslauf, der Weg zur Zentrale, „Nochmal"
      // und die Ausrüstung des Anzugs stehen hier nicht mehr.
      ...[...build, ...(this.experience?.menu() ?? [])].filter((row) => !DROPPED.has(row.id)),
    ];
    // **Wenige Unterseiten statt einer langen Liste** (`rules/menuPages.ts`):
    // oben die Runde, dann Plätze, das Ausgegraute, Ansicht, Ton, Entwickler.
    return pageHauntMenu(rows, (page, children) => ({
      ...page,
      icon: 'cube',
      accent: 0x65dce5,
      children,
    }));
  }

  /**
   * **Den Spieler aus dem Boden holen.** Gemessen wird, wo die Füße stehen:
   * In einem Zimmer der Station geht es in dessen freie Mitte
   * (`safeRoomSpawn` — dort steht kein Modul), überall sonst — Vorplatz,
   * Lehrzimmer, irgendwo im Nichts — zurück in die Einsatzzentrale. Die Höhe
   * misst `movePlayerTo` selbst gegen den Boden; ein Schutzschrank wird
   * vorher verlassen, sonst bliebe man am neuen Ort eingefroren.
   *
   * **Und die Füße kommen wirklich dorthin.** Bis hierher versetzte die
   * Rettung den Ursprung des Rigs — in der Brille also den Mittelpunkt des
   * Spielraums —, und der Kopf samt Physik-Kapsel blieb um den eigenen
   * Abstand davon daneben: Wer beim Start in der Wand stand, stand nach der
   * Rettung wieder darin. Der Befund „auch der Knopf hilft nicht" war genau
   * das (`PortalWorld.movePlayerTo`, `PlayerRig.placeFeetAt`).
   */
  private unstickPlayer(ctx: WorldContext): void {
    // Gemessen wird unter dem **Kopf**, nicht am Ursprung des Rigs: In der
    // Brille steht man selten genau darüber, und das Zimmer, in dem man
    // steckt, ist das unter den eigenen Füßen (`PlayerRig.placeFeetAt`).
    const feet = ctx.rig.getHeadPosition(_head);
    const here = roomAt(this.spec, Math.floor(feet.x / TILE), Math.floor(feet.z / TILE));
    const at = here ? safeRoomSpawn(this.spec, here.id) : { x: COMMAND_HOME.x, z: COMMAND_HOME.z };
    this.experience?.leaveLocker();
    this.movePlayerTo(ctx, new THREE.Vector3(at.x, 0, at.z));
    ctx.notify(
      here ? `Zurück auf den Boden · ${here.name}` : 'Zurück auf den Boden · Einsatzzentrale',
    );
  }

  /**
   * **Jede Ansage auch als Einblendung am Bildschirm** (`ShipExperience.flash`,
   * `ui/shipToast.ts`). `ctx.notify` allein landete am Bildschirm und am
   * Telefon nur im Status des Handgelenk-Menüs — also nirgends, wo man
   * hinsieht.
   */
  protected override announce(message: string): void {
    super.announce(message);
    this.experience?.flash(message);
  }

  /** In welcher Runde man gerade ist — Übung, echt, Vorführung, vorbei (`rules/roundFlow.ts`). */
  private roundMode(): RoundMode {
    return roundMode({
      phase: this.state.phase,
      test: this.state.crew.options.test,
      simulation: this.state.crew.simulation,
    });
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
    return [...ctx.net.peers.values()].some((peer) => this.wearsSuit(peer, ctx.net.world));
  }

  /**
   * **Ob dieser Mitspieler den Anzug trägt** — an seinem frischen Herzschlag
   * (`receive`, `kind: 'technician'`), in der Brille wie am Bildschirm. Die
   * eine Frage, die vorher an vier Stellen mit `peer.role === 'vr'` beantwortet
   * wurde. Seit der Anzug am Ständer hängt (`suited`), ist auch die Brille
   * kein Techniker mehr, bis sie ihn angezogen hat — und der Herzschlag ist
   * die einzige Antwort: Ein Gerät im Anzug rechnet mit der Rolle `vr` und
   * schickt ihn (`tickNet`), eines ohne schickt ihn nicht.
   */
  private wearsSuit(peer: Peer, world = 'haunting'): boolean {
    return peer.world === world && clock() - (this.technicians.get(peer.id) ?? -Infinity) < 3000;
  }

  /**
   * **Der Name des Menschen im Anzug** — für die Tafel der Zentrale: ich
   * selbst, wenn ich ihn trage, sonst der Mitspieler mit Brille oder frischem
   * Herzschlag; `null`, wenn ihn niemand trägt.
   */
  private suitName(ctx: WorldContext): string | null {
    if (this.suited) return ctx.net.name;
    for (const peer of ctx.net.peers.values()) if (this.wearsSuit(peer)) return peer.name;
    return null;
  }

  /**
   * **Wo ein Mitspieler im Schiff gezeichnet wird** (`RemoteAvatars.placement`).
   *
   * Wer den Anzug trägt — Brille oder Techniker am Bildschirm —, läuft
   * wirklich herum und wird dort gezeichnet, wo er ist (`null`). Alle anderen
   * in dieser Welt sind die Zentrale: Telefone und Bildschirme, die kein Rig
   * bewegen und deren Pose über die Leitung die Stelle vom Betreten ist, der
   * Spawn. Der Besitzer stünde dann als Spieler mitten auf dem Vorplatz, mit
   * jedem Telefon einer mehr in derselben Stelle. Stattdessen sitzen sie am
   * Tisch: auf dem Hocker ihres Geräts, oder in der Reihe dahinter
   * (`world3d/commandSeats.crewPlacement`, aus den Ansprüchen `seatOf`).
   *
   * Eine Ausnahme nimmt jemanden ganz aus dem Bild: **der Techniker aus dem
   * Stand.** Er trägt den Anzug, hat aber kein Rig — seine Stelle steht im
   * Stand (`state.technician`), und daraus zeichnet `showTechnician` schon
   * einen Körper. Sein Avatar am Spawn wäre ein zweiter Techniker.
   */
  private crewPlace(peer: Peer): PeerPose | null {
    if (peer.world !== 'haunting') return null;
    if (this.wearsSuit(peer)) {
      return this.state.technician && peer.role !== 'vr' ? HIDDEN_POSE : null;
    }
    // **Wer das Monster steuert, ist das Monster** — gezeichnet wird es als
    // Kreatur der Runde (`applyBlob`), die eigene Figur verschwindet so lange.
    if (
      this.state.phase === 'running' &&
      this.state.monsterOn &&
      seatOf(this.currentClaims(), peer.id) === 'monster'
    )
      return HIDDEN_POSE;
    const now = clock();
    if (now - this.crewPlacedAt > CREW_PLACE_RATE) {
      this.crewPlacedAt = now;
      const claims = this.currentClaims();
      const me = this.context?.net.localId ?? '';
      // **Nur wer an einem Rechner sitzt**, sitzt am Tisch: Ohne Platz läuft
      // man als Figur durch die Zentrale, und dort wird man gezeichnet.
      const crew = [...(this.context?.net.peers.values() ?? [])]
        .filter((one) => one.id !== me && one.world === 'haunting' && !this.wearsSuit(one))
        .map((one) => ({ id: one.id, station: seatOf(claims, one.id) }))
        // Wer den Monster-Anzug trägt, sitzt nirgends — er läuft.
        .filter((one) => one.station !== null && one.station !== 'monster');
      this.crewPlaces = crewPlacement(crew);
    }
    return this.crewPlaces.get(peer.id) ?? null;
  }

  /** Der Mitspieler im Anzug mit bekannter Pose — für Augen und Karte der Zentrale. */
  private suitPeer(): Peer | null {
    for (const peer of this.context?.net.peers.values() ?? [])
      if (this.wearsSuit(peer) && peer.pose) return peer;
    return null;
  }

  /**
   * **Ob ein Mensch den Anzug trägt** — hier oder auf einem anderen Gerät, in
   * der Brille oder am Bildschirm. Das entscheidet, ob die Tafel „Techniker:
   * Mensch" festhält und ob ein Start aus der Zentrale zu ihm geschickt wird
   * statt hier eine Runde mit einem Techniker aus Zahlen anzufangen.
   * `roomHasVr` bleibt die engere Frage: Nur der Brille nimmt niemand den
   * Anzug ab.
   */
  private roomHasTechnician(ctx: WorldContext): boolean {
    return this.suited || this.roomOccupied(ctx);
  }

  /**
   * Ob jemand **mit der Brille im Anzug** steckt. Dieselbe Frage wie
   * `roomOccupied`, nur ohne den Techniker am Desktop: Der ist ein Mensch wie
   * jeder andere und darf seine Rolle abgeben. Eine Brille ohne Anzug zählt
   * nicht — sie steht in der Zentrale wie jeder andere.
   */
  private roomHasVr(): boolean {
    const ctx = this.context;
    if (!ctx) return false;
    return (
      this.suited ||
      [...ctx.net.peers.values()].some((peer) => peer.role === 'vr' && this.wearsSuit(peer))
    );
  }

  /**
   * Wer noch in keinem Raum ist, kommt in den der Adresse (`hauntRoomFrom`).
   * Von der Startseite (`#haunting`) kommt man hier schon verbunden an — sie
   * fragt Name und Raum-Code ab, bevor sie diese Welt überhaupt lädt; der
   * Weg hier gilt dem, der im Hub die Brille aufhat und die Welt dort wählt.
   */
  private joinTable(ctx: WorldContext): void {
    if (!ctx.net.connected) ctx.join(hauntRoomFrom(location.search));
  }

  /**
   * Die Wahl der Lobby übernehmen: merken und die Anzeigen nachziehen. Van,
   * Brillenmenü zeigen dieselbe Wahl — wer sie an einer
   * Stelle umstellt, soll sie nicht an der nächsten noch alt vorfinden.
   */
  private setLobby(choice: LobbyChoice): void {
    this.lobbyChoice = choice;
    saveLobby(choice);
    this.ui?.refresh();
    this.context?.refreshWorldMenu();
  }

  /**
   * **Was dieses Gerät ist** — für `applyIntent` und die Rolle in 2D
   * (`rules/roundSetup.MyRole`): die Wahl der Lobby, außer dort, wo das Gerät
   * die Antwort selbst ist — die Brille trägt den Anzug, und wer an der
   * Station „Monster" sitzt, ist das Monster.
   */
  /**
   * **Die Tastenhilfe auf der Station** (`core/controlHints.ts`) — je nach
   * Rolle: Der Techniker läuft und benutzt, das Monster jagt, wer einen
   * Farbplatz hält, bedient seine Karte, und wer zuschaut, wählt einen Platz.
   */
  override hintZone(): HintZone | null {
    if (this.drivingMonster) return { kind: 'haunting', role: 'monster' };
    if (!this.suited && !this.atDesk) return { kind: 'haunting', role: 'crew' };
    const me = this.myPlace();
    if (me === 'technician' || me === 'monster') return { kind: 'haunting', role: me };
    if (me.startsWith('watch:')) return { kind: 'haunting', role: 'watch' };
    return { kind: 'haunting', role: 'map' };
  }

  private myPlace(): MyRole {
    const ctx = this.context;
    // Wer den Anzug trägt, ist der Techniker — in der Brille wie am
    // Bildschirm. Wer am Monster sitzt, ist das Monster. Sonst gilt die Wahl
    // der Lobby; nur „Techniker" gilt ohne Anzug nicht mehr (`suited`).
    if (this.suited) return 'technician';
    if (ctx && seatOf(this.currentClaims(), ctx.net.localId) === 'monster') return 'monster';
    const me = this.lobbyChoice.me;
    return me === 'technician' ? 'watch:technician' : me;
  }

  /**
   * **Eine Runde starten — im Schiff.** Herein kommt die Absicht der Lobby
   * (Spielen · Zuschauen · Trainieren); die alten drei Namen (`mission`,
   * `test`, `bot`) gehen ebenso, solange sie noch irgendwo stehen
   * (`asIntent`). Ob das Schiff dabei von oben oder aus den Augen zu sehen
   * ist, entscheidet _Menü → Ansicht_ des Kerns — nicht diese Welt.
   */
  private startRound(what: Intent | RoundKind, ctx: WorldContext): void {
    // Die Absicht schreibt Techniker und Monster auf die Tafel; die Plätze der
    // Zentrale bleiben, wie sie verteilt sind (`rules/lobby.applyIntent`).
    // **Wer selbst am Monster sitzt, bleibt das Monster**: „Zuschauen" darf
    // ihm die Runde nicht wegnehmen, und „Spielen" heißt für ihn, dass der
    // Techniker den Zahlen gehört.
    // **Mit Brille im Raum ist der Techniker ein Mensch** — auch wenn auf der
    // Tafel noch „Bot" steht, weil sie tagelang so lag (`lockTechnician`).
    this.applySetup(
      lockTechnician(
        applyIntent(this.setup, asIntent(what), this.myPlace()),
        this.roomHasTechnician(ctx),
      ),
    );
    this.launchRound(ctx, asIntent(what), null);
  }

  /**
   * **„Runde starten" am Rechner _Spiel-Einstellungen_** (`rules/crewBots.ts`):
   * Rundentyp und Bots der Zentrale statt einer Absicht. Wer einen Platz
   * genommen hat — Techniker-Anzug, Monster-Anzug, ein Rechner —, behält ihn;
   * die Bots füllen den Rest, das Monster vor den Rechnern, und nehmen nie
   * einen Platz, auf dem ein Mensch sitzt. Ohne Anzug geht der Wunsch an den
   * Gastgeber, und der verteilt die Plätze mit dem, was er sieht.
   */
  private startCrewRound(ctx: WorldContext, crew: CrewSettings = this.crewSettings): void {
    const intent: Intent = crew.type === 'practice' ? 'train' : 'play';
    if (!this.isHost && this.roomOccupied(ctx) && ctx.role !== 'vr') {
      if (this.state.phase === 'running') this.say(ROUND_RUNNING);
      else {
        ctx.net.emit(HAUNT_CHANNEL, startMessage(intent, this.setup, crew));
        this.say(START_SENT);
      }
      return;
    }
    const fill = fillSeats(this.setup, crew, this.takers(ctx));
    this.setMonsterPace(crew.monsterPace);
    if (fill.missing) {
      this.say(MISSING_TEXT[fill.missing]);
      return;
    }
    this.applySetup(fill.setup);
    this.crewBots?.assign(fill.bots);
    this.launchRound(ctx, intent, crew);
  }

  /** Das Monster-Tempo setzen — auch in einer Runde, die schon läuft. */
  private setMonsterPace(pace: number): void {
    this.monsterPace = pace;
    if (this.kernel) this.kernel.round.monsterPace = pace;
  }

  /** Wer seinen Platz schon selbst genommen hat (`rules/crewBots.Takers`). */
  private takers(ctx: WorldContext): Takers {
    const claims = this.currentClaims();
    const owners = seating(claims);
    return {
      technician: this.roomHasTechnician(ctx),
      monster: this.monsterSuited || !!ownerOf(claims, 'monster'),
      colours: new Set(COLOURS.filter((colour) => owners.has(colour))),
    };
  }

  /** Was die Runde mit der Tafel, wie sie steht, anfängt — für `startRound` und `startCrewRound`. */
  private launchRound(ctx: WorldContext, intent: Intent, crew: CrewSettings | null): void {
    const setup = this.setup;
    // **Steckt der Techniker in der Brille, startet er — auf Zuruf.** Wer in
    // der Zentrale sitzt, schickt dem Gastgeber Absicht und Tafel
    // (`net.startMessage`), und die Runde beginnt bei ihm; das Handgelenk-Menü
    // braucht er dafür nicht mehr aufzuklappen. Bis hierher endete derselbe
    // Tipp in `SHIP_OCCUPIED`: „Im Schiff trägt schon jemand anders den Anzug"
    // — was stimmte und genau der Grund war, warum das Telefon starten sollte.
    // Ein Zuschauer bekommt danach wie bisher sein Bild von oben; ein Platz
    // der Zentrale bleibt an seiner Karte.
    // **Auch ein Techniker am Bildschirm ist einer.** Bis hierher zählte nur
    // die Brille (`roomHasVr`): Wer „Web 3D" gewählt hatte, wartete im Schiff,
    // und das Telefon in der Zentrale fing hier eine eigene Runde mit einem
    // Techniker aus Zahlen an. Jetzt zählt, wer den Anzug trägt (`wearsSuit`).
    if (!this.isHost && this.roomOccupied(ctx) && ctx.role !== 'vr') {
      // **Läuft seine Runde schon, geht kein Wunsch hinüber.** Der Gastgeber
      // wiese ihn mit demselben Satz ab — nur sagte er ihn bisher sich selbst,
      // und hier stand „Start geht an den Techniker": der tote Knopf nach
      // einem Neuladen mitten in der Runde. Der Zuschauer sieht die Runde,
      // die läuft, auf seiner Karte (`views/`) — es ist der Stand des Gastgebers.
      if (this.state.phase === 'running') this.say(ROUND_RUNNING);
      else {
        ctx.net.emit(HAUNT_CHANNEL, startMessage(intent, setup, crew));
        this.say(START_SENT);
      }
      return;
    }
    // **Wer das Monster spielt, braucht jemanden zum Jagen.** Das Schiff
    // rechnet beim Techniker (`stepKernel`); ein Telefon am Steuer des
    // Monsters ohne Techniker im Raum hätte keine Runde, in der es steuert.
    // Bis zum 1-m-Gitter öffnete es dafür die gemalte Karte mit einem
    // Techniker aus Zahlen; jetzt sagt es, was fehlt (`MONSTER_NEEDS_TECHNICIAN`).
    if (this.myPlace() === 'monster' && !this.roomHasTechnician(ctx)) {
      this.say(MONSTER_NEEDS_TECHNICIAN);
      return;
    }
    // **„Monster: Mensch" ist eine Verabredung und noch kein Mensch.**
    //
    // Auf der Tafel steht, wem der Platz *gehört*; ob dort wirklich jemand
    // sitzt, entscheidet allein die Sitzordnung (`stations.ownerOf`), und
    // solange niemand sitzt, rechnet beim Gastgeber die Routine weiter
    // (`monster/netMonsterControl.ts`). Das ist richtig so — eine Runde, die
    // auf ein Telefon wartet, das niemand in die Hand nimmt, wäre keine Runde.
    // Falsch war nur, dass es niemand erfuhr: Man stellte „Mensch" ein, sah
    // ein Monster aus Zahlen und hielt den Knopf für kaputt. Also steht es
    // jetzt da, und zwar beim Start, wo die Verabredung getroffen wird.
    if (setup.seats.monster.who === 'human' && !ownerOf(this.currentClaims(), 'monster'))
      this.say(
        'Monster: Mensch — aber noch niemand am Steuer. Bis sich jemand auf den Platz setzt, rechnet die Routine.',
      );
    // Im Schiff steuert nur der Techniker aus Fleisch; ein Monster aus Fleisch
    // gibt es dort (noch) nicht — es rechnet die Routine.
    const inShip = roundKindOf(setup);
    // **Das Panel klappt zu — aber nur, wenn wirklich etwas losgeht.** Sonst
    // stand es mitten in der Runde, die gerade angefangen hat, und sah aus, als
    // wäre nichts passiert. Umgekehrt darf es bei einer Absage gerade *nicht*
    // zugehen: Die Meldung steht in der Statuszeile des Panels und wäre mit ihm
    // weg (`App.notify`). `requestBotRound` macht es genauso.
    if (inShip === 'bot') {
      this.requestBotRound(ctx);
      return;
    }
    // **Der Aufbau ist der Weg an den Stock** (`rules/worldMenu.shipStart`).
    // Bis hierher fragte `startMission` nur `ctx.role`, und das ist am Telefon
    // und am Desktop nicht `vr`: Der Startknopf der Einsatzzentrale lief für
    // jeden, der nicht vorher im Brillenmenü „Als Techniker am Desktop testen"
    // gewählt hatte, in ein stummes `return` — der Grund stand in der
    // Statuszeile des Handgelenk-Menüs, und die liegt hinter der Zentrale.
    // Wer im Aufbau startet und den Anzug tragen soll, bekommt ihn jetzt hier.
    switch (
      shipStart({
        atStick: ctx.role === 'vr',
        mine: this.myPlace() === 'technician',
        occupied: this.roomOccupied(ctx),
      })
    ) {
      case 'others':
        this.say(SHIP_OCCUPIED);
        return;
      case 'nobody':
        this.say(SHIP_NEEDS_TECHNICIAN);
        return;
      case 'stick':
        // Der Anzug hängt am Ständer: Wer der Techniker sein soll, zieht ihn
        // dort an — der Startknopf tut das nicht mehr mit (`SUIT_FIRST`).
        this.say(SUIT_FIRST);
        return;
      default:
        break;
    }
    const started = inShip === 'mission' ? this.startMission() : this.testMission();
    if (started) ctx.menu.toggle(false);
  }

  /**
   * **Der Reiter „Techniker" auf dem Telefon** (`StationHost.technician`).
   * Bis Oktober 2026 setzte er dieses Gerät an den Stock; jetzt hängt der
   * Anzug am Ständer in der Einsatzzentrale. Der Reiter steht deshalb vom
   * Rechner auf und sagt, wo der Anzug hängt — oder wer ihn schon trägt.
   */
  private takeStick(): void {
    const ctx = this.context;
    if (ctx && this.roomOccupied(ctx)) {
      this.say(this.roomHasVr() ? VR_KEEPS_TECHNICIAN : SHIP_OCCUPIED);
      return;
    }
    this.standUp();
    this.say(SUIT_FIRST);
  }

  // --- die Zentrale zum Herumlaufen -------------------------------------------

  /**
   * **An einen Rechner der Zentrale setzen** — `A` an einem der vier Monitore
   * (oder der Aufbau, `'setup'`). Erst jetzt kommt die Seite der Zentrale
   * (`StationUi`) über das Bild, aufgeschlagen auf dem Platz dieses Monitors;
   * bis dahin läuft man als Figur herum. In der Brille gibt es diese Seite
   * nicht, und im Anzug bedient man keine Zentrale.
   */
  private openConsole(me: MyRole | 'setup'): void {
    const ctx = this.context;
    if (!ctx) return;
    if (this.suited) {
      this.say(DESK_SUITED);
      return;
    }
    if (ctx.renderer.xr.isPresenting) {
      this.say(DESK_IN_VR);
      return;
    }
    if (this.monsterSuited) {
      this.say('Im Monster-Anzug bedienst du keinen Platz der Zentrale — erst am Ständer ablegen.');
      return;
    }
    this.atDesk = true;
    this.ui ??= this.stationUi(ctx);
    this.ui.open(me);
    // **Wer am Rechner sitzt, sitzt** — auf dem Bürostuhl davor. Gewünscht:
    // _„Und wenn ein spieler damit intergaiert und das menü auf hat, sitzt der
    // spieler."_ Die anderen sehen ihn dort (`crewPlace`); hier sinkt die
    // eigene Figur auf den Stuhl (`PortalWorld.sitOn`).
    const chair = me === 'setup' ? null : this.chairAnchors.get(me as CommandDesk['station']);
    if (chair && this.sittingOn !== chair) {
      this.standFromSeat(ctx);
      this.sitOn(ctx, chair);
    }
    ctx.menu.toggle(false);
    ctx.refreshWorldMenu();
  }

  /**
   * **Vom Rechner aufstehen** (`StationHost.leave`, der Knopf „Aufstehen") —
   * die Seite der Zentrale geht zu, der Bordstock kommt wieder
   * (`syncTouchStick`), und der Platz wird frei, für alle sofort
   * (`net.releaseMessage`).
   */
  private standUp(): void {
    const ctx = this.context;
    this.atDesk = false;
    this.ui?.dispose();
    this.ui = null;
    this.paperTint(false);
    if (ctx && this.sittingOn && [...this.chairAnchors.values()].includes(this.sittingOn))
      this.standFromSeat(ctx);
    if (ctx && this.wanted) {
      this.claims.delete(ctx.net.localId);
      ctx.net.emit(HAUNT_CHANNEL, releaseMessage());
    }
    this.wanted = null;
    ctx?.refreshWorldMenu();
  }

  /**
   * **`A` am Anzugständer**: anziehen — dann ist dieses Gerät der Techniker
   * (`suited`, im nächsten Bild baut `tick` die Rolle um) — oder, wer ihn
   * trägt, wieder ausziehen. Trägt ihn schon jemand anders, sagt der Ständer,
   * wer.
   */
  private toggleSuit(): void {
    const ctx = this.context;
    if (!ctx) return;
    if (this.suited) {
      this.leaveSuit(null);
      this.say(SUIT_OFF);
      return;
    }
    if (this.roomOccupied(ctx)) {
      const name = this.suitName(ctx);
      this.say(name ? `Den Anzug trägt schon ${name}.` : SHIP_OCCUPIED);
      return;
    }
    if (this.monsterSuited) {
      this.say('Erst den Monster-Anzug ablegen — einer trägt nur einen Anzug.');
      return;
    }
    if (this.atDesk) this.standUp();
    this.suited = true;
    this.say(SUIT_ON);
  }

  // --- der Monster-Anzug ------------------------------------------------------

  /**
   * **Wer den Monster-Anzug trägt** — ich, oder wer den Platz `monster` hält
   * (`stations.ownerOf`). `null`, wenn ihn niemand trägt: Dann rechnet die
   * Routine, und auf dem Schild steht „Bot".
   */
  private monsterName(): string | null {
    const ctx = this.context;
    if (!ctx) return null;
    if (this.monsterSuited) return ctx.net.name;
    const owner = ownerOf(this.currentClaims(), 'monster');
    return owner ? (ctx.net.peers.get(owner)?.name ?? 'jemand') : null;
  }

  /**
   * **`A` am Monster-Anzug**: anziehen oder wieder ausziehen. Wer ihn trägt,
   * hält den Platz `monster` (`sit`), die Tafel sagt „Monster: Mensch", und
   * die Figur wird zum Roboter des Monsters. Läuft die Runde, steht man an der
   * Stelle des Monsters und steuert es selbst (`driveMonster`); vorher läuft
   * man wie jeder durch die Zentrale. Gewünscht: _„Wenn jemand das monster als
   * anzug nimmt, wird es zur start position teleportiert, wenn die runde
   * beginnt."_
   */
  private toggleMonsterSuit(): void {
    const ctx = this.context;
    if (!ctx) return;
    if (this.monsterSuited) {
      this.leaveMonsterSuit(ctx);
      this.say('Monster-Anzug abgelegt — die Routine übernimmt wieder.');
      return;
    }
    if (this.suited) {
      this.say('Erst den Techniker-Anzug ablegen — einer trägt nur einen Anzug.');
      return;
    }
    if (ctx.renderer.xr.isPresenting) {
      this.say(
        'Das Monster spielt man am Handy oder Bildschirm — in der Brille trägst du den Techniker-Anzug.',
      );
      return;
    }
    const owner = ownerOf(this.currentClaims(), 'monster');
    if (owner && owner !== ctx.net.localId) {
      this.say(`Den Monster-Anzug trägt schon ${ctx.net.peers.get(owner)?.name ?? 'jemand'}.`);
      return;
    }
    if (this.atDesk) this.standUp();
    this.monsterSuited = true;
    this.sit('monster');
    this.applySetup(withWho(this.setup, 'monster', 'human'));
    ctx.dress?.(MONSTER_FIGURE);
    this.say(
      'Monster-Anzug an — wenn die echte Runde beginnt, stehst du am Start des Monsters. A: Klappe, Tür, Kabine.',
    );
  }

  /** Den Monster-Anzug ablegen: Platz frei, die Routine übernimmt, die eigene Figur zurück. */
  private leaveMonsterSuit(ctx: WorldContext): void {
    if (!this.monsterSuited) return;
    if (this.drivingMonster) this.stopDriving(ctx);
    this.monsterSuited = false;
    if (this.wanted === 'monster') {
      this.claims.delete(ctx.net.localId);
      ctx.net.emit(HAUNT_CHANNEL, releaseMessage());
      this.wanted = null;
    }
    this.applySetup(withWho(this.setup, 'monster', 'bot'));
    ctx.dress?.(null);
  }

  /**
   * **Das Monster selbst steuern** — jedes Bild, solange man den Anzug trägt
   * und eine Runde mit Monster läuft. Der Stock geht als Steuer an den, der
   * rechnet (`NetMonsterPort`, zehnmal in der Sekunde über `tickNet`), und die
   * eigene Figur steht, wo das Monster steht: beim ersten Bild versetzt —
   * das ist der Startplatz des Monsters —, danach weich hinterher, weil der
   * Stand nur viermal in der Sekunde kommt. Ist die Runde vorbei, geht es
   * zurück in die Zentrale.
   */
  private driveMonster(ctx: WorldContext, dt: number): void {
    const monster = this.kernel?.round.monster ?? this.state.monster;
    const live =
      this.monsterSuited && this.state.phase === 'running' && this.state.monsterOn && !!monster;
    if (!live) {
      if (this.drivingMonster) this.stopDriving(ctx);
      return;
    }
    const loco = this.kernelLoco;
    // Die Physik trägt die Figur nicht — sie hängt am Monster.
    if (loco) loco.active = true;
    ctx.rig.getHeadPosition(this.monsterSight.position);
    this.monsterSight.position.y = 2.2;
    if (!this.drivingMonster) {
      this.drivingMonster = true;
      this.monsterSight.intensity = MONSTER_SIGHT;
      if (!this.monsterSight.parent) this.root.add(this.monsterSight);
      this.movePlayerTo(ctx, new THREE.Vector3(monster.x, 0, monster.z));
      this.say('Du bist das Monster — such den Techniker.');
      return;
    }
    // Das Steuer greifen, sobald der Platz bestätigt ist (`NetMonsterPort.claim`).
    if (this.netPort && !this.netPort.claimed()) this.netPort.claim();
    const pace = PLAYER_WALK_SPEED;
    const wish = loco && !ctx.rig.paused ? loco.wish : _zero;
    const wished = Math.hypot(wish.x, wish.z);
    const magnitude = Math.min(1, wished / pace);
    this.netPort?.input({
      x: wished > 1e-6 ? (wish.x / wished) * magnitude : 0,
      z: wished > 1e-6 ? (wish.z / wished) * magnitude : 0,
      sprint: ctx.rig.sprinting,
    });
    ctx.rig.getHeadPosition(_head);
    const follow = Math.min(1, dt * 10);
    ctx.rig.position.x += (monster.x - _head.x) * follow;
    ctx.rig.position.z += (monster.z - _head.z) * follow;
    ctx.rig.updateMatrixWorld(true);
    loco?.resync(ctx.rig);
  }

  /** Nicht mehr das Monster — zurück auf den eigenen Startplatz in der Zentrale. */
  private stopDriving(ctx: WorldContext): void {
    this.drivingMonster = false;
    this.monsterSight.intensity = 0;
    this.netPort?.release();
    if (this.kernelLoco) this.kernelLoco.active = false;
    const slot = spawnSlot(this.spawnRank);
    this.movePlayerTo(ctx, new THREE.Vector3(slot.x, 0, slot.z));
  }

  /**
   * **Den Anzug ablegen** — und auf Wunsch gleich an eine Seite der Zentrale
   * (`then`, etwa der Aufbau aus „Rollen & Aufbau"). Die Seite kommt erst,
   * wenn `tick` die Rolle umgebaut hat (`pendingConsole`): Der Umbau räumt
   * die Seite der Zentrale ab, und eine, die vorher aufging, wäre gleich
   * wieder weg.
   */
  private leaveSuit(then: MyRole | 'setup' | null): void {
    this.suited = false;
    this.pendingBotRound = false;
    this.pendingConsole = then;
    this.context?.menu.toggle(false);
  }

  /**
   * Vor den Anzugständer. Kein Menüeintrag mehr (der Rechner
   * _Spiel-Einstellungen_ sagt nur, wo der Anzug hängt) — der Rauchtest
   * im Browser (`tools/browser-smoke.mjs`) stellt sich damit davor.
   */
  goToSuit(): void {
    const ctx = this.context;
    if (!ctx) return;
    if (this.atDesk) this.standUp();
    const at = inFront(SUIT_SPOT);
    this.movePlayerTo(ctx, new THREE.Vector3(at.x, 0, at.z), 0);
    ctx.menu.toggle(false);
    this.say('Der Techniker-Anzug steht vor dir — A zieht ihn an.');
  }

  /**
   * **Meine Spielernummer, minus eins** — wie viele in dieser Welt schon
   * länger da sind (`commandRoom.playerRank`).
   */
  private rankNow(ctx: WorldContext): number {
    const others = [...ctx.net.peers.values()]
      .filter((peer) => peer.world === 'haunting')
      .map((peer) => ({ id: peer.id, seniority: ctx.net.seniorityOf(peer) }));
    // Beim Aufbau ist die Leitung noch in der alten Welt (`App.goTo` sagt die
    // neue erst nach `init` an): Dann bin ich der Neueste hier.
    const mine = ctx.net.world === 'haunting' ? ctx.net.localSeniority : 0;
    return playerRank({ id: ctx.net.localId, seniority: mine }, others);
  }

  /**
   * **Auf den Startplatz nachrücken**, solange die Spielernummer noch nicht
   * feststand (`spawnRank`): ein paar Sekunden nach dem Betreten und nur, wer
   * sich noch nicht bewegt hat. Wer schon losgegangen ist, bleibt, wo er ist.
   */
  private settleSpawn(ctx: WorldContext, dt: number): void {
    if (this.spawnSettle <= 0) return;
    this.spawnSettle -= dt;
    const rank = this.rankNow(ctx);
    if (rank === this.spawnRank) return;
    ctx.rig.getHeadPosition(_head);
    if (Math.hypot(_head.x - this.spawnedHere.x, _head.z - this.spawnedHere.z) > 0.4) {
      this.spawnSettle = 0;
      return;
    }
    this.spawnRank = rank;
    const slot = spawnSlot(rank);
    this.spawnedHere.set(slot.x, 0, slot.z);
    this.movePlayerTo(ctx, new THREE.Vector3(slot.x, 0, slot.z));
  }

  /**
   * **Die Spielelemente der Zentrale hinstellen** — Anzugständer und Rechner
   * _Verbindung_ (`world3d/commandRoom.COMMAND_SPOTS`), dazu das Schild über
   * dem Rechner und `A` an den vier Monitoren des Tischs. Die Zellen sperrt
   * schon der Plan (`map/geometry.fixtureBlocks`); hier kommen Körper, Bild
   * und was `A` daran tut.
   */
  private placeCommandRoom(): void {
    const host = this.commandHost();
    for (const spot of COMMAND_SPOTS)
      void placeElement(host, spot)
        .then((placed) => {
          if (!host.alive()) return;
          this.commandPlaced.push(placed);
          this.bindCommandSpot(placed);
        })
        .catch((error: unknown) => console.warn(`Zentrale: ${spot.element} fehlt`, error));

    // **Ein Bürostuhl vor jedem Rechner**, durch den man hindurchgeht — er
    // sperrt nichts (`commandRoom.chairSpot`). `A` an ihm tut dasselbe wie am
    // Rechner, und wer dort Platz nimmt, sitzt auf ihm (`openConsole`).
    const loose: ElementHost = {
      ...host,
      blockSolid: () => ({ cells: [], mesh: new THREE.Mesh() }),
      placeModel: () => Promise.resolve(null),
    };
    for (const desk of COMMAND_DESKS)
      void placeElement(loose, chairSpot(desk))
        .then((placed) => {
          if (!host.alive()) return;
          this.commandPlaced.push(placed);
          const anchor = this.openerAnchor(placed);
          this.chairAnchors.set(desk.station, anchor);
          this.bindDesk(anchor, desk.station);
        })
        .catch((error: unknown) => console.warn('Zentrale: Bürostuhl fehlt', error));

    // **Die Schilder** — an der Nordwand über Rechnern und Anzügen, über jedem
    // Schreibtisch frei hängend. Was darauf steht, rechnet `commandSignTexts`
    // und `refreshSigns` malt es neu, wenn es sich ändert: Wer den Anzug
    // trägt, steht mit Namen darauf, sonst „Bot".
    const wall = APRON.z * TILE + 0.25;
    const over = (spot: ElementSpot, tiles = 1): number => (spot.x + tiles / 2) * TILE;
    this.addSign('link', over(LINK_SPOT, TERMINAL_TILES), 1.85, wall, SHIP.cyan);
    this.addSign('settings', over(SETTINGS_SPOT, TERMINAL_TILES), 1.85, wall, SHIP.amber);
    this.addSign('technician', over(SUIT_SPOT), 2.25, wall, SHIP.cyan);
    this.addSign('monster', over(MONSTER_SPOT), 2.25, wall, MONSTER_COLOUR);
    // Die Schreibtische stehen an den Seitenwänden: ihr Schild hängt an der
    // Wand über dem Tisch und schaut in den Raum.
    for (const desk of COMMAND_DESKS) {
      const west = desk.face === 'E';
      const x = west ? desk.tileX * TILE + 0.05 : (desk.tileX + 1) * TILE - 0.05;
      this.addSign(
        `desk-${desk.station}`,
        x,
        1.95,
        desk.z,
        desk.colour,
        west ? Math.PI / 2 : -Math.PI / 2,
      );
    }
    this.refreshSigns(true);
  }

  /**
   * **Der Anker, an dem `A` hängt** — wie bei der Garderobe
   * (`elements/stationLayer.addOpener`): in der Mitte der Grundfläche, alle
   * Teile darunter, damit das ganze Möbel leuchtet, sobald man darauf schaut.
   * Sein +z zeigt, wohin das Möbel schaut.
   */
  private openerAnchor(placed: PlacedElement): THREE.Group {
    const [, depth] = placed.element.tiles;
    const anchor = new THREE.Group();
    anchor.name = `command:${placed.spot.id}`;
    anchor.position.set(0, 0, -depth / 2);
    placed.anchor.add(anchor);
    for (const part of placed.parts) if (part) anchor.attach(part);
    return anchor;
  }

  /** `A` an Rechner oder Stuhl eines Farbplatzes: dort Platz nehmen. */
  private bindDesk(anchor: THREE.Object3D, station: CommandDesk['station']): void {
    const name = SEAT_LABELS[station];
    this.bindCommand(
      anchor,
      {
        use: () => {
          this.openConsole(station);
          return true;
        },
        usePrompt: () => `Platz nehmen: ${name}`,
        interaction: { kind: 'press' },
      },
      { radius: 0.45, half: 1.2 },
    );
  }

  /** `A` an einem hingestellten Spielelement der Zentrale. */
  private bindCommandSpot(placed: PlacedElement): void {
    const anchor = this.openerAnchor(placed);
    const id = placed.spot.id;
    // Die ersten drei Teile sind der Ständer selbst (`SPACE_SUIT_STAND`).
    const hung = (): THREE.Object3D[] =>
      placed.parts.slice(3).filter((part): part is THREE.Object3D => !!part);
    const desk = COMMAND_DESKS.find((one) => deskSpot(one).id === id);
    if (desk) this.bindDesk(anchor, desk.station);
    else if (id === SUIT_SPOT.id) {
      this.suitParts = hung();
      this.bindCommand(
        anchor,
        {
          use: () => {
            this.toggleSuit();
            return true;
          },
          usePrompt: () => (this.suited ? 'Anzug ausziehen' : 'Techniker-Anzug anziehen'),
          interaction: { kind: 'press' },
        },
        { radius: 0.5, half: 1.8 },
      );
    } else if (id === MONSTER_SPOT.id) {
      this.monsterParts = hung();
      this.bindCommand(
        anchor,
        {
          use: () => {
            this.toggleMonsterSuit();
            return true;
          },
          usePrompt: () =>
            this.monsterSuited ? 'Monster-Anzug ausziehen' : 'Monster-Anzug anziehen',
          interaction: { kind: 'press' },
        },
        { radius: 0.5, half: 1.8 },
      );
    } else if (id === LINK_SPOT.id)
      this.bindCommand(
        anchor,
        {
          use: () => {
            this.openNetwork();
            return true;
          },
          usePrompt: () => 'Verbindung: Raum-Code, Name, Mitspieler',
          interaction: { kind: 'press' },
        },
        { radius: 0.8, half: 1.4 },
      );
    else if (id === SETTINGS_SPOT.id)
      this.bindCommand(
        anchor,
        {
          use: () => {
            this.openSettings();
            return true;
          },
          usePrompt: () => 'Spiel-Einstellungen: Runde, Plätze, Station, Gegner',
          interaction: { kind: 'press' },
        },
        { radius: 0.8, half: 1.4 },
      );
  }

  /**
   * **Ein Schild der Zentrale** — gemalt von `refreshSigns`, sobald es etwas
   * zu sagen hat. Nach Süden, also lesbar von jedem, der davorsteht.
   */
  private addSign(id: string, x: number, y: number, z: number, colour: number, yaw = 0): void {
    this.commandSigns.push({ id, x, y, z, yaw, colour, mesh: null, text: '' });
  }

  /** Was auf den Schildern steht — je Schild zwei Zeilen. */
  private commandSignTexts(): Map<string, string> {
    const ctx = this.context;
    const out = new Map<string, string>();
    out.set('link', `VERBINDUNG\n${ctx?.net.connected ? `Raum ${ctx.net.room}` : 'Offline'}`);
    out.set('settings', 'SPIEL-EINSTELLUNGEN\nRunde · Plätze · Station');
    out.set('technician', `TECHNIKER\n${ctx ? (this.suitName(ctx) ?? 'Bot') : 'Bot'}`);
    out.set('monster', `MONSTER\n${this.monsterName() ?? 'Bot'}`);
    const claims = this.currentClaims();
    const owners = seating(claims);
    for (const desk of COMMAND_DESKS) {
      const owner = owners.get(desk.station);
      const who = !owner
        ? 'frei'
        : owner === ctx?.net.localId
          ? (ctx?.net.name ?? 'du')
          : (ctx?.net.peers.get(owner)?.name ?? 'jemand');
      const role = roleName(seatAbilities(this.setup, desk.station)) || 'keine Fähigkeit';
      out.set(
        `desk-${desk.station}`,
        `${SEAT_LABELS[desk.station].toUpperCase()} · ${role}\n${who}`,
      );
    }
    return out;
  }

  /** Die Schilder neu malen, deren Text sich geändert hat — zweimal in der Sekunde. */
  private refreshSigns(now = false, dt = 0): void {
    this.signClock -= dt;
    if (!now && this.signClock > 0) return;
    this.signClock = 0.5;
    const texts = this.commandSignTexts();
    for (const sign of this.commandSigns) {
      const text = texts.get(sign.id) ?? '';
      if (text === sign.text && sign.mesh) continue;
      sign.text = text;
      if (sign.mesh) {
        sign.mesh.removeFromParent();
        sign.mesh.geometry.dispose();
        sign.mesh.material.map?.dispose();
        sign.mesh.material.dispose();
      }
      const mesh = label(text, 1.7, 0.46, sign.colour);
      mesh.position.set(sign.x, sign.y, sign.z);
      mesh.rotation.y = sign.yaw;
      mesh.name = `command-sign-${sign.id}`;
      this.vanRig.add(mesh);
      sign.mesh = mesh;
    }
  }

  /**
   * **Die Seite der Runde im Menü** — der Rechner _Spiel-Einstellungen_.
   * Gewünscht: _„ich denke es wäre leichter bei den einstellungen, wenn es
   * einen Computer gibt (mit einem Schild "Spiel-Einstellungen") und wenn man
   * mit dem PC interagiert, kommt ein Menü in den man alles einstellen
   * kann."_ Das ist die Seite dieser Welt im Menü (`welt`, `menu()`): Starts,
   * Plätze & Fähigkeiten, Einstellungen der Runde.
   */
  /** Ob ich gerade auf dem Sofa der Sitzecke sitze — dann machen die Bots Platz. */
  private couchTaken(): boolean {
    const seat = this.sittingOn;
    if (!seat) return false;
    const at = seat.getWorldPosition(_couch);
    return Math.hypot(at.x - COUCH_CENTRE.x, at.z - COUCH_CENTRE.z) < 1.2;
  }

  private openSettings(): void {
    const ctx = this.context;
    if (!ctx) return;
    if (this.atDesk) this.standUp();
    ctx.refreshWorldMenu();
    // **Ohne den Kopf des Menüs** — nur diese Seite, mit ✕ (`PageMenu.openSubmenu`).
    ctx.openMenu?.('welt', { bare: true });
  }

  private bindCommand(
    anchor: THREE.Object3D,
    usable: Usable,
    options?: { radius?: number; half?: number },
  ): void {
    this.addUsable(anchor, usable, options);
    this.commandUsables.push(anchor);
  }

  /**
   * **Das Menü _Verbindung_ aufmachen** — der Rechner an der Nordwand. Darin
   * stehen Raum-Code, Name, wer da ist, Mikrofon und Chat (`App.networkMenu`);
   * wer vom Rechner aus einen anderen Raum will, tippt den Code dort ein.
   */
  private openNetwork(): void {
    const ctx = this.context;
    if (!ctx) return;
    if (this.atDesk) this.standUp();
    ctx.openNetwork?.();
  }

  /** Was die Zentrale beim Hinstellen von der Welt braucht (`elements/elementView.ElementHost`). */
  private commandHost(): ElementHost {
    const round = this.commandRound;
    return {
      // Die Zellen sperrt der Plan schon (`fixtureBlocks`); hier kommt nur der
      // Körper in die Physik — für Werkzeuge und den Spieler, den sie trägt.
      blockSolid: (cx, cz, w, d, height) => {
        const mesh = this.slab(
          this.vanRig,
          this.fixtureMaterial,
          [w, height, d],
          [cx, height / 2, cz],
          false,
        );
        mesh.visible = false;
        this.commandSlabs.push(mesh);
        return { cells: [], mesh };
      },
      placeModel: (path, at, yaw) => this.placeModel(path, at, yaw),
      measure: async (path) => {
        const model = await kaykitModel(path);
        if (!model) return null;
        const box = new THREE.Box3().setFromObject(model);
        return box.isEmpty() ? null : box.getSize(new THREE.Vector3());
      },
      load: (path) => kaykitModel(path),
      add: (object) => this.vanRig.add(object),
      alive: () => round === this.commandRound,
    };
  }

  /** Die Zentrale wieder abräumen — beim Verlassen der Welt. */
  private dropCommandRoom(): void {
    this.commandRound++;
    for (const anchor of this.commandUsables) this.removeUsable(anchor);
    this.commandUsables.length = 0;
    for (const slab of this.commandSlabs) this.dropSlab(slab);
    this.commandSlabs.length = 0;
    this.commandPlaced.length = 0;
    this.suitParts = [];
    this.monsterParts = [];
    this.chairAnchors.clear();
    this.commandSigns.length = 0;
  }

  /** Der Anzug hängt am Ständer — oder nicht, weil ihn jemand trägt. */
  private showSuitStand(ctx: WorldContext): void {
    const worn = this.suited || this.roomOccupied(ctx);
    for (const part of this.suitParts) part.visible = !worn;
    const monster = this.monsterSuited || ownerOf(this.currentClaims(), 'monster') !== '';
    for (const part of this.monsterParts) part.visible = !monster;
  }

  /**
   * **Die Runde stoppen — zurück in den Test.** Der Gastgeber setzt den Stand
   * auf derselben Station zurück: Monster weg, Uhr auf null, Türen und Lampen
   * frei, Phase `briefing` — hell, ohne Treffer, jeder darf jede Rolle. Wer
   * nicht rechnet, schickt den Wunsch dem, der es tut (`net.stopMessage`) —
   * derselbe Weg wie beim Start.
   */
  private stopRound(ctx: WorldContext): void {
    if (!this.isHost) {
      if (this.roomOccupied(ctx)) {
        ctx.net.emit(HAUNT_CHANNEL, stopMessage());
        this.say(STOP_SENT);
      } else this.say(HOST_BUSY);
      return;
    }
    if (this.state.crew.simulation) this.experience?.leaveBotRound();
    this.removeMonster();
    this.rules.reset();
    this.locks = freshLocks();
    this.lampBook = freshLamps();
    this.automaticDoors.clear();
    this.state = freshState(this.spec.seed, this.state.crew.options);
    ctx.net.emit(HAUNT_CHANNEL, stateMessage(this.state, this.setup));
    this.announce(ROUND_STOPPED);
    this.ui?.refresh();
    ctx.refreshWorldMenu();
  }

  /**
   * **Etwas sagen, das man auch sieht.**
   *
   * `ctx.notify` schreibt in die Statuszeile des Handgelenk-Menüs, und das ist
   * ein Panel in der 3D-Szene. Über dem liegt aber die Einsatzzentrale
   * (`haunting.css`, `body.haunt-on`) — jede Begründung für einen abgewiesenen
   * Start landete also hinter dem eigenen Telefon. Deshalb geht sie an beide
   * Stellen: in die Brille und auf die Seite (`stationUi.say`).
   */
  private say(text: string): void {
    this.context?.notify(text);
    this.ui?.say(text);
  }

  /**
   * Die Tafel schreiben — und allen Anzeigen sagen, dass sie sich geändert hat.
   *
   * **Wer nicht der Gastgeber ist, schickt sie ihm** (`net.setupMessage`):
   * Angewendet wird die Tafel dort, wo die Runde gerechnet wird, und der
   * nächste Stand bringt sie zurück. `mine` sagt, ob der Tipp von diesem
   * Gerät kam — nur dann läuft die Schonfrist gegen den Stand des Gastgebers,
   * und nur dann geht etwas hinaus; was vom Netz kam, geht nicht wieder hin.
   */
  private applySetup(setup: RoundSetup, mine = true): void {
    this.setup = setup;
    saveSetup(setup);
    this.ui?.refresh();
    this.context?.refreshWorldMenu();
    if (!mine) return;
    this.setupTouchedAt = clock();
    const ctx = this.context;
    if (ctx && !this.isHost && this.hostId !== '') ctx.net.emit(HAUNT_CHANNEL, setupMessage(setup));
  }

  /** Die Tafel des Gastgebers übernehmen — nur, wenn sie etwas anderes sagt. */
  private adoptSetup(setup: RoundSetup): void {
    if (sameSetup(setup, this.setup)) return;
    this.applySetup(setup, false);
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
    // **Ziele sieht nur, wer das Archiv hält** (`rules/roundSetup.goalPrecision`):
    // ohne die Fähigkeit kein Kompass, kein Saum, keine Liste. Wer sie nicht
    // hat, hört, wo es liegt (`rules/archiveRadio.ts`), oder sucht.
    const out: MapGoal[] = [];
    if (goalPrecision(this.setup) === 'none') return out;
    for (const repair of repairsFor(this.spec)) {
      // **Beide Schreibweisen von `done`**: Das Schiff schreibt `engine`, die
      // 2D-Runde `t0` (`rules/archiveGoals.orderDone`). Vorher stand hier nur
      // die zweite, und im Schiff blieb ein erledigter Auftrag als Ziel stehen.
      if (orderDone(state, repair)) continue;
      const task = this.spec.tasks.find((t) => t.id === repair.itemId);
      const carried = state.crew.inventory.includes(repair.itemId);
      // **Ein abgelegtes Teil liegt da, wo es liegt** — und nicht mehr in
      // seiner Kiste. Der Kompass schickte den Techniker sonst zu einer Kiste,
      // die er selbst geleert hat. Dieselbe Sichtbarkeitsregel wie beim
      // Archivar (`DROPPED_SEEN`) gilt hier **nicht**: Wer es abgelegt hat,
      // weiß, wo — er braucht nicht zu warten, bis es jemand meldet.
      const lying = state.dropped?.find((one) => one.id === repair.itemId) ?? null;
      // Seit jeder Raum zwei bis drei Kisten hat, heißt die richtige nicht mehr
      // `cargo-<raum>`, sondern steht in der einen Liste (`rules/cargo.ts`).
      // Vorher fand `find` hier nichts, und der Kompass zeigte für ein noch
      // gar nicht geholtes Teil schon auf die Konsole.
      const cargo = task ? layout.find((p) => p.id === taskCargo(this.spec, task.id).id) : null;
      const console = layout.find((p) => p.id === `console-${repair.id}`);
      if (!carried && lying) {
        out.push({
          id: `dropped:${repair.itemId}`,
          at: { x: lying.x, z: lying.z },
          label: task?.label ?? repair.item,
          next: false,
          kind: 'crate',
          precision: 'exact',
        });
      } else if (!carried && cargo) {
        out.push({
          id: cargo.id,
          at: { x: cargo.approach.x, z: cargo.approach.z },
          label: task?.label ?? repair.item,
          next: false,
          kind: 'crate',
          precision: 'exact',
        });
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

  /** Der Stand der Station als Karte — reiner Lesezugriff (`map/extract.ts`). */
  mapSnapshot(): MapSnapshot {
    return this.worldSnapshot();
  }

  /**
   * **Die 3D-Welt als Karte**: der Stand, den der Gastgeber ansagt
   * (`map/worldSource.ts`) — für die Telefone der Zentrale (`views/`).
   */
  private worldSnapshot(): MapSnapshot {
    return extractMapSnapshot(
      worldMapSource({
        spec: () => this.spec,
        state: () => this.state,
        lamps: () =>
          [...this.lamps.entries()].map(([id, lamp]) => ({
            id,
            x: lamp.at.x,
            z: lamp.at.z,
            color: `#${lamp.color.toString(16).padStart(6, '0')}`,
            intensity: 1,
          })),
        doorOpen: (id) => this.automaticDoors.isOpen(id),
        noises: () => this.kernel?.round.noises() ?? [],
        // Wie lange die Sperre noch hält — der Balken über der Tür
        // (`rules/doorLocks.ts`, `map/mapView.ts`).
        doorHold: (id) => {
          if (this.state.shut.includes(id)) {
            const until = holdUntil(this.locks, id);
            if (until === null) return null;
            const total = isChosen(this.locks, id) ? HOLD_RANGE[1] : SLAM_HOLD;
            return { left: Math.max(0, until - this.state.time), total };
          }
          // Offen und trotzdem eine Uhr: Die Tür kühlt ab und darf so lange
          // nicht wieder gesperrt werden (`rules/doorLocks.ts`). Gelesen wird
          // sie aus dem Stand und nicht aus der eigenen Buchführung — die
          // führt nur der Gastgeber, die Karte hängt aber an jedem Gerät.
          const warm = this.state.cooling?.find((one) => one.id === id);
          const left = warm ? warm.until - this.state.time : 0;
          return left > 0 ? { left, total: LOCK_COOLDOWN, cooling: true } : null;
        },
        player: () => {
          // Der Techniker in der 2D-Welt eines anderen Geräts hat kein Rig:
          // Seine Stelle kommt aus dem Stand (`HauntState.technician`).
          const technician = this.state.technician;
          if (technician) return { ...technician, sprinting: this.state.crew.exertion > 0.3 };
          const ctx = this.context;
          if (!ctx || (ctx.role !== 'vr' && !this.suited)) {
            // **Der Techniker im Schiff eines anderen Geräts** — Brille oder
            // Bildschirm — steht in seiner Pose auf der Leitung (`Peer.pose`).
            // Ohne diese Zeile sah die Zentrale ihn nur, wenn er in der Brille
            // steckte, und einen Desktop-Techniker gar nicht.
            const suit = this.suitPeer();
            if (!suit?.pose) return null;
            const h = suit.pose.head;
            _quat.set(h[3]!, h[4]!, h[5]!, h[6]!);
            _euler.setFromQuaternion(_quat, 'YXZ');
            return {
              x: h[0]!,
              z: h[2]!,
              yaw: _euler.y,
              moving: false,
              sprinting: this.state.crew.exertion > 0.3,
            };
          }
          ctx.rig.getHeadPosition(_head);
          ctx.camera.getWorldDirection(_feet);
          return {
            x: _head.x,
            z: _head.z,
            yaw: Math.atan2(-_feet.x, -_feet.z),
            moving: ctx.rig.wishing,
            sprinting: ctx.rig.sprinting,
          };
        },
        // Was auf der Karte um das Monster gezeichnet wird — Kegel und Hörweite
        // **mit Gewichten**, wie in der 2D-Runde. Ohne sie zeigte der Späher
        // einer Brillenrunde ein anderes Vieh als der einer Telefonrunde.
        tuning: () => this.tuning.monster,
        monsterPace: () => ({
          moving: !this.ventRide.busy && (this.kernel?.round.decided?.pace ?? 'still') !== 'still',
          sprinting: this.kernel?.round.decided?.pace === 'hunt',
        }),
        torch: () => ({
          lit: !!this.stationTorch?.visible && this.experience?.flashlightActive === true,
          held: this.experience?.flashlightActive ? 'flashlight' : '',
        }),
        bot: () => this.experience?.botPose ?? null,
        monsterYaw: () => this.kernel?.round.monster.yaw ?? 0,
        round: () => this.rules.status(this.state),
        vents: () => {
          const open = this.ventRide.openFlap;
          return { flaps: this.vents.items(open ? [open.id] : []), links: this.vents.mapLinks() };
        },
        peers: () =>
          [...(this.context?.net.peers.values() ?? [])]
            .filter((peer) => this.wearsSuit(peer) && peer.pose)
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
    // ihn dafür selbst zum Techniker (`suited`).
    if (this.roomOccupied(ctx)) {
      this.pendingBotRound = false;
      this.say(ROOM_BUSY);
      return;
    }
    this.suited = true;
    this.pendingBotRound = true;
    ctx.menu.toggle(false);
  }

  /** Stop local authority without erasing the snapshot another host continues. */
  /** Den Kern loslassen, ohne den Stand anzurühren — die nächste Runde stellt ihn neu. */
  private releaseMonster(): void {
    this.kernel = null;
    delete this.state.insight;
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
      this.say(blocked);
      return false;
    }
    const start = startedRound('mission');
    const options = { ...this.state.crew.options, test: start.test, bright: start.bright };
    this.newRound(options);
    this.state.phase = start.phase;
    this.state.monsterOn = start.monsterOn;
    // Wo das Monster anfängt, sagt die Runde: am anderen Ende der Station
    // (`FlatRound`, `farthest`), im nächsten Bild.
    // **Die Station beginnt dunkel**, und sie bleibt es, wenn niemand schaltet.
    // Vorher gingen hier alle vierzehn Lampen an, und weil `applyLights` nur
    // die des eigenen Raums brennen ließ, sah es aus, als ginge beim Betreten
    // von selbst das Licht an — ein Automatismus, den niemand gebaut hatte und
    // der der Taschenlampe die Aufgabe wegnahm. Licht macht jetzt die Tafel,
    // höchstens zwei Räume gleichzeitig, und nicht für immer (`rules/lamps.ts`).
    this.state.lit = [];
    this.announce(
      'Echte Runde läuft. Die Station ist dunkel: Taschenlampe an, Licht macht die Schalttafel. Archiv: Fracht, Ziele und Codes. Nach drei Reparaturen zurück zur Zentrale.',
    );
    return true;
  }

  /** @returns ob der Test wirklich losgegangen ist. */
  private testMission(): boolean {
    const blocked = startBlocker(this.startState(), 'test') ?? (this.isHost ? null : HOST_BUSY);
    if (blocked) {
      this.say(blocked);
      return false;
    }
    const start = startedRound('test');
    this.newRound({ ...this.state.crew.options, test: start.test, bright: start.bright });
    this.state.phase = start.phase;
    // **Mit Monster, aber harmlos** (`FlatRound.tick`, `harmless`): Es läuft
    // seine Runden und nimmt die Schächte, jagt und trifft aber niemanden.
    this.state.monsterOn = true;
    this.state.crew.opened = ['test-supply'];
    this.announce(
      'ÜBUNGSRUNDE · Kein Monster, kein Schaden. Testschrank rechts ist bestückt; Labor geöffnet. Übungslicht lässt sich abschalten.',
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
    // Das alte Haus behält seine Shader, bis das neue übersetzt ist.
    if (this.context) this.programs.hold(this.context.scene);
    this.removeMonster();
    this.rules.reset();
    this.locks = freshLocks();
    this.lampBook = freshLamps();
    this.automaticDoors.clear();
    if (this.context) this.resetGear(this.context);
    this.spec = generateHouse(STATION_SEED, options.rooms);
    this.state = freshState(this.spec.seed, options);
    this.routineDice = new Rng(this.spec.seed >>> 0);
    // Frische Bücher, frischer Kern (`ensureKernel`).
    this.pendingBooks = null;
    this.kernel = null;
    const planKey = `${this.spec.seed}|${this.spec.rooms.length}`;
    if (planKey !== this.planFor) {
      this.planFor = planKey;
      this.grid?.replaceWith(this.stationPlan(new Set()));
    }
    this.builtDoors = '?';
    this.blob?.dispose();
    this.blob = null;
    this.buildHouse();
    this.placeStationWalls();
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
  // **Unter einem Modell aus dem Regal** (`userData.sharedAssets`) gehören
  // Geometrie und Textur der Vorlage im Speicher und allen anderen Kopien;
  // dort gehen nur die eigenen Materialien der Kopie weg.
  const visit = (one: THREE.Object3D, shared: boolean): void => {
    const own = shared || !!one.userData.sharedAssets;
    const mesh = one as Partial<THREE.Mesh>;
    if (!own) mesh.geometry?.dispose();
    const material = mesh.material;
    for (const part of Array.isArray(material) ? material : material ? [material] : []) {
      if (!own) (part as THREE.MeshBasicMaterial).map?.dispose();
      part.dispose();
    }
    for (const child of one.children) visit(child, own);
  };
  for (const child of [...group.children]) {
    visit(child, false);
    group.remove(child);
  }
}

/** Eine Uhr, die auch dann weiterläuft, wenn dieser Tab keine Bilder bekommt. */
function clock(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

/** Wie hoch über dem Boden ein Blutfleck liegt, in Metern — knapp darüber, sonst flimmert er mit ihm. */
const BLOOD_Y = 0.012;
/** Die Farbe getrockneten Bluts auf Stationsblech. */
const BLOOD_COLOR = 0x6b0d13;
/** Wie deckend ein ganz frischer Fleck ist. */
const BLOOD_OPACITY = 0.8;
/** Wie deckend der Ghost höchstens steht — eine Erinnerung ist kein Körper. */
const GHOST_SOLID = 0.4;

/** Ein Gedächtnis ohne Inhalt — für eine Runde, in der noch kein Monster steht. */
function emptyBook(): MonsterBook {
  return { sightings: [], searched: [] };
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
    fuse: false,
    taken: [],
    done: [],
    destroyed: [],
    technician: null,
    ride: 'out',
    ghosts: freshGhosts(),
    blood: [],
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
function doorEdge(door: { x: number; z: number; dir: Dir; span?: number }): {
  x: number;
  z: number;
  alongX: boolean;
} {
  // Die Mitte der ganzen Tür — bei zwei Kacheln die Fuge (`house.doorMiddle`).
  return { ...doorMiddle(door), alongX: edgeCentre(door.x, door.z, door.dir).alongX };
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

/** Die Bodenplatte der Station (`floorPlate`): die erste im Prototyp-Paket. */
export const STATION_FLOOR = 'prototype-bits/Floor.glb';

/** Was auf dem Ausrüstungstisch liegen kann, von West nach Ost nach der Lampe (`stepGear`). */
const TABLE_GEAR = ['stun-grenade', 'xray', 'radar'] as const;
/** Wie die Werkzeuge auf dem Tisch liegen: wie gebaut, die Spitze nach Norden. */
const GEAR_TURN = new THREE.Quaternion();

/** So lange läuft eine Runde, bevor ihre Shader vorab übersetzt werden (`warmShaders`), in Sekunden. */
const WARM_AFTER = 1;
/** Wie viele Punktleuchten die Deckenlampen der Station unter sich teilen. */
const LAMP_POOL = 2;

/** Der schmale Durchgang (eine Kachel) und der breite (zwei) aus dem Regal. */
export const STATION_DOORWAY = 'prototype-bits/Wall_Doorway.glb';
export const STATION_DOORWAY_WIDE = 'prototype-bits/Wall_Doorway_Wide.glb';
/** Das Fenster der Station: eine Kachel, grauer Rahmen, Glas zum Durchsehen. */
export const STATION_WINDOW = 'prototype-bits/Wall_Window_Closed_Narrow.glb';

/** Ein Schlüssel für eine Kachelkante aus ihrer Mitte in Metern und ihrer Richtung. */
function edgeKeyAt(x: number, z: number, alongX: boolean): string {
  return alongX
    ? `x:${Math.floor(x / TILE)}:${Math.round(z / TILE)}`
    : `z:${Math.round(x / TILE)}:${Math.floor(z / TILE)}`;
}

/** Die Mitte einer Kante aus ihrem Schlüssel (`edgeKeyAt`). */
function edgeOfKey(key: string): { x: number; z: number; alongX: boolean } {
  const [axis, a, b] = key.split(':');
  const alongX = axis === 'x';
  return alongX
    ? { x: (Number(a) + 0.5) * TILE, z: Number(b) * TILE, alongX }
    : { x: Number(a) * TILE, z: (Number(b) + 0.5) * TILE, alongX };
}

const _corner = new THREE.Vector4();

/**
 * **Das Rechteck, das eine Türöffnung im Bild einnimmt** (`portalRooms`) —
 * die acht Ecken ihres Kastens durch die Projektion, und das Rechteck um sie.
 * Liegt eine Ecke hinter der Kamera, steht man in der Tür: Dann ist es das
 * ganze Bild, denn ein Rechteck aus Ecken hinter dem Kopf wäre gespiegelt.
 */
function doorwayRect(box: THREE.Box3, viewProjection: THREE.Matrix4): ViewRect {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    _corner
      .set(
        i & 1 ? box.max.x : box.min.x,
        i & 2 ? box.max.y : box.min.y,
        i & 4 ? box.max.z : box.min.z,
        1,
      )
      .applyMatrix4(viewProjection);
    if (_corner.w <= 0.05) return FULL_VIEW;
    const x = _corner.x / _corner.w;
    const y = _corner.y / _corner.w;
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}
