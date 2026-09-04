import { DEFAULT_EYES, EYE_RANGE, clampEyes, seatedLift } from './posture';

/**
 * Zwei Zahlen und eine Subtraktion — und trotzdem die Stelle, an der ein
 * falsches Vorzeichen den Spieler in den Boden drückt oder einen halben Meter
 * über den Sessel hebt. Ohne Browser prüfbar, also wird sie geprüft.
 */
describe('Augenhöhen', () => {
  it('nimmt an, was ein Mensch misst', () => {
    expect(clampEyes({ stand: 172, sit: 118 })).toEqual({ stand: 172, sit: 118 });
  });

  it('holt jede Zahl in den Bereich zurück, in dem sie Sinn ergibt', () => {
    expect(clampEyes({ stand: 900, sit: -20 })).toEqual({
      stand: EYE_RANGE.max,
      sit: EYE_RANGE.min,
    });
  });

  it('macht aus einem kaputten Speicher die Auslieferungswerte', () => {
    expect(clampEyes(undefined)).toEqual(DEFAULT_EYES);
    expect(clampEyes({ stand: Number.NaN, sit: undefined })).toEqual(DEFAULT_EYES);
  });

  it('rundet auf ganze Zentimeter — feiner misst niemand sich selbst', () => {
    expect(clampEyes({ stand: 171.4, sit: 117.6 })).toEqual({ stand: 171, sit: 118 });
  });

  /**
   * Die Anhebung ist die Differenz, in Metern — nicht die Sitzhöhe und nicht
   * die Stehhöhe. Bei 172 zu 118 sind das 54 cm, und genau um die liegt der
   * virtuelle Tisch sonst neben dem echten.
   */
  it('hebt den Sitzenden um genau die Differenz an', () => {
    expect(seatedLift({ stand: 172, sit: 118 })).toBeCloseTo(0.54, 6);
    expect(seatedLift({ stand: 165, sit: 165 })).toBe(0);
  });

  it('drückt niemanden in den Boden, wenn er sitzend höher ist', () => {
    // Barhocker, oder eine der beiden Zahlen daneben: dann lieber nichts tun.
    expect(seatedLift({ stand: 150, sit: 170 })).toBe(0);
  });
});
