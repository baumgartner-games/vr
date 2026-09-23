/**
 * **Was die Hand hielt, wenn sie etwas Neues nimmt** — die Regel beim Wechseln.
 *
 * Reine Rechnung, damit der gemeldete Fehler eine Zeile im Test ist und nicht
 * eine Viertelstunde im Baukasten: Wer dort ein Stück aus dem KayKit-Regal in
 * der Hand hatte und ein anderes wählte, hängte die Seite auf. Das alte Stück
 * wurde beim Wechseln _hingestellt_ (Loslassen ohne Schwung ist Hinstellen,
 * `gridSnap.placesOnGrid`), holte als frisches Katalogstück seine nächste
 * Kopie in die Hand (`PortalWorld.placedFromShelf`), und die warf das neue
 * hinaus — das dann seinerseits nachholte, ohne Ende.
 *
 * - **`scrap`** — ein frisches Stück aus einem Katalog stand nie; es ist der
 *   Pinsel, mit dem gebaut wird, und verschwindet beim Wechseln.
 * - **`drop`** — alles andere fällt wie bisher und holt nichts nach.
 */
export type SwapOut = 'scrap' | 'drop';

export function swapOut(fresh: boolean): SwapOut {
  return fresh ? 'scrap' : 'drop';
}
