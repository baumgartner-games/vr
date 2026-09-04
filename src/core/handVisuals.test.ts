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
import { GhostHand } from './HandVisuals';
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
