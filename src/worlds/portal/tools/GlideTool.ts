import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playTone } from '../../../core/Audio';
import { attitude, stepGlide, yawDelta, type GlideParams, type GlideState } from './glideFlight';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** So lange nach dem Abheben wird nicht auf Boden geachtet — die Kapsel klebt sonst noch. */
const LAUNCH_GRACE = 0.6;
/** So lange muss der Boden weg sein, bevor ein Schritt über die Kante als Flug zählt. */
const AIR_BEFORE_GLIDE = 0.12;
/** Langsamer als das ist ein Gleiter am Boden angekommen, nicht nur aufgesetzt. */
const LANDING_SPEED = 30;

const UP = new THREE.Vector3(0, 1, 0);
const _head = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _velocity = new THREE.Vector3();

/** Was ein Fluggerät aus Händen und Kopf liest — je Bild. */
export interface GlideCommand {
  /** -1 Nase runter … +1 Nase hoch. */
  pitchUp: number;
  /** -1 links … +1 rechts. */
  roll: number;
  /** Wie viel Flügel trägt, 0 … 1. */
  area: number;
  /** Schub aus dem Flügelschlag, m/s². */
  flap: number;
  /** Jetzt abheben — vom Boden aus. */
  launch: boolean;
}

/** Eine Hand im Rahmen des Kopfes: vor, über und rechts davon, in Metern. */
export interface HeadRelative {
  ahead: number;
  up: number;
  side: number;
}

/**
 * Was Hängegleiter und Flügel gemeinsam haben: **ein Flügel, der den Spieler
 * trägt**, sobald der Boden weg ist.
 *
 * Am Boden ist so ein Ding nur etwas, das man trägt. Wer damit über eine
 * Kante läuft oder sich per Knopf abstößt, fliegt: von da an rechnet
 * `glideFlight.ts` die Bahn, der Rig bekommt sie als Flug (`setFlight`), und
 * der Körper dreht sich mit der Bahn, damit „vorn" immer dorthin zeigt, wohin
 * es geht. Berührt die Kapsel wieder Boden, ist gelandet — mit dem Schwung, der
 * noch da war.
 *
 * Was die Hände dabei tun, ist bei beiden verschieden und steht in der
 * Ableitung (`readCommand`); wie der Flügel aussieht und wo er im Raum steht,
 * ebenfalls (`placeWing`). Der Flügel selbst hängt beim Fliegen **im Raum**
 * und nicht an der Hand: ein zehn Meter breites Segel, das jeder Bewegung des
 * Handgelenks folgt, ist kein Gleiter, sondern ein Fächer. Nur ein kleines
 * Stück — der Griff — bleibt in der Faust.
 */
export abstract class GlideTool extends Tool {
  protected abstract readonly params: GlideParams;
  /**
   * Der Flügel: beim Fliegen und Tragen im Raum, sonst als Kind des Werkzeugs
   * zum Ansehen — auf der Werkzeugseite, im Regal, am Griffstand.
   */
  protected readonly wing = new THREE.Group();
  /** Das Bündel, das am Gürtel hängt: ein Flügel, den man nicht trägt, ist gepackt. */
  protected readonly pack = new THREE.Group();

  protected flying = false;
  protected state: GlideState = { velocity: { x: 0, y: 0, z: 0 }, bank: 0 };
  /** Wohin die Nase zeigt, in Radiant wie `rotation.y`. */
  protected yaw = 0;
  protected pitch = 0;
  /** Was die Hände gerade sagen — für das Bild des Flügels. */
  protected command: GlideCommand = { pitchUp: 0, roll: 0, area: 1, flap: 0, launch: false };

  private hostRef: ToolHost | null = null;
  private side: Handedness | null = null;
  private grace = 0;
  private airTime = 0;
  private busyHands = false;

  constructor() {
    super();
    this.sticky = true;
    this.wing.name = 'wing';
    this.pack.name = 'pack';
    this.pack.visible = false;
    this.add(this.wing, this.pack);
  }

