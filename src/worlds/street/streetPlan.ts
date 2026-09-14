import { GridPlan } from '../grid/gridPlan';
import { DIR_E, DIR_N, DIR_S, DIR_W, TILE, type Dir } from '../nav/navTile';
import { findWorld } from '../index';
import { stampDoors } from './stampDoors';
import { stampEffects } from './stampEffects';
import { stampStairs } from './stampStairs';

/**
 * **Die Straßenküche als Grundriss** — die Kreuzung aus dem Referenzbild in
 * Kacheln.
 *
 * Sie ist die Testwelt für alles, was von oben angefasst wird: Türen, Knöpfe,
 * Treppen und Effekte kommen in den Paketen danach hinein (P6, P7), und zwar
 * genau hier — in eine Welt, die schon steht, in der man schon läuft und in
 * der man sofort sieht, ob etwas im Weg ist.
 *
 * **Die Karte steht als Zeichnung in dieser Datei** (`MAP`), eine Zeile je
 * Kachelreihe, und sie ist nicht die Abschrift des Plans, sondern der Plan
 * selbst: Was hier als Buchstabe steht, wird unten zu Boden, Baustein oder
 * Masse. Eine Karte, die man zweimal führt — einmal als Bild in einem
 * Kommentar und einmal als Aufrufe darunter —, ist eine, die nach dem dritten
 * Verschieben nicht mehr zusammenpasst.
 *
 * **Norden ist oben**, wie überall in diesem Projekt: Zeile 0 liegt im Norden
 * (−Z), Spalte 0 im Westen (−X). Die Mitte der Zeichnung liegt auf der Null,
 * damit die gelbe Mittellinie der Straße wirklich auf `x = 0` fällt und nicht
 * irgendwo bei 31 Metern.
 *
 * **Zwei Sachen sind gegenüber der Zeichnung im Plan verschoben**, und beide
 * aus demselben Grund — man läuft darin:
 *
 * - Der **Zebrastreifen** liegt quer über der Fahrbahn (Zeilen 6–7) statt
 *   längs in ihr. Ein Streifen, der in Fahrtrichtung liegt, ist keine
 *   Querung, sondern ein Mittelstreifen; quer darüber ist er das, was das
 *   Referenzbild zeigt — der breite gestreifte Balken zwischen den beiden
 *   Küchenzeilen.
 * - Das **Tor zum Hub** steht eine Kachel neben der Fahrbahn (Zeile 13,
 *   Spalte 9) statt mitten darauf und damit drei Kacheln vom Startplatz
 *   entfernt. Ein Tor direkt neben dem Spawn ist eines, durch das man beim
 *   ersten Schritt fällt, bevor man die Welt gesehen hat.
 */

/** Die Legende der Zeichnung — ein Zeichen, eine Sache. */
export const MARKS = {
  /** Bordstein und Beton: der feste Rand ringsherum, hüfthoch. */
  kerb: 'B',
  /** Straße — begehbarer Boden, nur dunkler. */
  street: 'S',
  /** Zebrastreifen — Straße mit weißen Balken darauf. */
  zebra: 'Z',
  /** Küchenzeile (`counter`). */
  counter: 'K',
  /** Herd: Küchenzeile mit rotem Sockel darauf. */
  stove: 'H',
  /** Marktstand: Masse mit gestreifter Markise. */
  stall: 'M',
  /** Bank (`bench`). */
  bench: 'b',
  /** Kiste — ein Gegenstand, den man schiebt, und deshalb keine Kachel voll. */
  crate: 'k',
  /** Das Tor zurück in den Hub. */
  gate: 'T',
  /** Podest auf Ebene 1 — gebaut wird es von P7 (`stampStairs.ts`). */
  podium: 'P',
  /** Wo die Treppe hinaufführt — ebenfalls P7. */
  stairs: '^',
  /** Freier Boden. */
  free: '.',
} as const;

/**
 * **Die Karte.** 24 Spalten, 16 Zeilen, Norden oben.
 *
 * ```
 *        Spalte 0         1         2
 *               012345678901234567890123
 * ```
 */
