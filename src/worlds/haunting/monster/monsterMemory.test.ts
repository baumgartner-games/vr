import type { RoutineWorld } from '../monsterRoutine';
import type { FloorPoint } from '../stationLayout';
import {
  DRIFT,
  FLOOR,
  FORGET,
  MonsterMemory,
  SCENT_LEAD,
  TRACK_LENGTH,
  doorKey,
  shutPairs,
} from './monsterMemory';

/**
 * Vier Zimmer in einer Reihe und eine Kammer an der Seite:
 *
 * ```
 * a — b — c — d
 *         |
 *         e
 * ```
 *
 * Klein genug, dass jede Erwartung unten nachzurechnen ist, und mit genau
 * einer Verzweigung: `d` hängt nur an `c`, deshalb sperrt eine einzige Tür
 * (`c|d`) den Raum vollständig ab.
 */
const CENTRES: Record<string, FloorPoint> = {
  a: { x: 0, z: 0 },
  b: { x: 10, z: 0 },
  c: { x: 20, z: 0 },
  d: { x: 30, z: 0 },
  e: { x: 20, z: 10 },
};
const LINKS: Record<string, string[]> = {
  a: ['b'],
  b: ['a', 'c'],
  c: ['b', 'd', 'e'],
  d: ['c'],
  e: ['c'],
};
const SPACES = ['a', 'b', 'c', 'd', 'e'];

/** Ein Punkt gehört dem Raum, dessen Mitte am nächsten liegt. */
function nearest(point: FloorPoint): string {
  let best = '';
  let gap = Infinity;
  for (const id of SPACES) {
    const c = CENTRES[id]!;
    const d = Math.hypot(c.x - point.x, c.z - point.z);
    if (d < gap) {
      gap = d;
      best = id;
    }
  }
  return best;
}

const world: RoutineWorld = {
  spaces: SPACES,
  neighbours: (id) => LINKS[id] ?? [],
  centre: (id) => CENTRES[id] ?? { x: 0, z: 0 },
  locker: () => null,
  spaceAt: (point) => nearest(point),
};

/** Dieselbe Station, aber mit fertiger Hörweite — so bringt der `StationGraph` sie mit. */
const heardWorld: RoutineWorld & { earshot(a: string, b: string): number } = {
  ...world,
  earshot: (a, b) => (a === b ? 0 : 1000),
};

function total(memory: MonsterMemory): number {
  return SPACES.reduce((sum, id) => sum + memory.belief(id), 0);
}

/** `seconds` Sekunden in Zehntelschritten — so ruft die Runde `step` auch auf. */
function run(memory: MonsterMemory, seconds: number, here = '', from = 0): number {
  let time = from;
  for (let i = 0; i < Math.round(seconds * 10); i++) {
    time += 0.1;
    memory.step(0.1, here, time);
  }
  return time;
}

