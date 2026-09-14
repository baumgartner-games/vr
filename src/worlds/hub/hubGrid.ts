import { GridPlan } from '../grid/gridPlan';
import type { Props } from '../grid/fixtures/index';
import {
  DIRS,
  DIR_E,
  DIR_N,
  DIR_S,
  DIR_W,
  dirX,
  dirZ,
  keyX,
  keyZ,
  neighbour,
  opposite,
  tileKey,
  type Dir,
  type TileKey,
} from '../nav/navTile';

/**
 * **Der Hub in Kacheln** — dieselbe Anlage wie bisher, nur auf dem Gitter.
 *
 * Die Form bleibt, wofür sie gemacht wurde (früher `hubLayout.ts`, in Metern
 * und mit freien Winkeln): eine Halle in der Mitte, davon gehen **Gänge** ab,
 * und an deren Wänden stehen die Tore — vier je Gang, zwei pro Seite,
 * gegeneinander versetzt. Ausgelegt wird das aus
 * nichts als der **Länge der Weltenliste**: Eine neue Welt in
 * `worlds/index.ts` bleibt ein Eintrag in der Registry, und niemand rückt hier
 * Koordinaten zurecht.
 *
 * **Drei Sachen sind beim Umzug aufs Gitter anders geworden**, und alle drei
 * aus demselben Grund — eine Kachel ist 2,5 m, und es gibt vier Richtungen:
 *
 * - **Vier Gänge und nicht beliebig viele.** Der alte Hub verteilte seine
 *   Gänge über den Kreis (drei Gänge zu 120°, fünf zu 72°); auf einem
 *   Kachelgitter gibt es Norden, Osten, Süden und Westen und sonst nichts. Ein
 *   fünfter Gang wäre einer, dessen Wände zwischen den Kacheln lägen. Also
 *   vier — und wenn die voll sind, werden sie **länger** statt mehr
 *   (`gatesPerCorridor`). Sechzehn Welten passen in die kurze Fassung; darüber
 *   wächst jeder Gang um zwei Kacheln je zusätzlichem Torpaar.
 * - **Die Tore schauen zur Halle.** Bisher standen sie quer im Gang und waren
 *   dafür ein Stück eingedreht, damit man beim Hineingehen
 *   mehr als die Kante des Rings sah. Einen Fünftelkreis gibt es auf dem
 *   Gitter nicht, also schauen sie gleich ganz zurück zum Eingang: Wer aus der
 *   Halle in einen Gang blickt, liest alle vier Schilder auf einmal.
 * - **Die Halle ist ein Quadrat.** Sieben mal sieben Kacheln statt eines
 *   Kreises mit sieben Metern Halbmesser — rund ist auf einem Gitter eine
 *   Treppe. Ihre Rundung kommt aus der Welt und nicht aus dem Grundriss
 *   (`HubWorld` legt die Scheibe und den Ring darauf).
 *
 * **Und kein Dach**, wie im alten Hub auch: Die Gänge haben Wände und Lampen,
 * aber nichts darüber. Von oben wäre ein gedeckelter Gang ein schwarzer
 * Balken — man sähe die Tore erst, wenn man mit der Nase daran steht, und das
 * Aufschneiden der Ebenen (E8) kommt erst mit P7. Oben ist deshalb Himmel, und
 * der ist beim Ankommen ohnehin das Erste, was man sieht.
 *
 * Reine Rechnung, kein three.js — deshalb steht der Test daneben, und deshalb
 * fällt ein Tor, das man vom Startpunkt aus nicht erreicht, in einer
 * Millisekunde auf statt nach dem Aufsetzen.
 */

/**
 * Halbe Kantenlänge der Halle in Kacheln — 3 heißt sieben mal sieben.
 *
 * Ungerade, damit es eine **Mittelkachel** gibt: Dort steht der Startpunkt,
 * und dort trifft sich, was aus vier Gängen kommt. Sieben Kacheln sind 17,5 m;
 * der alte Kreis hatte 14 m Durchmesser, und der Unterschied ist genau der
 * Platz, den die vier Gangmündungen brauchen.
 */
export const HALL_HALF = 3;

/**
 * Lichte Breite eines Gangs in Kacheln.
 *
 * Drei: eine Kachel für jede Seite mit den Toren und **eine in der Mitte, die
 * frei bleibt**. Zwei wären das Minimum und hießen, dass man zwischen zwei
 * Torpodesten hindurch muss; bei drei läuft man in der Mitte durch und tritt
 * zur Seite, wenn man wo hin will.
 */
