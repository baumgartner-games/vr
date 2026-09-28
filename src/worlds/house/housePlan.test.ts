/**
 * **Hausbau** (`housePlan.ts`) — das Haus, die Kisten, und dass die Tapete
 * in jedem Zimmer genau dessen Wände findet (`roomTrace.traceRoom`).
 */
import { ELEMENTS } from '../elements/elementCatalog';
import {
  SHELF_WALL,
  SHELF_WALL_HALF,
  SHELF_WINDOW_PIECES,
  type ShelfWall,
} from '../grid/shelfWalls';
import {
  HOUSE,
  HOUSE_SPOTS,
  NARROW_DOOR,
  PARTITION_X,
  WIDE_DOOR,
  houseSpawn,
  houseWalls,
  onHouseGround,
} from './housePlan';
import { roomTiles, traceRoom, type WallPiece } from './roomTrace';

/** Wie viele Kacheln jedes Stück lang ist. */
const SPAN: Record<string, number> = {
  [SHELF_WALL]: 2,
  [SHELF_WALL_HALF]: 1,
  [SHELF_WINDOW_PIECES.full]: 2,
  [WIDE_DOOR]: 2,
  [NARROW_DOOR]: 1,
};

/** Ein Stück als Strecke von Ecke zu Ecke — Vorderseite links. */
function asPiece(wall: ShelfWall, index: number): WallPiece {
  const half = SPAN[wall.path]! / 2;
  const alongX = Math.abs(Math.cos(wall.yaw)) > 0.5;
  const a = alongX ? { x: wall.x - half, z: wall.z } : { x: wall.x, z: wall.z - half };
  const b = alongX ? { x: wall.x + half, z: wall.z } : { x: wall.x, z: wall.z + half };
  return { id: String(index), a, b, front: { x: -(b.z - a.z), z: b.x - a.x } };
}

describe('Hausbau', () => {
  const walls = houseWalls();
  const pieces = walls.map(asPiece);

  it('baut das Haus nur aus Stücken des Katalogs, alle auf den Fugen', () => {
    for (const wall of walls) {
      expect(SPAN[wall.path]).toBeDefined();
      const piece = asPiece(wall, 0);
      for (const end of [piece.a, piece.b]) {
        expect(Number.isInteger(end.x)).toBe(true);
        expect(Number.isInteger(end.z)).toBe(true);
      }
    }
    // Rundum geschlossen: jede Kante des Umrisses genau einmal belegt.
    const edges = new Set<string>();
    for (const piece of pieces) {
      const steps = Math.abs(piece.b.x - piece.a.x) + Math.abs(piece.b.z - piece.a.z);
      for (let k = 0; k < steps; k++) {
        const sx = Math.sign(piece.b.x - piece.a.x);
        const sz = Math.sign(piece.b.z - piece.a.z);
        const key = `${piece.a.x + sx * k},${piece.a.z + sz * k},${sx},${sz}`;
        expect(edges.has(key)).toBe(false);
        edges.add(key);
      }
    }
    expect(edges.size).toBe(2 * HOUSE.w + 2 * HOUSE.d + HOUSE.d);
  });

  it('findet im Wohnzimmer genau dessen Wände, die Tür zur Küche eingeschlossen', () => {
    const faces = traceRoom(pieces, 6.5, 6.5, 0, -1);
    const found = new Set(faces.map((face) => walls[Number(face.id)]!));
    // Alles westlich der Trennwand oder auf ihr, und nichts von der Küche.
    for (const wall of found) expect(wall.x).toBeLessThanOrEqual(PARTITION_X + 1);
    expect([...found].some((wall) => wall.path === NARROW_DOOR)).toBe(true);
    expect([...found].some((wall) => wall.path === WIDE_DOOR)).toBe(true);
    // Innen: Jede gefundene Seite zeigt ins Zimmer.
    for (const face of faces) {
      const piece = pieces[Number(face.id)]!;
      const mid = { x: (piece.a.x + piece.b.x) / 2, z: (piece.a.z + piece.b.z) / 2 };
      const sign = face.front ? 1 : -1;
      const toRoom = { x: 7 - mid.x, z: 6 - mid.z };
      expect(sign * (piece.front.x * toRoom.x + piece.front.z * toRoom.z)).toBeGreaterThan(0);
    }
  });

  it('findet in der Küche andere Wände als im Wohnzimmer — nur die Trennwand teilen sie', () => {
    const living = traceRoom(pieces, 6.5, 6.5, 0, -1).map((face) => `${face.id}${face.front}`);
    const kitchen = traceRoom(pieces, 12, 6, 0, -1).map((face) => `${face.id}${face.front}`);
    expect(kitchen.length).toBeGreaterThan(0);
    for (const face of kitchen) expect(living).not.toContain(face);
  });

  it('stellt Tapeten-, Boden- und Treppenkisten auf den Boden, vor das Haus', () => {
    expect(HOUSE_SPOTS).toHaveLength(13);
    expect(new Set(HOUSE_SPOTS.map((spot) => `${spot.x},${spot.z}`)).size).toBe(13);
    for (const spot of HOUSE_SPOTS) {
      expect(ELEMENTS.some((element) => element.id === spot.element)).toBe(true);
      expect(onHouseGround(spot.x, spot.z)).toBe(true);
      expect(spot.z).toBeGreaterThanOrEqual(HOUSE.z + HOUSE.d);
    }
    const at = houseSpawn();
    expect(onHouseGround(Math.floor(at.x), Math.floor(at.z))).toBe(true);
  });

  it('findet für den Boden die Kacheln jedes Zimmers — die Türen halten ihn drinnen', () => {
    const living = roomTiles(pieces, 6.5, 6.5)!;
    expect(living).toHaveLength((PARTITION_X - HOUSE.x) * HOUSE.d);
    for (const tile of living) expect(tile.x).toBeLessThan(PARTITION_X);
    const kitchen = roomTiles(pieces, 12.5, 6.5)!;
    expect(kitchen).toHaveLength((HOUSE.x + HOUSE.w - PARTITION_X) * HOUSE.d);
    // Draußen ist kein Raum.
    expect(roomTiles(pieces, 9.5, 14.5)).toBeNull();
  });
});
