import {
  SIMULATION_CEILING,
  SIMULATION_SPEEDS,
  clampSimulationSpeed,
  nextSimulationSpeed,
  simulationRepeats,
  simulationSpeedLabel,
} from './simulationSpeed';

describe('Der Zeitraffer der Bot-Runde', () => {
  it('rastet auf die angebotenen Stufen ein', () => {
    expect(clampSimulationSpeed(1)).toBe(1);
    expect(clampSimulationSpeed(3)).toBe(2);
    expect(clampSimulationSpeed(99)).toBe(8);
    expect(clampSimulationSpeed(0)).toBe(1);
    expect(clampSimulationSpeed(-4)).toBe(1);
    expect(clampSimulationSpeed(NaN)).toBe(1);
    expect(clampSimulationSpeed('schnell')).toBe(1);
  });

  it('geht die Stufen durch und fängt danach wieder bei Echtzeit an', () => {
    let speed: number = SIMULATION_SPEEDS[0];
    const seen = [speed];
    for (let i = 0; i < SIMULATION_SPEEDS.length; i++) {
      speed = nextSimulationSpeed(speed);
      seen.push(speed);
    }
    expect(seen).toEqual([...SIMULATION_SPEEDS, 1]);
  });

  /**
   * Der Kern: Beschleunigt wird über die **Zahl** der Bilder. Ein einzelner
   * Schritt bleibt so lang, wie er ohne Zeitraffer wäre — sonst fällt der
   * Techniker beim ersten ×8 durch den Boden.
   */
  it('rechnet bei ×4 vier normale Bilder statt eines viermal so langen', () => {
    expect(simulationRepeats(4, 1 / 60)).toBe(4);
    expect(simulationRepeats(8, 1 / 60)).toBe(8);
    expect(simulationRepeats(1, 1 / 60)).toBe(1);
  });

  it('nimmt die Stufen zurück, wenn das echte Bild schon lang ist', () => {
    expect(simulationRepeats(8, SIMULATION_CEILING)).toBe(8);
    expect(simulationRepeats(8, SIMULATION_CEILING * 2)).toBe(4);
    expect(simulationRepeats(8, SIMULATION_CEILING * 8)).toBe(1);
    // Auch ein Ruckler hält die Welt nur an; er dreht sie nicht zurück.
    expect(simulationRepeats(8, 5)).toBe(1);
    expect(simulationRepeats(4, 0)).toBe(4);
    expect(simulationRepeats(4, NaN)).toBe(4);
  });

  it('beschriftet die Stufe so, wie sie auf der Schaltfläche steht', () => {
    expect(simulationSpeedLabel(1)).toBe('Echtzeit');
    expect(simulationSpeedLabel(4)).toBe('Zeitraffer ×4');
    expect(simulationSpeedLabel('kaputt')).toBe('Echtzeit');
  });
});
