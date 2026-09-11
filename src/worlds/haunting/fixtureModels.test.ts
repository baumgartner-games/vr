import * as THREE from 'three';
import type { MarkId } from './house';
import { CARGO_BAND_COLORS, FIXTURE_CATALOG, type FixtureSize } from './fixtureDimensions';
import {
  buildBrokenLocker,
  buildCargoCabinet,
  buildFixture,
  buildSafetyLocker,
} from './fixtureModels';

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

  test('das Kennzeichen bleibt im Maß der Kiste und färbt sich nach dem Band', () => {
    const cabinet = buildCargoCabinet({ colour: 'blau', number: 3 });
    expectInsideDeclaredSize(cabinet.root, cabinet.size);
    const band = cabinet.root.getObjectByName('cargo-mark')!;
    expect(band).toBeDefined();
    const mesh = band.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    expect(mesh.material.color.getHex()).toBe(CARGO_BAND_COLORS.blau);
    // Drei Punkte für „Kiste 3": mehr Geometrie als dieselbe Kiste mit einem.
    const one = buildCargoCabinet({ colour: 'blau', number: 1 });
    const count = (group: THREE.Object3D): number =>
      (
        (group.getObjectByName('cargo-mark')!.children[0] as THREE.Mesh).geometry.getAttribute(
          'position',
        ) as THREE.BufferAttribute
      ).count;
    expect(count(cabinet.root)).toBeGreaterThan(count(one.root));
    // Ohne Kennzeichen bleibt das Modell, was es war (Testschrank, Lehrdeck).
    expect(buildCargoCabinet().root.getObjectByName('cargo-mark')).toBeUndefined();
  });

  test('the wrecked locker fills the same footprint as the intact one, glows and has no door to move', () => {
    const wreck = buildBrokenLocker();
    expectInsideDeclaredSize(wreck.root, wreck.size);
    expect(wreck.size).toEqual(buildSafetyLocker().size);
    const finishes = wreck.root.children.map((child) => child.userData.fixtureFinish as string);
    expect(finishes).toContain('amber');
    expect(wreck.root.getObjectByName('cabinet-door')).toBeUndefined();
    // Sichtbar ein anderes Modell: Es ragt weiter in die Kabine hinein als das
    // geschlossene Blatt, weil der Rest der Tür nach innen hängt.
    const bounds = new THREE.Box3().setFromObject(wreck.root);
    expect(bounds.max.y).toBeGreaterThan(wreck.size.height - 0.1);
    expect(bounds.min.y).toBeLessThan(0.01);
  });

  test('instances own their disposable GPU resources', () => {
    const first = buildFixture('wanne');
    const second = buildFixture('wanne');
    const meshA = first.children[0] as THREE.Mesh;
    const meshB = second.children[0] as THREE.Mesh;
    expect(meshA.geometry).not.toBe(meshB.geometry);
    expect(meshA.material).not.toBe(meshB.material);
  });
});
