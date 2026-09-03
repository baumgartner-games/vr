/**
 * Turning an object's own axes towards the player.
 *
 * The handles of the transform tool float in front of the player, not on the
 * object — but they still have to move the object along *its* axes, otherwise
 * "wider, but not taller" is impossible for anything that stands askew.
 *
 * So the frame is built twice: the directions come from the object, the order
 * and the signs come from the view. The axis that points most to the right
 * becomes the right-hand arrow, the one that points most upwards the upward
 * arrow — whichever of the object's axes those happen to be. The handles then
 * sit the way the player sees them and still drive the object's own axes.
 *
 * Deliberately free of three.js so the maths can be tested on its own.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** One handle direction: which of the object's axes it drives, and which way. */
export interface AxisMatch {
  /** Index into the object's axes, 0..2. */
  axis: number;
  /** +1 when the object's axis already points that way, -1 when it is flipped. */
  sign: number;
}

export type Basis = readonly [Vec3, Vec3, Vec3];

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Pairs every view direction with the object axis that comes closest to it.
 *
 * @param object the object's three axes in world space (unit length)
 * @param view   right, up and *back* of the player (the third one pointing at
 *               them), in world space — a right-handed frame, so the result
 *               stays a rotation
 * @returns one entry per view direction, in the same order
 */
export function matchAxes(object: Basis, view: Basis): AxisMatch[] {
  const taken = [false, false, false];
  const result: AxisMatch[] = [];

  for (const direction of view) {
    let best = -1;
    let bestScore = -1;
    let bestSign = 1;
    for (let axis = 0; axis < 3; axis++) {
      if (taken[axis]) continue;
      const value = dot(object[axis]!, direction);
      const score = Math.abs(value);
      if (score <= bestScore) continue;
      best = axis;
      bestScore = score;
      bestSign = value < 0 ? -1 : 1;
    }
    taken[best] = true;
    result.push({ axis: best, sign: bestSign });
  }

  return handed(object, result);
}

/**
 * Makes the matched frame right-handed again.
 *
 * A permutation with signs can come out mirrored, and a mirrored frame is not
 * a rotation — three.js would build a matrix nothing sane comes out of. The
 * flip goes to whichever axis the view cared about least, so the two directions
 * the player actually looks along keep pointing where they should.
 */
function handed(object: Basis, match: AxisMatch[]): AxisMatch[] {
  const columns = match.map((entry) => scale(object[entry.axis]!, entry.sign));
  const [x, y, z] = columns as [Vec3, Vec3, Vec3];
  const determinant =
    x.x * (y.y * z.z - y.z * z.y) - x.y * (y.x * z.z - y.z * z.x) + x.z * (y.x * z.y - y.y * z.x);
  if (determinant >= 0) return match;
  // The last direction is the one furthest from what the player sees.
  const last = match[2]!;
  match[2] = { axis: last.axis, sign: -last.sign as 1 | -1 };
  return match;
}

function scale(v: Vec3, factor: number): Vec3 {
  return { x: v.x * factor, y: v.y * factor, z: v.z * factor };
}
