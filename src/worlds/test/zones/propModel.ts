import * as THREE from 'three';
import type { PropBox, PropFit } from './propFit';

/**
 * **Die drei Handgriffe am geladenen Modell**, die `propFit.ts` nicht machen
 * kann: messen, das eine Netz suchen, seine Geometrie eingepasst kopieren.
 *
 * Getrennt von der Rechnung nebenan, und zwar aus dem Grund, aus dem in
 * diesem Projekt fast alles getrennt ist: Was `THREE.Object3D` anfasst,
 * braucht three.js, und was three.js braucht, prüft kein Test dieser Suite.
 * Die Zahlen liegen deshalb drüben und stehen dort auf dem Prüfstand; hier
 * liegt nur, was ohne Netz keinen Sinn ergibt.
 *
 * **Warum überhaupt geteilt?** Weil es zwei Aufrufer gibt und beide dasselbe
 * tun: Die Steine am Streckenrand (`kart.ts`) und die Klötze des
 * Sprungkissens (`climb.ts`) holen je ein Regalmodell und machen daraus ein
 * **Bündel** — eine Geometrie, ein Material, Dutzende Instanzen. Ein Helfer,
 * den man in die zweite Datei hineinkopiert, ist beim dritten Aufrufer eine
 * dritte Fassung.
 */

/**
 * **Die gemessene Hülle eines geladenen Modells** — oder `null`, wenn nichts
 * darin ist.
 *
 * Erst `updateMatrixWorld`, dann `Box3`: Die Gruppe aus dem Lader trägt den
 * Maßstab ihres Pakets (`core/kaykitFit.kaykitScale`), und ohne den Durchgang
 * misst man die Datei und nicht das Ding, das gleich in der Welt steht.
 * Dieselbe Reihenfolge wie an der Druckplatte (`worlds/grid/fixtures/plate.ts`,
 * „Erst hängen, dann messen").
 */
export function propMeasure(model: THREE.Object3D): PropBox | null {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  if (box.isEmpty()) return null;
  return {
    min: { x: box.min.x, y: box.min.y, z: box.min.z },
    max: { x: box.max.x, y: box.max.y, z: box.max.z },
  };
}

/**
 * **Das eine Netz mit seinem einen Material** — oder `null`.
 *
 * Ein `InstancedMesh` hat genau **eine** Geometrie und **ein** Material. Ein
 * Modell aus zwei Teilen wären also zwei Bündel, und ein Netz mit einer Liste
 * von Materialien wäre ein drittes Problem; beides ist eine andere Datei als
 * die, die hier gerade geladen wurde. Gesucht wird deshalb nicht das erste
 * Netz, sondern das **einzige**: Ein `children[0]`, das nach dem nächsten
 * Paket-Update auf ein Zierstück zeigt, wäre eine Bande aus fünfundvierzig
 * Zierstücken (dieselbe Regel wie in `worlds/shared/plateFloor.ts`).
 *
 * Wer `null` bekommt, hat einen Plan dafür: Dann bleibt die gerechnete Form
 * stehen, die ohnehin schon dasteht.
 */
export function propPart(model: THREE.Object3D): { mesh: THREE.Mesh; skin: THREE.Material } | null {
  const found: THREE.Mesh[] = [];
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) found.push(mesh);
  });
  const mesh = found.length === 1 ? found[0]! : null;
  if (!mesh || Array.isArray(mesh.material)) return null;
  return { mesh, skin: mesh.material };
}

/**
 * **Eine eingepasste Kopie der Geometrie** — sie gehört dem Aufrufer und muss
 * von ihm freigegeben werden.
 *
 * Drei Dinge wandern dabei in die Eckpunkte und damit **aus** den Matrizen
 * der Instanzen heraus: der eigene Platz des Netzes in seiner Datei, der
 * Maßstab des Pakets und das Einpassen in den gerechneten Kasten. Was danach
 * je Instanz übrig bleibt, ist eine Drehung und eine Verschiebung — bei
 * fünfundvierzig Steinen und achtundvierzig Klötzen die billigste Rechnung
 * von allen, und dieselbe Überlegung wie beim Plattenboden.
 *
 * **Kopiert und nicht bearbeitet**: Die Geometrie einer Regalkopie gehört der
 * **Vorlage** im Speicher und allen anderen Kopien
 * (`core/kaykitModel.copyOf`, `userData.sharedAssets`). Wer in sie
 * hineinskalierte, verzöge jedes Fass, das irgendwo sonst aus derselben Datei
 * kommt.
 */
export function propShape(mesh: THREE.Mesh, fit: PropFit): THREE.BufferGeometry {
  const shape = mesh.geometry.clone();
  shape.applyMatrix4(mesh.matrixWorld);
  shape.scale(fit.scale.x, fit.scale.y, fit.scale.z);
  shape.translate(fit.shift.x, fit.shift.y, fit.shift.z);
  return shape;
}
