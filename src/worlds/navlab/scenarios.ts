import { TILE } from '../nav/navTile';

/**
 * **Der Grundriss des Navigationslabors** — sechs Buchten, und was in jeder zu
 * sehen sein soll.
 *
 * Reine Daten und ein bisschen Rechnung: Wo eine Bucht liegt, wo ihre Wände
 * stehen, wie man in ihr einen Punkt angibt, und wie lange ein Szenario läuft.
 * Kein three.js, damit der Grundriss geprüft werden kann, bevor er gebaut ist —
 * eine Bucht, die in ihre Nachbarin ragt, sieht man in der Brille erst, wenn
 * ein Zombie durch die Wand kommt.
 *
 * **Alle Buchten sind gleich gebaut und öffnen zum Mittelgang.** Die nördliche
 * Reihe öffnet nach Süden, die südliche nach Norden — deshalb rechnet
 * `bayPoint` die Tiefe je nach Reihe **gespiegelt**. So steht die Geometrie
 * einmal im Code und nicht zweimal, und „lz = 7,5" heißt in jeder Bucht
 * „vorne am Eingang".
 *
 * **Jedes Maß hier ist ein Vielfaches der Kachel** (`nav/navTile.ts`, 2,5 m),
 * und das ist die wichtigste Zeile dieser Datei. Das Abtasten fragt zwischen
 * zwei Kachelmitten genau **einen** Punkt: die Grenze dazwischen (`navBake.ts`,
 * `joinTiles`). Eine Wand, die einen halben Meter neben dieser Grenze steht,
 * wird nicht gefunden — sie steht in der Welt, aber nicht auf der Karte, und
 * ein NPC plant seelenruhig einen Weg mitten hindurch und bleibt daran hängen.
 * Genau so war dieses Labor lange gebaut: 22 × 16 Meter im Raster von 2,5, und
 * von den Wänden jeder Bucht kannte die Wegsuche zwei. `scenarios.test.ts`
 * rechnet das jetzt nach, für jede Wand einzeln.
 */

/** Breite einer Bucht in Metern (X) — zehn Kacheln. */
export const BAY_W = 10 * TILE;
/** Tiefe einer Bucht in Metern (Z) — sechs Kacheln. */
export const BAY_D = 6 * TILE;
/** Der Gang zwischen den beiden Reihen — zwei Kacheln. */
export const AISLE = 2 * TILE;
/** Wie hoch die Trennwände sind: hoch genug für einen NPC, niedrig zum Drübersehen. */
export const WALL_H = 2.4;
/** Und wie dick. Dünner als eine halbe Kachel, damit eine Lücke eine Lücke bleibt. */
export const WALL_T = 0.4;
/**
 * Die Höhe des Dachs in der Etagen-Bucht.
 *
 * **2,4 m, und die Zahl ist keine Geschmacksfrage**: Sie muss unter dem
 * Absprung liegen, den das Abtasten noch als Absprung durchgehen lässt
 * (`BAKE_DEFAULTS.drop`). Eine Treppe hinauf gäbe es zwar im Gitter, aber ein
 * NPC ist heute ein dynamischer Zylinder ohne Schrittautomatik — er käme keine
 * Stufe hoch. Herunterfallen kann er, und deshalb ist diese Bucht ein Weg nach
 * unten und keiner nach oben.
 */
export const ROOF = 2.4;
/** Nach so vielen Sekunden räumt ein Szenario sich selbst auf. */
export const SCENARIO_TIME = 100;

export type ScenarioId = 'corridor' | 'pit' | 'crate' | 'door' | 'portal' | 'levels';

/** Ein Punkt im Maß einer Bucht — `lx` quer, `lz` in die Tiefe (`bayPoint`). */
export interface BaySpot {
  lx: number;
  lz: number;
}

/** Wer in einer Bucht losläuft, und wo. */
export interface BayCast extends BaySpot {
  kind: 'zombie' | 'dummy';
  /** Höhe über dem Boden der Bucht — nur die Etagen-Bucht braucht sie. */
  y?: number;
}

