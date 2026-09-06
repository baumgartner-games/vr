import {
  DEFAULT_EFFECT,
  DEFAULT_SCALE,
  EFFECTS,
  MAX_PARTICLES,
  MAX_SCALE,
  MIN_SCALE,
  SCALE_GRID,
  SCALE_STEPS,
  clampScale,
  findEffect,
  nextEffect,
  nextScale,
  scaleEffect,
  scaleLabel,
} from './effectKinds';

describe('Die Liste der Effekte', () => {
  it('führt jede Id und jeden Namen genau einmal', () => {
    expect(new Set(EFFECTS.map((effect) => effect.id)).size).toBe(EFFECTS.length);
    expect(new Set(EFFECTS.map((effect) => effect.label)).size).toBe(EFFECTS.length);
  });

  it('gibt jedem Effekt etwas zu zeigen', () => {
    for (const effect of EFFECTS) {
      expect(effect.count).toBeGreaterThan(0);
      expect(effect.life).toBeGreaterThan(0);
      expect(effect.size).toBeGreaterThan(0);
      expect(effect.spread).toBeGreaterThanOrEqual(0);
      expect(effect.spread).toBeLessThanOrEqual(1);
      expect(effect.sub.length).toBeGreaterThan(0);
    }
  });

  it('macht aus einer unbekannten Id den ersten Effekt statt undefined', () => {
    expect(findEffect('gibtsnicht').id).toBe(DEFAULT_EFFECT);
    expect(findEffect('fire').label).toBe('Feuer');
  });

  it('schaltet rundherum weiter', () => {
    const last = EFFECTS[EFFECTS.length - 1]!;
    expect(nextEffect(EFFECTS[0]!.id).id).toBe(EFFECTS[1]!.id);
    expect(nextEffect(last.id).id).toBe(EFFECTS[0]!.id);
  });
});

describe('Die Größe', () => {
  it('bleibt in den Grenzen und auf dem Raster', () => {
    expect(clampScale(-3)).toBe(MIN_SCALE);
    expect(clampScale(99)).toBe(MAX_SCALE);
    expect(clampScale(1.234)).toBeCloseTo(1.25, 6);
    expect(clampScale(Number.NaN)).toBe(DEFAULT_SCALE);
    // Jeder Wert liegt auf einem Vielfachen des Rasters.
    for (const raw of [0.3, 0.77, 1.01, 2.68, 3.999]) {
      expect(
        Math.abs(clampScale(raw) / SCALE_GRID - Math.round(clampScale(raw) / SCALE_GRID)),
      ).toBeLessThan(1e-6);
    }
  });

  it('schaltet durch die Rasten und fängt danach wieder vorne an', () => {
    expect(nextScale(SCALE_STEPS[0]!)).toBe(SCALE_STEPS[1]);
    expect(nextScale(MAX_SCALE)).toBe(SCALE_STEPS[0]);
    // Ein Wert zwischen zwei Rasten landet auf der nächsthöheren.
    expect(nextScale(1.1)).toBe(1.5);
  });

  it('schreibt sich, wie man sie sagt', () => {
    expect(scaleLabel(1)).toBe('1×');
    expect(scaleLabel(1.5)).toBe('1,5×');
    expect(scaleLabel(0.25)).toBe('0,25×');
  });
});

describe('Ein größerer Effekt', () => {
  const smoke = findEffect('smoke');

  it('bekommt mehr und dickere Partikel, aber nie mehr als erlaubt', () => {
    const small = scaleEffect(smoke, 0.5);
    const big = scaleEffect(smoke, 4);
    expect(small.count).toBeLessThan(smoke.count);
    expect(big.count).toBeGreaterThan(smoke.count);
    expect(big.size).toBeCloseTo(smoke.size * 4, 6);
    for (const scale of [0.25, 1, 2, 4]) {
      expect(scaleEffect(findEffect('blast'), scale).count).toBeLessThanOrEqual(MAX_PARTICLES);
    }
  });

  it('lässt die Physik in Ruhe — größer heißt nicht anders', () => {
    const big = scaleEffect(smoke, 3);
    expect(big.rise).toBe(smoke.rise);
    expect(big.fall).toBe(smoke.fall);
    expect(big.drag).toBe(smoke.drag);
    expect(big.glow).toBe(smoke.glow);
    expect(big.id).toBe(smoke.id);
  });

  it('behält auch bei einer Winzgröße genug Partikel für eine Wolke', () => {
    expect(scaleEffect(smoke, MIN_SCALE).count).toBeGreaterThanOrEqual(8);
  });
});
