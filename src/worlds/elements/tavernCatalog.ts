import type { FurnitureFolder, GameElement } from './elementCatalog';

/**
 * **Die Taverne im Katalog** — Theke, Fässer, Tafeln, Betten und Truhen aus
 * _Dungeon_ als Spielelemente. Gewünscht (Oktober 2026), als Gruppe aus dem
 * Modellregal: _„Taverne / Burg (aus dungeon): Tresen und Bar, Fässer, Truhen,
 * Bücherregale, Betten, Fackeln, lange Tafeln"_.
 *
 * **Der Maßstab des Regals** (0,5) und kein eigener: Das Paket ist im Maß der
 * Restaurant-Möbel gebaut — Tafel, Theke und Arbeitsplatte sind gleich hoch
 * (0,5 m), ein großes Fass ist 0,9 × 1,0 m. Hinter jeder Zeile steht, was
 * gemessen wurde: Breite × Höhe × Tiefe in Metern. Die Kacheln sind die Maße,
 * aufgerundet (gut 10 cm Überstand passen noch); was höchstens 0,6 m im
 * Quadrat misst, steht auf einer Zelle.
 *
 * **Vier Arten** wie bei den Möbeln (`furnitureCatalog.ts`): `thing` steht im
 * Weg, `table` ist eine Ablage und eine Fläche der Küche (die Theke, die
 * leeren Tafeln), `small` ist ablegbar und eine Zelle groß (Flaschen, Kerzen,
 * Münzen) — und was schon gedeckt ist, ist ein `thing`: Auf den Krügen darauf
 * steht nichts mehr.
 *
 * **Was fehlt**: was an eine Wand gehört (Banner, Wandregale, Wandfackeln,
 * Schwert und Schild — ihr Ursprung sitzt in der Mitte, und an Wände hängt der
 * Katalog noch nichts), die Wände, Böden und Treppen des Pakets (dafür ist
 * _Haus_ da) und das Gerüst, dessen Balken in zwei Metern Höhe schweben.
 */

/** Eine Adresse aus _Dungeon_. */
function dungeon(name: string): string {
  return `dungeon/${name}.glb`;
}

/** So hoch ist der Körper — wie bei jedem Möbel: Darüber springt niemand. */
const BODY = 1.4;

/** Eine Zelle, eine halbe Kachel im Quadrat — so groß ist alles Ablegbare. */
const ONE_CELL: readonly [number, number] = [0.5, 0.5];

/** Ein Möbel, das nur im Weg steht. */
function thing(
  id: string,
  label: string,
  file: string,
  tiles: readonly [number, number],
  aka?: readonly string[],
): GameElement {
  return {
    id,
    label,
    ...(aka ? { aka } : {}),
    tiles,
    height: BODY,
    kind: null,
    parts: [{ model: dungeon(file) }],
  };
}

/** Eine Tafel oder ein Stück Theke: Ablage für Möbel und Fläche für die Küche. */
function table(
  id: string,
  label: string,
  file: string,
  tiles: readonly [number, number],
  aka?: readonly string[],
): GameElement {
  return { ...thing(id, label, file, tiles, aka), kind: 'top', shelf: true };
}

/**
 * **Was in einer Truhe liegt** (`opens: 'lid'`) — Münzen, ein Schlüssel,
 * Edelsteine. Gewünscht: _„Truhen und Fässer in dungeon und Taverne ja"_;
 * der Deckel klappt auf, eines davon kommt in die Hand (`elementActs.ts`).
 */
const CHEST_YIELDS: readonly string[] = [
  'dungeon/coin_stack_small.glb',
  'dungeon/key_gold.glb',
  'resource-bits/Gems_Pile_Small.glb',
  'resource-bits/Gold_Bar.glb',
];

/** Und in der goldenen Truhe: Gold. */
const GOLD_YIELDS: readonly string[] = [
  'dungeon/coin_stack_large.glb',
  'resource-bits/Gold_Bars.glb',
  'resource-bits/Gem_Large.glb',
];

