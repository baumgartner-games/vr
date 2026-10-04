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
 * 47 cm und eine Laterne 48 cm. Bei 4 m je Einheit ist ein Auto 3,8 m lang,
 * eine Laterne 3,8 m hoch und ein Haus 6,6 bis 12 m.
 *
 * **Der Gehweg gehört zur Straße.** Gewünscht, als die Häuser noch auf eigenem
 * Gehweg standen: _„den Gehweg will ich bei den Straßen bereits inkludiert
 * haben, sodass ich die Häuser nur noch in die freien Plätze stellen muss"_.
 * Ein Straßenstück ist **8 × 8 m**: 6 m Fahrbahn mit zwei Spuren
 * (`ROADWAY`), links und rechts je 1 m Gehweg (`WALK`). Die Platten der Quelle
 * werden dafür auf genaue Maße gebracht (`ElementPart.size`, `pose`): die
 * Fahrbahn auf 6 m Breite, der Gehweg als Streifen aus der Gehwegplatte. An
 * Kreuzung, Einmündung und Ecke sitzt die Fahrbahn der Quelle auf 6 × 6 m in
 * der Mitte, die Anschlüsse zum Nachbarn sind kurze Stücke Gerade, und in den
 * Ecken liegt je ein Quadrat Gehweg — so laufen Fahrbahn, Bordstein und
 * Markierung über jede Fuge durch.
 *
 * **Straßen und Plätze sind Boden mit Möbeln** (`floor`): Sie sperren nichts,
 * man geht und stellt darauf, und Laternen und Ampeln stehen als Teile auf dem
 * Gehweg — ein Preset statt zwanzig Einzelteile. Alles liegt **16 cm hoch**
 * (`SLAB_TOP`), die Fahrbahn darin 3 cm tiefer: Die Platten der Welt schieben
 * ihren Tiefenwert nach vorn (`plateFloor`, `polygonOffset`) und gewinnen
 * sonst jedes Pixel — eine Fahrbahn 1 cm über dem Boden war unsichtbar.
 *
 * **Häuser** sind so breit wie das Haus selbst und 8 m tief
 * (`house`): vorn bündig an den Gehweg, hinten ein Streifen Rasen. Gemeldet
 * an der ersten Fassung, in der jedes Haus auf einer Gehwegplatte von 8 × 8 m
 * stand: _„Bei den Gebäuden muss der benötigte Platz reduziert werden, sodass
 * links und rechts nicht diese leeren Gassen sind […] an der Rückseite macht
 * es schon Sinn."_ So stehen Häuser in einer Reihe Wand an Wand.
 */

/** **Faktor auf den Maßstab des Regals** (0,5): 4 m je Einheit der Quelle. */
export const CITY_SCALE = 8;

/** **Die Kante eines Straßenstücks** in Metern — und die Tiefe eines Hauses. */
export const CITY_BLOCK = 8;

/** **Die Fahrbahn**, in Metern — zwei Spuren zu 3 m. */
const ROADWAY = 6;
/** **Der Gehweg** je Seite, in Metern — der Rest bis zur Kante des Stücks. */
const WALK = (CITY_BLOCK - ROADWAY) / 2;
/** Die Mitte des Gehwegs, von der Mitte des Stücks aus. */
const SIDE = ROADWAY / 2 + WALK / 2;

/** Eine Adresse aus _City Builder Bits_. */
export function cityBits(name: string): string {
  return `city-builder-bits/${name}.glb`;
}

/** So hoch ist der Körper — wie bei jedem Möbel: Darüber springt niemand. */
const BODY = 1.4;

/** Was nichts sperrt — Straße, Platz: Man geht darüber. */
const NOTHING: readonly [number, number] = [0, 0];

/**
 * **Wie hoch eine Straße liegt**, in Metern: Oberkante von Bordstein und
 * Gehweg. Die Fahrbahn liegt darin ein Fünftel tiefer (in der Quelle 0,04 von
 * 0,05), also 13 cm über dem Boden der Welt — sicher über deren Platten.
 */
