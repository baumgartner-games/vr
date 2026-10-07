import type { ElementPart, FurnitureFolder, GameElement } from './elementCatalog';

/**
 * **Weihnachten im Katalog** — Tannenbaum, Geschenke, Schneemann, die
 * Spielzeugeisenbahn und Lebkuchen-Bausteine aus _Holiday Bits_ als
 * Spielelemente. Gewünscht (Oktober 2026), als Gruppe aus dem Modellregal:
 * _„Weihnachten (holiday-bits): Geschenke, Schneemann, Kranz, Eisenbahn mit
 * Schienen"_.
 *
 * **Der Maßstab des Regals** (0,5): Der Tannenbaum ist damit 2 m hoch, der
 * Sessel 1,07 m, ein Lebkuchenblock 2 × 2 × 2 m. Hinter jeder Zeile steht, was
 * gemessen wurde: Breite × Höhe × Tiefe in Metern. Die Kacheln sind die Maße,
 * aufgerundet; was höchstens 0,6 m im Quadrat misst, steht auf einer Zelle.
 *
 * **Die Eisenbahn ist ein Stück** (`train`): Lok, Tender und zwei Wagen auf
 * vier Gleisen, zwei Kacheln lang. Die Gleise der Quelle sind 25 cm breit und
 * lassen sich nicht einzeln zu einem Kreis legen, ohne dass der Katalog
 * Kurven an Kacheln ausrichtet, die nicht auf seinem Raster liegen
 * (`tracks_curve` ist 1,12 m). Ebenso der **Geschenkehaufen** (`presentPile`):
 * fünf Päckchen, die man nicht einzeln hinstellen muss.
 *
 * **Was fehlt**: was hängt oder an die Wand gehört (Kranz, Mistelzweig,
 * Glocke), das Dach des Lebkuchenhauses (seine Stücke reichen 56 cm unter
 * ihren Ursprung und gehören auf Wände, nicht auf Kacheln), die Tür und die
 * Schneebälle einzeln.
 */

/** Eine Adresse aus _Holiday Bits_. */
function holiday(name: string): string {
  return `holiday-bits/${name}.glb`;
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
  aka?: readonly string[],
): GameElement {
  return {
    id,
    label,
    ...(aka ? { aka } : {}),
    tiles,
    height: BODY,
    kind: null,
    parts: [{ model: holiday(file) }],
  };
}

/** Etwas Kleines, das auf eine Ablage passt — oder auf den Boden. */
function small(id: string, label: string, file: string, aka?: readonly string[]): GameElement {
  return { ...thing(id, label, file, ONE_CELL, aka), rests: true };
}

/** Ein Teppich: flach, sperrt nichts, und darauf steht, was man will. */
function rug(
  id: string,
  label: string,
  file: string,
  tiles: readonly [number, number],
): GameElement {
  return { ...thing(id, label, file, tiles, ['Teppich']), solid: [0, 0], floor: true };
}

/**
 * **Was in einem Geschenk liegt** (`opens: 'unwrap'`) — gewünscht: _„Geschenke
 * ja."_ `A` packt es aus (`elementActs.ts`), eines davon kommt in die Hand, und
 * nach einer Weile ist das Geschenk wieder eingepackt.
 */
const PRESENT_TOYS: readonly string[] = [
  holiday('basketball'),
  holiday('football'),
  holiday('train_locomotive'),
  holiday('gingerbread_man'),
  holiday('candy_peppermint'),
  holiday('snowball'),
  'mixed-bag/chicken_plushie_A.glb',
  'mixed-bag/puzzlecube_complete.glb',
];

/** Ein Geschenk, das sich auspacken lässt. */
function present(element: GameElement): GameElement {
  return { ...element, opens: 'unwrap', yields: PRESENT_TOYS };
}

/** Die Farben, in denen es Geschenke und Sessel gibt. */
const COLOR_LABEL: Readonly<Record<string, string>> = {
  red: 'rot',
  green: 'grün',
  blue: 'blau',
  yellow: 'gelb',
  white: 'weiß',
  brown: 'braun',
};

/**
 * **Die Spielzeugeisenbahn** — vier gerade Gleise hintereinander (2 m, von
 * Nord nach Süd), darauf Lok, Kohlentender, Personenwagen und ein Tender mit
 * Geschenken. Die Wagen stehen auf dem Gleis (`on: 0`), Stoß an Stoß.
 */
