/**
 * **Welche Wände zu einem Raum gehören** (`roomTrace.ts`) — vom Blick auf die
 * erste Wand, an ihr entlang in beide Richtungen.
 */
import { firstWall, roomTiles, slantedTiles, traceRoom, type WallPiece } from './roomTrace';

/** Ein Stück von (ax, az) nach (bx, bz), Vorderseite links der Richtung. */
function piece(id: string, ax: number, az: number, bx: number, bz: number): WallPiece {
  return { id, a: { x: ax, z: az }, b: { x: bx, z: bz }, front: { x: -(bz - az), z: bx - ax } };
}

/** Ein Raum von 4 × 4 Kacheln, jede Seite aus zwei Stücken zu zwei Kacheln. */
function square(): WallPiece[] {
  return [
    piece('n1', 0, 0, 2, 0),
    piece('n2', 2, 0, 4, 0),
    piece('e1', 4, 0, 4, 2),
    piece('e2', 4, 2, 4, 4),
    piece('s1', 4, 4, 2, 4),
    piece('s2', 2, 4, 0, 4),
    piece('w1', 0, 4, 0, 2),
    piece('w2', 0, 2, 0, 0),
  ];
}

const ids = (faces: { id: string }[]) => faces.map((face) => face.id).sort();

describe('traceRoom', () => {
  it('trifft die erste Wand im Blick, auf der Seite zum Spieler', () => {
    const found = firstWall(square(), 2, 2, 0, -1)!;
    expect(found.hit.distance).toBeCloseTo(2);
  });

  it('läuft einen geschlossenen Raum ganz herum — jede Wand, die Innenseite', () => {
    const faces = traceRoom(square(), 1.5, 2.5, 0, -1);
    expect(ids(faces)).toEqual(['e1', 'e2', 'n1', 'n2', 's1', 's2', 'w1', 'w2']);
    // Links von (0,0) → (2,0) ist in x/z +z, also Süden — innen. So herum
    // gezogen, ist die Vorderseite jedes Stücks die Innenseite.
    for (const face of faces) expect(face.front).toBe(true);
  });

  it('nimmt von außen die Außenseiten', () => {
    const faces = traceRoom(square(), 2, -3, 0, 1);
    expect(ids(faces)).toHaveLength(8);
    for (const face of faces) expect(face.front).toBe(false);
  });

  it('bleibt an einer Ecke innen, auch wenn draußen eine Wand weitergeht', () => {
    const walls = [...square(), piece('x', 4, 0, 7, 0), piece('y', 0, 4, 0, 7)];
    expect(ids(traceRoom(walls, 2, 2, 0, -1))).not.toContain('x');
    expect(ids(traceRoom(walls, 2, 2, 0, -1))).not.toContain('y');
  });

  it('springt am Ende einer offenen Wand nicht auf die Rückseite', () => {
    // Ein U, nach Süden offen.
    const walls = [piece('w', 0, 3, 0, 0), piece('n', 0, 0, 3, 0), piece('e', 3, 0, 3, 3)];
    const faces = traceRoom(walls, 1.5, 1.5, 0, -1);
    expect(ids(faces)).toEqual(['e', 'n', 'w']);
    expect(new Set(faces.map((face) => `${face.id}${face.front}`)).size).toBe(3);
  });

  it('zählt Türen und Fenster wie Wände — sie sind Stücke wie jedes andere', () => {
    const walls = square().map((one) => (one.id === 'n2' ? { ...one, id: 'door' } : one));
    expect(ids(traceRoom(walls, 2, 2, 1, 0))).toContain('door');
  });

  it('nimmt einen Stummel im Raum von beiden Seiten, und der Raum bleibt ganz', () => {
    const walls = [...square(), piece('stub', 2, 4, 2, 2)];
    const faces = traceRoom(walls, 1, 1, 0, -1);
    expect(ids(faces).filter((id) => id === 'stub')).toHaveLength(2);
    expect(ids(faces)).toHaveLength(10);
  });

  it('läuft auch an einer Schräge entlang', () => {
    // Ein Dreieck: Nordwand, Westwand und eine Schräge ╲ dazwischen.
    const walls = [piece('n', 0, 0, 3, 0), piece('d', 3, 0, 0, 3), piece('w', 0, 3, 0, 0)];
    expect(ids(traceRoom(walls, 0.8, 0.8, 0, -1))).toEqual(['d', 'n', 'w']);
  });

  it('findet nichts, wenn keine Wand im Blick ist', () => {
    expect(traceRoom(square(), 2, 2, 0, 0)).toEqual([]);
    expect(traceRoom(square(), 50, 50, 1, 0)).toEqual([]);
  });
});

describe('roomTiles', () => {
  it('füllt einen geschlossenen Raum, Kachel für Kachel', () => {
    const tiles = roomTiles(square(), 1.5, 2.5)!;
    expect(tiles).toHaveLength(16);
    for (const tile of tiles) {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.x).toBeLessThan(4);
      expect(tile.z).toBeGreaterThanOrEqual(0);
      expect(tile.z).toBeLessThan(4);
    }
  });

  it('gibt im Freien keinen Raum — der Boden liefe bis zum Horizont', () => {
    expect(roomTiles(square(), 10, 10)).toBeNull();
    const open = square().filter((one) => one.id !== 's1');
    expect(roomTiles(open, 1.5, 1.5)).toBeNull();
  });

  it('hört an einer Schräge auf und nimmt ihre Kachel mit', () => {
    // Dreieck aus Nord- und Westwand und der Schräge von (3,0) nach (0,3).
    const walls = [piece('n', 0, 0, 3, 0), piece('d', 3, 0, 0, 3), piece('w', 0, 3, 0, 0)];
    const tiles = roomTiles(walls, 0.5, 0.5, 50)!;
    const keys = new Set(tiles.map((tile) => `${tile.x},${tile.z}`));
    expect(keys.has('0,0')).toBe(true);
    expect(keys.has('1,1')).toBe(true);
    expect(keys.has('3,3')).toBe(false);
  });
});

describe('slantedTiles', () => {
  it('nennt je Kachel unter einer Wand unter 45° die beiden Ecken, die sie trennt', () => {
    const tiles = slantedTiles([
      piece('a', 0, 0, 2, 2),
      piece('b', 5, 1, 4, 0),
      piece('c', 0, 3, 1, 2),
      piece('gerade', 0, 5, 2, 5),
    ]);
    expect([...tiles]).toEqual([
      ['0,0', ['ne', 'sw']],
      ['1,1', ['ne', 'sw']],
      ['4,0', ['ne', 'sw']],
      ['0,2', ['nw', 'se']],
    ]);
  });
});