export interface Scenario {
  id: ScenarioId;
  title: string;
  /** Worauf man achten soll, in einer Zeile. */
  watch: string;
  /** Was der gelbe Knopf tut — leer heißt: es gibt keinen. */
  act: string;
  /** Die Mitte der Bucht in Weltmetern. */
  x: number;
  z: number;
  accent: number;
  /**
   * **Wo der Spieler steht, solange diese Bucht läuft.**
   *
   * Das ist keine Kosmetik, sondern die halbe Behauptung: Jede Bucht sagt
   * etwas darüber, *wie* ein NPC zu jemandem kommt, und ohne diesen Jemand
   * sagt sie nichts. Er steht deshalb immer **vorne** in der Bucht und der
   * Auftritt hinten — dazwischen liegt das, worum es geht: die zwei Ecken,
   * die Grube, der Durchgang, die Tür, die Wand mit dem Portal.
   *
   * Und er steht **nah genug**: Ein Zombie bemerkt einen Spieler auf 22 Meter
   * (`npc/npcBrains.ts`). Der Mittelgang eines 75 Meter breiten Labors ist von
   * den äußeren Buchten weiter weg als das — genau daran haben fünf der sechs
   * Knöpfe lange nichts getan (`scenarios.test.ts`).
   */
  stand: BaySpot;
  /** Wer in dieser Bucht auftritt. */
  cast: readonly BayCast[];
}

const ROW = BAY_D / 2 + AISLE / 2;
const COL = BAY_W + TILE;

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'corridor',
    title: 'Langer Gang',
    watch: 'Er kommt um zwei Ecken statt an der Wand zu kleben',
    act: '',
    x: -COL,
    z: -ROW,
    accent: 0x39d0ff,
    stand: { lx: 0, lz: 6.25 },
    cast: [{ kind: 'zombie', lx: -8.75, lz: -6.25 }],
  },
  {
    id: 'pit',
    title: 'Stachelgrube',
    watch: 'Der Zombie läuft hinein, die Puppe geht außen herum',
    act: '',
    x: 0,
    z: -ROW,
    accent: 0xff6b6b,
    stand: { lx: 0, lz: 6.25 },
    cast: [
      { kind: 'zombie', lx: -3.75, lz: -6.25 },
      { kind: 'dummy', lx: 3.75, lz: -6.25 },
    ],
  },
  {
    id: 'crate',
    title: 'Kiste im Weg',
    watch: 'Er plant um, sobald der Durchgang zu ist',
    act: 'Kiste in den Durchgang',
    x: COL,
    z: -ROW,
    accent: 0xffc857,
    stand: { lx: 0, lz: 6.25 },
    cast: [{ kind: 'zombie', lx: -6.25, lz: -6.25 }],
  },
  {
    id: 'door',
    title: 'Tür fällt zu',
    watch: 'Er läuft dagegen, merkt es dort und geht dann außen herum',
    act: 'Tür verriegeln',
    x: -COL,
    z: ROW,
    accent: 0xe58aa8,
    stand: { lx: 0, lz: 6.25 },
    cast: [{ kind: 'zombie', lx: -6.25, lz: -6.25 }],
  },
  {
    id: 'portal',
    title: 'Portal, von dem einer weiß',
    watch: 'Einer nimmt die Abkürzung, der andere läuft außen herum',
    act: 'Portal öffnen',
    x: 0,
    z: ROW,
    accent: 0x9d7bff,
    stand: { lx: 6.25, lz: -6.25 },
    cast: [
      { kind: 'zombie', lx: -6.25, lz: -6.25 },
      { kind: 'zombie', lx: -6.25, lz: -3.75 },
    ],
  },
  {
    id: 'levels',
    title: 'Vom Dach herunter',
    watch: 'Er steht oben, sucht sich die Kante und springt',
    act: '',
    x: COL,
    z: ROW,
    accent: 0x5ee0a0,
    stand: { lx: 6.25, lz: 3.75 },
    cast: [{ kind: 'zombie', lx: -6.25, lz: -3.75, y: ROOF }],
  },
];

