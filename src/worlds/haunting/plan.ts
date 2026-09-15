import { GridPlan } from '../grid/gridPlan';
import { PLAN_WALL_H } from '../editor/levelPlan';
import { DIR_E, DIR_N, DIR_S, DIR_W } from '../nav/navTile';
import {
  APRON,
  APRON_OUTER,
  COMMAND_LIFT,
  HOUSE,
  roomAt,
  spacesOf,
  STATION_DOOR_W,
  tilesOf,
  type HouseSpec,
} from './house';
import type { PlanSolid } from '../grid/solids';
import { TILE } from '../nav/navTile';
import { TRAINING_DOOR, TRAINING_ROOMS } from './trainingLayout';

/** Open station leaves retract into their frame instead of swinging into a route. */
class StationPlan extends GridPlan {
  /** Eine ganze Kachelkante — wie auf der Karte (`house.STATION_DOOR_W`). */
  override doorWidth(): number {
    return STATION_DOOR_W;
  }

  /**
   * **Die Hülle in wenigen Quadern statt in fünfeinhalbtausend.**
   *
   * `GridWorld` baut je Bodenkachel und je Wandkante einen Quader, jeden mit
   * Körper und Zeichenaufruf. Auf dem 1-m-Gitter wären das rund 4 500 Böden
   * und 1 000 Wandstücke — und bündeln (`batchGridGeometry`) darf die Station
   * sie nicht mehr, weil das Wand-Ghosting der Ansicht von oben einzelne
   * Quader durchsichtig schaltet, und in einem Bündel ist kein Quader
   * einzeln. Also werden hier **Böden zu Rechtecken** und **Wände zu Läufen**
   * zusammengefasst: ein Boden je Raum oder Gang, eine Wand je gerader
   * Strecke zwischen zwei Unterbrechungen (Tür, Fenster, Ecke). Das Ghosting
   * macht damit eine ganze Wand durchsichtig statt eines Meters davon — was
   * ohnehin das bessere Bild ist.
   *
   * Türteile (Sturz, Blatt) und Fensterteile bleiben je Kante: Das Blatt
   * fährt (`GridWorld.setSlidingGridDoor` findet es an `PlanSolid.door`), und
   * ein Fenster ist ein Loch, das seine Nachbarn nicht teilen.
   */
  override solids(): PlanSolid[] {
    const retracted = new Set<string>();
    for (const [, wall] of this.graph.wallEntries()) {
      if (wall.kind === 'door' && wall.open) retracted.add(wall.id);
    }
    const all = super.solids().filter((solid) => !solid.door || !retracted.has(solid.door));
    const floors: PlanSolid[] = [];
    const walls: PlanSolid[] = [];
    const rest: PlanSolid[] = [];
    for (const solid of all) {
      if (solid.kind === 'floor' && solid.w === TILE && solid.d === TILE) floors.push(solid);
      else if (solid.kind === 'wall' && isPlainWall(solid)) walls.push(solid);
      else rest.push(solid);
    }
    return [...mergeFloors(floors), ...mergeWalls(walls), ...rest];
  }
}

/** Eine ganze, ungebrochene Wandkante voller Höhe — und nichts, was zu einer Tür gehört. */
function isPlainWall(solid: PlanSolid): boolean {
  if (solid.door !== undefined) return false;
  const length = Math.max(solid.w, solid.d);
  return Math.abs(length - TILE) < 1e-6 && solid.h >= PLAN_WALL_H - 1e-6;
}

/** Ein Schlüssel für alles, was gleich sein muss, damit zwei Quader einer werden. */
function likeness(solid: PlanSolid, ...more: number[]): string {
  return [
    solid.level ?? 'x',
    solid.y.toFixed(3),
    solid.h.toFixed(3),
    ...more.map((n) => n.toFixed(3)),
  ].join('|');
}

function cellKey(x: number, z: number): string {
  return `${x.toFixed(3)}:${z.toFixed(3)}`;
}

/**
 * Bodenkacheln zu Rechtecken: zeilenweise so weit nach Osten, wie es geht,
 * dann so viele Zeilen nach Süden, wie die ganze Breite noch Boden ist —
 * dieselbe Zerlegung wie bei den Gangstreifen (`house.stationRooms`).
 */
