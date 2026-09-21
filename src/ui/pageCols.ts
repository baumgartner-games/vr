/**
 * **Wie viele Spalten das Raster der Seite bekommt** — reine Rechnung, ohne
 * DOM und ohne Fenster.
 *
 * Das Regal stand immer auf **zwei** Spalten (`core/kaykitIndex.SHELF_COLS`),
 * und für eine Brille und ein Telefon ist das richtig: In der Kachel steht das
 * Modell, und bei drei Spalten sehen zwei ähnliche Fässer gleich aus. Am
 * Schreibtisch war es falsch, und genau so wurde es gemeldet: „Auf Desktop
 * sind 2 Columns sehr klein." Zwei Kacheln auf 1600 Punkten sind zwei
 * Briefmarken mit sehr viel Luft daneben.
 *
 * Also rechnet die Seite die Spalten aus ihrer eigenen Breite — und lässt den
 * Spieler sie mit zwei Knöpfen nachstellen. Beides steht hier, damit ein Test
 * es nachrechnen kann; das Fenster fragt `ui/PageMenu.ts`.
 */

/** Weniger als eine Spalte gibt es nicht. */
export const COLS_MIN = 1;

/**
 * **Und mehr als zehn auch nicht.**
 *
 * Bei zehn Spalten ist eine Kachel auf einem 1600er Schirm 150 Punkte breit —
 * dieselbe Größe, die sie auf dem Telefon bei zweien hat. Darunter wird aus
 * dem Modell wieder ein Fleck, und das ist genau das, wogegen das Regal zwei
 * Spalten nahm.
 */
export const COLS_MAX = 10;

/**
 * **Wie breit eine Kachel sein soll**, in Bildpunkten.
 *
 * 190 ist das Maß, das ein Telefon von Haus aus liefert: 390 Punkte Breite,
 * zwei Spalten, zwanzig Punkte Rand und Fuge. Was dort lesbar ist, ist es am
 * Schreibtisch auch — der Unterschied ist nur, dass dort mehr davon
 * nebeneinander passen.
 */
export const COL_WIDTH = 190;

/**
 * **Die Spaltenzahl, die in diese Breite passt.**
 *
 * Abgerundet und nicht gerundet: Lieber eine Kachel breiter als eine zu eng.
 * Unter einer Kachelbreite bleibt es bei einer Spalte — ein Fenster von 200
 * Punkten gibt es, und null Spalten gibt es nicht.
 */
export function fitColumns(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return COLS_MIN;
  return clampColumns(Math.floor(width / COL_WIDTH));
}

/** In die Grenzen gelegt — auch, was aus dem Speicher kommt. */
export function clampColumns(cols: number): number {
  if (!Number.isFinite(cols)) return COLS_MIN;
  return Math.min(COLS_MAX, Math.max(COLS_MIN, Math.round(cols)));
}

/**
 * **Ein Druck auf `+` oder `−`.**
 *
 * An den Enden passiert nichts, und das ist Absicht: Ein Knopf, der im Kreis
 * von zehn auf eins springt, ist ein Knopf, den man nicht mehr gedrückt halten
 * kann.
 */
export function stepColumns(cols: number, by: number): number {
  return clampColumns(clampColumns(cols) + Math.trunc(by));
}

/** Wo die gewählte Spaltenzahl liegt — dieselbe Schreibweise wie überall. */
const KEY = 'bgvr.cols';

/**
 * **Was der Spieler zuletzt eingestellt hat**, oder `null` — dann rechnet die
 * Seite es aus ihrer Breite (`fitColumns`).
 *
 * `null` ist der Normalfall und kein leerer Speicher: Solange niemand einen
 * der beiden Knöpfe gedrückt hat, soll sich das Raster nach dem Fenster
 * richten, und zwar auch dann, wenn jemand das Fenster zieht oder das Telefon
 * dreht. Erst ein Druck macht daraus eine Entscheidung, und die bleibt.
 */
export function readColumns(): number | null {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? clampColumns(value) : null;
  } catch {
    // Ein Browser ohne Speicher (privates Fenster, gesperrte Seite) ist kein
    // Fehlerfall: Dann rechnet die Seite jedes Mal neu.
    return null;
  }
}

/** Und zurückgeschrieben. */
export function writeColumns(cols: number): void {
  try {
    globalThis.localStorage?.setItem(KEY, String(clampColumns(cols)));
  } catch {
    // siehe `readColumns`
  }
}
