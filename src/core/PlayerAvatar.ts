import * as THREE from 'three';
import type { PlayerRig } from './PlayerRig';
import type { XRInput } from './XRInput';

/**
 * Objects on this layer are only drawn by portal views, never by the eye
 * itself — that is where the whole avatar lives: you see your hands directly,
 * but your body only when you look at yourself through a portal.
 */
export const LAYER_SELF_ONLY = 3;

const _headPos = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _shoulder = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _hip = new THREE.Vector3();
const _foot = new THREE.Vector3();
const _joint = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _bend = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _perpendicular = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _down = new THREE.Vector3(0, -1, 0);
const _previous = new THREE.Vector3();

/** A capsule segment between two points. */
class Bone extends THREE.Mesh<THREE.CapsuleGeometry, THREE.Material> {
  constructor(radius: number, material: THREE.Material) {
    super(new THREE.CapsuleGeometry(radius, 1, 4, 10), material);
    this.frustumCulled = false;
  }

  stretch(from: THREE.Vector3, to: THREE.Vector3): void {
    _dir.copy(to).sub(from);
    const length = Math.max(_dir.length(), 0.02);
    this.position.copy(from).add(to).multiplyScalar(0.5);
    this.quaternion.setFromUnitVectors(_up, _dir.divideScalar(length));
    this.scale.set(1, length / 1.2, 1);
  }
}

/**
 * A simple body for the player: visible when looking down at yourself and —
 * head included — when looking at yourself through a portal.
 */
export class PlayerAvatar extends THREE.Group {
  /** Yaw of the torso; follows the head with a dead zone, like a real body. */
  bodyYaw = 0;

  private readonly head: THREE.Group;
  private readonly torso: THREE.Mesh;
  private readonly neck: THREE.Mesh;
  private readonly hips: THREE.Mesh;
  private readonly arms: Array<[Bone, Bone]> = [];
  private readonly legs: Array<[Bone, Bone]> = [];
  private readonly materials: THREE.Material[] = [];
  private walkPhase = 0;
  private speed = 0;

