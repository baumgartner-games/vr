import type * as THREE from 'three';

/**
 * **Licht, das an der Wand aufhört.**
 *
 * three.js rechnet ein Licht ohne Schattenkarte in jedem Bildpunkt, den es
 * erreicht — egal, was dazwischen steht. Die Taschenlampe leuchtete so durch
 * die Wand ins Nachbarzimmer, und die Deckenlampe der Station gleich in drei
 * Räume. Gemeldet: _„Licht sollte nicht durch Wände gehen wie bei der
 * Taschenlampe."_ Eine Schattenkarte ist die Antwort, die three.js dafür hat:
 * Was das Licht nicht sieht, beleuchtet es nicht.
 *
 * **Seit Welle 4 nur noch die Taschenlampe**: Die Deckenleuchten der Station
 * haben keine Karte mehr, ihr Licht endet am Rand ihres Raums
 * (`haunting/stationLighting.lampReach`).
 *
 * Klein gehalten, weil es teuer ist: Eine Punktleuchte zeichnet ihre
 * Schattenkarte sechsmal (einmal je Würfelseite). `size` ist die Kantenlänge
 * je Seite. Gezeichnet wird sie nur, wenn die Grafik Schatten erlaubt
 * (`GraphicsQuality`, `renderer.shadowMap.enabled`) — sonst bleibt alles, wie
 * es war.
 *
 * @param near was näher als das an der Lampe ist, wirft keinen Schatten — das
 *             eigene Gehäuse einer Taschenlampe etwa.
 */
export function stopAtWalls(
  light: THREE.PointLight | THREE.SpotLight,
  size: number,
  near = 0.1,
): void {
  light.castShadow = true;
  light.shadow.mapSize.set(size, size);
  light.shadow.bias = -0.002;
  light.shadow.normalBias = 0.02;
  light.shadow.camera.near = near;
  light.shadow.camera.updateProjectionMatrix();
}
