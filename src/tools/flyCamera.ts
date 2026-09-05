/**
 * **Die freie Kamera** der Werkzeugseite — fliegen wie mit einer Drohne, ohne
 * three.js.
 *
 * Eine Welt von außen anzusehen sagt, wie sie *angelegt* ist; wie sie sich
 * *anfühlt*, sagt nur ein Blick von innen. Dafür gibt es diesen Modus: die Welt
 * steht still, und man fliegt darin herum — vor, zurück, seitwärts, hoch,
 * runter —, während Wischen den Kopf dreht. Es ist absichtlich eine **Drohne**
 * und kein Spieler: keine Schwerkraft, keine Wände, kein Boden, denn wer sich
 * eine Kulisse ansieht, will auch über sie hinweg und in sie hinein.
 *
 * Der Blick sind zwei Winkel und kein Quaternion, und das ist dieselbe
 * Entscheidung wie beim Umsehen von außen: **Gieren um die Welt-Y**, **Nicken
 * um die eigene X**, in dieser Reihenfolge (`YXZ`), und kein Rollen. Damit
 * bleibt der Horizont waagerecht, was auch immer man tut — eine Kamera, die
 * beim Umsehen langsam kippt, verliert man nach zehn Sekunden.
 *
 * Die Richtungen daraus:
 *
 * ```
 * vorn   = ( -sin ψ · cos θ ,  sin θ , -cos ψ · cos θ )   ψ = Gieren, θ = Nicken
 * rechts = (  cos ψ         ,  0     , -sin ψ          )
 * hoch   = (  0             ,  1     ,  0              )
 * ```
 *
 * **Vorn** nimmt das Nicken mit — wer nach unten schaut und vorwärts drückt,
 * fliegt nach unten, so wie eine Drohne in Blickrichtung zieht. **Rechts**
 * bleibt waagerecht: seitwärts zu fliegen und dabei zu steigen, nur weil man
 * gerade nach oben sieht, ist nichts, was jemand meint. Und **hoch** ist die
 * Welt-Y und nicht die eigene: hoch ist hoch.
 *
 * Ohne three.js, wie die übrige geprüfte Mathematik — Vorzeichen fallen hier
 * auf und nicht erst im Bild.
 */

import type { Vec3 } from '../worlds/portal/tools/aim';

/** Wo die Kamera steht und wohin sie sieht. */
export interface FlyView {
  position: Vec3;
  /** Gieren um Y, im Bogenmaß. */
  yaw: number;
  /** Nicken um die eigene X; positiv ist nach oben. */
  pitch: number;
}

/** Was gerade gedrückt ist, je Achse -1 … 1. */
export interface FlyInput {
  forward: number;
  right: number;
  up: number;
}

export const NO_INPUT: FlyInput = { forward: 0, right: 0, up: 0 };

/**
 * Wie weit nach oben und unten der Blick geht: gut 77°.
 *
 * Nicht bis senkrecht, und das ist kein Geschmack: genau über dem Zenit kippt
 * die Ansicht um, und danach wischt man in die andere Richtung, ohne etwas
 * falsch gemacht zu haben. Dieselbe Grenze wie beim Umsehen von außen.
 */
export const FLY_PITCH_LIMIT = 1.35;

/** Ob überhaupt etwas gedrückt ist — sonst rechnet niemand ein Bild lang. */
export function isMoving(input: FlyInput): boolean {
  return input.forward !== 0 || input.right !== 0 || input.up !== 0;
}

/**
 * Ein Bild weiter: dieselbe Kamera, um das Gedrückte versetzt.
 *
 * Die drei Achsen werden zusammengezählt und dann auf **Länge eins** gebracht,
 * falls sie darüber hinauskommen: schräg zu fliegen ist sonst um die Hälfte
 * schneller als geradeaus, und das merkt man genau dann, wenn man um etwas
 * herumfliegt.
 *
 * @param speed Meter je Sekunde bei vollem Ausschlag
 */
export function flyStep(view: FlyView, input: FlyInput, dt: number, speed: number): FlyView {
  const ahead = forwardOf(view);
  const side = rightOf(view);
  const move = {
    x: ahead.x * input.forward + side.x * input.right,
    y: ahead.y * input.forward + input.up,
    z: ahead.z * input.forward + side.z * input.right,
  };
  const length = Math.hypot(move.x, move.y, move.z);
  const step = (length > 1 ? speed / length : speed) * dt;
  return {
    ...view,
    position: {
      x: view.position.x + move.x * step,
      y: view.position.y + move.y * step,
      z: view.position.z + move.z * step,
    },
  };
}

/**
 * Umsehen: derselbe Ort, ein anderer Blick.
 *
 * Die Vorzeichen sind die des Umsehens von außen, und das ist Absicht — dort
 * zieht man die Welt am Finger mit, hier den Blick, und beides ist dieselbe
 * Bewegung: nach rechts gewischt wandert die Welt nach rechts.
 */
export function flyLook(view: FlyView, dx: number, dy: number): FlyView {
  return {
    ...view,
    yaw: view.yaw + dx,
    pitch: Math.max(-FLY_PITCH_LIMIT, Math.min(FLY_PITCH_LIMIT, view.pitch + dy)),
  };
}

/** Vor und zurück am Rad oder mit zwei Fingern — dieselbe Richtung wie „vorwärts". */
export function flyDolly(view: FlyView, distance: number): FlyView {
  const ahead = forwardOf(view);
  return {
    ...view,
    position: {
      x: view.position.x + ahead.x * distance,
      y: view.position.y + ahead.y * distance,
      z: view.position.z + ahead.z * distance,
    },
  };
}

/** Wohin die Kamera sieht — die Richtung, in die „vorwärts" geht. */
export function forwardOf(view: FlyView): Vec3 {
  const cos = Math.cos(view.pitch);
  return {
    x: -Math.sin(view.yaw) * cos,
    y: Math.sin(view.pitch),
    z: -Math.cos(view.yaw) * cos,
  };
}

/** Und nach rechts, waagerecht. */
export function rightOf(view: FlyView): Vec3 {
  return { x: Math.cos(view.yaw), y: 0, z: -Math.sin(view.yaw) };
}
