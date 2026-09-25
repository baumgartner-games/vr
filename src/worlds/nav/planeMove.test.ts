import { fillRect, wallRect } from './navBuild';
import { NavGraph } from './navGraph';
import { DIR_N, tileKey, type Dir, type TileKey } from './navTile';
import { CellGrid, navCellSource, type Slope } from './cellGrid';
import {
  PLAYER_PLANE_RADIUS,
  cellPlaneWalls,
  slideCircle,
  slideOnCells,
  type PlaneWall,
} from './planeMove';

const R = PLAYER_PLANE_RADIUS;

/** Ein Feld mit Außenwänden, Schrägen und Treppen nach Wunsch. */
function field(
  w: number,
  d: number,
  slopes = new Map<TileKey, Slope>(),
  flights = new Map<TileKey, Dir>(),
): CellGrid {
  const graph = new NavGraph([0]);
  fillRect(graph, { x: 0, z: 0, w, d });
  wallRect(graph, { x: 0, z: 0, w, d });
  return new CellGrid(
    navCellSource(graph, (key) => slopes.get(key) ?? null, {
      voidIsFree: true,
      flight: (tx, tz, level) => flights.get(tileKey(tx, tz, level)) ?? null,
    }),
  );
}

/** So viele Bilder in eine Richtung laufen; gibt jede Stelle unterwegs zurück. */
function walk(
  grid: CellGrid,
  from: { x: number; z: number },
  dx: number,
  dz: number,
  frames: number,
): Array<{ x: number; z: number }> {
  const trail = [from];
  let p = from;
  for (let i = 0; i < frames; i++) {
    p = slideOnCells(grid, p.x, p.z, dx, dz);
    trail.push(p);
  }
  return trail;
}

describe('Gleiten an einer Wand in der Ebene', () => {
  it('nimmt an einer geraden Wand genau den Anteil längs der Wand', () => {
    const wall: PlaneWall = { ax: 0, az: 0, bx: 10, bz: 0 };
    // Schräg auf die Wand bei z = 0 zu, von z = R aus.
    const p = slideCircle([wall], 5, R, 0.03, -0.04);
    expect(p.x).toBeCloseTo(5.03);
    expect(p.z).toBeCloseTo(R);
  });

  it('gleitet an einer Schräge glatt entlang — ohne Zickzack, ohne Stocken', () => {
    // Gemeldet: _„Beim Laufen gegen eine schräge Wand ruckelt der Spieler"_.
    // Eine „╱" über sechs Kacheln, x + z = 12 m; man läuft genau nach Westen
    // dagegen und rutscht an ihr nach Südwesten.
    const slopes = new Map<TileKey, Slope>();
    for (let i = 3; i < 9; i++) slopes.set(tileKey(i, 11 - i), 'slash');
    const grid = field(12, 12, slopes);
    const trail = walk(grid, { x: 8.5, z: 5 }, -0.04, 0, 150);
    const steps = trail.slice(1).map((p, i) => ({
      x: p.x - trail[i]!.x,
      z: p.z - trail[i]!.z,
    }));
    // Erst bis an die Wand, dann an ihr entlang: Jedes Bild bewegt sich,
    // keines springt zurück, und an der Wand ist jeder Schritt derselbe.
    for (const step of steps) {
      expect(step.x).toBeLessThanOrEqual(1e-9);
      expect(step.z).toBeGreaterThanOrEqual(-1e-9);
      expect(Math.hypot(step.x, step.z)).toBeGreaterThan(0.02);
    }
    const along = steps.slice(-40);
    for (const step of along) {
      expect(step.x).toBeCloseTo(-0.02, 5);
      expect(step.z).toBeCloseTo(0.02, 5);
    }
    // Und immer den Radius vor der Linie.
    for (const p of trail) expect((p.x + p.z - 12) / Math.SQRT2).toBeGreaterThan(R - 1e-6);
  });

  it('lässt niemanden über eine Schräge, in keiner Richtung und bei keinem Tempo', () => {
    // Die Nordwestecke unter 45° abgeschnitten, dahinter kein Boden — wie die
    // Ecken der Station.
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 8, d: 8 });
    wallRect(graph, { x: 0, z: 0, w: 8, d: 8 });
    const slopes = new Map<TileKey, Slope>();
    for (let x = 0; x < 8; x++)
      for (let z = 0; z < 8; z++) {
        if (x + z < 3) graph.removeTile(tileKey(x, z));
        else if (x + z === 3) slopes.set(tileKey(x, z), 'slash');
      }
    const grid = new CellGrid(
      navCellSource(graph, (key) => slopes.get(key) ?? null, { voidIsFree: true }),
    );
    let seed = 7;
    const random = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let a = 0; a < 16; a++) {
      let p = { x: 3.5, z: 3.5 };
      for (let i = 0; i < 400; i++) {
        const turn = (a / 16) * Math.PI * 2 + (i > 150 ? (random() - 0.5) * 2 : 0);
        const step = 0.02 + random() * 0.4;
        p = slideOnCells(grid, p.x, p.z, Math.cos(turn) * step, Math.sin(turn) * step);
        expect(p.x + p.z).toBeGreaterThan(4);
        expect(Math.max(p.x, p.z)).toBeLessThan(8);
      }
    }
  });

  it('läuft durch einen Gang von einem Meter und um ein Wandende herum', () => {
    const wall: PlaneWall = { ax: 0, az: 0, bx: 0, bz: 5 };
    // Am Ende der Wand vorbei: Der Kreis rundet die Ecke und bleibt nicht hängen.
    let p = { x: -0.5, z: 4 };
    for (let i = 0; i < 100; i++) p = slideCircle([wall], p.x, p.z, 0.02, 0.02);
    expect(p.x).toBeGreaterThan(0.5);
    const corridor: PlaneWall[] = [
      { ax: 0, az: 0, bx: 0, bz: 5 },
      { ax: 1, az: 0, bx: 1, bz: 5 },
    ];
    let q = { x: 0.3, z: -1 };
    for (let i = 0; i < 200; i++) q = slideCircle(corridor, q.x, q.z, 0.01, 0.04);
    expect(q.z).toBeGreaterThan(5);
  });
});

