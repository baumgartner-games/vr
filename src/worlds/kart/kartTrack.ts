/**
 * The shape of the little circuit, as pure geometry.
 *
 * The track is a closed centre line — laid out from straights and corners in
 * `kartCourse.ts` — plus a half width, and beside it a rectangular apron: the
 * pit lane. Everything the world needs to know follows from those three
 * things: where the tarmac is drawn, how far off the middle a kart currently
 * is, where to shove it back when it leaves the road, and how far around it
 * has come.
 *
 * Plain `{x, z}` numbers on purpose: no three.js, so it is all under test.
 */

export interface Vec2 {
  x: number;
  z: number;
}

/**
 * **Ein rechteckiges Stück Asphalt neben der Strecke** — die Boxengasse.
 *
 * Sie ist bewusst ein Rechteck und keine zweite Mittellinie. Eine offene Linie
 * hat zwei Enden, und an einem Ende weiß `nearestOnPath` nicht mehr, ob man
 * noch daneben oder schon dahinter steht: Wer zehn Meter über das Ende
 * hinausfährt, hat immer noch den Abstand null zur Linie und rollt fröhlich
 * über die Wiese. Ein Rechteck hat diese Frage nicht.
 */
export interface Apron {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** How much of its speed a kart keeps per frame while scraping along a wall. */
const WALL_FRICTION = 0.97;

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

/** Ob ein Punkt auf der Fläche liegt — die Kante zählt dazu. */
export function insideApron(apron: Apron, x: number, z: number): boolean {
  return x >= apron.x0 && x <= apron.x1 && z >= apron.z0 && z <= apron.z1;
}

/**
 * Dasselbe wie `confineToTrack`, nur für eine Fläche: an die Kante zurück, und
 * der Teil der Geschwindigkeit, der hinauszeigte, ist weg.
 */
export function confineToApron(
  apron: Apron,
  x: number,
  z: number,
  vx: number,
  vz: number,
): Confined {
  if (insideApron(apron, x, z)) return { x, z, vx, vz, hit: false };
  const nx = Math.min(apron.x1, Math.max(apron.x0, x));
  const nz = Math.min(apron.z1, Math.max(apron.z0, z));
  return {
    x: nx,
    z: nz,
    vx: (nx === x ? vx : 0) * WALL_FRICTION,
    vz: (nz === z ? vz : 0) * WALL_FRICTION,
    hit: true,
  };
}

/**
 * **Die Leitplanke der ganzen Anlage**: Strecke *oder* Boxengasse.
 *
 * Die Regel ist eine einzige und deshalb steht sie hier und nicht in der Welt:
 * **Wer in irgendeiner der Flächen ist, wird nicht angefasst.** Weil die Gasse
 * kachelbündig an den Streckenkorridor stößt (`kartCourse.ts`), ist die
 * Vereinigung der beiden zusammenhängend — man fährt aus der Box heraus und
 * auf die Gerade, ohne dass irgendwo eine Ein- und Ausfahrt programmiert wäre.
 *
 * Und wer draußen ist, wird auf die **nächstgelegene** der beiden
 * zurückgesetzt. Nicht auf die Strecke, denn dann schöbe die Box einen jedes
 * Mal quer über die Wiese, sobald man in ihr an die Mauer kommt.
 */
export function confineToCourse(
  path: readonly Vec2[],
  halfWidth: number,
  aprons: readonly Apron[],
  x: number,
  z: number,
  vx: number,
  vz: number,
): Confined {
  for (const apron of aprons) {
    if (insideApron(apron, x, z)) return { x, z, vx, vz, hit: false };
  }
  let best = confineToTrack(path, halfWidth, x, z, vx, vz);
  if (!best.hit) return best;
  let bestGap = Math.hypot(best.x - x, best.z - z);
  for (const apron of aprons) {
    const back = confineToApron(apron, x, z, vx, vz);
    const gap = Math.hypot(back.x - x, back.z - z);
    if (gap >= bestGap) continue;
    best = back;
    bestGap = gap;
  }
  return best;
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
