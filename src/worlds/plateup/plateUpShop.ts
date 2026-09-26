import { DIR_E, DIR_N, DIR_W, tileKey } from '../nav/navTile';
import { findPath } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { DECOR } from './plateUpDecor';
import { roll } from './plateUpGame';
import {
  DINING_AREA,
  DOOR_INSIDE,
  DOOR_X,
  ROOM,
  SPAWN_TILE,
  TABLES,
  blockedTiles,
  routePlan,
  tableSpot,
  type StationSpot,
  type TableSpot,
} from './plateUpPlan';
import type { StationKind } from '../test/zones/kitchenCarry';

/**
 * **Einrichten zwischen den Tagen** — was es zu kaufen gibt, wo es hindarf und
 * was es bewirkt. Ohne three.js.
 *
 * Wie bei _PlateUp!_ liegen nach Ladenschluss **Baupläne** im Gastraum: Man
 * hebt einen auf, trägt ihn an die Stelle, an der das Stück stehen soll, und
 * stellt ihn dort hin — bezahlt wird mit der Kasse der bisherigen Tage. Der
 * Geist des Stücks (`portal/placeGhost.ts`, aus dem Baukasten) zeigt grün, ob
 * es dort Platz hat, und rot, wenn nicht; **warum** nicht, sagt `placeCheck`.
 *
 * Zwei Sorten:
 *
 * - **Ein Tisch** mit zwei Stühlen — ein Platz mehr für Gäste. Das ist die
 *   teure Wahl, und sie macht den Laden voller und damit schwerer.
 * - **Deko** (Pflanze, Lampe, Sessel …) — nur schön, und die Gäste werden
 *   geduldiger (`plateUpGame.decorPatience`).
 * - **Eine Station** (zweite Grillplatte, zweites Schneidebrett) — sie kommt
 *   in die Küche, vor die Durchreiche, und arbeitet wie ihre Schwester an der
 *   Nordwand (`extraStations`).
 *
 * Alle Modelle kommen aus dem KayKit-Regal, das schon im Laden steht.
 */

export type ShopKind = 'table' | 'decor' | 'station';

export interface ShopItem {
  readonly id: string;
  readonly label: string;
  /** Was es kostet, in Münzen. */
  readonly cost: number;
  readonly kind: ShopKind;
  /** Woher das Modell kommt — wie `plateUpDecor.DecorPiece.source`. */
  readonly source: 'diner' | 'kaykit';
  readonly model: string;
  /** Auf welche Höhe das Modell gebracht wird (nur `kaykit`). */
  readonly height?: number;
  /** Welche Regel die gekaufte Station bekommt (nur `station`). */
  readonly station?: StationKind;
  /** Wie die gekaufte Station im Satz heißt (nur `station`). */
  readonly stationLabel?: string;
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    id: 'table',
    label: 'Tisch mit zwei Stühlen',
    cost: 40,
    kind: 'table',
    source: 'diner',
    model: 'table_round_B_tablecloth_green',
  },
  {
    id: 'grill',
    label: 'Zweite Grillplatte',
    cost: 30,
    kind: 'station',
    source: 'diner',
    model: 'stove_single',
    station: 'griddle',
    stationLabel: 'Grillplatte',
  },
  {
    id: 'board',
    label: 'Zweites Schneidebrett',
    cost: 20,
    kind: 'station',
    source: 'diner',
    model: 'kitchencounter_straight_B',
    station: 'board',
    stationLabel: 'Schneidebrett',
  },
  {
    id: 'cactus',
    label: 'Kaktus',
    cost: 8,
    kind: 'decor',
    source: 'kaykit',
    model: 'furniture-bits/cactus_medium_B.glb',
    height: 0.7,
  },
  {
    id: 'lamp',
    label: 'Stehlampe',
    cost: 12,
    kind: 'decor',
    source: 'kaykit',
    model: 'furniture-bits/lamp_standing.glb',
    height: 1.45,
  },
  {
    id: 'bush',
    label: 'Busch im Kübel',
    cost: 10,
    kind: 'decor',
    source: 'kaykit',
    model: 'city-builder-bits/bush_B.glb',
    height: 0.8,
  },
  {
    id: 'armchair',
    label: 'Sessel',
    cost: 14,
    kind: 'decor',
    source: 'kaykit',
    model: 'furniture-bits/armchair_pillows.glb',
    height: 0.75,
  },
  {
    id: 'gumball',
    label: 'Kaugummiautomat',
    cost: 12,
    kind: 'decor',
    source: 'kaykit',
    model: 'mixed-bag/gumball_machine.glb',
    height: 0.9,
  },
];

