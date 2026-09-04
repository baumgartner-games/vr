/**
 * How a hand looks: where it sits on the controller, and how far its fingers
 * are curled.
 *
 * Two kinds of pose share this shape. The **idle** pose is the hand with
 * nothing in it — the one you see most of the time, so a millimetre off is a
 * millimetre off all evening. A **hold** pose belongs to one tool: the hand
 * wraps around a pistol grip differently than it holds a picture frame up in
 * front of your face.
 *
 * The numbers are the ones a human types: centimetres and degrees, curls from
 * 0 (straight) to 1 (closed). That is what makes `mirrorHandPose` honest —
 * mirroring the left hand's setting into the right one is a sign flip on
 * three of them, nothing more.
 *
 * No three.js in here: `HandVisuals` turns these numbers into objects, and
 * this file stays testable.
 */

import type { Handedness } from './XRInput';

/** Thumb, index, middle, ring, pinky — the order everything uses. */
export const FINGER_NAMES = ['Daumen', 'Zeige', 'Mittel', 'Ring', 'Kleiner'] as const;

export interface HandPose {
  /** Offset from the grip, in centimetres. */
  x: number;
  y: number;
  z: number;
  /** Tilt in degrees, read as a three.js `Euler` with order `XYZ`. */
  pitch: number;
  yaw: number;
  roll: number;
  /** Curl per finger, 0 = straight, 1 = closed. Always five entries. */
  curls: number[];
  /** How far the fingers fan out sideways, in degrees. */
  spread: number;
}

/** The hand as it was built: on the grip, barely curled, not turned at all. */
export const IDLE_HAND_POSE: HandPose = {
  x: 0,
  y: 0,
  z: 0,
  pitch: 0,
  yaw: 0,
  roll: 0,
  curls: [0.1, 0.08, 0.08, 0.1, 0.12],
  spread: 0,
};

/**
 * Die **eingemessene** Grundhaltung der linken Hand am Controller.
 *
 * Die gebaute Haltung darüber sitzt genau auf dem Griffpunkt und schaut
 * geradeaus — das ist die Haltung, aus der die Hand *gebaut* ist, und keine, in
 * der je eine echte Hand einen Controller gehalten hat. Ein Quest-Controller
 * liegt schräg in der Faust, und wie schräg, sagt nur eine Messung im
 * Eingaberaum.
 *
 * Gemessen wurde **zweimal**, einmal je Hand, und die beiden Messungen sind
 * nicht dasselbe. Rechts kam heraus: x 0,5 · y -0,4 · z 1,2 cm, Pitch -90°,
 * Yaw 45°, Roll 0°. Links, später und in Ruhe nachgemessen, die Zahlen unten —
 * gespiegelt also x 0,3 · y 2,7 · z 3,8 cm, Pitch 75°, Yaw 45°, Roll -5°.
 * Quer, Yaw und Roll passen zusammen; **Höhe, Tiefe und vor allem die Neigung
 * nicht**: 75° gegen -90° sind 165° auseinander, und das ist keine
 * Messtoleranz, sondern zwei verschiedene Haltungen. Eine von beiden ist
 * danebengegangen.
 *
 * Es gilt deshalb die **spätere** Messung, und sie gilt für **beide** Hände:
 * links wie gemessen, rechts als deren Spiegelung. Zwei getrennt gepflegte
 * Zahlenreihen wären genau die Sorte Abweichung, die niemand merkt — eine
 * Hand, die anders sitzt als die andere, sieht man nicht, man wundert sich nur.
 * Wer die andere Messung für die richtige hält, dreht hier eine Konstante um
 * und misst nicht zwei.
 */
export const IDLE_HAND_POSE_LEFT: HandPose = {
  ...IDLE_HAND_POSE,
  x: -0.3,
  y: 2.7,
  z: 3.8,
  pitch: 75,
  yaw: -45,
  roll: 5,
};

/**
 * Und dieselbe Haltung für rechts — **abgeleitet**, nicht daneben getippt.
 * Steht hier trotzdem als eigener Name, weil man beide Zahlenreihen sehen
 * können muss, ohne sie im Kopf zu spiegeln.
 */
export const IDLE_HAND_POSE_RIGHT: HandPose = mirrorHandPose(IDLE_HAND_POSE_LEFT);

/** Die Grundhaltung, mit der eine Hand ausgeliefert wird. */
export function defaultIdlePose(hand: Handedness): HandPose {
  return clonePose(hand === 'left' ? IDLE_HAND_POSE_LEFT : IDLE_HAND_POSE_RIGHT);
}

/**
 * The pseudo tool id the hand uses while it is carrying a **prop**.
 *
 * A hand around a companion cube is not the hand that holds a pistol, and it
 * is not the empty hand either — so it gets a hold pose of its own, dialled in
 * and mirrored exactly like a tool's. Using a tool id for it means the whole
 * machinery (the menu, the config code, the adjustment tool) works on it
 * without knowing that this one is not a tool.
 */
export const GRAB_POSE_ID = 'grab';

