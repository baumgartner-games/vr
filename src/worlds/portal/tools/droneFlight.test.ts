import {
  DEFAULT_SPEED,
  DEFAULT_TURN,
  DRONE_TUNING,
  droneTuning,
  flyJet,
  flyKopter,
  headingOf,
  levelOf,
  noseOf,
  quatFromYaw,
  quatIdentity,
  rotate,
  sideOf,
} from './droneFlight';

const FORWARD = { x: 0, y: 0, z: -1 };
const NEUTRAL = { x: 0, y: 0 };

describe('Kopter', () => {
  it('schiebt bei Stick nach vorne in die Blickrichtung', () => {
    const step = flyKopter(0, { x: 0, y: -1 }, NEUTRAL, FORWARD, 0.1);
    expect(step.wish.z).toBeCloseTo(-DRONE_TUNING.speed);
    expect(step.wish.x).toBeCloseTo(0);
    expect(step.wish.y).toBeCloseTo(0);
  });

  it('schiebt bei Stick nach rechts quer zur Blickrichtung', () => {
    const step = flyKopter(0, { x: 1, y: 0 }, NEUTRAL, FORWARD, 0.1);
    expect(step.wish.x).toBeCloseTo(DRONE_TUNING.speed);
    expect(step.wish.z).toBeCloseTo(0);
  });

  it('folgt einer gedrehten Blickrichtung', () => {
    // 90° nach links geschaut: „vorwärts“ ist jetzt -X.
    const step = flyKopter(0, { x: 0, y: -1 }, NEUTRAL, { x: -1, y: 0, z: 0 }, 0.1);
    expect(step.wish.x).toBeCloseTo(-DRONE_TUNING.speed);
    expect(step.wish.z).toBeCloseTo(0);
  });

  it('dreht mit dem rechten Stick nach rechts', () => {
    const step = flyKopter(0, NEUTRAL, { x: 1, y: 0 }, FORWARD, 0.5);
    // Rechtsdrehung heißt kleinerer Gierwinkel.
    expect(step.heading).toBeCloseTo(-DRONE_TUNING.yawRate * 0.5);
  });

  it('steigt, wenn der rechte Stick nach vorne geht', () => {
    const step = flyKopter(0, NEUTRAL, { x: 0, y: -1 }, FORWARD, 0.1);
    expect(step.wish.y).toBeCloseTo(DRONE_TUNING.climb);
  });

  it('legt sich nur optisch in die Kurve', () => {
    const step = flyKopter(0, { x: 1, y: -1 }, NEUTRAL, FORWARD, 0.1);
    expect(step.bank).toBeLessThan(0);
    expect(step.nose).toBeLessThan(0);
  });

  it('wird diagonal nicht schneller', () => {
    const step = flyKopter(0, { x: 1, y: -1 }, NEUTRAL, FORWARD, 0.1);
    expect(Math.hypot(step.wish.x, step.wish.z)).toBeCloseTo(DRONE_TUNING.speed);
  });
});

