import * as THREE from 'three';

const _normal = new THREE.Vector3();

/**
 * Die **Spiegelung an einer Ebene** als 4×4-Matrix.
 *
 * Das ist die ganze Mathematik hinter einem Spiegel: Wer hineinschaut, sieht
 * die Welt so, wie eine Kamera sie sähe, die an der Spiegelebene gespiegelt
 * hinter ihr steht. Diese Matrix macht aus der einen Kamera die andere — und
 * weil ein Spiegelbild nicht dasselbe ist wie eine gedrehte Sicht, ist ihre
 * Determinante **negativ**: Links und rechts tauschen, und genau deshalb hebt
 * das Gegenüber im Spiegel die andere Hand.
 *
 * Aufgeschrieben ist es die Householder-Spiegelung `I − 2·n·nᵀ`, verschoben um
 * `2·(n·p)·n`, damit die Ebene nicht durch den Ursprung gehen muss.
 *
 * @param normal Normale der Ebene (wird normiert)
 * @param point  irgendein Punkt auf der Ebene
 */
export function mirrorMatrix(
  target: THREE.Matrix4,
  normal: THREE.Vector3,
  point: THREE.Vector3,
): THREE.Matrix4 {
  const n = _normal.copy(normal).normalize();
  const d = n.dot(point);
  const { x, y, z } = n;
  // `Matrix4.set` liest zeilenweise — so, wie es hier auch dasteht.
  return target.set(
    1 - 2 * x * x,
    -2 * x * y,
    -2 * x * z,
    2 * d * x,
    -2 * y * x,
    1 - 2 * y * y,
    -2 * y * z,
    2 * d * y,
    -2 * z * x,
    -2 * z * y,
    1 - 2 * z * z,
    2 * d * z,
    0,
    0,
    0,
    1,
  );
}

/**
 * Wie weit ein Punkt **vor** der Ebene liegt; negativ heißt dahinter.
 *
 * Ein Spiegel, in dessen Rücken man steht, zeigt nichts — und ein Auge genau
 * in der Ebene macht die Rechnung entartet. Beides fragt der Renderer hiermit
 * ab, bevor er überhaupt eine Sicht aufbaut.
 */
export function mirrorDistance(
  normal: THREE.Vector3,
  point: THREE.Vector3,
  at: THREE.Vector3,
): number {
  const n = _normal.copy(normal).normalize();
  return n.dot(at) - n.dot(point);
}
