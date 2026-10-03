import {
  BREATH_PERIOD,
  EXHALE,
  FOGGED,
  LIGHT_PEAK,
  STRONG_PEAK,
  breathFog,
  breathPulse,
} from './visorBreath';
import {
  DEFAULT_GRAPHICS,
  VISOR_BREATHS,
  clampGraphics,
  nextVisorBreath,
  nextVisorBreathRender,
  nextVisorBreathStyle,
  type VisorBreath,
} from './graphicsSettings';

/** Viele Zeitpunkte über drei Atemzüge. */
const TIMES = Array.from({ length: 600 }, (_, i) => (i / 600) * BREATH_PERIOD * 3);

describe('der Atem auf dem Visier', () => {
  it('atmet im Takt: am Anfang klar, am Ende des Ausatmens am dichtesten, dann wieder klar', () => {
    expect(breathPulse(0)).toBeCloseTo(0);
    expect(breathPulse(EXHALE)).toBeCloseTo(1);
    expect(breathPulse(BREATH_PERIOD - 1e-6)).toBeCloseTo(0, 4);
    expect(breathPulse(BREATH_PERIOD + EXHALE)).toBeCloseTo(1);
    // Und es springt nirgends: zwischen zwei nahen Zeitpunkten nur ein Hauch.
    for (const t of TIMES) {
      expect(Math.abs(breathPulse(t + 0.005) - breathPulse(t))).toBeLessThan(0.02);
    }
  });

  it('ist aus wirklich aus', () => {
    for (const t of TIMES) expect(breathFog('off', t)).toBe(0);
  });

  it('beschlägt leicht nur ganz leicht und wird dazwischen klar', () => {
    const values = TIMES.map((t) => breathFog('light', t));
    expect(Math.min(...values)).toBeCloseTo(0, 2);
    expect(Math.max(...values)).toBeCloseTo(LIGHT_PEAK, 2);
  });

  it('wird bei stark nie klarer als leicht auf dem Gipfel', () => {
    const values = TIMES.map((t) => breathFog('strong', t));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(LIGHT_PEAK - 1e-9);
    expect(Math.max(...values)).toBeCloseTo(STRONG_PEAK, 2);
  });

  it('ist beschlagen durchgehend fast undurchsichtig', () => {
    for (const t of TIMES) expect(breathFog('fogged', t)).toBe(FOGGED);
    expect(FOGGED).toBeGreaterThan(STRONG_PEAK);
  });

  it('überlebt eine Zeit, die keine ist', () => {
    expect(breathPulse(Number.NaN)).toBe(0);
    expect(breathPulse(-1)).toBeGreaterThanOrEqual(0);
  });
});

describe('die Einstellungen unter Visier / Atem', () => {
  it('sind ab Werk aus, realistisch und gerechnet', () => {
    expect(DEFAULT_GRAPHICS.visorBreath).toBe('off');
    expect(DEFAULT_GRAPHICS.visorBreathStyle).toBe('realistic');
    expect(DEFAULT_GRAPHICS.visorBreathRender).toBe('computed');
  });

  it('machen aus Unsinn die Vorgabe und lassen Gültiges stehen', () => {
    expect(clampGraphics({ visorBreath: 'nebel' as never }).visorBreath).toBe('off');
    expect(clampGraphics({ visorBreathStyle: 'x' as never }).visorBreathStyle).toBe('realistic');
    expect(clampGraphics({ visorBreathRender: 'x' as never }).visorBreathRender).toBe('computed');
    expect(
      clampGraphics({
        visorBreath: 'strong',
        visorBreathStyle: 'flat',
        visorBreathRender: 'image',
      }),
    ).toMatchObject({
      visorBreath: 'strong',
      visorBreathStyle: 'flat',
      visorBreathRender: 'image',
    });
  });

  it('schalten im Kreis', () => {
    let mode: VisorBreath = VISOR_BREATHS[0];
    const seen: VisorBreath[] = [mode];
    for (let i = 1; i < VISOR_BREATHS.length; i++) seen.push((mode = nextVisorBreath(mode)));
    expect(seen).toEqual(['off', 'light', 'strong', 'fogged']);
    expect(nextVisorBreath('fogged')).toBe('off');
    expect(nextVisorBreathStyle(nextVisorBreathStyle('flat'))).toBe('flat');
    expect(nextVisorBreathRender(nextVisorBreathRender('image'))).toBe('image');
  });
});