export const MAP: readonly string[] = [
  'BBBBBBBBBBBBBBBBBBBBBBBB', //  0  Bordstein
  'BPPP^.....SSSS....MMM..B', //  1  Podest, Treppe, Stände
  'BPPP...MMMSSSS.........B', //  2
  'B.........SSSS.........B', //  3
  'B.KKHKHKK.SSSS.KKKKk...B', //  4  die beiden Küchenzeilen
  'B.......K.SSSS.K.......B', //  5
  'BM........ZZZZ.K.....b.B', //  6  der Zebrastreifen
  'BM........ZZZZ.K.......B', //  7
  'B.........SSSS.K...k...B', //  8
  'B..KKKKKK.SSSS.KKKkk...B', //  9
  'B.........SSSS.........B', // 10
  'B...MMM...SSSS....MMM..B', // 11
  'B.........SSSS.........B', // 12  Startplatz: Spalte 12
  'B........TSSSS.........B', // 13  Tor → Hub
  'Bb........SSSS.......b.B', // 14
  'BBBBBBBBBBBBBBBBBBBBBBBB', // 15
];

/** Wie breit und wie tief die Karte ist, in Kacheln. */
export const COLS = 24;
export const ROWS = 16;

/**
 * Die Höhe des Podests im Nordwesten.
 *
 * Es steht als **Ebene 1** im Graphen bereit und ist noch leer: Gebaut wird es
 * von P7 (`stampStairs.ts`), der auch die Treppe hinaufsetzt. Die Etage steht
 * trotzdem schon hier, weil sie zum Grundriss gehört und nicht zur Möblierung
 * — eine Welt, die ihre Etagen erst beim Möblieren bekommt, hat eine
 * Navigationskarte, die von der Reihenfolge der Aufrufe abhängt.
 */
export const STOREY = 3.1;
export const LEVELS: readonly number[] = [0, STOREY];

/** Wie hoch der Bordstein ringsherum ist — Beton, den man nicht übersteigt. */
const KERB_H = 1.15;

/** Wo man ankommt: Zeile 12, Spalte 12, mitten auf der Fahrbahn. */
export const SPAWN = { col: 12, row: 12 } as const;

/** Die Fahrbahn: vier Kacheln breit, zehn Meter, zwei Spuren. */
export const ROAD = { col: 10, row: 1, cols: 4, rows: 14 } as const;
/** Der Zebrastreifen quer darüber. */
export const CROSSING = { col: ROAD.col, row: 6, cols: ROAD.cols, rows: 2 } as const;

/** Eine Zelle der Zeichnung. */
export interface Cell {
  col: number;
  row: number;
}

/** Eine Reihe gleicher Möbel: wo sie anfängt, wie lang sie ist, wohin sie steht. */
export interface Row extends Cell {
  count: number;
  along: 'x' | 'z';
  /**
   * An welcher **Kante** die Reihe steht — und damit, wohin sie schaut: Ein
   * Baustein mit `DIR_N` steht an der Nordkante und schaut nach Süden
   * (`grid/blocks.ts`).
   */
  dir: Dir;
}

/**
 * **Die Küchenzeilen**, Reihe für Reihe.
 *
 * Die Blickrichtung steht hier und nicht in der Zeichnung: Ein Zeichen je
 * Kachel sagt, *dass* dort eine Zeile steht, aber nicht, auf welcher Seite man
 * davorsteht — und eine geratene Richtung ist in drei von vier Fällen die
 * falsche. Dass Tabelle und Zeichnung sich einig bleiben, prüft der Test.
 */
export const COUNTERS: readonly Row[] = [
  // Westküche: die lange Zeile mit den beiden Herden, offen nach Süden.
  { col: 2, row: 4, count: 7, along: 'x', dir: DIR_N },
  // Ihr kurzer Schenkel zur Straße hin.
  { col: 8, row: 5, count: 1, along: 'z', dir: DIR_W },
  // Die Zeile mit den Schneidbrettern, offen nach Norden.
  { col: 3, row: 9, count: 6, along: 'x', dir: DIR_S },
  // Ostküche: kurze Zeile im Norden, langer Schenkel zur Straße.
  { col: 15, row: 4, count: 4, along: 'x', dir: DIR_N },
  { col: 15, row: 5, count: 4, along: 'z', dir: DIR_E },
  { col: 15, row: 9, count: 3, along: 'x', dir: DIR_S },
];

