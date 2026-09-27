import * as fs from 'fs';
import * as path from 'path';
import { ELEMENTS, hasElement } from '../elements/elementCatalog';
import { overlaps, spotCentre, spotFace, spotTiles } from '../elements/elementPlace';
import { ITEM_LABELS } from '../test/zones/kitchenRecipes';
import { BELT_DONE, BELT_PLATE, BELT_STATIONS } from './burgerBelt';
import { MENU } from './guestWishes';
import {
  AISLE,
  KITCHENS,
  ROW_WIDTH,
  allElements,
  beltSpot,
  beltStationSpots,
  diningElements,
  diningTables,
  ground,
  kitchenDepth,
  kitchenElements,
  kitchenSpots,
  kitchenWidth,
  occupiedTiles,
  restaurantPlan,
  spawn,
  supplySpots,
} from './restaurantPlan';

const SHELF = path.join(__dirname, '../../../public/models/kaykit');
const SUPPLY = MENU.map((dish) => dish.id);

/** Jede Datei, die die Welt außer den Elementen hinstellt oder legt. */
function everyModel(): string[] {
  const out = new Set<string>([BELT_DONE, BELT_PLATE]);
  for (const spot of kitchenSpots())
    for (const element of kitchenElements(spot))
      for (const item of element.show ?? []) out.add(item);
  for (const station of BELT_STATIONS) {
    out.add(station.model);
    out.add(station.layer);
    if (station.extra) out.add(station.extra);
  }
  for (const dish of MENU) out.add(dish.model);
  return [...out];
}

