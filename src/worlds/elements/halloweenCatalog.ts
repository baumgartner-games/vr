import type { FurnitureFolder, GameElement } from './elementCatalog';

/**
 * **Halloween im Katalog** — Friedhof, Zäune, Kürbisse und ein Stück
 * Bauernhof aus _Halloween Bits_ als Spielelemente. Gewünscht (Oktober 2026),
 * als Gruppe aus dem Modellregal: _„Halloween / Friedhof: Gräber, Särge,
 * Kürbisse, Zäune und Tore, Vogelscheuche, Laternen"_.
 *
 * **Der Maßstab des Regals** (0,5): Ein Grab ist damit 1,0 × 1,1 m, ein Zaun
 * 2 m lang und 1,1 m hoch, die Gruft 3 × 4 × 4 m. Hinter jeder Zeile steht,
 * was gemessen wurde: Breite × Höhe × Tiefe in Metern. Die Kacheln sind die
 * Maße, aufgerundet; was höchstens 0,6 m im Quadrat misst, steht auf einer
 * Zelle.
 *
 * **Zäune und Tore sind Wände** (`HALLOWEEN_FENCES`, Oktober 2026) — keine
 * Spielelemente, sondern Regalmodelle wie die Wände unter _Haus_: Sie rasten
 * auf der Fuge zwischen zwei Kacheln ein, lassen sich wie eine Wand ziehen
 * und schräg setzen, und die Tore sind Durchgänge wie die Tür
 * (`props.MODEL_ARCHES`, `elementCatalog.isDoorModel`). Gewünscht: _„es wäre
 * besser, wenn zaun von halloween wie wände behandelt werden? Zudem müsste
 * z. B. Zauntor auch wie eine tür sein. Ich brauche nur bei denen wenn die
 * einen raum umschließen keine Decke automatisch."_ Ein umzäunter Platz
 * bekommt deshalb keine Decke (`isFenceModel`, `HausbauWorld.coverRooms`).
 * Das Kürbistor ist 70 cm tief, für eine Fuge zu dick, und bleibt ein
 * Element, das nichts sperrt; die Pfeiler stehen auf einer Zelle.
 *
 * **Das Maisfeld ist auf eine Kachel gebracht** (`fit: 1`): In der Quelle
 * ist es 1,28 × 1,34 m und ließe sich ohne das nicht zu einem Irrgarten
 * reihen.
 *
 * **Die Bäume** stehen wie die schmalen Bäume der Natur (`natureCatalog.ts`,
 * `sapling`) auf einer Zelle und an ihrem Ursprung. Der mittlere Herbstbaum
 * und der große tote Baum stehen schon unter _Natur_; hier stehen die anderen
 * Größen.
 *
 * **Was fehlt**: die einzelnen Bonbons und Lollis (dreißig Krümel; die
 * Bonboneimer sind da), die Grube (`floor_dirt_grave` steckt 75 cm im Boden)
 * und die hängende Laterne.
 */

/** Eine Adresse aus _Halloween Bits_. */
function spooky(name: string): string {
  return `halloween-bits/${name}.glb`;
}

/** So hoch ist der Körper — wie bei jedem Möbel: Darüber springt niemand. */
const BODY = 1.4;

/** Eine Zelle, eine halbe Kachel im Quadrat. */
const ONE_CELL: readonly [number, number] = [0.5, 0.5];

/** Was nichts sperrt — Weg, Erde, offener Torbogen. */
const NOTHING: readonly [number, number] = [0, 0];

/** Etwas, das seine Kacheln sperrt. */
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
    parts: [{ model: spooky(file) }],
  };
}

/** Etwas Kleines, das auf eine Ablage passt — oder auf den Boden. */
function small(id: string, label: string, file: string, aka?: readonly string[]): GameElement {
  return { ...thing(id, label, file, ONE_CELL, aka), rests: true };
}

/** Ein Belag: flach, sperrt nichts, und darauf steht, was man will. */
function ground(
  id: string,
  label: string,
  file: string,
  tiles: readonly [number, number],
): GameElement {
  return { ...thing(id, label, file, tiles), solid: NOTHING, floor: true };
}

