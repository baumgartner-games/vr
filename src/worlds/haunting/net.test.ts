import { generateHouse } from './house';
import { freshSpook } from './haunt';
import { freshCrew, STATION_PROTOCOL } from './mission';
import type { RoomNote } from './monster/monsterMemory';
import { freshGhosts } from './rules/ghosts';
import { freshLocks } from './rules/doorLocks';
import { freshLamps } from './rules/lamps';
import {
  handoverMessage,
  loadMemory,
  monsterMessage,
  packMemory,
  pickGameHost,
  readHandover,
  readMonsterInput,
  readState,
  stateMessage,
  type HauntBooks,
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
      blood: [
        { x: 1, z: -2, since: 3 },
        { x: 2.5, z: -2, since: 4 },
      ],
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

  /**
   * **Die Blutspur ist ein optionales Feld ohne Versionssprung** (`rules/blood.ts`).
   * An ihr hängt beim Empfänger keine Regel — er malt sie nur. Ein Gerät ohne
   * sie sieht keine Tropfen und spielt dieselbe Runde; deshalb bleibt
   * `STATION_PROTOCOL` stehen, wo es steht.
   */
  it('trägt die Blutspur mit und kommt auch ohne sie aus', () => {
    const replay = readState(JSON.parse(JSON.stringify(stateMessage(state()))))!;
    expect(replay.blood).toEqual(state().blood);
    const { blood, ...without } = wireOf();
    expect(blood).toBeDefined();
    expect(readState(without)!.blood).toEqual([]);
    expect(readState({ ...wireOf(), blood: 'viel' })!.blood).toEqual([]);
    // Und Unsinn im Tropfen wird auf Meter und Zahlen zurechtgestutzt.
    const odd = readState({ ...wireOf(), blood: [{ x: 1e9, z: 'weit', since: null }] })!;
    expect(odd.blood).toEqual([{ x: 1000, z: 0, since: 0 }]);
  });
});

/**
 * **Gastgeber ist, wer Techniker ist.** Die Regel hieß lange „der VR-Spieler",
 * weil es den Techniker nur dort gab; seit er auch am Desktop und auf der
 * Karte von oben spielt — und seit er **mitten in der Runde** zwischen beiden
 * wechseln darf —, hängt sie an der Rolle und nicht an der Ansicht.
 */
describe('pickGameHost', () => {
  it('gibt die Runde dem Techniker, auch wenn ein anderer länger da ist', () => {
    expect(
      pickGameHost([
        { id: 'zuschauer', seniority: 900 },
        { id: 'techniker', seniority: 3, technician: true },
      ]),
    ).toBe('techniker');
  });

  it('macht zwischen Brille, Desktop und Karte von oben keinen Unterschied', () => {
    // Drei Ansichten, eine Rolle: Entschieden wird unter ihnen wieder über die
    // Standzeit, sonst gäbe es zwei Antworten auf dieselbe Frage.
    const field = [
      { id: 'brille', seniority: 10, technician: true },
      { id: 'desktop', seniority: 40, technician: true },
      { id: 'karte', seniority: 25, technician: true },
    ];
    expect(pickGameHost(field)).toBe('desktop');
    expect(pickGameHost([...field].reverse())).toBe('desktop');
  });

  it('wechselt den Gastgeber, wenn der Techniker wechselt', () => {
    const before = [
      { id: 'a', seniority: 300, technician: true },
      { id: 'b', seniority: 12 },
    ];
    expect(pickGameHost(before)).toBe('a');
    // Dieselben zwei Leute, die Rolle geht an den anderen (das Lobby-Paket
    // lässt das mitten in der Runde zu) — und der Gastgeber geht mit.
    const after = [
      { id: 'a', seniority: 300 },
      { id: 'b', seniority: 12, technician: true },
    ];
    expect(pickGameHost(after)).toBe('b');
  });

  it('fällt ohne jeden Techniker auf die Standzeit zurück', () => {
    expect(
      pickGameHost([
        { id: 'jung', seniority: 2 },
        { id: 'alt', seniority: 200 },
      ]),
    ).toBe('alt');
    expect(pickGameHost([])).toBe('');
  });
});

