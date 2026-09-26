/**
 * **Mehr Muster für _Boden_ im Baukasten** — Küchenfliesen in anderen Farben,
 * aus dem unveränderten Stück des Regals gerechnet. Einmal von Hand laufen
 * lassen, das Ergebnis liegt in `public/models/kaykit/restaurant-bits/`:
 *
 *     node tools/surface-variants.mjs
 *
 * Gewünscht war (September 2026): mehr Muster für Boden und Wand, aus
 * KayKit-Farbvarianten wie bei `tools/prototype-variants.mjs` — ohne neue
 * Assets und ohne großen Download. Die Stücke von KayKit färben sich über
 * einen **Farbatlas**: Jede Fläche zeigt mit ihren UV-Koordinaten in eines
 * von 8 × 4 Feldern (je 128 × 256 px) von
 * `restaurant-bits/textures/restaurantbits_extra.webp`. Die schwarzen
 * Fliesen von `floor_kitchen_small` liegen im dunkelgrauen Feld (1, 0), die weißen in
 * (4, 0). Wer die UV der schwarzen um ganze Felder verschiebt, bekommt
 * dieselbe Fliese in einer anderen Farbe — **dieselbe Textur**, nur ein neues
 * kleines Netz (unkomprimiert rund 5 KB), und geladen wird es erst, wenn
 * jemand das Muster wählt.
 *
 * Quelle ist das Stück im Regal selbst (`floor_kitchen_small.glb` wird hier
 * nicht verändert); ein zweiter Lauf schreibt dieselben Dateien neu.
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const DIR = path.resolve('public/models/kaykit/restaurant-bits');
/** Felder des Atlas: 8 Spalten, 4 Reihen. */
const COLUMNS = 8;
const ROWS = 4;

/**
 * Die Varianten: aus welchem Feld (Spalte, Reihe) welche Flächen in welches
 * Feld wandern. Nur die schwarzen Fliesen wandern, die weißen bleiben.
 */
const VARIANTS = [
  { from: 'floor_kitchen_small.glb', to: 'floor_kitchen_small_red.glb', move: [[1, 0, 6, 2]] },
  { from: 'floor_kitchen_small.glb', to: 'floor_kitchen_small_green.glb', move: [[1, 0, 1, 2]] },
  { from: 'floor_kitchen_small.glb', to: 'floor_kitchen_small_blue.glb', move: [[1, 0, 0, 1]] },
];

// GLTFLoader will Bilder laden, die hier niemand braucht: Die Textur bleibt
// eine Adresse und wird nicht angefasst (wie in `prototype-variants.mjs`).
globalThis.self = globalThis;
globalThis.URL.createObjectURL = () => 'blob:none';
class NoImage {
  set src(_value) {
    setTimeout(() => this.onload?.(), 0);
  }
  addEventListener(event, listener) {
    if (event === 'load') setTimeout(listener, 0);
  }
  removeEventListener() {}
}
globalThis.Image = NoImage;
globalThis.document = { createElementNS: () => new NoImage() };

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
await MeshoptDecoder.ready;

for (const variant of VARIANTS) {
  const bytes = readFileSync(path.join(DIR, variant.from));
  const gltf = await new Promise((resolve, reject) =>
    loader.parse(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
      resolve,
      reject,
    ),
  );
  gltf.scene.updateMatrixWorld(true);
  const meshes = [];
  gltf.scene.traverse((object) => {
    if (object.isMesh) meshes.push(object);
  });
  const name = path.basename(variant.to, '.glb');
  const glb = writeGlb(name, merge(meshes, variant.move));
  writeFileSync(path.join(DIR, variant.to), glb);
  console.log(`${variant.to}: ${glb.length} Bytes`);
}

