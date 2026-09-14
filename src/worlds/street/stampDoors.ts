import { DIR_E, DIR_N, DIR_W, type Dir } from '../nav/navTile';
import type { GridPlan } from '../grid/gridPlan';
import { LAMP_ID } from './stampStairs';
import { tileX, tileZ, type Cell } from './streetPlan';

/**
 * **Die Türen, Knöpfe und Platten der Straßenküche.**
 *
 * In der Südwestecke der Karte liegt ein kleiner **Hof**, und vor ihm steht
 * eine kurze Wand mit drei Türen: Schiebetür, Flügeltür, Drucktür — dieselben
 * drei wie im Interaktionslabor (`worlds/interact/`), hier aber als Einbauten
 * auf dem Kachelgitter (`grid/fixtures/door.ts`). Davor je ein Auslöser:
 * **Knopf**, **Hebel**, **Druckplatte**, und neben der Platte zwei Kisten, die
 * man daraufschiebt.
 *
 * **Warum ein Hof und keine Wand quer über den Platz.** Eine Tür, an der man
 * vorbeigehen kann, ist ein Möbelstück; erst eine Wand, die wirklich trennt,
 * macht daraus eine Tür. Das steht seit dem Labor so da, und es gilt von oben
 * genauso — mit dem Unterschied, dass man es hier auch *prüfen* kann: Hinter
 * diese Wand kommt man nur durch eine der drei Türen, und genau das rechnet
 * `streetDoors.test.ts` mit einem Strömungsfeld nach, statt dass es jemand im
 * Headset nachläuft.
 *
 * **Warum der Südwesten und nicht der Osten.** Im Osten steht die Effektecke
 * (`stampEffects.ts`, Zeilen 12 und 13 über die geraden Spalten); zwei Pakete
 * auf denselben Kacheln wären zwei Einbauten ineinander. Im Südwesten ist
 * nichts als Beton, die Bank in der Ecke und drei Schritte vom Tor entfernt.
 *
 * Dazu die **Lampe** an der Kreuzung mit ihrem **Kippschalter**: der kürzeste
 * Beweis, dass die Kette steht — Hebel umlegen, Licht geht an, und dazwischen
 * liegt nichts als ein `trigger` durch die Registry. Denselben Draht hat der
 * Hebel auf dem Podest (`stampStairs.ts`), und weil das eine **Verabredung
 * zwischen zwei Paketen** ist, steht die Kennung dort als Konstante und wird
 * hier importiert statt ein zweites Mal hingeschrieben.
 *
 * **Warum die Türkante hier noch einmal gesetzt wird** (`plan.door`), obwohl
 * `putFixture` sie anlegt: Das tut sie nur, wenn die Art angemeldet ist, und
 * angemeldet wird sie in `fixtures/kinds.ts` — der Datei, die three.js
 * mitbringt. Der Grundriss soll ohne auskommen (`streetPlan.ts` ist rein, und
 * sein Test lädt keine Grafikbibliothek), also steht die Kante ausdrücklich
 * hier. Beide Wege legen dieselbe an — denselben Namen, dieselbe Stellung
 * (`gridPlan.fitDoor`) —, der zweite überschreibt den ersten mit dem, was
 * ohnehin dastünde.
 */

/** Der Hof hinter der Wand: die Südwestecke, drei mal drei Kacheln. */
export const YARD = { col: 1, row: 12, cols: 3, rows: 3 } as const;

/** Die Spalte, an deren **Ostkante** die Türwand steht, und die Zeilen dazu. */
export const DOOR_WALL = { col: YARD.col + YARD.cols - 1, rows: [12, 13, 14] } as const;

/** Wo die Auslöser stehen — eine Kachel östlich, vor ihrer Tür. */
export const TRIGGER_COL = DOOR_WALL.col + 1;

/** Und wo die beiden Kisten liegen, die auf die Druckplatte gehören. */
export const CRATE_COL = TRIGGER_COL + 1;

/** Die Lampe über der Kreuzung und ihr Kippschalter. */
export const LAMP: Cell = { col: 14, row: 6 };
export const LAMP_SWITCH: Cell = { col: 14, row: 7 };

export { LAMP_ID };

