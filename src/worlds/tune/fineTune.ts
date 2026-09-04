/**
 * Feinjustage: eine Handbewegung, auf ein Zehntel heruntergerechnet.
 *
 * Eine Haltung im Headset **grob** einzustellen kann man mit der Hand — man
 * legt sie ans Werkzeug und drückt. Die letzten zwei Millimeter kann man so
 * nicht: eine ausgestreckte Hand zittert um mehr als das, und wer sie ruhig
 * hält, verschiebt sie beim Drücken wieder. Genau daran scheitert jede
 * Justage, die nur gemessen und nie nachgezogen wird.
 *
 * Also wird die Bewegung **untersetzt**: ein Zentimeter an der eigenen Hand
 * ist ein Millimeter am Werkzeug, und ein Grad ist ein Zehntelgrad. Der ganze
 * Arm wird damit zum Feintrieb, und das Zittern wird zehnmal kleiner mit.
 *
 * Ohne three.js, wie `aim.ts` und `toolPose.ts`, damit die Vorzeichen prüfbar
 * bleiben: eine Untersetzung, die in die falsche Richtung läuft, merkt man in
 * der Brille erst nach einer Minute Suchen.
 */

import { conjugate, multiplyQuat, type Quat, type Vec3 } from '../portal/tools/aim';

/** Wie viel von einer Handbewegung am Geist ankommt: ein Zehntel. */
export const FINE_FACTOR = 0.1;

/** Ein Griff im Raum: der Ort und die Lage, sonst nichts. */
export interface Grip {
  position: Vec3;
  rotation: Quat;
}

/**
 * Dieselbe Drehung, nur um `factor` so weit — ein Slerp von der Ruhelage aus.
 *
 * Über den kürzeren Bogen: eine Drehung und dieselbe Drehung mit umgekehrten
 * Vorzeichen sind dasselbe, aber ein Zehntel davon eben nicht — einmal sind es
 * 3°, einmal 33°, und die zweite Antwort wäre in der Brille ein Sprung.
 */
export function scaleRotation(q: Quat, factor: number): Quat {
  const length = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  // Auf den kürzeren Bogen drehen, dann ist der halbe Winkel höchstens 90°.
  const sign = q.w < 0 ? -1 : 1;
  const x = (q.x * sign) / length;
  const y = (q.y * sign) / length;
  const z = (q.z * sign) / length;
  const w = Math.min(1, Math.max(-1, (q.w * sign) / length));

  const axis = Math.hypot(x, y, z);
  // Praktisch keine Drehung: ein Zehntel davon ist erst recht keine, und der
  // Achsenvektor wäre hier nur Rauschen.
  if (axis < 1e-9) return { x: 0, y: 0, z: 0, w: 1 };

  const half = Math.acos(w) * factor;
  const scale = Math.sin(half) / axis;
  return { x: x * scale, y: y * scale, z: z * scale, w: Math.cos(half) };
}

/**
 * Der Griff, nachdem die ziehende Hand ihn ein Stück weit mitgenommen hat.
 *
 * Gerechnet wird immer gegen den Stand **beim Zupacken** und nie gegen das
 * letzte Bild: sonst summieren sich Rundungsfehler über eine Minute Feinarbeit
 * zu einem Geist, der von selbst davonwandert — und das ist die eine Sorte
 * Fehler, die man beim Justieren garantiert nicht bemerkt.
 *
 * @param grip   wo der Geist beim Zupacken hing
 * @param from   wo die ziehende Hand beim Zupacken war
 * @param to     wo sie jetzt ist
 * @param factor die Untersetzung; 1 wäre das ungebremste Mitziehen
 */
export function nudgeGrip(
  grip: Grip,
  from: Grip,
  to: Grip,
  factor = FINE_FACTOR,
): Grip {
  const position: Vec3 = {
    x: grip.position.x + (to.position.x - from.position.x) * factor,
    y: grip.position.y + (to.position.y - from.position.y) * factor,
    z: grip.position.z + (to.position.z - from.position.z) * factor,
  };

  // Was die Hand seit dem Zupacken gedreht hat — im Raum, nicht in ihrem
  // eigenen Frame: der Geist soll sich um dieselben Achsen drehen, um die die
  // Hand sich dreht, und nicht um seine eigenen.
  const delta = multiplyQuat(
    to.rotation,
    conjugate(from.rotation, { x: 0, y: 0, z: 0, w: 1 }),
    { x: 0, y: 0, z: 0, w: 1 },
  );
  const rotation = multiplyQuat(scaleRotation(delta, factor), grip.rotation, {
    x: 0,
    y: 0,
    z: 0,
    w: 1,
  });
  return { position, rotation: normalize(rotation) };
}

function normalize(q: Quat): Quat {
  const length = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
}
