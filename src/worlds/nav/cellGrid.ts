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
  /**
   * **Was sonst auf einer Zelle steht** — Möbel, Einbauten, Kisten
   * (`GridPlan.furnitureCells`, in der Station `stationLayout`). Ohne diese
   * Frage steht auf keiner Zelle etwas.
   */
  blocked?(ix: number, iz: number, level: number): boolean;
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
    if (this.source.blocked?.(ix, iz, level)) return false;
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
  footprintFree(at: CellPos, level = 0, size = FOOTPRINT): boolean {
    const x0 = blockStart(at.cx, size),
      z0 = blockStart(at.cz, size);
    for (let iz = z0; iz < z0 + size; iz++)
      for (let ix = x0; ix < x0 + size; ix++) if (!this.cellFree(ix, iz, level)) return false;
    // Jede Kachelkante, die durch das Innere des Blocks läuft: eine senkrechte
    // bei jeder geraden Zellgrenze zwischen x0 und x0 + size, eine waagerechte
    // ebenso — dort darf keine Wand stehen.
    for (let line = x0 + 1; line < x0 + size; line++) {
      if (line % 2 !== 0) continue;
      const west = line / 2 - 1;
      for (let iz = z0; iz < z0 + size; iz++)
        if (!this.source.open(west, split(iz).tile, DIR_E, level)) return false;
    }
    for (let line = z0 + 1; line < z0 + size; line++) {
      if (line % 2 !== 0) continue;
      const north = line / 2 - 1;
      for (let ix = x0; ix < x0 + size; ix++)
        if (!this.source.open(split(ix).tile, north, DIR_S, level)) return false;
    }
    return true;
  }

  /**
   * **Ein Schritt von `from` nach `to`** — erlaubt, wenn er einer der acht
   * Nachbarn ist und der Block am Ziel frei. Die Zwischenstellungen eines
   * Schrägschritts zählen ausdrücklich nicht (siehe oben).
   */
  canStep(from: CellPos, to: CellPos, level = 0, size = FOOTPRINT): boolean {
    const dx = Math.abs(to.cx - from.cx),
      dz = Math.abs(to.cz - from.cz);
    if (dx > 1 || dz > 1) return false;
    return this.footprintFree(to, level, size);
  }

  /**
   * **Die nächste freie Stellung um eine Weltposition**, im Ring nach außen —
   * `null`, wenn in `radius` Zellen keine liegt.
   */
  nearestFree(x: number, z: number, level = 0, radius = 4, size = FOOTPRINT): CellPos | null {
    const home = snapCell(x, z, size);
    if (this.footprintFree(home, level, size)) return home;
    for (let ring = 1; ring <= radius; ring++) {
      let best: CellPos | null = null;
      let bestGap = Infinity;
      for (let dz = -ring; dz <= ring; dz++)
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
          const at = { cx: home.cx + dx, cz: home.cz + dz };
          if (!this.footprintFree(at, level, size)) continue;
          const centre = cellCentre(at, size);
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
  findPath(from: CellPos, to: CellPos, level = 0, size = FOOTPRINT): CellPos[] | null {
    const found = this.search(from, to, level, size);
    return found.complete ? found.path : null;
  }

  /**
   * **Die Suche mit allem, was eine Welt dazu wissen will.**
   *
   * - `extra(at)`: ein Aufschlag je Meter auf dieser Stellung — die Gefahr,
   *   um die man lieber herumgeht (`haunting/stationNavigation.RouteAvoid`).
   *   Die Schätzung bleibt die reine Länge, also findet A* weiter den
   *   billigsten Weg.
   * - Ohne Weg ans Ziel kommt der **beste Teilweg** zurück: der zur Stellung,
   *   die dem Ziel am nächsten liegt (`complete: false`). Wer vor einer
   *   verschlossenen Tür steht, läuft so bis an sie heran und nicht nirgendwohin.
   */
  search(
    from: CellPos,
    to: CellPos,
    level = 0,
    size = FOOTPRINT,
    extra?: (at: CellPos) => number,
  ): { path: CellPos[]; complete: boolean } {
    const key = (at: CellPos): number => (at.cx + 4096) * 8192 + (at.cz + 4096);
    const guess = (at: CellPos): number => {
      const dx = Math.abs(at.cx - to.cx),
        dz = Math.abs(at.cz - to.cz);
      return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
    };
    const reachable = this.footprintFree(to, level, size);
    const cost = new Map<number, number>([[key(from), 0]]);
    const parent = new Map<number, CellPos>();
    const heap = new CellHeap();
    heap.push(from, guess(from));
    const closed = new Set<number>();
    let best = from;
    let bestGuess = guess(from);
    let searched = 0;
    let complete = false;
    while (heap.size > 0) {
      const at = heap.pop()!;
      const here = key(at);
      if (closed.has(here)) continue;
      closed.add(here);
      const h = guess(at);
      if (h < bestGuess) {
        bestGuess = h;
        best = at;
      }
      if (reachable && at.cx === to.cx && at.cz === to.cz) {
        best = at;
        complete = true;
        break;
      }
      if (++searched > SEARCH_LIMIT) break;
      const base = cost.get(here)!;
      for (const [dx, dz] of MOVES) {
        const next = { cx: at.cx + dx, cz: at.cz + dz };
        const there = key(next);
        if (closed.has(there) || !this.footprintFree(next, level, size)) continue;
        const length = STEP_COST[dx !== 0 && dz !== 0 ? 1 : 0];
        const g = base + length * (1 + (extra ? extra(next) : 0));
        if (g >= (cost.get(there) ?? Infinity)) continue;
        cost.set(there, g);
        parent.set(there, at);
        heap.push(next, g + guess(next));
      }
    }
    const path = [best];
    for (let step = parent.get(key(best)); step; step = parent.get(key(step))) path.push(step);
    return { path: path.reverse(), complete };
  }
}

/** Ein kleiner Haufen für die Suche — nach Priorität, die kleinste zuerst. */
class CellHeap {
  private readonly items: CellPos[] = [];
  private readonly priorities: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: CellPos, priority: number): void {
    const items = this.items,
      priorities = this.priorities;
    let i = items.length;
    items.push(item);
    priorities.push(priority);
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (priorities[up]! <= priority) break;
      items[i] = items[up]!;
      priorities[i] = priorities[up]!;
      i = up;
    }
    items[i] = item;
    priorities[i] = priority;
  }

  pop(): CellPos | undefined {
    const items = this.items,
      priorities = this.priorities;
    const top = items[0];
    const lastItem = items.pop();
    const lastPriority = priorities.pop();
    if (items.length === 0 || lastItem === undefined || lastPriority === undefined) return top;
    let i = 0;
    for (;;) {
      const left = i * 2 + 1;
      if (left >= items.length) break;
      const right = left + 1;
      const child = right < items.length && priorities[right]! < priorities[left]! ? right : left;
      if (priorities[child]! >= lastPriority) break;
      items[i] = items[child]!;
      priorities[i] = priorities[child]!;
      i = child;
    }
    items[i] = lastItem;
    priorities[i] = lastPriority;
    return top;
  }
}

