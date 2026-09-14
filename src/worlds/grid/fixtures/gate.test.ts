import { DIR_S } from '../../nav/navTile';
import { GATE, GATE_ARM, GATE_DWELL, gateLabel, gateWorld, type GateState } from './gate';
import type { FixtureInput, FixturePlacement, Props } from './index';

function gate(props: Props = { world: 'dust', label: '→ Dust' }): FixturePlacement {
  return { id: 'gate-0', kind: 'gate', x: 2, z: -5, dir: DIR_S, level: 0, props };
}

const NOTHING: FixtureInput = {
  used: false,
  hit: false,
  weightOn: 0,
  playerOn: false,
  triggered: false,
};
const STANDING: FixtureInput = { ...NOTHING, weightOn: 1, playerOn: true };

/** So viele Bilder, dass die Sperre nach dem Bau sicher abgelaufen ist. */
function arm(state: GateState, place = gate()): void {
  for (let i = 0; i < Math.ceil(GATE_ARM / 0.1) + 1; i++) GATE.step(state, place, NOTHING, 0.1);
}

describe('Das Tor', () => {
  it('weiß, wohin es führt und was auf ihm steht', () => {
    expect(gateWorld(gate())).toBe('dust');
    expect(gateLabel(gate())).toBe('→ Dust');
    expect(gateWorld(gate({}))).toBe('');
    expect(gateLabel(gate({}))).toBe('Tor');
  });

  it('hält niemanden auf — man geht ja hindurch', () => {
    expect(GATE.solid(GATE.init(gate()))).toBe(false);
    expect(GATE.edge).toBe(false);
  });

  /**
   * **Die Sperre nach dem Bau.** Wer in einer Welt ankommt, steht neben ihrem
   * Rücktor; ohne diese Sekunde schickte ihn das erste Bild der neuen Welt
   * wieder zurück.
   */
  it('bleibt nach dem Bau eine Sekunde taub', () => {
    const at = gate();
    const state = GATE.init(at);
    expect(state.arm).toBe(GATE_ARM);
    // Auch wer sofort daraufsteht und drückt, kommt nicht durch.
    for (let i = 0; i < 5; i++) {
      expect(GATE.step(state, at, { ...STANDING, used: true }, 0.1)).toEqual([]);
    }
    expect(state.fired).toBe(false);
  });

  it('feuert, wenn jemand lange genug daraufsteht', () => {
    const at = gate();
    const state = GATE.init(at);
    arm(state, at);

    // Ein Schritt quer über die Kachel ist kein Betreten.
    expect(GATE.step(state, at, STANDING, GATE_DWELL / 2)).toEqual([]);
    expect(GATE.step(state, at, NOTHING, 0.1)).toEqual([]);
    expect(state.dwell).toBe(0);

    GATE.step(state, at, STANDING, GATE_DWELL / 2);
    const events = GATE.step(state, at, STANDING, GATE_DWELL / 2 + 0.01);
    expect(events).toContainEqual({ type: 'goto', world: 'dust' });
    expect(state.fired).toBe(true);
    // Und danach genau einmal: Die Welt wechselt ohnehin.
    expect(GATE.step(state, at, STANDING, 1)).toEqual([]);
  });

  /**
   * **Eine Kiste ist kein Spieler.** `weightOn` zählt alles, was auf der Kachel
   * steht — eine Druckplatte will genau das. Ein Tor nimmt aber jemanden mit,
   * und wer eine Kiste darauf schiebt, will nicht selbst in eine andere Welt.
   */
  it('lässt sich von einer Kiste nicht auslösen', () => {
    const at = gate();
    const state = GATE.init(at);
    arm(state, at);
    for (let i = 0; i < 20; i++) {
      expect(GATE.step(state, at, { ...NOTHING, weightOn: 2 }, 0.1)).toEqual([]);
    }
    expect(state.fired).toBe(false);
  });

  it('geht sofort, wenn man es benutzt oder ein anderer es auslöst', () => {
    for (const input of [{ used: true }, { triggered: true }]) {
      const at = gate();
      const state = GATE.init(at);
      arm(state, at);
      expect(GATE.step(state, at, { ...NOTHING, ...input }, 0.016)).toContainEqual({
        type: 'goto',
        world: 'dust',
      });
    }
  });

  it('sagt es, statt ins Leere zu führen, wenn keine Welt eingetragen ist', () => {
    const at = gate({ label: 'Nirgendwo' });
    const state = GATE.init(at);
    arm(state, at);
    const events = GATE.step(state, at, { ...STANDING, used: true }, 0.016);
    expect(events).toEqual([{ type: 'sound', name: 'empty' }]);
    expect(events.some((one) => one.type === 'goto')).toBe(false);
  });
});
