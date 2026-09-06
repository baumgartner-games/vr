/**
 * Ob ein losgelassenes Ding noch **im Spieler steckt** — im Rumpf oder in einer
 * Hand.
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
 * Dazu gehören die **Hände**, und zwar aus demselben Grund und mit demselben
 * Recht: die Sonde an der Fingerspitze ist ein fester kinematischer Kasten, der
 * Gegenstände umstoßen soll (`PortalWorld.placeProbe`) — und ein Ding, das man
 * gerade loslässt, steckt per Definition darin. Genau daran flog jeder
 * fallengelassene Gegenstand davon, auch weit weg vom Rumpf: die Kapsel war
 * längst geräumt, die Faust nicht. Die Hand *soll* stoßen, wenn man mit ihr
 * hinlangt; sie soll nichts stoßen, was man eben erst aus ihr entlassen hat.
 *
 * Dass ein Ding dabei einen Augenblick lang durch die eigenen Füße fällt, ist
 * kein Preis, sondern dasselbe Prinzip von der anderen Seite: Ein Ding *in*
 * jemandem darf nie fest sein. Deshalb steht hier auch keine Zeitschranke —
 * eine, die abläuft, während das Ding noch drinsteckt, holt genau den Stoß
 * zurück, um den es hier geht.
 *
 * Gerechnet wird gegen die **Kapsel**, aus der der Spieler besteht: eine Strecke
 * mit einem Radius (`PhysicsLocomotion`), und gegen eine **Kugel** je Hand.
 * Ohne three.js und ohne Rapier, damit die Zahlen einzeln geprüft werden können.
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

/** Eine Hand, so grob, wie ihre Sonde ist: ein Punkt mit einem Radius. */
export interface HandSphere {
  x: number;
  y: number;
  z: number;
  radius: number;
}

/**
 * Alles am Spieler, worin ein Ding stecken kann.
 *
 * `capsule` ist `null`, wo niemand herumläuft (der Zuschauer, ein Test), und
 * `hands` ist dann meist leer — beides zusammen heißt: es gibt nichts, worin
 * etwas stecken könnte, und alles ist sofort frei.
 */
export interface PlayerBody {
  capsule: PlayerCapsule | null;
  hands: readonly HandSphere[];
}

/**
 * Wie viel Luft zwischen Ding und Spieler sein muss, damit es wieder fest wird.
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

/** Dasselbe für eine Hand: zwei Kugeln, ein Abstand. */
export function handOverlap(
  hand: HandSphere,
  point: { x: number; y: number; z: number },
  radius: number,
): number {
  return hand.radius + radius - Math.hypot(point.x - hand.x, point.y - hand.y, point.z - hand.z);
}

/**
 * Wie tief das Ding im Spieler steckt — im Rumpf oder in der Hand, je nachdem,
 * welches von beidem tiefer greift.
 *
 * Ein Spieler ohne Kapsel und ohne Hände ist keiner: dann steckt nichts in
 * nichts, und die Antwort ist `-Infinity` statt einer Null, die für „gerade
 * eben berührt" stünde.
 */
export function bodyOverlap(
  body: PlayerBody,
  point: { x: number; y: number; z: number },
  radius: number,
): number {
  let deepest = body.capsule ? capsuleOverlap(body.capsule, point, radius) : -Infinity;
  for (const hand of body.hands) deepest = Math.max(deepest, handOverlap(hand, point, radius));
  return deepest;
}

/** Ist das Ding weit genug weg, um wieder fest werden zu dürfen? */
export function clearOfPlayer(
  body: PlayerBody,
  point: { x: number; y: number; z: number },
  radius: number,
): boolean {
  return bodyOverlap(body, point, radius) <= -CLEARANCE_MARGIN;
}
