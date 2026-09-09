import * as THREE from 'three';
import { generateHouse } from '../house';
import { COMMAND } from '../roomGraph';
import { buildSignMeshes, SIGN_BOTTOM, SIGN_TOP, signHeight } from './signMesh';
import { wayfindingSigns } from './signposts';

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

beforeAll(() => {
  // Kein Browser: Das Canvas ist eine Attrappe, gemessen wird die Geometrie.
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => ({ getContext: () => ({ fillRect: () => {}, fillText: () => {} }) }),
    },
  });
});

afterAll(() => {
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
  else Reflect.deleteProperty(globalThis, 'document');
});

test('alle Wegweiser eines Raums sind ein Mesh, alle Räume teilen sich Material und Atlas', () => {
  const spec = generateHouse(11, 14);
  const signs = wayfindingSigns(spec);
  const meshes = buildSignMeshes(signs, () => 0x6ce6f2);
  const spaces = new Set(signs.map((sign) => sign.spaceId));
  expect(meshes.size).toBe(spaces.size);
  expect(meshes.has(COMMAND)).toBe(true);
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture | null>();
  let quads = 0;
  for (const [spaceId, mesh] of meshes) {
    expect(mesh.frustumCulled).toBe(true);
    expect(mesh.name).toBe('wayfinding-signs');
    const material = mesh.material as THREE.MeshBasicMaterial;
    materials.add(material);
    textures.add(material.map);
    expect(material.toneMapped).toBe(false);
    expect(material.transparent).toBe(false);
    const mine = signs.filter((sign) => sign.spaceId === spaceId);
    expect(mesh.geometry.getAttribute('position').count).toBe(mine.length * 4);
    expect(mesh.geometry.index!.count).toBe(mine.length * 6);
    quads += mine.length;
  }
  expect(materials.size).toBe(1);
  expect(textures.size).toBe(1);
  expect(quads).toBe(signs.length);
});

test('jedes Schild hängt im Band über dem Türkopf und unter der Decke', () => {
  const spec = generateHouse(11, 14);
  const signs = wayfindingSigns(spec);
  const meshes = buildSignMeshes(signs, () => 0xffffff);
  for (const mesh of meshes.values()) {
    const position = mesh.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      expect(position.getY(i)).toBeGreaterThanOrEqual(SIGN_BOTTOM - 1e-6);
      expect(position.getY(i)).toBeLessThanOrEqual(SIGN_TOP + 1e-6);
    }
  }
  expect(signHeight(1.7)).toBeGreaterThan(0.2);
  expect(signHeight(100)).toBe(SIGN_TOP - SIGN_BOTTOM);
});

test('die Ecken eines Schilds liegen auf seiner Wandlinie und die Vorderseite zeigt in den Raum', () => {
  const spec = generateHouse(11, 14);
  const signs = wayfindingSigns(spec);
  const meshes = buildSignMeshes(signs, () => 0xffffff);
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    normal = new THREE.Vector3();
  for (const [spaceId, mesh] of meshes) {
    const mine = signs.filter((sign) => sign.spaceId === spaceId);
    const position = mesh.geometry.getAttribute('position');
    const index = mesh.geometry.index!;
    mine.forEach((sign, n) => {
      for (let k = 0; k < 4; k++) {
        const along = sign.dir % 2 === 0 ? position.getX(n * 4 + k) : position.getZ(n * 4 + k);
        const across = sign.dir % 2 === 0 ? position.getZ(n * 4 + k) : position.getX(n * 4 + k);
        const centreAlong = sign.dir % 2 === 0 ? sign.x : sign.z;
        const centreAcross = sign.dir % 2 === 0 ? sign.z : sign.x;
        expect(Math.abs(along - centreAlong)).toBeCloseTo(sign.width / 2, 5);
        expect(across).toBeCloseTo(centreAcross, 5);
      }
      a.fromBufferAttribute(position, index.getX(n * 6));
      b.fromBufferAttribute(position, index.getX(n * 6 + 1));
      c.fromBufferAttribute(position, index.getX(n * 6 + 2));
      normal.crossVectors(b.sub(a), c.sub(a)).normalize();
      // Die Vorderseite schaut von der Wand weg — in den Raum, in dem man liest.
      expect(normal.x).toBeCloseTo(-dirXOf(sign.dir), 5);
      expect(normal.z).toBeCloseTo(-dirZOf(sign.dir), 5);
    });
  }
});

function dirXOf(dir: number): number {
  return [0, 1, 0, -1][dir]!;
}
function dirZOf(dir: number): number {
  return [-1, 0, 1, 0][dir]!;
}
