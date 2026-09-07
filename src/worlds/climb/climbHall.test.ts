import { DIRS, TILE, tileKey } from '../nav/navTile';
import { solidBounds } from '../grid/solids';
import { HALL, climbHall } from './climbHall';

const plan = climbHall();

describe('Die Kletterhalle als Grundriss', () => {
  it('legt Boden über die ganze Halle', () => {
    expect([...plan.graph.tileKeys()]).toHaveLength(HALL.w * HALL.d);
  });

  it('mauert sie ringsherum zu', () => {
    // Nordwestecke: zwei Außenwände.
    const corner = tileKey(HALL.x, HALL.z, 0);
    const walls = DIRS.filter((dir) => plan.graph.wall(corner, dir));
    expect(walls).toHaveLength(2);
  });

  /**
   * **Die Matte ist der Boden.** Sie war einmal ein eigener Quader unter der
   * Null und hätte sich mit den Bodenplatten des Grundrisses um jedes Pixel
   * gestritten — zwei Flächen auf derselben Höhe flimmern gegeneinander, und
   * man sucht den Fehler danach überall, nur nicht in einer doppelten Platte.
   */
  it('legt keine zweite Fläche auf den Boden', () => {
    const atZero = plan.solids().filter((one) => Math.abs(one.y + one.h / 2) < 0.001);
    expect(atZero.every((one) => one.kind === 'floor')).toBe(true);
  });

  it('hängt die Decke auf Hallenhöhe', () => {
    const roof = plan.solids().find((one) => one.y > HALL.height - 0.1)!;
    expect(roof.y - roof.h / 2).toBeCloseTo(HALL.height);
    expect(roof.w).toBeCloseTo(HALL.w * TILE);
  });

  it('lässt hinter den Kletterwänden Platz zum Durchgehen', () => {
    // Die Nordwand steht bei −10 m; die Rauwand hängt bei −8,6. Dazwischen
    // muss man laufen können — sonst wäre es keine Halle, sondern eine Nische.
    const box = solidBounds(plan.solids())!;
    expect(box.minZ).toBeLessThan(-9.5);
  });
});
