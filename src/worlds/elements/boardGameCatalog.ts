import type { FurnitureFolder, GameElement } from './elementCatalog';
import { catalogueOf, COLOR_WORDS, swapRing } from './elementFamily';

/**
 * **Das Brettspiel im Katalog** — _Board Game Bits_ als Spielelemente, ein
 * eigener Ordner. Gewünscht (Oktober 2026): _„Würfel zum würfeln ja. Dann wird
 * der Würfel nur animiert auf dem eigenen Feld hochgeworfen und dreht sich.
 * Die Game Board Bits gerne als eigenen Ordner in Katalog."_
 *
 * **Ein Riesen-Brettspiel**, im Maßstab des Regals (0,5): Das Brett ist fünf
 * mal fünf Meter, ein Feld darauf gut sechzig Zentimeter, und jede Figur,
 * jeder Würfel und jede Münze steht auf einer Zelle. Man spielt darauf, nicht
 * daran. Nur zwei Dinge sind umgerechnet: die Pokerchips (1,5 m in der
 * Quelle, auf ein Drittel) und die Spielkarten, die flach auf dem Boden liegen
 * statt drei Meter hoch dazustehen.
 *
 * **Würfel werfen** (`opens: 'roll'`, `elementActs.ts`): `A` wirft den Würfel
 * auf seiner Zelle hoch, er dreht sich und landet wieder.
 *
 * **Farben sind Fassungen** (`elementFamily.swapRing`): Im Katalog steht jede
 * Form einmal, die Farbe wechselt man im Element-Menü. Hinter jeder Zeile
 * steht, was gemessen wurde: Breite × Höhe × Tiefe in Metern.
 */

/** Eine Adresse aus _Board Game Bits_. */
function board(name: string): string {
  return `board-game-bits/${name}.glb`;
}

/** So hoch ist der Körper — wie bei jedem Möbel: Darüber springt niemand. */
const BODY = 1.4;

/** Eine Zelle, eine halbe Kachel im Quadrat. */
const ONE_CELL: readonly [number, number] = [0.5, 0.5];

/** Die vier Spielerfarben, in der Reihenfolge der Fassungen. */
const COLORS = ['blue', 'green', 'red', 'yellow'] as const;

/** Wie die Karten flach liegen: auf den Rücken gelegt, so lang wie eine Kachel. */
const CARD_FIT = 0.9;

/** Die Pokerchips: 1,5 m in der Quelle, auf eine halbe Kachel. */
const CHIP_SCALE = 1 / 3;

/** Etwas Kleines auf einer Zelle — auf den Boden, auf das Brett oder einen Tisch. */
function small(id: string, label: string, file: string, aka: readonly string[] = []): GameElement {
  return {
    id,
    label,
    ...(aka.length ? { aka } : {}),
    tiles: ONE_CELL,
    height: BODY,
    kind: null,
    rests: true,
    parts: [{ model: board(file) }],
  };
}

/** Ein Stück in allen Farben — `name(color)` ist der Dateiname. */
function colored(
  id: string,
  label: string,
  name: (color: string) => string,
  colors: readonly string[],
  make: (id: string, label: string, file: string) => GameElement,
): GameElement[] {
  return swapRing(
    colors.map((color) => make(`${id}-${color}`, `${label}, ${COLOR_WORDS[color]}`, name(color))),
  );
}

/** **Ein Würfel** — klein wie jede Figur, und `A` wirft ihn (`opens: 'roll'`). */
function die(id: string, label: string, file: string): GameElement {
  return { ...small(id, label, file, ['Würfel', 'Würfeln']), opens: 'roll' };
}

/** **Eine Spielkarte** — flach auf dem Boden, man läuft darüber wie über einen Teppich. */
function card(id: string, label: string, file: string): GameElement {
  return {
    id,
    label,
    aka: ['Karte', 'Spielkarte'],
    tiles: [1, 1],
    height: BODY,
    kind: null,
    solid: [0, 0],
    floor: true,
    parts: [{ model: board(file), tilt: [-Math.PI / 2, 0, 0], fit: CARD_FIT }],
  };
}

/** Etwas, das auf seinen Kacheln steht und sperrt. */
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
    parts: [{ model: board(file) }],
  };
}