/** Ein Eintrag nach Id — oder `null`. */
export function shopItem(id: string): ShopItem | null {
  return SHOP_ITEMS.find((item) => item.id === id) ?? null;
}

/** Wie viele Tische der Laden höchstens hat — sonst wird der Gastraum ein Labyrinth. */
export const MAX_TABLES = 6;

/** Wie viele Baupläne je Abend daliegen. */
export const OFFERS = 3;

/**
 * **Wo die Baupläne liegen** — im Gang südlich der Durchreiche, gleich neben
 * dem Durchgang aus der Küche, wo man nach Ladenschluss sowieso vorbeikommt.
 */
export const OFFER_SPOTS: readonly { readonly x: number; readonly z: number }[] = [
  { x: 9.4, z: 4.5 },
  { x: 10.6, z: 4.5 },
  { x: 11.8, z: 4.5 },
];

/**
 * **Die Baupläne eines Abends** — ein Tisch (solange Platz ist), eine Station
 * (solange eine fehlt; an geraden Tagen zuerst der Grill, an ungeraden das
 * Brett) und Deko, aus dem Würfel des Tages gezogen. Derselbe Tag gibt
 * dieselben Pläne: Wer die Glocke nicht läutet und wiederkommt, findet
 * dasselbe vor.
 *
 * `owned` sind die Ids dessen, was schon steht — jede Station gibt es nur
 * einmal zu kaufen.
 */
export function dayOffers(
  day: number,
  seed: number,
  tables: number,
  owned: readonly string[] = [],
): ShopItem[] {
  const decor = SHOP_ITEMS.filter((item) => item.kind === 'decor');
  const out: ShopItem[] = [];
  if (tables < MAX_TABLES) out.push(SHOP_ITEMS[0]!);
  const stations = SHOP_ITEMS.filter((item) => item.kind === 'station' && !owned.includes(item.id));
  if (stations.length) out.push(stations[day % stations.length]!);
  let s = (seed ^ Math.imul(day + 1, 0x9e3779b1)) >>> 0 || 1;
  const pool = [...decor];
  while (out.length < OFFERS && pool.length) {
    const r = roll(s);
    s = r.seed;
    out.push(pool.splice(Math.floor(r.value * pool.length), 1)[0]!);
  }
  return out;
}

/** Ein gekauftes, hingestelltes Stück — die Kachel (bei Tischen die Nordwestkachel). */
export interface Placed {
  readonly item: string;
  readonly x: number;
  readonly z: number;
}

/**
 * **Alle Tische** — die festen vier und die gekauften, in der Reihenfolge, in
 * der sie dazukamen. Der Index ist die Tischnummer des Tages (`Guest.table`).
 */
export function allTables(placed: readonly Placed[]): TableSpot[] {
  const out = [...TABLES];
  for (const p of placed) {
    if (shopItem(p.item)?.kind !== 'table') continue;
    out.push(tableSpot(out.length, p.x, p.z, aisleOf(p.x)));
  }
  return out;
}

/**
 * **Die gekauften Stationen** — je eine Kachel in der Küche, die Vorderseite
 * nach Norden (dort steht, wer an ihr arbeitet). Die Ids zählen weiter
 * (`grill-extra-1`), damit sie keiner festen Station in die Quere kommen.
 */
export function extraStations(placed: readonly Placed[]): StationSpot[] {
  const out: StationSpot[] = [];
  for (const p of placed) {
    const item = shopItem(p.item);
    if (item?.kind !== 'station' || !item.station) continue;
    out.push({
      id: `${item.id}-extra-${out.length + 1}`,
      kind: item.station,
      x: p.x,
      z: p.z,
      label: item.stationLabel ?? item.label,
      model: item.model,
      face: DIR_N,
    });
  }
  return out;
}

/**
 * **Wo eine gekaufte Station hindarf**: die Reihe direkt nördlich der
 * Durchreiche (`z = 2`), von der Westwand bis zu ihrem Ende. Die Reihe davor
 * (`z = 1`) bleibt frei — dort steht, wer an der Nordwand arbeitet, und
 * jetzt auch, wer an der neuen Station arbeitet. Östlich davon ist der
 * Durchgang in den Gastraum.
 */
