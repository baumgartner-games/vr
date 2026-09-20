import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { KAYKIT_SCALE } from './kaykitFit';
import type { KaykitIndex } from './kaykitIndex';
import { versioned } from './assetVersion';

/**
 * **Das Regal laden** — der Index einmal, und jedes Modell einzeln, wenn es
 * zum ersten Mal zu sehen ist.
 *
 * Die anderen Kataloge dieses Spiels sind **eine** Datei mit vielen Knoten
 * darin (`core/mixedbagModel.ts`, `core/dinerModel.ts`): aufbereitet,
 * quantisiert, ein Atlas, zwei Materialien. Das Regal ist das Gegenteil und
 * muss es sein — es sind rund 4500 gekaufte Dateien in zwei Dutzend Paketen,
 * und sie werden **nicht angefasst**. Sie liegen so unter `public/`, wie sie
 * gekauft wurden, samt der `LICENSE.txt` ihres Pakets, und `tools/kaykit-model.mjs`
 * schreibt nur auf, was da ist.
 *
 * Daraus folgt alles Weitere:
 *
 * - **Ein Lader je Adresse, nicht je Katalog.** Die Vorlage jeder Datei bleibt
 *   nach dem ersten Laden im Speicher; jede Kopie teilt sich ihre Geometrie.
 * - **Geladen wird erst beim Hinsehen.** Vier Kacheln sind auf einer
 *   Rasterseite zu sehen, also werden vier Modelle geholt — nicht 1588, weil
 *   man einen Ordner aufgeschlagen hat.
 * - **Und der Index erst beim Aufschlagen des Regals** (`loadKaykitIndex`):
 *   Er ist ein paar hundert Kilobyte groß und geht niemanden etwas an, der
 *   heute nur Portale schießen will.
 *
 * ## Warum an diesen Adressen **keine** Build-Nummer steht
 *
 * Alles andere unter `public/` trägt eine (`core/assetVersion.ts`, `versioned`),
 * damit ein geändertes Modell nach einem Deploy auch wirklich ankommt. Hier
 * wäre das falsch, und zwar aus zwei Gründen zugleich:
 *
 * - Diese Dateien **ändern sich nicht**. Sie sind gekauft und liegen fest;
 *   was sich ändert, ist höchstens, dass ein Paket dazukommt — und das hat
 *   dann einen neuen Namen.
 * - Eine Nummer an der Adresse ist für den Speicher ein **neuer Name**. Nach
 *   jedem Deploy wären alle je angesehenen Modelle wieder fremd und müssten
 *   erneut über die Leitung. Bei hunderten kleiner Dateien ist das der
 *   Unterschied zwischen einem Regal, das sich öffnet, und einem, das lädt.
 *
 * Genau so werden auch die Controller-Modelle gehandhabt (siehe
 * `docs/agents/modelle.md`, „Eine Build-Nummer an jeder Adresse"): Der Service
 * Worker wirft beim Aufräumen nur weg, was eine **veraltete** Nummer trägt —
 * was gar keine hat, bleibt liegen (`core/swRoutes.ts`, `dropOldMedia`).
 *
 * Der **Index** trägt sie dagegen, denn er ist erzeugt und ändert sich mit
 * jedem neuen Paket.
 */

/** Wo das Regal liegt — unter uns, nie auf einem fremden Server. */
const KAYKIT_BASE = `${import.meta.env.BASE_URL}models/kaykit/`;

/** Der Index: erzeugt, also mit Build-Nummer. */
const INDEX_URL = versioned(`${KAYKIT_BASE}index.json`);

let indexPending: Promise<KaykitIndex | null> | null = null;

/**
 * **Der Index des Regals**, einmal geholt und dann behalten — oder `null`,
 * wenn es ihn nicht gibt.
 *
 * `null` ist kein Fehlerpfad, sondern der normale Ausgang eines Checkouts
 * ohne die gekauften Pakete: Das Menü sagt dann, dass kein Regal da ist, und
 * sonst passiert nichts. Geworfen wird hier nie.
 */
export function loadKaykitIndex(): Promise<KaykitIndex | null> {
  indexPending ??= fetch(INDEX_URL)
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as KaykitIndex;
    })
    .catch((error: unknown) => {
      // Einmal sagen und nicht je Ordner: Wer ohne die Pakete entwickelt,
      // soll keine Konsole voller gleicher Zeilen finden.
      console.warn(`KayKit-Regal nicht geladen (${INDEX_URL}).`, error);
      return null;
    });
  return indexPending;
}

/**
 * Die Vorlagen, nach Adresse. Der Eintrag ist die **Promise** und nicht das
 * Modell: Wer dieselbe Datei zweimal im selben Bild anfragt — die Kachel im
 * linken und die im rechten Handgelenk —, soll sie nicht zweimal holen.
 */
const templates = new Map<string, Promise<THREE.Object3D | null>>();

/**
 * Was davon schon **fertig** ist. Dieselbe Auskunft wie oben, nur ohne
 * Warten: Die Vorschau im Menü wird je Bild gefragt und kann nicht `await`
 * sagen (`ui/WristMenu.ts`, `MenuModelFactory`).
 */
const ready = new Map<string, THREE.Object3D>();

