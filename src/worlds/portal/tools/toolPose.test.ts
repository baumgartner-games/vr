import { multiplyQuat, rotateVec, type Quat, type Vec3 } from './aim';
import {
  eulerXYZ,
  formatPose,
  holdPoseFrom,
  mirrorReadout,
  poseFromReadout,
  quatFromEulerXYZ,
  readPose,
  readoutFromArray,
  readoutToArray,
} from './toolPose';

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

describe('poseFromReadout', () => {
  it('is the exact inverse of readPose', () => {
    const pose = {
      position: { x: 0.021, y: -0.048, z: 0.033 },
      rotation: axisAngle({ x: 0.4, y: 1, z: -0.3 }, 62),
    };
    const again = poseFromReadout(readPose(pose));
    // The readout is rounded to millimetres and whole degrees, so the way back
    // lands next to the original — not on top of it.
    expectClose2(again.position, pose.position);
    expectSameRotationLoosely(again.rotation, pose.rotation);
  });

  it('reads typed-in numbers as the turn they describe', () => {
    const pose = poseFromReadout({ x: 1.5, y: -2, z: 3, pitch: -30, yaw: 0, roll: 0 });
    expectClose(pose.position, { x: 0.015, y: -0.02, z: 0.03 });
    expectSameRotation(pose.rotation, axisAngle({ x: 1, y: 0, z: 0 }, -30));
  });

  it('rebuilds an angle triple in the order eulerXYZ reads it', () => {
    const readout = { x: 0, y: 0, z: 0, pitch: 24, yaw: -37, roll: 12 };
    const euler = eulerXYZ(poseFromReadout(readout).rotation);
    expect((euler.x * 180) / Math.PI).toBeCloseTo(24, 6);
    expect((euler.y * 180) / Math.PI).toBeCloseTo(-37, 6);
    expect((euler.z * 180) / Math.PI).toBeCloseTo(12, 6);
  });
});

describe('mirrorReadout', () => {
  const readout = { x: 2.5, y: -1.2, z: 3, pitch: 20, yaw: -35, roll: 8 };

  it('flips the sideways offset and the two turns that follow it', () => {
    expect(mirrorReadout(readout)).toEqual({ x: -2.5, y: -1.2, z: 3, pitch: 20, yaw: 35, roll: -8 });
  });

  it('mirrored twice is where it started', () => {
    expect(mirrorReadout(mirrorReadout(readout))).toEqual(readout);
  });

  it('mirrors the rotation the way a mirror does', () => {
    // Reflecting about the x = 0 plane maps a rotation (x, y, z, w) to
    // (x, -y, -z, w). The angles have to agree with that.
    const source = poseFromReadout(readout).rotation;
    const mirrored = poseFromReadout(mirrorReadout(readout)).rotation;
    expectSameRotation(mirrored, { x: source.x, y: -source.y, z: -source.z, w: source.w });
  });
});

describe('readoutToArray', () => {
  it('round-trips through the six numbers the config code carries', () => {
    const readout = { x: 1, y: -2.5, z: 3, pitch: -12, yaw: 4, roll: 0 };
    expect(readoutFromArray(readoutToArray(readout))).toEqual(readout);
  });

  it('fills in zeros for a code that is missing values', () => {
    expect(readoutFromArray([1, 2])).toEqual({ x: 1, y: 2, z: 0, pitch: 0, yaw: 0, roll: 0 });
  });
});

describe('quatFromEulerXYZ', () => {
  it('agrees with three.js order XYZ: X first, then Y, then Z', () => {
    const angles = { x: 0.3, y: -0.7, z: 0.2 };
    const built = quatFromEulerXYZ(angles);
    const byHand = multiplyQuat(
      axisAngle({ x: 1, y: 0, z: 0 }, (angles.x * 180) / Math.PI),
      multiplyQuat(
        axisAngle({ x: 0, y: 1, z: 0 }, (angles.y * 180) / Math.PI),
        axisAngle({ x: 0, y: 0, z: 1 }, (angles.z * 180) / Math.PI),
        { x: 0, y: 0, z: 0, w: 1 },
      ),
      { x: 0, y: 0, z: 0, w: 1 },
    );
    expectSameRotation(built, byHand);
  });
});

/** Millimetre tolerance: the readout only carries one decimal of a centimetre. */
function expectClose2(a: Vec3, b: Vec3): void {
  expect(a.x).toBeCloseTo(b.x, 3);
  expect(a.y).toBeCloseTo(b.y, 3);
  expect(a.z).toBeCloseTo(b.z, 3);
}

/** Whole-degree tolerance, for the same reason. */
function expectSameRotationLoosely(a: Quat, b: Quat): void {
  for (const v of [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 },
  ]) {
    const one = rotateVec(v, a, { x: 0, y: 0, z: 0 });
    const two = rotateVec(v, b, { x: 0, y: 0, z: 0 });
    expect(one.x).toBeCloseTo(two.x, 2);
    expect(one.y).toBeCloseTo(two.y, 2);
    expect(one.z).toBeCloseTo(two.z, 2);
  }
}
