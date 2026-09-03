import * as THREE from 'three';
import type { PlayerRig } from './PlayerRig';

const _head = new THREE.Vector3();
const _target = new THREE.Vector3();
const _delta = new THREE.Vector3();

/**
 * Decides how the player's movement intent turns into actual motion. The hub
 * just slides along the floor; the portal lab plugs in a physics character.
 */
export interface Locomotion {
  /**
   * @param velocity desired horizontal velocity in m/s (world space)
   * @param jump     jump was requested this frame
   */
  apply(rig: PlayerRig, velocity: THREE.Vector3, jump: boolean, dt: number): void;
  /** Called after a portal moved the rig, so the body can follow. */
  teleport?(rig: PlayerRig, transform: THREE.Matrix4): void;
  /** Called after something else moved the rig, e.g. leaving a spectator view. */
  resync?(rig: PlayerRig): void;
  dispose?(): void;
}

/** Frictionless gliding inside an optional box — no gravity, no collisions. */
export class FreeLocomotion implements Locomotion {
  constructor(public bounds: THREE.Box3 | null = null) {}

  apply(rig: PlayerRig, velocity: THREE.Vector3, _jump: boolean, dt: number): void {
    if (velocity.lengthSq() === 0) return;
    rig.getHeadPosition(_head);
    _target.copy(_head).addScaledVector(velocity, dt);
    if (this.bounds) {
      _target.x = THREE.MathUtils.clamp(_target.x, this.bounds.min.x, this.bounds.max.x);
      _target.z = THREE.MathUtils.clamp(_target.z, this.bounds.min.z, this.bounds.max.z);
    }
    rig.position.add(_delta.copy(_target).sub(_head));
    rig.updateMatrixWorld(true);
  }
}
