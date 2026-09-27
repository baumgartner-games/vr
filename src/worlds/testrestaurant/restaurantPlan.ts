import { bits } from '../elements/elementCatalog';
import { spotTiles, type ElementSpot, type Face } from '../elements/elementPlace';
import { GridPlan } from '../grid/gridPlan';
import type { KitchenItem } from '../test/zones/kitchenRecipes';
import { BELT_STATIONS } from './burgerBelt';

/**
 * **Test Restaurant** — die zweite Welt im Ordner _Test_, neben der Test
 * Navigation. Ein Prüfstand zum Anschauen: Welche Stücke aus dem Regal gehören
 * zu welchem Gericht, und wie sieht eine Küche dafür aus?
 *
 * Gewünscht: _„eine Test Restaurant Welt … wo es für jede Gericht Art eine
 * kleine Mini Küche gibt. Also für Burger eben die Pfanne mit dem Herd, Teller,
 * Arbeitsplatte, Schneidebrett, Zutaten. Für das Eis ebenfalls die cones,
 * scope, und die Eis Sorten."_ Dazu neu: Pizza, Pizza zum Mitnehmen, Suppe,
 * Waffeln und Nachtisch, Steak, Schinken, Pommes — dafür erst überlegt, wie das
 * Rezept wäre und welche Utensilien das Regal hergibt (`KITCHENS`, und was
 * fehlt, steht in `missing`). Und dazu **ein Förderband, das einen Burger ganz
 * von allein baut** (`burgerBelt.ts`) und **Gäste an Tischen**, die in einer
 * Blase zeigen, was sie wollen (`guestWishes.ts`).
 *
 * **Alles steht als Spielelement da** (`elements/elementCatalog.ts`): Küchen,
 * Band, Tische, Stühle und Vorratsboxen sind Stellen (`ElementSpot`), keine
 * rohen Modelle — sie sperren ihre Zellen, man läuft nicht hindurch, und in
 * den spielbaren Küchen tut `A` an ihnen, was es im Restaurant tut
 * (`KitchenMode`).
 *
 * **Reine Rechnung, ohne Szene**: wo was steht. Die Welt stellt es hin
 * (`TestRestaurantWorld`), ein Test rechnet nach, dass nichts übereinander
 * steht, jede Datei im Regal liegt und jede spielbare Küche ihr Gericht
 * wirklich hergibt (`restaurantPlan.test.ts`, `restaurantKitchens.test.ts`).
 *
 * **Alles aus dem Regal** (`public/models/kaykit/`): Möbel und Zutaten aus
 * _Restaurant Bits_, das Band aus _Platformer_. Keine gebauten Klötze.
 */

/**
 * **Ein Platz in einer Reihe** — welches Spielelement dort steht
 * (`elements/elementCatalog.ELEMENTS`), und in der Schauküche, was obenauf
 * liegt.
 */
export interface KitchenPiece {
  /** Das Element, etwa `'board'` oder `'crate-steak'`. */
  readonly element: string;
  /** Was eine Kiste oder ein Stapel hier hergibt — schlägt das Element (`ElementSpot.gives`). */
  readonly gives?: KitchenItem;
  /** Wie es im Satz heißt — schlägt das Element (`ElementSpot.label`). */
  readonly label?: string;
  /** **Nur zum Ansehen**: was obenauf liegt, als Adressen im Regal. */
  readonly show?: readonly string[];
  /** `show` **aufeinander** statt nebeneinander — der Burger auf dem Teller. */
  readonly stack?: boolean;
}

/**
 * **Was eine Küche kann.**
 *
 * - `play`: **spielbar** — jede Kiste, jedes Brett, jeder Herd tut auf `A`,
 *   was er im Restaurant tut (`elements/stationLayer.ts`).
 * - `ice`: die **Eisecke** des Restaurants mit Hörnchen, Portionierer und
 *   Kugelturm (`plateup/plateUpIce.ts`, `plateUpIceView.IceCorner`).
 * - `show`: eine **Schauküche** — die Möbel stehen und sperren wie überall,
 *   obenauf liegt das Rezept zum Ansehen, und `A` tut dort nichts.
 */
export type KitchenMode = 'play' | 'ice' | 'show';

