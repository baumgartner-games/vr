import { BLOCKS } from '../grid/blocks';
import { solidBounds } from '../grid/solids';
import { TILE, tileKey } from '../nav/navTile';
import { FIELD, LANES, MIDDLE_LANE, ROOF_Y, STAND, laneX, rangeStand } from './rangeStand';

const plan = rangeStand();

describe('Der Schießstand als Grundriss', () => {
  it('gibt jeder Bahn eine Kachel und der mittleren die Mitte', () => {
    expect(LANES).toHaveLength(5);
    expect(LANES).toContain(MIDDLE_LANE);
    // Die Bahnen liegen nebeneinander, ohne Lücke.
    for (let i = 1; i < LANES.length; i++) {
      expect(laneX(LANES[i]!) - laneX(LANES[i - 1]!)).toBeCloseTo(TILE);
    }
  });

  /**
   * **Die Schießbank ist eine Küchenzeile**, und das ist kein Sparwitz: Wer
   * geprüft hat, dass eine Arbeitsplatte auf 90 cm liegt, hat es für die Küche
   * und für den Stand geprüft. Wenn diese Zeile bricht, ist eine der beiden
   * Welten heimlich zu einer eigenen Höhe abgewandert.
   */
  it('legt die Schießbank auf Arbeitshöhe über alle fünf Bahnen', () => {
    const bench = plan.blocks().filter((one) => one.kind === 'counter');
    expect(bench).toHaveLength(LANES.length);
    expect(BLOCKS.counter.height).toBeCloseTo(0.9);
    for (const lane of LANES) {
      expect(bench.some((one) => one.tile === tileKey(lane, STAND.z, 0))).toBe(true);
    }
  });

  it('stellt eine Trennwand zwischen je zwei Bahnen und keine daneben', () => {
    const dividers = plan.blocks().filter((one) => one.kind === 'parapet');
    expect(dividers).toHaveLength(LANES.length - 1);
  });

  it('lässt an beiden Enden der Linie einen Weg nach vorn frei', () => {
    // Die äußeren Kacheln des Stands tragen keine Bank — sonst käme niemand
    // an der Linie vorbei zu den Scheiben.
    const outer = [STAND.x, STAND.x + STAND.w - 1];
    for (const x of outer) {
      const here = plan.blocks().filter((one) => one.tile === tileKey(x, STAND.z, 0));
      expect(here.every((one) => one.kind === 'pillar')).toBe(true);
    }
  });

  it('hängt das Dach über die ganze Linie und über Kopfhöhe', () => {
    const roof = plan.solids().find((one) => one.kind === 'wood' && one.w > TILE * 3)!;
    expect(roof.y - roof.h / 2).toBeCloseTo(ROOF_Y);
    expect(roof.w).toBeCloseTo(STAND.w * TILE);
  });

  /**
   * **Der Boden ist eine einzige Masse.** Tausend Bodenkacheln wären tausend
   * Körper in der Physik — und portalfähig kann nur eine große sein: Jede
   * Portalfläche bekommt eine eigene Kollisionsgruppe, und davon gibt es zehn.
   */
  it('legt einen einzigen portalfähigen Boden über das ganze Feld', () => {
    const ground = plan.solids().filter((one) => one.portal);
    expect(ground).toHaveLength(1);
    expect(ground[0]!.w).toBeCloseTo(FIELD.w * TILE);
    expect(ground[0]!.d).toBeCloseTo(FIELD.d * TILE);
    // Zwei Zentimeter unter null, damit er sich mit den Bodenplatten der
    // Linie nicht um jedes Pixel streitet.
    expect(ground[0]!.y + ground[0]!.h / 2).toBeCloseTo(-0.02);
  });

  it('stellt den Kugelfang hinter die weiteste Scheibe', () => {
    // Die weiteste steht auf 100 m; der Wall muss dahinter stehen und hoch
    // genug sein, dass nichts darüber hinweggeht.
    const berm = plan
      .solids()
      .filter((one) => one.kind === 'stone' && one.w > FIELD.w * TILE - 0.1)[0]!;
    expect(berm.z + berm.d / 2).toBeLessThan(-100);
    expect(berm.h).toBeGreaterThanOrEqual(9);
  });

  it('mauert das Feld an beiden Seiten ein', () => {
    const sides = plan.solids().filter((one) => one.kind === 'stone' && one.d > 100);
    expect(sides).toHaveLength(2);
    expect(sides[0]!.x).toBeLessThan(0);
    expect(sides[1]!.x).toBeGreaterThan(0);
  });

  it('bleibt mit allem im Feld', () => {
    const box = solidBounds(plan.solids())!;
    expect(box.minX).toBeGreaterThanOrEqual(FIELD.x * TILE - 0.2);
    expect(box.maxX).toBeLessThanOrEqual((FIELD.x + FIELD.w) * TILE + 0.2);
    expect(box.minZ).toBeGreaterThanOrEqual(FIELD.z * TILE - 0.2);
    expect(box.maxZ).toBeLessThanOrEqual((FIELD.z + FIELD.d) * TILE + 0.2);
  });
});
