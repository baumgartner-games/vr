import type * as THREE from 'three';
import { kaykitModel } from '../../core/kaykitModel';
import { kitchenModel, takeUtensil } from '../../core/kitchenModel';
import { KITCHEN_PAN } from './itemModels';

/**
 * **Ein Bild der Küche laden** — die eine Stelle, die die Adressen aus
 * `itemModels.ts` versteht: eine Datei aus dem Regal, oder die Pfanne der
 * Sandbox-Küche (`KITCHEN_PAN`), abgenommen von ihrem Herd wie dort
 * (`kitchenModel.takeUtensil`). Die Welt (`TestRestaurantWorld.template`) und
 * die Kacheln des Möbelkatalogs (`PortalWorld.elementPreview`) laden damit.
 *
 * Eine eigene Datei, weil beide Lader three.js-Dateien holen und in Jest nicht
 * laufen; die Rechnung daneben (`dishView.ts`, `elementView.ts`) bleibt so
 * prüfbar.
 */
export function loadItemModel(path: string): Promise<THREE.Object3D | null> {
  if (path !== KITCHEN_PAN) return kaykitModel(path);
  return kitchenModel('stove-pan').then((model) => (model ? takeUtensil(model) : null));
}
