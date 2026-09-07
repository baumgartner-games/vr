import { MAX_LAG, shortestAngle, stepViewYaw } from './kartView';

const DEG = Math.PI / 180;
const STEP = 1 / 90;

/** Dreht das Kart `seconds` lang mit `rate` rad/s und zieht den Blick nach. */
function drive(lag: number, rate: number, seconds: number): { view: number; kart: number } {
  let view = 0;
  let kart = 0;
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    kart += rate * STEP;
    view = stepViewYaw(view, kart, lag, STEP);
  }
  return { view, kart };
}

describe('stepViewYaw', () => {
  it('screws the head to the kart when there is no lag', () => {
    expect(stepViewYaw(0, 1.2, 0, STEP)).toBe(1.2);
    expect(stepViewYaw(0, 1.2, -1, STEP)).toBe(1.2);
  });

  it('does nothing without time', () => {
    expect(stepViewYaw(0.3, 1.2, 0.2, 0)).toBe(1.2);
  });

  it('catches up roughly two thirds within one time constant', () => {
    // Ein Sprung des Karts — klein genug, dass der Deckel nicht mitredet —,
    // danach eine Zeitkonstante lang nachziehen.
    let view = 0;
    for (let i = 0; i < Math.round(0.2 / STEP); i++) view = stepViewYaw(view, 0.3, 0.2, STEP);
    expect(view / 0.3).toBeGreaterThan(0.58);
    expect(view / 0.3).toBeLessThan(0.68);
  });

  it('gets there in the end', () => {
    let view = 0;
    for (let i = 0; i < Math.round(3 / STEP); i++) view = stepViewYaw(view, 1, 0.2, STEP);
    expect(view).toBeCloseTo(1, 3);
  });

  it('stays behind the kart while it turns, and not in front of it', () => {
    const { view, kart } = drive(0.2, 1, 1.5);
    expect(view).toBeLessThan(kart);
    // Bei 1 rad/s und 0,2 s Nachlauf sind das rund 0,2 rad.
    expect(kart - view).toBeCloseTo(0.2, 1);
  });

  it('never falls further behind than the cap', () => {
    // Eine Drehrate, die weit über allem liegt, was ein Kart schafft.
    const { view, kart } = drive(0.4, 6, 2);
    expect(Math.abs(shortestAngle(kart - view))).toBeLessThanOrEqual(MAX_LAG * DEG + 1e-9);
  });

  it('takes the short way round the wrap', () => {
    // Kurz vor +π und kurz dahinter: der Weg ist zwei Hundertstel und nicht
    // fast ein voller Kreis.
    const view = stepViewYaw(Math.PI - 0.01, -Math.PI + 0.01, 0.2, 1);
    expect(Math.abs(shortestAngle(view - Math.PI))).toBeLessThan(0.05);
  });

  it('lands in the same place whether it is one step or ten', () => {
    const once = stepViewYaw(0, 0.3, 0.2, 0.1);
    let many = 0;
    for (let i = 0; i < 10; i++) many = stepViewYaw(many, 0.3, 0.2, 0.01);
    expect(many).toBeCloseTo(once, 9);
  });
});