export function scenarioOf(id: string | undefined): Scenario {
  return SCENARIOS.find((one) => one.id === id) ?? SCENARIOS[0]!;
}

/**
 * Ob eine Bucht in der nördlichen Reihe liegt.
 *
 * Sie öffnet dann nach Süden, und ihre Tiefe zählt andersherum.
 */
export function bayFacesSouth(bay: Scenario): boolean {
  return bay.z < 0;
}

/**
 * Ein Punkt in einer Bucht, in ihren eigenen Maßen.
 *
 * `lx` geht von −12,5 (links) bis 12,5 (rechts), `lz` von −7,5 (hinten) bis 7,5
 * (vorne am Eingang) — in **jeder** Bucht, egal in welcher Reihe sie steht.
 * Eine **Kachelmitte** liegt dabei auf ±1,25, ±3,75, ±6,25 …; wer etwas
 * hinstellt, das die Wegsuche wiederfinden soll, nimmt eine davon.
 */
export function bayPoint(bay: Scenario, lx: number, lz: number): { x: number; z: number } {
  const flip = bayFacesSouth(bay) ? 1 : -1;
  return { x: bay.x + lx, z: bay.z + lz * flip };
}

/** Derselbe Weg für einen Punkt, der schon als Paar dasteht (`stand`, `cast`). */
export function baySpot(bay: Scenario, spot: BaySpot): { x: number; z: number } {
  return bayPoint(bay, spot.lx, spot.lz);
}

// --- die Wände ------------------------------------------------------------

/**
 * Eine Wand einer Bucht: ihre Mitte und ihre Maße, alles in Buchtmaßen.
 *
 * Wände stehen hier und nicht in `NavLabWorld`, obwohl sie dort gebaut werden —
 * aus genau dem Grund, aus dem der ganze Grundriss hier steht: Ob eine Wand auf
 * einer Kachelgrenze sitzt, ist eine Rechnung mit zwei Zahlen, und eine
 * Rechnung mit zwei Zahlen gehört in einen Test und nicht in eine Brille.
 */
export interface BayWall {
  lx: number;
  lz: number;
  /** Länge in X. */
  w: number;
  /** Länge in Z. */
  d: number;
}

/**
 * **Die Hülle jeder Bucht**: hinten und an den Seiten dicht, vorne zwei
 * Stummel und dazwischen der Eingang — eine Bucht, die man nicht betreten
 * kann, zeigt nichts.
 */
const SHELL: readonly BayWall[] = [
  { lx: 0, lz: -BAY_D / 2, w: BAY_W, d: WALL_T },
  { lx: -BAY_W / 2, lz: 0, w: WALL_T, d: BAY_D },
  { lx: BAY_W / 2, lz: 0, w: WALL_T, d: BAY_D },
  { lx: -8.75, lz: BAY_D / 2, w: 7.5, d: WALL_T },
  { lx: 8.75, lz: BAY_D / 2, w: 7.5, d: WALL_T },
];

/** Und was in der einzelnen Bucht dazukommt. */
const INSIDE: Record<ScenarioId, readonly BayWall[]> = {
  // Ein Z: zwei Wände mit Lücken auf verschiedenen Seiten. Geradeaus geht hier
  // nichts, und genau das ist der Punkt.
  corridor: [
    { lx: -3.75, lz: -2.5, w: 17.5, d: WALL_T },
    { lx: 3.75, lz: 2.5, w: 17.5, d: WALL_T },
  ],
  // Die Grube ist ein Anstrich und keine Wand (`PIT`).
  pit: [],
  // Eine Wand mit zwei Durchgängen von je einer Kachel: links kurz, rechts weit.
  crate: [
    { lx: -10, lz: 0, w: 5, d: WALL_T },
    { lx: 0, lz: 0, w: 10, d: WALL_T },
    { lx: 10, lz: 0, w: 5, d: WALL_T },
  ],
  // Dieselbe Wand, aber die linke Lücke hat ein Türblatt und die rechte liegt
  // ganz außen (`DOOR`).
  door: [
    { lx: -10, lz: 0, w: 5, d: WALL_T },
    { lx: 2.5, lz: 0, w: 15, d: WALL_T },
  ],
  // Längs geteilt, vorne offen: der lange Weg führt einmal herum.
  portal: [{ lx: 0, lz: -2.5, w: WALL_T, d: 10 }],
  // Der Klotz ist keine Wand, sondern ein Dach mit etwas darunter (`BLOCK`).
  levels: [],
};

