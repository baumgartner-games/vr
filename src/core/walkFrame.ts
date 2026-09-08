/**
 * **Wohin „vorwärts“ zeigt, während man geht.**
 *
 * Der linke Stick schiebt seit jeher entlang der Blickrichtung, und das ist
 * beim Losgehen auch genau richtig: Man schaut hin, wo man hinwill, und drückt
 * den Stick nach vorn. Falsch wird es erst im nächsten Moment — beim
 * *Weitergehen*. Wer über die Schulter zurückschaut, ob ihm jemand folgt, oder
 * beim Laufen nach links auf ein Schild sieht, dreht damit seinen ganzen Weg
 * mit. Man kommt nie dort an, wo man hinwollte, und lernt sich an, den Kopf
 * beim Gehen stillzuhalten — was in einer Brille ungefähr das Gegenteil von
 * dem ist, wofür man sie aufsetzt.
 *
 * Deshalb wird die Blickrichtung **beim Loslaufen gemerkt** und bleibt stehen,
 * solange der Stick ausgelenkt ist. Der Kopf ist dann wieder frei: Er schaut
 * sich um, der Körper geht geradeaus weiter. Beim Loslassen ist die Marke weg,
 * und der nächste Schritt geht wieder dorthin, wo man gerade hinsieht.
 *
 * Zwei Dinge, die dabei leicht untergehen und deshalb beide hier stehen:
 *
 * - **Der Snap-Turn dreht die Marke mit** (`turnWalkFrame`). Er dreht den
 *   ganzen Spieler; bliebe die gemerkte Richtung stehen, liefe man nach einer
 *   Vierteldrehung seitwärts weiter und wüsste nicht, warum.
 * - **Wer es anders mag, stellt es um** (`WalkFacing`, *Menü → Bewegung*).
 *   `'head'` ist das alte Verhalten, Zeile für Zeile: die Richtung hängt jede
 *   Frame am Kopf.
 *
 * Die Datei rechnet nur mit Winkeln und weiß nichts von Three.js — deshalb
 * lässt sie sich ohne Brille nachmessen (`walkFrame.test.ts`).
 */

/** Woran sich die Laufrichtung hält. */
export type WalkFacing =
  /** An der Blickrichtung, jede Frame neu — Kopf drehen dreht den Weg mit. */
  | 'head'
  /** An der Richtung, in die man beim Loslaufen gesehen hat. */
  | 'start';

/** Was sich die Laufrichtung zwischen zwei Bildern merkt. */
export interface WalkFrame {
  /**
   * Die gemerkte Blickrichtung in Radiant, oder `null`, solange der Stick in
   * Ruhe ist. `null` und nicht etwa „der letzte Wert, egal ob gültig“: Woran
   * man sich nicht mehr hält, darf auch nicht mehr dastehen.
   */
  yaw: number | null;
}

export function newWalkFrame(): WalkFrame {
  return { yaw: null };
}

/**
 * Die Richtung, in der der Stick diese Frame gelesen wird — und die Marke für
 * die nächste.
 *
 * @param frame  Der Merker, wird verändert
 * @param facing Woran sich die Richtung halten soll
 * @param head   Wohin der Kopf gerade sieht, in Radiant
 * @param moving Ob der Stick ausgelenkt ist
 */
export function walkYaw(
  frame: WalkFrame,
  facing: WalkFacing,
  head: number,
  moving: boolean,
): number {
  if (!moving || facing === 'head') {
    frame.yaw = null;
    return head;
  }
  frame.yaw ??= head;
  return frame.yaw;
}

/**
 * Dreht die gemerkte Richtung mit, wenn sich der ganze Spieler dreht.
 *
 * Ohne das wäre der Snap-Turn beim Gehen kaputt: Man dreht sich um 90°, geht
 * aber weiter in die alte Richtung — seitwärts, ohne erkennbaren Grund.
 */
export function turnWalkFrame(frame: WalkFrame, angle: number): void {
  if (frame.yaw !== null) frame.yaw += angle;
}

/**
 * Die waagerechte Blickrichtung als Winkel — die Umkehrung dessen, was
 * `PlayerRig.getHeadForward` liefert.
 *
 * Three.js dreht um Y so, dass „vorn“ bei `(-sin, 0, -cos)` liegt; genau diese
 * beiden Vorzeichen gehen hier wieder heraus.
 */
export function yawOfForward(x: number, z: number): number {
  return Math.atan2(-x, -z);
}

/** Und zurück: der Einheitsvektor „vorwärts“ zu einem Winkel. */
export function forwardOfYaw(yaw: number): { x: number; z: number } {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}
