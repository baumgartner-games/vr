import { ITEM_LABELS, isFood, kitchenDeed, kitchenPrompt, type KitchenItem } from './kitchenCarry';
import { CHOPS } from './kitchenRecipes';

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

/**
 * **Der Weg vom Rohen zum Burger** — Schneidebrett, Pfanne, Anrichte, Teller.
 *
 * Vier Stationen, an denen jeweils ein halbes Dutzend Fälle hängt: Was
 * passiert mit vollen Händen, was mit leeren, was mit dem Falschen darin. Im
 * Headset ist das ein Nachmittag; hier sind es dreißig Zeilen.
 */
describe('vom Rohen zum Burger', () => {
  it('legt auf das Brett, schneidet dreimal und nimmt wieder mit', () => {
    expect(kitchenDeed('lettuce', { kind: 'board', on: null })).toEqual({
      do: 'place',
      item: 'lettuce',
    });
    // Mit leerer Hand vor dem Kopf Salat: schneiden, und zwar so oft, bis er
    // geschnitten ist. Das Zählen macht die Zone, die Tat steht hier.
    expect(kitchenDeed(null, { kind: 'board', on: 'lettuce' })).toEqual({
      do: 'chop',
      item: 'lettuce',
    });
    // Und danach ist es eine gewöhnliche Ablage.
    expect(kitchenDeed(null, { kind: 'board', on: 'lettuce-cut' })).toEqual({
      do: 'take',
      item: 'lettuce-cut',
    });
    // Ein Brötchen wird nicht geschnitten — es liegt dort nur herum.
    expect(kitchenDeed(null, { kind: 'board', on: 'bun' })).toEqual({ do: 'take', item: 'bun' });
  });

  it('sagt am Brett, wie viele Schnitte noch fehlen', () => {
    const deed = kitchenDeed(null, { kind: 'board', on: 'tomato' });
    expect(kitchenPrompt(deed, 'Schneidebrett', CHOPS)).toContain(`noch ${CHOPS}`);
  });

  it('brät das Patty in der Pfanne und nicht davor', () => {
    const stove = { kind: 'stove', on: 'pan' } as const;
    expect(kitchenDeed('patty', stove)).toEqual({ do: 'fry', item: 'patty' });
    // Solange es brät, passiert nichts — und man liest, warum.
    const waiting = kitchenDeed(null, { ...stove, pan: 'patty', done: false });
    expect(waiting.do).toBe('refuse');
    expect(waiting.do === 'refuse' && waiting.why).toContain('brät');
    expect(kitchenDeed(null, { ...stove, pan: 'patty-cooked', done: true })).toEqual({
      do: 'take',
      item: 'patty-cooked',
    });
    // Zwei Pattys in einer Pfanne gibt es nicht.
    const full = kitchenDeed('patty', { ...stove, pan: 'patty', done: false });
    expect(full.do).toBe('refuse');
    // Und ein Brötchen gehört nicht hinein.
    const wrong = kitchenDeed('bun', stove);
    expect(wrong.do).toBe('refuse');
    expect(wrong.do === 'refuse' && wrong.why).toContain('Pfanne');
  });

  /**
   * **Ohne Pfanne ist der Herd eine Fläche.** Wer sie abnimmt und mitnimmt,
   * soll dort trotzdem etwas abstellen können — ein Möbel, das ohne sein
   * Zubehör gar nichts mehr täte, wäre ein Loch in der Reihe.
   */
  it('gibt die Pfanne her und ist dann eine Ablage', () => {
    expect(kitchenDeed(null, { kind: 'stove', on: 'pan' })).toEqual({ do: 'take', item: 'pan' });
    expect(kitchenDeed('bun', { kind: 'stove', on: null })).toEqual({ do: 'place', item: 'bun' });
  });

  it('schichtet auf der Anrichte und nimmt nichts Rohes an', () => {
    expect(kitchenDeed('bun', { kind: 'build', stack: [] })).toEqual({ do: 'stack', item: 'bun' });
    const raw = kitchenDeed('patty', { kind: 'build', stack: ['bun'] });
    expect(raw.do).toBe('refuse');
    expect(raw.do === 'refuse' && raw.why).toContain('gebraten');
    const twice = kitchenDeed('bun', { kind: 'build', stack: ['bun'] });
    expect(twice.do).toBe('refuse');
  });

  it('gibt den fertigen Burger erst her, wenn er fertig ist', () => {
    const half = { kind: 'build', stack: ['bun'] } as const;
    expect(kitchenDeed(null, half).do).toBe('refuse');
    expect(kitchenDeed(null, { kind: 'build', stack: [] })).toEqual({ do: 'nothing' });
    expect(kitchenDeed(null, { kind: 'build', stack: ['bun', 'patty-cooked'] })).toEqual({
      do: 'take',
      item: 'burger',
    });
  });

  /**
   * **Der Teller holt den Burger ab.** Genau dafür gibt es die Tellerausgabe:
   * anrichten, und dann mit beidem in der Hand los.
   */
  it('richtet auf dem Teller an', () => {
    const done = { kind: 'build', stack: ['bun', 'patty-cooked', 'tomato-cut'] } as const;
    expect(kitchenDeed('plate', done)).toEqual({ do: 'dish', item: 'plate-burger' });
    expect(kitchenPrompt(kitchenDeed('plate', done), 'Anrichte')).toBe('Burger anrichten');
    const early = kitchenDeed('plate', { kind: 'build', stack: ['bun'] });
    expect(early.do).toBe('refuse');
  });

  it('gibt Teller aus, so oft man will', () => {
    expect(kitchenDeed(null, { kind: 'box', gives: 'plate' })).toEqual({
      do: 'take',
      item: 'plate',
    });
  });

  /**
   * **Der Teller bleibt in der Hand.** Wer einen misslungenen Burger wegwirft,
   * will den Burger loswerden und nicht den Teller — sonst läuft er nach jedem
   * Fehlgriff zur Tellerausgabe.
   */
  it('kratzt den Burger ab und lässt den Teller in der Hand', () => {
    expect(kitchenDeed('plate-burger', { kind: 'bin' })).toEqual({ do: 'scrape', item: 'plate' });
    expect(kitchenPrompt(kitchenDeed('plate-burger', { kind: 'bin' }), 'Mülleimer')).toBe(
      'Burger abkratzen',
    );
    // Der leere Teller ist kein Abfall.
    const plate = kitchenDeed('plate', { kind: 'bin' });
    expect(plate.do).toBe('refuse');
    expect(plate.do === 'refuse' && plate.why).toContain(ITEM_LABELS.plate);
    // Ein Burger ohne Teller schon.
    expect(kitchenDeed('burger', { kind: 'bin' })).toEqual({ do: 'trash', item: 'burger' });
  });
});
