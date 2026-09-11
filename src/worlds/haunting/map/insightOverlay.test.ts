import { beliefAlpha, BELIEF_MIN, drawInsight, interceptLabel, seconds } from './insightOverlay';
import { emptySnapshot, type MapSnapshot, type MonsterInsight } from './mapSnapshot';

/** Ein Kontext, der jeden Aufruf mitschreibt — gemalt wird in Tests nichts. */
function recorder(): { ctx: CanvasRenderingContext2D; calls: Array<[string, unknown[]]> } {
  const calls: Array<[string, unknown[]]> = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, key: string) => {
      if (key in target) return target[key];
      return (...args: unknown[]) => calls.push([key, args]);
    },
    set: (target, key: string, value) => {
      target[key] = value;
      calls.push([`=${key}`, [value]]);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

/** Zwei Zimmer nebeneinander, damit die Tönung etwas zum Füllen hat. */
function station(): MapSnapshot {
  return {
    ...emptySnapshot(),
    rooms: [
      {
        id: 'r1',
        name: 'Labor',
        polygon: [
          { x: 0, z: 0 },
          { x: 5, z: 0 },
          { x: 5, z: 5 },
          { x: 0, z: 5 },
        ],
        centre: { x: 2.5, z: 2.5 },
        circulation: false,
        lit: true,
        safe: false,
      },
      {
        id: 'r2',
        name: 'Gang',
        polygon: [
          { x: 5, z: 0 },
          { x: 10, z: 0 },
          { x: 10, z: 5 },
          { x: 5, z: 5 },
        ],
        centre: { x: 7.5, z: 2.5 },
        circulation: true,
        lit: false,
        safe: false,
      },
    ],
  };
}

/** Ein erfundener Beschluss — Haltung, Glaube, Prognose, Abfangtür. */
function insight(): MonsterInsight {
  return {
    mode: 'hunt',
    label: 'Jagd',
    goal: { x: 7, z: 2 },
    belief: [
      { roomId: 'r1', p: 0.7 },
      { roomId: 'r2', p: 0.25 },
      { roomId: 'r3', p: 0.01 },
    ],
    prediction: {
      path: [
        { x: 1, z: 1 },
        { x: 4, z: 2 },
        { x: 7, z: 3 },
      ],
      eta: [0, 1.5, 3],
    },
    intercept: { door: 'dOst', at: { x: 5, z: 2.5 }, etaMonster: 3.24, etaPlayer: 4.0 },
  };
}

describe('Die Absichten des Monsters als Bild', () => {
  it('schreibt beide Ankunftszeiten mit Komma und Sekunde', () => {
    expect(seconds(3.24)).toBe('3,2 s');
    expect(seconds(4)).toBe('4,0 s');
    expect(interceptLabel(insight().intercept!)).toBe('M 3,2 s / T 4,0 s');
  });

  /**
   * Ein Glaubensbild liegt fast immer auf zwei, drei Zimmern; linear gedeckt
   * wäre alles außer dem Spitzenreiter unsichtbar. Der schwächere Raum muss
   * deutlich mehr als seinen Anteil abbekommen — und keiner mehr als das Dach.
   */
  it('hebt schwache Anteile an, ohne das Dach zu überschreiten', () => {
    expect(beliefAlpha(0)).toBe(0);
    expect(beliefAlpha(0.25)).toBeGreaterThan(beliefAlpha(1) * 0.25);
    expect(beliefAlpha(1)).toBeGreaterThanOrEqual(beliefAlpha(0.7));
    expect(beliefAlpha(1)).toBeLessThanOrEqual(0.4);
  });

  it('tönt nur die Räume über der Schwelle und zeichnet Prognose und Abfangring', () => {
    const { ctx, calls } = recorder();
    drawInsight(ctx, insight(), station(), (x, z) => ({ x: x * 10, y: z * 10 }));
    // Zwei Räume über der Schwelle, der dritte (p = 0,01) nicht — und er steht
    // ohnehin nicht im Grundriss.
    expect(calls.filter(([name]) => name === 'fill')).toHaveLength(2);
    expect(BELIEF_MIN).toBeGreaterThan(0.01);
    // Die Prognose ist gestrichelt: Sie ist geraten und nicht gesehen.
    const dash = calls.find(
      ([name, args]) => name === 'setLineDash' && (args[0] as number[]).length,
    );
    expect(dash).toBeTruthy();
    // Der Abfangring liegt an der Tür, in Bildpunkten.
    const arcs = calls.filter(([name]) => name === 'arc').map(([, args]) => args as number[]);
    expect(arcs[0]![0]).toBe(50);
    expect(arcs[0]![1]).toBe(25);
    const written = calls.filter(([name]) => name === 'fillText').map(([, args]) => args[0]);
    expect(written).toContain('M 3,2 s / T 4,0 s');
    expect(written).toContain('Jagd');
  });

  it('lässt die Beschriftungen weg, wo sie stören', () => {
    const { ctx, calls } = recorder();
    drawInsight(ctx, insight(), station(), (x, z) => ({ x, y: z }), { labels: false });
    expect(calls.some(([name]) => name === 'fillText')).toBe(false);
    expect(calls.some(([name]) => name === 'arc')).toBe(true);
  });

  it('kommt ohne Prognose und ohne Abfangtür aus', () => {
    const { ctx, calls } = recorder();
    drawInsight(
      ctx,
      { ...insight(), prediction: null, intercept: null, goal: null },
      station(),
      (x, z) => ({ x, y: z }),
    );
    expect(calls.some(([name]) => name === 'arc')).toBe(false);
    expect(calls.some(([name]) => name === 'fillText')).toBe(false);
    expect(calls.filter(([name]) => name === 'fill')).toHaveLength(2);
  });
});
