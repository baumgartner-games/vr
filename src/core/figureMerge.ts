import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { isOutline } from './outlineShell';
import { asFloat, sameLook } from '../worlds/shared/mergeByLook';

/**
 * **Die Teile einer Figur zu einem Netz** — ein Zeichenaufruf statt sechs.
 *
 * Eine Figur aus dem Regal (`Mannequin_Medium.glb`, die Roboter) besteht aus
 * Kopf, Rumpf, zwei Armen und zwei Beinen, jedes ein eigenes `SkinnedMesh` am
 * selben Skelett und mit demselben Atlas. Gezählt in der Übungsrunde von
 * Haunting: vier Figuren im Blick, 24 Aufrufe je Auge — mehr als die ganze
 * Wand der Station. Gemeldet: _„Bei haunting habe ich viel mehr draw calls als
 * in der Stadt die größer ist und mehr Gegenstände hat?"_
 *
 * Zusammen kommt nur, was **wirklich gleich** hängt: derselbe Elternknoten,
 * dieselbe Lage, dieselbe Bindematrix, dieselben Knochen mit einer Bindepose,
 * die sich in einen gemeinsamen Raum umrechnen lässt (`unionSkeleton`), und
 * dasselbe Aussehen (`sameLook`) — dann rechnet der Vertex-Shader für jede
 * Ecke genau das, was er vorher in ihrem eigenen Netz gerechnet hat. Ein
 * Leuchtmaterial (`robot_glow`) sieht anders aus und bleibt für sich.
 *
 * **Nicht für Figuren, die Teile einzeln zeigen**: Der Avatar blendet Kopf und
 * Hut je nach Sicht aus (`AvatarBody`), darum ist das hier eine Wahl beim
 * Laden (`loadKaykitFigure(…, { merge: true })`) und keine Regel.
 *
 * @returns die neuen Geometrien — sie gehören der Figur und gehen mit ihr
 */
export function mergeFigureParts(model: THREE.Object3D): THREE.BufferGeometry[] {
  const groups = new Map<string, THREE.SkinnedMesh[]>();
  model.traverse((node) => {
    const mesh = node as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.visible || isOutline(mesh)) return;
    if (Array.isArray(mesh.material) || !mesh.material) return;
    const geometry = mesh.geometry;
    if (Object.keys(geometry.morphAttributes).length) return;
    if (!['position', 'skinIndex', 'skinWeight'].every((name) => geometry.getAttribute(name)))
      return;
    const key = [
      mesh.parent?.uuid ?? '',
      mesh.matrix.elements.join(','),
      mesh.bindMatrix.elements.join(','),
      mesh.bindMode,
      sameLook(mesh.material),
      mesh.castShadow ? 1 : 0,
      mesh.receiveShadow ? 1 : 0,
      geometry.getAttribute('normal') ? 'n' : '',
      geometry.getAttribute('uv') ? 'u' : '',
      geometry.getAttribute('skinIndex').itemSize,
    ].join('|');
    const list = groups.get(key) ?? [];
    list.push(mesh);
    groups.set(key, list);
  });

  const made: THREE.BufferGeometry[] = [];
  for (const parts of groups.values()) {
    if (parts.length < 2) continue;
    const first = parts[0]!;
    const union = unionSkeleton(parts);
    if (!union) continue;
    const { skeleton, offsets } = union;
    const plain = parts.map((part, i) => plainSkin(part, skeleton, offsets[i]!));
    const merged = mergeGeometries(plain, false);
    for (const one of plain) one.dispose();
    if (!merged) continue;
    const mesh = new THREE.SkinnedMesh(merged, first.material);
    mesh.name = `${first.name}-merged`;
    mesh.position.copy(first.position);
    mesh.quaternion.copy(first.quaternion);
    mesh.scale.copy(first.scale);
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = first.receiveShadow;
    mesh.frustumCulled = first.frustumCulled;
    mesh.renderOrder = first.renderOrder;
    mesh.layers.mask = first.layers.mask;
    mesh.bindMode = first.bindMode;
    mesh.bind(skeleton, first.bindMatrix);
    first.parent!.add(mesh);
    for (const part of parts) part.removeFromParent();
    made.push(merged);
  }
  return made;
}

