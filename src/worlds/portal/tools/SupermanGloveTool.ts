import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playTone } from '../../../core/Audio';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** Hand movement inside this radius does nothing — a held hand is never still. */
const DEADZONE = 0.06;
/** Metres per second per metre the hand leans out of the deadzone. */
const GAIN = 14;
const MAX_SPEED = 11;
/** How fast the hover drifts up and down, and how far. */
const BOB_RATE = 1.7;
const BOB_SPEED = 0.3;

const _hand = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _look = new THREE.Vector3();
const _right = new THREE.Vector3();
const _velocity = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const WHITE = new THREE.Color(0xffffff);

/**
 * Supermanhandschuh: the room, from above.
 *
 * **Greifen** lifts you off the floor and leaves you hanging there, drifting
 * gently up and down. Nothing else happens — hovering is a place to think from,
 * and it is also the safe state to come back to.
 *
 * **Trigger** makes a fist and you go. Which way is the two things a flying
 * person actually has: **where you look**, and **where you push your hand**.
 * The moment the trigger goes down the hand's position is remembered; from
 * then on the offset from that point is a joystick in your own frame — forward
 * is wherever you are looking (pitch included, so a glance down is a dive),
 * sideways is your left and right, and lifting the hand lifts you. The further
 * out, the faster. Let go of the trigger and you hover again, exactly where
 * you got to.
 *
 * **Greifen** again drops you: gravity gets the body back, with the speed it
 * had, so letting go at the top of a climb is a real fall.
 *
 * The steering is the translation glove's, turned around: there the hand moves
 * a prop through the room, here it moves you.
 */
export class SupermanGloveTool extends Tool {
  override readonly toolId = 'superman-glove';
  override readonly label = 'Supermanhandschuh';

  private readonly cuff: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
  private readonly crest: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private readonly display: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  /** Off the ground. Everything else only matters while this is true. */
  private hovering = false;
  /**
   * Which hand wears it. Not `heldBy`: a tool is cleared off its hand *before*
   * it is told it has been put away, and a fist left behind on a hand nobody
   * clears is a fist for the rest of the session.
   */
  private side: Handedness | null = null;
  /** Where the hand was when the trigger went down — the middle of the stick. */
  private origin: THREE.Vector3 | null = null;
  /** Seconds since take-off, for the bob. */
  private time = 0;
  private speed = 0;
  private drawn = '';