/**
 * **Die Übergabe** (`handoverMessage`) — die eine Nachricht, die nicht im Takt
 * geht. Sie trägt, was sonst nie über die Leitung geht: Riegel, Lampenbudget,
 * Spuk, Wunde und das Gedächtnis des Monsters. Was davon unterwegs verloren
 * geht, fehlt dem Nachfolger für den Rest der Runde — deshalb wird hier jedes
 * Stück einzeln nachgerechnet.
 */
describe('Die Übergabe an den neuen Gastgeber', () => {
  function state(): HauntState {
    return {
      seed: generateHouse(77, 14).seed,
      crew: freshCrew(),
      phase: 'running',
      time: 96.5,
      monsterOn: true,
      monster: { x: 4, z: -20 },
      shut: ['d1'],
      lit: ['r1'],
      loud: [],
      fuse: false,
      taken: [],
      done: [],
      destroyed: [],
      technician: { x: 2.5, z: -17.5, yaw: 0.7, moving: true },
      ride: 'out',
      ghosts: freshGhosts(),
      blood: [{ x: 1, z: -2, since: 3 }],
    };
  }

  function books(): HauntBooks {
    return {
      locks: {
        chosen: 'd1',
        until: 104,
        slams: [{ id: 'd4', until: 110 }],
        pries: [{ id: 'd4', tries: 2, last: 95 }],
        cooling: [{ id: 'd7', until: 99 }],
      },
      lamps: { on: [{ id: 'r1', until: 130, warned: false }] },
      spook: { room: 'r3', since: 1.5, rest: 4 },
      trail: { until: 120, from: { x: 1, z: -2 }, walked: 0.4 },
      memory: {
        sightings: [{ x: 3, z: -4, time: 90, sprinting: true }],
        searched: [{ id: 'r9', time: 80 }],
      },
    };
  }

  /** Die Nachricht, wie sie auf der Leitung liegt. */
  function wire(): unknown {
    return JSON.parse(JSON.stringify(handoverMessage('neuer', state(), books())));
  }

  it('überlebt den Weg über die Leitung mitsamt der ganzen Buchführung', () => {
    const read = readHandover(wire())!;
    expect(read.to).toBe('neuer');
    expect(read.state.time).toBe(96.5);
    expect(read.state.shut).toEqual(['d1']);
    expect(read.books).toEqual(books());
  });

  it('ist an einen Empfänger gerichtet und nicht an alle', () => {
    // Ohne das Feld nähme sie jeder an — auch ein Telefon, das gar nichts
    // rechnet, und das überschriebe sich seinen frischen Stand mit einem alten.
    expect(readHandover(wire())!.to).toBe('neuer');
    const { to, ...ohne } = wire() as Record<string, unknown>;
    expect(to).toBe('neuer');
    expect(readHandover(ohne)).toBeNull();
  });

  it('weist Unsinn und alte Protokolle ab', () => {
    expect(readHandover(null)).toBeNull();
    expect(readHandover({ kind: 'state' })).toBeNull();
    // Kein lesbarer Stand — dann gibt es auch nichts zu übernehmen.
    expect(readHandover({ kind: 'handover', to: 'neuer', state: { kind: 'state' } })).toBeNull();
    const old = wire() as Record<string, unknown>;
    (old['state'] as Record<string, unknown>)['version'] = STATION_PROTOCOL - 1;
    expect(readHandover(old)).toBeNull();
  });

  it('macht aus einer fehlenden Buchführung eine leere und nicht eine kaputte', () => {
    const { books: _books, ...ohne } = wire() as Record<string, unknown>;
    const read = readHandover(ohne)!;
    expect(read.books.locks).toEqual(freshLocks());
    expect(read.books.lamps).toEqual(freshLamps());
    expect(read.books.spook).toEqual(freshSpook());
    expect(read.books.memory).toEqual({ sightings: [], searched: [] });
    // **Die eine Zahl, die `-Infinity` bleiben muss**: „niemand blutet". Über
    // JSON wird daraus `null`, und eine 0 hieße „blutete bis Sekunde null" —
    // in einer frischen Runde also eine offene Wunde.
    expect(read.books.trail.until).toBe(-Infinity);
    expect(
      readHandover({ ...(wire() as object), books: { trail: { until: null } } })!.books.trail,
    ).toEqual({ until: -Infinity, from: null, walked: 0 });
  });

  it('stutzt Unsinn in der Buchführung auf Zahlen und Meter zurecht', () => {
    const read = readHandover({
      ...(wire() as object),
      books: {
        locks: { chosen: 7, until: 'gleich', slams: 'viele', pries: [{ tries: 2 }] },
        lamps: { on: [{ id: 'r1', until: NaN, warned: 'ja' }, 'r2'] },
        spook: { room: 'r3', since: -5, rest: Infinity },
        trail: { until: 12, from: { x: 1e9, z: 'weit' }, walked: -3 },
        memory: { sightings: [{ x: 1e9, z: 2, time: -4 }], searched: ['r1', { id: 'r2' }] },
      },
    })!;
    expect(read.books.locks).toEqual({
      chosen: '',
      until: 0,
      slams: [],
      pries: [],
      cooling: [],
    });
    expect(read.books.lamps.on).toEqual([{ id: 'r1', until: 0, warned: false }]);
    // Unendlich ist keine Zahl, sondern eine kaputte Uhr: Sie fällt auf null.
    expect(read.books.spook).toEqual({ room: 'r3', since: 0, rest: 0 });
    expect(read.books.trail).toEqual({ until: 12, from: { x: 1000, z: 0 }, walked: 0 });
    expect(read.books.memory.sightings).toEqual([{ x: 1000, z: 2, time: 0, sprinting: false }]);
    expect(read.books.memory.searched).toEqual([{ id: 'r2', time: 0 }]);
  });
});

