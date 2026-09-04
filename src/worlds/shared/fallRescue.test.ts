import { FALL_LIMIT, needsRescue, rescueHeight, topHit } from './fallRescue';

describe('Sturz aus der Welt', () => {
  it('merkt einen Sturz erst weit unter dem Boden', () => {
    expect(needsRescue(-1, 0)).toBe(false);
    expect(needsRescue(-FALL_LIMIT + 1, 0)).toBe(false);
    expect(needsRescue(-FALL_LIMIT - 1, 0)).toBe(true);
  });

  it('rechnet vom Boden der Welt aus, nicht von der Null', () => {
    // Eine Karte, die bei -20 anfängt, ist keine Karte, aus der man gefallen ist.
    expect(needsRescue(-25, -20)).toBe(false);
    expect(needsRescue(-55, -20)).toBe(true);
  });

  it('lässt sich von NaN nicht beeindrucken', () => {
    expect(needsRescue(Number.NaN, 0)).toBe(false);
  });

  it('nimmt das Dach und nicht den Keller', () => {
    // Boden 0, Zwischendecke 3, Dach 9: oben landet man, nicht im Haus.
    expect(topHit([0, 3, 9])).toBe(9);
    expect(topHit([])).toBeNull();
    expect(topHit([Number.NaN])).toBeNull();
  });

  it('setzt die Füße mit Luft auf die Oberfläche', () => {
    expect(rescueHeight([0, 9], 1.5, 0.1)).toBeCloseTo(9.1);
  });

  it('fällt auf den Startpunkt zurück, wenn dort nichts steht', () => {
    expect(rescueHeight([], 1.5)).toBe(1.5);
  });
});
