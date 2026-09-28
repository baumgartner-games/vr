import { DIR_S } from '../nav/navTile';
import type { StationKind } from '../test/zones/kitchenCarry';
import { dish, type Dish, type KitchenItem } from '../test/zones/kitchenRecipes';
import { WORK_SECONDS } from '../test/zones/kitchenWork';
import type { StationSpot } from './plateUpPlan';
import {
  DEFAULT_BURN,
  DEFAULT_IGNITE,
  PLATES,
  burnShare,
  douseStation,
  freshStations,
  stovePhase,
  stationDeed,
  tickStation,
  useStation,
  type StationState,
} from './plateUpStations';

/**
 * **Die Mini-Küchen des Test Restaurants, nachgespielt** — Hand und Station
 * nach jedem Druck, und die Uhr dazwischen.
 *
 * Es sind dieselben Stationen wie im Laden (`plateUpStations.ts`), nur mit den
 * Dingen der zweiten Speisekarte (`kitchenRecipes.KitchenItem`). Geprüft wird
 * hier der ganze Weg eines Gerichts, so wie ihn jemand im Spiel geht.
 */

/** Ein Platz, so knapp wie möglich — Modell und Blickrichtung spielen hier keine Rolle. */
function spot(kind: StationKind, extra: Partial<StationSpot> = {}): StationSpot {
  return { id: kind, kind, x: 0, z: 0, label: kind, model: '', face: DIR_S, ...extra };
}

/** Eine frische Station dieser Art. */
function station(kind: StationKind, extra: Partial<StationSpot> = {}): StationState {
  return freshStations([spot(kind, extra)])[0]!;
}

/** Kurz geschrieben: `d('bowl', 'waffle')`. */
function d(item: KitchenItem, ...on: KitchenItem[]): Dish {
  return dish(item, on);
}

/** `seconds` Sekunden an der Station, in kleinen Bildern. */
function wait(state: StationState, seconds: number, near = true, burn = DEFAULT_BURN) {
  let now = state;
  let done = false;
  let burnt = false;
  for (let t = 0; t < seconds; t += 0.1) {
    const tick = tickStation(now, 0.1, near, false, burn);
    now = tick.station;
    done ||= tick.done;
    burnt ||= tick.burnt;
  }
  return { station: now, done, burnt };
}

describe('Schinken auf der Grillplatte', () => {
  it('brät ihn allein und lässt ihn nach der Frist verbrennen', () => {
    const put = useStation(d('ham'), station('griddle'));
    expect(put.deed.do).toBe('work');
    expect(put.held).toBeNull();
    const fried = wait(put.station, WORK_SECONDS.fry + 0.2, false);
    expect(fried.done).toBe(true);
    expect(fried.station.on).toEqual(d('ham-cooked'));
    expect(burnShare(fried.station, 10)).toBeLessThan(0.1);
    const black = wait(fried.station, 10.2, false, 10);
    expect(black.burnt).toBe(true);
    expect(black.station.on).toEqual(d('ham-burnt'));
    expect(burnShare(black.station, 10)).toBe(0);
  });

  it('macht aus der rohen Waffel auf der Grillplatte eine Waffel, die verbrennt', () => {
    const put = useStation(d('waffle-raw'), station('griddle'));
    const done = wait(put.station, WORK_SECONDS.fry + 0.2, false);
    expect(done.station.on).toEqual(d('waffle'));
    const later = wait(done.station, DEFAULT_BURN + 1, false);
    expect(later.burnt).toBe(true);
    expect(later.station.on).toEqual(d('waffle-burnt'));
  });

  it('lässt das Patty verbrennen wie immer', () => {
    const put = useStation(d('patty'), station('griddle'));
    const fried = wait(put.station, WORK_SECONDS.fry + 0.2, false);
    expect(fried.station.on).toEqual(d('patty-cooked'));
    expect(wait(fried.station, DEFAULT_BURN + 0.2, false).station.on).toEqual(d('patty-burnt'));
  });
});

