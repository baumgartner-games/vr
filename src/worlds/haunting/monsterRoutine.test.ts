import { DEFAULT_TUNING, type MonsterTuning } from './botTuning';
import {
  MODE_LABELS,
  MonsterRoutine,
  RAGE_STEP,
  RUSH_BOOST,
  paceSpeed,
  type RoutineInput,
  type RoutineOutput,
  type RoutineWorld,
} from './monsterRoutine';
import { MonsterMemory } from './monster/monsterMemory';
import { graphEstimator } from './monster/monsterIntercept';
import type { StationGraph } from './roomGraph';
import type { FloorPoint } from './stationLayout';

/**
 * Eine Karte aus fünf Zimmern in einer Reihe, mit einem Schutzschrank in
 * jedem. Klein genug, dass man in den Erwartungen unten nachzählen kann, wo
 * das Monster gerade steht.
 */
const CENTRES: Record<string, FloorPoint> = {
  a: { x: 0, z: 0 },
  b: { x: 10, z: 0 },
  c: { x: 20, z: 0 },
  d: { x: 30, z: 0 },
  e: { x: 40, z: 0 },
};
const LINKS: Record<string, string[]> = {
  a: ['b'],
  b: ['a', 'c'],
  c: ['b', 'd'],
  d: ['c', 'e'],
  e: ['d'],
};
const world: RoutineWorld = {
  spaces: ['a', 'b', 'c', 'd', 'e'],
  neighbours: (id) => LINKS[id] ?? [],
  centre: (id) => CENTRES[id] ?? { x: 0, z: 0 },
  locker: (id) => ({ x: CENTRES[id]!.x + 2, z: 3 }),
};

function tuned(overrides: Partial<MonsterTuning> = {}): MonsterTuning {
  return { ...DEFAULT_TUNING.monster, ...overrides };
}

/** Eine feste Folge von „Würfen", damit jede Entscheidung nachlesbar ist. */
function rolls(values: number[]): () => number {
  let index = 0;
  return () => values[Math.min(values.length - 1, index++)] ?? 0;
}

function run(
  routine: MonsterRoutine,
  seconds: number,
  input: {
    at: FloorPoint;
    here: string;
    signal?: FloorPoint | null;
    seen?: boolean;
    quarry?: string | null;
    caught?: string;
    rng?: () => number;
    /** Ob das Monster seinem Ziel folgt, statt stehen zu bleiben. */
    follow?: boolean;
  },
): RoutineOutput[] {
  const out: RoutineOutput[] = [];
  for (let t = 0; t < seconds; t += 0.25) {
    const step = routine.step(world, {
      dt: 0.25,
      at: input.at,
      here: input.here,
      signal: input.signal ?? null,
      seen: input.seen ?? false,
      quarry: input.quarry ?? null,
      caught: input.caught ?? '',
      rng: input.rng ?? (() => 0.5),
    });
    out.push(step);
    if (input.follow && step.goal && step.pace !== 'still') Object.assign(input.at, step.goal);
  }
  return out;
}

describe('Was das Monster tut, wenn es niemanden sieht', () => {
  it('geht auf Patrouille und wechselt nach einigen erfolglosen Zielen die Seite', () => {
    const routine = new MonsterRoutine(tuned({ reposition: 2 }));
    const at = { x: 0, z: 0 };
    const first = routine.step(world, {
      dt: 0.25,
      at,
      here: 'a',
      signal: null,
      seen: false,
      quarry: null,
      caught: '',
      rng: () => 0.1,
    });
    expect(first.mode).toBe('patrol');
    expect(first.goal).not.toBeNull();
    // Am Ziel angekommen zählt ein erfolgloser Anlauf; nach zweien geht es
    // auf die andere Seite der Karte — das entfernteste Zimmer von hier.
    let output = first;
    for (let i = 0; i < 4 && output.mode !== 'reposition'; i++) {
      Object.assign(at, output.goal!);
      output = routine.step(world, {
        dt: 0.25,
        at,
        here: 'a',
        signal: null,
        seen: false,
        quarry: null,
        caught: '',
        rng: () => 0.1,
      });
    }
    expect(output.mode).toBe('reposition');
    // Quer über die Karte: das entfernteste Zimmer von dort, wo es steht.
    const farthest = world.spaces
      .map((id) => world.centre(id))
      .reduce((a, b) =>
        Math.hypot(b.x - at.x, b.z - at.z) > Math.hypot(a.x - at.x, a.z - at.z) ? b : a,
      );
    expect(output.goal).toEqual(farthest);
  });

  it('verfolgt, was es sieht, und schleicht dem hinterher, was es nur hört', () => {
    const routine = new MonsterRoutine(tuned());
    const at = { x: 0, z: 0 };
    const seen = run(routine, 0.25, { at, here: 'a', signal: { x: 8, z: 0 }, seen: true })[0]!;
    expect(seen.mode).toBe('hunt');
    expect(seen.pace).toBe('hunt');
    expect(seen.goal).toEqual({ x: 8, z: 0 });
    const heard = run(routine, 0.25, { at, here: 'a', signal: { x: 8, z: 0 }, seen: false })[0]!;
    expect(heard.pace).toBe('walk');
  });
});