/** Eine Mini-Küche: ein Gericht, sein Rezept und eine oder zwei Reihen Spielelemente. */
export interface MiniKitchen {
  readonly id: string;
  readonly title: string;
  /** Die Schritte des Rezepts, so wie sie auf der Tafel stehen. */
  readonly recipe: readonly string[];
  /** Was das Regal nicht hat, und was stattdessen dasteht. */
  readonly missing?: string;
  readonly mode: KitchenMode;
  /**
   * **Die Reihen, von Nord nach Süd, jede von West nach Ost.**
   *
   * Die erste schaut nach Süden. Gibt es eine zweite, steht sie
   * gegenüber — einen Gang (`AISLE`) weiter südlich, mit der Vorderseite
   * nach Norden: _„unten horizontal die Vorräte, darüber horizontal das
   * Schneidebrett, eine Arbeitsplatte, ein Herd, ein Mülleimer und
   * Tellervorräte"_. Unten, von oben gesehen, ist Süden. Stünden die Kisten
   * einfach davor, käme niemand mehr an das Brett dahinter; so steht man im
   * Gang und hat beide Reihen eine halbe Armlänge vor sich.
   */
  readonly rows: readonly (readonly KitchenPiece[])[];
}

/** Ein Element aus dem Katalog, sonst nichts. */
function el(element: string, extra: Omit<KitchenPiece, 'element'> = {}): KitchenPiece {
  return { element, ...extra };
}

/** Ein Element mit etwas obenauf — nebeneinander. */
function shows(element: string, ...items: string[]): KitchenPiece {
  return { element, show: items.map(bits) };
}

/** Ein Element mit etwas obenauf — aufeinander. */
function stacked(element: string, ...items: string[]): KitchenPiece {
  return { element, show: items.map(bits), stack: true };
}

/**
 * **Die Mini-Küchen** — zuerst die spielbaren, dann die Eisecke, dann die
 * Schauküchen. Jede gebaut aus Spielelementen (`elements/elementCatalog`):
 * Sie sperren ihre Zellen, man läuft nicht hindurch und springt nicht
 * hinauf.
 */
