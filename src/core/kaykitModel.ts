import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { kaykitScale } from './kaykitFit';
import { kaykitClipFiles } from './kaykitClips';
import { kaykitPlinth } from './kaykitCrate';
import type { KaykitIndex } from './kaykitIndex';

/**
 * **Das Regal laden** — der Index einmal, und jedes Modell einzeln, wenn es
 * zum ersten Mal zu sehen ist.
 *
 * Die anderen Kataloge dieses Spiels sind **eine** Datei mit vielen Knoten
 * darin (`core/mixedbagModel.ts`, `core/dinerModel.ts`): aufbereitet,
 * quantisiert, ein Atlas, zwei Materialien. Das Regal ist das Gegenteil und
 * muss es sein — es sind rund 4500 Dateien in zwei Dutzend Paketen, und jede
 * bleibt ihre eigene.
 *
 * **Aufbereitet sind sie trotzdem, und zwar alle.** `tools/kaykit-model.mjs`
 * baut jede gekaufte Datei neu: Geometrie verschweißt, doppelte Knoten
 * zusammengelegt, Ungenutztes entfernt, neu sortiert, quantisiert
 * (`KHR_mesh_quantization`) und mit `EXT_meshopt_compression` gepackt — aus
 * 154 MB werden 51. Die Texturen kommen dabei **aus** den Modellen heraus in
 * einen Ordner `<paket>/textures/` je Paket und werden verlustfrei zu WebP,
 * wo das kleiner ist (11,6 MB → 6,2 MB). Die Skelette der Figuren gehen
 * durch dieselben Schritte. Was unverändert bleibt, ist die `LICENSE.txt`
 * jedes Pakets und der Ordnerbaum darunter — die Namen sind die Adressen.
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
 * - Diese Dateien **ändern sich nicht**. Sie werden einmal aufbereitet und
 *   liegen dann fest; was sich ändert, ist höchstens, dass ein Paket
 *   dazukommt — und das hat dann einen neuen Namen.
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
 * ## Und der Index trägt sie seit dem Befund „das Regal lädt ewig" auch nicht
 *
 * Er trug sie, mit der Begründung, dass er erzeugt ist und mit jedem neuen
 * Paket wandert. Das stimmt — und war trotzdem die falsche Antwort, weil eine
 * Nummer an dieser einen Adresse den ganzen Rest wertlos macht: Das Regal
 * macht erst auf, wenn der Index da ist („Lädt …",
 * `PortalWorld.assetMenu`), und mit `?v=` ist er **nach jedem Deploy** ein
 * Name, auf den kein Speicher eine Antwort hat. Dann stehen 215 kB über eine
 * schlechte Leitung zwischen dem Spieler und einem Regal, dessen 4470 Modelle
 * längst im Gerät liegen. Genau so wurde es gemeldet: „lädt ewig lang bei
 * schlechtem Internet, obwohl alle Dateien lokal vorliegen."
 *
 * Ohne Nummer beantwortet ihn der Service Worker wie jede Datei mit festem
 * Namen: **sofort aus dem Speicher, und im Hintergrund nachgesehen**
 * (`core/swRoutes.ts`, `revalidate`). Das Regal geht damit auch im Funkloch
 * auf, und ein neues Paket steht spätestens beim nächsten Start darin — für
 * eine Datei, die nur wächst, ist ein Besuch Verzögerung nichts gegen eine
 * Minute Warten bei jedem Deploy. Wer den Index einmal hatte, wartet nie
 * wieder auf ihn.
 *
 * Dieselbe Regel steht im vollständigen Download (`core/fullDownload.stamped`)
 * — beide müssen dieselbe Adresse meinen, sonst liegt im Speicher etwas, das
 * niemand anfragt.
 */

/** Wo das Regal liegt — unter uns, nie auf einem fremden Server. */
const KAYKIT_BASE = `${import.meta.env.BASE_URL}models/kaykit/`;

/** Der Index: fester Name wie das Regal selbst — siehe oben. */
const INDEX_URL = `${KAYKIT_BASE}index.json`;

let indexPending: Promise<KaykitIndex | null> | null = null;