/** Was an dieser Wand steht: Tür, Auslöser, Art und Kennung. */
export interface DoorSpot {
  /** Die Zeile, in der Tür und Auslöser stehen. */
  row: number;
  /** Kennung der Tür und ihre Betriebsart (`fixtures/door.ts`). */
  door: string;
  mode: 'slide' | 'swing' | 'plate';
  /** Kennung des Auslösers und seine Art. */
  trigger: string;
  kind: 'button' | 'lever' | 'plate';
  /** Was auf dem Schild des Auslösers steht. */
  label: string;
}

/**
 * **Die drei Türen, von Norden nach Süden** — und jede mit dem Auslöser, der
 * zu ihr gehört.
 *
 * Eine Tabelle und keine drei Blöcke Code darunter: Was sich hier
 * unterscheidet, sind fünf Wörter je Zeile, und die stehen nebeneinander
 * lesbar statt dreimal in derselben Schleife mit anderem Inhalt.
 */
export const DOORS: readonly DoorSpot[] = [
  {
    row: 12,
    door: 'tuer-schiebe',
    mode: 'slide',
    trigger: 'knopf-schiebetuer',
    kind: 'button',
    label: 'Schiebetür',
  },
  {
    row: 13,
    door: 'tuer-dreh',
    mode: 'swing',
    trigger: 'hebel-drehtuer',
    kind: 'lever',
    label: 'Flügeltür',
  },
  {
    row: 14,
    door: 'tuer-platte',
    mode: 'plate',
    trigger: 'platte-drucktuer',
    kind: 'plate',
    label: 'Drucktür',
  },
];

/** Alle Kacheln des Hofes — der Test fragt danach, was ohne Tür unerreichbar ist. */
export function yardCells(): Cell[] {
  const out: Cell[] = [];
  for (let row = YARD.row; row < YARD.row + YARD.rows; row++) {
    for (let col = YARD.col; col < YARD.col + YARD.cols; col++) out.push({ col, row });
  }
  return out;
}

export function stampDoors(plan: GridPlan): void {
  // --- die Wand um den Hof --------------------------------------------------
  //
  // Nach Süden und nach Westen schließt der Bordstein ab (dort liegt kein
  // Boden), nach Osten die drei Türen. Bleibt der Norden, und der bekommt eine
  // Wand über die ganze Breite.
  for (let i = 0; i < YARD.cols; i++) {
    plan.wall(tileX(YARD.col + i), tileZ(YARD.row), DIR_N);
  }

  for (const spot of DOORS) {
    door(plan, spot);
    control(plan, spot);
  }

  // --- die Lampe an der Kreuzung und ihr Kippschalter -----------------------
  plan.putFixture({
    id: LAMP_ID,
    kind: 'lamp',
    x: tileX(LAMP.col),
    z: tileZ(LAMP.row),
    dir: DIR_N,
    props: { on: false, height: 3.4 },
  });
  plan.putFixture({
    id: 'schalter-lampe',
    kind: 'lever',
    x: tileX(LAMP_SWITCH.col),
    z: tileZ(LAMP_SWITCH.row),
    dir: DIR_E,
    props: { target: LAMP_ID },
  });
}

/** Eine Tür: die Kante im Graphen und der Einbau, der sie bewegt. */
function door(plan: GridPlan, spot: DoorSpot): void {
  const x = tileX(DOOR_WALL.col);
  const z = tileZ(spot.row);
  const dir: Dir = DIR_E;
  // Zu, und nicht offen: Ein Hof, dessen Türen beim Laden aufstehen, ist einer,
  // an dem man nie merkt, dass es Türen sind.
  plan.door(x, z, dir, 0, false);
  plan.putFixture({
    id: spot.door,
    kind: 'door',
    x,
    z,
    dir,
    props: { mode: spot.mode },
  });
}

/** Und der Auslöser davor — eine Kachel östlich, mit dem Gesicht zum Ankommenden. */
function control(plan: GridPlan, spot: DoorSpot): void {
  plan.putFixture({
    id: spot.trigger,
    kind: spot.kind,
    x: tileX(TRIGGER_COL),
    z: tileZ(spot.row),
    // Nach Westen heißt: an der Westkante, mit dem Gesicht nach Osten — dorthin,
    // wo der herkommt, der die Tür aufmachen will (`fixtureYaw`).
    dir: DIR_W,
    props: { target: spot.door, label: spot.label },
  });
}
