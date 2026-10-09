import type { FurnitureFolder, GameElement } from './elementCatalog';
import { COAT_RACK } from './coatRack';

/**
 * **Möbel im Katalog** — _Furniture Bits_ als Spielelemente. Gewünscht
 * (Oktober 2026): _„Und nun furniture als Katalog Ordner aus Modelregal. Wobei
 * bitte gerne darauf achten, dass man auf Teppiche noch etwas stellen kann
 * (also so behandeln wie ein Boden auf Boden). Monitore, desk lampen, kleine
 * Blumen, Cup, Bücher auch auf Boden oder Tische stellen kann. Die Tische bitte
 * behandeln wie Arbeitsplatten"_.
 *
 * **Vier Arten**, je eine Zeile:
 *
 * - `thing` — ein Möbel wie jedes: Grundfläche gesperrt, steht im Weg.
 * - `table` — eine **Ablage** (`GameElement.shelf`) und eine Fläche der Küche
 *   (`kind: 'top'`): Darauf stellt man ab, was ablegbar ist, und legt ab, was
 *   man aus der Küche in der Hand hat — geschnitten wird darauf nicht.
 * - `small` — **ablegbar** (`GameElement.rests`), eine Zelle groß: auf eine
 *   Ablage oder auf den Boden. Der Computer ebenso, aber eine Kachel groß
 *   (`computer`).
 * - `plant` — ablegbar wie `small`, doppelt so groß (`PLANT_SCALE`).
 * - `rug` — ein **Bodenbelag** (`GameElement.floor`): sperrt nichts, darauf
 *   stellt man, was man will.
 *
 * **Der Maßstab des Regals** (0,5) und kein eigener: Das Paket ist im Maß der
 * Restaurant-Möbel gebaut — Schreibtisch, Tisch und Arbeitsplatte sind gleich
 * hoch (0,5 m), und so steht der Monitor auf dem Schreibtisch so hoch wie die
 * Tasse auf der Arbeitsplatte. Hinter jeder Zeile steht, was gemessen wurde:
 * Breite × Höhe × Tiefe in Metern. Die Kacheln sind die Maße, aufgerundet
 * (gut 10 cm Überstand passen noch); was höchstens 0,6 m im Quadrat misst,
 * steht auf einer Zelle.
 *
 * **An der Wand** (Oktober 2026, gewünscht: _„Fueniture Bits gerne dann habe
 * ich mehr Deko Elemente. Auch Genre die die dann an einer Wand sind."_): die
 * Bilderrahmen und Wandbretter (`wall`) rasten an der nächsten Wand ein und
 * sperren keine Zelle (`GameElement.wall`). Die Lampen schaltet `A` an und aus
 * (`opens: 'light'`, `elementActs.ts`).
 */

/** Eine Adresse aus _Furniture Bits_. */
export function furnitureBits(name: string): string {
  return `furniture-bits/${name}.glb`;
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
): GameElement {
  return { id, label, tiles, height: BODY, kind: null, parts: [{ model: furnitureBits(file) }] };
}

/**
 * **Etwas zum Sitzen** — Stuhl, Hocker, Sessel, Sofa: `A` setzt einen darauf
 * (`opens: 'sit'`, `PortalWorld.sitOn`), noch einmal `A` steht wieder auf.
 * Gewünscht (Oktober 2026): _„Jedenfalls sollten wir alle möbel von "sitzen"
 * interagierbar machen, um darauf sitzen zu können."_
 */
function seat(
  id: string,
  label: string,
  file: string,
  tiles: readonly [number, number],
): GameElement {
  return { ...thing(id, label, file, tiles), opens: 'sit' };
}

