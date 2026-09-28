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
import { tileKey } from '../nav/navTile';
import { PLATE_PROTOTYPE } from '../test/floorPlate';
import { DINING_AREA, DOOR_X, KITCHEN_AREA, RETURN_GATE_TILE, ROOM } from './plateUpPlan';
import {
  DINING_FLOOR,
  KITCHEN_FLOOR,
  KITCHEN_SPOTS,
  SPOTS,
  WALL_SPOTS,
  onFloor,
  plateUpRoomPlan,
  roomFloor,
  spawn,
} from './plateUpRoom';

/**
 * **Das Restaurant aus dem Möbelkatalog** — Böden, Küche, Wände, und nichts
 * sonst (`plateUpRoom.ts`).
 */

/** Das Zellgitter der Welt: der Plan, und darin gesperrt, was die Stellen sperren. */
function roomGrid(): CellGrid {
  const blocked = new Set(SPOTS.flatMap(spotCells));
  return new CellGrid(
    navCellSource(plateUpRoomPlan().graph, () => null, {
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

  it('umschließt den Raum mit der Wand aus dem Möbelkatalog, bis auf die Tür', () => {
    expect(WALL_SPOTS.every((spot) => spot.element === 'wall')).toBe(true);
    // Jede Kachel des Rings außer den Ecken trägt eine Wand — außer der Tür.
    const walled = new Set(WALL_SPOTS.flatMap(spotTiles));
    const south = ROOM.z + ROOM.d;
    for (let x = ROOM.x; x < ROOM.x + ROOM.w; x++) {
      expect(walled.has(`${x},${ROOM.z - 1}`)).toBe(true);
      expect(walled.has(`${x},${south}`)).toBe(!DOOR_X.includes(x));
    }
    for (let z = ROOM.z; z < south; z++) {
      expect(walled.has(`${ROOM.x - 1},${z}`)).toBe(true);
      expect(walled.has(`${ROOM.x + ROOM.w},${z}`)).toBe(true);
    }
    // Die Vorderseite nach innen: Dort steht die Wand bündig am Rand des Bodens.
    for (const spot of WALL_SPOTS) {
      const [x, z] = tileAhead(spot);
      const inside = x >= ROOM.x && x < ROOM.x + ROOM.w && z >= ROOM.z && z < south;
      expect({ id: spot.id, inside }).toEqual({ id: spot.id, inside: true });
    }
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

  it('kommt nicht durch die Wände: an keine Kachel des Rings', () => {
    for (const spot of WALL_SPOTS)
      for (const tile of spotTiles(spot)) {
        const [x, z] = tile.split(',').map(Number) as [number, number];
        expect({ tile, reached: can(x, z) }).toEqual({ tile, reached: false });
      }
  });
});