describe('MonsterMemory', () => {
  it('fängt ohne Wissen an: jeder Raum gleich wahrscheinlich', () => {
    const memory = new MonsterMemory(world);
    for (const id of SPACES) expect(memory.belief(id)).toBeCloseTo(1 / SPACES.length, 12);
    expect(memory.certainty()).toBeCloseTo(0, 12);
    expect(total(memory)).toBeCloseTo(1, 12);
    expect(memory.track.velocity()).toBeNull();
  });

  it('rechnet zweimal dasselbe: gleiche Eingabe, gleiches Bild', () => {
    const script = (memory: MonsterMemory): void => {
      memory.seen('c', { x: 20, z: 0 }, 1);
      run(memory, 3, 'a', 1);
      memory.heard({ x: 30, z: 0 }, 0.8, 4);
      memory.visited('a', 4.5);
      run(memory, 2, 'b', 4.5);
      memory.seen('d', { x: 31, z: 1 }, 7);
    };
    const one = new MonsterMemory(world);
    const two = new MonsterMemory(world);
    script(one);
    script(two);
    expect(two.snapshot()).toEqual(one.snapshot());
    expect(two.expected()).toEqual(one.expected());
    expect(two.certainty()).toBe(one.certainty());
    expect(two.mostLikely()).toBe(one.mostLikely());
    expect(two.leastRecentlyVisited(5)).toEqual(one.leastRecentlyVisited(5));
    expect(two.track.velocity()).toEqual(one.track.velocity());
  });

  it('nach einer Sichtung ist der Raum sicher', () => {
    const memory = new MonsterMemory(world);
    memory.seen('c', { x: 20, z: 0 }, 5);
    expect(memory.belief('c')).toBe(1);
    expect(memory.belief('b')).toBe(0);
    expect(memory.certainty()).toBe(1);
    expect(memory.mostLikely()).toBe('c');
    expect(memory.expected()).toEqual({ x: 20, z: 0 });
    expect(memory.snapshot()).toEqual([{ roomId: 'c', p: 1 }]);
    expect(memory.note('c').seen).toBe(5);
    expect(memory.note('b').seen).toBe(-Infinity);
  });

  it('die Spur behält höchstens sechs Sichtungen, die jüngste zuletzt', () => {
    const memory = new MonsterMemory(world);
    for (let i = 0; i < 9; i++) memory.seen('a', { x: i, z: 0 }, i);
    expect(memory.track.sightings).toHaveLength(TRACK_LENGTH);
    expect(memory.track.sightings[0]!.time).toBe(3);
    expect(memory.track.sightings[TRACK_LENGTH - 1]!.time).toBe(8);
  });

  it('nach zehn Sekunden liegt Masse in den Nachbarn', () => {
    const memory = new MonsterMemory(world);
    memory.seen('c', { x: 20, z: 0 }, 0);
    run(memory, 10, '', 0);
    expect(memory.belief('c')).toBeLessThan(1);
    for (const id of ['b', 'd', 'e']) expect(memory.belief(id)).toBeGreaterThan(0.05);
    // Der Raum zwei Türen weiter bekommt etwas ab, aber deutlich weniger.
    expect(memory.belief('a')).toBeGreaterThan(0);
    expect(memory.belief('a')).toBeLessThan(memory.belief('b'));
    expect(memory.belief('b')).toBeLessThan(memory.belief('c'));
    // Die beiden Sackgassen sind gleich dran — und nach zehn Sekunden sogar
    // etwas besser als `c` selbst: Der Verteilerraum gibt weiter nach `b` ab,
    // die Kammern haben niemanden, an den sie abgeben könnten.
    expect(memory.belief('d')).toBeCloseTo(memory.belief('e'), 12);
    expect(memory.belief('c')).toBeGreaterThan(1 / SPACES.length);
    expect(total(memory)).toBeCloseTo(1, 12);
    expect(memory.certainty()).toBeGreaterThan(0);
    expect(memory.certainty()).toBeLessThan(1);
  });

  it('hinter eine gesperrte Tür fließt nichts', () => {
    const memory = new MonsterMemory(world, () => ['c|d']);
    memory.seen('c', { x: 20, z: 0 }, 0);
    run(memory, 10, '', 0);
    expect(memory.belief('d')).toBe(0);
    expect(memory.belief('e')).toBeGreaterThan(0);
    expect(total(memory)).toBeCloseTo(1, 12);
    // Auch andersherum geschrieben ist die Tür zu.
    const reverse = new MonsterMemory(world, () => ['d|c']);
    reverse.seen('c', { x: 20, z: 0 }, 0);
    run(reverse, 10, '', 0);
    expect(reverse.belief('d')).toBe(0);
  });

  it('eine Kante trägt DRIFT je Sekunde hinüber', () => {
    const memory = new MonsterMemory(world);
    memory.seen('d', { x: 30, z: 0 }, 0);
    memory.step(1, '', 1);
    // `d` hat genau eine Tür; ein Schritt wird auf MAX_STEP gekappt.
    expect(memory.belief('c')).toBeCloseTo(DRIFT * 0.25, 12);
    expect(memory.belief('d')).toBeCloseTo(1 - DRIFT * 0.25, 12);
  });

  it('ein abgesuchter Raum ist leer, aber nicht ausgeschlossen', () => {
    const memory = new MonsterMemory(world);
    memory.seen('c', { x: 20, z: 0 }, 0);
    run(memory, 10, '', 0);
    const before = memory.belief('c');
    memory.visited('c', 10);
    expect(memory.belief('c')).toBeLessThan(before);
    expect(memory.belief('c')).toBeCloseTo(FLOOR / (1 - before + FLOOR), 12);
    expect(memory.belief('c')).toBeGreaterThan(0);
    expect(memory.mostLikely()).not.toBe('c');
    expect(total(memory)).toBeCloseTo(1, 12);
    expect(memory.note('c').searched).toBe(10);
    expect(memory.note('c').visited).toBe(10);
  });

  it('war die ganze Masse im abgesuchten Raum, fängt das Bild bei den anderen an', () => {
    const memory = new MonsterMemory(world);
    memory.seen('c', { x: 20, z: 0 }, 0);
    memory.visited('c', 1);
    expect(memory.belief('c')).toBeCloseTo(FLOOR, 12);
    for (const id of ['a', 'b', 'd', 'e'])
      expect(memory.belief(id)).toBeCloseTo((1 - FLOOR) / 4, 12);
    expect(total(memory)).toBeCloseTo(1, 12);
  });

  it('wo das Monster steht, schwindet der Glaube von selbst', () => {
    const memory = new MonsterMemory(world);
    memory.seen('c', { x: 20, z: 0 }, 0);
    run(memory, 5, 'c', 0);
    const standing = memory.belief('c');
    const other = new MonsterMemory(world);
    other.seen('c', { x: 20, z: 0 }, 0);
    run(other, 5, '', 0);
    expect(standing).toBeLessThan(other.belief('c'));
    expect(memory.note('c').visited).toBeCloseTo(5, 9);
    // Nur nachgesehen ist noch nicht abgesucht.
    expect(memory.note('c').searched).toBe(-Infinity);
  });

  it('Lärm verschiebt die Masse dorthin, wo es geknallt hat', () => {
    const memory = new MonsterMemory(world);
    memory.heard({ x: 0, z: 0 }, 1, 2);
    expect(memory.mostLikely()).toBe('a');
    expect(memory.belief('a')).toBeGreaterThan(memory.belief('b'));
    expect(memory.belief('b')).toBeGreaterThan(memory.belief('c'));
    expect(memory.belief('d')).toBeGreaterThan(0);
    expect(total(memory)).toBeCloseTo(1, 12);
    expect(memory.note('a').heard).toBe(2);
  });

  it('ein leiser Laut sagt weniger als ein lauter', () => {
    const loud = new MonsterMemory(world);
    const faint = new MonsterMemory(world);
    loud.heard({ x: 0, z: 0 }, 1, 1);
    faint.heard({ x: 0, z: 0 }, 0.1, 1);
    expect(faint.belief('a')).toBeGreaterThan(0.2);
    expect(faint.belief('a')).toBeLessThan(loud.belief('a'));
    expect(faint.certainty()).toBeLessThan(loud.certainty());
  });

  it('bringt die Welt eine Hörweite mit, rechnet das Gedächtnis nicht selbst', () => {
    const memory = new MonsterMemory(heardWorld);
    memory.heard({ x: 20, z: 10 }, 1, 3);
    // 1000 gedämpfte Meter in jeden anderen Raum: Es kann nur `e` gewesen
    // sein — bis auf den Rest, den kein Geräusch je ganz wegnimmt.
    expect(memory.belief('e')).toBeGreaterThan(0.9);
    expect(memory.belief('a')).toBeGreaterThan(0);
    expect(total(memory)).toBeCloseTo(1, 12);
  });

  it('Lärm von außerhalb der Station lässt das Bild in Ruhe', () => {
    const blind: RoutineWorld = { ...world, spaceAt: () => '' };
    const memory = new MonsterMemory(blind);
    memory.seen('c', { x: 20, z: 0 }, 0);
    memory.heard({ x: 999, z: 999 }, 1, 1);
    expect(memory.belief('c')).toBe(1);
  });

  it('nach FORGET Sekunden ohne Spur weiß es wieder nichts', () => {
    const memory = new MonsterMemory(world);
    memory.seen('c', { x: 20, z: 0 }, 0);
    const time = run(memory, FORGET - 1, '', 0);
    expect(memory.certainty()).toBeGreaterThan(0);
    run(memory, 2, '', time);
    for (const id of SPACES) expect(memory.belief(id)).toBeCloseTo(1 / SPACES.length, 12);
    expect(memory.certainty()).toBeCloseTo(0, 12);
  });

  it('Richtung und Tempo aus zwei Sichtungen', () => {
    const memory = new MonsterMemory(world);
    memory.seen('a', { x: 0, z: 0 }, 1);
    expect(memory.track.velocity()).toBeNull();
    memory.seen('b', { x: 10, z: 0 }, 3.5);
    const v = memory.track.velocity()!;
    expect(v.dir.x).toBeCloseTo(1, 12);
    expect(v.dir.z).toBeCloseTo(0, 12);
    expect(v.speed).toBeCloseTo(4, 12);
  });

  it('ältere Sichtungen wiegen weniger als die jüngste', () => {
    const memory = new MonsterMemory(world);
    memory.seen('a', { x: 0, z: 0 }, 0);
    memory.seen('a', { x: 0, z: 2 }, 1);
    memory.seen('b', { x: 2, z: 2 }, 2);
    const v = memory.track.velocity()!;
    // Zuletzt nach +x (2 m/s), davor nach +z (2 m/s), halb gewichtet.
    expect(v.dir.x).toBeGreaterThan(v.dir.z);
    expect(v.dir.x).toBeCloseTo(2 / Math.sqrt(5), 12);
    expect(v.speed).toBeCloseTo((2 * Math.sqrt(5)) / 3, 12);
  });

  it('zwei Sichtungen zur selben Zeit ergeben kein Tempo', () => {
    const memory = new MonsterMemory(world);
    memory.seen('a', { x: 0, z: 0 }, 4);
    memory.seen('b', { x: 10, z: 0 }, 4);
    expect(memory.track.velocity()).toBeNull();
  });

  it('die Türen eines Raums tragen den Zufluss dahinter', () => {
    const memory = new MonsterMemory(world);
    memory.seen('a', { x: 0, z: 0 }, 0);
    const exits = memory.exits('c');
    expect(exits[0]).toEqual({ door: doorKey('c', 'b'), share: 1 });
    expect(exits.map(({ door }) => door)).toEqual(['b|c', 'c|d', 'c|e']);
    expect(exits.reduce((sum, exit) => sum + exit.share, 0)).toBeCloseTo(1, 12);
    // `a` liegt hinter `b`, wird also der Tür nach `b` zugerechnet.
    memory.seen('e', { x: 20, z: 10 }, 1);
    expect(memory.exits('c')[0]!.door).toBe(doorKey('c', 'e'));
  });

  it('gesperrte Türen stehen nicht in der Ausgangsliste', () => {
    const memory = new MonsterMemory(world, () => ['c|d']);
    const doors = memory.exits('c').map(({ door }) => door);
    expect(doors).toEqual(['b|c', 'c|e']);
    expect(memory.exits('kombüse')).toEqual([]);
  });

  it('ohne Wissen teilen sich die Türen den Zufluss zu gleichen Teilen', () => {
    const memory = new MonsterMemory(world);
    memory.visited('a', 0);
    memory.visited('b', 0);
    memory.visited('d', 0);
    memory.visited('e', 0);
    memory.seen('c', { x: 20, z: 0 }, 0);
    // Hinter keiner Tür von `c` liegt Masse — dann ist keine Tür besser.
    for (const exit of memory.exits('c')) expect(exit.share).toBeCloseTo(1 / 3, 12);
  });

  it('leastRecentlyVisited ordnet nach dem letzten Besuch', () => {
    const memory = new MonsterMemory(world);
    memory.visited('c', 3);
    memory.visited('a', 1);
    memory.visited('e', 7);
    expect(memory.leastRecentlyVisited(3)).toEqual(['b', 'd', 'a']);
    expect(memory.leastRecentlyVisited(5)).toEqual(['b', 'd', 'a', 'c', 'e']);
    expect(memory.leastRecentlyVisited(0)).toEqual([]);
    expect(memory.leastRecentlyVisited(99)).toHaveLength(SPACES.length);
  });

  it('der Notizzettel gehört dem Gedächtnis', () => {
    const memory = new MonsterMemory(world);
    memory.visited('a', 2);
    const note = memory.note('a');
    note.visited = 999;
    expect(memory.note('a').visited).toBe(2);
    expect(memory.note('kombüse')).toEqual({
      visited: -Infinity,
      searched: -Infinity,
      seen: -Infinity,
      heard: -Infinity,
    });
  });

  it('der Glaube summiert sich immer zu eins', () => {
    const memory = new MonsterMemory(world, () => ['b|c']);
    let time = 0;
    const check = (): void => expect(total(memory)).toBeCloseTo(1, 12);
    memory.seen('a', { x: 0, z: 0 }, time);
    check();
    time = run(memory, 4, 'a', time);
    check();
    memory.visited('a', time);
    check();
    memory.heard({ x: 30, z: 0 }, 0.5, time);
    check();
    time = run(memory, FORGET + 5, 'b', time);
    check();
    memory.seen('e', { x: 20, z: 10 }, time);
    memory.visited('e', time);
    check();
    time = run(memory, 20, 'e', time);
    check();
    for (const id of SPACES) expect(memory.belief(id)).toBeGreaterThanOrEqual(0);
  });

  it('eine Tür heißt nach ihren beiden Räumen, sortiert', () => {
    expect(doorKey('c', 'b')).toBe('b|c');
    expect(doorKey('b', 'c')).toBe('b|c');
  });
});

