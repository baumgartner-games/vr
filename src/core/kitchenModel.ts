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
    .then((gltf) => {
      erasePrintedPlate(gltf.scene);
      return gltf.scene;
    })
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
 * **Der aufgedruckte Teller auf der Ausgabe — weg damit.**
 *
 * Die Ausgabe (`serve-counter`) hat oben eine flache Mulde, und in dieser Mulde
 * ist ein **weißer Teller mit einem Burger darauf** abgebildet. Vor der
 * Salatausgabe lag darum ein Salat auf einem fremden Burger, und die Küche
 * musste das bisher mit einer großen weißen Fläche zudecken
 * (`worlds/test/zones/kitchenIcon.ts`). Jetzt reicht dort ein Kreis, der nur
 * noch 70 % der Kachel breit ist — also muss der Aufdruck wirklich weg.
 *
 * **Und er ist kein Teilnetz.** Das ist die Überraschung an dieser Stelle und
 * der Grund, warum hier eine ganze Erklärung steht: Nachgesehen in
 * `public/models/kitchen.glb` ist `serve-counter` **ein einziges Netz mit einem
 * einzigen Material** (`Kitchen_Cabins`, 448 Ecken, 232 Dreiecke) — es gibt
 * nichts, was man nach Namen ausbauen oder unsichtbar schalten könnte. Der
 * Teller und der Burger sind ein **Bild im Atlas**, und die Mulde besteht aus
 * genau **zwei Dreiecken**, die dieses Bild zeigen.
 *
 * **Also wird umgeklebt statt ausgebaut.** Die vier Ecken dieser beiden
 * Dreiecke bekommen alle dieselbe Texturkoordinate, und zwar eine, die auf das
 * **blanke Holz** am Rand desselben Bildfelds zeigt. Danach ist die Mulde eine
 * einfarbige Holzfläche in genau dem Ton, den sie ringsum ohnehin hat — der
 * Teller ist weg, die Fläche ist noch da, und kein Loch schaut in den Schrank
 * hinein. Ein einziger Punkt statt eines Ausschnitts ist dabei Absicht: Ohne
 * Ableitung in der Fläche nimmt der Renderer die **schärfste** Mipmap, und
 * damit kann von den Nachbarfeldern des Atlas (rot darüber, grün darunter)
 * nichts hereinlaufen.
 *
 * Die Zahlen sind an der Datei abgelesen: Das Bildfeld liegt bei
 * u = 0,827…0,937 und v = 0,496…0,606, das Holz bei u = 0,8379 / v = 0,5059
 * (dort ist die Textur über 5 × 5 Texel praktisch einfarbig, #6f3a15). Das
 * Rechteck unten ist etwas weiter gefasst, damit es die Ecken sicher einschließt
 * — und es fasst trotzdem **nur** diese beiden Dreiecke: Geprüft wird über
 * **alle drei** Ecken eines Dreiecks, und kein anderes Dreieck dieses Möbels
 * liegt vollständig darin.
 *
 * **Einmal an der Vorlage** und nicht je Exemplar: Die Geometrie wird zwischen
 * allen Ausgaben geteilt (`kitchenModel`), und alle wollen dasselbe. Die
 * **Textur** wird dabei nicht angefasst — sie ist fremde Arbeit und gehört
 * dreizehn Möbeln gemeinsam.
 */
const PRINTED_PIECE = 'serve-counter';
const PRINTED_TILE = { u0: 0.82, u1: 0.94, v0: 0.49, v1: 0.61 };
const PRINTED_PATCH = { u: 0.8379, v: 0.5059 };

function erasePrintedPlate(source: THREE.Object3D): void {
  const piece = source.getObjectByName(PRINTED_PIECE);
  if (!piece) return;
  piece.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const uv = mesh.geometry.getAttribute('uv');
    const index = mesh.geometry.getIndex();
    if (!uv || !index) return;
    const shows = (corner: number): boolean => {
      const u = uv.getX(corner);
      const v = uv.getY(corner);
      return (
        u >= PRINTED_TILE.u0 && u <= PRINTED_TILE.u1 && v >= PRINTED_TILE.v0 && v <= PRINTED_TILE.v1
      );
    };
    for (let i = 0; i + 2 < index.count; i += 3) {
      const corners = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      if (!corners.every(shows)) continue;
      for (const corner of corners) uv.setXY(corner, PRINTED_PATCH.u, PRINTED_PATCH.v);
      uv.needsUpdate = true;
    }
  });
}

