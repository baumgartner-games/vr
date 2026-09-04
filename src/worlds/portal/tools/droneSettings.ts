import { DEFAULT_SPEED, DEFAULT_TURN } from './droneFlight';

/**
 * Wie die Drohne geflogen wird, und was mit einer passiert, die schon draußen
 * steht.
 *
 * Zwei Schulen fliegen eine Drohne, und sie sind sich nicht einig. Wer
 * Kameradrohnen fliegt, erwartet einen **Hubschrauber**: linker Stick schiebt
 * die Maschine, rechter dreht sie und nimmt sie hoch und runter, die Lage
 * bleibt waagerecht. Wer rast, erwartet einen **Jet**: der rechte Stick ist
 * der Steuerknüppel, die Maschine legt sich in die Kurve und fliegt dorthin,
 * wo ihre eigene Nase hinzeigt — und man sitzt dabei im Cockpit. Beides ist
 * richtig, deshalb ist beides da und das kleine Menü am Werkzeug sucht aus.
 *
 * Dazu die zwei Zahlen, die jeder anders will: **Tempo** und **Drehrate**. Wer
 * eine Halle vermisst, fliegt langsam und dreht gemächlich; wer über die Wüste
 * jagt, will beides oben. Die Rasten sind Vorschläge, die rohe Zahl steht
 * daneben — genau wie bei der Pistole.
 *
 * Reine Daten und Beschriftungen — kein three.js. Was ein Stick mit einem
 * Rotor macht, steht in `droneFlight.ts`; wie sich das anfühlt, in `DroneTool`.
 */

/** Which stick does what. */
export type DroneProfile = 'kopter' | 'racing';

export interface DroneSettings {
  profile: DroneProfile;
  /**
   * Taking the tool out again puts a *new* drone in front of the player and
   * scraps the one still hovering somewhere. Off, it flies on from where it
   * was left — which is what you want for a drone parked as a lookout, and
   * exactly what you do not want after losing one behind a wall.
   */
  replace: boolean;
  /** Reisegeschwindigkeit in m/s. Steigen und Sinken hängen daran. */
  speed: number;
  /** Drehrate in Grad pro Sekunde. Nicken und Rollen des Jets hängen daran. */
  turn: number;
}

export const DEFAULT_DRONE: DroneSettings = {
  profile: 'kopter',
  replace: false,
  speed: DEFAULT_SPEED,
  turn: DEFAULT_TURN,
};

export const DRONE_PROFILES: ReadonlyArray<{
  id: DroneProfile;
  label: string;
  /** The two sticks, in one line each. */
  left: string;
  right: string;
}> = [
  {
    id: 'kopter',
    label: 'Kopter',
    left: 'schieben',
    right: 'drehen, auf/ab',
  },
  {
    id: 'racing',
    label: 'Jet',
    left: 'vor/zurück, quer',
    right: 'rollen, nicken',
  },
];

export const DRONE_PROFILE_IDS: readonly DroneProfile[] = ['kopter', 'racing'];

export function droneProfileLabel(profile: DroneProfile): string {
  return DRONE_PROFILES.find((entry) => entry.id === profile)?.label ?? profile;
}

/** Eine Zahl, die im Menü verstellt wird, samt dem Bereich, der Sinn ergibt. */
export interface DroneField {
  key: 'speed' | 'turn';
  label: string;
  unit: string;
  min: number;
  max: number;
  /** Nachkommastellen, mit denen der Wert gezeigt und gespeichert wird. */
  decimals: number;
  /** Was die Zahl tut, in einer Zeile. */
  sub: string;
  /** Die Rasten, durch die eine Zeile weiterschaltet. */
  steps: readonly number[];
}

export const DRONE_FIELDS: readonly DroneField[] = [
  {
    key: 'speed',
    label: 'Tempo',
    unit: 'm/s',
    min: 0.5,
    max: 60,
    decimals: 1,
    sub: 'Wie schnell sie fliegt — Steigen zieht mit',
    steps: [2, 3.5, 5.5, 9, 14, 22],
  },
  {
    key: 'turn',
    label: 'Drehrate',
    unit: '°/s',
    min: 10,
    max: 400,
    decimals: 0,
    sub: 'Wie schnell sie dreht — Jet: Rollen und Nicken',
    steps: [30, 45, 70, 110, 160, 240],
  },
];

/**
 * Eine Zahl in ihrem Bereich und auf die Stellen gerundet, mit denen sie
 * angezeigt wird. Alles, was keine Zahl ist — oder eine Null aus einem alten
 * Konfig-Code, der diese Felder noch gar nicht kannte —, fällt auf den
 * Auslieferungswert zurück statt auf das Minimum.
 */
export function clampDroneField(field: DroneField, value: number | undefined): number {
  if (!Number.isFinite(value) || (value as number) <= 0) return DEFAULT_DRONE[field.key];
  const factor = 10 ** field.decimals;
  return Math.round(Math.min(field.max, Math.max(field.min, value as number)) * factor) / factor;
}

/**
 * Die nächste Raste über dem eingestellten Wert, oben angekommen wieder von
 * vorne. Ein getippter Wert sitzt selten auf einer Raste, und „die nächste
 * nach oben“ ist das, was ein Druck auf die Zeile verspricht.
 */
export function nextDroneStep(field: DroneField, value: number): number {
  return field.steps.find((step) => step > value + 1e-9) ?? field.steps[0]!;
}

/** Wie die Zahl auf der Zeile steht. */
export function droneFieldLabel(field: DroneField, value: number): string {
  return `${value.toFixed(field.decimals)} ${field.unit}`;
}

/** A settings object with every value spelled correctly. */
export function clampDrone(settings: Partial<DroneSettings> | undefined): DroneSettings {
  const next = { ...DEFAULT_DRONE, ...settings };
  if (!DRONE_PROFILE_IDS.includes(next.profile)) next.profile = DEFAULT_DRONE.profile;
  next.replace = next.replace === true;
  for (const field of DRONE_FIELDS) next[field.key] = clampDroneField(field, next[field.key]);
  return next;
}
