import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import {
  DRONE_FIELDS,
  DRONE_PROFILES,
  droneFieldLabel,
  droneProfileLabel,
  nextDroneStep,
  type DroneField,
  type DroneProfile,
} from './droneSettings';
import {
  droneTuning,
  flyJet,
  flyKopter,
  headingOf,
  levelOf,
  quatFromYaw,
  quatIdentity,
  type Quat,
} from './droneFlight';
import { createGripShape } from './grip';
import { quatFromEulerXYZ, type HoldPose } from './toolPose';
import { JET_BELLY, JET_EYE, JetBody } from './droneJet';
import { droneSettings, saveDroneSettings } from './gearStore';
import { playTone } from '../../../core/Audio';
import { UIPanel } from '../../../ui/UIPanel';
import { drawMenuIcon, type MenuEntry } from '../../../ui/menu';
import type { ControllerState, Handedness, XRInput } from '../../../core/XRInput';
import type { Pointer } from '../../../core/Pointer';

/** Resolution of the picture on the hand-held display. */
const FEED_W = 384;
const FEED_H = 240;
/** Seconds the drone needs to reach the stick's speed — it has some mass. */
const RESPONSE = 0.28;
/** The copter never sinks below this, so it cannot be lost in the floor. */
const FLOOR = 0.35;
/** The jet is a whole machine with a belly under it, so it keeps its distance. */
const JET_FLOOR = JET_BELLY + 0.55;
/** How far in front of the player a fresh machine is put — the jet needs room. */
const REACH = 1.3;
const JET_REACH = 7;
/**
 * Where the eye sits relative to the copter, in its *own* frame: a bit above it
 * and a bit behind. That is what puts the machine into the lower edge of the
 * picture — a piece of the world that never moves relative to the head is the
 * cheapest cure there is for motion sickness. The jet has a real seat for that
 * (`JET_EYE`), and it rolls with the horizon, which is exactly the point.
 */
const EYE_OFFSET = new THREE.Vector3(0, 0.24, 0.15);
/** Where the hand-held display looks from: the copter's chin, the jet's nose. */
const FEED_EYE = new THREE.Vector3(0, 0.005, -0.11);
const JET_FEED_EYE = new THREE.Vector3(0, -0.15, -3.1);
/** Which icon each of the two adjustable numbers gets on the little panel. */
const FIELD_ICONS: Record<DroneField['key'], 'stopwatch' | 'gizmo'> = {
  speed: 'stopwatch',
  turn: 'gizmo',
};
/** Half the distance between the two grips. */
const GRIP_X = 0.105;
/** Wie weit jeder Griff nach außen kippt, in Bogenmaß — oben auseinander. */
const GRIP_TILT = 0.12;
/**
 * Der **rechte Griff, in der rechten Hand** — als Griff im Rahmen von
 * `gripFit.ts` (Achse +Y, Vorne -Z), im Raum des Werkzeugs.
 *
 * Mit einer Hand am Gerät rutscht das Deck so weit zur Seite, dass dieser Griff
 * auf dem Ursprung sitzt (`showHeldBy`); übrig bleiben seine Höhe, sein kleiner
 * Versatz nach vorn und die Kippung nach außen. Daraus rechnet
 * `core/gripFist.test.ts` die Faust der Drohne (`DRONE_HAND_POSE`) — dieselbe
 * Rechnung wie für den Standardgriff, nur um diesen Zylinder. Der linke Griff
 * in der linken Hand ist die Spiegelung, wie bei jeder Haltung.
 */
export const DRONE_GRIP: HoldPose = {
  position: { x: 0, y: -0.004, z: 0.006 },
  rotation: quatFromEulerXYZ({ x: 0, y: 0, z: -GRIP_TILT }),
};
/** How far from the free grip the second hand still counts as holding on. */
const GRIP_REACH = 0.32;

const _forward = new THREE.Vector3();
const _head = new THREE.Vector3();
const _eye = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _wish = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _axisX = new THREE.Vector3();
const _axisY = new THREE.Vector3();
const _axisZ = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _other = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _tilt = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _point = new THREE.Vector3();
const _basis = new THREE.Matrix4();
const _inverse = new THREE.Matrix4();
const _zero = { x: 0, y: 0 };

