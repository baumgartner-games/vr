import { TILE } from '../../nav/navTile';
import { COMMAND, stationGraph, type StationGraph } from '../roomGraph';
import { simulationSpec } from '../roundSim';
import type { FloorPoint } from '../stationLayout';
import {
  AMBUSH_MAX,
  graphEstimator,
  plan,
  predictPlayer,
  type MemoryLike,
  type Plan,
  type SightingLike,
  type TrackLike,
} from './monsterIntercept';

/**
 * **Eine Station von Hand statt einer gewürfelten.**
 *
 * Die echten Grundrisse (`house.ts`) sind für diese Rechnung unbrauchbar: Wer
 * prüfen will, ob das Monster die *richtige* Tür wählt, muss wissen, wo die
 * Türen liegen — auf den Zentimeter. Also vier Rechtecke, drei Türen und ein
 * Raum, der an nichts hängt:
 *
 * ```
 *            north (10,-5)
 *              |  dNorth (10,0)
 *   hall (10,5) — dEast (20,5) — east (25,5) — dDead (30,5) — dead (35,5)
 *
 *   void (55,5): kein Ausgang, von nirgends erreichbar
 * ```
 *
 * `dead` hat genau eine Tür — der Raum, in dem sich Lauern lohnt.
 */
interface TestRoom {
  id: string;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

const ROOMS: readonly TestRoom[] = [
  { id: 'hall', x0: 0, x1: 20, z0: 0, z1: 10 },
  { id: 'north', x0: 0, x1: 20, z0: -10, z1: 0 },
  { id: 'east', x0: 20, x1: 30, z0: 0, z1: 10 },
  { id: 'dead', x0: 30, x1: 40, z0: 0, z1: 10 },
  { id: 'void', x0: 50, x1: 60, z0: 0, z1: 10 },
];

const DOORS: ReadonlyArray<{ id: string; a: string; b: string; at: FloorPoint }> = [
  { id: 'dNorth', a: 'hall', b: 'north', at: { x: 10, z: 0 } },
  { id: 'dEast', a: 'hall', b: 'east', at: { x: 20, z: 5 } },
  { id: 'dDead', a: 'east', b: 'dead', at: { x: 30, z: 5 } },
];

function testGraph(): StationGraph {
  const ids = ROOMS.map((room) => room.id);
  const centre = (id: string): FloorPoint => {
    const room = ROOMS.find((r) => r.id === id);
    return room ? { x: (room.x0 + room.x1) / 2, z: (room.z0 + room.z1) / 2 } : { x: 0, z: 0 };
  };
  const links = new Map<string, string[]>(ids.map((id) => [id, []]));
  const doorsBySpace = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const door of DOORS) {
    links.get(door.a)!.push(door.b);
    links.get(door.b)!.push(door.a);
    doorsBySpace.get(door.a)!.push(door.id);
    doorsBySpace.get(door.b)!.push(door.id);
  }
  // Floyd–Warshall über fünf Knoten: dieselbe Auskunft wie die echte Karte.
  const cost = new Map<string, number>();
  const key = (a: string, b: string): string => `${a}>${b}`;
  for (const a of ids) for (const b of ids) cost.set(key(a, b), a === b ? 0 : Infinity);
  for (const door of DOORS) {
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
      ROOMS.find(
        (room) =>
          point.x >= room.x0 && point.x < room.x1 && point.z >= room.z0 && point.z < room.z1,
      )?.id ?? '',
    doorsOf: (id) => doorsBySpace.get(id) ?? [],
    doorPoint: (id) => DOORS.find((door) => door.id === id)?.at ?? null,
  };
}

function testTrack(sightings: SightingLike[], dir: FloorPoint, speed: number): TrackLike {
  return { sightings, velocity: () => (sightings.length < 2 ? null : { dir, speed }) };
}

function testMemory(opts: {
  likely?: string;
  certainty?: number;
  exits?: Record<string, Array<{ door: string; share: number }>>;
}): MemoryLike {
  return {
    belief: (room) => (room === opts.likely ? (opts.certainty ?? 0) : 0),
    mostLikely: () => opts.likely ?? '',
    certainty: () => opts.certainty ?? 0,
    exits: (room) => opts.exits?.[room] ?? [],
  };
}

/** Das Glaubensbild, das die Prognose hinter der ersten Tür weiterträgt. */
const EXITS = {
  east: [
    { door: 'dDead', share: 0.8 },
    { door: 'dEast', share: 0.2 },
  ],
};

