import { CellGrid, FOOTPRINT, cellCentre, type CellPos, type CellSource } from './cellGrid';
import type { NavGraph } from './navGraph';
import type { PathPoint } from './navPath';
import {
  DIR_E,
  DIR_N,
  DIR_S,
  DIR_W,
  NO_TILE,
  TILE_MAX,
  TILE_MIN,
  keyLevel,
  keyX,
  keyZ,
  tileCentreX,
  tileCentreZ,
  tileIndexAt,
  tileKey,
  wallKey,
  type Dir,
  type TileKey,
} from './navTile';

/**
 * **Der Weg eines NPC auf halben Kacheln — als Block, Vorgabe 2×2** (`cellGrid.ts`, `size`).
 *
 * Die Wegsuche über ganze Kacheln (`navPath.findPath`) bleibt die grobe
 * Planung, denn nur sie weiß, was ein NPC glaubt (`navBelief.ts`), welche Tür
 * er aufbekommt und wo Treppen, Sprünge und Portale hinführen. Heraus kommt
 * eine Kette von Kacheln. **Gelaufen wird aber auf Zellen**: In einem Schlauch
 * aus diesen Kacheln und ihren Nachbarn sucht `CellGrid.findPath` den Weg
 * eines 2×2-Blocks — in acht Richtungen, an Schrägen schräg entlang, auf der
 * Fuge zweier Kacheln, wo keine Wand ist. Wo die Kacheln über eine Verbindung
 * springen (Treppe, Portal, Sprung, andere Etage), endet ein Stück, und das
 * nächste fängt drüben an; beide Enden bleiben feste Punkte, damit der Agent
 * den Sprung dort erkennt, wo er ihn bisher erkannt hat (`navAgent.hop`).
 *
 * **Der Schlauch reicht eine Kachel über den Weg hinaus**, weil ein Block von
 * einem Meter, der um eine halbe Kachel versetzt steht, in die Nachbarkachel
 * ragt. Weiter nicht: Die grobe Planung hat entschieden, wo es langgeht, und
 * die feine soll nicht durch einen Raum ausweichen, von dem die grobe nichts
 * weiß.
 *
 * Aus den Zellen werden Wegpunkte, indem gerade Strecken zusammenfallen: Ein
 * Punkt steht nur dort, wo der Block die Richtung wechselt. Diese Punkte sind
 * **eng** (`PathPoint.tight`) — dort ist eine Ecke, und wer sie abhakt, bevor
 * er an ihr vorbei ist, schneidet sie.
 *
 * `null` heißt: In diesem Schlauch passt kein 2×2-Block durch (ein Durchlass,
 * schmaler als ein Meter). Dann nimmt der Agent den alten Schnurzug über
 * Kacheln (`navPath.pullString`), statt stehen zu bleiben.
 */
export function cellRoute(
  graph: NavGraph,
  tiles: readonly TileKey[],
  from: { x: number; z: number },
  goal: { x: number; z: number } | null,
  size = FOOTPRINT,
): PathPoint[] | null {
  if (tiles.length === 0) return null;
  const runs = splitRuns(graph, tiles);
  const out: PathPoint[] = [];
  for (let r = 0; r < runs.length; r++) {
    const run = runs[r]!;
    const level = keyLevel(run[0]!);
    const grid = new CellGrid(corridorSource(graph, run));
    const first = run[0]!,
      last = run[run.length - 1]!;
    const start =
      r === 0
        ? grid.nearestFree(from.x, from.z, level, 4, size)
        : grid.nearestFree(centreX(first), centreZ(first), level, 4, size);
    // Das Ziel gilt nur, wenn es wirklich im letzten Stück liegt — ein Weg,
    // der davor abbricht, endet an seiner letzten Kachel.
    const aimsGoal = r === runs.length - 1 && goal !== null && graph.at(goal.x, goal.z) === last;
    const end = aimsGoal
      ? grid.nearestFree(goal.x, goal.z, level, 4, size)
      : grid.nearestFree(centreX(last), centreZ(last), level, 4, size);
    if (!start || !end) return null;
    const path = grid.findPath(start, end, level, size);
    if (!path) return null;
    const kept = corners(path);
    kept.forEach((at, i) => {
      const { x, z } = cellCentre(at, size);
      // Die Enden gehören zu ihrer Kachel des groben Wegs: Daran erkennt der
      // Agent eine Verbindung (`navAgent.hop`) und die Tür vor sich.
      const tile = i === 0 ? first : i === kept.length - 1 ? last : tileAt(x, z, level);
      out.push({ tile, x, z, tight: i > 0 && i < kept.length - 1 });
    });
  }
  return out;
}

