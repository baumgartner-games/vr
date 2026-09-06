/**
 * Die Zahlen hinter einem Pinselstrich.
 *
 * Getestet wird das, was man in der Brille nicht nachrechnen kann: dass eine
 * Breite in ihren Grenzen bleibt, dass der Regler und die Anzeige dieselbe
 * Zahl meinen, dass ein Kanal beim Hin- und Herrechnen ganz bleibt, und dass
 * die eigene Farbreihe nicht überläuft. Alles davon steckt sonst in einem
 * Canvas, den kein Test ansieht.
 */
import {
  CHISEL_RATIO,
  DEFAULT_BRUSH,
  MAX_SWATCHES,
  MAX_WIDTH,
  MIN_WIDTH,
  WIDTH_STEPS,
  alphaOf,
  channelsOf,
  clampBrush,
  clampSwatches,
  clampWidth,
  colorOfChannels,
  nextBrushKind,
  nextWidth,
  sprayDots,
  stampCount,
  stampOf,
  widthFraction,
  widthFromFraction,
  widthLabel,
  withChannel,
  withSwatch,
  withoutSwatch,
} from './brushSettings';

describe('die Breite', () => {
  it('bleibt in ihren Grenzen und ist eine ganze Zahl Millimeter', () => {
    expect(clampWidth(0)).toBe(MIN_WIDTH);
    expect(clampWidth(1000)).toBe(MAX_WIDTH);
    expect(clampWidth(12.4)).toBe(12);
    expect(clampWidth('nichts')).toBe(DEFAULT_BRUSH.width);
    expect(clampWidth(Number.NaN)).toBe(DEFAULT_BRUSH.width);
  });

  it('rastet in der Runde und fängt oben wieder vorn an', () => {
    let width: number = WIDTH_STEPS[0];
    for (let index = 1; index < WIDTH_STEPS.length; index++) {
      width = nextWidth(width);
      expect(width).toBe(WIDTH_STEPS[index]);
    }
    expect(nextWidth(width)).toBe(WIDTH_STEPS[0]);
    expect(nextWidth(MAX_WIDTH)).toBe(WIDTH_STEPS[0]);
  });

  it('liegt am Regler dort, wo sie steht — und kommt genauso zurück', () => {
    expect(widthFraction(MIN_WIDTH)).toBe(0);
    expect(widthFraction(MAX_WIDTH)).toBe(1);
    for (const step of WIDTH_STEPS) {
      expect(widthFromFraction(widthFraction(step))).toBe(step);
    }
    // Über die Enden hinaus gezogen bleibt der Regler am Anschlag stehen.
    expect(widthFromFraction(-2)).toBe(MIN_WIDTH);
    expect(widthFromFraction(9)).toBe(MAX_WIDTH);
  });

  it('steht auf der Tafel als Millimeter', () => {
    expect(widthLabel(20)).toBe('20 mm');
    expect(widthLabel(0)).toBe(`${MIN_WIDTH} mm`);
  });
});

describe('die Art', () => {
  it('geht der Reihe nach durch und schließt den Kreis', () => {
    let kind = DEFAULT_BRUSH.kind;
    const seen = new Set([kind]);
    for (let index = 0; index < 3; index++) {
      kind = nextBrushKind(kind);
      expect(seen.has(kind)).toBe(false);
      seen.add(kind);
    }
    expect(nextBrushKind(kind)).toBe(DEFAULT_BRUSH.kind);
  });

  it('bestimmt Abdruck und Deckung — und nur die Sprühdose deckt nicht', () => {
    expect(stampOf('round')).toBe('round');
    expect(stampOf('marker')).toBe('round');
    expect(stampOf('flat')).toBe('chisel');
    expect(stampOf('spray')).toBe('spray');
    expect(alphaOf('round')).toBe(1);
    expect(alphaOf('flat')).toBe(1);
    expect(alphaOf('marker')).toBe(1);
    expect(alphaOf('spray')).toBeLessThan(1);
    expect(alphaOf('spray')).toBeGreaterThan(0);
  });

  it('streut mehr Punkte, je breiter der Kegel ist', () => {
    expect(sprayDots(2)).toBeGreaterThanOrEqual(4);
    expect(sprayDots(80)).toBeGreaterThan(sprayDots(20));
  });

  it('ist beim Flachpinsel schmaler als breit', () => {
    expect(CHISEL_RATIO).toBeGreaterThan(0);
    expect(CHISEL_RATIO).toBeLessThan(1);
  });
});

