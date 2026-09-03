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

/**
 * The local player's body. Lives inside the rig, so everything it is fed is in
 * rig space, and sits on a layer only the portal views render.
 */
export class PlayerAvatar extends AvatarBody {
  /** Where the body stands while the view is away, in world space. */
  private readonly anchor = new THREE.Matrix4();
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
    this.anchor.copy(headWorld);
    if (this.detached) return;
    this.detached = true;
    // Layer 0 is what every camera draws; up to now only the portal views did.
    this.setLayer(0);
  }

  /** Body back under the head, and invisible to its own eye again. */
  comeBack(): void {
    if (!this.detached) return;
    this.detached = false;
    this.setLayer(LAYER_SELF_ONLY);
  }

  /**
   * @param rig       the avatar is a child of this rig, so everything is local
   * @param headLocal head pose in rig space
   */
  updateFromRig(dt: number, rig: PlayerRig, input: XRInput, headLocal: THREE.Matrix4): void {
    if (this.detached) {
      // The rig is being carried out to the drone, so the frozen world pose
      // has to be brought back into its (moving) space every frame.
      rig.updateMatrixWorld(true);
      _local.copy(rig.matrixWorld).invert().multiply(this.anchor);
      _head.position.setFromMatrixPosition(_local);
      _head.quaternion!.setFromRotationMatrix(_local);
      // The hands went with you; the body left behind just lets its arms hang.
      this.update(dt, _head, null, null);
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
