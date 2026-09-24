/**
 * **Abgewandelte Stücke aus dem Prototyp-Paket** — einmal von Hand laufen
 * lassen, das Ergebnis liegt in `public/models/kaykit/prototype-bits/`.
 *
 *     node tools/prototype-variants.mjs
 *
 * Gewünscht war (September 2026): den Durchgang (`Wall_Doorway`) **eine**
 * Kachel breit, mit der Tür in der Mitte und einem höheren Bogen, dazu eine
 * Fassung über **zwei** Kacheln für die Türen der Raumstation; den
 * Fensterrahmen (`Wall_Window_Closed`) in einer anderen Farbe; und Türen, die
 * so hoch sind wie der Bogen. Gerechnet wird aus den **unveränderten**
 * Originalen in `tools/kaykit-originals/` — die Dateien im Regal sind danach
 * die abgewandelten, und ein zweiter Lauf fängt wieder beim Original an.
 *
 * ## Was abgewandelt wird — alles in Quelleinheiten der Datei
 *
 * Die Originale sind 4 × 4 Einheiten groß, die Öffnung des Durchgangs
 * 1,6 × 2,8 (|x| < 0,8), die Zarge läuft von 0,8 bis 1,0 und oben von 2,8 bis
 * 3,0; links und rechts davon steht je eine Einheit Wand. Das Regal stellt
 * diese Stücke mit 0,5 in die Breite und 0,7 in die Höhe auf
 * (`core/kaykitFit.KAYKIT_FILE_SCALE`): 2 m breit, 2,8 m hoch.
 *
 * - **Höher**: Alles zwischen dem gelben Sockel (0,9) und der Oberkante der
 *   Öffnung (2,8) wird auf 0,9 … 3,0 gestreckt; darüber rückt die Zarge nach,
 *   und die Wand über der Tür wird entsprechend flacher. Die Öffnung ist damit
 *   3,0 Einheiten hoch — 2,1 m, die Türhöhe der Gitterwelten
 *   (`PLAN_DOOR_H`), und der Space Ranger mit Helm (1,8 m) geht aufrecht
 *   hindurch. Der Sockel bleibt, wie er ist, damit er an der Wand daneben
 *   weiterläuft.
 * - **Eine Kachel** (`Wall_Doorway`, `Wall_Window_Closed_Narrow`): Die Wand
 *   links und rechts der Zarge fällt weg (|x| > 1 → 1). Die Öffnung bleibt in
 *   der Mitte.
 * - **Zwei Kacheln** (`Wall_Doorway_Wide`): Die Öffnung wird auf |x| < 1,8
 *   gestreckt, die Zarge rückt an den Rand, die Wand daneben fällt weg.
 * - **Die Farbe**: Zarge, Fensterrahmen und Türblatt liegen im braunen Feld
 *   des Atlas (768 … 896 px). `FRAME_SHIFT` schiebt sie in ein anderes Feld —
 *   voreingestellt das dunkelgraue (384 … 512 px). Wer eine andere Farbe will,
 *   ändert die eine Zahl und lässt das Werkzeug noch einmal laufen: 0 lässt
 *   sie braun, −640 macht sie gelb, −512 weiß, −256 schwarz, −128 blau.
 *
 * - **Das Glas** des Fensters liegt im Atlas im blauen Feld unten links
 *   (u < 256 px, v > 768 px) und ist dort so undurchsichtig wie die Wand. Es
 *   wird ein eigenes Teil mit eigenem Material (`glass`, durchscheinend,
 *   `GLASS_ALPHA`) — sonst sähe man durch kein Fenster mehr hinaus.
 *
 * Geschrieben wird unkomprimiert (Float32, ohne Meshopt) — die Stücke sind
 * klein, und so braucht es zum Schreiben kein weiteres Paket. Die Textur
 * bleibt die des Pakets (`textures/prototypebits_texture.webp`).
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/** Um wie viele Bildpunkte die braunen Teile im Atlas verschoben werden (1024 px breit). */
const FRAME_SHIFT = -384;
const ATLAS = 1024;
/** Wie viel vom Glas zu sehen ist — der Rest ist Durchblick. */
const GLASS_ALPHA = 0.35;
const BROWN = [768, 896];

