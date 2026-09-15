import { DIR_S } from '../../nav/navTile';
import type { FixtureInput, FixturePlacement } from './index';
import { SIGN, signMarkdown, signText, type SignState } from './sign';

function board(props: Record<string, string | boolean> = {}): FixturePlacement {
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
   * lesen. Und jedes Lesen schlägt den Aushang auf — eine Meldung am
   * Handgelenk war vier Sekunden lang zu sehen, ein Wegweiser mit drei Zielen
   * passte nie hinein.
   */
  it('zählt jedes Lesen und schlägt dabei den Aushang auf', () => {
    const at = board({ text: '# Zur Küche\n\n- Geradeaus' });
    const state: SignState = SIGN.init(at);
    expect(state.reads).toBe(0);

    expect(SIGN.step(state, at, NOTHING, 0.016)).toEqual([]);
    expect(state.reads).toBe(0);

    expect(SIGN.step(state, at, { ...NOTHING, used: true }, 0.016)).toEqual([
      { type: 'sound', name: 'pick' },
      // Die Überschrift der Seite ist die erste Zeile ohne ihre Zeichen —
      // dieselbe, die auch auf der Tafel steht.
      { type: 'read', title: 'Zur Küche', text: '# Zur Küche\n\n- Geradeaus', markdown: true },
    ]);
    expect(state.reads).toBe(1);

    // Auch aus der Ferne: Ein Schild, das ein Knopf schaltet, sagt seine Zeile.
    SIGN.step(state, at, { ...NOTHING, triggered: true }, 0.016);
    expect(state.reads).toBe(2);
  });

  /**
   * Markdown ist an, solange niemand widerspricht: Ein Schild mit einer Zeile
   * sieht so aus wie vorher, eines mit einer Überschrift bekommt eine.
   */
  it('liest den Text als Markdown, wenn niemand widerspricht', () => {
    expect(signMarkdown(board())).toBe(true);
    expect(signMarkdown(board({ markdown: false }))).toBe(false);
  });

  it('hält niemanden auf — die Wand dahinter tut das schon', () => {
    expect(SIGN.solid(SIGN.init(board()))).toBe(false);
    expect(SIGN.edge).toBe(true);
  });
});
