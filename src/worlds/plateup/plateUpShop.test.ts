import { dish } from '../test/zones/kitchenRecipes';
import { TABLES } from './plateUpPlan';
import { newShift, openDay, seatGuest, stepShift, type Shift } from './plateUpGame';
import {
  MAX_TABLES,
  OFFERS,
  SHOP_ITEMS,
  aimTile,
  allTables,
  buy,
  dayOffers,
  decorCount,
  placeCheck,
  shopItem,
  type Placed,
} from './plateUpShop';
import { freshStations, useStation, type StationState } from './plateUpStations';
import { STATIONS } from './plateUpPlan';
import { TUTORIAL_SERVES, tutorialFinished, tutorialHint } from './plateUpTutorial';

describe('Burgerladen: Einrichten', () => {
  test('jeden Abend drei Baupläne, mit einem Tisch, solange Platz ist', () => {
    const offers = dayOffers(1, 42, TABLES.length);
    expect(offers.length).toBe(OFFERS);
    expect(offers[0]!.kind).toBe('table');
    expect(new Set(offers.map((o) => o.id)).size).toBe(OFFERS);
    expect(dayOffers(1, 42, TABLES.length)).toEqual(offers);
    expect(dayOffers(2, 42, MAX_TABLES).every((o) => o.kind === 'decor')).toBe(true);
    for (const item of SHOP_ITEMS) expect(item.cost).toBeGreaterThan(0);
  });

  test('ein Tisch mitten im Gastraum passt, auf einem anderen oder in der Tür nicht', () => {
    expect(placeCheck('table', 4, 6, [])).toEqual({ ok: true });
    // Auf Tisch 1.
    expect(placeCheck('table', 1, 6, []).ok).toBe(false);
    // In der Küche.
    expect(placeCheck('cactus', 5, 1, []).ok).toBe(false);
    // In der Tür.
    expect(placeCheck('cactus', 6, 11, []).ok).toBe(false);
    // An die Südwand, wo die Stühle keinen Platz hätten.
    expect(placeCheck('table', 4, 10, []).ok).toBe(false);
    // Deko in eine freie Ecke des Gastraums.
    expect(placeCheck('cactus', 9, 7, [])).toEqual({ ok: true });
  });

  test('wer den Weg zu einem Tisch zustellt, bekommt ein Nein mit Grund', () => {
    // Die Kachel vor dem Nordstuhl von Tisch 1 bleibt frei.
    const t = TABLES[0]!;
    const check = placeCheck('cactus', Math.floor(t.approach.x), Math.floor(t.approach.z), []);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.why.length).toBeGreaterThan(5);
  });

  test('kaufen kostet, und ein gekaufter Tisch ist ein Tisch mehr', () => {
    expect(buy(10, [], 'table', 4, 6)).toBeNull();
    const done = buy(100, [], 'table', 4, 6)!;
    expect(done.total).toBe(100 - shopItem('table')!.cost);
    const tables = allTables(done.placed);
    expect(tables.length).toBe(TABLES.length + 1);
    const added = tables[tables.length - 1]!;
    expect(added.index).toBe(TABLES.length);
    // Auf denselben Platz passt nichts mehr.
    expect(placeCheck('cactus', 4, 6, done.placed).ok).toBe(false);
    const more: Placed[] = [...done.placed, { item: 'lamp', x: 9, z: 7 }];
    expect(decorCount(more)).toBe(1);
  });

  test('die Kachel vor der Figur: Deko eine Armlänge vorn, ein Tisch mit der Mitte davor', () => {
    expect(aimTile('cactus', 5.5, 5.5, 0, 1)).toEqual({ x: 5, z: 6 });
    const t = aimTile('table', 5.5, 5.5, 0, 1);
    expect(t.x + 1).toBeCloseTo(Math.round(5.5), 0);
    expect(t.z).toBeGreaterThanOrEqual(5);
  });
});

describe('Burgerladen: Einsteigerhilfe', () => {
  const find = (states: StationState[], id: string): number =>
    states.findIndex((s) => s.spot.id === id);

  test('vor dem ersten Tag zeigt sie auf die Glocke', () => {
    const hint = tutorialHint(newShift(1), freshStations(STATIONS), null, 4);
    expect(hint?.target).toEqual({ bell: true });
  });

  test('sie führt durch einen Hamburger — egal, womit man anfängt', () => {
    let shift: Shift = openDay(newShift(3));
    const tick = stepShift(shift, 3.1, 4);
    shift = tick.shift;
    const guest = shift.guests[0]!;
    shift = seatGuest(shift, guest.id);
    let stations = freshStations(STATIONS);
    let held: ReturnType<typeof useStation>['held'] = null;
    const use = (id: string): void => {
      const i = find(stations, id);
      const r = useStation(held, stations[i]!);
      held = r.held;
      stations = stations.map((s, j) => (j === i ? r.station : s));
    };
    const hint = (): ReturnType<typeof tutorialHint> => tutorialHint(shift, stations, held, 4);

    expect(hint()?.target).toEqual({ station: 'patties' });
    use('patties');
    expect(hint()?.target).toEqual({ station: 'grill-1' });
    use('grill-1');
    expect(hint()?.target).toEqual({ station: 'plates' });
    use('plates');
    expect(hint()?.target).toEqual({ station: 'buns' });
    use('buns');
    // Das Patty brät noch.
    expect(hint()?.key).toBe('wait-fry');
    const g = find(stations, 'grill-1');
    stations = stations.map((s, j) =>
      j === g ? { ...s, on: dish('patty-cooked'), work: { ...s.work, working: false } } : s,
    );
    expect(hint()?.key).toBe('fetch');
    use('grill-1');
    expect(hint()?.target).toEqual({ table: guest.table });

    // Andersherum angefangen: Brötchen zuerst.
    held = dish('bun');
    expect(hint()?.target).toEqual({ station: 'plates' });
    held = dish('patty-burnt');
    expect(hint()?.target).toEqual({ station: 'bin' });
    held = dish('plate-dirty');
    expect(hint()?.target).toEqual({ station: 'sink' });
  });

  test('schmutziges Geschirr und Verbranntes kommen zur Sprache', () => {
    let shift: Shift = { ...openDay(newShift(3)), dirty: [0, 0, 1] };
    const stations = freshStations(STATIONS);
    expect(tutorialHint(shift, stations, null, 4)?.target).toEqual({ table: 2 });
    const g = find(stations, 'grill-2');
    const burnt = stations.map((s, j) => (j === g ? { ...s, on: dish('patty-burnt') } : s));
    expect(tutorialHint(shift, burnt, null, 4)?.target).toEqual({ station: 'grill-2' });
    shift = { ...shift, phase: 'closed' };
    expect(tutorialHint(shift, stations, null, 4)).toBeNull();
  });

  test('sie hört auf: nach drei Gästen oder nach dem ersten Tag', () => {
    const open = openDay(newShift(1));
    expect(tutorialFinished(open)).toBe(false);
    expect(tutorialFinished({ ...open, served: TUTORIAL_SERVES })).toBe(true);
    expect(tutorialFinished({ ...open, phase: 'closed' })).toBe(true);
    expect(tutorialFinished({ ...open, day: 2 })).toBe(true);
  });
});
