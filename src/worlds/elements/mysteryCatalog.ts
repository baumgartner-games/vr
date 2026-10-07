import type { FurnitureFolder, GameElement } from './elementCatalog';
import { swapRing } from './elementFamily';

/**
 * **Die Requisiten der Monatsfiguren im Katalog** — was zu den Figuren aus
 * _Mystery Monthly_ 5 und 6 gehört, als Spielelemente: Hexenküche und
 * Spielzeugwerkstatt, Zelt und Lagerfeuer, Bauernhof, Thron und Schätze, und
 * die Waffen und Schilde als Schmuck für die Wand. Gewünscht (Oktober 2026):
 * _„Mystery monthly 5 und 6 gern"_. Die Figuren selbst stehen nicht hier,
 * sondern bei _Aussehen_ und den NPCs.
 *
 * **Der Maßstab des Pakets** (0,7, `core/kaykitFit.KAYKIT_PACK_SCALE`) —
 * derselbe wie der der Figuren, damit der Thron zum Vampir passt. Hinter jeder
 * Zeile steht, was gemessen wurde: Breite × Höhe × Tiefe in Metern.
 *
 * **Waffen hängen an der Wand** (`GameElement.wall`): Schwerter, Äxte, Schilde
 * und Stäbe rasten an der nächsten Wand ein wie ein Bilderrahmen und sperren
 * keine Zelle. Gewünscht für mehr Deko: _„Auch gerne die die dann an einer
 * Wand sind."_ Gewehre und Bogen fehlen: Sie liegen in der Datei der Länge
 * nach in der Tiefe und stünden von der Wand ab. Der Vampirthron ist ein Sitz (`opens: 'sit'`), das große
 * Geschenk lässt sich auspacken (`opens: 'unwrap'`, `elementActs.ts`).
 */

/** So hoch ist der Körper — wie bei jedem Möbel: Darüber springt niemand. */
const BODY = 1.4;

/** Eine Zelle, eine halbe Kachel im Quadrat. */
const ONE_CELL: readonly [number, number] = [0.5, 0.5];

/** Die Ordner der beiden Pakete, Monat für Monat. */
const M5 = 'mystery-monthly-5';
const M6 = 'mystery-monthly-6';

/** Etwas, das seine Kacheln sperrt. */
function thing(
  id: string,
  label: string,
  path: string,
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
    parts: [{ model: `${path}.glb` }],
  };
}

/** Etwas Kleines auf einer Zelle — auf den Boden oder eine Ablage. */
function small(id: string, label: string, path: string, aka: readonly string[] = []): GameElement {
  return { ...thing(id, label, path, ONE_CELL, aka), rests: true };
}

/** Ein Tisch: eine Ablage, auf die man stellt, was ablegbar ist. */
function table(
  id: string,
  label: string,
  path: string,
  tiles: readonly [number, number],
  aka: readonly string[] = [],
): GameElement {
  return { ...thing(id, label, path, tiles, aka), shelf: true };
}

/** Etwas für die Wand — sperrt nichts, rastet an der nächsten Wand ein. */
function wall(id: string, label: string, path: string, aka: readonly string[] = []): GameElement {
  return {
    ...thing(id, label, path, [1, 0.5], ['Wand', 'Deko', ...aka]),
    solid: [0, 0],
    wall: true,
  };
}

/** Die Spielzeuge, die im großen Geschenk liegen (`opens: 'unwrap'`). */
const PRESENT_TOYS: readonly string[] = [
  `${M5}/6-december-2024-helpers/Toy_Train_Wood.glb`,
  `${M5}/6-december-2024-helpers/Toy_Train_Paint.glb`,
  'mixed-bag/chicken_plushie_A.glb',
  'mixed-bag/puzzlecube_complete.glb',
  `${M6}/6-december-2025-toy-soldier/ToySoldier_Trumpet.glb`,
];