describe('Brett und Nudelholz', () => {
  it('schneidet die Pizza und den Käse', () => {
    const pizza = wait(useStation(d('pizza'), station('board')).station, WORK_SECONDS.chop + 0.2);
    expect(pizza.station.on).toEqual(d('pizza-cut'));
    const cheese = wait(useStation(d('cheese'), station('board')).station, WORK_SECONDS.chop + 0.2);
    expect(cheese.station.on).toEqual(d('cheese-cut'));
    // Und die Käsescheibe geht auf den Teller.
    const plated = useStation(d('plate'), cheese.station);
    expect(plated.held).toEqual(d('plate', 'cheese-cut'));
    expect(plated.station.on).toBeNull();
  });

  it('rollt Teig nur mit jemandem davor aus', () => {
    const put = useStation(d('dough'), station('roller'));
    expect(put.deed).toEqual({ do: 'work', kind: 'roll', dish: d('dough') });
    expect(wait(put.station, WORK_SECONDS.roll + 0.2, false).station.on).toEqual(d('dough'));
    expect(wait(put.station, WORK_SECONDS.roll + 0.2, true).station.on).toEqual(d('dough-flat'));
  });
});

describe('Pizzakartons', () => {
  const boxes = () => station('drain', { gives: 'pizzabox', stock: Infinity });

  it('gibt der leeren Hand einen Karton und bleibt voll', () => {
    const take = useStation(null, boxes());
    expect(take.held).toEqual(d('pizzabox'));
    expect(take.station.stock).toBe(Infinity);
  });

  it('packt die gehaltene Pizza in einen Karton', () => {
    const packed = useStation(d('pizza-cut'), boxes());
    expect(packed.held).toEqual(d('pizzabox', 'pizza-cut'));
  });

  it('nimmt keine zweite Pizza in den Karton', () => {
    const top = { ...station('top'), on: d('pizzabox', 'pizza-cut') };
    const deed = stationDeed(d('pizza'), top);
    expect(deed).toEqual({ do: 'refuse', why: 'Im Pizzakarton liegt schon Geschnittene Pizza' });
    // Und am Stapel geht der volle Karton nicht zurück.
    expect(stationDeed(d('pizzabox', 'pizza'), boxes()).do).toBe('refuse');
  });

  it('sagt es, wenn der Stapel leer ist', () => {
    const empty = station('drain', { gives: 'pizzabox', stock: 0 });
    expect(stationDeed(null, empty)).toEqual({ do: 'refuse', why: 'Kein Pizzakarton mehr da' });
  });
});

describe('Waffeln mit Eis', () => {
  it('nimmt eine Schüssel, die Waffel, und zwei Kugeln aus zwei Wannen', () => {
    const bowls = station('drain', { gives: 'bowl', stock: 3 });
    const got = useStation(null, bowls);
    expect(got.held).toEqual(d('bowl'));
    expect(got.station.stock).toBe(2);

    const griddle = { ...station('griddle'), on: d('waffle') };
    const waffle = useStation(got.held, griddle);
    expect(waffle.held).toEqual(d('bowl', 'waffle'));
    expect(waffle.station.on).toBeNull();

    const vanilla = station('tub', { gives: 'ice-vanilla' });
    const one = useStation(waffle.held, vanilla);
    expect(one.held).toEqual(d('bowl', 'waffle', 'ice-vanilla'));
    expect(one.station).toBe(vanilla);

    const strawberry = station('tub', { gives: 'ice-strawberry' });
    // Eine Kugel je Schüssel — die zweite Sorte überschreibt die erste nicht.
    const two = useStation(one.held, strawberry);
    expect(two.deed.do).toBe('refuse');
    expect(two.held).toEqual(d('bowl', 'waffle', 'ice-vanilla'));

    // Mit leerer Hand gibt die Wanne nichts.
    expect(useStation(null, vanilla).deed).toEqual({
      do: 'refuse',
      why: 'Vanilleeis braucht eine Schüssel oder ein Hörnchen',
    });
  });

  it('richtet die Waffel aus der Hand direkt in der obersten Schüssel an', () => {
    // Die Waffel aus der Hand geht direkt in die oberste Schüssel.
    const bowls = station('drain', { gives: 'bowl', stock: 3 });
    const filled = useStation(d('waffle'), bowls);
    expect(filled.held).toEqual(d('bowl', 'waffle'));
    expect(filled.station.stock).toBe(2);
  });
});

