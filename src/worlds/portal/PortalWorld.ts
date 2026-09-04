import * as THREE from 'three';
import type { World, WorldContext } from '../../core/types';
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
import { PortalGhosts } from './PortalGhosts';
import { ToolBelt } from './ToolBelt';
import {
  AMMO_KINDS,
  AMMO_LABELS,
  COLOR_BLUE,
  COLOR_RED,
  DroneTool,
  PistolTool,
  SPIN_RATE,
  THROW_SPEED,
  PortalGunTool,
  SIGHTS,
  TOOL_IDS,
  Tool,
  WEAPON_FIELDS,
  applyGearConfig,
  applyStoredPose,
  clearGearConfig,
  clearPoses,
  createTool,
  gearCode,
  parseGearCode,
  storedPoseCount,
  type BulletOptions,
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
  IDLE_HAND_POSE,
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
  createCompanionCube,
  createDominoes,
  createPropShape,
  DOMINO_SIZE,
  type PropKind,
} from './props';
import {
  REMOTE_RANGE,
  flightArrived,
  flightDuration,
  flightPosition,
  handsTooClose,
  pickAimTarget,
  reachDepth,
  type AimTarget,
} from './remoteGrab';
import { TextPlane } from '../../ui/TextPlane';
import { playPick } from '../../core/Audio';
import { createLighting, disposeTree } from '../shared/environment';
import {
  ALL_GROUPS,
  GROUP_HAND,
  GROUP_PLAYER,
  GROUP_PROP,
  GROUP_WORLD,
  PhysicsWorld,
  portalSurfaceGroup,
  type PhysicsBody,
} from '../../physics/PhysicsWorld';
import { PhysicsLocomotion } from '../../physics/PhysicsLocomotion';
import { FreeLocomotion } from '../../core/Locomotion';

const ROOM = { half: 8, height: 4.6, thickness: 0.4 };
const SPAWN = new THREE.Vector3(0, 0, 5.5);
const UP = new THREE.Vector3(0, 1, 0);
const FUNNEL_DEPTH = 1.1;
/** The portal surface stays at least this far in front of the eye. */
const NEAR_PAD = 0.12;
/** Tilt the hand up/back by this much while holding grab and the prop comes. */
const REMOTE_PULL_ANGLE = THREE.MathUtils.degToRad(30);
/** Segments of the rope between hand and locked prop. */
const ROPE_POINTS = 18;
const ROPE_IDLE = 0x9fe3ff;
const HIGHLIGHT_REACH = 0x6fb6ff;
const HIGHLIGHT_LOCKED = 0xffb35c;
const HIGHLIGHT_PICKED = 0x5ee0a0;
const _ropeTaut = new THREE.Color(0xffb35c);
const _zeroVelocity = new THREE.Vector3();
const _spin = new THREE.Vector3();
const _handSpeed = new THREE.Vector3();
const _toolBox = new THREE.Box3();
const _toolLocal = new THREE.Box3();
const _toolMatrix = new THREE.Matrix4();
const _toolInverse = new THREE.Matrix4();
/** How far ahead of a gliding tool the sweep looks, on top of its step. */
const STICK_MARGIN = 0.06;
/** Bullets are cleaned up again after this long. */
const BULLET_LIFETIME = 4;
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
const _head = new THREE.Vector3();
const _cross = new THREE.Vector3();
const _point = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _rotationMatrix = new THREE.Matrix4();
const _rotation = new THREE.Quaternion();
const _normalMatrix = new THREE.Matrix3();
const _ray = new THREE.Ray();
const _aimRay = new THREE.Ray();
const _quaternion = new THREE.Quaternion();
const _hitPoint = new THREE.Vector3();
const _hitNormal = new THREE.Vector3();
const _hit = { point: _hitPoint, normal: _hitNormal, object: null as unknown as THREE.Object3D };
const _aim = new THREE.Vector3();
const _far = new THREE.Vector3();
const _funnelNormal = new THREE.Vector3();
const _carryA = new THREE.Vector3();
const _carryB = new THREE.Vector3();
const _carried: THREE.Vector3[] = [];
const _otherHand = new THREE.Vector3();
const _thisHand = new THREE.Vector3();
const _localOrigin = new THREE.Vector3();
const _rotationB = new THREE.Quaternion();
const _localRotation = new THREE.Quaternion();

/** What the magic bag offers, in the order the grid shows it. */
const BAG_ITEMS: Array<[PropKind, string, MenuIcon]> = [
  ['cube', 'Cube', 'cube'],
  ['sphere', 'Kugel', 'sphere'],
  ['domino', 'Domino', 'domino'],
  ['pyramid', 'Pyramide', 'pyramid'],
  ['block', 'Quader', 'gizmo'],
  ['plank', 'Planke', 'plank'],
  ['cylinder', 'Zylinder', 'cylinder'],
];

/** The node a hand's belongings hang on. */
function gripOf(controller: ControllerState): THREE.Object3D {
  return controller.grip.visible ? controller.grip : controller.targetRay;
}

interface HandProbe {
  object: THREE.Object3D;
  entry: PhysicsBody;
}

