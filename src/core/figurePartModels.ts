import * as THREE from 'three';
import { canLoadModels } from './chefFit';
import type { FigurePart } from './figureParts';
import { figureBoneName } from './kaykitFigureFit';

/**
 * **Ein Hut oder ein Kopf aus einer Figur des Regals**, als starres Stück im
 * Raum ihres Kopfknochens (`core/figureParts.ts`).
 *
 * Herausgelöst wird so:
 *
 * - Ein **gehäutetes** Teil hängt mit seinem ganzen Gewicht am Knochen
 *   `head`. Was die Grafikkarte daraus macht, ist dann für jede Ecke
 *   `boneInverse · bindMatrix · Ecke` im Raum dieses Knochens — unabhängig
 *   davon, wie der Knochen gerade steht. Genau diese Matrix bekommt das neue,
 *   ungehäutete Netz.
 * - Ein **starres** Teil hängt schon am Knochen (oder darunter); es bekommt
 *   seine Lage relativ zum Knochen.
 *
 * Herein kommt eine Gruppe, deren Ursprung der Kopfknochen ist — +Z vorn, in
 * den Einheiten der Datei. Wer sie an den Kopfknochen einer anderen Figur
 * desselben Skeletts hängt, hat das Stück so auf, wie es auf seiner eigenen
 * sitzt (`AvatarBody`).
 *
 * **Geometrie und Material gehören der Vorlage** im Speicher des Regals
 * (`core/kaykitModel.ts`) und werden geteilt: Jede Kopie trägt
 * `userData.sharedAssets`, und wer aufräumt, hält dort an.
 *
 * Geladen wird hinter `canLoadModels()` und mit dynamischem `import()` — der
 * Lader zieht `GLTFLoader` und `import.meta` mit sich, und beides bringt Jest
 * zum Stehen.
 */

const templates = new Map<string, Promise<THREE.Group | null>>();
const ready = new Map<string, THREE.Group | null>();

function keyOf(part: FigurePart): string {
  return `${part.file}#${part.nodes.join('+')}`;
}

/** **Das Stück, wenn es kommt** — `null`, wenn es nichts wird. */
export async function loadFigurePart(part: FigurePart): Promise<THREE.Group | null> {
  const template = await templateOf(part);
  return template ? copyOf(template) : null;
}

/**
 * **Dasselbe ohne Warten** — für die Kacheln im Menü, die alle halbe Sekunde
 * fragen. `null` heißt hier „noch nicht": Der Aufruf stößt das Laden an.
 */
export function figurePartNow(part: FigurePart): THREE.Group | null {
  const template = ready.get(keyOf(part));
  if (template) return copyOf(template);
  void templateOf(part);
  return null;
}

function templateOf(part: FigurePart): Promise<THREE.Group | null> {
  const key = keyOf(part);
  let pending = templates.get(key);
  if (!pending) {
    pending = canLoadModels() ? build(part) : Promise.resolve(null);
    void pending.then((template) => ready.set(key, template));
    templates.set(key, pending);
  }
  return pending;
}

function copyOf(template: THREE.Group): THREE.Group {
  const copy = template.clone();
  copy.userData = { ...template.userData };
  return copy;
}

async function build(part: FigurePart): Promise<THREE.Group | null> {
  try {
    const { kaykitModel } = await import('./kaykitModel');
    const model = await kaykitModel(part.file);
    if (!model) return null;
    return extract(model, part);
  } catch (error: unknown) {
    console.warn(`Stück aus dem Regal nicht geladen (${part.file}).`, error);
    return null;
  }
}

const _inverse = new THREE.Matrix4();
const _matrix = new THREE.Matrix4();

/**
 * **Die Teile herauslösen** — aus einer frisch geladenen Kopie, die noch
 * nirgends hängt und in ihrer Bindepose steht.
 */
export function extract(model: THREE.Object3D, part: FigurePart): THREE.Group | null {
  const headName = figureBoneName('head');
  const head = model.getObjectByName(headName) ?? model.getObjectByName('head');
  if (!head) return null;
  model.updateMatrixWorld(true);
  _inverse.copy(head.matrixWorld).invert();

  const out = new THREE.Group();
  out.name = `figure-part:${part.nodes.join('+')}`;
  for (const name of part.nodes) {
    const node = model.getObjectByName(name);
    if (!node) continue;
    node.traverse((object) => {
      const source = object as THREE.Mesh;
      if (!source.isMesh) return;
      const skinned = object as THREE.SkinnedMesh;
      if (skinned.isSkinnedMesh) {
        const bones = skinned.skeleton.bones;
        let index = bones.findIndex((bone) => bone.name === headName || bone.name === 'head');
        // Ein Teil an einem anderen Knochen gehört nicht an den Kopf; dann
        // bleibt der erste Knochen, und es sitzt wenigstens irgendwo.
        if (index < 0) index = 0;
        _matrix.copy(skinned.skeleton.boneInverses[index]!).multiply(skinned.bindMatrix);
      } else {
        _matrix.copy(_inverse).multiply(source.matrixWorld);
      }
      const mesh = new THREE.Mesh(source.geometry, source.material);
      mesh.name = source.name;
      _matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
      mesh.castShadow = source.castShadow;
      mesh.receiveShadow = source.receiveShadow;
      out.add(mesh);
    });
  }
  if (out.children.length === 0) return null;
  out.userData.sharedAssets = true;
  return out;
}
