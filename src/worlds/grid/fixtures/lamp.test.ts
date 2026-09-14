import { DIR_N } from '../../nav/navTile';
import type { FixtureInput, FixturePlacement, Props } from './index';
import { LAMP, lampHeight, type LampState } from './lamp';

function light(props: Props = {}): FixturePlacement {
  return { id: 'lampe-1', kind: 'lamp', x: 2, z: 2, dir: DIR_N, level: 0, props };
}

const NOTHING: FixtureInput = {
  used: false,
  hit: false,
  weightOn: 0,
  playerOn: false,
  triggered: false,
};

describe('Die Lampe', () => {
  it('brennt, bis jemand sie ausmacht', () => {
    const at = light();
    const state: LampState = LAMP.init(at);
    expect(state.on).toBe(true);

    expect(LAMP.step(state, at, { ...NOTHING, triggered: true }, 0.016)).toEqual([
      { type: 'sound', name: 'switch-off' },
    ]);
    expect(state.on).toBe(false);

    LAMP.step(state, at, { ...NOTHING, triggered: true }, 0.016);
    expect(state.on).toBe(true);
  });

  it('fängt aus an, wenn die Welt es so will', () => {
    expect(LAMP.init(light({ on: false })).on).toBe(false);
  });

  it('hängt so hoch, wie es dasteht — und nie unter dem Boden', () => {
    expect(lampHeight(light({ height: 3.4 }))).toBeCloseTo(3.4);
    expect(lampHeight(light({ height: -2 }))).toBeGreaterThan(0);
    expect(lampHeight(light())).toBeGreaterThan(2);
  });

  it('gibt weiter, worauf sie zeigt — eine Lampe darf einen Schalter haben', () => {
    const at = light({ target: 'lampe-2' });
    expect(LAMP.step(LAMP.init(at), at, { ...NOTHING, used: true }, 0.016)).toEqual([
      { type: 'sound', name: 'switch-off' },
      { type: 'trigger', target: 'lampe-2' },
    ]);
  });

  it('steht frei auf der Kachel und hält niemanden auf', () => {
    expect(LAMP.edge).toBe(false);
    expect(LAMP.solid(LAMP.init(light()))).toBe(false);
  });
});
