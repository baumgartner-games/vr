import { DIR_E, DIR_N, DIR_S, DIR_W } from '../../nav/navTile';
import {
  clearKinds,
  effect,
  fixtureKind,
  fixtureKinds,
  fixtureYaw,
  goto,
  propFlag,
  propNumber,
  propText,
  registerKind,
  sound,
  trigger,
  type FixtureInput,
  type FixtureKind,
  type FixturePlacement,
  type FixtureView,
} from './index';

/** Eine Art, die gerade genug tut, um sie bei etwas zu ertappen. */
function dummy(kind: string, extra: Partial<FixtureKind<{ on: boolean }>> = {}) {
  const one: FixtureKind<{ on: boolean }> = {
    kind,
    label: kind,
    accent: 0x112233,
    init: () => ({ on: false }),
    step: (state, _place, input) => {
      if (!input.used) return [];
      state.on = !state.on;
      return [trigger('tuer-1')];
    },
    solid: (state) => state.on,
    build: () => ({}) as FixtureView,
    apply: () => {},
    ...extra,
  };
  return one;
}

function place(kind: string): FixturePlacement {
  return { id: `${kind}-1`, kind, x: 0, z: 0, dir: DIR_N, level: 0, props: {} };
}

const NOTHING: FixtureInput = {
  used: false,
  hit: false,
  weightOn: 0,
  playerOn: false,
  triggered: false,
};

beforeEach(() => clearKinds());

describe('Die Registry', () => {
  it('gibt eine angemeldete Art wieder heraus', () => {
    registerKind(dummy('knopf'));
    expect(fixtureKind('knopf')?.label).toBe('knopf');
    expect(fixtureKinds()).toHaveLength(1);
  });

  /**
   * Zwei Arten unter demselben Namen sind zwei Welten, von denen eine ihre
   * Türen verliert, sobald sich die Ladereihenfolge ändert — das soll beim
   * Start krachen und nicht in der Brille auffallen.
   */
  it('wirft, wenn eine Art zweimal angemeldet wird', () => {
    registerKind(dummy('knopf'));
    expect(() => registerKind(dummy('knopf'))).toThrow(/gibt es schon/);
  });

  /**
   * Eine unbekannte Art ist kein Fehler, sondern eine Welt aus einer neueren
   * Fassung: `null`, und wer baut, überspringt sie und sagt es.
   */
  it('antwortet auf eine unbekannte Art mit null', () => {
    expect(fixtureKind('tor')).toBeNull();
  });
});

describe('Eine Art', () => {
  it('schreibt ihren Zustand fort und meldet, was nach außen geht', () => {
    const kind = dummy('knopf');
    const at = place('knopf');
    const state = kind.init(at);

    expect(kind.step(state, at, NOTHING, 0.016)).toEqual([]);
    expect(kind.solid(state)).toBe(false);

    const events = kind.step(state, at, { ...NOTHING, used: true }, 0.016);
    expect(events).toEqual([{ type: 'trigger', target: 'tuer-1' }]);
    expect(kind.solid(state)).toBe(true);
  });
});

describe('Die Ereignisse', () => {
  it('sind vier, und jedes trägt genau das, was sein Abnehmer braucht', () => {
    expect(trigger('lampe')).toEqual({ type: 'trigger', target: 'lampe' });
    expect(goto('street')).toEqual({ type: 'goto', world: 'street' });
    expect(sound('slam')).toEqual({ type: 'sound', name: 'slam' });
    expect(effect('smoke')).toEqual({ type: 'effect', effect: 'smoke', size: 1 });
    expect(effect('fire', 2, { x: 1, y: 2, z: 3 })).toEqual({
      type: 'effect',
      effect: 'fire',
      size: 2,
      at: { x: 1, y: 2, z: 3 },
    });
  });
});

describe('Die Eigenschaften', () => {
  it('geben zurück, was da ist, und sonst die Vorgabe', () => {
    const props = { text: 'Hallo', hold: 2.5, on: true, kaputt: 'ja' };
    expect(propText(props, 'text')).toBe('Hallo');
    expect(propText(props, 'fehlt', 'nix')).toBe('nix');
    expect(propNumber(props, 'hold', 1)).toBe(2.5);
    // Eine Zahl, die als Text dasteht, ist keine Zahl — sonst rechnet eine Art
    // irgendwann mit „2" weiter.
    expect(propNumber(props, 'kaputt', 1)).toBe(1);
    expect(propFlag(props, 'on')).toBe(true);
    expect(propFlag(props, 'fehlt')).toBe(false);
  });
});

describe('Die Drehung', () => {
  /**
   * Dieselben vier Winkel, die `blocks.turned()` für Quader rechnet: nach
   * Norden gebaut, danach gedreht.
   */
  it('dreht eine Kachelrichtung in einen Winkel', () => {
    expect(fixtureYaw(DIR_N)).toBeCloseTo(0);
    expect(fixtureYaw(DIR_E)).toBeCloseTo(-Math.PI / 2);
    expect(fixtureYaw(DIR_S)).toBeCloseTo(-Math.PI);
    expect(fixtureYaw(DIR_W)).toBeCloseTo((-3 * Math.PI) / 2);
  });
});
