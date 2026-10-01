import type { FurnitureFolder, GameElement } from './elementCatalog';

/**
 * **Natur im Katalog** — Bäume, Sträucher, Steine, Gras und Holz, als
 * Spielelemente aus dem Regal. Gewünscht (Oktober 2026): _„beim Katalog möchte
 * ich nun gerne Natur als weiteren Punkt haben. Schau aus dem Modellregal was
 * alles Natur sein kann und füge es hinzu. Bei Bäumen z.B. sollten wir nur den
 * Stamm als nicht betretbar machen."_
 *
 * **Unter der Krone geht man durch.** Die breiten Laubbäume (Laubbaum, Großer
 * Laubbaum, Schirmbaum) belegen so viele Kacheln, wie ihre Krone breit ist
 * (`tiles`: dort fasst man sie an, dort rasten sie ein), aber gesperrt ist nur
 * der Stamm (`GameElement.solid`, 2 × 2 Zellen um die Mitte). **Alle anderen
 * Bäume stehen auf einer einzigen Zelle** (`sapling`), mittig darauf, und
 * rasten je Zelle ein. Sträucher, Steine und Holz sperren ihre Kachel wie ein
 * Möbel; Gras, Blumen und Pilze sperren nichts.
 *
 * **Eine Farbe** aus _Forest Nature_ (`color1`): Das Paket hat jedes Modell
 * achtmal, nur in anderer Palette, und achtmal derselbe Baum ist kein Katalog.
 * Aus den Größenstufen (`_A`, `_B`, `_C` …) steht je Art die, die neben einer
 * Figur von 1,80 m nach Baum aussieht.
 */

/** Eine Adresse aus _Forest Nature_, in der ersten Farbe. */
function forest(name: string): string {
  return `forest-nature/color1/${name}_Color1.glb`;
}

/** So hoch ist der Körper — wie bei jedem Möbel: Darüber springt niemand. */
const BODY = 1.4;

/** **Was unter einem Baum sperrt** — der Stamm, 2 × 2 Zellen um die Mitte. */
const TRUNK: readonly [number, number] = [0.5, 0.5];

/** **Was nichts sperrt** — Gras, Blumen, Pilze: man läuft hindurch. */
const NOTHING: readonly [number, number] = [0, 0];

/**
 * **Ein Baum**: Krone über `size` × `size` Kacheln, gesperrt nur der Stamm,
 * und am Ursprung der Datei hingestellt (`rooted`) — dort sitzt der Stamm.
 */
function tree(id: string, label: string, model: string, size = 2): GameElement {
  return {
    id,
    label,
    tiles: [size, size],
    height: BODY,
    kind: null,
    solid: TRUNK,
    parts: [{ model, rooted: true }],
  };
}

/** Eine Zelle, eine halbe Kachel im Quadrat. */
const ONE_CELL: readonly [number, number] = [0.5, 0.5];

/**
 * **Ein schmaler Baum auf einer Zelle** — Grundfläche, Sperre und Einrasten
 * sind die eine Zelle unter dem Stamm (`elementPlace.onCells`). Gewünscht:
 * _„Außer: Laubbaum, großer Laub Baum, und Schirm Baum, sollen alle Bäume nur
 * 1 Kachel Grundfläche belegen, und daher stehen die nicht mittig auf einer
 * 2x2 Kachel sondern nur mittig auf einer Kachel."_
 */
function sapling(id: string, label: string, model: string): GameElement {
  return {
    id,
    label,
    tiles: ONE_CELL,
    height: BODY,
    kind: null,
    parts: [{ model, rooted: true }],
  };
}

/** Etwas, das seine Kacheln sperrt wie ein Möbel — Strauch, Stein, Holz. */
function block(id: string, label: string, model: string, size = 1, rooted = false): GameElement {
  return {
    id,
    label,
    tiles: [size, size],
    height: BODY,
    kind: null,
    parts: [rooted ? { model, rooted } : { model }],
  };
}

/** Etwas, durch das man läuft — Gras, Blumen, Pilze. */
function ground(id: string, label: string, model: string): GameElement {
  return { id, label, tiles: [1, 1], height: BODY, kind: null, solid: NOTHING, parts: [{ model }] };
}

/**
 * **Die Elemente der Natur** — im Katalog unter _Natur_ (`NATURE_FOLDER`),
 * sortiert nach dem Anfang der Id: `tree-`, `bush-`, `rock-`, `plant-`,
 * `wood-`.
 *
 * Die Kacheln der breiten Laubbäume sind ihre Krone, aufgerundet auf
 * mindestens zwei: Auf einer einzigen Kachel wäre der Stamm (2 × 2 Zellen)
 * schon die ganze Kachel. Die übrigen Bäume stehen auf einer Zelle
 * (`sapling`). Die Herbstbäume sind
 * aus _Halloween Bits_ (zweimal dieselbe Form, orange und gelb), der tote Baum
 * auch. Die kleinen Bäume aus _City Builder_ und _Medieval Hexagon_ fehlen mit
 * Absicht: Sie sind Modellbahn-Bäume von einem halben Meter.
 */
