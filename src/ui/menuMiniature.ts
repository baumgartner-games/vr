import * as THREE from 'three';
import { denyOutline, isOutline } from '../core/outlineShell';
import { PREVIEW_TILT } from './previewGrid';

/**
 * **Ein Ding aus der Welt, klein genug für eine Menükachel.**
 *
 * Dieselbe Rechnung braucht jede Bedienfläche, die ein Modell in eine Zeile
 * stellt: das Panel am Handgelenk (`ui/WristMenu.ts`) und das Raster auf der
 * Seite (`ui/PagePreviews.ts`). Sie steht deshalb hier, in einer Datei, die
 * beide holen können.
 *
 * **Und jetzt holt sie auch das Handgelenk.** Dort stand lange eine eigene,
 * wortgleiche Fassung — bis die Figuren zeigten, warum zwei Fassungen einer
 * Rechnung eine zu viel sind: Der Fehler unten steckte in beiden, und er wäre
 * in der Brille ein zweites Mal zu finden gewesen. `ui/WristMenu.ts` ruft
 * jetzt hierher.
 *
 * Abgeschrieben statt geklont: `Object3D.clone()` ruft den Konstruktor der
 * Unterklasse noch einmal auf und baut damit ein ganzes zweites Werkzeug samt
 * seiner Leinwände. Hier werden nur die sichtbaren Netze abgegriffen, mit
 * derselben Geometrie und demselben Material — ein paar Dutzend Zeiger statt
 * ein paar Dutzend Kilobyte, und ein Werkzeug, das im Regal seine Farbe
 * ändert, ändert sie hier gleich mit.
 *
 * Danach wird das Ganze in seinen Mittelpunkt geschoben und auf `size`
 * heruntergerechnet, damit eine Drohne und ein Messer in derselben Zeile
 * gleich groß aussehen.
 *
 * ## Eine Figur wird abgeschrieben — aber als Figur
 *
 * Für alles ohne Skelett stimmt das Abschreiben. Für die 85 Figuren der
 * Sammlung war es der gemeldete Fehler **„in der Kachel steht nur der Kopf"**,
 * und zwar aus einem Grund, den man der Kachel nicht ansieht: Diese Dateien
 * sind quantisiert (`KHR_mesh_quantization`, siehe `tools/kaykit-model.mjs`),
 * und bei einem gehäuteten Netz steckt die Rückrechnung dieser Quantisierung
 * **in den Bind-Matrizen des Skeletts** und nicht im Knoten darüber. Ein
 * `new THREE.Mesh(geometry, material)` erbt von beidem nichts: Es ist kein
 * `SkinnedMesh` mehr, wird also ungehäutet gezeichnet — und zeigt damit die
 * rohen Eckpunkte, die je Körperteil auf einen Würfel von −1 bis 1 normiert
 * sind. Nachgemessen am Ritter: Kopf, Rumpf und Arme lagen alle als Kästen von
 * rund 2,0 Kantenlänge übereinander im Ursprung. Der Kopf ist davon der
 * größte, also sah man den Kopf.
 *
 * **Und die Einpassung log gleich mit.** `Box3.setFromObject` fragt einen
 * `SkinnedMesh` nach seiner gehäuteten Hülle (`SkinnedMesh.boundingBox`), ein
 * gewöhnliches `Mesh` dagegen nach der rohen Geometrie. Gemessen wurden
 * deshalb 2,00 × 2,00 × 1,87 um den Ursprung statt der wirklichen Figur von
 * 1,94 × 2,54 × 1,31, die mit den Füßen auf null steht.
 *
 * **Die Antwort ist trotzdem kein Klon**, sondern dasselbe Abschreiben, nur
 * richtig: Aus einem `SkinnedMesh` wird wieder ein `SkinnedMesh`, und es wird
 * an **dasselbe Skelett** gebunden wie die Vorlage (`bind`, mit deren
 * `bindMatrix`). Damit stimmt das Bild, damit stimmt die Hülle, und es kostet
 * genauso wenig wie vorher — ein paar Zeiger. Ein eigenes Skelett bräuchte
 * nur, wer die Kopie **anders** bewegen will als die Vorlage, und eine Kachel
 * will das nicht: Sie zeigt das Ding so, wie es dasteht. (Wer es doch will,
 * findet den Weg im Lader: `core/kaykitModel.ts`, `SkeletonUtils.clone`.)
 */
