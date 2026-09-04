/**
 * The cone of the torch: how wide it opens, how bright it is and how far it
 * carries.
 *
 * The width is set with the *other* hand — grab the lens and pull it right for
 * a floodlight, left for a spot. The two numbers that follow from it are the
 * whole reason the world exists: a torch has a fixed amount of light, so a
 * narrow beam is brighter and reaches further, and a wide one washes the room
 * in front of you and dies after a few metres. Straight physics would be too
 * harsh (a 6° beam would be thirteen times as bright as a 22° one), so the
 * solid-angle ratio is softened with a square root and then held inside a
 * range you can actually work with.
 *
 * No three.js in here on purpose: this is the part that has to be right, and
 * it is tested without a browser.
 */

/** Half angle of the cone, in degrees. */
export const MIN_BEAM_ANGLE = 6;
export const MAX_BEAM_ANGLE = 55;
export const DEFAULT_BEAM_ANGLE = 22;

/** How much a metre of hand travel at the lens opens or closes the cone. */
export const BEAM_DEGREES_PER_METRE = 200;

/** Candela of the spot light at the default angle. */
const BASE_INTENSITY = 26;
/** How far it carries at the default angle, in metres. */
const BASE_RANGE = 18;
/** Ends of the brightness ratio — a torch is not a laser and not the sun. */
const MIN_GAIN = 0.4;
const MAX_GAIN = 3;

export function clampBeamAngle(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_BEAM_ANGLE;
  return Math.min(MAX_BEAM_ANGLE, Math.max(MIN_BEAM_ANGLE, value));
}

/**
 * The angle after dragging the lens sideways.
 *
 * @param start angle when the hand took hold of the lens
 * @param drag how far the hand has moved since, in metres along the torch's
 *   own right — positive opens the cone up.
 */
export function beamAngleFromDrag(start: number, drag: number): number {
  return clampBeamAngle(clampBeamAngle(start) + drag * BEAM_DEGREES_PER_METRE);
}

/** Solid angle of the cone, relative to the one at the default angle. */
function gain(angle: number): number {
  const radians = (Math.PI / 180) * clampBeamAngle(angle);
  const reference = 1 - Math.cos((Math.PI / 180) * DEFAULT_BEAM_ANGLE);
  const ratio = Math.sqrt(reference / (1 - Math.cos(radians)));
  return Math.min(MAX_GAIN, Math.max(MIN_GAIN, ratio));
}

/** Candela for a cone of this width: narrow is bright, wide is soft. */
export function beamIntensity(angle: number): number {
  return BASE_INTENSITY * gain(angle);
}

/**
 * How far the light carries. Brightness falls with the square of the distance,
 * so the reach grows with the square root of the gain.
 */
export function beamRange(angle: number): number {
  return BASE_RANGE * Math.sqrt(gain(angle));
}

/** What the menu and the notification say about a cone. */
export function beamLabel(angle: number): string {
  return `${Math.round(clampBeamAngle(angle) * 2)}° breit`;
}
