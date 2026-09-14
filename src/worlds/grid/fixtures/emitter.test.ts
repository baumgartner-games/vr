import { DIR_N } from '../../nav/navTile';
import { EFFECTS } from '../../effects/effectKinds';
import type { FixtureInput, FixturePlacement, Props } from './index';
import {
  EMITTER,
  emitterEffect,
  emitterOnce,
  emitterPeriod,
  emitterSize,
  type EmitterState,
} from './emitter';

function nozzle(props: Props = {}): FixturePlacement {
  return { id: 'quelle-1', kind: 'emitter', x: 4, z: -2, dir: DIR_N, level: 0, props };
}

const NOTHING: FixtureInput = {
  used: false,
  hit: false,
  weightOn: 0,
  playerOn: false,
  triggered: false,
};
const POKED: FixtureInput = { ...NOTHING, used: true };

describe('Die Effektquelle, wie sie eingestellt ist', () => {
  it('nimmt die Effekte des Labors und erfindet keine neuen', () => {
    expect(emitterEffect(nozzle({ effect: 'water' }))).toBe('water');
    for (const kind of EFFECTS) expect(emitterEffect(nozzle({ effect: kind.id }))).toBe(kind.id);
  });

  /** Was es nicht gibt, wird zum ersten Effekt — und stürzt nicht ab. */
  it('fällt bei einem unbekannten Effekt auf den ersten zurück', () => {
    expect(emitterEffect(nozzle({ effect: 'regenbogen' }))).toBe(EFFECTS[0]!.id);
    expect(emitterEffect(nozzle())).toBe('smoke');
  });

  it('kennt Größe und Betriebsart', () => {
    expect(emitterSize(nozzle({ size: 2 }))).toBe(2);
    expect(emitterSize(nozzle())).toBe(1);
    expect(emitterOnce(nozzle({ burst: true }))).toBe(true);
    expect(emitterOnce(nozzle())).toBe(false);
  });

  /** Der Takt kommt aus der Lebensdauer des Effekts, nicht aus einer eigenen Zahl. */
  it('pufft im halben Takt der Lebensdauer, aber nie schneller als 0,4 s', () => {
    const smoke = EFFECTS.find((one) => one.id === 'smoke')!;
    expect(emitterPeriod(nozzle({ effect: 'smoke' }))).toBeCloseTo(smoke.life * 0.5);
    expect(emitterPeriod(nozzle({ effect: 'sparks' }))).toBeGreaterThanOrEqual(0.4);
  });
});

describe('Die Effektquelle im Dauerbetrieb', () => {
  it('steht still, solange sie niemand anschaltet', () => {
    const at = nozzle({ effect: 'fire' });
    const state: EmitterState = EMITTER.init(at);
    expect(state.on).toBe(false);
    expect(EMITTER.step(state, at, NOTHING, 0.5)).toEqual([]);
    expect(state.shots).toBe(0);
  });

  it('schaltet um und pufft sofort', () => {
    const at = nozzle({ effect: 'fire' });
    const state = EMITTER.init(at);
    const events = EMITTER.step(state, at, POKED, 0.016);
    expect(state.on).toBe(true);
    expect(state.shots).toBe(1);
    expect(events).toEqual([
      { type: 'sound', name: 'switch-on' },
      { type: 'effect', effect: 'fire', size: 1 },
    ]);
  });

  it('pufft weiter, aber nur im Takt', () => {
    const at = nozzle({ effect: 'smoke', on: true });
    const state = EMITTER.init(at);
    // Das erste Bild: Wer mit `on` anfängt, wartet nicht.
    expect(EMITTER.step(state, at, NOTHING, 0.016)).toHaveLength(1);
    expect(state.shots).toBe(1);
    // Kurz danach: nichts.
    EMITTER.step(state, at, NOTHING, 0.5);
    expect(state.shots).toBe(1);
    // Und nach dem Takt wieder eine.
    EMITTER.step(state, at, NOTHING, emitterPeriod(at));
    expect(state.shots).toBe(2);
  });

  it('geht beim zweiten Druck wieder aus', () => {
    const at = nozzle({ on: true });
    const state = EMITTER.init(at);
    const events = EMITTER.step(state, at, POKED, 0.016);
    expect(state.on).toBe(false);
    expect(state.shots).toBe(0);
    expect(events).toEqual([{ type: 'sound', name: 'switch-off' }]);
  });

  /** Kugel und Fernauslöser zählen wie eine Hand — der Knopf davor ist P6. */
  it('hört auf Hand, Kugel und Fernauslöser gleichermaßen', () => {
    for (const input of [
      { ...NOTHING, used: true },
      { ...NOTHING, hit: true },
      { ...NOTHING, triggered: true },
    ]) {
      const at = nozzle();
      const state = EMITTER.init(at);
      EMITTER.step(state, at, input, 0.016);
      expect(state.on).toBe(true);
    }
  });
});

describe('Die Effektquelle als Einmalschuss', () => {
  it('macht eine Wolke je Auslöser und läuft nicht weiter', () => {
    const at = nozzle({ effect: 'sparks', size: 2, burst: true });
    const state = EMITTER.init(at);
    expect(EMITTER.step(state, at, POKED, 0.016)).toEqual([
      { type: 'sound', name: 'pop' },
      { type: 'effect', effect: 'sparks', size: 2 },
    ]);
    expect(state.on).toBe(false);
    expect(state.shots).toBe(1);

    // Und danach ist Ruhe, egal wie lange man wartet.
    EMITTER.step(state, at, NOTHING, 10);
    expect(state.shots).toBe(1);
  });

  it('hält niemanden auf und steht frei auf der Kachel', () => {
    expect(EMITTER.solid(EMITTER.init(nozzle()))).toBe(false);
    expect(EMITTER.edge).toBe(false);
  });
});