/**
 * **So viel größer stehen die Stühle** als im Regal — gemeldet: _„Die
 * Burostühle sollten auch gerne ein feld ausfüllen bzw. 2x2 felder groß sein.
 * Aktuell wirkt der stuhl zu klein neben den charakteren. Das gilt für alle
 * Stühle (Sofas sehen passend aus)"_. Doppelt so groß füllen sie eine Kachel
 * (0,75 × 0,85 m beim Stuhl A), und die Sitzfläche liegt auf 0,5 m — so hoch
 * wie die Tische, an die sie gehören.
 */
export const CHAIR_SCALE = 2;

/**
 * **Ein Stuhl** — Sitzen wie auf dem Sofa (`seat`), aber doppelt so groß
 * (`CHAIR_SCALE`) auf einer Kachel, die je Zelle einrastet (`fine`: auch
 * zwischen zwei Kacheln, mittig vor einem Schreibtisch), und in der Hand mit
 * der Lehne zur Figur (`holdFacing`): Wer nach Süden absetzt, stellt ihn nach
 * Norden — mit dem Gesicht zum Tisch, vor dem man steht.
 */
function chair(id: string, label: string, file: string): GameElement {
  return {
    ...seat(id, label, file, [1, 1]),
    fine: true,
    holdFacing: true,
    parts: [{ model: furnitureBits(file), scale: CHAIR_SCALE }],
  };
}

/** Ein Tisch: Ablage für Möbel und Fläche für die Küche. */
function table(
  id: string,
  label: string,
  file: string,
  tiles: readonly [number, number],
): GameElement {
  return {
    id,
    label,
    tiles,
    height: BODY,
    kind: 'top',
    shelf: true,
    parts: [{ model: furnitureBits(file) }],
  };
}

/** Etwas Kleines, das auf eine Ablage passt — oder auf den Boden. */
function small(id: string, label: string, file: string): GameElement {
  return {
    id,
    label,
    tiles: ONE_CELL,
    height: BODY,
    kind: null,
    rests: true,
    parts: [{ model: furnitureBits(file) }],
  };
}

/**
 * **Der Computer** — Monitor, Tastatur, Mauspad und Maus als **ein** Ding auf
 * einer Kachel (2 × 2 Zellen). Gewünscht: _„Bitte Monitor, Maus und Tastatur,
 * Mauspad entfernen aus dem Katalog (als einzelne Gegenstände) und dafür einen
 * Gegenstand 2x2 Computer (modern) anbieten (mit den vier Dingen)"_. Ablegbar
 * wie die Tasse: Auf den Schreibtisch (2 × 1 Kacheln) passen zwei.
 *
 * Wie es auf der Kachel liegt, wenn es nach Süden schaut (vorn ist +z):
 * hinten mittig der Monitor, vorn links die Tastatur, rechts daneben das
 * Mauspad und darauf die Maus.
 */
function computer(): GameElement {
  return {
    id: 'furniture-computer',
    label: 'Computer',
    tiles: [1, 1],
    height: BODY,
    kind: null,
    rests: true,
    parts: [
      { model: furnitureBits('monitor'), at: [0, -0.22] }, // 0,75 × 0,55 × 0,17
      { model: furnitureBits('keyboard'), at: [-0.13, 0.14] }, // 0,38 × 0,08 × 0,22
      { model: furnitureBits('mousepad_A'), at: [0.28, 0.14] }, // 0,40 × 0,01 × 0,30
      { model: furnitureBits('mouse'), at: [0.28, 0.14], on: 2 }, // 0,13 × 0,09 × 0,17
    ],
  };
}

/**
 * **So viel größer stehen die Pflanzen** als im Regal — gewünscht: _„Die
 * pflanzen alle bitte doppelt so groß"_.
 */
export const PLANT_SCALE = 2;

/**
 * **Eine Pflanze** — ablegbar wie die Tasse (auf den Boden oder eine Ablage),
 * doppelt so groß (`PLANT_SCALE`). Aufnehmen wie jedes Möbel: im Modus
 * _Einrichten_ mit dem Kran, beim _Spielen_ nicht — gewünscht: _„nur
 * aufnehmbar während des Modus Einrichtung, nicht spielen"_.
 */
