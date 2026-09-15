import {
  BURN_SECONDS,
  CHOP_SECONDS,
  COLD_STOVE,
  EMPTY_BOARD,
  FIRE_SECONDS,
  FRY_SECONDS,
  advanceChop,
  advanceStove,
  chopProgress,
  douse,
  onBoard,
  onStove,
  stovePhase,
  stoveProgress,
  type ChopState,
  type StoveState,
} from './kitchenClock';

/** Viele kleine Bilder statt eines großen — so, wie es im Headset läuft. */
function frames(state: StoveState, seconds: number, dt = 1 / 60) {
  let now = state;
  let turned: string | null = null;
  let lit = false;
  for (let t = 0; t < seconds; t += dt) {
    const tick = advanceStove(now, dt);
    now = tick.state;
    turned = tick.turned ?? turned;
    lit = lit || tick.lit;
  }
  return { state: now, turned, lit };
}

/** Dasselbe am Brett, mit der Figur davor oder eben nicht. */
function chopFrames(state: ChopState, seconds: number, live: boolean, dt = 1 / 60) {
  let now = state;
  let cut: string | null = null;
  for (let t = 0; t < seconds; t += dt) {
    const tick = advanceChop(now, dt, live);
    now = tick.state;
    cut = tick.cut ?? cut;
  }
  return { state: now, cut };
}

/**
 * **Die Uhr am Herd** — die fehleranfälligste Stelle der ganzen Küche.
 *
 * Ein Bild dauert 16 ms, eine Phase vier Sekunden, und wer die Reste am
 * Phasenende wegwirft, dessen Patty verbrennt je nach Bildrate anders. Hier
 * läuft jede Strecke deshalb zweimal: einmal in einem großen Schritt und
 * einmal in sechzig kleinen je Sekunde. Kommt nicht beides Mal dasselbe
 * heraus, hängt die Küche an der Bildrate.
 */
describe('die Uhr am Herd', () => {
  it('steht still, solange nichts in der Pfanne liegt', () => {
    const tick = advanceStove(COLD_STOVE, 100);
    expect(tick.state).toEqual(COLD_STOVE);
    expect(tick.turned).toBeNull();
    expect(stovePhase(COLD_STOVE)).toBe('cold');
    expect(stoveProgress(COLD_STOVE)).toBe(0);
  });

  it('brät das rohe Patty und zeigt dabei, wie weit es ist', () => {
    const start = onStove('patty');
    expect(stovePhase(start)).toBe('frying');
    const half = advanceStove(start, FRY_SECONDS / 2);
    expect(half.turned).toBeNull();
    expect(half.state.patty).toBe('patty');
    expect(stoveProgress(half.state)).toBeCloseTo(0.5);
  });

  it('macht aus roh gebraten, aus gebraten verbrannt und daraus Feuer', () => {
    const fried = advanceStove(onStove('patty'), FRY_SECONDS);
    expect(fried.turned).toBe('patty-cooked');
    expect(stovePhase(fried.state)).toBe('burning');

    const burnt = advanceStove(fried.state, BURN_SECONDS);
    expect(burnt.turned).toBe('patty-burnt');
    expect(burnt.lit).toBe(false);
    expect(stovePhase(burnt.state)).toBe('igniting');

    const fire = advanceStove(burnt.state, FIRE_SECONDS);
    expect(fire.lit).toBe(true);
    expect(fire.state.fire).toBe(true);
    // Das Patty bleibt liegen: Es verschwindet erst beim Löschen — sonst
    // stünde da ein brennender Herd mit leerer Pfanne.
    expect(fire.state.patty).toBe('patty-burnt');
    expect(stovePhase(fire.state)).toBe('fire');
    expect(stoveProgress(fire.state)).toBe(1);
  });

  /**
   * **Der Rest einer Phase läuft in die nächste über.** Ein Bild von 0,3 s bei
   * 3,9 s Bratzeit ist 0,2 s im Verbrennen und nicht bei null — sonst hinge
   * die Bratdauer an der Bildrate.
   */
  it('wirft den Rest eines Bildes nicht weg', () => {
    const over = advanceStove(onStove('patty'), FRY_SECONDS + 1);
    expect(over.state.patty).toBe('patty-cooked');
    expect(over.state.time).toBeCloseTo(1);
  });

  it('kommt mit sechzig kleinen Bildern genauso weit wie mit einem großen', () => {
    const small = frames(onStove('patty'), FRY_SECONDS + BURN_SECONDS + 0.5);
    const big = advanceStove(onStove('patty'), FRY_SECONDS + BURN_SECONDS + 0.5);
    expect(small.state.patty).toBe(big.state.patty);
    expect(small.state.patty).toBe('patty-burnt');
    expect(small.state.time).toBeCloseTo(big.state.time, 1);
    expect(small.lit).toBe(false);
  });

  it('brennt auch dann, wenn das ganze Spiel in einem Schritt vergeht', () => {
    const tick = advanceStove(onStove('patty'), 1000);
    expect(tick.state.fire).toBe(true);
    expect(tick.lit).toBe(true);
    // Und danach passiert nichts mehr von allein — Feuer geht nur mit dem
    // Feuerlöscher aus.
    const later = advanceStove(tick.state, 1000);
    expect(later.state).toEqual(tick.state);
    expect(later.lit).toBe(false);
  });

  it('löscht das Feuer und lässt die Pfanne leer zurück', () => {
    const burning = advanceStove(onStove('patty'), 1000).state;
    expect(douse(burning)).toEqual(COLD_STOVE);
    // Wo nichts brennt, ist auch nichts zu löschen: Ein Löscher, der das
    // halbgebratene Patty verschwinden ließe, wäre eine Falle.
    const frying = onStove('patty');
    expect(douse(frying)).toBe(frying);
  });

  /**
   * **Die Pfanne trägt keine Uhr.** Wer sie mitnimmt, nimmt die Stufe des
   * Pattys mit (die steht im `Dish`), nicht den angefangenen Fortschritt —
   * sonst brennt es in der Hand eines Spielers, der quer durch die Küche
   * läuft.
   */
  it('fängt von vorn an, wenn die Pfanne wieder hingestellt wird', () => {
    const half = advanceStove(onStove('patty'), FRY_SECONDS - 0.5).state;
    expect(stoveProgress(half)).toBeGreaterThan(0.8);
    const again = onStove(half.patty);
    expect(again.time).toBe(0);
    expect(stoveProgress(again)).toBe(0);
    expect(again.patty).toBe('patty');
  });
});

