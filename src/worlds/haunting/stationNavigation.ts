import type { NavGraph } from '../nav/navGraph';
import { AGENT_CELLS, stationCellGrid } from './map/stationCells';
import { CELL, cellCentre, snapCell, type CellGrid, type CellPos } from '../nav/cellGrid';
import { keyLevel, tileCentreX, tileCentreZ, type TileKey } from '../nav/navTile';
import type { RoutePath, RoutePose } from './navmesh/route';
import type { HouseSpec } from './house';
import { pullString } from './navmesh';
import { pointSegmentDistance } from './navmesh/snapshotClearance';
import type { FloorPoint } from './stationLayout';

/**
 * **Die Wegsuche der Station — auf dem Zellgitter** (`nav/cellGrid.ts`).
 *
 * Dieselbe Rechnung wie für jede Figur in jeder Welt: Ein Block von
 * `AGENT_CELLS` halben Kacheln je Seite sucht über acht Nachbarn einen Weg,
 * Wände und Türen aus dem Graphen (`graph`, samt der gesperrten Türen), die
 * Einrichtung als gesperrte Zellen (`map/stationCells.ts`). Was die Suche
 * findet, kann die Bewegung gehen — beide fragen dasselbe Gitter
 * (`moveOnCells`). Bis hierher suchte die Station auf einem eigenen Raster von
 * 0,25 m mit einem Halbmesser um jeden Körper; das gab Wege, die ein Block
 * von einem Meter nicht gehen konnte, und ein Monster, das an ihnen
 * festhing.
 *
 * Kein Weg ans Ziel heißt: der beste Teilweg, bis vor das, was zu ist — nie
 * ein Sprung und nie eine Gerade durch die Wand. `avoid` macht eine Stelle
 * teuer, nicht unpassierbar (siehe `RouteAvoid`).
 *
 * `smooth` zieht den Zellweg gerade (`navmesh/pathSmoothing.ts`), soweit der
 * Block auf der Geraden überall frei ist und die Gerade nicht durch den Kern
 * geht; `false` behält die Ecken des Gitters.
 */

/**
 * **Eine Stelle, die man meiden möchte** — teuer, nicht verboten. Der
 * Aufschlag je Rasterschritt ist `weight` in der Mitte und fällt zum Rand des
 * `radius` linear auf null. Ein Schritt kostet sonst 1, ein Meter also vier:
 * `weight = 4` heißt „ein Meter neben der Gefahr ist so teuer wie ein Meter
 * Umweg".
 *
 * **Und in der Mitte steht ein Kern** (`core`), in dem jeder Rasterschritt
 * pauschal `coreWeight` kostet — voreingestellt tausend. Der weiche Trichter
 * allein war zu wenig: Vier Kosten je Schritt sind ein Meter Umweg, und wer
 * fliehen will, nimmt dafür jederzeit den Gang *durch* den Verfolger. Der Kern
 * ist die Schlagreichweite plus eine Kachel; er bleibt endlich teuer und damit
 * passierbar, denn eine Wand, die sich bewegt, sperrt irgendwann jemanden ein.
 * Tausend Kosten sind dabei über zweihundert Meter Umweg — so weit ist keine
 * Station, also wird der Kern nur betreten, wenn es *gar* keinen Weg daneben
 * gibt.
 *
 * Der Kern gilt auch für den Schnurzug: Was der A* umgangen hat, darf die
 * Glättung nicht wieder geradeziehen (`coreCrossed`).
 */
export interface RouteAvoid {
  at: FloorPoint;
  radius: number;
  weight: number;
  /** Der harte Kern in Metern — 0 oder fehlend heißt: nur der weiche Trichter. */
  core?: number;
  /** Was ein Rasterschritt im Kern kostet; ohne Angabe `CORE_WEIGHT`. */
  coreWeight?: number;
}

/**
 * **Was ein Rasterschritt im Kern kostet**, wenn niemand etwas anderes sagt.
 * Ein Schritt ist 0,25 m und kostet sonst 1 — tausend sind also 250 m Umweg.
 */
export const CORE_WEIGHT = 1000;

/** Ob die Strecke von `a` nach `b` durch den harten Kern führt. */
export function coreCrossed(avoid: RouteAvoid | null, a: FloorPoint, b: FloorPoint): boolean {
  const core = avoid?.core ?? 0;
  if (!avoid || !(core > 0)) return false;
  return pointSegmentDistance(avoid.at, a, b) < core;
}

