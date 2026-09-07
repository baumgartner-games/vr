/**
 * Every number a kart runs on, in one place — the same idea as the pistol's
 * `weaponSettings`: notches to step through, a range to type into, and one
 * place that decides what is still a legal value.
 *
 * Pure numbers and labels, no three.js: the clamping and the stepping are
 * tested rather than hoped for.
 */

import { nextStep } from '../portal/tools/weaponSettings';
import type { ViewFollow } from './kartView';

/** How the front wheels are told where to go. */
export type SteeringMode = 'stick' | 'wheel';

export const STEERING_MODES: readonly SteeringMode[] = ['stick', 'wheel'];

export const STEERING_LABELS: Record<SteeringMode, string> = {
  stick: 'Linker Stick',
  wheel: 'Lenkrad greifen',
};

/** Short enough for the sign in the cockpit, which has two lines and no more. */
export const STEERING_HINTS: Record<SteeringMode, string> = {
  stick: 'linker Stick lenkt',
  wheel: 'Lenkrad drehen lenkt',
};

export interface KartSettings {
  /** How the kart is steered. The first thing anybody wants to change. */
  steering: SteeringMode;
  /** Metres per second² at full throttle, for a kart of the reference weight. */
  acceleration: number;
  /** Top speed in km/h — the number everybody thinks in. */
  topSpeed: number;
  /** Metres per second² the brake takes off. */
  braking: number;
  /**
   * How hard the tyres hold the road, 0 to 1. High means the kart goes where
   * it points; low lets the back step out and slide through a corner.
   */
  traction: number;
  /**
   * **Wie viel Griff Gas und Bremse auffressen**, 0 bis 1.
   *
   * Die Traktion allein beschreibt einen Reifen, der immer gleich gut hält —
   * und das ist der eine Punkt, an dem ein Kart sich nicht so anfühlt wie
   * eines. Ein Reifen hat *ein* Budget: Was er längs überträgt, fehlt ihm quer.
   * Wer aus der Kurve heraus voll aufs Gas geht, dreht durch; wer voll in die
   * Kurve hineinbremst, blockiert. Genau das steht hier — `0` ist der
   * gutmütige Reifen von vorher, `1` einer, der bei Vollgas praktisch keinen
   * Seitenhalt mehr hat.
   */
  slip: number;
  /**
   * **Wie weit der Blick der Lenkung hinterherzieht**, in Sekunden.
   *
   * Keine Fahrwerkszahl, sondern eine Sitzposition: Der Kopf ist nicht am Kart
   * festgeschraubt, sondern läuft ihm nach (`kartView.ts`). `0` schraubt ihn
   * an den Rand der Totzone — und wer das eine halbe Runde lang probiert,
   * weiß, warum es die Einstellung gibt.
   */
  headLag: number;
  /**
   * **Die Totzone des Kopfes**, in Grad.
   *
   * So weit darf das Kart voraus sein, ohne dass der Blick überhaupt mitgeht.
   * Eine kurze Ausweichbewegung links-rechts ist damit für den Kopf kein
   * Ereignis mehr: Das Kart wackelt, der Horizont steht still. Erst am Rand
   * dieses Fensters wird er mitgenommen.
   */
  headDeadZone: number;
  /**
   * **Wie schnell der Kopf höchstens mitdreht**, in Grad je Sekunde; `0` heißt
   * ohne Deckel.
   *
   * Der Nachlauf allein holt einen großen Rückstand mit einem großen Satz auf,
   * und genau dieser Satz ist es, der in der Brille wehtut. Hier steht, wie
   * langsam er sein soll.
   */
  headTurnRate: number;
  /**
   * **Helm auf beim Fahren.**
   *
   * Ein Gegenstand aus der Kleiderkiste (`core/headgear.ts`) und zugleich das
   * billigste Mittel gegen Übelkeit, das es in VR gibt: Der Rand des Visiers
   * steht **fest im Blick**, während die Welt darin schwenkt. Das Auge hat
   * damit wieder etwas, das sich nicht bewegt, und der Widerspruch zum
   * Innenohr wird kleiner. Wer ihn nicht mag, lässt ihn aus.
   */
  helmet: boolean;
  /** Kilograms. A heavy kart accelerates worse and shoves harder. */
  mass: number;
  /** Biggest angle the front wheels turn to, in degrees. */
  steerAngle: number;
  /** Distance between the axles in metres — short turns tighter. */
  wheelbase: number;
  /** Top speed backwards, in km/h. */
  reverse: number;
}

