import * as THREE from 'three';
import type { World, WorldContext, WorldPreview } from '../../core/types';
import { stripOutlines } from '../../core/outlineShell';
import type { MenuEntry, MenuIcon } from '../../ui/menu';
import type { ControllerState, Handedness } from '../../core/XRInput';
import { Portal, PORTAL_HALF_HEIGHT, PORTAL_HALF_WIDTH } from './Portal';
import {
  PortalSync,
  type HandBusy,
  type Pose7,
  type PortalKey,
  type PortalState,
} from './PortalSync';
import { PortalRenderer } from './PortalRenderer';
import { nextPortalDepth, portalDepth, savePortalDepth } from './portalDepth';
import {
  GAME_MODE_HINTS,
  GAME_MODE_LABELS,
  gameMode,
  movesFurniture,
  movesStructure,
  nextGameMode,
  onGameMode,
  refillsCatalogue,
  setGameMode,
} from '../../core/gameMode';
import { isFloorPiece, modelStance, standsFast, type ModelStance } from './modelStance';
import {
  changeKey,
  clearWorldChanges,
  formatChanges,
  onWorldChanges,
  parseChanges,
  forgetChange,
  recordModel,
  setTrackingChanges,
  trackingChanges,
  worldChanges,
  type FurnitureChange,
  type ModelChange,
} from '../../core/worldChanges';
import { COPY_FALLBACK, copyText } from '../../ui/clipboard';
import { PortalGhosts } from './PortalGhosts';
import { crossPoint } from './portalCrossing';
import { funnelGroups } from './portalFunnel';
import { ToolBelt, type BeltSlot } from './ToolBelt';
import {
  DEFAULT_BELT,
  beltLabel,
  beltOffset,
  clampBelt,
  saveBelt,
  type BeltOffset,
} from './beltSettings';
import {
  AMMO_KINDS,
  AMMO_LABELS,
  BrainTool,
  COLOR_BLUE,
  COLOR_RED,
  DroneTool,
  PistolTool,
  SPIN_RATE,
  StopwatchTool,
  THROW_SPEED,
  PortalGunTool,
  SIGHTS,
  TOOL_IDS,
  Tool,
  WEAPON_FIELDS,
  aimQuaternion,
  applyGearConfig,
  applyStoredPose,
  clearGearConfig,
  clearPose,
  clearPoses,
  createTool,
  gearCode,
  parseGearCode,
  storedPoseCount,
  storedPoseHand,
  type BulletOptions,
  type PaintSurface,
  type SightKind,
  type ToolHost,
  type SurfaceHit,
  type WeaponSettings,
  type WeldRequest,
} from './tools';
import { KeyPanel, type KeyPanelRequest } from '../../ui/KeyPanel';
import { isTyping } from '../../core/textEntry';
import {
  GRAB_POSE_ID,
  HAND_FIELDS,
  HOLD_HAND_POSE,
  defaultIdlePose,
  clonePose,
  formatHandPose,
  handPoseField,
  handPoseFromArray,
  mirrorHandPose,
  setHandPoseField,
  type HandPose,
} from '../../core/handPose';
import {
  clearHandPoses,
  handPoseCount,
  handPoseSnapshot,
  saveHoldHandPose,
  saveIdleHandPose,
} from '../../core/handPoseStore';
import {
  BAG_ITEMS,
  createCompanionCube,
  createPropShape,
  modelKind,
  modelPathOf,
  modelPropShape,
  propGripOf,
  propLabel,
  type BagKind,
  type ModelKind,
  type PropPhysics,
  DOMINO_SIZE,
  PROP_LABELS,
  type PropKind,
} from './props';
import { SAMPLE_ITEMS, SAMPLE_SURFACES } from './sampleRoom';
import {
  eighthYaw,
  gridPose,
  isDiagonal,
  placesOnGrid,
  quarterYaw,
  tilesCovered,
  turnedHalf,
  type DiagonalWall,
  type GridEdge,
  type GridTile,
  type PlacePose,
  wallCells,
  wallEdges,
  yawOf,
} from './gridSnap';

const _turnScratch = new THREE.Quaternion();
const _footSpot = new THREE.Vector3();

/** Wie eine Wand ungekürzt war (`PortalWorld.wallBase`). */
interface WallBase {
  half: THREE.Vector3;
  scale: THREE.Vector3;
  long: number;
}
import { swapOut } from './shelfSwap';
import { PlaceGrid } from './placeGrid';
import {
  AREA_MAX,
  AreaSelect,
  areaCount,
  areaPlan,
  areaRect,
  areaSize,
  needsConfirm,
  tileAt,
  type AreaRect,
  type AreaTile,
} from './areaPaint';
import { AreaPad, type AreaEvent } from './areaPad';
import { BuildBar, HIDDEN_BUILD_BAR, type BuildEvent, type BuildTool } from './buildBar';
import {
  BuildHistory,
  type BuildPose,
  type BuildStep,
  describeStep,
  nearestAt,
} from './buildHistory';
import {
  type Box as DecorBox,
  boxAround,
  decorArea,
  mountBlocked,
  mountPose,
  mountSize,
  mountsOnWall,
  restOn,
  slantBlocked,
  slantMountPose,
  surfaceSpot,
  wallFaces,
  type SlantWall,
} from './decorPlace';
import {
  FLOOR_STYLES,
  WALL_STYLES,
  blockedEdges,
  floodRoom,
  isWallPanel,
  nearestFace,
  nextStyle,
  onFace,
  panelSpots,
  wallSpots,
  type RoomTile,
} from './surfaceDecor';
import { PlaceGhost } from './placeGhost';
import {
  KAYKIT_ACCENT,
  SHELF_COLS,
  humanLabel,
  kaykitFiles,
  kaykitMenu,
  kaykitPathOf,
  kaykitSearchEntries,
  kaykitSheets,
  type KaykitFileRef,
  type KaykitIndex,
} from '../../core/kaykitIndex';
import { kaykitClips, kaykitModel, kaykitModelNow, loadKaykitIndex } from '../../core/kaykitModel';
import { kaykitSkins } from '../../core/kaykitHeight';
import { BULLET_MODEL, BULLET_VIEW_GROWTH, bulletAim, bulletScale } from './bulletFit';
import { snapToGrip } from './propGrip';
import { CORK_LENGTH, CORK_NAME, CORK_RADIUS, CORK_SPEED, Foam, ShakeMeter } from './champagne';
import {
  DEFAULT_NEAR_HEIGHT,
  DEFAULT_NEAR_RADIUS,
  DEFAULT_NEAR_SCALE,
  REMOTE_RANGE,
  flightArrived,
  flightDuration,
  flightPosition,
  atHandGrip,
  handsTooClose,
  nearZoneDistance,
  pickAimTarget,
  pivotGrab,
  stretchGrab,
  rayReach,
  reachDepth,
  type AimTarget,
  type GrabPose,
  type GrabStage,
  type NearZone,
  type Vec3,
} from './grabReach';
import { HandSpeed, throwDirection, tumbleAxis } from './throwMotion';
import {
  DEFAULT_GRAB,
  GRAB_FIELDS,
  formatGrabField,
  grabSettings,
  motionLabel,
  nextGrabMotion,
  nextGrabStep,
  onGrabChange,
  saveGrabSettings,
  type GrabField,
  type GrabSettings,
} from '../../core/grabSettings';
import {
  handLook,
  handLookLabel,
  nextHandLook,
  boneColors,
  saveBoneColors,
  saveHandLook,
  saveTrackedGlove,
  trackedGlove,
} from '../../core/handLook';
import { GhostHand } from '../../core/HandVisuals';
import { TextPlane } from '../../ui/TextPlane';
import { playPick, playPop, playTone } from '../../core/Audio';
import {
  GROUND_TOP,
  createGround,
  createLighting,
  disposeShapes,
  disposeTree,
} from '../shared/environment';
import { NpcDirector, type NpcControl } from '../npc/NpcDirector';
import type { Npc } from '../npc/Npc';
import { Puppeteer, type PuppetStage, type StagePose, type StageProp } from '../npc/Puppeteer';
import { formatDuration, isPlayable } from '../npc/npcRecording';
import {
  deleteCharacter,
  listCharacters,
  onCharactersChange,
  saveCharacter,
  type SavedCharacter,
} from '../npc/characterStore';
import { LAYER_SELF_ONLY } from '../../core/PlayerAvatar';
import { yawOfForward } from '../../core/walkFrame';
import { SignRoom, type SignControl } from '../signs/SignRoom';
import {
  FONT_STEPS,
  HEIGHT_STEPS,
  SCROLL_STEPS,
  SIGN_BACKGROUNDS,
  SIGN_COLORS,
  WIDTH_STEPS,
  alignLabel,
  fontLabel,
  nextPalette,
  nextStep as nextSignStep,
  paletteLabel,
  scrollLabel,
  type SignSettings,
} from '../signs/signSettings';
import { saveSignTemplate, signTemplate } from '../signs/signStore';
import {
  KEYBOARD_MODE_LABELS,
  KEYBOARD_MODE_SUBS,
  keyboardMode,
  nextKeyboardMode,
  saveKeyboardMode,
} from '../../core/systemKeyboard';
import { bakeNav, type BakeReport } from '../nav/navBake';
import { applyNavLayers, boxesFrom, levelCensus, navDebugView, navPathView } from '../nav/navScene';
import {
  NAV_LAYERS,
  anyLayer,
  defaultLayers,
  layerSpec,
  layerSummary,
  nextAll,
  noLayers,
  type NavLayer,
  type NavLayerState,
} from '../nav/navLayers';
import {
  NAV_SWITCHES,
  allOn,
  allSwitchesOn,
  switchSummary,
  type NavSwitch,
  type NavSwitchState,
} from '../nav/navSwitches';
import type { LivePreview, PreviewButton } from '../shared/livePreview';
import { PreviewWalk } from '../shared/previewWalk';
import type { NavGraph } from '../nav/navGraph';
import { TILE } from '../nav/navTile';
import { NPC_SKINS, npcSkin, shelfKind, type NpcKind } from '../npc/npcKinds';
import { BODY_DAMAGE } from '../npc/npcHit';
import { NPC_BAR_MODES, type BarMode } from '../npc/NpcBody';
import { newSwing, swingHit, swingStep, type SwingState } from './tools/meleeSwing';
import { BRAINS, brainLabel } from '../npc/npcBrains';
import { npcSettings, saveNpcSettings } from './tools/gearStore';
import { withBrain, withKind } from '../npc/npcSettings';
import { LANDING_CLEARANCE, needsRescue, rescueHeight } from '../shared/fallRescue';
import { FallTrail, fallReportText } from '../shared/fallTrail';
import { FallReport } from '../../ui/fallReport';
import {
  EARTH_GRAVITY,
  PHYSICS_FIELDS,
  clearWorldPhysics,
  effectiveGravity,
  onWorldPhysicsChange,
  gravityLabel,
  nextPhysicsStep,
  physicsFieldLabel,
  saveWorldPhysics,
  worldPhysics,
  DEFAULT_WORLD_PHYSICS,
  type PhysicsField,
  type WorldPhysics,
} from '../../core/worldPhysics';
import {
  ALL_GROUPS,
  GROUP_HAND,
  GROUP_NPC,
  GROUP_PLAYER,
  GROUP_PROP,
  GROUP_WORLD,
  PhysicsWorld,
  portalSurfaceGroup,
  type PhysicsBody,
} from '../../physics/PhysicsWorld';
import { PhysicsLocomotion, type PlayerPlane } from '../../physics/PhysicsLocomotion';
import type { CellGrid } from '../nav/cellGrid';
import { HitboxView } from '../../physics/HitboxView';
import {
  MOVE_PAD_LABELS,
  MOVE_PAD_SUBS,
  graphics,
  nextMovePad,
  saveGraphics,
} from '../../core/graphicsSettings';
import { silentPhysics } from '../../physics/silentPhysics';
import { FreeLocomotion } from '../../core/Locomotion';
import { GRAB_GLOW, GRAB_GLOW_LOCKED, GRAB_GLOW_PICKED } from '../../core/colors';
import { clearSupermanSettings, saveSupermanSettings, supermanSettings } from './tools/gearStore';
import {
  nextSupermanSource,
  nextSupermanStep,
  supermanFieldLabel,
  SUPERMAN_AXES,
  SUPERMAN_FIELDS,
  SUPERMAN_SOURCE_LABELS,
  type SupermanField,
  type SupermanSettings,
} from './tools/supermanSettings';
import {
  SHOT_MARGIN,
  USE_CHEST,
  USE_RADIUS,
  USE_REACH,
  aimForward,
  markUsable,
  pickUsable,
  shotHitsUsable,
  usableShows,
  type UseCandidate,
  type UsePick,
  type Usable,
} from '../../core/usable';
import {
  CRANE_TOUCH,
  buildCraneMark,
  craneCarryY,
  craneTurn,
  disposeCrane,
} from '../../core/crane';
import {
  BOMB_GHOST_COLOR,
  BOMB_GHOST_OPACITY,
  BOMB_MODEL,
  bombAllowed,
} from '../../core/craneBomb';
import {
  interactionGrab,
  interactionKind,
  inputLabel,
  interactionView,
  resolveInteraction,
  vrInputs,
  type InteractionView,
  type ResolvedInteraction,
} from '../../core/interaction';
import { grabReaches } from '../../core/grabHandles';
import { inputConfig } from '../../core/inputStore';
import {
  HAND_USE_RANGE,
  beginGripPress,
  gripPressDrops,
  gripPressTook,
  handUseFires,
  handUseMemory,
  leadHandUse,
  pickHandUse,
  stepGripPress,
  type GripPress,
  type HandUseFind,
} from '../../core/handUse';
import { ScreenHand } from './screenHand';
import {
  EYE_AIM_MAX,
  EYE_SCALE,
  EYE_SIGHT_TIME,
  eyeSightRelief,
  eyeSightScale,
  type EyeHold,
  type EyeSight,
} from './eyeHand';
import { GRIP_TO_RAY } from './tools/gripFit';
import type { CarrySpan, ScreenCarryView } from '../../core/screenCarry';
import { Highlight } from '../../core/highlight';
import { ModelBatch, type BatchItem } from '../shared/modelBatch';
import type { ToolChoice, ToolOption } from '../../core/types';
import { overBudget, type LooseEntry } from './tools/looseBudget';
import { findMaterial, isTransparent } from './tools/materials';
import { PullMeter, pullTension, pullTriggered } from './pullGesture';

const ROOM = { half: 8, height: 4.6, thickness: 0.4 };
/** Oberkante der Fläche bis zum Horizont — knapp unter den gebauten Böden. */
/** Von so weit oben sucht die Rettung nach dem höchsten Punkt. */
const RESCUE_PROBE = 400;
/** Wie der Inspektor eine Collider-Form nennt. */
const SHAPE_LABELS: Record<string, string> = {
  box: 'Kasten',
  ball: 'Kugel',
  cylinder: 'Zylinder',
  cone: 'Kegel',
  hull: 'Hülle',
  arch: 'Bogen',
};
const SPAWN = new THREE.Vector3(0, 0, 5.5);
/** Zwischenlagen fürs Benutzen — Ort und Blickrichtung der Figur (`core/usable.ts`). */
const _useAt = new THREE.Vector3();
const _useForward = new THREE.Vector3();
/** Wohin Figur und Kopf zeigen — `usable.aimForward` wählt aus beidem. */
const _useRigAhead = new THREE.Vector3();
const _useHeadAhead = new THREE.Vector3();
const _useCentre = new THREE.Vector3();
const _useFlight = new THREE.Vector3();
const _useBox = new THREE.Box3();
const _useSize = new THREE.Vector3();
/** So viel Licht hat auch die dunkelste Welt, wenn man sie nur ansieht. */
const PREVIEW_LIGHT = 0.45;

/**
 * **Wie weit die Figur der laufenden Vorschau langt**, in Metern.
 *
 * Doppelt so weit wie eine Spielerhand von selbst zugreift
 * (`DEFAULT_NEAR_RADIUS`, 1,40 m), und die Verdopplung ist keine Willkür:
 * In der Brille streckt man den Arm aus und weiß dabei genau, was man
 * erwischt; von oben zeigt man mit einem Finger auf ein Telefon, und ein Kreis
 * von anderthalb Metern ist auf einer Karte von hundert ein Punkt, den niemand
 * trifft.
 */
const PREVIEW_REACH = DEFAULT_NEAR_RADIUS * 2;
/**
 * Die Farbe des **eigenen** Wegs in der Ebene „Wege".
 *
 * Absichtlich nicht das Grün der NPC-Wege: Auf einer Karte von oben laufen
 * fünf Linien durcheinander, und die Frage ist immer „welche davon ist meine".
 * Dasselbe Blau wie die Attrappe selbst.
 */
const GHOST_PATH_COLOR = 0x39d0ff;
const UP = new THREE.Vector3(0, 1, 0);
/** Wie viele Kacheln die Vorschau einer Fläche höchstens zeigt (`PlaceGrid.show`). */
const AREA_PREVIEW = 1600;
/** Wie hoch über dem Boden eine Kopie der Fläche entsteht, in Metern — sie fällt das Stück. */
const AREA_LIFT = 0.01;
/** Wohin man sieht — für _Wand_ in der Brille (`surfaceHere`). */
const _surfaceLook = new THREE.Vector3();
/**
 * Die Maße einer Wandfliese, wie sie an der Wand hängt (`restaurant-bits/
 * wall_tiles_*`: ein Meter breit, 70 cm hoch, 8 cm tief) — fest, damit die
 * Seite in einem Zug gefliest wird, ohne erst ein Stück zu messen.
 */
const PANEL_SIZE = { halfWidth: 0.5, halfDepth: 0.04, height: 0.7 };
/** Wie hoch eine ganze Wand aus dem Regal ist (`grid/shelfWalls.SHELF_WALL_Y` × 2). */
const SURFACE_WALL_HEIGHT = 2.8;
/** Wie weit der Strahl einer Fläche höchstens reicht, in Metern. */
const AREA_REACH = 120;
const _areaNdc = new THREE.Vector2();
const _areaPlane = new THREE.Plane();
const _areaHit = new THREE.Vector3();
const FUNNEL_DEPTH = 1.1;
/** The portal surface stays at least this far in front of the eye. */
const NEAR_PAD = 0.12;
/**
 * Wie schnell die Hand **ohne Einstellung** zum Körper zucken muss, damit ein
 * gefasster Gegenstand geflogen kommt — in Metern je Sekunde.
 *
 * Steht hier nur als Rückfall für den Fall, dass gar keine Einstellung gelesen
 * werden konnte; die Zahl, die gilt, ist `grabConfig.pull` (`core/grabSettings.ts`,
 * in Zentimetern je Sekunde) und im Menü *Einstellungen → Greifen* zu ändern.
 *
 * Vorher stand hier ein **Winkel**: 30° Handgelenk nach oben. Eine Geste, die
 * man sich merken muss — und die beim Hantieren von selbst losging, weil jede
 * gehobene Hand dabei kippt. Ein Zucken zum Körper ist die Bewegung, mit der
 * ein Mensch etwas an sich zieht (`pullGesture.ts`).
 */
const REMOTE_PULL_SPEED = DEFAULT_GRAB.pull / 100;
/** Segments of the rope between hand and locked prop. */
const ROPE_POINTS = 18;
const ROPE_IDLE = 0x9fe3ff;
/**
 * Was leuchtet, wenn eine Hand zugreifen könnte — dieselbe Familie wie die
 * Greiffarbe der Griffe, damit „das kann man nehmen" und „das kann man
 * *jetzt* nehmen" wie zwei Stufen desselben Hinweises aussehen und nicht wie
 * zwei verschiedene Nachrichten. Die Zahlen stehen in `core/colors.ts`.
 */
const HIGHLIGHT_REACH = GRAB_GLOW;
const HIGHLIGHT_LOCKED = GRAB_GLOW_LOCKED;
const HIGHLIGHT_PICKED = GRAB_GLOW_PICKED;
const _ropeTaut = new THREE.Color(0xffb35c);
const _zeroVelocity = new THREE.Vector3();
const _spin = new THREE.Vector3();
/** Das Tempo, mit dem ein losgelassenes Werkzeug fliegt, und seine Drehachse. */
const _throw = { x: 0, y: 0, z: 0 };
/** Und der Drall, den die Hand ihm dabei mitgibt, in Radiant je Sekunde. */
const _handSpin = { x: 0, y: 0, z: 0 };
/**
 * Wie schnell ein losgelassenes Werkzeug höchstens kreiselt, in Radiant je
 * Sekunde — gut drei Umdrehungen.
 *
 * Dieselbe Vorsicht wie beim Tempo, das auf 12 m/s gedeckelt wird: eine
 * Handverfolgung, die für ein Bild aussetzt und wiederkommt, meldet eine
 * Drehung von einer halben Umdrehung in 14 Millisekunden — das sind zweihundert
 * Radiant je Sekunde, und ein Hammer, der damit losgeht, ist nicht geworfen,
 * sondern verschossen.
 */
const MAX_TOOL_SPIN = 20;
/** Wohin die Hand beim Loslassen zeigte, und wohin von dort aus geschaut wird. */
const _throwAim = { x: 0, y: 0, z: 0 };
/** Und was aus beidem und der Bewegung als Wurfrichtung herauskommt. */
const _throwDir = { x: 0, y: 0, z: 0 };
const _gaze = new THREE.Vector3();
const _gazePoint = new THREE.Vector3();
/**
 * Wie weit vor dem Kopf der Blick landet, wenn er auf nichts trifft — in
 * Metern.
 *
 * Eine Blickrichtung ist ein Strahl vom *Kopf* aus, ein Wurf geht von der
 * *Hand* los, und die liegt einen halben Meter daneben. Parallel zum Blick
 * geworfen ginge der Wurf deshalb um genau diesen halben Meter am Ziel vorbei
 * — auf fünf Meter sind das gut fünf Grad. Also wird nicht die Richtung des
 * Blicks genommen, sondern sein **Ziel**: der Punkt, auf dem er liegt, und von
 * der Klinge aus dorthin. Trifft er nichts, ist das dieser Abstand — weit
 * genug, dass die Wurfrichtung dann fast die Blickrichtung ist.
 */
const GAZE_FOCUS = 12;
/** So weit schaut die Zielhilfe höchstens, und so nah frühestens. */
const GAZE_REACH = 60;
const GAZE_NEAR = 1;

const _handSpeed = new THREE.Vector3();
const _handAim = new THREE.Vector3();
const _handTurn = new THREE.Quaternion();
const _aimTurn = new THREE.Quaternion();
const _toolBox = new THREE.Box3();
const _toolLocal = new THREE.Box3();
const _toolMatrix = new THREE.Matrix4();
const _toolInverse = new THREE.Matrix4();
/** How far ahead of a gliding tool the sweep looks, on top of its step. */
const STICK_MARGIN = 0.06;
/** Bullets are cleaned up again after this long. */
const BULLET_LIFETIME = 4;
/**
 * **Wie schnell ein Drall an einer Patrone stirbt.**
 *
 * Eine Kugel ist rund und darf sich drehen, wie sie will — man sieht es nicht.
 * Eine Patrone hat eine Spitze, und eine Patrone, die seitlich durch die Luft
 * schlittert, sieht falscher aus als das Kügelchen, das sie ersetzt. Der
 * Körper bleibt trotzdem eine Kugel (die Rechnung wird nicht getauscht, nur
 * das Bild), und eine Kugel nimmt bei jedem Streifschuss Drall auf. Acht heißt:
 * Nach einem Zehntel Sekunde ist davon die Hälfte weg, nach einer halben so gut
 * wie nichts.
 */
const BULLET_SPIN_DAMPING = 8;
/**
 * **Wie stark eine Patrone von sich aus leuchtet**, als Anteil der Farbe, die
 * das Kügelchen vorher hatte.
 *
 * Das Kügelchen war ein `MeshBasicMaterial` mit `toneMapped: false`: ein Fleck
 * in genau seiner Farbe, egal wie dunkel der Raum ist. Das Modell ist
 * beleuchtete Geometrie und damit im Dunkeln erst einmal dunkel. Beides ganz
 * ist keine Lösung — ein voll glühendes Geschoss wäre eine Leuchtspur, und
 * genau die soll unterscheidbar bleiben. Also glüht die **Leuchtspur** in
 * ihrem Orange voll und die gewöhnliche Patrone in ihrem Gelb gedämpft: hell
 * genug, um sie im Schatten noch zu finden, matt genug, um neben einer
 * Leuchtspur die langweiligere zu sein.
 */
const BULLET_GLOW = 0.35;
/** How many points a tracer's streak is made of. */
const TRACER_POINTS = 12;

/** Which little picture the aiming-aid grid draws for each entry. */
const SIGHT_ICONS: Record<SightKind, MenuIcon> = {
  none: 'close',
  reddot: 'reddot',
  irons: 'irons',
  trace: 'trace',
  xray: 'xray',
  scope: 'scope',
};

/** Two decimals is as fine as any of these settings needs to read. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const _direction = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _placeUp = new THREE.Vector3();
const _target = new THREE.Vector3();
const _velocity = new THREE.Vector3();
/** Die Spitze eines Werkzeugs, das gerade zuschlägt, und ihre Strecke. */
const _swingTip = new THREE.Vector3();
const _swingFrom = new THREE.Vector3();
const _swingTo = new THREE.Vector3();
const _head = new THREE.Vector3();
const _cross = new THREE.Vector3();
const _point = new THREE.Vector3();
/** Nur für die Schwerelosigkeitszone: wo ein Körper gerade steht. */
const _floating = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _rotationMatrix = new THREE.Matrix4();
const _rotation = new THREE.Quaternion();
const _normalMatrix = new THREE.Matrix3();
const _ray = new THREE.Ray();
const _aimRay = new THREE.Ray();
/** Der Blick durchs Fadenkreuz — woran die Hand vor dem Auge zielt (`eyeAim`). */
const _eyeRay = new THREE.Ray();
const _eyeHoldAt = new THREE.Vector3();
const _eyeHoldTurn = new THREE.Quaternion();
const _eyeSightAt = new THREE.Vector3();
/** Die Größe des Getragenen, so wie es gerade gezeichnet wird (`updateScreenCarry`). */
const _screenSpanShown = { radius: 0, half: 0 };
const _eyeSightTurn = new THREE.Quaternion();
const _eyeGripToRay = new THREE.Quaternion(
  GRIP_TO_RAY.x,
  GRIP_TO_RAY.y,
  GRIP_TO_RAY.z,
  GRIP_TO_RAY.w,
);
const _quaternion = new THREE.Quaternion();
const _hitPoint = new THREE.Vector3();
const _hitNormal = new THREE.Vector3();
const _hit = { point: _hitPoint, normal: _hitNormal, object: null as unknown as THREE.Object3D };
const _far = new THREE.Vector3();
const _funnelNormal = new THREE.Vector3();
const _carryA = new THREE.Vector3();
const _carryB = new THREE.Vector3();
const _carried: THREE.Vector3[] = [];
/** Wo der Trage-Anker der Bildschirmhand in diesem Bild steht. */
const _screenCarryAt = new THREE.Vector3();
/** Dieselbe Stelle im Raum des Rigs — dorthin gehen die Hände der Figur. */
const _screenCarryHands = new THREE.Vector3();
/** Die leere Menge für `carryGrab`: Die Bildschirmhand greift nicht aus der Nähe. */
const _screenReach = new Set<PhysicsBody>();
/** Für `spanOf` — die Hülle des Getragenen, einmal je Zugriff. */
const _spanBox = new THREE.Box3();
const _spanSize = new THREE.Vector3();
const _otherHand = new THREE.Vector3();
const _thisHand = new THREE.Vector3();
const _localOrigin = new THREE.Vector3();
const _rotationB = new THREE.Quaternion();
const _localRotation = new THREE.Quaternion();
const _size = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
/** Der Kopf des Spielers, für die Fäden eines übernommenen NPC. */
const _puppetHead = new THREE.Matrix4();
/** So weit darf der nächste NPC weg sein, wenn man keinen anschaut (`takeOverNpc`). */
const TAKEOVER_RANGE = 8;
// Benutzen mit der Hand (`core/handUse.ts`) — eigene Zwischenlagen, damit die
// Rechnung dem Greifen daneben nicht in seine fährt.
const _handBox = new THREE.Box3();
const _handCentre = new THREE.Vector3();
const _handSize = new THREE.Vector3();
const _handHead = new THREE.Vector3();
const _handRay = new THREE.Ray();
const _handForward = new THREE.Vector3();
const _handFinds: HandUseFind<THREE.Object3D>[] = [];
const _handFeet = { x: 0, y: 0, z: 0 };
const _handSpot = { x: 0, y: 0, z: 0 };
const _grabHand = new THREE.Vector3();
/**
 * Was beim groben Aussieben (`readHandUseAims`) über die Zeigereichweite hinaus
 * noch mitkommt, in Metern: Der Ort eines Möbels ist sein Ursprung und nicht
 * seine Kante, und ein Tresen ist zwei Meter lang.
 */
const HAND_USE_SLACK = 3;

/**
 * The node a hand's belongings hang on.
 *
 * Am Controller ist das sein Griffraum, an einer **bloßen Hand** der
 * Zeigestrahl samt dem gemessenen Versatz darauf — sonst läge ein Gegenstand
 * quer in der Faust und ein Werkzeug zielte daneben (`core/handHold.ts`). Der
 * Ort ist in beiden Fällen derselbe wie der des Raums darunter; wer hier nur
 * eine Weltposition abholt, bekommt also, was er immer bekam.
 */
function gripOf(controller: ControllerState): THREE.Object3D {
  return controller.hold;
}

/**
 * **Wie breit etwas ist**, waagerecht, in Metern — der Halbmesser, mit dem es
 * beim Benutzen und beim Treffen zählt (`core/usable.ts`).
 *
 * Einmal beim Anmelden gemessen und nicht in jedem Bild: Eine Kuppel, die sich
 * beim Drücken drei Zentimeter senkt, ist danach nicht schmaler.
 */
function objectRadius(object: THREE.Object3D): number {
  object.updateWorldMatrix(true, true);
  const box = _useBox.setFromObject(object);
  if (box.isEmpty()) return 0;
  box.getSize(_useSize);
  return Math.max(_useSize.x, _useSize.z) / 2;
}

interface HandProbe {
  object: THREE.Object3D;
  entry: PhysicsBody;
}

/** Ein angemeldetes benutzbares Ding und seine Maße (`PortalWorld.addUsable`). */
interface UsableEntry {
  object: THREE.Object3D;
  usable: Usable;
  /** Halbmesser seines stehenden Zylinders, in Metern. */
  radius: number;
  /**
   * Halbmesser für **Kugeln**, oder 0 — die Portal-Regel: Was man drücken
   * kann, kann man auch treffen. Absichtlich getrennt vom Halbmesser oben: Ein
   * Knopf will großzügig zu bedienen und knapp zu treffen sein.
   */
  shot: number;
  /** Wie weit der Zylinder über und unter seiner Mitte reicht — nur fürs Treffen. */
  half: number;
}

/** Was der Pinsel an einem Objekt ändern darf. */
export interface PropStyle {
  color?: number;
  /** Id aus `materials.ts`. */
  material?: string | null;
}

/** Was der Inspektor über ein Objekt herausfindet. */
export interface PropReport {
  label: string;
  /** Geteilte Id, oder der Hinweis, dass es dieses Ding nur hier gibt. */
  id: string;
  mass: number;
  size: THREE.Vector3;
  speed: number;
  spin: number;
  height: number;
  material: string;
  shape: string;
  friction: number;
  bounce: number;
  sleeping: boolean;
  held: boolean;
}

/** A prop a hand has locked onto from a distance. */
interface RemoteLink {
  entry: PhysicsBody;
}

/**
 * A prop on its way to a hand after a remote pull. It flies a fixed path over
 * a fixed time instead of being thrown — a pull that gets deflected halfway
 * and never arrives is the worst of both worlds.
 */
interface Flight {
  hand: Handedness;
  time: number;
  duration: number;
  from: THREE.Vector3;
  /**
   * Pulled by a tool instead of by the bare hand. That hand is not going to
   * catch anything — it is holding the tool — so the pull lives as long as the
   * tool does and hands the prop to the free hand at the end.
   */
  viaTool: boolean;
}

/** A bullet in flight, with the time left before it is cleaned up. */
interface Bullet {
  entry: PhysicsBody;
  life: number;
  /** Was ein Rumpftreffer damit abzieht (`npc/npcHit.ts`). */
  damage: number;
  /** Tracer rounds drag a streak behind them; plain ones do not. */
  trail: Trail | null;
  /** Where it was last frame — the segment a hit is looked for along. */
  from: THREE.Vector3;
  /** Already counted somewhere. A round only ever hits once. */
  spent: boolean;
  /**
   * Die Materialien ihres Bildes, wenn es aus dem Regal kommt — leer, wenn es
   * das gerechnete Kügelchen ist.
   *
   * Die **Geometrie** einer Regalkopie gehört der Vorlage und allen anderen
   * Kopien, und `disposeTree` hält an dieser Marke an; ihre **Materialien**
   * klont jede Kopie für sich (`core/kaykitModel.copyOf`). Bei hundert
   * Schüssen in der Minute sammelt sich das, wenn es hier nicht stünde.
   */
  skins: readonly THREE.Material[];
}

/** The streak behind a tracer: the last few places it has been. */
interface Trail {
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  positions: Float32Array;
  count: number;
}

/** Physics stand-in for another player, so their body can shove props around. */
interface RemotePlayer {
  torso: THREE.Object3D;
  capsule: PhysicsBody;
  hands: [PhysicsBody, PhysicsBody];
  handObjects: [THREE.Object3D, THREE.Object3D];
}

/** A joint the welder made, with the two props it holds together. */
interface WeldJoint {
  joint: import('@dimforge/rapier3d-compat').ImpulseJoint;
  a: PhysicsBody;
  b: PhysicsBody;
}

/** A tool that has been let go of into the room. */
interface LooseTool {
  tool: Tool;
  entry: PhysicsBody;
  /**
   * Still on its way: a gliding tool (the knife) keeps its speed and
   * ignores gravity until it meets something, and then it stays there.
   */
  gliding: boolean;
  /**
   * Der Topf, aus dem sich das Budget bedient — das wird pro Platz geführt
   * (`looseBudget.ts`). Das ist die Hüfte, von der es kam, oder die Seite, in
   * deren Hand es lag; `null` für eins, das von Anfang an im Raum liegt.
   */
  home: Handedness | null;
  /**
   * Die **Hüfte**, von der es kam, und nur die. Ein Werkzeug aus dem Regal hat
   * keine, und auf einer Hüfte, an der es nie hing, darf auch nichts
   * nachwachsen.
   */
  hip: Handedness | null;
}

/** Ein Prop, wie es beim Speichern stand — Pose, Größe und Schwung. */
interface SavedProp {
  entry: PhysicsBody;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
  half: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
}

interface HandGrab {
  entry: PhysicsBody;
  /** Pose of the prop relative to the hand at pick-up time. */
  offset: THREE.Matrix4;
  lastPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  /**
   * Gesetzt beim **Nahgreifen**: gefasst, aber nicht in der Hand. Der
   * Gegenstand bleibt, wo er liegt, und folgt der Hand von dort. Darin steht,
   * was der Moment des Zugreifens festgehalten hat — die Betriebsart *Drehung
   * um Objektmitte* rechnet gegen diese Posen, und die Neigung ist der
   * Nullpunkt für die Geste, die ihn doch noch herbeiholt.
   */
  near: NearGrab | null;
  /**
   * Unter welcher Id die Hand ihre Haltung dazu trägt: die Sorte, wenn das
   * Ding einen Griff hat (`propGrip.ts`) — dann ist es die Faust um den Stab —,
   * sonst `null` für die allgemeine Objekthaltung (`GRAB_POSE_ID`).
   */
  poseId: string | null;
  /** Misst das Schütteln, solange die Flasche noch ihren Korken hat. */
  shake: ShakeMeter | null;
}

/**
 * Die Geisterhand einer Hand: dieselbe Hand, nur dort, wo sie anfassen würde.
 *
 * Sie hängt in der Welt und nicht am Gegenstand — ein Gegenstand kann
 * verschwinden (der Beutel räumt auf), und ein Geist, der mit ihm entsorgt
 * wird, nimmt beim nächsten Mal seine Geometrie nicht mehr mit. Stattdessen
 * merkt sie sich ihre Lage *im Raum des Gegenstands* und rechnet sich jedes
 * Bild daraus zurück.
 */
interface GhostView {
  hand: GhostHand;
  /** Lage im Raum des Gegenstands, sobald zugegriffen wurde. */
  pinned: THREE.Matrix4 | null;
  entry: PhysicsBody | null;
  visible: boolean;
}

/** Was eine zielende Hand gerade erreicht, und in welcher Reichweite. */
class GrabAim {
  stage: GrabStage = 'touch';
  entry!: PhysicsBody;
  /** Wo der Strahl auf die Trefferfläche kommt — dort steht die Geisterhand. */
  readonly point = new THREE.Vector3();

  set(stage: GrabStage, entry: PhysicsBody): this {
    this.stage = stage;
    this.entry = entry;
    return this;
  }
}

/** Einer pro Bild und Hand, nacheinander benutzt — kein Müll im Greifpfad. */
const _aim0 = new GrabAim();
const _handNow: GrabPose = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } };
const _spun: GrabPose = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } };

/** three.js in die reinen Zahlen von `grabReach.ts` übersetzt. */
function copyPose(position: THREE.Vector3, rotation: THREE.Quaternion, out: GrabPose): GrabPose {
  out.position.x = position.x;
  out.position.y = position.y;
  out.position.z = position.z;
  out.rotation.x = rotation.x;
  out.rotation.y = rotation.y;
  out.rotation.z = rotation.z;
  out.rotation.w = rotation.w;
  return out;
}

/**
 * **Worauf eine Hand in der Brille zeigt oder liegt** — so viel, wie der Saum
 * davon braucht.
 *
 * Dieselbe Rangfolge wie in `core/handUse.pickHandUse`: Anfassen sticht
 * Zeigen, unter Gleichen gewinnt das Nächste. Sie steht hier ein zweites Mal
 * für den Vergleich **zwischen** den beiden Händen — dort geht es nicht um
 * Kandidaten einer Hand, sondern um zwei fertige Funde.
 */
interface HandPick {
  readonly usable: Usable;
  readonly object: THREE.Object3D;
  readonly reach: 'touch' | 'aim';
  readonly distance: number;
}

interface NearGrab {
  /** Wo der Gegenstand stand, als zugegriffen wurde. */
  objectStart: GrabPose;
  /** Wo die Hand dabei war. */
  handStart: GrabPose;
  /**
   * Wo die **Geisterhand** dabei stand — der Trefferpunkt des Strahls, und
   * damit der Punkt, an dem die Hand anfassen würde. Um ihn dreht die
   * Betriebsart *wie die eigene Hand* (`pivotGrab`).
   */
  hold: Vec3;
}

/**
 * Portal sandbox with real physics: walk, jump and fall through portals, knock
 * over dominoes and carry the companion cube around.
 *
 * Both hands wear a portal gun on the belt — grab it to hold it, the left one
 * shoots blue, the right one red.
 */
export class PortalWorld implements World {
  protected readonly root = new THREE.Group();
  private readonly portalBlue = new Portal('a', COLOR_BLUE);
  private readonly portalRed = new Portal('b', COLOR_RED);
  private readonly raycaster = new THREE.Raycaster();
  /** Surfaces a portal may stick to. */
  protected readonly surfaces: THREE.Object3D[] = [];
  /** Every solid piece of the room — what the grapple and the tape hit. */
  protected readonly solids: THREE.Object3D[] = [];
  protected readonly props: PhysicsBody[] = [];
  private readonly spawns = new Map<PhysicsBody, THREE.Matrix4>();
  /**
   * The copy of each tool the belt and the shelf hand out next.
   *
   * Not "every tool that exists" any more: letting a tool go leaves it lying
   * in the room and grows a fresh one on the hip, so there can be several
   * pistols about at once. `liveTools` is the complete list; this one only
   * answers "give me a pistol".
   */
  private readonly tools = new Map<string, Tool>();
  /** Every tool that exists right now — spares, held ones and loose ones. */
  private readonly liveTools = new Set<Tool>();
  /** What each hand is carrying. */
  private readonly held = new Map<Handedness, Tool>();
  /** Preview of where each portal would land, by key. */
  private readonly rings = new Map<
    PortalKey,
    THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  >();
  private readonly bullets: Bullet[] = [];
  /**
   * **Alles, was benutzt werden kann** (`core/usable.ts`, Plan E5) — die
   * Gruppe, gegen die `useForward` prüft.
   *
   * Eine eigene Liste und keine Suche durch die Szene: Ein Raum hat tausend
   * Objekte und ein halbes Dutzend Knöpfe, und die Frage „was ist hier
   * benutzbar" steht in **jedem** Bild an, weil der Hinweis über der Figur
   * daran hängt. Angemeldet wird mit `addUsable`, abgemeldet mit
   * `removeUsable`; am Objekt selbst hängt dieselbe Auskunft als
   * `userData.usable`, für jeden, der die Liste nicht kennt.
   */
  private readonly usables: UsableEntry[] = [];
  /** Zwischenlage für `pickUsable` — je Bild neu gefüllt, nie neu angelegt. */
  private readonly useCandidates: UseCandidate[] = [];
  /**
   * **Was das gerade Gemeinte in dieser Ansicht will** (`core/interaction.ts`)
   * — oder `null`, wenn nichts dasteht.
   *
   * Je Bild neu aufgelöst, denn beides kann sich ändern: das Gemeinte, wenn
   * man einen Schritt geht, und die Ansicht, wenn jemand die Brille aufsetzt.
   * Gelesen wird es hier vom Saum (ein Ding, mit dem in dieser Ansicht nichts
   * geht, kündigt auch nichts an); der Hinweis daneben (`hint`) steht bereit
   * für die Stelle, die ihn eines Tages anzeigt.
   */
  protected useInteraction: ResolvedInteraction | null = null;
  /**
   * **Was jede Hand in der Brille gerade anfasst** (`core/handUse.ts`) — die
   * Entprellung, und sonst nichts.
   *
   * Eine Berührung drückt einen Knopf, und eine Hand, die darin liegen bleibt,
   * drückt ihn sechzigmal je Sekunde. Gemerkt wird deshalb, was im letzten
   * Bild angefasst war; ausgelöst wird nur beim **Hineinfassen**. Wer die Hand
   * herauszieht, vergisst.
   */
  private readonly handUsed = new Map<Handedness, THREE.Object3D | null>();
  /**
   * **Worauf jede Hand gerade zeigt oder liegt** (`core/handUse.pickHandUse`) —
   * je Bild neu, und die Grundlage des gelben Saums in der Brille.
   *
   * Der Saum hing bis eben am **Körper**: Gezeigt wurde, was `pickUsable` aus
   * Brust und Blickrichtung wählt (`updateUsables`), und in der Brille war das
   * regelmäßig das falsche Möbel — man hielt einen Salat in der Hand, zielte
   * damit auf die Zeile links und sah die Zeile **vor** sich leuchten. Abgelegt
   * wurde er trotzdem richtig, nämlich dort, wohin die Hand zeigte. Zwei
   * Auskünfte über dieselbe Sache, und die sichtbare war die falsche.
   *
   * Hier steht deshalb, was die Hand meint, und `showUse` nimmt in der Brille
   * genau das. Am Schirm bleibt alles beim Alten — dort gibt es keine Hand,
   * auf die man sich berufen könnte.
   */
  private readonly handPicks = new Map<Handedness, HandPick | null>();
  /**
   * **Und was der Körper meint** — dieselbe Wahl wie immer, nur aufgehoben.
   *
   * Sie entscheidet weiter, ob `A` benutzt oder springt (`PlayerRig.useCandidate`)
   * und ist in der Brille der Rückfall, solange keine Hand etwas meint.
   */
  private bodyPick: { readonly usable: Usable; readonly object: THREE.Object3D } | null = null;
  /**
   * **Der Stand der Greif-Taste zwischen Drücken und Loslassen**, je Hand
   * (`core/handUse.ts`, _Halten oder Tippen_).
   *
   * Daran hängt die eine Unterscheidung, die der Auftrag verlangt: Wer kurz
   * tippt, behält das Ding in der Hand und legt es beim nächsten Druck ab; wer
   * die Taste liegen lässt oder die Hand dabei bewegt, legt beim **Loslassen**
   * ab. Gerechnet wird die Regel nebenan — hier steht nur, was sich die Hand
   * bis zum Loslassen merkt.
   */
  private readonly gripPresses = new Map<Handedness, GripPress | null>();
  /** Wo die Hand war, als die Taste gedrückt wurde — für die Wegstrecke oben. */
  private readonly gripPressFrom = new Map<Handedness, THREE.Vector3>();
  /**
   * Die benutzbaren Dinge als Greifboxen, je Bild einmal gebaut und von beiden
   * Händen gelesen. Gerechnet wird gegen die **echte** Ausdehnung des Dings
   * plus den Zuschlag des Greifens (`grabReach.GRAB_MARGIN`) und nicht gegen
   * den großzügigen Zielhalbmesser von oben: Auf vier Zentimeter Kippschalter
   * zielt von oben niemand — eine Hand, die daraufliegt, trifft ihn genau.
   */
  private readonly handUseAims: { entry: UsableEntry; target: AimTarget }[] = [];
  /** Was in **diesem** Bild schon von einer Hand benutzt wurde. */
  private readonly handUseFired = new Set<Usable>();
  /**
   * **Die Hand am Schirm** (`screenHand.ts`) — in beiden flachen Ansichten.
   *
   * In beiden hält sie das gewählte Werkzeug, dessen Trigger der Linksklick
   * ist: von oben an der Faust der Figur, aus den Augen vor der Kamera, wo man
   * sie samt Waffe sieht (`eyeHand.ts`). Mit leerer Hand schießt die Maus aus
   * den Augen weiter die Portale. **Tragen** tut sie in beiden: Was aus dem Beutel oder dem Regal kommt, hängt an
   * ihrem zweiten Anker (`ScreenHand.carry`, `updateScreenCarry`) — vorher
   * fiel es dort zu Boden. In der Brille gibt es sie nicht: Dort sind die
   * Hände die getrackten.
   */
  private screenHand: ScreenHand | null = null;
  /**
   * **Ob die Bildschirmhand ihr Werkzeug schon bekommen hat** — einmal, wenn
   * sie entsteht; danach wechselt es nur noch über die Wahl
   * (`chooseScreenTool`).
   */
  private screenToolOn = false;
  /** Das Fadenkreuz aus den Augen — da, solange die Hand ein Werkzeug hält. */
  private crosshair: HTMLElement | null = null;
  /**
   * Wie weit das Fadenkreuz gerade trifft, geglättet — daran dreht sich die
   * Hand vor dem Auge (`eyeHand.ts`). Geglättet, weil ein Blick über eine
   * Kante die Weite von zwei auf dreißig Meter springen lässt, und eine Waffe,
   * die dabei im Bild zuckt, sieht kaputt aus.
   */
  private eyeAimDistance = EYE_AIM_MAX;
  /**
   * **Wie weit die Waffe gerade am Auge ist** — 0 an der Hüfte, 1 im Anschlag
   * (`ScreenHand.placeAtEye`). Wandert in `EYE_SIGHT_TIME` hin und zurück,
   * solange die rechte Maustaste oder LB liegt (`PlayerRig.sighting`).
   */
  private eyeSighting = 0;
  /**
   * **Was die Bildschirmhand aus den Augen halb so groß trägt** — und in
   * welcher Größe es vorher war, damit es beim Loslassen oder beim Wechsel
   * nach oben wieder so groß wird (`shrinkScreenCarry`).
   */
  private shrunk: { entry: PhysicsBody; scale: THREE.Vector3 } | null = null;
  /**
   * **Wie groß das ist, was die Bildschirmhand trägt** — halbe Ausdehnung,
   * gemessen beim Zugreifen.
   *
   * Daran hängt, wie weit vor der Figur beziehungsweise vor der Kamera es
   * liegt (`core/screenCarry.ts`): Ein Schlüssel darf dicht heran, ein Baum
   * muss weg.
   */
  private screenSpan: CarrySpan = { radius: 0.2, half: 0.2 };
  /**
   * **Der Stand des Benutzen-Knopfes**, solange die Bildschirmhand trägt —
   * dieselbe Rechnung wie für die Greif-Taste in der Brille
   * (`core/handUse.ts`, _Halten oder Tippen_).
   */
  private screenPress: GripPress | null = null;
  /** Wo der Trage-Anker stand, als der Knopf gedrückt wurde. */
  private readonly screenPressFrom = new THREE.Vector3();
  /** Ob der Knopf im letzten Bild schon lag (`PlayerRig.useHeld` ist kein Flankengeber). */
  private screenUseWas = false;
  /**
   * **Ob das Getragene auf den nächsten Druck wartet.**
   *
   * Wahr, sobald ein **Tippen** es in der Hand gelassen hat — und dann legt
   * der nächste Druck sofort ab, genau wie in der Brille. Falsch, solange es
   * frisch aus dem Beutel oder dem Regal kommt: Dann ist der erste Druck der
   * Griff darum, und erst sein Loslassen entscheidet.
   */
  private screenTapped = false;
  /**
   * **Ob die Bildschirmhand gerade zwei Dinge für sich beansprucht**: den
   * Benutzen-Knopf (`PlayerRig.useBusy`) und die Hände der Figur
   * (`PlayerAvatar.carry`).
   *
   * Gemerkt, damit beides wieder **freigegeben** wird, wenn sie loslässt —
   * und nur dann. Beide Felder gehören der Welt gemeinsam mit ihren Zonen
   * (die Küche schreibt in dieselben); wer sie jedes Bild blind auf `false`
   * setzte, nähme der Küche ihren Feuerlöscher aus der Hand.
   */
  private screenClaim = false;
  /**
   * **Der gelbe Saum um das, was `A` gerade meint** (`core/highlight.ts`).
   *
   * Er hängt an der Welt und nicht am Ding: Genau eines leuchtet, und wer
   * die Welt verlässt, nimmt ihn mit (`dispose`).
   */
  private readonly highlighter = new Highlight(this.root);
  /**
   * **Der zweite Saum** — nur in der Brille und nur, wenn _zwei Gegenstände_
   * eingeschaltet ist (`core/grabSettings.GrabSettings.twoHands`).
   *
   * Solange eine Hand trägt und die andere frei bleibt, gibt es genau **eine**
   * Auskunft, und ein zweiter Saum wäre eine Frage zu viel: Wer links die
   * Pfanne hält, greift als Nächstes auch links zu. Sobald aber **jede** Hand
   * etwas Eigenes greifen kann, ist „was meint die Hand?" zweimal zu
   * beantworten — und dann gehört jeder Hand ihr eigener Saum, sonst zeigt
   * eine der beiden ins Ungewisse.
   *
   * Zwei Instanzen und keine Liste in `Highlight`: Die Klasse verspricht
   * ausdrücklich, dass **genau ein** Ding leuchtet (`core/highlight.ts`), und
   * zwei Hände sind zwei solcher Versprechen — nicht eines mit zwei Dingen.
   */
  private readonly secondHighlighter = new Highlight(this.root);
  /**
   * **Die Hand, die zuletzt etwas getan hat** — und deshalb die, deren Saum
   * gilt, solange nur ein Gegenstand getragen wird.
   *
   * Das ist die gemeldete Beobachtung aus der Brille: Mit der Pfanne in der
   * Linken sprang der Saum zwischen den Händen hin und her, weil er immer der
   * **näheren** der beiden folgte (`handMeans`) — die freie Rechte streifte
   * im Vorbeigehen eine Arbeitsplatte, und schon leuchtete die statt dessen,
   * was die tragende Hand meint. Wer eines in der Hand hat, meint aber mit
   * dieser Hand weiter; die andere schaukelt nur mit.
   *
   * Gesetzt wird sie dort, wo eine Hand wirklich **handelt** und nicht, wo sie
   * hinzeigt: ein Griff nach einem Gegenstand (`attach`), ein Werkzeug in die
   * Faust (`takeTool`, `catchLooseTool`) und ein Druck, der etwas bewirkt hat
   * (`useByHand`). Zeigen allein setzt sie nicht — sonst wäre sie wieder
   * dasselbe Hin und Her, nur mit einem Bild Verzögerung.
   */
  private lastActHand: Handedness | null = null;

  /**
   * **Die Umrisse der Physik** — das Häkchen _Hitboxen_ unter *Grafik*
   * (`physics/HitboxView.ts`).
   *
   * Sie hängt hier und nicht in einer einzelnen Welt: Eine Kapsel, eine
   * Kiste und eine Wand gibt es überall, wo es Physik gibt, und das ist genau
   * diese Klasse. Sie entsteht erst beim ersten Häkchen — wer sie nie
   * anschaltet, bezahlt sie auch nicht.
   */
  private hitboxes: HitboxView | null = null;
  /**
   * **Was der Spieler am Bildschirm gewählt hat** (`#hud-tool`).
   *
   * `undefined` heißt: noch nichts gewählt — dann gilt, was die Welt vorsieht
   * (`defaultScreenTool`), und für alles Bestehende ändert sich nichts.
   * `null` ist eine Wahl und heißt leere Hand.
   */
  private toolPick: string | null | undefined = undefined;
  /**
   * Die Liste hinter dem Knopf, einmal gebaut.
   *
   * Einmal, weil sie Werkzeuge baut, um an Beschriftung und Ikone zu kommen
   * (`tool`) — dasselbe tut das Regal am Handgelenk beim Weltstart auch. Je
   * Bild neu wäre es ein Ruckler pro Bild.
   */
  private toolOptions: ToolOption[] | null = null;
  /** Keyed by hand, plus a `:far` probe for the half that is through a portal. */
  private readonly probes = new Map<string, HandProbe>();
  private readonly grabs = new Map<Handedness, HandGrab>();
  /** Der Schaum geknallter Flaschen, solange er fällt. */
  private readonly foams: Foam[] = [];
  private readonly spawned = new Set<PhysicsBody>();
  /**
   * **Was die Welt selbst aufgestellt hat** (`placeModel`) — die Wände aus dem
   * Regal in Haunting und im Wandparcours. Jedes Gerät baut sie aus demselben
   * Bauplan selbst; über die Leitung geht davon nichts (`PortalSync`,
   * `local`), und sie stehen fest statt als Körper, der fallen kann.
   */
  private readonly worldOwned = new WeakSet<PhysicsBody>();
  /** Dieselben Stücke gebündelt gezeichnet (`shared/modelBatch.ts`, `stepWorldBatch`). */
  private worldBatch: ModelBatch | null = null;
  private readonly worldBatchItems: PhysicsBody[] = [];
  /**
   * **Frisch aus dem Regal und noch nie hingestellt** — im _Baukasten_ kommt
   * beim Hinstellen eines solchen Modells gleich das nächste in die Hand
   * (`core/gameMode.refillsCatalogue`, `release`).
   */
  private readonly shelfFresh = new WeakSet<PhysicsBody>();
  /** Wie jedes Modell aus dem Regal steht (`modelStance.ts`) — nur Modelle stehen hier. */
  private readonly stances = new WeakMap<PhysicsBody, ModelStance>();
  /**
   * **Die Bodenstücke aus dem Regal** (`modelStance.isFloorPiece`) und wie hoch
   * ihre Lauffläche über ihrer Mitte liegt (`props.ModelBlueprint.tread`).
   * Nur, was hier steht, wird beim Hinstellen eingelassen (`sinkFloor`).
   */
  private readonly floorPieces = new WeakMap<PhysicsBody, number>();
  /** Unter welchem Schlüssel die Liste der Weltänderungen ein Modell führt. */
  private readonly changeKeys = new WeakMap<PhysicsBody, string>();
  /** Die Zuhörer, die die Menüzeilen nachziehen — einmal je Welt angemeldet. */
  private modeWatch: (() => void) | null = null;
  private changesWatch: (() => void) | null = null;
  private readonly flights = new Map<PhysicsBody, Flight>();
  private readonly links = new Map<Handedness, RemoteLink>();
  private readonly ropes = new Map<
    Handedness,
    THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>
  >();
  protected readonly surfaceGroups = new Map<THREE.Object3D, number>();
  /**
   * Der Körper, den ein gebauter Quader in der Physik hat.
   *
   * Nur dafür da, ihn **wieder wegnehmen** zu können (`dropSlab`). Solange eine
   * Welt einmal gebaut und dann nur noch bewohnt wurde, brauchte das niemand;
   * seit man an einer Gitterwelt im Stehen weiterbaut (`grid/GridWorld.ts`),
   * wird sie zwischendurch umgebaut — und eine Wand, die man löscht, deren
   * Körper aber stehen bleibt, ist eine unsichtbare Wand.
   */
  private readonly slabBodies = new Map<THREE.Object3D, PhysicsBody>();
  /** Shared id of every prop, in both directions. */
  private readonly bodies = new Map<string, PhysicsBody>();
  private readonly ids = new Map<PhysicsBody, string>();
  /** Only props out of the bag; the fixture props exist on every machine. */
  private readonly kinds = new Map<string, PropKind>();
  private readonly remotePlayers = new Map<string, RemotePlayer>();
  /** Tools the other players are carrying, keyed `peerId:side`. */
  private readonly remoteTools = new Map<string, Tool>();
  private readonly remoteHands = new Map<string, { left: HandBusy; right: HandBusy }>();
  /** Props another player is holding — they glow, so you can see the handover. */
  private remoteBusy = new Set<PhysicsBody>();
  /** Wie weit die Hand reicht und was am Ende der Reichweite passiert. */
  private grabConfig: GrabSettings = grabSettings();
  /** Das Zucken je Hand — die Geste, die einen gefassten Gegenstand holt. */
  private readonly pullMeters = new Map<Handedness, PullMeter>();
  /** Läuft, wenn jemand die Reichweiten umstellt. */
  private unsubscribeGrab: (() => void) | null = null;
  /**
   * Der Zylinder um den Spieler, jedes Bild neu: darin wird **gefasst**,
   * dahinter **geholt**.
   */
  private readonly nearZone: NearZone = {
    x: 0,
    z: 0,
    floor: 0,
    radius: DEFAULT_NEAR_RADIUS,
    height: DEFAULT_NEAR_HEIGHT,
  };
  /** Die Geisterhand je Hand, dort, wo die echte anfassen würde. */
  private readonly ghostHands = new Map<Handedness, GhostView>();
  /** Props the transform tool has picked out. */
  private selected: readonly PhysicsBody[] = [];
  /** 1 = normal, less while the stopwatch is wound down, more while it winds up. */
  private timeScale = 1;

  /**
   * Wie schnell die Zeit hier gerade läuft — für alles, was eine abgeleitete
   * Welt **selbst** animiert.
   *
   * Die Physik rechnet damit ohnehin (`physics.step(dt * timeScale)`); was eine
   * Welt daneben von Hand bewegt, weiß nichts davon und liefe in der Zeitlupe
   * der Stoppuhr munter weiter. Genau das wäre im Effektlabor der Witz an der
   * Sache — eine Explosion in Zeitlupe ansehen —, also fragt es hier nach.
   */
  protected get worldTimeScale(): number {
    return this.timeScale;
  }
  /**
   * Einzelbilder, die noch zu rechnen sind. Die Stoppuhr legt sie hin: bei
   * angehaltener Zeit ist ein Druck genau ein Schritt der Simulation — das
   * Werkzeug, mit dem man einen Durchschlag oder einen Portalübergang
   * tatsächlich *sieht*, statt ihn zu vermuten.
   */
  private pendingSteps = 0;
  /** Die zuletzt gespeicherte Aufstellung, für das Schnellladen. */
  private saved: SavedProp[] | null = null;
  /** Wo der Spieler zuletzt festen Boden unter den Füßen hatte. */
  private readonly lastGround = new THREE.Vector3();
  private hasLastGround = false;
  /** Die letzten Stellen des Spielers — für den Bericht nach einem Sturz (`shared/fallTrail.ts`). */
  private readonly fallTrail = new FallTrail();
  private readonly fallReport = new FallReport();
  /** Die Fläche bis zum Horizont, unter allem, was die Welt sonst baut. */
  private horizonFloor: THREE.Mesh | null = null;
  /** Läuft, wenn jemand die Welt-Physik umstellt. */
  private unsubscribePhysics: (() => void) | null = null;
  private highlighted = new Set<PhysicsBody>();
  private locked = new Set<PhysicsBody>();
  /** Joints the welder tied, so they can be cut again. */
  private readonly joints: WeldJoint[] = [];
  /** Where the view sits while a drone is flown, and the pose to come back to. */
  private viewOverride: THREE.Vector3 | null = null;
  /** The frame the head hangs in while it is away — the drone's nose turns it. */
  private viewRotation: THREE.Quaternion | null = null;
  private readonly bodyHome = new THREE.Vector3();
  private readonly bodyHomeRotation = new THREE.Quaternion();
  /**
   * Ob sich die Beutelseite gleich wieder aufmachen soll.
   *
   * Wer aus dem Beutel etwas holt, holt meistens noch etwas — also geht das
   * Panel zu, solange das Ding in der Hand ist, und danach wieder auf.
   *
   * **Für das Regal gilt das ausdrücklich nicht**, und das war ein gemeldeter
   * Fehler: Wer ein Modell hinstellt, stellt es irgendwohin — und bekam dabei
   * das Menü vor die Nase, das er gerade zugemacht hatte. Ein Beutel ist eine
   * Kiste, aus der man greift; das Regal ist ein Katalog, aus dem man
   * **einrichtet**, und dazwischen liegt ein Blick auf das, was man gerade
   * hingestellt hat. Aufgeschlagen wird es wieder von Hand — und dann an
   * derselben Stelle, denn der Weg durchs Menü bleibt beim Zumachen stehen
   * (`ui/menuNav.ts`).
   */
  private reopenMenu = false;
  /**
   * Der Index des Regals: `undefined`, solange niemand danach gefragt hat,
   * `null`, wenn es keinen gibt (ein Checkout ohne die gekauften Pakete).
   */
  private shelf: KaykitIndex | null | undefined;
  /** Ob schon danach gefragt wurde — gefragt wird genau einmal je Welt. */
  private shelfAsked = false;
  /**
   * **Alle Dateien des Regals flach**, für das Suchfeld — einmal gerechnet und
   * dann behalten.
   *
   * Der Menübaum wird bei jeder Änderung neu gebaut (`refreshWorldMenu`, die
   * Bildratenzeile zweimal die Sekunde); diese Liste ändert sich dabei nie,
   * und viertausendfünfhundert Einträge je Neubau abzulaufen wäre Arbeit für
   * nichts.
   */
  private shelfFiles: readonly KaykitFileRef[] = [];
  /**
   * **Der fertige Katalogbaum**, einmal gebaut und dann behalten — aus
   * demselben Grund wie `shelfFiles`, nur teurer.
   *
   * Hinter den drei Wegen hinein (alles, Pakete, Kategorien) stehen zusammen
   * gut zehntausend Einträge, und der Menübaum wird bei jeder Änderung neu
   * gesetzt. Sie hängen an nichts, was sich ändert: Beschriftungen, Ids und
   * Größen kommen aus dem Index, und was beim Nehmen passiert, holt sich die
   * Welt erst beim Zugreifen (`ctx()`).
   */
  private shelfMenu: MenuEntry[] | null = null;
  /**
   * **Das Gitter unter dem Getragenen** (`placeGrid.ts`) — es zeigt vor dem
   * Loslassen, auf welche Kacheln das Möbel fällt. Gebaut wird es beim Aufbau
   * der Welt und weggeräumt mit ihr.
   */
  private placeGrid: PlaceGrid | null = null;
  /**
   * **Flächen setzen im Baukasten** (`areaPaint.ts`, `areaPad.ts`) — die
   * Leiste mit _▦ Fläche_, gebaut beim ersten Mal, wenn sie etwas zu zeigen
   * hat, und weggeräumt mit der Welt.
   */
  private areaPad: AreaPad | null = null;
  /**
   * **Die Werkzeugleiste des Baukastens** (`buildBar.ts`), der Stapel für
   * Rückgängig/Wiederholen (`buildHistory.ts`) und der Geist am Landepunkt
   * (`placeGhost.ts`) — siehe `updateBuild`.
   */
  private buildBar: BuildBar | null = null;
  private readonly buildHistory = new BuildHistory();
  private placeGhost: PlaceGhost | null = null;
  /** Solange ein Schritt nachgespielt wird, kommt nichts auf den Stapel. */
  private replaying = false;
  /** Wo ein schon stehendes Stück stand, als es aufgehoben wurde — für _Verschieben_ rückgängig. */
  private readonly pickedFrom = new WeakMap<PhysicsBody, BuildPose>();
  /** Der letzte Pinsel aus dem Regal — _Setzen_ mit leerem Haken nimmt ihn wieder. */
  private lastBrush: { path: string; yaw: number } | null = null;
  /** Ob im Baukasten auch Möbel in Achteln drehen (`45°` an der Leiste, `gridPose` mit `fine`). */
  private fineTurn = false;
  /** In der Brille: Greifen reißt ab (`buildToolsMenu`, `attach`). */
  private vrErase = false;
  private readonly slantScratch: PhysicsBody[] = [];
  /** _Boden_ oder _Wand_ an der Leiste (`surfaceDecor.ts`) — sonst `null`. */
  private surfaceTool: 'floor' | 'wall' | null = null;
  /** Welches Muster aus `FLOOR_STYLES` und `WALL_STYLES` gerade gilt. */
  private floorStyle = 0;
  private wallStyle = 0;
  /** Ersetzte Wände, die auf den Schritt der neuen warten (`replaceWalls`, `pushBuild`). */
  private readonly replacedSteps: BuildStep[] = [];
  /** _Kopieren_ ist scharf: Der nächste Druck auf ein Stück macht es zum Pinsel (`armCopy`). */
  private pipette = false;
  /** Die Kästen, gegen die gestapelt und an die gehängt wird — je Bild neu gefüllt. */
  private readonly decorScratch: DecorBox[] = [];
  private readonly decorModels: PhysicsBody[] = [];
  /** Ob _Fläche_ gerade an ist. */
  private areaOn = false;
  /**
   * **Der laufende Pinselstrich** (`paintStroke`) — welches Modell, wo zuletzt
   * gesetzt wurde und welche Plätze in diesem Strich schon eine Kopie haben.
   */
  private paint: {
    entry: PhysicsBody;
    path: string;
    last: THREE.Vector3;
    done: Set<string>;
    count: number;
    /** Ob in diesem Strich schon „kein Platz" gesagt wurde — einmal reicht. */
    refused?: boolean;
  } | null = null;
  /** Die Ecken der Fläche, zwischen Drücken, Ziehen und Nachfrage. */
  private readonly areaSelect = new AreaSelect();
  /** Die Kachel unter der Maus, bevor gedrückt wird — sie leuchtet schon. */
  private areaHover: AreaTile | null = null;
  private readonly areaRay = new THREE.Raycaster();
  private readonly previousHead = new THREE.Vector3();
  /**
   * Labels that show a value. Anything that can be changed somewhere other
   * than by tapping the row itself — the keypad, a config code, the mirror —
   * runs these afterwards, so the menu never shows yesterday's number.
   */
  private readonly menuLabels: Array<() => void> = [];
  /** The keyboard for raw values and config codes; built with the world. */
  private keys: KeyPanel | null = null;

  /** Which hip a tool came off, so a fresh one grows back there. */
  private readonly homes = new Map<Tool, Handedness>();
  /**
   * Tools lying around the room as objects, in the order they were let go of.
   *
   * A dropped tool is a prop like any other — it falls, it can be knocked
   * over, and either hand can pick it up again — so it lives in `props` too;
   * this is what tells the two apart when a hand closes around one. Insertion
   * order is the queue `trimLoose` works from: one copy too many and the
   * oldest goes.
   */
  private readonly loose = new Map<PhysicsBody, LooseTool>();
  /**
   * Was jede schlagende Spitze sich zwischen zwei Bildern merkt
   * (`tools/meleeSwing.ts`) — je Werkzeug eine, und nur solange es in einer
   * Hand liegt.
   */
  private readonly swings = new Map<Tool, SwingState>();
  /**
   * Die Hände, die gerade am Griff der anderen stehen und deren Werkzeug
   * übernehmen könnten — jedes Bild neu gefüllt (`updateGrabs`).
   *
   * Ein Feld und keine zweite Rechnung an der Stelle, an der es gebraucht
   * wird: die Handhaltung (`updateHandGestures`) fragt danach, und zwei
   * Rechnungen für dieselbe Frage laufen irgendwann auseinander.
   */
  private readonly handover = new Set<Handedness>();
  /** How fast each hand is moving, for throwing whatever it lets go of. */
  private readonly handMotion = new Map<Handedness, HandSpeed>();
  private belt: ToolBelt | null = null;
  /**
   * Was die Werkzeuge am Raum dürfen. `protected`, weil eine abgeleitete Welt
   * dieselben Wege braucht wie ein Werkzeug — der Eingaberaum legt ein
   * Werkzeug in einen Halter und holt es wieder heraus, und das ist genau
   * `parkTool`/`unparkTool`.
   */
  protected host: ToolHost | null = null;
  /**
   * Hat diese Welt eine **Decke**, dann steht hier ihre Höhe.
   *
   * Im Spiel folgenlos — man steht darunter und sieht sie. Gesetzt wird sie
   * dort, wo die Decke gebaut wird, und gelesen von der Vorschau der
   * Werkzeugseite: die sieht eine Welt von schräg oben an, und ein
   * geschlossener Raum wäre von dort ein grauer Kasten. Unterhalb dieser Höhe
   * schneidet sie ihn auf, wie ein Puppenhaus.
   */
  protected roof: number | null = null;
  protected physics: PhysicsWorld | null = null;
  /**
   * **Wer hier herumläuft** (`worlds/npc/NpcDirector.ts`).
   *
   * Er hängt an der Welt und nicht am Werkzeug: ein Zombie bleibt stehen, wenn
   * man das Hirn weglegt, und der Käfig legt weiter nach. Das Werkzeug ist die
   * Bedienung, nicht der Besitzer.
   */
  protected director: NpcDirector | null = null;
  /**
   * **Der Puppenspieler** (`worlds/npc/Puppeteer.ts`): einen NPC übernehmen,
   * ihm eine Aktion vormachen, sie ihn nachspielen lassen. Er hängt am
   * Regisseur und lebt genau so lange wie er.
   */
  private puppeteer: Puppeteer | null = null;
  private unsubscribeCharacters: (() => void) | null = null;
  /** Sekunden seit dem letzten Neuzeichnen der Charakter-Zeilen im Menü. */
  private puppetTick = 0;
  /**
   * Die aufgestellten Schilder dieser Welt (`worlds/signs/SignRoom.ts`).
   *
   * Sie hängen am Raum und nicht am Werkzeug: Wer eines hinstellt, kann sein
   * Werkzeug danach weglegen, und das Schild bleibt — bei ihm und bei allen
   * anderen in der Sitzung.
   */
  protected signs: SignRoom | null = null;

  /**
   * **Der Kachelgraph dieser Welt** (`worlds/nav/`).
   *
   * Wird beim Laden aus den Quadern abgetastet, die `slab()` gebaut hat — eine
   * Welt muss dafür nichts tun und nichts wissen. `null`, solange nichts
   * gebaut wurde oder das Abtasten nichts gefunden hat.
   */
  protected nav: NavGraph | null = null;
  private navReport: BakeReport | null = null;
  private navDebug: THREE.Group | null = null;
  /** Die Wege, die gerade gelaufen werden — eigene Ebene, weil sie sich ändern. */
  private navTracks: THREE.Group | null = null;
  private navTrackTimer = 0;
  /** Welche Ebenen der Debug-Ansicht gerade an sind (`nav/navLayers.ts`). */
  private navLayers: NavLayerState = noLayers();
  /**
   * Was von der Navigation gerade **gilt** (`nav/navSwitches.ts`).
   *
   * Nicht zu verwechseln mit den Ebenen darüber: Die machen etwas sichtbar,
   * diese machen es wirksam. „Fläche aus" heißt, dass niemand mehr einen Weg
   * sucht — und dann sieht man, was die Wegsuche eigentlich leistet.
   */
  private navSwitches: NavSwitchState = allOn();
  /** Wann die Lebensbalken über den NPCs zu sehen sind (`npc/NpcBody.ts`). */
  private npcBars: BarMode = 'hurt';
  /** Ob die Trefferzonen der NPCs zu sehen sind (`npc/npcHit.ts`). */
  private npcHitView = false;
  /** Wohin Meldungen gehen, solange die Welt als Vorschau läuft. */
  private previewSink: ((message: string) => void) | null = null;
  /**
   * **Die Attrappe des Spielers in der laufenden Vorschau** — oder `null`,
   * solange richtig gespielt wird.
   *
   * Sie ist der Grund, warum eine Vorschau überhaupt etwas zeigt: Ein Zombie
   * geht jemandem nach, und in einer Vorschau steht niemand. Was hier steht,
   * bekommt `playerFeet()` zurück, wenn es keinen Spieler gibt — für die
   * Hirne, die Wegsuche und die Spawnpunkte ist das der Spieler.
   */
  private ghost: THREE.Group | null = null;
  /**
   * **Ob die Attrappe gerade in der Welt steht.**
   *
   * Weggeschaltet ist sie nicht bloß unsichtbar, sondern *weg*: `playerFeet()`
   * gibt dann `null` zurück, und für die Hirne, die Wegsuche und die
   * Spawnpunkte ist damit **niemand** da. Das ist der Unterschied zwischen
   * „ich sehe meine Figur nicht" und „ich stehe nicht in dieser Welt" — und
   * gemeint ist das zweite: Wer eine Karte von oben ansehen will, will nicht,
   * dass sechs Zombies dabei auf ihn zulaufen.
   */
  private ghostHere = true;
  /** Und was sie tut, wenn man sie **gehen** lässt (`shared/previewWalk.ts`). */
  private ghostWalk: PreviewWalk | null = null;
  /** Der Reichweiten-Kreis der laufenden Vorschau (`showPreviewReach`). */
  private reachRing: THREE.Mesh | null = null;
  private sync: PortalSync | null = null;
  private locomotion: PhysicsLocomotion | null = null;
  /**
   * **Wo der Flug als Kran angefangen hat** (`core/crane.ts`) — die Füße in
   * dem Bild, in dem man zum Kran wurde, oder `null`, solange man keiner ist.
   * Dorthin geht es zurück, wenn beim Landen keine freie Stelle zu finden
   * ist (`updateCraneFlight`).
   */
  private craneStart: THREE.Vector3 | null = null;
  /** Ob man in diesem Bild der Kran ist — für `attach`, das keinen `ctx` hat. */
  private craneNow = false;
  /**
   * **Die Abrissbombe am Haken** (`core/craneBomb.ts`) — `null`, solange der
   * Kran keine trägt. Die Gruppe hängt am Rig, darin das Modell, sobald es da
   * ist.
   */
  private bomb: THREE.Group | null = null;
  /** Was gerade als Geist markiert ist — samt den Materialien von vorher. */
  private bombTarget: {
    entry: PhysicsBody;
    skins: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
  } | null = null;
  /** Der Geist selbst: ein Material für alles, was gleich abgerissen wird. */
  private bombGhost: THREE.MeshStandardMaterial | null = null;
  /** Was beim Loslassen ersetzt wird, rot angezeigt (`markReplaced`), samt eigener Materialien. */
  private readonly replaced = new Map<
    PhysicsBody,
    Map<THREE.Mesh, THREE.Material | THREE.Material[]>
  >();
  private readonly replaceScratch: PhysicsBody[] = [];
  /** Der Kreis am Boden unter dem Kran (`core/crane.buildCraneMark`). */
  private craneMark: THREE.Group | null = null;
  protected context: WorldContext | null = null;
  private portalRenderer: PortalRenderer | null = null;
  private ghosts: PortalGhosts | null = null;
  /**
   * Wer davon gerade ein Abbild hat (`updateGhosts`) — die Schlüssel derer,
   * die im letzten Bild angemeldet waren.
   */
  private npcGhosts = new Set<string>();
  private clippingWasEnabled = false;
  private hasPreviousHead = false;
  private time = 0;
  private canvas: HTMLCanvasElement | null = null;
  private flatFire: ((event: MouseEvent) => void) | null = null;
  private flatKeys: ((event: KeyboardEvent) => void) | null = null;
  private blockContextMenu: ((event: Event) => void) | null = null;

  async init(ctx: WorldContext): Promise<void> {
    this.context = ctx;
    this.root.name = 'portal-world';
    ctx.scene.add(this.root);
    ctx.scene.background = new THREE.Color(this.skyColor());
    ctx.scene.fog = null;
    this.root.add(createLighting(this.lightIntensity()));

    this.physics = await PhysicsWorld.create(-this.gravityNow());
    // Der Boden liegt *unter* allem, was die Welt selbst baut: er ist die
    // Fläche, die es überall gibt, nicht der Fußboden dieses Raums.
    this.buildHorizonFloor();
    this.buildEnvironment();
    // Erst jetzt: vorher steht noch kein Quader, aus dem sich ein Gitter
    // ableiten ließe.
    this.bakeNavigation();
    this.sync = this.createSync(ctx);

    this.portalBlue.link = this.portalRed;
    this.portalRed.link = this.portalBlue;
    this.root.add(this.portalBlue, this.portalRed);

    this.portalRenderer = new PortalRenderer(ctx.renderer);
    this.portalRenderer.depth = portalDepth();
    this.ghosts = new PortalGhosts(this.root);
    // The cut halves of hands and props are done with material clipping planes.
    this.clippingWasEnabled = ctx.renderer.localClippingEnabled;
    ctx.renderer.localClippingEnabled = true;

    ctx.rig.placeFeetAt(this.spawnPoint(), this.spawnYaw());
    this.locomotion = new PhysicsLocomotion(this.physics, ctx.rig);
    this.locomotion.plane = this.playerPlane();
    ctx.rig.setLocomotion(this.locomotion);
    this.applyWorldPhysics();
    this.unsubscribePhysics = onWorldPhysicsChange(() => this.applyWorldPhysics());
    this.grabConfig = grabSettings();
    this.unsubscribeGrab = onGrabChange(() => this.applyGrabSettings(grabSettings()));
    this.hasPreviousHead = false;

    this.director = new NpcDirector({
      root: this.root,
      physics: this.physics,
      playerAt: (target) => this.npcTarget(target),
      strikePlayer: (direction, strength) => this.takeHit(direction, strength),
      notify: (message) => this.announce(message),
      nav: () => this.navForAgents(),
      cells: () => this.cellsForAgents(),
    });
    this.director.setBars(this.npcBars);
    this.director.setHitView(this.npcHitView);
    this.puppeteer = new Puppeteer(this.director, this.puppetStage(this.physics));
    // Ein gespeicherter Charakter ist eine Menüzeile — die Liste wird beim
    // Bauen des Menüs gelesen, also wird es neu gebaut, wenn sie sich ändert.
    this.unsubscribeCharacters = onCharactersChange(() => this.context?.refreshWorldMenu());
    this.signs = new SignRoom({
      root: this.root,
      context: () => this.context,
      worldId: () => this.context?.net.world ?? 'portal',
      notify: (message) => this.announce(message),
      handBusy: (hand) => this.held.get(hand) !== undefined,
      askText: (request) =>
        this.askLines({
          title: request.title,
          sub: request.sub,
          value: request.value,
          hint: request.hint,
          commit: request.commit,
        }),
    });
    this.host = this.buildHost(ctx);
    this.keys = new KeyPanel();
    this.root.add(this.keys);
    this.placeGrid = new PlaceGrid(this.root);
    ctx.pointer.add(this.keys.asPointerTarget());
    this.setupTools(ctx);
    // **Und die Patrone dazu**: Sie gehört zur Pistole, die hier gerade
    // entsteht, und sie ist das einzige Regalmodell dieser Welt, das im
    // Sekundentakt gebraucht wird (`bulletView`). Wer sie erst beim ersten
    // Abzug holt, sieht die ersten Schüsse als gerechnete Kügelchen.
    this.warmBullet();
    this.bindFlatInput(ctx);
    // Die kleinen Modelle in den Menüzeilen kommen aus demselben Regal wie
    // die Werkzeuge selbst — abgeschrieben, nicht gebaut (`WristMenu.ts`).
    ctx.menu.setModelFactory(
      (id) => this.menuModel(id),
      (id, height) => this.menuClips(id, height),
    );

    ctx.notify(this.welcome());
  }

  update(dt: number, ctx: WorldContext): void {
    this.context = ctx;
    if (!this.physics || !this.locomotion) return;

    this.time += dt;
    this.portalBlue.setTime(this.time);
    this.portalRed.setTime(this.time);

    this.updateTools(dt, ctx);
    this.updateUsables(ctx);
    this.updateGrabs(dt, ctx);
    // **Und das Gitter unter dem, was getragen wird** — erst nachdem die Hände
    // nachgeführt sind, sonst zeigte es auf die Kachel des letzten Bildes.
    this.updatePlaceGrid(ctx);
    // **Und die gezogene Fläche darüber** — ist _Fläche_ an, zeigt das Gitter
    // die Fläche und nicht das eine Stück in der Hand.
    this.updateAreaPaint(ctx);
    // **Und die Werkzeugleiste samt Geist** — nach der Fläche, damit ein
    // Druck auf _Drehen_ schon im nächsten Bild im Gitter steht.
    this.updateBuild(ctx);
    // **Erst jetzt der Saum**: Er hängt in der Brille an dem, worauf die Hand
    // zeigt, und das steht erst nach `updateGrabs` fest (`showUse`).
    this.showUse(dt, ctx);
    this.updateFoam(dt);
    this.updateGhosts(ctx);
    this.updateHandProbes(ctx);
    this.handleReset(ctx);

    this.locomotion.phaseMask = this.playerFunnelMask();
    this.updateCraneFlight(ctx);

    this.updateRemotePlayers(ctx);
    this.reportHands();
    this.sync?.update(dt);

    this.updateNavTracks(dt);
    this.updatePhasing();
    // Vor dem Schritt und nicht danach: was gerade in die Zone geflogen ist,
    // soll in demselben Schritt schweben und nicht erst im nächsten fallen.
    this.updateFloatZone();
    this.updateBullets(dt);
    // Vor dem Regisseur: Die Fäden eines übernommenen NPC werden *vor* seinem
    // Bild gezogen, sonst stünde er ein Bild hinter dem Spieler.
    this.updatePuppeteer(dt, ctx);
    // Vor dem Schritt: was das Hirn in dieser Frame will, soll in *dieser*
    // Frame gelaufen werden und nicht in der nächsten.
    this.director?.update(dt * this.timeScale);
    // Die Schilder laufen in **echter** Zeit: Ein Aushang, den die Stoppuhr
    // anhält, wäre eine Zeitlupe des Lesens.
    this.signs?.update(dt);
    // The stopwatch slows the simulation, not the frame rate: everything the
    // player does with their hands stays as responsive as ever. Bei
    // angehaltener Zeit rechnet stattdessen die Stoppuhr die Schritte ab, die
    // sie bestellt hat — feste Bilder, unabhängig davon, wie lang der letzte
    // Frame gedauert hat.
    if (this.pendingSteps > 0) {
      this.physics.stepFixed(this.pendingSteps);
      this.pendingSteps = 0;
    } else {
      this.physics.step(dt * this.timeScale);
    }
    this.physics.sync();
    this.traverseProps();
    this.traverseNpcs();
    this.traversePlayer(ctx);
    this.updatePortalDepth(ctx);
    this.updateAim(ctx);
    this.applyViewOverride(ctx);
    this.updateFallRescue(ctx, dt);
    this.updateHitboxes();
    this.stepWorldBatch(dt, ctx);
    // Zuletzt: was die Welt für sich selbst tut. Dieselbe Zeile läuft in der
    // laufenden Vorschau ohne alles darüber (`stepPreview`).
    this.simulate(dt);
  }

  menu(): MenuEntry[] {
    const ctx = () => this.context!;
    // The tree is built once per world; the label refreshers belong to it.
    this.menuLabels.length = 0;
    const toggle = (entry: MenuEntry, value: boolean, message: string): void => {
      entry.checked = value;
      this.context?.notify(message);
    };

    return [
      {
        id: 'tools',
        label: 'Werkzeuge',
        sub: 'Ausrüstung in die Hand, Einstellungen dahinter',
        icon: 'tools',
        accent: 0x9d7bff,
        // Genommen wird mit Greifen, nie mit dem Trigger: der zielt ja gerade
        // aufs Panel. Der Trigger hat hier eine andere Aufgabe bekommen — er
        // geht ins Einstellungsmenü des Werkzeugs, hinter den Pfeil.
        take: true,
        children: TOOL_IDS.map((id) => this.toolEntry(id)),
      },
      {
        id: 'bag',
        label: 'Magischer Beutel',
        sub: 'Objekte herbeirufen',
        icon: 'bag',
        accent: 0xffc857,
        grid: true,
        children: BAG_ITEMS.map(([kind, label, icon]) => ({
          id: `bag:${kind}`,
          label,
          icon,
          accent: 0xffc857,
          run: (hand: Handedness | null) => this.spawnProp(ctx(), hand, kind),
        })),
      },
      this.assetMenu(ctx),
      this.buildToolsMenu(),
      this.npcMenu(),
      {
        id: 'settings',
        label: 'Einstellungen',
        sub: 'Was darf die Hand?',
        icon: 'settings',
        accent: 0x4aa8ff,
        children: [
          this.modeEntry(),
          this.interfaceMenu(),
          this.grabMenu(toggle),
          this.depthEntry(),
          this.physicsMenu(),
          this.handsMenu(),
          this.configMenu(),
          {
            id: 'setting:poses',
            label: 'Werkzeug-Posen zurücksetzen',
            sub: 'Alles, was der Justierer gemessen hat',
            icon: 'wrench',
            accent: 0xffc857,
            run: () => {
              const count = storedPoseCount();
              clearPoses();
              for (const tool of this.liveTools) tool.resetHold();
              this.context?.notify(
                count ? `${count} Pose(n) zurückgesetzt` : 'Keine gespeicherten Posen',
              );
            },
          },
        ],
      },
      this.changesMenu(),
      {
        id: 'reset',
        label: 'Zurücksetzen',
        sub: 'Alles auf Anfang — auch Möbel und gespeicherte Umbauten',
        icon: 'reset',
        accent: COLOR_RED,
        run: () => this.resetEverything(ctx()),
      },
    ];
  }

  /**
   * **NPC** — die dritte Kategorie neben Werkzeugen und Beutel.
   *
   * Sie ist keine Werkzeugkiste und kein Beutel: was hier herauskommt, läuft
   * von selbst weiter. Und sie ist in **zwei Hälften** geteilt, weil ein NPC
   * aus zweien besteht — die **Haut** sagt, wie er aussieht
   * (`worlds/npc/npcKinds.ts`), das **Hirn**, was er tut
   * (`worlds/npc/npcBrains.ts`). Wer hier einen Zombie setzt, setzt eine Haut
   * mit dem Hirn, das gerade eingestellt ist; wer beides in Ruhe aussuchen
   * will, nimmt das **Hirn-Werkzeug** in die Hand, das dieselben Zahlen
   * bedient (`tools/BrainTool.ts`). Zwei Bedienungen, ein Speicher — wie beim
   * Beutel, den es als Rasterseite *und* als Werkzeug gibt.
   */
  // --- das Navigationsgitter ------------------------------------------------

  /**
   * Die Etagenhöhen dieser Welt, oder `null` zum Raten.
   *
   * Eine Welt, die ihre Stockwerke kennt, soll es sagen — Dust baut mit 3,1 m,
   * und geraten wird daraus im Zweifel eine Etage zu viel, weil ein Vordach
   * genauso aussieht wie ein Boden.
   */
  protected navLevels(): readonly number[] | null {
    return null;
  }

  /**
   * Der Ausschnitt, der abgetastet wird.
   *
   * Der Umriss aller gebauten Quader, aber **ohne die Fläche bis zum
   * Horizont**: Die ist absichtlich riesig, und wer sie mitzählte, tastete
   * einen halben Quadratkilometer leeren Sand ab. Als Boden zählt sie
   * trotzdem — sie steckt in den Kästen, nur nicht in den Grenzen.
   */
  protected navBounds(): { minX: number; minZ: number; maxX: number; maxZ: number } | null {
    const bounds = new THREE.Box3();
    const one = new THREE.Box3();
    let found = false;
    for (const mesh of this.solids) {
      if (mesh === this.horizonFloor) continue;
      mesh.updateWorldMatrix(true, false);
      one.setFromObject(mesh);
      if (one.isEmpty()) continue;
      bounds.union(one);
      found = true;
    }
    if (!found) return null;
    // Eine Notbremse gegen die Welt, die versehentlich einen Kilometer weit
    // etwas hinstellt: abgetastet wird, was ein Mensch auch abläuft.
    const limit = 150;
    return {
      minX: Math.max(-limit, bounds.min.x - TILE),
      minZ: Math.max(-limit, bounds.min.z - TILE),
      maxX: Math.min(limit, bounds.max.x + TILE),
      maxZ: Math.min(limit, bounds.max.z + TILE),
    };
  }

  /**
   * Tastet die gebaute Welt ab und legt den Graphen bereit.
   *
   * Läuft genau einmal, direkt nach `buildEnvironment()`. Kostet für eine
   * Karte wie Dust ein paar Millisekunden — das ist der Grund, warum hier
   * nichts gespeichert und nichts von Hand gepflegt werden muss.
   */
  private bakeNavigation(): void {
    const bounds = this.navBounds();
    if (!bounds) return;
    const levels = this.navLevels();
    const report = bakeNav(boxesFrom(this.solids), {
      bounds,
      ...(levels ? { levels } : {}),
    });
    this.navReport = report;
    this.nav = report.graph;
    // Ein frisch abgetastetes Gitter kennt keine Schalter — die Stellung, die
    // gerade gilt, muss es aber trotzdem haben. Sonst zählt eine
    // ausgeschaltete Sperre nach dem nächsten Abtasten wieder mit, und niemand
    // versteht, warum.
    for (const one of NAV_SWITCHES) {
      if (one.id !== 'surface') report.graph.setFeature(one.id, this.navSwitches[one.id]);
    }
    this.navReady(report.graph);
  }

  /**
   * Nach dem Abtasten: was in keiner Geometrie steht.
   *
   * Stacheln, Türen, Leitern — davon weiß ein Quader nichts, und eine Welt, die
   * so etwas hat, malt es hier auf (`navBuild.ts`: `paintRect`, `doorBetween`).
   * Voreingestellt passiert nichts, und für die meisten Welten ist das richtig.
   */
  protected navReady(_graph: NavGraph): void {}

  /** Die Schalter, mit denen man die Navigation ansehen kann. */
  private navMenu(): MenuEntry {
    const summary = (): string => {
      const report = this.navReport;
      if (!report) return 'Für diese Welt gibt es kein Gitter';
      return layerSummary(this.navLayers);
    };
    const census = (): string => {
      const report = this.navReport;
      if (!report) return '';
      return levelCensus(report.graph)
        .map((count, level) => `E${level}\u00a0${count}`)
        .join(' · ');
    };

    const rows: MenuEntry[] = NAV_LAYERS.map((layer) => {
      const row: MenuEntry = {
        id: `npc:nav-layer:${layer.id}`,
        label: layer.label,
        sub: layer.sub,
        icon: 'gizmo',
        accent: layer.color,
        checked: this.navLayers[layer.id],
        run: () => {
          const on = this.setNavLayer(layer.id, !this.navLayers[layer.id]);
          row.checked = on;
          this.refreshMenuLabels();
          this.context?.notify(`${layer.label}: ${on ? 'an' : 'aus'}`);
        },
      };
      this.menuLabels.push(() => {
        row.checked = this.navLayers[layer.id];
      });
      return row;
    });

    const parent: MenuEntry = {
      id: 'npc:nav-debug',
      label: 'Navigation zeigen',
      sub: summary(),
      icon: 'gizmo',
      accent: 0x39d0ff,
      children: [
        {
          id: 'npc:nav-all',
          label: 'Alles an oder aus',
          sub: census(),
          icon: 'reset',
          accent: 0xffc857,
          run: () => {
            this.setNavLayers(nextAll(this.navLayers));
            this.refreshMenuLabels();
            this.context?.notify(layerSummary(this.navLayers));
          },
        },
        ...rows,
      ],
    };
    this.menuLabels.push(() => {
      parent.sub = summary();
    });
    return parent;
  }

  /**
   * **Die drei Schalter** — was von der Navigation gilt (`nav/navSwitches.ts`).
   *
   * Eine eigene Zeile neben „Navigation zeigen", und der Abstand zwischen
   * beiden ist der ganze Punkt: Die eine macht etwas sichtbar, die andere
   * macht es wirksam. Wer sie zusammenlegte, hätte ein Menü, in dem
   * „Hindernisse" einmal die Ansicht und einmal das Verhalten meint.
   */
  private navSwitchMenu(): MenuEntry {
    const rows: MenuEntry[] = NAV_SWITCHES.map((one) => {
      const row: MenuEntry = {
        id: `npc:nav-switch:${one.id}`,
        label: one.label,
        sub: one.sub,
        icon: 'gizmo',
        accent: one.color,
        checked: this.navSwitches[one.id],
        run: () => {
          const on = this.setNavSwitch(one.id, !this.navSwitches[one.id]);
          row.checked = on;
          this.refreshMenuLabels();
          this.context?.notify(`${one.label}: ${on ? 'an' : 'aus'}`);
        },
      };
      this.menuLabels.push(() => {
        row.checked = this.navSwitches[one.id];
      });
      return row;
    });

    const parent: MenuEntry = {
      id: 'npc:nav-switches',
      label: 'Navigation schalten',
      sub: switchSummary(this.navSwitches),
      icon: 'gizmo',
      accent: 0xffc857,
      children: [
        {
          id: 'npc:nav-switch:all',
          label: 'Alles wieder an',
          sub: 'Zurück zu einer vollständigen Navigation',
          icon: 'reset',
          accent: 0x5ee0a0,
          run: () => {
            for (const one of NAV_SWITCHES) this.setNavSwitch(one.id, true);
            this.refreshMenuLabels();
            this.context?.notify(switchSummary(this.navSwitches));
          },
        },
        ...rows,
      ],
    };
    this.menuLabels.push(() => {
      parent.sub = switchSummary(this.navSwitches);
      parent.accent = allSwitchesOn(this.navSwitches) ? 0xffc857 : 0xff5a5a;
    });
    return parent;
  }

  /**
   * **Eine Meldung an den, der zusieht.**
   *
   * Im Spiel ist das das Handgelenk (`ctx.notify`), in der laufenden Vorschau
   * die Zeile unter der Bühne der Werkzeugseite. Eine Welt, die etwas zu sagen
   * hat, soll nicht wissen müssen, wer gerade zuhört — und `this.context` ist
   * in der Vorschau `null`, also verschluckte ein `ctx?.notify` dort jede
   * Antwort auf jeden Knopfdruck.
   */
  protected announce(message: string): void {
    this.context?.notify(message);
    this.previewSink?.(message);
  }

  /**
   * Wann die Lebensbalken zu sehen sind — auch für die Vorschau der
   * Werkzeugseite, die kein Handgelenk-Menü hat.
   */
  protected setNpcBars(mode: BarMode): void {
    this.npcBars = mode;
    this.director?.setBars(mode);
  }

  protected npcBarMode(): BarMode {
    return this.npcBars;
  }

  /**
   * **Die Trefferzonen zeigen** — auch für die Vorschau der Werkzeugseite.
   *
   * Der Zustand steht in der Welt und nicht im Bestand: Wer sie einschaltet und
   * danach einen Zombie hinstellt, soll auch an dem einen Kasten sehen
   * (`NpcDirector.setHitView`).
   */
  protected setNpcHitView(on: boolean): void {
    this.npcHitView = on;
    this.director?.setHitView(on);
  }

  protected npcHitViewOn(): boolean {
    return this.npcHitView;
  }

  /** Welche Ebenen gerade an sind — eine Welt darf eigene Schalter dafür bauen. */
  protected navLayerState(): Readonly<NavLayerState> {
    return this.navLayers;
  }

  /** Was von der Navigation gerade gilt (`nav/navSwitches.ts`). */
  protected navSwitchState(): Readonly<NavSwitchState> {
    return this.navSwitches;
  }

  /**
   * **Das Gitter, mit dem die NPCs arbeiten** — oder gar keines.
   *
   * Der Schalter „Fläche" hängt hier und nicht im Graphen, denn er schaltet
   * nichts *am* Gitter ab, sondern das Gitter selbst: Ohne eines läuft jedes
   * Hirn stur auf den Spieler zu (`npcBrain.ts`, `waypoint: null`), und man
   * sieht in einem einzigen Bild, was die Wegsuche den ganzen Tag tut.
   */
  private navForAgents(): NavGraph | null {
    return this.navSwitches.surface ? this.nav : null;
  }

  /**
   * Legt einen der drei Schalter um und gibt zurück, ob er jetzt an ist.
   *
   * Zwei davon gehen an den Graphen (Hindernisse, Verbindungen), der dritte
   * bleibt hier (Fläche). Danach wird die Debug-Ansicht **neu gebaut** und
   * nicht bloß umgeschaltet: Eine Sperre, die nicht mehr zählt, ist keine
   * Sperre mehr und wird auch nicht mehr als eine gezeichnet.
   */
  protected setNavSwitch(id: NavSwitch, on: boolean): boolean {
    if (this.navSwitches[id] === on) return on;
    this.navSwitches[id] = on;
    if (id !== 'surface') this.nav?.setFeature(id, on);
    this.rebuildNavDebug();
    return on;
  }

  /** Wirft die Debug-Ansicht weg; das nächste `applyNav()` baut sie neu. */
  private rebuildNavDebug(): void {
    if (this.navDebug) {
      this.root.remove(this.navDebug);
      disposeTree(this.navDebug);
      this.navDebug = null;
    }
    this.clearNavTracks();
    this.applyNav();
  }

  /** Schaltet eine Ebene und gibt zurück, ob sie jetzt an ist. */
  protected setNavLayer(layer: NavLayer, on: boolean): boolean {
    if (this.navLayers[layer] === on) return on;
    this.navLayers[layer] = on;
    this.applyNav();
    return on;
  }

  protected setNavLayers(state: NavLayerState): void {
    this.navLayers = { ...state };
    this.applyNav();
  }

  /**
   * Zieht den Zustand der Ebenen an der Ansicht nach.
   *
   * Gebaut wird das Gitter erst, wenn wirklich etwas davon zu sehen sein soll —
   * und wieder abgeräumt, wenn nichts mehr an ist. Ein paar tausend Linien, die
   * unsichtbar mitgezeichnet werden, kosten in der Brille genauso viel wie
   * sichtbare.
   */
  private applyNav(): void {
    // **Der Sichtbereich hängt nicht am Gitter**, sondern an den NPCs: Er wird
    // an ihre Modelle gebaut und dreht sich mit ihnen (`NpcBody.setSight`).
    // Deshalb wird er hier zuerst und getrennt geschaltet — sonst wäre er weg,
    // sobald jemand die Kacheln ausmacht.
    this.director?.setSight(this.navLayers.sight, layerSpec('sight').color);

    const wanted = anyLayer(this.navLayers);
    if (!wanted) {
      if (this.navDebug) {
        this.root.remove(this.navDebug);
        disposeTree(this.navDebug);
        this.navDebug = null;
      }
      this.clearNavTracks();
      return;
    }
    if (!this.nav) return;
    if (!this.navDebug) {
      this.navDebug = navDebugView(this.nav);
      this.root.add(this.navDebug);
      this.navTrackTimer = 0;
    }
    applyNavLayers(this.navDebug, this.navLayers);
    if (!this.navLayers.paths) this.clearNavTracks();
  }

  /**
   * Die gelaufenen Wege, solange ihre Ebene an ist.
   *
   * **Fünfmal je Sekunde und nicht sechzigmal**: Ein Weg ändert sich, wenn neu
   * geplant wird, und das ist alle halbe Sekunde. Jedes Bild eine neue
   * Liniengeometrie zu bauen wäre die teuerste Art, dasselbe zu zeigen.
   */
  private updateNavTracks(dt: number): void {
    if (!this.navLayers.paths || !this.nav || !this.director) return;

    this.navTrackTimer -= dt;
    if (this.navTrackTimer > 0) return;
    this.navTrackTimer = 0.2;

    this.clearNavTracks();
    const paths = this.director.paths();
    // **Und der eigene Weg dazu.** Bis hierher zeigte diese Ebene nur, was die
    // *anderen* laufen — wer von oben seine Figur losschickt, sah beim
    // Einschalten in einem leeren Labor gar nichts. Er bekommt eine eigene
    // Farbe, denn er beantwortet eine andere Frage: nicht „wie kommen sie zu
    // mir", sondern „wie komme ich dorthin".
    const mine = this.ghostWalk?.points ?? [];
    if (paths.length === 0 && mine.length === 0) return;
    const group = new THREE.Group();
    group.name = 'nav-tracks';
    for (const path of paths) group.add(navPathView(this.nav, path));
    if (mine.length > 0) group.add(navPathView(this.nav, mine, GHOST_PATH_COLOR));
    this.root.add(group);
    this.navTracks = group;
  }

  private clearNavTracks(): void {
    if (!this.navTracks) return;
    this.root.remove(this.navTracks);
    disposeTree(this.navTracks);
    this.navTracks = null;
  }

  private npcMenu(): MenuEntry {
    const ctx = (): WorldContext => this.context!;
    const brainRow: MenuEntry = {
      id: 'npc:brain',
      label: `Hirn: ${brainLabel(npcSettings().brain)}`,
      sub: 'Gilt für alles, was hier gesetzt wird',
      icon: 'brain',
      accent: 0xe58aa8,
      children: BRAINS.map((brain) => ({
        id: `npc:brain:${brain.id}`,
        label: brain.label,
        sub: brain.sub,
        icon: brain.icon,
        accent: brain.accent,
        run: () => {
          saveNpcSettings(withBrain(npcSettings(), brain.id));
          this.refreshMenuLabels();
          ctx().notify(`Hirn: ${brain.label}`);
        },
      })),
    };
    this.menuLabels.push(() => {
      brainRow.label = `Hirn: ${brainLabel(npcSettings().brain)}`;
    });

    /**
     * **Die Lebensbalken** — eine Zeile mit drei Stellungen.
     *
     * Sie steht hier und nicht bei den Debug-Ebenen der Navigation, obwohl
     * beides „etwas sichtbar machen" ist: Ein Balken ist keine Hilfslinie,
     * sondern gehört zu dem, der ihn trägt. Wer wissen will, ob seine Pistole
     * wirklich fünfundzwanzig abzieht, stellt hier auf *immer*.
     */
    const barsLabel = (): string =>
      NPC_BAR_MODES.find((mode) => mode.id === (this.director?.bars ?? 'hurt'))?.label ?? 'aus';
    const barsRow: MenuEntry = {
      id: 'npc:bars',
      label: `Lebensbalken: ${barsLabel()}`,
      sub: 'Wann der Balken über einem NPC zu sehen ist',
      icon: 'npc',
      accent: 0x5ee0a0,
      children: NPC_BAR_MODES.map((mode) => ({
        id: `npc:bars:${mode.id}`,
        label: mode.label,
        sub: mode.sub,
        icon: 'npc',
        accent: 0x5ee0a0,
        run: () => {
          this.setNpcBars(mode.id);
          this.refreshMenuLabels();
          ctx().notify(`Lebensbalken: ${mode.label}`);
        },
      })),
    };
    this.menuLabels.push(() => {
      barsRow.label = `Lebensbalken: ${barsLabel()}`;
    });

    /**
     * **Die Trefferzonen** — an oder aus, mehr gibt es dazu nicht.
     *
     * Sie beantwortet genau eine Frage, und zwar die, die man in der Brille
     * stellt, wenn ein Schuss nichts bewirkt: *Wo ist er denn nun?* Zu sehen
     * ist der Kasten, gegen den wirklich gerechnet wird (`npc/npcHit.ts`) —
     * Kopf rot, Rumpf und Beine blau —, und nicht eine zweite Zeichnung
     * daneben, die morgen etwas anderes zeigt.
     */
    const hitsRow: MenuEntry = {
      id: 'npc:hits',
      label: 'Trefferzonen zeigen',
      sub: 'Kopf und Körper als Drahtgitter — genau so wird gerechnet',
      icon: 'npc',
      accent: 0xff3b2f,
      checked: this.npcHitView,
      run: () => {
        this.setNpcHitView(!this.npcHitView);
        hitsRow.checked = this.npcHitView;
        ctx().notify(this.npcHitView ? 'Trefferzonen an' : 'Trefferzonen aus');
      },
    };
    this.menuLabels.push(() => {
      hitsRow.checked = this.npcHitView;
    });

    return {
      id: 'npc',
      label: 'NPC',
      sub: 'Haut und Hirn — wer hier herumläuft',
      icon: 'npc',
      accent: 0x7fbf5a,
      children: [
        ...NPC_SKINS.map((skin) => ({
          id: `npc:place:${skin.id}`,
          label: `${skin.label} setzen`,
          sub: skin.sub,
          icon: skin.icon,
          accent: skin.accent,
          run: () => this.placeNpc(ctx(), skin.id),
        })),
        this.npcShelfMenu(ctx),
        brainRow,
        barsRow,
        hitsRow,
        this.characterMenu(ctx),
        this.navMenu(),
        this.navSwitchMenu(),
        {
          id: 'npc:spawn',
          label: 'Am Spawnpunkt setzen',
          sub: 'Würfelt einen der gesetzten Punkte aus',
          icon: 'npc',
          accent: 0x5ee0a0,
          run: () => {
            const settings = npcSettings();
            const placed = this.director?.placeAtSpawn({
              kind: settings.kind,
              brain: settings.brain,
              speed: settings.speed,
              health: settings.health,
            });
            ctx().notify(placed ? npcSkin(settings.kind).label : 'Kein Spawnpunkt da');
          },
        },
        {
          id: 'npc:point',
          label: 'Spawnpunkt hier',
          sub: 'Setzt einen dorthin, wo du stehst',
          icon: 'teleport',
          accent: 0x5ee0a0,
          run: () => {
            const at = this.playerFeet(_point);
            if (!at || !this.director) return;
            ctx().notify(`Spawnpunkt ${this.director.addPoint(at)}`);
          },
        },
        {
          id: 'npc:cage',
          label: 'Brutkäfig hier',
          sub: 'Legt von selbst nach, solange du in der Nähe bist',
          icon: 'spawn',
          accent: 0xffc857,
          run: () => {
            const at = this.playerFeet(_point);
            if (!at || !this.director) return;
            const settings = npcSettings();
            // Nicht auf die eigenen Füße: ein Käfig ist ein fester Körper, und
            // wer in einem steht, steckt fest.
            ctx().rig.getHeadForward(_direction);
            at.addScaledVector(_direction, 1.6);
            const count = this.director.addCage({
              kind: settings.kind,
              brain: settings.brain,
              at,
              speed: settings.speed,
              health: settings.health,
              interval: settings.interval,
              max: settings.max,
            });
            ctx().notify(`Brutkäfig ${count} · ${npcSkin(settings.kind).label}`);
          },
        },
        {
          id: 'npc:clear',
          label: 'Alles wegräumen',
          sub: 'NPCs, Käfige und Spawnpunkte',
          icon: 'reset',
          accent: COLOR_RED,
          run: () => {
            const count = this.director?.clear() ?? 0;
            ctx().notify(count ? `${count} weggeräumt` : 'Da war nichts');
          },
        },
      ],
    };
  }

  // --- Charakter: übernehmen, vormachen, nachspielen ------------------------

  /**
   * **Die Seite „Charakter"** im NPC-Menü — vier Zeilen und eine Liste.
   *
   * Übernehmen, Aufnehmen, Abspielen und die gespeicherten Charaktere. Die
   * Beschriftungen tragen den Stand (`Loslassen`, `Aufnahme stoppen · 0:12`)
   * und werden über `menuLabels` nachgezogen, wie die Zeilen daneben; solange
   * eine Aufnahme oder ein Abspielen läuft, einmal je Sekunde
   * (`updatePuppeteer`), damit die Uhr darin läuft.
   */
  private characterMenu(ctx: () => WorldContext): MenuEntry {
    const puppeteer = (): Puppeteer | null => this.puppeteer;
    const characterLabel = (): string => puppeteer()?.character?.skin.label ?? 'NPC';

    const possessRow: MenuEntry = {
      id: 'npc:possess',
      label: 'Übernehmen',
      sub: 'Den NPC, den du anschaust — oder den nächsten. Er tut dann, was du tust',
      icon: 'npc',
      accent: 0x7fbf5a,
      run: () => this.takeOverNpc(ctx()),
    };
    const recordRow: MenuEntry = {
      id: 'npc:record',
      label: 'Aktion aufnehmen',
      sub: 'Was du dann vormachst, kann er nachspielen — etwa die Heizdecke abnehmen',
      icon: 'stopwatch',
      accent: COLOR_RED,
      run: () => this.toggleRecording(ctx()),
    };
    const playRow: MenuEntry = {
      id: 'npc:play',
      label: 'Aktion abspielen',
      sub: 'Erst aufnehmen oder einen Charakter laden',
      icon: 'zombie',
      accent: 0x5ee0a0,
      run: () => this.togglePlayback(ctx()),
    };
    this.menuLabels.push(() => {
      const p = puppeteer();
      const possessed = p?.state === 'possessed';
      possessRow.label = possessed ? `${characterLabel()} loslassen` : 'Übernehmen';
      possessRow.sub = possessed
        ? 'Er bleibt stehen, wo du gerade bist, und denkt wieder selbst'
        : 'Den NPC, den du anschaust — oder den nächsten. Er tut dann, was du tust';
      recordRow.label = p?.recording
        ? `Aufnahme stoppen · ${formatDuration(p.recordElapsed)}`
        : 'Aktion aufnehmen';
      const action = p?.action ?? null;
      playRow.label = p?.state === 'playing' ? 'Abspielen stoppen' : 'Aktion abspielen';
      playRow.sub =
        p?.state === 'playing'
          ? `${characterLabel()} · ${formatDuration(p.playClock)} von ${formatDuration(action?.duration ?? 0)}`
          : action
            ? `${characterLabel()} · ${formatDuration(action.duration)} · ${action.props.length} Ding${action.props.length === 1 ? '' : 'e'}`
            : 'Erst aufnehmen oder einen Charakter laden';
    });

    const page: MenuEntry = {
      id: 'npc:character',
      label: 'Charakter',
      sub: 'Übernehmen, vormachen, nachspielen lassen',
      icon: 'npc',
      accent: 0xe58aa8,
      children: [possessRow, recordRow, playRow, this.charactersMenu(ctx)],
    };
    this.menuLabels.push(() => {
      const p = puppeteer();
      page.sub =
        p?.state === 'possessed'
          ? p.recording
            ? `${characterLabel()} übernommen · Aufnahme läuft`
            : `${characterLabel()} übernommen`
          : p?.state === 'playing'
            ? `${characterLabel()} spielt`
            : 'Übernehmen, vormachen, nachspielen lassen';
    });
    return page;
  }

  /** Die gespeicherten Charaktere, die neuesten zuerst — je einer eine Seite. */
  private charactersMenu(ctx: () => WorldContext): MenuEntry {
    const saved = listCharacters();
    const children: MenuEntry[] = saved.map((character) => {
      const skin = npcSkin(character.kind);
      const when = new Date(character.created);
      const day = Number.isNaN(when.getTime())
        ? ''
        : ` · ${when.getDate().toString().padStart(2, '0')}.${(when.getMonth() + 1).toString().padStart(2, '0')}.`;
      return {
        id: `npc:character:${character.id}`,
        label: character.name,
        sub: `${skin.label} · ${formatDuration(character.recording.duration)}${day}`,
        icon: skin.icon,
        accent: skin.accent,
        children: [
          {
            id: `npc:character:${character.id}:place`,
            label: 'Hinstellen',
            sub: 'Dort, wo seine Aufnahme beginnt — abspielen dann über „Charakter"',
            icon: skin.icon,
            accent: skin.accent,
            run: () => this.loadCharacter(ctx(), character, false),
          },
          {
            id: `npc:character:${character.id}:play`,
            label: 'Hinstellen und abspielen',
            sub: 'Er steht auf und macht es gleich vor',
            icon: 'zombie',
            accent: 0x5ee0a0,
            run: () => this.loadCharacter(ctx(), character, true),
          },
          {
            id: `npc:character:${character.id}:delete`,
            label: 'Löschen',
            sub: 'Aus dem Speicher des Browsers',
            icon: 'reset',
            accent: COLOR_RED,
            run: () => {
              ctx().notify(
                deleteCharacter(character.id) ? `${character.name} gelöscht` : 'War schon weg',
              );
            },
          },
        ],
      };
    });
    if (children.length === 0) {
      children.push({
        id: 'npc:characters:none',
        label: 'Noch keiner gespeichert',
        sub: 'Übernehmen → Aktion aufnehmen → vormachen → stoppen. Dann steht er hier',
        icon: 'npc',
        accent: 0x8a94a6,
      });
    }
    return {
      id: 'npc:characters',
      label: 'Charaktere laden',
      sub: saved.length
        ? `${saved.length} gespeichert${saved.length === 1 ? '' : 'e'}`
        : 'Noch keiner gespeichert',
      icon: 'folder',
      accent: 0xffc857,
      children,
    };
  }

  /**
   * **Übernehmen** — oder loslassen, wenn schon einer an den Fäden hängt.
   *
   * Genommen wird, wen man anschaut; sonst der nächste im Umkreis von acht
   * Metern. Der Spieler wird zu ihm gestellt und nicht er zum Spieler: Ein
   * NPC, der vor der Puppe mit der Heizdecke steht, soll dort bleiben.
   */
  private takeOverNpc(ctx: WorldContext): void {
    const puppeteer = this.puppeteer;
    const director = this.director;
    if (!puppeteer || !director) return;
    if (puppeteer.state === 'possessed') {
      const npc = puppeteer.release();
      ctx.notify(npc ? `${npc.skin.label} losgelassen` : 'Losgelassen');
      this.refreshMenuLabels();
      return;
    }
    if (puppeteer.state === 'playing') puppeteer.stopPlaying();
    this.headRay(ctx, _ray);
    const npc =
      director.pickAlong(_ray.origin, _ray.direction) ??
      (this.playerFeet(_point) ? director.nearest(_point, TAKEOVER_RANGE) : null);
    if (!npc) {
      ctx.notify('Kein NPC in der Nähe — erst einen setzen');
      return;
    }
    npc.feet(_point);
    const yaw = npc.heading;
    if (!puppeteer.possess(npc)) {
      ctx.notify(`${npc.skin.label} lässt sich nicht übernehmen`);
      return;
    }
    this.movePlayerTo(ctx, _point, yaw);
    ctx.notify(`${npc.skin.label} übernommen — du bist jetzt er`);
    this.refreshMenuLabels();
  }

  /**
   * **Aufnahme an oder aus.** Ohne übernommenen NPC wird erst einer
   * übernommen — wer „aufnehmen" sagt, meint nicht „erst einmal übernehmen".
   * Am Ende wird die Aufnahme gleich als Charakter gespeichert: Ein Name
   * kommt von selbst (`characterStore.nextCharacterName`), und eine Aufnahme,
   * die nur im Speicher dieser Sitzung liegt, ist nach dem Neuladen weg.
   */
  private toggleRecording(ctx: WorldContext): void {
    const puppeteer = this.puppeteer;
    if (!puppeteer) return;
    if (puppeteer.recording) {
      const recording = puppeteer.stopRecording();
      if (!recording) {
        ctx.notify('Die Aufnahme war leer');
      } else {
        const saved = saveCharacter({ kind: recording.kind, recording });
        const length = formatDuration(recording.duration);
        ctx.notify(
          saved
            ? `Aufnahme ${length} · gespeichert als „${saved.name}"`
            : `Aufnahme ${length} — im Browser ist kein Platz mehr dafür`,
        );
      }
      this.refreshMenuLabels();
      return;
    }
    // Zweimal gefragt und nicht einmal gemerkt: `takeOverNpc` ändert den
    // Stand, und der Typprüfer weiß das nicht.
    const possessed = (): boolean => puppeteer.state === 'possessed';
    if (!possessed()) {
      this.takeOverNpc(ctx);
      if (!possessed()) return;
    }
    if (!puppeteer.startRecording()) return;
    this.puppetTick = 0;
    ctx.notify('Aufnahme läuft — jetzt vormachen');
    this.refreshMenuLabels();
  }

  /** **Abspielen an oder aus.** Ein übernommener NPC wird dafür losgelassen. */
  private togglePlayback(ctx: WorldContext): void {
    const puppeteer = this.puppeteer;
    if (!puppeteer) return;
    if (puppeteer.state === 'playing') {
      puppeteer.stopPlaying();
      ctx.notify('Abspielen gestoppt');
      this.refreshMenuLabels();
      return;
    }
    const npc = puppeteer.character;
    if (!npc || !isPlayable(puppeteer.action)) {
      ctx.notify('Keine Aktion — erst aufnehmen oder einen Charakter laden');
      return;
    }
    if (!puppeteer.play()) {
      ctx.notify(`${npc.skin.label} kann gerade nicht spielen`);
      return;
    }
    this.puppetTick = 0;
    ctx.notify(`${npc.skin.label} spielt · ${formatDuration(puppeteer.action!.duration)}`);
    this.refreshMenuLabels();
  }

  /**
   * **Ein gespeicherter Charakter kommt zurück**: seine Haut, dort, wo seine
   * Aufnahme beginnt, mit dem Hirn „Stehen" — er soll warten, bis man ihn
   * spielen lässt, und nicht weglaufen. Die Dinge seiner Aufnahme baut das
   * Abspielen nach, wenn sie fehlen (`Puppeteer.stageProps`).
   */
  private loadCharacter(ctx: WorldContext, character: SavedCharacter, playNow: boolean): void {
    const puppeteer = this.puppeteer;
    const director = this.director;
    if (!puppeteer || !director) return;
    const first = character.recording.frames[0];
    if (!first) {
      ctx.notify('Die Aufnahme ist leer');
      return;
    }
    _point.set(first.feet[0], first.feet[1] + 0.05, first.feet[2]);
    const npc = director.spawn({
      kind: character.kind,
      brain: 'idle',
      at: _point,
      yaw: first.yaw,
      health: npcSettings().health,
    });
    if (!npc) return;
    puppeteer.adopt(npc, character.recording);
    if (playNow && puppeteer.play()) {
      ctx.notify(`${character.name} spielt`);
    } else {
      ctx.notify(`${character.name} steht — Abspielen unter NPC → Charakter`);
    }
    ctx.menu.toggle(false);
    this.refreshMenuLabels();
  }

  /**
   * Was der Puppenspieler von der Welt braucht (`PuppetStage`): die Pose des
   * Spielers, die Dinge in seinen Händen, ein Ding nach seiner Id — und wie
   * ein NPC aussieht, während man ihn ist.
   */
  private puppetStage(physics: PhysicsWorld): PuppetStage {
    return {
      physics,
      playerPose: (out) => this.fillPlayerPose(out),
      heldProps: (out) => this.fillHeldProps(out),
      propById: (id) => {
        const entry = this.bodies.get(id);
        if (!entry || entry.removed) return null;
        return { entry, held: this.handHolding(entry) !== null };
      },
      spawnProp: (kind, position, quaternion) => {
        // Nur der Beutel baut sofort; ein Modell aus dem Regal müsste erst
        // geladen werden, und eine Aufnahme wartet nicht.
        if (modelPathOf(kind as PropKind) !== null || !(kind in PROP_LABELS)) return null;
        const id = this.sync?.nextId() ?? `local-${this.bodies.size}`;
        const entry = this.createProp(id, kind as BagKind, position, quaternion);
        this.sync?.spawned(id, kind as BagKind, poseOf(entry));
        return { id, entry };
      },
      onPossess: (npc) => this.wearNpc(npc, true),
      onRelease: (npc) => this.wearNpc(npc, false),
      notify: (message) => this.announce(message),
    };
  }

  /**
   * **Wie ein NPC aussieht, während man ihn ist**: wie die eigene Figur.
   *
   * Die steht auf `LAYER_SELF_ONLY` — das eigene Auge zeichnet sie nicht,
   * der Spiegel, das Portal und die Ansicht von oben schon. Ein übernommener
   * NPC bekommt dieselbe Ebene, und die Figur des Spielers verschwindet
   * solange: Im Spiegel steht dann die Übungspuppe, wo sonst der Koch steht.
   * Ein Kopf aus Klötzen vor der eigenen Kamera wäre die Alternative.
   */
  private wearNpc(npc: Npc, on: boolean): void {
    npc.model.traverse((object) => object.layers.set(on ? LAYER_SELF_ONLY : 0));
    const ctx = this.context;
    if (ctx) ctx.avatar.visible = !on;
  }

  /** Füße, Gierwinkel, Kopf und Hände des Spielers in der Welt — für die Fäden. */
  private fillPlayerPose(out: StagePose): boolean {
    const ctx = this.context;
    if (!ctx || !this.playerFeet(out.feet)) return false;
    ctx.rig.getHeadForward(_direction);
    out.yaw = yawOfForward(_direction.x, _direction.z);
    ctx.rig.getHeadMatrix(_puppetHead);
    out.head.position.setFromMatrixPosition(_puppetHead);
    out.head.quaternion.setFromRotationMatrix(_puppetHead);
    const presenting = ctx.renderer.xr.isPresenting;
    for (const side of ['left', 'right'] as const) {
      const controller = presenting ? ctx.input.get(side) : null;
      const hand = side === 'left' ? out.left : out.right;
      let tracked = Boolean(controller?.tracked);
      if (controller && tracked) {
        const anchor = gripOf(controller);
        anchor.updateWorldMatrix(true, false);
        anchor.getWorldPosition(hand.position);
        anchor.getWorldQuaternion(hand.quaternion);
      } else if (side === 'right' && !presenting && this.screenHand) {
        // Am Schirm trägt die Bildschirmhand, was aus dem Beutel kommt — sie
        // ist die rechte, und sie zählt nur, solange etwas darin liegt.
        const carrying = this.screenCarrySide();
        if (carrying && this.grabs.has(carrying)) {
          const carry = this.screenHand.carry;
          carry.updateWorldMatrix(true, false);
          carry.getWorldPosition(hand.position);
          carry.getWorldQuaternion(hand.quaternion);
          tracked = true;
        }
      }
      if (side === 'left') out.leftTracked = tracked;
      else out.rightTracked = tracked;
    }
    return true;
  }

  /** Was gerade in den Händen liegt — mit Id und Sorte, damit es in die Aufnahme kann. */
  private fillHeldProps(out: StageProp[]): StageProp[] {
    out.length = 0;
    for (const grab of this.grabs.values()) {
      const id = this.idOf(grab.entry);
      const kind = (grab.entry.object.userData as { propKind?: PropKind }).propKind;
      if (!id || !kind) continue;
      out.push({ id, kind, entry: grab.entry });
    }
    return out;
  }

  /** Ein Bild Puppenspiel — und einmal je Sekunde die Uhr in den Menüzeilen. */
  private updatePuppeteer(dt: number, ctx: WorldContext): void {
    const puppeteer = this.puppeteer;
    if (!puppeteer) return;
    const busy = puppeteer.recording || puppeteer.state === 'playing';
    if (puppeteer.update(dt * this.timeScale, this.time)) {
      ctx.notify('Aktion zu Ende');
      this.refreshMenuLabels();
      return;
    }
    if (!busy) return;
    this.puppetTick += dt;
    if (this.puppetTick < 1) return;
    this.puppetTick = 0;
    this.refreshMenuLabels();
  }

  /**
   * Einer aus dem Menü: er entsteht ein paar Schritte vor dem Spieler und
   * schaut ihn an. Die Haut kommt aus der Zeile, das Hirn und die Zahlen aus
   * derselben Einstellung, die auch das Hirn-Werkzeug bedient.
   */
  private placeNpc(ctx: WorldContext, kind: NpcKind): void {
    const at = this.playerFeet(_point);
    if (!at || !this.director) return;
    ctx.rig.getHeadForward(_direction);
    at.addScaledVector(_direction, 2.4);
    const settings = saveNpcSettings(withKind(npcSettings(), kind));
    const placed = this.director.place({
      kind,
      brain: settings.brain,
      at,
      speed: settings.speed,
      health: settings.health,
    });
    if (placed) ctx.notify(`${npcSkin(kind).label} · ${brainLabel(settings.brain)}`);
  }

  /**
   * *Menü → NPC → **Figur aus dem Regal*** — die Schublade _Figuren_ des
   * Katalogs, und was man dort antippt, steht gleich darauf im Raum und läuft
   * los.
   *
   * Dieselbe Seite wie im Regal und mit Absicht kein zweiter Katalog: dieselben
   * Kacheln mit dem Modell darin (dieselbe Id `kaykit:<pfad>`, also dieselbe
   * Vorschau-Fabrik, `menuModel`), dieselben zwei Spalten, dieselben Fächer in
   * der Brille (`kaykitSheets`). Nur das, was beim Aussuchen passiert, ist ein
   * anderes: nicht „in die Hand", sondern „hinstellen".
   *
   * Der Index kommt wie überall erst beim Aufmachen (`openShelf`), und bis
   * dahin steht dort dasselbe, was auch im Regal stünde.
   */
  private npcShelfMenu(ctx: () => WorldContext): MenuEntry {
    return {
      id: 'npc:shelf',
      label: 'Figur aus dem Regal',
      sub: 'Ritter, Skelette, Roboter — jede als NPC',
      icon: 'npc',
      accent: KAYKIT_ACCENT,
      grid: true,
      cols: SHELF_COLS,
      full: true,
      take: false,
      onOpen: () => this.openShelf(),
      children: this.npcShelfEntries(ctx),
    };
  }

  /** Die Kacheln dazu — oder das, was statt ihrer dasteht. */
  private npcShelfEntries(ctx: () => WorldContext): MenuEntry[] {
    if (this.shelf === undefined) {
      return [
        {
          id: 'npc:shelf:loading',
          label: 'Lädt …',
          sub: 'Das Verzeichnis der Sammlung',
          icon: 'folder',
          accent: 0x6f7d99,
        },
      ];
    }
    // **Die Schublade und nicht der ganze Baum**: Eine Kiste als NPC ist keine
    // Figur, sondern eine Kiste, die einem hinterherläuft. Welche Datei eine
    // Figur ist, hat der Katalog längst entschieden
    // (`core/kaykitIndex.KAYKIT_CATEGORIES`, `figures`) — und das ist genau
    // die Frage, die eine Schublade beantwortet.
    const figures = this.shelfFiles.filter((file) => file.cats.includes('figures'));
    if (figures.length === 0) {
      return [
        {
          id: 'npc:shelf:empty',
          label: 'Keine Figuren',
          sub: 'Die Schublade „Figuren" ist leer',
          icon: 'folder',
          accent: 0x6f7d99,
        },
      ];
    }
    const sheets = kaykitSheets(figures, 'npc', (file) => ({
      id: `kaykit:${file.path}`,
      label: file.label,
      sub: 'Figur aus dem Regal',
      accent: KAYKIT_ACCENT,
      // Die Vorschau **ist** die Id: dieselbe Kachel mit demselben Modell wie
      // im Regal, ohne dass irgendjemand etwas übersetzen müsste.
      preview: `kaykit:${file.path}`,
      full: true,
      run: () => this.placeNpc(ctx(), shelfKind(file.path)),
    }));
    // Genommen wird hier nichts. Die Fächer des Regals bringen ihr `take` mit,
    // weil man dort Modelle greift; ein NPC wandert aber nicht in die Hand,
    // sondern auf den Boden — und dafür ist der Trigger der richtige Knopf.
    for (const sheet of sheets) sheet.take = false;
    return sheets;
  }

  /**
   * How many portal views are drawn into one another — one tap per notch.
   *
   * It sits in the settings rather than in a constant because it is the one
   * knob that trades looks against frame rate: every level is another pass
   * over the whole room, per portal and per eye. Two is what ships; a headset
   * that starts to stutter goes back to one, a PC can afford four.
   */
  /**
   * *Einstellungen → Greifen*: wie weit die Hand reicht, und was am Ende der
   * Reichweite passiert.
   *
   * Die Zahlen stehen in `core/grabSettings.ts` mit Bereich und Rasten. Eine
   * Zeile klickt zur nächsten Raste weiter und zeigt dabei, wo sie steht;
   * *Werte eingeben* öffnet für dieselbe Größe die Tastatur, und alles
   * dazwischen ist erlaubt, solange es im Bereich liegt.
   */
  private grabMenu(toggle: (entry: MenuEntry, value: boolean, message: string) => void): MenuEntry {
    const accent = 0x4aa8ff;
    const nearOn: MenuEntry = {
      id: 'setting:grab-near',
      label: 'Nahgreifen',
      sub: 'Fassen, ohne dass etwas fliegt — der Dominostein bleibt liegen',
      icon: 'settings',
      accent,
      checked: this.grabConfig.near,
      run: () => {
        const on = !this.grabConfig.near;
        this.applyGrabSettings(saveGrabSettings({ near: on }));
        toggle(nearOn, on, on ? 'Nahgreifen an' : 'Nahgreifen aus');
      },
    };
    const ghostOn: MenuEntry = {
      id: 'setting:grab-ghost',
      label: 'Geisterhand',
      sub: 'Deine Hand als Geist dort, wo du anfasst',
      icon: 'glove',
      accent,
      checked: this.grabConfig.ghost,
      run: () => {
        const on = !this.grabConfig.ghost;
        this.applyGrabSettings(saveGrabSettings({ ghost: on }));
        toggle(ghostOn, on, on ? 'Geisterhand an' : 'Geisterhand aus');
      },
    };
    const remoteOn: MenuEntry = {
      id: 'setting:grab-remote',
      label: 'Ferngreifen',
      sub: 'Zielen, greifen, Hand zum Körper zucken — es kommt geflogen',
      icon: 'settings',
      accent,
      checked: this.grabConfig.remote,
      run: () => {
        const on = !this.grabConfig.remote;
        this.applyGrabSettings(saveGrabSettings({ remote: on }));
        toggle(remoteOn, on, on ? 'Ferngreifen an' : 'Ferngreifen aus');
      },
    };
    const ropeOn: MenuEntry = {
      id: 'setting:grab-rope',
      label: 'Strahl beim Ferngreifen',
      sub: 'Der dünne Strich zwischen Hand und Gegenstand, sobald es eingerastet ist',
      icon: 'settings',
      accent,
      checked: this.grabConfig.rope,
      run: () => {
        const on = !this.grabConfig.rope;
        this.applyGrabSettings(saveGrabSettings({ rope: on }));
        toggle(ropeOn, on, on ? 'Strahl an' : 'Strahl aus');
      },
    };

    /**
     * **Zwei Gegenstände in der Brille** — derselbe Schalter, den in der Küche
     * der zweite rote Knopf umlegt (`worlds/test/zones/kitchen.ts`).
     *
     * Er steht hier **auch**, und das ist kein zweiter Schalter: Beide
     * schreiben `GrabSettings.twoHands`, und beide Seiten ziehen über
     * `onGrabChange` nach. Ein Knopf in einer Zone erreicht nur, wer in dieser
     * Zone steht; eine Menüzeile erreicht jeden, der die Einstellung sucht, wo
     * alle anderen Greif-Einstellungen stehen.
     */
    const twoHandsOn: MenuEntry = {
      id: 'setting:grab-two-hands',
      label: 'Zwei Gegenstände',
      sub: 'In jeder Hand etwas tragen — und jede Hand hebt hervor, worauf sie zeigt',
      icon: 'glove',
      accent,
      checked: this.grabConfig.twoHands,
      run: () => {
        const on = !this.grabConfig.twoHands;
        this.applyGrabSettings(saveGrabSettings({ twoHands: on }));
        toggle(twoHandsOn, on, on ? 'Zwei Gegenstände an' : 'Zwei Gegenstände aus');
      },
    };

    const motion: MenuEntry = {
      id: 'setting:grab-motion',
      label: `Im Nahgriff: ${motionLabel(this.grabConfig.motion)}`,
      sub: 'Die Geisterhand führt eins zu eins — starr hat dafür einen Hebel',
      icon: 'settings',
      accent,
      run: () => {
        const next = nextGrabMotion(this.grabConfig.motion);
        this.applyGrabSettings(saveGrabSettings({ motion: next }));
        this.refreshMenuLabels();
        this.context?.notify(motionLabel(next));
      },
    };
    this.menuLabels.push(() => {
      motion.label = `Im Nahgriff: ${motionLabel(this.grabConfig.motion)}`;
    });

    const dial = (field: GrabField): MenuEntry => {
      const entry: MenuEntry = {
        id: `setting:grab-${field.key}`,
        label: `${field.label}: ${formatGrabField(field, this.grabConfig)}`,
        sub: field.sub,
        icon: 'settings',
        accent,
        run: () => {
          const next = nextGrabStep(field, this.grabConfig[field.key]);
          this.applyGrabSettings(saveGrabSettings({ [field.key]: next }));
          this.refreshMenuLabels();
          this.context?.notify(`${field.label}: ${formatGrabField(field, this.grabConfig)}`);
        },
      };
      this.menuLabels.push(() => {
        entry.label = `${field.label}: ${formatGrabField(field, this.grabConfig)}`;
      });
      return entry;
    };

    const typed = (field: GrabField): MenuEntry => ({
      id: `setting:grab-type-${field.key}`,
      label: field.label,
      // Getippt wird in der Einheit, in der die Zahl **steht** — beim Zugtempo
      // also in Zentimetern je Sekunde, auch wenn die Zeile darüber Meter je
      // Sekunde liest. Deshalb steht die Einheit im Hinweis.
      sub: `${field.min}–${field.max} ${field.unit}`,
      icon: 'settings',
      accent,
      run: () => {
        this.askNumber({
          title: field.label,
          sub: field.sub,
          hint: `${field.min}–${field.max} ${field.unit}`,
          value: String(Math.round(this.grabConfig[field.key])),
          commit: (value) => {
            this.applyGrabSettings(saveGrabSettings({ [field.key]: value }));
            this.context?.notify(`${field.label}: ${formatGrabField(field, this.grabConfig)}`);
          },
        });
      },
    });

    return {
      id: 'setting:grab',
      label: 'Greifen',
      sub: `Nah ${Math.round(this.grabConfig.radius)} cm · fern ${this.grabConfig.remote ? 'an' : 'aus'}`,
      icon: 'glove',
      accent,
      children: [
        twoHandsOn,
        nearOn,
        ...GRAB_FIELDS.map(dial),
        motion,
        ghostOn,
        remoteOn,
        ropeOn,
        {
          id: 'setting:grab-values',
          label: 'Werte eingeben',
          sub: 'Jede Zahl direkt tippen',
          icon: 'settings',
          accent,
          children: GRAB_FIELDS.map(typed),
        },
      ],
    };
  }

  /**
   * Neue Reichweiten übernehmen — und alles abräumen, was mit den alten noch
   * in der Luft steht. Wer das Ferngreifen abschaltet, während ein Gegenstand
   * eingerastet ist, hätte sonst ein Seil ohne Mechanik dahinter.
   */
  private applyGrabSettings(next: GrabSettings): void {
    this.grabConfig = next;
    if (!next.remote) this.clearLinks();
    if (!next.rope) for (const hand of this.ropes.keys()) this.hideRope(hand);
    if (!next.ghost) for (const hand of this.ghostHands.keys()) this.hideGhost(hand);
  }

  /**
   * **Der Spielmodus** — eine Zeile, und jeder Klick schaltet weiter:
   * _Spielen_, _Einrichten_, _Baukasten_ und wieder von vorn
   * (`core/gameMode.ts`).
   *
   * Gebaut wie die Portaltiefe darunter: Die Beschriftung sagt, was gilt, und
   * wird nach jedem Druck nachgezogen. Auch nach einem Druck **woanders** —
   * der rote Umbauknopf der Küche schaltet denselben Modus, und eine Zeile,
   * die danach noch _Spielen_ sagt, wäre die falsche Auskunft.
   */
  /**
   * **Interface** — wie man am Glas bedient. Bisher eine Zeile: Joystick oder
   * Steuerkreuz links unten (`graphicsSettings.movePad`, `FlatControls`).
   * Gewünscht: _„neben Joysticks ein Steuerkreuz als Alternative"_.
   */
  private interfaceMenu(): MenuEntry {
    const pad: MenuEntry = {
      id: 'setting:move-pad',
      label: '',
      icon: 'settings',
      accent: 0x4aa8ff,
      run: () => {
        const next = saveGraphics({ movePad: nextMovePad(graphics().movePad) });
        this.refreshMenuLabels();
        this.context?.notify(`Laufen am Schirm: ${MOVE_PAD_LABELS[next.movePad]}`);
      },
    };
    const paint = (): void => {
      const now = graphics().movePad;
      pad.label = `Laufen am Schirm: ${MOVE_PAD_LABELS[now]}`;
      pad.sub = MOVE_PAD_SUBS[now];
    };
    paint();
    this.menuLabels.push(paint);
    return {
      id: 'setting:interface',
      label: 'Interface',
      sub: 'Joystick oder Steuerkreuz',
      icon: 'settings',
      accent: 0x4aa8ff,
      children: [pad],
    };
  }

  private modeEntry(): MenuEntry {
    const entry: MenuEntry = {
      id: 'setting:game-mode',
      label: '',
      icon: 'hammer',
      accent: 0xffa94d,
      run: () => {
        const mode = setGameMode(nextGameMode(gameMode()));
        this.refreshMenuLabels();
        this.context?.notify(`Spielmodus: ${GAME_MODE_LABELS[mode]}`);
      },
    };
    const paint = (): void => {
      const mode = gameMode();
      entry.label = `Spielmodus: ${GAME_MODE_LABELS[mode]}`;
      entry.sub = GAME_MODE_HINTS[mode];
    };
    paint();
    this.menuLabels.push(paint);
    this.modeWatch ??= onGameMode(() => this.refreshMenuLabels());
    return entry;
  }

  /**
   * **Weltänderungen** — ein Häkchen, das mitschreibt, und zwei Knöpfe, die
   * die Liste hinaus- und wieder hereintragen (`core/worldChanges.ts`).
   *
   * Gewünscht war es als Weg, Änderungen weiterzugeben: einrichten, kopieren,
   * in den Chat einfügen. Was dort ankommt, ist eine Bilanz — welches Möbel
   * von wo nach wo, welches Modell wohin — und kein Protokoll jedes Griffs.
   *
   * _Einfügen_ liest zuerst die Zwischenablage. Wo der Browser das nicht
   * erlaubt (ohne `https`, in manchen Brillen), geht ein Textfeld auf, in das
   * man die Liste von Hand einfügt — dieselbe Antwort wie beim Konfig-Code.
   */
  private changesMenu(): MenuEntry {
    const accent = 0x5ee0a0;
    const track: MenuEntry = {
      id: 'changes:track',
      label: 'Änderungen aufzeichnen',
      icon: 'tape',
      accent,
      checked: trackingChanges(),
      run: () => {
        setTrackingChanges(!trackingChanges());
        this.refreshMenuLabels();
        this.context?.notify(
          trackingChanges() ? 'Änderungen werden aufgezeichnet' : 'Aufzeichnung angehalten',
        );
      },
    };
    const copy: MenuEntry = {
      id: 'changes:copy',
      label: 'Kopieren',
      icon: 'sign',
      accent,
      run: () => void this.copyChanges(),
    };
    const paste: MenuEntry = {
      id: 'changes:paste',
      label: 'Einfügen',
      sub: 'Eine kopierte Liste in dieser Welt nachstellen',
      icon: 'sign',
      accent,
      run: () => void this.pasteFromClipboard(),
    };
    const clear: MenuEntry = {
      id: 'changes:clear',
      label: 'Liste leeren',
      sub: 'Das Häkchen bleibt, wie es ist',
      icon: 'eraser',
      accent,
      run: () => {
        clearWorldChanges();
        this.refreshMenuLabels();
        this.context?.notify('Liste der Weltänderungen geleert');
      },
    };
    const menu: MenuEntry = {
      id: 'changes',
      label: 'Weltänderungen',
      icon: 'tape',
      accent,
      children: [track, copy, paste, clear, ...this.buildEntries(accent)],
    };
    const paint = (): void => {
      const on = trackingChanges();
      const count = worldChanges().length;
      track.checked = on;
      track.sub = on
        ? 'Möbel und Modelle werden mitgeschrieben'
        : 'Aus — es wird nichts mitgeschrieben';
      copy.sub = count
        ? `${count} Änderung(en) in die Zwischenablage`
        : 'Noch nichts aufgezeichnet';
      menu.sub = `${on ? 'Aufzeichnung an' : 'Aufzeichnung aus'} · ${count} Änderung(en)`;
    };
    paint();
    this.menuLabels.push(paint);
    this.changesWatch ??= onWorldChanges(() => this.refreshMenuLabels());
    return menu;
  }

  private async copyChanges(): Promise<void> {
    const list = worldChanges();
    if (!list.length) {
      this.context?.notify('Noch keine Änderungen aufgezeichnet');
      return;
    }
    const text = formatChanges(list);
    console.info('[bgvr] Weltänderungen:\n' + text);
    const copied = await copyText(text);
    this.context?.notify(copied ? `${list.length} Änderung(en) kopiert` : COPY_FALLBACK);
  }

  private async pasteFromClipboard(): Promise<void> {
    let text: string | null = null;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      text = null;
    }
    if (text && parseChanges(text)) {
      this.pasteChanges(text);
      return;
    }
    this.askLines({
      title: 'Weltänderungen einfügen',
      sub: 'Die kopierte Liste hier hinein',
      value: '',
      hint: 'Beginnt mit „Weltänderungen" oder mit [',
      commit: (typed) => this.pasteChanges(typed),
    });
  }

  /**
   * **Eine Liste nachstellen** — die Möbel über die Welt (`applyFurnitureChange`),
   * die Modelle hier.
   *
   * **Zwei Durchgänge** für die Möbel: Wer zwei Möbel die Plätze hat tauschen
   * lassen, bekommt im ersten Durchgang eine belegte Kachel, weil das andere
   * noch dasteht. Im zweiten ist sie frei.
   */
  private pasteChanges(text: string): void {
    const list = parseChanges(text);
    if (!list || !list.length) {
      this.context?.notify('Keine Weltänderungen im Text gefunden');
      return;
    }
    let open: FurnitureChange[] = list.filter(
      (change): change is FurnitureChange => change.kind === 'furniture',
    );
    let done = 0;
    for (let round = 0; round < 2 && open.length; round++) {
      const left: FurnitureChange[] = [];
      for (const change of open) {
        if (this.applyFurnitureChange(change)) done += 1;
        else left.push(change);
      }
      open = left;
    }
    const models = list.filter((change): change is ModelChange => change.kind === 'model');
    for (const change of models) void this.placeModelChange(change);
    const failed = open.length;
    this.context?.notify(
      `Eingefügt: ${done + models.length} von ${list.length}` +
        (failed ? ` · ${failed} Möbel nicht gefunden oder kein Platz` : ''),
    );
  }

  /**
   * **Ob diese Welt ein Möbel nach einer eingefügten Zeile umstellen kann.**
   *
   * Die Antwort hier ist `nein` — Möbel mit Kachel und Drehung hat nur die
   * Küche der Testwelt (`TestWorld`, `KitchenZone.applyChange`).
   */
  protected applyFurnitureChange(_change: FurnitureChange): boolean {
    return false;
  }

  /**
   * Ein Modell aus einer eingefügten Liste hinstellen — außer, genau dieses
   * steht dort schon: Dieselbe Liste zweimal einzufügen stellt nicht jedes
   * Fass doppelt hin.
   */
  private async placeModelChange(change: ModelChange): Promise<void> {
    const at = new THREE.Vector3(change.at.x, change.at.y, change.at.z);
    await this.placeModelAt(change.path, at, (change.yaw * Math.PI) / 180);
  }

  /**
   * **Ein Modell an eine feste Stelle setzen** — für eine eingefügte Liste
   * und für eine gezogene Fläche (`commitArea`). Steht genau dieses Modell
   * dort schon, passiert nichts: Dieselbe Liste zweimal einzufügen oder
   * dieselbe Fläche zweimal zu ziehen stellt nichts doppelt hin.
   *
   * @param yaw Drehung um die Hochachse, in Bogenmaß
   * @returns ob es hingestellt wurde
   */
  /**
   * **Ein Modell aus dem Regal als Teil der Welt aufstellen** — für eine
   * Welt, die mit Regalstücken gebaut ist (der Wandparcours der Testwelt,
   * `test/zones/wallLab.ts`). Es landet nicht in der Liste der Weltänderungen:
   * Es gehört der Welt und nicht dem, der gerade baut.
   */
  protected placeModel(path: string, at: THREE.Vector3, yaw: number): Promise<PhysicsBody | null> {
    return this.placeModelAt(path, at, yaw, false);
  }

  /**
   * @returns das hingestellte Stück — `null`, wenn keines kam (stand schon
   *   da, Modell fehlt, Welt inzwischen weg)
   */
  private async placeModelAt(
    path: string,
    at: THREE.Vector3,
    yaw: number,
    note = true,
    /** Fest an genau dieser Stelle, ohne Schwerkraft (`hang`) — was auf etwas steht. */
    fixed = false,
    /**
     * **Einrasten wie aus der Hand** (`snapPlaced`): an die Wand, auf den
     * Tisch, aufs Gitter — für den Beispielraum, dessen Liste nur sagt, **wo
     * ungefähr** etwas hinkommt, und nicht, wie hoch der Tisch darunter ist.
     */
    snap = false,
  ): Promise<PhysicsBody | null> {
    const physics = this.physics;
    if (!this.context || !physics) return null;
    const kind = modelKind(path);
    for (const body of this.bodies.values()) {
      if (body.carried || body.removed) continue;
      const has = (body.object.userData as { propKind?: PropKind }).propKind;
      if (has === kind && body.object.position.distanceTo(at) < 0.05) return null;
    }
    const model = kaykitModelNow(path) ?? (await kaykitModel(path));
    // An der Physik und nicht am Kontext — der ist jedes Bild ein neuer
    // (siehe `conjureModel`).
    if (!this.context || this.physics !== physics || !model) return null;
    const spin = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
    const id = this.sync?.nextId() ?? `local-${this.bodies.size}`;
    const entry = this.createModelProp(id, kind, model, at, spin);
    if (snap) {
      this.snapPlaced(entry, true, 0);
      if (!this.floorPieces.has(entry)) this.hang(entry);
    } else if (mountsOnWall(path)) {
      // **Ein Wandstück hängt, wo es gesetzt wird** (`hang`) — ein Bild ist
      // keine Wand und ersetzt keine, auch wenn es so dünn ist wie eine.
      this.hang(entry);
    } else {
      // **Eine Wand unter 45° kommt gekürzt** (`fitWall`) — aus einer Liste und
      // vom Pinsel genauso wie aus der Hand.
      const base = this.wallBase(entry);
      const pose = gridPose(at.x, at.z, spin, base.half, base.long);
      this.replaceWalls(entry, pose, note);
      this.fitWall(entry, pose);
      // Ein Bodenstück aus einer eingefügten Liste liegt genauso im Boden wie
      // eines, das gerade hingestellt wurde — sonst stiege es beim Einfügen um
      // seine halbe Dicke wieder heraus. Und was auf einem Tisch steht, steht
      // dort fest: Ein Körper, der auf einer fremden Platte erst zur Ruhe
      // kommen muss, stößt beim nächsten Stück daneben die Tasse herunter.
      if (!this.sinkFloor(entry) && fixed) this.hang(entry);
    }
    if (note) {
      this.sync?.spawned(id, kind, poseOf(entry));
      this.noteModel(entry, path);
      if (!this.replaying)
        this.pushBuild({ kind: 'add', item: { path, pose: this.buildPoseOf(entry) } });
    } else this.ownByWorld(entry);
    return entry;
  }

  /**
   * **Die Stücke der Welt als Bündel zeichnen** (`shared/modelBatch.ts`) —
   * aus den Augen, nicht von oben: Von oben wird je Stück durchsichtig
   * (`GridWorld.stepWallGhosts`, `modelGhost.ts`), und dafür muss jedes für
   * sich dastehen.
   *
   * Einzeln steht, was gerade jemand in der Hand hat, was unter einer Hand
   * aufleuchtet (`highlighted`), was fliegt und was gleich ersetzt wird
   * (`replaced`) — alles, was anders aussieht oder woanders ist als das Bündel.
   */
  private stepWorldBatch(dt: number, ctx: WorldContext): void {
    const items = this.worldBatchItems;
    items.length = 0;
    for (const entry of this.props)
      if (!entry.removed && this.worldOwned.has(entry)) items.push(entry);
    if (!items.length && !this.worldBatch) return;
    this.worldBatch ??= new ModelBatch(this.root);
    this.worldBatch.step(dt, !ctx.topDown, items, this.looseInBatch);
  }

  /** Ob ein Stück der Welt gerade einzeln stehen muss (`stepWorldBatch`). */
  private readonly looseInBatch = (item: BatchItem): boolean => {
    const entry = item as PhysicsBody;
    return (
      entry.carried ||
      this.highlighted.has(entry) ||
      this.flights.has(entry) ||
      this.replaced.has(entry)
    );
  };

  /**
   * **Ein Stück, das der Welt gehört** (`placeModel`) — fest und nur hier.
   *
   * Zwei Dinge, gemessen in Haunting (338 Wände aus dem Regal):
   *
   * - **Fest statt fallend.** Als Körper mit Schwerkraft standen die Wände
   *   dicht an dicht, berührten sich an jeder Ecke (`WALL_OVERLAP`) und
   *   schliefen deshalb nie ein — ein Schritt der Physik kostete 1,4 bis
   *   3,2 ms, und das in jedem Bild. Als feste Körper sind es 0,006 ms. Wer
   *   ein Stück im Baukasten aufnimmt, macht es wie bisher beweglich
   *   (`setBodyType` beim Greifen); nur das Aufgestellte steht.
   * - **Nicht über die Leitung.** Jedes Gerät stellt dieselben Stücke aus
   *   demselben Bauplan selbst auf. Angesagt (`spawn`) und im Schnappschuss
   *   des Gastgebers (`spawned`) mitgeschickt, baute jedes weitere Gerät sie
   *   auf allen anderen **noch einmal** auf — zu zweit standen 676 Wände da,
   *   zu dritt 1 014, jede doppelt gezeichnet und doppelt gerechnet. Und
   *   „Zurücksetzen" räumte sie als Beutelware weg (`clearSpawned`).
   */
  private ownByWorld(entry: PhysicsBody): void {
    const physics = this.physics;
    this.spawned.delete(entry);
    this.worldOwned.add(entry);
    if (!physics || entry.removed) return;
    entry.body.setBodyType(physics.rapier.RigidBodyType.Fixed, true);
  }

  /** Ein hingestelltes Modell in die Liste der Weltänderungen. */
  private noteModel(entry: PhysicsBody, path: string): void {
    let key = this.changeKeys.get(entry);
    if (!key) {
      key = changeKey('model');
      this.changeKeys.set(entry, key);
    }
    entry.object.getWorldPosition(_point);
    entry.object.getWorldQuaternion(_quaternion);
    _euler.setFromQuaternion(_quaternion, 'YXZ');
    recordModel(key, path, _point, (_euler.y * 180) / Math.PI);
  }

  private depthEntry(): MenuEntry {
    const label = (): string => {
      const depth = portalDepth();
      return `Portale in Portalen: ${depth}`;
    };
    const entry: MenuEntry = {
      id: 'setting:portal-depth',
      label: label(),
      sub: 'Wie tief sich die Sicht schachtelt · mehr kostet Bildrate',
      icon: 'portal',
      accent: COLOR_BLUE,
      run: () => {
        const depth = savePortalDepth(nextPortalDepth(portalDepth()));
        if (this.portalRenderer) this.portalRenderer.depth = depth;
        this.refreshMenuLabels();
        this.context?.notify(label());
      },
    };
    this.menuLabels.push(() => {
      entry.label = label();
    });
    return entry;
  }

  /**
   * Everything about the pistol, on one page.
   *
   * Each row steps its value to the next notch and shows the raw figure it is
   * at — "Stärke: stark · 0.14 kg". The notches are quick, but they are not
   * the whole range: *Werte eingeben* opens a keypad for any number the field
   * allows, and the aiming aids and the ammunition have pages of their own.
   */
  private weaponMenu(): MenuEntry {
    const pistol = this.tool('pistol') as PistolTool | null;
    if (!pistol) return { id: 'setting:pistol', label: 'Pistole', accent: 0xd7dce8 };
    const accent = 0xd7dce8;

    /** One stepping row: cycles on a tap, and can rewrite its own label. */
    const dial = (
      id: string,
      label: string,
      sub: string,
      value: () => string,
      step: () => void,
    ): MenuEntry => {
      const entry: MenuEntry = {
        id: `setting:pistol-${id}`,
        label: `${label}: ${value()}`,
        sub,
        icon: 'pistol',
        accent,
        run: () => {
          step();
          this.refreshMenuLabels();
          this.context?.notify(`${label}: ${value()}`);
        },
      };
      this.menuLabels.push(() => {
        entry.label = `${label}: ${value()}`;
      });
      return entry;
    };

    const weapon = (): WeaponSettings => pistol.weapon;

    return {
      id: 'setting:pistol',
      label: 'Pistole',
      sub: 'Werte, Zielhilfen, Munition',
      icon: 'pistol',
      accent,
      children: [
        dial(
          'power',
          'Stärke',
          'Masse der Kugel — wie hart sie zuschlägt',
          () => `${pistol.powerLabel} · ${weapon().mass} kg`,
          () => pistol.cyclePower(),
        ),
        dial(
          'damage',
          'Schaden',
          'Was ein Rumpftreffer abzieht — der Kopf das Vierfache',
          () => `${weapon().damage}`,
          () => pistol.cycleDamage(),
        ),
        dial(
          'speed',
          'Tempo',
          'Mündungsgeschwindigkeit',
          () => `${weapon().speed} m/s`,
          () => pistol.cycleSpeed(),
        ),
        dial(
          'rate',
          'Feuerrate',
          'Schuss pro Sekunde',
          () => `${weapon().rate}/s`,
          () => pistol.cycleRate(),
        ),
        dial(
          'magazine',
          'Magazin',
          'Wie viele Schuss hineingehen',
          () => `${weapon().magazine} Schuss`,
          () => pistol.cycleMagazine(),
        ),
        dial(
          'reload',
          'Nachladezeit',
          'Wie lange ein Magazinwechsel dauert',
          () => `${weapon().reload} s`,
          () => pistol.cycleReload(),
        ),
        dial(
          'burst',
          'Salve',
          'Wie viele Schuss der Dreifachschuss abgibt',
          () => `${weapon().burst} Schuss`,
          () => pistol.cycleBurst(),
        ),
        dial(
          'mode',
          'Modus',
          'Einzeln, Salve oder automatisch',
          () => pistol.modeLabel,
          () => pistol.cycleMode(),
        ),
        dial(
          'zoom',
          'Zoom',
          'Vergrößerung des Fernrohrs · 1× bis 40×',
          () => pistol.zoomLabel,
          () => pistol.cycleZoom(),
        ),
        this.weaponValuesMenu(pistol),
        this.sightMenu(pistol),
        this.ammoMenu(pistol),
        {
          id: 'setting:pistol-reload-now',
          label: 'Magazin wechseln',
          sub: 'Volles Magazin, sofort',
          icon: 'reset',
          accent,
          run: () => {
            pistol.reloadNow();
            this.context?.notify('Nachgeladen');
          },
        },
      ],
    };
  }

  /** Every raw number of the gun, each one behind a keypad. */
  private weaponValuesMenu(pistol: PistolTool): MenuEntry {
    const children = WEAPON_FIELDS.map((field) => {
      const entry: MenuEntry = {
        id: `setting:pistol-value-${field.key}`,
        label: `${field.label}: ${pistol.weapon[field.key]} ${field.unit}`.trim(),
        sub: `${field.sub} · ${field.min} bis ${field.max}`,
        icon: 'settings',
        accent: 0xd7dce8,
        run: () => {
          this.askNumber({
            title: field.label,
            sub: `Pistole · ${field.min} bis ${field.max} ${field.unit}`.trim(),
            value: String(pistol.weapon[field.key]),
            hint: field.sub,
            commit: (value) => {
              const applied = pistol.set({ [field.key]: value } as Partial<WeaponSettings>);
              this.context?.notify(`${field.label}: ${applied[field.key]} ${field.unit}`.trim());
            },
          });
        },
      };
      this.menuLabels.push(() => {
        entry.label = `${field.label}: ${pistol.weapon[field.key]} ${field.unit}`.trim();
      });
      return entry;
    });

    return {
      id: 'setting:pistol-values',
      label: 'Werte eingeben',
      sub: 'Jede Zahl direkt tippen',
      icon: 'settings',
      accent: 0xd7dce8,
      children,
    };
  }

  /**
   * The aiming aids, as a grid of icons. Pointing at a cell writes what it is
   * over the panel — five little pictures need a line of prose each.
   */
  private sightMenu(pistol: PistolTool): MenuEntry {
    const entry: MenuEntry = {
      id: 'setting:pistol-sight',
      label: `Zielhilfen: ${pistol.sightsLabel}`,
      sub: 'Mehrere gleichzeitig · Alles ab räumt die Schiene',
      icon: 'reddot',
      accent: 0xd7dce8,
      grid: true,
      // A grid is normally something you *take* into a hand; this one is a
      // choice, so the trigger picks it like any other row.
      take: false,
      children: SIGHTS.map((sight) => ({
        id: `sight:${sight.id}`,
        label: sight.label,
        caption: sight.caption,
        icon: SIGHT_ICONS[sight.id],
        accent: 0xd7dce8,
        run: () => {
          const mounted = pistol.toggleSight(sight.id);
          this.markSights(entry, mounted);
          this.refreshMenuLabels();
          this.context?.notify(
            sight.id === 'none'
              ? 'Schiene frei'
              : `${sight.label}: ${mounted.includes(sight.id) ? 'dran' : 'ab'}`,
          );
        },
      })),
    };
    this.markSights(entry, pistol.weapon.sights);
    this.menuLabels.push(() => {
      entry.label = `Zielhilfen: ${pistol.sightsLabel}`;
      this.markSights(entry, pistol.weapon.sights);
    });
    return entry;
  }

  /** Ticks the cells of the aids that are actually on the gun. */
  private markSights(entry: MenuEntry, mounted: readonly SightKind[]): void {
    for (const child of entry.children ?? []) {
      const id = child.id.slice('sight:'.length) as SightKind;
      child.selected = id === 'none' ? mounted.length === 0 : mounted.includes(id);
      child.accent = child.selected ? 0x5ee0a0 : 0xd7dce8;
    }
  }

  /** Normal rounds or tracer. */
  private ammoMenu(pistol: PistolTool): MenuEntry {
    const entry: MenuEntry = {
      id: 'setting:pistol-ammo',
      label: `Munition: ${pistol.ammoLabel}`,
      sub: 'Normal oder Leuchtspur',
      icon: 'pistol',
      accent: 0xd7dce8,
      children: AMMO_KINDS.map((kind) => ({
        id: `ammo:${kind}`,
        label: AMMO_LABELS[kind],
        sub:
          kind === 'tracer'
            ? 'Glüht und zieht eine Spur durch den Raum'
            : 'Schlichtes Blei, keine Spur',
        icon: 'pistol',
        accent: 0xd7dce8,
        selected: pistol.weapon.ammo === kind,
        run: () => {
          pistol.set({ ammo: kind });
          for (const child of entry.children ?? []) {
            child.selected = child.id === `ammo:${kind}`;
          }
          this.refreshMenuLabels();
          this.context?.notify(`Munition: ${AMMO_LABELS[kind]}`);
        },
      })),
    };
    this.menuLabels.push(() => {
      entry.label = `Munition: ${pistol.ammoLabel}`;
    });
    return entry;
  }

  // --- the Superman glove ---------------------------------------------------

  /**
   * Wie schnell der Handschuh fliegt und wer welche Achse bedient.
   *
   * Jede Zeile schaltet auf die nächste Raste weiter und zeigt die rohe Zahl
   * daneben — genau wie bei der Pistole —, und unter *Werte eingeben* lässt
   * sich jede davon tippen. Die drei Achsen darunter gehen die Runde Hand →
   * Kopf → beide → aus; was das jeweils heißt, steht in `supermanFlight.ts`.
   */
  private supermanMenu(): MenuEntry {
    const accent = 0xff4d5e;
    const read = (): SupermanSettings => supermanSettings();

    const dial = (field: SupermanField): MenuEntry => {
      const label = (): string => `${field.label}: ${supermanFieldLabel(field, read()[field.key])}`;
      const entry: MenuEntry = {
        id: `setting:superman-${field.key}`,
        label: label(),
        sub: `${field.sub} · ${field.min} bis ${field.max} ${field.unit}`.trim(),
        icon: 'superman',
        accent,
        run: () => {
          saveSupermanSettings({
            [field.key]: nextSupermanStep(field, read()[field.key]),
          } as Partial<SupermanSettings>);
          this.refreshMenuLabels();
          this.context?.notify(label());
        },
      };
      this.menuLabels.push(() => {
        entry.label = label();
      });
      return entry;
    };

    const axis = (key: 'drive' | 'lift' | 'yaw', title: string, sub: string): MenuEntry => {
      const label = (): string => `${title}: ${SUPERMAN_SOURCE_LABELS[read()[key]]}`;
      const entry: MenuEntry = {
        id: `setting:superman-${key}`,
        label: label(),
        sub,
        icon: 'glove',
        accent,
        run: () => {
          saveSupermanSettings({
            [key]: nextSupermanSource(read()[key]),
          } as Partial<SupermanSettings>);
          this.refreshMenuLabels();
          this.context?.notify(label());
        },
      };
      this.menuLabels.push(() => {
        entry.label = label();
      });
      return entry;
    };

    const strafe: MenuEntry = {
      id: 'setting:superman-strafe',
      label: 'Hand schiebt quer',
      sub: 'Statt zu drehen · der Kopf lenkt weiter',
      icon: 'glove',
      accent,
      checked: read().strafe,
      run: () => {
        const next = saveSupermanSettings({ strafe: !read().strafe });
        strafe.checked = next.strafe;
        this.refreshMenuLabels();
        this.context?.notify(next.strafe ? 'Hand schiebt quer' : 'Hand legt die Kurve an');
      },
    };
    this.menuLabels.push(() => {
      strafe.checked = read().strafe;
    });

    return {
      id: 'setting:superman',
      label: 'Supermanhandschuh',
      sub: 'Tempo pro Richtung, und wer lenkt',
      icon: 'superman',
      accent,
      children: [
        ...SUPERMAN_FIELDS.map(dial),
        ...SUPERMAN_AXES.map((entry) => axis(entry.key, entry.label, entry.sub)),
        strafe,
        this.supermanValuesMenu(),
        {
          id: 'setting:superman-reset',
          label: 'Zurücksetzen',
          sub: 'Zurück zu den gebauten Werten',
          icon: 'reset',
          accent: 0xffc857,
          run: () => {
            clearSupermanSettings();
            this.refreshMenuLabels();
            this.context?.notify('Supermanhandschuh zurückgesetzt');
          },
        },
      ],
    };
  }

  /** Jede Zahl des Handschuhs hinter einer Tastatur. */
  private supermanValuesMenu(): MenuEntry {
    const children = SUPERMAN_FIELDS.map((field) => {
      const label = (): string =>
        `${field.label}: ${supermanFieldLabel(field, supermanSettings()[field.key])}`;
      const entry: MenuEntry = {
        id: `setting:superman-value-${field.key}`,
        label: label(),
        sub: `${field.sub} · ${field.min} bis ${field.max}`,
        icon: 'settings',
        accent: 0xff4d5e,
        run: () => {
          this.askNumber({
            title: field.label,
            sub: `Supermanhandschuh · ${field.min} bis ${field.max} ${field.unit}`.trim(),
            value: String(supermanSettings()[field.key]),
            hint: field.sub,
            commit: (value) => {
              const applied = saveSupermanSettings({
                [field.key]: value,
              } as Partial<SupermanSettings>);
              this.refreshMenuLabels();
              this.context?.notify(
                `${field.label}: ${supermanFieldLabel(field, applied[field.key])}`,
              );
            },
          });
        },
      };
      this.menuLabels.push(() => {
        entry.label = label();
      });
      return entry;
    });

    return {
      id: 'setting:superman-values',
      label: 'Werte eingeben',
      sub: 'Jede Zahl direkt tippen',
      icon: 'settings',
      accent: 0xff4d5e,
      children,
    };
  }

  /**
   * Welt-Physik: woran die Welt zieht, wie hoch man springt und woraus alles
   * zu sein scheint.
   *
   * Die Schwerkraft-Zeile hat eine Besonderheit: sie schaltet durch die
   * Rasten *und* schaltet dabei den Welt-Standard ab. Wer die Mondschwere des
   * Mondes will, drückt eine Zeile tiefer — sonst bliebe eine einmal getippte
   * Zahl für immer über jeder Welt stehen.
   */
  private physicsMenu(): MenuEntry {
    const accent = 0x9ad9ff;
    const read = (): WorldPhysics => worldPhysics();
    const gravityField = PHYSICS_FIELDS[0]!;

    const gravityRow: MenuEntry = {
      id: 'setting:physics-gravity',
      label: `Schwerkraft: ${gravityLabel(read(), this.worldGravity())}`,
      sub: gravityField.sub,
      icon: 'gizmo',
      accent,
      run: () => {
        const now = effectiveGravity(read(), this.worldGravity());
        saveWorldPhysics({ gravity: nextPhysicsStep(gravityField, now), autoGravity: false });
        this.refreshMenuLabels();
        this.context?.notify(`Schwerkraft: ${gravityLabel(read(), this.worldGravity())}`);
      },
    };
    this.menuLabels.push(() => {
      gravityRow.label = `Schwerkraft: ${gravityLabel(read(), this.worldGravity())}`;
    });

    const autoRow: MenuEntry = {
      id: 'setting:physics-auto',
      label: 'Welt-Standard',
      sub: `Was diese Welt mitbringt · ${this.worldGravity().toFixed(2)} m/s²`,
      icon: 'worlds',
      accent,
      checked: read().autoGravity,
      run: () => {
        const next = saveWorldPhysics({ autoGravity: !read().autoGravity });
        autoRow.checked = next.autoGravity;
        this.refreshMenuLabels();
        this.context?.notify(next.autoGravity ? 'Schwerkraft der Welt' : 'Eigene Schwerkraft');
      },
    };
    this.menuLabels.push(() => {
      autoRow.checked = read().autoGravity;
    });

    const pushRow: MenuEntry = {
      id: 'setting:physics-body-push',
      label: 'Körper stößt an',
      sub: 'Aus: der eigene Rumpf wirft nichts um',
      icon: 'gizmo',
      accent,
      checked: read().bodyPush,
      run: () => {
        const next = saveWorldPhysics({ bodyPush: !read().bodyPush });
        pushRow.checked = next.bodyPush;
        this.refreshMenuLabels();
        this.context?.notify(
          next.bodyPush ? 'Körper schiebt Gegenstände' : 'Körper lässt Gegenstände liegen',
        );
      },
    };
    this.menuLabels.push(() => {
      pushRow.checked = read().bodyPush;
    });

    const dial = (field: PhysicsField): MenuEntry => {
      const label = (): string => `${field.label}: ${physicsFieldLabel(field, read()[field.key])}`;
      const entry: MenuEntry = {
        id: `setting:physics-${field.key}`,
        label: label(),
        sub: field.sub,
        icon: 'settings',
        accent,
        run: () => {
          saveWorldPhysics({ [field.key]: nextPhysicsStep(field, read()[field.key]) });
          this.refreshMenuLabels();
          this.context?.notify(label());
        },
      };
      this.menuLabels.push(() => {
        entry.label = label();
      });
      return entry;
    };

    const values = PHYSICS_FIELDS.map((field) => {
      const label = (): string =>
        `${field.label}: ${physicsFieldLabel(field, worldPhysics()[field.key])}`;
      const entry: MenuEntry = {
        id: `setting:physics-value-${field.key}`,
        label: label(),
        sub: `${field.sub} · ${field.min} bis ${field.max}`,
        icon: 'settings',
        accent,
        run: () => {
          this.askNumber({
            title: field.label,
            sub: `Welt-Physik · ${field.min} bis ${field.max} ${field.unit}`.trim(),
            value: String(worldPhysics()[field.key]),
            hint: field.sub,
            commit: (value) => {
              const applied = saveWorldPhysics(
                field.key === 'gravity'
                  ? { gravity: value, autoGravity: false }
                  : ({ [field.key]: value } as Partial<WorldPhysics>),
              );
              this.refreshMenuLabels();
              this.context?.notify(
                `${field.label}: ${physicsFieldLabel(field, applied[field.key])}`,
              );
            },
          });
        },
      };
      this.menuLabels.push(() => {
        entry.label = label();
      });
      return entry;
    });

    return {
      id: 'setting:physics',
      label: 'Welt-Physik',
      sub: 'Schwerkraft, Sprung, Reibung, Rückprall, Körper',
      icon: 'gizmo',
      accent,
      children: [
        gravityRow,
        autoRow,
        ...PHYSICS_FIELDS.filter((field) => field.key !== 'gravity').map(dial),
        pushRow,
        {
          id: 'setting:physics-values',
          label: 'Werte eingeben',
          sub: 'Jede Zahl direkt tippen',
          icon: 'settings',
          accent,
          children: values,
        },
        {
          id: 'setting:physics-reset',
          label: 'Zurücksetzen',
          sub: 'Erde, und die Werte der Welt',
          icon: 'reset',
          accent: 0xffc857,
          run: () => {
            clearWorldPhysics();
            this.refreshMenuLabels();
            this.context?.notify('Welt-Physik zurückgesetzt');
          },
        },
      ],
    };
  }

  // --- the hands -----------------------------------------------------------

  /** How the hands look: empty, and around each tool. */
  private handsMenu(): MenuEntry {
    return {
      id: 'setting:hands',
      label: 'Hände',
      sub: 'Haltung leer und am Werkzeug',
      icon: 'glove',
      accent: 0x9fe3ff,
      children: [
        this.handLookMenu(),
        this.trackedGloveMenu(),
        this.boneColorsMenu(),
        this.handSideMenu('left'),
        this.handSideMenu('right'),
        {
          id: 'setting:hands-mirror-lr',
          label: 'Links auf rechts spiegeln',
          sub: 'Alle Haltungen der linken Hand',
          icon: 'glove',
          accent: 0x9fe3ff,
          run: () => this.mirrorHand('left'),
        },
        {
          id: 'setting:hands-mirror-rl',
          label: 'Rechts auf links spiegeln',
          sub: 'Alle Haltungen der rechten Hand',
          icon: 'glove',
          accent: 0x9fe3ff,
          run: () => this.mirrorHand('right'),
        },
        {
          id: 'setting:hands-reset',
          label: 'Hände zurücksetzen',
          sub: 'Zurück zur gebauten Haltung',
          icon: 'reset',
          accent: 0xffc857,
          run: () => {
            const count = handPoseCount();
            clearHandPoses();
            this.context?.hands.refreshPoses();
            this.refreshMenuLabels();
            this.context?.notify(
              count ? `${count} Hand-Pose(n) zurückgesetzt` : 'Nichts gespeichert',
            );
          },
        },
      ],
    };
  }

  /**
   * **Boxhand oder weißer Handschuh** — dieselbe Hand, anders angezogen
   * (`core/handLook.ts`). Ein Druck wechselt; die Hände ziehen sich im
   * nächsten Bild um, denn `HandVisuals` baut sie neu, sobald das Kleid nicht
   * mehr zur Einstellung passt.
   */
  private handLookMenu(): MenuEntry {
    const entry: MenuEntry = {
      id: 'setting:hands-look',
      label: `Handmodell: ${handLookLabel(handLook())}`,
      sub: 'Boxhand aus Kästen, oder ein Handschuh wie bei Master Hand',
      icon: 'glove',
      accent: 0x9fe3ff,
      run: () => {
        const next = saveHandLook(nextHandLook(handLook()));
        this.refreshMenuLabels();
        this.context?.notify(handLookLabel(next));
      },
    };
    this.menuLabels.push(() => {
      entry.label = `Handmodell: ${handLookLabel(handLook())}`;
    });
    return entry;
  }

  /**
   * **Handschuh an getrackten Händen** — ein Handschuh auf echten Knochen.
   *
   * Eine Hand ohne Controller ist ab Werk das, was die Brille misst: Kugeln an
   * den Gelenken. Angeschaltet legt sich ein Handschuh darüber, der auf genau
   * diese Kugeln gebaut ist — jede Fingerwurzel auf dem gemessenen Knöchel,
   * jeder Knochen so lang und so dick wie der echte, jedes Gelenk in dem
   * Winkel, in dem es wirklich steht (`core/gloveFit.ts`, `core/handBones.ts`).
   * Derselbe Schalter hängt im Poseraum an der Wand, dort, wo man ihn braucht.
   */
  private trackedGloveMenu(): MenuEntry {
    const label = (): string => `Blanke Hände: ${trackedGlove() ? 'Handschuh' : 'Gelenkkugeln'}`;
    const entry: MenuEntry = {
      id: 'setting:hands-tracked-glove',
      label: label(),
      sub: 'Hände ohne Controller: Handschuh darüber oder die Gelenke, wie gemessen',
      icon: 'glove',
      accent: 0x9fe3ff,
      checked: trackedGlove(),
      run: () => {
        const on = saveTrackedGlove(!trackedGlove());
        entry.checked = on;
        this.context?.hands.refreshPoses();
        this.refreshMenuLabels();
        this.context?.notify(on ? 'Blanke Hände tragen den Handschuh' : 'Blanke Hände: Gelenke');
      },
    };
    this.menuLabels.push(() => {
      entry.label = label();
      entry.checked = trackedGlove();
    });
    return entry;
  }

  /**
   * **Knochenfarben** — jeder Knochen in seiner eigenen Farbe.
   *
   * Ab Werk aus: eine Hand ist einfarbig, und beim Spielen soll ein Handschuh
   * ein Handschuh sein und kein Farbfächer. Beim Einstellen ist genau das im
   * Weg — fünf gleich weiße Röhren, und welcher Finger welcher ist und wo sein
   * zweiter Knochen anfängt, muss man erraten. Angeschaltet bekommt jeder
   * Finger einen Ton und jeder Knochen darin eine Stufe
   * (`core/bonePalette.ts`), an Boxhand, Handschuh und Gelenkkugeln
   * gleichermaßen. Derselbe Schalter hängt im Poseraum neben dem Handschuh.
   */
  private boneColorsMenu(): MenuEntry {
    const label = (): string => `Knochenfarben: ${boneColors() ? 'an' : 'aus'}`;
    const entry: MenuEntry = {
      id: 'setting:hands-bone-colors',
      label: label(),
      sub: 'Ein Farbton je Finger, eine Stufe je Knochen — zum Einstellen',
      icon: 'glove',
      accent: 0x5ee0a0,
      checked: boneColors(),
      run: () => {
        const on = saveBoneColors(!boneColors());
        entry.checked = on;
        this.context?.hands.refreshPoses();
        this.refreshMenuLabels();
        this.context?.notify(on ? 'Knochenfarben an' : 'Knochenfarben aus');
      },
    };
    this.menuLabels.push(() => {
      entry.label = label();
      entry.checked = boneColors();
    });
    return entry;
  }

  private handSideMenu(hand: Handedness): MenuEntry {
    return {
      id: `setting:hand-${hand}`,
      label: hand === 'left' ? 'Linke Hand' : 'Rechte Hand',
      sub: 'Grundhaltung und Griffe',
      icon: 'glove',
      accent: 0x9fe3ff,
      children: [
        this.handPoseMenu(hand, null),
        // Ein Prop wird mit einer eigenen Haltung gehalten, hat aber kein
        // Regalfach, an das sie hängen könnte — also steht sie hier.
        // Die Griffe der Werkzeuge stehen bei den Werkzeugen.
        this.handPoseMenu(hand, GRAB_POSE_ID),
      ],
    };
  }

  /**
   * The twelve numbers of one hand pose, each behind the keypad. Typing into
   * one shows on the hand while the keypad is still open — a curl of 0.6 means
   * nothing on paper and everything in the headset.
   */
  private handPoseMenu(hand: Handedness, toolId: string | null): MenuEntry {
    const title = !toolId
      ? 'Ohne Werkzeug'
      : toolId === GRAB_POSE_ID
        ? 'Objekt in der Hand'
        : (this.tool(toolId)?.label ?? toolId);
    const read = (): HandPose => this.context!.hands.editablePose(hand, toolId);
    const save = (pose: HandPose): void => {
      if (toolId) saveHoldHandPose(hand, toolId, pose);
      else saveIdleHandPose(hand, pose);
    };

    const children: MenuEntry[] = HAND_FIELDS.map((field) => {
      const entry: MenuEntry = {
        id: `hand:${hand}:${toolId ?? 'idle'}:${field.key}`,
        label: `${field.label}: ${round2(handPoseField(read(), field.key))} ${field.unit}`.trim(),
        sub: `${field.min} bis ${field.max}`,
        icon: 'settings',
        accent: 0x9fe3ff,
        run: () => {
          const before = read();
          this.askNumber({
            title: field.label,
            sub: `${hand === 'left' ? 'Linke' : 'Rechte'} Hand · ${title}`,
            value: String(round2(handPoseField(before, field.key))),
            hint: `${field.min} bis ${field.max} ${field.unit}`.trim(),
            // Live: the hand moves while the number is being typed.
            preview: (value) => {
              save(setHandPoseField(before, field.key, clamp(value, field.min, field.max)));
            },
            cancel: () => save(before),
            commit: (value) => {
              const pose = setHandPoseField(before, field.key, clamp(value, field.min, field.max));
              save(pose);
              this.context?.notify(`${title}: ${formatHandPose(pose)}`);
            },
          });
        },
      };
      this.menuLabels.push(() => {
        entry.label =
          `${field.label}: ${round2(handPoseField(read(), field.key))} ${field.unit}`.trim();
      });
      return entry;
    });

    children.push(
      {
        id: `hand:${hand}:${toolId ?? 'idle'}:mirror`,
        label: 'Auf die andere Hand spiegeln',
        sub: 'X, Yaw und Roll umgedreht',
        icon: 'glove',
        accent: 0x9fe3ff,
        run: () => {
          const other: Handedness = hand === 'left' ? 'right' : 'left';
          const mirrored = mirrorHandPose(read());
          if (toolId) saveHoldHandPose(other, toolId, mirrored);
          else saveIdleHandPose(other, mirrored);
          this.refreshMenuLabels();
          this.context?.notify(`Gespiegelt auf ${other === 'left' ? 'links' : 'rechts'}`);
        },
      },
      {
        id: `hand:${hand}:${toolId ?? 'idle'}:reset`,
        label: 'Zurücksetzen',
        sub: 'Zurück zur gebauten Haltung',
        icon: 'reset',
        accent: 0xffc857,
        run: () => {
          save(toolId ? clonePose(HOLD_HAND_POSE) : defaultIdlePose(hand));
          this.refreshMenuLabels();
          this.context?.notify(`${title}: zurückgesetzt`);
        },
      },
    );

    return {
      id: `setting:hand-${hand}-${toolId ?? 'idle'}`,
      label: toolId ? title : 'Grundhaltung',
      sub:
        toolId === GRAB_POSE_ID
          ? 'Wie die Hand ein Objekt hält'
          : toolId
            ? 'Wie die Hand es hält'
            : 'Die leere Hand',
      icon: 'glove',
      accent: 0x9fe3ff,
      children,
    };
  }

  /** Copies every pose of one hand over to the other, mirrored. */
  private mirrorHand(from: Handedness): void {
    const to: Handedness = from === 'left' ? 'right' : 'left';
    const snapshot = handPoseSnapshot();
    const idle = snapshot.idle?.[from];
    if (idle) saveIdleHandPose(to, mirrorHandPose(handPoseFromArray(idle)));
    let count = idle ? 1 : 0;
    for (const [toolId, values] of Object.entries(snapshot.hold?.[from] ?? {})) {
      saveHoldHandPose(to, toolId, mirrorHandPose(handPoseFromArray(values, HOLD_HAND_POSE)));
      count++;
    }
    this.context?.hands.refreshPoses();
    this.refreshMenuLabels();
    this.context?.notify(
      count
        ? `${count} Haltung(en) auf ${to === 'left' ? 'links' : 'rechts'} gespiegelt`
        : 'Nichts zu spiegeln',
    );
  }

  // --- the config code ------------------------------------------------------

  /** Reading the whole configuration out, and putting one back in. */
  private configMenu(): MenuEntry {
    return {
      id: 'setting:config',
      label: 'Konfig-Code',
      sub: 'Alle Einstellungen als eine Zeile',
      icon: 'settings',
      accent: 0x5ee0a0,
      children: [
        {
          id: 'setting:config-show',
          label: 'Code anzeigen',
          sub: 'Zum Ablesen, Kopieren und Weitergeben',
          icon: 'settings',
          accent: 0x5ee0a0,
          run: () => {
            const code = gearCode();
            console.info('[bgvr] Konfig-Code:', code);
            void navigator.clipboard?.writeText(code).catch(() => undefined);
            this.askText({
              title: 'Konfig-Code',
              sub: 'Schon in der Zwischenablage · Kopieren geht nochmal',
              value: code,
              hint: `${code.length} Zeichen · steht auch in der Browser-Konsole`,
              commit: (text) => this.loadConfigCode(text),
            });
          },
        },
        {
          id: 'setting:config-load',
          label: 'Code laden',
          sub: 'Eingeben oder einfügen',
          icon: 'settings',
          accent: 0x5ee0a0,
          run: () => {
            this.askText({
              title: 'Konfig-Code laden',
              sub: 'Einfügen oder Buchstabe für Buchstabe',
              value: '',
              hint: 'Beginnt mit BG3 (ältere BG2 gehen auch)',
              commit: (text) => this.loadConfigCode(text),
            });
          },
        },
        {
          id: 'setting:config-reset',
          label: 'Alles zurücksetzen',
          sub: 'Werkzeuge, Hände und Anbauteile',
          icon: 'reset',
          accent: 0xffc857,
          run: () => {
            clearGearConfig();
            this.applyStoredConfig();
            this.context?.notify('Alle Einstellungen zurückgesetzt');
          },
        },
      ],
    };
  }

  /** Takes a code apart and puts everything it carries into place. */
  private loadConfigCode(text: string): void {
    const config = parseGearCode(text);
    if (!config) {
      this.context?.notify('Kein gültiger Konfig-Code');
      return;
    }
    const summary = applyGearConfig(config);
    this.applyStoredConfig();
    this.context?.notify(`Geladen: ${summary}`);
  }

  /**
   * Ein Code aus dem Chat wurde übernommen — dieselbe Nachlese wie nach einem
   * abgetippten (`WorldContext`/`World.reloadGear`).
   */
  reloadGear(): void {
    this.applyStoredConfig();
  }

  /**
   * Puts whatever is stored onto the tools that are already built.
   *
   * Der Speicher allein reicht nicht: eine Pistole, die gerade in einer Hand
   * liegt, hat ihre Zahlen beim Bauen bekommen und liest sie nie wieder nach.
   * Der Eingaberaum ruft das ebenfalls, wenn ein Mitspieler seine Ausrüstung
   * herüberschickt.
   */
  protected applyStoredConfig(): void {
    // Über alle Exemplare, nicht nur über das gepoolte: seit es zwei Pistolen
    // geben darf, wäre „die Pistole" die falsche Hälfte der Antwort.
    for (const tool of this.liveTools) {
      tool.resetHold();
      applyStoredPose(tool);
      if (tool instanceof PistolTool) tool.reloadSettings();
    }
    this.context?.hands.refreshPoses();
    this.refreshMenuLabels();
  }

  // --- typing numbers and codes --------------------------------------------

  /** Rewrites every label that shows a value, then redraws the panel. */
  protected refreshMenuLabels(): void {
    for (const refresh of this.menuLabels) refresh();
    this.context?.menu.refresh();
  }

  protected askNumber(options: {
    title: string;
    sub?: string;
    value: string;
    hint?: string;
    preview?(value: number): void;
    cancel?(): void;
    commit(value: number): void;
  }): void {
    this.openKeys({
      title: options.title,
      sub: options.sub,
      value: options.value,
      hint: options.hint,
      layout: 'number',
      onPreview: options.preview
        ? (text) => {
            const value = Number(text);
            if (Number.isFinite(value)) options.preview!(value);
          }
        : undefined,
      onCancel: () => {
        options.cancel?.();
        this.refreshMenuLabels();
      },
      onCommit: (text) => {
        const value = Number(text);
        if (!Number.isFinite(value)) {
          options.cancel?.();
          this.context?.notify('Das war keine Zahl');
        } else {
          options.commit(value);
        }
        this.refreshMenuLabels();
      },
    });
  }

  /**
   * Dieselbe Tastatur für **eine Zeile** — eine Zahl ist es nicht, ein Aushang
   * auch nicht: ein Name, eine Kennung, ein Ziel.
   *
   * `protected`, seit der Bauplatz sie braucht: Das Ziel eines Einbaus
   * (`editor/WorldEditor.ts`, `grid/fixtures/`) wird im Spiel eingetippt, und
   * die Tastatur gehört der Welt — sie hängt vor dem Kopf und ist beim Zeiger
   * angemeldet, und es darf immer nur eine offen sein.
   */
  protected askText(options: {
    title: string;
    sub?: string;
    value: string;
    hint?: string;
    commit(text: string): void;
  }): void {
    this.openKeys({
      title: options.title,
      sub: options.sub,
      value: options.value,
      hint: options.hint,
      layout: 'text',
      onCommit: (text) => {
        options.commit(text);
        this.refreshMenuLabels();
      },
    });
  }

  /**
   * Dieselbe Tastatur, aber **mehrzeilig** — für alles, was ein Text ist und
   * kein Wert: der Aushang auf einem Schild.
   *
   * Sie liegt hier und nicht bei den Schildern, weil die Tastatur der Welt
   * gehört: Sie hängt vor dem Kopf des Spielers, sie ist beim Zeiger
   * angemeldet, und es darf immer nur eine offen sein.
   */
  protected askLines(options: {
    title: string;
    sub?: string;
    value: string;
    hint?: string;
    commit(text: string): void;
  }): void {
    this.openKeys({
      title: options.title,
      sub: options.sub,
      value: options.value,
      hint: options.hint,
      layout: 'lines',
      onCommit: (text) => {
        options.commit(text);
        this.refreshMenuLabels();
      },
    });
  }

  /** Puts the keypad an arm's length in front of the player and opens it. */
  private openKeys(request: KeyPanelRequest): void {
    const keys = this.keys;
    const ctx = this.context;
    if (!keys || !ctx) return;
    if (keys.parent !== this.root) this.root.add(keys);
    ctx.rig.getHeadMatrix(_matrix);
    _head.setFromMatrixPosition(_matrix);
    _rotation.setFromRotationMatrix(_matrix);
    // Slightly below eye level, tilted back: a keyboard, not a billboard.
    keys.position.copy(_head).add(_probe.set(0, -0.18, -0.55).applyQuaternion(_rotation));
    keys.quaternion.copy(_rotation);
    keys.rotateX(-0.35);
    keys.open(request);
  }

  /**
   * One row of the tool shelf. Building the row builds the tool.
   *
   * Und die Zeile ist zweierlei zugleich: **Greifen** nimmt das Werkzeug in
   * die Hand, **Trigger** geht in seine Einstellungen. Vorher lagen die
   * woanders — unter *Einstellungen* stand eine Seite „Pistole" und eine Seite
   * „Supermanhandschuh", während das Regal daneben eine eigene Liste derselben
   * Werkzeuge war. Wer die Feuerrate ändern wollte, ging also woandershin als
   * dorthin, wo die Pistole liegt. Jetzt hängt an jedem Werkzeug, was zu ihm
   * gehört, und der Pfeil am Zeilenende sagt es.
   */
  private toolEntry(id: string): MenuEntry {
    const preview = this.tool(id);
    const settings = this.toolSettings(id);
    return {
      id: `tool:${id}`,
      label: preview?.label ?? id,
      sub: preview?.hint,
      icon: preview?.icon ?? 'tools',
      accent: preview?.accent ?? 0x9d7bff,
      // Statt der Strichzeichnung das Werkzeug selbst, klein und langsam
      // drehend (`WristMenu.updatePreviews`). Bei sechs Handschuhen und drei
      // Pistolen ist eine Ikone bald keine Auskunft mehr.
      preview: id,
      run: (hand) => this.equipTool(this.context!, hand, id),
      ...(settings.length > 0 ? { children: settings } : {}),
    };
  }

  /**
   * Was zu genau einem Werkzeug einzustellen ist.
   *
   * Jedes hat einen **Griff** — wie die Hand es hält, links und rechts —, und
   * ein paar haben darüber hinaus eigene Werte. Die standen bisher als
   * gleichrangige Seiten unter *Einstellungen* und damit einen Baum weit weg
   * von dem Ding, um das es geht.
   */
  private toolSettings(id: string): MenuEntry[] {
    const own =
      id === 'pistol'
        ? (this.weaponMenu().children ?? [])
        : id === 'superman-glove'
          ? (this.supermanMenu().children ?? [])
          : id === 'holster'
            ? this.beltMenu()
            : id === 'sign'
              ? this.signMenu()
              : [];

    return [
      ...own,
      {
        id: `tool:${id}:grip`,
        label: 'Griff',
        sub: 'Wie die Hand es hält',
        icon: 'glove',
        accent: 0x9fe3ff,
        children: [this.handPoseMenu('left', id), this.handPoseMenu('right', id)],
      },
      {
        id: `tool:${id}:pose`,
        label: 'Lage in der Hand zurücksetzen',
        // Die Zeile sagt auch, an welcher Hand die gespeicherte Lage gemessen
        // wurde. Sie gilt für beide, aber gemessen wurde an einer, und das ist
        // die einzige Stelle, an der man das je wieder erfährt.
        sub: measuredNote(storedPoseHand(id)),
        icon: 'reset',
        accent: 0xffc857,
        run: () => {
          const tool = this.tool(id);
          clearPose(id);
          tool?.resetHold();
          this.refreshMenuLabels();
          this.context?.notify(`${tool?.label ?? id}: Lage zurückgesetzt`);
        },
      },
    ];
  }

  /**
   * **Wie ein Schild aussieht** — hinter dem Werkzeug, das es aufstellt.
   *
   * Jede Zeile ändert **zweierlei**: das Schild, vor dem man gerade steht (das
   * zuletzt aufgestellte oder angezielte), und die Vorlage für das nächste.
   * Beides zusammen, weil beides gemeint ist — wer die Schrift größer stellt,
   * während er davorsteht, will dieses Schild größer haben und das nächste
   * nicht wieder von Hand einstellen (`worlds/signs/SignRoom.ts`).
   */
  private signMenu(): MenuEntry[] {
    const accent = 0x9fd0ff;
    const read = (): SignSettings => this.signs?.settings() ?? signTemplate();
    const write = (patch: Partial<SignSettings>): void => {
      const next = this.signs?.apply(patch) ?? saveSignTemplate({ ...read(), ...patch });
      this.refreshMenuLabels();
      void next;
    };

    const dial = (
      id: string,
      label: string,
      sub: string,
      value: () => string,
      step: () => void,
    ): MenuEntry => {
      const entry: MenuEntry = {
        id: `setting:sign-${id}`,
        label: `${label}: ${value()}`,
        sub,
        icon: 'sign',
        accent,
        run: () => {
          step();
          this.refreshMenuLabels();
          this.context?.notify(`${label}: ${value()}`);
        },
      };
      this.menuLabels.push(() => {
        entry.label = `${label}: ${value()}`;
      });
      return entry;
    };

    return [
      {
        id: 'setting:sign-text',
        label: 'Schild beschriften',
        sub: 'Die Tastatur für das Schild, vor dem du stehst',
        icon: 'chat',
        accent,
        run: () => {
          const signs = this.signs;
          if (!signs) return;
          if (signs.current()) signs.edit();
          else this.context?.notify('Erst eines aufstellen · Trigger mit dem Schild in der Hand');
        },
      },
      dial(
        'font',
        'Schriftgröße',
        'Zeilenhöhe auf dem Schild — in Zentimetern, nicht in Pixeln',
        () => fontLabel(read().fontCm),
        () => write({ fontCm: nextSignStep(FONT_STEPS, read().fontCm) }),
      ),
      dial(
        'markdown',
        'Markdown',
        '# Titel, - Punkt, **fett**, ![Bild](Adresse) — oder alles wörtlich',
        () => (read().markdown ? 'an' : 'aus'),
        () => write({ markdown: !read().markdown }),
      ),
      dial(
        'align',
        'Ausrichtung',
        'Linksbündig liest sich länger, mittig sieht nach Aushang aus',
        () => alignLabel(read().align),
        () => write({ align: read().align === 'center' ? 'left' : 'center' }),
      ),
      dial(
        'color',
        'Schriftfarbe',
        'Sechs Farben, die zu den Hintergründen passen',
        () => paletteLabel(SIGN_COLORS, read().color),
        () => write({ color: nextPalette(SIGN_COLORS, read().color) }),
      ),
      dial(
        'background',
        'Hintergrund',
        'Dunkel für einen Raum, Papier für einen Aushang',
        () => paletteLabel(SIGN_BACKGROUNDS, read().background),
        () => write({ background: nextPalette(SIGN_BACKGROUNDS, read().background) }),
      ),
      dial(
        'scroll',
        'Automatisch rollen',
        'Läuft von selbst hoch, wartet oben und unten',
        () => scrollLabel(read().autoScroll),
        () => write({ autoScroll: nextSignStep(SCROLL_STEPS, read().autoScroll) }),
      ),
      dial(
        'manual',
        'Von Hand rollen',
        'Daumenstick der Hand, die auf das Schild zeigt',
        () => (read().manualScroll ? 'an' : 'aus'),
        () => write({ manualScroll: !read().manualScroll }),
      ),
      dial(
        'width',
        'Breite',
        'Wie breit die Tafel ist — die Schrift bleibt dabei gleich groß',
        () => `${read().width.toFixed(1).replace('.', ',')} m`,
        () => write({ width: nextSignStep(WIDTH_STEPS, read().width) }),
      ),
      dial(
        'height',
        'Höhe',
        'Höher heißt: mehr steht da, bevor gerollt werden muss',
        () => `${read().height.toFixed(1).replace('.', ',')} m`,
        () => write({ height: nextSignStep(HEIGHT_STEPS, read().height) }),
      ),
      {
        id: 'setting:sign-keyboard',
        label: `Tastatur: ${KEYBOARD_MODE_LABELS[keyboardMode()]}`,
        sub: KEYBOARD_MODE_SUBS[keyboardMode()],
        icon: 'settings',
        accent,
        run: (): void => {
          const mode = saveKeyboardMode(nextKeyboardMode(keyboardMode()));
          this.refreshMenuLabels();
          this.context?.notify(`Tastatur: ${KEYBOARD_MODE_LABELS[mode]}`);
        },
      },
      {
        id: 'setting:sign-clear',
        label: 'Eigene Schilder abräumen',
        sub: 'Alles, was du selbst aufgestellt hast — bei allen im Raum',
        icon: 'eraser',
        accent: 0xffc857,
        run: () => {
          const count = this.signs?.clear() ?? 0;
          this.context?.notify(count ? `${count} Schilder abgeräumt` : 'Da stand nichts');
        },
      },
    ];
  }

  /**
   * Der Gürtel, in Zahlen — hinter dem Werkzeug, das ihn verschiebt.
   *
   * Geschoben wird in der Brille mit der Hand; hier steht, was dabei
   * herausgekommen ist, und der einzige Knopf, den es dazu braucht: zurück auf
   * Anfang. Wer sich verschoben hat, findet seinen Gürtel sonst nur wieder,
   * indem er ihn Zentimeter für Zentimeter zurückzieht.
   */
  private beltMenu(): MenuEntry[] {
    const pose = (): BeltOffset => this.belt?.pose() ?? beltOffset();
    const label = (): string => `Gürtel: ${beltLabel(pose())}`;
    const entry: MenuEntry = {
      id: 'tool:holster:reset',
      label: label(),
      sub: 'Seite · Höhe · Tiefe — antippen setzt zurück',
      icon: 'reset',
      accent: 0x9fe3ff,
      run: () => {
        const belt = { ...DEFAULT_BELT };
        if (this.belt) this.belt.setPose(belt, true);
        else saveBelt(belt);
        this.refreshMenuLabels();
        this.context?.notify(`Gürtel zurückgesetzt · ${beltLabel(belt)}`);
      },
    };
    this.menuLabels.push(() => {
      entry.label = label();
    });
    return [entry];
  }

  render(ctx: WorldContext): boolean {
    // The drone's display is a camera in the room, so it is drawn before the
    // frame it appears in — same order as the portal views.
    for (const tool of this.held.values()) {
      if (tool instanceof DroneTool) tool.renderFeed(ctx.renderer, ctx.scene);
      // The same for anything on a tool that has a picture of its own — the
      // scope on the pistol looks through a camera of its own.
      for (const attachment of tool.attachments()) {
        attachment.renderFeed(ctx.renderer, ctx.scene);
      }
    }
    this.portalRenderer?.render(ctx.scene, ctx.camera, [this.portalBlue, this.portalRed]);
    ctx.renderer.render(ctx.scene, ctx.camera);
    return true;
  }

  dispose(ctx: WorldContext): void {
    this.fallReport.dispose();
    for (const foam of this.foams) foam.dispose();
    this.foams.length = 0;
    // Die Hand am Schirm hängt am **Rig** und nicht an der Welt: Sie überlebte
    // den Weltwechsel, wenn sie hier nicht abgenommen würde. Und was sie trug,
    // gibt sie vorher zurück — Knopf und Hände der Figur gehören danach wieder
    // der nächsten Welt (`freeScreenClaim`).
    this.dropScreenCarry(ctx);
    this.screenHand?.dispose();
    this.screenHand = null;
    this.screenToolOn = false;
    ctx.avatar.screenHand = null;
    ctx.hands.setScreenHands([]);
    ctx.rig.armed = false;
    this.crosshair?.remove();
    this.crosshair = null;
    for (const entry of [...this.usables]) this.removeUsable(entry.object);
    // Der Saum hängt an einem Ding der Welt und darf ihr nicht folgen.
    this.highlighter.dispose();
    this.secondHighlighter.dispose();
    this.hitboxes?.dispose();
    this.hitboxes = null;
    ctx.rig.useCandidate = false;
    if (this.canvas) {
      if (this.flatFire) this.canvas.removeEventListener('mousedown', this.flatFire);
      if (this.blockContextMenu) {
        this.canvas.removeEventListener('contextmenu', this.blockContextMenu);
      }
    }
    if (this.flatKeys) window.removeEventListener('keydown', this.flatKeys);
    this.canvas = null;
    this.flatFire = null;
    this.flatKeys = null;
    this.blockContextMenu = null;

    this.unsubscribePhysics?.();
    this.unsubscribePhysics = null;
    this.unsubscribeGrab?.();
    this.unsubscribeGrab = null;
    for (const view of this.ghostHands.values()) view.hand.dispose();
    this.ghostHands.clear();
    this.saved = null;
    this.pendingSteps = 0;
    this.horizonFloor = null;
    this.hasLastGround = false;
    this.puppeteer?.dispose();
    this.puppeteer = null;
    this.unsubscribeCharacters?.();
    this.unsubscribeCharacters = null;
    this.director?.dispose();
    this.director = null;
    this.signs?.dispose();
    this.signs = null;
    this.sync?.dispose();
    this.sync = null;
    this.worldBatch?.dispose();
    this.worldBatch = null;
    this.clearRemotePlayers(ctx);

    if (this.keys) {
      ctx.pointer.remove(this.keys);
      this.keys.dispose();
      this.keys = null;
    }
    this.menuLabels.length = 0;
    // Die Werkzeuge sterben gleich; ein Menü, das noch von ihnen abschreibt,
    // zeigt danach Netze, deren Geometrie freigegeben ist.
    ctx.menu.setModelFactory(null);
    ctx.hands.setHeldTool('left', null);
    ctx.hands.setHeldTool('right', null);

    for (const loose of [...this.loose.values()]) this.retireLoose(loose);
    this.loose.clear();
    for (const tool of this.liveTools) {
      if (tool instanceof DroneTool || tool instanceof StopwatchTool || tool instanceof BrainTool) {
        tool.forgetPointer(ctx.pointer);
      }
      tool.removeFromParent();
      tool.disposeTool();
    }
    this.liveTools.clear();
    this.tools.clear();
    this.held.clear();
    this.homes.clear();
    this.handMotion.clear();
    this.belt?.dispose();
    this.belt = null;
    this.host = null;
    for (const ring of this.rings.values()) {
      ring.geometry.dispose();
      ring.material.dispose();
      ring.removeFromParent();
    }
    this.rings.clear();
    this.clearBullets();
    this.setViewOverride(null);
    ctx.rig.frozen = false;
    this.joints.length = 0;
    this.timeScale = 1;
    this.selected = [];
    this.clearLinks();
    for (const rope of this.ropes.values()) {
      rope.geometry.dispose();
      rope.material.dispose();
      rope.removeFromParent();
    }
    this.ropes.clear();
    this.grabs.clear();
    this.spawned.clear();
    this.highlighted.clear();
    this.context = null;
    ctx.hands.setGestureOverride('left', null);
    ctx.hands.setGestureOverride('right', null);

    // The character controller lives in the physics world, so it has to go
    // before that world is freed.
    ctx.rig.setLocomotion(new FreeLocomotion());
    this.locomotion = null;
    this.craneStart = null;
    if (this.craneMark) disposeCrane(this.craneMark);
    this.craneMark = null;
    this.putBombAway();
    this.bombGhost?.dispose();
    this.bombGhost = null;

    // Ghosts hand the originals their real materials back, so they go first.
    this.ghosts?.dispose();
    this.ghosts = null;
    this.npcGhosts.clear();
    ctx.renderer.localClippingEnabled = this.clippingWasEnabled;

    this.portalRenderer?.dispose();
    this.portalRenderer = null;
    this.portalBlue.dispose();
    this.portalRed.dispose();
    this.probes.clear();
    this.props.length = 0;
    this.spawns.clear();
    this.surfaces.length = 0;
    this.nav = null;
    this.navReport = null;
    this.navDebug = null;
    this.navTracks = null;
    this.navLayers = noLayers();
    this.navSwitches = allOn();
    this.solids.length = 0;
    this.surfaceGroups.clear();
    this.slabBodies.clear();

    this.flights.clear();
    this.bodies.clear();
    this.ids.clear();
    this.kinds.clear();
    // **Vor `disposeTree`**: Das Gitter gehört sich selbst — Geometrie und
    // Material sind seine und nicht die der Welt, und ein zweiter Aufbau baut
    // sich ein neues.
    this.placeGrid?.dispose();
    this.placeGrid = null;
    this.areaPad?.dispose();
    this.areaPad = null;
    this.buildBar?.dispose();
    this.buildBar = null;
    this.placeGhost?.dispose();
    this.placeGhost = null;
    this.buildHistory.clear();
    this.areaOn = false;
    this.areaSelect.reset();
    this.areaHover = null;
    disposeTree(this.root);
    ctx.scene.background = null;
    this.physics?.dispose();
    this.physics = null;
  }

  // --- die Welt zum Ansehen ------------------------------------------------

  /**
   * **Dieselbe Welt, aber sie läuft** — für das Telefon, das ein Labor
   * bedienen will (`shared/livePreview.ts`).
   *
   * Der Unterschied zur stillen Vorschau ist genau eine Zeile und alles, was
   * daran hängt: Statt der Attrappe (`silentPhysics`) steht hier eine **echte
   * Physik**. Damit stehen die Wände wirklich, das Gitter wird abgetastet wie
   * im Spiel (`bakeNavigation`), und der Bestand an NPCs (`NpcDirector`) hat
   * einen Raum, in dem er laufen kann. Gebaut wird mit denselben Zeilen wie in
   * `init` — was fehlt, ist alles, wofür es einen **Spieler** braucht:
   * Portale, Gürtel, Werkzeuge, Netz, Menü.
   *
   * An seiner Stelle steht die **Attrappe** (`ghost`): ein Ring auf dem Boden,
   * dem die Hirne nachlaufen. Sie ist keine Vereinfachung, sondern das, was
   * die Ansicht von oben erst zu einem Werkzeug macht — man setzt sie
   * irgendwohin und sieht, welchen Weg das Gitter dorthin hergibt.
   *
   * Asynchron, weil die Physik geladen werden muss; wer nur ein Bild will,
   * nimmt weiter `preview()` und wartet auf nichts.
   */
  async previewLive(): Promise<WorldPreview> {
    this.root.name = 'preview-live';
    this.physics = await PhysicsWorld.create(-this.gravityNow());
    this.root.add(createLighting(Math.max(this.lightIntensity(), PREVIEW_LIGHT)));
    this.buildHorizonFloor();
    this.buildEnvironment();
    this.bakeNavigation();

    this.director = new NpcDirector({
      root: this.root,
      physics: this.physics,
      playerAt: (target) => this.npcTarget(target),
      strikePlayer: (direction, strength) => this.takeHit(direction, strength),
      notify: (message) => this.announce(message),
      nav: () => this.navForAgents(),
      cells: () => this.cellsForAgents(),
    });
    this.director.setBars(this.npcBars);
    this.director.setHitView(this.npcHitView);

    const ghost = createGhostTarget();
    ghost.position.copy(this.spawnPoint());
    this.root.add(ghost);
    this.ghost = ghost;
    this.ghostHere = true;
    this.ghostWalk = new PreviewWalk();

    // **Kacheln und Wege an.** Im Spiel ist das aus, weil man dort spielt; wer
    // eine Welt von oben aufmacht, um das Gitter anzusehen, hat es genau
    // deshalb aufgemacht.
    this.setNavLayers(defaultLayers());

    const live: LivePreview = {
      buttons: this.previewButtons(),
      step: (dt) => this.stepPreview(dt),
      target: ghost,
      moveTarget: (at) => {
        // Versetzen heißt auch: aufhören zu gehen. Wer eine Figur woanders
        // hinstellt, während sie unterwegs ist, sähe sie sonst sofort wieder
        // zurücklaufen.
        this.ghostWalk?.stop();
        ghost.position.copy(at);
      },
      walkTarget: (at) => this.ghostWalk?.to(at),
      reach: PREVIEW_REACH,
      probe: (at) => this.showPreviewReach(at),
      here: () => this.ghostHere,
      setHere: (on) => this.showPreviewPlayer(on),
      layers: () => this.navLayerState(),
      setLayer: (layer, on) => {
        this.setNavLayer(layer, on);
        this.previewLayersChanged();
      },
      switches: () => this.navSwitchState(),
      setSwitch: (id, on) => {
        this.setNavSwitch(id, on);
        this.previewLayersChanged();
        this.announce(switchSummary(this.navSwitchState()));
      },
      bars: () => this.npcBarMode(),
      setBars: (mode) => this.setNpcBars(mode),
      hits: () => this.npcHitViewOn(),
      setHits: (on) => this.setNpcHitView(on),
      onMessage: (sink) => {
        this.previewSink = sink;
      },
    };

    return {
      object: this.root,
      roof: this.roof,
      live,
      dispose: () => {
        this.previewSink = null;
        this.director?.dispose();
        this.director = null;
        this.ghost = null;
        this.ghostWalk = null;
        this.reachRing = null;
        for (const tool of this.liveTools) tool.disposeTool();
        this.liveTools.clear();
        disposeTree(this.root);
        this.physics?.dispose();
        this.physics = null;
      },
    };
  }

  /**
   * Ein Bild einer laufenden Vorschau — dieselbe Reihenfolge wie in `update`,
   * nur ohne alles, was einen Spieler voraussetzt.
   *
   * Vor dem Schritt und nicht danach: Was ein Hirn in diesem Bild will, soll
   * in *diesem* Bild gelaufen werden.
   */
  private stepPreview(dt: number): void {
    this.simulate(dt);
    // **Vor den Hirnen**: Wer in diesem Bild einen Schritt geht, soll auch in
    // diesem Bild der sein, dem sie nachlaufen — sonst hinken sie um ein Bild
    // hinterher, und bei sechzig Bildern in der Sekunde ist das ein halber
    // Meter Abstand, den niemand erklären kann.
    this.walkPreviewPlayer(dt);
    this.director?.update(dt);
    this.physics?.step(dt);
    this.physics?.sync();
    this.updateNavTracks(dt);
  }

  /**
   * Ein Bild des Gehe-zu-Modus (`shared/previewWalk.ts`).
   *
   * Eine weggeschaltete Figur geht nicht: Sie steht nicht in der Welt, und
   * etwas, das nicht da ist, läuft auch nicht herum.
   */
  private walkPreviewPlayer(dt: number): void {
    const walk = this.ghostWalk;
    const ghost = this.ghost;
    if (!walk || !ghost || !walk.going) return;
    if (!this.ghostHere) {
      walk.stop();
      return;
    }
    const step = walk.step(this.nav, ghost.position, dt);
    ghost.position.set(step.at.x, step.at.y, step.at.z);
    // Kein Weg dorthin — und das gesagt, nicht verschwiegen: Eine Figur, die
    // ohne Grund stehen bleibt, sieht kaputt aus; eine, die sagt, dass sie
    // nicht hinkommt, hat gerade etwas über diese Welt erzählt.
    if (step.stuck) {
      walk.stop();
      this.announce('Da komme ich nicht hin');
    }
  }

  /**
   * **Der Kreis „so weit langt sie"** — hingelegt oder weggenommen.
   *
   * Gebaut wird er beim ersten Mal und danach nur noch versetzt: Ein Ring aus
   * dreißig Dreiecken kostet nichts, ihn bei jedem Tipp neu zu bauen wäre eine
   * Geometrie je Fingerdruck.
   */
  private showPreviewReach(at: THREE.Vector3 | null): void {
    if (!this.reachRing && at) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(PREVIEW_REACH, 0.07, 8, 40),
        new THREE.MeshBasicMaterial({
          color: 0xffc857,
          transparent: true,
          opacity: 0.8,
          toneMapped: false,
        }),
      );
      ring.name = 'preview-reach';
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 902;
      this.root.add(ring);
      this.reachRing = ring;
    }
    const ring = this.reachRing;
    if (!ring) return;
    ring.visible = at !== null;
    if (at) ring.position.set(at.x, at.y + 0.08, at.z);
  }

  /**
   * **Die Figur hinstellen oder wegnehmen** — der Schalter hinter
   * `LivePreview.setHere`.
   *
   * Sie verschwindet nicht nur aus dem Bild, sie ist weg: `playerFeet()` gibt
   * danach `null` zurück, und damit haben die Hirne niemanden mehr
   * (`ghostHere`).
   */
  private showPreviewPlayer(on: boolean): void {
    if (this.ghostHere === on) return;
    this.ghostHere = on;
    if (this.ghost) this.ghost.visible = on;
    if (!on) this.ghostWalk?.stop();
    this.announce(on ? 'Du stehst wieder in der Welt' : 'Du bist weg — sie bleiben stehen');
  }

  /**
   * **Die Figur an eine Stelle stellen, von der aus ein Szenario etwas zeigt.**
   *
   * Eine Welt, die eine Behauptung aufstellt, braucht dafür jemanden, dem die
   * NPCs nachlaufen — und der muss **nah genug** stehen: Ein Zombie bemerkt
   * einen Spieler auf 22 Meter (`npc/npcBrains.ts`), und eine Bucht am Rand
   * eines 75 Meter breiten Labors liegt weiter weg als das. Wer das übersieht,
   * hat sechs Knöpfe, von denen fünf nichts tun.
   *
   * `false`, wenn es keine Vorschau gibt: In der Brille steht ein echter
   * Spieler, und den stellt niemand um.
   */
  protected placePreviewPlayer(at: THREE.Vector3): boolean {
    const ghost = this.ghost;
    if (!ghost) return false;
    this.ghostWalk?.stop();
    ghost.position.copy(at);
    // Und sie kommt zurück, wenn sie weggeschaltet war: Ein Szenario ohne
    // jemanden, dem die NPCs nachlaufen, wäre ein Knopf ohne Wirkung.
    this.ghostHere = true;
    ghost.visible = true;
    return true;
  }

  /**
   * **Was eine Welt jedes Bild für sich selbst tut** — ihre Uhr, ihre
   * Zeitschaltungen, ihre Szenarien.
   *
   * Getrennt von `update`, weil `update` einen Spieler und einen Kontext
   * voraussetzt und die laufende Vorschau beides nicht hat. Wer hier etwas
   * hineinschreibt, bekommt es in der Brille **und** auf dem Telefon; wer es
   * in `update` schreibt, nur in der Brille.
   */
  protected simulate(_dt: number): void {}

  /**
   * **Was man in der laufenden Vorschau drücken darf.**
   *
   * Leer voreingestellt: Die meisten Welten haben keine Knöpfe, und eine Liste
   * mit allem Anfassbaren wäre bei der Portalwelt der halbe Werkzeugkasten.
   * Wer welche anbietet, gibt ihnen Namen — auf einem Telefon liest man die
   * Zeile und trifft sie, statt eine Kuppel im Bild zu suchen.
   */
  protected previewButtons(): PreviewButton[] {
    return [];
  }

  /** Eine Ebene wurde von außen umgelegt — die Welt zieht ihre Anzeigen nach. */
  protected previewLayersChanged(): void {}

  /**
   * Die Kulisse dieser Welt, ohne Spiel darin — für die Werkzeugseite.
   *
   * Gebaut wird mit **denselben Zeilen** wie in `init`: derselbe Boden,
   * dasselbe `buildEnvironment` mit allem, was eine Welt daran umbaut. Was
   * fehlt, ist alles, wofür es einen Spieler braucht — Portale, Gürtel,
   * Werkzeuge in Händen, Netzwerk, Menü. Die Physik ist eine Attrappe
   * (`silentPhysics`), damit die Bauzeilen unverändert durchlaufen: sie legen
   * jede Wand in eine Simulation, in der nie jemand steht.
   *
   * Angesehen wird das Ergebnis wie ein Werkzeug: von weit genug weg, damit
   * die ganze Welt draufpasst, und schräg von oben. Wer wissen will, ob ihm
   * eine Welt gefällt, will zuerst ihren Grundriss sehen — die Runde, das
   * Tal, die vier Zimmer — und erst danach, wie es darin aussieht.
   */
  preview(): WorldPreview {
    this.root.name = 'preview';
    this.physics = silentPhysics();
    // Licht wie in der Welt — aber nie so wenig, dass nichts zu sehen ist. Das
    // Dunkelhaus ist mit Absicht fast schwarz (0.035), und eine schwarze
    // Vorschau ist keine.
    this.root.add(createLighting(Math.max(this.lightIntensity(), PREVIEW_LIGHT)));
    this.buildHorizonFloor();
    this.buildEnvironment();

    return {
      object: this.root,
      roof: this.roof,
      dispose: () => {
        // Ein Werkzeug, das im Raum liegt (die Taschenlampe im Dunkelhaus),
        // hat mehr als Geometrie — es hat einen Lichtkegel und eine Kamera.
        for (const tool of this.liveTools) tool.disposeTool();
        this.liveTools.clear();
        disposeTree(this.root);
        this.physics = null;
      },
    };
  }

  // --- the room, and what a different room may change ----------------------

  /**
   * Everything that makes this world *this* world. A world that wants the same
   * tools, portals and physics in a different place overrides this (and the
   * handful of small hooks below) instead of copying the machinery.
   */
  protected buildEnvironment(): void {
    this.buildChamber();
    this.buildProps();
  }

  /** Where the player starts, and which way they look. */
  protected spawnPoint(): THREE.Vector3 {
    return SPAWN;
  }

  protected spawnYaw(): number {
    return 0;
  }

  protected skyColor(): number {
    return 0x0a0f18;
  }

  protected lightIntensity(): number {
    return 0.6;
  }

  protected welcome(): string {
    return 'Werkzeuge am Gürtel greifen · Trigger schießt · A springt';
  }

  /**
   * What hangs on the belt when the world opens. Everything else is one trip
   * to the shelf away, so this is only about what the room is *for*.
   */
  protected beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [
      ['gun-blue', 'left'],
      ['gun-red', 'right'],
    ];
  }

  private buildChamber(): void {
    const chamber = new THREE.Group();
    chamber.name = 'chamber';
    this.root.add(chamber);

    const panel = new THREE.MeshStandardMaterial({
      color: 0xe7ecf5,
      roughness: 0.7,
      metalness: 0.05,
    });
    const shielded = new THREE.MeshStandardMaterial({
      color: 0x55648a,
      roughness: 0.45,
      metalness: 0.5,
    });
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8e9db8,
      roughness: 0.85,
      metalness: 0.05,
    });

    const half = ROOM.half;
    const t = ROOM.thickness;

    // Floor and ceiling take portals too — that is what makes falling fun.
    // They reach out past the walls: a portal opens up the wall it sits on, and
    // without floor underneath that wall you sink away right in front of it.
    const shell = (half + t) * 2;
    this.slab(chamber, floorMaterial, [shell, t, shell], [0, -t / 2, 0], true);
    this.slab(chamber, panel, [shell, t, shell], [0, ROOM.height + t / 2, 0], true);
    // Hier ist eine Decke drüber — für die Vorschau von oben der Deckel, der
    // weg muss.
    this.roof = ROOM.height;

    this.slab(
      chamber,
      panel,
      [half * 2, ROOM.height, t],
      [0, ROOM.height / 2, -half - t / 2],
      true,
    );
    this.slab(chamber, panel, [t, ROOM.height, half * 2], [half + t / 2, ROOM.height / 2, 0], true);
    this.slab(
      chamber,
      panel,
      [t, ROOM.height, half * 2],
      [-half - t / 2, ROOM.height / 2, 0],
      true,
    );
    // The wall behind the spawn is shielded: no portals stick to it.
    this.slab(
      chamber,
      shielded,
      [half * 2, ROOM.height, t],
      [0, ROOM.height / 2, half + t / 2],
      false,
    );

    const grid = new THREE.GridHelper(half * 2, 16, 0x5d7398, 0x7d8ea9);
    grid.position.y = 0.01;
    chamber.add(grid);

    // Two panels facing each other: shoot both and you can look at yourself.
    for (const [x, z, angle] of [
      [-4.6, -1.2, Math.PI / 2],
      [4.6, -1.2, -Math.PI / 2],
    ] as const) {
      const board = this.slab(chamber, panel, [3.6, 3.2, 0.2], [x, 1.7, z], true, false);
      board.rotation.y = angle;
      board.updateMatrixWorld(true);
      this.physics!.addStatic(board, {
        membership: this.surfaceGroups.get(board) ?? GROUP_WORLD,
        filter: ALL_GROUPS,
      });
    }

    // A ledge that is out of reach without jumping or a portal.
    const ledge = this.slab(chamber, shielded, [3, 1.5, 2.4], [-5.4, 0.75, -5.4], false);
    void ledge;

    for (const side of [-1, 1]) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(half * 2 - 0.6, 0.06, 0.06),
        new THREE.MeshBasicMaterial({ color: 0x9ec4ff, toneMapped: false }),
      );
      strip.position.set(0, ROOM.height - 0.3, side * (half - 0.15));
      chamber.add(strip);
    }
    for (const [x, z] of [
      [-4, -4],
      [4, -4],
      [-4, 4],
      [4, 4],
    ] as const) {
      const lamp = new THREE.PointLight(0xdce8ff, 9, 22, 2);
      lamp.position.set(x, ROOM.height - 0.5, z);
      this.root.add(lamp);
    }

    const sign = new TextPlane({
      width: 3,
      height: 0.9,
      title: 'Portal Labor',
      body: 'Weiße Flächen halten Portale, die blaue Rückwand nicht. Links blau, rechts rot.',
      accent: COLOR_RED,
    });
    sign.position.set(0, 2.8, half - 0.02);
    sign.rotation.y = Math.PI;
    chamber.add(sign);
  }

  /**
   * **Die Ebene, in der der Spieler geht** (`PhysicsLocomotion.plane`) —
   * `null` in einer Welt ohne Gitter. Die Welten auf dem Gitter stellen sie
   * (`GridWorld`).
   */
  protected playerPlane(): PlayerPlane | null {
    return null;
  }

  /**
   * **Das Zellgitter für die NPCs** (`NpcWorld.cells`) — `null` in einer Welt
   * ohne Gitter; dort hält sie weiter die Physik auf. Die Welten auf dem
   * Gitter stellen es (`GridWorld`).
   */
  protected cellsForAgents(): CellGrid | null {
    return null;
  }

  /** Adds a box that is both visible and solid. */
  protected slab(
    parent: THREE.Object3D,
    material: THREE.Material,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    portalable: boolean,
    physics = true,
    yaw = 0,
    membership = GROUP_WORLD,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    // Gedreht wird vor dem Körper: Der Collider übernimmt die Lage des Meshes
    // (`PhysicsWorld.addStatic`) — die Wand unter 45° (`gridPlan.slopeSolid`).
    if (yaw !== 0) mesh.rotation.y = yaw;
    mesh.name = portalable ? 'surface:panel' : 'surface:shielded';
    parent.add(mesh);
    mesh.updateWorldMatrix(true, false);

    // Solid for everything that points at the room; whether a portal sticks to
    // it is a separate question.
    this.solids.push(mesh);

    // Every portal surface gets a bit of its own, so a portal on the wall does
    // not also open up the floor you are standing on.
    let group = membership;
    if (portalable) {
      group = portalSurfaceGroup(this.surfaceGroups.size);
      this.surfaceGroups.set(mesh, group);
      this.surfaces.push(mesh);
    }
    if (physics) {
      this.slabBodies.set(
        mesh,
        this.physics!.addStatic(mesh, { membership: group, filter: ALL_GROUPS }),
      );
    }
    return mesh;
  }

  /**
   * **Ob an dieser Hüfte noch Platz ist.**
   *
   * Der Gürtel hat zwei Haken, und in den meisten Welten hängt an beiden schon
   * ein Werkzeug. Wer noch etwas dort unterbringen will — die Karte des
   * Bearbeitungsmodus etwa (`grid/GridWorld.ts`) —, muss vorher fragen: Zwei
   * Sachen am selben Haken heißt, dass ein Griff dorthin eine von beiden
   * verschluckt, und welche, weiß niemand.
   */
  protected beltFree(side: Handedness): boolean {
    return this.belt?.slot(side).tool == null;
  }

  /**
   * **Einen gebauten Quader wieder aus der Welt nehmen** — Körper, Portalfläche,
   * Abtastliste und Geometrie.
   *
   * Die Gegenrichtung von `slab()`, und sie gehört an dieselbe Stelle: Ein
   * Quader steht in vier Listen, und wer ihn nur aus der Szene nimmt, hat ihn
   * in dreien davon noch. Der Fehler, den das sonst macht, ist der schlimmste,
   * den eine Welt haben kann — man läuft gegen eine Wand, die nicht mehr da
   * ist.
   */
  protected dropSlab(mesh: THREE.Object3D): void {
    const body = this.slabBodies.get(mesh);
    if (body) {
      this.physics?.remove(body);
      this.slabBodies.delete(mesh);
    }
    const solid = this.solids.indexOf(mesh);
    if (solid >= 0) this.solids.splice(solid, 1);
    const surface = this.surfaces.indexOf(mesh);
    if (surface >= 0) this.surfaces.splice(surface, 1);
    this.surfaceGroups.delete(mesh);
    // **Nur die Form.** Die Materialien einer Gitterwelt sind geteilt: Wer sie
    // hier freigäbe, gäbe dieselben acht bei jedem Umbau hundertmal frei — und
    // die Quader, die gleich neu entstehen, brauchen genau diese acht.
    disposeShapes(mesh);
  }

  /**
   * **Noch einmal abtasten** — nachdem eine Welt umgebaut wurde.
   *
   * Der Graph wird dabei ersetzt und nicht nachgepflegt; wer ihn liest, holt
   * ihn sich ohnehin bei jedem Zugriff neu (`NpcDirector`, `navForAgents`).
   */
  protected rebake(): void {
    this.bakeNavigation();
  }

  // --- der Boden, die Schwerkraft und der Weg zurück ------------------------

  /**
   * Was diese Welt an Schwerkraft mitbringt. Der Mond sagt hier 1,62 — und
   * solange niemand im Menü eine eigene Zahl setzt, gilt genau die.
   */
  protected worldGravity(): number {
    return EARTH_GRAVITY;
  }

  /** Farbe der Fläche bis zum Horizont; `null` lässt sie weg. */
  protected horizonColor(): number | null {
    return 0x4a5670;
  }

  /** Die Rasterlinien darauf. */
  protected horizonLine(): number {
    return 0x0b1220;
  }

  /**
   * **Das zweite Feld des Schachbretts** draußen (`shared/environment.ts`).
   *
   * `null` heißt: eine Spur heller als die Grundfarbe, und damit hat jede Welt
   * ihr Brett, ohne eine Farbe zu nennen. Wer es wie in Portal will — grau und
   * weiß im Wechsel —, nennt sie.
   */
  protected horizonChecker(): number | null {
    return null;
  }

  /**
   * Höhe der Oberfläche der Fläche. Von hier aus wird gemessen, ob jemand aus
   * der Welt gefallen ist — eine Karte, die tief unter der Null anfängt, ist
   * keine, aus der man gefallen ist.
   */
  protected horizonLevel(): number {
    return this.horizonFloor ? GROUND_TOP : 0;
  }

  /**
   * Die Fläche, die es in jeder Welt gibt.
   *
   * Jede Welt stand vorher auf ihrer eigenen Platte, und an deren Rand war
   * Schluss. Das ist genau die Grenze, die eine Sandkiste nicht haben darf:
   * man will um das Labor herumlaufen, die Kartbahn von außen ansehen, einen
   * Messer über die freie Fläche werfen. Die Fläche ist deshalb Sache der
   * Basis und nicht jeder einzelnen Welt — und sie ist portalfähig, weil ein
   * Bodenportal im Freien genau das ist, was man als Erstes ausprobiert.
   */
  private buildHorizonFloor(): void {
    const color = this.horizonColor();
    if (color === null) return;
    const checker = this.horizonChecker();
    const mesh = createGround(color, {
      line: this.horizonLine(),
      ...(checker === null ? {} : { checker }),
    });
    this.root.add(mesh);
    mesh.updateWorldMatrix(true, false);
    this.horizonFloor = mesh;
    this.solids.push(mesh);
    const group = portalSurfaceGroup(this.surfaceGroups.size);
    this.surfaceGroups.set(mesh, group);
    this.surfaces.push(mesh);
    this.physics!.addStatic(mesh, { membership: group, filter: ALL_GROUPS });
  }

  /** Die Schwerkraft, die jetzt gilt: die der Welt, oder die eingestellte. */
  private gravityNow(): number {
    return effectiveGravity(worldPhysics(), this.worldGravity());
  }

  /**
   * Überträgt die Welt-Physik auf die laufende Simulation.
   *
   * Reibung und Rückprall werden nur angefasst, *wenn* jemand sie verstellt
   * hat: die Dominos stehen mit 0,6 im Code, die Companion Cubes mit 0,8, und
   * das beim Start pauschal auf einen Wert zu ziehen, hieße jede sorgfältig
   * eingestellte Kleinigkeit mit dem Auslieferungswert zu überschreiben. Wer
   * die Zeile im Menü anfasst, will genau das — vorher niemand.
   */
  private applyWorldPhysics(): void {
    const settings = worldPhysics();
    this.physics?.setGravity(-effectiveGravity(settings, this.worldGravity()));
    if (this.locomotion) {
      this.locomotion.jumpSpeed = settings.jump;
      this.locomotion.pushesProps = settings.bodyPush;
    }
    if (
      settings.friction !== DEFAULT_WORLD_PHYSICS.friction ||
      settings.bounce !== DEFAULT_WORLD_PHYSICS.bounce
    ) {
      this.physics?.setMaterial(settings.friction, settings.bounce);
    }
  }

  /**
   * **Wohin ein Sturz aus der Welt führt**: an den Startpunkt der Welt
   * (`true`, in allen Welten) oder auf die letzte Stelle mit Boden (`false`).
   * Gewünscht: _„in allen welten, wenn ich runter falle [soll] der spieler
   * nicht einfach nach oben teleportiert werden, sondern wirklich zum spawn
   * der welt"_ — die letzte Stelle mit Boden liegt nach einem Sturz durch
   * eine Wand womöglich hinter ihr.
   */
  protected fallRespawnAtStart(): boolean {
    return true;
  }

  /**
   * Wer unter die Welt fällt, kommt oben wieder heraus.
   *
   * Gemerkt wird die letzte Stelle mit Boden unter den Füßen; von dort geht
   * beim Sturz ein Strahl von weit oben nach unten, und der **höchste**
   * Treffer ist der Platz. Das ist der ganze Unterschied zwischen „wieder da"
   * und „im Keller eines Hauses": von unten gesucht landet man unter dem Dach,
   * von oben darauf.
   */
  private updateFallRescue(ctx: WorldContext, dt: number): void {
    const locomotion = this.locomotion;
    if (!locomotion || ctx.rig.frozen || this.viewOverride) return;
    ctx.rig.getHeadPosition(_head);
    this.fallTrail.record(dt, _head.x, ctx.rig.getFloorY(), _head.z, locomotion.grounded);
    if (locomotion.grounded) {
      ctx.rig.getHeadPosition(_head);
      this.lastGround.set(_head.x, 0, _head.z);
      this.hasLastGround = true;
      return;
    }
    if (!needsRescue(ctx.rig.getFloorY(), this.horizonLevel())) return;
    this.rescuePlayer(ctx);
  }

  /**
   * Setzt den Spieler auf einen Punkt — der Teleporter läuft hier durch.
   *
   * Die Blickrichtung bleibt, wie sie war: wer sich beim Teleportieren auch
   * noch gedreht vorfindet, weiß im nächsten Moment nicht mehr, wo er ist. Und
   * die Kapsel wird nachgezogen (`resync`), sonst versucht der Character
   * Controller den ganzen Weg als *Bewegung* aufzulösen und schiebt einen
   * durch alles, was dazwischenstand.
   *
   * `yaw` gibt es für den Sprung, der einen **nicht** ein paar Meter weiter
   * absetzt, sondern woanders hin: wer aus dem Tal auf einen Berg gebracht
   * wird, weiß ohnehin nicht mehr, wo vorn war, und dann ist die Richtung, in
   * die es von dort aus weitergeht, die bessere Antwort als die alte.
   *
   * @returns `false`, wenn der Körper gerade jemand anderem gehört — dem Kart,
   *          das man fährt, oder der Drohne, durch die man sieht.
   */
  protected teleportPlayerTo(point: THREE.Vector3, yaw?: number): boolean {
    const ctx = this.context;
    if (!ctx || ctx.rig.frozen || this.viewOverride) return false;
    _euler.setFromQuaternion(ctx.rig.quaternion, 'YXZ');
    if (yaw !== undefined) _euler.y = yaw;
    // Einen Fingerbreit über der Fläche absetzen: genau auf ihr klebt man in
    // ihr fest, und der Controller schiebt einen erst im nächsten Bild heraus.
    _point.copy(point);
    _point.y += LANDING_CLEARANCE;
    ctx.rig.placeFeetAt(_point, _euler.y);
    this.locomotion?.resync(ctx.rig);
    return true;
  }

  /**
   * **Den Spieler versetzen** — Rig *und* Kapsel, und deshalb gibt es diese
   * Methode überhaupt.
   *
   * `rig.placeAt` allein verschiebt nur das, was man sieht. Die Kapsel der
   * Fortbewegung bleibt dabei stehen, wo sie stand, und zieht den Spieler im
   * nächsten Bild dorthin zurück — ein Versetzen, das eine Zehntelsekunde
   * hält und dann rückgängig gemacht wird, sieht aus wie ein Fehler in der
   * Physik und ist einer in einer vergessenen Zeile.
   *
   * Ohne `yaw` bleibt die Blickrichtung, die gerade gilt. Mit `yaw` schaut
   * danach der **Kopf** dorthin (`PlayerRig.turnHeadTo`) — nicht nur das Rig:
   * In der Brille legt das Headset seine eigene Drehung obendrauf, und wer im
   * Spielraum nach links gedreht stand, schaute nach dem Versetzen weiter
   * nach links, egal was hier stand.
   *
   * Versetzt werden die **Füße des Spielers** (`PlayerRig.placeFeetAt`), nicht
   * der Ursprung des Rigs: In der Brille liegen die beiden um so viel
   * auseinander, wie man von der Mitte seines Spielraums entfernt steht —
   * und genau um so viel landete man bisher neben dem Ziel, beim Start einer
   * Runde auch schon einmal in einer Wand.
   */
  /**
   * **Den Körper durch die Welt gehen lassen** (`PhysicsLocomotion.ghost`) —
   * der Konstrukt-Raum fragt danach (`GridWorld.syncConstructBody`).
   *
   * Eine Methode und kein öffentliches Feld, weil die Fortbewegung dieser Welt
   * gehört und nicht ihren Erben: Sie entsteht beim `init` und ist beim
   * Weltwechsel wieder weg (`this.locomotion`), und wer sie zwischendurch
   * anfasst, soll das nicht auf einem `null` tun müssen.
   */
  protected setPlayerGhost(on: boolean): void {
    if (this.locomotion) this.locomotion.ghost = on;
  }

  protected movePlayerTo(ctx: WorldContext, at: THREE.Vector3, yaw?: number): void {
    _euler.setFromQuaternion(ctx.rig.quaternion, 'YXZ');
    ctx.rig.placeFeetAt(_point.copy(at), yaw ?? _euler.y);
    if (yaw !== undefined) ctx.rig.turnHeadTo(yaw);
    this.locomotion?.resync(ctx.rig);
  }

  /** Setzt den Spieler auf die Oberfläche über der Stelle, an der er fiel. */
  private rescuePlayer(ctx: WorldContext): void {
    // **Erst der Bericht, dann die Rettung** (`shared/fallTrail.ts`,
    // `ui/fallReport.ts`): der Weg bis hierher, oben im Bild zum Kopieren.
    ctx.rig.getHeadPosition(_head);
    const where = typeof location === 'undefined' ? 'Welt' : location.hash || location.pathname;
    this.fallReport.show(
      fallReportText(where, this.fallTrail.trail, {
        x: _head.x,
        y: ctx.rig.getFloorY(),
        z: _head.z,
      }),
    );
    this.fallTrail.clear();
    if (this.fallRespawnAtStart()) {
      // **Zurück an den Start** — gewünscht für die Welten auf dem Gitter:
      // Wer durch eine Wand fiel, stünde an der letzten Stelle mit Boden
      // womöglich wieder hinter ihr.
      this.hasLastGround = false;
      this.movePlayerTo(ctx, this.spawnPoint(), this.spawnYaw());
      ctx.notify('Durch die Welt gefallen — zurück am Start');
      return;
    }
    const spawn = this.spawnPoint();
    const x = this.hasLastGround ? this.lastGround.x : spawn.x;
    const z = this.hasLastGround ? this.lastGround.z : spawn.z;

    this.raycaster.set(_probe.set(x, RESCUE_PROBE, z), _direction.set(0, -1, 0));
    this.raycaster.far = RESCUE_PROBE * 2;
    const hits = this.raycaster.intersectObjects(this.solids, false).map((hit) => hit.point.y);
    const y = rescueHeight(hits, spawn.y);

    _euler.setFromQuaternion(ctx.rig.quaternion, 'YXZ');
    ctx.rig.placeFeetAt(_point.set(x, y, z), _euler.y);
    this.locomotion?.resync(ctx.rig);
    this.hasLastGround = false;
    ctx.notify('Aus der Tiefe zurückgeholt');
  }

  // --- Aufstellung speichern und laden --------------------------------------

  /**
   * Merkt sich, wie alles gerade steht — Pose, Größe und Schwung jedes Props.
   *
   * Das ist die Antwort auf das, was einen Sandkasten sonst mürbe macht: eine
   * Stunde stapeln, ein Fehlgriff, alles liegt. Gespeichert wird im Speicher
   * dieser Sitzung, nicht im Browser: es ist ein Rücksetzpunkt für den
   * Versuch, an dem man gerade ist, kein Spielstand.
   */
  private saveSnapshot(): number {
    const saved: SavedProp[] = [];
    for (const entry of this.props) {
      const linvel = entry.body.linvel();
      const angvel = entry.body.angvel();
      saved.push({
        entry,
        position: entry.object.position.clone(),
        quaternion: entry.object.quaternion.clone(),
        // Was aus den Augen gerade halb so groß getragen wird, wird in seiner
        // echten Größe gemerkt (`shrinkScreenCarry`).
        scale: (this.shrunk?.entry === entry ? this.shrunk.scale : entry.object.scale).clone(),
        half: entry.halfExtents.clone(),
        velocity: new THREE.Vector3(linvel.x, linvel.y, linvel.z),
        spin: new THREE.Vector3(angvel.x, angvel.y, angvel.z),
      });
    }
    this.saved = saved;
    return saved.length;
  }

  /** Stellt die gespeicherte Aufstellung wieder her. */
  private loadSnapshot(): number {
    const saved = this.saved;
    const physics = this.physics;
    if (!saved || !physics) return 0;

    let restored = 0;
    for (const item of saved) {
      // Was inzwischen wegradiert wurde, kommt nicht zurück: sein Körper ist
      // aus der Simulation heraus, und ihn anzufassen hieße in freigegebenen
      // Speicher zu greifen.
      if (!this.props.includes(item.entry)) continue;
      const { entry } = item;
      const hand = this.handHolding(entry);
      if (hand) this.release(this.context!, hand, this.grabs.get(hand)!, false);
      this.endFlight(entry, false);

      entry.object.scale.copy(item.scale);
      if (!entry.halfExtents.equals(item.half)) physics.resize(entry, item.half);
      entry.body.setTranslation(
        { x: item.position.x, y: item.position.y, z: item.position.z },
        true,
      );
      entry.body.setRotation(
        {
          x: item.quaternion.x,
          y: item.quaternion.y,
          z: item.quaternion.z,
          w: item.quaternion.w,
        },
        true,
      );
      entry.body.setLinvel({ x: item.velocity.x, y: item.velocity.y, z: item.velocity.z }, true);
      entry.body.setAngvel({ x: item.spin.x, y: item.spin.y, z: item.spin.z }, true);
      entry.object.position.copy(item.position);
      entry.object.quaternion.copy(item.quaternion);
      restored++;
    }
    return restored;
  }

  /** Gibt es überhaupt etwas zu laden? */
  private hasSnapshot(): boolean {
    return this.saved !== null;
  }

  // --- verdoppeln, anstreichen, nachsehen -----------------------------------

  /**
   * Legt eine Kopie eines Props daneben.
   *
   * Kopiert wird, was man sieht *und* was man anfasst: Form, Farbe, Material,
   * Größe und Masse. Bag-Props kennen ihre Sorte und gehen deshalb über das
   * Netz — alles andere (eine Zielscheibe, ein Kart-Hütchen) ist ein Bau
   * dieser einen Welt, den die Gegenseite nicht nachbauen kann; die Kopie
   * bleibt dann bewusst lokal, statt bei den anderen als Loch aufzutauchen.
   */
  private duplicateProp(entry: PhysicsBody): PhysicsBody | null {
    const physics = this.physics;
    if (!physics || !this.props.includes(entry)) return null;
    if (this.loose.has(entry)) return null;

    const source = entry.object;
    const clone = cloneVisual(source);
    // Einen Schritt zur Seite, entlang der eigenen Breite — sonst stecken die
    // beiden ineinander und die Simulation schleudert sie auseinander.
    clone.position.copy(source.position);
    clone.position.x += entry.halfExtents.x * 2 + 0.06;
    clone.position.y += entry.halfExtents.y * 0.5;
    clone.quaternion.copy(source.quaternion);
    clone.scale.copy(source.scale);
    this.root.add(clone);
    clone.updateWorldMatrix(true, false);

    const mass = Math.max(0.1, entry.collider.mass());
    const copy = physics.addDynamic(clone, {
      shape: entry.shape,
      halfExtents: entry.halfExtents.clone(),
      mass,
      friction: entry.collider.friction(),
      restitution: entry.collider.restitution(),
      membership: GROUP_PROP,
      filter: ALL_GROUPS,
    });
    // Die Kopie einer Wand ist eine Wand: Sie steht so fest wie ihr Vorbild.
    const stance = this.stances.get(entry);
    if (stance) {
      this.stances.set(copy, stance);
      this.applyStance(copy);
    }

    const kind = (source.userData as { propKind?: PropKind }).propKind ?? null;
    const id = kind ? (this.sync?.nextId() ?? `local-${this.bodies.size}`) : null;
    if (id && kind) {
      (clone.userData as { propKind?: PropKind }).propKind = kind;
      this.registerProp(copy, id);
      this.kinds.set(id, kind);
      this.spawned.add(copy);
      this.sync?.spawned(id, kind, poseOf(copy));
      const paint = (source.userData as { paint?: number }).paint;
      const style = (source.userData as { material?: string }).material;
      if (paint !== undefined || style) {
        this.styleProp(copy, { color: paint, material: style }, true);
      }
    } else {
      // Kein Bausatz, kein Netz: der Nachbau lebt in dieser Sitzung, hier.
      this.props.push(copy);
      this.spawns.set(copy, clone.matrixWorld.clone());
      this.spawned.add(copy);
    }
    return copy;
  }

  /**
   * Farbe, Material oder beides. `share` sagt es auch den anderen — ein
   * angestrichener Würfel ist Teil der geteilten Welt, kein Effekt auf einem
   * Bildschirm.
   */
  private styleProp(entry: PhysicsBody, style: PropStyle, share: boolean): void {
    const materials: THREE.MeshStandardMaterial[] = [];
    entry.object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
      if (Array.isArray(material)) materials.push(...material);
      else if (material?.isMaterial) materials.push(material);
    });
    if (materials.length === 0) return;

    const store = entry.object.userData as {
      paint?: number;
      material?: string;
      baseEmissive?: THREE.Color;
    };
    const surface = style.material ? findMaterial(style.material) : null;
    const color = style.color;

    for (const material of materials) {
      if (color !== undefined && material.color) {
        material.color.setHex(color);
        // Eine Textur würde die neue Farbe wieder verdecken.
        material.map = null;
      }
      if (surface) {
        material.roughness = surface.roughness;
        material.metalness = surface.metalness;
        material.transparent = isTransparent(surface);
        material.opacity = surface.opacity;
        material.depthWrite = !material.transparent;
        if (material.emissive) {
          material.emissive.copy(material.color).multiplyScalar(surface.glow);
          // Das Leuchten ist jetzt Teil des Objekts; der Greif-Schimmer legt
          // sich darüber und muss beim Loslassen hierhin zurückfallen.
          store.baseEmissive = material.emissive.clone();
        }
      }
      material.needsUpdate = true;
    }

    if (color !== undefined) store.paint = color;
    if (surface) {
      store.material = surface.id;
      entry.collider.setFriction(surface.friction);
      entry.collider.setRestitution(surface.bounce);
      entry.body.wakeUp();
    }
    if (!share) return;
    const id = this.idOf(entry);
    if (id) this.sync?.painted(id, store.paint ?? 0xffffff, store.material);
  }

  /** Was der Inspektor über ein Objekt zu sagen hat. */
  private describeProp(entry: PhysicsBody): PropReport {
    const linvel = entry.body.linvel();
    const angvel = entry.body.angvel();
    const speed = Math.hypot(linvel.x, linvel.y, linvel.z);
    const store = entry.object.userData as { material?: string; paint?: number };
    const id = this.idOf(entry);
    const loose = this.loose.get(entry);
    return {
      label: loose?.tool.label ?? labelOfProp(entry.object),
      id: id ?? 'nur hier',
      mass: Math.max(0, entry.collider.mass()),
      size: _size.copy(entry.halfExtents).multiplyScalar(2).clone(),
      speed,
      spin: Math.hypot(angvel.x, angvel.y, angvel.z),
      height: entry.object.position.y,
      material: findMaterial(store.material).label,
      shape: SHAPE_LABELS[entry.shape.kind],
      friction: entry.collider.friction(),
      bounce: entry.collider.restitution(),
      sleeping: entry.body.isSleeping(),
      held: this.handHolding(entry) !== null,
    };
  }

  protected buildProps(): void {
    const physics = this.physics!;

    const cube = createCompanionCube(0.5);
    cube.userData.propKind = 'cube';
    cube.position.set(-5.4, 1.9, -5.4);
    this.root.add(cube);
    this.registerProp(
      physics.addDynamic(cube, { mass: 8, friction: 0.8, restitution: 0.1 }),
      'cube-0',
    );

    const second = createCompanionCube(0.4);
    second.userData.propKind = 'cube';
    second.position.set(1.8, 0.3, 2.2);
    this.root.add(second);
    this.registerProp(
      physics.addDynamic(second, { mass: 5, friction: 0.8, restitution: 0.1 }),
      'cube-1',
    );

    // **Die Steine sind die aus dem magischen Beutel** — derselbe Bauplan,
    // dieselbe Masse, derselbe Collider (`createPropShape('domino')`). Vorher
    // standen hier eigene: blau nach weiß verlaufend, mit eigenen Zahlen für
    // Reibung und Dämpfung daneben. Zwei Sorten Domino in einer Welt sind eine
    // zu viel — wer einen aus dem Beutel neben die Reihe stellt, soll ihn nicht
    // von den anderen unterscheiden können, und wer die Zahlen ändert, soll das
    // an einer Stelle tun.
    //
    // Twice the size means twice the spacing, or they stand on each other.
    for (let index = 0; index < 14; index++) {
      const blueprint = createPropShape('domino');
      const domino = blueprint.mesh;
      domino.userData.propKind = 'domino';
      domino.position.set(-4.2 + index * 0.62, DOMINO_SIZE.y / 2 + 0.001, 1.6);
      this.root.add(domino);
      this.registerProp(this.propBody(domino, blueprint), `domino-${index}`);
    }
  }

  /**
   * Der Körper zu einem Bauplan aus dem Beutel.
   *
   * Dieselben Zahlen für alles, was daraus gebaut wird: das Herbeigerufene
   * (`createProp`) und die Reihe, die beim Aufbauen der Welt schon dasteht
   * (`buildProps`). Zwei Aufrufstellen mit je einem eigenen Satz Reibung und
   * Rückprall waren zwei Sorten desselben Dings.
   */
  private propBody(object: THREE.Object3D, blueprint: PropPhysics): PhysicsBody {
    object.updateWorldMatrix(true, false);
    return this.physics!.addDynamic(object, {
      shape: blueprint.shape,
      halfExtents: blueprint.halfExtents,
      mass: blueprint.mass,
      friction: 0.7,
      // Fast alles im Labor soll liegen bleiben, wo es hinfällt. Was springen
      // soll, sagt es im Bauplan — eine Murmel, die nicht hüpft, ist ein Kies.
      restitution: blueprint.restitution ?? 0.05,
      ccd: blueprint.ccd ?? false,
    });
  }

  /**
   * The fixture props are built the same way on every machine, so a fixed id
   * is enough to talk about them. Conjured ones carry the id of their creator.
   */
  protected registerProp(entry: PhysicsBody, id: string): void {
    entry.object.updateWorldMatrix(true, false);
    this.spawns.set(entry, entry.object.matrixWorld.clone());
    this.props.push(entry);
    this.bodies.set(id, entry);
    this.ids.set(entry, id);
  }

  // --- Schwerelosigkeit an einer Stelle -------------------------------------

  /**
   * Ein **Raumstück ohne Schwerkraft**: was darin losgelassen wird, bleibt
   * hängen.
   *
   * Gebaut wurde das für den Poseraum des Eingaberaums, und der Grund dafür
   * war eine Messung: eine Handhaltung an einem Werkzeug stellt man ein,
   * indem man die Hand daran legt — und dazu muss das Werkzeug stillstehen,
   * und zwar dort, wo man es haben will, nicht auf dem Boden. Die Welt ist
   * seit September 2026 gelöscht; die Zone steht weiter da, weil sie keine
   * Welt kennt und jede sie aufmachen darf.
   *
   * Eine **Zone** und kein Sonderfall im Loslassen, weil es sonst zwei wären:
   * ein Werkzeug fliegt über `releaseTool` aus der Hand, ein Gegenstand über
   * `release`, und beide könnten auch von außen hineingeworfen werden. Eine
   * Zone, die jedes Bild nachsieht, kennt keinen dieser Wege und trifft
   * trotzdem alle.
   */
  protected floatZone: { contains(point: THREE.Vector3): boolean } | null = null;

  /**
   * Was gerade schwebt — und was es vorher war.
   *
   * Gemerkt wird der **Zustand vor dem Eintritt** und nicht „Schwerkraft 1":
   * ein geworfenes Messer fliegt mit abgeschalteter Schwerkraft geradeaus
   * (`releaseTool`), und wer es beim Verlassen der Zone auf 1 setzte, ließe es
   * mitten im Flug fallen.
   */
  private readonly floating = new Map<PhysicsBody, [number, number, number]>();

  /**
   * Wie stark ein schwebender Gegenstand ausgebremst wird.
   *
   * Ohne Dämpfung behielte er den Schwung, mit dem er losgelassen wurde, und
   * driftete langsam durch den Kasten davon — und was man justieren will, soll
   * stehen, wo man es hingelegt hat. Mit ihr kommt er in einem knappen
   * Wimpernschlag zur Ruhe und lässt sich trotzdem noch anstupsen.
   */
  private static readonly FLOAT_DAMPING = 4.5;

  /**
   * **Festgestellt**: was schwebt, rührt sich gar nicht mehr.
   *
   * Schwerelos ist nicht dasselbe wie still. Ein Werkzeug im Kasten hängt zwar,
   * aber es hängt *weich*: die Hand, die man daran legt, stupst es an, und
   * gerade beim Einmessen einer Handhaltung ist das genau die Bewegung, die
   * man nicht will — man legt die Hand an, das Ding weicht aus, man rückt nach,
   * und was man am Ende misst, ist die Nachbewegung. Festgestellt steht es wie
   * angeschraubt, bis der Schalter wieder ausgeht.
   *
   * Es hält dabei auch die **Hand** ab: ein festgestelltes Ding lässt sich
   * nicht greifen (`aimGrab`). Das ist keine Härte, sondern der Grund für den
   * Schalter — die blanke Hand, die man zum Messen um ein Werkzeug schließt,
   * *ist* die Greifgeste, und ohne diese Sperre nähme sie einem das Werkzeug
   * bei jedem Versuch wieder weg.
   */
  private floatFixed = false;

  /** Ob der Schalter an ist — die Tafel am Kasten liest es ab. */
  protected floatIsFixed(): boolean {
    return this.floatFixed;
  }

  /** Den Schalter umlegen; gibt zurück, wie er danach steht. */
  protected setFloatFixed(on: boolean): boolean {
    if (this.floatFixed === on) return on;
    this.floatFixed = on;
    for (const entry of this.floating.keys()) this.fixFloating(entry, on);
    return on;
  }

  /** Ob dieser Körper gerade festgestellt ist — was fest ist, wird nicht gegriffen. */
  private fixedInZone(entry: PhysicsBody): boolean {
    return this.floatFixed && this.floating.has(entry);
  }

  /**
   * Einen schwebenden Körper anhalten — oder wieder freigeben.
   *
   * Gesperrt werden **Verschiebung und Drehung** und nicht die Schwerkraft:
   * die ist in der Zone ohnehin aus, und ein Körper ohne Schwerkraft behält
   * trotzdem jeden Stoß. Die Sperre nimmt ihm beides ab, und beim Freigeben
   * steht er da, wo er stand, statt mit dem alten Schwung weiterzuziehen.
   */
  private fixFloating(entry: PhysicsBody, fixed: boolean): void {
    const body = entry.body;
    if (fixed) {
      body.setLinvel(_zeroVelocity, true);
      body.setAngvel(_zeroVelocity, true);
    }
    body.lockTranslations(fixed, true);
    body.lockRotations(fixed, true);
    // Freigegeben heißt: zurück in die eigene Haltung, und ein Möbel steht
    // dann wieder fest und nicht plötzlich kippelig.
    if (!fixed) this.applyStance(entry);
  }

  private updateFloatZone(): void {
    const physics = this.physics;
    if (!physics) return;
    const zone = this.floatZone;
    if (!zone && this.floating.size === 0) return;

    const seen = new Set<PhysicsBody>();
    for (const entry of physics.dynamicBodies) {
      seen.add(entry);
      let inside = false;
      if (zone && !entry.carried) {
        const at = entry.body.translation();
        inside = zone.contains(_floating.set(at.x, at.y, at.z));
      }
      const before = this.floating.get(entry);
      if (inside === Boolean(before)) continue;
      if (inside) {
        this.floating.set(entry, [
          entry.body.gravityScale(),
          entry.body.linearDamping(),
          entry.body.angularDamping(),
        ]);
        entry.body.setGravityScale(0, true);
        entry.body.setLinearDamping(PortalWorld.FLOAT_DAMPING);
        entry.body.setAngularDamping(PortalWorld.FLOAT_DAMPING);
        // Ein schlafender Körper merkt von einer geänderten Schwerkraft nichts.
        entry.body.wakeUp();
        // Wer bei angezogenem Schalter hineinkommt, steht sofort still.
        if (this.floatFixed) this.fixFloating(entry, true);
      } else if (before) {
        this.floating.delete(entry);
        // Erst wieder beweglich, dann wieder schwer: eine gesperrte Achse
        // nähme die zurückgegebene Schwerkraft sonst nicht an.
        this.fixFloating(entry, false);
        entry.body.setGravityScale(before[0], true);
        entry.body.setLinearDamping(before[1]);
        entry.body.setAngularDamping(before[2]);
        entry.body.wakeUp();
      }
    }
    // Was die Physik nicht mehr kennt, wird hier nur vergessen und nicht mehr
    // angefasst: ein freigegebener Körper beantwortet keine Frage mehr.
    for (const entry of [...this.floating.keys()]) {
      if (!seen.has(entry)) this.floating.delete(entry);
    }
  }

  /**
   * Das **Werkzeug**, das gerade in der Schwerelosigkeit hängt — oder `null`.
   *
   * Nur ein Werkzeug und nicht irgendein Gegenstand: der Poseraum misst eine
   * Hand *an einem Werkzeug*, und dazu gehört dessen Lage im Griff. Liegen
   * mehrere darin, gewinnt das zuerst hineingelegte — wer eine zweite Zange
   * dazulegt, misst weiter an der ersten, statt dass die Anzeige springt.
   */
  protected floatingTool(): Tool | null {
    for (const entry of this.floating.keys()) {
      const loose = this.loose.get(entry);
      if (loose) return loose.tool;
    }
    return null;
  }

  /**
   * Puts a tool into the *room* instead of onto the belt: it lies (or, with
   * `floating`, hangs) where the world put it until a hand takes it, exactly
   * like a tool somebody dropped.
   *
   * A room-placed tool is deliberately not the belt's spare — it never goes
   * into `tools`, so the shelf and the hip build their own copy and this one
   * stays the thing lying over there. A dark house needs that: the torch has
   * to be *somewhere to be found*, not one menu away.
   */
  protected placeTool(
    id: string,
    position: THREE.Vector3,
    quaternion?: THREE.Quaternion,
    floating = false,
  ): Tool | null {
    const physics = this.physics;
    const tool = createTool(id);
    if (!physics || !tool) return null;

    this.liveTools.add(tool);
    this.root.add(tool);
    tool.position.copy(position);
    if (quaternion) tool.quaternion.copy(quaternion);
    tool.visible = true;
    tool.updateWorldMatrix(true, true);

    const entry = physics.addDynamic(tool, {
      shape: { kind: 'box' },
      halfExtents: toolHalfExtents(tool, _probe),
      mass: 1.2,
      friction: 0.8,
      restitution: 0.05,
      // A floating tool that gets knocked about should come to rest again
      // rather than drift off down the corridor for the rest of the session.
      linearDamping: floating ? 1.6 : 0,
      angularDamping: floating ? 1.6 : 0,
    });
    entry.previousPosition.copy(tool.position);
    this.props.push(entry);
    // Kam von keiner Hüfte: eigener Topf im Budget, damit ein Werkzeug, das
    // von Anfang an im Raum liegt, keinem Gürtelplatz seinen Vorrat wegnimmt.
    this.loose.set(entry, { tool, entry, gliding: false, home: null, hip: null });
    if (floating) entry.body.setGravityScale(0, true);
    return tool;
  }

  /**
   * Alles, worauf gerade gemalt werden kann.
   *
   * Gefragt werden die Werkzeuge selbst (`Tool.paintSurface`), und zwar jedes
   * Mal neu: eine Liste, die die Welt mitführte, überlebte kein weggeräumtes
   * Werkzeug. Es sind ohnehin selten mehr als zwei — Staffeleien stellt man
   * hin, man sät sie nicht aus.
   */
  private paintSurfaces(): readonly PaintSurface[] {
    const surfaces: PaintSurface[] = [];
    for (const tool of this.liveTools) {
      const surface = tool.paintSurface();
      if (surface) surfaces.push(surface);
    }
    return surfaces;
  }

  private idOf(entry: PhysicsBody): string | null {
    return this.ids.get(entry) ?? null;
  }

  /** False while another player's copy of the simulation owns this prop. */
  private drives(entry: PhysicsBody): boolean {
    const id = this.idOf(entry);
    return !id || !this.sync || this.sync.drives(id);
  }

  // --- tools on the belt --------------------------------------------------

  /**
   * The belt starts out with the two single portal guns, one on each hip —
   * but nothing here is special about them. Any tool fits any hip, and the
   * shelf in the wrist menu hands out the rest.
   */
  private setupTools(ctx: WorldContext): void {
    const belt = new ToolBelt(ctx.rig);
    this.belt = belt;

    for (const [id, side] of this.beltLoadout()) {
      // Ein eigenes Exemplar je Hüfte: zweimal dieselbe Id im Regal wäre sonst
      // zweimal dasselbe Ding, und die zweite Hüfte bliebe leer.
      const tool = this.freshTool(id);
      if (tool) belt.stow(tool, side);
    }

    for (const [key, color] of [
      ['a', COLOR_BLUE],
      ['b', COLOR_RED],
    ] as const) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.96, 1, 48),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.6,
          toneMapped: false,
          side: THREE.DoubleSide,
        }),
      );
      ring.scale.set(PORTAL_HALF_WIDTH, PORTAL_HALF_HEIGHT, 1);
      ring.renderOrder = 5;
      ring.visible = false;
      this.root.add(ring);
      this.rings.set(key, ring);
    }
  }

  /**
   * A tool, built on first use.
   *
   * Das ist das **eine** Exemplar je Id: das Regal zeichnet sein Modell davon
   * ab, die Menüs lesen Beschriftung und Werte daran. Wer eines in die Hand
   * bekommen will, fragt `freshTool` — dieses hier steckt vielleicht längst an
   * einer Hüfte.
   */
  protected tool(id: string): Tool | null {
    const existing = this.tools.get(id);
    if (existing) return existing;
    const built = createTool(id);
    if (!built) return null;
    this.tools.set(id, built);
    this.liveTools.add(built);
    return built;
  }

  /**
   * Ein Exemplar dieser Id, das **noch nirgends steckt** — für eine Hand, eine
   * Hüfte oder ein Regal.
   *
   * Vorher gab es je Id genau eines, und damit war „zwei Pistolen" nicht
   * vorgesehen: Wer sich aus dem Regal eine zweite in die andere Hand holte,
   * bekam dieselbe, und sie verschwand aus der ersten. Genauso, wer sie links
   * und rechts an den Gürtel hängen wollte. Zwei Waffen sind aber zwei Waffen
   * — man kann sie einzeln nehmen, einzeln werfen, und danach liegen zwei auf
   * dem Boden.
   *
   * Das gepoolte Exemplar wird weiter zuerst gefragt: solange nur eine Pistole
   * im Spiel ist, ist es dieselbe wie eh und je, und das Regal zeichnet sein
   * Modell weiter davon ab. Erst wenn es beschäftigt ist, wächst eine zweite
   * nach — und wie viele davon gleichzeitig draußen sein dürfen, entscheidet
   * nach wie vor `looseBudget.ts`.
   */
  protected freshTool(id: string): Tool | null {
    const pooled = this.tool(id);
    if (pooled && this.toolFree(pooled)) return pooled;
    const built = createTool(id);
    if (!built) return null;
    this.liveTools.add(built);
    return built;
  }

  /** Weder in einer Hand, noch an einer Hüfte, noch irgendwo im Raum. */
  private toolFree(tool: Tool): boolean {
    if (tool.heldBy || tool.parked) return false;
    if (this.belt?.slotOf(tool)) return false;
    return !this.isLoose(tool);
  }

  /**
   * Taking tools out of the belt, putting them back, and handing the buttons
   * of the holding hand to whatever it carries.
   */
  private updateTools(dt: number, ctx: WorldContext): void {
    const belt = this.belt;
    const host = this.host;
    if (!belt || !host) return;

    // Vor allem anderen: Die Hand am Schirm ist selbst eine Hand, und was in
    // ihr liegt, will gleich mit dem Rest der Werkzeuge nachgeführt werden.
    this.updateScreenHand(ctx, dt);
    // Und was sie **trägt**, noch davor — der Benutzen-Knopf gehört dann ihr
    // und nicht dem, was vor der Figur steht (`updateUsables` kommt danach).
    this.updateScreenCarry(dt, ctx);
    this.trackHands(dt, ctx);

    // The hips light up for whichever hand is carrying something.
    _carried.length = 0;
    for (const [hand] of this.held) {
      const controller = ctx.input.get(hand);
      if (!controller?.tracked) continue;
      const slot = _carried.length === 0 ? _carryA : _carryB;
      gripOf(controller).getWorldPosition(slot);
      _carried.push(slot);
    }
    belt.update(dt, ctx.rig, ctx.avatar.bodyYaw, _carried);

    const presenting = ctx.renderer.xr.isPresenting;
    // Ohne Brille greift keine Hand an die Hüfte — und ein Gürtel in
    // Spielergröße war von oben eine zweite Pistole vor der Brust der Figur.
    belt.setWorn(presenting);
    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand) continue;
      const tool = this.held.get(hand) ?? null;
      // A parked tool hangs in the room while it is being adjusted: that hand
      // is free to move without it, and must not put it away by accident.
      if (tool?.parked) continue;

      if (!controller.tracked) {
        if (tool) this.stowTool(tool);
        continue;
      }

      // One rule for both kinds of hand: a bare hand's grip is the three
      // fingers closing onto the palm (`handGestures.ts`), a controller's is
      // the button under them.
      const grabPressed = controller.squeeze.justPressed;
      gripOf(controller).getWorldPosition(_hand);
      const slot = belt.nearest(_hand, ctx.rig);

      if (!tool) {
        // **Erst die andere Hand, dann die Hüfte.** Wer beide Hände
        // zusammenführt und greift, will das Werkzeug übernehmen und nicht das
        // Regal hinter seiner Hüfte aufmachen — und über einer Hüfte stehen
        // die Hände nun einmal beieinander.
        const passed = grabPressed ? this.handoverTool(ctx, hand, gripOf(controller)) : null;
        if (passed) {
          this.takeTool(ctx, controller, passed);
          continue;
        }
        // A hand that is holding the other end of a two-handed tool is busy —
        // squeezing it must not also pull something off the hip.
        if (grabPressed && slot?.tool && !this.claimedHand(hand)) {
          this.takeTool(ctx, controller, slot.tool);
        }
        continue;
      }

      // A tool is held while the grip is down. A sticky one is taken once and
      // put away by holding it against a hip instead — its grip button belongs
      // to the tool itself. A tool that just came back from the adjustment
      // tool waits for the hand to close around it again before the usual
      // "grip up = let go" applies.
      if (tool.regrip && controller.squeeze.pressed) tool.regrip = false;
      if (tool.sticky) {
        if (grabPressed && slot) {
          this.stowTool(tool, slot.side);
          continue;
        }
      } else if (!controller.squeeze.pressed && !tool.regrip) {
        // Over a hip it goes back on the belt; anywhere else it falls, and a
        // fresh one grows on the hip it came from.
        if (slot) this.stowTool(tool, slot.side);
        else this.dropTool(ctx, tool);
        continue;
      }
      if (tool.sticky && grabPressed) tool.onGrab(controller, host);

      // The trigger belongs to the menu whenever *this* hand's ray rests on
      // it — the other hand keeps its trigger, both of them point now.
      if (!presenting || ctx.pointer.hoveringWith(controller.handedness)) continue;
      if (controller.trigger.justPressed) tool.onTrigger(controller, host);
      if (controller.trigger.justReleased) tool.onTriggerUp(controller, host);
      if (controller.primary.justPressed) tool.onPrimary(controller, host);
    }

    // **Und derselbe Trigger für die Hand am Schirm.** Dieselben zwei Zeilen
    // wie oben und kein zweiter Weg zum Schießen: Was der Linksklick auslöst,
    // entscheidet das Werkzeug (`PlayerRig.setTrigger` → `ScreenHand`). Zeigt
    // der Zeiger gerade auf ein Panel, gehört der Klick dem Panel.
    const screen = this.screenHand;
    const screenTool = screen ? this.held.get('right') : null;
    if (screen && screenTool && !screenTool.parked && !ctx.pointer.hovering) {
      if (screen.state.trigger.justPressed) screenTool.onTrigger(screen.state, host);
      if (screen.state.trigger.justReleased) screenTool.onTriggerUp(screen.state, host);
    }

    // Every tool there is: on a hip, in a hand, or lying on the floor. A
    // stowed or loose one gets its frame too — `applyHold` steps aside for
    // both, because the belt and the physics own where those are.
    for (const tool of [...this.liveTools]) {
      // Die Liste ist eine Kopie, denn ein Werkzeug darf in seinem eigenen
      // `update` etwas auslösen, das Werkzeuge kommen und gehen lässt — die
      // Staffelei nimmt sich an ihren Griffen selbst wieder in die Hand. Was
      // dabei ausgemustert wurde, ist hier aber weg und wird nicht mehr
      // angefasst: ein weggeräumtes Werkzeug beantwortet keine Frage mehr.
      if (!this.liveTools.has(tool)) continue;
      const controller = tool.heldBy ? this.handOf(ctx, tool.heldBy) : null;
      // Every held tool is turned out of the grip and onto the pointing ray
      // before it runs — one place, so no tool can aim 30° high again.
      tool.applyHold(controller);
      tool.update(dt, host, controller);
    }
    this.updateLooseTools(dt);
    this.updateMelee(dt);
  }

  /**
   * **Was eine Klinge in der Hand anrichtet.**
   *
   * Eine Kugel fliegt los und trifft; ein Messer liegt in der Hand und ist
   * immer irgendwo. Der Unterschied ist der Grund, warum hier nicht dieselbe
   * Zeile steht wie bei den Kugeln, sondern eine eigene Rechnung davor
   * (`tools/meleeSwing.ts`): Ein Schlag braucht **Tempo** und danach eine
   * **Pause**, sonst tötet ein hingehaltenes Messer sechzigmal in der Sekunde.
   *
   * Getroffen wird entlang der Strecke, die die Spitze seit dem letzten Bild
   * gefahren ist — dieselbe Frage wie bei einer Kugel, nur über zehn
   * Zentimeter statt über zwei Meter (`npc/npcHit.ts`).
   */
  private updateMelee(dt: number): void {
    const director = this.director;
    if (!director) {
      this.swings.clear();
      return;
    }
    for (const tool of this.swings.keys()) {
      // Weggelegt, umgehängt, geworfen: was nicht mehr in einer Hand liegt,
      // fängt beim nächsten Mal von vorn an — sonst zieht die erste Bewegung
      // danach eine Strecke quer durch den Raum.
      if (this.held.get(tool.heldBy ?? 'left') !== tool) this.swings.delete(tool);
    }

    for (const tool of this.held.values()) {
      if (tool.meleeDamage <= 0 || !tool.meleeTip(_swingTip)) continue;
      let state = this.swings.get(tool);
      if (!state) {
        state = newSwing();
        this.swings.set(tool, state);
      }
      const swing = swingStep(state, _swingTip, dt);
      if (!swing) continue;
      _swingFrom.set(swing.from.x, swing.from.y, swing.from.z);
      _swingTo.set(swing.to.x, swing.to.y, swing.to.z);
      const zone = director.hit(_swingFrom, _swingTo, tool.meleeDamage);
      if (!zone) continue;
      swingHit(state);
      // Dieselbe Rückmeldung wie beim Hammer an einer Kiste: ein Stoß in die
      // Hand und ein tiefer Ton. Ein Treffer, den man nicht spürt, ist in der
      // Brille keiner.
      if (tool.heldBy) this.context?.input.get(tool.heldBy)?.pulse(0.9, 45);
      playTone({ type: 'square', from: 320, to: 90, duration: 0.1, gain: 0.06 });
    }
  }

  /** True while a tool in the *other* hand has taken hold of this one too. */
  private claimedHand(hand: Handedness): boolean {
    for (const tool of this.held.values()) {
      if (tool.heldBy !== hand && tool.claimsHand(hand)) return true;
    }
    return false;
  }

  /**
   * **Ob diese Hand in der Brille gerade benutzen kann** (`useByHand`): kein
   * Werkzeug in ihr, kein Gegenstand, und kein Werkzeug der anderen Hand, das
   * sie mit beansprucht — dieselbe Vorfahrt wie in `updateGrabs`. Eine Welt,
   * die eigene Ziele hat, fragt das, bevor sie einer Hand den Laser nimmt:
   * Eine volle Hand bedient ihre Dinge weiter über den Zeiger.
   */
  protected handUsesFreely(hand: Handedness): boolean {
    return !this.held.has(hand) && !this.grabs.has(hand) && !this.claimedHand(hand);
  }

  private takeTool(ctx: WorldContext, controller: ControllerState, tool: Tool): void {
    const hand = controller.handedness;
    const belt = this.belt;
    const host = this.host;
    if (!hand || !belt || !host) return;

    const busy = this.held.get(hand);
    if (busy === tool) return;
    this.lastActHand = hand;
    if (busy) this.stowTool(busy);

    // A hand can only carry one thing, tool or prop.
    const grab = this.grabs.get(hand);
    if (grab) this.letGo(ctx, hand, grab);
    if (tool.heldBy) this.held.delete(tool.heldBy);

    const home = belt.slotOf(tool);
    if (home) this.homes.set(tool, home.side);
    belt.release(tool);

    // Solange es noch daliegt: ein Werkzeug, dem die *Stelle* etwas bedeutet,
    // kann sie nur jetzt ablesen — nach dem Umhängen steckt es im Griff, und wo
    // die Hand es angefasst hat, ist verloren. Der große Hammer holt sich
    // daraus seinen Punkt am Stiel. Vom Gürtel aus gilt das nicht: dort greift
    // man in einen Ring und nicht an eine Stelle des Werkzeugs.
    if (!home) tool.onReach(controller);

    gripOf(controller).add(tool);
    tool.position.copy(tool.holdPosition);
    tool.quaternion.identity();
    tool.heldBy = hand;
    tool.regrip = false;
    // Aimed before it is ever drawn, so it never flashes up along the grip.
    tool.applyHold(controller);
    tool.visible = true;
    this.held.set(hand, tool);
    // One copy too many away from the belt: the oldest one lying around goes
    // home. Drawing a fresh pistol is exactly how you take the dropped one
    // back — and the sixth throwing star fetches the first.
    this.trimLoose(tool.toolId);
    tool.onTake(controller, host);
    controller.pulse(0.45, 28);
    playPick(true);
  }

  /**
   * @param side the hip to put it on; without one it goes back where it came
   *             from, or onto whichever hip is still free.
   */
  private stowTool(tool: Tool, side?: Handedness): void {
    const belt = this.belt;
    const host = this.host;
    if (tool.heldBy) this.held.delete(tool.heldBy);
    tool.heldBy = null;
    tool.regrip = false;
    tool.parked = false;
    if (host) tool.onStow(host);
    tool.removeFromParent();
    if (!belt) return;

    // Die Hüfte, von der es kam — auch dann, wenn es längst in einer Hand
    // liegt und der Ring dort leer aussieht. `homes` weiß das noch, und ohne
    // diese Zeile bliebe genau der Weg unbemerkt, um den es geht: von der
    // Hüfte in die Hand, in die andere Hand, in die andere Hüfte.
    const from = belt.slotOf(tool)?.side ?? this.homes.get(tool) ?? null;
    const target = side ?? from ?? belt.freeSlot()?.side;
    if (!target) {
      // Both hips taken and nowhere to go: back on the shelf it came from.
      tool.visible = false;
      return;
    }
    const displaced = belt.stow(tool, target);
    this.homes.set(tool, target);
    if (displaced) {
      // A hip that had grown a fresh copy while this one was out does not need
      // two of the same tool — the returning one takes the place back.
      if (displaced.toolId === tool.toolId) this.retireTool(displaced);
      else {
        const free = belt.freeSlot();
        if (free) {
          belt.stow(displaced, free.side);
          this.homes.set(displaced, free.side);
        } else {
          displaced.visible = false;
          this.homes.delete(displaced);
        }
      }
    }
    // Von einer Hüfte auf die andere gesteckt: die erste bleibt nicht leer
    // zurück. Sie weiß, was auf sie gehört (`BeltSlot.stored`), und lässt es
    // nachwachsen — sonst wäre „die Waffe von links nach rechts umhängen" ein
    // Weg, sie zu *verlieren*, und man müsste sie im Regal wieder suchen.
    if (from && from !== target) this.refillSlot(belt.slot(from));
    playPick(false);
  }

  /**
   * Lets a tool go into the room instead of onto a hip.
   *
   * This is what opening the hand now does anywhere but over a belt slot: the
   * tool falls, keeps whatever speed the hand had, and lies there as an object
   * — the other hand can catch it out of the air, exactly like a cube. At the
   * same moment a fresh one grows back on the hip it came off, so taking a
   * pistol, passing it across and drawing a second one is one continuous
   * movement instead of a trip to the shelf.
   *
   * A **gliding** tool (the knife) skips the falling: it carries on along
   * the line it was travelling and stays where it first hits something.
   */
  private dropTool(ctx: WorldContext, tool: Tool): void {
    const physics = this.physics;
    const host = this.host;
    // Without physics there is no floor to fall to — the belt is then the only
    // honest answer.
    if (!physics || !host) {
      this.stowTool(tool);
      return;
    }

    const hand = tool.heldBy;
    // Die Hüfte, von der es kam — und davon getrennt der Topf, aus dem sich
    // das Budget bedient. Ein Werkzeug aus dem Regal hat keine Hüfte, zählt
    // aber zu der Seite, in deren Hand es lag.
    const hip = this.homes.get(tool) ?? null;
    const home = hip ?? hand ?? null;
    // Der **schnellste Moment** der letzten Sekundenbruchteile und nicht das
    // geglättete Jetzt: wer wirft, öffnet die Hand am Ende der Bewegung, und
    // bis der Griffknopf das meldet, bremst der Arm schon wieder ab.
    const motion = hand ? this.handMotion.get(hand) : null;
    if (motion) motion.throwVelocity(_throw);
    _velocity.copy(motion ? _throw : _zeroVelocity).clampLength(0, 12);
    const speed = _velocity.length();

    if (hand) this.held.delete(hand);
    tool.heldBy = null;
    tool.regrip = false;
    tool.parked = false;
    tool.onStow(host);
    this.homes.delete(tool);
    // The spare has to be somebody else from here on: this one is in the room.
    if (this.tools.get(tool.toolId) === tool) this.tools.delete(tool.toolId);

    // Out of the hand and into the room, without moving a millimetre.
    tool.updateWorldMatrix(true, false);
    _matrix.copy(tool.matrixWorld);
    this.root.add(tool);
    this.root.updateWorldMatrix(true, false);
    _matrix.premultiply(_rotationMatrix.copy(this.root.matrixWorld).invert());
    _matrix.decompose(tool.position, tool.quaternion, _probe);
    tool.scale.set(1, 1, 1);
    tool.visible = true;
    tool.updateWorldMatrix(true, false);

    const gliding = tool.glides && speed >= THROW_SPEED;
    // Ein Messer, das wirklich geworfen wird, fliegt nicht dorthin, wo der Arm
    // gerade langfuhr, sondern dorthin, wohin gezielt wurde.
    if (gliding) this.aimThrow(ctx, tool, motion, _velocity);
    const entry = physics.addDynamic(tool, {
      shape: { kind: 'box' },
      halfExtents: toolHalfExtents(tool, _probe),
      mass: 1.2,
      friction: 0.8,
      restitution: 0.05,
      // A thrown star crosses a room in a few frames; without continuous
      // collision it would be on the other side of the wall by the next one.
      ccd: true,
    });
    entry.previousPosition.copy(tool.position);
    this.props.push(entry);
    this.loose.set(entry, { tool, entry, gliding, home, hip });

    entry.body.setLinvel({ x: _velocity.x, y: _velocity.y, z: _velocity.z }, true);
    // **Der Drall der Hand geht mit.** Ein gegriffener Dominostein taumelt,
    // wenn man ihn hochwirft, ein Werkzeug flog wie ein Brett — und der
    // Unterschied lag nicht an der Physik, sondern daran, woher die beiden
    // ihre Drehung bekommen: der Stein hängt als kinematischer Körper an der
    // Hand, und Rapier liest seine Winkelgeschwindigkeit beim Loslassen aus
    // zwei Lagen ab. Ein Werkzeug hängt im Szenengraph und bekommt seinen
    // Körper erst hier, mit allem auf null. Also wird die Drehung der Hand
    // mitgemessen (`throwMotion.ts`) und hier angelegt.
    if (motion && !gliding) {
      motion.throwSpin(_handSpin);
      _spin.set(_handSpin.x, _handSpin.y, _handSpin.z).clampLength(0, MAX_TOOL_SPIN);
      entry.body.setAngvel({ x: _spin.x, y: _spin.y, z: _spin.z }, true);
    }
    if (gliding) {
      // Straight on: no gravity, and an overhand tumble in the plane of the
      // throw — die Spitze geht oben herum nach vorn, in beiden Händen gleich
      // (`throwMotion.ts`). Vorher war es die x-Achse des Werkzeugs, und die
      // liegt links anders herum als rechts.
      entry.body.setGravityScale(0, true);
      if (tumbleAxis(_velocity, _throw)) {
        _spin.set(_throw.x, _throw.y, _throw.z).multiplyScalar(SPIN_RATE);
        entry.body.setAngvel({ x: _spin.x, y: _spin.y, z: _spin.z }, true);
      }
    }
    tool.onThrow(host, speed);

    if (hip && this.belt) this.refillSlot(this.belt.slot(hip));
    this.trimLoose(tool.toolId);
    playPick(false);
  }

  /**
   * **Wohin ein geworfenes Messer fliegt** — die Richtung, nicht das Tempo.
   *
   * Die reine Bewegungsrichtung der Hand war zu wenig: Wer zielt, führt den
   * Arm von oben nach unten und hält die Klinge dabei auf das Ziel; der Wurf
   * ging dann in den Boden, und richtig hinbewegen ließ er sich auch nicht,
   * weil das die Wurfbewegung selbst ist. Also zählen drei Dinge zusammen
   * (`throwMotion.ts`, mit Test): wohin die Hand fuhr, **wohin sie am Ende
   * zeigte** — über die letzten Bilder gemittelt, in denen auch das etwas
   * verspätet gemeldete Loslassen steckt — und **wohin geschaut wird**.
   *
   * Der Blick zieht nur innerhalb seines Kegels; wer geradeaus schaut und
   * absichtlich nach rechts wirft, wirft nach rechts.
   */
  private aimThrow(
    ctx: WorldContext,
    tool: Tool,
    motion: HandSpeed | null | undefined,
    velocity: THREE.Vector3,
  ): void {
    const speed = velocity.length();
    if (speed <= 0) return;
    tool.getWorldPosition(_gazePoint);
    const aim = motion?.throwAim(_throwAim) ? _throwAim : null;
    const gaze = this.gazeAim(ctx, _gazePoint, _gaze) ? _gaze : null;
    if (!throwDirection(velocity, aim, gaze, _throwDir)) return;
    velocity.set(_throwDir.x, _throwDir.y, _throwDir.z).multiplyScalar(speed);
  }

  /**
   * Der Weg von `from` zu dem, was der Spieler **ansieht**.
   *
   * Nicht die Blickrichtung selbst: Der Blick geht vom Kopf aus, der Wurf von
   * der Hand, und ein halber Meter Versatz sind auf fünf Meter gut fünf Grad
   * daneben. Gesucht ist also der Punkt, auf dem der Blick liegt — wo er auf
   * die Welt trifft, sonst `GAZE_FOCUS` Meter geradeaus.
   *
   * @returns `false`, wenn `from` genau auf diesem Punkt steht — dann gibt es
   *          keine Richtung, und `out` bleibt unberührt.
   */
  private gazeAim(ctx: WorldContext, from: THREE.Vector3, out: THREE.Vector3): boolean {
    this.headRay(ctx, _aimRay);
    const hit = this.castSurface(_aimRay, GAZE_REACH, this.solids);
    const distance = hit
      ? THREE.MathUtils.clamp(_aimRay.origin.distanceTo(hit.point), GAZE_NEAR, GAZE_REACH)
      : GAZE_FOCUS;
    out.copy(_aimRay.direction).multiplyScalar(distance).add(_aimRay.origin).sub(from);
    if (out.lengthSq() < 1e-6) return false;
    out.normalize();
    return true;
  }

  /**
   * Lässt auf einer leeren Hüfte das nachwachsen, was auf sie gehört.
   *
   * Die Hüfte selbst weiß das: `BeltSlot.stored` ist ihre Bestückung und
   * überlebt, dass ihr Exemplar gerade woanders ist. Deshalb hat es hier auch
   * keine Werkzeug-Id mehr zu geben — wer eine mitbrächte, könnte eine Hüfte
   * mit etwas füllen, das nie auf ihr lag.
   */
  private refillSlot(slot: BeltSlot): void {
    const belt = this.belt;
    if (!belt || slot.tool || !slot.stored) return;
    const replacement = this.freshTool(slot.stored);
    if (!replacement) return;
    belt.stow(replacement, slot.side);
    this.homes.set(replacement, slot.side);
  }

  /** True while this exact tool is lying around rather than stowed or held. */
  private isLoose(tool: Tool): boolean {
    for (const entry of this.loose.values()) {
      if (entry.tool === tool) return true;
    }
    return false;
  }

  /**
   * Takes back the oldest copies of a tool once one too many is away from the
   * belt — held ones counted, because a pistol in the hand is one of them.
   *
   * Gezählt wird **pro Gürtelplatz** (`looseBudget.ts`): links und rechts sind
   * zwei Vorräte, keiner. Eine Waffe in jeder Hand fallen zu lassen darf die
   * jeweils andere nicht verschwinden lassen — genau das ist vorher passiert.
   *
   * Innerhalb eines Platzes liest sich die Voreinstellung weiter so, wie sie
   * soll: ein Exemplar erlaubt, also holt die frische Pistole von dieser Hüfte
   * die von dieser Hüfte liegengelassene ein. Das Messer sagt fünf, also
   * dürfen fünf pro Hüfte fliegen und liegen, und der sechste Wurf von
   * derselben Hüfte holt den ersten zurück. Ältestes zuerst, in der
   * Reihenfolge, in der losgelassen wurde.
   */
  private trimLoose(id: string): void {
    const entries: LooseEntry<LooseTool | null>[] = [];
    let limit = 1;
    for (const loose of this.loose.values()) {
      if (loose.tool.toolId !== id) continue;
      entries.push({ home: loose.home, spare: true, value: loose });
      limit = loose.tool.looseLimit;
    }
    for (const tool of this.held.values()) {
      if (tool.toolId !== id) continue;
      // Eine Hand ist kein Platz, von dem etwas nachwächst — aber das Werkzeug
      // darin gehört dem Vorrat der Hüfte, von der es kam.
      entries.push({
        home: this.homes.get(tool) ?? tool.heldBy ?? null,
        spare: false,
        value: null,
      });
      limit = tool.looseLimit;
    }
    for (const loose of overBudget(entries, limit)) {
      if (loose) this.retireLoose(loose);
    }
  }

  /** A loose tool goes away for good: out of the room, out of the physics. */
  private retireLoose(loose: LooseTool): void {
    const physics = this.physics;
    this.loose.delete(loose.entry);
    const index = this.props.indexOf(loose.entry);
    if (index >= 0) this.props.splice(index, 1);
    this.highlighted.delete(loose.entry);
    this.locked.delete(loose.entry);
    this.forgetGhost(loose.entry);
    this.flights.delete(loose.entry);
    for (const [hand, grab] of [...this.grabs]) {
      if (grab.entry === loose.entry) this.grabs.delete(hand);
    }
    for (const [hand, link] of [...this.links]) {
      if (link.entry === loose.entry) this.dropLink(hand);
    }
    // The portal ghosts hold a clone of every prop; one of a freed tool would
    // outlive it.
    this.ghosts?.untrack(propKey(loose.entry));
    physics?.remove(loose.entry);
    this.retireTool(loose.tool);
  }

  /** A tool copy that is not needed any more: off the stage and freed. */
  private retireTool(tool: Tool): void {
    this.liveTools.delete(tool);
    this.homes.delete(tool);
    // The spare has to be somebody else from here on: this one is in the room.
    if (this.tools.get(tool.toolId) === tool) this.tools.delete(tool.toolId);
    if (tool instanceof DroneTool) {
      const pointer = this.context?.pointer;
      if (pointer) tool.forgetPointer(pointer);
    }
    tool.removeFromParent();
    tool.disposeTool();
  }

  /** Out of the room and back into a hand — a caught tool is a held tool. */
  private catchLooseTool(hand: Handedness, loose: LooseTool): void {
    const ctx = this.context;
    const controller = ctx?.input.get(hand);
    this.loose.delete(loose.entry);
    const index = this.props.indexOf(loose.entry);
    if (index >= 0) this.props.splice(index, 1);
    this.highlighted.delete(loose.entry);
    this.locked.delete(loose.entry);
    this.forgetGhost(loose.entry);
    this.ghosts?.untrack(propKey(loose.entry));
    this.physics?.remove(loose.entry);
    if (!ctx || !controller?.tracked) {
      // Nothing to catch it after all; the belt takes it rather than the room
      // keeping a tool with no body left.
      this.stowTool(loose.tool);
      return;
    }
    this.takeTool(ctx, controller, loose.tool);
  }

  /**
   * The tools that are lying around, and the one thing they can still be
   * doing: gliding. A knife keeps its speed until the line it is on meets
   * something, and then it stops dead and stays there — sweeping the step
   * ourselves rather than waiting for a bounce is what makes it *stick* in the
   * wall instead of rattling off it.
   */
  private updateLooseTools(dt: number): void {
    const physics = this.physics;
    if (!physics) return;
    for (const loose of [...this.loose.values()]) {
      if (!loose.gliding) continue;
      const velocity = loose.entry.body.linvel();
      _velocity.set(velocity.x, velocity.y, velocity.z);
      const speed = _velocity.length();
      const translation = loose.entry.body.translation();
      _point.set(translation.x, translation.y, translation.z);
      if (speed < THROW_SPEED) {
        this.stickTool(loose, _point);
        continue;
      }
      _ray.origin.copy(_point);
      _ray.direction.copy(_velocity).divideScalar(speed);
      const reach = speed * dt + STICK_MARGIN;

      // **Erst die Leute, dann die Wand.** Ein geworfenes Messer, das in einem
      // Zombie steckt, hat ihn getroffen und nicht die Wand dahinter. Gefragt
      // wird dabei dieselbe **Strecke**, die gleich die Wände bekommen — bei
      // einem schnellen Wurf oder einem ausgelassenen Bild ist sie länger als
      // ein Zombie dick, und ein Punkt ginge dann mitten durch ihn hindurch.
      if (loose.tool.meleeDamage > 0 && this.director) {
        _swingTo.copy(_point).addScaledVector(_ray.direction, reach);
        const zone = this.director.hit(_point, _swingTo, loose.tool.meleeDamage);
        if (zone) {
          // Es bleibt **nicht** stecken, sondern fällt: Wo es steckte, geht
          // gleich jemand um, und ein Messer, das in der Luft hängt, wo eben
          // noch ein Zombie stand, sieht nach einem Fehler aus.
          loose.gliding = false;
          playTone({ type: 'square', from: 380, to: 120, duration: 0.1, gain: 0.05 });
          continue;
        }
      }

      const hit = this.castSurface(_ray, reach, this.solids);
      if (hit) {
        // A hair *into* the wall, so it reads as stuck rather than as resting
        // against it.
        this.stickTool(loose, _point.copy(hit.point).addScaledVector(_ray.direction, 0.02));
        continue;
      }
      const along = this.glideProp(loose, reach);
      if (along !== null) this.stickTool(loose, _point.addScaledVector(_ray.direction, along));
    }
  }

  /**
   * How far along `_ray` the next prop is, or null when there is none inside
   * `reach`. Everything the star could not stick into is skipped — itself
   * first of all, since the ray starts inside its own box.
   */
  private glideProp(loose: LooseTool, reach: number): number | null {
    let best: number | null = null;
    for (const entry of this.props) {
      if (entry === loose.entry || this.loose.has(entry)) continue;
      if (this.handHolding(entry) || this.flights.has(entry)) continue;
      _toolBox.setFromObject(entry.object);
      if (!_ray.intersectBox(_toolBox, _probe)) continue;
      const distance = _ray.origin.distanceTo(_probe);
      if (distance > reach || (best !== null && distance >= best)) continue;
      best = distance;
    }
    return best;
  }

  /** Stops a gliding tool where it is and leaves it there. */
  private stickTool(loose: LooseTool, at: THREE.Vector3): void {
    const physics = this.physics;
    loose.gliding = false;
    if (!physics) return;
    loose.entry.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    loose.entry.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    loose.entry.body.setTranslation({ x: at.x, y: at.y, z: at.z }, true);
    // Fixed, not dynamic: a star that stuck in a wall has no business sliding
    // down it, and gravity is exactly what would make it do that.
    loose.entry.body.setBodyType(physics.rapier.RigidBodyType.Fixed, true);
    loose.entry.previousPosition.copy(at);
    if (this.host) loose.tool.onStick(this.host);
  }

  /**
   * How fast each hand is moving — what a let-go tool is thrown with.
   *
   * Gemerkt wird dabei nicht nur das laufende Tempo, sondern das der letzten
   * Sekundenbruchteile: geworfen wird mit dem **schnellsten Moment** darin und
   * nicht mit dem, was beim Loslassen noch übrig ist (`throwMotion.ts`).
   *
   * Dazu kommt, **wohin die Hand zeigt** — und zwar dieselbe Richtung, in die
   * ein gehaltenes Werkzeug zeigt: der Halteraum plus die Zielkorrektur
   * (`aimQuaternion`), also der Zeigestrahl und nicht die Griffachse. Am
   * Controller liegen die beiden gut 30° auseinander, und eine Wurfrichtung
   * aus der Griffachse zielte um genau diese 30° daneben.
   */
  private trackHands(dt: number, ctx: WorldContext): void {
    for (const side of ['left', 'right'] as const) {
      let motion = this.handMotion.get(side);
      if (!motion) {
        motion = new HandSpeed();
        this.handMotion.set(side, motion);
      }
      const controller = ctx.input.get(side);
      if (!controller?.tracked || dt <= 0) {
        motion.forget();
        continue;
      }
      gripOf(controller).getWorldPosition(_handSpeed);
      gripOf(controller).getWorldQuaternion(_handTurn);
      // Die Lage, die ein Werkzeug in dieser Hand hätte — daraus sein -Z.
      _aimTurn.copy(_handTurn).multiply(aimQuaternion(controller, _quaternion));
      _handAim.set(0, 0, -1).applyQuaternion(_aimTurn);
      motion.feed(_handSpeed, dt, _handTurn, _handAim);
    }
  }

  /**
   * Puts a specific tool into a hand, used by the tool shelf — und vom
   * Waffenregal im Schießgang, das genau dasselbe tut, nur an einer Stelle im
   * Raum statt in einem Menü.
   */
  protected equipTool(ctx: WorldContext, hand: Handedness | null, id: string): void {
    // Ein freies Exemplar, kein umgehängtes: das Regal soll eine zweite
    // Pistole geben können, ohne die erste aus der anderen Hand zu ziehen.
    const tool = this.freshTool(id);
    if (!tool) return;
    // Without a known hand, take whichever one is still free.
    const target: Handedness =
      hand ?? (this.held.has('right') || this.grabs.has('right') ? 'left' : 'right');
    const controller = ctx.input.get(target);
    if (!controller?.tracked) {
      ctx.notify('Keine Hand für das Werkzeug gefunden');
      return;
    }
    if (tool.heldBy === target) return;
    this.takeTool(ctx, controller, tool);
    ctx.notify(tool.label);
  }

  /** Station inventory uses the same held objects and hip storage as grabbing. */
  protected carriedTool(hand: Handedness): Tool | null {
    return this.held.get(hand) ?? null;
  }

  protected stowCarriedTool(hand: Handedness): void {
    const tool = this.held.get(hand);
    if (tool) this.stowTool(tool, hand);
  }

  /** The gun in a hand that can place this portal, if there is one. */
  private heldGunFor(key: PortalKey): PortalGunTool | null {
    for (const tool of this.held.values()) {
      if (tool instanceof PortalGunTool && tool.keys.includes(key)) return tool;
    }
    return null;
  }

  /** Everything a tool may ask of this room. */
  private buildHost(ctx: WorldContext): ToolHost {
    // Der Umweg über eine Variable ist hier nicht zu vermeiden: `ctx` unten ist
    // ein **Getter** in einem Objektliteral, und ein Getter bringt sein eigenes
    // `this` mit — eine Pfeilfunktion, die das verhindern würde, gibt es für
    // Getter nicht.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const world = this;
    void ctx;
    return {
      // The engine hands out a fresh context object every frame, so this reads
      // the current one rather than keeping the one from init.
      get ctx(): WorldContext {
        return world.context!;
      },
      root: this.root,
      physics: this.physics!,
      props: () => this.props,
      notify: (message) => this.context?.notify(message),
      shootPortal: (key, origin, direction) => this.shootPortal(key, origin, direction),
      aimAt: (origin, direction, range) => {
        _ray.origin.copy(origin);
        _ray.direction.copy(direction).normalize();
        return this.findAimTarget(_ray, range ?? REMOTE_RANGE);
      },
      propAt: (point) => this.findProp(point),
      castSurface: (origin, direction) => {
        _ray.origin.copy(origin);
        _ray.direction.copy(direction).normalize();
        // Tools hit whatever is solid; only portals care about the difference
        // between a wall that holds a portal and one that does not.
        const hit = this.castSurface(_ray, 60, this.solids);
        return hit ? ({ point: hit.point, normal: hit.normal } as SurfaceHit) : null;
      },
      setTimeScale: (scale) => {
        // Nach unten bis zum Stillstand — angehaltene Zeit ist die
        // Voraussetzung für das Einzelbild —, nach oben bis zum Vierfachen.
        // Weiter geht ohnehin nichts: die Simulation rechnet höchstens vier
        // feste Schritte pro Frame, alles darüber wäre eine Lüge im Menü.
        this.timeScale = THREE.MathUtils.clamp(scale, 0, 4);
      },
      stepFrames: (count) => {
        this.pendingSteps += Math.max(1, Math.round(count));
      },
      saveWorldSnapshot: () => this.saveSnapshot(),
      loadWorldSnapshot: () => this.loadSnapshot(),
      hasWorldSnapshot: () => this.hasSnapshot(),
      duplicateProp: (entry) => this.duplicateProp(entry),
      conjureProp: (kind, hand) => {
        this.conjureProp(this.context!, kind, hand);
      },
      styleProp: (entry, style) => this.styleProp(entry, style, true),
      paintSurfaces: () => this.paintSurfaces(),
      inspectProp: (entry) => this.describeProp(entry),
      spawnBullet: (origin, direction, speed, options) =>
        this.spawnBullet(origin, direction, speed, options),
      paintProp: (entry, color) => this.paintProp(entry, color, true),
      setSelection: (entries) => {
        this.selected = entries;
      },
      pullProp: (entry, hand) => {
        if (this.flights.has(entry) || this.handHolding(entry)) return;
        const controller = this.context?.input.get(hand);
        if (!controller) return;
        gripOf(controller).getWorldPosition(_hand);
        this.startFlight(entry, hand, _hand, true);
      },
      pushProp: (entry, direction, strength) => this.pushProp(entry, direction, strength),
      removeProp: (entry) => this.removeProp(entry, true),
      weld: (link) => this.weld(link),
      unweld: (entry) => this.unweld(entry),
      launchPlayer: (velocity) => {
        const locomotion = this.locomotion;
        if (!locomotion) return;
        locomotion.velocity.copy(velocity);
        // A grounded body has its horizontal speed replaced by the stick every
        // frame — so being pulled means being off the ground. Standing still
        // again is one frame of the character controller away.
        if (velocity.lengthSq() > 0) locomotion.grounded = false;
      },
      setFlight: (velocity) => this.locomotion?.setFlight?.(velocity),
      onGround: () => this.locomotion?.grounded ?? false,
      playerVelocity: (target) =>
        this.locomotion ? target.copy(this.locomotion.velocity) : target.set(0, 0, 0),
      teleportPlayer: (point) => this.teleportPlayerTo(point),
      setViewOverride: (position, rotation) => this.setViewOverride(position, rotation),
      heldTool: (hand) => this.held.get(hand) ?? null,
      beltSlot: (side) => this.belt?.slot(side) ?? null,
      beltPose: () => this.belt?.pose() ?? beltOffset(),
      setBeltPose: (offset, persist) =>
        this.belt?.setPose(offset, persist) ?? saveBelt(clampBelt(offset)),
      parkTool: (tool) => this.parkTool(tool),
      unparkTool: (tool) => this.unparkTool(tool),
      stowTool: (tool) => this.stowTool(tool),
      npcs: (): NpcControl | null => this.director,
      signs: (): SignControl | null => this.signs,
      navMap: (): NavGraph | null => this.nav,
      takeTool: (tool, hand) => {
        const now = this.context;
        const controller = now?.input.get(hand);
        if (!now || !controller?.tracked) return false;
        this.takeTool(now, controller, tool);
        return this.held.get(hand) === tool;
      },
    };
  }

  /**
   * Leaves a held tool hanging where it is. It keeps its hand — the hand just
   * stops carrying it — so the player can move that hand to where the tool
   * *should* sit and have the adjustment tool measure the difference.
   */
  private parkTool(tool: Tool): boolean {
    if (!tool.heldBy || tool.parked) return false;
    tool.updateWorldMatrix(true, false);
    _matrix.copy(tool.matrixWorld);
    this.root.add(tool);
    // `add` keeps the local transform, so the world pose has to be put back.
    _matrix.premultiply(_rotationMatrix.copy(this.root.matrixWorld).invert());
    _matrix.decompose(tool.position, tool.quaternion, _probe);
    tool.parked = true;
    return true;
  }

  /** Puts a parked tool back into its hand, with the hold pose it has now. */
  private unparkTool(tool: Tool): boolean {
    if (!tool.parked) return false;
    tool.parked = false;
    const hand = tool.heldBy;
    const controller = hand ? this.context?.input.get(hand) : null;
    if (!controller?.tracked) {
      // Nothing to go back to: the belt takes it instead of the room keeping it.
      this.stowTool(tool);
      return true;
    }
    gripOf(controller).add(tool);
    tool.applyHold(controller);
    tool.regrip = !tool.sticky && !controller.squeeze.pressed;
    return true;
  }

  // --- what the tools may do to the room -----------------------------------

  /** Shoves a prop away; the gravity glove's second button. */
  private pushProp(entry: PhysicsBody, direction: THREE.Vector3, strength: number): void {
    const physics = this.physics;
    if (!physics) return;
    this.endFlight(entry, true);
    const hand = this.handHolding(entry);
    if (hand) this.release(this.context!, hand, this.grabs.get(hand)!, true);

    entry.body.setBodyType(physics.rapier.RigidBodyType.Dynamic, true);
    physics.setCarried(entry, false);
    _velocity.copy(direction).normalize().multiplyScalar(strength);
    entry.body.setLinvel({ x: _velocity.x, y: _velocity.y, z: _velocity.z }, true);
    const id = this.idOf(entry);
    if (id) this.sync?.release(id, _velocity);
  }

  /**
   * Deletes a prop and every trace of it. `share` also tells the others, so
   * the eraser works on the whole session and not just on your own copy.
   */
  protected removeProp(entry: PhysicsBody, share: boolean): void {
    const physics = this.physics;
    if (!physics) return;
    // A dropped tool is a prop as far as the eraser is concerned, but it has
    // its own bookkeeping — freeing the mesh under it and leaving the tool in
    // the update loop is how a world ends up drawing a disposed geometry.
    const loose = this.loose.get(entry);
    if (loose) {
      this.retireLoose(loose);
      return;
    }
    const index = this.props.indexOf(entry);
    if (index < 0) return;
    if (this.floorPieces.has(entry)) this.coverFloor(entry, null);
    // Ein Geist der Abrissbombe gibt seine Materialien zurück, bevor alles
    // freigegeben wird — der Geist selbst gehört allen Zielen.
    if (this.bombTarget?.entry === entry) this.markBombTarget(null);

    const id = this.idOf(entry);
    this.unweld(entry);
    this.endFlight(entry, false);
    for (const [hand, grab] of [...this.grabs]) {
      if (grab.entry === entry) this.grabs.delete(hand);
    }
    for (const [hand, link] of [...this.links]) {
      if (link.entry === entry) this.dropLink(hand);
    }
    this.highlighted.delete(entry);
    this.locked.delete(entry);
    this.forgetGhost(entry);
    this.remoteBusy.delete(entry);
    this.selected = this.selected.filter((candidate) => candidate !== entry);
    this.spawns.delete(entry);
    this.spawned.delete(entry);
    this.ghosts?.untrack(propKey(entry));
    this.props.splice(index, 1);
    if (id) {
      this.bodies.delete(id);
      this.kinds.delete(id);
      this.ids.delete(entry);
      if (share) this.sync?.despawned(id);
    }
    physics.remove(entry);
    disposeTree(entry.object);
  }

  /**
   * Ties two props together. A rigid joint keeps them exactly as they are to
   * each other; a hinge leaves one axis free. Joints live in the local
   * simulation — whoever runs the physics streams the result to everybody.
   */
  private weld(link: WeldRequest): boolean {
    const physics = this.physics;
    if (!physics || link.a === link.b) return false;
    const rapier = physics.rapier;

    // Anchors in each body's own frame, so the joint sits where the iron was.
    const rotA = link.a.body.rotation();
    const rotB = link.b.body.rotation();
    _quaternion.set(rotA.x, rotA.y, rotA.z, rotA.w);
    _rotation.set(rotB.x, rotB.y, rotB.z, rotB.w);
    // Both anchors are the *same* world point, halfway between the two picks:
    // a joint whose ends do not already coincide yanks the props together the
    // moment it appears.
    _far.lerpVectors(link.pointA, link.pointB, 0.5);
    const anchorA = localPoint(link.a, _far, _point);
    const anchorB = localPoint(link.b, _far, _target);

    let data;
    if (link.hinge) {
      // The same world axis, written down in *each* body's own frame — one
      // shared axis would twist whichever body is not aligned with it.
      _direction.copy(link.axis).normalize();
      _up.copy(_direction).applyQuaternion(_rotationB.copy(_rotation).invert());
      _direction.applyQuaternion(_rotationB.copy(_quaternion).invert());
      data = rapier.JointData.revoluteWithAxes(
        { x: anchorA.x, y: anchorA.y, z: anchorA.z },
        { x: anchorB.x, y: anchorB.y, z: anchorB.z },
        { x: _direction.x, y: _direction.y, z: _direction.z },
        { x: _up.x, y: _up.y, z: _up.z },
      );
    } else {
      // Frames chosen so the current relative pose is the rest pose: no jolt
      // when the joint appears.
      _rotation.invert().multiply(_quaternion);
      data = rapier.JointData.fixed(
        { x: anchorA.x, y: anchorA.y, z: anchorA.z },
        { x: 0, y: 0, z: 0, w: 1 },
        { x: anchorB.x, y: anchorB.y, z: anchorB.z },
        { x: _rotation.x, y: _rotation.y, z: _rotation.z, w: _rotation.w },
      );
    }

    const joint = physics.world.createImpulseJoint(data, link.a.body, link.b.body, true);
    this.joints.push({ joint, a: link.a, b: link.b });
    // Welded props are one object now; waking both keeps the pair honest.
    link.a.body.wakeUp();
    link.b.body.wakeUp();
    return true;
  }

  /** Cuts every joint this prop is part of, and says how many there were. */
  private unweld(entry: PhysicsBody): number {
    const physics = this.physics;
    if (!physics) return 0;
    let cut = 0;
    for (let i = this.joints.length - 1; i >= 0; i--) {
      const weld = this.joints[i]!;
      if (weld.a !== entry && weld.b !== entry) continue;
      physics.world.removeImpulseJoint(weld.joint, true);
      this.joints.splice(i, 1);
      cut++;
    }
    return cut;
  }

  /**
   * Hands the view to something that is not the player's body — the drone.
   * The body stays where it stands and is frozen while it is away, and gets
   * its place back when the view comes home.
   */
  private setViewOverride(
    position: THREE.Vector3 | null,
    rotation: THREE.Quaternion | null = null,
  ): void {
    const ctx = this.context;
    if (!ctx) return;

    if (position) {
      if (!this.viewOverride) {
        this.bodyHome.copy(ctx.rig.position);
        this.bodyHomeRotation.copy(ctx.rig.quaternion);
        this.viewOverride = new THREE.Vector3();
        // The body stays standing where it was — and, for as long as the view
        // is away, it is drawn for its owner, so you can look back at yourself.
        ctx.avatar.leaveBehind(ctx.rig.getHeadMatrix(_matrix));
        // Hands, belt and menu belong to the body that stayed behind. They do
        // not fly along, so for as long as the view is away they are simply
        // not there — and nothing on them can be pointed at either.
        this.setBodyVisible(ctx, false);
      }
      this.viewOverride.copy(position);
      if (rotation) {
        if (!this.viewRotation) this.viewRotation = new THREE.Quaternion();
        this.viewRotation.copy(rotation);
      } else {
        this.viewRotation = null;
      }
      ctx.rig.frozen = true;
      return;
    }

    if (!this.viewOverride) return;
    this.viewOverride = null;
    this.viewRotation = null;
    ctx.avatar.comeBack();
    this.setBodyVisible(ctx, true);
    ctx.rig.frozen = false;
    ctx.rig.position.copy(this.bodyHome);
    ctx.rig.quaternion.copy(this.bodyHomeRotation);
    ctx.rig.updateMatrixWorld(true);
    this.locomotion?.resync(ctx.rig);
    this.hasPreviousHead = false;
  }

  /**
   * Everything that hangs on the player's own body: the hands, whatever they
   * carry, both hips and the wrist menu. Hidden together while the view is out
   * in a drone — a pair of hands floating in front of a camera that is nowhere
   * near them is exactly the thing that makes people sick.
   */
  private setBodyVisible(ctx: WorldContext, visible: boolean): void {
    // The procedural hands hang on the controllers, not on the group — so this
    // is a switch of their own, not a `visible` on the parent.
    ctx.hands.hidden = !visible;
    ctx.menu.visible = visible;
    ctx.pointer.enabled = visible;
    this.belt?.setVisible(visible);
    for (const tool of this.held.values()) tool.visible = visible;
  }

  /**
   * Carries the view out to the drone, once everything else has had its say.
   * The rotation goes on first: `setHeadWorldPosition` moves the rig so the
   * head lands on the mark, and where the head is depends on how the rig is
   * turned.
   */
  private applyViewOverride(ctx: WorldContext): void {
    if (!this.viewOverride) return;
    if (this.viewRotation) {
      ctx.rig.quaternion.copy(this.viewRotation);
      ctx.rig.updateMatrixWorld(true);
    }
    ctx.rig.setHeadWorldPosition(this.viewOverride);
    this.hasPreviousHead = false;
  }

  /**
   * Wo der Spieler **steht** — nicht, wo er hinsieht.
   *
   * Der Unterschied ist die Drohne: wer mit ihr unterwegs ist, hat seine Sicht
   * verliehen, und `rig` steht dann dort draußen bei der Maschine. Sein Körper
   * ist aber hiergeblieben (`bodyHome`, `setViewOverride`), und ein Zombie
   * läuft zu dem Körper, den er sehen kann, und nicht zu einer Kamera in der
   * Luft.
   */
  /**
   * **Wohin NPCs laufen** — voreingestellt: zum Spieler.
   *
   * Eigener Haken und nicht direkt `playerFeet`, weil beides gleich aussieht
   * und Verschiedenes bedeutet. `playerFeet` beantwortet „wo steht der
   * Spieler" und wird auch vom Teleporter und von den Werkzeugen gefragt; die
   * Antwort darf nie eine andere sein als die Wahrheit. Diese Frage hier ist
   * „wonach geht ein Verfolger", und die darf eine Welt beugen: In Haunting
   * zieht ein laufendes Radio das Monster an, und das ist der einzige Hebel,
   * den der Hacker in der Einsatzzentrale überhaupt auf es hat.
   */
  protected npcTarget(target: THREE.Vector3): THREE.Vector3 | null {
    return this.playerFeet(target);
  }

  /**
   * **Wo die Figur mit den Sohlen steht**, in Weltmetern — waagerecht der
   * Kopf, senkrecht der Boden des Rigs.
   *
   * `protected`, weil das Konstrukt dieselbe Rechnung braucht
   * (`GridWorld.syncConstructBody`): In der Brille steht der Ursprung des Rigs
   * in der Mitte des Spielraums und der Mensch irgendwo darin, und
   * `position.y` trägt Ducken und Sitzen mit sich herum, die die Füße nicht
   * anheben. Zwei Rechnungen für dieselbe Frage wären zwei Gelegenheiten,
   * eines von beidem zu vergessen.
   */
  protected playerFeet(target: THREE.Vector3): THREE.Vector3 | null {
    const ctx = this.context;
    // Kein Spieler, aber eine Attrappe: die laufende Vorschau der
    // Werkzeugseite. Für alles, was den Spieler sucht, *ist* sie er — und wenn
    // sie weggeschaltet ist, steht eben niemand da (`ghostHere`).
    if (!ctx) return this.ghost && this.ghostHere ? target.copy(this.ghost.position) : null;
    if (this.viewOverride) return target.copy(this.bodyHome);
    ctx.rig.getHeadPosition(target);
    target.y = ctx.rig.getFloorY();
    return target;
  }

  /**
   * **Ein Schlag hat gesessen.**
   *
   * Der Spieler hat keine Lebenspunkte — es gibt in dieser Welt nichts, was
   * sie zählen würde —, und ein Treffer, den man nicht *spürt*, ist trotzdem
   * keiner. Also tut er das, was in einem Raum ohne Punktestand übrig bleibt
   * und in der Brille am deutlichsten ankommt: er **schiebt**. Dazu ein Rütteln
   * in beiden Händen und ein tiefer Ton. Wer eine Lebensanzeige will, hängt sie
   * hier an — die Stelle ist genau eine.
   */
  protected takeHit(direction: THREE.Vector3, strength: number): void {
    const locomotion = this.locomotion;
    if (locomotion) {
      locomotion.velocity.copy(direction).normalize().multiplyScalar(strength);
      // Geschoben wird nur, wer nicht am Boden klebt: eine stehende Kapsel
      // bekommt ihre Waagerechte jedes Bild vom Stick zurückgeschrieben.
      locomotion.grounded = false;
    }
    const ctx = this.context;
    for (const side of ['left', 'right'] as const) ctx?.input.get(side)?.pulse(0.9, 90);
    this.announce('Treffer!');
    playTone({ type: 'sawtooth', from: 260, to: 90, duration: 0.16, gain: 0.06 });
  }

  // --- bullets ------------------------------------------------------------

  /**
   * The pistol's rounds. They are real bodies so they can knock a domino over,
   * but they are not props: nothing grabs them and they tidy themselves up.
   */
  private spawnBullet(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    options: BulletOptions = {},
  ): void {
    const physics = this.physics;
    if (!physics) return;
    const mass = options.mass ?? 0.06;
    const damage = options.damage ?? BODY_DAMAGE;
    // A heavier round is a bigger one — otherwise "brutal" looks like "leicht".
    const radius = 0.014 * Math.cbrt(mass / 0.06);
    const tracer = options.tracer === true;

    const round = this.bulletView(radius, tracer);
    const mesh = round.object;
    mesh.name = 'bullet';
    mesh.position.copy(origin).addScaledVector(direction, 0.05);
    // **Sie fliegt, wie sie zeigt.** Eine Kugel ist rund und hat keine
    // Richtung; eine Patrone hat eine Spitze, und `Bullet.glb` legt sie auf
    // +z. Die Drehung steht hier und nicht erst im Körper, weil der Körper sie
    // beim Anlegen aus der Weltmatrix liest (`PhysicsWorld.addBody`) und von da
    // an jedes Bild zurückschreibt.
    const aim = bulletAim(direction);
    mesh.quaternion.set(aim.x, aim.y, aim.z, aim.w);
    this.root.add(mesh);
    mesh.updateWorldMatrix(true, false);

    const entry = physics.addDynamic(mesh, {
      // **Der Körper bleibt eine Kugel**, auch wenn das Bild eine Patrone ist:
      // Was eine Zahl im Spiel bewegt, wird nicht getauscht (`modelle.md`,
      // Regel 1). Der Halbmesser hängt weiter an der Masse, die Trefferrechnung
      // des Schießstands rechnet weiter gegen die **Strecke** der Kugel
      // (`worlds/range/scoring.faceHit`) und nicht gegen ein Netz.
      shape: { kind: 'ball' },
      halfExtents: new THREE.Vector3(radius, radius, radius),
      mass,
      friction: 0.4,
      restitution: 0.2,
      angularDamping: BULLET_SPIN_DAMPING,
      ccd: true,
      membership: GROUP_PROP,
      // Bullets ignore the player who fired them, otherwise the recoil is you.
      //
      // **Und sie ignorieren, wer herumläuft.** Ein NPC ist in der Physik ein
      // Zylinder, der breiter ist als der Körper, den man sieht; eine Kugel
      // prallte daran ab, blieb eine Handbreit vor der Trefferzone stehen und
      // zählte nie. Was ein Treffer ist, entscheidet die **Strecke**
      // (`bulletTravelled` → `npc/npcHit.ts`) — und dafür muss die Kugel
      // hindurchfliegen dürfen.
      filter: ALL_GROUPS & ~GROUP_PLAYER & ~GROUP_HAND & ~GROUP_NPC,
    });
    _velocity.copy(direction).multiplyScalar(speed);
    entry.body.setLinvel({ x: _velocity.x, y: _velocity.y, z: _velocity.z }, true);
    this.bullets.push({
      entry,
      life: BULLET_LIFETIME,
      damage,
      trail: tracer ? this.newTrail() : null,
      from: mesh.position.clone(),
      spent: false,
      skins: round.skins,
    });
  }

  /**
   * **Das Bild einer Patrone** — aus dem Regal, wenn es da ist, sonst das
   * gerechnete Kügelchen.
   *
   * `kaykitModelNow` antwortet **ohne Warten**: Ist die Vorlage im Speicher,
   * kommt eine Kopie zurück, sonst `null` und das Laden ist angestoßen (siehe
   * `core/kaykitModel.ts`). Genau dafür ist es da, und genau das braucht eine
   * Stelle, an der im Sekundentakt Dinge entstehen — ein `GLTFLoader`-Aufruf je
   * Schuss wäre absurd, ein `await` je Schuss wäre eine Kugel, die einen
   * Wimpernschlag nach dem Knall losfliegt. Damit nicht ausgerechnet der erste
   * Schuss der einzige ohne Modell ist, wird die Datei beim Betreten der Welt
   * vorgewärmt (`warmBullet`).
   *
   * ## Wie groß, und warum das eine Entscheidung ist
   *
   * Der Halbmesser der gerechneten Kugel bleibt, was er war — er ist die Hülle
   * des Körpers. Das Modell wird daran gemessen: `bulletScale` macht es so
   * lang wie **vier Halbmesser**, also doppelt so lang wie das Kügelchen dick
   * war. Die Rechnung dahinter und was sie kostet, steht in `bulletFit.ts`;
   * kurz: Von der Seite ist die Patrone knapp doppelt so groß wie vorher, von
   * vorn ist sie dünner.
   *
   * ## Und sie wirft keinen Schatten
   *
   * Eine Regalkopie tut das sonst (`core/kaykitModel.freshCopy`). Bei einem
   * Ding von zwei Zentimetern, das vier Sekunden lebt und zu dritt im Raum
   * steht, ist ein Schattenwurf pro Stück reine Rechenzeit für ein Bild, das
   * niemand je zu Gesicht bekommt.
   */
  private bulletView(
    radius: number,
    tracer: boolean,
  ): { object: THREE.Object3D; skins: THREE.Material[] } {
    const model = kaykitModelNow(BULLET_MODEL);
    if (model) {
      // **Erst messen, dann skalieren.** Wie viele Meter eine Quelleinheit
      // ist, sagt der Maßstab des Pakets (`core/kaykitFit.kaykitScale`), und
      // der hängt schon an dieser Gruppe — eine abgeschriebene Länge von 0,225
      // Quelleinheiten wäre die Zahl, die beim nächsten Paket danebenliegt.
      const box = new THREE.Box3().setFromObject(model);
      if (!box.isEmpty()) {
        model.scale.multiplyScalar(bulletScale(box.max.z - box.min.z, radius));
        const skins: THREE.Material[] = [];
        for (const skin of kaykitSkins(model)) {
          const paint = skin as THREE.MeshStandardMaterial;
          if (paint.isMeshStandardMaterial) {
            paint.emissive = new THREE.Color(tracer ? 0xff7a2f : 0xffd98a);
            paint.emissiveIntensity = tracer ? 1 : BULLET_GLOW;
          }
          skins.push(skin);
        }
        model.traverse((object) => {
          (object as THREE.Mesh).castShadow = false;
        });
        return { object: model, skins };
      }
      // Ein leeres Netz ist kein Bild: Die Kopie geht weg, das Kügelchen
      // kommt. Ihre Materialien gehören ihr allein und müssen dabei mit.
      for (const skin of kaykitSkins(model)) skin.dispose();
    }
    return {
      object: new THREE.Mesh(
        new THREE.SphereGeometry(radius * BULLET_VIEW_GROWTH, 10, 8),
        new THREE.MeshBasicMaterial({ color: tracer ? 0xff7a2f : 0xffd98a, toneMapped: false }),
      ),
      // Geometrie und Material der gerechneten Kugel räumt `disposeTree` ab;
      // nur bei einer Regalkopie hält es an `sharedAssets` an, und dann bleiben
      // die Materialien liegen, wenn sie hier nicht stünden.
      skins: [],
    };
  }

  /**
   * **Die Patrone vorwärmen**, damit der erste Schuss nicht der einzige ohne
   * Modell ist.
   *
   * Eine Vorlage bleibt nach dem ersten Laden im Speicher, und bis dahin
   * antwortet `kaykitModelNow` mit `null`. Ohne das hier wären die ersten paar
   * Schüsse einer Sitzung gerechnete Kügelchen und alle folgenden Patronen —
   * ein Unterschied, den man sieht und für einen Fehler hält.
   *
   * Beim zweiten Betreten derselben Welt ist die Vorlage schon da, und dann
   * kommt hier eine fertige Kopie zurück statt nichts. Sie wird nicht
   * gebraucht, ihre **Materialien** gehören aber ihr allein — die gehen gleich
   * wieder weg, damit das Vorwärmen nichts liegen lässt.
   */
  private warmBullet(): void {
    const spare = kaykitModelNow(BULLET_MODEL);
    if (spare) for (const skin of kaykitSkins(spare)) skin.dispose();
  }

  /**
   * The streak a tracer drags behind it: a short line through the last dozen
   * places the round has been. It is what makes a shot watchable — where a
   * plain round is a dot that is gone before you found it.
   */
  private newTrail(): Trail {
    const positions = new Float32Array(TRACER_POINTS * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: 0xffb35c,
        transparent: true,
        opacity: 0.85,
        toneMapped: false,
      }),
    );
    line.name = 'tracer';
    line.frustumCulled = false;
    this.root.add(line);
    return { line, positions, count: 0 };
  }

  /** Pushes the round's current place onto the end of its streak. */
  private extendTrail(trail: Trail, at: { x: number; y: number; z: number }): void {
    if (trail.count === TRACER_POINTS) {
      // Full: everything shuffles down one and the oldest point falls off.
      trail.positions.copyWithin(0, 3);
      trail.count--;
    }
    const index = trail.count * 3;
    trail.positions[index] = at.x;
    trail.positions[index + 1] = at.y;
    trail.positions[index + 2] = at.z;
    trail.count++;
    trail.line.geometry.setDrawRange(0, trail.count);
    (trail.line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    trail.line.geometry.computeBoundingSphere();
  }

  private dropTrail(trail: Trail | null): void {
    if (!trail) return;
    trail.line.geometry.dispose();
    trail.line.material.dispose();
    trail.line.removeFromParent();
  }

  private updateBullets(dt: number): void {
    const physics = this.physics;
    if (!physics) return;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i]!;
      bullet.life -= dt;
      const t = bullet.entry.body.translation();
      if (bullet.trail) this.extendTrail(bullet.trail, t);
      // A round travels metres between two frames, so what it passed through
      // is a line, not a point. Worlds that count hits get that line.
      if (!bullet.spent) {
        _point.set(t.x, t.y, t.z);
        if (this.bulletTravelled(bullet.from, _point, bullet.damage)) bullet.spent = true;
      }
      bullet.from.set(t.x, t.y, t.z);
      if (bullet.life > 0 && t.y > -30) continue;
      this.bullets.splice(i, 1);
      physics.remove(bullet.entry);
      this.dropTrail(bullet.trail);
      disposeTree(bullet.entry.object);
      for (const skin of bullet.skins) skin.dispose();
    }
  }

  /**
   * One round's path since the last frame — es fragt, wen es unterwegs
   * getroffen hat.
   *
   * Hier ist das, wer herumläuft (`worlds/npc/NpcDirector.shoot`); der
   * Schießstand zählt zuerst seine Scheiben und reicht danach hierher
   * weiter, damit ein Zombie in der Halle auch dort getroffen wird.
   *
   * @returns true when the round was used up by whatever it ran into
   */
  protected bulletTravelled(from: THREE.Vector3, to: THREE.Vector3, damage?: number): boolean {
    if (this.shootUsable(from, to)) return true;
    return this.director?.shoot(from, to, damage) ?? false;
  }

  /**
   * **Die Portal-Regel: eine Kugel drückt einen Knopf.**
   *
   * Was man mit `A` bedienen kann, kann man auch treffen — das ist der Satz,
   * aus dem die halbe Testkammer besteht: Der Knopf steht hinter Glas, und man
   * kommt nicht hin. Angemeldet wird das beim Anmelden des Knopfes selbst
   * (`addUsable`, `shot`); die Kugel ist danach aufgebraucht, sonst flöge sie
   * weiter und drückte den nächsten gleich mit.
   */
  private shootUsable(from: THREE.Vector3, to: THREE.Vector3): boolean {
    for (const entry of this.usables) {
      if (entry.shot <= 0 || !entry.object.visible) continue;
      entry.object.getWorldPosition(_useCentre);
      if (!shotHitsUsable(from, to, _useCentre, entry.shot, entry.half)) continue;
      _useFlight.copy(to).sub(from);
      if (_useFlight.lengthSq() > 0) _useFlight.normalize();
      entry.usable.use({ kind: 'bullet', at: to, forward: _useFlight });
      return true;
    }
    return false;
  }

  private clearBullets(): void {
    for (const bullet of this.bullets) {
      this.physics?.remove(bullet.entry);
      this.dropTrail(bullet.trail);
      disposeTree(bullet.entry.object);
      for (const skin of bullet.skins) skin.dispose();
    }
    this.bullets.length = 0;
  }

  // --- painting -----------------------------------------------------------

  /**
   * Repaints a prop. `share` also tells the others about it.
   *
   * Farbe ist der halbe Pinsel; die andere Hälfte ist das Material, und beide
   * laufen durch dieselbe Stelle (`styleProp`), damit ein Objekt nie halb
   * angestrichen und halb umgebaut ist.
   */
  private paintProp(entry: PhysicsBody, color: number, share: boolean): void {
    this.styleProp(entry, { color }, share);
  }

  /**
   * Greifen, in drei Reichweiten und mit **einer** Bedienung: gezielt wird
   * immer, gedrückt wird immer derselbe Grip. Was sich unterscheidet, ist,
   * was danach passiert.
   *
   * - **Anfassen** — die Hand steckt in der Greifbox. Der Gegenstand sitzt in
   *   der Faust, und die Hand selbst leuchtet: „du bist wirklich dran".
   * - **Nahgreifen** — der Gegenstand steht im Zylinder um den Spieler, aber
   *   außer Reichweite der Hand. Er kommt **nicht** geflogen, sondern bleibt
   *   liegen und folgt der Hand von dort; am Gegenstand steht dabei eine
   *   Geisterhand, damit man sieht, wo man ihn angefasst hat. So stellt man
   *   einen Dominostein auf, ohne sich zu bücken.
   * - **Ferngreifen** — alles bis 9 m. Der Grip rastet ein und zieht einen
   *   dünnen Strahl zur Hand; **zuckt** die Hand danach zum Körper — schneller
   *   als das eingestellte Zugtempo —, kommt der Gegenstand geflogen
   *   (`pullGesture.ts`). Dasselbe Zucken holt auch einen nah gefassten
   *   Gegenstand in die Faust.
   *
   * Die Reihenfolge ist die Antwort auf die Frage, die sonst jede Runde neu
   * gestellt würde: *welchen* Gegenstand meint die Hand? Es gibt pro Hand
   * genau einen Kandidaten, und es leuchtet genau einer — sonst schnappte die
   * Hand nach dem Dominostein am Fuß, während sie quer durch die Halle auf
   * eine Kiste zielt.
   */
  private updateGrabs(dt: number, ctx: WorldContext): void {
    const reachable = new Set<PhysicsBody>();
    this.locked.clear();
    this.readNearZone(ctx);
    this.readHandUseAims(ctx);
    // **Ein Druck, eine Wirkung**: Zwei Hände können auf demselben Knopf
    // liegen, und der soll trotzdem einmal antworten.
    this.handUseFired.clear();
    // Und was die Hände meinen, wird in diesem Bild neu beantwortet: Eine Hand,
    // die ein Werkzeug hält oder gar nicht mehr da ist, meint nichts mehr, und
    // der Saum von eben soll ihr nicht nachlaufen.
    this.handPicks.clear();

    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand) continue;
      const grab = this.grabs.get(hand);
      // Ob sie im letzten Bild schon am Griff der anderen stand — und damit
      // der Eintrag weg, falls sie es jetzt nicht mehr ist. `delete` sagt
      // beides in einer Zeile, und der Stups unten hängt daran.
      const wasHandover = this.handover.delete(hand);

      if (!controller.tracked) {
        // Eine Hand, die weg war, fängt beim Wiederkommen von vorn an: was
        // zwischendurch geschehen ist, ist kein Zucken.
        this.pullMeters.get(hand)?.reset();
        // Und ebenso wenig ist es ein Druck: Eine Hand, die weg war, hat nicht
        // losgelassen, sie ist verschwunden. Was sie hielt, bleibt in ihr.
        this.gripPresses.set(hand, null);
        // **Die Bildschirmhand steht auf derselben Seite und hat nie einen
        // Controller** (`updateScreenCarry`). Was sie trägt, darf diese
        // Zeile nicht fallen lassen — sonst fiele es in dem Bild wieder zu
        // Boden, in dem es entstanden ist.
        if (grab && hand !== this.screenCarrySide()) this.release(ctx, hand, grab, true);
        this.dropReach(ctx, hand);
        continue;
      }

      const anchor = gripOf(controller);
      anchor.updateWorldMatrix(true, false);
      this.measurePull(ctx, hand, anchor, dt);
      this.trackGripPress(controller, hand, anchor, dt);

      if (grab) {
        if (!controller.squeeze.pressed) {
          this.release(ctx, hand, grab, true);
          this.dropReach(ctx, hand);
          continue;
        }
        this.carryGrab(dt, ctx, hand, grab, controller, anchor, reachable);
        continue;
      }

      ctx.hands.setGlow(hand, false);
      if (this.held.has(hand) || this.claimedHand(hand)) {
        this.dropReach(ctx, hand);
        continue;
      }

      // **Von Hand zu Hand.** Steht diese Hand am Griff der anderen, gehört
      // ihr Griffknopf der Übergabe — genommen wird sie in `updateTools`, hier
      // steht nur, dass es so weit ist. Die Hand leuchtet dafür wie beim
      // Anfassen eines Gegenstands, und mehr braucht es nicht: was sie gleich
      // hält, hält die andere schon sichtbar.
      // Eine Faust, die schon zu ist, nimmt nichts mehr entgegen — sie hat
      // gerade losgelassen oder greift ins Leere. Das ist auch die Hand, die
      // ein Werkzeug eben abgegeben hat: sie soll sich nicht im selben
      // Atemzug wieder öffnen, um es zurückzunehmen.
      if (!controller.squeeze.pressed && this.handoverTool(ctx, hand, anchor)) {
        this.dropReach(ctx, hand);
        // Ein Stups beim Ankommen, einer je Annäherung: zwei Fäuste
        // aneinander sieht man in der Brille schlecht, und was man nicht
        // sieht, muss man spüren — dieselbe Regel wie im magischen Beutel.
        if (!wasHandover) controller.pulse(0.2, 12);
        this.handover.add(hand);
        ctx.hands.setGlow(hand, true);
        continue;
      }

      this.updateReach(ctx, controller, hand, anchor, reachable);
    }

    this.updateFlights(dt, ctx);
    this.updateGhostHands(dt);
    this.updateHighlights(reachable);
    this.updateHandGestures(ctx, reachable);
  }

  /**
   * **Halten oder Tippen** — was zwischen Drücken und Loslassen passiert ist
   * (`core/handUse.ts`).
   *
   * Zwei Zahlen je Hand, und beide entstehen hier: wie lange die Taste schon
   * liegt, und wie weit die Hand seit dem Drücken gekommen ist. Die Regel
   * daraus steht im `core` und wird dort geprüft; hier läuft nur die Uhr und
   * das Maßband.
   *
   * Gerufen wird es für **jede getrackte Hand in jedem Bild**, auch für eine,
   * die gerade einen Gegenstand trägt: Der Unterschied zwischen Tippen und
   * Halten ist eine Aussage über die Taste und nicht über das, was an ihr
   * hängt.
   */
  private trackGripPress(
    controller: ControllerState,
    hand: Handedness,
    anchor: THREE.Object3D,
    dt: number,
  ): void {
    if (controller.squeeze.justPressed) {
      let from = this.gripPressFrom.get(hand);
      if (!from) {
        from = new THREE.Vector3();
        this.gripPressFrom.set(hand, from);
      }
      anchor.getWorldPosition(from);
      this.gripPresses.set(hand, beginGripPress());
      return;
    }
    const grab = this.gripPresses.get(hand);
    if (!grab || !controller.squeeze.pressed) return;
    const from = this.gripPressFrom.get(hand);
    anchor.getWorldPosition(_grabHand);
    this.gripPresses.set(hand, stepGripPress(grab, dt, from ? _grabHand.distanceTo(from) : 0));
  }

  /** Alles, was eine Hand an Reichweite angezeigt hatte, wieder abräumen. */
  private dropReach(ctx: WorldContext, hand: Handedness): void {
    this.dropLink(hand);
    this.hideRope(hand);
    this.hideGhost(hand);
    ctx.hands.setGlow(hand, false);
    // Eine Hand, die gerade etwas anderes tut, fasst auch nichts mehr an:
    // Sonst bliebe die Erinnerung stehen, und das Ding antwortete beim
    // nächsten Hineinfassen nicht mehr. Und sie meint auch nichts mehr, also
    // leuchtet auf ihr Zutun auch nichts (`showUse`).
    this.handUsed.set(hand, null);
    this.handPicks.set(hand, null);
  }

  // --- benutzen mit der Hand (nur in der Brille) ----------------------------

  /**
   * **Die benutzbaren Dinge als Greifboxen**, je Bild einmal (`core/handUse.ts`).
   *
   * Gerechnet wird gegen die **echte** Ausdehnung und nicht gegen den
   * Zielhalbmesser der Ansicht von oben (`UsableEntry.radius`): Der ist
   * absichtlich großzügig, weil niemand von oben auf einen Kippschalter zielt
   * — eine Hand, die darauf liegt, trifft ihn aber genau, und ein halber Meter
   * Luft um jedes Möbel machte aus dem Anfassen ein Danebengreifen.
   *
   * Die Kiste steht achsenparallel in der Welt, deshalb trägt sie keine
   * Drehung: `Box3.setFromObject` liefert genau das, und eine gedrehte Kiste
   * um ein Möbel, das ohnehin gerade steht, wäre eine Genauigkeit, die nichts
   * genauer macht.
   */
  private readHandUseAims(ctx: WorldContext): void {
    this.handUseAims.length = 0;
    if (!ctx.renderer.xr.isPresenting || this.usables.length === 0) return;
    // **Erst grob aussieben, dann genau messen.** Eine Kiste um ein Möbel zu
    // legen heißt, seinen ganzen Teilbaum durchzugehen (`Box3.setFromObject`),
    // und das je Bild für jedes benutzbare Ding einer Küche wäre eine
    // Rechnung, die man in der Brille merkt. Was weiter weg steht, als eine
    // Hand je reicht oder ein Zeigen trägt, fällt vorher heraus — dafür genügt
    // der Ort des Dings, und der kostet nur die Matrizen über ihm.
    ctx.rig.getHeadPosition(_handHead);
    const far = this.handUseRange() + HAND_USE_SLACK;
    for (const entry of this.usables) {
      if (!entry.object.visible) continue;
      if (entry.object.getWorldPosition(_handSize).distanceTo(_handHead) > far) continue;
      const box = _handBox.setFromObject(entry.object);
      if (box.isEmpty()) continue;
      box.getCenter(_handCentre);
      box.getSize(_handSize);
      this.handUseAims.push({
        entry,
        target: {
          position: { x: _handCentre.x, y: _handCentre.y, z: _handCentre.z },
          quaternion: { x: 0, y: 0, z: 0, w: 1 },
          halfExtents: { x: _handSize.x / 2, y: _handSize.y / 2, z: _handSize.z / 2 },
        },
      });
    }
  }

  /**
   * **Was diese Hand meint, und ob sie es gerade auslöst.**
   *
   * Das ist die Brillen-Hälfte von `core/interaction.ts`: Ein `press` will
   * berührt oder gezeigt-und-getriggert werden, ein `grab` will die
   * **Greif-Taste** — dieselbe, mit der man in dieser Welt jeden Gegenstand
   * greift. Das ist kein zweiter Draht auf derselben Taste, sondern derselbe:
   * Ein Brötchen aus der Ausgabe ist ein Gegenstand, den man greifen will, es
   * hat nur keinen Körper in der Physik, an dem die Faust sich festhalten
   * könnte. Deshalb steht diese Abfrage genau dort, wo die Hand sonst nach
   * Gegenständen sucht — und **hinter** ihr: Was einen Körper hat, gewinnt,
   * und am vorhandenen Greifen ändert sich damit nichts.
   *
   * @returns ob wirklich etwas passiert ist
   */
  private useByHand(
    ctx: WorldContext,
    controller: ControllerState,
    hand: Handedness,
    anchor: THREE.Object3D,
  ): boolean {
    // **Dem Menü gehört seine Hand.** Liegt ihr Strahl auf einer Menüseite,
    // gehört ihr Trigger dem Menü und nicht der Küche — dieselbe Regel wie bei
    // den Werkzeugen (`updateTools`), und die andere Hand arbeitet weiter.
    if (this.handUseAims.length === 0 || ctx.pointer.hoveringWith(hand)) {
      this.handUsed.set(hand, null);
      this.handPicks.set(hand, null);
      return false;
    }

    anchor.getWorldPosition(_hand);
    controller.getRay(_handRay);
    // **Wo die Figur steht**, nicht wo die Hand ist. Das ist die Pointe des
    // Auftrags: Die Reichweite kommt weiter aus der Figur, nur die Auswahl
    // darin darf die Hand treffen (siehe `grabReaches` unten).
    _handFeet.x = this.nearZone.x;
    _handFeet.y = this.nearZone.floor;
    _handFeet.z = this.nearZone.z;
    _handFinds.length = 0;
    for (const { entry, target } of this.handUseAims) {
      const kind = interactionKind(entry.usable.interaction);
      if (kind === 'none') continue;
      // **Die Reichweite trägt das Ding selbst** (`core/grabHandles.ts`).
      // `'all'` sagt immer ja — Werkzeuge, Waffen, Gürtelplätze und alles, was
      // nichts angibt, bleibt damit Zeile für Zeile, wie es war. `'moore'` sagt
      // nur im eigenen Feld und den acht daneben ja: kein Nahgreifen, kein
      // Ferngreifen, kein Zeigen über den halben Raum.
      const reach = interactionGrab(entry.usable.interaction).reach;
      if (reach !== 'all') {
        // **Gemessen wird gegen die nächste Ecke und nicht gegen die Mitte.**
        // Ein Tresen ist zwei Meter lang; wer an seinem einen Ende steht, hat
        // seine Mitte einen Meter weiter und sein anderes Ende zwei — an der
        // Mitte gemessen fiele das Möbel heraus, vor dem man steht. Die Kiste
        // steht achsenparallel (`readHandUseAims`), also genügt ein Klemmen.
        _handSpot.x = clamp(
          _handFeet.x,
          target.position.x - target.halfExtents.x,
          target.position.x + target.halfExtents.x,
        );
        _handSpot.y = target.position.y;
        _handSpot.z = clamp(
          _handFeet.z,
          target.position.z - target.halfExtents.z,
          target.position.z + target.halfExtents.z,
        );
        if (!grabReaches(reach, _handFeet, _handSpot)) continue;
      }
      const inputs = vrInputs(entry.usable.interaction);
      const depth = reachDepth(target, _hand);
      if (depth !== null) {
        _handFinds.push({ item: entry.object, reach: 'touch', distance: depth, kind, inputs });
        continue;
      }
      const along = rayReach(target, _handRay.origin, _handRay.direction);
      if (along === null || along > this.handUseRange()) continue;
      _handFinds.push({ item: entry.object, reach: 'aim', distance: along, kind, inputs });
    }

    // **Gemerkt wird das Objekt und nicht die Anmeldung**: Eine Station meldet
    // sich neu an, sobald sich ändert, was ein Druck bewirkt (die Ausgabe gibt
    // erst ein Brötchen, dann nimmt sie einen Teller entgegen). Hinge die
    // Entprellung an der Anmeldung, löste dieselbe liegende Hand im nächsten
    // Bild wieder aus — und legte zurück, was sie eben genommen hat. Das
    // Objekt ist das, worin die Hand steckt, und genau das soll sie erst
    // wieder verlassen.
    const find = pickHandUse(_handFinds);
    // **Woran der Saum in der Brille hängt** (`showUse`): an dem, was diese
    // Hand meint, und nicht an dem, was vor der Figur steht. Gemerkt wird es
    // auch dann, wenn gerade keine Taste gedrückt ist — der Saum kündigt an,
    // er quittiert nicht.
    const found = find
      ? this.handUseAims.find((aim) => aim.entry.object === find.item)?.entry
      : null;
    this.handPicks.set(
      hand,
      find && found
        ? {
            usable: found.usable,
            object: found.object,
            reach: find.reach,
            distance: find.distance,
          }
        : null,
    );
    // **Die Greif-Taste spricht zweimal**: beim Drücken und beim Loslassen —
    // und beim Loslassen nur dann, wenn dieser Druck etwas genommen hat und
    // ein **Halten** war (`core/handUse.gripPressDrops`). Genau das ist die
    // Antwort auf den gemeldeten Fehler: Mit dem Topf an der Arbeitsplatte
    // vorbeizulaufen stellt ihn nicht ab; ihn dort loszulassen schon. Und wer
    // nur kurz getippt hat, behält ihn in der Hand, bis er erneut drückt —
    // dann ist es wieder ein `justPressed`.
    const press = this.gripPresses.get(hand) ?? null;
    const grip =
      controller.squeeze.justPressed || (controller.squeeze.justReleased && gripPressDrops(press));
    const fires = handUseFires(
      find,
      { trigger: controller.trigger.justPressed, grip },
      this.handUsed.get(hand) ?? null,
    );
    // Die Hand leuchtet, sobald sie in etwas steckt — dasselbe Zeichen wie
    // beim Anfassen eines Gegenstands (AGENTS.md, „Anfassen: die Hand
    // leuchtet"). Das Zeigen bekommt keines: Dafür gibt es den gelben Saum.
    ctx.hands.setGlow(hand, find?.reach === 'touch');
    this.handUsed.set(hand, handUseMemory(find));
    if (!fires || !find) return false;

    const usable = found?.usable;
    if (!usable || this.handUseFired.has(usable)) return false;
    this.handUseFired.add(usable);
    _handForward.copy(_handRay.direction);
    const acted = usable.use({ kind: 'player', at: _hand, forward: _handForward, hand });
    if (!acted) return false;
    // Ein Druck, der etwas bewirkt hat — mehr ist „zuletzt interagiert" nicht
    // (`lastActHand`). Ein Druck ins Leere zählt ausdrücklich nicht: Sonst
    // führte eine Hand, die an einer erschöpften Ausgabe hängt, den Saum an.
    this.lastActHand = hand;
    // **Dieser Druck hat etwas genommen** — nur dann darf sein Loslassen
    // wieder etwas abstellen. Ein Druck ins Leere merkt sich nichts.
    if (find.kind === 'grab' && press) this.gripPresses.set(hand, gripPressTook(press));
    controller.pulse(find.kind === 'grab' ? 0.5 : 0.3, 25);
    return true;
  }

  /**
   * Der Zylinder um den Spieler, jedes Bild neu.
   *
   * Er hängt am **Körper** und nicht an der Hand, weil „muss ich mich bücken?"
   * eine Frage an den Körper ist: der Dominostein vor den Füßen liegt außerhalb
   * jeder Kugel um eine Hand, die auf Hüfthöhe hängt, und ist genau der Fall,
   * um den es geht. Der Boden kommt vom Rig und nicht aus `position.y` — wer
   * sich duckt, sinkt, der Fußboden nicht.
   */
  private readNearZone(ctx: WorldContext): void {
    ctx.rig.getHeadPosition(_point);
    this.nearZone.x = _point.x;
    this.nearZone.z = _point.z;
    this.nearZone.floor = ctx.rig.getFloorY();
    this.nearZone.radius = this.grabConfig.radius / 100;
    this.nearZone.height = this.grabConfig.height / 100;
  }

  /**
   * Eine leere Hand, die zielt: was ist in Reichweite, und in welcher.
   *
   * Ein eingerasteter Ferngriff geht vor — er *bleibt* eingerastet, auch wenn
   * die Hand danach woanders hinzeigt, sonst müsste man beim Kippen still
   * halten.
   */
  private updateReach(
    ctx: WorldContext,
    controller: ControllerState,
    hand: Handedness,
    anchor: THREE.Object3D,
    reachable: Set<PhysicsBody>,
  ): void {
    const usable = !this.reachingAcross(ctx, hand);
    const link = this.links.get(hand);
    if (link) {
      if (usable && controller.squeeze.pressed) {
        reachable.add(link.entry);
        this.locked.add(link.entry);
        this.hideGhost(hand);
        const pull = this.pullSpeed(hand);
        this.drawRope(controller, link.entry, pullTension(pull, this.pullLimit));
        if (pullTriggered(pull, this.pullLimit)) {
          gripOf(controller).getWorldPosition(_hand);
          this.startFlight(link.entry, hand, _hand);
          controller.pulse(0.7, 45);
          this.dropLink(hand);
          this.hideRope(hand);
        }
        return;
      }
      this.dropLink(hand);
      this.hideRope(hand);
    }

    const aim = this.aimGrab(controller, anchor, usable);
    if (!aim) {
      this.hideRope(hand);
      this.hideGhost(hand);
      // **Kein Gegenstand in Reichweite — dann die benutzbaren Dinge**
      // (`useByHand`). Genau hier und nicht davor: Was einen Körper in der
      // Physik hat, gewinnt, und damit ändert sich am vorhandenen Greifen von
      // Werkzeugen, Waffen und Gegenständen nichts.
      this.useByHand(ctx, controller, hand, anchor);
      return;
    }
    this.handUsed.set(hand, null);
    reachable.add(aim.entry);
    this.hideRope(hand);

    // Ein **Griff** wird geholt, ein **Gegenstand** gefasst: ein Werkzeug auf
    // dem Boden weiß, wie man es hält, und es aus anderthalb Metern in der
    // Luft zu dirigieren hilft niemandem. Also fliegt es, wie beim
    // Ferngreifen — nur ohne den Umweg über die Zuggeste, die auf diese
    // Entfernung nur im Weg wäre.
    if (aim.stage === 'near' && this.loose.has(aim.entry)) {
      this.hideGhost(hand);
      if (!controller.squeeze.justPressed) return;
      gripOf(controller).getWorldPosition(_hand);
      this.startFlight(aim.entry, hand, _hand);
      controller.pulse(0.5, 30);
      return;
    }

    if (aim.stage === 'remote') {
      this.hideGhost(hand);
      if (!controller.squeeze.justPressed) return;
      this.links.set(hand, { entry: aim.entry });
      controller.pulse(0.4, 25);
      return;
    }

    // Angefasst wird mit der Hand, nah gefasst mit der Geisterhand daneben.
    if (aim.stage === 'touch') {
      ctx.hands.setGlow(hand, true);
      this.hideGhost(hand);
    } else {
      this.showGhost(ctx, hand, anchor, aim);
    }
    if (!controller.squeeze.justPressed) return;

    // Already in the other hand? Then this is a hand-over, not a pick-up. Ihre
    // festgefrorene Geisterhand geht mit: gehalten wird der Gegenstand ab
    // jetzt hier, und zwei Geister an einem Ding sagen nichts mehr.
    const other = this.handHolding(aim.entry);
    if (other) {
      this.release(ctx, other, this.grabs.get(other)!, false);
      this.hideGhost(other);
    }
    this.attach(hand, anchor, aim.entry, aim.stage === 'near' ? controller : null, aim.point);
    this.pinGhost(hand, aim.entry);
    controller.pulse(aim.stage === 'near' ? 0.35 : 0.5, 30);
  }

  /**
   * Welcher Gegenstand, und in welcher Reichweite.
   *
   * Zuerst die Hand selbst: steckt sie in einer Greifbox, ist das die Antwort,
   * ohne dass irgendwohin gezielt werden müsste. Sonst entscheidet der Strahl
   * — derselbe wie beim Ferngreifen —, und der Zylinder sagt danach nur noch,
   * ob das Getroffene **gefasst** oder **geholt** wird.
   */
  private aimGrab(
    controller: ControllerState,
    anchor: THREE.Object3D,
    usable: boolean,
  ): GrabAim | null {
    anchor.getWorldPosition(_hand);
    const touched = this.findProp(_hand);
    if (touched) {
      // Ein festgestelltes Ding im Schwebekasten wird nicht angefasst: die
      // Faust, die man zum Messen darum schließt, ist dieselbe Geste wie
      // Greifen (`floatFixed`).
      if (this.holdsStill(touched)) return null;
      _aim0.set('touch', touched).point.copy(_hand);
      return _aim0;
    }
    if (!usable) return null;

    const near = this.grabConfig.near && this.nearZone.radius > 0;
    if (!near && !this.grabConfig.remote) return null;

    controller.getRay(_ray);
    const entry = this.findAimTarget(_ray, REMOTE_RANGE, controller.handedness);
    if (!entry || this.holdsStill(entry)) return null;
    const target = aimTargetOf(entry);
    const inZone = near && nearZoneDistance(target, this.nearZone) !== null;
    if (!inZone && !this.grabConfig.remote) return null;
    const reach = rayReach(target, _ray.origin, _ray.direction) ?? 0;
    _aim0.set(inZone ? 'near' : 'remote', entry);
    _aim0.point.copy(_ray.origin).addScaledVector(_ray.direction, reach);
    return _aim0;
  }

  /**
   * Die Geisterhand dort, wo die echte anfassen würde.
   *
   * Sie steht am Trefferpunkt des Strahls und trägt die Drehung der echten
   * Hand — sie ist erkennbar *deine* Hand an einem anderen Ort, und das ist
   * die ganze Nachricht. Solange nur gezielt wird, wandert sie mit dem Strahl;
   * mit dem Zugriff friert sie am Gegenstand fest (`pinGhost`) und fährt von
   * da an mit ihm mit.
   */
  private showGhost(
    ctx: WorldContext,
    hand: Handedness,
    anchor: THREE.Object3D,
    aim: GrabAim,
  ): void {
    if (!this.grabConfig.ghost) return this.hideGhost(hand);
    const view = this.ghostView(ctx, hand);
    view.pinned = null;
    view.entry = aim.entry;
    view.hand.position.copy(aim.point);
    anchor.getWorldQuaternion(view.hand.quaternion);
    // Jedes Bild neu: wer seine Handhaltung im Menü ändert, soll das am Geist
    // sofort sehen und nicht erst nach dem nächsten Weltwechsel.
    view.hand.setPose(ctx.hands.poseOf(hand));
    view.hand.setGesture('ready');
    view.hand.visible = true;
  }

  /** Ab hier gehört die Geisterhand dem Gegenstand: sie fährt mit ihm mit. */
  private pinGhost(hand: Handedness, entry: PhysicsBody): void {
    const view = this.ghostHands.get(hand);
    if (!view?.visible || view.entry !== entry) return;
    view.hand.updateWorldMatrix(true, false);
    entry.object.updateWorldMatrix(true, false);
    view.pinned ??= new THREE.Matrix4();
    view.pinned.copy(entry.object.matrixWorld).invert().multiply(view.hand.matrixWorld);
    view.hand.setGesture('grip');
  }

  /** Eine Geisterhand je Hand, in der Bauart, die diese Hand gerade hat. */
  private ghostView(ctx: WorldContext, hand: Handedness): GhostView {
    const look = ctx.hands.lookOf(hand);
    let view = this.ghostHands.get(hand);
    // Wer die Controller weglegt, sieht danach seine getrackten Hände — und
    // der Geist daneben soll aussehen wie das, was in der Brille zu sehen ist.
    if (view && view.hand.look !== look) {
      view.hand.dispose();
      view = undefined;
    }
    if (!view) {
      const ghost = new GhostHand(hand, ctx.hands.poseOf(hand), { look });
      ghost.renderOrder = 12;
      this.root.add(ghost);
      view = { hand: ghost, pinned: null, entry: null, visible: false };
      this.ghostHands.set(hand, view);
    }
    view.visible = true;
    return view;
  }

  /** Ein Gegenstand geht — eine Geisterhand, die an ihm hing, geht mit. */
  private forgetGhost(entry: PhysicsBody): void {
    for (const [hand, view] of this.ghostHands) {
      if (view.entry === entry) this.hideGhost(hand);
    }
  }

  private hideGhost(hand: Handedness): void {
    const view = this.ghostHands.get(hand);
    if (!view) return;
    view.hand.visible = false;
    view.visible = false;
    view.pinned = null;
    view.entry = null;
  }

  /** Die Finger nachziehen, und eine festgefrorene Geisterhand mitnehmen. */
  private updateGhostHands(dt: number): void {
    for (const view of this.ghostHands.values()) {
      if (!view.visible) continue;
      if (view.pinned && view.entry) {
        view.entry.object.updateWorldMatrix(true, false);
        _matrix.multiplyMatrices(view.entry.object.matrixWorld, view.pinned);
        _matrix.decompose(view.hand.position, view.hand.quaternion, _probe);
      }
      view.hand.update(dt);
    }
  }

  /**
   * Ein Gegenstand in der Hand, oder einer, den die Hand aus der Nähe führt.
   *
   * Der Unterschied steckt allein darin, welche Pose gerechnet wird: in der
   * Faust dieselbe Matrix wie eh und je, beim Nahgriff wahlweise dieselbe
   * (dann hat man eben einen langen Arm, Betriebsart *starr*) oder — die
   * Vorgabe — eine Drehung um den Punkt, an dem die **Geisterhand** anfasst.
   * Dann verschiebt die Hand eins zu eins und dreht den Gegenstand genau so,
   * als läge sie dort an ihm. Und beim Nahgriff hört die Hand auf die
   * Zuggeste — wer ihn doch in der Hand haben will, kippt sie hoch, statt
   * loszulassen und neu zu zielen.
   */
  private carryGrab(
    dt: number,
    ctx: WorldContext,
    hand: Handedness,
    grab: HandGrab,
    controller: ControllerState,
    anchor: THREE.Object3D,
    reachable: Set<PhysicsBody>,
  ): void {
    ctx.hands.setGlow(hand, false);
    const near = grab.near;
    if (near) {
      reachable.add(grab.entry);
      if (pullTriggered(this.pullSpeed(hand), this.pullLimit)) {
        gripOf(controller).getWorldPosition(_hand);
        this.release(ctx, hand, grab, false);
        this.startFlight(grab.entry, hand, _hand);
        controller.pulse(0.7, 45);
        this.hideGhost(hand);
        return;
      }
    }

    if (near && this.grabConfig.motion !== 'rigid') {
      anchor.getWorldPosition(_point);
      anchor.getWorldQuaternion(_quaternion);
      copyPose(_point, _quaternion, _handNow);
      pivotGrab(near.objectStart, near.handStart, _handNow, near.hold, this.nearScale, _spun);
      _point.set(_spun.position.x, _spun.position.y, _spun.position.z);
      _quaternion.set(_spun.rotation.x, _spun.rotation.y, _spun.rotation.z, _spun.rotation.w);
    } else {
      _matrix.multiplyMatrices(anchor.matrixWorld, grab.offset);
      _matrix.decompose(_point, _quaternion, _probe);
      // Auch der starre Griff fährt verstärkt: seine Verschiebung steckt schon
      // eins zu eins in der Matrix der Hand, also kommt hier nur noch der
      // Zuschlag dazu. In der Faust nicht — dort *ist* die Hand am Gegenstand,
      // und ein Würfel, der weiter fährt als die Faust, die ihn hält, wäre
      // kein Griff mehr, sondern ein Fehler.
      if (near) {
        anchor.getWorldPosition(_hand);
        stretchGrab(near.handStart.position, _hand, this.nearScale, _point);
      }
    }

    grab.velocity
      .copy(_point)
      .sub(grab.lastPosition)
      .divideScalar(Math.max(dt, 1 / 120));
    grab.lastPosition.copy(_point);
    // Geschüttelt? Dann knallt der Korken — nur aus der Hand, nicht aus der Ferne.
    if (!near && grab.shake?.feed(grab.velocity, dt)) {
      grab.shake = null;
      this.popCork(grab.entry, grab.velocity, true);
      controller.pulse(0.9, 70);
    }
    grab.entry.body.setNextKinematicTranslation({ x: _point.x, y: _point.y, z: _point.z });
    grab.entry.body.setNextKinematicRotation({
      x: _quaternion.x,
      y: _quaternion.y,
      z: _quaternion.z,
      w: _quaternion.w,
    });
  }

  /**
   * **Das Werkzeug, das diese Hand der anderen gerade abnehmen könnte** —
   * `null`, wenn keins da ist oder die Hand zu weit vom Griff weg steht.
   *
   * Eine Taschenlampe wandert damit von einer Hand in die andere wie ein
   * Gegenstand: Hände zusammen, greifen, fertig. Vorher ging das nur über den
   * Umweg „fallen lassen und wieder aufheben", und ein Werkzeug, das man in
   * der Luft übergibt, fiel dabei zu Boden.
   *
   * Gemessen wird gegen den **Griffpunkt** der haltenden Hand und nicht gegen
   * das Werkzeug: dort liegt der Griff, und nur dort soll das Zeichen kommen
   * (`HANDOVER_REACH`). Eine Reichweite über die Ausdehnung des Dings ließe
   * die Lampe auch dann übernehmen, wenn die Hand vorn an der Linse steht —
   * an einer Stelle, an der man sie in Wirklichkeit nicht anfasst.
   *
   * Ein **geparktes** Werkzeug bleibt, wo es ist: es hängt am Justierstand in
   * der Luft, und die Hand daneben misst gerade seine Haltung ein. Und eines,
   * das diese Hand ohnehin schon beansprucht (`claimsHand` — das Deck der
   * Drohne, ein Fach im Beutel), wird nicht genommen, sondern bedient.
   */
  private handoverTool(ctx: WorldContext, hand: Handedness, anchor: THREE.Object3D): Tool | null {
    if (this.grabs.has(hand)) return null;
    const other: Handedness = hand === 'left' ? 'right' : 'left';
    const tool = this.held.get(other);
    if (!tool || tool.parked || tool.claimsHand(hand)) return null;
    const there = ctx.input.get(other);
    if (!there?.tracked) return null;
    anchor.getWorldPosition(_thisHand);
    gripOf(there).getWorldPosition(_otherHand);
    return atHandGrip(_thisHand, _otherHand) ? tool : null;
  }

  /**
   * True while the other hand holds something and both hands are together: the
   * player is reaching over to take it, not aiming at the far wall.
   */
  private reachingAcross(ctx: WorldContext, hand: Handedness): boolean {
    const other: Handedness = hand === 'left' ? 'right' : 'left';
    const busy = this.grabs.has(other) || this.held.has(other);
    if (!busy) return false;

    const here = ctx.input.get(hand);
    const there = ctx.input.get(other);
    if (!here?.tracked || !there?.tracked) return false;
    gripOf(here).getWorldPosition(_thisHand);
    gripOf(there).getWorldPosition(_otherHand);
    return handsTooClose(_thisHand, _otherHand, true);
  }

  /**
   * **Ab wann ein Zucken eines ist**, in Metern je Sekunde — die Zahl aus den
   * Einstellungen (`Greifen → Zugtempo`, dort in Zentimetern je Sekunde). `0`
   * heißt „ohne Zucken": dann kommt der Gegenstand, sobald er gefasst ist.
   */
  private get pullLimit(): number {
    const stored = this.grabConfig.pull;
    return Number.isFinite(stored) ? stored / 100 : REMOTE_PULL_SPEED;
  }

  /**
   * **Wie stark der Nahgriff verstärkt** — die Zahl aus den Einstellungen
   * (`Greifen → Nahverstärkung`, dort in Prozent), als Faktor.
   *
   * Der Zylinder reicht weiter, als ein Arm langt; die Hand vor dem Körper
   * legt aber nur den Weg zurück, den ein Arm eben zurücklegt. Der Faktor
   * schließt die Lücke, und er gilt nur für die **Verschiebung** — die Drehung
   * bleibt Grad für Grad.
   */
  private get nearScale(): number {
    const stored = this.grabConfig.scale;
    return Number.isFinite(stored) ? stored / 100 : DEFAULT_NEAR_SCALE;
  }

  /** Wie schnell diese Hand gerade zum Körper zieht, in Metern je Sekunde. */
  private pullSpeed(hand: Handedness): number {
    return this.pullMeters.get(hand)?.current ?? 0;
  }

  /**
   * Das Zucken dieser Hand messen — **jedes Bild und für jede Hand**, ob sie
   * gerade etwas gefasst hat oder nicht.
   *
   * Erst beim Zugreifen anzufangen wäre zu spät: dann läge im Fenster
   * (`pullGesture.ts`) noch nichts, und das erste Zucken nach dem Griff fiele
   * durch. Gemessen wird gegen den **Kopf**, denn dorthin zieht der Arm; wer
   * geht, nimmt beide mit und zuckt damit nicht.
   */
  private measurePull(
    ctx: WorldContext,
    hand: Handedness,
    anchor: THREE.Object3D,
    dt: number,
  ): void {
    let meter = this.pullMeters.get(hand);
    if (!meter) {
      meter = new PullMeter();
      this.pullMeters.set(hand, meter);
    }
    anchor.getWorldPosition(_hand);
    ctx.rig.getHeadPosition(_point);
    meter.feed(_hand, _point, dt);
  }

  /**
   * Der dünne Strahl zwischen Hand und Gegenstand beim **Ferngreifen**.
   *
   * Er kommt erst, wenn wirklich eingerastet ist, und sagt dann genau eine
   * Sache: *daran kannst du jetzt ziehen*. Beim bloßen Zielen liegt er nur im
   * Bild — dort leuchtet der Gegenstand, und das reicht. Von 0 bis 1 zieht er
   * sich straff und färbt sich orange, während sich das Handgelenk dem Winkel
   * nähert, der den Zug auslöst.
   */
  private drawRope(controller: ControllerState, entry: PhysicsBody, tension: number): void {
    if (!this.grabConfig.rope) {
      this.hideRope(controller.handedness!);
      return;
    }
    const rope = this.rope(controller.handedness!);
    gripOf(controller).getWorldPosition(_hand);
    const t = entry.body.translation();
    _point.set(t.x, t.y, t.z);

    const taut = THREE.MathUtils.clamp(tension, 0, 1);
    const sag = _hand.distanceTo(_point) * 0.14 * (1 - taut);
    const positions = rope.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < ROPE_POINTS; i++) {
      const f = i / (ROPE_POINTS - 1);
      _target.lerpVectors(_hand, _point, f);
      _target.y -= Math.sin(f * Math.PI) * sag;
      positions.setXYZ(i, _target.x, _target.y, _target.z);
    }
    positions.needsUpdate = true;
    rope.material.color.setHex(ROPE_IDLE).lerp(_ropeTaut, taut);
    rope.material.opacity = 0.95;
    rope.visible = true;
  }

  /** One rope per hand, made on first use and then just shown or hidden. */
  private rope(hand: Handedness): THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> {
    let rope = this.ropes.get(hand);
    if (rope) return rope;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(ROPE_POINTS * 3), 3),
    );
    rope = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: ROPE_IDLE,
        transparent: true,
        opacity: 0.95,
        toneMapped: false,
        depthTest: false,
      }),
    );
    rope.name = `remote-rope-${hand}`;
    rope.frustumCulled = false;
    rope.renderOrder = 20;
    rope.visible = false;
    this.root.add(rope);
    this.ropes.set(hand, rope);
    return rope;
  }

  private dropLink(hand: Handedness): void {
    this.links.delete(hand);
  }

  private hideRope(hand: Handedness): void {
    const rope = this.ropes.get(hand);
    if (rope) rope.visible = false;
  }

  private clearLinks(): void {
    for (const hand of [...this.links.keys()]) this.dropLink(hand);
    for (const hand of this.ropes.keys()) this.hideRope(hand);
  }

  /**
   * Nearest prop the aiming ray actually enters — the aim for all three reaches.
   *
   * @param hand die zielende Hand, wenn es eine ist: dann darf sie auch das
   *             ins Auge fassen, was die **andere** gerade nah gefasst hält
   *             (`takeable`). Ohne Hand zielt ein Werkzeug, und für das ist
   *             alles, was in einer Hand steckt, weiterhin vergeben.
   */
  private findAimTarget(
    ray: THREE.Ray,
    range = REMOTE_RANGE,
    hand: Handedness | null = null,
  ): PhysicsBody | null {
    _aimTargets.length = 0;
    for (const entry of this.props) {
      if (this.flights.has(entry) || !this.takeable(entry, hand)) continue;
      _aimTargets.push(aimTargetOf(entry));
    }
    return pickAimTarget(_aimTargets, ray.origin, ray.direction, range)?.entry ?? null;
  }

  /**
   * **Von Hand zu Hand, über den Strahl** — ob eine zielende Hand nach etwas
   * greifen darf, das schon in einer Hand liegt.
   *
   * Ein **nah gefasster** Gegenstand darf gewechselt werden: Er liegt sichtbar
   * da draußen und folgt einer Geisterhand, und die andere Hand soll ihn
   * übernehmen können, ohne dass man ihn erst fallen lässt und neu zielt. Das
   * ist derselbe Vorgang wie beim Anfassen, nur auf Armlänge plus Zylinder —
   * man sieht dabei die Geisterhand der zweiten Hand daneben stehen und
   * drückt.
   *
   * Was **in der Faust** steckt, wechselt dagegen weiter nur von Hand zu Hand:
   * ein Ding aus der eigenen Faust quer durch den Raum anzuvisieren ist kein
   * Wechsel, sondern ein Versehen. Und das Ziel muss **im Zylinder** liegen —
   * sonst wäre es ein Ferngriff auf etwas, das eine andere Hand jedes Bild
   * woandershin schreibt, und beide zögen daran.
   */
  private takeable(entry: PhysicsBody, hand: Handedness | null): boolean {
    const holder = this.handHolding(entry);
    if (!holder) return true;
    if (!hand || holder === hand) return false;
    if (!this.grabs.get(holder)?.near) return false;
    if (!this.grabConfig.near || this.nearZone.radius <= 0) return false;
    return nearZoneDistance(aimTargetOf(entry), this.nearZone) !== null;
  }

  /**
   * Sends a prop on its way to a hand.
   *
   * It is flown, not thrown: a fixed path over a fixed time, passing through
   * everything on the way. A ballistic arc looks nicer right up to the moment
   * it clips a crate and the pull simply fails, and a pull that does not
   * arrive is worse than none at all.
   */
  private startFlight(
    entry: PhysicsBody,
    hand: Handedness,
    handPosition: THREE.Vector3,
    viaTool = false,
  ): void {
    // Was im Schwebekasten **festgestellt** ist, fliegt auch nicht: ein Flug
    // hängt den Körper kinematisch an die Hand, und eine gesperrte Achse hält
    // einen kinematischen Körper nicht auf (`setFloatFixed`).
    if (this.holdsStill(entry)) return;
    const physics = this.physics!;
    const t = entry.body.translation();
    _point.set(t.x, t.y, t.z);

    entry.body.setBodyType(physics.rapier.RigidBodyType.KinematicPositionBased, true);
    entry.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    entry.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    physics.setCarried(entry, true);
    physics.setGhost(entry, true);

    this.flights.set(entry, {
      hand,
      time: 0,
      duration: flightDuration(_point.distanceTo(handPosition)),
      from: _point.clone(),
      viaTool,
    });
    const id = this.idOf(entry);
    if (id) this.sync?.claim(id);
  }

  private updateFlights(dt: number, ctx: WorldContext): void {
    const physics = this.physics!;

    for (const [entry, flight] of [...this.flights]) {
      const controller = ctx.input.get(flight.hand);
      // A hand pull lasts while the grab button is down; a tool pull lasts
      // while the tool is still in that hand.
      const holding = flight.viaTool
        ? controller?.tracked && this.held.has(flight.hand)
        : controller?.tracked &&
          controller.squeeze.pressed &&
          !this.grabs.has(flight.hand) &&
          !this.held.has(flight.hand);

      if (!holding || !controller) {
        this.endFlight(entry, true);
        continue;
      }

      flight.time += dt;
      const progress = flight.time / flight.duration;
      gripOf(controller).getWorldPosition(_hand);
      flightPosition(flight.from, _hand, progress, _point);
      entry.body.setNextKinematicTranslation(_point);
      entry.body.setTranslation(_point, true);
      entry.previousPosition.copy(_point);

      if (!flightArrived(_point, _hand, progress)) continue;

      // Arrived. A hand catches it; a tool passes it to the free hand, and
      // simply lets it go when that one is busy too.
      const catcher = flight.viaTool ? this.freeHand(flight.hand) : flight.hand;
      const catcherController = catcher ? ctx.input.get(catcher) : null;
      if (!catcher || !catcherController?.tracked) {
        this.endFlight(entry, true);
        controller.pulse(0.4, 25);
        continue;
      }

      this.flights.delete(entry);
      physics.setGhost(entry, false);
      gripOf(catcherController).updateWorldMatrix(true, false);
      this.attach(catcher, gripOf(catcherController), entry);
      catcherController.pulse(0.5, 30);
    }
  }

  /** Ends a pull early. `drop` hands the prop back to the simulation. */
  private endFlight(entry: PhysicsBody, drop: boolean): void {
    const physics = this.physics!;
    if (!this.flights.delete(entry)) return;
    physics.setGhost(entry, false);
    physics.setCarried(entry, false);
    if (!drop) return;
    entry.body.setBodyType(physics.rapier.RigidBodyType.Dynamic, true);
    entry.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    const id = this.idOf(entry);
    if (id) this.sync?.release(id, _velocity.set(0, 0, 0));
  }

  /**
   * Ein Gegenstand kommt an die Hand — in sie hinein, oder, mit `controller`,
   * als **Nahgriff**: dann bleibt er, wo er ist, und folgt ihr von dort.
   */
  private attach(
    hand: Handedness,
    anchor: THREE.Object3D,
    entry: PhysicsBody,
    controller: ControllerState | null = null,
    /** Beim **Nahgreifen** der Trefferpunkt des Strahls: dort steht die
     * Geisterhand, und um ihn dreht der Nahgriff (`pivotGrab`). */
    hold: THREE.Vector3 | null = null,
  ): void {
    // A tool lying on the floor is picked up as a *tool*, not carried around
    // like a crate: one place for it, so a hand, a remote grab and a gravity
    // glove all end the same way.
    // Und auch hier: festgestellt ist festgestellt. `attach` ist die Stelle, an
    // der *jeder* Weg endet — die Hand, der Ferngriff, der Schwerkrafthandschuh
    // —, also steht die Sperre auch hier und nicht nur beim Zielen.
    if (this.holdsStill(entry)) return;
    // **Löschen in der Brille** (`buildToolsMenu`): Wer mit scharfem Löschen
    // ein hingestelltes Stück greift, reißt es ab, statt es aufzuheben.
    if (
      this.vrErase &&
      this.context?.renderer.xr.isPresenting &&
      !this.shelfFresh.has(entry) &&
      this.modelPath(entry) !== null
    ) {
      this.detonate(entry);
      return;
    }
    // Wo ein schon stehendes Stück aus dem Regal stand, bevor es aufgehoben
    // wurde — damit _Rückgängig_ es dorthin zurückstellen kann.
    if (
      !this.shelfFresh.has(entry) &&
      !entry.carried &&
      !this.pickedFrom.has(entry) &&
      this.modelPath(entry) !== null
    )
      this.pickedFrom.set(entry, this.buildPoseOf(entry));
    const loose = this.loose.get(entry);
    if (loose) {
      this.lastActHand = hand;
      this.catchLooseTool(hand, loose);
      return;
    }
    const physics = this.physics!;
    // Ein eingelassenes Bodenstück gibt seine Kacheln frei, sobald es wieder
    // in der Hand ist (`sinkFloor`).
    if (this.floorPieces.has(entry)) this.coverFloor(entry, null);
    entry.body.setBodyType(physics.rapier.RigidBodyType.KinematicPositionBased, true);
    physics.setCarried(entry, true);
    entry.object.updateWorldMatrix(true, false);
    const offset = new THREE.Matrix4()
      .copy(anchor.matrixWorld)
      .invert()
      .multiply(entry.object.matrixWorld);
    // Ein Ding mit **Griff** bleibt nicht, wo die Hand es berührt hat: sein
    // Zylinder rastet in die Faust — der Flaschenhals in die Faust um den
    // Stab —, aufrecht oder über Kopf, je nachdem, wie es gerade eher lag
    // (`propGrip.ts`). Beim Nahgreifen nicht: da bleibt es liegen, und erst
    // der Zug holt es her — und dann hierher, ohne `controller`.
    const kind = (entry.object.userData as { propKind?: PropKind }).propKind ?? null;
    const grip = propGripOf(kind);
    if (grip && !controller) {
      const scale = new THREE.Vector3();
      offset.decompose(_point, _quaternion, scale);
      const snap = snapToGrip(_quaternion, grip);
      offset.compose(snap.position, snap.rotation, scale);
      anchor.updateWorldMatrix(true, false);
      _point.setFromMatrixPosition(_matrix.multiplyMatrices(anchor.matrixWorld, offset));
    } else {
      entry.object.getWorldPosition(_point);
      // **Der Kran hält, was er hebt, im rechten Winkel zu sich** — und er
      // selbst steht immer auf einem Viertel (`core/crane.craneTurn`). Ohne
      // das blieb der Winkel zwischen Kran und Stück vom Aufnehmen stehen,
      // und `R` drehte eine Wand in sauberen 90°-Schritten schief über die
      // Platten: _„bei dem R-Modus sollte es um 90° drehen, sauber zu den
      // Bodenplatten."_ Aufrecht bleibt es ohnehin; hier fällt nur der Rest
      // der Gierung weg.
      if (this.craneNow && !controller) {
        const scale = new THREE.Vector3();
        offset.decompose(_point, _quaternion, scale);
        _quaternion.setFromAxisAngle(UP, eighthYaw(yawOf(_quaternion)));
        offset.compose(_point, _quaternion, scale);
        entry.object.getWorldPosition(_point);
      }
    }
    // **Diese Hand hat gehandelt** (`lastActHand`): Ihr gehört von jetzt an der
    // Saum, solange nur ein Gegenstand getragen wird.
    this.lastActHand = hand;
    this.grabs.set(hand, {
      entry,
      offset,
      lastPosition: _point.clone(),
      velocity: new THREE.Vector3(),
      near: controller ? this.nearGrabOf(anchor, entry, hold) : null,
      poseId: grip ? kind : null,
      shake:
        kind === 'champagne' && entry.object.getObjectByName(CORK_NAME) ? new ShakeMeter() : null,
    });

    const id = this.idOf(entry);
    if (id) this.sync?.claim(id);
  }

  /**
   * Was der Moment des Zugreifens festhält: beide Posen, gegen die *Drehung um
   * Objektmitte* rechnet. Gegen den Moment und nicht gegen das letzte Bild —
   * sonst summiert sich jeder Rundungsfehler zu einem Drift.
   *
   * Die **Neigung der Hand** stand hier einmal daneben, als Nullpunkt der
   * Zuggeste. Die Geste ist heute ein Zucken zum Körper und braucht keinen
   * Nullpunkt: sie wird in Metern je Sekunde gemessen, nicht in Grad gegen
   * vorher (`pullGesture.ts`).
   */
  private nearGrabOf(
    anchor: THREE.Object3D,
    entry: PhysicsBody,
    hold: THREE.Vector3 | null,
  ): NearGrab {
    anchor.getWorldPosition(_point);
    anchor.getWorldQuaternion(_quaternion);
    const handStart = copyPose(_point, _quaternion, {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });
    entry.object.getWorldPosition(_point);
    entry.object.getWorldQuaternion(_quaternion);
    const objectStart = copyPose(_point, _quaternion, {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });
    return {
      handStart,
      objectStart,
      // Ohne Trefferpunkt bleibt die Mitte des Gegenstands als Drehpunkt: das
      // ist dieselbe Rechnung, nur um den Punkt, den man sich denken muss
      // statt den, den man sieht.
      hold: hold ? { x: hold.x, y: hold.y, z: hold.z } : { ...objectStart.position },
    };
  }

  /**
   * @param placed Ob das ausdrücklich ein **Hinstellen** war — der
   *   Benutzen-Knopf am Schirm sagt das, eine geöffnete Faust in der Brille
   *   nicht (`gridSnap.placesOnGrid`).
   */
  private release(
    ctx: WorldContext,
    hand: Handedness,
    grab: HandGrab,
    drop: boolean,
    placed = false,
  ): void {
    const physics = this.physics!;
    // Was aus den Augen halb so groß getragen wurde, ist beim Loslassen
    // wieder so groß wie im Raum (`shrinkScreenCarry`).
    if (this.shrunk?.entry === grab.entry) this.unshrinkScreenCarry();
    this.grabs.delete(hand);
    if (!drop) return;

    physics.setCarried(grab.entry, false);
    grab.entry.body.setBodyType(physics.rapier.RigidBodyType.Dynamic, true);
    const thrown = grab.velocity.clampLength(0, 9);
    // **Ein Modell aus dem Regal rastet beim Hinstellen ein** — Kachelmitte und
    // Vierteldrehung, wie jedes Möbel dieser Welt (`gridSnap.ts`). Dann ist es
    // kein Wurf mehr, also fliegt es auch nicht: Die Geschwindigkeit, die der
    // Körper und das Netz gleich bekommen, ist null.
    const snapped = this.snapPlaced(grab.entry, placed, thrown.length());
    if (snapped) thrown.set(0, 0, 0);
    grab.entry.body.setLinvel({ x: thrown.x, y: thrown.y, z: thrown.z }, true);
    if (snapped) this.placedFromShelf(ctx, hand, grab.entry);

    // Whoever simulates picks the throw up from here.
    const id = this.idOf(grab.entry);
    if (id) this.sync?.release(id, thrown);

    if (this.reopenMenu && this.spawned.has(grab.entry)) {
      this.reopenMenu = false;
      ctx.menu.openSubmenu('bag');
    }
  }

  /**
   * **Was die Hand hielt, weicht dem, was sie jetzt nimmt** — ein anderes
   * Stück aus dem Regal, etwas aus dem Beutel, ein Werkzeug.
   *
   * Hier stand ein schlichtes Loslassen, und das war im _Baukasten_ der
   * gemeldete Fehler beim Wechseln: Loslassen ohne Schwung **ist**
   * Hinstellen (`gridSnap.placesOnGrid`), das alte Stück rastete also vor den
   * Füßen ein — und weil es frisch aus dem Regal kam, holte es gleich die
   * nächste Kopie in die Hand (`placedFromShelf`). Die warf das eben gewählte
   * Stück wieder hinaus, das rastete ein und holte **seine** nächste Kopie,
   * und so fort, Mikrotask um Mikrotask, bis die Seite stand.
   *
   * **Ein frisches Stück war nie hingestellt**: Es ist der Pinsel, mit dem man
   * baut, und wer den Pinsel wechselt, legt den alten weg und nicht auf den
   * Boden. Es verschwindet deshalb, ohne Zeile in der Liste der
   * Weltänderungen. Alles andere fällt wie bisher — und holt nichts nach,
   * weil es nicht frisch ist.
   */
  private letGo(ctx: WorldContext, hand: Handedness, grab: HandGrab): void {
    if (swapOut(this.shelfFresh.has(grab.entry)) === 'drop') {
      this.release(ctx, hand, grab, true);
      return;
    }
    this.shelfFresh.delete(grab.entry);
    this.release(ctx, hand, grab, false);
    this.removeProp(grab.entry, true);
  }

  /**
   * **Ein Modell aus dem Regal ist hingestellt worden** — in die Liste der
   * Weltänderungen damit, und im _Baukasten_ gleich das nächste in die Hand.
   *
   * Das nächste kommt nur für ein Modell, das **frisch aus dem Regal** kam
   * (`shelfFresh`): Wer ein Fass umstellt, das schon stand, bekommt kein
   * zweites. Genommen wird es erst nach diesem Loslassen und nicht mitten
   * darin (`queueMicrotask`) — die Hand ist sonst noch halb belegt, und am
   * Schirm fängt die Bildschirmhand gerade das alte auf.
   */
  private placedFromShelf(ctx: WorldContext, hand: Handedness, entry: PhysicsBody): void {
    const path = modelPathOf((entry.object.userData as { propKind?: PropKind }).propKind ?? null);
    if (path === null) return;
    this.noteModel(entry, path);
    const from = this.pickedFrom.get(entry);
    this.pickedFrom.delete(entry);
    if (!this.replaying) {
      const to = this.buildPoseOf(entry);
      this.pushBuild(
        from ? { kind: 'move', path, from, to } : { kind: 'add', item: { path, pose: to } },
      );
    }
    if (!this.shelfFresh.has(entry)) return;
    this.shelfFresh.delete(entry);
    if (!refillsCatalogue(gameMode())) return;
    // **Die nächste Kopie kommt so gedreht, wie diese hingestellt wurde** —
    // wer eine Reihe Wände quer stellt, dreht nicht jede einzeln nach.
    // Gemeldet war: _„wenn ich ein objekt rotiert habe und gesetzt habe,
    // [soll] die rotation für das nächste objekt erhalten bleiben."_
    entry.object.getWorldQuaternion(_quaternion);
    const yaw = eighthYaw(yawOf(_quaternion));
    queueMicrotask(() => {
      if (this.context === ctx) this.takeModel(ctx, path, hand, yaw);
    });
  }

  /**
   * **Ein Pinselstrich beginnt** — oder nicht, und dann wird wie bisher
   * abgelegt.
   *
   * Gewünscht war: _„im web von oben mit maus gedrückt halten mehrere objekte
   * legen (also über mehrere felder ziehen und dann wird auf jedem feld das
   * objekt gelegt) wie bei einem paint tool."_ Das Stück in der Hand ist der
   * Pinsel, wie bei der Fläche (`commitArea`): Es bleibt am Kran, und jede
   * Kachel, über die er mit gedrückter Taste fährt, bekommt eine Kopie in
   * genau seiner Drehung. Ein einfacher Klick ist ein Strich über eine
   * Kachel — und hinterlässt genau das, was vorher ein Ablegen samt
   * nachgelegter Kopie hinterließ.
   *
   * Nur **von oben**, nur im **Baukasten** (`gameMode.refillsCatalogue`), nur
   * mit einem Stück **frisch aus dem Regal** (`shelfFresh`) und nur mit der
   * **Maus** (`PlayerRig.paintHeld`) — wer ein Möbel umstellt, das schon
   * stand, stellt es hin; wer `E` drückt, auch.
   *
   * @returns ob gemalt wird
   */
  private startPaint(ctx: WorldContext, entry: PhysicsBody): boolean {
    this.paint = null;
    if (!ctx.topDown || !ctx.rig.paintHeld) return false;
    if (!refillsCatalogue(gameMode()) || !this.shelfFresh.has(entry)) return false;
    const path = modelPathOf((entry.object.userData as { propKind?: PropKind }).propKind ?? null);
    if (path === null) return false;
    entry.object.getWorldPosition(_point);
    this.paint = { entry, path, last: _point.clone(), done: new Set(), count: 0 };
    // Ein Strich ist **ein** Schritt für _Rückgängig_, wie viele Kacheln er
    // auch überstreicht (`BuildHistory.begin`).
    this.buildHistory.begin();
    this.paintAt(ctx, this.paint, _point.x, _point.z);
    return true;
  }

  /**
   * **Den Pinselstrich ein Bild weiterziehen** — von der Stelle des letzten
   * Bildes bis hierher, in Schritten unter einer halben Kachel: Der Kran folgt
   * der Maus weich, und wer schnell zieht, überspränge sonst Kacheln.
   */
  private paintStroke(ctx: WorldContext, entry: PhysicsBody): void {
    const paint = this.paint;
    if (!paint) return;
    if (paint.entry !== entry || !ctx.rig.paintHeld) {
      this.paint = null;
      this.buildHistory.end();
      if (paint.count > 1)
        ctx.notify(`${paint.count}× ${propLabel(modelKind(paint.path))} gesetzt`);
      return;
    }
    entry.object.getWorldPosition(_point);
    const steps = Math.ceil(paint.last.distanceTo(_point) / (TILE / 2));
    for (let i = 1; i <= steps; i++) {
      _direction.lerpVectors(paint.last, _point, i / steps);
      this.paintAt(ctx, paint, _direction.x, _direction.z);
    }
    paint.last.copy(_point);
  }

  /**
   * **Eine Kopie des Pinsels auf die Kachel unter diesem Punkt** — eingerastet
   * wie beim Hinstellen (`gridSnap.gridPose`), aus der Höhe der Fläche
   * (`commitArea`), und nur, wenn dort nicht schon dasselbe Modell steht.
   */
  private paintAt(
    ctx: WorldContext,
    paint: NonNullable<PortalWorld['paint']>,
    x: number,
    z: number,
  ): void {
    const entry = paint.entry;
    entry.object.getWorldQuaternion(_quaternion);
    const base = this.wallBase(entry);
    const pose = gridPose(x, z, _quaternion, base.half, base.long, this.fineTurn);
    const key = `${pose.x.toFixed(3)}/${pose.z.toFixed(3)}`;
    if (paint.done.has(key)) return;
    paint.done.add(key);
    const kind = modelKind(paint.path);
    for (const body of this.bodies.values()) {
      if (body === entry || body.carried || body.removed) continue;
      if ((body.object.userData as { propKind?: PropKind }).propKind !== kind) continue;
      const at = body.object.position;
      if (Math.hypot(at.x - pose.x, at.z - pose.z) < 0.05) return;
    }
    // **Auf den Tisch oder an die Wand, und nicht in etwas hinein**
    // (`decorTarget`): Gesetzt wird auf der Höhe, auf der es steht, und wo
    // kein Platz ist, gar nicht.
    const decor = this.decorTarget(ctx, entry, x, z);
    if (decor && !decor.valid) {
      if (!paint.refused) ctx.notify('Kein Platz — da steht schon etwas');
      paint.refused = true;
      return;
    }
    if (decor?.mounted) {
      const spot = `m:${decor.x.toFixed(2)}/${decor.y.toFixed(2)}/${decor.z.toFixed(2)}`;
      if (paint.done.has(spot)) return;
      paint.done.add(spot);
    }
    const y = decor ? decor.y : ctx.rig.getFloorY() + entry.halfExtents.y + AREA_LIFT;
    paint.count += 1;
    void this.placeModelAt(
      paint.path,
      new THREE.Vector3(decor ? decor.x : pose.x, y, decor ? decor.z : pose.z),
      decor ? decor.yaw : pose.yaw,
      true,
      // Im Baukasten steht, was gesetzt ist, **fest** — genau auf der Höhe,
      // die der Geist gezeigt hat. Sonst schiebt das nächste Stück am Haken
      // beim Vorbeifliegen die Stehlampe durch den Raum.
      true,
    );
  }

  /**
   * **Wo eine Wand aus dem Regal auf dem Gitter steht** — ihre Kanten und
   * schrägen Kacheln als Schlüssel (`gridSnap.wallCells`), in voller Länge:
   * Ein Durchgang oder ein Fenster belegt dieselbe Fuge wie eine volle Wand.
   * `null`, wenn das Ding keine eingerastete Wand ist.
   */
  private wallFootprint(entry: PhysicsBody, pose?: PlacePose): Set<string> | null {
    const out = new Set<string>();
    if (pose) {
      if (pose.diagonal) {
        for (const cell of pose.diagonal.cells) out.add(`s:${cell.x},${cell.z}`);
        return out;
      }
      if (pose.wall === null) return null;
      const base = this.wallBase(entry);
      _turnScratch.setFromAxisAngle(UP, pose.yaw);
      const cells = wallCells(pose.x, pose.z, _turnScratch, base.half, base.long);
      if (!cells) return null;
      for (const edge of cells.edges) out.add(`e:${edge.x},${edge.z},${edge.dir}`);
      return out.size ? out : null;
    }
    const diagonal = (entry.object.userData as { diagonalWall?: DiagonalWall }).diagonalWall;
    if (diagonal) {
      for (const cell of diagonal.cells) out.add(`s:${cell.x},${cell.z}`);
      return out;
    }
    entry.object.getWorldPosition(_footSpot);
    entry.object.getWorldQuaternion(_turnScratch);
    const cells = wallCells(_footSpot.x, _footSpot.z, _turnScratch, entry.halfExtents);
    if (!cells) return null;
    for (const edge of cells.edges) out.add(`e:${edge.x},${edge.z},${edge.dir}`);
    return out.size ? out : null;
  }

  /**
   * **Die Wände, die eine Wand an dieser Stelle ersetzt** — jede hingestellte,
   * die eine Fuge oder schräge Kachel mit ihr teilt. Gewünscht: _„wenn ich
   * eine andere wand dahinsetze, wo eine wand bereits existiert, … sollten
   * [die alten] ersetzt werden"_ — und vorher rot angezeigt.
   */
  private wallsUnder(entry: PhysicsBody, pose: PlacePose): PhysicsBody[] {
    const mine = this.wallFootprint(entry, pose);
    if (!mine) return [];
    const out: PhysicsBody[] = [];
    for (const other of this.placedModels(this.replaceScratch)) {
      if (other === entry) continue;
      const theirs = this.wallFootprint(other);
      if (!theirs) continue;
      for (const key of theirs)
        if (mine.has(key)) {
          out.push(other);
          break;
        }
    }
    return out;
  }

  /**
   * Die Wände unter einer neuen wegnehmen (`wallsUnder`) — ohne Spur in den
   * Weltänderungen, aber **mit** Spur für _Rückgängig_: Jede ersetzte Wand
   * wartet als _Abreißen_ in `replacedSteps`, bis der Schritt der neuen
   * kommt (`pushBuild`), und beide sind dann **ein** Schritt. Ein Zurück
   * nimmt die neue weg und stellt die alten wieder hin.
   *
   * @param record ob das ein Bauschritt ist — nicht für Stücke der Welt
   */
  private replaceWalls(entry: PhysicsBody, pose: PlacePose, record = true): void {
    // Was vom letzten Mal noch wartet, gehörte zu keinem Schritt.
    this.replacedSteps.length = 0;
    const gone = this.wallsUnder(entry, pose);
    if (!gone.length) return;
    this.markReplaced([]);
    for (const old of gone) {
      const path = this.modelPath(old);
      if (record && !this.replaying && path !== null)
        this.replacedSteps.push({ kind: 'remove', item: { path, pose: this.buildPoseOf(old) } });
      const key = this.changeKeys.get(old);
      if (key) {
        forgetChange(key);
        this.changeKeys.delete(old);
      }
      this.removeProp(old, true);
    }
  }

  /** Rot zeigen, was beim Loslassen ersetzt wird — mit dem Geist der Abrissbombe. */
  private markReplaced(entries: readonly PhysicsBody[]): void {
    const same =
      entries.length === this.replaced.size && entries.every((one) => this.replaced.has(one));
    if (same) return;
    for (const [, skins] of this.replaced) for (const [mesh, skin] of skins) mesh.material = skin;
    this.replaced.clear();
    if (!entries.length) return;
    const ghost = (this.bombGhost ??= new THREE.MeshStandardMaterial({
      color: BOMB_GHOST_COLOR,
      emissive: BOMB_GHOST_COLOR,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: BOMB_GHOST_OPACITY,
      depthWrite: false,
    }));
    for (const entry of entries) {
      const skins = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
      entry.object.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        skins.set(mesh, mesh.material);
        mesh.material = ghost;
      });
      this.replaced.set(entry, skins);
    }
  }

  /**
   * **Wie eine Wand aus dem Regal ungekürzt war** — halbe Grundfläche, Maßstab
   * und gerade Länge. Nach `fitWall` steht das unter `userData.wallBase`, denn
   * am gekürzten Körper ließe sich nicht mehr ablesen, wie viele Kacheln er
   * gerade einnähme.
   */
  private wallBase(entry: PhysicsBody): {
    half: THREE.Vector3;
    scale: THREE.Vector3;
    long: number;
  } {
    const stored = (entry.object.userData as { wallBase?: WallBase }).wallBase;
    if (stored) return stored;
    const half = entry.halfExtents.clone();
    return { half, scale: entry.object.scale.clone(), long: 2 * Math.max(half.x, half.z) };
  }

  /**
   * **Eine Wand unter 45° auf ihre Diagonale kürzen** (`gridSnap.diagonalPose`)
   * — Bild und Körper, längs ihrer langen Achse, auf `tiles`·√2 m. Eine 2×1-Wand
   * geht dann genau durch eine Kachel, eine 4×1-Wand durch zwei. Die Kacheln
   * und die Schräge stehen danach unter `userData.diagonalWall`: Die Welt auf
   * dem Gitter macht daraus Schrägen für das Zellgitter
   * (`GridWorld.refreshWallSlopes`).
   *
   * Wird sie wieder gerade hingestellt, bekommt sie ihr altes Maß zurück.
   */
  private fitWall(entry: PhysicsBody, pose: PlacePose): void {
    const data = entry.object.userData as { wallBase?: WallBase; diagonalWall?: DiagonalWall };
    const physics = this.physics;
    if (!physics) return;
    if (!pose.diagonal) {
      const base = data.wallBase;
      if (!base) return;
      entry.object.scale.copy(base.scale);
      physics.resize(entry, base.half);
      delete data.wallBase;
      delete data.diagonalWall;
      return;
    }
    const base = this.wallBase(entry);
    data.wallBase = base;
    const factor = pose.diagonal.length / base.long;
    const alongX = base.half.x >= base.half.z;
    entry.object.scale.copy(base.scale);
    const half = base.half.clone();
    if (alongX) {
      entry.object.scale.x *= factor;
      half.x *= factor;
    } else {
      entry.object.scale.z *= factor;
      half.z *= factor;
    }
    physics.resize(entry, half);
    data.diagonalWall = pose.diagonal;
  }

  /**
   * **Ein hingestelltes Modell auf das Kachelgitter setzen** — oder es liegen
   * lassen, wenn es keines ist oder geworfen wurde.
   *
   * Nur Modelle aus dem Regal (`props.ModelKind`): Der Beutel gibt Spielzeug
   * her — Würfel rollen, Murmeln kullern, Dominosteine stehen auf Lücke —, und
   * ein Würfel, der beim Loslassen auf eine Kachelmitte springt, wäre kein
   * Würfel mehr. Das Regal gibt **Möbel** her, und die stehen auf Kacheln.
   *
   * Die Höhe bleibt stehen und die Drehung um die Hochachse ist die einzige,
   * die übrig bleibt (`gridSnap.gridPose`). Den Rest macht die Schwerkraft:
   * Der Körper geht ohne Dreh und ohne Schwung los und fällt auf das, was
   * unter ihm liegt.
   *
   * @returns ob eingerastet wurde
   */
  private snapPlaced(entry: PhysicsBody, placed: boolean, speed: number): boolean {
    const kind = (entry.object.userData as { propKind?: PropKind }).propKind ?? null;
    if (modelPathOf(kind) === null) return false;
    if (!placesOnGrid(speed, placed)) return false;

    entry.object.getWorldPosition(_point);
    entry.object.getWorldQuaternion(_quaternion);
    const base = this.wallBase(entry);
    const pose = gridPose(_point.x, _point.z, _quaternion, base.half, base.long, this.fineTurn);
    // **An die Wand oder auf den Tisch** (`decorTarget`): Ein Bild hängt sich
    // an die nächste Wandfläche, eine Tasse landet auf der Platte statt einen
    // Meter darüber loszufallen.
    const decor = this.context ? this.decorTarget(this.context, entry, _point.x, _point.z) : null;
    if (decor?.mounted) {
      _point.set(decor.x, decor.y, decor.z);
      _quaternion.setFromAxisAngle(UP, decor.yaw);
    } else {
      this.replaceWalls(entry, pose);
      this.fitWall(entry, pose);
      // Auf der Höhe, auf der es steht, und nicht auf der des Hakens.
      const own = decor && !this.floorPieces.has(entry);
      _point.set(own ? decor.x : pose.x, own ? decor.y : _point.y, own ? decor.z : pose.z);
      _quaternion.setFromAxisAngle(UP, pose.yaw);
    }

    entry.object.position.copy(_point);
    entry.object.quaternion.copy(_quaternion);
    entry.object.updateWorldMatrix(true, false);
    entry.previousPosition.copy(_point);
    entry.body.setTranslation({ x: _point.x, y: _point.y, z: _point.z }, true);
    entry.body.setRotation(
      { x: _quaternion.x, y: _quaternion.y, z: _quaternion.z, w: _quaternion.w },
      true,
    );
    // Ohne diese Zeile dreht sich das Möbel nach dem Einrasten weiter aus der
    // Drehung heraus, die die Hand ihm mitgegeben hat.
    entry.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    // Fest steht, was an der Wand hängt, was auf etwas steht — und im
    // Baukasten alles: Dort wird eingerichtet und nicht gekegelt (`paintAt`).
    if (this.sinkFloor(entry)) return true;
    if (decor?.mounted || decor?.stacked || refillsCatalogue(gameMode())) this.hang(entry);
    return true;
  }

  /**
   * **Ein Bodenstück in den Boden legen** — bündig mit seiner Lauffläche auf
   * der Höhe des Bodens darunter, als fester Körper, und die Platten, die es
   * deckt, gehen so lange aus dem Bild (`coverFloor`).
   *
   * Gemeldet war: _„auch werden die floors grade darauf gesetzt statt in die
   * fläche hinein."_ Ein Bodenstück, das wie jedes andere Stück Bau auf den
   * Boden **sinkt** (`applyStance`), liegt um seine ganze Dicke darüber, und
   * darauf steht dann jede Wand höher als daneben. Also sinkt es nicht,
   * sondern wird **gesetzt**: Die Welt sagt, wo ihr Boden an dieser Stelle
   * liegt (`floorTopAt`), und der Körper wird dort festgemacht — ein Körper
   * mit Schwerkraft, der zur Hälfte im Boden steckt, würde von der Physik
   * wieder herausgedrückt.
   *
   * Weiß die Welt keinen Boden (das Portal-Labor hat kein Kachelraster), bleibt
   * es beim Sinken.
   *
   * @returns ob eingelassen wurde
   */
  private sinkFloor(entry: PhysicsBody): boolean {
    const tread = this.floorPieces.get(entry);
    const physics = this.physics;
    if (tread === undefined || !physics) return false;
    entry.object.getWorldPosition(_point);
    entry.object.getWorldQuaternion(_quaternion);
    const yaw = quarterYaw(yawOf(_quaternion));
    const { halfX, halfZ } = turnedHalf(entry.halfExtents, yaw);
    const tiles = tilesCovered(
      _point.x - halfX,
      _point.x + halfX,
      _point.z - halfZ,
      _point.z + halfZ,
    );
    const top = this.floorTopAt(tiles, _point.y);
    if (top === null) return false;
    _point.y = top - tread;
    entry.object.position.copy(_point);
    entry.object.updateWorldMatrix(true, false);
    entry.previousPosition.copy(_point);
    entry.body.setBodyType(physics.rapier.RigidBodyType.Fixed, true);
    entry.body.setTranslation({ x: _point.x, y: _point.y, z: _point.z }, true);
    entry.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.coverFloor(entry, { tiles, top });
    return true;
  }

  /**
   * **Wie hoch der Boden unter diesen Kacheln liegt** — die Oberkante, auf der
   * man geht, oder `null`, wenn diese Welt es nicht weiß.
   *
   * @param below von hier aus nach unten gesucht: Unter dem Podest liegt
   *   dieselbe Kachel noch einmal, und gemeint ist der Boden unter dem Stück.
   */
  protected floorTopAt(_tiles: readonly GridTile[], _below: number): number | null {
    return null;
  }

  /**
   * **Diese Kacheln deckt jetzt ein Bodenstück**, bündig auf `top` — `null`
   * heißt: keine mehr
   * (aufgehoben, abgerissen, weggeräumt). Die Welt nimmt ihre eigenen Platten
   * dort aus dem Bild und legt sie zurück, sobald das Stück weg ist
   * (`GridWorld`).
   */
  protected coverFloor(
    _entry: PhysicsBody,
    _cover: { readonly tiles: readonly GridTile[]; readonly top: number } | null,
  ): void {}

  /**
   * **Das Gitter unter dem Getragenen nachführen** — oder es wegnehmen, wenn
   * gerade nichts getragen wird, das einrastet.
   *
   * Gezeigt wird genau das, was `snapPlaced` gleich tun würde: dieselbe
   * eingerastete Lage, dieselbe Grundfläche, dieselben Kacheln. Zwei
   * Rechnungen wären zwei Antworten, und die zweite fiele erst auf, wenn das
   * Fass neben dem leuchtenden Feld landet.
   *
   * **Nur Modelle aus dem Regal**, und aus demselben Grund wie dort: Der
   * Beutel gibt Spielzeug her, das gar nicht einrastet, und ein Gitter unter
   * einem Würfel verspräche etwas, das nicht passiert.
   */
  private updatePlaceGrid(ctx: WorldContext): void {
    const grid = this.placeGrid;
    if (!grid) return;
    const entry = this.carriedModel();
    if (!entry) {
      grid.hide();
      this.markReplaced([]);
      return;
    }
    entry.object.getWorldPosition(_point);
    entry.object.getWorldQuaternion(_quaternion);
    const base = this.wallBase(entry);
    const pose = gridPose(_point.x, _point.z, _quaternion, base.half, base.long, this.fineTurn);
    const floorY = ctx.rig.getFloorY();
    // **Was hier schon steht, wird ersetzt** — und leuchtet rot, solange man
    // darüber hält (`wallsUnder`).
    this.markReplaced(this.wallsUnder(entry, pose));
    // **Eine Wand unter 45°** zeigt ihre Schräge — ein Strich durch jede
    // Kachel, durch die sie geht (`PlaceGrid.showSlants`).
    if (pose.diagonal) {
      const slope = pose.diagonal.slope;
      grid.showSlants(
        pose.diagonal.cells.map((cell) => ({ ...cell, slope })),
        floorY,
      );
      return;
    }
    // **Die Grundfläche einer Vierteldrehung** ist die des Colliders, bei einer
    // Viertel- oder Dreivierteldrehung mit vertauschten Achsen
    // (`gridSnap.turnedHalf`) — dieselbe, mit der gerade eingerastet wurde.
    const { halfX, halfZ } = turnedHalf(entry.halfExtents, pose.yaw);
    const floor = ctx.rig.getFloorY();
    // **Eine Wand bekommt ihre Kante und keine Kacheln**: Sie steht zwischen
    // zwei Reihen, und eine leuchtende Kachel sagte „hier", wo nichts steht.
    if (pose.wall !== null) {
      grid.showEdges(wallEdges(pose, halfX, halfZ), floor);
      return;
    }
    grid.show(tilesCovered(pose.x - halfX, pose.x + halfX, pose.z - halfZ, pose.z + halfZ), floor);
  }

  /**
   * **Was aus dem Regal hingestellt ist** — jedes Modell (`props.ModelKind`),
   * das gerade niemand trägt.
   *
   * Die Gitterwelt fragt danach, weil eine hingestellte Wand von oben genauso
   * durchsichtig werden soll wie eine gebaute (`GridWorld.stepWallGhosts`).
   * Getragenes fällt heraus: Was man in der Hand hat, soll man sehen.
   */
  protected placedModels(out: PhysicsBody[]): PhysicsBody[] {
    out.length = 0;
    for (const entry of this.bodies.values()) {
      if (entry.carried || entry.removed) continue;
      const kind = (entry.object.userData as { propKind?: PropKind }).propKind ?? null;
      if (modelPathOf(kind) !== null) out.push(entry);
    }
    return out;
  }

  /**
   * **Was gerade getragen wird und beim Hinstellen einrastet** — oder `null`.
   *
   * Beide Hände und die Bildschirmhand laufen über dieselben `grabs`
   * (`screenCarrySide`), also genügt ein Blick in diese eine Liste. Hält
   * jemand zwei Möbel, gewinnt das erste: Ein Gitter kann nur eine Antwort
   * geben, und zwei übereinander wären keine.
   */
  private carriedModel(): PhysicsBody | null {
    for (const grab of this.grabs.values()) {
      const kind = (grab.entry.object.userData as { propKind?: PropKind }).propKind ?? null;
      if (modelPathOf(kind) !== null) return grab.entry;
    }
    return null;
  }

  // --- Baukasten: Werkzeugleiste, Geist, Rückgängig ---------------------------

  /** Die Adresse im Regal, wenn das ein Modell aus dem Regal ist — sonst `null`. */
  private modelPath(entry: PhysicsBody): string | null {
    return modelPathOf((entry.object.userData as { propKind?: PropKind }).propKind ?? null);
  }

  /**
   * **Einen Bauschritt ablegen** — samt der Wände, die er ersetzt hat
   * (`replaceWalls`): dann als Gruppe, erst das Abreißen, dann der Schritt.
   */
  private pushBuild(step: BuildStep): void {
    const before = this.replacedSteps.splice(0);
    this.buildHistory.push(before.length ? { kind: 'group', steps: [...before, step] } : step);
  }

  /** Wo ein Stück gerade steht, als Lage für den Stapel (`buildHistory.ts`). */
  private buildPoseOf(entry: PhysicsBody): BuildPose {
    entry.object.getWorldPosition(_point);
    entry.object.getWorldQuaternion(_quaternion);
    const fixed = this.physics?.rapier.RigidBodyType.Fixed;
    return {
      x: _point.x,
      y: _point.y,
      z: _point.z,
      yaw: yawOf(_quaternion),
      fixed: fixed !== undefined && !entry.removed && entry.body.bodyType() === fixed,
    };
  }

  /** Ein hingestelltes Modell weg — für alle, und ohne Zeile in der Liste der Weltänderungen. */
  private dropModel(entry: PhysicsBody): void {
    const key = this.changeKeys.get(entry);
    if (key) {
      forgetChange(key);
      this.changeKeys.delete(entry);
    }
    this.removeProp(entry, true);
  }

  /**
   * **Ein Wandstück hängt** — als fester Körper, genau dort, wo es ist: Ein
   * Bild, das nach dem Aufhängen der Schwerkraft folgte, läge eine Sekunde
   * später am Fuß der Wand.
   */
  private hang(entry: PhysicsBody): void {
    const physics = this.physics;
    if (!physics || entry.removed) return;
    entry.body.setBodyType(physics.rapier.RigidBodyType.Fixed, true);
    entry.body.setLinvel(_zeroVelocity, true);
    entry.body.setAngvel(_zeroVelocity, true);
  }

  /**
   * **Die Wände und Möbel, die die Welt selbst gebaut hat**, als Kästen — für
   * das Stapeln und das Anheften (`decorTarget`). Diese Welt hat keine; die
   * Gitterwelt reicht ihren Grundriss herein (`GridWorld`).
   */
  protected decorSolids(_out: DecorBox[]): void {}

  /** Was um ein getragenes Stück herum steht: die Welt und jedes andere hingestellte Modell. */
  private decorScene(except: PhysicsBody | null): { boxes: DecorBox[]; models: number } {
    const boxes = this.decorScratch;
    boxes.length = 0;
    for (const other of this.placedModels(this.decorModels)) {
      if (other === except) continue;
      other.object.getWorldPosition(_point);
      other.object.getWorldQuaternion(_quaternion);
      // In Achteln: Ein schräges Möbel (`fineTurn`) braucht die Hülle unter
      // 45° und nicht die einer Vierteldrehung.
      const { halfX, halfZ } = turnedHalf(other.halfExtents, eighthYaw(yawOf(_quaternion)));
      boxes.push(
        boxAround(_point.x, _point.y, _point.z, 2 * halfX, 2 * other.halfExtents.y, 2 * halfZ),
      );
    }
    const models = boxes.length;
    this.decorSolids(boxes);
    return { boxes, models };
  }

  /** Die Wände aus dem Regal, die unter 45° stehen (`fitWall`) — für `slantMountPose`. */
  private slantWalls(except: PhysicsBody | null): SlantWall[] {
    const out: SlantWall[] = [];
    for (const other of this.placedModels(this.slantScratch)) {
      if (other === except) continue;
      const diagonal = (other.object.userData as { diagonalWall?: DiagonalWall }).diagonalWall;
      if (!diagonal) continue;
      other.object.getWorldPosition(_point);
      const base = this.wallBase(other);
      // „╱" läuft von Südwest nach Nordost (+x, −z), „╲" von Nordwest nach Südost.
      const dirZ = diagonal.slope === 'slash' ? -Math.SQRT1_2 : Math.SQRT1_2;
      out.push({
        x: _point.x,
        z: _point.z,
        dirX: Math.SQRT1_2,
        dirZ,
        half: diagonal.length / 2,
        thick: Math.min(base.half.x, base.half.z),
        bottom: _point.y - other.halfExtents.y,
        top: _point.y + other.halfExtents.y,
      });
    }
    return out;
  }

  /**
   * **Wo das getragene Stück landen würde, wenn der Kran bei (`x`, `z`) steht**
   * — und ob dort Platz ist (`decorPlace.ts`).
   *
   * - **Wandstücke** (`mountsOnWall`) hängen an der nächsten Wandfläche vor
   *   dem Kran, flach und mit der Vorderseite in den Raum.
   * - **Alles andere** rastet wie bisher auf dem Gitter ein (`gridPose`) und
   *   steht auf dem, was unter seiner Mitte liegt — dem Boden, einem Tisch,
   *   einem Regalbrett (`restOn`).
   * - **Wände und Bodenstücke** bleiben bei ihren eigenen Regeln: Eine Wand
   *   ersetzt, was auf ihrer Fuge steht (`wallsUnder`), ein Bodenstück liegt
   *   im Boden (`sinkFloor`). Für sie gibt es hier nur die Lage.
   *
   * `y` ist die **Mitte** des Stücks — dort, wo auch sein Ursprung liegt.
   * `null` für alles, was nicht aus dem Regal kommt.
   */
  private decorTarget(
    ctx: WorldContext,
    entry: PhysicsBody,
    x: number,
    z: number,
  ): {
    x: number;
    y: number;
    z: number;
    yaw: number;
    mounted: boolean;
    stacked: boolean;
    valid: boolean;
    on: PhysicsBody | null;
  } | null {
    const path = this.modelPath(entry);
    if (path === null) return null;
    const floorY = ctx.rig.getFloorY();
    const half = entry.halfExtents;
    const { boxes, models } = this.decorScene(entry);
    if (mountsOnWall(path)) {
      const size = mountSize(half.x, half.y, half.z);
      const mount = mountPose(x, z, wallFaces(boxes), size, floorY, half.x >= half.z);
      // **Auch an eine Wand unter 45°** (`slantMountPose`) — gewinnt, wenn der
      // Kran näher an ihr steht als an einer geraden.
      const slant = slantMountPose(x, z, this.slantWalls(entry), size, floorY, half.x >= half.z);
      const straightGap = mount
        ? Math.abs((mount.face.axis === 'x' ? x : z) - mount.face.at)
        : Infinity;
      if (slant && Math.abs(slant.distance) < straightGap) {
        const blocked = slantBlocked(slant, size, boxes.slice(0, models));
        return { ...slant, mounted: true, stacked: false, valid: !blocked, on: null };
      }
      if (mount) {
        const blocked = mountBlocked(mount, size, boxes.slice(0, models));
        return { ...mount, mounted: true, stacked: false, valid: !blocked, on: null };
      }
    }
    entry.object.getWorldQuaternion(_quaternion);
    const base = this.wallBase(entry);
    const pose = gridPose(x, z, _quaternion, base.half, base.long, this.fineTurn);
    const turned = turnedHalf(half, pose.yaw);
    // Kleinkram auf einer Fläche rastet auf Viertelkacheln der Fläche ein und
    // nicht auf der Kachelmitte (`surfaceSpot`) — sonst stünde das Buch neben
    // dem Wandbrett statt darauf.
    const spot = surfaceSpot(x, z, turned, floorY, boxes) ?? pose;
    const plain = { x: spot.x, z: spot.z, yaw: pose.yaw, mounted: false, on: null };
    if (pose.wall !== null || pose.diagonal || this.floorPieces.has(entry))
      return { ...plain, y: floorY + half.y, stacked: false, valid: true };
    const rest = restOn(
      { x: spot.x, z: spot.z, halfX: turned.halfX, halfZ: turned.halfZ },
      2 * half.y,
      floorY,
      boxes,
    );
    const on =
      rest.support >= 0 && rest.support < models ? (this.decorModels[rest.support] ?? null) : null;
    return {
      ...plain,
      y: rest.y + half.y + 0.005,
      stacked: rest.support >= 0,
      valid: !rest.blocked,
      on: on && on !== entry ? on : null,
    };
  }

  /**
   * **Die Werkzeugleiste, der Geist und Rückgängig** — je Bild einmal.
   *
   * Der **Geist** (`placeGhost.ts`) steht unter jedem getragenen Stück aus
   * dem Regal, in jedem Modus und auch in der Brille: Er ist die Antwort auf
   * „wo landet das?", und die Frage stellt sich überall. Die **Leiste**
   * (`buildBar.ts`) gibt es nur am Schirm und auf dem Telefon, als Kran im
   * _Baukasten_ — sie ist DOM, und in der Brille gibt es keinen Zeiger über
   * einem Bild. Dort liegen _Rückgängig_ und _Wiederholen_ im Menü
   * _Weltänderungen_.
   */
  private updateBuild(ctx: WorldContext): void {
    const carried = this.carriedModel();
    const target = carried ? this.decorTarget(ctx, carried, ...this.carriedSpot(carried)) : null;
    if (carried && target && !this.areaOn) {
      const ghost = (this.placeGhost ??= new PlaceGhost());
      if (ghost.root.parent !== ctx.scene) ctx.scene.add(ghost.root);
      ghost.show(carried.object, target.x, target.y, target.z, target.yaw, target.valid);
    } else this.placeGhost?.hide();

    const presenting = ctx.renderer.xr.isPresenting;
    const visible = !presenting && Boolean(ctx.crane) && refillsCatalogue(gameMode());
    if (!visible) {
      this.surfaceTool = null;
      if (this.buildBar) {
        this.buildBar.take();
        this.buildBar.show(HIDDEN_BUILD_BAR);
      }
      return;
    }
    if (carried && this.shelfFresh.has(carried)) {
      const path = this.modelPath(carried);
      carried.object.getWorldQuaternion(_quaternion);
      if (path !== null) this.lastBrush = { path, yaw: eighthYaw(yawOf(_quaternion)) };
    }
    const bar = (this.buildBar ??= new BuildBar());
    for (const event of bar.take()) this.onBuildEvent(ctx, event);

    const tool: BuildTool = this.surfaceTool
      ? this.surfaceTool
      : this.pipette
        ? 'copy'
        : this.bomb
          ? 'erase'
          : carried && this.shelfFresh.has(carried)
            ? 'place'
            : 'move';
    const path = carried ? this.modelPath(carried) : null;
    let status = '';
    const surface = this.surfaceTool ? this.surfacePreview(ctx) : null;
    if (surface) status = surface.status;
    else if (this.pipette) status = 'Kopieren: das Stück anklicken, das kopiert werden soll';
    else if (this.bomb) status = 'Löschen: Stück unter dem Kran anklicken';
    else if (carried && path && target) {
      const name = propLabel(modelKind(path));
      const where = target.mounted
        ? 'an der Wand'
        : target.on
          ? `auf ${propLabel(modelKind(this.modelPath(target.on) ?? ''))}`
          : target.stacked
            ? 'aufgestellt'
            : 'auf dem Boden';
      status = target.valid ? `${name} · ${where}` : `${name} · kein Platz`;
    } else if (!carried) status = 'Verschieben: Stück anklicken, um es aufzuheben';
    const wall = carried ? this.isWallPiece(carried) : false;
    bar.show({
      visible: true,
      tool,
      canUndo: this.buildHistory.canUndo,
      canRedo: this.buildHistory.canRedo,
      turnStep: wall ? '45°' : '90°',
      canTurn: carried !== null,
      fine: this.fineTurn,
      status,
      valid: surface ? surface.valid : carried && target && !this.bomb ? target.valid : null,
    });
  }

  /**
   * **Verschieben am Schirm: ein Klick hebt auf, was unter dem Kran steht.**
   *
   * In der Brille nimmt die Hand ein Stück mit dem Griff; am Schirm gab es
   * dafür keinen Weg — was aus dem Regal einmal stand, ließ sich nur noch
   * abreißen und neu holen. Jetzt nimmt der Benutzen-Druck (Klick, `E`, `A`)
   * mit leerem Haken das Modell unter dem Kran in die Bildschirmhand, in
   * _Einrichten_ und _Baukasten_; der nächste Druck stellt es wieder hin,
   * eingerastet wie jedes Stück, und _Rückgängig_ stellt es zurück.
   *
   * @returns ob etwas aufgehoben wurde — dann ist der Druck verbraucht
   */
  private liftUnderCrane(ctx: WorldContext): boolean {
    const found = this.liftTarget(ctx);
    if (!found) return false;
    if (this.pipette) {
      this.copyFrom(ctx, found);
      return true;
    }
    this.pickedFrom.set(found, this.buildPoseOf(found));
    if (!this.screenCatch(ctx, found)) {
      this.pickedFrom.delete(found);
      return false;
    }
    return true;
  }

  /** Was ein Druck mit leerem Kran aufheben würde (`liftUnderCrane`) — oder `null`. */
  private liftTarget(ctx: WorldContext): PhysicsBody | null {
    if (!ctx.crane || !movesFurniture(gameMode()) || ctx.renderer.xr.isPresenting) return null;
    const side = this.screenCarrySide();
    if (!side || this.grabs.has(side) || this.bomb) return null;
    ctx.rig.getHeadPosition(_point);
    const floor = ctx.rig.getFloorY();
    // Von oben nach unten: Die Tasse auf dem Tisch ist gemeint, nicht der
    // Tisch unter ihr — und das Bild an der Wand hängt auf Augenhöhe.
    for (const height of [1.6, 1.2, 0.5]) {
      _point.y = floor + height;
      const one = this.findProp(_point);
      if (one && this.modelPath(one) !== null && !this.holdsStill(one)) return one;
    }
    return null;
  }

  /** Ob ein Stück in Achteln dreht: Wände aus dem Regal immer, alles andere mit `fineTurn`. */
  private isWallPiece(entry: PhysicsBody): boolean {
    const path = this.modelPath(entry);
    if (path === null || mountsOnWall(path)) return false;
    entry.object.getWorldPosition(_point);
    entry.object.getWorldQuaternion(_quaternion);
    const base = this.wallBase(entry);
    const pose = gridPose(_point.x, _point.z, _quaternion, base.half, base.long);
    return pose.wall !== null || Boolean(pose.diagonal);
  }

  /** Wo das Getragene gerade über dem Boden hängt — dieselbe Stelle, die das Gitter nimmt. */
  private carriedSpot(entry: PhysicsBody): [number, number] {
    entry.object.getWorldPosition(_point);
    return [_point.x, _point.z];
  }

  /** Ein Druck auf die Leiste (`buildBar.ts`). */
  private onBuildEvent(ctx: WorldContext, event: BuildEvent): void {
    switch (event.kind) {
      case 'undo':
      case 'redo': {
        const step = event.kind === 'undo' ? this.buildHistory.undo() : this.buildHistory.redo();
        if (!step) {
          ctx.notify(
            event.kind === 'undo' ? 'Nichts rückgängig zu machen' : 'Nichts zu wiederholen',
          );
          return;
        }
        const words = describeStep(step, (one) => propLabel(modelKind(one)));
        ctx.notify(`${event.kind === 'undo' ? 'Rückgängig' : 'Wiederholt'}: ${words}`);
        void this.replayStep(step);
        return;
      }
      case 'turn': {
        const carried = this.carriedModel();
        if (!carried) return;
        // Ein Achtel je Druck für Wände (die stehen auch schräg), sonst ein
        // Viertel — alles andere rastet ohnehin auf ein Viertel.
        const wall = this.isWallPiece(carried) || this.fineTurn;
        let yaw = _euler.setFromQuaternion(ctx.rig.quaternion, 'YXZ').y;
        for (let i = wall ? 1 : 2; i > 0; i--) yaw = craneTurn(yaw, event.clockwise);
        ctx.rig.rotation.set(0, yaw, 0);
        ctx.rig.updateMatrixWorld(true);
        return;
      }
      case 'copy':
        this.armCopy(ctx);
        return;
      case 'fine':
        this.fineTurn = !this.fineTurn;
        ctx.notify(
          this.fineTurn ? 'Drehen: auch Möbel in 45°-Schritten' : 'Drehen: Möbel in 90°-Schritten',
        );
        return;
      case 'tool':
        this.pickTool(ctx, event.tool);
        return;
    }
  }

  /** Das Werkzeug wechseln — der Haken wird dafür geleert oder gefüllt. */
  private pickTool(ctx: WorldContext, tool: BuildTool): void {
    this.pipette = false;
    if (tool === 'floor' || tool === 'wall') {
      this.pickSurface(ctx, tool);
      return;
    }
    this.surfaceTool = null;
    const side = this.screenCarrySide();
    const grab = side ? this.grabs.get(side) : undefined;
    // Den Pinsel weglegen: Ein frisches Stück war nie hingestellt (`letGo`).
    const empty = (): void => {
      if (side && grab && this.shelfFresh.has(grab.entry)) this.letGo(ctx, side, grab);
    };
    if (tool === 'erase') {
      if (this.bomb) return;
      empty();
      const still = this.screenCarrySide();
      if (still && this.grabs.has(still)) {
        ctx.notify('Erst das Getragene abstellen');
        return;
      }
      this.fetchBomb(ctx);
      return;
    }
    if (this.bomb) this.putBombAway();
    if (tool === 'move') {
      empty();
      return;
    }
    if (grab) return;
    const brush = this.lastBrush;
    if (brush) this.takeModel(ctx, brush.path, side ?? null, brush.yaw);
    else {
      // Noch nichts gesetzt: Das Regal aufschlagen, dort wird ausgesucht.
      ctx.menu.toggle(true);
      ctx.menu.openSubmenu('assets');
    }
  }

  /**
   * **Kopieren: das Stück, das man als Nächstes anklickt, wird zum Pinsel** —
   * dieselbe Datei, dieselbe Drehung. Wer ein Bild schon an der Wand hat und
   * ein zweites daneben will, muss es nicht im Regal suchen.
   *
   * Ein **Werkzeug** und kein Sofort-Knopf: Wer mit der Maus zur Leiste
   * fährt, zieht den Kran unterwegs vom Stück weg, und ein Knopf, der „das
   * unter dem Kran" kopiert, träfe dann den Boden neben der Leiste. Also
   * schaltet der Knopf nur um, und der nächste Druck auf ein Stück kopiert
   * (`liftUnderCrane`) — wie die Abrissbombe beim Löschen.
   */
  private armCopy(ctx: WorldContext): void {
    const side = this.screenCarrySide();
    const grab = side ? this.grabs.get(side) : undefined;
    if (side && grab && this.shelfFresh.has(grab.entry)) this.letGo(ctx, side, grab);
    if (this.bomb) this.putBombAway();
    this.surfaceTool = null;
    this.pipette = true;
  }

  /** Den Pinsel aus einem stehenden Stück machen (`armCopy`). */
  private copyFrom(ctx: WorldContext, source: PhysicsBody): void {
    const path = this.modelPath(source);
    this.pipette = false;
    if (path === null) return;
    source.object.getWorldQuaternion(_quaternion);
    const side = this.screenCarrySide();
    this.takeModel(ctx, path, side ?? null, eighthYaw(yawOf(_quaternion)));
    ctx.notify(`Kopiert: ${propLabel(modelKind(path))}`);
  }

  // --- Baukasten: Boden und Wand (`surfaceDecor.ts`) --------------------------

  /**
   * **_Boden_ oder _Wand_ in die Hand nehmen** — der Haken wird dafür leer,
   * die Bombe geht weg. Wer den Knopf drückt, während das Werkzeug schon gilt,
   * bekommt das nächste Muster: Eine Leiste mit einem Knopf je Muster wäre
   * doppelt so lang, und ausprobieren ist hier ohnehin der Weg.
   */
  private pickSurface(ctx: WorldContext, tool: 'floor' | 'wall'): void {
    if (this.surfaceTool === tool) {
      if (tool === 'floor') this.floorStyle = nextStyle(FLOOR_STYLES, this.floorStyle);
      else this.wallStyle = nextStyle(WALL_STYLES, this.wallStyle);
    }
    this.surfaceTool = tool;
    const side = this.screenCarrySide();
    const grab = side ? this.grabs.get(side) : undefined;
    if (side && grab && this.shelfFresh.has(grab.entry)) this.letGo(ctx, side, grab);
    if (this.bomb) this.putBombAway();
    const style = this.surfaceStyle(tool);
    ctx.notify(
      tool === 'floor'
        ? `Boden: ${style.label} · Raum anklicken · noch einmal ▤ für ein anderes Muster`
        : `Wand: ${style.label} · Wandseite anklicken · noch einmal ▥ für ein anderes Muster`,
    );
    // Die Stücke schon laden — der Klick soll sie in einem Zug setzen.
    void kaykitModel(style.path);
    if (style.half) void kaykitModel(style.half);
  }

  private surfaceStyle(tool: 'floor' | 'wall'): (typeof FLOOR_STYLES)[number] {
    return tool === 'floor'
      ? FLOOR_STYLES[this.floorStyle % FLOOR_STYLES.length]!
      : WALL_STYLES[this.wallStyle % WALL_STYLES.length]!;
  }

  /** Der Raum um diesen Punkt (`floodRoom`) — `null`, wenn es keiner ist. */
  private roomAt(x: number, z: number, floorY: number): RoomTile[] | null {
    const { boxes } = this.decorScene(null);
    const room = floodRoom({ col: Math.floor(x), row: Math.floor(z) }, blockedEdges(boxes, floorY));
    return room.closed ? room.tiles : null;
  }

  /**
   * **Was _Boden_ oder _Wand_ gerade belegen würde** — leuchtend im Gitter
   * und als Zeile über der Leiste. Je Bild neu gerechnet: Ein Raum hat
   * höchstens `ROOM_MAX` Kacheln, das ist billiger als eine Merkliste, die
   * bei jeder neuen Wand veralten könnte.
   */
  private surfacePreview(ctx: WorldContext): { status: string; valid: boolean } | null {
    const tool = this.surfaceTool;
    if (!tool) return null;
    const style = this.surfaceStyle(tool);
    const floorY = ctx.rig.getFloorY();
    ctx.rig.getHeadPosition(_point);
    const grid = this.placeGrid;
    if (tool === 'floor') {
      const tiles = this.roomAt(_point.x, _point.z, floorY);
      if (!tiles) {
        grid?.hide();
        return { status: `Boden: ${style.label} · hier ist kein geschlossener Raum`, valid: false };
      }
      grid?.show(
        tiles.map((tile) => ({ x: tile.col + 0.5, z: tile.row + 0.5 })),
        floorY,
        AREA_PREVIEW,
      );
      return { status: `Boden: ${style.label} · ${tiles.length} Kacheln · klicken`, valid: true };
    }
    const face = nearestFace(_point.x, _point.z, wallFaces(this.decorScene(null).boxes), floorY);
    if (!face) {
      grid?.hide();
      return { status: `Wand: ${style.label} · näher an eine Wand`, valid: false };
    }
    const line = face.at - face.normal * 0.02;
    const edges: GridEdge[] = [];
    for (let at = Math.round(face.from); at < Math.round(face.to); at++)
      edges.push(
        face.axis === 'z'
          ? { x: at + 0.5, z: line, alongX: true }
          : { x: line, z: at + 0.5, alongX: false },
      );
    grid?.showEdges(edges, floorY, AREA_PREVIEW);
    const side = style.kind === 'panel' ? 'diese Seite' : 'ganze Wand';
    return { status: `Wand: ${style.label} · ${side} · klicken`, valid: true };
  }

  /**
   * **Boden oder Wand belegen** — am Kran (`updateUsables`) oder in der
   * Brille an der Stelle, an der man steht (`buildToolEntries`).
   *
   * Ein **Schritt** für _Rückgängig_, samt dem, was dabei ersetzt wurde:
   * andere Bodenstücke im Raum, alte Fliesen auf derselben Seite, Regalwände
   * auf der Fuge (`replaceWalls`). Die Stücke werden vorher geladen, damit
   * alles in einem Zug entsteht und die Gruppe sich gleich schließt.
   */
  private async applySurface(
    ctx: WorldContext,
    tool: 'floor' | 'wall',
    x: number,
    z: number,
  ): Promise<void> {
    const style = this.surfaceStyle(tool);
    this.vrErase = false;
    const physics = this.physics;
    const models = await Promise.all([
      kaykitModel(style.path),
      style.half ? kaykitModel(style.half) : null,
    ]);
    // An der Physik und nicht am Kontext — der ist jedes Bild ein neuer.
    if (!physics || this.physics !== physics || !models[0]) return;
    const floorY = ctx.rig.getFloorY();
    if (tool === 'floor') this.applyFloor(ctx, style.path, style.label, x, z, floorY);
    else this.applyWall(ctx, style, x, z, floorY);
  }

  private applyFloor(
    ctx: WorldContext,
    path: string,
    label: string,
    x: number,
    z: number,
    floorY: number,
  ): void {
    const tiles = this.roomAt(x, z, floorY);
    if (!tiles) {
      ctx.notify('Hier ist kein geschlossener Raum — für draußen gibt es ▦ Fläche');
      return;
    }
    const keys = new Set(tiles.map((tile) => `${tile.col},${tile.row}`));
    const done = new Set<string>();
    this.buildHistory.begin();
    // Was schon als Boden im Raum liegt: dasselbe Muster bleibt, ein anderes
    // geht (als Schritt, damit _Rückgängig_ es zurückbringt).
    for (const entry of [...this.placedModels(this.decorModels)]) {
      if (!this.floorPieces.has(entry)) continue;
      entry.object.getWorldPosition(_point);
      const key = `${Math.floor(_point.x)},${Math.floor(_point.z)}`;
      if (!keys.has(key)) continue;
      const own = this.modelPath(entry);
      if (own === path) {
        done.add(key);
        continue;
      }
      if (own !== null)
        this.buildHistory.push({
          kind: 'remove',
          item: { path: own, pose: this.buildPoseOf(entry) },
        });
      this.dropModel(entry);
    }
    let placed = 0;
    for (const tile of tiles) {
      if (done.has(`${tile.col},${tile.row}`)) continue;
      placed += 1;
      const at = new THREE.Vector3(tile.col + 0.5, floorY + 0.2, tile.row + 0.5);
      void this.placeModelAt(path, at, 0);
    }
    this.buildHistory.end();
    ctx.notify(placed ? `Boden: ${placed}× ${label}` : `Boden: der Raum hat schon ${label}`);
  }

  private applyWall(
    ctx: WorldContext,
    style: (typeof WALL_STYLES)[number],
    x: number,
    z: number,
    floorY: number,
  ): void {
    const face = nearestFace(x, z, wallFaces(this.decorScene(null).boxes), floorY);
    if (!face) {
      ctx.notify('Keine Wand in der Nähe — mit dem Kran näher an eine Wand');
      return;
    }
    this.buildHistory.begin();
    let placed = 0;
    if (style.kind === 'panel') {
      // Alte Fliesen **dieser** Seite gehen; die der anderen bleiben.
      for (const entry of [...this.placedModels(this.decorModels)]) {
        const own = this.modelPath(entry);
        if (own === null || !isWallPanel(own)) continue;
        entry.object.getWorldPosition(_point);
        if (!onFace(face, _point.x, _point.z)) continue;
        this.buildHistory.push({
          kind: 'remove',
          item: { path: own, pose: this.buildPoseOf(entry) },
        });
        this.dropModel(entry);
      }
      for (const spot of panelSpots(face, PANEL_SIZE, floorY)) {
        placed += 1;
        void this.placeModelAt(
          style.path,
          new THREE.Vector3(spot.x, spot.y, spot.z),
          spot.yaw,
          true,
          true,
        );
      }
    } else {
      // Eine ganze Wand auf die Fuge: Was dort aus dem Regal steht, ersetzt
      // sie (`replaceWalls`), eine gebaute deckt sie zu.
      for (const spot of wallSpots(face, floorY, SURFACE_WALL_HEIGHT)) {
        placed += 1;
        const path = spot.long || !style.half ? style.path : style.half;
        void this.placeModelAt(
          path,
          new THREE.Vector3(spot.x, spot.y, spot.z),
          spot.yaw,
          true,
          true,
        );
      }
    }
    this.buildHistory.end();
    ctx.notify(`Wand: ${placed}× ${style.label}`);
  }

  /**
   * **Einen Schritt nachspielen** — für _Rückgängig_ (schon umgedreht) und
   * _Wiederholen_. Gesucht wird ein Stück an seiner Lage (`nearestAt`), nicht
   * an einem gemerkten Körper: Nach einem Wiederholen ist es ein neues.
   */
  private async replayStep(step: BuildStep): Promise<void> {
    this.replaying = true;
    try {
      await this.applyBuildStep(step);
    } finally {
      this.replaying = false;
    }
  }

  private async applyBuildStep(step: BuildStep): Promise<void> {
    switch (step.kind) {
      case 'group':
        for (const one of step.steps) await this.applyBuildStep(one);
        return;
      case 'add': {
        // Fest, wenn es fest stand (auf einem Tisch, an der Wand) — sonst
        // fällt es das letzte Stück wie beim ersten Mal.
        const { path, pose } = step.item;
        const at = new THREE.Vector3(pose.x, pose.y, pose.z);
        await this.placeModelAt(path, at, pose.yaw, true, Boolean(pose.fixed));
        return;
      }
      case 'remove': {
        const found = this.modelAt(step.item.path, step.item.pose);
        if (found) this.dropModel(found);
        return;
      }
      case 'move': {
        const found = this.modelAt(step.path, step.from);
        if (found) this.dropModel(found);
        const to = step.to;
        const at = new THREE.Vector3(to.x, to.y, to.z);
        await this.placeModelAt(step.path, at, to.yaw, true, Boolean(to.fixed));
        return;
      }
    }
  }

  /** Das hingestellte Modell `path`, das `pose` am nächsten steht — oder `null`. */
  private modelAt(path: string, pose: BuildPose): PhysicsBody | null {
    const list = this.placedModels(this.decorModels).filter((one) => this.modelPath(one) === path);
    const spots = list.map((one) => {
      one.object.getWorldPosition(_point);
      return { x: _point.x, y: _point.y, z: _point.z };
    });
    const index = nearestAt(spots, pose);
    return index >= 0 ? list[index]! : null;
  }

  /**
   * **Die Werkzeuge des Baukastens als Seite im Menü** — für die Brille, wo
   * es die Leiste nicht gibt (sie ist DOM), und für jeden, der lieber im Menü
   * sucht. Unter _Bauen & Gestalten_ (`ui/menuGroups.ts`), als Raster: In der
   * Brille ist ein Knopf mit Bild schneller getroffen als eine Zeile.
   *
   * In der Brille gilt die Hand statt des Krans: **Setzen** legt den letzten
   * Pinsel in die Hand, die den Knopf gedrückt hat; **Verschieben** ist
   * Greifen, wie immer; **Löschen** macht aus dem nächsten Griff an ein
   * hingestelltes Stück ein Abreißen (`vrErase`, `attach`); **Drehen** dreht
   * das Stück in der Hand um die Hochachse; **Boden** und **Wand** belegen den
   * Raum, in dem man steht, und die Wand, vor der man steht.
   */
  private buildToolsMenu(): MenuEntry {
    const accent = 0xffa94d;
    const run = (fn: (ctx: WorldContext, hand: Handedness | null) => void) => {
      return (hand: Handedness | null) => {
        const ctx = this.context;
        if (!ctx) return;
        fn(ctx, hand);
        this.refreshMenuLabels();
      };
    };
    const erase: MenuEntry = {
      id: 'build:erase',
      label: 'Löschen',
      icon: 'eraser',
      accent,
      run: run((ctx) => {
        if (ctx.renderer.xr.isPresenting) {
          this.vrErase = !this.vrErase;
          ctx.notify(
            this.vrErase
              ? 'Löschen: ein Stück greifen reißt es ab'
              : 'Löschen aus — Greifen hebt wieder auf',
          );
        } else this.pickTool(ctx, 'erase');
      }),
    };
    const fine: MenuEntry = {
      id: 'build:fine',
      label: 'Möbel in 45°',
      icon: 'gizmo',
      accent,
      run: run((ctx) => this.onBuildEvent(ctx, { kind: 'fine' })),
    };
    const floor: MenuEntry = {
      id: 'build:floor',
      label: 'Boden',
      icon: 'palette',
      accent,
      run: run((ctx) => this.surfaceHere(ctx, 'floor')),
    };
    const floorStyle: MenuEntry = {
      id: 'build:floor-style',
      label: 'Bodenmuster',
      icon: 'palette',
      accent,
      run: run((ctx) => {
        this.floorStyle = nextStyle(FLOOR_STYLES, this.floorStyle);
        ctx.notify(`Bodenmuster: ${this.surfaceStyle('floor').label}`);
      }),
    };
    const wall: MenuEntry = {
      id: 'build:wall',
      label: 'Wand',
      icon: 'brush',
      accent,
      run: run((ctx) => this.surfaceHere(ctx, 'wall')),
    };
    const wallStyle: MenuEntry = {
      id: 'build:wall-style',
      label: 'Wandmuster',
      icon: 'brush',
      accent,
      run: run((ctx) => {
        this.wallStyle = nextStyle(WALL_STYLES, this.wallStyle);
        ctx.notify(`Wandmuster: ${this.surfaceStyle('wall').label}`);
      }),
    };
    const paint = (): void => {
      erase.checked = this.vrErase;
      erase.sub = 'Brille: der nächste Griff reißt ab';
      fine.checked = this.fineTurn;
      fine.sub = this.fineTurn ? 'An: Möbel drehen in Achteln' : 'Aus: Möbel in Vierteln';
      floor.sub = `${this.surfaceStyle('floor').label} · der Raum, in dem du stehst`;
      floorStyle.sub = `Jetzt: ${this.surfaceStyle('floor').label}`;
      wall.sub = `${this.surfaceStyle('wall').label} · die Wand vor dir`;
      wallStyle.sub = `Jetzt: ${this.surfaceStyle('wall').label}`;
    };
    paint();
    this.menuLabels.push(paint);
    const children: MenuEntry[] = [
      {
        id: 'build:place',
        label: 'Setzen',
        sub: 'Den letzten Pinsel in die Hand, sonst das Regal',
        icon: 'cube',
        accent,
        run: run((ctx, hand) => {
          this.vrErase = false;
          if (!ctx.renderer.xr.isPresenting) {
            this.pickTool(ctx, 'place');
            return;
          }
          const brush = this.lastBrush;
          if (brush) this.takeModel(ctx, brush.path, hand, brush.yaw);
          else ctx.menu.openSubmenu('assets');
        }),
      },
      {
        id: 'build:move',
        label: 'Verschieben',
        sub: 'Brille: greifen und woanders loslassen',
        icon: 'hand',
        accent,
        run: run((ctx) => {
          this.vrErase = false;
          if (!ctx.renderer.xr.isPresenting) this.pickTool(ctx, 'move');
          else ctx.notify('Verschieben: ein Stück greifen und loslassen');
        }),
      },
      erase,
      {
        id: 'build:turn-left',
        label: 'Links drehen',
        sub: 'Das Getragene um die Hochachse',
        icon: 'reset',
        accent,
        run: run((ctx) => this.turnHeld(ctx, false)),
      },
      {
        id: 'build:turn-right',
        label: 'Rechts drehen',
        sub: 'Das Getragene um die Hochachse',
        icon: 'reset',
        accent,
        run: run((ctx) => this.turnHeld(ctx, true)),
      },
      fine,
      floor,
      floorStyle,
      wall,
      wallStyle,
      ...this.buildEntries(accent).map((entry) => ({ ...entry, id: `build:${entry.id}` })),
    ];
    if (this.sampleRoomOrigin())
      children.push({
        id: 'build:sample',
        label: 'Beispielraum',
        sub: 'Ein fertig eingerichtetes Zimmer laden, Zurück nimmt es wieder weg',
        icon: 'hammer',
        accent,
        run: run((ctx) => void this.loadSampleRoom(ctx)),
      });
    return {
      id: 'build-tools',
      label: 'Baukasten-Werkzeuge',
      sub: 'Setzen, Löschen, Drehen, Boden, Wand, Rückgängig, auch in der Brille',
      icon: 'hammer',
      accent,
      grid: true,
      children,
    };
  }

  /**
   * **Drehen ohne Kran** — in der Brille dreht nicht der Kran, sondern die
   * Hand; also dreht sich das Stück in ihr, um seine eigene Mitte und die
   * Hochachse. Am Schirm bleibt es beim Kran (`onBuildEvent`).
   */
  private turnHeld(ctx: WorldContext, clockwise: boolean): void {
    if (!ctx.renderer.xr.isPresenting) {
      this.onBuildEvent(ctx, { kind: 'turn', clockwise });
      return;
    }
    for (const grab of this.grabs.values()) {
      if (this.modelPath(grab.entry) === null || grab.near) continue;
      const eighth = this.isWallPiece(grab.entry) || this.fineTurn;
      const angle = (clockwise ? -1 : 1) * (eighth ? Math.PI / 4 : Math.PI / 2);
      const object = grab.entry.object;
      object.updateWorldMatrix(true, false);
      object.getWorldPosition(_point);
      // Neuer Versatz = Versatz · W^-1 · T(p) · R · T(-p) · W: dieselbe Hand,
      // das Stück um seine Mitte gedreht.
      const world = object.matrixWorld;
      const turn = new THREE.Matrix4()
        .makeTranslation(_point.x, _point.y, _point.z)
        .multiply(new THREE.Matrix4().makeRotationY(angle))
        .multiply(new THREE.Matrix4().makeTranslation(-_point.x, -_point.y, -_point.z));
      const inverse = world.clone().invert();
      grab.offset.multiply(inverse.multiply(turn).multiply(world));
      return;
    }
    ctx.notify('Nichts in der Hand zum Drehen');
  }

  /** _Boden_ oder _Wand_ dort, wo man steht — für die Brille und das Menü. */
  private surfaceHere(ctx: WorldContext, tool: 'floor' | 'wall'): void {
    ctx.rig.getHeadPosition(_point);
    if (tool === 'wall' && !ctx.crane) {
      // Ein halber Meter in Blickrichtung: gemeint ist die Wand vor einem.
      ctx.camera.getWorldDirection(_surfaceLook);
      _surfaceLook.y = 0;
      if (_surfaceLook.lengthSq() > 1e-6) _point.addScaledVector(_surfaceLook.normalize(), 0.5);
    }
    void this.applySurface(ctx, tool, _point.x, _point.z);
  }

  /**
   * **Wo der Beispielraum steht** — die Mitte des Zimmers, in das er gehört,
   * oder `null` in einer Welt ohne. Der Bauplatz sagt: sein Startzimmer
   * (`EditorWorld`).
   */
  protected sampleRoomOrigin(): { x: number; z: number } | null {
    return null;
  }

  /**
   * **Den Beispielraum laden** (`sampleRoom.ts`): Boden, Fliesen, eine Wand,
   * dann Stück für Stück die Einrichtung — jedes eingerastet wie aus der
   * Hand (`placeModelAt` mit `snap`), also auf dem Tisch, an der Wand, in
   * 45°, wo es dort steht. Alles zusammen ist **ein** Schritt: _Zurück_ nimmt
   * den ganzen Raum wieder weg.
   */
  private async loadSampleRoom(ctx: WorldContext): Promise<void> {
    const origin = this.sampleRoomOrigin();
    if (!origin) return;
    ctx.notify('Beispielraum wird eingerichtet …');
    const floorY = ctx.rig.getFloorY();
    const fine = this.fineTurn;
    const styles = [this.floorStyle, this.wallStyle] as const;
    const physics = this.physics;
    this.buildHistory.begin();
    try {
      for (const surface of SAMPLE_SURFACES) {
        if (surface.tool === 'floor') this.floorStyle = surface.style;
        else this.wallStyle = surface.style;
        await this.applySurface(ctx, surface.tool, origin.x + surface.x, origin.z + surface.z);
        if (this.physics !== physics) return;
      }
      for (const item of SAMPLE_ITEMS) {
        this.fineTurn = isDiagonal(item.yaw);
        const at = new THREE.Vector3(origin.x + item.x, floorY + 1.2, origin.z + item.z);
        await this.placeModelAt(item.path, at, item.yaw, true, false, true);
        if (this.physics !== physics) return;
      }
    } finally {
      this.fineTurn = fine;
      this.floorStyle = styles[0];
      this.wallStyle = styles[1];
      this.buildHistory.end();
    }
    ctx.notify(`Beispielraum: ${SAMPLE_ITEMS.length} Stücke, Boden und Wände`);
  }

  /** Für die Brille und das Menü: _Rückgängig_ und _Wiederholen_ ohne Leiste. */
  private buildEntries(accent: number): MenuEntry[] {
    return [
      {
        id: 'changes:undo',
        label: 'Rückgängig',
        sub: 'Den letzten Bauschritt zurücknehmen · am Schirm Strg+Z',
        icon: 'reset',
        accent,
        run: () => this.context && this.onBuildEvent(this.context, { kind: 'undo' }),
      },
      {
        id: 'changes:redo',
        label: 'Wiederholen',
        sub: 'Den zurückgenommenen Schritt noch einmal · Strg+Y',
        icon: 'reset',
        accent,
        run: () => this.context && this.onBuildEvent(this.context, { kind: 'redo' }),
      },
    ];
  }

  /**
   * **Flächen setzen** — die Leiste nachführen, gemeldete Drücke in Kacheln
   * übersetzen und die Fläche aufs Gitter legen.
   *
   * Angeboten wird _▦ Fläche_ nur, wenn es etwas zu setzen gibt: im
   * **Baukasten** (`core/gameMode.refillsCatalogue`), am Schirm oder auf dem
   * Telefon, mit einem Modell aus dem Regal in der Bildschirmhand
   * (`areaBrush`). Das Stück in der Hand ist der Pinsel: Es bleibt dort, und
   * jede Kachel der Fläche bekommt eine Kopie in genau seiner Drehung.
   */
  private updateAreaPaint(ctx: WorldContext): void {
    const brush = this.areaBrush(ctx);
    if (!brush) {
      if (this.areaOn) this.endArea();
      if (this.areaPad) {
        this.areaPad.take();
        this.areaPad.show({ kind: 'hidden' });
      }
      return;
    }
    const pad = (this.areaPad ??= new AreaPad());
    const floor = ctx.rig.getFloorY();
    for (const event of pad.take()) this.areaEvent(ctx, event, brush, floor);
    if (!this.areaOn) {
      pad.show({ kind: 'offer' });
      return;
    }

    const { path, entry } = brush;
    entry.object.getWorldQuaternion(_quaternion);
    const yaw = yawOf(_quaternion);
    const select = this.areaSelect;
    const hover = this.areaHover;
    const rect = select.rect() ?? (hover ? areaRect(hover, hover) : null);
    const plan = rect ? areaPlan(rect, entry.halfExtents, yaw) : null;
    const grid = this.placeGrid;
    if (grid) {
      if (!plan) grid.hide();
      else if (plan.edges.length) grid.showEdges(plan.edges, floor, AREA_PREVIEW);
      else grid.show(plan.tiles, floor, AREA_PREVIEW);
    }

    const label = propLabel(modelKind(path));
    if (select.phase === 'confirm' && rect && plan) {
      const pieces = plan.slots.length;
      pad.show({
        kind: 'confirm',
        text:
          pieces > AREA_MAX
            ? `${areaSize(rect)} · ${pieces} Stück sind zu viele — höchstens ${AREA_MAX}`
            : `${areaSize(rect)} = ${areaCount(rect)} Kacheln · ${pieces}× ${label} setzen?`,
      });
      return;
    }
    pad.show({
      kind: 'active',
      text:
        select.phase === 'second'
          ? 'Erste Ecke steht · jetzt die zweite antippen'
          : select.phase === 'drag' && rect
            ? `${areaSize(rect)} Kacheln`
            : `${label}: Fläche ziehen oder zwei Ecken antippen`,
    });
  }

  /**
   * **Womit gerade eine Fläche gesetzt werden kann** — das Modell in der
   * Bildschirmhand und seine Adresse im Regal, oder `null`.
   *
   * In der Brille nicht: Dort gibt es keinen Zeiger über einem Bild, und die
   * Leiste wäre DOM, das niemand sieht.
   */
  private areaBrush(ctx: WorldContext): { entry: PhysicsBody; path: string } | null {
    if (ctx.renderer.xr.isPresenting) return null;
    if (!refillsCatalogue(gameMode())) return null;
    const side = this.screenCarrySide();
    const entry = side ? this.grabs.get(side)?.entry : undefined;
    if (!entry) return null;
    const path = modelPathOf((entry.object.userData as { propKind?: PropKind }).propKind ?? null);
    return path === null ? null : { entry, path };
  }

  /** Ein Knopf oder ein Druck von der Leiste (`AreaPad`). */
  private areaEvent(
    ctx: WorldContext,
    event: AreaEvent,
    brush: { entry: PhysicsBody; path: string },
    floor: number,
  ): void {
    const select = this.areaSelect;
    switch (event.kind) {
      case 'toggle':
        if (this.areaOn) {
          this.endArea();
          return;
        }
        this.areaOn = true;
        select.reset();
        // **Die Maus muss frei sein**, sonst gibt es keinen Zeiger, mit dem man
        // zieht — aus den Augen hält die Steuerung sie sonst gefangen.
        if (document.pointerLockElement) document.exitPointerLock();
        ctx.notify('Fläche: ziehen oder zwei Ecken antippen · Esc beendet');
        return;
      case 'escape':
        // Erst eine halbe Auswahl zurück, dann den Modus.
        if (!select.reset()) this.endArea();
        return;
      case 'cancel':
        select.reset();
        return;
      case 'confirm': {
        const rect = select.rect();
        if (select.phase === 'confirm' && rect) this.commitArea(ctx, brush, rect, floor);
        return;
      }
      case 'down':
      case 'move':
      case 'up': {
        const tile = this.tileUnder(ctx, event.x, event.y, floor);
        if (event.kind === 'down') {
          if (tile) select.down(tile);
          return;
        }
        if (event.kind === 'move') {
          if (!tile) return;
          if (select.phase === 'idle') this.areaHover = tile;
          else select.move(tile);
          return;
        }
        if (!select.up(tile)) return;
        const rect = select.rect();
        if (!rect) return;
        if (needsConfirm(rect)) select.ask();
        else this.commitArea(ctx, brush, rect, floor);
        return;
      }
    }
  }

  /**
   * **Die Fläche setzen** — auf jede Stelle eine Kopie des Pinsels, über
   * denselben Weg wie eine eingefügte Liste (`placeModelAt`), also auch in
   * die Weltänderungen und ins Netz.
   *
   * Hingestellt wird eine Handbreit über dem Boden, auf dem man steht, und
   * den Rest macht die Schwerkraft — wie beim Einrasten einzeln.
   */
  private commitArea(
    ctx: WorldContext,
    brush: { entry: PhysicsBody; path: string },
    rect: AreaRect,
    floor: number,
  ): void {
    const { entry, path } = brush;
    entry.object.getWorldQuaternion(_quaternion);
    const plan = areaPlan(rect, entry.halfExtents, yawOf(_quaternion));
    this.areaSelect.reset();
    if (plan.slots.length > AREA_MAX) {
      ctx.notify(`Zu groß: ${plan.slots.length} Stück · höchstens ${AREA_MAX}`);
      return;
    }
    const y = floor + entry.halfExtents.y + AREA_LIFT;
    const label = propLabel(modelKind(path));
    let placed = 0;
    const done: Promise<void>[] = [];
    // **Stapeln und Wand wie beim Einzelsetzen** (`decorArea`): Eine Fläche
    // Tassen über dem Tisch steht auf dem Tisch, eine Reihe Bilder vor der
    // Wand hängt an ihr. Wände und Bodenstücke bleiben bei ihrem Gitter —
    // eine Wand kommt um die Fläche herum, ein Boden liegt im Boden.
    const plain = plan.edges.length > 0 || this.floorPieces.has(entry);
    // Eine Fläche ist ein Schritt für _Rückgängig_ — was schon geladen ist,
    // entsteht noch in dieser Zeile (`placeModelAt`), also schließt die Gruppe
    // gleich dahinter. Und weil es noch in dieser Zeile entsteht, steht jede
    // Kopie der nächsten schon im Weg.
    this.buildHistory.begin();
    const { refused } = decorArea(
      plan.slots,
      (slot) => (plain ? null : this.decorTarget(ctx, entry, slot.x, slot.z)),
      (slot, spot) => {
        const at = spot
          ? new THREE.Vector3(spot.x, spot.y, spot.z)
          : new THREE.Vector3(slot.x, y, slot.z);
        done.push(
          this.placeModelAt(path, at, spot ? spot.yaw : slot.yaw, true, spot !== null).then(
            (one) => {
              if (one) placed += 1;
            },
          ),
        );
      },
    );
    this.buildHistory.end();
    void Promise.all(done).then(() => {
      const skipped = done.length - placed;
      this.context?.notify(
        `${placed}× ${label} gesetzt` +
          (skipped ? ` · ${skipped} standen schon` : '') +
          (refused ? ` · ${refused} ohne Platz` : ''),
      );
    });
  }

  /** _Fläche_ aus — die Auswahl geht mit, das Gitter gehört wieder dem Stück in der Hand. */
  private endArea(): void {
    this.areaOn = false;
    this.areaSelect.reset();
    this.areaHover = null;
  }

  /**
   * **Die Kachel unter einem Punkt auf dem Schirm** — ein Strahl aus der
   * Kamera, die das Bild zeichnet (`WorldContext.viewCamera`), auf die Ebene
   * des Bodens, auf dem man steht. `null`, wenn er sie nicht trifft: über dem
   * Horizont oder weiter weg, als eine Fläche sinnvoll ist.
   */
  private tileUnder(ctx: WorldContext, x: number, y: number, floor: number): AreaTile | null {
    const box = ctx.renderer.domElement.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    _areaNdc.set(((x - box.left) / box.width) * 2 - 1, -((y - box.top) / box.height) * 2 + 1);
    const camera = ctx.viewCamera ?? ctx.camera;
    camera.updateMatrixWorld();
    this.areaRay.setFromCamera(_areaNdc, camera);
    _areaPlane.set(UP, -floor);
    const hit = this.areaRay.ray.intersectPlane(_areaPlane, _areaHit);
    if (!hit || hit.distanceTo(this.areaRay.ray.origin) > AREA_REACH) return null;
    return tileAt(hit.x, hit.z);
  }

  /**
   * Ob diese Hand gerade **leer** ist: kein Werkzeug darin, kein Gegenstand.
   *
   * Für Welten, die dem Greifknopf eine zweite Bedeutung geben. Die
   * Kletterhalle hängt den Spieler damit an die Wand — und muss deshalb
   * zuerst wissen, ob der Knopf hier überhaupt frei ist. Sonst klettert man
   * an der Kiste, die man gerade trägt.
   */
  protected handFree(hand: Handedness): boolean {
    return !this.held.has(hand) && !this.grabs.has(hand);
  }

  /** The other hand, if it is empty enough to catch something. */
  private freeHand(from: Handedness): Handedness | null {
    const other: Handedness = from === 'left' ? 'right' : 'left';
    if (this.held.has(other) || this.grabs.has(other)) return null;
    return other;
  }

  private handHolding(entry: PhysicsBody): Handedness | null {
    for (const [hand, grab] of this.grabs) {
      if (grab.entry === entry) return hand;
    }
    return null;
  }

  /**
   * Closest prop whose grab box contains the point. The box is the collider
   * plus a fixed margin, so a small domino is as easy to catch as a big cube.
   */
  private findProp(position: THREE.Vector3): PhysicsBody | null {
    let best: PhysicsBody | null = null;
    let bestDepth = Number.POSITIVE_INFINITY;
    for (const entry of this.props) {
      const depth = reachDepth(aimTargetOf(entry), position);
      if (depth !== null && depth < bestDepth) {
        best = entry;
        bestDepth = depth;
      }
    }
    return best;
  }

  /**
   * Glow on everything a hand could grab right now — yours or somebody else's.
   * Locked props glow warmer.
   */
  /**
   * **Das Drahtgitter der Körper** — an, aus, und einmal je Bild nachgezogen.
   *
   * Nach dem Schritt und nicht davor: Gezeigt wird, wo die Körper **jetzt**
   * stehen, und nicht, wo sie vor der Rechnung standen. Gebaut wird erst beim
   * ersten Häkchen; wieder weggeräumt wird nicht, wenn es ausgeht — ein
   * Häkchen, das man zweimal umlegt, soll nicht zweimal einen Puffer anlegen,
   * und ein unsichtbares `LineSegments` kostet nichts (`HitboxView.update`
   * fragt als Erstes danach).
   */
  private updateHitboxes(): void {
    const physics = this.physics;
    if (!physics) return;
    const on = graphics().hitBoxes;
    if (!on && !this.hitboxes) return;
    if (!this.hitboxes) {
      this.hitboxes = new HitboxView();
      this.root.add(this.hitboxes.object);
    }
    this.hitboxes.visible = on;
    this.hitboxes.update(physics);
  }

  private updateHighlights(reachable: Set<PhysicsBody>): void {
    for (const entry of this.remoteBusy) reachable.add(entry);
    for (const entry of this.selected) reachable.add(entry);
    for (const entry of this.highlighted) {
      if (!reachable.has(entry)) setEmissive(entry, null);
    }
    for (const entry of reachable) {
      const color = this.selected.includes(entry)
        ? HIGHLIGHT_PICKED
        : this.locked.has(entry)
          ? HIGHLIGHT_LOCKED
          : HIGHLIGHT_REACH;
      setEmissive(entry, color);
    }
    this.highlighted = reachable;
  }

  private updateHandGestures(ctx: WorldContext, reachable: Set<PhysicsBody>): void {
    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand) continue;
      // A tool in the hand brings its own grip, dialled in under
      // *Einstellungen → Hände*. A hand around a prop gets one too — that is
      // what `grab` is — and an empty hand goes back to the idle pose.
      ctx.hands.setHeldTool(
        hand,
        this.held.get(hand)?.toolId ??
          this.grabs.get(hand)?.poseId ??
          (this.grabs.has(hand) ? GRAB_POSE_ID : null),
      );
      if (this.held.has(hand) || this.grabs.has(hand) || this.links.has(hand)) {
        ctx.hands.setGestureOverride(hand, 'grip');
        continue;
      }
      // Am Griff der anderen Hand öffnet sich die Hand zum Zugreifen, genau wie
      // vor einem Gegenstand: die Geste sagt „ich nehme das gleich".
      if (this.handover.has(hand)) {
        ctx.hands.setGestureOverride(hand, 'ready');
        continue;
      }
      if (reachable.size > 0 && controller.tracked) {
        gripOf(controller).getWorldPosition(_hand);
        ctx.hands.setGestureOverride(hand, this.findProp(_hand) ? 'ready' : null);
        continue;
      }
      ctx.hands.setGestureOverride(hand, null);
    }

    // **Und die Hand vor dem Auge** (`screenHand.ts`): Sie trägt die Haltung
    // ihres Werkzeugs wie jede andere — dieselbe eingemessene Faust um
    // dieselbe Pistole. Was sie _trägt_, hängt vor ihr in der Luft und nicht
    // in ihr, also bleibt sie dabei offen. Nach den echten Händen, damit eine
    // abgemeldete, die noch „rechts" heißt, ihr nichts überschreibt.
    const screen = this.screenHand;
    const side = screen?.state.handedness;
    if (screen && side && !ctx.renderer.xr.isPresenting) {
      const tool = this.held.get(side) ?? null;
      ctx.hands.setHeldTool(side, tool?.toolId ?? null);
      ctx.hands.setGestureOverride(side, tool ? 'grip' : null);
    }
  }

  /**
   * Der Griff in den Beutel, von der Menüseite aus: das Panel geht zu, und
   * sobald das Ding wieder losgelassen ist, geht es an derselben Stelle wieder
   * auf. Wer aus dem Beutel etwas holt, holt meistens noch etwas.
   */
  private spawnProp(ctx: WorldContext, hand: Handedness | null, kind: BagKind): void {
    ctx.menu.toggle(false);
    if (this.conjureProp(ctx, kind, hand)) this.reopenMenu = true;
  }

  /**
   * Conjures a new prop straight into the hand that picked it from the bag.
   *
   * Zwei Bedienungen enden hier: die Rasterseite im Handgelenk-Menü und der
   * Beutel als Werkzeug in der Hand (`tools/MagicBagTool.ts`). Was der eine Weg
   * kann, kann damit auch der andere — inklusive der Mitspieler, die das Ding
   * entstehen sehen.
   *
   * @returns ob eine Hand es aufgefangen hat.
   */
  private conjureProp(ctx: WorldContext, kind: BagKind, hand: Handedness | null): boolean {
    if (!this.physics) return false;

    const controller = hand ? ctx.input.get(hand) : null;
    const anchor = controller?.tracked ? gripOf(controller) : null;

    if (anchor) {
      anchor.getWorldPosition(_point);
    } else {
      ctx.rig.getHeadPosition(_point);
      ctx.rig.getHeadForward(_direction);
      _point.addScaledVector(_direction, 0.7);
    }

    const id = this.sync?.nextId() ?? `local-${this.bodies.size}`;
    const entry = this.createProp(id, kind, _point, null);
    this.sync?.spawned(id, kind, poseOf(entry));

    let caught = Boolean(hand && anchor);
    if (hand && anchor) {
      const tool = this.held.get(hand);
      if (tool) this.stowTool(tool);
      const existing = this.grabs.get(hand);
      if (existing) this.letGo(ctx, hand, existing);
      this.attach(hand, anchor, entry);
    } else {
      // **Und am Schirm fängt die Bildschirmhand es auf** (`screenCatch`).
      // Hier fiel es bis vor Kurzem zu Boden, und der Beutel war der Grund,
      // aus dem auch das Regal es tat.
      caught = this.screenCatch(ctx, entry);
    }
    ctx.notify(caught ? this.carryNote(PROP_LABELS[kind]) : PROP_LABELS[kind]);
    return caught;
  }

  /**
   * **Das KayKit-Regal** — der gekaufte Ordnerbaum als Menüseite.
   *
   * Der Beutel daneben ist eine Kiste mit Spielzeug: achtzehn Sorten, von
   * Hand gebaut, jede mit ihrem Namen und ihrem Symbol. Das Regal ist eine
   * **Sammlung**: rund viertausendfünfhundert fremde Dateien in zwei Dutzend
   * Paketen, und niemand schreibt dafür achtzehnhundert Menüzeilen. Also
   * zeigt es, was auf der Platte liegt, Ordner für Ordner — wie ein
   * Dateibrowser, nur dass in jeder Kachel das Ding selbst steht und sich
   * dreht (`core/kaykitIndex.ts` baut den Baum, `ui/WristMenu.ts` die
   * Vorschau).
   *
   * **Geladen wird erst beim Aufschlagen** (`onOpen`): Der Index ist ein paar
   * hundert Kilobyte groß, und wer heute nur Portale schießt, soll sie nicht
   * herunterladen. Bis er da ist, steht dort eine Zeile „Lädt …" — und wenn
   * es ihn nicht gibt, steht dort, dass es ihn nicht gibt. Werfen darf hier
   * nichts: Ein Checkout ohne die gekauften Pakete ist ein normaler Zustand.
   */
  private assetMenu(ctx: () => WorldContext): MenuEntry {
    return {
      id: 'assets',
      label: 'KayKit-Regal',
      sub: 'Modelle aus der Sammlung',
      icon: 'folder',
      accent: KAYKIT_ACCENT,
      grid: true,
      cols: SHELF_COLS,
      // **Der ganze Schirm.** Die Kachel eines Katalogs zeigt das Ding selbst,
      // und dafür ist Platz das Einzige, was hilft (`ui/PageMenu.ts`, `full`).
      full: true,
      // **Der Anfang des Katalogs**: Von hier aus fragt das Regal, auf welchem
      // Weg man hineingeht, und ab hier steht im Kopf der Knopf, der wieder
      // hierher zurückführt (`ui/menu.MenuEntry.home`).
      home: true,
      // Auf der Gabelung selbst wird nichts genommen — genommen wird eine
      // Ebene tiefer, und dort sagt es jede Seite selbst.
      take: false,
      onOpen: () => this.openShelf(),
      // **Das Suchfeld gibt es nur auf der Seite** (`MenuEntry.find`): In der
      // Brille will niemand tippen, und dort bleiben Schubladen, Ordner und
      // Fächer der Weg. Gesucht wird über die ganze Sammlung und nicht nur
      // über den Ordner, in dem man steht — wer `lantern` eintippt, will
      // wissen, ob es überhaupt eine gibt. Und wer `laterne` eintippt,
      // ebenso: Die Sammlung heißt englisch, gesucht werden darf auf
      // Deutsch (`core/kaykitTerms.ts`).
      find: (query) =>
        kaykitSearchEntries(this.shelfFiles, query, (path, hand) =>
          this.takeModel(ctx(), path, hand),
        ),
      children: this.shelfEntries(ctx),
    };
  }

  /** Die oberste Seite des Regals — oder das, was statt ihrer dasteht. */
  private shelfEntries(ctx: () => WorldContext): MenuEntry[] {
    if (this.shelf === undefined) {
      return [
        {
          id: 'assets:loading',
          label: 'Lädt …',
          sub: 'Das Verzeichnis der Sammlung',
          icon: 'folder',
          accent: 0x6f7d99,
        },
      ];
    }
    if (this.shelf === null) {
      return [
        {
          id: 'assets:missing',
          label: 'Kein Regal',
          sub: 'models/kaykit/index.json fehlt',
          icon: 'folder',
          accent: 0x6f7d99,
        },
      ];
    }
    this.shelfMenu ??= kaykitMenu(this.shelf, (path, hand) => this.takeModel(ctx(), path, hand));
    const entries = this.shelfMenu;
    if (entries.length > 0) return entries;
    return [
      {
        id: 'assets:empty',
        label: 'Leer',
        sub: 'Kein Paket unter models/kaykit/',
        icon: 'folder',
        accent: 0x6f7d99,
      },
    ];
  }

  /**
   * Den Index holen — einmal, und erst dann, wenn jemand das Regal aufmacht.
   *
   * Kommt mehrfach: zwei Handgelenke, die Seite im Browser, jedes erneute
   * Hineingehen. Gefragt wird trotzdem nur einmal.
   */
  private openShelf(): void {
    if (this.shelfAsked) return;
    this.shelfAsked = true;
    void this.fetchShelf();
  }

  private async fetchShelf(): Promise<void> {
    const index = await loadKaykitIndex();
    // `null` ist eine Antwort und keine Ausnahme: Dann steht im Menü, dass es
    // kein Regal gibt.
    this.shelf = index;
    this.shelfFiles = index ? kaykitFiles(index) : [];
    this.shelfMenu = null;
    // Den Baum neu bauen lassen — der Weg durchs Menü bleibt dabei stehen,
    // weil er an Ids hängt und nicht an Einträgen (`ui/menuNav.ts`).
    this.context?.refreshWorldMenu();
  }

  /**
   * **Ein Modell aus dem Regal in die Hand** — derselbe Ablauf wie beim
   * Beutel (`spawnProp`), nur mit einem Ladevorgang davor.
   *
   * Das Panel geht **sofort** zu und nicht erst, wenn die Datei da ist: Ein
   * Menü, das nach dem Zugreifen noch eine halbe Sekunde stehen bleibt, fühlt
   * sich an wie ein Fehlgriff. Was danach kommt, kann dauern, also sagt es
   * das auch.
   *
   * **Und es geht beim Hinstellen nicht wieder auf** — anders als der Beutel
   * (`reopenMenu`): Wer einrichtet, will sehen, was er hingestellt hat.
   */
  private takeModel(
    ctx: WorldContext,
    path: string,
    hand: Handedness | null,
    yaw: number | null = null,
  ): void {
    ctx.menu.toggle(false);
    // **Erst fragen, ob daraus hier ein Möbel wird** — und nur sonst ein Fass
    // (`takeFurniture`).
    if (this.takeFurniture(ctx, path)) return;
    void this.conjureModel(ctx, path, hand, yaw);
  }

  /**
   * **Ob aus dieser Adresse hier ein funktionierendes Möbel wird** statt eines
   * Gegenstands mit Hülle und Masse.
   *
   * Die Antwort dieser Welt ist `nein`, und das ist die richtige: Ein Portal-
   * Labor hat keine Küche, in der eine Vorratskiste jemandem etwas ausgeben
   * könnte. Die Testwelt antwortet anders, solange die Figur in ihrer Küche
   * steht (`TestWorld`, `KitchenZone.takeShelfPiece`) — dort war es der
   * gemeldete Wunsch: „die platzierten Elemente sollen dann auch
   * funktionsfähig sein."
   *
   * Wer `true` sagt, hat das Möbel **schon** hergestellt; der Aufrufer tut
   * dann nichts mehr.
   */
  protected takeFurniture(_ctx: WorldContext, _path: string): boolean {
    return false;
  }

  /**
   * Holt das Modell und stellt es her — in die Hand, die es genommen hat,
   * oder vor den Kopf, wenn keine da ist.
   */
  private async conjureModel(
    ctx: WorldContext,
    path: string,
    hand: Handedness | null,
    yaw: number | null = null,
  ): Promise<void> {
    const physics = this.physics;
    let model = kaykitModelNow(path);
    if (!model) {
      // Nur, wenn wirklich gewartet wird: Was schon im Speicher liegt — und
      // das ist alles, was man gerade in der Kachel gesehen hat — kommt ohne
      // eine Meldung.
      ctx.notify('Lädt …');
      model = await kaykitModel(path);
    }
    // Nach dem Warten kann alles anders sein: eine andere Welt, keine Physik
    // mehr. Was dann noch herbeigerufen würde, gehörte niemandem.
    //
    // **Gefragt wird an der Physik und nicht am Kontext.** Hier stand
    // `this.context !== ctx` — aber der Kontext ist jedes Bild ein neues
    // Objekt (`App.context`, ein Getter), und nach dem ersten Bild Warten
    // war die Antwort damit immer „andere Welt": Ein Modell, das erst geladen
    // werden musste, meldete „Lädt …" und kam nie an. Die Physik dagegen
    // lebt genau so lange wie die Welt (`dispose`).
    const now = this.context;
    if (!now || !physics || this.physics !== physics) return;
    if (!model) {
      now.notify(`${humanLabel(path.slice(path.lastIndexOf('/') + 1))} nicht geladen`);
      return;
    }
    this.spawnModel(now, model, path, hand, yaw);
  }

  /**
   * Stellt ein geladenes Modell her — Wort für Wort dasselbe wie
   * `conjureProp`, nur dass die Sorte den Pfad trägt.
   */
  private spawnModel(
    ctx: WorldContext,
    model: THREE.Object3D,
    path: string,
    hand: Handedness | null,
    yaw: number | null = null,
  ): void {
    const controller = hand ? ctx.input.get(hand) : null;
    const anchor = controller?.tracked ? gripOf(controller) : null;

    if (anchor) {
      anchor.getWorldPosition(_point);
    } else {
      // **Ohne Brille entsteht es vor dem Kopf** — und wird von dort in die
      // Bildschirmhand gerückt (`screenCatch`). Der Punkt hier ist nur der
      // Platz für einen Wimpernschlag; gibt es keine Bildschirmhand, ist er
      // der endgültige, und dann fällt es wie eh und je.
      ctx.rig.getHeadPosition(_point);
      ctx.rig.getHeadForward(_direction);
      _point.addScaledVector(_direction, 0.7);
    }

    const kind = modelKind(path);
    const id = this.sync?.nextId() ?? `local-${this.bodies.size}`;
    // Gedreht wie das zuletzt hingestellte Stück (`placedFromShelf`) — gegriffen wird
    // danach mit genau dieser Lage, und der Kran hält sie beim Tragen fest.
    const spin = yaw === null ? null : new THREE.Quaternion().setFromAxisAngle(UP, yaw);
    const entry = this.createModelProp(id, kind, model, _point, spin);
    this.shelfFresh.add(entry);
    // Über das Netz geht die Sorte — und die *ist* hier der Pfad: Der andere
    // lädt dieselbe Datei und bekommt dasselbe Fass (`PortalSync`, `spawn`).
    this.sync?.spawned(id, kind, poseOf(entry));

    let caught = Boolean(hand && anchor);
    if (hand && anchor) {
      const tool = this.held.get(hand);
      if (tool) this.stowTool(tool);
      const existing = this.grabs.get(hand);
      if (existing) this.letGo(ctx, hand, existing);
      this.attach(hand, anchor, entry);
    } else {
      // **Am Schirm und auf dem Telefon in die Bildschirmhand** — das ist der
      // ganze gemeldete Fehler: „Wenn ich ein Asset gewählt habe, hat der
      // Spieler es in der Hand."
      caught = this.screenCatch(ctx, entry);
    }
    ctx.notify(caught ? this.carryNote(propLabel(kind)) : propLabel(kind));
  }

  /**
   * Ein Modell, das bei jemand anderem entstanden ist.
   *
   * Es kommt an dieselbe Stelle und mit derselben Lage; dass die Datei dafür
   * erst geladen werden muss, sieht man höchstens daran, dass das Fass einen
   * Wimpernschlag später umfällt als drüben.
   */
  private async spawnRemoteModel(id: string, path: string, pose: Pose7): Promise<void> {
    const model = await kaykitModel(path);
    if (!model || !this.physics) return;
    // In der Zwischenzeit kann es schon da sein — oder wieder weg.
    if (this.bodies.has(id)) return;
    this.createModelProp(
      id,
      modelKind(path),
      model,
      new THREE.Vector3(pose[0], pose[1], pose[2]),
      new THREE.Quaternion(pose[3], pose[4], pose[5], pose[6]),
    );
  }

  /**
   * **Was in einer Menüzeile als kleines Modell steht.**
   *
   * Eine Fabrik für beide Regale: Werkzeug-Ids beantwortet das Werkzeugregal
   * wie eh und je, Ids aus dem Asset-Regal der Lader. `null` heißt dabei
   * zweierlei, und das Menü behandelt beides gleich richtig: „gibt es nicht"
   * (eine fremde Id) und **„noch nicht"** (die Datei ist unterwegs) — es
   * fragt in einer halben Sekunde wieder (`ui/WristMenu.ts`, `PREVIEW_RETRY`).
   */
  private menuModel(id: string): THREE.Object3D | null {
    const path = kaykitPathOf(id);
    if (path !== null) return kaykitModelNow(path);
    return this.tool(id);
  }

  /**
   * **Und welche Bewegungen es zu einer Menüzeile gibt** — für die
   * Detailseite des Regals (`ui/PageDetail.ts`).
   *
   * Nur das Regal antwortet darauf: Ein Werkzeug ist von Hand gebaut und
   * bewegt sich, wenn es sich bewegt, aus dem Code heraus. `height` ist die
   * Höhe in den Maßen der Quelle und entscheidet über das Skelett
   * (`core/kaykitClips.ts`); `null` heißt „keine Figur" und holt gar keine
   * Bibliothek.
   */
  private menuClips(id: string, height: number | null): Promise<THREE.AnimationClip[]> {
    const path = kaykitPathOf(id);
    if (path === null) return Promise.resolve([]);
    return kaykitClips(path, height);
  }

  /**
   * **Der Korken knallt.**
   *
   * Der Korken löst sich vom Hals und wird ein eigener Körper: er fliegt die
   * Halsachse hinaus, mit der Flasche mit, und landet irgendwo als das kleine
   * Ding, das er ist — man kann ihn aufheben. Dazu ein Schwall Schaum aus
   * der Mündung (`Foam`) und der Knall. Die Flasche bleibt offen; eine neue
   * kommt aus dem Beutel.
   *
   * Über das Netz geht nur *dass* es geknallt hat (`pop`): der Korken ist ein
   * Effekt und kein geteilter Gegenstand, jede Seite lässt ihren eigenen
   * fliegen. Wer später dazukommt, sieht die Flasche mit Korken — das ist der
   * Preis dafür, dass der Zustand nirgends gespeichert wird.
   *
   * @param carry die Geschwindigkeit der Hand, die sie schüttelt — der Korken
   *              nimmt sie mit; `null` bei einem fremden Knall.
   */
  private popCork(entry: PhysicsBody, carry: THREE.Vector3 | null, broadcast: boolean): void {
    const physics = this.physics;
    const cork = entry.object.getObjectByName(CORK_NAME) as THREE.Mesh | undefined;
    if (!physics || !cork) return;
    entry.object.updateWorldMatrix(true, true);
    const at = cork.getWorldPosition(new THREE.Vector3());
    const turn = cork.getWorldQuaternion(new THREE.Quaternion());
    const out = new THREE.Vector3(0, 1, 0).applyQuaternion(turn);
    cork.removeFromParent();
    cork.position.copy(at);
    cork.quaternion.copy(turn);
    this.root.add(cork);
    cork.updateWorldMatrix(true, false);

    const flying = physics.addDynamic(cork, {
      shape: { kind: 'cylinder' },
      halfExtents: new THREE.Vector3(CORK_RADIUS, CORK_LENGTH / 2, CORK_RADIUS),
      mass: 0.04,
      friction: 0.6,
      restitution: 0.3,
      ccd: true,
    });
    const velocity = out.clone().multiplyScalar(CORK_SPEED);
    if (carry) velocity.add(carry);
    flying.body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
    flying.body.setAngvel({ x: 6, y: 1, z: 4 }, true);
    flying.previousPosition.copy(at);
    // Wie der Nachbau ohne Bausatz: hier in dieser Sitzung, ohne Netz — und
    // beim Aufräumen des Beutels mit weg.
    this.props.push(flying);
    this.spawned.add(flying);

    const foam = new Foam(at, out);
    this.root.add(foam);
    this.foams.push(foam);
    playPop();
    this.context?.notify('Plopp!');
    if (broadcast) {
      const id = this.idOf(entry);
      if (id) this.sync?.popped(id);
    }
  }

  /** Der Schaum fällt, und wenn er verflogen ist, ist er weg. */
  private updateFoam(dt: number): void {
    for (let i = this.foams.length - 1; i >= 0; i--) {
      const foam = this.foams[i]!;
      if (foam.update(dt)) continue;
      foam.dispose();
      this.foams.splice(i, 1);
    }
  }

  /** Builds a bag prop — locally conjured or mirrored from another player. */
  private createProp(
    id: string,
    kind: BagKind,
    position: THREE.Vector3,
    quaternion: THREE.Quaternion | null,
  ): PhysicsBody {
    const blueprint = createPropShape(kind);
    return this.placeProp(id, kind, blueprint.mesh, blueprint, position, quaternion);
  }

  /**
   * **Dasselbe für ein geladenes Modell aus dem Regal.**
   *
   * Der Unterschied zum Beutel ist genau einer: Die Form kommt nicht aus einem
   * Bauplan, sondern aus der Bounding-Box dessen, was geladen wurde
   * (`props.modelPropShape`). Alles danach — Körper, Buchhaltung, Netz — ist
   * dieselbe Zeile, und das ist der Punkt: Ein Fass aus dem Regal ist für die
   * Welt ein Gegenstand wie jeder andere. Man kann es werfen, duplizieren,
   * anmalen, festkleben und in der Sitzung teilen, ohne dass irgendwo ein
   * zweiter Fall dafür steht.
   */
  private createModelProp(
    id: string,
    kind: ModelKind,
    model: THREE.Object3D,
    position: THREE.Vector3,
    quaternion: THREE.Quaternion | null,
  ): PhysicsBody {
    const path = modelPathOf(kind);
    const blueprint = modelPropShape(model, propLabel(kind), path);
    const entry = this.placeProp(id, kind, blueprint.object, blueprint, position, quaternion);
    if (path !== null) {
      const size = blueprint.halfExtents.clone().multiplyScalar(2);
      const stance = modelStance(path, size);
      this.stances.set(entry, stance);
      if (isFloorPiece(path, size)) this.floorPieces.set(entry, blueprint.tread);
      this.applyStance(entry);
    }
    return entry;
  }

  /**
   * **Ein Möbel oder ein Stück Bau steht fest** (`modelStance.ts`): Drehung
   * und waagerechte Verschiebung sind gesperrt, die Schwerkraft nicht. Es sinkt
   * senkrecht auf das, was darunter liegt, und kippt und rutscht danach nicht
   * mehr — keine Kugel, kein Stoß, kein Spieler schiebt es weg.
   *
   * Getragen wird es trotzdem: Ein kinematischer Körper fragt nicht nach
   * gesperrten Achsen (siehe `fixFloating`), die Hand bewegt es also wie
   * jedes andere Ding. Die Sperre gilt ab dem Moment, in dem es wieder
   * dynamisch wird — beim Hinstellen.
   */
  private applyStance(entry: PhysicsBody): void {
    const stance = this.stances.get(entry);
    if (!stance || !standsFast(stance)) return;
    entry.body.setAngvel(_zeroVelocity, true);
    entry.body.lockRotations(true, true);
    entry.body.setEnabledTranslations(false, true, false, true);
  }

  /**
   * **Ob der Spielmodus dieses Ding gerade festhält** — ein Stück Bau außerhalb
   * des _Baukastens_, ein Möbel beim _Spielen_ (`core/gameMode`).
   *
   * Frisch aus dem Regal ist davon ausgenommen (`shelfFresh`): Was man gerade
   * genommen hat, liegt schon in der Hand, und wer im _Einrichten_ eine Wand
   * aus dem Regal nimmt, soll sie auch hinstellen können.
   */
  private heldByMode(entry: PhysicsBody): boolean {
    const stance = this.stances.get(entry);
    if (!stance || stance === 'loose' || this.shelfFresh.has(entry)) return false;
    const mode = gameMode();
    return stance === 'structure' ? !movesStructure(mode) : !movesFurniture(mode);
  }

  /** Was gerade nicht gegriffen wird: im Schwebekasten festgestellt, oder vom Modus gehalten. */
  private holdsStill(entry: PhysicsBody): boolean {
    return this.fixedInZone(entry) || this.heldByMode(entry);
  }

  /** Der gemeinsame Teil: hinstellen, Körper geben, in die Bücher schreiben. */
  private placeProp(
    id: string,
    kind: PropKind,
    object: THREE.Object3D,
    blueprint: PropPhysics,
    position: THREE.Vector3,
    quaternion: THREE.Quaternion | null,
  ): PhysicsBody {
    // Woraus es gebaut wurde, bleibt am Objekt: der Duplizierer baut daraus
    // dasselbe noch einmal, und der Inspektor liest den Namen davon ab.
    object.userData.propKind = kind;
    object.position.copy(position);
    if (quaternion) object.quaternion.copy(quaternion);
    this.root.add(object);
    object.updateWorldMatrix(true, false);

    const entry = this.propBody(object, blueprint);
    entry.previousPosition.copy(position);
    this.props.push(entry);
    this.spawned.add(entry);
    this.bodies.set(id, entry);
    this.ids.set(entry, id);
    this.kinds.set(id, kind);
    return entry;
  }

  /** Removes everything that came out of the bag again. */
  private clearSpawned(): void {
    const physics = this.physics;
    if (!physics) return;
    for (const entry of [...this.spawned]) {
      const id = this.idOf(entry);
      if (id) {
        this.bodies.delete(id);
        this.kinds.delete(id);
        this.ids.delete(entry);
      }
      for (const [hand, grab] of [...this.grabs]) {
        if (grab.entry === entry) this.grabs.delete(hand);
      }
      this.highlighted.delete(entry);
      this.locked.delete(entry);
      this.forgetGhost(entry);
      this.flights.delete(entry);
      this.spawns.delete(entry);
      this.ghosts?.untrack(propKey(entry));
      for (const [hand, link] of [...this.links]) {
        if (link.entry === entry) this.dropLink(hand);
      }
      const index = this.props.indexOf(entry);
      if (index >= 0) this.props.splice(index, 1);
      if (this.floorPieces.has(entry)) this.coverFloor(entry, null);
      physics.remove(entry);
      disposeTree(entry.object);
    }
    this.spawned.clear();
  }

  // --- hands that can touch things ----------------------------------------

  private updateHandProbes(ctx: WorldContext): void {
    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand) continue;

      const gesture = ctx.hands.gestureOf(controller);
      // A tool like the welder lets its hand reach into a stack without
      // knocking it over: that hand simply stops being a physical thing.
      const phasing = this.held.get(hand)?.phaseHands ?? false;
      const active =
        !phasing &&
        controller.tracked &&
        (controller.isHand || gesture === 'point' || gesture === 'open');
      const tip = active ? controller.getFingertip(_point) : null;
      this.placeProbe(hand, tip);

      // The half of the hand that came out of the other portal touches things
      // over there — otherwise reaching through would feel like a hologram.
      const through = tip ? this.ghosts?.traversal(`hand:${hand}`, _matrix) : null;
      this.placeProbe(`${hand}:far`, through ? _far.copy(tip!).applyMatrix4(through) : null);
    }
  }

  /** A tiny kinematic box that pushes props around. Made on first use. */
  private placeProbe(key: string, position: THREE.Vector3 | null): void {
    const physics = this.physics!;
    let probe = this.probes.get(key);
    if (!probe) {
      const object = new THREE.Object3D();
      object.position.set(0, -60, 0);
      this.root.add(object);
      const entry = physics.addKinematic(object, {
        halfExtents: new THREE.Vector3(0.016, 0.016, 0.016),
        membership: GROUP_HAND,
        // Kisten **und** wer herumläuft: Ein Zombie, den man mit der Hand
        // wegschieben konnte, solange er ein Requisit war, soll das auch
        // bleiben, seit er eine eigene Gruppe hat (`GROUP_NPC`).
        filter: GROUP_PROP | GROUP_NPC,
      });
      probe = { object, entry };
      this.probes.set(key, probe);
    }
    const target = position ?? _probe.set(0, -60, 0);
    probe.entry.body.setNextKinematicTranslation({ x: target.x, y: target.y, z: target.z });
    // Die Physik muss wissen, wo diese Faust ist: was man aus ihr fallen lässt,
    // steckt noch in ihr und darf von ihr nicht weggestoßen werden
    // (`playerClearance.ts`). Eine Sonde, die gerade nicht mitspielt, ist auch
    // keine Hand — sie liegt 60 m unter der Welt und stößt dort niemanden an.
    physics.setPlayerHand(key, position, probe.entry.halfExtents.length());
  }

  // --- reaching through a portal -------------------------------------------

  /**
   * Keeps the list of things that may stick through a portal up to date: both
   * hands, whatever gun they hold, and every prop.
   */
  private updateGhosts(ctx: WorldContext): void {
    const ghosts = this.ghosts;
    if (!ghosts) return;

    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand) continue;
      // A hand reaches about 20 cm past its own origin, and a whole arm can
      // push it a good deal further through the opening.
      const wrist = controller.isHand ? (controller.hand.joints['wrist'] ?? null) : null;
      ghosts.track(`hand:${hand}`, ctx.hands.handObject(controller), 0.22, 0.8, wrist);
      ghosts.track(`tool:${hand}`, this.held.get(hand) ?? null, 0.3, 0.8);
    }

    // The others reach through portals too, and their hand should come out on
    // the far side just like yours does. Their gun hangs on the same node.
    for (const id of this.remotePlayers.keys()) {
      for (const side of ['left', 'right'] as const) {
        ghosts.track(peerHandKey(id, side), ctx.avatars.handAnchor(id, side), 0.26, 0.8);
      }
    }

    for (const entry of this.props) {
      ghosts.track(propKey(entry), entry.object, entry.halfExtents.length());
    }

    // **Auch wer herumläuft, wird geschnitten und gespiegelt.** Ohne das
    // verschwindet ein Zombie, der zur Hälfte im Portal steht, in der Wand und
    // taucht drüben erst wieder auf, wenn er ganz durch ist — genau der
    // Sprung, den ein Portal nicht machen soll. Der Bestand wechselt (einer
    // fällt, einer kommt aus dem Käfig), deshalb wird die Liste der
    // Angemeldeten jedes Bild abgeglichen: Wer nicht mehr dabei ist, wird
    // abgemeldet, sonst bliebe sein Abbild vor dem Ausgang stehen.
    const walkers = new Set<string>();
    for (const npc of this.director?.crowd ?? []) {
      if (!npc.solid) continue;
      const key = npcKey(npc);
      walkers.add(key);
      ghosts.track(key, npc.holder, npc.entry.halfExtents.length());
    }
    for (const key of this.npcGhosts) {
      if (!walkers.has(key)) ghosts.untrack(key);
    }
    this.npcGhosts = walkers;

    ghosts.update([this.portalBlue, this.portalRed]);
  }

  // --- benutzen -----------------------------------------------------------

  /**
   * **Etwas als benutzbar anmelden** (`core/usable.ts`).
   *
   * Der Weg für jede Welt und jeden Einbau: ein Objekt, eine Wirkung, fertig.
   * Das Objekt bleibt, wo es hängt — angemeldet wird es, nicht umgehängt; ein
   * Knopf, der zum Drücken erst die Säule verlassen müsste, wäre keiner.
   *
   * @param radius Halbmesser fürs Zielen; ohne Angabe die Ausdehnung des
   *               Objekts, mindestens aber `USE_RADIUS` — auf vier Zentimeter
   *               Kippschalter zielt von oben niemand.
   * @param shot   Halbmesser fürs **Treffen** (Portal-Regel), 0 = nicht
   *               schießbar. Ohne Angabe die Ausdehnung des Objekts, denn eine
   *               Kugel soll genau dorthin gehen, wo man hinsieht.
   * @param half   wie weit der Trefferzylinder über und unter der Mitte reicht
   */
  protected addUsable(
    object: THREE.Object3D,
    usable: Usable,
    options: { radius?: number; shot?: number; half?: number } = {},
  ): void {
    this.removeUsable(object);
    const size = objectRadius(object);
    this.usables.push({
      object,
      usable,
      radius: Math.max(options.radius ?? size, USE_RADIUS),
      shot: options.shot ?? size + SHOT_MARGIN,
      half: options.half ?? Math.max(size, 0.3),
    });
    markUsable(object, usable);
  }

  /** Wieder abmelden — beim Abräumen, und wenn ein Einbau verschwindet. */
  protected removeUsable(object: THREE.Object3D): void {
    const index = this.usables.findIndex((entry) => entry.object === object);
    if (index < 0) return;
    this.usables.splice(index, 1);
    markUsable(object, null);
  }

  /**
   * **Was vor der Figur steht, benutzen** — der Haken, den `A` (am Schirm
   * `E`) auslöst.
   *
   * Der Strahl kommt aus der Brust und zeigt dorthin, wohin die Figur schaut;
   * was er trifft, sticht das, worauf man steht (`core/usable.pickUsable`,
   * Plan E5). Wer eine eigene Regel braucht, überschreibt das hier — die
   * Auswahl selbst bleibt dieselbe für alle.
   *
   * @returns ob wirklich etwas passiert ist
   */
  protected useForward(ctx: WorldContext): boolean {
    this.aimUse(ctx);
    const pick = this.pickBody(ctx);
    if (!pick) return false;
    return pick.candidate.usable.use({ kind: 'player', at: _useAt, forward: _useForward });
  }

  /**
   * **Wie weit `A` reicht**, in Metern — und warum das eine Methode ist.
   *
   * Für alles, was auf zwei Beinen zu einem Knopf hingeht, ist die Antwort
   * `USE_REACH`: eine Armlänge und eine halbe, und keine Welt hat je etwas
   * anderes gebraucht. Es gibt aber einen Zustand, in dem niemand hingeht —
   * der Konstrukt-Raum sperrt das Rig, damit die Figur draußen stehen bleibt,
   * wo die anderen Spieler sie sehen (`shared/construct.ts`). Was dort im Ring
   * steht, ist dann weiter weg als jede Armlänge, und ohne diesen Haken sähe
   * man eine Auswahl, die sich nicht bedienen lässt.
   *
   * Sie steht hier und nicht als zweite Auswahl daneben, weil es genau **eine**
   * Auswahl geben soll: Der Saum, die Auflösung der Eingabe und der Druck
   * selbst fragen dieselbe Reichweite, sonst leuchtet etwas, das `A` nicht
   * erwischt.
   */
  protected useReach(): number {
    return USE_REACH;
  }

  /**
   * **Und wie weit ein Zeigen in der Brille reicht** (`core/handUse.ts`) — die
   * Schwester von `useReach`, und aus demselben Grund überschreibbar.
   *
   * Die beiden gehören zusammen und müssen es auch: Am Schirm entscheidet der
   * Strahl aus der Brust, in der Brille der Strahl aus der Hand, und ein Regal,
   * das man von oben bedienen kann und in der Brille nicht, ist in einem
   * Projekt, das mit der Brille anfängt, die falsche Hälfte.
   *
   * **Angefasst** wird unabhängig davon weiter, wo die Hand wirklich hinlangt:
   * Das ist keine Reichweite, sondern eine Berührung.
   */
  protected handUseRange(): number {
    return HAND_USE_RANGE;
  }

  /**
   * **Wo die Figur steht und wohin sie schaut** — die zwei Zahlen hinter E5,
   * und die zweite hängt an der Ansicht (`usable.aimForward`).
   *
   * Von oben dreht die Steuerung die ganze Figur zum Ziel, also zeigt das Rig.
   * Aus den Augen und in der Brille steht sie still und sieht sich um, also
   * zeigt der Kopf — wer dort einen Knopf ansieht, meint ihn und nicht das,
   * wohin seine Füße stehen.
   */
  private aimUse(ctx: WorldContext): void {
    ctx.rig.updateMatrixWorld(true);
    // **Der Kran zeigt nach unten** (`core/crane.ts`): gemeint ist, worüber
    // er schwebt. Ohne Richtung wählt `pickUsable` nur, was die Stelle
    // überdeckt — und die ist die unter dem Kopf, dort hängt der Greifer.
    if (ctx.crane) {
      ctx.rig.getHeadPosition(_useAt);
      _useAt.y = ctx.rig.getFloorY() + USE_CHEST;
      _useForward.set(0, 0, 0);
      return;
    }
    _useAt.set(ctx.rig.position.x, ctx.rig.getFloorY() + USE_CHEST, ctx.rig.position.z);
    _useRigAhead.set(0, 0, -1).applyQuaternion(ctx.rig.getWorldQuaternion(_quaternion));
    ctx.rig.getHeadForward(_useHeadAhead);
    aimForward(ctx.topDown, _useRigAhead, _useHeadAhead, _useForward);
  }

  /**
   * **Als Kran durch alles hindurch** — und beim Zurückschalten sicher landen.
   *
   * Gewünscht war es so: _„als Kran will ich keine Physik haben, also auch
   * durch Wände und über Arbeitsplatten fliegen können."_ Das gibt es schon,
   * für den Konstrukt-Raum (`PhysicsLocomotion.ghost`): keine Kapsel, keine
   * Schwerkraft, das Rig geht dorthin, wohin der Stock zeigt. Gesetzt wird es
   * jedes Bild, weil jedes `resync` es abschaltet.
   *
   * **Das Ende ist die eigentliche Arbeit.** Wer über dem Herd aufhört, Kran
   * zu sein, stünde im Herd. `PhysicsLocomotion.land` sucht deshalb in Ringen
   * die nächste freie Stelle mit Boden darunter; findet sich keine, geht es
   * zurück an den Ort, an dem der Flug anfing.
   */
  private updateCraneFlight(ctx: WorldContext): void {
    this.craneNow = Boolean(ctx.crane);
    const locomotion = this.locomotion;
    if (!locomotion) return;
    if (ctx.crane) {
      if (!this.craneStart) this.craneStart = this.playerFeet(new THREE.Vector3());
      locomotion.ghost = true;
      return;
    }
    const start = this.craneStart;
    if (!start) return;
    this.craneStart = null;
    if (locomotion.land(ctx.rig)) return;
    this.movePlayerTo(ctx, start);
  }

  /**
   * **Der Kreis am Boden, wohin der Kran zeigt** — solange dort nichts
   * hervorgehoben ist.
   *
   * Leuchtet ein Ding unter dem Kran, sagt der Saum schon alles; zwei
   * Auskünfte für dieselbe Stelle wären eine zu viel. Und trägt der Kran ein
   * Modell aus dem Regal, zeigt das Gitter die Kacheln, auf denen es landet
   * (`updatePlaceGrid`) — der Kreis darunter wäre dieselbe Auskunft, nur
   * ungenauer.
   */
  private updateCraneMark(ctx: WorldContext, highlighted: boolean): void {
    const show = Boolean(ctx.crane) && !highlighted && this.carriedModel() === null;
    if (!show) {
      if (this.craneMark) this.craneMark.visible = false;
      return;
    }
    const mark = (this.craneMark ??= buildCraneMark());
    if (mark.parent !== ctx.scene) ctx.scene.add(mark);
    ctx.rig.getHeadPosition(_point);
    mark.position.set(_point.x, ctx.rig.getFloorY() + 0.02, _point.z);
    mark.visible = true;
  }

  /**
   * **Die Abrissbombe** (`core/craneBomb.ts`) — holen, zielen, zünden.
   *
   * Rechtsklick (oder `B` auf dem Glas) holt sie an den Haken und legt sie
   * wieder weg. Solange sie hängt, wird das Ding unter dem Kran zum **Geist**:
   * rot und durchscheinend, und genau das reißt der nächste Druck ab —
   * Linksklick, `E` oder `A`, dieselben Geber wie beim Nehmen. Abgerissen wird
   * für alle in der Sitzung (`removeProp` mit `share`); war es ein
   * hingestelltes Modell, geht auch seine Zeile aus der Liste der
   * Weltänderungen.
   *
   * @returns ob die Bombe gerade hängt — dann gehören ihr die Tasten
   */
  private updateBomb(ctx: WorldContext): boolean {
    // **Leere Klauen heißt: nichts in der Bildschirmhand** — und nicht: keine
    // Bildschirmhand. Die behält ihre Seite, auch wenn sie nichts mehr trägt,
    // und damit ging die Bombe nach dem ersten getragenen Stück nie wieder.
    const side = this.screenCarrySide();
    const carrying = side !== null && this.grabs.has(side);
    const allowed = bombAllowed(gameMode(), Boolean(ctx.crane), carrying);
    if (ctx.rig.takeBomb() && allowed) {
      if (this.bomb) this.putBombAway();
      else this.fetchBomb(ctx);
    }
    if (this.bomb && !allowed) this.putBombAway();
    if (!this.bomb) return false;

    ctx.rig.getHeadPosition(_point);
    const floor = ctx.rig.getFloorY();
    _point.y = floor + 0.5;
    let target = this.findProp(_point);
    if (!target) {
      _point.y = floor + 1.2;
      target = this.findProp(_point);
    }
    if (target !== (this.bombTarget?.entry ?? null)) this.markBombTarget(target);
    ctx.rig.useCandidate = target !== null;
    if (ctx.rig.takeUse() && target) this.detonate(target);
    return true;
  }

  /** Die Bombe an den Haken — erst gebaut, dann, wenn da, aus dem Regal. */
  private fetchBomb(ctx: WorldContext): void {
    const bomb = new THREE.Group();
    bomb.name = 'crane-bomb';
    bomb.position.set(0, craneCarryY(0.2), 0);
    const stand = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 18, 12),
      new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.5 }),
    );
    stand.name = 'crane-bomb-stand';
    bomb.add(stand);
    ctx.rig.add(bomb);
    this.bomb = bomb;
    playTone({ type: 'triangle', from: 260, to: 520, duration: 0.08, gain: 0.05 });
    void kaykitModel(BOMB_MODEL).then((model) => {
      if (!model || this.bomb !== bomb) return;
      bomb.remove(stand);
      disposeTree(stand);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const centre = box.getCenter(new THREE.Vector3());
      model.position.sub(centre);
      bomb.add(model);
    });
  }

  /** Die Bombe weg, und der Geist mit ihr. */
  private putBombAway(): void {
    this.markBombTarget(null);
    if (!this.bomb) return;
    this.bomb.removeFromParent();
    disposeTree(this.bomb);
    this.bomb = null;
  }

  /** Das Ziel als Geist zeigen — und dem vorigen seine Materialien zurückgeben. */
  private markBombTarget(entry: PhysicsBody | null): void {
    const was = this.bombTarget;
    if (was) {
      for (const [mesh, skin] of was.skins) mesh.material = skin;
      this.bombTarget = null;
    }
    if (!entry) return;
    const ghost = (this.bombGhost ??= new THREE.MeshStandardMaterial({
      color: BOMB_GHOST_COLOR,
      emissive: BOMB_GHOST_COLOR,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: BOMB_GHOST_OPACITY,
      depthWrite: false,
    }));
    const skins = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    entry.object.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      skins.set(mesh, mesh.material);
      mesh.material = ghost;
    });
    this.bombTarget = { entry, skins };
  }

  /** Abreißen — für alle, und ohne Spur in der Liste der Weltänderungen. */
  private detonate(entry: PhysicsBody): void {
    // Die eigenen Materialien zurück, bevor `removeProp` alles freigibt: Der
    // Geist gehört allen Zielen und darf dabei nicht mit weg.
    this.markBombTarget(null);
    const path = this.modelPath(entry);
    if (path !== null && !this.replaying)
      this.buildHistory.push({ kind: 'remove', item: { path, pose: this.buildPoseOf(entry) } });
    this.dropModel(entry);
    playTone({ type: 'sawtooth', from: 180, to: 40, duration: 0.35, gain: 0.08 });
  }

  /**
   * **Was der Körper meint** — die eine Auswahl für Saum und Taste.
   *
   * Als Kran nur, was unter ihm liegt (`CRANE_TOUCH`); sonst der Strahl aus
   * der Brust und die Füße wie immer.
   */
  private pickBody(ctx: WorldContext): UsePick | null {
    if (ctx.crane) {
      return pickUsable(this.collectUsables(), _useAt, _useForward, 0, CRANE_TOUCH);
    }
    return pickUsable(this.collectUsables(), _useAt, _useForward, this.useReach());
  }

  /**
   * **Je Bild einmal**: die Anforderung des Rigs abholen und das Gewählte
   * hervorheben.
   *
   * Und dem Gestell sagen, **ob** etwas dasteht (`PlayerRig.useCandidate`):
   * Daran hängt, ob `A` benutzt oder springt — in der Brille wie am Schirm.
   * Ohne diese eine Zeile spränge man in der Brille vor jeder Tür, statt sie
   * aufzumachen.
   */
  private updateUsables(ctx: WorldContext): void {
    // **Mit der Bombe am Haken meint jeder Druck: abreißen** — und sonst
    // nichts (`updateBomb`). Saum und Benutzen ruhen so lange.
    if (this.updateBomb(ctx)) {
      this.bodyPick = null;
      return;
    }
    // **Mit _Boden_ oder _Wand_ meint jeder Druck: hier belegen** — wie bei
    // der Bombe ruhen Saum und Benutzen so lange (`surfaceDecor.ts`).
    if (this.surfaceTool && ctx.crane && !ctx.renderer.xr.isPresenting) {
      this.bodyPick = null;
      ctx.rig.useCandidate = true;
      if (ctx.rig.takeUse()) {
        ctx.rig.getHeadPosition(_point);
        void this.applySurface(ctx, this.surfaceTool, _point.x, _point.z);
      }
      return;
    }
    if (ctx.rig.takeUse() && !this.liftUnderCrane(ctx)) this.useForward(ctx);
    this.aimUse(ctx);

    const pick = this.usables.length > 0 ? this.pickBody(ctx) : null;
    // Ein Modell unter dem leeren Kran ist auch etwas zum Benutzen: Der Klick
    // hebt es auf (`liftUnderCrane`).
    ctx.rig.useCandidate = pick !== null || this.liftTarget(ctx) !== null;
    const object = pick?.candidate.object ?? null;
    this.bodyPick = pick && object ? { usable: pick.candidate.usable, object } : null;
  }

  /**
   * **Wer den Saum bekommt** — und in der Brille ist das die **Hand**.
   *
   * Gerufen **nach** `updateGrabs`, und das ist der Grund für die eigene
   * Methode: Worauf eine Hand zeigt, steht erst dort fest (`useByHand`), und
   * ein Saum, der einen Bildlauf hinterherhinkt, zeigt beim Umsehen
   * regelmäßig auf das Möbel von eben.
   *
   * **Die Ansicht entscheidet, wer gefragt wird**, und beide Antworten gab es
   * schon:
   *
   * - **Von oben und aus den Augen** wählt der Körper: ein Strahl aus der
   *   Brust in Blickrichtung (`core/usable.pickUsable`). Dort gibt es keine
   *   Hand, und `A` meint genau diesen Fund — Saum und Taste sagen dasselbe.
   * - **In der Brille** wählt die Hand. Das ist der gemeldete Fehler: Wer mit
   *   einem Salat in der Hand auf die Zeile **neben** sich zielt, legt ihn
   *   dorthin ab (`useByHand` entscheidet), sieht aber die Zeile **vor** sich
   *   leuchten (`pickUsable` entschied). Zwei Auskünfte, und die sichtbare war
   *   die falsche.
   *
   * **Der Körper bleibt der Rückfall**, auch in der Brille: Zeigt keine Hand
   * auf etwas, meint `A` weiter, was vor der Figur steht, und dann soll das
   * auch leuchten. Ein Saum, der in dem Augenblick ausginge, in dem die Taste
   * noch wirkt, wäre der gemeldete Fehler in der anderen Richtung.
   */
  private showUse(dt: number, ctx: WorldContext): void {
    const view = interactionView(ctx.topDown, ctx.renderer.xr.isPresenting);
    // **Zwei Hände, zwei Säume — aber nur, wenn auch zwei Gegenstände gehen**
    // (`core/grabSettings.GrabSettings.twoHands`). Steht der Schalter aus,
    // trägt man eines, und dann gibt es eine Auskunft und nicht zwei.
    const split = view === 'vr' && this.grabConfig.twoHands;
    const chosen = (view === 'vr' ? (split ? null : this.leadHand()) : null) ?? this.bodyPick;

    // **Und was das Gemeinte in dieser Ansicht will** (`core/interaction.ts`).
    // Ein Knopf will gedrückt werden, ein Brötchen gegriffen — dieselbe
    // Absicht in allen drei Ansichten, nur mit verschiedenen Gebern. Aufgelöst
    // wird sie hier, weil hier ohnehin schon feststeht, was gemeint ist.
    this.useInteraction = chosen
      ? resolveInteraction(chosen.usable.interaction, view, { config: inputConfig() })
      : null;

    // **Der Saum ist die ganze Auskunft** — in der Brille, von oben und aus
    // den Augen gleichermaßen. Daneben stand bis eben eine Tafel („Tomate
    // nehmen"), und sie sagte dasselbe ein zweites Mal: Was `A` meint, zeigt
    // der Saum schon, und zwar **dort, wo es steht**, statt in der Bildmitte
    // über allem anderen. Eine Küche im Gedränge hatte damit dauernd ein
    // Schild vor der halben Arbeitsfläche.
    //
    // **Er hängt an der Auflösung und nicht nur am Fund**: Was in dieser
    // Ansicht keinen Geber hat (`interactive`), kündigt auch nichts an.
    if (split) {
      // **Jede Hand hebt hervor, worauf sie selbst zeigt.** Der Rückfall auf
      // den Körper entfällt dabei mit Absicht: Er ist die Auskunft für die
      // Figur und nicht für eine Hand, und eine leere Hand soll in dieser
      // Betriebsart auch leer aussehen.
      const first = this.handShows('left', view);
      const second = this.handShows('right', view);
      this.highlighter.highlight(first);
      // Zeigen beide auf **dasselbe** Ding, leuchtet es einmal: Zwei Hüllen um
      // dasselbe Netz geben keinen zweiten Saum, sondern einen doppelt dicken.
      this.secondHighlighter.highlight(second === first ? null : second);
    } else {
      const shown = this.useInteraction?.interactive ? (chosen?.object ?? null) : null;
      this.highlighter.highlight(shown);
      this.secondHighlighter.highlight(null);
      this.updateCraneMark(ctx, shown !== null);
    }
    this.highlighter.update(dt);
    this.secondHighlighter.update(dt);
  }

  /**
   * **Was diese eine Hand zeigen soll** — ihr Fund, sofern er in dieser
   * Ansicht überhaupt einen Geber hat, sonst nichts.
   *
   * Gebraucht wird es nur in der Betriebsart _zwei Gegenstände_, und dort für
   * jede Hand einzeln: Die linke darf auf einen Knopf zeigen, während die
   * rechte auf ein Brötchen zeigt, und beides will eigens aufgelöst werden.
   */
  private handShows(hand: Handedness, view: InteractionView): THREE.Object3D | null {
    const pick = this.handPicks.get(hand) ?? null;
    if (!pick) return null;
    const resolved = resolveInteraction(pick.usable.interaction, view, {
      config: inputConfig(),
    });
    return resolved.interactive ? pick.object : null;
  }

  /**
   * **Welche Hand den Saum führt**, solange nur ein Gegenstand getragen wird.
   *
   * Die Hand, die zuletzt etwas getan hat (`lastActHand`) — und zwar
   * **nur**, solange sie selbst etwas meint. Zeigt sie ins Leere, fällt die
   * Auskunft auf den besseren der beiden Funde zurück (`handMeans`), denn ein
   * Saum, der ausgeht, weil die tragende Hand gerade herunterhängt, wäre der
   * gemeldete Fehler in der anderen Richtung: Dann sieht man beim Zielen mit
   * der freien Hand überhaupt nichts mehr.
   *
   * Und solange noch gar nichts getan wurde, ist es wie immer der bessere der
   * beiden Funde — eine frische Sitzung hat keine führende Hand.
   */
  private leadHand(): HandPick | null {
    return leadHandUse(
      this.handPicks.get('left') ?? null,
      this.handPicks.get('right') ?? null,
      this.lastActHand,
    );
  }

  /**
   * **Die Liste als Kandidaten für die Auswahl** — Weltpositionen, je Bild
   * frisch.
   *
   * **Was man nicht sieht, meint man nicht** (`core/usable.usableShows`). Hier
   * stand einmal ein `entry.object.visible`, und das war die halbe Frage: Es
   * übersah eine ausgeknipste Gruppe über dem Griff, und es übersah eine
   * sichtbare Gruppe, deren Formen alle aus sind. Genau daran ist der
   * Bodenhebel verschwunden, als sein Bild aus dem Regal kam — die Regel steht
   * deshalb als eigene Funktion nebenan, wo ein Test sie nachhält.
   */
  private collectUsables(): readonly UseCandidate[] {
    this.useCandidates.length = 0;
    for (const entry of this.usables) {
      if (!usableShows(entry.object)) continue;
      const candidate: UseCandidate = {
        usable: entry.usable,
        position: entry.object.getWorldPosition(new THREE.Vector3()),
        radius: entry.radius,
        object: entry.object,
      };
      this.useCandidates.push(candidate);
    }
    return this.useCandidates;
  }

  /**
   * **Die Bildschirmhand auf- und wieder absetzen** (`screenHand.ts`).
   *
   * Sie entsteht mit jeder **flachen** Ansicht und vergeht mit der Brille;
   * was sie hielt, geht dabei weg. Für die Brille ändert sich damit nichts —
   * dort sind die Hände die getrackten.
   *
   * **Das Werkzeug hält sie in beiden Ansichten.** Aus den Augen gab es das
   * lange nicht — der Linksklick gehörte dort den Portalen, und eine Pistole
   * in einer unsichtbaren Faust hätte ihn ihnen weggenommen. Gemeldet war
   * genau das Gegenteil: _„aus den Augen kann ich gar nicht schießen"_, und
   * man wollte die Hand samt Waffe sehen. Jetzt hängt die Hand dort vor der
   * Kamera (`ScreenHand.placeAtEye`), gezeichnet von denselben `HandVisuals`
   * wie in der Brille, der Linksklick ist ihr Trigger (`PlayerRig.armed`), und
   * in der Mitte steht ein Fadenkreuz. Mit **leerer** Hand bleibt der
   * Linksklick der Portalschuss. **Tragen** kann sie in beiden Ansichten
   * (`updateScreenCarry`).
   */
  private updateScreenHand(ctx: WorldContext, dt: number): void {
    const wanted = !ctx.renderer.xr.isPresenting;
    const hand = this.screenHand;
    if (!wanted) {
      if (!hand) return;
      // Was in dieser Hand lag, ist mit ihr entstanden und geht mit ihr
      // (`dropScreenTool`) — das Getragene fällt dabei ehrlich zu Boden.
      this.dropScreenCarry(ctx);
      this.dropScreenTool();
      this.screenToolOn = false;
      hand.dispose();
      this.screenHand = null;
      ctx.avatar.screenHand = null;
      ctx.hands.setScreenHands([]);
      ctx.rig.armed = false;
      this.showCrosshair(false);
      return;
    }
    const fresh = hand ?? new ScreenHand(ctx.rig);
    this.screenHand = fresh;
    // Das Werkzeug kommt einmal, mit der Hand — und bleibt über jeden
    // Ansichtswechsel in ihr. Es wechselt nur, wenn jemand anderes wählt.
    if (!this.screenToolOn) {
      this.screenToolOn = true;
      const id = this.screenTool();
      const tool = id ? this.freshTool(id) : null;
      if (tool) this.takeTool(ctx, fresh.state, tool);
    }
    const eye = !ctx.topDown;
    const screenTool = this.held.get('right') ?? null;
    // Aus den Augen ist der Linksklick der Trigger, sobald ein Werkzeug in der
    // Hand liegt (`FlatControls`) — und nicht mehr der Portalschuss.
    ctx.rig.armed = eye && screenTool !== null;
    // **Die Hände vor dem Auge**: die rechte immer, die linke nur, solange die
    // rechte leer ist — eine Pistole hält man mit einer Hand.
    ctx.hands.setScreenHands(
      eye ? (screenTool ? [fresh.state] : [fresh.state, fresh.offHand]) : [],
    );
    // **Zielen über Kimme und Korn** (`Tool.sightLine`): solange die rechte
    // Maustaste oder LB liegt, kommt die Waffe ans Auge. Das Fadenkreuz geht
    // dabei weg — man zielt jetzt über die Waffe selbst.
    const sight = eye ? this.eyeSight(screenTool) : null;
    const wantSight = sight !== null && ctx.rig.sighting && !ctx.menu.isOpen;
    const step = dt / EYE_SIGHT_TIME;
    this.eyeSighting = wantSight
      ? Math.min(1, this.eyeSighting + step)
      : Math.max(0, this.eyeSighting - step);
    if (!sight) this.eyeSighting = 0;
    this.showCrosshair(eye && screenTool !== null && !ctx.menu.isOpen && this.eyeSighting < 0.5);
    // **Mit der Höhe der Figur**: Von oben federt sie beim Laufen und atmet im
    // Stehen (`core/squish.ts`), und das Werkzeug in ihrer Faust geht mit
    // (`ScreenHand.place`). Die Zahl ist die des vorigen Bildes — der Avatar
    // rechnet erst nach der Welt (`App.update`) —, und ein Bild Versatz sieht
    // niemand; ein Werkzeug, das auf halber Höhe stehen bliebe, sieht jeder.
    fresh.update(
      ctx.avatar.stretch,
      eye
        ? {
            // Gemessen wird nur, wenn etwas zielt — die leere Hand zeigt geradeaus.
            distance: screenTool ? this.eyeAim(ctx) : EYE_AIM_MAX,
            hold: this.eyeHold(screenTool),
            sight,
            sighting: this.eyeSighting,
          }
        : null,
    );
    // Die Hand der Figur greift nur dort nach, wo man sie sieht — von oben.
    ctx.avatar.screenHand = ctx.topDown ? fresh.at : null;
  }

  /**
   * **Wie weit das Fadenkreuz trifft** — geglättet, in Metern
   * (`eyeAimDistance`). Gefragt werden die festen Flächen, gegen die auch
   * eine Kugel prallt; wer ins Leere schaut, zielt auf die größte Weite.
   */
  private eyeAim(ctx: WorldContext): number {
    const ray = this.headRay(ctx, _eyeRay);
    const hit = this.castSurface(ray, EYE_AIM_MAX, this.solids);
    const want = hit ? hit.point.distanceTo(ray.origin) : EYE_AIM_MAX;
    // Ein Zehntel je Bild: in einer Viertelsekunde da, ohne zu zucken.
    this.eyeAimDistance += (want - this.eyeAimDistance) * 0.1;
    return this.eyeAimDistance;
  }

  /**
   * **Wie das Werkzeug im Griff liegt** — sein Nullpunkt und seine Laufachse,
   * im Raum des Griffs (`eyeHand.EyeHold`).
   *
   * Aus der **Haltung** gerechnet (`Tool.holdIn`) und nicht aus der Lage, in
   * der das Werkzeug gerade steht: Die Pistole schlägt beim Schuss hoch, und
   * eine Hand, die das jedes Mal wieder aufs Kreuz zurückdrehte, nähme ihr den
   * Rückstoß.
   */
  private eyeHold(tool: Tool | null): EyeHold | null {
    if (!tool) return null;
    tool.holdIn('right', _eyeHoldAt, _eyeHoldTurn);
    // Ein Werkzeug, das zielt, liegt auf dem Zeigestrahl (`Tool.applyHold`);
    // der steht vor dem Auge um `GRIP_TO_RAY` gegen den Griff, wie am Controller.
    if (tool.alignToAim) _eyeHoldTurn.premultiply(_eyeGripToRay);
    return {
      position: { x: _eyeHoldAt.x, y: _eyeHoldAt.y, z: _eyeHoldAt.z },
      rotation: { x: _eyeHoldTurn.x, y: _eyeHoldTurn.y, z: _eyeHoldTurn.z, w: _eyeHoldTurn.w },
    };
  }

  /**
   * **Die Visierlinie des Werkzeugs in der Hand** (`Tool.sightLine`) — oder
   * `null` für eines, über das man nicht zielt. Gemessen an der Schiene und
   * nicht an der Lage der Waffe, aus demselben Grund wie `eyeHold`: Der
   * Rückstoß soll im Anschlag zu sehen sein und nicht weggedreht werden.
   */
  private eyeSight(tool: Tool | null): EyeSight | null {
    if (!tool) return null;
    const line = tool.sightLine(_eyeSightAt, _eyeSightTurn);
    if (!line) return null;
    return {
      point: { x: _eyeSightAt.x, y: _eyeSightAt.y, z: _eyeSightAt.z },
      rotation: { x: _eyeSightTurn.x, y: _eyeSightTurn.y, z: _eyeSightTurn.z, w: _eyeSightTurn.w },
      relief: eyeSightRelief(line.aid, line.rear),
      scale: eyeSightScale(line.aid),
    };
  }

  /**
   * **Das Fadenkreuz** — ein Punkt mit vier Strichen in der Bildmitte, solange
   * aus den Augen ein Werkzeug in der Hand liegt. Gebaut, wenn es zum ersten
   * Mal gebraucht wird; die Welt räumt es beim Gehen ab.
   */
  private showCrosshair(on: boolean): void {
    if (!on) {
      if (this.crosshair) this.crosshair.hidden = true;
      return;
    }
    if (!this.crosshair) {
      const cross = document.createElement('div');
      cross.className = 'eye-crosshair';
      cross.setAttribute('aria-hidden', 'true');
      document.body.append(cross);
      this.crosshair = cross;
    }
    this.crosshair.hidden = false;
  }

  /**
   * **Was die Bildschirmhand trägt** — die Seite, unter der es in `grabs`
   * steht, oder `null`, wenn sie nichts hat.
   *
   * Es ist ausdrücklich **derselbe** Griff wie in der Brille und kein zweiter
   * daneben: Dieselbe Karte, dieselbe `attach`/`release`-Buchführung, dasselbe
   * `setCarried` in der Physik. Nur der Anker ist ein anderer — er hängt am
   * Rig statt an einem Controller. Ein zweiter Weg, etwas in der Hand zu
   * halten, wäre der, den beim nächsten Umbau jemand vergisst.
   */
  private screenCarrySide(): Handedness | null {
    const hand = this.screenHand;
    if (!hand) return null;
    return hand.state.handedness ?? null;
  }

  /**
   * **Ein frisch entstandener Körper in die Bildschirmhand** — der Ersatz für
   * „fällt 70 cm vor dem Kopf zu Boden".
   *
   * Gerufen von beiden Herbeirufern (`conjureProp`, `spawnModel`), wenn keine
   * getrackte Hand zugegriffen hat. Der Ablauf ist der des Beutels in der
   * Brille, nur eine Zeile länger: Der Anker wird **erst** an seinen Platz
   * gerechnet, dann rückt der Körper dorthin, und erst dann greift `attach`
   * zu — sonst stünde im Versatz der Weg von der Kopfhöhe bis zum Bauch, und
   * das Ding hinge schief neben der Figur.
   *
   * @returns ob die Hand es aufgefangen hat
   */
  private screenCatch(ctx: WorldContext, entry: PhysicsBody): boolean {
    const hand = this.screenHand;
    const side = this.screenCarrySide();
    if (!hand || !side || !this.physics) return false;

    // Eine Hand trägt eines. Was noch darin lag, geht vorher weg — dieselbe
    // Regel wie in der Brille.
    const busy = this.grabs.get(side);
    if (busy) this.letGo(ctx, side, busy);
    // **Und ein Werkzeug ist auch nur eines.** Eine Pistole in der Faust und
    // eine Tomate vor dem Bauch waren zwei Dinge in einer Hand — gemeldet als
    // _„es kann nicht sein, dass ich eine Tomate und eine Pistole halte"_.
    // Werkzeug und Vorrat werden gleich behandelt: Was man nimmt, ersetzt,
    // was man hielt, und der Werkzeug-Knopf zeigt danach die leere Hand.
    this.toolPick = null;
    this.dropScreenTool();

    this.screenSpan = spanOf(entry.object);
    hand.placeCarry(screenCarryView(ctx), this.screenSpan, ctx.avatar.bob, ctx.avatar.stretch);
    hand.carry.getWorldPosition(_point);
    entry.object.position.copy(_point);
    entry.object.updateWorldMatrix(true, false);
    entry.previousPosition.copy(_point);
    entry.body.setTranslation({ x: _point.x, y: _point.y, z: _point.z }, true);

    this.attach(side, hand.carry, entry);
    // Frisch in der Hand und ohne Druck: Der **erste** Druck ist der Griff
    // darum, sein Loslassen entscheidet (`updateScreenCarry`).
    this.screenPress = null;
    this.screenTapped = false;
    this.screenUseWas = ctx.rig.useHeld;
    return true;
  }

  /**
   * **Ein Bild weiter mit dem, was die Bildschirmhand trägt**: der Anker an
   * seinen Platz, der Körper hinterher, und der Benutzen-Knopf gefragt.
   *
   * **Warum der Benutzen-Knopf.** Am Schirm gibt es keine Greif-Taste — es
   * gibt `A` auf dem Glas, `A` am Pad, `E` und Enter, und die heißen alle
   * _Benutzen_ (`core/inputMap.ts`). Genau dieser Knopf gehört hier dem, was
   * die Figur **trägt**, und das ist keine neue Regel, sondern die des
   * Feuerlöschers in der Küche (`PlayerRig.useBusy`): Wer etwas in der Hand
   * hat, hüpft damit nicht.
   *
   * **Und die Regel dahinter ist die der Brille** (`core/handUse.ts`,
   * _Halten oder Tippen_): Wer drückt, läuft und **loslässt**, legt ab; wer
   * nur **tippt**, behält es in der Hand, und der nächste Druck legt es ab.
   * Dieselben zwei Zahlen entscheiden — 0,35 s und 8 cm —, nur ist die
   * Strecke hier die der Figur und nicht die einer Faust: Wer mit dem Fass
   * losgeht, meint „ich trage es dorthin".
   */
  private updateScreenCarry(dt: number, ctx: WorldContext): void {
    const hand = this.screenHand;
    const side = this.screenCarrySide();
    const grab = hand && side ? this.grabs.get(side) : undefined;
    if (!hand || !side || !grab) {
      this.unshrinkScreenCarry();
      // Ein Klick, der nichts mehr zum Ablegen fand, verfällt — sonst legte er
      // das nächste Ding ab, kaum dass es in der Hand ist.
      ctx.rig.takeDrop();
      this.screenPress = null;
      this.screenUseWas = ctx.rig.useHeld;
      this.freeScreenClaim(ctx);
      return;
    }

    // **Der Knopf gehört dem Getragenen** — sonst spränge die Figur dabei
    // (`PlayerRig.useBusy`, dieselbe Regel wie beim Feuerlöscher der Küche).
    ctx.rig.useBusy = true;
    // Und die linke Maustaste legt es ab wie `E` (`PlayerRig.carrying`).
    ctx.rig.carrying = true;
    // **Aus den Augen halb so groß** (`eyeHand.EYE_SCALE`), von oben in echt —
    // und der Anker rückt dafür so nah, wie es der gezeichneten Größe
    // entspricht, sonst schwebte eine halbe Tomate einen Meter vor einem her.
    const shrink = ctx.topDown ? 1 : EYE_SCALE;
    this.shrinkScreenCarry(grab.entry, shrink);
    _screenSpanShown.radius = this.screenSpan.radius * shrink;
    _screenSpanShown.half = this.screenSpan.half * shrink;
    hand.placeCarry(screenCarryView(ctx), _screenSpanShown, ctx.avatar.bob, ctx.avatar.stretch);
    hand.carry.getWorldPosition(_screenCarryAt);
    // **Und die Figur legt ihre Hände darunter** — aber nur von oben, denn
    // nur dort sieht man sie (`PlayerAvatar.carry`).
    ctx.avatar.carry = ctx.topDown ? _screenCarryHands.copy(hand.carry.position) : null;
    this.screenClaim = true;

    // **Die linke Maustaste legt sofort ab** (`FlatControls.pressMouseUse`) —
    // ein Klick ist kein Tippen, das behält, sondern ein Hinstellen.
    if (ctx.rig.takeDrop()) {
      this.screenPress = null;
      if (!this.startPaint(ctx, grab.entry)) {
        this.release(ctx, side, grab, true, true);
        return;
      }
    }
    this.paintStroke(ctx, grab.entry);

    const held = ctx.rig.useHeld;
    // **Die Flanke kommt aus zwei Quellen, und sie muss aus beiden kommen.**
    // `E` und Enter rasten sie ein (`FlatControls` → `PlayerRig.requestUse`),
    // der Knopf auf dem Glas und das Pad **liegen** nur (`useHeld`). Wer die
    // Taste kürzer drückt, als ein Bild dauert, löst nur die erste aus — und
    // ein Ablegen, das an der Bildrate hängt, ist keins.
    //
    // Und dass sie hier **abgeholt** wird, ist der zweite Teil: Derselbe Druck
    // darf nicht auch noch benutzen, was vor der Figur steht (`updateUsables`
    // fragt gleich danach). Der Knopf gehört dem Getragenen, ganz.
    const down = ctx.rig.takeUse() || (held && !this.screenUseWas);
    const up = !held && this.screenUseWas;
    this.screenUseWas = held;

    if (down) {
      if (this.screenTapped) {
        // Getippt genommen, jetzt wieder gedrückt: ablegen, sofort.
        this.release(ctx, side, grab, true, true);
        this.screenPress = null;
        return;
      }
      this.screenPress = gripPressTook(beginGripPress());
      this.screenPressFrom.copy(_screenCarryAt);
      // Eine Taste, die im selben Bild schon wieder oben ist, **war** ein
      // Tippen — und ein Tippen behält, was in der Hand liegt.
      if (!held) {
        this.screenPress = null;
        this.keepInScreenHand(ctx, grab);
      }
    } else if (held && this.screenPress) {
      this.screenPress = stepGripPress(
        this.screenPress,
        dt,
        _screenCarryAt.distanceTo(this.screenPressFrom),
      );
    } else if (up) {
      const press = this.screenPress;
      this.screenPress = null;
      if (gripPressDrops(press)) {
        this.release(ctx, side, grab, true, true);
        return;
      }
      // Ein Tippen behält es — und der nächste Druck legt es ab.
      if (press) this.keepInScreenHand(ctx, grab);
    }

    // Und der Körper folgt dem Anker, Bild für Bild — dieselbe Rechnung wie
    // in der Faust, nur ohne Nahgriff und ohne Zuggeste.
    this.carryGrab(dt, ctx, side, grab, hand.state, hand.carry, _screenReach);
    _screenReach.clear();
  }

  /**
   * **Was getragen wird, in der Größe zeichnen, die die Ansicht will** — aus
   * den Augen halb so groß (`EYE_SCALE`), von oben wie es ist.
   *
   * Nur das Bild wird kleiner und nicht der Körper: Getroffen, gestapelt und
   * eingerastet wird weiter mit der echten Größe (`halfExtents`), und beim
   * Loslassen ist das Ding sofort wieder so groß, wie es im Raum steht
   * (`release` → `unshrinkScreenCarry`). Die Größe davor wird gemerkt, nicht
   * angenommen: Modelle aus dem Regal tragen einen Maßstab je Paket.
   */
  private shrinkScreenCarry(entry: PhysicsBody, factor: number): void {
    if (this.shrunk && this.shrunk.entry !== entry) this.unshrinkScreenCarry();
    if (factor === 1) {
      this.unshrinkScreenCarry();
      return;
    }
    if (!this.shrunk) this.shrunk = { entry, scale: entry.object.scale.clone() };
    entry.object.scale.copy(this.shrunk.scale).multiplyScalar(factor);
  }

  /** Das Getragene wieder in seiner echten Größe. */
  private unshrinkScreenCarry(): void {
    const shrunk = this.shrunk;
    if (!shrunk) return;
    this.shrunk = null;
    shrunk.entry.object.scale.copy(shrunk.scale);
    shrunk.entry.object.updateMatrixWorld(true);
  }

  /**
   * **Die Zeile, die beim Auffangen erscheint** — der Name und daneben, womit
   * man es wieder loswird.
   *
   * Der Geber kommt aus der **eingestellten** Belegung und nicht aus einer
   * festen Tabelle (`core/interaction.inputLabel`): Wer _Benutzen_ im Menü
   * auf `F` legt, liest danach „A / F". Ohne diese Zeile wüsste niemand, dass
   * der Knopf jetzt dem gehört, was er trägt.
   */
  private carryNote(label: string): string {
    const config = inputConfig();
    const givers = [inputLabel('useButton', { config }), inputLabel('useKey', { config })]
      .filter((part) => part.length > 0)
      .join(' / ');
    return givers ? `${label} · ${givers} legt ab` : label;
  }

  /**
   * **Ein Tippen behält, was in der Hand liegt** — und sagt es auch.
   *
   * Der Satz muss dastehen: Ein Knopf, der sichtbar nichts tut, sieht kaputt
   * aus, und die Zeile beim Auffangen hat gerade versprochen, dass er ablegt.
   * Einmal je Tippen, nicht je Bild — danach ist der Zustand gemerkt.
   */
  private keepInScreenHand(ctx: WorldContext, grab: HandGrab): void {
    if (this.screenTapped) return;
    this.screenTapped = true;
    ctx.notify(`${labelOfProp(grab.entry.object)} bleibt in der Hand · nochmal drücken legt ab`);
  }

  /** Was die Bildschirmhand trug, fällt — beim Aufsetzen der Brille, beim Ende. */
  private dropScreenCarry(ctx: WorldContext): void {
    const side = this.screenCarrySide();
    const grab = side ? this.grabs.get(side) : undefined;
    if (side && grab) this.letGo(ctx, side, grab);
    this.screenPress = null;
    this.screenTapped = false;
    this.freeScreenClaim(ctx);
  }

  /** Knopf und Hände wieder hergeben — und nur, wenn sie wirklich uns gehörten. */
  private freeScreenClaim(ctx: WorldContext): void {
    if (!this.screenClaim) return;
    this.screenClaim = false;
    ctx.rig.useBusy = false;
    ctx.rig.carrying = false;
    ctx.avatar.carry = null;
  }

  /**
   * **Was am Schirm in der rechten Hand liegt** — die Id eines Werkzeugs oder
   * `null` für die leere Hand.
   *
   * Das ist jetzt die **Wahl des Spielers** (`#hud-tool`, `toolChoice`), und
   * nur solange er keine getroffen hat, die Vorgabe der Welt. So bleibt alles
   * wie es war, bis jemand den Knopf drückt.
   */
  protected screenTool(): string | null {
    return this.toolPick === undefined ? this.defaultScreenTool() : this.toolPick;
  }

  /**
   * **Womit die Bildschirmhand anfängt: mit nichts.**
   *
   * Hier stand einmal die Pistole, weil der Linksklick der Trigger dieser
   * Hand ist (Plan, E5). Gewünscht ist aber ausdrücklich die **leere Hand**:
   * Wer schießen will, wählt die Pistole im Werkzeug-Knopf (`#hud-tool`), und
   * eine leere Hand kann tragen, was aus Beutel und Regal kommt, ohne dass
   * vorher etwas weggelegt werden muss (`screenCatch`). Eine Welt, die mit
   * einem Werkzeug anfangen will, sagt es hier.
   */
  protected defaultScreenTool(): string | null {
    return null;
  }

  /**
   * **Die Werkzeugwahl am Bildschirm** (`core/types.ToolChoice`) — was `App`
   * in den runden Knopf unten rechts schreibt.
   *
   * Angeboten wird, was die Welt an den Gürtel hängt (`beltLoadout`), und
   * davor das, was ohnehin in der Hand liegt; eine Welt ganz ohne Gürtel
   * bekommt das ganze Regal (`TOOL_IDS`). Beschriftung und Ikone kommen vom
   * Werkzeug selbst — dieselben wie im Regal am Handgelenk.
   */
  toolChoice(): ToolChoice | null {
    // Erst wenn die Welt steht: Die Liste baut Werkzeuge, um an Beschriftung
    // und Ikone zu kommen, und `App` fragt schon, während `init` noch läuft.
    if (!this.context) return null;
    const options = (this.toolOptions ??= this.buildToolOptions());
    if (options.length === 0) return null;
    this.choice.options = options;
    this.choice.current = this.screenTool();
    return this.choice;
  }

  /** Das Ding, das `App` jedes Bild liest — eines und nicht jedes Bild ein neues. */
  private readonly choice: ToolChoice = {
    current: null,
    options: [],
    choose: (id) => this.chooseScreenTool(id),
  };

  private buildToolOptions(): ToolOption[] {
    const ids: string[] = [];
    const add = (id: string | null): void => {
      if (id && !ids.includes(id)) ids.push(id);
    };
    // Was schon in der Hand liegt, steht oben: Es ist die Zeile, auf die man
    // zurückkommt, wenn man die Hand wieder füllen will.
    add(this.defaultScreenTool());
    for (const [id] of this.beltLoadout()) add(id);
    if (ids.length === 0) for (const id of TOOL_IDS) add(id);

    const options: ToolOption[] = [];
    for (const id of ids) {
      const tool = this.tool(id);
      options.push({
        id,
        label: tool?.label ?? id,
        ...(tool?.icon ? { icon: tool.icon } : {}),
        ...(tool?.accent !== undefined ? { accent: tool.accent } : {}),
      });
    }
    return options;
  }

  /**
   * **Ein Tipp in der Liste** — das Werkzeug wechselt sofort.
   *
   * Sofort, weil ein Knopf, dessen Wirkung erst beim nächsten
   * Ansichtswechsel eintritt, kaputt aussieht. Liegt gerade keine
   * Bildschirmhand auf (aus den Augen, in der Brille), wird die Wahl nur
   * gemerkt und gilt, sobald es wieder eine gibt.
   */
  private chooseScreenTool(id: string | null): void {
    const ctx = this.context;
    // **Was die Figur trägt, stellt sie dafür ab** — die Gegenrichtung zu
    // `screenCatch`: Eine Hand hält eines, ein Werkzeug oder einen Vorrat.
    // Auch „Hand (leer)" leert sie, darum steht das vor dem Vergleich. Fallen
    // gelassen und nicht hingestellt: Hingestellt holte der _Baukasten_ gleich
    // die nächste Kopie in dieselbe Hand (`placedFromShelf`).
    if (ctx) this.dropScreenCarry(ctx);
    if (this.toolPick !== undefined && id === this.toolPick) return;
    this.toolPick = id;
    const hand = this.screenHand;
    // Ohne Bildschirmhand (in der Brille) wird die Wahl nur gemerkt und gilt,
    // sobald es wieder eine gibt.
    if (!ctx || !hand || !this.screenToolOn) return;
    this.dropScreenTool();
    const tool = id ? this.freshTool(id) : null;
    if (tool) this.takeTool(ctx, hand.state, tool);
  }

  /**
   * Was in der Bildschirmhand lag, geht weg — **nicht** an den Gürtel: Dort
   * hängt schon, was die Welt dort haben will, und eine Pistole, die sich beim
   * Ablegen auf eine Hüfte drängt, schiebt das Schild des Labors ins Nichts.
   */
  private dropScreenTool(): void {
    const tool = this.held.get('right');
    if (!tool) return;
    this.held.delete('right');
    tool.heldBy = null;
    if (this.host) tool.onStow(this.host);
    this.retireTool(tool);
  }

  /**
   * Die Hand dieser Seite — die getrackte, sonst die am Schirm.
   *
   * Ein Werkzeug will jedes Bild wissen, wer es hält (`Tool.update`): Ohne
   * diese Zeile liefe die Pistole am Schirm ohne Hand, und Dauerfeuer, Salve
   * und das Loslassen des Triggers hätten dort niemanden, der sie meldet.
   */
  private handOf(ctx: WorldContext, hand: Handedness): ControllerState | null {
    const tracked = ctx.input.get(hand);
    if (tracked) return tracked;
    return this.screenHand?.state.handedness === hand ? this.screenHand.state : null;
  }

  // --- shooting -----------------------------------------------------------

  private bindFlatInput(ctx: WorldContext): void {
    this.canvas = ctx.renderer.domElement;
    // On a flat screen there are no hands to hold a gun with, so the mouse
    // keeps both portals: left blue, right red.
    this.flatFire = (event: MouseEvent) => {
      if (ctx.renderer.xr.isPresenting || ctx.pointer.hovering) return;
      // **Von oben gehört der Klick der Hand**, nicht dem Fadenkreuz: Dort ist
      // er der Trigger der rechten Hand (Plan, E5), und ein Portal, das dabei
      // aus dem Kopf der Figur schießt, wäre ein zweiter, unsichtbarer Schuss.
      // Gefragt wird die **Ansicht** und nicht, ob es eine Bildschirmhand
      // gibt: Die gibt es seit dem Tragen auch aus den Augen, und dort ist
      // der Linksklick weiter der Portalschuss.
      if (ctx.topDown) return;
      // **Und aus den Augen genauso, sobald die Hand ein Werkzeug hält**
      // (`PlayerRig.armed`): Dann ist der Linksklick sein Trigger, und ein
      // Portal obendrauf wäre derselbe zweite Schuss. Die rechte Taste
      // schweigt dann auch — ein rotes Portal ohne blaues ist kein Paar.
      if (ctx.rig.armed) return;
      if (event.button === 0) this.flatShoot(ctx, 'a');
      else if (event.button === 2) this.flatShoot(ctx, 'b');
    };
    this.flatKeys = (event: KeyboardEvent) => {
      // "r" is a reset — unless it is going into the keypad, or the crane is
      // flying: Dann dreht `R` den Kran (`FlatControls.crane`), und ein
      // Umbau, der beim Drehen die Welt zurücksetzt, wäre ein verlorener Umbau.
      if (event.code === 'KeyR' && !isTyping() && !movesFurniture(gameMode())) {
        this.resetWorld(ctx);
      }
    };
    this.blockContextMenu = (event: Event) => event.preventDefault();
    this.canvas.addEventListener('mousedown', this.flatFire);
    this.canvas.addEventListener('contextmenu', this.blockContextMenu);
    window.addEventListener('keydown', this.flatKeys);
  }

  private flatShoot(ctx: WorldContext, key: PortalKey): void {
    this.headRay(ctx, _ray);
    this.shootPortal(key, _ray.origin, _ray.direction);
  }

  private handleReset(ctx: WorldContext): void {
    if (!ctx.renderer.xr.isPresenting) return;
    // Im offenen Menü ist `B`/`Y` _Zurück_ (`WristMenu.updateBack`) — und
    // eine Welt, die dabei zurückgesetzt wird, wäre ein teures Zurück.
    if (ctx.menu.isOpen) return;
    for (const controller of ctx.input.controllers) {
      if (controller.secondary.justPressed) this.resetWorld(ctx);
    }
  }

  /**
   * Places a portal along a ray. Both the guns and the mouse end up here, so
   * there is one place that decides whether a portal fits.
   */
  private shootPortal(key: PortalKey, origin: THREE.Vector3, direction: THREE.Vector3): void {
    const ctx = this.context;
    if (!ctx) return;
    _aimRay.origin.copy(origin);
    _aimRay.direction.copy(direction).normalize();

    const portal = this.portalOf(key);
    const hit = this.castSurface(_aimRay);
    if (!hit) {
      ctx.notify('Keine Fläche getroffen');
      return;
    }
    surfaceUp(_aimRay.direction, hit.normal, _placeUp);
    if (!this.fits(hit.point, hit.normal, _placeUp, hit.object)) {
      ctx.notify('Hier passt kein Portal hin');
      return;
    }

    const other = portal === this.portalBlue ? this.portalRed : this.portalBlue;
    if (other.placed && other.getWorldNormal(_probe).dot(hit.normal) > 0.98) {
      other.getWorldPosition(_probe);
      if (_probe.distanceTo(hit.point) < PORTAL_HALF_WIDTH * 2.05) {
        ctx.notify('Portale überlappen sich');
        return;
      }
    }

    portal.place(
      hit.point,
      hit.normal,
      _placeUp,
      this.funnelGroups(hit.point, hit.normal, _placeUp),
    );
    this.sync?.portalChanged(portal.key, this.portalState(portal.key));
    ctx.notify(key === 'a' ? 'Blaues Portal' : 'Rotes Portal');
  }

  /** Where the head points; the aim while not in VR. */
  private headRay(ctx: WorldContext, target: THREE.Ray): THREE.Ray {
    ctx.camera.updateWorldMatrix(true, false);
    target.origin.setFromMatrixPosition(ctx.camera.matrixWorld);
    target.direction
      .set(0, 0, -1)
      .applyQuaternion(ctx.camera.getWorldQuaternion(_quaternion))
      .normalize();
    return target;
  }

  /** Every gun in a hand shows its own preview, in its own colour. */
  private updateAim(ctx: WorldContext): void {
    const presenting = ctx.renderer.xr.isPresenting;

    for (const [key, ring] of this.rings) {
      let ray: THREE.Ray | null = null;
      if (presenting) {
        const gun = this.heldGunFor(key);
        if (gun) ray = gun.aimRay(_aimRay);
      } else if (key === 'a' && !ctx.rig.armed) {
        // Flat play has one crosshair; the second portal shares it. Mit einem
        // Werkzeug in der Hand schießt der Klick keine Portale, also zeigt der
        // Ring auch keins an.
        ray = this.headRay(ctx, _aimRay);
      }

      const hit = ray ? this.castSurface(ray) : null;
      if (!ray || !hit) {
        ring.visible = false;
        continue;
      }
      surfaceUp(ray.direction, hit.normal, _placeUp);
      const valid = this.fits(hit.point, hit.normal, _placeUp, hit.object);
      ring.visible = true;
      ring.position.copy(hit.point).addScaledVector(hit.normal, key === 'a' ? 0.012 : 0.014);
      orientToSurface(ring, hit.normal, _placeUp);
      ring.material.opacity = valid ? 0.6 : 0.25;
    }
  }

  // --- portals ------------------------------------------------------------

  /**
   * Collision bits of the surfaces this point may currently pass through — the
   * walls of the portals whose opening it sits in front of, and nothing else.
   * Standing near a wall portal used to open up *every* portal surface, which
   * is what made the floor give way just before a portal.
   */
  private funnelMask(point: THREE.Vector3, head?: THREE.Vector3): number {
    let mask = 0;
    for (const portal of [this.portalBlue, this.portalRed]) {
      if (!portal.placed || !portal.link?.placed) continue;
      if (Math.abs(portal.signedDistance(point)) > FUNNEL_DEPTH) continue;
      if (!portal.isInOpening(point, 1.1)) continue;
      // A portal on a wall only dissolves that wall while the head lines up
      // with the opening as well. Otherwise the body walks into a wall the
      // head never passes — and there is nothing to stand on inside it.
      if (head && Math.abs(portal.getWorldNormal(_funnelNormal).y) < 0.7) {
        if (!portal.isInOpening(head, 1.15)) continue;
      }
      mask |= portal.surfaceGroup;
    }
    return mask;
  }

  /**
   * Die Bits der Flächen, die ein Portal an dieser Stelle **durchstößt** — was
   * ein Körper im Trichter also alles ignorieren darf (`portalFunnel.ts`).
   *
   * Einmal beim Schießen gerechnet und am Portal gemerkt: Flächen wandern
   * nicht, und neun Strahlen je Bild wären neun zu viel.
   */
  private funnelGroups(point: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3): number {
    return funnelGroups(
      {
        raycaster: this.raycaster,
        surfaces: this.surfaces,
        groupOf: (surface) => this.surfaceGroups.get(surface) ?? 0,
        depth: FUNNEL_DEPTH,
      },
      point,
      normal,
      up,
    );
  }

  /** Lets the player fall through a wall while standing in a portal opening. */
  private playerFunnelMask(): number {
    this.locomotion!.getPosition(_point);
    this.context!.rig.getHeadPosition(_head);
    return this.funnelMask(_point, _head);
  }

  /**
   * **Wer gerade durch eine Wand darf** — Kisten und die, die herumlaufen.
   *
   * Das ist die Voraussetzung für alles Weitere: Ein Portal ist ein Bild an
   * einer Wand, und die Wand bleibt fest. Ohne diese Zeilen stößt ein Zombie
   * vor dem Portal gegen den Beton, in dem es hängt, und zappelt dort, bis
   * jemand ihn wegräumt — man sieht das Loch, er läuft dagegen.
   */
  private updatePhasing(): void {
    const physics = this.physics!;
    for (const entry of this.props) {
      const t = entry.body.translation();
      _probe.set(t.x, t.y, t.z);
      physics.setPhasing(entry, this.funnelMask(_probe));
    }
    // Der Zylinder eines NPC ist in der Physik eine Kiste wie jede andere, und
    // er wird hier genauso behandelt. Gemessen wird an seiner **Mitte**: ein
    // Portal in einer Wand hängt auf Brusthöhe, und wer die Füße nähme, ließe
    // ihn einen halben Körper zu tief hineinlaufen (`Npc.center`).
    for (const npc of this.director?.crowd ?? []) {
      if (!npc.solid) continue;
      physics.setPhasing(npc.entry, this.funnelMask(npc.center(_probe)));
    }
  }

  private traverseProps(): void {
    const grabbed = new Set([...this.grabs.values()].map((grab) => grab.entry));
    for (const entry of this.props) {
      if (grabbed.has(entry)) continue;
      // Props another player simulates arrive already on the other side.
      if (!this.drives(entry)) continue;
      const t = entry.body.translation();
      _point.set(t.x, t.y, t.z);

      if (_point.y < -25) {
        this.respawn(entry);
        continue;
      }

      for (const portal of [this.portalBlue, this.portalRed]) {
        const transform = portal.getTraversalMatrix(_matrix);
        if (!transform) continue;
        if (!crossPoint(portal, entry.previousPosition, _point, _cross)) continue;

        _rotation.setFromRotationMatrix(_rotationMatrix.extractRotation(transform));
        _point.applyMatrix4(transform);
        entry.body.setTranslation({ x: _point.x, y: _point.y, z: _point.z }, true);

        const r = entry.body.rotation();
        _quaternion.set(r.x, r.y, r.z, r.w).premultiply(_rotation);
        entry.body.setRotation(
          { x: _quaternion.x, y: _quaternion.y, z: _quaternion.z, w: _quaternion.w },
          true,
        );

        const linear = entry.body.linvel();
        _direction.set(linear.x, linear.y, linear.z).applyQuaternion(_rotation);
        entry.body.setLinvel({ x: _direction.x, y: _direction.y, z: _direction.z }, true);

        const angular = entry.body.angvel();
        _direction.set(angular.x, angular.y, angular.z).applyQuaternion(_rotation);
        entry.body.setAngvel({ x: _direction.x, y: _direction.y, z: _direction.z }, true);
        break;
      }

      entry.previousPosition.copy(_point);
    }
  }

  /**
   * **Und dasselbe für die, die herumlaufen.**
   *
   * Ein NPC ist ein dynamischer Körper, kein Character Controller: Er fällt
   * durch ein Bodenportal von selbst, sobald die Wand ihn lässt
   * (`updatePhasing`). Was ihm fehlt, ist die andere Seite — ohne diese Zeilen
   * fällt er durch das Loch und dahinter einfach weiter, bis der Regisseur ihn
   * unter der Welt einsammelt.
   *
   * Gerechnet wird mit derselben Strecke wie bei den Kisten: von da, wo er im
   * letzten Bild stand, bis dahin, wo er jetzt steht. Wer in einem Bild ganz
   * hindurchfliegt — und geworfen wird ein Zombie durchaus —, wird nur so
   * erwischt (`portalCrossing.ts`).
   */
  private traverseNpcs(): void {
    for (const npc of this.director?.crowd ?? []) {
      if (!npc.solid) continue;
      npc.center(_point);
      for (const portal of [this.portalBlue, this.portalRed]) {
        const transform = portal.getTraversalMatrix(_matrix);
        if (!transform) continue;
        if (!crossPoint(portal, npc.entry.previousPosition, _point, _cross)) continue;
        npc.warp(transform);
        break;
      }
      npc.center(npc.entry.previousPosition);
    }
  }

  private traversePlayer(ctx: WorldContext): void {
    // A spectating player is a camera, not a body — portals must not grab them.
    if (ctx.rig.paused) {
      this.hasPreviousHead = false;
      return;
    }
    ctx.rig.getHeadPosition(_head);

    if (this.hasPreviousHead) {
      for (const portal of [this.portalBlue, this.portalRed]) {
        const transform = portal.getTraversalMatrix(_matrix);
        if (!transform) continue;
        const before = portal.signedDistance(this.previousHead);
        const after = portal.signedDistance(_head);
        if (before <= 0 || after > 0) continue;
        const t = before / (before - after);
        _cross.lerpVectors(this.previousHead, _head, t);
        if (!portal.isInOpening(_cross)) continue;
        ctx.rig.applyWorldTransform(transform);
        ctx.rig.getHeadPosition(_head);
        break;
      }
    }

    this.previousHead.copy(_head);
    this.hasPreviousHead = true;
  }

  /**
   * Keeps the portal surface out of the camera's near plane while you walk into
   * it. Without this the last few centimetres show the bare wall, which is what
   * turns walking through a portal back into a teleport.
   */
  private updatePortalDepth(ctx: WorldContext): void {
    ctx.rig.getHeadPosition(_head);
    for (const portal of [this.portalBlue, this.portalRed]) {
      if (!portal.placed || !portal.link?.placed || !portal.isInOpening(_head, 1.4)) {
        portal.setNearPad(0);
        continue;
      }
      const distance = portal.signedDistance(_head);
      portal.setNearPad(THREE.MathUtils.clamp(NEAR_PAD - distance, 0, NEAR_PAD));
    }
  }

  private respawn(entry: PhysicsBody): void {
    const spawn = this.spawns.get(entry);
    if (!spawn) return;
    spawn.decompose(_point, _quaternion, _probe);
    entry.body.setTranslation({ x: _point.x, y: _point.y, z: _point.z }, true);
    entry.body.setRotation(
      { x: _quaternion.x, y: _quaternion.y, z: _quaternion.z, w: _quaternion.w },
      true,
    );
    entry.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    entry.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    entry.previousPosition.copy(_point);
  }

  private resetWorld(ctx: WorldContext): void {
    this.resetShared();
    this.sync?.resetShared();
    ctx.notify('Labor zurückgesetzt');
  }

  /**
   * **Alles auf Anfang** — der Knopf _Zurücksetzen_ im Menü.
   *
   * Gewünscht war ein Reset, der **alles** zurücksetzt, statt „Labor
   * zurücksetzen", das nur Portale, Würfel und Dominos zurücklegte. Stehen
   * blieben dabei verschobene Möbel, Stücke aus dem Regal, ein Umbau aus dem
   * Baukasten — und der liegt im Speicher des Geräts (`grid/worldStore.ts`)
   * und kommt beim nächsten Start wieder. Genau so stand in der Handy-App noch
   * ein alter Küchenboden, als er im Browser längst neu war.
   *
   * Also: das Geteilte zurück (wie bisher, auch bei den anderen), den
   * gespeicherten Stand vergessen (`forgetStored`), die Liste der
   * Weltänderungen leeren und die Welt frisch laden. `R` und die zweite Taste
   * in der Brille bleiben beim kleinen Zurücksetzen — ein versehentlicher
   * Tastendruck soll keinen Umbau löschen.
   */
  private resetEverything(ctx: WorldContext): void {
    this.resetShared();
    this.sync?.resetShared();
    this.forgetStored();
    clearWorldChanges();
    if (ctx.reload) {
      ctx.notify('Alles zurückgesetzt');
      ctx.reload();
    } else ctx.notify('Zurückgesetzt');
  }

  /** Was diese Welt im Gerät aufhebt, vergessen — voreingestellt nichts. */
  protected forgetStored(): void {}

  /** The reset itself, without telling anybody — used by both ends. */
  private resetShared(): void {
    this.portalBlue.reset();
    this.portalRed.reset();
    for (const entry of [...this.flights.keys()]) this.endFlight(entry, false);
    this.clearSpawned();
    // Dropped tools go back to being belt tools: a floor full of thrown stars
    // is exactly the sort of thing "zurücksetzen" is for.
    for (const loose of [...this.loose.values()]) {
      // Die Hüfte steht am liegenden Werkzeug selbst: `homes` ist beim
      // Fallenlassen gelöscht worden, dort stand hier vorher nichts mehr.
      const hip = loose.hip;
      this.retireLoose(loose);
      if (hip && this.belt) this.refillSlot(this.belt.slot(hip));
    }
    for (const entry of this.props) this.respawn(entry);
    // Was herumläuft, gehört zum Aufgeräumten dazu: „zurücksetzen" heißt auch
    // „und keine Zombies mehr". Sie stehen nur hier — über das Netz geht davon
    // nichts, also räumt jede Seite ihre eigenen weg.
    this.director?.clear();
    this.worldReset();
  }

  /**
   * A world's own idea of "back to the start". The lab has none — putting the
   * props back where they were is the whole of it — but a kitchen full of
   * half-finished pizzas or a kart out on the circuit needs a word in here.
   */
  protected worldReset(): void {}

  // --- shared session -----------------------------------------------------

  /**
   * Everything in this room belongs to everybody: the two portals, the props
   * on the floor and whatever comes out of the bag. `PortalSync` moves the
   * state around, this wires it to the actual objects.
   */
  private createSync(ctx: WorldContext): PortalSync {
    return new PortalSync({
      net: ctx.net,
      physics: this.physics!,
      bodies: this.bodies,
      local: (id) => {
        const entry = this.bodies.get(id);
        return !!entry && this.worldOwned.has(entry);
      },
      heldLocally: (id) => {
        const entry = this.bodies.get(id);
        return !!entry && (this.handHolding(entry) !== null || this.flights.has(entry));
      },
      dropLocal: (id) => {
        const entry = this.bodies.get(id);
        if (!entry) return;
        for (const [hand, grab] of [...this.grabs]) {
          if (grab.entry === entry) this.grabs.delete(hand);
        }
        this.endFlight(entry, false);
        this.physics?.setCarried(entry, false);
      },
      spawnRemote: (id, kind, pose) => {
        const path = modelPathOf(kind);
        // Ein Modell muss erst geladen werden; der Rest steht sofort da.
        // Absichtlich nicht abgewartet — die Nachricht ist beantwortet, auch
        // wenn das Fass erst in zweihundert Millisekunden umfällt.
        if (path !== null) {
          void this.spawnRemoteModel(id, path, pose);
          return;
        }
        _point.set(pose[0], pose[1], pose[2]);
        _quaternion.set(pose[3], pose[4], pose[5], pose[6]);
        this.createProp(id, kind as BagKind, _point, _quaternion);
      },
      despawnRemote: (id) => {
        const entry = this.bodies.get(id);
        if (entry) this.removeProp(entry, false);
      },
      applyPortal: (key, state) => this.applyPortal(key, state),
      portalState: (key) => this.portalState(key),
      spawnedProps: () =>
        [...this.spawned].flatMap((entry) => {
          const id = this.idOf(entry);
          const kind = id ? this.kinds.get(id) : undefined;
          return id && kind ? [{ id, kind }] : [];
        }),
      resetRemote: () => this.resetShared(),
      paintRemote: (id, color, material) => {
        const entry = this.bodies.get(id);
        if (entry) this.styleProp(entry, { color, material }, false);
      },
      popRemote: (id) => {
        const entry = this.bodies.get(id);
        if (entry) this.popCork(entry, null, false);
      },
      onHands: (peerId, left, right) => this.remoteHands.set(peerId, { left, right }),
    });
  }

  private portalOf(key: PortalKey): Portal {
    return key === 'a' ? this.portalBlue : this.portalRed;
  }

  private portalState(key: PortalKey): PortalState | null {
    const portal = this.portalOf(key);
    if (!portal.placed) return null;
    const p = portal.position;
    const q = portal.quaternion;
    return {
      pose: [p.x, p.y, p.z, q.x, q.y, q.z, q.w],
      group: portal.surfaceGroup,
    };
  }

  private applyPortal(key: PortalKey, state: PortalState | null): void {
    const portal = this.portalOf(key);
    if (!state) {
      portal.reset();
      return;
    }
    const pose = state.pose;
    portal.setPose(
      _point.set(pose[0], pose[1], pose[2]),
      _quaternion.set(pose[3], pose[4], pose[5], pose[6]),
      state.group,
    );
  }

  // --- the other players in the room --------------------------------------

  /**
   * Gives every other player a body the simulation can feel and a portal gun
   * you can watch them aim with. Their pose comes from the shared avatars, so
   * hands and props line up with what the network already draws.
   */
  private updateRemotePlayers(ctx: WorldContext): void {
    const physics = this.physics;
    if (!physics) return;

    for (const [id, player] of [...this.remotePlayers]) {
      const peer = ctx.net.peers.get(id);
      if (!peer || peer.world !== ctx.net.world) this.dropRemotePlayer(ctx, id, player);
    }
    for (const id of [...this.remoteHands.keys()]) {
      if (!ctx.net.peers.has(id)) this.remoteHands.delete(id);
    }

    const busy = new Set<PhysicsBody>();

    for (const peer of ctx.net.peers.values()) {
      if (peer.world !== ctx.net.world) continue;
      // Someone who is watching another player is a camera, not a body.
      if (peer.pose?.hidden) {
        const player = this.remotePlayers.get(peer.id);
        if (player) this.dropRemotePlayer(ctx, peer.id, player);
        continue;
      }
      if (!ctx.avatars.getHeadPose(peer.id, _head)) continue;

      const player = this.remotePlayers.get(peer.id) ?? this.createRemotePlayer(peer.id);
      const height = Math.max(_head.y, 0.9);
      // The capsule stand-in is a box under the head — close enough to shove a
      // domino over, and nothing here is precise about shoulders anyway.
      player.capsule.body.setNextKinematicTranslation({
        x: _head.x,
        y: Math.max(height / 2, 0.2),
        z: _head.z,
      });

      const hands = this.remoteHands.get(peer.id);
      for (const [index, side] of (['left', 'right'] as const).entries()) {
        const tracked = ctx.avatars.getHandPose(peer.id, side, _hand);
        player.hands[index]!.body.setNextKinematicTranslation(
          tracked ? { x: _hand.x, y: _hand.y, z: _hand.z } : { x: 0, y: -60, z: 0 },
        );
        this.updateRemoteTool(ctx, peer.id, side, tracked ? (hands?.[side] ?? null) : null);
      }

      for (const state of [hands?.left, hands?.right]) {
        if (!state || !('grab' in state)) continue;
        const entry = this.bodies.get(state.grab);
        if (entry) busy.add(entry);
      }
    }

    // Highlighting is done in one place; this only records what to add.
    this.remoteBusy = busy;
  }

  private createRemotePlayer(id: string): RemotePlayer {
    const physics = this.physics!;
    const torso = new THREE.Object3D();
    torso.position.set(0, -60, 0);
    this.root.add(torso);
    const capsule = physics.addKinematic(torso, {
      halfExtents: new THREE.Vector3(0.22, 0.8, 0.22),
      membership: GROUP_PLAYER,
      // Their body shoves props around but never the other players — two
      // people standing in the same spot is far less annoying than being
      // pushed by somebody you cannot see coming.
      filter: ALL_GROUPS & ~GROUP_PLAYER,
    });

    const handObjects: THREE.Object3D[] = [];
    const hands: PhysicsBody[] = [];
    for (let i = 0; i < 2; i++) {
      const object = new THREE.Object3D();
      object.position.set(0, -60, 0);
      this.root.add(object);
      handObjects.push(object);
      hands.push(
        physics.addKinematic(object, {
          halfExtents: new THREE.Vector3(0.05, 0.05, 0.05),
          membership: GROUP_HAND,
          filter: GROUP_PROP | GROUP_NPC,
        }),
      );
    }

    const player: RemotePlayer = {
      torso,
      capsule,
      hands: [hands[0]!, hands[1]!],
      handObjects: [handObjects[0]!, handObjects[1]!],
    };
    this.remotePlayers.set(id, player);
    return player;
  }

  private dropRemotePlayer(ctx: WorldContext, id: string, player: RemotePlayer): void {
    this.physics?.remove(player.capsule);
    for (const hand of player.hands) this.physics?.remove(hand);
    player.torso.removeFromParent();
    for (const object of player.handObjects) object.removeFromParent();
    this.remotePlayers.delete(id);
    for (const side of ['left', 'right'] as const) {
      // Untrack before the avatar is torn down, so the ghost hands the real
      // materials back while they still exist.
      this.ghosts?.untrack(peerHandKey(id, side));
      this.updateRemoteTool(ctx, id, side, null);
    }
  }

  private clearRemotePlayers(ctx: WorldContext): void {
    for (const [id, player] of [...this.remotePlayers]) this.dropRemotePlayer(ctx, id, player);
    this.remoteHands.clear();
    for (const tool of this.remoteTools.values()) tool.disposeTool();
    this.remoteTools.clear();
    this.remoteBusy = new Set();
  }

  /**
   * Shows (or hides) whatever tool another player is carrying. It is built
   * from the same factory the local shelf uses, so everybody sees the same
   * thing in their hand.
   */
  private updateRemoteTool(
    ctx: WorldContext,
    peerId: string,
    side: Handedness,
    state: HandBusy,
  ): void {
    const key = `${peerId}:${side}`;
    const wanted = state && 'tool' in state ? state.tool : null;
    const existing = this.remoteTools.get(key);

    if (!wanted) {
      if (!existing) return;
      ctx.avatars.setAttachment(peerId, side, null);
      existing.disposeTool();
      this.remoteTools.delete(key);
      return;
    }
    if (existing?.toolId === wanted) return;

    if (existing) {
      ctx.avatars.setAttachment(peerId, side, null);
      existing.disposeTool();
    }
    const tool = createTool(wanted);
    if (!tool) return;
    // In der Hand, die es drüben hält: Ort und Neigung dieser Seite
    // (`Tool.holdIn`), und die Gestalt dazu (`showHeldBy`). Ohne beides läge
    // das Werkzeug am fremden Avatar in der linken Hand so wie in der rechten.
    tool.showHeldBy(side);
    tool.holdIn(side, tool.position, tool.quaternion);
    this.remoteTools.set(key, tool);
    ctx.avatars.setAttachment(peerId, side, tool);
  }

  /** Tells the others what the local hands are up to. */
  private reportHands(): void {
    this.sync?.setHands(this.handBusy('left'), this.handBusy('right'));
  }

  private handBusy(hand: Handedness): HandBusy {
    const tool = this.held.get(hand);
    if (tool) return { tool: tool.toolId };
    const grab = this.grabs.get(hand);
    const id = grab ? this.idOf(grab.entry) : null;
    return id ? { grab: id } : null;
  }

  // --- surface helpers ----------------------------------------------------

  private castSurface(
    ray: THREE.Ray,
    maxDistance = 60,
    objects: readonly THREE.Object3D[] = this.surfaces,
  ): typeof _hit | null {
    this.raycaster.set(ray.origin, ray.direction);
    this.raycaster.far = maxDistance;
    const hit = this.raycaster.intersectObjects(objects as THREE.Object3D[], false)[0];
    if (!hit || !hit.face) return null;

    _normalMatrix.getNormalMatrix(hit.object.matrixWorld);
    _hitNormal.copy(hit.face.normal).applyMatrix3(_normalMatrix).normalize();
    if (_hitNormal.dot(ray.direction) > 0) _hitNormal.negate();
    _hitPoint.copy(hit.point);
    _hit.object = hit.object;
    return _hit;
  }

  /** Does the whole ellipse sit on the same flat surface? */
  private fits(
    point: THREE.Vector3,
    normal: THREE.Vector3,
    up: THREE.Vector3,
    object: THREE.Object3D,
  ): boolean {
    _right.crossVectors(up, normal).normalize();
    _up.crossVectors(normal, _right).normalize();

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      _probe
        .copy(point)
        .addScaledVector(_right, Math.cos(angle) * PORTAL_HALF_WIDTH * 0.98)
        .addScaledVector(_up, Math.sin(angle) * PORTAL_HALF_HEIGHT * 0.98)
        .addScaledVector(normal, 0.25);
      _direction.copy(normal).negate();

      this.raycaster.set(_probe, _direction);
      this.raycaster.far = 0.5;
      const hit = this.raycaster.intersectObject(object, false)[0];
      if (!hit || Math.abs(hit.distance - 0.25) > 0.02) return false;
    }
    return true;
  }
}

/**
 * Reference "up" for a portal on this surface. On walls that is the world up,
 * on floors and ceilings the direction the gun points — so the opening lines up
 * with how you aimed at it.
 */
function surfaceUp(
  direction: THREE.Vector3,
  normal: THREE.Vector3,
  target: THREE.Vector3,
): THREE.Vector3 {
  if (Math.abs(normal.y) <= 0.9) return target.copy(UP);
  target.copy(direction);
  target.y = 0;
  if (target.lengthSq() < 1e-6) target.set(0, 0, -1);
  return target.normalize();
}

/** Aligns an object's +Z with a surface normal, using `up` as the roll reference. */
function orientToSurface(object: THREE.Object3D, normal: THREE.Vector3, up: THREE.Vector3): void {
  _right.crossVectors(up, normal).normalize();
  _up.crossVectors(normal, _right).normalize();
  _matrix.makeBasis(_right, _up, normal);
  object.quaternion.setFromRotationMatrix(_matrix);
}

/** A body's transform, flattened the way the network wants it. */
function poseOf(entry: PhysicsBody): Pose7 {
  const t = entry.body.translation();
  const r = entry.body.rotation();
  return [t.x, t.y, t.z, r.x, r.y, r.z, r.w];
}

/**
 * Eine Kopie eines Props, die niemandem gehört: eigene Geometrien und eigene
 * Materialien. `Object3D.clone()` teilt beides mit dem Original — und dann
 * färbt der Pinsel zwei Würfel auf einmal, und das Wegradieren des einen gibt
 * die Geometrie des anderen frei.
 */
function cloneVisual(source: THREE.Object3D): THREE.Object3D {
  const clone = source.clone(true);
  // Der schwarze Saum aus dem Comic-Modus gehört nicht zum Ding, sondern ist
  // ein zweites Bild davon (`core/outlineShell.ts`): Geklont teilte er sein
  // Material mit dem Original und verlöre dabei sein leeres `raycast` — die
  // Kopie hätte also einen Saum, nach dem man greifen kann. Der Durchlauf über
  // die Szene hängt ihr gleich ihren eigenen an.
  stripOutlines(clone);
  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry = mesh.geometry.clone();
    const material = mesh.material as THREE.Material | THREE.Material[];
    mesh.material = Array.isArray(material)
      ? material.map((entry) => entry.clone())
      : material.clone();
  });
  clone.userData = { ...source.userData };
  return clone;
}

/** Ein lesbarer Name für ein Objekt, aus dem, was es über sich weiß. */
function labelOfProp(object: THREE.Object3D): string {
  const kind = (object.userData as { propKind?: PropKind }).propKind;
  if (kind) return propLabel(kind);
  const name = object.name.replace(/^prop-/, '').replace(/-\d+$/, '');
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Objekt';
}

/** A world point written down in a body's own frame — where a joint sits. */
function localPoint(
  entry: PhysicsBody,
  world: THREE.Vector3,
  target: THREE.Vector3,
): THREE.Vector3 {
  const t = entry.body.translation();
  const r = entry.body.rotation();
  return target
    .copy(world)
    .sub(_localOrigin.set(t.x, t.y, t.z))
    .applyQuaternion(_localRotation.set(r.x, r.y, r.z, r.w).invert());
}

/** Ghost key for another player's hand. */
function peerHandKey(peerId: string, side: Handedness): string {
  return `peer:${peerId}:${side}`;
}

/** Stable ghost key for a prop — props come and go through the magic bag. */
/**
 * Half the size of a tool, for the collider it gets while it lies around.
 *
 * Measured in the tool's **own** frame and around its **own origin**. Both
 * matter: a world-space box of a tool lying at an angle is far bigger than the
 * tool, and a collider is centred on the body's origin, which for a pistol is
 * the grip and not the middle — so the half extents have to reach from the
 * origin to the furthest corner rather than being half of the size.
 *
 * Only what is actually drawn counts: a tool with a closed settings panel
 * folded inside it would otherwise get a collider the size of the panel and
 * hover half a metre above the floor.
 */
function toolHalfExtents(tool: Tool, target: THREE.Vector3): THREE.Vector3 {
  _toolBox.makeEmpty();
  tool.updateWorldMatrix(true, true);
  _toolInverse.copy(tool.matrixWorld).invert();
  tool.traverseVisible((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const bounds = mesh.geometry.boundingBox;
    if (!bounds) return;
    _toolLocal
      .copy(bounds)
      .applyMatrix4(_toolMatrix.multiplyMatrices(_toolInverse, mesh.matrixWorld));
    _toolBox.union(_toolLocal);
  });
  if (_toolBox.isEmpty()) return target.set(0.05, 0.05, 0.05);
  const reach = (min: number, max: number): number => Math.max(Math.abs(min), Math.abs(max), 0.02);
  return target.set(
    reach(_toolBox.min.x, _toolBox.max.x),
    reach(_toolBox.min.y, _toolBox.max.y),
    reach(_toolBox.min.z, _toolBox.max.z),
  );
}

function propKey(entry: PhysicsBody): string {
  return `prop:${entry.object.uuid}`;
}

/** Derselbe Gedanke für einen, der herumläuft: seine Gruppe ist sein Name. */
function npcKey(npc: Npc): string {
  return `npc:${npc.holder.uuid}`;
}

/** Highlight for props within reach, or `null` to put the original glow back. */
function setEmissive(entry: PhysicsBody, color: number | null): void {
  const mesh = entry.object as THREE.Mesh;
  const material = mesh.material as THREE.MeshStandardMaterial | undefined;
  if (!material?.emissive) return;
  const store = entry.object.userData as { baseEmissive?: THREE.Color };
  if (color !== null) {
    store.baseEmissive ??= material.emissive.clone();
    material.emissive.setHex(color).multiplyScalar(0.55);
  } else if (store.baseEmissive) {
    material.emissive.copy(store.baseEmissive);
  }
}

/** Live view of a prop as something the aim can pick, without allocating. */
interface PropAim extends AimTarget {
  entry: PhysicsBody;
}

const _aimTargets: PropAim[] = [];
const _aimCache = new WeakMap<PhysicsBody, PropAim>();

/**
 * The aim view of a prop, refreshed from the simulation. One object per body,
 * reused every frame: this runs over every prop for both hands.
 */
function aimTargetOf(entry: PhysicsBody): PropAim {
  let target = _aimCache.get(entry);
  if (!target) {
    target = {
      entry,
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      halfExtents: { x: 0, y: 0, z: 0 },
    };
    _aimCache.set(entry, target);
  }
  const t = entry.body.translation();
  const r = entry.body.rotation();
  target.position.x = t.x;
  target.position.y = t.y;
  target.position.z = t.z;
  target.quaternion.x = r.x;
  target.quaternion.y = r.y;
  target.quaternion.z = r.z;
  target.quaternion.w = r.w;
  target.halfExtents.x = entry.halfExtents.x;
  target.halfExtents.y = entry.halfExtents.y;
  target.halfExtents.z = entry.halfExtents.z;
  return target;
}

/**
 * **Wie groß etwas ist**, als halbe Ausdehnung — waagerecht und senkrecht.
 *
 * Genau das, was `core/screenCarry.ts` braucht, und nicht mehr: Wie weit vor
 * der Figur ein Ding hängt, hängt an seiner Breite, und wie hoch, an seiner
 * Höhe. Gemessen wird am fertigen Netz und nicht an der Datei — im Regal
 * steht der Maßstab des Pakets schon darauf (`core/kaykitFit.kaykitScale`).
 */
function spanOf(object: THREE.Object3D): CarrySpan {
  object.updateWorldMatrix(true, true);
  _spanBox.setFromObject(object);
  if (_spanBox.isEmpty()) return { radius: 0.2, half: 0.2 };
  _spanBox.getSize(_spanSize);
  return { radius: Math.max(_spanSize.x, _spanSize.z) / 2, half: _spanSize.y / 2 };
}

/** Welche der beiden flachen Ansichten gerade läuft (`core/screenCarry.ts`). */
function screenCarryView(ctx: WorldContext): ScreenCarryView {
  if (ctx.crane) return 'crane';
  return ctx.topDown ? 'topDown' : 'firstPerson';
}

/** „gemessen: rechts" — oder nichts, wenn niemand es aufgeschrieben hat. */
function measuredNote(hand: Handedness | null): string {
  const built = 'Zurück auf die gebaute Pose';
  if (!hand) return built;
  return `${built} · gemessen: ${hand === 'left' ? 'links' : 'rechts'}`;
}

/**
 * **Die Attrappe des Spielers** in einer laufenden Vorschau: ein Ring auf dem
 * Boden, ein kurzer Stab darin.
 *
 * Kein Körper und keine Puppe, mit Absicht. Sie ist kein Mitspieler, sondern
 * eine **Stelle** — die, auf die die Hirne zulaufen. Ein Ring liest sich von
 * oben als Markierung; eine Figur läse sich als jemand, der gleich etwas tut.
 * Der Stab ist dafür da, dass man sie auch von der Seite sieht, wenn die
 * Ansicht flach steht.
 */
function createGhostTarget(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'preview-target';
  const color = 0x39d0ff;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.05, 10, 28),
    new THREE.MeshBasicMaterial({ color, toneMapped: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.7, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, toneMapped: false }),
  );
  post.position.y = 0.85;
  group.add(post);
  return group;
}
