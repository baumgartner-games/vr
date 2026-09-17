import * as THREE from 'three';
import { deniesShadow, denyShadow } from '../../../core/graphicsScene';

/**
 * **Aus vielen aufgemalten Teilen ein Netz** — der Zeichenaufruf ist die
 * teure Einheit, nicht das Dreieck.
 *
 * Ein Kopierer der Küche besteht aus dreißig Netzen und zeichnet damit
 * fünfhundert Dreiecke: zweiundzwanzig davon sind **Zeichen** — Bühnenleisten,
 * Zielrahmen, die Spitzen der Spur —, jedes ein eigener Aufruf an die
 * Grafikkarte für ein Rechteck. Gemessen sind das in der teuersten
 * Blickrichtung sechzig Aufrufe für zwei Geräte (`npm run perf:kitchen`,
 * AGENTS.md _Die Messstrecke der Küche_). In der Brille zählt jeder davon
 * doppelt, weil jedes Auge ihn einzeln bezahlt.
 *
 * Was hier steht, ist deshalb **nur die Rechnung** und kein Bausatz: Wer
 * verschmilzt, entscheidet der Bausatz (`kitchenDesk.ts`), und er legt das
 * Ergebnis in seinen Formen-Cache — zwei Kopierer teilen sich ein verschmolzenes
 * Netz genauso wie vorher ihre einzelnen.
 *
 * **Warum nicht `BufferGeometryUtils.mergeGeometries`.** Das ist die
 * naheliegende Antwort und hier keine: `three/examples/jsm` ist ein ES-Modul,
 * und `jest.config.cjs` übersetzt nur `.ts` — ein Import davon legt jede Suite
 * lahm, die den Bausatz baut. Dreißig Zeilen eigene Rechnung sind billiger als
 * eine Jest-Konfiguration, die alle dreihundert Suiten mitträgt.
 *
 * **Was hier bewusst fehlt:** Gruppen und Materiallisten. Verschmolzen wird
 * **je Material**, also kommt aus jedem Aufruf ein Netz mit genau einem
 * Material heraus. Ein Netz mit `geometry.groups` und einer Materialliste wäre
 * dasselbe in teurer: Es zeichnet wieder je Gruppe einen Aufruf, und die Stelle,
 * die Kopien einfärbt (`kitchen.showCopy`), müsste beide Fälle können.
 */

/**
 * Verschmilzt die Netze zu **einer** Geometrie, in den Koordinaten ihres
 * gemeinsamen Elternknotens.
 *
 * `null` heißt „geht nicht, nimm die Einzelteile": zu wenige Teile, oder ihre
 * Attribute passen nicht zusammen. Das ist kein Fehlerfall, sondern die
 * Antwort — eine Spitze der Spur trägt kein `uv`, ein Quader schon, und die
 * beiden zusammenzurechnen ergäbe ein Netz mit Löchern in der Textur.
 *
 * Die Matrix jedes Teils wird **eingebacken**: Was danach herauskommt, steht
 * an derselben Stelle wie vorher, und das verschmolzene Netz selbst sitzt auf
 * dem Ursprung.
 */
