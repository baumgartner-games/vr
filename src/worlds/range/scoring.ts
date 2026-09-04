/**
 * What a hit is worth, and where it sat.
 *
 * The maths of the shooting range, deliberately free of three.js and Rapier: it
 * works in the target's *own* coordinates and the caller brings the shot there.
 * This is exactly the kind of code that fails quietly — a number nobody sees is
 * indistinguishable from nothing having happened at all.
 *
 * The reason for the lead is written down at `LEAD`.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * The rings of a bullseye, from the middle out: how far out each one reaches
 * as a share of the radius, and what it is worth. The same five rings the face
 * is painted with, so what is counted is what is seen.
 */
export const RINGS: ReadonlyArray<{ upTo: number; points: number }> = [
  { upTo: 0.21, points: 10 },
  { upTo: 0.4, points: 8 },
  { upTo: 0.58, points: 6 },
  { upTo: 0.77, points: 4 },
  { upTo: 1, points: 2 },
];

/** A steel plate is a hit or a miss, nothing in between. */
export const PLATE_POINTS = 5;

/**
 * How far past its own path a round still counts, in metres.
 *
 * This is why the range stayed silent for so long: the physics stops the round
 * *before* its centre is inside the disc — the ball's radius plus half the
 * disc's thickness, a good four centimetres — and then it bounces back a bit
 * more. A frame's path therefore ends in front of the face plane, and a test
 * that demands a crossing of that plane never reports a hit. The lead extends
 * the path along its own direction: it invents no hits, it finishes counting
 * the ones the physics stopped just short of.
 */
export const LEAD = 0.25;

/** What a hole at this spot on the face is worth. */
export function ringPoints(radial: number): number {
  return RINGS.find((ring) => radial <= ring.upTo)?.points ?? 2;
}

/** A target, as the plain maths knows it. */
export interface FaceShape {
  /** Radius of a bullseye, or half the width of a plate. */
  radius: number;
  /**
   * A steel plate rather than a bullseye: a square whose face looks along the
   * local Z — a bullseye is a cylinder lying down, and its face is `y = 0`.
   */
  plate: boolean;
}

/** Where a path went through the face. */
export interface FaceHit {
  /** 0 in the middle, 1 at the rim. Always 0 for a plate. */
  radial: number;
  /** The hole, still in the target's own coordinates. */
  point: Vec3;
  /** What the hit is worth. */
  points: number;
}

/**
 * A round's path against a face — both in the target's own coordinates, which
 * for that reason must be neither scaled nor skewed (the caller multiplies the
 * world matrix in, and the targets have scale 1).
 *
 * The segment is tested, not the point: at 120 m/s a round moves two metres
 * between two frames, and a target it went straight through in the middle of
 * one would otherwise never have been touched. On top of that comes the `LEAD`
 * at the end of the segment, see above.
 *
 * @returns null when the path (lead included) misses the face.
 */
export function faceHit(from: Vec3, to: Vec3, shape: FaceShape, lead = LEAD): FaceHit | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dy, dz);
  if (length < 1e-9) return null;

  // The lead is *more of the same path*, so it is said in the same t.
  const tMax = 1 + lead / length;

  const start = shape.plate ? from.z : from.y;
  const span = shape.plate ? dz : dy;
  // Parallel to the face: it may pass beside it, it cannot go through it.
  if (Math.abs(span) < 1e-9) return null;
  const t = -start / span;
  if (t < 0 || t > tMax) return null;

  const x = from.x + dx * t;
  const y = from.y + dy * t;
  const z = from.z + dz * t;

  if (shape.plate) {
    if (Math.abs(x) > shape.radius || Math.abs(y) > shape.radius) return null;
    return { radial: 0, point: { x, y, z }, points: PLATE_POINTS };
  }

  const radial = Math.hypot(x, z) / shape.radius;
  if (radial > 1) return null;
  return { radial, point: { x, y, z }, points: ringPoints(radial) };
}
