import {
  BAR_NEUTRAL,
  BAR_TRAVEL,
  HANG_GLIDER,
  WINGS,
  WING_MIN_AREA,
  attitude,
  barCommand,
  flapThrust,
  stepGlide,
  wingCommand,
  yawDelta,
  type GlideInput,
  type GlideParams,
  type GlideState,
} from './glideFlight';

const G = 9.81;
const DT = 1 / 90;
const NEUTRAL: GlideInput = { pitchUp: 0, roll: 0, area: 1, flap: 0 };

/** Fliegt `seconds` lang mit derselben Eingabe und gibt den Endzustand zurück. */
function fly(
  state: GlideState,
  input: GlideInput,
  params: GlideParams,
  seconds: number,
): GlideState {
  let current = state;
  for (let t = 0; t < seconds; t += DT) current = stepGlide(current, input, params, G, DT);
  return current;
}

/** Wie viel Höhe in `seconds` verloren geht, in Metern. */
function descent(
  state: GlideState,
  input: GlideInput,
  params: GlideParams,
  seconds: number,
): number {
  let current = state;
  let lost = 0;
  for (let t = 0; t < seconds; t += DT) {
    current = stepGlide(current, input, params, G, DT);
    lost -= current.velocity.y * DT;
  }
  return lost;
}

function trimmed(params: GlideParams): GlideState {
  return { velocity: { x: 0, y: 0, z: -params.trimSpeed }, bank: 0 };
}

function speed(state: GlideState): number {
  const v = state.velocity;
  return Math.hypot(v.x, v.y, v.z);
}

describe('stepGlide', () => {
  it('findet aus der Trimmfahrt in einen stetigen Gleitflug', () => {
    for (const params of [HANG_GLIDER, WINGS]) {
      const settled = fly(trimmed(params), NEUTRAL, params, 25);
      // Nach einer Weile ist die Fahrt wieder in der Nähe der Trimmfahrt …
      expect(speed(settled)).toBeGreaterThan(params.trimSpeed * 0.8);
      expect(speed(settled)).toBeLessThan(params.trimSpeed * 1.35);
      // … und das Verhältnis von Weg zu Höhe ist ungefähr die Gleitzahl.
      const later = fly(settled, NEUTRAL, params, 10);
      const forward = Math.hypot(later.velocity.x, later.velocity.z);
      const sink = -later.velocity.y;
      expect(sink).toBeGreaterThan(0);
      expect(forward / sink).toBeGreaterThan(params.glideRatio * 0.6);
      expect(forward / sink).toBeLessThan(params.glideRatio * 1.5);
    }
  });

  it('macht das Ziehen am Bügel schneller und das Drücken langsamer', () => {
    const neutral = fly(trimmed(HANG_GLIDER), NEUTRAL, HANG_GLIDER, 8);
    const pulled = fly(trimmed(HANG_GLIDER), { ...NEUTRAL, pitchUp: -1 }, HANG_GLIDER, 8);
    const pushed = fly(trimmed(HANG_GLIDER), { ...NEUTRAL, pitchUp: 0.6 }, HANG_GLIDER, 8);
    expect(speed(pulled)).toBeGreaterThan(speed(neutral) * 1.15);
    expect(speed(pushed)).toBeLessThan(speed(neutral));
    // Und wer zieht, geht steiler nach unten.
    expect(pulled.velocity.y).toBeLessThan(neutral.velocity.y);
  });

  it('fliegt in der Schräglage nach rechts eine Rechtskurve', () => {
    // Anderthalb Sekunden: genug für eine deutliche Kurve, zu wenig für eine
    // ganze Runde — in voller Schräglage kommt der Gleiter in fünf Sekunden
    // fast einmal herum.
    const turned = fly(trimmed(HANG_GLIDER), { ...NEUTRAL, roll: 1 }, HANG_GLIDER, 1.5);
    expect(turned.bank).toBeCloseTo(HANG_GLIDER.maxBank, 3);
    // Los ging es entlang -Z; rechts davon ist +X.
    expect(turned.velocity.x).toBeGreaterThan(2);
    expect(attitude(turned.velocity).yaw).toBeLessThan(-0.3);

    const left = fly(trimmed(HANG_GLIDER), { ...NEUTRAL, roll: -1 }, HANG_GLIDER, 1.5);
    expect(left.velocity.x).toBeLessThan(-2);
    expect(attitude(left.velocity).yaw).toBeGreaterThan(0.3);
  });

  it('lässt die Schräglage der Hand nur mit ihrer Rate folgen', () => {
    const after = stepGlide(trimmed(HANG_GLIDER), { ...NEUTRAL, roll: 1 }, HANG_GLIDER, G, 0.1);
    expect(after.bank).toBeCloseTo(HANG_GLIDER.bankRate * 0.1, 6);
  });

  it('trägt unterhalb der Abrissfahrt nicht mehr', () => {
    const slow: GlideState = { velocity: { x: 0, y: 0, z: -3 }, bank: 0 };
    const fallen = fly(slow, NEUTRAL, HANG_GLIDER, 1.5);
    // Fast freier Fall: nach anderthalb Sekunden deutlich über 10 m/s nach unten.
    expect(fallen.velocity.y).toBeLessThan(-9);
  });

  it('sinkt mit weniger Flügel schneller', () => {
    // Über die Höhe gemessen und nicht über die Sinkrate eines Augenblicks:
    // ein Flügel, der plötzlich weniger trägt, taucht, wird schnell, fängt
    // sich und schwingt — an einem einzelnen Bild kann er gerade steigen.
    const wide = descent(trimmed(WINGS), NEUTRAL, WINGS, 10);
    const folded = descent(trimmed(WINGS), { ...NEUTRAL, area: 0.3 }, WINGS, 10);
    expect(folded).toBeGreaterThan(wide * 1.5);
  });

  it('gewinnt mit Flügelschlag Höhe und Fahrt', () => {
    const gliding = fly(trimmed(WINGS), NEUTRAL, WINGS, 4);
    const flapping = fly(trimmed(WINGS), { ...NEUTRAL, flap: 4 }, WINGS, 4);
    expect(flapping.velocity.y).toBeGreaterThan(gliding.velocity.y + 1);
  });

  it('lässt den alten Zustand in Ruhe', () => {
    const before = trimmed(HANG_GLIDER);
    stepGlide(before, { ...NEUTRAL, roll: 1 }, HANG_GLIDER, G, DT);
    expect(before.velocity).toEqual({ x: 0, y: 0, z: -HANG_GLIDER.trimSpeed });
    expect(before.bank).toBe(0);
  });
});

