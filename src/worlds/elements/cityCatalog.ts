import type { ElementPart, FurnitureFolder, GameElement } from './elementCatalog';

/**
 * **Die Stadt im Katalog** — Straßen, Plätze und Häuser aus _City Builder
 * Bits_ als Spielelemente. Gewünscht (Oktober 2026): _„Ich will nun die großen
 * Straßen-Elemente als Katalog-Ordner bekommen ‚Stadt', die aber eben einen
 * Boden mit Möbeln darstellen (ein Preset also). Die Straßenteile müssen wir
 * noch weiter verbessern durch Laternen und Ampeln […]. Ich wünsche mir damit
 * dann schneller eine Stadt aufbauen zu können. Nimm gerne die Häuser mit auf
 * als Elemente im Katalog, die auch entsprechend ihre Fläche benötigen."_
 *
 * **Der Maßstab: 4 m je Einheit der Quelle** (`CITY_SCALE` auf das Regal). Das
 * Paket ist eine Modellstadt: Eine Straßenkachel ist in der Quelle zwei
 * Einheiten breit, mit dem Maßstab des Regals (0,5) also ein Meter, ein Auto
 * 47 cm und eine Laterne 48 cm. Bei 4 m je Einheit ist die Straße **8 × 8 m**
 * (zwei Fahrspuren), ein Auto 3,8 m lang, eine Laterne 3,8 m hoch und ein
 * Haus 6,6 bis 12 m. Ein Maßstab für alles, damit Straßen, Häuser und
 * Straßenmöbel zusammenpassen, wie das Paket sie gebaut hat.
 *
 * **Alles Große liegt auf 8 × 8 Kacheln** — Straßen, Gehweg, Park und Häuser —,
 * damit eine Stadt ein Raster aus gleichen Blöcken ist: Straße neben Haus
 * neben Kreuzung, und nichts muss passend gerückt werden.
 *
 * **Straßen und Plätze sind Boden mit Möbeln** (`floor`): Sie sperren nichts,
 * man geht und stellt darauf, und Laternen und Ampeln stehen als Teile
 * darauf — ein Preset statt zwanzig Einzelteile. Die Platte der Quelle ist
 * 40 cm dick (0,05 Einheiten); sie wird deshalb **eingelassen** (`flush`), so
 * dass nur ihre Oberkante über dem Boden der Welt liegt — sonst stünde man
 * bis zu den Knöcheln in der Fahrbahn.
 *
 * **Häuser** sind die Häuser des Pakets **ohne** ihren Sockel, gestellt auf
 * eine eingelassene Gehwegplatte: dieselbe Rechnung wie bei der Straße. Gesperrt
 * ist nur das Haus selbst (`solid`, nachgemessen), um es herum geht man auf
 * dem Gehweg.
 */

/** **Faktor auf den Maßstab des Regals** (0,5): 4 m je Einheit der Quelle. */
export const CITY_SCALE = 8;

/** **Die Kante eines großen Stücks** in Metern — Straße, Platz, Haus. */
export const CITY_BLOCK = 8;

/** Eine Adresse aus _City Builder Bits_. */
export function cityBits(name: string): string {
  return `city-builder-bits/${name}.glb`;
}

/** So hoch ist der Körper — wie bei jedem Möbel: Darüber springt niemand. */
const BODY = 1.4;

/** Was nichts sperrt — Straße, Platz: Man geht darüber. */
const NOTHING: readonly [number, number] = [0, 0];

/**
 * **Wie weit die Oberkante einer Platte über dem Boden liegt**, in Metern.
 * Die Fahrbahn liegt in der Quelle 1 cm unter dem Bordstein (bei 4 m je
 * Einheit 8 cm). Sie muss **deutlich** über den Platten der Welt liegen: Die
 * schieben ihren Tiefenwert nach vorn (`plateFloor`, `polygonOffset`) und
 * gewinnen sonst jedes Pixel — eine Fahrbahn 1 cm darüber war unsichtbar, nur
 * der Bordstein schaute heraus. Mit 16 cm liegt sie 8 cm darüber.
 */
const SLAB_TOP = 0.16;
/** Die Gehweg- und Parkplatten — eben, ihre Oberkante 10 cm über dem Boden. */
const WALK_TOP = 0.1;

/**
 * **Eine Platte, eingelassen** — die Oberkante `top` über dem Boden der Welt
 * (`ElementPart.flush` rechnet von der Oberkante dessen, worauf es liegt,
 * hier vom Boden, also mit umgekehrtem Vorzeichen).
 */
