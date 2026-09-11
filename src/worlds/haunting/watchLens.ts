import type { StationId } from './stations';

/**
 * **Wessen Platz der Zuschauer gerade einnimmt** — die Wahl, die es bisher
 * nicht gab.
 *
 * Der Fernseher war das ganze Deck von schräg oben, und sonst nichts: ein
 * Fenster, kein Platz. Wer zusah, konnte den Techniker spielen (2D-Runde)
 * oder eben von oben zusehen — aber nie *sehen, was der Archivar sieht*,
 * nie das Bild der Drohne, nie den Späherschirm. Genau das war der Wunsch:
 * „statt nur den Techniker spielen zu können, auch in die Rollen der anderen
 * Spieler schlüpfen".
 *
 * **Sehen, nicht bedienen.** Das ist die eine Regel, die den Fernseher zum
 * Fernseher macht: Der Zuschauer bekommt das *Bild* eines Platzes, nicht
 * seine Knöpfe. Wer alles sieht und dazu schalten dürfte, wäre der fünfte
 * Spieler mit den besten Karten, und die anderen vier wären Deko.
 *
 * Reine Daten, ohne DOM und ohne three.js: Das Telefon (`stationUi.watchPage`)
 * schreibt die Wahl, die Welt (`HauntingWorld.render`) richtet die Kamera
 * danach aus.
 */

/** Welches Bild der Zuschauer sehen will. */
export type WatchSeat = 'deck' | 'archive' | 'control' | 'scout' | 'drone' | 'monster';

/** Und wem die Kamera dabei folgt, solange sie über dem Deck steht. */
export type WatchFollow = 'free' | 'technician' | 'monster';

export interface WatchLens {
  seat: WatchSeat;
  follow: WatchFollow;
  /**
   * Ob das Overlay „KI-Absichten" mitläuft (Paket M4). Es steht **nur** dem
   * Zuschauer zu; ein Spieler sähe damit das Glaubensbild des Monsters und
   * wüsste, welche Zimmer gerade sicher sind.
   */
  insight: boolean;
}

/** Der Anfang: das ganze Deck, frei, ohne Overlay. */
export function defaultLens(): WatchLens {
  return { seat: 'deck', follow: 'free', insight: false };
}

export const WATCH_SEATS: ReadonlyArray<{ id: WatchSeat; label: string; hint: string }> = [
  { id: 'deck', label: 'Zuschauer', hint: 'Das ganze Deck von schräg oben, ohne Decke' },
  {
    id: 'archive',
    label: 'Archiv',
    hint: 'Der Grundriss eines Zimmers, wie der Archivar ihn hält',
  },
  { id: 'control', label: 'Einsatzkontrolle', hint: 'Die Tafel: Lichter, Schotts, Köder' },
  { id: 'scout', label: 'Späher', hint: 'Wände und ein Punkt — mehr hat er nicht' },
  { id: 'drone', label: 'Drohne', hint: 'Das Bild aus dem Zimmer, in dem sie steht' },
  { id: 'monster', label: 'Monster', hint: 'Die Station aus Monstersicht, Karte und Ohren' },
];

export const WATCH_FOLLOWS: ReadonlyArray<{ id: WatchFollow; label: string; hint: string }> = [
  { id: 'free', label: 'Frei', hint: 'Das ganze Deck im Bild' },
  { id: 'technician', label: 'Techniker folgen', hint: 'Die Kamera bleibt über ihm' },
  { id: 'monster', label: 'Monster folgen', hint: 'Und über dem, was ihn sucht' },
];

/**
 * Welches Gerät hinter einem Blick steckt. Einsatzkontrolle und Späher sind
 * **dasselbe** Gerät mit zwei Reitern (`stations.ts`) — der Zuschauer wählt
 * den Reiter, nicht ein sechstes Gerät.
 */
export function seatStation(seat: WatchSeat): StationId {
  return seat === 'deck'
    ? 'watch'
    : seat === 'control' || seat === 'scout'
      ? 'scout'
      : (seat as StationId);
}

/** Ob dieser Blick ein gezeichnetes Bild der Welt braucht (`viewport`). */
export function seatHasView(seat: WatchSeat): boolean {
  return seat === 'deck' || seat === 'archive' || seat === 'drone';
}
