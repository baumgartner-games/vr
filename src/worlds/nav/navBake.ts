import { NavGraph, type WallKind } from './navGraph';
import {
  DIR_E,
  DIR_N,
  LEVEL_MAX,
  NO_TILE,
  TILE,
  keyLevel,
  keyOnLevel,
  neighbour,
  tileIndexAt,
  tileKey,
  type Dir,
  type TileKey,
} from './navTile';

/**
 * **Aus einer gebauten Welt einen Kachelgraphen machen.**
 *
 * Die Welten dieses Projekts bestehen aus achsenparallelen Quadern — `slab()`
 * baut sie, `solids` sammelt sie. Damit muss keine Welt „auf Kacheln
 * umgebaut" werden: Es reicht, ihre Quader einmal abzutasten. Das ist
 * dasselbe Verfahren, mit dem Recast aus einer Level-Geometrie ein Navmesh
 * macht, nur ohne den Umweg über Voxel — bei lauter Kästen kann man die
 * Oberflächen direkt ausrechnen.
 *
 * **Abgetastet werden Säulen, nicht Räume.** Über jeder Kachelmitte werden
 * alle Deckel gesucht, die dort liegen: die Sandfläche bei y≈0, der Boden des
 * ersten Stocks bei 3,1, der des zweiten bei 6,2, das Dach bei 12,4. Jeder
 * davon wird eine Kachel auf seiner Etage — **sofern darüber genug Luft für
 * einen NPC ist**. Deshalb ist der Tunnel unter dem Sand eine eigene Kachel
 * und der Sand über ihm auch, und deshalb entsteht unter einem 1,2 m hohen
 * Vordach gar keine.
 *
 * **Die Kachelmitte entscheidet.** Ein Quader zählt als Boden, wenn er den
 * *Mittelpunkt* der Kachel überdeckt. Das ist absichtlich streng: Eine 32 cm
 * dünne Wand liegt fast nie auf einer Kachelmitte und macht damit keinen
 * Boden, den es nicht gibt; eine Kiste am Rand einer Kachel auch nicht. Wer
 * feiner will, braucht kleinere Kacheln und nicht mehr Abtastpunkte.
 *
 * **Was zwischen zwei Kacheln steht, wird einzeln gefragt.** Zwischen zwei
 * Kachelmitten wird auf halber Strecke geprüft, ob dort in Kopfhöhe etwas
 * steht — dann ist es eine Wand. Ist dort nichts, aber die beiden Böden
 * liegen verschieden hoch, entscheidet der Höhenunterschied: eine Stufe geht
 * man hoch, eine Treppe bekommt eine Verbindung, eine Kante zum Hinunter
 * einen Absprung, und alles darüber ist eine Wand.
 *
 * **Eine Kante ist für die Navigation dasselbe wie ein Fenster.** Über eine
 * anderthalb Meter hohe Mauer sieht man hinweg, man geht aber nicht hindurch
 * — und genau das ist ein `window` (`navGraph.ts`). Es als `solid` zu
 * verbuchen hieße, dass NPCs über niedrige Mauern hinweg blind werden.
 */

