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

/** Eine Kachel: Spalte und Reihe. */
interface FloorTile {
  readonly x: number;
  readonly z: number;
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
