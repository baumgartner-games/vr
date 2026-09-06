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
 *
 * **Und seit dieser Runde ist er rechts breiter als links.** Wer im Gang steht
 * und nach vorn schaut, hat rechts (also bei −x) hinter der alten Wand einen
 * neuen Raum: den **Poseraum** mit dem Schwebekasten. Die alte rechte Wand ist
 * dabei nicht verschwunden, sondern zur **Trennwand mit Tür** geworden — sie
 * trägt weiter die Knöpfe und die Werte-Tafel, und zwar an genau derselben
 * Stelle. Den ganzen Gang zu verbreitern hätte beides um anderthalb Meter
 * weiter weggerückt, und eine Tafel wird nicht dadurch lesbarer, dass der Raum
 * größer wird.
 */

/**
 * Halbe Breiten links und rechts, Länge und lichte Höhe, in Metern.
 *
 * `left` und `right` sind aus der Sicht **von der Tür nach hinten**, also so,
 * wie im Gang gearbeitet wird: links ist +x (das Werkzeug-Menü), rechts ist −x
 * (die Knöpfe, dahinter der Poseraum).
 */
export const LANE = { left: 2.2, right: 4.2, length: 9.5, height: 2.7 };

/** Wo die Mitte des Gangs quer liegt — seit er rechts breiter ist, nicht bei 0. */
export const LANE_MID = (LANE.left - LANE.right) / 2;

/** Wie breit er insgesamt ist, ohne Wandstärke. */
export const LANE_WIDTH = LANE.left + LANE.right;

/**
 * Die **Trennwand** zwischen Arbeitsgang und Poseraum — die alte rechte Wand.
 *
 * Ihre Fläche zum Gang hin liegt genau dort, wo die Wand stand (`−LANE.left`),
 * damit die Knöpfe und die Werte-Tafel keinen Zentimeter wandern. Die Tür
 * darin ist ein Stück hinter der Gangtür: davor stehen die Knöpfe, dahinter
 * die Tafel, und wer hindurchgeht, steht vor dem Schwebekasten.
 */
const PARTITION_THICKNESS = 0.16;

export const PARTITION = {
  thickness: PARTITION_THICKNESS,
  /** Mitte der Wand, quer im Gang — ihre Gangseite liegt auf `−LANE.left`. */
  x: -(LANE.left + PARTITION_THICKNESS / 2),
  /**
   * Die Tür darin, längs hinter der Gangtür — von … bis, in Metern.
   *
   * Sie fängt hinter der zweiten Knopfspalte an (die reicht bis 2,2 m) und
   * hört vor der Werte-Tafel auf: eine Tür, die eine Tafel halbiert, ist eine
   * Tafel weniger.
   */
  doorFrom: 2.35,
  doorTo: 4.05,
  /** Lichte Höhe der Tür; darüber steht ein Sturz. */
  doorHeight: 2.2,
};

/**
 * Der **Poseraum**: der Streifen rechts hinter der Trennwand.
 *
 * Hier steht der Schwebekasten — eine durchsichtige Kiste in der Luft, in der
 * ein losgelassenes Werkzeug hängen bleibt, statt zu fallen. Man legt die
 * blanke Hand daran und misst, wie sie es umfasst; die Zahlen dazu stehen an
 * der Wand daneben und gehen live an die Werkzeugseite.
 */
const POSE_NEAR = -(LANE.left + PARTITION_THICKNESS);
const POSE_FAR = -LANE.right;

export const POSE_ROOM = {
  /** Die dem Gang zugewandte Kante, quer: die Rückseite der Trennwand. */
  near: POSE_NEAR,
  /** Und die äußere Kante: die neue rechte Wand. */
  far: POSE_FAR,
  /** Quer in der Mitte des Streifens. */
  x: (POSE_NEAR + POSE_FAR) / 2,
  /** Längs, hinter der Gangtür — auf Höhe der Tür in der Trennwand. */
  z: 3.2,
  /** Kantenlänge des Schwebekastens, in Metern. */
  box: 0.72,
  /** Wie hoch seine Mitte über dem Boden hängt. */
  height: 1.24,
};

/** Wie breit der Poseraum ist — die Zahl, an der die Aufstellung hängt. */
export const POSE_ROOM_WIDTH = POSE_NEAR - POSE_FAR;

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
