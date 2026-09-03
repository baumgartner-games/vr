/**
 * Where a tool sits in the hand.
 *
 * Every tool is built with a pose it is held in — a few centimetres of offset
 * and a bit of tilt. Guessing those numbers at the desk is how the x-ray
 * scanner ended up hanging off the wrist at an angle nobody can look through.
 *
 * The adjustment tool measures them instead: park a tool in mid-air, move the
 * hand to where it should have been, and this works out the offset that turns
 * one into the other. The result is exactly what a tool's constructor writes
 * into `holdPosition` and `holdRotation`, so a good pose can be measured once
 * and then written down in the code.
 *
 * Free of three.js, like `aim.ts`, so the maths can be tested on its own.
 */

import { conjugate, multiplyQuat, rotateVec, type Quat, type Vec3 } from './aim';

/** A pose inside the hand: the offset and the extra tilt on top of the aim. */
export interface HoldPose {
  position: Vec3;
  rotation: Quat;
}

/** The same pose in numbers a human can read — and type into a constructor. */
export interface PoseReadout {
  /** Centimetres. */
  x: number;
  y: number;
  z: number;
  /** Degrees, in the order three.js reads an `Euler` with order `XYZ`. */
  pitch: number;
  yaw: number;
  roll: number;
}

/**
 * The hold pose that would put a tool exactly where it is hanging now.
 *
 * @param grip     world pose of the hand the tool belongs to
 * @param aim      the aim correction that hand gets (`aimRotation`), because
 *                 the tool's own rotation is applied *after* it
 * @param parked   world pose the tool was left in
 */
export function holdPoseFrom(
  grip: { position: Vec3; rotation: Quat },
  aim: Quat,
  parked: { position: Vec3; rotation: Quat },
): HoldPose {
  const inverse = conjugate(grip.rotation, { x: 0, y: 0, z: 0, w: 1 });

  // The offset, written in the hand's own frame.
  const delta: Vec3 = {
    x: parked.position.x - grip.position.x,
    y: parked.position.y - grip.position.y,
    z: parked.position.z - grip.position.z,
  };
  const position = rotateVec(delta, inverse, { x: 0, y: 0, z: 0 });

  // The tilt, minus the aim the tool is going to be given anyway.
  const local = multiplyQuat(inverse, parked.rotation, { x: 0, y: 0, z: 0, w: 1 });
  const rotation = multiplyQuat(
    conjugate(aim, { x: 0, y: 0, z: 0, w: 1 }),
    local,
    { x: 0, y: 0, z: 0, w: 1 },
  );

  return { position, rotation: normalize(rotation) };
}

/** Turns a pose into the six numbers the tool shows the player. */
export function readPose(pose: HoldPose): PoseReadout {
  const { x, y, z } = eulerXYZ(pose.rotation);
  return {
    x: round(pose.position.x * 100, 1),
    y: round(pose.position.y * 100, 1),
    z: round(pose.position.z * 100, 1),
    pitch: round((x * 180) / Math.PI, 0),
    yaw: round((y * 180) / Math.PI, 0),
    roll: round((z * 180) / Math.PI, 0),
  };
}

/** One line for the HUD; the panel on the tool splits it over two rows. */
export function formatPose(readout: PoseReadout): string {
  return (
    `x ${readout.x} y ${readout.y} z ${readout.z} cm · ` +
    `roll ${readout.roll}° pitch ${readout.pitch}° yaw ${readout.yaw}°`
  );
}

/**
 * Euler angles of a rotation, in the order three.js uses by default (`XYZ`).
 * Handing the numbers straight back to `new THREE.Euler(pitch, yaw, roll)`
 * has to rebuild the very same rotation — that is what makes them worth
 * writing down.
 */
export function eulerXYZ(q: Quat): Vec3 {
  const { x, y, z, w } = q;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;

  const m11 = 1 - (yy + zz);
  const m12 = xy - wz;
  const m13 = xz + wy;
  const m22 = 1 - (xx + zz);
  const m23 = yz - wx;
  const m32 = yz + wx;
  const m33 = 1 - (xx + yy);

  const angleY = Math.asin(Math.max(-1, Math.min(1, m13)));
  if (Math.abs(m13) < 0.9999999) {
    return { x: Math.atan2(-m23, m33), y: angleY, z: Math.atan2(-m12, m11) };
  }
  // Straight up or down: yaw and roll are the same turn, so roll gets zero.
  return { x: Math.atan2(m32, m22), y: angleY, z: 0 };
}

function normalize(q: Quat): Quat {
  const length = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  // `-0` reads badly on a display that is all about small numbers.
  return (Math.round(value * factor) + 0) / factor;
}