describe('attitude und yawDelta', () => {
  it('liest die Nase aus der Bahn wie three.js rotation.y', () => {
    expect(attitude({ x: 0, y: 0, z: -5 }).yaw).toBeCloseTo(0);
    expect(attitude({ x: -5, y: 0, z: 0 }).yaw).toBeCloseTo(Math.PI / 2);
    expect(attitude({ x: 5, y: 0, z: 0 }).yaw).toBeCloseTo(-Math.PI / 2);
    expect(attitude({ x: 0, y: 5, z: -5 }).pitch).toBeCloseTo(Math.PI / 4);
    expect(attitude({ x: 0, y: 0, z: 0 })).toEqual({ yaw: 0, pitch: 0 });
  });

  it('nimmt immer den kürzeren Weg herum', () => {
    expect(yawDelta(0, 0.5)).toBeCloseTo(0.5);
    expect(yawDelta(3, -3)).toBeCloseTo(2 * Math.PI - 6);
    expect(yawDelta(-3, 3)).toBeCloseTo(-(2 * Math.PI - 6));
  });
});

describe('barCommand', () => {
  it('ist in Ruhe neutral', () => {
    expect(barCommand(BAR_NEUTRAL, 0)).toEqual({ pitchUp: 0, roll: 0 });
  });

  it('macht Ziehen zu Nase runter und Schieben zur Kurve auf dieselbe Seite', () => {
    expect(barCommand(BAR_NEUTRAL - BAR_TRAVEL / 2, 0).pitchUp).toBeCloseTo(-0.5);
    expect(barCommand(BAR_NEUTRAL + BAR_TRAVEL, 0).pitchUp).toBeCloseTo(1);
    expect(barCommand(BAR_NEUTRAL, 0.1).roll).toBeCloseTo(0.5);
    expect(barCommand(BAR_NEUTRAL, -0.1).roll).toBeCloseTo(-0.5);
  });

  it('läuft nicht über voll hinaus', () => {
    expect(barCommand(-2, 3)).toEqual({ pitchUp: -1, roll: 1 });
  });
});

describe('wingCommand', () => {
  const spread = (up: number, ahead = 0.1) => ({ ahead, up, side: 0 });

  it('kippt auf die Seite der tieferen Hand', () => {
    const command = wingCommand({ ...spread(0.2), side: -0.65 }, { ...spread(-0.2), side: 0.65 });
    expect(command.roll).toBeCloseTo(1);
    expect(command.area).toBeCloseTo(1);
    expect(command.pitchUp).toBeCloseTo(0);
  });

  it('taucht, wenn die Hände nach vorn gehen', () => {
    const command = wingCommand(
      { ahead: 0.32, up: 0, side: -0.5 },
      { ahead: 0.32, up: 0, side: 0.5 },
    );
    expect(command.pitchUp).toBeCloseTo(-1);
  });

  it('behält mit angelegten Armen einen Rest Flügel', () => {
    const command = wingCommand({ ahead: 0, up: 0, side: -0.05 }, { ahead: 0, up: 0, side: 0.05 });
    expect(command.area).toBe(WING_MIN_AREA);
  });
});

describe('flapThrust', () => {
  it('zählt nur den gemeinsamen Abwärtsschlag', () => {
    expect(flapThrust(2, 2)).toBeGreaterThan(0);
    expect(flapThrust(2, 0.3)).toBe(0);
    expect(flapThrust(0.4, 0.4)).toBe(0);
    expect(flapThrust(-2, -2)).toBe(0);
    expect(flapThrust(3, 2)).toBeCloseTo(flapThrust(2, 3));
  });
});
