import {
  aimError,
  aimRotation,
  angleBetween,
  forwardOf,
  multiplyQuat,
  type Quat,
  type Vec3,
} from './aim';

const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

function quat(): Quat {
  return { x: 0, y: 0, z: 0, w: 1 };
}

function vec(): Vec3 {
  return { x: 0, y: 0, z: 0 };
}

/** Rotation of `degrees` around an axis. */
function axisAngle(axis: Vec3, degrees: number): Quat {
  const length = Math.hypot(axis.x, axis.y, axis.z);
  const half = ((degrees * Math.PI) / 180) / 2;
  const s = Math.sin(half) / length;
  return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(half) };
}

const RIGHT: Vec3 = { x: 1, y: 0, z: 0 };
const UP: Vec3 = { x: 0, y: 1, z: 0 };

/** Where a tool held in `grip` and corrected by `aimRotation` actually points. */
function toolForward(grip: Quat, ray: Quat): Vec3 {
  const local = aimRotation(grip, ray, quat());
  const world = multiplyQuat(grip, local, quat());
  return forwardOf(world, vec());
}

function degreesBetween(a: Vec3, b: Vec3): number {
  return (angleBetween(a, b) * 180) / Math.PI;
}

describe('aimRotation', () => {
  it('leaves a tool alone when grip and ray agree', () => {
    const local = aimRotation(IDENTITY, IDENTITY, quat());
    expect(local.x).toBeCloseTo(0, 12);
    expect(local.y).toBeCloseTo(0, 12);
    expect(local.z).toBeCloseTo(0, 12);
    expect(Math.abs(local.w)).toBeCloseTo(1, 12);
  });

  it('cancels the tilt between grip and ray — the 30° the pistol shot too high', () => {
    // Grip pitched up against the ray: pointing straight ahead used to send the
    // shot 30° over the target.
    const ray = IDENTITY;
    const grip = axisAngle(RIGHT, 30);
    expect(degreesBetween(forwardOf(grip, vec()), forwardOf(ray, vec()))).toBeCloseTo(30, 6);

    const aimed = toolForward(grip, ray);
    expect(degreesBetween(aimed, forwardOf(ray, vec()))).toBeCloseTo(0, 6);
    // Straight ahead, and no longer above the horizon.
    expect(aimed.y).toBeCloseTo(0, 6);
    expect(aimed.z).toBeCloseTo(-1, 6);
  });

  it('points along the ray whatever the hand does', () => {
    const cases: Array<[Quat, Quat]> = [
      [axisAngle(RIGHT, -42), axisAngle(RIGHT, 7)],
      [axisAngle(UP, 90), axisAngle(UP, 35)],
      [
        multiplyQuat(axisAngle(UP, 61), axisAngle(RIGHT, -33), quat()),
        multiplyQuat(axisAngle(RIGHT, 12), axisAngle({ x: 0, y: 0, z: 1 }, 80), quat()),
      ],
      [
        multiplyQuat(axisAngle({ x: 0, y: 0, z: 1 }, -120), axisAngle(UP, 15), quat()),
        multiplyQuat(axisAngle(UP, -75), axisAngle(RIGHT, 48), quat()),
      ],
    ];

    for (const [grip, ray] of cases) {
      const expected = forwardOf(ray, vec());
      const aimed = toolForward(grip, ray);
      expect(aimed.x).toBeCloseTo(expected.x, 10);
      expect(aimed.y).toBeCloseTo(expected.y, 10);
      expect(aimed.z).toBeCloseTo(expected.z, 10);
    }
  });

  it('keeps the roll of the ray, so a tool is not upside down', () => {
    const grip = axisAngle(RIGHT, 25);
    const ray = axisAngle({ x: 0, y: 0, z: 1 }, 40);
    const local = aimRotation(grip, ray, quat());
    const world = multiplyQuat(grip, local, quat());
    // Same rotation as the ray, up to the sign every quaternion pair has.
    const sign = world.w * ray.w >= 0 ? 1 : -1;
    expect(world.x * sign).toBeCloseTo(ray.x, 10);
    expect(world.y * sign).toBeCloseTo(ray.y, 10);
    expect(world.z * sign).toBeCloseTo(ray.z, 10);
    expect(world.w * sign).toBeCloseTo(ray.w, 10);
  });
});

describe('aimError', () => {
  it('measures how far an uncorrected tool is off', () => {
    expect((aimError(axisAngle(RIGHT, 30), IDENTITY) * 180) / Math.PI).toBeCloseTo(30, 6);
    expect(aimError(IDENTITY, IDENTITY)).toBeCloseTo(0, 12);
  });
});
