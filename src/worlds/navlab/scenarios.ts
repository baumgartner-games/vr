import { addPortal, connect, coverRect, doorBetween } from '../nav/navBuild';
import type { DoorMaterial } from '../nav/navDoor';
import type { NavGraph } from '../nav/navGraph';
import { HAZARD_SPIKES } from '../nav/navProfile';
import { NO_TILE, TILE } from '../nav/navTile';

/**
 * **Der Grundriss des Navigationslabors** — acht Buchten, und was in jeder zu
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

export type ScenarioId =
  'corridor' | 'pit' | 'crate' | 'narrow' | 'door' | 'portal' | 'levels' | 'podium';

/** Ein Punkt im Maß einer Bucht — `lx` quer, `lz` in die Tiefe (`bayPoint`). */
export interface BaySpot {
  lx: number;
  lz: number;
  /**
   * Höhe über dem Boden der Bucht, in Metern.
   *
   * Zwei Buchten brauchen sie: das Dach der Etagen-Bucht und das freistehende
   * Podest. Wer sie wegläßt, steht auf dem Boden — das ist der Normalfall und
   * bleibt es.
   */
  y?: number;
}

/** Wer in einer Bucht losläuft, und wo. */
export interface BayCast extends BaySpot {
  kind: 'zombie' | 'dummy';
}

/**
 * **Was ein gelber Knopf tut.**
 *
 * Eine Liste und nicht mehr ein einzelnes Wort, seit die Tür zwei Sachen
 * kann: auf- und zugehen, und verriegelt werden. Das eine ist ein Schalter,
 * den man beliebig oft umlegt, das andere die Wendung des Szenarios — deshalb
 * `once`.
 */
export interface ScenarioAct {
  id: string;
  label: string;
  /** Nur einmal je Durchlauf, und nur solange einer läuft. */
  once?: boolean;
}

