import { generateHouse, spacesOf } from './house';
import { freshCrew, ROOM_COUNTS, stationOptions } from './mission';
import { readState, stateMessage, type HauntState } from './net';
import { freshGhosts } from './rules/ghosts';
import { TRAINING_DOOR } from './trainingLayout';

test.each(ROOM_COUNTS)(
  '%i-room snapshots retain every passage, door and collected tool',
  (rooms) => {
    for (const seed of [1, 391, 99999]) {
      const spec = generateHouse(seed, rooms);
      const crew = freshCrew(stationOptions({ rooms }));
      crew.inventory = [
        'radar',
        'xray',
        'medkit',
        ...spec.rooms.map((room) => `cargo-${room.id}`),
        ...spec.tasks.map((task) => task.id),
      ];
      crew.opened = spec.rooms.map((room) => `cargo-${room.id}`);
      crew.hidden = spec.rooms.at(-1)!.id;
      const state: HauntState = {
        seed,
        crew,
        phase: 'running',
        time: 20,
        monsterOn: true,
        monster: { x: -45, z: -65 },
        shut: [...spec.doors.map((door) => door.id), TRAINING_DOOR.id],
        lit: spacesOf(spec).map((space) => space.id),
        loud: spacesOf(spec).map((space) => space.id),
        fuse: false,
        taken: spec.tasks.map((task) => task.id),
        done: spec.tasks.map((task) => task.id),
        destroyed: spec.rooms.slice(0, 2).map((room) => room.id),
        technician: { x: 3.5, z: -12.25, yaw: 1.2, moving: true },
        ride: 'arrived',
        ghosts: freshGhosts(),
      };
      const replay = readState(JSON.parse(JSON.stringify(stateMessage(state))))!;
      expect(replay.shut).toEqual(state.shut);
      expect(replay.lit).toEqual(state.lit);
      expect(replay.loud).toEqual(state.loud);
      expect(replay.taken).toEqual(state.taken);
      expect(replay.done).toEqual(state.done);
      expect(replay.destroyed).toEqual(state.destroyed);
      expect(replay.technician).toEqual(state.technician);
      expect(replay.ride).toBe('arrived');
      expect(replay.crew.inventory).toEqual(crew.inventory);
      expect(replay.crew.opened).toEqual(crew.opened);
      expect(replay.crew.hidden).toBe(crew.hidden);
      expect(replay.monster).toEqual(state.monster);
      expect(generateHouse(replay.seed, replay.crew.options.rooms)).toEqual(spec);
    }
  },
);