describe('Die verlorene Spur', () => {
  /**
   * Der Kern der ganzen Routine: Wer jemanden verliert, weiß nicht, wohin er
   * ist — er **rät**. Mit dem Riecher auf Anschlag rät er richtig, mit dem
   * Riecher auf null nimmt er irgendeinen Nachbarn.
   */
  it('rät den Nachbarraum, in dem der Verfolgte verschwunden ist', () => {
    const routine = new MonsterRoutine(tuned({ guess: 0.9, stakeout: 0, wander: 0 }));
    const at = { x: 10, z: 0 };
    run(routine, 0.25, { at, here: 'b', signal: { x: 10, z: 0 }, seen: true, quarry: 'b' });
    const lost = run(routine, 0.25, {
      at,
      here: 'b',
      quarry: 'c',
      rng: rolls([0.05, 0.9, 0.05]),
    })[0]!;
    expect(lost.mode).toBe('search');
    expect(lost.goal).toEqual(CENTRES.c);
    expect(lost.pace).toBe('stalk');
  });

  it('nimmt bei fehlendem Riecher irgendeinen Nachbarraum', () => {
    const routine = new MonsterRoutine(tuned({ guess: 0.25, stakeout: 0 }));
    const at = { x: 20, z: 0 };
    run(routine, 0.25, { at, here: 'c', signal: { x: 20, z: 0 }, seen: true, quarry: 'c' });
    const lost = run(routine, 0.25, {
      at,
      here: 'c',
      quarry: 'd',
      // Erster Wurf: Riecher versagt. Zweiter: die erste Tür der Liste.
      rng: rolls([0.99, 0.0, 0.99, 0.0]),
    })[0]!;
    expect(lost.mode).toBe('search');
    expect(lost.goal).toEqual(CENTRES.b);
  });

  it('macht beim Absuchen leise Klack-Geräusche und sieht in den Schrank', () => {
    const routine = new MonsterRoutine(tuned({ guess: 0.9, stakeout: 0, locker: 1, search: 6 }));
    const at = { x: 10, z: 0 };
    run(routine, 0.25, { at, here: 'b', signal: { x: 10, z: 0 }, seen: true, quarry: 'b' });
    run(routine, 0.25, { at, here: 'b', quarry: 'c', rng: rolls([0.05, 0.5]) });
    // Angekommen: ab jetzt wird gesucht.
    Object.assign(at, CENTRES.c);
    const frames = run(routine, 6, { at, here: 'c', rng: () => 0.5, follow: true });
    expect(frames.filter((f) => f.cue === 'klack').length).toBeGreaterThan(1);
    expect(frames.some((f) => f.cue === 'sniff')).toBe(true);
    // Erst der Raum, dann die Schranktür — nicht umgekehrt.
    expect(frames.findIndex((f) => f.cue === 'klack')).toBeLessThan(
      frames.findIndex((f) => f.cue === 'sniff'),
    );
    expect(frames.every((f) => f.pace === 'stalk' || f.mode !== 'search')).toBe(true);
  });

  /**
   * **Der Verdachts-Angriff.** Geschnüffelt wird nicht mehr nur geguckt: Eine
   * halbe Sekunde später ist die Kabine hin — ohne dass die Routine weiß, ob
   * jemand drin war, ohne Schrei und ohne Vorsprung. Danach geht die Suche
   * weiter, als wäre nichts gewesen.
   */
  it('reißt beim Schnüffeln die Kabine des verdächtigen Raums auf — ohne Schrei, ohne Vorsprung', () => {
    const routine = new MonsterRoutine(tuned({ guess: 0.9, stakeout: 0, locker: 1, search: 6 }));
    const at = { x: 10, z: 0 };
    run(routine, 0.25, { at, here: 'b', signal: { x: 10, z: 0 }, seen: true, quarry: 'b' });
    run(routine, 0.25, { at, here: 'b', quarry: 'c', rng: rolls([0.05, 0.5]) });
    Object.assign(at, CENTRES.c);
    const frames = run(routine, 6, { at, here: 'c', rng: () => 0.5, follow: true });
    const sniff = frames.findIndex((f) => f.cue === 'sniff');
    expect(sniff).toBeGreaterThan(0);
    const breach = frames.findIndex((f) => f.strike);
    expect(breach).toBeGreaterThan(sniff);
    // Zwischen Schnüffeln und Aufreißen steht es still an der Kabine.
    for (const frame of frames.slice(sniff + 1, breach + 1)) {
      expect(frame.mode).toBe('breach');
      expect(frame.pace).toBe('still');
      expect(frame.goal).toEqual(world.locker('c'));
    }
    const strike = frames[breach]!;
    expect(strike.cue).toBe('breach');
    expect(strike.cabin).toBe('c');
    expect((breach - sniff) * 0.25).toBeLessThanOrEqual(0.75);
    // Genau einmal, und danach wieder Absuchen — kein Schrei, kein Vorsprung.
    expect(frames.filter((f) => f.strike)).toHaveLength(1);
    expect(frames.some((f) => f.cue === 'scream')).toBe(false);
    expect(frames.some((f) => f.mode === 'savour' || f.mode === 'announce')).toBe(false);
    expect(frames[breach + 1]!.mode).toBe('search');
    expect(frames[breach + 1]!.cabin).toBe('');
    // Ohne Schrank im Raum gibt es nichts aufzureißen.
    expect(frames.filter((f) => f.cue === 'sniff')).toHaveLength(1);
  });

  it('nennt die Kabine nur im Bild des Aufreißens und sonst nie', () => {
    const routine = new MonsterRoutine(tuned({ locker: 0, stakeout: 0 }));
    const at = { x: 10, z: 0 };
    run(routine, 0.25, { at, here: 'b', signal: { x: 10, z: 0 }, seen: true, quarry: 'b' });
    const frames = run(routine, 12, { at, here: 'b', quarry: 'c', follow: true });
    expect(frames.every((f) => f.cabin === '' && !f.strike)).toBe(true);
  });

  it('lässt den leeren Raum auch mal stehen und geht gleich weiter', () => {
    const routine = new MonsterRoutine(tuned({ guess: 0.9, stakeout: 0, wander: 1, search: 1 }));
    const at = { x: 10, z: 0 };
    run(routine, 0.25, { at, here: 'b', signal: { x: 10, z: 0 }, seen: true, quarry: 'b' });
    run(routine, 0.25, { at, here: 'b', quarry: 'c', rng: rolls([0.05, 0.5]) });
    Object.assign(at, CENTRES.c);
    const frames = run(routine, 2.5, { at, here: 'c', rng: () => 0.05 });
    const last = frames.at(-1)!;
    expect(last.mode).toBe('search');
    expect(last.goal).not.toEqual(CENTRES.c);
  });

  it('lauert stattdessen manchmal reglos auf', () => {
    const routine = new MonsterRoutine(tuned({ stakeout: 1, search: 4 }));
    const at = { x: 10, z: 0 };
    run(routine, 0.25, { at, here: 'b', signal: { x: 10, z: 0 }, seen: true, quarry: 'b' });
    const lost = run(routine, 0.25, { at, here: 'b', quarry: 'c' })[0]!;
    expect(lost.mode).toBe('stakeout');
    Object.assign(at, lost.goal!);
    expect(run(routine, 0.25, { at, here: 'c' })[0]!.pace).toBe('still');
  });
});

