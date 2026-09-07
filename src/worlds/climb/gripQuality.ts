/**
 * **Wie stabil man gerade hängt** — die Rechnung, um die es in der
 * Kletterhalle geht.
 *
 * Vorbild ist die Haltemechanik aus *Cairn*: Man klettert nicht von Griff zu
 * Griff wie über Trittsteine, sondern greift hin, wo man will — und die Welt
 * rechnet aus, wie gut das war. Herauskommt eine Zahl pro Hand zwischen 0
 * und 1, und aus beiden zusammen der **Halt** (`support`), an dem die Ausdauer
 * hängt (`stamina.ts`).
 *
 * Was in die Zahl eingeht, und warum genau das:
 *
 * - **Material und Form** (`holds.ts`). Der Grundwert der Oberfläche plus das,
 *   was die Form hergibt — Letzteres aber nur, soweit die Hand wirklich
 *   daraufsitzt (`seat`). Eine Kante, die man um einen halben Handteller
 *   verfehlt hat, ist keine Kante, sondern eine Wand.
 * - **Jamming.** Stehen zwei Hände an **entgegengesetzten** Flächen — im
 *   Kamin, links und rechts —, kann man sich dazwischen verspreizen und
 *   Druck ausüben. Das ist der einzige Weg, an einer Wand ohne Griffe
 *   hochzukommen, und es ist der Grund, warum der Kamin in der Halle steht.
 * - **Kanten und Spalten.** Steckt hier schon im Formbonus: Henkel, Spalte
 *   und Kante geben viel, ein abschüssiger Ballen fast nichts.
 * - **Wie die Wand steht.** An einer senkrechten Wand zieht der Arm, an einer
 *   Platte drückt man zusätzlich hinein — an einem **Überhang** schaut die
 *   Fläche nach unten, und dann trägt der Arm allein. Derselbe Henkel ist
 *   dort halb so viel wert.
 * - **Wie weit die Hände unter dem Körper sind.** Eine Hand auf Kopfhöhe
 *   zieht; eine Hand auf Hüfthöhe drückt nur noch. Also fällt der Halt, je
 *   tiefer die Hand relativ zum Kopf hängt.
 * - **Wie weit die Hände auseinander sind.** Ausgestreckt quer über die Wand
 *   hält man sich schlechter — und **verspreizen kann man sich gar nicht
 *   mehr**: Druck braucht einen Winkel, den zwei weit auseinanderstehende
 *   Arme nicht mehr haben. Deshalb geht die Spannweite zweimal ein, einmal
 *   milde auf alles und einmal hart auf den Jam.
 * - **Füße.** Wer irgendwo aufsteht, hängt nicht mehr nur in den Armen.
 * - **Restkraft.** Eine leere Ausdauer macht jeden Griff schlechter — aber
 *   nicht beliebig schlecht (`FATIGUE_FLOOR`), sonst gerät man in eine
 *   Todesspirale, aus der niemand mehr herausklettert.
 *
 * **Die Leiter ist die Ausnahme, und zwar eine ganze.** Perfektes Material
 * gibt immer 1 — egal wie tief, wie weit auseinander, wie erschöpft. Eine
 * Leiter, an der man nach zwei Minuten abrutscht, wäre keine.
 *
 * Reine Zahlen: kein three.js, damit die Rechnung geprüft werden kann, ohne
 * eine Halle zu bauen.
 */

import { HOLD_FEATURES, HOLD_MATERIALS, type HoldFeature, type HoldMaterial } from './holds';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Was eine Hand gerade anfasst. */
export interface HandGrip {
  material: HoldMaterial;
  feature: HoldFeature;
  /** Wie mittig die Hand auf dem Griff sitzt: 1 genau darauf, 0 gerade noch dran. */
  seat: number;
  /** Flächennormale des Griffs, aus der Wand heraus, normiert. */
  normal: Vec3;
  /** Wo die Hand ist, in Weltkoordinaten. */
  point: Vec3;
}

/** Wie der ganze Kletterer gerade steht. */
export interface ClimbPose {
  left: HandGrip | null;
  right: HandGrip | null;
  /** Höhe des Kopfes in der Welt. */
  headY: number;
  /** Augenhöhe über den Füßen, in Metern — das Maß, in dem „tief“ gemessen wird. */
  eyeHeight: number;
  /** Stehen die Füße auf etwas? */
  footing: boolean;
  /** Wie viel Kraft noch da ist, 0 bis 1 — die Ausdauer des letzten Bildes. */
  strength: number;
}

