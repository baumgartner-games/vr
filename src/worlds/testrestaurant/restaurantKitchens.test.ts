import { elementById } from '../elements/elementCatalog';
import { dishModels } from '../elements/itemModels';
import { TUB_SHIFT, elementStations, stationKind } from '../elements/stationLayer';
import { EMPTY_ICE, useCounter, useStand, useTub, type IceHands } from '../plateup/plateUpIce';
import {
  DEFAULT_BURN,
  freshStations,
  tickStation,
  useStation,
  type StationState,
} from '../plateup/plateUpStations';
import type { KitchenDeed } from '../test/zones/kitchenCarry';
import type { Dish, KitchenItem } from '../test/zones/kitchenRecipes';
import { kitchenSpots, stationElements } from './restaurantPlan';

/**
 * **Jede spielbare Küche gibt ihr Gericht wirklich her** — auf ihren eigenen
 * Stellen aus dem Plan, durch dieselbe Regel, die in der Welt auf `A` liegt
 * (`elements/stationLayer.elementStations` → `plateUpStations.useStation`,
 * `tickStation`). Ohne Szene: eine Hand, die Stationen, die Uhr.
 */
class Cook {
  held: Dish | null = null;
  states: StationState[];

  constructor(readonly kitchen: string) {
    const spot = kitchenSpots().find((one) => one.kitchen.id === kitchen)!;
    const slots = stationElements(spot).flatMap(elementStations);
    this.states = freshStations(slots.map((slot) => slot.spot));
  }

  private index(station: string): number {
    const id = `${this.kitchen}-${station}`;
    const i = this.states.findIndex((state) => state.spot.id === id);
    if (i < 0) throw new Error(`Keine Station ${id}`);
    return i;
  }

  /** Was dort liegt. */
  on(station: string): Dish | null {
    return this.states[this.index(station)]!.on;
  }

  /** Ein Druck auf `A` vor der Station. */
  press(station: string): KitchenDeed {
    const i = this.index(station);
    const result = useStation(this.held, this.states[i]!);
    this.held = result.held;
    this.states[i] = result.station;
    return result.deed;
  }

  /**
   * **Warten, bis dort etwas anderes liegt** — in Zehntelsekunden, jemand
   * steht davor oder nicht.
   *
   * @returns wie lange es gedauert hat, und ob dabei etwas verbrannt ist
   */
  until(station: string, item: KitchenItem, near: boolean): { seconds: number; burnt: boolean } {
    const i = this.index(station);
    let seconds = 0;
    let burnt = false;
    while (this.states[i]!.on?.item !== item) {
      const tick = tickStation(this.states[i]!, 0.1, near, !this.held, DEFAULT_BURN);
      this.states[i] = tick.station;
      burnt ||= tick.burnt;
      seconds += 0.1;
      if (seconds > 60) throw new Error(`${station}: kein ${item} nach einer Minute`);
    }
    return { seconds, burnt };
  }
}

describe('Test Restaurant — die Stationen der Elemente', () => {
  it('macht aus Brett, Nudelbrett, Herd, Topf und Wannen die Stationen des Restaurants', () => {
    expect(stationKind(elementById('board'))).toBe('board');
    expect(stationKind(elementById('rolling-board'))).toBe('roller');
    expect(stationKind(elementById('stove'))).toBe('griddle');
    expect(stationKind(elementById('stove-pot'))).toBe('pot');
    expect(stationKind(elementById('ice-tubs'))).toBe('tub');
    expect(stationKind(elementById('ice-stand'))).toBeNull();
    expect(stationKind(elementById('table-round'))).toBeNull();
  });

  it('gibt den Eiswannen zwei Stationen, Vanille links, Erdbeere rechts', () => {
    const slots = elementStations({ id: 'w', element: 'ice-tubs', x: 0, z: 0 });
    expect(slots.map((slot) => [slot.spot.id, slot.spot.gives, slot.shift])).toEqual([
      ['w:vanilla', 'ice-vanilla', -TUB_SHIFT],
      ['w:strawberry', 'ice-strawberry', TUB_SHIFT],
    ]);
  });

  it('nimmt, was die Stelle hergibt, vor dem Element — und Stapel werden nie leer', () => {
    const [crate] = elementStations({ id: 'c', element: 'crate-steak', x: 0, z: 0, gives: 'ham' });
    expect(crate!.spot.gives).toBe('ham');
    const [bowls] = elementStations({ id: 'b', element: 'bowl-stack', x: 0, z: 0 });
    expect(bowls!.spot).toMatchObject({ kind: 'drain', gives: 'bowl', stock: Infinity });
  });
});

