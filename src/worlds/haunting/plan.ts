import { GridPlan } from '../grid/gridPlan';
import { PLAN_WALL_H } from '../editor/levelPlan';
import { DIR_E, DIR_N, DIR_S, DIR_W } from '../nav/navTile';
import { APRON, HOUSE, roomAt, spacesOf, tilesOf, type HouseSpec, type MarkId } from './house';
import { FLYER_PROFILE } from '../nav/navProfile';
import type { BlockKind } from '../grid/blocks';
import type { PlanSolid } from '../grid/solids';
import { TRAINING_DOOR, TRAINING_ROOMS } from './trainingLayout';

/** Open station leaves retract into their frame instead of swinging into a route. */
class StationPlan extends GridPlan {
  override solids(): PlanSolid[] {
    const retracted = new Set<string>();
    for (const [, wall] of this.graph.wallEntries()) {
      if (wall.kind === 'door' && wall.open) retracted.add(wall.id);
    }
    return super.solids().filter((solid) => !solid.door || !retracted.has(solid.door));
  }
}

/**
 * **Vom Bauplan zum Kachelgitter.**
 *
 * Die eine Übersetzung, die zwischen dem Generator (`house.ts`, ohne
 * three.js) und allem anderen steht: Zimmer werden zu Wänden, Türen zu Türen
 * im Graphen. Danach ist es ein ganz normaler
 * `GridPlan`, und ab da weiß niemand mehr, dass er gewürfelt wurde — die Welt
 * baut ihn wie den des Dunkelhauses, der Navigationsgraph tastet ihn ab, und
 * der Editor könnte ihn öffnen.
 *
 * **Wände entstehen aus Nachbarschaft und nicht aus einer Liste.** Für jede
 * Kachelkante wird gefragt, ob links und rechts dasselbe Zimmer liegt; wo
 * nicht, steht eine Wand. Eine Wandliste, die der Generator mitschickte,
 * müsste bei jeder Änderung am Zuschnitt nachgezogen werden — und wäre beim
 * ersten Mal, an dem sie es nicht wird, ein Haus mit einem Loch.
 *
 * **Einrichtung hat eigene Maße.** Die Raumstation verwendet vollständige
 * Modelle aus `fixtureModels.ts`. Position, Drehung, Kollisionsfläche und
 * freie Zugänge kommen aus `stationLayout.ts`. Zusätzliche Raster-Bausteine
 * unter diesen Modellen würden Türen versperren und Flächen doppelt zeichnen.
 * Dieser Plan beschreibt deshalb nur die begehbare Hülle.
 */
export function housePlan(
  spec: HouseSpec,
  shut: ReadonlySet<string> = new Set(),
  test = false,
): GridPlan {
  const plan = new StationPlan([0]);
  if (spec.passages) {
    for (const room of spacesOf(spec)) plan.room(room.rect, { walls: true, ceiling: PLAN_WALL_H });
  } else plan.room(HOUSE, { walls: true, ceiling: PLAN_WALL_H });
  // Die geschlossene Einsatzzentrale bleibt Teil des Missionsgraphen, damit
  // die Drohne durch dieselbe Tür zurückkehrt wie der Techniker.
  plan.room(APRON, { walls: true, ceiling: PLAN_WALL_H });
  // Der Testdeck-Aufzug liegt in der Zentrale; die Lehrzimmer selbst liegen
  // mit eigenen Böden, Wänden und Decken weit außerhalb der Missionskarte.
  for (const x of [-3, -2, -1, 0, 1]) plan.window(x, 4, DIR_S);
  // Ein einzelner Aufzugsschacht, keine Trennwand quer durch die Zentrale:
  // Die zufällige Missionstür kann auch östlich dieses Aufzugs liegen.
  plan.wall(2, 4, DIR_N);
  plan.wall(2, 4, DIR_E);
  plan.door(2, 4, DIR_W, 0, test);
  if (test) {
    for (const room of TRAINING_ROOMS) {
      plan.room(room, { walls: true, ceiling: PLAN_WALL_H });
    }
  }
  if (test)
    plan.door(TRAINING_DOOR.x, TRAINING_DOOR.z, TRAINING_DOOR.dir, 0, !shut.has(TRAINING_DOOR.id));
  if (!spec.passages) innerWalls(plan, spec);

  for (const door of spec.doors) {
    plan.door(door.x, door.z, door.dir, 0, !shut.has(door.id));
  }

  // **Die Fenster kommen nach den Wänden.** Sie ersetzen eine Kante, die schon
  // steht — wer sie vorher setzte, bekäme sie von `plan.room(…, { walls: true })`
  // wieder zugemauert. Sie halten auf wie eine Wand (auch die Drohne), lassen
  // aber Sicht und Geräusch durch, und genau daran hängt, wozu sie hier gut
  // sind: Wer im dunklen Haus steht, sieht darin das Abendlicht über dem
  // Vorplatz und weiß, an welcher Seite des Hauses er klebt.
  for (const win of spec.windows) {
    plan.window(win.x, win.z, win.dir);
  }

  return plan;
}

/** Die Wände zwischen den Zimmern — überall, wo zwei verschiedene aneinanderstoßen. */
function innerWalls(plan: GridPlan, spec: HouseSpec): void {
  for (const tile of tilesOf(HOUSE)) {
    const here = roomAt(spec, tile.x, tile.z);
    if (!here) continue;
    // Nur nach Osten und Süden gefragt: Jede Kante gehört zwei Kacheln, und
    // wer beide Richtungen abläuft, setzt jede Wand zweimal.
    const east = roomAt(spec, tile.x + 1, tile.z);
    if (east && east.id !== here.id) plan.wall(tile.x, tile.z, DIR_E);
    const south = roomAt(spec, tile.x, tile.z + 1);
    if (south && south.id !== here.id) plan.wall(tile.x, tile.z, DIR_S);
  }
}

/**
 * Historische Zuordnung für Werkzeuge, die alte Hausmerkmale darstellen.
 * Der Raumstationsplan erzeugt diese Bausteine nicht mehr.
 */
export function blockFor(mark: MarkId): BlockKind {
  switch (mark) {
    case 'buecher':
      return 'shelf';
    case 'dusche':
    case 'standuhr':
      return 'pillar';
    case 'ofen':
    case 'spuele':
    case 'kamin':
      return 'counter';
    case 'werkbank':
    case 'klavier':
    case 'esstisch':
      return 'table';
    case 'kiste':
      return 'crate';
    default:
      // Wanne, Bett, Sessel, Schaukelpferd: alles, was niedrig ist.
      return 'bench';
  }
}

/**
 * **Wie eine Drohne durch das Haus kommt.**
 *
 * Der Flieger aus `nav/navProfile.ts`, mit einer einzigen Änderung:
 * `opens: false`. Sie fliegt über jedes Möbel und jede Stufe hinweg — aber sie
 * hat keine Hände und macht keine Tür auf. Damit hängt ihre Reichweite an dem,
 * was der VR-Spieler und der Hacker offen gelassen haben, und das ist eine
 * Abhängigkeit in beide Richtungen, für die es keine einzige Sonderregel
 * braucht.
 *
 * Steht hier und nicht in der Welt, damit ein Test sie ohne three.js
 * nachrechnen kann: Dass eine geschlossene Tür die Drohne wirklich aufhält,
 * ist eine Spielregel und keine Kulisse.
 */
export const DRONE_PROFILE = { ...FLYER_PROFILE, id: 'drone', label: 'Drohne', opens: false };
