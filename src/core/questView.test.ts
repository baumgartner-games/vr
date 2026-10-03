import {
  EDGE_BAND,
  GAZE_PITCH,
  QUEST_SAFE_OUTLINE,
  QUEST_VIEW,
  QUEST_VIEW_CODE,
  QUEST_VIEW_POINTS,
  gazeElevation,
  inside,
  viewFrustum,
} from './questView';
import { decodePov } from './povCalibration';
import { POV_HAT, isImmersiveHat } from './figureParts';
import { WARDROBE_HATS } from './headgear';

describe('die Sicht der Quest 3', () => {
  it('ist der in der Brille eingestellte Rand', () => {
    expect(decodePov(QUEST_VIEW_CODE)).toEqual(QUEST_VIEW_POINTS);
  });

  it('liegt so, wie eingestellt — um die gefühlte Null gespiegelt', () => {
    const at = (az: number, el: number): boolean => inside(QUEST_VIEW, az, el + GAZE_PITCH);
    expect(at(37, 1)).toBe(true);
    expect(at(39, 1)).toBe(false);
    expect(at(37, -1)).toBe(true);
    expect(at(-37, -1)).toBe(true);
    expect(at(0, 34)).toBe(true);
    expect(at(0, 36)).toBe(false);
    expect(at(0, -34)).toBe(true);
    expect(at(0, -36)).toBe(false);
  });

  it('hat den sicheren Bereich ganz im Sichtfeld', () => {
    for (const [az, el] of QUEST_SAFE_OUTLINE) {
      expect(inside(QUEST_VIEW, az, el)).toBe(true);
      // Seitlich bleibt mindestens ein Rest Abstand — oben an den Ecken
      // knapp (der Knick im Rand bei 22,5° · 25,5°), sonst mehr als der rote
      // Randbereich.
      expect(inside(QUEST_VIEW, az + Math.sign(az) * 3, el)).toBe(true);
    }
    expect(EDGE_BAND).toBe(5);
  });

  it('legt die gefühlte Null 10° unter geradeaus', () => {
    expect(GAZE_PITCH).toBe(-10);
    expect(gazeElevation(-10)).toBe(0);
    expect(gazeElevation(30)).toBe(40);
  });

  it('schneidet die Ansicht am Schirm schief zu: unten weiter als oben', () => {
    const frustum = viewFrustum();
    expect(-frustum.bottom).toBeGreaterThan(frustum.top);
    expect(frustum.right).toBeCloseTo(Math.tan((38.5 * Math.PI) / 180), 2);
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
