import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CHEF_PARTS, type ChefPart } from './chefFit';
import { versioned } from './assetVersion';

/**
 * **Der Koch als Modell** — geladen statt gebaut.
 *
 * Bis hierher entstand jede Figur aus Kugeln und Drehformen
 * (`core/avatarLook.ts`), und das war richtig, solange niemand ein Modell
 * hatte: Ein Koch aus Grundkörpern steht in derselben Sekunde da wie der Rest
 * der Welt, und niemand muss eine Datei pflegen. Zwei Anläufe später stand
 * fest, dass die letzten zwanzig Prozent Ähnlichkeit so nicht zu holen sind —
 * ein Modellierer, der weiß, was er tut, macht in einer Stunde, wofür
 * `BARREL`-Kurven einen Tag brauchen und dann nach Kegel aussehen.
 *
 * Also: **„Little Chef (Overcooked like)" von marcelosants**, CC-BY-4.0
 * (`public/models/CREDITS.md`). Aufbereitet von `tools/chef-model.mjs` —
 * dort steht, was mit der Quelle geschieht und warum. Hier steht nur, wie das
 * Ergebnis in die Szene kommt.
 *
 * **Die prozedurale Figur bleibt**, und zwar nicht aus Nostalgie: Das Modell
 * kommt über das Netz und ist erst ein paar Bilder später da; ohne Netz (oder
 * im Test, wo es kein WebGL gibt) kommt es nie. Bis dahin — und notfalls für
 * immer — steht die gebaute Figur. Niemand soll vor einem unsichtbaren
 * Mitspieler stehen, weil eine Datei fehlt. Dasselbe Muster wie bei den
 * Controllern (`core/ControllerModels.ts`).
 */

/** Wo das Modell liegt: unter uns, nie auf einem fremden Server. */
const CHEF_URL = versioned(`${import.meta.env.BASE_URL}models/chef.glb`);

/**
 * Die Materialien, die eine Figur **für sich allein** braucht, weil sie ihre
 * Farbe trägt. Alles andere (Mütze, Nase, Augen) ist bei allen gleich und
 * wird geteilt — ein Material je Farbe, nicht eines je Spieler.
 */
const OWN_MATERIALS = new Set(['Clothe', 'Skin']);

export interface ChefParts {
  /** Ein frisches Exemplar je Teil — bereits mit eigenen Materialien. */
  parts: Record<ChefPart, THREE.Object3D>;
  /** Die Jacke dieser Figur: Farbe der Rolle. */
  jacket: THREE.MeshStandardMaterial;
  /** Haut und Hände dieser Figur: Hautton. */
  skin: THREE.MeshStandardMaterial;
}

let pending: Promise<THREE.Group | null> | null = null;

/**
 * Lädt das Modell **einmal** und gibt danach immer dieselbe Vorlage zurück.
 * `null`, wenn es nicht geht — dann bleibt die gebaute Figur stehen, und das
 * ist kein Fehlerfall, sondern der Rückfall.
 */
function template(): Promise<THREE.Group | null> {
  pending ??= new GLTFLoader()
    .loadAsync(CHEF_URL)
    .then((gltf) => gltf.scene)
    .catch((error: unknown) => {
      // Einmal sagen, nicht je Figur: Wer offline spielt, soll nicht vier
      // gleiche Zeilen in der Konsole finden.
      console.warn(`Kochmodell nicht geladen (${CHEF_URL}) — gebaute Figur bleibt.`, error);
      return null;
    });
  return pending;
}

/**
 * **Ein eigenes Exemplar der Figur.**
 *
 * Geometrie wird geteilt (`clone` lässt sie stehen), Materialien nur dort, wo
 * alle dieselben tragen. Die beiden, die eine Figur für sich braucht, kommen
 * als eigene zurück — wer sie einfärbt, färbt niemanden sonst ein.
 */
export async function chefParts(): Promise<ChefParts | null> {
  const source = await template();
  if (!source) return null;

  const owned = new Map<string, THREE.MeshStandardMaterial>();
  const parts = {} as Record<ChefPart, THREE.Object3D>;

  for (const name of CHEF_PARTS) {
    const found = source.getObjectByName(name);
    if (!found) {
      console.warn(`Kochmodell: Teil „${name}" fehlt — gebaute Figur bleibt.`);
      return null;
    }
    const copy = found.clone(true);
    copy.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      // Der Körper ist ein Kind des Rigs, und three rechnet seine Hülle dort
      // daneben — dieselbe Zeile wie an der gebauten Figur.
      mesh.frustumCulled = false;
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (!OWN_MATERIALS.has(material.name)) return;
      let own = owned.get(material.name);
      if (!own) {
        own = material.clone();
        owned.set(material.name, own);
      }
      mesh.material = own;
    });
    parts[name] = copy;
  }

  return {
    parts,
    // Fehlt eines der beiden im Modell, tut ein leeres Material niemandem
    // weh — die Figur bleibt, sie lässt sich nur nicht einfärben.
    jacket: owned.get('Clothe') ?? new THREE.MeshStandardMaterial(),
    skin: owned.get('Skin') ?? new THREE.MeshStandardMaterial(),
  };
}
