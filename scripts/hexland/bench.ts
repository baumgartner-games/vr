/**
 * **Benchmark der Spielhilfen** — spielt normale Runden, in denen immer die
 * beste Lage einer Strategie gelegt wird (`hexPlanner.bestPlacement`), und
 * gibt den Schnitt der Punkte aus.
 *
 *   npm run hexbench -- [Runden=300] [erster Samen=1] [Strategien=smart,optimized] [Prozesse=4]
 *
 * Dieselben Samen für jede Strategie — der Unterschied liegt dann am Legen,
 * nicht am Stapel. Die Runden werden auf mehrere Prozesse verteilt.
 */
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { HexBoard } from '../../src/worlds/hexland/hexRules';
import { bestPlacement, type Strategy } from '../../src/worlds/hexland/hexPlanner';

interface Result {
  points: number[];
  done: number;
  failed: number;
  open: number;
  tasks: number;
  flags: number;
  river: number;
  road: number;
}

function play(strategy: Strategy, first: number, games: number): Result {
  const out: Result = {
    points: [],
    done: 0,
    failed: 0,
    open: 0,
    tasks: 0,
    flags: 0,
    river: 0,
    road: 0,
  };
  for (let g = 0; g < games; g++) {
    const seed = first + g;
    const board = new HexBoard(seed);
    board.reset(seed);
    while (board.current) {
      const best = bestPlacement(board, strategy);
      if (best) board.place(best.q, best.r, best.rot);
      else {
        const slot = board.openSlots()[0]!;
        board.place(slot.q, slot.r, 0, true);
      }
    }
    for (const tile of board.tiles.values()) {
      const state = tile.spec.quest?.state;
      if (state === 'done') out.done++;
      else if (state === 'failed') out.failed++;
      else if (state === 'open') out.open++;
    }
    const s = board.scoring();
    out.points.push(s.total);
    out.tasks += s.tasks;
    out.flags += s.flags;
    out.river += s.river;
    out.road += s.road;
  }
  return out;
}

if (process.env.HEXBENCH_WORKER) {
  const [strategy, first, games] = process.env.HEXBENCH_WORKER.split(',');
  process.send!(play(strategy as Strategy, Number(first), Number(games)));
} else {
  const games = Number(process.argv[2] ?? 300);
  const first = Number(process.argv[3] ?? 1);
  const strategies = (process.argv[4] ?? 'smart,optimized').split(',') as Strategy[];
  const jobs = Math.max(1, Number(process.argv[5] ?? 4));
  const self = fileURLToPath(import.meta.url);
  const byStrategy = new Map<Strategy, number[]>();
  for (const strategy of strategies) {
    const start = Date.now();
    const per = Math.ceil(games / jobs);
    const parts = await Promise.all(
      Array.from({ length: jobs }, (_, j) => {
        const from = first + j * per;
        const count = Math.max(0, Math.min(per, games - j * per));
        if (count === 0) return Promise.resolve(null);
        return new Promise<Result>((resolve, reject) => {
          const child = fork(self, [], {
            env: { ...process.env, HEXBENCH_WORKER: `${strategy},${from},${count}` },
          });
          child.on('message', (m) => resolve(m as Result));
          child.on('error', reject);
        });
      }),
    );
    const all = parts.filter((p): p is Result => p !== null);
    const points = all.flatMap((p) => p.points);
    byStrategy.set(strategy, points);
    const sum = (k: keyof Omit<Result, 'points'>): number => all.reduce((x, p) => x + p[k], 0);
    const avg = points.reduce((x, y) => x + y, 0) / points.length;
    const sd = Math.sqrt(points.reduce((x, y) => x + (y - avg) ** 2, 0) / points.length);
    const each = (n: number): string => (n / points.length).toFixed(2);
    console.log(
      `${strategy.padEnd(10)} avg ${avg.toFixed(2)} ± ${(sd / Math.sqrt(points.length)).toFixed(2)} (sd ${sd.toFixed(1)}) · ` +
        `Aufträge ${each(sum('tasks'))} Flaggen ${each(sum('flags'))} Fluss ${each(sum('river'))} Weg ${each(sum('road'))} · ` +
        `erfüllt ${each(sum('done'))} verpasst ${each(sum('failed'))} offen ${each(sum('open'))} je Runde · ` +
        `${points.length} Runden ab ${first} · ${((Date.now() - start) / 1000).toFixed(0)} s`,
    );
  }
  // **Der Unterschied je Samen** — genauer als zwei Schnitte nebeneinander,
  // weil jeder Stapel einmal mit jeder Strategie gespielt wird.
  const [a, b] = strategies;
  const pa = a ? byStrategy.get(a) : undefined;
  const pb = b ? byStrategy.get(b) : undefined;
  if (pa && pb) {
    const diff = pa.map((x, i) => pb[i]! - x);
    const mean = diff.reduce((x, y) => x + y, 0) / diff.length;
    const sd = Math.sqrt(diff.reduce((x, y) => x + (y - mean) ** 2, 0) / diff.length);
    console.log(
      `${b} − ${a}: ${mean >= 0 ? '+' : ''}${mean.toFixed(2)} ± ${(sd / Math.sqrt(diff.length)).toFixed(2)} Punkte je Runde`,
    );
  }
}
