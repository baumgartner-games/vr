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
