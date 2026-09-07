import { DIRS, TILE, tileKey } from '../nav/navTile';
import { solidBounds } from '../grid/solids';
import { PLAN_WALL_H, PLAN_WALL_T } from '../editor/levelPlan';
import { HALL, HALL_BOUNDS, climbHall, hallUpperWalls } from './climbHall';

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

  /**
   * **Die oberen Stockwerke.** Eine gerasterte Wand ist zimmerhoch, die Halle
   * ist zehn Meter — dazwischen klaffte bis hierher nichts als Luft, und von
   * den Podesten auf 6,50 m sah man hinaus statt an eine Wand.
   */
  describe('die Wände über Zimmerhöhe', () => {
    const bands = hallUpperWalls();

    it('schließt genau die Lücke zwischen Wandkopf und Decke', () => {
      expect(bands).toHaveLength(4);
      for (const band of bands) {
        const bottom = band.centre[1] - band.size[1] / 2;
        const top = band.centre[1] + band.size[1] / 2;
        expect(bottom).toBeCloseTo(PLAN_WALL_H);
        expect(top).toBeCloseTo(HALL.height);
      }
    });

    it('legt sie auf dieselben Kanten wie die Wände darunter', () => {
      const { minX, maxX, minZ, maxZ } = HALL_BOUNDS;
      const edges = bands.map((band) =>
        band.size[0] > band.size[2] ? band.centre[2] : band.centre[0],
      );
      expect(edges.sort((a, b) => a - b)).toEqual([minZ, minX, maxZ, maxX].sort((a, b) => a - b));
      // Wanddick und keinen Zentimeter mehr: Eine Masse aus dem Grundriss wäre
      // eine ganze Kachel dick und stünde mitten in den Kletterwänden.
      for (const band of bands)
        expect(Math.min(band.size[0], band.size[2])).toBeCloseTo(PLAN_WALL_T);
    });

    it('schließt die vier Ecken', () => {
      // Über Eck gemessen: Ohne den Überstand bliebe in jeder Ecke ein
      // senkrechter Schlitz über die ganzen sieben Meter.
      const across = bands.filter((band) => band.size[0] > band.size[2]);
      expect(across).toHaveLength(2);
      for (const band of across) {
        expect(band.size[0]).toBeCloseTo(HALL.w * TILE + PLAN_WALL_T);
      }
    });
  });
});
