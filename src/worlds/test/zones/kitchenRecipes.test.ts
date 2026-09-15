import {
  BURGER_PARTS,
  CHOPS,
  FRY_SECONDS,
  ITEM_LABELS,
  RECIPES,
  chopped,
  fried,
  isBurgerPart,
  isFood,
  missing,
  recipeOf,
  stackable,
  type KitchenItem,
} from './kitchenRecipes';

/**
 * **Woraus ein Burger besteht** — die Rechnung, die in der Küche sonst
 * niemand nachprüft.
 *
 * Im Headset ist ein Rezept vier Wege, drei Schnitte und vier Sekunden Braten;
 * hier ist es eine Zeile. Das ist der ganze Grund, warum die Rezepte neben der
 * Zone stehen und nicht darin (`kitchenRecipes.ts`).
 */
describe('die Rezepte der Küche', () => {
  it('kennt zu jedem Ding einen Namen', () => {
    const items = Object.keys(ITEM_LABELS) as KitchenItem[];
    for (const item of items) expect(ITEM_LABELS[item].length).toBeGreaterThan(2);
  });

  /**
   * **Jedes Rezept ist eine Teilmenge des größten.** Daran hängt die Regel
   * nebenan: Sie darf jede Zutat auflegen lassen, die noch nicht liegt, ohne
   * die Liste zu befragen — und der Stapel landet trotzdem nie in einer
   * Sackgasse.
   */
  it('baut jedes Rezept auf Brötchen und Patty auf', () => {
    for (const recipe of RECIPES) {
      expect({ id: recipe.id, bun: recipe.needs.includes('bun') }).toEqual({
        id: recipe.id,
        bun: true,
      });
      expect({ id: recipe.id, patty: recipe.needs.includes('patty-cooked') }).toEqual({
        id: recipe.id,
        patty: true,
      });
      for (const need of recipe.needs) expect(BURGER_PARTS).toContain(need);
    }
  });

  it('erkennt den Stapel unabhängig von der Reihenfolge', () => {
    expect(recipeOf(['bun', 'patty-cooked'])?.id).toBe('hamburger');
    expect(recipeOf(['patty-cooked', 'bun'])?.id).toBe('hamburger');
    expect(recipeOf(['tomato-cut', 'bun', 'patty-cooked', 'lettuce-cut'])?.id).toBe('deluxe');
    expect(recipeOf(['bun', 'patty-cooked', 'lettuce-cut'])?.id).toBe('salat');
  });

  it('nennt einen halben Stapel kein Rezept', () => {
    expect(recipeOf([])).toBeNull();
    expect(recipeOf(['bun'])).toBeNull();
    expect(recipeOf(['bun', 'lettuce-cut'])).toBeNull();
    expect(missing(['bun', 'lettuce-cut'])).toContain('Patty');
    expect(missing(['patty-cooked'])).toContain('Brötchen');
    expect(missing(['bun', 'patty-cooked'])).toBe('');
  });

  /**
   * **Roh geht nicht auf den Burger**, und der Satz dazu sagt auch, was
   * stattdessen zu tun ist — schneiden oder braten. Ein Hinweis, der nur
   * _geht nicht_ sagt, ist einer, vor dem man steht und rät.
   */
  it('lässt nur Verarbeitetes auf den Stapel', () => {
    const raw = stackable([], 'patty');
    expect(raw.ok).toBe(false);
    expect(!raw.ok && raw.why).toContain('gebraten');

    const green = stackable([], 'lettuce');
    expect(green.ok).toBe(false);
    expect(!green.ok && green.why).toContain('geschnitten');

    const pot = stackable([], 'pot');
    expect(pot.ok).toBe(false);
    expect(!pot.ok && pot.why).toContain('Burger');

    expect(stackable([], 'patty-cooked')).toEqual({ ok: true });
  });

  it('legt nichts zweimal auf', () => {
    const twice = stackable(['bun'], 'bun');
    expect(twice.ok).toBe(false);
    expect(!twice.ok && twice.why).toContain('schon');
  });

  it('weiß, was geschnitten und was gebraten wird', () => {
    expect(chopped('lettuce')).toBe('lettuce-cut');
    expect(chopped('tomato')).toBe('tomato-cut');
    expect(chopped('patty')).toBeNull();
    expect(chopped('lettuce-cut')).toBeNull();
    expect(fried('patty')).toBe('patty-cooked');
    expect(fried('bun')).toBeNull();
    // Was verarbeitet ist, ist auch eine Burgerzutat — sonst wäre das
    // Schneiden ein Weg, der nirgendwohin führt.
    for (const raw of ['lettuce', 'tomato', 'patty'] as const) {
      const done = chopped(raw) ?? fried(raw)!;
      expect({ raw, part: isBurgerPart(done) }).toEqual({ raw, part: true });
    }
  });

  /**
   * **Der Topf bleibt draußen.** Ein Mülleimer, der alles schluckt, ist einer,
   * in dem nach zwei Minuten die einzige Pfanne der Küche liegt — und der
   * Teller ist genauso wenig Abfall wie sie.
   */
  it('nennt nur Essen Essen', () => {
    for (const item of ['bun', 'patty', 'patty-cooked', 'lettuce-cut', 'burger'] as const) {
      expect({ item, food: isFood(item) }).toEqual({ item, food: true });
    }
    for (const item of ['pot', 'pan', 'plate', 'plate-burger'] as const) {
      expect({ item, food: isFood(item) }).toEqual({ item, food: false });
    }
  });

  it('hält Schneiden und Braten in Maßen', () => {
    expect(CHOPS).toBeGreaterThan(1);
    expect(CHOPS).toBeLessThan(6);
    expect(FRY_SECONDS).toBeGreaterThan(1);
    expect(FRY_SECONDS).toBeLessThan(15);
  });
});