/** The kart everything else is measured against. */
export const DEFAULT_KART: KartSettings = {
  steering: 'stick',
  acceleration: 9,
  topSpeed: 45,
  braking: 14,
  traction: 0.75,
  slip: 0.5,
  headLag: 0.15,
  headDeadZone: 8,
  headTurnRate: 45,
  helmet: false,
  mass: 140,
  steerAngle: 32,
  wheelbase: 1.15,
  reverse: 12,
};

/**
 * The weight the acceleration figure is quoted for. A kart twice as heavy
 * accelerates half as hard — that is the whole of the weight setting.
 */
export const REFERENCE_MASS = 140;

/** Every setting that is a plain number — everything but the two switches. */
export type NumericKartKey = Exclude<keyof KartSettings, 'steering' | 'helmet'>;

/** One value the player may step through or type in. */
export interface KartField {
  key: NumericKartKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  /** Decimals the display and the keypad keep. */
  decimals: number;
  /** What the number does, one line. */
  sub: string;
  /** The notches a tap on the row steps through. */
  steps: readonly number[];
}

export const KART_FIELDS: readonly KartField[] = [
  {
    key: 'acceleration',
    label: 'Beschleunigung',
    unit: 'm/s²',
    min: 1,
    max: 40,
    decimals: 1,
    sub: 'Wie kräftig das Gas zieht',
    steps: [4, 6.5, 9, 14, 22, 34],
  },
  {
    key: 'topSpeed',
    label: 'Höchstgeschwindigkeit',
    unit: 'km/h',
    min: 4,
    max: 160,
    decimals: 0,
    sub: 'Wo der Motor aufhört zu ziehen',
    steps: [18, 30, 45, 65, 90, 130],
  },
  {
    key: 'braking',
    label: 'Bremskraft',
    unit: 'm/s²',
    min: 1,
    max: 50,
    decimals: 1,
    sub: 'Was der linke Trigger wegnimmt',
    steps: [5, 9, 14, 22, 34],
  },
  {
    key: 'traction',
    label: 'Traktion',
    unit: '',
    // Zwei Hundertstel, und das ist Absicht: Bei 0,15 war unten Schluss, und
    // dort *rutscht* ein Kart noch nicht, es fährt nur unpräzise. Was man
    // eigentlich will — ein Kart, das die ganze Kurve quer nimmt — fängt eine
    // Zehnerpotenz tiefer an.
    min: 0.02,
    max: 1,
    decimals: 2,
    sub: 'Griff der Reifen — wenig heißt driften',
    steps: [0.05, 0.1, 0.2, 0.35, 0.55, 0.75, 1],
  },
  {
    key: 'slip',
    label: 'Reifenschlupf',
    unit: '',
    min: 0,
    max: 1,
    decimals: 2,
    sub: 'Wie viel Griff Gas und Bremse auffressen',
    steps: [0, 0.25, 0.5, 0.75, 1],
  },
  {
    key: 'headLag',
    label: 'Kopf zieht nach',
    unit: 's',
    min: 0,
    max: 0.6,
    decimals: 2,
    sub: 'Der Blick folgt der Kurve verzögert — gegen Übelkeit',
    steps: [0, 0.08, 0.15, 0.25, 0.4],
  },
  {
    key: 'headDeadZone',
    label: 'Kopf-Totzone',
    unit: '°',
    min: 0,
    // Knapp unter `MAX_LAG`: Eine Totzone, die größer wäre als der
    // Höchstversatz, wäre keine — der harte Deckel zöge den Kopf ohnehin nach.
    max: 20,
    decimals: 0,
    sub: 'So weit dreht das Kart, ohne dass der Kopf mitgeht',
    steps: [0, 5, 8, 12, 18],
  },
  {
    key: 'headTurnRate',
    label: 'Kopf-Drehrate',
    unit: '°/s',
    min: 0,
    max: 360,
    decimals: 0,
    sub: 'Wie schnell er höchstens mitdreht — 0 ist ohne Deckel',
    steps: [0, 20, 30, 45, 70, 120],
  },
  {
    key: 'mass',
    label: 'Gewicht',
    unit: 'kg',
    min: 40,
    max: 900,
    decimals: 0,
    sub: 'Schwer zieht schlechter an und schiebt mehr',
    steps: [70, 100, 140, 220, 380, 650],
  },
  {
    key: 'steerAngle',
    label: 'Lenkeinschlag',
    unit: '°',
    min: 5,
    max: 60,
    decimals: 0,
    sub: 'Wie weit die Vorderräder einschlagen',
    steps: [14, 22, 32, 44, 56],
  },
  {
    key: 'wheelbase',
    label: 'Radstand',
    unit: 'm',
    min: 0.5,
    max: 3.5,
    decimals: 2,
    sub: 'Kurz dreht enger, lang läuft ruhiger',
    steps: [0.7, 0.9, 1.15, 1.5, 2.2],
  },
  {
    key: 'reverse',
    label: 'Rückwärts',
    unit: 'km/h',
    min: 0,
    max: 60,
    decimals: 0,
    sub: 'Tempo, wenn die Bremse im Stand gehalten wird',
    steps: [0, 6, 12, 20, 32],
  },
];

