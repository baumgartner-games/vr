import * as THREE from 'three';
import {
  COMBINER_HEIGHT,
  COMBINE_SECONDS,
  CombinerKit,
  IDLE_COMBINE,
  advanceCombine,
  combineProgress,
  combinerHolds,
  combinerTakes,
} from './kitchenCombiner';
import { kitchenPiece } from '../../../core/kitchenFit';
import { dish, type Combined } from './kitchenRecipes';

/**
 * **Was der Kombinierer verspricht** (`kitchenCombiner.ts`).
 *
 * Drei Versprechen, und jedes ist eines, das man im Headset erst nach zehn
 * Minuten Zusehen bemerkt:
 *
 * - **Er legt auf das, was auf ihm liegt** — und nie andersherum. Ein Möbel,
 *   das den fertigen Burger auf der Zulieferkachel ablegte, ließe die halbe
 *   Bahn rückwärts laufen (`kitchenRecipes.stackOn`).
 * - **Ein angefangener Handgriff gehört einer Kachel.** Wird dort etwas
 *   weggenommen oder wechselt der Zulieferer, fängt er von vorn an, statt
 *   etwas aufzulegen, das er nie geholt hat.
 * - **Und er braucht genau so lange wie ein Band über eine Kachel.** Die zwei
 *   Sekunden **sind** die Fahrt; wäre er schneller, baute man Kombinierer
 *   statt Bänder.
 *
 * Dazu die Zusage, ohne die dieses Modul in keinem Testlauf vorkäme: Der
 * Bausatz lässt sich **ohne `document` und ohne WebGL** bauen und wieder
 * wegräumen — er ist aus Quadern, Ringen und nichts sonst.
 */

/** Ein bestandener Handgriff, kurz geschrieben. */
function ok(result: Combined | null): result is Extract<Combined, { ok: true }> {
  return result !== null && result.ok;
}

describe('combinerTakes — was er sich holen würde', () => {
  it('legt die Zutat auf das, was auf ihm liegt', () => {
    const took = combinerTakes(dish('bun'), dish('patty-cooked'));
    expect(ok(took)).toBe(true);
    if (!ok(took)) return;
    // Die Unterlage bleibt oben liegen und hat das Patty jetzt drauf …
    expect(took.target).toEqual(dish('bun', ['patty-cooked']));
    // … und die Zulieferkachel ist danach leer.
    expect(took.held).toBeNull();
    expect(took.moved).toEqual(['patty-cooked']);
  });

  it('nimmt den Burger auf den Teller, aber nicht den Teller auf den Burger', () => {
    // **Die Richtung ist der ganze Unterschied zu `combine`.** Auf einem
    // Kombinierer mit Teller landet der Burger; auf einem mit Burger landet
    // der Teller nicht — er gehört unter das Essen.
    const onto = combinerTakes(dish('plate'), dish('bun', ['patty-cooked']));
    expect(ok(onto)).toBe(true);
    if (ok(onto)) expect(onto.target).toEqual(dish('plate', ['bun', 'patty-cooked']));

    const wrong = combinerTakes(dish('bun', ['patty-cooked']), dish('plate'));
    expect(wrong?.ok).toBe(false);
    if (wrong && !wrong.ok) expect(wrong.why).toContain('Teller');
  });

  it('lässt die Pfanne stehen und nimmt ihr nur das Patty ab', () => {
    // Der eine Fall, in dem der Zulieferer etwas behält: Man nimmt aus der
    // Pfanne nichts heraus, man kippt sie aus (`kitchenRecipes.offer`).
    const took = combinerTakes(dish('bun'), dish('pan', ['patty-cooked']));
    expect(ok(took)).toBe(true);
    if (!ok(took)) return;
    expect(took.target).toEqual(dish('bun', ['patty-cooked']));
    expect(took.held).toEqual(dish('pan'));
  });

  it('hat ohne Unterlage und ohne Zutat nichts zu tun', () => {
    // **Ein leerer Kombinierer holt sich nichts**: Er ist kein Zugband. Wer
    // weiterreichen will, baut ein Zugband; wer zusammenlegen will, legt ihm
    // die Grundlage hin.
    expect(combinerTakes(null, dish('patty-cooked'))).toBeNull();
    expect(combinerTakes(dish('bun'), null)).toBeNull();
    expect(combinerTakes(null, null)).toBeNull();
  });

  it('sagt, warum nicht — und wirft den Satz nicht weg', () => {
    const raw = combinerTakes(dish('bun'), dish('patty'));
    expect(raw?.ok).toBe(false);
    if (raw && !raw.ok) expect(raw.why).toBe('Rohes Patty muss erst gebraten werden');

    const twice = combinerTakes(dish('bun', ['patty-cooked']), dish('patty-cooked'));
    expect(twice?.ok).toBe(false);
    if (twice && !twice.ok) expect(twice.why).toContain('liegt schon drauf');
  });
});

