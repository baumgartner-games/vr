import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { isOutline } from '../../core/outlineShell';

const _relative = new THREE.Matrix4();
const _inverse = new THREE.Matrix4();
const KEEP = ['position', 'normal', 'uv'] as const;

/**
 * **Feste Teile eines Möbels zu einem Netz je Aussehen backen.**
 *
 * Ein Rechner der Zentrale besteht aus Tisch, Monitor, Tastatur und Maus aus
 * dem Regal, jedes mit eigenem Netz und eigener Kopie desselben Materials —
 * vier Zeichenaufrufe je Auge für ein Möbel, das sich nie rührt. Gleich
 * aussehende Netze (`modelBatch.lookOf`) werden hier zu einem zusammengelegt,
 * in den Raum von `root` gerechnet und unter `root` gehängt; die Teile selbst
 * gehen aus dem Bild. Gemeldet: _„Bitte weiter optimieren, sodass ich auf
 * 60fps kommen kann"_ — in der Brille zählt jeder Aufruf doppelt.
 *
 * **Nur für Teile, die sich nie bewegen, nie einzeln ein- oder ausgeblendet
 * werden und nicht einzeln gemeint sind.** Der Saum des Möbels bleibt: Er
 * umrandet, was unter `root` hängt (`highlightOf`), und das ist jetzt das
 * gebackene Netz. Die Geometrie der Teile gehört dem Regal und wird nicht
 * freigegeben.
 *
 * @returns wie viele Netze weniger es sind
 */
export function mergeByLook(root: THREE.Object3D, parts: readonly THREE.Object3D[]): number {
  root.updateMatrixWorld(true);
  _inverse.copy(root.matrixWorld).invert();
  const groups = new Map<string, { material: THREE.Material; meshes: THREE.Mesh[] }>();
  for (const part of parts) {
    part.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || !visibleUpTo(mesh, root)) return;
      if (
        (mesh as THREE.SkinnedMesh).isSkinnedMesh ||
        (mesh as THREE.InstancedMesh).isInstancedMesh
      )
        return;
      if (Array.isArray(mesh.material) || !mesh.material || isOutline(mesh)) return;
      if (mesh.matrixWorld.determinant() <= 0) return;
      if (!KEEP.every((name) => mesh.geometry.getAttribute(name))) return;
      const look = `${sameLook(mesh.material)}|${mesh.castShadow ? 1 : 0}|${mesh.receiveShadow ? 1 : 0}`;
      const group = groups.get(look) ?? { material: mesh.material, meshes: [] };
      group.meshes.push(mesh);
      groups.set(look, group);
    });
  }
  let saved = 0;
  for (const { material, meshes } of groups.values()) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map((mesh) => {
      const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      const plain = new THREE.BufferGeometry();
      // **Als Fließkomma**: Die Modelle aus dem Regal sind gepackt (16-Bit,
      // normiert); mit einer Matrix darauf würde jeder Wert über 1 gekappt —
      // so lag der Monitor plötzlich flach auf dem Tisch.
      for (const name of KEEP) plain.setAttribute(name, asFloat(source.getAttribute(name)));
      source.dispose();
      _relative.multiplyMatrices(_inverse, mesh.matrixWorld);
      return plain.applyMatrix4(_relative);
    });
    const merged = mergeGeometries(geometries, false);
    for (const geometry of geometries) geometry.dispose();
    if (!merged) continue;
    merged.computeBoundingSphere();
    const baked = new THREE.Mesh(merged, material);
    baked.name = 'merged-by-look';
    baked.castShadow = meshes[0]!.castShadow;
    baked.receiveShadow = meshes[0]!.receiveShadow;
    root.add(baked);
    for (const mesh of meshes) mesh.removeFromParent();
    saved += meshes.length - 1;
  }
  return saved;
}

/** Ob ein Netz bis hinauf zu `root` sichtbar ist. */
function visibleUpTo(mesh: THREE.Object3D, root: THREE.Object3D): boolean {
  for (let node: THREE.Object3D | null = mesh; node && node !== root; node = node.parent)
    if (!node.visible) return false;
  return true;
}

/**
 * **Wie ein Material aussieht — mit dem Bild statt der Bildnummer.** Jede
 * Datei aus dem Regal bringt ihre eigene Kopie desselben Texturatlas mit
 * (Tisch, Monitor, Tastatur und Maus: viermal `furniture_texture`), und nach
 * der Nummer (`lookOf`) sähen sie verschieden aus. Gleich ist hier, was
 * dieselben Werte und ein Bild mit demselben Inhalt hat (`imageKey`).
 */
function sameLook(material: THREE.Material): string {
  const standard = material as THREE.MeshStandardMaterial;
  return [
    material.type,
    standard.color?.getHex() ?? '',
    standard.emissive?.getHex() ?? '',
    standard.emissiveIntensity ?? '',
    standard.roughness ?? '',
    standard.metalness ?? '',
    material.transparent ? 1 : 0,
    material.opacity,
    material.side,
    material.vertexColors ? 1 : 0,
    textureKey(standard.map),
    textureKey(standard.emissiveMap),
    textureKey(standard.normalMap),
  ].join('|');
}

const keys = new WeakMap<THREE.Texture, string>();
let probe: CanvasRenderingContext2D | null = null;
const PROBE = 24;

/** Ein Fingerabdruck des Bildinhalts: verkleinert auf 24 × 24 und gehasht. */
function textureKey(texture: THREE.Texture | null | undefined): string {
  if (!texture) return '';
  const known = keys.get(texture);
  if (known) return known;
  let key = texture.uuid;
  const image = texture.image as CanvasImageSource & { width?: number; height?: number };
  try {
    if (image && image.width && image.height) {
      if (!probe) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = PROBE;
        probe = canvas.getContext('2d', { willReadFrequently: true });
      }
      if (probe) {
        probe.clearRect(0, 0, PROBE, PROBE);
        probe.drawImage(image, 0, 0, PROBE, PROBE);
        const data = probe.getImageData(0, 0, PROBE, PROBE).data;
        let hash = 2166136261;
        for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data[i]!, 16777619);
        key = `${image.width}x${image.height}:${(hash >>> 0).toString(36)}|${texture.flipY ? 1 : 0}|${texture.wrapS}|${texture.wrapT}|${texture.offset.x},${texture.offset.y},${texture.repeat.x},${texture.repeat.y},${texture.rotation}`;
      }
    }
  } catch {
    key = texture.uuid;
  }
  keys.set(texture, key);
  return key;
}

/** Eine Spalte als gewöhnliches Fließkomma, entpackt (`normalized`) und ohne Verschränkung. */
function asFloat(
  attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
): THREE.BufferAttribute {
  const size = attribute.itemSize;
  const out = new Float32Array(attribute.count * size);
  for (let i = 0; i < attribute.count; i++)
    for (let c = 0; c < size; c++) out[i * size + c] = attribute.getComponent(i, c);
  return new THREE.BufferAttribute(out, size);
}
