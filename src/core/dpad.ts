/** So weit um die Mitte des Kreuzes zählt ein Finger noch als „nichts", in Punkten. */
const DPAD_DEAD = 14;

/**
 * **Wohin das Steuerkreuz zeigt** — aus der Lage eines Fingers zur Mitte, in
 * Bildpunkten (y nach unten). Acht Richtungen zu je 45°, und immer volle
 * Auslenkung: schräg ist so schnell wie gerade. `name` ist die
 * Himmelsrichtung auf dem Glas (`n`, `ne`, …) für die Anzeige.
 */
export function dpadDirection(dx: number, dy: number): { x: number; y: number; name: string } {
  if (Math.hypot(dx, dy) < DPAD_DEAD) return { x: 0, y: 0, name: '' };
  const sector = (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
  const angle = sector * (Math.PI / 4);
  const names = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
  // `+ 0` macht aus einer −0 eine 0.
  const x = Math.round(Math.cos(angle) * 1e6) / 1e6 + 0,
    y = Math.round(Math.sin(angle) * 1e6) / 1e6 + 0;
  return { x, y, name: names[sector]! };
}
