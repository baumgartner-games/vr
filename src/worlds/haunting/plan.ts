import { GridPlan } from '../grid/gridPlan';
import { PLAN_WALL_H } from '../editor/levelPlan';
import { DIR_E, DIR_S } from '../nav/navTile';
import { APRON, HOUSE, roomAt, tilesOf, type HouseSpec, type MarkId } from './house';
import { FLYER_PROFILE } from '../nav/navProfile';
import type { BlockKind } from '../grid/blocks';

/**
 * **Vom Bauplan zum Kachelgitter.**
 *
 * Die eine Übersetzung, die zwischen dem Generator (`house.ts`, ohne
 * three.js) und allem anderen steht: Zimmer werden zu Wänden, Türen zu Türen
 * im Graphen, Merkmale zu Bausteinen. Danach ist es ein ganz normaler
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
 * **Ein Merkmal ist ein Baustein.** Damit stimmen drei Sachen von selbst, die
 * sonst einzeln nachzupflegen wären: Es steht wirklich im Weg, die Kachel
 * darunter ist für einen Verfolger teurer, und man sieht es. Woran man ein
 * Klavier von einer Werkbank unterscheidet, ist eine Frage der Farbe und
 * kommt oben drauf (`marks.ts`) — nicht eine von vierzehn Geometrien.
 */
export function housePlan(spec: HouseSpec, shut: ReadonlySet<string> = new Set()): GridPlan {
  const plan = new GridPlan([0]);
  plan.room(HOUSE, { walls: true, ceiling: PLAN_WALL_H });
  // **Der Vorplatz vor der Haustür** — Boden ohne Wände und ohne Decke. Er ist
  // der einzige Grund, aus dem es für die Wegsuche einen Van gibt: Ohne ihn
  // müsste die Drohne im Haus starten, käme nie heraus, und „zurück zum Van"
  // wäre eine Sonderregel statt eines Fluges. Die Haustür bleibt dabei genau
  // das, was sie ist — wer sie zumacht, sperrt die Drohne aus.
  plan.floor(APRON);
  innerWalls(plan, spec);

  for (const door of spec.doors) {
    plan.door(door.x, door.z, door.dir, 0, !shut.has(door.id));
  }

  for (const room of spec.rooms) {
    for (const mark of room.marks) plan.put(blockFor(mark.id), mark.x, mark.z, mark.dir);
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
 * Welcher Baustein unter einem Merkmal steht.
 *
 * Sechs Sorten für vierzehn Merkmale, und das ist Absicht: Die Silhouette sagt
 * *wie hoch und wie tief*, die Farbe sagt *was*. Vierzehn eigene Geometrien
 * wären vierzehn Stellen, an denen ein Möbel einen halben Meter neben seiner
 * Kachel steht.
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
