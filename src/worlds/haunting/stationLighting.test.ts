import { freshCrew, stationOptions } from './mission';
import { LampShadowTurns, lampShadowDue, lampShadowIdle, stationLighting } from './stationLighting';

describe('station darkness', () => {
  it('switches off all broad station lighting while retaining safe test mode', () => {
    const crew = freshCrew(stationOptions({ test: true, bright: false }));
    expect(stationLighting(crew, false)).toEqual({
      dark: true,
      ambient: 0,
      lamps: false,
      command: 0,
    });
    expect(crew.options.test).toBe(true);
  });

  it('leaves unpowered rooms dark while keeping powered decks readable', () => {
    const crew = freshCrew();
    expect(stationLighting(crew, false).ambient).toBe(0);
    expect(stationLighting(crew, false, true).ambient).toBeGreaterThan(0);
    crew.simulation = true;
    expect(stationLighting(crew, false).ambient).toBeGreaterThan(0);
  });

  it('keeps the explicit darkness test dark even on a powered deck', () => {
    const crew = freshCrew(stationOptions({ test: true, bright: false }));
    expect(stationLighting(crew, false, true).ambient).toBe(0);
  });

  it('does not illuminate the whole station just because a remote laboratory is bright', () => {
    const crew = freshCrew(stationOptions({ test: true, bright: true }));
    expect(stationLighting(crew, false).ambient).toBeGreaterThan(0);
    expect(stationLighting(crew, true)).toEqual({
      dark: false,
      ambient: 0,
      lamps: false,
      command: 0,
    });
  });
});

describe('Schattenkarten der Deckenleuchten', () => {
  it('lässt die Leuchten abwechselnd zeichnen und nie beide im selben Bild', () => {
    const turns = new LampShadowTurns(2, 0.25);
    const picked: number[] = [];
    // Eine Sekunde bei 64 Bildern (ein Bruch, den Gleitkomma genau trifft).
    for (let i = 0; i < 64; i++) {
      const turn = turns.step(1 / 64);
      if (turn >= 0) picked.push(turn);
    }
    // Jede kommt viermal je Sekunde dran, abwechselnd.
    expect(picked.filter((one) => one === 0)).toHaveLength(4);
    expect(picked.filter((one) => one === 1)).toHaveLength(4);
    for (let i = 1; i < picked.length; i++) expect(picked[i]).not.toBe(picked[i - 1]);
  });

  it('zeichnet für eine dunkle Leuchte nichts, sofort beim Umzug oder Anschalten', () => {
    expect(lampShadowDue(true, false, 1, 0)).toBe(false);
    expect(lampShadowDue(false, true, 1, 0)).toBe(false);
    expect(lampShadowDue(false, false, 1, 1)).toBe(false);
    expect(lampShadowDue(true, false, 1, 1)).toBe(true);
    expect(lampShadowDue(false, true, 1, 1)).toBe(true);
    expect(lampShadowDue(false, false, 0, 1)).toBe(true);
  });
});

describe('lampShadowIdle', () => {
  it('cancels a dark lamp redraw only once its shadow map exists', () => {
    // Ohne Karte muss sie einmal gezeichnet werden, sonst wird die Station schwarz.
    expect(lampShadowIdle(0, false)).toBe(false);
    expect(lampShadowIdle(0, true)).toBe(true);
    expect(lampShadowIdle(1, true)).toBe(false);
  });
});
