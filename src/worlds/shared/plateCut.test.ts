/**
 * **Eine Platte, diagonal halbiert** (`plateCut.cutPlate`) — für den halben
 * Belag unter einer Wand unter 45°.
 */
import * as THREE from 'three';
import { cutPlate } from './plateCut';

/** Die Fläche der Oberseite (Dreiecke, deren Normale nach oben zeigt). */
function topArea(geometry: THREE.BufferGeometry): number {
  const p = (geometry.index ? geometry.toNonIndexed() : geometry).getAttribute('position');
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    n = new THREE.Vector3();
  let area = 0;
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    n.subVectors(b, a).cross(c.clone().sub(a));
    if (n.y > 0.9 * n.length()) area += n.length() / 2;
  }
  return area;
}

describe('cutPlate', () => {
  const plate = (): THREE.BufferGeometry => new THREE.BoxGeometry(1, 0.1, 1);

  it('lässt von der Oberseite genau das halbe Quadrat', () => {
    expect(topArea(plate())).toBeCloseTo(1);
    expect(topArea(cutPlate(plate(), 'nw'))).toBeCloseTo(0.5);
  });

  it('lässt nichts auf der Seite der leeren Ecke', () => {
    for (const [empty, sx, sz] of [
      ['nw', -1, -1],
      ['ne', 1, -1],
      ['se', 1, 1],
      ['sw', -1, 1],
    ] as const) {
      const p = cutPlate(plate(), empty).getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        expect(sx * p.getX(i) + sz * p.getZ(i)).toBeLessThanOrEqual(1e-5);
      }
    }
  });

  it('nimmt Normalen und Texturkoordinaten mit', () => {
    const cut = cutPlate(plate(), 'se');
    expect(cut.getAttribute('normal').count).toBe(cut.getAttribute('position').count);
    expect(cut.getAttribute('uv').count).toBe(cut.getAttribute('position').count);
  });
});
