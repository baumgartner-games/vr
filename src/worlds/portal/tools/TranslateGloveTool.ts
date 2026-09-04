import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playTone } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';
import type { PhysicsBody } from '../../../physics/PhysicsWorld';

/** How far the glove reaches. */
const RANGE = 30;
/** Hand movement inside this radius does nothing — a held hand is never still. */
const DEADZONE = 0.05;
/** Metres per second per metre the hand leans out of the deadzone. */
const STEER_GAIN = 5;
const STEER_MAX = 6;

const _origin = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _hand = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _target = new THREE.Vector3();
const _delta = new THREE.Quaternion();
const _turn = new THREE.Quaternion();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _velocity = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const WHITE = new THREE.Color(0xffffff);

/** How the glove treats what it has hold of. */
export type GloveMode = 'hold' | 'steer';

/** The prop in the glove's grip, and what it looked like when it was taken. */
interface Hold {
  entry: PhysicsBody;
  /** Where the prop is being kept — integrated while steering. */
  position: THREE.Vector3;
  /** The pose it is being held in, and the one it had when it was taken. */
  rotation: THREE.Quaternion;
  startRotation: THREE.Quaternion;
  /** Hand pose at the moment the trigger went down. */
  handPosition: THREE.Vector3;
  handRotation: THREE.Quaternion;
  /** Forward and right of the head back then: "left" means the player's left. */
  forward: THREE.Vector3;
  right: THREE.Vector3;
  /** Speed the prop is being carried at, for the throw when it is let go. */
  velocity: THREE.Vector3;
}

/**
 * Translation glove: grabbing at a distance, in two flavours.
 *
 * Point at something and hold the trigger, and it is yours — up to 30 m away,
 * without it ever coming any closer.
 *
 * - **Halten**: the prop hangs exactly where it is. Gravity is off, nothing
 *   falls, and turning your hand turns it on the spot. For putting something
 *   straight that stands on a shelf you cannot reach.
 * - **Steuern**: your hand becomes a joystick from the moment you grabbed.
 *   Hold it to the left and the prop drifts left, push it forward and the prop
 *   goes away from you, lift it and it rises — the further out of the middle,
 *   the faster. Let go and it drops where it is, with the speed it had.
 *
 * "Left" and "forward" are the player's, not the world's: both are taken from
 * where the head looked when the grab started, so the prop goes where the hand
 * gestures, whichever way it is turned.
 *
 * `A` (or the grab button) switches between the two. Like the gravity glove it
 * stays in the hand until it is put back on the belt.
 */
export class TranslateGloveTool extends Tool {
  override readonly toolId = 'translate-glove';
  override readonly label = 'Translationshandschuh';

  private readonly ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
  private readonly core: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private readonly beam: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly display: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private mode: GloveMode = 'hold';
  private hold: Hold | null = null;
  private glow = 0;

