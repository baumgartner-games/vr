import type * as THREE from 'three';
import { GriddleKit } from '../test/zones/kitchenGriddle';

/**
 * **Teile, die nicht aus dem Regal kommen, sondern gebaut sind** — ausdrücklich
 * gewünscht und deshalb eine Ausnahme von der Regel „gebaut wird aus
 * vorhandenen Modellen".
 *
 * Heute genau eines: die **sichere Kochstelle der Sandbox**
 * (`test/zones/kitchenGriddle.GriddleKit`), gewünscht als Möbel: _„Die sichere
 * Kochstelle soll bitte das Model nutzen welches in sandbox Welt genutzt wird
 * bei den Förderbändern … Als Möbel Stück halt nur."_ Das Regal hat nichts
 * Vergleichbares; die Sandbox baut sie aus Kästen und Ringen.
 *
 * Ein Teil nennt so ein Stück mit `built:<name>` statt einer Adresse
 * (`ElementPart.model`); `elementView.placeElement` fragt hier, bevor es das
 * Regal fragt.
 */
export const BUILT_PREFIX = 'built:';

/** Die gebauten Stücke nach Namen — `built:griddle`. */
const BUILDERS: Readonly<Record<string, () => THREE.Object3D>> = {
  griddle: () => (kit ??= new GriddleKit()).piece(),
};

/** Ein Satz Formen und Farben für alle Kochstellen — geteilt, wie in der Sandbox. */
let kit: GriddleKit | null = null;

/** Ob diese Adresse ein gebautes Stück meint. */
export function isBuiltPart(model: string): boolean {
  return model.startsWith(BUILT_PREFIX);
}

/** Das gebaute Stück zu `built:<name>` — `null` für einen unbekannten Namen. */
export function builtPart(model: string): THREE.Object3D | null {
  const build = BUILDERS[model.slice(BUILT_PREFIX.length)];
  return build ? build() : null;
}
