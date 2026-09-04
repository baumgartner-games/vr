/**
 * Wo die Hand am Werkzeug liegt — die Rechnung hinter dem **zweiten** Stand.
 *
 * Der erste Justierstand beantwortet eine Frage: *wie halte ich das Ding?* Er
 * misst, wo die **echte** Hand ist, wenn sie ein Werkzeug so greift, wie sie
 * es greifen will, und schreibt daraus die Lage des Werkzeugs im Griff
 * (`toolPose.ts`). Das reicht für alles, was zielt — und genau da hört es auf.
 *
 * Denn eine Taschenlampe zeigt nach vorn, und eine Hand, die eine Pistole
 * hält, zeigt mit dem Zeigefinger dorthin, wohin die Waffe zeigt. Legt man
 * dieselbe Haltung auf eine Taschenlampe, steht die Hand plötzlich quer: die
 * Zielrichtung stimmt, die Faust darum herum sieht falsch aus. Das ist keine
 * Messtoleranz, sondern eine **zweite** Größe — *wie umfasst die virtuelle
 * Hand den Gegenstand?* —, und die gehört auch zweimal eingestellt.
 *
 * Also der zweite Stand: dort hängt eine **Kopie** des Werkzeugs fest im Raum,
 * und daran liegt eine Boxhand, die man anfassen, drehen und wieder loslassen
 * kann. Was zwischen beiden liegt, ist die Handhaltung.
 *
 * Hier steht nur die Umrechnung dazu, und die ist eine Kette aus drei Posen:
 *
 * ```
 * Werkzeug in der Welt  =  Griff · Lage-im-Griff
 * Hand in der Welt      =  Griff · Haltung
 * ⇒ Hand am Werkzeug    =  Lage-im-Griff⁻¹ · Haltung
 * ```
 *
 * Der Griff kürzt sich weg — und das ist der Punkt: am Stand hält niemand
 * etwas, es gibt gar keinen Griff. Gerechnet wird deshalb **im Raum des
 * Werkzeugs**: die Boxhand hängt als Kind an der Kopie, ihre eigene Lage darin
 * *ist* die Antwort, und ob der Stand dabei irgendwo im Gang steht oder
 * verschoben wird, spielt keine Rolle mehr.
 *
 * Ohne three.js, wie `aim.ts` und `toolPose.ts`, damit die Vorzeichen
 * einzeln geprüft werden können statt erst in der Brille.
 */

import { conjugate, multiplyQuat, rotateVec, type Quat, type Vec3 } from '../portal/tools/aim';
import { quatFromEulerXYZ, type HoldPose } from '../portal/tools/toolPose';
import type { HandPose } from '../../core/handPose';

/** Ein Ort mit einer Drehung — dieselbe Form wie eine `HoldPose`. */
export interface Pose {
  position: Vec3;
  rotation: Quat;
}

/**
 * Eine Handhaltung als Pose: Zentimeter werden Meter, Grad werden ein Quaternion.
 *
 * Die Haltung selbst ist in den Zahlen geschrieben, die ein Mensch eintippt
 * (`core/handPose.ts`); gerechnet wird mit Metern und Quaternionen. Diese eine
 * Umrechnung liegt dazwischen, und sie liegt hier, weil beide Seiten sie
 * brauchen: der Justierstand im Eingaberaum und die Werkzeugseite im Netz.
 */
export function poseOfHand(pose: HandPose): Pose {
  return {
    position: { x: pose.x / 100, y: pose.y / 100, z: pose.z / 100 },
    rotation: quatFromEulerXYZ({
      x: (pose.pitch * Math.PI) / 180,
      y: (pose.yaw * Math.PI) / 180,
      z: (pose.roll * Math.PI) / 180,
    }),
  };
}

/** `a` und danach `b`, von `a` aus gesehen: erst drehen, dann versetzen. */
export function composePose(a: Pose, b: Pose): Pose {
  const offset = rotateVec(b.position, a.rotation, { x: 0, y: 0, z: 0 });
  return {
    position: {
      x: a.position.x + offset.x,
      y: a.position.y + offset.y,
      z: a.position.z + offset.z,
    },
    rotation: normalize(multiplyQuat(a.rotation, b.rotation, { x: 0, y: 0, z: 0, w: 1 })),
  };
}

/** Die Umkehrung einer Pose: `composePose(a, invertPose(a))` ist die Ruhe. */
export function invertPose(a: Pose): Pose {
  const rotation = conjugate(a.rotation, { x: 0, y: 0, z: 0, w: 1 });
  const position = rotateVec(a.position, rotation, { x: 0, y: 0, z: 0 });
  return {
    position: { x: -position.x, y: -position.y, z: -position.z },
    rotation,
  };
}

/**
 * Die Lage eines Werkzeugs **im Griff**, Zielkorrektur eingerechnet.
 *
 * Ein gehaltenes Werkzeug hängt nicht schlicht in der gespeicherten Drehung,
 * sondern hinter der Drehung, die es aus dem Griff auf den Zeigestrahl legt
 * (`Tool.applyHold`). Wer im Raum des Griffs rechnet, muss deshalb genau diese
 * Kette nachbauen — sonst stünde die Hand am Stand um jene 30° verdreht da,
 * die zwischen Faust und Strahl liegen.
 *
 * @param aim die Zielkorrektur der Hand, oder die Ruhe für ein Werkzeug, das
 *            fest in der Faust sitzt (`alignToAim === false`).
 */
export function toolInGrip(hold: HoldPose, aim: Quat): Pose {
  return {
    position: hold.position,
    rotation: normalize(multiplyQuat(aim, hold.rotation, { x: 0, y: 0, z: 0, w: 1 })),
  };
}

/**
 * Wo die Boxhand am Werkzeug hängt — in dessen eigenem Raum.
 *
 * @param local die Lage des Werkzeugs im Griff (`toolInGrip`)
 * @param hand  die Handhaltung, im Raum des Griffs
 */
export function ghostOnTool(local: Pose, hand: Pose): Pose {
  return composePose(invertPose(local), hand);
}

/**
 * Und zurück: die Handhaltung, die die Boxhand genau dorthin brächte.
 *
 * Die exakte Umkehrung von `ghostOnTool` — der Test schiebt eine Haltung
 * einmal hin und einmal zurück und verlangt dieselbe wieder.
 */
export function handFromGhost(local: Pose, ghost: Pose): Pose {
  return composePose(local, ghost);
}

function normalize(q: Quat): Quat {
  const length = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
}
