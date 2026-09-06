/**
 * **Jede Kugel der blanken Hand als Zahl** — nachgerechnet.
 *
 * Der Weg ist der einzige, der hier etwas beweist: eine Hand aus bekannten
 * Winkeln **bauen** und nachsehen, ob die Messung genau diese Winkel wieder
 * herausgibt. Alles andere wäre eine Zahl gegen eine Zahl, und die stimmt
 * immer, solange man beide aus derselben Rechnung nimmt.
 *
 * Gebaut wird mit three.js — Quaternionen sind Quaternionen, und die von Hand
 * auszuschreiben macht den Test nur schwerer zu lesen. Gemessen wird ohne, wie
 * die Datei selbst.
 */
import * as THREE from 'three';
import { FINGER_BONES, measureHand, type TrackedFinger, type TrackedJoint } from './handBones';
import type { GloveFit, Point3, Quat } from './gloveFit';

const DEG = Math.PI / 180;

/** Die Hand steht im Nullpunkt und schaut geradeaus: der einfachste Rahmen. */
const FIT: GloveFit = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  scale: 1,
};

/** Die Ruhelage des Daumens am Modell (`HandVisuals.THUMB_REST`), rechte Hand. */
const THUMB_REST = quat(new THREE.Euler(-0.22, 0.75, 0.6, 'XYZ'));
const STRAIGHT: Quat = { x: 0, y: 0, z: 0, w: 1 };
const REST: Quat[] = [THUMB_REST, STRAIGHT, STRAIGHT, STRAIGHT, STRAIGHT];

function quat(euler: THREE.Euler): Quat {
  const q = new THREE.Quaternion().setFromEuler(euler);
  return { x: q.x, y: q.y, z: q.z, w: q.w };
}

/**
 * Ein Finger, **vorwärts** gerechnet: aus Ruhelage, Wurzel, Knochenlängen,
 * Fächerung und Beugungen die vier Gelenke, die eine Brille davon melden
 * würde.
 *
 * Genau die Kette, die das Modell aufbaut: die Wurzel dreht um Y, jeder
 * Knochen darunter um X, und jeder Knochen zeigt in seinem Rahmen nach -Z.
 */
function buildFinger(
  rest: Quat,
  root: Point3,
  lengths: readonly number[],
  fan: number,
  bends: readonly number[],
  radius = 0.009,
): TrackedFinger {
  const frame = new THREE.Quaternion(rest.x, rest.y, rest.z, rest.w).multiply(
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), fan * DEG),
  );
  const at = new THREE.Vector3(root.x, root.y, root.z);
  const joints: TrackedJoint[] = [{ position: at.clone(), radius }];
  for (let bone = 0; bone < lengths.length; bone++) {
    frame.multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -bends[bone]! * DEG),
    );
    at.add(new THREE.Vector3(0, 0, -lengths[bone]!).applyQuaternion(frame));
    joints.push({ position: at.clone(), radius });
  }
  return { root: joints[0]!, mid: joints[1]!, far: joints[2]!, tip: joints[3]! };
}

/** Fünf Finger auf einmal, jeder mit seinen eigenen Winkeln. */
function buildHand(
  poses: ReadonlyArray<{ fan: number; bends: readonly number[]; radius?: number }>,
): TrackedFinger[] {
  const roots: Point3[] = [
    { x: -0.034, y: -0.006, z: 0.014 },
    { x: -0.028, y: 0, z: -0.046 },
    { x: -0.009, y: 0, z: -0.048 },
    { x: 0.01, y: 0, z: -0.046 },
    { x: 0.028, y: 0, z: -0.042 },
  ];
  const lengths = [
    [0.022, 0.018, 0.022],
    [0.04, 0.024, 0.021],
    [0.044, 0.026, 0.022],
    [0.041, 0.025, 0.021],
    [0.033, 0.019, 0.018],
  ];
  return poses.map((pose, i) =>
    buildFinger(REST[i]!, roots[i]!, lengths[i]!, pose.fan, pose.bends, pose.radius),
  );
}

const OPEN = [
  { fan: 0, bends: [0, 0, 0] },
  { fan: 0, bends: [0, 0, 0] },
  { fan: 0, bends: [0, 0, 0] },
  { fan: 0, bends: [0, 0, 0] },
  { fan: 0, bends: [0, 0, 0] },
];

