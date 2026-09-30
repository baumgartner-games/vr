/**
 * **Nur die Wände des eigenen Raums, ohne die oberen und die an den Seiten**
 * (`roomWalls.ts`). Das Haus ist das aus dem Hausbau in klein: zwei Zimmer
 * nebeneinander, eine Trennwand dazwischen, Wände von 2,8 m.
 */
import type { GhostCandidate } from './wallGhost';
import { roomWallsToClear, wallLike } from './roomWalls';

function wall(
  x: number,
  z: number,
  w: number,
  d: number,
  name: string,
): GhostCandidate & { name: string } {
  return { box: { x, y: 1.4, z, w, h: 2.8, d }, name };
}

const T = 0.26;
/** West 0 … Ost 10, Nord 0 … Süd 6; die Trennwand bei x = 5. */
const HOUSE = [
  wall(2.5, 0, 5, T, 'north-west'),
  wall(7.5, 0, 5, T, 'north-east'),
  wall(2.5, 6, 5, T, 'south-west'),
  wall(7.5, 6, 5, T, 'south-east'),
  wall(0, 3, T, 6, 'west'),
  wall(10, 3, T, 6, 'east'),
  wall(5, 3, T, 6, 'partition'),
];

const CAMERA = { x: 2.5, y: 30, z: 28 };
const INSIDE_WEST = { x: 2.5, y: 0.9, z: 3 };

const names = (list: readonly (GhostCandidate & { name?: string })[] | null): string[] | null =>
  list === null ? null : list.map((one) => (one as { name: string }).name).sort();

describe('Die Wände des eigenen Raums', () => {
  it('nimmt nur die Front des eigenen Zimmers — nicht oben, nicht die Seiten, nicht das Nachbarzimmer', () => {
    expect(names(roomWallsToClear(CAMERA, INSIDE_WEST, HOUSE))).toEqual(['south-west']);
  });

  it('gilt im anderen Zimmer genauso', () => {
    const east = { x: 7.5, y: 0.9, z: 3 };
    expect(names(roomWallsToClear({ ...CAMERA, x: 7.5 }, east, HOUSE))).toEqual(['south-east']);
  });

  it('nimmt eine Zwischenwand mit, die unter der oberen liegt', () => {
    // Eine halbe Querwand im Westzimmer: Nördlich von ihr ist Raum, also ist
    // sie nicht die, die die Linie von oben zuerst trifft.
    const shelf = wall(1.5, 2, 3, T, 'inner');
    expect(names(roomWallsToClear(CAMERA, INSIDE_WEST, [...HOUSE, shelf]))).toEqual([
      'inner',
      'south-west',
    ]);
  });

  it('lässt Möbel stehen, auch wenn sie im Raum vorn stehen', () => {
    const fridge = { box: { x: 2.5, y: 1, z: 5, w: 0.8, h: 2, d: 0.8 }, name: 'fridge' };
    expect(wallLike(fridge.box)).toBe(false);
    expect(names(roomWallsToClear(CAMERA, INSIDE_WEST, [...HOUSE, fridge]))).toEqual([
      'south-west',
    ]);
  });

  it('kennt draußen keinen Raum', () => {
    expect(roomWallsToClear(CAMERA, { x: 2.5, y: 0.9, z: 9 }, HOUSE)).toBeNull();
    // Und ein Zimmer mit einem Loch in der Wand ist auch draußen.
    const open = HOUSE.filter((one) => one.name !== 'south-west');
    expect(roomWallsToClear(CAMERA, INSIDE_WEST, open)).toBeNull();
  });

  it('dreht mit der Kamera: von Osten ist die Ostwand vorn, und oben liegt der Westen', () => {
    const fromEast = { x: 30, y: 30, z: 3 };
    // Im Westzimmer ist die Trennwand die Wand zur Kamera hin.
    expect(names(roomWallsToClear(fromEast, INSIDE_WEST, HOUSE))).toEqual(['partition']);
  });

  it('lässt andere Etagen aus dem Spiel', () => {
    const upstairs = HOUSE.map((one) => ({ ...one, box: { ...one.box, y: one.box.y + 3 } }));
    // Die obere Etage sperrt die Flut nicht: Unten gibt es keine Wände, also draußen.
    expect(roomWallsToClear(CAMERA, INSIDE_WEST, upstairs)).toBeNull();
  });
});