/** Hexenküche und Spielzeugwerkstatt. */
const WORKSHOP: readonly GameElement[][] = [
  [
    thing(
      'mystery-cauldron',
      'Hexenkessel',
      `${M5}/5-november-2024-witch/Cauldron`,
      [1, 1],
      ['Kessel', 'Hexe'],
    ),
  ], // 0,87 × 0,59 × 0,83
  swapRing([
    table(
      'mystery-potionstation',
      'Zaubertrank-Tisch',
      `${M5}/5-november-2024-witch/Potionstation`,
      [2, 1],
      ['Hexe', 'Trank', 'Tisch'],
    ),
    thing(
      'mystery-potionstation-decorated',
      'Zaubertrank-Tisch, bestückt',
      `${M5}/5-november-2024-witch/Potionstation_decorated`,
      [2, 1],
      ['Hexe', 'Trank'],
    ),
  ]), // 1,68 × 1,05 × 1,05
  [
    table(
      'mystery-table-small',
      'Hexentischchen',
      `${M5}/5-november-2024-witch/Table_Small`,
      [1, 1],
      ['Tisch'],
    ),
  ], // 0,70 × 0,56 × 0,52
  swapRing([
    small('mystery-basket', 'Weidenkorb', `${M5}/5-november-2024-witch/Basket`, ['Korb']),
    small('mystery-basket-mushrooms', 'Pilzkorb', `${M5}/5-november-2024-witch/Basket_Mushrooms`, [
      'Korb',
      'Pilze',
    ]),
  ]), // 0,45 × 0,51 × 0,42
  [small('mystery-broom', 'Hexenbesen', `${M5}/5-november-2024-witch/Broom`, ['Besen'])], // 0,36 × 1,74 × 0,34
  [small('mystery-mortar', 'Mörser', `${M5}/5-november-2024-witch/Mortar`, ['Schale'])], // 0,42 × 0,21 × 0,42
  [small('mystery-pestle', 'Stößel', `${M5}/5-november-2024-witch/Pestle`)], // 0,14 × 0,28 × 0,14
  swapRing([
    table(
      'mystery-toy-workbench',
      'Spielzeugwerkbank',
      `${M5}/6-december-2024-helpers/Toy_Workbench`,
      [2, 2],
      ['Werkbank', 'Wichtel'],
    ),
    thing(
      'mystery-toy-workbench-decorated',
      'Spielzeugwerkbank, bestückt',
      `${M5}/6-december-2024-helpers/Toy_Workbench_decorated`,
      [2, 2],
      ['Werkbank'],
    ),
  ]), // 2,10 × 1,05 × 1,44
  [
    small('mystery-drawers', 'Schubladenkästchen', `${M5}/6-december-2024-helpers/Drawers`, [
      'Kommode',
    ]),
  ], // 0,56 × 0,49 × 0,53
  [
    small(
      'mystery-lamp-workbench',
      'Werkbanklampe',
      `${M5}/6-december-2024-helpers/Lamp_Workbench`,
      ['Lampe'],
    ),
  ], // 0,33 × 0,79 × 0,77
  swapRing([
    small('mystery-glue-a', 'Leimtube', `${M5}/6-december-2024-helpers/Glue_A`, ['Leim', 'Kleber']),
    small('mystery-glue-b', 'Leimtube, klein', `${M5}/6-december-2024-helpers/Glue_B`, [
      'Leim',
      'Kleber',
    ]),
  ]), // 0,23 × 0,41 × 0,17
  [small('mystery-hammer', 'Holzhammer', `${M5}/6-december-2024-helpers/Hammer`, ['Hammer'])], // 0,31 × 0,51 × 0,16
  swapRing([
    {
      ...small(
        'mystery-toy-train-wood',
        'Spielzeuglok, Holz',
        `${M5}/6-december-2024-helpers/Toy_Train_Wood`,
        ['Zug', 'Lok'],
      ),
      tiles: [0.5, 1] as const,
    },
    {
      ...small(
        'mystery-toy-train-paint',
        'Spielzeuglok, bunt',
        `${M5}/6-december-2024-helpers/Toy_Train_Paint`,
        ['Zug', 'Lok'],
      ),
      tiles: [0.5, 1] as const,
    },
  ]), // 0,30 × 0,45 × 0,60
  [
    small('mystery-candycane', 'Zuckerstange, klein', `${M5}/6-december-2024-helpers/Candycane`, [
      'Süßigkeit',
    ]),
  ], // 0,22 × 0,41 × 0,08
  [
    {
      ...thing(
        'mystery-present',
        'Riesengeschenk',
        `${M6}/6-december-2025-toy-soldier/Present_Base`,
        [2, 2],
        ['Geschenk', 'Päckchen'],
      ),
      opens: 'unwrap',
      yields: PRESENT_TOYS,
    },
  ], // 1,39 × 2,43 × 1,39
];

