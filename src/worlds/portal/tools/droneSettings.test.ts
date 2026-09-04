import {
  DEFAULT_DRONE,
  DRONE_FIELDS,
  clampDrone,
  clampDroneField,
  droneFieldLabel,
  nextDroneStep,
} from './droneSettings';

const SPEED = DRONE_FIELDS[0]!;
const TURN = DRONE_FIELDS[1]!;

describe('Drohnen-Einstellungen', () => {
  it('nimmt die Auslieferungswerte, wenn nichts eingestellt ist', () => {
    expect(clampDrone(undefined)).toEqual(DEFAULT_DRONE);
    expect(clampDrone({})).toEqual(DEFAULT_DRONE);
  });

  it('holt jeden Wert in seinen Bereich zurück', () => {
    expect(clampDrone({ speed: 999 }).speed).toBe(SPEED.max);
    expect(clampDrone({ turn: 999 }).turn).toBe(TURN.max);
    expect(clampDrone({ speed: 0.01 }).speed).toBe(SPEED.min);
  });

  it('macht aus einer Null den Auslieferungswert, nicht das Minimum', () => {
    // Genau das steht in einem Konfig-Code, der diese Felder noch nicht kannte.
    expect(clampDrone({ speed: 0, turn: 0 })).toEqual(DEFAULT_DRONE);
    expect(clampDroneField(SPEED, Number.NaN)).toBe(DEFAULT_DRONE.speed);
    expect(clampDroneField(TURN, undefined)).toBe(DEFAULT_DRONE.turn);
  });

  it('rundet auf die Stellen, mit denen der Wert angezeigt wird', () => {
    expect(clampDrone({ speed: 7.4444 }).speed).toBe(7.4);
    expect(clampDrone({ turn: 83.7 }).turn).toBe(84);
  });

  it('fällt bei einem unbekannten Modus auf den Kopter zurück', () => {
    expect(clampDrone({ profile: 'raketen' as never }).profile).toBe('kopter');
  });

  it('schaltet auf die nächste Raste nach oben und oben wieder um', () => {
    expect(nextDroneStep(SPEED, SPEED.steps[0]!)).toBe(SPEED.steps[1]);
    // Ein getippter Wert zwischen zwei Rasten nimmt die nächsthöhere.
    expect(nextDroneStep(SPEED, SPEED.steps[0]! + 0.1)).toBe(SPEED.steps[1]);
    expect(nextDroneStep(SPEED, SPEED.steps[SPEED.steps.length - 1]!)).toBe(SPEED.steps[0]);
  });

  it('bleibt beim Durchschalten in jedem Fall gültig', () => {
    let value = DEFAULT_DRONE.turn;
    for (let i = 0; i < TURN.steps.length + 2; i++) {
      value = nextDroneStep(TURN, value);
      expect(clampDroneField(TURN, value)).toBe(value);
    }
  });

  it('schreibt die Zahl mit ihrer Einheit auf die Zeile', () => {
    expect(droneFieldLabel(SPEED, 5.5)).toBe('5.5 m/s');
    expect(droneFieldLabel(TURN, 70)).toBe('70 °/s');
  });
});
