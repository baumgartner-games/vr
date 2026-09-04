import {
  DEFAULT_STOPWATCH,
  FACTOR_STEPS,
  MAX_FACTOR,
  MAX_FRAMES,
  clampFactor,
  clampFrames,
  clampStopwatch,
  factorLabel,
  framesLabel,
  nextFactor,
  nextFrames,
  nextStopwatchAction,
} from './stopwatchSettings';

describe('Stoppuhr-Einstellungen', () => {
  it('liefert die alte Zeitlupe aus', () => {
    expect(DEFAULT_STOPWATCH.factor).toBe(0.22);
    expect(DEFAULT_STOPWATCH.action).toBe('time');
  });

  it('lässt das Anhalten zu, aber keinen Rückwärtslauf', () => {
    expect(clampFactor(0)).toBe(0);
    expect(clampFactor(-2)).toBe(0);
    expect(clampFactor(99)).toBe(MAX_FACTOR);
  });

  it('rundet Einzelbilder auf ganze Bilder', () => {
    expect(clampFrames(2.6)).toBe(3);
    expect(clampFrames(0)).toBe(1);
    expect(clampFrames(9999)).toBe(MAX_FRAMES);
  });

  it('macht aus Unsinn den Auslieferungswert', () => {
    expect(clampFactor('langsam')).toBe(DEFAULT_STOPWATCH.factor);
    expect(clampStopwatch({ action: 'fliegen' as never }).action).toBe('time');
    expect(clampStopwatch(undefined)).toEqual(DEFAULT_STOPWATCH);
  });

  it('schaltet durch die Betriebsarten und fängt wieder an', () => {
    expect(nextStopwatchAction('time')).toBe('step');
    expect(nextStopwatchAction('step')).toBe('load');
    expect(nextStopwatchAction('load')).toBe('time');
  });

  it('schaltet den Faktor eine Raste weiter, oben wieder von vorn', () => {
    expect(nextFactor(0)).toBe(FACTOR_STEPS[1]);
    expect(nextFactor(0.22)).toBe(0.5);
    expect(nextFactor(4)).toBe(0);
    // Eine getippte Zahl liegt auf keiner Raste — die nächste ist die darüber.
    expect(nextFactor(0.3)).toBe(0.5);
    expect(nextFrames(3)).toBe(5);
  });

  it('sagt in Worten, was der Faktor bedeutet', () => {
    expect(factorLabel(0)).toBe('angehalten');
    expect(factorLabel(1)).toBe('normal');
    expect(factorLabel(0.22)).toContain('Zeitlupe');
    expect(factorLabel(2)).toContain('Zeitraffer');
    expect(framesLabel(1)).toBe('1 Bild');
    expect(framesLabel(10)).toBe('10 Bilder');
  });
});
