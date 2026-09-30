/**
 * **Wohin der Bodenbelag kommt** (`flooring.flooringAim`) — im Raum überall,
 * ohne Wände die Kachel vor einem.
 */
import { flooringAim, halveSlanted } from './flooring';

describe('flooringAim', () => {
  const room = [
    { x: 0, z: 0 },
    { x: 1, z: 0 },
    { x: 2, z: 0 },
  ];

  it('legt im Raum jede Kachel, auf die Boden darf — auch ohne Boden darunter', () => {
    const aim = flooringAim(room, { x: 5, z: 5 }, (tile) => tile.x !== 1);
    expect(aim).toEqual({
      tiles: [
        { x: 0, z: 0 },
        { x: 2, z: 0 },
      ],
      room: true,
    });
  });

  it('legt ohne Wände die Kachel vor einem, und der Belag bleibt in der Hand', () => {
    expect(flooringAim(null, { x: 3, z: 4 }, () => true)).toEqual({
      tiles: [{ x: 3, z: 4 }],
      room: false,
    });
  });

  it('legt nichts, wo kein Boden darf', () => {
    expect(flooringAim(null, { x: 3, z: 4 }, () => false)).toBeNull();
    expect(flooringAim(room, { x: 3, z: 4 }, () => false)).toBeNull();
  });
});

/**
 * **Unter einer Wand unter 45° nur die eine Hälfte** (`halveSlanted`) — wie
 * der halbe Boden der Station, nur behält die andere Hälfte ihren Belag.
 */
describe('halveSlanted', () => {
  // Ein Raum nordöstlich einer Schräge ╲ durch (1,1): Sie trennt Nordost und Südwest.
  const slanted = new Map([['1,1', ['ne', 'sw'] as const]]);

  it('gibt im Raum der Schrägkachel nur die Hälfte zum Raum hin', () => {
    const aim = halveSlanted(
      {
        tiles: [
          { x: 1, z: 0 },
          { x: 2, z: 1 },
          { x: 1, z: 1 },
        ],
        room: true,
      },
      slanted,
      { x: 1.5, z: 0.5 },
    );
    expect(aim.tiles).toEqual([
      { x: 1, z: 0 },
      { x: 2, z: 1 },
      { x: 1, z: 1, empty: 'sw' },
    ]);
  });

  it('legt die ganze Kachel, wenn der Raum auf beiden Seiten liegt', () => {
    const aim = halveSlanted(
      {
        tiles: [
          { x: 1, z: 1 },
          { x: 1, z: 0 },
          { x: 0, z: 1 },
        ],
        room: true,
      },
      slanted,
      { x: 1.5, z: 1.5 },
    );
    expect(aim.tiles[0]).toEqual({ x: 1, z: 1 });
  });

  it('gibt ohne Raum die Hälfte zum Spieler hin', () => {
    const aim = halveSlanted({ tiles: [{ x: 1, z: 1 }], room: false }, slanted, { x: 0, z: 3 });
    expect(aim).toEqual({ tiles: [{ x: 1, z: 1, empty: 'ne' }], room: false });
  });
});
