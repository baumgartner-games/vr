import {
  FREESTYLE,
  ITEM_LABELS,
  RECIPES,
  carries,
  chopStage,
  combine,
  contentsOf,
  dish,
  dishLabel,
  fryStage,
  isCarrier,
  isFood,
  isRaw,
  layered,
  recipeOf,
  served,
  whyNotServed,
  type Dish,
  type KitchenItem,
} from './kitchenRecipes';

/** Kurz geschrieben: `d('bun', 'patty-cooked')` ist ein belegtes Brötchen. */
function d(item: KitchenItem, ...on: KitchenItem[]): Dish {
  return dish(item, on);
}

/** Beide Richtungen desselben Handgriffs — Hand an Ablage und Ablage an Hand. */
function bothWays(a: Dish, b: Dish) {
  return { there: combine(a, b), back: combine(b, a) };
}

/** Der Satz, mit dem eine Ablehnung begründet wurde. */
function why(result: { ok: boolean } & Record<string, unknown>): string {
  return result.ok ? '' : String(result.why);
}

/**
 * **Woraus ein Burger besteht** — die Rechnung, die in der Küche sonst
 * niemand nachprüft.
 *
 * Im Headset ist ein Rezept vier Wege, zwei Schnitte und vier Sekunden Braten;
 * hier ist es eine Zeile. Das ist der ganze Grund, warum die Rezepte neben der
 * Zone stehen und nicht darin (`kitchenRecipes.ts`).
 */
describe('Zutaten und ihre Stufen', () => {
  it('kennt zu jedem Ding einen Namen', () => {
    const items = Object.keys(ITEM_LABELS) as KitchenItem[];
    for (const item of items) expect(ITEM_LABELS[item].length).toBeGreaterThan(2);
  });

  it('schneidet Salat einmal und die Tomate zweimal', () => {
    expect(chopStage('lettuce')).toBe('lettuce-cut');
    expect(chopStage('lettuce-cut')).toBeNull();
    expect(chopStage('tomato')).toBe('tomato-cut');
    expect(chopStage('tomato-cut')).toBe('tomato-soup');
    expect(chopStage('tomato-soup')).toBeNull();
    expect(chopStage('patty')).toBeNull();
    expect(chopStage('bun')).toBeNull();
  });

  /**
   * **Nach dem verbrannten Patty kommt kein Ding mehr, sondern Feuer** — und
   * Feuer ist ein Zustand des Herdes und nichts, was man in die Hand nähme.
   * Deshalb endet die Kette hier (`kitchenClock.ts`).
   */
  it('brät das Patty in zwei Stufen und dann nicht mehr', () => {
    expect(fryStage('patty')).toBe('patty-cooked');
    expect(fryStage('patty-cooked')).toBe('patty-burnt');
    expect(fryStage('patty-burnt')).toBeNull();
    expect(fryStage('bun')).toBeNull();
    expect(fryStage('lettuce')).toBeNull();
  });

  it('nennt roh, was erst noch durch Herd oder Brett muss', () => {
    for (const item of ['patty', 'lettuce', 'tomato'] as const) {
      expect({ item, raw: isRaw(item) }).toEqual({ item, raw: true });
    }
    for (const item of ['patty-cooked', 'lettuce-cut', 'tomato-cut', 'bun'] as const) {
      expect({ item, raw: isRaw(item) }).toEqual({ item, raw: false });
    }
  });

  /**
   * **Der Topf bleibt draußen.** Ein Mülleimer, der alles schluckt, ist einer,
   * in dem nach zwei Minuten die einzige Pfanne der Küche liegt — und der
   * Teller ist genauso wenig Abfall wie sie.
   */
  it('nennt nur Essen Essen', () => {
    for (const item of ['bun', 'patty', 'patty-burnt', 'tomato-soup'] as const) {
      expect({ item, food: isFood(item) }).toEqual({ item, food: true });
    }
    for (const item of ['pot', 'pan', 'plate', 'extinguisher'] as const) {
      expect({ item, food: isFood(item) }).toEqual({ item, food: false });
    }
  });

  it('schichtet das Brötchen nach unten, egal wie gelegt wurde', () => {
    expect(layered(['tomato-cut', 'bun', 'patty-cooked'])).toEqual([
      'bun',
      'patty-cooked',
      'tomato-cut',
    ]);
  });
});

/**
 * **Wer trägt wen** — die drei Träger und alles, was keiner ist.
 *
 * Hier hängt die halbe Küche daran: Ein Patty, das Salat tragen könnte, wäre
 * ein Burger ohne Brötchen, und eine Pfanne, die zwei Pattys nimmt, wäre ein
 * Herd, an dem man nie warten muss.
 */
