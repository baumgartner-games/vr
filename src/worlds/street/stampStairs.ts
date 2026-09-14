import { PLAN_FLOOR_T } from '../editor/levelPlan';
import type { GridPlan } from '../grid/gridPlan';
import { DIR_E, DIR_N, DIR_S, DIR_W } from '../nav/navTile';
import { PODIUM, STAIRS, STOREY, tileX, tileZ } from './streetPlan';

/**
 * **Das Podest und die Treppe der Straßenküche.**
 *
 * Die Welt hat eine zweite Etage, seit es sie gibt (`streetPlan.LEVELS`), und
 * sie war bis hierher leer. Jetzt steht sie: sechs Kacheln im Nordwesten
 * (`P` in der Zeichnung), eine Treppe hinauf (`^`), eine Brüstung am Rand und
 * oben ein Hebel, der unten das Licht schaltet.
 *
 * **Warum das die Ecke ist, an der man das Aufschneiden zuerst sieht.** Das
 * Podest steht auf vier Säulen, und darunter kann man durchlaufen. Von oben
 * verschwindet deshalb genau dann etwas, wenn man es braucht: Solange die Figur
 * unten steht, ist das Obergeschoss weg und man sieht den Boden darunter; ab
 * der halben Treppe kommt es dazu und der Blick liegt auf dem Podest
 * (`core/cutaway.ts`, Plan E8). Ein massiver Klotz hätte dieselbe Treppe und
 * die halbe Wirkung — man sähe nur, dass etwas erscheint, und nie, dass etwas
 * darunter war.
 *
 * **Eine Treppe ist drei Sachen** (AGENTS.md, _Welten auf dem Kachelgitter_):
 * der Baustein, das Loch in der Decke darüber und der Weg im Graphen. Alle drei
 * macht `GridPlan.stairs()` — und weil es das Loch schlägt, wird sie **nach**
 * dem Boden der oberen Etage gerufen und nicht davor. Ihre letzte Stufe mündet
 * auf der Kachel **vor** ihr, also zeigt sie nach Westen auf die Ostkante des
 * Podests.
 *
 * Eine zweite Treppe auf eine dritte Ebene steht nicht hier: Die Welt hat zwei
 * Etagen, und eine dritte hineinzuschreiben hieße, `LEVELS` zu ändern — die
 * gehört dem Grundriss und nicht der Möblierung.
 */
export function stampStairs(plan: GridPlan): void {
  const floor = PODIUM.map((cell) => ({ x: tileX(cell.col), z: tileZ(cell.row) }));
  if (floor.length === 0) return;
  const west = Math.min(...floor.map((one) => one.x));
  const north = Math.min(...floor.map((one) => one.z));
  const east = Math.max(...floor.map((one) => one.x));
  const south = Math.max(...floor.map((one) => one.z));

  // **Der Boden des Obergeschosses**, Kachel für Kachel aus der Zeichnung und
  // nicht als Rechteck: Wer das Podest in `MAP` um eine Kachel verschiebt, soll
  // es hier nicht noch einmal nachtragen müssen.
  for (const cell of floor) plan.floor({ x: cell.x, z: cell.z, w: 1, d: 1, level: 1 });

  // Die Treppe hinauf — nach dem Boden darüber, siehe oben.
  plan.stairs(tileX(STAIRS.col), tileZ(STAIRS.row), DIR_W, 0);

  /**
   * **Die Säulen darunter.** Vier an den Ecken, vom Beton bis unter das Podest:
   * Ein Obergeschoss, das in der Luft schwebt, sieht von unten nach einem
   * Fehler aus, und eines auf einer geschlossenen Wand nähme den Blick, für
   * den das Aufschneiden überhaupt da ist.
   */
  // Sie enden **unter** dem Boden des Podests (`PLAN_FLOOR_T`) und nicht auf
  // seiner Oberkante: Sonst stehen von oben vier graue Flecken mitten im Podest.
  for (const x of [west, east]) {
    for (const z of [north, south]) plan.put('pillar', x, z, DIR_N, 0, STOREY - PLAN_FLOOR_T);
  }

  // **Die Brüstung am Rand**, an jeder Kante, hinter der es hinuntergeht. Die
  // Ostkante der Treppenkachel bleibt frei — dort kommt man herauf.
  const landing = { x: tileX(STAIRS.col) - 1, z: tileZ(STAIRS.row) };
  for (const cell of floor) {
    if (cell.z === north) plan.put('parapet', cell.x, cell.z, DIR_N, 1);
    if (cell.z === south) plan.put('parapet', cell.x, cell.z, DIR_S, 1);
    if (cell.x === west) plan.put('parapet', cell.x, cell.z, DIR_W, 1);
    if (cell.x === east && !(cell.x === landing.x && cell.z === landing.z)) {
      plan.put('parapet', cell.x, cell.z, DIR_E, 1);
    }
  }

  /**
   * **Der Hebel oben** — und er schaltet die Lampe über der Kreuzung.
   *
   * Die Art `lever` und die Lampe gehören P6 (`fixtures/lever.ts`,
   * `street/stampDoors.ts`). Solange es beide in diesem Programm nicht gibt,
   * steht der Einbau im Plan und wird beim Bauen übersprungen und gemeldet —
   * genau dafür ist die Registry so gebaut. Zeigt die Lampe drüben am Ende
   * unter einem anderen Namen, ist es **diese eine Zeile**, die nachzuziehen
   * ist.
   */
  plan.putFixture({
    id: 'hebel-podest',
    kind: 'lever',
    // An der Westkante und nicht auf der Kachel, auf der die Treppe mündet:
    // Wer oben ankommt, soll nicht schon im Hebel stehen.
    x: west,
    z: north,
    dir: DIR_W,
    level: 1,
    props: { target: LAMP_ID, label: 'Licht' },
  });
}

/**
 * Die Kennung der Lampe über der Kreuzung (P6, `street/stampDoors.ts`).
 *
 * Sie steht als Konstante da und nicht als Zeichenkette mitten im Aufruf, weil
 * sie eine **Verabredung zwischen zwei Paketen** ist und keine Einstellung.
 */
export const LAMP_ID = 'lampe-kreuzung';
