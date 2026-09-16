import {
  BURN_SECONDS,
  COLD_STOVE,
  FIRE_SECONDS,
  FRY_SECONDS,
  advanceStove,
  douse,
  onStove,
  stovePhase,
  stoveProgress,
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

/**
 * **Die Uhr am Herd** — die fehleranfälligste Stelle der ganzen Küche.
 *
 * Ein Bild dauert 16 ms, eine Phase vier Sekunden, und wer die Reste am
 * Phasenende wegwirft, dessen Patty verbrennt je nach Bildrate anders. Hier
 * läuft jede Strecke deshalb zweimal: einmal in einem großen Schritt und
 * einmal in sechzig kleinen je Sekunde. Kommt nicht beides Mal dasselbe
 * heraus, hängt die Küche an der Bildrate.
 *
 * **Das Brett steht nicht mehr hier**, sondern in `kitchenWork.test.ts` — es
 * teilt sich die Uhr jetzt mit der Spüle.
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
