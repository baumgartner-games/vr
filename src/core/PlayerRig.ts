import * as THREE from 'three';
import type { XRInput } from './XRInput';

const UP = new THREE.Vector3(0, 1, 0);
const _head = new THREE.Vector3();
const _target = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _mat = new THREE.Matrix4();
const _scale = new THREE.Vector3();
const _move = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _strafe = new THREE.Vector3();

/** Filters an intended head movement, e.g. to stop the player inside a wall. */
export type MoveFilter = (from: THREE.Vector3, to: THREE.Vector3) => THREE.Vector3;

/**
 * The player's "room": the camera and all controllers live inside this group,
 * so moving/rotating the rig moves the player without touching the headset pose.
 */
export class PlayerRig extends THREE.Group {
  /** Metres per second for stick locomotion. */
  moveSpeed = 2.4;
  /** Radians per snap turn. */
  snapAngle = THREE.MathUtils.degToRad(30);
  /** Eye height used while not in VR. */
  flatEyeHeight = 1.65;

  private moveFilter: MoveFilter | null = null;
  private snapArmed = true;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    readonly camera: THREE.PerspectiveCamera,
  ) {
    super();
    this.name = 'player-rig';
    this.add(camera);
    camera.position.set(0, this.flatEyeHeight, 0);
  }

  setMoveFilter(filter: MoveFilter | null): void {
    this.moveFilter = filter;
  }

  /** Head pose in world space. Fresh, even before the frame has been rendered. */
  getHeadMatrix(target: THREE.Matrix4): THREE.Matrix4 {
    if (this.renderer.xr.isPresenting) this.renderer.xr.updateCamera(this.camera);
    return target.copy(this.camera.matrixWorld);
  }

  getHeadPosition(target: THREE.Vector3): THREE.Vector3 {
    this.getHeadMatrix(_mat);
    return target.setFromMatrixPosition(_mat);
  }

  /** Horizontal viewing direction of the head, normalised. */
  getHeadForward(target: THREE.Vector3): THREE.Vector3 {
    this.getHeadMatrix(_mat);
    target.set(-_mat.elements[8], 0, -_mat.elements[10]);
    if (target.lengthSq() < 1e-6) target.set(0, 0, -1);
    return target.normalize();
  }

  /** Moves the player by a world-space offset, honouring the move filter. */
  moveBy(offset: THREE.Vector3): void {
    if (offset.lengthSq() === 0) return;
    this.getHeadPosition(_head);
    _target.copy(_head).add(offset);
    if (this.moveFilter) _target.copy(this.moveFilter(_head, _target));
    this.position.add(_delta.copy(_target).sub(_head));
    this.updateMatrixWorld(true);
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
  }

  /** Places the player at a spawn point looking along `yaw` (radians). */
  placeAt(position: THREE.Vector3, yaw = 0): void {
    this.position.copy(position);
    this.quaternion.setFromEuler(_euler.set(0, yaw, 0));
    this.updateMatrixWorld(true);
  }

  /** Stick locomotion — used in VR; flat mode is handled by FlatControls. */
  update(dt: number, input: XRInput): void {
    const left = input.get('left');
    const right = input.get('right');

    const stick = left?.thumbstick;
    if (stick && (stick.x !== 0 || stick.y !== 0)) {
      this.getHeadForward(_forward);
      _strafe.copy(_forward).cross(UP).normalize();
      _move
        .set(0, 0, 0)
        .addScaledVector(_forward, -stick.y)
        .addScaledVector(_strafe, stick.x);
      if (_move.lengthSq() > 1) _move.normalize();
      this.moveBy(_move.multiplyScalar(this.moveSpeed * dt));
    }

    const turn = right?.thumbstick.x ?? 0;
    if (this.snapArmed && Math.abs(turn) > 0.7) {
      this.rotateAroundHead(-Math.sign(turn) * this.snapAngle);
      this.snapArmed = false;
    } else if (Math.abs(turn) < 0.35) {
      this.snapArmed = true;
    }
  }
}