/**
 * **Wo ein Schritt keiner ist**, wird geteilt: andere Etage, keine direkte
 * Nachbarschaft oder eine Wand dazwischen, an der eine Verbindung hängt.
 */
function splitRuns(graph: NavGraph, tiles: readonly TileKey[]): TileKey[][] {
  const runs: TileKey[][] = [[tiles[0]!]];
  for (let i = 1; i < tiles.length; i++) {
    const a = tiles[i - 1]!,
      b = tiles[i]!;
    if (walks(graph, a, b)) runs[runs.length - 1]!.push(b);
    else runs.push([b]);
  }
  return runs;
}

function walks(graph: NavGraph, a: TileKey, b: TileKey): boolean {
  if (keyLevel(a) !== keyLevel(b)) return false;
  const dx = keyX(b) - keyX(a),
    dz = keyZ(b) - keyZ(a);
  if (Math.abs(dx) + Math.abs(dz) !== 1) return false;
  const wall = graph.wall(a, stepDir(a, b));
  return !wall || wall.kind === 'door';
}

/** Die Richtung von einer Kachel zu ihrer Nachbarin. */
function stepDir(a: TileKey, b: TileKey): Dir {
  const dx = keyX(b) - keyX(a),
    dz = keyZ(b) - keyZ(a);
  return dx > 0 ? DIR_E : dx < 0 ? DIR_W : dz > 0 ? DIR_S : DIR_N;
}

/**
 * **Die Zellen im Schlauch um ein Stück des Weges.**
 *
 * Boden ist, was der Graph für begehbar hält *und* im Schlauch liegt. Eine
 * Tür gilt als offen — ob sie aufgeht, hat die grobe Planung schon gefragt,
 * und vor ihr kümmert sich der Agent darum (`navAgent.doorAhead`). Wand und
 * Fenster halten auf.
 */
function corridorSource(graph: NavGraph, run: readonly TileKey[]): CellSource {
  const level = keyLevel(run[0]!);
  // **Offen ist nur die Tür, durch die der grobe Weg geht.** Eine andere Tür
  // im Schlauch ist womöglich genau die verriegelte, um die er herumführt.
  const crossed = new Set<number>();
  for (let i = 1; i < run.length; i++) {
    const a = run[i - 1]!,
      b = run[i]!;
    crossed.add(wallKey(a, stepDir(a, b)));
  }
  // Der Weg selbst gehört ganz dazu; seine Nachbarn nur, wo nichts Gefährliches
  // liegt — die grobe Planung hat die Grube neben dem Weg mit Absicht
  // gemieden, und ein Block, der hineinragt, stünde mit einem Fuß darin.
  const path = new Set<TileKey>(run);
  const inside = new Set<TileKey>(run);
  for (const key of run)
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        const x = keyX(key) + dx,
          z = keyZ(key) + dz;
        if (x < TILE_MIN || x > TILE_MAX || z < TILE_MIN || z > TILE_MAX) continue;
        const near = tileKey(x, z, level);
        if (path.has(near) || (graph.tile(near)?.hazard ?? 0) !== 0) continue;
        inside.add(near);
      }
  const keyOf = (tx: number, tz: number, l: number): TileKey =>
    tx < TILE_MIN || tx > TILE_MAX || tz < TILE_MIN || tz > TILE_MAX ? NO_TILE : tileKey(tx, tz, l);
  return {
    floor(tx, tz, l) {
      const key = keyOf(tx, tz, l);
      return key !== NO_TILE && inside.has(key) && graph.walkable(key);
    },
    open(tx, tz, dir, l) {
      const key = keyOf(tx, tz, l);
      if (key === NO_TILE) return false;
      const wall = graph.wall(key, dir);
      if (!wall) return true;
      return wall.kind === 'door' && crossed.has(wallKey(key, dir));
    },
    slope(tx, tz, l) {
      const key = keyOf(tx, tz, l);
      return key === NO_TILE ? null : graph.slopeAt(key);
    },
  };
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

function centreX(key: TileKey): number {
  return tileCentreX(key);
}

function centreZ(key: TileKey): number {
  return tileCentreZ(key);
}

function tileAt(x: number, z: number, level: number): TileKey {
  return tileKey(tileIndexAt(x), tileIndexAt(z), level);
}