describe('Jet', () => {
  it('hebt die Nase, wenn der rechte Stick gezogen wird', () => {
    const step = flyJet(quatIdentity(), NEUTRAL, { x: 0, y: 1 }, 0.2);
    expect(noseOf(step.orientation).y).toBeGreaterThan(0);
  });

  it('senkt die Nase, wenn er gedrückt wird', () => {
    const step = flyJet(quatIdentity(), NEUTRAL, { x: 0, y: -1 }, 0.2);
    expect(noseOf(step.orientation).y).toBeLessThan(0);
  });

  it('rollt nach rechts, wenn der rechte Stick nach rechts geht', () => {
    const step = flyJet(quatIdentity(), NEUTRAL, { x: 1, y: 0 }, 0.2);
    // Die rechte Fläche geht nach unten, das Dach kippt nach rechts.
    const up = rotate(step.orientation, { x: 0, y: 1, z: 0 });
    expect(up.x).toBeGreaterThan(0);
    expect(sideOf(step.orientation).y).toBeLessThan(0);
  });

  it('fliegt entlang der eigenen Nase, nicht entlang der Welt', () => {
    // Erst 45° nach oben nicken, dann Schub geben.
    let state = quatIdentity();
    for (let i = 0; i < 60; i++) state = flyJet(state, NEUTRAL, { x: 0, y: 1 }, 1 / 60).orientation;
    const step = flyJet(state, { x: 0, y: -1 }, NEUTRAL, 1 / 60);
    expect(step.wish.y).toBeGreaterThan(0);
    expect(Math.hypot(step.wish.x, step.wish.y, step.wish.z)).toBeCloseTo(DRONE_TUNING.speed);
  });

  it('schiebt mit dem linken Stick quer zur eigenen Achse', () => {
    const state = quatFromYaw(Math.PI / 2);
    const step = flyJet(state, { x: 1, y: 0 }, NEUTRAL, 1 / 60);
    // 90° nach links gedreht: die eigene Rechte zeigt nach -Z.
    expect(step.wish.z).toBeCloseTo(-DRONE_TUNING.speed);
  });

  it('fliegt im Rollen eine Kurve statt geradeaus', () => {
    // 90° nach rechts rollen, dann ziehen: die Nase muss sich zur Seite drehen.
    let state = quatIdentity();
    for (let i = 0; i < 200; i++) state = flyJet(state, NEUTRAL, { x: 1, y: 0 }, 1 / 200).orientation;
    const before = headingOf(state);
    for (let i = 0; i < 60; i++) state = flyJet(state, NEUTRAL, { x: 0, y: 1 }, 1 / 60).orientation;
    expect(Math.abs(headingOf(state) - before)).toBeGreaterThan(0.2);
  });
});

describe('Ausrichten', () => {
  it('behält beim Parken die Richtung und verliert die Schräglage', () => {
    let state = quatFromYaw(1.2);
    for (let i = 0; i < 30; i++) state = flyJet(state, NEUTRAL, { x: 1, y: 0.5 }, 1 / 60).orientation;
    const level = levelOf(state);
    expect(headingOf(level)).toBeCloseTo(headingOf(state));
    expect(rotate(level, { x: 0, y: 1, z: 0 }).y).toBeCloseTo(1);
    expect(noseOf(level).y).toBeCloseTo(0);
  });
});

describe('Tuning', () => {
  it('ist ohne Zutun genau das eingestellte Standard-Tuning', () => {
    expect(droneTuning(DEFAULT_SPEED, DEFAULT_TURN)).toEqual(DRONE_TUNING);
  });

  it('rechnet die Drehrate von Grad in Radiant um', () => {
    expect(droneTuning(DEFAULT_SPEED, 180).yawRate).toBeCloseTo(Math.PI);
  });

  it('zieht Steigen, Nicken und Rollen mit', () => {
    const slow = droneTuning(4, 40);
    const fast = droneTuning(8, 80);
    expect(fast.climb).toBeCloseTo(slow.climb * 2);
    expect(fast.pitchRate).toBeCloseTo(slow.pitchRate * 2);
    expect(fast.rollRate).toBeCloseTo(slow.rollRate * 2);
    // Der Jet rollt schneller, als er nickt — sonst fliegt sich keine Kurve.
    expect(fast.rollRate).toBeGreaterThan(fast.pitchRate);
  });

  it('fliegt den Kopter mit dem eingestellten Tempo, nicht mit dem Standard', () => {
    const step = flyKopter(0, { x: 0, y: -1 }, NEUTRAL, FORWARD, 0.1, droneTuning(12, 90));
    expect(step.wish.z).toBeCloseTo(-12);
  });

  it('dreht den Jet mit der eingestellten Drehrate', () => {
    const tune = droneTuning(6, 90);
    // Genickt wird ein Viertel schneller als gedreht: 112,5°/s, also 18,75° in
    // einer Sechstelsekunde.
    const step = flyJet(quatIdentity(), NEUTRAL, { x: 0, y: 1 }, 1 / 6, tune);
    expect(Math.asin(noseOf(step.orientation).y)).toBeCloseTo(tune.pitchRate / 6);
    // Und doppelt so hoch eingestellt dreht sie auch doppelt so weit.
    const twice = flyJet(quatIdentity(), NEUTRAL, { x: 0, y: 1 }, 1 / 6, droneTuning(6, 180));
    expect(Math.asin(noseOf(twice.orientation).y)).toBeCloseTo(
      2 * Math.asin(noseOf(step.orientation).y),
    );
  });
});