function mergeFloors(tiles: readonly PlanSolid[]): PlanSolid[] {
  const groups = new Map<string, Map<string, PlanSolid>>();
  for (const tile of tiles) {
    const key = likeness(tile);
    const group = groups.get(key) ?? new Map<string, PlanSolid>();
    group.set(cellKey(tile.x, tile.z), tile);
    groups.set(key, group);
  }
  const out: PlanSolid[] = [];
  for (const group of groups.values()) {
    const cells = new Set(group.keys());
    const sorted = [...group.values()].sort((a, b) => a.z - b.z || a.x - b.x);
    for (const start of sorted) {
      if (!cells.has(cellKey(start.x, start.z))) continue;
      let w = 1;
      while (cells.has(cellKey(start.x + w * TILE, start.z))) w++;
      const rowFull = (dz: number): boolean => {
        for (let dx = 0; dx < w; dx++)
          if (!cells.has(cellKey(start.x + dx * TILE, start.z + dz * TILE))) return false;
        return true;
      };
      let d = 1;
      while (rowFull(d)) d++;
      for (let dz = 0; dz < d; dz++)
        for (let dx = 0; dx < w; dx++)
          cells.delete(cellKey(start.x + dx * TILE, start.z + dz * TILE));
      out.push({
        ...start,
        x: start.x + ((w - 1) * TILE) / 2,
        z: start.z + ((d - 1) * TILE) / 2,
        w: w * TILE,
        d: d * TILE,
      });
    }
  }
  return out;
}

/** Wandkanten zu Läufen: Nachbarn auf derselben Linie werden ein Quader. */
function mergeWalls(walls: readonly PlanSolid[]): PlanSolid[] {
  const out: PlanSolid[] = [];
  const byLine = new Map<string, PlanSolid[]>();
  for (const wall of walls) {
    const alongX = wall.w > wall.d;
    // Die Linie: gleiche Etage, gleiche Höhe, gleiche Querkoordinate, gleiche Richtung.
    const key = likeness(wall, alongX ? wall.z : wall.x, alongX ? 1 : 0);
    const line = byLine.get(key) ?? [];
    line.push(wall);
    byLine.set(key, line);
  }
  for (const line of byLine.values()) {
    const alongX = line[0]!.w > line[0]!.d;
    line.sort((a, b) => (alongX ? a.x - b.x : a.z - b.z));
    let run: PlanSolid[] = [];
    const flush = (): void => {
      const first = run[0];
      const last = run[run.length - 1];
      if (!first || !last) return;
      const length = run.length * TILE;
      out.push({
        ...first,
        x: alongX ? (first.x + last.x) / 2 : first.x,
        z: alongX ? first.z : (first.z + last.z) / 2,
        w: alongX ? length : first.w,
        d: alongX ? first.d : length,
      });
      run = [];
    };
    for (const wall of line) {
      const previous = run[run.length - 1];
      if (previous) {
        const step = alongX ? wall.x - previous.x : wall.z - previous.z;
        if (Math.abs(step - TILE) > 1e-6) flush();
      }
      run.push(wall);
    }
    flush();
  }
  return out;
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
  // Die geschlossene Einsatzzentrale bleibt Teil des Missionsgraphen: Der
  // Techniker geht durch dieselbe Schleuse hinaus und wieder herein.
  plan.room(APRON, { walls: true, ceiling: PLAN_WALL_H });
  // Der Testdeck-Aufzug liegt in der Zentrale; die Lehrzimmer selbst liegen
  // mit eigenen Böden, Wänden und Decken weit außerhalb der Missionskarte.
  // Die Hüllenfenster sitzen in der äußeren Reihe: dort ist Weltraum, in der
  // inneren steht die Fensterfront zur Kantine.
  for (let x = APRON.x + 1; x < COMMAND_LIFT.x; x++) plan.window(x, APRON_OUTER, DIR_N);
  // Ein Aufzugsschacht von zwei mal zwei Kacheln, keine Trennwand quer durch
  // die Zentrale: Wand nach Süden und Osten, die Tür nach Westen in der
  // äußeren Reihe, eine Wand nach Westen in der inneren.
  for (let dx = 0; dx < COMMAND_LIFT.w; dx++)
    plan.wall(COMMAND_LIFT.x + dx, COMMAND_LIFT.z + COMMAND_LIFT.d - 1, DIR_S);
  for (let dz = 0; dz < COMMAND_LIFT.d; dz++)
    plan.wall(COMMAND_LIFT.x + COMMAND_LIFT.w - 1, COMMAND_LIFT.z + dz, DIR_E);
  plan.door(COMMAND_LIFT.x, COMMAND_LIFT.z, DIR_W, 0, test);
  for (let dz = 1; dz < COMMAND_LIFT.d; dz++) plan.wall(COMMAND_LIFT.x, COMMAND_LIFT.z + dz, DIR_W);
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
  // wieder zugemauert. Sie halten auf wie eine Wand, lassen
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

// **`blockFor` steht bei den Maßen**, nicht hier: Die 2D-Szene braucht die
// Höhe eines Möbels und darf dafür nicht den halben Bauplan mitladen.
export { blockFor } from './fixtureDimensions';