function train(): GameElement {
  const tracks: ElementPart[] = [-0.75, -0.25, 0.25, 0.75].map((z) => ({
    model: holiday('tracks_straight'),
    at: [0, z],
  }));
  // Längen der Wagen: 0,43 + 0,32 + 0,49 + 0,32 = 1,56 m, mittig auf dem Gleis.
  const cars: ElementPart[] = [
    { model: holiday('train_locomotive'), at: [0, -0.565], on: 0 },
    { model: holiday('train_tender_coal'), at: [0, -0.19], on: 0 },
    { model: holiday('train_wagon'), at: [0, 0.215], on: 0 },
    { model: holiday('train_tender_presents_A'), at: [0, 0.62], on: 0 },
  ];
  return {
    id: 'holiday-train',
    label: 'Spielzeugeisenbahn',
    aka: ['Eisenbahn', 'Zug', 'Lok', 'Gleis', 'Schienen'],
    tiles: [1, 2],
    height: BODY,
    kind: null,
    parts: [...tracks, ...cars],
  };
}

/** **Ein Haufen Geschenke** — fünf Päckchen in fünf Farben auf einer Kachel. */
function presentPile(): GameElement {
  return {
    opens: 'unwrap',
    yields: PRESENT_TOYS,
    id: 'holiday-presents-pile',
    label: 'Geschenkehaufen',
    aka: ['Geschenke', 'Päckchen'],
    tiles: [1, 1],
    height: BODY,
    kind: null,
    parts: [
      { model: holiday('present_D_red'), at: [-0.2, -0.2] }, // 0,48 × 0,53 × 0,48
      { model: holiday('present_C_blue'), at: [0.25, -0.2], yaw: 0.4 }, // 0,38 × 0,23 × 0,28
      { model: holiday('present_A_green'), at: [0.25, 0.22], yaw: -0.3 }, // 0,28 × 0,33 × 0,28
      { model: holiday('present_B_yellow'), at: [-0.22, 0.25], yaw: 0.2 }, // 0,26 × 0,53 × 0,25
      { model: holiday('present_A_white'), at: [0.25, -0.2], on: 1, yaw: 0.9 }, // obenauf
    ],
  };
}

/**
 * **Die Elemente zu Weihnachten** — im Katalog unter _Weihnachten_
 * (`HOLIDAY_FOLDER`), nach Art. Gemessen bei 0,5: Breite × Höhe × Tiefe.
 */
