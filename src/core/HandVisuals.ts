import * as THREE from 'three';
import type { ControllerState, Handedness, XRInput } from './XRInput';
import { GRAB_GLOW } from './colors';
import { clonePose, type HandPose } from './handPose';
import { holdHandPose, idleHandPose, onHandPoseChange } from './handPoseStore';

export type HandGesture = 'open' | 'ready' | 'point' | 'thumbsUp' | 'grip';

/** Curl per finger: thumb, index, middle, ring, pinky (0 = straight, 1 = closed). */
const GESTURES: Record<HandGesture, number[]> = {
  open: [0.1, 0.08, 0.08, 0.1, 0.12],
  // Slightly curled: something is close enough to grab.
  ready: [0.35, 0.4, 0.45, 0.5, 0.55],
  point: [0.15, 0, 1, 1, 1],
  thumbsUp: [0, 1, 1, 1, 1],
  grip: [0.55, 0.35, 0.85, 0.9, 0.9],
};

const FINGERS = [
  // x offset (thumb side is negative for the right hand), lengths, spread
  { name: 'index', x: -0.028, lengths: [0.036, 0.03], z: -0.046 },
  { name: 'middle', x: -0.009, lengths: [0.04, 0.032], z: -0.048 },
  { name: 'ring', x: 0.01, lengths: [0.036, 0.029], z: -0.046 },
  { name: 'pinky', x: 0.028, lengths: [0.03, 0.024], z: -0.042 },
];

const _vector = new THREE.Vector3();
const _euler = new THREE.Euler();
const DEG = Math.PI / 180;

/**
 * Wie eine Hand gezeichnet wird — zwei Antworten, und beide gibt es.
 *
 * Mit **Controllern** baut das Spiel eine Hand aus Kästen und Kapseln: eine
 * Handfläche als Quader, an jedem Finger zwei Knochen. Mit **Handtracking**
 * gibt es die gar nicht, sondern eine Kugel pro Gelenk, weil die Brille genau
 * das liefert.
 *
 * `limbs` ist dabei kein neues Modell, sondern dieselbe prozedurale Hand mit
 * Kugeln an den Gelenken statt Knochen dazwischen: dieselbe Haltung, dieselben
 * Zahlen, nur eben so, wie das Headset eine getrackte Hand zeichnet. Wer die
 * beiden nebeneinander sehen will, legt sich im Eingaberaum die **Boxhand als
 * Werkzeug** in die Hand (`worlds/portal/tools/HandTool.ts`).
 */

/** One procedural hand: a palm plus five curling fingers. */
class ProceduralHand extends THREE.Group {
  readonly indexTip = new THREE.Object3D();

  private readonly chains: THREE.Object3D[][] = [];
  private readonly curls = [0, 0, 0, 0, 0];
  private readonly targets = [0, 0, 0, 0, 0];
  /** Finger roots, in the order of `FINGERS`, for the spread. */
  private readonly fingerRoots: THREE.Object3D[] = [];
  /** How far each finger root sits from the middle, -1 … 1. */
  private readonly fans: number[] = [];
  private spread = 0;

