import * as THREE from 'three';
import { AvatarBody, type AvatarLimb } from './AvatarBody';
import type { PlayerRig } from './PlayerRig';
import type { XRInput } from './XRInput';

/**
 * Objects on this layer are only drawn by portal views, never by the eye
 * itself — that is where the whole avatar lives: you see your hands directly,
 * but your body only when you look at yourself through a portal.
 */
export const LAYER_SELF_ONLY = 3;

const _head: AvatarLimb = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
const _left: AvatarLimb = { position: new THREE.Vector3() };
const _right: AvatarLimb = { position: new THREE.Vector3() };
const _local = new THREE.Matrix4();
const _scale = new THREE.Vector3();

/**
 * The local player's body. Lives inside the rig, so everything it is fed is in
 * rig space, and sits on a layer only the portal views render.
 */
export class PlayerAvatar extends AvatarBody {
  /**
   * The rig pose the body was standing in when the view left, in world space.
   *
   * Not the head: the skeleton is built in this group's parent space with the
   * floor at y = 0, so what has to be held still is the *frame*, not a point
   * inside it. While the view is away the group is put back into this frame
   * every frame, and the head keeps the pose it had inside it — which is why
   * a drone climbing ten metres no longer stretches the body it left behind.
   */
  private readonly anchor = new THREE.Matrix4();
  /** Head pose inside that frozen frame — constant for as long as it lasts. */
  private readonly frozenHead: AvatarLimb = {
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
  };
  private detached = false;

  constructor(color = 0x3f6fb5) {
    super({ color });
    this.name = 'player-avatar';
    this.setLayer(LAYER_SELF_ONLY);
  }

  /**
   * Leaves the body where it stands and lets its owner see it.
   *
   * The drone takes the *view* somewhere else while the body stays behind — so
   * for as long as that lasts, the avatar has to stop following the head, and
   * it has to be drawn for the eye that is looking back at it. Both come back
   * with `comeBack`.
   *
   * @param headWorld the head pose to freeze the body at, in world space
   */
  leaveBehind(headWorld: THREE.Matrix4): void {
    if (this.detached) return;
    this.detached = true;
    const parent = this.parent;
    parent?.updateWorldMatrix(true, false);
    this.anchor.copy(parent ? parent.matrixWorld : _local.identity());
    // The head, once, in the frame that is being frozen — from here on the
    // body is simply that pose, standing still.
    _local.copy(this.anchor).invert().multiply(headWorld);
    this.frozenHead.position.setFromMatrixPosition(_local);
    this.frozenHead.quaternion!.setFromRotationMatrix(_local);
    // Layer 0 is what every camera draws; up to now only the portal views did.
    this.setLayer(0);
  }

  /** Body back under the head, and invisible to its own eye again. */
  comeBack(): void {
    if (!this.detached) return;
    this.detached = false;
    this.position.set(0, 0, 0);
    this.quaternion.identity();
    this.setLayer(LAYER_SELF_ONLY);
  }

  /**
   * @param rig       the avatar is a child of this rig, so everything is local
   * @param headLocal head pose in rig space
   */
  updateFromRig(dt: number, rig: PlayerRig, input: XRInput, headLocal: THREE.Matrix4): void {
    if (this.detached) {
      // The rig flies out with the drone; the body does not. Putting the whole
      // *group* back into the frame it was left in keeps its floor at y = 0
      // and its head where it was — feeding a moving rig space a fixed world
      // pose instead is what used to pull the legs and the neck out of shape
      // every time the machine climbed or turned.
      rig.updateMatrixWorld(true);
      _local.copy(rig.matrixWorld).invert().multiply(this.anchor);
      _local.decompose(this.position, this.quaternion, _scale);
      this.updateMatrixWorld(true);
      // The hands went with you; the body left behind just lets its arms hang.
      this.update(dt, this.frozenHead, null, null);
      return;
    }

    _head.position.setFromMatrixPosition(headLocal);
    _head.quaternion!.setFromRotationMatrix(headLocal);
    void rig;

    const left = handOf(input, 'left', _left);
    const right = handOf(input, 'right', _right);
    this.update(dt, _head, left, right);
  }

  private setLayer(layer: number): void {
    this.traverse((object) => object.layers.set(layer));
  }
}

function handOf(input: XRInput, side: 'left' | 'right', target: AvatarLimb): AvatarLimb | null {
  const controller = input.controllers.find((c) => c.handedness === side);
  if (!controller?.tracked) return null;
  const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
  target.position.copy(anchor.position);
  return target;
}
