import {
  CLEAN_STACK_MAX,
  ITEM_LABELS,
  WORK_SECONDS,
  advanceWork,
  dish,
  kitchenDeed,
  kitchenInteraction,
  kitchenPrompt,
  meansContent,
  onWork,
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

  /**
   * **Was nicht in die Hand passt, kommt auf den Deckel.** Früher stand hier
   * „erst die Hände frei machen" — ein Satz, der einen quer durch die Küche
   * zur nächsten freien Fläche schickte, obwohl man vor einer stand. Die Kiste
   * ist jetzt zugleich Arbeitsplatte, und damit ist der Handgriff derselbe wie
   * an der Zeile.
   */
  it('legt auf die Kiste, was nicht in die Hand geht', () => {
    expect(press(d('pot'), { kind: 'box', gives: 'bun' })).toEqual({
      do: 'place',
      dish: d('pot'),
    });
    // Zwei Brötchen werden kein Burger — also liegt das mitgebrachte jetzt da.
    expect(press(d('bun'), { kind: 'box', gives: 'bun' })).toEqual({
      do: 'place',
      dish: d('bun'),
    });
    // Und der Teller an der Pattykiste: Rohes bleibt roh, der Teller liegt ab.
    expect(press(d('plate'), { kind: 'box', gives: 'patty' })).toEqual({
      do: 'place',
      dish: d('plate'),
    });
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

  /**
   * **Verbranntes kommt nicht mehr auf den Burger.** Früher durfte es das,
   * damit man es wieder abräumen kann — in Wahrheit baute man damit einen
   * Burger, der erst an der Theke durchfiel. Jetzt fällt es schon hier durch,
   * und der Satz nennt den Weg zum Mülleimer.
   */
  it('legt kein verbranntes Patty auf Brötchen oder Teller', () => {
    for (const on of [d('bun'), d('plate'), d('plate', 'bun', 'patty-cooked')]) {
      const deed = press(d('patty-burnt'), { kind: 'top', on });
      expect(deed.do).toBe('refuse');
      expect(why(deed)).toContain('Müll');
    }
    // Aus der Pfanne heraus genauso — sie ist der einzige Ort, an dem es
    // entsteht, und der Mülleimer der einzige, an dem es hingehört.
    const pan = press(d('pan', 'patty-burnt'), { kind: 'top', on: d('bun') });
    expect(pan.do).toBe('refuse');
    expect(why(pan)).toContain('Müll');
    expect(press(d('pan', 'patty-burnt'), { kind: 'bin' })).toEqual({
      do: 'scrape',
      dish: d('pan'),
    });
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
    expect(press(d('plate', 'bun', 'lettuce-cut'), { kind: 'bin' })).toEqual({
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
    for (const item of ['pot', 'pan', 'plate', 'plate-dirty', 'extinguisher'] as const) {
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
      do: 'work',
      kind: 'chop',
      dish: d('lettuce'),
    });
    expect(press(d('tomato-cut'), { kind: 'board', on: null })).toEqual({
      do: 'work',
      kind: 'chop',
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
   * **Über die Theke geht nur, was auf einem Teller liegt** — und danach sind
   * Teller **und** Gericht weg, beide beim Gast.
   *
   * Beides zusammen ist die Regel, einzeln wäre jede Hälfte falsch: Ein Burger
   * in der bloßen Hand ist kein Gericht, und ein Teller, der beim Servieren in
   * der Hand bliebe, machte die Tellerausgabe zum Brunnen und die Spüle zur
   * Deko. Der Teller kommt dreckig zurück (Rückgabe und Gästetisch) — das ist
   * der Kreis, um den es geht.
   */
  it('gibt fertige Gerichte nur auf dem Teller aus', () => {
    expect(press(d('plate', 'bun', 'patty-cooked'), { kind: 'serve' })).toEqual({
      do: 'serve',
      recipe: expect.objectContaining({ id: 'hamburger' }),
      held: null,
    });
    expect(press(d('plate', 'bun', 'patty-cooked', 'tomato-cut'), { kind: 'serve' })).toEqual({
      do: 'serve',
      recipe: expect.objectContaining({ id: 'tomate' }),
      held: null,
    });
  });

  /**
   * **Ohne Teller geht nichts über die Theke**, und der Satz sagt genau das —
   * nicht „das ist noch kein Burger", denn der Burger ist ja fertig.
   */
  it('weist denselben Burger ohne Teller ab', () => {
    const pass: Station = { kind: 'serve' };
    for (const held of [d('bun', 'patty-cooked'), d('bun', 'patty-cooked', 'lettuce-cut')]) {
      const deed = press(held, pass);
      expect(deed.do).toBe('refuse');
      expect(why(deed)).toContain('Teller');
    }
  });

  it('gibt nichts Halbes, nichts Rohes und keinen leeren Teller aus', () => {
    const pass: Station = { kind: 'serve' };
    // Fehlt am Gericht noch etwas, ist der fehlende Teller das kleinere
    // Problem — der Satz nennt das größere zuerst.
    expect(why(press(d('bun'), pass))).toContain('Patty');
    expect(why(press(d('plate', 'lettuce-cut'), pass))).toContain('Brötchen');
    expect(why(press(d('pan', 'patty-cooked'), pass))).toContain('Brötchen');
    // Der leere Teller ist kein Gericht.
    expect(why(press(d('plate'), pass))).toContain('Brötchen');
    expect(press(null, pass)).toEqual({ do: 'nothing' });
    // Und Verbranntes kommt gar nicht erst auf einen Teller (`carries`) — aus
    // der Pfanne heraus liest man trotzdem, wohin es gehört.
    expect(why(press(d('pan', 'patty-burnt'), pass))).toContain('Müll');
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
 * **Die Kiste ist Ausgabe und Arbeitsplatte zugleich.**
 *
 * Aus ihr kommt das Frische, und auf ihrem Deckel liegt, was man gerade nicht
 * in der Hand haben will — Brötchen, Patty, Tomate, Salat und an der
 * Tellerausgabe der Teller selbst. Was **nicht** geht, ist Frisches
 * auszugeben, das anschließend niemandem gehört: Wer mit der Pfanne voll
 * gebratenem Patty an die Brötchenausgabe trat, bekam einmal ein Brötchen mit
 * Patty darauf, das in der Luft hing — das Patty war spurlos weg. Heute fängt
 * der Deckel die Pfanne auf, statt ein Brötchen aus dem Nichts zu erfinden.
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
    // hätte danach keinen Platz. Also gibt es kein Brötchen, sondern die
    // Pfanne kommt auf den Deckel.
    const deed = kitchenDeed(dish('pan', ['patty-cooked']), { kind: 'box', gives: 'bun' });
    expect(deed).toEqual({ do: 'place', dish: dish('pan', ['patty-cooked']) });
    // Liegt der Deckel schon voll, passiert gar nichts — und man liest, warum.
    const full = kitchenDeed(dish('pan', ['patty-cooked']), {
      kind: 'box',
      gives: 'bun',
      on: dish('pot'),
    });
    expect(full.do).toBe('refuse');
  });

  /**
   * **Die Kiste als Ablage** — das ist der zweite Beruf jedes Kistendeckels.
   * Was daraufliegt, geht beim Nehmen vor: Die Kiste gibt ihr Frisches ja noch
   * beliebig oft her, das abgestellte Ding gibt es genau einmal.
   */
  it('nimmt Abgestelltes an und gibt es vor dem Frischen zurück', () => {
    const box: Station = { kind: 'box', gives: 'bun' };
    for (const item of ['patty', 'tomato', 'lettuce', 'pot'] as const) {
      expect(kitchenDeed(dish(item), box)).toEqual({ do: 'place', dish: dish(item) });
    }
    expect(kitchenDeed(null, { ...box, on: dish('tomato-cut') })).toEqual({
      do: 'take',
      dish: dish('tomato-cut'),
    });
  });

  /**
   * **Und der Teller geht an der Tellerausgabe wieder zurück.** Wer ihn doch
   * nicht braucht, stellt ihn dorthin, wo er ihn hergeholt hat — alles andere
   * wäre ein Teller, den man nur noch tragen oder in die Spüle stellen kann.
   */
  it('nimmt den Teller an der Tellerausgabe zurück', () => {
    const plates: Station = { kind: 'box', gives: 'plate' };
    expect(kitchenDeed(dish('plate'), plates)).toEqual({ do: 'place', dish: dish('plate') });
    // Der belegte Teller auch — man legt ihn ab wie auf jede Fläche.
    const full = dish('plate', ['bun', 'patty-cooked']);
    expect(kitchenDeed(full, plates)).toEqual({ do: 'place', dish: full });
    // Und danach nimmt man ihn von dort wieder auf.
    expect(kitchenDeed(null, { ...plates, on: full })).toEqual({ do: 'take', dish: full });
  });

  /**
   * **Das Kombinieren geht weiter vor.** Ein Brötchen auf den mitgebrachten
   * Teller ist der Handgriff, für den die Kiste in die volle Hand gibt — das
   * Ablegen kommt erst, wenn er nicht geht.
   */
  it('legt lieber zusammen, als abzustellen', () => {
    expect(kitchenDeed(dish('plate'), { kind: 'box', gives: 'bun' })).toEqual({
      do: 'combine',
      held: dish('plate', ['bun']),
      target: null,
      moved: ['bun'],
    });
  });

  /**
   * **Was auf dem Deckel liegt, bleibt liegen** — und daran hing der zweite
   * Fehler derselben Art.
   *
   * Die Kiste gibt ihr Frisches aus dem Nichts in die Hand; was daneben auf
   * ihrem Deckel liegt, ist an diesem Handgriff gar nicht beteiligt. Stand dort
   * trotzdem `target: null`, las die Zone das als _hier liegt danach nichts
   * mehr_, räumte die Fläche und warf weg, was darauf war: Wer mit dem Teller
   * an die Brötchenausgabe trat, auf deren Deckel eine Tomate lag, bekam das
   * Brötchen — und die Tomate war spurlos weg.
   */
  it('lässt das Liegende liegen, wenn es das Frische in die Hand gibt', () => {
    const tomato = dish('tomato');
    const deed = kitchenDeed(dish('plate'), { kind: 'box', gives: 'bun', on: tomato });
    expect(deed).toEqual({
      do: 'combine',
      held: dish('plate', ['bun']),
      target: tomato,
      moved: ['bun'],
    });
    // Und zwar unverändert — die Station bekommt denselben Stand zurück, den
    // sie hatte, damit die Zone daraus ein Nichtstun machen kann.
    expect(deed.do === 'combine' && deed.target).toBe(tomato);

    // Dasselbe in die andere Richtung: Die leere Pfanne holt sich das rohe
    // Patty, der Salatkopf auf dem Deckel geht das nichts an.
    const lettuce = dish('lettuce');
    const pan = kitchenDeed(dish('pan'), { kind: 'box', gives: 'patty', on: lettuce });
    expect(pan).toEqual({
      do: 'combine',
      held: dish('pan', ['patty']),
      target: lettuce,
      moved: ['patty'],
    });
  });

  /**
   * **Das Liegende geht vor dem Frischen** — und die Regel gibt dafür
   * dasselbe `on` zurück, das sie bekommen hat. Nur daran erkennt die Zone,
   * dass sie hier das Liegende aufnehmen und die Fläche räumen soll, statt
   * wie sonst an einer Kiste ein neues Ding zu bauen.
   */
  it('gibt beim Nehmen genau das Liegende zurück und keine Kopie', () => {
    const tomato = dish('tomato-cut');
    const deed = kitchenDeed(null, { kind: 'box', gives: 'bun', on: tomato });
    expect(deed).toEqual({ do: 'take', dish: tomato });
    expect(deed.do === 'take' && deed.dish).toBe(tomato);
  });

  /**
   * **Auf dem Deckel wird auch kombiniert** — wie auf jeder anderen Fläche.
   * Eine Kiste ohne `gives` ist dann nichts weiter als eine Ablage.
   */
  it('legt auf dem Deckel zusammen, was zusammengehört', () => {
    const deed = kitchenDeed(dish('patty-cooked'), { kind: 'box', on: dish('bun') });
    expect(deed).toEqual({
      do: 'combine',
      held: null,
      target: dish('bun', ['patty-cooked']),
      moved: ['patty-cooked'],
    });
    const no = kitchenDeed(dish('patty'), { kind: 'box', on: dish('bun') });
    expect(no.do).toBe('refuse');
    expect(no.do === 'refuse' && no.why).toContain('gebraten');
  });
});

/**
 * **Der Kreislauf des Geschirrs** — Theke, Gast, Rückgabe, Spüle.
 *
 * Er ist der Grund, warum die Theke einen Teller verlangt: Ohne ihn wäre die
 * Tellerausgabe ein Brunnen, aus dem man schöpft, und die Spüle stünde als
 * Möbel ohne Aufgabe herum. Mit ihm ist jeder servierte Burger ein Teller, der
 * später wiederkommt.
 */
describe('Spüle, Rückgabe und Gästetisch', () => {
  /**
   * **Spülen ist dasselbe wie Schneiden**, nur an einem anderen Möbel: Beides
   * ist `work` und läuft über `kitchenWork.ts`.
   */
  it('spült den dreckigen Teller, sobald er in der Spüle steht', () => {
    expect(press(d('plate-dirty'), { kind: 'sink', on: null })).toEqual({
      do: 'work',
      kind: 'wash',
      dish: d('plate-dirty'),
    });
    // Der saubere Teller darf auch hineingestellt werden, arbeitet aber nicht.
    expect(press(d('plate'), { kind: 'sink', on: null })).toEqual({
      do: 'place',
      dish: d('plate'),
    });
    // Und was darin steht, nimmt man heraus.
    expect(press(null, { kind: 'sink', on: d('plate') })).toEqual({
      do: 'take',
      dish: d('plate'),
    });
    expect(press(null, { kind: 'sink', on: null })).toEqual({ do: 'nothing' });
  });

  /**
   * **Der Nachgriff bei voller Hand.** Fertig gespült kommt der Teller von
   * selbst in die Hand (`kitchenWork.WORK_TO_HAND`) — außer die Hand war
   * voll, dann wartet er im Wasser. Dieser Griff ist der Ausweg daraus, und
   * er ist der Grund, warum die Spüle weiter hergibt, was in ihr steht.
   */
  it('gibt den wartenden sauberen Teller auf Nachfrage her', () => {
    expect(press(null, { kind: 'sink', on: d('plate') })).toEqual({
      do: 'take',
      dish: d('plate'),
    });
    // Mit voller Hand bleibt er stehen und sagt auch, warum: Zwei Teller
    // passen nicht übereinander.
    expect(why(press(d('plate-dirty'), { kind: 'sink', on: d('plate') }))).toContain('schon');
    // Und er ist sauber, also nimmt ihn das Abtropfbrett an.
    expect(press(d('plate'), { kind: 'drain', stack: 0 })).toEqual({
      do: 'place',
      dish: d('plate'),
    });
  });

  /**
   * **Der Topf steht nicht mehr in dieser Liste**, und das ist kein Versehen:
   * Er wird am Becken **gefüllt** und nicht hineingelegt (siehe die Fälle
   * darunter). Alles andere lehnt die Spüle weiterhin mit demselben Satz ab.
   */
  it('lässt in die Spüle nur Geschirr', () => {
    for (const item of ['bun', 'pan', 'lettuce', 'extinguisher'] as const) {
      const deed = press(d(item), { kind: 'sink' });
      expect({ item, do: deed.do }).toEqual({ item, do: 'refuse' });
      expect(why(deed)).toContain('Geschirr');
    }
    // Ein Teller mit Essen darauf gehört erst an den Mülleimer — eine Spüle,
    // die ihn schluckte, wäre ein zweiter Mülleimer mit Wasserhahn.
    expect(why(press(d('plate', 'bun'), { kind: 'sink' }))).toContain('Geschirr');
    // Und zwei Teller passen nicht übereinander.
    expect(why(press(d('plate-dirty'), { kind: 'sink', on: d('plate') }))).toContain('schon');
  });

  /**
   * **Das Becken ist auch ein Wasserhahn** — der Topf wird davor gefüllt, und
   * zwar ohne hineingestellt zu werden.
   *
   * Das ist die Zusage aus dem Auftrag, und sie hat zwei Hälften: Es geht mit
   * leerem Becken, und es geht **genauso** mit einem dreckigen Teller darin.
   * Die zweite Hälfte ist die eigentliche — sie ist der Grund, warum der Fall
   * in `atSink` vor beiden Ablehnungen steht und nicht dahinter.
   */
  it('füllt den Topf am Becken, ob es leer ist oder nicht', () => {
    const full = { do: 'fill', dish: d('pot', 'water') };
    expect(press(d('pot'), { kind: 'sink', on: null })).toEqual(full);
    // **Egal ob dreckiger Teller drin ist** — wörtlich der Auftrag.
    expect(press(d('pot'), { kind: 'sink', on: d('plate-dirty') })).toEqual(full);
    // Und auch neben dem sauberen Teller, der auf seine Abholung wartet
    // (`kitchenWork.WORK_TO_HAND`, volle Hand).
    expect(press(d('pot'), { kind: 'sink', on: d('plate') })).toEqual(full);
  });

  /**
   * **Die Station bleibt dabei unberührt.** Ein `fill` trägt nur den neuen
   * Stand der **Hand** — kein `target`, kein `place`, kein `work`. Daran hängt
   * in der Zone, dass die Uhr des Tellers im Becken weiterläuft, statt neben
   * dem Topf von vorn anzufangen.
   */
  it('rührt beim Füllen nichts an, was im Becken steht', () => {
    const deed = press(d('pot'), { kind: 'sink', on: d('plate-dirty') });
    expect(deed.do).toBe('fill');
    expect(Object.keys(deed).sort()).toEqual(['dish', 'do']);
    // Und der dreckige Teller wird weiterhin gespült wie eh und je — das
    // Füllen hat an dieser Regel nichts verschoben.
    expect(press(d('plate-dirty'), { kind: 'sink', on: null })).toEqual({
      do: 'work',
      kind: 'wash',
      dish: d('plate-dirty'),
    });
  });

  /**
   * **Ein voller Topf tut nichts Doppeltes**, sondern sagt, warum nichts
   * passiert — derselbe Umgang wie überall sonst in dieser Regel (`refuse`
   * trägt seinen Satz mit).
   */
  it('füllt keinen Topf, in dem schon Wasser ist', () => {
    const deed = press(d('pot', 'water'), { kind: 'sink', on: null });
    expect(deed.do).toBe('refuse');
    expect(why(deed)).toContain('Wasser');
    // Auch am besetzten Becken bleibt es bei diesem Satz und nicht bei dem
    // über das Geschirr darin: Der Topf geht das Becken nichts an.
    expect(why(press(d('pot', 'water'), { kind: 'sink', on: d('plate-dirty') }))).toContain(
      'Wasser',
    );
  });

  /**
   * **Gefüllt wird gedrückt und nicht gegriffen** (`core/interaction.ts`).
   *
   * Es ist eine Bedienung der Station wie Schneiden und Spülen, also ist es
   * `press` — in der Brille Berühren oder Trigger, von oben `A`, am
   * Schreibtisch die linke Maustaste. Und der **Saum** hängt an der Station und
   * nicht an dem, was im Becken liegt: Wer den Topf füllt, greift nicht nach
   * dem dreckigen Teller daneben.
   */
  it('bedient beim Füllen die Station', () => {
    const deed = press(d('pot'), { kind: 'sink', on: d('plate-dirty') });
    expect(kitchenInteraction(deed)).toBe('press');
    expect(meansContent(deed)).toBe(false);
    expect(kitchenPrompt(deed, 'Spülbecken')).toBe('Topf mit Wasser füllen');
  });

  /**
   * **Und das Wasser wird man wieder los.** Ein Zustand, aus dem es keinen
   * Rückweg gibt, wäre eine Sackgasse mit einem Topf darin — der einzige der
   * Küche.
   *
   * Der Weg ist der, den es für jeden Träger mit Inhalt schon gibt: über den
   * Mülleimer abräumen, Träger behalten (`intoBin` → `scrape`). Abstellen und
   * wieder aufnehmen geht voll wie leer.
   */
  it('lässt den vollen Topf ausgießen, abstellen und aufnehmen', () => {
    expect(press(d('pot', 'water'), { kind: 'bin' })).toEqual({ do: 'scrape', dish: d('pot') });
    expect(kitchenPrompt(press(d('pot', 'water'), { kind: 'bin' }), 'Mülleimer')).toBe(
      'Topf abräumen',
    );
    // Auf jeder Fläche abstellbar …
    expect(press(d('pot', 'water'), { kind: 'top', on: null })).toEqual({
      do: 'place',
      dish: d('pot', 'water'),
    });
    // … und mitsamt Wasser wieder aufnehmbar.
    expect(press(null, { kind: 'top', on: d('pot', 'water') })).toEqual({
      do: 'take',
      dish: d('pot', 'water'),
    });
    expect(kitchenPrompt(press(null, { kind: 'top', on: d('pot', 'water') }), 'Zeile')).toBe(
      'Topf (Wasser) nehmen',
    );
  });

  /**
   * **Und nirgends sonst fällt der volle Topf durch.**
   *
   * Das ist die Gegenprobe zu der Entscheidung, Wasser als Inhalt zu führen
   * (`kitchenRecipes.Dish`): Ein Träger mit Inhalt kommt an vielen Stellen
   * vorbei, und an keiner davon darf aus dem Wasser plötzlich eine Zutat, ein
   * Gericht oder ein Stück Geschirr werden.
   */
  it('lässt den vollen Topf nirgends durch, wo er nicht hingehört', () => {
    // Nicht über die Theke — es ist kein Burger und liegt auf keinem Teller.
    expect(press(d('pot', 'water'), { kind: 'serve' }).do).toBe('refuse');
    // Nicht auf das Abtropfbrett, nicht an die Rückgabe, nicht in die
    // Löscherhalterung.
    for (const kind of ['drain', 'return', 'rack'] as const) {
      expect(press(d('pot', 'water'), { kind, stack: 0, on: null }).do).toBe('refuse');
    }
    // Und das Wasser wandert auf kein Brötchen und auf keinen Teller: Es steht
    // in keiner Zeile von `TAKES`, also nimmt es niemand an.
    for (const carrier of ['bun', 'plate', 'pan'] as const) {
      expect(press(d('pot', 'water'), { kind: 'top', on: d(carrier) }).do).toBe('refuse');
    }
  });

  /**
   * **Die Rückgabe ist ein Stapel** — dort türmt sich, was die Gäste
   * zurückgeben, und wer spülen geht, holt sich einen Teller nach dem anderen.
   */
  it('nimmt von der Rückgabe, solange dort etwas liegt', () => {
    expect(press(null, { kind: 'return', stack: 3 })).toEqual({
      do: 'take',
      dish: d('plate-dirty'),
    });
    expect(press(null, { kind: 'return', stack: 1 })).toEqual({
      do: 'take',
      dish: d('plate-dirty'),
    });
    // Ein leerer Stapel ist kein Möbel, das sich meldet.
    expect(press(null, { kind: 'return', stack: 0 })).toEqual({ do: 'nothing' });
    expect(press(null, { kind: 'return' })).toEqual({ do: 'nothing' });
  });

  it('stellt dreckiges Geschirr auf die Rückgabe und sonst nichts', () => {
    expect(press(d('plate-dirty'), { kind: 'return', stack: 2 })).toEqual({
      do: 'place',
      dish: d('plate-dirty'),
    });
    // Auch auf die leere Rückgabe — sie füllt sich ja von dort her.
    expect(press(d('plate-dirty'), { kind: 'return', stack: 0 })).toEqual({
      do: 'place',
      dish: d('plate-dirty'),
    });
    for (const held of [d('plate'), d('bun'), d('pan'), d('plate', 'bun', 'patty-cooked')]) {
      const deed = press(held, { kind: 'return', stack: 1 });
      expect(deed.do).toBe('refuse');
      expect(why(deed)).toContain('dreckiges Geschirr');
    }
  });

  /**
   * **Das Abtropfbrett ist die Rückgabe für saubere Teller**, und es ist das
   * zweite Stück der geteilten Spüle (`core/kitchenFit.ts`, `sink-drain`).
   *
   * Der Spieltest hat es verlangt — „Man kann saubere Teller (bis zu 4) auf dem
   * Abtropf-Element sammeln" —, und es macht aus dem Abwasch einen Vorrat: Wer
   * fünf Teller am Stück spült, stellt sie daneben ab, statt jeden einzeln quer
   * durch die Küche zu tragen.
   */
  it('sammelt bis zu vier saubere Teller auf dem Abtropfbrett', () => {
    expect(press(d('plate'), { kind: 'drain', stack: 0 })).toEqual({
      do: 'place',
      dish: d('plate'),
    });
    expect(press(d('plate'), { kind: 'drain', stack: CLEAN_STACK_MAX - 1 })).toEqual({
      do: 'place',
      dish: d('plate'),
    });
    // Der fünfte nicht mehr — und wer davorsteht, liest, warum.
    const full = press(d('plate'), { kind: 'drain', stack: CLEAN_STACK_MAX });
    expect(full.do).toBe('refuse');
    expect(why(full)).toContain('4');
    expect(CLEAN_STACK_MAX).toBe(4);
  });

  it('gibt vom Abtropfbrett den obersten Teller her', () => {
    expect(press(null, { kind: 'drain', stack: 4 })).toEqual({ do: 'take', dish: d('plate') });
    expect(press(null, { kind: 'drain', stack: 1 })).toEqual({ do: 'take', dish: d('plate') });
    // Ein leeres Brett meldet sich nicht — wie eine leere Rückgabe.
    expect(press(null, { kind: 'drain', stack: 0 })).toEqual({ do: 'nothing' });
    expect(press(null, { kind: 'drain' })).toEqual({ do: 'nothing' });
  });

  it('lässt auf das Abtropfbrett nur leere saubere Teller', () => {
    for (const held of [d('plate-dirty'), d('bun'), d('pan'), d('plate', 'bun')]) {
      const deed = press(held, { kind: 'drain', stack: 1 });
      expect({ item: held.item, do: deed.do }).toEqual({ item: held.item, do: 'refuse' });
      expect(why(deed)).toContain('saubere Teller');
    }
  });

  it('sagt am Abtropfbrett an, was gleich passiert', () => {
    expect(kitchenPrompt(press(d('plate'), { kind: 'drain' }), 'Abtropfbrett')).toBe(
      'Teller auf Abtropfbrett legen',
    );
    expect(kitchenPrompt(press(null, { kind: 'drain', stack: 2 }), 'Abtropfbrett')).toBe(
      'Teller nehmen',
    );
  });

  /**
   * **Gästetisch und Förderband sind Flächen.** Was den einen zum Gästetisch
   * macht, ist der Kunde daran, und was das andere zum Band macht, ist seine
   * Bewegung — beides Sache der Zone. Für `A` ist es beides eine Ablage.
   */
  it('räumt den Gästetisch ab und legt auf das Band', () => {
    expect(press(null, { kind: 'table', on: d('plate-dirty') })).toEqual({
      do: 'take',
      dish: d('plate-dirty'),
    });
    expect(press(null, { kind: 'table', on: null })).toEqual({ do: 'nothing' });
    expect(press(d('plate', 'bun', 'patty-cooked'), { kind: 'table', on: null })).toEqual({
      do: 'place',
      dish: d('plate', 'bun', 'patty-cooked'),
    });
    expect(press(d('bun'), { kind: 'belt', on: null })).toEqual({ do: 'place', dish: d('bun') });
    expect(press(d('patty-cooked'), { kind: 'belt', on: d('bun') })).toEqual({
      do: 'combine',
      held: null,
      target: d('bun', 'patty-cooked'),
      moved: ['patty-cooked'],
    });
  });

  it('sagt an der Spüle und an der Rückgabe an, was gleich passiert', () => {
    expect(kitchenPrompt(press(d('plate-dirty'), { kind: 'sink' }), 'Spüle')).toBe(
      'Geschirr spülen',
    );
    expect(kitchenPrompt(press(null, { kind: 'return', stack: 2 }), 'Rückgabe')).toBe(
      'Dreckiger Teller nehmen',
    );
    expect(kitchenPrompt(press(d('plate-dirty'), { kind: 'return' }), 'Rückgabe')).toBe(
      'Dreckiger Teller auf Rückgabe legen',
    );
    // Und stumm ist, was nichts zu tun gibt.
    expect(kitchenPrompt(press(null, { kind: 'sink' }), 'Spüle')).toBe('');
    expect(kitchenPrompt(press(null, { kind: 'return', stack: 0 }), 'Rückgabe')).toBe('');
  });

  /**
   * **Einmal ganz herum** — vom fertigen Burger bis zum sauberen Teller auf
   * dem Abtropfbrett, ohne einen Handgriff dazwischen auszulassen.
   *
   * Der Weg ist der Grund, warum es die Spüle gibt, und er muss **in einem
   * Stück** durchspielbar bleiben: Gast, Rückgabe oder Tisch, Becken, Hand,
   * Abtropfbrett. Bricht er in der Mitte, steht die Küche nach zehn Gästen
   * still, und man merkt es erst im Headset.
   */
  it('führt den Teller vom Gast zurück in die Küche', () => {
    const served = press(d('plate', 'bun', 'patty-cooked'), { kind: 'serve' });
    expect(served.do).toBe('serve');
    expect(served.do === 'serve' && served.held).toBeNull();
    // Der Gast lässt ihn dreckig zurück, man holt ihn und stellt ihn in die
    // Spüle — dort wird er mit derselben Uhr sauber wie der Salat am Brett.
    const back = press(null, { kind: 'table', on: d('plate-dirty') });
    expect(back).toEqual({ do: 'take', dish: d('plate-dirty') });
    expect(press(d('plate-dirty'), { kind: 'sink' })).toEqual({
      do: 'work',
      kind: 'wash',
      dish: d('plate-dirty'),
    });
    // Die Hand ist dabei leer — der Teller steht ja im Wasser —, also endet
    // die Uhr mit dem sauberen Teller darin (`kitchenWork.WORK_TO_HAND`).
    const washed = advanceWork(onWork('wash', 'plate-dirty'), WORK_SECONDS.wash, true, true);
    expect(washed.done).toBe('plate');
    expect(washed.toHand).toBe(true);
    // Und aus der Hand geht er auf das Abtropfbrett, wo er auf die nächste
    // Bestellung wartet.
    expect(press(d(washed.done ?? 'plate'), { kind: 'drain', stack: 1 })).toEqual({
      do: 'place',
      dish: d('plate'),
    });
  });
});

/**
 * **Woran der gelbe Saum hängt** (`meansContent`).
 *
 * Die Frage stammt aus dem Spiel und nicht aus dem Quelltext: Liegt ein Teller
 * auf dem Tisch, leuchtete bisher der **Tisch** — und man nimmt doch den
 * Teller. Der Saum beantwortet vorab „was passiert, wenn ich jetzt drücke",
 * und darauf gibt es genau zwei Antworten: das Möbel oder das, was darauf
 * liegt.
 */
describe('was eine Tat meint', () => {
  it('meint das Liegende, wenn es in die Hand geht', () => {
    // Leere Hand vor einem Tisch mit Teller: Man nimmt den Teller.
    expect(meansContent(press(null, { kind: 'top', on: d('plate') }))).toBe(true);
    // Und auch vom Herd nimmt man die Pfanne und nicht den Herd.
    expect(meansContent(press(null, { kind: 'stove', on: d('pan', 'patty') }))).toBe(true);
    // Zusammenlegen fasst ebenfalls das an, was dort liegt — in beide
    // Richtungen (`kitchenRecipes.combine`).
    expect(meansContent(press(d('patty-cooked'), { kind: 'top', on: d('bun') }))).toBe(true);
    expect(meansContent(press(d('plate'), { kind: 'top', on: d('bun', 'patty-cooked') }))).toBe(
      true,
    );
  });

  it('meint das Möbel, wenn dort etwas hingeht oder etwas anfängt', () => {
    // Ablegen zielt auf die Fläche.
    expect(meansContent(press(d('plate'), { kind: 'top' }))).toBe(false);
    // Schneiden und Spülen fangen an der Station an.
    expect(meansContent(press(d('lettuce'), { kind: 'board' }))).toBe(false);
    expect(meansContent(press(d('plate-dirty'), { kind: 'sink' }))).toBe(false);
    // Mülleimer, Ausgabetheke und brennender Herd sind selbst das Ziel.
    expect(meansContent(press(d('bun'), { kind: 'bin' }))).toBe(false);
    expect(meansContent(press(d('plate', 'bun', 'patty-cooked'), { kind: 'bin' }))).toBe(false);
    expect(meansContent(press(d('plate', 'bun', 'patty-cooked'), { kind: 'serve' }))).toBe(false);
    expect(
      meansContent(press(d('extinguisher'), { kind: 'stove', on: d('pan'), fire: true })),
    ).toBe(false);
  });

  it('macht aus einem abgelehnten oder leeren Griff nichts zum Leuchten', () => {
    // `refuse` und `nothing` melden sich gar nicht erst als Inhalt an — die
    // Zone leuchtet dann das Möbel an, das den Satz trägt.
    expect(meansContent(press(d('bun'), { kind: 'rack' }))).toBe(false);
    expect(meansContent(press(null, { kind: 'top' }))).toBe(false);
  });
});

/**
 * **Gegriffen oder gedrückt** (`kitchenInteraction`, `core/interaction.ts`).
 *
 * Dieselbe Trennung wie darüber, aber die andere Frage: nicht *welches Netz
 * ist gemeint*, sondern *was will es*. Von oben ändert das nichts — `A` bleibt
 * `A` —, aus den Augen und in der Brille hängt daran, ob man klickt oder die
 * Greif-Taste hält.
 */
describe('wie eine Tat bedient werden will', () => {
  it('greift alles, was danach in der Hand liegt', () => {
    // Das Brötchen aus der Ausgabe.
    expect(kitchenInteraction(press(null, { kind: 'box', gives: 'bun' }))).toBe('grab');
    // Die Pfanne vom Herd und der Topf von der Fläche.
    expect(kitchenInteraction(press(null, { kind: 'stove', on: d('pan') }))).toBe('grab');
    expect(kitchenInteraction(press(null, { kind: 'top', on: d('pot') }))).toBe('grab');
    // Der Feuerlöscher aus seiner Halterung und der dreckige Teller vom Stapel.
    expect(kitchenInteraction(press(null, { kind: 'rack', on: d('extinguisher') }))).toBe('grab');
    expect(kitchenInteraction(press(null, { kind: 'return', stack: 3 }))).toBe('grab');
  });

  it('drückt alles, was an der Station passiert', () => {
    expect(kitchenInteraction(press(d('plate'), { kind: 'top' }))).toBe('press');
    expect(kitchenInteraction(press(d('lettuce'), { kind: 'board' }))).toBe('press');
    expect(kitchenInteraction(press(d('plate-dirty'), { kind: 'sink' }))).toBe('press');
    expect(kitchenInteraction(press(d('bun'), { kind: 'bin' }))).toBe('press');
    expect(kitchenInteraction(press(d('plate', 'bun', 'patty-cooked'), { kind: 'serve' }))).toBe(
      'press',
    );
    expect(
      kitchenInteraction(press(d('extinguisher'), { kind: 'stove', on: d('pan'), fire: true })),
    ).toBe('press');
  });

  /**
   * **Auflegen ist kein Griff**, obwohl der Saum dabei am Liegenden hängt
   * (`meansContent`). Wer ein gebratenes Patty aufs Brötchen legt, greift
   * nicht danach — er legt es hin.
   */
  it('drückt auch dort, wo der Saum am Liegenden hängt', () => {
    const deed = press(d('patty-cooked'), { kind: 'top', on: d('bun') });
    expect(meansContent(deed)).toBe(true);
    expect(kitchenInteraction(deed)).toBe('press');
  });

  it('lässt eine abgelehnte Tat trotzdem ein Drücken sein', () => {
    // `refuse` hat einen Satz zu sagen, und den sagt es auf denselben Druck.
    expect(kitchenInteraction(press(d('bun'), { kind: 'rack' }))).toBe('press');
  });

  it('bietet nichts an, wo es nichts zu tun gibt', () => {
    expect(kitchenInteraction(press(null, { kind: 'top' }))).toBe('none');
    expect(kitchenInteraction(null)).toBe('none');
  });
});
