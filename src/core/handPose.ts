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
  /**
   * **Jede Kugel einzeln** — die gemessene Haltung einer blanken Hand, oder
   * `undefined` für eine, die aus Krümmungen besteht.
   *
   * Eine Krümmung ist eine Zahl je Finger, und ein Finger hat drei Knochen:
   * ob er am Grundgelenk knickt oder erst am Mittelgelenk, ob er zur Seite
   * steht oder geradeaus, all das fällt in dieselbe Zahl. Wer eine Haltung an
   * der **echten** Hand misst, hat aber jedes Gelenk vor sich
   * (`handBones.ts`) — und dann ist es Verschwendung, fünfundzwanzig Kugeln
   * auf fünf Zahlen einzudampfen.
   *
   * Also stehen sie hier: je Finger **drei Beugungen und eine Fächerung**, in
   * Grad, in der Reihenfolge Daumen … kleiner Finger — zwanzig Zahlen
   * (`HAND_JOINT_VALUES`). Beugung positiv zur Handfläche hin, Fächerung
   * positiv zur Daumenseite der rechten Hand. Sie gehen unverändert in die
   * Drehungen des Modells; es gibt keinen Faktor dazwischen.
   *
   * **Sie gewinnen über `curls` und `spread`**, solange sie da sind. Die
   * beiden bleiben trotzdem gefüllt und passen dazu: sie sind das, was eine
   * Tafel anzeigt, was in einen Kurzcode geht und was ein Modell mit weniger
   * Knochen daraus macht. Wer eine Krümmung von Hand ändert, wirft die
   * Gelenke weg (`setHandPoseField`) — eine getippte Zahl ist eine Ansage und
   * keine Messung.
   */
  joints?: number[];
}

/** Wie viele Knochen ein Finger in einer gemessenen Haltung hat. */
export const FINGER_BONES = 3;

/** Und wie viele Zahlen er damit belegt: die Beugungen plus die Fächerung. */
export const FINGER_JOINT_VALUES = FINGER_BONES + 1;

/** Zwanzig — fünf Finger zu je vier Zahlen. */
export const HAND_JOINT_VALUES = FINGER_NAMES.length * FINGER_JOINT_VALUES;

/** Was zu einem Finger gehört, aus dem Gelenkteil einer Haltung gelesen. */
export interface FingerJoints {
  /** Die Beugung je Knochen, in Grad, positiv zur Handfläche hin. */
  bends: number[];
  /** Wie weit der Finger an der Wurzel zur Seite steht, in Grad. */
  fan: number;
}

/**
 * Die Gelenke eines Fingers — oder `null`, wenn diese Haltung keine hat.
 *
 * Ein Aufrufer mit weniger Knochen (die gebaute Hand hat zwei je Finger, die
 * gemessene drei) legt die überzähligen Beugungen auf seinen letzten Knochen;
 * das ist genau richtig, denn zwei Knicke hintereinander sind zusammen der
 * eine, den er zeichnen kann.
 */
export function fingerJoints(pose: HandPose, finger: number): FingerJoints | null {
  const joints = pose.joints;
  if (!joints || joints.length < HAND_JOINT_VALUES) return null;
  if (finger < 0 || finger >= FINGER_NAMES.length) return null;
  const at = finger * FINGER_JOINT_VALUES;
  const bends: number[] = [];
  for (let i = 0; i < FINGER_BONES; i++) bends.push(joints[at + i] ?? 0);
  return { bends, fan: joints[at + FINGER_BONES] ?? 0 };
}

/**
 * Die Zahlenreihe zu einer gemessenen Hand — dieselbe Reihenfolge, in der
 * `fingerJoints` sie wieder herausliest.
 */
export function handJointsToArray(
  fingers: ReadonlyArray<{ bends: readonly number[]; fan: number }>,
): number[] {
  const values: number[] = [];
  for (let finger = 0; finger < FINGER_NAMES.length; finger++) {
    const measured = fingers[finger];
    for (let bone = 0; bone < FINGER_BONES; bone++) values.push(round(measured?.bends[bone] ?? 0));
    values.push(round(measured?.fan ?? 0));
  }
  return values;
}

/** Auf ein Zehntelgrad: eine Hand wird nicht genauer gemessen, als sie stillhält. */
function round(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
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
 * **Der Zeigefinger liegt gestreckt am Rahmen, nicht am Abzug** — so, wie eine
 * Hand an einer Waffe liegt, die gerade nicht schießt. Das ist mehr als eine
 * Geste: wie schräg die Hand am Griff steht, sagt die Krümmung genau dieses
 * Fingers, denn die Faust wird um die Griffachse geschwenkt, bis die
 * Fingerlinie auf der Grifflinie liegt. Mit dem Finger am Abzug (Krümmung
 * 0,35) waren das **58°**: die Handfläche stand als schräger Klotz hinter dem
 * Griff, und die Faust sah auf der Werkzeugseite nach allem aus, nur nicht
 * nach einer Hand an einer Pistole — von unten schien sie neben dem Griff zu
 * hängen. Gestreckt (0,1) sind es **17°**: die Handfläche liegt längs an der
 * rechten Seite des Griffs, die drei Finger schließen sich davor, der
 * Zeigefinger zeigt über dem Griff den Lauf entlang. Die anderen Finger sind
 * die der allgemeinen Faust.
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
  x: 1.7,
  y: 2.4,
  z: 2.7,
  pitch: -43,
  yaw: -17,
  roll: -90,
  curls: [0.55, 0.1, 0.85, 0.9, 0.9],
};

