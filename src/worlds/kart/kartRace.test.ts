import { formatLap, raceLines, standings, startLap, stepLap, type Racer } from './kartRace';

const LAP = 100;

/** Fährt eine Strecke am Stück ab, in Schritten von einem Meter je Zehntel. */
function drive(state = startLap(0), metres = LAP, step = 1): ReturnType<typeof stepLap> {
  let result = { state, completed: false, record: false };
  for (let i = 0; i < metres / step; i += 1) {
    const along = (((result.state.along + step) % LAP) + LAP) % LAP;
    result = stepLap(result.state, along, LAP, 0.1);
  }
  return result;
}

describe('Rundenzählung', () => {
  it('zählt eine volle Runde genau einmal', () => {
    const first = drive();
    expect(first.completed).toBe(true);
    expect(first.state.laps).toBe(1);
    // Zehn Sekunden für hundert Meter in Schritten von einem Zehntel.
    expect(first.state.lastLap).toBeCloseTo(10, 6);
    expect(first.state.bestLap).toBeCloseTo(10, 6);

    // Und der nächste Meter macht daraus keine zweite.
    const next = stepLap(first.state, first.state.along + 1, LAP, 0.1);
    expect(next.completed).toBe(false);
    expect(next.state.laps).toBe(1);
  });

  it('zählt zwei Runden hintereinander', () => {
    const second = drive(drive().state);
    expect(second.state.laps).toBe(2);
  });

  it('lässt eine schnellere Runde die Bestzeit werden — und eine langsamere nicht', () => {
    const first = drive();
    const faster = drive(first.state, LAP, 2);
    expect(faster.record).toBe(true);
    expect(faster.state.bestLap).toBeCloseTo(5, 6);

    const slower = drive(faster.state, LAP, 0.5);
    expect(slower.completed).toBe(true);
    expect(slower.record).toBe(false);
    expect(slower.state.bestLap).toBeCloseTo(5, 6);
    expect(slower.state.lastLap).toBeCloseTo(20, 6);
  });

  it('macht aus Wenden und Zurückrollen keine Runde', () => {
    // Fast einmal herum …
    let result = drive(startLap(0), LAP - 5);
    expect(result.state.laps).toBe(0);
    // … dann rückwärts über die Linie und wieder vorwärts.
    for (let i = 0; i < 10; i += 1) {
      const along = (((result.state.along - 1) % LAP) + LAP) % LAP;
      result = stepLap(result.state, along, LAP, 0.1);
    }
    expect(result.state.laps).toBe(0);
    expect(result.state.progress).toBeCloseTo(LAP - 15, 6);

    result = drive(result.state, 15);
    expect(result.state.laps).toBe(1);
  });

  it('rechnet den Weg über die Ziellinie hinweg richtig', () => {
    // Der Sprung von 99 auf 1 sind zwei Meter vorwärts und keine 98 zurück.
    const state = stepLap({ ...startLap(99), progress: 99 }, 1, LAP, 0.1);
    expect(state.completed).toBe(true);
    expect(state.state.progress).toBeCloseTo(1, 6);
  });
});

describe('Reihenfolge im Feld', () => {
  const racer = (over: Partial<Racer> & { id: string }): Racer => ({
    name: over.id,
    kart: 0,
    laps: 0,
    progress: 0,
    lastLap: null,
    bestLap: null,
    ...over,
  });

  it('setzt mehr Runden nach vorn', () => {
    const order = standings([
      racer({ id: 'b', laps: 1, progress: 5 }),
      racer({ id: 'a', laps: 2, progress: 1 }),
    ]);
    expect(order.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('entscheidet bei gleicher Runde der weiter Gekommene', () => {
    const order = standings([
      racer({ id: 'a', laps: 1, progress: 10 }),
      racer({ id: 'b', laps: 1, progress: 40 }),
    ]);
    expect(order.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('stellt den, der daneben steht, hinter jeden Fahrenden', () => {
    const order = standings([
      racer({ id: 'a', kart: null, laps: 9, progress: 90 }),
      racer({ id: 'b', laps: 0, progress: 0 }),
    ]);
    expect(order.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('kommt bei gleichem Stand auf beiden Rechnern zur selben Reihenfolge', () => {
    const field = [racer({ id: 'zoe' }), racer({ id: 'ada' }), racer({ id: 'mo' })];
    expect(standings(field).map((r) => r.id)).toEqual(['ada', 'mo', 'zoe']);
    expect(standings([...field].reverse()).map((r) => r.id)).toEqual(['ada', 'mo', 'zoe']);
  });
});

describe('Tafel', () => {
  it('schreibt Minuten, Sekunden und Hundertstel', () => {
    expect(formatLap(0)).toBe('0:00.00');
    expect(formatLap(9.5)).toBe('0:09.50');
    expect(formatLap(64.2)).toBe('1:04.20');
  });

  it('markiert die eigene Zeile und lässt eine fehlende Zeit als Strich stehen', () => {
    const lines = raceLines(
      [
        { id: 'me', name: 'Nils', kart: 1, laps: 2, progress: 30, lastLap: 24.1, bestLap: 24.1 },
        { id: 'you', name: 'Gast', kart: 0, laps: 2, progress: 10, lastLap: null, bestLap: null },
        {
          id: 'idle',
          name: 'Zaungast',
          kart: null,
          laps: 0,
          progress: 0,
          lastLap: null,
          bestLap: null,
        },
      ],
      'me',
    );
    expect(lines).toEqual([
      '▸1. Nils · 2 Rd · 0:24.10',
      ' 2. Gast · 2 Rd · —',
      ' 3. Zaungast · daneben · —',
    ]);
  });
});
