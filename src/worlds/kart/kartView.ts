/**
 * **Der Kopf zieht nach** — warum der Blick nicht am Kart festgeschraubt ist.
 *
 * Bis hierher saß der Spieler im Kart wie eine Schraube: Das Kart drehte sich,
 * und der Rig drehte sich im selben Bild mit. Physikalisch stimmt das sogar —
 * ein Kopf, der in einem Sitz steckt, dreht sich mit dem Fahrzeug —, und
 * trotzdem ist es genau das, wovon einem in der Brille schlecht wird: Das Auge
 * sieht die ganze Welt herumschwenken, das Innenohr meldet nichts dazu, und
 * dieser Widerspruch ist die Übelkeit. Beim Gehen ist er kurz, beim Lenken
 * dauert er die ganze Kurve.
 *
 * Also dreht sich das **Kart** sofort und der **Blick** hinterher: eine
 * Verzögerung von ein bis drei Zehntelsekunden, mehr nicht. Was dabei
 * herauskommt, ist obendrein näher an der Wirklichkeit als das Festschrauben —
 * wer wirklich fährt, hält den Kopf nicht starr im Auto, sondern lässt ihn in
 * der Kurve ein Stück zurück und schaut in den Bogen hinein.
 *
 * Zwei Zahlen machen das aus:
 *
 * - **Die Nachlaufzeit** (`lag`, Sekunden) ist eine Einstellung am Kart, denn
 *   wie viel jemand verträgt, ist bei jedem anders. `0` schraubt den Kopf
 *   wieder fest — für alle, die es so wollen und für den Rechner ohne Brille,
 *   wo es gar keine Übelkeit gibt.
 * - **Der Höchstversatz** (`MAX_LAG`) ist keine: In einer langen Kurve käme
 *   der Blick sonst irgendwann quer zur Fahrtrichtung zu stehen, und dann
 *   fährt man seitwärts durch die Gegend. Ein Viertelkreis pro Sekunde bei
 *   0,2 s Nachlauf sind 18° — der Deckel greift also erst dort, wo es wirklich
 *   eng wird.
 *
 * Ohne three.js, damit die Rechnung geprüft ist und nicht nur ausprobiert.
 */

/** Wie weit der Blick höchstens hinter dem Kart zurückbleibt, in Grad. */
export const MAX_LAG = 25;

const MAX_LAG_RAD = (MAX_LAG * Math.PI) / 180;

/** Denselben Winkel zurück in −π…π. */
export function shortestAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/**
 * Ein Schritt des Nachziehens: der Blickwinkel läuft dem Kart hinterher.
 *
 * Exponentiell und nicht linear — eine feste Drehrate holte eine kleine
 * Lenkbewegung ruckartig ein und eine große gar nicht. `lag` ist die
 * Zeitkonstante: nach `lag` Sekunden ist knapp zwei Drittel des Rückstands
 * aufgeholt.
 */
export function stepViewYaw(view: number, kart: number, lag: number, dt: number): number {
  if (!(lag > 0) || !(dt > 0)) return kart;
  const behind = shortestAngle(kart - view);
  const next = view + behind * (1 - Math.exp(-dt / lag));
  const left = shortestAngle(kart - next);
  // Der Deckel: mehr als so weit bleibt der Blick nicht zurück.
  if (Math.abs(left) > MAX_LAG_RAD) {
    return shortestAngle(kart - Math.sign(left) * MAX_LAG_RAD);
  }
  return shortestAngle(next);
}
