import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playTone } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';

/** Resolution of the picture on the hand-held display. */
const FEED_W = 320;
const FEED_H = 200;
/** How fast the drone flies, in m/s. */
const SPEED = 5.5;
const CLIMB_SPEED = 3.2;
/** Seconds the drone needs to reach the stick's speed — it has some mass. */
const RESPONSE = 0.28;
/** The drone never sinks below this, so it cannot be lost in the floor. */
const FLOOR = 0.35;
/** Where the eye sits relative to the drone while it is flown. */
const EYE_OFFSET = new THREE.Vector3(0, 0.06, 0);

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _wish = new THREE.Vector3();
const _head = new THREE.Vector3();
const _eye = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * Ferngesteuerte Drohne.
 *
 * The tool is a little display; the drone itself hovers out in the room. Pull
 * the trigger and the view moves out to the drone: the sticks fly it, the head
 * still looks around freely (the headset owns the view direction, and taking
 * that away is what makes people sick). Trigger again parks the drone where it
 * is, and letting go of the tool does the same.
 *
 * The display always shows the drone's own camera, so it is useful as a
 * periscope even while you are standing on the floor yourself.
 */
export class DroneTool extends Tool {
  override readonly toolId = 'drone';
  override readonly label = 'Drohne';

  /** The drone lives in the world, not in the hand. */
  readonly drone = new THREE.Group();

  private readonly camera = new THREE.PerspectiveCamera(72, FEED_W / FEED_H, 0.05, 300);
  private readonly target: THREE.WebGLRenderTarget;
  private readonly screen: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly rotors: THREE.Mesh[] = [];
  private readonly velocity = new THREE.Vector3();
  private readonly lamp: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private yaw = 0;
  private spin = 0;
  private flying = false;
  private placed = false;

