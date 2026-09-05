import * as THREE from 'three';
import { GlideTool, anchorOf, type GlideCommand } from './GlideTool';
import type { ToolHost } from './Tool';
import { WINGS, flapThrust, wingCommand, type GlideParams } from './glideFlight';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** Länge eines Flügels, wie er gebaut ist, in Metern — von der Schulter bis zur Spitze. */
const WING_LENGTH = 1.05;
/** Um so viel reicht der Flügel über die Hand hinaus: Hand ist nicht Spitze. */
const BEYOND_HAND = 1.6;
/** Wo die Schultern gegen den Kopf sitzen: zur Seite und nach unten, in Metern. */
const SHOULDER_SIDE = 0.19;
const SHOULDER_DROP = 0.24;
/** Der Anstellwinkel der Flügel gegen die Bahn, in Radiant, und was die Hände daran ändern. */
const TRIM_ANGLE = 0.1;
const HAND_ANGLE = 0.2;
/** So schnell muss ein Schlag vom Boden aus sein, damit er zum Start wird. */
const LAUNCH_FLAP = 2;

const FEATHER = 0xf3e9d2;
const EDGE = 0x8a6242;

const UP = new THREE.Vector3(0, 1, 0);
const _head = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _shoulder = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _basis = new THREE.Matrix4();
const _local = new THREE.Vector3();

/**
 * **Flügel**: zwei Schwingen an den Armen, und die Arme sind die Steuerung.
 *
 * Vom Gürtel genommen sitzen sie an beiden Armen — von der Schulter bis ein
 * gutes Stück über die Hand hinaus. **Schlagen** (beide Hände zügig nach
 * unten) gibt Schub, vom Boden aus auch den Start; **ausgebreitet** tragen sie
 * und man gleitet, **angelegt** ist ein Sturzflug. Eine Hand **tiefer** als
 * die andere kippt in die Kurve zu dieser Seite; beide Hände **nach vorn**
 * heißt Nase runter und schneller, nach hinten Nase hoch. Sie fliegen
 * steiler als der Hängegleiter und wendiger — und sie sind das eine Gerät,
 * mit dem man wieder **hoch**kommt, solange die Arme durchhalten
 * (`glideFlight.ts`, mit Test).
 *
 * Gezeichnet werden sie beim Fliegen **im Raum**, jedes Bild neu von der
 * Schulter zur Hand: die Hand ist nicht die Spitze, aber sie sagt, wohin die
 * Spitze zeigt. Am Gürtel sind sie ein zusammengelegtes Bündel Federn.
 */
export class WingsTool extends GlideTool {
  override readonly toolId = 'wings';
  override readonly label = 'Flügel';
  protected override readonly params: GlideParams = WINGS;

  private readonly feathers: Record<Handedness, THREE.Group>;
  /** Wo die Hände im vorigen Bild waren, im Raum des Rigs — für den Schlag. */
  private readonly lastHands: Record<Handedness, THREE.Vector3 | null> = {
    left: null,
    right: null,
  };
  private readonly downSpeed: Record<Handedness, number> = { left: 0, right: 0 };

