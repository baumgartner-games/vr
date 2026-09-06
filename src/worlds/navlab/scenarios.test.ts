import {
  BAY_D,
  BAY_W,
  SCENARIOS,
  SCENARIO_TIME,
  bayBounds,
  bayPoint,
  labBounds,
  newScenarioState,
  scenarioOf,
  startScenario,
  stopScenario,
  tickScenario,
} from './scenarios';

describe('Der Grundriss', () => {
  it('hat zu jedem Szenario aus dem Auftrag eine Bucht', () => {
    expect(SCENARIOS.map((bay) => bay.id)).toEqual([
      'corridor',
      'pit',
      'crate',
      'door',
      'portal',
      'levels',
    ]);
  });

  it('gibt jeder Bucht einen eigenen Platz', () => {
    // Zwei Buchten, die sich überlappen, sieht man in der Brille erst daran,
    // dass ein Zombie durch eine Wand kommt.
    for (let i = 0; i < SCENARIOS.length; i++) {
      for (let j = i + 1; j < SCENARIOS.length; j++) {
        const a = bayBounds(SCENARIOS[i]!);
        const b = bayBounds(SCENARIOS[j]!);
        const apart = a.maxX <= b.minX || b.maxX <= a.minX || a.maxZ <= b.minZ || b.maxZ <= a.minZ;
        expect(apart).toBe(true);
      }
    }
  });

  it('lässt den Mittelgang frei', () => {
    // Keine Bucht darf über die Mitte hinausragen: dort läuft der Spieler.
    for (const bay of SCENARIOS) {
      const box = bayBounds(bay);
      if (bay.z < 0) expect(box.maxZ).toBeLessThan(0);
      else expect(box.minZ).toBeGreaterThan(0);
    }
  });

  it('legt „vorne" in jeder Bucht an den Eingang', () => {
    for (const bay of SCENARIOS) {
      const front = bayPoint(bay, 0, BAY_D / 2);
      const back = bayPoint(bay, 0, -BAY_D / 2);
      // Vorne ist die Seite, die zur Mitte zeigt — in beiden Reihen.
      expect(Math.abs(front.z)).toBeLessThan(Math.abs(back.z));
    }
  });

  it('bleibt mit jedem Buchtpunkt innerhalb der Bucht', () => {
    for (const bay of SCENARIOS) {
      for (const [lx, lz] of [
        [-BAY_W / 2, -BAY_D / 2],
        [BAY_W / 2, BAY_D / 2],
        [0, 0],
        [7, -3],
      ] as const) {
        const point = bayPoint(bay, lx, lz);
        const box = bayBounds(bay);
        expect(point.x).toBeGreaterThanOrEqual(box.minX);
        expect(point.x).toBeLessThanOrEqual(box.maxX);
        expect(point.z).toBeGreaterThanOrEqual(box.minZ);
        expect(point.z).toBeLessThanOrEqual(box.maxZ);
      }
    }
  });

  it('umfasst alle Buchten in den Gesamtgrenzen', () => {
    const all = labBounds();
    for (const bay of SCENARIOS) {
      const box = bayBounds(bay);
      expect(box.minX).toBeGreaterThanOrEqual(all.minX);
      expect(box.maxX).toBeLessThanOrEqual(all.maxX);
      expect(box.minZ).toBeGreaterThanOrEqual(all.minZ);
      expect(box.maxZ).toBeLessThanOrEqual(all.maxZ);
    }
  });

  it('fällt auf die erste Bucht zurück, wenn die Id Unsinn ist', () => {
    expect(scenarioOf('gibt-es-nicht').id).toBe('corridor');
    expect(scenarioOf(undefined).id).toBe('corridor');
    expect(scenarioOf('portal').id).toBe('portal');
  });
});

describe('Die Uhr eines Szenarios', () => {
  it('läuft nicht, bevor jemand drückt', () => {
    const state = newScenarioState();
    expect(tickScenario(state, 10)).toBe(false);
    expect(state.elapsed).toBe(0);
  });

  it('läuft und meldet das Ende genau einmal', () => {
    const state = newScenarioState();
    startScenario(state);
    let ended = 0;
    for (let i = 0; i < 200; i++) {
      if (tickScenario(state, 1)) ended++;
    }
    expect(ended).toBe(1);
    expect(state.running).toBe(false);
  });

  it('nimmt die Zeit, die ihr gegeben wird — auch Zeitlupe', () => {
    const frames = (dt: number): number => {
      const state = newScenarioState();
      startScenario(state);
      let count = 1;
      while (!tickScenario(state, dt) && count < 100000) count++;
      return count;
    };
    // Ein Zehntel Zeit je Bild heißt: zehnmal so viele Bilder, und nicht
    // etwa dieselbe Anzahl. Die Uhr holt sich ihre Sekunden nicht selbst.
    expect(frames(1)).toBe(SCENARIO_TIME);
    expect(frames(0.1)).toBeGreaterThan(SCENARIO_TIME * 9);
    expect(frames(0.1)).toBeLessThan(SCENARIO_TIME * 11);
  });

  it('fängt beim Neustart von vorn an', () => {
    const state = newScenarioState();
    startScenario(state);
    tickScenario(state, 30);
    state.acted = true;
    startScenario(state);
    expect(state).toEqual({ running: true, elapsed: 0, acted: false });
  });

  it('lässt sich anhalten und vergisst dabei alles', () => {
    const state = newScenarioState();
    startScenario(state);
    tickScenario(state, 5);
    stopScenario(state);
    expect(state).toEqual({ running: false, elapsed: 0, acted: false });
  });
});
