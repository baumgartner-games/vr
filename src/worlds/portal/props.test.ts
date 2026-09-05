import { BAG_ITEMS, PROP_GRIPS, PROP_LABELS, createPropShape, type PropKind } from './props';

/**
 * Der Beutel hat zwei Listen — was er anbietet und wie es heißt —, und sie
 * stehen an zwei Stellen. Der Test hält sie zusammen: eine Sorte ohne Namen
 * stünde im Raster als leeres Fach, eine doppelte Sorte zweimal darin.
 */
describe('BAG_ITEMS', () => {
  it('bietet jede Sorte genau einmal an', () => {
    const kinds = BAG_ITEMS.map(([kind]) => kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it('hat zu jeder Sorte einen Namen', () => {
    for (const [kind] of BAG_ITEMS) {
      expect(PROP_LABELS[kind]).toBeTruthy();
    }
  });

  it('lässt keine Sorte im Beutel liegen', () => {
    const offered = new Set<PropKind>(BAG_ITEMS.map(([kind]) => kind));
    for (const kind of Object.keys(PROP_LABELS) as PropKind[]) {
      expect(offered.has(kind)).toBe(true);
    }
  });

  it('beschriftet die Würfel als Würfel', () => {
    for (const kind of ['d4', 'd6', 'd8', 'd12', 'd20'] as const) {
      expect(PROP_LABELS[kind]).toMatch(/^W\d+ · /);
    }
  });
});

describe('die Griffe der Beutel-Objekte', () => {
  it('stehen in der Tabelle und im Bauplan gleich', () => {
    // Nicht jede Sorte lässt sich ohne Browser bauen (der Würfel malt sich
    // seine Zahlen auf eine Leinwand); die mit Griff und ein Stab reichen.
    for (const kind of ['champagne', 'rod', 'sphere'] as const) {
      const blueprint = createPropShape(kind);
      expect(blueprint.grip ?? null).toBe(PROP_GRIPS[kind] ?? null);
    }
  });

  it('gibt der Sektflasche einen — und dem Würfel keinen', () => {
    expect(PROP_GRIPS.champagne).toBeDefined();
    expect(PROP_GRIPS.cube).toBeUndefined();
  });
});
