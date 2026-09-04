/**
 * Ob ein losgelassenes Ding noch **im Spieler steckt**.
 *
 * Aus dem magischen Beutel kommt ein Objekt genau dort, wo die Hand ist, und
 * eine Hand ist beim Herbeirufen selten weit vom Körper weg. Lässt man dann los,
 * liegt eine Kugel oder eine Pyramide mitten in der Spielerkapsel — und Rapier
 * tut, was ein Physikmotor tun muss: es löst die Durchdringung auf. Bei einem
 * halben Meter Überlappung heißt das in *einem* Schritt, und dann ist die Kugel
 * quer durch die Halle geflogen, bevor man sie fallen sehen konnte.
 *
 * Der Ausweg ist nicht, den Stoß zu dämpfen, sondern ihn nicht entstehen zu
 * lassen: **ein Ding, das im Spieler steckt, ist für den Spieler nicht da.**
 * Solange es getragen wird, ist das längst so (`PhysicsWorld.setCarried`) — neu
 * ist nur, dass es beim Loslassen nicht sofort zurückgeschaltet wird, sondern
 * erst, wenn das Ding wirklich **draußen** ist. Dann fällt es durch den eigenen
 * Körper auf den Boden, statt weggeschossen zu werden, und das ist genau das,
 * was man erwartet.
 *
 * Dass es dabei einen Augenblick lang durch die eigenen Füße fällt, ist kein
 * Preis, sondern dasselbe Prinzip von der anderen Seite: Ein Ding *in* jemandem
 * darf nie fest sein. Deshalb steht hier auch keine Zeitschranke — eine, die
 * abläuft, während das Ding noch drinsteckt, holt genau den Stoß zurück, um den
 * es hier geht.
 *
 * Gerechnet wird gegen die **Kapsel**, aus der der Spieler besteht: eine Strecke
 * mit einem Radius (`PhysicsLocomotion`). Ohne three.js und ohne Rapier, damit
 * die Zahlen einzeln geprüft werden können.
 */

/** Die Spielerkapsel: Mittelpunkt, halbe Achslänge, Radius. In Metern. */
export interface PlayerCapsule {
  x: number;
  y: number;
  z: number;
  /** Halbe Länge der Achse **ohne** die beiden Kugelkappen. */
  halfHeight: number;
  radius: number;
}

/**
 * Wie viel Luft zwischen Ding und Kapsel sein muss, damit es wieder fest wird.
 *
 * Nicht null: bei genau null flackerte der Zustand an der Grenze — ein Ding, das
 * die Kapsel gerade eben verlassen hat, wird fest, wird im nächsten Bild vom
 * Kontakt zurückgestoßen, steckt wieder drin, wird wieder weich. Ein Zentimeter
 * Abstand beendet das, und einen Zentimeter merkt niemand.
 */
export const CLEARANCE_MARGIN = 0.01;

/**
 * Wie tief eine Kugel mit diesem Radius in die Kapsel hineinreicht.
 *
 * Größer als null heißt: sie steckt drin. Kleiner: so viel Luft ist dazwischen.
 * Der Körper wird als Kugel genähert (`halfExtents` als Radius) — großzügig, und
 * großzügig ist hier die richtige Richtung: eine Kiste, die eine Handbreit zu
 * früh fest wird, kann noch stoßen.
 */
export function capsuleOverlap(
  capsule: PlayerCapsule,
  point: { x: number; y: number; z: number },
  radius: number,
): number {
  // Der nächste Punkt auf der Achse: quer bleibt quer, längs wird auf die
  // Strecke beschnitten — damit deckt eine Rechnung beide Kugelkappen mit ab.
  const half = Math.max(0, capsule.halfHeight);
  const dy = Math.min(half, Math.max(-half, point.y - capsule.y));
  const distance = Math.hypot(point.x - capsule.x, point.y - capsule.y - dy, point.z - capsule.z);
  return capsule.radius + radius - distance;
}

/** Ist das Ding weit genug weg, um wieder fest werden zu dürfen? */
export function clearOfPlayer(
  capsule: PlayerCapsule,
  point: { x: number; y: number; z: number },
  radius: number,
): boolean {
  return capsuleOverlap(capsule, point, radius) <= -CLEARANCE_MARGIN;
}