const TUNING = { predict: 1, ambush: 1 };

/** Ein Spieler, der im Saal steht und nach Osten losläuft. */
function running(speed: number): TrackLike {
  return testTrack(
    [
      { at: { x: 2, z: 5 }, time: 0 },
      { at: { x: 5, z: 5 }, time: 1, sprinting: speed > 3 },
    ],
    { x: 1, z: 0 },
    speed,
  );
}

function decide(over: Partial<Parameters<typeof plan>[0]>): Plan {
  const graph = testGraph();
  return plan({
    monsterAt: { x: 0, z: 0 },
    huntSpeed: 4.4,
    playerAt: null,
    prediction: null,
    memory: testMemory({}),
    estimator: graphEstimator(graph),
    graph,
    now: 100,
    rng: () => 0,
    tuning: TUNING,
    ...over,
  });
}

describe('Die Prognose des Spielerwegs', () => {
  it('legt eine Polyline über zwei Türen und rechnet die Ankunftszeiten dazu', () => {
    const graph = testGraph();
    const prediction = predictPlayer(running(4.94), testMemory({ exits: EXITS }), graph, 1);
    expect(prediction).not.toBeNull();
    expect(prediction!.doors).toEqual(['dEast', 'dDead']);
    expect(prediction!.path).toEqual([
      { x: 5, z: 5 },
      { x: 20, z: 5 },
      { x: 30, z: 5 },
    ]);
    expect(prediction!.speed).toBeCloseTo(4.94);
    expect(prediction!.eta[0]).toBeCloseTo(15 / 4.94);
    expect(prediction!.eta[1]).toBeCloseTo(25 / 4.94);
  });

  it('nimmt die Tür, die dem Kurs am nächsten liegt — nicht die nächstgelegene', () => {
    const graph = testGraph();
    // Nach Norden statt nach Osten: derselbe Startpunkt, die andere Tür.
    const track = testTrack(
      [
        { at: { x: 5, z: 8 }, time: 0 },
        { at: { x: 5, z: 6 }, time: 1 },
      ],
      { x: 0, z: -1 },
      2.6,
    );
    const prediction = predictPlayer(track, testMemory({ exits: EXITS }), graph, 1);
    expect(prediction!.doors[0]).toBe('dNorth');
  });

  /**
   * Ohne zwei Sichtungen gibt es keine Richtung — und eine erfundene wäre
   * schlimmer als keine: Das Monster liefe dann mit voller Überzeugung an
   * eine Tür, die der Spieler nie gewählt hat.
   */
  it('sagt nichts vorher, solange sie nur eine Sichtung hat', () => {
    const graph = testGraph();
    const single = testTrack([{ at: { x: 5, z: 5 }, time: 0 }], { x: 1, z: 0 }, 4.94);
    expect(predictPlayer(single, testMemory({}), graph, 1)).toBeNull();
    expect(predictPlayer(testTrack([], { x: 1, z: 0 }, 4.94), testMemory({}), graph, 1)).toBeNull();
  });

  it('nimmt ohne gemessenes Tempo das Sprint- oder Gehtempo an', () => {
    const graph = testGraph();
    const standing = (sprinting: boolean): TrackLike =>
      testTrack(
        [
          { at: { x: 5, z: 5 }, time: 0 },
          { at: { x: 5, z: 5 }, time: 1, sprinting },
        ],
        { x: 1, z: 0 },
        0,
      );
    expect(predictPlayer(standing(true), testMemory({}), graph, 1)!.speed).toBeCloseTo(4.94);
    expect(predictPlayer(standing(false), testMemory({}), graph, 1)!.speed).toBeCloseTo(2.6);
  });

  /**
   * Die Puste ist der Unterschied zwischen „er ist in drei Sekunden dort" und
   * „er ist in vier Sekunden dort" — und damit oft der Unterschied zwischen
   * einem Abfangen, das aufgeht, und einem, das ins Leere läuft.
   */
  it('rechnet die Puste ein: nach dem Sprint der Trab', () => {
    const graph = testGraph();
    const memory = testMemory({ exits: EXITS });
    const frisch = predictPlayer(running(4.94), memory, graph, 1);
    const müde = predictPlayer(running(4.94), memory, graph, 1, { left: 1, trot: 3.55 });
    expect(müde!.eta[0]).toBeCloseTo(1 + (15 - 4.94) / 3.55);
    expect(müde!.eta[0]).toBeGreaterThan(frisch!.eta[0]!);
  });
});

