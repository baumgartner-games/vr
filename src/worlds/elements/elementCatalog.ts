import type { StationKind } from '../test/zones/kitchenCarry';
import type { KitchenItem } from '../test/zones/kitchenRecipes';

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
 * Station mit Anbauten (`PlateUpWorld.addStationView`), im ersten Test
 * Restaurant als Zeile aus `base` und `items` — dreimal dieselbe
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
 * (`kitchenCarry.StationKind`) und `'ice-tubs'`: zwei Wannen auf einer
 * Platte, also zwei Stationen (`stationLayer.elementStations`).
 */
export type ElementKind = StationKind | 'ice-tubs';

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
  /**
   * **So tief unter der Oberkante dessen, worauf es steht**, in Metern — für
   * etwas, das **in** einer offenen Kiste liegt und nicht auf ihrem Rand: die
   * Teller in der Tellerkiste.
   */
  readonly sink?: number;
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
   * Süden schaut. Eine Kachel ist ein Meter und 2 × 2 Zellen. Fast alles ist
   * `[1, 1]`, auch das Band; der runde Tisch ist `[2, 2]`.
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
  /**
   * **Was zu Beginn darauf steht und mitgenommen werden kann** — der Topf auf
   * dem Herd (`stove-pot`), wie `core/kitchenFit.KitchenPiece.holds` in der
   * Küche der Testwelt. Es ist **kein Teil** des Bilds: Die Station zeigt es
   * als das, was auf ihr liegt (`stationLayer.StationSlot.holds`), und wer es
   * nimmt, nimmt es mit — zur Spüle etwa, um es zu füllen.
   */
  readonly holds?: KitchenItem;
  /**
   * **Ob das Möbel selbst den Saum bekommt** — ohne Angabe jedes Element mit
   * Zweck (`elementLit`).
   *
   * Der gelbe Saum für `A` (`core/highlight.ts`) zeigt, was ein Druck meint:
   * beim Nehmen das, was darauf liegt (die Pfanne, der Teller), sonst **das
   * Möbel** — die Kiste samt Gemüse, der Mülleimer, die Arbeitsplatte, auf die
   * man ablegt, das Brett, auf dem geschnitten wird. Gewünscht: _„Die
   * vorratskisten mit den Gemüse müssen alle noch Highlighting bekommen, wie
   * bei der Pfanne, also Kiste und das Gemüse darin"_, _„Der Mülleimer soll
   * auch gehighlighted werden können"_ und _„Beim ablegen eines Gegenstands
   * soll z.B. die Arbeitsfläche gehighlithed sein"_.
   *
   * Dafür steht auch das erste Teil nur als Bild da (nicht als Stück der Welt,
   * den Körper hat ohnehin der Kasten), und die Stationsschicht hängt alle
   * Teile unter den Anker ihrer Station (`StationLayer.add`) — nur bei einem
   * Element mit genau einer Station. `false`: Das Möbel leuchtet nie.
   */
  readonly lit?: boolean;
  /**
   * **Ein Abtropfgitter wie in der Sandbox** — höchstens vier Teller
   * (`kitchenCarry.CLEAN_STACK_MAX`), zu Beginn voll, und wer einen
   * zurückstellt, stellt ihn in ein freies Fach. Die Station zeigt die Teller
   * einzeln in den Fächern (`core/kitchenFit.RACK_SLOTS`); das Modell ist das
   * leere Gitter. Ohne Angabe wird ein Stapel nie leer (`stock: Infinity`).
   */
  readonly rack?: boolean;
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
  extra: Partial<
    Pick<GameElement, 'work' | 'gives' | 'holds' | 'tiles' | 'height' | 'lit' | 'rack'>
  > = {},
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
 * **Und sie leuchtet ganz** (`elementLit`): Kiste und Inhalt bekommen den
 * Saum, wie die Pfanne auf dem Herd.
 *
 * @param file der Dateiname ohne Paket und Endung, etwa `'crate_buns'`
 */
export function crate(id: string, file: string, gives: string, label: string): GameElement {
  return piece(id, label, 'crate', [{ model: bits(file) }], { gives });
}

/**
 * **Was eine Kiste zeigt, die Küche aber nicht kennt** — Salami und Pilze
 * haben kein `KitchenItem`. Solche Kisten stehen nur zum Ansehen da (in der
 * Schauküche); in einer spielbaren Küche werden sie keine Station
 * (`stationLayer.elementStations`). `elementCatalog.test.ts` sieht nach, dass
 * jedes andere `gives` ein Ding der Küche ist.
 */
export const SHOW_ONLY_GIVES: ReadonlySet<string> = new Set(['pepperoni', 'mushroom']);