/**
 * **Der Aufruhr** — das Ereignis, das die Station selbst macht.
 *
 * Eine fertige Reparatur ist kein stiller Haken auf einer Liste: Die Konsole
 * fährt hoch, die Sicherung fällt, im Modul flackert das Licht. Dass das
 * Monster daraufhin weiß, wo eben jemand stand, ist kein Hellsehen. Dass es
 * daraus eine **Laufrichtung** ableitete, wäre eines — deshalb steht der
 * Aufruhr nicht in der Spur.
 */
describe('Eine erledigte Reparatur ist ein Ereignis', () => {
  it('legt die ganze Masse in den Raum, ohne eine Sichtung zu erfinden', () => {
    const memory = new MonsterMemory(world);
    memory.disturbed('d', CENTRES.d!, 12);
    expect(memory.belief('d')).toBeCloseTo(1, 12);
    expect(memory.mostLikely()).toBe('d');
    expect(memory.certainty()).toBeCloseTo(1, 12);
    // Gemerkt, nicht gesehen: Die Spur bleibt leer, also gibt es keine
    // Richtung und keine erfundene Prognose.
    expect(memory.track.sightings).toHaveLength(0);
    expect(memory.track.velocity()).toBeNull();
    expect(memory.note('d').seen).toBe(-Infinity);
    expect(memory.note('d').heard).toBe(12);
  });

  it('hält das Vergessen auf wie eine Sichtung', () => {
    const memory = new MonsterMemory(world);
    memory.disturbed('e', CENTRES.e!, 0);
    memory.step(1, 'a', 1);
    expect(memory.belief('e')).toBeGreaterThan(0.8);
    memory.step(1, 'a', FORGET + 2);
    expect(memory.certainty()).toBeLessThan(0.01);
  });

  it('rettet einen fremd benannten Raum über den Punkt', () => {
    const memory = new MonsterMemory(world);
    memory.seen('c', CENTRES.c!, 0);
    // Der Aufrufer nennt den Raum anders, als die Karte ihn kennt — dann
    // entscheidet die Stelle, genau wie bei einer Sichtung.
    memory.disturbed('kombüse', { x: 21, z: 9 }, 5);
    expect(memory.mostLikely()).toBe('e');
  });
});

