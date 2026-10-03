import * as THREE from 'three';
import { HEADGEAR_KINDS, buildHeadgear, type HeadgearKind } from '../core/headgear';
import { kaykitModelNow } from '../core/kaykitModel';
import { MODEL_HATS, asFace, facePart, isModelHat } from '../core/figureParts';
import { figurePartNow } from '../core/figurePartModels';
import { OUTFIT_PREVIEW } from './outfitMenu';

/**
 * **Das Stück in der Kachel** — die Vorschau-Fabrik für _Aussehen_
 * (`ui/outfitMenu.ts`, `GameMenu.setExtraModels`).
 *
 * Die Figuren kommen aus dem Modellregal (`kaykitModelNow`, `null` heißt
 * „noch nicht"), so wie sie dastehen; die Hüte aus demselben Baukasten wie am
 * Avatar (`buildHeadgear`), in der Anzugfarbe, die auch die Figur daneben
 * trägt. Die Kachel schreibt das Ergebnis ab und skaliert es auf ihre Größe
 * (`menuMiniature`), also wird hier jedes Mal frisch gebaut und nichts
 * gehalten.
 *
 * **Hüte und Köpfe aus dem Regal** kommen wie die Figuren (`figurePartNow`,
 * `null` heißt „noch nicht") und schauen wie diese schon nach +z.
 */
export function outfitModel(id: string): THREE.Object3D | null {
  if (!id.startsWith(OUTFIT_PREVIEW)) return null;
  const rest = id.slice(OUTFIT_PREVIEW.length);
  const cut = rest.indexOf(':');
  if (cut < 0) return null;
  const slot = rest.slice(0, cut);
  const value = rest.slice(cut + 1);
  if (slot === 'figure') return kaykitModelNow(value);
  if (slot === 'face') {
    const part = facePart(asFace(value));
    return part ? figurePartNow(part) : null;
  }
  if (slot === 'hat' && isModelHat(value)) return figurePartNow(MODEL_HATS[value]);
  if (slot !== 'hat' || !HEADGEAR_KINDS.includes(value as HeadgearKind)) return null;
  // _Ohne_ hat kein Modell — die Kachel zeigt dann ihre Ikone.
  const hat = buildHeadgear(value as HeadgearKind);
  return hat ? facing(hat) : null;
}

/**
 * **Mit der Vorderseite zur Kachel.** Ein Hut schaut wie der Avatar nach −z,
 * die Kachel von +z. Gedreht wird ein Kind und nicht die Wurzel: Die Kachel
 * schreibt relativ zur Wurzel ab (`menuMiniature`), deren eigene Drehung fiele
 * dabei weg. Die Figuren aus dem Regal schauen schon nach +z.
 */
function facing(piece: THREE.Object3D): THREE.Object3D {
  const holder = new THREE.Group();
  piece.rotation.y += Math.PI;
  holder.add(piece);
  return holder;
}