describe('Träger', () => {
  it('kennt genau drei Träger', () => {
    for (const item of ['plate', 'bun', 'pan'] as const) {
      expect({ item, carrier: isCarrier(item) }).toEqual({ item, carrier: true });
    }
    for (const item of ['patty-cooked', 'lettuce-cut', 'pot', 'extinguisher'] as const) {
      expect({ item, carrier: isCarrier(item) }).toEqual({ item, carrier: false });
    }
  });

  it('lässt auf den Teller alles Fertige und das Brötchen', () => {
    for (const item of ['bun', 'patty-cooked', 'lettuce-cut', 'tomato-soup'] as const) {
      expect({ item, ok: carries('plate', item) }).toEqual({ item, ok: true });
    }
    expect(carries('plate', 'plate')).toBe(false);
    expect(carries('plate', 'pan')).toBe(false);
  });

  it('lässt auf das Brötchen kein zweites Brötchen', () => {
    expect(carries('bun', 'patty-cooked')).toBe(true);
    expect(carries('bun', 'bun')).toBe(false);
    expect(carries('bun', 'plate')).toBe(false);
  });

  it('nimmt in die Pfanne nur Pattys — in jeder Stufe', () => {
    for (const item of ['patty', 'patty-cooked', 'patty-burnt'] as const) {
      expect({ item, ok: carries('pan', item) }).toEqual({ item, ok: true });
    }
    expect(carries('pan', 'bun')).toBe(false);
    expect(carries('pan', 'lettuce')).toBe(false);
  });

  it('lässt Rohes nur in die Pfanne', () => {
    expect(carries('pan', 'patty')).toBe(true);
    for (const item of ['patty', 'lettuce', 'tomato'] as const) {
      expect({ item, bun: carries('bun', item) }).toEqual({ item, bun: false });
      expect({ item, plate: carries('plate', item) }).toEqual({ item, plate: false });
    }
  });
});

/**
 * **Zusammenlegen, in beide Richtungen** — der Kern der neuen Küche.
 *
 * Die Anrichte ist weg; kombiniert wird überall, und zwar egal, was davon in
 * der Hand liegt. Genau das macht diese Beschreibung nach: Jeder Handgriff
 * steht zweimal da, einmal hin und einmal her, und es muss beide Male
 * dasselbe herauskommen — nur an einer anderen Stelle.
 */
describe('zusammenlegen', () => {
  it('legt die Zutat auf den Träger und den Träger unter die Zutat', () => {
    const { there, back } = bothWays(d('patty-cooked'), d('bun'));
    // Patty in der Hand auf das Brötchen an der Ablage: Die Hand wird leer.
    expect(there).toEqual({
      ok: true,
      held: null,
      target: d('bun', 'patty-cooked'),
      moved: ['patty-cooked'],
    });
    // Brötchen in der Hand an das Patty auf der Ablage: Die Ablage wird leer.
    expect(back).toEqual({
      ok: true,
      held: d('bun', 'patty-cooked'),
      target: null,
      moved: ['patty-cooked'],
    });
  });

  it('nimmt jede fertige Zutat auf das Brötchen', () => {
    for (const item of ['patty-cooked', 'lettuce-cut', 'tomato-cut', 'tomato-soup'] as const) {
      const result = combine(d(item), d('bun'));
      expect({ item, ok: result.ok }).toEqual({ item, ok: true });
    }
  });

  /**
   * **Das Brötchen wandert mitsamt Belag auf den Teller**, und zwar flach: Ein
   * Teller mit Burger trägt `['bun', …]` und kein Brötchen, das seinerseits
   * etwas trägt. Jede Frage danach wäre sonst ein Abstieg statt eines
   * `includes`.
   */
  it('kippt das belegte Brötchen flach auf den Teller', () => {
    const burger = d('bun', 'patty-cooked', 'lettuce-cut');
    const { there, back } = bothWays(burger, d('plate'));
    expect(there).toEqual({
      ok: true,
      held: null,
      target: d('plate', 'bun', 'patty-cooked', 'lettuce-cut'),
      moved: ['bun', 'patty-cooked', 'lettuce-cut'],
    });
    expect(back.ok && back.held).toEqual(d('plate', 'bun', 'patty-cooked', 'lettuce-cut'));
    expect(back.ok && back.target).toBeNull();
  });

  /**
   * **Aus der Pfanne nimmt man nichts heraus — man kippt sie aus.** Sie bleibt
   * dabei stehen, wo sie war: Wer mit der Pfanne zum Brötchen läuft, hat sie
   * danach noch in der Hand; wer das Brötchen zur Pfanne trägt, lässt sie auf
   * dem Herd.
   */
  it('gibt das Patty aus der Pfanne ab und lässt die Pfanne, wo sie ist', () => {
    const pan = d('pan', 'patty-cooked');
    const there = combine(pan, d('bun'));
    expect(there).toEqual({
      ok: true,
      held: d('pan'),
      target: d('bun', 'patty-cooked'),
      moved: ['patty-cooked'],
    });
    const back = combine(d('bun'), pan);
    expect(back).toEqual({
      ok: true,
      held: d('bun', 'patty-cooked'),
      target: d('pan'),
      moved: ['patty-cooked'],
    });
    // Und dasselbe mit dem Teller darunter.
    expect(combine(d('plate'), pan).ok).toBe(true);
  });

  it('legt das rohe Patty in die Pfanne', () => {
    const { there, back } = bothWays(d('patty'), d('pan'));
    expect(there).toEqual({ ok: true, held: null, target: d('pan', 'patty'), moved: ['patty'] });
    expect(back).toEqual({ ok: true, held: d('pan', 'patty'), target: null, moved: ['patty'] });
  });

  it('lässt auch Verbranntes auf den Teller — man soll es wegräumen können', () => {
    const result = combine(d('patty-burnt'), d('plate'));
    expect(result.ok).toBe(true);
    expect(served(d('plate', 'bun', 'patty-cooked', 'patty-burnt'))).toBeNull();
  });
});

