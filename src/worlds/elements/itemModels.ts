import { bits } from './elementCatalog';
import { STACK_ORDER, layered, type Dish, type KitchenItem } from '../test/zones/kitchenRecipes';

/**
 * **Wie die Dinge der Küche auf Spielelementen aussehen** — je `KitchenItem`
 * ein Stück aus dem Regal (`public/models/kaykit/restaurant-bits`). Ohne
 * three.js, ohne Laden: nur Pfade.
 *
 * Die Küche der Testwelt und der Laden (`worlds/plateup`) zeichnen ihre
 * Zutaten aus dem Diner-Baukasten (`test/zones/kitchenProps.FoodKit`), und
 * dabei bleibt es. Die Spielelemente bauen aus dem KayKit-Regal und bekommen
 * deshalb eine eigene Zuordnung — **dieselben Namen**, andere Netze. Die Regeln
 * dahinter (`kitchenCarry.kitchenDeed`) sind für beide dieselben; nur das Bild
 * unterscheidet sich, und das Bild ist diese eine Tabelle.
 *
 * **Ein leerer Pfad ist eine Antwort und keine Lücke.** Für die
 * Wasserpumpenzange und das Wasser hat das Regal kein Stück; die Welt
 * zeichnet sie anders oder gar nicht. Ein `''` sagt das ausdrücklich — ein
 * fehlender Eintrag wäre dagegen ein Übersetzerfehler (`Record` über alle
 * `KitchenItem`), und genau so soll es sein: Kommt ein Ding dazu, fragt der
 * Übersetzer hier nach seinem Bild.
 */

/**
 * **Die Pfanne der Sandbox-Küche** — kein Pfad im Regal, sondern der Aufsatz
 * des Möbels `stove-pan` aus `kitchen.glb` (`core/kitchenFit`). Wer die Bilder
 * lädt (`itemTemplate.loadItemModel`), erkennt diese Adresse und holt sie
 * dort.
 */
export const KITCHEN_PAN = 'kitchen:stove-pan';

/**
 * **Das Bild je Ding** — ein Pfad, oder mehrere, die zusammen das Ding sind.
 *
 * Mehrere Pfade heißen **übereinander an derselben Stelle** und nicht
 * nebeneinander: Die Stücke des Regals sind so gebaut, dass ihre Ursprünge
 * zusammenpassen. `itemModel` nimmt den ersten, `dishModels` alle.
 */