function plant(
  id: string,
  label: string,
  file: string,
  tiles: readonly [number, number],
): GameElement {
  return {
    id,
    label,
    tiles,
    height: BODY,
    kind: null,
    rests: true,
    parts: [{ model: furnitureBits(file), scale: PLANT_SCALE }],
  };
}

/**
 * **Etwas für die Wand** — Bilderrahmen und Wandbretter: Abgesetzt rastet es
 * an der nächsten Wand ein (`GameElement.wall`), wie ein Wandstück aus dem
 * Regal, und sperrt nichts.
 */
function wall(id: string, label: string, file: string, aka: readonly string[] = []): GameElement {
  return {
    id,
    label,
    aka: ['Wand', 'Deko', ...aka],
    tiles: [1, 0.5],
    height: BODY,
    kind: null,
    solid: [0, 0],
    wall: true,
    parts: [{ model: furnitureBits(file) }],
  };
}

/** Eine Lampe: `A` schaltet sie an und aus (`opens: 'light'`). */
function lamp(element: GameElement): GameElement {
  return { ...element, aka: ['Licht', 'Lampe'], opens: 'light' };
}

/** Ein Teppich: flach, sperrt nichts, und darauf steht, was man will. */
function rug(
  id: string,
  label: string,
  file: string,
  tiles: readonly [number, number],
): GameElement {
  return {
    id,
    label,
    tiles,
    height: BODY,
    kind: null,
    solid: [0, 0],
    floor: true,
    parts: [{ model: furnitureBits(file) }],
  };
}

/**
 * **Die Möbel** — im Katalog unter _Möbel_ (`FURNITURE_BITS_FOLDER`), nach Art.
 * Gemessen bei 0,5: Breite × Höhe × Tiefe.
 */
