/**
 * Wer durchfällt, kommt oben wieder heraus.
 *
 * In einem Sandkasten fällt man aus der Welt: durch ein Bodenportal, durch die
 * eine Ritze zwischen zwei Kisten, oder weil ein Handschuh einen unter die
 * Karte geschoben hat. Bisher endete das im Nichts — man fiel, bis man das
 * Menü öffnete und die Welt neu lud.
 *
 * Gerettet wird an *derselben Stelle*, an der man gefallen ist, und zwar auf
 * dem **höchsten** Ding, das dort steht. Der Unterschied ist kein
 * kosmetischer: unter einem Haus wieder aufzutauchen setzt einen in dessen
 * Keller oder in eine Wand, auf dem Dach dagegen steht man im Freien und sieht,
 * wo man ist. Deshalb wird von oben nach unten geschaut und nicht von unten
 * nach oben.
 *
 * Reine Zahlen, kein three.js: was die Strahlen trifft, misst die Welt.
 */

/** So tief unter dem Boden gilt es als Sturz und nicht als Sprung in eine Grube. */
export const FALL_LIMIT = 30;

/** Luft zwischen Sohle und Oberfläche, damit man nicht in ihr klebt. */
export const LANDING_CLEARANCE = 0.08;

/** Ist der Spieler unter der Welt? `floorY` ist der tiefste gebaute Punkt. */
export function needsRescue(y: number, floorY: number, limit = FALL_LIMIT): boolean {
  return Number.isFinite(y) && y < floorY - limit;
}

/**
 * Der höchste Treffer eines Strahls, der von oben kommt — das Dach, nicht der
 * Kellerboden darunter. Ohne Treffer: null, dann bleibt nur der Startpunkt.
 */
export function topHit(hits: readonly number[]): number | null {
  let top: number | null = null;
  for (const hit of hits) {
    if (!Number.isFinite(hit)) continue;
    if (top === null || hit > top) top = hit;
  }
  return top;
}

/**
 * Wohin die Füße kommen: auf den höchsten Treffer plus etwas Luft, und wenn
 * dort nichts steht, auf die Höhe des Startpunkts.
 */
export function rescueHeight(
  hits: readonly number[],
  spawnY: number,
  clearance = LANDING_CLEARANCE,
): number {
  const top = topHit(hits);
  return top === null ? spawnY : top + clearance;
}
