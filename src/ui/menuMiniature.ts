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
 * **Und das Handgelenk holt sie noch nicht.** `ui/WristMenu.ts` hat seine
 * eigene, wortgleiche Fassung; sie gehört in derselben Sitzung jemand anderem,
 * und eine fremde Datei anzufassen, um eine Zeile zu sparen, ist der Handel
 * nicht wert. Wer als Nächstes dort vorbeikommt, ersetzt die dortige Funktion
 * durch einen Import von hier — sie ist Zeile für Zeile dieselbe.
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
 */
export function menuMiniature(source: THREE.Object3D, size: number): THREE.Object3D {
  const inner = new THREE.Group();
  source.updateMatrixWorld(true);
  _world.copy(source.matrixWorld).invert();
  source.traverseVisible((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    // Der schwarze Saum aus dem Comic-Modus ist kein Teil des Werkzeugs,
    // sondern ein zweites Bild davon (`core/outlineShell.ts`). Abgeschrieben
    // wäre er in der Menüzeile ein schwarzer Klotz — seine Breite ist für ein
    // Werkzeug in Lebensgröße gerechnet, nicht für vier Zentimeter.
    if (isOutline(mesh)) return;
    const copy = denyOutline(new THREE.Mesh(mesh.geometry, mesh.material)) as THREE.Mesh;
    copy.matrixAutoUpdate = false;
    copy.matrix.multiplyMatrices(_world, mesh.matrixWorld);
    copy.matrixWorldNeedsUpdate = true;
    inner.add(copy);
  });

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

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _centre = new THREE.Vector3();
const _world = new THREE.Matrix4();
