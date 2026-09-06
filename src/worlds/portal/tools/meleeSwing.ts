/**
 * **Wann ein Schlag einer ist** — die Rechnung hinter Messer und Hammer.
 *
 * Eine Kugel fliegt und trifft; ein Messer liegt in der Hand und ist die
 * ganze Zeit irgendwo. Der Unterschied ist der Grund für diese Datei: Ein
 * Werkzeug, das jeden Frame fragt „stecke ich in einem Zombie?", trifft
 * sechzigmal in der Sekunde, und ein Messer, das man einem Zombie nur
 * hinhält, tötet ihn dann in zwei Sekunden von selbst. Ein Schlag braucht
 * deshalb zwei Dinge, die eine Kugel nicht braucht:
 *
 * - **Tempo.** Die Spitze muss sich bewegen. Was langsamer ist als
 *   `SWING_SPEED`, ist Hinhalten und kein Zuschlagen.
 * - **Pause.** Nach einem Treffer ist eine Weile Ruhe (`SWING_REST`), sonst
 *   wird aus einer Bewegung durch einen Körper hindurch eine Serie.
 *
 * Getroffen wird dabei entlang der **Strecke**, die die Spitze seit dem
 * letzten Bild gefahren ist — genau wie bei einer Kugel (`npcHit.ts`). Eine
 * schnelle Hand legt zwischen zwei Bildern zehn Zentimeter zurück; wer nur
 * den Punkt prüft, an dem die Spitze gerade steht, schlägt durch einen
 * schmalen Körper hindurch, ohne ihn zu berühren.
 *
 * Reine Zahlen, kein three.js: die drei Fälle, die hier zählen — zu langsam,
 * zu früh, und der Sprung, wenn ein Werkzeug die Hand wechselt — sind alle
 * ohne Brille zu prüfen (`meleeSwing.test.ts`).
 */

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Wie schnell die Spitze sein muss, in m/s.
 *
 * Anderthalb Meter in der Sekunde ist eine Bewegung, die man macht, um etwas
 * zu treffen — kein Zittern und kein Herumtragen.
 */
export const SWING_SPEED = 1.5;

/** Wie lange nach einem Treffer Ruhe ist, in Sekunden. */
export const SWING_REST = 0.35;

/**
 * Der weiteste Weg, der noch ein Schlag ist, in Metern.
 *
 * Ein Werkzeug, das die Hand wechselt, vom Gürtel kommt oder durch ein Portal
 * geht, steht im nächsten Bild meterweit weg. Die Strecke dazwischen ist kein
 * Schlag, sondern ein Sprung — und sie ginge quer durch den halben Raum.
 */
export const SWING_JUMP = 1.2;

/** Was sich eine schlagende Spitze zwischen zwei Bildern merkt. */
export interface SwingState {
  /** Wo die Spitze im letzten Bild war — `null`, solange sie neu ist. */
  last: Point3 | null;
  /** Wie lange noch Ruhe ist, in Sekunden. */
  rest: number;
}

export function newSwing(): SwingState {
  return { last: null, rest: 0 };
}

/** Vergisst, wo die Spitze war — nach dem Weglegen, Wechseln, Teleportieren. */
export function forgetSwing(state: SwingState): void {
  state.last = null;
}

/** Die Strecke, auf der in diesem Bild ein Treffer gesucht wird. */
export interface SwingSegment {
  from: Point3;
  to: Point3;
  /** Wie schnell die Spitze dabei war, in m/s — für die Wucht der Meldung. */
  speed: number;
}

/**
 * Ein Bild einer schlagenden Spitze.
 *
 * @param at wo die Spitze **jetzt** ist.
 * @returns die Strecke, auf der ein Treffer zählt — `null`, wenn dieses Bild
 *          keiner ist.
 */
export function swingStep(state: SwingState, at: Point3, dt: number): SwingSegment | null {
  const last = state.last;
  state.last = { x: at.x, y: at.y, z: at.z };
  if (state.rest > 0) state.rest = Math.max(0, state.rest - dt);
  if (!last || dt <= 0) return null;

  const travelled = Math.hypot(at.x - last.x, at.y - last.y, at.z - last.z);
  // Ein Sprung ist kein Schlag: die Strecke wird verworfen, aber der neue Ort
  // ist gemerkt — im nächsten Bild geht es von dort aus normal weiter.
  if (travelled > SWING_JUMP) return null;
  if (state.rest > 0) return null;

  const speed = travelled / dt;
  if (speed < SWING_SPEED) return null;
  return { from: last, to: state.last, speed };
}

/** Ein Treffer ist gelandet: ab jetzt ist eine Weile Ruhe. */
export function swingHit(state: SwingState): void {
  state.rest = SWING_REST;
}