describe('Die Reisezeit über die Raumkarte', () => {
  it('gibt Infinity für unerreichbar — und für Punkte außerhalb der Station', () => {
    const estimator = graphEstimator(testGraph());
    expect(estimator.time({ x: 5, z: 5 }, { x: 55, z: 5 }, 4)).toBe(Infinity);
    expect(estimator.time({ x: 5, z: 5 }, { x: 999, z: 999 }, 4)).toBe(Infinity);
    expect(estimator.time({ x: 999, z: 999 }, { x: 5, z: 5 }, 4)).toBe(Infinity);
    expect(estimator.time({ x: 5, z: 5 }, { x: 15, z: 5 }, 0)).toBe(Infinity);
  });

  it('rechnet im selben Raum die Luftlinie und darüber hinaus über die Raummitten', () => {
    const estimator = graphEstimator(testGraph());
    expect(estimator.time({ x: 5, z: 5 }, { x: 15, z: 5 }, 5)).toBeCloseTo(2);
    // Zwei Räume weiter knickt der Weg über die Raummitten und ist deshalb
    // länger als die Luftlinie — Wände stehen auf dieser Karte nicht, ihre
    // Wirkung steht in den Kanten.
    expect(estimator.time({ x: 5, z: 5 }, { x: 35, z: 9 }, 5)).toBeGreaterThan(
      Math.hypot(30, 4) / 5,
    );
  });

  /**
   * Eine Tür liegt auf der Kante zwischen zwei Räumen; welchem der beiden sie
   * zugeschlagen wird, ist eine Frage der Rundung. Zwischen Nachbarn zählt
   * deshalb auch die Luftlinie — sonst kostete der Schritt durch die eigene
   * Tür den Umweg über zwei Raummitten, und das Monster ließe die Tür aus, in
   * der es schon fast steht.
   */
  it('lässt den Schritt durch die eigene Tür nicht über zwei Raummitten laufen', () => {
    const estimator = graphEstimator(testGraph());
    expect(estimator.time({ x: 18, z: 5 }, { x: 20, z: 5 }, 5)).toBeCloseTo(0.4);
  });
});