describe('die Abdrücke entlang einer Strecke', () => {
  it('lassen keine Lücke und ufern nicht aus', () => {
    // Ein Punkt ohne Weg ist trotzdem ein Abdruck.
    expect(stampCount(0, 20)).toBe(1);
    // Dicht an dicht: nie weiter auseinander als ein Drittel der Breite.
    for (const [distance, width] of [
      [100, 20],
      [3, 20],
      [1000, 2],
    ] as const) {
      expect(distance / stampCount(distance, width)).toBeLessThanOrEqual(width / 3 + 1e-9);
    }
    // Und nicht tausend Abdrücke für einen kurzen Weg.
    expect(stampCount(20, 20)).toBeLessThanOrEqual(4);
  });
});

describe('die Farbe aus drei Reglern', () => {
  it('geht auseinander und wieder zusammen', () => {
    for (const color of [0x000000, 0xffffff, 0x2f8fff, 0x123456]) {
      expect(colorOfChannels(channelsOf(color))).toBe(color);
    }
    expect(channelsOf(0x2f8fff)).toEqual({ r: 0x2f, g: 0x8f, b: 0xff });
  });

  it('setzt einen Kanal, ohne die anderen anzufassen', () => {
    expect(withChannel(0x000000, 'g', 1)).toBe(0x00ff00);
    expect(withChannel(0xff00ff, 'r', 0)).toBe(0x0000ff);
    // Über die Enden gezogen bleibt der Regler am Anschlag.
    expect(withChannel(0x000000, 'b', 5)).toBe(0x0000ff);
    expect(withChannel(0xffffff, 'b', -5)).toBe(0xffff00);
  });
});

describe('die eigene Farbreihe', () => {
  it('legt die zuletzt gemischte nach vorn, ohne Doppelte', () => {
    let swatches = withSwatch([], 0x112233);
    swatches = withSwatch(swatches, 0x445566);
    expect(swatches).toEqual([0x445566, 0x112233]);
    swatches = withSwatch(swatches, 0x112233);
    expect(swatches).toEqual([0x112233, 0x445566]);
  });

  it('läuft nicht über — die älteste fällt hinten heraus', () => {
    let swatches: number[] = [];
    for (let index = 0; index <= MAX_SWATCHES; index++) swatches = withSwatch(swatches, index);
    expect(swatches).toHaveLength(MAX_SWATCHES);
    expect(swatches[0]).toBe(MAX_SWATCHES);
    expect(swatches).not.toContain(0);
  });

  it('gibt einen Platz wieder her', () => {
    expect(withoutSwatch([1, 2, 3], 2)).toEqual([1, 3]);
    expect(withoutSwatch([1, 2, 3], 9)).toEqual([1, 2, 3]);
  });

  it('überlebt kaputten Speicher', () => {
    expect(clampSwatches(undefined)).toEqual([]);
    expect(clampSwatches('rot')).toEqual([]);
    expect(clampSwatches([1, 'zwei', Number.NaN, 1, 3])).toEqual([1, 3]);
    expect(clampSwatches(new Array(20).fill(0).map((_, index) => index))).toHaveLength(
      MAX_SWATCHES,
    );
  });
});

describe('die ganzen Einstellungen', () => {
  it('kommen auch aus einem alten Speicher heil heraus', () => {
    expect(clampBrush(undefined)).toEqual(DEFAULT_BRUSH);
    // Ein Konfig-Stand, der diese Felder noch gar nicht kannte.
    expect(clampBrush({ kind: 'pinsel' as never })).toEqual(DEFAULT_BRUSH);
    expect(clampBrush({ width: -3, color: -1 })).toEqual({
      ...DEFAULT_BRUSH,
      width: MIN_WIDTH,
      color: 0,
    });
  });
});
