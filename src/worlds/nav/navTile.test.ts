import {
  DIRS,
  DIR_E,
  DIR_N,
  DIR_S,
  DIR_W,
  LEVEL_MAX,
  NO_TILE,
  TILE,
  TILE_MAX,
  TILE_MIN,
  keyLevel,
  keyOnLevel,
  keyX,
  keyZ,
  neighbour,
  opposite,
  tileCentreX,
  tileCentreZ,
  tileIndexAt,
  tileKey,
  tileManhattan,
  wallDir,
  wallKey,
  wallTile,
} from './navTile';

describe('Der Kachelschlüssel', () => {
  const samples: [number, number, number][] = [
    [0, 0, 0],
    [1, -1, 3],
    [-40, 17, 0],
    [TILE_MIN, TILE_MIN, 0],
    [TILE_MAX, TILE_MAX, LEVEL_MAX],
    [TILE_MAX, TILE_MIN, 1],
  ];

  it('packt drei Zahlen in eine und wieder heraus', () => {
    for (const [x, z, level] of samples) {
      const key = tileKey(x, z, level);
      expect(keyX(key)).toBe(x);
      expect(keyZ(key)).toBe(z);
      expect(keyLevel(key)).toBe(level);
    }
  });

  it('gibt für verschiedene Kacheln verschiedene Schlüssel', () => {
    const keys = new Set(samples.map(([x, z, l]) => tileKey(x, z, l)));
    expect(keys.size).toBe(samples.length);
    // Und die Etage ist wirklich Teil des Schlüssels: Dach und Erdgeschoss
    // liegen übereinander und dürfen nicht dieselbe Kachel sein.
    expect(tileKey(3, 4, 0)).not.toBe(tileKey(3, 4, 1));
  });

  it('nimmt nichts an, was außerhalb des Gitters liegt', () => {
    expect(() => tileKey(TILE_MAX + 1, 0, 0)).toThrow(RangeError);
    expect(() => tileKey(0, TILE_MIN - 1, 0)).toThrow(RangeError);
    expect(() => tileKey(0, 0, LEVEL_MAX + 1)).toThrow(RangeError);
    expect(() => tileKey(0.5, 0, 0)).toThrow(RangeError);
  });

  it('legt eine Kachel auf eine andere Etage, ohne sie zu verschieben', () => {
    const key = keyOnLevel(tileKey(-7, 9, 0), 2);
    expect([keyX(key), keyZ(key), keyLevel(key)]).toEqual([-7, 9, 2]);
  });
});

describe('Die Nachbarschaft', () => {
  const middle = tileKey(4, 4, 1);

  it('geht nach Norden auf −Z, wie überall sonst in diesem Projekt', () => {
    expect(keyZ(neighbour(middle, DIR_N))).toBe(3);
    expect(keyZ(neighbour(middle, DIR_S))).toBe(5);
    expect(keyX(neighbour(middle, DIR_E))).toBe(5);
    expect(keyX(neighbour(middle, DIR_W))).toBe(3);
  });

  it('bleibt auf derselben Etage — nach Norden geht es nie nach oben', () => {
    for (const dir of DIRS) {
      expect(keyLevel(neighbour(middle, dir))).toBe(1);
    }
  });

  it('findet über die Gegenrichtung zurück', () => {
    for (const dir of DIRS) {
      expect(neighbour(neighbour(middle, dir), opposite(dir))).toBe(middle);
    }
  });

  it('meldet den Rand des Gitters, statt herumzulaufen', () => {
    expect(neighbour(tileKey(TILE_MIN, 0, 0), DIR_W)).toBe(NO_TILE);
    expect(neighbour(tileKey(0, TILE_MAX, 0), DIR_S)).toBe(NO_TILE);
  });
});

describe('Der Wandschlüssel', () => {
  it('ist von beiden Seiten derselbe', () => {
    const here = tileKey(2, 2, 0);
    expect(wallKey(here, DIR_S)).toBe(wallKey(neighbour(here, DIR_S), DIR_N));
    expect(wallKey(here, DIR_W)).toBe(wallKey(neighbour(here, DIR_W), DIR_E));
    expect(wallKey(here, DIR_N)).toBe(wallKey(neighbour(here, DIR_N), DIR_S));
    expect(wallKey(here, DIR_E)).toBe(wallKey(neighbour(here, DIR_E), DIR_W));
  });

  it('unterscheidet die vier Wände einer Kachel', () => {
    const here = tileKey(2, 2, 0);
    expect(new Set(DIRS.map((dir) => wallKey(here, dir))).size).toBe(4);
  });

  it('sagt, an welcher Kachel er hängt — immer der nördlichen bzw. westlichen', () => {
    const here = tileKey(6, 6, 2);
    const wall = wallKey(here, DIR_S);
    expect(wallTile(wall)).toBe(neighbour(here, DIR_S));
    expect(wallDir(wall)).toBe(DIR_N);
    const east = wallKey(here, DIR_E);
    expect(wallTile(east)).toBe(here);
    expect(wallDir(east)).toBe(DIR_E);
  });
});

describe('Meter und Kacheln', () => {
  it('legt die Mitte einer Kachel in ihre Mitte', () => {
    const key = tileKey(0, 0, 0);
    expect(tileCentreX(key)).toBeCloseTo(TILE / 2, 9);
    expect(tileCentreZ(key)).toBeCloseTo(TILE / 2, 9);
  });

  it('findet von der Mitte wieder in dieselbe Kachel zurück', () => {
    for (const x of [-13, -1, 0, 7, 42]) {
      expect(tileIndexAt(tileCentreX(tileKey(x, 0, 0)))).toBe(x);
    }
  });

  it('schätzt den Weg über die Kanten und nicht die Luftlinie', () => {
    // Drei nach Osten, vier nach Süden: über die Kanten sieben Kacheln, nicht
    // fünf. Die Schätzung darf nie unter dem echten Weg liegen.
    const gap = tileManhattan(tileKey(0, 0, 0), tileKey(3, 4, 0));
    expect(gap).toBeCloseTo(7 * TILE, 9);
  });
});