export interface Scenario {
  id: ScenarioId;
  title: string;
  /** Worauf man achten soll, in einer Zeile. */
  watch: string;
  /** Was die gelben Knöpfe tun — leer heißt: es gibt keine. */
  acts: readonly ScenarioAct[];
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
/**
 * Der Abstand zweier Buchtmitten in einer Reihe — **zwölf Kacheln**.
 *
 * Zwei Kacheln Luft zwischen zwei Buchten und nicht eine, und das ist keine
 * Geschmacksfrage: Vier Buchten je Reihe stehen bei ungerader Spaltenzahl
 * symmetrisch nur dann auf Kachelmitten, wenn der halbe Abstand selbst ein
 * Vielfaches der Kachel ist. Bei 27,5 m wäre die Hälfte 13,75 — und damit
 * stünde jede Wand jeder Bucht neben der Kachelgrenze statt darauf, was das
 * Abtasten still verschluckt (`scenarios.test.ts`).
 */
const COL = BAY_W + 2 * TILE;

// --- was in den einzelnen Buchten steht ------------------------------------

/** Die Stachelgrube, in Buchtmaßen — sechs Kacheln breit, zwei tief. */
export const PIT = { minLx: -7.5, maxLx: 7.5, minLz: -2.5, maxLz: 2.5 };

/**
 * **Wie tief die Grube ist — und warum ausgerechnet so tief.**
 *
 * Sie ist ein **Loch** und kein Anstrich: Wer hineinläuft, fällt hinein, steht
 * unten zwischen den Stacheln und kommt dort nicht mehr heraus. Das ist der
 * Unterschied zwischen einer Warnung und einer Falle, und es ist der Grund,
 * warum diese Bucht überhaupt zwei Sorten NPC auf die Bühne stellt.
 *
 * Die Zahl ist keine Geschmacksfrage: Sie muss **über** dem Band liegen, mit
 * dem das Abtasten Böden einer Etage zuschlägt (`BAKE_DEFAULTS.band`, 1,6 m).
 * Eine flachere Grube wäre für die Karte nur eine tiefergelegte Kachel des
 * Erdgeschosses — mit einer Treppe hinein und wieder heraus. So findet das
 * Abtasten dort gar keinen Boden, und was die Karte an dieser Stelle sagt,
 * sagt die Welt bewusst allein (`applyLabMap`).
 */
export const PIT_DEPTH = 2.2;

/**
 * Was die Stacheln je Sekunde abziehen.
 *
 * Ein Zombie hält 100 aus (`npcKinds.ts`) — er zappelt also knapp zwei
 * Sekunden zwischen ihnen herum und bleibt dann liegen. Das ist mit Absicht
 * lang genug zum Zusehen und kurz genug, dass niemand sich fragt, ob die
 * Grube überhaupt etwas tut.
 */
export const PIT_DAMAGE = 60;

/**
 * Die Tür: die Lücke, in der sie hängt, und die beiden Kacheln, zwischen denen
 * sie in der Karte steht.
 *
 * `slide` ist der Weg, den das Blatt beim Öffnen zur Seite macht — genau eine
 * Kachel, also in die Wand daneben.
 */
export const DOOR = { lx: -6.25, width: TILE, slide: TILE, gap: 1.25, height: 2.2, thick: 0.16 };

/**
 * **Woraus die Tür des Labors ist, wenn ein Durchlauf beginnt: aus Metall.**
 *
 * Und das ist keine Willkür, sondern die Behauptung der Bucht: „Er läuft
 * dagegen, merkt es dort und geht dann außen herum" gilt nur für eine Tür, die
 * ihm standhält. Eine hölzerne schlägt er ein (`nav/navDoor.ts`) — auch das
 * kann man sehen, und dafür gibt es den gelben Knopf daneben. Zwei Materialien,
 * ein Aufbau, zwei völlig verschiedene Wege: Genau darum steht in dieser Bucht
 * eine Tür und keine Wand.
 */
export const DOOR_MATERIAL: DoorMaterial = 'metal';

/** Die beiden Enden des Portals — Kachelmitten, sonst findet es der Graph nicht. */
export const PORTAL: readonly BaySpot[] = [
  { lx: -6.25, lz: -6.25 },
  { lx: 6.25, lz: -6.25 },
];

/**
 * **Wo die Kiste in den Durchgang fällt** — in die Kachel *vor* der Lücke, auf
 * der Seite, von der der Zombie kommt.
 *
 * Sie lag lange eine Kachel weiter (`lz: 1.25`), also hinter der Wand auf der
 * Seite des Spielers. Auf der Karte war das dasselbe — gesperrt ist gesperrt —,
 * anzusehen war es etwas anderes: Der Knopf hieß „Kiste in den Durchgang", und
 * die Kiste stand daneben. Jetzt steht sie da, wo der Zombie sie sieht, und
 * genau dort merkt er auch, dass sie im Weg ist (`navAgent.observe`).
 */
export const CRATE: BaySpot = { lx: -6.25, lz: -1.25 };

/** Der Klotz mit dem flachen Dach: Mitte und Maße in Buchtmaßen. */
export const BLOCK = { lx: -5, lz: -2.5, w: 10, d: 5 };

/** Wo der Schlitz im engen Gang sitzt — eine Kachelmitte, sonst trifft ihn niemand. */
const NARROW_LX = -6.25;

/**
 * **Der zu enge Gang**: eine Kachel Lücke, in die zwei Pfosten hineinragen, bis
 * nur noch ein Schlitz übrig ist.
 *
 * `gap` ist absichtlich schmaler als die Schulterbreite, mit der das Abtasten
 * rechnet (`navBake.ts`, `BAKE_DEFAULTS.width`) — und schmaler als ein Zombie
 * dick ist (0,58 m, `npcKinds.ts`). Beides muss stimmen, denn beide Hälften
 * dieser Bucht sind eine Behauptung: In der **Welt** passt er nicht hindurch,
 * und auf der **Karte** steht deshalb auch keine Lücke. Wo die zweite Hälfte
 * fehlt, plant er hindurch, rennt dagegen und kommt nie an — das ist der
 * Zombie, der durch eine Wand will.
 */
export const NARROW = { lx: NARROW_LX, gap: 0.45, opening: TILE };

/**
 * **Rampe, Podest und das Podest daneben.**
 *
 * Der Aufbau in einem Satz: Über drei Stufen geht es an der Westwand hinauf auf
 * das nahe Podest; von dessen Ostkante ist das freistehende Podest **einen
 * Gang breit** entfernt, und dazwischen läuft der Boden durch. Wer springen
 * kann, ist drüben; wer nicht, steht unten im Gang.
 *
 * Die Höhe ist dieselbe wie die des Dachs (`ROOF`): Sie muss über dem liegen,
 * was das Abtasten noch als Treppe durchgehen lässt (`climb`, 2,2 m) — sonst
 * baut es von selbst eine Verbindung hinauf, und der Zombie steht oben.
 * Gleichzeitig muss sie **unter** dem Absprung bleiben (`drop`, 2,6 m), damit
 * man wieder herunterkommt.
 */
export const PODIUM = {
  high: ROOF,
  /** Die Rampe an der Westwand: drei Stufen, je eine Kachel tief. */
  ramp: [
    { lx: -11.25, lz: 3.75, y: 0.8 },
    { lx: -11.25, lz: 1.25, y: 1.6 },
    { lx: -11.25, lz: -1.25, y: ROOF },
  ],
  /** Das Podest, auf das die Rampe führt — zwei mal zwei Kacheln. */
  near: { minLx: -12.5, maxLx: -7.5, minLz: -7.5, maxLz: -2.5 },
  /** Und das freistehende: derselbe Zuschnitt, einen Gang weiter östlich. */
  far: { minLx: -5, maxLx: 0, minLz: -7.5, maxLz: -2.5 },
  /** Die beiden Kachelmitten, zwischen denen gesprungen wird. */
  from: { lx: -8.75, lz: -3.75 },
  to: { lx: -3.75, lz: -3.75 },
} as const;

/** Die vier Spalten einer Reihe, von West nach Ost. */
const COLS = [-1.5 * COL, -0.5 * COL, 0.5 * COL, 1.5 * COL] as const;

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'corridor',
    title: 'Langer Gang',
    watch: 'Er kommt um zwei Ecken statt an der Wand zu kleben',
    acts: [],
    x: COLS[0],
    z: -ROW,
    accent: 0x39d0ff,
    stand: { lx: 0, lz: 6.25 },
    cast: [{ kind: 'zombie', lx: -8.75, lz: -6.25 }],
  },
  {
    id: 'pit',
    title: 'Stachelgrube',
    watch: 'Der Zombie fällt hinein und bleibt darin, die Puppe geht außen herum',
    acts: [],
    x: COLS[1],
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
    acts: [{ id: 'crate', label: 'Kiste in den Durchgang', once: true }],
    x: COLS[2],
    z: -ROW,
    accent: 0xffc857,
    stand: { lx: 0, lz: 6.25 },
    cast: [{ kind: 'zombie', lx: -6.25, lz: -6.25 }],
  },
  {
    id: 'narrow',
    title: 'Zu enger Gang',
    watch: 'Er stellt sich in den Schlitz und kommt keinen Schritt weiter',
    acts: [],
    x: COLS[3],
    z: -ROW,
    accent: 0xff9f45,
    stand: { lx: NARROW_LX, lz: 3.75 },
    cast: [{ kind: 'zombie', lx: NARROW_LX, lz: -6.25 }],
  },
  {
    id: 'door',
    title: 'Tür fällt zu',
    watch: 'Metall hält ihn auf, Holz schlägt er ein',
    acts: [
      { id: 'door', label: 'Tür auf/zu' },
      { id: 'wood', label: 'Holz/Metall' },
      { id: 'bar', label: 'Tür verriegeln', once: true },
    ],
    x: COLS[0],
    z: ROW,
    accent: 0xe58aa8,
    stand: { lx: 0, lz: 6.25 },
    cast: [{ kind: 'zombie', lx: -6.25, lz: -6.25 }],
  },
  {
    id: 'portal',
    title: 'Portal, von dem einer weiß',
    watch: 'Einer nimmt die Abkürzung, der andere läuft außen herum',
    acts: [{ id: 'portal', label: 'Portal öffnen', once: true }],
    x: COLS[1],
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
    acts: [],
    x: COLS[2],
    z: ROW,
    accent: 0x5ee0a0,
    stand: { lx: 6.25, lz: 3.75 },
    cast: [{ kind: 'zombie', lx: -6.25, lz: -3.75, y: ROOF }],
  },
  {
    id: 'podium',
    title: 'Podest und Sprung',
    watch: 'Die Puppe nimmt Rampe und Sprung, der Zombie steht unten davor',
    acts: [],
    x: COLS[3],
    z: ROW,
    accent: 0x6fd3ff,
    stand: { ...PODIUM.to, y: PODIUM.high },
    cast: [
      { kind: 'dummy', lx: -11.25, lz: 6.25 },
      { kind: 'zombie', lx: -8.75, lz: 6.25 },
    ],
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
  // Die Grube ist ein Loch im Boden und keine Wand (`PIT`, `labFloor`).
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
  // Eine durchgehende Wand mit **einer** Lücke von einer Kachel. Was daraus
  // einen Schlitz macht, sind zwei Pfosten (`NARROW`) — die stehen nicht hier,
  // denn sie enden absichtlich *nicht* auf einer Kachelgrenze.
  narrow: [
    { lx: -10, lz: 0, w: 5, d: WALL_T },
    { lx: 3.75, lz: 0, w: 17.5, d: WALL_T },
  ],
  // Rampe und Podeste sind Klötze und keine Wände (`PODIUM`).
  podium: [],
};