/**
 * **Wo ein Block von `size` Zellen je Seite anfängt**, von seiner Stellung aus.
 *
 * Die Stellung ist bei gerader Größe die Zellecke in seiner Mitte (2 × 2: die
 * Zellen `cx − 1` und `cx`), bei ungerader die mittlere Zelle selbst (1 × 1:
 * die Zelle `cx`, 3 × 3: `cx − 1 … cx + 1`).
 */
export function blockStart(c: number, size = FOOTPRINT): number {
  return c - Math.floor(size / 2);
}

/**
 * Die Stellung, in der eine Weltposition logisch steht: die nächste Blockmitte.
 * Bei gerader Größe liegt sie auf einer Zellecke, bei ungerader in einer
 * Zellmitte.
 */
export function snapCell(x: number, z: number, size = FOOTPRINT): CellPos {
  if (size % 2 === 0) return { cx: Math.round(x / CELL), cz: Math.round(z / CELL) };
  return { cx: Math.floor(x / CELL), cz: Math.floor(z / CELL) };
}

/** Die Mitte eines Blocks in Weltmetern. */
export function cellCentre(at: CellPos, size = FOOTPRINT): { x: number; z: number } {
  const odd = size % 2 === 0 ? 0 : 0.5;
  return { x: (at.cx + odd) * CELL, z: (at.cz + odd) * CELL };
}

