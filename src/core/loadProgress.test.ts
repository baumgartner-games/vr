import { LOAD_BANDS, creep, loadLine, loadTarget, type LoadState } from './loadProgress';

const at = (phase: LoadState['phase'], loaded = 0, total = 0): LoadState => ({
  phase,
  loaded,
  total,
});

describe('loadProgress — der Balken beim Weltwechsel', () => {
  it('zählt die Modelle im letzten Band', () => {
    const [from, to] = LOAD_BANDS.modelle;
    expect(loadTarget(at('modelle', 0, 10))).toBeCloseTo(from);
    expect(loadTarget(at('modelle', 5, 10))).toBeCloseTo((from + to) / 2);
    expect(loadTarget(at('modelle', 12, 10))).toBeCloseTo(to);
    expect(loadTarget(at('modelle', 0, 0))).toBeCloseTo(from);
  });

  it('läuft nie rückwärts, auch wenn der Zähler neu anfängt', () => {
    let shown = creep(0, at('modelle', 9, 10), 5);
    const before = shown;
    shown = creep(shown, at('modelle', 1, 10), 0.1);
    expect(shown).toBeGreaterThanOrEqual(before);
  });

  it('kriecht im unzählbaren Abschnitt auf das Bandende zu, ohne es zu erreichen', () => {
    let shown = 0;
    const values: number[] = [];
    for (let i = 0; i < 20; i++) {
      shown = creep(shown, at('modul'), 0.1);
      values.push(shown);
    }
    for (let i = 1; i < values.length; i++) expect(values[i]!).toBeGreaterThan(values[i - 1]!);
    expect(shown).toBeLessThan(LOAD_BANDS.modul[1]);
    expect(shown).toBeGreaterThan(LOAD_BANDS.modul[0]);
  });

  it('springt beim Abschnittswechsel mindestens an den Anfang des neuen Bands', () => {
    expect(creep(0.1, at('aufbau'), 0)).toBeCloseTo(LOAD_BANDS.aufbau[0]);
  });

  it('steht bei fertig auf voll', () => {
    expect(creep(0.3, at('fertig'), 0)).toBe(1);
  });

  it('sagt in einer Zeile, was gerade passiert', () => {
    expect(loadLine(at('modul'))).toMatch(/geladen/);
    expect(loadLine(at('aufbau'))).toMatch(/aufgebaut/);
    expect(loadLine(at('modelle', 3, 12))).toBe('Modelle und Töne · 3 von 12');
    expect(loadLine(at('modelle', 14, 12))).toBe('Modelle und Töne · 12 von 12');
  });
});