describe('Die Treppe als Gang mit Einbahnwänden', () => {
  /** Ein Feld 8 × 8, eine Treppe in Spalte 3 von z = 6 nach Norden bis z = 3. */
  function stairs(): CellGrid {
    const flights = new Map<TileKey, Dir>();
    for (let z = 3; z <= 6; z++) flights.set(tileKey(3, z), DIR_N);
    return field(8, 8, new Map(), flights);
  }

  it('hat Seiten, aber keine Wand quer über den Lauf', () => {
    const walls = cellPlaneWalls(stairs(), 2, 2, 4, 7);
    const sides = walls.filter((one) => one.outside);
    expect(sides).toHaveLength(8);
    for (const one of sides) expect(one.ax).toBe(one.bx);
  });

  it('lässt nicht seitlich hinauf, aber seitlich herunter', () => {
    const grid = stairs();
    // Von Westen gegen die Treppe: hält vor x = 3.
    const onto = walk(grid, { x: 1.5, z: 4.5 }, 0.04, 0, 100).at(-1)!;
    expect(onto.x).toBeCloseTo(3 - R, 5);
    // Von der Treppe nach Westen: herunter und weiter.
    const off = walk(grid, { x: 3.5, z: 4.5 }, -0.04, 0, 50).at(-1)!;
    expect(off.x).toBeLessThan(2);
  });

  it('lässt unten hinauf und den Lauf entlang', () => {
    const grid = stairs();
    const up = walk(grid, { x: 3.5, z: 7.5 }, 0, -0.04, 100).at(-1)!;
    expect(up.z).toBeLessThan(3.5);
    expect(up.x).toBeCloseTo(3.5, 5);
  });
});

describe('Herunter von der Treppe', () => {
  it('wirft niemanden mit einem Ruck hinaus, der halb auf ihr steht', () => {
    const side: PlaneWall = { ax: 3, az: 0, bx: 3, bz: 10, outside: { x: -1, z: 0 } };
    // Die Mitte knapp draußen, der Körper halb auf der Treppe: Ein Bild nach
    // Westen geht genau so weit wie gefragt.
    const p = slideCircle([side], 2.95, 5, -0.03, 0);
    expect(p.x).toBeCloseTo(2.92);
    // Zurück hinauf geht es von dort nicht mehr.
    const back = slideCircle([side], 2.92, 5, 0.03, 0);
    expect(back.x).toBeCloseTo(2.92);
  });
});

describe('Über Eck', () => {
  it('schlüpft schräg zwischen zwei Hindernissen hindurch, die sich über Eck gegenüberstehen', () => {
    // Das Bild des Besitzers, in Zellen: [w][ ][ ] / [p][p][ ] / [p][p][w].
    const blocked = new Set(['0,0', '2,2']);
    const grid = new CellGrid({
      floor: () => true,
      open: () => true,
      slope: () => null,
      blocked: (ix, iz) => blocked.has(`${ix},${iz}`),
    });
    let p = { x: 0.5, z: 1 };
    for (let i = 0; i < 40; i++) p = slideOnCells(grid, p.x, p.z, 0.025, -0.025);
    expect(p.x).toBeGreaterThan(1.2);
    expect(p.z).toBeLessThan(0.3);
  });
});
