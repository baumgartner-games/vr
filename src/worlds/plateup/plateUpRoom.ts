import type { ElementSpot, Face } from '../elements/elementPlace';
import { GridPlan } from '../grid/gridPlan';
import type { NavRect } from '../nav/navBuild';
import { DIR_N } from '../nav/navTile';
import { PLATE_PROTOTYPE } from '../test/floorPlate';
import {
  DINING_AREA,
  DOOR_X,
  KITCHEN_AREA,
  RETURN_GATE,
  RETURN_GATE_TILE,
  ROOM,
  SPAWN_TILE,
  STREET,
} from './plateUpPlan';

/**
 * **Das Restaurant, neu aus dem Möbelkatalog** — Boden, Wände und Küche, und
 * sonst nichts.
 *
 * Gewünscht, im September 2026: _„Alle Dinge/Gegenstände in Restaurant sollen
 * nur aus die in Möbel befindlichen Elemente getauscht werden. Also zunächst
 * Restaurant Welt komplett leer machen, dann die Boden floor Platten für die
 * Küche einbauen und die floor Holz für den Gast Raum einsetzen. Dann die
 * Küchen Elemente aus Möbel einbauen. Dann die Wand aus Navigation Test als
 * Möbel einrichten, und diese Wand Element aus Möbel dann in Restaurant Welt
 * nutzen. Bitte keine weiteren Gegenstände wie Tische oder Stühle
 * einrichten."_
 *
 * Also stehen hier **dieselben Maße** wie im alten Laden (`plateUpPlan.ts`:
 * 14 × 12 Kacheln, Küche die nördlichen vier Reihen, Gastraum die acht
 * darunter, die Tür in der Südwand, der Gehweg mit dem Tor zurück), aber
 * jedes Möbel und jede Wand ist ein **Spielelement** (`SPOTS`), eine Zeile je
 * Stück, wie im [Test Restaurant](../testrestaurant/restaurantPlan.ts). Kein
 * Tisch, kein Stuhl, keine Deko, keine Gäste — die kommen, wenn der Besitzer
 * sie als Möbel eingerichtet und geprüft hat.
 *
 * Reine Rechnung, ohne Szene; der Test daneben (`plateUpRoom.test.ts`) sieht
 * nach, dass alles auf dem Boden steht, sich nichts überlappt und man von der
 * Ankunft an jedes Möbel, in den Gastraum und hinaus zum Tor kommt.
 */

/** **Die Küchenfliesen** — die kleine Platte aus _Restaurant Bits_, eine je Kachel. */
export const KITCHEN_FLOOR = 'restaurant-bits/floor_kitchen_small.glb';

/** **Die Dielen des Gastraums** — das kleine Holzstück aus _Dungeon_, eine je Kachel. */
export const DINING_FLOOR = 'dungeon/floor_wood_small.glb';

/**
 * **Der Boden unter den Wänden** — der Ring aus Kacheln rings um den Raum, auf
 * dem die Wände stehen (`WALL_SPOTS`). Sie stehen bündig an seiner Innenkante,
 * die Kacheln selbst liegen draußen.
 */
export const RING: NavRect = { x: ROOM.x - 1, z: ROOM.z - 1, w: ROOM.w + 2, d: ROOM.d + 1 };

/** Ob die Kachel (`x`, `z`) in einem Rechteck liegt. */
function within(rect: NavRect, x: number, z: number): boolean {
  return x >= rect.x && x < rect.x + rect.w && z >= rect.z && z < rect.z + rect.d;
}

/**
 * **Welche Platte auf welche Kachel gehört** (`GridWorld.floorPlate`): Fliesen
 * in der Küche, Dielen im Gastraum, draußen der Prototyp-Boden der Testwelten.
 */
export function roomFloor(x: number, z: number): string {
  if (within(KITCHEN_AREA, x, z)) return KITCHEN_FLOOR;
  if (within(DINING_AREA, x, z)) return DINING_FLOOR;
  return PLATE_PROTOTYPE;
}

/** Eine Stelle der Küche: Kachel, Element, Blickrichtung. */
function at(id: string, element: string, x: number, z: number, face: Face): ElementSpot {
  return { id, element, x, z, face };
}

/**
 * **Die Küche** — so aufgestellt wie im alten Laden, nur aus dem Möbelkatalog
 * (`elements/elementCatalog.FURNITURE_CATALOGUE`).
 *
 * - An der Nordwand (z = 0, nach Süden) von West nach Ost: Tellerkiste, die
 *   Vorräte (Brötchen, Pattys, Salat, Tomaten), Arbeitsplatte, Brett,
 *   Feuerlöscher, zwei Herde mit Pfanne, Rohrzange, Spüle, Tellerstapel,
 *   Mülleimer. Wo früher der Kühlschrank stand, steht die Tellerkiste — einen
 *   Kühlschrank gibt es als Möbel nicht. Löscher und Zange stehen dort, wo sie
 *   gebraucht werden: neben dem Herd, der brennen kann, und neben der Spüle,
 *   die undicht werden kann (`stationLayer.LEAK_CHANCE`).
 * - Die Durchreiche (z = 3, nach Norden, bedient aus dem Gang davor): acht
 *   Arbeitsplatten von der Westwand an, und in derselben Reihe die Eisecke —
 *   Eisstand, Vanille, Erdbeere, eine Wanne je Platte. Im alten Laden stand
 *   sie eine Reihe weiter nördlich, vor der Durchreiche; als Möbel hätte sie
 *   dort deren Vorderseite zugestellt. Östlich davon (x = 11…13) der
 *   Durchgang in den Gastraum.
 */