/** Wo ein Herd auf der Zeile steht — der rote Sockel, ohne Funktion. */
export const STOVES: readonly Cell[] = cellsOf(MARKS.stove);

/**
 * **Die Marktstände.** `dir` ist die Kante, an der ihre Rückwand steht; die
 * Markise kragt nach vorn, also in die Gegenrichtung.
 */
export const STALLS: readonly Row[] = [
  { col: 18, row: 1, count: 3, along: 'x', dir: DIR_N },
  { col: 7, row: 2, count: 3, along: 'x', dir: DIR_N },
  { col: 1, row: 6, count: 2, along: 'z', dir: DIR_W },
  { col: 4, row: 11, count: 3, along: 'x', dir: DIR_S },
  { col: 18, row: 11, count: 3, along: 'x', dir: DIR_S },
];

/** Die Bänke am Rand — `dir` ist wie beim Baustein die Kante, an der sie steht. */
export const BENCHES: readonly (Cell & { dir: Dir })[] = [
  { col: 21, row: 6, dir: DIR_E },
  { col: 1, row: 14, dir: DIR_S },
  { col: 21, row: 14, dir: DIR_S },
];

/** Wo die schiebbaren Kisten liegen. */
export const CRATES: readonly Cell[] = cellsOf(MARKS.crate);

/** Das Tor zurück in den Hub. */
export const GATE: Cell = cellsOf(MARKS.gate)[0] ?? { col: 9, row: 13 };

/** Die Kachel des Podests und die der Treppe — beide gehören P7. */
export const PODIUM: readonly Cell[] = cellsOf(MARKS.podium);
export const STAIRS: Cell = cellsOf(MARKS.stairs)[0] ?? { col: 4, row: 1 };

/**
 * Zu welcher Küchenzeile diese Zelle gehört — `null`, wenn dort keine steht.
 *
 * Der Herd braucht das: Sein roter Sockel steht auf der Arbeitsplatte, und die
 * liegt an der Kante, an der die Zeile steht (`dir`) — mitten auf der Kachel
 * stünde er in der Luft daneben.
 */
export function counterAt(col: number, row: number): Row | null {
  for (const run of COUNTERS) {
    for (let i = 0; i < run.count; i++) {
      const at = {
        col: run.along === 'x' ? run.col + i : run.col,
        row: run.along === 'z' ? run.row + i : run.row,
      };
      if (at.col === col && at.row === row) return run;
    }
  }
  return null;
}

/** Alle Zellen mit diesem Zeichen, von Nord nach Süd und West nach Ost. */
export function cellsOf(mark: string): Cell[] {
  const out: Cell[] = [];
  for (let row = 0; row < MAP.length; row++) {
    const line = MAP[row] ?? '';
    for (let col = 0; col < line.length; col++) {
      if (line[col] === mark) out.push({ col, row });
    }
  }
  return out;
}

/** Was auf dieser Zelle steht — außerhalb der Karte ist Bordstein. */
export function markAt(col: number, row: number): string {
  return MAP[row]?.[col] ?? MARKS.kerb;
}

/**
 * **Von der Zeichnung auf das Kachelgitter.**
 *
 * Die Mitte der Karte liegt auf der Null: Spalte 12 ist `x = 0`, Zeile 8 ist
 * `z = 0`. Das ist keine Kosmetik — die gelbe Mittellinie läuft genau auf der
 * Kachelkante bei `x = 0`, und eine Welt, deren Mitte bei 31 Metern liegt,
 * rechnet man beim Hinsehen jedes Mal um.
 */
export function tileX(col: number): number {
  return col - COLS / 2;
}

export function tileZ(row: number): number {
  return row - ROWS / 2;
}

/** Die Mitte einer Zelle in Weltmetern. */
export function centreX(col: number): number {
  return (tileX(col) + 0.5) * TILE;
}

export function centreZ(row: number): number {
  return (tileZ(row) + 0.5) * TILE;
}

/** Ein Kachelrechteck aus Zeichenkoordinaten. */
export function rect(
  col: number,
  row: number,
  cols: number,
  rows: number,
  level = 0,
): { x: number; z: number; w: number; d: number; level: number } {
  return { x: tileX(col), z: tileZ(row), w: cols, d: rows, level };
}

