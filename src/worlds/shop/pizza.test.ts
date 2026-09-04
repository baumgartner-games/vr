import {
  BAKE_BURNT,
  BAKE_DONE,
  KNEAD_PUNCHES,
  addCheese,
  addSauce,
  bakeFor,
  bakeTint,
  emptyPizza,
  isFlat,
  knead,
  pizzaHint,
  pizzaLabel,
  pizzaScore,
  pizzaStage,
  type Pizza,
} from './pizza';

/** A ball punched flat. */
function base(): Pizza {
  let pizza = emptyPizza();
  for (let i = 0; i < KNEAD_PUNCHES; i++) pizza = knead(pizza);
  return pizza;
}

describe('knead', () => {
  it('needs the full count of punches', () => {
    let pizza = emptyPizza();
    for (let i = 0; i < KNEAD_PUNCHES - 1; i++) pizza = knead(pizza);
    expect(isFlat(pizza)).toBe(false);
    expect(isFlat(knead(pizza))).toBe(true);
  });

  it('stops once the base is flat', () => {
    expect(knead(knead(base())).knead).toBe(KNEAD_PUNCHES);
  });

  it('leaves the pizza it was given alone', () => {
    const pizza = emptyPizza();
    knead(pizza);
    expect(pizza.knead).toBe(0);
  });
});

describe('toppings', () => {
  it('refuses to sauce a ball of dough', () => {
    expect(addSauce(emptyPizza(), 0.5).sauce).toBe(0);
  });

  it('fills up and stops at full', () => {
    expect(addSauce(addSauce(base(), 0.7), 0.7).sauce).toBe(1);
  });

  it('wants sauce under the cheese', () => {
    expect(addCheese(base(), 0.5).cheese).toBe(0);
    expect(addCheese(addSauce(base(), 0.3), 0.5).cheese).toBe(0.5);
  });

  it('takes nothing more once it is in the oven', () => {
    const baking = bakeFor(addSauce(base(), 0.8), 3);
    expect(addSauce(baking, 0.5).sauce).toBe(0.8);
    expect(addCheese(baking, 0.5).cheese).toBe(0);
  });
});

describe('pizzaStage', () => {
  it('walks through the whole recipe', () => {
    expect(pizzaStage(emptyPizza())).toBe('teig');
    expect(pizzaStage(base())).toBe('boden');
    const dressed = addCheese(addSauce(base(), 0.9), 0.9);
    expect(pizzaStage(dressed)).toBe('belegt');
    expect(pizzaStage(bakeFor(dressed, 2))).toBe('ofen');
    expect(pizzaStage(bakeFor(dressed, BAKE_DONE))).toBe('fertig');
    expect(pizzaStage(bakeFor(dressed, BAKE_BURNT))).toBe('verbrannt');
  });

  it('does not bake a ball of dough', () => {
    expect(pizzaStage(bakeFor(emptyPizza(), 30))).toBe('teig');
  });
});

describe('pizzaScore', () => {
  it('pays nothing for anything that is not ready', () => {
    expect(pizzaScore(base())).toBe(0);
    expect(pizzaScore(bakeFor(addCheese(addSauce(base(), 1), 1), BAKE_BURNT))).toBe(0);
  });

  it('gives full marks for a well dressed pizza taken out at once', () => {
    expect(pizzaScore(bakeFor(addCheese(addSauce(base(), 1), 1), BAKE_DONE))).toBe(100);
  });

  it('takes points off for a bare one', () => {
    const bare = bakeFor(base(), BAKE_DONE);
    expect(pizzaScore(bare)).toBe(10);
  });

  it('takes points off the longer it sits in the oven', () => {
    const dressed = addCheese(addSauce(base(), 1), 1);
    const early = pizzaScore(bakeFor(dressed, BAKE_DONE));
    const late = pizzaScore(bakeFor(dressed, BAKE_DONE + (BAKE_BURNT - BAKE_DONE) / 2));
    expect(late).toBeLessThan(early);
    expect(late).toBeGreaterThan(0);
  });
});

describe('the signs above a pizza', () => {
  it('counts the punches while it is still a ball', () => {
    expect(pizzaLabel(knead(emptyPizza()))).toBe(`Teig · 1/${KNEAD_PUNCHES}`);
  });

  it('asks for what is missing next', () => {
    expect(pizzaHint(base())).toContain('Kelle');
    expect(pizzaHint(addSauce(base(), 0.9))).toContain('Käse');
    expect(pizzaHint(addCheese(addSauce(base(), 0.9), 0.9))).toContain('Ofen');
    expect(pizzaHint(bakeFor(base(), BAKE_BURNT))).toContain('Mülleimer');
  });

  it('has a line for every stage', () => {
    const stages = [
      emptyPizza(),
      base(),
      addSauce(base(), 0.5),
      bakeFor(base(), 2),
      bakeFor(base(), BAKE_DONE),
      bakeFor(base(), BAKE_BURNT),
    ];
    for (const pizza of stages) {
      expect(pizzaLabel(pizza).length).toBeGreaterThan(0);
      expect(pizzaHint(pizza).length).toBeGreaterThan(0);
    }
  });
});

describe('bakeTint', () => {
  it('starts pale and ends black', () => {
    expect(bakeTint(0).r).toBeGreaterThan(0.9);
    expect(bakeTint(BAKE_BURNT + 10).r).toBeLessThan(0.2);
  });

  it('gets darker the longer it bakes', () => {
    const steps = [0, 5, BAKE_DONE, 15, BAKE_BURNT].map((bake) => bakeTint(bake).r);
    for (let i = 1; i < steps.length; i++) expect(steps[i]!).toBeLessThan(steps[i - 1]!);
  });
});