/**
 * **Ein Knochenverzeichnis für alle Teile.** Jedes Teil bringt sein eigenes
 * mit — dieselben Knochen, aber nicht immer alle, und mit einer Bindepose,
 * die um einen festen Versatz verschoben sein kann: Die Ecken des linken Arms
 * stehen in einem anderen Raum als die des Rumpfs. Gemeinsam wird das
 * Verzeichnis des ersten Teils; für jedes weitere wird der Versatz gesucht
 * (`offsets`), mit dem seine Ecken in den gemeinsamen Raum kommen. Stimmt der
 * Versatz nicht für alle Knochen eines Teils, gibt es kein gemeinsames
 * Verzeichnis (`null`), und die Teile bleiben, wie sie sind.
 */
function unionSkeleton(
  parts: readonly THREE.SkinnedMesh[],
): { skeleton: THREE.Skeleton; offsets: THREE.Matrix4[] } | null {
  const bones: THREE.Bone[] = [];
  const inverses: THREE.Matrix4[] = [];
  const at = new Map<THREE.Bone, number>();
  const offsets: THREE.Matrix4[] = [];
  for (const part of parts) {
    const own = part.skeleton;
    // Der Versatz dieses Teils: gemeinsame Pose⁻¹ · eigene Pose, an einem
    // Knochen, den beide kennen — beim ersten Teil die Einheit.
    const offset = new THREE.Matrix4();
    const shared = own.bones.findIndex((bone) => at.has(bone));
    if (shared >= 0) {
      const common = inverses[at.get(own.bones[shared]!)!]!;
      offset.copy(common).invert().multiply(own.boneInverses[shared]!);
    } else if (bones.length) return null;
    const back = offset.clone().invert();
    for (let i = 0; i < own.bones.length; i++) {
      const bone = own.bones[i]!;
      const inverse = own.boneInverses[i];
      if (!inverse) return null;
      const known = at.get(bone);
      if (known === undefined) {
        at.set(bone, bones.length);
        bones.push(bone);
        inverses.push(inverse.clone().multiply(back));
      } else if (!nearly(_check.multiplyMatrices(inverses[known]!, offset), inverse)) return null;
    }
    offsets.push(offset);
  }
  return { skeleton: new THREE.Skeleton(bones, inverses), offsets };
}

const _check = new THREE.Matrix4();

function nearly(a: THREE.Matrix4, b: THREE.Matrix4): boolean {
  return a.elements.every((value, i) => Math.abs(value - b.elements[i]!) < 1e-3);
}

/**
 * Dieselben Spalten in derselben Form für jedes Teil — mit Index, und mit
 * Knochennummern, die ins gemeinsame Verzeichnis zeigen (`unionSkeleton`).
 */
function plainSkin(
  part: THREE.SkinnedMesh,
  skeleton: THREE.Skeleton,
  offset: THREE.Matrix4,
): THREE.BufferGeometry {
  const source = part.geometry;
  const plain = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv', 'skinWeight']) {
    const attribute = source.getAttribute(name);
    if (attribute) plain.setAttribute(name, asFloat(attribute));
  }
  // In den gemeinsamen Raum (`unionSkeleton`): Ecken mit dem Versatz,
  // Normalen mit seiner Normalenmatrix.
  plain.getAttribute('position').applyMatrix4(offset);
  const normal = plain.getAttribute('normal');
  if (normal) normal.applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(offset));
  const remap = part.skeleton.bones.map((bone) => skeleton.bones.indexOf(bone));
  const skinIndex = source.getAttribute('skinIndex');
  const indices = new Uint16Array(skinIndex.count * skinIndex.itemSize);
  for (let i = 0; i < skinIndex.count; i++)
    for (let c = 0; c < skinIndex.itemSize; c++)
      indices[i * skinIndex.itemSize + c] = remap[skinIndex.getComponent(i, c)] ?? 0;
  plain.setAttribute('skinIndex', new THREE.BufferAttribute(indices, skinIndex.itemSize));
  const index = source.getIndex();
  const count = source.getAttribute('position').count;
  plain.setIndex(index ? Array.from(index.array as ArrayLike<number>) : [...Array(count).keys()]);
  return plain;
}
