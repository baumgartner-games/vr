import * as THREE from 'three';
import { menuMiniature } from './menuMiniature';

/**
 * **Die ganze Figur in der Kachel** (`ui/menuMiniature.ts`).
 *
 * Gemeldet wurde es als Bild: Im Katalog standen unter _Characters_ vier
 * Kacheln, und in jeder war nur ein **Kopf** zu sehen. Die Ursache liegt zwei
 * Stockwerke tiefer und ist keine Frage des Zuschnitts.
 *
 * Die Dateien der Sammlung sind quantisiert (`tools/kaykit-model.mjs`,
 * `KHR_mesh_quantization`), und bei einem gehäuteten Netz steckt die
 * Rückrechnung dieser Quantisierung **in den Bind-Matrizen des Skeletts**. Wer
 * die Netze abschreibt und dabei aus einem `SkinnedMesh` ein gewöhnliches
 * `Mesh` macht, verliert beides zugleich: Das Bild zeigt die rohen Eckpunkte
 * (je Körperteil auf einen Würfel normiert, also lauter gleich große Klötze
 * übereinander — der Kopf ist der größte), und die Einpassung misst denselben
 * Würfel statt der Figur.
 *
 * Nachgestellt wird das hier mit einem Skelett, das **ungleichmäßig**
 * skaliert: Die rohe Geometrie ist ein Würfel, gehäutet ist sie ein Turm. Die
 * beiden Fassungen lassen sich am Ergebnis unterscheiden, und nur eine davon
 * ist die Figur.
 */
function figure(): THREE.Group {
  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const bone = new THREE.Bone();
  // Der Knochen zieht den Würfel zu einem Turm: 1 × 2,5 × 0,5.
  bone.scale.set(0.5, 1.25, 0.25);
  // **Die Bind-Matrizen sind die Einheit und nicht die Ruhelage**, und genau
  // darin steckt der Fall: In den Dateien der Sammlung trägt diese Matrix die
  // Rückrechnung der Quantisierung. Wer das Skelett dagegen an der aktuellen
  // Lage einmisst (`bind(skeleton)` ohne Matrix), bekommt eine Häutung, die
  // gar nichts tut — dann prüfte dieser Test nichts.
  const skeleton = new THREE.Skeleton([bone], [new THREE.Matrix4()]);

  const count = geometry.getAttribute('position').count;
  geometry.setAttribute(
    'skinIndex',
    new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4),
  );
  const weights = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) weights[i * 4] = 1;
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));

  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
  mesh.add(bone);
  mesh.bind(skeleton, new THREE.Matrix4());

  const holder = new THREE.Group();
  holder.add(mesh);
  holder.updateMatrixWorld(true);
  return holder;
}

function sizeOf(object: THREE.Object3D): THREE.Vector3 {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
}

/**
 * Die Kantenlängen der eingepassten Miniatur — **ohne** die Kippung nach
 * vorn. Die ist eine Sache für sich (`PREVIEW_TILT`, eine reine Seitenansicht
 * macht aus jedem Ding einen Strich) und würde hier nur y und z vermischen.
 */
function fitted(source: THREE.Object3D): THREE.Vector3 {
  const holder = menuMiniature(source, 1);
  (holder.children[0] as THREE.Object3D).rotation.x = 0;
  return sizeOf(holder);
}

describe('Ein Modell in der Menükachel', () => {
  it('passt eine Figur in ihren wirklichen Maßen ein — und nicht als Würfel', () => {
    const source = figure();
    // Zur Sicherheit: Gehäutet ist das ein Turm und nicht der Würfel, der in
    // der Datei steht. Stimmt das nicht mehr, prüft der Rest nichts.
    expect(sizeOf(source).y / sizeOf(source).x).toBeCloseTo(2.5, 5);

    const size = fitted(source);
    // Auf die längste Kante normiert: 0,4 × 1 × 0,2. Ein abgeschriebener
    // Würfel wäre 1 × 1 × 1 — die Figur, die man nicht mehr erkennt.
    expect(size.y).toBeCloseTo(1, 5);
    expect(size.x).toBeCloseTo(0.4, 5);
    expect(size.z).toBeCloseTo(0.2, 5);
  });

  it('bleibt dabei ein gehäutetes Netz am selben Skelett', () => {
    const source = figure();
    const mine = source.children[0] as THREE.SkinnedMesh;
    let copy: THREE.SkinnedMesh | null = null;
    menuMiniature(source, 1).traverse((object) => {
      if ((object as THREE.SkinnedMesh).isSkinnedMesh) copy = object as THREE.SkinnedMesh;
    });
    // Ein gewöhnliches `Mesh` zeichnete die rohen Eckpunkte — das war der
    // Fehler. Das Skelett wird dabei **geteilt**: Die Kachel zeigt das Ding so,
    // wie es dasteht, und will es nicht anders bewegen als die Vorlage.
    expect(copy).not.toBeNull();
    expect(copy!.skeleton).toBe(mine.skeleton);
    expect(copy!.bindMatrix.equals(mine.bindMatrix)).toBe(true);
    // **Abgelöst**: Angeheftet rechnete die Häutung ihre Umkehrmatrix bei
    // jedem Bild aus der Weltmatrix der Kopie — und die trägt in einer Kachel
    // den Maßstab der Kachel. Die Figur schrumpfte dadurch auf einen Punkt,
    // und die Kachel blieb leer.
    expect(copy!.bindMode).toBe('detached');
  });

  it('lässt alles ohne Skelett so, wie es war', () => {
    const holder = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 2), new THREE.MeshStandardMaterial());
    holder.add(mesh);
    const size = fitted(holder);
    expect(size.x).toBeCloseTo(1, 5);
    expect(size.y).toBeCloseTo(0.25, 5);
    expect(size.z).toBeCloseTo(0.5, 5);
  });

  it('kommt mit einem leeren Knoten zurecht', () => {
    expect(() => menuMiniature(new THREE.Group(), 1)).not.toThrow();
  });
});