const SOURCE = path.resolve('tools/kaykit-originals/prototype-bits');
const OUT = path.resolve('public/models/kaykit/prototype-bits');

// GLTFLoader will Bilder laden, die hier niemand braucht: Die Textur bleibt
// eine Adresse und wird nicht angefasst.
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

/** Stückweise lineare Abbildung über Stützstellen `[von, nach]`, spiegelbildlich um null. */
function mirrored(points) {
  return (value) => {
    const sign = value < 0 ? -1 : 1;
    const at = Math.abs(value);
    for (let i = 1; i < points.length; i++) {
      const [a0, b0] = points[i - 1];
      const [a1, b1] = points[i];
      if (at <= a1 + 1e-9) return sign * (b0 + ((at - a0) / (a1 - a0 || 1)) * (b1 - b0));
    }
    return sign * points[points.length - 1][1];
  };
}

/** Stückweise linear, nur für nicht-negative Werte (die Höhe). */
function linear(points) {
  const map = mirrored(points);
  return (value) => map(value);
}

const identity = (value) => value;
const HIGHER = linear([
  [0, 0],
  [0.9, 0.9],
  [2.8, 3.0],
  [3.0, 3.2],
  [4.0, 4.0],
]);
const NARROW = mirrored([
  [0, 0],
  [1, 1],
  [2, 1],
]);
const WIDE = mirrored([
  [0, 0],
  [0.8, 1.8],
  [1.0, 2.0],
  [2.0, 2.0],
]);
/** Die Tür wächst mit der Öffnung in die Höhe: 2,8 → 3,0. */
const DOOR_HIGHER = linear([
  [0, 0],
  [2.8, 3.0],
  [4.0, 4.2],
]);

const VARIANTS = [
  { from: 'Wall_Doorway.glb', to: 'Wall_Doorway.glb', x: NARROW, y: HIGHER, recolor: true },
  { from: 'Wall_Doorway.glb', to: 'Wall_Doorway_Wide.glb', x: WIDE, y: HIGHER, recolor: true },
  {
    from: 'Wall_Window_Closed.glb',
    to: 'Wall_Window_Closed.glb',
    x: identity,
    y: identity,
    recolor: true,
    glass: true,
  },
  {
    from: 'Wall_Window_Closed.glb',
    to: 'Wall_Window_Closed_Narrow.glb',
    x: NARROW,
    y: identity,
    recolor: true,
    glass: true,
  },
  { from: 'Door_A.glb', to: 'Door_A_Metal.glb', x: identity, y: DOOR_HIGHER, recolor: true },
];

for (const variant of VARIANTS) {
  const bytes = readFileSync(path.join(SOURCE, variant.from));
  const gltf = await new Promise((resolve, reject) =>
    loader.parse(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
      resolve,
      reject,
    ),
  );
  gltf.scene.updateMatrixWorld(true);
  let mesh = null;
  gltf.scene.traverse((object) => {
    if (object.isMesh) mesh = object;
  });
  const name = path.basename(variant.to, '.glb');
  const glb = writeGlb(name, shape(mesh, variant));
  writeFileSync(path.join(OUT, variant.to), glb);
  console.log(`${variant.to}: ${glb.length} Bytes`);
}