/**
 * **Was nicht geht** — und jeder Satz dazu sagt, warum und was stattdessen zu
 * tun ist. Ein Hinweis, der nur _geht nicht_ sagt, ist einer, vor dem man
 * steht und rät.
 */
describe('was nicht zusammengeht', () => {
  it('legt keinen Salat auf ein Patty', () => {
    const { there, back } = bothWays(d('lettuce-cut'), d('patty-cooked'));
    expect(there.ok).toBe(false);
    expect(back.ok).toBe(false);
    // Der Satz nennt den Ausweg: ein Träger darunter.
    expect(why(there)).toContain('Brötchen');
    expect(why(there)).toContain('Teller');
  });

  it('legt keine Tomate auf den Salat', () => {
    const { there, back } = bothWays(d('tomato-cut'), d('lettuce-cut'));
    expect(there.ok).toBe(false);
    expect(back.ok).toBe(false);
    expect(why(back)).toContain('Brötchen');
  });

  it('stapelt keine zwei Teller', () => {
    const { there, back } = bothWays(d('plate'), d('plate', 'bun', 'patty-cooked'));
    expect(there.ok).toBe(false);
    expect(back.ok).toBe(false);
    expect(why(there)).toContain('Teller');
    expect(why(there)).toContain('darauf');
  });

  it('macht aus zwei Brötchen keinen Burger', () => {
    const result = combine(d('bun'), d('bun', 'patty-cooked'));
    expect(result.ok).toBe(false);
    expect(why(result)).toContain('Teller');
  });

  it('legt nichts zweimal auf', () => {
    for (const item of ['patty-cooked', 'tomato-cut'] as const) {
      const result = combine(d(item), d('bun', item));
      expect({ item, ok: result.ok }).toEqual({ item, ok: false });
      expect(why(result)).toContain('schon');
    }
    // Auch über den Teller hinweg: Das Brötchen liegt dort schon.
    expect(combine(d('bun'), d('plate', 'bun', 'patty-cooked')).ok).toBe(false);
  });

  /**
   * **Roh bleibt roh**, und der Satz sagt, was fehlt — braten oder schneiden.
   * In beide Richtungen derselbe Satz: Ob man das Patty zum Brötchen trägt
   * oder umgekehrt, das Problem ist dasselbe.
   */
  it('nimmt nichts Rohes auf einen Träger', () => {
    const fixes: Record<string, string> = {
      patty: 'gebraten',
      lettuce: 'geschnitten',
      tomato: 'geschnitten',
    };
    for (const [raw, fix] of Object.entries(fixes)) {
      for (const carrier of ['bun', 'plate'] as const) {
        const { there, back } = bothWays(d(raw as KitchenItem), d(carrier));
        expect({ raw, carrier, ok: there.ok }).toEqual({ raw, carrier, ok: false });
        expect({ raw, carrier, ok: back.ok }).toEqual({ raw, carrier, ok: false });
        expect(why(there)).toContain(fix);
        expect(why(back)).toContain(fix);
      }
    }
  });

  it('nimmt kein zweites Patty in die Pfanne', () => {
    const result = combine(d('patty'), d('pan', 'patty-cooked'));
    expect(result.ok).toBe(false);
    expect(why(result)).toContain('Pfanne');
    expect(why(result)).toContain('schon');
  });

  it('legt kein Gerät auf das Essen', () => {
    expect(why(combine(d('pot'), d('plate')))).toContain('Topf');
    expect(why(combine(d('extinguisher'), d('bun')))).toContain('Feuerlöscher');
    expect(why(combine(d('bun'), d('pan')))).toContain('Pfanne');
  });

  it('gibt aus einer leeren Pfanne nichts ab', () => {
    const result = combine(d('pan'), d('bun'));
    expect(result.ok).toBe(false);
    expect(why(result)).toContain('Pfanne');
  });
});