/** Ein achsenparalleler Kasten in Weltkoordinaten. */
export interface NavBox {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface BakeOptions {
  /** Der Ausschnitt, der abgetastet wird, in Metern. */
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
  /**
   * Die Welt-Y der Etagenböden.
   *
   * Eine Welt weiß, wie hoch ihre Stockwerke sind — Dust baut mit `STOREY =
   * 3.1`. Wer sie nicht angibt, bekommt sie geraten (`guessLevels`), und das
   * ist ehrlich gesagt nur die zweitbeste Antwort: Geraten wird aus den
   * Flächen, die es gibt, und ein Vordach kann dabei zur Etage werden.
   */
  levels?: readonly number[];
  /** Wie hoch ein NPC ist — wo weniger Luft ist, geht keiner. */
  height?: number;
  /** Wie hoch er tritt, ohne zu klettern. */
  step?: number;
  /** Bis wohin ein Höhenunterschied noch eine Treppe ist. */
  climb?: number;
  /** Wie tief er springen darf. */
  drop?: number;
  /** Wie weit eine Fläche von einem Etagenboden weg sein darf, um dazuzugehören. */
  band?: number;
}

export const BAKE_DEFAULTS = {
  /** Etwas weniger als die 1,78 m des Zombies: Türstürze sollen zählen. */
  height: 1.7,
  /** Dieselbe Stufe, die der Character-Controller nimmt (`PhysicsLocomotion`). */
  step: 0.32,
  climb: 2.2,
  drop: 2.6,
  band: 1.6,
} as const;

/** Was beim Abtasten herauskam — für die Meldung im Menü und die Debug-Ansicht. */
export interface BakeReport {
  graph: NavGraph;
  /** Wie viele Kachelsäulen abgetastet wurden. */
  columns: number;
  tiles: number;
  walls: number;
  links: number;
  /** Wie lange es gedauert hat, in Millisekunden. */
  millis: number;
}

/**
 * Tastet eine Welt ab und gibt den Graphen zurück.
 *
 * Läuft einmal beim Laden der Welt. Für Dust sind das bei 2,5 m Kacheln rund
 * tausend Säulen — das ist eine Sache von Millisekunden, und deshalb stellt
 * sich die Frage „wo speichere ich die Navdaten" hier gar nicht erst. Erst
 * wenn eine Welt quadratkilometergroß wird, lohnt sich `navSerial.ts`.
 */
export function bakeNav(boxes: readonly NavBox[], options: BakeOptions): BakeReport {
  const started = Date.now();
  const height = options.height ?? BAKE_DEFAULTS.height;
  const step = options.step ?? BAKE_DEFAULTS.step;
  const climb = options.climb ?? BAKE_DEFAULTS.climb;
  const drop = options.drop ?? BAKE_DEFAULTS.drop;
  const band = options.band ?? BAKE_DEFAULTS.band;

  const minX = tileIndexAt(options.bounds.minX);
  const maxX = tileIndexAt(options.bounds.maxX);
  const minZ = tileIndexAt(options.bounds.minZ);
  const maxZ = tileIndexAt(options.bounds.maxZ);

  const index = new ColumnIndex(boxes, options.bounds);
  const levels = options.levels
    ? [...options.levels]
    : guessLevels(index, minX, maxX, minZ, maxZ, height, band);
  const graph = new NavGraph(levels);

  // 1. Jede Säule abtasten und ihre Böden auf die Etagen verteilen.
  let columns = 0;
  for (let tx = minX; tx <= maxX; tx++) {
    for (let tz = minZ; tz <= maxZ; tz++) {
      columns++;
      const x = (tx + 0.5) * TILE;
      const z = (tz + 0.5) * TILE;
      for (const floor of floorsAt(index, x, z, height)) {
        const level = levelFor(levels, floor, band);
        if (level < 0) continue;
        const key = tileKey(tx, tz, level);
        const rise = floor - levels[level]!;
        const known = graph.tile(key);
        // Zwei Böden auf derselben Etage: der näher am Etagenboden gewinnt.
        if (known && Math.abs(known.rise) <= Math.abs(rise)) continue;
        graph.setTile(key, { rise });
      }
    }
  }

  // 2. Zwischen den Kacheln aufräumen: Wände, Treppen, Absprünge.
  let links = 0;
  for (const key of [...graph.tileKeys()]) {
    for (const dir of [DIR_N, DIR_E] as const) {
      links += joinTiles(graph, index, key, dir, { height, step, climb, drop });
    }
  }

  return {
    graph,
    columns,
    tiles: graph.size,
    walls: [...graph.wallEntries()].length,
    links,
    millis: Date.now() - started,
  };
}

/**
 * Verbindet eine Kachel mit ihrer Nachbarin — oder stellt eine Wand dazwischen.
 *
 * Gibt zurück, wie viele Verbindungen dabei entstanden sind. Nachbarn auf
 * derselben Etage, die gleich hoch liegen und nichts zwischen sich haben,
 * brauchen gar nichts: Die ergeben sich aus dem Gitter.
 */
function joinTiles(
  graph: NavGraph,
  index: ColumnIndex,
  key: TileKey,
  dir: Dir,
  limits: { height: number; step: number; climb: number; drop: number },
): number {
  const other = neighbour(key, dir);
  if (other === NO_TILE) return 0;
  const here = graph.tile(key);
  if (!here) return 0;

  const hereY = graph.levelY(keyLevel(key)) + here.rise;
  const world = graph.worldOf(key);
  const there = graph.worldOf(other);
  const midX = (world.x + there.x) / 2;
  const midZ = (world.z + there.z) / 2;

  let links = 0;
  let sameLevelHandled = false;

  // Die Nachbarsäule kann auf mehreren Etagen Boden haben — die Kachel unter
  // dem Dach und die auf dem Dach. Jede wird einzeln gefragt.
  for (let level = 0; level < graph.levels.length; level++) {
    const candidate = keyOnLevel(other, level);
    const facts = graph.tile(candidate);
    if (!facts) continue;
    const thereY = graph.levelY(level) + facts.rise;
    const rise = thereY - hereY;
    const sameLevel = level === keyLevel(key);

    // Steht auf halber Strecke etwas in Kopfhöhe? Dann ist es eine Wand, und
    // zwar egal, wie hoch die beiden Böden liegen.
    const low = Math.max(hereY, thereY) + 0.05;
    if (index.blocks(midX, midZ, low, low + limits.height * 0.6)) {
      if (sameLevel) {
        setBarrier(graph, key, dir, 'solid');
        sameLevelHandled = true;
      }
      continue;
    }

    if (sameLevel && Math.abs(rise) <= limits.step) {
      // Ebener Nachbar: das Gitter macht das von selbst.
      sameLevelHandled = true;
      continue;
    }

    if (sameLevel) {
      // Höhenunterschied auf derselben Etage: die Nachbarschaft aus dem Gitter
      // darf nicht gelten, sonst läuft er die Kante hoch wie eine Ebene.
      setBarrier(graph, key, dir, 'window');
      sameLevelHandled = true;
    }

    const id = `bake:${key}:${candidate}`;
    if (rise > 0 && rise <= limits.climb) {
      graph.addLink({
        id,
        from: key,
        to: candidate,
        kind: 'stairs',
        cost: TILE + rise,
        both: true,
        open: true,
      });
      links++;
    } else if (rise < 0 && -rise <= limits.drop) {
      graph.addLink({
        id,
        from: key,
        to: candidate,
        kind: 'drop',
        cost: TILE + -rise * 0.5,
        both: false,
        open: true,
      });
      links++;
    }
  }

  // Nachbar auf derselben Etage vorhanden, aber nichts davon hat gegriffen:
  // dann steht dort eine Wand, auch wenn niemand eine gebaut hat.
  if (!sameLevelHandled && graph.has(other)) setBarrier(graph, key, dir, 'solid');
  return links;
}

/** Setzt eine Sperre, ohne eine schon vorhandene Tür zu überbauen. */
function setBarrier(graph: NavGraph, key: TileKey, dir: Dir, kind: WallKind): void {
  const existing = graph.wall(key, dir);
  if (existing && existing.kind === 'door') return;
  graph.setWall(key, dir, { kind, muffle: kind === 'window' ? 0 : 0.85 });
}

/**
 * Alle begehbaren Böden über einem Punkt, von unten nach oben.
 *
 * Ein Deckel ist begehbar, wenn über ihm genug Luft für einen NPC ist. Das ist
 * die eine Prüfung, wegen der ein Tunnel und der Sand darüber zwei Kacheln
 * sind und ein Kriechkeller gar keine.
 */
export function floorsAt(index: ColumnIndex, x: number, z: number, height: number): number[] {
  const over: NavBox[] = [];
  for (const box of index.at(x, z)) {
    if (x < box.minX || x > box.maxX || z < box.minZ || z > box.maxZ) continue;
    over.push(box);
  }
  const tops = over.map((box) => box.maxY).sort((a, b) => a - b);

  const floors: number[] = [];
  for (const top of tops) {
    // Doppelte Deckel (zwei Platten übereinander) nur einmal.
    if (floors.length > 0 && top - floors[floors.length - 1]! < 0.06) continue;

    let buried = false;
    let ceiling = Infinity;
    for (const box of over) {
      // **Vergraben**: Der Deckel liegt mitten in einem anderen Kasten. Das ist
      // der Sand *unter* dem Podest, das darauf steht — man kommt dort nicht
      // hin, und wer ihn mitzählt, legt die Kachel eines Podests auf den Boden
      // daneben und wundert sich, warum niemand hinaufsteigt.
      if (box.minY < top - PROBE && box.maxY > top + PROBE) {
        buried = true;
        break;
      }
      if (box.minY >= top + PROBE && box.minY < ceiling) ceiling = box.minY;
    }
    if (buried) continue;
    if (ceiling - top >= height) floors.push(top);
  }
  return floors;
}

/** Wie viel Luft eine Prüfung nach oben und unten lässt, in Metern. */
const PROBE = 0.02;

/** Die Etage, zu der ein Boden gehört — `-1`, wenn keine nah genug ist. */
export function levelFor(levels: readonly number[], floor: number, band: number): number {
  let best = -1;
  let bestGap = band;
  for (let i = 0; i < levels.length; i++) {
    const gap = Math.abs(floor - levels[i]!);
    if (gap <= bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return best;
}

/**
 * Etagen raten, wenn die Welt keine nennt.
 *
 * Alle gefundenen Böden werden der Höhe nach gruppiert; jede Gruppe, die
 * genug Kacheln zusammenbringt, wird eine Etage. „Genug" hält Vordächer und
 * einzelne Podeste heraus — die werden dann zur Feinhöhe der Etage darunter,
 * und das ist genau richtig.
 */
export function guessLevels(
  index: ColumnIndex,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  height: number,
  band: number,
): number[] {
  const heights: number[] = [];
  for (let tx = minX; tx <= maxX; tx++) {
    for (let tz = minZ; tz <= maxZ; tz++) {
      heights.push(...floorsAt(index, (tx + 0.5) * TILE, (tz + 0.5) * TILE, height));
    }
  }
  if (heights.length === 0) return [0];
  heights.sort((a, b) => a - b);

  const groups: number[][] = [];
  for (const value of heights) {
    const last = groups[groups.length - 1];
    if (last && value - last[0]! <= band) last.push(value);
    else groups.push([value]);
  }
  // Eine Etage muss von mehr als einer Handvoll Säulen getragen werden.
  const floor = Math.max(3, Math.round(heights.length * 0.01));
  const levels = groups
    .filter((group) => group.length >= floor)
    .map((group) => group[Math.floor(group.length / 2)]!)
    .slice(0, LEVEL_MAX + 1);
  return levels.length > 0 ? levels : [heights[0]!];
}

/**
 * Ein Gitter über die Kästen, damit „was liegt über diesem Punkt" nicht jedes
 * Mal alle durchgeht.
 *
 * Ohne diesen Index kostet das Abtasten von tausend Säulen mal tausend Kästen
 * eine Million Prüfungen — mit ihm ein paar Dutzend je Säule. Das ist der
 * Unterschied zwischen „beim Laden" und „beim Laden merkt man es".
 */
export class ColumnIndex {
  private readonly cells = new Map<number, NavBox[]>();
  private readonly all: NavBox[] = [];

  constructor(boxes: readonly NavBox[], bounds: BakeOptions['bounds']) {
    for (const box of boxes) {
      if (box.maxX < bounds.minX || box.minX > bounds.maxX) continue;
      if (box.maxZ < bounds.minZ || box.minZ > bounds.maxZ) continue;
      this.all.push(box);
      const x0 = tileIndexAt(Math.max(box.minX, bounds.minX));
      const x1 = tileIndexAt(Math.min(box.maxX, bounds.maxX));
      const z0 = tileIndexAt(Math.max(box.minZ, bounds.minZ));
      const z1 = tileIndexAt(Math.min(box.maxZ, bounds.maxZ));
      for (let x = x0; x <= x1; x++) {
        for (let z = z0; z <= z1; z++) {
          const cell = cellKey(x, z);
          const list = this.cells.get(cell);
          if (list) list.push(box);
          else this.cells.set(cell, [box]);
        }
      }
    }
  }

  get size(): number {
    return this.all.length;
  }

  /** Die Kästen, die über dieser Stelle liegen könnten. */
  at(x: number, z: number): readonly NavBox[] {
    return this.cells.get(cellKey(tileIndexAt(x), tileIndexAt(z))) ?? EMPTY;
  }

  /** Ob an dieser Stelle zwischen zwei Höhen etwas steht. */
  blocks(x: number, z: number, low: number, high: number): boolean {
    for (const box of this.at(x, z)) {
      if (x < box.minX || x > box.maxX || z < box.minZ || z > box.maxZ) continue;
      if (box.maxY > low && box.minY < high) return true;
    }
    return false;
  }
}

const EMPTY: readonly NavBox[] = [];

function cellKey(x: number, z: number): number {
  return ((x + 1024) << 11) | (z + 1024);
}
