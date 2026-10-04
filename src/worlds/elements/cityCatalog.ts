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
 * Ein Straßenstück ist **12 × 12 m**: 6 m Fahrbahn mit zwei Spuren
 * (`ROADWAY`), links und rechts je 3 m Gehweg (`WALK`) — gewünscht: _„Der
 * Gehweg sollte mindestens 3 Felder breit sein"_. Die Platten der Quelle
 * werden dafür auf genaue Maße gebracht (`ElementPart.size`, `pose`): die
 * Fahrbahn auf 6 m Breite, der Gehweg als Streifen aus der Gehwegplatte. An
 * Kreuzung, Einmündung und Ecke sitzt die Fahrbahn der Quelle auf 6 × 6 m in
 * der Mitte, die Anschlüsse zum Nachbarn sind kurze Stücke Gerade, und in den
 * Ecken liegt je ein Quadrat Gehweg — so laufen Fahrbahn, Bordstein und
 * Markierung über jede Fuge durch.
 *
 * **Straßen und Plätze sind Boden mit Möbeln** (`floor`): Sie sperren nichts,
 * man geht und stellt darauf, und Laternen und Ampeln stehen als Teile auf dem
 * Gehweg — ein Preset statt zwanzig Einzelteile. Plätze und Parks haben
 * dieselben 12 × 12 m, damit alles ein Raster ist. Alles liegt **16 cm hoch**
 * (`SLAB_TOP`), die Fahrbahn darin 3 cm tiefer: Die Platten der Welt schieben
 * ihren Tiefenwert nach vorn (`plateFloor`, `polygonOffset`) und gewinnen
 * sonst jedes Pixel — eine Fahrbahn 1 cm über dem Boden war unsichtbar.
 *
 * **Häuser** sind so breit wie das Haus selbst und 6 m tief — ein halbes
 * Straßenstück, damit zwei Häuser Rücken an Rücken genau eines füllen
 * (`house`, `HOUSE_DEPTH`): vorn bündig an den Gehweg. Gemeldet
 * an der ersten Fassung, in der jedes Haus auf einer Gehwegplatte von 8 × 8 m
 * stand: _„Bei den Gebäuden muss der benötigte Platz reduziert werden, sodass
 * links und rechts nicht diese leeren Gassen sind […] an der Rückseite macht
 * es schon Sinn."_ So stehen Häuser in einer Reihe Wand an Wand.
 */

/** **Faktor auf den Maßstab des Regals** (0,5): 4 m je Einheit der Quelle. */
export const CITY_SCALE = 8;

/** **Die Kante eines Straßenstücks, Platzes, Parks** in Metern — und die Tiefe eines Hauses. */
export const CITY_BLOCK = 12;

/** **Die Fahrbahn**, in Metern — zwei Spuren zu 3 m. */
const ROADWAY = 6;
/**
 * **Der Gehweg** je Seite, in Metern — der Rest bis zur Kante des Stücks:
 * drei Kacheln. Gewünscht: _„Der Gehweg ist mir zu klein. Der sollte
 * mindestens 3 Felder breit sein"_ — vorher war er einen Meter breit.
 */
const WALK = (CITY_BLOCK - ROADWAY) / 2;
/** Die Mitte des Gehwegs, von der Mitte des Stücks aus. */
const SIDE = ROADWAY / 2 + WALK / 2;
/**
 * **Wo Laterne und Ampel stehen** — auf dem Gehweg, einen halben Meter vom
 * Bordstein: Der Arm (1 m bei der Laterne, 3 m bei der Ampelbrücke) reicht
 * so über die Fahrbahn und nicht über den Gehweg.
 */
const CURB = ROADWAY / 2 + 0.5;

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

/**
 * **Die Gerade**: Fahrbahn von Nord nach Süd, Gehweg links und rechts —
 * `length` Meter lang (ein ganzes Stück, oder ein kurzes: `shortRoads`).
 */