describe('die Gelenke einer blanken Hand', () => {
  it('misst an einer Hand in Ruhelage überall null', () => {
    const measured = measureHand(FIT, buildHand(OPEN), REST)!;
    expect(measured).not.toBeNull();
    for (const finger of measured.fingers) {
      expect(finger.fan).toBeCloseTo(0, 6);
      for (const bend of finger.bends) expect(bend).toBeCloseTo(0, 6);
    }
  });

  /**
   * Der Kern der Sache: die Winkel, mit denen die Hand gebaut wurde, kommen
   * wieder heraus — **auch beim Daumen**, dessen Wurzel schräg steht. Ohne die
   * Ruhelage in der Rechnung stünde dort die Schrägstellung des Modells in der
   * Messung, und eine gemessene Haltung trüge sie ein zweites Mal.
   */
  it('gibt genau die Winkel zurück, aus denen die Hand gebaut wurde', () => {
    const poses = [
      { fan: -8, bends: [24, 31, 12] },
      { fan: 6, bends: [52, 44, 18] },
      { fan: 1, bends: [61, 50, 21] },
      { fan: -4, bends: [58, 47, 19] },
      { fan: -11, bends: [49, 41, 16] },
    ];
    const measured = measureHand(FIT, buildHand(poses), REST)!;
    for (let i = 0; i < poses.length; i++) {
      expect(measured.fingers[i]!.fan).toBeCloseTo(poses[i]!.fan, 4);
      for (let bone = 0; bone < FINGER_BONES; bone++) {
        expect(measured.fingers[i]!.bends[bone]).toBeCloseTo(poses[i]!.bends[bone]!, 4);
      }
    }
  });

  it('misst die Knochenlängen und die Dicke der Kugeln mit', () => {
    const measured = measureHand(FIT, buildHand(OPEN), REST)!;
    // Der Zeigefinger, wie oben gebaut: 4 cm, 2,4 cm, 2,1 cm.
    expect(measured.fingers[1]!.lengths[0]).toBeCloseTo(0.04, 6);
    expect(measured.fingers[1]!.lengths[1]).toBeCloseTo(0.024, 6);
    expect(measured.fingers[1]!.lengths[2]).toBeCloseTo(0.021, 6);
    // Und die dickste Kugel des Fingers ist das Maß für den Stoff darum.
    const fat = buildHand(OPEN.map((pose, i) => ({ ...pose, radius: i === 2 ? 0.013 : 0.009 })));
    expect(measureHand(FIT, fat, REST)!.fingers[2]!.radius).toBeCloseTo(0.013, 6);
  });

  it('legt die Wurzel dorthin, wo der Knöchel wirklich sitzt', () => {
    const measured = measureHand(FIT, buildHand(OPEN), REST)!;
    expect(measured.fingers[4]!.root.x).toBeCloseTo(0.028, 6);
    expect(measured.fingers[4]!.root.z).toBeCloseTo(-0.042, 6);
  });

  /**
   * Eine verschobene und gedrehte Hand ändert nichts: gemessen wird im Raum
   * der gezeichneten Hand, und der dreht mit. Ohne das stünde in jeder Messung,
   * wo im Zimmer man gerade steht.
   */
  it('misst dieselbe Haltung, wo immer die Hand im Raum steht', () => {
    const poses = [
      { fan: 3, bends: [20, 25, 10] },
      { fan: -5, bends: [40, 35, 15] },
      { fan: 0, bends: [45, 38, 16] },
      { fan: 4, bends: [43, 36, 14] },
      { fan: 9, bends: [38, 30, 12] },
    ];
    const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, -1.2, 0.3, 'XYZ'));
    const offset = new THREE.Vector3(1.4, -0.7, 2.2);
    const moved = buildHand(poses).map((finger) => ({
      root: move(finger.root!, turn, offset),
      mid: move(finger.mid!, turn, offset),
      far: move(finger.far!, turn, offset),
      tip: move(finger.tip!, turn, offset),
    }));
    const fit: GloveFit = {
      position: { x: offset.x, y: offset.y, z: offset.z },
      rotation: { x: turn.x, y: turn.y, z: turn.z, w: turn.w },
      scale: 1,
    };
    const measured = measureHand(fit, moved, REST)!;
    for (let i = 0; i < poses.length; i++) {
      expect(measured.fingers[i]!.fan).toBeCloseTo(poses[i]!.fan, 3);
      expect(measured.fingers[i]!.bends[0]).toBeCloseTo(poses[i]!.bends[0]!, 3);
      expect(measured.fingers[i]!.bends[2]).toBeCloseTo(poses[i]!.bends[2]!, 3);
    }
  });

  it('misst gar nichts, solange ein Gelenk fehlt', () => {
    const fingers = buildHand(OPEN);
    fingers[2] = { ...fingers[2]!, far: null };
    expect(measureHand(FIT, fingers, REST)).toBeNull();
    expect(measureHand(FIT, [], REST)).toBeNull();
  });
});

function move(joint: TrackedJoint, turn: THREE.Quaternion, offset: THREE.Vector3): TrackedJoint {
  const at = new THREE.Vector3(joint.position.x, joint.position.y, joint.position.z)
    .applyQuaternion(turn)
    .add(offset);
  return { position: at, radius: joint.radius };
}
