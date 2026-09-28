import * as THREE from 'three';
import type { Usable } from '../../core/usable';
import {
  DEFAULT_BURN,
  tickStation,
  useStation,
  type StationState,
} from '../plateup/plateUpStations';
import type { KitchenDeed } from '../test/zones/kitchenCarry';
import type { Dish, KitchenItem } from '../test/zones/kitchenRecipes';
import { elementById } from './elementCatalog';
import type { ElementSpot } from './elementPlace';
import type { ElementHost } from './elementView';
import { furnish } from './furnish';
import { dishModels } from './itemModels';
import {
  StationLayer,
  elementStations,
  slotStates,
  stationKind,
  type StationHost,
} from './stationLayer';

jest.mock('../../core/chefFit', () => ({ canLoadModels: () => false }));

/**
 * **Jede Küche aus Spielelementen gibt ihr Gericht wirklich her** — auf
 * Stellen, die für sich stehen (eine Reihe, nach Süden, je Element eine
 * Kachel), durch dieselbe Regel, die in einer Welt auf `A` liegt
 * (`elementStations` → `plateUpStations.useStation`, `tickStation`). Ohne
 * Szene: eine Hand, die Stationen, die Uhr.
 *
 * Die Abläufe standen früher im Plan des Test Restaurants
 * (`restaurantKitchens.test.ts`); die Welt ist leer, die Küchen gibt es als
 * Elemente weiter, und hier steht, dass sie kochen.
 */
class Cook {
  held: Dish | null = null;
  states: StationState[];

  /** @param elements die Elemente in einer Reihe, von West nach Ost; die Stelle heißt wie das Element */
  constructor(elements: readonly (string | ElementSpot)[]) {
    const spots = elements.map((one, x): ElementSpot =>
      typeof one === 'string' ? { id: one, element: one, x, z: 0 } : one,
    );
    this.states = slotStates(spots.flatMap(elementStations));
  }

