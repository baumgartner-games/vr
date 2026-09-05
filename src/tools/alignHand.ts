/**
 * **Die Hand an eine Linie legen** — die beiden Knöpfe neben dem Regler und der
 * Drehpunkt, um den sich alles dreht, als Rechnung.
 *
 * Beim Justieren stehen drei Linien im Bild, und sie sind die eigentliche
 * Auskunft:
 *
 * - die bernsteinfarbene am **Zeigefinger** (`viewer.ts`, sie hängt an der
 *   Fingerspitze und -Z ist ihre Richtung) — wohin die *Hand* zeigt,
 * - der rosa Pfeil am **Griff** (`tools/grip.ts`, `createGripFront`, aus der
 *   Mitte des Griffs nach -Z) — wohin der *Griff* zeigt,
 * - der weiße Pfeil am **Werkzeug** (`viewer.ts`, aus dem Nullpunkt des
 *   Werkzeugs nach -Z) — wohin das Werkzeug *zielt*, denn das eigene -Z eines
 *   gehaltenen Werkzeugs *ist* der Zeigestrahl (`tools/aim.ts`).
 *
 * Zwei davon zur Deckung zu bringen ist das, worum es geht, und es über sechs
 * Achsen einzeln zu erwürgen ist Arbeit für eine Rechnung. Drei Griffe hat sie:
 *
 * - `alignHandToLine` — **Auf den Griff**: Richtung *und* Ursprung. Die
 *   Fingerspitze landet im Mittelpunkt des Griffs und der Finger auf dem Pfeil.
 * - `turnHandTo` — **In Zielrichtung**: nur die Richtung. Die Fingerspitze
 *   bleibt, wo sie ist, und die Hand schwenkt um sie herum auf den Zielpfeil.
 *   Denn ein Ziel ist eine *Richtung* und kein Ort — der Nullpunkt eines
 *   Werkzeugs ist sein Griffpunkt, und dort gehört keine Fingerspitze hin.
 *   Beides zusammen ist damit ein Weg: erst auf den Griff, dann aufs Ziel.
 * - `handAboutPivot` — der **Drehpunkt**: eine neue Drehung, aber die
 *   Fingerspitze bleibt liegen. Das ist der Regler für Yaw, Pitch und Roll:
 *   eine Hand, die um ihr Handgelenk kippt, zieht die Spitze von der Linie
 *   weg, und man justiert hinterher den Ort nach, den man vorher getroffen
 *   hatte. Um die Spitze gedreht bleibt die Linie liegen und man dreht die
 *   Faust *an ihr*.
 *
 * Gemeinsam ist allen dreien der **kürzeste Bogen**: eine Richtung sind zwei
 * Freiheitsgrade, eine Drehung hat drei — um die Linie herum bleibt einer
 * offen, und den gibt niemand vor. Gedreht wird deshalb so wenig wie möglich,
 * damit die Hand ihre Rolllage behält und man sie danach dort findet, wo man
 * sie gelassen hat.
 *
 * Gerechnet wird im **Raum des Werkzeugs** — dieselbe Größe, an der auch der
 * Regler zieht (`ghostOnTool` in `tune/handGrip.ts`) —, und ohne three.js wie
 * die übrige geprüfte Mathematik: ein vertauschtes Vorzeichen fällt hier auf
 * und nicht erst in der Brille.
 */

import {
  conjugate,
  multiplyQuat,
  rotateVec,
  type Quat,
  type Vec3,
} from '../worlds/portal/tools/aim';
import type { Pose } from '../worlds/tune/handGrip';

/** Eine Linie im Bild: wo sie anfängt und wohin sie zeigt. */
export interface Ray {
  origin: Vec3;
  direction: Vec3;
}

/**
 * Die Handlage, bei der die Fingerlinie auf der gegebenen Linie liegt —
 * gleiche Richtung, gleicher Ursprung.
 *
 * @param hand   die Lage der Hand, wie sie gerade gilt
 * @param finger die Linie am Zeigefinger, im selben Raum
 * @param line   die Linie, auf die sie soll (der Pfeil am Griff)
 */
export function alignHandToLine(hand: Pose, finger: Ray, line: Ray): Pose {
  return swing(hand, finger, line.direction, line.origin);
}

