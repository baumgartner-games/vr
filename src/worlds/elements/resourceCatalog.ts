import type { FurnitureFolder, GameElement } from './elementCatalog';
import { catalogueOf, swapRing } from './elementFamily';

/**
 * **Die Rohstoffe im Katalog** — _Resource Bits_ als Spielelemente: Kisten und
 * Paletten, Erze und Barren, Essen, Treibstoff, Geld und Edelsteine, Stein,
 * Holz und Stoffe. Gewünscht (Oktober 2026): _„Resource Bits auch gerne."_
 *
 * **Der Maßstab des Regals** (0,5) — das Paket ist im Maß der Möbel gebaut:
 * Eine Palette ist 75 cm, ein Fass 50 cm hoch, ein Barren 40 cm lang. Was
 * höchstens 0,6 m im Quadrat misst, steht auf einer Zelle und lässt sich auf
 * eine Ablage stellen (`rests`); das Größere sperrt seine Kacheln.
 *
 * **Die Metalle sind Fassungen** (`elementFamily.swapRing`): Kupfer, Gold,
 * Eisen und Silber gibt es in denselben Formen — im Katalog steht Gold, die
 * übrigen tauscht man im Element-Menü. Ebenso die drei Treibstoffsorten und
 * die Kunststoffpaletten. Hinter jeder Zeile steht, was gemessen wurde:
 * Breite × Höhe × Tiefe in Metern.
 */

/** Eine Adresse aus _Resource Bits_. */
function resource(name: string): string {
  return `resource-bits/${name}.glb`;
}

/** So hoch ist der Körper — wie bei jedem Möbel: Darüber springt niemand. */
const BODY = 1.4;

/** Eine Zelle, eine halbe Kachel im Quadrat. */
const ONE_CELL: readonly [number, number] = [0.5, 0.5];

/** Etwas, das seine Kacheln sperrt. */
function thing(
  id: string,
  label: string,
  file: string,
  tiles: readonly [number, number],
  aka: readonly string[] = [],
): GameElement {
  return {
    id,
    label,
    ...(aka.length ? { aka } : {}),
    tiles,
    height: BODY,
    kind: null,
    parts: [{ model: resource(file) }],
  };
}

/** Etwas Kleines auf einer Zelle — auf den Boden oder eine Ablage. */
function small(id: string, label: string, file: string, aka: readonly string[] = []): GameElement {
  return { ...thing(id, label, file, ONE_CELL, aka), rests: true };
}

/** Eine Palette: flach, darauf stellt man, was man will. */
function pallet(id: string, label: string, file: string): GameElement {
  return { ...thing(id, label, file, [1, 1], ['Palette']), solid: [0, 0], floor: true };
}

/** Die Metalle in der Reihenfolge der Fassungen — Gold vorn, es glänzt am meisten. */
const METALS = [
  ['Gold', 'Gold'],
  ['Silver', 'Silber'],
  ['Copper', 'Kupfer'],
  ['Iron', 'Eisen'],
] as const;

/** Eine Form in allen vier Metallen. */
function metal(
  id: string,
  label: string,
  form: string,
  make: (id: string, label: string, file: string) => GameElement,
): GameElement[] {
  return swapRing(
    METALS.map(([file, word]) =>
      make(`${id}-${file.toLowerCase()}`, `${label}, ${word}`, `${file}_${form}`),
    ),
  );
}

