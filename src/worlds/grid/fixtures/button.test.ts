import { DIR_E } from '../../nav/navTile';
import { BUTTON, buttonHold, type ButtonState } from './button';
import type { FixtureInput, FixturePlacement, Props } from './index';

function knob(props: Props = { target: 'tuer-1' }): FixturePlacement {
  return { id: 'knopf-1', kind: 'button', x: 1, z: 1, dir: DIR_E, level: 0, props };
}

const NOTHING: FixtureInput = {
  used: false,
  hit: false,
  weightOn: 0,
  playerOn: false,
  triggered: false,
};

describe('Der rote Knopf', () => {
  it('schaltet sein Ziel und sagt dazu Bescheid', () => {
    const at = knob();
    const state: ButtonState = BUTTON.init(at);
    expect(BUTTON.step(state, at, NOTHING, 0.016)).toEqual([]);

    expect(BUTTON.step(state, at, { ...NOTHING, used: true }, 0.016)).toEqual([
      { type: 'sound', name: 'switch-on' },
      { type: 'trigger', target: 'tuer-1' },
    ]);
    expect(state.press).toBeCloseTo(buttonHold(at));
  });

  /**
   * **Die Portal-Regel**: Was man drücken kann, kann man auch treffen. Eine
   * Kugel wirkt genau wie die Hand — nicht schwächer und nicht doppelt; sie
   * schlägt nur zusätzlich Funken, und eine Hand tut das nicht.
   */
  it('lässt sich mit einer Kugel drücken — und schlägt dabei Funken', () => {
    const at = knob();
    const state = BUTTON.init(at);
    expect(BUTTON.step(state, at, { ...NOTHING, hit: true }, 0.016)).toEqual([
      { type: 'sound', name: 'switch-on' },
      { type: 'effect', effect: 'sparks', size: 0.4 },
      { type: 'trigger', target: 'tuer-1' },
    ]);
  });

  /**
   * **Der Nachlauf ist kein Schmuck.** Ohne ihn drückte ein Dauerfeuer den
   * Knopf sechzigmal in der Sekunde, und eine rastende Tür stünde danach auf
   * einer zufälligen Seite.
   */
  it('nimmt nichts an, solange er unten ist', () => {
    const at = knob({ target: 'tuer-1', hold: 0.5 });
    const state = BUTTON.init(at);
    BUTTON.step(state, at, { ...NOTHING, hit: true }, 0.016);

    for (let t = 0; t < 0.4; t += 0.016) {
      expect(BUTTON.step(state, at, { ...NOTHING, hit: true }, 0.016)).toEqual([]);
    }
    expect(state.press).toBeGreaterThan(0);

    // Und wenn er wieder oben ist, geht es weiter.
    for (let t = 0; t < 0.2; t += 0.016) BUTTON.step(state, at, NOTHING, 0.016);
    expect(state.press).toBe(0);
    expect(BUTTON.step(state, at, { ...NOTHING, used: true }, 0.016)).toEqual([
      { type: 'sound', name: 'switch-on' },
      { type: 'trigger', target: 'tuer-1' },
    ]);
  });

  it('macht ohne Ziel nur Geräusch — und keinen Wurf', () => {
    const at = knob({});
    expect(BUTTON.step(BUTTON.init(at), at, { ...NOTHING, used: true }, 0.016)).toEqual([
      { type: 'sound', name: 'switch-on' },
    ]);
  });

  it('hält niemanden auf und steht an einer Kante, nicht in der Mitte', () => {
    expect(BUTTON.solid(BUTTON.init(knob()))).toBe(false);
    // In der Mitte stünde die Figur in ihm, sobald sie ihn drückt.
    expect(BUTTON.edge).toBe(true);
  });
});
