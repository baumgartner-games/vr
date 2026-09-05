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
    new GhostHand('right', HOLD_HAND_POSE, { look: 'glove' }).traverse((object) => {
      if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh);
    });
    expect(meshes).toHaveLength(1);
    const glove = meshes[0] as THREE.SkinnedMesh;
    expect(glove.isSkinnedMesh).toBe(true);
    // Elf Knochen: die Hand und je zwei für Daumen und vier Finger.
    expect(glove.skeleton.bones).toHaveLength(11);
    expect(glove.geometry.getAttribute('skinWeight').count).toBeGreaterThan(500);
  });
});