/**
 * **Die Uhr am Brett** — sie läuft nur, solange jemand davorsteht.
 *
 * Kein dreimaliges Drücken mehr: Wer etwas Schneidbares hinlegt, schneidet.
 * Geht er weg, bleibt der Fortschritt stehen, statt zurückzufallen — bei
 * _Overcooked_ ist das Weglaufen eine Entscheidung und keine Strafe.
 */
describe('die Uhr am Brett', () => {
  it('fängt beim Auflegen von selbst an', () => {
    expect(onBoard('lettuce').cutting).toBe(true);
    expect(onBoard('tomato').cutting).toBe(true);
    // Auch die zweite Stufe: Scheiben werden zu Suppe.
    expect(onBoard('tomato-cut').cutting).toBe(true);
    // Und was nicht geschnitten wird, liegt einfach da.
    expect(onBoard('bun').cutting).toBe(false);
    expect(onBoard('patty-cooked').cutting).toBe(false);
    expect(onBoard(null)).toEqual(EMPTY_BOARD);
  });

  it('schneidet in CHOP_SECONDS eine Stufe und dann keine zweite', () => {
    const done = advanceChop(onBoard('lettuce'), CHOP_SECONDS, true);
    expect(done.cut).toBe('lettuce-cut');
    expect(done.state.item).toBe('lettuce-cut');
    expect(done.state.cutting).toBe(false);
    // Ein langes Bild macht daraus keine zwei Stufen — und bei der Tomate
    // gäbe es ja eine zweite.
    const tomato = advanceChop(onBoard('tomato'), 100, true);
    expect(tomato.state.item).toBe('tomato-cut');
    expect(advanceChop(tomato.state, 100, true).cut).toBeNull();
  });

  it('macht aus der Tomate erst Scheiben und dann Suppe', () => {
    const cut = advanceChop(onBoard('tomato'), CHOP_SECONDS, true).state;
    expect(cut.item).toBe('tomato-cut');
    // Dafür muss man sie einmal nehmen und wieder hinlegen.
    const soup = advanceChop(onBoard(cut.item), CHOP_SECONDS, true);
    expect(soup.cut).toBe('tomato-soup');
    expect(advanceChop(onBoard('tomato-soup'), 100, true).cut).toBeNull();
  });

  it('zeigt, wie weit der Schnitt ist', () => {
    const part = advanceChop(onBoard('lettuce'), CHOP_SECONDS / 2, true).state;
    expect(chopProgress(part)).toBeCloseTo(0.5);
    expect(chopProgress(EMPTY_BOARD)).toBe(0);
    expect(chopProgress(onBoard('bun'))).toBe(0);
  });

  /**
   * **Weggehen hält an, kommt aber nicht zurück auf null.** Wer zwischendurch
   * das Brötchen holt, findet den halb geschnittenen Salat so wieder vor, wie
   * er ihn liegen ließ.
   */
  it('hält an, wenn niemand danebensteht, und läuft danach weiter', () => {
    const begun = chopFrames(onBoard('lettuce'), CHOP_SECONDS - 1, true);
    expect(begun.cut).toBeNull();
    const away = chopFrames(begun.state, 10, false);
    expect(away.cut).toBeNull();
    expect(away.state.time).toBeCloseTo(begun.state.time, 5);
    expect(chopProgress(away.state)).toBeCloseTo(chopProgress(begun.state), 5);
    const back = chopFrames(away.state, 1.2, true);
    expect(back.cut).toBe('lettuce-cut');
  });

  it('vergisst den Fortschritt, wenn die Zutat in die Hand geht', () => {
    const begun = advanceChop(onBoard('tomato'), CHOP_SECONDS - 0.5, true).state;
    expect(chopProgress(begun)).toBeGreaterThan(0.8);
    // Die Zone legt dann ein leeres Brett hin — und die Zutat kommt
    // unverändert in die Hand.
    expect(chopProgress(EMPTY_BOARD)).toBe(0);
    expect(chopProgress(onBoard(begun.item))).toBe(0);
    expect(begun.item).toBe('tomato');
  });

  it('schneidet an einem leeren Brett nichts', () => {
    expect(advanceChop(EMPTY_BOARD, 100, true)).toEqual({ state: EMPTY_BOARD, cut: null });
  });
});