/** Zelt, Lagerfeuer und Bauernhof. */
const OUTDOOR: readonly GameElement[][] = [
  [thing('mystery-tent', 'Zelt', `${M5}/11-may-2025-hiker/Tent`, [2, 2], ['Camping'])], // 1,80 × 1,47 × 2,09
  [
    small('mystery-waterbottle', 'Trinkflasche', `${M5}/11-may-2025-hiker/Waterbottle`, [
      'Flasche',
    ]),
  ], // 0,13 × 0,30 × 0,13
  [
    {
      id: 'mystery-campfire',
      label: 'Lagerfeuer',
      aka: ['Feuer', 'Camping', 'Steinzeit'],
      tiles: [1, 1],
      height: BODY,
      kind: null,
      parts: [
        { model: `${M5}/8-february-2025-caveman/Campfire_Base.glb` }, // 1,19 × 0,20 × 1,20
        { model: `${M5}/8-february-2025-caveman/Campfire_Logs.glb`, stack: true }, // 0,56 × 0,42 × 0,63
      ],
    },
  ],
  swapRing([
    thing(
      'mystery-wheelbarrow',
      'Schubkarre, voll',
      `${M6}/12-june-2026-farmers/wheelbarrow`,
      [1, 2],
      ['Karre'],
    ),
    thing(
      'mystery-wheelbarrow-empty',
      'Schubkarre',
      `${M6}/12-june-2026-farmers/wheelbarrow_empty`,
      [1, 2],
      ['Karre'],
    ),
  ]), // 0,73 × 0,82 × 1,56
  [
    {
      ...thing(
        'mystery-dirt-plot',
        'Beet',
        `${M6}/12-june-2026-farmers/dirt_plot`,
        [1, 1],
        ['Acker', 'Erde', 'Garten'],
      ),
      solid: [0, 0],
      floor: true,
    },
  ], // 0,63 × 0,12 × 0,64
  [small('mystery-carrot', 'Möhre', `${M6}/12-june-2026-farmers/carrot`, ['Karotte', 'Gemüse'])], // 0,23 × 0,51 × 0,22
  [
    small('mystery-lettuce', 'Salatkopf', `${M6}/12-june-2026-farmers/lettuce`, [
      'Salat',
      'Gemüse',
    ]),
  ], // 0,47 × 0,33 × 0,44
  [small('mystery-pitchfork', 'Heugabel', `${M6}/12-june-2026-farmers/pitchfork`, ['Gabel'])], // 0,44 × 1,44 × 0,13
  [
    thing(
      'mystery-training-dummy',
      'Trainingspuppe',
      `${M6}/9-march-2026-avian-swordsman/Trainingdummy_Base`,
      [2, 1],
      ['Puppe', 'Ziel'],
    ),
  ], // 1,43 × 1,75 × 0,61
  [
    thing(
      'mystery-backpack',
      'Großer Rucksack',
      `${M6}/8-february-2026-hoarder/Hoarder_Backpack`,
      [2, 1],
      ['Rucksack'],
    ),
  ], // 1,13 × 1,42 × 0,74
  [
    {
      ...thing(
        'mystery-landing-impact',
        'Einschlagkrater',
        `${M5}/2-august-2024-superhero/LandingImpact`,
        [1, 2],
        ['Krater', 'Superheld'],
      ),
      solid: [0, 0],
      floor: true,
    },
  ], // 1,22 × 0,26 × 1,37
];

