/**
 * **Die nächste Raste** — die eine Regel, nach der in diesem Projekt jede
 * Zahl im Menü weiterspringt.
 *
 * Sie stand siebenmal da, wortgleich, in sieben Einstellungsmodulen: beim
 * Greifen, bei der Physik, bei den NPCs, bei der Drohne, beim Supermanflug,
 * bei der Waffe und bei den Schildern. Sieben Kopien einer Zeile sind
 * unbedenklich, solange niemand sie ändert — und genau eine Zahl darin ist
 * eine, die man irgendwann ändern will.
 *
 * **Das ist das `1e-9`.** Ohne es bleibt eine Zahl, die *genau* auf einer
 * Raste liegt, dort kleben: `step > value` findet dieselbe Raste nicht mehr,
 * aber `0.3 > 0.30000000000000004` ist auch falsch. Ein Menü, in dem eine
 * Zeile manchmal nicht weiterspringt, ist eines, an dem man zweimal drückt
 * und beim dritten Mal aufhört.
 *
 * **Oben geht es wieder von vorn.** Eine Zeile im Handgelenkmenü hat keinen
 * Zurück-Knopf; wer über die letzte Raste hinausdrückt, will an den Anfang und
 * nicht an eine Wand.
 */
export function nextInSteps(steps: readonly number[], value: number): number {
  return steps.find((step) => step > value + 1e-9) ?? steps[0]!;
}
