/**
 * **Wohin der Bodenbelag kommt** (`flooring.flooringAim`) — im Raum überall,
 * ohne Wände die Kachel vor einem.
 */
import { flooringAim } from './flooring';

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