/** Kisten, Kartons und Paletten. */
const CONTAINERS: readonly GameElement[][] = [
  [small('resource-box-large', 'Karton, groß', 'Containers_Box_Large', ['Karton', 'Kiste'])], // 0,38 × 0,40 × 0,38
  [small('resource-box-dirty', 'Karton, schmutzig', 'Containers_Box_Large_Dirty', ['Karton'])], // 0,38 × 0,37 × 0,44
  [small('resource-box-medium', 'Karton, flach', 'Containers_Box_Medium', ['Karton'])], // 0,53 × 0,19 × 0,38
  [small('resource-box-small', 'Karton, klein', 'Containers_Box_Small', ['Karton'])], // 0,23 rund
  [thing('resource-crate-large', 'Lagerkiste', 'Containers_Crate_Large', [1, 1], ['Kiste'])], // 0,78 × 0,52 × 0,76
  swapRing([
    thing(
      'resource-crate-medium-grey',
      'Transportkiste, grau',
      'Containers_Crate_Medium_Grey',
      [1, 1],
      ['Kiste'],
    ),
    thing(
      'resource-crate-medium-tan',
      'Transportkiste, beige',
      'Containers_Crate_Medium_Tan',
      [1, 1],
      ['Kiste'],
    ),
  ]), // 0,74 × 0,35 × 0,56
  [
    thing(
      'resource-crate-medium-wood',
      'Holzkiste, flach',
      'Containers_Crate_Medium_Wood',
      [1, 0.5],
      ['Kiste'],
    ),
  ], // 0,85 × 0,22 × 0,46
  swapRing([
    small('resource-crate-small-green', 'Kleine Kiste, grün', 'Containers_Crate_Small_Green', [
      'Kiste',
    ]),
    small('resource-crate-small-grey', 'Kleine Kiste, grau', 'Containers_Crate_Small_Grey', [
      'Kiste',
    ]),
  ]), // 0,40 × 0,25 × 0,36
  [
    thing(
      'resource-boxes-large',
      'Kistenstapel, groß',
      'Containers_Pile_Large',
      [1, 1],
      ['Kisten', 'Stapel'],
    ),
  ], // 0,92 × 0,87 × 0,86
  [
    thing(
      'resource-boxes-medium',
      'Kistenstapel',
      'Containers_Pile_Medium',
      [1, 1],
      ['Kisten', 'Stapel'],
    ),
  ], // 0,85 × 0,76 × 0,77
  [
    thing(
      'resource-boxes-small',
      'Kistenstapel, klein',
      'Containers_Pile_Small',
      [1, 1],
      ['Kisten', 'Stapel'],
    ),
  ], // 0,65 × 0,58 × 0,71
  [pallet('resource-pallet-wood', 'Holzpalette', 'Pallet_Wood')], // 0,78 × 0,15 × 0,75
  swapRing([
    pallet('resource-pallet-covered-a', 'Palette mit Plane', 'Pallet_Wood_Covered_A'),
    pallet('resource-pallet-covered-b', 'Palette mit Plane B', 'Pallet_Wood_Covered_B'),
  ]), // 0,86 × 0,15 × 0,86
  swapRing([
    pallet('resource-pallet-blue', 'Kunststoffpalette, blau', 'Pallet_Plastic_Blue'),
    pallet('resource-pallet-grey', 'Kunststoffpalette, grau', 'Pallet_Plastic_Grey'),
    pallet('resource-pallet-orange', 'Kunststoffpalette, orange', 'Pallet_Plastic_Orange'),
  ]), // 0,75 × 0,15 × 0,75
];

/** Erze und Barren — jede Form in vier Metallen. */
const METAL_FORMS: readonly GameElement[][] = [
  metal('resource-bar', 'Barren', 'Bar', (id, l, f) => small(id, l, f, ['Barren', 'Metall'])), // 0,20 × 0,13 × 0,40
  metal('resource-bars', 'Barren, drei', 'Bars', (id, l, f) =>
    thing(id, l, f, [1, 0.5], ['Barren', 'Metall']),
  ), // 0,63 × 0,39 × 0,46
  metal('resource-bars-stack-small', 'Barrenstapel, klein', 'Bars_Stack_Small', (id, l, f) =>
    small(id, l, f, ['Barren']),
  ), // 0,40 × 0,37 × 0,40
  metal('resource-bars-stack-medium', 'Barrenstapel, hoch', 'Bars_Stack_Medium', (id, l, f) =>
    small(id, l, f, ['Barren']),
  ), // 0,40 × 0,75 × 0,40
  metal('resource-bars-stack-large', 'Barrenstapel, groß', 'Bars_Stack_Large', (id, l, f) =>
    thing(id, l, f, [1, 1], ['Barren']),
  ), // 0,83 × 0,75 × 0,84
  metal('resource-nugget', 'Erzbrocken', 'Nugget_Large', (id, l, f) =>
    small(id, l, f, ['Erz', 'Nugget']),
  ), // 0,21 × 0,23 × 0,20
  metal('resource-nugget-medium', 'Erzbrocken, mittel', 'Nugget_Medium', (id, l, f) =>
    small(id, l, f, ['Erz', 'Nugget']),
  ), // 0,13 rund
  metal('resource-nugget-small', 'Erzbrocken, klein', 'Nugget_Small', (id, l, f) =>
    small(id, l, f, ['Erz', 'Nugget']),
  ), // 0,07 rund
  metal('resource-nuggets', 'Erzhaufen', 'Nuggets', (id, l, f) =>
    small(id, l, f, ['Erz', 'Nugget']),
  ), // 0,46 × 0,24 × 0,43
];

