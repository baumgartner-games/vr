import {
  HAPTIC_PATTERNS,
  nextPatternId,
  patternById,
  pulsesBetween,
  type HapticPattern,
} from './haptics';

/**
 * Vibration ist die eine Rückmeldung, die man nicht sehen kann: ob ein Stoß
 * ausgelassen, doppelt gespielt oder beim zweiten Durchlauf verrutscht wurde,
 * merkt man in der Brille bestenfalls als „fühlt sich komisch an". Also wird
 * hier nachgerechnet, was der Raum gleich abspielt.
 */
describe('Vibrationsmuster', () => {
  const twin = patternById('double');

  it('kennt jedes Muster beim Namen und fällt sonst auf das erste zurück', () => {
    expect(patternById('burst').id).toBe('burst');
    expect(patternById('gibtsnicht').id).toBe(HAPTIC_PATTERNS[0]!.id);
  });

  it('schaltet im Kreis durch alle Muster', () => {
    let id = HAPTIC_PATTERNS[0]!.id;
    for (const _ of HAPTIC_PATTERNS) id = nextPatternId(id);
    expect(id).toBe(HAPTIC_PATTERNS[0]!.id);
  });

  it('fängt mit „kein Vibrieren" an, damit man die Reihe steigern kann', () => {
    expect(HAPTIC_PATTERNS[0]!.pulses).toHaveLength(0);
  });

  it('hält jeden Stoß im erlaubten Bereich', () => {
    for (const pattern of HAPTIC_PATTERNS) {
      for (const pulse of pattern.pulses) {
        expect(pulse.intensity).toBeGreaterThan(0);
        expect(pulse.intensity).toBeLessThanOrEqual(1);
        expect(pulse.duration).toBeGreaterThan(0);
        expect(pulse.at).toBeLessThan(pattern.length);
      }
    }
  });

  describe('der Abspieler', () => {
    it('gibt jeden Stoß genau einmal, Frame für Frame', () => {
      let time = 0;
      const seen: number[] = [];
      for (let i = 0; i < 60; i++) {
        const next = time + 1 / 60;
        for (const pulse of pulsesBetween(twin, time, next)) seen.push(pulse.at);
        time = next;
      }
      // Eine Sekunde, ein Muster von 0,6 s: der erste Durchlauf ganz, vom
      // zweiten die beiden Stöße bei 0,6 und 0,71.
      expect(seen.map((at) => Math.round(at * 100) / 100)).toEqual([0, 0.11, 0.6, 0.71]);
    });

    it('lässt nichts aus, wenn ein Frame lang dauert', () => {
      const burst = patternById('burst');
      expect(pulsesBetween(burst, 0, 0.3)).toHaveLength(burst.pulses.length);
    });

    it('erschlägt niemanden nach einem Ruckler', () => {
      // Ein halbe-Sekunde-Frame darf nicht acht Durchläufe auf einmal geben.
      const rumble = patternById('rumble');
      expect(pulsesBetween(rumble, 0, 5).length).toBeLessThanOrEqual(rumble.pulses.length);
    });

    it('gibt für „kein Vibrieren" nichts zurück', () => {
      expect(pulsesBetween(patternById('off'), 0, 10)).toEqual([]);
    });

    it('gibt nichts zurück, wenn die Zeit stillsteht', () => {
      expect(pulsesBetween(twin, 0.5, 0.5)).toEqual([]);
      expect(pulsesBetween(twin, 0.5, 0.4)).toEqual([]);
    });

    it('überlebt ein Muster ohne Länge', () => {
      const broken: HapticPattern = { ...twin, length: 0 };
      expect(() => pulsesBetween(broken, 0, 1)).not.toThrow();
    });
  });
});