function straight(name = 'road_straight', length = CITY_BLOCK): ElementPart[] {
  return [plate(name, ROADWAY, length), walk(-SIDE, 0, WALK, length), walk(SIDE, 0, WALK, length)];
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

/** **Eine Straße**: ihre Platten und was darauf steht, auf 12 × 12 Kacheln, ohne Sperre. */
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

/** Ob eine Id eine kurze Gerade ist (`city-road-7`) — die legt nur das Ziehen. */
function isShort(id: string): boolean {
  return /^city-road.*-\d+$/.test(id);
}

/** Ab dieser Länge steht auf einer kurzen Geraden eine Laterne oder ein Baum. */
const SHORT_LAMP = 6;

/**
 * **Die kurzen Geraden**, 1–11 m lang — für das Stück zwischen zwei
 * Kreuzungen, die keine ganze Zahl Stücke auseinanderliegen
 * (`roadNetwork.roadPieces`). Gewünscht: _„dass Straßen bzw. Kreuzungen nicht
 * genau eine Straßenbreite entfernt sind, sondern ggf. auch mal kürzer bzw.
 * statt 12 Felder ggf. auch nur 1–11 Felder auseinander liegen können"_.
 *
 * Jede Art hat sie (`city-road-7`, `city-road-old-7`, `city-road-avenue-7` …),
 * die Fahrbahn der Quelle auf die Länge gebracht. Ab sechs Metern steht eine
 * Laterne (getauscht wie auf dem ganzen Stück) oder ein Baum darauf, sonst
 * nichts. Im Katalog stehen sie nicht: Sie legt das Ziehen.
 */
function shortRoads(): GameElement[] {
  const out: GameElement[] = [];
  for (let length = 1; length < CITY_BLOCK; length++) {
    const tiles: [number, number] = [CITY_BLOCK, length];
    const lamp = length >= SHORT_LAMP;
    LAMP_STYLES.forEach((style, i) => {
      const next = LAMP_STYLES[(i + 1) % LAMP_STYLES.length]!;
      const parts = [...straight('road_straight', length)];
      if (lamp) parts.push({ ...onSlab(style.file, [CURB, 0], ARM_WEST), swaps: true });
      out.push({
        ...road(`city-road${style.suffix}-${length}`, `Straße mit ${style.one}`, ['Straße'], parts),
        tiles,
        ...(lamp ? { opens: 'swap' as const, swap: `city-road${next.suffix}-${length}` } : {}),
      });
    });
    out.push({
      ...road(`city-road-plain-${length}`, 'Straße', ['Straße'], straight('road_straight', length)),
      tiles,
    });
    out.push({
      ...road(
        `city-road-avenue-${length}`,
        'Allee',
        ['Straße', 'Allee'],
        [...straight('road_straight', length), ...(lamp ? [onSlab('tree_A', [SIDE, 0])] : [])],
      ),
      tiles,
    });
  }
  return out;
}

/**
 * **Wie tief ein Haus ist**, in Metern — ein halbes Straßenstück: Zwei Häuser
 * Rücken an Rücken füllen genau eines (`HOUSE_DEPTH` × 2 = `CITY_BLOCK`).
 * Gefragt: _„was ist aber nun mit zwei Häusern, die Rücken an Rücken stehen,
 * geht das? Sind alle Häuser gleich groß von der Tiefe?"_ — die Häuser der
 * Quelle sind 5,2 oder 5,8 m tief, also stehen alle auf sechs Kacheln.
 */
export const HOUSE_DEPTH = CITY_BLOCK / 2;

/**
 * **Ein Haus** — so breit wie das Haus (`width`, aufgerundet auf Kacheln) und
 * `HOUSE_DEPTH` tief, auf Pflaster in der Höhe des Gehwegs. Das Haus ohne
 * Sockel steht vorn (Süden) bündig an der Kante; hinten bleibt bei den
 * flacheren Häusern ein schmaler Streifen Pflaster. Wer hinten Grün will,
 * stellt einen Garten dahinter (`city-garden`, auch sechs Kacheln tief).
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
  return {
    id,
    label,
    aka: ['Haus', 'Gebäude', 'Building', 'Stadt'],
    tiles: [tiles, HOUSE_DEPTH],
    height: BODY,
    kind: null,
    parts: [
      // Pflaster über die ganze Fläche, so hoch wie der Gehweg der Straße: Das
      // Haus ist ein paar Zentimeter schmaler als seine Kacheln und hat vorn
      // Stufen und Markisen, die über seine Wand hinausragen — sonst sähe man
      // dort den Boden der Welt als Streifen.
      plate('base', tiles, HOUSE_DEPTH),
      {
        model: cityBits(`building_${letter}_withoutBase`),
        scale: CITY_SCALE,
        at: [0, HOUSE_DEPTH / 2 - depth / 2],
        on: 0,
      },
    ],
  };
}

/** **Ein Modell aus einem anderen Paket des Regals**, auf `height` Meter gebracht. */
function kit(
  model: string,
  height: number,
  at: readonly [number, number] = [0, 0],
  yaw = 0,
): ElementPart {
  return { model, height, at, yaw };
}

/** Dasselbe auf der Platte eines Platzes (`on: 0`). */
function kitOn(model: string, height: number, at: readonly [number, number], yaw = 0): ElementPart {
  return { ...kit(model, height, at, yaw), on: 0 };
}

/** Die Farben der Sonnenschirme (`mixed-bag/umbrella_*`). */
const UMBRELLAS = ['blue', 'green', 'yellow', 'pink'] as const;

/** Ein Sonnenschirm, 2,4 m hoch. */
function umbrella(color: string): string {
  return `mixed-bag/umbrella_${color}.glb`;
}

/**
 * **Ein Café-Tisch** — Tisch, zwei Stühle einander gegenüber, darüber ein
 * Schirm, um (`x`, `z`) auf der Platte.
 */
function cafeSet(x: number, z: number, color: string, onPlate: boolean): ElementPart[] {
  const at = onPlate ? kitOn : kit;
  return [
    at('furniture-bits/table_small.glb', 0.75, [x, z]),
    at('furniture-bits/chair_A.glb', 0.95, [x - 0.85, z], Math.PI / 2),
    at('furniture-bits/chair_A.glb', 0.95, [x + 0.85, z], -Math.PI / 2),
    at(umbrella(color), 2.4, [x, z]),
  ];
}

/**
 * **Der Stadtpark**, 24 × 24 m — Rasen, ein Wegekreuz mit einer
 * Doppellaterne in der Mitte, Bäume in den vier Vierteln, Bänke an den
 * Wegen und rundherum eine Hecke mit einer Lücke an jedem Weg. Die Mauer-
 * teile der Quelle gehen nicht: Sie sind Kacheln mit der Mauer an einer Kante
 * und würden mit dem Maß der Kachel gestreckt.
 */
function bigPark(): ElementPart[] {
  const S = 2 * CITY_BLOCK;
  const half = S / 2;
  const path = 4;
  const parts: ElementPart[] = [
    plate('park_base', S, S, 0, 0, 0, WALK_TOP),
    plate('park_road_straight', path, S, 0, 0, 0, WALK_TOP + 0.02),
    plate('park_road_straight', path, S, 0, 0, ACROSS, WALK_TOP + 0.02),
    plate('park_road_junction', path, path, 0, 0, 0, WALK_TOP + 0.04),
    onSlab('streetlight_old_double', [0, 0]),
  ];
  const trees = ['tree_A', 'tree_B', 'tree_C', 'tree_D', 'tree_E'];
  let n = 0;
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const) {
    for (const [x, z] of [
      [7, 7],
      [4.5, 9.5],
      [9.5, 4],
    ] as const)
      parts.push(onSlab(trees[n++ % trees.length]!, [sx * x, sz * z], n));
    // Eine Bank an jedem Weg, mit dem Rücken zum Rasen.
    parts.push(onSlab('bench', [sx * 3.2, sz * 6], sx > 0 ? -Math.PI / 2 : Math.PI / 2));
    parts.push(onSlab('streetlight_old_single', [sx * 3.2, sz * 9.5]));
  }
  // Die Hecke: Büsche an allen vier Kanten, außer wo ein Weg hinausgeht.
  for (let t = -half + 1.5; t <= half - 1.5; t += 2.5) {
    if (Math.abs(t) < path) continue;
    for (const [x, z] of [
      [t, -half + 1],
      [t, half - 1],
      [-half + 1, t],
      [half - 1, t],
    ] as const)
      parts.push(onSlab(['bush_A', 'bush_B', 'bush_C'][n++ % 3]!, [x, z], n));
  }
  return parts;
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
  // Straßen — 12 × 12 m, die Gerade läuft von Nord nach Süd (z).
  ...lampRoad('city-road', 'Straße mit %', ['Straße', 'Gerade', 'Laterne', 'Road'], straight(), [
    [CURB, -3, ARM_WEST],
    [-CURB, 3, ARM_EAST],
  ]),
  road('city-road-plain', 'Straße', ['Straße', 'Gerade', 'Road'], straight()),
  road(
    'city-road-crossing',
    'Zebrastreifen mit Ampeln',
    ['Straße', 'Fußgängerüberweg', 'Ampel', 'Zebrastreifen'],
    [
      ...straight('road_straight_crossing'),
      onSlab('trafficlight_B', [CURB, 3], ARM_WEST),
      onSlab('trafficlight_B', [-CURB, -3], ARM_EAST),
    ],
  ),
  // Ecke und Kurve: Die Fahrbahn kommt von Süden und biegt nach Osten ab, die
  // Laterne steht auf dem Gehweg der inneren Ecke (Südosten).
  ...lampRoad(
    'city-road-corner',
    'Straßenecke mit %',
    ['Straße', 'Ecke', 'Laterne'],
    junctionParts('road_corner', { s: true, e: true }),
    [[CURB, CURB, ARM_NORTHWEST]],
  ),
  ...lampRoad(
    'city-road-curve',
    'Kurve mit %',
    ['Straße', 'Kurve', 'Laterne'],
    junctionParts('road_corner_curved', { s: true, e: true }),
    [[CURB, CURB, ARM_NORTHWEST]],
  ),
  road(
    'city-road-tsplit',
    'Einmündung mit Ampeln',
    ['Straße', 'T-Kreuzung', 'Einmündung', 'Ampel'],
    [
      // Die Gerade läuft von Nord nach Süd, der Abzweig geht nach Osten.
      ...junctionParts('road_tsplit', { n: true, s: true, e: true }),
      onSlab('trafficlight_B', [CURB, CURB], ARM_WEST), // nach Norden
      onSlab('trafficlight_B', [-CURB, -CURB], ARM_EAST), // nach Süden
      onSlab('trafficlight_B', [CURB, -CURB], ARM_SOUTH), // aus dem Abzweig nach Westen
    ],
  ),
  road(
    'city-road-junction',
    'Kreuzung mit Ampeln',
    ['Straße', 'Kreuzung', 'Ampel'],
    [
      ...junctionParts('road_junction', { n: true, e: true, s: true, w: true }),
      onSlab('trafficlight_C', [CURB, CURB], ARM_WEST), // nach Norden
      onSlab('trafficlight_C', [-CURB, -CURB], ARM_EAST), // nach Süden
      onSlab('trafficlight_C', [CURB, -CURB], ARM_SOUTH), // nach Westen
      onSlab('trafficlight_C', [-CURB, CURB], ARM_NORTH), // nach Osten
    ],
  ),
  road(
    'city-road-avenue',
    'Allee',
    ['Straße', 'Bäume', 'Allee'],
    [
      ...straight(),
      onSlab('tree_A', [SIDE, -3]),
      onSlab('tree_B', [-SIDE, 3]),
      onSlab('tree_C', [SIDE, 3.5], Math.PI / 2),
      onSlab('tree_A', [-SIDE, -3.5], Math.PI),
    ],
  ),
  // Plätze — Platz und Park, 12 × 12 m. Die verzierten Parkplatten der Quelle
  // gehen nicht: Auf Maß gebracht (`plate`) würden ihre Bäume mit der Platte
  // flachgedrückt. Also die flache Platte und das Grün als eigene Teile darauf.
  road(
    'city-plaza',
    'Platz',
    ['Platz', 'Bürgersteig', 'Pflaster', 'Gehweg'],
    [plate('base', CITY_BLOCK, CITY_BLOCK, 0, 0, 0, WALK_TOP)],
  ),
  road(
    'city-park',
    'Park',
    ['Park', 'Wiese', 'Rasen'],
    [plate('park_base', CITY_BLOCK, CITY_BLOCK, 0, 0, 0, WALK_TOP)],
  ),
  road(
    'city-park-trees',
    'Park mit Bäumen',
    ['Park', 'Bäume'],
    [
      plate('park_base', CITY_BLOCK, CITY_BLOCK, 0, 0, 0, WALK_TOP),
      onSlab('tree_A', [-3, -3]),
      onSlab('tree_D', [3, -2.25], Math.PI / 2),
      onSlab('tree_E', [-2.25, 3.3], Math.PI),
      onSlab('bench', [3, 3.75], Math.PI),
    ],
  ),
  road(
    'city-park-bushes',
    'Park mit Büschen',
    ['Park', 'Büsche'],
    [
      plate('park_base', CITY_BLOCK, CITY_BLOCK, 0, 0, 0, WALK_TOP),
      onSlab('bush_A', [-3.75, -3.75]),
      onSlab('bush_B', [3.3, -3]),
      onSlab('bush_C', [-3, 3.75]),
      onSlab('bush_A', [3.75, 3.75], Math.PI / 2),
    ],
  ),
  road(
    'city-park-path',
    'Parkweg',
    ['Park', 'Weg'],
    [
      plate('park_road_straight', CITY_BLOCK, CITY_BLOCK, 0, 0, 0, WALK_TOP),
      onSlab('bench', [3.9, 0], -Math.PI / 2),
      onSlab('streetlight_old_single', [3.9, -3.75]),
      onSlab('bush_C', [-4.2, -3]),
      onSlab('bush_B', [-4.2, 3.3]),
    ],
  ),
  // Große Plätze — der Stadtpark über vier Stücke, Café und Markt auf einem.
  {
    ...road('city-park-big', 'Stadtpark', ['Park', 'Stadtpark', 'Bäume', 'Hecke'], bigPark()),
    tiles: [2 * CITY_BLOCK, 2 * CITY_BLOCK],
  },
  road(
    'city-square-cafe',
    'Platz mit Café',
    ['Platz', 'Café', 'Sonnenschirm', 'Tisch'],
    [
      plate('base', CITY_BLOCK, CITY_BLOCK, 0, 0, 0, WALK_TOP),
      ...cafeSet(-3, -3, 'blue', true),
      ...cafeSet(2.5, -3.5, 'green', true),
      ...cafeSet(-2.5, 2, 'yellow', true),
      ...cafeSet(3, 2.5, 'pink', true),
      onSlab('tree_B', [-4.5, 5]),
      onSlab('tree_C', [4.5, -5.25], Math.PI / 2),
      onSlab('streetlight_old_single', [0, 0]),
    ],
  ),
  road(
    'city-square-market',
    'Marktplatz',
    ['Platz', 'Markt', 'Stand', 'Sonnenschirm'],
    [
      plate('base', CITY_BLOCK, CITY_BLOCK, 0, 0, 0, WALK_TOP),
      ...[
        [-3.5, -3.5, 'restaurant-bits/crate_carrots.glb'],
        [0, -3.5, 'restaurant-bits/crate_tomatoes.glb'],
        [3.5, -3.5, 'restaurant-bits/crate_lettuce.glb'],
        [-3.5, 3.5, 'restaurant-bits/crate_potatoes.glb'],
        [0, 3.5, 'restaurant-bits/crate_onions.glb'],
        [3.5, 3.5, 'restaurant-bits/crate_mushrooms.glb'],
      ].flatMap(([x, z, crate], i): ElementPart[] => [
        kitOn(crate as string, 0.6, [x as number, z as number]),
        kitOn(umbrella(UMBRELLAS[i % UMBRELLAS.length]!), 2.4, [x as number, z as number]),
      ]),
      onSlab('bench', [0, 0], Math.PI / 2),
      onSlab('streetlight_old_double', [-5, 0]),
      onSlab('streetlight_old_double', [5, 0]),
    ],
  ),
  // Hinter den Häusern — sechs Kacheln tief wie ein Haus, so breit wie ein
  // Straßenstück.
  {
    ...road(
      'city-garden',
      'Garten',
      ['Garten', 'Hinterhof', 'Rasen'],
      [
        plate('park_base', CITY_BLOCK, HOUSE_DEPTH, 0, 0, 0, WALK_TOP),
        onSlab('bush_A', [-4.2, -1.5]),
        onSlab('bush_C', [4.2, 1.5], Math.PI),
      ],
    ),
    tiles: [CITY_BLOCK, HOUSE_DEPTH],
  },
  {
    ...road(
      'city-yard',
      'Hinterhof',
      ['Hof', 'Hinterhof', 'Pflaster'],
      [
        plate('base', CITY_BLOCK, HOUSE_DEPTH, 0, 0, 0, WALK_TOP),
        onSlab('dumpster', [-3.5, 0], Math.PI / 2),
        onSlab('box_A', [3.5, 1]),
      ],
    ),
    tiles: [CITY_BLOCK, HOUSE_DEPTH],
  },
  // Häuser — so breit wie das Haus, sechs Kacheln tief: vorn bündig an den
  // Gehweg der Straße, Rücken an Rücken mit dem Nachbarn dahinter. Breite ×
  // Höhe × Tiefe des Hauses.
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
  // Aus anderen Paketen des Regals — was auf Straße und Gehweg steht.
  ...UMBRELLAS.map((color) => ({
    ...prop(`city-umbrella-${color}`, 'Sonnenschirm', '', [2, 2], { solid: POLE }),
    parts: [kit(umbrella(color), 2.4)],
  })),
  {
    ...prop('city-cafe-table', 'Café-Tisch', '', [3, 2]),
    parts: cafeSet(0, 0, 'blue', false),
  },
  { ...prop('city-bicycle', 'Fahrrad', '', [1, 2]), parts: [kit('mixed-bag/bicycle.glb', 1)] },
  {
    ...prop('city-cone', 'Leitkegel', '', [1, 1], { solid: POLE }),
    parts: [kit('platformer/neutral/cone.glb', 0.7)],
  },
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
  ...shortRoads(),
];

/** Die Ids in der Reihenfolge des Katalogs. */
export const CITY_CATALOGUE: readonly string[] = CITY_ELEMENTS.map((one) => one.id).filter(
  (id) => !isShort(id),
);

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
      elements: ofKind('city-plaza', 'city-park', 'city-square', 'city-garden', 'city-yard'),
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
        'city-umbrella',
        'city-cafe',
        'city-bicycle',
        'city-cone',
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
