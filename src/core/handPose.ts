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
 * hält. Drei Werkzeuge werden so gehalten, und deshalb ist es **eine** Faust:
 * der Stiel des **Hammers**, das Batterierohr der **Taschenlampe** und der
 * Griff des **Messers** (der Pinsel liegt auf demselben Stab, aber von oben
 * gehalten — `BRUSH_HAND_POSE`). Vorher stand am Hammer die
 * allgemeine Faust, und die lag **quer** zum Stiel: die Handfläche stand wie ein
 * Brett auf der Stange, die Finger schlossen sich neben ihr um Luft.
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
 * **Die Faust am Pinsel** — rechte Hand, links gespiegelt.
 *
 * Derselbe Stab wie beim Hammer, aber **von oben** gehalten, wie ein Maler
 * seinen Pinsel hält (`BrushTool.ts`, `BRUSH_GRIP`): der Handrücken zeigt
 * nach oben, die Finger greifen von oben um den Stiel, der Daumen liegt zur
 * Spitze hin. Der Zeigefinger ist etwas weniger gekrümmt als die anderen — er
 * liegt am Stiel, statt sich ganz darum zu schließen. Mit der Hammerfaust sah
 * der Pinsel aus wie ein Hammer: Handfläche nach innen, Stiel quer in der
 * Faust.
 */
export const BRUSH_HAND_POSE: HandPose = {
  ...HOLD_HAND_POSE,
  x: -3,
  y: 1.1,
  z: 0.7,
  pitch: -30,
  yaw: -90,
  roll: 0,
  curls: [0.55, 0.6, 0.85, 0.9, 0.9],
};

/**
 * **Die Faust um die Stoppuhr** — rechte Hand, links gespiegelt.
 *
 * So, wie ein Zeitnehmer sie hält: die Uhr liegt **in der Hand**, das
 * Zifferblatt zum Gesicht, die Handfläche hinter dem Gehäuse, die Finger um
 * die seitliche Kante gekrümmt (rechts um die linke), der Daumen oben auf der
 * Krone. Die Kante ist als Zylinder durch den Griffpunkt gedacht, um gut 35°
 * gekippt (`StopwatchTool.ts`, `STOPWATCH_GRIP`, `STOPWATCH_TILT`): die Finger
 * zeigen nach links **oben** um die Kante, der Arm kommt von rechts unten —
 * so steht die Hand auf dem Foto eines Zeitnehmers. Die Faust liegt darum wie
 * um jeden anderen Zylinder; dass das Gehäuse dabei neben der Faust in der
 * Handfläche liegt, ist genau die Absicht. Vorher stand die Uhr hochkant *auf*
 * der Faust, mit den Fingern unter dem unteren Rand, und danach lag die Hand
 * waagerecht wie an einem Türgriff; beides hält niemand so.
 */
export const STOPWATCH_HAND_POSE: HandPose = {
  ...HOLD_HAND_POSE,
  x: 2.4,
  y: -4,
  z: 0.6,
  pitch: 60,
  yaw: 55,
  roll: -180,
  curls: [0.25, 0.85, 0.85, 0.9, 0.9],
};

/**
 * **Die Faust am Saum des Beutels** — rechte Hand, links gespiegelt.
 *
 * Der Beutel wird **von außen** gehalten wie eine **offene Kappe**, in die man
 * etwas hineinlegt: er hängt vor der Hand, sein Saum läuft durch den
 * Griffpunkt, und die Hand liegt waagerecht darunter — Handfläche nach oben,
 * die Finger greifen vorn über den Saum hinein, der Daumen liegt außen am Saum
 * entlang (`MagicBagTool.ts`, `BAG_GRIP`). Die erste Fassung hatte die Hand
 * senkrecht wie an einem Eimer; um 90° gekippt ist es eine Kappe. Ohne
 * Zielkorrektur gerechnet, denn der Beutel zielt nicht: er hängt in der Faust,
 * die Öffnung nach oben, komme, was wolle.
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
 * Und die Hand am **Controller**: dieselbe Grundhaltung, aber als Faust mit dem
 * Zeigefinger am Abzug — das ist die Hand, die das Gerät wirklich hält, und der
 * Controller (`ControllerTool.ts`) liegt dazu genau im Griffraum.
 */
export const CONTROLLER_HAND_POSE: HandPose = {
  ...IDLE_HAND_POSE_RIGHT,
  curls: [...HOLD_HAND_POSE.curls],
};

/**
 * Die Boxhand als Werkzeug (`tools/HandTool.ts`): sie **ist** die Hand, und
 * ihre Haltung ist die Grundhaltung — `handPoseStore.holdHandPose` gibt für
 * diese Id die Grundhaltung heraus, gespeichert oder gebaut.
 */