export const CORRIDOR_WIDTH = 3;

/** Wie viele Tore in einen Gang passen, solange es nicht mehr braucht. */
export const GATES_PER_CORRIDOR = 4;

/** Wie weit hinter dem Hallenrand das erste Tor steht, in Kacheln. */
export const FIRST_GATE = 2;

/**
 * Wie viele Kacheln zwischen zwei Toren liegen.
 *
 * Zwei — und weil sich die Seiten abwechseln, sind es zwischen zwei Toren
 * **derselben** Seite vier Kacheln (10 m). Der alte Hub stellte sie 7,5 m
 * auseinander; auf dem Gitter ist das die nächste ganze Zahl nach oben, und
 * enger will man es nicht: Zwei Schilder, die man nicht auseinanderhalten
 * kann, sind der Fehler, wegen dem der Bogen damals aufgegeben wurde.
 */
export const GATE_STEP = 2;

/** Was hinter dem letzten Tor noch Gang ist, damit er nicht abrupt endet. */
export const CORRIDOR_TAIL = 2;

/** Die vier Gänge, in der Reihenfolge, in der sie belegt werden. */
export const CORRIDORS: readonly Dir[] = [DIR_N, DIR_E, DIR_S, DIR_W];

/** Wo ein Tor steht und wohin es schaut. */
export interface HubGate {
  /** Sein Platz in der Weltenliste — die Reihenfolge bleibt die der Registry. */
  index: number;
  x: number;
  z: number;
  /** Blickrichtung: zurück zur Halle. */
  dir: Dir;
  /** In welchem der vier Gänge es steht (Index in `CORRIDORS`). */
  corridor: number;
}

/** Ein Gang: seine Richtung und wie weit er reicht, in Kacheln von der Mitte. */
export interface HubCorridor {
  dir: Dir;
  /** Die erste Kachel hinter der Halle. */
  from: number;
  /** Die letzte, hinter dem letzten Tor. */
  to: number;
  /** Wie viele Tore darin stehen. */
  gates: number;
}

export interface HubGrid {
  plan: GridPlan;
  gates: HubGate[];
  corridors: HubCorridor[];
  /** Die Mittelkachel — hier steht man, wenn der Hub aufgeht. */
  spawn: TileKey;
  /** Wie weit die Anlage vom Mittelpunkt reicht, in Kacheln. */
  reach: number;
}

/**
 * **Wie viele Tore in einen Gang kommen**, wenn es `count` Welten gibt.
 *
 * Bis sechzehn sind es vier; darüber werden alle vier Gänge gleichmäßig
 * länger. Aufgerundet, damit auch die letzte Welt einen Platz hat — der letzte
 * Gang bleibt dann kürzer als die anderen, und das sieht man ihm an, ohne dass
 * es stört.
 */
export function gatesPerCorridor(count: number): number {
  return Math.max(GATES_PER_CORRIDOR, Math.ceil(count / CORRIDORS.length));
}

/** Wie viele Gänge `count` Welten brauchen — höchstens vier. */
export function corridorCount(count: number): number {
  if (count <= 0) return 0;
  return Math.min(CORRIDORS.length, Math.ceil(count / gatesPerCorridor(count)));
}

/**
 * **Wo die Tore stehen** — die ganze Anordnung, ohne Grundriss drumherum.
 *
 * Getrennt von `hubGrid()`, weil die Welt beim Bauen dieselbe Liste noch
 * einmal braucht (welches Tor in welche Welt führt) und ein zweites Ausrechnen
 * daneben die Sorte Fehler wäre, die man erst bemerkt, wenn hinter dem Schild
 * _Dust_ das Dunkelhaus liegt.
 */
export function hubGates(count: number): HubGate[] {
  const gates: HubGate[] = [];
  if (count <= 0) return gates;
  const perCorridor = gatesPerCorridor(count);

  for (let index = 0; index < count; index++) {
    const corridor = Math.floor(index / perCorridor);
    const rank = index % perCorridor;
    const dir = CORRIDORS[corridor]!;
    // Wie weit den Gang hinunter, von der Mitte der Halle aus gezählt.
    const along = HALL_HALF + FIRST_GATE + rank * GATE_STEP;
    // Abwechselnd rechts und links: zwei je Seite, gegeneinander versetzt.
    const side = rank % 2 === 0 ? right(dir) : left(dir);
    gates.push({
      index,
      x: dirX(dir) * along + dirX(side),
      z: dirZ(dir) * along + dirZ(side),
      // Zurück zum Eingang — siehe oben.
      dir: opposite(dir),
      corridor,
    });
  }
  return gates;
}

