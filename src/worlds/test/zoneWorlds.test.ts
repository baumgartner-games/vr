import { tileKey } from '../nav/navTile';
import {
  CLIMB_WORLD,
  EFFECTS_WORLD,
  KART_WORLD,
  RANGE_WORLD,
  zonePlan,
  type ZoneWorldPlan,
} from './zoneWorlds';
import { SANDBOX_FIELD, SANDBOX_SPAWN, sandboxPlan } from './sandboxPlan';
import { EMITTERS } from './zones/effects';
import { findWorld } from '../index';

/**
 * **Die vier Zonen-Testwelten und die leere Sandbox**, ohne Szene
 * nachgerechnet: Man kommt auf einer Laufkachel an, und jede Zone hat ihr
 * Schild und ihre Einbauten.
 */
const WORLDS: Readonly<Record<string, readonly [ZoneWorldPlan, string]>> = {
  'test-kart': [KART_WORLD, 'schild-gokart'],
  'test-climb': [CLIMB_WORLD, 'schild-klettern'],
  'test-range': [RANGE_WORLD, 'schild-schiessstand'],
  'test-effects': [EFFECTS_WORLD, 'schild-effekte'],
};

describe('die Zonen-Testwelten', () => {
  for (const [id, [recipe, sign]] of Object.entries(WORLDS)) {
    describe(id, () => {
      const plan = zonePlan(recipe);

      it('steht im Ordner „Test"', () => {
        expect(findWorld(id)?.folder).toBe('test');
      });

      it('lässt einen auf einer Laufkachel ankommen', () => {
        expect(plan.graph.walkable(tileKey(recipe.spawn.x, recipe.spawn.z))).toBe(true);
      });

      it('hat das Schild der Zone', () => {
        expect(plan.fixture(sign)?.kind).toBe('sign');
      });

      it('liegt ganz auf ihrer Masse', () => {
        const g = recipe.ground;
        for (const rect of recipe.walk) {
          expect(rect.x).toBeGreaterThanOrEqual(g.x);
          expect(rect.z).toBeGreaterThanOrEqual(g.z);
          expect(rect.x + rect.w).toBeLessThanOrEqual(g.x + g.w);
          expect(rect.z + rect.d).toBeLessThanOrEqual(g.z + g.d);
        }
      });
    });
  }

  it('stellt in den Effekten alle vier Düsen mit Knopf auf', () => {
    const plan = zonePlan(EFFECTS_WORLD);
    for (const one of EMITTERS) {
      expect(plan.fixture(one.id)?.kind).toBe('emitter');
      expect(plan.fixture(`${one.id}-knopf`)?.props.target).toBe(one.id);
    }
  });
});

describe('die leere Sandbox', () => {
  const plan = sandboxPlan();

  it('ist eine begehbare Fläche ohne Einbauten', () => {
    expect(plan.graph.walkable(tileKey(SANDBOX_SPAWN.x, SANDBOX_SPAWN.z))).toBe(true);
    const f = SANDBOX_FIELD;
    expect(plan.graph.walkable(tileKey(f.x, f.z))).toBe(true);
    expect(plan.graph.walkable(tileKey(f.x + f.w - 1, f.z + f.d - 1))).toBe(true);
    expect(plan.fixtures()).toEqual([]);
  });

  it('bleibt die Welt, in der man landet', () => {
    expect(findWorld('sandbox')?.folder).toBeUndefined();
  });
});
