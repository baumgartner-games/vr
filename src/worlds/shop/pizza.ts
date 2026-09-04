/**
 * What a pizza is, as numbers.
 *
 * Four values — how often the dough has been punched, how much sauce, how much
 * cheese, how long it has been in the oven — and every question the shop asks
 * follows from them: what stage it is at, what the sign above it says, what
 * colour it has and what it was worth when it came out.
 *
 * No three.js in here, so the whole recipe is under test instead of being
 * something you have to bake to find out.
 */

export interface Pizza {
  /** Punches taken so far. At `KNEAD_PUNCHES` the ball is a flat base. */
  knead: number;
  /** How much of the base is covered in sauce, 0 to 1. */
  sauce: number;
  /** How much cheese is on it, 0 to 1. */
  cheese: number;
  /** Seconds spent in the oven. */
  bake: number;
}

/** Punches it takes to knead a ball flat. */
export const KNEAD_PUNCHES = 5;
/** Seconds in the oven until it is ready. */
export const BAKE_DONE = 10;
/** Seconds in the oven until it is ruined. */
export const BAKE_BURNT = 20;

export type PizzaStage = 'teig' | 'boden' | 'belegt' | 'ofen' | 'fertig' | 'verbrannt';

export function emptyPizza(): Pizza {
  return { knead: 0, sauce: 0, cheese: 0, bake: 0 };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** True once the ball has been kneaded into a base. */
export function isFlat(pizza: Pizza): boolean {
  return pizza.knead >= KNEAD_PUNCHES;
}

/** Where a pizza is in its short life. */
export function pizzaStage(pizza: Pizza): PizzaStage {
  if (!isFlat(pizza)) return 'teig';
  if (pizza.bake >= BAKE_BURNT) return 'verbrannt';
  if (pizza.bake >= BAKE_DONE) return 'fertig';
  if (pizza.bake > 0) return 'ofen';
  if (pizza.sauce > 0 || pizza.cheese > 0) return 'belegt';
  return 'boden';
}

/** One punch. A ball that is already flat cannot be flattened further. */
export function knead(pizza: Pizza): Pizza {
  return { ...pizza, knead: Math.min(KNEAD_PUNCHES, pizza.knead + 1) };
}

/** Sauce out of the ladle. Nothing sticks to a ball or to a baked pizza. */
export function addSauce(pizza: Pizza, amount: number): Pizza {
  if (!isFlat(pizza) || pizza.bake > 0) return pizza;
  return { ...pizza, sauce: clamp01(pizza.sauce + Math.max(0, amount)) };
}

/** Cheese out of the shaker. Sauce first — cheese on bare dough falls off. */
export function addCheese(pizza: Pizza, amount: number): Pizza {
  if (!isFlat(pizza) || pizza.bake > 0 || pizza.sauce <= 0) return pizza;
  return { ...pizza, cheese: clamp01(pizza.cheese + Math.max(0, amount)) };
}

/** Time in the oven. A ball just gets warm; only a base bakes. */
export function bakeFor(pizza: Pizza, dt: number): Pizza {
  if (!isFlat(pizza) || !(dt > 0)) return pizza;
  return { ...pizza, bake: pizza.bake + dt };
}

/**
 * What the pizza was worth, 0 to 100.
 *
 * Sauce and cheese carry it, and the last tenth is for getting it out of the
 * oven again: full marks the moment it is ready, nothing left by the time it
 * is black. A pizza that is not baked at all — or burnt — is worth nothing.
 */
export function pizzaScore(pizza: Pizza): number {
  const stage = pizzaStage(pizza);
  if (stage !== 'fertig') return 0;
  const sauce = Math.min(1, pizza.sauce / 0.8);
  const cheese = Math.min(1, pizza.cheese / 0.8);
  const freshness = clamp01((BAKE_BURNT - pizza.bake) / (BAKE_BURNT - BAKE_DONE));
  return Math.round(100 * (0.45 * sauce + 0.45 * cheese + 0.1 * freshness));
}

/** The headline over a pizza while it is being made. */
export function pizzaLabel(pizza: Pizza): string {
  switch (pizzaStage(pizza)) {
    case 'teig':
      return `Teig · ${pizza.knead}/${KNEAD_PUNCHES}`;
    case 'boden':
      return 'Pizzaboden';
    case 'belegt':
      return `Soße ${percent(pizza.sauce)} · Käse ${percent(pizza.cheese)}`;
    case 'ofen':
      return `Im Ofen · ${Math.round((pizza.bake / BAKE_DONE) * 100)}%`;
    case 'fertig':
      return `Fertig · ${pizzaScore(pizza)} Punkte`;
    case 'verbrannt':
      return 'Verbrannt';
  }
}

/** The line underneath: what this pizza is waiting for. */
export function pizzaHint(pizza: Pizza): string {
  switch (pizzaStage(pizza)) {
    case 'teig':
      return 'Auf den Tisch legen und mit der Faust flach schlagen';
    case 'boden':
      return 'Kelle nehmen und Tomatensoße verteilen';
    case 'belegt':
      return pizza.sauce < 0.5
        ? 'Mehr Soße — dann Käse darüber'
        : pizza.cheese < 0.5
          ? 'Käse darüber streuen'
          : 'Ab in den Ofen';
    case 'ofen':
      return 'Warten — und rechtzeitig herausholen';
    case 'fertig':
      return 'Auf einen Tisch im Gastraum stellen';
    case 'verbrannt':
      return 'Ab in den Mülleimer';
  }
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Red, green and blue from 0 to 1 — a colour without a colour library. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const RAW: Rgb = { r: 0.91, g: 0.83, b: 0.66 };
const GOLDEN: Rgb = { r: 0.84, g: 0.6, b: 0.29 };
const CHARCOAL: Rgb = { r: 0.15, g: 0.12, b: 0.1 };

/** How the dough looks after this long in the oven: pale, golden, then black. */
export function bakeTint(bake: number): Rgb {
  if (bake <= 0) return { ...RAW };
  if (bake < BAKE_DONE) return mix(RAW, GOLDEN, bake / BAKE_DONE);
  if (bake < BAKE_BURNT) {
    return mix(GOLDEN, CHARCOAL, (bake - BAKE_DONE) / (BAKE_BURNT - BAKE_DONE));
  }
  return { ...CHARCOAL };
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}