/** Alle Wände einer Bucht — Hülle und Innenleben. */
export function bayWalls(bay: Scenario): readonly BayWall[] {
  return [...SHELL, ...INSIDE[bay.id]];
}

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

// --- der ganze Bau als Kästen ---------------------------------------------

/**
 * Woraus ein Quader des Labors besteht — die Sorte entscheidet nur über seine
 * Farbe, für die Wegsuche sind alle gleich.
 */
export type LabSolidKind = 'floor' | 'rim' | 'wall' | 'block' | 'pit';

/** Ein Quader in Weltmetern: Mitte und Kantenlängen. */
export interface LabSolid {
  kind: LabSolidKind;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  /**
   * Die Tür, zu der dieser Quader gehört — nur beim Türblatt.
   *
   * Damit weiß, wer die Welt aus diesen Quadern baut, welcher davon
   * verschwindet, wenn die Tür in Stücken auf dem Boden liegt. Ohne diese
   * Zeile stünde das Blatt der eingeschlagenen Tür weiter in seiner Lücke, und
   * der Zombie, der gerade hindurchwollte, klebte davor.
   */
  door?: string;
}

/**
 * **Das ganze Labor als Liste von Quadern** — genau die, die auch in der Welt
 * stehen.
 *
 * Der Grund, warum das hier steht und nicht in `NavLabWorld`, ist derselbe wie
 * beim Grundriss darüber, nur eine Stufe schärfer: Ein Test, der das Labor
 * **abtastet** (`bakeNav`), muss dieselben Kästen abtasten, die man in der
 * Brille sieht. Baute die Welt ihre Wände selbst und der Test seine eigenen,
 * prüfte er eine zweite Welt, die zufällig ähnlich aussieht — und der erste
 * Unterschied zwischen beiden wäre genau der Fehler, den er finden sollte.
 *
 * `NavLabWorld` läuft diese Liste ab und gibt jeder Sorte ihr Material. Was
 * hier **nicht** steht, ist alles, was keinen Weg versperrt: die Stacheln am
 * Grund der Grube, das Türblatt, die Portalringe (`NavLabWorld.navReady`). Das
 * **Loch** der Grube dagegen steht sehr wohl hier — es ist ein Stück Boden,
 * das fehlt, und das ist eine Sache der Geometrie (`labFloor`).
 */
