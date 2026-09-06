/**
 * **Der Grundriss des Navigationslabors** — sechs Buchten, und was in jeder zu
 * sehen sein soll.
 *
 * Reine Daten und ein bisschen Rechnung: Wo eine Bucht liegt, wie man in ihr
 * einen Punkt angibt, und wie lange ein Szenario läuft. Kein three.js, damit
 * der Grundriss geprüft werden kann, bevor er gebaut ist — eine Bucht, die in
 * ihre Nachbarin ragt, sieht man in der Brille erst, wenn ein Zombie durch die
 * Wand kommt.
 *
 * **Alle Buchten sind gleich gebaut und öffnen zum Mittelgang.** Die nördliche
 * Reihe öffnet nach Süden, die südliche nach Norden — deshalb rechnet
 * `bayPoint` die Tiefe je nach Reihe **gespiegelt**. So steht die Geometrie
 * einmal im Code und nicht zweimal, und „lz = 8" heißt in jeder Bucht
 * „vorne am Eingang".
 */

/** Breite einer Bucht in Metern (X). */
export const BAY_W = 22;
/** Tiefe einer Bucht in Metern (Z). */
export const BAY_D = 16;
/** Der Gang zwischen den beiden Reihen. */
export const AISLE = 4;
/** Wie hoch die Trennwände sind: hoch genug für einen NPC, niedrig zum Drübersehen. */
export const WALL_H = 2.4;
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
}

const ROW = BAY_D / 2 + AISLE / 2;
const COL = BAY_W + 2;

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'corridor',
    title: 'Langer Gang',
    watch: 'Er kommt um zwei Ecken statt an der Wand zu kleben',
    act: '',
    x: -COL,
    z: -ROW,
    accent: 0x39d0ff,
  },
  {
    id: 'pit',
    title: 'Stachelgrube',
    watch: 'Der Zombie läuft hinein, die Puppe geht außen herum',
    act: '',
    x: 0,
    z: -ROW,
    accent: 0xff6b6b,
  },
  {
    id: 'crate',
    title: 'Kiste im Weg',
    watch: 'Er plant um, sobald der Durchgang zu ist',
    act: 'Kiste in den Durchgang',
    x: COL,
    z: -ROW,
    accent: 0xffc857,
  },
  {
    id: 'door',
    title: 'Tür fällt zu',
    watch: 'Er läuft dagegen, merkt es dort und geht dann außen herum',
    act: 'Tür verriegeln',
    x: -COL,
    z: ROW,
    accent: 0xe58aa8,
  },
  {
    id: 'portal',
    title: 'Portal, von dem einer weiß',
    watch: 'Einer nimmt die Abkürzung, der andere läuft außen herum',
    act: 'Portal öffnen',
    x: 0,
    z: ROW,
    accent: 0x9d7bff,
  },
  {
    id: 'levels',
    title: 'Vom Dach herunter',
    watch: 'Er steht oben, sucht sich die Kante und springt',
    act: '',
    x: COL,
    z: ROW,
    accent: 0x5ee0a0,
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
 * `lx` geht von −11 (links) bis 11 (rechts), `lz` von −8 (hinten) bis 8 (vorne
 * am Eingang) — in **jeder** Bucht, egal in welcher Reihe sie steht.
 */
export function bayPoint(bay: Scenario, lx: number, lz: number): { x: number; z: number } {
  const flip = bayFacesSouth(bay) ? 1 : -1;
  return { x: bay.x + lx, z: bay.z + lz * flip };
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
