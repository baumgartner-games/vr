import type { FloorCorner } from '../grid/solids';

/**
 * **Die Bodenbeläge** — was man in einem Raum auf den Boden legt.
 *
 * Gewünscht (September 2026): _„Ich will nun auch noch neben Tapeten
 * vorratskisten für Boden Beläge haben wollen für Räume. Z.B. den Küchen
 * Boden oder prototype floor oder für Gäste. Gleiches Prinzip."_
 *
 * Anders als die Tapeten sind die Beläge **Stücke aus dem Regal** — dieselben
 * Platten, die die Welten ohnehin auf ihre Kacheln legen
 * (`GridWorld.floorPlate`): die Prototyp-Platte der Testwelten, die
 * Küchenfliesen und die Dielen des Gastraums aus dem Restaurant, dazu dunkle
 * Dielen und Steinplatten aus dem Verlies. Keine Ausnahme von der Regel also.
 */

/** Ein Belag: Id, Name im Katalog, die Platte je Kachel und ein Farbfeld. */
export interface Flooring {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly swatch: string;
  /**
   * **Wie viele Kacheln die Platte aus dem Regal breit ist** — die Prototyp-
   * Platte ist doppelt so groß wie die anderen (gemeldet: _„Prototype floor ist
   * zu groß als item"_). Auf dem Boden legt die Welt sie ohnehin auf eine
   * Kachel; in der Kiste und in der Hand wird sie darum kleiner gezeigt.
   */
  readonly tiles?: number;
}

export const FLOORINGS: readonly Flooring[] = [
  {
    id: 'proto',
    label: 'Prototyp-Boden',
    path: 'prototype-bits/Floor_Prototype.glb',
    swatch: '#3493ce',
    tiles: 2,
  },
  {
    id: 'kitchen',
    label: 'Küchenfliesen',
    path: 'restaurant-bits/floor_kitchen_small.glb',
    swatch: '#e6e8ea',
  },
  {
    id: 'kitchen-b',
    label: 'Küchenfliesen B',
    path: 'restaurant-bits/floor_kitchen_small_styleB.glb',
    swatch: '#d9dcdf',
  },
  {
    id: 'wood',
    label: 'Dielen Gastraum',
    path: 'dungeon/floor_wood_small.glb',
    swatch: '#b3664a',
  },
  {
    id: 'wood-dark',
    label: 'Dielen dunkel',
    path: 'dungeon/floor_wood_small_dark.glb',
    swatch: '#6e3f2e',
  },
  { id: 'stone', label: 'Steinplatten', path: 'dungeon/floor_tile_small.glb', swatch: '#8f8b85' },
];

export function flooringById(id: string): Flooring | null {
  return FLOORINGS.find((one) => one.id === id) ?? null;
}

/** **Das Ding in der Hand zu einem Belag** — `floor-kitchen` ist `kitchen`. */
export function flooringItem(id: string): string {
  return `floor-${id}`;
}

/** Welcher Belag ein Ding der Küche ist — oder `null`, wenn es keiner ist. */
export function flooringOfItem(item: string | null | undefined): Flooring | null {
  if (!item?.startsWith('floor-')) return null;
  return flooringById(item.slice('floor-'.length));
}

/**
 * Eine Kachel: Spalte und Reihe — und, wenn eine Wand unter 45° hindurchgeht,
 * die Ecke, deren Dreieck der Belag **nicht** bekommt (`halveSlanted`).
 */
interface FloorTile {
  readonly x: number;
  readonly z: number;
  readonly empty?: FloorCorner;
}

/** Wohin der Belag in der Hand käme — und ob er dabei in der Hand bleibt. */
export interface FlooringAim {
  readonly tiles: FloorTile[];
  /** `true` im geschlossenen Raum: dann ist der Belag danach aufgebraucht. */
  readonly room: boolean;
}

