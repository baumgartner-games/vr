import { elementById, hasElement, FURNITURE_CATALOGUE } from '../elements/elementCatalog';
import {
  overlaps,
  rotateOffset,
  spotCells,
  spotFace,
  spotFront,
  spotTiles,
  type ElementSpot,
} from '../elements/elementPlace';
import { elementStations, stationKind } from '../elements/stationLayer';
import { CELL, CellGrid, navCellSource, type CellPos } from '../nav/cellGrid';
import { DIR_E, DIR_N, DIR_S, DIR_W, tileKey } from '../nav/navTile';
import { SHELF_WALL_Y } from '../grid/shelfWalls';
import { WALL_MODELS } from '../elements/elementCatalog';
import { PLATE_PROTOTYPE } from '../test/floorPlate';
import { DINING_AREA, DOOR_X, KITCHEN_AREA, RETURN_GATE_TILE, ROOM } from './plateUpPlan';
import {
  DINING_FLOOR,
  KITCHEN_FLOOR,
  KITCHEN_SPOTS,
  SPOTS,
  DOOR_MODEL,
  onFloor,
  plateUpRoomPlan,
  roomFloor,
  roomWalls,
  spawn,
} from './plateUpRoom';

/**
 * **Das Restaurant aus dem Möbelkatalog** — Böden, Küche, Wände, und nichts
 * sonst (`plateUpRoom.ts`).
 */

/**
 * **Das Zellgitter der Welt**: der Plan, darin gesperrt, was die Stellen
 * sperren, und die Wände an den Kanten des Raums — so, wie die Regalwände
 * einrasten (`GridWorld.collectWalls`). `shut` schließt auch die Tür.
 */
function roomGrid(walls = false, shut = false): CellGrid {
  const plan = plateUpRoomPlan();
  if (walls) {
    const south = ROOM.z + ROOM.d - 1;
    for (let x = ROOM.x; x < ROOM.x + ROOM.w; x++) {
      plan.wall(x, ROOM.z, DIR_N);
      if (shut || !DOOR_X.includes(x)) plan.wall(x, south, DIR_S);
    }
    for (let z = ROOM.z; z <= south; z++) {
      plan.wall(ROOM.x, z, DIR_W);
      plan.wall(ROOM.x + ROOM.w - 1, z, DIR_E);
    }
  }
  const blocked = new Set(SPOTS.flatMap(spotCells));
  return new CellGrid(
    navCellSource(plan.graph, () => null, {
      voidIsFree: false,
      blocked: (ix, iz, level) => level === 0 && blocked.has(`${ix},${iz},${level}`),
    }),
  );
}

/** Wo die Figur mitten auf der Kachel (`x`, `z`) steht, in halben Metern. */
function cellOf(x: number, z: number): CellPos {
  return { cx: Math.round((x + 0.5) / CELL), cz: Math.round((z + 0.5) / CELL) };
}

/** Die Kachel vor der Vorderseite einer Stelle — dort steht, wer davor steht. */
function tileAhead(spot: ElementSpot): [number, number] {
  const front = spotFront(spot);
  const [dx, dz] = rotateOffset(spotFace(spot), [0, 0.5]);
  return [Math.floor(front.x + dx), Math.floor(front.z + dz)];
}

/** Alle Stellungen, die man von `from` aus zu Fuß erreicht. */
function reach(grid: CellGrid, from: CellPos): Set<string> {
  const seen = new Set([`${from.cx},${from.cz}`]);
  const queue = [from];
  while (queue.length > 0) {
    const at = queue.pop()!;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const to = { cx: at.cx + dx, cz: at.cz + dz };
      const key = `${to.cx},${to.cz}`;
      if (seen.has(key) || !grid.canStep(at, to)) continue;
      seen.add(key);
      queue.push(to);
    }
  }
  return seen;
}

describe('Restaurant — der Boden', () => {
  it('legt Fliesen in die Küche, Dielen in den Gastraum und draußen den Prototyp-Boden', () => {
    const kitchenEnd = KITCHEN_AREA.z + KITCHEN_AREA.d;
    for (let z = ROOM.z; z < ROOM.z + ROOM.d; z++)
      for (let x = ROOM.x; x < ROOM.x + ROOM.w; x++)
        expect(roomFloor(x, z)).toBe(z < kitchenEnd ? KITCHEN_FLOOR : DINING_FLOOR);
    expect(DINING_AREA.z).toBe(KITCHEN_AREA.z + KITCHEN_AREA.d);
    expect(roomFloor(ROOM.x - 1, 0)).toBe(PLATE_PROTOTYPE);
    expect(roomFloor(RETURN_GATE_TILE.x, RETURN_GATE_TILE.z)).toBe(PLATE_PROTOTYPE);
  });

  it('hat Boden unter dem Raum, unter den Wänden und unter dem Gehweg, und man kommt darauf an', () => {
    const plan = plateUpRoomPlan();
    for (const spot of SPOTS)
      for (const tile of spotTiles(spot)) {
        const [x, z] = tile.split(',').map(Number) as [number, number];
        expect({ id: spot.id, floor: onFloor(x, z) }).toEqual({ id: spot.id, floor: true });
        expect(plan.graph.has(tileKey(x, z, 0))).toBe(true);
      }
    const at = spawn();
    expect(plan.graph.has(tileKey(Math.floor(at.x), Math.floor(at.z), 0))).toBe(true);
    expect([at.x % 1, at.z % 1]).toEqual([0.5, 0.5]);
  });
});