/**
 * **Der Index des Regals**, einmal geholt und dann behalten — oder `null`,
 * wenn es ihn nicht gibt.
 *
 * `null` ist kein Fehlerpfad, sondern der normale Ausgang eines Checkouts
 * ohne die gekauften Pakete: Das Menü sagt dann, dass kein Regal da ist, und
 * sonst passiert nichts. Geworfen wird hier nie.
 *
 * **Gemerkt wird nur der Erfolg.** Ein Fehlschlag löscht die Zusage wieder,
 * und das nächste Aufschlagen fragt neu: Auf einer schlechten Leitung ist der
 * erste Versuch manchmal einer, der abreißt — wer ihn behielte, hätte ein
 * Regal, das bis zum Neuladen der Seite leer bleibt, obwohl das Netz zwei
 * Sekunden später wieder da ist.
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
      indexPending = null;
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
 * Und die Bewegungen, die in einer Datei lagen — nach Adresse.
 *
 * Fast immer leer: Nachgezählt über die ganze Sammlung tragen **14 von 4470**
 * Dateien eine Animationsspur, und alle vierzehn sind die Bibliotheken unter
 * `character-animations/animations/`. Eine leere Liste ist hier deshalb keine
 * Ausnahme, sondern der Normalfall (siehe `core/kaykitClips.ts`).
 */
const clips = new Map<string, THREE.AnimationClip[]>();

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
  const plinth = kaykitPlinth(path);
  const [source, base] = await Promise.all([
    template(path),
    plinth ? template(plinth) : Promise.resolve(null),
  ]);
  return source ? copyOf(source, path, base) : null;
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
  const plinth = kaykitPlinth(path);
  const source = ready.get(path);
  // **Eine Kiste ist erst fertig, wenn auch ihr Sockel da ist**
  // (`core/kaykitCrate.ts`). Sie ohne ihn herauszugeben hieße, sie im Menü
  // erst eine Handbreit zu tief zu zeigen und beim nächsten Bild zu
  // verschieben — zwei Bilder von derselben Kiste.
  const base = plinth ? (ready.get(plinth) ?? null) : null;
  if (source && (!plinth || base)) return copyOf(source, path, base);
  // Absichtlich nicht abgewartet: Das Anstoßen *ist* die Antwort.
  void template(path);
  if (plinth) void template(plinth);
  return null;
}

/**
 * **Die Bewegungen zu einem Modell** — seine eigenen und, wenn es eine Figur
 * ist, die seines Skeletts.
 *
 * `height` ist die Höhe in den Maßen der **Quelle** und entscheidet, welches
 * der beiden Skelette gemeint ist (`core/kaykitClips.kaykitRigOf`); `null`
 * heißt „keine Figur" — dann kommen nur die Spuren der Datei selbst zurück,
 * und das sind meistens keine.
 *
 * Geworfen wird nie: Eine Bibliothek, die nicht ankommt, ist ein Auswahlfeld
 * ohne Einträge und kein Fehler. Geholt wird sie **einmal je Sitzung** — sie
 * geht durch denselben Zwischenspeicher wie jedes andere Modell des Regals,
 * und der Service Worker beantwortet sie danach sofort (keine Build-Nummer an
 * diesen Adressen, siehe oben).
 */
export async function kaykitClips(
  path: string,
  height: number | null,
): Promise<THREE.AnimationClip[]> {
  const files = [path, ...(height === null ? [] : kaykitClipFiles(height))];
  await Promise.all(files.map((file) => template(file)));
  const out: THREE.AnimationClip[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    for (const clip of clips.get(file) ?? []) {
      // Dieselbe Spur zweimal (beide Bibliotheken bringen eine `T-Pose` mit)
      // wäre zweimal dieselbe Zeile im Auswahlfeld.
      if (seen.has(clip.name)) continue;
      seen.add(clip.name);
      out.push(clip);
    }
  }
  return out;
}