export const KITCHEN_SPOTS: readonly ElementSpot[] = [
  at('tellerkiste', 'crate-plates', 0, 0, 'S'),
  at('broetchen', 'crate-buns', 1, 0, 'S'),
  at('pattys', 'crate-patties', 2, 0, 'S'),
  at('salat', 'crate-lettuce', 3, 0, 'S'),
  at('tomaten', 'crate-tomatoes', 4, 0, 'S'),
  at('platte', 'counter', 5, 0, 'S'),
  at('brett', 'board', 6, 0, 'S'),
  at('loescher', 'extinguisher', 7, 0, 'S'),
  at('herd-1', 'stove', 8, 0, 'S'),
  at('herd-2', 'stove', 9, 0, 'S'),
  at('zange', 'pliers', 10, 0, 'S'),
  at('spuele', 'sink', 11, 0, 'S'),
  at('teller', 'plate-stack', 12, 0, 'S'),
  at('muell', 'bin', 13, 0, 'S'),
  ...Array.from({ length: 8 }, (_, x) => at(`durchreiche-${x}`, 'counter', x, 3, 'N')),
  at('eisstand', 'ice-stand', 8, 3, 'N'),
  at('eis-vanille', 'ice-tray-vanilla', 9, 3, 'N'),
  at('eis-erdbeere', 'ice-tray-strawberry', 10, 3, 'N'),
];

/**
 * **Die Wände** — die Fensterwand der Test Navigation als Möbel
 * (`elementCatalog`, `wall`), zwei Kacheln je Stück, auf dem Ring rings um
 * den Raum und mit der Vorderseite nach innen: So steht jede bündig am Rand
 * des Bodens. In der Südwand bleibt die Tür offen (`DOOR_X`), zwei Kacheln
 * breit — dort geht es auf den Gehweg und zum Tor.
 */
export const WALL_SPOTS: readonly ElementSpot[] = wallRing();

function wallRing(): ElementSpot[] {
  const out: ElementSpot[] = [];
  const east = ROOM.x + ROOM.w;
  const south = ROOM.z + ROOM.d;
  for (let x = ROOM.x; x < east; x += 2) {
    out.push(at(`wand-nord-${x}`, 'wall', x, ROOM.z - 1, 'S'));
    if (!DOOR_X.includes(x)) out.push(at(`wand-sued-${x}`, 'wall', x, south, 'N'));
  }
  for (let z = ROOM.z; z < south; z += 2) {
    out.push(at(`wand-west-${z}`, 'wall', ROOM.x - 1, z, 'E'));
    out.push(at(`wand-ost-${z}`, 'wall', east, z, 'W'));
  }
  return out;
}

/** **Alles, was steht** — Küche und Wände, jede Zeile ein Spielelement. */
export const SPOTS: readonly ElementSpot[] = [...KITCHEN_SPOTS, ...WALL_SPOTS];

/** **Wo man ankommt** — in der Küche, wie im alten Laden, auf der Mitte der Kachel. */
export function spawn(): { x: number; z: number } {
  return { x: SPAWN_TILE.x + 0.5, z: SPAWN_TILE.z + 0.5 };
}

/**
 * **Ob hier Boden ist** — Raum samt Wandring und Gehweg. Dorthin darf auch,
 * was man aus dem Möbelkatalog hinstellt.
 */
export function onFloor(x: number, z: number): boolean {
  return within(RING, x, z) || within(STREET, x, z);
}

/**
 * **Der Plan der Welt**: Boden (Raum mit Wandring, Gehweg) und das Tor zurück
 * in die Sandbox — Wände und Möbel sind Spielelemente (`SPOTS`) und sperren
 * ihre Zellen selbst.
 */
export function plateUpRoomPlan(): GridPlan {
  const plan = new GridPlan();
  plan.floor(RING);
  plan.floor(STREET);
  // **Das Tor zurück in die Testwelt** — an der Ecke des Gehwegs, mit dem
  // Blick zum Laden, wie bisher (`test/zones/kitchenPlan.BURGER_GATE`).
  plan.putFixture({
    id: RETURN_GATE,
    kind: 'gate',
    x: RETURN_GATE_TILE.x,
    z: RETURN_GATE_TILE.z,
    dir: DIR_N,
    props: {
      world: 'sandbox',
      label: '→ Sandbox',
      accent: 0x5ee0a0,
      note: 'Zurück zur Prüfküche',
    },
  });
  return plan;
}
