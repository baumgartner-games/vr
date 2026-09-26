import { GridPlan } from '../grid/gridPlan';
import {
  DIR_E,
  DIR_N,
  DIR_S,
  DIR_W,
  keyX,
  keyZ,
  tileKey,
  type Dir,
  type TileKey,
} from '../nav/navTile';
import type { NavRect } from '../nav/navBuild';
import { findPath, smoothPath } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import type { StationKind } from '../test/zones/kitchenCarry';
import type { KitchenItem } from '../test/zones/kitchenRecipes';

/**
 * **Der Burgerladen in Kacheln** — Küche, Durchreiche, Gastraum, Gehweg.
 * Ohne three.js, ohne Modell, ohne Bild.
 *
 * Eine Kachel ist ein Meter (`nav/navTile.TILE`), und die Möbel kommen aus dem
 * zweiten Katalog in **halber** Größe (`core/dinerFit.DINER_SCALE`) — genau
 * wie in der Küche der Testwelt: eine Küchenzeile je Kachel, Arbeitshöhe ein
 * halber Meter, ein runder Gasttisch auf zwei mal zwei Kacheln. Wer in beiden
 * Küchen kocht, soll dieselben Maße unter den Händen haben.
 *
 * ```
 *        x: 0 1 2 3 4 5 6 7 8 9 10 11 12 13
 *  z=0      K B P S T o b o G G o  s  T  M     Nordwand: Stationen
 *  z=1      . . . . . . . . . . .  .  .  .     Küche
 *  z=2      . . . . . . . . . . .  .  .  .
 *  z=3      d o o o o o o o o o o  .  .  .     Durchreiche, rechts offen
 *  z=4      . . . . . . . . . . .  .  .  .     Gang
 *  z=5      . c . . . . . . . . .  c  .  .     Stühle (Nord)
 *  z=6      . t t . . . . . . . .  t  t  .     Tische
 *  z=7      . t t . . . . . . . .  t  t  .
 *  z=8      . c . . . c . . . . .  c  .  .     Stühle (Süd) / zweite Reihe
 *  ...
 *  z=11     . . . . . . D D . . .  .  .  .     Tür in der Südwand
 * ```
 *
 * **Warum ein eigener Laden und keine zweite Testküche.** Die Küche der
 * Testwelt ist ein Prüfstand: Bänder, Baumodus, Kopierer, Werkhalle. Dieser
 * Laden ist das Gegenteil — ein fertig eingerichteter Raum, in dem genau eine
 * Sache passiert: Gäste kommen, bestellen, essen, zahlen. Die **Regeln** am
 * Möbel sind trotzdem dieselben (`test/zones/kitchenCarry.kitchenDeed`), damit
 * ein Brötchen hier nicht anders auf den Teller geht als dort.
 */

/** Der ganze Laden, innen — Küche und Gastraum. */
export const ROOM: NavRect = { x: 0, z: 0, w: 14, d: 12 };

/** Die Küche: die Stationen an der Nordwand und zwei Reihen Arbeitsgang. */
export const KITCHEN_AREA: NavRect = { x: 0, z: 0, w: 14, d: 4 };

/** Der Gastraum südlich der Durchreiche. */
export const DINING_AREA: NavRect = { x: 0, z: 4, w: 14, d: 8 };

/**
 * **Der Gehweg vor dem Laden** — dort kommen die Gäste her und dorthin gehen
 * sie wieder. Zwei Kacheln breiter als der Laden, damit man von beiden Seiten
 * kommt und nicht aus der Wand.
 */
export const STREET: NavRect = { x: -3, z: 12, w: 20, d: 4 };

/** Die zwei Türkacheln in der Südwand (innen, `z = 11`). */
export const DOOR_X: readonly number[] = [6, 7];

/** Wo man ankommt: mitten in der Küche, Blick nach Süden zur Durchreiche. */
export const SPAWN_TILE = { x: 7, z: 2 } as const;