/**
 * Dieselbe Hand, nur auf eine andere **Richtung** geschwenkt: die Fingerspitze
 * bleibt liegen, die Faust dreht sich um sie.
 *
 * @param direction wohin der Finger danach zeigt (der Zielpfeil des Werkzeugs)
 */
export function turnHandTo(hand: Pose, finger: Ray, direction: Vec3): Pose {
  return swing(hand, finger, direction, finger.origin);
}

/**
 * Eine neue Drehung um einen festgehaltenen Punkt — der Weg des Reglers für
 * Yaw, Pitch und Roll.
 *
 * @param rotation die Drehung, die der Regler eingestellt hat
 * @param pivot    der Punkt, der dabei liegen bleibt (die Fingerspitze)
 */
export function handAboutPivot(hand: Pose, finger: Ray, rotation: Quat, pivot: Vec3): Pose {
  return hold(pointInHand(hand, finger.origin), rotation, pivot);
}

/** Erst auf die Richtung schwenken, dann die Spitze auf ihren Punkt setzen. */
function swing(hand: Pose, finger: Ray, direction: Vec3, at: Vec3): Pose {
  const turn = shortestArc(finger.direction, direction);
  const rotation = normalize(multiplyQuat(turn, hand.rotation, { x: 0, y: 0, z: 0, w: 1 }));
  return hold(pointInHand(hand, finger.origin), rotation, at);
}

/**
 * Ein Punkt der Bühne im **Raum der Hand**: wo die Fingerspitze an der Hand
 * sitzt.
 *
 * Sie sitzt dort fest — was sich ändert, ist, wohin die Hand sie hält. Deshalb
 * geht jede dieser Rechnungen über diesen Zwischenschritt: Spitze merken, Hand
 * drehen, Hand so verschieben, dass die gedrehte Spitze wieder auf ihrem Punkt
 * liegt.
 */
function pointInHand(hand: Pose, point: Vec3): Vec3 {
  const inverse = conjugate(hand.rotation, { x: 0, y: 0, z: 0, w: 1 });
  return rotateVec(
    {
      x: point.x - hand.position.x,
      y: point.y - hand.position.y,
      z: point.z - hand.position.z,
    },
    inverse,
    { x: 0, y: 0, z: 0 },
  );
}

/** Die Hand, die `inHand` bei dieser Drehung genau auf `at` hält. */
function hold(inHand: Vec3, rotation: Quat, at: Vec3): Pose {
  const moved = rotateVec(inHand, rotation, { x: 0, y: 0, z: 0 });
  return {
    position: { x: at.x - moved.x, y: at.y - moved.y, z: at.z - moved.z },
    rotation,
  };
}

/**
 * Die kürzeste Drehung, die `from` auf `to` legt.
 *
 * Der Sonderfall ist die **Gegenrichtung**: dort gibt es keinen kürzesten
 * Bogen, sondern unendlich viele halbe Drehungen, und `from × to` ist der
 * Nullvektor — ohne diesen Zweig käme ein Quaternion aus lauter Nullen heraus
 * und die Hand verschwände. Genommen wird dann irgendeine Achse quer dazu; sie
 * ist so gut wie jede andere.
 */
function shortestArc(from: Vec3, to: Vec3): Quat {
  const a = unit(from);
  const b = unit(to);
  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  if (dot > 0.999999) return { x: 0, y: 0, z: 0, w: 1 };
  if (dot < -0.999999) {
    const axis = unit(across(a));
    return { x: axis.x, y: axis.y, z: axis.z, w: 0 };
  }
  return normalize({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
    w: 1 + dot,
  });
}

/** Irgendeine Richtung quer zu dieser — die kleinste Achse ist die sicherste. */
function across(v: Vec3): Vec3 {
  const other =
    Math.abs(v.x) <= Math.abs(v.y) && Math.abs(v.x) <= Math.abs(v.z)
      ? { x: 1, y: 0, z: 0 }
      : Math.abs(v.y) <= Math.abs(v.z)
        ? { x: 0, y: 1, z: 0 }
        : { x: 0, y: 0, z: 1 };
  return {
    x: v.y * other.z - v.z * other.y,
    y: v.z * other.x - v.x * other.z,
    z: v.x * other.y - v.y * other.x,
  };
}

function unit(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

function normalize(q: Quat): Quat {
  const length = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
}