const SLAB_TOP = 0.16;
/** Die Platz- und Parkplatten — eben, ihre Oberkante 10 cm über dem Boden. */
const WALK_TOP = 0.1;

/**
 * **Eine Platte auf genaue Maße** — Breite × Tiefe in Metern, `top` hoch, mit
 * der Mitte bei (`x`, `z`) und um `yaw` gedreht (gestreckt wird vorher, also
 * gelten Breite und Tiefe ungedreht). Steht auf dem Boden der Welt.
 */
function plate(
  name: string,
  w: number,
  d: number,
  x = 0,
  z = 0,
  yaw = 0,
  top = SLAB_TOP,
): ElementPart {
  return { model: cityBits(name), size: [w, top, d], pose: { at: [x, 0, z], rot: [0, yaw, 0] } };
}

/** **Ein Stück Gehweg** — aus der Gehwegplatte der Quelle, Breite × Tiefe in Metern. */
function walk(x: number, z: number, w: number, d: number): ElementPart {
  return plate('base', w, d, x, z);
}

/**
 * **Eine Platte, eingelassen** — für Platz und Park, die ihre Kanten behalten
 * sollen: im Maßstab der Stadt, die Oberkante `top` über dem Boden
 * (`ElementPart.flush` rechnet von der Oberkante dessen, worauf es liegt).
 */
function slab(name: string, top = WALK_TOP, yaw?: number): ElementPart {
  return { model: cityBits(name), scale: CITY_SCALE, flush: -top, ...(yaw ? { yaw } : {}) };
}

/**
 * **Etwas, das auf der Platte steht** — an seinem Ursprung (`rooted`: dort
 * steht der Mast), auf der Oberkante des ersten Teils (`on: 0`), um `yaw`
 * gedreht. Laterne und Ampel haben ihren Arm in der Quelle nach Westen (−x).
 */
function onSlab(name: string, at: readonly [number, number], yaw = 0): ElementPart {
  return { model: cityBits(name), scale: CITY_SCALE, rooted: true, on: 0, at, yaw };
}

/** Die Drehungen — der Arm der Quelle zeigt nach Westen (−x). */
const ARM_WEST = 0;
const ARM_EAST = Math.PI;
const ARM_NORTH = -Math.PI / 2;
const ARM_SOUTH = Math.PI / 2;
/** Schräg nach Nordwesten — von der inneren Ecke einer Kurve in die Fahrbahn. */
const ARM_NORTHWEST = -Math.PI / 4;
/** Vierteldrehung — eine Gerade quer, von West nach Ost. */
const ACROSS = Math.PI / 2;

/** **Die Gerade**: Fahrbahn von Nord nach Süd, Gehweg links und rechts. */
function straight(name = 'road_straight'): ElementPart[] {
  return [
    plate(name, ROADWAY, CITY_BLOCK),
    walk(-SIDE, 0, WALK, CITY_BLOCK),
    walk(SIDE, 0, WALK, CITY_BLOCK),
  ];
}

/**
 * **Ein Knoten** — die Fahrbahn der Quelle auf 6 × 6 m in der Mitte, ein
 * kurzes Stück Gerade zu jedem Ausgang (`exits`: Nord, Ost, Süd, West), ein
 * Gehwegstreifen an jeder geschlossenen Seite und ein Quadrat Gehweg in jeder
 * Ecke dazwischen.
 */
function junctionParts(
  name: string,
  exits: { n?: boolean; e?: boolean; s?: boolean; w?: boolean },
): ElementPart[] {
  const parts: ElementPart[] = [plate(name, ROADWAY, ROADWAY)];
  if (exits.n) parts.push(plate('road_straight', ROADWAY, WALK, 0, -SIDE));
  else parts.push(walk(0, -SIDE, ROADWAY, WALK));
  if (exits.s) parts.push(plate('road_straight', ROADWAY, WALK, 0, SIDE));
  else parts.push(walk(0, SIDE, ROADWAY, WALK));
  if (exits.e) parts.push(plate('road_straight', ROADWAY, WALK, SIDE, 0, ACROSS));
  else parts.push(walk(SIDE, 0, WALK, ROADWAY));
  if (exits.w) parts.push(plate('road_straight', ROADWAY, WALK, -SIDE, 0, ACROSS));
  else parts.push(walk(-SIDE, 0, WALK, ROADWAY));
  for (const [x, z] of [
    [SIDE, SIDE],
    [-SIDE, SIDE],
    [SIDE, -SIDE],
    [-SIDE, -SIDE],
  ] as const)
    parts.push(walk(x, z, WALK, WALK));
  return parts;
}

