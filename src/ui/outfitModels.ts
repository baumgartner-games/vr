import * as THREE from 'three';
import type { Appearance } from '../core/appearance';
import {
  BODY_KINDS,
  HEAD_KINDS,
  HEAD_RADIUS,
  bodyTrim,
  buildBody,
  buildHead,
  type BodyKind,
  type HeadKind,
} from '../core/avatarLook';
import { HEADGEAR_KINDS, buildHeadgear, type HeadgearKind } from '../core/headgear';
import { cloth } from '../core/chefStyle';
import { CHEF_EYE } from '../core/chefFit';
import { FIGURE_CHEF } from '../core/avatarFigures';
import { kaykitModelNow } from '../core/kaykitModel';
import { OUTFIT_PREVIEW } from './outfitMenu';

/**
 * **Das Stück in der Kachel** — die Vorschau-Fabrik für _Aussehen_
 * (`ui/outfitMenu.ts`, `WristMenus.setExtraModels`).
 *
 * Gebaut wird aus denselben Bausteinen wie der Avatar selbst (`buildHead`,
 * `buildHeadgear`, `buildBody`) und wie das Regal im Kleiderschrank
 * (`worlds/shared/wardrobeRack.ts`); die Figuren kommen aus dem Modellregal
 * (`kaykitModelNow`, `null` heißt „noch nicht"), so wie sie dastehen. Die Kachel schreibt das
 * Ergebnis ab und skaliert es auf ihre Größe (`menuMiniature`), also wird hier
 * jedes Mal frisch gebaut und nichts gehalten.
 *
 * `look` ist der Entwurf: _Ohne_ zeigt den Kopf, den man gerade hat —
 * barhäuptig. Ein Hut trägt die Anzugfarbe, die auch die Figur daneben trägt
 * (`buildHeadgear` ohne Farbe, wie `AvatarBody` ohne `color`).
 */
export function outfitModel(id: string, look: Appearance): THREE.Object3D | null {
  if (!id.startsWith(OUTFIT_PREVIEW)) return null;
  const rest = id.slice(OUTFIT_PREVIEW.length);
  const cut = rest.indexOf(':');
  if (cut < 0) return null;
  const slot = rest.slice(0, cut);
  const value = rest.slice(cut + 1);
  if (slot === 'figure' && value !== FIGURE_CHEF) return kaykitModelNow(value);
  const piece = avatarPiece(slot, value, look);
  return piece ? facing(piece) : null;
}

/**
 * **Mit dem Gesicht zur Kachel.** Der Avatar schaut nach −z, die Kachel von
 * +z — ungedreht zeigte jede Kachel einen Hinterkopf. Gedreht wird ein Kind
 * und nicht die Wurzel: Die Kachel schreibt relativ zur Wurzel ab
 * (`menuMiniature`), deren eigene Drehung fiele dabei weg. Die Figuren aus dem
 * Regal schauen schon nach +z und brauchen das nicht.
 */
function facing(piece: THREE.Object3D): THREE.Object3D {
  const holder = new THREE.Group();
  piece.rotation.y += Math.PI;
  holder.add(piece);
  return holder;
}

function avatarPiece(slot: string, value: string, look: Appearance): THREE.Object3D | null {
  switch (slot) {
    case 'head':
      return HEAD_KINDS.includes(value as HeadKind) ? buildHead(value as HeadKind) : null;
    case 'hat': {
      if (!HEADGEAR_KINDS.includes(value as HeadgearKind)) return null;
      return buildHeadgear(value as HeadgearKind) ?? buildHead(look.head);
    }
    case 'body':
      return BODY_KINDS.includes(value as BodyKind) ? bust(value as BodyKind) : null;
    case 'figure':
      return chef(look);
    case 'look': {
      // Der Koch in einer bestimmten Zusammenstellung (`chefPreview`) — die
      // Id trägt sie mit, damit die Kachel nach einer Wahl ein neues Bild holt.
      const [head, hat, body] = value.split('|') as [HeadKind, HeadgearKind, BodyKind];
      if (!HEAD_KINDS.includes(head) || !HEADGEAR_KINDS.includes(hat) || !BODY_KINDS.includes(body))
        return null;
      return chef({ ...look, head, hat, body });
    }
    default:
      return null;
  }
}

/** Eine Jacke als Büste — gestaucht wie im Regal, sonst ist es ein kopfloser Rumpf. */
function bust(kind: BodyKind): THREE.Object3D {
  const shape = buildBody(kind, cloth(bodyTrim(kind)));
  shape.setHeight(0.62);
  return shape.group;
}

/** Der Koch, so wie man ihn gerade zusammengesetzt hat. */
function chef(look: Appearance): THREE.Object3D {
  const group = new THREE.Group();
  const shape = buildBody(look.body, cloth(bodyTrim(look.body)));
  shape.setHeight(CHEF_EYE - HEAD_RADIUS * 0.86);
  const head = buildHead(look.head);
  head.position.y = CHEF_EYE;
  group.add(shape.group, head);
  const hat = buildHeadgear(look.hat);
  if (hat) {
    hat.position.y = CHEF_EYE;
    group.add(hat);
  }
  return group;
}
