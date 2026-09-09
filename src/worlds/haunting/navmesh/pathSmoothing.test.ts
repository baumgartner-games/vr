import { pathLength, pullString, totalTurn, type NavPoint } from './pathSmoothing';
import { pointSegmentDistance, segmentDistance, snapshotSegmentClear } from './snapshotClearance';
import { emptySnapshot, type MapSnapshot } from '../map/mapSnapshot';

/** Eine Treppe aus Viertelmetern von (0,0) schräg nach (n/4, n/4). */
function staircase(steps: number): NavPoint[] {
  const points: NavPoint[] = [];
  for (let i = 1; i <= steps; i++) {
    points.push({ x: i * 0.25, z: (i - 1) * 0.25 });
    points.push({ x: i * 0.25, z: i * 0.25 });
  }
  return points;
}

describe('Der Schnurzug', () => {
  it('macht aus einer Treppe im freien Raum eine einzige Gerade', () => {
    const from = { x: 0, z: 0 };
    const stairs = staircase(20);
    const pulled = pullString(from, stairs, () => true);
    expect(pulled).toEqual([stairs.at(-1)]);
    expect(pathLength(from, pulled)).toBeCloseTo(Math.hypot(5, 5), 9);
    expect(pathLength(from, stairs)).toBeCloseTo(10, 9);
    expect(totalTurn(from, pulled)).toBe(0);
    expect(totalTurn(from, stairs)).toBeCloseTo(((2 * 20 - 1) * Math.PI) / 2, 9);
  });

  it('lässt Wegpunkte stehen, wo keine Gerade an der Wand vorbeikommt', () => {
    // Eine Wand auf x = 2 mit einer Lücke bei z ∈ [1,8; 2,2]; der Rasterweg
    // geht durch die Lücke. Die Strecke zählt als frei, wenn sie die Wand
    // nicht außerhalb der Lücke schneidet.
    const clear = (a: NavPoint, b: NavPoint): boolean => {
      if ((a.x - 2) * (b.x - 2) > 0) return true;
      const t = (2 - a.x) / (b.x - a.x);
      const z = a.z + t * (b.z - a.z);
      return z >= 1.8 && z <= 2.2;
    };
    const from = { x: 0, z: 0 };
    const raw: NavPoint[] = [
      { x: 0, z: 2 },
      { x: 1, z: 2 },
      { x: 1.75, z: 2 },
      { x: 2.25, z: 2 },
      { x: 3, z: 2 },
      { x: 3, z: 4 },
      { x: 4, z: 4 },
    ];
    const pulled = pullString(from, raw, clear);
    // Vom Start direkt bis kurz vor die Lücke geht es nicht (die Gerade
    // träfe die Wand bei z ≈ 1,4), also bleibt der Punkt davor stehen.
    expect(pulled.at(-1)).toEqual({ x: 4, z: 4 });
    expect(pulled.length).toBeLessThan(raw.length);
    let previous: NavPoint = from;
    for (const point of pulled) {
      // Jede eingesetzte Gerade ist frei — oder war schon ein Rasterstück.
      const index = raw.indexOf(point);
      const previousIndex = raw.indexOf(previous);
      if (index !== previousIndex + 1) expect(clear(previous, point)).toBe(true);
      previous = point;
    }
    expect(pathLength(from, pulled)).toBeLessThanOrEqual(pathLength(from, raw) + 1e-9);
  });

  it('schaut über eine verdeckte Ecke hinweg, wenn dahinter wieder Sicht ist', () => {
    const from = { x: 0, z: 0 };
    const raw: NavPoint[] = [
      { x: 1, z: 0 },
      { x: 2, z: 0 },
      { x: 3, z: 0 },
      { x: 4, z: 0 },
    ];
    // Nur der zweite Punkt ist vom Start aus verdeckt, alle anderen frei.
    const clear = (a: NavPoint, b: NavPoint): boolean => !(a === from && b === raw[1]);
    expect(pullString(from, raw, clear)).toEqual([raw[3]]);
    // Ohne Blick über die Ecke bliebe der erste Punkt stehen.
    expect(pullString(from, raw, clear, { lookahead: 0 })).toEqual([raw[0], raw[3]]);
  });

  it('zieht Rasterketten im zweiten Durchgang ohne Spielraum gerade — Abkürzungen nicht', () => {
    // Eine Gasse: Nur zwischen x = 2 und x = 6 ist es eng. Mit Spielraum
    // (`wide`) geht dort keine Gerade, ohne (`tight`) jede.
    const from = { x: 0, z: 0 };
    const raw: NavPoint[] = [
      { x: 1, z: 1 }, // vom Start mit Spielraum erreichbar …
      { x: 2, z: 0 }, // … die Gasse beginnt
      { x: 3, z: 0.25 },
      { x: 4, z: 0 },
      { x: 5, z: 0.25 },
      { x: 6, z: 0 }, // … und endet
      { x: 7, z: 1 },
      { x: 8, z: 0 },
    ];
    const narrow = (a: NavPoint, b: NavPoint): boolean =>
      Math.max(a.x, b.x) > 2 + 1e-9 && Math.min(a.x, b.x) < 6 - 1e-9;
    const wide = (a: NavPoint, b: NavPoint): boolean => !narrow(a, b);
    const tight = (): boolean => true;
    // Ohne zweiten Durchgang bleibt die Treppe in der Gasse stehen.
    expect(pullString(from, raw, wide)).toEqual([raw[1], raw[2], raw[3], raw[4], raw[5], raw[7]]);
    // Mit: Der Anker vor der Gasse zieht sie in einer Geraden durch; die
    // Abkürzungen mit Spielraum (Start → Gasse, Gasse → Ziel) bleiben.
    expect(pullString(from, raw, wide, { tight })).toEqual([raw[1], raw[5], raw[7]]);
  });

  it('gibt kurze Wege unverändert zurück und ändert den Eingang nicht', () => {
    const from = { x: 0, z: 0 };
    expect(pullString(from, [], () => true)).toEqual([]);
    const single = [{ x: 1, z: 1 }];
    expect(pullString(from, single, () => false)).toEqual(single);
    const raw = staircase(3);
    const copy = raw.map((p) => ({ ...p }));
    pullString(from, raw, () => true);
    expect(raw).toEqual(copy);
  });
});