describe('Verfolgen, abfangen, lauern oder suchen', () => {
  it('fängt an genau der Tür ab, auf die der Spieler zuläuft', () => {
    const graph = testGraph();
    const prediction = predictPlayer(running(4.94), testMemory({ exits: EXITS }), graph, 1);
    const decision = decide({
      monsterAt: { x: 23, z: 7 },
      playerAt: { x: 5, z: 5 },
      prediction,
    });
    expect(decision.kind).toBe('intercept');
    if (decision.kind !== 'intercept') return;
    expect(decision.door).toBe('dEast');
    expect(decision.at).toEqual({ x: 20, z: 5 });
    expect(decision.etaMonster + 0.8).toBeLessThanOrEqual(decision.etaPlayer);
  });

  it('verfolgt, wenn es dicht dahinter und schneller ist', () => {
    const graph = testGraph();
    const prediction = predictPlayer(running(2.6), testMemory({ exits: EXITS }), graph, 1);
    const decision = decide({
      monsterAt: { x: 3, z: 5 },
      playerAt: { x: 5, z: 5 },
      prediction,
    });
    expect(decision.kind).toBe('chase');
    if (decision.kind !== 'chase') return;
    expect(decision.at).toEqual({ x: 5, z: 5 });
  });

  /**
   * Der Fall, für den dieses Modul überhaupt gebaut ist: Ein Spieler mit
   * frischer Puste ist schneller als jedes Monster (`mission.ts`). Wer ihm
   * hinterherläuft, holt nie ein — und genau das hat die alte Routine getan.
   */
  it('läuft einem frisch sprintenden Spieler nie hinterher', () => {
    const graph = testGraph();
    const prediction = predictPlayer(running(4.94), testMemory({ exits: EXITS }), graph, 1);
    const decision = decide({
      monsterAt: { x: 35, z: 5 },
      huntSpeed: 4,
      playerAt: { x: 5, z: 5 },
      prediction,
    });
    expect(decision.kind).not.toBe('chase');
    expect(['intercept', 'ambush']).toContain(decision.kind);
  });

  it('lauert an der einzigen Tür des Raums, in dem es den Spieler vermutet', () => {
    const decision = decide({
      memory: testMemory({ likely: 'dead', certainty: 0.9, exits: EXITS }),
    });
    expect(decision.kind).toBe('ambush');
    if (decision.kind !== 'ambush') return;
    expect(decision.room).toBe('dead');
    expect(decision.door).toBe('dDead');
    expect(decision.at).toEqual({ x: 30, z: 5 });
    expect(decision.until).toBeCloseTo(100 + AMBUSH_MAX);
  });

  it('lauert nicht länger als AMBUSH_MAX, auch nicht bei jedem Wurf', () => {
    for (const roll of [0, 0.5, 1]) {
      const decision = decide({
        memory: testMemory({ likely: 'dead', certainty: 0.9 }),
        rng: () => roll,
      });
      expect(decision.kind).toBe('ambush');
      if (decision.kind !== 'ambush') continue;
      expect(decision.until - 100).toBeLessThanOrEqual(AMBUSH_MAX);
      expect(decision.until - 100).toBeGreaterThan(0);
    }
  });

  it('sucht, wenn die Sicherheit nicht reicht', () => {
    const decision = decide({
      memory: testMemory({ likely: 'dead', certainty: 0.3, exits: EXITS }),
    });
    expect(decision).toEqual({ kind: 'search', room: 'dead' });
  });

  /**
   * In einem Raum mit vielen Ausgängen ist Lauern nur eine andere Art zu
   * warten: Die Aussicht, an der richtigen Tür zu stehen, ist schlechter als
   * die Aussicht, ihn beim Absuchen zu finden.
   */
  it('lauert nicht in einem Raum, aus dem es zu viele Wege gibt', () => {
    const decision = decide({
      memory: testMemory({ likely: 'hall', certainty: 0.95 }),
      graph: {
        ...testGraph(),
        doorsOf: () => ['dNorth', 'dEast', 'dDead'],
      },
    });
    expect(decision.kind).toBe('search');
  });

  it('lauert nicht, solange es den Spieler sieht', () => {
    const decision = decide({
      memory: testMemory({ likely: 'dead', certainty: 0.9 }),
      monsterAt: { x: 35, z: 5 },
      huntSpeed: 1,
      playerAt: { x: 35, z: 9 },
    });
    expect(decision.kind).toBe('chase');
  });
});

describe('Die Türen auf der echten Raumkarte', () => {
  it('nennt jede Tür bei beiden Räumen, die an ihr hängen', () => {
    const spec = simulationSpec(1000);
    const graph = stationGraph(spec);
    let counted = 0;
    for (const door of spec.doors) {
      expect(graph.doorsOf(door.a)).toContain(door.id);
      expect(graph.doorsOf(door.b ?? COMMAND)).toContain(door.id);
      counted += 2;
    }
    expect(graph.spaces.reduce((sum, id) => sum + graph.doorsOf(id).length, 0)).toBe(counted);
    expect(graph.doorsOf(spec.entryRoom)).toContain(spec.frontDoor);
    expect(graph.doorsOf(COMMAND)).toEqual([spec.frontDoor]);
    expect(graph.doorsOf('gibtesnicht')).toEqual([]);
  });

  /**
   * Die Tür sitzt auf der **Kante** zwischen zwei Kacheln und nicht auf der
   * Kachel: eine halbe Kachel Unterschied, gut einen Meter. Wer daneben
   * rechnet, lauert in der Wand neben der Tür.
   */
  it('setzt die Türmitte auf die Kante und nicht auf die Kachel', () => {
    const spec = simulationSpec(1000);
    const graph = stationGraph(spec);
    for (const door of spec.doors) {
      const point = graph.doorPoint(door.id);
      expect(point).not.toBeNull();
      const tile = { x: (door.x + 0.5) * TILE, z: (door.z + 0.5) * TILE };
      expect(Math.hypot(point!.x - tile.x, point!.z - tile.z)).toBeCloseTo(TILE / 2);
    }
    expect(graph.doorPoint('gibtesnicht')).toBeNull();
  });

  it('erreicht jede Tür der Station von der Zentrale aus', () => {
    const spec = simulationSpec(1000);
    const graph = stationGraph(spec);
    const estimator = graphEstimator(graph);
    for (const door of spec.doors) {
      const point = graph.doorPoint(door.id)!;
      expect(estimator.time(graph.centre(COMMAND), point, 3)).toBeLessThan(Infinity);
    }
  });
});