describe('Test Restaurant — jede Küche kocht', () => {
  it('Burger: schneiden, braten, alles auf den Teller — mit Käse', () => {
    const cook = new Cook('burger');
    expect(cook.press('plate-stack').do).toBe('take');
    expect(cook.press('counter').do).toBe('place');
    for (const [crate, raw, cut] of [
      ['crate-lettuce', 'lettuce', 'lettuce-cut'],
      ['crate-tomatoes', 'tomato', 'tomato-cut'],
      ['crate-cheese', 'cheese', 'cheese-cut'],
    ] as const) {
      expect(cook.press(crate)).toEqual({ do: 'take', dish: { item: raw, on: [] } });
      expect(cook.press('board').do).toBe('work');
      // Am Brett schneidet nur, wer davorsteht.
      expect(cook.until('board', cut, true).seconds).toBeGreaterThan(1);
      expect(cook.press('board').do).toBe('take');
      expect(cook.press('counter').do).toBe('combine');
      expect(cook.held).toBeNull();
    }
    expect(cook.press('crate-steak').do).toBe('take');
    expect(cook.held?.item).toBe('patty');
    expect(cook.press('stove').do).toBe('work');
    // Der Herd brät allein.
    cook.until('stove', 'patty-cooked', false);
    expect(cook.press('counter').do).toBe('take');
    expect(cook.press('stove').do).toBe('combine');
    expect(cook.press('crate-buns').do).toBe('combine');
    expect(cook.held?.item).toBe('plate');
    expect([...cook.held!.on].sort()).toEqual(
      ['bun', 'cheese-cut', 'lettuce-cut', 'patty-cooked', 'tomato-cut'].sort(),
    );
    // Im Bild: Teller, Brötchen unten, Belag, Deckel oben.
    const models = dishModels(cook.held!);
    expect(models[0]).toMatch(/plate\.glb$/);
    expect(models[1]).toMatch(/bun_bottom/);
    expect(models[models.length - 1]).toMatch(/bun_top/);
    expect(models.some((model) => model.includes('cheese_slice'))).toBe(true);
  });

  it('Schinken: braten, liegen lassen — er verbrennt am ersten Tag nach 14 s, dann in den Müll', () => {
    const cook = new Cook('schinken');
    expect(cook.press('crate-ham').do).toBe('take');
    expect(cook.press('stove').do).toBe('work');
    cook.until('stove', 'ham-cooked', false);
    const burn = cook.until('stove', 'ham-burnt', false);
    expect(burn.burnt).toBe(true);
    expect(burn.seconds).toBeCloseTo(DEFAULT_BURN, 0);
    expect(cook.press('stove').do).toBe('take');
    expect(cook.press('bin').do).toBe('trash');
    expect(cook.held).toBeNull();
  });

  it('Schinken: rechtzeitig vom Herd, bleibt er gebraten', () => {
    const cook = new Cook('schinken');
    cook.press('crate-ham');
    cook.press('stove');
    cook.until('stove', 'ham-cooked', false);
    expect(cook.press('stove').do).toBe('take');
    expect(cook.press('counter').do).toBe('place');
    expect(cook.on('counter')?.item).toBe('ham-cooked');
  });

  it('Pizza to Go: aus der Box, in Stücke, in den Karton', () => {
    const cook = new Cook('pizza-to-go');
    expect(cook.press('pizza-supply')).toEqual({ do: 'take', dish: { item: 'pizza', on: [] } });
    expect(cook.press('board').do).toBe('work');
    cook.until('board', 'pizza-cut', true);
    expect(cook.press('pizzabox-stack').do).toBe('take');
    expect(cook.held?.item).toBe('pizzabox');
    expect(cook.press('board').do).toBe('combine');
    expect(cook.held).toEqual({ item: 'pizzabox', on: ['pizza-cut'] });
    expect(cook.on('board')).toBeNull();
  });

  it('Waffeln: Teig ausrollen, backen, in die Schüssel, zwei Kugeln darauf', () => {
    const cook = new Cook('waffeln');
    expect(cook.press('crate-dough').do).toBe('take');
    expect(cook.press('rolling-board')).toMatchObject({ do: 'work', kind: 'roll' });
    cook.until('rolling-board', 'dough-flat', true);
    expect(cook.press('rolling-board').do).toBe('take');
    expect(cook.press('stove')).toMatchObject({ do: 'work', kind: 'fry' });
    cook.until('stove', 'waffle', false);
    // Die Waffel verbrennt nicht: Sie liegt eine Minute und bleibt, was sie ist.
    for (let i = 0; i < 600; i++)
      cook.states = cook.states.map((state) => tickStation(state, 0.1, false).station);
    expect(cook.on('stove')?.item).toBe('waffle');
    expect(cook.press('bowl-stack').do).toBe('take');
    expect(cook.press('stove').do).toBe('combine');
    expect(cook.held).toEqual({ item: 'bowl', on: ['waffle'] });
    expect(cook.press('ice-tubs:vanilla').do).toBe('combine');
    expect(cook.press('ice-tubs:vanilla').do).toBe('refuse');
    expect(cook.press('ice-tubs:strawberry').do).toBe('combine');
    expect(cook.held).toEqual({ item: 'bowl', on: ['waffle', 'ice-vanilla', 'ice-strawberry'] });
  });

  it('Waffeln: ohne Schüssel gibt die Wanne nichts her', () => {
    const cook = new Cook('waffeln');
    expect(cook.press('ice-tubs:strawberry').do).toBe('refuse');
    expect(cook.held).toBeNull();
  });

  it('Suppe: Karotte schneiden, im Topf kochen, in die Schüssel', () => {
    const cook = new Cook('suppe');
    expect(cook.press('crate-carrots').do).toBe('take');
    // Ungeschnitten nimmt der Topf sie nicht.
    expect(cook.press('stove-pot').do).toBe('refuse');
    expect(cook.press('board').do).toBe('work');
    cook.until('board', 'carrot-cut', true);
    expect(cook.press('board').do).toBe('take');
    expect(cook.press('stove-pot')).toMatchObject({ do: 'work', kind: 'cook' });
    // Der Topf kocht allein.
    cook.until('stove-pot', 'stew', false);
    expect(cook.press('stove-pot').do).toBe('refuse');
    expect(cook.press('bowl-stack').do).toBe('take');
    expect(cook.press('stove-pot').do).toBe('combine');
    expect(cook.held).toEqual({ item: 'bowl', on: ['stew'] });
    expect(cook.on('stove-pot')).toBeNull();
  });

  it('Eis: Hörnchen vom Stand, zwei Kugeln, auf die Platte — und in den Müll', () => {
    const cook = new Cook('eis');
    // Stand und Wannen regelt die Eisecke; Küche sind nur Platte und Eimer.
    expect(cook.states.map((state) => state.spot.id)).toEqual(['eis-counter', 'eis-bin']);
    let hands: IceHands = useStand(EMPTY_ICE, 'stand', null).hands;
    hands = useTub(hands, 'vanilla', null).hands;
    hands = useTub(hands, 'strawberry', null).hands;
    expect(hands.cone?.balls).toEqual(['vanilla', 'strawberry']);
    const at = (
      id: string,
    ): { kind: StationState['spot']['kind']; taken: boolean; cone: null } => ({
      kind: cook.states.find((state) => state.spot.id === id)!.spot.kind,
      taken: false,
      cone: null,
    });
    const put = useCounter(hands, null, at('eis-counter'));
    expect(put?.deed.do).toBe('put');
    expect(put?.cone?.balls).toEqual(['vanilla', 'strawberry']);
    const trash = useCounter(hands, null, at('eis-bin'));
    expect(trash?.deed.do).toBe('trash');
    expect(trash?.hands.cone).toBeNull();
  });
});
