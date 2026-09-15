import {
  ITEM_LABELS,
  dish,
  kitchenDeed,
  kitchenPrompt,
  type Dish,
  type KitchenDeed,
  type KitchenItem,
  type Station,
} from './kitchenCarry';

/** Kurz geschrieben: `d('bun', 'patty-cooked')` ist ein belegtes Brötchen. */
function d(item: KitchenItem, ...on: KitchenItem[]): Dish {
  return dish(item, on);
}

/** Der Satz, mit dem eine Tat abgelehnt wurde. */
function why(deed: KitchenDeed): string {
  return deed.do === 'refuse' ? deed.why : '';
}

/** Was `A` hier täte — kurz, weil es in jeder zweiten Zeile steht. */
function press(held: Dish | null, station: Station): KitchenDeed {
  return kitchenDeed(held, station);
}

/**
 * **Die Fälle des Tragens** — was `A` tut, je nachdem, was in der Hand liegt
 * und wovor man steht.
 *
 * Genau dafür ist die Regel eine eigene Funktion (`kitchenCarry.ts`): Im
 * Headset ist ein Fall eine Viertelstunde Hin- und Herlaufen, hier ist er eine
 * Zeile.
 */
describe('Kisten, Flächen, Mülleimer', () => {
  it('nimmt aus der Kiste, so oft man will', () => {
    const box: Station = { kind: 'box', gives: 'bun' };
    expect(press(null, box)).toEqual({ do: 'take', dish: d('bun') });
    expect(press(null, box)).toEqual({ do: 'take', dish: d('bun') });
  });

  /**
   * **Die Kiste gibt auch in die volle Hand** — solange etwas darin Platz hat.
   * Wer mit dem Teller an der Brötchenkiste steht, will ein Brötchen darauf
   * und nicht erst den Teller irgendwo abstellen.
   */
  it('gibt der Kiste zufolge auch in den Träger in der Hand', () => {
    expect(press(d('plate'), { kind: 'box', gives: 'bun' })).toEqual({
      do: 'combine',
      held: d('plate', 'bun'),
      target: null,
      moved: ['bun'],
    });
    // Und das rohe Patty geht direkt in die mitgebrachte Pfanne.
    expect(press(d('pan'), { kind: 'box', gives: 'patty' })).toEqual({
      do: 'combine',
      held: d('pan', 'patty'),
      target: null,
      moved: ['patty'],
    });
  });

  it('gibt aus der Kiste nichts in eine Hand, die schon voll ist', () => {
    const pot = press(d('pot'), { kind: 'box', gives: 'bun' });
    expect(pot.do).toBe('refuse');
    expect(why(pot)).toContain('Hände');
    // Zwei Brötchen werden kein Burger — und der Satz sagt, was hilft.
    expect(why(press(d('bun'), { kind: 'box', gives: 'bun' }))).toContain('Teller');
    // Rohes bleibt roh, auch direkt an der Kiste.
    expect(why(press(d('plate'), { kind: 'box', gives: 'patty' }))).toContain('gebraten');
  });

  it('legt auf eine freie Fläche und nimmt von einer belegten', () => {
    expect(press(d('bun'), { kind: 'top', on: null })).toEqual({ do: 'place', dish: d('bun') });
    expect(press(null, { kind: 'top', on: d('pan') })).toEqual({ do: 'take', dish: d('pan') });
    // Was daraufliegt, kommt mit — ein Teller wird samt Burger genommen.
    const full = d('plate', 'bun', 'patty-cooked');
    expect(press(null, { kind: 'top', on: full })).toEqual({ do: 'take', dish: full });
  });

  /**
   * **Auf einer belegten Fläche wird jetzt kombiniert** statt abgelehnt. Das
   * ist die Stelle, an der aus „Hier liegt schon ein Teller" ein Burger wird —
   * und der Grund, warum es keine Anrichte mehr gibt.
   */
  it('legt auf der Fläche zusammen, was zusammengehört', () => {
    expect(press(d('patty-cooked'), { kind: 'top', on: d('bun') })).toEqual({
      do: 'combine',
      held: null,
      target: d('bun', 'patty-cooked'),
      moved: ['patty-cooked'],
    });
    expect(press(d('plate'), { kind: 'top', on: d('bun', 'patty-cooked') })).toEqual({
      do: 'combine',
      held: d('plate', 'bun', 'patty-cooked'),
      target: null,
      moved: ['bun', 'patty-cooked'],
    });
  });

  it('sagt an einer Fläche, warum zwei Dinge nicht zusammengehen', () => {
    const deed = press(d('pot'), { kind: 'top', on: d('plate') });
    expect(deed.do).toBe('refuse');
    expect(why(deed)).toContain('Topf');
  });

  it('tut mit leerer Hand vor einer leeren Fläche nichts', () => {
    expect(press(null, { kind: 'top', on: null })).toEqual({ do: 'nothing' });
    expect(press(null, { kind: 'bin' })).toEqual({ do: 'nothing' });
    expect(press(null, { kind: 'serve' })).toEqual({ do: 'nothing' });
    expect(press(null, { kind: 'box' })).toEqual({ do: 'nothing' });
  });

  it('wirft Essen weg', () => {
    expect(press(d('bun'), { kind: 'bin' })).toEqual({ do: 'trash', dish: d('bun') });
    expect(press(d('patty-burnt'), { kind: 'bin' })).toEqual({
      do: 'trash',
      dish: d('patty-burnt'),
    });
  });

  /**
   * **Der Träger bleibt in der Hand.** Wer einen misslungenen Burger abräumt,
   * will das Essen loswerden und nicht den Teller — sonst läuft er nach jedem
   * Fehlgriff zur Tellerausgabe. Auch die Pfanne behält sich selbst.
   */
  it('räumt den Träger ab und behält ihn', () => {
    expect(press(d('plate', 'bun', 'patty-burnt'), { kind: 'bin' })).toEqual({
      do: 'scrape',
      dish: d('plate'),
    });
    expect(press(d('pan', 'patty-burnt'), { kind: 'bin' })).toEqual({
      do: 'scrape',
      dish: d('pan'),
    });
    // Das leere Brötchen danach ist Essen und darf hinein.
    expect(press(d('bun'), { kind: 'bin' })).toEqual({ do: 'trash', dish: d('bun') });
  });

  it('nimmt Gerät und leeren Teller nicht in den Müll', () => {
    for (const item of ['pot', 'pan', 'plate', 'extinguisher'] as const) {
      const deed = press(d(item), { kind: 'bin' });
      expect({ item, do: deed.do }).toEqual({ item, do: 'refuse' });
      expect(why(deed)).toContain(ITEM_LABELS[item]);
    }
  });
});