export function menuMiniature(source: THREE.Object3D, size: number): THREE.Object3D {
  source.updateMatrixWorld(true);
  const inner = flatCopy(source);

  _box.setFromObject(inner);
  if (!_box.isEmpty()) {
    _box.getCenter(_centre);
    _box.getSize(_size);
    const largest = Math.max(_size.x, _size.y, _size.z, 1e-4);
    inner.position.copy(_centre).multiplyScalar(-1);
    inner.scale.setScalar(size / largest);
    // Der Mittelpunkt sitzt jetzt im Ursprung des inneren Knotens; die
    // Skalierung wirkt danach, also muss die Verschiebung mitskaliert werden.
    inner.position.multiplyScalar(size / largest);
  }

  // Drei Ebenen, und jede hat genau eine Aufgabe: `inner` rückt das Ding in
  // seinen Mittelpunkt und auf Größe, `tilt` kippt es leicht nach vorn (eine
  // reine Seitenansicht macht aus jedem Werkzeug einen Strich), und `holder`
  // dreht sich. Würde `inner` selbst kippen, liefe die Verschiebung durch die
  // Drehung und das Modell eierte um seine eigene Achse.
  const tilt = new THREE.Group();
  tilt.rotation.x = PREVIEW_TILT;
  tilt.add(inner);

  const holder = new THREE.Group();
  holder.name = 'menu-preview';
  holder.add(tilt);
  return holder;
}

/** Die sichtbaren Netze, abgeschrieben — jedes als das, was es ist. */
function flatCopy(source: THREE.Object3D): THREE.Group {
  const inner = new THREE.Group();
  _world.copy(source.matrixWorld).invert();
  source.traverseVisible((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    // Der schwarze Saum aus dem Comic-Modus ist kein Teil des Werkzeugs,
    // sondern ein zweites Bild davon (`core/outlineShell.ts`). Abgeschrieben
    // wäre er in der Menüzeile ein schwarzer Klotz — seine Breite ist für ein
    // Werkzeug in Lebensgröße gerechnet, nicht für vier Zentimeter.
    if (isOutline(mesh)) return;
    const copy = denyOutline(sameKind(mesh)) as THREE.Mesh;
    copy.matrixAutoUpdate = false;
    copy.matrix.multiplyMatrices(_world, mesh.matrixWorld);
    copy.matrixWorldNeedsUpdate = true;
    inner.add(copy);
  });
  return inner;
}

/**
 * **Ein Netz derselben Art** — und für eine Figur heißt das: wieder gehäutet,
 * an demselben Skelett (siehe oben).
 *
 * `frustumCulled` geht dabei aus: Die Hülle, mit der three sonst entscheidet,
 * ob etwas im Bild ist, rechnet es aus der **rohen** Geometrie, und die liegt
 * bei einer quantisierten Figur ganz woanders als die Figur. Eine Kachel, die
 * je nach Blickwinkel leer bleibt, wäre der nächste Fehlerbericht.
 */
function sameKind(mesh: THREE.Mesh): THREE.Mesh {
  const skin = mesh as THREE.SkinnedMesh;
  if (!skin.isSkinnedMesh) return new THREE.Mesh(mesh.geometry, mesh.material);
  const copy = new THREE.SkinnedMesh(skin.geometry, skin.material);
  copy.bind(skin.skeleton, skin.bindMatrix);
  // **Abgelöst und nicht angeheftet**, und das ist die Zeile, ohne die gar
  // nichts zu sehen ist: Ein `SkinnedMesh` in der Vorgabe `attached` rechnet
  // seine `bindMatrixInverse` bei **jedem Bild aus seiner eigenen Weltmatrix**
  // neu (`SkinnedMesh.updateMatrixWorld`). Das stimmt für eine Figur, die dort
  // steht, wo sie eingemessen wurde — hier steht sie aber in einer Kachel, um
  // den Faktor der Kachelbreite skaliert und an deren Stelle geschoben. Die
  // Häutung teilte die Figur dann durch genau diesen Faktor, und in der Kachel
  // blieb ein Punkt von weniger als einem Bildpunkt übrig: eine leere Kachel.
  // `detached` nimmt stattdessen die Umkehrung der Bind-Matrix, und das ist
  // genau die Rechnung, die zur Vorlage gehört.
  copy.bindMode = THREE.DetachedBindMode;
  copy.frustumCulled = false;
  return copy;
}

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _centre = new THREE.Vector3();
const _world = new THREE.Matrix4();
