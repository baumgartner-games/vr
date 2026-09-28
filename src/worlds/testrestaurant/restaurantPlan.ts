import type { ElementSpot } from '../elements/elementPlace';
import { GridPlan } from '../grid/gridPlan';

/**
 * **Test Restaurant** — die zweite Welt im Ordner _Test_, neben der Test
 * Navigation. Neu aufgebaut aus dem Möbelkatalog.
 *
 * Gewünscht, im September 2026: _„Also wir sollten die Restaurant Test Welt
 * komplett neu aufbauen. Mach die bitte einmal komplett leer. Ich will diese
 * aus dem Model Regal selbst aufbauen und schicke dir dann das dazu."_ Danach
 * kam die Liste: eine Burgerküche (`SPOTS`). Die alten Küchen, das Burgerband, die Gäste,
 * die Vorratsboxen und die Eisecke stehen in der Geschichte des Repositorys
 * (`docs/agents/testrestaurant.md` nennt den Commit).
 *
 * **Was der Besitzer aus dem Modellregal zusammenstellt, kommt als
 * Spielelemente hierher** (`elements/elementCatalog.ELEMENTS`), eine Zeile je
 * Möbel in `SPOTS` — und sonst nirgends. Die Welt stellt jede Stelle hin
 * (`elementView.placeElement`: Zellen gesperrt, bevor ein Modell lädt), und
 * **jede Stelle, deren Element eine Stationsart hat, wird eine Station**
 * (`elementStations`), ohne zweite Liste. Genau so eine zweite Liste war der
 * Grund, warum die Kisten am alten Band nicht auf `A` antworteten.
 *
 * **Reine Rechnung, ohne Szene**: Boden, Ankunftsort, Stellen. Der Test
 * daneben (`restaurantPlan.test.ts`) sieht nach, dass die Stellen auf dem
 * Boden stehen, sich nicht überlappen und den Ankunftsort frei lassen.
 */

/**
 * **Die Möbel der Welt** — die Burgerküche, wie der Besitzer sie im Spiel aus
 * dem Möbelkatalog zusammengestellt hat (September 2026, die Liste der
 * _Weltänderungen_).
 *
 * Zwei Reihen mit einem Gang dazwischen (z = 13, dort kommt man auch an):
 * im Norden die sechs Vorratskisten, der Herd mit Pfanne und der
 * Feuerlöscher, im Süden Mülleimer, Arbeitsplatten, das Schneidebrett, der
 * Tellerstapel und die Tellerkiste (die zweite Liste kam gleich danach).
 * **Alle schauen nach Süden** — gewünscht: _„Diese Ausrichtung der Möbel ist
 * bei allen Süden, bitte anpassen."_ (In der Liste standen die Kisten noch
 * nach Norden.)
 *
 * Eine Zeile je Element (`x`/`z` die Nordwestecke in Kacheln, `face` die
 * Vorderseite). Mehr braucht es nicht: Hinstellen, Sperren und — wo das
 * Element einen Zweck hat — die Station erledigt die Welt für jede Zeile
 * gleich.
 */
