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
 * **Die eine Faust am Standardgriff** — rechte Hand, links als Spiegelung.
 *
 * Nicht eine je Werkzeug, und seit dieser Runde auch nicht mehr eine je
 * Griffart: **eine**. Der Grund ist Geometrie und keine Ordnungsliebe. Ein
 * Griff ist ein Zylinder, eine Faust schließt sich um genau eine Stelle in
 * ihr, und wenn derselbe Zylinder in derselben Faust liegt, dann liegt er
 * *dort* — es gibt keine zweite Stelle, an der er auch noch liegen könnte.
 * Zwei Fäuste hießen deshalb immer schon zwei Zylinder an zwei Orten, und
 * damit zwei Werkzeuge, die verschieden in der Hand liegen, obwohl sie
 * denselben Griff tragen.
 *
 * Sie ist **gerechnet und nicht geschätzt**: die Lage, in der die gekrümmten
 * Finger den Standardgriff umschließen — Faustachse auf der Griffachse, und die
 * **Fingerlinie auf der Grifflinie**, also der Zeigefinger dorthin, wohin auch
 * der rosa Pfeil des Griffs zeigt (`worlds/portal/tools/gripFit.ts`,
 * nachgerechnet in `core/gripFist.test.ts`). Wer den Griff verschiebt, rechnet
 * sie neu, statt sie neu zu erraten.
 *
 * Dass die Hand dabei **schräg** am Griff steht, ist der Punkt und nicht ein
 * Rest: der Zeigefinger liegt am Trigger, ist also halb gekrümmt und zeigt rund
 * 58° unter der Handachse hindurch. Ein Griff ist gegen die Hand geneigt, wie
 * an jeder echten Waffe, und diese Neigung *ist* die Krümmung des Fingers, der
 * auf den Lauf zeigen soll. Legte man stattdessen die Handachse gerade auf die
 * Grifflinie, läge die Faust zwar um den Zylinder, der Finger zeigte aber 58°
 * am Lauf vorbei nach unten.
 *
 * Vorher standen hier zwei von Hand eingestellte Zahlenreihen, und **keine von
 * beiden** hielt ihren Griff wirklich: die gebaute Faust lag 6,7 cm daneben und
 * um 90° verdreht — sie umschloss nichts, sie stand quer zum Zylinder —, die am
 * Stabgriff eingemessene 3,2 cm daneben und 30° verdreht. Man sieht so etwas in
 * der Brille nicht als Fehler; man sieht eine Hand, die ein Werkzeug irgendwie
 * festhält, und wundert sich, warum es nie ganz sitzt.
 */
export const GRIP_HAND_POSE: HandPose = {
  ...HOLD_HAND_POSE,
  x: -1.1,
  y: 2.6,
  z: 2.8,
  pitch: -43,
  yaw: -58,
  roll: -90,
};

/**
 * Welche Werkzeuge den **Standardgriff** tragen — und damit die Faust dazu.
 *
 * Eine Liste und keine Frage an das Werkzeug, weil eine Hand gezeichnet wird,
 * lange bevor irgendwo ein Werkzeug gebaut ist. Dass sie zu dem passt, was die
 * Werkzeuge wirklich anbauen, hält `worlds/portal/tools/gripMount.test.ts` fest.
 *
 * Was hier fehlt, fehlt mit Grund — der Wurfstern fliegt aus den Fingern, die
 * drei Handschuhe und die Flügel werden angezogen, Hammer und Drohne bringen
 * ihre eigenen Griffe mit, und Boxhand und Controller *sind* die Hand.
 */
export const STANDARD_GRIP_TOOLS: ReadonlySet<string> = new Set([
  // Der Griff selbst — das Werkzeug, an dem man die Faust einstellt.
  'grip',
  'pistol',
  'duplicator',
  'inspect',
  'teleport',
  'gizmo',
  'holster',
  'grapple',
  'gun-blue',
  'gun-red',
  'gun-dual',
  'brush',
  'tape',
  'eraser',
  'xray',
  'stopwatch',
  // Die drei, die bis eben am **Stabgriff** hingen. Ein Stabgriff war der
  // Versuch, ein Rohr *entlang* der Faustachse zu halten — und das geht nur,
  // solange man dafür eine zweite Faust in Kauf nimmt und hinnimmt, dass so ein
  // Werkzeug 30° neben dem Zeigestrahl leuchtet. Jetzt tragen sie denselben
  // Griff quer darunter, wie eine Lampe mit Griff, und zielen wie alles andere.
  'flashlight',
  'welder',
  'hang-glider',
]);

/**
 * Unter welcher Id die **Faust am Standardgriff** gespeichert wird.
 *
 * Der Kern der Sache: eine Faust gehört zu einem *Griff* und nicht zu einem
 * Werkzeug. Zwanzig Werkzeuge mit demselben Zylinder in derselben Hand haben
 * eine Haltung und nicht zwanzig — wer sie zwanzigmal einstellt, stellt
 * neunzehnmal dasselbe ein und einmal etwas anderes, ohne es zu merken.
 *
 * Es ist eine Werkzeug-Id und keine neue Art von Schlüssel, und das ist
 * Absicht: damit tragen der Speicher (`handPoseStore.ts`), der Konfig-Code und
 * der Kurzcode sie, ohne dass irgendwo ein Format wächst. `grip` ist dabei ein
 * echtes Werkzeug — der **Griff**.
 */
export const GRIP_POSE_ID = 'grip';

/**
 * Die gebaute Haltung, in der eine Hand ein bestimmtes Werkzeug hält.
 *
 * Trägt es den Standardgriff, ist es die Faust dazu — für die linke Hand
 * gespiegelt. Trägt es keinen, bleibt die allgemeine Faust: sie ist kein
 * Ergebnis, sondern ein Anfang, und dann führt der Weg über den zweiten
 * Justierstand. Der Speicher legt sich über beides, wenn jemand selbst justiert
 * hat (`handPoseStore.ts`).
 */
export function defaultHoldPose(hand: Handedness, toolId: string): HandPose {
  if (!STANDARD_GRIP_TOOLS.has(toolId)) return clonePose(HOLD_HAND_POSE);
  return hand === 'right' ? clonePose(GRIP_HAND_POSE) : mirrorHandPose(GRIP_HAND_POSE);
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
