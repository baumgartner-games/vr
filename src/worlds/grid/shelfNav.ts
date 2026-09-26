import type { NavGraph } from '../nav/navGraph';
import type { Dir, TileKey } from '../nav/navTile';

/**
 * **Die geraden Wände aus dem Regal im Graphen der NPCs.**
 *
 * Der Graph wird aus den Quadern des Plans abgetastet
 * (`PortalWorld.bakeNavigation`) — eine Wand aus dem Regal ist keiner davon,
 * und die Testwelt hat seit dem Wunsch _„nur noch mit den kaykit wänden"_
 * keine anderen mehr. Die grobe Planung lief deshalb quer durch jede gerade
 * Regalwand, der Weg auf Zellen im Schlauch darum (`nav/cellRoute.ts`) fand
 * keinen Durchlass, und der NPC blieb vor der Wand stehen, an der ihn das
 * Gitter aufhielt. Gewünscht: _„die sollen sich ja auch so wie ein Spieler
 * bewegen können z.B. bei der Test Welt zwischen zwei 45° Wänden"_.
 *
 * Jetzt steht jede gerade Regalwand als Wand im Graphen — wo dort nicht schon
 * eine ist; eine Tür des Plans bleibt eine Tür. Die schrägen brauchen das
 * nicht: Sie kommen über `NavGraph.slopeAt`, und die grobe Wegsuche teilt
 * ihre Kachel in zwei Hälften (`navPath.slopeHalf`). Was beim letzten Mal
 * eingetragen wurde (`was`), kommt vorher wieder heraus — eine Wand aus dem
 * Regal kann umgestellt werden.
 */
export interface ShelfNavStamp {
  readonly graph: NavGraph;
  /** Die Wände, die eingetragen wurden. */
  readonly walls: ReadonlyArray<readonly [TileKey, Dir]>;
}

export function shelfWallsToNav(
  graph: NavGraph,
  edges: Iterable<readonly [TileKey, Dir]>,
  was: ShelfNavStamp | null,
): ShelfNavStamp {
  if (was && was.graph === graph) for (const [key, dir] of was.walls) graph.clearWall(key, dir);
  const walls: Array<readonly [TileKey, Dir]> = [];
  for (const [key, dir] of edges) {
    if (graph.wall(key, dir)) continue;
    graph.setWall(key, dir, { kind: 'solid' });
    walls.push([key, dir]);
  }
  return { graph, walls };
}

/**
 * **Auf welcher Etage eine Wand aus dem Regal steht** — nach der Höhe ihrer
 * Unterkante, nicht nach der Kachel unter ihrer Mitte. Die Mitte liegt auf
 * einer Fuge, und die Kachel dahinter ist am Rand eines Podests Luft: Dann
 * fand `NavGraph.at` nur den Boden darunter, und die Brüstung oben sperrte
 * die Kante unten (Test Navigation, Podest der Treppe).
 */
export function wallLevel(graph: NavGraph, bottom: number): number {
  let level = 0;
  for (let l = 1; l < graph.levels.length; l++)
    if (Math.abs(graph.levelY(l) - bottom) < Math.abs(graph.levelY(level) - bottom)) level = l;
  return level;
}
