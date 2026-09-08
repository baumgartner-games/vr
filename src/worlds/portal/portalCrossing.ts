import * as THREE from 'three';

/**
 * **Wann jemand durch ein Portal gegangen ist** — und wie er auf der anderen
 * Seite herausschaut.
 *
 * Zwei Zeilen Rechnung, die an drei Stellen gleich sein müssen: bei den
 * Kisten, bei denen, die herumlaufen, und beim Spieler. Sie stehen hier und
 * nicht in `PortalWorld.ts`, weil man ihnen in der Brille nicht ansieht, was
 * sie falsch machen: Ein Vorzeichen zu viel, und ein Zombie fällt in dem Bild
 * wieder zurück, in dem er herausgekommen ist — hin und her, sechzigmal je
 * Sekunde, bis einer von beiden aufgibt.
 */

/** Was diese Rechnung von einem Portal braucht — mehr nicht (`Portal.ts`). */
export interface PortalFace {
  /** Abstand zur Portalebene, positiv vor dem Portal. */
  signedDistance(point: THREE.Vector3): number;
  /** Ob ein Punkt in der Öffnung liegt; `margin` streckt die Ellipse. */
  isInOpening(point: THREE.Vector3, margin?: number): boolean;
}

/**
 * Wie weit über die Öffnung hinaus ein Durchtritt noch einer ist.
 *
 * Fünf Prozent: Der Durchtrittspunkt ist der eines **Mittelpunkts**, und wer
 * eine Kiste knapp am Rand durchschiebt, hat sie durchgeschoben.
 */
export const CROSS_MARGIN = 1.05;

const _forward = new THREE.Vector3();

/**
 * Ging der Schritt von `from` nach `to` **von vorn nach hinten** durch die
 * Öffnung? Dann steht der Durchtrittspunkt in `target`, sonst kommt `null`.
 *
 * Gerechnet wird der Schnitt der Strecke mit der Ebene und nicht der Endpunkt:
 * Bei 30 Bildern und 8 m/s liegen zwei Bilder 27 cm auseinander, und ein
 * Portal ist nur 4 cm dick gedacht. Wer nur die Endpunkte prüft, verliert
 * jeden, der schnell genug ist — und das sind genau die, die geworfen wurden.
 */
export function crossPoint(
  portal: PortalFace,
  from: THREE.Vector3,
  to: THREE.Vector3,
  target: THREE.Vector3,
  margin = CROSS_MARGIN,
): THREE.Vector3 | null {
  const before = portal.signedDistance(from);
  const after = portal.signedDistance(to);
  // Wer schon dahinter war, geht nicht noch einmal hindurch; wer davor bleibt,
  // ist gar nicht erst durch.
  if (before <= 0 || after > 0) return null;
  target.lerpVectors(from, to, before / (before - after));
  return portal.isInOpening(target, margin) ? target : null;
}

/**
 * Der Gierwinkel, mit dem jemand auf der anderen Seite herauskommt.
 *
 * Der Winkel ist der von three.js — vorne ist -Z (`npc/npcBrain.ts`) —, und
 * gedreht wird er mit demselben `getTraversalMatrix`, das auch den Körper
 * versetzt. Ohne das läuft ein Zombie hinter einem um 90° gedrehten Portal
 * weiter nach Norden statt nach Westen: Er kommt heraus und rennt in die
 * nächste Wand, und man sucht den Fehler in der Wegsuche.
 *
 * **Steht er danach senkrecht, behält er seinen Winkel.** Wer durch ein
 * Bodenportal fällt, dessen Blickrichtung zeigt hinterher in den Himmel; dort
 * gibt es keinen Gierwinkel mehr, und die Rechnung liefert `atan2(0, 0)` —
 * also Norden, für jeden, der je durch einen Boden gefallen ist.
 */
export function yawThrough(yaw: number, transform: THREE.Matrix4): number {
  _forward.set(-Math.sin(yaw), 0, -Math.cos(yaw)).transformDirection(transform);
  if (Math.hypot(_forward.x, _forward.z) < 1e-6) return yaw;
  return Math.atan2(-_forward.x, -_forward.z);
}
