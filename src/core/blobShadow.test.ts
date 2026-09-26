import * as THREE from 'three';
import {
  FADE_HEIGHT,
  FLOOR_RISE,
  FLOOR_SNAP,
  blobLook,
  blobShadowRadius,
  followFloor,
  markBlobShadow,
} from './blobShadow';

describe('Schatten-Kreis', () => {
  it('merkt sich den Radius am Ding', () => {
    const feet = new THREE.Object3D();
    expect(blobShadowRadius(feet)).toBe(0);
    markBlobShadow(feet, 0.4);
    expect(blobShadowRadius(feet)).toBe(0.4);
  });

  it('folgt dem Boden nach unten sofort und nach oben langsam', () => {
    // Der erste Wert ist der Fuß selbst.
    expect(followFloor(Number.NaN, 1.2, 0.016)).toBe(1.2);
    // Hinunter: sofort.
    expect(followFloor(1, 0.4, 0.016)).toBe(0.4);
    // Ein Sprung: der Boden bleibt fast liegen.
    const up = followFloor(0, 0.8, 0.1);
    expect(up).toBeCloseTo(FLOOR_RISE * 0.1);
    // Nie über den Fuß hinaus.
    expect(followFloor(0, 0.01, 1)).toBe(0.01);
    // Ein Teleport nimmt den Boden mit.
    expect(followFloor(0, FLOOR_SNAP + 1, 0.016)).toBe(FLOOR_SNAP + 1);
  });

  it('verblasst mit der Höhe und wird dabei etwas breiter', () => {
    expect(blobLook(0)).toEqual({ opacity: 1, scale: 1 });
    const half = blobLook(FADE_HEIGHT / 2);
    expect(half.opacity).toBeCloseTo(0.5);
    expect(half.scale).toBeGreaterThan(1);
    expect(blobLook(FADE_HEIGHT * 3).opacity).toBe(0);
    // Unter dem Boden ist wie am Boden.
    expect(blobLook(-1).opacity).toBe(1);
  });
});
