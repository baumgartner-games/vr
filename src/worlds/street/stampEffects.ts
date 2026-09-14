import type { GridPlan } from '../grid/gridPlan';

/**
 * **Die Effektecke der Straßenküche — gehört P7.**
 *
 * Noch leer, und das mit Absicht: Der Aufruf steht schon in `streetPlan.ts`,
 * damit P7 genau diese Datei anfasst.
 *
 * Was hierher gehört (aus `docs/plan-2d-hub-interaktion.md`, P7): im Südosten
 * vier Emitter — Rauch, Feuer, Funken, Wasser — mit je einem Knopf davor, das
 * Effektlabor als Ecke. Die Zahlen dazu kommen aus `effects/effectKinds.ts`
 * und werden importiert, nicht neu erfunden.
 *
 * **Frei dafür** ist die Südostecke: die Zeilen 12 und 13, Spalten 16 bis 22
 * (`MAP` in `streetPlan.ts`) — dort ist nichts als Beton, und vom Startplatz
 * sind es vier Schritte nach Osten.
 */
export function stampEffects(_plan: GridPlan): void {
  // P7 schreibt hier.
}
