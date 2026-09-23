import { multiplyQuat, forwardOf, rotateVec, type Quat, type Vec3 } from './tools/aim';
import { GRIP_TO_RAY } from './tools/gripFit';
import { EYE_AIM_MIN, EYE_GRIP, eyeGripRotation, type EyeHold } from './eyeHand';

function quat(): Quat {
  return { x: 0, y: 0, z: 0, w: 1 };
}

function vec(): Vec3 {
  return { x: 0, y: 0, z: 0 };
}

/** Eine Pistole, wie sie ungefähr im Griff liegt: etwas davor, entlang des Strahls. */
const PISTOL: EyeHold = {
  position: { x: 0, y: 0.02, z: -0.05 },
  forward: forwardOf(GRIP_TO_RAY, vec()),
};

/** Wie weit die Laufachse am Punkt `distance` vor der Kamera vorbeigeht, in Metern. */
function miss(hold: EyeHold, distance: number): number {
  const q = eyeGripRotation(EYE_GRIP, hold, distance, quat());
  const at = rotateVec(hold.position, q, vec());
  at.x += EYE_GRIP.x;
  at.y += EYE_GRIP.y;
  at.z += EYE_GRIP.z;
  const along = rotateVec(hold.forward, q, vec());
  // Der Punkt auf der Laufachse, der dem Ziel am nächsten liegt.
  const tx = -at.x;
  const ty = -at.y;
  const tz = -distance - at.z;
  const s = tx * along.x + ty * along.y + tz * along.z;
  return Math.hypot(tx - s * along.x, ty - s * along.y, tz - s * along.z);
}

describe('die Hand vor dem Auge', () => {
  it('zeigt ohne Werkzeug mit dem Zeigestrahl geradeaus', () => {
    const q = eyeGripRotation(EYE_GRIP, null, 10, quat());
    const ray = forwardOf(multiplyQuat(q, GRIP_TO_RAY, quat()), vec());
    expect(ray.x).toBeCloseTo(0, 6);
    expect(ray.y).toBeCloseTo(0, 6);
    expect(ray.z).toBeCloseTo(-1, 6);
  });

  it.each([2, 5, 10, 30, 60])('trifft mit dem Lauf das Fadenkreuz auf %d m', (distance) => {
    expect(miss(PISTOL, distance)).toBeLessThan(0.001);
  });

  it('zielt auch mit einer schief eingemessenen Haltung auf die Mitte', () => {
    const tilted: EyeHold = {
      position: { x: 0.01, y: 0.03, z: -0.04 },
      forward: forwardOf(
        multiplyQuat(GRIP_TO_RAY, { x: 0.05, y: -0.08, z: 0.02, w: 0.995 }, quat()),
        vec(),
      ),
    };
    const length = Math.hypot(tilted.forward.x, tilted.forward.y, tilted.forward.z);
    tilted.forward.x /= length;
    tilted.forward.y /= length;
    tilted.forward.z /= length;
    expect(miss(tilted, 10)).toBeLessThan(0.001);
  });

  it('dreht sich vor einer Wand nicht quer, sondern zielt höchstens auf die Mindestweite', () => {
    const close = eyeGripRotation(EYE_GRIP, PISTOL, 0.2, quat());
    const floor = eyeGripRotation(EYE_GRIP, PISTOL, EYE_AIM_MIN, quat());
    expect(close).toEqual(floor);
  });

  it('schaut von rechts unten nach innen und oben', () => {
    const q = eyeGripRotation(EYE_GRIP, PISTOL, 5, quat());
    const along = rotateVec(PISTOL.forward, q, vec());
    expect(along.x).toBeLessThan(0);
    expect(along.y).toBeGreaterThan(0);
    expect(along.z).toBeLessThan(-0.9);
  });
});