/** Ein schmaler Baum auf einer Zelle, an seinem Ursprung (`natureCatalog.sapling`). */
function tree(id: string, label: string, file: string): GameElement {
  return {
    id,
    label,
    aka: ['Baum'],
    tiles: ONE_CELL,
    height: BODY,
    kind: null,
    parts: [{ model: spooky(file), rooted: true }],
  };
}

/**
 * **Die Elemente zu Halloween** — im Katalog unter _Halloween_
 * (`HALLOWEEN_FOLDER`), nach Art. Gemessen bei 0,5: Breite × Höhe × Tiefe.
 */
export const HALLOWEEN_ELEMENTS: readonly GameElement[] = [
  // Friedhof
  thing('halloween-grave-a', 'Grab', 'grave_A', [1, 1], ['Friedhof']), // 1,00 × 1,06 × 0,50
  thing('halloween-grave-b', 'Grab mit Kreuz', 'grave_B', [1, 1], ['Friedhof']), // 1,00 × 1,10 × 0,50
  thing('halloween-grave-broken', 'Zerfallenes Grab', 'grave_A_destroyed', [1, 1], ['Friedhof']), // 1,04 × 1,05 × 0,57
  thing('halloween-gravestone', 'Grabstein', 'gravestone', [1, 1], ['Friedhof']), // 0,70 × 0,80 × 0,20
  thing('halloween-gravemarker-a', 'Grabkreuz', 'gravemarker_A', ONE_CELL, ['Friedhof']), // 0,40 × 0,60 × 0,14
  thing('halloween-gravemarker-b', 'Kleiner Grabstein', 'gravemarker_B', ONE_CELL, ['Friedhof']), // 0,40 × 0,59 × 0,21
  thing('halloween-coffin', 'Sarg', 'coffin', [1, 2], ['Friedhof']), // 1,00 × 0,66 × 1,50
  thing('halloween-coffin-open', 'Offener Sarg', 'coffin_decorated', [1, 2], ['Friedhof']), // 1,00 × 0,45 × 1,50
  thing('halloween-crypt', 'Gruft', 'crypt', [3, 4], ['Friedhof', 'Mausoleum']), // 3,00 × 4,00 × 4,00
  thing('halloween-shrine', 'Bildstock', 'shrine', ONE_CELL, ['Friedhof', 'Schrein']), // 0,55 × 1,20 × 0,55
  thing('halloween-shrine-candles', 'Bildstock mit Kerzen', 'shrine_candles', ONE_CELL, [
    'Schrein',
  ]), // 0,55 × 0,89 × 0,55
  thing('halloween-plaque', 'Grabplatte', 'plaque', [1, 1], ['Friedhof']), // 1,00 × 0,20 × 1,00
  thing(
    'halloween-plaque-candles',
    'Grabplatte mit Kerzen',
    'plaque_candles',
    [1, 1],
    ['Friedhof'],
  ), // 1,00 × 0,57 × 1,00
  thing('halloween-pillar', 'Steinpfeiler', 'pillar', ONE_CELL, ['Säule']), // 0,50 × 2,20 × 0,50
  ground('halloween-dirt', 'Erdboden', 'floor_dirt', [2, 2]), // 2,00 × 0,01 über dem Boden × 2,00
  ground('halloween-dirt-small', 'Erdfleck', 'floor_dirt_small', [1, 1]), // 1,00 × 0,02 × 1,00
  // Zäune & Tore — die Zäune selbst sind Wände (`HALLOWEEN_FENCES`); hier
  // stehen nur, was keine Fuge hat: die Pfeiler und das Kürbistor.
  thing('halloween-fence-pillar', 'Zaunpfeiler', 'fence_pillar', ONE_CELL, ['Zaun']), // 0,25 × 1,10 × 0,25
  thing('halloween-fence-pillar-broken', 'Kaputter Zaunpfeiler', 'fence_pillar_broken', ONE_CELL, [
    'Zaun',
  ]), // 0,25 × 0,75 × 0,25
  {
    ...thing(
      'halloween-gate-spooky',
      'Kürbistor',
      'wooden_gate_halloween',
      [2, 1],
      ['Tor', 'Kürbis'],
    ),
    solid: NOTHING,
  }, // 2,00 × 2,82 × 0,70
  {
    ...thing(
      'halloween-maze',
      'Maisfeld',
      'maze_short',
      [1, 1],
      ['Mais', 'Irrgarten', 'Labyrinth'],
    ),
    parts: [{ model: spooky('maze_short'), fit: 1 }],
  }, // 1,28 × 1,75 × 1,34 → eine Kachel
  {
    ...thing(
      'halloween-maze-tall',
      'Hohes Maisfeld',
      'maze_tall',
      [1, 1],
      ['Mais', 'Irrgarten', 'Labyrinth'],
    ),
    parts: [{ model: spooky('maze_tall'), fit: 1 }],
  }, // 1,34 × 2,55 × 1,28 → eine Kachel
  // Kürbisse & Deko
  thing(
    'halloween-jackolantern',
    'Kürbislaterne',
    'pumpkin_orange_jackolantern',
    [1, 1],
    ['Kürbis'],
  ), // 0,75 × 0,65 × 0,70
  thing(
    'halloween-jackolantern-yellow',
    'Gelbe Kürbislaterne',
    'pumpkin_yellow_jackolantern',
    [1, 1],
    ['Kürbis'],
  ), // 0,75 × 0,65 × 0,70
  small('halloween-pumpkin', 'Kürbis', 'pumpkin_orange'), // 0,50 × 0,35 × 0,50
  small('halloween-pumpkin-yellow', 'Gelber Kürbis', 'pumpkin_yellow', ['Kürbis']), // 0,50 × 0,35 × 0,50
  small('halloween-pumpkin-small', 'Kleiner Kürbis', 'pumpkin_orange_small', ['Kürbis']), // 0,30 × 0,27 × 0,30
  small('halloween-pumpkin-small-yellow', 'Kleiner gelber Kürbis', 'pumpkin_yellow_small', [
    'Kürbis',
  ]), // 0,30 × 0,27 × 0,30
  small('halloween-candle', 'Kerze', 'candle'), // 0,15 × 0,39 × 0,15
  small('halloween-candle-melted', 'Heruntergebrannte Kerze', 'candle_melted', ['Kerze']), // 0,15 × 0,32 × 0,15
  small('halloween-candles', 'Drei Kerzen', 'candle_triple', ['Kerze']), // 0,23 × 0,39 × 0,18
  small('halloween-lantern', 'Laterne', 'lantern_standing'), // 0,32 × 0,46 × 0,32
  small('halloween-skull', 'Schädel', 'skull', ['Totenkopf']), // 0,46 × 0,45 × 0,45
  small('halloween-skull-candle', 'Schädel mit Kerze', 'skull_candle', ['Totenkopf', 'Kerze']), // 0,46 × 0,59 × 0,47
  small('halloween-ribcage', 'Brustkorb', 'ribcage', ['Skelett', 'Knochen']), // 0,42 × 0,43 × 0,37
  small('halloween-bone', 'Knochen', 'bone_C', ['Skelett']), // 0,55 × 0,14 × 0,10
  small('halloween-candy-bucket', 'Süßigkeiteneimer', 'candy_bucket_A_decorated', [
    'Bonbons',
    'Eimer',
  ]), // 0,45 × 0,59 × 0,41
  small('halloween-candy-bucket-b', 'Süßigkeitenkessel', 'candy_bucket_B_decorated', [
    'Bonbons',
    'Kessel',
  ]), // 0,50 × 0,62 × 0,50
  // Bauernhof
  thing('halloween-scarecrow', 'Vogelscheuche', 'scarecrow', [1, 1]), // 0,84 × 1,16 × 0,48
  thing('halloween-haybale', 'Heuballen', 'haybale', [1, 1], ['Stroh']), // 1,05 × 0,55 × 0,55
  thing('halloween-wagon', 'Leiterwagen', 'wagon', [2, 3], ['Wagen']), // 1,49 × 1,24 × 2,49
  thing('halloween-wagon-hay', 'Heuwagen', 'wagon_hay', [2, 3], ['Wagen', 'Heu']), // 1,49 × 1,52 × 2,49
  thing('halloween-tractor', 'Traktor', 'tractor', [2, 2]), // 1,43 × 1,40 × 2,09
  thing('halloween-pitchfork', 'Mistgabel', 'pitchfork', ONE_CELL, ['Heugabel']), // 0,32 × 1,15 × 0,10, steckt im Boden
  thing('halloween-sign', 'Wegweiser', 'sign_both', [1, 1], ['Schild']), // 0,95 × 1,25 × 0,30
  thing('halloween-sign-left', 'Schild nach links', 'sign_left', [1, 1], ['Schild']), // 0,80 × 1,00 × 0,30
  thing('halloween-sign-right', 'Schild nach rechts', 'sign_right', [1, 1], ['Schild']), // 0,80 × 1,00 × 0,30
  { ...thing('halloween-post', 'Pfahl', 'post', [1, 1]), solid: ONE_CELL }, // 0,21 × 1,65 × 0,78
  {
    ...thing('halloween-post-lantern', 'Pfahl mit Laterne', 'post_lantern', [1, 1], ['Laterne']),
    solid: ONE_CELL,
  }, // 0,32 × 1,65 × 0,78
  {
    ...thing('halloween-post-skull', 'Pfahl mit Schädel', 'post_skull', [1, 1], ['Totenkopf']),
    solid: ONE_CELL,
  }, // 0,40 × 1,65 × 0,78
  thing('halloween-bench', 'Gartenbank', 'bench', [1, 1], ['Bank']), // 1,00 × 0,25 × 0,38
  thing('halloween-bench-decorated', 'Gartenbank, geschmückt', 'bench_decorated', [1, 1], ['Bank']), // 1,00 × 0,84 × 0,51
  ground('halloween-path-a', 'Trittsteine', 'path_A', [1, 1]), // 0,95 × 0,05 × 0,94
  ground('halloween-path-b', 'Trittsteine B', 'path_B', [1, 1]), // 0,94 × 0,05 × 0,93
  ground('halloween-path-c', 'Trittsteine C', 'path_C', [1, 1]), // 0,93 × 0,05 × 0,93
  // Bäume — eine Zelle, am Ursprung.
  tree('halloween-tree-dead-small', 'Kleiner toter Baum', 'tree_dead_small'), // 0,70 × 1,49
  tree('halloween-tree-dead-medium', 'Toter Baum, schmal', 'tree_dead_medium'), // 0,90 × 2,09
  tree('halloween-tree-dead-decorated', 'Toter Baum mit Laterne', 'tree_dead_large_decorated'), // 1,15 × 2,71
  tree('halloween-tree-orange-small', 'Kleiner Herbstbaum, orange', 'tree_pine_orange_small'), // 1,20 × 2,02
  tree('halloween-tree-orange-large', 'Großer Herbstbaum, orange', 'tree_pine_orange_large'), // 2,38 × 3,74
  tree('halloween-tree-yellow-small', 'Kleiner Herbstbaum, gelb', 'tree_pine_yellow_small'), // 1,20 × 2,02
  tree('halloween-tree-yellow-large', 'Großer Herbstbaum, gelb', 'tree_pine_yellow_large'), // 2,38 × 3,74
];