/**
 * **Der Weg vom Rohen zum Burger** — Brett, Herd, Ausgabe.
 */
describe('Brett, Herd und Ausgabe', () => {
  it('fängt am Brett sofort an zu schneiden', () => {
    expect(press(d('lettuce'), { kind: 'board', on: null })).toEqual({
      do: 'chop',
      dish: d('lettuce'),
    });
    expect(press(d('tomato-cut'), { kind: 'board', on: null })).toEqual({
      do: 'chop',
      dish: d('tomato-cut'),
    });
    // Was nicht geschnitten wird, liegt dort nur herum — ein Brett ist auch
    // eine Ablage.
    expect(press(d('bun'), { kind: 'board', on: null })).toEqual({ do: 'place', dish: d('bun') });
    expect(press(null, { kind: 'board', on: d('lettuce-cut') })).toEqual({
      do: 'take',
      dish: d('lettuce-cut'),
    });
  });

  it('lässt auch auf dem Brett zusammenlegen', () => {
    expect(press(d('bun'), { kind: 'board', on: d('lettuce-cut') })).toEqual({
      do: 'combine',
      held: d('bun', 'lettuce-cut'),
      target: null,
      moved: ['lettuce-cut'],
    });
    // Der halb geschnittene Salat aber nicht: Er ist noch roh.
    expect(why(press(d('bun'), { kind: 'board', on: d('lettuce') }))).toContain('geschnitten');
  });

  /**
   * **Aus der Pfanne nimmt man nichts heraus — man nimmt die Pfanne.** Das
   * Patty wandert erst am Brötchen oder am Teller hinaus, und die Pfanne
   * bleibt dabei stehen, wo sie war.
   */
  it('nimmt die Pfanne mitsamt Patty vom Herd', () => {
    const stove: Station = { kind: 'stove', on: d('pan', 'patty-cooked') };
    expect(press(null, stove)).toEqual({ do: 'take', dish: d('pan', 'patty-cooked') });
    expect(press(d('bun'), stove)).toEqual({
      do: 'combine',
      held: d('bun', 'patty-cooked'),
      target: d('pan'),
      moved: ['patty-cooked'],
    });
  });

  it('legt das rohe Patty in die Pfanne und kein zweites hinterher', () => {
    const stove: Station = { kind: 'stove', on: d('pan') };
    expect(press(d('patty'), stove)).toEqual({
      do: 'combine',
      held: null,
      target: d('pan', 'patty'),
      moved: ['patty'],
    });
    const full = press(d('patty'), { kind: 'stove', on: d('pan', 'patty') });
    expect(full.do).toBe('refuse');
    expect(why(full)).toContain('Pfanne');
    // Und ein Brötchen gehört nicht hinein.
    expect(why(press(d('bun'), stove))).toContain('Pfanne');
  });

  /**
   * **Ohne Pfanne ist der Herd eine Fläche.** Wer sie abnimmt und mitnimmt,
   * soll dort trotzdem etwas abstellen können — ein Möbel, das ohne sein
   * Zubehör gar nichts mehr täte, wäre ein Loch in der Reihe.
   */
  it('ist ohne Pfanne eine gewöhnliche Ablage', () => {
    expect(press(d('bun'), { kind: 'stove', on: null })).toEqual({ do: 'place', dish: d('bun') });
    expect(press(null, { kind: 'stove', on: null })).toEqual({ do: 'nothing' });
  });

  /**
   * **Ein brennender Herd ist keine Fläche mehr.** Solange es brennt, geht
   * genau eines — und wer ohne Feuerlöscher davorsteht, liest, welches.
   */
  it('lässt einen brennenden Herd nur löschen', () => {
    const fire: Station = { kind: 'stove', on: d('pan', 'patty-burnt'), fire: true };
    expect(press(d('extinguisher'), fire)).toEqual({ do: 'douse' });
    for (const held of [null, d('bun'), d('pan')]) {
      const deed = press(held, fire);
      expect(deed.do).toBe('refuse');
      expect(why(deed)).toContain('Feuerlöscher');
    }
  });

  it('holt den Feuerlöscher aus der Halterung und stellt ihn zurück', () => {
    const full: Station = { kind: 'rack', on: d('extinguisher') };
    const empty: Station = { kind: 'rack', on: null };
    expect(press(null, full)).toEqual({ do: 'take', dish: d('extinguisher') });
    expect(press(null, empty)).toEqual({ do: 'nothing' });
    expect(press(d('extinguisher'), empty)).toEqual({ do: 'place', dish: d('extinguisher') });
    // Alles andere bleibt draußen — sonst liegt der Löscher beim nächsten
    // Feuer irgendwo.
    expect(why(press(d('bun'), empty))).toContain('Feuerlöscher');
    expect(why(press(d('extinguisher'), full))).toContain('schon');
  });

  /**
   * **Über die Theke geht, was ein Burger ist** — mit oder ohne Teller
   * darunter, und der Teller bleibt in der Hand.
   */
  it('gibt fertige Gerichte aus', () => {
    expect(press(d('bun', 'patty-cooked'), { kind: 'serve' })).toEqual({
      do: 'serve',
      recipe: expect.objectContaining({ id: 'hamburger' }),
      held: null,
    });
    expect(press(d('plate', 'bun', 'patty-cooked', 'tomato-cut'), { kind: 'serve' })).toEqual({
      do: 'serve',
      recipe: expect.objectContaining({ id: 'tomate' }),
      held: d('plate'),
    });
  });

  it('gibt nichts Halbes, nichts Rohes und nichts Verbranntes aus', () => {
    const pass: Station = { kind: 'serve' };
    expect(why(press(d('bun'), pass))).toContain('Patty');
    expect(why(press(d('plate', 'lettuce-cut'), pass))).toContain('Brötchen');
    expect(why(press(d('bun', 'patty-burnt'), pass))).toContain('Müll');
    expect(why(press(d('pan', 'patty-cooked'), pass))).toContain('Brötchen');
    expect(why(press(d('pot'), pass))).toContain('Topf');
  });
});

