/**
 * **Wie eine bloße Hand ihre Sachen hält** — der Versatz zwischen dem, was die
 * Brille von einer getrackten Hand meldet, und dem Raum, in dem ein
 * gehaltenes Werkzeug oder ein gegriffener Gegenstand hängen soll.
 *
 * Mit **Controller** gibt es diese Frage nicht: die Brille meldet einen
 * *Griffraum*, und der liegt dort, wo die Faust das Gerät hält — jede Haltung,
 * jeder Halterzylinder und jede Faust dieses Spiels stehen darin
 * (`worlds/portal/tools/gripFit.ts`). Eine **getrackte Hand hat keinen
 * Griffraum**: three.js lässt ihn unangetastet, weil eine Hand keine
 * `gripSpace` hat, und alles, was jemand hält, hängt deshalb im
 * **Zeigestrahl** — dem Pinch-Strahl, den die Brille aus Daumen und
 * Zeigefinger baut. Der ist gegen die Faust verdreht, und zwar merklich:
 *
 * - **Roll**: ein gehaltener Gegenstand stand 90° zu weit nach rechts
 *   gedreht. Wer eine Pistole aufrecht in die Faust nahm, hielt sie quer.
 * - **Yaw**: der Strahl zeigt weiter nach links, als die Hand zielt — gut 35°,
 *   und damit schießt alles neben das, worauf man hält.
 *
 * Hier stehen die beiden Zahlen, gemessen im **Eingaberaum** an der rechten
 * Hand und für die linke gespiegelt — dieselbe Spiegelung wie bei jeder
 * Haltung (`handPose.mirrorHandPose`): Yaw und Roll kippen das Vorzeichen,
 * Pitch bleibt.
 *
 * **Nur das Halten**, nicht das Aussehen. Die Knochenhand wird davon kein Grad
 * gedreht: der Versatz sitzt auf einem eigenen Knoten (`ControllerState.hold`),
 * an dem die Sachen hängen, und nicht an der gezeichneten Hand. Wer die
 * Handhaltung ändern will, ändert eine `HandPose` — das hier ist der Raum, in
 * dem sie gilt.
 *
 * Ohne three.js, wie jede Rechnung, die für sich prüfbar bleiben soll.
 */

import type { Handedness } from './XRInput';

/** Eine Neigung in Grad, gelesen als three.js-`Euler` mit Reihenfolge `XYZ`. */
export interface HoldTilt {
  readonly pitch: number;
  /** Positiv dreht nach links, negativ nach rechts. */
  readonly yaw: number;
  /** Positiv kippt nach links (gegen den Uhrzeigersinn, von hinten gesehen). */
  readonly roll: number;
}

/** Keine Neigung — was ein Controller bekommt: sein Griffraum stimmt schon. */
export const NO_TILT: HoldTilt = { pitch: 0, yaw: 0, roll: 0 };

/**
 * Der Versatz der **rechten** getrackten Hand, in Grad.
 *
 * 90° Roll nach links, damit ein Gegenstand in der Faust aufrecht steht statt
 * quer; 35° Yaw nach rechts, damit ein Werkzeug dorthin zielt, wohin die Hand
 * zeigt, und nicht daneben.
 */
export const HAND_HOLD_TILT_RIGHT: HoldTilt = { pitch: 0, yaw: -35, roll: 90 };

/**
 * Und dieselbe Neigung für links — **abgeleitet**, nicht daneben getippt. Zwei
 * getrennt gepflegte Zahlenreihen wären genau die Sorte Abweichung, die
 * niemand merkt: eine Hand, die anders hält als die andere, sieht man nicht,
 * man wundert sich nur.
 */
export const HAND_HOLD_TILT_LEFT: HoldTilt = mirrorHoldTilt(HAND_HOLD_TILT_RIGHT);

/**
 * Die Neigung, die eine **getrackte** Hand dieser Seite bekommt.
 *
 * Für einen Controller gibt es sie nicht — dort fragt niemand, weil dort der
 * Griffraum der Brille gilt.
 */
export function handHoldTilt(hand: Handedness): HoldTilt {
  return hand === 'left' ? HAND_HOLD_TILT_LEFT : HAND_HOLD_TILT_RIGHT;
}

/**
 * Dieselbe Neigung für die andere Hand: Yaw und Roll kippen um, Pitch bleibt.
 *
 * Genau die beiden Vorzeichen, die auch eine Haltung beim Spiegeln umdreht
 * (`handPose.mirrorHandPose`) — eine Drehung um die Hochachse und eine um die
 * Zeigeachse werden am Spiegel zu ihrem Gegenteil, eine um die Querachse
 * nicht. Das `+ 0` macht aus dem `-0`, das eine gespiegelte Null sonst wird,
 * wieder eine Null.
 */
export function mirrorHoldTilt(tilt: HoldTilt): HoldTilt {
  return { pitch: tilt.pitch, yaw: -tilt.yaw + 0, roll: -tilt.roll + 0 };
}