describe('Test Restaurant — der Plan', () => {
  it('hat eine Mini-Küche je Gericht, spielbare zuerst', () => {
    expect(KITCHENS.map((kitchen) => `${kitchen.id}:${kitchen.mode}`)).toEqual([
      'burger:play',
      'suppe:play',
      'schinken:play',
      'pizza-to-go:play',
      'waffeln:play',
      'eis:ice',
      'pizza:show',
      'steak:show',
      'pommes:show',
    ]);
    for (const kitchen of KITCHENS) expect(kitchen.recipe.length).toBeGreaterThan(1);
  });

  it('baut nur aus Elementen, die es gibt', () => {
    const unknown = allElements(SUPPLY)
      .map((spot) => spot.element)
      .filter((id) => !hasElement(id));
    expect(unknown).toEqual([]);
    // Die Stationen am Band sind dasselbe Element wie ihr Modell.
    for (const station of BELT_STATIONS) {
      const element = ELEMENTS.find((one) => one.id === station.element)!;
      expect(element.parts[0]!.model).toBe(station.model);
    }
  });

  it('nimmt nur, was im Regal liegt', () => {
    const missing = everyModel().filter((file) => !fs.existsSync(path.join(SHELF, file)));
    expect(missing).toEqual([]);
  });

  it('gibt aus Kisten und Stapeln nur Dinge der Küche', () => {
    for (const spot of kitchenSpots())
      for (const element of kitchenElements(spot))
        if (element.gives) expect(element.gives in ITEM_LABELS).toBe(true);
  });

  it('legt in der Schauküche höchstens drei Dinge auf ein Element, und nur dort', () => {
    for (const kitchen of KITCHENS)
      for (const row of kitchen.rows)
        for (const piece of row) {
          expect((piece.show ?? []).length).toBeLessThanOrEqual(3);
          if (kitchen.mode !== 'show') expect(piece.show).toBeUndefined();
        }
  });

  it('bricht die Küchen in Reihen um, keine breiter als eine Reihe', () => {
    for (const { kitchen, x } of kitchenSpots())
      expect(x + kitchenWidth(kitchen)).toBeLessThanOrEqual(ROW_WIDTH);
  });

  it('stellt nichts auf dieselbe Kachel', () => {
    expect(overlaps(allElements(SUPPLY))).toEqual([]);
    const tiles = occupiedTiles(SUPPLY);
    expect(new Set(tiles).size).toBe(tiles.length);
  });

  it('stellt Küchen mit zwei Reihen gegenüber, mit einem freien Gang dazwischen', () => {
    const taken = new Set(occupiedTiles(SUPPLY));
    const pairs = kitchenSpots().filter((spot) => spot.kitchen.rows.length === 2);
    expect(pairs.map((spot) => spot.kitchen.id)).toEqual(['burger', 'suppe']);
    for (const spot of pairs) {
      expect(kitchenDepth(spot.kitchen)).toBe(2 + AISLE);
      const elements = kitchenElements(spot);
      for (const element of elements)
        expect(spotFace(element)).toBe(element.z === spot.z ? 'S' : 'N');
      // Der Gang ist frei, und an beiden Enden offen.
      const width = kitchenWidth(spot.kitchen);
      for (let x = spot.x - 1; x <= spot.x + width; x++)
        expect(taken.has(`${x},${spot.z + 1}`)).toBe(false);
    }
  });

  it('hat vor jeder spielbaren Station eine freie Kachel', () => {
    const taken = new Set(occupiedTiles(SUPPLY));
    for (const spot of kitchenSpots()) {
      if (spot.kitchen.mode === 'show') continue;
      for (const element of kitchenElements(spot)) {
        const z = spotFace(element) === 'S' ? element.z + 1 : element.z - 1;
        expect({ id: element.id, free: !taken.has(`${element.x},${z}`) }).toEqual({
          id: element.id,
          free: true,
        });
      }
    }
  });

  it('hat für jedes Gericht der Karte eine Vorratsbox', () => {
    expect(supplySpots(MENU.length)).toHaveLength(MENU.length);
  });

  it('stellt alles auf den Boden', () => {
    const g = ground();
    const inside = (x: number, z: number): boolean =>
      x >= g.x && x < g.x + g.w && z >= g.z && z < g.z + g.d;
    for (const tile of occupiedTiles(SUPPLY)) {
      const [x, z] = tile.split(',').map(Number) as [number, number];
      expect(inside(x, z)).toBe(true);
    }
    const start = spawn();
    expect(inside(start.x, start.z)).toBe(true);
    expect(occupiedTiles(SUPPLY)).not.toContain(`${Math.floor(start.x)},${Math.floor(start.z)}`);
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

  it('stellt jeden Stuhl dorthin, wo sein Gast sitzt, und dreht ihn zum Tisch', () => {
    const chairs = diningElements().filter((spot) => spot.element === 'chair');
    const seats = diningTables().flatMap((t) => t.seats);
    expect(chairs).toHaveLength(seats.length);
    chairs.forEach((chair, i) => {
      const seat = seats[i]!;
      const centre = spotCentre(chair);
      const [ox, oz] = chair.offset ?? [0, 0];
      expect(centre.x + ox).toBeCloseTo(seat.x);
      expect(centre.z + oz).toBeCloseTo(seat.z);
      // Höchstens eine halbe Kachel daneben: Der Stuhl steht auf seiner Kachel.
      expect(Math.abs(ox)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(oz)).toBeLessThanOrEqual(0.5);
      const yaw = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 }[spotFace(chair)];
      expect(Math.cos(yaw - seat.yaw)).toBeCloseTo(1);
    });
  });

  it('lässt das Band südlich der Küchen laufen, die Tische südlich des Bands', () => {
    const belt = beltSpot();
    const lowest = Math.max(
      ...kitchenSpots()
        .flatMap(kitchenElements)
        .flatMap(spotTiles)
        .map((tile) => Number(tile.split(',')[1])),
    );
    // Zwischen der letzten Küche und den Stationen am Band bleibt Platz zum Stehen.
    const stations = beltStationSpots();
    for (const station of stations) expect(station.z).toBeGreaterThan(lowest + 1);
    for (const t of diningTables()) expect(t.z).toBeGreaterThan(belt.z + 2);
  });
});
