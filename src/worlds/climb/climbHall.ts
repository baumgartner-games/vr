import { GridPlan } from '../grid/gridPlan';
import { PLAN_WALL_H, PLAN_WALL_T } from '../editor/levelPlan';
import { TILE } from '../nav/navTile';

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

/** Dieselbe Halle in Metern: die Innenkanten ihrer vier Wände. */
export const HALL_BOUNDS = {
  minX: HALL.x * TILE,
  maxX: (HALL.x + HALL.w) * TILE,
  minZ: HALL.z * TILE,
  maxZ: (HALL.z + HALL.d) * TILE,
} as const;

/** Ein Quader: Mitte und Kantenlängen, beides in Metern. */
export interface HallSlab {
  size: readonly [number, number, number];
  centre: readonly [number, number, number];
}

/**
 * **Die Wände der oberen Stockwerke** — der Streifen zwischen Zimmerhöhe und
 * Decke, den der Grundriss nicht bauen kann.
 *
 * Eine Wand aus dem Gitter ist `PLAN_WALL_H` hoch, also 2,80 m: die Höhe eines
 * Zimmers. Diese Halle ist **zehn Meter** hoch, und genau darin bestand der
 * Fehler — über Zimmerhöhe hörte die Hülle auf. Unten merkt das niemand, oben
 * jeder: Wer auf den Podesten bei 6,50 m steht, stand bis hierher zwischen
 * offenen Kanten und sah statt einer Hallenwand den nackten Himmel.
 *
 * Warum das keine Masse im Grundriss ist (`GridPlan.mass`): Eine Masse deckt
 * ein **Kachelrechteck** ab, und die schmalste Kachel ist 2,5 m breit. Eine
 * 2,5 m dicke Wand ragte in die Halle hinein — und mitten durch die
 * Kletterwände, die einen guten Meter vor der Hülle stehen. Also vier
 * Quader in Wanddicke, gelegt wie die Wände darunter: auf die **Außenseite**
 * der Randkacheln, mit ihrer Mitte auf der Kachelkante.
 *
 * Reine Zahlen, damit sich ohne Brille nachrechnen lässt, dass sie die Lücke
 * wirklich schließen; gebaut werden sie in `ClimbWorld.buildShell`.
 */
export function hallUpperWalls(): HallSlab[] {
  const { minX, maxX, minZ, maxZ } = HALL_BOUNDS;
  const height = HALL.height - PLAN_WALL_H;
  const y = PLAN_WALL_H + height / 2;
  // Über Eck gemessen: Die Nord- und Südwand reichen um ihre halbe Dicke über
  // die Seitenwände hinaus, sonst bliebe in jeder Ecke ein senkrechter Schlitz.
  const across = maxX - minX + PLAN_WALL_T;
  const along = maxZ - minZ + PLAN_WALL_T;
  const midX = (minX + maxX) / 2;
  const midZ = (minZ + maxZ) / 2;
  return [
    { size: [across, height, PLAN_WALL_T], centre: [midX, y, minZ] },
    { size: [across, height, PLAN_WALL_T], centre: [midX, y, maxZ] },
    { size: [PLAN_WALL_T, height, along], centre: [minX, y, midZ] },
    { size: [PLAN_WALL_T, height, along], centre: [maxX, y, midZ] },
  ];
}

export function climbHall(): GridPlan {
  const plan = new GridPlan([0]);

  // Boden, vier Wände und eine Decke — in einer Zeile, wo vorher sechs Quader
  // von Hand standen. Die Wände sind zimmerhoch; was darüber bis zur Decke
  // fehlt, baut `hallUpperWalls`.
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
