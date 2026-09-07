import { GridPlan } from '../grid/gridPlan';
import { DIR_E, DIR_N, DIR_S, DIR_W, TILE } from '../nav/navTile';

/**
 * **Der Schießstand als Grundriss.**
 *
 * Er stand vorher als zwölf `slab()`-Aufrufe in Metern da — Bank, Pfosten,
 * Dach, Rückwand, Trennwände, Kugelfang —, und jede einzelne Zahl war eine
 * Behauptung, die man nur in der Brille nachprüfen konnte. Hier ist er ein Plan
 * aus Kacheln, und die Schießbank ist das, was sie in Wirklichkeit ist: eine
 * **Küchenzeile**. Dasselbe Möbel, dieselbe Arbeitshöhe, derselbe Baustein —
 * das ist keine Sparsamkeit, sondern der Punkt der ganzen Umstellung. Wer
 * einmal geprüft hat, dass eine Arbeitsplatte auf 90 cm liegt und an ihrer
 * Kante klebt, hat es für die Küche *und* für den Stand geprüft.
 *
 * **Das Feld läuft nach Norden**, also in −Z, weil in diesem Projekt überall
 * vorne −Z ist. Der Schütze steht auf `z = 0` und schießt in die negativen
 * Kacheln hinein.
 */

/** Das ganze Feld in Kacheln: 50 m breit, gut 125 m tief. */
export const FIELD = { x: -10, z: -48, w: 20, d: 51 } as const;
/** Die überdachte Schießlinie. */
export const STAND = { x: -4, z: 0, w: 7, d: 3 } as const;
/** Die Bahnen — je eine Kachel breit, die mittlere bei `x = -1`. */
export const LANES: readonly number[] = [-3, -2, -1, 0, 1];
/** Die mittlere Bahn: dort steht man beim Start. */
export const MIDDLE_LANE = -1;
/** Wie hoch das Dach über der Linie hängt. */
export const ROOF_Y = 3.6;
/** Wie hoch der Kugelfang am Ende ist. */
const BERM_H = 9;

/** Die Mitte einer Kachelspalte in Metern. */
export function laneX(tile: number): number {
  return (tile + 0.5) * TILE;
}

export function rangeStand(): GridPlan {
  const plan = new GridPlan([0]);

  /**
   * **Der Boden ist eine einzige Masse und keine tausend Kacheln.**
   *
   * Zwei Gründe, und beide zählen: Tausend Bodenplatten wären tausend Körper in
   * der Physik für eine Fläche, auf der man geradeaus läuft — und portalfähig
   * kann nur eine große sein. Jede Portalfläche bekommt eine eigene
   * Kollisionsgruppe, davon gibt es zehn; wären es die Kacheln, öffnete ein
   * Bodenportal nebenbei die Wand gegenüber.
   *
   * Zwei Zentimeter unter null, damit sie sich mit den Bodenplatten der
   * Schießlinie nicht um jedes Pixel streitet.
   */
  plan.mass('floor', FIELD, -0.4, -0.02, { portal: true });

  // Die Schießlinie selbst bekommt Kacheln: Dort wird gelaufen, dort stehen
  // Möbel, und dort soll ein NPC wissen, wo er langkommt.
  plan.room(STAND);

  // Rückwand und die beiden Seitenwände. Nach vorn bleibt offen — dorthin wird
  // schließlich geschossen.
  plan.run(STAND.x, STAND.z + STAND.d - 1, STAND.w, 'x', (x, z) => plan.wall(x, z, DIR_S));
  plan.run(STAND.x, STAND.z, STAND.d, 'z', (x, z) => {
    plan.wall(x, z, DIR_W);
    plan.wall(STAND.x + STAND.w - 1, z, DIR_E);
  });

  // Das Dach: ein Quader über die ganze Linie, auf vier Säulen. Es hört hinter
  // der Linie auf, damit über dem Schützen Himmel ist.
  plan.mass('wood', STAND, ROOF_Y, ROOF_Y + 0.22);
  for (const x of [STAND.x, STAND.x + STAND.w - 1]) {
    for (const z of [STAND.z, STAND.z + STAND.d - 1]) {
      plan.put('pillar', x, z, DIR_N, 0, ROOF_Y);
    }
  }

  /**
   * **Die Schießbank ist eine Küchenzeile.** Arbeitshöhe, Platte, Nische für
   * die Füße — genau das, wovor man mit einer Pistole steht. Sie liegt nur auf
   * den Bahnen; die beiden äußeren Kacheln bleiben frei, sonst käme niemand an
   * der Linie vorbei nach vorn.
   */
  for (const lane of LANES) plan.put('counter', lane, STAND.z, DIR_N);

  // Die Trennwände zwischen den Bahnen: brusthoch, damit der Stand offen
  // bleibt. Nur zwischen den Bahnen, nicht an ihren Außenseiten.
  for (const lane of LANES.slice(0, -1)) plan.put('parapet', lane, STAND.z, DIR_E);

  // Eine Bank zum Ausruhen an der Rückwand, und ein Regal für alles, was man
  // nicht in der Hand hat.
  plan.put('bench', STAND.x, STAND.z + 2, DIR_S);
  plan.put('shelf', STAND.x + STAND.w - 1, STAND.z + 2, DIR_S);

  // Die hellen Tafeln an den Seitenwänden: das Einzige neben dem Boden, woran
  // ein Portal haftet. An den Scheiben wäre eines das Ende der Übung.
  plan.put('panel', STAND.x, STAND.z + 1, DIR_W);
  plan.put('panel', STAND.x + STAND.w - 1, STAND.z + 1, DIR_E);

  // Der Kugelfang ganz hinten, und die beiden Wälle an den Seiten.
  plan.mass('stone', { x: FIELD.x, z: FIELD.z, w: FIELD.w, d: 2 }, 0, BERM_H);
  for (const x of [FIELD.x, FIELD.x + FIELD.w - 1]) {
    plan.mass('stone', { x, z: FIELD.z, w: 1, d: FIELD.d }, 0, 6);
  }

  return plan;
}
