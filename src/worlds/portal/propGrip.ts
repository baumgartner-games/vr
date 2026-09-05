import * as THREE from 'three';
import { STANDARD_GRIP_IN_HAND, type GripInHand } from './tools/gripFit';

/**
 * **Ein Griff an einem Beutel-Objekt.**
 *
 * Ein Werkzeug kommt vom Gürtel in die Hand und liegt dort, wie seine
 * Haltung es sagt. Ein Ding aus dem Beutel wird dagegen *angefasst*: die Hand
 * schließt sich dort, wo sie es berührt, und das Ding bleibt so liegen, wie
 * es gerade lag. Für einen Würfel ist das richtig. Für eine Flasche nicht —
 * die fasst man am **Hals**, und wer sie in der Mitte greift, hält sie
 * falsch.
 *
 * Also bekommt ein Beutel-Objekt einen Griff: einen **Zylinder** in seinem
 * eigenen Raum (Mitte und Achse), und beim Zugreifen rastet der Zylinder in
 * die Faust — dieselbe Faust, die den **Standardgriff** hält
 * (`STANDARD_GRIP_IN_HAND`, `GRIP_HAND_POSE`): der Hals steht in der Faust wie
 * ein Pistolengriff, senkrecht aus ihr heraus, und nicht wie der Stiel des
 * Hammers quer durch sie hindurch. Eine Weile war es der Stab, und die Flasche
 * lag damit wie die Taschenlampe in der Hand — auf den Zeigestrahl gerichtet,
 * was bei einer Flasche nichts heißt.
 *
 * **Und ein Zylinder hat kein Oben.** Das ist der Unterschied zu einem
 * Werkzeug: die Flasche lässt sich aufrecht halten und **über Kopf**, wie
 * eine Waffe am Hals gepackt, und welche von beiden Lagen gilt, entscheidet
 * die Hand beim Zugreifen — die Flasche dreht sich in die Lage, die ihrer
 * jetzigen am nächsten liegt. Um die Achse selbst dreht sie sich dabei
 * überhaupt nicht, nur *auf* sie.
 */
export interface PropGrip {
  /** Die Mitte des Griffzylinders, im Raum des Objekts. */
  centre: THREE.Vector3;
  /** Seine Achse, im Raum des Objekts — Länge eins. */
  axis: THREE.Vector3;
}

/** Wo das Objekt in der Hand liegen soll: Lage und Drehung im Griffraum. */
export interface GripSnap {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
}

/**
 * **Die Faust um den Griff**, im Griffraum: die Stelle und die Achse, um die
 * sich die Hand am Standardgriff schließt — Zielkorrektur inklusive, denn so
 * liegt eine Pistole in der Hand, und so soll auch der Hals liegen.
 */
export const GRIP_FIST: GripInHand = STANDARD_GRIP_IN_HAND;

const _axis = new THREE.Vector3();
const _now = new THREE.Vector3();
const _turn = new THREE.Quaternion();

/**
 * Legt den Griff eines Objekts in die Faust.
 *
 * @param current wie das Objekt im Griffraum gerade gedreht ist — davon
 *                bleibt so viel wie möglich: die Achse kippt auf die Faust,
 *                in die nähere der beiden Richtungen, mehr nicht.
 * @param grip    der Zylinder am Objekt
 * @param fist    die Faust, in die er soll; die um den Standardgriff, wenn
 *                nichts anderes gesagt wird
 */
export function snapToGrip(
  current: THREE.Quaternion,
  grip: PropGrip,
  fist: GripInHand = GRIP_FIST,
): GripSnap {
  _axis
    .set(0, 1, 0)
    .applyQuaternion(_turn.set(fist.rotation.x, fist.rotation.y, fist.rotation.z, fist.rotation.w));
  _now.copy(grip.axis).applyQuaternion(current).normalize();
  // Die nähere Richtung: liegt der Hals schon eher nach unten, bleibt er unten.
  if (_now.dot(_axis) < 0) _axis.negate();
  const rotation = _turn.setFromUnitVectors(_now, _axis).multiply(current).normalize();
  const position = new THREE.Vector3(fist.position.x, fist.position.y, fist.position.z).sub(
    grip.centre.clone().applyQuaternion(rotation),
  );
  return { position, rotation: rotation.clone() };
}
