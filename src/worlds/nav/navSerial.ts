import { NavGraph, type NavLink, type WallKind } from './navGraph';
import type { LinkKind } from './navProfile';
import {
  DIR_E,
  DIR_N,
  TILE,
  keyLevel,
  keyX,
  keyZ,
  tileKey,
  wallDir,
  wallTile,
  type Dir,
} from './navTile';

/**
 * **Das Format** — wie eine Karte auf die Platte kommt und wieder herunter.
 *
 * Es hat vom ersten Tag an eine **Versionsnummer**, und das ist keine
 * Formsache: Das Kachelsystem wird sich ändern, und in dem Moment sind alle
 * Testkarten entweder migrierbar oder Müll. Eine Datei ohne Version ist eine
 * Datei, bei der man raten muss, was sie bedeutet — und geraten wird dann
 * falsch.
 *
 * **Die Kachelgröße steht mit drin.** Sie ist eine Konstante des Programms
 * (`navTile.ts`), und genau deshalb muss die Datei sagen, mit welcher sie
 * gebaut wurde: Wer sie ändert, verschiebt jede Kachel jeder gespeicherten
 * Karte. Das Laden bricht dann ab, statt eine Karte zu öffnen, in der die
 * Wände nicht mehr an den Häusern stehen.
 *
 * **Kacheln werden in Läufen gespeichert.** Ein Zimmer von fünf mal vier
 * Kacheln sind vier Einträge und nicht zwanzig — und ein Lauf ist immer noch
 * eine Zeile, die man in einem Diff lesen kann. Wände und Verbindungen stehen
 * einzeln da: davon gibt es wenige, und man will sie beim Nachschauen finden.
 *
 * **Was gerade im Weg steht, wird nicht gespeichert.** Gesperrte Kacheln sind
 * Laufzeit — die Kiste, die ein Spieler abstellt, gehört nicht in die Karte.
 * Beim nächsten Laden steht sie nicht mehr da, und das ist richtig so.
 */

export const NAV_FORMAT = 'vrnav';

/**
 * Die aktuelle Version.
 *
 * Wer sie erhöht, schreibt in `migrate()` einen Zweig dazu, der die vorige
 * Fassung hochzieht — und wenn das nicht geht, eine Fehlermeldung, die sagt,
 * warum. Ein stilles „geht schon" ist die einzige Möglichkeit, wie man sich
 * hier die Karten kaputtmacht.
 */
export const NAV_VERSION = 1;

/** Ein Kachellauf: gleiche Etage, gleiche Zeile, gleiche Werte, nebeneinander. */
export interface NavRun {
  /** Etage. */
  l: number;
  /** Zeile (z). */
  z: number;
  /** Erste Spalte (x). */
  x: number;
  /** Wie viele Kacheln, nach Osten. */
  n: number;
  /** Kostenfaktor — fehlt, wenn 1. */
  c?: number;
  /** Gefahren-Bitmaske — fehlt, wenn 0. */
  h?: number;
  /** Feinhöhe in Metern — fehlt, wenn 0. */
  r?: number;
}

export interface NavWallEntry {
  x: number;
  z: number;
  l: number;
  /** Die Seite, an der sie hängt: nur Norden und Osten, sonst gäbe es sie zweimal. */
  d: 'n' | 'e';
  kind: WallKind;
  open?: boolean;
  barred?: boolean;
  muffle?: number;
  id?: string;
}

export interface NavLinkEntry {
  id: string;
  kind: LinkKind;
  from: [number, number, number];
  to: [number, number, number];
  cost: number;
  both: boolean;
  open: boolean;
}

/** Eine Karte, so wie sie in der Datei steht. */
export interface NavFile {
  format: typeof NAV_FORMAT;
  version: number;
  /** Die Kachelgröße, mit der gebaut wurde. */
  tile: number;
  /** Wie die Karte heißt — nur für Menschen. */
  name?: string;
  /** Die Welt-Y der Etagenböden. */
  levels: number[];
  runs: NavRun[];
  walls: NavWallEntry[];
  links: NavLinkEntry[];
}

/** Was schiefgehen kann, wenn eine Datei nicht das ist, wofür sie sich ausgibt. */
export class NavFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NavFormatError';
  }
}

/** Schreibt einen Graphen in das Format. */
export function writeNav(graph: NavGraph, name?: string): NavFile {
  const file: NavFile = {
    format: NAV_FORMAT,
    version: NAV_VERSION,
    tile: TILE,
    levels: [...graph.levels],
    runs: collectRuns(graph),
    walls: collectWalls(graph),
    links: collectLinks(graph),
  };
  if (name) file.name = name;
  return file;
}

/**
 * Kacheln zu Läufen zusammenfassen.
 *
 * Sortiert nach Etage, dann Zeile, dann Spalte — dieselbe Karte ergibt damit
 * dieselbe Datei, und ein Diff zeigt Änderungen und keine Umsortierung.
 */
function collectRuns(graph: NavGraph): NavRun[] {
  const sorted = [...graph.tileKeys()].sort((a, b) => {
    const level = keyLevel(a) - keyLevel(b);
    if (level !== 0) return level;
    const row = keyZ(a) - keyZ(b);
    if (row !== 0) return row;
    return keyX(a) - keyX(b);
  });

  const runs: NavRun[] = [];
  let run: NavRun | null = null;
  let runX = 0;
  for (const key of sorted) {
    const facts = graph.tile(key)!;
    const l = keyLevel(key);
    const z = keyZ(key);
    const x = keyX(key);
    const same =
      run !== null &&
      run.l === l &&
      run.z === z &&
      x === runX + 1 &&
      (run.c ?? 1) === facts.cost &&
      (run.h ?? 0) === facts.hazard &&
      (run.r ?? 0) === facts.rise;
    if (same && run) {
      run.n++;
      runX = x;
      continue;
    }
    run = { l, z, x, n: 1 };
    if (facts.cost !== 1) run.c = facts.cost;
    if (facts.hazard !== 0) run.h = facts.hazard;
    if (facts.rise !== 0) run.r = facts.rise;
    runs.push(run);
    runX = x;
  }
  return runs;
}

