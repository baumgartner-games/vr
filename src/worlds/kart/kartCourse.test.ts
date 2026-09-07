import { DIR_E, DIR_N, DIR_S, DIR_W, TILE, type Dir } from '../nav/navTile';
import {
  CELL,
  KART_COURSE,
  KART_FIELD,
  KART_PIECES,
  KART_START,
  PIT_APRON,
  PIT_BAYS,
  PIT_BOXES,
  PIT_LANE,
  TRACK_HALF,
  TURN,
  coursePoints,
  courseEnd,
  grownRect,
  layoutCourse,
  pieceEnd,
  piecePoints,
  pitSpots,
  tilesAround,
  turnedDir,
  unionRect,
  type Cursor,
} from './kartCourse';
import { insideApron, nearestOnPath, pathLength } from './kartTrack';

const NORTH: Cursor = { x: 0, z: 0, dir: DIR_N };

describe('pieceEnd', () => {
  it('runs a straight along its own direction', () => {
    expect(pieceEnd({ kind: 'straight', cells: 3 }, NORTH)).toEqual({
      x: 0,
      z: -3 * CELL,
      dir: DIR_N,
    });
  });

  it('takes one cell when no length is given', () => {
    expect(pieceEnd({ kind: 'straight' }, NORTH).z).toBe(-CELL);
  });

  it('comes out of a corner as far to the side as it went forward', () => {
    // Nach rechts aus Norden heraus: nach Osten, um den Radius versetzt.
    expect(pieceEnd({ kind: 'right' }, NORTH)).toEqual({ x: TURN, z: -TURN, dir: DIR_E });
    expect(pieceEnd({ kind: 'left' }, NORTH)).toEqual({ x: -TURN, z: -TURN, dir: DIR_W });
  });

  it('undoes a right corner with a left one', () => {
    const there = pieceEnd({ kind: 'right', radius: 5 }, NORTH);
    expect(pieceEnd({ kind: 'left', radius: 5 }, there).dir).toBe(DIR_N);
  });
});

describe('turnedDir', () => {
  it('turns through all four and back', () => {
    let dir: Dir = DIR_N;
    for (const expected of [DIR_E, DIR_S, DIR_W, DIR_N]) {
      dir = turnedDir(dir, 'right');
      expect(dir).toBe(expected);
    }
  });
});

describe('piecePoints', () => {
  it('leaves out the point it starts on and lands exactly on the end', () => {
    const piece = { kind: 'straight', cells: 2 } as const;
    const points = piecePoints(piece, NORTH);
    expect(points[0]).not.toEqual({ x: 0, z: 0 });
    const end = pieceEnd(piece, NORTH);
    expect(points[points.length - 1]).toEqual({ x: end.x * TILE, z: end.z * TILE });
  });

  it('keeps every point of a corner on its arc', () => {
    const radius = TURN * TILE;
    // Die Mitte einer Rechtskurve aus Norden liegt im Osten.
    for (const point of piecePoints({ kind: 'right' }, NORTH)) {
      expect(Math.hypot(point.x - radius, point.z)).toBeCloseTo(radius, 6);
    }
  });

  it('turns a corner the way it says, and not the other way', () => {
    // Nach rechts geht es aus Norden heraus nach Osten, also ins positive X.
    expect(piecePoints({ kind: 'right' }, NORTH).at(-1)!.x).toBeGreaterThan(0);
    expect(piecePoints({ kind: 'left' }, NORTH).at(-1)!.x).toBeLessThan(0);
  });
});

describe('layoutCourse', () => {
  it('closes a square of four corners', () => {
    const square = layoutCourse(
      [
        { kind: 'straight', cells: 2 },
        { kind: 'right' },
        { kind: 'straight', cells: 2 },
        { kind: 'right' },
        { kind: 'straight', cells: 2 },
        { kind: 'right' },
        { kind: 'straight', cells: 2 },
        { kind: 'right' },
      ],
      NORTH,
    );
    expect(square.closed).toBe(true);
    // Der Anfangspunkt steht genau einmal darin — sonst zählte die Runde eine
    // Strecke von null Metern doppelt.
    expect(square.centre.filter((point) => point.x === 0 && point.z === 0)).toHaveLength(1);
  });

  it('says so when a course does not close', () => {
    expect(layoutCourse([{ kind: 'straight' }], NORTH).closed).toBe(false);
    // Dieselbe Stelle, aber in die falsche Richtung: auch das ist offen.
    const halfWay = layoutCourse(
      [{ kind: 'right' }, { kind: 'right' }, { kind: 'left' }, { kind: 'left' }],
      NORTH,
    );
    expect(halfWay.closed).toBe(false);
  });

  it('keeps every joint on a whole tile', () => {
    let at = KART_START;
    for (const piece of KART_PIECES) {
      at = pieceEnd(piece, at);
      expect(Number.isInteger(at.x)).toBe(true);
      expect(Number.isInteger(at.z)).toBe(true);
    }
  });

  it('has no gap between two neighbouring points', () => {
    const points = coursePoints(KART_PIECES, KART_START);
    for (let i = 1; i < points.length; i++) {
      const gap = Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.z - points[i - 1]!.z);
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThanOrEqual(TILE);
    }
  });
});

