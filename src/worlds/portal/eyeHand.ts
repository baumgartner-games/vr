import { conjugate, forwardOf, multiplyQuat, rotateVec, type Quat, type Vec3 } from './tools/aim';
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

/**
 * **Wie groß alles vor dem Auge gezeichnet wird**: halb so groß wie in echt.
 *
 * In echter Größe füllte die Pistole — seit sie in der Hand doppelt so groß
 * ist — das halbe Bild, und eine Tomate davor deckte die Küche zu (gemeldet:
 * _„viel zu groß, man erkennt nichts im Bild"_). Gestaucht wird **nur aus den
 * Augen**: Von oben ist die Kamera weit weg und alles ohnehin klein, und in
 * der Brille muss ein Ding so groß sein, wie die Hand es fühlt.
 *
 * Gestaucht wird der Halter der Hand (`ScreenHand`), also Hand und Werkzeug
 * zusammen — die Faust bleibt um den Griff. Was getragen wird, bekommt
 * denselben Faktor (`PortalWorld.shrinkScreenCarry`).
 */
export const EYE_SCALE = 0.5;

/**
 * **Wie weit die Zielhilfe beim Zielen vor dem Auge steht**, in Metern — je
 * Art verschieden, wie in echt: Kimme und Korn hält man auf Armlänge, einen
 * Rotpunkt etwas näher, und das Fernrohr kommt fast ans Auge, sonst ist seine
 * Linse ein Punkt. Nicht näher als die vordere Schnittfläche der Kamera
 * (5 cm), sonst schnitte sie das Okular weg.
 */
export const EYE_RELIEF = { irons: 0.3, reddot: 0.24, scope: 0.075 } as const;

/** Welche Zielhilfe beim Zielen vor dem Auge steht — ohne eine: wie Kimme und Korn. */
export type EyeSightKind = keyof typeof EYE_RELIEF;

/**
 * **Wie viel Luft zwischen Auge und hinterem Ende der Waffe bleibt**, in
 * Metern. Kimme und Korn sitzen mitten auf der doppelt großen Pistole; stünde
 * die Kimme auf Armlänge, stäke das Griffstück im Auge und füllte das halbe
 * Bild. Also rückt die Waffe so weit weg, dass ihr Ende diesen Abstand hält.
 */
export const EYE_REAR_CLEAR = 0.2;

/**
 * **Wie groß die Waffe im Anschlag gezeichnet wird.** Wie an der Hüfte halb so
 * groß — nur das **Fernrohr** kommt in echter Größe ans Auge: Seine Linse ist
 * drei Zentimeter breit, und halb so groß wäre sie ein Knopf, durch den man
 * nichts sieht. Das Griffstück dahinter ragt dann unter das Auge und aus dem
 * Bild, wie bei einem echten Zielfernrohr.
 */
export function eyeSightScale(kind: EyeSightKind): number {
  return kind === 'scope' ? 1 : EYE_SCALE;
}

/**
 * **Wie weit die Zielhilfe vor dem Auge steht** (`EYE_RELIEF`) — und beim
 * Rotpunkt und bei Kimme und Korn mindestens so weit, dass das hintere Ende
 * der Waffe `EYE_REAR_CLEAR` vor dem Auge bleibt.
 *
 * @param rear wie weit die Waffe hinter der Zielhilfe noch reicht, in ihren Metern
 */
export function eyeSightRelief(kind: EyeSightKind, rear: number): number {
  const base = EYE_RELIEF[kind];
  if (kind === 'scope') return base;
  return Math.max(base, rear * eyeSightScale(kind) + EYE_REAR_CLEAR);
}

/** Wie lange das Heranholen ans Auge dauert, in Sekunden — und das Wegnehmen. */
export const EYE_SIGHT_TIME = 0.14;

/** Näher als so wird nicht gezielt — sonst dreht sich die Hand vor einer Wand quer. */
export const EYE_AIM_MIN = 1.5;
/** Und weiter auch nicht: ab hier ist der Unterschied zu „parallel" kleiner als ein Pixel. */
export const EYE_AIM_MAX = 60;

