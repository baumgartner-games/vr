import { alignHandToGrip, type Ray } from './alignGrip';
import { quatFromEulerXYZ } from '../worlds/portal/tools/toolPose';
import {
  conjugate,
  multiplyQuat,
  rotateVec,
  type Quat,
  type Vec3,
} from '../worlds/portal/tools/aim';
import type { Pose } from '../worlds/tune/handGrip';

/**
 * Der Knopf **Auf den Griff** auf der Werkzeugseite.
 *
 * Geprüft wird das, was man im Bild nur *ungefähr* sieht: dass die beiden
 * Linien hinterher wirklich eine sind — gleiche Richtung, gleicher Ursprung —,
 * dass die Hand dabei nur so weit kippt, wie sie muss, und dass die
 * Gegenrichtung keine Hand aus lauter Nullen ergibt. Zwei Linien, die auf dem
 * Schirm zu Deckung kommen, sehen auch dann richtig aus, wenn sie einen Grad
 * auseinanderliegen; hier steht die Zahl.
 */

const HAND: Pose = {
  position: { x: 0.02, y: -0.05, z: 0.03 },
  rotation: quatFromEulerXYZ({ x: 0.4, y: -0.7, z: 0.2 }),
};

/** Die Fingerlinie, wie sie an der Hand sitzt: fest im Raum der Hand. */
const TIP: Vec3 = { x: 0.01, y: 0.005, z: -0.09 };
const TIP_FORWARD: Vec3 = { x: 0.1, y: -0.2, z: -1 };

/** Dieselbe Linie im Raum des Werkzeugs, für eine Hand, die dort liegt. */
function fingerRay(hand: Pose): Ray {
  const origin = rotateVec(TIP, hand.rotation, { x: 0, y: 0, z: 0 });
  return {
    origin: {
      x: hand.position.x + origin.x,
      y: hand.position.y + origin.y,
      z: hand.position.z + origin.z,
    },
    direction: rotateVec(TIP_FORWARD, hand.rotation, { x: 0, y: 0, z: 0 }),
  };
}

const GRIP: Ray = {
  origin: { x: -0.01, y: 0.06, z: 0.02 },
  direction: { x: 0, y: 0.3, z: -1 },
};

function unit(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

/** Der Winkel zwischen zwei Richtungen, in Grad. */
function angle(a: Vec3, b: Vec3): number {
  const x = unit(a);
  const y = unit(b);
  const dot = Math.max(-1, Math.min(1, x.x * y.x + x.y * y.y + x.z * y.z));
  return (Math.acos(dot) * 180) / Math.PI;
}

/** Wie weit sich zwei Drehungen unterscheiden, in Grad. */
function turned(a: Quat, b: Quat): number {
  const between = multiplyQuat(conjugate(a, { x: 0, y: 0, z: 0, w: 1 }), b, {
    x: 0,
    y: 0,
    z: 0,
    w: 1,
  });
  return (2 * Math.acos(Math.min(1, Math.abs(between.w))) * 180) / Math.PI;
}

describe('die Hand auf die Grifflinie legen', () => {
  const next = alignHandToGrip(HAND, fingerRay(HAND), GRIP);
  const line = fingerRay(next);

  it('legt die Fingerlinie in die Richtung der Grifflinie', () => {
    expect(angle(line.direction, GRIP.direction)).toBeCloseTo(0, 6);
  });

  it('setzt ihren Ursprung auf den des Griffs', () => {
    expect(line.origin.x).toBeCloseTo(GRIP.origin.x, 9);
    expect(line.origin.y).toBeCloseTo(GRIP.origin.y, 9);
    expect(line.origin.z).toBeCloseTo(GRIP.origin.z, 9);
  });

  it('dreht dabei nur so weit, wie die beiden Richtungen auseinanderliegen', () => {
    const before = fingerRay(HAND);
    expect(turned(HAND.rotation, next.rotation)).toBeCloseTo(
      angle(before.direction, GRIP.direction),
      6,
    );
  });

  it('lässt eine Hand stehen, die schon auf der Linie liegt', () => {
    const again = alignHandToGrip(next, fingerRay(next), GRIP);
    expect(turned(next.rotation, again.rotation)).toBeCloseTo(0, 6);
    expect(again.position.x).toBeCloseTo(next.position.x, 9);
    expect(again.position.y).toBeCloseTo(next.position.y, 9);
    expect(again.position.z).toBeCloseTo(next.position.z, 9);
  });

  it('dreht auch die Gegenrichtung um, statt die Hand zu verschlucken', () => {
    const back: Ray = {
      origin: GRIP.origin,
      direction: {
        x: -fingerRay(HAND).direction.x,
        y: -fingerRay(HAND).direction.y,
        z: -fingerRay(HAND).direction.z,
      },
    };
    const flipped = alignHandToGrip(HAND, fingerRay(HAND), back);
    expect(Number.isFinite(flipped.rotation.w)).toBe(true);
    expect(angle(fingerRay(flipped).direction, back.direction)).toBeCloseTo(0, 6);
    expect(turned(HAND.rotation, flipped.rotation)).toBeCloseTo(180, 6);
  });
});
