import * as THREE from 'three';
import { isOutline } from '../outlineShell';
import { LAYER_HUD } from '../../ui/ScoreHud';
import { boundsOf, boxOf, classify, type FlatBox, type FlatScan } from './flatModel';

/**
 * **Die Karte von oben aus der Welt lesen.**
 *
 * Jede Welt baut Netze; ein Netz hat eine Hülle; eine Hülle von oben ist ein
 * Rechteck mit einer Höhe. Mehr steckt nicht dahinter — und genau deshalb
 * bekommt **jede** Welt eine Karte, ohne dass jemand für sie eine zeichnet,
 * und ohne dass diese Karte je etwas anderes zeigen kann als das, worin man
 * wirklich steht. Was zu was wird, rechnet `flatModel.ts` aus, und das ohne
 * three.js, damit es ein Test nachrechnen kann.
 *
 * **Nicht auf die Karte gehören die Sachen, die keine Welt sind**: der Spieler
 * selbst und was an ihm hängt (Hände, Menü, Werkzeuge), die Körper der
 * anderen, alles auf der HUD-Schicht, und der schwarze Saum des Comic-Modus —
 * der ist ein zweites Bild desselben Netzes und läge sonst als Klotz daneben.
 *
 * **Einmal lesen, nicht je Bild.** Eine Hülle auszurechnen heißt, die Ecken
 * einer Geometrie durch eine Matrix zu schieben; für ein paar tausend Netze
 * ist das ein Ruckler und für sechzig Bilder je Sekunde eine Diashow. Eine
 * Karte zeigt ohnehin, was steht, und nicht, was sich bewegt: Sie wird beim
 * Betreten gelesen und danach nur auf Ansage neu (`FlatView.rescan`).
 */

/** Woran ein Netz hängt, das nicht zur Welt gehört. */
const IGNORED_NAMES = new Set(['wrist-menus', 'menu-preview', 'player-avatar', 'hand-visuals']);

/**
 * Wie viele Netze höchstens gelesen werden.
 *
 * Ein Deckel, kein Maß: Dust hat ein paar tausend Klötze, und irgendwo muss
 * das Lesen aufhören, bevor es der Sitzung wehtut. Was danach kommt, fehlt auf
 * der Karte — besser als eine Karte, die nie fertig wird.
 */
export const SCAN_LIMIT = 4000;

const _box = new THREE.Box3();

/**
 * Die Welt von oben, gelesen aus dem Szenenbaum.
 *
 * @param root   die Szene.
 * @param skip   Knoten, die nicht dazugehören — der Spieler und sein Zubehör.
 * @param floorY wo der Spieler steht: Der Schnitt der Karte liegt darüber.
 */
export function scanScene(
  root: THREE.Object3D,
  skip: readonly THREE.Object3D[] = [],
  floorY = 0,
): FlatScan {
  const skipped = new Set(skip);
  const boxes: FlatBox[] = [];
  let seen = 0;

  const walk = (object: THREE.Object3D): void => {
    if (seen >= SCAN_LIMIT) return;
    if (!object.visible || skipped.has(object)) return;
    if (IGNORED_NAMES.has(object.name)) return;
    // Die HUD-Schicht hängt an der Kamera und ist keine Welt.
    if (object.layers.isEnabled(LAYER_HUD)) return;

    const mesh = object as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry && !isOutline(mesh)) {
      seen++;
      _box.setFromObject(mesh, true);
      if (!_box.isEmpty()) {
        const hull = {
          minX: _box.min.x,
          minY: _box.min.y,
          minZ: _box.min.z,
          maxX: _box.max.x,
          maxY: _box.max.y,
          maxZ: _box.max.z,
        };
        const kind = classify(hull, floorY);
        if (kind) boxes.push(boxOf(hull, kind, colorOf(mesh)));
      }
    }
    for (const child of object.children) walk(child);
  };

  root.updateMatrixWorld(true);
  for (const child of root.children) walk(child);

  return { boxes: boxes.sort(byArea), bounds: boundsOf(boxes) };
}

/**
 * Große Flächen zuerst: Sie sind der Boden, auf dem alles andere steht, und
 * ein Bodenblech über einem Hallenboden ist eine Platte, kein Loch.
 */
function byArea(a: FlatBox, b: FlatBox): number {
  return b.w * b.d - a.w * a.d;
}

/** Die Farbe des Netzes — oder ein neutrales Grau, wenn es keine hat. */
function colorOf(mesh: THREE.Mesh): string {
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const color = (material as { color?: THREE.Color } | undefined)?.color;
  return color ? `#${color.getHexString()}` : '#6a7488';
}
