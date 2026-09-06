/**
 * **Wie die echte Hand auf der Werkzeug-Bühne steht — bei jedem Werkzeug
 * gleich.**
 *
 * Auf der Werkzeugseite stand lange das **Werkzeug** aufrecht in seinem eigenen
 * Raum, und die Hand lag daran, wie dieses Werkzeug eben gehalten wird. Damit
 * brachte jede Seite ihre eigene Schräge mit: an der Pistole zeigte die Hand
 * waagerecht nach vorn und die Zielscheibe stand ordentlich daneben, an der
 * Taschenlampe zeigte dieselbe Hand 30° in den Boden und die Scheibe rutschte
 * mit ihr schräg nach unten aus der Mitte. Wer zwei Werkzeuge vergleichen
 * wollte, verglich zuerst zwei Schrägen.
 *
 * Dabei ist die Hand das Einzige, was an allen Werkzeugen dasselbe ist: sie
 * hält ein Gerät, sie zeigt irgendwohin, und das tut sie an der Taschenlampe
 * genau wie an der Pistole. Also steht sie und nicht das Werkzeug. Die Bühne
 * wird so gedreht, dass der **Rahmen der echten Hand** (`handFrame.ts`) auf
 * jeder Seite dieselbe Lage bekommt — der Zeigestrahl läuft in der
 * Ausgangsansicht **waagerecht quer durchs Bild** auf die Scheibe.
 *
 * Das Werkzeug liegt darin, wie es liegt. Dass die Taschenlampe dabei an der
 * Scheibe vorbeisieht, ist keine schiefe Ansicht mehr, sondern die Auskunft:
 * **so hält man sie** — quer zur Zielrichtung der Hand. Genau das soll man
 * sehen.
 *
 * Gedreht wird die **ganze Bühne** und nur sie: Werkzeug, Hand, Zylinder,
 * Strahl und Scheibe gehen miteinander, zueinander ändert sich nichts. Es ist
 * ein anderer Blick auf dieselbe Welt und keine andere Welt — deshalb gilt die
 * Drehung auch in *Hand aus* und *Hand in VR*, sonst spränge die Bühne beim
 * Umschalten der Hand.
 *
 * Ohne three.js wie die übrige geprüfte Mathematik der Seite.
 */

import { multiplyQuat, conjugate, type Quat } from '../worlds/portal/tools/aim';
import { quatFromEulerXYZ } from '../worlds/portal/tools/toolPose';
import { REAL_HAND } from './handFrame';

/**
 * **Die Ausgangsansicht auf ein Werkzeug**: ein gutes Stück von der Seite, ein
 * kleines von oben.
 *
 * Der Doppeltipp geht dorthin zurück, und das Ziehen giert darum herum —
 * genickt wird an einem Werkzeug nicht (`viewer.ts`, `onMove`). Deshalb hängt
 * `HAND_ON_STAGE` an dieser einen Zahl: was einmal waagerecht quer im Bild
 * liegt, bleibt beim Drehen um die Hochachse auch waagerecht.
 */
export const TOOL_HOME = { yaw: 0.6, pitch: 0.35 };

/**
 * **Die Lage, auf die jede echte Hand gedreht wird** — im Raum der Bühne.
 *
 * Eine reine Gierung, und zwar die, die dem Zeigestrahl in der Ausgangsansicht
 * den Viertelkreis zur Kamera lässt: die Bühne dreht sich um `TOOL_HOME.yaw`
 * vor ihr, gemeinsam sind es 90°, und damit liegt der Strahl quer vor der
 * Kamera statt in sie hinein. Eine Querlinie kippt das Nicken der Ansicht
 * nicht — sie bleibt waagerecht, auch wenn man von schräg oben daraufsieht.
 *
 * Kein Nicken und kein Rollen daneben: die Hand hält das Gerät aufrecht, wie
 * sie es in Wirklichkeit hält, und alles, was sonst noch schräg aussieht, ist
 * dann wirklich das Werkzeug.
 */
export const HAND_ON_STAGE: Quat = quatFromEulerXYZ({
  x: 0,
  y: Math.PI / 2 - TOOL_HOME.yaw,
  z: 0,
});

/**
 * Die Drehung der **Bühne**, die einen Griffraum so hinlegt, dass die echte
 * Hand darin auf `HAND_ON_STAGE` steht.
 *
 * Der Griffraum steht bei jedem Werkzeug woanders — er ist die Umkehrung der
 * Lage im Griff —, und in ihm liegt die echte Hand noch einmal um die
 * Zielkorrektur gedreht (`REAL_HAND`). Die beiden zusammen sind die Lage der
 * Hand auf der Bühne; was hier herauskommt, ist genau das, was davorgesetzt
 * werden muss, damit daraus die immer gleiche wird:
 *
 * ```
 * Bühne · Griffraum · echte Hand = HAND_ON_STAGE
 * ⇒ Bühne = HAND_ON_STAGE · (Griffraum · echte Hand)⁻¹
 * ```
 *
 * @param grip die Drehung des Griffraums auf der Bühne (`Lage-im-Griff⁻¹`).
 */
export function stageForGrip(grip: Quat): Quat {
  const hand = multiplyQuat(grip, REAL_HAND.rotation, { x: 0, y: 0, z: 0, w: 1 });
  const back = conjugate(hand, { x: 0, y: 0, z: 0, w: 1 });
  return multiplyQuat(HAND_ON_STAGE, back, { x: 0, y: 0, z: 0, w: 1 });
}