export const ITEM_MODELS: Readonly<Record<KitchenItem, string | readonly string[]>> = {
  pot: bits('pot_A'),
  // **Die Pfanne der Sandbox-Küche** und nicht eine aus dem Regal: Gemeldet
  // war _„die falsche Pfanne beim Herd"_. Sie liegt in `kitchen.glb`, nicht im
  // Regal; geladen wird sie wie dort (`itemTemplate.loadItemModel`).
  pan: KITCHEN_PAN,
  // **Der Feuerlöscher der Wundertüte** — derselbe wie in der Küche der
  // Sandbox (`core/mixedbagFit.ts`), dort als Datei im Regal. Keine Zange und
  // kein Wasser im Regal (siehe oben).
  extinguisher: 'mixed-bag/fire_extinguisher.glb',
  // **Die Rohrzange** der Spüle — der Schraubenschlüssel des Regals, wie in
  // der Sandbox (`kitchenProps.WRENCH_MODEL`).
  pliers: 'rpg-tools-bits/wrench_A.glb',
  water: '',
  plate: bits('plate'),
  'plate-dirty': bits('plate_dirty'),
  bun: bits('food_ingredient_bun'),
  patty: bits('food_ingredient_burger_uncooked'),
  'patty-cooked': bits('food_ingredient_burger_cooked'),
  'patty-burnt': bits('food_ingredient_burger_trash'),
  lettuce: bits('food_ingredient_lettuce'),
  'lettuce-cut': bits('food_ingredient_lettuce_slice'),
  tomato: bits('food_ingredient_tomato'),
  'tomato-cut': bits('food_ingredient_tomato_slice'),
  // Das Regal hat keine Tomatensuppe, aber eine Tomatensoße — flach, rot und
  // auf einem Burger genau das, was die Suppe dort sein soll.
  'tomato-soup': bits('food_ingredient_tomato_sauce'),
  bowl: bits('bowl'),
  cone: bits('icecream_cone'),
  pizzabox: bits('pizzabox_open'),
  cheese: bits('food_ingredient_cheese'),
  'cheese-cut': bits('food_ingredient_cheese_slice'),
  ham: bits('food_ingredient_ham'),
  'ham-cooked': bits('food_ingredient_ham_cooked'),
  'ham-burnt': bits('food_ingredient_ham_trash'),
  // **Das Steak**: roh das ganze Stück; gebraten in Scheiben — das Regal hat
  // kein gebratenes Steak, aber aufgeschnittenes, und so liegt es auf dem
  // Teller; verbrannt wie das verbrannte Patty.
  steak: bits('food_ingredient_steak'),
  'steak-cooked': bits('food_ingredient_steak_pieces'),
  'steak-burnt': bits('food_ingredient_burger_trash'),
  // **Eine ganze Pizza gibt es im Regal nur auf ihrem Brett** — ohne Teller
  // darunter hat sie keine Form. Das Brett ist klein genug, dass sie so auch
  // im offenen Karton liegt.
  pizza: bits('food_pizza_pepperoni_plated'),
  'pizza-cut': bits('food_pizza_pepperoni_slice'),
  dough: bits('food_ingredient_dough'),
  'dough-flat': bits('food_ingredient_dough_base'),
  waffle: bits('icecream_waffle'),
  'waffle-raw': bits('food_ingredient_dough'),
  'waffle-burnt': bits('icecream_waffle'),
  carrot: bits('food_ingredient_carrot'),
  'carrot-cut': bits('food_ingredient_carrot_chopped'),
  potato: bits('food_ingredient_potato'),
  'potato-cut': bits('food_ingredient_potato_chopped'),
  onion: bits('food_ingredient_onion'),
  'onion-cut': bits('food_ingredient_onion_chopped'),
  mushroom: bits('food_ingredient_mushroom'),
  'mushroom-cut': bits('food_ingredient_mushroom_chopped'),
  // **Die Suppen** sehen im Regal alle gleich aus (`food_stew`); ihre Farbe
  // bekommen sie beim Zeigen (`dishView.SOUP_TINT`).
  'soup-onion': bits('food_stew'),
  'soup-mushroom': bits('food_stew'),
  stew: bits('food_stew'),
  // **Pommes hat das Regal nicht** (kein Paket hat sie, auch keine Fritteuse)
  // — die gewürfelte Kartoffel ist in Farbe und Form am nächsten dran. Die
  // geschnittene Kartoffel sieht damit genauso aus; sie liegt aber nie auf
  // einem Teller, sondern auf dem Brett und im Topf.
  fries: bits('food_ingredient_potato_chopped'),
  // **Die Kugeln sind die Füllung der Eisschale** — so liegen sie im Regal:
  // `icecream_bowl_icecream_*` ist der Eisberg, der in die Schale gehört, mit
  // seinem Ursprung dort, wo die Schale ihn trägt. Eine Kugel für sich gibt
  // es nicht, und in der Hand kommt sie auch nie vor (`kitchenCarry.atTub`).
  'ice-vanilla': bits('icecream_bowl_icecream_vanilla'),
  'ice-strawberry': bits('icecream_bowl_icecream_strawberry'),
  'ice-chocolate': bits('icecream_bowl_icecream_chocolate'),
  // **Die Eiswanne** ist der Kasten der Eisecke (`icecream_container`); was
  // darin liegt, ist die Füllung derselben Wanne (`IN_TRAY`).
  tray: bits('icecream_container'),
};

/**
 * **Was in der Eiswanne anders aussieht** — das Eis als Füllung des Kastens
 * (`icecream_container_icecream_*`), mit demselben Ursprung wie er.
 */
const IN_TRAY: Partial<Record<KitchenItem, string>> = {
  'ice-vanilla': bits('icecream_container_icecream_vanilla'),
  'ice-strawberry': bits('icecream_container_icecream_strawberry'),
  'ice-chocolate': bits('icecream_container_icecream_chocolate'),
};

