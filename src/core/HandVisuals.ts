import * as THREE from 'three';
import type { ControllerState, Handedness, XRInput } from './XRInput';
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
  ) {
    super();
    this.name = `hand-${side}`;
    // Which way round the thumb sits. In the headset the two hands read as
    // each other's mirror image with the opposite sign here — one constant, and
    // it is the only thing that tells a left hand from a right one.
    const mirror = side === 'left' ? 1 : -1;

    // The grip space points -Z forward with the back of the hand towards +Y.
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.028, 0.09), material);
    palm.position.set(0, 0, -0.01);
    this.add(palm);

    // Thumb: sits on the inner edge and folds across the palm.
    const thumbRoot = new THREE.Object3D();
    thumbRoot.position.set(mirror * -0.036, -0.004, 0.012);
    thumbRoot.rotation.set(0, mirror * -0.55, mirror * 0.5);
    this.add(thumbRoot);
    this.chains.push(buildChain(thumbRoot, [0.034, 0.028], 0.017, material));

    for (const finger of FINGERS) {
      const root = new THREE.Object3D();
      root.position.set(mirror * finger.x, 0, finger.z);
      this.add(root);
      this.fingerRoots.push(root);
      this.fans.push((mirror * finger.x) / 0.028);
      const chain = buildChain(root, finger.lengths, 0.013, material);
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
      // The thumb folds sideways, the fingers towards the palm.
      if (i === 0) {
        chain[0]!.rotation.z = -curl * 1.0;
        chain[1]!.rotation.z = -curl * 0.7;
      } else {
        chain[0]!.rotation.x = -curl * 1.5;
        chain[1]!.rotation.x = -curl * 1.4;
      }
    }
  }
}

function buildChain(
  root: THREE.Object3D,
  lengths: number[],
  radius: number,
  material: THREE.Material,
): THREE.Object3D[] {
  const joints: THREE.Object3D[] = [];
  let parent: THREE.Object3D = root;
  for (const length of lengths) {
    const joint = new THREE.Object3D();
    parent.add(joint);
    const bone = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius, Math.max(length - radius * 2, 0.005), 3, 8),
      material,
    );
    bone.rotation.x = Math.PI / 2;
    bone.position.set(0, 0, -length / 2);
    joint.add(bone);
    joints.push(joint);
    const next = new THREE.Object3D();
    next.position.set(0, 0, -length);
    joint.add(next);
    parent = next;
  }
  return joints;
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
  private readonly material: THREE.MeshStandardMaterial;

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

  /** Forces a gesture, e.g. while a portal gun is held. */
  setGestureOverride(handedness: Handedness, gesture: HandGesture | null): void {
    this.overrides.set(handedness, gesture);
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
        mesh = new THREE.Mesh(this.jointGeometry, this.material);
        joint.add(mesh);
        this.jointMeshes.set(joint, mesh);
      }
      mesh.scale.setScalar(Math.max((joint as THREE.XRJointSpace).jointRadius ?? 0.008, 0.004));
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
      hand = new ProceduralHand(controller.handedness, this.material);
      this.hands.set(controller, hand);
    }
    const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
    if (hand.parent !== anchor) anchor.add(hand);
    hand.visible = controller.tracked;
    controller.fingertip = hand.visible ? hand.indexTip : null;

    // The dialled-in pose is the base; the short-lived gestures (pointing at
    // something, a thumbs-up) still win while they last.
    hand.setPose(this.poseOf(controller.handedness));
    const gesture = this.gestureOf(controller);
    // `open` is the idle pose and a held tool brings its own grip, so those two
    // are already covered; a bare hand closing around a cube is not.
    const covered =
      gesture === 'open' || (gesture === 'grip' && this.holding.get(controller.handedness));
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
