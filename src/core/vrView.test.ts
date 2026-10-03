import { QUEST_FRUSTUM, eyeBox } from './vrView';

const QUEST_EYE_ASPECT = QUEST_FRUSTUM.aspect;

describe('eyeBox', () => {
  it('steht mittig im breiten Fenster, so hoch wie es ist', () => {
    const box = eyeBox(2400, 900);
    expect(box.height).toBe(900);
    expect(box.width).toBe(Math.round(900 * QUEST_EYE_ASPECT));
    expect(box.y).toBe(0);
    expect(box.x * 2 + box.width).toBeCloseTo(2400, -1);
  });

  it('steht mittig im hohen Fenster, so breit wie es ist', () => {
    const box = eyeBox(400, 900);
    expect(box.width).toBe(400);
    expect(box.x).toBe(0);
    expect(box.y).toBeGreaterThan(0);
    expect(box.width / box.height).toBeCloseTo(QUEST_EYE_ASPECT, 2);
  });
});
