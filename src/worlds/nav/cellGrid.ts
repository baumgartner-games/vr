import {
  DIR_E,
  DIR_S,
  NO_TILE,
  TILE,
  TILE_MAX,
  TILE_MIN,
  tileKey,
  type Dir,
  type TileKey,
} from './navTile';
import { doorBroken, type NavGraph } from './navGraph';

/**
 * **Die Zelle — eine halbe Kachel.**
 *
 * Gebaut wird weiter auf Metern: Wände stehen auf Kachelkanten, Möbel auf
 * ganzen Kacheln (`navTile.TILE`). Wo eine Figur *steht*, rechnet dagegen ein
 * feineres Gitter aus Zellen zu einem halben Meter, und eine Figur mittlerer
 * Größe belegt davon **zwei mal zwei** — genau einen Quadratmeter, aber um
 * einen halben Meter verschiebbar. Das ist das Brettspiel-Maß (in D&D belegt
 * ein mittelgroßes Wesen vier Felder), und es löst drei Dinge auf einmal:
 *
 * - **Eine Figur kann eine Kachelkante überspannen**, wo keine Wand ist: Sie
 *   steht zwischen zwei Möbeln, auf der Fuge zweier Kacheln, in einer Tür.
 * - **Eine Wand unter 45°** (`Slope`) sperrt in ihrer Kachel genau die zwei
 *   Zellen, durch die ihre Diagonale läuft — `[ ][x] / [x][ ]` —, und auf
 *   beiden Seiten bleibt eine Zelle frei. Eine Figur geht an ihr entlang,
 *   schräg, von beiden Seiten, ohne dass jemand Schrägen in einen Graphen aus
 *   vier Richtungen einbauen musste.
 * - **Ein Schritt ist eine ganze Zahl.** Wo eine Figur logisch steht, ist die
 *   Mitte ihres 2×2-Blocks, und die liegt immer auf einem Vielfachen von
 *   einem halben Meter (`CellPos`). Dazwischen wird nur gezeichnet.
 *
 * **Ein Schritt geht in acht Richtungen**, und erlaubt ist er, sobald der Block
 * **am Ziel** frei ist. Die beiden geraden Zwischenstellungen eines
 * Schrägschritts müssen es nicht sein: An einer Außenecke zweier Hindernisse,
 * die sich nur über Eck berühren, schlüpft eine Figur schräg hindurch — so hat
 * es der Besitzer festgelegt (September 2026):
 *
 * ```
 * [w][ ][ ]      [w][p][p]
 * [p][p][ ]  →   [ ][p][p]
 * [p][p][w]      [ ][ ][w]
 * ```
 *
 * Hier steht nur Rechnung: keine Meter-Physik, kein three.js. Woher die
 * Zellen ihre Wände wissen, sagt eine `CellSource` — für die Welten auf dem
 * Gitter ist das der Navigationsgraph samt den Schrägen des Bauplans
 * (`navCellSource`).
 */

/** Die Kantenlänge einer Zelle in Metern: eine halbe Kachel. */
export const CELL = TILE / 2;

/** Wie viele Zellen eine Figur mittlerer Größe je Seite belegt. */
export const FOOTPRINT = 2;

/**
 * **Eine Wand unter 45° in einer Kachel** — benannt nach dem Strich, den sie auf
 * einer Karte mit Norden oben zeichnet.
 *
 * - `slash` „/": von der Südwest- zur Nordostecke der Kachel. Sie sperrt die
 *   Zellen Nordost und Südwest.
 * - `backslash` „\": von der Nordwest- zur Südostecke. Sie sperrt Nordwest und
 *   Südost.
 *
 * Die Diagonale läuft genau durch diese beiden Zellen und berührt die beiden
 * anderen nur in der Kachelmitte — die gesperrten Zellen *sind* die Wand.
 */
export type Slope = 'slash' | 'backslash';

export const SLOPES: readonly Slope[] = ['slash', 'backslash'];

/** Wo eine Figur logisch steht: die Mitte ihres 2×2-Blocks, in halben Metern. */
export interface CellPos {
  cx: number;
  cz: number;
}

/** Was das Zellgitter über die Welt wissen muss — in Kacheln, nicht in Zellen. */
export interface CellSource {
  /** Ob auf dieser Kachel Boden ist, auf dem eine Figur stehen darf. */
  floor(tx: number, tz: number, level: number): boolean;
  /** Ob man von dieser Kachel aus in Richtung `dir` über die Kante kommt. */
  open(tx: number, tz: number, dir: Dir, level: number): boolean;
  /** Die Schräge in dieser Kachel, wenn eine steht. */
  slope(tx: number, tz: number, level: number): Slope | null;
}

