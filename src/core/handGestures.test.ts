import {
  FOLD_CLOSED,
  FOLD_OPEN,
  foldRatios,
  formatFold,
  readGesture,
  type HandFold,
  type HandJoints,
} from './handGestures';

/**
 * A hand lying flat in the XZ plane: the wrist at the origin, the palm running
 * along +Z, the fingertips further along it. `curl` pulls a fingertip back onto
 * the palm centre, 0 = straight out, 1 = right on the palm.
 */
function hand(curls: Partial<Record<keyof HandFold, number>> = {}): HandJoints {
  const palm = 0.09;
  const centre = palm / 2;
  const tip = (curl: number): { x: number; y: number; z: number } => ({
    x: 0,
    y: 0,
    // Straight out the tip sits a palm length beyond the knuckles; curling it
    // walks it back to the middle of the palm.
    z: centre + (1 - curl) * palm * 1.55,
  });
  return {
    wrist: { x: 0, y: 0, z: 0 },
    palmBase: { x: 0, y: 0, z: 0.01 },
    palmKnuckle: { x: 0, y: 0, z: palm },
    thumbTip: tip(curls.thumb ?? 0),
    indexTip: tip(curls.index ?? 0),
    middleTip: tip(curls.middle ?? 0),
    ringTip: tip(curls.ring ?? 0),
    pinkyTip: tip(curls.pinky ?? 0),
  };
}

describe('foldRatios', () => {
  it('measures fingertips in palm lengths, not in centimetres', () => {
    const small = foldRatios(hand())!;
    // The same hand, twice the size: the ratios have to come out identical, or
    // a child and an adult would need different thresholds.
    const big = foldRatios(scale(hand(), 2))!;
    expect(big.index).toBeCloseTo(small.index, 6);
    expect(small.index).toBeGreaterThan(FOLD_OPEN);
  });

  it('has no opinion without the joints to form one', () => {
    const missing = { ...hand(), palmKnuckle: null };
    expect(foldRatios(missing)).toBeNull();
  });

  it('reports a finger it cannot see as wide open, never as folded', () => {
    const fold = foldRatios({ ...hand({ index: 1 }), indexTip: null })!;
    expect(readGesture(fold).trigger).toBe(false);
  });
});

describe('readGesture', () => {
  it('makes a grab out of the three fingers that close around a grip', () => {
    const fold = foldRatios(hand({ middle: 1, ring: 1, pinky: 1 }))!;
    const gesture = readGesture(fold);
    expect(gesture.grab).toBe(true);
    // Index and thumb stayed out, so nothing was triggered.
    expect(gesture.trigger).toBe(false);
  });

  it('does not grab on two fingers out of three', () => {
    const fold = foldRatios(hand({ middle: 1, ring: 1 }))!;
    expect(readGesture(fold).grab).toBe(false);
  });

  it('makes a trigger out of the index finger alone', () => {
    const fold = foldRatios(hand({ index: 1 }))!;
    expect(readGesture(fold)).toEqual({ grab: false, trigger: true });
  });

  it('reads a fist as both at once', () => {
    const fold = foldRatios(hand({ index: 1, middle: 1, ring: 1, pinky: 1 }))!;
    expect(readGesture(fold)).toEqual({ grab: true, trigger: true });
  });

  it('holds on between the two thresholds instead of chattering', () => {
    const between: HandFold = {
      thumb: 2,
      index: (FOLD_CLOSED + FOLD_OPEN) / 2,
      middle: 2,
      ring: 2,
      pinky: 2,
    };
    // Coming from open it is not enough to close the trigger …
    expect(readGesture(between, { grab: false, trigger: false }).trigger).toBe(false);
    // … and coming from closed it is not enough to let it go again.
    expect(readGesture(between, { grab: false, trigger: true }).trigger).toBe(true);
  });

  it('says nothing at all without a hand', () => {
    expect(readGesture(null, { grab: true, trigger: true })).toEqual({
      grab: false,
      trigger: false,
    });
  });
});

describe('formatFold', () => {
  it('writes one number per finger, and says so when there is no hand', () => {
    expect(formatFold(null)).toBe('keine Hand');
    expect(formatFold(foldRatios(hand({ index: 1 }))!)).toContain('Z 0.');
  });
});

function scale(joints: HandJoints, factor: number): HandJoints {
  const grow = (point: { x: number; y: number; z: number } | null) =>
    point ? { x: point.x * factor, y: point.y * factor, z: point.z * factor } : null;
  return {
    wrist: grow(joints.wrist),
    palmBase: grow(joints.palmBase),
    palmKnuckle: grow(joints.palmKnuckle),
    thumbTip: grow(joints.thumbTip),
    indexTip: grow(joints.indexTip),
    middleTip: grow(joints.middleTip),
    ringTip: grow(joints.ringTip),
    pinkyTip: grow(joints.pinkyTip),
  };
}
