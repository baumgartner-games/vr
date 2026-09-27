import * as fs from 'fs';
import * as path from 'path';
import { ITEM_LABELS, dish, type KitchenItem } from '../test/zones/kitchenRecipes';
import { BUN_BOTTOM, BUN_TOP, ITEM_MODELS, KITCHEN_PAN, dishModels, itemModel } from './itemModels';

/** Ein Ordner des Regals, so wie `index.json` ihn beschreibt. */
interface ShelfDir {
  readonly name: string;
  readonly dirs: readonly ShelfDir[];
  readonly files: readonly { readonly name: string }[];
}

/**
 * **Jede Datei im Regal**, als Pfad relativ zu seiner Wurzel — aus dem
 * Inhaltsverzeichnis gelesen und nicht aus dem Dateisystem: Das Verzeichnis ist
 * das, woraus die Seite lädt, und ein Stück, das nur auf der Platte liegt,
 * käme im Browser nie an.
 */
function shelf(): Set<string> {
  const file = path.join(__dirname, '../../../public/models/kaykit/index.json');
  const index = JSON.parse(fs.readFileSync(file, 'utf8')) as { root: ShelfDir };
  const out = new Set<string>();
  const walk = (dir: ShelfDir, at: string): void => {
    for (const f of dir.files) out.add(at ? `${at}/${f.name}` : f.name);
    for (const sub of dir.dirs) walk(sub, at ? `${at}/${sub.name}` : sub.name);
  };
  walk(index.root, '');
  return out;
}

const ALL = Object.keys(ITEM_LABELS) as KitchenItem[];

describe('itemModels — die Küche aus dem Regal', () => {
  const files = shelf();

  it('hat für jedes Ding einen Eintrag', () => {
    // Der Übersetzer sichert das schon (`Record<KitchenItem, …>`); hier steht
    // die Gegenprobe, dass keiner zu viel ist.
    expect(Object.keys(ITEM_MODELS).sort()).toEqual([...ALL].sort());
  });

  it('nimmt nur, was im Regal liegt', () => {
    const wanted = new Set<string>([BUN_BOTTOM, BUN_TOP]);
    for (const item of ALL) {
      const entry = ITEM_MODELS[item];
      for (const p of typeof entry === 'string' ? [entry] : entry) if (p) wanted.add(p);
    }
    // Und die Füllungen der Schüssel, die nur `dishModels` kennt.
    for (const p of dishModels(dish('bowl', ['stew', 'waffle']))) wanted.add(p);
    // Die Pfanne ist die der Sandbox-Küche (`kitchen.glb`) und nicht im Regal.
    wanted.delete(KITCHEN_PAN);
    const missing = [...wanted].filter((p) => !files.has(p));
    expect(missing).toEqual([]);
  });

  it('lässt ohne Bild, was das Regal nicht hat — und sonst nichts', () => {
    const blank = ALL.filter((item) => itemModel(item) === '').sort();
    expect(blank).toEqual(['water']);
  });

  it('zeigt ein Ding für sich als sein eines Stück', () => {
    expect(dishModels(dish('ham-cooked'))).toEqual([
      'restaurant-bits/food_ingredient_ham_cooked.glb',
    ]);
    expect(dishModels(dish('bun'))).toEqual(['restaurant-bits/food_ingredient_bun.glb']);
    // Der Topf mit Wasser ist ein Topf — das Wasser hat kein Stück.
    expect(dishModels(dish('pot', ['water']))).toEqual(['restaurant-bits/pot_A.glb']);
  });

  it('schneidet das Brötchen auf, sobald etwas darin liegt', () => {
    expect(dishModels(dish('bun', ['cheese-cut', 'patty-cooked']))).toEqual([
      BUN_BOTTOM,
      'restaurant-bits/food_ingredient_burger_cooked.glb',
      'restaurant-bits/food_ingredient_cheese_slice.glb',
      BUN_TOP,
    ]);
    // Auf dem Teller genauso — der Teller zuunterst.
    expect(dishModels(dish('plate', ['patty-cooked', 'bun']))).toEqual([
      'restaurant-bits/plate.glb',
      BUN_BOTTOM,
      'restaurant-bits/food_ingredient_burger_cooked.glb',
      BUN_TOP,
    ]);
    // Ein Brötchen allein auf dem Teller bleibt ganz.
    expect(dishModels(dish('plate', ['bun']))).toEqual([
      'restaurant-bits/plate.glb',
      'restaurant-bits/food_ingredient_bun.glb',
    ]);
  });

  it('legt die Pizza in den offenen Karton', () => {
    expect(dishModels(dish('pizzabox', ['pizza-cut']))).toEqual([
      'restaurant-bits/pizzabox_open.glb',
      'restaurant-bits/food_pizza_pepperoni_slice.glb',
    ]);
  });

  it('füllt die Schüssel: Waffel und Suppe als Füllung, die Kugeln obenauf', () => {
    expect(dishModels(dish('bowl', ['ice-strawberry', 'waffle', 'ice-vanilla']))).toEqual([
      'restaurant-bits/bowl.glb',
      'restaurant-bits/icecream_bowl_waffles.glb',
      'restaurant-bits/icecream_bowl_icecream_vanilla.glb',
      'restaurant-bits/icecream_bowl_icecream_strawberry.glb',
    ]);
    expect(dishModels(dish('bowl', ['stew']))).toEqual([
      'restaurant-bits/bowl.glb',
      'restaurant-bits/stew_bowl.glb',
    ]);
    // Für sich ist die Suppe ein ganzer Eintopf.
    expect(itemModel('stew')).toBe('restaurant-bits/food_stew.glb');
  });
});
