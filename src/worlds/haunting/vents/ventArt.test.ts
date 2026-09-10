import * as THREE from 'three';
import { generateHouse } from '../house';
import { VentNet } from './ventGraph';
import { buildVentFlaps, VentFlapArt } from './ventArt';

const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _was = new THREE.Vector3();
const _rotation = new THREE.Quaternion();
const _scale = new THREE.Vector3();

function matrices(mesh: THREE.InstancedMesh): THREE.Matrix4[] {
  return Array.from({ length: mesh.count }, (_, i) => {
    mesh.getMatrixAt(i, _matrix);
    return _matrix.clone();
  });
}

describe('Die Klappen in 3D', () => {
  it('sind zwei Draw-Calls plus ein Streifen — unabhängig davon, ob eine offen ist', () => {
    const spec = generateHouse(1, 14);
    const net = new VentNet(spec);
    const art = new VentFlapArt(spec, net);
    expect(art.group.name).toBe('vent-flaps');
    expect(art.group.children.length).toBe(buildVentFlaps(spec, net).children.length);
    expect(art.group.children.length).toBeLessThanOrEqual(3);
    expect(art.open).toBeNull();
  });

  it('öffnet genau eine Klappe: Lamellen kippen, Streifen wird breit — und alles geht zurück', () => {
    const spec = generateHouse(1, 14);
    const net = new VentNet(spec);
    const art = new VentFlapArt(spec, net);
    const meshes = art.group.children.filter(
      (child): child is THREE.InstancedMesh => child instanceof THREE.InstancedMesh,
    );
    const before = meshes.map(matrices);
    art.setOpen('vent-admin');
    expect(art.open).toBe('vent-admin');
    const index = net.flaps.findIndex((flap) => flap.id === 'vent-admin');
    let changed = 0;
    meshes.forEach((mesh, m) => {
      matrices(mesh).forEach((matrix, i) => {
        if (matrix.equals(before[m]![i]!)) return;
        changed++;
        matrix.decompose(_position, _rotation, _scale);
        // Die Position bleibt: Es bewegt sich nichts vom Fleck, es kippt oder wächst.
        before[m]![i]!.decompose(_was, _rotation, _scale);
        expect(_position.distanceTo(_was)).toBeLessThan(1e-6);
        expect(mesh.count % net.flaps.length).toBe(0);
        const perFlap = mesh.count / net.flaps.length;
        expect(Math.floor(i / perFlap)).toBe(index);
      });
    });
    // Vier Lamellen und ein Streifen — fünf Instanzen, sonst keine.
    expect(changed).toBe(5);
    // Eine andere Klappe öffnen schließt die erste; `null` schließt alle.
    art.setOpen('vent-cafeteria');
    expect(art.open).toBe('vent-cafeteria');
    art.setOpen(null);
    expect(art.open).toBeNull();
    meshes.forEach((mesh, m) => {
      matrices(mesh).forEach((matrix, i) => expect(matrix.equals(before[m]![i]!)).toBe(true));
    });
    // Eine Klappe, die es nicht gibt, öffnet nichts.
    art.setOpen('vent-nirgends');
    expect(art.open).toBeNull();
  });
});