export interface GripReport {
  /** Halt der einzelnen Hand, oder `null`, wenn sie nichts hält. */
  left: number | null;
  right: number | null;
  /** Was beide Hände zusammen tragen, 0 bis 1 — daran hängt die Ausdauer. */
  support: number;
  /** Womit dieser Halt Ausdauer frisst; 0 heißt gar nicht (Leiter). */
  drain: number;
  /** Wie viel gerade aus dem Verspreizen kommt — für die Anzeige. */
  jam: number;
  /** Hängt überhaupt eine Hand an der Wand? */
  hanging: boolean;
}

/** Ab hier zählt eine Hand als „tief“: Anteil der Augenhöhe unter dem Kopf. */
export const REACH_FULL = 0.35;
/** Und hier ist sie so tief, wie es schlimmer nicht wird. */
export const REACH_LOW = 1;
/** Was von einem Griff übrig bleibt, wenn die Hand ganz unten hängt. */
export const REACH_FLOOR = 0.5;

/** Bis hierhin dürfen die Hände auseinanderstehen, ohne dass es kostet (Meter). */
export const SPAN_FULL = 0.75;
/** Ab hier ist es so weit auseinander, wie es schlimmer nicht wird. */
export const SPAN_WIDE = 1.6;
/** Was dann noch übrig bleibt. */
export const SPAN_FLOOR = 0.7;

/** Höchster Zuschlag aus dem Verspreizen. */
export const JAM_MAX = 0.4;
/**
 * Ab wie „gegeneinander“ die beiden Flächen stehen müssen, damit es zählt.
 * Gemessen als negatives Skalarprodukt der Normalen: 1 heißt genau
 * gegenüber, 0 heißt im rechten Winkel.
 */
export const JAM_MIN_OPPOSITION = 0.35;
/** Bis hierher kann man ordentlich drücken (Meter zwischen den Händen). */
export const JAM_PRESS_NEAR = 0.5;
/** Und ab hier gar nicht mehr. */
export const JAM_PRESS_FAR = 1.4;

/** Was von einem Griff übrig bleibt, der senkrecht nach unten schaut (Dach). */
export const TILT_FLOOR = 0.5;

/** Was Füße unter dem Körper wert sind. */
export const FOOT_BONUS = 0.18;

/** Was die zweite Hand zum Halt beiträgt — viel, aber nicht noch einmal alles. */
export const SECOND_HAND = 0.33;

/**
 * Und was übrig bleibt, wenn man **einarmig** hängt.
 *
 * Ein Griff ist derselbe, ob eine Hand daran hängt oder zwei — aber die
 * Position ist es nicht: Wer einarmig hängt, dreht sich weg, und der ganze
 * Körper zieht an einer Schulter. Ohne diesen Abzug wäre ein Henkel allein
 * schon eine Rast, und die halbe Halle hinge einarmig herum.
 */
export const ONE_HAND = 0.78;

/** Was ein Griff bei völlig leerer Ausdauer noch hergibt. */
export const FATIGUE_FLOOR = 0.7;

/**
 * Wie gut die Hand sitzt, aus ihrem Abstand zum Griff.
 *
 * Etwas großzügiger als der Griff selbst (Faktor 1,35): Wer den Rand trifft,
 * hält sich noch — nur eben an der blanken Fläche, ohne alles, was die Form
 * hergäbe.
 */
export function seatOf(distance: number, radius: number): number {
  if (!(radius > 0)) return 0;
  return clamp01(1 - Math.max(0, distance) / (radius * 1.35));
}

/**
 * Was die Höhe der Hand über den Halt sagt: voll, solange sie zwischen Kopf
 * und Brust steht, und immer weniger, je tiefer sie hängt. Über dem Kopf
 * bleibt es voll — hoch greifen ist Klettern, nicht Nachlässigkeit.
 */
export function reachFactor(handY: number, headY: number, eyeHeight: number): number {
  const height = Math.max(0.6, eyeHeight);
  const drop = (headY - handY) / height;
  const t = clamp01((drop - REACH_FULL) / (REACH_LOW - REACH_FULL));
  return 1 - t * (1 - REACH_FLOOR);
}