export const KITCHENS: readonly MiniKitchen[] = [
  {
    id: 'burger',
    title: 'Burger',
    recipe: [
      'Brötchen, Fleisch, Salat, Tomate, Käse aus den Kisten',
      'Salat, Tomate, Käse auf dem Brett schneiden',
      'Das Patty auf dem Herd braten — nicht zu lange',
      'Teller vom Stapel, alles darauf: Brötchen, Patty, Belag',
    ],
    mode: 'play',
    rows: [
      [el('board'), el('counter'), el('stove'), el('bin'), el('plate-stack')],
      [
        el('crate-buns'),
        el('crate-steak', { gives: 'patty' }),
        el('crate-lettuce'),
        el('crate-tomatoes'),
        el('crate-cheese'),
      ],
    ],
  },
  {
    id: 'suppe',
    title: 'Suppe (Eintopf)',
    recipe: [
      'Karotten, Kartoffeln, Zwiebeln aus den Kisten',
      'Auf dem Brett klein schneiden',
      'In den Topf auf dem Herd — er kocht allein',
      'Eine Schüssel vom Stapel und die Suppe hinein',
    ],
    missing: 'Keine Kelle — die Schüssel holt die Suppe selbst. Kein Lauch.',
    mode: 'play',
    rows: [
      [el('board'), el('counter'), el('stove-pot'), el('bin'), el('bowl-stack')],
      [el('crate-carrots'), el('crate-potatoes'), el('crate-onions')],
    ],
  },
  {
    id: 'schinken',
    title: 'Schinken',
    recipe: [
      'Schinken aus der Kiste',
      'Auf dem Herd anbraten — nicht zu lange, sonst verbrennt er',
      'Auf die Arbeitsplatte, Verbranntes in den Müll',
    ],
    mode: 'play',
    rows: [[el('crate-ham'), el('stove'), el('counter'), el('bin')]],
  },
  {
    id: 'pizza-to-go',
    title: 'Pizza to Go',
    recipe: [
      'Eine fertige Pizza aus der Vorratsbox',
      'Auf dem Brett in Stücke schneiden',
      'Einen Karton vom Stapel — die Pizza hinein',
    ],
    mode: 'play',
    rows: [[el('pizza-supply'), el('board'), el('counter'), el('pizzabox-stack'), el('bin')]],
  },
  {
    id: 'waffeln',
    title: 'Waffeln mit Eis',
    recipe: [
      'Teig aus der Kiste, auf dem Nudelbrett ausrollen',
      'Auf dem Herd zur Waffel backen',
      'Eine Schüssel vom Stapel, die Waffel hinein',
      'Mit der Schüssel an die Wannen: Vanille und Erdbeere',
    ],
    missing:
      'Kein Waffeleisen und keine einzelne Waffel — der Herd backt, die Eiswaffel ist die Waffel. Kein Kuchen, kein Donut.',
    mode: 'play',
    rows: [
      [
        el('crate-dough'),
        el('rolling-board'),
        el('stove'),
        el('counter'),
        el('bowl-stack'),
        el('ice-tubs'),
        el('bin'),
      ],
    ],
  },
  {
    id: 'eis',
    title: 'Eis',
    recipe: [
      'Hörnchen und Portionierer vom Eisstand',
      'An die Wannen: eine Kugel Vanille, eine Erdbeere — so viele, wie halten',
      'Auf die Arbeitsplatte stellen oder in den Müll',
    ],
    missing: 'Keine Schokolade in der Wanne und kein Softeis — die Ecke ist die des Restaurants.',
    mode: 'ice',
    rows: [[el('ice-stand'), el('ice-tubs'), el('counter'), el('bin')]],
  },
  {
    id: 'pizza',
    title: 'Pizza',
    recipe: [
      'Teig aus der Kiste, mit dem Nudelholz zum Boden ausrollen',
      'Tomatensoße und geriebener Käse darauf',
      'Belag: Salami (Pepperoni) oder Pilze, geschnitten',
      'In den Pizzaofen — dann auf den Teller oder in Stücke',
    ],
    missing: 'Kein Pizzaschieber, keine Oliven, keine Paprika im Regal.',
    mode: 'show',
    rows: [
      [
        el('crate-dough'),
        el('crate-tomatoes'),
        el('crate-cheese'),
        el('crate-pepperoni'),
        el('crate-mushrooms'),
        shows('rolling-board', 'food_ingredient_dough', 'food_ingredient_dough_base'),
        shows('counter', 'food_ingredient_tomato_sauce', 'food_ingredient_cheese_grated'),
        shows('board', 'food_ingredient_pepperoni_slices'),
        shows('counter', 'food_ingredient_mushroom_pieces'),
        el('pizza-oven'),
        shows('counter', 'food_pizza_pepperoni_plated'),
        shows(
          'counter',
          'food_pizza_cheese_slice',
          'food_pizza_mushroom_slice',
          'food_pizza_pepperoni_slice',
        ),
      ],
    ],
  },
  {
    id: 'steak',
    title: 'Steak',
    recipe: [
      'Steak aus der Kiste',
      'In der Pfanne auf dem Herd anbraten',
      'Auf dem Brett in Streifen schneiden',
      'Mit Kartoffelbrei als Tellergericht',
    ],
    missing: 'Kein eigenes „gebratenes Steak" — die Streifen zeigen, dass es fertig ist.',
    mode: 'show',
    rows: [
      [
        el('crate-steak'),
        shows('board', 'food_ingredient_steak'),
        stacked('stove', 'food_ingredient_steak'),
        shows('counter', 'food_ingredient_steak_pieces'),
        el('crate-potatoes'),
        shows('counter', 'food_ingredient_potato_mashed'),
        stacked('counter', 'plate', 'food_dinner'),
      ],
    ],
  },
  {
    id: 'pommes',
    title: 'Pommes',
    recipe: [
      'Kartoffeln aus der Kiste',
      'Auf dem Brett in Stäbchen schneiden',
      'Im heißen Fett frittieren',
      'Auf den Teller, dazu Ketchup und Senf',
    ],
    missing:
      'Keine Fritteuse, kein Frittierkorb und keine Pommes im Regal — der Topf auf dem Herd frittiert, die geschnittenen Kartoffeln sind die Pommes.',
    mode: 'show',
    rows: [
      [
        el('crate-potatoes'),
        shows('board', 'food_ingredient_potato'),
        shows('counter', 'food_ingredient_potato_chopped'),
        el('stove-pot'),
        stacked('counter', 'plate', 'food_ingredient_potato_chopped'),
        shows('counter', 'ketchup', 'mustard'),
      ],
    ],
  },
];

