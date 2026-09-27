import {
  EAT_SECONDS,
  MENU,
  THANK_SECONDS,
  seatGuests,
  serveTable,
  stepGuests,
  wishOf,
  type WishGuest,
} from './guestWishes';
import { diningTables } from './restaurantPlan';

function run(guests: WishGuest[], seconds: number): WishGuest[] {
  let now = guests;
  for (let t = 0; t < seconds; t += 0.1) now = stepGuests(now, 0.1);
  return now;
}

describe('Test Restaurant — Gäste mit Wünschen', () => {
  const tables = diningTables();

  it('setzt an jeden Stuhl einen Gast mit einem Wunsch von der Karte', () => {
    const guests = seatGuests(tables);
    expect(guests).toHaveLength(tables.reduce((sum, t) => sum + t.seats.length, 0));
    for (const guest of guests) {
      expect(guest.phase).toBe('waiting');
      expect(MENU.map((dish) => dish.id)).toContain(guest.wish);
    }
  });

  it('wünscht sich an einem Tisch nicht überall dasselbe', () => {
    const guests = seatGuests(tables);
    for (const t of tables) {
      const wishes = guests.filter((guest) => guest.table === t.index).map((one) => one.wish);
      expect(new Set(wishes).size).toBe(wishes.length);
    }
  });

  it('wünscht sich nie zweimal hintereinander dasselbe', () => {
    for (let served = 0; served < 20; served++)
      expect(wishOf(1, 2, served)).not.toBe(wishOf(1, 2, served + 1));
  });

  it('gibt das Gericht dem, der es wollte — der isst, bedankt sich und wünscht Neues', () => {
    const guests = seatGuests(tables);
    const target = guests[1]!;
    const served = serveTable(guests, target.table, target.wish);
    expect(served.ok).toBe(true);
    if (!served.ok) return;
    expect(served.guest).toMatchObject({ seat: target.seat, phase: 'eating' });
    const eaten = run(served.guests, EAT_SECONDS + 0.05);
    expect(eaten[1]!.phase).toBe('thanks');
    const again = run(eaten, THANK_SECONDS + 0.05);
    expect(again[1]).toMatchObject({ phase: 'waiting', served: 1 });
    expect(again[1]!.wish).not.toBe(target.wish);
  });

  it('lässt ein Gericht in der Hand, das an diesem Tisch niemand will', () => {
    const guests = seatGuests(tables);
    const wanted = new Set(guests.filter((one) => one.table === 0).map((one) => one.wish));
    const unwanted = MENU.find((dish) => !wanted.has(dish.id))!;
    const result = serveTable(guests, 0, unwanted.id);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain(`${unwanted.label} will hier niemand`);
  });
});