/**
 * **Wohin der Belag kommt** — gemeldet: _„Ich will den Boden legen können,
 * auch wenn noch keine Wände gesetzt sind. Wenn ich erst eine Treppe setze und
 * dann die Wände, fehlt mir der floor."_
 *
 * - **Im geschlossenen Raum** (`room`) jede Kachel davon, auf die Boden darf —
 *   auch wo noch keiner liegt: Oben über einer Treppe im Freien gibt es anfangs
 *   nur den Stand, und die Wände drumherum machen noch keinen Boden.
 * - **Ohne Raum** die Kachel vor einem (`ahead`) — eine nach der anderen,
 *   solange man den Belag trägt.
 *
 * @param layable ob auf diese Kachel Boden darf (kein Loch über einer Treppe,
 *   unten nicht über den Rand der Welt)
 */
export function flooringAim(
  room: readonly FloorTile[] | null,
  ahead: FloorTile,
  layable: (tile: FloorTile) => boolean,
): FlooringAim | null {
  if (room) {
    const tiles = room.filter(layable);
    return tiles.length > 0 ? { tiles, room: true } : null;
  }
  return layable(ahead) ? { tiles: [ahead], room: false } : null;
}

/** Die Kacheln an den beiden Kanten einer Ecke: `ne` → Norden und Osten. */
function besideCorner(tile: FloorTile, corner: FloorCorner): FloorTile[] {
  const dz = corner === 'nw' || corner === 'ne' ? -1 : 1;
  const dx = corner === 'nw' || corner === 'sw' ? -1 : 1;
  return [
    { x: tile.x, z: tile.z + dz },
    { x: tile.x + dx, z: tile.z },
  ];
}

/**
 * **Auf einer Kachel mit einer Wand unter 45° nur die eine Hälfte** —
 * gewünscht (September 2026): _„beim setzen des boden gibt es bei diagonalen
 * wänden noch ein problem. In der welt haunting haben wir das gelöst, dass
 * auch nur diagonale bodenteile eingefärbt werden können. Das soll an sich
 * auch möglich sein, wenn ich einen boden lege."_ Wie der halbe Boden der
 * Station (`GridPlan.halfFloor`), nur dass die andere Hälfte ihren Belag
 * behält, statt leer zu werden.
 *
 * - **Im Raum** bekommt der Belag die Hälfte, an deren Kanten der Raum liegt;
 *   leer bleibt die Ecke, an der weniger Kacheln des Raums liegen. Gleich
 *   viele (man steht auf der Schräge selbst): die ganze Kachel.
 * - **Ohne Raum** die Hälfte zum Spieler hin (`from`): leer bleibt die Ecke,
 *   die weiter weg ist.
 *
 * @param slanted die Kacheln mit einer Wand unter 45° und die beiden Ecken,
 *   die sie trennt (`roomTrace.slantedTiles`)
 */
export function halveSlanted(
  aim: FlooringAim,
  slanted: ReadonlyMap<string, readonly [FloorCorner, FloorCorner]>,
  from: { readonly x: number; readonly z: number },
): FlooringAim {
  const inRoom = new Set(aim.tiles.map((tile) => `${tile.x},${tile.z}`));
  const tiles = aim.tiles.map((tile): FloorTile => {
    const corners = slanted.get(`${tile.x},${tile.z}`);
    if (!corners) return { x: tile.x, z: tile.z };
    const [a, b] = corners;
    let empty: FloorCorner | null;
    if (aim.room) {
      const count = (corner: FloorCorner): number =>
        besideCorner(tile, corner).filter((one) => inRoom.has(`${one.x},${one.z}`)).length;
      empty = count(a) < count(b) ? a : count(b) < count(a) ? b : null;
    } else {
      const far = (corner: FloorCorner): number => {
        const cx = tile.x + (corner === 'ne' || corner === 'se' ? 1 : 0);
        const cz = tile.z + (corner === 'se' || corner === 'sw' ? 1 : 0);
        return Math.hypot(cx - from.x, cz - from.z);
      };
      empty = far(a) >= far(b) ? a : b;
    }
    return empty ? { x: tile.x, z: tile.z, empty } : { x: tile.x, z: tile.z };
  });
  return { tiles, room: aim.room };
}
