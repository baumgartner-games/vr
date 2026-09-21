import type { FullState } from './fullDownload';

/**
 * **Der Haken „von selbst nachladen" — und wann der Knopf blinkt.**
 *
 * Der große Download war bis hierher eine Frage, die nur gestellt wurde, wenn
 * jemand sie stellte: Die Startseite holte ungefragt keine Liste, sah
 * ungefragt in keinen Speicher, und wer nach einem Deploy wissen wollte, ob
 * ihm etwas fehlt, musste zweimal drücken. Das fiel genau dann auf, wenn es
 * zu spät war — im Funkloch. Gewünscht wurde deshalb beides: „Bei der
 * Startseite soll immer automatisch geprüft werden, ob alle Modelle
 * heruntergeladen sind und dann der Button zum Download blinken, wenn etwas
 * fehlt. Ich will auch eine Checkbox da haben (der State wird mit gespeichert
 * über Reloads), ob automatisch neue Inhalte heruntergeladen werden sollen,
 * wenn diese fehlen."
 *
 * Hier stehen die beiden Entscheidungen dazu als reine Rechnung, und daneben
 * der Zettel im Speicher. Was sie **anzeigt**, ist `main.ts`; was sie
 * ausführt, `core/fullDownloadRun.ts`.
 *
 * **Warum geprüft immer, geladen aber nur mit Haken.** Nachsehen kostet zwei
 * kleine erzeugte Listen und einen Blick in den Speicher; siebzig Megabyte
 * kosten eine Mobilfunkrechnung. Das eine darf die Seite von sich aus tun,
 * das andere erst, wenn es jemand einmal gesagt hat — und dann bleibt es
 * gesagt, auch über das Neuladen hinaus.
 */

/** Wo der Haken liegt — dieselbe Schreibweise wie überall (`bgvr.…`). */
const KEY = 'bgvr.autoload';

/**
 * **Soll der Knopf blinken?**
 *
 * Genau dann, wenn etwas fehlt und gerade nichts dagegen getan wird. Ein
 * Knopf, der blinkt, während er lädt, wäre Unruhe ohne Aussage; einer, der
 * blinkt, obwohl alles da ist, wäre eine Lüge; und einer, der blinkt, weil
 * der Browser keinen Speicher hat, verlangt etwas, das niemand tun kann.
 */
export function fullNags(state: FullState): boolean {
  return state.kind === 'offen' || state.kind === 'angehalten' || state.kind === 'lückenhaft';
}

/**
 * **Darf die Prüfung gleich in einen Download übergehen?**
 *
 * Nur mit Haken, und nur aus dem Zustand heraus, den eine Prüfung überhaupt
 * ergeben kann: _offen_. _Angehalten_ ist eine Entscheidung gegen das Laden,
 * und _lückenhaft_ ist das Ende eines Laufs — von selbst wieder anzufangen,
 * wäre in beiden Fällen eine Schleife gegen den Willen dessen, der davorsitzt.
 */
export function autoStarts(state: FullState, auto: boolean): boolean {
  return auto && state.kind === 'offen';
}

/**
 * Ob der Haken gesetzt ist. Ohne Speicher (privates Fenster, gesperrte Seite)
 * ist er es nicht: Der teure Fall braucht ein Ja und nicht die Abwesenheit
 * eines Neins.
 */
export function readAutoFull(): boolean {
  try {
    return globalThis.localStorage?.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Und zurückgeschrieben — siehe `ui/pageCols.ts`. */
export function writeAutoFull(on: boolean): void {
  try {
    globalThis.localStorage?.setItem(KEY, on ? '1' : '0');
  } catch {
    // Ein Speicher, der nicht will, kostet hier nur die Erinnerung.
  }
}