/** Die Kachel, in der eine Zelle liegt, und ihre Lage darin (0 oder 1 je Achse). */
function split(index: number): { tile: number; sub: number } {
  const tile = Math.floor(index / 2);
  return { tile, sub: index - tile * 2 };
}

/** Ob die Schräge `slope` die Unterzelle (`sx`, `sz`) ihrer Kachel sperrt. */
export function slopeBlocks(slope: Slope, sx: number, sz: number): boolean {
  // Norden ist −Z: Die Nordostzelle ist (1, 0), die Südwestzelle (0, 1).
  return slope === 'slash' ? sx !== sz : sx === sz;
}

/** Wie teuer ein Schritt ist: gerade eins, schräg die Diagonale. */
const STEP_COST = [1, Math.SQRT2] as const;

const MOVES: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** So weit lässt die Wegsuche sich höchstens treiben, in untersuchten Stellungen. */
const SEARCH_LIMIT = 40_000;

export class CellGrid {
  constructor(private readonly source: CellSource) {}

  /** Ob eine einzelne Zelle frei ist: Boden darunter und keine Schräge darin. */
  cellFree(ix: number, iz: number, level = 0): boolean {
    const x = split(ix),
      z = split(iz);
    if (!this.source.floor(x.tile, z.tile, level)) return false;
    const slope = this.source.slope(x.tile, z.tile, level);
    return !slope || !slopeBlocks(slope, x.sub, z.sub);
  }

  /**
   * **Ob ein 2×2-Block mit dieser Mitte frei ist.**
   *
   * Vier Zellen, und dazu die Kanten *zwischen* ihnen: Liegt die Mitte auf
   * einer Kachelkante (gerade Zellzahl), geht diese Kante mitten durch den
   * Block, und steht dort eine Wand, passt niemand hinein — auch wenn links
   * und rechts davon Boden ist.
   */
  footprintFree(at: CellPos, level = 0): boolean {
    const { cx, cz } = at;
    for (let iz = cz - 1; iz <= cz; iz++)
      for (let ix = cx - 1; ix <= cx; ix++) if (!this.cellFree(ix, iz, level)) return false;
    if (cx % 2 === 0) {
      // Die senkrechte Linie x = cx · CELL ist eine Kachelkante.
      const west = cx / 2 - 1;
      for (const iz of [cz - 1, cz])
        if (!this.source.open(west, split(iz).tile, DIR_E, level)) return false;
    }
    if (cz % 2 === 0) {
      const north = cz / 2 - 1;
      for (const ix of [cx - 1, cx])
        if (!this.source.open(split(ix).tile, north, DIR_S, level)) return false;
    }
    return true;
  }

  /**
   * **Ein Schritt von `from` nach `to`** — erlaubt, wenn er einer der acht
   * Nachbarn ist und der Block am Ziel frei. Die Zwischenstellungen eines
   * Schrägschritts zählen ausdrücklich nicht (siehe oben).
   */
  canStep(from: CellPos, to: CellPos, level = 0): boolean {
    const dx = Math.abs(to.cx - from.cx),
      dz = Math.abs(to.cz - from.cz);
    if (dx > 1 || dz > 1) return false;
    return this.footprintFree(to, level);
  }