describe('Suppe', () => {
  it('kocht geschnittene Karotte allein zu Suppe und gibt sie in die Schüssel', () => {
    const put = useStation(d('carrot-cut'), station('pot'));
    expect(put.deed).toEqual({ do: 'work', kind: 'cook', dish: d('carrot-cut') });
    const cooked = wait(put.station, WORK_SECONDS.cook + 0.2, false);
    expect(cooked.done).toBe(true);
    expect(cooked.station.on).toEqual(d('stew'));
    // Die Suppe verbrennt nicht und kocht nicht weiter.
    expect(wait(cooked.station, 30).station.on).toEqual(d('stew'));

    expect(useStation(null, cooked.station).deed.do).toBe('refuse');
    const served = useStation(d('bowl'), cooked.station);
    expect(served.held).toEqual(d('bowl', 'stew'));
    expect(served.station.on).toBeNull();
  });
});

describe('Mülleimer', () => {
  it('nimmt jedes neue Essen und lässt Schüssel und Karton in der Hand', () => {
    const bin = station('bin');
    for (const item of ['ham-burnt', 'pizza-cut', 'stew', 'waffle', 'dough', 'onion'] as const) {
      const r = useStation(d(item), bin);
      expect({ item, do: r.deed.do, held: r.held }).toEqual({ item, do: 'trash', held: null });
    }
    expect(useStation(d('bowl', 'stew'), bin).held).toEqual(d('bowl'));
    expect(useStation(d('pizzabox', 'pizza'), bin).held).toEqual(d('pizzabox'));
  });
});

describe('der Tellerstapel des Ladens', () => {
  it('bleibt ohne Angabe ein Stapel aus sechs Tellern', () => {
    const plates = station('drain');
    expect(plates.stock).toBe(PLATES);
    expect(useStation(null, plates).held).toEqual(d('plate'));
    expect(stationDeed(d('plate-dirty'), plates)).toEqual({
      do: 'refuse',
      why: 'Schmutzige Teller erst spülen — die Spüle ist daneben',
    });
    const empty = { ...plates, stock: 0 };
    expect(stationDeed(null, empty)).toEqual({
      do: 'refuse',
      why: 'Keine sauberen Teller — Geschirr abräumen und spülen',
    });
    expect(useStation(d('plate'), empty).station.stock).toBe(1);
  });
});

describe('Eine Stufe je Auflegen', () => {
  it('macht aus der Tomate Scheiben — und erst nach neuem Auflegen Suppe', () => {
    const put = useStation(d('tomato'), station('board'));
    expect(put.deed.do).toBe('work');
    const cut = wait(put.station, WORK_SECONDS.chop + 0.2);
    expect(cut.station.on).toEqual(d('tomato-cut'));
    // Davorstehen allein macht keine Suppe daraus.
    const still = wait(cut.station, WORK_SECONDS.chop * 3);
    expect(still.station.on).toEqual(d('tomato-cut'));
    // Nehmen und wieder auflegen: Die Scheibe bleibt Scheibe — Tomaten werden
    // hier nur einmal geschnitten, Suppe gibt es im Topf.
    const taken = useStation(null, still.station);
    const again = useStation(taken.held, taken.station);
    expect(again.deed.do).toBe('place');
    expect(wait(again.station, WORK_SECONDS.chop + 0.2).station.on).toEqual(d('tomato-cut'));
  });

  it('schneidet weiter, wer nur kurz weggegangen war', () => {
    const put = useStation(d('lettuce'), station('board'));
    const half = wait(put.station, WORK_SECONDS.chop / 2);
    const away = wait(half.station, 1, false);
    expect(away.station.on).toEqual(d('lettuce'));
    expect(wait(away.station, WORK_SECONDS.chop + 0.2).station.on).toEqual(d('lettuce-cut'));
  });
});

describe('Die Pfanne auf dem Herd: gebraten, verkohlt, Feuer', () => {
  /** Eine Uhr, die mitschreibt, in welcher Phase der Herd war. */
  function watch(state: StationState, seconds: number) {
    let now = state;
    const phases = new Set<string>();
    let lit = false;
    for (let t = 0; t < seconds; t += 0.1) {
      const tick = tickStation(now, 0.1, false);
      now = tick.station;
      lit ||= tick.lit === true;
      phases.add(String(stovePhase(now)));
    }
    return { station: now, phases, lit };
  }

  it('warnt nach dem Braten, verkohlt, warnt schneller und fängt dann Feuer', () => {
    const stove = { ...station('stove'), on: d('pan', 'patty') };
    const fried = watch(stove, WORK_SECONDS.fry + 0.2);
    expect(fried.station.on).toEqual(d('pan', 'patty-cooked'));
    expect(stovePhase(fried.station)).toBe('burning');
    const charred = watch(fried.station, DEFAULT_BURN + 0.2);
    expect(charred.station.on).toEqual(d('pan', 'patty-burnt'));
    expect(stovePhase(charred.station)).toBe('igniting');
    expect(burnShare(charred.station)).toBeLessThan(0.2);
    const burning = watch(charred.station, DEFAULT_IGNITE + 0.2);
    expect(burning.lit).toBe(true);
    expect(burning.station.fire).toBe(true);
    expect(stovePhase(burning.station)).toBe('fire');
    // Ein brennender Herd nimmt nichts an und gibt nichts her.
    expect(stationDeed(null, burning.station)).toMatchObject({ do: 'refuse' });
    // Gelöscht: die Pfanne bleibt, leer.
    const out = douseStation(burning.station);
    expect(out.fire).toBe(false);
    expect(out.on).toEqual(d('pan'));
    expect(stovePhase(out)).toBeNull();
  });
});

