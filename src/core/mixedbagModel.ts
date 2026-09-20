import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MIXEDBAG_SCALE } from './mixedbagFit';
import { versioned } from './assetVersion';

/**
 * **Die Stücke der Wundertüte als Modell** — derselbe Weg wie beim zweiten
 * Katalog (`core/dinerModel.ts`), bis in den Entpacker hinein.
 *
 * Die Quelle ist die „Mixed Bag 1" von Kay Lousberg, CC0
 * (`public/models/CREDITS.md`), aufbereitet von `tools/mixedbag-model.mjs`:
 * aus 59 Einzeldateien werden 59 Knoten in **einer** Datei, ein Atlas und
 * zwei Materialien. Der Katalog dazu steht in `core/mixedbagFit.ts`.
 *
 * **Warum das hier trotzdem eine eigene Datei ist und keine zweite Adresse in
 * `dinerModel.ts`.** Weil ein Lader je Quelle genau eine Sache weiß: welche
 * Datei, welcher Maßstab, welche Vorlage schon im Speicher liegt. Zwei Quellen
 * in einem Lader hießen zwei Vorlagen, zwei Maßstäbe und ein `if` in jeder
 * Zeile — und das dritte Mal, wenn eine vierte Quelle dazukommt. Was die
 * beiden wirklich teilen, sind die zwanzig Zeilen weiter unten, und die zu
 * teilen kostete mehr Gemeinsamkeit, als sie wert ist.
 *
 * **Zwei Materialien, und das zweite ist Glas**: die Kuppel des
 * Kaugummiautomaten, die drei Slush-Tanks, die Wasserflasche B
 * (`tools/mixedbag-model.mjs`). Alles andere hängt an dem einen Atlas — auch
 * die Bildschirme der Spielautomaten, deren Platzhaltertextur das Werkzeug
 * durch eine UV auf ein dunkles Feld ersetzt hat.
 */

/** Wo die Datei liegt: unter uns, nie auf einem fremden Server. */
const MIXEDBAG_URL = versioned(`${import.meta.env.BASE_URL}models/mixedbag.glb`);

let pending: Promise<THREE.Group | null> | null = null;

function template(): Promise<THREE.Group | null> {
  pending ??= new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(MIXEDBAG_URL)
    .then((gltf) => {
      tuneAtlas(gltf.scene);
      return gltf.scene;
    })
    .catch((error: unknown) => {
      // Einmal sagen, nicht je Stück: Wer offline baut, soll nicht
      // neunundfünfzig gleiche Zeilen in der Konsole finden. Ohne Modell
      // bleibt die Stelle leer, und die Aufrufer vertragen das — die Küche
      // stellt den Löscher dann gar nicht erst auf
      // (`worlds/test/zones/kitchen.ts`, `build`).
      console.warn(`Modelle der Wundertüte nicht geladen (${MIXEDBAG_URL}).`, error);
      return null;
    });
  return pending;
}

/**
 * **Der Atlas ist eine Farbtafel und kein Bild** — also wird er auch so
 * gefiltert, mit demselben Griff und aus demselben Grund wie beim zweiten
 * Katalog (`core/dinerModel.ts`, dort steht die lange Fassung): Anisotrope
 * Filterung mittelt **längs** des Blicks statt über das Quadrat, und quer zu
 * den Farbstreifen bleibt die Farbe damit stehen. Ohne sie wird eine flach ins
 * Bild laufende Fläche an ihrem Ende violett — die Mischung zweier Streifen,
 * die es im Atlas nicht gibt.
 */
function tuneAtlas(scene: THREE.Object3D): void {
  const done = new Set<THREE.Texture>();
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const map = (material as THREE.MeshStandardMaterial).map;
      if (!map || done.has(map)) continue;
      map.anisotropy = 8;
      map.needsUpdate = true;
      done.add(map);
    }
  });
}

/**
 * **Ein Stück aus dem Katalog**, fertig skaliert — oder `null`, wenn die Datei
 * nicht ankam oder der Name in ihr nicht steht.
 *
 * `null` ist kein Fehlerpfad, sondern der normale Ausgang ohne Netz: Der
 * Aufrufer stellt dann nichts hin und meldet nichts. Geometrie und Materialien
 * teilen sich alle Kopien — geklont wird nur der Knoten davor.
 *
 * **Zurück kommt eine Gruppe und nicht das Netz selbst**, und das ist derselbe
 * Fallstrick wie beim zweiten Katalog: Die Geometrie ist quantisiert
 * (`tools/mixedbag-model.mjs`), ihre Eckpunkte sind ganze Zahlen von −1 bis 1,
 * und wie groß ein Stück daraus wird, steht am **Knoten** — der Becher trägt
 * `scale 0,269`, der Spielautomat `1,262`. Wer dort `scale.setScalar(…)`
 * hineinschriebe, machte aus neunundfünfzig verschieden großen Dingen
 * neunundfünfzig gleich große Würfel. Die Gruppe darüber trägt den Maßstab,
 * der Knoten behält seine Umrechnung.
 *
 * **Glas wirft keinen Schatten.** Alles andere tut es; eine durchsichtige
 * Kuppel, die einen schwarzen Fleck auf den Boden malt, ist kein Glas mehr,
 * sondern ein Deckel.
 */
export async function mixedbagModel(name: string): Promise<THREE.Object3D | null> {
  const source = await template();
  const found = source?.getObjectByName(name);
  if (!found) return null;
  const holder = new THREE.Group();
  holder.name = name;
  holder.add(found.clone(true));
  holder.scale.setScalar(MIXEDBAG_SCALE);
  holder.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const first = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    mesh.castShadow = !first?.transparent;
  });
  return holder;
}
