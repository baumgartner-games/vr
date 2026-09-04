/**
 * **Ein Griff für alle Werkzeuge** — wo er im Werkzeug sitzen muss, damit er in
 * der Faust immer an derselben Stelle liegt.
 *
 * Bisher hatte jedes Werkzeug seinen eigenen Griff, und weil jeder für sich
 * hingesetzt wurde, saß keiner wie der andere: sieben Werkzeuge werden genau
 * gleich gehalten, und ihre Griffe standen bis zu **24° gegeneinander** verdreht
 * und bis zu **2,8 cm** auseinander (der Duplizierer und das Holster lehnten
 * sogar in die *falsche* Richtung). Gemeinsam war ihnen nur die Faust: dieselben
 * sechs Zahlen für alle, und damit passte sie zu höchstens einem von ihnen
 * richtig.
 *
 * Die Umkehrung ist der Ausweg: **nicht der Griff folgt dem Werkzeug, sondern
 * das Werkzeug dem Griff.** Ein Griff ist ein Ding mit einer festen Lage in der
 * Faust — hier steht sie —, und ein Werkzeug baut ihn an der Stelle ein, an der
 * er dort landet. Wer das tut, bekommt die Faust geschenkt und muss nie wieder
 * an den zweiten Justierstand.
 *
 * ## Der Rahmen eines Griffs
 *
 * ```
 *        +Y  Achse, oben aus der Faust heraus (Daumenseite)
 *         |
 *         |     -Z  „vorne": wohin der Zeigefinger zeigt
 *         |    /
 *         |   /
 *         +--------- +X
 * ```
 *
 * Das ist genau der Rahmen des Pistolengriffs: seine Achse steht senkrecht in
 * der Faust, und der Zeigefinger zeigt dorthin, wohin der Lauf zeigt. Deshalb
 * gilt für alles, was **wie eine Pistole** gehalten wird: `-Z` des Griffs *ist*
 * die Zielrichtung des Werkzeugs, und der Griff sitzt unverdreht darin.
 *
 * ## Zwei Griffe, nicht einer
 *
 * Eine **Taschenlampe** hält man nicht wie eine Pistole, und das ist keine
 * Nachlässigkeit, sondern Geometrie: ihr Rohr liegt *entlang* der Griffachse und
 * nicht quer dazu. Derselbe Zylinder, dieselbe Faust — aber das Werkzeug hängt
 * um eine Vierteldrehung anders daran, und damit zeigt sein Kegel nicht dorthin,
 * wo der Zeigefinger zeigt. Es gibt deshalb **zwei** Standardgriffe:
 *
 * - `pistol` — quer zur Achse angebaut, `-Z` ist die Zielrichtung. Pistole,
 *   Duplizierer, Inspektor, Teleporter, Größe & Position, Holster, Greifhaken.
 * - `rod` — längs der Achse angebaut, das Werkzeug liegt in der Faust wie ein
 *   Stab. Taschenlampe und Lötkolben.
 *
 * Beide Lagen sind **eingemessen und nicht erfunden**: die eine ist der
 * Pistolengriff, wie er heute im Spiel liegt, die andere die am Justierstand
 * eingemessene Taschenlampe (Konfig-Code `BPNDLdWgZ9NvBevCHScPckXK`). Dass die
 * beiden Messungen zusammenpassen, sagt eine Zahl: der Stabgriff steht mit
 * **-59,2°** Pitch in der Hand, und die eingemessene *Faust* der Taschenlampe
 * hat **-59°**. Zwei getrennt gemessene Größen, dieselbe Zahl — das ist der
 * Beleg dafür, dass hier wirklich ein Zylinder in einer Faust liegt und nicht
 * zwei Zufälle nebeneinander.
 *
 * ## Warum sich `aim` dabei herauskürzt
 *
 * Ein gehaltenes Werkzeug liegt bei `(holdPosition, aim · holdRotation)` — der
 * Ort im Griffraum, die Drehung im Strahlraum (`Tool.applyHold`). Der Griff
 * darin sitzt also bei
 *
 * ```
 * Ort     = holdPosition + (aim · holdRotation) · gripPosition
 * Drehung = aim · holdRotation · gripRotation
 * ```
 *
 * Verlangt man, dass das für zwei Werkzeuge dasselbe ergibt, und haben beide
 * **dieselbe `holdPosition`**, dann steht auf beiden Seiten dasselbe `aim` und
 * kürzt sich weg. Übrig bleiben zwei Gleichungen ohne Brille darin:
 *
 * ```
 * holdRotation · gripRotation = STANDARD.rotation
 * holdRotation · gripPosition = STANDARD.position
 * ```
 *
 * Das ist alles, was diese Datei rechnet — einmal vorwärts (`gripInTool`),
 * einmal rückwärts (`holdForGrip`), und einmal als Maßband für das, was schon
 * gebaut ist (`gripDeviation`).
 *
 * Ohne three.js, wie `aim.ts` und `toolPose.ts`.
 */

