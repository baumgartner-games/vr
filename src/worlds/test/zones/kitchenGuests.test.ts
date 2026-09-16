import {
  CLEAR_TABLE,
  EAT_SECONDS,
  RETURN_STACK_MAX,
  advanceTable,
  cleared,
  eatProgress,
  freeTable,
  seat,
  tableFree,
} from './kitchenGuests';

/**
 * **Die Gäste, nachgerechnet** (`kitchenGuests.ts`).
 *
 * Der Fehler, den diese Datei fernhält, ist derselbe wie beim Herd: eine Uhr,
 * die den Rest einer Phase wegwirft. Ein Gast, der bei 60 Bildern je Sekunde
 * anders lange isst als bei 30, ist ein Gast, dessen Tisch bei schlechter
 * Bildrate nie frei wird.
 */

describe('ein Tisch, an dem gegessen wird', () => {
  test('ein freier Tisch ist frei, ein besetzter nicht', () => {
    expect(tableFree(CLEAR_TABLE)).toBe(true);
    expect(tableFree(seat())).toBe(false);
    expect(tableFree({ left: 0, dirty: true })).toBe(false);
  });

  test('aufgegessen wird genau einmal, und danach steht Geschirr da', () => {
    let state = seat();
    let finished = false;
    for (let i = 0; i < 200; i++) {
      const tick = advanceTable(state, 0.1);
      state = tick.state;
      if (tick.finished) {
        // Genau einmal, nicht bei jedem weiteren Bild noch einmal.
        expect(finished).toBe(false);
        finished = true;
      }
    }
    expect(finished).toBe(true);
    expect(state).toEqual({ left: 0, dirty: true });
  });

  test('ein einziger großer Schritt kommt genauso an wie tausend kleine', () => {
    const big = advanceTable(seat(), 100);
    expect(big.finished).toBe(true);
    expect(big.state).toEqual({ left: 0, dirty: true });
  });

  test('ein Bild kürzer als die Mahlzeit lässt den Rest stehen', () => {
    const tick = advanceTable(seat(), 1);
    expect(tick.finished).toBe(false);
    expect(tick.state.left).toBeCloseTo(EAT_SECONDS - 1, 6);
  });

  test('ein leerer Tisch tickt nicht — und gibt sich selbst zurück', () => {
    const tick = advanceTable(CLEAR_TABLE, 5);
    expect(tick.finished).toBe(false);
    // Identität, damit die Zone einen Vergleich ohne Rechnung machen kann.
    expect(tick.state).toBe(CLEAR_TABLE);
  });

  test('das Geschirr bleibt liegen, bis es jemand holt', () => {
    let state = advanceTable(seat(), 100).state;
    state = advanceTable(state, 100).state;
    expect(state.dirty).toBe(true);
    expect(cleared(state)).toBe(CLEAR_TABLE);
    // Ein sauberer Tisch ändert sich beim Abräumen nicht.
    expect(cleared(CLEAR_TABLE)).toBe(CLEAR_TABLE);
  });
});

describe('welcher Tisch das nächste Gericht bekommt', () => {
  test('der erste freie', () => {
    expect(freeTable([seat(), CLEAR_TABLE, CLEAR_TABLE])).toBe(1);
    expect(freeTable([CLEAR_TABLE, CLEAR_TABLE])).toBe(0);
  });

  test('keiner frei heißt: nichts frei', () => {
    expect(freeTable([seat(), { left: 0, dirty: true }])).toBe(-1);
    expect(freeTable([])).toBe(-1);
  });
});

describe('der Balken über dem Tisch', () => {
  test('läuft von leer nach voll', () => {
    expect(eatProgress(CLEAR_TABLE)).toBe(0);
    expect(eatProgress(seat())).toBeCloseTo(0, 6);
    expect(eatProgress({ left: EAT_SECONDS / 2, dirty: false })).toBeCloseTo(0.5, 6);
    // Steht das Geschirr da, gibt es nichts mehr zu messen.
    expect(eatProgress({ left: 0, dirty: true })).toBe(0);
  });
});

describe('der Stapel an der Rückgabe', () => {
  test('hat eine Grenze, und die ist eine Entscheidung', () => {
    expect(RETURN_STACK_MAX).toBeGreaterThan(1);
    expect(RETURN_STACK_MAX).toBeLessThanOrEqual(8);
  });
});
