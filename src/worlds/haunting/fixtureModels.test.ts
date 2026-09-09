import * as THREE from 'three';
import type { MarkId } from './house';
import { FIXTURE_CATALOG, type FixtureSize } from './fixtureDimensions';
import { buildCargoCabinet, buildFixture, buildSafetyLocker } from './fixtureModels';

function expectInsideDeclaredSize(model: THREE.Group, size: FixtureSize): void {
  const bounds = new THREE.Box3().setFromObject(model);
  const epsilon = 0.0001;
  expect(bounds.min.x).toBeGreaterThanOrEqual(-size.width / 2 - epsilon);
  expect(bounds.max.x).toBeLessThanOrEqual(size.width / 2 + epsilon);
  expect(bounds.min.y).toBeGreaterThanOrEqual(-epsilon);
  expect(bounds.max.y).toBeLessThanOrEqual(size.height + epsilon);
  expect(bounds.min.z).toBeGreaterThanOrEqual(-size.depth / 2 - epsilon);
  expect(bounds.max.z).toBeLessThanOrEqual(size.depth / 2 + epsilon);
  let draws = 0;
  let triangles = 0;
  model.traverse((object) => {
    expect(object).not.toBeInstanceOf(THREE.Light);
    if (!(object instanceof THREE.Mesh)) return;
    draws++;
    triangles +=
      (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
  });
  expect(draws).toBeLessThanOrEqual(8);
  expect(triangles).toBeLessThanOrEqual(5000);
}

describe('station fixture placement contract', () => {
  test.each(Object.keys(FIXTURE_CATALOG) as MarkId[])('%s fits its full declared bounds', (id) => {
    expectInsideDeclaredSize(buildFixture(id), FIXTURE_CATALOG[id]);
  });

  test('canteen tables and benches fit the same collision footprint as other supply islands', () => {
    expectInsideDeclaredSize(buildFixture('esstisch', 'canteen'), FIXTURE_CATALOG.esstisch);
  });

  test.each([buildCargoCabinet, buildSafetyLocker])(
    'cabinet fits while closed; only its door moves',
    (build) => {
      const cabinet = build();
      expectInsideDeclaredSize(cabinet.root, cabinet.size);
      expect(cabinet.door.parent).toBe(cabinet.root);
      const body = cabinet.root.children.find((child) => child !== cabinet.door)!;
      const bodyBounds = new THREE.Box3().setFromObject(body);
      const doorBounds = new THREE.Box3().setFromObject(cabinet.door);
      expect(cabinet.screenMount.z).toBeGreaterThan(doorBounds.max.z - 0.011);
      cabinet.door.position.x -= cabinet.size.width;
      expect(new THREE.Box3().setFromObject(body).equals(bodyBounds)).toBe(true);
      expect(new THREE.Box3().setFromObject(cabinet.door).max.x).toBeLessThan(0);
    },
  );

  test('instances own their disposable GPU resources', () => {
    const first = buildFixture('wanne');
    const second = buildFixture('wanne');
    const meshA = first.children[0] as THREE.Mesh;
    const meshB = second.children[0] as THREE.Mesh;
    expect(meshA.geometry).not.toBe(meshB.geometry);
    expect(meshA.material).not.toBe(meshB.material);
  });
});