describe('Aus Türkennungen Raumpaare machen', () => {
  const doors = [
    { id: 'd0', a: 'a', b: 'b' },
    { id: 'd1', a: 'c', b: 'd' },
    { id: 'd2', a: 'a', b: null },
  ];

  it('übersetzt gesperrte Türen in die Namen des Gedächtnisses', () => {
    expect(shutPairs(doors, ['d1'])).toEqual([doorKey('c', 'd')]);
    expect(shutPairs(doors, [])).toEqual([]);
    expect(shutPairs(doors, ['gibtesnicht'])).toEqual([]);
  });

  it('hängt die Haustür an die Einsatzzentrale', () => {
    expect(shutPairs(doors, ['d2'])).toEqual([doorKey('a', 'command')]);
    expect(shutPairs(doors, ['d2'], 'draußen')).toEqual([doorKey('a', 'draußen')]);
  });

  it('sperrt über die Übersetzung wirklich eine Tür', () => {
    const closed: string[] = [];
    const memory = new MonsterMemory(world, () => closed);
    expect(memory.exits('c').map(({ door }) => door)).toContain(doorKey('c', 'd'));
    closed.push(...shutPairs(doors, ['d1']));
    expect(memory.exits('c').map(({ door }) => door)).not.toContain(doorKey('c', 'd'));
  });
});

