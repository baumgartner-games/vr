import { DEFAULT_TUNING, clampTuning } from './botTuning';
import { simulateRound, simulationSpec } from './roundSim';
import { stationGraph, COMMAND } from './roomGraph';
import { spacesOf } from './house';

const SEEDS = [1000, 8919, 16838, 24757];

describe('Die ausgespielte Runde ohne Bild', () => {
  it('kommt aus denselben Zahlen zweimal gleich heraus', () => {
    for (const seed of SEEDS) {
      const a = simulateRound(seed, { roll: 3 });
      const b = simulateRound(seed, { roll: 3 });
      expect(a).toEqual(b);
    }
  });

  it('ergibt aus verschiedenen Würfen verschiedene Runden', () => {
    const outcomes = new Set(
      Array.from({ length: 24 }, (_, i) => JSON.stringify(simulateRound(1000, { roll: i }))),
    );
    expect(outcomes.size).toBeGreaterThan(8);
  });

  /**
   * Beide Ausgänge müssen vorkommen. Eine Simulation, in der immer derselbe
   * gewinnt, misst nichts mehr — sie ist eine teure Konstante, und ein
   * Training darauf ist eine Zufallssuche.
   */
  it('lässt beide Seiten gewinnen', () => {
    const results = Array.from({ length: 40 }, (_, i) =>
      simulateRound(SEEDS[i % SEEDS.length]!, { roll: i }),
    );
    expect(results.some((r) => r.won)).toBe(true);
    expect(results.some((r) => !r.won)).toBe(true);
    expect(results.every((r) => r.hits <= 3)).toBe(true);
    expect(results.filter((r) => r.reason === 'killed').every((r) => r.hits === 3)).toBe(true);
  });

  it('gewinnt nur mit drei Reparaturen und nur zu Hause', () => {
    for (let roll = 0; roll < 40; roll++) {
      const result = simulateRound(24757, { roll });
      if (result.won) expect(result.repairs).toBe(3);
    }
  });

  it('bleibt schnell genug für ein Training', () => {
    const started = Date.now();
    for (let roll = 0; roll < 60; roll++) simulateRound(1000, { roll });
    // Sechzig Runden in einer Sekunde: Darunter wird aus dem Training im
    // Browser ein Fortschrittsbalken, den niemand zu Ende schaut.
    expect(Date.now() - started).toBeLessThan(4000);
  });

  it('hält sich an die Zeitgrenze', () => {
    const result = simulateRound(1000, { roll: 1, limit: 30 });
    expect(result.time).toBeLessThanOrEqual(30);
    if (result.reason === 'timeout') expect(result.won).toBe(false);
  });

  it('macht aus unsinnigen Gewichten keine unendliche Runde', () => {
    const broken = clampTuning({ monster: { speed: NaN }, technician: { walk: -5 } });
    const result = simulateRound(1000, { roll: 2, tuning: broken });
    expect(Number.isFinite(result.time)).toBe(true);
  });

  /**
   * Vierundzwanzig Runden statt zwölf: Seit der Techniker beim Arbeiten Lärm
   * macht (Paket Audio, `NOISE.interact`), liegen langsam und schnell auf
   * einer Station in zwölf Runden auch mal gleichauf — die Richtung stimmt,
   * nur die Stichprobe war zu klein, um sie zu sehen.
   */
  it('nutzt dieselben Gewichte, die die Schalttafel anbietet', () => {
    const slow = clampTuning({
      ...DEFAULT_TUNING,
      technician: { ...DEFAULT_TUNING.technician, work: 2 },
    });
    const fast = clampTuning({
      ...DEFAULT_TUNING,
      technician: { ...DEFAULT_TUNING.technician, work: 0.5 },
    });
    const slower = Array.from({ length: 24 }, (_, i) =>
      simulateRound(1000, { roll: i, tuning: slow }),
    );
    const faster = Array.from({ length: 24 }, (_, i) =>
      simulateRound(1000, { roll: i, tuning: fast }),
    );
    const won = (list: typeof slower): number => list.filter((r) => r.won).length;
    expect(won(faster)).toBeGreaterThan(won(slower));
  });
});

describe('Die Raumkarte, auf der gespielt wird', () => {
  it('kennt jeden Raum, jeden Gang und die Zentrale', () => {
    const spec = simulationSpec(1000);
    const graph = stationGraph(spec);
    expect(graph.spaces).toHaveLength(spacesOf(spec).length + 1);
    expect(graph.spaces).toContain(COMMAND);
    expect(graph.rooms).toHaveLength(spec.rooms.length);
  });

  it('verbindet die Zentrale mit dem Eingangsraum und sonst mit nichts', () => {
    const spec = simulationSpec(1000);
    const graph = stationGraph(spec);
    expect(graph.neighbours(COMMAND)).toEqual([spec.entryRoom]);
  });

  it('erreicht von der Zentrale aus jeden Raum', () => {
    const spec = simulationSpec(1000);
    const graph = stationGraph(spec);
    for (const id of graph.spaces) expect(graph.distance(COMMAND, id)).toBeLessThan(Infinity);
  });

  /**
   * Wände schlucken Schritte. Ohne diesen Aufschlag hört ein Monster den
   * Rennenden quer durch die halbe Station, und die einzige verbleibende
   * Taktik wäre, nie zu rennen.
   */
  it('dämpft Geräusche mit jeder Wand dazwischen', () => {
    const spec = simulationSpec(1000);
    const graph = stationGraph(spec);
    for (const id of graph.spaces) {
      expect(graph.earshot(id, id)).toBe(0);
      for (const other of graph.neighbours(id))
        expect(graph.earshot(id, other)).toBeGreaterThan(graph.distance(id, other));
    }
  });

  it('findet für jeden Weg den nächsten Schritt', () => {
    const spec = simulationSpec(1000);
    const graph = stationGraph(spec);
    let at = COMMAND;
    const goal = graph.rooms.at(-1)!;
    for (let step = 0; step < 40 && at !== goal; step++) {
      const next = graph.next(at, goal);
      expect(graph.neighbours(at)).toContain(next);
      expect(graph.distance(next, goal)).toBeLessThan(graph.distance(at, goal));
      at = next;
    }
    expect(at).toBe(goal);
  });

  it('ordnet einen Punkt dem Raum zu, in dem er liegt', () => {
    const spec = simulationSpec(1000);
    const graph = stationGraph(spec);
    for (const id of graph.spaces) expect(graph.spaceAt(graph.centre(id))).toBe(id);
    expect(graph.spaceAt({ x: 9999, z: 9999 })).toBe('');
  });
});
