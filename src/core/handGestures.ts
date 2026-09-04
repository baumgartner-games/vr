/**
 * What a bare hand is doing, read off its joints.
 *
 * With controllers there is no question: a grip button is a grip button. With
 * hand tracking the runtime only offers **pinch**, and pinch had to stand in
 * for everything — so grabbing a cube and pulling a trigger were the same
 * gesture, and neither felt like what it was.
 *
 * The two gestures a hand really makes are these:
 *
 * - **Greifen** — middle, ring and little finger fold onto the palm. That is
 *   what a hand closing around something does, and it leaves the index finger
 *   and the thumb free, exactly as they are on a real grip.
 * - **Trigger** — the index finger folds onto the palm. That is the finger
 *   that pulls a trigger, and nothing else has to move for it.
 *
 * A closed fist therefore does both at once, which is correct: a fist around a
 * pistol grip *is* holding it and pulling.
 *
 * How folded a finger is comes out as one number per finger: the distance from
 * its tip to the middle of the palm, divided by the length of the palm. That
 * ratio is the same for a big hand and a small one, which is the whole reason
 * it is a ratio — a threshold in centimetres would work for one player and for
 * nobody else.
 *
 * Plain `{x, y, z}` in, numbers out: no three.js, so the thresholds are tested
 * rather than guessed at in a headset.
 */

/** Anything with three coordinates — a joint pose, a `THREE.Vector3`, … */
export interface Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** The joints this needs, by their WebXR names. Missing ones are `null`. */
export interface HandJoints {
  wrist: Point3 | null;
  /** Wrist end of the middle finger's metacarpal bone. */
  palmBase: Point3 | null;
  /** The middle finger's knuckle — the far end of the palm. */
  palmKnuckle: Point3 | null;
  thumbTip: Point3 | null;
  indexTip: Point3 | null;
  middleTip: Point3 | null;
  ringTip: Point3 | null;
  pinkyTip: Point3 | null;
}

/** How far each fingertip is from the palm, in palm lengths. */
export interface HandFold {
  thumb: number;
  index: number;
  middle: number;
  ring: number;
  pinky: number;
}

/** The two things a hand can be doing at once. */
export interface HandGesture {
  /** Middle, ring and little finger on the palm. */
  grab: boolean;
  /** Index finger on the palm. */
  trigger: boolean;
}

/**
 * Below this many palm lengths a finger counts as folded, above the other one
 * it counts as open again. The gap between them is deliberate: a finger held
 * right on a single threshold would otherwise chatter the button dozens of
 * times a second, and a trigger that stutters is worse than one that is a
 * little slow.
 */
export const FOLD_CLOSED = 0.78;
export const FOLD_OPEN = 1.0;

/** Nothing at all: what a hand that is not tracked reports. */
export const NO_GESTURE: HandGesture = { grab: false, trigger: false };

/**
 * How far each fingertip sits from the middle of the palm, measured in palm
 * lengths. Null when the runtime has not given us enough joints to say.
 */
export function foldRatios(joints: HandJoints): HandFold | null {
  const { wrist, palmBase, palmKnuckle } = joints;
  if (!wrist || !palmBase || !palmKnuckle) return null;

  // The palm is the stretch from the wrist end of the metacarpals to the
  // knuckles; its middle is as good a centre as a hand has, and its length is
  // the ruler everything else is measured with.
  const centre = {
    x: (palmBase.x + palmKnuckle.x) / 2,
    y: (palmBase.y + palmKnuckle.y) / 2,
    z: (palmBase.z + palmKnuckle.z) / 2,
  };
  const scale = distance(wrist, palmKnuckle);
  if (!(scale > 1e-4)) return null;

  const ratio = (tip: Point3 | null): number =>
    tip ? distance(tip, centre) / scale : Number.POSITIVE_INFINITY;

  return {
    thumb: ratio(joints.thumbTip),
    index: ratio(joints.indexTip),
    middle: ratio(joints.middleTip),
    ring: ratio(joints.ringTip),
    pinky: ratio(joints.pinkyTip),
  };
}

/**
 * The gesture those ratios make, with the previous answer as the hysteresis
 * reference: a finger that was folded stays folded until it opens well past
 * the closing threshold.
 */
export function readGesture(fold: HandFold | null, previous: HandGesture = NO_GESTURE): HandGesture {
  if (!fold) return { ...NO_GESTURE };
  const folded = (value: number, was: boolean): boolean =>
    was ? value < FOLD_OPEN : value < FOLD_CLOSED;

  // Greifen needs all three of them down. Two out of three is a hand halfway
  // through something, and half a grab drops whatever it was carrying.
  const grab =
    folded(fold.middle, previous.grab) &&
    folded(fold.ring, previous.grab) &&
    folded(fold.pinky, previous.grab);

  return { grab, trigger: folded(fold.index, previous.trigger) };
}

/** One line for a display: every finger with its ratio, folded ones marked. */
export function formatFold(fold: HandFold | null): string {
  if (!fold) return 'keine Hand';
  const names: Array<[string, number]> = [
    ['D', fold.thumb],
    ['Z', fold.index],
    ['M', fold.middle],
    ['R', fold.ring],
    ['K', fold.pinky],
  ];
  return names
    .map(([name, value]) => `${name} ${Number.isFinite(value) ? value.toFixed(2) : '–'}`)
    .join(' · ');
}

function distance(a: Point3, b: Point3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