/** Die Würfel: je Form eine Familie in Farben. */
const DICE: readonly GameElement[][] = [
  colored('board-die-d4', 'Würfel W4', (c) => `D4_${c}`, COLORS, die), // 0,48 × 0,40 × 0,42
  colored(
    'board-die-d6a',
    'Würfel W6',
    (c) => (c === 'white' ? 'D6_A' : `D6_A_${c}`),
    ['white', ...COLORS],
    die,
  ), // 0,38 rund
  colored(
    'board-die-d6b',
    'Würfel W6, Punkte',
    (c) => (c === 'white' ? 'D6_B' : `D6_B_${c}`),
    ['white', ...COLORS],
    die,
  ), // 0,38 rund
  colored('board-die-d6c', 'Würfel W6, Zahlen', (c) => `D6_C_${c}`, COLORS, die), // 0,38 rund
  colored('board-die-d8', 'Würfel W8', (c) => `D8_${c}`, COLORS, die), // 0,50 rund
  colored('board-die-d20', 'Würfel W20', (c) => `D20_${c}`, COLORS, die), // 0,42 × 0,48 × 0,44
];

/** Die Schachfiguren: je Figur Weiß und Schwarz. */
const CHESS: readonly GameElement[][] = (
  [
    ['king', 'König'], // 0,38 × 0,90 × 0,38
    ['queen', 'Dame'], // 0,37 × 0,81 × 0,37
    ['bishop', 'Läufer'], // 0,38 × 0,74 × 0,38
    ['knight', 'Springer'], // 0,38 × 0,64 × 0,44
    ['rook', 'Turm'], // 0,37 × 0,52 × 0,37
    ['pawn', 'Bauer'], // 0,30 × 0,50 × 0,30
  ] as const
).map(([piece, label]) =>
  colored(
    `board-chess-${piece}`,
    `Schach: ${label}`,
    (c) => `chess_${c}_${piece}`,
    ['white', 'black'],
    (id, l, f) => small(id, l, f, ['Schach', 'Figur']),
  ),
);