function template(path: string): Promise<THREE.Object3D | null> {
  const known = templates.get(path);
  if (known) return known;
  // Leerzeichen und Klammern in Dateinamen sind in dieser Sammlung normal;
  // die Schrägstriche sind dagegen Teil der Adresse und bleiben stehen.
  const url = KAYKIT_BASE + path.split('/').map(encodeURIComponent).join('/');
  const pending = new GLTFLoader()
    // **Ohne den Entpacker lädt hier gar nichts**: Jede Datei der Sammlung
    // ist mit `EXT_meshopt_compression` gepackt (`tools/kaykit-model.mjs`).
    // Das ist keine Vorsichtsmaßnahme wie bei der Wundertüte, sondern die
    // Bedingung dafür, dass überhaupt ein Netz herauskommt.
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
      clips.set(path, gltf.animations);
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
 * **Eine Kopie der Vorlage**, mit dem Maßstab ihres Pakets darüber
 * (`core/kaykitFit.kaykitScale`).
 *
 * Geteilt wird die **Geometrie** — sie ist das Schwere, und hundert Fässer
 * sollen nicht hundertmal im Speicher liegen. Die **Materialien** bekommt
 * jede Kopie dagegen für sich: Wer ein Fass mit dem Pinsel anmalt
 * (`PortalWorld.styleProp`) oder es in die Hand nimmt (der Greif-Schimmer),
 * schreibt in ein Material hinein — und das dürfen nicht alle anderen Fässer
 * und die Vorschau im Menü gleich mit abbekommen. Ein Material ist ein paar
 * Zahlen und ein Zeiger auf die Textur; das kostet nichts.
 *
 * ## Eine Figur wird anders kopiert als ein Fass
 *
 * `Object3D.clone` kopiert bei einem `SkinnedMesh` **die Knochen nicht mit**:
 * Die Kopie zeigt weiter auf das Skelett der **Vorlage**. Damit hängt jede
 * Figur der Sammlung an einem Skelett, das gar nicht im Raum steht — und weil
 * der Vertex-Shader beim Häuten allein die Knochen fragt, kam der Maßstab
 * dieser Gruppe bei ihr **nie an**. Genau das war der gemeldete Fehler „die
 * Figuren sind doppelt so groß": Ein Ritter stand mit seinen vollen 2,54 m im
 * Raum, während das Fass daneben brav halbiert war.
 *
 * `SkeletonUtils.clone` kopiert Knochen und Bindung mit und ist die einzige
 * richtige Antwort darauf. Es kostet mehr als ein `clone`, deshalb wird es
 * nur gerufen, wo wirklich ein Skelett darin steckt — 85 Figuren unter 4470
 * Dateien.
 */
function copyOf(
  source: THREE.Object3D,
  path: string,
  base: THREE.Object3D | null = null,
): THREE.Object3D {
  const holder = new THREE.Group();
  holder.name = path;
  // **Hier endet jedes Aufräumen** (`worlds/shared/environment.ts`,
  // `disposeTree`): Die Geometrie darunter gehört der Vorlage und allen
  // anderen Kopien, nicht dieser einen.
  holder.userData.sharedAssets = true;
  const clone = freshCopy(source);
  // **Der Sockel unter der Kiste** (`core/kaykitCrate.ts`): Er kommt mit
  // seiner Unterkante auf null, und die Kiste steht auf seiner Oberkante.
  // Gemessen wird am geklonten Netz und nicht am Katalog — der Deckel ist
  // fremde Arbeit, und eine abgeschriebene Höhe von 0,20 Quelleinheiten wäre
  // die Zahl, die beim nächsten Paket-Update stehen bleibt.
  if (base) {
    const plinth = freshCopy(base);
    const box = new THREE.Box3().setFromObject(plinth);
    if (!box.isEmpty()) {
      plinth.position.y -= box.min.y;
      clone.position.y += box.max.y - box.min.y;
    }
    holder.add(plinth);
  }
  holder.add(clone);
  holder.scale.setScalar(kaykitScale(path));
  return holder;
}

/**
 * Eine Kopie mit **eigenen** Materialien und mit Schatten — der Teil von
 * `copyOf`, den eine Kiste zweimal braucht: einmal für sich und einmal für
 * ihren Sockel.
 */
function freshCopy(source: THREE.Object3D): THREE.Object3D {
  const clone = skinned(source) ? cloneSkinned(source) : source.clone(true);
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
  return clone;
}

/**
 * Ob in diesem Baum ein Skelett steckt — die einzige Frage, an der die Art
 * des Kopierens hängt.
 */
function skinned(source: THREE.Object3D): boolean {
  let found = false;
  source.traverse((object) => {
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) found = true;
  });
  return found;
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