/**
 * Ferngesteuerte Drohne.
 *
 * Das Werkzeug ist ein flaches Gerät wie eine Handheld-Konsole: **zwei Griffe**
 * links und rechts, dazwischen das Display, über dem Display ein Knopf. Die
 * Drohne selbst schwebt draußen im Raum und zeigt ihr Bild auf dem Display —
 * auch vom Boden aus, als Periskop.
 *
 * **Beide Griffe** müssen in den Händen liegen; dann schaltet **einer der
 * beiden Trigger** (welcher, ist egal) die Sicht hinaus auf die Drohne. Die
 * Sticks fliegen sie, der Kopf schaut weiter frei umher. Nochmal Trigger — oder
 * eine Hand loslassen — parkt sie da, wo sie ist.
 *
 * Während geflogen wird, ist der eigene Körper **weg**: Hände, Werkzeuge an der
 * Hüfte und das Handgelenk-Menü fliegen nicht mit, also werden sie auch nicht
 * gezeichnet (`PortalWorld.setViewOverride`). Was stattdessen im Bild bleibt,
 * ist die Maschine selbst — und die sieht in den beiden Modi verschieden aus:
 * im **Kopter** hängt der kleine Quadrokopter knapp unter der Blickachse, im
 * **Jet** sitzt man in einem richtigen kleinen Flugzeug (`droneJet.ts`):
 * Instrumentenbrett vor den Knien, Kanzelbügel über dem Kopf, Nase und Flächen
 * im Blickfeld. Das ist der ruhende Punkt gegen Motion Sickness, und in einer
 * Maschine, die sich auf den Rücken legen darf, ist er Pflicht.
 *
 * Der **Knopf** über dem Display öffnet die Einstellungen: Flugmodus (Kopter
 * oder Jet, `droneSettings.ts`), **Tempo** und **Drehrate** — beide schalten
 * pro Druck eine Raste weiter und zeigen die rohe Zahl daneben —, Drohne neu
 * setzen, und ob das Herausnehmen des Werkzeugs eine alte Drohne verschrottet.
 * Das Panel ist nur so lange ein Zielobjekt, wie es offen ist — sonst würde der
 * Zeigestrahl der eigenen Hand darauf liegenbleiben und jedem Werkzeug den
 * Trigger wegnehmen.
 */
export class DroneTool extends Tool {
  override readonly toolId = 'drone';
  override readonly label = 'Drohne';

  /** The drone lives in the world, not in the hand. */
  readonly drone = new THREE.Group();

  private readonly camera = new THREE.PerspectiveCamera(78, FEED_W / FEED_H, 0.05, 300);
  private readonly target: THREE.WebGLRenderTarget;
  private readonly screen: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly rotors: THREE.Mesh[] = [];
  private readonly velocity = new THREE.Vector3();
  private readonly lamp: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  /** The quadcopter, and the jet that takes its place. Only ever one of them. */
  private readonly copter = new THREE.Group();
  private readonly jet = new JetBody();
  /** Where the pilot's eye sits, in the machine's own frame — mode by mode. */
  private readonly eye = new THREE.Vector3().copy(EYE_OFFSET);
  /** The mode the model is currently built for, so a change is noticed once. */
  private shownProfile: DroneProfile | null = null;
  /**
   * Everything the device is made of. It slides sideways inside the tool: held
   * with one hand the *grip* has to sit in that hand, so the deck moves over
   * and the tool's own origin — the one the adjustment tool measures — stays
   * exactly where a hold pose says it is.
   */
  private readonly deck = new THREE.Group();
  /** The two places the hands belong, as points on the device. */
  private readonly grips: Record<Handedness, THREE.Object3D> = {
    left: new THREE.Object3D(),
    right: new THREE.Object3D(),
  };
  /** The settings button over the display, and the panel it opens. */
  private readonly button: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly buttonCanvas: HTMLCanvasElement;
  private readonly buttonTexture: THREE.CanvasTexture;
  private readonly panel: UIPanel;
  private buttonHot = false;
  private settingsOpen = false;

  /** The machine's attitude. In the copter it stays level, in the jet it does not. */
  private orientation: Quat = quatIdentity();
  /** Cosmetic tilt of the copter's model — the view never takes it on. */
  private bank = 0;
  private nose = 0;
  private spin = 0;
  private flying = false;
  private placed = false;
  /** Both hands on the grips right now. Nothing flies without it. */
  private twoHanded = false;
  /** Kept from `onTake`, so the hold pose can ask about the other hand. */
  private input: XRInput | null = null;
  /** Where the pointer is registered, so it can be taken off again. */
  private pointer: Pointer | null = null;

