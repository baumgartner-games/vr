import {
  DRIVER,
  Driver,
  FLYER,
  Walker,
  cornerFactor,
  newLocoState,
  type LocoInput,
  type LocoPoint,
  type Locomotion,
} from './locomotion';

const DT = 1 / 60;

/**
 * Lässt eine Fortbewegung `frames` Bilder lang auf ein Ziel zulaufen und gibt
 * zurück, wo sie danach steht. Die Integration ist dieselbe, die die Welt
 * macht: Geschwindigkeit mal Zeitschritt.
 */
function run(
  loco: Locomotion,
  frames: number,
  target: LocoPoint | null,
  options: { at?: LocoPoint; yaw?: number; last?: boolean; avoid?: LocoPoint } = {},
): { at: LocoPoint; yaw: number; speed: number; arrived: boolean; gait: string } {
  const at: LocoPoint = { x: options.at?.x ?? 0, z: options.at?.z ?? 0, y: options.at?.y ?? 0 };
  const state = newLocoState();
  let yaw = options.yaw ?? 0;
  let arrived = false;
  let gait = 'stand';
  for (let i = 0; i < frames; i++) {
    const input: LocoInput = {
      at,
      yaw,
      target,
      last: options.last ?? true,
      dt: DT,
      ...(options.avoid ? { avoid: options.avoid } : {}),
    };
    const step = loco.step(input, state);
    at.x += step.vx * DT;
    at.z += step.vz * DT;
    at.y = (at.y ?? 0) + step.vy * DT;
    yaw = step.yaw;
    arrived = step.arrived;
    gait = step.gait;
  }
  return { at, yaw, speed: state.speed, arrived, gait };
}

describe('Der Fußgänger', () => {
  const walker = new Walker({ speed: 2, turn: 120, accel: 6, reach: 0.5 });

  it('läuft nach Norden, wenn das Ziel nördlich liegt — vorne ist −Z', () => {
    const after = run(walker, 30, { x: 0, z: -10 });
    expect(after.at.z).toBeLessThan(-0.5);
    expect(Math.abs(after.at.x)).toBeLessThan(0.05);
    expect(after.yaw).toBeCloseTo(0, 6);
  });

  it('dreht sich erst und läuft dann — er weicht nicht seitwärts aus', () => {
    // Das Ziel liegt genau hinter ihm. Im ersten Bild darf nichts passieren.
    const first = run(walker, 1, { x: 0, z: 10 });
    expect(first.speed).toBeCloseTo(0, 9);
    // Nach der halben Drehung ist er unterwegs.
    const later = run(walker, 120, { x: 0, z: 10 });
    expect(later.at.z).toBeGreaterThan(1);
  });

  it('hält am letzten Wegpunkt an', () => {
    const after = run(walker, 240, { x: 0, z: -4 }, { last: true });
    expect(after.arrived).toBe(true);
    expect(after.speed).toBeCloseTo(0, 3);
    expect(Math.hypot(after.at.x, after.at.z + 4)).toBeLessThan(walker.reach);
  });

  it('läuft an einem Wegpunkt mitten im Weg vorbei, ohne zu bremsen', () => {
    // In der Welt rückt der Weg weiter, sobald `arrived` kommt. Geprüft wird
    // also der Moment des Ankommens: Wer dort noch Tempo hat, läuft durch;
    // wer dort bremst, hakt sich von Ecke zu Ecke durch die Karte.
    const state = newLocoState();
    const at: LocoPoint = { x: 0, z: 0 };
    let yaw = 0;
    let speedAtArrival = -1;
    for (let i = 0; i < 240; i++) {
      const step = walker.step({ at, yaw, target: { x: 0, z: -4 }, last: false, dt: DT }, state);
      at.x += step.vx * DT;
      at.z += step.vz * DT;
      yaw = step.yaw;
      if (step.arrived) {
        speedAtArrival = state.speed;
        break;
      }
    }
    expect(speedAtArrival).toBeGreaterThan(1);
  });

  it('bleibt stehen, wenn es nichts zu tun gibt', () => {
    const after = run(walker, 60, null);
    expect(after.speed).toBe(0);
    expect(after.gait).toBe('stand');
  });

  it('macht einen Bogen, wenn ihm jemand im Weg steht', () => {
    const straight = run(walker, 40, { x: 0, z: -10 });
    const around = run(walker, 40, { x: 0, z: -10 }, { avoid: { x: 1, z: 0 } });
    // Ausgewichen wird zur Seite, das Ziel bleibt dasselbe: er kommt weiterhin
    // voran, nur nicht mehr auf der Geraden.
    expect(around.at.x).toBeGreaterThan(straight.at.x + 0.2);
    expect(around.at.z).toBeLessThan(-0.3);
  });
});