/** **Was ein Fass hergibt** (`opens: 'tap'`) — eine Flasche. */
const BARREL_YIELDS: readonly string[] = [
  'dungeon/bottle_A_labeled_brown.glb',
  'dungeon/bottle_A_labeled_green.glb',
  'dungeon/bottle_B_green.glb',
  'dungeon/bottle_C_brown.glb',
];

/** Eine Truhe: Deckel auf, und etwas daraus in die Hand. */
function chest(element: GameElement, yields: readonly string[] = CHEST_YIELDS): GameElement {
  return { ...element, opens: 'lid', yields };
}

/** Ein Fass: etwas daraus in die Hand. */
function barrel(element: GameElement): GameElement {
  return { ...element, opens: 'tap', yields: BARREL_YIELDS };
}

/** Etwas Kleines, das auf eine Ablage passt — oder auf den Boden. */
function small(id: string, label: string, file: string): GameElement {
  return { ...thing(id, label, file, ONE_CELL), rests: true };
}

/**
 * **Die Elemente der Taverne** — im Katalog unter _Taverne_
 * (`TAVERN_FOLDER`), nach Art. Gemessen bei 0,5: Breite × Höhe × Tiefe.
 */
export const TAVERN_ELEMENTS: readonly GameElement[] = [
  // Theke — Stücke zum Aneinanderreihen, je eine Kachel, darauf stellt man ab.
  table('tavern-bar-a', 'Theke', 'bar_straight_A', [1, 1], ['Tresen', 'Bar']), // 1,00 × 0,50 × 0,60
  table('tavern-bar-b', 'Theke mit Brettern', 'bar_straight_B', [1, 1], ['Tresen', 'Bar']), // 1,00 × 0,50 × 0,62
  table('tavern-bar-c', 'Theke mit Fässchen', 'bar_straight_C', [1, 1], ['Tresen', 'Bar']), // 1,00 × 0,50 × 0,65
  table('tavern-bar-inner', 'Theke, Innenecke', 'bar_innercorner', [1, 1], ['Tresen', 'Bar']), // 1,00 × 0,50 × 1,00
  table('tavern-bar-outer', 'Theke, Außenecke', 'bar_outercorner', [1, 1], ['Tresen', 'Bar']), // 1,10 × 0,50 × 1,10
  thing('tavern-backbar-a', 'Schankregal', 'bartop_A_large', [2, 1], ['Bar', 'Regal']), // 2,00 × 1,10 × 0,25
  thing('tavern-backbar-b', 'Schankregal, niedrig', 'bartop_B_large', [2, 1], ['Bar', 'Regal']), // 2,00 × 1,00 × 0,25
  barrel(thing('tavern-keg', 'Zapffass', 'keg', [1, 1], ['Fass', 'Bier'])), // 0,90 × 1,03 × 1,00
  barrel(
    thing(
      'tavern-keg-table',
      'Zapffass mit Schanktisch',
      'keg_decorated',
      [2, 1],
      ['Fass', 'Bier'],
    ),
  ), // 1,76 × 1,03 × 1,00
  barrel(thing('tavern-barrel', 'Fass', 'barrel_large', [1, 1], ['Tonne'])), // 0,90 × 1,00 × 0,90
  barrel(
    thing(
      'tavern-barrel-decorated',
      'Fass mit Krügen',
      'barrel_large_decorated',
      [1, 1],
      ['Tonne'],
    ),
  ), // 0,97 × 1,28 × 0,93
  barrel(thing('tavern-barrel-small', 'Kleines Fass', 'barrel_small', ONE_CELL, ['Tonne'])), // 0,50 × 0,51 × 0,50
  barrel(
    thing('tavern-barrels-stacked', 'Fässer, gestapelt', 'barrel_small_stack', [1, 1], ['Tonne']),
  ), // 0,93 × 0,89 × 0,50
  small('tavern-bottle-a', 'Flasche', 'bottle_A_labeled_brown'), // 0,18 × 0,44 × 0,18
  small('tavern-bottle-b', 'Grüne Flasche', 'bottle_B_green'), // 0,28 × 0,44 × 0,28
  small('tavern-bottle-c', 'Bauchige Flasche', 'bottle_C_brown'), // 0,37 × 0,45 × 0,37
  // Tafeln & Sitzen
  table('tavern-table-long', 'Lange Tafel', 'table_long', [1, 2], ['Tisch']), // 1,00 × 0,50 × 2,00
  table(
    'tavern-table-long-cloth',
    'Lange Tafel mit Decke',
    'table_long_tablecloth',
    [1, 2],
    ['Tisch'],
  ), // 1,00 × 0,50 × 2,00
  thing(
    'tavern-table-long-feast',
    'Festtafel, gedeckt',
    'table_long_decorated_A',
    [1, 2],
    ['Tisch'],
  ), // 1,03 × 0,94 × 2,00
  table('tavern-table', 'Holztisch', 'table_medium', [1, 1], ['Tisch']), // 1,00 × 0,50 × 1,00
  table('tavern-table-cloth', 'Holztisch mit Decke', 'table_medium_tablecloth', [1, 1], ['Tisch']), // 1,00 × 0,50 × 1,00
  thing('tavern-table-set', 'Holztisch, gedeckt', 'table_medium_decorated_A', [1, 1], ['Tisch']), // 1,00 × 0,94 × 1,00
  table('tavern-table-round-large', 'Großer runder Tisch', 'table_round_large', [2, 2], ['Tisch']), // 1,50 × 0,50 × 1,50
  table('tavern-table-round', 'Runder Tisch', 'table_round_medium', [1, 1], ['Tisch']), // 0,96 × 0,50 × 0,99
  table('tavern-table-small', 'Kleiner Tisch', 'table_small', ONE_CELL, ['Tisch']), // 0,50 × 0,50 × 0,50
  thing('tavern-table-broken', 'Kaputter Tisch', 'table_medium_broken', [1, 1], ['Tisch']), // 1,14 × 0,49 × 1,21
  thing('tavern-chair', 'Holzstuhl', 'chair', ONE_CELL, ['Stuhl']), // 0,38 × 0,61 × 0,38
  thing('tavern-stool', 'Schemel', 'stool', ONE_CELL, ['Hocker']), // 0,38 × 0,25 × 0,38
  thing('tavern-stool-round', 'Runder Schemel', 'stool_round', ONE_CELL, ['Hocker']), // 0,38 × 0,25 × 0,38
  thing('tavern-bench', 'Holzbank', 'bench', [1, 1], ['Bank']), // 0,88 × 0,25 × 0,37
  // Schlafen
  thing('tavern-bed-single', 'Einzelbett, gelb', 'bed_A_single', [1, 2], ['Bett']), // 1,00 × 0,50 × 1,50
  thing('tavern-bed-double', 'Doppelbett, gelb', 'bed_A_double', [2, 2], ['Bett']), // 1,75 × 0,50 × 1,50
  thing('tavern-bed-single-b', 'Einzelbett, blau', 'bed_B_single', [1, 2], ['Bett']), // 1,00 × 0,75 × 1,50
  thing('tavern-bed-double-b', 'Doppelbett, blau', 'bed_B_double', [2, 2], ['Bett']), // 1,75 × 0,75 × 1,50
  thing('tavern-bed-bunk', 'Etagenbett', 'bed_A_stacked', [1, 2], ['Bett', 'Hochbett']), // 1,00 × 1,50 × 1,60
  thing('tavern-bed-decorated', 'Bett mit Nachttisch', 'bed_decorated', [2, 2], ['Bett']), // 1,30 × 0,85 × 1,53
  thing('tavern-bed-straw', 'Strohlager', 'bed_floor', [1, 2], ['Bett', 'Matratze']), // 0,75 × 0,28 × 1,50
  thing('tavern-bed-frame', 'Einfaches Bett', 'bed_frame', [1, 2], ['Bett']), // 0,75 × 0,53 × 1,50
  // Truhen & Lager
  chest(thing('tavern-chest', 'Truhe', 'chest', [1, 1], ['Schatz', 'Kiste'])), // 0,85 × 0,65 × 0,72
  chest(
    thing('tavern-chest-gold', 'Goldene Truhe', 'chest_gold', [1, 1], ['Schatz', 'Kiste']),
    GOLD_YIELDS,
  ), // 0,85 × 0,65 × 0,72
  chest(thing('tavern-chest-large', 'Große Truhe', 'chest_large', [1, 1], ['Schatz', 'Kiste'])), // 1,10 × 0,65 × 0,92
  chest(
    thing('tavern-chest-large-gold', 'Große goldene Truhe', 'chest_large_gold', [1, 1], ['Schatz']),
    GOLD_YIELDS,
  ), // 1,10 × 0,65 × 0,92
  chest(thing('tavern-chest-mimic', 'Mimic-Truhe', 'chest_mimic', [1, 1], ['Schatz', 'Monster']), [
    'dungeon/key_gold.glb',
  ]), // 0,85 × 0,65 × 0,72
  thing('tavern-trunk-a', 'Reisekiste', 'trunk_large_A', [1, 1], ['Koffer', 'Kiste']), // 0,75 × 0,50 × 0,65
  thing('tavern-trunk-b', 'Dunkle Reisekiste', 'trunk_large_B', [1, 1], ['Koffer', 'Kiste']), // 0,75 × 0,50 × 0,65
  thing('tavern-trunk-small', 'Kleine Reisekiste', 'trunk_medium_A', ONE_CELL, ['Koffer']), // 0,48 × 0,36 × 0,44
  thing('tavern-crate', 'Holzkiste', 'crate_large', [1, 1], ['Kiste']), // 1,00 × 0,40 × 0,70
  thing('tavern-crate-full', 'Holzkiste mit Ware', 'crate_large_decorated', [1, 1], ['Kiste']), // 1,00 × 0,63 × 0,70
  thing('tavern-crates-stacked', 'Kisten, gestapelt', 'crates_stacked', [1, 1], ['Kiste']), // 1,04 × 1,07 × 1,12
  thing('tavern-box', 'Beschlagene Kiste', 'box_large', [1, 1], ['Kiste']), // 0,75 × 0,75 × 0,75
  thing('tavern-box-small', 'Kleine beschlagene Kiste', 'box_small', ONE_CELL, ['Kiste']), // 0,50 × 0,50 × 0,50
  thing('tavern-boxes-stacked', 'Lagerhaufen', 'box_stacked', [2, 2], ['Kiste']), // 1,74 × 1,65 × 1,82
  thing('tavern-bucket', 'Eimer', 'bucket', ONE_CELL), // 0,49 × 0,46 × 0,49
  thing('tavern-bucket-pickaxes', 'Eimer mit Spitzhacken', 'bucket_pickaxes', [1, 1], ['Eimer']), // 0,63 × 0,69 × 0,56
  thing('tavern-coins-large', 'Goldhaufen', 'coin_stack_large', [1, 1], ['Münzen', 'Schatz']), // 0,72 × 0,58 × 0,83
  small('tavern-coins', 'Münzstapel', 'coin_stack_medium'), // 0,50 × 0,32 × 0,52
  small('tavern-coins-small', 'Ein paar Münzen', 'coin_stack_small'), // 0,48 × 0,24 × 0,45
  // Regale & Licht
  thing('tavern-bookcase', 'Bücherregal', 'bookcase_single_decoratedA', [1, 1], ['Regal']), // 1,00 × 1,50 × 0,27
  thing(
    'tavern-bookcase-wide',
    'Breites Bücherregal',
    'bookcase_double_decoratedA',
    [2, 1],
    ['Regal'],
  ), // 2,00 × 1,50 × 0,27
  thing(
    'tavern-bookcase-wide-b',
    'Breites Bücherregal, voll',
    'bookcase_double_decoratedB',
    [2, 1],
    ['Regal'],
  ), // 2,00 × 1,50 × 0,36
  thing('tavern-bookcase-empty', 'Leeres Regal', 'bookcase_double', [2, 1], ['Regal']), // 2,00 × 1,50 × 0,25
  thing('tavern-pillar', 'Steinsäule', 'pillar', [1, 1], ['Säule']), // 0,75 × 2,00 × 0,75
  thing('tavern-pillar-decorated', 'Steinsäule mit Waffen', 'pillar_decorated', [1, 1], ['Säule']), // 1,12 × 2,00 × 0,86
  thing('tavern-column', 'Kleine Säule', 'column', ONE_CELL, ['Säule', 'Sockel']), // 0,35 × 0,70 × 0,35
  small('tavern-candle', 'Kerze', 'candle_lit'), // 0,17 × 0,53 × 0,16
  small('tavern-candle-thin', 'Dünne Kerze', 'candle_thin_lit'), // 0,10 × 0,53 × 0,10
  small('tavern-candles', 'Drei Kerzen', 'candle_triple'), // 0,25 × 0,44 × 0,19
  small('tavern-plate-food', 'Teller mit Essen', 'plate_food_A'), // 0,51 × 0,39 × 0,49
];

