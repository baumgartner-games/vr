import * as THREE from 'three';
import type { Locomotion } from '../../core/Locomotion';
import type { PlayerRig } from '../../core/PlayerRig';

/**
 * **Der Stock geht in die 2D-Runde, nicht in die Physik.**
 *
 * Solange die 2D-Runde der Rechenkern der 3D-Welt ist (`flatKernel.ts`),
 * bewegt kein Wunsch das Gestell direkt: Was Brille, Tastatur oder
 * Bildschirmstock wollen, wird hier nur **festgehalten**; die Welt macht
 * daraus den Stock der Runde, die Runde tut den Schritt, und danach setzt
 * die Welt das Gestell dorthin, wo die Figur auf der Karte steht. Die
 * Rapier-Kapsel darunter (`PhysicsLocomotion`) bleibt bestehen — Requisiten,
 * Werkzeuge und Hände brauchen sie — und wird nach jedem Schritt unter den
 * Kopf gezogen (`resync`), statt selbst zu laufen.
 *
 * `active` schaltet um: Außerhalb der Station — im Übungslabor, das die
 * Karte nicht kennt — läuft wieder die Physik, als wäre der Kern nicht da.
 */
export class KernelLocomotion implements Locomotion {
  /** Der letzte Wunsch in m/s, wie ihn die Bedienung gestellt hat. */
  readonly wish = new THREE.Vector3();
  /** Ob der Kern den Schritt tut (sonst die Physik darunter). */
  active = true;

  constructor(private readonly inner: Locomotion) {}

  /** Die Runde springt nicht; außerhalb gilt, was die Physik darunter kann. */
  get canJump(): boolean {
    return !this.active && this.inner.canJump !== false;
  }

  apply(rig: PlayerRig, velocity: THREE.Vector3, jump: boolean, dt: number): void {
    this.wish.copy(velocity);
    if (!this.active) this.inner.apply(rig, velocity, jump, dt);
  }

  teleport(rig: PlayerRig, transform: THREE.Matrix4): void {
    this.inner.teleport?.(rig, transform);
  }

  resync(rig: PlayerRig): void {
    this.inner.resync?.(rig);
  }

  setFlight(velocity: THREE.Vector3 | null): void {
    this.inner.setFlight?.(velocity);
  }

  dispose(): void {
    this.inner.dispose?.();
  }
}
