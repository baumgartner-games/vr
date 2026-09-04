/**
 * Der Schießgang hinter dem Eingaberaum, in Zahlen.
 *
 * Er steht hier und nicht in einer der Klassen darin, weil ihn inzwischen
 * mehrere brauchen und keine ihn besitzt: die Welt baut seine Wände, die
 * Stände richten sich an seiner Länge aus, und die Zielscheiben hängen an
 * seinem Ende. Eine Zahl an zwei Stellen ist eine, die irgendwann
 * auseinanderläuft.
 *
 * Breit ist er, weil viel darin steht: an der einen Wand das Werkzeug-Menü, an
 * der anderen die Knöpfe und die Werte-Tafel, und dazwischen **zwei**
 * Justierstände mit je einem Ausleger voller Griffe. Eng war er, solange nur
 * einer darin stand.
 */

/** Halbe Breite, Länge und lichte Höhe, in Metern. */
export const LANE = { half: 2.2, length: 9.5, height: 2.7 };

/** Wo die Zielscheiben hängen: Höhe über dem Boden und Abstand zur Tür. */
export const TARGET = { y: 1.45, z: LANE.length - 0.35, radius: 0.32 };

/**
 * Ob die beiden Stände ihre Scheiben **tauschen** sollen.
 *
 * Jeder Stand bringt seine eigene Scheibe mit, und solange beide dort stehen,
 * wo sie gebaut wurden, zielt jeder geradeaus den Gang hinunter. Nur sind die
 * Stände verschiebbar — und seit die beiden einmal die Seiten getauscht haben,
 * standen sie links, während ihre Scheiben rechts hingen: zwei Strahlen, die
 * sich in der Mitte des Gangs kreuzen, und ein Werkzeug, das auf die Scheibe
 * des Nachbarn zeigt.
 *
 * Die Scheiben deshalb mitwandern zu lassen, wäre die schlechtere Antwort: sie
 * halten Kugeln auf, und ein Kollisionskörper, der jedem Schieben folgt, ist
 * eine Fehlerquelle für einen Schönheitsfehler. Stattdessen behalten sie ihren
 * Platz, und die **Zuordnung** dreht sich: der linke Stand nimmt die linke
 * Scheibe, der rechte die rechte. Damit kreuzen sich zwei Strahlen nie, wie
 * auch immer jemand die Stände schiebt.
 *
 * Die Reihenfolge und nicht der kürzeste Weg entscheidet, weil der kürzeste
 * Weg genau dann nichts entscheidet, wenn man ihn braucht: stehen beide Stände
 * links von beiden Scheiben, sind beide Zuordnungen exakt gleich lang, und die
 * Rechnung würfelt. Die Reihenfolge ist immer eindeutig.
 *
 * Alle vier Werte sind Querlagen im Gang, in Metern; Höhe und Tiefe spielen
 * keine Rolle, weil alle Scheiben gleich weit hinten und gleich hoch hängen.
 */
export function swapTargets(
  standA: number,
  standB: number,
  targetA: number,
  targetB: number,
): boolean {
  return (standA - standB) * (targetA - targetB) < 0;
}