/**
 * **Ein Modell aus dem Regal**, fertig skaliert — oder `null`, wenn die Datei
 * nicht ankam.
 *
 * Zurück kommt eine **Gruppe** mit dem Maßstab darauf und der Kopie darin,
 * derselbe Griff wie bei der Wundertüte (`core/mixedbagModel.ts`): Der Knoten
 * aus der Datei trägt seine eigene Umrechnung, und wer dort
 * `scale.setScalar(…)` hineinschriebe, machte aus verschieden großen Dingen
 * gleich große.
 */
export async function kaykitModel(path: string): Promise<THREE.Object3D | null> {
  const source = await template(path);
  return source ? copyOf(source, path) : null;
}

/**
 * **Dasselbe ohne Warten** — für alles, was je Bild fragt.
 *
 * `null` heißt hier ausdrücklich **„noch nicht"** und nicht „gibt es nicht":
 * Der Aufruf stößt das Laden an und kommt sofort zurück. Wer `null` bekommt,
 * fragt später wieder — das Menü tut das alle halbe Sekunde, solange die
 * Kachel zu sehen ist. Ein `null`, das zwischengespeichert wird, ist ein Fach,
 * das für immer leer bleibt.
 */
export function kaykitModelNow(path: string): THREE.Object3D | null {
  const source = ready.get(path);
  if (source) return copyOf(source, path);
  // Absichtlich nicht abgewartet: Das Anstoßen *ist* die Antwort.
  void template(path);
  return null;
}

function template(path: string): Promise<THREE.Object3D | null> {
  const known = templates.get(path);
  if (known) return known;
  // Leerzeichen und Klammern in Dateinamen sind in dieser Sammlung normal;
  // die Schrägstriche sind dagegen Teil der Adresse und bleiben stehen.
  const url = KAYKIT_BASE + path.split('/').map(encodeURIComponent).join('/');
  const pending = new GLTFLoader()
    // Wie bei der Wundertüte: Der Entpacker kostet nichts, solange keine
    // Datei komprimiert ist — und er ist der Unterschied zwischen „lädt" und
    // „lädt nicht", sobald doch einmal eine dabei ist.
    .setMeshoptDecoder(MeshoptDecoder)
    // Ohne eigenen `path`/`resourcePath` löst der GLTFLoader externe `.bin`-
    // und Texturdateien **relativ zur Adresse der Datei** auf
    // (`LoaderUtils.extractUrlBase`). Genau das ist hier richtig: Ein Paket
    // bringt seinen `textures/`-Ordner mit, und die `.glb` darin zeigt mit
    // `../textures/…` darauf.
    .loadAsync(url)
    .then((gltf) => {
      tuneTextures(gltf.scene);
      ready.set(path, gltf.scene);
      return gltf.scene as THREE.Object3D;
    })
    .catch((error: unknown) => {
      console.warn(`Modell aus dem Regal nicht geladen (${url}).`, error);
      return null;
    });
  templates.set(path, pending);
  return pending;
}

/**
 * **Eine Kopie der Vorlage**, mit dem Maßstab darüber.
 *
 * Geteilt wird die **Geometrie** — sie ist das Schwere, und hundert Fässer
 * sollen nicht hundertmal im Speicher liegen. Die **Materialien** bekommt
 * jede Kopie dagegen für sich: Wer ein Fass mit dem Pinsel anmalt
 * (`PortalWorld.styleProp`) oder es in die Hand nimmt (der Greif-Schimmer),
 * schreibt in ein Material hinein — und das dürfen nicht alle anderen Fässer
 * und die Vorschau im Menü gleich mit abbekommen. Ein Material ist ein paar
 * Zahlen und ein Zeiger auf die Textur; das kostet nichts.
 */
function copyOf(source: THREE.Object3D, path: string): THREE.Object3D {
  const holder = new THREE.Group();
  holder.name = path;
  // **Hier endet jedes Aufräumen** (`worlds/shared/environment.ts`,
  // `disposeTree`): Die Geometrie darunter gehört der Vorlage und allen
  // anderen Kopien, nicht dieser einen.
  holder.userData.sharedAssets = true;
  const clone = source.clone(true);
  clone.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((material) => material.clone())
      : mesh.material.clone();
    const first = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    // Glas wirft keinen Schatten; alles andere tut es.
    mesh.castShadow = !(first as THREE.MeshStandardMaterial | undefined)?.transparent;
    mesh.receiveShadow = true;
  });
  holder.add(clone);
  holder.scale.setScalar(KAYKIT_SCALE);
  return holder;
}

/**
 * **Die Textur ist eine Farbtafel und kein Bild** — also wird sie auch so
 * gefiltert, mit demselben Griff und aus demselben Grund wie bei den beiden
 * anderen Katalogen (`core/mixedbagModel.ts`, dort steht die lange Fassung):
 * Anisotrope Filterung mittelt **längs** des Blicks statt über das Quadrat,
 * und quer zu den Farbstreifen bleibt die Farbe damit stehen. Ohne sie wird
 * eine flach ins Bild laufende Fläche an ihrem Ende violett — die Mischung
 * zweier Streifen, die es im Atlas nicht gibt.
 *
 * Abgeschrieben und nicht geteilt: Ein Lader weiß je Quelle genau eine Sache,
 * und zwanzig Zeilen zu teilen kostete mehr Gemeinsamkeit, als sie wert sind
 * (dieselbe Begründung steht in `core/mixedbagModel.ts`).
 */
function tuneTextures(scene: THREE.Object3D): void {
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
