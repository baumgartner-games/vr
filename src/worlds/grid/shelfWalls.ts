import type { GridPlan } from './gridPlan';
import type { Slope } from '../nav/cellGrid';
import { DIR_N, keyLevel, keyX, keyZ, wallDir, wallTile, type WallKey } from '../nav/navTile';

/**
 * **Wände aus dem Regal** — das eine Wandsystem der Welten auf dem Gitter.
 *
 * Gewünscht: _„Ich will nur noch mit den kaykit wänden arbeiten"_ (Testwelt)
 * und danach für Haunting: _„die haunting nutzt nicht die gleichen walls wie
 * in test welt, da in haunting die wände nicht sauber durchgängig sind. Bitte
 * sowas komplett vermeiden"_. Also stehen beide Welten aus denselben
 * Stücken: `prototype-bits/Wall.glb` (zwei Meter) und `Wall_Half.glb` (einer),
 * **ungestreckt**, auf den Fugen des Gitters, und unter 45° ein ganzes Stück
 * je Kachel (`PortalWorld.fitWall` kürzt es auf die Diagonale). Eingerastet
 * sind sie für das Zellgitter Wände wie jede andere
 * (`GridWorld.collectWalls`), und im Baukasten lassen sie sich verschieben
 * und ersetzen.
 */

export const SHELF_WALL = 'prototype-bits/Wall.glb';
export const SHELF_WALL_HALF = 'prototype-bits/Wall_Half.glb';

/** Wie hoch die Mitte einer Regalwand über ihrem Boden steht. */
export const SHELF_WALL_Y = 1.4;

/**
 * **Welche zwei Stücke eine gerade Wand legt** — ein ganzes über zwei Kacheln
 * und ein halbes über eine. Vorgabe ist die graue Prototypwand; die Test
 * Navigation legt ihre Kammern aus den Fensterwänden desselben Pakets
 * (`SHELF_WINDOW_PIECES`), damit man hineinsieht.
 */
export interface ShelfPieces {
  readonly full: string;
  readonly half: string;
}

export const SHELF_WALL_PIECES: ShelfPieces = { full: SHELF_WALL, half: SHELF_WALL_HALF };

/** Die Fensterwand aus dem Regal: zwei Kacheln und eine, Glas zum Durchsehen. */
export const SHELF_WINDOW_PIECES: ShelfPieces = {
  full: 'prototype-bits/Wall_Window_Closed.glb',
  half: 'prototype-bits/Wall_Window_Closed_Narrow.glb',
};