describe('tilesAround', () => {
  it('grows a line to whole tiles on both sides', () => {
    expect(tilesAround([{ x: 0, z: 0 }], TILE)).toEqual({ x: -1, z: -1, w: 2, d: 2 });
  });
});

describe('unionRect and grownRect', () => {
  it('takes in both rectangles', () => {
    expect(unionRect({ x: 0, z: 0, w: 2, d: 2 }, { x: -3, z: 1, w: 1, d: 4 })).toEqual({
      x: -3,
      z: 0,
      w: 5,
      d: 5,
    });
  });

  it('grows on every side', () => {
    expect(grownRect({ x: 0, z: 0, w: 2, d: 2 }, 1)).toEqual({ x: -1, z: -1, w: 4, d: 4 });
  });
});

describe('die Bahn selbst', () => {
  it('kommt wieder da an, wo sie losgefahren ist', () => {
    expect(KART_COURSE.closed).toBe(true);
    expect(courseEnd(KART_PIECES, KART_START)).toEqual(KART_START);
  });

  it('ist lang genug für eine Runde und kurz genug für eine kurze', () => {
    const length = pathLength(KART_COURSE.centre);
    expect(length).toBeGreaterThan(150);
    expect(length).toBeLessThan(400);
  });

  it('fährt in beide Richtungen und nicht nur geradeaus', () => {
    const dirs = new Set<number>();
    let at = KART_START;
    for (const piece of KART_PIECES) {
      at = pieceEnd(piece, at);
      dirs.add(at.dir);
    }
    expect(dirs).toEqual(new Set([DIR_N, DIR_E, DIR_S, DIR_W]));
  });
});

describe('die Boxengasse', () => {
  it('stößt kachelbündig an den Streckenkorridor', () => {
    // Die eine Zahl, an der alles hängt: Ostkante der Gasse = Westrand der
    // Fahrbahn. Klafft dort eine Lücke, kommt niemand aus der Box heraus.
    expect(PIT_APRON.x1).toBeCloseTo(-TRACK_HALF, 9);
  });

  it('lässt keinen Streifen zwischen Gasse und Strecke frei', () => {
    // Ein Punkt knapp östlich der Gassenkante liegt schon auf der Strecke.
    const hit = nearestOnPath(KART_COURSE.centre, PIT_APRON.x1 + 0.01, -10);
    expect(Math.abs(hit.lateral)).toBeLessThanOrEqual(TRACK_HALF);
  });

  it('stellt jedes Kart in die Gasse und keines auf die Strecke', () => {
    for (const spot of pitSpots()) {
      expect(insideApron(PIT_APRON, spot.x, spot.z)).toBe(true);
      const hit = nearestOnPath(KART_COURSE.centre, spot.x, spot.z);
      expect(Math.abs(hit.lateral)).toBeGreaterThan(TRACK_HALF);
    }
  });

  it('gibt jeder Bucht genau ein Kart', () => {
    expect(pitSpots()).toHaveLength(PIT_BAYS.length);
    expect(new Set(pitSpots().map((spot) => spot.z)).size).toBe(PIT_BAYS.length);
  });

  it('lässt zwischen zwei Buchten eine Kachel für die Säule', () => {
    const sorted = [...PIT_BAYS].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]! - sorted[i - 1]!).toBe(2);
    }
    // Und alle liegen im Block der Boxen.
    for (const bay of PIT_BAYS) {
      expect(bay).toBeGreaterThanOrEqual(PIT_BOXES.z);
      expect(bay).toBeLessThan(PIT_BOXES.z + PIT_BOXES.d);
    }
  });

  it('legt die Boxen hinter die Gasse und nicht hinein', () => {
    expect(PIT_BOXES.x + PIT_BOXES.w).toBe(PIT_LANE.x);
  });
});

describe('das Gelände', () => {
  it('umfasst Strecke, Gasse und Boxen', () => {
    for (const rect of [KART_COURSE.bounds, PIT_LANE, PIT_BOXES]) {
      expect(KART_FIELD.x).toBeLessThanOrEqual(rect.x);
      expect(KART_FIELD.z).toBeLessThanOrEqual(rect.z);
      expect(KART_FIELD.x + KART_FIELD.w).toBeGreaterThanOrEqual(rect.x + rect.w);
      expect(KART_FIELD.z + KART_FIELD.d).toBeGreaterThanOrEqual(rect.z + rect.d);
    }
  });
});
