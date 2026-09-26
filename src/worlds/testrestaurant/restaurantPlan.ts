import { GridPlan } from '../grid/gridPlan';

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
 * **Reine Rechnung, ohne Szene**: wo was steht. Die Welt stellt es hin
 * (`TestRestaurantWorld`), ein Test rechnet nach, dass nichts übereinander
 * steht und jede Datei im Regal liegt (`restaurantPlan.test.ts`).
 *
 * **Alles aus dem Regal** (`public/models/kaykit/`): Möbel und Zutaten aus
 * _Restaurant Bits_, das Band aus _Platformer_, Kekse und Kakao aus _Holiday
 * Bits_. Keine gebauten Klötze.
 */

/** Eine Datei aus _Restaurant Bits_. */
export function bits(name: string): string {
  return `restaurant-bits/${name}.glb`;
}

/**
 * **Ein Platz in der Reihe einer Mini-Küche**: das Möbel auf dem Boden
 * (`base`) und was obenauf liegt (`items`).
 *
 * `stack` legt die Dinge **aufeinander** statt nebeneinander — die Pfanne auf
 * den Herd und das Patty in die Pfanne, den Burger auf den Teller.
 */
export interface KitchenSlot {
  readonly base: string;
  readonly items?: readonly string[];
  readonly stack?: boolean;
}

/** Eine Mini-Küche: ein Gericht, sein Rezept und eine Reihe Möbel. */
export interface MiniKitchen {
  readonly id: string;
  readonly title: string;
  /** Die Schritte des Rezepts, so wie sie auf der Tafel stehen. */
  readonly recipe: readonly string[];
  /** Was das Regal nicht hat, und was stattdessen dasteht. */
  readonly missing?: string;
  /** Von West nach Ost, jede eine Kachel breit. */
  readonly slots: readonly KitchenSlot[];
}

const COUNTER = bits('kitchencounter_straight_A');
const BOARD = bits('kitchencounter_straight_B');

/** Eine Arbeitsplatte mit Dingen darauf. */
function top(...items: string[]): KitchenSlot {
  return { base: COUNTER, items: items.map(bits) };
}

/** Eine Arbeitsplatte mit Schneidebrett und Messer und dem, was darauf wartet. */
function board(item: string): KitchenSlot {
  return { base: BOARD, items: ['cuttingboard', 'knife', item].map(bits) };
}

/** Eine Vorratskiste — sie steht allein, auf ihr liegt nichts. */
function crate(name: string): KitchenSlot {
  return { base: bits(`crate_${name}`) };
}

/** Ein Möbel mit Dingen aufeinander: Pfanne auf dem Herd, Burger auf dem Teller. */
function stacked(base: string, ...items: string[]): KitchenSlot {
  return { base: bits(base), items: items.map(bits), stack: true };
}

/** Eine Arbeitsplatte, auf der Dinge aufeinander liegen. */
function plated(...items: string[]): KitchenSlot {
  return { base: COUNTER, items: items.map(bits), stack: true };
}

/**
 * **Die Mini-Küchen** — je Gericht eine Reihe, von den Kisten links bis zum
 * fertigen Teller rechts. So liest man das Rezept im Vorbeigehen ab.
 */