/**
 * Was die **Neigung der Wand** über den Halt sagt — der Überhang.
 *
 * Eine senkrechte Wand hält man mit einer Hand, die zieht; an einer Platte
 * drückt man zusätzlich hinein. An einem Überhang schaut die Fläche nach
 * unten, und dann gibt es nichts mehr hineinzudrücken: Der Arm trägt allein,
 * und derselbe Henkel ist plötzlich halb so viel wert. Genau das ist der
 * Unterschied zwischen der Rauwand und dem Bauch darüber — und es steckt in
 * einer Zahl, die die Wand ohnehin schon mitbringt: der **Y-Anteil ihrer
 * Normalen**.
 */
export function tiltFactor(normal: Vec3): number {
  const down = clamp01(-normal.y);
  return 1 - down * (1 - TILT_FLOOR);
}

/** Was die Spannweite über den Halt sagt. */
export function spanFactor(distance: number): number {
  const t = clamp01((distance - SPAN_FULL) / (SPAN_WIDE - SPAN_FULL));
  return 1 - t * (1 - SPAN_FLOOR);
}

/**
 * Der Zuschlag aus dem Verspreizen — und was er alles braucht.
 *
 * Zwei Flächen, die gegeneinander stehen, **und** zwei Hände, die nah genug
 * beieinander sind, um dazwischen Druck aufzubauen. An perfektem Material
 * gibt es ihn nicht: eine Leiter hält ohnehin, und ein Bonus auf 1 wäre eine
 * Zahl ohne Wirkung.
 */
export function jamBonus(left: HandGrip, right: HandGrip): number {
  if (left.material === 'perfect' || right.material === 'perfect') return 0;
  const opposition = clamp01(-dot(left.normal, right.normal));
  if (opposition <= JAM_MIN_OPPOSITION) return 0;
  const span = distance(left.point, right.point);
  const press = clamp01(1 - (span - JAM_PRESS_NEAR) / (JAM_PRESS_FAR - JAM_PRESS_NEAR));
  const angle = (opposition - JAM_MIN_OPPOSITION) / (1 - JAM_MIN_OPPOSITION);
  return JAM_MAX * angle * press;
}

/** Der Halt einer einzelnen Hand. */
export function handQuality(
  grip: HandGrip,
  pose: ClimbPose,
  other: HandGrip | null,
  jam: number,
): number {
  // Die Leiter, und mit ihr die ganze Ausnahme: perfektes Material hält immer.
  if (grip.material === 'perfect') return 1;

  let value = HOLD_MATERIALS[grip.material].base;
  value += HOLD_FEATURES[grip.feature].bonus * clamp01(grip.seat);
  value += jam;
  if (pose.footing) value += FOOT_BONUS;

  value *= tiltFactor(grip.normal);
  value *= reachFactor(grip.point.y, pose.headY, pose.eyeHeight);
  if (other) value *= spanFactor(distance(grip.point, other.point));
  value *= FATIGUE_FLOOR + (1 - FATIGUE_FLOOR) * clamp01(pose.strength);

  return clamp01(value);
}

/** Die ganze Rechnung: zwei Hände, ein Halt, ein Verbrauch. */
export function gripReport(pose: ClimbPose): GripReport {
  const { left, right } = pose;
  if (!left && !right) {
    return { left: null, right: null, support: 0, drain: 0, jam: 0, hanging: false };
  }

  const jam = left && right ? jamBonus(left, right) : 0;
  const leftValue = left ? handQuality(left, pose, right, jam) : null;
  const rightValue = right ? handQuality(right, pose, left, jam) : null;

  let support: number;
  if (leftValue !== null && rightValue !== null) {
    const best = Math.max(leftValue, rightValue);
    const rest = Math.min(leftValue, rightValue);
    support = clamp01(best + SECOND_HAND * rest);
  } else {
    // Die Leiter bleibt die Leiter, auch einarmig: Ein Abzug hier hieße, dass
    // man an einer Sprosse irgendwann doch abrutscht.
    const only = leftValue ?? rightValue ?? 0;
    support = only >= 1 ? 1 : only * ONE_HAND;
  }

  // Die **beste** Hand entscheidet über den Verbrauch, nicht die schlechteste:
  // Wer eine Sprosse in der Faust hat, hängt an der Sprosse — was die andere
  // Hand nebenher am glatten Fels tut, kostet ihn nichts.
  const drains: number[] = [];
  if (left) drains.push(HOLD_MATERIALS[left.material].drain);
  if (right) drains.push(HOLD_MATERIALS[right.material].drain);

  return {
    left: leftValue,
    right: rightValue,
    support,
    drain: Math.min(...drains),
    jam,
    hanging: true,
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