/**
 * **Der Hinweis über der Figur** wird aus der Tat gebaut — einer, der
 * _Ablegen_ sagt und dann nichts tut, ist schlimmer als gar keiner.
 */
describe('der Hinweis über der Figur', () => {
  it('sagt vorher an, was gleich passiert', () => {
    expect(kitchenPrompt(press(null, { kind: 'top', on: d('pot') }), 'Herd')).toBe('Topf nehmen');
    expect(kitchenPrompt(press(d('bun'), { kind: 'top', on: null }), 'Arbeitstisch')).toBe(
      'Brötchen auf Arbeitstisch legen',
    );
    expect(kitchenPrompt(press(d('lettuce'), { kind: 'board', on: null }), 'Schneidebrett')).toBe(
      'Salatkopf schneiden',
    );
    expect(kitchenPrompt(press(d('patty-cooked'), { kind: 'top', on: d('bun') }), 'Zeile')).toBe(
      'Gebratenes Patty auflegen',
    );
    expect(kitchenPrompt(press(d('bun'), { kind: 'bin' }), 'Mülleimer')).toBe('Brötchen wegwerfen');
    expect(kitchenPrompt(press(d('plate', 'bun'), { kind: 'bin' }), 'Mülleimer')).toBe(
      'Teller abräumen',
    );
    expect(
      kitchenPrompt(press(d('plate', 'bun', 'patty-cooked'), { kind: 'serve' }), 'Ausgabe'),
    ).toBe('Hamburger servieren');
    expect(kitchenPrompt(press(d('extinguisher'), { kind: 'stove', fire: true }), 'Herd')).toBe(
      'Feuer löschen',
    );
  });

  it('nennt beim Nehmen auch, was daraufliegt', () => {
    const plate = d('plate', 'bun', 'patty-cooked');
    expect(kitchenPrompt(press(null, { kind: 'top', on: plate }), 'Zeile')).toBe(
      'Teller mit Hamburger nehmen',
    );
    expect(kitchenPrompt(press(null, { kind: 'stove', on: d('pan', 'patty') }), 'Herd')).toBe(
      'Pfanne (Rohes Patty) nehmen',
    );
  });

  it('gibt den Satz der Ablehnung unverändert weiter', () => {
    const deed = press(d('patty'), { kind: 'top', on: d('bun') });
    expect(kitchenPrompt(deed, 'Zeile')).toBe(why(deed));
    expect(kitchenPrompt(deed, 'Zeile')).toContain('gebraten');
  });

  /**
   * **Eine Station meldet sich nur, wenn sie etwas zu sagen hat** — und die
   * Regel selbst entscheidet das (`kitchen.refreshStations`). `nothing` ist
   * der einzige stumme Fall; `refuse` hat einen Satz und meldet sich damit.
   */
  it('ist genau dann stumm, wenn es nichts zu tun gibt', () => {
    const quiet: [Dish | null, Station][] = [
      [null, { kind: 'top', on: null }],
      [null, { kind: 'board', on: null }],
      [null, { kind: 'bin' }],
      [null, { kind: 'rack', on: null }],
    ];
    for (const [held, station] of quiet) {
      expect(kitchenPrompt(press(held, station), 'Möbel')).toBe('');
    }
    const loud: [Dish | null, Station][] = [
      [d('pot'), { kind: 'bin' }],
      [d('bun'), { kind: 'top', on: d('pot') }],
      [null, { kind: 'box', gives: 'bun' }],
      [d('bun'), { kind: 'serve' }],
    ];
    for (const [held, station] of loud) {
      expect(kitchenPrompt(press(held, station), 'Möbel').length).toBeGreaterThan(0);
    }
  });
});

