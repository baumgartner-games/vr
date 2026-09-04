import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playTone } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';

/** How many turns a second a thrown star makes. */
export const SPIN_RATE = 22;
/** The slowest throw that still counts as one; below it the star just drops. */
export const THROW_SPEED = 2.2;

/**
 * Wurfstern: the one tool that is meant to be let go of.
 *
 * Every other tool falls to the floor when the grip opens, which is what a
 * dropped thing does. A shuriken is different: let go of it while the arm is
 * moving and it carries on along the line it was travelling — no arc, no
 * slowing down — until it meets something, and then it stays there, stuck in
 * the wall or in the crate it hit.
 *
 * Five of them may be out in the room at once (`looseLimit`); pulling a sixth
 * off the belt takes the oldest one back. Everything about that is in
 * `PortalWorld`, which owns the bodies — the tool only says how it behaves and
 * what it looks like.
 *
 * Held in the fingertips rather than in a fist: the plane of the star lies
 * along the throwing direction, spinning around the axis across it, which is
 * how a real one flies and the only orientation in which it goes into a wall
 * point first instead of slapping it flat.
 */
export class ShurikenTool extends Tool {
  override readonly toolId = 'shuriken';
  override readonly label = 'Wurfstern';

  constructor() {
    super();
    this.name = 'tool-shuriken';
    this.icon = 'tools';
    this.accent = 0xc8d4e6;
    this.hint = 'Loslassen wirft · bleibt stecken, wo er trifft';
    // Five in the air, and the sixth off the hip fetches the first one back.
    this.looseLimit = 5;
    this.glides = true;
    // Held between the fingertips, edge forward, a little ahead of the grip.
    this.holdPosition.set(0, -0.005, -0.02);

    const steel = new THREE.MeshStandardMaterial({
      color: 0xc8d4e6,
      roughness: 0.25,
      metalness: 0.85,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x2b3040,
      roughness: 0.6,
      metalness: 0.4,
    });

    // The blades live in the YZ plane and the star turns around its own X, so
    // the flight direction (-Z) lies *in* the plane: it goes in point first.
    const blades = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.055, 4), steel);
      // The cone grows along +Y; turning it around X spreads the four points
      // around the same axis the star spins on.
      point.position.set(0, 0.036, 0);
      point.rotation.y = Math.PI / 4;
      const arm = new THREE.Group();
      arm.rotation.x = (i / 4) * Math.PI * 2;
      arm.add(point);
      blades.add(arm);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.005, 12), dark);
    hub.rotation.z = Math.PI / 2;
    blades.add(hub);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 6, 16), steel);
    ring.rotation.y = Math.PI / 2;
    blades.add(ring);
    this.add(blades);
  }

  /** A short whirr, so a throw is heard as well as seen. */
  override onThrow(_host: ToolHost, speed: number): void {
    if (speed < THROW_SPEED) return;
    playTone({ type: 'sawtooth', from: 300, to: 860, duration: 0.12, gain: 0.04 });
  }

  override onStick(_host: ToolHost): void {
    playTone({ type: 'square', from: 1200, to: 420, duration: 0.09, gain: 0.05 });
  }

  override onTake(controller: ControllerState, _host: ToolHost): void {
    controller.pulse(0.3, 20);
  }

  override disposeTool(): void {
    disposeToolTree(this);
  }
}