export const KITCHENS: readonly MiniKitchen[] = [
  {
    id: 'burger',
    title: 'Burger',
    recipe: [
      'Brötchen, Fleisch, Salat, Tomate, Käse aus den Kisten',
      'Salat, Tomate, Käse auf dem Brett schneiden',
      'Patty in der Pfanne auf dem Herd braten',
      'Auf dem Teller stapeln: Brötchen, Patty, Belag, Deckel',
    ],
    slots: [
      crate('buns'),
      crate('steak'),
      crate('lettuce'),
      crate('tomatoes'),
      crate('cheese'),
      board('food_ingredient_lettuce'),
      top(
        'food_ingredient_lettuce_slice',
        'food_ingredient_tomato_slice',
        'food_ingredient_cheese_slice',
      ),
      stacked('stove_single', 'pan_A', 'food_ingredient_burger_cooked'),
      top(
        'food_ingredient_bun_bottom',
        'food_ingredient_burger_uncooked',
        'food_ingredient_bun_top',
      ),
      plated('plate', 'food_burger'),
    ],
  },
  {
    id: 'eis',
    title: 'Eis',
    recipe: [
      'Hörnchen vom Stapel nehmen',
      'Mit dem Portionierer eine Kugel aus der Wanne',
      'Vanille, Erdbeere, Schokolade — oder Softeis aus der Maschine',
      'Obendrauf: Kirsche, Keksstange, Waffel',
    ],
    slots: [
      top('icecream_cone_stacked', 'icecream_scoop'),
      top('icecream_container_icecream_vanilla'),
      top('icecream_container_icecream_strawberry'),
      top('icecream_container_icecream_chocolate'),
      top('icecream_cherry', 'icecream_cookiestick', 'icecream_waffle'),
      top('icecream_machine'),
      top(
        'icecream_softserve_icecream_vanilla',
        'icecream_softserve_icecream_strawberry',
        'icecream_softserve_icecream_chocolate',
      ),
      top(
        'food_icecream_cone_vanilla',
        'food_icecream_cone_strawberry',
        'food_icecream_cone_chocolate',
      ),
    ],
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
    slots: [
      crate('dough'),
      crate('tomatoes'),
      crate('cheese'),
      crate('pepperoni'),
      crate('mushrooms'),
      top('rollingpin', 'food_ingredient_dough', 'food_ingredient_dough_base'),
      top('food_ingredient_tomato_sauce', 'food_ingredient_cheese_grated'),
      board('food_ingredient_pepperoni_slices'),
      top('food_ingredient_mushroom_pieces'),
      { base: bits('pizza_oven') },
      top('food_pizza_pepperoni_plated'),
      top('food_pizza_cheese_slice', 'food_pizza_mushroom_slice', 'food_pizza_pepperoni_slice'),
    ],
  },
  {
    id: 'pizza-to-go',
    title: 'Pizza to Go',
    recipe: [
      'Karton vom Stapel nehmen und aufklappen',
      'Die fertige Pizza aus dem Ofen hineinlegen',
      'Zuklappen und für die Abholung stapeln',
    ],
    slots: [
      top('pizzabox_stacked'),
      top('pizzabox_open'),
      top('food_pizza_mushroom_plated'),
      top('pizzabox_closed'),
      plated('pizzabox_closed', 'pizzabox_closed'),
    ],
  },
  {
    id: 'suppe',
    title: 'Suppe (Eintopf)',
    recipe: [
      'Karotten, Kartoffeln, Zwiebeln aus den Kisten',
      'Auf dem Brett klein schneiden',
      'Im Topf auf dem Herd köcheln lassen',
      'Mit dem Löffel in Schüsseln verteilen',
    ],
    missing: 'Keine Kelle — der Löffel springt ein. Kein Lauch.',
    slots: [
      crate('carrots'),
      crate('potatoes'),
      crate('onions'),
      board('food_ingredient_carrot'),
      top(
        'food_ingredient_carrot_chopped',
        'food_ingredient_potato_chopped',
        'food_ingredient_onion_chopped',
      ),
      { base: bits('stove_multi'), items: [bits('pot_A_stew'), bits('stew_pot')] },
      top('bowl', 'bowl_small', 'spoon'),
      top('stew_bowl', 'food_stew'),
    ],
  },
  {
    id: 'waffeln',
    title: 'Waffeln & Nachtisch',
    recipe: [
      'Teig aus der Kiste',
      'Im Waffeleisen backen',
      'In der Schale mit Eis, Kirschen und Keksstangen anrichten',
      'Dazu Kekse und heiße Schokolade',
    ],
    missing:
      'Kein Waffeleisen und keine einzelne Waffel — die Kochplatte steht dafür, die Eiswaffel ist die Waffel. Kein Kuchen, kein Donut.',
    slots: [
      crate('dough'),
      stacked('kitchencounter_straight_A', 'stove_single_countertop', 'icecream_waffle'),
      top('icecream_waffle', 'icecream_bowl_waffles'),
      top('icecream_cherry', 'icecream_cookiestick', 'icecream_bowl'),
      top('icecream_bowl_decorated_A', 'icecream_bowl_decorated_B'),
      {
        base: COUNTER,
        items: ['holiday-bits/cookie.glb', 'holiday-bits/hot_chocolate_decorated.glb'],
      },
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
    slots: [
      crate('steak'),
      board('food_ingredient_steak'),
      stacked('stove_single', 'pan_B', 'food_ingredient_steak'),
      top('food_ingredient_steak_pieces'),
      crate('potatoes'),
      top('food_ingredient_potato_mashed'),
      plated('plate', 'food_dinner'),
    ],
  },
  {
    id: 'schinken',
    title: 'Schinken',
    recipe: [
      'Schinken aus der Kiste',
      'In der Pfanne anbraten — nicht zu lange, sonst verbrennt er',
      'Auf den Teller',
    ],
    slots: [
      crate('ham'),
      top('food_ingredient_ham'),
      stacked('stove_single', 'pan_A', 'food_ingredient_ham_cooked'),
      top('food_ingredient_ham_trash'),
      plated('plate', 'food_ingredient_ham_cooked'),
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
      'Keine Fritteuse, kein Frittierkorb und keine Pommes im Regal — der große Topf auf dem Herd frittiert, die geschnittenen Kartoffeln sind die Pommes.',
    slots: [
      crate('potatoes'),
      board('food_ingredient_potato'),
      top('food_ingredient_potato_chopped'),
      stacked('stove_multi', 'pot_large'),
      plated('plate', 'food_ingredient_potato_chopped'),
      top('ketchup', 'mustard'),
    ],
  },
];

/** Wie breit eine Reihe von Küchen höchstens wird, in Kacheln. */
export const ROW_WIDTH = 34;
/** Zwischen zwei Küchen einer Reihe bleibt so viel frei. */
export const KITCHEN_GAP = 2;
/** Von einer Reihe zur nächsten: die Möbel, davor Platz zum Stehen. */
export const ROW_PITCH = 6;

/** Wo eine Küche steht: die Kachel ihres westlichsten Möbels. */
export interface KitchenSpot {
  readonly kitchen: MiniKitchen;
  readonly x: number;
  readonly z: number;
}

/**
 * **Die Küchen in Reihen** — von West nach Ost, bis die Reihe voll ist, dann
 * die nächste südlich davon. Die Möbel stehen mit der Vorderseite nach Süden;
 * davor steht, wer zusieht.
 */
export function kitchenSpots(): KitchenSpot[] {
  const spots: KitchenSpot[] = [];
  let x = 0;
  let z = 0;
  for (const kitchen of KITCHENS) {
    const width = kitchen.slots.length;
    if (x > 0 && x + width > ROW_WIDTH) {
      x = 0;
      z += ROW_PITCH;
    }
    spots.push({ kitchen, x, z });
    x += width + KITCHEN_GAP;
  }
  return spots;
}

/** Die erste Reihe südlich der Küchen. */
function belowKitchens(): number {
  const spots = kitchenSpots();
  return Math.max(...spots.map((spot) => spot.z)) + ROW_PITCH;
}

// --- das Förderband ---------------------------------------------------------

/**
 * **Das Band** — eine gerade Linie von West nach Ost, aus Förderbändern des
 * _Platformer_-Pakets (`BELT_MODEL`: 1 × 2 m, 0,5 m hoch — so hoch wie eine
 * Arbeitsplatte). An ihrer Nordseite stehen die Stationen
 * (`burgerBelt.BELT_STATIONS`), am Ende eine Arbeitsplatte, auf der die
 * fertigen Burger ankommen.
 */
export const BELT_MODEL = 'platformer/yellow/conveyor_2x4x1_yellow.glb';
/** Wie lang ein Stück Band ist, in Kacheln. */
export const BELT_PIECE = 2;
/** Wie viele Stücke hintereinander liegen. */
export const BELT_PIECES = 6;

export function beltSpot(): { x: number; z: number; length: number } {
  return { x: 0, z: belowKitchens() + 1, length: BELT_PIECE * BELT_PIECES };
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

/** Der Plan der Welt: nur Boden — alles andere sind Stücke aus dem Regal. */
export function restaurantPlan(): GridPlan {
  const plan = new GridPlan([0]);
  plan.floor(ground());
  return plan;
}

/**
 * **Welche Kacheln die Möbel belegen** — jede Kachel höchstens einmal
 * (`restaurantPlan.test.ts`). Ein Tisch nimmt 2 × 2, ein Stuhl eine.
 */
export function occupiedTiles(): string[] {
  const out: string[] = [];
  for (const { kitchen, x, z } of kitchenSpots())
    kitchen.slots.forEach((_, i) => out.push(`${x + i},${z}`));
  const belt = beltSpot();
  for (let i = 0; i < belt.length; i++) out.push(`${belt.x + i},${belt.z}`);
  for (const t of diningTables()) {
    for (const dx of [-1, 0]) for (const dz of [-1, 0]) out.push(`${t.x + dx},${t.z + dz}`);
    for (const seat of t.seats) out.push(`${Math.floor(seat.x)},${Math.floor(seat.z)}`);
  }
  for (const spot of supplySpots(5)) out.push(`${spot.x},${spot.z}`);
  return out;
}