/** One value inside its range and rounded to the decimals it is shown with. */
export function clampKartField(field: KartField, value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_KART[field.key];
  const factor = 10 ** field.decimals;
  return Math.round(Math.min(field.max, Math.max(field.min, value)) * factor) / factor;
}

/** Every value inside its range, and the two switches spelled correctly. */
export function clampKart(settings: Partial<KartSettings>): KartSettings {
  const next: KartSettings = { ...DEFAULT_KART, ...settings };
  for (const field of KART_FIELDS) next[field.key] = clampKartField(field, next[field.key]);
  if (!STEERING_MODES.includes(next.steering)) next.steering = DEFAULT_KART.steering;
  next.helmet = next.helmet === true;
  return next;
}

/**
 * Die drei Zahlen, mit denen der Kopf dem Kart folgt (`kartView.ts`).
 *
 * Hier und nicht dort: `kartView` rechnet und kennt kein Kart, `kartSettings`
 * weiß, wie die Werte heißen. Ein Übersetzer von drei Zeilen ist billiger als
 * eine Datei, die beides tut.
 */
export function viewFollow(settings: KartSettings): ViewFollow {
  return { lag: settings.headLag, dead: settings.headDeadZone, rate: settings.headTurnRate };
}

/** The next notch above where the kart is set, wrapping around at the top. */
export function nextKartStep(field: KartField, value: number): number {
  return clampKartField(field, nextStep(field.steps, value));
}

/** What the menu writes next to the name of a value. */
export function kartFieldLabel(field: KartField, settings: KartSettings): string {
  const value = settings[field.key];
  return field.unit ? `${value} ${field.unit}` : `${value}`;
}

/** A kart in the pit lane: a name, a colour and a set of numbers. */
export interface KartPreset {
  id: string;
  name: string;
  /** One line on the sign beside it. */
  tagline: string;
  color: number;
  settings: KartSettings;
}

/**
 * Four karts, deliberately different enough that the first corner already
 * tells them apart — and every number of every one of them can be changed on
 * its own clipboard afterwards.
 */
export const KART_PRESETS: readonly KartPreset[] = [
  {
    id: 'standard',
    name: 'Standard',
    tagline: 'Gutmütig, verzeiht viel',
    color: 0x4aa8ff,
    settings: clampKart({}),
  },
  {
    id: 'renner',
    name: 'Renner',
    tagline: 'Schnell, leicht, nervös',
    color: 0xff3b2f,
    settings: clampKart({
      acceleration: 14,
      topSpeed: 90,
      braking: 22,
      traction: 0.55,
      slip: 0.75,
      mass: 100,
      steerAngle: 28,
      wheelbase: 1.15,
    }),
  },
  {
    id: 'brummer',
    name: 'Brummer',
    tagline: 'Schwer, langsam, bleibt in der Spur',
    color: 0xffc857,
    settings: clampKart({
      acceleration: 6.5,
      topSpeed: 30,
      braking: 9,
      traction: 1,
      slip: 0.25,
      mass: 380,
      steerAngle: 22,
      wheelbase: 2.2,
    }),
  },
  {
    id: 'drifter',
    name: 'Drifter',
    tagline: 'Wenig Griff — quer durch die Kurve',
    color: 0x5ee0a0,
    settings: clampKart({
      acceleration: 14,
      topSpeed: 65,
      braking: 14,
      // Der eine Wagen, der die neue Untergrenze auch ausreizt: bei 0,05 hält
      // gar nichts mehr, und mit vollem Schlupf steht er beim Gasgeben quer.
      traction: 0.05,
      slip: 1,
      mass: 100,
      steerAngle: 44,
      wheelbase: 0.9,
    }),
  },
];