  /** Aus Kopf und Händen die Eingabe dieses Bildes lesen. */
  protected abstract readCommand(
    dt: number,
    host: ToolHost,
    controller: ControllerState,
  ): GlideCommand;

  /**
   * Den Flügel für dieses Bild in den Raum stellen. `yaw`, `pitch` und
   * `state.bank` sagen, wie er in der Luft liegt; am Boden liegt er waagerecht
   * und schaut dorthin, wohin der Kopf schaut.
   */
  protected abstract placeWing(host: ToolHost, controller: ControllerState): void;

  /** Was beim Abheben gesagt wird. */
  protected abstract takeOffNote(): string;

  override onTake(controller: ControllerState, host: ToolHost): void {
    this.side = controller.handedness;
    this.hostRef = host;
    this.showPacked(false);
    // Der Flügel gehört ab jetzt dem Raum, nicht der Hand.
    host.root.add(this.wing);
    this.wing.visible = true;
    this.pack.visible = false;
    this.yaw = headYaw(host);
  }

  override onStow(host: ToolHost): void {
    this.land(host, false);
    this.add(this.wing);
    this.wing.position.set(0, 0, 0);
    this.wing.quaternion.identity();
    this.showPacked(true);
    this.side = null;
  }

  override showHeldBy(_hand: Handedness | null): void {
    // Eine Kopie am Griffstand oder auf der Werkzeugseite zeigt den ganzen
    // Flügel — das ist ja das, was man ansehen will.
    if (!this.heldBy) this.showPacked(false);
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    this.hostRef = host;
    if (!this.heldBy || !controller) {
      if (this.flying) this.land(host, false);
      // An einer Hüfte: gepackt. Das erste Verstauen beim Bau der Welt läuft
      // nicht über `onStow`, deshalb steht die Regel hier und nicht nur dort —
      // ein zehn Meter breites Segel an der Hüfte ist das Bild, das sonst
      // dabei herauskommt. Ein Exemplar, das nirgends hängt (das gepoolte, von
      // dem das Regal sein Modell abschreibt), bleibt der ganze Flügel.
      if (!this.parked) this.showPacked(this.parent !== null);
      return;
    }
    if (this.parked) return;

    this.command = this.readCommand(dt, host, controller);
    const grounded = host.onGround();

    if (!this.flying) {
      this.airTime = grounded ? 0 : this.airTime + dt;
      if (this.command.launch && grounded) {
        this.takeOff(host, true);
      } else if (this.airTime > AIR_BEFORE_GLIDE) {
        this.takeOff(host, false);
      } else {
        // Getragen: der Flügel folgt dem Kopf, waagerecht.
        this.yaw = headYaw(host);
        this.pitch = 0;
        this.state = { velocity: { x: 0, y: 0, z: 0 }, bank: 0 };
      }
    }

    if (this.flying) {
      this.grace = Math.max(0, this.grace - dt);
      if (grounded && this.grace <= 0) {
        this.land(host, true);
      } else {
        this.fly(dt, host);
      }
    }

    this.markHands(host, this.flying);
    this.placeWing(host, controller);
  }

  override disposeTool(): void {
    this.wing.removeFromParent();
    disposeToolTree(this.wing);
    disposeToolTree(this);
  }

  // --- Abheben, Fliegen, Landen ----------------------------------------------

  private takeOff(host: ToolHost, pushed: boolean): void {
    host.playerVelocity(_velocity);
    if (pushed) {
      // Ein Anlauf von der Rampe: nach vorn, wohin der Kopf schaut, und ein
      // kleiner Hüpfer, damit die Kapsel vom Boden kommt.
      host.ctx.rig.getHeadForward(_forward);
      _velocity.addScaledVector(_forward, this.params.trimSpeed * 0.75);
      _velocity.y = Math.max(_velocity.y, 0) + 2.2;
      this.grace = LAUNCH_GRACE;
    } else {
      this.grace = 0.15;
    }
    this.flying = true;
    this.state = { velocity: { x: _velocity.x, y: _velocity.y, z: _velocity.z }, bank: 0 };
    this.yaw = headYaw(host);
    host.setFlight(_velocity);
    host.notify(this.takeOffNote());
    playTone({ type: 'triangle', from: 320, to: 760, duration: 0.2, gain: 0.05 });
  }

