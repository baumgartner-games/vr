import type { StationId } from './stations';

/**
 * **Wessen Platz der Zuschauer gerade einnimmt** — die Wahl, die es bisher
 * nicht gab.
 *
 * Der Fernseher war das ganze Deck von schräg oben, und sonst nichts: ein
 * Fenster, kein Platz. Wer zusah, konnte den Techniker spielen (2D-Runde)
 * oder eben von oben zusehen — aber nie *sehen, was der Archivar sieht*, nie
 * die Tafel, nie den Späherschirm. Genau das war der Wunsch: „statt nur den
 * Techniker spielen zu können, auch in die Rollen der anderen Spieler
 * schlüpfen".
 *
 * **Sehen, nicht bedienen.** Das ist die eine Regel, die den Fernseher zum
 * Fernseher macht: Der Zuschauer bekommt das *Bild* eines Platzes, nicht
 * seine Knöpfe. Wer alles sieht und dazu schalten dürfte, wäre der fünfte
 * Spieler mit den besten Karten, und die anderen vier wären Deko. Technisch
 * steht diese Regel nicht hier, sondern in dem Wirt, den `views/watchRole.ts`
 * der fremden Ansicht reicht: Seine `door` und `light` geben `''` zurück und
 * tun nichts.
 *
 * Reine Daten, ohne DOM und ohne three.js: Der Fernseher (`views/watchRole.ts`)
 * schreibt die Wahl, das Telefon reicht sie durch (`StationUi.watchLens`), und
 * die Welt (`HauntingWorld.render`) richtet die Kamera danach aus.
 */

/**
 * Welches Bild der Zuschauer sehen will — das Deck, oder der Platz einer der
 * Rollen aus der Registry. **Die Drohne ist gestrichen** (`origin/main`, #93);
 * ein Blick, der auf ein Gerät zeigt, das es nicht mehr gibt, wäre ein
 * schwarzes Bild mit einer Beschriftung darunter.
 */
export type WatchSeat = 'deck' | 'archive' | 'panel' | 'scout' | 'monster';

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
  { id: 'deck', label: 'Deck', hint: 'Das ganze Deck von schräg oben, ohne Decke' },
  { id: 'archive', label: 'Archiv', hint: 'Die Karte des Archivars mit Fracht und Zielen' },
  { id: 'panel', label: 'Schalttafel', hint: 'Die Karte der Tafel: Schotts und Lampen' },
  { id: 'scout', label: 'Späher', hint: 'Zwei Punkte, alle paar Sekunden neu' },
  { id: 'monster', label: 'Monster', hint: 'Die Station aus Monstersicht, Karte und Ohren' },
];

export const WATCH_FOLLOWS: ReadonlyArray<{ id: WatchFollow; label: string; hint: string }> = [
  { id: 'free', label: 'Frei', hint: 'Das ganze Deck im Bild' },
  { id: 'technician', label: 'Techniker folgen', hint: 'Die Kamera bleibt über ihm' },
  { id: 'monster', label: 'Monster folgen', hint: 'Und über dem, was ihn sucht' },
];

/**
 * **Welche Rolle hinter einem Blick steckt** — dieselben Kennungen wie in der
 * Registry (`registry/roles.ts`), damit der Zuschauer keine zweite Liste von
 * Ansichten braucht, sondern die angemeldete aufschlägt. Nur `deck` ist keine
 * fremde Rolle, sondern der Fernseher selbst.
 *
 * Späher und Schalttafel waren einmal zwei Reiter eines Geräts; seit #93 sind
 * es zwei Rollen mit je einer eigenen Karte, und der Zuschauer wählt sie
 * einzeln.
 */
export function seatStation(seat: WatchSeat): StationId {
  return seat === 'deck' ? 'watch' : seat === 'panel' ? 'hack' : (seat as StationId);
}

/**
 * Ob dieser Blick ein gezeichnetes Bild der 3D-Welt braucht (`viewport`).
 *
 * Das Deck ist das Puppenhaus, und die Raumakte des Archivars macht ein Loch
 * auf, durch das die Welt ein Zimmer zeichnet — solange eine Akte offen ist.
 * Ob sie es ist, weiß nur die Ansicht selbst; hier steht deshalb nur, wer es
 * überhaupt tun könnte.
 */
export function seatHasView(seat: WatchSeat): boolean {
  return seat === 'deck' || seat === 'archive';
}