  constructor() {
    super();
    this.name = 'tool-drone';
    this.icon = 'drone';
    this.accent = 0x4aa8ff;
    this.hint = 'Trigger fliegt mit · nochmal parkt sie';
    this.holdPosition.set(0, -0.01, 0.01);
    // The display is read, not aimed: it faces the player, tilted like a
    // controller screen rather than pointing off along the ray.
    this.holdRotation.setFromEuler(new THREE.Euler(-0.6, 0, 0));

    const shell = new THREE.MeshStandardMaterial({ color: 0x2b3346, roughness: 0.6 });
    const trim = new THREE.MeshStandardMaterial({
      color: 0x9aa6bd,
      roughness: 0.35,
      metalness: 0.6,
    });

    const case3d = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.014), shell);
    this.add(case3d);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.03), shell);
    grip.position.set(0, -0.07, 0.005);
    this.add(grip);

    this.target = new THREE.WebGLRenderTarget(FEED_W, FEED_H, {
      depthBuffer: true,
      colorSpace: THREE.SRGBColorSpace,
    });
    this.screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.13, 0.082),
      new THREE.MeshBasicMaterial({ map: this.target.texture, toneMapped: false }),
    );
    this.screen.position.set(0, 0, 0.009);
    this.add(this.screen);

    // --- the drone ---------------------------------------------------------
    this.drone.name = 'drone';
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.16), shell);
    this.drone.add(body);
    for (const [x, z] of [
      [-0.09, -0.09],
      [0.09, -0.09],
      [-0.09, 0.09],
      [0.09, 0.09],
    ] as const) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.01, 0.015), trim);
      arm.position.set(x * 0.6, 0, z * 0.6);
      this.drone.add(arm);
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.004, 16), trim);
      rotor.position.set(x, 0.03, z);
      this.drone.add(rotor);
      this.rotors.push(rotor);
    }
    this.lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.014, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0x4aa8ff, toneMapped: false }),
    );
    this.lamp.position.set(0, -0.01, -0.085);
    this.drone.add(this.lamp);
    this.camera.position.set(0, -0.005, -0.09);
    this.camera.rotation.set(-0.12, 0, 0);
    this.drone.add(this.camera);
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.drone.parent !== host.root) host.root.add(this.drone);
    this.drone.visible = true;
    if (this.placed) return;
    // First time out: the drone waits an arm's length in front of the player.
    host.ctx.rig.getHeadPosition(_head);
    host.ctx.rig.getHeadForward(_forward);
    this.drone.position.copy(_head).addScaledVector(_forward, 1.1);
    this.yaw = Math.atan2(-_forward.x, -_forward.z);
    this.drone.rotation.y = this.yaw;
    this.placed = true;
  }

  override onStow(host: ToolHost): void {
    // Letting go of the display always hands the view back.
    this.park(host);
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    if (this.flying) {
      this.park(host);
      host.notify('Drohne geparkt');
    } else {
      this.flying = true;
      this.velocity.set(0, 0, 0);
      host.notify('Drohnenansicht · Sticks fliegen');
      playTone({ type: 'triangle', from: 300, to: 780, duration: 0.14, gain: 0.05 });
    }
    controller.pulse(0.5, 35);
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    if (!this.heldBy || !controller) {
      if (this.flying) this.park(host);
      return;
    }

    if (this.flying) this.fly(dt, host);

    // The rotors always turn; faster while it is actually being flown.
    this.spin += dt * (this.flying ? 42 : 12);
    for (let i = 0; i < this.rotors.length; i++) {
      this.rotors[i]!.rotation.y = this.spin * (i % 2 === 0 ? 1 : -1);
    }
    this.lamp.material.color.setHex(this.flying ? 0x5ee0a0 : 0x4aa8ff);
  }

  /**
   * Draws what the drone sees into the display. The world calls this before
   * its own render pass — the same trick the portals use, with the XR path
   * switched off so the off-screen camera is really the one that is used.
   */
  renderFeed(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    if (!this.heldBy || !this.drone.visible) return;

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

  override disposeTool(): void {
    disposeToolTree(this);
    disposeToolTree(this.drone);
    this.drone.removeFromParent();
    this.target.dispose();
  }

  /** Sticks in, movement out. Left stick flies, right stick climbs and turns. */
  private fly(dt: number, host: ToolHost): void {
    const input = host.ctx.input;
    const left = input.get('left');
    const right = input.get('right');

    // Flown relative to where the player looks — they are sitting in the
    // drone's seat, and their head is the only thing that says "forwards".
    host.ctx.rig.getHeadForward(_forward);
    _right.copy(_forward).cross(_up).normalize();

    const move = left?.thumbstick ?? { x: 0, y: 0 };
    _wish
      .set(0, 0, 0)
      .addScaledVector(_forward, -move.y)
      .addScaledVector(_right, move.x);
    if (_wish.lengthSq() > 1) _wish.normalize();
    _wish.multiplyScalar(SPEED);
    _wish.y = (right?.thumbstick.y ?? 0) * -CLIMB_SPEED;

    const blend = Math.min(1, dt / RESPONSE);
    this.velocity.lerp(_wish, blend);
    this.drone.position.addScaledVector(this.velocity, dt);
    if (this.drone.position.y < FLOOR) {
      this.drone.position.y = FLOOR;
      this.velocity.y = Math.max(0, this.velocity.y);
    }

    // The nose follows the flight, and the right stick turns it on the spot.
    this.yaw -= (right?.thumbstick.x ?? 0) * dt * 1.6;
    if (this.velocity.lengthSq() > 0.4) {
      this.yaw = Math.atan2(-this.velocity.x, -this.velocity.z);
    }
    this.drone.rotation.y = this.yaw;
    // A little bank in the direction of travel.
    this.drone.rotation.z = THREE.MathUtils.clamp(-this.velocity.x * 0.04, -0.3, 0.3);
    this.drone.rotation.x = THREE.MathUtils.clamp(this.velocity.z * 0.04, -0.3, 0.3);

    _eye.copy(this.drone.position).add(EYE_OFFSET);
    host.setViewOverride(_eye);
  }

  private park(host: ToolHost): void {
    if (!this.flying) return;
    this.flying = false;
    this.velocity.set(0, 0, 0);
    host.setViewOverride(null);
    playTone({ type: 'triangle', from: 780, to: 300, duration: 0.14, gain: 0.05 });
  }
}
