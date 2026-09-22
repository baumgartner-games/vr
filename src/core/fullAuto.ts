import type { FullState } from './fullDownload';

/**
 * **Der Download gehört zum Beitreten — und läuft von selbst.**
 *
 * Es gab einmal zwei Knöpfe: _Beitreten_ und darunter _Alles herunterladen_,
 * der blinkte, wenn etwas fehlte, und einen Haken „Fehlendes automatisch
 * herunterladen", der im Speicher des Browsers stand. Gewünscht wurde dann:
 * „Da man eh nicht beitreten kann, wenn nicht alle Assets da sind, sollten
 * wir das anpassen, sodass der ‚Download assets' und der Beitreten-Button in
 * eins sind. Also der Button zeigt an ‚Downloading' bzw. prüfen, und darunter
 * ist direkt der Progress-Bar. Das ‚Fehlendes automatisch herunterladen' kann
 * weg und ist default true, sonst kann man ja eh nicht spielen."
 *
 * Hier stehen die beiden Entscheidungen dazu als reine Rechnung. Was sie
 * **anzeigt**, ist `main.ts`; was sie ausführt, `core/fullDownloadRun.ts`.
 */

/**
 * **Hält der Download _Beitreten_ gerade auf?**
 *
 * Solange geprüft oder geladen wird — und sonst nie. Alles andere ist ein
 * Ende: fertig, übersprungen, lückenhaft, oder ein Browser, der gar nichts
 * ablegen kann. Keines davon darf einen Knopf für den Rest der Sitzung tot
 * machen; gespielt wird dann eben mit dem, was das Netz liefert.
 *
 * _Offen_ hält ebenfalls nicht auf: Das ist der Augenblick zwischen Prüfung
 * und Lauf — oder ein Tab im Hintergrund, der erst beim Zurückkommen anfängt
 * (`mayStartFull`). Ein Knopf, der dort wartete, wartete womöglich auf
 * niemanden.
 */
export function fullBlocks(state: FullState): boolean {
  return state.kind === 'prüft' || state.kind === 'läuft';
}

/**
 * **Darf die Prüfung gleich in einen Download übergehen?**
 *
 * Nur aus dem Zustand heraus, den eine Prüfung überhaupt ergeben kann:
 * _offen_. _Angehalten_ ist eine Entscheidung gegen das Laden (für diese
 * Sitzung — beim nächsten Start ist es wieder _offen_), und _lückenhaft_ ist
 * das Ende eines Laufs; von selbst wieder anzufangen, wäre in beiden Fällen
 * eine Schleife gegen den Willen dessen, der davorsitzt.
 */
export function autoStarts(state: FullState): boolean {
  return state.kind === 'offen';
}
