import { LEVEL_BLUR_FULL, LEVEL_BLUR_START, levelBlurAmount, levelBlurFloor } from './levelBlur';

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
    expect(levelBlurFloor(true, true, false, upstairs)).toBe(2.8);
    expect(levelBlurFloor(false, true, false, upstairs)).toBeNull();
    expect(levelBlurFloor(true, false, false, upstairs)).toBeNull();
    expect(levelBlurFloor(true, true, true, upstairs)).toBeNull();
    expect(levelBlurFloor(true, true, false, null)).toBeNull();
    expect(levelBlurFloor(true, true, false, { level: 0, floorY: 0 })).toBeNull();
  });

  it('lässt das ganze Haus von außen scharf', () => {
    expect(levelBlurFloor(true, true, false, { level: 2, floorY: 0, whole: true })).toBeNull();
  });
});