  constructor() {
    super();
    this.name = 'tool-superman-glove';
    this.icon = 'superman';
    this.accent = 0xff4d5e;
    this.sticky = true;
    this.hint = 'Greifen schwebt · Trigger fliegt, Blick lenkt';
    this.holdPosition.set(0, -0.01, 0.02);

    const shell = new THREE.MeshStandardMaterial({
      color: 0x1f3f8a,
      roughness: 0.45,
      metalness: 0.35,
    });

    // A gauntlet: a plate over the back of the hand, a cuff around the wrist.
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.024, 0.1), shell);
    plate.position.set(0, 0.005, -0.02);
    this.add(plate);
    for (const side of [-1, 1]) {
      const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, 0.02), shell);
      knuckle.position.set(side * 0.022, 0.012, -0.072);
      this.add(knuckle);
    }

    this.cuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.038, 0.008, 10, 24),
      new THREE.MeshStandardMaterial({
        color: 0xff4d5e,
        emissive: new THREE.Color(0xff4d5e).multiplyScalar(0.35),
        roughness: 0.35,
        metalness: 0.4,
      }),
    );
    this.cuff.rotation.x = Math.PI / 2;
    this.cuff.position.set(0, 0, 0.035);
    this.add(this.cuff);

    // The crest on the back of the hand, in the red that says who this is.
    this.crest = new THREE.Mesh(
      new THREE.CircleGeometry(0.019, 5),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, toneMapped: false }),
    );
    this.crest.position.set(0, 0.019, -0.02);
    this.crest.rotation.set(-Math.PI / 2, 0, 0);
    this.add(this.crest);

    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 96;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.display = new THREE.Mesh(
      new THREE.PlaneGeometry(0.07, 0.026),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false }),
    );
    this.display.position.set(0, 0.022, 0.008);
    this.display.rotation.x = -Math.PI / 2;
    this.add(this.display);
    this.draw();
  }

  override onTake(controller: ControllerState, _host: ToolHost): void {
    this.side = controller.handedness;
  }

  /** Greifen: off the ground, or back onto it. */
  override onGrab(controller: ControllerState, host: ToolHost): void {
    if (this.hovering) {
      this.land(host);
      host.notify('Gelandet');
      playTone({ type: 'sine', from: 620, to: 240, duration: 0.16, gain: 0.05 });
    } else {
      this.hovering = true;
      this.time = 0;
      this.origin = null;
      host.notify('Schweben · Trigger fliegt, Blick lenkt');
      playTone({ type: 'triangle', from: 280, to: 820, duration: 0.18, gain: 0.05 });
    }
    controller.pulse(0.5, 35);
    this.draw();
  }

  /** `A` does the same as the grab button — whichever finger is free. */
  override onPrimary(controller: ControllerState, host: ToolHost): void {
    this.onGrab(controller, host);
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    if (!this.hovering) {
      host.notify('Erst greifen — dann fliegt der Trigger');
      return;
    }
    // The middle of the joystick is wherever the hand happens to be now.
    this.origin = handPosition(controller, new THREE.Vector3());
    controller.pulse(0.4, 25);
    playTone({ type: 'square', from: 520, to: 900, duration: 0.1, gain: 0.04 });
    this.draw();
  }

  override onTriggerUp(_controller: ControllerState, _host: ToolHost): void {
    this.origin = null;
    this.draw();
  }

  override onStow(host: ToolHost): void {
    this.land(host);
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    if (!this.heldBy || !controller) {
      this.land(host);
      return;
    }
    if (!this.hovering) {
      this.speed = 0;
      this.setFist(host, false);
      return;
    }

    this.time += dt;
    // Letting go of the trigger while pointing at a panel swallows the event,
    // so the fist is also given up when the finger is simply found to be off.
    if (this.origin && !controller.trigger.pressed) this.origin = null;

    if (this.origin) {
      handPosition(controller, _hand);
      _offset.copy(_hand).sub(this.origin);
      // Forward is where the head looks *now*, so turning the head steers.
      host.ctx.rig.getHeadLook(_look);
      _right.copy(_look).cross(UP);
      if (_right.lengthSq() < 1e-6) _right.set(1, 0, 0);
      _right.normalize();

      _velocity
        .set(0, 0, 0)
        .addScaledVector(_look, lean(_offset.dot(_look)))
        .addScaledVector(_right, lean(_offset.dot(_right)))
        .addScaledVector(UP, lean(_offset.y));
      if (_velocity.lengthSq() > MAX_SPEED * MAX_SPEED) _velocity.setLength(MAX_SPEED);
    } else {
      // Hovering: standing still, breathing.
      _velocity.set(0, Math.sin(this.time * BOB_RATE) * BOB_SPEED, 0);
    }

    host.setFlight(_velocity);
    this.speed = _velocity.length();
    this.setFist(host, this.origin !== null);

    const glow = 0.35 + Math.min(1, this.speed / MAX_SPEED) * 0.65;
    this.cuff.material.emissive.setHex(0xff4d5e).multiplyScalar(glow);
    this.crest.material.color.setHex(0xffd23f).lerp(WHITE, glow - 0.35);
    this.draw();
  }

  override disposeTool(): void {
    disposeToolTree(this);
    this.texture.dispose();
  }

  /** Back on the floor, with whatever speed was left. */
  private land(host: ToolHost): void {
    if (!this.hovering) return;
    this.hovering = false;
    this.origin = null;
    this.speed = 0;
    host.setFlight(null);
    this.setFist(host, false);
    if (!this.heldBy) this.side = null;
    this.draw();
  }

  /** A hand that is flying is a fist, whatever it happens to be holding. */
  private setFist(host: ToolHost, closed: boolean): void {
    const side = this.heldBy ?? this.side;
    if (!side) return;
    host.ctx.hands.setGestureOverride(side, closed ? 'grip' : null);
  }

  private draw(): void {
    // Whole metres per second: the canvas is redrawn when the line changes,
    // and a tenth that flickers every frame would redraw it every frame.
    const text = !this.hovering ? 'AUS' : this.origin ? `${Math.round(this.speed)} m/s` : 'SCHWEBEN';
    if (text === this.drawn) return;
    this.drawn = text;

    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 96);
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 88, 20);
    ctx.fillStyle = 'rgba(10, 14, 30, 0.9)';
    ctx.fill();
    ctx.strokeStyle = this.hovering ? '#ff4d5e' : '#48506a';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 40px system-ui, sans-serif';
    ctx.fillText(text, 128, 50);
    this.texture.needsUpdate = true;
  }
}

/** Speed one axis of the lean asks for, with the deadzone taken out. */
function lean(value: number): number {
  const amount = Math.abs(value) - DEADZONE;
  if (amount <= 0) return 0;
  return Math.sign(value) * amount * GAIN;
}

function handPosition(controller: ControllerState, target: THREE.Vector3): THREE.Vector3 {
  const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
  return anchor.getWorldPosition(target);
}
