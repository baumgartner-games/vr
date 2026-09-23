import { conjugate, multiplyQuat, rotateVec, type Quat, type Vec3 } from './tools/aim';
import { GRIP_TO_RAY } from './tools/gripFit';

/**
 * **Die Hand vor dem Auge** — wo die Bildschirmhand _aus den Augen_ sitzt und
 * wie sie gedreht ist.
 *
 * Von oben hält die Figur ihr Werkzeug an ihrer Faust (`screenHand.ts`,
 * `CHEF_TOOL`), und man sieht es von außen. Aus den Augen gab es bis hierher
 * gar nichts zu sehen — keine Hand, keine Waffe, und geschossen wurde nur mit
 * den Portalen. Gewünscht war das, was jeder Ego-Shooter zeigt: **die Hand
 * unten rechts im Bild, die Waffe darin, und ein Fadenkreuz in der Mitte**.
 *
 * Gerechnet wird im **Raum der Kamera** (-Z ist geradeaus, +Y oben), denn
 * dort hängt die Hand: Sie dreht sich mit dem Blick, wie in jedem Spiel.
 *
 * ## Warum sie nicht einfach geradeaus zeigt
 *
 * Die Hand sitzt rechts unten, das Fadenkreuz in der Mitte. Zeigte der Lauf
 * parallel zur Blickrichtung, ginge jeder Schuss eine Handbreit rechts unter
 * dem Kreuz vorbei — auf jede Entfernung gleich weit, also auf kurze Strecke
 * genau dann, wenn es zählt. Deshalb wird die Hand auf den **Punkt** gedreht,
 * den das Kreuz gerade trifft (`distance`, von der Welt gemessen): Der Lauf
 * schaut von unten rechts auf dieselbe Stelle, die man in der Mitte sieht.
 *
 * ## Und warum die Hand dafür nicht in der Brillenhaltung steht
 *
 * Doch, genau in der: Der Griff ist gegen den Zeigestrahl um `GRIP_TO_RAY`
 * gedreht, wie an einem Controller, und jede eingemessene Faust und jede
 * Werkzeug-Pose gilt deshalb unverändert. Man sieht am Schirm dieselbe Hand um
 * dieselbe Pistole wie in der Brille.
 */

/** Wo der Griff der rechten Hand vor dem Auge sitzt, in Metern im Raum der Kamera. */
export const EYE_GRIP: Readonly<Vec3> = { x: 0.3, y: -0.3, z: -0.62 };

/**
 * Und wo die **linke** steht — gespiegelt und etwas tiefer, nur als leere Hand.
 *
 * Mit einem Werkzeug in der rechten geht sie aus dem Bild: Eine Pistole hält
 * man mit einer Hand, und eine zweite, die daneben in der Luft hängt, sähe
 * aus wie vergessen.
 */
export const EYE_GRIP_LEFT: Readonly<Vec3> = { x: -0.28, y: -0.33, z: -0.58 };

/** Näher als so wird nicht gezielt — sonst dreht sich die Hand vor einer Wand quer. */
export const EYE_AIM_MIN = 1.5;
/** Und weiter auch nicht: ab hier ist der Unterschied zu „parallel" kleiner als ein Pixel. */
export const EYE_AIM_MAX = 60;

/** Wie ein Werkzeug im Griff liegt: sein Nullpunkt und seine Laufrichtung. */
export interface EyeHold {
  /** Nullpunkt des Werkzeugs im Raum des Griffs. */
  position: Vec3;
  /** Seine -Z-Achse im Raum des Griffs — dorthin schießt es. */
  forward: Vec3;
}

/** Die Grundhaltung: der Zeigestrahl geradeaus, der Griff darum um `GRIP_TO_RAY` gekippt. */
const BASE: Quat = conjugate(GRIP_TO_RAY, { x: 0, y: 0, z: 0, w: 1 });

/**
 * **Die Drehung des Griffs vor dem Auge** — so, dass das Werkzeug darin auf
 * den Punkt `distance` Meter vor der Kamera zeigt.
 *
 * Ohne Werkzeug (`hold` = `null`) ist es die Grundhaltung: der Zeigestrahl
 * geradeaus, wie eine Hand an einem Controller, die nach vorn zeigt.
 *
 * Zweimal gerechnet, weil das Drehen um den Griff den Nullpunkt des Werkzeugs
 * ein kleines Stück mitnimmt; nach dem zweiten Mal liegt der Fehler auf zehn
 * Meter unter einem Millimeter (mit Test).
 *
 * @param grip     wo der Griff im Raum der Kamera sitzt
 * @param hold     wie das Werkzeug im Griff liegt, oder `null` für die leere Hand
 * @param distance wie weit das Fadenkreuz gerade trifft, in Metern
 */
export function eyeGripRotation(
  grip: Readonly<Vec3>,
  hold: EyeHold | null,
  distance: number,
  out: Quat,
): Quat {
  out.x = BASE.x;
  out.y = BASE.y;
  out.z = BASE.z;
  out.w = BASE.w;
  if (!hold) return out;
  const reach = Math.min(EYE_AIM_MAX, Math.max(EYE_AIM_MIN, distance || EYE_AIM_MAX));
  const at: Vec3 = { x: 0, y: 0, z: 0 };
  const along: Vec3 = { x: 0, y: 0, z: 0 };
  const turn: Quat = { x: 0, y: 0, z: 0, w: 1 };
  for (let pass = 0; pass < 2; pass++) {
    rotateVec(hold.position, out, at);
    rotateVec(hold.forward, out, along);
    const wantX = -(grip.x + at.x);
    const wantY = -(grip.y + at.y);
    const wantZ = -reach - (grip.z + at.z);
    const length = Math.hypot(wantX, wantY, wantZ) || 1;
    fromUnitVectors(along, { x: wantX / length, y: wantY / length, z: wantZ / length }, turn);
    multiplyQuat(turn, out, out);
  }
  return out;
}

/** Die kürzeste Drehung von `a` nach `b` — beide Einheitsvektoren. */
function fromUnitVectors(a: Vec3, b: Vec3, out: Quat): Quat {
  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  // Genau entgegengesetzt kommt hier nicht vor: Ein Werkzeug, das nach hinten
  // zeigt, hält niemand vor dem Auge. Falls doch, bleibt die Hand, wie sie ist.
  if (dot < -0.999999) {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    out.w = 1;
    return out;
  }
  out.x = a.y * b.z - a.z * b.y;
  out.y = a.z * b.x - a.x * b.z;
  out.z = a.x * b.y - a.y * b.x;
  out.w = 1 + dot;
  const length = Math.hypot(out.x, out.y, out.z, out.w);
  out.x /= length;
  out.y /= length;
  out.z /= length;
  out.w /= length;
  return out;
}