export function labSolids(): LabSolid[] {
  const box = labBounds();
  const width = box.maxX - box.minX + 6;
  const depth = box.maxZ - box.minZ + 6;
  const out: LabSolid[] = [...labFloor(width, depth)];

  // Eine Bande außen herum, damit niemand aus dem Labor spaziert — und zwar
  // **dicht an den Buchten** und nicht am Rand des Bodens. Der Boden steht ein
  // Stück über, damit die Bande auf etwas steht; wäre sie dort, liefe zwischen
  // ihr und den Buchten ein Rundgang um das ganze Labor. Ein Zombie, der ihn
  // findet, geht außen herum statt durch die Bucht, um die es gerade geht.
  for (const [x, z, w, d] of [
    [0, box.minZ, width, 0.5],
    [0, box.maxZ, width, 0.5],
    [box.minX, 0, 0.5, depth],
    [box.maxX, 0, 0.5, depth],
  ] as const) {
    out.push({ kind: 'rim', x, y: 1.5, z, w, h: 3, d });
  }

  for (const bay of SCENARIOS) {
    for (const wall of bayWalls(bay)) {
      const at = bayPoint(bay, wall.lx, wall.lz);
      out.push({
        kind: 'wall',
        x: at.x,
        y: WALL_H / 2,
        z: at.z,
        w: wall.w,
        h: WALL_H,
        d: wall.d,
      });
    }
    out.push(...bayFixtures(bay));
  }
  return out;
}

