import { cellKey } from '../nav/cellGrid';
import * as catalog from './elementCatalog';
import {
  FACES,
  faceYaw,
  overlaps,
  rotateOffset,
  spotCells,
  spotCentre,
  spotFront,
  spotGives,
  spotSize,
  spotTiles,
  spotAround,
  spotYaw,
  yawFace,
  type ElementSpot,
} from './elementPlace';

const counter = (x: number, z: number, face?: ElementSpot['face']): ElementSpot => ({
  id: `counter-${x}-${z}`,
  element: 'counter',
  x,
  z,
  ...(face ? { face } : {}),
});

/**
 * **Ein Element, das länger als breit ist** — für die Drehung der Grundfläche.
 * Der Katalog hat heute keines mehr (das Band ist seit dem Wunsch nach
 * _„1x1 conveyer belts"_ eine Kachel), also wird eines untergeschoben.
 */
beforeAll(() => {
  const real = catalog.elementById;
  jest
    .spyOn(catalog, 'elementById')
    .mockImplementation((id) =>
      id === 'long' ? { ...real('belt'), id: 'long', tiles: [1, 2] } : real(id),
    );
});

afterAll(() => jest.restoreAllMocks());

describe('Spielelemente — wo sie stehen', () => {
  it('belegt mit einer Kachel genau ihre vier Zellen', () => {
    const spot = counter(3, 2);
    expect(spotCentre(spot)).toEqual({ x: 3.5, z: 2.5 });
    expect(spotTiles(spot)).toEqual(['3,2']);
    expect(spotCells(spot).sort()).toEqual(
      [cellKey(6, 4), cellKey(7, 4), cellKey(6, 5), cellKey(7, 5)].sort(),
    );
  });

  it('legt ein langes Element nach Osten quer: zwei Kacheln breit, acht Zellen in einer Reihe', () => {
    const belt: ElementSpot = { id: 'b', element: 'long', x: 4, z: 1, face: 'E' };
    expect(spotSize(belt)).toEqual([2, 1]);
    expect(spotTiles(belt)).toEqual(['4,1', '5,1']);
    expect(spotCentre(belt)).toEqual({ x: 5, z: 1.5 });
    const cells = spotCells(belt);
    expect(cells).toHaveLength(8);
    for (let ix = 8; ix <= 11; ix++)
      for (const iz of [2, 3]) expect(cells).toContain(cellKey(ix, iz));
    // Nach Süden steht es längs.
    expect(spotSize({ ...belt, face: 'S' })).toEqual([1, 2]);
    expect(spotTiles({ ...belt, face: 'N' })).toEqual(['4,1', '4,2']);
  });

  it('belegt mit einem Band genau eine Kachel, wohin es auch läuft', () => {
    for (const face of FACES) {
      const belt: ElementSpot = { id: 'b', element: 'belt', x: 4, z: 1, face };
      expect(spotTiles(belt)).toEqual(['4,1']);
      expect(spotCells(belt)).toHaveLength(4);
    }
  });

  it('belegt mit einem Tisch 2 × 2 Kacheln und sechzehn Zellen', () => {
    const table: ElementSpot = { id: 't', element: 'table-round', x: 0, z: 0 };
    expect(spotTiles(table)).toEqual(['0,0', '1,0', '0,1', '1,1']);
    expect(spotCells(table)).toHaveLength(16);
    expect(spotCentre(table)).toEqual({ x: 1, z: 1 });
  });

  it('dreht wie three.js: Süden 0, Osten π/2, Norden π, Westen −π/2', () => {
    expect(spotYaw(counter(0, 0))).toBe(0);
    expect(faceYaw('E')).toBeCloseTo(Math.PI / 2);
    expect(faceYaw('N')).toBeCloseTo(Math.PI);
    expect(faceYaw('W')).toBeCloseTo(-Math.PI / 2);
    // Der Versatz dreht mit, genau wie `rotation.y` ihn drehte.
    for (const face of FACES) {
      const yaw = faceYaw(face);
      const [x, z] = rotateOffset(face, [0.3, 0.1]);
      expect(x).toBeCloseTo(0.3 * Math.cos(yaw) + 0.1 * Math.sin(yaw));
      expect(z).toBeCloseTo(-0.3 * Math.sin(yaw) + 0.1 * Math.cos(yaw));
    }
    // Die Vorderseite +z zeigt dorthin, wohin das Element schaut.
    expect(rotateOffset('E', [0, 1])).toEqual([1, -0]);
    expect(rotateOffset('W', [0, 1])).toEqual([-1, 0]);
  });

  it('hat die Vorderkante auf der Seite, auf die es schaut', () => {
    expect(spotFront(counter(3, 2))).toEqual({ x: 3.5, z: 3 });
    expect(spotFront(counter(3, 2, 'N'))).toEqual({ x: 3.5, z: 2 });
    expect(spotFront(counter(3, 2, 'E'))).toEqual({ x: 4, z: 2.5 });
    expect(spotFront(counter(3, 2, 'W'))).toEqual({ x: 3, z: 2.5 });
    // Bei einem langen Element ist die Vorderseite die schmale Seite, zu der es schaut.
    expect(spotFront({ id: 'b', element: 'long', x: 4, z: 1, face: 'E' })).toEqual({
      x: 6,
      z: 1.5,
    });
  });

  it('nimmt, was die Stelle hergibt, vor dem, was die Kiste vorschlägt', () => {
    expect(spotGives({ id: 'c', element: 'crate-steak', x: 0, z: 0 })).toBe('patty');
    expect(spotGives({ id: 'c', element: 'crate-steak', x: 0, z: 0, gives: 'steak' })).toBe(
      'steak',
    );
    expect(spotGives(counter(0, 0))).toBeNull();
  });

  it('findet Kacheln, die zwei Stellen belegen', () => {
    const spots: ElementSpot[] = [
      counter(0, 0),
      counter(1, 0),
      { id: 'b', element: 'long', x: 1, z: 0 },
      { id: 't', element: 'table-round', x: 4, z: 4 },
      counter(5, 5),
    ];
    expect(overlaps(spots).sort()).toEqual(['1,0', '5,5']);
    expect(overlaps([counter(0, 0), counter(1, 0)])).toEqual([]);
  });
});

describe('Hinstellen aus der Hand', () => {
  it('liest die Blickrichtung aus einer Drehung — die Gegenrichtung von faceYaw', () => {
    for (const face of FACES) expect(yawFace(faceYaw(face))).toBe(face);
    expect(yawFace(0.3)).toBe('S');
    expect(yawFace(Math.PI / 2 + 0.4)).toBe('E');
    expect(yawFace(-Math.PI)).toBe('N');
    expect(yawFace(3 * Math.PI)).toBe('N');
    expect(yawFace(Number.NaN)).toBe('S');
  });

  it('nimmt für eine Kachel die Kachel, auf die der Punkt fällt', () => {
    for (const [x, z] of [
      [4.1, 2.9],
      [4.5, 2.5],
      [4.95, 2.02],
    ] as const) {
      expect(spotAround('a', 'counter', x, z, 'S')).toMatchObject({ x: 4, z: 2, face: 'S' });
    }
    expect(spotAround('a', 'counter', -0.2, -1.7, 'W')).toMatchObject({ x: -1, z: -2 });
  });

  it('nimmt für den Tisch die Stelle, deren Mitte dem Punkt am nächsten ist', () => {
    const spot = spotAround('t', 'table-round', 4.3, 2.6, 'S');
    expect(spot).toMatchObject({ x: 3, z: 2 });
    expect(spotCentre(spot)).toEqual({ x: 4, z: 3 });
  });
});