/**
 * **Was in einer Schüssel anders aussieht als für sich.**
 *
 * Suppe für sich ist ein ganzer Teller Eintopf (`food_stew`); in der Schüssel
 * ist sie nur die Füllung (`stew_bowl`), sonst stünde eine Schüssel in der
 * Schüssel. Dasselbe bei der Waffel: Im Regal gibt es die Waffeln passend für
 * die Eisschale.
 */
const IN_BOWL: Partial<Record<KitchenItem, string>> = {
  stew: bits('stew_bowl'),
  'tomato-soup': bits('stew_bowl'),
  'soup-onion': bits('stew_bowl'),
  'soup-mushroom': bits('stew_bowl'),
  waffle: bits('icecream_bowl_waffles'),
};

/**
 * **Die beiden Hälften des Brötchens** — sobald etwas darin liegt, ist es
 * aufgeschnitten: unten der Boden, oben der Deckel, dazwischen der Belag.
 * Dieselbe Regel wie im Diner-Baukasten (`kitchenProps.FoodKit.pile`).
 */
export const BUN_BOTTOM = bits('food_ingredient_bun_bottom');
export const BUN_TOP = bits('food_ingredient_bun_top');

/** Alle Pfade eines Eintrags, ohne die leeren. */
function paths(entry: string | readonly string[]): string[] {
  return (typeof entry === 'string' ? [entry] : [...entry]).filter((path) => path !== '');
}

/** **Das eine Stück eines Dings** — der erste Pfad, oder `''`, wenn es keines gibt. */
export function itemModel(item: KitchenItem): string {
  return paths(ITEM_MODELS[item])[0] ?? '';
}

/**
 * **Alle Stücke eines Gerichts**, von unten nach oben: erst der Träger, dann
 * was darauf oder darin liegt, in der Reihenfolge, in der ein Burger gebaut
 * ist (`kitchenRecipes.layered`).
 *
 * Drei Abweichungen vom bloßen Nachschlagen, und alle drei sind Bild:
 *
 * - **Das Brötchen wird aufgeschnitten**, sobald es Belag hat — ob es selbst
 *   der Träger ist oder auf einem Teller liegt. Ein Brötchen allein bleibt
 *   ganz.
 * - **In der Schüssel** gilt `IN_BOWL`: Suppe und Waffel als Füllung.
 * - **Was kein Bild hat, fällt weg** — der Topf mit Wasser ist ein Topf.
 *
 * Die Welt stapelt die Stücke nach ihren gemessenen Höhen; die Liste sagt nur,
 * welche und in welcher Reihenfolge.
 */
export function dishModels(dish: Dish): string[] {
  const out = paths(ITEM_MODELS[dish.item]);
  // Was nicht in der Schichtung steht (Wasser), kommt ans Ende — `layered`
  // sortiert Unbekanntes sonst nach vorn, unter den Belag.
  const known = layered(dish.on.filter((item) => STACK_ORDER.includes(item)));
  const rest = dish.on.filter((item) => !STACK_ORDER.includes(item));
  const on = [...known, ...rest];
  const inBowl = dish.item === 'bowl';
  const inTray = dish.item === 'tray';
  // **Im Topf liegt eine Suppe in Portionen** (`kitchenRecipes.servings`) —
  // gezeigt wird sie einmal.
  if (dish.item === 'pot') {
    return [...out, ...[...new Set(on)].flatMap((item) => paths(ITEM_MODELS[item]))];
  }
  const piece = (item: KitchenItem): string[] => {
    const special = inBowl ? IN_BOWL[item] : inTray ? IN_TRAY[item] : undefined;
    return special ? [special] : paths(ITEM_MODELS[item]);
  };

  if (dish.item === 'bun') {
    if (!on.length) return out;
    return [BUN_BOTTOM, ...on.flatMap(piece), BUN_TOP];
  }
  if (on.includes('bun')) {
    const filling = on.filter((item) => item !== 'bun');
    if (!filling.length) return [...out, ...piece('bun')];
    return [...out, BUN_BOTTOM, ...filling.flatMap(piece), BUN_TOP];
  }
  return [...out, ...on.flatMap(piece)];
}