  constructor(
    readonly side: Handedness,
    material: THREE.Material,
    /**
     * `limbs` zeichnet Kugeln an den Gelenken statt Knochen dazwischen — die
     * Form, in der ein Headset eine getrackte Hand zeigt. Alles andere,
     * Haltung und Krümmung eingeschlossen, ist identisch: es ist dieselbe
     * Hand, nur anders angezogen.
     */
    private readonly look: 'bones' | 'limbs' = 'bones',
  ) {
    super();
    this.name = `hand-${side}`;
    // Which way round the thumb sits — the one constant that tells a left hand
    // from a right one. The grip space is *not* mirrored between the hands, so
    // this has to be: hold a right hand palm down with the fingers pointing
    // forward (-Z) and the thumb points to the left, towards -X. Getting this
    // sign wrong puts a left hand on the right controller and vice versa.
    const mirror = side === 'left' ? -1 : 1;

    // The grip space points -Z forward with the back of the hand towards +Y.
    const palm =
      this.look === 'limbs'
        ? new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), material)
        : new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.028, 0.09), material);
    palm.position.set(0, 0, -0.01);
    this.add(palm);
    if (this.look === 'limbs') {
      // Der Handrücken ist bei getrackten Händen eine Reihe Knöchel und keine
      // einzelne Kugel — vier davon, dort, wo die Finger ansetzen.
      for (const finger of FINGERS) {
        const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), material);
        knuckle.position.set(mirror * finger.x, 0, finger.z);
        this.add(knuckle);
      }
    }

    // Thumb: sits at the wrist end of the thumb edge and juts out sideways —
    // the yaw carries it away from the palm, the small pitch drops it a little
    // towards the palm side, and the roll turns its bending axis so that
    // curling it folds it *across* the palm instead of straight down.
    const thumbRoot = new THREE.Object3D();
    thumbRoot.position.set(mirror * -0.034, -0.006, 0.014);
    thumbRoot.rotation.set(-0.22, mirror * 0.75, mirror * 0.6);
    this.add(thumbRoot);
    this.chains.push(buildChain(thumbRoot, [0.034, 0.028], 0.017, material, this.look));

    for (const finger of FINGERS) {
      const root = new THREE.Object3D();
      root.position.set(mirror * finger.x, 0, finger.z);
      this.add(root);
      this.fingerRoots.push(root);
      this.fans.push((mirror * finger.x) / 0.028);
      const chain = buildChain(root, finger.lengths, 0.013, material, this.look);
      this.chains.push(chain);
      if (finger.name === 'index') {
        this.indexTip.position.set(0, 0, -finger.lengths[1]!);
        chain[1]!.add(this.indexTip);
      }
    }
  }

  setGesture(gesture: HandGesture): void {
    const values = GESTURES[gesture];
    for (let i = 0; i < this.targets.length; i++) this.targets[i] = values[i]!;
  }

  /**
   * A pose the player dialled in: where the hand sits on the controller, how
   * far each finger is curled, how far they fan out. The curls are targets —
   * the fingers still move there over a few frames instead of snapping.
   */
  setPose(pose: HandPose): void {
    this.position.set(pose.x / 100, pose.y / 100, pose.z / 100);
    this.quaternion.setFromEuler(
      _euler.set(pose.pitch * DEG, pose.yaw * DEG, pose.roll * DEG, 'XYZ'),
    );
    for (let i = 0; i < this.targets.length; i++) this.targets[i] = pose.curls[i] ?? 0;
    if (this.spread === pose.spread) return;
    this.spread = pose.spread;
    // Fanning out is a turn of the whole finger away from the middle one.
    for (let i = 0; i < this.fingerRoots.length; i++) {
      this.fingerRoots[i]!.rotation.y = -this.fans[i]! * pose.spread * DEG;
    }
  }

  update(dt: number): void {
    const blend = Math.min(1, dt * 14);
    for (let i = 0; i < this.chains.length; i++) {
      this.curls[i]! += (this.targets[i]! - this.curls[i]!) * blend;
      const curl = this.curls[i]!;
      const chain = this.chains[i]!;
      // Every joint bends around its own X, which is the only axis that moves
      // the next bone at all — the chain runs along -Z, so a turn around Z just
      // rolls it and the thumb used to stay stubbornly straight. The thumb's
      // root is rolled instead, which sends the same bend across the palm.
      const first = i === 0 ? 1.1 : 1.5;
      const second = i === 0 ? 0.9 : 1.4;
      chain[0]!.rotation.x = -curl * first;
      chain[1]!.rotation.x = -curl * second;
    }
  }
}

function buildChain(
  root: THREE.Object3D,
  lengths: number[],
  radius: number,
  material: THREE.Material,
  look: 'bones' | 'limbs' = 'bones',
): THREE.Object3D[] {
  const joints: THREE.Object3D[] = [];
  let parent: THREE.Object3D = root;
  for (const length of lengths) {
    const joint = new THREE.Object3D();
    parent.add(joint);
    if (look === 'limbs') {
      // Zwei Kugeln je Knochen: eine am Gelenk, eine an der Spitze. Damit
      // sieht die Kette aus wie die Gelenkkugeln einer getrackten Hand und
      // bewegt sich trotzdem an genau denselben Achsen.
      const knuckle = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.85, 10, 8), material);
      joint.add(knuckle);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.7, 10, 8), material);
      tip.position.set(0, 0, -length);
      joint.add(tip);
    } else {
      const bone = new THREE.Mesh(
        new THREE.CapsuleGeometry(radius, Math.max(length - radius * 2, 0.005), 3, 8),
        material,
      );
      bone.rotation.x = Math.PI / 2;
      bone.position.set(0, 0, -length / 2);
      joint.add(bone);
    }
    joints.push(joint);
    const next = new THREE.Object3D();
    next.position.set(0, 0, -length);
    joint.add(next);
    parent = next;
  }
  return joints;
}

