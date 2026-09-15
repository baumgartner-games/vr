import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KITCHEN_SCALE } from './kitchenFit';

/**
 * **Die Küchenmöbel als Modell** — derselbe Weg wie beim Koch
 * (`core/chefModel.ts`), und aus denselben Gründen.
 *
 * Die Quelle ist „Overcooked Kitchen Assets (Fan Art)" von Arun Kumar S,
 * CC-BY-4.0 (`public/models/CREDITS.md`), aufbereitet von
 * `tools/kitchen-model.mjs`: aus einer Schauraum-Szene mit vier Netzen werden
 * dreizehn einzeln platzierbare Möbel, jedes mit dem Ursprung **auf dem Boden
 * in seiner Mitte** — dorthin stellt das Spiel sie.
 *
 * Was der Katalog an Zahlen hergibt, steht in `core/kitchenFit.ts` und wird
 * hier nicht wiederholt — bis auf eine: Jedes Stück kommt **halbiert** heraus
 * (`KITCHEN_SCALE`). Die Quelle ist doppelt so groß, wie eine Küche neben
 * einem Koch von 1,60 m sein darf, und der Faktor sitzt hier statt in der
 * Datei, weil die fremde Arbeit ist und nicht angefasst wird.
 */

/** Wo die Datei liegt: unter uns, nie auf einem fremden Server. */
const KITCHEN_URL = `${import.meta.env.BASE_URL}models/kitchen.glb`;

let pending: Promise<THREE.Group | null> | null = null;

function template(): Promise<THREE.Group | null> {
  pending ??= new GLTFLoader()
    .loadAsync(KITCHEN_URL)
    .then((gltf) => gltf.scene)
    .catch((error: unknown) => {
      // Einmal sagen, nicht je Möbel: Wer offline baut, soll nicht dreizehn
      // gleiche Zeilen in der Konsole finden. Ohne Modell bleibt der
      // gebaute Baustein stehen (`worlds/grid/blocks.ts`).
      console.warn(`Küchenmodelle nicht geladen (${KITCHEN_URL}).`, error);
      return null;
    });
  return pending;
}

/**
 * **Ein Möbel aus dem Katalog**, als eigenes Exemplar.
 *
 * Geometrie und Materialien werden geteilt — anders als beim Koch trägt hier
 * niemand eine eigene Farbe, und dreizehn Tresen mit dreizehn Kopien
 * derselben Textur wären dreizehnmal derselbe Speicher.
 *
 * `null`, wenn die Datei fehlt oder der Name nicht darin steht. Beides ist
 * kein Fehlerfall: Der Aufrufer baut dann, was er vorher gebaut hat.
 */
export async function kitchenModel(name: string): Promise<THREE.Object3D | null> {
  const source = await template();
  const found = source?.getObjectByName(name);
  if (!found) return null;
  const copy = found.clone(true);
  // **Halbiert, und zwar hier.** Ein Aufrufer, der das selbst täte, wäre ein
  // Aufrufer, der es beim nächsten Möbel vergisst — und der Katalog daneben
  // nennt schon die halbierten Maße (`core/kitchenFit.ts`).
  copy.scale.setScalar(KITCHEN_SCALE);
  copy.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) mesh.castShadow = true;
  });
  return copy;
}