/** Figuren, Steine, Münzen und Plättchen. */
const PIECES: readonly GameElement[][] = [
  colored(
    'board-checker',
    'Damestein',
    (c) => `checker_${c}_single`,
    ['white', 'black'],
    (id, l, f) => small(id, l, f, ['Dame', 'Stein']),
  ), // 0,40 × 0,10 × 0,40
  colored(
    'board-checker-double',
    'Damestein, doppelt',
    (c) => `checker_${c}_double`,
    ['white', 'black'],
    (id, l, f) => small(id, l, f, ['Dame', 'Stein']),
  ), // 0,40 × 0,20 × 0,40
  colored(
    'board-pawn-a',
    'Spielfigur',
    (c) => `pawn_A_${c}`,
    COLORS,
    (id, l, f) => small(id, l, f, ['Figur', 'Pöppel']),
  ), // 0,25 × 0,46 × 0,25
  colored(
    'board-pawn-b',
    'Große Spielfigur',
    (c) => `pawn_B_${c}`,
    COLORS,
    (id, l, f) => small(id, l, f, ['Figur', 'Pöppel']),
  ), // 0,38 × 0,61 × 0,38
  colored(
    'board-meeple',
    'Meeple',
    (c) => `meeple_${c}`,
    COLORS,
    (id, l, f) => small(id, l, f, ['Figur', 'Männchen']),
  ), // 0,50 × 0,62 × 0,20
  colored(
    'board-building',
    'Häuschen',
    (c) => `building_${c}`,
    COLORS,
    (id, l, f) => small(id, l, f, ['Haus']),
  ), // 0,49 × 0,50 × 0,50
  colored(
    'board-flag-a',
    'Fähnchen',
    (c) => `flag_A_${c}`,
    COLORS,
    (id, l, f) => small(id, l, f, ['Fahne']),
  ), // 0,47 × 0,71 × 0,38
  colored(
    'board-flag-b',
    'Wimpel',
    (c) => `flag_B_${c}`,
    COLORS,
    (id, l, f) => small(id, l, f, ['Fahne']),
  ), // 0,51 × 0,71 × 0,38
  colored(
    'board-playerstand',
    'Figurenständer',
    (c) => (c === 'plain' ? 'playerstand' : `playerstand_${c}`),
    ['plain', ...COLORS, 'purple'],
    (id, l, f) => small(id, l, f, ['Ständer']),
  ), // 0,38 × 0,19 × 0,25
  colored(
    'board-token',
    'Spielmarke',
    (c) => `token_${c}`,
    COLORS,
    (id, l, f) => small(id, l, f, ['Marke', 'Chip']),
  ), // 0,54 × 0,05 × 0,54
  colored(
    'board-cube',
    'Spielklötzchen',
    (c) => `cube_${c}`,
    [...COLORS, 'gold', 'silver', 'copper'],
    (id, l, f) => small(id, l, f, ['Klötzchen', 'Würfelchen']),
  ), // 0,25 rund
  colored(
    'board-coin',
    'Münze',
    (c) => `coin_${c}`,
    ['gold', 'silver', 'copper'],
    (id, l, f) => small(id, l, f, ['Geld']),
  ), // 0,52 × 0,10 × 0,52
  ...(['1', '2', '5', '10'] as const).map((value) =>
    colored(
      `board-coin-${value}`,
      `Münze ${value}`,
      (c) => `coin_${value}_${c}`,
      ['gold', 'silver', 'copper'],
      (id, l, f) => small(id, l, f, ['Münze', 'Geld']),
    ),
  ), // 0,52 × 0,10 × 0,52
  ...(['A', 'B'] as const).map((shape) =>
    colored(
      `board-chip-${shape.toLowerCase()}`,
      `Pokerchip ${shape}`,
      (c) => `chip_${shape}_${c}`,
      COLORS,
      (id, l, f) => ({
        ...small(id, l, f, ['Chip', 'Jeton']),
        parts: [{ model: board(f), scale: CHIP_SCALE }],
      }),
    ),
  ), // 1,50 × 0,15 × 1,50 → 0,50
  colored(
    'board-tile',
    'Spielfeld-Plättchen',
    (c) => `tile_${c}`,
    [...COLORS, 'purple'],
    (id, l, f) => small(id, l, f, ['Plättchen', 'Feld']),
  ), // 0,50 × 0,10 × 0,50
  ...(
    [
      ['barbarian', 'Barbar'],
      ['knight', 'Ritter'],
      ['mage', 'Magier'],
      ['rogue', 'Schurke'],
    ] as const
  ).map(([hero, label]) =>
    colored(
      `board-tile-${hero}`,
      `Plättchen ${label}`,
      (c) => `tile_${hero}_${c}`,
      COLORS,
      (id, l, f) => small(id, l, f, ['Plättchen', 'Held']),
    ),
  ),
  swapRing(
    (
      [
        ['brute', 'Rohling'],
        ['mage', 'Magier'],
        ['minion', 'Diener'],
        ['rogue', 'Schurke'],
      ] as const
    ).map(([kind, label]) =>
      small(`board-tile-skeleton-${kind}`, `Plättchen Skelett-${label}`, `tile_skeleton_${kind}`, [
        'Plättchen',
        'Skelett',
      ]),
    ),
  ),
  // Die Dominosteine — 28 Stück, als eine Familie reihum: 0:0 bis 6:6.
  swapRing(
    Array.from({ length: 7 }, (_, a) =>
      Array.from({ length: 7 - a }, (_, i) => [a, a + i] as const),
    )
      .flat()
      .map(([a, b]) => ({
        ...small(`board-domino-${a}-${b}`, `Dominostein ${a}:${b}`, `domino_tile_${a}-${b}`, [
          'Domino',
        ]),
        tiles: [0.5, 1] as const,
      })),
  ), // 0,50 × 0,14 × 1,00
];

/** Die Ränge einer Farbe, wie sie in den Dateinamen stehen. */
const RANKS: readonly (readonly [string, string])[] = [
  ['ace', 'Ass'],
  ['two', 'Zwei'],
  ['three', 'Drei'],
  ['four', 'Vier'],
  ['five', 'Fünf'],
  ['six', 'Sechs'],
  ['seven', 'Sieben'],
  ['eight', 'Acht'],
  ['nine', 'Neun'],
  ['ten', 'Zehn'],
  ['jack', 'Bube'],
  ['queen', 'Dame'],
  ['king', 'König'],
];