export function mergeMeshes(parts: readonly THREE.Mesh[]): THREE.BufferGeometry | null {
  if (parts.length < 2) return null;

  const first = parts[0]!.geometry;
  const names = Object.keys(first.attributes).sort();
  if (!names.includes('position')) return null;
  for (const part of parts) {
    const keys = Object.keys(part.geometry.attributes).sort();
    if (keys.length !== names.length) return null;
    if (keys.some((key, index) => key !== names[index])) return null;
    for (const name of names) {
      if (part.geometry.attributes[name]!.itemSize !== first.attributes[name]!.itemSize)
        return null;
    }
  }

  // **Die Matrix muss stimmen, bevor sie eingebacken wird.** three rechnet sie
  // erst beim Zeichnen aus `position`/`quaternion`/`scale` zusammen; ein Teil,
  // das gerade erst gesetzt wurde, trägt noch die Einheitsmatrix — und alle
  // Teile lägen übereinander auf dem Ursprung. Wer seine Matrix selbst setzt
  // (`matrixAutoUpdate = false`), behält sie.
  for (const part of parts) if (part.matrixAutoUpdate) part.updateMatrix();

  const merged = new THREE.BufferGeometry();
  const normal = new THREE.Matrix3();
  const vector = new THREE.Vector3();
  let vertices = 0;
  for (const part of parts) vertices += part.geometry.attributes.position!.count;

  for (const name of names) {
    const size = first.attributes[name]!.itemSize;
    const values = new Float32Array(vertices * size);
    let at = 0;
    for (const part of parts) {
      const source = part.geometry.attributes[name]!;
      // Position und Normale wandern mit dem Teil, alles andere (uv) nicht.
      const moves = name === 'position';
      const turns = name === 'normal';
      if (turns) normal.getNormalMatrix(part.matrix);
      for (let i = 0; i < source.count; i++) {
        if (moves || turns) {
          vector.fromBufferAttribute(source as THREE.BufferAttribute, i);
          if (moves) vector.applyMatrix4(part.matrix);
          else vector.applyMatrix3(normal).normalize();
          values[at] = vector.x;
          values[at + 1] = vector.y;
          values[at + 2] = vector.z;
        } else {
          for (let c = 0; c < size; c++) values[at + c] = source.getComponent(i, c);
        }
        at += size;
      }
    }
    merged.setAttribute(name, new THREE.BufferAttribute(values, size));
  }

  // **Der Index wird versetzt fortgeschrieben**, und ein Teil ohne Index
  // bekommt hier einen: Gemischt ginge es nicht, und ein Index ist billiger als
  // die dreifache Zahl an Eckpunkten.
  const index: number[] = [];
  let offset = 0;
  for (const part of parts) {
    const geometry = part.geometry;
    const count = geometry.attributes.position!.count;
    if (geometry.index) {
      for (let i = 0; i < geometry.index.count; i++) index.push(offset + geometry.index.getX(i));
    } else {
      for (let i = 0; i < count; i++) index.push(offset + i);
    }
    offset += count;
  }
  merged.setIndex(index);
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

/**
 * **Das verschmolzene Netz an die Stelle der Einzelteile.**
 *
 * Es erbt Material und Behandlung vom ersten Teil — und zwar ausdrücklich,
 * denn nichts davon steckt in der Geometrie: `castShadow`, `receiveShadow`,
 * `renderOrder` und ein leeres `raycast` sind Eigenschaften des Netzes. Wer
 * das vergisst, bekommt Zeichen, die plötzlich Schatten werfen und Strahlen
 * fangen.
 *
 * Die Geometrie kommt von außen (`shape`), weil sie in den Cache des Bausatzes
 * gehört: Zwanzig Kopierer teilen sich eine.
 */
export function mergedMesh(
  geometry: THREE.BufferGeometry,
  parts: readonly THREE.Mesh[],
): THREE.Mesh {
  const first = parts[0]!;
  const mesh = new THREE.Mesh(geometry, first.material);
  mesh.castShadow = first.castShadow;
  mesh.receiveShadow = first.receiveShadow;
  mesh.renderOrder = first.renderOrder;
  // **Ein eigenes `raycast` wird mitgenommen, das geerbte nicht.** Ein Zeichen
  // fängt keinen Strahl (`raycast = () => {}`), und das steht als eigene
  // Eigenschaft am Netz; was vom Prototyp kommt, hat das verschmolzene Netz
  // ohnehin. Gebunden, weil eine Methode, die von ihrem Objekt getrennt
  // weitergereicht wird, sonst auf das falsche `this` zeigt.
  const ownCast = Object.getOwnPropertyDescriptor(first, 'raycast')?.value as
    THREE.Mesh['raycast'] | undefined;
  if (ownCast) mesh.raycast = ownCast.bind(mesh);
  // Und das **Nein zum Schatten** — es steht in `userData` und nicht in
  // `castShadow`, denn genau darin besteht es: `applySceneQuality` schaltet
  // `castShadow` wieder an, wenn dort nichts steht (`core/graphicsScene.ts`).
  if (deniesShadow(first)) denyShadow(mesh);
  return mesh;
}
