import { GridPlan } from '../grid/gridPlan';
import { DIR_E, DIR_N, DIR_S, DIR_W, type Dir } from '../nav/navTile';
import type { NavRect } from '../nav/navBuild';

/**
 * **Dust als Grundriss.**
 *
 * Die Karte hatte siebzehn `slab()`-Aufrufe und vier eigene Hilfsfunktionen —
 * eine für Außenwände mit Loch, eine für Bodenplatten mit Loch, eine für
 * Treppen, eine für Rampen. Alle vier gibt es jetzt einmal für alle Welten
 * (`grid/`), und was hier übrig bleibt, ist die Karte selbst: wo ein Haus
 * steht, wie viele Stockwerke es hat und auf welcher Seite die Tür ist.
 *
 * Zwei Sachen kann sie dadurch, die sie vorher nicht konnte:
 *
 * - **Fenster sind Löcher.** Der Graph kannte die Wandsorte immer schon (sie
 *   hält auf, lässt aber Sicht und Geräusch durch), gebaut wurde daraus eine
 *   massive Wand — ein NPC im ersten Stock sah einen durch eine Wand, durch
 *   die man selbst nichts sah.
 * - **Treppen stehen im Graphen.** Vorher wurden sie aus der Geometrie
 *   erraten; jetzt weiß die Karte, dass es nach oben geht, bevor jemand
 *   hinaufläuft.
 */

/** Die halbe Karte in Kacheln — 16 × 2,5 m sind die 40 m von früher. */
export const HALF = 16;
/** Die Höhe eines Stockwerks. */
export const STOREY = 3.1;
/** Die fünf Ebenen dieser Karte: Sand, drei Stockwerke, das Dach des Blocks. */
export const LEVELS: readonly number[] = [0, STOREY, STOREY * 2, STOREY * 3, STOREY * 4];
/** Wie hoch die Felswand ringsherum ist. */
const CLIFF_H = 14;

/** Ein Haus, wie die Karte es hinschreibt. */
export interface HouseSpec extends NavRect {
  /** Wie viele begehbare Stockwerke — das Dach kommt obendrauf. */
  floors: number;
  /** Auf welcher Seite die Tür im Erdgeschoss ist. */
  door: Dir;
  /** Ohne Treppe kommt man nur ins Erdgeschoss — ein Schuppen braucht keine. */
  stairs?: boolean;
  /** Eine Brüstung ums Dach. Ohne sie führt eine Rampe glatt darüber hinweg. */
  parapet?: boolean;
}

/**
 * **Ein Haus**: Stockwerke, Außenwände mit Tür und Fenstern, eine Treppe in
 * einer Ecke und ein Dach.
 *
 * Die Reihenfolge ist keine Kosmetik: Erst stehen **alle** Stockwerke samt
 * Dach, dann werden die Treppen eingebaut. Eine Treppe schlägt das Loch in die
 * Decke über sich, und wer danach noch eine Etage legt, legt es wieder zu.
 */
export function house(plan: GridPlan, spec: HouseSpec): void {
  for (let level = 0; level <= spec.floors; level++) {
    plan.room({ x: spec.x, z: spec.z, w: spec.w, d: spec.d, level });
    if (level === spec.floors) break;
    walls(plan, spec, level);
  }

  // Das Dach: eine Brüstung ringsum, sonst läuft man im Dunkeln darüber
  // hinaus. Wo eine Rampe hinaufführt, bleibt sie absichtlich weg.
  if (spec.parapet !== false) parapet(plan, spec, spec.floors);

  if (spec.stairs !== false) stairwell(plan, spec);
}

/**
 * **Das Treppenhaus** — zwei Kacheln in der Nordwestecke, und die Läufe
 * wechseln sich ab.
 *
 * Das ist die eine Sache, die man beim ersten Versuch falsch macht: Alle
 * Läufe übereinander in *dieselbe* Kachel zu setzen geht nicht, denn jeder
 * Lauf schlägt das Loch für seinen eigenen Kopf in die Decke darüber — und
 * genau in dieses Loch müsste der nächste Lauf gestellt werden. Er stünde auf
 * einer Kachel, die es nicht mehr gibt, und niemand käme über den ersten
 * Stock hinaus.
 *
 * Zwei Kacheln lösen es, und zwar so, wie es jedes echte Treppenhaus löst:
 * Ein Lauf nach Süden, der nächste nach Norden zurück, und über jedem hängt
 * das Loch des anderen.
 */