/**
 * **Die Faust am Stab** — rechte Hand, links gespiegelt.
 *
 * Derselbe Weg wie beim Standardgriff, ein anderer Zylinder: ein Stab liegt
 * auf der z-Achse des Werkzeugs und läuft durch den Griffpunkt (`poleGrip.ts`,
 * `POLE_GRIP`). Ein Stab hat kein Vorne, also zeigt hier kein Finger etwas an:
 * **alle** Finger sind in der Faust, und die Faust steht ungeschwenkt — die
 * Daumenseite zur Spitze, die Handfläche innen am Stab, wie man einen Hammer
 * hält. Gehalten wird so der Stiel des **Hammers**, und mit demselben Griff in
 * einer anderen Lage das Batterierohr der **Taschenlampe**
 * (`TORCH_HAND_POSE`, gleich darunter). Der Pinsel liegt auf demselben Stab,
 * aber von oben gehalten (`BRUSH_HAND_POSE`); das Messer lag eine Weile auch
 * hier und steht jetzt mit dem Standardgriff in der Faust.
 *
 * **Der Hammer trägt sie nicht mehr.** Sie ist um den Stab an seiner
 * *gebauten* Lage gerechnet (`POLE_HOLD_POSITION`, ungedreht) — und genau die
 * hat der Hammer nicht mehr: seine Lage im Griff ist eingemessen
 * (`HammerTool.HAMMER_HOLD`), und die Faust dazu ist die der echten Hand
 * (`HAMMER_HAND_POSE`). Als Rechnung um einen Stab an dieser Stelle bleibt sie
 * trotzdem stehen, denn die Lampe leitet ihre Faust daraus ab.
 */
export const POLE_HAND_POSE: HandPose = {
  ...HOLD_HAND_POSE,
  x: 2.6,
  y: 1.4,
  z: 0.5,
  pitch: -120,
  yaw: 0,
  roll: -90,
  curls: [0.55, 0.85, 0.85, 0.9, 0.9],
};

/**
 * **Die Faust an der Taschenlampe** — derselbe Stab, um 45° gekippt.
 *
 * Das Batterierohr liegt dort, wo die Hand das Gerät hält (im Griffpunkt, wie
 * der Halterzylinder), aber es steht nicht senkrecht in der Faust: es ist um
 * `TORCH_PITCH` nach vorn gekippt, damit die Lampe nach vorn leuchtet und
 * nicht in die Decke (`FlashlightTool`). Die Faust folgt dem Rohr, also ist es
 * dieselbe Haltung wie am Stab des Hammers, nur um genau diese 45° weiter
 * aufgerichtet — `pitch -75` statt `-120` — und um den Weg verschoben, den die
 * Kippung die Mitte des Rohrs gehen lässt.
 *
 * Gerechnet wie jede andere Faust (`fistOnGrip` um das Rohr an seiner Stelle,
 * nachgerechnet in `core/gripFist.test.ts`) und nicht von Hand verschoben.
 *
 * Zwei Runden lang lag das Rohr an den Enden dieser Strecke: einmal ganz auf
 * dem Halterzylinder der Hand (die Lampe leuchtete 77° an dem vorbei, worauf
 * man zeigte) und einmal ganz auf dem Zeigestrahl (die gezeichnete Hand lag
 * eine Handbreit über der eigenen). Dazwischen liegt die Haltung, in der man
 * eine Stablampe wirklich hält.
 */
export const TORCH_HAND_POSE: HandPose = {
  ...POLE_HAND_POSE,
  x: 2.6,
  y: 2.9,
  z: 0.8,
  pitch: -75,
};

