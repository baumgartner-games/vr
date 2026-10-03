import {
  EDGE_BAND,
  GAZE_PITCH,
  QUEST_SAFE,
  QUEST_VIEW,
  gazeElevation,
  inside,
  outline,
  viewFrustum,
} from './questView';
import { POV_HAT, isImmersiveHat } from './figureParts';
import { WARDROBE_HATS } from './headgear';

describe('die Sicht der Quest 3', () => {
  it('steht so da, wie sie gemessen wurde', () => {
    expect(inside(QUEST_VIEW, 39, 0)).toBe(true);
    expect(inside(QUEST_VIEW, 41, 0)).toBe(false);
    expect(inside(QUEST_VIEW, 29, 20)).toBe(true);
    expect(inside(QUEST_VIEW, 31, 20)).toBe(false);
    expect(inside(QUEST_VIEW, 0, 31)).toBe(false);
    expect(inside(QUEST_VIEW, 19, -45)).toBe(true);
    expect(inside(QUEST_VIEW, 0, -46)).toBe(false);
  });

  it('hat den sicheren Bereich ganz im Sichtfeld, mit Abstand zum Rand', () => {
    for (const [az, el] of outline(QUEST_SAFE)) {
      expect(inside(QUEST_VIEW, az, el)).toBe(true);
      // Mehr als der rote Randbereich bleibt zur Seite frei.
      expect(inside(QUEST_VIEW, az + Math.sign(az) * EDGE_BAND, el)).toBe(true);
    }
    expect(inside(QUEST_SAFE, 29, 10)).toBe(true);
    expect(inside(QUEST_SAFE, 19, -35)).toBe(true);
    expect(inside(QUEST_SAFE, 0, 11)).toBe(false);
  });

  it('legt die gefühlte Null 10° unter geradeaus', () => {
    expect(GAZE_PITCH).toBe(-10);
    expect(gazeElevation(-10)).toBe(0);
    expect(gazeElevation(30)).toBe(40);
  });

  it('schneidet die Ansicht am Schirm schief zu: unten weiter als oben', () => {
    const frustum = viewFrustum();
    expect(frustum.top).toBeGreaterThan(Math.tan((30 * Math.PI) / 180) - 1e-9);
    expect(-frustum.bottom).toBeGreaterThan(frustum.top);
    expect(frustum.right).toBeCloseTo(Math.tan((40 * Math.PI) / 180));
    expect(frustum.left).toBeCloseTo(-frustum.right);
    expect(frustum.aspect).toBeGreaterThan(0.8);
    expect(frustum.aspect).toBeLessThan(1.4);
    expect(frustum.clipPath.startsWith('polygon(')).toBe(true);
  });

  it('hat einen eigenen Helm im Kleiderschrank', () => {
    expect(WARDROBE_HATS).toContain(POV_HAT);
    expect(isImmersiveHat(POV_HAT)).toBe(true);
  });
});