function stairwell(plan: GridPlan, spec: HouseSpec): void {
  for (let level = 0; level < spec.floors; level++) {
    const back = level % 2 === 0;
    plan.stairs(spec.x, back ? spec.z : spec.z + 1, back ? DIR_S : DIR_N, level);
  }
}

/** Die vier Außenwände eines Stockwerks: unten eine Tür, oben Fenster. */
function walls(plan: GridPlan, spec: HouseSpec, level: number): void {
  const edges: Array<[Dir, number, number, number, 'x' | 'z']> = [
    [DIR_N, spec.x, spec.z, spec.w, 'x'],
    [DIR_S, spec.x, spec.z + spec.d - 1, spec.w, 'x'],
    [DIR_W, spec.x, spec.z, spec.d, 'z'],
    [DIR_E, spec.x + spec.w - 1, spec.z, spec.d, 'z'],
  ];
  for (const [dir, x, z, count, along] of edges) {
    plan.run(x, z, count, along, (px, pz, index) => {
      plan.wall(px, pz, dir, level);
      // Genau eine Öffnung pro Wand, ungefähr in der Mitte: unten die Tür,
      // darüber ein Fenster. Zwei Öffnungen nebeneinander sähen aus wie eine
      // Ruine, und eine Wand ganz ohne wie ein Bunker.
      if (index !== Math.floor(count / 2)) return;
      if (level === 0) {
        if (dir === spec.door) plan.door(px, pz, dir, level);
        return;
      }
      plan.window(px, pz, dir, level);
    });
  }
}

/** Die Brüstung ums Dach — eine niedrige Mauer auf jeder Randkachel. */
function parapet(plan: GridPlan, spec: HouseSpec, level: number): void {
  plan.run(spec.x, spec.z, spec.w, 'x', (x) => {
    plan.put('parapet', x, spec.z, DIR_N, level);
    plan.put('parapet', x, spec.z + spec.d - 1, DIR_S, level);
  });
  plan.run(spec.x, spec.z, spec.d, 'z', (x, z) => {
    plan.put('parapet', x, z, DIR_W, level);
    plan.put('parapet', spec.x + spec.w - 1, z, DIR_E, level);
  });
}

/** Die Häuser, die auf dieser Karte stehen. */
export const HOUSES: readonly HouseSpec[] = [
  // Der hohe Block: das Ding, das man von überall sieht, mit Treppen bis aufs
  // Dach.
  { x: -10, z: -5, w: 5, d: 4, floors: 4, door: DIR_E },
  // Zwei kleinere am Platz A. Der flache hat keine Brüstung: Die Rampe
  // draußen führt glatt auf sein Dach.
  { x: -13, z: -11, w: 3, d: 3, floors: 2, door: DIR_E },
  { x: -4, z: -12, w: 4, d: 3, floors: 1, door: DIR_S, stairs: false, parapet: false },
  // Platz B: ein Dreistöckiger und ein Schuppen.
  { x: 8, z: -5, w: 4, d: 4, floors: 3, door: DIR_W },
  { x: 11, z: -11, w: 3, d: 2, floors: 1, door: DIR_W, stairs: false, parapet: false },
  // Zwei an den Flanken, damit dort nicht nur Sand ist.
  { x: -14, z: 2, w: 3, d: 2, floors: 1, door: DIR_E, stairs: false, parapet: false },
  { x: 11, z: 2, w: 3, d: 3, floors: 2, door: DIR_W },
  // Das Haus am Startplatz.
  { x: 1, z: 8, w: 4, d: 4, floors: 2, door: DIR_N },
];

