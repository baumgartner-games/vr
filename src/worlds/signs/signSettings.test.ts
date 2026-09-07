import {
  DEFAULT_SIGN,
  FONT_STEPS,
  MAX_FONT_CM,
  MIN_FONT_CM,
  SCROLL_STEPS,
  SIGN_BACKGROUNDS,
  SIGN_COLORS,
  alignLabel,
  clampSign,
  cssColor,
  fontPixels,
  nextPalette,
  nextStep,
  paletteLabel,
  scrollLabel,
  scrollPixels,
} from './signSettings';

describe('clampSign', () => {
  it('macht aus nichts die Voreinstellung', () => {
    expect(clampSign(undefined)).toEqual(DEFAULT_SIGN);
  });

  it('holt Schriftgröße und Rolltempo in ihre Grenzen', () => {
    expect(clampSign({ fontCm: 0.1 }).fontCm).toBe(MIN_FONT_CM);
    expect(clampSign({ fontCm: 400 }).fontCm).toBe(MAX_FONT_CM);
    expect(clampSign({ autoScroll: -3 }).autoScroll).toBe(0);
    expect(clampSign({ autoScroll: 900 }).autoScroll).toBe(SCROLL_STEPS[SCROLL_STEPS.length - 1]);
  });

  it('überlebt einen alten Speicher, der diese Felder noch nicht kannte', () => {
    expect(clampSign({ fontCm: '4' as unknown as number }).fontCm).toBe(4);
    expect(clampSign({ color: Number.NaN }).color).toBe(DEFAULT_SIGN.color);
    expect(clampSign({ align: 'schräg' as never }).align).toBe('left');
  });

  it('lässt Markdown und Handrollen an, solange niemand sie abschaltet', () => {
    expect(clampSign({}).markdown).toBe(true);
    expect(clampSign({ markdown: false }).markdown).toBe(false);
    expect(clampSign({ manualScroll: false }).manualScroll).toBe(false);
  });
});

describe('Rasten und Farben', () => {
  it('geht oben wieder von vorn los', () => {
    expect(nextStep(FONT_STEPS, 1.5)).toBe(2);
    expect(nextStep(FONT_STEPS, MAX_FONT_CM)).toBe(FONT_STEPS[0]);
    expect(nextStep(SCROLL_STEPS, 0)).toBe(SCROLL_STEPS[1]);
  });

  it('dreht die Farbliste weiter und fängt bei einer unbekannten vorn an', () => {
    expect(nextPalette(SIGN_COLORS, SIGN_COLORS[0]!.value)).toBe(SIGN_COLORS[1]!.value);
    expect(nextPalette(SIGN_COLORS, 0x123456)).toBe(SIGN_COLORS[0]!.value);
    expect(paletteLabel(SIGN_BACKGROUNDS, SIGN_BACKGROUNDS[0]!.value)).toBe('Nachtblau');
    expect(paletteLabel(SIGN_BACKGROUNDS, 0x123456)).toBe('#123456');
  });

  it('schreibt Farben so, wie eine Leinwand sie liest', () => {
    expect(cssColor(0x0d1524)).toBe('#0d1524');
    expect(cssColor(0)).toBe('#000000');
  });
});

describe('fontPixels', () => {
  it('macht aus Zentimetern auf dem Schild Pixel auf der Leinwand', () => {
    // 1,2 m Schild auf 1200 px Leinwand: ein Zentimeter ist zehn Pixel.
    const settings = clampSign({ width: 1.2, fontCm: 4 });
    expect(fontPixels(settings, 1200)).toBeCloseTo(40);
  });

  it('hält dieselbe Zahl auf einem breiteren Schild auch physisch gleich', () => {
    const small = fontPixels(clampSign({ width: 0.8, fontCm: 4 }), 1200);
    const large = fontPixels(clampSign({ width: 1.6, fontCm: 4 }), 1200);
    // Doppelt so breites Schild, halb so viele Pixel je Zentimeter.
    expect(small).toBeCloseTo(large * 2);
  });

  it('rechnet das Rolltempo mit derselben Elle', () => {
    expect(scrollPixels(clampSign({ width: 1.2, autoScroll: 8 }), 1200)).toBeCloseTo(80);
  });
});

describe('Beschriftungen', () => {
  it('schreibt Kommazahlen deutsch und „aus" statt „0 cm/s"', () => {
    expect(scrollLabel(0)).toBe('aus');
    expect(scrollLabel(1.5)).toBe('1,5 cm/s');
    expect(alignLabel('center')).toBe('mittig');
  });
});