/**
 * **Die Hand am Pinsel** — rechte Hand, links gespiegelt. Und als einzige
 * **keine Faust**.
 *
 * Ein Pinsel wird gehalten wie ein Stift: Daumen und Zeigefinger kneifen den
 * Stiel kurz hinter der Zwinge, der Mittelfinger stützt ihn von unten, Ring-
 * und kleiner Finger liegen eingerollt darunter, und der Stiel läuft nach
 * hinten über die **Schwimmhaut zwischen Daumen und Zeigefinger** aus der Hand
 * heraus. Das ist der Dreipunktgriff, und er ist etwas grundsätzlich anderes
 * als alles andere in dieser Datei: eine Faust legt sich **quer** um einen
 * Zylinder — die Handachse liegt auf der Zylinderachse, die Finger schließen
 * sich senkrecht dazu —, ein Stift liegt **längs** in der Hand, und der
 * Zeigefinger zeigt den Stiel entlang zur Spitze.
 *
 * Deshalb steht sie nicht als `fistOnGrip`-Rechnung da wie die anderen: die
 * kann nur Fäuste. Sie ist trotzdem **gemessen und nicht geraten** — zuerst als
 * Ausgleichsrechnung über vier Berührungen (Daumenkuppe, Zeigefingerkuppe,
 * Mittelgelenk des Mittelfingers, Schwimmhaut), inzwischen **in der Brille
 * nachjustiert** und als Kurzcode abgetippt (`BPGDLMh46J5ruqr3SNVh4H3V`, samt
 * der Lage des Pinsels im Griff — beides steht in `gearShort.test.ts`, damit
 * man sieht, woher die Zahlen kommen). Geprüft wird weiter dieselbe Sache:
 * alle vier Berührungen liegen auf der Oberfläche des Stiels und **umschließen**
 * ihn, statt ihn von einer Seite zu berühren. `core/gripFist.test.ts` misst
 * genau das nach, statt die Zahlen nachzurechnen — was zählt, ist, wo die
 * Finger am gebauten Pinsel landen.
 *
 * Davor lag der Pinsel als **Stab von oben** in der ganzen Faust, wie ein
 * Hammerstiel, den man umdreht. Das war schon besser als die Hammerfaust
 * davor — aber es war weiter eine Faust, und in der Brille sah der Pinsel
 * damit aus wie ein Werkzeug und nicht wie ein Stift. Der Unterschied ist
 * genau der, um den es auf der Werkzeugseite geht: **echt** hält man ihn wie
 * jedes andere Werkzeug (der Controller liegt in der Faust), **gezeichnet**
 * wie einen Stift.
 */
export const BRUSH_HAND_POSE: HandPose = {
  ...HOLD_HAND_POSE,
  x: 0.7,
  y: 3.2,
  z: 4.5,
  pitch: 31,
  yaw: -35,
  roll: -6,
  curls: [0.35, 0.45, 0.55, 0.9, 1],
};

/**
 * **Die Faust um die Stoppuhr** — rechte Hand, links gespiegelt, und
 * **gemessen statt gerechnet**.
 *
 * Es ist die Faust der **echten Hand** am Halterzylinder (`GRIP_HAND_POSE`):
 * die Uhr wird so gehalten, wie der Controller in der Hand liegt, und sie ist
 * dorthin gelegt worden, wo sie in dieser Faust hingehört (`StopwatchTool.ts`,
 * `RIM_HOLD`/`RIM_TILT`, aus dem Kurzcode `BPMMCn6HFri5P_Ryc_jWiuiUGnVuWEQ`).
 * Ihre seitliche Kante läuft dabei weiterhin durch die Faust — knapp einen
 * Zentimeter neben deren Achse und um zehn Grad dagegen gedreht, so genau, wie
 * eine Hand in einer Brille eben misst (`core/gripFist.test.ts` rechnet es
 * nach).
 *
 * Davor war sie **gerechnet**: die Faust um die gekippte Kante, mit dem Daumen
 * oben auf der Krone und dem Zifferblatt zum Gesicht — die Haltung eines
 * Zeitnehmers auf einem Foto. Die Rechnung war richtig, und die Uhr lag
 * trotzdem daneben, weil sie von der *gebauten* Lage der Uhr ausging und nicht
 * von der, in der eine Hand sie wirklich hält. Wo Messung und Rechnung sich
 * widersprechen, gilt hier die Messung.
 */
export const STOPWATCH_HAND_POSE: HandPose = {
  ...GRIP_HAND_POSE,
  curls: [...GRIP_HAND_POSE.curls],
};

/**
 * **Die Faust am Hammer** — rechte Hand, links gespiegelt, und ebenfalls
 * gemessen.
 *
 * Dieselbe Faust wie an der Pistole, denn es ist dieselbe Hand am selben
 * Controller: der Stiel ist dorthin gelegt worden, wo er in ihr liegt
 * (`HammerTool.ts`, `HAMMER_HOLD`/`HAMMER_TILT`, aus dem Kurzcode
 * `BPcMCn7Vw2xWajnzvwfCTCQjsWgsnUF`). Der Stab läuft dabei praktisch durch die
 * Faustmitte — zwei Millimeter daneben —, nur eben schräg über die Handfläche
 * statt genau quer.
 *
 * Vorher trug der Hammer die gerechnete Faust am Stab (`POLE_HAND_POSE`).
 */
export const HAMMER_HAND_POSE: HandPose = {
  ...GRIP_HAND_POSE,
  curls: [...GRIP_HAND_POSE.curls],
};