function slab(name: string, top = SLAB_TOP, yaw?: number): ElementPart {
  return { model: cityBits(name), scale: CITY_SCALE, flush: -top, ...(yaw ? { yaw } : {}) };
}

/**
 * **Etwas, das auf der Platte steht** — an seinem Ursprung (`rooted`: dort
 * steht der Mast), auf der Oberkante der Platte (`on: 0`), um `yaw` gedreht.
 * Laterne und Ampel haben ihren Arm in der Quelle nach Westen (−x).
 */
function onSlab(name: string, at: readonly [number, number], yaw = 0): ElementPart {
  return { model: cityBits(name), scale: CITY_SCALE, rooted: true, on: 0, at, yaw };
}

/** Wo eine Laterne am Bordstein steht: so weit von der Mitte, in Metern. */
const CURB = 3.7;

/** Die Drehungen — der Arm der Quelle zeigt nach Westen (−x). */
const ARM_WEST = 0;
const ARM_EAST = Math.PI;
const ARM_NORTH = -Math.PI / 2;
const ARM_SOUTH = Math.PI / 2;

/** **Eine Straße**: die Platte und was darauf steht, auf 8 × 8 Kacheln, ohne Sperre. */
function road(
  id: string,
  label: string,
  aka: readonly string[],
  parts: readonly ElementPart[],
): GameElement {
  return {
    id,
    label,
    aka,
    tiles: [CITY_BLOCK, CITY_BLOCK],
    height: BODY,
    kind: null,
    solid: NOTHING,
    floor: true,
    parts,
  };
}

/**
 * **Ein Haus** — eingelassene Gehwegplatte, darauf das Haus ohne Sockel, und
 * gesperrt seine Grundfläche (Breite × Tiefe in Metern, nachgemessen an der
 * Datei ohne Sockel, mal 4).
 */
function house(
  id: string,
  label: string,
  letter: string,
  solid: readonly [number, number],
): GameElement {
  return {
    id,
    label,
    aka: ['Haus', 'Gebäude', 'Building', 'Stadt'],
    tiles: [CITY_BLOCK, CITY_BLOCK],
    height: BODY,
    kind: null,
    solid,
    parts: [
      slab('base', WALK_TOP),
      { model: cityBits(`building_${letter}_withoutBase`), scale: CITY_SCALE, on: 0 },
    ],
  };
}

/** **Ein Straßenmöbel für sich** — sperrt seine Kachel(n), im Maßstab der Stadt. */
function prop(
  id: string,
  label: string,
  file: string,
  tiles: readonly [number, number],
  extra: Partial<GameElement> = {},
): GameElement {
  return {
    id,
    label,
    tiles,
    height: BODY,
    kind: null,
    parts: [{ model: cityBits(file), scale: CITY_SCALE }],
    ...extra,
  };
}

/** Ein Mast — Laterne oder Ampel: gesperrt nur der Fuß, eine Zelle. */
const POLE: readonly [number, number] = [0.5, 0.5];

/**
 * **Die Elemente der Stadt** — im Katalog unter _Stadt_ (`CITY_FOLDER`), nach
 * Art: Straßen, Plätze, Häuser, Straßenmöbel, Autos, Grün. Gemessen bei 4 m je
 * Einheit: Breite × Höhe × Tiefe.
 *
 * **Die Straßen als Vorschlag**, je mit dem, was an so einer Stelle steht:
 * die Gerade mit zwei Laternen versetzt an beiden Bordsteinen, der
 * Zebrastreifen mit einer Ampel je Seite, die Ecke und die Kurve mit einer
 * Laterne außen, die Einmündung mit einer Ampel gegenüber, die Kreuzung mit
 * zwei Ampelbrücken über Eck. Dazu je eine Gerade ohne alles, für lange
 * Strecken, und die Allee aus dem Park.
 */
