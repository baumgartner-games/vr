import * as THREE from 'three';
import { CONTROLLER_HANDLE } from './controllerGrip';
import type { Handedness } from './XRInput';

/**
 * **Der Handgriff des Controllers als Zylinder** — das Stück Gerät, das
 * wirklich in der Faust liegt.
 *
 * Die Maße stehen in `controllerGrip.ts` und sind aus dem Modell des
 * Herstellers abgelesen; hier wird nur ein Netz daraus. Getrennt von dort,
 * weil jene Datei **ohne three.js** auskommen muss: aus ihr rechnet ein Test
 * die Faust, und der lädt keinen Szenengraphen.
 *
 * **Rot**, und das ist kein Zufall: türkis heißt in diesem Spiel „hier fasst
 * die Hand das *Werkzeug* an" (`core/colors.ts`). Ein Controller ist kein
 * Werkzeug — er ist das Ding, das die echte Hand hält, während die gezeichnete
 * ein Werkzeug hält. Zwei türkise Zylinder nebeneinander wären zwei Griffe
 * desselben Dings; ein roter neben einem grünen sind zwei Dinge.
 *
 * Gebraucht wird er zweimal, und beide Male für dieselbe Frage — „wie liegt
 * das Gerät wirklich in der Hand?": auf der Werkzeugseite unter *Hand in echt*
 * (`tools/viewer.ts`) und an der Wand des Eingaberaums, wenn eine Lage
 * eingefroren wird (`worlds/tune/TuneWorld.ts`).
 */
export const HANDLE_COLOR = 0xe0554a;

export function createControllerHandle(side: Handedness): THREE.Mesh {
  const mirror = side === 'left' ? -1 : 1;
  const { centre, radius, from, to } = CONTROLLER_HANDLE;
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius.y, radius.y, to - from, 20),
    new THREE.MeshStandardMaterial({
      color: HANDLE_COLOR,
      roughness: 0.7,
      emissive: new THREE.Color(HANDLE_COLOR).multiplyScalar(0.18),
    }),
  );
  mesh.name = 'controller-handle';
  // Der Zylinder steht in three.js auf Y; der Handgriff liegt auf Z.
  mesh.rotation.x = Math.PI / 2;
  // Quer flacher als hoch: die Ellipse des echten Griffs.
  mesh.scale.x = radius.x / radius.y;
  mesh.position.set(mirror * centre.x, centre.y, (from + to) / 2);
  return mesh;
}