/**
 * **Das Material der losen Teile** — Topf, Pfanne, Teller, Messer.
 *
 * Die Quelle trennt ihre Netze nach Material (`tools/kitchen-model.mjs`), und
 * genau an dieser Naht liegt der Unterschied zwischen einem Möbel und dem, was
 * darauf steht: `Kitchen_Cabins` ist der Korpus, `Kitchen_Utensils` das Gerät
 * darauf. Ein Herd mit Topf kommt deshalb als **Gruppe aus zwei Netzen** aus
 * der Datei — und deshalb lässt sich der Topf herunternehmen, ohne dass
 * jemand ihn nachbauen müsste.
 */
const UTENSIL_MATERIAL = 'Kitchen_Utensils';

/** Ob dieses Netz zu dem gehört, was auf einem Möbel steht. */
function isUtensil(object: THREE.Object3D): boolean {
  const mesh = object as THREE.Mesh;
  if (!mesh.isMesh) return false;
  const material = mesh.material as THREE.Material | THREE.Material[];
  const one = Array.isArray(material) ? material[0] : material;
  return one?.name === UTENSIL_MATERIAL;
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

/**
 * **Was auf dem Möbel steht — abgenommen.**
 *
 * Gibt das Gerät als eigenes Ding zurück und lässt den leeren Korpus stehen.
 * `null`, wenn dieses Möbel nichts Loses trägt — der Normalfall, und kein
 * Fehler: Ein Unterschrank hat keinen Topf.
 *
 * **Der Ursprung wandert dabei mit nach unten.** In der Datei liegt der Topf
 * dort, wo er auf dem Herd steht — auf 1,10 m in Quellmaß, also einen halben
 * Meter über dem Fuß des Möbels, zu dem er gehörte. Wer ihn so in die Hand
 * nähme, hielte ihn eine Armlänge über der Faust. Er bekommt deshalb hier
 * denselben Ursprung wie jedes Möbel: **auf seinem Boden in seiner Mitte**
 * (`tools/kitchen-model.mjs`). Dafür hängt das Netz in einer Gruppe, die den
 * Versatz trägt und den halben Maßstab gleich mit — eine Geometrie wird nicht
 * verschoben, sie gehört der Vorlage und ist geteilt.
 *
 * **„Seine Mitte" ist dabei die Mitte der ganzen Hülle — mit Griff.** Bei der
 * Pfanne ist das nicht die Mitte der Mulde: Der Stiel zieht die Hülle 22,5 cm
 * zur Seite. Das bleibt hier absichtlich so, denn dieser Ursprung ist auch der
 * Punkt, an dem die Pfanne wieder auf den Herd gestellt wird — verschöbe man
 * ihn, stünde sie danach halb neben der Platte. Wer **in** die Pfanne legt,
 * rechnet den Versatz dazu: `core/kitchenFit.PAN_BOWL`, angewandt in
 * `worlds/test/zones/kitchenProps.FoodKit.topping`.
 */
export function takeUtensil(model: THREE.Object3D): THREE.Object3D | null {
  const parts: THREE.Mesh[] = [];
  model.traverse((object) => {
    if (isUtensil(object)) parts.push(object as THREE.Mesh);
  });
  const part = parts[0];
  if (!part) return null;

  if (!part.geometry.boundingBox) part.geometry.computeBoundingBox();
  const bounds = part.geometry.boundingBox!;
  const centre = bounds.getCenter(new THREE.Vector3());

  const loose = new THREE.Group();
  loose.name = `${part.name || 'utensil'}-lose`;
  // Der Maßstab des Möbels, aus dem es kommt — ein Topf, der beim Umhängen
  // auf die doppelte Größe zurückspränge, wäre ein Topf, in dem der Koch
  // stünde.
  loose.scale.setScalar(KITCHEN_SCALE);
  part.removeFromParent();
  part.position.set(-centre.x, -bounds.min.y, -centre.z);
  part.rotation.set(0, 0, 0);
  part.scale.set(1, 1, 1);
  part.castShadow = true;
  loose.add(part);
  return loose;
}

/**
 * **Wie hoch das Gerät ist**, in Metern — für das, was darunter noch Platz
 * hat, und für die Hand, die es hält.
 */
export function looseHeight(loose: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(loose);
  return Math.max(box.max.y - box.min.y, 0.01);
}
