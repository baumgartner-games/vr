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

/**
 * The local player's body. Lives inside the rig, so everything it is fed is in
 * rig space, and sits on a layer only the portal views render.
 */
export class PlayerAvatar extends AvatarBody {
  constructor(color = 0x3f6fb5) {
    super({ color });
    this.name = 'player-avatar';
    this.traverse((object) => object.layers.set(LAYER_SELF_ONLY));
  }

  /**
   * @param rig       the avatar is a child of this rig, so everything is local
   * @param headLocal head pose in rig space
   */
  updateFromRig(dt: number, rig: PlayerRig, input: XRInput, headLocal: THREE.Matrix4): void {
    _head.position.setFromMatrixPosition(headLocal);
    _head.quaternion!.setFromRotationMatrix(headLocal);
    void rig;

    const left = handOf(input, 'left', _left);
    const right = handOf(input, 'right', _right);
    this.update(dt, _head, left, right);
  }
}

function handOf(input: XRInput, side: 'left' | 'right', target: AvatarLimb): AvatarLimb | null {
  const controller = input.controllers.find((c) => c.handedness === side);
  if (!controller?.tracked) return null;
  const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
  target.position.copy(anchor.position);
  return target;
}