export const FURNITURE_BITS_ELEMENTS: readonly GameElement[] = [
  // Sitzen
  seat('furniture-armchair', 'Sessel', 'armchair', [1, 1]), // 0,90 × 0,61 × 0,80
  seat('furniture-armchair-pillows', 'Sessel mit Kissen', 'armchair_pillows', [1, 1]), // 0,90 × 0,61 × 0,80
  seat('furniture-couch', 'Sofa', 'couch', [2, 1]), // 1,50 × 0,61 × 0,80
  seat('furniture-couch-pillows', 'Sofa mit Kissen', 'couch_pillows', [2, 1]), // 1,50 × 0,61 × 0,80
  chair('furniture-chair-a', 'Stuhl A', 'chair_A'), // 0,74 × 1,26 × 0,84
  chair('furniture-chair-a-wood', 'Holzstuhl A', 'chair_A_wood'), // 0,74 × 1,26 × 0,84
  chair('furniture-chair-b', 'Stuhl B', 'chair_B'), // 0,74 × 1,26 × 0,84
  chair('furniture-chair-b-wood', 'Holzstuhl B', 'chair_B_wood'), // 0,74 × 1,26 × 0,84
  chair('furniture-chair-c', 'Stuhl C', 'chair_C'), // 0,76 × 1,20 × 0,94
  chair('furniture-chair-desk-a', 'Bürostuhl A', 'chair_desk_A'), // 0,70 × 1,30 × 0,92
  chair('furniture-chair-desk-b', 'Bürostuhl B', 'chair_desk_B'), // 1,08 × 1,20 × 0,92
  chair('furniture-chair-stool', 'Hocker', 'chair_stool'), // 0,76 × 0,50 × 0,76
  chair('furniture-chair-stool-wood', 'Holzhocker', 'chair_stool_wood'), // 0,76 × 0,50 × 0,76
  // Tische
  table('furniture-table-small', 'Beistelltisch', 'table_small', [0.5, 0.5]), // 0,50 × 0,50 × 0,50
  table('furniture-table-medium', 'Tisch', 'table_medium', [1, 1]), // 1,00 × 0,50 × 1,00
  table('furniture-table-medium-long', 'Langer Tisch', 'table_medium_long', [2, 1]), // 1,50 × 0,50 × 1,00
  table('furniture-table-low', 'Couchtisch', 'table_low', [2, 1]), // 1,20 × 0,25 × 0,75
  thing('furniture-table-low-decorated', 'Couchtisch, gedeckt', 'table_low_decorated', [2, 1]), // 1,20 × 0,53 × 0,75
  table('furniture-desk', 'Schreibtisch', 'desk', [2, 1]), // 1,50 × 0,50 × 0,75
  table('furniture-desk-large', 'Großer Schreibtisch', 'desk_large', [2, 1]), // 2,00 × 0,50 × 0,75
  thing('furniture-desk-decorated', 'Schreibtisch, eingerichtet', 'desk_decorated', [2, 1]), // 1,50 × 1,09 × 0,77
  thing(
    'furniture-desk-large-decorated',
    'Großer Schreibtisch, eingerichtet',
    'desk_large_decorated',
    [2, 1],
  ), // 2,00 × 1,09 × 0,75
  // Betten
  thing('furniture-bed-single-a', 'Einzelbett A', 'bed_single_A', [1, 2]), // 0,80 × 0,50 × 1,50
  thing('furniture-bed-single-b', 'Einzelbett B', 'bed_single_B', [1, 2]), // 0,80 × 0,50 × 1,50
  thing('furniture-bed-double-a', 'Doppelbett A', 'bed_double_A', [2, 2]), // 1,55 × 0,50 × 1,50
  thing('furniture-bed-double-b', 'Doppelbett B', 'bed_double_B', [2, 2]), // 1,55 × 0,50 × 1,50
  // Schränke
  table('furniture-cabinet-small', 'Kommode, klein', 'cabinet_small', [0.5, 0.5]), // 0,50 × 0,50 × 0,50
  table('furniture-cabinet-medium', 'Kommode', 'cabinet_medium', [1, 1]), // 1,00 × 0,50 × 0,50
  thing(
    'furniture-cabinet-small-decorated',
    'Kommode, klein, eingerichtet',
    'cabinet_small_decorated',
    [0.5, 0.5],
  ), // 0,52 × 0,81 × 0,55
  thing(
    'furniture-cabinet-medium-decorated',
    'Kommode, eingerichtet',
    'cabinet_medium_decorated',
    [1, 1],
  ), // 1,02 × 0,91 × 0,50
  // Lampen
  lamp(thing('furniture-lamp-standing', 'Stehlampe', 'lamp_standing', [0.5, 0.5])), // 0,50 × 1,26 × 0,50
  lamp(small('furniture-lamp-table', 'Tischlampe', 'lamp_table')), // 0,50 × 0,51 × 0,50
  lamp(small('furniture-lamp-desk', 'Schreibtischlampe', 'lamp_desk')), // 0,26 × 0,59 × 0,55
  lamp(
    small(
      'furniture-lamp-desk-headphones',
      'Schreibtischlampe mit Kopfhörern',
      'lamp_desk_headphones',
    ),
  ), // 0,35 × 0,59 × 0,55
  // Schreibtisch & Technik
  computer(), // 1 Kachel: Monitor, Tastatur, Mauspad, Maus
  small('furniture-gameconsole-handheld', 'Spielkonsole', 'gameconsole_handheld'), // 0,53 × 0,09 × 0,22
  small('furniture-cup-pencils', 'Stiftebecher', 'cup_pencils'), // 0,18 × 0,34 × 0,18
  small('furniture-mousepad-b', 'Mauspad', 'mousepad_B'), // 0,40 × 0,01 × 0,30
  {
    ...small('furniture-mousepad-large-a', 'Großes Mauspad', 'mousepad_large_A'),
    tiles: [1, 0.5],
  }, // 0,70 × 0,01 × 0,40
  {
    ...small('furniture-mousepad-large-b', 'Großes Mauspad B', 'mousepad_large_B'),
    tiles: [1, 0.5],
  }, // 0,70 × 0,01 × 0,40
  // An der Wand — Bilderrahmen und Wandbretter (`wall`)
  wall('furniture-pictureframe-large-a', 'Bild, hoch', 'pictureframe_large_A', ['Bild', 'Rahmen']), // 0,51 × 0,60 × 0,10
  wall('furniture-pictureframe-large-b', 'Bild, breit', 'pictureframe_large_B', ['Bild', 'Rahmen']), // 1,00 × 0,60 × 0,10
  wall('furniture-pictureframe-medium', 'Bild', 'pictureframe_medium', ['Bild', 'Rahmen']), // 0,35 × 0,45 × 0,10
  wall('furniture-pictureframe-small-a', 'Kleines Bild', 'pictureframe_small_A', [
    'Bild',
    'Rahmen',
  ]), // 0,25 × 0,30 × 0,10
  wall('furniture-pictureframe-small-b', 'Kleines Bild, quer', 'pictureframe_small_B', [
    'Bild',
    'Rahmen',
  ]), // 0,35 × 0,22 × 0,10
  wall('furniture-pictureframe-small-c', 'Kleines Bild, quadratisch', 'pictureframe_small_C', [
    'Bild',
    'Rahmen',
  ]), // 0,25 × 0,25 × 0,10
  wall('furniture-shelf-a-big', 'Wandbrett, lang', 'shelf_A_big', ['Regal', 'Brett']), // 1,00 × 0,20 × 0,25
  wall('furniture-shelf-a-small', 'Wandbrett', 'shelf_A_small', ['Regal', 'Brett']), // 0,50 × 0,20 × 0,25
  wall('furniture-shelf-b-large', 'Wandregal, lang', 'shelf_B_large', ['Regal']), // 1,00 × 0,20 × 0,25
  wall(
    'furniture-shelf-b-large-decorated',
    'Wandregal, lang, bestückt',
    'shelf_B_large_decorated',
    ['Regal', 'Bücher'],
  ), // 1,00 × 0,41 × 0,25
  wall('furniture-shelf-b-small', 'Wandregal', 'shelf_B_small', ['Regal']), // 0,50 × 0,20 × 0,25
  wall('furniture-shelf-b-small-decorated', 'Wandregal, bestückt', 'shelf_B_small_decorated', [
    'Regal',
    'Bücher',
  ]), // 0,50 × 0,51 × 0,29
  // Kleinkram
  small('furniture-cup', 'Becher', 'cup'), // 0,18 × 0,23 × 0,18
  small('furniture-mug-a', 'Tasse A', 'mug_A'), // 0,24 × 0,12 × 0,18
  small('furniture-mug-b', 'Tasse B', 'mug_B'), // 0,25 × 0,15 × 0,18
  small('furniture-book-single', 'Buch', 'book_single'), // 0,13 × 0,25 × 0,18
  small('furniture-book-set', 'Bücher', 'book_set'), // 0,39 × 0,25 × 0,18
  small('furniture-pictureframe-standing-a', 'Bilderrahmen A', 'pictureframe_standing_A'), // 0,25 × 0,31 × 0,19
  small('furniture-pictureframe-standing-b', 'Bilderrahmen B', 'pictureframe_standing_B'), // 0,35 × 0,23 × 0,18
  small('furniture-pillow-a', 'Kissen A', 'pillow_A'), // 0,33 × 0,10 × 0,25
  small('furniture-pillow-b', 'Kissen B', 'pillow_B'), // 0,33 × 0,10 × 0,25
  // Pflanzen — doppelt so groß wie im Regal (`PLANT_SCALE`)
  plant('furniture-cactus-small-a', 'Kleiner Kaktus', 'cactus_small_A', ONE_CELL), // 0,50 × 0,56 × 0,50
  plant('furniture-cactus-small-b', 'Kleiner Kaktus mit Blüte', 'cactus_small_B', ONE_CELL), // 0,50 × 0,56 × 0,50
  plant('furniture-cactus-a', 'Kaktus', 'cactus_medium_A', [1, 1]), // 0,88 × 0,82 × 0,84
  plant('furniture-cactus-b', 'Kaktus mit Blüte', 'cactus_medium_B', [1, 1]), // 0,88 × 0,82 × 0,84
  // Teppiche
  rug('furniture-rug-rectangle-a', 'Teppich A', 'rug_rectangle_A', [2, 1]), // 1,50 × 0,05 × 1,00
  rug('furniture-rug-rectangle-b', 'Teppich B', 'rug_rectangle_B', [2, 1]), // 1,50 × 0,05 × 1,00
  rug(
    'furniture-rug-rectangle-stripes-a',
    'Teppich gestreift A',
    'rug_rectangle_stripes_A',
    [2, 1],
  ), // 1,50 × 0,05 × 1,00
  rug(
    'furniture-rug-rectangle-stripes-b',
    'Teppich gestreift B',
    'rug_rectangle_stripes_B',
    [2, 1],
  ), // 1,50 × 0,05 × 1,00
  rug('furniture-rug-oval-a', 'Ovaler Teppich A', 'rug_oval_A', [2, 1]), // 1,50 × 0,05 × 1,00
  rug('furniture-rug-oval-b', 'Ovaler Teppich B', 'rug_oval_B', [2, 1]), // 1,50 × 0,05 × 1,00
  // Aus einem Pfosten und den Hüten der Figuren (`coatRack.ts`): `A` öffnet _Aussehen_.
  COAT_RACK,
];

