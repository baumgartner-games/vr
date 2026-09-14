import { DIR_S } from '../../nav/navTile';
import type { FixtureInput, FixturePlacement } from './index';
import { SIGN, signText, type SignState } from './sign';

function board(props: Record<string, string> = {}): FixturePlacement {
  return { id: 'sign-1', kind: 'sign', x: 2, z: 3, dir: DIR_S, level: 0, props };
}

const NOTHING: FixtureInput = {
  used: false,
  hit: false,
  weightOn: 0,
  playerOn: false,
  triggered: false,
};

describe('Das Schild', () => {
  it('zeigt, was auf ihm steht — und sonst, dass es ein Schild ist', () => {
    expect(signText(board({ text: 'Zur Küche' }))).toBe('Zur Küche');
    expect(signText(board())).toBe('Schild');
  });

  /**
   * Gelesen wird gezählt und nicht geschaltet: Zweimal `A` heißt zweimal
   * lesen, und das Bild (`apply`) merkt daran, dass es die Zeile noch einmal
   * zeigen muss.
   */
  it('zählt jedes Lesen', () => {
    const at = board({ text: 'Hallo' });
    const state: SignState = SIGN.init(at);
    expect(state.reads).toBe(0);

    expect(SIGN.step(state, at, NOTHING, 0.016)).toEqual([]);
    expect(state.reads).toBe(0);

    expect(SIGN.step(state, at, { ...NOTHING, used: true }, 0.016)).toEqual([
      { type: 'sound', name: 'pick' },
    ]);
    expect(state.reads).toBe(1);

    // Auch aus der Ferne: Ein Schild, das ein Knopf schaltet, sagt seine Zeile.
    SIGN.step(state, at, { ...NOTHING, triggered: true }, 0.016);
    expect(state.reads).toBe(2);
  });

  it('hält niemanden auf — die Wand dahinter tut das schon', () => {
    expect(SIGN.solid(SIGN.init(board()))).toBe(false);
    expect(SIGN.edge).toBe(true);
  });
});
