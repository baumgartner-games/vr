/**
 * How many portal views are drawn into one another.
 *
 * One level is a portal that shows the room behind its partner — and, inside
 * that view, a partner that shows nothing but its idle swirl. Every further
 * level costs one more full pass over the whole scene (per portal, per eye),
 * which is why this is a setting and not a constant: a standalone headset
 * wants two, a PC can afford four, and one is the cheapest honest picture.
 *
 * The value lives in the browser like the other settings, so a headset that
 * struggles keeps its answer over a reload.
 */

const KEY = 'bgvr.portalDepth';

/** The notches the menu steps through. */
export const PORTAL_DEPTH_STEPS = [1, 2, 3, 4] as const;

/**
 * Two, not one: a portal with nothing but a swirl in it reads as a hole with a
 * lamp behind it, and the second level is where it starts to look like a room.
 */
export const DEFAULT_PORTAL_DEPTH = 2;

export const MIN_PORTAL_DEPTH: number = PORTAL_DEPTH_STEPS[0];
export const MAX_PORTAL_DEPTH: number = PORTAL_DEPTH_STEPS[PORTAL_DEPTH_STEPS.length - 1]!;

/** Whatever comes in becomes a whole number of levels inside the range. */
export function clampPortalDepth(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return DEFAULT_PORTAL_DEPTH;
  return Math.min(MAX_PORTAL_DEPTH, Math.max(MIN_PORTAL_DEPTH, Math.round(number)));
}

/** The next notch, wrapping around at the top — one tap per step in the menu. */
export function nextPortalDepth(current: number): number {
  const depth = clampPortalDepth(current);
  const index = PORTAL_DEPTH_STEPS.findIndex((step) => step === depth);
  return PORTAL_DEPTH_STEPS[(index + 1) % PORTAL_DEPTH_STEPS.length]!;
}

/** What the player has set, or the default while they never touched it. */
export function portalDepth(): number {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw === null || raw === undefined ? DEFAULT_PORTAL_DEPTH : clampPortalDepth(raw);
  } catch {
    return DEFAULT_PORTAL_DEPTH;
  }
}

/** Stores a new value and hands back what was actually kept. */
export function savePortalDepth(value: number): number {
  const depth = clampPortalDepth(value);
  try {
    globalThis.localStorage?.setItem(KEY, String(depth));
  } catch {
    /* private mode; nothing we can do about it */
  }
  return depth;
}