/**
 * **Der Grundriss des Hubs** für `count` Welten.
 *
 * Boden legen, Wände drumherum, Tore setzen — in der Reihenfolge, und die ist
 * nicht beliebig: Die Wände entstehen aus der Frage „liegt hinter dieser Kante
 * noch Boden?", und die lässt sich erst beantworten, wenn aller Boden liegt.
 * Genau deshalb muss niemand die Gangmündungen von Hand aussparen — dort liegt
 * Boden, also steht dort keine Wand.
 */
export function hubGrid(count: number, props: (index: number) => Props = () => ({})): HubGrid {
  const plan = new GridPlan([0]);
  const gates = hubGates(count);

  // Die Halle.
  plan.floor({ x: -HALL_HALF, z: -HALL_HALF, w: HALL_HALF * 2 + 1, d: HALL_HALF * 2 + 1 });

  // Die Gänge: von der Hallenkante bis hinter das letzte Tor ihres Gangs.
  const corridors: HubCorridor[] = [];
  for (let index = 0; index < corridorCount(count); index++) {
    const inThis = gates.filter((gate) => gate.corridor === index).length;
    corridors.push({
      dir: CORRIDORS[index]!,
      from: HALL_HALF + 1,
      to: HALL_HALF + FIRST_GATE + (inThis - 1) * GATE_STEP + CORRIDOR_TAIL,
      gates: inThis,
    });
  }
  for (const corridor of corridors) {
    plan.floor(corridorRect(corridor.dir, corridor.from, corridor.to));
  }
  const reach = corridors.reduce((max, one) => Math.max(max, one.to), HALL_HALF);

  // **Die Außenhaut.** Wo hinter einer Kante kein Boden liegt, steht eine
  // Wand — und wo doch, eben nicht. Das ist der ganze Trick an der
  // Plusform: Die vier Mündungen sparen sich selbst aus.
  for (const key of [...plan.graph.tileKeys()]) {
    for (const dir of DIRS) {
      if (plan.graph.has(neighbour(key, dir))) continue;
      plan.wall(keyX(key), keyZ(key), dir);
    }
  }

  // **Die Tore, und ihre Kennung ist vergeben und nicht gewachsen.** Wer sie
  // beschriftet, ist die Welt (`HubWorld`) und nicht der Grundriss: Was hinter
  // einem Tor liegt, steht in der Weltenregistry, und eine Kachelrechnung, die
  // sie kennte, wäre eine, die man ohne halbes Spiel nicht mehr prüfen kann.
  for (const gate of gates) {
    plan.putFixture({
      id: gateId(gate.index),
      kind: 'gate',
      x: gate.x,
      z: gate.z,
      dir: gate.dir,
      props: props(gate.index),
    });
  }

  return { plan, gates, corridors, spawn: tileKey(0, 0, 0), reach };
}

/** Die Kennung des Tors zur `index`-ten Welt. */
export function gateId(index: number): string {
  return `gate-${index}`;
}

/** Das Kachelrechteck eines Gangstücks, von `from` bis `to` (beides dabei). */
function corridorRect(
  dir: Dir,
  from: number,
  to: number,
): { x: number; z: number; w: number; d: number } {
  const half = (CORRIDOR_WIDTH - 1) / 2;
  const side = right(dir);
  const corners = [from, to].flatMap((along) =>
    [-half, half].map((across) => ({
      x: dirX(dir) * along + dirX(side) * across,
      z: dirZ(dir) * along + dirZ(side) * across,
    })),
  );
  const xs = corners.map((one) => one.x);
  const zs = corners.map((one) => one.z);
  const x = Math.min(...xs);
  const z = Math.min(...zs);
  return { x, z, w: Math.max(...xs) - x + 1, d: Math.max(...zs) - z + 1 };
}

/** Quer zur Gangrichtung, nach rechts. */
function right(dir: Dir): Dir {
  return ((dir + 1) % 4) as Dir;
}

/** Und nach links. */
function left(dir: Dir): Dir {
  return ((dir + 3) % 4) as Dir;
}
