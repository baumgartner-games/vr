import { GridPlan } from '../grid/gridPlan';
import { PLAN_WALL_H } from '../editor/levelPlan';
import { DIR_E, DIR_N, DIR_S, DIR_W } from '../nav/navTile';

/**
 * Das Haus in Kacheln: acht mal sechs, mit einem Gang quer hindurch.
 *
 * Kachel `x = -4` fängt bei −10 m an, `z = -3` bei −7,5 m — das Haus steht
 * damit ungefähr dort, wo es vorher von Hand hingerechnet stand, nur dass die
 * Wände jetzt auf Kanten sitzen statt auf krummen Metern.
 */
export const HOUSE = { x: -4, z: -3, w: 8, d: 6 } as const;
/** Der Gang: eine Kachelreihe quer durch das ganze Haus. */
export const HALL_Z = 0;
/** Wo der Grundriss in Ost und West geteilt wird. */
export const SPLIT_X = 0;

/**
 * **Der Grundriss des Dunkelhauses**: ein Gang quer durch, vier Zimmer daran,
 * ein Hinterzimmer.
 *
 * Er steht in einer eigenen Datei und nicht in der Welt, und das ist der
 * eigentliche Gewinn der Umstellung: Ein Grundriss ohne three.js ist einer,
 * den ein Test in einer Millisekunde abläuft. `darkHouse.test.ts` geht durch
 * jede Tür, bevor irgendjemand die Brille aufsetzt — und das ist die Sorte
 * Fehler, die einen sonst zehn Minuten kostet, weil man erst hineinlaufen
 * muss, um zu merken, dass ein Zimmer keine hat.
 *
 * Alle Wände stehen auf Kachelkanten, alle Türen sind Türen im Graphen. Was
 * darin steht, sind Bausteine — und die Küche ist mit Absicht dabei: Sie ist
 * der Fall, für den es die Bausteine überhaupt gibt.
 */
export function darkHouse(): GridPlan {
  const plan = new GridPlan([0]);
  // Boden, Außenwände und **eine** Decke über allem. Fenster gibt es keine,
  // und das ist hier nicht Sparsamkeit, sondern der ganze Zweck des Hauses.
  plan.room(HOUSE, { walls: true, ceiling: PLAN_WALL_H });

  // Die beiden Wände des Ganges. Ohne Türen wäre das Haus zwei Hälften.
  plan.run(HOUSE.x, HALL_Z, HOUSE.w, 'x', (x, z) => {
    plan.wall(x, z, DIR_N);
    plan.wall(x, z, DIR_S);
  });
  plan.door(-3, HALL_Z, DIR_N).door(1, HALL_Z, DIR_N);
  plan.door(-3, HALL_Z, DIR_S).door(2, HALL_Z, DIR_S);

  // Die Längsteilung: je zwei Zimmer nördlich und südlich des Ganges.
  for (const z of [-3, -2, -1]) plan.wall(SPLIT_X - 1, z, DIR_E);
  for (const z of [1, 2]) plan.wall(SPLIT_X - 1, z, DIR_E);

  // Das Hinterzimmer in der Nordostecke — mit einer Tür, sonst käme niemand
  // hinein, und ein Zimmer, das niemand betritt, ist kein Zimmer.
  for (const x of [2, 3]) plan.wall(x, -2, DIR_N);
  plan.wall(2, -3, DIR_W);
  plan.door(2, -2, DIR_N);

  // --- was darin steht ---------------------------------------------------

  // **Die Küche** im Südostzimmer: Zeile an der Südwand, Regal daneben.
  // Der Fall, für den es die Bausteine gibt — hier steht sie in vier Zeilen,
  // vorher wären es dreißig Zahlen in Metern gewesen.
  plan.putRun('counter', 1, 2, 3, 'x', DIR_S);
  plan.put('shelf', 3, 1, DIR_E);
  plan.put('table', 1, 1, DIR_N);

  // Das Startzimmer: ein Tisch und eine Bank, damit man sieht, wie weit ein
  // Lichtkegel reicht, wenn etwas darin steht.
  plan.put('table', -2, 2, DIR_N);
  plan.put('bench', -4, 1, DIR_W);
  plan.put('shelf', -4, 2, DIR_W);

  // Das Nordostzimmer ist die Kammer: Regale und Kisten.
  plan.put('shelf', 1, -2, DIR_N);
  plan.put('crate', 2, -1, DIR_N);
  // Und das Nordwestzimmer bleibt leer. Es ist das Zimmer ohne Lampe, und
  // ein leeres dunkles Zimmer ist unheimlicher als ein volles.

  // Die hellen Tafeln: das Einzige neben dem Boden, woran ein Portal haftet.
  plan.put('panel', -2, HALL_Z, DIR_N);
  plan.put('panel', 0, HALL_Z, DIR_S);
  plan.put('panel', -4, -1, DIR_W);

  return plan;
}