/** Die Grube in Weltmetern — das Loch im Boden und der Bereich, der wehtut. */
export function pitBox(): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const bay = scenarioOf('pit');
  const a = bayPoint(bay, PIT.minLx, PIT.minLz);
  const b = bayPoint(bay, PIT.maxLx, PIT.maxLz);
  return {
    minX: Math.min(a.x, b.x),
    maxX: Math.max(a.x, b.x),
    minZ: Math.min(a.z, b.z),
    maxZ: Math.max(a.z, b.z),
  };
}

/**
 * Wie dick die Bodenplatte ist — tief genug, dass die Grube Wände hat.
 *
 * Die Grube ist ein Loch **in** dieser Platte, und ihre Seiten sind deren
 * Schnittflächen. Wäre die Platte so dünn wie früher (40 cm), stünde ein
 * Zombie in der Grube unter einem Vordach von 40 cm und spazierte seelenruhig
 * unter dem Labor davon.
 */
const FLOOR_DEEP = PIT_DEPTH + 0.4;

/**
 * **Der Boden des Labors, mit dem Loch darin.**
 *
 * Vier Streifen um die Grube herum statt einer Platte — und der Grund steht
 * eine Zeile weiter oben in `PIT_DEPTH`: Eine Falle, in die niemand fallen
 * kann, ist keine. Darunter, am Grund des Lochs, liegt die Platte mit den
 * Stacheln (`kind: 'pit'`), und die liegt so tief, dass das Abtasten sie
 * keiner Etage mehr zuschlägt.
 *
 * **Das Labor bringt seinen Boden damit selbst mit** und lässt die Fläche bis
 * zum Horizont weg (`NavLabWorld.horizonColor`). Anders geht es nicht: Die ist
 * eine einzige Platte über die ganze Welt, und die zöge sich fünf Zentimeter
 * unter dem Laborboden auch quer durch jedes Loch darin.
 */
function labFloor(width: number, depth: number): LabSolid[] {
  const hole = pitBox();
  const half = { x: width / 2, z: depth / 2 };
  const slab = (minX: number, maxX: number, minZ: number, maxZ: number): LabSolid => ({
    kind: 'floor',
    x: (minX + maxX) / 2,
    y: -FLOOR_DEEP / 2,
    z: (minZ + maxZ) / 2,
    w: maxX - minX,
    h: FLOOR_DEEP,
    d: maxZ - minZ,
  });
  return [
    // Nord und Süd über die ganze Breite, West und Ost nur zwischen den beiden.
    slab(-half.x, half.x, -half.z, hole.minZ),
    slab(-half.x, half.x, hole.maxZ, half.z),
    slab(-half.x, hole.minX, hole.minZ, hole.maxZ),
    slab(hole.maxX, half.x, hole.minZ, hole.maxZ),
    {
      kind: 'pit',
      x: (hole.minX + hole.maxX) / 2,
      y: -PIT_DEPTH - 0.2,
      z: (hole.minZ + hole.maxZ) / 2,
      w: hole.maxX - hole.minX,
      h: 0.4,
      d: hole.maxZ - hole.minZ,
    },
  ];
}

