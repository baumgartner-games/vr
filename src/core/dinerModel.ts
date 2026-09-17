import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { DINER_SCALE } from './dinerFit';

/**
 * **Die Möbel der zweiten Küche als Modell** — derselbe Weg wie bei der ersten
 * (`core/kitchenModel.ts`), und mit zwei Unterschieden, die beide an der
 * Quelle liegen.
 *
 * Die Quelle ist „Restaurant Bits" von Kenney, CC0
 * (`public/models/CREDITS.md`), aufbereitet von `tools/diner-model.mjs`: aus
 * 225 Einzeldateien werden 146 Knoten in **einer** Datei, alle auf **einem**
 * Material und **einer** Textur. Der Katalog dazu steht in `core/dinerFit.ts`.
 *
 * **Erstens: die Datei ist gepackt.** 146 Möbel sind roh 3,1 MB, und das ist
 * für ein Spiel, das über GitHub Pages ausgeliefert wird, keine Größe. Mit
 * `EXT_meshopt_compression` sind es 1,06 MB — der Preis dafür ist der
 * Entpacker, und der ist der Grund, warum hier eine Zeile mehr steht als
 * beim ersten Lader. Genommen wird der, der three.js ohnehin beiliegt
 * (`examples/jsm/libs/meshopt_decoder.module.js`, rund 25 KB, von Vite mit
 * gebündelt): kein zweiter Weg in `public/`, keine zweite Datei, die beim
 * Ausliefern vergessen werden kann. Draco hätte die Datei auf gut 600 KB
 * gedrückt — und dafür 250 KB WebAssembly gebraucht, die jemand von Hand nach
 * `public/` legt. Ein halbes Megabyte gespart und ein Auslieferungsfehler
 * mehr möglich ist kein guter Tausch.
 *
 * **Zweitens: hier wird nichts zerschnitten.** Der erste Lader trennt die
 * Spüle in zwei Hälften und radiert einen aufgedruckten Teller weg, weil seine
 * Quelle ein aufgebautes Bild ist. Diese Quelle ist ein Baukasten: Was ein
 * eigenes Möbel sein soll, ist in ihr schon eines. Bleibt der Maßstab
 * (`DINER_SCALE`) — und der sitzt aus demselben Grund wie dort am Lader und
 * nicht in der Datei: Die ist fremde Arbeit und wird nicht angefasst.
 */

/** Wo die Datei liegt: unter uns, nie auf einem fremden Server. */
const DINER_URL = `${import.meta.env.BASE_URL}models/diner.glb`;

let pending: Promise<THREE.Group | null> | null = null;

function template(): Promise<THREE.Group | null> {
  pending ??= new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(DINER_URL)
    .then((gltf) => {
      tuneAtlas(gltf.scene);
      return gltf.scene;
    })
    .catch((error: unknown) => {
      // Einmal sagen, nicht je Möbel: Wer offline baut, soll nicht
      // hundertsechsundvierzig gleiche Zeilen in der Konsole finden. Ohne
      // Modell bleibt die zweite Küche leer, und die Zone verträgt das
      // (`worlds/test/zones/diner.ts`).
      console.warn(`Modelle der zweiten Küche nicht geladen (${DINER_URL}).`, error);
      return null;
    });
  return pending;
}

/**
 * **Der Atlas ist eine Farbtafel und kein Bild** — also wird er auch so
 * gefiltert.
 *
 * Alle 146 Stücke liegen auf **einer** Textur, und die ist kein Foto, sondern
 * eine Tafel aus zweiunddreißig senkrechten Farbverläufen. Eine UV zielt darin
 * auf einen Streifen, nicht auf ein Muster — und genau deshalb tut die
 * übliche Filterung hier weh: Wo eine Arbeitsplatte flach ins Bild läuft,
 * nimmt die Grafikkarte eine gröbere Stufe der Textur, und die hat den
 * Nachbarstreifen schon mit hineingemittelt. Auf dem Bild war das eine
 * Küchenzeile, die an ihrem Ende **violett** wurde: Rot und Blau von links und
 * rechts, zusammengerechnet zu einer Farbe, die es im Atlas gar nicht gibt.
 *
 * Dagegen hilft anisotrope Filterung: Sie mittelt **längs** des Blicks statt
 * über das Quadrat, und quer zu den Streifen bleibt die Farbe damit stehen.
 * Acht ist die Zahl, die jede Brille dieser Klasse kann; three.js begrenzt sie
 * ohnehin auf das, was die Karte hergibt.
 *
 * **Und nicht einfach die Mipmaps aus.** Ohne sie flimmerte dieselbe Platte
 * aus der Entfernung — der Tausch wäre ein Fehler gegen einen anderen.
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
 * Aufrufer stellt dann nichts hin und meldet nichts. Geometrie und Material
 * teilen sich alle Kopien — geklont wird nur der Knoten davor.
 *
 * **Zurück kommt eine Gruppe und nicht das Netz selbst**, und das ist kein
 * Schnörkel, sondern die Lehre aus einem Fehler, den man erst im Bild sah: Ein
 * Hocker war so groß wie eine Kiste, eine Schüssel so groß wie eine Küchenzeile
 * — **alles** war ungefähr gleich groß.
 *
 * Schuld war `EXT_meshopt_compression` zusammen mit der Quantisierung
 * (`tools/diner-model.mjs`). Quantisierte Eckpunkte sind ganze Zahlen von −1
 * bis 1, und wie groß das Stück daraus wird, steht am **Knoten**: Der Hocker
 * trägt `scale 0,375`, die Kiste `scale 1,0`, die Küchenzeile `1,021` — die
 * halbe Kantenlänge der eigenen Hülle. Der erste Anlauf schrieb dort
 * `scale.setScalar(DINER_SCALE)` hinein und **überschrieb damit genau diese
 * Zahl**: Aus 146 verschieden großen Möbeln wurden 146 Würfel von einem Meter,
 * jeder mit dem Bild seines Möbels darauf. Dasselbe noch einmal mit der
 * Verschiebung, die der Knoten ebenfalls trägt.
 *
 * Eine Gruppe darüber löst das ein für alle Mal: Der Knoten behält seine
 * Umrechnung, die Gruppe trägt den Maßstab, und wer das Stück hinstellt, fasst
 * nur die Gruppe an. Wer statt dessen `multiplyScalar` schriebe, träfe
 * dieselbe Falle beim nächsten `position.set`.
 */
export async function dinerModel(name: string): Promise<THREE.Object3D | null> {
  const source = await template();
  const found = source?.getObjectByName(name);
  if (!found) return null;
  const holder = new THREE.Group();
  holder.name = name;
  holder.add(found.clone(true));
  holder.scale.setScalar(DINER_SCALE);
  holder.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) mesh.castShadow = true;
  });
  return holder;
}