export const CITY_ELEMENTS: readonly GameElement[] = [
  // Straßen — 8 × 8 m, die Gerade läuft von Nord nach Süd (z).
  road(
    'city-road',
    'Straße mit Laternen',
    ['Straße', 'Gerade', 'Laterne', 'Road'],
    [
      slab('road_straight'),
      onSlab('streetlight', [CURB, -2], ARM_WEST),
      onSlab('streetlight', [-CURB, 2], ARM_EAST),
    ],
  ),
  road('city-road-plain', 'Straße', ['Straße', 'Gerade', 'Road'], [slab('road_straight')]),
  road(
    'city-road-crossing',
    'Zebrastreifen mit Ampeln',
    ['Straße', 'Fußgängerüberweg', 'Ampel', 'Zebrastreifen'],
    [
      slab('road_straight_crossing'),
      onSlab('trafficlight_B', [CURB, 2.6], ARM_WEST),
      onSlab('trafficlight_B', [-CURB, -2.6], ARM_EAST),
    ],
  ),
  road(
    'city-road-corner',
    'Straßenecke mit Laterne',
    ['Straße', 'Ecke', 'Laterne'],
    [slab('road_corner'), onSlab('streetlight', [CURB, CURB], ARM_NORTH)],
  ),
  road(
    'city-road-curve',
    'Kurve mit Laterne',
    ['Straße', 'Kurve', 'Laterne'],
    [slab('road_corner_curved'), onSlab('streetlight', [CURB, CURB], ARM_NORTH)],
  ),
  road(
    'city-road-tsplit',
    'Einmündung mit Ampel',
    ['Straße', 'T-Kreuzung', 'Einmündung', 'Ampel'],
    [slab('road_tsplit'), onSlab('trafficlight_B', [CURB, CURB], ARM_NORTH)],
  ),
  road(
    'city-road-junction',
    'Kreuzung mit Ampeln',
    ['Straße', 'Kreuzung', 'Ampel'],
    [
      slab('road_junction'),
      onSlab('trafficlight_C', [CURB, CURB], ARM_NORTH),
      onSlab('trafficlight_C', [-CURB, -CURB], ARM_SOUTH),
    ],
  ),
  road(
    'city-road-avenue',
    'Allee',
    ['Straße', 'Bäume', 'Allee'],
    [
      slab('road_straight'),
      onSlab('tree_A', [CURB, -2]),
      onSlab('tree_B', [-CURB, 2]),
      onSlab('tree_C', [CURB, 2.5], Math.PI / 2),
      onSlab('tree_A', [-CURB, -2.5], Math.PI),
    ],
  ),
  // Plätze — Gehweg und Park, 8 × 8 m. Die verzierten Parkplatten der Quelle
  // gehen nicht: Eingelassen wird um ihre ganze Höhe, und mit den Bäumen darin
  // versänken sie samt Wiese im Boden. Also die flache Platte und das Grün
  // als eigene Teile darauf.
  road('city-plaza', 'Gehweg', ['Platz', 'Bürgersteig', 'Pflaster'], [slab('base', WALK_TOP)]),
  road('city-park', 'Park', ['Park', 'Wiese', 'Rasen'], [slab('park_base', WALK_TOP)]),
  road(
    'city-park-trees',
    'Park mit Bäumen',
    ['Park', 'Bäume'],
    [
      slab('park_base', WALK_TOP),
      onSlab('tree_A', [-2, -2]),
      onSlab('tree_D', [2, -1.5], Math.PI / 2),
      onSlab('tree_E', [-1.5, 2.2], Math.PI),
      onSlab('bench', [2, 2.5], Math.PI),
    ],
  ),
  road(
    'city-park-bushes',
    'Park mit Büschen',
    ['Park', 'Büsche'],
    [
      slab('park_base', WALK_TOP),
      onSlab('bush_A', [-2.5, -2.5]),
      onSlab('bush_B', [2.2, -2]),
      onSlab('bush_C', [-2, 2.5]),
      onSlab('bush_A', [2.5, 2.5], Math.PI / 2),
    ],
  ),
  road(
    'city-park-path',
    'Parkweg',
    ['Park', 'Weg'],
    [
      slab('park_road_straight', WALK_TOP),
      onSlab('bench', [2.6, 0], -Math.PI / 2),
      onSlab('streetlight_old_single', [2.6, -2.5]),
      onSlab('bush_C', [-2.8, -2]),
      onSlab('bush_B', [-2.8, 2.2]),
    ],
  ),
  // Häuser — 8 × 8 m mit Gehweg, gesperrt das Haus. Höhe in Klammern.
  house('city-house-a', 'Kleines Stadthaus', 'A', [4.8, 5.8]), // 6,6 m
  house('city-house-b', 'Breites Stadthaus', 'B', [6.4, 5.2]), // 6,6 m
  house('city-house-c', 'Hohes Stadthaus', 'C', [4.8, 5.2]), // 11,9 m
  house('city-house-d', 'Hohes breites Stadthaus', 'D', [6.4, 5.2]), // 11,9 m
  house('city-house-e', 'Eckhaus', 'E', [8, 5.8]), // 9,4 m
  house('city-house-f', 'Reihenhaus', 'F', [8, 5.2]), // 9,4 m
  house('city-house-g', 'Hohes Eckhaus', 'G', [8, 5.8]), // 11,9 m
  house('city-house-h', 'Wohnblock', 'H', [8, 5.2]), // 12,2 m
  // Straßenmöbel — der Mast sperrt eine Zelle.
  prop('city-streetlight', 'Laterne', 'streetlight', [1, 1], { solid: POLE }), // 3,8 m hoch
  prop('city-streetlight-old', 'Alte Laterne', 'streetlight_old_single', [1, 1], { solid: POLE }),
  prop('city-streetlight-double', 'Doppellaterne', 'streetlight_old_double', [1, 1], {
    solid: POLE,
  }),
  prop('city-trafficlight', 'Ampel', 'trafficlight_A', [1, 1], { solid: POLE }), // 2,9 m
  prop('city-trafficlight-arm', 'Ampel mit Arm', 'trafficlight_B', [1, 1], { solid: POLE }),
  prop('city-trafficlight-bridge', 'Ampelbrücke', 'trafficlight_C', [3, 1], { solid: POLE }),
  prop('city-bench', 'Parkbank', 'bench', [2, 1]), // 1,6 × 0,4 × 0,6
  prop('city-hydrant', 'Hydrant', 'firehydrant', [1, 1]),
  prop('city-dumpster', 'Müllcontainer', 'dumpster', [2, 2]), // 2,3 × 1,3 × 1,4
  prop('city-trash', 'Müll', 'trash_A', [1, 1], { solid: NOTHING }),
  prop('city-box', 'Karton', 'box_A', [1, 1]),
  prop('city-watertower', 'Wasserturm', 'watertower', [2, 2]), // 2,0 × 2,7 × 2,0
  // Autos — 1,7 × 3,8 m, zwei mal vier Kacheln.
  prop('city-car-sedan', 'Limousine', 'car_sedan', [2, 4]),
  prop('city-car-hatchback', 'Kleinwagen', 'car_hatchback', [2, 4]),
  prop('city-car-stationwagon', 'Kombi', 'car_stationwagon', [2, 4]),
  prop('city-car-taxi', 'Taxi', 'car_taxi', [2, 4]),
  prop('city-car-police', 'Polizeiauto', 'car_police', [2, 4]),
  // Grün — die Bäume der Stadt sind in ihrem Maßstab richtige Bäume (4 m Krone).
  prop('city-tree-a', 'Stadtbaum', 'tree_A', [4, 4], { solid: [0.5, 0.5] }),
  prop('city-tree-b', 'Stadtbaum, schmal', 'tree_B', [4, 4], { solid: [0.5, 0.5] }),
  prop('city-tree-c', 'Stadtbaum, breit', 'tree_C', [4, 4], { solid: [0.5, 0.5] }),
  prop('city-bush', 'Hecke', 'bush_A', [2, 2]),
];