/** Die Ids in der Reihenfolge des Katalogs. */
export const HALLOWEEN_CATALOGUE: readonly string[] = HALLOWEEN_ELEMENTS.map((one) => one.id);

/**
 * **Die Zäune und Tore als Wände** — Regalmodelle, die auf der Fuge stehen
 * (siehe oben). Alle 2 m lang; ein halbes Stück gibt es nicht, eine gezogene
 * Linie ungerader Länge endet also eine Kachel früher
 * (`elementCatalog.wallHalfOf`). Gemessen bei 0,5: Breite × Höhe × Tiefe.
 */
export const HALLOWEEN_FENCES: readonly string[] = [
  spooky('fence'), // 2,00 × 1,10 × 0,25
  spooky('fence_broken'), // 2,00 × 1,10 × 0,25
  spooky('fence_seperate'), // 2,00 × 1,00 × 0,08
  spooky('fence_seperate_broken'), // 2,00 × 1,00 × 0,08
  spooky('fence_gate'), // 2,00 × 1,50 × 0,25
  spooky('arch'), // 2,11 × 2,21 × 0,38
  spooky('arch_gate'), // 2,11 × 2,21 × 0,38
  spooky('wooden_gate'), // 2,00 × 2,00 × 0,20
];

/** **Welche davon Tore sind** — Durchgänge wie die Tür (`props.MODEL_ARCHES`). */
export const HALLOWEEN_GATES: readonly string[] = [
  spooky('fence_gate'),
  spooky('arch'),
  spooky('arch_gate'),
  spooky('wooden_gate'),
];

