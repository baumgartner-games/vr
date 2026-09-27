import type { StationKind } from '../test/zones/kitchenCarry';

/**
 * **Die Spielelemente** — was eine Welt als Möbel hinstellt, und zwar als
 * **ein** Ding, nicht als Haufen Modelle.
 *
 * Ein Spielelement ist mehr als eine Datei aus dem Regal: Die Arbeitsplatte
 * mit Schneidebrett ist drei Dateien (Zeile, Brett, Messer), die Eiswannen
 * sind fünf. Dazu gehört, was die Modelle nicht wissen — wie viele Kacheln es
 * belegt, wie hoch sein Körper ist, damit niemand hinaufspringt, und was man
 * damit tut (`kind`). Bis hierher stand genau das in jeder Welt neu: in der
 * Testküche als Katalogeintrag (`core/kitchenFit.ts`), im Burgerladen als
 * Station mit Anbauten (`PlateUpWorld.addStationView`), im Test Restaurant als
 * Zeile aus `base` und `items` (`restaurantPlan.ts`) — dreimal dieselbe
 * Arbeitsplatte, dreimal anders zusammengesetzt, und keine davon sperrte ihre
 * Zellen von selbst.
 *
 * **Welten stellen Elemente hin, keine rohen Modelle** — die Stelle steht in
 * `elementPlace.ts` (`ElementSpot`), das Bild und die Sperre in
 * `elementView.ts` (`placeElement`). Diese Datei ist reine Beschreibung: kein
 * three.js, kein Laden, und damit in Jest prüfbar (`elementCatalog.test.ts`
 * sieht nach, ob jede Datei im Regal liegt).
 *
 * Gebaut wird aus vorhandenen Modellen (_„dass ich eigentlich immer nur
 * existierende Modelle nutzen will"_): Jedes Teil ist eine Adresse im Regal,
 * nichts ist gerechnet.
 */

/**
 * **Was man mit einem Element tut** — die Stationsarten der Küche
 * (`kitchenCarry.StationKind`) und die paar, die dort (noch) nicht stehen.
 *
 * `'tub'` und `'pot'` kommen gerade in die Küche; bis sie in `StationKind`
 * stehen, stehen sie hier, danach ist die Vereinigung doppelt und darf weg.
 * `'ice-stand'` und `'ice-tubs'` bleiben: Die Eisecke regelt ihre eigene Logik
 * (`plateup/plateUpIce.ts`), nicht `kitchenDeed`.
 */
export type ElementKind = StationKind | 'tub' | 'pot' | 'ice-stand' | 'ice-tubs';

/** Was auf einem Brett passiert — Schneiden oder Ausrollen. */
export type ElementWork = 'chop' | 'roll';

/**
 * **Ein Teil eines Elements** — eine Datei aus dem Regal und wo sie sitzt.
 *
 * Alle Maße gelten für ein Element, das **nach Süden schaut** (Vorderseite
 * +z, `face: 'S'`): x nach Osten, z nach Süden, gemessen von der Mitte seiner
 * Grundfläche. Steht das Element anders, dreht sich alles mit
 * (`elementPlace.rotateOffset`).
 */
export interface ElementPart {
  /** Die Adresse im Regal, etwa `'restaurant-bits/kitchencounter_straight_A.glb'`. */
  readonly model: string;
  /** Versatz der Mitte in Metern (x Osten, z Süden) — ohne Angabe die Mitte. */
  readonly at?: readonly [number, number];
  /**
   * **Obenauf auf dem Teil davor** statt auf dem Boden — auf seiner gemessenen
   * Oberkante. Kurzform für `on: <Index davor>`.
   */
  readonly stack?: boolean;
  /**
   * **Auf welchem Teil es steht** (Index in `parts`) — für ein Teil, das nicht
   * auf dem letzten, sondern auf einem früheren steht: Der Portionierer liegt
   * auf der Platte und nicht auf dem Hörnchenstapel daneben.
   */
  readonly on?: number;
  /**
   * **Im Teil davor, wie die Datei es hat** — gleicher Ursprung, gleicher
   * Maßstab, nicht nachgemessen. Das Eis in seiner Wanne: zwei Dateien mit
   * demselben Ursprung (`plateUpIceView.loadTub`), und nur zusammen sitzt das
   * Eis unter dem Rand statt obenauf.
   */
  readonly inside?: boolean;
  /** Zusätzliche Drehung um die Hochachse, in Bogenmaß. */
  readonly yaw?: number;
  /**
   * **Umlegen, bevor gemessen wird** — Drehung (x, y, z) in Bogenmaß um die
   * Mitte des Modells. Das Messer kommt im Baukasten stehend und liegt auf
   * dem Brett (`kitchenFit`, `PieceStack.tilt`).
   */
  readonly tilt?: readonly [number, number, number];
  /**
   * Auf diese Höhe gebracht, in Metern — gleichmäßig in allen Richtungen und
   * so, wie die Datei steht, also **vor** `tilt` (der Portionierer ist 30 cm
   * lang und liegt dann).
   */
  readonly height?: number;
  /** Oder um diesen Faktor, zusätzlich zum Maßstab des Regals. `height` geht vor. */
  readonly scale?: number;
  /**
   * **Hier wird abgelegt** — die Oberkante dieses Teils ist `PlacedElement.top`.
   * Ohne Angabe ist es das erste Teil: die Platte, der Herd, die Kiste.
   */
  readonly surface?: boolean;
}