/** Wie eine einzelne Hand im Raum aussehen soll. */
export interface HandShapeOptions {
  color?: number;
  /** Knochen wie mit Controllern, Kugeln wie beim Handtracking. */
  look?: 'bones' | 'limbs';
  /**
   * 1 macht sie **fest** statt gläsern.
   *
   * Ein Geist ist durchsichtig, weil man durch ihn hindurch die eigene Hand
   * sehen will. Die Boxhand, die als **Werkzeug** in der Hand liegt
   * (`tools/HandTool.ts`), ist aber kein Geist, sondern das Ding selbst — und
   * ein Werkzeug, das man kaum sieht, justiert niemand.
   */
  opacity?: number;
}

/**
 * A copy of a hand, standing still in the room.
 *
 * Der Justierstand stellt eine dorthin, wo die Hand läge, damit man beim
 * Zurechtrücken etwas zum Vergleichen hat. It is a normal procedural hand in a
 * glass material — the same geometry, so what you compare against is genuinely
 * the same shape.
 *
 * Wahlweise als **Kugelhand** (`limbs`): dieselbe Haltung, gezeichnet wie eine
 * getrackte Hand. Der Sinn ist immer derselbe — man vergleicht nur ehrlich,
 * wenn das Vergleichsstück so aussieht wie das, was man gerade in der Brille
 * sieht. Und wahlweise **fest** statt gläsern, denn dieselbe Geometrie ist
 * inzwischen auch ein Werkzeug.
 */
export class GhostHand extends THREE.Group {
  private readonly material: THREE.MeshStandardMaterial;
  private readonly hand: ProceduralHand;

  constructor(
    readonly side: Handedness,
    pose: HandPose,
    options: HandShapeOptions = {},
  ) {
    super();
    const { color = 0x5ee0a0, look = 'bones', opacity = 0.32 } = options;
    this.look = look;
    this.name = `ghost-hand-${side}`;
    this.material = new THREE.MeshStandardMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
      roughness: 0.5,
      emissive: new THREE.Color(color).multiplyScalar(0.35),
    });
    this.hand = new ProceduralHand(side, this.material, look);
    this.setPose(pose);
    // A full second of blending: the fingers are where they belong at once,
    // because nobody watches a ghost grow into its pose.
    this.hand.update(1);
    this.add(this.hand);
  }

  /** Knochen oder Kugeln — was hier steht, wurde gebaut und wechselt nicht. */
  readonly look: 'bones' | 'limbs';

  /**
   * Die Spitze des Zeigefingers, als Knoten: ihr **-Z ist die Richtung**, in
   * die der Finger zeigt.
   *
   * Im Spiel hängt daran der Fingerzeig auf ein Panel; auf der Werkzeugseite
   * hängt daran eine Linie, die genau diese Richtung sichtbar macht. Man sieht
   * einer Faust nämlich nicht an, wohin sie zeigt — und ob ein Werkzeug entlang
   * des Zeigefingers liegt oder 30° daneben, ist die halbe Frage, um die es
   * beim Justieren geht.
   */
  get indexTip(): THREE.Object3D {
    return this.hand.indexTip;
  }

  /**
   * Dieselbe Haltung wie die echte Hand, nur an einem anderen Ort.
   *
   * Der Versatz in einer Pose gehört einer Hand, die auf einem Controller
   * sitzt; dieser Geist wird in den Raum gestellt und fängt deshalb dort an,
   * wo man ihn hinstellt. Alles andere — Krümmung, Fächerung — ist die Pose.
   */
  setPose(pose: HandPose): void {
    this.hand.setPose(pose);
    this.hand.position.set(0, 0, 0);
    this.hand.quaternion.identity();
  }

  /** Was die Finger gerade tun sollen; die echte Hand macht es vor. */
  setGesture(gesture: HandGesture): void {
    this.hand.setGesture(gesture);
  }

  /** Lässt die Finger nachziehen — ohne das steht der Geist auf der Startpose. */
  update(dt: number): void {
    this.hand.update(dt);
  }

  dispose(): void {
    this.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    this.material.dispose();
    this.removeFromParent();
  }
}

/**
 * Hands for both input kinds: joint spheres when the runtime tracks real hands,
 * a procedural hand with gestures when the player holds controllers.
 */
