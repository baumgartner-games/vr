import { generateHouse } from './house';
import { freshCrew, STATION_PROTOCOL } from './mission';
import { freshGhosts } from './rules/ghosts';
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
      ghosts: {
        monster: { x: -8, z: 3.5, yaw: 1.1, since: 4 },
        technician: { x: 12, z: -30, yaw: -2, since: 9 },
      },
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

  /**
   * **Die liegengelassenen Ersatzteile** (`rules/archiveGoals.ts`) sind ein
   * *optionales* Feld: Ein Gerät, das sie nicht kennt, soll weiterspielen und
   * nicht ausgesperrt werden — `STATION_PROTOCOL` bleibt deshalb 8.
   */
  it('trägt liegengelassene Ersatzteile mit und verzeiht einen Stand ohne sie', () => {
    const lying = { ...state(), dropped: [{ id: 't1', x: 3.5, z: -12, since: 40 }] };
    const replay = readState(JSON.parse(JSON.stringify(stateMessage(lying))))!;
    expect(replay.dropped).toEqual(lying.dropped);
    // Ohne das Feld liegt eben nichts.
    expect(readState(wireOf())!.dropped).toEqual([]);
    // Und Unsinn wird zurechtgestutzt oder fällt weg.
    const odd = readState({
      ...wireOf(),
      dropped: ['t0', { x: 1, z: 2 }, { id: 't2', x: 1e9, z: 'weit', since: 'gleich' }],
    })!;
    expect(odd.dropped).toEqual([{ id: 't2', x: 1000, z: 0, since: 0 }]);
  });

  it('weist alte Protokolle ab', () => {
    expect(readState(wireOf())).not.toBeNull();
    expect(readState({ ...wireOf(), version: STATION_PROTOCOL - 1 })).toBeNull();
  });

  /**
   * Die Ghost-Marker (`rules/ghosts.ts`) sind das, woran beide Seiten sich
   * erinnern — sie müssen den Weg über die Leitung genau so überstehen, wie
   * sie gesetzt wurden, sonst zeigt jedes Gerät auf eine andere Stelle.
   */
  it('trägt die zuletzt gesehenen Stellen unverändert mit', () => {
    const replay = readState(JSON.parse(JSON.stringify(stateMessage(state()))))!;
    expect(replay.ghosts).toEqual(state().ghosts);
  });

  it('macht aus einem Stand ohne Marker einen leeren, nicht einen kaputten', () => {
    const { ghosts, ...without } = wireOf();
    expect(ghosts).toBeDefined();
    expect(readState(without)!.ghosts).toEqual(freshGhosts());
    expect(readState({ ...wireOf(), ghosts: 'keine' })!.ghosts).toEqual(freshGhosts());
    // Eine Seite kann fehlen, ohne die andere mitzureißen.
    const half = readState({ ...wireOf(), ghosts: { technician: null } })!;
    expect(half).toMatchObject({ ghosts: { monster: null, technician: null } });
    // Und Unsinn im Marker wird auf Meter und Zahlen zurechtgestutzt.
    const odd = readState({
      ...wireOf(),
      ghosts: { monster: { x: 1e9, z: 'weit', yaw: NaN, since: '4' }, technician: null },
    })!;
    expect(odd.ghosts.monster).toEqual({ x: 1000, z: 0, yaw: 0, since: 0 });
  });
});
