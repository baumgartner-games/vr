/**
 * **Was aus dem Regal ein funktionierendes Küchenmöbel ist** — die Brücke
 * zwischen dem gekauften Katalog und dem Katalog der Küche. Reine
 * Zeichenkettenarbeit, ohne three.js und ohne Zone.
 *
 * Ein Modell aus dem KayKit-Regal ist ein **Bild**: Es bekommt eine Hülle als
 * Collider und eine Masse, und damit ist es ein Fass, durch das man nicht
 * hindurchgeht (`worlds/portal/props.modelPropShape`). Ein Möbel der Küche ist
 * dagegen eine **Regel**: Eine Vorratskiste gibt Brötchen heraus, ein Herd
 * brät, ein Becken spült, und wer etwas darauf abstellt, bekommt es dort
 * wieder (`worlds/test/zones/kitchen.ts`).
 *
 * Genau dieser Unterschied wurde gemeldet: „die platzierten Elemente sollen
 * dann auch funktionsfähig sein wenn ich z. B. Crate Vorratskiste mit
 * Brötchen hinstelle oder Herd, Waschbecken etc." Er war bis eben unsichtbar,
 * denn **beide zeigen dasselbe Netz**: Die Möbel der Küche stehen auf Netzen
 * aus `restaurant-bits` (`core/dinerFit.ts`, `core/kitchenFit.KitchenPiece.base`),
 * und dieselben Dateien liegen einzeln im Regal. Wer die Brötchenkiste aus
 * dem Regal nahm, bekam also die Kiste, die in der Küche Brötchen ausgibt —
 * nur eben als Fass.
 *
 * Die Tabelle unten schließt die Lücke: Steht die Figur in der Küche und
 * nimmt eine dieser Adressen aus dem Regal, entsteht statt des Fasses das
 * **Möbel aus dem Küchenkatalog**, mit allem, was daran hängt
 * (`KitchenZone.takeShelfPiece` → `takeFromCatalogue`). Überall sonst bleibt
 * es ein Fass, und das ist richtig: Eine Vorratskiste auf einer Wiese hat
 * niemanden, dem sie etwas ausgeben könnte.
 *
 * ## Warum eine Tabelle und keine Rechnung
 *
 * Aus dem Katalog der Küche ließe sich die Zuordnung fast ableiten — jedes
 * Möbel nennt den Knoten, auf dem es steht. Fast: Vier Vorratskisten, die
 * Tellerkiste und die Ausgabe stehen **alle** auf `crate_lid`, und drei
 * Möbel teilen sich `kitchencounter_straight_A`. Eine Rechnung müsste raten,
 * welches davon gemeint ist; dreizehn Zeilen muss man lesen. Der Test daneben
 * hält sie ehrlich: Jeder Name muss ein Möbel sein, das es wirklich gibt,
 * und jede Adresse eine Datei, die wirklich im Regal liegt.
 */

/** Das Paket, aus dem die Küche ihre Netze bezieht (`core/dinerFit.ts`). */
const PACK = 'restaurant-bits';

/**
 * **Welche Adresse welches Küchenmöbel ist.**
 *
 * Aufgenommen ist, was in der Küche wirklich etwas **tut** oder eine Ablage
 * ist — und zwar jeweils das Möbel, das man an diesem Netz erkennt:
 *
 * - Die vier **Vorratskisten** an ihrem Inhalt. `crate_steak` heißt in der
 *   Quelle so und liegt voll mit dem rohen Patty dieser Küche; ein Rezept für
 *   Steaks gibt es hier nicht (siehe `kitchenFit.SUPPLY_CRATES`).
 * - Die **geschlossene Kiste** ist die Ausgabe — dasselbe Möbel, dieselbe
 *   Kiste mit Deckel.
 * - Die **Spüle** ist das Becken, auf dem auch das Leck sitzt; das
 *   **Abtropfbrett** erkennt man an seinem Gitter und nicht an der Zeile
 *   darunter.
 * - Der **Herd** kommt dreifach: leer, mit Topf, mit Pfanne. Wer den Topf
 *   hinstellen will, nimmt den Topf.
 *
 * **Nicht aufgenommen** ist alles, was in der Küche nur Kulisse wäre: die
 * Eckstücke der Zeile, die zwanzig Tischvarianten, die Backöfen. Sie bleiben
 * Fässer und stehen damit genau so herum, wie man sie hinstellt — das ist
 * kein Mangel, sondern der Normalfall des Regals.
 */
export const KITCHEN_SHELF: Readonly<Record<string, string>> = {
  [`${PACK}/crate_buns.glb`]: 'crate-buns',
  [`${PACK}/crate_steak.glb`]: 'crate-patty',
  [`${PACK}/crate_lettuce.glb`]: 'crate-lettuce',
  [`${PACK}/crate_tomatoes.glb`]: 'crate-tomatoes',
  [`${PACK}/crate.glb`]: 'serve-counter',
  [`${PACK}/kitchencounter_sink.glb`]: 'sink-basin',
  [`${PACK}/kitchencounter_straight_A.glb`]: 'counter',
  [`${PACK}/kitchentable_A.glb`]: 'table',
  [`${PACK}/cuttingboard.glb`]: 'board',
  [`${PACK}/dishrack.glb`]: 'sink-drain',
  [`${PACK}/stove_single.glb`]: 'stove',
  [`${PACK}/pot_A.glb`]: 'stove-pot',
  [`${PACK}/pan_A.glb`]: 'stove-pan',
};

/**
 * **Das Küchenmöbel zu einer Regaladresse**, oder `null` — und `null` ist die
 * Antwort für alles außer dreizehn Dateien.
 */
export function kitchenPieceForModel(path: string): string | null {
  return KITCHEN_SHELF[path] ?? null;
}
