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
 * Also dreht sich das **Kart** sofort und der **Blick** hinterher. Drei Zahlen
 * machen das aus, und alle drei sind Einstellungen am Kart — wie viel jemand
 * verträgt, ist bei jedem anders:
 *
 * - **Die Totzone** (`dead`, Grad) ist die erste Frage und die wichtigste: Bis
 *   zu wie viel Grad Unterschied dreht der Kopf **gar nicht** mit? Eine kurze
 *   Ausweichbewegung links-rechts ist damit für den Blick gar kein Ereignis —
 *   das Kart wackelt, der Horizont steht still. Der Kopf lebt in einem Fenster
 *   von ±`dead` um die Fahrtrichtung und wird erst an dessen Rand mitgenommen.
 * - **Die Nachlaufzeit** (`lag`, Sekunden) sagt, wie träge er dann folgt.
 *   Exponentiell: nach `lag` Sekunden ist knapp zwei Drittel des Rückstands
 *   aufgeholt. `0` schraubt den Kopf an den Rand der Totzone — für alle, die
 *   es so wollen, und für den Rechner ohne Brille, wo es gar keine Übelkeit
 *   gibt.
 * - **Die Drehrate** (`rate`, Grad je Sekunde) ist der Deckel darüber: Wie
 *   schnell darf der Kopf höchstens mitgehen? Der Nachlauf allein holt einen
 *   großen Rückstand mit einem großen Satz auf, und genau dieser Satz ist es,
 *   der in der Brille wehtut. `0` heißt: kein Deckel.
 *
 * Und **der Höchstversatz** (`MAX_LAG`) ist keine Einstellung: In einer langen
 * Kurve käme der Blick sonst irgendwann quer zur Fahrtrichtung zu stehen, und
 * dann fährt man seitwärts durch die Gegend. Er ist die Grenze, an der auch
 * ein sehr langsam gestellter Kopf doch mitgenommen wird.
 *
 * Ohne three.js, damit die Rechnung geprüft ist und nicht nur ausprobiert.
 */

/** Wie weit der Blick höchstens hinter dem Kart zurückbleibt, in Grad. */
export const MAX_LAG = 25;

const MAX_LAG_RAD = (MAX_LAG * Math.PI) / 180;
const DEG = Math.PI / 180;

/** Wie der Kopf dem Kart folgt — die drei Zahlen aus `kartSettings.ts`. */
export interface ViewFollow {
  /** Zeitkonstante des Nachziehens, in Sekunden. */
  lag: number;
  /** Totzone in Grad: So weit darf das Kart voraus sein, ohne dass es zieht. */
  dead: number;
  /** Höchste Drehrate des Kopfes in Grad je Sekunde; 0 heißt: ohne Deckel. */
  rate: number;
}

/** Denselben Winkel zurück in −π…π. */
export function shortestAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/**
 * Ein Schritt des Nachziehens: der Blickwinkel läuft dem Kart hinterher.
 *
 * Die Reihenfolge ist die der drei Zahlen und nicht beliebig — jede folgende
 * bremst, was die vorige zugelassen hat. Erst die **Totzone**: Sie bestimmt
 * nicht, *wie* der Kopf zieht, sondern **wohin** — sein Ziel ist nicht die
 * Fahrtrichtung, sondern der Rand des Fensters um sie herum. Dann der
 * **Nachlauf** darauf zu, dann der **Deckel** auf die Drehrate, und ganz zum
 * Schluss `MAX_LAG`, damit der Blick auch bei kleinster Drehrate nicht quer
 * zur Fahrt stehen bleibt.
 */
export function stepViewYaw(view: number, kart: number, follow: ViewFollow, dt: number): number {
  if (!(dt > 0)) return kart;

  const dead = Math.max(0, follow.dead) * DEG;
  const behind = shortestAngle(kart - view);
  // Innerhalb der Totzone hat der Kopf sein Ziel schon erreicht: Er steht
  // still, während das Kart unter ihm hin und her geht.
  const goal = Math.abs(behind) <= dead ? view : shortestAngle(kart - Math.sign(behind) * dead);

  let next =
    follow.lag > 0 ? view + shortestAngle(goal - view) * (1 - Math.exp(-dt / follow.lag)) : goal;

  if (follow.rate > 0) {
    const most = follow.rate * DEG * dt;
    const move = shortestAngle(next - view);
    if (Math.abs(move) > most) next = view + Math.sign(move) * most;
  }

  const left = shortestAngle(kart - next);
  // Der harte Deckel: mehr als so weit bleibt der Blick nicht zurück.
  if (Math.abs(left) > MAX_LAG_RAD) {
    return shortestAngle(kart - Math.sign(left) * MAX_LAG_RAD);
  }
  return shortestAngle(next);
}
