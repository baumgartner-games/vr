import * as THREE from 'three';
import { halfFloorTriangle, type FloorCorner } from './solids';

/**
 * **Ein dreieckiges Bodenstück** — der halbe Boden unter einer Schräge
 * (`GridPlan.halfFloor`, `PlanSolid.half`).
 *
 * Ein Prisma über dem Dreieck, das bleibt, wenn die Ecke `empty` leer ist:
 * `w` × `d` groß wie die Kachel, `h` hoch, um die Mitte gebaut wie das
 * `BoxGeometry`, das es ersetzt. Nur die Deckfläche und die drei Seiten; die
 * Unterseite sieht niemand. Gebaut wie die Schrägwand selbst — keine Datei
 * aus dem Regal, die Platte der Welt gibt es nicht als Dreieck.
 */
export function halfFloorGeometry(
  w: number,
  h: number,
  d: number,
  empty: FloorCorner,
): THREE.BufferGeometry {
  const corners = halfFloorTriangle(empty).map((p) => ({ x: p.x * w, z: p.z * d }));
  const [a, b, c] = corners as [(typeof corners)[0], (typeof corners)[0], (typeof corners)[0]];
  // Gegen den Uhrzeigersinn von oben gesehen, damit die Deckfläche nach oben zeigt.
  const up = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z);
  const ring = up > 0 ? [a, b, c] : [a, c, b];
  const top = h / 2,
    bottom = -h / 2;
  const positions: number[] = [];
  const tri = (p: number[], q: number[], r: number[]): void => {
    positions.push(...p, ...q, ...r);
  };
  tri([ring[0]!.x, top, ring[0]!.z], [ring[1]!.x, top, ring[1]!.z], [ring[2]!.x, top, ring[2]!.z]);
  for (let i = 0; i < 3; i++) {
    const p = ring[i]!,
      q = ring[(i + 1) % 3]!;
    // Außen herum: dieselbe Umlaufrichtung wie oben, also zeigt die Seite nach außen.
    tri([p.x, bottom, p.z], [q.x, bottom, q.z], [q.x, top, q.z]);
    tri([p.x, bottom, p.z], [q.x, top, q.z], [p.x, top, p.z]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
