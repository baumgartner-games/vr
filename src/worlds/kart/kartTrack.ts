/**
 * The shape of the little circuit, as pure geometry.
 *
 * The track is a closed centre line — a handful of control points blown up
 * into a smooth polyline — plus a half width. Everything the world needs to
 * know follows from that: where the tarmac is drawn, how far off the middle a
 * kart currently is, where to shove it back when it leaves the road, and how
 * far around it has come.
 *
 * Plain `{x, z}` numbers on purpose: no three.js, so it is all under test.
 */

export interface Vec2 {
  x: number;
  z: number;
}

/** How much of its speed a kart keeps per frame while scraping along a wall. */
const WALL_FRICTION = 0.97;

/**
 * A closed Catmull-Rom spline through the control points, sampled evenly.
 *
 * @param perSegment points per control segment; the result has
 *        `controls.length * perSegment` points and closes back onto the first.
 */
export function sampleClosedSpline(controls: readonly Vec2[], perSegment: number): Vec2[] {
  const count = controls.length;
  if (count < 3 || perSegment < 1) return controls.map((point) => ({ ...point }));

  const path: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    const p0 = controls[(i - 1 + count) % count]!;
    const p1 = controls[i]!;
    const p2 = controls[(i + 1) % count]!;
    const p3 = controls[(i + 2) % count]!;
    for (let step = 0; step < perSegment; step++) {
      const t = step / perSegment;
      path.push({
        x: catmullRom(p0.x, p1.x, p2.x, p3.x, t),
        z: catmullRom(p0.z, p1.z, p2.z, p3.z, t),
      });
    }
  }
  return path;
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/** Length of the closed polyline, the lap distance of the centre line. */
export function pathLength(path: readonly Vec2[]): number {
  let total = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i]!;
    const b = path[(i + 1) % path.length]!;
    total += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return total;
}

/** Where a point sits relative to the centre line. */
export interface PathHit {
  /** Closest point on the centre line. */
  x: number;
  z: number;
  /** How far that point is around the lap, in metres. */
  along: number;
  /** Distance off the middle: positive to the left of the driving direction. */
  lateral: number;
  /** Unit tangent, pointing the way round. */
  tx: number;
  tz: number;
}

/**
 * The closest point on the centre line, with the arc length up to it and how
 * far off to the side the query point is.
 *
 * Brute force over every segment. The circuit has a few hundred of them and
 * this runs once per kart per frame, which is nothing.
 */
export function nearestOnPath(path: readonly Vec2[], x: number, z: number): PathHit {
  let best: PathHit = { x, z, along: 0, lateral: 0, tx: 0, tz: -1 };
  let bestDistance = Number.POSITIVE_INFINITY;
  let travelled = 0;

  for (let i = 0; i < path.length; i++) {
    const a = path[i]!;
    const b = path[(i + 1) % path.length]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSq = dx * dx + dz * dz;
    const length = Math.sqrt(lengthSq);
    if (lengthSq > 1e-12) {
      const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / lengthSq));
      const cx = a.x + dx * t;
      const cz = a.z + dz * t;
      const distance = Math.hypot(x - cx, z - cz);
      if (distance < bestDistance) {
        bestDistance = distance;
        const tx = dx / length;
        const tz = dz / length;
        best = {
          x: cx,
          z: cz,
          along: travelled + length * t,
          // Left of the tangent, seen from above with +Y up.
          lateral: (x - cx) * tz + (z - cz) * -tx,
          tx,
          tz,
        };
      }
    }
    travelled += length;
  }
  return best;
}

/** A position and velocity after the guard rails have had their say. */
export interface Confined {
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** True when the rail was actually touched this step. */
  hit: boolean;
}

/**
 * Keeps a kart on the tarmac.
 *
 * Off the edge it is put back exactly on the boundary, the part of its speed
 * that pointed into the rail is taken away and the rest is scrubbed a little —
 * so a kart slides along the barrier instead of sticking to it or bouncing off
 * into the scenery.
 */
export function confineToTrack(
  path: readonly Vec2[],
  halfWidth: number,
  x: number,
  z: number,
  vx: number,
  vz: number,
): Confined {
  const hit = nearestOnPath(path, x, z);
  if (Math.abs(hit.lateral) <= halfWidth) return { x, z, vx, vz, hit: false };

  const side = hit.lateral < 0 ? -1 : 1;
  // The left-hand normal of the tangent, turned to face the side we are on.
  const nx = hit.tz * side;
  const nz = -hit.tx * side;
  const outward = vx * nx + vz * nz;
  let nextVx = vx;
  let nextVz = vz;
  if (outward > 0) {
    nextVx -= nx * outward;
    nextVz -= nz * outward;
  }
  return {
    x: hit.x + nx * halfWidth,
    z: hit.z + nz * halfWidth,
    vx: nextVx * WALL_FRICTION,
    vz: nextVz * WALL_FRICTION,
    hit: true,
  };
}

/**
 * How much further round the lap a kart has come, taking the wrap at the
 * start/finish line into account. Driving backwards gives a negative number,
 * which is exactly what stops a lap being counted by rolling to and fro over
 * the line.
 */
export function lapDelta(previousAlong: number, along: number, total: number): number {
  if (!(total > 0)) return 0;
  let delta = along - previousAlong;
  if (delta > total / 2) delta -= total;
  if (delta < -total / 2) delta += total;
  return delta;
}
