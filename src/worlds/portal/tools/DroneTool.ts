import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { DRONE_PROFILES, droneProfileLabel, type DroneProfile } from './droneSettings';
import { droneSettings, saveDroneSettings } from './gearStore';
import { playTone } from '../../../core/Audio';
import { UIPanel } from '../../../ui/UIPanel';
import type { MenuEntry } from '../../../ui/menu';
import type { ControllerState } from '../../../core/XRInput';
import type { Pointer } from '../../../core/Pointer';

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
/** Radians per second the sticks turn the nose. */
const YAW_RATE = 1.6;
/** How far a racing drone leans at full stick. */
const TILT = 0.5;

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _nose = new THREE.Vector3();
const _side = new THREE.Vector3();
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
 * While you are flying it, the drone itself is **not drawn for you**: the view
 * sits inside it, and a machine wrapped around your own head is only ever in
 * the way. Your body stays standing where you left it, and you can look back
 * at yourself — the avatar becomes visible to its own eye for as long as the
 * view is away (`PlayerAvatar.leaveBehind`).
 *
 * The little panel over the display picks **which stick does what** — camera
 * copter or racing drone (`droneSettings.ts`) — and whether taking the tool out
 * again scraps a drone that is still hovering somewhere.
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
  /** The settings panel that rides over the display. */
  private readonly panel: UIPanel;
  private yaw = 0;
  private spin = 0;
  private pitch = 0;
  private roll = 0;
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

    // The settings ride over the display, in the same plane: two rows, and the
    // panel draws itself only as tall as it needs.
    this.panel = new UIPanel({
      width: 0.14,
      onSelect: (index) => this.choose(index),
    });
    this.panel.position.set(0, 0.055, 0.006);
    // Only while it is being carried: a menu floating over the hip is noise.
    this.panel.visible = false;
    this.add(this.panel);
    this.showSettings();
  }

  /** The two rows on the panel, rebuilt whenever one of them changes. */
  private showSettings(): void {
    const settings = droneSettings();
    const profile = DRONE_PROFILES.find((entry) => entry.id === settings.profile);
    const entries: MenuEntry[] = [
      {
        id: 'drone:profile',
        label: droneProfileLabel(settings.profile),
        sub: `Links: ${profile?.left ?? ''} · Rechts: ${profile?.right ?? ''}`,
        icon: 'drone',
        accent: 0x4aa8ff,
      },
      {
        id: 'drone:replace',
        label: 'Neu setzen',
        sub: 'Herausnehmen verschrottet die alte Drohne',
        icon: 'reset',
        accent: 0xffc857,
        checked: settings.replace,
      },
    ];
    this.panel.setPage('Drohne', entries, false, 'Zielen und Trigger stellt um');
  }

  /** A row was picked: step the profile, or flip the switch. */
  private choose(index: number): void {
    if (index === 0) {
      const ids = DRONE_PROFILES.map((entry) => entry.id);
      const at = ids.indexOf(droneSettings().profile);
      saveDroneSettings({ profile: ids[(at + 1) % ids.length] as DroneProfile });
    } else if (index === 1) {
      saveDroneSettings({ replace: !droneSettings().replace });
    }
    this.showSettings();
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.drone.parent !== host.root) host.root.add(this.drone);
    this.drone.visible = true;
    // The panel is pointed at like any other, so it has to be a target for as
    // long as the tool is in a hand.
    host.ctx.pointer.remove(this.panel);
    host.ctx.pointer.add(this.panel.asPointerTarget());
    this.panel.visible = true;
    this.showSettings();

    const settings = droneSettings();
    if (this.placed && !settings.replace) return;
    if (this.placed) host.notify('Alte Drohne verschrottet');
    // A fresh drone waits an arm's length in front of the player.
    host.ctx.rig.getHeadPosition(_head);
    host.ctx.rig.getHeadForward(_forward);
    this.drone.position.copy(_head).addScaledVector(_forward, 1.1);
    this.velocity.set(0, 0, 0);
    this.yaw = Math.atan2(-_forward.x, -_forward.z);
    this.pitch = 0;
    this.roll = 0;
    this.drone.rotation.set(0, this.yaw, 0);
    this.placed = true;
  }

  override onStow(host: ToolHost): void {
    // Letting go of the display always hands the view back.
    this.park(host);
    host.ctx.pointer.remove(this.panel);
    this.panel.visible = false;
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
    this.panel.update(dt);
    // Flying it means sitting inside it: nobody wants their own rotors in
    // their face. It is a local object anyway, so this hides it for you only.
    this.drone.visible = !this.flying;

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
    if (!this.heldBy || !this.placed) return;

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
   * Takes the settings panel off the pointer. The world calls this when it
   * tears its tools down — a stowed tool has done it itself, but one that is
   * still in a hand when the world ends has not.
   */
  forgetPointer(pointer: Pointer): void {
    pointer.remove(this.panel);
  }

  override disposeTool(): void {
    this.panel.dispose();
    disposeToolTree(this);
    disposeToolTree(this.drone);
    this.drone.removeFromParent();
    this.target.dispose();
  }

  /** Sticks in, movement out. Left stick flies, right stick climbs and turns. */
  private fly(dt: number, host: ToolHost): void {
    const input = host.ctx.input;
    const left = input.get('left')?.thumbstick ?? { x: 0, y: 0 };
    const right = input.get('right')?.thumbstick ?? { x: 0, y: 0 };

    if (droneSettings().profile === 'racing') this.flyRacing(dt, left, right);
    else this.flyKopter(dt, host, left, right);

    const blend = Math.min(1, dt / RESPONSE);
    this.velocity.lerp(_wish, blend);
    this.drone.position.addScaledVector(this.velocity, dt);
    if (this.drone.position.y < FLOOR) {
      this.drone.position.y = FLOOR;
      this.velocity.y = Math.max(0, this.velocity.y);
    }
    this.drone.rotation.set(this.pitch, this.yaw, this.roll);

    _eye.copy(this.drone.position).add(EYE_OFFSET);
    host.setViewOverride(_eye);
  }

  /**
   * Kopter-Profi: the left stick *moves* the machine, the right one turns it
   * and takes it up and down. Flown relative to where the player looks — they
   * are sitting in the drone's seat, and their head is the only thing that
   * says "forwards".
   */
  private flyKopter(
    dt: number,
    host: ToolHost,
    left: { x: number; y: number },
    right: { x: number; y: number },
  ): void {
    host.ctx.rig.getHeadForward(_forward);
    _right.copy(_forward).cross(_up).normalize();

    _wish.set(0, 0, 0).addScaledVector(_forward, -left.y).addScaledVector(_right, left.x);
    if (_wish.lengthSq() > 1) _wish.normalize();
    _wish.multiplyScalar(SPEED);
    _wish.y = right.y * -CLIMB_SPEED;

    // The nose follows the flight, and the right stick turns it on the spot.
    this.yaw -= right.x * dt * YAW_RATE;
    if (this.velocity.lengthSq() > 0.4) {
      this.yaw = Math.atan2(-this.velocity.x, -this.velocity.z);
    }
    // A little bank in the direction of travel.
    this.roll = THREE.MathUtils.clamp(-this.velocity.x * 0.04, -0.3, 0.3);
    this.pitch = THREE.MathUtils.clamp(this.velocity.z * 0.04, -0.3, 0.3);
  }

  /**
   * Racing: the left stick is throttle and rudder, the right one is the
   * attitude. The machine goes where its own nose points, not where the head
   * looks — leaning it forward is what makes it fly forward, which is the
   * whole difference between the two schools.
   */
  private flyRacing(dt: number, left: { x: number; y: number }, right: { x: number; y: number }): void {
    this.yaw -= left.x * dt * YAW_RATE;
    // Its own frame: the nose is -Z turned by the yaw, right is 90° off it.
    _nose.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _side.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const ahead = -right.y;
    const sideways = right.x;
    _wish.set(0, 0, 0).addScaledVector(_nose, ahead).addScaledVector(_side, sideways);
    if (_wish.lengthSq() > 1) _wish.normalize();
    _wish.multiplyScalar(SPEED);
    _wish.y = -left.y * CLIMB_SPEED;

    // The attitude is the stick, not the speed: a racing drone leans where it
    // is told and stays leaning, which is what it looks like from outside.
    this.pitch = -ahead * TILT;
    this.roll = -sideways * TILT;
  }

  private park(host: ToolHost): void {
    if (!this.flying) return;
    this.flying = false;
    // Back outside it: from here on it is a thing in the room again.
    this.drone.visible = true;
    this.velocity.set(0, 0, 0);
    host.setViewOverride(null);
    playTone({ type: 'triangle', from: 780, to: 300, duration: 0.14, gain: 0.05 });
  }
}