/** Ob auf dieser Zelle Boden liegt — Bordstein und Marktstand sind kein Boden. */
export function walkable(col: number, row: number): boolean {
  const mark = markAt(col, row);
  return mark !== MARKS.kerb && mark !== MARKS.stall;
}

/**
 * **Der Grundriss.**
 *
 * Erst der Boden unter allem (eine einzige Masse, wie in Dust und am
 * Schießstand — tausend portalfähige Bodenkacheln hießen, dass ein Bodenportal
 * nebenbei die Wand gegenüber aufmacht), dann die Kacheln, auf denen gelaufen
 * wird, dann der Bordstein, dann das Mobiliar.
 */
export function streetPlan(): GridPlan {
  const plan = new GridPlan(LEVELS);

  // Der Beton unter der ganzen Karte, zwei Zentimeter unter null, damit er
  // sich mit den Bodenkacheln nicht um jedes Pixel streitet.
  plan.mass('floor', rect(0, 0, COLS, ROWS), -0.4, -0.02, { portal: true });

  // Boden auf alles, was kein Bordstein und kein Marktstand ist. Kachel für
  // Kachel und nicht als Rechteck: Die Karte hat Löcher, und ein Rechteck
  // darüber legte Boden unter die Stände, auf dem dann niemand steht.
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (walkable(col, row)) plan.floor(rect(col, row, 1, 1));
    }
  }

  // Der Bordstein: vier Massen statt achtundsiebzig Kacheln.
  for (const [col, row, cols, rows] of [
    [0, 0, COLS, 1],
    [0, ROWS - 1, COLS, 1],
    [0, 0, 1, ROWS],
    [COLS - 1, 0, 1, ROWS],
  ] as const) {
    plan.mass('stone', rect(col, row, cols, rows), 0, KERB_H);
  }

  // Die Küchenzeilen. `putRun` läuft nach Osten bzw. nach Süden, genau wie die
  // Tabelle es aufschreibt.
  for (const run of COUNTERS) {
    plan.putRun('counter', tileX(run.col), tileZ(run.row), run.count, run.along, run.dir);
  }

  // Die Marktstände sind Massen und keine Bausteine: ein Kasten mit Markise
  // ist kein Möbel auf einer Kachel, sondern ein kleines Haus über dreien.
  // Ihre Kacheln haben deshalb gar keinen Boden (siehe `walkable`), und das
  // Bild dazu baut die Welt (`StreetWorld.ts`).
  for (const stall of STALLS) {
    const cols = stall.along === 'x' ? stall.count : 1;
    const rows = stall.along === 'z' ? stall.count : 1;
    plan.mass('wood', rect(stall.col, stall.row, cols, rows), 0, 0.95);
  }

  for (const bench of BENCHES) {
    plan.put('bench', tileX(bench.col), tileZ(bench.row), bench.dir);
  }

  /**
   * **Das Tor zurück in den Hub** — ein Einbau und kein eigenes Gebilde.
   *
   * Die Art `gate` gehört P4 (`grid/fixtures/gate.ts`). Solange es sie in
   * diesem Programm nicht gibt, steht der Einbau im Plan und wird beim Bauen
   * übersprungen und gemeldet (`GridWorld.buildFixtures`) — genau dafür ist
   * die Registry so gebaut. Ein zweites, selbstgebautes Tor daneben wäre eines,
   * das zwei Wochen später niemand mehr wegräumt.
   */
  plan.putFixture({
    id: 'tor-hub',
    kind: 'gate',
    x: tileX(GATE.col),
    z: tileZ(GATE.row),
    dir: DIR_S,
    props: {
      world: 'hub',
      label: '→ Hub',
      accent: findWorld('hub')?.accent ?? 0x4aa8ff,
    },
  });

  // --- und was die anderen Pakete daran hängen ------------------------------
  //
  // Drei Zeilen, drei Dateien, drei Eigentümer: Wer eine Tür, eine Treppe oder
  // einen Effekt in diese Welt stellt, schreibt sie in seine eigene Datei und
  // hier nur den Aufruf. Diese Datei ist die Komponistin — sie sagt, *was*
  // zusammenkommt, und nicht, wie es aussieht.
  stampDoors(plan);
  stampStairs(plan);
  stampEffects(plan);

  return plan;
}

export { DIR_E, DIR_N, DIR_S, DIR_W, TILE };
export type { Dir };