/** Die Ids in der Reihenfolge des Katalogs. */
export const CITY_CATALOGUE: readonly string[] = CITY_ELEMENTS.map((one) => one.id);

/** Die Ids, deren Name so anfängt. */
function ofKind(...prefixes: string[]): string[] {
  return CITY_CATALOGUE.filter((id) => prefixes.some((prefix) => id.startsWith(prefix)));
}

/**
 * **Der Ordner _Stadt_** — Straßen, Plätze, Häuser, Straßenmöbel, Autos und
 * Grün, zuletzt _Alles_.
 */
export const CITY_FOLDER: FurnitureFolder = {
  id: 'city',
  label: 'Stadt',
  elements: [],
  cover: { element: 'city-house-c' },
  folders: [
    {
      id: 'city-roads',
      label: 'Straßen',
      elements: ofKind('city-road'),
      cover: { element: 'city-road-junction' },
    },
    {
      id: 'city-plazas',
      label: 'Plätze & Parks',
      elements: ofKind('city-plaza', 'city-park'),
      cover: { element: 'city-park-trees' },
    },
    {
      id: 'city-houses',
      label: 'Häuser',
      elements: ofKind('city-house'),
      cover: { element: 'city-house-c' },
    },
    {
      id: 'city-street',
      label: 'Straßenmöbel',
      elements: ofKind(
        'city-streetlight',
        'city-trafficlight',
        'city-bench',
        'city-hydrant',
        'city-dumpster',
        'city-trash',
        'city-box',
        'city-watertower',
      ),
      cover: { element: 'city-trafficlight-arm' },
    },
    {
      id: 'city-cars',
      label: 'Autos',
      elements: ofKind('city-car'),
      cover: { element: 'city-car-taxi' },
    },
    { id: 'city-green', label: 'Grün', elements: ofKind('city-tree', 'city-bush') },
    { id: 'city-all', label: 'Alles', elements: CITY_CATALOGUE },
  ],
};