describe('Abstand zwischen Strecken', () => {
  it('rechnet Punkt-zu-Strecke und Strecke-zu-Strecke', () => {
    const a = { x: 0, z: 0 },
      b = { x: 4, z: 0 };
    expect(pointSegmentDistance({ x: 2, z: 3 }, a, b)).toBeCloseTo(3, 9);
    expect(pointSegmentDistance({ x: 6, z: 0 }, a, b)).toBeCloseTo(2, 9);
    expect(pointSegmentDistance({ x: 1, z: 0 }, a, a)).toBeCloseTo(1, 9);
    expect(segmentDistance({ x: 1, z: -1 }, { x: 1, z: 1 }, a, b)).toBe(0);
    expect(segmentDistance({ x: 1, z: 1 }, { x: 3, z: 2 }, a, b)).toBeCloseTo(1, 9);
    expect(segmentDistance({ x: 5, z: 1 }, { x: 7, z: 1 }, a, b)).toBeCloseTo(Math.SQRT2, 9);
  });

  it('prüft eine Strecke gegen Wände und geschlossene Türblätter des Snapshots', () => {
    const snapshot: MapSnapshot = {
      ...emptySnapshot(),
      walls: [{ a: { x: 5, z: 0 }, b: { x: 5, z: 4 }, kind: 'wall' }],
      doors: [
        {
          id: 'd',
          a: 'r0',
          b: 'r1',
          at: { x: 5, z: 5 },
          axis: 'z',
          width: 2,
          open: false,
          locked: false,
          material: 'wood',
        },
      ],
    };
    const clear = snapshotSegmentClear(snapshot, 0.45);
    expect(clear({ x: 0, z: 2 }, { x: 4, z: 2 })).toBe(true);
    expect(clear({ x: 0, z: 2 }, { x: 4.7, z: 2 })).toBe(false);
    expect(clear({ x: 0, z: 2 }, { x: 8, z: 2 })).toBe(false);
    // Durch die Öffnung bei z = 5: zu, also gesperrt …
    expect(clear({ x: 0, z: 5 }, { x: 8, z: 5 })).toBe(false);
    // … und offen frei.
    snapshot.doors[0]!.open = true;
    expect(snapshotSegmentClear(snapshot, 0.45)({ x: 0, z: 5 }, { x: 8, z: 5 })).toBe(true);
  });
});