/** Ein Stück: Modell, Mitte in Weltmetern, Drehung in Bogenmaß. */
export interface ShelfWall {
  path: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

const ALONG_X = 0;
const ALONG_Z = Math.PI / 2;
/** „╱": die lange Achse nach Nordosten (`gridSnap.diagonalPose`). */
export const SLASH_YAW = Math.PI / 4;
/** „╲": nach Südosten. */
export const BACKSLASH_YAW = -Math.PI / 4;

/**
 * **Eine gerade Wand über `length` Kacheln** — aus ganzen Stücken, am Ende
 * ein halbes. `alongX`: auf der Fuge `z = line`, von `from` nach Osten; sonst
 * auf der Fuge `x = line`, von `from` nach Süden.
 */
export function wallRun(
  out: ShelfWall[],
  alongX: boolean,
  line: number,
  from: number,
  length: number,
  base = 0,
  pieces: ShelfPieces = SHELF_WALL_PIECES,
): void {
  let at = from;
  for (let left = length; left > 0;) {
    const piece = left >= 2 ? 2 : 1;
    const mid = at + piece / 2;
    out.push({
      path: piece === 2 ? pieces.full : pieces.half,
      x: alongX ? mid : line,
      y: base + SHELF_WALL_Y,
      z: alongX ? line : mid,
      yaw: alongX ? ALONG_X : ALONG_Z,
    });
    at += piece;
    left -= piece;
  }
}

/** **Eine Wand unter 45° durch die Kachel (`tx`, `tz`)** — ein ganzes Stück. */
export function wallSlant(out: ShelfWall[], tx: number, tz: number, slope: Slope, base = 0): void {
  out.push({
    path: SHELF_WALL,
    x: tx + 0.5,
    y: base + SHELF_WALL_Y,
    z: tz + 0.5,
    yaw: slope === 'slash' ? SLASH_YAW : BACKSLASH_YAW,
  });
}

/**
 * **Die festen Wände und Schrägen eines Plans als Regalstücke** — Türen und
 * Fenster nicht, die bleiben Teil des Plans.
 *
 * Die Kanten einer Fuge werden zu Läufen zusammengelegt, soweit sie
 * lückenlos aneinanderstoßen, und jeder Lauf aus ganzen Stücken gelegt, am
 * Ende ein halbes (`wallRun`) — so wie der Wandparcours der Testwelt.
 * `pieces` sagt, aus welchen Stücken die geraden gelegt werden; die Schrägen
 * sind immer die ganze Prototypwand.
 */
export function planShelfWalls(
  plan: GridPlan,
  pieces: ShelfPieces = SHELF_WALL_PIECES,
): ShelfWall[] {
  // Je Etage und Fuge die Stellen, an denen eine Kante zu ist.
  const lines = new Map<string, { alongX: boolean; line: number; level: number; at: number[] }>();
  for (const [key, wall] of plan.graph.wallEntries()) {
    if (wall.kind !== 'solid') continue;
    const tile = wallTile(key);
    const tx = keyX(tile),
      tz = keyZ(tile),
      level = keyLevel(tile);
    // Gespeichert an der nördlicheren bzw. westlicheren Kachel, als N oder E.
    const alongX = wallDir(key) === DIR_N;
    const line = alongX ? tz : tx + 1;
    const id = `${level}:${alongX ? 'x' : 'z'}:${line}`;
    let entry = lines.get(id);
    if (!entry) {
      entry = { alongX, line, level, at: [] };
      lines.set(id, entry);
    }
    entry.at.push(alongX ? tx : tz);
  }
  const out: ShelfWall[] = [];
  const ids = [...lines.keys()].sort();
  for (const id of ids) {
    const { alongX, line, level, at } = lines.get(id)!;
    at.sort((a, b) => a - b);
    const base = plan.graph.levelY(level);
    let start = at[0]!;
    let last = start;
    for (let i = 1; i <= at.length; i++) {
      const next = at[i];
      if (next === last + 1) {
        last = next;
        continue;
      }
      wallRun(out, alongX, line, start, last - start + 1, base, pieces);
      if (next === undefined) break;
      start = last = next;
    }
  }
  for (const { tile, slope } of plan.saveSlopes())
    wallSlant(out, keyX(tile), keyZ(tile), slope, plan.graph.levelY(keyLevel(tile)));
  return out;
}

/**
 * **Alle festen Planwände und Schrägen weg** — Türen und Fenster bleiben.
 *
 * Eine Welt aus Regalwänden (Testwelt, Haunting) hat keine Planwände: Eine
 * eingerastete Regalwand ist auf dem Zellgitter eine Wand wie jede andere
 * (`GridWorld.refreshWallSlopes`), und zwei Systeme für dieselbe Wand wären
 * genau das, was vermieden werden soll.
 */
export function clearPlanWalls(plan: GridPlan): void {
  const solid: WallKey[] = [];
  for (const [key, wall] of plan.graph.wallEntries()) if (wall.kind === 'solid') solid.push(key);
  for (const key of solid) plan.graph.clearWall(wallTile(key), wallDir(key));
  // Der halbe Boden unter der Schräge bleibt (`GridPlan.halfFloor`): Das
  // Regalstück ersetzt die Wand, nicht den Boden.
  for (const { tile } of plan.saveSlopes())
    plan.slope(keyX(tile), keyZ(tile), null, keyLevel(tile), true);
}
