import { FATIGUE_AT, fatigueTick, landingBuzz, slipTick, ticksBetween } from './gripHaptics';
import { RECOVER_AT } from './stamina';

describe('Der Schlag beim Zupacken', () => {
  it('ist bei gutem Halt kurz und hart, bei schlechtem schwach und lang', () => {
    const good = landingBuzz(1);
    const bad = landingBuzz(0);
    expect(good.intensity).toBeGreaterThan(bad.intensity);
    expect(good.duration).toBeLessThan(bad.duration);
  });

  it('bleibt in den Grenzen, die WebXR nimmt', () => {
    for (const q of [-1, 0, 0.5, 1, 2, Number.NaN]) {
      const buzz = landingBuzz(q);
      expect(buzz.intensity).toBeGreaterThanOrEqual(0);
      expect(buzz.intensity).toBeLessThanOrEqual(1);
      expect(buzz.duration).toBeGreaterThan(0);
    }
  });
});

describe('Das Ticken am schlechten Griff', () => {
  it('schweigt, solange der Halt zum Erholen reicht', () => {
    expect(slipTick(RECOVER_AT)).toBeNull();
    expect(slipTick(1)).toBeNull();
  });

  it('wird schneller, je schlechter der Halt — und nicht lauter', () => {
    const mild = slipTick(RECOVER_AT - 0.05)!;
    const dire = slipTick(0)!;
    expect(dire.period).toBeLessThan(mild.period);
    expect(dire.period).toBeGreaterThan(0);
    // Leicht und lang, nicht hart: genau das Gefühl einer rutschenden Hand.
    expect(dire.buzz.intensity).toBeLessThan(0.4);
    expect(dire.buzz.duration).toBeGreaterThan(50);
  });
});

describe('Die Warnung bei leerer Ausdauer', () => {
  it('schweigt, solange genug Kraft da ist', () => {
    expect(fatigueTick(1)).toBeNull();
    expect(fatigueTick(FATIGUE_AT)).toBeNull();
  });

  it('wird zum Ende hin schneller und kräftiger', () => {
    const early = fatigueTick(FATIGUE_AT - 0.05)!;
    const last = fatigueTick(0)!;
    expect(last.period).toBeLessThan(early.period);
    expect(last.buzz.intensity).toBeGreaterThan(early.buzz.intensity);
  });

  it('sitzt in einem anderen Bereich als das Rutschen', () => {
    // Kurz und kräftig gegen lang und weich: nur so bleiben sie
    // unterscheidbar, wenn beide zugleich laufen.
    expect(fatigueTick(0)!.buzz.duration).toBeLessThan(slipTick(0)!.buzz.duration);
    expect(fatigueTick(0)!.buzz.intensity).toBeGreaterThan(slipTick(0)!.buzz.intensity);
  });
});

describe('Wann ein Ticken fällig ist', () => {
  it('tickt beim Zupacken nicht — dort saß schon der Schlag', () => {
    expect(ticksBetween(0.5, 0, 0.01)).toEqual([]);
  });

  it('gibt jeden Stoß genau einmal', () => {
    const period = 0.25;
    const dt = 1 / 60;
    let count = 0;
    for (let i = 0; i < 60 * 2; i++) {
      count += ticksBetween(period, i * dt, (i + 1) * dt).length;
    }
    // Zwei Sekunden, alle 0,25 s: sieben Stöße. Der bei null zählt nicht mit,
    // und der bei genau zwei Sekunden gehört schon ins nächste Bild.
    expect(count).toBe(7);
  });

  it('schlägt bei einem Ruckler nicht die ganze Reihe auf einmal in die Hand', () => {
    expect(ticksBetween(0.1, 0, 3).length).toBe(1);
  });

  it('nimmt eine unsinnige Frequenz oder eine rückwärts laufende Uhr hin', () => {
    expect(ticksBetween(0, 0, 1)).toEqual([]);
    expect(ticksBetween(-1, 0, 1)).toEqual([]);
    expect(ticksBetween(0.2, 1, 1)).toEqual([]);
    expect(ticksBetween(0.2, 1, 0.5)).toEqual([]);
  });
});