  constructor() {
    super();
    this.name = 'tool-drone';
    this.icon = 'drone';
    this.accent = 0x4aa8ff;
    this.hint = 'Beide Griffe halten · Trigger fliegt · A öffnet das Menü';
    this.holdPosition.set(0, -0.02, 0.02);
    // The display is read, not aimed: it faces the player, tilted like a
    // console screen rather than pointing off along the ray.
    this.holdRotation.setFromEuler(new THREE.Euler(-0.55, 0, 0));

    const shell = new THREE.MeshStandardMaterial({ color: 0x2b3346, roughness: 0.6 });
    const trim = new THREE.MeshStandardMaterial({
      color: 0x9aa6bd,
      roughness: 0.35,
      metalness: 0.6,
    });
    const bezel = new THREE.MeshStandardMaterial({ color: 0x11151f, roughness: 0.8 });

    // --- the device: a flat slab with a grip at each end ---------------------
    this.add(this.deck);
    const case3d = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.14, 0.018), shell);
    this.deck.add(case3d);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), bezel);
    face.position.set(0, -0.012, 0.0095);
    this.deck.add(face);

    for (const side of [-1, 1] as const) {
      // Zwei **Standardgriffe** (`grip.ts`), einer je Hand: derselbe Zylinder
      // wie an der Pistole, nur ein Stück länger, weil an einer Konsole die
      // ganze Faust daran liegt. Vorher waren es zwei Kästen mit einem
      // Gummiband darum — und die sagten über die Richtung, in der man
      // zupacken soll, nichts.
      //
      // Die **Lage** ist hier nicht die des Standardgriffs: sie steckt im
      // Gerät, denn die beiden Griffe sitzen an den Enden des Decks und nicht
      // dort, wo ein Pistolengriff läge (5,5 cm tiefer, 20° anders gedreht —
      // `gripFit.ts` misst es nach). Ein Gerät, das man mit zwei Fäusten wie
      // eine Konsole hält, ist eben keine Pistole; deshalb steht es auch nicht
      // in `STANDARD_GRIP_TOOLS` und hat seine eigene Faust — gerechnet um
      // genau diesen Zylinder (`DRONE_GRIP`, `DRONE_HAND_POSE`).
      const grip = createGripShape({ length: 0.13, thickness: 1.15 });
      grip.position.set(side * GRIP_X, DRONE_GRIP.position.y, DRONE_GRIP.position.z);
      grip.rotation.z = -side * GRIP_TILT;
      this.deck.add(grip);

      const node = this.grips[side < 0 ? 'left' : 'right'];
      node.position.copy(grip.position);
      this.deck.add(node);
    }

    this.target = new THREE.WebGLRenderTarget(FEED_W, FEED_H, {
      depthBuffer: true,
      colorSpace: THREE.SRGBColorSpace,
    });
    this.screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.148, 0.0925),
      new THREE.MeshBasicMaterial({ map: this.target.texture, toneMapped: false }),
    );
    this.screen.position.set(0, -0.012, 0.0105);
    this.deck.add(this.screen);

    // --- the button over the display ----------------------------------------
    this.buttonCanvas = document.createElement('canvas');
    this.buttonCanvas.width = 128;
    this.buttonCanvas.height = 128;
    this.buttonTexture = new THREE.CanvasTexture(this.buttonCanvas);
    this.buttonTexture.colorSpace = THREE.SRGBColorSpace;
    this.button = new THREE.Mesh(
      new THREE.CircleGeometry(0.016, 28),
      new THREE.MeshBasicMaterial({
        map: this.buttonTexture,
        transparent: true,
        toneMapped: false,
        depthWrite: false,
      }),
    );
    this.button.name = 'drone-settings-button';
    this.button.position.set(0, 0.052, 0.0105);
    this.button.renderOrder = 12;
    this.button.geometry.computeBoundingBox();
    this.deck.add(this.button);
    this.drawButton();

    // The settings stand above the device, where a panel can be read without
    // covering the picture. Closed by default — see the class comment.
    this.panel = new UIPanel({
      width: 0.19,
      title: 'Drohne',
      onSelect: (index) => this.choose(index),
    });
    this.panel.position.set(0, 0.12, 0.02);
    this.panel.visible = false;
    this.deck.add(this.panel);

    // --- the machine ----------------------------------------------------------
    // Two of them, in the same place: the little quadcopter and, for the jet
    // mode, a whole aircraft with a seat in it. `applyProfile` shows one.
    this.drone.name = 'drone';
    this.drone.add(this.copter);
    this.drone.add(this.jet);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.2), shell);
    this.copter.add(body);
    for (const [x, z] of [
      [-0.11, -0.11],
      [0.11, -0.11],
      [-0.11, 0.11],
      [0.11, 0.11],
    ] as const) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.011, 0.016), trim);
      arm.position.set(x * 0.6, 0, z * 0.6);
      this.copter.add(arm);
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.004, 16), trim);
      rotor.position.set(x, 0.035, z);
      this.copter.add(rotor);
      this.rotors.push(rotor);
    }
    this.lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0x4aa8ff, toneMapped: false }),
    );
    this.lamp.position.set(0, -0.012, -0.105);
    this.copter.add(this.lamp);
    this.drone.add(this.camera);
    this.applyProfile();
  }

  // --- copter or jet ----------------------------------------------------------

  /**
   * Puts the model, the seat and the display's camera on the mode that is set.
   *
   * The copter is a hand-sized toy hanging under the view; the jet is a machine
   * the pilot sits *in*, so the eye moves into its cockpit and the picture on
   * the hand-held display comes from its nose instead of from a chin camera
   * that would be buried inside the fuselage.
   */
  private applyProfile(): void {
    const profile = droneSettings().profile;
    this.shownProfile = profile;
    const jet = profile === 'racing';
    this.jet.visible = jet;
    this.copter.visible = !jet;
    this.eye.copy(jet ? JET_EYE : EYE_OFFSET);
    this.camera.position.copy(jet ? JET_FEED_EYE : FEED_EYE);
    this.jet.setThrottle(0);
    // A jet that has just grown out of a copter must not stand in the floor.
    this.drone.position.y = Math.max(this.floor(), this.drone.position.y);
  }

  /** How low this machine may go — the jet has a belly and a set of wheels. */
  private floor(): number {
    return this.shownProfile === 'racing' ? JET_FLOOR : FLOOR;
  }

  // --- the settings menu ----------------------------------------------------

  /** The rows on the panel, rebuilt whenever one of them changes. */
  private showSettings(): void {
    const settings = droneSettings();
    const profile = DRONE_PROFILES.find((entry) => entry.id === settings.profile);
    const entries: MenuEntry[] = [
      {
        id: 'drone:profile',
        label: `Modus: ${droneProfileLabel(settings.profile)}`,
        sub: `Links: ${profile?.left ?? ''} · Rechts: ${profile?.right ?? ''}`,
        icon: 'drone',
        accent: 0x4aa8ff,
      },
      // The two numbers everybody wants different: one press steps to the next
      // notch, and the raw figure stands next to the name — the same deal the
      // pistol's rows offer.
      ...DRONE_FIELDS.map((field) => ({
        id: `drone:${field.key}`,
        label: `${field.label}: ${droneFieldLabel(field, settings[field.key])}`,
        sub: field.sub,
        icon: FIELD_ICONS[field.key],
        accent: 0x9ad9ff,
      })),
      {
        id: 'drone:place',
        label: 'Drohne neu setzen',
        sub: 'Stellt sie wieder vor dich hin',
        icon: 'reset',
        accent: 0x5ee0a0,
      },
      {
        id: 'drone:replace',
        label: 'Beim Herausnehmen neu',
        sub: 'Verschrottet eine alte Drohne',
        icon: 'tools',
        accent: 0xffc857,
        checked: settings.replace,
      },
    ];
    this.panel.setPage('Drohne', entries, { hint: 'Zielen und Trigger stellt um' });
  }

  /**
   * A row was picked: step the mode, step one of the two numbers, re-place the
   * drone, or flip the switch. The order is the one `showSettings` builds.
   */
  private choose(index: number): void {
    const fields = DRONE_FIELDS.length;
    if (index === 0) {
      const ids = DRONE_PROFILES.map((entry) => entry.id);
      const at = ids.indexOf(droneSettings().profile);
      saveDroneSettings({ profile: ids[(at + 1) % ids.length] as DroneProfile });
      // A jet that is handed a copter's attitude mid-flight would flip; level
      // it out instead, whichever way round the change goes.
      this.orientation = levelOf(this.orientation);
      this.bank = 0;
      this.nose = 0;
      this.applyProfile();
      this.applyDronePose();
    } else if (index >= 1 && index <= fields) {
      const field = DRONE_FIELDS[index - 1]!;
      saveDroneSettings({ [field.key]: nextDroneStep(field, droneSettings()[field.key]) });
    } else if (index === fields + 1) {
      const host = this.hostRef;
      if (host) {
        this.place(host);
        host.notify('Drohne neu gesetzt');
      }
    } else if (index === fields + 2) {
      saveDroneSettings({ replace: !droneSettings().replace });
    }
    this.showSettings();
  }

  /** Opens or closes the settings, and hangs the panel on the pointer with it. */
  private setSettingsOpen(open: boolean): void {
    if (this.settingsOpen === open) return;
    this.settingsOpen = open;
    this.panel.visible = open;
    const pointer = this.pointer;
    if (pointer) {
      pointer.remove(this.panel);
      if (open) {
        pointer.add({
          ...this.panel.asPointerTarget(),
          pokeable: false,
          ignore: (hand) => this.ignoresHand(hand),
        });
      }
    }
    if (open) this.showSettings();
    this.drawButton();
    playTone({
      type: 'sine',
      from: open ? 420 : 620,
      to: open ? 700 : 380,
      duration: 0.09,
      gain: 0.04,
    });
  }

  /**
   * Hands whose ray this device does not listen to: the ones on its own grips —
   * their laser lies on their own screen all day — and any hand that is
   * carrying another tool. A hand holding the adjustment tool is *working* on
   * this device, and a pointer resting on the little button would take that
   * hand's trigger away from it.
   */
  private ignoresHand(hand: Handedness | null): boolean {
    if (!hand) return false;
    if (hand === this.heldBy || this.twoHanded) return true;
    const other = this.hostRef?.heldTool(hand);
    return other !== null && other !== undefined;
  }

  // --- taking and putting away ----------------------------------------------

  override onTake(_controller: ControllerState, host: ToolHost): void {
    this.hostRef = host;
    this.input = host.ctx.input;
    this.pointer = host.ctx.pointer;
    if (this.drone.parent !== host.root) host.root.add(this.drone);
    this.drone.visible = true;

    host.ctx.pointer.remove(this.button);
    host.ctx.pointer.add({
      object: this.button,
      // A brush past must not open it; and the hands on the grips are holding,
      // not pointing — their own rays lie on their own device all day.
      pokeable: true,
      ignore: (hand) => this.ignoresHand(hand),
      onHover: () => this.setButtonHot(true),
      onBlur: () => this.setButtonHot(false),
      onSelect: () => this.setSettingsOpen(!this.settingsOpen),
    });

    const settings = droneSettings();
    if (this.placed && !settings.replace) return;
    if (this.placed) host.notify('Alte Drohne verschrottet');
    this.place(host);
  }

  /**
   * Puts a fresh machine in front of the player: the copter an arm's length
   * away, the jet a good deal further — three and a half metres of aircraft
   * planted on somebody's nose is not a friendly greeting.
   */
  private place(host: ToolHost): void {
    this.applyProfile();
    host.ctx.rig.getHeadPosition(_head);
    host.ctx.rig.getHeadForward(_forward);
    const reach = this.shownProfile === 'racing' ? JET_REACH : REACH;
    this.drone.position.copy(_head).addScaledVector(_forward, reach);
    this.drone.position.y = Math.max(this.floor(), this.drone.position.y);
    this.velocity.set(0, 0, 0);
    this.orientation = quatFromYaw(Math.atan2(-_forward.x, -_forward.z));
    this.bank = 0;
    this.nose = 0;
    this.applyDronePose();
    this.placed = true;
  }

  override onStow(host: ToolHost): void {
    // Letting go of the display always hands the view back.
    this.park(host);
    this.twoHanded = false;
    this.setSettingsOpen(false);
    host.ctx.pointer.busy.delete('left');
    host.ctx.pointer.busy.delete('right');
    host.ctx.pointer.remove(this.button);
    host.ctx.pointer.remove(this.panel);
  }

  /**
   * `A`/`X` of the holding hand opens the settings too. The button over the
   * display is the obvious way in, but a device that is held with both fists
   * has no free finger to press it with — so the thumb that is already there
   * does it as well.
   */
  override onPrimary(controller: ControllerState, _host: ToolHost): void {
    this.setSettingsOpen(!this.settingsOpen);
    controller.pulse(0.35, 25);
  }

  /**
   * The other hand is claimed as soon as it is *at* the free grip — not only
   * once it squeezes. Otherwise the very grip that takes hold of this device
   * would, in the same instant, pull a tool off the nearest hip.
   */
  override claimsHand(hand: Handedness): boolean {
    if (!this.heldBy || this.parked || hand === this.heldBy) return false;
    return this.nearFreeGrip(hand);
  }

  // --- how it sits in the hands ---------------------------------------------

  /**
   * One hand carries the device by the grip on its own side, so the other grip
   * points across the body and is easy to find. With both hands on it the
   * device stops belonging to either: it spans them, centred between the two
   * fists and turned along the line they make — the way you hold a console.
   */
  override applyHold(controller: ControllerState | null): void {
    if (!this.heldBy || this.parked) return;
    const spanned = this.twoHanded && this.spanHands();
    // One hand: the device hangs off to the side so its own grip is the one in
    // that fist. Two hands: it is centred, because the origin is then already
    // in the middle between them.
    this.showHeldBy(spanned ? null : this.heldBy);
    if (!spanned) super.applyHold(controller);
  }

  /**
   * Und dasselbe für ein Gerät, das gerade **niemand** hält.
   *
   * Die Kopie am Griffstand hängt in der Luft, `applyHold` läuft für sie nie —
   * und ohne diese Zeile stand sie dort mittig, während sie in der Hand um
   * einen halben Griffabstand daneben liegt. Wer die Boxhand an den sichtbaren
   * Griff legte, mass genau diese Verschiebung mit ein und hielt hinterher ein
   * Gerät, das zehn Zentimeter neben der Hand schwebte.
   */
  override showHeldBy(hand: Handedness | null): void {
    this.deck.position.x = hand === 'left' ? GRIP_X : hand === 'right' ? -GRIP_X : 0;
  }

  /** The two-handed pose. False when the hands cannot be measured right now. */
  private spanHands(): boolean {
    const parent = this.parent;
    const left = this.input?.get('left');
    const right = this.input?.get('right');
    if (!parent || !left?.tracked || !right?.tracked) return false;

    anchorOf(left).getWorldPosition(_a);
    anchorOf(right).getWorldPosition(_b);
    _axisX.copy(_b).sub(_a);
    if (_axisX.lengthSq() < 1e-4) return false;
    _axisX.normalize();

    // Which way the device faces: both hands point somewhere, and the average
    // of the two is where the player is aiming the thing.
    _aim.set(0, 0, -1).applyQuaternion(left.targetRay.getWorldQuaternion(_quat));
    _other.set(0, 0, -1).applyQuaternion(right.targetRay.getWorldQuaternion(_quat));
    _aim.add(_other);
    if (_aim.lengthSq() < 1e-6) return false;
    _axisZ.copy(_aim).normalize().negate();

    _axisY.copy(_axisZ).cross(_axisX);
    if (_axisY.lengthSq() < 1e-6) return false;
    _axisY.normalize();
    _axisZ.copy(_axisX).cross(_axisY);
    _basis.makeBasis(_axisX, _axisY, _axisZ);
    _quat.setFromRotationMatrix(_basis);

    // Just past the fists: the screen belongs in front of the knuckles, not
    // inside them.
    _point
      .copy(_a)
      .add(_b)
      .multiplyScalar(0.5)
      .addScaledVector(_axisY, 0.03)
      .addScaledVector(_axisZ, 0.02);

    parent.updateWorldMatrix(true, false);
    _inverse.copy(parent.matrixWorld).invert();
    this.position.copy(_point).applyMatrix4(_inverse);
    // The rig and the hands are never scaled, so the inverse is a plain rotation.
    this.quaternion.setFromRotationMatrix(_inverse).multiply(_quat);
    return true;
  }

  /**
   * Which hands are holding instead of pointing. Both of them while the device
   * is carried two-handed — and the holding one while the settings are open, so
   * its laser goes out and only the free hand's ray is left to work the panel.
   * Everything else would leave a pointer resting on the very thing it is
   * supposed to aim at.
   */
  private markBusyHands(host: ToolHost): void {
    const pointer = host.ctx.pointer;
    const busy = this.twoHanded || this.settingsOpen;
    for (const side of ['left', 'right'] as const) {
      const held = side === this.heldBy ? busy : this.twoHanded;
      if (held) pointer.busy.add(side);
      else pointer.busy.delete(side);
    }
  }

  /** Is that hand close enough to the free grip to be holding this thing? */
  private nearFreeGrip(hand: Handedness): boolean {
    const controller = this.input?.get(hand);
    if (!controller?.tracked) return false;
    anchorOf(controller).getWorldPosition(_a);
    this.grips[hand].getWorldPosition(_b);
    return _a.distanceToSquared(_b) < GRIP_REACH * GRIP_REACH;
  }

  /** Is the free grip in the other hand? Controllers have to squeeze for it. */
  private checkSecondHand(): boolean {
    const side = this.heldBy;
    if (!side) return false;
    const otherSide: Handedness = side === 'left' ? 'right' : 'left';
    const other = this.input?.get(otherSide);
    if (!other?.tracked) return false;
    // A hand with a tool of its own has both hands full already.
    if (this.hostRef?.heldTool(otherSide)) return false;
    // Both grips have to be closed — a bare hand's grip is its three fingers
    // folding onto the palm, which is exactly the shape of holding a handle.
    if (!other.squeeze.pressed) return false;
    return this.nearFreeGrip(otherSide);
  }

  // --- flying ----------------------------------------------------------------

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    this.hostRef = host;
    if (!this.heldBy || !controller) {
      if (this.flying) this.park(host);
      this.twoHanded = false;
      return;
    }
    this.input = host.ctx.input;
    // Hanging in the air for the adjustment tool: it belongs to nobody's grips
    // right now, and the hand next to it is measuring, not holding.
    if (this.parked) {
      this.twoHanded = false;
      this.markBusyHands(host);
      return;
    }

    const both = this.checkSecondHand();
    if (both !== this.twoHanded) {
      this.twoHanded = both;
      if (!both && this.flying) {
        this.park(host);
        host.notify('Hand vom Griff · Drohne geparkt');
      }
    }
    this.markBusyHands(host);

    // The mode can also change from outside — a config code brings a whole
    // settings object with it — so the model follows the setting, not the menu.
    if (droneSettings().profile !== this.shownProfile) {
      this.applyProfile();
      this.applyDronePose();
    }

    this.handleTriggers(host);
    if (this.flying) this.fly(dt, host);
    else this.jet.setThrottle(0);
    this.panel.update(dt);

    // The rotors always turn; faster while it is actually being flown.
    this.spin += dt * (this.flying ? 46 : 12);
    for (let i = 0; i < this.rotors.length; i++) {
      this.rotors[i]!.rotation.y = this.spin * (i % 2 === 0 ? 1 : -1);
    }
    const color = this.flying ? 0x5ee0a0 : this.twoHanded ? 0x4aa8ff : 0xff8f5e;
    this.lamp.material.color.setHex(color);
    this.jet.setLights(color);
  }

  /**
   * Either trigger flies it — the tool asks the hands itself instead of waiting
   * to be told. The world only ever hands the *holding* hand's buttons to a
   * tool, and this one is held by both.
   */
  private handleTriggers(host: ToolHost): void {
    const input = host.ctx.input;
    // Only the hands that are actually on this thing. The other hand may well
    // be carrying a pistol, and its trigger is none of our business.
    const sides: Handedness[] = this.twoHanded ? ['left', 'right'] : [this.heldBy!];
    let pressed = false;
    for (const side of sides) {
      const hand = input.get(side);
      if (!hand?.tracked || !hand.trigger.justPressed) continue;
      // While that hand's own ray lies on a panel the trigger belongs to it. In
      // the air the pointer is off entirely, so this cannot lock anybody out.
      if (!this.flying && host.ctx.pointer.hoveringWith(side)) continue;
      pressed = true;
    }
    if (!pressed) return;

    if (this.flying) {
      this.park(host);
      host.notify('Drohne geparkt');
      return;
    }
    if (!this.twoHanded) {
      host.notify('Beide Griffe halten, dann Trigger');
      return;
    }
    this.flying = true;
    this.setSettingsOpen(false);
    this.velocity.set(0, 0, 0);
    host.notify('Drohnenansicht · Sticks fliegen');
    playTone({ type: 'triangle', from: 300, to: 780, duration: 0.14, gain: 0.05 });
    for (const side of ['left', 'right'] as const) input.get(side)?.pulse(0.5, 35);
  }

  /** Sticks in, movement out — the maths itself lives in `droneFlight.ts`. */
  private fly(dt: number, host: ToolHost): void {
    const input = host.ctx.input;
    const left = input.get('left')?.thumbstick ?? _zero;
    const right = input.get('right')?.thumbstick ?? _zero;
    // Speed and turn rate are the player's, so the whole tuning is built from
    // what the menu says rather than taken off the shelf.
    const settings = droneSettings();
    const tune = droneTuning(settings.speed, settings.turn);

    if (settings.profile === 'racing') {
      const step = flyJet(this.orientation, left, right, dt, tune);
      this.orientation = step.orientation;
      this.bank = 0;
      this.nose = 0;
      _wish.set(step.wish.x, step.wish.y, step.wish.z);
      // Stick forward is thrust, and thrust is what the afterburner shows.
      this.jet.setThrottle(Math.max(0, -left.y));
      // The stick in the cockpit goes where the stick in the hand goes. It
      // changes nothing about the flying and everything about sitting in it.
      this.jet.setStick(right.x, right.y);
    } else {
      // The copter is flown where the pilot looks: they sit in its seat, and
      // their head is the only thing that says "forwards".
      host.ctx.rig.getHeadForward(_forward);
      const step = flyKopter(headingOf(this.orientation), left, right, _forward, dt, tune);
      this.orientation = quatFromYaw(step.heading);
      this.bank = step.bank;
      this.nose = step.nose;
      _wish.set(step.wish.x, step.wish.y, step.wish.z);
    }

    const blend = Math.min(1, dt / RESPONSE);
    this.velocity.lerp(_wish, blend);
    this.drone.position.addScaledVector(this.velocity, dt);
    const floor = this.floor();
    if (this.drone.position.y < floor) {
      this.drone.position.y = floor;
      this.velocity.y = Math.max(0, this.velocity.y);
    }
    this.applyDronePose();

    // The view rides in the machine's own frame: the copter's is level whatever
    // the model does, the jet's is the whole attitude, horizon and all — and in
    // the jet the eye sits in the cockpit, so the canopy frames that horizon.
    _quat.set(this.orientation.x, this.orientation.y, this.orientation.z, this.orientation.w);
    _eye.copy(this.drone.position).add(_offset.copy(this.eye).applyQuaternion(_quat));
    host.setViewOverride(_eye, _quat);
  }

  /** Puts the model where the numbers say, cosmetic tilt included. */
  private applyDronePose(): void {
    _quat.set(this.orientation.x, this.orientation.y, this.orientation.z, this.orientation.w);
    this.drone.quaternion.copy(_quat);
    if (this.bank !== 0 || this.nose !== 0) {
      _euler.set(this.nose, 0, this.bank, 'YXZ');
      this.drone.quaternion.multiply(_tilt.setFromEuler(_euler));
    }
  }

  private park(host: ToolHost): void {
    if (!this.flying) return;
    this.flying = false;
    this.velocity.set(0, 0, 0);
    // Back on an even keel: a jet left standing on its wingtip is a jet nobody
    // can pick up again.
    this.orientation = levelOf(this.orientation);
    this.bank = 0;
    this.nose = 0;
    this.jet.setThrottle(0);
    this.jet.setStick(0, 0);
    this.applyDronePose();
    host.setViewOverride(null);
    playTone({ type: 'triangle', from: 780, to: 300, duration: 0.14, gain: 0.05 });
  }

  // --- the picture -----------------------------------------------------------

  /**
   * Draws what the drone sees into the display. The world calls this before
   * its own render pass — the same trick the portals use, with the XR path
   * switched off so the off-screen camera is really the one that is used.
   *
   * Nothing to draw while it is being flown: the device is then not in the
   * picture at all, and a second render pass for a hidden screen is waste.
   */
  renderFeed(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    if (!this.heldBy || !this.placed || this.flying || !this.visible) return;

    const previousTarget = renderer.getRenderTarget();
    const xrEnabled = renderer.xr.enabled;
    renderer.xr.enabled = false;
    // The screen must not photograph itself.
    this.screen.visible = false;
    renderer.setRenderTarget(this.target);
    renderer.render(scene, this.camera);
    renderer.setRenderTarget(previousTarget);
    renderer.xr.enabled = xrEnabled;
    this.screen.visible = true;
  }

  /**
   * Takes the button and the settings panel off the pointer. The world calls
   * this when it tears its tools down — a stowed tool has done it itself, but
   * one that is still in a hand when the world ends has not.
   */
  forgetPointer(pointer: Pointer): void {
    pointer.remove(this.button);
    pointer.remove(this.panel);
    pointer.busy.delete('left');
    pointer.busy.delete('right');
  }

  override disposeTool(): void {
    this.panel.dispose();
    disposeToolTree(this);
    disposeToolTree(this.drone);
    this.drone.removeFromParent();
    this.target.dispose();
    this.buttonTexture.dispose();
  }

  // --- the button's face ------------------------------------------------------

  private setButtonHot(hot: boolean): void {
    if (this.buttonHot === hot) return;
    this.buttonHot = hot;
    this.drawButton();
  }

  private drawButton(): void {
    const ctx = this.buttonCanvas.getContext('2d');
    if (!ctx) return;
    const size = this.buttonCanvas.width;
    const middle = size / 2;
    ctx.clearRect(0, 0, size, size);

    const glow = ctx.createRadialGradient(middle, middle, 12, middle, middle, middle - 2);
    glow.addColorStop(0, this.settingsOpen ? 'rgba(255,157,61,0.95)' : 'rgba(74,168,255,0.95)');
    glow.addColorStop(1, 'rgba(8, 14, 26, 0.92)');
    ctx.beginPath();
    ctx.arc(middle, middle, middle - 3, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.lineWidth = this.buttonHot ? 6 : 3.5;
    ctx.strokeStyle = this.buttonHot ? '#ffffff' : 'rgba(255,255,255,0.75)';
    ctx.stroke();

    drawMenuIcon(ctx, this.settingsOpen ? 'back' : 'drone', middle, middle, size * 0.5, '#ffffff');
    this.buttonTexture.needsUpdate = true;
  }

  /** The room, kept from the last frame — the panel's rows need it too. */
  private hostRef: ToolHost | null = null;
}

/** Where a hand actually is: the grip when there is one, else the ray. */
function anchorOf(controller: ControllerState): THREE.Object3D {
  return controller.grip.visible ? controller.grip : controller.targetRay;
}
