/**
 * The maths behind the remote grab, deliberately free of three.js and Rapier so
 * it can be tested on its own — this is the part that kept going wrong.
 *
 * Two things happen here. Aiming: which object does the hand point at, given
 * that a domino across the room is a very small target. And the pull: once an
 * object is on its way it follows a fixed path to the hand instead of being
 * thrown and hoping for the best. A pull that does not arrive is worse than no
 * pull at all, so the path is time based and ends exactly at the hand.
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

/** An object the aim can lock onto: an oriented box. */
export interface AimTarget {
  position: Vec3;
  quaternion: Quat;
  /** Half size of the collider along its own axes. */
  halfExtents: Vec3;
}

/** How far a remote grab reaches. */
export const REMOTE_RANGE = 9;
/** Slack around a prop's box when aiming at it. */
export const REMOTE_AIM_MARGIN = 0.06;
/** …plus a cone that widens with distance, so far targets stay catchable. */
export const REMOTE_AIM_CONE = Math.tan((3.5 * Math.PI) / 180);
/** The grab box is the collider grown by this much — same for every object. */
export const GRAB_MARGIN = 0.09;
/** Both hands closer than this: the player is reaching for what they hold. */
export const HANDS_TOGETHER = 0.28;
/** A pull never takes longer than this, however far away the object is. */
export const FLIGHT_MIN = 0.28;
export const FLIGHT_MAX = 0.85;
/** Metres per second the pull aims for before the clamps bite. */
export const FLIGHT_SPEED = 8;
/** The flight is done once it is this close, so the hand catches it early. */
export const FLIGHT_CATCH = 0.16;

/** Rotates `v` by the quaternion `q`. */
function rotate(v: Vec3, q: Quat, out: Vec3): Vec3 {
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

/** Rotates `v` into the box's own frame — the inverse of `rotate`. */
function untransform(v: Vec3, q: Quat, out: Vec3): Vec3 {
  return rotate(v, _conjugate(q), out);
}

const _inverse: Quat = { x: 0, y: 0, z: 0, w: 1 };

function _conjugate(q: Quat): Quat {
  _inverse.x = -q.x;
  _inverse.y = -q.y;
  _inverse.z = -q.z;
  _inverse.w = q.w;
  return _inverse;
}

const _origin: Vec3 = { x: 0, y: 0, z: 0 };
const _direction: Vec3 = { x: 0, y: 0, z: 0 };
const _local: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * Distance along the ray at which it enters a target's box, or null when the
 * aim misses. The box grows by a fixed margin plus a cone that widens with
 * distance, so a far-away domino stays catchable without stealing the aim from
 * something closer.
 */
export function rayReach(target: AimTarget, origin: Vec3, direction: Vec3): number | null {
  _local.x = origin.x - target.position.x;
  _local.y = origin.y - target.position.y;
  _local.z = origin.z - target.position.z;
  untransform(_local, target.quaternion, _origin);
  untransform(direction, target.quaternion, _direction);

  const along = -(_origin.x * _direction.x + _origin.y * _direction.y + _origin.z * _direction.z);
  if (along < 0.25) return null;
  const slack = REMOTE_AIM_MARGIN + along * REMOTE_AIM_CONE;

  let near = 0;
  let far = Number.POSITIVE_INFINITY;
  for (const axis of ['x', 'y', 'z'] as const) {
    const start = _origin[axis];
    const step = _direction[axis];
    const half = target.halfExtents[axis] + slack;
    if (Math.abs(step) < 1e-6) {
      if (Math.abs(start) > half) return null;
      continue;
    }
    const a = (-half - start) / step;
    const b = (half - start) / step;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return null;
  }
  return near;
}

/**
 * How deep a point sits inside a target's grab box, or null when it is outside.
 * Smaller means "more inside", which makes picking the nearest one trivial.
 */
export function reachDepth(target: AimTarget, point: Vec3): number | null {
  _local.x = point.x - target.position.x;
  _local.y = point.y - target.position.y;
  _local.z = point.z - target.position.z;
  untransform(_local, target.quaternion, _origin);

  const depth = Math.max(
    Math.abs(_origin.x) - target.halfExtents.x,
    Math.abs(_origin.y) - target.halfExtents.y,
    Math.abs(_origin.z) - target.halfExtents.z,
  );
  return depth <= GRAB_MARGIN ? depth : null;
}

/** The nearest target the ray enters, within reach. */
export function pickAimTarget<T extends AimTarget>(
  targets: readonly T[],
  origin: Vec3,
  direction: Vec3,
  range = REMOTE_RANGE,
): T | null {
  let best: T | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const target of targets) {
    const distance = rayReach(target, origin, direction);
    if (distance === null || distance > range || distance >= bestDistance) continue;
    best = target;
    bestDistance = distance;
  }
  return best;
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** How long a pull over this distance should take. */
export function flightDuration(gap: number): number {
  return Math.min(Math.max(gap / FLIGHT_SPEED, FLIGHT_MIN), FLIGHT_MAX);
}

/** Smooth start, smooth landing. */
function ease(t: number): number {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Where a pulled object sits at progress `t` (0 = launch, 1 = in the hand).
 *
 * The path is recomputed against the *current* hand position every frame, so a
 * hand that moves drags the object along with it, and `t = 1` always lands
 * exactly in it. That is the whole point: physics may not have a say here, or
 * the object bounces off a crate halfway and never arrives.
 */
export function flightPosition(from: Vec3, hand: Vec3, t: number, out: Vec3): Vec3 {
  const blend = ease(t);
  out.x = from.x + (hand.x - from.x) * blend;
  out.y = from.y + (hand.y - from.y) * blend;
  out.z = from.z + (hand.z - from.z) * blend;
  // A gentle arc, so it looks thrown rather than dragged along a wire. It
  // vanishes at both ends, which keeps the landing exact.
  const lift = Math.min(distance(from, hand) * 0.12, 0.3);
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  out.y += Math.sin(clamped * Math.PI) * lift;
  return out;
}

/** True once the pull is over and the hand should simply hold the object. */
export function flightArrived(position: Vec3, hand: Vec3, t: number): boolean {
  return t >= 1 || distance(position, hand) <= FLIGHT_CATCH;
}

/**
 * Remote grabbing is off while the hands are together and one of them already
 * holds something — the player is reaching over to take it, not aiming across
 * the room.
 */
export function handsTooClose(a: Vec3 | null, b: Vec3 | null, otherHandBusy: boolean): boolean {
  if (!otherHandBusy || !a || !b) return false;
  return distance(a, b) < HANDS_TOGETHER;
}
