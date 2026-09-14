import type { GridPlan } from '../grid/gridPlan';

/**
 * **Das Podest und die Treppen der Straßenküche — gehört P7.**
 *
 * Noch leer, und das mit Absicht: Der Aufruf steht schon in `streetPlan.ts`,
 * damit P7 genau diese Datei anfasst.
 *
 * Was hierher gehört (aus `docs/plan-2d-hub-interaktion.md`, P7): das Podest
 * im Nordwesten auf **Ebene 1** (`platform` oder `room` auf `levels: [0, 1]`),
 * `plan.stairs(...)` hinauf, oben ein Hebel, der unten die Lampe schaltet, und
 * eine Brüstung am Rand (`parapet`).
 *
 * **Frei dafür** sind die sechs Kacheln `P` in den Zeilen 1 und 2, Spalten 1
 * bis 3, und die Kachel `^` daneben (Zeile 1, Spalte 4) — alles in `MAP` in
 * `streetPlan.ts`. Die zweite Etage steht dort schon bereit: `LEVELS` hat
 * `[0, STOREY]`, Ebene 1 ist leer und wartet. Wer sie füllt, denkt an das
 * Loch über dem Treppenlauf — `GridPlan.stairs()` macht alle drei Sachen auf
 * einmal (Baustein, Loch, Weg im Graphen).
 */
export function stampStairs(_plan: GridPlan): void {
  // P7 schreibt hier.
}