/**
 * **Was der Boden an dieser Stelle abzieht**, in dieser Zeitspanne.
 *
 * Die eine Rechnung hinter „der Zombie stirbt in der Grube", und sie steht
 * hier bei den Daten und nicht in der Welt: Die Brille wendet sie auf ihre
 * NPCs an (`NavLabWorld.simulate`), der Test auf seine (`labSim.ts`) — und nur
 * deshalb heißt „er stirbt darin" in beiden dasselbe.
 *
 * Wehtun tut es **unter der Kante**: Wer über die Grube springen könnte, käme
 * heil hinüber; wer hineinfällt, steht zwischen den Stacheln.
 */
export function labHarm(at: { x: number; y: number; z: number }, dt: number): number {
  const hole = pitBox();
  if (at.y > -0.5) return 0;
  if (at.x < hole.minX || at.x > hole.maxX) return 0;
  if (at.z < hole.minZ || at.z > hole.maxZ) return 0;
  return PIT_DAMAGE * dt;
}

/**
 * **Das Türblatt** — offen zur Seite geschoben, zu in seiner Lücke.
 *
 * Es steht *nicht* in `labSolids()`, und das ist der Unterschied zwischen einer
 * Tür und einer Wand: Was abgetastet wird, gilt für immer, eine Tür aber geht
 * auf und zu. Auf der Karte steht sie deshalb als Tür (`navReady`), und diese
 * Funktion sagt nur, wo ihr Blatt gerade hängt — für die Brille und für jeden
 * Test, der wissen will, ob ein Zombie da wirklich durchkommt.
 */
export function doorLeaf(bay: Scenario, open: boolean): LabSolid {
  const at = bayPoint(bay, DOOR.lx - (open ? DOOR.slide : 0), 0);
  return {
    kind: 'wall',
    x: at.x,
    y: DOOR.height / 2,
    z: at.z,
    w: DOOR.width,
    h: DOOR.height,
    d: DOOR.thick,
    door: DOOR_ID,
  };
}

/** Was eine einzelne Bucht an Klötzen mitbringt. */
function bayFixtures(bay: Scenario): LabSolid[] {
  if (bay.id === 'levels') {
    // Ein Klotz mit flachem Dach, sonst nichts. **Keine Treppe**: Ein NPC ist
    // heute ein dynamischer Zylinder, und ein Zylinder steigt keine Stufe. Was
    // er kann, ist von einer Kante fallen — und genau das ist die Behauptung
    // dieser Bucht (`ROOF`).
    const at = bayPoint(bay, BLOCK.lx, BLOCK.lz);
    return [{ kind: 'block', x: at.x, y: ROOF / 2, z: at.z, w: BLOCK.w, h: ROOF, d: BLOCK.d }];
  }

  if (bay.id === 'narrow') {
    // Die beiden Pfosten, die aus einer Kachel Lücke einen Schlitz machen.
    // Ihre Enden liegen mit Absicht **nicht** auf einer Kachelgrenze: Genau
    // das ist der Fall, den ein einzelner Messpunkt auf der Grenze übersieht.
    const half = (NARROW.opening - NARROW.gap) / 2;
    return [-1, 1].map((side) => {
      const at = bayPoint(bay, NARROW.lx + (side * (NARROW.gap + half)) / 2, 0);
      return {
        kind: 'wall' as const,
        x: at.x,
        y: WALL_H / 2,
        z: at.z,
        w: half,
        h: WALL_H,
        d: WALL_T,
      };
    });
  }

  if (bay.id === 'podium') {
    const out: LabSolid[] = [];
    for (const step of PODIUM.ramp) {
      const at = bayPoint(bay, step.lx, step.lz);
      out.push({ kind: 'block', x: at.x, y: step.y / 2, z: at.z, w: TILE, h: step.y, d: TILE });
    }
    for (const deck of [PODIUM.near, PODIUM.far]) {
      const a = bayPoint(bay, deck.minLx, deck.minLz);
      const b = bayPoint(bay, deck.maxLx, deck.maxLz);
      out.push({
        kind: 'block',
        x: (a.x + b.x) / 2,
        y: PODIUM.high / 2,
        z: (a.z + b.z) / 2,
        w: Math.abs(b.x - a.x),
        h: PODIUM.high,
        d: Math.abs(b.z - a.z),
      });
    }
    return out;
  }

  return [];
}

