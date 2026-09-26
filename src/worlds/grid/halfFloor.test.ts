import { CellGrid, navCellSource } from '../nav/cellGrid';
import { tileKey } from '../nav/navTile';
import { GridPlan } from './gridPlan';
import { halfFloorGeometry } from './halfFloor';
import { halfFloorTriangle } from './solids';
import { readWorld, writeWorld } from './worldFile';

function plan(): GridPlan {
  return new GridPlan().room({ x: 0, z: 0, w: 3, d: 3 }, { walls: true });
}

describe('Halber Boden unter einer Schräge (GridPlan.halfFloor)', () => {
  it('geht nur auf einer Schräge und nur zu einer ihrer beiden Seiten', () => {
    const p = plan();
    p.halfFloor(0, 0, 'nw');
    expect(p.halfFloorAt(tileKey(0, 0))).toBeNull();
    p.slope(0, 0, 'slash');
    p.halfFloor(0, 0, 'ne');
    expect(p.halfFloorAt(tileKey(0, 0))).toBeNull();
    p.halfFloor(0, 0, 'nw');
    expect(p.halfFloorAt(tileKey(0, 0))).toBe('nw');
    // Dreht die Schräge, passt die leere Ecke nicht mehr — der Boden ist wieder ganz.
    p.slope(0, 0, 'backslash');
    expect(p.halfFloorAt(tileKey(0, 0))).toBeNull();
    p.slope(0, 0, 'slash').halfFloor(0, 0, 'nw').slope(0, 0, null);
    expect(p.halfFloorAt(tileKey(0, 0))).toBeNull();
  });

  it('macht aus dem Bodenquader der Kachel ein halbes Stück, alle anderen bleiben ganz', () => {
    const p = plan().slope(0, 0, 'slash').halfFloor(0, 0, 'nw');
    const floors = p.solids().filter((one) => one.kind === 'floor');
    expect(floors).toHaveLength(9);
    const half = floors.filter((one) => one.half);
    expect(half).toHaveLength(1);
    expect(half[0]).toMatchObject({ x: 0.5, z: 0.5, half: 'nw' });
  });

  it('ändert am Gehen nichts: dieselben Kacheln, Kanten und freien Zellen', () => {
    const whole = plan().slope(0, 0, 'slash');
    const halved = plan().slope(0, 0, 'slash').halfFloor(0, 0, 'nw');
    const grid = (p: GridPlan): CellGrid =>
      new CellGrid(navCellSource(p.graph, (key) => p.slopeAt(key)));
    const a = grid(whole),
      b = grid(halved);
    for (let ix = -2; ix < 8; ix++)
      for (let iz = -2; iz < 8; iz++) expect(b.cellFree(ix, iz)).toBe(a.cellFree(ix, iz));
    // Die Schräge sperrt die Zellen auf der Diagonale; die Ecke dahinter
    // (Nordwest) bleibt, wie sie war — halber Boden hin oder her.
    expect(b.cellFree(1, 0)).toBe(false);
    expect(b.cellFree(0, 1)).toBe(false);
    expect(b.cellFree(1, 1)).toBe(true);
    expect(halved.graph.has(tileKey(0, 0))).toBe(true);
  });

  it('steht mit der leeren Ecke in der Datei und kommt zurück', () => {
    const p = plan().slope(0, 0, 'slash').halfFloor(0, 0, 'nw').slope(2, 2, 'backslash');
    const file = writeWorld(p);
    expect(file.slopes).toEqual([
      { x: 0, z: 0, slope: 'slash', empty: 'nw' },
      { x: 2, z: 2, slope: 'backslash' },
    ]);
    const read = readWorld(JSON.parse(JSON.stringify(file)));
    const back = new GridPlan(read.graph.levels).restore(
      read.graph,
      read.blocks,
      read.masses,
      read.fixtures,
      read.slopes,
    );
    expect(back.halfFloorAt(tileKey(0, 0))).toBe('nw');
    expect(back.halfFloorAt(tileKey(2, 2))).toBeNull();
    // Eine Ecke, die nicht zur Schräge passt, fällt beim Lesen weg.
    const bad = { ...file, slopes: [{ x: 0, z: 0, slope: 'slash', empty: 'ne' }] };
    expect(readWorld(JSON.parse(JSON.stringify(bad))).slopes).toEqual([
      { tile: tileKey(0, 0), slope: 'slash' },
    ]);
  });
});

describe('Das dreieckige Bodenstück', () => {
  it('lässt genau die leere Ecke aus', () => {
    expect(halfFloorTriangle('nw')).toEqual([
      { x: 0.5, z: -0.5 },
      { x: 0.5, z: 0.5 },
      { x: -0.5, z: 0.5 },
    ]);
  });

  it('ist ein Prisma über dem halben Quadrat, Deckfläche nach oben', () => {
    for (const corner of ['nw', 'ne', 'se', 'sw'] as const) {
      const geometry = halfFloorGeometry(1, 0.1, 1, corner);
      const position = geometry.getAttribute('position');
      // Deckfläche plus drei Seiten zu je zwei Dreiecken.
      expect(position.count).toBe(3 * 7);
      const box = geometry.boundingBox!;
      expect(box.min.y).toBeCloseTo(-0.05);
      expect(box.max.y).toBeCloseTo(0.05);
      // Die leere Ecke liegt außerhalb des Dreiecks: Kein Punkt trifft sie.
      const cx = corner === 'nw' || corner === 'sw' ? -0.5 : 0.5;
      const cz = corner === 'nw' || corner === 'ne' ? -0.5 : 0.5;
      for (let i = 0; i < position.count; i++)
        expect(position.getX(i) === cx && position.getZ(i) === cz).toBe(false);
      // Die Deckfläche zeigt nach oben.
      const normal = geometry.getAttribute('normal');
      expect(normal.getY(0)).toBeCloseTo(1);
    }
  });
});
