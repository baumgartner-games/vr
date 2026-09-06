/**
 * Which hand is which.
 *
 * The grip space is *not* mirrored between the two hands, so the shape has to
 * be: a right hand held palm down (palm towards -Y) with the fingers pointing
 * forward (-Z) has its thumb to the left, at -X. One wrong sign here put a
 * left hand on the right controller and nobody could say why the hands looked
 * odd. And a thumb that never folds is not a thumb — it used to bend around
 * the axis it runs along, which moves nothing at all.
 *
 * three.js, but no WebGL: this reads positions out of a scene graph.
 */
import * as THREE from 'three';
import { GhostHand, styleOfSetting } from './HandVisuals';
import { HOLD_HAND_POSE, IDLE_HAND_POSE, type HandPose } from './handPose';

/** World positions of the five fingertips: thumb, index, middle, ring, pinky. */
function fingertips(side: 'left' | 'right', pose: HandPose): THREE.Vector3[] {
  const ghost = new GhostHand(side, pose);
  ghost.updateMatrixWorld(true);
  const hand = ghost.children[0]!;
  return hand.children
    .filter((child) => !(child as THREE.Mesh).isMesh) // the palm is the one mesh
    .map((root) => {
      let node = root;
      // Down the chain: every joint carries its bone plus the next joint.
      for (;;) {
        const next = node.children.find((child) => !(child as THREE.Mesh).isMesh);
        if (!next) return node.getWorldPosition(new THREE.Vector3()).clone();
        node = next;
      }
    });
}

test('the thumb sits on the thumb side: -X on the right hand, +X on the left', () => {
  const [rightThumb, rightIndex, , , rightPinky] = fingertips('right', IDLE_HAND_POSE);
  expect(rightThumb!.x).toBeLessThan(rightIndex!.x); // furthest out on the thumb side
  expect(rightIndex!.x).toBeLessThan(rightPinky!.x); // index next to the thumb

  const [leftThumb, leftIndex, , , leftPinky] = fingertips('left', IDLE_HAND_POSE);
  expect(leftThumb!.x).toBeGreaterThan(leftIndex!.x);
  expect(leftIndex!.x).toBeGreaterThan(leftPinky!.x);
});

test('the two hands are exact mirror images of one another', () => {
  const right = fingertips('right', IDLE_HAND_POSE);
  const left = fingertips('left', IDLE_HAND_POSE);
  for (let i = 0; i < right.length; i++) {
    expect(left[i]!.x).toBeCloseTo(-right[i]!.x, 6);
    expect(left[i]!.y).toBeCloseTo(right[i]!.y, 6);
    expect(left[i]!.z).toBeCloseTo(right[i]!.z, 6);
  }
});

test('the thumb juts out sideways and forwards, clear of the fingers', () => {
  const [thumb, index] = fingertips('right', IDLE_HAND_POSE);
  // Further out than any finger …
  expect(thumb!.x).toBeLessThan(-0.05);
  // … and well short of the fingertips, not a sixth finger.
  expect(thumb!.z).toBeGreaterThan(index!.z + 0.05);
});

test('curling folds the thumb across the palm instead of leaving it straight', () => {
  const [open] = fingertips('right', IDLE_HAND_POSE);
  const [closed] = fingertips('right', HOLD_HAND_POSE);
  // Across the palm: from -X back towards the middle …
  expect(closed!.x).toBeGreaterThan(open!.x + 0.02);
  // … and down onto the palm side, which is -Y.
  expect(closed!.y).toBeLessThan(open!.y - 0.01);
});

/**
 * Ein Geist, der einer Hand nachgeführt wird.
 *
 * Am Gegenstand steht beim Nahgreifen eine Geisterhand, und sie soll dieselbe
 * Haltung zeigen wie die echte — sonst zeigt sie den falschen Griff. Zwei
 * Dinge dürfen dabei nicht passieren: dass die Finger auf der Startpose
 * stehen bleiben, und dass sie beim Nachführen aus dem Raum springt, weil in
 * der Pose ein Versatz steckt, der einer Hand am Controller gehört.
 */