/** A fist around a grip — the starting point for holding a tool. */
export const HOLD_HAND_POSE: HandPose = {
  x: 0,
  y: 0,
  z: 0,
  pitch: 0,
  yaw: 0,
  roll: 0,
  curls: [0.55, 0.35, 0.85, 0.9, 0.9],
  spread: 0,
};

/**
 * Welchen **Standardgriff** ein Werkzeug trägt.
 *
 * Zwei, und beide sind derselbe Zylinder in derselben Faust — sie hängen nur
 * verschieden daran:
 *
 * - `pistol` — quer zur Griffachse angebaut. Der Zeigefinger zeigt dorthin,
 *   wohin das Werkzeug zeigt, und deshalb liegt die Faust an einer Pistole so
 *   selbstverständlich, dass dort nie etwas einzustellen war.
 * - `rod` — längs der Griffachse angebaut, das Werkzeug liegt in der Faust wie
 *   ein Stab. Eine Taschenlampe ist das: ihr Kegel geht dort hinaus, wo bei der
 *   Pistole der Lauf sitzt, also *kann* sie nicht wie eine Pistole liegen.
 *
 * Wo die beiden Griffe im Werkzeug sitzen müssen, rechnet
 * `worlds/portal/tools/gripFit.ts` — hier steht nur, welche **Faust** dazu
 * gehört.
 */
export type GripKind = 'pistol' | 'rod';

/**
 * Die Faust **je Standardgriff** — gemessen an der *rechten* Hand.
 *
 * Und das ist der ganze Punkt: nicht je Werkzeug. Wer denselben Zylinder auf
 * dieselbe Weise anbaut, hält ihn auch gleich, und dann ist eine zweite Messung
 * keine zweite Auskunft, sondern eine zweite Gelegenheit, daneben zu liegen. Es
 * gibt so viele Fäuste, wie es Arten gibt, ein Ding anzufassen — zwei —, und
 * nicht so viele, wie es Werkzeuge gibt.
 *
 * Beide gelten für **beide** Hände: rechts wie gemessen, links als deren
 * Spiegelung. Zwei getrennt gepflegte Zahlenreihen wären genau die Sorte
 * Abweichung, die niemand bemerkt — eine Hand, die anders greift als die
 * andere, sieht man nicht, man wundert sich nur.
 */
export const GRIP_HAND_POSES: Record<GripKind, HandPose> = {
  // Die gebaute Faust: sie sitzt auf dem Griffpunkt und schaut geradeaus, und an
  // einer Pistole sieht das richtig aus — deshalb stand hier für sie nie etwas
  // anderes.
  pistol: HOLD_HAND_POSE,
  // Am zweiten Justierstand an der **Taschenlampe** eingemessen und als
  // Konfig-Code `BPNDLdWgZ9NvBevCHScPckXK` übergeben — rechte Hand. Die Werte
  // davor (x 4 · y -2,8 · z 1,7 cm, -44/26/-105°) waren die erste Runde am
  // Stand und liegen rund 15° daneben; es gilt die spätere Messung. Sie gilt ab
  // jetzt für **jeden** Stabgriff und nicht mehr nur für die Lampe.
  rod: {
    ...HOLD_HAND_POSE,
    x: 3.6,
    y: -1.8,
    z: 2.5,
    pitch: -59,
    yaw: 23,
    roll: -99,
  },
};

/**
 * Welches Werkzeug welchen Standardgriff trägt.
 *
 * Eine Tabelle und keine Frage an das Werkzeug, weil eine Hand gezeichnet wird,
 * lange bevor irgendwo ein Werkzeug gebaut ist — und weil eine Liste, die man
 * lesen kann, hier mehr wert ist als eine, die man sich zusammensuchen muss.
 * Dass sie zu dem passt, was die Werkzeuge wirklich anbauen, hält
 * `worlds/portal/tools/gripFit.test.ts` fest.
 */
export const TOOL_GRIPS: Record<string, GripKind> = {
  pistol: 'pistol',
  duplicator: 'pistol',
  inspect: 'pistol',
  teleport: 'pistol',
  gizmo: 'pistol',
  holster: 'pistol',
  grapple: 'pistol',
  flashlight: 'rod',
  welder: 'rod',
};

/**
 * Die gebaute Haltung, in der eine Hand ein bestimmtes Werkzeug hält.
 *
 * Trägt es einen Standardgriff, ist es die Faust zu diesem Griff — für die linke
 * Hand gespiegelt. Trägt es keinen, bleibt die allgemeine Faust: sie ist kein
 * Ergebnis, sondern ein Anfang, und dann führt der Weg über den zweiten
 * Justierstand. Der Speicher legt sich über beides, wenn jemand selbst justiert
 * hat (`handPoseStore.ts`).
 */
export function defaultHoldPose(hand: Handedness, toolId: string): HandPose {
  const kind = TOOL_GRIPS[toolId];
  if (!kind) return clonePose(HOLD_HAND_POSE);
  const measured = GRIP_HAND_POSES[kind];
  return hand === 'right' ? clonePose(measured) : mirrorHandPose(measured);
}