/** **Ein Spielelement** — zusammengesetzt, mit Grundfläche, Körper und Zweck. */
export interface GameElement {
  /** Der Name, unter dem Welten es hinstellen (`ElementSpot.element`). */
  readonly id: string;
  /** Wie es auf Deutsch heißt. */
  readonly label: string;
  /**
   * **Die Grundfläche in Kacheln**, Breite × Tiefe, für ein Element, das nach
   * Süden schaut. Eine Kachel ist ein Meter und 2 × 2 Zellen. Das Band ist
   * `[1, 2]`: eine breit, zwei lang in seiner Laufrichtung.
   */
  readonly tiles: readonly [number, number];
  /**
   * **Wie hoch sein Körper ist** — nicht, wie hoch das Modell ist. Möbel
   * stehen auf 1,40 m (`GridWorld.SOLID_BLOCK_HEIGHT`), damit niemand
   * hinaufspringt; das Band liegt flach.
   */
  readonly height: number;
  /** Was man damit tut — `null`: Es steht nur im Weg (Tisch, Stuhl, Band). */
  readonly kind: ElementKind | null;
  /** Bei einem Brett: was darauf passiert. Ohne Angabe schneidet es. */
  readonly work?: ElementWork;
  /**
   * **Was eine Kiste oder ein Stapel hergibt**, wenn die Stelle nichts sagt —
   * ein Vorschlag. Die Stelle gewinnt (`ElementSpot.gives`): Welche Dinge es
   * gibt, bestimmt die Küche (`kitchenRecipes.KitchenItem`), und die Kiste
   * Rindfleisch ist mal ein Patty und mal ein Steak.
   */
  readonly gives?: string;
  /** Die Modelle, das erste steht auf dem Boden. */
  readonly parts: readonly ElementPart[];
}

/** Eine Adresse aus _Restaurant Bits_. */
export function bits(name: string): string {
  return `restaurant-bits/${name}.glb`;
}

/** So hoch ist der Körper eines Möbels — über 1,40 m springt niemand. */
const BODY = 1.4;

/**
 * **Wie groß eine Eiswanne steht**: 0,66 m wie im Burgerladen
 * (`plateUpIceView.CORNER_SIZE.tub`), von 0,80 m im Paket.
 */
const TUB_SCALE = 0.66 / 0.8;

/** Die Arbeitsplatte, auf der fast alles steht. */
const COUNTER = bits('kitchencounter_straight_A');

/** Ein Möbel auf einer Kachel. */
function piece(
  id: string,
  label: string,
  kind: ElementKind | null,
  parts: readonly ElementPart[],
  extra: Partial<Pick<GameElement, 'work' | 'gives' | 'tiles' | 'height'>> = {},
): GameElement {
  return { id, label, tiles: [1, 1], height: BODY, kind, parts, ...extra };
}

/**
 * **Eine Vorratskiste** — die Kiste mit ihrem Inhalt obenauf, eine Datei.
 *
 * **Ohne Deckel in der Liste**: Den stellt der Lader unter jede Kiste aus
 * diesem Paket von selbst (`core/kaykitCrate.kaykitPlinth`) — hier noch einmal
 * `crate_lid` hinzuschreiben hieße zwei Deckel, und die Kiste stünde zehn
 * Zentimeter über der Zeile daneben.
 *
 * @param file der Dateiname ohne Paket und Endung, etwa `'crate_buns'`
 */
export function crate(id: string, file: string, gives: string, label: string): GameElement {
  return piece(id, label, 'crate', [{ model: bits(file) }], { gives });
}

