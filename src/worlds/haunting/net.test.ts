import { generateHouse } from './house';
import { freshCrew, STATION_PROTOCOL } from './mission';
import {
  monsterMessage,
  readMonsterInput,
  readState,
  stateMessage,
  type HauntState,
  type MonsterNetInput,
} from './net';

/**
 * **Alles, was hereinkommt, ist fremder Text.** Die Leser geben `null`
 * zurück oder begrenzte Werte — nie ein halb gefülltes Objekt, dem der
 * Gastgeber dann vertraut.
 */
describe('Die Nachricht der Monster-Station', () => {
  const input: MonsterNetInput = { x: 0.4, z: -0.9, sprint: true, attack: 3, interact: 7, vent: 1 };

  it('überlebt den Weg über die Leitung unverändert', () => {
    const wire = JSON.parse(JSON.stringify(monsterMessage(input))) as unknown;
    expect(readMonsterInput(wire)).toEqual(input);
  });

  it('gibt bei Unsinn null zurück', () => {
    expect(readMonsterInput(null)).toBeNull();
    expect(readMonsterInput('monster')).toBeNull();
    expect(readMonsterInput({ kind: 'drone', x: 1 })).toBeNull();
    expect(readMonsterInput({ x: 1, z: 1, attack: 1 })).toBeNull();
  });

  it('begrenzt den Stock und macht aus den Knöpfen ganze, nie negative Zähler', () => {
    const read = readMonsterInput({
      kind: 'monster',
      x: 7,
      z: -5,
      sprint: 'ja',
      attack: 2.9,
      interact: -4,
      vent: NaN,
    })!;
    expect(read.x).toBe(1);
    expect(read.z).toBe(-1);
    expect(read.sprint).toBe(false);
    expect(read.attack).toBe(2);
    expect(read.interact).toBe(0);
    expect(read.vent).toBe(0);
    // Eine Zielnummer jenseits jeder Klappe ist ein Tippfehler, kein Ziel.
    expect(readMonsterInput({ kind: 'monster', vent: 1e12 })!.vent).toBe(15);
    // Unendlich ist keine Zahl, sondern ein Stock in Ruhe.
    expect(readMonsterInput({ kind: 'monster', x: -Infinity, attack: Infinity })).toMatchObject({
      x: 0,
      attack: 0,
    });
    expect(readMonsterInput({ kind: 'monster' })).toEqual({
      x: 0,
      z: 0,
      sprint: false,
      attack: 0,
      interact: 0,
      vent: 0,
    });
  });
});

describe('Der Stand mit Techniker, Fahrt und Kabinen', () => {
  function state(): HauntState {
    const spec = generateHouse(77, 14);
    return {
      seed: spec.seed,
      crew: freshCrew(),
      phase: 'running',
      time: 12,
      monsterOn: true,
      monster: { x: 4, z: -20 },
      shut: ['d1'],
      lit: ['r1'],
      loud: [],
      fuse: false,
      taken: [],
      done: [],
      destroyed: ['r3'],
      technician: { x: 2.5, z: -17.5, yaw: 0.7, moving: true },
      ride: 'riding',
    };
  }

  it('trägt den 2D-Techniker und die Phase der Fahrt mit', () => {
    const replay = readState(JSON.parse(JSON.stringify(stateMessage(state()))))!;
    expect(replay.technician).toEqual({ x: 2.5, z: -17.5, yaw: 0.7, moving: true });
    expect(replay.ride).toBe('riding');
    expect(replay.destroyed).toEqual(['r3']);
  });

  /** Die Nachricht, wie sie auf der Leitung liegt — zum Verfälschen. */
  function wireOf(): Record<string, unknown> {
    return stateMessage(state()) as Record<string, unknown>;
  }

  it('lässt einen Techniker im Headset ohne Stelle und liest eine fremde Phase als draußen', () => {
    const wire = { ...wireOf(), technician: null, ride: 'flying' };
    const replay = readState(wire)!;
    expect(replay.technician).toBeNull();
    expect(replay.ride).toBe('out');
    // Unsinn im Techniker: begrenzte Meter, kein Gehen.
    const odd = readState({
      ...wire,
      technician: { x: 1e9, z: 'weit', yaw: 1, moving: 'ja' },
    })!;
    expect(odd.technician).toEqual({ x: 1000, z: 0, yaw: 1, moving: false });
  });

  it('weist alte Protokolle ab', () => {
    expect(readState({ ...wireOf(), version: STATION_PROTOCOL - 1 })).toBeNull();
  });
});
