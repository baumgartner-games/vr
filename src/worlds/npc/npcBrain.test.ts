import {
  COURSE_MAX,
  COURSE_MIN,
  aheadFactor,
  distanceBetween,
  newBrainState,
  stepBrain,
  turnToward,
  wrapAngle,
  yawTo,
  type BrainSense,
} from './npcBrain';
import { brainOf } from './npcBrains';

/** Eine Frame mit allem, was ein Hirn braucht — der Rest kommt vom Aufrufer. */
function sense(over: Partial<BrainSense> = {}): BrainSense {
  return {
    at: { x: 0, z: 0 },
    yaw: 0,
    player: null,
    dt: 1 / 60,
    random: () => 0.5,
    ...over,
  };
}

describe('Winkel', () => {
  it('holt jeden Winkel in den halben Kreis zurück', () => {
    expect(wrapAngle(0)).toBeCloseTo(0, 9);
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(-Math.PI, 9);
    expect(wrapAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2, 9);
  });

  it('schaut mit Gierwinkel null nach -Z', () => {
    // Dieselbe Rechnung wie bei der Drohne: vorne ist -Z, und ein Ding vor mir
    // steht bei kleinerem Z.
    expect(yawTo({ x: 0, z: 0 }, { x: 0, z: -5 })).toBeCloseTo(0, 9);
    // Der halbe Kreis liegt auf der Naht: ±π ist dieselbe Richtung.
    expect(Math.abs(yawTo({ x: 0, z: 0 }, { x: 0, z: 5 }))).toBeCloseTo(Math.PI, 9);
    // Nach rechts (+X) dreht der Gierwinkel negativ — die Rechte-Hand-Regel um Y.
    expect(yawTo({ x: 0, z: 0 }, { x: 5, z: 0 })).toBeCloseTo(-Math.PI / 2, 9);
  });

  it('dreht über den kürzeren Bogen', () => {
    // Von 170° auf -170° sind es 20° über die Naht und nicht 340° herum.
    const from = 170 * (Math.PI / 180);
    const to = -170 * (Math.PI / 180);
    const step = turnToward(from, to, 5 * (Math.PI / 180));
    expect(wrapAngle(step - from)).toBeCloseTo(5 * (Math.PI / 180), 9);
  });

  it('rastet auf dem Ziel ein, statt darüber hinauszuschießen', () => {
    expect(turnToward(0, 0.1, 1)).toBeCloseTo(0.1, 9);
  });

  it('läuft nur, wohin es auch schaut', () => {
    expect(aheadFactor(0)).toBeCloseTo(1, 9);
    expect(aheadFactor(Math.PI / 3)).toBeCloseTo(0.5, 9);
    expect(aheadFactor(Math.PI / 2)).toBeCloseTo(0, 9);
    // Rückwärts wird nicht gelaufen, auch nicht ein bisschen.
    expect(aheadFactor(Math.PI)).toBe(0);
  });
});

describe('Stehen', () => {
  it('bewegt sich nicht, dreht sich aber zum Spieler', () => {
    const state = newBrainState(0);
    const step = stepBrain('idle', state, sense({ player: { x: 3, z: 0 }, dt: 1 }));
    expect(step.vx).toBe(0);
    expect(step.vz).toBe(0);
    expect(step.gait).toBe('stand');
    expect(step.sees).toBe(true);
    // 90° Drehrate, eine Sekunde: den Viertelkreis nach rechts hat er ganz.
    expect(step.yaw).toBeCloseTo(-Math.PI / 2, 6);
  });

  it('schlägt nie zu, auch wenn man ihm auf die Füße tritt', () => {
    const state = newBrainState(0);
    for (let i = 0; i < 300; i++) {
      const step = stepBrain('idle', state, sense({ player: { x: 0.1, z: 0 } }));
      expect(step.attack).toBe(false);
    }
  });

  it('merkt sich nicht mehr, dass es jemanden gesehen hat, wenn er weg ist', () => {
    const state = newBrainState(0);
    stepBrain('idle', state, sense({ player: { x: 1, z: 0 } }));
    expect(state.awake).toBe(true);
    stepBrain('idle', state, sense({ player: { x: 100, z: 0 } }));
    expect(state.awake).toBe(false);
  });
});

