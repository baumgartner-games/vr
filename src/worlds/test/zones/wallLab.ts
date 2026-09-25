import type { GridPlan } from '../../grid/gridPlan';
import { DIR_E, DIR_N, DIR_S, DIR_W, type Dir } from '../../nav/navTile';
import { WALL_LAB } from '../layout';

/**
 * **Der Wandparcours** — Wände zum Dagegenlaufen, jede Sorte einmal.
 *
 * Gewünscht: _„Wir sollten in der Test Welt ein paar Wand Test cases
 * aufstellen, die ich dann prüfen kann."_ Anlass waren zwei Befunde: In der
 * Küche kam man in die Wand hinein (die Figur durfte eine Viertelzelle über
 * ihren Block hinaus, `nav/cellGrid.standable`), und in Haunting fiel man
 * durch eine 45°-Wand aus der Welt (`cellGrid.gateStep`). Über das Gehen
 * entscheidet in dieser Welt allein das Zellgitter (`docs/agents/zellgitter.md`);
 * hier steht, was es können muss, nebeneinander:
 *
 * 1. eine gerade Wand — von beiden Seiten und um ihre Enden herum,
 * 2. eine Ecke,
 * 3. eine Lücke von genau einer Kachel — ein 2×2-Block passt genau hindurch,
 * 4. ein Gang von einem Meter,
 * 5. eine Schräge „╱",
 * 6. eine Schräge „╲",
 * 7. ein schräger Gang zwischen zwei Schrägen,
 * 8. eine gerade Wand, die unter 45° abknickt — wie die Ecken der Station.
 *
 * Die Nummern stehen auf den Schildern. Eine eigene Wand aus dem Regal unter
 * 45° (`R` am Kran) lässt sich daneben auf die Wiese stellen.
 */

/** Die Kachel in Weltkoordinaten zu einer Stelle im Parcours. */
function at(lx: number, lz: number): { x: number; z: number } {
  return { x: WALL_LAB.x + lx, z: WALL_LAB.z + lz };
}

export function stampWallLab(plan: GridPlan): void {
  const wall = (lx: number, lz: number, dir: Dir): void => {
    const t = at(lx, lz);
    plan.wall(t.x, t.z, dir);
  };
  const slope = (lx: number, lz: number, kind: 'slash' | 'backslash'): void => {
    const t = at(lx, lz);
    plan.slope(t.x, t.z, kind);
  };
  // 1. Gerade Wand, sechs Kacheln.
  for (let lz = 2; lz <= 7; lz++) wall(1, lz, DIR_E);
  // 2. Ecke.
  for (let lx = 4; lx <= 6; lx++) wall(lx, 3, DIR_N);
  for (let lz = 3; lz <= 6; lz++) wall(6, lz, DIR_E);
  // 3. Lücke von einer Kachel.
  for (let lz = 2; lz <= 7; lz++) if (lz !== 4) wall(8, lz, DIR_E);
  // 4. Gang von einem Meter.
  for (let lz = 2; lz <= 7; lz++) {
    wall(11, lz, DIR_W);
    wall(11, lz, DIR_E);
  }
  // 5. Schräge „╱" über vier Kacheln.
  for (let i = 0; i < 4; i++) slope(13 + i, 6 - i, 'slash');
  // 6. Schräge „╲" über vier Kacheln.
  for (let i = 0; i < 4; i++) slope(18 + i, 3 + i, 'backslash');
  // 7. Schräger Gang: zwei „╱" nebeneinander, zwei Kacheln auseinander.
  for (let i = 0; i < 3; i++) {
    slope(1 + i, 10 - i, 'slash');
    slope(3 + i, 10 - i, 'slash');
  }
  // 8. Gerade Wand nach Osten, die nach Südwesten unter 45° abknickt und
  //    gerade nach Süden weitergeht.
  for (let lx = 16; lx <= 19; lx++) wall(lx, 8, DIR_N);
  slope(15, 8, 'slash');
  slope(14, 9, 'slash');
  wall(14, 10, DIR_W);
}

/** Die Schilder — Einbauten mit Kennung, damit ein geladener Stand sie wiederbekommt. */
export function fitWallLab(plan: GridPlan): void {
  const signs: Array<[string, number, number, 'n' | 's', string]> = [
    ['1', 1, 0, 'n', '1 · Gerade Wand — von beiden Seiten und um die Enden'],
    ['2', 5, 0, 'n', '2 · Ecke'],
    ['3', 8, 0, 'n', '3 · Lücke von einer Kachel — der 2×2-Block passt genau'],
    ['4', 11, 0, 'n', '4 · Gang von einem Meter'],
    ['5', 14, 0, 'n', '5 · Schräge ╱'],
    ['6', 19, 0, 'n', '6 · Schräge ╲'],
    ['7', 2, 11, 's', '7 · Schräger Gang zwischen zwei Schrägen'],
    ['8', 17, 11, 's', '8 · Wand knickt unter 45° ab — wie die Station'],
  ];
  for (const [id, lx, lz, side, text] of signs) {
    const t = at(lx, lz);
    const dir = side === 'n' ? DIR_N : DIR_S;
    plan.wall(t.x, t.z, dir);
    plan.putFixture({
      id: `schild-wand-${id}`,
      kind: 'sign',
      x: t.x,
      z: t.z,
      dir,
      props: { text },
    });
  }
}