describe('a ghost hand that follows the real one', () => {
  it('stays where it was put when the pose is set again', () => {
    const ghost = new GhostHand('right', IDLE_HAND_POSE);
    ghost.position.set(1, 2, -3);
    ghost.setPose(HOLD_HAND_POSE);
    ghost.updateMatrixWorld(true);
    expect(ghost.position.toArray()).toEqual([1, 2, -3]);
    // Auch die Hand darin: der Versatz der Pose gehört einem Controller.
    expect(ghost.children[0]!.position.length()).toBeCloseTo(0, 6);
  });

  it('closes its fingers when the gesture says grip', () => {
    const ghost = new GhostHand('right', IDLE_HAND_POSE);
    const open = new THREE.Vector3();
    const closed = new THREE.Vector3();
    const tip = (): THREE.Object3D => {
      let node: THREE.Object3D = ghost.children[0]!.children.find(
        (child) => !(child as THREE.Mesh).isMesh,
      )!;
      for (;;) {
        const next = node.children.find((child) => !(child as THREE.Mesh).isMesh);
        if (!next) return node;
        node = next;
      }
    };
    ghost.updateMatrixWorld(true);
    tip().getWorldPosition(open);
    ghost.setGesture('grip');
    ghost.update(1);
    ghost.updateMatrixWorld(true);
    tip().getWorldPosition(closed);
    expect(closed.distanceTo(open)).toBeGreaterThan(0.01);
  });

  it('nimmt die Finger allein an — sofort, ohne die Lage anzufassen', () => {
    const ghost = new GhostHand('right', HOLD_HAND_POSE);
    ghost.position.set(1, 2, -3);
    ghost.updateMatrixWorld(true);
    const before = ghost.indexTip.getWorldPosition(new THREE.Vector3());
    // Der Zeigefinger gestreckt, alles andere wie in der Faust: das ist der
    // Finger am Rahmen, den die Werkzeugseite bei losgelassenem Trigger zeigt.
    ghost.setCurls([0.55, 0, 0.85, 0.9, 0.9]);
    ghost.updateMatrixWorld(true);
    const after = ghost.indexTip.getWorldPosition(new THREE.Vector3());
    expect(after.distanceTo(before)).toBeGreaterThan(0.02);
    expect(ghost.position.toArray()).toEqual([1, 2, -3]);
  });

  it('remembers which way round it was built', () => {
    expect(new GhostHand('left', IDLE_HAND_POSE, { look: 'limbs' }).look).toBe('limbs');
    expect(new GhostHand('left', IDLE_HAND_POSE, { look: 'bones' }).look).toBe('bones');
    // Ohne Angabe das, was die Einstellung sagt — und ohne Speicher ist das
    // der Handschuh (`core/handLook.ts`).
    expect(new GhostHand('left', IDLE_HAND_POSE).look).toBe(styleOfSetting());
    expect(styleOfSetting()).toBe('glove');
  });

  it('trägt als Handschuh dieselben Gelenke — nur mehr Stoff darum', () => {
    // Der Handschuh ist dasselbe Skelett in einem anderen Kleid: die
    // Fingerspitze sitzt am selben Ort, die Faust ist dieselbe. Was dazukommt,
    // ist Geometrie — Manschette, runde Gelenke —, keine Haltung.
    const tipOf = (look: 'bones' | 'glove'): THREE.Vector3 => {
      const ghost = new GhostHand('right', HOLD_HAND_POSE, { look });
      ghost.update(1);
      ghost.updateMatrixWorld(true);
      return ghost.indexTip.getWorldPosition(new THREE.Vector3());
    };
    expect(tipOf('glove').distanceTo(tipOf('bones'))).toBeLessThan(1e-9);
    // Und der Stoff ist **ein** Stück: ein einziges gehäutetes Netz, dessen
    // Punkte an den Knochen hängen — nicht elf Kapseln und Kästen.
    const meshes: THREE.Mesh[] = [];
    const hand = new GhostHand('right', HOLD_HAND_POSE, { look: 'glove' });
    hand.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh);
    });
    const cloth = meshes.filter((mesh) => (mesh as THREE.SkinnedMesh).isSkinnedMesh);
    expect(cloth).toHaveLength(1);
    const glove = cloth[0] as THREE.SkinnedMesh;
    // Elf Knochen: die Hand und je zwei für Daumen und vier Finger.
    expect(glove.skeleton.bones).toHaveLength(11);
    expect(glove.geometry.getAttribute('skinWeight').count).toBeGreaterThan(500);

    // Dazu die drei schwarzen Striche des gezeichneten Handschuhs — und zwar
    // **oben**: sie liegen auf dem Handrücken (+Y) und laufen von den Knöcheln
    // zum Handgelenk (-Z nach +Z). Ein Abnäher in der Handfläche wäre keiner.
    const seams = meshes.filter((mesh) => mesh.name === 'glove-seam');
    expect(seams).toHaveLength(3);
    hand.updateMatrixWorld(true);
    for (const seam of seams) {
      seam.geometry.computeBoundingBox();
      const box = seam.geometry.boundingBox!;
      expect(box.min.y).toBeGreaterThan(0);
      expect(box.min.z).toBeLessThan(-0.04);
      expect(box.max.z).toBeGreaterThan(0.02);
    }
    // Und sie liegen nebeneinander: einer links, einer in der Mitte, einer rechts.
    const lanes = seams
      .map((seam) => {
        seam.geometry.computeBoundingBox();
        return seam.geometry.boundingBox!.getCenter(new THREE.Vector3()).x;
      })
      .sort((a, b) => a - b);
    expect(lanes[0]!).toBeLessThan(-0.005);
    expect(Math.abs(lanes[1]!)).toBeLessThan(0.002);
    expect(lanes[2]!).toBeGreaterThan(0.005);
  });
});