export const HOLIDAY_ELEMENTS: readonly GameElement[] = [
  // Tannenbaum
  thing('holiday-tree', 'Weihnachtsbaum', 'christmas_tree', [1, 1], ['Tannenbaum', 'Christbaum']), // 1,20 × 2,02 × 1,16
  {
    ...thing(
      'holiday-tree-decorated',
      'Weihnachtsbaum mit Geschenken',
      'christmas_tree_decorated',
      [2, 2],
      ['Tannenbaum', 'Christbaum'],
    ),
    solid: [1, 1],
  }, // 1,46 × 2,12 × 1,46 — gesperrt nur die Mitte, die Geschenke liegen drumherum
  thing(
    'holiday-tree-plain',
    'Tanne ohne Lichter',
    'christmas_tree_withoutLights',
    [1, 1],
    ['Tannenbaum'],
  ), // 1,20 × 2,02 × 1,16
  small('holiday-tree-stand', 'Christbaumständer', 'christmas_tree_base'), // 0,45 × 0,25 × 0,45
  // Geschenke — jede Form in einer anderen Farbe; der Haufen hat fünf.
  presentPile(),
  ...(
    [
      ['A', 'red', 'Geschenk'],
      ['B', 'green', 'Hohes Geschenk'],
      ['C', 'blue', 'Flaches Geschenk'],
      ['D', 'yellow', 'Großes Geschenk'],
      ['sphere_A', 'white', 'Rundes Geschenk'],
      ['sphere_B', 'red', 'Großes rundes Geschenk'],
    ] as const
  ).map(([shape, color, label]) =>
    present(
      small(
        `holiday-present-${shape.replace('_', '-').toLowerCase()}`,
        `${label}, ${COLOR_LABEL[color]}`,
        `present_${shape}_${color}`,
        ['Geschenk', 'Päckchen'],
      ),
    ),
  ), // 0,26–0,48 m
  present({
    ...thing('holiday-present-e', 'Langes Geschenk, grün', 'present_E_green', [1, 1], ['Geschenk']),
    rests: true,
  }), // 0,68 × 0,23 × 0,28
  present({
    ...thing('holiday-present-f', 'Riesengeschenk, rot', 'present_F_red', [1, 1], ['Geschenk']),
    rests: true,
  }), // 1,08 × 0,23 × 0,48
  // Schnee
  thing('holiday-snowman', 'Schneemann', 'snowman_B', [1, 1]), // 1,08 × 1,35 × 0,68
  thing('holiday-snowman-small', 'Kleiner Schneemann', 'snowman_A', [1, 1], ['Schneemann']), // 1,08 × 1,02 × 0,68
  thing('holiday-snowball-pile', 'Schneeballhaufen', 'snowball_pile', ONE_CELL, ['Schneeball']), // 0,59 × 0,45 × 0,53
  thing('holiday-snowball-cannon', 'Schneeballkanone', 'snowball_cannon', ONE_CELL, ['Schneeball']), // 0,30 × 0,36 × 0,48
  // Deko
  thing('holiday-lantern', 'Laterne', 'lantern', ONE_CELL), // 0,50 × 1,97 × 0,45
  thing('holiday-lantern-decorated', 'Laterne mit Schleife', 'lantern_decorated', ONE_CELL, [
    'Laterne',
  ]), // 0,50 × 2,00 × 0,45
  { ...thing('holiday-candycane', 'Zuckerstange', 'candycane_large', [1, 1]), solid: ONE_CELL }, // 0,72 × 1,61 × 0,21
  small('holiday-lantern-mini', 'Kleine Laterne', 'lantern_mini', ['Laterne']), // 0,08 × 0,32 × 0,08
  small('holiday-gingerbread-house', 'Lebkuchenhaus', 'gingerbread_house', ['Knusperhaus']), // 0,57 × 0,72 × 0,56
  {
    ...thing(
      'holiday-gingerbread-house-decorated',
      'Lebkuchenhaus, verziert',
      'gingerbread_house_decorated',
      [1, 1],
      ['Knusperhaus'],
    ),
    rests: true,
  }, // 0,78 × 0,82 × 0,78
  // Wohnzimmer
  ...(['red', 'green', 'blue', 'brown'] as const).map((color) =>
    thing(
      `holiday-armchair-${color}`,
      `Ohrensessel, ${COLOR_LABEL[color]}`,
      `chair_large_${color}`,
      [1, 1],
      ['Sessel'],
    ),
  ), // 0,92 × 1,07 × 0,81
  ...(['red', 'green', 'blue', 'brown'] as const).map((color) =>
    thing(
      `holiday-footstool-${color}`,
      `Fußbank, ${COLOR_LABEL[color]}`,
      `footstool_${color}`,
      ONE_CELL,
      ['Hocker'],
    ),
  ), // 0,41 × 0,22 × 0,34
  thing('holiday-stool', 'Schemel', 'stool', ONE_CELL, ['Hocker']), // 0,50 × 0,35 × 0,50
  rug('holiday-carpet-large', 'Runder Teppich', 'carpet_round_large', [2, 2]), // 1,46 × 0,02 × 1,46
  rug('holiday-carpet-small', 'Kleiner runder Teppich', 'carpet_round_small', [1, 1]), // 1,00 × 0,03 × 1,00
  small('holiday-hot-chocolate', 'Heiße Schokolade', 'hot_chocolate_decorated', ['Kakao', 'Tasse']), // 0,34 × 0,29 × 0,25
  small('holiday-milk', 'Milch', 'milk', ['Flasche']), // 0,15 × 0,30 × 0,15
  small('holiday-cookies', 'Plätzchenteller', 'plate_decorated_A', ['Kekse', 'Teller']), // 0,54 × 0,29 × 0,48
  small('holiday-cookie-plate', 'Teller mit Lebkuchen', 'plate_decorated_B', ['Kekse', 'Teller']), // 0,48 × 0,32 × 0,48
  small('holiday-gingerbread-man', 'Lebkuchenmann', 'gingerbread_man', ['Keks']), // 0,28 × 0,06 × 0,37
  // Spielzeug
  train(),
  small('holiday-basketball', 'Basketball', 'basketball', ['Ball']), // 0,37 rund
  small('holiday-football', 'Fußball', 'football', ['Ball']), // 0,28 rund
  // Lebkuchen-Bausteine — ganze Klötze und Wände aus dem Paket, keine eigenen.
  thing(
    'holiday-block-large',
    'Lebkuchenblock',
    'cube_gingerbread_large_A',
    [2, 2],
    ['Lebkuchen', 'Klotz'],
  ), // 2,04 × 2,00 × 2,04
  thing(
    'holiday-block-large-b',
    'Lebkuchenblock mit Zuckerguss',
    'cube_gingerbread_large_B',
    [2, 2],
    ['Lebkuchen', 'Klotz'],
  ), // 2,14 × 2,00 × 2,14
  thing(
    'holiday-block-small',
    'Kleiner Lebkuchenblock',
    'cube_gingerbread_small_A',
    [1, 1],
    ['Lebkuchen', 'Klotz'],
  ), // 1,04 × 1,00 × 1,04
  thing(
    'holiday-block-small-b',
    'Kleiner Lebkuchenblock mit Zuckerguss',
    'cube_gingerbread_small_B',
    [1, 1],
    ['Lebkuchen', 'Klotz'],
  ), // 1,14 × 1,00 × 1,14
  thing(
    'holiday-pillar',
    'Lebkuchensäule',
    'pillar_gingerbread_large_A',
    [1, 1],
    ['Lebkuchen', 'Säule'],
  ), // 1,05 × 2,00 × 1,05
  thing('holiday-pillar-small', 'Schmale Lebkuchensäule', 'pillar_gingerbread_small_A', ONE_CELL, [
    'Lebkuchen',
    'Säule',
  ]), // 0,54 × 2,00 × 0,54
  thing('holiday-wall', 'Lebkuchenwand', 'wall_gingerbread_A', [2, 1], ['Lebkuchen', 'Wand']), // 2,00 × 2,00 × 0,54
  thing(
    'holiday-wall-window',
    'Lebkuchenwand mit Fenster',
    'wall_gingerbread_window_A',
    [2, 1],
    ['Lebkuchen', 'Wand', 'Fenster'],
  ), // 2,00 × 2,00 × 0,55
];

