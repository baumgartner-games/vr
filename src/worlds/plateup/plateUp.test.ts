import {
  DOOR_INSIDE,
  DOOR_OUTSIDE,
  ROOM,
  SPAWN_TILE,
  STATIONS,
  STREET_ENDS,
  TABLES,
  blockedTiles,
  guestRoute,
  plateUpGrid,
  routePlan,
} from './plateUpPlan';
import {
  EAT_SECONDS,
  MENU,
  bill,
  boardLine,
  clockText,
  dayRules,
  freeTables,
  guestAt,
  guestGone,
  newShift,
  openDay,
  plateRecipe,
  seatGuest,
  sendHome,
  serveTable,
  signText,
  stepShift,
  type Shift,
} from './plateUpGame';
import {
  freshStations,
  stationDeed,
  tickStation,
  useStation,
  type StationState,
} from './plateUpStations';
import { dish, type Dish } from '../test/zones/kitchenRecipes';
import { tileKey } from '../nav/navTile';

describe('Burgerladen: Grundriss', () => {
  test('jede Station und jeder Tisch liegt im Laden, keine zwei auf derselben Kachel', () => {
    const seen = new Set<string>();
    for (const s of STATIONS) {
      expect(s.x).toBeGreaterThanOrEqual(ROOM.x);
      expect(s.x).toBeLessThan(ROOM.x + ROOM.w);
      const key = `${s.x},${s.z}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    for (const t of TABLES) {
      for (let dx = 0; dx < 2; dx++) {
        for (let dz = 0; dz < 2; dz++) {
          const key = `${t.x + dx},${t.z + dz}`;
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }
      }
    }
  });

  test('die Welt hat Boden unter dem Startplatz und auf dem Gehweg', () => {
    const plan = plateUpGrid();
    expect(plan.graph.walkable(tileKey(SPAWN_TILE.x, SPAWN_TILE.z))).toBe(true);
    for (const end of STREET_ENDS) {
      expect(plan.graph.walkable(tileKey(Math.floor(end.x), Math.floor(end.z)))).toBe(true);
    }
  });

  test('von beiden Enden des Gehwegs führt ein Weg durch die Tür an jeden Tisch', () => {
    const plan = routePlan();
    const blocked = blockedTiles();
    for (const end of STREET_ENDS) {
      for (const t of TABLES) {
        const route = [
          ...guestRoute(plan, end, DOOR_OUTSIDE),
          ...guestRoute(plan, DOOR_OUTSIDE, DOOR_INSIDE),
          ...guestRoute(plan, DOOR_INSIDE, t.approach),
        ];
        expect(route[route.length - 1]).toEqual(t.approach);
        // Kein Wegpunkt auf einem Möbel.
        for (const p of route) {
          expect(blocked.has(`${Math.floor(p.x)},${Math.floor(p.z)}`)).toBe(false);
        }
      }
    }
  });

  test('der Stuhl des Gastes steht neben seinem Tisch und nicht darin', () => {
    const blocked = blockedTiles();
    for (const t of TABLES) {
      expect(blocked.has(`${Math.floor(t.seat.x)},${Math.floor(t.seat.z)}`)).toBe(false);
      expect(t.seat.z).toBeLessThan(t.z);
    }
  });
});

describe('Burgerladen: der Tag', () => {
  test('vor dem ersten Tag passiert nichts, bis jemand öffnet', () => {
    const shift = newShift(7);
    expect(stepShift(shift, 100, 4).events).toEqual([]);
    const open = openDay(shift);
    expect(open.phase).toBe('open');
    expect(open.day).toBe(1);
    // Mitten im Betrieb tut der Knopf nichts.
    expect(openDay(open)).toBe(open);
  });

  test('die Schwierigkeit steigt: dichter, ungeduldiger, längere Karte', () => {
    for (let day = 1; day < 8; day++) {
      const a = dayRules(day);
      const b = dayRules(day + 1);
      expect(b.gap).toBeLessThanOrEqual(a.gap);
      expect(b.patience).toBeLessThanOrEqual(a.patience);
      expect(b.menu).toBeGreaterThanOrEqual(a.menu);
    }
    expect(dayRules(1).menu).toBe(1);
    expect(dayRules(4).menu).toBe(MENU.length);
  });

  test('ein Gast kommt, setzt sich, wird bedient, isst, zahlt und geht', () => {
    let shift = openDay(newShift(3));
    const tick = stepShift(shift, 3.1, 4);
    const arrive = tick.events.find((e) => e.kind === 'arrive');
    expect(arrive).toBeDefined();
    shift = tick.shift;
    const guest = shift.guests[0]!;
    expect(guest.order).toBe('hamburger');
    // Die Geduld läuft erst, wenn er sitzt.
    shift = stepShift(shift, 2, 4).shift;
    expect(shift.guests[0]!.patience).toBe(guest.patienceMax);
    shift = seatGuest(shift, guest.id);
    shift = stepShift(shift, 5, 4).shift;
    expect(shift.guests.find((g) => g.id === guest.id)!.patience).toBeCloseTo(
      guest.patienceMax - 5,
    );

    const burger = dish('plate', ['bun', 'patty-cooked']);
    const wrong = serveTable(shift, guest.table, dish('plate', ['bun']));
    expect(wrong.ok).toBe(false);
    const served = serveTable(shift, guest.table, burger);
    expect(served.ok).toBe(true);
    if (!served.ok) return;
    shift = served.shift;
    expect(shift.served).toBe(1);
    const paid = stepShift(shift, EAT_SECONDS + 0.01, 4);
    const pay = paid.events.find((e) => e.kind === 'paid');
    expect(pay && pay.kind === 'paid' && pay.coins).toBeGreaterThan(MENU[0]!.price);
    shift = paid.shift;
    expect(shift.coins).toBeGreaterThan(0);
    const leaving = shift.guests.find((g) => g.id === guest.id)!;
    expect(leaving.phase).toBe('walkOut');
    expect(leaving.happy).toBe(true);
    // Beim Gehen ist sein Tisch schon frei.
    expect(guestAt(shift, guest.table)).toBeNull();
    shift = guestGone(shift, guest.id);
    expect(shift.guests.find((g) => g.id === guest.id)).toBeUndefined();
  });

  test('wer zu lange wartet, geht unzufrieden — und drei davon schließen den Laden', () => {
    let shift = openDay(newShift(11));
    let angry = 0;
    let over = false;
    for (let t = 0; t < 600 && !over; t++) {
      const tick = stepShift(shift, 1, 4);
      shift = tick.shift;
      for (const e of tick.events) {
        if (e.kind === 'arrive') shift = seatGuest(shift, e.guest.id);
        if (e.kind === 'angry') {
          angry++;
          expect(e.guest.happy).toBe(false);
          shift = guestGone(shift, e.guest.id);
        }
        if (e.kind === 'gameOver') over = true;
      }
    }
    expect(over).toBe(true);
    expect(angry).toBe(dayRules(1).lives);
    expect(shift.phase).toBe('over');
    expect(signText(shift).title).toMatch(/zu/);
    // Wer noch sitzt, geht nach Hause.
    expect(sendHome(shift).guests.every((g) => g.phase === 'walkOut')).toBe(true);
    // Und von vorn: Tag 1, leere Kasse.
    const again = openDay(shift);
    expect(again.day).toBe(1);
    expect(again.total).toBe(0);
  });

  test('ein ganzer Tag, perfekt bedient: Ladenschluss, dann Bilanz, dann Tag 2', () => {
    let shift = openDay(newShift(5));
    let closing = false;
    let dayOver = false;
    for (let t = 0; t < 400 && !dayOver; t++) {
      const tick = stepShift(shift, 0.5, 4);
      shift = tick.shift;
      for (const e of tick.events) {
        if (e.kind === 'arrive') {
          shift = seatGuest(shift, e.guest.id);
          const result = serveTable(shift, e.guest.table, burgerFor(e.guest.order));
          expect(result.ok).toBe(true);
          if (result.ok) shift = result.shift;
        }
        if (e.kind === 'paid') shift = guestGone(shift, e.guest.id);
        if (e.kind === 'closing') closing = true;
        if (e.kind === 'dayOver') dayOver = true;
      }
      if (shift.phase === 'closed') dayOver = true;
    }
    expect(closing).toBe(true);
    expect(dayOver).toBe(true);
    expect(shift.phase).toBe('closed');
    expect(shift.served).toBeGreaterThanOrEqual(4);
    expect(shift.lost).toBe(0);
    const total = shift.total;
    expect(signText(shift).title).toMatch(/Tag 1/);
    const next = openDay(shift);
    expect(next.day).toBe(2);
    expect(next.total).toBe(total);
    expect(next.coins).toBe(0);
  });

  test('ein voller Laden lässt den nächsten Gast draußen warten', () => {
    let shift: Shift = openDay(newShift(9));
    for (let t = 0; t < 200; t++) {
      const tick = stepShift(shift, 1, 1);
      shift = tick.shift;
      for (const e of tick.events) if (e.kind === 'arrive') shift = seatGuest(shift, e.guest.id);
      expect(shift.guests.filter((g) => g.phase !== 'walkOut').length).toBeLessThanOrEqual(1);
      if (shift.phase === 'over') break;
    }
    expect(freeTables(shift, 1).length).toBeLessThanOrEqual(1);
  });

  test('Trinkgeld nach Geduld, Uhr und Anzeige', () => {
    const base = {
      id: 1,
      table: 0,
      order: 'hamburger',
      phase: 'waiting' as const,
      patienceMax: 60,
      eat: 0,
      happy: null,
    };
    expect(bill({ ...base, patience: 60 })).toBe(15);
    expect(bill({ ...base, patience: 0 })).toBe(10);
    expect(clockText(65)).toBe('1:05');
    expect(boardLine(openDay(newShift()))).toMatch(/^Tag 1 · 1:15 · bedient 0/);
  });

  test('nur ein Teller mit genau dem Rezept zählt', () => {
    expect(plateRecipe(dish('plate', ['bun', 'patty-cooked']))?.id).toBe('hamburger');
    expect(plateRecipe(dish('bun', ['patty-cooked']))).toBeNull();
    expect(plateRecipe(dish('plate', ['bun', 'patty-cooked', 'lettuce-cut']))?.id).toBe('salat');
    expect(plateRecipe(dish('plate', ['bun', 'patty']))).toBeNull();
  });
});

describe('Burgerladen: Stationen', () => {
  const find = (states: StationState[], id: string): number =>
    states.findIndex((s) => s.spot.id === id);

  test('die ganze Kette: Teller, Brötchen, Patty braten, Salat schneiden, zusammenlegen', () => {
    let stations = freshStations(STATIONS);
    let held: Dish | null = null;
    const use = (id: string): void => {
      const i = find(stations, id);
      const r = useStation(held, stations[i]!);
      held = r.held;
      stations = stations.map((s, j) => (j === i ? r.station : s));
    };
    const run = (id: string, seconds: number, near: boolean): boolean => {
      const i = find(stations, id);
      let done = false;
      for (let t = 0; t < seconds * 10; t++) {
        const r = tickStation(stations[i]!, 0.1, near);
        stations = stations.map((s, j) => (j === i ? r.station : s));
        done ||= r.done;
      }
      return done;
    };

    use('patties');
    expect(held).toEqual(dish('patty'));
    use('grill-1');
    expect(held).toBeNull();
    // Die Grillplatte brät auch allein — und verbrennt nichts.
    expect(run('grill-1', 6, false)).toBe(true);
    expect(stations[find(stations, 'grill-1')]!.on).toEqual(dish('patty-cooked'));
    run('grill-1', 20, false);
    expect(stations[find(stations, 'grill-1')]!.on).toEqual(dish('patty-cooked'));

    use('lettuce');
    use('board');
    // Das Brett schneidet nur mit jemandem davor.
    expect(run('board', 5, false)).toBe(false);
    expect(run('board', 4, true)).toBe(true);
    expect(stations[find(stations, 'board')]!.on).toEqual(dish('lettuce-cut'));

    use('plates');
    expect(held).toEqual(dish('plate'));
    use('buns');
    expect(held!.item).toBe('plate');
    use('grill-1');
    use('board');
    expect(plateRecipe(held)?.id).toBe('salat');
    expect(stations[find(stations, 'grill-1')]!.on).toBeNull();
  });

  test('der Mülleimer nimmt den Belag und lässt den Teller in der Hand', () => {
    const stations = freshStations(STATIONS);
    const bin = stations.find((s) => s.spot.kind === 'bin')!;
    const r = useStation(dish('plate', ['bun']), bin);
    expect(r.held).toEqual(dish('plate'));
    expect(stationDeed(null, bin).do).toBe('nothing');
  });

  test('auf der Durchreiche wird abgestellt und wieder genommen', () => {
    const stations = freshStations(STATIONS);
    const pass = stations.find((s) => s.spot.id === 'pass-5')!;
    const put = useStation(dish('plate', ['bun', 'patty-cooked']), pass);
    expect(put.held).toBeNull();
    const back = useStation(null, put.station);
    expect(back.held).toEqual(dish('plate', ['bun', 'patty-cooked']));
    expect(back.station.on).toBeNull();
  });
});

function burgerFor(order: string): Dish {
  const need = MENU.find((m) => m.recipe === order)!;
  switch (need.recipe) {
    case 'salat':
      return dish('plate', ['bun', 'patty-cooked', 'lettuce-cut']);
    case 'tomate':
      return dish('plate', ['bun', 'patty-cooked', 'tomato-cut']);
    case 'deluxe':
      return dish('plate', ['bun', 'patty-cooked', 'lettuce-cut', 'tomato-cut']);
    default:
      return dish('plate', ['bun', 'patty-cooked']);
  }
}