/**
 * **Wie viele Zellen je Seite ein Körper dieser Breite belegt** — die Breite
 * in Metern (Durchmesser), aufgerundet auf halbe Meter, mindestens eine Zelle.
 * Ein Mensch von 0,5 m Durchmesser ist damit **1 × 1**… es sei denn, er sagt
 * es anders: Die Figuren dieses Spiels melden ihre Größe ausdrücklich
 * (`AgentSize`), und die Vorgabe ist 2 × 2.
 */
export function cellsFor(width: number): number {
  return Math.max(1, Math.ceil(width / CELL - 1e-6));
}

/**
 * **Ob eine Figur hier stehen darf** — die eine Frage, aus der jede Bewegung
 * besteht.
 *
 * Logisch steht eine Figur auf einem freien Block (`footprintFree`), gezeichnet
 * wird sie **zwischen** ihren Blöcken: auf dem Weg von der Mitte eines freien
 * Blocks zur Mitte eines anderen freien daneben — gerade oder schräg. Die
 * Mitten der Blöcke sind ein Gitter; erlaubt ist
 *
 * - jedes Feld dieses Gitters, dessen vier Ecken frei sind (offene Fläche),
 * - sonst nur ein Streifen von `TRANSIT_WIDTH` Zellen um die Verbindung zweier
 *   freier Nachbarn (gerade oder schräg) und um eine freie Mitte selbst.
 *
 * **Warum so eng.** Bis Oktober 2026 galt „der Block unter den Füßen ist frei".
 * Dann durfte die Figur eine Viertelzelle weit an jede Seite ihres Blocks,
 * auch in Richtung einer Wand: Ihre Mitte stand 0,25 m vor der Wandfuge, ihr
 * Körper (0,24 m) steckte in der Wand (0,1 m dick) — gemeldet in der Küche
 * der Testwelt: „ich kann auf die Wand zulaufen". Jetzt geht es zur Wand hin
 * nur um den Streifen über die Mitte hinaus, eine Achtelzelle.
 *
 * **Über Eck** (das Bild des Besitzers, `docs/agents/zellgitter.md`) ist die
 * schräge Verbindung zweier freier Blöcke ein Weg, auch wenn die beiden
 * geraden Blöcke dazwischen gesperrt sind. Unterwegs rundet die Figur auf
 * einen davon — erlaubt, aber nur im Streifen. Bis Oktober 2026 hieß die
 * Ausnahme „der gesperrte Block dazwischen, und von einem gesperrten Block aus
 * jeder freie": An einer 45°-Wand kam man so über die Wand ins Leere dahinter.
 */
export function standable(
  grid: CellGrid,
  x: number,
  z: number,
  level = 0,
  size = FOOTPRINT,
): boolean {
  const odd = size % 2 === 0 ? 0 : 0.5;
  const u = x / CELL - odd,
    v = z / CELL - odd;
  const fx = Math.floor(u),
    fz = Math.floor(v);
  const du = u - fx,
    dv = v - fz;
  const free = (cx: number, cz: number): boolean => grid.footprintFree({ cx, cz }, level, size);
  const f00 = free(fx, fz),
    f10 = free(fx + 1, fz),
    f01 = free(fx, fz + 1),
    f11 = free(fx + 1, fz + 1);
  if (f00 && f10 && f01 && f11) return true;
  const w = TRANSIT_WIDTH,
    slant = TRANSIT_WIDTH * Math.SQRT2;
  // Die Mitten selbst.
  if (f00 && du <= w && dv <= w) return true;
  if (f10 && 1 - du <= w && dv <= w) return true;
  if (f01 && du <= w && 1 - dv <= w) return true;
  if (f11 && 1 - du <= w && 1 - dv <= w) return true;
  // Die geraden Verbindungen.
  if (f00 && f10 && dv <= w) return true;
  if (f01 && f11 && 1 - dv <= w) return true;
  if (f00 && f01 && du <= w) return true;
  if (f10 && f11 && 1 - du <= w) return true;
  // Die schrägen — über Eck.
  if (f00 && f11 && Math.abs(du - dv) <= slant) return true;
  return f10 && f01 && Math.abs(du + dv - 1) <= slant;
}