  constructor() {
    super();
    this.name = 'tool-wings';
    this.icon = 'wings';
    this.accent = 0xffe08a;
    this.hint =
      'Beide Arme schlagen = Start und Schub · ausbreiten = gleiten · eine Hand tiefer = Kurve';
    this.alignToAim = false;

    // In der Faust: die Manschette, mit der ein Flügel am Arm sitzt.
    const cuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.04, 0.009, 8, 20),
      new THREE.MeshStandardMaterial({ color: EDGE, roughness: 0.7 }),
    );
    cuff.rotation.x = Math.PI / 2;
    cuff.position.z = 0.03;
    this.add(cuff);

    this.feathers = { left: feather(), right: feather() };
    this.wing.add(this.feathers.left, this.feathers.right);
    this.spreadForDisplay();

    // Gepackt: die Federn zusammengelegt, ein flaches Bündel.
    const bundle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.05, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: FEATHER, roughness: 0.9 }),
    );
    bundle.rotation.x = Math.PI / 2;
    bundle.scale.x = 1.8;
    this.pack.add(bundle);
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(0.06, 0.008, 6, 16),
      new THREE.MeshStandardMaterial({ color: EDGE, roughness: 0.7 }),
    );
    strap.scale.x = 1.5;
    this.pack.add(strap);
  }

  /**
   * Zum Ansehen: beide Flügel waagerecht ausgebreitet um die Mitte — so
   * stehen sie auf der Werkzeugseite und im Regal. Beim Fliegen stellt
   * `spanWing` jeden neu an seine Schulter.
   */
  private spreadForDisplay(): void {
    for (const side of ['left', 'right'] as const) {
      const sign = side === 'left' ? -1 : 1;
      const wing = this.feathers[side];
      wing.position.set(sign * SHOULDER_SIDE, 0, 0);
      wing.quaternion.identity();
      wing.scale.set(sign, 1, 1);
    }
  }

  /** Der andere Arm ist auch ein Flügel — er greift nichts von der Hüfte. */
  override claimsHand(hand: Handedness): boolean {
    if (!this.heldBy || this.parked || hand === this.heldBy) return false;
    return true;
  }

  protected override takeOffNote(): string {
    return 'Abgehoben · schlagen = Schub, ausbreiten = gleiten, eine Hand tiefer = Kurve';
  }

  protected override readCommand(
    dt: number,
    host: ToolHost,
    controller: ControllerState,
  ): GlideCommand {
    const other = host.ctx.input.get(this.otherSide()!);
    this.measureStroke(dt, host, controller.handedness!, controller);
    if (other?.tracked) this.measureStroke(dt, host, other.handedness!, other);
    else this.downSpeed[this.otherSide()!] = 0;

    const flap = flapThrust(this.downSpeed.left, this.downSpeed.right);

    const held = this.relativeToHead(host, controller);
    // Ohne zweite Hand fliegt man mit einem Flügel — spiegelbildlich der erste.
    const mirror = other?.tracked
      ? this.relativeToHead(host, other)
      : { ahead: held.ahead, up: held.up, side: -held.side };
    const left = this.heldBy === 'left' ? held : mirror;
    const right = this.heldBy === 'left' ? mirror : held;
    const command = wingCommand(left, right);

    this.setGesture(host, 'left', false);
    this.setGesture(host, 'right', false);

    // Vom Boden aus ist ein kräftiger Schlag mit beiden Armen der Start.
    const launch = Math.min(this.downSpeed.left, this.downSpeed.right) > LAUNCH_FLAP;
    return { ...command, flap, launch };
  }

  protected override placeWing(host: ToolHost, controller: ControllerState): void {
    const rig = host.ctx.rig;
    rig.getHeadPosition(_head);
    rig.getHeadForward(_forward);
    _right.copy(_forward).cross(UP).normalize();
    // Die Flügel stehen im Raum, das Elternteil ist die Wurzel der Welt.
    this.wing.position.set(0, 0, 0);
    this.wing.quaternion.identity();

    const other = host.ctx.input.get(this.otherSide()!);
    const hands: Record<Handedness, ControllerState | null> = {
      left: controller.handedness === 'left' ? controller : other?.tracked ? other : null,
      right: controller.handedness === 'right' ? controller : other?.tracked ? other : null,
    };
    for (const side of ['left', 'right'] as const) {
      const sign = side === 'left' ? -1 : 1;
      _shoulder
        .copy(_head)
        .addScaledVector(_right, sign * SHOULDER_SIDE)
        .addScaledVector(UP, -SHOULDER_DROP);
      const hand = hands[side];
      if (hand) anchorOf(hand).getWorldPosition(_hand);
      else _hand.copy(_shoulder).addScaledVector(_right, sign * 0.6);
      this.spanWing(this.feathers[side], _shoulder, _hand, sign);
    }
  }

  /**
   * Einen Flügel von der Schulter zur Hand legen — und darüber hinaus.
   *
   * Seine Achse zeigt von der Schulter zur Hand, seine Sehne nach hinten,
   * quer dazu; gedreht um die Achse, wie die Bahn geneigt ist und was die
   * Hände sagen. Die Länge kommt aus dem Abstand: ein gestreckter Arm ist ein
   * gestreckter Flügel.
   */
  private spanWing(
    wing: THREE.Group,
    shoulder: THREE.Vector3,
    hand: THREE.Vector3,
    sign: number,
  ): void {
    _x.copy(hand).sub(shoulder);
    const reach = _x.length();
    if (reach < 0.05) _x.copy(_right).multiplyScalar(sign);
    _x.normalize();
    // Die Sehne: nach hinten, quer zur Achse — und um die Achse gekippt, so
    // wie das Segel angestellt ist.
    _z.copy(_forward).negate();
    _z.addScaledVector(_x, -_z.dot(_x));
    if (_z.lengthSq() < 1e-6) _z.set(0, 0, 1);
    _z.normalize();
    const pitch = this.flying ? this.pitch + TRIM_ANGLE + this.command.pitchUp * HAND_ANGLE : 0;
    _z.applyAxisAngle(_x, -pitch * sign);
    _y.copy(_z).cross(_x).normalize();
    _basis.makeBasis(_x, _y, _z);
    wing.quaternion.setFromRotationMatrix(_basis);
    wing.position.copy(shoulder);
    const length = Math.max(0.4, reach * BEYOND_HAND);
    wing.scale.set(length / WING_LENGTH, 1, 1);
  }

  /** Wie schnell eine Hand gerade nach unten geht, im Raum des Rigs. */
  private measureStroke(
    dt: number,
    host: ToolHost,
    side: Handedness,
    controller: ControllerState,
  ): void {
    anchorOf(controller).getWorldPosition(_local);
    host.ctx.rig.worldToLocal(_local);
    const last = this.lastHands[side];
    if (last && dt > 0) {
      const down = (last.y - _local.y) / dt;
      // Ein wenig geglättet: das Tracking zittert, ein Schlag nicht.
      this.downSpeed[side] += (down - this.downSpeed[side]) * Math.min(1, dt * 18);
      last.copy(_local);
    } else {
      this.lastHands[side] = _local.clone();
      this.downSpeed[side] = 0;
    }
  }

  override onStow(host: ToolHost): void {
    this.lastHands.left = null;
    this.lastHands.right = null;
    this.setGesture(host, 'left', false);
    this.setGesture(host, 'right', false);
    super.onStow(host);
    this.spreadForDisplay();
  }
}