/** Thron, Altar, Bücher und Schätze. */
const TREASURE: readonly GameElement[][] = [
  [
    {
      ...thing(
        'mystery-vampire-throne',
        'Vampirthron',
        `${M5}/4-october-2024-vampire/Vampire_Throne`,
        [2, 1],
        ['Thron', 'Sessel', 'Vampir'],
      ),
      opens: 'sit',
    },
  ], // 1,63 × 1,56 × 0,84
  [
    small('mystery-goblet', 'Kelch', `${M5}/4-october-2024-vampire/Vampire_Goblet`, [
      'Becher',
      'Pokal',
    ]),
  ], // 0,65 × 0,50 × 0,32
  swapRing([
    small('mystery-gem-large', 'Blutstein, groß', `${M5}/4-october-2024-vampire/Gem_Large`, [
      'Edelstein',
      'Juwel',
    ]),
    small('mystery-gem-medium', 'Blutstein', `${M5}/4-october-2024-vampire/Gem_Medium`, [
      'Edelstein',
      'Juwel',
    ]),
    small('mystery-gem-small', 'Blutstein, klein', `${M5}/4-october-2024-vampire/Gem_Small`, [
      'Edelstein',
      'Juwel',
    ]),
  ]), // 0,40 × 0,57 × 0,16
  [
    thing(
      'mystery-font',
      'Weihwasserbecken',
      `${M6}/3-september-2025-cleric/Cleric_Font`,
      [1, 1],
      ['Brunnen', 'Taufbecken'],
    ),
  ], // 1,01 × 0,56 × 1,01
  [
    small('mystery-cleric-tome', 'Gebetbuch', `${M6}/3-september-2025-cleric/Cleric_Tome`, [
      'Buch',
    ]),
  ], // 0,60 × 0,46 × 0,19
  [
    thing(
      'mystery-lore-tome',
      'Großes Zauberbuch',
      `${M6}/1-july-2025-lorekeeper/Lorekeeper_Tome`,
      [2, 1],
      ['Buch', 'Pult'],
    ),
  ], // 1,11 × 1,16 × 0,80
  swapRing([
    thing(
      'mystery-orc-banner',
      'Orkbanner',
      `${M6}/2-august-2025-orc-brute/Orc_Banner`,
      [1, 1],
      ['Banner', 'Fahne', 'Ork'],
    ),
    thing(
      'mystery-orc-banner-large',
      'Orkbanner, groß',
      `${M6}/2-august-2025-orc-brute/Orc_Banner_Large`,
      [2, 2],
      ['Banner', 'Fahne', 'Ork'],
    ),
  ]), // 0,92 × 1,76 × 0,87
];