/** Die Kisten des Pakets, je eine Zutat. */
const CRATES: readonly GameElement[] = [
  crate('crate-buns', 'crate_buns', 'bun', 'Brötchenkiste'),
  // Rindfleisch: in der Burgerküche das Patty (`kitchenFit`, `crate-patty`).
  crate('crate-steak', 'crate_steak', 'patty', 'Fleischkiste'),
  crate('crate-lettuce', 'crate_lettuce', 'lettuce', 'Salatkiste'),
  crate('crate-tomatoes', 'crate_tomatoes', 'tomato', 'Tomatenkiste'),
  crate('crate-cheese', 'crate_cheese', 'cheese', 'Käsekiste'),
  crate('crate-ham', 'crate_ham', 'ham', 'Schinkenkiste'),
  crate('crate-dough', 'crate_dough', 'dough', 'Teigkiste'),
  crate('crate-carrots', 'crate_carrots', 'carrot', 'Karottenkiste'),
  crate('crate-potatoes', 'crate_potatoes', 'potato', 'Kartoffelkiste'),
  crate('crate-onions', 'crate_onions', 'onion', 'Zwiebelkiste'),
  crate('crate-pepperoni', 'crate_pepperoni', 'pepperoni', 'Salamikiste'),
  crate('crate-mushrooms', 'crate_mushrooms', 'mushroom', 'Pilzkiste'),
];

/**
 * **Der ganze Katalog.** Neue Elemente kommen hierher und nicht in eine Welt:
 * Was zwei Welten gleich hinstellen, soll gleich aussehen.
 */
