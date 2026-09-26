import { controlHints, type HintContext } from '../../core/controlHints';
import { defaultInputConfig } from '../../core/inputMap';
import { dish, type Dish } from '../test/zones/kitchenRecipes';
import { STATIONS } from './plateUpPlan';
import { newShift, openDay, seatGuest, serveTable, stepShift } from './plateUpGame';
import { stationAction, tableAction } from './plateUpHints';
import { freshStations, stationDeed, useStation, type StationState } from './plateUpStations';

const at = (id: string): StationState => freshStations(STATIONS).find((s) => s.spot.id === id)!;
const verb = (state: StationState, held: Dish | null): string | null =>
  stationAction(state.spot, stationDeed(held, state), held);

describe('Burgerladen: Tastenhilfe nach Station', () => {
  test('am Grill: Patty auflegen, nehmen, auf den Teller', () => {
    const grill = at('grill-1');
    expect(verb(grill, dish('patty'))).toBe('Patty auflegen');
    const cooking = useStation(dish('patty'), grill).station;
    const done = { ...cooking, on: dish('patty-cooked') };
    expect(verb(done, null)).toBe('Patty nehmen');
    expect(verb(done, dish('plate', ['bun']))).toBe('Patty auf den Teller');
    // Leere Platte, leere Hände: nichts zu tun — die Zeile bleibt allgemein.
    expect(verb(grill, null)).toBeNull();
  });

  test('Spüle, Stapel, Brett, Kisten, Müll', () => {
    expect(verb(at('sink'), dish('plate-dirty'))).toBe('Spülen');
    expect(verb(at('plates'), null)).toBe('Teller nehmen');
    expect(verb(at('board'), dish('lettuce'))).toBe('Schneiden');
    expect(verb(at('buns'), null)).toBe('Brötchen nehmen');
    expect(verb(at('bin'), dish('patty-burnt'))).toBe('Wegwerfen');
  });

  test('am Tisch: Servieren nur mit dem passenden Teller, Abräumen am Geschirr', () => {
    let shift = openDay(newShift(3));
    shift = stepShift(shift, 3.1, 4).shift;
    const guest = shift.guests[0]!;
    shift = seatGuest(shift, guest.id);
    const burger = dish('plate', ['bun', 'patty-cooked']);
    const place = { do: 'place', dish: burger } as const;
    expect(tableAction(place, serveTable(shift, guest.table, burger).ok, true)).toBe('Servieren');
    const bun = dish('plate', ['bun']);
    expect(tableAction(place, serveTable(shift, guest.table, bun).ok, true)).toBe('Passt nicht');
    expect(tableAction({ do: 'take', dish: dish('plate-dirty') }, false, false)).toBe('Abräumen');
    expect(tableAction({ do: 'refuse', why: 'Bestellt: Hamburger' }, false, false)).toBe(
      'Bestellung hören',
    );
  });

  test('die Zeile unten sagt das Verb statt „Nehmen"', () => {
    const ctx: HintContext = {
      device: 'pad',
      view: 'topDown',
      menu: null,
      tools: false,
      useCandidate: true,
      carrying: true,
      armed: false,
      padKind: 'xbox',
      config: defaultInputConfig(),
      zone: { kind: 'burger', holding: true, closed: false, action: 'Servieren' },
    };
    const labels = controlHints(ctx).map((item) => item.label);
    expect(labels).toContain('Servieren');
    expect(labels).not.toContain('Ablegen');
  });
});