/** A prop a hand has locked onto from a distance. */
interface RemoteLink {
  entry: PhysicsBody;
  /** Hand pitch at the moment the grab button went down. */
  pitch: number;
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
  /** Tracer rounds drag a streak behind them; plain ones do not. */
  trail: Trail | null;
  /** Where it was last frame — the segment a hit is looked for along. */
  from: THREE.Vector3;
  /** Already counted somewhere. A round only ever hits once. */
  spent: boolean;
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
   * Still on its way: a gliding tool (the shuriken) keeps its speed and
   * ignores gravity until it meets something, and then it stays there.
   */
  gliding: boolean;
}

/** Where a hand was last frame and how fast it is going, in m/s. */
interface HandMotion {
  last: THREE.Vector3;
  velocity: THREE.Vector3;
  known: boolean;
}

interface HandGrab {
  entry: PhysicsBody;
  /** Pose of the prop relative to the hand at pick-up time. */
  offset: THREE.Matrix4;
  lastPosition: THREE.Vector3;
  velocity: THREE.Vector3;
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
  private readonly rings = new Map<PortalKey, THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>>();
  private readonly bullets: Bullet[] = [];
  /** Keyed by hand, plus a `:far` probe for the half that is through a portal. */
  private readonly probes = new Map<string, HandProbe>();
  private readonly grabs = new Map<Handedness, HandGrab>();
  private readonly spawned = new Set<PhysicsBody>();
  private readonly flights = new Map<PhysicsBody, Flight>();
  private readonly links = new Map<Handedness, RemoteLink>();
  private readonly ropes = new Map<Handedness, THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>>();
  protected readonly surfaceGroups = new Map<THREE.Object3D, number>();
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
  /** Setting: lock onto a distant object and reel it in. */
  private remoteGrab = true;
  /** Setting: draw the line to the object. Off by default — it is in the way. */
  private remoteRope = false;
  /** Props the transform tool has picked out. */
  private selected: readonly PhysicsBody[] = [];
  /** 1 = normal, less while the stopwatch is wound down. */
  private timeScale = 1;
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
  private reopenBag = false;
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
  /** How fast each hand is moving, for throwing whatever it lets go of. */
  private readonly handMotion = new Map<Handedness, HandMotion>();
  private belt: ToolBelt | null = null;
  private host: ToolHost | null = null;
  protected physics: PhysicsWorld | null = null;
  private sync: PortalSync | null = null;
  private locomotion: PhysicsLocomotion | null = null;
  protected context: WorldContext | null = null;
  private portalRenderer: PortalRenderer | null = null;
  private ghosts: PortalGhosts | null = null;
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

    this.physics = await PhysicsWorld.create();
    this.buildEnvironment();
    this.sync = this.createSync(ctx);

    this.portalBlue.link = this.portalRed;
    this.portalRed.link = this.portalBlue;
    this.root.add(this.portalBlue, this.portalRed);

    this.portalRenderer = new PortalRenderer(ctx.renderer);
    this.ghosts = new PortalGhosts(this.root);
    // The cut halves of hands and props are done with material clipping planes.
    this.clippingWasEnabled = ctx.renderer.localClippingEnabled;
    ctx.renderer.localClippingEnabled = true;

    ctx.rig.placeAt(this.spawnPoint(), this.spawnYaw());
    this.locomotion = new PhysicsLocomotion(this.physics, ctx.rig);
    ctx.rig.setLocomotion(this.locomotion);
    this.hasPreviousHead = false;

    this.host = this.buildHost(ctx);
    this.keys = new KeyPanel();
    this.root.add(this.keys);
    ctx.pointer.add(this.keys.asPointerTarget());
    this.setupTools(ctx);
    this.bindFlatInput(ctx);

