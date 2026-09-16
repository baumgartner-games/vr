import { DUST_GAP, DUST_JUMP, dustDue } from './dustTrail';

/**
 * **Wann gestaubt wird, nachgerechnet** (`worlds/shared/dustTrail.ts`).
 *
 * Zwei Fehler sind es, die man im Bild erst sieht, wenn sie schon stören: die
 * stehende Figur, unter der es weiterstaubt, und die Staubwolke quer über die
 * Welt, nachdem jemand durch ein Portal gegangen ist. Beide sind hier eine
 * Zeile.
 */

describe('wie viele Wölkchen ein Weg auslöst', () => {
  test('wer steht, staubt nicht', () => {
    expect(dustDue(0, 0)).toEqual({ puffs: 0, rest: 0 });
    // Und der Restweg von vorhin bleibt liegen, statt sich zu verlieren.
    expect(dustDue(0.3, 0)).toEqual({ puffs: 0, rest: 0.3 });
  });

  test('ein Schritt ist ein Wölkchen', () => {
    const due = dustDue(0, DUST_GAP);
    expect(due.puffs).toBe(1);
    expect(due.rest).toBeCloseTo(0, 6);
  });

  test('der Rest zählt über die Bilder hinweg weiter', () => {
    // Zweimal ein Drittel Abstand ergibt noch nichts …
    const first = dustDue(0, DUST_GAP / 3);
    expect(first.puffs).toBe(0);
    const second = dustDue(first.rest, DUST_GAP / 3);
    expect(second.puffs).toBe(0);
    // … beim dritten Mal ist der Schritt voll.
    const third = dustDue(second.rest, DUST_GAP / 3);
    expect(third.puffs).toBe(1);
    expect(third.rest).toBeCloseTo(0, 6);
  });

  test('ein langer Weg in einem Bild ergibt mehrere', () => {
    const due = dustDue(0, DUST_GAP * 2);
    expect(due.puffs).toBe(2);
  });

  test('ein Sprung ist kein Laufen', () => {
    // Durch ein Portal, über das Sprungmenü, nach einer Rettung: Wer in einem
    // Bild weiter kommt als `DUST_JUMP`, ist versetzt worden — und eine Spur
    // entlang einer Strecke, die niemand gelaufen ist, wäre eine Lüge.
    expect(dustDue(0, DUST_JUMP + 0.01)).toEqual({ puffs: 0, rest: 0 });
    expect(dustDue(0.4, 20)).toEqual({ puffs: 0, rest: 0 });
  });

  test('krumme Zahlen bringen die Rechnung nicht durcheinander', () => {
    expect(dustDue(0, Number.NaN)).toEqual({ puffs: 0, rest: 0 });
    expect(dustDue(Number.NaN, 0.2).puffs).toBe(0);
    expect(dustDue(0, -3)).toEqual({ puffs: 0, rest: 0 });
  });
});
