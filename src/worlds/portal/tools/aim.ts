/**
 * Where a held tool points.
 *
 * A controller has two poses, and they are not the same: the *grip* sits in
 * the fist and its -Z runs out along the top of the hand, while the *target
 * ray* is the direction the runtime says the player is pointing. On the Quest
 * the two are a good 30° apart — which is exactly how far off every tool that
 * simply hung in the grip space used to shoot.
 *
 * So nothing aims along the grip. A held tool gets the rotation from here,
 * which turns it out of the grip and onto the ray; from then on the tool's own
 * -Z *is* the aim, and a new tool gets that for free instead of having to
 * remember it.
 *
 * Deliberately free of three.js so the maths can be tested on its own.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

/** `out = a * b`, i.e. b applied first, then a. */
export function multiplyQuat(a: Quat, b: Quat, out: Quat): Quat {
  const x = a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y;
  const y = a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x;
  const z = a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w;
  const w = a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z;
  out.x = x;
  out.y = y;
  out.z = z;
  out.w = w;
  return out;
}

/** Inverse of a unit quaternion. */
export function conjugate(q: Quat, out: Quat): Quat {
  out.x = -q.x;
  out.y = -q.y;
  out.z = -q.z;
  out.w = q.w;
  return out;
}

/** Rotates `v` by `q`. */
export function rotateVec(v: Vec3, q: Quat, out: Vec3): Vec3 {
  const { x, y, z } = v;
  const { x: qx, y: qy, z: qz, w: qw } = q;
  const ix = qw * x + qy * z - qz * y;
  const iy = qw * y + qz * x - qx * z;
  const iz = qw * z + qx * y - qy * x;
  const iw = -qx * x - qy * y - qz * z;
  out.x = ix * qw - iw * qx - iy * qz + iz * qy;
  out.y = iy * qw - iw * qy - iz * qx + ix * qz;
  out.z = iz * qw - iw * qz - ix * qy + iy * qx;
  return out;
}

/** The -Z axis of a rotation: the direction a tool built along -Z points at. */
export function forwardOf(q: Quat, out: Vec3): Vec3 {
  return rotateVec(FORWARD, q, out);
}

const FORWARD: Vec3 = { x: 0, y: 0, z: -1 };

/**
 * Rotation to give something parented to the grip so that its -Z runs along
 * the pointing ray.
 *
 * Both poses have the same parent (the player rig), so their local rotations
 * can be compared directly — no world matrices needed.
 *
 * @param grip rotation of the grip space
 * @param ray  rotation of the target ray space, or the grip again when the
 *             runtime has no separate ray (then this is the identity)
 */
export function aimRotation(grip: Quat, ray: Quat, out: Quat): Quat {
  conjugate(grip, out);
  return multiplyQuat(out, ray, out);
}

/** Angle between two directions in radians; both are assumed to be unit length. */
export function angleBetween(a: Vec3, b: Vec3): number {
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  return Math.acos(dot);
}

/**
 * How far off the aim of something that is *not* corrected is: the angle
 * between the grip's own -Z and the ray. Only used by the tests and by the
 * comment above, but it is the number this whole module exists for.
 */
export function aimError(grip: Quat, ray: Quat): number {
  const a = forwardOf(grip, { x: 0, y: 0, z: 0 });
  const b = forwardOf(ray, { x: 0, y: 0, z: 0 });
  return angleBetween(a, b);
}
