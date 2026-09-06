import * as THREE from 'three';

/**
 * **Ein Achsenkreuz** — drei Pfeile, damit man einem Raum ansieht, wie herum
 * er liegt.
 *
 * Ein Koordinatensystem ist die eine Sache, die man in VR nicht sehen kann und
 * ohne die keine Zahl etwas bedeutet. „Pitch 45°" heißt nichts, solange
 * unklar ist, um welche Achse und gegen was; und dass ein Controller seinen
 * eigenen Raum mitbringt, der schräg im Zimmer steht, merkt man erst, wenn man
 * beide nebeneinander sieht. Also stehen sie da.
 *
 * Die Farben sind die üblichen und mit Absicht keine eigenen: **X rot, Y grün,
 * Z blau** — dieselbe Zuordnung wie in three.js, Blender und jedem
 * Achsenkreuz, das jemand vorher gesehen hat.
 *
 * Der vierte Pfeil ist der, um den es hier eigentlich geht: **-Z, weiß**.
 * Vorne ist in three.js (und in WebXR, und überall in diesem Spiel) das
 * *negative* Z — die Kamera schaut nach -Z, der Zeigestrahl läuft nach -Z, das
 * Vorne jedes Griffs ist -Z. Ein Kreuz, das nur +Z zeigt, zeigt also genau in
 * die Richtung, in die *nichts* zeigt.
 */

export const AXIS_X = 0xff4d5e;
export const AXIS_Y = 0x5ee0a0;
export const AXIS_Z = 0x4aa8ff;
/** Vorne — und deshalb weiß wie der Zeigestrahl. */
export const AXIS_FRONT = 0xf2f6ff;

/** Wie dünn ein Arm gegenüber seiner Länge ist, und wie lang seine Spitze. */
const THICKNESS = 0.028;
const TIP = 0.22;

/**
 * Ein Kreuz mit Armen der Länge `size`, um den Nullpunkt gebaut: +X, +Y, +Z und
 * das weiße -Z.
 *
 * Jeder Arm bekommt eigene Geometrie und ein eigenes Material — geteilt wäre
 * sparsamer und würde beim ersten `dispose` alle anderen Kreuze mitnehmen.
 * Freigegeben wird mit `disposeAxes`.
 */
export function createAxes(size = 0.12): THREE.Group {
  const group = new THREE.Group();
  group.name = 'axes-cross';
  const arms: Array<[number, THREE.Vector3]> = [
    [AXIS_X, new THREE.Vector3(1, 0, 0)],
    [AXIS_Y, new THREE.Vector3(0, 1, 0)],
    [AXIS_Z, new THREE.Vector3(0, 0, 1)],
    [AXIS_FRONT, new THREE.Vector3(0, 0, -1)],
  ];
  for (const [color, direction] of arms) {
    group.add(arm(color, direction, size));
  }
  return group;
}

/** Ein Arm: ein dünner Schaft mit einer Spitze, gedreht in seine Richtung. */
function arm(color: number, direction: THREE.Vector3, size: number): THREE.Group {
  const material = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const radius = size * THICKNESS;
  const shaft = size * (1 - TIP);
  const node = new THREE.Group();

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, shaft, 8), material);
  rod.position.y = shaft / 2;
  node.add(rod);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.4, size * TIP, 10), material);
  tip.position.y = shaft + (size * TIP) / 2;
  node.add(tip);

  // Gebaut steht der Arm auf +Y; gedreht wird er auf seine Richtung.
  node.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  return node;
}

/** Geometrien und Materialien eines Kreuzes freigeben. */
export function disposeAxes(group: THREE.Object3D): void {
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  });
  group.removeFromParent();
}