import { IDENTITY, conjugate, multiplyQuat, rotateVec, type Quat, type Vec3 } from './aim';
import { quatFromEulerXYZ, type HoldPose } from './toolPose';
import type { GripKind } from '../../../core/handPose';

/** Wo ein Griff liegt: derselbe Aufbau wie eine `HoldPose`. */
export type GripPose = HoldPose;

/**
 * Die `holdPosition`, die jedes Werkzeug **mit diesem Griff** trägt.
 *
 * Geteilt sein muss sie, sonst kürzt sich `aim` oben nicht weg — aber nur
 * innerhalb einer Griffart, denn zwei Griffarten haben ohnehin zwei Fäuste. Und
 * geteilt *ist* sie beinahe schon: die Pistole nimmt sie aus `Tool`, fünfzehn
 * andere Werkzeuge schrieben `(0, -1, 2)` cm hin, einen Zentimeter daneben.
 *
 * Beide Zahlen sind die des Werkzeugs, das die Griffart definiert — die Pistole,
 * wie sie gebaut ist, und die am ersten Justierstand eingemessene Taschenlampe.
 */
export const GRIP_HOLD_POSITIONS: Record<GripKind, Vec3> = {
  pistol: { x: 0, y: -0.012, z: 0.03 },
  rod: { x: 0.008, y: -0.014, z: 0.038 },
};

/**
 * Wo die beiden Standardgriffe in der Hand liegen — Ort im Griffraum, Drehung
 * im Strahlraum, beide gemessen an dem Werkzeug, das sie definiert.
 *
 * `pistol` ist der Griff der Pistole, wie er heute dort steht: 5,5 cm unter dem
 * Nullpunkt, 12,6° nach hinten gelehnt. `rod` ist die eingemessene
 * Taschenlampe: ihr Rohr liegt in der Faust, also ihre Griffachse auch.
 */
export const STANDARD_GRIPS: Record<GripKind, GripPose> = {
  pistol: {
    position: { x: 0, y: -0.055, z: 0.01 },
    rotation: quatFromEulerXYZ({ x: -0.22, y: 0, z: 0 }),
  },
  rod: {
    // = holdRotation der Lampe · (Achse auf das Rohr drehen)
    position: rotateVec(
      { x: 0, y: 0, z: -0.03 },
      quatFromEulerXYZ({ x: (30 * Math.PI) / 180, y: (5 * Math.PI) / 180, z: (9 * Math.PI) / 180 }),
      { x: 0, y: 0, z: 0 },
    ),
    rotation: normalize(
      multiplyQuat(
        quatFromEulerXYZ({
          x: (30 * Math.PI) / 180,
          y: (5 * Math.PI) / 180,
          z: (9 * Math.PI) / 180,
        }),
        quatFromEulerXYZ({ x: -Math.PI / 2, y: 0, z: 0 }),
        { x: 0, y: 0, z: 0, w: 1 },
      ),
    ),
  },
};

