import type * as THREE from 'three';

/**
 * **Schilder, auf denen der Strahl aufsetzt** — gewünscht: _„bei schildern
 * z. B. hub world soll auch der kreis wie im menü angezeigt werden"_.
 *
 * Ein Schild ist kein Ziel (`PointerTarget`): Es lässt sich nicht drücken, und
 * ein Strahl, der auf ihm läge, nähme der Hand den Trigger weg
 * (`Pointer.hoveringWith`). Es steht deshalb hier, in einer Liste für sich —
 * der Zeiger endet an ihm und zeigt dort den Ring, wie auf dem Menü
 * (`UIPanel.marker`), und sonst geschieht nichts.
 *
 * Eingetragen wird beim Bauen (`TextPlane`, Option `sign`), ausgetragen beim
 * Wegräumen (`TextPlane.dispose`).
 */
const signs = new Set<THREE.Object3D>();

export function addSign(object: THREE.Object3D): void {
  signs.add(object);
}

export function removeSign(object: THREE.Object3D): void {
  signs.delete(object);
}

export function signList(): ReadonlySet<THREE.Object3D> {
  return signs;
}