describe('combinerHolds — was er für sich behält', () => {
  it('hält die nackte Unterlage fest', () => {
    // Der Fehler, gegen den die Regel steht: Ein Zugband nähme das Brötchen
    // mit, bevor das Patty da ist — die Straße liefe, und heraus kämen nackte
    // Brötchen.
    expect(combinerHolds(dish('bun'))).toBe(true);
    expect(combinerHolds(dish('plate'))).toBe(true);
  });

  it('gibt her, was etwas trägt', () => {
    expect(combinerHolds(dish('bun', ['patty-cooked']))).toBe(false);
    expect(combinerHolds(dish('plate', ['bun', 'patty-cooked']))).toBe(false);
  });

  it('hält auf einer leeren Kachel nichts fest', () => {
    expect(combinerHolds(null)).toBe(false);
  });

  it('liest den Unterschied am Ding und nicht an einem Merker', () => {
    // Genau das ist der Punkt: Vorher und nachher ist es **dasselbe** Ding mit
    // einem anderen Stand (`kitchenRecipes.Dish`), und daran hängt die Regel.
    // Ein Gedächtnis am Möbel wäre eines, das der Umbau verlöre.
    const took = combinerTakes(dish('bun'), dish('patty-cooked'));
    expect(ok(took)).toBe(true);
    if (!ok(took)) return;
    expect(combinerHolds(dish('bun'))).toBe(true);
    expect(combinerHolds(took.target)).toBe(false);
  });
});

describe('advanceCombine — die Uhr am Kombinierer', () => {
  const ready = combinerTakes(dish('bun'), dish('patty-cooked'));

  it('fängt an, sobald nebenan etwas Passendes liegt', () => {
    const tick = advanceCombine(IDLE_COMBINE, 0, 'links', ready);
    expect(tick.state.working).toBe(true);
    expect(tick.state.from).toBe('links');
    expect(tick.state.time).toBe(0);
    expect(tick.done).toBeNull();
  });

  it('legt nach genau zwei Sekunden zusammen — in einem Bild wie in hundert', () => {
    let state = advanceCombine(IDLE_COMBINE, 0, 'links', ready).state;
    for (let left = COMBINE_SECONDS; left > 0; left -= COMBINE_SECONDS / 100) {
      const tick = advanceCombine(state, COMBINE_SECONDS / 100, 'links', ready);
      state = tick.state;
      if (tick.done) {
        expect(tick.done.ok).toBe(true);
        // Danach steht die Uhr wieder auf null: Der nächste Handgriff ist ein
        // neuer und bekommt seine ganzen zwei Sekunden.
        expect(state).toEqual(IDLE_COMBINE);
        return;
      }
    }
    throw new Error('nach zwei Sekunden war nichts zusammengelegt');
  });

  it('kommt in einem großen Bild genauso an wie in vielen kleinen', () => {
    const start = advanceCombine(IDLE_COMBINE, 0, 'links', ready).state;
    const jump = advanceCombine(start, COMBINE_SECONDS * 10, 'links', ready);
    expect(jump.done?.ok).toBe(true);
    expect(jump.state).toEqual(IDLE_COMBINE);
  });

  it('bricht ab, sobald nebenan nichts mehr liegt', () => {
    // Dieselbe Entscheidung wie am Schneidebrett: Wer nichts mehr anzubieten
    // hat, hat den Handgriff abgebrochen — ein Fortschritt, der auf die
    // nächste Fuhre wartete, legte etwas auf, das gar nicht mehr dasteht.
    const half = advanceCombine(
      advanceCombine(IDLE_COMBINE, 0, 'links', ready).state,
      COMBINE_SECONDS / 2,
      'links',
      ready,
    );
    expect(combineProgress(half.state)).toBeCloseTo(0.5, 6);
    const gone = advanceCombine(half.state, 1 / 60, null);
    expect(gone.state).toEqual(IDLE_COMBINE);
    expect(gone.done).toBeNull();
  });

  it('fängt von vorn an, wenn die Zulieferkachel wechselt', () => {
    const half = advanceCombine(
      advanceCombine(IDLE_COMBINE, 0, 'links', ready).state,
      COMBINE_SECONDS / 2,
      'links',
      ready,
    );
    const other = advanceCombine(half.state, 1 / 60, 'rechts', ready);
    expect(other.state.from).toBe('rechts');
    expect(other.state.time).toBe(0);
    expect(other.done).toBeNull();
  });

  it('gibt denselben Zustand zurück, solange nichts zu tun ist', () => {
    // Auf Identität und nicht auf Gleichheit: Die Zone vergleicht so, um nicht
    // in jedem Bild eines unbenutzten Möbels etwas anzufassen.
    const tick = advanceCombine(IDLE_COMBINE, 1 / 60, null);
    expect(tick.state).toBe(IDLE_COMBINE);
  });

  it('legt nichts zusammen, wenn die Rechnung abgelehnt hat', () => {
    // Sicherheitsnetz gegen den Fall, den die Zone gar nicht herstellt: Sie
    // reicht `from` nur hinein, wenn `combinerTakes` `ok` gesagt hat.
    const refuse = combinerTakes(dish('bun'), dish('patty'));
    const state = advanceCombine(IDLE_COMBINE, 0, 'links', refuse).state;
    const done = advanceCombine(state, COMBINE_SECONDS, 'links', refuse);
    expect(done.done).toBeNull();
  });

  it('lässt sich von einem `dt` ohne Zahl nicht vergiften', () => {
    const state = advanceCombine(IDLE_COMBINE, 0, 'links', ready).state;
    const sick = advanceCombine(state, Number.NaN, 'links', ready);
    expect(Number.isFinite(sick.state.time)).toBe(true);
    expect(combineProgress(sick.state)).toBe(0);
  });
});