/** Eine Station: eine Kachel mit einer Regel (`kitchenCarry.StationKind`). */
export interface StationSpot {
  readonly id: string;
  readonly kind: StationKind;
  readonly x: number;
  readonly z: number;
  /** Was eine Kiste hergibt (`crate`, `box`). */
  readonly gives?: KitchenItem;
  /** Wie die Station im Satz heißt — „Brötchen nehmen" steht an der Kiste. */
  readonly label: string;
  /** Welches Möbel aus dem Katalog darunter steht (`core/dinerFit`). */
  readonly model: string;
  /** Wohin ihre Vorderseite zeigt — da steht, wer davor arbeitet. */
  readonly face: Dir;
}

/**
 * **Die Stationen** — die Nordwand von West nach Ost, dann die Durchreiche.
 *
 * Die Reihenfolge ist der Weg eines Burgers: Kiste → Brett/Kochstelle →
 * Ablage mit Teller → Durchreiche. Wer in der Mitte der Küche steht, hat
 * alles in drei Schritten, und das ist bei _PlateUp!_ genau der Reiz: nicht
 * die Wege, sondern die Reihenfolge.
 */
export const STATIONS: readonly StationSpot[] = [
  crate('buns', 1, 'bun', 'Brötchenkiste', 'crate_buns'),
  crate('patties', 2, 'patty', 'Fleischkiste', 'crate_steak'),
  crate('lettuce', 3, 'lettuce', 'Salatkiste', 'crate_lettuce'),
  crate('tomatoes', 4, 'tomato', 'Tomatenkiste', 'crate_tomatoes'),
  north('top-1', 'top', 5, 'Arbeitsplatte', 'kitchencounter_straight_A'),
  north('board', 'board', 6, 'Schneidebrett', 'kitchencounter_straight_B'),
  north('top-2', 'top', 7, 'Arbeitsplatte', 'kitchencounter_straight_A'),
  north('grill-1', 'griddle', 8, 'Grillplatte', 'stove_single'),
  north('grill-2', 'griddle', 9, 'Grillplatte', 'stove_single'),
  north('top-3', 'top', 10, 'Arbeitsplatte', 'kitchencounter_straight_A'),
  north('top-4', 'top', 11, 'Arbeitsplatte', 'kitchencounter_straight_B'),
  { ...north('plates', 'box', 12, 'Tellerstapel', 'kitchentable_A'), gives: 'plate' },
  north('bin', 'bin', 13, 'Mülleimer', 'kitchencabinet'),
  // Die Durchreiche: Ablagen, die von beiden Seiten erreichbar sind.
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((x) =>
    pass(`pass-${x}`, x, x % 2 === 1 ? 'kitchencounter_straight_A' : 'kitchencounter_straight_B'),
  ),
];

function north(
  id: string,
  kind: StationKind,
  x: number,
  label: string,
  model: string,
): StationSpot {
  return { id, kind, x, z: 0, label, model, face: DIR_S };
}

function crate(
  id: string,
  x: number,
  gives: KitchenItem,
  label: string,
  model: string,
): StationSpot {
  return { id, kind: 'crate', x, z: 0, gives, label, model, face: DIR_S };
}

function pass(id: string, x: number, model: string): StationSpot {
  return { id, kind: 'top', x, z: 3, label: 'Durchreiche', model, face: DIR_N };
}

/** Die eine Kachel der Durchreiche ganz im Westen: Zierde, keine Station. */
export const PASS_END = { x: 0, z: 3 } as const;

/** Die Kachel der Nordwand ganz im Westen: der Kühlschrank. */
export const FRIDGE = { x: 0, z: 0 } as const;

