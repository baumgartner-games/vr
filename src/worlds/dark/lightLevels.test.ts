import {
  DEFAULT_LIGHT_STEP,
  LIGHT_LEVELS,
  MAX_LAMP_INTENSITY,
  clampLightStep,
  lampIntensity,
  lightBrightness,
  lightLabel,
  nextLightStep,
} from './lightLevels';

describe('Dimmer im Dunkelhaus', () => {
  it('fängt komplett dunkel an und endet hell', () => {
    expect(DEFAULT_LIGHT_STEP).toBe(0);
    expect(lampIntensity(0)).toBe(0);
    expect(lampIntensity(LIGHT_LEVELS.length - 1)).toBe(MAX_LAMP_INTENSITY);
  });

  it('wird mit jeder Raste heller', () => {
    for (let step = 1; step < LIGHT_LEVELS.length; step++) {
      expect(lightBrightness(step)).toBeGreaterThan(lightBrightness(step - 1));
    }
  });

  it('schaltet eine Raste weiter und danach wieder aus', () => {
    let step = 0;
    for (let i = 1; i < LIGHT_LEVELS.length; i++) {
      step = nextLightStep(step);
      expect(step).toBe(i);
    }
    expect(nextLightStep(step)).toBe(0);
  });

  it('holt jede Zahl in den Bereich zurück', () => {
    expect(clampLightStep(-4)).toBe(0);
    expect(clampLightStep(99)).toBe(LIGHT_LEVELS.length - 1);
    expect(clampLightStep(Number.NaN)).toBe(DEFAULT_LIGHT_STEP);
    expect(clampLightStep(1.4)).toBe(1);
  });

  it('schreibt bei Aus keinen Prozentsatz hin', () => {
    expect(lightLabel(0)).toBe('Aus');
    expect(lightLabel(LIGHT_LEVELS.length - 1)).toBe('Hell · 100 %');
  });
});
