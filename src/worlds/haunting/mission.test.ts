import { generateHouse, roomCentre } from './house';
import { housePlan } from './plan';
import {
  freshCrew,
  lockerCode,
  puzzleFor,
  puzzleSolved,
  readCrew,
  repairsFor,
  ROOM_COUNTS,
  STATION_PROTOCOL,
  stationOptions,
  stepVitals,
  takeCrewHit,
  ventPairs,
} from './mission';
import { readState, stateMessage, type HauntState } from './net';
import { DIRS, tileKey } from '../nav/navTile';

describe('Orbital missions', () => {
  test.each(ROOM_COUNTS)(
    '%i rooms: deterministic, connected, with three distinct repair rooms and real loot',
    (rooms) => {
      for (let seed = 1; seed <= 100; seed++) {
        const spec = generateHouse(seed, rooms);
        expect(spec.rooms).toHaveLength(rooms);
        expect(spec).toEqual(generateHouse(seed, rooms));
        const repairs = repairsFor(spec);
        expect(new Set(repairs.map((r) => r.roomId)).size).toBe(3);
        for (const repair of repairs) {
          expect(spec.rooms.some((r) => r.id === repair.roomId)).toBe(true);
          expect(spec.tasks.some((t) => t.id === repair.itemId)).toBe(true);
          expect(repair.code).toMatch(/^[1-4]{3}$/);
        }
        // Room topology, including emergency access from the protected deck.
        const seen = new Set([spec.entryRoom]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const d of spec.doors)
            if (d.b && (seen.has(d.a) || seen.has(d.b))) {
              if (!seen.has(d.a) || !seen.has(d.b)) changed = true;
              seen.add(d.a);
              seen.add(d.b);
            }
        }
        expect(seen.size).toBe(rooms);
        for (const r of spec.rooms)
          expect(
            spec.doors.filter((d) => d.a === r.id || d.b === r.id).length,
          ).toBeGreaterThanOrEqual(2);
        const plan = housePlan(spec);
        for (const r of spec.rooms) {
          const c = roomCentre(r);
          const tile = tileKey(Math.floor(c.x), Math.floor(c.z));
          expect(plan.graph.has(tile)).toBe(true);
        }
      }
    },
  );

  test('all three puzzle types have an actual solution and reject incorrect inputs', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const crew = freshCrew();
      for (const r of repairsFor(generateHouse(seed, 8))) {
        const p = puzzleFor(crew, r.id);
        expect(puzzleSolved(r, p)).toBe(false);
        p.open = true;
        if (r.puzzle === 'wires') {
          p.links = [0, 1, 2, 3].map((i) => r.order.indexOf(i));
        } else if (r.puzzle === 'sequence') p.links = [...r.code].map(Number);
        else p.digits = [...r.code].map(Number);
        expect(puzzleSolved(r, p)).toBe(true);
        if (r.puzzle === 'tune') p.digits[0] = 0;
        else p.links[0] = -1;
        expect(puzzleSolved(r, p)).toBe(false);
      }
    }
  });

  test('three spaced hits lose the round; holding contact cannot kill in one frame', () => {
    const c = freshCrew();
    expect(takeCrewHit(c, true)).toBe(true);
    expect(c.hp).toBe(2);
    for (let n = 0; n < 29; n++) {
      stepVitals(c, 0.1, 0, 1);
      expect(takeCrewHit(c, true)).toBe(false);
    }
    for (let n = 0; n < 2; n++) stepVitals(c, 0.1, 0, 1);
    expect(takeCrewHit(c, true)).toBe(true);
    expect(c.hp).toBe(1);
    for (let n = 0; n < 31; n++) stepVitals(c, 0.1, 0, 1);
    expect(takeCrewHit(c, true)).toBe(true);
    expect(c.hp).toBe(0);
    expect(takeCrewHit(c, true)).toBe(false);
  });

  test('test mode, hiding, briefing and vent transitions cannot hurt the player', () => {
    const c = freshCrew();
    c.options.test = true;
    for (let n = 0; n < 100; n++) {
      stepVitals(c, 0.1, 0, 0);
      expect(takeCrewHit(c, true)).toBe(false);
    }
    expect(c.hp).toBe(3);
    expect(c.pulse).toBe(72);
    c.options.test = false;
    c.hidden = 'r2';
    expect(takeCrewHit(c, true)).toBe(false);
    c.hidden = '';
    expect(takeCrewHit(c, false)).toBe(false);
    c.venting = 2;
    expect(takeCrewHit(c, true)).toBe(false);
  });

  test('running fog recovers, proximity affects the simulated pulse, not a medical reading', () => {
    const c = freshCrew();
    for (let i = 0; i < 100; i++) stepVitals(c, 0.1, 5, Infinity);
    expect(c.exertion).toBe(1);
    expect(c.pulse).toBe(110);
    for (let i = 0; i < 70; i++) stepVitals(c, 0.1, 0, 0);
    expect(c.exertion).toBe(0);
    expect(c.pulse).toBe(130);
    stepVitals(c, NaN, NaN, NaN);
    expect(Number.isFinite(c.pulse)).toBe(true);
  });

  test.each(ROOM_COUNTS)(
    'vents only connect physically adjacent rooms on a %i-room station',
    (rooms) => {
      const spec = generateHouse(937, rooms);
      for (const v of ventPairs(spec)) {
        const a = spec.rooms.find((r) => r.id === v.a)!.rect;
        const b = spec.rooms.find((r) => r.id === v.b)!.rect;
        expect(v.a).not.toBe(v.b);
        expect(v.dir === 1 ? a.x + a.w === b.x : a.z + a.d === b.z).toBe(true);
        expect(v.a).not.toBe('van');
        expect(v.b).not.toBe('van');
      }
      expect(ventPairs(spec).length).toBeGreaterThan(0);
      const plan = housePlan(spec, new Set(), true);
      expect(plan.graph.wall(tileKey(2, 4), DIRS[3]!)?.open).toBe(true);
      expect(housePlan(spec).graph.wall(tileKey(2, 4), DIRS[3]!)?.open).toBe(false);
    },
  );

  test('a late peer receives gear, wounds, puzzle progress and the safety setting', () => {
    const c = freshCrew();
    c.hp = 2;
    c.inventory = ['radar', 'cargo-r1'];
    c.opened = ['cargo-r1'];
    puzzleFor(c, 'engine').links = [2, 3];
    c.options.rooms = 12;
    const state: HauntState = {
      crew: c,
      seed: 11,
      phase: 'running',
      time: 10,
      monsterOn: true,
      monster: { x: 2, z: 3 },
      shut: ['d1'],
      lit: ['r1'],
      loud: [],
      fuse: false,
      taken: ['t0'],
      done: [],
    };
    const roundTrip = readState(stateMessage(state))!;
    expect(roundTrip.crew.hp).toBe(2);
    expect(roundTrip.crew.inventory).toEqual(c.inventory);
    expect(roundTrip.crew.puzzles.engine!.links).toEqual([2, 3]);
    expect(roundTrip.crew.options.rooms).toBe(12);
    expect(readState({ kind: 'state', ...state })).toBeNull();
    expect(
      readState({ ...state, kind: 'state', version: STATION_PROTOCOL, seed: Infinity }),
    ).toBeNull();
    expect(readState({ ...state, kind: 'state', version: 2 })).toBeNull();
  });

  test('malformed network values stay bounded; test snapshots are always harmless', () => {
    const c = readCrew({
      hp: NaN,
      exertion: Infinity,
      pulse: -800,
      options: { test: true, rooms: Infinity },
      hidden: 'r2',
      inventory: Array(100).fill('x'),
      puzzles: { engine: { links: [Infinity, -55, 3, 4, 8] } },
    });
    expect(c.hp).toBe(3);
    expect(c.hidden).toBe('');
    expect(c.exertion).toBe(0);
    expect(c.inventory.length).toBeLessThanOrEqual(32);
    expect(c.puzzles.engine!.links).toEqual([-1, -1, 3, 4]);
    expect(stationOptions({ rooms: 10000 }).rooms).toBe(12);
    expect(lockerCode(31, 'r1')).toMatch(/^[1-4]{3}$/);
    expect(lockerCode(31, 'r1')).toBe(lockerCode(31, 'r1'));
  });
});