export class HandVisuals extends THREE.Group {
  private readonly jointMeshes = new Map<THREE.Object3D, THREE.Mesh>();
  private readonly hands = new Map<ControllerState, ProceduralHand>();
  private readonly overrides = new Map<Handedness, HandGesture | null>();
  /** What each hand is carrying, so it can hold that tool its own way. */
  private readonly holding = new Map<Handedness, string | null>();
  /** Resolved poses, rebuilt whenever the settings change. */
  private readonly poses = new Map<string, HandPose>();
  private readonly unsubscribe: () => void;
  private readonly jointGeometry = new THREE.SphereGeometry(1, 10, 8);
  /**
   * Die Vorlage, aus der jede Hand ihr eigenes Material bekommt.
   *
   * Ein gemeinsames Material wäre sparsamer und genau deshalb falsch: leuchtet
   * die rechte Hand, weil sie an einem Griff liegt, soll die linke dunkel
   * bleiben. Zwei Materialien sind der Preis dafür, und der ist klein.
   */
  private readonly material: THREE.MeshStandardMaterial;
  private readonly handMaterials = new Map<Handedness, THREE.MeshStandardMaterial>();
  private readonly glowing = new Set<Handedness>();

  constructor(
    private readonly input: XRInput,
    color = 0xd6e2f7,
  ) {
    super();
    this.name = 'hand-visuals';
    this.material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.05,
      emissive: new THREE.Color(color).multiplyScalar(0.06),
    });
    // A number typed into the menu has to show on the hand right away.
    this.unsubscribe = onHandPoseChange(() => this.poses.clear());
  }

  /**
   * Drawn at all. Switched off while the view has left the body behind — the
   * drone takes the eyes out into the room, and the hands stay with the body.
   * A pair of hands floating in front of a camera they are nowhere near is
   * exactly what makes people sick.
   */
  hidden = false;

  /** Forces a gesture, e.g. while a portal gun is held. */
  setGestureOverride(handedness: Handedness, gesture: HandGesture | null): void {
    this.overrides.set(handedness, gesture);
  }

  /**
   * Die Hand selbst leuchtet — das Zeichen fürs **Anfassen**.
   *
   * Beim Nahgreifen und beim Ferngreifen leuchtet der Gegenstand: er ist
   * weit weg, und die Frage ist, *welcher* es ist. Beim Anfassen ist die
   * Frage eine andere — der Gegenstand leuchtet ohnehin schon, seit die Hand
   * in seine Nähe kam, und was jetzt dazukommt, ist „du bist wirklich dran".
   * Das steht der Hand besser als noch mehr Licht am Ding.
   */
  setGlow(handedness: Handedness, on: boolean): void {
    if (on === this.glowing.has(handedness)) return;
    if (on) this.glowing.add(handedness);
    else this.glowing.delete(handedness);
    const material = this.handMaterial(handedness);
    material.emissive.setHex(on ? GRAB_GLOW : this.material.color.getHex());
    material.emissive.multiplyScalar(on ? 0.42 : 0.06);
  }

  /** Ihr eigenes Material je Hand, gebaut, wenn die Hand zum ersten Mal da ist. */
  private handMaterial(handedness: Handedness): THREE.MeshStandardMaterial {
    let material = this.handMaterials.get(handedness);
    if (!material) {
      material = this.material.clone();
      this.handMaterials.set(handedness, material);
    }
    return material;
  }

  /**
   * Wie diese Hand gerade gezeichnet wird: Knochen am Controller, Kugeln beim
   * Handtracking. Eine Geisterhand, die daneben steht, soll ja so aussehen wie
   * die, die man in der Brille sieht.
   */
  lookOf(handedness: Handedness): 'bones' | 'limbs' {
    for (const controller of this.input.controllers) {
      if (controller.handedness === handedness) return controller.isHand ? 'limbs' : 'bones';
    }
    return 'bones';
  }

  /**
   * Which tool this hand is carrying, or null for an empty hand. A held tool
   * brings its own hand pose — that is what the settings are for — and an
   * empty hand goes back to the idle one.
   */
  setHeldTool(handedness: Handedness, toolId: string | null): void {
    if (this.holding.get(handedness) === toolId) return;
    this.holding.set(handedness, toolId);
  }

  /**
   * What this hand is currently carrying, as the id its pose is filed under:
   * a tool's id, `grab` for a plain object, or null for an empty hand. The
   * adjustment tool asks, so that what it measures lands on the pose the hand
   * is actually wearing.
   */
  heldToolOf(handedness: Handedness): string | null {
    return this.holding.get(handedness) ?? null;
  }

  /** The pose a hand is currently in, settings and held tool taken together. */
  poseOf(handedness: Handedness): HandPose {
    const toolId = this.holding.get(handedness) ?? null;
    const key = `${handedness}:${toolId ?? ''}`;
    let pose = this.poses.get(key);
    if (!pose) {
      pose = toolId ? holdHandPose(handedness, toolId) : idleHandPose(handedness);
      this.poses.set(key, pose);
    }
    return pose;
  }

  /** Drops the cached poses; the next frame reads the settings again. */
  refreshPoses(): void {
    this.poses.clear();
  }

  /** The pose a hand *would* have with this tool — what the editor works on. */
  editablePose(handedness: Handedness, toolId: string | null): HandPose {
    return clonePose(toolId ? holdHandPose(handedness, toolId) : idleHandPose(handedness));
  }

  /**
   * The object that visually *is* this hand: the procedural one for controllers,
   * the joint tree for tracked hands. Portals need it to draw the half that
   * sticks out on the other side.
   */
  handObject(controller: ControllerState): THREE.Object3D | null {
    if (controller.isHand) return controller.hand.visible ? controller.hand : null;
    const hand = this.hands.get(controller);
    return hand?.visible ? hand : null;
  }

  /** Current gesture of a controller hand, or null for tracked hands. */
  gestureOf(controller: ControllerState): HandGesture | null {
    if (controller.isHand || !controller.handedness) return null;
    const override = this.overrides.get(controller.handedness);
    if (override) return override;
    if (controller.squeeze.pressed && controller.trigger.pressed) return 'thumbsUp';
    if (controller.squeeze.pressed) return 'point';
    return 'open';
  }

  update(dt: number): void {
    for (const controller of this.input.controllers) {
      if (controller.isHand) {
        this.updateTrackedHand(controller);
        this.hands.get(controller)?.removeFromParent();
        continue;
      }
      this.updateControllerHand(dt, controller);
    }
  }

  dispose(): void {
    this.unsubscribe();
    for (const [joint, mesh] of this.jointMeshes) joint.remove(mesh);
    this.jointMeshes.clear();
    for (const hand of this.hands.values()) this.disposeHand(hand);
    this.hands.clear();
    this.jointGeometry.dispose();
    for (const material of this.handMaterials.values()) material.dispose();
    this.handMaterials.clear();
    this.material.dispose();
    this.removeFromParent();
  }

  private disposeHand(hand: ProceduralHand): void {
    hand.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    hand.removeFromParent();
  }

  private updateTrackedHand(controller: ControllerState): void {
    for (const joint of Object.values(controller.hand.joints)) {
      if (!joint) continue;
      let mesh = this.jointMeshes.get(joint);
      if (!mesh) {
        const material = controller.handedness
          ? this.handMaterial(controller.handedness)
          : this.material;
        mesh = new THREE.Mesh(this.jointGeometry, material);
        joint.add(mesh);
        this.jointMeshes.set(joint, mesh);
      }
      mesh.scale.setScalar(Math.max((joint as THREE.XRJointSpace).jointRadius ?? 0.008, 0.004));
      mesh.visible = !this.hidden;
    }
    const tip = controller.hand.joints['index-finger-tip'];
    controller.fingertip = tip && tip.visible ? tip : null;
  }

  private updateControllerHand(dt: number, controller: ControllerState): void {
    if (!controller.handedness) return;
    let hand = this.hands.get(controller);
    // The runtime may hand the same slot to the other hand later on — a left
    // hand mesh on the right controller is what made both look mirrored.
    if (hand && hand.side !== controller.handedness) {
      this.disposeHand(hand);
      this.hands.delete(controller);
      hand = undefined;
    }
    if (!hand) {
      hand = new ProceduralHand(controller.handedness, this.handMaterial(controller.handedness));
      this.hands.set(controller, hand);
    }
    const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
    if (hand.parent !== anchor) anchor.add(hand);
    hand.visible = controller.tracked && !this.hidden;
    controller.fingertip = hand.visible ? hand.indexTip : null;

    // The dialled-in pose is the base; the short-lived gestures (pointing at
    // something, a thumbs-up) still win while they last.
    hand.setPose(this.poseOf(controller.handedness));
    const forced = this.overrides.get(controller.handedness) ?? null;
    const gesture = this.gestureOf(controller);
    // `open` is the idle pose and a held tool brings its own grip, so those two
    // are already covered; a bare hand closing around a cube is not. A gesture
    // a tool explicitly asked for is never covered — the Superman glove wants
    // a fist out of a hand that is holding something.
    const covered =
      !forced &&
      (gesture === 'open' || (gesture === 'grip' && this.holding.get(controller.handedness)));
    if (gesture && !covered) hand.setGesture(gesture);
    hand.update(dt);
  }
}

/** World position of a hand's index fingertip, if it is currently tracked. */
export function fingertipPosition(
  controller: ControllerState,
  target: THREE.Vector3,
): THREE.Vector3 | null {
  if (!controller.fingertip) return null;
  controller.fingertip.getWorldPosition(_vector);
  return target.copy(_vector);
}