/** Die Tellerkiste: die leere Kiste, darin sechs Teller, jeder verdreht. */
function plateCrate(): ElementPart[] {
  const twist = (13 * Math.PI) / 180;
  const plates = Array.from({ length: 6 }, (_, i): ElementPart => ({
    model: bits('plate'),
    ...(i === 0 ? { on: 0, sink: 0.35 } : { stack: true }),
    yaw: i * twist,
  }));
  return [{ model: bits('crate') }, ...plates];
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
  // **Die Tellerkiste** — gewünscht: _„Es fehlt mir noch das Möbel Stück
  // vorratskiste mit Tellern (aus der unendlich viele kommen können)"_. Wie
  // die Tellerkiste der Sandbox (`core/kitchenFit`, `plate-counter`): eine
  // Kiste, aus der Teller kommen und die nie leer wird — anders als das
  // Abtropfgitter (`plate-stack`), das höchstens vier hält.
  //
  // **Ein Stapel Teller in der Kiste** und nicht einer auf dem Rand —
  // gemeldet: _„Bei den Teller vorratskiste sollten ein paar mehr Teller schon
  // drin sein. So sieht es aus als wenn der Teller schwebt."_ Sechs wie in der
  // Sandbox: Der Boden der Kiste liegt 5 cm über ihrem Fuß, der Rand 0,40 m
  // darüber; die Teller (je 5 cm) fangen also 0,35 m unter dem Rand an und
  // bleiben mit dem sechsten darunter. Jeder liegt 13° gegen den vorigen
  // verdreht (`kitchenProps.DIRTY_TWIST`), sonst sähe man von oben einen.
  piece('crate-plates', 'Tellerkiste', 'crate', plateCrate(), { gives: 'plate' }),
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
    'Arbeitsplatte mit Schneidebrett',
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
  // **Der Herd mit Pfanne, wie in der Küche der Sandbox** (`kitchenFit`,
  // `stove-pan`): Die Pfanne ist **kein Teil**, sondern steht zu Beginn darauf
  // (`holds`) und geht mit, wie der Topf auf `stove-pot`. Gemeldet: _„man kann
  // die Pfanne nicht vom Herd nehmen"_ — vorher lag hier eine Pfanne aus dem
  // Regal als Bild auf einer Grillplatte. Was in der Pfanne auf dem Herd liegt,
  // brät (`plateUpStations.tickStation`), und sie ist die der Sandbox
  // (`itemModels.KITCHEN_PAN`).
  piece('stove', 'Herdplatte mit Pfanne', 'stove', [{ model: bits('stove_single') }], {
    holds: 'pan',
  }),
  // **Der Herd mit Topf, wie im Restaurant** — gewünscht: _„Der Herd daneben
  // soll der Herd aus der Restaurant Welt sein und nicht der mit den 4 Platten
  // drauf. Der Topf darauf soll auch der sein aus der Restaurant Welt."_ Also
  // der einflammige Herd und der Topf `pot_A`, wie im Restaurant und in der
  // Küche der Testwelt (`kitchenFit`, `stove-pot`). Der Topf ist **kein Teil**,
  // sondern steht zu Beginn darauf (`holds`): Man nimmt ihn mit zur Spüle
  // (_„Es fehlt noch ein Waschbecken wo ich den Topf vollmachen kann"_), und
  // mit Wasser auf dem Herd kocht er, was man hineintut
  // (`kitchenRecipes.potCooks`) — Pommes aus geschnittenen Kartoffeln.
  piece('stove-pot', 'Herdplatte mit Topf', 'stove', [{ model: bits('stove_single') }], {
    holds: 'pot',
  }),
  // **Die blanke Herdplatte** — derselbe Herd, leer: kein Topf, keine Pfanne.
  // Gewünscht im Möbelkatalog neben „Herdplatte mit Pfanne" und „Herdplatte
  // mit Topf". Sie ist ein Herd für den Topf (`stove`): Wer einen Topf mit
  // Wasser daraufstellt, kocht darin wie auf dem Herd mit Topf.
  piece('hob', 'Herdplatte', 'stove', [{ model: bits('stove_single') }]),
  // **Die Spüle** — die Arbeitsplatte mit Becken und Hahn aus demselben Paket.
  // Wer den Topf davorhält, füllt ihn mit Wasser (`kitchenCarry.atSink`, die
  // Regel der Testküche).
  piece('sink', 'Waschbecken', 'sink', [{ model: bits('kitchencounter_sink') }]),
  // **Der Feuerlöscher auf der Arbeitsplatte** — gewünscht im Ordner
  // _Allgemein_ (_„Feuerlöscher (auf Arbeitsplatte)"_), wie in der Küche der
  // Sandbox (`kitchenFit`, `extinguisher`). Der Löscher ist **kein Teil**,
  // sondern steht zu Beginn darauf (`holds`) und geht mit, wie der Topf auf
  // dem Herd; sein Bild ist der Löscher der Wundertüte (`itemModels`).
  piece('extinguisher', 'Feuerlöscher', 'top', [{ model: COUNTER }], {
    holds: 'extinguisher',
  }),
  // So hoch wie im Burgerladen (`PlateUpWorld.addBinProp`): Der Eimer aus
  // _Block Bits_ ist 1,17 m, neben einer Platte von 0,50 m ein Silo.
  piece('bin', 'Mülleimer', 'bin', [{ model: 'block-bits/trashcan.glb', height: 0.55 }]),
  // **Die Arbeitsplatte mit Tellern ist ein Abtropfgitter wie in der Sandbox**
  // (`rack`, `core/kitchenFit`, `sink-drain`) — gewünscht: _„Die aktuelle
  // Arbeitsplatte mit Tellern soll hoffentlich genauso klappen wie in der
  // sandbox Welt dort, dass maximal 4 Teller darin gepackt werden können."_
  // Das leere Gitter (`dishrack`); die Teller darin zeigt die Station, einen
  // je Fach, so viele, wie gerade drinstehen. Nie leer wird die Tellerkiste
  // (`crate-plates`).
  piece(
    'plate-stack',
    'Tellerstapel',
    'drain',
    [{ model: COUNTER }, { model: bits('dishrack'), stack: true }],
    { gives: 'plate', rack: true },
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
  //
  // **Ein Vorrat** (_„die Arbeitsplatte mit dem scoop und cones … als
  // Vorräte"_): `A` gibt ein Hörnchen (`drain`, nie leer), an den Eiswannen
  // kommen Kugeln darauf, so viele man will — gezeichnet als Turm wie im
  // Restaurant (`plateUpIceView.IceConeView`).
  piece(
    'ice-stand',
    'Eisstand',
    'drain',
    [
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
    ],
    { gives: 'cone' },
  ),
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
  // **Das Band ist eine Kachel** — gewünscht: _„Statt 2x1 conveyers will ich
  // 1x1 conveyer belts haben."_ Das quadratische Band aus _Platformer_
  // (`conveyor_4x4x1_yellow`), das der Lader auf 1 × 1 × 0,5 m bringt
  // (`core/kaykitFit.KAYKIT_FILE_SCALE`). Die Pfeile der Datei zeigen nach
  // Norden; eine halbe Drehung, und sie zeigen dorthin, wohin das Element
  // schaut. Flach und ohne Station: Was darauf fährt, regelt die Welt.
  {
    id: 'belt',
    label: 'Förderband',
    tiles: [1, 1],
    height: 0.5,
    kind: null,
    parts: [{ model: 'platformer/yellow/conveyor_4x4x1_yellow.glb', yaw: Math.PI }],
  },
  // **Die Vorratsbox für fertiges Essen** — die leere Kiste der
  // Pizza-Vorratsbox, aber ohne Zweck: Was obenauf liegt und was `A` daran
  // tut, ist je Gericht verschieden und Sache der Welt. Das Element sorgt nur
  // dafür, dass sie steht und im Weg ist.
  piece('supply-box', 'Vorratsbox', null, [{ model: bits('crate') }]),
  // **Der Pizzaofen** — zum Ansehen, ohne Zweck.
  piece('pizza-oven', 'Pizzaofen', null, [{ model: bits('pizza_oven') }]),
  // Der runde Tisch mit roter Decke: 1,5 m, auf 2 × 2 Kacheln.
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

/**
 * **Der Möbelkatalog im Menü** — die Elemente, die man in einer Welt mit
 * Stationen selbst hinstellt (Menü _Möbel_, `PortalWorld.elementMenu`), in
 * dieser Reihenfolge. Gewünscht: _„Ich brauche bei Möbel Katalog, die
 * Funktion Möbel: eine Arbeitsplatte 2x2 nicht durchlaufen, Arbeitsplatte mit
 * Schneide Brett, Herdplatte mit Pfanne, Herdplatte mit Topf, Herdplatte.
 * Waschbecken"_ — und dazu _„die Arbeitsplatte mit dem scoop und cones und
 * die Platte mit ice trays als Vorräte"_. Dann die Vorräte (_„vorratskisten:
 * Salat, Käse, Wurst, Steak, Tomaten, Teller, Schüssel, Zwiebel, …"_): die
 * Kisten in der Reihenfolge des Wunsches — die Wurst ist der Schinken, das
 * Steak die Fleischkiste mit dem Patty —, Teller und Schüssel als Stapel,
 * danach der Rest, der in einer Küche etwas hergibt oder tut.
 *
 * **Salami und Pilze fehlen mit Absicht** (`SHOW_ONLY_GIVES`): Sie sind noch
 * keine Zutat der Küche und täten auf `A` nichts. Jedes Element hier sperrt
 * seine Kachel (2 × 2 Zellen) und tut auf `A`, was es in der Küche tut.
 */
export const FURNITURE_CATALOGUE: readonly string[] = [
  'counter',
  'board',
  'stove',
  'stove-pot',
  'hob',
  'sink',
  'ice-stand',
  'ice-tubs',
  'crate-lettuce',
  'crate-cheese',
  'crate-ham',
  'crate-steak',
  'crate-tomatoes',
  'plate-stack',
  'crate-plates',
  'bowl-stack',
  'crate-onions',
  'crate-buns',
  'crate-dough',
  'crate-carrots',
  'crate-potatoes',
  'pizza-supply',
  'pizzabox-stack',
  'rolling-board',
  'bin',
  'extinguisher',
];

/** **Ein Unterordner des Möbelkatalogs** — ein Gericht und was man dafür hinstellt. */
export interface FurnitureFolder {
  /** Eindeutig unter den Ordnern, etwa `'pizza'`. */
  readonly id: string;
  /** Der Name im Menü. */
  readonly label: string;
  /** Die Elemente darin, jedes auch in `FURNITURE_CATALOGUE`. */
  readonly elements: readonly string[];
}

/**
 * **Die Unterordner des Möbelkatalogs** — und seit dem zweiten Wunsch die
 * einzigen Einträge der Seite _Möbel_: vorn _Allgemein_, dann je Gericht die
 * Möbel, die man dafür braucht, in der Reihenfolge, in der man sie benutzt,
 * und zuletzt _Alles_ mit jedem Möbel der Küche.
 *
 * Gewünscht: _„In dem Menü Möbel will ich ggf einige Möbel doppelt gelistet
 * haben (sind aber die gleichen) nur weil ich in dem Ordner noch weiter
 * gruppieren will bzw. unterordner erstellen will: Pizza, Burger, Eis,
 * Waffeln, Suppe"_ — und danach: _„bei den unter Ordner die Arbeitsplatte
 * jeweils rein. Und die Möbel aus dem Restaurant Ordner dafür raus. Dafür
 * einen Ordner allgemein, in welchem dann Waschbecken, Mülleimer, und
 * Feuerlöscher (auf Arbeitsplatte) liegt. Bei dem Burger und Pizza noch die
 * Teller Vorrats Kiste rein. Im Restaurant Ordner noch einen Ordner „alles“ in
 * welchem dann alle Möbel die zur Küche gehören drin sind."_
 *
 * **Doppelt ist hier nur der Eintrag, nicht das Möbel**: Dieselbe Id steht in
 * mehreren Ordnern, und hingestellt wird jedes Mal dasselbe Element. Welche
 * Möbel zu einem Gericht gehören, sagt die Regel der Küche
 * (`elementFlows.test.ts` kocht jedes davon mit genau diesen Möbeln).
 */
export const FURNITURE_FOLDERS: readonly FurnitureFolder[] = [
  {
    id: 'general',
    label: 'Allgemein',
    elements: ['counter', 'sink', 'bin', 'extinguisher'],
  },
  {
    id: 'pizza',
    label: 'Pizza',
    elements: [
      'counter',
      'pizza-supply',
      'board',
      'pizzabox-stack',
      'plate-stack',
      'crate-plates',
      'bin',
    ],
  },
  {
    id: 'burger',
    label: 'Burger',
    elements: [
      'counter',
      'crate-buns',
      'crate-steak',
      'crate-lettuce',
      'crate-tomatoes',
      'crate-cheese',
      'crate-ham',
      'board',
      'stove',
      'plate-stack',
      'crate-plates',
      'bin',
    ],
  },
  { id: 'ice', label: 'Eis', elements: ['counter', 'ice-stand', 'bowl-stack', 'ice-tubs'] },
  {
    id: 'waffles',
    label: 'Waffeln',
    elements: ['counter', 'crate-dough', 'rolling-board', 'stove', 'bowl-stack', 'ice-tubs'],
  },
  {
    id: 'soup',
    label: 'Suppe',
    elements: [
      'counter',
      'crate-carrots',
      'crate-onions',
      'board',
      'stove-pot',
      'hob',
      'sink',
      'bowl-stack',
    ],
  },
  // **Alles, was zur Küche gehört** — die ganze Liste des Katalogs.
  { id: 'all', label: 'Alles', elements: FURNITURE_CATALOGUE },
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

/**
 * **Ob das Möbel selbst den Saum bekommen kann** (`GameElement.lit`) — ohne
 * Angabe jedes Element mit Zweck. Was nur im Weg steht (Tisch, Band), wird
 * nie gemeint und bleibt ein festes Stück der Welt.
 */
export function elementLit(element: GameElement): boolean {
  return element.lit ?? element.kind !== null;
}

/** Ob es ein Element dieses Namens gibt. */
export function hasElement(id: string): boolean {
  return BY_ID.has(id);
}