describe('Das Fahrzeug', () => {
  it('lenkt gar nicht, solange es wirklich steht', () => {
    // Ein Fahrzeug ohne Vortrieb kommt nicht vom Fleck und damit auch nicht
    // herum: ω = v/R, und bei v = 0 ist ω = 0. Das ist der Unterschied zum
    // Fußgänger, der sich auf der Stelle dreht.
    const stuck = new Driver({ speed: 6, radius: 4, accel: 0, brake: 7, reverse: 0, reach: 1 });
    const state = newLocoState();
    const input: LocoInput = {
      at: { x: 0, z: 0 },
      yaw: 0,
      target: { x: 10, z: 0 },
      last: true,
      dt: DT,
    };
    expect(stuck.step(input, state).yaw).toBe(0);
    expect(state.speed).toBe(0);
  });

  it('lenkt anfangs kaum und mit steigendem Tempo mehr', () => {
    const state = newLocoState();
    const input: LocoInput = {
      at: { x: 0, z: 0 },
      yaw: 0,
      target: { x: 10, z: 0 },
      last: false,
      dt: DT,
    };
    const first = Math.abs(DRIVER.step(input, state).yaw);
    for (let i = 0; i < 60; i++) DRIVER.step({ ...input, yaw: 0 }, state);
    const fast = Math.abs(DRIVER.step({ ...input, yaw: 0 }, state).yaw);
    expect(first).toBeLessThan(0.001);
    expect(fast).toBeGreaterThan(first * 20);
  });

  it('fährt seinen Wendekreis und nicht enger', () => {
    // Ein enger Kreis (2 m) dreht in derselben Zeit weiter als ein weiter (12 m).
    const tight = new Driver({ speed: 6, radius: 2, accel: 4, brake: 7, reverse: 0, reach: 1 });
    const wide = new Driver({ speed: 6, radius: 12, accel: 4, brake: 7, reverse: 0, reach: 1 });
    const goal = { x: 20, z: -20 };
    expect(Math.abs(run(tight, 30, goal).yaw)).toBeGreaterThan(Math.abs(run(wide, 30, goal).yaw));
  });

  it('setzt zurück, wenn das Ziel hinter ihm liegt', () => {
    const after = run(DRIVER, 20, { x: 0, z: 6 }, { yaw: 0 });
    expect(after.speed).toBeLessThan(0);
    expect(after.gait).toBe('reverse');
    // Und zwar nach hinten, also in +Z, weil vorne −Z ist.
    expect(after.at.z).toBeGreaterThan(0);
  });

  it('bleibt vorwärts, wenn es nicht rückwärts darf', () => {
    const stubborn = new Driver({
      speed: 6,
      radius: 4,
      accel: 4,
      brake: 7,
      reverse: 0,
      reach: 1,
    });
    expect(run(stubborn, 20, { x: 0, z: 6 }, { yaw: 0 }).speed).toBeGreaterThan(0);
  });

  it('behält in der Kurve genug Tempo, um überhaupt zu lenken', () => {
    expect(cornerFactor(0)).toBe(1);
    expect(cornerFactor(Math.PI / 2)).toBeCloseTo(0.25, 9);
    expect(cornerFactor(Math.PI)).toBe(0.25);
    // Nie null: ein Fahrzeug, das steht, lenkt nicht mehr und käme nie herum.
    for (let a = -Math.PI; a <= Math.PI; a += 0.1) {
      expect(cornerFactor(a)).toBeGreaterThan(0);
    }
  });
});

describe('Der Flug', () => {
  it('nimmt die Luftlinie und steigt dabei', () => {
    const after = run(FLYER, 60, { x: 0, z: -10, y: 5 });
    expect(after.at.z).toBeLessThan(-1);
    expect(after.at.y!).toBeGreaterThan(0.5);
  });

  it('steigt nicht schneller, als er darf', () => {
    const state = newLocoState();
    const step = FLYER.step(
      { at: { x: 0, z: 0, y: 0 }, yaw: 0, target: { x: 0, z: -1, y: 100 }, last: true, dt: DT },
      state,
    );
    expect(step.vy).toBeLessThanOrEqual(3);
    expect(step.vy).toBeGreaterThan(0);
  });

  it('wartet nicht, bis die Nase stimmt — eine Drohne schiebt sich auch seitwärts', () => {
    const state = newLocoState();
    const step = FLYER.step(
      { at: { x: 0, z: 0, y: 0 }, yaw: 0, target: { x: 10, z: 0, y: 0 }, last: false, dt: DT },
      state,
    );
    expect(step.vx).toBeGreaterThan(0);
  });

  it('ist da, wenn er in allen drei Richtungen nah genug ist', () => {
    const state = newLocoState();
    const close = FLYER.step(
      { at: { x: 0, z: 0, y: 0 }, yaw: 0, target: { x: 0, z: 0, y: 1 }, last: true, dt: DT },
      state,
    );
    expect(close.arrived).toBe(true);
    const high = FLYER.step(
      { at: { x: 0, z: 0, y: 0 }, yaw: 0, target: { x: 0, z: 0, y: 9 }, last: true, dt: DT },
      state,
    );
    expect(high.arrived).toBe(false);
  });
});
