import {
  confineToApron,
  confineToCourse,
  confineToTrack,
  insideApron,
  lapDelta,
  nearestOnPath,
  pathLength,
  pointAlong,
  trimSpots,
  type Apron,
  type Vec2,
} from './kartTrack';

/** A 20 x 20 square, driven clockwise seen from above. */
const SQUARE: Vec2[] = [
  { x: -10, z: -10 },
  { x: 10, z: -10 },
  { x: 10, z: 10 },
  { x: -10, z: 10 },
];

describe('pathLength', () => {
  it('measures the closed loop, last segment included', () => {
    expect(pathLength(SQUARE)).toBeCloseTo(80, 9);
  });
});

describe('nearestOnPath', () => {
  it('finds the closest point and how far round it is', () => {
    const hit = nearestOnPath(SQUARE, 0, -12);
    expect(hit.x).toBeCloseTo(0, 9);
    expect(hit.z).toBeCloseTo(-10, 9);
    expect(hit.along).toBeCloseTo(10, 9);
  });

  it('calls the left-hand side positive', () => {
    // Along the first leg the tangent is +X, so -Z is to the left of it.
    expect(nearestOnPath(SQUARE, 0, -12).lateral).toBeGreaterThan(0);
    expect(nearestOnPath(SQUARE, 0, -8).lateral).toBeLessThan(0);
  });

  it('reports a unit tangent', () => {
    const hit = nearestOnPath(SQUARE, 0, -12);
    expect(Math.hypot(hit.tx, hit.tz)).toBeCloseTo(1, 9);
  });
});

describe('confineToTrack', () => {
  it('leaves a kart on the tarmac alone', () => {
    const result = confineToTrack(SQUARE, 4, 0, -8, 1, 0);
    expect(result).toEqual({ x: 0, z: -8, vx: 1, vz: 0, hit: false });
  });

  it('puts a kart that left the road back on the edge', () => {
    const result = confineToTrack(SQUARE, 4, 0, -16, 0, -3);
    expect(result.hit).toBe(true);
    expect(result.z).toBeCloseTo(-14, 9);
    // The part of the speed that pointed into the rail is gone.
    expect(result.vz).toBeCloseTo(0, 9);
  });

  it('lets a kart keep sliding along the rail', () => {
    const result = confineToTrack(SQUARE, 4, 0, -16, 5, -3);
    expect(result.vx).toBeGreaterThan(4);
    expect(result.vx).toBeLessThan(5);
  });

  it('does not brake a kart that is already coming back in', () => {
    const result = confineToTrack(SQUARE, 4, 0, -16, 0, 3);
    expect(result.vz).toBeCloseTo(3 * 0.97, 9);
  });
});

/**
 * Eine Boxengasse, die kachelbündig an der Nordkante des Quadrats klebt: die
 * Fahrbahn reicht dort bis `z = -14`, und genau dort fängt die Fläche an.
 */
const PIT: Apron = { x0: -6, z0: -20, x1: 6, z1: -14 };

describe('insideApron', () => {
  it('counts the edge as inside', () => {
    expect(insideApron(PIT, -6, -14)).toBe(true);
    expect(insideApron(PIT, -6.01, -17)).toBe(false);
  });
});

describe('confineToApron', () => {
  it('leaves a kart on the apron alone', () => {
    expect(confineToApron(PIT, 0, -17, 1, 2)).toEqual({ x: 0, z: -17, vx: 1, vz: 2, hit: false });
  });

  it('puts a kart that ran into the end wall back on it', () => {
    const result = confineToApron(PIT, 0, -22, 0, -4);
    expect(result.hit).toBe(true);
    expect(result.z).toBe(-20);
    // Was in die Mauer zeigte, ist weg; was daran entlangzeigte, bleibt.
    expect(result.vz).toBe(0);
  });

  it('lets a kart slide along the wall', () => {
    const result = confineToApron(PIT, 0, -22, 5, -4);
    expect(result.vx).toBeGreaterThan(4);
    expect(result.vx).toBeLessThan(5);
  });
});

describe('confineToCourse', () => {
  const free = (x: number, z: number): boolean =>
    !confineToCourse(SQUARE, 4, [PIT], x, z, 0, 0).hit;

  it('leaves a kart alone on the track', () => {
    expect(free(0, -12)).toBe(true);
  });

  it('leaves a kart alone in the pits', () => {
    expect(free(0, -18)).toBe(true);
  });

  it('has no strip of grass between the two', () => {
    // Der ganze Weg von der Mitte der Fahrbahn bis in die Box hinein ist frei.
    for (let z = -10; z >= -19; z -= 0.25) expect(free(0, z)).toBe(true);
  });

  it('still shoves a kart back that is on neither', () => {
    expect(free(20, 0)).toBe(false);
  });

  it('puts a kart back on the nearer of the two', () => {
    // Knapp westlich der Box: dorthin gehört es zurück, nicht quer über die
    // Wiese auf die Strecke.
    const back = confineToCourse(SQUARE, 4, [PIT], -7, -18, -2, 0);
    expect(back.x).toBe(-6);
    expect(back.z).toBe(-18);
  });
});

