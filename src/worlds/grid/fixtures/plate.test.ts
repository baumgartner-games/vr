import { DIR_N } from '../../nav/navTile';
import type { FixtureInput, FixturePlacement, Props } from './index';
import { PLATE, type PlateState } from './plate';

function pad(props: Props = { target: 'tuer-3' }): FixturePlacement {
  return { id: 'platte-1', kind: 'plate', x: 3, z: 5, dir: DIR_N, level: 0, props };
}

const NOTHING: FixtureInput = {
  used: false,
  hit: false,
  weightOn: 0,
  playerOn: false,
  triggered: false,
};

describe('Die Druckplatte', () => {
  /**
   * **Sie löst in jedem Bild neu aus**, in dem etwas auf ihr steht — nicht nur
   * beim Betreten. Nur so setzt die Tür dahinter ihre Uhr zurück und fällt
   * anderthalb Sekunden nach dem *Verlassen* zu statt unter dem, der in ihr
   * steht.
   */
  it('drückt, solange Gewicht darauf liegt', () => {
    const at = pad();
    const state: PlateState = PLATE.init(at);
    expect(state.down).toBe(false);
    expect(PLATE.step(state, at, NOTHING, 0.016)).toEqual([]);

    expect(PLATE.step(state, at, { ...NOTHING, weightOn: 1 }, 0.016)).toEqual([
      { type: 'sound', name: 'pop' },
      { type: 'trigger', target: 'tuer-3' },
    ]);
    expect(state.down).toBe(true);

    // Danach: kein zweites Geräusch, aber jedes Bild ein Auslösen.
    expect(PLATE.step(state, at, { ...NOTHING, weightOn: 1 }, 0.016)).toEqual([
      { type: 'trigger', target: 'tuer-3' },
    ]);
  });

  /**
   * Eine **Zahl** und kein Schalter: Zwei Kisten darauf sind zwei, und wer eine
   * davon wegnimmt, hat immer noch eine.
   */
  it('bleibt gedrückt, solange noch etwas darauf steht', () => {
    const at = pad();
    const state = PLATE.init(at);
    PLATE.step(state, at, { ...NOTHING, weightOn: 2 }, 0.016);
    PLATE.step(state, at, { ...NOTHING, weightOn: 1 }, 0.016);
    expect(state.down).toBe(true);

    expect(PLATE.step(state, at, NOTHING, 0.016)).toEqual([{ type: 'sound', name: 'switch-off' }]);
    expect(state.down).toBe(false);
  });

  it('kümmert sich nicht darum, ob jemand sie benutzt', () => {
    const at = pad();
    const state = PLATE.init(at);
    expect(PLATE.step(state, at, { ...NOTHING, used: true, hit: true }, 0.016)).toEqual([]);
    expect(state.down).toBe(false);
  });

  it('liegt im Boden und hält niemanden auf — sonst wäre sie keine Platte', () => {
    expect(PLATE.solid(PLATE.init(pad()))).toBe(false);
    expect(PLATE.edge).toBe(false);
  });
});
