import { solidBounds } from '../grid/solids';
import { TILE, tileKey } from '../nav/navTile';
import { KART_FIELD, PIT_APRON, PIT_BAYS, PIT_BOXES, PIT_LANE, pitSpots } from './kartCourse';
import { BOX_ROOF, TARMAC_TOP, kartPit } from './kartPit';

const plan = kartPit();

describe('Die Boxengasse als Grundriss', () => {
  /**
   * **Der Boden ist eine einzige Masse.** Tausend Bodenkacheln wären tausend
   * Körper in der Physik für eine Wiese, über die man geradeaus fährt — und
   * portalfähig kann nur eine große sein: Jede Portalfläche bekommt eine
   * eigene Kollisionsgruppe, und davon gibt es zehn.
   */
  it('legt einen einzigen portalfähigen Boden über das ganze Gelände', () => {
    const ground = plan.solids().filter((one) => one.portal && one.kind === 'floor');
    expect(ground).toHaveLength(1);
    expect(ground[0]!.w).toBeCloseTo(KART_FIELD.w * TILE);
    expect(ground[0]!.d).toBeCloseTo(KART_FIELD.d * TILE);
    expect(ground[0]!.y + ground[0]!.h / 2).toBeCloseTo(-0.02);
  });

  it('asphaltiert die Gasse genau dort, wo ein Kart fahren darf', () => {
    const tarmac = plan
      .solids()
      .find((one) => one.kind === 'stone' && Math.abs(one.w - PIT_LANE.w * TILE) < 0.01)!;
    expect(tarmac.x - tarmac.w / 2).toBeCloseTo(PIT_APRON.x0);
    expect(tarmac.x + tarmac.w / 2).toBeCloseTo(PIT_APRON.x1);
    expect(tarmac.z - tarmac.d / 2).toBeCloseTo(PIT_APRON.z0);
    expect(tarmac.z + tarmac.d / 2).toBeCloseTo(PIT_APRON.z1);
    // Und er liegt auf derselben Höhe wie das Band der Strecke.
    expect(tarmac.y + tarmac.h / 2).toBeCloseTo(TARMAC_TOP);
  });

  it('gibt jeder Bucht eine Portaltafel und jeder Lücke eine Säule', () => {
    const panels = plan.blocks().filter((one) => one.kind === 'panel');
    const pillars = plan.blocks().filter((one) => one.kind === 'pillar');
    expect(panels).toHaveLength(PIT_BAYS.length);
    expect(pillars).toHaveLength(PIT_BOXES.d - PIT_BAYS.length);
    for (const bay of PIT_BAYS) {
      expect(panels.some((one) => one.tile === tileKey(PIT_BOXES.x, bay, 0))).toBe(true);
    }
    // Keine Säule steht in einer Bucht — dort steht ein Kart.
    for (const pillar of pillars) {
      expect(PIT_BAYS.some((bay) => pillar.tile === tileKey(PIT_BOXES.x + 1, bay, 0))).toBe(false);
    }
  });

  it('hängt das Dach über beide Kachelreihen und über Kopfhöhe', () => {
    const roof = plan.solids().find((one) => one.kind === 'wood')!;
    expect(roof.y - roof.h / 2).toBeCloseTo(BOX_ROOF);
    expect(roof.w).toBeCloseTo(PIT_BOXES.w * TILE);
    expect(roof.d).toBeCloseTo(PIT_BOXES.d * TILE);
    expect(BOX_ROOF).toBeGreaterThan(2.2);
  });

  /**
   * **Die Gasse ist nach Osten offen und sonst zu.** Das ist keine Kosmetik:
   * Nach Osten wird ausgefahren, und an jeder anderen Kante setzt
   * `confineToCourse` ein Kart zurück — eine Grenze, die man nicht sieht, ist
   * eine, in die man fährt.
   */
  it('mauert die Gasse überall zu, wo keine Ausfahrt und keine Box ist', () => {
    const walls = plan.blocks().filter((one) => one.kind === 'parapet');
    // Vorn und hinten quer über die ganze Breite.
    expect(walls.filter((one) => one.dir === 0)).toHaveLength(PIT_LANE.w);
    expect(walls.filter((one) => one.dir === 2)).toHaveLength(PIT_LANE.w);
    // Nach Westen überall dort, wo keine Box gegenüberliegt.
    expect(walls.filter((one) => one.dir === 3)).toHaveLength(PIT_LANE.d - PIT_BOXES.d);
    // Und nach Osten nirgends: das ist die Ausfahrt.
    expect(walls.filter((one) => one.dir === 1)).toHaveLength(0);
  });

  it('lässt jedes Kart unter dem Dach und vor seiner Box stehen', () => {
    const roof = plan.solids().find((one) => one.kind === 'wood')!;
    for (const spot of pitSpots()) {
      expect(spot.z).toBeGreaterThan(roof.z - roof.d / 2);
      expect(spot.z).toBeLessThan(roof.z + roof.d / 2);
      // Östlich der Boxen, also in der Gasse davor.
      expect(spot.x).toBeGreaterThan((PIT_BOXES.x + PIT_BOXES.w) * TILE);
    }
  });

  it('bleibt mit allem im Gelände', () => {
    const box = solidBounds(plan.solids())!;
    expect(box.minX).toBeGreaterThanOrEqual(KART_FIELD.x * TILE - 0.2);
    expect(box.maxX).toBeLessThanOrEqual((KART_FIELD.x + KART_FIELD.w) * TILE + 0.2);
    expect(box.minZ).toBeGreaterThanOrEqual(KART_FIELD.z * TILE - 0.2);
    expect(box.maxZ).toBeLessThanOrEqual((KART_FIELD.z + KART_FIELD.d) * TILE + 0.2);
  });
});
