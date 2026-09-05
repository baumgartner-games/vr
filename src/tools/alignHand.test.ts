import { alignHandToLine, handAboutPivot, turnHandTo, type Ray } from './alignHand';
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
 * Die beiden Knöpfe **Auf den Griff** und **In Zielrichtung** auf der
 * Werkzeugseite, und der Drehpunkt an der Fingerspitze.
 *
 * Geprüft wird das, was man im Bild nur *ungefähr* sieht: dass die Linien
 * hinterher wirklich aufeinander liegen, dass die Hand dabei nur so weit kippt,
 * wie sie muss, dass beim Schwenken auf eine Richtung die Spitze wirklich
 * stehen bleibt — und dass die Gegenrichtung keine Hand aus lauter Nullen
 * ergibt. Zwei Linien, die auf dem Schirm zu Deckung kommen, sehen auch dann
 * richtig aus, wenn sie einen Grad auseinanderliegen; hier steht die Zahl.
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

/** Wohin das Werkzeug zielt: sein eigenes -Z, hier schon leicht gedreht. */
const AIM: Vec3 = { x: 0.2, y: 0.1, z: -1 };

function unit(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

/**
 * Der Winkel zwischen zwei Richtungen, in Grad.
 *
 * Verglichen wird auf vier Nachkommastellen und nicht auf neun: `acos` hat bei
 * einem Skalarprodukt nahe 1 nur die halbe Genauigkeit einer Zahl übrig — ein
 * Rest von einem Zehntausendstel Grad ist die Grenze der Arithmetik und nicht
 * die der Rechnung.
 */
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

function expectAt(point: Vec3, at: Vec3): void {
  expect(point.x).toBeCloseTo(at.x, 9);
  expect(point.y).toBeCloseTo(at.y, 9);
  expect(point.z).toBeCloseTo(at.z, 9);
}

describe('die Hand auf die Grifflinie legen', () => {
  const next = alignHandToLine(HAND, fingerRay(HAND), GRIP);
  const line = fingerRay(next);

  it('legt die Fingerlinie in die Richtung der Grifflinie', () => {
    expect(angle(line.direction, GRIP.direction)).toBeCloseTo(0, 4);
  });

  it('setzt ihren Ursprung auf den des Griffs', () => {
    expectAt(line.origin, GRIP.origin);
  });

  it('dreht dabei nur so weit, wie die beiden Richtungen auseinanderliegen', () => {
    const before = fingerRay(HAND);
    expect(turned(HAND.rotation, next.rotation)).toBeCloseTo(
      angle(before.direction, GRIP.direction),
      4,
    );
  });

  it('lässt eine Hand stehen, die schon auf der Linie liegt', () => {
    const again = alignHandToLine(next, fingerRay(next), GRIP);
    expect(turned(next.rotation, again.rotation)).toBeCloseTo(0, 4);
    expectAt(again.position, next.position);
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
    const flipped = alignHandToLine(HAND, fingerRay(HAND), back);
    expect(Number.isFinite(flipped.rotation.w)).toBe(true);
    expect(angle(fingerRay(flipped).direction, back.direction)).toBeCloseTo(0, 4);
    expect(turned(HAND.rotation, flipped.rotation)).toBeCloseTo(180, 4);
  });
});

describe('die Hand in die Zielrichtung schwenken', () => {
  const before = fingerRay(HAND);
  const next = turnHandTo(HAND, before, AIM);
  const line = fingerRay(next);

  it('legt den Finger in die Zielrichtung', () => {
    expect(angle(line.direction, AIM)).toBeCloseTo(0, 4);
  });

  it('lässt die Fingerspitze dabei genau liegen — es dreht sich nur die Faust', () => {
    expectAt(line.origin, before.origin);
  });

  it('nimmt auch hier den kürzesten Bogen', () => {
    expect(turned(HAND.rotation, next.rotation)).toBeCloseTo(angle(before.direction, AIM), 4);
  });

  it('kommt nach der Griff-Ausrichtung, ohne sie zu verwerfen', () => {
    // Erst auf den Griff, dann aufs Ziel: der Ursprung bleibt der des Griffs,
    // die Richtung wird die des Werkzeugs. Genau dieser Weg ist der Sinn der
    // beiden Knöpfe nebeneinander.
    const onGrip = alignHandToLine(HAND, fingerRay(HAND), GRIP);
    const aimed = turnHandTo(onGrip, fingerRay(onGrip), AIM);
    expectAt(fingerRay(aimed).origin, GRIP.origin);
    expect(angle(fingerRay(aimed).direction, AIM)).toBeCloseTo(0, 4);
  });
});

describe('der Drehpunkt an der Fingerspitze', () => {
  const finger = fingerRay(HAND);
  const rotation = quatFromEulerXYZ({ x: -0.3, y: 1.1, z: 0.9 });
  const next = handAboutPivot(HAND, finger, rotation, finger.origin);

  it('nimmt die Drehung, die der Regler sagt', () => {
    expect(turned(next.rotation, rotation)).toBeCloseTo(0, 4);
  });

  it('lässt die Spitze auf ihrem Punkt liegen, wie weit auch gedreht wird', () => {
    expectAt(fingerRay(next).origin, finger.origin);
  });

  it('hält auch einen Punkt fest, der nicht der jetzige ist', () => {
    const pivot: Vec3 = { x: 0.05, y: 0.01, z: -0.02 };
    const moved = handAboutPivot(HAND, finger, rotation, pivot);
    expectAt(fingerRay(moved).origin, pivot);
  });

  it('bewegt bei unveränderter Drehung gar nichts', () => {
    const same = handAboutPivot(HAND, finger, HAND.rotation, finger.origin);
    expectAt(same.position, HAND.position);
  });
});
