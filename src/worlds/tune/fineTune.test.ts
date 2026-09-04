/**
 * Die Untersetzung der Feinjustage.
 *
 * Was hier schiefgehen kann, merkt man in der Brille als „das reagiert ja gar
 * nicht" oder als „das haut mir die Haltung weg" — und beides sieht gleich
 * aus. Also wird nachgerechnet: dass ein Zentimeter wirklich ein Millimeter
 * wird, dass die Drehung denselben Faktor bekommt und in dieselbe Richtung
 * geht, und dass zehn Schritte dasselbe ergeben wie einer über dieselbe
 * Strecke — denn gerechnet wird gegen das Zupacken und nicht gegen das letzte
 * Bild.
 */
import { multiplyQuat, rotateVec, type Quat, type Vec3 } from '../portal/tools/aim';
import { FINE_FACTOR, nudgeGrip, scaleRotation, type Grip } from './fineTune';

const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

function axisAngle(axis: Vec3, degrees: number): Quat {
  const length = Math.hypot(axis.x, axis.y, axis.z);
  const half = (degrees * Math.PI) / 180 / 2;
  const s = Math.sin(half) / length;
  return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(half) };
}

/** Der Winkel einer Drehung in Grad, immer über den kürzeren Bogen. */
function angleOf(q: Quat): number {
  const w = Math.min(1, Math.abs(q.w) / (Math.hypot(q.x, q.y, q.z, q.w) || 1));
  return (2 * Math.acos(w) * 180) / Math.PI;
}

function expectClose(a: Vec3, b: Vec3, digits = 6): void {
  expect(a.x).toBeCloseTo(b.x, digits);
  expect(a.y).toBeCloseTo(b.y, digits);
  expect(a.z).toBeCloseTo(b.z, digits);
}

function expectSameRotation(a: Quat, b: Quat, digits = 6): void {
  for (const v of [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 },
  ]) {
    expectClose(
      rotateVec(v, a, { x: 0, y: 0, z: 0 }),
      rotateVec(v, b, { x: 0, y: 0, z: 0 }),
      digits,
    );
  }
}

describe('scaleRotation', () => {
  it('macht aus 30° drei', () => {
    const scaled = scaleRotation(axisAngle({ x: 0, y: 1, z: 0 }, 30), 0.1);
    expect(angleOf(scaled)).toBeCloseTo(3, 6);
  });

  it('behält die Achse und die Richtung', () => {
    const scaled = scaleRotation(axisAngle({ x: 0, y: 0, z: 1 }, 90), 0.5);
    expectSameRotation(scaled, axisAngle({ x: 0, y: 0, z: 1 }, 45));
  });

  it('nimmt den kürzeren Bogen — nicht den 330°-Weg herum', () => {
    // Dieselbe Drehung mit umgedrehten Vorzeichen ist dieselbe Drehung; ein
    // Zehntel davon wäre es nicht, wenn man den langen Weg nähme.
    const q = axisAngle({ x: 0, y: 1, z: 0 }, -30);
    const flipped: Quat = { x: -q.x, y: -q.y, z: -q.z, w: -q.w };
    expectSameRotation(scaleRotation(q, 0.1), scaleRotation(flipped, 0.1));
    expect(angleOf(scaleRotation(flipped, 0.1))).toBeCloseTo(3, 6);
  });

  it('macht aus keiner Drehung keine', () => {
    expectSameRotation(scaleRotation(IDENTITY, 0.1), IDENTITY);
  });
});

describe('nudgeGrip', () => {
  const grip: Grip = {
    position: { x: 0.2, y: 1.1, z: -0.3 },
    rotation: axisAngle({ x: 0.2, y: 1, z: 0.1 }, 40),
  };
  const from: Grip = {
    position: { x: 0, y: 1, z: 0 },
    rotation: axisAngle({ x: 1, y: 0, z: 0 }, 12),
  };

  it('macht aus einem Zentimeter einen Millimeter', () => {
    const to: Grip = { position: { x: 0.01, y: 1, z: 0 }, rotation: from.rotation };
    const moved = nudgeGrip(grip, from, to);
    expectClose(moved.position, {
      x: grip.position.x + 0.001,
      y: grip.position.y,
      z: grip.position.z,
    });
    // Die Lage bleibt, solange die Hand sich nicht dreht.
    expectSameRotation(moved.rotation, grip.rotation);
  });

  it('dreht in dieselbe Richtung wie die Hand, nur ein Zehntel weit', () => {
    const turn = axisAngle({ x: 0, y: 1, z: 0 }, 30);
    const to: Grip = {
      position: from.position,
      rotation: multiplyQuat(turn, from.rotation, { x: 0, y: 0, z: 0, w: 1 }),
    };
    const moved = nudgeGrip(grip, from, to);
    const wanted = multiplyQuat(axisAngle({ x: 0, y: 1, z: 0 }, 3), grip.rotation, {
      x: 0,
      y: 0,
      z: 0,
      w: 1,
    });
    expectSameRotation(moved.rotation, wanted);
  });

  it('rührt sich nicht, solange die Hand sich nicht rührt', () => {
    const moved = nudgeGrip(grip, from, from);
    expectClose(moved.position, grip.position);
    expectSameRotation(moved.rotation, grip.rotation);
  });

  it('summiert sich nicht auf: zehn Bilder sind dasselbe wie eines', () => {
    // Gerechnet wird gegen das Zupacken. Zehn Zwischenschritte auf demselben
    // Weg müssen deshalb genau dort enden, wo ein einziger endet — sonst
    // wandert der Geist über eine Minute Feinarbeit von selbst davon.
    const end: Grip = {
      position: { x: 0.06, y: 1.02, z: -0.04 },
      rotation: multiplyQuat(axisAngle({ x: 0.3, y: 1, z: 0 }, 24), from.rotation, {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
      }),
    };
    let last = nudgeGrip(grip, from, from);
    for (let step = 1; step <= 10; step++) {
      const t = step / 10;
      last = nudgeGrip(grip, from, {
        position: {
          x: from.position.x + (end.position.x - from.position.x) * t,
          y: from.position.y + (end.position.y - from.position.y) * t,
          z: from.position.z + (end.position.z - from.position.z) * t,
        },
        rotation: multiplyQuat(axisAngle({ x: 0.3, y: 1, z: 0 }, 24 * t), from.rotation, {
          x: 0,
          y: 0,
          z: 0,
          w: 1,
        }),
      });
    }
    const once = nudgeGrip(grip, from, end);
    expectClose(last.position, once.position);
    expectSameRotation(last.rotation, once.rotation);
  });

  it('ist mit Faktor 1 das ungebremste Mitziehen', () => {
    const to: Grip = { position: { x: 0.5, y: 1, z: 0 }, rotation: from.rotation };
    const moved = nudgeGrip(grip, from, to, 1);
    expectClose(moved.position, {
      x: grip.position.x + 0.5,
      y: grip.position.y,
      z: grip.position.z,
    });
  });

  it('untersetzt zehnfach', () => {
    expect(FINE_FACTOR).toBeCloseTo(0.1, 10);
  });
});
