import type * as THREE from 'three';
import {
  infoPartVisible,
  infoView,
  infoViewsVersion,
  type InfoPart,
  type InfoViewId,
  type InfoViewOptions,
} from './infoViews';

/**
 * **Die Darstellungsoptionen an einer gezeichneten Ansicht** — die eine
 * Stelle, an der `infoViews.ts` three.js berührt.
 *
 * Jede Info-Ansicht hat schon eine Gruppe, an der sie hängt (`CellHitboxView`,
 * `navDebugView`, …). Was sie darin zeichnet, markiert sie mit einem **Fach**
 * (`markInfoPart`: Wände, Räume, NPCs, Festes); diese Datei blendet Fächer aus
 * und dämpft die Deckkraft, und zwar für alle auf dieselbe Weise. Umgeschaltet
 * wird die Sichtbarkeit und nicht die Geometrie — dieselbe Regel wie bei den
 * Ebenen der Navigation: Ein Knopfdruck, der ein paar tausend Linien neu baut,
 * ist ein Ruckler.
 */

/**
 * Ordnet ein gezeichnetes Stück einem oder mehreren Fächern zu. Mit mehreren
 * ist es nur zu sehen, wenn **jedes** davon es ist — die betretbare Fläche der
 * Navigation ist ein Raum _und_ etwas Festes, und „Nur 2D-Pfad" lässt sie weg,
 * obwohl die Räume an sind.
 */
export function markInfoPart<T extends THREE.Object3D>(object: T, ...parts: InfoPart[]): T {
  object.userData.infoPart = parts.length === 1 ? parts[0] : parts;
  return object;
}

interface Faded {
  opacity: number;
  transparent: boolean;
  needsUpdate: boolean;
  userData: Record<string, unknown>;
}

/**
 * Wendet Optionen auf einen Baum an: Fächer aus, Deckkraft gedämpft.
 *
 * Die ursprüngliche Deckkraft eines Materials wird beim ersten Mal gemerkt
 * (`userData.infoBaseOpacity`), damit „70 %" immer 70 % der Ansicht von vorher
 * sind und nicht 70 % von 70 % von 70 %. Die Sichtbarkeit einer ganzen Ebene
 * (`visible` der Gruppe selbst) bleibt dem, der sie besitzt; hier werden nur
 * ihre Kinder angefasst.
 *
 * `keep` sagt, ob ein Kind sichtbar sein **darf** — wer (wie die Navigation)
 * eigene Ebenen schaltet, gibt seine Antwort hier herein, damit die beiden
 * Schalter sich nicht gegenseitig überschreiben.
 */
export function applyInfoOptions(
  root: THREE.Object3D,
  options: InfoViewOptions,
  keep: (object: THREE.Object3D) => boolean = () => true,
): void {
  for (const child of root.children) {
    const part = child.userData.infoPart as InfoPart | InfoPart[] | undefined;
    child.visible = keep(child) && infoPartVisible(options, part);
  }
  fadeInfoTree(root, options.opacity);
}

/**
 * Dämpft jedes Material unter einem Knoten auf `factor` seiner ursprünglichen
 * Deckkraft — für Ansichten, deren Kinder ihre Sichtbarkeit selbst verwalten
 * (die Blöcke unter den Figuren, ein Pool von Linien).
 */
export function fadeInfoTree(root: THREE.Object3D, factor: number): void {
  root.traverse((object) => {
    const withMaterial = object as THREE.Object3D & { material?: Faded | Faded[] };
    const materials = withMaterial.material;
    if (!materials) return;
    for (const material of Array.isArray(materials) ? materials : [materials]) {
      fadeInfoMaterial(material, factor);
    }
  });
}

/** Dasselbe für ein einzelnes Material — geteilte Materialien wie die Gitterlinien. */
export function fadeInfoMaterial(material: Faded, factor: number): void {
  const data = material.userData;
  if (typeof data.infoBaseOpacity !== 'number') {
    data.infoBaseOpacity = material.opacity;
    data.infoBaseTransparent = material.transparent;
  }
  const next = (data.infoBaseOpacity as number) * factor;
  const transparent = (data.infoBaseTransparent as boolean) || factor < 1;
  if (material.opacity === next && material.transparent === transparent) return;
  if (material.transparent !== transparent) material.needsUpdate = true;
  material.opacity = next;
  material.transparent = transparent;
}

/**
 * **Nur anwenden, wenn sich etwas geändert hat** — für Ansichten, die jedes
 * Bild ihr `update` bekommen. Die Fassung steht am Baum
 * (`userData.infoViewVersion`, samt der Ansicht, nach der angewandt wurde);
 * eine neu gebaute Gruppe hat keine und wird beim ersten Mal angepasst.
 */
export function syncInfoView(
  root: THREE.Object3D,
  id: InfoViewId,
  keep?: (object: THREE.Object3D) => boolean,
): void {
  const version = `${id}:${infoViewsVersion()}`;
  if (root.userData.infoViewVersion === version) return;
  root.userData.infoViewVersion = version;
  applyInfoOptions(root, infoView(id), keep);
}

/** Vergisst die Fassung — die nächste `syncInfoView` wendet sicher an. */
export function staleInfoView(root: THREE.Object3D): void {
  delete root.userData.infoViewVersion;
}
