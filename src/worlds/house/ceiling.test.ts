/**
 * **Die Decke über einem geschlossenen Raum** (`ceiling.ts`) — schließen legt
 * sie, aufbrechen nimmt sie, solange oben nichts auf ihr steht.
 */
import { ceilingChange, ceilingKey, type CeilingStorey } from './ceiling';
import { closedRooms, type WallPiece } from './roomTrace';

/** Ein Stück von (ax, az) nach (bx, bz), Vorderseite links der Richtung. */
function piece(id: string, ax: number, az: number, bx: number, bz: number): WallPiece {
  return { id, a: { x: ax, z: az }, b: { x: bx, z: bz }, front: { x: -(bz - az), z: bx - ax } };
}

/** Ein Raum von 2 × 2 Kacheln ab (x, z); `open` lässt die Südwand weg. */
function box(x: number, z: number, open = false): WallPiece[] {
  const walls = [
    piece('n', x, z, x + 2, z),
    piece('e', x + 2, z, x + 2, z + 2),
    piece('w', x, z + 2, x, z),
  ];
  if (!open) walls.push(piece('s', x + 2, z + 2, x, z + 2));
  return walls;
}

const none = (): boolean => false;
const keys = (tiles: Array<{ x: number; z: number; level: number }>) =>
  tiles.map((tile) => ceilingKey(tile.x, tile.z, tile.level)).sort();

describe('closedRooms', () => {
  it('findet jeden geschlossenen Raum einmal, das Freie nicht', () => {
    const rooms = closedRooms([...box(0, 0), ...box(5, 0)]);
    expect(rooms.map((room) => room.length)).toEqual([4, 4]);
  });

  it('ein offener Raum ist keiner', () => {
    expect(closedRooms(box(0, 0, true))).toEqual([]);
  });
});

describe('ceilingChange', () => {
  it('schließen legt die Decke auf die Etage darüber', () => {
    const storeys: CeilingStorey[] = [{ level: 0, pieces: box(0, 0) }];
    const { lay, drop } = ceilingChange(storeys, new Set(), none, none);
    expect(keys(lay)).toEqual(['0,0,1', '0,1,1', '1,0,1', '1,1,1']);
    expect(drop).toEqual([]);
  });

  it('was schon liegt, wird keine Decke — und die Decke nicht zweimal gelegt', () => {
    const storeys: CeilingStorey[] = [{ level: 0, pieces: box(0, 0) }];
    const floored = (x: number, z: number) => x === 0 && z === 0;
    const { lay } = ceilingChange(storeys, new Set(['1,0,1']), floored, none);
    expect(keys(lay)).toEqual(['0,1,1', '1,1,1']);
  });

  it('aufbrechen nimmt die Decke wieder weg', () => {
    const ceiling = new Set(['0,0,1', '0,1,1', '1,0,1', '1,1,1']);
    const storeys: CeilingStorey[] = [{ level: 0, pieces: box(0, 0, true) }];
    const { lay, drop } = ceilingChange(storeys, ceiling, none, none);
    expect(lay).toEqual([]);
    expect(keys(drop)).toEqual([...ceiling].sort());
  });

  it('was oben auf der Decke steht, hält sie — Belag, Möbel, Treppe', () => {
    const ceiling = new Set(['0,0,1', '0,1,1', '1,0,1', '1,1,1']);
    const storeys: CeilingStorey[] = [{ level: 0, pieces: box(0, 0, true) }];
    const used = (x: number, z: number) => x === 1 && z === 1;
    const { drop } = ceilingChange(storeys, ceiling, none, used);
    expect(keys(drop)).toEqual(['0,0,1', '0,1,1', '1,0,1']);
  });

  it('ein Raum oben hält die Decke darunter — das Obergeschoss stürzt nicht ein', () => {
    const ceiling = new Set(['0,0,1', '0,1,1', '1,0,1', '1,1,1']);
    const storeys: CeilingStorey[] = [
      { level: 0, pieces: box(0, 0, true) },
      { level: 1, pieces: box(0, 0) },
    ];
    const { lay, drop } = ceilingChange(storeys, ceiling, none, none);
    expect(drop).toEqual([]);
    // Und der Raum oben bekommt seine eigene Decke.
    expect(keys(lay)).toEqual(['0,0,2', '0,1,2', '1,0,2', '1,1,2']);
  });

  it('eine Wand oben hält die Kacheln an ihr, der Rest geht', () => {
    const ceiling = new Set(['0,0,1', '0,1,1', '1,0,1', '1,1,1']);
    const storeys: CeilingStorey[] = [
      { level: 0, pieces: box(0, 0, true) },
      { level: 1, pieces: [piece('n', 0, 0, 1, 0)] },
    ];
    const { drop } = ceilingChange(storeys, ceiling, none, none);
    expect(keys(drop)).toEqual(['0,1,1', '1,0,1', '1,1,1']);
  });
});