/** Ein Gasttisch: zwei mal zwei Kacheln, und der Platz des Gastes daran. */
export interface TableSpot {
  readonly index: number;
  /** Die Nordwestkachel des Tisches. */
  readonly x: number;
  readonly z: number;
  /** Der Stuhl, auf dem der Gast sitzt — in Metern, Mitte der Sitzfläche. */
  readonly seat: { readonly x: number; readonly z: number };
  /** Wohin er dabei schaut (Gierwinkel, 0 = nach Norden, −Z). */
  readonly seatYaw: number;
  /** Die Kachel, von der aus er sich setzt — dort endet sein Weg. */
  readonly approach: { readonly x: number; readonly z: number };
  /** Der zweite Stuhl an der Wandseite: nur Zierde. */
  readonly other: { readonly x: number; readonly z: number; readonly yaw: number };
}

/**
 * **Vier Tische, zwei links und zwei rechts vom Mittelgang.**
 *
 * Der Gast sitzt am **Nordstuhl** und schaut nach Süden, also zur Kamera: Von
 * oben sieht man sein Gesicht und seine Sprechblase, nicht seinen Hinterkopf.
 * Gesetzt wird er von der Kachel neben dem Stuhl aus, auf der Gangseite — der
 * Weg dahin ist frei, weil die Tischreihen einen Gang zwischen sich lassen.
 */
export const TABLES: readonly TableSpot[] = [
  table(0, 1, 6, DIR_E),
  table(1, 11, 6, DIR_W),
  table(2, 1, 9, DIR_E),
  table(3, 11, 9, DIR_W),
];

function table(index: number, x: number, z: number, aisle: Dir): TableSpot {
  const cx = x + 1;
  const cz = z + 1;
  // Der Stuhl steht eine Kachel nördlich der Tischkante, in der Mitte des
  // Tisches — also auf der Fuge zweier Kacheln, wie der Tisch selbst.
  const seat = { x: cx, z: z - 0.25 };
  const side = aisle === DIR_E ? 1 : -1;
  return {
    index,
    x,
    z,
    seat,
    seatYaw: Math.PI,
    approach: { x: cx + side * 1.2, z: z - 0.5 },
    // Gegenüber ist kein Platz — zwischen den Tischreihen liegt nur eine
    // Kachel Gang. Der zweite Stuhl steht deshalb an der Wandseite.
    other:
      aisle === DIR_E
        ? { x: x - 0.25, z: cz, yaw: -Math.PI / 2 }
        : { x: x + 2.25, z: cz, yaw: Math.PI / 2 },
  };
}

/** Wo Gäste herkommen und wieder hingehen — die beiden Enden des Gehwegs. */
export const STREET_ENDS: readonly { readonly x: number; readonly z: number }[] = [
  { x: STREET.x + 0.5, z: STREET.z + 1.5 },
  { x: STREET.x + STREET.w - 0.5, z: STREET.z + 1.5 },
];

/** Die Kacheln, auf denen etwas steht — dort läuft niemand, und dort liegt ein Körper. */
export function blockedTiles(): Set<string> {
  const out = new Set<string>();
  const put = (x: number, z: number): void => void out.add(`${x},${z}`);
  for (const station of STATIONS) put(station.x, station.z);
  put(FRIDGE.x, FRIDGE.z);
  put(PASS_END.x, PASS_END.z);
  for (const t of TABLES) {
    for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) put(t.x + dx, t.z + dz);
  }
  return out;
}

/**
 * **Der Grundriss für die Welt** — Boden, Wände, Tür.
 *
 * Die Möbel stehen hier **nicht** als Bausteine drin: Ein Baustein bringt sein
 * eigenes Regalmodell mit (`grid/blocks.BLOCK_MODELS`), und dieser Laden
 * zeigt die Möbel aus dem Restaurant-Katalog. Ihre Körper stellt die Welt
 * selbst hin (`PlateUpWorld.buildFurniture`), ihr Weg steht in
 * `routePlan` — derselbe Graph, nur ohne die belegten Kacheln.
 */