describe('Waffeln: Teig in vier schneiden, braten, einzeln nehmen', () => {
  const four = (item: KitchenItem) => d(item, item, item, item);

  it('schneidet den Teig auf dem Brett in vier rohe Waffeln — ausgerollt wird nur der Pizzaboden', () => {
    const flat = wait(useStation(d('dough'), station('roller')).station, WORK_SECONDS.roll + 0.2);
    expect(flat.station.on).toEqual(d('dough-flat'));
    const cut = wait(useStation(d('dough'), station('board')).station, WORK_SECONDS.chop + 0.2);
    expect(cut.station.on).toEqual(four('waffle-raw'));
    // Die rohen gehen alle zusammen in die Hand.
    const all = useStation(null, cut.station);
    expect(all.held).toEqual(four('waffle-raw'));
    expect(all.station.on).toBeNull();
  });

  it('brät alle vier in der Pfanne, und liegen gelassen verbrennen sie mit Warnung', () => {
    const stove = useStation(four('waffle-raw'), { ...station('stove'), on: d('pan') });
    expect(stove.deed.do).toBe('combine');
    expect(stove.station.on).toEqual(
      d('pan', 'waffle-raw', 'waffle-raw', 'waffle-raw', 'waffle-raw'),
    );
    const fried = wait(stove.station, WORK_SECONDS.fry + 0.2, false);
    expect(fried.station.on).toEqual(d('pan', 'waffle', 'waffle', 'waffle', 'waffle'));
    expect(stovePhase(fried.station)).toBe('burning');
    const black = wait(fried.station, DEFAULT_BURN + 0.2, false);
    expect(black.burnt).toBe(true);
    expect(black.station.on).toEqual(
      d('pan', 'waffle-burnt', 'waffle-burnt', 'waffle-burnt', 'waffle-burnt'),
    );
    expect(stovePhase(black.station)).toBe('igniting');
  });

  it('kippt die gebratenen auf die Platte, und von dort nimmt man eine nach der anderen', () => {
    const pan = d('pan', 'waffle', 'waffle', 'waffle', 'waffle');
    const dumped = useStation(pan, station('top'));
    expect(dumped.held).toEqual(d('pan'));
    expect(dumped.station.on).toEqual(four('waffle'));
    let top = dumped.station;
    for (let left = 3; left >= 0; left -= 1) {
      const one = useStation(null, top);
      expect(one.held).toEqual(d('waffle'));
      top = one.station;
      expect(top.on?.on.length ?? -1).toBe(left - 1);
    }
    expect(top.on).toBeNull();
  });

  it('füllt die Schüssel mit einer Waffel vom Stapel, in beide Richtungen', () => {
    const top = { ...station('top'), on: four('waffle') };
    const bowl = useStation(d('bowl'), top);
    expect(bowl.held).toEqual(d('bowl', 'waffle'));
    expect(bowl.station.on).toEqual(d('waffle', 'waffle', 'waffle'));
    const back = useStation(d('waffle', 'waffle'), { ...station('top'), on: d('bowl') });
    expect(back.station.on).toEqual(d('bowl', 'waffle'));
    expect(back.held).toEqual(d('waffle'));
  });

  it('legt eine gebratene Waffel zurück in die Pfanne auf dem Herd, wo sie weiterbrät', () => {
    const stove = useStation(d('waffle'), { ...station('stove'), on: d('pan', 'waffle') });
    expect(stove.station.on).toEqual(d('pan', 'waffle', 'waffle'));
    expect(stovePhase(wait(stove.station, 1, false).station)).toBe('burning');
  });
});
