import * as fs from 'fs';
import * as path from 'path';
import { BELT_DONE, BELT_PLATE, BELT_STATIONS } from './burgerBelt';
import { MENU } from './guestWishes';
import {
  BELT_MODEL,
  KITCHENS,
  ROW_WIDTH,
  beltSpot,
  diningTables,
  ground,
  kitchenSpots,
  occupiedTiles,
  restaurantPlan,
  spawn,
  supplySpots,
} from './restaurantPlan';

const SHELF = path.join(__dirname, '../../../public/models/kaykit');

/** Jede Datei, die die Welt hinstellt. */
function everyModel(): string[] {
  const out = new Set<string>([BELT_MODEL, BELT_DONE, BELT_PLATE]);
  for (const kitchen of KITCHENS)
    for (const slot of kitchen.slots) {
      out.add(slot.base);
      for (const item of slot.items ?? []) out.add(item);
    }
  for (const station of BELT_STATIONS) {
    out.add(station.model);
    out.add(station.layer);
    if (station.extra) out.add(station.extra);
  }
  for (const dish of MENU) out.add(dish.model);
  return [...out];
}

describe('Test Restaurant — der Plan', () => {
  it('hat eine Mini-Küche je Gericht', () => {
    expect(KITCHENS.map((kitchen) => kitchen.id)).toEqual([
      'burger',
      'eis',
      'pizza',
      'pizza-to-go',
      'suppe',
      'waffeln',
      'steak',
      'schinken',
      'pommes',
    ]);
    for (const kitchen of KITCHENS) expect(kitchen.recipe.length).toBeGreaterThan(1);
  });

  it('nimmt nur, was im Regal liegt', () => {
    const missing = everyModel().filter((file) => !fs.existsSync(path.join(SHELF, file)));
    expect(missing).toEqual([]);
  });

  it('legt höchstens drei Dinge auf eine Platte', () => {
    for (const kitchen of KITCHENS)
      for (const slot of kitchen.slots) expect((slot.items ?? []).length).toBeLessThanOrEqual(3);
  });

  it('bricht die Küchen in Reihen um, keine breiter als eine Reihe', () => {
    for (const { kitchen, x } of kitchenSpots())
      expect(x + kitchen.slots.length).toBeLessThanOrEqual(ROW_WIDTH);
  });

  it('stellt nichts auf dieselbe Kachel', () => {
    const tiles = occupiedTiles();
    expect(new Set(tiles).size).toBe(tiles.length);
  });

  it('hat für jedes Gericht der Karte eine Vorratsbox', () => {
    expect(supplySpots(MENU.length)).toHaveLength(MENU.length);
  });

  it('stellt alles auf den Boden', () => {
    const g = ground();
    const inside = (x: number, z: number): boolean =>
      x >= g.x && x < g.x + g.w && z >= g.z && z < g.z + g.d;
    for (const tile of occupiedTiles()) {
      const [x, z] = tile.split(',').map(Number) as [number, number];
      expect(inside(x, z)).toBe(true);
    }
    const start = spawn();
    expect(inside(start.x, start.z)).toBe(true);
    expect(occupiedTiles()).not.toContain(`${Math.floor(start.x)},${Math.floor(start.z)}`);
    const plan = restaurantPlan();
    expect(plan.solids().some((solid) => solid.kind === 'floor')).toBe(true);
  });

  it('setzt die Gäste zur Tischmitte gewandt', () => {
    for (const t of diningTables())
      for (const seat of t.seats) {
        const lookX = Math.sin(seat.yaw);
        const lookZ = Math.cos(seat.yaw);
        // Ein Schritt in Blickrichtung kommt der Tischmitte näher.
        const before = Math.hypot(t.x - seat.x, t.z - seat.z);
        const after = Math.hypot(t.x - seat.x - lookX, t.z - seat.z - lookZ);
        expect(after).toBeLessThan(before);
      }
  });

  it('lässt das Band südlich der Küchen laufen, die Tische südlich des Bands', () => {
    const belt = beltSpot();
    const lastRow = Math.max(...kitchenSpots().map((spot) => spot.z));
    expect(belt.z).toBeGreaterThan(lastRow + 1);
    for (const t of diningTables()) expect(t.z).toBeGreaterThan(belt.z + 2);
  });
});