export function dustTown(): GridPlan {
  const plan = new GridPlan(LEVELS);

  /**
   * **Der Sand ist eine einzige Masse.** Achtzig mal achtzig Meter wären
   * tausend Bodenkacheln und tausend Körper in der Physik — und portalfähig
   * kann davon ohnehin nur eine sein (`grid/solids.ts`).
   *
   * Zwei Zentimeter unter null, damit sie sich mit den Bodenplatten der Häuser
   * nicht um jedes Pixel streitet.
   */
  plan.mass('floor', { x: -HALF, z: -HALF, w: HALF * 2, d: HALF * 2 }, -0.4, -0.02, {
    portal: true,
  });

  // Die Felsen ringsherum: hoch, und kein Portal daran.
  for (const rect of [
    { x: -HALF, z: -HALF, w: HALF * 2, d: 1 },
    { x: -HALF, z: HALF - 1, w: HALF * 2, d: 1 },
    { x: -HALF, z: -HALF, w: 1, d: HALF * 2 },
    { x: HALF - 1, z: -HALF, w: 1, d: HALF * 2 },
  ]) {
    plan.mass('stone', rect, 0, CLIFF_H);
  }

  for (const spec of HOUSES) house(plan, spec);

  // Der Balkon über der Gasse am Startplatz.
  plan.mass('stone', { x: 2, z: 6, w: 2, d: 1 }, STOREY, STOREY + 0.3);
  plan.put('railing', 2, 6, DIR_N, 1);
  plan.put('railing', 3, 6, DIR_N, 1);

  // Niedrige Mauern: sie sind es, die aus offenem Sand Gassen machen.
  for (const [x, z, w, d] of [
    [-4, 1, 1, 6],
    [4, 1, 1, 6],
    [-11, -7, 5, 1],
    [8, -7, 5, 1],
    [-7, -12, 1, 4],
    [6, -13, 1, 4],
  ] as const) {
    plan.mass('stone', { x, z, w, d }, 0, 2.2);
  }

  // Zwei Kistenpodeste, um die gekämpft wird, jedes mit seinem eigenen Weg
  // hinauf. Das Podest hebt die Kachel an, die Rampe daneben führt hinauf —
  // beides steht im Graphen, also weiß ein NPC davon.
  for (const side of [-1, 1] as const) {
    const x = side < 0 ? -6 : 5;
    plan.floor({ x, z: -10, w: 2, d: 2 });
    for (let dx = 0; dx < 2; dx++) {
      for (let dz = 0; dz < 2; dz++) plan.put('platform', x + dx, -10 + dz, DIR_N, 0, 1.2);
    }
    plan.floor({ x, z: -8, w: 2, d: 1 });
    plan.put('ramp', x, -8, DIR_N, 0, 1.2);
    plan.put('ramp', x + 1, -8, DIR_N, 0, 1.2);
  }

  // Der Tunnel zwischen den beiden Plätzen: zwei Wände und ein Dach.
  plan.mass('stone', { x: -2, z: -7, w: 1, d: 6 }, 0, 4);
  plan.mass('stone', { x: 0, z: -7, w: 1, d: 6 }, 0, 4);
  plan.mass('stone', { x: -2, z: -7, w: 3, d: 6 }, 4, 4.4);

  // Rampen auf die flachen Dächer, damit die Karte ohne Portal begehbar ist.
  plan.floor({ x: -3, z: -9, w: 1, d: 1 });
  plan.put('ramp', -3, -9, DIR_N, 0, STOREY);
  plan.floor({ x: 11, z: -9, w: 1, d: 1 });
  plan.put('ramp', 11, -9, DIR_N, 0, STOREY);

  // Die hellen Tafeln: das Einzige neben dem Sand, woran ein Portal haftet.
  // Zwei hängen an den Wänden der großen Blöcke, vier stehen frei herum.
  plan.put('panel', -5, -5, DIR_W, 0);
  plan.put('panel', 7, -5, DIR_E, 0);
  plan.put('panel', 1, -12, DIR_S, 0);
  plan.put('panel', -3, 7, DIR_N, 0);

  return plan;
}