/** Wie breit der Streifen um eine Verbindung zu jeder Seite ist, in Zellen. */
const TRANSIT_WIDTH = 0.25;

/** In welchen Schritten eine Strecke geprüft wird: ein Viertel einer Zelle. */
const GLIDE_STEP = CELL / 4;

/**
 * **Ob eine Figur stetig von hier nach dort gleiten darf** — jede Stelle
 * unterwegs ist `standable`, in Schritten von einer Viertelzelle geprüft.
 * Ein langer Schritt (ein langsames Bild) springt so über nichts hinweg.
 * Die Regel, die `moveOnCells` und die Zellsperre des Spielers
 * (`GridWorld.playerCellGate`) teilen.
 */
export function glides(
  grid: CellGrid,
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  level = 0,
  size = FOOTPRINT,
): boolean {
  const length = Math.hypot(toX - fromX, toZ - fromZ);
  const steps = Math.max(1, Math.ceil(length / GLIDE_STEP));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!standable(grid, fromX + (toX - fromX) * t, fromZ + (toZ - fromZ) * t, level, size))
      return false;
  }
  return true;
}

/**
 * Wie weit die letzte freie Stelle höchstens weg sein darf, damit es aus einem
 * gesperrten Block nur zu ihr zurück geht, in Metern (`gateStep`). Weiter weg
 * wurde die Figur versetzt, und die Stelle sagt nichts mehr.
 */
export const STUCK_REACH = 1.5;

/**
 * **Die Zellsperre des Spielers als Rechnung** (`GridWorld.playerCellGate`):
 * Darf er von `from` nach `to`? `memory.lastFree` ist die letzte Stelle, an der
 * er stehen durfte; die Rechnung schreibt sie fort.
 *
 * Wer stehen darf (`standable`), gleitet (`glides`). Wer auf einem gesperrten
 * Block steht — abgesetzt, geschoben —, darf nur zurück zur letzten freien
 * Stelle, nicht auf irgendeinen freien Block: Der kann hinter der Wand liegen,
 * auf deren Fuge er gerade steht.
 */
export function gateStep(
  grid: CellGrid,
  from: { x: number; z: number },
  to: { x: number; z: number },
  memory: { lastFree: { x: number; z: number } | null },
  level = 0,
  fromLevel = level,
  size = FOOTPRINT,
): boolean {
  if (standable(grid, from.x, from.z, fromLevel, size)) {
    memory.lastFree = { x: from.x, z: from.z };
    return glides(grid, from.x, from.z, to.x, to.z, level, size);
  }
  const back = memory.lastFree;
  if (back && Math.hypot(from.x - back.x, from.z - back.z) < STUCK_REACH)
    return Math.hypot(to.x - back.x, to.z - back.z) < Math.hypot(from.x - back.x, from.z - back.z);
  const home = snapCell(from.x, from.z, size),
    next = snapCell(to.x, to.z, size);
  return (home.cx === next.cx && home.cz === next.cz) || grid.footprintFree(next, level, size);
}