    ctx.notify(this.welcome());
  }

  update(dt: number, ctx: WorldContext): void {
    this.context = ctx;
    if (!this.physics || !this.locomotion) return;

    this.time += dt;
    this.portalBlue.setTime(this.time);
    this.portalRed.setTime(this.time);

    this.updateTools(dt, ctx);
    this.updateGrabs(dt, ctx);
    this.updateGhosts(ctx);
    this.updateHandProbes(ctx);
    this.handleReset(ctx);

    this.locomotion.phaseMask = this.playerFunnelMask();

    this.updateRemotePlayers(ctx);
    this.reportHands();
    this.sync?.update(dt);

    this.updatePropPhasing();
    this.updateBullets(dt);
    // The stopwatch slows the simulation, not the frame rate: everything the
    // player does with their hands stays as responsive as ever.
    this.physics.step(dt * this.timeScale);
    this.physics.sync();
    this.traverseProps();
    this.traversePlayer(ctx);
    this.updatePortalDepth(ctx);
    this.updateAim(ctx);
    this.applyViewOverride(ctx);
  }

  menu(): MenuEntry[] {
    const ctx = () => this.context!;
    // The tree is built once per world; the label refreshers belong to it.
    this.menuLabels.length = 0;
    const toggle = (entry: MenuEntry, value: boolean, message: string): void => {
      entry.checked = value;
      this.context?.notify(message);
    };

    const remoteOn: MenuEntry = {
      id: 'setting:remote-on',
      label: 'Ferngreifen',
      sub: 'Zielen, greifen, Hand nach oben kippen',
      icon: 'settings',
      accent: 0x4aa8ff,
      checked: this.remoteGrab,
      run: () => {
        this.remoteGrab = !this.remoteGrab;
        if (!this.remoteGrab) this.clearLinks();
        toggle(remoteOn, this.remoteGrab, this.remoteGrab ? 'Ferngreifen an' : 'Ferngreifen aus');
      },
    };
    const remoteLine: MenuEntry = {
      id: 'setting:remote-line',
      label: 'Linie anzeigen',
      sub: 'Seil zwischen Hand und Objekt',
      icon: 'settings',
      accent: 0x4aa8ff,
      checked: this.remoteRope,
      run: () => {
        this.remoteRope = !this.remoteRope;
        if (!this.remoteRope) for (const hand of this.ropes.keys()) this.hideRope(hand);
        toggle(remoteLine, this.remoteRope, this.remoteRope ? 'Linie an' : 'Linie aus');
      },
    };

    return [
      {
        id: 'tools',
        label: 'Werkzeuge',
        sub: 'Ausrüstung in die Hand',
        icon: 'tools',
        accent: 0x9d7bff,
        // Taken with the grab button, never with the trigger: the trigger is
        // what aims at the panel in the first place.
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
      {
        id: 'settings',
        label: 'Einstellungen',
        sub: 'Was darf die Hand?',
        icon: 'settings',
        accent: 0x4aa8ff,
        children: [
          {
            id: 'setting:remote',
            label: 'Ferngreifen',
            sub: this.remoteGrab ? 'An' : 'Aus',
            icon: 'settings',
            accent: 0x4aa8ff,
            children: [remoteOn, remoteLine],
          },
          this.weaponMenu(),
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
              for (const tool of this.tools.values()) tool.resetHold();
              this.context?.notify(
                count ? `${count} Pose(n) zurückgesetzt` : 'Keine gespeicherten Posen',
              );
            },
          },
        ],
      },
      {
        id: 'reset',
        label: 'Labor zurücksetzen',
        sub: 'Portale, Würfel und Dominos',
        icon: 'reset',
        accent: COLOR_RED,
        run: () => this.resetWorld(ctx()),
      },
    ];
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
              this.context?.notify(
                `${field.label}: ${applied[field.key]} ${field.unit}`.trim(),
              );
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
            this.context?.notify(count ? `${count} Hand-Pose(n) zurückgesetzt` : 'Nichts gespeichert');
          },
        },
      ],
    };
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
        {
          id: `setting:hand-${hand}-tools`,
          label: 'Griff am Werkzeug',
          sub: 'Für jedes Werkzeug eigen',
          icon: 'tools',
          accent: 0x9fe3ff,
          children: [
            // A prop is held with a hand pose of its own, so it belongs in
            // the same list — it is only not a tool.
            this.handPoseMenu(hand, GRAB_POSE_ID),
            ...TOOL_IDS.map((id) => this.handPoseMenu(hand, id)),
          ],
        },
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
          save(clonePose(toolId ? HOLD_HAND_POSE : IDLE_HAND_POSE));
          this.refreshMenuLabels();
          this.context?.notify(`${title}: zurückgesetzt`);
        },
      },
    );

    return {
      id: `setting:hand-${hand}-${toolId ?? 'idle'}`,
      label: toolId ? title : 'Grundhaltung',
      sub: toolId === GRAB_POSE_ID
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
      count ? `${count} Haltung(en) auf ${to === 'left' ? 'links' : 'rechts'} gespiegelt` : 'Nichts zu spiegeln',
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
              hint: 'Beginnt mit BGVR1',
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

  /** Puts whatever is stored onto the tools that are already built. */
  private applyStoredConfig(): void {
    for (const tool of this.tools.values()) {
      tool.resetHold();
      applyStoredPose(tool);
      if (tool instanceof PistolTool) tool.reloadSettings();
    }
    this.context?.hands.refreshPoses();
    this.refreshMenuLabels();
  }

  // --- typing numbers and codes --------------------------------------------

  /** Rewrites every label that shows a value, then redraws the panel. */
  private refreshMenuLabels(): void {
    for (const refresh of this.menuLabels) refresh();
    this.context?.menu.refresh();
  }

  private askNumber(options: {
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

  private askText(options: {
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

  /** One row of the tool shelf. Building the row builds the tool. */
  private toolEntry(id: string): MenuEntry {
    const preview = this.tool(id);
    return {
      id: `tool:${id}`,
      label: preview?.label ?? id,
      sub: preview?.hint,
      icon: preview?.icon ?? 'tools',
      accent: preview?.accent ?? 0x9d7bff,
      run: (hand) => this.equipTool(this.context!, hand, id),
    };
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

    this.sync?.dispose();
    this.sync = null;
    this.clearRemotePlayers(ctx);

    if (this.keys) {
      ctx.pointer.remove(this.keys);
      this.keys.dispose();
      this.keys = null;
    }
    this.menuLabels.length = 0;
    ctx.hands.setHeldTool('left', null);
    ctx.hands.setHeldTool('right', null);

    for (const loose of [...this.loose.values()]) this.retireLoose(loose);
    this.loose.clear();
    for (const tool of this.liveTools) {
      if (tool instanceof DroneTool) tool.forgetPointer(ctx.pointer);
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

    // Ghosts hand the originals their real materials back, so they go first.
    this.ghosts?.dispose();
    this.ghosts = null;
    ctx.renderer.localClippingEnabled = this.clippingWasEnabled;

    this.portalRenderer?.dispose();
    this.portalRenderer = null;
    this.portalBlue.dispose();
    this.portalRed.dispose();
    this.probes.clear();
    this.props.length = 0;
    this.spawns.clear();
    this.surfaces.length = 0;
    this.solids.length = 0;
    this.surfaceGroups.clear();

    this.flights.clear();
    this.bodies.clear();
    this.ids.clear();
    this.kinds.clear();
    disposeTree(this.root);
    ctx.scene.background = null;
    this.physics?.dispose();
    this.physics = null;
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

    this.slab(chamber, panel, [half * 2, ROOM.height, t], [0, ROOM.height / 2, -half - t / 2], true);
    this.slab(chamber, panel, [t, ROOM.height, half * 2], [half + t / 2, ROOM.height / 2, 0], true);
    this.slab(chamber, panel, [t, ROOM.height, half * 2], [-half - t / 2, ROOM.height / 2, 0], true);
    // The wall behind the spawn is shielded: no portals stick to it.
    this.slab(chamber, shielded, [half * 2, ROOM.height, t], [0, ROOM.height / 2, half + t / 2], false);

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

  /** Adds a box that is both visible and solid. */
  protected slab(
    parent: THREE.Object3D,
    material: THREE.Material,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    portalable: boolean,
    physics = true,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.name = portalable ? 'surface:panel' : 'surface:shielded';
    parent.add(mesh);
    mesh.updateWorldMatrix(true, false);

    // Solid for everything that points at the room; whether a portal sticks to
    // it is a separate question.
    this.solids.push(mesh);

    // Every portal surface gets a bit of its own, so a portal on the wall does
    // not also open up the floor you are standing on.
    let group = GROUP_WORLD;
    if (portalable) {
      group = portalSurfaceGroup(this.surfaceGroups.size);
      this.surfaceGroups.set(mesh, group);
      this.surfaces.push(mesh);
    }
    if (physics) {
      this.physics!.addStatic(mesh, { membership: group, filter: ALL_GROUPS });
    }
    return mesh;
  }

  protected buildProps(): void {
    const physics = this.physics!;

    const cube = createCompanionCube(0.5);
    cube.position.set(-5.4, 1.9, -5.4);
    this.root.add(cube);
    this.registerProp(physics.addDynamic(cube, { mass: 8, friction: 0.8, restitution: 0.1 }), 'cube-0');

    const second = createCompanionCube(0.4);
    second.position.set(1.8, 0.3, 2.2);
    this.root.add(second);
    this.registerProp(
      physics.addDynamic(second, { mass: 5, friction: 0.8, restitution: 0.1 }),
      'cube-1',
    );

    // Twice the size means twice the spacing, or they stand on each other.
    const dominoes = createDominoes(14, COLOR_BLUE);
    dominoes.forEach((domino, index) => {
      domino.position.set(-4.2 + index * 0.62, DOMINO_SIZE.y / 2 + 0.001, 1.6);
      this.root.add(domino);
      this.registerProp(
        physics.addDynamic(domino, {
          mass: 2,
          friction: 0.6,
          restitution: 0.02,
          angularDamping: 0.25,
          ccd: true,
        }),
        `domino-${index}`,
      );
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
      const tool = this.tool(id);
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

  /** A tool, built on first use. */
  private tool(id: string): Tool | null {
    const existing = this.tools.get(id);
    if (existing) return existing;
    const built = createTool(id);
    if (!built) return null;
    this.tools.set(id, built);
    this.liveTools.add(built);
    return built;
  }

  /**
   * Taking tools out of the belt, putting them back, and handing the buttons
   * of the holding hand to whatever it carries.
   */
  private updateTools(dt: number, ctx: WorldContext): void {
    const belt = this.belt;
    const host = this.host;
    if (!belt || !host) return;

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

    // Every tool there is: on a hip, in a hand, or lying on the floor. A
    // stowed or loose one gets its frame too — `applyHold` steps aside for
    // both, because the belt and the physics own where those are.
    for (const tool of [...this.liveTools]) {
      const controller = tool.heldBy ? ctx.input.get(tool.heldBy) : null;
      // Every held tool is turned out of the grip and onto the pointing ray
      // before it runs — one place, so no tool can aim 30° high again.
      tool.applyHold(controller);
      tool.update(dt, host, controller);
    }
    this.updateLooseTools(dt);
  }

  /** True while a tool in the *other* hand has taken hold of this one too. */
  private claimedHand(hand: Handedness): boolean {
    for (const tool of this.held.values()) {
      if (tool.heldBy !== hand && tool.claimsHand(hand)) return true;
    }
    return false;
  }

  private takeTool(ctx: WorldContext, controller: ControllerState, tool: Tool): void {
    const hand = controller.handedness;
    const belt = this.belt;
    const host = this.host;
    if (!hand || !belt || !host) return;

    const busy = this.held.get(hand);
    if (busy === tool) return;
    if (busy) this.stowTool(busy);

    // A hand can only carry one thing, tool or prop.
    const grab = this.grabs.get(hand);
    if (grab) this.release(ctx, hand, grab, true);
    if (tool.heldBy) this.held.delete(tool.heldBy);

    const home = belt.slotOf(tool);
    if (home) this.homes.set(tool, home.side);
    belt.release(tool);

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

    const target = side ?? this.homes.get(tool) ?? belt.freeSlot()?.side;
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
   * A **gliding** tool (the shuriken) skips the falling: it carries on along
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
    const home = this.homes.get(tool) ?? hand ?? null;
    const motion = hand ? this.handMotion.get(hand) : null;
    _velocity.copy(motion?.velocity ?? _zeroVelocity).clampLength(0, 12);
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
    this.loose.set(entry, { tool, entry, gliding });

    entry.body.setLinvel({ x: _velocity.x, y: _velocity.y, z: _velocity.z }, true);
    if (gliding) {
      // Straight on: no gravity, and a spin around the axis the star turns on.
      entry.body.setGravityScale(0, true);
      _spin.set(1, 0, 0).applyQuaternion(tool.quaternion).multiplyScalar(SPIN_RATE);
      entry.body.setAngvel({ x: _spin.x, y: _spin.y, z: _spin.z }, true);
    }
    tool.onThrow(host, speed);

    this.refillBelt(tool.toolId, home);
    this.trimLoose(tool.toolId);
    playPick(false);
    void ctx;
  }

  /** A fresh copy on the hip the old one came off, if that hip is free. */
  private refillBelt(id: string, side: Handedness | null): void {
    const belt = this.belt;
    if (!belt || !side || belt.toolAt(side)) return;
    const replacement = this.tool(id);
    if (!replacement || replacement.heldBy || this.isLoose(replacement)) return;
    belt.stow(replacement, side);
    this.homes.set(replacement, side);
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
   * That is what makes the default read the way it should: one copy allowed,
   * so pulling a fresh pistol off the hip fetches the one on the floor back.
   * A throwing star says five, so five may be lying about and flying while a
   * sixth is drawn — and the sixth throw is what takes the first one home.
   * Oldest first, in the order they were let go of.
   */
  private trimLoose(id: string): void {
    const spare: LooseTool[] = [];
    let limit = 1;
    for (const loose of this.loose.values()) {
      if (loose.tool.toolId !== id) continue;
      spare.push(loose);
      limit = loose.tool.looseLimit;
    }
    let count = spare.length;
    for (const tool of this.held.values()) {
      if (tool.toolId !== id) continue;
      count++;
      limit = tool.looseLimit;
    }
    for (let i = 0; i < count - limit && i < spare.length; i++) this.retireLoose(spare[i]!);
  }

  /** A loose tool goes away for good: out of the room, out of the physics. */
  private retireLoose(loose: LooseTool): void {
    const physics = this.physics;
    this.loose.delete(loose.entry);
    const index = this.props.indexOf(loose.entry);
    if (index >= 0) this.props.splice(index, 1);
    this.highlighted.delete(loose.entry);
    this.locked.delete(loose.entry);
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
   * doing: gliding. A shuriken keeps its speed until the line it is on meets
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
      const hit = this.castSurface(_ray, speed * dt + STICK_MARGIN, this.solids);
      if (hit) {
        // A hair *into* the wall, so it reads as stuck rather than as resting
        // against it.
        this.stickTool(loose, _point.copy(hit.point).addScaledVector(_ray.direction, 0.02));
        continue;
      }
      const reach = this.glideProp(loose, speed * dt + STICK_MARGIN);
      if (reach !== null) this.stickTool(loose, _point.addScaledVector(_ray.direction, reach));
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

  /** How fast each hand is moving — what a let-go tool is thrown with. */
  private trackHands(dt: number, ctx: WorldContext): void {
    for (const side of ['left', 'right'] as const) {
      let motion = this.handMotion.get(side);
      if (!motion) {
        motion = { last: new THREE.Vector3(), velocity: new THREE.Vector3(), known: false };
        this.handMotion.set(side, motion);
      }
      const controller = ctx.input.get(side);
      if (!controller?.tracked || dt <= 0) {
        motion.known = false;
        motion.velocity.set(0, 0, 0);
        continue;
      }
      gripOf(controller).getWorldPosition(_handSpeed);
      if (motion.known) {
        // Smoothed a little: a single frame of tracking noise is not a throw,
        // and a throw is never a single frame either.
        _probe.copy(_handSpeed).sub(motion.last).divideScalar(dt);
        motion.velocity.lerp(_probe, Math.min(1, dt * 26));
      }
      motion.last.copy(_handSpeed);
      motion.known = true;
    }
  }

  /** Puts a specific tool into a hand, used by the tool shelf. */
  private equipTool(ctx: WorldContext, hand: Handedness | null, id: string): void {
    const tool = this.tool(id);
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

  /** The gun in a hand that can place this portal, if there is one. */
  private heldGunFor(key: PortalKey): PortalGunTool | null {
    for (const tool of this.held.values()) {
      if (tool instanceof PortalGunTool && tool.keys.includes(key)) return tool;
    }
    return null;
  }

  /** Everything a tool may ask of this room. */
  private buildHost(ctx: WorldContext): ToolHost {
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
        return this.findRemoteTarget(_ray, range ?? REMOTE_RANGE);
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
        this.timeScale = THREE.MathUtils.clamp(scale, 0.05, 1);
      },
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
      setViewOverride: (position, rotation) => this.setViewOverride(position, rotation),
      heldTool: (hand) => this.held.get(hand) ?? null,
      parkTool: (tool) => this.parkTool(tool),
      unparkTool: (tool) => this.unparkTool(tool),
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
    // A heavier round is a bigger one — otherwise "brutal" looks like "leicht".
    const radius = 0.014 * Math.cbrt(mass / 0.06);
    const tracer = options.tracer === true;

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 10, 8),
      new THREE.MeshBasicMaterial({ color: tracer ? 0xff7a2f : 0xffd98a, toneMapped: false }),
    );
    mesh.name = 'bullet';
    mesh.position.copy(origin).addScaledVector(direction, 0.05);
    this.root.add(mesh);
    mesh.updateWorldMatrix(true, false);

    const entry = physics.addDynamic(mesh, {
      shape: { kind: 'ball' },
      halfExtents: new THREE.Vector3(radius, radius, radius),
      mass,
      friction: 0.4,
      restitution: 0.2,
      ccd: true,
      membership: GROUP_PROP,
      // Bullets ignore the player who fired them, otherwise the recoil is you.
      filter: ALL_GROUPS & ~GROUP_PLAYER & ~GROUP_HAND,
    });
    _velocity.copy(direction).multiplyScalar(speed);
    entry.body.setLinvel({ x: _velocity.x, y: _velocity.y, z: _velocity.z }, true);
    this.bullets.push({
      entry,
      life: BULLET_LIFETIME,
      trail: tracer ? this.newTrail() : null,
      from: mesh.position.clone(),
      spent: false,
    });
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
        if (this.bulletTravelled(bullet.from, _point)) bullet.spent = true;
      }
      bullet.from.set(t.x, t.y, t.z);
      if (bullet.life > 0 && t.y > -30) continue;
      this.bullets.splice(i, 1);
      physics.remove(bullet.entry);
      this.dropTrail(bullet.trail);
      disposeTree(bullet.entry.object);
    }
  }

  /**
   * One round's path since the last frame. The lab does not care where its
   * bullets go; the shooting range counts them, so it overrides this.
   *
   * @returns true when the round was used up by whatever it ran into
   */
  protected bulletTravelled(_from: THREE.Vector3, _to: THREE.Vector3): boolean {
    return false;
  }

  private clearBullets(): void {
    for (const bullet of this.bullets) {
      this.physics?.remove(bullet.entry);
      this.dropTrail(bullet.trail);
      disposeTree(bullet.entry.object);
    }
    this.bullets.length = 0;
  }

  // --- painting -----------------------------------------------------------

  /** Repaints a prop. `share` also tells the others about it. */
  private paintProp(entry: PhysicsBody, color: number, share: boolean): void {
    const mesh = entry.object as THREE.Mesh;
    const material = mesh.material as THREE.MeshStandardMaterial | undefined;
    if (!material?.color) return;
    // The highlight remembers the original glow, so the new colour has to go
    // into that store too — otherwise letting go puts the old one back.
    material.color.setHex(color);
    material.map = null;
    material.needsUpdate = true;
    const store = entry.object.userData as { paint?: number };
    store.paint = color;
    if (!share) return;
    const id = this.idOf(entry);
    if (id) this.sync?.painted(id, color);
  }

  /** Empty hands can pick up props, pass them over and throw them. */
  private updateGrabs(dt: number, ctx: WorldContext): void {
    const reachable = new Set<PhysicsBody>();

    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand) continue;
      const grab = this.grabs.get(hand);

      if (!controller.tracked) {
        if (grab) this.release(ctx, hand, grab, true);
        continue;
      }

      const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
      anchor.updateWorldMatrix(true, false);
      const pressed = controller.squeeze.justPressed;

      if (grab) {
        const holding = controller.squeeze.pressed;
        if (!holding) {
          this.release(ctx, hand, grab, true);
          continue;
        }
        _matrix.multiplyMatrices(anchor.matrixWorld, grab.offset);
        _matrix.decompose(_point, _quaternion, _probe);
        grab.velocity.copy(_point).sub(grab.lastPosition).divideScalar(Math.max(dt, 1 / 120));
        grab.lastPosition.copy(_point);
        grab.entry.body.setNextKinematicTranslation({ x: _point.x, y: _point.y, z: _point.z });
        grab.entry.body.setNextKinematicRotation({
          x: _quaternion.x,
          y: _quaternion.y,
          z: _quaternion.z,
          w: _quaternion.w,
        });
        continue;
      }

      if (this.held.has(hand) || this.claimedHand(hand)) continue;

      anchor.getWorldPosition(_hand);
      const entry = this.findProp(_hand);
      if (entry) reachable.add(entry);
      if (!entry || !pressed) continue;

      // Already in the other hand? Then this is a hand-over, not a pick-up.
      const other = this.handHolding(entry);
      if (other) this.release(ctx, other, this.grabs.get(other)!, false);
      this.attach(hand, anchor, entry);
      controller.pulse(0.5, 30);
    }

    this.updateRemote(ctx, reachable);
    this.updateFlights(dt, ctx);
    this.updateHighlights(reachable);
    this.updateHandGestures(ctx, reachable);
  }

  /**
   * Remote grabbing, in two steps. Aim at a prop and press grab: it locks on
   * and stays lit up even when the hand wanders off. Tilt the hand up/back
   * past 30° and the prop comes flying; let go of grab at any point and the
   * lock drops. The line between the two is off by default — it is mostly in
   * the way — and can be switched on in the settings.
   */
  private updateRemote(ctx: WorldContext, reachable: Set<PhysicsBody>): void {
    this.locked.clear();

    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand) continue;

      const usable =
        this.remoteGrab &&
        controller.tracked &&
        !this.grabs.has(hand) &&
        !this.held.has(hand) &&
        !this.reachingAcross(ctx, hand);
      const holding = usable && controller.squeeze.pressed;

      const link = this.links.get(hand);
      if (link && !holding) this.dropLink(hand);

      if (link && holding) {
        // Locked on: the prop stays lit wherever the hand points.
        reachable.add(link.entry);
        this.locked.add(link.entry);
        const pull = this.handPitch(controller) - link.pitch;
        this.drawRope(controller, link.entry, pull / REMOTE_PULL_ANGLE);
        if (pull >= REMOTE_PULL_ANGLE) {
          gripOf(controller).getWorldPosition(_hand);
          this.startFlight(link.entry, hand, _hand);
          controller.pulse(0.7, 45);
          this.dropLink(hand);
          this.hideRope(hand);
        }
        continue;
      }

      controller.getRay(_ray);
      const entry = usable ? this.findRemoteTarget(_ray) : null;
      if (!entry) {
        this.hideRope(hand);
        continue;
      }

      // Not locked yet: the prop lights up so the aim is readable without a
      // line being drawn across the room.
      reachable.add(entry);
      this.drawRope(controller, entry, -1);

      if (!controller.squeeze.justPressed) continue;
      this.links.set(hand, { entry, pitch: this.handPitch(controller) });
      controller.pulse(0.4, 25);
    }
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

  /** How far the hand points up, in radians. Yaw and roll do not matter. */
  private handPitch(controller: ControllerState): number {
    _aim.set(0, 0, -1).applyQuaternion(controller.targetRay.getWorldQuaternion(_quaternion));
    return Math.asin(THREE.MathUtils.clamp(_aim.y, -1, 1));
  }

  /**
   * The rope from the hand to a prop, when the player asked for one. A
   * negative tension means "only aiming at it" and draws it faintly; from 0 to
   * 1 the rope pulls straight and turns orange as the wrist approaches the
   * angle that fires the pull.
   */
  private drawRope(controller: ControllerState, entry: PhysicsBody, tension: number): void {
    if (!this.remoteRope) {
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
    rope.material.opacity = tension < 0 ? 0.3 : 0.95;
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

  /** Nearest prop the aiming ray actually enters. */
  private findRemoteTarget(ray: THREE.Ray, range = REMOTE_RANGE): PhysicsBody | null {
    _aimTargets.length = 0;
    for (const entry of this.props) {
      if (this.flights.has(entry) || this.handHolding(entry)) continue;
      _aimTargets.push(aimTargetOf(entry));
    }
    return pickAimTarget(_aimTargets, ray.origin, ray.direction, range)?.entry ?? null;
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

  private attach(hand: Handedness, anchor: THREE.Object3D, entry: PhysicsBody): void {
    // A tool lying on the floor is picked up as a *tool*, not carried around
    // like a crate: one place for it, so a hand, a remote grab and a gravity
    // glove all end the same way.
    const loose = this.loose.get(entry);
    if (loose) {
      this.catchLooseTool(hand, loose);
      return;
    }
    const physics = this.physics!;
    entry.body.setBodyType(physics.rapier.RigidBodyType.KinematicPositionBased, true);
    physics.setCarried(entry, true);
    entry.object.updateWorldMatrix(true, false);
    const offset = new THREE.Matrix4()
      .copy(anchor.matrixWorld)
      .invert()
      .multiply(entry.object.matrixWorld);
    entry.object.getWorldPosition(_point);
    this.grabs.set(hand, {
      entry,
      offset,
      lastPosition: _point.clone(),
      velocity: new THREE.Vector3(),
    });

    const id = this.idOf(entry);
    if (id) this.sync?.claim(id);
  }

  private release(ctx: WorldContext, hand: Handedness, grab: HandGrab, drop: boolean): void {
    const physics = this.physics!;
    this.grabs.delete(hand);
    if (!drop) return;

    physics.setCarried(grab.entry, false);
    grab.entry.body.setBodyType(physics.rapier.RigidBodyType.Dynamic, true);
    const thrown = grab.velocity.clampLength(0, 9);
    grab.entry.body.setLinvel({ x: thrown.x, y: thrown.y, z: thrown.z }, true);

    // Whoever simulates picks the throw up from here.
    const id = this.idOf(grab.entry);
    if (id) this.sync?.release(id, thrown);

    if (this.reopenBag && this.spawned.has(grab.entry)) {
      this.reopenBag = false;
      ctx.menu.openSubmenu('bag');
    }
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
        this.held.get(hand)?.toolId ?? (this.grabs.has(hand) ? GRAB_POSE_ID : null),
      );
      if (this.held.has(hand) || this.grabs.has(hand) || this.links.has(hand)) {
        ctx.hands.setGestureOverride(hand, 'grip');
        continue;
      }
      if (reachable.size > 0 && controller.tracked) {
        const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
        anchor.getWorldPosition(_hand);
        ctx.hands.setGestureOverride(hand, this.findProp(_hand) ? 'ready' : null);
        continue;
      }
      ctx.hands.setGestureOverride(hand, null);
    }
  }

  /** Conjures a new prop straight into the hand that picked it from the bag. */
  private spawnProp(ctx: WorldContext, hand: Handedness | null, kind: PropKind): void {
    if (!this.physics) return;

    const controller = hand ? ctx.input.get(hand) : null;
    const anchor = controller?.tracked
      ? controller.grip.visible
        ? controller.grip
        : controller.targetRay
      : null;

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

    ctx.menu.toggle(false);
    if (hand && anchor) {
      const tool = this.held.get(hand);
      if (tool) this.stowTool(tool);
      const existing = this.grabs.get(hand);
      if (existing) this.release(ctx, hand, existing, true);
      this.attach(hand, anchor, entry);
      this.reopenBag = true;
    }
    ctx.notify(createPropShape(kind).label);
  }

  /** Builds a bag prop — locally conjured or mirrored from another player. */
  private createProp(
    id: string,
    kind: PropKind,
    position: THREE.Vector3,
    quaternion: THREE.Quaternion | null,
  ): PhysicsBody {
    const physics = this.physics!;
    const blueprint = createPropShape(kind);
    const mesh = blueprint.mesh;
    mesh.position.copy(position);
    if (quaternion) mesh.quaternion.copy(quaternion);
    this.root.add(mesh);
    mesh.updateWorldMatrix(true, false);

    const entry = physics.addDynamic(mesh, {
      shape: blueprint.shape,
      halfExtents: blueprint.halfExtents,
      mass: blueprint.mass,
      friction: 0.7,
      restitution: 0.05,
      ccd: blueprint.ccd ?? false,
    });
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
      this.flights.delete(entry);
      this.spawns.delete(entry);
      this.ghosts?.untrack(propKey(entry));
      for (const [hand, link] of [...this.links]) {
        if (link.entry === entry) this.dropLink(hand);
      }
      const index = this.props.indexOf(entry);
      if (index >= 0) this.props.splice(index, 1);
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
        filter: GROUP_PROP,
      });
      probe = { object, entry };
      this.probes.set(key, probe);
    }
    const target = position ?? _probe.set(0, -60, 0);
    probe.entry.body.setNextKinematicTranslation({ x: target.x, y: target.y, z: target.z });
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

    ghosts.update([this.portalBlue, this.portalRed]);
  }

  // --- shooting -----------------------------------------------------------

  private bindFlatInput(ctx: WorldContext): void {
    this.canvas = ctx.renderer.domElement;
    // On a flat screen there are no hands to hold a gun with, so the mouse
    // keeps both portals: left blue, right red.
    this.flatFire = (event: MouseEvent) => {
      if (ctx.renderer.xr.isPresenting || ctx.pointer.hovering) return;
      if (event.button === 0) this.flatShoot(ctx, 'a');
      else if (event.button === 2) this.flatShoot(ctx, 'b');
    };
    this.flatKeys = (event: KeyboardEvent) => {
      // "r" is a reset — unless it is going into the keypad.
      if (event.code === 'KeyR' && !isTyping()) this.resetWorld(ctx);
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

    portal.place(hit.point, hit.normal, _placeUp, this.surfaceGroups.get(hit.object) ?? 0);
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
      } else if (key === 'a') {
        // Flat play has one crosshair; the second portal shares it.
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

  /** Lets the player fall through a wall while standing in a portal opening. */
  private playerFunnelMask(): number {
    this.locomotion!.getPosition(_point);
    this.context!.rig.getHeadPosition(_head);
    return this.funnelMask(_point, _head);
  }

  private updatePropPhasing(): void {
    const physics = this.physics!;
    for (const entry of this.props) {
      const t = entry.body.translation();
      _probe.set(t.x, t.y, t.z);
      physics.setPhasing(entry, this.funnelMask(_probe));
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
        const before = portal.signedDistance(entry.previousPosition);
        const after = portal.signedDistance(_point);
        if (before <= 0 || after > 0) continue;
        const t0 = before / (before - after);
        _cross.lerpVectors(entry.previousPosition, _point, t0);
        if (!portal.isInOpening(_cross, 1.05)) continue;

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

  /** The reset itself, without telling anybody — used by both ends. */
  private resetShared(): void {
    this.portalBlue.reset();
    this.portalRed.reset();
    for (const entry of [...this.flights.keys()]) this.endFlight(entry, false);
    this.clearSpawned();
    // Dropped tools go back to being belt tools: a floor full of thrown stars
    // is exactly the sort of thing "zurücksetzen" is for.
    for (const loose of [...this.loose.values()]) {
      const home = this.homes.get(loose.tool) ?? null;
      this.retireLoose(loose);
      this.refillBelt(loose.tool.toolId, home);
    }
    for (const entry of this.props) this.respawn(entry);
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
        _point.set(pose[0], pose[1], pose[2]);
        _quaternion.set(pose[3], pose[4], pose[5], pose[6]);
        this.createProp(id, kind, _point, _quaternion);
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
      paintRemote: (id, color) => {
        const entry = this.bodies.get(id);
        if (entry) this.paintProp(entry, color, false);
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
          filter: GROUP_PROP,
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
    tool.position.copy(tool.holdPosition);
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

/** A world point written down in a body's own frame — where a joint sits. */
function localPoint(entry: PhysicsBody, world: THREE.Vector3, target: THREE.Vector3): THREE.Vector3 {
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
    _toolLocal.copy(bounds).applyMatrix4(_toolMatrix.multiplyMatrices(_toolInverse, mesh.matrixWorld));
    _toolBox.union(_toolLocal);
  });
  if (_toolBox.isEmpty()) return target.set(0.05, 0.05, 0.05);
  const reach = (min: number, max: number): number =>
    Math.max(Math.abs(min), Math.abs(max), 0.02);
  return target.set(
    reach(_toolBox.min.x, _toolBox.max.x),
    reach(_toolBox.min.y, _toolBox.max.y),
    reach(_toolBox.min.z, _toolBox.max.z),
  );
}

function propKey(entry: PhysicsBody): string {
  return `prop:${entry.object.uuid}`;
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