/** Alle Wände einer Bucht — Hülle und Innenleben. */
export function bayWalls(bay: Scenario): readonly BayWall[] {
  return [...SHELL, ...INSIDE[bay.id]];
}

/** Die Stachelgrube, in Buchtmaßen — sechs Kacheln breit, zwei tief. */
export const PIT = { minLx: -7.5, maxLx: 7.5, minLz: -2.5, maxLz: 2.5 };

/**
 * Die Tür: die Lücke, in der sie hängt, und die beiden Kacheln, zwischen denen
 * sie in der Karte steht.
 *
 * `slide` ist der Weg, den das Blatt beim Öffnen zur Seite macht — genau eine
 * Kachel, also in die Wand daneben.
 */
export const DOOR = { lx: -6.25, width: TILE, slide: TILE, gap: 1.25 };

/** Die beiden Enden des Portals — Kachelmitten, sonst findet es der Graph nicht. */
export const PORTAL: readonly BaySpot[] = [
  { lx: -6.25, lz: -6.25 },
  { lx: 6.25, lz: -6.25 },
];

/** Wo die Kiste in den Durchgang fällt. */
export const CRATE: BaySpot = { lx: -6.25, lz: 1.25 };

/** Der Klotz mit dem flachen Dach: Mitte und Maße in Buchtmaßen. */
export const BLOCK = { lx: -5, lz: -2.5, w: 10, d: 5 };

/** Die Ecken einer Bucht in Weltmetern. */
export function bayBounds(bay: Scenario): {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
} {
  return {
    minX: bay.x - BAY_W / 2,
    maxX: bay.x + BAY_W / 2,
    minZ: bay.z - BAY_D / 2,
    maxZ: bay.z + BAY_D / 2,
  };
}

/** Der ganze Grundriss, für Boden und Abtastgrenzen. */
export function labBounds(): { minX: number; minZ: number; maxX: number; maxZ: number } {
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const bay of SCENARIOS) {
    const box = bayBounds(bay);
    minX = Math.min(minX, box.minX);
    minZ = Math.min(minZ, box.minZ);
    maxX = Math.max(maxX, box.maxX);
    maxZ = Math.max(maxZ, box.maxZ);
  }
  return { minX, minZ, maxX, maxZ };
}

// --- die Uhr eines Szenarios ----------------------------------------------

export interface ScenarioState {
  /** Ob es gerade läuft. */
  running: boolean;
  /** Sekunden seit dem Start. */
  elapsed: number;
  /** Ob die Sonderaktion (der gelbe Knopf) schon ausgelöst wurde. */
  acted: boolean;
}

export function newScenarioState(): ScenarioState {
  return { running: false, elapsed: 0, acted: false };
}

/**
 * Ein Bild eines Szenarios. `true`, wenn die Zeit **in diesem Bild** abgelaufen
 * ist — dann räumt die Welt auf.
 *
 * Die Zeit kommt von außen, und das ist Absicht: Wer die Stoppuhr auf Zeitlupe
 * stellt, sieht ein Szenario in Zeitlupe, und die Uhr hier läuft mit. Eine Uhr,
 * die sich ihre Sekunden selbst holt, liefe daran vorbei.
 */
export function tickScenario(state: ScenarioState, dt: number, limit = SCENARIO_TIME): boolean {
  if (!state.running) return false;
  state.elapsed += dt;
  if (state.elapsed < limit) return false;
  state.running = false;
  return true;
}

/** Startet neu — dieselbe Uhr, von vorn. */
export function startScenario(state: ScenarioState): void {
  state.running = true;
  state.elapsed = 0;
  state.acted = false;
}

export function stopScenario(state: ScenarioState): void {
  state.running = false;
  state.elapsed = 0;
  state.acted = false;
}
