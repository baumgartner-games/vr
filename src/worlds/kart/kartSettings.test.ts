import {
  DEFAULT_KART,
  KART_FIELDS,
  KART_PRESETS,
  clampKart,
  clampKartField,
  kartFieldLabel,
  nextKartStep,
  viewFollow,
} from './kartSettings';
import { MAX_LAG } from './kartView';

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

  it('nimmt für den Helm nur ein ausdrückliches Ja', () => {
    // Jeder gespeicherte Stand von gestern kennt das Feld nicht.
    expect(clampKart({ helmet: 'ja' as never }).helmet).toBe(false);
    expect(clampKart({ helmet: true }).helmet).toBe(true);
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

describe('KART_FIELDS', () => {
  it('keeps every notch inside the range it belongs to', () => {
    for (const entry of KART_FIELDS) {
      for (const step of entry.steps) {
        expect(step).toBeGreaterThanOrEqual(entry.min);
        expect(step).toBeLessThanOrEqual(entry.max);
      }
    }
  });

  it('has the standard kart sitting on a notch of every value', () => {
    // Sonst springt die erste Rast beim Antippen irgendwohin, statt zur
    // nächsten — und niemand findet den Ausgangswert wieder.
    for (const entry of KART_FIELDS) {
      expect(entry.steps).toContain(DEFAULT_KART[entry.key]);
    }
  });

  it('lets the tyres go properly slippery', () => {
    const traction = field('traction');
    expect(traction.min).toBeLessThanOrEqual(0.05);
    expect(Math.min(...traction.steps)).toBeLessThanOrEqual(0.05);
  });

  it('lets the head be screwed to the kart again', () => {
    // Die eine Einstellung, deren Null einen Sinn hat: kein Nachlauf.
    expect(field('headLag').min).toBe(0);
    expect(field('headLag').steps).toContain(0);
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

describe('die drei Zahlen des Kopfes', () => {
  it('reicht sie unverändert an die Rechnung weiter', () => {
    expect(viewFollow(DEFAULT_KART)).toEqual({
      lag: DEFAULT_KART.headLag,
      dead: DEFAULT_KART.headDeadZone,
      rate: DEFAULT_KART.headTurnRate,
    });
  });

  it('lässt die Totzone nicht über den harten Deckel hinaus', () => {
    // Eine Totzone größer als `MAX_LAG` wäre keine: Der harte Deckel zöge den
    // Kopf ohnehin nach, und die Einstellung täte nichts mehr.
    expect(field('headDeadZone').max).toBeLessThan(MAX_LAG);
  });

  it('lässt beide neuen Werte ganz abschalten', () => {
    // 0 heißt bei beiden „gibt es nicht": keine Totzone, kein Deckel — also
    // genau das Verhalten von vorher.
    expect(clampKartField(field('headDeadZone'), 0)).toBe(0);
    expect(clampKartField(field('headTurnRate'), 0)).toBe(0);
  });
});
