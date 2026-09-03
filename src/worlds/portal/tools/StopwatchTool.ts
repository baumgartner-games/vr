import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playStopwatch } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';

/** How slow the world runs while the watch is wound down. */
export const SLOW_SCALE = 0.22;
/** Seconds the change takes — the ramp is what sells it. */
const RAMP = 0.55;

/**
 * A stopwatch that slows the world down. Press the trigger and everything —
 * bullets above all — drifts; press again, or simply let the watch go, and it
 * snaps back to full speed.
 */
export class StopwatchTool extends Tool {
  override readonly toolId = 'stopwatch';
  override readonly label = 'Stoppuhr';

  private readonly hand: THREE.Mesh;
  private readonly sweepPivot: THREE.Group;
  private readonly face: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly crown: THREE.Mesh;
  private slow = false;
  /** 0 = normal speed, 1 = fully slowed; ramped so the change is audible. */
  private blend = 0;
  private sweep = 0;

  constructor() {
    super();
    this.name = 'tool-stopwatch';
    this.icon = 'stopwatch';
    this.accent = 0xffc857;
    this.hint = 'Trigger schaltet Zeitlupe · Loslassen normalisiert';
    this.holdPosition.set(0, -0.01, 0.02);

    const brass = new THREE.MeshStandardMaterial({
      color: 0xd9a441,
      roughness: 0.3,
      metalness: 0.75,
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1b2231, roughness: 0.6 });

    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.016, 28), brass);
    shell.rotation.x = Math.PI / 2;
    this.add(shell);

    this.face = new THREE.Mesh(
      new THREE.CircleGeometry(0.038, 28),
      new THREE.MeshBasicMaterial({ color: 0xf3f6fb, toneMapped: false }),
    );
    this.face.position.z = -0.009;
    this.add(this.face);

    // The second hand turns around a pivot sitting on the dial.
    this.sweepPivot = new THREE.Group();
    this.sweepPivot.name = 'stopwatch-pivot';
    this.sweepPivot.position.z = -0.011;
    this.hand = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.032, 0.002), dark);
    this.hand.position.set(0, 0.016, 0);
    this.sweepPivot.add(this.hand);
    this.add(this.sweepPivot);

    this.crown = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.014, 12), brass);
    this.crown.position.set(0, 0.05, 0);
    this.add(this.crown);
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    this.setSlow(!this.slow, host);
    controller.pulse(0.5, 40);
  }

  override onStow(host: ToolHost): void {
    // Letting go of the watch always gives the world its speed back.
    this.setSlow(false, host);
  }

  override update(dt: number, host: ToolHost, _controller: ControllerState | null): void {
    const target = this.slow ? 1 : 0;
    if (this.blend !== target) {
      const step = dt / RAMP;
      this.blend = target > this.blend ? Math.min(target, this.blend + step) : Math.max(target, this.blend - step);
      host.setTimeScale(1 + (SLOW_SCALE - 1) * this.blend);
    }

    // The second hand runs at whatever speed the world does.
    this.sweep += dt * (1 + (SLOW_SCALE - 1) * this.blend) * 2.2;
    this.sweepPivot.rotation.z = -this.sweep;
    this.face.material.color.setHex(this.blend > 0.5 ? 0xffe2ad : 0xf3f6fb);
    this.crown.position.y = 0.05 - this.blend * 0.004;
  }

  override disposeTool(): void {
    disposeToolTree(this);
  }

  private setSlow(slow: boolean, host: ToolHost): void {
    if (this.slow === slow) return;
    this.slow = slow;
    playStopwatch(slow);
    host.notify(slow ? 'Zeitlupe' : 'Normale Geschwindigkeit');
    if (!slow && this.blend === 0) host.setTimeScale(1);
  }
}