/**
 * **Die Rezepte** — und die Ausgabe, die sie erkennt.
 */
describe('Rezepte und Ausgabe', () => {
  it('baut jedes Rezept auf Brötchen und gebratenem Patty auf', () => {
    for (const recipe of RECIPES) {
      expect({ id: recipe.id, bun: recipe.needs.includes('bun') }).toEqual({
        id: recipe.id,
        bun: true,
      });
      expect({ id: recipe.id, patty: recipe.needs.includes('patty-cooked') }).toEqual({
        id: recipe.id,
        patty: true,
      });
    }
  });

  it('erkennt den Stapel unabhängig von der Reihenfolge', () => {
    expect(recipeOf(['bun', 'patty-cooked'])?.id).toBe('hamburger');
    expect(recipeOf(['patty-cooked', 'bun'])?.id).toBe('hamburger');
    expect(recipeOf(['tomato-cut', 'bun', 'patty-cooked', 'lettuce-cut'])?.id).toBe('deluxe');
    expect(recipeOf(['bun', 'patty-cooked', 'tomato-soup'])?.id).toBe('suppe');
    expect(recipeOf(['bun'])).toBeNull();
    expect(recipeOf([])).toBeNull();
  });

  it('zählt den Teller nicht als Zutat', () => {
    expect(contentsOf(d('plate', 'bun', 'patty-cooked'))).toEqual(['bun', 'patty-cooked']);
    expect(contentsOf(d('bun', 'patty-cooked'))).toEqual(['bun', 'patty-cooked']);
    expect(contentsOf(d('pan', 'patty'))).toEqual(['pan', 'patty']);
  });

  /**
   * **Mit und ohne Teller derselbe Burger.** Das ist der Grund, warum der
   * Teller aus `contentsOf` herausfällt: Er ist Geschirr und keine Zutat, und
   * wer ohne Teller serviert, soll nicht abgewiesen werden.
   */
  it('gibt ein Brötchen mit gebratenem Patty aus, mit und ohne Teller', () => {
    expect(served(d('bun', 'patty-cooked'))?.id).toBe('hamburger');
    expect(served(d('plate', 'bun', 'patty-cooked'))?.id).toBe('hamburger');
    expect(served(d('plate', 'bun', 'patty-cooked', 'lettuce-cut', 'tomato-cut'))?.id).toBe(
      'deluxe',
    );
  });

  /**
   * **Extras sind erlaubt**, auch solche, für die es keine Liste gibt: Wer
   * Suppe und Salat auf denselben Burger legt, hat zwei ehrliche
   * Arbeitsschritte getan und bekommt dafür kein „das ist kein Burger".
   */
  it('nimmt auch eine Mischung an, die in keiner Liste steht', () => {
    const mix = d('bun', 'patty-cooked', 'tomato-soup', 'lettuce-cut');
    expect(served(mix)).toBe(FREESTYLE);
    expect(recipeOf(contentsOf(mix))).toBeNull();
  });

  it('gibt nichts Halbes und nichts Verbranntes aus', () => {
    expect(served(d('bun'))).toBeNull();
    expect(served(d('plate'))).toBeNull();
    expect(served(d('bun', 'lettuce-cut'))).toBeNull();
    expect(served(d('pan', 'patty-cooked'))).toBeNull();
    expect(served(d('bun', 'patty-burnt'))).toBeNull();
    expect(served(d('bun', 'patty-cooked', 'patty-burnt'))).toBeNull();
  });

  it('sagt an der Ausgabe, was fehlt', () => {
    expect(whyNotServed(d('bun', 'lettuce-cut'))).toContain('Patty');
    expect(whyNotServed(d('plate', 'patty-cooked'))).toContain('Brötchen');
    expect(whyNotServed(d('bun', 'patty-burnt'))).toContain('Müll');
  });

  it('nennt ein Gericht nach seinem Rezept und ein halbes nach seinem Inhalt', () => {
    expect(dishLabel(d('plate'))).toBe('Teller');
    expect(dishLabel(d('plate', 'bun', 'patty-cooked'))).toBe('Teller mit Hamburger');
    expect(dishLabel(d('pan', 'patty'))).toBe('Pfanne (Rohes Patty)');
    expect(dishLabel(d('bun', 'lettuce-cut'))).toBe('Brötchen (Geschnittener Salat)');
  });
});