/** Die Spielkarten: je Farbe eine Familie von Ass bis König, flach. */
const CARDS: readonly GameElement[][] = [
  ...(
    [
      ['clubs', 'Kreuz'],
      ['spades', 'Pik'],
      ['hearts', 'Herz'],
      ['diamonds', 'Karo'],
    ] as const
  ).map(([suit, label]) =>
    swapRing(
      RANKS.map(([rank, word]) =>
        card(`board-card-${suit}-${rank}`, `${label} ${word}`, `card_${suit}_${rank}`),
      ),
    ),
  ), // 2,16 × 3,00 × 0,02 → flach, 0,65 × 0,90
  swapRing([
    card('board-card-joker-a', 'Joker', 'card_joker_A'),
    card('board-card-joker-b', 'Joker B', 'card_joker_B'),
  ]),
  [card('board-card-back', 'Kartenrücken', 'card_base')],
  // Die Heldenkarten stehen aufrecht in ihrem Ständer.
  ...(
    [
      ['barbarian', 'Barbar'],
      ['knight', 'Ritter'],
      ['mage', 'Magier'],
      ['rogue', 'Schurke'],
    ] as const
  ).map(([hero, label]) =>
    colored(
      `board-playercard-${hero}`,
      `Heldenkarte ${label}`,
      (c) => `playercard_${hero}_${c}`,
      COLORS,
      (id, l, f) => thing(id, l, f, [1, 0.5], ['Karte', 'Held']),
    ),
  ), // 0,60 × 0,75 × 0,05
  swapRing(
    (
      [
        ['brute', 'Rohling'],
        ['mage', 'Magier'],
        ['minion', 'Diener'],
        ['rogue', 'Schurke'],
      ] as const
    ).map(([kind, label]) =>
      thing(
        `board-playercard-skeleton-${kind}`,
        `Heldenkarte Skelett-${label}`,
        `playercard_skeleton_${kind}`,
        [1, 0.5],
        ['Karte', 'Skelett'],
      ),
    ),
  ),
];

/** Das Brett und was zum Spiel gehört. */
const TABLE: readonly GameElement[][] = [
  // Das Brett: fünf mal fünf Kacheln, flach — man stellt die Figuren darauf.
  swapRing([
    {
      ...thing('board-board-a', 'Spielbrett', 'board_A', [5, 5], ['Brett', 'Schach']),
      solid: [0, 0],
      floor: true,
    },
    {
      ...thing('board-board-b', 'Spielbrett B', 'board_B', [5, 5], ['Brett']),
      solid: [0, 0],
      floor: true,
    },
  ]), // 5,00 × 0,15 × 5,00
  [thing('board-container-a', 'Spielschachtel, flach', 'container_A', [1, 1], ['Schachtel'])], // 1,20 × 0,26 × 1,20
  [thing('board-container-a-tall', 'Spielschachtel', 'container_A_tall', [1, 1], ['Schachtel'])], // 1,20 × 0,51 × 1,20
  [thing('board-container-b', 'Große Schachtel, flach', 'container_B', [2, 2], ['Schachtel'])], // 1,70 × 0,26 × 1,70
  [thing('board-container-b-tall', 'Große Schachtel', 'container_B_tall', [2, 2], ['Schachtel'])], // 1,70 × 0,51 × 1,70
  [thing('board-container-c', 'Spielekiste', 'container_C', [2, 2], ['Schachtel', 'Kiste'])], // 2,00 × 0,50 × 2,00
  swapRing([
    thing('board-hourglass', 'Sanduhr', 'hourglass', ONE_CELL, ['Uhr']),
    thing('board-hourglass-empty', 'Sanduhr, abgelaufen', 'hourglass_empty', ONE_CELL, ['Uhr']),
  ]), // 0,50 × 1,25 × 0,50
];

/** **Alle Elemente des Brettspiels** — mit allen Fassungen. */
export const BOARD_GAME_ELEMENTS: readonly GameElement[] = [
  ...DICE,
  ...CHESS,
  ...PIECES,
  ...CARDS,
  ...TABLE,
].flat();

/** **Der Ordner _Brettspiel_** — Würfel, Figuren, Karten, Brett & Zubehör, zuletzt _Alles_. */
export const BOARD_GAME_FOLDER: FurnitureFolder = {
  id: 'board-game',
  label: 'Brettspiel',
  elements: [],
  cover: { element: 'board-die-d6b-white' },
  folders: [
    {
      id: 'board-dice',
      label: 'Würfel',
      elements: catalogueOf(DICE),
      cover: { element: 'board-die-d20-red' },
    },
    {
      id: 'board-pieces',
      label: 'Figuren & Steine',
      elements: [...catalogueOf(CHESS), ...catalogueOf(PIECES)],
      cover: { element: 'board-chess-king-white' },
    },
    {
      id: 'board-cards',
      label: 'Karten',
      elements: catalogueOf(CARDS),
      cover: { element: 'board-card-hearts-ace' },
    },
    {
      id: 'board-table',
      label: 'Brett & Zubehör',
      elements: catalogueOf(TABLE),
      cover: { element: 'board-board-a' },
    },
    {
      id: 'board-all',
      label: 'Alles',
      elements: catalogueOf([...DICE, ...CHESS, ...PIECES, ...CARDS, ...TABLE]),
    },
  ],
};
