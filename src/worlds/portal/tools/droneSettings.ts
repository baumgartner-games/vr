/**
 * Wie die Drohne geflogen wird, und was mit einer passiert, die schon draußen
 * steht.
 *
 * Zwei Schulen fliegen eine Drohne, und sie sind sich nicht einig. Wer
 * Kameradrohnen fliegt, erwartet einen **Hubschrauber**: linker Stick schiebt
 * die Maschine, rechter dreht sie und nimmt sie hoch und runter, die Lage
 * bleibt waagerecht. Wer rast, erwartet einen **Jet**: der rechte Stick ist
 * der Steuerknüppel, die Maschine legt sich in die Kurve und fliegt dorthin,
 * wo ihre eigene Nase hinzeigt. Beides ist richtig, deshalb ist beides da und
 * das kleine Menü am Werkzeug sucht aus.
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
}

export const DEFAULT_DRONE: DroneSettings = { profile: 'kopter', replace: false };

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

/** A settings object with both values spelled correctly. */
export function clampDrone(settings: Partial<DroneSettings> | undefined): DroneSettings {
  const next = { ...DEFAULT_DRONE, ...settings };
  if (!DRONE_PROFILE_IDS.includes(next.profile)) next.profile = DEFAULT_DRONE.profile;
  next.replace = next.replace === true;
  return next;
}