describe('Verfolgen', () => {
  const chase = brainOf('chase').tuning;

  it('bleibt stehen, solange niemand in Sichtweite ist', () => {
    const state = newBrainState(0);
    const far = chase.sense + 5;
    const step = stepBrain('chase', state, sense({ player: { x: 0, z: -far } }));
    expect(step.gait).toBe('stand');
    expect(step.sees).toBe(false);
    expect(step.vz).toBe(0);
  });

  it('läuft auf den Spieler zu, sobald er in Sichtweite ist', () => {
    const state = newBrainState(0);
    const step = stepBrain('chase', state, sense({ player: { x: 0, z: -5 } }));
    expect(step.gait).toBe('walk');
    expect(step.vz).toBeCloseTo(-chase.speed, 6);
    expect(step.vx).toBeCloseTo(0, 6);
  });

  it('kommt auch an, wenn er hinter ihm steht', () => {
    const state = newBrainState(0);
    const at = { x: 0, z: 0 };
    const player = { x: 0, z: 6 };
    let yaw = 0;
    const dt = 1 / 60;
    for (let i = 0; i < 600; i++) {
      const step = stepBrain('chase', state, sense({ at, yaw, player, dt }));
      yaw = step.yaw;
      at.x += step.vx * dt;
      at.z += step.vz * dt;
      if (step.gait === 'strike') break;
    }
    expect(distanceBetween(at, player)).toBeLessThanOrEqual(chase.reach + 1e-6);
  });

  it('schlägt in Reichweite zu — und dann erst wieder nach der Wartezeit', () => {
    const state = newBrainState(0);
    const near = sense({ player: { x: 0, z: -chase.reach / 2 }, dt: 0.1 });
    const first = stepBrain('chase', state, near);
    expect(first.gait).toBe('strike');
    expect(first.attack).toBe(true);
    expect(first.vx).toBe(0);
    expect(first.vz).toBe(0);

    // Und die Schläge danach liegen die Wartezeit auseinander — auf ein Bild
    // genau, denn zwischen zwei Bildern kann die Uhr nicht ablaufen.
    const dt = 0.05;
    const beats: number[] = [];
    for (let i = 1; i <= 400; i++) {
      if (stepBrain('chase', state, sense({ ...near, dt })).attack) beats.push(i * dt);
    }
    expect(beats.length).toBeGreaterThan(3);
    for (let i = 1; i < beats.length; i++) {
      expect(beats[i]! - beats[i - 1]!).toBeGreaterThanOrEqual(chase.cooldown - 1e-9);
      expect(beats[i]! - beats[i - 1]!).toBeLessThanOrEqual(chase.cooldown + dt + 1e-9);
    }
  });
});

describe('Schlendern', () => {
  it('würfelt einen Kurs und behält ihn eine Weile', () => {
    const state = newBrainState(0);
    let calls = 0;
    const random = (): number => {
      calls++;
      return 0.25;
    };
    stepBrain('wander', state, sense({ random, dt: 0.1 }));
    expect(calls).toBe(2);
    expect(state.hold).toBeCloseTo(COURSE_MIN + 0.25 * (COURSE_MAX - COURSE_MIN), 6);

    // Der Kurs bleibt, bis die Uhr abgelaufen ist — und wird dann neu gewürfelt.
    const held = state.course;
    for (let i = 0; i < 20; i++) stepBrain('wander', state, sense({ random, dt: 0.1 }));
    expect(state.course).toBe(held);
    expect(calls).toBe(2);
  });

  it('läuft los, auch ohne dass jemand da ist', () => {
    const state = newBrainState(0);
    let moved = 0;
    let yaw = 0;
    for (let i = 0; i < 120; i++) {
      const step = stepBrain('wander', state, sense({ yaw, random: () => 0.1 }));
      yaw = step.yaw;
      moved = Math.hypot(step.vx, step.vz);
    }
    expect(moved).toBeGreaterThan(0);
  });
});
