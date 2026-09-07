import { GridPlan } from '../grid/gridPlan';

/**
 * **Die Kletterhalle als Grundriss** — aber nur die Halle.
 *
 * Hier steht eine Grenze, und sie ist Absicht: Die **Wände zum Klettern** sind
 * *nicht* gerastert und werden es auch nicht. Ein Überhang, ein Riss und ein
 * Kamin sind kein Mobiliar, sondern das Spiel selbst; ihre Maße sind über viele
 * Sitzungen im Headset entstanden, und jede davon auf eine Kachelkante zu
 * ziehen hieße, sie noch einmal von vorn einzumessen — für nichts.
 *
 * Was auf das Gitter gehört, ist die **Hülle**: Matte, Decke, vier Wände. Sie
 * waren sechs `slab()`-Aufrufe mit sechs Zahlenpaaren, sie sind austauschbar,
 * und sie sind genau das, was in jeder anderen Welt auch so aussehen soll.
 * Dass sie jetzt Kacheln sind, bringt außerdem etwas, das eine Kletterhalle
 * vorher nicht hatte: einen Boden, auf dem ein NPC herumlaufen kann.
 *
 * **Die Halle ist einen Tick größer als vorher** — 25 × 20 m statt 26 × 18 —,
 * weil eine Kachelkante alle 2,5 m liegt. Hinter den Kletterwänden bleibt
 * dadurch ein guter Meter Luft. Das ist kein Schönheitsfehler: Die Wände
 * standen ohnehin frei im Raum (`ClimbWorld.panel`), und hinter einer
 * Kletterwand entlanggehen zu können ist das Normalste einer Halle.
 */

/** Die Halle in Kacheln — und wie hoch sie ist. */
export const HALL = { x: -5, z: -4, w: 10, d: 8, height: 10 } as const;

export function climbHall(): GridPlan {
  const plan = new GridPlan([0]);

  // Boden, vier Wände und eine Decke — in einer Zeile, wo vorher sechs Quader
  // von Hand standen.
  plan.room(HALL, { walls: true, ceiling: HALL.height });

  /**
   * **Die Matte ist der Boden**, und nicht eine Platte darauf.
   *
   * Sie war einmal ein eigener Quader, dreißig Zentimeter dick, unter der
   * Null — und sie hätte sich mit den Bodenplatten des Grundrisses um jedes
   * Pixel gestritten. Die Bodenplatte einer Kachel ist von Haus aus dreißig
   * Zentimeter dick und ihre Oberkante liegt auf null: dieselbe Matte, ohne
   * eine zweite Fläche daneben. Was sie zur Matte macht, ist ihre Farbe
   * (`ClimbWorld.tint`).
   */
  return plan;
}
