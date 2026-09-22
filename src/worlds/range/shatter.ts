/**
 * **Wohin ein Stück fliegt, wenn eine Scheibe zerspringt.**
 *
 * Dieselbe Schnittstelle wie die Wertung nebenan (`range/scoring.ts`) und aus
 * demselben Grund ohne three.js und ohne Rapier: Was hier gerechnet wird,
 * entscheidet über das Bild, das der Spieler eine halbe Sekunde lang sieht —
 * und eine Rechnung, die nur in der Brille läuft, ist eine, die niemand prüft.
 * Der Aufrufer bringt die Zahlen in Weltkoordinaten her und trägt das
 * Ergebnis in die Physik zurück (`zones/range.ts`, `shatter`).
 *
 * **Ein Stoß und kein Zufall.** Sechs Tortenstücke, die in zufällige
 * Richtungen davonstieben, sehen beim ersten Mal gut aus und beim dritten wie
 * ein Fehler: Man erkennt nicht wieder, was man getan hat. Hier fliegt jedes
 * Stück dorthin, wo es auf der Scheibe saß — nach außen, weg von der Mitte —,
 * und dazu kommt für alle derselbe Schub in Schussrichtung und derselbe nach
 * oben. Das liest sich als **eine** Bewegung: die Scheibe geht auf.
 */

import type { Vec3 } from './scoring';

/**
 * Wie schnell ein Stück nach außen geht, in m/s.
 *
 * Gemessen am Halbmesser der Scheibe (0,35 m) und nicht am Gefühl: Bei 2,4 m/s
 * ist ein Stück nach einer Zehntelsekunde eine Scheibenbreite von seinem
 * Nachbarn entfernt — schnell genug, dass man das Aufgehen sieht, langsam
 * genug, dass man es verfolgen kann.
 */
export const BURST_OUT = 2.4;

/**
 * Und wie schnell alle zusammen nach hinten weggehen — in die Richtung, aus
 * der die Kugel kam.
 *
 * Kleiner als der Stoß nach außen, und das ist die Aussage: Eine Scheibe, die
 * vor allem nach hinten wegfliegt, sieht aus, als hätte jemand sie
 * umgestoßen; eine, die vor allem aufgeht, sieht aus, als wäre sie getroffen
 * worden.
 */
export const BURST_FORWARD = 1.6;

/**
 * Der Schub nach oben, für alle gleich.
 *
 * Ohne ihn fallen die Stücke von der Aufhängehöhe geradewegs zu Boden und
 * liegen nach einer halben Sekunde still. Mit ihm beschreiben sie einen
 * kurzen Bogen — das ist der Unterschied zwischen „die Scheibe ist kaputt"
 * und „die Scheibe ist zersprungen".
 */
export const BURST_UP = 1.2;

/** Wie stark sich ein Stück dabei um sich selbst dreht, in rad/s. */
export const BURST_SPIN = 6;

/** Der Stoß auf ein Stück: geradeaus und um sich selbst. */
export interface Burst {
  velocity: Vec3;
  spin: Vec3;
}

/**
 * **Der Stoß auf ein einzelnes Stück.**
 *
 * @param offset Wo die Mitte des Stücks gegenüber der Mitte der Scheibe
 *   sitzt, in Metern und in **Weltkoordinaten** — also schon gedreht, wie die
 *   Scheibe hängt.
 * @param forward Die Richtung, in die geschossen wurde. Muss nicht normiert
 *   sein; eine Richtung der Länge null heißt „kein Schub nach hinten" und ist
 *   kein Fehler (in der Rechnung nebenan gibt es Strecken der Länge null
 *   auch).
 *
 * **Nach außen heißt in der Fläche der Scheibe.** Ein Stück ist ein Keil von
 * 14 cm Dicke, seine Mitte sitzt also nicht nur neben der Mitte der Scheibe,
 * sondern auch ein Stück **hinter** ihr. Nähme man diesen Anteil mit, bekäme
 * jedes Stück zusätzlich zum gemeinsamen Schub nach hinten noch einen
 * eigenen — und die sechs gingen gar nicht auseinander, sondern zusammen weg.
 * Deshalb wird der Anteil längs der Schussrichtung herausgerechnet, und übrig
 * bleibt genau die Richtung, in der das Stück auf der Scheibe saß.
 */
export function pieceBurst(offset: Vec3, forward: Vec3): Burst {
  const ahead = unit(forward);
  const along = offset.x * ahead.x + offset.y * ahead.y + offset.z * ahead.z;
  const out = unit({
    x: offset.x - along * ahead.x,
    y: offset.y - along * ahead.y,
    z: offset.z - along * ahead.z,
  });
  return {
    velocity: {
      x: out.x * BURST_OUT + ahead.x * BURST_FORWARD,
      y: out.y * BURST_OUT + ahead.y * BURST_FORWARD + BURST_UP,
      z: out.z * BURST_OUT + ahead.z * BURST_FORWARD,
    },
    // Quer zu beidem: Ein Stück, das nach rechts oben wegfliegt, dreht sich
    // dabei um die Achse, die auf seiner Bahn und auf der Scheibe senkrecht
    // steht — dieselbe Drehung, die ein weggeschnippter Deckel macht.
    spin: {
      x: (ahead.y * out.z - ahead.z * out.y) * BURST_SPIN,
      y: (ahead.z * out.x - ahead.x * out.z) * BURST_SPIN,
      z: (ahead.x * out.y - ahead.y * out.x) * BURST_SPIN,
    },
  };
}

/**
 * Eine Richtung auf die Länge eins — und der Nullvektor bleibt der
 * Nullvektor.
 *
 * Das ist hier kein Sonderfall zum Wegräumen, sondern der ehrliche Ausgang
 * für zwei Lagen, die es wirklich gibt: ein Stück, dessen Mitte genau auf der
 * Achse der Scheibe liegt, und eine Schussrichtung, die niemand mitgegeben
 * hat. Beide sollen eine Zahl ergeben und kein `NaN`.
 */
function unit(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z);
  if (length < 1e-9) return { x: 0, y: 0, z: 0 };
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}
