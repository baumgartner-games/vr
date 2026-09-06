import * as THREE from 'three';
import { mirrorDistance, mirrorMatrix } from './mirrorMath';

/**
 * Die Rechnung hinter dem Spiegel — und der Grund, warum sie einen Test hat:
 * In der Brille sieht man einem Spiegelbild nicht an, dass es _falsch herum_
 * ist. Man merkt es erst, wenn man die Hand hebt und die falsche zurückwinkt,
 * und dann sucht man den Fehler überall, nur nicht in vier Zeilen Matrix.
 */
const M = new THREE.Matrix4();

describe('mirrorMatrix', () => {
  it('klappt einen Punkt auf die andere Seite der Ebene', () => {
    // Ebene y = 1, Normale nach oben: zwei Meter darüber wird null.
    mirrorMatrix(M, new THREE.Vector3(0, 1, 0), new THREE.Vector3(7, 1, -3));
    const point = new THREE.Vector3(0.5, 3, 0.5).applyMatrix4(M);
    expect(point.x).toBeCloseTo(0.5, 9);
    expect(point.y).toBeCloseTo(-1, 9);
    expect(point.z).toBeCloseTo(0.5, 9);
  });

  it('lässt die Ebene selbst liegen, wo sie ist', () => {
    const normal = new THREE.Vector3(1, 2, -0.5);
    const on = new THREE.Vector3(0.4, -1.2, 2);
    mirrorMatrix(M, normal, on);
    const fixed = on.clone().applyMatrix4(M);
    expect(fixed.distanceTo(on)).toBeCloseTo(0, 9);
  });

  it('ist ihre eigene Umkehrung', () => {
    mirrorMatrix(M, new THREE.Vector3(0.3, 1, 0.8), new THREE.Vector3(-1, 0.5, 2));
    const start = new THREE.Vector3(1.5, -0.25, 4);
    const there = start.clone().applyMatrix4(M);
    const back = there.clone().applyMatrix4(M);
    expect(there.distanceTo(start)).toBeGreaterThan(0.1);
    expect(back.distanceTo(start)).toBeCloseTo(0, 9);
  });

  it('dreht die Händigkeit um — sonst wäre es kein Spiegelbild', () => {
    mirrorMatrix(M, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0));
    expect(M.determinant()).toBeCloseTo(-1, 9);
  });

  it('hält den Abstand zur Ebene ein, egal wie schief sie steht', () => {
    const normal = new THREE.Vector3(2, -1, 3);
    const on = new THREE.Vector3(1, 1, 1);
    mirrorMatrix(M, normal, on);
    const start = new THREE.Vector3(-2, 4, 0.5);
    const there = start.clone().applyMatrix4(M);
    // Vorher so weit davor wie nachher dahinter.
    expect(mirrorDistance(normal, on, there)).toBeCloseTo(-mirrorDistance(normal, on, start), 9);
  });

  it('nimmt eine ungenormte Normale genauso wie eine genormte', () => {
    const point = new THREE.Vector3(0, 2, 0);
    const long = new THREE.Vector3(0, 5, 0);
    const unit = new THREE.Vector3(0, 1, 0);
    const start = new THREE.Vector3(1, 3.5, -2);
    const a = start.clone().applyMatrix4(mirrorMatrix(new THREE.Matrix4(), long, point));
    const b = start.clone().applyMatrix4(mirrorMatrix(new THREE.Matrix4(), unit, point));
    expect(a.distanceTo(b)).toBeCloseTo(0, 9);
  });
});

describe('mirrorDistance', () => {
  it('zählt vor der Ebene positiv und dahinter negativ', () => {
    const normal = new THREE.Vector3(0, 0, 1);
    const on = new THREE.Vector3(0, 0, -1);
    expect(mirrorDistance(normal, on, new THREE.Vector3(0, 0, 0.5))).toBeCloseTo(1.5, 9);
    expect(mirrorDistance(normal, on, new THREE.Vector3(0, 0, -3))).toBeCloseTo(-2, 9);
    expect(mirrorDistance(normal, on, new THREE.Vector3(9, -4, -1))).toBeCloseTo(0, 9);
  });
});