/**
 * **Eine Kiste ist keine Ablage** — und genau daran hing ein Fehler, den erst
 * der Durchgang im Browser zeigte.
 *
 * Wer mit der Pfanne voll gebratenem Patty an die Brötchenausgabe trat, bekam
 * ein Brötchen mit Patty darauf, das nirgendwohin gehörte: Die Kiste hat keine
 * Fläche, auf der es liegen bleiben könnte, und in der Hand lag die Pfanne.
 * Ergebnis war ein spurlos verschwundenes Patty.
 */
describe('an der Kiste', () => {
  it('gibt in die leere Hand', () => {
    expect(kitchenDeed(null, { kind: 'box', gives: 'bun' })).toEqual({
      do: 'take',
      dish: dish('bun'),
    });
  });

  it('legt in einen Träger, den die Hand hält', () => {
    const deed = kitchenDeed(dish('plate'), { kind: 'box', gives: 'bun' });
    expect(deed).toEqual({
      do: 'combine',
      held: dish('plate', ['bun']),
      target: null,
      moved: ['bun'],
    });
    // Und die leere Pfanne nimmt das rohe Patty auf.
    const pan = kitchenDeed(dish('pan'), { kind: 'box', gives: 'patty' });
    expect(pan.do).toBe('combine');
    expect(pan.do === 'combine' && pan.held).toEqual(dish('pan', ['patty']));
  });

  /**
   * **Der frische Teller nimmt den Burger auf.** Wer mit einem belegten
   * Brötchen an die Tellerausgabe tritt, will ihn anrichten und nicht erst
   * irgendwo ablegen — bei _Overcooked_ ist genau das der letzte Handgriff vor
   * der Theke.
   */
  it('nimmt den Burger auf den Teller, den es hergibt', () => {
    const deed = kitchenDeed(dish('bun', ['patty-cooked']), { kind: 'box', gives: 'plate' });
    expect(deed).toEqual({
      do: 'combine',
      held: dish('plate', ['bun', 'patty-cooked']),
      target: null,
      moved: ['bun', 'patty-cooked'],
    });
  });

  it('gibt nichts heraus, was niemand halten kann', () => {
    // Die Pfanne gäbe ihr Patty an ein frisches Brötchen ab — und das Brötchen
    // hätte danach keinen Platz. Lieber gar nichts tun und es sagen.
    const deed = kitchenDeed(dish('pan', ['patty-cooked']), { kind: 'box', gives: 'bun' });
    expect(deed.do).toBe('refuse');
    expect(deed.do === 'refuse' && deed.why).toContain('Hände frei');
  });
});
