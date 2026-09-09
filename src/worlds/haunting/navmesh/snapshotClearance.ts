import type { MapPoint, MapSnapshot } from '../map';
import type { NavPoint, SegmentClear } from './pathSmoothing';

/**
 * **Abstand zu den Wänden der 2D-Welt.**
 *
 * `MapSnapshot.walls` sind die Wandmitten in Metern, an Türen unterbrochen;
 * `MapSnapshot.doors` die Öffnungen mit ihrem Blatt. Das ist die Geometrie,
 * die die 2D-Welt kennt (`BOUNDARIES.md`, Andockstelle des Pakets Navmesh),
 * und sie kommt ohne three.js aus — deshalb prüfen die Tests den geglätteten
 * Weg **zusätzlich** dagegen, unabhängig von den Quadern der Wegsuche.
 *
 * Eine Wand hat `WALL_T` Dicke, der Snapshot hält nur die Mittellinie; wer
 * mit dem Körperradius prüft, gibt die halbe Wanddicke dazu.
 */

/** Der kleinste Abstand zwischen den Strecken `p–q` und `a–b`, in Metern. */
export function segmentDistance(p: NavPoint, q: NavPoint, a: NavPoint, b: NavPoint): number {
  if (cross(p, q, a, b)) return 0;
  return Math.min(
    pointSegmentDistance(p, a, b),
    pointSegmentDistance(q, a, b),
    pointSegmentDistance(a, p, q),
    pointSegmentDistance(b, p, q),
  );
}

/** Der Abstand eines Punkts zur Strecke `a–b`. */
export function pointSegmentDistance(at: NavPoint, a: NavPoint, b: NavPoint): number {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const length2 = dx * dx + dz * dz;
  const t =
    length2 < 1e-18
      ? 0
      : Math.max(0, Math.min(1, ((at.x - a.x) * dx + (at.z - a.z) * dz) / length2));
  return Math.hypot(at.x - (a.x + t * dx), at.z - (a.z + t * dz));
}

function orient(a: NavPoint, b: NavPoint, c: NavPoint): number {
  const v = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  return Math.abs(v) < 1e-12 ? 0 : Math.sign(v);
}

function cross(p: NavPoint, q: NavPoint, a: NavPoint, b: NavPoint): boolean {
  const d1 = orient(a, b, p),
    d2 = orient(a, b, q),
    d3 = orient(p, q, a),
    d4 = orient(p, q, b);
  if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  // Kollinear und überlappend: Der Abstand der Endpunkte fängt das unten auf.
  return false;
}

/** Das Türblatt als Strecke quer über die Öffnung. */
function leafOf(door: MapSnapshot['doors'][number]): [MapPoint, MapPoint] {
  const half = door.width / 2;
  return door.axis === 'x'
    ? [
        { x: door.at.x - half, z: door.at.z },
        { x: door.at.x + half, z: door.at.z },
      ]
    : [
        { x: door.at.x, z: door.at.z - half },
        { x: door.at.x, z: door.at.z + half },
      ];
}

/**
 * Eine Streckenprüfung über den Snapshot: frei, wenn jede Wand (Wand, Fenster
 * und Glas halten Personen auf) und jedes **geschlossene** Türblatt weiter als
 * `radius` von der Strecke entfernt bleibt.
 */
export function snapshotSegmentClear(snapshot: MapSnapshot, radius: number): SegmentClear {
  const leaves = snapshot.doors.filter((door) => !door.open).map(leafOf);
  return (from, to) => {
    for (const wall of snapshot.walls)
      if (segmentDistance(from, to, wall.a, wall.b) < radius) return false;
    for (const [a, b] of leaves) if (segmentDistance(from, to, a, b) < radius) return false;
    return true;
  };
}
