import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KITCHEN_SCALE, type PieceMesh, type PieceStack, kitchenPiece } from './kitchenFit';
import { dinerModel } from './dinerModel';
import { versioned } from './assetVersion';

/**
 * **Die Küchenmöbel als Modell** — aus **zwei** Dateien zusammengesetzt.
 *
 * Bis zum Umbau war das eine Datei und ein Knoten je Möbel. Heute stehen neun
 * der zweiundzwanzig Katalogstücke auf Netzen aus dem zweiten Baukasten
 * (`core/dinerModel.ts`, 146 Stücke aus _Restaurant Bits_), und was hier noch
 * liegt, sind **fünf** Knoten: Feuerlöscher, Mülleimer, Ausgabetheke,
 * Ausgaberegal — und die **Pfanne**, von der nur sie selbst übrig ist
 * (`tools/kitchen-model.mjs --trim`).
 *
 * ## Was dabei weggefallen ist
 *
 * Zwei große Blöcke, und beide waren Notoperationen an einer Quelle, die es
 * nicht mehr gibt:
 *
 * - **`splitSink`** — knapp zweihundert Zeilen Geometriechirurgie
 *   (Kantenschweißen, Zusammenhangssuche, Sutherland-Hodgman-Clipping), die
 *   aus einer Spüle von vier Metern zwei Kacheln schnitt. Der zweite Baukasten
 *   hat eine Spüle von **einer** Kachel; geschnitten wird nichts mehr.
 * - **`erasePrintedPlate`** — ein UV-Flicken, der einen aufgedruckten Teller
 *   von der Ausgabe wegradierte. Die Ausgabe ist heute eine Kiste mit Deckel,
 *   und auf einem Deckel ist nichts aufgedruckt.
 *
 * Geblieben ist der Materialschnitt für das **Gerät** auf einem Möbel
 * (`takeUtensil`) — aber nur noch für den Feuerlöscher: Bei allen anderen sagt
 * der Katalog mit `KitchenPiece.over` ausdrücklich, was obendrauf steht, statt
 * dass der Lader es an einem Materialnamen errät.
 *
 * ## Der Maßstab sitzt weiter am Lader
 *
 * Beide Quellen sind doppelt so groß gebaut, wie sie sein sollen
 * (`KITCHEN_SCALE`, `DINER_SCALE` — dieselbe 0,5, zweimal nachgemessen).
 * Herausgereicht wird deshalb eine **Gruppe in Metern**: Wer sie hinstellt,
 * rechnet nicht mehr um, und was man an sie hängt, steht in Metern der Welt.
 */

/** Wo die Datei liegt: unter uns, nie auf einem fremden Server. */
const KITCHEN_URL = versioned(`${import.meta.env.BASE_URL}models/kitchen.glb`);

let pending: Promise<THREE.Group | null> | null = null;

function template(): Promise<THREE.Group | null> {
  pending ??= new GLTFLoader()
    .loadAsync(KITCHEN_URL)
    .then((gltf) => gltf.scene)
    .catch((error: unknown) => {
      // Einmal sagen, nicht je Möbel: Wer offline baut, soll nicht fünf
      // gleiche Zeilen in der Konsole finden. Ohne Modell bleibt der gebaute
      // Baustein stehen (`worlds/grid/blocks.ts`).
      console.warn(`Küchenmodelle nicht geladen (${KITCHEN_URL}).`, error);
      return null;
    });
  return pending;
}

/** Ein Knoten aus dieser Datei, halbiert — die alte Hälfte des Katalogs. */
async function ownNode(node: string): Promise<THREE.Object3D | null> {
  const source = await template();
  const found = source?.getObjectByName(node);
  if (!found) return null;
  const copy = found.clone(true);
  copy.scale.setScalar(KITCHEN_SCALE);
  copy.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) mesh.castShadow = true;
  });
  return copy;
}

/** Ein Netz, egal aus welcher der beiden Dateien. */
function mesh(from: PieceMesh): Promise<THREE.Object3D | null> {
  return from.file === 'diner' ? dinerModel(from.node) : ownNode(from.node);
}

/**
 * **Ein Möbel aus dem Katalog**, fertig zusammengesetzt und in Metern — oder
 * `null`, wenn eine der beiden Dateien nicht ankam.
 *
 * `null` ist kein Fehlerpfad, sondern der normale Ausgang ohne Netz: Der
 * Aufrufer stellt dann nichts hin und meldet nichts (`zones/kitchen.ts`,
 * `build`). Geometrie und Materialien teilen sich alle Kopien.
 *
 * **Der Aufsatz steht auf `over.at` und nicht auf `deck`.** Beim Herd mit Topf
 * ist `deck` die Fläche, auf die ein Gericht gelegt wird — und das ist der
 * Boden **im Topf**, nicht die Platte, auf der er steht. Zwei Zahlen, die
 * meistens zusammenfallen und beim Topf eben nicht.
 */