describe('Eine Blutspur auf dem Boden', () => {
  /** Ein Tropfen dicht an der Grenze zwischen `b` und `c`, damit `SCENT_LEAD` hinüberreicht. */
  const drop = { x: 14, z: 0 };

  it('glaubt den Verfolgten dort, wohin die Spur zeigt — nicht dort, wo sie liegt', () => {
    const memory = new MonsterMemory(world);
    expect(nearest(drop)).toBe('b');
    expect(nearest({ x: drop.x + SCENT_LEAD, z: 0 })).toBe('c');
    memory.tracked('b', drop, { x: 1, z: 0 }, 1, 10);
    expect(memory.mostLikely()).toBe('c');
    expect(memory.belief('c')).toBeCloseTo(1, 6);
  });

  it('bleibt ohne Richtung bei dem Raum, in dem der Tropfen liegt', () => {
    const memory = new MonsterMemory(world);
    memory.tracked('b', drop, null, 1, 10);
    expect(memory.mostLikely()).toBe('b');
  });

  /**
   * Der eigentliche Unterschied zu einer Sichtung: Blut **schiebt** den
   * Glauben, es ersetzt ihn nicht. Bei voller Gewissheit wäre ein Treffer der
   * Anfang vom Ende der Runde.
   */
  it('mischt sich nach `trust` in das bisherige Bild', () => {
    const memory = new MonsterMemory(world);
    const before = memory.belief('c');
    memory.tracked('b', drop, { x: 1, z: 0 }, 0.5, 10);
    expect(memory.belief('c')).toBeCloseTo(0.5 + 0.5 * before, 6);
    expect(memory.belief('a')).toBeCloseTo(0.5 * before, 6);
  });

  it('lässt bei `trust` 0 alles, wie es war', () => {
    const memory = new MonsterMemory(world);
    memory.tracked('b', drop, { x: 1, z: 0 }, 0, 10);
    expect(memory.belief('c')).toBeCloseTo(0.2, 6);
  });

  /** Ein Raumname, den das Gedächtnis nicht kennt, wird über den Ort gerettet — wie bei `seen`. */
  it('rettet einen fremden Raumnamen über die Stelle', () => {
    const memory = new MonsterMemory(world);
    memory.tracked('zimmer 3', drop, null, 1, 10);
    expect(memory.mostLikely()).toBe('b');
  });

  /** Und eine Welt ohne Ortsauskunft lässt das Bild ganz in Ruhe. */
  it('kommt ohne `spaceAt` gar nicht erst zum Zug', () => {
    const blind: RoutineWorld = { ...world, spaceAt: undefined };
    const memory = new MonsterMemory(blind);
    memory.tracked('zimmer 3', drop, null, 1, 10);
    expect(memory.belief('b')).toBeCloseTo(0.2, 6);
  });

  /**
   * Eine Fährte ist keine Sichtung: Käme sie in die Spur, rechnete die
   * Abfangrechnung aus einem dreißig Sekunden alten Tropfen eine
   * Fahrtrichtung samt Tempo.
   */
  it('schreibt nichts in die Spur der Sichtungen', () => {
    const memory = new MonsterMemory(world);
    memory.tracked('b', drop, { x: 1, z: 0 }, 1, 10);
    expect(memory.track.sightings).toHaveLength(0);
    expect(memory.track.velocity()).toBeNull();
    // Notiert wird sie trotzdem — unter „gehört", wo die Wahrheit steht.
    expect(memory.note('c').heard).toBe(10);
    expect(memory.note('c').seen).toBe(-Infinity);
  });
});