/**
 * Wo der Griff **im Werkzeug** sitzen muss, damit er in der Faust dort landet,
 * wo er hingehört.
 *
 * Die Antwort auf die Frage, die ein Werkzeug beim Bauen stellt: „ich liege so
 * und so in der Hand — wohin kommt mein Griff?"
 *
 * @param hold die `holdRotation` des Werkzeugs, also seine Zusatzneigung gegen
 *             die Zielrichtung. Für alles, was schlicht nach vorn zeigt, die Ruhe.
 */
export function gripInTool(kind: GripKind, hold: Quat = IDENTITY): GripPose {
  const standard = STANDARD_GRIPS[kind];
  const inverse = conjugate(hold, { x: 0, y: 0, z: 0, w: 1 });
  return {
    position: rotateVec(standard.position, inverse, { x: 0, y: 0, z: 0 }),
    rotation: normalize(multiplyQuat(inverse, standard.rotation, { x: 0, y: 0, z: 0, w: 1 })),
  };
}

/**
 * Und rückwärts: wie das Werkzeug in der Hand liegen **muss**, wenn sein Griff
 * dort sitzt, wo er sitzt.
 *
 * Das ist der Weg für alles, dessen Griff nicht frei wählbar ist — das Rohr
 * einer Taschenlampe liegt, wo es liegt, und die Lampe hat sich danach zu
 * richten. Die `holdPosition` ist dabei nicht frei: sie ist `GRIP_HOLD_POSITION`,
 * und das Werkzeug hat seinen Griff an `gripInTool(kind, hier)` zu setzen —
 * `gripDeviation` sagt, ob es das getan hat.
 */
export function holdForGrip(kind: GripKind, gripRotation: Quat): Quat {
  return normalize(
    multiplyQuat(
      STANDARD_GRIPS[kind].rotation,
      conjugate(gripRotation, { x: 0, y: 0, z: 0, w: 1 }),
      { x: 0, y: 0, z: 0, w: 1 },
    ),
  );
}

/** Wie weit ein gebauter Griff von seinem Standard abweicht. */
export interface GripDeviation {
  /** Abstand in Metern, im Strahlrahmen gemessen. */
  distance: number;
  /** Winkel in Grad — die kürzeste Drehung zwischen beiden Lagen. */
  angle: number;
}

/**
 * Das Maßband: wie weit liegt der Griff dieses Werkzeugs neben dem Standard?
 *
 * Gemessen wird im **Strahlrahmen**, also mit `holdRotation` eingerechnet und
 * `aim` herausgekürzt — genau die beiden Größen aus der Rechnung oben. Ein
 * Werkzeug mit `distance` und `angle` bei null trägt einen Standardgriff und
 * darf sich die Faust dazu nehmen; alles darüber ist die Zahl, die man kennen
 * will, bevor man es behauptet.
 */
export function gripDeviation(kind: GripKind, hold: Quat, grip: GripPose): GripDeviation {
  const standard = STANDARD_GRIPS[kind];
  const position = rotateVec(grip.position, hold, { x: 0, y: 0, z: 0 });
  const rotation = multiplyQuat(hold, grip.rotation, { x: 0, y: 0, z: 0, w: 1 });
  const delta = conjugate(rotation, { x: 0, y: 0, z: 0, w: 1 });
  const between = multiplyQuat(delta, standard.rotation, { x: 0, y: 0, z: 0, w: 1 });
  return {
    distance: Math.hypot(
      position.x - standard.position.x,
      position.y - standard.position.y,
      position.z - standard.position.z,
    ),
    angle: (2 * Math.acos(Math.min(1, Math.abs(between.w))) * 180) / Math.PI,
  };
}

function normalize(q: Quat): Quat {
  const length = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
}
