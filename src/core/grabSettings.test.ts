import {
  DEFAULT_GRAB,
  GRAB_FIELDS,
  clampGrab,
  formatGrabField,
  motionLabel,
  nextGrabStep,
  type GrabSettings,
} from './grabSettings';

const radius = GRAB_FIELDS.find((field) => field.key === 'radius')!;
const height = GRAB_FIELDS.find((field) => field.key === 'height')!;

describe('the numbers behind grabbing', () => {
  it('hands back the defaults when nothing is stored', () => {
    expect(clampGrab(undefined)).toEqual(DEFAULT_GRAB);
    expect(clampGrab({})).toEqual(DEFAULT_GRAB);
  });

  it('keeps a radius inside its range and drops the rest', () => {
    expect(clampGrab({ radius: 500 }).radius).toBe(radius.max);
    expect(clampGrab({ radius: -20 }).radius).toBe(radius.min);
    expect(clampGrab({ radius: 85 }).radius).toBe(85);
  });

  it('allows a radius of zero — that is how the near grab is switched off', () => {
    expect(clampGrab({ radius: 0 }).radius).toBe(0);
  });

  it('falls back to the default for a number that is not one', () => {
    expect(clampGrab({ height: Number.NaN }).height).toBe(DEFAULT_GRAB.height);
    expect(clampGrab({ radius: undefined }).radius).toBe(DEFAULT_GRAB.radius);
  });

  it('refuses a motion mode it has never heard of', () => {
    const stored = { motion: 'wobble' } as unknown as Partial<GrabSettings>;
    expect(clampGrab(stored).motion).toBe(DEFAULT_GRAB.motion);
  });

  it('refuses a switch that is not a switch', () => {
    const stored = { near: 'ja' } as unknown as Partial<GrabSettings>;
    expect(clampGrab(stored).near).toBe(DEFAULT_GRAB.near);
  });

  it('leaves untouched settings alone', () => {
    const changed = clampGrab({ ...DEFAULT_GRAB, remote: false });
    expect(changed.remote).toBe(false);
    expect(changed.near).toBe(DEFAULT_GRAB.near);
  });
});

describe('stepping through the notches', () => {
  it('goes to the next notch above the current value', () => {
    expect(nextGrabStep(radius, 60)).toBe(100);
    expect(nextGrabStep(height, 210)).toBe(240);
  });

  it('starts over at the top', () => {
    expect(nextGrabStep(radius, radius.steps[radius.steps.length - 1]!)).toBe(radius.steps[0]);
  });

  it('picks the first notch above a value typed in between', () => {
    expect(nextGrabStep(radius, 85)).toBe(100);
    expect(nextGrabStep(radius, 0)).toBe(60);
  });
});

describe('what the menu reads out', () => {
  it('writes a radius in whole centimetres', () => {
    expect(formatGrabField(radius, clampGrab({ radius: 140 }))).toBe('140 cm');
  });

  it('names both motion modes', () => {
    expect(motionLabel('rigid')).toContain('Starr');
    expect(motionLabel('spin')).toContain('Objektmitte');
  });
});