export function stationRoute(
  spec: HouseSpec,
  graph: NavGraph,
  from: RoutePose,
  goal: TileKey | FloorPoint,
  // Früher der Halbmesser des Körpers auf dem Raster; auf dem Zellgitter ist
  // die Größe der Block (`AGENT_CELLS`), und die Zahl bleibt nur, damit die
  // Aufrufer sich nicht ändern müssen.
  _clearance = 0.3,
  smooth = true,
  avoid: RouteAvoid | null = null,
): RoutePath {
  const empty = (grounded: boolean): RoutePath => ({ points: [], complete: false, grounded });
  if (
    !Number.isFinite(from.x + from.z) ||
    (typeof goal === 'number' ? keyLevel(goal) !== 0 : !Number.isFinite(goal.x + goal.z))
  )
    return empty(false);
  const grid = cellsOf(spec, graph);
  const start = grid.nearestFree(from.x, from.z, 0, 4, AGENT_CELLS);
  if (!start) return empty(false);
  const target =
    typeof goal === 'number'
      ? { x: tileCentreX(goal), z: tileCentreZ(goal) }
      : { x: goal.x, z: goal.z };
  const end =
    grid.nearestFree(target.x, target.z, 0, 4, AGENT_CELLS) ?? snapCell(target.x, target.z);
  const found = grid.search(start, end, 0, AGENT_CELLS, (at) => dread(avoid, cellCentre(at)));
  const points = corners(found.path).map((at) => cellCentre(at));
  if (found.complete && points.length) {
    // Das letzte Stück geht auf den genauen Punkt, wenn er beim Zielblock liegt
    // und der Block ihn frei erreicht.
    const last = points[points.length - 1]!;
    if (Math.hypot(last.x - target.x, last.z - target.z) <= CELL && lineClear(grid, last, target))
      points.push(target);
  }
  // Wer mitten auf einem Stück neu plant, soll nicht zur letzten Zelle zurück.
  while (
    points.length > 1 &&
    !coreCrossed(avoid, from, points[1]!) &&
    lineClear(grid, from, points[1]!)
  )
    points.shift();
  if (points[0] && Math.hypot(points[0].x - from.x, points[0].z - from.z) < 0.001) points.shift();
  // **Was der A* umgangen hat, zieht die Glättung nicht wieder gerade.** Der
  // Kern ist für die Glättung eine Wand, obwohl er für die Suche nur teuer ist.
  const free = (a: FloorPoint, b: FloorPoint): boolean =>
    !coreCrossed(avoid, a, b) && lineClear(grid, a, b);
  const pulled = smooth ? pullString(from, points, free, { tight: free }) : points;
  return { points: pulled, grounded: true, complete: found.complete };
}

/** Das Gitter je Graph — der Graph ändert sich, das Gitter liest ihn live. */
const grids = new WeakMap<NavGraph, { spec: HouseSpec; grid: CellGrid }>();

function cellsOf(spec: HouseSpec, graph: NavGraph): CellGrid {
  const known = grids.get(graph);
  if (known && known.spec === spec) return known.grid;
  const grid = stationCellGrid(spec, graph);
  grids.set(graph, { spec, grid });
  return grid;
}

/**
 * **Ob ein Block auf der Geraden von `a` nach `b` überall frei ist** — in
 * Schritten von einer Viertelzelle abgetastet. Dieselbe Frage, die die
 * Bewegung jedes Bild stellt (`moveOnCells`).
 */
function lineClear(grid: CellGrid, a: FloorPoint, b: FloorPoint): boolean {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(1, Math.ceil(length / (CELL / 4)));
  let last: CellPos | null = null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const at = snapCell(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, AGENT_CELLS);
    if (last && last.cx === at.cx && last.cz === at.cz) continue;
    last = at;
    if (!grid.footprintFree(at, 0, AGENT_CELLS)) return false;
  }
  return true;
}

/** Nur die Stellungen, an denen der Block die Richtung wechselt — und die Enden. */
function corners(path: readonly CellPos[]): CellPos[] {
  if (path.length <= 2) return [...path];
  const out: CellPos[] = [path[0]!];
  for (let i = 1; i < path.length - 1; i++) {
    const a = path[i - 1]!,
      b = path[i]!,
      c = path[i + 1]!;
    if (b.cx - a.cx !== c.cx - b.cx || b.cz - a.cz !== c.cz - b.cz) out.push(b);
  }
  out.push(path[path.length - 1]!);
  return out;
}

/**
 * **Was ein Meter an dieser Stelle zusätzlich kostet** — der Trichter um die
 * Gefahr und ihr Kern. Ein Schritt kostet sonst seine Länge in halben Metern;
 * die alten Zahlen rechneten je Viertelmeter, und damit sie weiter gelten,
 * wird der Aufschlag verdoppelt (ein halber Meter sind zwei Viertel).
 */
function dread(avoid: RouteAvoid | null, at: FloorPoint): number {
  if (!avoid) return 0;
  const core = avoid.core ?? 0;
  if (!(avoid.radius > 0 && avoid.weight > 0) && !(core > 0)) return 0;
  const d = Math.hypot(at.x - avoid.at.x, at.z - avoid.at.z);
  const hard = core > 0 && d < core ? (avoid.coreWeight ?? CORE_WEIGHT) : 0;
  const soft = d < avoid.radius && avoid.weight > 0 ? avoid.weight * (1 - d / avoid.radius) : 0;
  return hard + soft;
}