/** Wie ein Werkzeug im Griff liegt: sein Nullpunkt und seine Drehung. */
export interface EyeHold {
  /** Nullpunkt des Werkzeugs im Raum des Griffs. */
  position: Vec3;
  /** Seine Drehung im Raum des Griffs — seine -Z-Achse ist der Lauf. */
  rotation: Quat;
}

/**
 * **Die Visierlinie eines Werkzeugs**, in seinem eigenen Raum: ein Punkt auf
 * ihr (die Kimme, das Glas des Rotpunkts, die Linse des Fernrohrs) und die
 * Drehung, deren -Z sie entlangläuft und deren +Y oben ist.
 */
export interface EyeSight {
  point: Vec3;
  rotation: Quat;
  /** Wie weit dieser Punkt beim Zielen vor dem Auge steht (`eyeSightRelief`). */
  relief: number;
  /** Wie groß die Waffe im Anschlag gezeichnet wird (`eyeSightScale`). */
  scale: number;
}

/** Eine Lage vor dem Auge: wo der Halter der Hand steht und wie er gedreht ist. */
export interface EyePose {
  position: Vec3;
  rotation: Quat;
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
 * @param scale    wie groß der Halter gezeichnet wird (`EYE_SCALE`)
 */
export function eyeGripRotation(
  grip: Readonly<Vec3>,
  hold: EyeHold | null,
  distance: number,
  out: Quat,
  scale = 1,
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
  const forward = forwardOf(hold.rotation, { x: 0, y: 0, z: 0 });
  for (let pass = 0; pass < 2; pass++) {
    rotateVec(hold.position, out, at);
    at.x *= scale;
    at.y *= scale;
    at.z *= scale;
    rotateVec(forward, out, along);
    const wantX = -(grip.x + at.x);
    const wantY = -(grip.y + at.y);
    const wantZ = -reach - (grip.z + at.z);
    const length = Math.hypot(wantX, wantY, wantZ) || 1;
    fromUnitVectors(along, { x: wantX / length, y: wantY / length, z: wantZ / length }, turn);
    multiplyQuat(turn, out, out);
  }
  return out;
}

/**
 * **Die Lage beim Zielen** — der Halter so, dass die Visierlinie genau auf der
 * Blickachse liegt: ihr Punkt `relief` Meter vor dem Auge, ihre Richtung
 * geradeaus, ihr Oben oben.
 *
 * Das ist das Zielen über Kimme und Korn, durch den Rotpunkt oder durchs
 * Fernrohr: Man holt die Waffe ans Auge, bis Kimme, Korn und Ziel eine Linie
 * sind. Die Kugel kommt dabei aus dem Lauf, eine Fingerbreite unter der Linie
 * — wie bei einer echten Waffe, und deshalb schlägt sie auf kurze Strecke
 * eine Fingerbreite tief ein.
 *
 * @param scale wie groß der Halter gezeichnet wird (`EYE_SCALE`)
 */
export function eyeSightPose(hold: EyeHold, sight: EyeSight, scale: number, out: EyePose): EyePose {
  // Die Visierlinie im Raum des Griffs, und der Halter genau andersherum
  // gedreht: dann steht sie im Raum der Kamera ungedreht.
  const inGrip = multiplyQuat(hold.rotation, sight.rotation, { x: 0, y: 0, z: 0, w: 1 });
  conjugate(inGrip, out.rotation);
  const point = rotateVec(sight.point, hold.rotation, { x: 0, y: 0, z: 0 });
  point.x += hold.position.x;
  point.y += hold.position.y;
  point.z += hold.position.z;
  const turned = rotateVec(point, out.rotation, { x: 0, y: 0, z: 0 });
  out.position.x = -scale * turned.x;
  out.position.y = -scale * turned.y;
  out.position.z = -scale * turned.z - sight.relief;
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