/** Wie breit eine Reihe von Küchen höchstens wird, in Kacheln. */
export const ROW_WIDTH = 34;
/** Zwischen zwei Küchen einer Reihe bleibt so viel frei. */
export const KITCHEN_GAP = 2;
/**
 * **Der Gang zwischen den beiden Reihen einer Küche**, in Kacheln — eine,
 * also genau so breit wie die Figur (2 × 2 Zellen). Wer darin steht, hat die
 * Vorderkanten beider Reihen einen halben Meter vor sich (`NEAR_STATION` ist
 * 1,3 m).
 */
export const AISLE = 1;
/**
 * **Was nach der tiefsten Küche einer Reihe frei bleibt**, bis die nächste
 * Reihe beginnt: davor stehen, vorbeigehen, und Platz für die Tafeln.
 */
export const ROW_ROOM = 3;

/** Wie breit eine Küche ist: ihre längste Reihe. */
export function kitchenWidth(kitchen: MiniKitchen): number {
  return Math.max(...kitchen.rows.map((row) => row.length));
}

/** Wie tief eine Küche ist: eine Reihe, oder zwei mit dem Gang dazwischen. */
export function kitchenDepth(kitchen: MiniKitchen): number {
  return kitchen.rows.length > 1 ? 2 + AISLE : 1;
}

/** Wo eine Küche steht: die Nordwestecke ihrer ersten Reihe. */
export interface KitchenSpot {
  readonly kitchen: MiniKitchen;
  readonly x: number;
  readonly z: number;
}

/**
 * **Die Küchen in Reihen** — von West nach Ost, bis die Reihe voll ist, dann
 * die nächste südlich davon, hinter der tiefsten Küche der Reihe und
 * `ROW_ROOM` Kacheln Platz.
 */
export function kitchenSpots(): KitchenSpot[] {
  const spots: KitchenSpot[] = [];
  let x = 0;
  let z = 0;
  let deepest = 0;
  for (const kitchen of KITCHENS) {
    const width = kitchenWidth(kitchen);
    if (x > 0 && x + width > ROW_WIDTH) {
      x = 0;
      z += deepest + ROW_ROOM;
      deepest = 0;
    }
    spots.push({ kitchen, x, z });
    deepest = Math.max(deepest, kitchenDepth(kitchen));
    x += width + KITCHEN_GAP;
  }
  return spots;
}

/** Ein Element einer Küche — mit dem, was obenauf liegt, falls es eine Schauküche ist. */
export interface KitchenElement extends ElementSpot {
  readonly show?: readonly string[];
  readonly stack?: boolean;
}

/**
 * **Die Elemente einer Küche, an ihrem Platz in der Welt.** Die erste Reihe
 * schaut nach Süden, die zweite steht `AISLE` Kacheln weiter südlich und
 * schaut zurück.
 *
 * Die Namen sind `küche-element`, und steht dasselbe Element zweimal da,
 * zählt eine Nummer weiter (`pizza-counter`, `pizza-counter-2`).
 */
export function kitchenElements(spot: KitchenSpot): KitchenElement[] {
  const { kitchen } = spot;
  const out: KitchenElement[] = [];
  const seen = new Map<string, number>();
  kitchen.rows.forEach((row, r) => {
    row.forEach((piece, i) => {
      const n = (seen.get(piece.element) ?? 0) + 1;
      seen.set(piece.element, n);
      out.push({
        id: `${kitchen.id}-${piece.element}${n > 1 ? `-${n}` : ''}`,
        element: piece.element,
        x: spot.x + i,
        z: r === 0 ? spot.z : spot.z + 1 + AISLE,
        face: r === 0 ? 'S' : 'N',
        ...(piece.gives ? { gives: piece.gives } : {}),
        ...(piece.label ? { label: piece.label } : {}),
        ...(piece.show ? { show: piece.show } : {}),
        ...(piece.stack ? { stack: true } : {}),
      });
    });
  });
  return out;
}

/** Die Elemente der Eisecke — sie regelt die Eisecke selbst (`plateup/plateUpIce.ts`). */
export const ICE_CORNER: readonly string[] = ['ice-stand', 'ice-tubs'];

/**
 * **Welche Elemente einer Küche Stationen sind** — auf die `A` nach der Regel
 * des Restaurants antwortet (`elements/stationLayer.ts`). In einer
 * spielbaren Küche alle, in der Eis-Küche alle außer der Eisecke, in einer
 * Schauküche keines.
 */