describe('Restaurant — was darin steht', () => {
  it('stellt nur Elemente hin, die es gibt, ohne Überlappen und nicht auf den Ankunftsort', () => {
    const at = spawn();
    const start = `${Math.floor(at.x)},${Math.floor(at.z)}`;
    for (const spot of SPOTS) {
      expect(hasElement(spot.element)).toBe(true);
      expect(spotTiles(spot)).not.toContain(start);
    }
    expect(overlaps(SPOTS)).toEqual([]);
    expect(new Set(SPOTS.map((spot) => spot.id)).size).toBe(SPOTS.length);
  });

  it('nimmt in der Küche nur Möbel aus dem Möbelkatalog — keinen Tisch, keinen Stuhl — und jedes ist eine Station', () => {
    for (const spot of KITCHEN_SPOTS) {
      expect(FURNITURE_CATALOGUE).toContain(spot.element);
      expect(stationKind(elementById(spot.element))).not.toBeNull();
      expect(elementStations(spot).length).toBeGreaterThan(0);
      // In der Küche, und nicht im Gastraum.
      for (const tile of spotTiles(spot)) {
        const z = Number(tile.split(',')[1]);
        expect(z).toBeLessThan(KITCHEN_AREA.z + KITCHEN_AREA.d);
      }
    }
    expect(SPOTS.some((spot) => /table|chair/.test(spot.element))).toBe(false);
  });

  it('umschließt den Raum mit den Regalwänden aus dem Möbelkatalog, auf den Fugen — die Tür als Durchgang', () => {
    const walls = roomWalls();
    const south = ROOM.z + ROOM.d;
    const east = ROOM.x + ROOM.w;
    // Welche Meter jeder Seite ein Stück deckt — gezählt je Kachelkante.
    const edges = new Set<string>();
    for (const wall of walls) {
      expect(WALL_MODELS).toContain(wall.path);
      expect(wall.y).toBe(SHELF_WALL_Y);
      const alongX = wall.yaw === 0;
      const length = /Narrow|Half/.test(wall.path) ? 1 : 2;
      const line = alongX ? wall.z : wall.x;
      // Auf einer Fuge, nicht mitten auf einer Kachel.
      expect(Number.isInteger(line)).toBe(true);
      const from = (alongX ? wall.x : wall.z) - length / 2;
      for (let i = 0; i < length; i++) edges.add(`${alongX ? 'x' : 'z'}:${line}:${from + i}`);
    }
    for (let x = ROOM.x; x < east; x++) {
      expect(edges.has(`x:${ROOM.z}:${x}`)).toBe(true);
      expect(edges.has(`x:${south}:${x}`)).toBe(true);
    }
    for (let z = ROOM.z; z < south; z++) {
      expect(edges.has(`z:${ROOM.x}:${z}`)).toBe(true);
      expect(edges.has(`z:${east}:${z}`)).toBe(true);
    }
    // Die Tür ist der breite Durchgang über genau den Türkacheln.
    const door = walls.filter((wall) => wall.path === DOOR_MODEL);
    expect(door).toEqual([
      { path: DOOR_MODEL, x: DOOR_X[0]! + 1, y: SHELF_WALL_Y, z: south, yaw: 0 },
    ]);
    // Kein Stück doppelt: 7 + 3 + 3 + 6 + 6 Fensterwände und die Tür.
    expect(walls).toHaveLength(26);
    expect(edges.size).toBe(2 * ROOM.w + 2 * ROOM.d);
  });
});

describe('Restaurant — die Wege', () => {
  const grid = roomGrid();
  const at = spawn();
  const start = cellOf(Math.floor(at.x), Math.floor(at.z));
  const reached = reach(grid, start);
  const can = (x: number, z: number): boolean => {
    const pos = cellOf(x, z);
    return reached.has(`${pos.cx},${pos.cz}`);
  };

  it('steht bei der Ankunft frei', () => {
    expect(grid.footprintFree(start)).toBe(true);
  });

  it('kommt vor jedes Möbel der Küche', () => {
    for (const spot of KITCHEN_SPOTS) {
      const [x, z] = tileAhead(spot);
      expect({ id: spot.id, reached: can(x, z) }).toEqual({ id: spot.id, reached: true });
    }
  });

  it('kommt in jede Ecke des Gastraums, durch die Tür auf den Gehweg und zum Tor', () => {
    const east = DINING_AREA.x + DINING_AREA.w - 1;
    const south = DINING_AREA.z + DINING_AREA.d - 1;
    for (const [x, z] of [
      [DINING_AREA.x, DINING_AREA.z],
      [east, DINING_AREA.z],
      [DINING_AREA.x, south],
      [east, south],
    ] as const)
      expect({ x, z, reached: can(x, z) }).toEqual({ x, z, reached: true });
    expect(can(DOOR_X[0]!, ROOM.z + ROOM.d)).toBe(true);
    expect(can(RETURN_GATE_TILE.x + 1, RETURN_GATE_TILE.z - 1)).toBe(true);
  });

  it('kommt nur durch die Tür hinaus — mit den Wänden als Kanten, wie sie einrasten', () => {
    const closed = roomGrid(true, true);
    const inside = reach(closed, start);
    const outside = cellOf(RETURN_GATE_TILE.x + 1, RETURN_GATE_TILE.z - 1);
    expect(inside.has(`${outside.cx},${outside.cz}`)).toBe(false);
    const open = reach(roomGrid(true), start);
    expect(open.has(`${outside.cx},${outside.cz}`)).toBe(true);
  });
});
