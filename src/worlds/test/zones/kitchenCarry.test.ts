import {
  CLEAN_STACK_MAX,
  EXTINGUISHER_REST,
  ITEM_LABELS,
  STATION_WORK,
  WORK_ALONE,
  WORK_SECONDS,
  advanceWork,
  carrySlot,
  dish,
  extinguisherRests,
  handsOver,
  keptOnFold,
  kitchenDeed,
  kitchenInteraction,
  kitchenPrompt,
  meansContent,
  onWork,
  otherHand,
  type CarrySide,
  type Dish,
  type HandoverAsk,
  type KitchenDeed,
  type KitchenItem,
  type Station,
  type StationKind,
  type WorkKind,
} from './kitchenCarry';

/** Die Tabelle als Paare — einmal getippt, dreimal gelesen. */
const STATION_WORKS = Object.entries(STATION_WORK) as [StationKind, WorkKind | null][];

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

  /**
   * **Die Vorratskiste** gibt aus und nimmt zurück — und sonst nichts. Sie ist
   * offen und bis oben voll; was jemand darauf legte, balancierte auf einem
   * Haufen Tomaten.
   */
  it('gibt aus der Vorratskiste aus und nimmt ihre eigene Zutat zurück', () => {
    const crate: Station = { kind: 'crate', gives: 'tomato' };
    expect(press(null, crate)).toEqual({ do: 'take', dish: d('tomato') });
    // Wer sie doch nicht braucht, hält sie an die Kiste und ist sie los.
    expect(press(d('tomato'), crate)).toEqual({ do: 'stow', dish: d('tomato') });
    // Geschnitten gehört sie nicht mehr dorthin — sonst wäre der Schnitt weg.
    expect(press(d('tomato-cut'), crate).do).toBe('refuse');
    // Und auf der Kiste wird nichts abgestellt.
    const laid = press(d('pot'), crate);
    expect(laid.do).toBe('refuse');
    expect(why(laid)).toContain('Vorratskiste');
  });

  /**
   * **Die Tellerkiste richtet an** — der gemeldete Fehler, als Regel
   * geschrieben.
   *
   * Wer den fertigen Burger in der Hand hat und vor den Tellervorrat tritt,
   * will ihn **auf einen Teller** und nicht lesen, dass hier nichts abgestellt
   * wird. Abgestellt wird dabei auch nichts: Der Teller kommt aus der Kiste,
   * das Gericht geht darauf, und beides zusammen liegt danach in der Hand.
   * Dasselbe von der anderen Seite ist die Brötchenkiste mit dem gebratenen
   * Patty in der Hand.
   */
  it('nimmt an der Vorratskiste den Teller unter das Gericht', () => {
    expect(press(d('bun', 'patty-cooked'), { kind: 'crate', gives: 'plate' })).toEqual({
      do: 'combine',
      held: d('plate', 'bun', 'patty-cooked'),
      target: null,
      moved: ['bun', 'patty-cooked'],
    });
    // Und die einzelne Zutat genauso — ein Teller mit Salat darauf.
    expect(press(d('lettuce-cut'), { kind: 'crate', gives: 'plate' })).toEqual({
      do: 'combine',
      held: d('plate', 'lettuce-cut'),
      target: null,
      moved: ['lettuce-cut'],
    });
    // Andersherum: das gebratene Patty an der Brötchenkiste.
    expect(press(d('patty-cooked'), { kind: 'crate', gives: 'bun' })).toEqual({
      do: 'combine',
      held: d('bun', 'patty-cooked'),
      target: null,
      moved: ['patty-cooked'],
    });
    // **Was zwei Hände bräuchte, geht nicht**: Die Pfanne gäbe ihr Patty auf
    // das Brötchen ab — und das Brötchen hinge in der Luft, denn die Kiste hat
    // keine Fläche, auf der es liegen bliebe.
    const both = press(d('pan', 'patty-cooked'), { kind: 'crate', gives: 'bun' });
    expect(both.do).toBe('refuse');
    expect(why(both)).toContain('Vorratskiste');
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

  // Der Feuerlöscher fehlt in dieser Liste, und zwar seit er den Knopf für
  // sich beansprucht: Am Mülleimer sagt die Regel mit ihm in der Hand gar
  // nichts mehr (`EXTINGUISHER_REST`, eigener Block weiter unten) — statt
  // eines Satzes, den niemand mehr zu lesen bekäme.
  it('nimmt Gerät und leeren Teller nicht in den Müll', () => {
    for (const item of ['pot', 'pan', 'plate', 'plate-dirty'] as const) {
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
   * **Ein brennender Herd ist keine Fläche mehr.** Solange es brennt, nimmt er
   * nichts an — und wer ohne Feuerlöscher davorsteht, liest, was er braucht.
   *
   * **Mit Löscher in der Hand sagt er gar nichts**, und das ist der Umbau vom
   * September 2026: Hier stand einmal `do: 'douse'`, ein Druck, und das Feuer
   * war aus. Heute gehört derselbe Druck dem Löscher (`EXTINGUISHER_REST`,
   * eigener Block weiter unten), und gelöscht wird mit dem Strahl.
   */
  it('lässt einen brennenden Herd niemanden mehr bedienen', () => {
    const fire: Station = { kind: 'stove', on: d('pan', 'patty-burnt'), fire: true };
    expect(press(d('extinguisher'), fire)).toEqual({ do: 'nothing' });
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
    expect(kitchenPrompt(press(d('pliers'), { kind: 'sink', leaking: true }), 'Spüle')).toBe(
      'Leck abdichten',
    );
    // Und mit dem Löscher in der Hand steht über dem brennenden Herd gar
    // nichts mehr: Der Knopf gehört dem Löscher (`EXTINGUISHER_REST`).
    expect(kitchenPrompt(press(d('extinguisher'), { kind: 'stove', fire: true }), 'Herd')).toBe('');
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
   * **Ein spritzendes Becken ist keine Spüle mehr** (`kitchenLeak.ts`) — Wort
   * für Wort dieselbe Regel wie am brennenden Herd, und sie ist im Headset
   * genauso teuer nachzustellen: Knopf drücken, Zange holen, hinlaufen.
   */
  it('nimmt nichts mehr an, solange es spritzt — außer der Zange', () => {
    const broken = { kind: 'sink', on: null, leaking: true } as const;
    expect(press(d('pliers'), broken)).toEqual({ do: 'repair' });
    // Ohne Zange steht im Satz, was fehlt — und nicht, dass hier nichts geht.
    expect(why(press(d('plate-dirty'), broken))).toContain('Wasserpumpenzange');
    expect(why(press(null, broken))).toContain('Wasserpumpenzange');
    // Auch der Topf wird nicht mehr gefüllt: Der Hahn läuft ja daneben.
    expect(why(press(d('pot'), broken))).toContain('Wasserpumpenzange');
    // Und was im Becken stand, bleibt darin stehen, bis es dicht ist.
    expect(why(press(null, { kind: 'sink', on: d('plate'), leaking: true }))).toContain('spritzt');
  });

  /**
   * **Und mit der Zange an einem heilen Becken gibt es nichts zu tun.** Der
   * Satz ist die Auskunft, die man in dem Augenblick braucht: nicht „hier
   * gehört nur Geschirr hinein" (richtig und am Thema vorbei), sondern dass
   * nichts kaputt ist.
   */
  it('sagt an der heilen Spüle, dass nichts undicht ist', () => {
    expect(why(press(d('pliers'), { kind: 'sink', on: null }))).toContain('undicht');
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
    // Ohne den Feuerlöscher: Mit ihm in der Hand sagt die Spüle gar nichts
    // mehr, weil der Knopf ihm gehört (`EXTINGUISHER_REST`).
    for (const item of ['bun', 'pan', 'lettuce'] as const) {
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

  it('lässt in das Abtropfgitter nur leere Teller', () => {
    for (const held of [d('pan'), d('plate', 'bun'), d('plate-dirty', 'bun')]) {
      const deed = press(held, { kind: 'drain', stack: 1, stacked: 'plate' });
      expect({ item: held.item, do: deed.do }).toEqual({ item: held.item, do: 'refuse' });
      expect(why(deed)).toContain('leere Teller');
    }
    // Und die Zutat, wenn im Gitter **dreckige** Teller stehen: Auf die legt
    // man nichts, und hineingestellt wird sie auch nicht.
    const dirty = press(d('bun'), { kind: 'drain', stack: 1, stacked: 'plate-dirty' });
    expect(dirty.do).toBe('refuse');
    expect(why(dirty)).toContain('leere Teller');
  });

  /**
   * **Das Gitter richtet an** — derselbe Handgriff wie an der Tellerkiste
   * (`fromCrate`), nur aus einem Stapel.
   *
   * Wer den fertigen Burger trägt und vor vier gespülten Tellern steht, will
   * ihn anrichten und nicht erst einen Teller nehmen, ihn irgendwo abstellen,
   * den Burger wieder aufnehmen und zurücklaufen. Der Teller verlässt dabei
   * den Stapel — die Zone zählt mit (`kitchen.merge`).
   */
  it('nimmt aus dem Gitter den Teller unter das Gericht', () => {
    expect(press(d('bun', 'patty-cooked'), { kind: 'drain', stack: 4, stacked: 'plate' })).toEqual({
      do: 'combine',
      held: d('plate', 'bun', 'patty-cooked'),
      target: null,
      moved: ['bun', 'patty-cooked'],
    });
    expect(press(d('tomato-cut'), { kind: 'drain', stack: 1, stacked: 'plate' })).toEqual({
      do: 'combine',
      held: d('plate', 'tomato-cut'),
      target: null,
      moved: ['tomato-cut'],
    });
    // **Ein leeres Gitter hat nichts herzugeben**: Dort wird abgelegt, und
    // eine Zutat ist kein leerer Teller.
    const empty = press(d('bun'), { kind: 'drain', stack: 0 });
    expect(empty.do).toBe('refuse');
    expect(why(empty)).toContain('leere Teller');
  });

  /**
   * **In ein leeres Gitter darf beides, in ein belegtes nur noch dasselbe.**
   *
   * Das ist die eine Regel, die ein Abtropfgitter von einem Stapel
   * unterscheidet: Es steht für **einen** Zustand — vier, die abtropfen, oder
   * vier, die auf den Abwasch warten. Ein gespülter Teller zwischen drei
   * schmutzigen ist der, den gleich jemand auf die Theke stellt.
   */
  it('nimmt in ein leeres Gitter beide Sorten und danach nur noch dieselbe', () => {
    for (const first of ['plate', 'plate-dirty'] as const) {
      expect(press(d(first), { kind: 'drain', stack: 0 })).toEqual({
        do: 'place',
        dish: d(first),
      });
    }
    const other = { plate: 'plate-dirty', 'plate-dirty': 'plate' } as const;
    for (const stacked of ['plate', 'plate-dirty'] as const) {
      expect(press(d(stacked), { kind: 'drain', stack: 2, stacked })).toEqual({
        do: 'place',
        dish: d(stacked),
      });
      const mixed = press(d(other[stacked]), { kind: 'drain', stack: 2, stacked });
      expect({ stacked, do: mixed.do }).toEqual({ stacked, do: 'refuse' });
      expect(why(mixed)).toContain(stacked === 'plate' ? 'saubere' : 'dreckige');
    }
  });

  /** Und herausgegeben wird, was darinsteht — nicht immer der saubere. */
  it('gibt aus dem Gitter die Sorte her, die darinsteht', () => {
    expect(press(null, { kind: 'drain', stack: 3, stacked: 'plate-dirty' })).toEqual({
      do: 'take',
      dish: d('plate-dirty'),
    });
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
    // Und am spritzenden Becken sagt er, was die Zange gleich tut.
    expect(kitchenPrompt(press(d('pliers'), { kind: 'sink', leaking: true }), 'Spülbecken')).toBe(
      'Leck abdichten',
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
    // Mülleimer, Ausgabetheke und spritzendes Becken sind selbst das Ziel.
    expect(meansContent(press(d('bun'), { kind: 'bin' }))).toBe(false);
    expect(meansContent(press(d('plate', 'bun', 'patty-cooked'), { kind: 'bin' }))).toBe(false);
    expect(meansContent(press(d('plate', 'bun', 'patty-cooked'), { kind: 'serve' }))).toBe(false);
    expect(meansContent(press(d('pliers'), { kind: 'sink', leaking: true }))).toBe(false);
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
    expect(kitchenInteraction(press(d('pliers'), { kind: 'sink', leaking: true }))).toBe('press');
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

/**
 * **Welche Station arbeitet** (`STATION_WORK`) — die Tabelle, die es gibt,
 * weil eine `if`-Kette sie einmal nicht vollständig nachgezählt hat.
 *
 * Der Fehler war im Spiel zu sehen und in keinem Test: Die sichere Kochstelle
 * stand im Grundriss, `A` legte das Patty darauf, und die Zone ließ keine Uhr
 * an — ihre Aufzählung kannte Brett, Spüle und Mixer und nicht das vierte
 * Möbel. Seitdem ist die Zuordnung **eine** Tabelle, die beide Seiten lesen,
 * und hier steht, was in ihr stehen muss.
 */
describe('welche Station arbeitet', () => {
  it('kennt jede Stationsart, und keine zweimal anders', () => {
    // Vollständig ist sie schon durch ihren Typ (`Record<StationKind, …>`);
    // hier steht, **was** darin steht — vier, die arbeiten, der Rest `null`.
    const works = STATION_WORKS.filter(([, work]) => work !== null).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    expect(works).toEqual([
      ['board', 'chop'],
      ['griddle', 'fry'],
      ['mixer', 'blend'],
      ['sink', 'wash'],
    ]);
  });

  it('sagt dasselbe wie `A` vor dem Möbel', () => {
    // **Die Gegenprobe zur Tabelle**: Wer mit einem rohen Patty vor einem
    // Arbeitsmöbel steht, das es annimmt, fängt mit genau der Art an, die hier
    // steht — ohne zweiten Druck.
    for (const [kind, work] of STATION_WORKS) {
      if (kind === 'sink') continue; // Die Spüle nimmt Geschirr, kein Patty.
      const deed = kitchenDeed(dish('patty'), { kind });
      const started = deed.do === 'work' ? deed.kind : null;
      expect({ kind, started }).toEqual({ kind, started: work === 'fry' ? 'fry' : null });
    }
  });

  it('lässt genau die beiden ohne Zuschauer laufen', () => {
    // Und die zweite Tabelle daneben sagt, welche der vier weiterläuft, wenn
    // niemand davorsteht (`kitchenWork.WORK_ALONE`) — Mixer und Kochstelle.
    const alone = STATION_WORKS.filter(([, work]) => work !== null && WORK_ALONE[work])
      .map(([kind]) => kind)
      .sort();
    expect(alone).toEqual(['griddle', 'mixer']);
  });
});

/**
 * **Der Feuerlöscher hat den Knopf** (`EXTINGUISHER_REST`).
 *
 * Der Auftrag, Satz für Satz: _„Wenn ich mit anderen Dingen als einer
 * Arbeitsplatte interagieren will, wird stattdessen einfach der Feuerlöscher
 * aktiviert. So ist es gut, wenn ich ein Feuer einer Herdplatte löschen will.
 * Wenn ich nochmal interagiere, wird der Feuerlöscher deaktiviert. Nur mit
 * einer Arbeitsplatte wird er dann wieder abgelegt."_
 *
 * Die beiden mittleren Sätze sind der **Schalter** und stehen nebenan
 * (`kitchenSpray.sprayOn`, dort geprüft); hier steht der erste und der letzte
 * — dass eine Station dem Knopf aus dem Weg geht, solange er dem Löscher
 * gehört, und dass die Fläche es nicht tut.
 */
describe('was der Feuerlöscher in der Hand bedeutet', () => {
  /** Alle Arten, so wie der Typ sie aufzählt. */
  const KINDS = Object.keys(EXTINGUISHER_REST) as StationKind[];

  it('legt ihn auf Arbeitsplatte, Kiste, Halterung und Band — und sonst nirgends', () => {
    const rests = KINDS.filter((kind) => EXTINGUISHER_REST[kind] === 'always').sort();
    expect(rests).toEqual(['belt', 'box', 'rack', 'top']);
    // Und genau eine Art fragt nach dem Stand statt nach der Art: die
    // Herdplatte (`extinguisherRests`, eigener Block weiter unten).
    expect(KINDS.filter((kind) => EXTINGUISHER_REST[kind] === 'free')).toEqual(['stove']);
  });

  it('lässt jede andere Station stumm', () => {
    // `nothing` und nicht `refuse`: Eine Station, die sich gar nicht erst
    // anmeldet, nimmt dem Löscher den Knopf nicht weg
    // (`kitchen.refreshStations`, `PlayerRig.useCandidate`).
    for (const kind of KINDS) {
      if (EXTINGUISHER_REST[kind] !== 'never') continue;
      const deed = press(d('extinguisher'), { kind, gives: 'bun', stack: 2, fire: true });
      expect({ kind, do: deed.do }).toEqual({ kind, do: 'nothing' });
    }
  });

  it('legt ihn auf der Arbeitsplatte trotzdem ab', () => {
    expect(press(d('extinguisher'), { kind: 'top', on: null })).toEqual({
      do: 'place',
      dish: d('extinguisher'),
    });
    // Die Kiste ist „zugleich Arbeitsplatte" (`StationKind`) …
    expect(press(d('extinguisher'), { kind: 'box', gives: 'bun', on: null })).toEqual({
      do: 'place',
      dish: d('extinguisher'),
    });
    // … und die Halterung ist die Fläche, auf die er gehört.
    expect(press(d('extinguisher'), { kind: 'rack', on: null })).toEqual({
      do: 'place',
      dish: d('extinguisher'),
    });
  });

  it('nimmt der leeren Hand nichts weg', () => {
    // Die Regel fragt nach dem, was in der Hand liegt, und nach nichts sonst:
    // Ohne Löscher ist der brennende Herd weiter der brennende Herd, und aus
    // der Halterung nimmt man ihn heraus wie eh und je.
    const fire: Station = { kind: 'stove', on: d('pan'), fire: true };
    expect(press(null, fire).do).toBe('refuse');
    expect(press(d('pan'), fire).do).toBe('refuse');
    expect(press(null, { kind: 'rack', on: d('extinguisher') })).toEqual({
      do: 'take',
      dish: d('extinguisher'),
    });
  });
});

/**
 * **Die Herdplatte: leer eine Fläche, belegt der Knopf des Löschers**
 * (`extinguisherRests`).
 *
 * Der gemeldete Wunsch, in zwei Sätzen: _„Auf eine leere Herdplatte soll ich
 * den Feuerlöscher abstellen dürfen wie auf jede andere Fläche. Steht etwas
 * darauf, will ich mit demselben Knopf löschen und nicht ablegen."_ Beides
 * hängt an **einer** Zeile Regel, und deshalb gilt es in allen drei Ansichten:
 * Die Brille fragt sie über `kitchen.refreshStations` genauso wie `A` von
 * oben und `E` am Schirm — keine der drei hat eine eigene.
 */
describe('der Feuerlöscher an der Herdplatte', () => {
  it('stellt ihn auf die leere Platte', () => {
    expect(extinguisherRests({ kind: 'stove', on: null })).toBe(true);
    expect(press(d('extinguisher'), { kind: 'stove', on: null })).toEqual({
      do: 'place',
      dish: d('extinguisher'),
    });
  });

  it('gibt den Knopf an der belegten Platte dem Löscher', () => {
    // Die Pfanne steht darauf — ob sie brät oder nicht, ist einerlei: Eine
    // belegte Platte ist keine Ablage, und `nothing` heißt, dass sie sich gar
    // nicht erst anmeldet (`kitchen.refreshStations`).
    const pan: Station = { kind: 'stove', on: d('pan') };
    expect(extinguisherRests(pan)).toBe(false);
    expect(press(d('extinguisher'), pan)).toEqual({ do: 'nothing' });
    // Und mit Patty darin genauso — gefragt wird nach dem Stand der Platte
    // und nicht nach dem, was in der Pfanne liegt.
    expect(press(d('extinguisher'), { kind: 'stove', on: d('pan', 'patty') })).toEqual({
      do: 'nothing',
    });
  });

  it('gibt ihn der brennenden Platte erst recht nicht zurück', () => {
    // Der Fall, für den es den Löscher gibt: Es brennt, und derselbe Druck
    // macht ihn an, statt ihn in die Flammen zu stellen.
    const fire: Station = { kind: 'stove', on: d('pan'), fire: true };
    expect(extinguisherRests(fire)).toBe(false);
    expect(press(d('extinguisher'), fire)).toEqual({ do: 'nothing' });
    // Auch ohne Pfanne, obwohl es das heute nicht gibt: Das Feuer steht
    // ausdrücklich in der Regel und nicht nur mittelbar über die Pfanne.
    expect(extinguisherRests({ kind: 'stove', on: null, fire: true })).toBe(false);
  });

  it('lässt den Hinweis über der Platte stumm, solange er ihn hält', () => {
    // `nothing` hat keinen Satz, und das ist der Unterschied zu `refuse`: kein
    // Saum, kein Wort, kein zweiter Sinn auf demselben Knopf.
    expect(kitchenPrompt(press(d('extinguisher'), { kind: 'stove', on: d('pan') }), 'Herd')).toBe(
      '',
    );
    // Auf der leeren Platte steht dagegen, was gleich passiert.
    expect(kitchenPrompt(press(d('extinguisher'), { kind: 'stove', on: null }), 'Herd')).toBe(
      'Feuerlöscher auf Herd legen',
    );
  });

  it('ändert für alle anderen Hände nichts am Herd', () => {
    // Die Regel fragt nach dem, was in der Hand liegt: Ohne Löscher ist die
    // leere Platte weiter die Fläche, auf die die Pfanne gehört.
    expect(press(d('pan'), { kind: 'stove', on: null })).toEqual({
      do: 'place',
      dish: d('pan'),
    });
    expect(press(null, { kind: 'stove', on: d('pan') })).toEqual({
      do: 'take',
      dish: d('pan'),
    });
  });
});

/**
 * **Der Feuerlöscher darf auf das Förderband** (`EXTINGUISHER_REST`, `belt`).
 *
 * Er durfte es nicht, und das war kein Entschluss, sondern die Vorsicht der
 * ersten Fassung: Sie zählte drei Arbeitsplatten auf und ließ alles andere
 * stumm. Für `A` ist ein Band aber eine Ablage wie die Zeile (`kitchenDeed`
 * stellt beide in dieselbe Zeile), und was darauf liegt, fährt weiter —
 * **ohne** dass die Bandrechnung ihn kennen müsste (`kitchenBelt.ts` fragt
 * nach der Station und nicht nach dem Ding).
 */
describe('der Feuerlöscher auf dem Förderband', () => {
  it('legt ihn auf das leere Band', () => {
    expect(extinguisherRests({ kind: 'belt', on: null })).toBe(true);
    expect(press(d('extinguisher'), { kind: 'belt', on: null })).toEqual({
      do: 'place',
      dish: d('extinguisher'),
    });
    expect(kitchenPrompt(press(d('extinguisher'), { kind: 'belt' }), 'Förderband')).toBe(
      'Feuerlöscher auf Förderband legen',
    );
  });

  it('holt ihn vom Band auch wieder herunter', () => {
    expect(press(null, { kind: 'belt', on: d('extinguisher') })).toEqual({
      do: 'take',
      dish: d('extinguisher'),
    });
  });

  it('legt ihn nicht auf ein belegtes Band', () => {
    // Dieselbe Antwort wie auf der belegten Arbeitsplatte: Zusammenlegen geht
    // nicht, und warum, sagt der Satz (`kitchenRecipes.combine`).
    const deed = press(d('extinguisher'), { kind: 'belt', on: d('plate') });
    expect(deed.do).toBe('refuse');
    expect(why(deed)).toContain('Feuerlöscher');
  });
});

/**
 * **Die Fächer** — welche Hand welches Ding meint, je nachdem, ob der Schalter
 * _zwei Gegenstände_ liegt (`core/grabSettings.GrabSettings.twoHands`).
 *
 * Das ist die Messlatte dieses Auftrags, und sie steht hier als Regel: **Ohne
 * den Schalter muss sich die Küche Zeile für Zeile verhalten wie vorher.** Ein
 * Fach, zwei Hände, dieselbe Antwort — alles andere wäre ein Umbau, der
 * nebenbei etwas kaputt macht, das nie zur Debatte stand.
 */
describe('ein Fach oder zwei', () => {
  it('gibt ohne den Schalter jeder Seite dasselbe Fach', () => {
    // Links, rechts, ohne Hand — dreimal dieselbe Antwort, und es ist die, die
    // die Küche immer hatte: Was die Figur trägt, trägt die Figur.
    expect(carrySlot('left', false, 'right')).toBe('body');
    expect(carrySlot('right', false, 'right')).toBe('body');
    expect(carrySlot('body', false, 'left')).toBe('body');
  });

  it('gibt mit dem Schalter jeder Hand ihr eigenes Fach', () => {
    expect(carrySlot('left', true, 'right')).toBe('left');
    expect(carrySlot('right', true, 'left')).toBe('right');
  });

  /**
   * **Ohne Hand gefragt gilt die zuletzt tätige.** Den Fall gibt es auch in der
   * Brille: Der fertig gespülte Teller kommt aus einer Uhr in die Hand
   * (`kitchenWork.WORK_TO_HAND`) und nicht aus einem Griff. Ein drittes Fach
   * vor dem Bauch wäre ein drittes getragenes Ding — und genau das soll dieser
   * Schalter nicht hergeben.
   */
  it('schickt eine handlose Frage an die zuletzt tätige Hand', () => {
    expect(carrySlot('body', true, 'left')).toBe('left');
    expect(carrySlot('body', true, 'right')).toBe('right');
  });

  it('kennt die andere Hand', () => {
    expect(otherHand('left')).toBe('right');
    expect(otherHand('right')).toBe('left');
  });
});

/**
 * **Beim Abschalten bleibt genau eines übrig.**
 *
 * Wer den Schalter umlegt, während beide Hände voll sind, hätte sonst ein
 * zweites Ding an einer Hand, nach der niemand mehr fragt: Danach gibt jede
 * Seite dasselbe Fach zurück, und das andere wäre unerreichbar.
 */
describe('was beim Abschalten in der Hand bleibt', () => {
  it('behält das der zuletzt tätigen Hand', () => {
    expect(keptOnFold(['left', 'right'], 'right')).toBe('right');
    expect(keptOnFold(['left', 'right'], 'left')).toBe('left');
  });

  it('behält das einzige, auch wenn es an der anderen Hand hängt', () => {
    expect(keptOnFold(['left'], 'right')).toBe('left');
    // Und was schon vor dem Bauch hing, hängt weiter dort.
    expect(keptOnFold(['body'], 'right')).toBe('body');
  });

  it('gibt nichts zurück, wenn die Hände leer sind', () => {
    expect(keptOnFold([], 'left')).toBeNull();
  });

  /** Es bleibt **eines** — nie zwei, in keiner Aufstellung. */
  it('lässt in keinem Fall zwei übrig', () => {
    const cases: readonly CarrySide[][] = [[], ['body'], ['left'], ['right'], ['left', 'right']];
    for (const sides of cases) {
      const kept = keptOnFold(sides, 'right');
      expect(sides.filter((side) => side === kept)).toHaveLength(sides.length === 0 ? 0 : 1);
    }
  });
});

/**
 * **Die Übergabe von Hand zu Hand** — dieselbe Geste wie beim Werkzeug
 * (`PortalWorld.handoverTool`): Hände zusammen, greifen, fertig.
 *
 * Fünf Bedingungen, und jede einzelne verhindert für sich einen Fehler, den
 * man sonst erst mit aufgesetzter Brille findet.
 */
describe('von einer Hand in die andere', () => {
  /** Alles erfüllt — von hier aus wird jede Bedingung einzeln weggenommen. */
  const ready: HandoverAsk = {
    presenting: true,
    pressed: true,
    empty: true,
    holding: true,
    together: true,
  };

  it('übergibt, wenn alles zusammenkommt', () => {
    expect(handsOver(ready)).toBe(true);
  });

  /** **Nur in der Brille**: Von oben und am Schreibtisch gibt es keine zweite Hand. */
  it('übergibt nicht außerhalb der Brille', () => {
    expect(handsOver({ ...ready, presenting: false })).toBe(false);
  });

  /**
   * **Auf der Flanke und nicht, solange die Taste liegt.** Ohne diese
   * Bedingung wanderte die Pfanne Bild für Bild hin und her, solange jemand
   * die Hände beieinander hält und greift.
   */
  it('übergibt nur auf den neuen Druck der Greif-Taste', () => {
    expect(handsOver({ ...ready, pressed: false })).toBe(false);
  });

  it('legt nichts in eine Hand, die schon etwas hält', () => {
    expect(handsOver({ ...ready, empty: false })).toBe(false);
  });

  it('übergibt nichts, wenn die andere Hand leer ist', () => {
    expect(handsOver({ ...ready, holding: false })).toBe(false);
  });

  /**
   * **Und die Hände müssen wirklich beieinander sein** (`grabReach.atHandGrip`,
   * 16 cm zwischen den Griffpunkten). Sonst nähme die leere Hand der anderen
   * quer durch die Küche etwas ab, sobald sie greift.
   */
  it('übergibt nicht über die Reichweite hinaus', () => {
    expect(handsOver({ ...ready, together: false })).toBe(false);
  });
});