/**
 * Ein Flügel, gebaut entlang **+X** von der Schulter (Ursprung) zur Spitze,
 * mit der Sehne nach **+Z** und gezackten Federn an der Hinterkante. Links
 * und rechts sind dasselbe Stück: beim Fliegen zeigt seine Achse ohnehin von
 * der Schulter nach außen, zum Ansehen wird eines gespiegelt.
 */
function feather(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'feather';

  const outline: Array<[number, number]> = [
    [0, -0.1],
    [0.35, -0.13],
    [0.7, -0.09],
    [1.05, 0],
    [1.02, 0.22],
    [0.95, 0.18],
    [0.88, 0.32],
    [0.8, 0.26],
    [0.7, 0.4],
    [0.6, 0.32],
    [0.5, 0.46],
    [0.38, 0.38],
    [0.26, 0.52],
    [0.13, 0.44],
    [0, 0.55],
  ];
  const shape = new THREE.Shape();
  outline.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  });
  shape.closePath();
  const plume = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshStandardMaterial({
      color: FEATHER,
      side: THREE.DoubleSide,
      roughness: 0.9,
    }),
  );
  // Die Form liegt in XY; die Sehne soll nach +Z zeigen.
  plume.rotation.x = Math.PI / 2;
  plume.scale.y = -1;
  group.add(plume);

  // Der Vorderkantenbalken: der Arm, an dem die Federn sitzen.
  const spar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.014, 1.05, 8),
    new THREE.MeshStandardMaterial({ color: EDGE, roughness: 0.7 }),
  );
  spar.rotation.z = -Math.PI / 2;
  spar.position.set(0.525, 0.01, -0.09);
  group.add(spar);
  return group;
}
