/**
 * Sitting or standing — the one thing about a player the headset cannot tell.
 *
 * A headset reports where the head is above the *floor of the room*, and every
 * height in a world is measured from that same floor. That works perfectly for
 * somebody standing up and fails quietly for everybody else: sit down on a
 * chair and the head drops thirty to forty centimetres, so the kitchen counter
 * grows, the go-kart swallows you and the whole world turns into a place built
 * for somebody taller. Nothing in WebXR says which of the two it is, so the
 * player is asked once — on the start page, and afterwards under
 * *Menü → Bewegung → Haltung*.
 *
 * What the answer does is in `PlayerRig`: a seated player gets the difference
 * to `STANDING_EYE` added back as a lift, with the feet left where they are.
 */

export type Posture = 'stand' | 'sit';

/** Eye height a standing player is assumed to have, in metres. */
export const STANDING_EYE = 1.65;

const KEY = 'bgvr.posture';

/** What the player picked, or `stand` until they pick something. */
export function playerPosture(): Posture {
  return readPosture() ?? 'stand';
}

/** False while nobody has answered the question yet — the start page asks. */
export function hasPlayerPosture(): boolean {
  return readPosture() !== null;
}

export function savePlayerPosture(posture: Posture): void {
  try {
    globalThis.localStorage?.setItem(KEY, posture);
  } catch {
    // Private mode, no storage: the choice then lasts for this session only.
  }
}

function readPosture(): Posture | null {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw === 'sit' || raw === 'stand' ? raw : null;
  } catch {
    return null;
  }
}