/**
 * **Die Faust am Saum des Beutels** — rechte Hand, links gespiegelt.
 *
 * Der Beutel wird **von außen** gehalten wie eine **offene Kappe**, in die man
 * etwas hineinlegt: er hängt vor der Hand, sein Saum läuft durch den
 * Griffpunkt, und die Hand liegt waagerecht darunter — Handfläche nach oben,
 * die Finger greifen vorn über den Saum hinein, der Daumen liegt außen am Saum
 * entlang (`MagicBagTool.ts`, `BAG_GRIP`). Die erste Fassung hatte die Hand
 * senkrecht wie an einem Eimer; um 90° gekippt ist es eine Kappe.
 *
 * **Ohne Zielkorrektur** gerechnet, wie alles, was in der Faust sitzt: der
 * Beutel liegt im Griffraum und folgt der Hand in allen drei Achsen — er
 * steht gegenüber einem Griff ohne Rollen **unverdreht**, und die Faust gehört
 * genau dorthin. Zwei Zwischenschritte liegen dahinter: erst hing er nur an
 * der Gierachse (dann stand er waagerecht gegen einen um die Zielkorrektur
 * gekippten Griff, und die Faust trug dieselben 30° eingerechnet mit sich
 * herum — die alten Zahlen y -2,8 · z 5,9 · Pitch -30° sind genau diese
 * Drehung), dann folgte er auch dem Nicken. Seit er auch **rollt**, ist er
 * ein Werkzeug wie jedes andere, und die Zahlen unten bleiben, wie sie sind.
 */
export const BAG_HAND_POSE: HandPose = {
  ...HOLD_HAND_POSE,
  x: 0,
  y: -4.6,
  z: 5,
  pitch: 0,
  yaw: 0,
  roll: -180,
  curls: [0.55, 0.85, 0.85, 0.9, 0.9],
};

/**
 * **Die Faust an der Querstange des Hängegleiters** — rechte Hand, links
 * gespiegelt.
 *
 * Der Steuerbügel ist eine waagerechte Stange, und man hält sie wie einen
 * Lenker: von oben, Handrücken oben, der Daumen zur Mitte hin, die Finger
 * vorn herum (`HangGliderTool.ts`, `BAR_GRIP` — die Achse quer, x). Beide
 * Hände an der Stange sind zwei solche Fäuste an den beiden Enden, und die
 * Stange liegt zwischen ihnen fest — sie kippt nur mit, wenn die Hände es tun,
 * und genau das ist die Steuerung. Vorher hing am Bügel der Standardgriff
 * quer unter dem Rohr, wie an einer Lötpistole; eine Stange, an der ein
 * Pistolengriff hängt, ist keine Stange, die man hält.
 */
export const GLIDER_HAND_POSE: HandPose = {
  ...HOLD_HAND_POSE,
  x: 0,
  y: 3.8,
  z: 1.2,
  pitch: -30,
  yaw: 0,
  roll: 0,
  curls: [0.55, 0.85, 0.85, 0.9, 0.9],
};

/**
 * Die Hand, die etwas **trägt** statt hält: die Handschuhe.
 *
 * Ein Handschuh sitzt auf der Hand, und die Hand sitzt so auf dem Controller,
 * wie sie es ohne ihn täte — also ist das die **Grundhaltung** (rechts, links
 * gespiegelt), mit offenen Fingern. Der Handschuh selbst folgt dieser Haltung
 * (`Tool.worn`); wer sie verschiebt, verschiebt beide.
 */
export const WORN_HAND_POSE: HandPose = {
  ...IDLE_HAND_POSE_RIGHT,
};

/**
 * **Die Faust am Controller** — rechte Hand, links gespiegelt.
 *
 * Der Controller (`ControllerTool.ts`) liegt genau im Griffraum, und sein
 * Handgriff ist darin ein Zylinder entlang der Z-Achse (`core/controllerGrip.ts`,
 * aus dem Modell des Herstellers abgelesen): der Kopf mit Stick und Tasten am
 * -Z-Ende, der Trigger darunter. Die Faust darum ist gerechnet wie die am
 * Standardgriff — der Daumen zum Kopf, der Handrücken nach außen, der
 * Zeigefinger gestreckt zum Trigger hinunter, und mit dem Trigger krümmt er
 * sich darauf (`GRIP_FINGER_MOVES`).
 *
 * Vorher trug die Hand hier die **gemessene Grundhaltung** mit den Fingern der
 * Faust. Die Grundhaltung ist eine Messung der leeren Hand, und ob ihre Faust
 * den Handgriff trifft, hatte nie jemand nachgesehen: sie stand 74° quer dazu,
 * und mit dem Controller als Werkzeug in der Hand sah man das Gerät schräg
 * neben der Faust liegen — „absolut falsch in der Hand".
 */