/**
 * **Der Testfall aus dem Auftrag**, Schritt für Schritt: gesehen, wie jemand
 * in die Kabine steigt — hingehen, schreien, aufreißen, stehen bleiben.
 */
describe('Die Kabine, in die jemand geflüchtet ist', () => {
  it('geht hin, kündigt mit einem Schrei an, reißt auf und gewährt Vorsprung', () => {
    const routine = new MonsterRoutine(tuned({ savour: 2 }));
    const at = { x: 0, z: 0 };
    const away = run(routine, 0.25, { at, here: 'a', caught: 'c' })[0]!;
    expect(away.mode).toBe('announce');
    expect(away.goal).toEqual(world.locker('c'));
    expect(away.cue).toBe('');

    Object.assign(at, away.goal!);
    const arrival = run(routine, 0.25, { at, here: 'c', caught: 'c' })[0]!;
    expect(arrival.cue).toBe('scream');
    expect(arrival.pace).toBe('still');

    const frames = run(routine, 2, { at, here: 'c', caught: 'c' });
    const breach = frames.find((f) => f.strike)!;
    expect(breach).toBeDefined();
    expect(breach.cue).toBe('breach');
    expect(breach.cabin).toBe('c');
    expect(frames.filter((f) => f.strike)).toHaveLength(1);

    // Danach steht es und lässt laufen — auch ohne weitere Meldung von außen.
    const savour = run(routine, 1.5, { at, here: 'c' });
    expect(savour.every((f) => f.mode === 'savour' && f.pace === 'still')).toBe(true);
    const after = run(routine, 3, { at, here: 'c' });
    expect(after.at(-1)!.mode).not.toBe('savour');
  });

  it('schreit genau einmal und nicht in jedem Bild', () => {
    const routine = new MonsterRoutine(tuned());
    const at = { ...world.locker('b')! };
    const frames = run(routine, 1.5, { at, here: 'b', caught: 'b' });
    expect(frames.filter((f) => f.cue === 'scream')).toHaveLength(1);
  });
});