export const STATION_ROW = { z: 2, x0: 0, x1: 10 } as const;

/** Auf welcher Seite der Gang eines gekauften Tisches liegt — zur Mitte des Raums hin. */
function aisleOf(x: number): typeof DIR_E | typeof DIR_W {
  return x + 1 < ROOM.x + ROOM.w / 2 ? DIR_E : DIR_W;
}

/** Die Kacheln, die ein Stück belegt (ein Tisch zwei mal zwei, Deko eine). */
export function footprint(item: string, x: number, z: number): string[] {
  if (shopItem(item)?.kind !== 'table') return [`${x},${z}`];
  return [`${x},${z}`, `${x + 1},${z}`, `${x},${z + 1}`, `${x + 1},${z + 1}`];
}

/** Die Kacheln, auf denen alles Gekaufte steht — für den Weg der Gäste (`routePlan`). */
export function placedTiles(placed: readonly Placed[]): string[] {
  return placed.flatMap((p) => footprint(p.item, p.x, p.z));
}

/**
 * **Was frei bleiben muss**: die Stühle und die Plätze davor an jedem Tisch,
 * und die Tür samt der Kachel dahinter.
 */
function keepClear(tables: readonly TableSpot[]): Set<string> {
  const out = new Set<string>();
  const put = (x: number, z: number): void => void out.add(`${Math.floor(x)},${Math.floor(z)}`);
  for (const t of tables) {
    put(t.seat.x - 0.5, t.seat.z);
    put(t.seat.x + 0.5, t.seat.z);
    put(t.approach.x, t.approach.z);
    put(t.other.x, t.other.z - 0.5);
    put(t.other.x, t.other.z + 0.5);
    put(t.otherApproach.x, t.otherApproach.z);
  }
  for (const x of DOOR_X) {
    put(x, ROOM.z + ROOM.d - 1);
    put(x, ROOM.z + ROOM.d - 2);
  }
  for (const spot of OFFER_SPOTS) put(spot.x, spot.z);
  return out;
}

/**
 * **Was schon im Gastraum steht** — die Einrichtung aus `plateUpDecor`, die
 * auf dem Boden steht (Lampen, Kakteen, Automaten), und alles mit Körper.
 * Wandbilder und Teppiche nicht: Unter einem Bild ist Platz, auf einem
 * Teppich auch.
 */
function decorTiles(): string[] {
  const out: string[] = [];
  for (const piece of DECOR) {
    const floor = piece.source === 'kaykit' && piece.y === undefined && piece.width === undefined;
    if (!floor && !piece.solid) continue;
    const tx = Math.floor(piece.x);
    const tz = Math.floor(piece.z);
    if (tx < ROOM.x || tx >= ROOM.x + ROOM.w || tz < DINING_AREA.z || tz >= ROOM.z + ROOM.d)
      continue;
    out.push(`${tx},${tz}`);
  }
  return out;
}

export type PlaceCheck = { readonly ok: true } | { readonly ok: false; readonly why: string };

/**
 * **Darf dieses Stück hier hin?** — und wenn nicht, warum.
 *
 * Es muss im Gastraum stehen, auf freien Kacheln, keinem Stuhl und keiner Tür
 * im Weg — und danach muss **jeder** Tisch von der Tür und aus der Küche noch
 * zu erreichen sein. Ein Kaktus, der den einzigen Gang zu Tisch 3 zustellt,
 * ist ein Kaktus, der den Laden zumacht.
 */