/** What the value editor offers, in the order it lists them. */
export const HAND_FIELDS: ReadonlyArray<{
  key: keyof HandPose | `curl${0 | 1 | 2 | 3 | 4}`;
  label: string;
  unit: string;
  min: number;
  max: number;
}> = [
  { key: 'x', label: 'X (rechts)', unit: 'cm', min: -30, max: 30 },
  { key: 'y', label: 'Y (hoch)', unit: 'cm', min: -30, max: 30 },
  { key: 'z', label: 'Z (vor)', unit: 'cm', min: -30, max: 30 },
  { key: 'pitch', label: 'Pitch', unit: '°', min: -180, max: 180 },
  { key: 'yaw', label: 'Yaw', unit: '°', min: -180, max: 180 },
  { key: 'roll', label: 'Roll', unit: '°', min: -180, max: 180 },
  { key: 'curl0', label: 'Daumen', unit: '', min: 0, max: 1 },
  { key: 'curl1', label: 'Zeigefinger', unit: '', min: 0, max: 1 },
  { key: 'curl2', label: 'Mittelfinger', unit: '', min: 0, max: 1 },
  { key: 'curl3', label: 'Ringfinger', unit: '', min: 0, max: 1 },
  { key: 'curl4', label: 'Kleiner Finger', unit: '', min: 0, max: 1 },
  { key: 'spread', label: 'Spreizung', unit: '°', min: -30, max: 30 },
];

/** Reads one editable field out of a pose. */
export function handPoseField(pose: HandPose, key: string): number {
  const curl = curlIndex(key);
  if (curl !== null) return pose.curls[curl] ?? 0;
  return (pose as unknown as Record<string, number>)[key] ?? 0;
}

/** The same pose with one field replaced — never the one that was passed in. */
export function setHandPoseField(pose: HandPose, key: string, value: number): HandPose {
  const next = clonePose(pose);
  const curl = curlIndex(key);
  if (curl !== null) next.curls[curl] = value;
  else if (key in next) (next as unknown as Record<string, number>)[key] = value;
  return next;
}

/**
 * The same pose for the other hand.
 *
 * Both hands are mirror images of one another across the body's middle, so a
 * setting measured on one is worth having on the other: sideways offset and
 * the two turns around the up and forward axes flip sign, the rest — pitch,
 * every finger, the spread — stays exactly as it was. (In quaternions that is
 * `(x, -y, -z, w)`; in the `XYZ` angles here it is precisely these two signs.)
 */
export function mirrorHandPose(pose: HandPose): HandPose {
  const mirrored = clonePose(pose);
  // `+ 0` macht aus dem `-0`, das eine gespiegelte Null sonst wird, wieder
  // eine Null — auf einem Schild voller kleiner Zahlen liest sich „-0" wie ein
  // Fehler, und im Konfig-Code wäre es einer.
  mirrored.x = -pose.x + 0;
  mirrored.yaw = -pose.yaw + 0;
  mirrored.roll = -pose.roll + 0;
  return mirrored;
}

/** Numbers only, for the config code: 6 pose values, 5 curls, 1 spread. */
export function handPoseToArray(pose: HandPose): number[] {
  return [
    pose.x,
    pose.y,
    pose.z,
    pose.pitch,
    pose.yaw,
    pose.roll,
    ...normalizeCurls(pose.curls),
    pose.spread,
  ];
}

/** The inverse, tolerant of a short or overlong array from an older code. */
export function handPoseFromArray(values: readonly number[], fallback = IDLE_HAND_POSE): HandPose {
  const at = (index: number, spare: number): number =>
    Number.isFinite(values[index]) ? (values[index] as number) : spare;
  return {
    x: at(0, fallback.x),
    y: at(1, fallback.y),
    z: at(2, fallback.z),
    pitch: at(3, fallback.pitch),
    yaw: at(4, fallback.yaw),
    roll: at(5, fallback.roll),
    curls: normalizeCurls(fallback.curls).map((spare, i) => at(6 + i, spare)),
    spread: at(11, fallback.spread),
  };
}

export function clonePose(pose: HandPose): HandPose {
  return { ...pose, curls: normalizeCurls(pose.curls) };
}

/** One line for a display: the six numbers, then the five fingers. */
export function formatHandPose(pose: HandPose): string {
  const curls = normalizeCurls(pose.curls)
    .map((value) => value.toFixed(2))
    .join('/');
  return (
    `x ${pose.x} y ${pose.y} z ${pose.z} cm · ` +
    `${pose.pitch}/${pose.yaw}/${pose.roll}° · ${curls}`
  );
}

function normalizeCurls(curls: readonly number[]): number[] {
  return [0, 1, 2, 3, 4].map((i) => (Number.isFinite(curls[i]) ? (curls[i] as number) : 0));
}

function curlIndex(key: string): number | null {
  const match = /^curl([0-4])$/.exec(key);
  return match ? Number(match[1]) : null;
}
