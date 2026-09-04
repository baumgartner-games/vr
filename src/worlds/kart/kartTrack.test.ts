import {
  confineToTrack,
  lapDelta,
  nearestOnPath,
  pathLength,
  sampleClosedSpline,
  type Vec2,
} from './kartTrack';

/** A 20 x 20 square, driven clockwise seen from above. */
const SQUARE: Vec2[] = [
  { x: -10, z: -10 },
  { x: 10, z: -10 },
  { x: 10, z: 10 },
  { x: -10, z: 10 },
];

describe('sampleClosedSpline', () => {
  it('gives one point per step and comes back to the start', () => {
    const path = sampleClosedSpline(SQUARE, 8);
    expect(path).toHaveLength(SQUARE.length * 8);
    expect(path[0]).toEqual(SQUARE[0]);
  });

  it('hands back the control points when there is nothing to smooth', () => {
    expect(
      sampleClosedSpline(
        [
          { x: 0, z: 0 },
          { x: 1, z: 1 },
        ],
        8,
      ),
    ).toHaveLength(2);
  });

  it('rounds off the corners', () => {
    const path = sampleClosedSpline(SQUARE, 12);
    // Nothing on a rounded square reaches as far out as its corner.
    const farthest = Math.max(...path.map((point) => Math.hypot(point.x, point.z)));
    expect(farthest).toBeLessThanOrEqual(Math.hypot(10, 10) + 1e-9);
  });
});

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