  /**
   * **Die nächste freie Stellung um eine Weltposition**, im Ring nach außen —
   * `null`, wenn in `radius` Zellen keine liegt.
   */
  nearestFree(x: number, z: number, level = 0, radius = 4): CellPos | null {
    const home = snapCell(x, z);
    if (this.footprintFree(home, level)) return home;
    for (let ring = 1; ring <= radius; ring++) {
      let best: CellPos | null = null;
      let bestGap = Infinity;
      for (let dz = -ring; dz <= ring; dz++)
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
          const at = { cx: home.cx + dx, cz: home.cz + dz };
          if (!this.footprintFree(at, level)) continue;
          const centre = cellCentre(at);
          const gap = Math.hypot(centre.x - x, centre.z - z);
          if (gap < bestGap) {
            bestGap = gap;
            best = at;
          }
        }
      if (best) return best;
    }
    return null;
  }

  /**
   * **Der Weg von Stellung zu Stellung** — A* über acht Nachbarn, jeder Schritt
   * nach `canStep`. Heraus kommt die Liste der Stellungen samt Start und Ziel,
   * oder `null`, wenn es keinen Weg gibt.
   */
  findPath(from: CellPos, to: CellPos, level = 0): CellPos[] | null {
    if (!this.footprintFree(to, level)) return null;
    const key = (at: CellPos): number => (at.cx + 4096) * 8192 + (at.cz + 4096);
    const guess = (at: CellPos): number => {
      const dx = Math.abs(at.cx - to.cx),
        dz = Math.abs(at.cz - to.cz);
      return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
    };
    const cost = new Map<number, number>([[key(from), 0]]);
    const parent = new Map<number, CellPos>();
    const open: Array<{ at: CellPos; f: number }> = [{ at: from, f: guess(from) }];
    const closed = new Set<number>();
    let searched = 0;
    while (open.length > 0) {
      // Eine kleine Liste statt eines Haufens: Die Wege hier sind Räume lang,
      // und die Suche ist Werkzeug, nicht Schleife je Bild.
      let best = 0;
      for (let i = 1; i < open.length; i++) if (open[i]!.f < open[best]!.f) best = i;
      const { at } = open.splice(best, 1)[0]!;
      const here = key(at);
      if (closed.has(here)) continue;
      if (at.cx === to.cx && at.cz === to.cz) {
        const path = [at];
        for (let step = parent.get(here); step; step = parent.get(key(step))) path.push(step);
        return path.reverse();
      }
      closed.add(here);
      if (++searched > SEARCH_LIMIT) return null;
      const base = cost.get(here)!;
      for (const [dx, dz] of MOVES) {
        const next = { cx: at.cx + dx, cz: at.cz + dz };
        const there = key(next);
        if (closed.has(there) || !this.footprintFree(next, level)) continue;
        const g = base + STEP_COST[dx !== 0 && dz !== 0 ? 1 : 0];
        if (g >= (cost.get(there) ?? Infinity)) continue;
        cost.set(there, g);
        parent.set(there, at);
        open.push({ at: next, f: g + guess(next) });
      }
    }
    return null;
  }
}

/** Die Stellung, in der eine Weltposition logisch steht: die nächste Blockmitte. */
export function snapCell(x: number, z: number): CellPos {
  return { cx: Math.round(x / CELL), cz: Math.round(z / CELL) };
}

/** Die Mitte eines Blocks in Weltmetern. */
export function cellCentre(at: CellPos): { x: number; z: number } {
  return { x: at.cx * CELL, z: at.cz * CELL };
}

export interface NavCellOptions {
  /**
   * **Was eine fehlende Kachel ist.** Für die Wegsuche ein Loch (`false`,
   * die Vorgabe); für den Spieler, der von der Physik getragen wird, nichts,
   * worüber das Gitter zu befinden hat (`true`) — außerhalb des Grundrisses
   * steht er auf Gelände oder fällt, und beides regelt die Physik.
   */
  voidIsFree?: boolean;
}

/**
 * **Die Zellen der Welten auf dem Gitter**: Boden und Kanten aus dem
 * Navigationsgraphen, Schrägen aus dem Bauplan.
 *
 * Eine Kante ist offen, wenn dort keine Wand steht, eine offene oder
 * eingeschlagene Tür — und zu, wenn dort Wand, Fenster oder eine geschlossene
 * Tür ist. Das ist die Frage, die auch die Physik beantwortet: Ein
 * geschlossenes Blatt ist ein Quader, ein offenes ist in die Wand gefahren.
 */
export function navCellSource(
  graph: NavGraph,
  slopeAt: (key: TileKey) => Slope | null,
  options: NavCellOptions = {},
): CellSource {
  const keyOf = (tx: number, tz: number, level: number): TileKey => {
    if (tx < TILE_MIN || tx > TILE_MAX || tz < TILE_MIN || tz > TILE_MAX) return NO_TILE;
    return tileKey(tx, tz, level);
  };
  return {
    floor(tx, tz, level) {
      const key = keyOf(tx, tz, level);
      if (key === NO_TILE) return !!options.voidIsFree;
      if (!graph.has(key)) return !!options.voidIsFree;
      return graph.walkable(key);
    },
    open(tx, tz, dir, level) {
      const key = keyOf(tx, tz, level);
      if (key === NO_TILE) return !!options.voidIsFree;
      const wall = graph.wall(key, dir);
      if (!wall) return true;
      if (wall.kind === 'door') return wall.open || doorBroken(wall);
      return false;
    },
    slope(tx, tz, level) {
      const key = keyOf(tx, tz, level);
      return key === NO_TILE ? null : slopeAt(key);
    },
  };
}