/** **Die Namen der Zäune im Katalog** (`elementCatalog.BUILD_LABELS`). */
export const HALLOWEEN_FENCE_LABELS: Readonly<Record<string, string>> = {
  [spooky('fence')]: 'Eisenzaun',
  [spooky('fence_broken')]: 'Kaputter Eisenzaun',
  [spooky('fence_seperate')]: 'Lattenzaun',
  [spooky('fence_seperate_broken')]: 'Kaputter Lattenzaun',
  [spooky('fence_gate')]: 'Eisentor',
  [spooky('arch')]: 'Torbogen',
  [spooky('arch_gate')]: 'Torbogen mit Gitter',
  [spooky('wooden_gate')]: 'Holztorbogen',
};

/** Die Ids, deren Name so anfängt. */
function ofKind(...prefixes: string[]): string[] {
  return HALLOWEEN_CATALOGUE.filter((id) => prefixes.some((prefix) => id.startsWith(prefix)));
}

/**
 * **Der Ordner _Halloween_** — Friedhof, Zäune & Tore, Kürbisse & Deko,
 * Bauernhof, Bäume, zuletzt _Alles_.
 */
export const HALLOWEEN_FOLDER: FurnitureFolder = {
  id: 'halloween',
  label: 'Halloween',
  elements: [],
  cover: { element: 'halloween-jackolantern' },
  folders: [
    {
      id: 'halloween-graveyard',
      label: 'Friedhof',
      elements: ofKind(
        'halloween-grave',
        'halloween-coffin',
        'halloween-crypt',
        'halloween-shrine',
        'halloween-plaque',
        'halloween-pillar',
        'halloween-dirt',
      ),
      cover: { element: 'halloween-grave-b' },
    },
    {
      id: 'halloween-fences',
      label: 'Zäune & Tore',
      elements: ofKind('halloween-fence', 'halloween-gate'),
      models: HALLOWEEN_FENCES,
      cover: { model: spooky('arch_gate') },
    },
    {
      id: 'halloween-decor',
      label: 'Kürbisse & Deko',
      elements: ofKind(
        'halloween-jackolantern',
        'halloween-pumpkin',
        'halloween-candle',
        'halloween-lantern',
        'halloween-skull',
        'halloween-ribcage',
        'halloween-bone',
        'halloween-candy',
      ),
      cover: { element: 'halloween-jackolantern' },
    },
    {
      id: 'halloween-farm',
      label: 'Bauernhof',
      elements: ofKind(
        'halloween-scarecrow',
        'halloween-haybale',
        'halloween-wagon',
        'halloween-tractor',
        'halloween-pitchfork',
        'halloween-sign',
        'halloween-post',
        'halloween-bench',
        'halloween-path',
        'halloween-maze',
      ),
      cover: { element: 'halloween-scarecrow' },
    },
    {
      id: 'halloween-trees',
      label: 'Bäume',
      elements: ofKind('halloween-tree'),
      cover: { element: 'halloween-tree-dead-decorated' },
    },
    {
      id: 'halloween-all',
      label: 'Alles',
      elements: HALLOWEEN_CATALOGUE,
      models: HALLOWEEN_FENCES,
    },
  ],
};