/** Die Ids in der Reihenfolge des Katalogs. */
export const TAVERN_CATALOGUE: readonly string[] = TAVERN_ELEMENTS.map((one) => one.id);

/** Die Ids, deren Name so anfängt. */
function ofKind(...prefixes: string[]): string[] {
  return TAVERN_CATALOGUE.filter((id) => prefixes.some((prefix) => id.startsWith(prefix)));
}

/**
 * **Der Ordner _Taverne_** — Theke, Tafeln & Sitzen, Schlafen, Truhen & Lager,
 * Regale & Licht, zuletzt _Alles_.
 */
export const TAVERN_FOLDER: FurnitureFolder = {
  id: 'tavern',
  label: 'Taverne',
  elements: [],
  cover: { element: 'tavern-keg' },
  folders: [
    {
      id: 'tavern-bar',
      label: 'Theke',
      elements: ofKind(
        'tavern-bar',
        'tavern-backbar',
        'tavern-keg',
        'tavern-barrel',
        'tavern-bottle',
      ),
      cover: { element: 'tavern-bar-c' },
    },
    {
      id: 'tavern-tables',
      label: 'Tafeln & Sitzen',
      elements: ofKind(
        'tavern-table',
        'tavern-chair',
        'tavern-stool',
        'tavern-bench',
        'tavern-plate',
      ),
      cover: { element: 'tavern-table-long-feast' },
    },
    {
      id: 'tavern-beds',
      label: 'Schlafen',
      elements: ofKind('tavern-bed'),
      cover: { element: 'tavern-bed-double-b' },
    },
    {
      id: 'tavern-storage',
      label: 'Truhen & Lager',
      elements: ofKind(
        'tavern-chest',
        'tavern-trunk',
        'tavern-crate',
        'tavern-box',
        'tavern-bucket',
        'tavern-coins',
      ),
    },
    {
      id: 'tavern-light',
      label: 'Regale & Licht',
      elements: ofKind('tavern-bookcase', 'tavern-pillar', 'tavern-column', 'tavern-candle'),
      cover: { element: 'tavern-bookcase-wide' },
    },
    { id: 'tavern-all', label: 'Alles', elements: TAVERN_CATALOGUE },
  ],
};
