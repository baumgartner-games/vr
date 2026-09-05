import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { GRIP_LENGTH } from './grip';
import { playTone } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';

/** How many turns a second a thrown knife makes. */
export const SPIN_RATE = 6;
/** The slowest throw that still counts as one; below it the knife just drops. */
export const THROW_SPEED = 2.2;

/** Der Griff: der Standardgriff, eine Faust lang. */
const HANDLE_LENGTH = GRIP_LENGTH;
/** Die Klinge, über dem Griff, entlang seiner Achse. */
const BLADE_LENGTH = 0.15;
const BLADE_WIDTH = 0.03;
const BLADE_THICK = 0.004;

/**
 * **Das Messer** — das eine Werkzeug, das zum Loslassen gedacht ist.
 *
 * Es war einmal ein Wurfstern, und der hatte keinen Griff: er lag „in den
 * Fingerspitzen", also nirgends, und eine Boxhand, die nichts umschließt, sieht
 * an ihm nach nichts aus. Ein Messer hat einen **Griff**, und der ist der
 * **Standardgriff**: er steht senkrecht in der Faust wie ein Pistolengriff,
 * mit derselben Faust darum (`GRIP_HAND_POSE`), und die Klinge ragt oben aus
 * der Faust heraus — auf der Daumenseite, entlang der Griffachse, die
 * Schneide nach vorn, dorthin, wohin die Finger greifen.
 *
 * Eine Weile lag es als **Stab** quer durch die Faust, wie die Taschenlampe
 * und der Hammer: die Klinge nach vorn auf dem Zeigestrahl. Das ist die
 * Haltung, in der man mit einer Lampe leuchtet, nicht die, in der man ein
 * Messer hält — ein Messer hält man am Griff, und der Griff steht in der
 * Faust. Um 90° gekippt also, und mit dem Griff, den auch die Pistole hat.
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

    // Der Griff: der Standardgriff, dort, wo er in die Faust gehört. Alles
    // andere hängt **an ihm** — an seiner Achse (+Y), nicht an der des
    // Werkzeugs: der Griff lehnt im Werkzeug ein Stück nach hinten, und eine
    // Klinge, die geradeaus nach oben ginge, stünde schief auf ihm.
    const grip = this.mountGrip({ length: HANDLE_LENGTH });

    // Ein Knauf unten, damit die Faust etwas hat, wogegen sie zieht.
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.019, 12, 8), dark);
    pommel.position.y = -HANDLE_LENGTH / 2 - 0.006;
    grip.add(pommel);

    // Das Heft: ein Querbalken zwischen Griff und Klinge, quer zur Faust.
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.01), dark);
    guard.position.y = HANDLE_LENGTH / 2 + 0.004;
    grip.add(guard);

    // Die Klinge: ein flaches Blatt in der Ebene aus Griffachse und Vorne —
    // die Schneide zeigt nach -Z, dorthin, wohin die Finger um den Griff
    // greifen, der Rücken zur Handfläche.
    const bladeBase = HANDLE_LENGTH / 2 + 0.008;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(BLADE_THICK, BLADE_LENGTH * 0.7, BLADE_WIDTH),
      steel,
    );
    blade.position.set(0, bladeBase + BLADE_LENGTH * 0.35, 0);
    grip.add(blade);
    // … und die Spitze: ein flach gedrückter Kegel, der auf die Klinge zuläuft.
    // Ein Kegel wächst entlang +Y — genau die Griffachse.
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(BLADE_WIDTH / 2, BLADE_LENGTH * 0.3, 4),
      steel,
    );
    tip.rotation.y = Math.PI / 4;
    tip.scale.x = BLADE_THICK / BLADE_WIDTH;
    tip.position.set(0, bladeBase + BLADE_LENGTH * 0.85, 0);
    grip.add(tip);
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