  private index(station: string): number {
    const i = this.states.findIndex((state) => state.spot.id === station);
    if (i < 0) throw new Error(`Keine Station ${station}`);
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
   * steht davor oder nicht. `item` ist das Ding selbst oder, im Topf, was
   * darin liegt.
   */
  until(station: string, item: KitchenItem, near: boolean): { seconds: number; burnt: boolean } {
    const i = this.index(station);
    let seconds = 0;
    let burnt = false;
    const there = (): boolean => {
      const on = this.states[i]!.on;
      return (
        on?.item === item || ((on?.item === 'pot' || on?.item === 'pan') && on.on.includes(item))
      );
    };
    while (!there()) {
      const tick = tickStation(this.states[i]!, 0.1, near, !this.held, DEFAULT_BURN);
      this.states[i] = tick.station;
      burnt ||= tick.burnt;
      seconds += 0.1;
      if (seconds > 60) throw new Error(`${station}: kein ${item} nach einer Minute`);
    }
    return { seconds, burnt };
  }

  /** Alle Uhren eine Weile laufen lassen, niemand davor. */
  wait(seconds: number): void {
    for (let t = 0; t < seconds; t += 0.1)
      this.states = this.states.map((state) => tickStation(state, 0.1, false).station);
  }
}

describe('Spielelemente — was aus ihnen für Stationen werden', () => {
  it('macht aus Brett, Nudelbrett, Herd, Herd mit Topf, Spüle und Wannen die Stationen der Küche', () => {
    expect(stationKind(elementById('board'))).toBe('board');
    expect(stationKind(elementById('rolling-board'))).toBe('roller');
    expect(stationKind(elementById('stove'))).toBe('stove');
    expect(stationKind(elementById('stove-pot'))).toBe('stove');
    expect(stationKind(elementById('sink'))).toBe('sink');
    expect(stationKind(elementById('ice-stand'))).toBe('drain');
    expect(stationKind(elementById('table-round'))).toBeNull();
    expect(stationKind(elementById('belt'))).toBeNull();
  });

  it('stellt den Topf auf den Herd, und das Brett ist leer', () => {
    const [stove] = elementStations({ id: 'h', element: 'stove-pot', x: 0, z: 0 });
    expect(stove!.holds).toEqual({ item: 'pot', on: [] });
    expect(slotStates([stove!])[0]!.on).toEqual({ item: 'pot', on: [] });
    // Der Topf ist kein Teil des Bilds, sondern liegt auf der Station — er
    // geht mit, wenn man ihn nimmt.
    expect(elementById('stove-pot').parts.map((part) => part.model)).toEqual([
      'restaurant-bits/stove_single.glb',
    ]);
    const [board] = elementStations({ id: 'b', element: 'board', x: 0, z: 0 });
    expect(slotStates([board!])[0]!.on).toBeNull();
  });

  it('nimmt, was die Stelle hergibt, vor dem Element — und Stapel werden nie leer', () => {
    const [crate] = elementStations({ id: 'c', element: 'crate-steak', x: 0, z: 0, gives: 'ham' });
    expect(crate!.spot.gives).toBe('ham');
    const [bowls] = elementStations({ id: 'b', element: 'bowl-stack', x: 0, z: 0 });
    expect(bowls!.spot).toMatchObject({ kind: 'drain', gives: 'bowl', stock: Infinity });
  });

  it('macht jede Vorratskiste zur Station, gleich wo sie steht und wohin sie schaut', () => {
    for (const element of ['crate-buns', 'crate-cheese', 'crate-potatoes', 'crate-lettuce'])
      for (const face of ['N', 'E', 'S', 'W'] as const) {
        const slots = elementStations({ id: 'k', element, x: 7, z: -3, face });
        expect(slots).toHaveLength(1);
        expect(slots[0]!.spot.kind).toBe('crate');
      }
  });
});

describe('Spielelemente — jede Küche kocht', () => {
  it('Burger: schneiden, braten, alles auf den Teller — mit Käse', () => {
    const cook = new Cook([
      'board',
      'counter',
      'stove',
      'bin',
      'plate-stack',
      'crate-buns',
      'crate-patties',
      'crate-lettuce',
      'crate-tomatoes',
      'crate-cheese',
    ]);
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
    expect(cook.press('crate-patties').do).toBe('take');
    expect(cook.held?.item).toBe('patty');
    // In die Pfanne auf dem Herd — sie brät allein.
    expect(cook.on('stove')).toEqual({ item: 'pan', on: [] });
    expect(cook.press('stove').do).toBe('combine');
    cook.until('stove', 'patty-cooked', false);
    expect(cook.on('stove')).toEqual({ item: 'pan', on: ['patty-cooked'] });
    expect(cook.press('counter').do).toBe('take');
    expect(cook.press('stove').do).toBe('combine');
    expect(cook.on('stove')).toEqual({ item: 'pan', on: [] });
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

  it('Steak: aus der Kiste, auf dem Brett zum Patty — oder in der Pfanne gebraten auf den Teller', () => {
    const cook = new Cook(['crate-steak', 'board', 'stove', 'plate-stack', 'griddle']);
    expect(cook.press('crate-steak')).toEqual({ do: 'take', dish: { item: 'steak', on: [] } });
    expect(cook.press('board').do).toBe('work');
    cook.until('board', 'patty', true);
    expect(cook.press('board').do).toBe('take');
    expect(cook.held?.item).toBe('patty');
    // Das Patty auf die sichere Kochstelle: Es brät ohne Pfanne und verkohlt nie.
    expect(cook.press('griddle').do).toBe('work');
    cook.until('griddle', 'patty-cooked', false);
    // Das zweite Steak in die Pfanne, gebraten auf den Teller.
    expect(cook.press('crate-steak').do).toBe('take');
    expect(cook.press('stove').do).toBe('combine');
    cook.until('stove', 'steak-cooked', false);
    expect(cook.press('plate-stack').do).toBe('take');
    expect(cook.press('stove').do).toBe('combine');
    expect(cook.held).toEqual({ item: 'plate', on: ['steak-cooked'] });
  });

  it('Schinken: braten, liegen lassen — er verbrennt am ersten Tag nach 14 s, dann in den Müll', () => {
    const cook = new Cook(['crate-ham', 'stove', 'counter', 'bin']);
    expect(cook.press('crate-ham').do).toBe('take');
    expect(cook.press('stove').do).toBe('combine');
    cook.until('stove', 'ham-cooked', false);
    const burn = cook.until('stove', 'ham-burnt', false);
    expect(burn.burnt).toBe(true);
    expect(burn.seconds).toBeCloseTo(DEFAULT_BURN, 0);
    // Die Pfanne geht mit, das Verbrannte in den Müll, die Pfanne bleibt.
    expect(cook.press('stove').do).toBe('take');
    expect(cook.held).toEqual({ item: 'pan', on: ['ham-burnt'] });
    expect(cook.press('bin').do).toBe('scrape');
    expect(cook.held).toEqual({ item: 'pan', on: [] });
  });

  it('Schinken: rechtzeitig vom Herd, bleibt er gebraten', () => {
    const cook = new Cook(['crate-ham', 'stove', 'counter', 'bin']);
    cook.press('crate-ham');
    cook.press('stove');
    cook.until('stove', 'ham-cooked', false);
    // **Die Pfanne vom Herd nehmen** — mit dem Schinken darin; gebraten wird
    // in der Hand nicht weiter.
    expect(cook.press('stove')).toEqual({ do: 'take', dish: { item: 'pan', on: ['ham-cooked'] } });
    cook.wait(30);
    expect(cook.held).toEqual({ item: 'pan', on: ['ham-cooked'] });
    expect(cook.press('counter').do).toBe('place');
    expect(cook.on('counter')).toEqual({ item: 'pan', on: ['ham-cooked'] });
  });

  it('Pizza to Go: aus der Box, in Stücke, in den Karton', () => {
    const cook = new Cook(['pizza-supply', 'board', 'counter', 'pizzabox-stack', 'bin']);
    expect(cook.press('pizza-supply')).toEqual({ do: 'take', dish: { item: 'pizza', on: [] } });
    expect(cook.press('board').do).toBe('work');
    cook.until('board', 'pizza-cut', true);
    expect(cook.press('pizzabox-stack').do).toBe('take');
    expect(cook.held?.item).toBe('pizzabox');
    expect(cook.press('board').do).toBe('combine');
    expect(cook.held).toEqual({ item: 'pizzabox', on: ['pizza-cut'] });
    expect(cook.on('board')).toBeNull();
  });

  it('Waffeln: Teig in vier schneiden, alle braten, auf der Platte einzeln nehmen', () => {
    const cook = new Cook([
      'crate-dough',
      'board',
      'stove',
      'counter',
      'bowl-stack',
      'ice-tray-vanilla',
      'ice-tray-strawberry',
    ]);
    const raw = ['waffle-raw', 'waffle-raw', 'waffle-raw'];
    expect(cook.press('crate-dough').do).toBe('take');
    // Auf dem Brett wird der Teig in vier Teigstücke geschnitten, die rohen Waffeln.
    expect(cook.press('board')).toMatchObject({ do: 'work', kind: 'chop' });
    cook.until('board', 'waffle-raw', true);
    expect(cook.on('board')).toEqual({ item: 'waffle-raw', on: raw });
    // Alle vier in die Hand, alle vier in die Pfanne.
    expect(cook.press('board').do).toBe('take');
    expect(cook.held).toEqual({ item: 'waffle-raw', on: raw });
    expect(cook.press('stove').do).toBe('combine');
    expect(cook.on('stove')).toEqual({ item: 'pan', on: ['waffle-raw', ...raw] });
    cook.until('stove', 'waffle', false);
    expect(cook.on('stove')).toEqual({ item: 'pan', on: ['waffle', 'waffle', 'waffle', 'waffle'] });
    // Die Pfanne auf die Platte gekippt: vier Waffeln, die Pfanne bleibt in der Hand.
    expect(cook.press('stove').do).toBe('take');
    expect(cook.press('counter').do).toBe('combine');
    expect(cook.held).toEqual({ item: 'pan', on: [] });
    expect(cook.on('counter')).toEqual({ item: 'waffle', on: ['waffle', 'waffle', 'waffle'] });
    expect(cook.press('stove').do).toBe('place');
    // Mit der Schüssel eine Waffel vom Stapel, dann eine Kugel darauf — eine
    // zweite Sorte überschreibt sie nicht.
    expect(cook.press('bowl-stack').do).toBe('take');
    expect(cook.press('counter').do).toBe('combine');
    expect(cook.held).toEqual({ item: 'bowl', on: ['waffle'] });
    expect(cook.on('counter')).toEqual({ item: 'waffle', on: ['waffle', 'waffle'] });
    expect(cook.press('ice-tray-vanilla').do).toBe('combine');
    expect(cook.press('ice-tray-vanilla').do).toBe('refuse');
    expect(cook.press('ice-tray-strawberry').do).toBe('refuse');
    expect(cook.held).toEqual({ item: 'bowl', on: ['waffle', 'ice-vanilla'] });
  });
});

/**
 * **Pommes, wie gewünscht** — _„Die Kartoffeln Vorräte sollen auch
 * gehighlighted werden und interagierbar sein. Das Schneidebrett daneben soll
 * leer sein ohne die Kartoffel drauf, aber ich will darauf z.B. auch
 * Kartoffeln schneiden können … Der Herd daneben soll der Herd aus der
 * Restaurant Welt sein … Der Topf darauf soll auch der sein aus der Restaurant
 * Welt. Es fehlt noch ein Waschbecken wo ich den Topf vollmachen kann."_
 */
describe('Spielelemente — Topf, Spüle und Pommes', () => {
  const pommes = (): Cook =>
    new Cook(['crate-potatoes', 'board', 'counter', 'stove-pot', 'sink', 'plate-stack', 'bin']);

  it('Feuerlöscher: steht auf der Arbeitsplatte, geht mit und kommt wieder hin', () => {
    const cook = new Cook(['extinguisher']);
    expect(cook.on('extinguisher')).toEqual({ item: 'extinguisher', on: [] });
    expect(cook.press('extinguisher').do).toBe('take');
    expect(cook.held?.item).toBe('extinguisher');
    expect(cook.on('extinguisher')).toBeNull();
    expect(cook.press('extinguisher').do).toBe('place');
    expect(cook.held).toBeNull();
  });

  it('füllt den Topf an der Spüle — die Spüle bleibt leer', () => {
    const cook = pommes();
    expect(cook.press('stove-pot')).toEqual({ do: 'take', dish: { item: 'pot', on: [] } });
    expect(cook.on('stove-pot')).toBeNull();
    expect(cook.press('sink')).toEqual({ do: 'fill', dish: { item: 'pot', on: ['water'] } });
    expect(cook.held).toEqual({ item: 'pot', on: ['water'] });
    expect(cook.on('sink')).toBeNull();
    // Ein zweites Mal füllt nichts doppelt.
    expect(cook.press('sink')).toMatchObject({ do: 'refuse' });
  });

  it('Kartoffel aus der Kiste, schneiden, in den Topf mit Wasser auf dem Herd — Pommes auf den Teller', () => {
    const cook = pommes();
    expect(cook.press('crate-potatoes')).toEqual({ do: 'take', dish: { item: 'potato', on: [] } });
    expect(cook.press('board').do).toBe('work');
    cook.until('board', 'potato-cut', true);
    expect(cook.press('board').do).toBe('take');
    // In den leeren Topf nicht — erst Wasser.
    expect(cook.press('stove-pot')).toEqual({
      do: 'refuse',
      why: 'Im Topf ist kein Wasser — erst an der Spüle füllen',
    });
    expect(cook.press('counter').do).toBe('place');
    cook.press('stove-pot');
    cook.press('sink');
    expect(cook.press('stove-pot').do).toBe('place');
    expect(cook.press('counter').do).toBe('take');
    expect(cook.press('stove-pot').do).toBe('combine');
    expect(cook.on('stove-pot')).toEqual({ item: 'pot', on: ['water', 'potato-cut'] });
    // Er kocht allein, niemand muss davorstehen — und das Wasser verkocht.
    const { seconds } = cook.until('stove-pot', 'fries', false);
    expect(seconds).toBeGreaterThan(4);
    expect(cook.on('stove-pot')).toEqual({ item: 'pot', on: ['fries'] });
    // Pommes verbrennen nicht.
    cook.wait(30);
    expect(cook.on('stove-pot')).toEqual({ item: 'pot', on: ['fries'] });
    expect(cook.press('plate-stack').do).toBe('take');
    expect(cook.press('stove-pot').do).toBe('combine');
    expect(cook.held).toEqual({ item: 'plate', on: ['fries'] });
    expect(cook.on('stove-pot')).toEqual({ item: 'pot', on: [] });
    expect(dishModels(cook.held!)).toEqual([
      'restaurant-bits/plate.glb',
      'restaurant-bits/food_ingredient_potato_chopped.glb',
    ]);
    // Und weg damit: Der Teller bleibt in der Hand.
    expect(cook.press('bin')).toEqual({ do: 'scrape', dish: { item: 'plate', on: [] } });
  });

  it('nimmt die Kartoffel auch in den Topf, den man in der Hand hält', () => {
    const cook = pommes();
    cook.press('crate-potatoes');
    cook.press('board');
    cook.until('board', 'potato-cut', true);
    cook.press('stove-pot');
    cook.press('sink');
    expect(cook.press('board').do).toBe('combine');
    expect(cook.held).toEqual({ item: 'pot', on: ['water', 'potato-cut'] });
    // Erst auf dem Herd kocht es.
    expect(cook.press('stove-pot').do).toBe('place');
    cook.until('stove-pot', 'fries', false);
    // Der Topf mit den Pommes geht auch als Ganzes in die Hand — und über dem
    // Mülleimer bleibt er leer in ihr.
    expect(cook.press('stove-pot')).toEqual({ do: 'take', dish: { item: 'pot', on: ['fries'] } });
    expect(cook.press('bin').do).toBe('scrape');
    expect(cook.held).toEqual({ item: 'pot', on: [] });
  });

  it('Suppe: Karotte schneiden, im Topf mit Wasser kochen, in die Schüssel', () => {
    const cook = new Cook(['crate-carrots', 'board', 'stove-pot', 'sink', 'bowl-stack']);
    cook.press('stove-pot');
    cook.press('sink');
    cook.press('stove-pot');
    expect(cook.press('crate-carrots').do).toBe('take');
    // Ungeschnitten nimmt der Topf sie nicht.
    expect(cook.press('stove-pot').do).toBe('refuse');
    expect(cook.press('board').do).toBe('work');
    cook.until('board', 'carrot-cut', true);
    expect(cook.press('board').do).toBe('take');
    expect(cook.press('stove-pot').do).toBe('combine');
    cook.until('stove-pot', 'stew', false);
    expect(cook.press('bowl-stack').do).toBe('take');
    expect(cook.press('stove-pot').do).toBe('combine');
    expect(cook.held).toEqual({ item: 'bowl', on: ['stew'] });
    // Acht Schüsseln aus einem Topf (`SOUP_SERVINGS`): sieben sind noch darin.
    expect(cook.on('stove-pot')?.on).toHaveLength(7);
    for (let i = 0; i < 7; i++) {
      cook.held = { item: 'bowl', on: [] };
      expect(cook.press('stove-pot').do).toBe('combine');
    }
    expect(cook.on('stove-pot')).toEqual({ item: 'pot', on: [] });
  });

  it('Herdplatte: blank, der Topf mit Wasser darauf kocht wie auf dem Herd mit Topf', () => {
    const cook = new Cook(['crate-potatoes', 'board', 'stove-pot', 'hob', 'sink', 'plate-stack']);
    expect(cook.on('hob')).toBeNull();
    cook.press('stove-pot');
    cook.press('sink');
    expect(cook.press('hob').do).toBe('place');
    cook.press('crate-potatoes');
    cook.press('board');
    cook.until('board', 'potato-cut', true);
    cook.press('board');
    expect(cook.press('hob').do).toBe('combine');
    cook.until('hob', 'fries', false);
    cook.press('plate-stack');
    expect(cook.press('hob').do).toBe('combine');
    expect(cook.held).toEqual({ item: 'plate', on: ['fries'] });
  });
});

/** Ein Gastgeber ohne Modelle: sperrt, stellt nichts hin, misst nichts. */
function bareHost(alive = true): ElementHost {
  return {
    blockSolid: (cx, cz) => ({ cells: [`${cx},${cz}`], mesh: new THREE.Mesh() }),
    placeModel: () => Promise.resolve(null),
    measure: () => Promise.resolve(null),
    load: () => Promise.resolve(null),
    add: () => {},
    alive: () => alive,
  };
}

/** Eine Welt für die Stationen, die mitschreibt, was sich anmeldet. */
function stationWorld(): { host: StationHost; usables: Map<THREE.Object3D, Usable> } {
  const usables = new Map<THREE.Object3D, Usable>();
  let held: Dish | null = null;
  return {
    usables,
    host: {
      addUsable: (anchor, usable) => usables.set(anchor, usable),
      removeUsable: (anchor) => usables.delete(anchor),
      announce: () => {},
      held: () => held,
      heldHand: () => null,
      setHeld: (dish) => (held = dish),
      busy: () => null,
      dishView: () => new THREE.Group(),
    },
  };
}

/**
 * **„Nicht interagierbar" kommt nicht wieder** — gemeldet: _„In der Test
 * Restaurant welt sind die Vorrats Boxen mit Brötchen und Käse und co beim
 * conveyer belt nicht interagierbar."_ Die Kisten standen als Elemente da,
 * aber die Welt meldete nur an, was in ihrer eigenen Liste der Stationen
 * stand. Jetzt gibt es einen Weg (`furnish`), und auf ihm wird jedes
 * Element mit Stationsart Station.
 */
describe('Spielelemente — Eiswannen, Eismaschine, Hörnchen', () => {
  it('füllt die Wanne an der Maschine, wechselt die Sorte, schöpft ohne leer zu werden und leert am Mülleimer', () => {
    const cook = new Cook(['crate-trays', 'ice-machine', 'counter', 'ice-stand', 'bin']);
    expect(cook.press('crate-trays')).toEqual({ do: 'take', dish: { item: 'tray', on: [] } });
    expect(cook.press('ice-machine')).toMatchObject({ do: 'fill' });
    expect(cook.held).toEqual({ item: 'tray', on: ['ice-vanilla'] });
    cook.press('ice-machine');
    expect(cook.held).toEqual({ item: 'tray', on: ['ice-strawberry'] });
    cook.press('ice-machine');
    expect(cook.held).toEqual({ item: 'tray', on: ['ice-chocolate'] });
    cook.press('ice-machine');
    expect(cook.held).toEqual({ item: 'tray', on: ['ice-vanilla'] });
    // Auf die Platte, ein Hörnchen holen, zwei Kugeln schöpfen — die Wanne bleibt voll.
    expect(cook.press('counter').do).toBe('place');
    expect(cook.press('ice-stand').do).toBe('take');
    expect(cook.press('counter').do).toBe('combine');
    expect(cook.press('counter').do).toBe('combine');
    expect(cook.held).toEqual({ item: 'cone', on: ['ice-vanilla', 'ice-vanilla'] });
    expect(cook.on('counter')).toEqual({ item: 'tray', on: ['ice-vanilla'] });
    // Das Hörnchen mit Eis auf eine freie Platte legen geht wie jede Zutat.
    const counter = new Cook(['counter']);
    counter.held = cook.held;
    expect(counter.press('counter').do).toBe('place');
    // Die Wanne am Mülleimer leeren und zurück in die Kiste.
    cook.held = null;
    expect(cook.press('counter').do).toBe('take');
    expect(cook.press('bin').do).toBe('scrape');
    expect(cook.held).toEqual({ item: 'tray', on: [] });
    expect(cook.press('crate-trays').do).toBe('stow');
  });

  it('stellt die Wannen mit ihrer Sorte hin', () => {
    const cook = new Cook(['ice-tray-vanilla', 'ice-tray-strawberry', 'ice-tray-chocolate']);
    expect(cook.on('ice-tray-vanilla')).toEqual({ item: 'tray', on: ['ice-vanilla'] });
    expect(cook.on('ice-tray-strawberry')).toEqual({ item: 'tray', on: ['ice-strawberry'] });
    expect(cook.on('ice-tray-chocolate')).toEqual({ item: 'tray', on: ['ice-chocolate'] });
  });
});

describe('Spielelemente — hingestellt heißt benutzbar', () => {
  it('meldet jede Kiste an, die eine Welt hinstellt — auch neben einem Band', async () => {
    const { host, usables } = stationWorld();
    const layer = new StationLayer(host);
    const spots: ElementSpot[] = [
      { id: 'band-1', element: 'belt', x: 0, z: 1, face: 'E' },
      { id: 'band-2', element: 'belt', x: 1, z: 1, face: 'E' },
      { id: 'brötchen', element: 'crate-buns', x: 0, z: 0 },
      { id: 'käse', element: 'crate-cheese', x: 1, z: 0 },
      { id: 'tisch', element: 'table-round', x: 4, z: 0 },
    ];
    const placed = await furnish(bareHost(), spots, layer);
    expect(placed.map((one) => one.spot.id)).toEqual(spots.map((spot) => spot.id));
    expect(layer.states.map((state) => state.spot.id)).toEqual(['brötchen', 'käse']);
    // Davor stehen (die Vorderkanten bei z = 1): Beide melden sich mit „nehmen".
    layer.step(0, { x: 1, z: 1.6 });
    const prompts = placed
      .filter((one) => one.element.kind === 'crate')
      .map((one) => usables.get(one.anchor.children[0]!)?.usePrompt?.());
    expect(prompts).toHaveLength(2);
    for (const prompt of prompts) expect(prompt).toMatch(/nehmen/);
  });

  it('meldet nach dem Aufräumen nichts mehr an', async () => {
    const { host } = stationWorld();
    const layer = new StationLayer(host);
    const placed = await furnish(
      bareHost(false),
      [{ id: 'k', element: 'crate-buns', x: 0, z: 0 }],
      layer,
    );
    expect(placed).toEqual([]);
    expect(layer.states).toEqual([]);
  });

  it('stellt den Topf wieder auf den Herd, wenn alles leer wird', async () => {
    const { host } = stationWorld();
    const layer = new StationLayer(host);
    await furnish(bareHost(), [{ id: 'h', element: 'stove-pot', x: 0, z: 0 }], layer);
    expect(layer.states[0]!.on).toEqual({ item: 'pot', on: [] });
    layer.reset();
    expect(layer.states[0]!.on).toEqual({ item: 'pot', on: [] });
  });
});

describe('Spielelemente — Hörnchen und Eiswannen als Vorräte', () => {
  it('gibt am Eisstand ein Hörnchen, und die Wannen türmen Kugeln darauf wie im Restaurant', () => {
    const cook = new Cook(['ice-stand', 'ice-tray-vanilla', 'ice-tray-strawberry', 'bin']);
    expect(cook.press('ice-stand')).toMatchObject({ do: 'take' });
    expect(cook.held).toEqual({ item: 'cone', on: [] });
    for (const tub of ['strawberry', 'vanilla', 'vanilla', 'strawberry', 'vanilla']) {
      expect(cook.press(`ice-tray-${tub}`).do).toBe('combine');
    }
    expect(cook.held).toEqual({
      item: 'cone',
      on: ['ice-strawberry', 'ice-vanilla', 'ice-vanilla', 'ice-strawberry', 'ice-vanilla'],
    });
    // Der Vorrat geht nicht aus.
    cook.held = null;
    for (let i = 0; i < 20; i++) {
      expect(cook.press('ice-stand').do).toBe('take');
      cook.held = null;
    }
  });
});
