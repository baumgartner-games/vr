import * as THREE from 'three';
import { cropProjection, emptyRect, pixelRect, portalRect, type ViewRect } from './portalView';

/**
 * Der Zuschnitt der Portalsichten (`portalView.ts`) — kritisch, weil ein
 * Fehler darin im Browser nur als Naht oder verrutschtes Bild im Portal
 * auffällt, und ein Portal, das fälschlich als unsichtbar gilt, zeigt das
 * Bild von gestern.
 */

function camera(): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(70, 1.4, 0.05, 200);
  cam.position.set(0, 1.6, 0);
  cam.updateMatrixWorld(true);
  return cam;
}

function portalAt(position: THREE.Vector3, normal: THREE.Vector3): THREE.Matrix4 {
  const object = new THREE.Object3D();
  object.position.copy(position);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  object.updateMatrixWorld(true);
  return object.matrixWorld;
}

const rect = (): ViewRect => ({ x0: 1, y0: 1, x1: -1, y1: -1 });

describe('portalRect', () => {
  it('findet ein Portal vor der Kamera und lässt eines dahinter weg', () => {
    const cam = camera();
    const front = portalAt(new THREE.Vector3(0.5, 1.4, -3), new THREE.Vector3(0, 0, 1));
    const seen = portalRect(
      front,
      cam.matrixWorld,
      cam.matrixWorldInverse,
      cam.projectionMatrix,
      rect(),
    );
    expect(emptyRect(seen)).toBe(false);
    expect(seen.x0).toBeLessThan(0.3);
    expect(seen.x1).toBeGreaterThan(0.3);
    expect(seen.x1 - seen.x0).toBeLessThan(1);

    const behind = portalAt(new THREE.Vector3(0, 1.4, 3), new THREE.Vector3(0, 0, -1));
    const hidden = portalRect(
      behind,
      cam.matrixWorld,
      cam.matrixWorldInverse,
      cam.projectionMatrix,
      rect(),
    );
    expect(emptyRect(hidden)).toBe(true);

    // Abgewandt: Die Kamera steht hinter der Wand, auf der es klebt.
    const away = portalAt(new THREE.Vector3(0, 1.4, -3), new THREE.Vector3(0, 0, -1));
    expect(
      emptyRect(
        portalRect(away, cam.matrixWorld, cam.matrixWorldInverse, cam.projectionMatrix, rect()),
      ),
    ).toBe(true);
  });

  it('misst ein Portal knapp neben dem Auge nur bis zum Rand', () => {
    const cam = camera();
    // Links neben einem, halb hinter dem Auge, zur Kamera gedreht.
    const side = portalAt(new THREE.Vector3(-0.9, 1.5, -0.5), new THREE.Vector3(1, 0, 0));
    const seen = portalRect(
      side,
      cam.matrixWorld,
      cam.matrixWorldInverse,
      cam.projectionMatrix,
      rect(),
    );
    expect(emptyRect(seen)).toBe(false);
    expect(seen.x0).toBe(-1);
    expect(seen.x1).toBeLessThan(0);
  });

  it('zeichnet beim Durchgehen das ganze Bild', () => {
    const cam = camera();
    const close = portalAt(new THREE.Vector3(0, 1.5, -0.1), new THREE.Vector3(0, 0, 1));
    const seen = portalRect(
      close,
      cam.matrixWorld,
      cam.matrixWorldInverse,
      cam.projectionMatrix,
      rect(),
    );
    expect(seen).toEqual({ x0: -1, y0: -1, x1: 1, y1: 1 });
  });
});

describe('cropProjection', () => {
  it('trifft mit dem Zuschnitt dieselben Pixel wie ohne', () => {
    const cam = camera();
    const viewport = { x: 640, y: 0, w: 640, h: 480 };
    const cut = { x0: -0.3, y0: -0.2, x1: 0.45, y1: 0.6 };
    const pixels = pixelRect(cut, viewport, { x: 0, y: 0, w: 0, h: 0 });
    const cropped = cropProjection(cam.projectionMatrix.clone(), cut);
    const toPixel = (projection: THREE.Matrix4, port: typeof viewport, point: THREE.Vector3) => {
      const v = new THREE.Vector4(point.x, point.y, point.z, 1)
        .applyMatrix4(cam.matrixWorldInverse)
        .applyMatrix4(projection);
      return [
        port.x + ((v.x / v.w + 1) / 2) * port.w,
        port.y + ((v.y / v.w + 1) / 2) * port.h,
        v.z / v.w,
      ];
    };
    for (const point of [new THREE.Vector3(0.2, 1.7, -4), new THREE.Vector3(-0.4, 1.3, -2.5)]) {
      const full = toPixel(cam.projectionMatrix, viewport, point);
      const part = toPixel(cropped, pixels, point);
      expect(part[0]).toBeCloseTo(full[0]!, 6);
      expect(part[1]).toBeCloseTo(full[1]!, 6);
      expect(part[2]).toBeCloseTo(full[2]!, 6);
    }
  });
});