export async function kitchenModel(name: string): Promise<THREE.Object3D | null> {
  const piece = kitchenPiece(name);
  if (!piece) return null;

  const base = await mesh(piece.base ?? { file: 'kitchen', node: name });
  if (!base) return null;

  const holder = new THREE.Group();
  holder.name = name;
  holder.add(base);

  const stack = piece.over ?? [];
  for (let i = 0; i < stack.length; i++) {
    const step = stack[i]!;
    const over = await mesh(step);
    if (!over) continue;
    lay(over, step);
    // **Was ganz oben steht, ist das, was man herunternimmt** — wenn das Möbel
    // überhaupt etwas hergibt (`KitchenPiece.holds`). Die Marke sitzt am
    // Objekt und nicht in einer Liste daneben: `takeUtensil` bekommt eine
    // fertige Gruppe in die Hand und nicht ihren Katalogeintrag.
    if (piece.holds && i === stack.length - 1) over.userData.loose = true;
    holder.add(over);
  }
  return holder;
}

/**
 * **Einen Aufsatz auf eine Fläche setzen** — mit seiner **Unterkante** auf
 * `at` und mit seiner **Mitte** über der Kachelmitte.
 *
 * Drei Handgriffe in dieser Reihenfolge, und die Reihenfolge ist die ganze
 * Schwierigkeit:
 *
 * 1. **Drehen** (`PieceStack.tilt`), falls der Katalog es sagt. Das Messer
 *    kommt stehend aus dem Baukasten und soll auf dem Brett liegen.
 * 2. **Messen.** Erst jetzt — die Hülle eines gedrehten Netzes ist eine
 *    andere, und wer vorher misst, legt ein flaches Messer eine halbe
 *    Klingenlänge über das Brett.
 * 3. **Setzen**: Unterkante auf `at`, Hüllenmitte (verschoben um
 *    `PieceStack.hub`) auf `x/z = 0`.
 *
 * **Die Unterkante und nicht der Ursprung**, und das war eine Korrektur: Der
 * erste Anlauf schrieb `over.position.y = at` und war damit bei jedem Netz
 * falsch, das seinen Ursprung nicht auf seinem Boden hat. Topf und Deckel
 * haben ihn dort; die **Pfanne** nicht — sie trägt in ihren Eckpunkten noch
 * die 0,55 m des Herds, auf dem sie in ihrer alten Datei stand.
 *
 * **Die Mitte und nicht der Ursprung**, und das war die zweite: Die Pfanne
 * trägt auch ihren alten Platz **auf** diesem Herd mit sich, und der lag
 * daneben. Ein Aufsatz gehört über die Mitte seiner Kachel; wo bei ihm
 * „Mitte" ist, sagt er selbst (`hub` — bei der Pfanne die Mulde und nicht die
 * Mitte aus Mulde und Stiel).
 */
function lay(over: THREE.Object3D, step: PieceStack): void {
  if (step.tilt) over.rotation.set(step.tilt[0], step.tilt[1], step.tilt[2]);
  over.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(over);
  const [hx, hz] = step.hub ?? [0, 0];
  over.position.set(
    over.position.x - (box.min.x + box.max.x) / 2 - hx,
    over.position.y + step.at - box.min.y,
    over.position.z - (box.min.z + box.max.z) / 2 - hz,
  );
}

/** Den Ursprung einer abgenommenen Gruppe auf ihren eigenen Boden setzen. */
function stand(loose: THREE.Object3D): THREE.Object3D {
  loose.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(loose);
  const holder = new THREE.Group();
  holder.name = `${loose.name || 'utensil'}-lose`;
  loose.position.set(
    loose.position.x - (box.min.x + box.max.x) / 2,
    loose.position.y - box.min.y,
    loose.position.z - (box.min.z + box.max.z) / 2,
  );
  holder.add(loose);
  return holder;
}

/**
 * **Was sich von diesem Möbel herunternehmen lässt** — Topf, Pfanne,
 * Feuerlöscher —, ausgehängt und auf den eigenen Fuß gestellt.
 *
 * Eine Zeile Suche und nicht mehr: Was der Katalog als obersten `over`
 * aufgesetzt hat, trägt eine Marke (`kitchenModel`). **Der Materialschnitt ist
 * weg** — der alte Lader erriet das Gerät am Materialnamen
 * (`Kitchen_Utensils`), weil der erste Baukasten Möbel und Gerät in **einem**
 * Knoten lieferte. Seit auch der Feuerlöscher seinen Hocker verloren hat
 * (`tools/kitchen-model.mjs`, `LOOSE`), gibt es kein solches Möbel mehr.
 *
 * Wer das Gerät nimmt, lässt das Möbel stehen: den leeren Herd, die leere
 * Arbeitsplatte. Genau dafür sind sie getrennt.
 */
export function takeUtensil(model: THREE.Object3D): THREE.Object3D | null {
  const marked = model.children.find((child) => child.userData.loose === true);
  if (!marked) return null;
  marked.removeFromParent();
  return stand(marked);
}
