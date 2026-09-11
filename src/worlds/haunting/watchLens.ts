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
  /**
   * **Durch die Augen des Technikers** statt von oben über ihm — das
   * Live-Bild, das „Zuschauer: Techniker" verspricht (`rules/roundSetup.ts`,
   * `MY_ROLE_HINTS`). Zählt nur, solange die Kamera ihm folgt
   * (`follow === 'technician'`); über dem Deck oder dem Monster bleibt es
   * das Puppenhaus.
   */
  eyes: boolean;
  /**
   * **Wie nah das Puppenhaus steht**, als Faktor: 1 ist das ganze Deck (oder
   * das Fenster über dem Verfolgten), `ZOOM_MAX` ein einzelnes Zimmer.
   * Gestellt mit zwei Fingern oder dem Mausrad (`views/watchRole.ts`).
   */
  zoom: number;
  /**
   * **Wohin der Zuschauer geflogen ist** — die Verschiebung des Bildes in
   * Metern, quer und der Länge nach, mit dem Stock oder einem Finger. Über
   * dem freien Deck ist das die ganze Kamera; wer jemandem folgt, fliegt
   * neben ihm her und bleibt dabei an ihm hängen.
   */
  pan: { x: number; z: number };
}

/** Der Anfang: das ganze Deck, frei, ohne Overlay, ungezoomt. */
export function defaultLens(): WatchLens {
  return {
    seat: 'deck',
    follow: 'free',
    insight: false,
    eyes: false,
    zoom: 1,
    pan: { x: 0, z: 0 },
  };
}

/** Wie nah man heran darf — ein Zimmer füllt dann das Bild. */
export const ZOOM_MAX = 8;
/** Und wie weit weg: nicht weiter als das ganze Deck. */
export const ZOOM_MIN = 1;
/** Wie viele Meter in der Sekunde der Stock das Bild verschiebt, bei ganzem Ausschlag und Zoom 1. */
export const FLY_SPEED = 14;
/** Wie weit man vom Deck wegfliegen darf, in Metern — dahinter ist nur Schwarz. */
export const PAN_LIMIT = 80;

/**
 * **Näher oder weiter**, um einen Faktor — was zwei Finger oder das Mausrad
 * tun. Der Faktor wird begrenzt, nicht das Ergebnis geschnitten: Wer am Rand
 * weiterdreht, bleibt am Rand.
 */
export function zoomedLens(lens: WatchLens, factor: number): WatchLens {
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, lens.zoom * (factor > 0 ? factor : 1)));
  if (zoom === lens.zoom) return lens;
  return { ...lens, zoom };
}

/**
 * **Fliegen**: das Bild um ein Stück verschieben, in Metern. Herangezoomt
 * fliegt derselbe Stock langsamer — sonst schösse ein Zimmer beim ersten
 * Antippen aus dem Bild. Die Verschiebung endet an `PAN_LIMIT`, und ein Stock
 * ohne Ausschlag ändert nichts.
 */
export function pannedLens(lens: WatchLens, dx: number, dz: number): WatchLens {
  if (!dx && !dz) return lens;
  const x = Math.min(PAN_LIMIT, Math.max(-PAN_LIMIT, lens.pan.x + dx / lens.zoom));
  const z = Math.min(PAN_LIMIT, Math.max(-PAN_LIMIT, lens.pan.z + dz / lens.zoom));
  if (x === lens.pan.x && z === lens.pan.z) return lens;
  return { ...lens, pan: { x, z } };
}

/** Zurück über das Deck — Zoom und Flug vergessen. */
export function homedLens(lens: WatchLens): WatchLens {
  return { ...lens, zoom: 1, pan: { x: 0, z: 0 } };
}

/**
 * Ob dieser Blick das Live-Bild des Technikers ist: ihm folgen **und** durch
 * seine Augen. Nur dann stellt die Welt ihre Kamera in seinen Kopf.
 */
export function throughEyes(lens: Pick<WatchLens, 'seat' | 'follow' | 'eyes'>): boolean {
  return lens.seat === 'deck' && lens.follow === 'technician' && lens.eyes;
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
 * fremde Rolle, sondern der Fernseher selbst. Es sind **Ansichten**, keine
 * Geräte: Seit die Stühle Farben heißen (`stations.ts`), sagt eine Kennung
 * hier nur noch, welche Karte gezeichnet wird.
 *
 * Späher und Schalttafel waren einmal zwei Reiter eines Geräts; seit #93 sind
 * es zwei Rollen mit je einer eigenen Karte, und der Zuschauer wählt sie
 * einzeln.
 */
export function seatStation(seat: WatchSeat): string {
  return seat === 'deck' ? 'watch' : seat === 'panel' ? 'hack' : seat;
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