  constructor() {
    super();
    this.name = 'tool-translate-glove';
    this.icon = 'glove';
    this.accent = 0x64e0c8;
    this.sticky = true;
    this.hint = 'Trigger hält aus der Ferne · A wechselt Halten/Steuern';
    this.holdPosition.set(0, -0.01, 0.02);

    const shell = new THREE.MeshStandardMaterial({
      color: 0x2f4a48,
      roughness: 0.5,
      metalness: 0.4,
    });

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.03, 0.11), shell);
    back.position.set(0, 0.005, -0.02);
    this.add(back);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.018, 0.08), shell);
      rail.position.set(side * 0.036, 0.005, -0.05);
      this.add(rail);
    }

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.042, 0.007, 10, 26),
      new THREE.MeshStandardMaterial({
        color: 0x64e0c8,
        emissive: new THREE.Color(0x64e0c8).multiplyScalar(0.4),
        roughness: 0.3,
        metalness: 0.5,
      }),
    );
    this.ring.position.set(0, 0.005, -0.088);
    this.add(this.ring);

    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xd6fff5, toneMapped: false }),
    );
    this.core.position.copy(this.ring.position);
    this.add(this.core);

    this.beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0x64e0c8, transparent: true, opacity: 0.55 }),
    );
    this.beam.frustumCulled = false;
    this.beam.visible = false;

    // The mode is written on the back of the hand, where a glance finds it.
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 96;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.display = new THREE.Mesh(
      new THREE.PlaneGeometry(0.07, 0.026),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false }),
    );
    this.display.position.set(0, 0.022, -0.02);
    this.display.rotation.x = -Math.PI / 2;
    this.add(this.display);
    this.draw();
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.beam.parent !== host.root) host.root.add(this.beam);
    this.beam.visible = false;
  }

  override onStow(host: ToolHost): void {
    this.release(host);
    this.beam.visible = false;
  }

  /** Both the grab button and `A` switch the mode — whichever finger is free. */
  override onGrab(controller: ControllerState, host: ToolHost): void {
    this.switchMode(controller, host);
  }

  override onPrimary(controller: ControllerState, host: ToolHost): void {
    this.switchMode(controller, host);
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    const entry = this.aimed(host);
    if (!entry) {
      host.notify('Nichts angepeilt');
      return;
    }
    this.take(entry, controller, host);
  }

  override onTriggerUp(_controller: ControllerState, host: ToolHost): void {
    this.release(host);
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    this.glow = Math.max(0, this.glow - dt * 2);
    const color = this.mode === 'hold' ? 0x64e0c8 : 0xffb35c;
    this.ring.material.emissive.setHex(color).multiplyScalar(0.35 + this.glow * 0.65);
    this.core.material.color.setHex(color).lerp(WHITE, 0.4 + this.glow * 0.5);
    this.core.scale.setScalar(1 + this.glow * 0.5);

    if (!controller || !this.heldBy) {
      this.release(host);
      this.beam.visible = false;
      return;
    }
    if (!this.hold) {
      this.beam.visible = false;
      return;
    }
    // Somebody else deleted it while we were holding on.
    if (!host.props().includes(this.hold.entry)) {
      this.hold = null;
      this.beam.visible = false;
      return;
    }

    if (this.mode === 'steer') this.steer(dt, controller);
    else this.keep(controller);
    this.carry();
    this.drawBeam();
  }

  override disposeTool(): void {
    disposeToolTree(this);
    this.beam.geometry.dispose();
    this.beam.material.dispose();
    this.beam.removeFromParent();
    this.texture.dispose();
  }

  /** What the glove is holding right now, if anything. */
  get carried(): PhysicsBody | null {
    return this.hold?.entry ?? null;
  }

  // --- holding ------------------------------------------------------------

  private take(entry: PhysicsBody, controller: ControllerState, host: ToolHost): void {
    if (this.hold) this.release(host);
    const rapier = host.physics.rapier;
    entry.body.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
    host.physics.setCarried(entry, true);

    const t = entry.body.translation();
    const r = entry.body.rotation();
    handPose(controller, _hand, _quaternion);
    host.ctx.rig.getHeadForward(_forward);
    _right.copy(_forward).cross(UP).normalize();

    this.hold = {
      entry,
      position: new THREE.Vector3(t.x, t.y, t.z),
      rotation: new THREE.Quaternion(r.x, r.y, r.z, r.w),
      startRotation: new THREE.Quaternion(r.x, r.y, r.z, r.w),
      handPosition: _hand.clone(),
      handRotation: _quaternion.clone(),
      forward: _forward.clone(),
      right: _right.clone(),
      velocity: new THREE.Vector3(),
    };
    this.glow = 1;
    controller.pulse(0.5, 35);
    playTone({ type: 'triangle', from: 420, to: 760, duration: 0.14, gain: 0.05 });
    host.notify(this.mode === 'hold' ? 'Gehalten · bleibt stehen' : 'Gesteuert · Hand führt');
  }

  /**
   * Lets go. Whatever speed the prop was being carried at becomes its own, so
   * a steered prop can be flung along instead of stopping dead in the air.
   */
  private release(host: ToolHost): void {
    const hold = this.hold;
    if (!hold) return;
    this.hold = null;
    this.beam.visible = false;
    const physics = host.physics;
    if (!physics.rapier) return;

    hold.entry.body.setBodyType(physics.rapier.RigidBodyType.Dynamic, true);
    physics.setCarried(hold.entry, false);
    hold.entry.body.setLinvel({ x: hold.velocity.x, y: hold.velocity.y, z: hold.velocity.z }, true);
    hold.entry.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    playTone({ type: 'sine', from: 520, to: 260, duration: 0.12, gain: 0.04 });
  }

  /** Mode "Halten": the prop stays put, the hand only turns it. */
  private keep(controller: ControllerState): void {
    const hold = this.hold!;
    handPose(controller, _hand, _quaternion);
    // However far the wrist has turned since the grab, the prop turns too.
    _delta.copy(_quaternion).multiply(_turn.copy(hold.handRotation).invert());
    hold.rotation.copy(_delta).multiply(hold.startRotation);
    hold.velocity.set(0, 0, 0);
  }

  /** Mode "Steuern": the hand leans, the prop travels. */
  private steer(dt: number, controller: ControllerState): void {
    const hold = this.hold!;
    handPose(controller, _hand, _quaternion);
    _offset.copy(_hand).sub(hold.handPosition);

    // Read the lean in the player's frame: right/up/forward as they stood.
    const sideways = _offset.dot(hold.right);
    const height = _offset.y;
    const ahead = _offset.dot(hold.forward);

    _velocity.set(0, 0, 0);
    _velocity.addScaledVector(hold.right, lean(sideways));
    _velocity.addScaledVector(UP, lean(height));
    _velocity.addScaledVector(hold.forward, lean(ahead));
    if (_velocity.lengthSq() > STEER_MAX * STEER_MAX) _velocity.setLength(STEER_MAX);

    hold.position.addScaledVector(_velocity, dt);
    hold.velocity.copy(_velocity);
  }

  /** Writes the pose we decided on into the physics body. */
  private carry(): void {
    const hold = this.hold!;
    _target.copy(hold.position);
    hold.entry.body.setNextKinematicTranslation(_target);
    hold.entry.body.setTranslation(_target, true);
    hold.entry.body.setNextKinematicRotation(hold.rotation);
    hold.entry.body.setRotation(hold.rotation, true);
  }

  private switchMode(controller: ControllerState, host: ToolHost): void {
    this.mode = this.mode === 'hold' ? 'steer' : 'hold';
    this.draw();
    controller.pulse(0.35, 20);
    host.notify(
      this.mode === 'hold'
        ? 'Halten · Objekt bleibt, wo es ist'
        : 'Steuern · Hand führt das Objekt',
    );
    // Switching mid-grab restarts the lean from wherever the hand is now.
    const hold = this.hold;
    if (!hold) return;
    handPose(controller, _hand, _quaternion);
    hold.handPosition.copy(_hand);
    hold.handRotation.copy(_quaternion);
    hold.startRotation.copy(hold.rotation);
  }

  /** The prop the glove currently points at, if any. */
  private aimed(host: ToolHost): PhysicsBody | null {
    this.core.getWorldPosition(_origin);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    return host.aimAt(_origin, _direction, RANGE);
  }

  private drawBeam(): void {
    const hold = this.hold!;
    this.core.getWorldPosition(_origin);
    const positions = this.beam.geometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(0, _origin.x, _origin.y, _origin.z);
    positions.setXYZ(1, hold.position.x, hold.position.y, hold.position.z);
    positions.needsUpdate = true;
    this.beam.geometry.computeBoundingSphere();
    this.beam.material.color.setHex(this.mode === 'hold' ? 0x64e0c8 : 0xffb35c);
    this.beam.visible = true;
  }

  private draw(): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 96);
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 88, 20);
    ctx.fillStyle = 'rgba(8, 18, 22, 0.9)';
    ctx.fill();
    ctx.strokeStyle = this.mode === 'hold' ? '#64e0c8' : '#ffb35c';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 42px system-ui, sans-serif';
    ctx.fillText(this.mode === 'hold' ? 'HALTEN' : 'STEUERN', 128, 50);
    this.texture.needsUpdate = true;
  }
}

/** Speed one axis of the lean asks for, with the deadzone taken out. */
function lean(value: number): number {
  const amount = Math.abs(value) - DEADZONE;
  if (amount <= 0) return 0;
  return Math.sign(value) * amount * STEER_GAIN;
}

function handPose(
  controller: ControllerState,
  position: THREE.Vector3,
  rotation: THREE.Quaternion,
): void {
  const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
  anchor.getWorldPosition(position);
  anchor.getWorldQuaternion(rotation);
}
