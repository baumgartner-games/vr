/**
 * Der Rahmen der echten Hand.
 *
 * Getestet wird, was man beim Ziehen am Regler zwar sofort **sieht**, aber
 * nicht nachrechnen kann: dass „vorne" wirklich der Zeigestrahl ist und nicht
 * das -Z des Griffraums, dass ein Zentimeter auf einer Achse bei jedem
 * Werkzeug in dieselbe Richtung geht — das ist der ganze Grund für diesen
 * Rahmen —, und dass der Weg zurück in den Speicher derselbe Weg ist. Ginge
 * dabei ein Vorzeichen verloren, zöge der Regler quer zu dem, was man sieht,
 * und man justierte gegen den Fehler nach.
 */
import { GRIP_TO_RAY } from '../worlds/portal/tools/gripFit';
import { multiplyQuat, rotateVec, type Quat, type Vec3 } from '../worlds/portal/tools/aim';
import { REAL_HAND, fromRealHand, inRealHand } from './handFrame';
import type { Pose } from '../worlds/tune/handGrip';

const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };

function axisAngle(axis: Vec3, degrees: number): Quat {
  const length = Math.hypot(axis.x, axis.y, axis.z);
  const half = (degrees * Math.PI) / 180 / 2;
  const s = Math.sin(half) / length;
  return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(half) };
}

function expectClose(a: Vec3, b: Vec3, digits = 6): void {
  expect(a.x).toBeCloseTo(b.x, digits);
  expect(a.y).toBeCloseTo(b.y, digits);
  expect(a.z).toBeCloseTo(b.z, digits);
}

/** Zwei Drehungen sind dieselbe, wenn sie mit den Achsen dasselbe tun. */
function expectSameRotation(a: Quat, b: Quat, digits = 6): void {
  for (const v of [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 },
  ]) {
    expectClose(rotateVec(v, a, ORIGIN), rotateVec(v, b, ORIGIN), digits);
  }
}

/** Wohin eine Achse des Rahmens im Griffraum zeigt. */
function axisInGrip(axis: Vec3): Vec3 {
  return rotateVec(axis, GRIP_TO_RAY, ORIGIN);
}

const TOOL_A: Pose = {
  position: { x: 0.02, y: -0.01, z: 0.03 },
  rotation: axisAngle({ x: 0.2, y: 1, z: -0.4 }, 37),
};

const TOOL_B: Pose = {
  position: { x: -0.05, y: 0.11, z: -0.02 },
  rotation: axisAngle({ x: 1, y: 0.3, z: 0.6 }, -114),
};

describe('der Rahmen der echten Hand', () => {
  it('steht im Griffpunkt: was im Griff sitzt, sitzt auch in der Hand bei null', () => {
    // Der Ursprung ist die Mitte der Faust und nicht die Kante, an der der
    // gezeichnete Strahl anfängt — sonst hieße „x y z alle null" plötzlich
    // etwas anderes als im Speicher.
    expectClose(REAL_HAND.position, ORIGIN);
    expectClose(inRealHand({ position: ORIGIN, rotation: GRIP_TO_RAY }).position, ORIGIN);
  });

  it('schaut den Zeigestrahl entlang und nicht das -Z des Griffs', () => {
    const ahead = fromRealHand({ position: { x: 0, y: 0, z: -1 }, rotation: REAL_HAND.rotation });
    expectClose(ahead.position, axisInGrip({ x: 0, y: 0, z: -1 }));
    // Und das ist wirklich woanders: 30° liegen zwischen den beiden.
    expect(ahead.position.z).toBeCloseTo(-Math.cos((30 * Math.PI) / 180), 6);
    expect(ahead.position.y).toBeCloseTo(-Math.sin((30 * Math.PI) / 180), 6);
  });

  it('schiebt bei jedem Werkzeug in dieselbe Richtung', () => {
    // Der ganze Grund für den Rahmen: ein Zentimeter „nach rechts" ist rechts
    // von der eigenen Hand aus — egal, wie das Ding darin liegt.
    for (const axis of [
      { x: 0.01, y: 0, z: 0 },
      { x: 0, y: 0.01, z: 0 },
      { x: 0, y: 0, z: 0.01 },
    ]) {
      for (const tool of [TOOL_A, TOOL_B]) {
        const here = inRealHand(tool);
        const moved = fromRealHand({
          position: {
            x: here.position.x + axis.x,
            y: here.position.y + axis.y,
            z: here.position.z + axis.z,
          },
          rotation: here.rotation,
        });
        expectClose(
          {
            x: moved.position.x - tool.position.x,
            y: moved.position.y - tool.position.y,
            z: moved.position.z - tool.position.z,
          },
          axisInGrip(axis),
        );
      }
    }
  });

  it('dreht um die Achsen der Hand, nicht um die des Werkzeugs', () => {
    // 45° um das Y des Rahmens drehen das Ding im Griffraum um genau die
    // Achse, die im Bild als grüner Arm in der Hand steht — auch dann, wenn es
    // selbst quer darin liegt.
    const turn = axisAngle({ x: 0, y: 1, z: 0 }, 45);
    const here = inRealHand(TOOL_B);
    const turned = fromRealHand({
      position: here.position,
      rotation: multiplyQuat(turn, here.rotation, { x: 0, y: 0, z: 0, w: 1 }),
    });
    const aboutHandY = axisAngle(axisInGrip({ x: 0, y: 1, z: 0 }), 45);
    expectSameRotation(
      turned.rotation,
      multiplyQuat(aboutHandY, TOOL_B.rotation, { x: 0, y: 0, z: 0, w: 1 }),
    );
  });

  it('führt jede Lage hin und zurück ohne einen Millimeter Drift', () => {
    for (const tool of [TOOL_A, TOOL_B, REAL_HAND]) {
      const there = fromRealHand(inRealHand(tool));
      expectClose(there.position, tool.position);
      expectSameRotation(there.rotation, tool.rotation);
    }
  });
});
