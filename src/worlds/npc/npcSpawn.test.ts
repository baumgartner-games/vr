import {
  SPAWNER_DEFAULTS,
  newSpawnerState,
  pickSpawnPoint,
  ringPoint,
  spawnerTick,
} from './npcSpawn';

describe('Der Brutkäfig', () => {
  const config = { ...SPAWNER_DEFAULTS, interval: 2, max: 2, range: 10, radius: 1.5 };

  it('wirft sofort aus, wenn jemand danebensteht', () => {
    expect(spawnerTick(newSpawnerState(), config, 1 / 60, 3, 0)).toBe(true);
  });

  it('hält danach seinen Takt ein', () => {
    const state = newSpawnerState();
    expect(spawnerTick(state, config, 0.5, 3, 0)).toBe(true);
    let spawns = 0;
    // Vier Sekunden in halben: zwei weitere Würfe, keiner mehr.
    for (let i = 0; i < 8; i++) {
      if (spawnerTick(state, config, 0.5, 3, 0)) spawns++;
    }
    expect(spawns).toBe(2);
  });

  it('läuft nicht, solange niemand in der Nähe ist', () => {
    const state = newSpawnerState();
    for (let i = 0; i < 100; i++) {
      expect(spawnerTick(state, config, 0.5, config.range + 1, 0)).toBe(false);
    }
    // Und wer zurückkommt, wartet nicht noch einmal von vorn.
    expect(spawnerTick(state, config, 0.5, 1, 0)).toBe(true);
  });

  it('legt nichts nach, solange er voll ist', () => {
    const state = newSpawnerState();
    for (let i = 0; i < 100; i++) {
      expect(spawnerTick(state, config, 0.5, 1, config.max)).toBe(false);
    }
    expect(spawnerTick(state, config, 0.5, 1, config.max - 1)).toBe(true);
  });

  it('setzt seine Kinder in den Ring und nicht in sich selbst', () => {
    const center = { x: 4, z: -2 };
    for (const turn of [0, 0.25, 0.5, 0.75, 0.99]) {
      const point = ringPoint(center, 1.5, turn);
      expect(Math.hypot(point.x - center.x, point.z - center.z)).toBeCloseTo(1.5, 9);
    }
  });
});

describe('Die Spawnpunkte', () => {
  const points = [
    { x: 0, z: 0 },
    { x: 20, z: 0 },
    { x: 0, z: 20 },
  ];

  it('sagt „keinen", wenn keiner gesetzt ist', () => {
    expect(pickSpawnPoint([], { x: 0, z: 0 }, 5, 0.5)).toBe(-1);
  });

  it('nimmt keinen, auf dem der Spieler steht', () => {
    for (const turn of [0, 0.34, 0.67, 0.99]) {
      expect(pickSpawnPoint(points, { x: 0, z: 0 }, 8, turn)).not.toBe(0);
    }
  });

  it('würfelt unter den weit genug entfernten', () => {
    expect(pickSpawnPoint(points, { x: 0, z: 0 }, 8, 0)).toBe(1);
    expect(pickSpawnPoint(points, { x: 0, z: 0 }, 8, 0.99)).toBe(2);
  });

  it('nimmt den entferntesten, wenn keiner weit genug weg ist', () => {
    // Alle drei stehen zu nah — dann ist „der weiteste" die beste Antwort, die
    // es gibt, und nicht „gar keiner".
    expect(pickSpawnPoint(points, { x: 0, z: 0 }, 100, 0.5)).toBe(1);
  });

  it('kommt ohne Spieler aus', () => {
    expect(pickSpawnPoint(points, null, 8, 0)).toBe(0);
    expect(pickSpawnPoint(points, null, 8, 0.99)).toBe(2);
  });
});