export const HAND_TOOL_ID = 'hand-box';

/**
 * **Die Faust am Griff der Drohne** — die rechte Hand am rechten Griff, links
 * gespiegelt am linken.
 *
 * Auch gerechnet, um den Zylinder am Ende des Decks (`DroneTool.ts`,
 * `DRONE_GRIP`): das Deck ist zum Kopf gekippt und rutscht mit einer Hand so
 * weit zur Seite, dass dieser Griff im Griffpunkt sitzt — dort liegt die Faust,
 * Handrücken nach außen, die Finger um die Rückseite geschlossen wie an einer
 * Konsole. Auch hier ohne Fingerzeig: eine Konsole hält man mit der ganzen
 * Faust. Der Standardgriff säße 5,5 cm tiefer und 20° anders gedreht; die
 * Faust dazu passte hier nicht.
 */
export const DRONE_HAND_POSE: HandPose = {
  ...HOLD_HAND_POSE,
  x: 2.6,
  y: 0.8,
  z: 4.3,
  pitch: -62,
  yaw: 0,
  roll: -97,
  curls: [0.55, 0.85, 0.85, 0.9, 0.9],
};

/**
 * Die Werkzeuge mit **eigener Faust**: die mit eigenem Zylinder — gerechnet wie
 * die am Standardgriff, nur um einen anderen —, und die, die auf der Hand
 * sitzen statt in ihr. Was hier steht, steht nicht in `STANDARD_GRIP_TOOLS`.
 */
export const TOOL_FISTS: Readonly<Record<string, HandPose>> = {
  hammer: POLE_HAND_POSE,
  flashlight: POLE_HAND_POSE,
  brush: BRUSH_HAND_POSE,
  knife: POLE_HAND_POSE,
  drone: DRONE_HAND_POSE,
  stopwatch: STOPWATCH_HAND_POSE,
  bag: BAG_HAND_POSE,
  'gravity-glove': WORN_HAND_POSE,
  'translate-glove': WORN_HAND_POSE,
  'superman-glove': WORN_HAND_POSE,
  'controller-left': CONTROLLER_HAND_POSE,
  'controller-right': CONTROLLER_HAND_POSE,
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
  // Lötkolben und Hängegleiter tragen den Griff quer unter sich, wie eine
  // Lötpistole. Die Taschenlampe tat das eine Weile auch — „eine Lampe mit
  // Griff wie ein Megaphon" — und liegt jetzt wieder als **Stab** in der Faust,
  // am Batterierohr (`TOOL_FISTS`), genauso der Pinsel an seinem Stiel und die
  // Stoppuhr an ihrem Rand.
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

/** Am **Stab** liegt der Zeigefinger schon in der Faust; der Trigger schließt ihn ganz. */
export const POLE_FINGER_MOVES: FingerMoves = {
  grab: KEEP,
  release: RELEASED_CURLS,
  trigger: [null, 1, null, null, null],
};

/** Am **Pinsel** liegt er am Stiel und schließt sich darum. */
export const BRUSH_FINGER_MOVES: FingerMoves = {
  grab: KEEP,
  release: RELEASED_CURLS,
  trigger: [null, 0.9, null, null, null],
};

/**
 * An der **Stoppuhr** drückt der Trigger nicht den Zeigefinger, sondern den
 * **Daumen**: fast gestreckt liegt er von hinten oben auf der Krone
 * (`STOPWATCH_HAND_POSE`, Krümmung 0,25), und gekrümmt kommt seine Kuppe über
 * die Krone nach vorn und unten — so drückt ein Zeitnehmer seine Uhr. Die
 * Zahlen sind gemessen (`gripFist.test.ts`: die Kuppe liegt in Ruhe auf der
 * Krone und geht beim Drücken hinunter), nicht geschätzt: bei 0,55, der
 * Daumenkrümmung der anderen Fäuste, lag die Kuppe schon vor dem Blatt.
 */
export const STOPWATCH_FINGER_MOVES: FingerMoves = {
  grab: KEEP,
  release: RELEASED_CURLS,
  trigger: [0.45, null, null, null, null],
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
  knife: POLE_FINGER_MOVES,
  brush: BRUSH_FINGER_MOVES,
  stopwatch: STOPWATCH_FINGER_MOVES,
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
  const layers = [buttons.grab ? moves.grab : moves.release];
  if (buttons.trigger) layers.push(moves.trigger);
  for (const layer of layers) {
    layer.forEach((curl, i) => {
      if (curl !== null) curls[i] = curl;
    });
  }
  return curls;
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
