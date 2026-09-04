/**
 * The notches of the dimmer in the dark house.
 *
 * A switch with two positions answers one question — is the light on? — and
 * the interesting ones lie in between: how little light is enough to walk a
 * corridor, at what point a torch stops being worth carrying. So the plate on
 * the wall steps through five settings, from properly dark to brighter than a
 * room needs, and each press moves one notch on.
 *
 * No three.js in here: the steps and their labels are the part worth testing.
 */

export interface LightLevel {
  label: string;
  /** Share of the full lamp brightness, 0 to 1. */
  brightness: number;
}

/** From all the way off to brighter than a hallway ever is. */
export const LIGHT_LEVELS: readonly LightLevel[] = [
  { label: 'Aus', brightness: 0 },
  { label: 'Dämmrig', brightness: 0.16 },
  { label: 'Gedimmt', brightness: 0.42 },
  { label: 'Normal', brightness: 0.72 },
  { label: 'Hell', brightness: 1 },
];

/**
 * Candela of a ceiling lamp at the top notch.
 *
 * Far above what the other worlds give a lamp, and it has to be: they all
 * stand in a room with an ambient light and a sun, where a lamp is an accent.
 * Here the lamps *are* the light, and everything below this reads as "the
 * bulb is on" rather than as a lit room.
 */
export const MAX_LAMP_INTENSITY = 26;

/** Which notch the house starts on: none at all. That is the experiment. */
export const DEFAULT_LIGHT_STEP = 0;

export function clampLightStep(step: number): number {
  if (!Number.isFinite(step)) return DEFAULT_LIGHT_STEP;
  return Math.min(LIGHT_LEVELS.length - 1, Math.max(0, Math.round(step)));
}

/** One press: the next notch, and back to dark after the brightest one. */
export function nextLightStep(step: number): number {
  return (clampLightStep(step) + 1) % LIGHT_LEVELS.length;
}

/** Share of full brightness at this notch. */
export function lightBrightness(step: number): number {
  return LIGHT_LEVELS[clampLightStep(step)]!.brightness;
}

/** What a ceiling lamp is set to at this notch. */
export function lampIntensity(step: number): number {
  return MAX_LAMP_INTENSITY * lightBrightness(step);
}

/** What the switch, the menu row and the notification say. */
export function lightLabel(step: number): string {
  const level = LIGHT_LEVELS[clampLightStep(step)]!;
  return level.brightness === 0
    ? level.label
    : `${level.label} · ${Math.round(level.brightness * 100)} %`;
}
