/**
 * **Die Treppe im Hausbau** (`stairPlan.ts`) — Richtung, Kacheln, das Haus
 * durch die Türen und ob sie ins Zimmer passt.
 */
import { DIR_E, DIR_N, DIR_S, DIR_W } from '../nav/navTile';
import {
  SHELF_WALL,
  SHELF_WALL_HALF,
  SHELF_WINDOW_PIECES,
  type ShelfWall,
} from '../grid/shelfWalls';
import { HOUSE, NARROW_DOOR, PARTITION_X, WIDE_DOOR, houseWalls } from './housePlan';
import { roomTiles, type WallPiece } from './roomTrace';
import { STAIR_STEPS, STAIR_TILES, houseTiles, stairDir, stairFits, stairTiles } from './stairPlan';

const SPAN: Record<string, number> = {
  [SHELF_WALL]: 2,
  [SHELF_WALL_HALF]: 1,
  [SHELF_WINDOW_PIECES.full]: 2,
  [WIDE_DOOR]: 2,
  [NARROW_DOOR]: 1,
};

function asPiece(wall: ShelfWall, index: number): WallPiece {
  const half = SPAN[wall.path]! / 2;
  const alongX = Math.abs(Math.cos(wall.yaw)) > 0.5;
  const a = alongX ? { x: wall.x - half, z: wall.z } : { x: wall.x, z: wall.z - half };
  const b = alongX ? { x: wall.x + half, z: wall.z } : { x: wall.x, z: wall.z + half };
  return { id: String(index), a, b, front: { x: -(b.z - a.z), z: b.x - a.x } };
}

describe('Treppe', () => {
  const walls = houseWalls();
  const pieces = walls.map(asPiece);
  const doors = new Set(
    walls.flatMap((wall, i) => (wall.path.includes('Doorway') ? [String(i)] : [])),
  );

  it('ist 2 × 8 Zellen: eine Kachel breit, drei Kacheln Stufen und eine Kachel Stand', () => {
    expect(STAIR_STEPS).toBe(3);
    expect(STAIR_TILES).toBe(4);
  });

  it('steigt in Blickrichtung, auf ein Viertel gerundet', () => {
    expect(stairDir(0, -1)).toBe(DIR_N);
    expect(stairDir(0.2, 1)).toBe(DIR_S);
    expect(stairDir(1, 0.3)).toBe(DIR_E);
    expect(stairDir(-1, -0.2)).toBe(DIR_W);
  });

  it('beginnt auf der Kachel vor einem und läuft vier Kacheln weit', () => {
    expect(stairTiles(5.5, 8.5, DIR_N)).toEqual([
      { x: 5, z: 7 },
      { x: 5, z: 6 },
      { x: 5, z: 5 },
      { x: 5, z: 4 },
    ]);
    expect(stairTiles(5.5, 5.5, DIR_E).map((tile) => tile.x)).toEqual([6, 7, 8, 9]);
  });

  it('nimmt als Haus beide Zimmer — durch die Innentür, nicht durch die Haustür ins Freie', () => {
    const house = houseTiles(pieces, doors, 6.5, 6.5)!;
    expect(house).toHaveLength(HOUSE.w * HOUSE.d);
    expect(new Set(house.map((tile) => `${tile.x},${tile.z}`)).size).toBe(house.length);
    expect(houseTiles(pieces, doors, 12.5, 6.5)).toHaveLength(HOUSE.w * HOUSE.d);
    // Draußen ist kein Haus.
    expect(houseTiles(pieces, doors, 9.5, 14.5)).toBeNull();
  });

  it('passt nur ganz ins Zimmer — gegen die Wand gestellt nicht', () => {
    const room = roomTiles(pieces, 5.5, 8.5)!;
    expect(stairFits(room, stairTiles(5.5, 8.5, DIR_N))).toBe(true);
    // Nach Osten durch die Trennwand: der Stand läge in der Küche.
    expect(stairFits(room, stairTiles(PARTITION_X - 3.5, 6.5, DIR_E))).toBe(false);
  });
});
