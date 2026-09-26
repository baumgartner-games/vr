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
