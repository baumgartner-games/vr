import * as THREE from 'three';
import { mergeMeshes, mergedMesh } from './kitchenMerge';

/**
 * Was ein verschmolzenes Netz verspricht: **dieselben Dreiecke an denselben
 * Stellen**, nur in einem Aufruf. Alles andere wäre kein Sparen, sondern ein
 * anderes Möbel.
 */

function box(x: number, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  mesh.position.set(x, y, z);
  mesh.updateMatrix();
  return mesh;
}

/** Die Eckpunkte eines Netzes in Weltkoordinaten seines Elternknotens. */
function points(geometry: THREE.BufferGeometry): THREE.Vector3[] {
  const position = geometry.getAttribute('position');
  return Array.from({ length: position.count }, (_, i) =>
    new THREE.Vector3().fromBufferAttribute(position as THREE.BufferAttribute, i),
  );
}

describe('mergeMeshes', () => {
  it('legt zwei Quader zu einem Netz zusammen und behält jede Ecke', () => {
    const parts = [box(-2), box(2)];
    const merged = mergeMeshes(parts)!;

    expect(merged).not.toBeNull();
    const before = parts.reduce(
      (sum, part) => sum + part.geometry.getAttribute('position').count,
      0,
    );
    expect(merged.getAttribute('position').count).toBe(before);
    expect(merged.getIndex()!.count).toBe(
      parts.reduce((sum, part) => sum + part.geometry.getIndex()!.count, 0),
    );
  });

  it('backt die Matrix ein — das Netz sitzt auf null, die Dreiecke nicht', () => {
    const merged = mergeMeshes([box(-2), box(2)])!;
    merged.computeBoundingBox();
    const hull = merged.boundingBox!;

    // Zwei Würfel von 1 m, ihre Mitten bei ∓2: von −2,5 bis 2,5.
    expect(hull.min.x).toBeCloseTo(-2.5, 6);
    expect(hull.max.x).toBeCloseTo(2.5, 6);
    expect(hull.min.y).toBeCloseTo(-0.5, 6);
    expect(hull.max.y).toBeCloseTo(0.5, 6);
    // Und jede Ecke liegt auf einer der beiden alten Stellen.
    for (const point of points(merged)) {
      expect(
        Math.abs(Math.abs(point.x) - 2.5) < 1e-6 || Math.abs(Math.abs(point.x) - 1.5) < 1e-6,
      ).toBe(true);
    }
  });

  it('dreht die Normalen mit', () => {
    const turned = box(0);
    turned.rotation.y = Math.PI / 2;
    turned.updateMatrix();
    const merged = mergeMeshes([box(3), turned])!;
    const normals = merged.getAttribute('normal');

    // Jede Normale bleibt eine Einheitslänge — ein Zeichen dafür, dass die
    // Normalenmatrix und nicht die Modellmatrix angewandt wurde.
    for (let i = 0; i < normals.count; i++) {
      const n = new THREE.Vector3().fromBufferAttribute(normals as THREE.BufferAttribute, i);
      expect(n.length()).toBeCloseTo(1, 5);
    }
  });

  it('verschmilzt auch, was keinen Index hat', () => {
    const plain = new THREE.BufferGeometry();
    plain.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3),
    );
    const a = new THREE.Mesh(plain, new THREE.MeshBasicMaterial());
    const b = new THREE.Mesh(plain, new THREE.MeshBasicMaterial());
    b.position.x = 5;
    b.updateMatrix();

    const merged = mergeMeshes([a, b])!;
    expect(merged.getIndex()!.count).toBe(6);
    expect(merged.getAttribute('position').count).toBe(6);
  });

  it('sagt nein, wo die Attribute nicht zusammenpassen', () => {
    const withUv = box(0);
    const withoutUv = box(1);
    withoutUv.geometry = withoutUv.geometry.clone();
    withoutUv.geometry.deleteAttribute('uv');

    expect(mergeMeshes([withUv, withoutUv])).toBeNull();
  });

  it('sagt nein bei einem einzelnen Teil — da gibt es nichts zu sparen', () => {
    expect(mergeMeshes([box(0)])).toBeNull();
    expect(mergeMeshes([])).toBeNull();
  });
});

describe('mergedMesh', () => {
  it('erbt Material und Behandlung vom ersten Teil', () => {
    const parts = [box(-1), box(1)];
    for (const part of parts) {
      part.castShadow = false;
      part.receiveShadow = false;
      part.renderOrder = 3;
      part.raycast = () => {};
    }
    const merged = mergedMesh(mergeMeshes(parts)!, parts);

    expect(merged.material).toBe(parts[0]!.material);
    expect(merged.castShadow).toBe(false);
    expect(merged.receiveShadow).toBe(false);
    expect(merged.renderOrder).toBe(3);
    // Ein Zeichen fängt keinen Strahl — auch verschmolzen nicht.
    const hits: THREE.Intersection[] = [];
    merged.raycast(new THREE.Raycaster(), hits);
    expect(hits).toHaveLength(0);
  });
});