it('gibt jeder Haltung einen Namen, den man ansagen kann', () => {
  for (const label of Object.values(MODE_LABELS)) expect(label.length).toBeGreaterThan(3);
});

/**
 * **Dieselbe Routine, aber mit Kopf.**
 *
 * Alles oben läuft auf der kleinen Zusage `RoutineWorld` — fünf Zimmer, keine
 * Türen. Dieser Teil reicht die **ganze** Karte herein (`StationGraph`) und
 * dazu ein Gedächtnis (`monster/monsterMemory.ts`); erst damit gibt es die
 * Rechnung, aus der Abfangen und Lauern entstehen. Die Karte steht von Hand
 * da und nicht gewürfelt: Wer prüfen will, ob das Monster die *richtige* Tür
 * wählt, muss wissen, wo die Türen liegen.
 *
 * ```
 *              nord (10,-5)
 *                |  dNord (10,0)
 *   saal (10,5) —— dOst (20,5) —— ost (25,5) —— dEnde (30,5) —— ende (35,5)
 * ```
 *
 * `ende` hat genau einen Ausgang — der Raum, in dem sich Lauern lohnt.
 */
const PLAN_ROOMS = [
  { id: 'saal', x0: 0, x1: 20, z0: 0, z1: 10 },
  { id: 'nord', x0: 0, x1: 20, z0: -10, z1: 0 },
  { id: 'ost', x0: 20, x1: 30, z0: 0, z1: 10 },
  { id: 'ende', x0: 30, x1: 40, z0: 0, z1: 10 },
] as const;

const PLAN_DOORS = [
  { id: 'dNord', a: 'saal', b: 'nord', at: { x: 10, z: 0 } },
  { id: 'dOst', a: 'saal', b: 'ost', at: { x: 20, z: 5 } },
  { id: 'dEnde', a: 'ost', b: 'ende', at: { x: 30, z: 5 } },
] as const;

