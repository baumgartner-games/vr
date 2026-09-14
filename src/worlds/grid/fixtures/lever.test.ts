import { DIR_E } from '../../nav/navTile';
import type { FixtureInput, FixturePlacement, Props } from './index';
import { LEVER, type LeverState } from './lever';

function bar(props: Props = { target: 'tuer-2' }): FixturePlacement {
  return { id: 'hebel-1', kind: 'lever', x: 0, z: 0, dir: DIR_E, level: 0, props };
}

const NOTHING: FixtureInput = {
  used: false,
  hit: false,
  weightOn: 0,
  playerOn: false,
  triggered: false,
};

describe('Der Hebel', () => {
  /**
   * **Er rastet** — das ist der ganze Unterschied zum Knopf. Auf bleibt auf,
   * und man sieht es ihm über den halben Platz hinweg an.
   */
  it('bleibt liegen, wo man ihn hinlegt', () => {
    const at = bar();
    const state: LeverState = LEVER.init(at);
    expect(state.on).toBe(false);

    expect(LEVER.step(state, at, { ...NOTHING, used: true }, 0.016)).toEqual([
      { type: 'sound', name: 'switch-on' },
      { type: 'trigger', target: 'tuer-2' },
    ]);
    expect(state.on).toBe(true);

    // Zwanzig ruhige Bilder später steht er immer noch so.
    for (let i = 0; i < 20; i++) expect(LEVER.step(state, at, NOTHING, 0.016)).toEqual([]);
    expect(state.on).toBe(true);

    expect(LEVER.step(state, at, { ...NOTHING, used: true }, 0.016)).toEqual([
      { type: 'sound', name: 'switch-off' },
      { type: 'trigger', target: 'tuer-2' },
    ]);
    expect(state.on).toBe(false);
  });

  it('lässt sich auch aus der Ferne schalten — ein Hebel am Hebel', () => {
    const at = bar();
    const state = LEVER.init(at);
    LEVER.step(state, at, { ...NOTHING, triggered: true }, 0.016);
    expect(state.on).toBe(true);
  });

  it('fängt dort an, wo die Welt ihn hinstellt', () => {
    expect(LEVER.init(bar({ on: true })).on).toBe(true);
    expect(LEVER.init(bar()).on).toBe(false);
  });

  it('steht an einer Kante und hält niemanden auf', () => {
    expect(LEVER.edge).toBe(true);
    expect(LEVER.solid(LEVER.init(bar()))).toBe(false);
  });
});