function collectWalls(graph: NavGraph): NavWallEntry[] {
  const walls: NavWallEntry[] = [];
  for (const [wall, facts] of graph.wallEntries()) {
    const key = wallTile(wall);
    const entry: NavWallEntry = {
      x: keyX(key),
      z: keyZ(key),
      l: keyLevel(key),
      d: wallDir(wall) === DIR_N ? 'n' : 'e',
      kind: facts.kind,
    };
    if (facts.open) entry.open = true;
    if (facts.barred) entry.barred = true;
    if (facts.muffle !== undefined) entry.muffle = facts.muffle;
    if (facts.id) entry.id = facts.id;
    walls.push(entry);
  }
  walls.sort((a, b) => a.l - b.l || a.z - b.z || a.x - b.x || a.d.localeCompare(b.d));
  return walls;
}

function collectLinks(graph: NavGraph): NavLinkEntry[] {
  const links: NavLinkEntry[] = [];
  for (const link of graph.links()) {
    links.push({
      id: link.id,
      kind: link.kind,
      from: [keyX(link.from), keyZ(link.from), keyLevel(link.from)],
      to: [keyX(link.to), keyZ(link.to), keyLevel(link.to)],
      cost: link.cost,
      both: link.both,
      open: link.open,
    });
  }
  links.sort((a, b) => a.id.localeCompare(b.id));
  return links;
}

/**
 * Liest eine Karte.
 *
 * Wirft bei allem, was nicht passt — und die Meldung sagt, *was* nicht passt.
 * Eine halb geladene Karte ist schlimmer als gar keine: Sie sieht richtig aus,
 * bis der erste NPC durch eine Wand läuft, die es in der Datei gab und im
 * Speicher nicht.
 */
export function readNav(data: unknown): NavGraph {
  const file = migrate(data);
  if (file.tile !== TILE) {
    throw new NavFormatError(
      `Karte wurde mit ${file.tile} m Kacheln gebaut, dieses Programm rechnet mit ${TILE} m`,
    );
  }

  const graph = new NavGraph(file.levels);
  for (const run of file.runs) {
    if (!Number.isInteger(run.n) || run.n < 1) {
      throw new NavFormatError(`Kachellauf bei ${run.x},${run.z} hat die Länge ${run.n}`);
    }
    for (let i = 0; i < run.n; i++) {
      graph.setTile(tileKey(run.x + i, run.z, run.l), {
        cost: run.c ?? 1,
        hazard: run.h ?? 0,
        rise: run.r ?? 0,
      });
    }
  }

  for (const wall of file.walls) {
    const dir: Dir = wall.d === 'n' ? DIR_N : DIR_E;
    graph.setWall(tileKey(wall.x, wall.z, wall.l), dir, {
      kind: wall.kind,
      open: wall.open ?? false,
      barred: wall.barred ?? false,
      muffle: wall.muffle ?? (wall.kind === 'window' ? 0.5 : 0.85),
      id: wall.id ?? '',
    });
  }

  for (const entry of file.links) {
    const link: NavLink = {
      id: entry.id,
      kind: entry.kind,
      from: tileKey(entry.from[0], entry.from[1], entry.from[2]),
      to: tileKey(entry.to[0], entry.to[1], entry.to[2]),
      cost: entry.cost,
      both: entry.both,
      open: entry.open,
    };
    graph.addLink(link);
  }

  // Eine frisch geladene Karte hat noch nichts erlebt.
  graph.version = 0;
  return graph;
}

/**
 * Zieht eine alte Datei auf die aktuelle Fassung hoch.
 *
 * Noch gibt es nur eine Version, und trotzdem steht die Funktion schon da: Die
 * Stelle, an der später migriert wird, soll beim ersten Mal nicht erst gesucht
 * werden müssen. Wer Version 2 einführt, schreibt hier den Zweig von 1 nach 2
 * und lässt den Rest, wie er ist.
 */
export function migrate(data: unknown): NavFile {
  if (typeof data !== 'object' || data === null) {
    throw new NavFormatError('Das ist keine Karte, sondern ' + typeof data);
  }
  const file = data as Partial<NavFile>;
  if (file.format !== NAV_FORMAT) {
    throw new NavFormatError(`Fremdes Format: ${String(file.format)}`);
  }
  if (typeof file.version !== 'number' || !Number.isInteger(file.version)) {
    throw new NavFormatError('Der Karte fehlt die Versionsnummer');
  }
  if (file.version > NAV_VERSION) {
    throw new NavFormatError(
      `Karte ist Version ${file.version}, dieses Programm kennt bis ${NAV_VERSION}`,
    );
  }
  if (file.version < 1) {
    throw new NavFormatError(`Version ${file.version} gibt es nicht`);
  }

  // ── Hier kommen die Migrationen hin, eine je Schritt: ──
  // if (file.version === 1) { …aus 1 mach 2…; file.version = 2; }

  return {
    format: NAV_FORMAT,
    version: NAV_VERSION,
    tile: typeof file.tile === 'number' ? file.tile : TILE,
    ...(file.name ? { name: file.name } : {}),
    levels: Array.isArray(file.levels) && file.levels.length > 0 ? file.levels : [0],
    runs: Array.isArray(file.runs) ? file.runs : [],
    walls: Array.isArray(file.walls) ? file.walls : [],
    links: Array.isArray(file.links) ? file.links : [],
  };
}