/**
 * **Ein Schritt auf dem Gitter, stetig gezeichnet** — die eine Bewegung, die
 * alle Figuren machen.
 *
 * Die Figur steht optisch bei `at` und will um (`dx`, `dz`) weiter. Logisch
 * steht sie auf dem Block, auf den ihre Füße gerundet werden (`snapCell`),
 * und nur das Gitter entscheidet: Der Schritt wird ganz gemacht, wenn der
 * Block danach frei ist; sonst nur längs x oder nur längs z — dasselbe
 * Gleiten wie an einer Wand —, sonst gar nicht. Frei heißt: jede Stelle
 * unterwegs ist `standable` (`glides`) — über Eck also auch der Streifen
 * zwischen zwei schräg benachbarten freien Blöcken. Steht die Figur schon
 * auf einem gesperrten Block (abgesetzt, von der Welt verschoben), bleibt
 * niemand kleben: Dann geht jeder Schritt, der in ihrem Block bleibt oder
 * auf einer Stelle endet, auf der man stehen darf.
 *
 * Kein Physikkörper, keine Wandquader: Was die Welt in 3D zeigt, ist
 * Darstellung. Gibt die neue Stelle zurück.
 */
export function moveOnCells(
  grid: CellGrid,
  at: { x: number; z: number },
  dx: number,
  dz: number,
  level = 0,
  size = FOOTPRINT,
): { x: number; z: number } {
  const home = snapCell(at.x, at.z, size);
  const x = at.x + dx,
    z = at.z + dz;
  const fits = (px: number, pz: number): boolean => glides(grid, at.x, at.z, px, pz, level, size);
  // Wer nicht stehen darf (abgesetzt, von der Welt verschoben), darf heraus —
  // innerhalb seines Blocks und auf einen freien, nicht in einen gesperrten.
  // Dort geht es in seinem Block weiter bis zur Mitte, und ab da gilt wieder
  // `glides`.
  const stuck = !standable(grid, at.x, at.z, level, size);
  const ok = stuck
    ? (px: number, pz: number): boolean => {
        const to = snapCell(px, pz, size);
        return (to.cx === home.cx && to.cz === home.cz) || grid.footprintFree(to, level, size);
      }
    : fits;
  if (ok(x, z)) return { x, z };
  if (dx !== 0 && ok(x, at.z)) return { x, z: at.z };
  if (dz !== 0 && ok(at.x, z)) return { x: at.x, z };
  return { x: at.x, z: at.z };
}

export interface NavCellOptions {
  /** Was sonst auf Zellen steht (`CellSource.blocked`) — Möbel, Einbauten. */
  blocked?: (ix: number, iz: number, level: number) => boolean;
  /**
   * **Wände, die nicht im Graphen stehen** — hingestellte Wände aus dem Regal
   * (`GridWorld.propEdges`). `true` heißt: Diese Kante ist zu.
   */
  walls?: (tx: number, tz: number, dir: Dir, level: number) => boolean;
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
      if (options.walls?.(tx, tz, dir, level)) return false;
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
    ...(options.blocked ? { blocked: options.blocked } : {}),
  };
}

/**
 * **Welche Zellen ein Kasten auf dem Boden belegt** — jede, in die er mehr als
 * `margin` Meter hineinragt, in beiden Richtungen.
 *
 * Ein Tisch von 0,8 m belegt so alle vier Zellen seiner Kachel, eine
 * Küchenzeile von 0,6 m Tiefe an einer Kante ebenfalls (sie ragt 0,1 m in die
 * hintere Reihe), ein Geländer an der Kante nur die zwei Zellen davor. Ein
 * Rand von zwei Zentimetern, damit ein Kasten, der genau an einer Zellgrenze
 * endet, die Nachbarzelle nicht mitnimmt.
 */
export function boxCells(
  box: { minX: number; maxX: number; minZ: number; maxZ: number },
  margin = 0.02,
): Array<{ ix: number; iz: number }> {
  const out: Array<{ ix: number; iz: number }> = [];
  const x0 = Math.floor((box.minX + margin) / CELL),
    x1 = Math.floor((box.maxX - margin) / CELL);
  const z0 = Math.floor((box.minZ + margin) / CELL),
    z1 = Math.floor((box.maxZ - margin) / CELL);
  for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) out.push({ ix, iz });
  return out;
}

/** Ein Schlüssel für eine Zelle samt Etage — für Mengen gesperrter Zellen. */
export function cellKey(ix: number, iz: number, level = 0): string {
  return `${ix},${iz},${level}`;
}