export function plateUpGrid(): GridPlan {
  const plan = new GridPlan();
  plan.floor(ROOM);
  plan.floor(STREET);
  wallRing(plan);
  return plan;
}

/** Die Wand ringsum, mit der Tür als Lücke in der Südwand. */
function wallRing(plan: GridPlan): void {
  for (let x = ROOM.x; x < ROOM.x + ROOM.w; x++) {
    plan.wall(x, ROOM.z, DIR_N);
    if (!DOOR_X.includes(x)) plan.wall(x, ROOM.z + ROOM.d - 1, DIR_S);
  }
  for (let z = ROOM.z; z < ROOM.z + ROOM.d; z++) {
    plan.wall(ROOM.x, z, DIR_W);
    plan.wall(ROOM.x + ROOM.w - 1, z, DIR_E);
  }
}

/**
 * **Der Plan, auf dem die Gäste laufen** — derselbe Laden, nur ohne die
 * Kacheln, auf denen Möbel stehen (`blockedTiles`).
 *
 * Ein eigener Graph und nicht der der Welt: Dort stehen die Möbel nicht als
 * Bausteine drin (siehe `plateUpGrid`), und ein Gast, der quer durch den
 * Tisch zu seinem Stuhl liefe, wäre der erste Fehler, den man von oben sieht.
 */
export function routePlan(): GridPlan {
  const plan = new GridPlan();
  const blocked = blockedTiles();
  for (const rect of [ROOM, STREET]) {
    for (let z = rect.z; z < rect.z + rect.d; z++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        if (!blocked.has(`${x},${z}`)) plan.floor({ x, z, w: 1, d: 1 });
      }
    }
  }
  wallRing(plan);
  return plan;
}

/** Ein Punkt in Metern, auf dem Boden. */
export interface FloorPoint {
  readonly x: number;
  readonly z: number;
}

function tileOf(point: FloorPoint): TileKey {
  return tileKey(Math.floor(point.x), Math.floor(point.z));
}

/**
 * **Der Weg eines Gastes von A nach B**, in Metern — über die Wegsuche der
 * NPCs (`nav/navPath.findPath`, dann `smoothPath` gegen das Zickzack).
 *
 * Zurück kommen die Kachelmitten des geglätteten Wegs, mit dem genauen
 * Zielpunkt am Ende (der Stuhl liegt nicht auf einer Kachelmitte). Findet die
 * Suche nichts, geht der Gast **geradeaus** — ein Gast, der stehen bleibt,
 * sperrt seinen Tisch für den Rest des Tages.
 */
export function guestRoute(plan: GridPlan, from: FloorPoint, to: FloorPoint): FloorPoint[] {
  const a = tileOf(from);
  const b = tileOf(to);
  const found = findPath(plan.graph, a, b, { profile: HUMAN_PROFILE });
  if (!found.complete || found.tiles.length === 0) return [to];
  const tiles = smoothPath(plan.graph, found.tiles, { profile: HUMAN_PROFILE });
  const points: FloorPoint[] = tiles.slice(1, -1).map((key) => ({
    x: keyX(key) + 0.5,
    z: keyZ(key) + 0.5,
  }));
  points.push(to);
  return points;
}

/** Die Tür von außen und von innen — der Punkt, durch den jeder Weg führt. */
export const DOOR_OUTSIDE: FloorPoint = { x: DOOR_X[0]! + 1, z: ROOM.z + ROOM.d + 0.5 };
export const DOOR_INSIDE: FloorPoint = { x: DOOR_X[0]! + 1, z: ROOM.z + ROOM.d - 1.5 };

/** Ob ein Punkt in der Küche liegt — dort gilt die Augenhöhe der Küche. */
export function inKitchen(x: number, z: number): boolean {
  return x >= ROOM.x - 1 && x <= ROOM.x + ROOM.w + 1 && z >= ROOM.z - 1 && z <= ROOM.z + ROOM.d + 1;
}
