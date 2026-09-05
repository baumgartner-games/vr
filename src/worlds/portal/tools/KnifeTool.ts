import * as THREE from 'three';
import { Tool, disposeToolTree, grabMaterial, type ToolHost } from './Tool';
import { POLE_HOLD_POSITION } from './poleGrip';
import { playTone } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';

/** How many turns a second a thrown knife makes. */
export const SPIN_RATE = 6;
/** The slowest throw that still counts as one; below it the knife just drops. */
export const THROW_SPEED = 2.2;

/** Halbmesser des Griffs — ein Stab, der in die Faust passt (`POLE_GRIP`). */
const HANDLE_R = 0.016;
/** Der Griff, von hinten nach vorn, auf der z-Achse. */
const HANDLE_BACK = 0.06;
const HANDLE_FRONT = -0.05;
/** Die Klinge, davor. */
const BLADE_LENGTH = 0.15;
const BLADE_WIDTH = 0.03;
const BLADE_THICK = 0.004;

/**
 * **Das Messer** — das eine Werkzeug, das zum Loslassen gedacht ist.
 *
 * Es war einmal ein Wurfstern, und der hatte keinen Griff: er lag „in den
 * Fingerspitzen", also nirgends, und eine Boxhand, die nichts umschließt, sieht
 * an ihm nach nichts aus. Ein Messer hat einen **Griff**, und der ist ein Stab
 * wie der Stiel des Hammers: er liegt auf der z-Achse durch den Griffpunkt, in
 * Greiffarbe, die Faust darum (`POLE_HAND_POSE`), die Klinge nach vorn —
 * dorthin, wohin man zeigt, wie bei jedem Werkzeug.
 *
 * Geworfen wird es wie der Stern: let go of it while the arm is moving and it
 * carries on along the line it was travelling — no arc, no slowing down —
 * until it meets something, and then it stays there, stuck in the wall or in
 * the crate it hit. Five of them may be out in the room at once
 * (`looseLimit`); pulling a sixth off the belt takes the oldest one back.
 * Everything about that is in `PortalWorld`, which owns the bodies — the tool
 * only says how it behaves and what it looks like.
 */
export class KnifeTool extends Tool {
  override readonly toolId = 'knife';
  override readonly label = 'Messer';

  constructor() {
    super();
    this.name = 'tool-knife';
    this.icon = 'tools';
    this.accent = 0xc8d4e6;
    this.hint = 'Loslassen wirft · bleibt stecken, wo es trifft';
    // Five in the air, and the sixth off the hip fetches the first one back.
    this.looseLimit = 5;
    this.glides = true;
    // Ein Stab in der Faust, wie der Hammer.
    this.holdPosition.set(POLE_HOLD_POSITION.x, POLE_HOLD_POSITION.y, POLE_HOLD_POSITION.z);

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

    // Der Griff: ein glatter Zylinder in Greiffarbe — ohne Ellipse und ohne
    // Rillen, wie der Stiel des Hammers, denn beide zeigten eine Richtung an,
    // und ein Stab in der Faust hat keine. Zylinder wachsen entlang +y; eine
    // Vierteldrehung legt ihn auf z.
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(HANDLE_R, HANDLE_R * 1.1, HANDLE_BACK - HANDLE_FRONT, 14),
      grabMaterial(),
    );
    handle.rotation.x = Math.PI / 2;
    handle.position.z = (HANDLE_BACK + HANDLE_FRONT) / 2;
    this.add(handle);

    // Ein Knauf hinten, damit die Faust etwas hat, wogegen sie zieht.
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(HANDLE_R * 1.2, 12, 8), dark);
    pommel.position.z = HANDLE_BACK;
    this.add(pommel);

    // Das Heft: ein Querbalken zwischen Griff und Klinge.
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.008), dark);
    guard.position.z = HANDLE_FRONT - 0.004;
    this.add(guard);

    // Die Klinge: ein flaches Blatt, hochkant (in der yz-Ebene) — ein Messer
    // hält man mit der Schneide nach unten, und das Blatt steht so wie die
    // Handfläche, die den Griff hält.
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(BLADE_THICK, BLADE_WIDTH, BLADE_LENGTH * 0.7),
      steel,
    );
    blade.position.set(0, 0, HANDLE_FRONT - 0.008 - BLADE_LENGTH * 0.35);
    this.add(blade);
    // … und die Spitze: ein flach gedrückter Kegel, der auf die Klinge zuläuft.
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(BLADE_WIDTH / 2, BLADE_LENGTH * 0.3, 4),
      steel,
    );
    tip.rotation.x = -Math.PI / 2;
    tip.rotation.y = Math.PI / 4;
    tip.scale.x = BLADE_THICK / BLADE_WIDTH;
    tip.position.set(0, 0, HANDLE_FRONT - 0.008 - BLADE_LENGTH * 0.85);
    this.add(tip);
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
