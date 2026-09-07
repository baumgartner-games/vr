import { DOOR_MATERIALS, afterHit, breakTime, breakable, doorSpec, fullHealth } from './navDoor';

/**
 * **Die Tabelle, an der hängt, ob ein Zombie vor einer Hütte steht.**
 *
 * Vier Zeilen Test für vier Zahlen — und jede davon ist eine, die man beim
 * Ausprobieren in der Brille nicht auseinanderhalten kann: Eine Tür, die nach
 * zwanzig Sekunden fällt, sieht aus wie eine, die gar nicht fällt.
 */
describe('Woraus eine Tür ist', () => {
  it('kennt Holz und Metall und macht aus allem anderen Holz', () => {
    expect(doorSpec('wood').id).toBe('wood');
    expect(doorSpec('metal').id).toBe('metal');
    // Eine Id aus einer alten Karte oder aus dem Netz darf keine Tür ergeben,
    // die niemand mehr aufbekommt.
    expect(doorSpec('bronze').id).toBe('wood');
    expect(doorSpec(undefined).id).toBe('wood');
  });

  it('lässt genau eine Sorte kaputtgehen', () => {
    expect(breakable('wood')).toBe(true);
    expect(breakable('metal')).toBe(false);
    expect(fullHealth('metal')).toBe(Infinity);
    // Und die, die kaputtgehen kann, hat auch wirklich etwas zu verlieren.
    expect(fullHealth('wood')).toBeGreaterThan(0);
  });

  it('nimmt Leben ab, aber nie unter null — und der Metalltür gar nichts', () => {
    expect(afterHit(80, 30)).toBe(50);
    expect(afterHit(20, 30)).toBe(0);
    // Ein negativer Schlag ist ein Rechenfehler und keine Reparatur.
    expect(afterHit(80, -30)).toBe(80);
    expect(afterHit(Infinity, 1e9)).toBe(Infinity);
  });

  it('braucht für Holz ein paar Sekunden und für Metall ewig', () => {
    // Die Zahl, die man in der Brille wirklich sieht: Wie lange steht er da?
    // Zwischen einer und sechs Sekunden ist es ein Ereignis; darüber ein
    // Hänger, darunter ein Zucken.
    expect(breakTime('wood')).toBeGreaterThan(1);
    expect(breakTime('wood')).toBeLessThan(6);
    expect(breakTime('metal')).toBe(Infinity);
  });

  it('gibt jeder Sorte einen Namen und eine eigene Farbe', () => {
    const colors = new Set(DOOR_MATERIALS.map((one) => one.color));
    expect(colors.size).toBe(DOOR_MATERIALS.length);
    for (const one of DOOR_MATERIALS) expect(one.label.length).toBeGreaterThan(0);
  });
});
