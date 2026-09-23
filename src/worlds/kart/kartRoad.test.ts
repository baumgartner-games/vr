import * as THREE from 'three';
import { KART_COURSE } from './kartCourse';
import { nearestOnPath, pathLength, type Vec2 } from './kartTrack';
import { ROAD_SLICES, bendRoad, sliceAlong } from './kartRoad';

/** Eine Kachel wie die der Stadt: 1 × 1 m, z längs, eine Fläche oben. */
function tile(): THREE.BufferGeometry {
  const plane = new THREE.PlaneGeometry(1, 1);
  plane.rotateX(-Math.PI / 2);
  plane.translate(0, 0.035, 0);
  return plane;
}

/**
 * Ein Kreis von 10 m Radius, halbmeterweise, im Uhrzeigersinn von oben — wie
 * die Bahn, deren Kurven alle rechts herum gehen.
 */
function ring(): Vec2[] {
  const out: Vec2[] = [];
  const steps = Math.round((2 * Math.PI * 10) / 0.5);
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    out.push({ x: Math.cos(angle) * 10, z: Math.sin(angle) * 10 });
  }
  return out;
}

describe('kartRoad', () => {
  it('schneidet so, dass kein Dreieck über eine Scheibengrenze reicht', () => {
    const sliced = sliceAlong(tile(), ROAD_SLICES, -0.5, 0.5);
    const pos = sliced.getAttribute('position');
    const width = 1 / ROAD_SLICES;
    for (let t = 0; t < pos.count; t += 3) {
      const zs = [pos.getZ(t), pos.getZ(t + 1), pos.getZ(t + 2)];
      const low = Math.min(...zs);
      const high = Math.max(...zs);
      expect(high - low).toBeLessThanOrEqual(width + 1e-6);
      expect(Math.floor((low + 0.5) / width + 1e-6)).toBe(
        Math.min(ROAD_SLICES - 1, Math.floor((high + 0.5) / width - 1e-6)),
      );
    }
  });

  it('verliert beim Schneiden keine Fläche', () => {
    const area = (geometry: THREE.BufferGeometry): number => {
      const g = geometry.index ? geometry.toNonIndexed() : geometry;
      const pos = g.getAttribute('position');
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      const c = new THREE.Vector3();
      let sum = 0;
      for (let t = 0; t < pos.count; t += 3) {
        a.set(pos.getX(t), pos.getY(t), pos.getZ(t));
        b.set(pos.getX(t + 1), pos.getY(t + 1), pos.getZ(t + 1));
        c.set(pos.getX(t + 2), pos.getY(t + 2), pos.getZ(t + 2));
        sum += b.sub(a).cross(c.sub(a)).length() / 2;
      }
      return sum;
    };
    expect(area(sliceAlong(tile(), ROAD_SLICES, -0.5, 0.5))).toBeCloseTo(area(tile()), 6);
  });

  it('legt die Kanten der Kachel genau auf die Kanten der Bahn', () => {
    const path = KART_COURSE.centre;
    const width = KART_COURSE.halfWidth * 2;
    const road = bendRoad(sliceAlong(tile(), ROAD_SLICES, -0.5, 0.5), path, width, 0.02, 0.035);
    const pos = road.getAttribute('position');
    let worst = 0;
    for (let i = 0; i < pos.count; i += 7) {
      const hit = nearestOnPath(path, pos.getX(i), pos.getZ(i));
      worst = Math.max(worst, Math.abs(hit.lateral) - KART_COURSE.halfWidth);
    }
    // Nie über den Rand hinaus — in der engsten Kurve (4 m) höchstens ein paar
    // Zentimeter Sehne.
    expect(worst).toBeLessThan(0.05);
    // Und die Oberkante liegt, wo der Asphalt der Boxengasse liegt.
    expect(pos.getY(0)).toBeCloseTo(0.02, 6);
  });

  it('bleibt oben: Normalen zeigen nach oben, Dreiecke von oben gegen den Uhrzeigersinn', () => {
    const road = bendRoad(sliceAlong(tile(), ROAD_SLICES, -0.5, 0.5), ring(), 4, 0, 0.035);
    const pos = road.getAttribute('position');
    const nor = road.getAttribute('normal');
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (let t = 0; t < pos.count; t += 3) {
      expect(nor.getY(t)).toBeGreaterThan(0.99);
      a.set(pos.getX(t), pos.getY(t), pos.getZ(t));
      b.set(pos.getX(t + 1), pos.getY(t + 1), pos.getZ(t + 1));
      c.set(pos.getX(t + 2), pos.getY(t + 2), pos.getZ(t + 2));
      const face = b.sub(a).cross(c.sub(a));
      if (face.length() > 1e-9) expect(face.y).toBeGreaterThan(0);
    }
  });

  it('legt so viele Kacheln, dass eine so lang ist wie breit', () => {
    const path = ring();
    const sliced = sliceAlong(tile(), ROAD_SLICES, -0.5, 0.5);
    const road = bendRoad(sliced, path, 4, 0, 0.035);
    const tiles = road.getAttribute('position').count / sliced.getAttribute('position').count;
    expect(tiles).toBe(Math.round(pathLength(path) / 4));
  });
});
