import { TILE, tileKey } from '../nav/navTile';
import { PIT_APRON, PIT_BAYS, PIT_BOXES, PIT_LANE, pitSpots } from './kartCourse';
import { PIT_GATE, TARMAC_TOP, kartPit } from './kartPit';

const plan = kartPit();

describe('Die Boxengasse als Grundriss', () => {
  /**
   * **Der Boden des Geländes gehört der Welt und nicht der Gasse.**
   *
   * Die Gasse ist eine Zone unter neun (`worlds/test/`), und unter allen
   * zusammen liegt **eine** portalfähige Masse: Jede Portalfläche bekommt eine
   * eigene Kollisionsgruppe, davon gibt es zehn, und neun Zonen mit je einer
   * eigenen wären neun davon für nichts.
   */
  it('bringt keinen eigenen portalfähigen Boden mit', () => {
    expect(plan.solids().filter((one) => one.portal)).toHaveLength(0);
  });

  it('macht die Gasse begehbar, damit man zu seinem Kart läuft', () => {
    for (const bay of PIT_BAYS) {
      expect(plan.graph.has(tileKey(PIT_LANE.x, bay, 0))).toBe(true);
    }
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

  /**
   * **Kein Dach**, hier so wenig wie sonst irgendwo in dieser Welt: Von oben
   * wäre ein gedeckelter Boxenplatz ein schwarzer Balken über genau den Karts,
   * die man gerade sucht.
   */
  it('baut kein Dach über die Boxen', () => {
    const over = plan
      .solids()
      .filter((one) => one.kind !== 'floor' && one.y - one.h / 2 > 2.4 && one.w > 1.5 * TILE);
    expect(over).toHaveLength(0);
  });

  /**
   * **Die Gasse ist nach Osten offen und sonst zu.** Das ist keine Kosmetik:
   * Nach Osten wird ausgefahren, und an jeder anderen Kante setzt
   * `confineToCourse` ein Kart zurück — eine Grenze, die man nicht sieht, ist
   * eine, in die man fährt.
   */
  it('mauert die Gasse überall zu, wo keine Ausfahrt und keine Box ist', () => {
    const walls = plan.blocks().filter((one) => one.kind === 'parapet');
    // Hinten quer über die ganze Breite, vorn mit einer Kachel Lücke: Dort
    // kommt herein, wer zu Fuß zu seinem Kart geht (`PIT_GATE`).
    expect(walls.filter((one) => one.dir === 0)).toHaveLength(PIT_LANE.w - 1);
    expect(walls.filter((one) => one.dir === 2)).toHaveLength(PIT_LANE.w);
    expect(
      walls.some((one) => one.dir === 0 && one.tile === tileKey(PIT_GATE, PIT_LANE.z, 0)),
    ).toBe(false);
    // Nach Westen überall dort, wo keine Box gegenüberliegt.
    expect(walls.filter((one) => one.dir === 3)).toHaveLength(PIT_LANE.d - PIT_BOXES.d);
    // Und nach Osten nirgends: das ist die Ausfahrt.
    expect(walls.filter((one) => one.dir === 1)).toHaveLength(0);
  });

  it('lässt jedes Kart auf der Höhe seiner Bucht und vor ihr stehen', () => {
    for (const spot of pitSpots()) {
      expect(spot.z).toBeGreaterThan(PIT_BOXES.z * TILE);
      expect(spot.z).toBeLessThan((PIT_BOXES.z + PIT_BOXES.d) * TILE);
      // Östlich der Boxen, also in der Gasse davor.
      expect(spot.x).toBeGreaterThan((PIT_BOXES.x + PIT_BOXES.w) * TILE);
    }
  });
});
