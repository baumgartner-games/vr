import * as THREE from 'three';
import type { XRInput } from './XRInput';
import { FreeLocomotion, type Locomotion } from './Locomotion';

const UP = new THREE.Vector3(0, 1, 0);
const _head = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _mat = new THREE.Matrix4();
const _scale = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _strafe = new THREE.Vector3();
const _delta = new THREE.Vector3();

/**
 * The player's "room": the camera and all controllers live inside this group,
 * so moving/rotating the rig moves the player without touching the headset pose.
 */
export class PlayerRig extends THREE.Group {
  /** Metres per second for stick locomotion. */
  moveSpeed = 2.6;
  /** How much faster sprinting is than walking. */
  sprintFactor = 1.9;
  /**
   * Sprint is held down by default (left stick pressed in). Switched over in
   * the settings it toggles instead — for anybody who does not want to keep a
   * stick pressed while crossing the whole map.
   */
  sprintToggle = false;
  /** Crouch toggles by default; held works the same way as sprint. */
  crouchToggle = true;
  /** How far the view drops while crouching. */
  crouchDepth = 0.55;
  /** Metres per second the view sinks and rises again. */
  crouchSpeed = 1.8;
  /** Radians per snap turn. */
  snapAngle = THREE.MathUtils.degToRad(30);
  /** Eye height used while not in VR. */
  flatEyeHeight = 1.65;

  locomotion: Locomotion = new FreeLocomotion();
  /**
   * Freezes locomotion and stick input. Set while a spectator view drives the
   * rig — the player is a camera then, not a body in the world.
   */
  paused = false;
  /**
   * The same, but asked for by the world instead of by the engine: the drone
   * takes the view away from the body, and a body that keeps walking and
   * falling while nobody is looking is a body you come back to somewhere else.
   * The engine folds this into `paused` every frame.
   */
  frozen = false;

