import {
  SWING_JUMP,
  SWING_REST,
  SWING_SPEED,
  forgetSwing,
  newSwing,
  swingHit,
  swingStep,
} from './meleeSwing';

/** Ein Bild bei 60 Hz. */
const FRAME = 1 / 60;

/** Die Spitze um `dx` weiter, und was dabei herauskommt. */
function move(
  state: ReturnType<typeof newSwing>,
  from: number,
  dx: number,
  dt = FRAME,
): ReturnType<typeof swingStep> {
  swingStep(state, { x: from, y: 1, z: 0 }, dt);
  return swingStep(state, { x: from + dx, y: 1, z: 0 }, dt);
}

describe('Wann ein Schlag einer ist', () => {
  it('zählt das erste Bild nie — vorher war die Spitze nirgends', () => {
    const state = newSwing();
    expect(swingStep(state, { x: 0, y: 1, z: 0 }, FRAME)).toBeNull();
  });

  it('zählt eine schnelle Bewegung als Schlag', () => {
    const swing = move(newSwing(), 0, SWING_SPEED * FRAME * 3);
    expect(swing).not.toBeNull();
    expect(swing!.speed).toBeGreaterThan(SWING_SPEED);
    // Und zwar die ganze Strecke seit dem letzten Bild, nicht nur den Punkt.
    expect(swing!.from.x).toBeCloseTo(0);
    expect(swing!.to.x).toBeCloseTo(SWING_SPEED * FRAME * 3);
  });

  /**
   * Der Grund für die Tempogrenze: Ein Messer, das man einem Zombie nur
   * hinhält, ist kein Schlag. Ohne sie stirbt er, während man ihn ansieht.
   */
  it('zählt Hinhalten nicht', () => {
    expect(move(newSwing(), 0, SWING_SPEED * FRAME * 0.5)).toBeNull();
    expect(move(newSwing(), 0, 0)).toBeNull();
  });

  it('macht nach einem Treffer eine Pause', () => {
    const state = newSwing();
    const step = SWING_SPEED * FRAME * 3;
    expect(move(state, 0, step)).not.toBeNull();
    swingHit(state);

    // Dieselbe Bewegung, sofort danach: kein zweiter Treffer.
    let at = step * 2;
    for (let time = 0; time < SWING_REST - FRAME; time += FRAME) {
      expect(swingStep(state, { x: at, y: 1, z: 0 }, FRAME)).toBeNull();
      at += step;
    }

    // Und nach der Pause zählt sie wieder.
    for (let time = 0; time < SWING_REST; time += FRAME) {
      swingStep(state, { x: at, y: 1, z: 0 }, FRAME);
      at += step;
    }
    expect(swingStep(state, { x: at + step, y: 1, z: 0 }, FRAME)).not.toBeNull();
  });

  /**
   * Ein Werkzeug, das die Hand wechselt oder durch ein Portal geht, steht im
   * nächsten Bild woanders. Die Strecke dazwischen ginge quer durch den Raum
   * und träfe alles darin.
   */
  it('verwirft einen Sprung, macht danach aber normal weiter', () => {
    const state = newSwing();
    const step = SWING_SPEED * FRAME * 3;
    expect(move(state, 0, SWING_JUMP + 1)).toBeNull();
    // Vom neuen Ort aus zählt das nächste Bild wieder.
    expect(swingStep(state, { x: SWING_JUMP + 1 + step, y: 1, z: 0 }, FRAME)).not.toBeNull();
  });

  it('vergisst auf Wunsch, wo die Spitze war', () => {
    const state = newSwing();
    const step = SWING_SPEED * FRAME * 3;
    swingStep(state, { x: 0, y: 1, z: 0 }, FRAME);
    forgetSwing(state);
    expect(swingStep(state, { x: step, y: 1, z: 0 }, FRAME)).toBeNull();
  });

  it('rechnet ohne vergangene Zeit nichts aus', () => {
    const state = newSwing();
    swingStep(state, { x: 0, y: 1, z: 0 }, FRAME);
    expect(swingStep(state, { x: 1, y: 1, z: 0 }, 0)).toBeNull();
  });
});
