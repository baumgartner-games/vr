import type { GridPlan } from '../../grid/gridPlan';
import { DIR_N, DIR_S, tileKey } from '../../nav/navTile';
import { WALL_LAB } from '../layout';
import type { Slope } from '../../nav/cellGrid';
import {
  SHELF_WALL,
  SHELF_WALL_HALF,
  wallRun,
  wallSlant,
  type ShelfWall,
} from '../../grid/shelfWalls';

/**
 * **Der Wandparcours** — Wände zum Dagegenlaufen, jede Sorte einmal, **aus
 * dem Regal**.
 *
 * Gewünscht: _„Wir sollten in der Test Welt ein paar Wand Test cases
 * aufstellen, die ich dann prüfen kann."_ Und danach: _„bitte ich dich alle
 * normalen wände komplett zu entfernen. Ich will nur noch mit den kaykit
 * wänden arbeiten."_ Seitdem hat die Testwelt keine Planwände mehr
 * (`testPlan.clearPlanWalls`), und der Parcours steht aus denselben Wänden,
 * die man selbst aus dem Regal nimmt (`prototype-bits/Wall.glb`, zwei Meter,
 * und `Wall_Half.glb`, einer). Eingerastet sind sie Wände auf dem Zellgitter
 * wie jede andere (`GridWorld.refreshWallSlopes`): gerade als Kanten, unter
 * 45° als Schrägen — über das Gehen entscheidet allein das Gitter.
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
 * Die Nummern stehen auf den Schildern; die Bodenmarken
 * (`grid/fixtures/mark.ts`) zeigen, wohin man darf.
 */

export const LAB_WALL = SHELF_WALL;
export const LAB_WALL_HALF = SHELF_WALL_HALF;

/** Ein Stück des Parcours — ein Regalstück (`grid/shelfWalls.ts`). */
export type LabWall = ShelfWall;

const X = WALL_LAB.x,
  Z = WALL_LAB.z;
const SLASH: Slope = 'slash';
const BACKSLASH: Slope = 'backslash';

/** Eine gerade Wand über `length` Kacheln (`shelfWalls.wallRun`). */
function run(out: LabWall[], alongX: boolean, line: number, from: number, length: number): void {
  wallRun(out, alongX, line, from, length);
}

/** Eine Wand unter 45° durch die Kachel (`lx`, `lz`) des Parcours. */
function slant(out: LabWall[], lx: number, lz: number, slope: Slope): void {
  wallSlant(out, X + lx, Z + lz, slope);
}

/** **Alle Wände des Parcours** — die Welt stellt sie beim Aufbau hin (`TestWorld.buildProps`). */
export function wallLabModels(): LabWall[] {
  const out: LabWall[] = [];
  // 1. Gerade Wand, sechs Kacheln, auf der Fuge x = X + 2.
  run(out, false, X + 2, Z + 2, 6);
  // 2. Ecke: drei nach Osten auf z = Z + 3, dann vier nach Süden auf x = X + 7.
  run(out, true, Z + 3, X + 4, 3);
  run(out, false, X + 7, Z + 3, 4);
  // 3. Lücke von einer Kachel (z = Z + 4 … Z + 5) auf der Fuge x = X + 9.
  run(out, false, X + 9, Z + 2, 2);
  run(out, false, X + 9, Z + 5, 3);
  // 4. Gang von einem Meter zwischen x = X + 11 und X + 12.
  run(out, false, X + 11, Z + 2, 6);
  run(out, false, X + 12, Z + 2, 6);
  // 5. Schräge „╱" über vier Kacheln.
  for (let i = 0; i < 4; i++) slant(out, 13 + i, 6 - i, SLASH);
  // 6. Schräge „╲" über vier Kacheln.
  for (let i = 0; i < 4; i++) slant(out, 18 + i, 3 + i, BACKSLASH);
  // 7. Schräger Gang: zwei „╱" nebeneinander, zwei Kacheln auseinander.
  for (let i = 0; i < 3; i++) {
    slant(out, 1 + i, 10 - i, SLASH);
    slant(out, 3 + i, 10 - i, SLASH);
  }
  // 8. Gerade Wand nach Osten, die nach Südwesten abknickt und nach Süden weitergeht.
  run(out, true, Z + 8, X + 16, 4);
  slant(out, 15, 8, SLASH);
  slant(out, 14, 9, SLASH);
  run(out, false, X + 14, Z + 10, 1);
  return out;
}

/**
 * **Den Boden des Parcours in einen gespeicherten Plan setzen, dem er fehlt**
 * (`TestWorld.planLoaded`). Ein Stand, der vor dem Parcours gespeichert
 * wurde, ersetzt den ganzen Grundriss (`GridWorld.applyStored`) — gemeldet:
 * _„hmm ich sehe noch nichts"_. Die Wände sind Regalstücke und kommen ohnehin
 * beim Aufbau (`wallLabModels`).
 */
export function ensureWallLab(plan: GridPlan): void {
  if (plan.graph.has(tileKey(WALL_LAB.x, WALL_LAB.z, 0))) return;
  plan.floor(WALL_LAB);
}

/** Die Schilder und das Beispiel der Bodenmarken — Einbauten mit Kennung. */
export function fitWallLab(plan: GridPlan): void {
  const at = (lx: number, lz: number) => ({ x: X + lx, z: Z + lz });
  const signs: Array<[string, number, number, 'n' | 's', string]> = [
    ['1', 1, 0, 'n', '1 · Gerade Wand — von beiden Seiten und um die Enden'],
    ['2', 5, 0, 'n', '2 · Ecke'],
    ['3', 9, 0, 'n', '3 · Lücke von einer Kachel — der 2×2-Block passt genau'],
    ['4', 11, 0, 'n', '4 · Gang von einem Meter'],
    ['5', 14, 0, 'n', '5 · Schräge ╱'],
    ['6', 19, 0, 'n', '6 · Schräge ╲'],
    ['7', 2, 11, 's', '7 · Schräger Gang zwischen zwei Schrägen'],
    ['8', 17, 11, 's', '8 · Wand knickt unter 45° ab — wie die Station'],
  ];
  // **Ein Beispiel für die Bodenmarken** (`grid/fixtures/mark.ts`): Start
  // westlich der Lücke, „darf hin" östlich davon. Weitere setzt man selbst —
  // Einrichten → Einbauten.
  const start = at(8, 4),
    goal = at(10, 4);
  plan.putFixture({ id: 'wandtest-start', kind: 'mark-start', x: start.x, z: start.z, dir: DIR_N });
  plan.putFixture({ id: 'wandtest-luecke', kind: 'mark-go', x: goal.x, z: goal.z, dir: DIR_N });
  for (const [id, lx, lz, side, text] of signs) {
    const t = at(lx, lz);
    const dir = side === 'n' ? DIR_N : DIR_S;
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
