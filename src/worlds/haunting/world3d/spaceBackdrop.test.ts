import * as THREE from 'three';
import { TILE } from '../../nav/navTile';
import { generateHouse, missionExtent } from '../house';
import { TRAINING_ROOMS } from '../trainingLayout';
import {
  SPACE_COLOR,
  SPACE_RADIUS,
  STAR_COUNT,
  backdropCentre,
  buildSpaceBackdrop,
} from './spaceBackdrop';

const spec = generateHouse(3, 14);

test('der Weltraum ist eine undurchsichtige Kugel von innen — keine Löschfarbe', () => {
  const space = buildSpaceBackdrop(spec);
  const dome = space.getObjectByName('station-space-dome') as THREE.Mesh<
    THREE.SphereGeometry,
    THREE.MeshBasicMaterial
  >;
  expect(dome).toBeDefined();
  expect(dome.material.side).toBe(THREE.BackSide);
  expect(dome.material.transparent).toBe(false);
  expect(dome.material.opacity).toBe(1);
  expect(dome.material.color.getHex()).toBe(SPACE_COLOR);
  expect(dome.material.toneMapped).toBe(false);
  expect(dome.geometry.parameters.radius).toBe(SPACE_RADIUS);
});

test('die Kugel umschließt Mission, Zentrale und Lehrzimmer und bleibt vor der Kamera-Ferne', () => {
  const centre = backdropCentre(spec);
  const extent = missionExtent(spec);
  const corners = [
    { x: extent.x, z: extent.z },
    { x: extent.x + extent.w, z: extent.z + extent.d },
    ...TRAINING_ROOMS.flatMap((room) => [
      { x: room.x, z: room.z },
      { x: room.x + room.w, z: room.z + room.d },
    ]),
  ];
  for (const corner of corners) {
    const dx = corner.x * TILE - centre.x,
      dz = corner.z * TILE - centre.z;
    expect(Math.hypot(dx, dz)).toBeLessThan(SPACE_RADIUS * 0.6);
  }
  // `App` baut die Kamera mit `far: 700`.
  expect(SPACE_RADIUS + Math.hypot(centre.x, centre.z)).toBeLessThan(700);
});

test('Kugel und Sterne kommen nach der Hülle dran, damit Wände sie verdecken statt übermalen', () => {
  const space = buildSpaceBackdrop(spec);
  const dome = space.getObjectByName('station-space-dome')!;
  const stars = space.getObjectByName('station-starfield')!;
  expect(dome.renderOrder).toBeGreaterThan(0);
  expect(stars.renderOrder).toBeGreaterThan(dome.renderOrder);
});

test('Sterne haben eine feste Pixelgröße und stehen innerhalb der Kugel', () => {
  const space = buildSpaceBackdrop(spec);
  const stars = space.getObjectByName('station-starfield') as THREE.Points<
    THREE.BufferGeometry,
    THREE.PointsMaterial
  >;
  expect(stars.material.sizeAttenuation).toBe(false);
  expect(stars.material.size).toBeGreaterThanOrEqual(1.5);
  expect(stars.material.vertexColors).toBe(true);
  const position = stars.geometry.getAttribute('position');
  expect(position.count).toBe(STAR_COUNT);
  let north = 0;
  for (let i = 0; i < position.count; i++) {
    const r = Math.hypot(position.getX(i), position.getY(i), position.getZ(i));
    expect(r).toBeLessThan(SPACE_RADIUS);
    expect(r).toBeGreaterThan(SPACE_RADIUS * 0.9);
    if (position.getY(i) > 0) north++;
  }
  // Über und unter der Station ungefähr gleich viele — kein Sternenhaufen am Pol.
  expect(north / position.count).toBeGreaterThan(0.4);
  expect(north / position.count).toBeLessThan(0.6);
});

test('derselbe Samen baut denselben Himmel', () => {
  const a = buildSpaceBackdrop(spec).getObjectByName('station-starfield') as THREE.Points;
  const b = buildSpaceBackdrop(spec).getObjectByName('station-starfield') as THREE.Points;
  expect(Array.from(a.geometry.getAttribute('position').array)).toEqual(
    Array.from(b.geometry.getAttribute('position').array),
  );
});
