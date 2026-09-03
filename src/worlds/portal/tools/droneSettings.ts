/**
 * How the drone is flown, and what happens to one that is already out there.
 *
 * Two schools fly a quadcopter, and they do not agree. Somebody who flies
 * camera copters expects the left stick to *move* the machine and the right
 * one to turn and climb; somebody who races expects the left stick to be
 * throttle and rudder and the right one to be the actual attitude. Neither is
 * wrong, so both are here and the little menu on the tool picks one.
 *
 * Pure data and labels — no three.js, so `DroneTool` is the only place that
 * has to know what a stick axis does to a rotor.
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
    label: 'Kopter-Profi',
    left: 'links/rechts, vor/zurück',
    right: 'drehen, auf/ab',
  },
  {
    id: 'racing',
    label: 'Racing-Drohne',
    left: 'Gas, Gieren',
    right: 'Roll, Nick',
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
