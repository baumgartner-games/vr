import {
  BELT_DONE,
  BELT_EVERY,
  BELT_REST,
  BELT_SPEED,
  BELT_STATIONS,
  beltBurgers,
  beltFinished,
} from './burgerBelt';
import { bits } from './restaurantPlan';

const LENGTH = 12;
const TRAVEL = (LENGTH - BELT_STATIONS[0]!.at) / BELT_SPEED;

describe('Test Restaurant — das Förderband', () => {
  it('legt am Anfang eine untere Brötchenhälfte auf', () => {
    const [first] = beltBurgers(0, LENGTH);
    expect(first).toEqual({
      serial: 0,
      at: BELT_STATIONS[0]!.at,
      layers: [bits('food_ingredient_bun_bottom')],
      done: false,
    });
  });

  it('baut den Burger Station für Station von unten nach oben', () => {
    const seen: string[][] = [];
    for (let t = 0; t < TRAVEL; t += 0.1) {
      const burger = beltBurgers(t, LENGTH).find((one) => one.serial === 0)!;
      const last = seen[seen.length - 1];
      if (!last || last.length !== burger.layers.length) seen.push([...burger.layers]);
    }
    expect(seen.map((layers) => layers.length)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(seen[seen.length - 1]).toEqual(BELT_STATIONS.map((station) => station.layer));
  });

  it('fährt nach Osten und bleibt am Ende stehen', () => {
    let before = -1;
    for (let t = 0; t < TRAVEL + BELT_REST; t += 0.25) {
      const burger = beltBurgers(t, LENGTH).find((one) => one.serial === 0)!;
      expect(burger.at).toBeGreaterThanOrEqual(before);
      expect(burger.at).toBeLessThanOrEqual(LENGTH);
      before = burger.at;
    }
    const end = beltBurgers(TRAVEL + 0.5, LENGTH).find((one) => one.serial === 0)!;
    expect(end).toMatchObject({ at: LENGTH, done: true, layers: [] });
    expect(BELT_DONE).toBe(bits('food_burger'));
  });

  it('holt den fertigen Burger nach einer Weile ab', () => {
    const later = beltBurgers(TRAVEL + BELT_REST + 0.1, LENGTH);
    expect(later.some((one) => one.serial === 0)).toBe(false);
  });

  it('legt alle paar Sekunden ein neues Brötchen auf, ohne dass zwei ineinander fahren', () => {
    for (let t = 0; t < 60; t += 0.5) {
      const burgers = beltBurgers(t, LENGTH).filter((one) => !one.done);
      for (let i = 1; i < burgers.length; i++)
        expect(burgers[i - 1]!.at - burgers[i]!.at).toBeCloseTo(BELT_EVERY * BELT_SPEED);
    }
  });

  it('zählt die fertigen Burger', () => {
    expect(beltFinished(TRAVEL - 0.1, LENGTH)).toBe(0);
    expect(beltFinished(TRAVEL, LENGTH)).toBe(1);
    expect(beltFinished(TRAVEL + BELT_EVERY * 3, LENGTH)).toBe(4);
  });
});
