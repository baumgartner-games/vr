import { generateHouse } from './house';
import { freshCrew, puzzleSolved, repairsFor, stationOptions } from './mission';
import { MissionBot } from './missionBot';
import type { HauntState } from './net';
import { housePlan } from './plan';
import { stationRoute } from './stationNavigation';
import { COMMAND_HOME } from './trainingLayout';
import { AutomaticDoors } from './automaticDoors';
import { StationTravelPlan } from './stationTravelPlan';
import { TILE, dirX, dirZ } from '../nav/navTile';

function state(seed: number, rooms: number): HauntState {
  return {
    seed,
    phase: 'running',
    time: 0,
    monsterOn: false,
    monster: null,
    shut: [],
    lit: [],
    loud: [],
    fuse: false,
    taken: [],
    done: [],
    crew: freshCrew(stationOptions({ test: true, bright: true, rooms })),
  };
}

test.each([6, 8, 12])(
  'a watched bot completes all real puzzles and returns to command on a %i-room station',
  (rooms) => {
    const spec = generateHouse(20260909, rooms);
    const game = state(spec.seed, rooms);
    const graph = housePlan(spec).graph;
    const messages: string[] = [];
    const bot = new MissionBot({
      spec,
      state: game,
      route: (from, target) => stationRoute(spec, graph, from, target),
      say: (message) => messages.push(message),
    });
    const stages = new Set<string>();
    for (let frame = 0; frame < 12000 && !bot.completed; frame++) {
      stages.add(bot.stage);
      bot.update(0.1);
      for (const id of game.done) {
        const repair = repairsFor(spec).find((item) => item.id === id)!;
        expect(game.taken).toContain(repair.itemId);
        expect(puzzleSolved(repair, game.crew.puzzles[id]!)).toBe(true);
      }
    }
    expect(bot.stage).toBe('complete');
    expect(game.phase).toBe('won');
    expect(game.done).toHaveLength(3);
    expect(game.taken).toHaveLength(3);
    expect(Math.hypot(bot.pose.x - COMMAND_HOME.x, bot.pose.z - COMMAND_HOME.z)).toBeLessThan(0.45);
    expect(stages).toEqual(
      new Set(['cargo', 'open-cargo', 'take-cargo', 'console', 'repair', 'return']),
    );
    expect(messages.at(-1)).toContain('ERFÜLLT');
  },
);

test('blocked navigation never fabricates parts, repairs or a win, and can resume after the route opens', () => {
  const spec = generateHouse(82, 6);
  const game = state(spec.seed, 6);
  const graph = housePlan(spec).graph;
  let open = false;
  const say = jest.fn();
  const bot = new MissionBot({
    spec,
    state: game,
    say,
    route: (from, target) => (open ? stationRoute(spec, graph, from, target) : null),
  });
  for (let i = 0; i < 500; i++) bot.update(0.1);
  expect(game.taken).toEqual([]);
  expect(game.done).toEqual([]);
  expect(game.phase).toBe('running');
  expect(
    say.mock.calls.filter(([message]: [string]) => message.includes('blockiert')),
  ).toHaveLength(1);
  open = true;
  for (let i = 0; i < 12000 && !bot.completed; i++) bot.update(0.1);
  expect(bot.completed).toBe(true);
});

test.each([6, 12])(
  'automatic proximity doors let a bot finish a %i-room round without going through closed walls',
  (rooms) => {
    const spec = generateHouse(3309, rooms);
    const game = state(spec.seed, rooms);
    const plan = housePlan(spec);
    const doors = new AutomaticDoors();
    const travel = new StationTravelPlan();
    const bot = new MissionBot({
      spec,
      state: game,
      route: (from, target) =>
        stationRoute(spec, travel.graph(spec, game.shut, true), from, target),
      revision: () => travel.graph(spec, game.shut, true).version,
      say: () => {},
    });
    let openings = 0;
    for (let frame = 0; frame < 9000 && !bot.completed; frame++) {
      for (const door of spec.doors) {
        const at = {
          x: (door.x + 0.5 + dirX(door.dir) * 0.5) * TILE,
          z: (door.z + 0.5 + dirZ(door.dir) * 0.5) * TILE,
          alongX: dirX(door.dir) === 0,
        };
        const was = doors.isOpen(door.id);
        const open = doors.step(door.id, at, false, [bot.pose], 0.1);
        if (open && !was) openings++;
        plan.door(door.x, door.z, door.dir, 0, open);
      }
      const before = { ...bot.pose };
      bot.update(0.1);
      for (const door of spec.doors) {
        const x = (door.x + 0.5 + dirX(door.dir) * 0.5) * TILE;
        const z = (door.z + 0.5 + dirZ(door.dir) * 0.5) * TILE;
        const alongX = dirX(door.dir) === 0;
        const a = alongX ? before.z - z : before.x - x;
        const b = alongX ? bot.pose.z - z : bot.pose.x - x;
        if (a * b >= 0) continue;
        const t = -a / (b - a);
        const cross = alongX
          ? before.x + (bot.pose.x - before.x) * t - x
          : before.z + (bot.pose.z - before.z) * t - z;
        if (Math.abs(cross) < 0.75) expect(doors.isOpen(door.id)).toBe(true);
      }
    }
    expect(openings).toBeGreaterThan(4);
    expect(bot.completed).toBe(true);
  },
);
