import { multiplyQuat, rotateVec, type Quat, type Vec3 } from './aim';
import { eulerXYZ, formatPose, holdPoseFrom, readPose } from './toolPose';

const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

function axisAngle(axis: Vec3, degrees: number): Quat {
  const length = Math.hypot(axis.x, axis.y, axis.z);
  const half = ((degrees * Math.PI) / 180) / 2;
  const s = Math.sin(half) / length;
  return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(half) };
}

/** Where a tool ends up when it is held with `pose` in a hand at `grip`. */
function worldOf(
  grip: { position: Vec3; rotation: Quat },
  aim: Quat,
  pose: { position: Vec3; rotation: Quat },
): { position: Vec3; rotation: Quat } {
  const rotation = multiplyQuat(
    grip.rotation,
    multiplyQuat(aim, pose.rotation, { x: 0, y: 0, z: 0, w: 1 }),
    { x: 0, y: 0, z: 0, w: 1 },
  );
  const offset = rotateVec(pose.position, grip.rotation, { x: 0, y: 0, z: 0 });
  return {
    position: {
      x: grip.position.x + offset.x,
      y: grip.position.y + offset.y,
      z: grip.position.z + offset.z,
    },
    rotation,
  };
}

function expectClose(a: Vec3, b: Vec3): void {
  expect(a.x).toBeCloseTo(b.x, 6);
  expect(a.y).toBeCloseTo(b.y, 6);
  expect(a.z).toBeCloseTo(b.z, 6);
}

/** Quaternions are two-to-one, so compare what they do to a few directions. */
function expectSameRotation(a: Quat, b: Quat): void {
  for (const v of [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 },
  ]) {
    expectClose(rotateVec(v, a, { x: 0, y: 0, z: 0 }), rotateVec(v, b, { x: 0, y: 0, z: 0 }));
  }
}

describe('holdPoseFrom', () => {
  const grip = {
    position: { x: 0.3, y: 1.2, z: -0.4 },
    rotation: axisAngle({ x: 0.3, y: 1, z: 0.2 }, 47),
  };
  const aim = axisAngle({ x: 1, y: 0.2, z: 0 }, -31);

  it('reproduces the pose a tool was parked in', () => {
    const wanted = {
      position: { x: 0.02, y: -0.05, z: 0.03 },
      rotation: axisAngle({ x: 1, y: 0, z: 0 }, -35),
    };
    const parked = worldOf(grip, aim, wanted);

    const measured = holdPoseFrom(grip, aim, parked);
    expectClose(measured.position, wanted.position);
    expectSameRotation(measured.rotation, wanted.rotation);
    // And putting it back gives the pose it was measured from.
    const again = worldOf(grip, aim, measured);
    expectClose(again.position, parked.position);
    expectSameRotation(again.rotation, parked.rotation);
  });

  it('measures a pure offset when nothing is turned', () => {
    const flat = { position: { x: 0, y: 1, z: 0 }, rotation: IDENTITY };
    const pose = holdPoseFrom(flat, IDENTITY, {
      position: { x: 0, y: 1.1, z: -0.2 },
      rotation: IDENTITY,
    });
    expectClose(pose.position, { x: 0, y: 0.1, z: -0.2 });
    expectSameRotation(pose.rotation, IDENTITY);
  });

  it('takes the aim correction out of the tilt', () => {
    // A tool parked exactly along the aim needs no tilt of its own.
    const parked = worldOf(grip, aim, { position: { x: 0, y: 0, z: 0 }, rotation: IDENTITY });
    const pose = holdPoseFrom(grip, aim, parked);
    expectSameRotation(pose.rotation, IDENTITY);
  });
});

describe('readPose', () => {
  it('reads a tilt back as the angle it was made from', () => {
    const readout = readPose({
      position: { x: 0.012, y: -0.034, z: 0.021 },
      rotation: axisAngle({ x: 1, y: 0, z: 0 }, -34),
    });
    expect(readout.x).toBeCloseTo(1.2, 5);
    expect(readout.y).toBeCloseTo(-3.4, 5);
    expect(readout.z).toBeCloseTo(2.1, 5);
    expect(readout.pitch).toBe(-34);
    expect(readout.yaw).toBe(0);
    expect(readout.roll).toBe(0);
  });

  it('writes a line that carries every number', () => {
    const text = formatPose(readPose({ position: { x: 0, y: 0, z: 0 }, rotation: IDENTITY }));
    expect(text).toContain('x 0');
    expect(text).toContain('roll 0°');
  });
});

describe('eulerXYZ', () => {
  it('matches the rotation it came from, rebuilt in the same order', () => {
    const q = multiplyQuat(
      axisAngle({ x: 1, y: 0, z: 0 }, 20),
      multiplyQuat(
        axisAngle({ x: 0, y: 1, z: 0 }, -40),
        axisAngle({ x: 0, y: 0, z: 1 }, 15),
        { x: 0, y: 0, z: 0, w: 1 },
      ),
      { x: 0, y: 0, z: 0, w: 1 },
    );
    const euler = eulerXYZ(q);
    // Rebuilding an XYZ euler is X then Y then Z, applied in that order.
    const rebuilt = multiplyQuat(
      axisAngle({ x: 1, y: 0, z: 0 }, (euler.x * 180) / Math.PI),
      multiplyQuat(
        axisAngle({ x: 0, y: 1, z: 0 }, (euler.y * 180) / Math.PI),
        axisAngle({ x: 0, y: 0, z: 1 }, (euler.z * 180) / Math.PI),
        { x: 0, y: 0, z: 0, w: 1 },
      ),
      { x: 0, y: 0, z: 0, w: 1 },
    );
    expectSameRotation(rebuilt, q);
  });
});