// --- was in keiner Geometrie steht ----------------------------------------

/** Die Tür des Labors, unter dem Namen, unter dem eine Meinung sie kennt. */
export const DOOR_ID = 'navlab-tuer';
/** Das Portal der Portal-Bucht. */
export const PORTAL_ID = 'navlab-portal';
/** Der Sprung zwischen den beiden Podesten. */
export const JUMP_ID = 'navlab-sprung';

/**
 * **Was das Abtasten nicht finden kann**, in die frisch abgetastete Karte
 * eingetragen.
 *
 * Drei Sachen stehen in keinem Quader: Über der Grube liegt auf der Karte ein
 * Weg mit Stacheln, wo in der Welt ein Loch ist — das ist eine Falle und die
 * einzige Stelle, an der die Karte absichtlich etwas anderes sagt als die
 * Geometrie. Eine Tür ist in der Geometrie entweder eine Lücke oder eine Wand,
 * nie beides nacheinander. Und ein Sprung über einen Gang ist ein Loch, kein
 * Weg.
 *
 * Sie stehen hier und nicht in `NavLabWorld`, aus demselben Grund wie
 * `labSolids()`: Ein Test, der das Labor abtastet, muss dieselbe Karte
 * bekommen wie die Brille. Eine Grube, die nur in der Welt weh tut, ließe im
 * Test Zombie und Puppe denselben Weg laufen — und genau das ist die eine
 * Behauptung, die diese Bucht aufstellt.
 */
export function applyLabMap(graph: NavGraph): void {
  for (const bay of SCENARIOS) {
    if (bay.id === 'pit') {
      // **Die Falle**: In der Welt ist dort ein Loch, auf der Karte ein Weg mit
      // Stacheln (`navBuild.coverRect`). Das Abtasten findet am Grund keinen
      // Boden, den es einer Etage zuschlagen könnte — also legt die Bucht
      // selbst Kacheln über das Loch. Wer die Stacheln liest, geht außen herum
      // (`HUMAN_PROFILE`); wer sie nicht kennt, plant hindurch, fällt hinein
      // und kommt dort nicht mehr heraus.
      coverRect(graph, pitBox(), { hazard: HAZARD_SPIKES });
    }
    if (bay.id === 'door') {
      // Die beiden Kachelmitten links und rechts der Türlinie: Zwischen ihnen
      // sitzt die Wand, und in diese Wand kommt die Tür.
      const north = bayPoint(bay, DOOR.lx, -DOOR.gap);
      const south = bayPoint(bay, DOOR.lx, DOOR.gap);
      doorBetween(graph, { ...north, y: 0 }, { ...south, y: 0 }, DOOR_ID, true, DOOR_MATERIAL);
    }
    if (bay.id === 'podium') {
      // **Der Sprung von einem Podest auf das andere.** Ihn kann kein Abtasten
      // finden: Zwischen den beiden Decken liegt ein Gang, und ein Gang ist in
      // der Geometrie ein Loch und keine Verbindung. Wer springen kann, nimmt
      // ihn (`HUMAN_PROFILE`); der Zombie hat dafür `Infinity` stehen und
      // bleibt unten (`navProfile.ts`).
      const a = baySpot(bay, PODIUM.from);
      const b = baySpot(bay, PODIUM.to);
      const from = graph.at(a.x, a.z, PODIUM.high);
      const to = graph.at(b.x, b.z, PODIUM.high);
      if (from !== NO_TILE && to !== NO_TILE) {
        connect(graph, JUMP_ID, from, to, 'jump', { both: true });
      }
    }
  }
}

/** Das Portal der Portal-Bucht öffnen — dieselben zwei Enden wie in der Welt. */
export function openLabPortal(graph: NavGraph): boolean {
  const bay = scenarioOf('portal');
  const a = baySpot(bay, PORTAL[0]!);
  const b = baySpot(bay, PORTAL[1]!);
  const from = graph.at(a.x, a.z, 0);
  const to = graph.at(b.x, b.z, 0);
  if (from === NO_TILE || to === NO_TILE) return false;
  addPortal(graph, PORTAL_ID, from, to);
  return true;
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