/** Die Ids in der Reihenfolge des Katalogs. */
export const FURNITURE_BITS_CATALOGUE: readonly string[] = FURNITURE_BITS_ELEMENTS.map(
  (one) => one.id,
);

/** Welche Ids in welchem Unterordner stehen. */
const FURNITURE_GROUPS: Readonly<Record<string, readonly string[]>> = {
  seating: [
    'furniture-armchair',
    'furniture-armchair-pillows',
    'furniture-couch',
    'furniture-couch-pillows',
    'furniture-chair-a',
    'furniture-chair-a-wood',
    'furniture-chair-b',
    'furniture-chair-b-wood',
    'furniture-chair-c',
    'furniture-chair-desk-a',
    'furniture-chair-desk-b',
    'furniture-chair-stool',
    'furniture-chair-stool-wood',
  ],
  tables: [
    // Der Arbeitstisch des Restaurants steht auch hier (`elementCatalog`).
    'kitchen-table',
    'furniture-table-small',
    'furniture-table-medium',
    'furniture-table-medium-long',
    'furniture-table-low',
    'furniture-table-low-decorated',
    'furniture-desk',
    'furniture-desk-large',
    'furniture-desk-decorated',
    'furniture-desk-large-decorated',
  ],
  beds: [
    'furniture-bed-single-a',
    'furniture-bed-single-b',
    'furniture-bed-double-a',
    'furniture-bed-double-b',
  ],
  cabinets: [
    'furniture-cabinet-small',
    'furniture-cabinet-medium',
    'furniture-cabinet-small-decorated',
    'furniture-cabinet-medium-decorated',
  ],
  lamps: [
    'furniture-lamp-standing',
    'furniture-lamp-table',
    'furniture-lamp-desk',
    'furniture-lamp-desk-headphones',
  ],
  desk: [
    'furniture-computer',
    'furniture-gameconsole-handheld',
    'furniture-cup-pencils',
    'furniture-mousepad-b',
    'furniture-mousepad-large-a',
    'furniture-mousepad-large-b',
  ],
  wall: [
    'furniture-pictureframe-large-a',
    'furniture-pictureframe-large-b',
    'furniture-pictureframe-medium',
    'furniture-pictureframe-small-a',
    'furniture-pictureframe-small-b',
    'furniture-pictureframe-small-c',
    'furniture-shelf-a-big',
    'furniture-shelf-a-small',
    'furniture-shelf-b-large',
    'furniture-shelf-b-large-decorated',
    'furniture-shelf-b-small',
    'furniture-shelf-b-small-decorated',
  ],
  small: [
    'furniture-cup',
    'furniture-mug-a',
    'furniture-mug-b',
    'furniture-book-single',
    'furniture-book-set',
    'furniture-pictureframe-standing-a',
    'furniture-pictureframe-standing-b',
    'furniture-pillow-a',
    'furniture-pillow-b',
  ],
  plants: [
    'furniture-cactus-small-a',
    'furniture-cactus-small-b',
    'furniture-cactus-a',
    'furniture-cactus-b',
  ],
  rugs: [
    'furniture-rug-rectangle-a',
    'furniture-rug-rectangle-b',
    'furniture-rug-rectangle-stripes-a',
    'furniture-rug-rectangle-stripes-b',
    'furniture-rug-oval-a',
    'furniture-rug-oval-b',
  ],
};

