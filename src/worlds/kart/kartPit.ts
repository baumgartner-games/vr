import { GridPlan } from '../grid/gridPlan';
import { DIR_N, DIR_S, DIR_W } from '../nav/navTile';
import { KART_FIELD, PIT_BAYS, PIT_BOXES, PIT_LANE } from './kartCourse';

/**
 * **Die Boxengasse als Grundriss** — und der Boden, auf dem die ganze Anlage
 * steht.
 *
 * Die Grenze ist dieselbe wie in der Kletterhalle (`climb/climbHall.ts`): Was
 * Kachelform hat, kommt aufs Gitter, und was keine hat, bleibt draußen. Eine
 * **Kurve ist kein Kachelrechteck**, der Asphalt der Strecke ist deshalb
 * weiterhin ein Band entlang der Mittellinie (`KartWorld.ribbon`) — aber die
 * Mittellinie selbst liegt jetzt auf dem Raster, weil sie aus Kachel-Teilen
 * gelegt wird (`kartCourse.ts`). Alles andere hier ist gerastert, und das ist
 * mehr, als es klingt: Wiese, Gasse, Boxen, Dach, Säulen, Mauern und die
 * Tafeln, an denen ein Portal haftet.
 *
 * **Böden sind Massen und keine tausend Kacheln** — derselbe Grund wie im
 * Schießstand (`range/rangeStand.ts`): Tausend Bodenplatten wären tausend
 * Körper in der Physik für eine Wiese, über die man geradeaus fährt, und
 * portalfähig kann ohnehin nur eine große Fläche sein. Die Navigationskarte
 * kostet das nichts — sie wird ohnehin aus der gebauten Geometrie abgetastet
 * (`PortalWorld.bakeNavigation`), und eine Masse ist Geometrie wie jede andere.
 */

/** Wie hoch das Dach über den Boxen hängt. */
export const BOX_ROOF = 3.2;
/** Wo die Oberkante des Asphalts liegt — knapp über der Wiese. */
export const TARMAC_TOP = 0.02;

export function kartPit(): GridPlan {
  const plan = new GridPlan([0]);

  // Die Wiese, auf der alles steht: eine Masse, portalfähig, mit der Oberkante
  // knapp unter null, damit sie sich mit dem Asphalt darüber nicht um jedes
  // Pixel streitet.
  plan.mass('floor', KART_FIELD, -0.4, -0.02, { portal: true });

  // Der Asphalt der Gasse. Er stößt kachelbündig an den Streckenkorridor —
  // was man sieht, ist genau die Fläche, auf der ein Kart fahren darf
  // (`kartCourse.ts`, `PIT_APRON`).
  plan.mass('stone', PIT_LANE, -0.06, TARMAC_TOP);
  plan.mass('stone', PIT_BOXES, -0.06, TARMAC_TOP);

  // Rückwand und die beiden Giebelseiten der Boxen. Nach Osten bleibt offen —
  // dort stehen die Karts.
  plan.run(PIT_BOXES.x, PIT_BOXES.z, PIT_BOXES.d, 'z', (x, z) => plan.wall(x, z, DIR_W));
  const boxEnd = PIT_BOXES.z + PIT_BOXES.d - 1;
  plan.run(PIT_BOXES.x, PIT_BOXES.z, PIT_BOXES.w, 'x', (x, z) => plan.wall(x, z, DIR_N));
  plan.run(PIT_BOXES.x, boxEnd, PIT_BOXES.w, 'x', (x, z) => plan.wall(x, z, DIR_S));

  // Ein Dach über beide Kachelreihen, auf Säulen an der offenen Seite. Die
  // Säulen stehen **zwischen** den Buchten und nicht darin — genau dafür ist
  // zwischen zwei Buchten eine Kachel Luft.
  plan.mass('wood', PIT_BOXES, BOX_ROOF, BOX_ROOF + 0.22);
  const front = PIT_BOXES.x + PIT_BOXES.w - 1;
  for (let z = PIT_BOXES.z; z <= boxEnd; z++) {
    if (PIT_BAYS.includes(z)) {
      // In der Bucht selbst: die helle Tafel an der Rückwand. Sie ist das
      // Einzige neben dem Boden, woran hier ein Portal haftet — und sie hängt
      // dort, wo man ohnehin hinschaut, wenn man zu seinem Kart geht.
      plan.put('panel', PIT_BOXES.x, z, DIR_W);
      continue;
    }
    plan.put('pillar', front, z, DIR_N, 0, BOX_ROOF);
  }

  // Ein Regal und eine Bank an der Rückwand, in zwei der Trennkacheln: das,
  // was in einer Box herumsteht — und dieselben Bausteine, die im Schießstand
  // und im Dunkelhaus auch stehen.
  plan.put('shelf', PIT_BOXES.x, PIT_BOXES.z + 1, DIR_W);
  plan.put('bench', PIT_BOXES.x, boxEnd - 1, DIR_W);

  // **Die Mauern der Gasse.** Vorn und hinten hört sie auf, und dort steht
  // etwas — sonst wäre die Grenze, an der ein Kart zurückgesetzt wird
  // (`confineToCourse`), unsichtbar. Nach Osten bleibt sie offen: das *ist*
  // die Ausfahrt. Nach Westen steht eine Mauer überall, wo keine Box ist.
  const laneEnd = PIT_LANE.z + PIT_LANE.d - 1;
  plan.run(PIT_LANE.x, PIT_LANE.z, PIT_LANE.w, 'x', (x, z) => {
    plan.put('parapet', x, z, DIR_N);
    plan.put('parapet', x, laneEnd, DIR_S);
  });
  for (let z = PIT_LANE.z; z <= laneEnd; z++) {
    if (z >= PIT_BOXES.z && z <= boxEnd) continue;
    plan.put('parapet', PIT_LANE.x, z, DIR_W);
  }

  return plan;
}
