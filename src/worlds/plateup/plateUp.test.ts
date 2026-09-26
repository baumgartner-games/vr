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
  clearDish,
  decorPatience,
  dirtyAt,
  tableWants,
  type Guest,
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
  PLATES,
  burnShare,
  freshStations,
  stationDeed,
  tickStation,
  useStation,
  type StationState,
} from './plateUpStations';
import { dish, type Dish } from '../test/zones/kitchenRecipes';
import { tileKey } from '../nav/navTile';
import { testPlan } from '../test/testPlan';
import { BURGER_GATE, BURGER_GATE_TILE } from '../test/zones/kitchenPlan';
import { findWorld } from '../index';
import { RETURN_GATE } from './plateUpPlan';
import { DECOR } from './plateUpDecor';

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

  test('ein Tor führt aus der Testküche hierher und eines zurück', () => {
    const there = testPlan().fixture(BURGER_GATE);
    expect(there?.kind).toBe('gate');
    expect(there?.props.world).toBe('plateup');
    expect(testPlan().graph.walkable(tileKey(BURGER_GATE_TILE.x, BURGER_GATE_TILE.z))).toBe(true);
    const back = plateUpGrid().fixture(RETURN_GATE);
    expect(back?.props.world).toBe('sandbox');
    expect(findWorld('plateup')?.title).toBe('Restaurant');
  });

  test('kein festes Deko-Stück steht einem Gast im Weg oder auf einer Station', () => {
    const plan = routePlan();
    const walked = new Set<string>();
    for (const end of STREET_ENDS) {
      for (const t of TABLES) {
        for (const p of [
          ...guestRoute(plan, end, DOOR_OUTSIDE),
          ...guestRoute(plan, DOOR_OUTSIDE, DOOR_INSIDE),
          ...guestRoute(plan, DOOR_INSIDE, t.approach),
        ]) {
          walked.add(`${Math.floor(p.x)},${Math.floor(p.z)}`);
        }
      }
    }
    const stations = new Set(STATIONS.map((s) => `${s.x},${s.z}`));
    for (const piece of DECOR) {
      if (!piece.solid || piece.name.startsWith('table_round')) continue;
      const key = `${Math.floor(piece.x)},${Math.floor(piece.z)}`;
      expect({ name: piece.name, key, walked: walked.has(key) }).toEqual({
        name: piece.name,
        key,
        walked: false,
      });
      expect(stations.has(key)).toBe(false);
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
      seat: 0,
      group: 1,
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
    // Die Grillplatte brät auch allein — und das Gebratene hält eine Weile.
    expect(run('grill-1', 6, false)).toBe(true);
    expect(stations[find(stations, 'grill-1')]!.on).toEqual(dish('patty-cooked'));
    run('grill-1', 5, false);
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

describe('Burgerladen: Verbrennen, Geschirr, Spüle', () => {
  const at = (states: StationState[], id: string): StationState =>
    states.find((s) => s.spot.id === id)!;

  test('ein gebratenes Patty wird nach `burn` Sekunden schwarz — und nur noch Müll', () => {
    const grill = at(freshStations(STATIONS), 'grill-1');
    let state = useStation(dish('patty'), grill).station;
    let burnt = false;
    for (let t = 0; t < 60; t++) {
      const r = tickStation(state, 0.1, false, false, 3);
      state = r.station;
    }
    expect(state.on).toEqual(dish('patty-cooked'));
    expect(burnShare(state, 3)).toBeGreaterThan(0);
    for (let t = 0; t < 40 && !burnt; t++) {
      const r = tickStation(state, 0.1, false, false, 3);
      state = r.station;
      burnt = r.burnt;
    }
    expect(burnt).toBe(true);
    expect(state.on).toEqual(dish('patty-burnt'));
    expect(burnShare(state, 3)).toBe(0);
    // Auf einen Teller geht es nicht mehr.
    expect(useStation(dish('plate', ['bun']), state).held).toEqual(dish('plate', ['bun']));
    // Rechtzeitig genommen, ist die Uhr wieder bei null.
    const fresh = useStation(dish('patty'), grill).station;
    let s2 = fresh;
    for (let t = 0; t < 70; t++) s2 = tickStation(s2, 0.1, false, false, 3).station;
    const took = useStation(dish('plate', ['bun']), s2);
    expect(took.held).toEqual(dish('plate', ['bun', 'patty-cooked']));
    expect(took.station.heat).toBe(0);
  });

  test('die Schwierigkeit: Tag 1 allein und nachsichtig, danach Paare und heißere Platten', () => {
    expect(dayRules(1).pairs).toBe(0);
    expect(dayRules(2).pairs).toBeGreaterThan(0);
    for (let d = 1; d < 10; d++) {
      expect(dayRules(d + 1).burn).toBeLessThanOrEqual(dayRules(d).burn);
      expect(dayRules(d + 1).pairs).toBeGreaterThanOrEqual(dayRules(d).pairs);
      // Nie schneller verbrannt als gebraten plus ein Weg zum Teller.
      expect(dayRules(d).burn).toBeGreaterThanOrEqual(6);
    }
    expect(decorPatience(0)).toBe(1);
    expect(decorPatience(2)).toBeCloseTo(1.12);
    expect(decorPatience(99)).toBeCloseTo(1.3);
  });

  test('der Tellerstapel zählt: sechs Teller, dann ist Schluss', () => {
    let stack = at(freshStations(STATIONS), 'plates');
    expect(stack.stock).toBe(PLATES);
    let taken = 0;
    for (let i = 0; i < PLATES + 2; i++) {
      const r = useStation(null, stack);
      if (r.held) taken++;
      stack = r.station;
    }
    expect(taken).toBe(PLATES);
    expect(stack.stock).toBe(0);
    const empty = stationDeed(null, stack);
    expect(empty.do).toBe('refuse');
    // Ein Brötchen an den Stapel: der Teller springt darunter.
    const back = useStation(dish('plate'), stack).station;
    expect(back.stock).toBe(1);
    const bun = useStation(dish('bun'), back);
    expect(bun.held).toEqual(dish('plate', ['bun']));
    expect(bun.station.stock).toBe(0);
    // Schmutziges kommt nicht auf den Stapel.
    expect(stationDeed(dish('plate-dirty'), back).do).toBe('refuse');
  });

  test('schmutziges Geschirr: bleibt am Tisch, sperrt ihn, geht durch die Spüle zurück', () => {
    let shift = openDay(newShift(3));
    shift = stepShift(shift, 3.1, 4).shift;
    const guest = shift.guests[0]!;
    shift = seatGuest(shift, guest.id);
    const r = serveTable(shift, guest.table, dish('plate', ['bun', 'patty-cooked']));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    shift = stepShift(r.shift, EAT_SECONDS + 0.1, 4).shift;
    expect(dirtyAt(shift, guest.table)).toBe(1);
    shift = guestGone(shift, guest.id);
    expect(freeTables(shift, 4)).not.toContain(guest.table);
    const cleared = clearDish(shift, guest.table);
    expect(cleared).not.toBeNull();
    expect(clearDish(cleared!, guest.table)).toBeNull();
    expect(freeTables(cleared!, 4)).toContain(guest.table);

    // In der Spüle: nur mit jemandem davor, und der saubere Teller geht in die Hand.
    const sink = at(freshStations(STATIONS), 'sink');
    const put = useStation(dish('plate-dirty'), sink);
    expect(put.held).toBeNull();
    let s = put.station;
    let away = false;
    for (let t = 0; t < 50; t++) away ||= tickStation(s, 0.1, false, true).done;
    expect(away).toBe(false);
    let hand: Dish | null = null;
    for (let t = 0; t < 40 && !hand; t++) {
      const tick = tickStation(s, 0.1, true, true);
      s = tick.station;
      hand = tick.toHand;
    }
    expect(hand).toEqual(dish('plate'));
    expect(s.on).toBeNull();
    // Und über Nacht ist alles abgeräumt.
    expect(openDay({ ...shift, phase: 'closed' }).dirty).toEqual([]);
  });

  test('Gruppen: zwei an einem Tisch, jeder bekommt sein Essen, und sie gehen zusammen', () => {
    let shift = openDay({ ...newShift(1), phase: 'closed', day: 5 });
    let pair: Guest[] = [];
    for (let t = 0; t < 400 && !pair.length; t++) {
      const tick = stepShift(shift, 0.5, 4);
      shift = tick.shift;
      for (const e of tick.events) if (e.kind === 'arrive') shift = seatGuest(shift, e.guest.id);
      const groups = new Map<number, Guest[]>();
      for (const g of shift.guests) groups.set(g.group, [...(groups.get(g.group) ?? []), g]);
      pair = [...groups.values()].find((list) => list.length === 2) ?? [];
    }
    expect(pair.length).toBe(2);
    const [a, b] = pair as [Guest, Guest];
    expect(a.table).toBe(b.table);
    expect(new Set([a.seat, b.seat])).toEqual(new Set([0, 1]));
    expect(tableWants(shift, a.table).length).toBe(2);
    // Serviert wird dem, der es bestellt hat.
    const r = serveTable(shift, a.table, burgerFor(b.order));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.guest.order).toBe(b.order);
    // Reißt einem die Geduld, geht, wer noch wartet — und es kostet ein Leben.
    let s = r.shift;
    const lostBefore = s.lost;
    const waiting = s.guests.filter((g) => g.group === a.group && g.phase === 'waiting');
    const tick = stepShift(s, waiting[0]!.patience + 0.1, 4);
    s = tick.shift;
    expect(s.lost - lostBefore).toBeGreaterThanOrEqual(1);
    const angry = tick.events.filter((e) => e.kind === 'angry' && e.guest.group === a.group);
    expect(angry.length).toBe(waiting.length);
  });
});

describe('Burgerladen: Balance', () => {
  /** Ein Tag, an dem jeder sofort bedient wird — wie viele Gäste und Gruppen kommen? */
  const run = (day: number, seed: number): { guests: number; pairs: number } => {
    let shift = openDay({ ...newShift(seed), phase: 'closed', day: day - 1 });
    let guests = 0;
    let pairs = 0;
    for (let t = 0; t < 2000 && shift.phase !== 'closed'; t++) {
      const tick = stepShift(shift, 0.5, TABLES.length);
      shift = tick.shift;
      for (const e of tick.events) {
        if (e.kind === 'arrive') {
          guests++;
          if (e.guest.seat === 1) pairs++;
          shift = seatGuest(shift, e.guest.id);
          const r = serveTable(shift, e.guest.table, burgerFor(e.guest.order));
          if (r.ok) shift = r.shift;
        }
        if (e.kind === 'paid') {
          shift = guestGone(shift, e.guest.id);
          shift = clearDish(shift, e.guest.table) ?? shift;
        }
      }
    }
    return { guests, pairs };
  };

  test('Tag 1 ist leicht: eine Handvoll Gäste, alle allein', () => {
    for (const seed of [1, 7, 42, 99]) {
      const day = run(1, seed);
      expect(day.guests).toBeGreaterThanOrEqual(3);
      expect(day.guests).toBeLessThanOrEqual(7);
      expect(day.pairs).toBe(0);
    }
  });

  test('später spürbar mehr: mehr Gäste, und Paare darunter', () => {
    let pairs = 0;
    for (const seed of [1, 7, 42, 99]) {
      const day = run(5, seed);
      expect(day.guests).toBeGreaterThan(run(1, seed).guests);
      pairs += day.pairs;
    }
    expect(pairs).toBeGreaterThan(0);
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
