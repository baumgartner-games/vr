import { CUT_HEAD, cutHeight } from './worldCut';

/**
 * Der Schnitt durch eine Welt mit Decke.
 *
 * Geprüft wird die eine Frage, an der er hängt: **Was steht über Kopfhöhe?**
 * Ist es die Hülle, bleibt der Schnitt unten und das Puppenhaus offen; ist es
 * die Welt, geht er hinauf, bis alles darunter passt. Die Zahlen der zweiten
 * Zeile sind die aus dem Spiel: die Kletterhalle, 10 m Decke über 9,4 m hohen
 * Kletterwänden — der Fall, an dem der feste Schnitt auf Kopfhöhe aufflog.
 */
describe('wie hoch eine Welt aufgeschnitten wird', () => {
  it('schneidet auf Kopfhöhe, wenn über Kopfhöhe nur die Hülle steht', () => {
    // Ein Saal mit 4,6 m Wänden, darin Tische und Kisten.
    expect(cutHeight(4.6, [4.6, 4.6, 1.2, 0.9, 2.1])).toBeCloseTo(CUT_HEAD, 6);
  });

  it('lässt eine Halle stehen und nimmt nur ihren Deckel', () => {
    // Kletterhalle: 9,4 m Kletterwand unter einer Decke von 10 m.
    expect(cutHeight(10, [10.3, 2.5, 9.4, 8, 5.55])).toBeCloseTo(9.7, 6);
  });

  it('zählt nicht mit, was bis an die Decke reicht — auch nicht knapp darunter', () => {
    // Eine Wand, die ihre Decke um zehn Zentimeter verfehlt, ist eine Wand.
    expect(cutHeight(6, [6, 5.9, 1.4])).toBeCloseTo(CUT_HEAD, 6);
  });

  it('hebt den Schnitt über das Höchste, was darunter stehen bleiben soll', () => {
    // Eine Galerie auf 3,2 m in einer Halle von 6 m: 3,2 + 0,3.
    expect(cutHeight(6, [6, 3.2, 1.1])).toBeCloseTo(3.5, 6);
  });

  it('bleibt in einem niedrigen Haus unter der Decke statt auf Kopfhöhe', () => {
    // Dunkelhaus: 2,6 m Decke — Kopfhöhe läge darüber, und der Deckel bliebe.
    expect(cutHeight(2.6, [2.6, 1.8])).toBeCloseTo(2.3, 6);
  });

  it('kommt ohne jede Oberkante aus — dann gilt Kopfhöhe', () => {
    expect(cutHeight(4, [])).toBeCloseTo(CUT_HEAD, 6);
  });
});