export const CONTROLLER_HAND_POSE: HandPose = {
  ...HOLD_HAND_POSE,
  x: 2.7,
  y: 3.7,
  z: 1.5,
  pitch: -90,
  yaw: -17,
  roll: -90,
  curls: [...GRIP_HAND_POSE.curls],
};

/**
 * Die Boxhand als Werkzeug (`tools/HandTool.ts`): sie **ist** die Hand, und
 * ihre Haltung ist die Grundhaltung — `handPoseStore.holdHandPose` gibt für
 * diese Id die Grundhaltung heraus, gespeichert oder gebaut.
 */
export const HAND_TOOL_ID = 'hand-box';

/**
 * **Die Faust am Griff der Drohne** — die rechte Hand am rechten Griff, links
 * gespiegelt am linken, und **gemessen statt gerechnet**.
 *
 * Fast die Faust der echten Hand am Halterzylinder (`GRIP_HAND_POSE`), nur
 * zweieinhalb Zentimeter weiter nach außen und ein wenig anders gegiert: das
 * Deck ist breiter als ein Pistolengriff, und die Hand liegt an seinem Ende.
 * Gemessen in der Brille am Justierer, zusammen mit der Lage des Decks im
 * Griff (`DroneTool.ts`, aus dem Kurzcode `BPVMCn8QZJYHLxAE_RBXKE2uiPpQ9pK`).
 *
 * Davor war sie um den Zylinder am Deckende gerechnet — wie jede andere Faust
 * dieser Datei. Der Griff liegt auch jetzt in ihr, knapp zwei Zentimeter neben
 * ihrer Achse; was sich geändert hat, ist, dass die Zahl aus einer Hand kommt
 * und nicht aus einer Formel.
 */
export const DRONE_HAND_POSE: HandPose = {
  ...GRIP_HAND_POSE,
  x: 4.2,
  y: 2.4,
  z: 2.7,
  pitch: -43,
  yaw: 3,
  roll: -90,
  curls: [...GRIP_HAND_POSE.curls],
};

/**
 * Die Werkzeuge mit **eigener Faust**: die mit eigenem Zylinder — gerechnet wie
 * die am Standardgriff, nur um einen anderen —, und die, die auf der Hand
 * sitzen statt in ihr. Was hier steht, steht nicht in `STANDARD_GRIP_TOOLS`.
 */
export const TOOL_FISTS: Readonly<Record<string, HandPose>> = {
  // Gemessen, nicht gerechnet: der Stiel liegt in der Faust der echten Hand.
  hammer: HAMMER_HAND_POSE,
  // Die **Taschenlampe** trägt denselben Stab, nur um 45° nach vorn gekippt —
  // also dieselbe Faust um denselben Zylinder, in dessen neuer Lage
  // (`TORCH_HAND_POSE`).
  flashlight: TORCH_HAND_POSE,
  brush: BRUSH_HAND_POSE,
  drone: DRONE_HAND_POSE,
  stopwatch: STOPWATCH_HAND_POSE,
  bag: BAG_HAND_POSE,
  'hang-glider': GLIDER_HAND_POSE,
  'gravity-glove': WORN_HAND_POSE,
  'translate-glove': WORN_HAND_POSE,
  'superman-glove': WORN_HAND_POSE,
  'controller-left': CONTROLLER_HAND_POSE,
  'controller-right': CONTROLLER_HAND_POSE,
  // Kein Werkzeug, ein Ding aus dem Beutel — aber eines mit Griff: der Hals
  // der Sektflasche rastet in die Faust um den Standardgriff (`propGrip.ts`),
  // und die Hand trägt sie unter der Sorte als Id. Dieselbe Faust wie an der
  // Pistole; nur steht sie hier nicht in `STANDARD_GRIP_TOOLS`, weil eine
  // Flasche kein Werkzeug ist, das jemand baut.
  champagne: GRIP_HAND_POSE,
};

/**
 * Welche Werkzeuge den **Standardgriff** tragen — und damit die Faust dazu.
 *
 * Eine Liste und keine Frage an das Werkzeug, weil eine Hand gezeichnet wird,
 * lange bevor irgendwo ein Werkzeug gebaut ist. Dass sie zu dem passt, was die
 * Werkzeuge wirklich anbauen, hält `worlds/portal/tools/gripMount.test.ts` fest.
 *
 * Was hier fehlt, fehlt mit Grund — die
 * drei Handschuhe und die Flügel werden angezogen, Hammer und Drohne bringen
 * ihre eigenen Griffe mit, und Boxhand und Controller *sind* die Hand.
 */