  private readonly intent = new THREE.Vector3();
  private intentJump = false;
  private snapArmed = true;
  /**
   * How far the view currently sits below the standing pose. The headset owns
   * the camera inside the rig, so crouching can only happen by lowering the
   * rig itself — `getFloorY()` is what keeps the feet where they were.
   */
  private crouchOffset = 0;
  private crouchWanted = false;
  private sprintWanted = false;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    readonly camera: THREE.PerspectiveCamera,
  ) {
    super();
    this.name = 'player-rig';
    this.add(camera);
    camera.position.set(0, this.flatEyeHeight, 0);
  }

  setLocomotion(locomotion: Locomotion): void {
    this.locomotion.dispose?.();
    this.locomotion = locomotion;
  }

  /** Movement wish for this frame, in m/s. Flat controls feed this too. */
  setIntent(velocity: THREE.Vector3, jump = false): void {
    this.intent.copy(velocity);
    if (jump) this.intentJump = true;
  }

  requestJump(): void {
    this.intentJump = true;
  }

  /** Head pose in world space. Fresh, even before the frame has been rendered. */
  getHeadMatrix(target: THREE.Matrix4): THREE.Matrix4 {
    if (this.renderer.xr.isPresenting) this.renderer.xr.updateCamera(this.camera);
    return target.copy(this.camera.matrixWorld);
  }

  /**
   * Places the head at a world pose by moving the camera inside the rig — the
   * rig itself stays where the locomotion put it. Used by the spectator camera,
   * which borrows the view without disturbing the player's position.
   */
  setHeadWorldPose(position: THREE.Vector3, quaternion: THREE.Quaternion): void {
    this.updateMatrixWorld(true);
    _mat.copy(this.matrixWorld).invert();
    this.camera.position.copy(position).applyMatrix4(_mat);
    // The rig is never scaled, so the inverse's 3x3 part is a plain rotation.
    this.camera.quaternion.setFromRotationMatrix(_mat).multiply(quaternion);
    this.camera.updateMatrixWorld(true);
  }

  /**
   * Moves the whole rig so the head ends up at a world position, leaving its
   * orientation alone. In VR the headset owns the camera pose, so this is the
   * only way to put a spectating player somewhere else.
   */
  setHeadWorldPosition(position: THREE.Vector3): void {
    this.getHeadPosition(_head);
    this.position.add(_delta.copy(position).sub(_head));
    this.updateMatrixWorld(true);
  }

  getHeadPosition(target: THREE.Vector3): THREE.Vector3 {
    this.getHeadMatrix(_mat);
    return target.setFromMatrixPosition(_mat);
  }

  /** Eye height above the floor — crouching makes the body shorter, not lower. */
  getHeadHeight(): number {
    return Math.max(0.6, this.camera.position.y - this.crouchOffset);
  }

  /**
   * Where the feet are. The rig sinks while crouching, the floor does not —
   * everything that stands the player on the ground asks here, not for
   * `position.y`.
   */
  getFloorY(): number {
    return this.position.y + this.crouchOffset;
  }

  /** How far the view is currently dropped below the standing pose. */
  get crouch(): number {
    return this.crouchOffset;
  }

  /** True while the player is sprinting. */
  get sprinting(): boolean {
    return this.sprintWanted;
  }

  /** Stands back up, e.g. when a world is left. */
  standUp(): void {
    this.position.y -= this.crouchOffset;
    this.crouchOffset = 0;
    this.crouchWanted = false;
    this.sprintWanted = false;
    this.updateMatrixWorld(true);
  }

  /** Horizontal viewing direction of the head, normalised. */
  getHeadForward(target: THREE.Vector3): THREE.Vector3 {
    this.getHeadMatrix(_mat);
    target.set(-_mat.elements[8]!, 0, -_mat.elements[10]!);
    if (target.lengthSq() < 1e-6) target.set(0, 0, -1);
    return target.normalize();
  }

  /** Rotates the player around the head, so the world does not swing away. */
  rotateAroundHead(angle: number): void {
    this.getHeadPosition(_head);
    _quat.setFromAxisAngle(UP, angle);
    this.position.sub(_head).applyQuaternion(_quat).add(_head);
    this.quaternion.premultiply(_quat);
    this.updateMatrixWorld(true);
  }

  /**
   * Applies a world-space transform to the rig (portal traversal). Any tilt is
   * dropped so the horizon stays level.
   */
  applyWorldTransform(transform: THREE.Matrix4): void {
    this.updateMatrixWorld(true);
    _mat.multiplyMatrices(transform, this.matrixWorld);
    _mat.decompose(this.position, this.quaternion, _scale);
    _euler.setFromQuaternion(this.quaternion, 'YXZ');
    this.quaternion.setFromEuler(_euler.set(0, _euler.y, 0));
    this.scale.set(1, 1, 1);
    this.updateMatrixWorld(true);
    this.locomotion.teleport?.(this, transform);
  }

  /** Places the player at a spawn point looking along `yaw` (radians). */
  placeAt(position: THREE.Vector3, yaw = 0): void {
    // `position` is where the feet go; a crouching player sits below that.
    this.position.copy(position);
    this.position.y -= this.crouchOffset;
    this.quaternion.setFromEuler(_euler.set(0, yaw, 0));
    this.updateMatrixWorld(true);
  }

  /**
   * Reads the sticks while in VR, hands the movement wish to the locomotion and
   * resets the intent for the next frame.
   *
   * @param uiActive the pointer rests on a menu — the buttons belong to it then.
   */
  update(dt: number, input: XRInput, presenting: boolean, uiActive = false): void {
    if (this.paused) {
      this.intent.set(0, 0, 0);
      this.intentJump = false;
      return;
    }

    if (presenting) {
      const left = input.get('left');
      this.updateStance(dt, input);
      const stick = left?.thumbstick;
      if (stick && (stick.x !== 0 || stick.y !== 0)) {
        this.getHeadForward(_forward);
        _strafe.copy(_forward).cross(UP).normalize();
        _head.set(0, 0, 0).addScaledVector(_forward, -stick.y).addScaledVector(_strafe, stick.x);
        if (_head.lengthSq() > 1) _head.normalize();
        this.intent.copy(_head.multiplyScalar(this.speedNow()));
      }
      // A also confirms menu entries, so it must not jump while pointing at one.
      if (!uiActive && input.get('right')?.primary.justPressed) this.intentJump = true;
    }

    this.locomotion.apply(this, this.intent, this.intentJump, dt);
    this.intent.set(0, 0, 0);
    this.intentJump = false;

    if (presenting) {
      const turn = input.get('right')?.thumbstick.x ?? 0;
      if (this.snapArmed && Math.abs(turn) > 0.7) {
        this.rotateAroundHead(-Math.sign(turn) * this.snapAngle);
        this.snapArmed = false;
      } else if (Math.abs(turn) < 0.35) {
        this.snapArmed = true;
      }
    }
  }

  /** Walking speed right now — sprinting is a factor on top of it. */
  private speedNow(): number {
    return this.moveSpeed * (this.sprintWanted ? this.sprintFactor : 1);
  }

  /**
   * The sticks pressed in: left sprints, right crouches. Both can either be
   * held or toggled, which is what the settings switch between.
   *
   * Crouching lowers the rig, because in VR the headset — not us — decides
   * where the camera sits inside it. The body keeps its feet on the floor:
   * `getFloorY()` adds the drop back on, and the character controller shrinks
   * its capsule from the head height, which the drop has already shortened.
   */
  private updateStance(dt: number, input: XRInput): void {
    const left = input.get('left')?.stick;
    if (left) {
      if (this.sprintToggle) {
        if (left.justPressed) this.sprintWanted = !this.sprintWanted;
      } else {
        this.sprintWanted = left.pressed;
      }
    }

    const right = input.get('right')?.stick;
    if (right) {
      if (this.crouchToggle) {
        if (right.justPressed) this.crouchWanted = !this.crouchWanted;
      } else {
        this.crouchWanted = right.pressed;
      }
    }
    // Sprinting off somewhere stands the player up first — nobody sprints in
    // a crouch, and the two settings must not fight each other.
    const stick = input.get('left')?.thumbstick;
    const moving = stick ? stick.x !== 0 || stick.y !== 0 : false;
    if (this.crouchWanted && this.sprintWanted && moving) this.crouchWanted = false;

    const target = this.crouchWanted ? this.crouchDepth : 0;
    if (target === this.crouchOffset) return;
    const step = THREE.MathUtils.clamp(
      target - this.crouchOffset,
      -this.crouchSpeed * dt,
      this.crouchSpeed * dt,
    );
    this.crouchOffset += step;
    this.position.y -= step;
    this.updateMatrixWorld(true);
  }
}
