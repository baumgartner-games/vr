import {
  DEFAULT_WEAPON,
  MAGAZINE_STEPS,
  SPEED_STEPS,
  WEAPON_FIELDS,
  clampField,
  clampWeapon,
  nextIn,
  nextPower,
  nextStep,
  powerLabel,
} from './weaponSettings';

describe('nextStep', () => {
  it('walks up the notches and wraps at the top', () => {
    expect(nextStep(MAGAZINE_STEPS, 6)).toBe(12);
    expect(nextStep(MAGAZINE_STEPS, 100)).toBe(6);
  });

  it('goes to the next notch above a value that was typed in', () => {
    expect(nextStep(MAGAZINE_STEPS, 20)).toBe(30);
    expect(nextStep(SPEED_STEPS, 0.5)).toBe(14);
    expect(nextStep(SPEED_STEPS, 9999)).toBe(SPEED_STEPS[0]);
  });
});

describe('clampWeapon', () => {
  it('keeps every value inside the range its field allows', () => {
    const settings = clampWeapon({ magazine: 5000, speed: -3, rate: 0, mass: 99 });
    expect(settings.magazine).toBe(300);
    expect(settings.speed).toBe(1);
    expect(settings.rate).toBe(0.2);
    expect(settings.mass).toBe(5);
  });

  it('replaces a name it does not know with the built-in one', () => {
    const settings = clampWeapon({
      mode: 'rapid' as never,
      ammo: 'plasma' as never,
      sights: ['x' as never],
    });
    expect(settings.mode).toBe(DEFAULT_WEAPON.mode);
    expect(settings.ammo).toBe(DEFAULT_WEAPON.ammo);
    expect(settings.sights).toEqual([]);
  });

  it('leaves a sound configuration exactly as it is', () => {
    const settings = {
      ...DEFAULT_WEAPON,
      magazine: 30,
      ammo: 'tracer' as const,
      sights: ['reddot' as const, 'trace' as const],
    };
    expect(clampWeapon(settings)).toEqual(settings);
  });

  it('takes over the single aiming aid an older browser still holds', () => {
    expect(clampWeapon({ sight: 'irons' }).sights).toEqual(['irons']);
  });

  it('keeps the aiming aids in the order the grid lists them, without doubles', () => {
    const settings = clampWeapon({ sights: ['trace', 'reddot', 'trace'] });
    expect(settings.sights).toEqual(['reddot', 'trace']);
  });

  it('rounds to the decimals the field is shown with', () => {
    expect(clampWeapon({ magazine: 12.7 }).magazine).toBe(13);
    expect(clampWeapon({ mass: 0.123456 }).mass).toBe(0.123);
  });

  it('falls back to the built-in value for something that is not a number', () => {
    for (const field of WEAPON_FIELDS) {
      expect(clampField(field, Number.NaN)).toBe(DEFAULT_WEAPON[field.key]);
    }
  });
});

describe('powerLabel', () => {
  it('names a notch and spells out anything in between', () => {
    expect(powerLabel(0.14)).toBe('stark');
    expect(powerLabel(0.2)).toBe('0.2 kg');
  });

  it('steps from notch to notch', () => {
    expect(nextPower(0.03)).toBe(0.06);
    expect(nextPower(0.3)).toBe(0.03);
  });
});

describe('nextIn', () => {
  it('walks a list of names round', () => {
    expect(nextIn(['a', 'b', 'c'], 'b')).toBe('c');
    expect(nextIn(['a', 'b', 'c'], 'c')).toBe('a');
  });
});