  constructor(color = 0x3f6fb5) {
    super();
    this.name = 'player-avatar';

    const suit = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.15 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1d2434, roughness: 0.7 });
    this.materials.push(suit, dark);

    // Tapered and oval: reads as a chest, also when looking straight down.
    this.torso = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 1, 12), suit);
    this.torso.frustumCulled = false;
    this.add(this.torso);

    this.neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.12, 8), dark);
    this.neck.frustumCulled = false;
    this.add(this.neck);

    this.hips = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.2), dark);
    this.hips.frustumCulled = false;
    this.add(this.hips);

    for (let i = 0; i < 2; i++) {
      const upper = new Bone(0.048, suit);
      const lower = new Bone(0.042, suit);
      this.add(upper, lower);
      this.arms.push([upper, lower]);

      const thigh = new Bone(0.075, dark);
      const shin = new Bone(0.06, dark);
      this.add(thigh, shin);
      this.legs.push([thigh, shin]);
    }

    this.head = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.21, 0.22), suit);
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.06, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x0a0f1c }),
    );
    visor.position.set(0, 0.01, -0.115);
    this.head.add(skull, visor);
    this.add(this.head);

    this.traverse((object) => object.layers.set(LAYER_SELF_ONLY));
  }

  /**
   * @param rig       the avatar is a child of this rig, so everything is local
   * @param headLocal head pose in rig space
   */
  update(dt: number, rig: PlayerRig, input: XRInput, headLocal: THREE.Matrix4): void {
    _headPos.setFromMatrixPosition(headLocal);
    const height = Math.max(rig.getHeadHeight(), 0.8);

    // Torso yaw trails the head; it only catches up past a dead zone.
    _forward.set(-headLocal.elements[8]!, 0, -headLocal.elements[10]!);
    // three's yaw convention: rotation.y = 0 looks along -Z.
    const headYaw = Math.atan2(-_forward.x, -_forward.z);
    const difference = wrapAngle(headYaw - this.bodyYaw);
    const slack = THREE.MathUtils.degToRad(38);
    if (Math.abs(difference) > slack) {
      this.bodyYaw += difference - Math.sign(difference) * slack;
    } else if (this.speed > 0.4) {
      this.bodyYaw += difference * Math.min(1, dt * 4);
    }

    this.head.position.copy(_headPos);
    this.head.quaternion.setFromRotationMatrix(headLocal);

    const neckY = _headPos.y - 0.3;
    const hipY = height * 0.53;
    const sin = Math.sin(this.bodyYaw);
    const cos = Math.cos(this.bodyYaw);
    const side = (offset: number, forward: number, target: THREE.Vector3, y: number) =>
      target.set(_headPos.x + cos * offset + sin * forward, y, _headPos.z - sin * offset + cos * forward);

    // The spine sits behind the eyes, otherwise the chest fills the whole view.
    side(0, 0.1, _joint, neckY);
    side(0, 0.07, _hip, hipY);
    this.hips.position.copy(_hip);
    this.hips.rotation.set(0, this.bodyYaw, 0);
    this.torso.position.copy(_hip).add(_joint).multiplyScalar(0.5);
    this.torso.rotation.set(0, this.bodyYaw, 0);
    this.torso.scale.set(1, Math.max(_joint.y - _hip.y, 0.1), 0.62);
    this.neck.position.copy(_joint).lerp(_headPos, 0.45);
    this.neck.rotation.set(0, this.bodyYaw, 0);

    // Walking pushes the legs; standing still lets them rest.
    this.speed += (this.horizontalSpeed(rig, dt) - this.speed) * Math.min(1, dt * 8);
    this.walkPhase += dt * Math.min(this.speed, 3) * 4.4;
    const swing = Math.min(this.speed * 0.22, 0.55);

    for (let i = 0; i < 2; i++) {
      const sign = i === 0 ? -1 : 1;

      // Arms: reach for the controller when it is tracked, otherwise hang down.
      side(sign * 0.2, 0.09, _shoulder, neckY - 0.05);
      const controller = input.controllers.find(
        (c) => c.handedness === (sign < 0 ? 'left' : 'right'),
      );
      if (controller?.tracked) {
        _hand.copy(controller.grip.visible ? controller.grip.position : controller.targetRay.position);
      } else {
        side(sign * 0.26, 0.02, _hand, hipY + 0.06);
      }
      solveTwoBone(_shoulder, _hand, 0.29, _bend.set(0, -1, 0), _joint);
      this.arms[i]![0].stretch(_shoulder, _joint);
      this.arms[i]![1].stretch(_joint, _hand);

      // Legs: a plain pendulum walk cycle, feet on the floor when standing.
      side(sign * 0.1, 0.05, _hip, hipY);
      const phase = this.walkPhase + (i === 0 ? 0 : Math.PI);
      const stride = Math.sin(phase) * swing;
      const lift = Math.max(0, Math.cos(phase)) * swing * 0.35;
      _foot
        .set(_hip.x + sin * stride * hipY, lift, _hip.z + cos * stride * hipY)
        .addScaledVector(_down, -0.02);
      solveTwoBone(_hip, _foot, hipY * 0.54, _bend.set(sin, 0, cos), _joint);
      this.legs[i]![0].stretch(_hip, _joint);
      this.legs[i]![1].stretch(_joint, _foot);
    }
  }

  dispose(): void {
    this.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    for (const material of this.materials) material.dispose();
    this.removeFromParent();
  }

  private horizontalSpeed(rig: PlayerRig, dt: number): number {
    const distance = Math.hypot(rig.position.x - _previous.x, rig.position.z - _previous.z);
    _previous.set(rig.position.x, 0, rig.position.z);
    return dt > 0 ? Math.min(distance / dt, 8) : 0;
  }
}

/**
 * Places the middle joint of a two bone chain of equal length, bending towards
 * `preferred`.
 */
function solveTwoBone(
  from: THREE.Vector3,
  to: THREE.Vector3,
  boneLength: number,
  preferred: THREE.Vector3,
  target: THREE.Vector3,
): void {
  _axis.copy(to).sub(from);
  const distance = Math.min(_axis.length(), boneLength * 2 - 0.001);
  if (distance < 1e-4) {
    target.copy(from).addScaledVector(preferred, boneLength);
    return;
  }
  _axis.normalize();
  _perpendicular.copy(preferred).addScaledVector(_axis, -preferred.dot(_axis));
  if (_perpendicular.lengthSq() < 1e-6) {
    _perpendicular.set(0, 0, 1).addScaledVector(_axis, -_axis.z);
  }
  _perpendicular.normalize();
  const offset = Math.sqrt(Math.max(0, boneLength * boneLength - (distance / 2) ** 2));
  target
    .copy(from)
    .addScaledVector(_axis, distance / 2)
    .addScaledVector(_perpendicular, offset);
}

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