function planGraph(): StationGraph {
  const ids = PLAN_ROOMS.map((room) => room.id);
  const centre = (id: string): FloorPoint => {
    const room = PLAN_ROOMS.find((r) => r.id === id);
    return room ? { x: (room.x0 + room.x1) / 2, z: (room.z0 + room.z1) / 2 } : { x: 0, z: 0 };
  };
  const links = new Map<string, string[]>(ids.map((id) => [id, []]));
  const doorsBySpace = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const door of PLAN_DOORS) {
    links.get(door.a)!.push(door.b);
    links.get(door.b)!.push(door.a);
    doorsBySpace.get(door.a)!.push(door.id);
    doorsBySpace.get(door.b)!.push(door.id);
  }
  const cost = new Map<string, number>();
  const key = (a: string, b: string): string => `${a}>${b}`;
  for (const a of ids) for (const b of ids) cost.set(key(a, b), a === b ? 0 : Infinity);
  for (const door of PLAN_DOORS) {
    const span = Math.hypot(
      centre(door.a).x - centre(door.b).x,
      centre(door.a).z - centre(door.b).z,
    );
    cost.set(key(door.a, door.b), span);
    cost.set(key(door.b, door.a), span);
  }
  for (const k of ids)
    for (const a of ids)
      for (const b of ids) {
        const over = cost.get(key(a, k))! + cost.get(key(k, b))!;
        if (over < cost.get(key(a, b))!) cost.set(key(a, b), over);
      }
  return {
    spaces: ids,
    rooms: ids,
    neighbours: (id) => links.get(id) ?? [],
    centre,
    locker: () => null,
    distance: (a, b) => cost.get(key(a, b)) ?? Infinity,
    earshot: (a, b) => cost.get(key(a, b)) ?? Infinity,
    next: (a) => a,
    spaceAt: (point) =>
      PLAN_ROOMS.find(
        (room) =>
          point.x >= room.x0 && point.x < room.x1 && point.z >= room.z0 && point.z < room.z1,
      )?.id ?? '',
    doorsOf: (id) => doorsBySpace.get(id) ?? [],
    doorPoint: (id) => PLAN_DOORS.find((door) => door.id === id)?.at ?? null,
  };
}

/** Das Grundtempo des Verlorenen — dieselbe Zahl wie in `mission.MONSTERS`. */
const BASE = 2.95;

/** Ein Lauf über die große Karte, mit Gedächtnis und Abfangrechnung. */
function think(
  routine: MonsterRoutine,
  graph: StationGraph,
  memory: MonsterMemory,
  seconds: number,
  frame: (t: number) => Partial<RoutineInput> & { at: FloorPoint; here: string },
): RoutineOutput[] {
  const estimator = graphEstimator(graph);
  const out: RoutineOutput[] = [];
  for (let t = 0; t < seconds - 1e-9; t += 0.25) {
    const now = frame(t);
    out.push(
      routine.step(graph, {
        dt: 0.25,
        signal: null,
        seen: false,
        quarry: null,
        caught: '',
        rng: () => 0.5,
        memory,
        estimator,
        base: BASE,
        time: t,
        ...now,
      }),
    );
  }
  return out;
}