/** Essen in Körben, Kisten und Fässern. */
const FOOD: readonly GameElement[][] = [
  swapRing([
    small('resource-apple-red', 'Apfel, rot', 'Food_Apple_Red', ['Obst']),
    small('resource-apple-green', 'Apfel, grün', 'Food_Apple_Green', ['Obst']),
  ]), // 0,23 × 0,25 × 0,23
  swapRing([
    small('resource-berry-blue', 'Beere, blau', 'Food_Berry_Blue', ['Obst']),
    small('resource-berry-orange', 'Beere, orange', 'Food_Berry_Orange', ['Obst']),
  ]), // 0,12 rund
  [small('resource-cheese', 'Käselaib', 'Food_Cheese', ['Käse'])], // 0,45 × 0,14 × 0,44
  [small('resource-flour', 'Mehlsack', 'Food_Flour', ['Mehl', 'Sack'])], // 0,30 × 0,30 × 0,22
  swapRing([
    small('resource-basket-a-berries', 'Beerenkorb', 'Food_Basket_A_Berries', ['Korb']),
    small('resource-basket-a', 'Korb', 'Food_Basket_A_Empty', ['Korb']),
  ]), // 0,43 × 0,34 × 0,42
  swapRing([
    small('resource-basket-b-berries', 'Flacher Beerenkorb', 'Food_Basket_B_Berries', ['Korb']),
    small('resource-basket-b', 'Flacher Korb', 'Food_Basket_B_Empty', ['Korb']),
  ]), // 0,47 × 0,29 × 0,46
  swapRing([
    small('resource-crate-apples', 'Apfelkiste', 'Food_Crate_Large_Apples', ['Kiste', 'Obst']),
    small('resource-crate-food', 'Obstkiste, leer', 'Food_Crate_Large_Empty', ['Kiste']),
  ]), // 0,52 × 0,40 × 0,38
  swapRing([
    small('resource-crate-berries', 'Beerenkistchen', 'Food_Crate_Small_Berries', ['Kiste']),
    small('resource-crate-berries-empty', 'Beerenkistchen, leer', 'Food_Crate_Small_Empty', [
      'Kiste',
    ]),
  ]), // 0,28 × 0,23 × 0,19
  swapRing([
    thing('resource-barrel-fish', 'Fischfass', 'Food_Barrel_Fish', [1, 1], ['Fass', 'Fisch']),
    thing('resource-barrel-food', 'Fass, leer', 'Food_Barrel_Empty', [1, 1], ['Fass']),
  ]), // 0,64 × 0,85 × 0,63
  [
    thing(
      'resource-food-large',
      'Vorräte, großer Haufen',
      'Food_Pile_Large',
      [1, 1],
      ['Vorrat', 'Essen'],
    ),
  ], // 1,00 × 0,88 × 0,96
  [thing('resource-food-medium', 'Vorräte', 'Food_Pile_Medium', [1, 1], ['Vorrat', 'Essen'])], // 0,80 × 0,36 × 0,73
  [small('resource-food-small', 'Vorräte, klein', 'Food_Pile_Small', ['Vorrat', 'Essen'])], // 0,54 × 0,31 × 0,49
];

