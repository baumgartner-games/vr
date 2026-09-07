import {
  DRAIN_SECONDS,
  GRAB_AT,
  GROUND_SECONDS,
  RECOVER_AT,
  REGEN_RAMP,
  SLIP_AT,
  freshStamina,
  stepStamina,
  type Stamina,
} from './stamina';

/** Ein paar Sekunden am Stück, in Bildern von 1/60 s. */
function run(
  start: Stamina,
  seconds: number,
  support: number,
  drain: number,
  hanging = true,
): Stamina & { spent: boolean } {
  let state: Stamina = { ...start };
  let spent = false;
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) {
    const step = stepStamina(state, support, drain, hanging, dt);
    state = { value: step.value, ramp: step.ramp };
    spent = spent || step.spent;
  }
  return { ...state, spent };
}

describe('Ausdauer beim Klettern', () => {
  it('fängt voll an', () => {
    expect(freshStamina().value).toBe(1);
  });

  it('bleibt bei perfektem Material stehen, egal wie lange', () => {
    // Die Leiter: `drain` ist null, und dann läuft nichts aus — selbst wenn
    // der Halt rechnerisch mies wäre.
    const after = run({ value: 0.4, ramp: 0 }, 60, 0.1, 0);
    expect(after.spent).toBe(false);
    expect(after.value).toBeGreaterThan(0.4);
  });

  it('läuft unter der Schwelle aus, und am glatten Fels schneller', () => {
    const rough = run(freshStamina(), 6, 0.35, 1);
    const smooth = run(freshStamina(), 6, 0.35, 1.9);
    expect(rough.value).toBeLessThan(1);
    expect(smooth.value).toBeLessThan(rough.value);
  });

  it('leert sich bei ganz schlechtem Halt in der versprochenen Zeit', () => {
    // Halt null heißt: der volle Abzug, also `DRAIN_SECONDS` bis leer.
    const half = run(freshStamina(), DRAIN_SECONDS / 2, 0, 1);
    expect(half.value).toBeCloseTo(0.5, 1);
    const all = run(freshStamina(), DRAIN_SECONDS + 1, 0, 1);
    expect(all.value).toBe(0);
    expect(all.spent).toBe(true);
  });

  it('erholt sich über der Schwelle — aber nicht sofort', () => {
    const start: Stamina = { value: 0.4, ramp: 0 };
    const blink = run(start, 0.1, 1, 1);
    const breath = run(start, 1.2, 1, 1);
    // Der Anlauf: in zwölfmal so viel Zeit kommt deutlich mehr als das
    // Zwölffache heraus.
    expect(blink.value - 0.4).toBeGreaterThan(0);
    expect(breath.value - 0.4).toBeGreaterThan((blink.value - 0.4) * 12);
  });

  it('erholt sich an einem knappen Griff langsamer als an einem tadellosen', () => {
    const start: Stamina = { value: 0.3, ramp: REGEN_RAMP };
    const barely = stepStamina(start, RECOVER_AT + 0.001, 1, true, 1);
    const perfect = stepStamina(start, 1, 1, true, 1);
    expect(perfect.value).toBeGreaterThan(barely.value);
    expect(barely.value).toBeGreaterThan(start.value);
  });

  it('verliert den Anlauf, sobald der Halt wieder wegrutscht', () => {
    const warm = stepStamina({ value: 0.5, ramp: 2 }, 1, 1, true, 1 / 60);
    expect(warm.ramp).toBeGreaterThan(2);
    const cold = stepStamina({ value: 0.5, ramp: 2 }, 0.3, 1, true, 1 / 60);
    expect(cold.ramp).toBe(0);
  });

  it('füllt sich auf der Matte schneller als an der Wand', () => {
    const wall = run({ value: 0, ramp: 0 }, 2, 1, 1, true);
    const mat = run({ value: 0, ramp: 0 }, 2, 0, 0, false);
    expect(mat.value).toBeGreaterThan(wall.value);
    const full = run({ value: 0, ramp: 0 }, GROUND_SECONDS + 0.5, 0, 0, false);
    expect(full.value).toBe(1);
  });

  it('bleibt zwischen null und eins', () => {
    expect(stepStamina({ value: 1, ramp: 9 }, 1, 1, true, 5).value).toBe(1);
    expect(stepStamina({ value: 0.01, ramp: 0 }, 0, 1.9, true, 5).value).toBe(0);
  });

  it('meldet leer nur, solange noch jemand daran hängt', () => {
    expect(stepStamina({ value: 0.001, ramp: 0 }, 0, 1, true, 1).spent).toBe(true);
    expect(stepStamina({ value: 0, ramp: 0 }, 0, 1, false, 1).spent).toBe(false);
  });

  it('ändert bei stehender Zeit gar nichts', () => {
    const state: Stamina = { value: 0.42, ramp: 0.5 };
    const step = stepStamina(state, 0, 1.9, true, 0);
    expect(step.value).toBe(0.42);
    expect(step.ramp).toBe(0.5);
    expect(step.spent).toBe(false);
  });

  it('hält die Schwellen in der Reihenfolge, in der sie gemeint sind', () => {
    expect(SLIP_AT).toBeLessThan(GRAB_AT + 1);
    expect(GRAB_AT).toBeGreaterThan(0);
    expect(SLIP_AT).toBeLessThan(RECOVER_AT);
    expect(RECOVER_AT).toBeLessThan(1);
  });
});
