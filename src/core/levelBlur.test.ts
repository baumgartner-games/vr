import {
  LEVEL_BLUR_ABOVE_FULL,
  LEVEL_BLUR_ABOVE_START,
  LEVEL_BLUR_FULL,
  LEVEL_BLUR_START,
  levelBlurAboveAmount,
  levelBlurAmount,
  levelBlurPlan,
} from './levelBlur';

describe('Etagen darunter unscharf', () => {
  it('bleibt auf der eigenen Etage scharf und verschwimmt ein Stockwerk tiefer ganz', () => {
    expect(levelBlurAmount(2.8, 2.8)).toBe(0);
    expect(levelBlurAmount(2.8, 4)).toBe(0);
    expect(levelBlurAmount(2.8, 2.8 - LEVEL_BLUR_START)).toBe(0);
    expect(levelBlurAmount(2.8, 2.8 - LEVEL_BLUR_FULL)).toBe(1);
    expect(levelBlurAmount(2.8, -5)).toBe(1);
    const half = levelBlurAmount(2.8, 2.8 - (LEVEL_BLUR_START + LEVEL_BLUR_FULL) / 2);
    expect(half).toBeCloseTo(0.5, 5);
  });

  it('wirkt nur von oben, am Schirm, mit Häkchen und ab der ersten Etage', () => {
    const upstairs = { level: 1, floorY: 2.8 };
    expect(levelBlurPlan(true, false, true, false, upstairs)).toEqual({
      floorY: 2.8,
      aboveY: null,
    });
    expect(levelBlurPlan(false, false, true, false, upstairs)).toBeNull();
    expect(levelBlurPlan(true, false, false, false, upstairs)).toBeNull();
    expect(levelBlurPlan(true, false, true, true, upstairs)).toBeNull();
    expect(levelBlurPlan(true, false, true, false, null)).toBeNull();
    expect(levelBlurPlan(true, false, true, false, { level: 0, floorY: 0 })).toBeNull();
  });

  it('verwischt von außen unten und oben unabhängig voneinander', () => {
    const outside = { level: 2, floorY: 2.8, whole: true, stand: 1, aboveY: 5.6 };
    expect(levelBlurPlan(true, false, true, false, outside)).toEqual({ floorY: 2.8, aboveY: null });
    expect(levelBlurPlan(false, true, true, false, outside)).toEqual({ floorY: null, aboveY: 5.6 });
    expect(levelBlurPlan(true, true, true, false, outside)).toEqual({ floorY: 2.8, aboveY: 5.6 });
    expect(levelBlurPlan(false, false, true, false, outside)).toBeNull();
    // Wer von außen auf dem Erdgeschoss steht, hat unten nichts zu verwischen.
    const ground = { level: 2, floorY: 0, whole: true, stand: 0, aboveY: 2.8 };
    expect(levelBlurPlan(true, false, true, false, ground)).toBeNull();
  });

  it('verwischt oben nur mit Häkchen und nur, wo es eine Etage darüber gibt', () => {
    const middle = { level: 1, floorY: 2.8, aboveY: 5.6 };
    expect(levelBlurPlan(false, true, true, false, middle)).toEqual({ floorY: null, aboveY: 5.6 });
    expect(levelBlurPlan(true, true, true, false, middle)).toEqual({ floorY: 2.8, aboveY: 5.6 });
    expect(levelBlurPlan(false, true, true, false, { level: 0, floorY: 0 })).toBeNull();
    expect(levelBlurPlan(false, false, true, false, middle)).toBeNull();
  });

  it('lässt oben die eigene Etage scharf und die darüber schnell verschwimmen', () => {
    expect(levelBlurAboveAmount(5.6, 2.8)).toBe(0);
    expect(levelBlurAboveAmount(5.6, 5.6 + LEVEL_BLUR_ABOVE_START)).toBeCloseTo(0, 9);
    expect(levelBlurAboveAmount(5.6, 5.6 + LEVEL_BLUR_ABOVE_FULL)).toBeCloseTo(1, 9);
    expect(levelBlurAboveAmount(5.6, 5.6)).toBeGreaterThan(0);
  });
});