/** Treibstoff — drei Sorten in denselben Formen. */
const FUEL: readonly GameElement[][] = (
  [
    ['Barrel', 'Ölfass', 'small'], // 0,38 × 0,50 × 0,38
    ['Barrel_Dirty', 'Ölfass, verschmiert', 'small'], // 0,38 × 0,50 × 0,38
    ['Barrels', 'Ölfässer', 'thing'], // 0,76 × 0,50 × 0,76
    ['Jerrycan', 'Kanister', 'small'], // 0,20 × 0,39 × 0,36
  ] as const
).map(([form, label, kind]) =>
  swapRing(
    (['A', 'B', 'C'] as const).map((sort) => {
      const id = `resource-fuel-${form.toLowerCase().replace('_', '-')}-${sort.toLowerCase()}`;
      const file = `Fuel_${sort}_${form}`;
      const words = `${label} ${sort}`;
      return kind === 'small'
        ? small(id, words, file, ['Öl', 'Treibstoff', 'Fass'])
        : thing(id, words, file, [1, 1], ['Öl', 'Treibstoff', 'Fass']);
    }),
  ),
);

/** Geld und Edelsteine. */
const TREASURE: readonly GameElement[][] = [
  [small('resource-money-bill', 'Geldschein', 'Money_Bill', ['Geld'])], // 0,15 × 0,01 × 0,30
  [small('resource-money-bill-arched', 'Geldschein, gewölbt', 'Money_Bill_Arched', ['Geld'])], // 0,15 × 0,04 × 0,29
  [small('resource-bills-small', 'Geldbündel', 'Money_Bills_Stack_Small', ['Geld'])], // 0,16 × 0,06 × 0,30
  [small('resource-bills-medium', 'Geldbündel, mittel', 'Money_Bills_Stack_Medium', ['Geld'])], // 0,32 × 0,28 × 0,33
  [small('resource-bills-large', 'Geldbündel, groß', 'Money_Bills_Stack_Large', ['Geld'])], // 0,31 × 0,31 × 0,30
  [small('resource-coin', 'Münze', 'Money_Single', ['Geld'])], // 0,20 × 0,20 × 0,05
  [small('resource-coins-single', 'Münze, liegend', 'Money_Coins_Stack_Single', ['Geld'])], // 0,12 × 0,04 × 0,12
  [small('resource-coins-small', 'Münzstapel, klein', 'Money_Coins_Stack_Small', ['Geld'])], // 0,12 × 0,15 × 0,12
  [small('resource-coins-medium', 'Münzstapel', 'Money_Coins_Stack_Medium', ['Geld'])], // 0,12 × 0,25 × 0,12
  [small('resource-coins-large', 'Münzstapel, hoch', 'Money_Coins_Stack_Large', ['Geld'])], // 0,12 × 0,35 × 0,12
  [small('resource-money-small', 'Geldhaufen, klein', 'Money_Pile_Small', ['Geld', 'Schatz'])], // 0,40 × 0,15 × 0,36
  [thing('resource-money-medium', 'Geldhaufen', 'Money_Pile_Medium', [1, 1], ['Geld', 'Schatz'])], // 0,60 × 0,36 × 0,52
  [
    thing(
      'resource-money-large',
      'Geldhaufen, groß',
      'Money_Pile_Large',
      [1, 1],
      ['Geld', 'Schatz'],
    ),
  ], // 0,96 × 0,72 × 0,82
  [small('resource-gem-large', 'Edelstein, groß', 'Gem_Large', ['Juwel', 'Kristall'])], // 0,38 × 0,38 × 0,15
  [small('resource-gem-medium', 'Edelstein', 'Gem_Medium', ['Juwel', 'Kristall'])], // 0,23 × 0,23 × 0,11
  [small('resource-gem-small', 'Edelstein, klein', 'Gem_Small', ['Juwel', 'Kristall'])], // 0,15 × 0,15 × 0,07
  [thing('resource-gems-large', 'Edelsteinhaufen', 'Gems_Pile_Large', [1, 1], ['Juwel', 'Schatz'])], // 0,67 × 0,38 × 0,71
  [small('resource-gems-small', 'Edelsteinhaufen, klein', 'Gems_Pile_Small', ['Juwel', 'Schatz'])], // 0,52 × 0,32 × 0,52
  [thing('resource-gems-sack', 'Edelsteinsack', 'Gems_Sack', [1, 1], ['Sack', 'Schatz'])], // 0,81 × 0,69 × 0,78
  swapRing([
    thing('resource-gems-chest', 'Edelsteintruhe', 'Gems_Chest', [1, 1], ['Truhe', 'Schatz']),
    thing(
      'resource-gems-chest-empty',
      'Edelsteintruhe, leer',
      'Gems_Chest_Empty',
      [1, 1],
      ['Truhe'],
    ),
  ]), // 0,78 × 0,76 × 0,84
];

