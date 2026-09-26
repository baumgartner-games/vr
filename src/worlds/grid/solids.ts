/**
 * **Der Quader** — die einzige Form, in der in diesem Projekt gebaut wird.
 *
 * Jede Welt hier stand vorher auf ihrer eigenen Handvoll `slab()`-Aufrufe: Dust
 * hatte siebzehn, der Schießstand zwölf, die Pizzeria dreißig. Jeder einzelne
 * ist eine Zahl in Metern, die niemand nachprüfen kann, ohne die Brille
 * aufzusetzen — und genau das ist der Grund, warum eine große Welt bisher nur
 * am Stück zu testen war.
 *
 * Deshalb steht der Quader jetzt hier, einmal, und **ohne three.js**: eine
 * Liste aus Mitte und Kantenlängen. Was sie baut, prüft ein Test in
 * Millisekunden; wer sie zeichnet (`GridWorld.ts`) oder abtastet
 * (`nav/navBake.ts`), bekommt in beiden Fällen dieselben Kästen.
 *
 * Der Typ hieß vorher `PlanSolid` und wohnte im Bauplatz (`editor/levelBuild.ts`).
 * Er heißt weiter so — an ihm hängt der Editor —, aber er gehört nicht mehr
 * dem Editor allein, sondern jeder Welt, die auf dem Kachelgitter steht.
 */

import type { BlockKind } from './blocks';

/**
 * **Woraus ein Quader ist.** Entscheidet über Farbe, Härte und ob ein Portal
 * daran haftet — und sonst über nichts.
 *
 * Die ersten drei sind die tragenden: Boden, Wand, Türblatt. Der Rest sind
 * Oberflächen, die eine Welt braucht, um nicht aus einem einzigen Grau zu
 * bestehen. Es sind bewusst **wenige**: Eine Palette mit dreißig Einträgen ist
 * eine, in der jede Welt ihren eigenen Ton erfindet, und dann sieht das
 * Dunkelhaus neben dem Schießstand aus wie aus zwei Spielen.
 */
export type PlanSolidKind =
  | 'floor'
  | 'wall'
  | 'door'
  /** Helle Tafel — und das Einzige, woran ein Portal von sich aus haftet. */
  | 'panel'
  | 'wood'
  | 'steel'
  | 'stone'
  /** Was leuchtet: Lampenglas, Leuchtstreifen. Kein Licht, nur die Farbe. */
  | 'glow';

/**
 * **Dieselben acht Sorten, aber zum Nachschlagen zur Laufzeit.**
 *
 * Ein Typ ist beim Übersetzen weg, und genau dann braucht man ihn: Wer eine
 * Welt aus einer Datei liest (`worldFile.ts`), hat eine Zeichenkette in der
 * Hand und muss fragen, ob sie eine Sorte ist. Die Liste steht deshalb neben
 * dem Typ — und weil sie danebensteht, fällt beim Erweitern auf, dass es zwei
 * Stellen sind.
 */
export const GRID_KINDS: readonly PlanSolidKind[] = [
  'floor',
  'wall',
  'door',
  'panel',
  'wood',
  'steel',
  'stone',
  'glow',
];

/** Ein Quader in Weltmetern: Mitte und Kantenlängen. */
export interface PlanSolid {
  kind: PlanSolidKind;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  /** Bei einer Tür: ihr Name im Plan — daran erkennt man das Blatt wieder. */
  door?: string;
  /**
   * **Um die Hochachse gedreht**, im Bogenmaß — bisher nur die Wand unter 45°
   * (`gridPlan.slopeSolid`). Ohne Angabe steht der Quader achsparallel, und so
   * rechnen alle, die nur Kästen kennen (`solidBounds`, Ghosting): Für sie ist
   * eine gedrehte Wand ein Kasten um ihre Mitte.
   */
  yaw?: number;
  /**
   * **Was das Zellgitter schon sperrt** (`nav/cellGrid.ts`): Wände, Türen,
   * Fenster, Schrägen, Möbel. Für den Spieler entscheidet über diese Quader
   * das Gitter und nicht die Physik — sie bekommen ein eigenes Bit
   * (`GROUP_CELL`), durch das die Kapsel hindurchgeht. Alles andere (Kisten,
   * NPCs, Hände) prallt weiter an ihnen ab.
   */
  cell?: boolean;
  /**
   * **Auf welcher Etage er steht** — die Marke, an der von oben aufgeschnitten
   * wird (`core/cutaway.ts`, Plan E8).
   *
   * Sie hängt am Quader und nicht an seiner Höhe, denn geraten wäre sie falsch:
   * Ein Hochbett steht höher als eine Türklinke und ist trotzdem im selben
   * Zimmer. Wer sie setzt, weiß es — die Kachel kennt ihre Etage
   * (`keyLevel`), die Masse ihre Unterkante, und eine **Decke** gehört zu dem
   * Stockwerk, das auf ihr steht, und nicht zu dem darunter.
   *
   * Ohne Angabe: keine Meinung, und dann wird der Quader nie ausgeblendet.
   */
  level?: number;
  /**
   * **Aus welchem Möbel er kommt** — gesetzt von `blocks.blockSolids()`, sonst
   * nirgends.
   *
   * Ein Baustein wird beim Bauen zu einer Handvoll Quadern plattgedrückt, und
   * danach wusste niemand mehr, dass es ein Regal war: Aus zwei Wangen und
   * vier Böden lässt sich das nicht zurücklesen, und wer es versuchte, hätte
   * eine zweite, stillschweigend mitgepflegte Liste von Maßen. Genau das ist
   * die Frage, die aufkam, als das erste Möbel ein Modell aus dem Regal
   * bekommen sollte (`blocks.blockModel`): **Welche dieser Kästen gehören
   * zusammen, und zu was?**
   *
   * Hier steht die Antwort, und zwar nur sie. Der Quader weiß, aus welchem
   * Möbel er kommt — nicht, wie groß das Möbel ist, nicht, wo es steht, nicht,
   * ob es ein Modell gibt. Alles Weitere schlägt nach, wer es braucht
   * (`GridWorld.buildBlockModels`), und das bleibt eine Stelle und nicht acht.
   *
   * Ohne Angabe: Boden, Wand, Tür, Masse — alles, was aus dem Grundriss selbst
   * kommt und aus keinem Möbel.
   */
  block?: BlockKind;
  /**
   * Ob ein Portal daran haftet.
   *
   * Ohne Angabe entscheidet die Sorte: helle Tafeln ja, alles andere nein.
   * Gesetzt wird es für die eine Ausnahme, die jede Freiluftkarte hat — **den
   * Boden**. Er ist ein einziger großer Quader und muss es sein: Jede
   * Portalfläche bekommt eine eigene Kollisionsgruppe, davon gibt es zehn
   * (`PhysicsWorld.ts`), und tausend Bodenkacheln einzeln portalfähig zu
   * machen hieße, dass ein Bodenportal auch die Wand gegenüber aufmacht.
   */
  portal?: boolean;
  /**
   * **Ein halber Boden unter einer Schräge** (`GridPlan.halfFloor`): die Ecke,
   * deren Dreieck leer bleibt. Nur bei `kind: 'floor'`; gebaut wird dann ein
   * dreieckiges Stück statt der ganzen Platte (`GridWorld.build`). Ohne
   * Angabe ist der Boden ganz. Physik und Zellgitter kennen weiter die ganze
   * Kachel — gegangen wird nur auf der inneren Hälfte, die äußeren Zellen
   * sperrt die Schräge ohnehin.
   */
  half?: FloorCorner;
}