/** Ecken, Normalen, UV und Index eines Netzes — in Quelleinheiten, abgewandelt. */
function shape(mesh, variant) {
  const geometry = mesh.geometry;
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  const count = position.count;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const turn = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  for (let i = 0; i < count; i++) {
    v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    positions[i * 3] = variant.x(v.x);
    positions[i * 3 + 1] = variant.y(v.y);
    positions[i * 3 + 2] = v.z;
    n.fromBufferAttribute(normal, i).applyMatrix3(turn).normalize();
    normals.set([n.x, n.y, n.z], i * 3);
    let u = uv.getX(i);
    const px = u * ATLAS;
    if (variant.recolor && px >= BROWN[0] && px < BROWN[1]) u += FRAME_SHIFT / ATLAS;
    uvs[i * 2] = u;
    uvs[i * 2 + 1] = uv.getY(i);
  }
  const solid = [];
  const glass = [];
  for (let t = 0; t < geometry.index.count; t += 3) {
    const corners = [0, 1, 2].map((k) => geometry.index.getX(t + k));
    const u = corners.reduce((sum, i) => sum + uv.getX(i), 0) / 3;
    const w = corners.reduce((sum, i) => sum + uv.getY(i), 0) / 3;
    const isGlass = variant.glass && u * ATLAS < 256 && w * ATLAS > 768;
    (isGlass ? glass : solid).push(...corners);
  }
  return { positions, normals, uvs, index: new Uint32Array(solid), glass: new Uint32Array(glass) };
}

/** Eine GLB-Datei mit einem Netz, einem Material und der Textur des Pakets als Adresse. */
function writeGlb(name, { positions, normals, uvs, index, glass }) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3)
    for (let c = 0; c < 3; c++) {
      min[c] = Math.min(min[c], positions[i + c]);
      max[c] = Math.max(max[c], positions[i + c]);
    }
  const arrays = [positions, normals, uvs, index, ...(glass.length ? [glass] : [])];
  const views = arrays.map((array) => Buffer.from(array.buffer));
  const offsets = [];
  let length = 0;
  for (const view of views) {
    offsets.push(length);
    length += view.length;
  }
  const json = {
    asset: { version: '2.0', generator: 'baumgartner-vr tools/prototype-variants.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    meshes: [
      {
        name,
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 3,
            material: 0,
          },
          ...(glass.length
            ? [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 4, material: 1 }]
            : []),
        ],
      },
    ],
    materials: [
      {
        name: 'prototype_texture',
        pbrMetallicRoughness: {
          roughnessFactor: 0.4,
          metallicFactor: 0,
          baseColorTexture: { index: 0 },
        },
      },
      {
        name: 'glass',
        alphaMode: 'BLEND',
        pbrMetallicRoughness: {
          baseColorFactor: [1, 1, 1, GLASS_ALPHA],
          roughnessFactor: 0.1,
          metallicFactor: 0,
          baseColorTexture: { index: 0 },
        },
      },
    ],
    textures: [{ source: 0, sampler: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
    images: [
      { name: 'prototypebits_texture', mimeType: 'image/webp', uri: 'textures/prototypebits_texture.webp' },
    ],
    buffers: [{ byteLength: length }],
    bufferViews: views.map((view, i) => ({
      buffer: 0,
      byteOffset: offsets[i],
      byteLength: view.length,
      target: i >= 3 ? 34963 : 34962,
    })),
    accessors: [
      { bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min, max },
      { bufferView: 1, componentType: 5126, count: normals.length / 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: uvs.length / 2, type: 'VEC2' },
      { bufferView: 3, componentType: 5125, count: index.length, type: 'SCALAR' },
      ...(glass.length
        ? [{ bufferView: 4, componentType: 5125, count: glass.length, type: 'SCALAR' }]
        : []),
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
const index = JSON.parse(readFileSync(indexPath, 'utf8'));
const pack = index.root.dirs.find((dir) => dir.name === 'prototype-bits');
const byName = (a, b) => {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x !== y) return x < y ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
};
for (const variant of VARIANTS) {
  const bytes = statSync(path.join(OUT, variant.to)).size;
  const known = pack.files.find((file) => file.name === variant.to);
  if (known) known.bytes = bytes;
  else pack.files.push({ name: variant.to, bytes });
}
pack.files.sort((a, b) => byName(a.name, b.name));
writeFileSync(indexPath, JSON.stringify(index));