/** Die Ids in der Reihenfolge des Katalogs. */
export const HOLIDAY_CATALOGUE: readonly string[] = HOLIDAY_ELEMENTS.map((one) => one.id);

/** Die Ids, deren Name so anfängt. */
function ofKind(...prefixes: string[]): string[] {
  return HOLIDAY_CATALOGUE.filter((id) => prefixes.some((prefix) => id.startsWith(prefix)));
}

/**
 * **Der Ordner _Weihnachten_** — Tannenbaum, Geschenke, Schnee, Deko,
 * Wohnzimmer, Spielzeug, Lebkuchen, zuletzt _Alles_.
 */
export const HOLIDAY_FOLDER: FurnitureFolder = {
  id: 'holiday',
  label: 'Weihnachten',
  elements: [],
  cover: { element: 'holiday-tree-decorated' },
  folders: [
    {
      id: 'holiday-trees',
      label: 'Tannenbaum',
      elements: ofKind('holiday-tree'),
      cover: { element: 'holiday-tree' },
    },
    {
      id: 'holiday-presents',
      label: 'Geschenke',
      elements: ofKind('holiday-present'),
      cover: { element: 'holiday-presents-pile' },
    },
    {
      id: 'holiday-snow',
      label: 'Schnee',
      elements: ofKind('holiday-snow'),
      cover: { element: 'holiday-snowman' },
    },
    {
      id: 'holiday-decor',
      label: 'Deko',
      elements: ofKind('holiday-lantern', 'holiday-candycane', 'holiday-gingerbread-house'),
      cover: { element: 'holiday-candycane' },
    },
    {
      id: 'holiday-living',
      label: 'Wohnzimmer',
      elements: ofKind(
        'holiday-armchair',
        'holiday-footstool',
        'holiday-stool',
        'holiday-carpet',
        'holiday-hot-chocolate',
        'holiday-milk',
        'holiday-cookie',
        'holiday-gingerbread-man',
      ),
      cover: { element: 'holiday-armchair-red' },
    },
    {
      id: 'holiday-toys',
      label: 'Spielzeug',
      elements: ofKind('holiday-train', 'holiday-basketball', 'holiday-football'),
      cover: { element: 'holiday-train' },
    },
    {
      id: 'holiday-gingerbread',
      label: 'Lebkuchen',
      elements: ofKind('holiday-block', 'holiday-pillar', 'holiday-wall'),
      cover: { element: 'holiday-block-large-b' },
    },
    { id: 'holiday-all', label: 'Alles', elements: HOLIDAY_CATALOGUE },
  ],
};