describe('lapDelta', () => {
  it('measures ordinary progress', () => {
    expect(lapDelta(10, 14, 80)).toBe(4);
  });

  it('sees through the start line', () => {
    expect(lapDelta(78, 2, 80)).toBe(4);
  });

  it('counts driving backwards as backwards', () => {
    expect(lapDelta(2, 78, 80)).toBe(-4);
  });

  it('gives up on a lap of no length', () => {
    expect(lapDelta(1, 2, 0)).toBe(0);
  });
});

describe('pointAlong', () => {
  it('läuft die Linie ab und trifft die Ecke nach einer Seitenlänge', () => {
    const point = pointAlong(SQUARE, 20);
    expect(point.x).toBeCloseTo(10, 9);
    expect(point.z).toBeCloseTo(-10, 9);
  });

  it('gibt die Tangente in Fahrtrichtung und die linke Normale dazu', () => {
    const point = pointAlong(SQUARE, 10);
    expect(point.tx).toBeCloseTo(1, 9);
    expect(point.tz).toBeCloseTo(0, 9);
    // Links von +X ist −Z, und die Normale ist (tz, −tx).
    expect(point.nx).toBeCloseTo(0, 9);
    expect(point.nz).toBeCloseTo(-1, 9);
  });

  it('ist geschlossen: eine Runde weiter ist derselbe Punkt', () => {
    const once = pointAlong(SQUARE, 13);
    const twice = pointAlong(SQUARE, 13 + 80);
    expect(twice.x).toBeCloseTo(once.x, 9);
    expect(twice.z).toBeCloseTo(once.z, 9);
  });

  it('hält eine entartete Linie aus, statt daneben zu greifen', () => {
    expect(pointAlong([{ x: 3, z: 4 }], 12)).toMatchObject({ x: 3, z: 4 });
  });
});

/**
 * **Die Plätze am Streckenrand** — die Rechnung hinter den Bündeln.
 *
 * Randsteine und Reifenstapel werden als `InstancedMesh` gezeichnet
 * (`worlds/test/zones/kart.ts`), und ein Bündel entsteht in einem Zug: Es
 * braucht die Plätze **vorher** und kann sie hinterher nicht mehr ändern. Was
 * diese Liste falsch hinlegt, steht für immer falsch da — also steht es hier.
 */
describe('trimSpots', () => {
  const spots = (skip?: (x: number, z: number) => boolean) =>
    trimSpots({ path: SQUARE, lapLength: 80, spacing: 10, offset: 2, skip });

  it('bestückt beide Seiten in einem Zug, eine Runde lang', () => {
    // 80 m in Schritten von 10 sind acht Schritte, je zwei Seiten.
    expect(spots()).toHaveLength(16);
  });

  it('setzt die Dinger neben die Linie und nicht darauf', () => {
    const first = spots()[0]!;
    expect(Math.hypot(first.x - -10, first.z - -10)).toBeCloseTo(2, 9);
  });

  it('gibt beiden Seiten eines Schritts dieselbe Nummer', () => {
    const [left, right] = spots();
    expect(left!.step).toBe(0);
    expect(right!.step).toBe(0);
    expect(left!.side).toBe(1);
    expect(right!.side).toBe(-1);
  });

  it('teilt sich damit sauber in Rot und Weiß — quer über die Bahn dieselbe Farbe', () => {
    const all = spots();
    const red = all.filter((spot) => spot.step % 2 === 0);
    const white = all.filter((spot) => spot.step % 2 !== 0);
    expect(red).toHaveLength(8);
    expect(white).toHaveLength(8);
    expect(red.length + white.length).toBe(all.length);
  });

  it('lässt aus, wo die Boxengasse liegt', () => {
    const cleared = spots((x, z) => x > 0 && z > 0);
    expect(cleared.length).toBeLessThan(16);
    expect(cleared.every((spot) => !(spot.x > 0 && spot.z > 0))).toBe(true);
  });

  it('gibt nichts zurück, wenn der Abstand keiner ist', () => {
    expect(trimSpots({ path: SQUARE, lapLength: 80, spacing: 0, offset: 2 })).toHaveLength(0);
  });
});
