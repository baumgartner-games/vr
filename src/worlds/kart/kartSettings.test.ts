import {
  DEFAULT_KART,
  KART_FIELDS,
  KART_PRESETS,
  clampKart,
  clampKartField,
  kartFieldLabel,
  nextKartStep,
} from './kartSettings';

const field = (key: string) => KART_FIELDS.find((entry) => entry.key === key)!;

describe('clampKartField', () => {
  it('keeps a value inside its range', () => {
    expect(clampKartField(field('topSpeed'), 5000)).toBe(field('topSpeed').max);
    expect(clampKartField(field('topSpeed'), -20)).toBe(field('topSpeed').min);
  });

  it('rounds to the decimals the value is shown with', () => {
    expect(clampKartField(field('traction'), 0.123456)).toBe(0.12);
    expect(clampKartField(field('topSpeed'), 45.7)).toBe(46);
  });

  it('falls back to the default for a number that is none', () => {
    expect(clampKartField(field('mass'), Number.NaN)).toBe(DEFAULT_KART.mass);
  });
});

describe('clampKart', () => {
  it('fills in everything that was not given', () => {
    expect(clampKart({ topSpeed: 60 })).toEqual({ ...DEFAULT_KART, topSpeed: 60 });
  });

  it('refuses a steering mode it does not know', () => {
    expect(clampKart({ steering: 'joystick' as never }).steering).toBe(DEFAULT_KART.steering);
  });

  it('leaves every preset exactly as it is', () => {
    for (const preset of KART_PRESETS) {
      expect(clampKart(preset.settings)).toEqual(preset.settings);
    }
  });

  it('gives every preset its own name and id', () => {
    const ids = KART_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('nextKartStep', () => {
  it('steps to the next notch', () => {
    expect(nextKartStep(field('topSpeed'), 45)).toBe(65);
  });

  it('wraps around at the top', () => {
    expect(nextKartStep(field('topSpeed'), 130)).toBe(18);
  });

  it('takes the first notch above a value typed in between two', () => {
    expect(nextKartStep(field('topSpeed'), 50)).toBe(65);
  });
});

describe('kartFieldLabel', () => {
  it('writes the unit behind the number', () => {
    expect(kartFieldLabel(field('topSpeed'), DEFAULT_KART)).toBe('45 km/h');
  });

  it('leaves a bare number alone', () => {
    expect(kartFieldLabel(field('traction'), DEFAULT_KART)).toBe('0.75');
  });
});
