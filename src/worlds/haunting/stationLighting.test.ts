import { freshCrew, stationOptions } from './mission';
import { stationLighting } from './stationLighting';

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