export function placeCheck(
  item: string,
  x: number,
  z: number,
  placed: readonly Placed[],
): PlaceCheck {
  const kind = shopItem(item)?.kind;
  if (!kind) return { ok: false, why: 'Unbekannter Bauplan' };
  const tiles = footprint(item, x, z);
  const inside = (key: string): boolean => {
    const [tx, tz] = key.split(',').map(Number) as [number, number];
    return (
      tx >= DINING_AREA.x &&
      tx < DINING_AREA.x + DINING_AREA.w &&
      tz >= DINING_AREA.z &&
      tz < DINING_AREA.z + DINING_AREA.d
    );
  };
  if (kind === 'station') return stationCheck(x, z, placed);
  if (!tiles.every(inside)) return { ok: false, why: 'Nur im Gastraum' };
  if (kind === 'table') {
    if (allTables(placed).length >= MAX_TABLES)
      return { ok: false, why: 'Mehr Tische passen nicht' };
    // Die Stuhlreihe nördlich braucht Platz, die Türreihe bleibt frei.
    if (z - 1 < DINING_AREA.z || z + 1 >= ROOM.z + ROOM.d - 1) {
      return { ok: false, why: 'Zu nah an der Wand — die Stühle brauchen Platz' };
    }
  }
  const taken = blockedTiles();
  for (const key of placedTiles(placed)) taken.add(key);
  for (const key of decorTiles()) taken.add(key);
  if (tiles.some((key) => taken.has(key))) return { ok: false, why: 'Da steht schon etwas' };
  const before = allTables(placed);
  const clear = keepClear(before);
  if (tiles.some((key) => clear.has(key))) {
    return { ok: false, why: 'Da muss man durch — Stühle und Tür bleiben frei' };
  }
  const after = [...placed, { item, x, z }];
  const tables = allTables(after);
  if (kind === 'table') {
    // Der neue Tisch selbst darf keinen fremden Stuhl zustellen, und seine
    // eigenen Stühle keine fremden Möbel.
    const mine = keepClear([tables[tables.length - 1]!]);
    const own = new Set(tiles);
    for (const key of mine)
      if (!own.has(key) && taken.has(key)) {
        return { ok: false, why: 'Die Stühle hätten keinen Platz' };
      }
  }
  const plan = routePlan(placedTiles(after));
  const door = tileKey(Math.floor(DOOR_INSIDE.x), Math.floor(DOOR_INSIDE.z));
  const kitchen = tileKey(12, DINING_AREA.z);
  for (const t of tables) {
    for (const spot of [t.approach, t.otherApproach]) {
      const goal = tileKey(Math.floor(spot.x), Math.floor(spot.z));
      for (const from of [door, kitchen]) {
        const found = findPath(plan.graph, from, goal, { profile: HUMAN_PROFILE });
        if (!found.complete)
          return { ok: false, why: `Dann käme niemand mehr an Tisch ${t.index + 1}` };
      }
    }
  }
  return { ok: true };
}

/** Die Prüfung für eine Station: nur in die Küchenreihe vor der Durchreiche, auf Freies. */
function stationCheck(x: number, z: number, placed: readonly Placed[]): PlaceCheck {
  if (z !== STATION_ROW.z || x < STATION_ROW.x0 || x > STATION_ROW.x1) {
    return { ok: false, why: 'Stationen nur in die Küche, vor die Durchreiche' };
  }
  if (x === SPAWN_TILE.x && z === SPAWN_TILE.z) {
    return { ok: false, why: 'Hier fängt man morgens an — bitte daneben' };
  }
  const key = `${x},${z}`;
  if (blockedTiles().has(key) || placedTiles(placed).includes(key)) {
    return { ok: false, why: 'Da steht schon etwas' };
  }
  return { ok: true };
}

/**
 * **Kaufen**: Hat die Kasse genug, kommt das Stück dazu und das Geld weg.
 * `null`, wenn es nicht reicht oder der Platz nicht passt.
 */
export function buy(
  total: number,
  placed: readonly Placed[],
  item: string,
  x: number,
  z: number,
): { total: number; placed: Placed[] } | null {
  const it = shopItem(item);
  if (!it || total < it.cost) return null;
  if (!placeCheck(item, x, z, placed).ok) return null;
  return { total: total - it.cost, placed: [...placed, { item, x, z }] };
}

/** Wie viele Deko-Stücke stehen (`plateUpGame.decorPatience`). */
export function decorCount(placed: readonly Placed[]): number {
  return placed.filter((p) => shopItem(p.item)?.kind === 'decor').length;
}

/**
 * **Wo ein Stück landet, wenn man mit dem Bauplan hier steht** — die Kachel
 * vor der Figur, bei einem Tisch so, dass seine Mitte davor liegt.
 */
export function aimTile(
  item: string,
  feetX: number,
  feetZ: number,
  forwardX: number,
  forwardZ: number,
): { x: number; z: number } {
  const len = Math.hypot(forwardX, forwardZ) || 1;
  const table = shopItem(item)?.kind === 'table';
  const reach = table ? 1.8 : 1.1;
  const px = feetX + (forwardX / len) * reach;
  const pz = feetZ + (forwardZ / len) * reach;
  if (table) return { x: Math.round(px) - 1, z: Math.round(pz) - 1 };
  return { x: Math.floor(px), z: Math.floor(pz) };
}