/** Stein, Holz, Stoffe und Teile — was man zum Bauen braucht. */
const MATERIALS: readonly GameElement[][] = [
  [small('resource-brick', 'Ziegelstein', 'Stone_Brick', ['Stein', 'Ziegel'])], // 0,23 × 0,15 × 0,38
  [
    small('resource-bricks-small', 'Ziegelstapel, klein', 'Stone_Bricks_Stack_Small', [
      'Stein',
      'Ziegel',
    ]),
  ], // 0,52 × 0,32 × 0,41
  [
    thing(
      'resource-bricks-medium',
      'Ziegelstapel',
      'Stone_Bricks_Stack_Medium',
      [1, 1],
      ['Stein', 'Ziegel'],
    ),
  ], // 0,75 × 0,32 × 0,79
  [
    thing(
      'resource-bricks-large',
      'Ziegelstapel, hoch',
      'Stone_Bricks_Stack_Large',
      [1, 1],
      ['Stein', 'Ziegel'],
    ),
  ], // 0,75 × 0,62 × 0,81
  [small('resource-stones-small', 'Steinbrocken', 'Stone_Chunks_Small', ['Stein'])], // 0,56 × 0,29 × 0,39
  [thing('resource-stones-large', 'Steinbrocken, groß', 'Stone_Chunks_Large', [1, 1], ['Stein'])], // 0,75 × 0,54 × 0,67
  [thing('resource-log-a', 'Baumstamm', 'Wood_Log_A', [0.5, 1], ['Holz', 'Stamm'])], // 0,36 × 0,37 × 0,68
  [thing('resource-log-b', 'Baumstamm, dünn', 'Wood_Log_B', [0.5, 1], ['Holz', 'Stamm'])], // 0,27 × 0,28 × 0,68
  [thing('resource-logs', 'Holzstapel', 'Wood_Log_Stack', [1, 1], ['Holz', 'Brennholz'])], // 0,84 × 0,75 × 0,75
  swapRing([
    thing('resource-plank-a', 'Brett', 'Wood_Plank_A', [0.5, 1], ['Holz', 'Planke']),
    thing('resource-plank-b', 'Brett B', 'Wood_Plank_B', [0.5, 1], ['Holz', 'Planke']),
    thing('resource-plank-c', 'Brett C', 'Wood_Plank_C', [0.5, 1], ['Holz', 'Planke']),
  ]), // 0,20 × 0,07 × 0,75
  [
    thing(
      'resource-planks-small',
      'Bretterstapel, schmal',
      'Wood_Planks_Stack_Small',
      [0.5, 1],
      ['Holz', 'Planke'],
    ),
  ], // 0,42 × 0,16 × 0,80
  [
    thing(
      'resource-planks-medium',
      'Bretterstapel',
      'Wood_Planks_Stack_Medium',
      [1, 1],
      ['Holz', 'Planke'],
    ),
  ], // 0,83 × 0,31 × 0,81
  [
    thing(
      'resource-planks-large',
      'Bretterstapel, hoch',
      'Wood_Planks_Stack_Large',
      [1, 1],
      ['Holz', 'Planke'],
    ),
  ], // 0,83 × 0,61 × 0,81
  [small('resource-textiles-a', 'Stoffballen', 'Textiles_A', ['Stoff', 'Tuch'])], // 0,38 × 0,22 × 0,48
  [small('resource-textiles-b', 'Stoffrolle, stehend', 'Textiles_B', ['Stoff', 'Tuch'])], // 0,41 × 0,47 × 0,40
  [thing('resource-textiles-c', 'Stoffrolle', 'Textiles_C', [0.5, 1], ['Stoff', 'Tuch'])], // 0,31 × 0,26 × 0,78
  swapRing([
    thing('resource-textiles-large', 'Stoffstapel', 'Textiles_Stack_Large', [1, 1], ['Stoff']),
    thing(
      'resource-textiles-colored',
      'Stoffstapel, bunt',
      'Textiles_Stack_Large_Colored',
      [1, 1],
      ['Stoff'],
    ),
  ]), // 0,82 × 0,48 × 0,83
  [
    thing(
      'resource-textiles-small',
      'Stoffstapel, flach',
      'Textiles_Stack_Small',
      [1, 1],
      ['Stoff'],
    ),
  ], // 0,83 × 0,47 × 0,79
  [small('resource-cog', 'Zahnrad', 'Parts_Cog', ['Teil', 'Getriebe'])], // 0,19 × 0,20 × 0,08
  [small('resource-parts-small', 'Ersatzteile', 'Parts_Pile_Small', ['Teile', 'Schrott'])], // 0,58 × 0,17 × 0,50
  [small('resource-parts-medium', 'Ersatzteile, hoch', 'Parts_Pile_Medium', ['Teile', 'Schrott'])], // 0,51 × 0,74 × 0,44
  [
    thing(
      'resource-parts-large',
      'Ersatzteilhaufen',
      'Parts_Pile_Large',
      [1, 1],
      ['Teile', 'Schrott'],
    ),
  ], // 0,87 × 0,36 × 0,78
];