export const NATURE_ELEMENTS: readonly GameElement[] = [
  // Bäume — gemessen bei 0,5: Krone breit × hoch, Stamm Ø.
  tree('tree-leafy', 'Laubbaum', forest('Tree_1_B')), // 2,0 × 2,5, Stamm 0,36
  tree('tree-leafy-large', 'Großer Laubbaum', forest('Tree_1_C'), 3), // 3,4 × 3,9, Stamm 0,49
  sapling('tree-cube', 'Baum mit Würfelkrone', forest('Tree_2_B')), // 1,9 × 3,0
  sapling('tree-cube-large', 'Großer Baum mit Würfelkrone', forest('Tree_2_E')), // 3,0 × 4,4
  sapling('tree-slim', 'Schmaler Laubbaum', forest('Tree_6_B')), // 1,4 × 2,8
  tree('tree-umbrella', 'Schirmbaum', forest('Tree_3_B')), // 2,1 × 2,2, Stamm 0,39
  sapling('tree-pine', 'Pinie', forest('Tree_7_B')), // 1,8 × 3,5
  sapling('tree-fir', 'Tanne', forest('Tree_4_B')), // 1,3 × 3,5
  sapling('tree-fir-tall', 'Hohe Tanne', forest('Tree_4_C')), // 1,9 × 5,4
  sapling('tree-spruce', 'Fichte', forest('Tree_5_B')), // 1,5 × 2,9, Zweige bis zum Boden
  sapling('tree-spruce-tall', 'Hohe Fichte', forest('Tree_5_E')), // 1,5 × 4,1, Stamm frei
  sapling('tree-autumn-orange', 'Herbstbaum, orange', 'halloween-bits/tree_pine_orange_medium.glb'),
  sapling('tree-autumn-yellow', 'Herbstbaum, gelb', 'halloween-bits/tree_pine_yellow_medium.glb'),
  sapling('tree-bare', 'Kahler Baum', forest('Tree_Bare_2_B')), // 0,9 × 2,8
  sapling('tree-dead', 'Toter Baum', 'halloween-bits/tree_dead_large.glb'), // 1,2 × 2,5
  // Sträucher — eine Kachel, ganz gesperrt: Durch einen Busch läuft man nicht.
  block('bush-round', 'Runder Busch', forest('Bush_1_C')),
  block('bush-group', 'Buschgruppe', forest('Bush_1_E')),
  block('bush-cube', 'Eckige Büsche', forest('Bush_2_D')),
  block('bush-flat', 'Flacher Busch', forest('Bush_3_B')),
  block('bush-cone', 'Kegelbusch', forest('Bush_4_C')),
  // Steine — die großen auf 2 × 2 Kacheln. Die runden stecken tief im Boden
  // (bis 0,5 m) und stehen deshalb an ihrem Ursprung.
  block('rock-stone', 'Stein', forest('Rock_3_A'), 1, true),
  block('rock-boulders', 'Findlinge', forest('Rock_6_E')),
  block('rock-pile', 'Steinhaufen', forest('Rock_5_E')),
  block('rock-spires', 'Felsnadeln', forest('Rock_4_E')),
  block('rock-boulder', 'Felsbrocken', forest('Rock_3_K'), 2, true),
  block('rock-block', 'Felsklotz', forest('Rock_2_E'), 2),
  block('rock-crag', 'Felsformation', forest('Rock_1_J'), 2),
  // Gras & Blumen — man läuft hindurch.
  ground('plant-grass', 'Grasbüschel', forest('Grass_2_B')),
  ground('plant-leaves', 'Blattbüschel', forest('Grass_1_A')),
  ground('plant-flax', 'Flachsblume', 'mixed-bag/flax_flower_A.glb'),
  ground('plant-mushroom', 'Fliegenpilz', 'mystery-monthly-5/5-november-2024-witch/Mushroom.glb'),
  // Holz.
  block('wood-log', 'Baumstamm', 'resource-bits/Wood_Log_A.glb'),
  block('wood-block', 'Holzklotz', 'mystery-monthly-4/4-october-2023-werewolf/log_A.glb'),
  block('wood-stack', 'Holzstapel', 'resource-bits/Wood_Log_Stack.glb'),
  block(
    'wood-stacks',
    'Rundholzstapel',
    'mystery-monthly-4/4-october-2023-werewolf/log_stacks.glb',
  ),
];

/** Die Ids in der Reihenfolge des Katalogs. */
export const NATURE_CATALOGUE: readonly string[] = NATURE_ELEMENTS.map((one) => one.id);

/** Die Ids einer Art. */
function ofKind(prefix: string): string[] {
  return NATURE_CATALOGUE.filter((id) => id.startsWith(prefix));
}

/**
 * **Der Ordner _Natur_** — neben _Haus_ und _Restaurant_, und darin nach Art
 * wie die Küche: Bäume, Sträucher, Steine, Gras & Blumen, Holz, und zuletzt
 * _Alles_.
 */
export const NATURE_FOLDER: FurnitureFolder = {
  id: 'nature',
  label: 'Natur',
  elements: [],
  cover: { element: 'tree-leafy' },
  folders: [
    { id: 'trees', label: 'Bäume', elements: ofKind('tree-'), cover: { element: 'tree-leafy' } },
    { id: 'bushes', label: 'Sträucher', elements: ofKind('bush-') },
    { id: 'rocks', label: 'Steine', elements: ofKind('rock-'), cover: { element: 'rock-crag' } },
    { id: 'plants', label: 'Gras & Blumen', elements: ofKind('plant-') },
    { id: 'wood', label: 'Holz', elements: ofKind('wood-'), cover: { element: 'wood-stack' } },
    { id: 'nature-all', label: 'Alles', elements: NATURE_CATALOGUE },
  ],
};