export const SPOTS: readonly ElementSpot[] = [
  // Die Nordreihe: Vorräte von West nach Ost, dann der Herd.
  { id: 'schinken', element: 'crate-ham', x: 11, z: 12, face: 'S' },
  { id: 'kaese', element: 'crate-cheese', x: 12, z: 12, face: 'S' },
  { id: 'tomaten', element: 'crate-tomatoes', x: 13, z: 12, face: 'S' },
  { id: 'salat', element: 'crate-lettuce', x: 14, z: 12, face: 'S' },
  { id: 'broetchen', element: 'crate-buns', x: 15, z: 12, face: 'S' },
  { id: 'fleisch', element: 'crate-steak', x: 16, z: 12, face: 'S' },
  { id: 'herd', element: 'stove', x: 17, z: 12, face: 'S' },
  // Die zweite Liste: der Feuerlöscher neben dem Herd.
  { id: 'loescher', element: 'extinguisher', x: 18, z: 12, face: 'S' },
  // Die dritte Liste: die Eisecke daneben, nach Osten — Platte, Eisstand,
  // Wannen, Schüsseln, und ein Mülleimer gegenüber, nach Westen gedreht.
  { id: 'eis-platte', element: 'counter', x: 20, z: 12, face: 'S' },
  { id: 'eisstand', element: 'ice-stand', x: 21, z: 12, face: 'S' },
  // Die Doppelwanne ist seit der vierten Runde eine Wanne je Platte, drei
  // Sorten, dazu die Eismaschine, die sie füllt, und die Kiste mit leeren.
  { id: 'eis-vanille', element: 'ice-tray-vanilla', x: 22, z: 12, face: 'S' },
  { id: 'schuesseln', element: 'bowl-stack', x: 23, z: 12, face: 'S' },
  { id: 'eis-erdbeere', element: 'ice-tray-strawberry', x: 24, z: 12, face: 'S' },
  { id: 'eis-schoko', element: 'ice-tray-chocolate', x: 25, z: 12, face: 'S' },
  { id: 'eismaschine', element: 'ice-machine', x: 26, z: 12, face: 'S' },
  { id: 'wannen-kiste', element: 'crate-trays', x: 27, z: 12, face: 'S' },
  { id: 'eis-muell', element: 'bin', x: 20, z: 14, face: 'W' },
  // Die fünfte Liste: die Suppenküche im Norden (z = 7 und 9). Vorräte nach
  // Osten und Süden, Herd mit Topf, Spüle, Schüsseln, Feuerlöscher, und
  // gegenüber nach Norden Zwiebeln, Brett, zwei Platten, Mülleimer. Pilz- und
  // Kartoffelkiste standen in der Liste als rohe Modelle aus dem Regal; hier
  // sind sie die Spielelemente dazu, gedreht wie die Modelle (90° → Osten,
  // −90° → Westen).
  { id: 'suppe-karotten', element: 'crate-carrots', x: 11, z: 7, face: 'S' },
  { id: 'suppe-tomaten', element: 'crate-tomatoes', x: 10, z: 7, face: 'E' },
  { id: 'suppe-kartoffeln', element: 'crate-potatoes', x: 9, z: 7, face: 'W' },
  { id: 'suppe-herd', element: 'stove-pot', x: 12, z: 7, face: 'S' },
  { id: 'suppe-spuele', element: 'sink', x: 13, z: 7, face: 'S' },
  { id: 'suppe-schuesseln', element: 'bowl-stack', x: 14, z: 7, face: 'S' },
  { id: 'suppe-loescher', element: 'extinguisher', x: 15, z: 7, face: 'S' },
  // Nicht in der Liste, aber nötig: Die Spüle kann kaputtgehen, und ohne
  // Rohrzange bliebe sie es (`stationLayer.LEAK_CHANCE`).
  { id: 'suppe-zange', element: 'pliers', x: 16, z: 7, face: 'S' },
  { id: 'suppe-pilze', element: 'crate-mushrooms', x: 10, z: 9, face: 'E' },
  { id: 'suppe-zwiebeln', element: 'crate-onions', x: 11, z: 9, face: 'N' },
  { id: 'suppe-brett', element: 'board', x: 12, z: 9, face: 'N' },
  { id: 'suppe-platte-1', element: 'counter', x: 13, z: 9, face: 'N' },
  { id: 'suppe-platte-2', element: 'counter', x: 14, z: 9, face: 'N' },
  { id: 'suppe-muell', element: 'bin', x: 15, z: 9, face: 'N' },
  // Die Waffelecke: Teig in vier Teigstücke schneiden, in der Pfanne braten,
  // auf der Platte einzeln nehmen, Eis darauf.
  { id: 'waffel-teig', element: 'crate-dough', x: 20, z: 9, face: 'N' },
  // In der Liste stand hier das Nudelbrett; die Waffel wird aber geschnitten
  // und nicht ausgerollt (`kitchenRecipes.CHOPS`), also das Schneidebrett.
  { id: 'waffel-brett', element: 'board', x: 21, z: 9, face: 'N' },
  { id: 'waffel-platte-1', element: 'counter', x: 22, z: 9, face: 'N' },
  { id: 'waffel-schuesseln', element: 'bowl-stack', x: 23, z: 9, face: 'N' },
  { id: 'waffel-herd', element: 'stove', x: 21, z: 7, face: 'S' },
  { id: 'waffel-platte-2', element: 'counter', x: 22, z: 7, face: 'S' },
  // In der Liste standen hier die Eiswannen zu zweit auf einer Platte; die
  // gibt es nicht mehr — eine Wanne je Platte, hier Vanille.
  { id: 'waffel-eis', element: 'ice-tray-vanilla', x: 23, z: 7, face: 'S' },
  // Die Südreihe: Müll, Platte, Brett, drei Platten, Teller.
  { id: 'muell', element: 'bin', x: 11, z: 14, face: 'S' },
  { id: 'platte-1', element: 'counter', x: 12, z: 14, face: 'S' },
  { id: 'brett', element: 'board', x: 13, z: 14, face: 'S' },
  { id: 'platte-2', element: 'counter', x: 14, z: 14, face: 'S' },
  { id: 'platte-3', element: 'counter', x: 15, z: 14, face: 'S' },
  { id: 'platte-4', element: 'counter', x: 16, z: 14, face: 'S' },
  { id: 'teller', element: 'plate-stack', x: 17, z: 14, face: 'S' },
  // Die zweite Liste: die Tellerkiste neben dem Tellerstapel.
  { id: 'tellerkiste', element: 'crate-plates', x: 18, z: 14, face: 'S' },
];

/**
 * **Der Boden**, in Kacheln — 40 × 32, so groß wie zuletzt mit allen Küchen,
 * Band und Gastraum, damit Platz für den Neuaufbau ist.
 */
export function ground(): { x: number; z: number; w: number; d: number } {
  return { x: -3, z: -3, w: 40, d: 32 };
}

/** **Wo man ankommt** — mitten auf dem Boden, auf der Mitte einer Kachel. */
export function spawn(): { x: number; z: number } {
  const g = ground();
  return { x: g.x + Math.floor(g.w / 2) + 0.5, z: g.z + Math.floor(g.d / 2) + 0.5 };
}

/** Der Plan der Welt: nur Boden — alles andere sind Spielelemente (`SPOTS`). */
export function restaurantPlan(): GridPlan {
  const plan = new GridPlan([0]);
  plan.floor(ground());
  return plan;
}