export function stationElements(spot: KitchenSpot): KitchenElement[] {
  const { mode } = spot.kitchen;
  if (mode === 'show') return [];
  const all = kitchenElements(spot);
  return mode === 'ice' ? all.filter((one) => !ICE_CORNER.includes(one.element)) : all;
}

/** Die erste freie Reihe südlich der Küchen — nach der letzten und ihrem Platz davor. */
function belowKitchens(): number {
  const spots = kitchenSpots();
  const last = Math.max(...spots.map((spot) => spot.z));
  const deepest = Math.max(
    ...spots.filter((spot) => spot.z === last).map((spot) => kitchenDepth(spot.kitchen)),
  );
  return last + deepest + ROW_ROOM;
}

// --- das Förderband ---------------------------------------------------------

/** Wie lang ein Stück Band ist, in Kacheln (`belt`: `[1, 2]`). */
export const BELT_PIECE = 2;
/** Wie viele Stücke hintereinander liegen. */
export const BELT_PIECES = 6;

/**
 * **Das Band** — eine gerade Linie von West nach Ost, aus dem Spielelement
 * `belt` (_Platformer_, 1 × 2 m, 0,5 m hoch — so hoch wie eine Arbeitsplatte),
 * nach Osten gedreht. An seiner Nordseite stehen die Stationen
 * (`burgerBelt.BELT_STATIONS`, jede ein Element), am Ende eine
 * Arbeitsplatte, auf der die fertigen Burger ankommen.
 */
export function beltSpot(): { x: number; z: number; length: number } {
  return { x: 0, z: belowKitchens() + 1, length: BELT_PIECE * BELT_PIECES };
}

/** Die Stücke des Bands, von West nach Ost — mit den Pfeilen nach Osten. */
export function beltPieces(): ElementSpot[] {
  const belt = beltSpot();
  return Array.from({ length: BELT_PIECES }, (_, i) => ({
    id: `belt-${i + 1}`,
    element: 'belt',
    x: belt.x + BELT_PIECE * i,
    z: belt.z,
    face: 'E' as const,
  }));
}

/** Die Stationen an der Nordseite des Bands, mit der Vorderseite zum Band. */
export function beltStationSpots(): ElementSpot[] {
  const belt = beltSpot();
  return BELT_STATIONS.map((station) => ({
    id: `belt-station-${station.id}`,
    element: station.element,
    x: belt.x + Math.floor(station.at),
    z: belt.z - 1,
  }));
}

/** Die Arbeitsplatte am Ostende, auf der die fertigen Burger stehen. */
export function beltEndSpot(): ElementSpot {
  const belt = beltSpot();
  return { id: 'belt-end', element: 'counter', x: belt.x + belt.length, z: belt.z };
}

// --- der Gastraum -----------------------------------------------------------

/** Ein Stuhl: wo der Gast sitzt und wohin er schaut. */
export interface Seat {
  readonly x: number;
  readonly z: number;
  /** Die Blickrichtung: 0 schaut nach Süden (+z), wie im Restaurant. */
  readonly yaw: number;
}

/** Ein runder Tisch auf 2 × 2 Kacheln, drei Stühle darum. */
export interface DiningTable {
  readonly index: number;
  /** Die Mitte des Tischs, in Metern. */
  readonly x: number;
  readonly z: number;
  readonly seats: readonly Seat[];
}

/** Wie weit ein Stuhl von der Tischmitte steht, in Metern. */
export const SEAT_REACH = 1.05;

/**
 * **Drei Stühle je Tisch** — West, Nord, Ost. Der Süden bleibt frei: Dort
 * steht man, wenn man etwas bringt, und von dort schaut die Kamera her.
 */
function tableAt(index: number, x: number, z: number): DiningTable {
  const seat = (dx: number, dz: number): Seat => ({
    x: x + dx * SEAT_REACH,
    z: z + dz * SEAT_REACH,
    // Er schaut zur Tischmitte: gegen die Richtung, in der er sitzt.
    yaw: Math.atan2(-dx, -dz),
  });
  return { index, x, z, seats: [seat(-1, 0), seat(0, -1), seat(1, 0)] };
}

/** Das Band braucht nach Süden so viele Reihen, dann kommt der Gastraum. */
const BELT_DEPTH = 5;