describe('Das Monster mit Gedächtnis und Abfangrechnung', () => {
  it('fängt an der Tür ab, statt hinterherzulaufen', () => {
    const graph = planGraph();
    const memory = new MonsterMemory(graph);
    const routine = new MonsterRoutine(tuned({ speed: 1, hunt: 1.5, predict: 1 }));
    // Das Monster steht im Saal dicht an der Osttür; der Techniker läuft
    // quer durch den Saal auf genau diese Tür zu. Hinterherlaufen kostete
    // sieben Sekunden, an der Tür stehen eine.
    const monster = { x: 18, z: 9 };
    const frames = think(routine, graph, memory, 3, (t) => ({
      at: monster,
      here: 'saal',
      signal: { x: 2 + 2.6 * t, z: 5 },
      seen: true,
      quarry: 'saal',
      sprinting: false,
    }));
    const intercept = frames.find((f) => f.mode === 'intercept');
    expect(intercept).toBeDefined();
    expect(intercept!.goal).toEqual({ x: 20, z: 5 });
    expect(intercept!.pace).toBe('hunt');
    // Und die Zuschauer erfahren, warum: Tür, beide Ankunftszeiten.
    expect(intercept!.insight?.intercept?.door).toBe('dOst');
    expect(intercept!.insight!.intercept!.etaMonster).toBeLessThan(
      intercept!.insight!.intercept!.etaPlayer,
    );
  });

  it('lauert an der einzigen Tür des Raums, in dem es ihn vermutet', () => {
    const graph = planGraph();
    const memory = new MonsterMemory(graph);
    const routine = new MonsterRoutine(tuned({ ambush: 1 }));
    const monster = { x: 10, z: 5 };
    // Ein einziges Bild mit Sichtung: Das Glaubensbild sitzt auf `ende`, aber
    // aus einer Sichtung wird keine Richtung — also keine Prognose, also kein
    // Abfangen. Was bleibt, ist die Tür, durch die er wieder herauskommt.
    const frames = think(routine, graph, memory, 0.5, (t) => ({
      at: monster,
      here: 'saal',
      signal: t < 0.25 ? { x: 35, z: 5 } : null,
      seen: t < 0.25,
      quarry: t < 0.25 ? 'ende' : null,
    }));
    const ambush = frames.at(-1)!;
    expect(ambush.mode).toBe('ambush');
    expect(ambush.label).toBe('An der Tür lauern');
    expect(ambush.goal).toEqual({ x: 30, z: 5 });
  });

  it('geht dorthin auf Patrouille, wo es am längsten nicht war', () => {
    const graph = planGraph();
    const memory = new MonsterMemory(graph);
    memory.visited('saal', 100);
    memory.visited('ost', 90);
    const routine = new MonsterRoutine(tuned({ reposition: 8 }));
    const first = think(routine, graph, memory, 0.25, () => ({
      at: { x: 10, z: 5 },
      here: 'saal',
    }))[0]!;
    expect(first.mode).toBe('patrol');
    // `nord` und `ende` hat es nie gesehen, `ost` vor `saal` — der Saal, in
    // dem es steht, kommt gar nicht infrage.
    expect([graph.centre('nord'), graph.centre('ende'), graph.centre('ost')]).toContainEqual(
      first.goal,
    );
  });

  it('wird im Blutrausch schneller, je länger die Jagd hält — und danach wieder langsam', () => {
    const graph = planGraph();
    const memory = new MonsterMemory(graph);
    const routine = new MonsterRoutine(tuned());
    const monster = { x: 10, z: 5 };
    const frames = think(routine, graph, memory, 22, (t) => ({
      at: monster,
      here: 'saal',
      signal: { x: 12, z: 5 + 0.01 * t },
      seen: true,
      quarry: 'saal',
    }));
    expect(frames[0]!.boost).toBe(0);
    expect(frames.at(-1)!.boost).toBeCloseTo(2 * RAGE_STEP, 6);
    // Ein Sichtverlust setzt zurück: Der Vorteil gehört der laufenden Jagd.
    const after = think(routine, graph, memory, 0.5, () => ({ at: monster, here: 'saal' }));
    expect(after.at(-1)!.boost).toBe(0);
  });

  it('legt nach einer erledigten Reparatur ein paar Sekunden los', () => {
    const graph = planGraph();
    const memory = new MonsterMemory(graph);
    const routine = new MonsterRoutine(tuned());
    memory.disturbed('ende', graph.centre('ende'), 0);
    routine.hurry(2);
    const monster = { x: 10, z: 5 };
    const frames = think(routine, graph, memory, 4, () => ({ at: monster, here: 'saal' }));
    expect(frames[0]!.boost).toBeCloseTo(RUSH_BOOST, 6);
    expect(paceSpeed(BASE, tuned(), 'hunt', frames[0]!.boost)).toBeGreaterThan(
      paceSpeed(BASE, tuned(), 'hunt'),
    );
    // Nach zwei Sekunden ist der Schub vorbei — er ist ein Anlauf, kein Ruf.
    expect(frames.at(-1)!.boost).toBe(0);
  });

  it('legt sein Denken offen, sobald ein Gedächtnis dabei ist', () => {
    const graph = planGraph();
    const memory = new MonsterMemory(graph);
    const routine = new MonsterRoutine(tuned());
    const withBrain = think(routine, graph, memory, 0.25, () => ({
      at: { x: 10, z: 5 },
      here: 'saal',
    }))[0]!;
    expect(withBrain.insight?.label).toBe(withBrain.label);
    expect(withBrain.insight!.belief.length).toBeGreaterThan(0);
    // Ohne Gedächtnis bleibt das Feld leer — und die Karte zeichnet nichts.
    const blind = new MonsterRoutine(tuned()).step(world, {
      dt: 0.25,
      at: { x: 0, z: 0 },
      here: 'a',
      signal: null,
      seen: false,
      quarry: null,
      caught: '',
      rng: () => 0.5,
    });
    expect(blind.insight).toBeUndefined();
  });
});