export const ELEMENTS: readonly GameElement[] = [
  piece('counter', 'Arbeitsplatte', 'top', [{ model: COUNTER }]),
  // **Die Arbeitsplatte mit Schneidebrett** — gewünscht als ein gespeichertes
  // Element und nicht als Platte, auf die jede Welt selbst ein Brett legt.
  // Das Messer liegt flach (der Baukasten liefert es stehend) und quer, auf
  // der vorderen Hälfte des Bretts.
  piece(
    'board',
    'Schneidebrett',
    'board',
    [
      { model: bits('kitchencounter_straight_B') },
      { model: bits('cuttingboard'), stack: true, surface: true },
      {
        model: bits('knife'),
        stack: true,
        at: [0, 0.12],
        tilt: [Math.PI / 2, 0, 0],
        yaw: Math.PI / 2,
      },
    ],
    { work: 'chop' },
  ),
  // Der Teig wird ausgerollt, nicht geschnitten — dieselbe Station, eine
  // andere Arbeit. Das Nudelholz des Pakets ist 74 cm lang; auf 10 cm Dicke
  // gebracht, liegt es mit 34 cm auf einer Platte von einem Meter.
  piece(
    'rolling-board',
    'Nudelbrett',
    'board',
    [{ model: COUNTER }, { model: bits('rollingpin'), stack: true, height: 0.1 }],
    { work: 'roll' },
  ),
  ...CRATES,
  // **Die Pizza-Vorratsbox** — gewünscht: eine Kiste, aus der man eine ganze
  // Pizza nimmt. Die leere Kiste (`crate`, ihr Deckel kommt vom Lader) und
  // die fertige Pizza obenauf, damit man von oben sieht, was drin ist.
  piece(
    'pizza-supply',
    'Pizza-Vorratsbox',
    'crate',
    [
      { model: bits('crate') },
      { model: bits('food_pizza_pepperoni_plated'), stack: true, height: 0.12 },
    ],
    { gives: 'pizza' },
  ),
  // Der Herd mit Pfanne: Was man ablegt, liegt in der Pfanne — die Ablage ist
  // der Rost darunter (`kitchenFit.HOB_TOP`, dieselbe gemessene Oberkante).
  piece('stove', 'Herd', 'griddle', [
    { model: bits('stove_single') },
    { model: bits('pan_A'), stack: true },
  ]),
  piece('stove-pot', 'Herd mit Topf', 'pot', [
    { model: bits('stove_multi') },
    { model: bits('pot_A'), stack: true },
  ]),
  // So hoch wie im Burgerladen (`PlateUpWorld.addBinProp`): Der Eimer aus
  // _Block Bits_ ist 1,17 m, neben einer Platte von 0,50 m ein Silo.
  piece('bin', 'Mülleimer', 'bin', [{ model: 'block-bits/trashcan.glb', height: 0.55 }]),
  piece(
    'plate-stack',
    'Tellerstapel',
    'drain',
    [{ model: COUNTER }, { model: bits('dishrack_plates'), stack: true }],
    { gives: 'plate' },
  ),
  piece(
    'bowl-stack',
    'Schüsselstapel',
    'drain',
    [
      { model: COUNTER },
      { model: bits('bowl'), stack: true },
      { model: bits('bowl'), stack: true },
    ],
    { gives: 'bowl' },
  ),
  piece(
    'pizzabox-stack',
    'Kartonstapel',
    'drain',
    [{ model: COUNTER }, { model: bits('pizzabox_stacked'), stack: true }],
    { gives: 'pizzabox' },
  ),
  // **Die Eisecke, wie im Burgerladen** (`plateUpIceView.place`), nur nach
  // Süden gedreht: Dort schaut die Platte nach +x, der Stapel steht bei
  // (0,05 | −0,22), der Portionierer bei (0,08 | 0,20). Eine Vierteldrehung
  // später, mit der Vorderseite nach +z, sind das (0,22 | 0,05) und
  // (−0,20 | 0,08). Der Portionierer liegt längs, die Schale zum Stapel hin.
  piece('ice-stand', 'Eisstand', 'ice-stand', [
    { model: COUNTER },
    { model: bits('icecream_cone_stacked'), on: 0, at: [0.22, 0.05], height: 0.5 },
    {
      model: bits('icecream_scoop'),
      on: 0,
      at: [-0.2, 0.08],
      height: 0.3,
      tilt: [-Math.PI / 2, 0, 0],
      yaw: -Math.PI / 2,
    },
  ]),
  // Zwei Wannen nebeneinander, quer zur Platte (von vorn nach hinten), je
  // 0,66 m lang wie im Burgerladen (`CORNER_SIZE.tub`): Der Kasten ist im
  // Paket 0,80 m lang, also 0,825 — und das Eis darin mit demselben Faktor,
  // sonst sitzt es nicht mehr darin.
  piece('ice-tubs', 'Eiswannen', 'ice-tubs', [
    { model: COUNTER },
    { model: bits('icecream_container'), on: 0, at: [-0.23, 0], scale: TUB_SCALE },
    { model: bits('icecream_container_icecream_vanilla'), inside: true },
    { model: bits('icecream_container'), on: 0, at: [0.23, 0], scale: TUB_SCALE },
    { model: bits('icecream_container_icecream_strawberry'), inside: true },
  ]),
  // **Das Band** — 1,1 × 2,0 m aus _Platformer_, Laufrichtung längs. Die
  // Pfeile der Datei zeigen nach Norden; eine halbe Drehung, und sie zeigen
  // dorthin, wohin das Element schaut. Flach und ohne Station: Was darauf
  // fährt, regelt die Welt (`testrestaurant/burgerBelt.ts`).
  {
    id: 'belt',
    label: 'Förderband',
    tiles: [1, 2],
    height: 0.5,
    kind: null,
    parts: [{ model: 'platformer/yellow/conveyor_2x4x1_yellow.glb', yaw: Math.PI }],
  },
  // **Die Vorratsbox für fertiges Essen** (`testrestaurant/guestWishes.MENU`)
  // — die leere Kiste der Pizza-Vorratsbox, aber ohne Zweck: Was obenauf
  // liegt und was `A` daran tut, ist je Gericht verschieden und Sache der
  // Welt. Das Element sorgt nur dafür, dass sie steht und im Weg ist.
  piece('supply-box', 'Vorratsbox', null, [{ model: bits('crate') }]),
  // **Der Pizzaofen** — in der Schauküche der Pizza, zum Ansehen.
  piece('pizza-oven', 'Pizzaofen', null, [{ model: bits('pizza_oven') }]),
  // Der Tisch des Test Restaurants (`TestRestaurantWorld.TABLE_MODEL`):
  // rund, 1,5 m, auf 2 × 2 Kacheln.
  {
    id: 'table-round',
    label: 'Runder Tisch',
    tiles: [2, 2],
    height: BODY,
    kind: null,
    parts: [{ model: bits('table_round_B_tablecloth_red') }],
  },
  piece('chair', 'Stuhl', null, [{ model: bits('chair_A') }]),
];

/** Die Elemente nach Namen. */
const BY_ID = new Map(ELEMENTS.map((element) => [element.id, element]));

/**
 * **Ein Element nach seinem Namen** — ein Tippfehler in einem Plan ist ein
 * Fehler beim Aufbau und kein leerer Fleck in der Welt.
 */
export function elementById(id: string): GameElement {
  const element = BY_ID.get(id);
  if (!element) throw new Error(`Unbekanntes Spielelement: ${id}`);
  return element;
}

/** Ob es ein Element dieses Namens gibt. */
export function hasElement(id: string): boolean {
  return BY_ID.has(id);
}
