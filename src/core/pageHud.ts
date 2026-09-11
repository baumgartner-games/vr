/**
 * **Die Kopfzeile der Seite ab- und wieder anschalten** (`index.html`, `#hud`).
 *
 * Oben schwebt auf jeder Seite derselbe Streifen: Weltname, *Menü*,
 * *Verbindung*, *VR*. Er liegt mit `z-index: 5` über allem, was eine Welt
 * selbst an den oberen Rand hängt — und genau dort hängt die 2D-Welt ihren
 * Aufgabenkasten und die Sprungknöpfe hin. Das Ergebnis auf dem Telefon war
 * eine Zeile „Zum Spieler", die es gab, die aber niemand sehen konnte, weil
 * ein fremder Knopf davor lag. Wer den oberen Rand für sich braucht, schaltet
 * den Streifen deshalb ab, solange er läuft.
 *
 * **Was abgeschaltet war, kommt genau so zurück.** Der Streifen ist nicht
 * immer sichtbar: In der Brille ist er weg (`main.ts`, `onSessionChanged`),
 * auf der Landeseite noch nicht da. Ein Schalter, der beim Aufräumen einfach
 * `hidden = false` setzt, holte ihn dort hervor, wo er nie hingehörte —
 * deshalb merkt sich dieser hier den Stand von vorher und stellt **den**
 * wieder her.
 *
 * Das Modul kennt die Seite und sonst nichts: In Jest gibt es kein `#hud`,
 * und dann tut jeder Aufruf hier nichts. Deshalb darf die 2D-Welt es rufen,
 * ohne zu prüfen, ob sie in einem Browser läuft.
 */

/** Wie der Streifen stand, bevor ihn jemand abgeschaltet hat. */
let restore: boolean | null = null;

function pageHud(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>('#hud');
}

/**
 * Den Streifen zeigen (`true`) oder verstecken (`false`). Zeigen heißt dabei:
 * den Stand von vor dem Verstecken wiederherstellen — siehe oben.
 */
export function showPageHud(on: boolean): void {
  const hud = pageHud();
  if (!hud) return;
  if (!on) {
    restore ??= hud.hidden;
    hud.hidden = true;
    return;
  }
  hud.hidden = restore ?? false;
  restore = null;
}

/** Ob der Streifen gerade zu sehen ist. */
export function pageHudShown(): boolean {
  const hud = pageHud();
  return !!hud && !hud.hidden;
}

/**
 * **Auf einen der Knöpfe im Streifen drücken**, ohne ihn zu zeigen.
 *
 * Eine Welt, die den Streifen abgeschaltet hat, braucht trotzdem einen Weg zu
 * *Menü* und *Verbindung* — und den kürzesten gibt es schon: Die Knöpfe sind
 * noch da, sie sind nur nicht zu sehen, und ihr Klick ist derselbe Klick.
 * Damit hängt hier kein zweiter Draht zu `App` oder `NetPanel`, der beim
 * nächsten Umbau vergessen wird.
 */
export function pressPageButton(which: 'menu' | 'net' | 'vr'): void {
  if (typeof document === 'undefined') return;
  document.querySelector<HTMLButtonElement>(`#hud-${which}`)?.click();
}
