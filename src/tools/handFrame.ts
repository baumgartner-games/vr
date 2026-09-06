/**
 * **Der Rahmen, in dem der Regler schiebt: die echte Hand.**
 *
 * Sechs Zahlen brauchen einen Raum, in dem sie gelten, und die Werkzeugseite
 * hatte davon zwei: in *Hand in VR* stand die Hand im Raum des **Werkzeugs**,
 * in *Hand in echt* das Werkzeug im **Griffraum**. Wer den Regler zog, zog
 * damit je nach Ansicht an anderen Achsen, und an einem schräg gehaltenen
 * Werkzeug an dritten: „X nach rechts" zeigte bei der Taschenlampe dorthin, wo
 * bei der Pistole halb „vorne" war. Keine der beiden Richtungen war die, in
 * der ein Mensch beim Justieren denkt.
 *
 * Es gibt aber eine Richtung, die immer gilt und die man nicht verstellen
 * kann: die der **eigenen Hand**. Sie hält ein Gerät, sie zeigt irgendwohin,
 * und „ein Stück nach rechts" heißt beim Justieren *rechts von ihr aus* — beim
 * Pinsel wie bei der Pistole, in *Hand in VR* wie in *Hand in echt*. Also ist
 * sie der Rahmen für alle sechs Zahlen:
 *
 * - **Ursprung** ist der Griffpunkt, die Mitte der Faust — dort, wo das Gerät
 *   wirklich liegt. Null bleibt damit dasselbe Null wie im Speicher: ein
 *   Werkzeug ohne Versatz sitzt im Griff.
 * - **-Z ist die Blickrichtung der Hand**, also der weiße Zeigestrahl, und
 *   nicht das -Z des Griffraums: die beiden liegen `GRIP_TO_RAY` auseinander,
 *   auf der Quest 30°. Y geht nach oben aus der Faust heraus, X nach rechts,
 *   +Z nach hinten zum Handgelenk. Es sind genau die Achsen des Kreuzes, das
 *   im Bearbeiten-Modus in der Hand steht.
 *
 * Die Umrechnung ist damit **eine einzige Drehung**, und sie hat zwei
 * Richtungen: `inRealHand` liest eine Lage aus dem Griffraum in diesem Rahmen,
 * `fromRealHand` schreibt sie zurück. Gespeichert wird weiter im Griffraum —
 * der Rahmen ist eine **Bedienung** und kein zweiter Zustand daneben, und
 * weder `poseStore` noch `handPoseStore` noch der Kurzcode merken etwas davon.
 *
 * Ohne three.js wie die übrige geprüfte Mathematik der Seite.
 */

import { GRIP_TO_RAY } from '../worlds/portal/tools/gripFit';
import { composePose, invertPose, type Pose } from '../worlds/tune/handGrip';

/**
 * Die echte Hand im Griffraum: am Griffpunkt, gedreht auf den Zeigestrahl.
 *
 * Sie hängt nicht am Werkzeug, auch nicht an dessen `alignToAim`: der Strahl
 * gehört dem **Gerät** in der Faust, nicht dem Ding, das man hineinlegt. Die
 * Seite zeichnet ihn deshalb an jedem Werkzeug mit derselben Zahl
 * (`tools/viewer.ts`, `_aimQuat`), und der Regler schiebt in demselben Rahmen.
 */
export const REAL_HAND: Pose = {
  position: { x: 0, y: 0, z: 0 },
  rotation: GRIP_TO_RAY,
};

/** Eine Lage aus dem Griffraum, gelesen im Rahmen der echten Hand. */
export function inRealHand(pose: Pose): Pose {
  return composePose(invertPose(REAL_HAND), pose);
}

/** Und dieselbe Lage zurück in den Griffraum — die genaue Umkehrung. */
export function fromRealHand(pose: Pose): Pose {
  return composePose(REAL_HAND, pose);
}