/** Waffen und Schilde für die Wand. */
const ARMS: readonly GameElement[][] = [
  swapRing([
    wall(
      'mystery-shield-black-knight',
      'Schild des Schwarzen Ritters',
      `${M5}/3-september-2024-black-knight/BlackKnight_Shield`,
      ['Schild'],
    ),
    wall(
      'mystery-shield-cleric',
      'Schild der Klerikerin',
      `${M6}/3-september-2025-cleric/Cleric_Shield`,
      ['Schild'],
    ),
    wall(
      'mystery-shield-plant',
      'Blätterschild',
      `${M6}/5-november-2025-plant-warrior/PlantWarrior_Shield`,
      ['Schild'],
    ),
    wall(
      'mystery-shield-barndoor',
      'Scheunentor-Schild',
      `${M6}/4-october-2025-monstrosity/Monstrosity_BarndoorShield`,
      ['Schild'],
    ),
  ]), // 0,52–0,87 m
  swapRing([
    wall(
      'mystery-sword-black-knight',
      'Schwert des Schwarzen Ritters',
      `${M5}/3-september-2024-black-knight/BlackKnight_Sword`,
      ['Schwert'],
    ),
    wall('mystery-sword-vampire', 'Vampirschwert', `${M5}/4-october-2024-vampire/Vampire_Sword`, [
      'Schwert',
    ]),
    wall(
      'mystery-sword-tiefling',
      'Tieflingsklinge',
      `${M5}/12-june-2025-tiefling/Tiefling_Sword`,
      ['Schwert'],
    ),
    wall('mystery-sword-hoarder', 'Sammlerschwert', `${M6}/8-february-2026-hoarder/Hoarder_Sword`, [
      'Schwert',
    ]),
    wall(
      'mystery-sword-avian',
      'Vogelklinge',
      `${M6}/9-march-2026-avian-swordsman/AvianSwordsman_Sword`,
      ['Schwert'],
    ),
  ]), // 0,07–0,19 tief, bis 1,45 m lang
  swapRing([
    wall('mystery-axe-orc', 'Orkaxt', `${M6}/2-august-2025-orc-brute/Orc_Axe`, ['Axt']),
    wall('mystery-axe-caveman', 'Steinaxt', `${M5}/8-february-2025-caveman/Caveman_Axe`, ['Axt']),
    wall('mystery-axe-frost', 'Frostaxt', `${M5}/7-january-2025-frostgolem/FrostGolem_Axe`, [
      'Axt',
    ]),
  ]),
  swapRing([
    wall('mystery-mace-cleric', 'Streitkolben', `${M6}/3-september-2025-cleric/Cleric_Mace`, [
      'Keule',
    ]),
    wall('mystery-club-caveman', 'Keule', `${M5}/8-february-2025-caveman/Caveman_Club`, ['Keule']),
  ]),
  swapRing([
    wall('mystery-spear-caveman', 'Steinspeer', `${M5}/8-february-2025-caveman/Caveman_Spear`, [
      'Speer',
    ]),
    wall(
      'mystery-spear-plant',
      'Blätterspeer',
      `${M6}/5-november-2025-plant-warrior/PlantWarrior_Spear`,
      ['Speer'],
    ),
    wall(
      'mystery-pitchfork-monstrosity',
      'Mistgabel',
      `${M6}/4-october-2025-monstrosity/Monstrosity_Pitchfork`,
      ['Gabel'],
    ),
  ]),
  swapRing([
    wall(
      'mystery-staff-lorekeeper',
      'Zauberstab des Bewahrers',
      `${M6}/1-july-2025-lorekeeper/Lorekeeper_Staff`,
      ['Stab'],
    ),
    wall(
      'mystery-wand-magical-girl',
      'Zauberstab',
      `${M6}/11-may-2026-magical-girl/MagicalGirl_Wand`,
      ['Stab'],
    ),
  ]),
];

/** Alle Gruppen, in der Reihenfolge der Unterordner. */
const GROUPS = [WORKSHOP, OUTDOOR, TREASURE, ARMS] as const;

/** Die Ids im Katalog — von jeder Familie die erste. */
function catalogue(group: readonly GameElement[][]): string[] {
  return group.map((family) => family[0]!.id);
}

/** **Alle Requisiten** — mit allen Fassungen. */
export const MYSTERY_ELEMENTS: readonly GameElement[] = GROUPS.flatMap((group) => group.flat());

/** **Der Ordner _Requisiten_** — nach Art, zuletzt _Alles_. */
export const MYSTERY_FOLDER: FurnitureFolder = {
  id: 'mystery',
  label: 'Requisiten',
  elements: [],
  cover: { element: 'mystery-vampire-throne' },
  folders: [
    {
      id: 'mystery-workshop',
      label: 'Werkstatt & Zauber',
      elements: catalogue(WORKSHOP),
      cover: { element: 'mystery-potionstation-decorated' },
    },
    {
      id: 'mystery-outdoor',
      label: 'Lager & Feld',
      elements: catalogue(OUTDOOR),
      cover: { element: 'mystery-tent' },
    },
    {
      id: 'mystery-treasure',
      label: 'Thron & Schätze',
      elements: catalogue(TREASURE),
      cover: { element: 'mystery-vampire-throne' },
    },
    {
      id: 'mystery-arms',
      label: 'Waffen an der Wand',
      elements: catalogue(ARMS),
      cover: { element: 'mystery-shield-black-knight' },
    },
    { id: 'mystery-all', label: 'Alles', elements: GROUPS.flatMap((group) => catalogue(group)) },
  ],
};