/** Alle Netze in einem, in Quelleinheiten, mit verschobenen UV. */
function merge(meshes, move) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const index = [];
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    const position = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    const uv = geometry.attributes.uv;
    const base = positions.length / 3;
    const turn = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      positions.push(v.x, v.y, v.z);
      n.fromBufferAttribute(normal, i).applyMatrix3(turn).normalize();
      normals.push(n.x, n.y, n.z);
      let u = uv.getX(i);
      let w = uv.getY(i);
      const column = Math.floor(u * COLUMNS);
      const row = Math.floor(w * ROWS);
      for (const [c0, r0, c1, r1] of move)
        if (column === c0 && row === r0) {
          u += (c1 - c0) / COLUMNS;
          w += (r1 - r0) / ROWS;
          break;
        }
      uvs.push(u, w);
    }
    if (geometry.index)
      for (let t = 0; t < geometry.index.count; t++) index.push(base + geometry.index.getX(t));
    else for (let t = 0; t < position.count; t++) index.push(base + t);
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    index: new Uint32Array(index),
  };
}

/** Eine GLB-Datei mit einem Netz und der Textur des Pakets als Adresse. */
function writeGlb(name, { positions, normals, uvs, index }) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3)
    for (let c = 0; c < 3; c++) {
      min[c] = Math.min(min[c], positions[i + c]);
      max[c] = Math.max(max[c], positions[i + c]);
    }
  const views = [positions, normals, uvs, index].map((array) => Buffer.from(array.buffer));
  const offsets = [];
  let length = 0;
  for (const view of views) {
    offsets.push(length);
    length += view.length;
  }
  const json = {
    asset: { version: '2.0', generator: 'baumgartner-vr tools/surface-variants.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    meshes: [
      {
        name,
        primitives: [
          { attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 },
        ],
      },
    ],
    materials: [
      {
        name: 'restaurant',
        pbrMetallicRoughness: {
          roughnessFactor: 0.5,
          metallicFactor: 0,
          baseColorTexture: { index: 0 },
        },
      },
    ],
    textures: [{ source: 0, sampler: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
    images: [
      {
        name: 'restaurantbits_extra',
        mimeType: 'image/webp',
        uri: 'textures/restaurantbits_extra.webp',
      },
    ],
    buffers: [{ byteLength: length }],
    bufferViews: views.map((view, i) => ({
      buffer: 0,
      byteOffset: offsets[i],
      byteLength: view.length,
      target: i === 3 ? 34963 : 34962,
    })),
    accessors: [
      { bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min, max },
      { bufferView: 1, componentType: 5126, count: normals.length / 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: uvs.length / 2, type: 'VEC2' },
      { bufferView: 3, componentType: 5125, count: index.length, type: 'SCALAR' },
    ],
  };
  let text = Buffer.from(JSON.stringify(json));
  text = Buffer.concat([text, Buffer.alloc((4 - (text.length % 4)) % 4, 0x20)]);
  let binary = Buffer.concat(views);
  binary = Buffer.concat([binary, Buffer.alloc((4 - (binary.length % 4)) % 4)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + text.length + 8 + binary.length, 8);
  const chunk = (data, type) => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(data.length, 0);
    head.writeUInt32LE(type, 4);
    return Buffer.concat([head, data]);
  };
  return Buffer.concat([header, chunk(text, 0x4e4f534a), chunk(binary, 0x004e4942)]);
}

// Und ins Inhaltsverzeichnis des Regals — sortiert wie `tools/kaykit-model.mjs`.
const indexPath = path.resolve('public/models/kaykit/index.json');
const catalogue = JSON.parse(readFileSync(indexPath, 'utf8'));
const pack = catalogue.root.dirs.find((dir) => dir.name === 'restaurant-bits');
const byName = (a, b) => {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x !== y) return x < y ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
};
for (const variant of VARIANTS) {
  const bytes = statSync(path.join(DIR, variant.to)).size;
  const known = pack.files.find((file) => file.name === variant.to);
  if (known) known.bytes = bytes;
  else pack.files.push({ name: variant.to, bytes });
}
pack.files.sort((a, b) => byName(a.name, b.name));
writeFileSync(indexPath, JSON.stringify(catalogue));