/**
 * **Der Ordner _Möbel_** — neben _Haus_, _Restaurant_, _Natur_ und
 * _Weltraum_, darin nach Art und zuletzt _Alles_.
 */
export const FURNITURE_BITS_FOLDER: FurnitureFolder = {
  id: 'furniture',
  label: 'Möbel',
  // Die Garderobe steht direkt in _Möbel_, vor den Ordnern, und nicht unter
  // _Schränke_ — gewünscht: _„die garderobe raus aus schränke aber in
  // ‚Möbel'"_.
  elements: ['coat-rack'],
  cover: { element: 'furniture-couch-pillows' },
  folders: [
    {
      id: 'furniture-seating',
      label: 'Sitzen',
      elements: FURNITURE_GROUPS['seating']!,
      cover: { element: 'furniture-armchair' },
    },
    {
      id: 'furniture-tables',
      label: 'Tische',
      elements: FURNITURE_GROUPS['tables']!,
      cover: { element: 'furniture-desk' },
    },
    {
      id: 'furniture-beds',
      label: 'Betten',
      elements: FURNITURE_GROUPS['beds']!,
      cover: { element: 'furniture-bed-double-a' },
    },
    {
      id: 'furniture-cabinets',
      label: 'Schränke',
      elements: FURNITURE_GROUPS['cabinets']!,
      cover: { element: 'furniture-cabinet-medium-decorated' },
    },
    {
      id: 'furniture-lamps',
      label: 'Lampen',
      elements: FURNITURE_GROUPS['lamps']!,
      cover: { element: 'furniture-lamp-standing' },
    },
    {
      id: 'furniture-desk',
      label: 'Schreibtisch & Technik',
      elements: FURNITURE_GROUPS['desk']!,
      cover: { element: 'furniture-computer' },
    },
    {
      id: 'furniture-wall',
      label: 'An der Wand',
      elements: FURNITURE_GROUPS['wall']!,
      cover: { element: 'furniture-shelf-b-large-decorated' },
    },
    {
      id: 'furniture-small',
      label: 'Kleinkram',
      elements: FURNITURE_GROUPS['small']!,
      cover: { element: 'furniture-book-set' },
    },
    {
      id: 'furniture-plants',
      label: 'Pflanzen',
      elements: FURNITURE_GROUPS['plants']!,
      cover: { element: 'furniture-cactus-a' },
    },
    {
      id: 'furniture-rugs',
      label: 'Teppiche',
      elements: FURNITURE_GROUPS['rugs']!,
      cover: { element: 'furniture-rug-rectangle-stripes-a' },
    },
    { id: 'furniture-all', label: 'Alles', elements: FURNITURE_BITS_CATALOGUE },
  ],
};
