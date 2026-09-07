import { findPath } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { DIRS, TILE, tileKey } from '../nav/navTile';
import { solidBounds } from '../grid/solids';
import { HALF, HOUSES, LEVELS, STOREY, dustTown } from './dustTown';

const plan = dustTown();

describe('Dust als Grundriss', () => {
  it('gibt jedem Haus so viele Etagen, wie es Stockwerke hat — plus das Dach', () => {
    for (const spec of HOUSES) {
      for (let level = 0; level <= spec.floors; level++) {
        expect(plan.graph.has(tileKey(spec.x + spec.w - 1, spec.z + spec.d - 1, level))).toBe(true);
      }
      // Und keine darüber.
      const above = spec.floors + 1;
      if (above < LEVELS.length) {
        expect(plan.graph.has(tileKey(spec.x + 1, spec.z + 1, above))).toBe(false);
      }
    }
  });

  it('gibt jedem Haus genau eine Tür ins Erdgeschoss', () => {
    for (const spec of HOUSES) {
      let doors = 0;
      for (let dx = 0; dx < spec.w; dx++) {
        for (let dz = 0; dz < spec.d; dz++) {
          const key = tileKey(spec.x + dx, spec.z + dz, 0);
          for (const dir of DIRS) {
            if (plan.graph.wall(key, dir)?.kind === 'door') doors++;
          }
        }
      }
      expect(doors).toBe(1);
    }
  });

  /**
   * **Der Test, wegen dem die Treppe ein Handgriff geworden ist.**
   *
   * Eine Treppe ist drei Sachen: der Baustein, das Loch in der Decke darüber
   * und der Weg im Graphen. Wer die dritte vergisst, hat eine Treppe, die man
   * hinauflaufen kann und die für jeden NPC nicht existiert — und das merkt
   * man erst, wenn ein Zombie unten im Erdgeschoss im Kreis läuft.
   */
  it('führt in jedem Haus mit Treppe einen Weg vom Erdgeschoss aufs Dach', () => {
    for (const spec of HOUSES) {
      if (spec.stairs === false) continue;
      const bottom = tileKey(spec.x + spec.w - 1, spec.z + spec.d - 1, 0);
      const roof = tileKey(spec.x + spec.w - 1, spec.z + spec.d - 1, spec.floors);
      const path = findPath(plan.graph, bottom, roof, { profile: HUMAN_PROFILE });
      expect(path.complete).toBe(true);
    }
  });

  /**
   * Über jedem Treppenlauf hängt ein Loch, und die Läufe wechseln sich zwischen
   * zwei Kacheln ab. Alle übereinander ginge nicht: Jeder Lauf schlägt das Loch
   * für seinen eigenen Kopf, und genau darin müsste der nächste stehen.
   */
  it('lässt über jedem Treppenlauf ein Loch in der Decke', () => {
    for (const spec of HOUSES) {
      if (spec.stairs === false) continue;
      for (let level = 0; level < spec.floors; level++) {
        const back = level % 2 === 0;
        const z = back ? spec.z : spec.z + 1;
        // Der Lauf steht hier...
        expect(plan.graph.has(tileKey(spec.x, z, level))).toBe(true);
        // ...und darüber ist offen.
        expect(plan.graph.has(tileKey(spec.x, z, level + 1))).toBe(false);
      }
    }
  });

  /**
   * **Fenster sind jetzt wirklich Löcher.** Der Graph kannte die Wandsorte
   * immer schon; gebaut wurde daraus eine massive Wand — und ein NPC im ersten
   * Stock sah einen dadurch, während man selbst nichts sah.
   */
  it('setzt in jedes Obergeschoss Fenster', () => {
    let windows = 0;
    for (const key of plan.graph.tileKeys()) {
      for (const dir of DIRS) {
        if (plan.graph.wall(key, dir)?.kind === 'window') windows++;
      }
    }
    expect(windows).toBeGreaterThan(20);
  });

  it('legt einen einzigen portalfähigen Sand über die ganze Karte', () => {
    const ground = plan.solids().filter((one) => one.portal);
    expect(ground).toHaveLength(1);
    expect(ground[0]!.w).toBeCloseTo(HALF * 2 * TILE);
  });

  it('mauert die Karte ringsherum zu', () => {
    const cliffs = plan.solids().filter((one) => one.kind === 'stone' && one.h > 10);
    expect(cliffs).toHaveLength(4);
    for (const one of cliffs) expect(one.y - one.h / 2).toBeCloseTo(0);
  });

  it('hebt die beiden Kistenpodeste an, statt sie nur hinzustellen', () => {
    for (const x of [-6, 5]) {
      expect(plan.graph.tile(tileKey(x, -10, 0))!.rise).toBeCloseTo(1.2);
    }
  });

  it('bleibt mit allem innerhalb der Felswände', () => {
    const box = solidBounds(plan.solids())!;
    expect(box.minX).toBeGreaterThanOrEqual(-HALF * TILE - 0.2);
    expect(box.maxX).toBeLessThanOrEqual(HALF * TILE + 0.2);
    expect(box.minZ).toBeGreaterThanOrEqual(-HALF * TILE - 0.2);
    expect(box.maxZ).toBeLessThanOrEqual(HALF * TILE + 0.2);
  });

  it('setzt die Etagen auf die Stockwerkshöhe', () => {
    expect(plan.graph.levelY(1)).toBeCloseTo(STOREY);
    expect(plan.graph.levelY(4)).toBeCloseTo(STOREY * 4);
  });
});
