import { bits } from './restaurantPlan';

/**
 * **Gäste, die etwas Fertiges wollen** — gewünscht: _„Gäste die an einem
 * Tisch sitzen und ein fertiges Essen (Vorrats Box) wollen und man es auf den
 * Tisch ablegen soll. (Die Gäste zeigen in der Nähe ein Icon in einer Blase
 * was sie wünschen)"_.
 *
 * Jeder Gast sitzt an einem Tisch und wünscht sich ein Gericht aus der Karte
 * (`MENU`). Man holt es fertig aus seiner Vorratsbox und legt es auf seinen
 * Tisch (`serveTable`); wer es wollte, isst, bedankt sich und wünscht sich
 * danach etwas anderes (`stepGuests`).
 *
 * Reine Rechnung ohne Szene und ohne Zufall — dieselbe Folge von Wünschen bei
 * jedem Laden, damit ein Test sie nachrechnen kann (`guestWishes.test.ts`).
 */

/** Ein Gericht aus einer Vorratsbox. */
export interface MenuDish {
  readonly id: string;
  readonly label: string;
  /** Das fertige Essen — so steht es auf dem Tisch und in der Blase. */
  readonly model: string;
}

export const MENU: readonly MenuDish[] = [
  { id: 'burger', label: 'Burger', model: bits('food_burger') },
  { id: 'pizza', label: 'Pizza', model: bits('food_pizza_pepperoni_plated') },
  { id: 'eis', label: 'Eis', model: bits('food_icecream_cone_strawberry') },
  { id: 'suppe', label: 'Suppe', model: bits('food_stew') },
  { id: 'steak', label: 'Steak', model: bits('food_dinner') },
];

export function menuDish(id: string): MenuDish | undefined {
  return MENU.find((dish) => dish.id === id);
}

/** Wie lange ein Gast isst, in Sekunden. */
export const EAT_SECONDS = 5;
/** Wie lange er sich danach bedankt, bevor er sich etwas Neues wünscht. */
export const THANK_SECONDS = 2;

export type GuestPhase = 'waiting' | 'eating' | 'thanks';

export interface WishGuest {
  readonly table: number;
  readonly seat: number;
  readonly wish: string;
  readonly phase: GuestPhase;
  /** Wie lange er schon in dieser Phase ist. */
  readonly clock: number;
  /** Wie oft er schon bedient wurde — daraus folgt der nächste Wunsch. */
  readonly served: number;
}

/**
 * **Der Wunsch des Gastes** an Platz `seat` von Tisch `table`, nachdem er
 * `served`-mal bedient wurde. Verteilt, damit nicht alle dasselbe wollen, und
 * nie zweimal hintereinander dasselbe.
 */
export function wishOf(table: number, seat: number, served: number): string {
  const offset = table * 3 + seat;
  return MENU[(offset + served * 2) % MENU.length]!.id;
}

/** Die Gäste, wie sie beim Betreten dasitzen: jeder mit seinem ersten Wunsch. */
export function seatGuests(tables: readonly { seats: readonly unknown[] }[]): WishGuest[] {
  const guests: WishGuest[] = [];
  tables.forEach((t, table) =>
    t.seats.forEach((_, seat) =>
      guests.push({
        table,
        seat,
        wish: wishOf(table, seat, 0),
        phase: 'waiting',
        clock: 0,
        served: 0,
      }),
    ),
  );
  return guests;
}

export type ServeResult =
  | { readonly ok: true; readonly guests: WishGuest[]; readonly guest: WishGuest }
  | { readonly ok: false; readonly reason: string };

/**
 * **Ein Gericht auf den Tisch legen.** Bekommen hat es der erste Gast dieses
 * Tischs, der genau darauf wartet; will es dort niemand, bleibt es in der
 * Hand und eine Zeile sagt, was der Tisch stattdessen will.
 */
export function serveTable(guests: readonly WishGuest[], table: number, dish: string): ServeResult {
  const index = guests.findIndex(
    (guest) => guest.table === table && guest.phase === 'waiting' && guest.wish === dish,
  );
  if (index < 0) {
    const wanted = guests
      .filter((guest) => guest.table === table && guest.phase === 'waiting')
      .map((guest) => menuDish(guest.wish)?.label ?? guest.wish);
    const label = menuDish(dish)?.label ?? dish;
    return {
      ok: false,
      reason: wanted.length
        ? `${label} will hier niemand — gewünscht: ${[...new Set(wanted)].join(', ')}`
        : 'An diesem Tisch wartet gerade niemand',
    };
  }
  const guest: WishGuest = { ...guests[index]!, phase: 'eating', clock: 0 };
  const next = [...guests];
  next[index] = guest;
  return { ok: true, guests: next, guest };
}

/**
 * **Die Uhr der Gäste**: Wer isst, isst `EAT_SECONDS` lang, bedankt sich
 * `THANK_SECONDS` lang und wünscht sich dann das Nächste.
 */
export function stepGuests(guests: readonly WishGuest[], dt: number): WishGuest[] {
  return guests.map((guest) => {
    if (guest.phase === 'waiting') return guest;
    const clock = guest.clock + dt;
    if (guest.phase === 'eating' && clock >= EAT_SECONDS)
      return { ...guest, phase: 'thanks', clock: 0 };
    if (guest.phase === 'thanks' && clock >= THANK_SECONDS) {
      const served = guest.served + 1;
      return {
        ...guest,
        phase: 'waiting',
        clock: 0,
        served,
        wish: wishOf(guest.table, guest.seat, served),
      };
    }
    return { ...guest, clock };
  });
}