/** **Eine Straße**: ihre Platten und was darauf steht, auf 8 × 8 Kacheln, ohne Sperre. */
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

/** Eine Laterne der Straße: wo sie steht und wohin ihr Arm zeigt. */
type LampSpot = readonly [x: number, z: number, yaw: number];

/**
 * **Die Fassungen der Laternen** — der Reihe nach, wie `A` sie tauscht
 * (`GameElement.swap`): die moderne mit Arm über der Fahrbahn, die alte mit
 * einer Leuchte auf dem Mast, die alte mit zweien.
 */
const LAMP_STYLES = [
  { suffix: '', file: 'streetlight', one: 'Laterne', many: 'Laternen' },
  { suffix: '-old', file: 'streetlight_old_single', one: 'alter Laterne', many: 'alten Laternen' },
  {
    suffix: '-double',
    file: 'streetlight_old_double',
    one: 'Doppellaterne',
    many: 'Doppellaternen',
  },
] as const;

/**
 * **Eine Straße mit Laternen, in jeder Fassung** — drei Elemente auf
 * denselben Platten, die sich im Spiel reihum tauschen: Wer auf eine Laterne
 * schaut, sieht sie leuchten, und `A` stellt die nächste Fassung hin
 * (`opens: 'swap'`, `ElementPart.swaps`). Die erste steht im Ordner, die
 * anderen unter _Alles_.
 *
 * @param label der Name, `%` steht für die Laterne(n): „Straße mit %"
 */
function lampRoad(
  id: string,
  label: string,
  aka: readonly string[],
  plates: readonly ElementPart[],
  lamps: readonly LampSpot[],
): GameElement[] {
  return LAMP_STYLES.map((style, i) => {
    const next = LAMP_STYLES[(i + 1) % LAMP_STYLES.length]!;
    const name = lamps.length > 1 ? style.many : style.one;
    return {
      ...road(id + style.suffix, label.replace('%', name), aka, [
        ...plates,
        ...lamps.map(([x, z, yaw]): ElementPart => ({
          ...onSlab(style.file, [x, z], yaw),
          swaps: true,
        })),
      ]),
      opens: 'swap' as const,
      swap: id + next.suffix,
    };
  });
}

/** Ob eine Id eine getauschte Fassung ist — die stehen nur unter _Alles_. */
function isVariant(id: string): boolean {
  return LAMP_STYLES.some((style) => style.suffix !== '' && id.endsWith(style.suffix));
}

/**
 * **Ein Haus** — so breit wie das Haus (`width`, aufgerundet auf Kacheln) und
 * `CITY_BLOCK` tief, auf Pflaster in der Höhe des Gehwegs. Das Haus ohne
 * Sockel steht vorn (Süden) bündig an der Kante, dahinter liegt Rasen. Gesperrt ist die ganze Fläche: Hinter einem
 * Haus geht niemand durch den Garten.
 *
 * @param width Breite des Hauses in Metern, nachgemessen an der Datei ohne Sockel
 * @param depth seine Tiefe
 */
