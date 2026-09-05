/**
 * **Die Hand auf die Grifflinie legen** — der Knopf neben dem Regler, als
 * Rechnung.
 *
 * Beim Justieren stehen zwei Linien im Bild, und sie sind die eigentliche
 * Auskunft: die bernsteinfarbene am **Zeigefinger** (`viewer.ts`, sie hängt an
 * der Fingerspitze und -Z ist ihre Richtung) und die rosa am **Griff**
 * (`tools/grip.ts`, `createGripFront`, aus der Mitte des Griffs nach -Z, also
 * dorthin, wohin dieser Griff zeigt). Stimmen beide überein, dann zeigt die
 * Faust dorthin, wohin der Griff zeigt — und genau das stellt man am Regler
 * sechsmal einzeln ein, um es einmal zu treffen.
 *
 * Also einmal ausgerechnet statt sechsmal gezogen: gesucht ist die Handlage,
 * bei der die **beiden Linien eine** sind — gleiche Richtung, gleicher
 * Ursprung. Die Fingerspitze landet damit im Mittelpunkt des Griffs und der
 * Finger liegt auf dem Pfeil.
 *
 * Zwei Dinge, die die Rechnung ausmachen:
 *
 * - **Der kürzeste Bogen.** Eine Richtung sind zwei Freiheitsgrade, eine
 *   Drehung hat drei — um die Linie herum bleibt einer offen, und den gibt
 *   niemand vor. Gedreht wird deshalb so wenig wie möglich: die Hand behält
 *   ihre Rolllage um die Linie und kippt nur so weit, wie sie muss. Wer danach
 *   noch am Roll ziehen will, findet ihn dort, wo er ihn hingelegt hat.
 * - **Erst drehen, dann setzen.** Der Ursprung ist die *Fingerspitze* und nicht
 *   der Handwurzelpunkt, und wo die Spitze liegt, hängt von der Drehung ab.
 *   Also wird die Spitze im Raum der Hand gemerkt, die Hand gedreht und
 *   danach so verschoben, dass die gedrehte Spitze auf dem Griffpunkt sitzt.
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
 * Die Handlage, bei der die Fingerlinie auf der Grifflinie liegt.
 *
 * @param hand   die Lage der Hand, wie sie gerade gilt
 * @param finger die Linie am Zeigefinger, im selben Raum
 * @param grip   die Linie am Griff, ebenfalls dort
 */
export function alignHandToGrip(hand: Pose, finger: Ray, grip: Ray): Pose {
  const turn = shortestArc(finger.direction, grip.direction);
  const rotation = normalize(multiplyQuat(turn, hand.rotation, { x: 0, y: 0, z: 0, w: 1 }));

  // Die Fingerspitze im Raum der Hand: sie sitzt an der Hand, und dort bleibt
  // sie — was sich ändert, ist, wohin die Hand sie hält.
  const inverse = conjugate(hand.rotation, { x: 0, y: 0, z: 0, w: 1 });
  const local = rotateVec(
    {
      x: finger.origin.x - hand.position.x,
      y: finger.origin.y - hand.position.y,
      z: finger.origin.z - hand.position.z,
    },
    inverse,
    { x: 0, y: 0, z: 0 },
  );
  const moved = rotateVec(local, rotation, { x: 0, y: 0, z: 0 });

  return {
    position: {
      x: grip.origin.x - moved.x,
      y: grip.origin.y - moved.y,
      z: grip.origin.z - moved.z,
    },
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