/** Alle Gruppen, in der Reihenfolge der Unterordner. */
const GROUPS = [CONTAINERS, METAL_FORMS, FOOD, FUEL, TREASURE, MATERIALS] as const;

/** **Alle Elemente der Rohstoffe** — mit allen Fassungen. */
export const RESOURCE_ELEMENTS: readonly GameElement[] = GROUPS.flatMap((group) => group.flat());

/** **Der Ordner _Rohstoffe_** — nach Art, zuletzt _Alles_. */
export const RESOURCE_FOLDER: FurnitureFolder = {
  id: 'resources',
  label: 'Rohstoffe',
  elements: [],
  cover: { element: 'resource-bars-stack-large-gold' },
  folders: [
    {
      id: 'resource-containers',
      label: 'Kisten & Paletten',
      elements: catalogueOf(CONTAINERS),
      cover: { element: 'resource-boxes-large' },
    },
    {
      id: 'resource-metals',
      label: 'Erze & Barren',
      elements: catalogueOf(METAL_FORMS),
      cover: { element: 'resource-bars-gold' },
    },
    {
      id: 'resource-food',
      label: 'Essen',
      elements: catalogueOf(FOOD),
      cover: { element: 'resource-crate-apples' },
    },
    {
      id: 'resource-fuel',
      label: 'Treibstoff',
      elements: catalogueOf(FUEL),
      cover: { element: 'resource-fuel-barrels-a' },
    },
    {
      id: 'resource-treasure',
      label: 'Geld & Edelsteine',
      elements: catalogueOf(TREASURE),
      cover: { element: 'resource-gems-chest' },
    },
    {
      id: 'resource-materials',
      label: 'Stein, Holz & Stoff',
      elements: catalogueOf(MATERIALS),
      cover: { element: 'resource-logs' },
    },
    { id: 'resource-all', label: 'Alles', elements: GROUPS.flatMap((group) => catalogueOf(group)) },
  ],
};
