import { ITEM_LABELS, isFood, kitchenDeed, kitchenPrompt, type KitchenItem } from './kitchenCarry';

/**
 * **Die neun Fälle des Tragens** — was `A` tut, je nachdem, was in der Hand
 * liegt und wovor man steht.
 *
 * Genau dafür ist die Regel eine eigene Funktion (`kitchenCarry.ts`): Im
 * Headset ist ein Fall eine Viertelstunde Hin- und Herlaufen, hier ist er eine
 * Zeile. Der Fall, an dem es beim Bauen wirklich hakte, steht unten: der
 * **Topf im Mülleimer**.
 */
describe('was A in der Küche tut', () => {
  it('nimmt aus der Kiste, so oft man will', () => {
    expect(kitchenDeed(null, { kind: 'box', gives: 'bun' })).toEqual({ do: 'take', item: 'bun' });
    expect(kitchenDeed(null, { kind: 'box', gives: 'bun' })).toEqual({ do: 'take', item: 'bun' });
  });

  it('gibt aus der Kiste nichts in eine volle Hand', () => {
    const deed = kitchenDeed('pot', { kind: 'box', gives: 'bun' });
    expect(deed.do).toBe('refuse');
  });

  it('legt auf eine freie Fläche und nimmt von einer belegten', () => {
    expect(kitchenDeed('bun', { kind: 'top', on: null })).toEqual({ do: 'place', item: 'bun' });
    expect(kitchenDeed(null, { kind: 'top', on: 'pan' })).toEqual({ do: 'take', item: 'pan' });
  });

  it('sagt an einer belegten Fläche, warum nichts passiert', () => {
    const deed = kitchenDeed('bun', { kind: 'top', on: 'pot' });
    expect(deed).toEqual({ do: 'refuse', why: 'Hier liegt schon Topf' });
  });

  it('tut mit leerer Hand vor einer leeren Fläche nichts', () => {
    expect(kitchenDeed(null, { kind: 'top', on: null })).toEqual({ do: 'nothing' });
    expect(kitchenDeed(null, { kind: 'bin' })).toEqual({ do: 'nothing' });
  });

  it('wirft Essen weg', () => {
    expect(kitchenDeed('bun', { kind: 'bin' })).toEqual({ do: 'trash', item: 'bun' });
    expect(isFood('bun')).toBe(true);
  });

  /**
   * **Der Topf bleibt draußen.** Ein Mülleimer, der alles schluckt, ist einer,
   * in dem nach zwei Minuten die einzige Pfanne der Küche liegt — und die kommt
   * nur mit `B` zurück, was niemand ahnt, der gerade den Deckel zugemacht hat.
   */
  it('nimmt Topf und Pfanne nicht in den Müll', () => {
    for (const item of ['pot', 'pan'] as const) {
      const deed = kitchenDeed(item, { kind: 'bin' });
      expect({ item, do: deed.do }).toEqual({ item, do: 'refuse' });
      expect(deed.do === 'refuse' && deed.why).toContain(ITEM_LABELS[item]);
      expect(isFood(item)).toBe(false);
    }
  });

  it('beschriftet jedes Ding', () => {
    const items: readonly KitchenItem[] = ['pot', 'pan', 'bun'];
    for (const item of items) expect(ITEM_LABELS[item].length).toBeGreaterThan(2);
  });

  /**
   * Der Hinweis über der Figur wird **aus der Tat gebaut** — einer, der
   * _Ablegen_ sagt und dann nichts tut, ist schlimmer als gar keiner.
   */
  it('sagt vorher an, was gleich passiert', () => {
    expect(kitchenPrompt(kitchenDeed(null, { kind: 'top', on: 'pot' }), 'Herd')).toBe(
      'Topf nehmen',
    );
    expect(kitchenPrompt(kitchenDeed('bun', { kind: 'top', on: null }), 'Arbeitstisch')).toBe(
      'Brötchen auf Arbeitstisch legen',
    );
    expect(kitchenPrompt(kitchenDeed('bun', { kind: 'bin' }), 'Mülleimer')).toBe(
      'Brötchen wegwerfen',
    );
    expect(kitchenPrompt(kitchenDeed(null, { kind: 'top', on: null }), 'Küchenzeile')).toBe('');
  });
});
