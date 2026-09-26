import { boxAround, wallFaces, type WallFace } from './decorPlace';
import {
  FLOOR_STYLES,
  WALL_STYLES,
  blockedEdges,
  floodRoom,
  isWallPanel,
  nearestFace,
  nextStyle,
  onFace,
  panelSpots,
  wallSpots,
} from './surfaceDecor';

/** Ein Zimmer wie das Startzimmer des Bauplatzes: 8 × 8 Kacheln um den Nullpunkt, Wände je Kachel. */
function room(door = false): ReturnType<typeof boxAround>[] {
  const boxes = [];
  for (let i = -4; i < 4; i++) {
    boxes.push(boxAround(i + 0.5, 1.4, -4, 1, 2.8, 0.2)); // Nord
    if (!(door && i === 0)) boxes.push(boxAround(i + 0.5, 1.4, 4, 1, 2.8, 0.2)); // Süd
    boxes.push(boxAround(-4, 1.4, i + 0.5, 0.2, 2.8, 1)); // West
    boxes.push(boxAround(4, 1.4, i + 0.5, 0.2, 2.8, 1)); // Ost
  }
  return boxes;
}

describe('Muster', () => {
  it('alle aus dem KayKit-Regal, Böden eine Kachel, Wände mit Art', () => {
    for (const style of [...FLOOR_STYLES, ...WALL_STYLES]) expect(style.path).toMatch(/\.glb$/);
    for (const style of WALL_STYLES) expect(style.kind).toBeDefined();
    expect(isWallPanel('restaurant-bits/wall_tiles_A.glb')).toBe(true);
    expect(isWallPanel('restaurant-bits/wall.glb')).toBe(false);
  });

  it('das nächste Muster läuft im Kreis', () => {
    expect(nextStyle(FLOOR_STYLES, 0)).toBe(1);
    expect(nextStyle(FLOOR_STYLES, FLOOR_STYLES.length - 1)).toBe(0);
    expect(nextStyle([], 3)).toBe(0);
  });
});

describe('Boden: der Raum um eine Kachel', () => {
  it('ein geschlossenes Zimmer hat 64 Kacheln', () => {
    const blocked = blockedEdges(room(), 0);
    const { tiles, closed } = floodRoom({ col: 0, row: 0 }, blocked);
    expect(closed).toBe(true);
    expect(tiles).toHaveLength(64);
    expect(tiles[0]).toEqual({ col: -4, row: -4 });
  });

  it('durch eine offene Tür läuft er hinaus — draußen ist kein Raum', () => {
    const blocked = blockedEdges(room(true), 0);
    expect(floodRoom({ col: 0, row: 0 }, blocked).closed).toBe(false);
  });

  it('ein Sturz über der Tür schließt den Raum', () => {
    const boxes = [...room(true), boxAround(0.5, 2.45, 4, 1, 0.7, 0.2)];
    expect(floodRoom({ col: 0, row: 0 }, blockedEdges(boxes, 0))).toMatchObject({ closed: true });
  });

  it('niedrige oder dicke Kästen sind keine Wand', () => {
    const blocked = blockedEdges(
      [boxAround(0.5, 0.4, 0, 1, 0.8, 0.2), boxAround(0.5, 1, 0.5, 1, 2, 1)],
      0,
    );
    expect(blocked.size).toBe(0);
  });

  it('eine Innenwand teilt das Zimmer', () => {
    const inner = [];
    for (let i = -4; i < 4; i++) inner.push(boxAround(0, 1.4, i + 0.5, 0.2, 2.8, 1));
    const { tiles } = floodRoom({ col: -1, row: 0 }, blockedEdges([...room(), ...inner], 0));
    expect(tiles).toHaveLength(32);
    expect(tiles.every((tile) => tile.col < 0)).toBe(true);
  });
});

describe('Wand: die gemeinte Seite', () => {
  const faces = wallFaces(room());

  it('die Innenseite der Nordwand, wenn der Kran davor steht', () => {
    const face = nearestFace(0.5, -3.4, faces, 0)!;
    expect(face).toMatchObject({ axis: 'z', normal: 1, from: -4, to: 4 });
    expect(face.at).toBeCloseTo(-3.9);
  });

  it('keine, wenn keine in Reichweite ist', () => {
    expect(nearestFace(0.5, 0.5, faces, 0)).toBeNull();
  });

  it('außen die Außenseite', () => {
    expect(nearestFace(0.5, -4.6, faces, 0)).toMatchObject({ normal: -1 });
  });
});

describe('Wand: Fliesen und ganze Wände', () => {
  const face: WallFace = { axis: 'z', at: -3.9, normal: 1, from: -4, to: 4, bottom: 0, top: 2.8 };
  const panel = { halfWidth: 0.5, halfDepth: 0.04, height: 0.7 };

  it('acht Spalten, vier Reihen, einen Zentimeter vor der Fläche', () => {
    const spots = panelSpots(face, panel, 0);
    expect(spots).toHaveLength(32);
    expect(spots[0]!.x).toBeCloseTo(-3.5);
    expect(spots[0]!.y).toBeCloseTo(0.35);
    expect(spots[0]!.z).toBeCloseTo(-3.9 + 0.05);
    expect(spots.at(-1)!.y).toBeCloseTo(2.45);
    expect(spots[0]!.yaw).toBeCloseTo(0);
  });

  it('eine schmale Fläche bekommt mittig, was ganz passt', () => {
    const spots = panelSpots({ ...face, from: 0, to: 2.5, top: 1.5 }, panel, 0);
    expect(spots.map((spot) => spot.x)).toEqual([0.75, 1.75, 0.75, 1.75]);
  });

  it('eine Seite nach Westen dreht die Fliese', () => {
    const west: WallFace = { axis: 'x', at: 3.9, normal: -1, from: -1, to: 1, bottom: 0, top: 2.8 };
    const spots = panelSpots(west, panel, 0);
    expect(spots[0]!.x).toBeCloseTo(3.85);
    expect(spots[0]!.yaw).toBeCloseTo(-Math.PI / 2);
  });

  it('ganze Wände auf die Fuge: zwei Meter, am Ende einer', () => {
    const spots = wallSpots({ ...face, from: -4, to: 1 }, 0, 2.8);
    expect(spots.map((spot) => [spot.x, spot.z, spot.long])).toEqual([
      [-3, -4, true],
      [-1, -4, true],
      [0.5, -4, false],
    ]);
    expect(spots[0]!.y).toBeCloseTo(1.4);
  });

  it('eine Fliese gehört zu der Seite, vor der sie hängt', () => {
    expect(onFace(face, 0, -3.85)).toBe(true);
    expect(onFace(face, 0, -4.15)).toBe(false);
    expect(onFace(face, 5, -3.85)).toBe(false);
  });
});