describe('combineProgress — der Balken darüber', () => {
  it('steht auf null, solange nichts läuft', () => {
    expect(combineProgress(IDLE_COMBINE)).toBe(0);
  });

  it('bleibt zwischen null und eins', () => {
    expect(combineProgress({ time: -5, working: true, from: 'a' })).toBe(0);
    expect(combineProgress({ time: COMBINE_SECONDS * 3, working: true, from: 'a' })).toBe(1);
  });
});

describe('CombinerKit — das Möbel', () => {
  it('baut ein Möbel ohne Leinwand und räumt es wieder weg', () => {
    const kit = new CombinerKit();
    const piece = kit.piece();
    expect(piece.name).toBe('kitchen-combiner');
    expect(piece.children.length).toBeGreaterThan(3);
    // Zweimal wegräumen ist kein Fehler — dieselbe Zusage wie beim Bandbausatz.
    kit.dispose();
    kit.dispose();
  });

  it('teilt Formen und Farben zwischen zwei Kombinierern', () => {
    const kit = new CombinerKit();
    const first = kit.piece();
    const second = kit.piece();
    const shapes = (piece: THREE.Object3D): unknown[] => {
      const out: unknown[] = [];
      piece.traverse((node) => {
        if (node instanceof THREE.Mesh) out.push(node.geometry, node.material);
      });
      return out;
    };
    const a = shapes(first);
    const b = shapes(second);
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) expect(a[i]).toBe(b[i]);
    kit.dispose();
  });

  it('steht genau so hoch, wie der Katalog es sagt', () => {
    // Die eine Zahl, die an zwei Stellen stehen muss: Der Katalog beschreibt
    // das Möbel (`core/kitchenFit`), der Bausatz baut es. Weichen sie ab, legt
    // die Küche den Burger in die Luft oder in das Blech.
    expect(COMBINER_HEIGHT).toBe(kitchenPiece('combiner')!.height);
    // Und auf derselben Höhe wie die Bänder, zwischen denen er steht.
    expect(COMBINER_HEIGHT).toBe(kitchenPiece('belt')!.height);
  });

  it('zeigt seinen Pfeil im eigenen Raum nach −z', () => {
    // Dieselbe Zusage wie beim Band: Wer das Möbel dreht, dreht seine Wirkung
    // mit (`kitchenBelt.beltStep`, `beltReach`). Geprüft wird an der Hülle —
    // die Pfeilarme liegen zwischen Ring und hinterer Kante, ihr Schwerpunkt
    // also deutlich bei +z, und ihre Spitze zeigt auf die Mitte.
    const kit = new CombinerKit();
    const piece = kit.piece();
    const arms = piece.children.filter(
      (node) => node instanceof THREE.Mesh && node.position.z > 0.2,
    );
    expect(arms.length).toBeGreaterThanOrEqual(2);
    kit.dispose();
  });
});