/**
 * **Das Gedächtnis reist kompakt** — die Spur der letzten Sichtungen und die
 * abgesuchten Räume, mehr nicht. Die Verteilung selbst zerfließt ohnehin je
 * Sekunde; diese zwei Dinge kommen nicht von allein wieder.
 */
describe('packMemory und loadMemory', () => {
  it('packt Spur und abgesuchte Räume ein und lässt das Unendliche weg', () => {
    const notes: Record<string, RoomNote> = {
      r1: { visited: 5, searched: 9, seen: -Infinity, heard: -Infinity },
      r2: { visited: -Infinity, searched: -Infinity, seen: -Infinity, heard: -Infinity },
    };
    const book = packMemory(
      {
        track: { sightings: [{ at: { x: 2, z: 3 }, time: 7, sprinting: true }] },
        note: (room) => notes[room]!,
      },
      ['r1', 'r2'],
    );
    // Ein nie abgesuchter Raum steht nicht in der Nachricht: `-Infinity` über
    // JSON wäre `null`, und ein `null` als Zeitpunkt ist schlimmer als nichts.
    expect(book.searched).toEqual([{ id: 'r1', time: 9 }]);
    expect(book.sightings).toEqual([{ x: 2, z: 3, time: 7, sprinting: true }]);
  });

  it('spielt erst das Abgesuchte und dann die Sichtungen nach', () => {
    // Die Reihenfolge ist die ganze Regel: Ein „hier war niemand" nach der
    // letzten Sichtung löschte genau das Wissen, auf das es ankommt.
    const calls: string[] = [];
    loadMemory(
      {
        seen: (room, _at, time) => calls.push(`seen ${room} ${time}`),
        visited: (room, time) => calls.push(`visited ${room} ${time}`),
      },
      {
        sightings: [{ x: 1, z: 1, time: 30, sprinting: false }],
        searched: [
          { id: 'spaet', time: 20 },
          { id: 'frueh', time: 4 },
        ],
      },
      () => 'r1',
    );
    expect(calls).toEqual(['visited frueh 4', 'visited spaet 20', 'seen r1 30']);
  });

  it('lässt eine Sichtung fallen, zu der sich kein Raum finden lässt', () => {
    const calls: string[] = [];
    loadMemory(
      { seen: (room) => calls.push(room), visited: () => calls.push('v') },
      { sightings: [{ x: 900, z: 900, time: 1, sprinting: false }], searched: [] },
      () => '',
    );
    expect(calls).toEqual([]);
  });
});