/**
 * **Jede Kugel einzeln an der gezeichneten Hand.**
 *
 * Eine Krümmung ist eine Zahl je Finger, und beide Knochen folgen ihr in
 * festem Verhältnis: eine Hand, die nur am Mittelgelenk knickt, gab es damit
 * nicht. Eine gemessene Haltung (`HandPose.joints`) hat je Knochen einen
 * Winkel und je Finger eine Fächerung — und genau das muss man an der
 * gezeichneten Hand wiederfinden, sonst ist die Messung eine Zahl im Speicher.
 */
describe('eine gemessene Haltung an der gezeichneten Hand', () => {
  /** Alle Gelenke eines Fingers, von der Wurzel zur Kuppe, in Weltkoordinaten. */
  function jointsOf(pose: HandPose, finger: number): THREE.Vector3[] {
    const ghost = new GhostHand('right', pose, { look: 'bones' });
    ghost.update(1);
    ghost.updateMatrixWorld(true);
    const hand = ghost.children[0]!;
    let node = hand.children.filter((child) => !(child as THREE.Mesh).isMesh)[finger]!;
    const out = [node.getWorldPosition(new THREE.Vector3())];
    for (;;) {
      const next = node.children.find((child) => !(child as THREE.Mesh).isMesh);
      if (!next) return out;
      node = next;
      out.push(node.getWorldPosition(new THREE.Vector3()));
    }
  }

  /** Eine Haltung, in der jeder Finger gestreckt und ungefächert steht. */
  const FLAT: HandPose = {
    ...IDLE_HAND_POSE,
    curls: [0, 0, 0, 0, 0],
    joints: new Array(20).fill(0) as number[],
  };

  /** Dieselbe, mit anderen Zahlen an genau einem Finger. */
  function bend(finger: number, bends: number[], fan = 0): HandPose {
    const joints = [...FLAT.joints!];
    joints.splice(finger * 4, 4, bends[0]!, bends[1]!, bends[2]!, fan);
    return { ...FLAT, joints };
  }

  it('beugt den zweiten Knochen, ohne den ersten anzufassen', () => {
    const straight = jointsOf(FLAT, 1);
    const tipOnly = jointsOf(bend(1, [0, 50, 0]), 1);
    const rootToo = jointsOf(bend(1, [50, 0, 0]), 1);
    // Der Knick sitzt hinter dem ersten Knochen: dessen Ende steht still …
    expect(tipOnly[2]!.distanceTo(straight[2]!)).toBeLessThan(1e-9);
    // … und die Kuppe nicht.
    expect(tipOnly[4]!.distanceTo(straight[4]!)).toBeGreaterThan(0.005);
    // Am Grundgelenk geknickt bewegt sich beides.
    expect(rootToo[2]!.distanceTo(straight[2]!)).toBeGreaterThan(0.005);
  });

  it('beugt zur Handfläche hin und nicht in den Handrücken', () => {
    const straight = jointsOf(FLAT, 2);
    const closed = jointsOf(bend(2, [60, 60, 0]), 2);
    // Die Handfläche ist -Y (`HandVisuals`), also geht eine Kuppe dorthin.
    expect(closed[4]!.y).toBeLessThan(straight[4]!.y - 0.01);
  });

  /**
   * Die **Spreizung je Finger** — der Grund, warum es die Gelenke gibt. Bisher
   * gab es eine einzige Zahl für alle vier Finger, und der Daumen war gar nicht
   * dabei: eine blanke Hand, die die Finger auffächert, sah gezeichnet aus wie
   * eine, die es nicht tut.
   */
  it('spreizt jeden Finger einzeln — den Daumen eingeschlossen', () => {
    for (const finger of [0, 1, 4]) {
      const straight = jointsOf(FLAT, finger);
      const fanned = jointsOf(bend(finger, [0, 0, 0], 25), finger);
      expect(fanned[4]!.distanceTo(straight[4]!)).toBeGreaterThan(0.01);
    }
    // Und die eine Spreizung der alten Haltung rührt den Daumen weiter nicht an:
    // sie meint die vier Finger, die auseinandergehen.
    const spread = { ...IDLE_HAND_POSE, spread: 25 };
    const thumb = jointsOf({ ...IDLE_HAND_POSE, spread: 0 }, 0);
    expect(jointsOf(spread, 0)[4]!.distanceTo(thumb[4]!)).toBeLessThan(1e-9);
  });

  it('lässt eine Haltung ohne Gelenke krümmen wie eh und je', () => {
    const open = jointsOf(IDLE_HAND_POSE, 1);
    const fist = jointsOf(HOLD_HAND_POSE, 1);
    expect(fist[4]!.distanceTo(open[4]!)).toBeGreaterThan(0.02);
  });
});