/** Eine Ecke einer Kachel, nach Himmelsrichtung. */
export type FloorCorner = 'nw' | 'ne' | 'se' | 'sw';

/** Welche Ecken eine Schräge abtrennen kann: „╱" die nordwestliche und südöstliche, „╲" die anderen. */
export function slopeCorners(slope: 'slash' | 'backslash'): readonly [FloorCorner, FloorCorner] {
  return slope === 'slash' ? ['nw', 'se'] : ['ne', 'sw'];
}

/**
 * **Das Dreieck eines halben Bodens** im Grundriss, relativ zur Kachelmitte
 * (in Kachelgrößen, −½ … ½): die drei Ecken, die bleiben, wenn `empty` leer ist.
 */
export function halfFloorTriangle(empty: FloorCorner): Array<{ x: number; z: number }> {
  const corners: Record<FloorCorner, { x: number; z: number }> = {
    nw: { x: -0.5, z: -0.5 },
    ne: { x: 0.5, z: -0.5 },
    se: { x: 0.5, z: 0.5 },
    sw: { x: -0.5, z: 0.5 },
  };
  const order: FloorCorner[] = ['nw', 'ne', 'se', 'sw'];
  return order.filter((corner) => corner !== empty).map((corner) => corners[corner]);
}

/**
 * Ein Quader an einer Kante: `length` läuft **die Kante entlang**, `thick`
 * steht quer dazu.
 *
 * Die eine Stelle, an der die Achsen getauscht werden — und deshalb die eine
 * Stelle, an der man sie vertauschen kann. Überall sonst steht danach nur noch
 * `alongX`.
 */
export function slab(
  x: number,
  y: number,
  z: number,
  alongX: boolean,
  length: number,
  height: number,
  thick: number,
  kind: PlanSolidKind,
): PlanSolid {
  return {
    kind,
    x,
    y,
    z,
    w: alongX ? length : thick,
    h: height,
    d: alongX ? thick : length,
  };
}

/**
 * Ein Quader, der auf etwas **steht**: angegeben wird die Unterkante, nicht die
 * Mitte.
 *
 * Das ist die Rechnung, die in jeder Welt zwanzigmal von Hand stand — `[x,
 * height / 2, z]` —, und sie ist genau die, die man einmal falsch schreibt und
 * danach als „das Regal steckt im Boden" wiederfindet. Gebaut wird von unten,
 * weil man auch von unten baut.
 */
export function standing(
  kind: PlanSolidKind,
  x: number,
  base: number,
  z: number,
  w: number,
  h: number,
  d: number,
): PlanSolid {
  return { kind, x, y: base + h / 2, z, w, h, d };
}

/** Dieselben Quader, um einen Versatz verschoben. */
export function shifted(
  solids: readonly PlanSolid[],
  dx: number,
  dy: number,
  dz: number,
): PlanSolid[] {
  return solids.map((one) => ({ ...one, x: one.x + dx, y: one.y + dy, z: one.z + dz }));
}

/** Der Umriss einer Liste in Metern — `null`, wenn nichts darin steht. */
export function solidBounds(solids: readonly PlanSolid[]): {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
} | null {
  if (solids.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const one of solids) {
    minX = Math.min(minX, one.x - one.w / 2);
    maxX = Math.max(maxX, one.x + one.w / 2);
    minY = Math.min(minY, one.y - one.h / 2);
    maxY = Math.max(maxY, one.y + one.h / 2);
    minZ = Math.min(minZ, one.z - one.d / 2);
    maxZ = Math.max(maxZ, one.z + one.d / 2);
  }
  return { minX, minY, minZ, maxX, maxY, maxZ };
}
