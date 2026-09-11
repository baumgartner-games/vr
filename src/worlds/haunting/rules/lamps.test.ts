import {
  LAMP_BUDGET,
  LAMP_FLICKER,
  LAMP_RANGE,
  freshLamps,
  isSwitched,
  lampGlow,
  lampOut,
  lampUntil,
  stepLamps,
  switchLamp,
} from './lamps';

/** Ein Würfel, der immer dasselbe sagt: Dann steht die Brenndauer fest. */
const fixed = (value: number) => () => value;

describe('lamps', () => {
  test('die dritte Lampe macht die älteste aus', () => {
    const lamps = freshLamps();
    let lit = switchLamp(lamps, [], 'a', 0, fixed(0)).lit;
    lit = switchLamp(lamps, lit, 'b', 1, fixed(0)).lit;
    expect(lit.sort()).toEqual(['a', 'b']);
    const third = switchLamp(lamps, lit, 'c', 2, fixed(0));
    expect(third.dropped).toBe('a');
    expect(third.lit.sort()).toEqual(['b', 'c']);
    expect(lamps.on).toHaveLength(LAMP_BUDGET);
  });

  test('dieselbe Lampe noch einmal umgelegt geht wieder aus', () => {
    const lamps = freshLamps();
    const on = switchLamp(lamps, [], 'a', 0, fixed(0));
    expect(on.on).toBe(true);
    const off = switchLamp(lamps, on.lit, 'a', 3, fixed(0));
    expect(off.on).toBe(false);
    expect(off.lit).toEqual([]);
    expect(off.dropped).toBe('');
    expect(isSwitched(lamps, 'a')).toBe(false);
  });

  /**
   * **„Lichter gehen nach ein paar Sekunden automatisch aus."** Eine halbe
   * Minute ist die Lesart dieses Satzes: lang genug, um einen Raum zu
   * durchqueren, kurz genug, dass niemand die Lampe stehen lässt und
   * weitergeht. Die Zahl steht hier, damit niemand sie versehentlich wieder
   * auf eine Minute schiebt.
   */
  test('brennt eine knappe halbe Minute und nie länger als 35 Sekunden', () => {
    expect(LAMP_RANGE).toEqual([25, 35]);
    // Und die Vorwarnung bleibt ein spürbarer Teil davon, ohne ihn zu fressen.
    expect(LAMP_FLICKER).toBeLessThan(LAMP_RANGE[0] / 4);
  });

  test('die Brenndauer liegt zwischen den beiden Grenzen', () => {
    const early = freshLamps();
    switchLamp(early, [], 'a', 10, fixed(0));
    expect(lampUntil(early, 'a')).toBe(10 + LAMP_RANGE[0]);
    const late = freshLamps();
    switchLamp(late, [], 'a', 10, fixed(1));
    expect(lampUntil(late, 'a')).toBe(10 + LAMP_RANGE[1]);
  });

  test('eine Lampe geht nach ihrer Zeit von selbst aus', () => {
    const lamps = freshLamps();
    const lit = switchLamp(lamps, [], 'a', 0, fixed(0)).lit;
    const until = LAMP_RANGE[0];
    expect(stepLamps(lamps, lit, until - 0.1).out).toEqual([]);
    const step = stepLamps(lamps, lit, until);
    expect(step.out).toEqual(['a']);
    expect(step.lit).toEqual([]);
    expect(lamps.on).toEqual([]);
  });

  test('das Flackern meldet sich einmal, nicht in jedem Bild', () => {
    const lamps = freshLamps();
    const lit = switchLamp(lamps, [], 'a', 0, fixed(0)).lit;
    const until = LAMP_RANGE[0];
    expect(stepLamps(lamps, lit, until - LAMP_FLICKER - 0.5).flicker).toEqual([]);
    expect(stepLamps(lamps, lit, until - LAMP_FLICKER).flicker).toEqual(['a']);
    expect(stepLamps(lamps, lit, until - LAMP_FLICKER + 0.1).flicker).toEqual([]);
  });

  test('lampGlow brennt voll, zuckt am Ende und ist danach aus', () => {
    const lamps = freshLamps();
    switchLamp(lamps, [], 'a', 0, fixed(0));
    const until = LAMP_RANGE[0];
    expect(lampGlow(lamps, 'a', 0)).toBe(1);
    expect(lampGlow(lamps, 'a', until - LAMP_FLICKER)).toBe(1);
    expect(lampGlow(lamps, 'a', until)).toBe(0);
    // Zwischendrin bleibt es innerhalb der Grenzen und ist mindestens einmal
    // wirklich dunkler — ein „Flackern", das immer 1 bleibt, ist keines.
    let dimmest = 1;
    for (let t = until - LAMP_FLICKER; t < until; t += 0.05) {
      const glow = lampGlow(lamps, 'a', t);
      expect(glow).toBeGreaterThanOrEqual(0);
      expect(glow).toBeLessThanOrEqual(1);
      dimmest = Math.min(dimmest, glow);
    }
    expect(dimmest).toBeLessThan(0.5);
  });

  test('eine Lampe, die niemand angemacht hat, brennt einfach', () => {
    const lamps = freshLamps();
    expect(lampGlow(lamps, 'irgendwo', 12)).toBe(1);
    expect(lampUntil(lamps, 'irgendwo')).toBeNull();
  });

  test('was der Spuk auslöscht, vergisst auch die Buchführung', () => {
    const lamps = freshLamps();
    const lit = switchLamp(lamps, [], 'a', 0, fixed(0)).lit;
    const after = lampOut(lamps, lit, 'a');
    expect(after).toEqual([]);
    expect(lamps.on).toEqual([]);
    expect(stepLamps(lamps, after, LAMP_RANGE[1] + 1).out).toEqual([]);
  });

  test('Räume, die von woanders dunkel wurden, fallen aus der Buchführung', () => {
    const lamps = freshLamps();
    switchLamp(lamps, [], 'a', 0, fixed(0));
    // Der Stand vom Netz sagt: dort ist es dunkel. Dann ist die Lampe keine mehr.
    const step = stepLamps(lamps, [], 1);
    expect(step.out).toEqual([]);
    expect(lamps.on).toEqual([]);
  });

  test('helle Räume, die niemand geschaltet hat, bleiben unangetastet', () => {
    const lamps = freshLamps();
    const always = ['halle', 'gang', 'labor'];
    const step = stepLamps(lamps, always, 999);
    expect(step.lit).toEqual(always);
    expect(step.out).toEqual([]);
    const on = switchLamp(lamps, always, 'kammer', 0, fixed(0));
    expect(on.dropped).toBe('');
    expect(on.lit).toEqual([...always, 'kammer']);
  });
});
