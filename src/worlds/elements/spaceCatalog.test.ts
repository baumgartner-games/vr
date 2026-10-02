import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import * as THREE from 'three';
import { KAYKIT_SCALE } from '../../core/kaykitFit';
import { allFolders, FURNITURE_FOLDERS, hasElement } from './elementCatalog';
import { SPACE_CATALOGUE, SPACE_ELEMENTS, SPACE_FOLDER, SPACE_SCALE } from './spaceCatalog';

const DIR = join(process.cwd(), 'public', 'models', 'kaykit', 'space-base-bits');

/** Teiler normierter Ganzzahlen (`KHR_mesh_quantization`), nach Komponententyp. */
const NORM: Readonly<Record<number, number>> = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };

/**
 * **Die Hülle einer Datei, aus ihren Knoten gelesen** — ohne Lader und ohne
 * Grafik: die Grenzen jeder `POSITION` (Pflicht im glTF), durch die Matrizen
 * der Knoten gezogen. Dieselbe Rechnung, mit der die Kacheln im Katalog
 * bestimmt wurden.
 */
function hull(file: string): THREE.Vector3 {
  const data = readFileSync(join(DIR, file));
  const length = data.readUInt32LE(12);
  const gltf = JSON.parse(data.subarray(20, 20 + length).toString('utf8')) as {
    scene?: number;
    scenes: { nodes: number[] }[];
    nodes: {
      mesh?: number;
      children?: number[];
      matrix?: number[];
      translation?: [number, number, number];
      rotation?: [number, number, number, number];
      scale?: [number, number, number];
    }[];
    meshes: { primitives: { attributes: { POSITION: number } }[] }[];
    accessors: { min: number[]; max: number[]; normalized?: boolean; componentType: number }[];
  };
  const box = new THREE.Box3();
  const visit = (index: number, parent: THREE.Matrix4): void => {
    const node = gltf.nodes[index]!;
    const local = new THREE.Matrix4();
    if (node.matrix) local.fromArray(node.matrix);
    else
      local.compose(
        new THREE.Vector3(...(node.translation ?? [0, 0, 0])),
        new THREE.Quaternion(...(node.rotation ?? [0, 0, 0, 1])),
        new THREE.Vector3(...(node.scale ?? [1, 1, 1])),
      );
    const world = parent.clone().multiply(local);
    if (node.mesh !== undefined) {
      for (const primitive of gltf.meshes[node.mesh]!.primitives) {
        const at = gltf.accessors[primitive.attributes.POSITION]!;
        const k = at.normalized ? NORM[at.componentType]! : 1;
        const part = new THREE.Box3(
          new THREE.Vector3(...at.min.map((v) => v / k)),
          new THREE.Vector3(...at.max.map((v) => v / k)),
        );
        box.union(part.applyMatrix4(world));
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  };
  for (const root of gltf.scenes[gltf.scene ?? 0]!.nodes) visit(root, new THREE.Matrix4());
  return box.getSize(new THREE.Vector3());
}

describe('Der Weltraum im Katalog', () => {
  it('steht als eigener Bereich neben Haus, Restaurant und Natur, nach Art sortiert', () => {
    expect(FURNITURE_FOLDERS).toContain(SPACE_FOLDER);
    expect(SPACE_FOLDER.label).toBe('Weltraum');
    expect(SPACE_FOLDER.folders!.map((one) => one.label)).toEqual([
      'Module',
      'Versorgung',
      'Fracht',
      'Fahrzeuge',
      'Tunnel',
      'Gelände',
      'Alles',
    ]);
    for (const folder of SPACE_FOLDER.folders!) {
      expect(folder.elements.length).toBeGreaterThan(0);
      if (folder.cover && 'element' in folder.cover)
        expect(folder.elements).toContain(folder.cover.element);
    }
  });

  it('führt jedes Teil in genau einer Art und alle in Alles', () => {
    const sorted = SPACE_FOLDER.folders!.filter((one) => one.id !== 'space-all').flatMap(
      (one) => one.elements,
    );
    expect([...sorted].sort()).toEqual([...SPACE_CATALOGUE].sort());
    expect(new Set(sorted).size).toBe(sorted.length);
    const all = allFolders([SPACE_FOLDER]).find((one) => one.id === 'space-all')!;
    expect(all.elements).toEqual(SPACE_CATALOGUE);
    for (const id of SPACE_CATALOGUE) expect(hasElement(id)).toBe(true);
  });

  it('hat jede Datei des Pakets genau einmal — und nur zum Hinstellen, ohne Station', () => {
    const models = SPACE_ELEMENTS.map((one) => one.parts[0]!.model);
    expect(new Set(models).size).toBe(models.length);
    for (const element of SPACE_ELEMENTS) {
      expect(element.kind).toBeNull();
      expect(element.parts).toHaveLength(1);
      expect(element.parts[0]!.scale).toBe(SPACE_SCALE);
    }
    if (!existsSync(DIR)) return;
    const files = readFileSync(
      join(process.cwd(), 'public', 'models', 'kaykit', 'index.json'),
      'utf8',
    );
    const listed = [...files.matchAll(/"name":"([^"]+\.glb)"/g)].map((hit) => hit[1]!);
    const pack = new Set(
      models
        .map((model) => model.replace('space-base-bits/', ''))
        .filter((f) => listed.includes(f)),
    );
    expect(pack.size).toBe(models.length);
  });

  it('belegt so viele Kacheln, wie das Modell bei 2 m je Einheit misst', () => {
    if (!existsSync(DIR)) return;
    const metres = KAYKIT_SCALE * SPACE_SCALE;
    expect(metres).toBe(2);
    const wrong: string[] = [];
    for (const element of SPACE_ELEMENTS) {
      const size = hull(element.parts[0]!.model.replace('space-base-bits/', ''));
      // Bis zu gut 10 cm Überstand passen noch auf die kleinere Zahl (der Wassertank misst 4,10 m).
      const want = [size.x, size.z].map((m) => Math.max(1, Math.ceil(m * metres - 0.11)));
      if (want[0] !== element.tiles[0] || want[1] !== element.tiles[1])
        wrong.push(`${element.id}: ${element.tiles.join('×')} statt ${want.join('×')}`);
    }
    expect(wrong).toEqual([]);
  });

  it('hat eine Frachtkiste von einer Kachel — der Anker des Maßstabs', () => {
    const crate = SPACE_ELEMENTS.find((one) => one.id === 'space-cargo-a')!;
    expect(crate.tiles).toEqual([1, 1]);
  });
});