export const STANDARD_GRIP_TOOLS: ReadonlySet<string> = new Set([
  // Der Griff selbst — das Werkzeug, an dem man die Faust einstellt.
  'grip',
  'pistol',
  // Die Staffelei: ein Bündel Latten, am selben Griff getragen wie alles andere.
  'easel',
  'duplicator',
  'inspect',
  'teleport',
  'gizmo',
  'holster',
  'grapple',
  'gun-blue',
  'gun-red',
  'gun-dual',
  'tape',
  'eraser',
  'xray',
  // Der Handspiegel: derselbe Rahmen über derselben Faust wie der Scanner.
  'mirror',
  // Der Lötkolben trägt den Griff quer unter sich, wie eine Lötpistole. Die
  // Taschenlampe tat das eine Weile auch — „eine Lampe mit Griff wie ein
  // Megaphon" — und liegt jetzt als **Stab** im Griffpunkt, um 45° nach vorn
  // gekippt (`TORCH_HAND_POSE`), ohne Standardgriff: das Rohr *ist* ihr Griff. Der Pinsel liegt an seinem
  // Stiel, die Stoppuhr an ihrem Rand. Der Hängegleiter hing auch hier und
  // wird jetzt an seiner **Querstange** gehalten (`GLIDER_HAND_POSE`).
  'welder',
  // Das Messer: der Griff steht in der Faust, die Klinge ragt oben heraus.
  'knife',
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
 * Trägt es den Standardgriff, ist es die Faust dazu; trägt es einen eigenen
 * Zylinder (Hammer, Drohne), die dazu gerechnete — beides für die linke Hand
 * gespiegelt. Trägt es gar keinen, bleibt die allgemeine Faust: sie ist kein
 * Ergebnis, sondern ein Anfang, und dann führt der Weg über den zweiten
 * Justierstand. Der Speicher legt sich über alles, wenn jemand selbst justiert
 * hat (`handPoseStore.ts`).
 */
export function defaultHoldPose(hand: Handedness, toolId: string): HandPose {
  const fist = STANDARD_GRIP_TOOLS.has(toolId) ? GRIP_HAND_POSE : TOOL_FISTS[toolId];
  if (!fist) return clonePose(HOLD_HAND_POSE);
  return hand === 'right' ? clonePose(fist) : mirrorHandPose(fist);
}

/**
 * **Was die Knöpfe mit den Fingern tun.**
 *
 * Eine Haltung sagt, wie die Faust um den Griff liegt — mit gedrücktem
 * Griffknopf, denn so hält man ein Werkzeug. Zwei Knöpfe bewegen Finger
 * darüber hinaus: der **Griffknopf** losgelassen öffnet die Hand vom Griff,
 * und der **Trigger** zieht einen Finger nach — am Standardgriff den
 * Zeigefinger auf den Abzug, an der Stoppuhr den Daumen auf die Krone. Je
 * Finger steht eine Krümmung oder `null` für „bleibt, wie die Haltung sagt";
 * `buttonCurls` legt das über die Haltung.
 *
 * Eingestellt wird das **einmal je Griff** und nicht je Werkzeug, aus
 * demselben Grund wie die Faust selbst: derselbe Griff in derselben Hand hat
 * denselben Abzug unter demselben Finger. Wo ein Werkzeug seinen eigenen
 * Griff mitbringt, steht seine Bewegung neben seiner Faust
 * (`TOOL_FINGER_MOVES`); alles andere teilt sich die des Standardgriffs.
 */
export type FingerCurls = readonly (number | null)[];

export interface FingerMoves {
  /** Griffknopf gedrückt: meist die Haltung selbst — an Handschuhen die Faust. */
  grab: FingerCurls;
  /** Griffknopf losgelassen: die Hand öffnet sich vom Griff. */
  release: FingerCurls;
  /** Trigger gedrückt: der Finger am Abzug. */
  trigger: FingerCurls;
}

/** Die beiden Knöpfe, die Finger bewegen. */
export interface FingerButtons {
  grab: boolean;
  trigger: boolean;
}

/** Ein Werkzeug in der Hand, ohne dass ein Finger etwas drückt. */
export const HELD_BUTTONS: FingerButtons = { grab: true, trigger: false };

/** Kein Finger rührt sich. */
const KEEP: FingerCurls = [null, null, null, null, null];

/**
 * Die **geöffnete Hand** — dieselben Zahlen wie die Geste `ready` der Hand
 * (`HandVisuals.ts`): etwas ist nah genug zum Zugreifen, die Finger sind noch
 * nicht darum. Genau so sieht eine Hand aus, die den Griff eben losgelassen
 * hat.
 */
export const RELEASED_CURLS: FingerCurls = [0.35, 0.4, 0.45, 0.5, 0.55];

/**
 * Am **Standardgriff**: der Zeigefinger liegt am Rahmen (`GRIP_HAND_POSE`)
 * und krümmt sich auf den Abzug, wenn der Trigger kommt.
 */
export const GRIP_FINGER_MOVES: FingerMoves = {
  grab: KEEP,
  release: RELEASED_CURLS,
  trigger: [null, 0.6, null, null, null],
};

/**
 * Am **Stab** liegt der Zeigefinger schon in der Faust; der Trigger schließt
 * ihn ganz. Dasselbe an der **Querstange** des Hängegleiters — dort bleibt die
 * Hand allerdings am Bügel, ob der Griffknopf gedrückt ist oder nicht
 * (`STICKY_FINGER_MOVES`).
 */
export const POLE_FINGER_MOVES: FingerMoves = {
  grab: KEEP,
  release: RELEASED_CURLS,
  trigger: [null, 1, null, null, null],
};

/**
 * Am **Pinsel** drückt der Zeigefinger auf den Stiel, statt sich darum zu
 * schließen: aus 0,45 wird 0,65 und keine Faust. Wer beim Malen den Finger
 * ganz krümmt, hält keinen Stift mehr.
 */
export const BRUSH_FINGER_MOVES: FingerMoves = {
  grab: KEEP,
  release: RELEASED_CURLS,
  trigger: [null, 0.65, null, null, null],
};

/**
 * **Angezogen** (Handschuhe): der Griffknopf hält nichts fest, er schließt die
 * Faust — Superman fliegt mit ihr —, und losgelassen bleibt die Hand offen,
 * wie die Grundhaltung sie zeigt.
 */
export const WORN_FINGER_MOVES: FingerMoves = {
  grab: [0.55, 0.85, 0.85, 0.9, 0.9],
  release: KEEP,
  trigger: [null, 0.6, null, null, null],
};

/**
 * **Klebrig** (Hängegleiter, Flügel): der Griffknopf ist ein Knopf des
 * Werkzeugs und nicht das Halten — die Hände bleiben am Bügel, ob er gedrückt
 * ist oder nicht.
 */
export const STICKY_FINGER_MOVES: FingerMoves = {
  grab: KEEP,
  release: KEEP,
  trigger: [null, 0.6, null, null, null],
};

/** Die Werkzeuge, deren Finger sich anders bewegen als am Standardgriff. */
export const TOOL_FINGER_MOVES: Readonly<Record<string, FingerMoves>> = {
  hammer: POLE_FINGER_MOVES,
  flashlight: POLE_FINGER_MOVES,
  brush: BRUSH_FINGER_MOVES,
  'gravity-glove': WORN_FINGER_MOVES,
  'translate-glove': WORN_FINGER_MOVES,
  'superman-glove': WORN_FINGER_MOVES,
  'hang-glider': STICKY_FINGER_MOVES,
  wings: STICKY_FINGER_MOVES,
  // Die Boxhand ist die Hand selbst: kein Griff, den sie loslassen könnte.
  'hand-box': STICKY_FINGER_MOVES,
};

/** Wie sich die Finger an diesem Werkzeug bewegen — am Griff, den es trägt. */
export function fingerMovesOf(toolId: string | null): FingerMoves {
  return (toolId && TOOL_FINGER_MOVES[toolId]) || GRIP_FINGER_MOVES;
}

/**
 * Die Krümmung der Finger bei diesen Knöpfen: die Haltung, darüber die Lage
 * des Griffknopfs, darüber der Trigger. Was `null` sagt, bleibt.
 */
export function buttonCurls(pose: HandPose, moves: FingerMoves, buttons: FingerButtons): number[] {
  const curls = clonePose(pose).curls;
  buttonCurlLayer(moves, buttons).forEach((curl, i) => {
    if (curl !== null) curls[i] = curl;
  });
  return curls;
}

/**
 * Dasselbe, aber **nur die Finger, die die Knöpfe wirklich bewegen** — der
 * Rest bleibt `null`.
 *
 * Der Unterschied zählt, seit eine Haltung jedes Gelenk einzeln tragen kann:
 * `buttonCurls` gibt fünf Zahlen heraus, und fünf Zahlen auf eine gemessene
 * Hand zu legen wirft zwanzig gemessene weg — auch für die vier Finger, die
 * kein Knopf anfasst. Wer die Ebene einzeln bekommt, ersetzt den Zeigefinger
 * am Abzug und lässt die anderen, wie die Messung sie gefunden hat.
 */
export function buttonCurlLayer(moves: FingerMoves, buttons: FingerButtons): (number | null)[] {
  const layer: (number | null)[] = [null, null, null, null, null];
  const layers = [buttons.grab ? moves.grab : moves.release];
  if (buttons.trigger) layers.push(moves.trigger);
  for (const source of layers) {
    source.forEach((curl, i) => {
      if (curl !== null && i < layer.length) layer[i] = curl;
    });
  }
  return layer;
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

/**
 * The same pose with one field replaced — never the one that was passed in.
 *
 * Eine getippte **Krümmung** oder **Spreizung** wirft die gemessenen Gelenke
 * weg. Das muss so sein: die Gelenke gewinnen über beide, und ohne diese Zeile
 * änderte man im Menü eine Zahl und sähe an der Hand nichts passieren — der
 * ärgerlichste Fehler, den eine Einstellung machen kann. Die sechs Werte der
 * Lage rühren nicht daran; sie sagen, wo die Hand liegt, und nicht, wie sie
 * gefaltet ist.
 */
export function setHandPoseField(pose: HandPose, key: string, value: number): HandPose {
  const next = clonePose(pose);
  const curl = curlIndex(key);
  if (curl !== null) next.curls[curl] = value;
  else if (key in next) (next as unknown as Record<string, number>)[key] = value;
  if (curl !== null || key === 'spread') delete next.joints;
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
  // Und dasselbe eine Ebene tiefer: eine **Fächerung** ist eine Drehung um die
  // Hochachse und kippt beim Spiegeln um, eine **Beugung** ist eine um die
  // Querachse und bleibt. Genau dieselben zwei Vorzeichen wie oben, nur je
  // Finger — ohne das stünde an einer gespiegelten Hand der Zeigefinger dort,
  // wo der kleine hingehört.
  if (mirrored.joints) {
    for (let finger = 0; finger < FINGER_NAMES.length; finger++) {
      const at = finger * FINGER_JOINT_VALUES + FINGER_BONES;
      mirrored.joints[at] = -(mirrored.joints[at] ?? 0) + 0;
    }
  }
  return mirrored;
}

/**
 * Numbers only, for the store and the config code: 6 pose values, 5 curls,
 * 1 spread — und dahinter, **wenn es sie gibt**, die zwanzig Gelenke.
 *
 * Angehängt und nicht dazwischengeschoben: die ersten zwölf Zahlen sind das
 * Format, das jeder alte Code trägt, und ein Leser, der nur zwölf liest, liest
 * weiter dieselbe Haltung. Genau das tut der große Konfig-Code
 * (`gearCodec.ts`) — er kennt zwölf Felder, und mehr passen nicht in seine
 * Maske. Er trägt die Gelenke deshalb **nicht**; die Krümmungen daneben sagen
 * dieselbe Haltung so genau, wie ein Modell mit fünf Zahlen sie sagen kann.
 * Der Speicher im Browser trägt sie (`handPoseStore.ts`), und dort werden sie
 * gemessen.
 */
export function handPoseToArray(pose: HandPose): number[] {
  const values = [
    pose.x,
    pose.y,
    pose.z,
    pose.pitch,
    pose.yaw,
    pose.roll,
    ...normalizeCurls(pose.curls),
    pose.spread,
  ];
  if (pose.joints?.length === HAND_JOINT_VALUES) values.push(...pose.joints);
  return values;
}

/** Where the joint values start in that array. */
const JOINTS_AT = 12;

/** The inverse, tolerant of a short or overlong array from an older code. */
export function handPoseFromArray(values: readonly number[], fallback = IDLE_HAND_POSE): HandPose {
  const at = (index: number, spare: number): number =>
    Number.isFinite(values[index]) ? (values[index] as number) : spare;
  const pose: HandPose = {
    x: at(0, fallback.x),
    y: at(1, fallback.y),
    z: at(2, fallback.z),
    pitch: at(3, fallback.pitch),
    yaw: at(4, fallback.yaw),
    roll: at(5, fallback.roll),
    curls: normalizeCurls(fallback.curls).map((spare, i) => at(6 + i, spare)),
    spread: at(11, fallback.spread),
  };
  const joints = values.slice(JOINTS_AT, JOINTS_AT + HAND_JOINT_VALUES);
  // Ganz oder gar nicht: eine halbe Gelenkreihe ist keine Messung, sondern ein
  // abgeschnittener Code — und die Krümmungen daneben sind dann die Auskunft.
  if (joints.length === HAND_JOINT_VALUES && joints.every((value) => Number.isFinite(value))) {
    pose.joints = joints;
  }
  return pose;
}

export function clonePose(pose: HandPose): HandPose {
  const clone: HandPose = { ...pose, curls: normalizeCurls(pose.curls) };
  if (pose.joints) clone.joints = [...pose.joints];
  return clone;
}

/** One line for a display: the six numbers, then the five fingers. */
export function formatHandPose(pose: HandPose): string {
  const curls = normalizeCurls(pose.curls)
    .map((value) => value.toFixed(2))
    .join('/');
  // Dass eine Haltung **jedes Gelenk** trägt, sieht man ihr an den Krümmungen
  // nicht an — und es ist der Unterschied zwischen gemessen und geschätzt.
  const joints = pose.joints?.length === HAND_JOINT_VALUES ? ' · Gelenke' : '';
  return (
    `x ${pose.x} y ${pose.y} z ${pose.z} cm · ` +
    `${pose.pitch}/${pose.yaw}/${pose.roll}° · ${curls}${joints}`
  );
}

function normalizeCurls(curls: readonly number[]): number[] {
  return [0, 1, 2, 3, 4].map((i) => (Number.isFinite(curls[i]) ? (curls[i] as number) : 0));
}

function curlIndex(key: string): number | null {
  const match = /^curl([0-4])$/.exec(key);
  return match ? Number(match[1]) : null;
}
