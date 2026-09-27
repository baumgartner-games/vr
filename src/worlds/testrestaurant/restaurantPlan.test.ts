import { elementById, hasElement } from '../elements/elementCatalog';
import { tickStation, useStation, type StationState } from '../plateup/plateUpStations';
import type { Dish } from '../test/zones/kitchenRecipes';
import { overlaps, spotTiles } from '../elements/elementPlace';
import { elementStations, slotStates, stationKind } from '../elements/stationLayer';
import { tileKey } from '../nav/navTile';
import { SPOTS, ground, restaurantPlan, spawn } from './restaurantPlan';

/**
 * **Das Test Restaurant** — Boden, Ankunftsort und die Burgerküche aus dem
 * Möbelkatalog (`SPOTS`).
 */
describe('Test Restaurant — der Plan', () => {
  it('hat einen Boden von 40 × 32 Kacheln, und man kommt darauf an', () => {
    const g = ground();
    expect([g.w, g.d]).toEqual([40, 32]);
    const plan = restaurantPlan();
    const at = spawn();
    const tile = { x: Math.floor(at.x), z: Math.floor(at.z) };
    expect(plan.graph.has(tileKey(tile.x, tile.z, 0))).toBe(true);
    // Mitten auf einer Kachel, damit die Figur (2 × 2 Zellen) frei steht.
    expect(at.x - tile.x).toBe(0.5);
    expect(at.z - tile.z).toBe(0.5);
  });

  it('stellt nur Elemente hin, die es gibt, auf den Boden, ohne Überlappen und nicht auf den Ankunftsort', () => {
    const g = ground();
    const at = spawn();
    const start = `${Math.floor(at.x)},${Math.floor(at.z)}`;
    for (const spot of SPOTS) {
      expect(hasElement(spot.element)).toBe(true);
      for (const tile of spotTiles(spot)) {
        const [x, z] = tile.split(',').map(Number) as [number, number];
        expect(x >= g.x && x < g.x + g.w && z >= g.z && z < g.z + g.d).toBe(true);
        expect(tile).not.toBe(start);
      }
    }
    expect(overlaps(SPOTS)).toEqual([]);
    expect(new Set(SPOTS.map((spot) => spot.id)).size).toBe(SPOTS.length);
  });

  it('macht aus jeder Stelle mit Stationsart eine Station — ohne zweite Liste', () => {
    // Jede Zeile: Wer eine Stationsart hat, antwortet auf `A` — hier alle 14.
    expect(SPOTS.every((spot) => stationKind(elementById(spot.element)) !== null)).toBe(true);
    for (const spot of SPOTS) {
      const kind = stationKind(elementById(spot.element));
      expect({ id: spot.id, stations: elementStations(spot).length > 0 }).toEqual({
        id: spot.id,
        stations: kind !== null,
      });
    }
  });

  it('stellt jedes Möbel nach Süden', () => {
    expect(SPOTS).toHaveLength(14);
    for (const spot of SPOTS)
      expect({ id: spot.id, face: spot.face }).toEqual({ id: spot.id, face: 'S' });
  });

  it('kocht einen Burger: Salat und Tomate schneiden, aufs Brötchen, auf den Teller', () => {
    let states: StationState[] = slotStates(SPOTS.flatMap(elementStations));
    let held: Dish | null = null;
    const at = (id: string): number => states.findIndex((one) => one.spot.id === id);
    const press = (id: string): string => {
      const i = at(id);
      const result = useStation(held, states[i]!);
      held = result.held;
      states = states.map((one, j) => (j === i ? result.station : one));
      return result.deed.do;
    };
    /** Davorstehen, bis auf dem Brett `item` liegt. */
    const chop = (item: string): void => {
      const i = at('brett');
      for (let t = 0; t < 600 && states[i]!.on?.item !== item; t++) {
        const tick = tickStation(states[i]!, 0.1, true, !held);
        states = states.map((one, j) => (j === i ? tick.station : one));
      }
      expect(states[i]!.on?.item).toBe(item);
    };
    // Salat aus der Kiste, aufs Brett — geschnitten wird, solange man davorsteht.
    expect(press('salat')).toBe('take');
    expect(press('brett')).toBe('work');
    chop('lettuce-cut');
    expect(press('brett')).toBe('take');
    expect(press('platte-2')).toBe('place');
    // Die Tomate genauso; sie bleibt auf dem Brett liegen.
    expect(press('tomaten')).toBe('take');
    expect(press('brett')).toBe('work');
    chop('tomato-cut');
    // Ein Brötchen auf die Platte, Salat und Tomate darauf.
    expect(press('broetchen')).toBe('take');
    expect(press('platte-3')).toBe('place');
    expect(press('platte-2')).toBe('take');
    expect(press('platte-3')).toBe('combine');
    expect(press('brett')).toBe('take');
    expect(press('platte-3')).toBe('combine');
    expect(states[at('platte-3')]!.on).toEqual({ item: 'bun', on: ['lettuce-cut', 'tomato-cut'] });
    // Vom Tellerstapel (vier Teller) den obersten mit dem Brötchen darauf.
    expect(press('platte-3')).toBe('take');
    expect(press('teller')).toBe('combine');
    expect(held).toEqual({ item: 'plate', on: ['bun', 'lettuce-cut', 'tomato-cut'] });
    expect(states[at('teller')]!.stock).toBe(3);
  });
});
