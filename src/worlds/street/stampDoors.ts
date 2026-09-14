import type { GridPlan } from '../grid/gridPlan';

/**
 * **Die Türen, Knöpfe und Platten der Straßenküche — gehört P6.**
 *
 * Noch leer, und das mit Absicht: Der Aufruf steht schon in `streetPlan.ts`,
 * damit P6 genau eine Datei anfasst und nicht die Komponistin. So können P5,
 * P6 und P7 nebeneinander laufen, ohne sich in derselben Zeile zu treffen.
 *
 * Was hierher gehört (aus `docs/plan-2d-hub-interaktion.md`, P6): im Osten
 * eine kurze Wand mit den drei Türen — Schiebe-, Dreh- und Plattentür —, die
 * Auslöser davor, zwei Kisten neben der Platte, und die Lampe über der
 * Kreuzung mit ihrem Kippschalter.
 *
 * **Frei dafür** ist die Ostseite: die Spalten 16 bis 22 zwischen den Zeilen
 * 11 und 14 (`MAP` in `streetPlan.ts`) — dort steht außer der Bank in Zeile 14
 * nichts. Wer dort Wände zieht, prüft danach im Test, dass jede freie Kachel
 * vom Startplatz aus noch erreichbar ist: `streetPlan.test.ts` tut das für
 * alle auf einmal, und eine zugemauerte Ecke fällt dort sofort auf.
 */
export function stampDoors(_plan: GridPlan): void {
  // P6 schreibt hier.
}