  private fly(dt: number, host: ToolHost): void {
    const gravity = Math.max(0, -host.physics.gravityY);
    this.state = stepGlide(this.state, this.command, this.params, gravity, dt);
    const v = this.state.velocity;
    _velocity.set(v.x, v.y, v.z);
    host.setFlight(_velocity);

    // Der Körper dreht sich mit der Bahn: wer eine Kurve fliegt, schaut
    // hinterher dorthin, wohin er fliegt — und nicht mehr über die Schulter.
    const flat = Math.hypot(v.x, v.z);
    if (flat > 1) {
      const next = attitude(v);
      const delta = yawDelta(this.yaw, next.yaw);
      host.ctx.rig.rotateAroundHead(delta);
      this.yaw = next.yaw;
      this.pitch = next.pitch;
    }
  }

  /** Zurück auf die Füße, mit dem Schwung, der noch da war. */
  protected land(host: ToolHost, announce: boolean): void {
    this.grace = 0;
    this.airTime = 0;
    if (!this.flying) return;
    this.flying = false;
    host.setFlight(null);
    this.markHands(host, false);
    if (announce) {
      const v = this.state.velocity;
      const speed = Math.hypot(v.x, v.y, v.z);
      host.notify(speed > LANDING_SPEED ? 'Harte Landung' : 'Gelandet');
      playTone({ type: 'sine', from: 600, to: 220, duration: 0.18, gain: 0.05 });
    }
    this.state = { velocity: { x: 0, y: 0, z: 0 }, bank: 0 };
  }

  /**
   * Beim Fliegen sind beide Hände am Fluggerät: kein Strahl, kein Menü, keine
   * Hüfte. Am Boden bekommen sie alles zurück.
   */
  private markHands(host: ToolHost, busy: boolean): void {
    if (busy === this.busyHands) return;
    this.busyHands = busy;
    const pointer = host.ctx.pointer;
    for (const side of ['left', 'right'] as const) {
      if (busy) pointer.busy.add(side);
      else pointer.busy.delete(side);
    }
  }

  private showPacked(packed: boolean): void {
    this.pack.visible = packed;
    this.wing.visible = !packed;
  }

  // --- Hilfen für die Ableitungen --------------------------------------------

  /** Die andere Hand als die, die das Werkzeug hält. */
  protected otherSide(): Handedness | null {
    const side = this.heldBy ?? this.side;
    return side === 'left' ? 'right' : side === 'right' ? 'left' : null;
  }

  /**
   * Wo eine Hand im Rahmen des Kopfes liegt: vor, über und rechts davon. Der
   * Rahmen ist die flache Blickrichtung — Umsehen dreht ihn mit, was hier
   * gewollt ist: der Bügel liegt vor *dir*, egal wohin der Flug geht.
   */
  protected relativeToHead(host: ToolHost, controller: ControllerState): HeadRelative {
    const rig = host.ctx.rig;
    rig.getHeadPosition(_head);
    rig.getHeadForward(_forward);
    _right.copy(_forward).cross(UP).normalize();
    anchorOf(controller).getWorldPosition(_hand).sub(_head);
    return { ahead: _hand.dot(_forward), up: _hand.y, side: _hand.dot(_right) };
  }

  /** Die Faust schließen oder öffnen — beim Fliegen liegen beide Hände am Gerät. */
  protected setGesture(host: ToolHost, side: Handedness | null, fist: boolean): void {
    if (!side) return;
    host.ctx.hands.setFist(side, fist);
  }

  protected get host(): ToolHost | null {
    return this.hostRef;
  }
}

/** Wohin der Kopf flach schaut, als `rotation.y`. */
function headYaw(host: ToolHost): number {
  host.ctx.rig.getHeadForward(_forward);
  return Math.atan2(-_forward.x, -_forward.z);
}

export function anchorOf(controller: ControllerState): THREE.Object3D {
  return controller.grip.visible ? controller.grip : controller.targetRay;
}