/** Die Tische, östlich vom Band. */
export function diningTables(): DiningTable[] {
  const belt = beltSpot();
  const z = belt.z + BELT_DEPTH + 2;
  return [tableAt(0, 4, z), tableAt(1, 10, z)];
}

/** Wohin ein Stuhl schaut, als Himmelsrichtung — die Drehung auf Vierteldrehungen gerundet. */
function faceOfYaw(yaw: number): Face {
  const quarter = ((Math.round(yaw / (Math.PI / 2)) % 4) + 4) % 4;
  return (['S', 'E', 'N', 'W'] as const)[quarter]!;
}

/**
 * **Tische und Stühle als Spielelemente.** Der Tisch liegt mit seiner Mitte
 * auf einer Kachelecke (2 × 2 Kacheln); der Stuhl sperrt die Kachel, auf der
 * er zum größten Teil steht, und rückt im Bild dorthin, wo der Gast sitzt
 * (`ElementSpot.offset`).
 */
export function diningElements(): ElementSpot[] {
  const out: ElementSpot[] = [];
  for (const t of diningTables()) {
    out.push({ id: `table-${t.index + 1}`, element: 'table-round', x: t.x - 1, z: t.z - 1 });
    t.seats.forEach((seat, i) => {
      const x = Math.floor(seat.x);
      const z = Math.floor(seat.z);
      out.push({
        id: `table-${t.index + 1}-chair-${i + 1}`,
        element: 'chair',
        x,
        z,
        face: faceOfYaw(seat.yaw),
        offset: [seat.x - (x + 0.5), seat.z - (z + 0.5)],
      });
    });
  }
  return out;
}

/**
 * **Die Vorratsboxen** — je Gericht eine Kiste, aus der man ein fertiges
 * Essen nimmt und auf den Tisch stellt (`guestWishes.MENU`). Sie stehen in
 * einer Reihe südlich der Tische.
 */
export function supplySpots(count: number): { x: number; z: number }[] {
  const tables = diningTables();
  const z = Math.max(...tables.map((t) => t.z)) + 3;
  const spots: { x: number; z: number }[] = [];
  for (let i = 0; i < count; i++) spots.push({ x: 3 + i * 2, z });
  return spots;
}

/** Die Vorratsboxen als Spielelemente (`supply-box`) — sie stehen im Weg wie jede Kiste. */
export function supplyElements(ids: readonly string[]): ElementSpot[] {
  return supplySpots(ids.length).map((spot, i) => ({
    id: `supply-${ids[i]!}`,
    element: 'supply-box',
    x: spot.x,
    z: spot.z,
  }));
}

/** Der Boden: alles, was oben steht, und ein Rand darum. */
export function ground(): { x: number; z: number; w: number; d: number } {
  const back = supplySpots(1)[0]!.z;
  return { x: -3, z: -3, w: ROW_WIDTH + 6, d: back + 7 };
}

/** Wo man ankommt: zwischen Band und Tischen, mit Blick nach Norden auf die Küchen. */
export function spawn(): { x: number; z: number } {
  const belt = beltSpot();
  return { x: belt.length + 4.5, z: belt.z + 3.5 };
}

/** Der Plan der Welt: nur Boden — alles andere sind Spielelemente. */
export function restaurantPlan(): GridPlan {
  const plan = new GridPlan([0]);
  plan.floor(ground());
  return plan;
}

/**
 * **Alle Spielelemente der Welt** — Küchen, Band mit Stationen und Endplatte,
 * Tische und Stühle, Vorratsboxen. Was hier nicht steht, sperrt keine Zelle.
 *
 * @param supply die Gerichte der Vorratsboxen (`guestWishes.MENU`, ihre `id`)
 */
export function allElements(supply: readonly string[]): ElementSpot[] {
  return [
    ...kitchenSpots().flatMap(kitchenElements),
    ...beltPieces(),
    ...beltStationSpots(),
    beltEndSpot(),
    ...diningElements(),
    ...supplyElements(supply),
  ];
}

/**
 * **Welche Kacheln die Möbel belegen** — aus den Stellen selbst gerechnet
 * (`elementPlace.spotTiles`), jede Kachel höchstens einmal
 * (`restaurantPlan.test.ts`).
 */
export function occupiedTiles(supply: readonly string[]): string[] {
  return allElements(supply).flatMap(spotTiles);
}
