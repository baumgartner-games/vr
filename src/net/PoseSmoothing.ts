import * as THREE from 'three';
import type { PoseArray } from './types';

/**
 * Poses arrive a couple of dozen times per second; drawing them raw looks like
 * a slideshow. This chases the latest sample exponentially, which is stable no
 * matter how irregular the packets are.
 */
export class SmoothPose {
  readonly position = new THREE.Vector3();
  readonly quaternion = new THREE.Quaternion();

  /** False until the first sample arrived — nothing to draw before that. */
  primed = false;

  private readonly targetPosition = new THREE.Vector3();
  private readonly targetQuaternion = new THREE.Quaternion();

  setTarget(pose: PoseArray): void {
    this.targetPosition.set(pose[0], pose[1], pose[2]);
    this.targetQuaternion.set(pose[3], pose[4], pose[5], pose[6]);
    if (!this.primed) {
      this.position.copy(this.targetPosition);
      this.quaternion.copy(this.targetQuaternion);
      this.primed = true;
    }
  }

  /**
   * @param tau seconds to close ~63 % of the gap; 0 snaps.
   * @param rotationTau separate constant for the rotation, defaults to `tau`.
   */
  update(dt: number, tau: number, rotationTau = tau): void {
    if (!this.primed) return;
    this.position.lerp(this.targetPosition, weight(dt, tau));
    this.quaternion.slerp(this.targetQuaternion, weight(dt, rotationTau));
  }

  reset(): void {
    this.primed = false;
  }
}

/** Frame-rate independent smoothing weight. */
export function weight(dt: number, tau: number): number {
  return tau <= 0 ? 1 : 1 - Math.exp(-dt / tau);
}

/** Shortest-path angle interpolation, for yaw that must not wrap the long way. */
export function smoothAngle(current: number, target: number, dt: number, tau: number): number {
  let delta = (target - current) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * weight(dt, tau);
}
