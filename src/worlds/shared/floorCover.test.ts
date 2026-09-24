import type { PlanSolid } from '../grid/solids';
import { addFloorTops, floorTopUnder, uncoveredSeats, type FloorTops } from './floorCover';

const floor = (x: number, z: number, w: number, d: number, top: number, h = 0.3): PlanSolid => ({
  kind: 'floor',
  x,
  y: top - h / 2,
  z,
  w,
  h,
  d,
});

describe('wie hoch der Boden unter einem Bodenstück liegt', () => {
  const tops: FloorTops = new Map();
  // Das Gelände auf null über 4 × 4 Kacheln, und ein Podest auf 2,8 m darüber.
  addFloorTops(tops, floor(2, 2, 4, 4, 0));
  addFloorTops(tops, floor(1.5, 1.5, 1, 1, 2.8));

  it('nimmt den Boden unter der Hand, nicht das Podest darüber', () => {
    expect(floorTopUnder(tops, [{ x: 1.5, z: 1.5 }], 1.1)).toBe(0);
  });

  it('nimmt das Podest, wenn über ihm losgelassen wird', () => {
    expect(floorTopUnder(tops, [{ x: 1.5, z: 1.5 }], 3.5)).toBeCloseTo(2.8, 9);
  });

  it('weiß nichts, wo kein Boden ist', () => {
    expect(floorTopUnder(tops, [{ x: 9.5, z: 9.5 }], 1)).toBeNull();
  });

  it('übergeht Wände und alles, was kein Boden ist', () => {
    const only: FloorTops = new Map();
    addFloorTops(only, { ...floor(0.5, 0.5, 1, 1, 2.8), kind: 'wall' });
    expect(only.size).toBe(0);
  });
});

describe('welche Platten ein Bodenstück deckt', () => {
  const seats = [
    { x: 0.5, y: 0, z: 0.5 },
    { x: 1.5, y: 0, z: 0.5 },
    { x: 1.5, y: 2.8, z: 0.5 },
  ];

  it('nimmt genau die Platten unter dem Stück heraus, in derselben Reihenfolge', () => {
    const cover = { tiles: [{ x: 1.5, z: 0.5 }], top: 0 };
    expect(uncoveredSeats(seats, [cover])).toEqual([seats[0], seats[2]]);
  });

  it('lässt die Etage darüber liegen', () => {
    const cover = { tiles: [{ x: 1.5, z: 0.5 }], top: 2.8 };
    expect(uncoveredSeats(seats, [cover])).toEqual([seats[0], seats[1]]);
  });

  it('gibt alles zurück, sobald nichts mehr deckt', () => {
    expect(uncoveredSeats(seats, [])).toEqual(seats);
  });
});
