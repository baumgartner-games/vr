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

  it('uses zero ambient for a real mission and lighting for the observer', () => {
    const crew = freshCrew();
    expect(stationLighting(crew, false).ambient).toBe(0);
    crew.simulation = true;
    expect(stationLighting(crew, false).ambient).toBeGreaterThan(0);
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
