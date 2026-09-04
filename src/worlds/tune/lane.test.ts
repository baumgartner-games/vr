import { LANE, TARGET, swapTargets } from './lane';

describe('lane', () => {
  it('hält die Scheiben im Gang', () => {
    expect(TARGET.z).toBeLessThan(LANE.length);
    expect(TARGET.radius).toBeLessThan(LANE.half);
    expect(TARGET.y).toBeLessThan(LANE.height);
  });
});

describe('swapTargets', () => {
  it('lässt jeden Stand auf seiner eigenen Scheibe, wenn beide passen', () => {
    expect(swapTargets(-0.65, 0.85, -0.65, 0.85)).toBe(false);
  });

  it('tauscht, wenn die Stände die Seiten gewechselt haben', () => {
    expect(swapTargets(0.85, -0.65, -0.65, 0.85)).toBe(true);
  });

  it('bleibt bei kleinen Verschiebungen ruhig', () => {
    // Beide ein Stück zur Mitte gezogen: die Reihenfolge stimmt noch.
    expect(swapTargets(-0.2, 0.3, -0.65, 0.85)).toBe(false);
  });

  it('entscheidet auch, wenn beide Stände auf derselben Seite stehen', () => {
    // Beide links von beiden Scheiben: der Gesamtweg wäre für beide
    // Zuordnungen gleich lang, die Reihenfolge ist trotzdem eindeutig.
    expect(swapTargets(-1.2, -0.9, -0.65, 0.85)).toBe(false);
    expect(swapTargets(-0.9, -1.2, -0.65, 0.85)).toBe(true);
  });

  it('lässt zwei Stände an derselben Stelle in Ruhe', () => {
    expect(swapTargets(0.4, 0.4, -0.65, 0.85)).toBe(false);
  });

  it('ist symmetrisch: einmal tauschen genügt', () => {
    const a = 0.85;
    const b = -0.65;
    expect(swapTargets(a, b, -0.65, 0.85)).toBe(true);
    // Nach dem Tausch stimmt die Zuordnung, also kein zweiter.
    expect(swapTargets(a, b, 0.85, -0.65)).toBe(false);
  });

  it('bleibt bei gleichem Abstand beim Geradeaus', () => {
    expect(swapTargets(0, 0, -0.65, 0.85)).toBe(false);
  });
});