function house(
  id: string,
  label: string,
  letter: string,
  width: number,
  depth: number,
): GameElement {
  // Ein paar Zentimeter Überstand zählen nicht: 8,03 m sind acht Kacheln.
  const tiles = Math.ceil(width - 0.05);
  const yard = CITY_BLOCK - depth;
  return {
    id,
    label,
    aka: ['Haus', 'Gebäude', 'Building', 'Stadt'],
    tiles: [tiles, CITY_BLOCK],
    height: BODY,
    kind: null,
    parts: [
      // Pflaster über die ganze Fläche, so hoch wie der Gehweg der Straße: Das
      // Haus ist ein paar Zentimeter schmaler als seine Kacheln und hat vorn
      // Stufen und Markisen, die über seine Wand hinausragen — sonst sähe man
      // dort den Boden der Welt als Streifen.
      plate('base', tiles, CITY_BLOCK),
      // Der Garten hinten, eine Handbreit darüber, damit sich beide nicht um
      // dieselben Bildpunkte streiten.
      plate('park_base', tiles, yard, 0, -CITY_BLOCK / 2 + yard / 2, 0, SLAB_TOP + 0.01),
      {
        model: cityBits(`building_${letter}_withoutBase`),
        scale: CITY_SCALE,
        at: [0, CITY_BLOCK / 2 - depth / 2],
        on: 0,
      },
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
 * Art: Straßen, Plätze, Häuser, Straßenmöbel, Autos, Grün.
 *
 * **Die Straßen als Vorschlag**, je mit dem, was an so einer Stelle steht:
 * die Gerade mit zwei Laternen versetzt auf beiden Gehwegen, der Zebrastreifen
 * mit einer Ampel je Seite, die Ecke und die Kurve mit einer Laterne an der
 * inneren Ecke, die Einmündung mit drei Ampeln, die Kreuzung mit vier
 * Ampelbrücken — eine für jede Richtung. Dazu eine Gerade ohne alles und die
 * Allee. Die Laternen lassen sich im Spiel tauschen (`lampRoad`).
 *
 * **Ampeln stehen vor der Kreuzung, rechts der Spur, die auf sie zufährt**
 * (Rechtsverkehr), das Signal dem Verkehr zugewandt und der Arm über dieser
 * Spur. In der Quelle zeigt der Arm nach Westen und das Signal nach Süden:
 * Ungedreht ist das die Ampel an der Südostecke für die, die nach Norden
 * fahren. Gemeldet war: _„die Ampeln wirken nicht an der richtigen Stelle"_.
 */
export const CITY_ELEMENTS: readonly GameElement[] = [
  // Straßen — 8 × 8 m, die Gerade läuft von Nord nach Süd (z).
  ...lampRoad('city-road', 'Straße mit %', ['Straße', 'Gerade', 'Laterne', 'Road'], straight(), [
    [SIDE, -2, ARM_WEST],
    [-SIDE, 2, ARM_EAST],
  ]),
  road('city-road-plain', 'Straße', ['Straße', 'Gerade', 'Road'], straight()),
  road(
    'city-road-crossing',
    'Zebrastreifen mit Ampeln',
    ['Straße', 'Fußgängerüberweg', 'Ampel', 'Zebrastreifen'],
    [
      ...straight('road_straight_crossing'),
      onSlab('trafficlight_B', [SIDE, 2.6], ARM_WEST),
      onSlab('trafficlight_B', [-SIDE, -2.6], ARM_EAST),
    ],
  ),
  // Ecke und Kurve: Die Fahrbahn kommt von Süden und biegt nach Osten ab, die
  // Laterne steht auf dem Gehweg der inneren Ecke (Südosten).
  ...lampRoad(
    'city-road-corner',
    'Straßenecke mit %',
    ['Straße', 'Ecke', 'Laterne'],
    junctionParts('road_corner', { s: true, e: true }),
    [[SIDE, SIDE, ARM_NORTHWEST]],
  ),
  ...lampRoad(
    'city-road-curve',
    'Kurve mit %',
    ['Straße', 'Kurve', 'Laterne'],
    junctionParts('road_corner_curved', { s: true, e: true }),
    [[SIDE, SIDE, ARM_NORTHWEST]],
  ),
  road(
    'city-road-tsplit',
    'Einmündung mit Ampeln',
    ['Straße', 'T-Kreuzung', 'Einmündung', 'Ampel'],
    [
      // Die Gerade läuft von Nord nach Süd, der Abzweig geht nach Osten.
      ...junctionParts('road_tsplit', { n: true, s: true, e: true }),
      onSlab('trafficlight_B', [SIDE, SIDE], ARM_WEST), // nach Norden
      onSlab('trafficlight_B', [-SIDE, -SIDE], ARM_EAST), // nach Süden
      onSlab('trafficlight_B', [SIDE, -SIDE], ARM_SOUTH), // aus dem Abzweig nach Westen
    ],
  ),
  road(
    'city-road-junction',
    'Kreuzung mit Ampeln',
    ['Straße', 'Kreuzung', 'Ampel'],
    [
      ...junctionParts('road_junction', { n: true, e: true, s: true, w: true }),
      onSlab('trafficlight_C', [SIDE, SIDE], ARM_WEST), // nach Norden
      onSlab('trafficlight_C', [-SIDE, -SIDE], ARM_EAST), // nach Süden
      onSlab('trafficlight_C', [SIDE, -SIDE], ARM_SOUTH), // nach Westen
      onSlab('trafficlight_C', [-SIDE, SIDE], ARM_NORTH), // nach Osten
    ],
  ),
  road(
    'city-road-avenue',
    'Allee',
    ['Straße', 'Bäume', 'Allee'],
    [
      ...straight(),
      onSlab('tree_A', [SIDE, -2]),
      onSlab('tree_B', [-SIDE, 2]),
      onSlab('tree_C', [SIDE, 2.5], Math.PI / 2),
      onSlab('tree_A', [-SIDE, -2.5], Math.PI),
    ],
  ),
  // Plätze — Platz und Park, 8 × 8 m. Die verzierten Parkplatten der Quelle
  // gehen nicht: Eingelassen wird um ihre ganze Höhe, und mit den Bäumen darin
  // versänken sie samt Wiese im Boden. Also die flache Platte und das Grün
  // als eigene Teile darauf.
  road('city-plaza', 'Platz', ['Platz', 'Bürgersteig', 'Pflaster', 'Gehweg'], [slab('base')]),
  road('city-park', 'Park', ['Park', 'Wiese', 'Rasen'], [slab('park_base')]),
  road(
    'city-park-trees',
    'Park mit Bäumen',
    ['Park', 'Bäume'],
    [
      slab('park_base'),
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
      slab('park_base'),
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
      slab('park_road_straight'),
      onSlab('bench', [2.6, 0], -Math.PI / 2),
      onSlab('streetlight_old_single', [2.6, -2.5]),
      onSlab('bush_C', [-2.8, -2]),
      onSlab('bush_B', [-2.8, 2.2]),
    ],
  ),
  // Häuser — so breit wie das Haus, 8 m tief: vorn bündig an den Gehweg der
  // Straße, hinten Garten. Breite × Höhe × Tiefe des Hauses.
  house('city-house-a', 'Kleines Stadthaus', 'A', 4.8, 5.8), // 4,8 × 6,6 × 5,8
  house('city-house-b', 'Breites Stadthaus', 'B', 6.4, 5.2), // 6,4 × 6,6 × 5,2
  house('city-house-c', 'Hohes Stadthaus', 'C', 4.8, 5.2), // 4,8 × 11,9 × 5,2
  house('city-house-d', 'Hohes breites Stadthaus', 'D', 6.4, 5.2), // 6,4 × 11,9 × 5,2
  house('city-house-e', 'Eckhaus', 'E', 8, 5.8), // 8,0 × 9,4 × 5,8
  house('city-house-f', 'Reihenhaus', 'F', 8, 5.2), // 8,0 × 9,4 × 5,2
  house('city-house-g', 'Hohes Eckhaus', 'G', 8, 5.8), // 8,0 × 11,9 × 5,8
  house('city-house-h', 'Wohnblock', 'H', 8, 5.2), // 8,0 × 12,2 × 5,2
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
      elements: ofKind('city-road').filter((id) => !isVariant(id)),
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
