/**
 * **Die Stellschrauben der beiden Bots** — und der Grund, warum sie hier
 * stehen und nicht verstreut im Weltcode.
 *
 * Eine Bot-Runde ist ein Zweikampf: Der Techniker will drei Systeme
 * reparieren und heimkommen, das Monster will ihn dreimal erwischen. Wie oft
 * welcher gewinnt, hängt an zwei Dutzend Zahlen — Tempo, Gehör, Geduld,
 * Mut —, und diese Zahlen wurden bis eben an drei Stellen gleichzeitig
 * geraten. Ab hier gibt es sie **einmal**: als Datensatz mit Grenzen, mit
 * einem Namen für die Schalttafel und mit einer Voreinstellung, die aus dem
 * Training kommt (`botTraining.ts`) und nicht aus dem Bauchgefühl.
 *
 * **Faktoren, wo eine Sorte schon etwas mitbringt.** Gehör, Sicht und
 * Gedächtnis stehen als Vielfache des Kreaturprofils (`threat.ts`) und nicht
 * als Meter: Sonst wären „Der Verlorene" und „Wächter" nach der ersten
 * Justage dasselbe Vieh mit anderer Farbe. Sekunden, Meter je Sekunde und
 * Wahrscheinlichkeiten stehen dagegen absolut — die kann man ablesen und
 * nachrechnen.
 *
 * **Was hier nicht steht:** wie sich das Monster entscheidet. Das ist
 * `monsterRoutine.ts` — hier stehen nur die Zahlen, die es dabei liest.
 */

export interface MonsterTuning {
  /** Vielfaches des Grundtempos der Sorte beim Patrouillieren. */
  speed: number;
  /** Vielfaches davon bei einer bestätigten Verfolgung. */
  hunt: number;
  /** Vielfaches davon beim leisen Absuchen eines Raums. */
  stalk: number;
  /** Vielfaches der Hörweite des Profils. */
  hearing: number;
  /** Vielfaches der Sichtweite des Profils. */
  vision: number;
  /** Vielfaches der Erinnerungsdauer des Profils. */
  memory: number;
  /** Wie lange es einen verdächtigen Raum absucht, in Sekunden. */
  search: number;
  /** Wie oft es dabei einen Schutzschrank aufmacht (0…1). */
  locker: number;
  /** Wie oft es den richtigen Nachbarraum errät (0…1). */
  guess: number;
  /** Wie oft es den leeren Raum stehen lässt und weitergeht (0…1). */
  wander: number;
  /** Wie oft es sich stattdessen hinstellt und wartet (0…1). */
  stakeout: number;
  /** Nach wie vielen erfolglosen Patrouillenzielen es die Karte wechselt. */
  reposition: number;
  /** Wie lange es nach einem Kabinenangriff stehen bleibt, in Sekunden. */
  savour: number;
}

export interface TechnicianTuning {
  /** Arbeitstempo in Metern je Sekunde. */
  walk: number;
  /** Fluchttempo in Metern je Sekunde. */
  sprint: number;
  /** Wie lange er das Fluchttempo durchhält, in Sekunden. */
  stamina: number;
  /** Ab welchem Abstand zum Monster er die Arbeit abbricht, in Metern. */
  caution: number;
  /** Wie sehr er den Schutzschrank dem freien Feld vorzieht (0…1). */
  hide: number;
  /** Vielfaches der Zeit, die er an Schrank, Konsole und Rätsel braucht. */
  work: number;
  /** Wie lange Ruhe herrschen muss, bis er weiterarbeitet, in Sekunden. */
  nerve: number;
}

export interface BotTuning {
  monster: MonsterTuning;
  technician: TechnicianTuning;
}

export interface TuningField<T> {
  id: keyof T & string;
  label: string;
  /** Was hinter der Zahl steht: „×", „s", „m/s", „m", „%". */
  unit: string;
  min: number;
  max: number;
  step: number;
}

/**
 * **Die Grenzen sind Teil des Entwurfs und nicht bloß ein Sicherheitsnetz.**
 *
 * Die Verhaltensfelder — Riecher, Weitergehen, Auflauern, Schrankkontrolle —
 * dürfen nicht auf null. Ein Training, das nur die Quote im Blick hat, dreht
 * sie sonst genau dorthin: Ein Monster, das nie rät und nie auflauert, ist
 * leichter, und leichter war die Vorgabe. Nur ist es dann auch wieder das
 * dumme Vieh, das im Kreis läuft. Die Balance kommt deshalb aus Tempo, Gehör,
 * Sicht und Gedächtnis; das Verhalten bleibt in einem Fenster, in dem jede
 * Einstellung noch etwas ist, das man beim Zuschauen erkennt.
 *
 * Der Techniker wiederum wird nie schneller als ein echter Spieler
 * (`mission.PLAYER_WALK_SPEED`, `PLAYER_SPRINT_SPEED`): Wer die Bot-Runde
 * anschaut, soll sehen können, was ihm selbst möglich wäre.
 */
export const MONSTER_FIELDS: ReadonlyArray<TuningField<MonsterTuning>> = [
  { id: 'speed', label: 'Grundtempo', unit: '×', min: 0.6, max: 1.5, step: 0.05 },
  { id: 'hunt', label: 'Verfolgungstempo', unit: '×', min: 1, max: 1.7, step: 0.05 },
  { id: 'stalk', label: 'Schleichtempo', unit: '×', min: 0.25, max: 1, step: 0.05 },
  { id: 'hearing', label: 'Gehör', unit: '×', min: 0.4, max: 2, step: 0.05 },
  { id: 'vision', label: 'Sicht', unit: '×', min: 0.4, max: 2, step: 0.05 },
  { id: 'memory', label: 'Gedächtnis', unit: '×', min: 0.4, max: 2, step: 0.05 },
  { id: 'search', label: 'Absuchdauer', unit: 's', min: 4, max: 16, step: 0.5 },
  { id: 'locker', label: 'Schrankkontrolle', unit: '%', min: 0.15, max: 0.85, step: 0.05 },
  { id: 'guess', label: 'Riecher für den Nachbarraum', unit: '%', min: 0.25, max: 0.9, step: 0.05 },
  { id: 'wander', label: 'Weitergehen statt absuchen', unit: '%', min: 0.15, max: 0.7, step: 0.05 },
  { id: 'stakeout', label: 'Auflauern', unit: '%', min: 0.05, max: 0.6, step: 0.05 },
  { id: 'reposition', label: 'Ziele bis Seitenwechsel', unit: '', min: 1, max: 8, step: 1 },
  { id: 'savour', label: 'Vorsprung nach dem Angriff', unit: 's', min: 1, max: 6, step: 0.25 },
];

export const TECHNICIAN_FIELDS: ReadonlyArray<TuningField<TechnicianTuning>> = [
  { id: 'walk', label: 'Arbeitstempo', unit: 'm/s', min: 1.2, max: 2.6, step: 0.05 },
  { id: 'sprint', label: 'Fluchttempo', unit: 'm/s', min: 2.6, max: 4.94, step: 0.05 },
  { id: 'stamina', label: 'Puste', unit: 's', min: 2, max: 12, step: 0.25 },
  { id: 'caution', label: 'Vorsicht', unit: 'm', min: 4, max: 18, step: 0.5 },
  { id: 'hide', label: 'Hang zum Schutzschrank', unit: '%', min: 0.3, max: 1, step: 0.05 },
  { id: 'work', label: 'Handgriffe', unit: '×', min: 0.5, max: 2, step: 0.05 },
  { id: 'nerve', label: 'Wartezeit bis Weiterarbeit', unit: 's', min: 2, max: 14, step: 0.5 },
];

/**
 * **Die ausgelieferten Gewichte.**
 *
 * Sie sind nicht geraten, sondern das Ergebnis von `trainBots()` gegen das
 * Ziel „der Techniker gewinnt 60–70 % der Runden" (`botTraining.test.ts`
 * rechnet es bei jedem Lauf nach). Wer eine Zahl hier von Hand ändert, ändert
 * damit die Schwierigkeit der ganzen Bot-Runde — und der Test sagt es ihm.
 */
export const DEFAULT_TUNING: BotTuning = {
  monster: {
    speed: 0.9,
    hunt: 1.25,
    stalk: 0.75,
    hearing: 1.2,
    vision: 0.9,
    memory: 0.75,
    search: 8.5,
    locker: 0.25,
    guess: 0.6,
    wander: 0.2,
    stakeout: 0.15,
    reposition: 3,
    savour: 2.5,
  },
  technician: {
    walk: 2.6,
    sprint: 4.75,
    stamina: 5.75,
    caution: 12,
    hide: 0.35,
    work: 1.3,
    nerve: 7.5,
  },
};

const STORE_KEY = 'haunting.botTuning.v1';

function clampField<T>(fields: ReadonlyArray<TuningField<T>>, raw: unknown, base: T): T {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out = { ...base } as Record<string, number>;
  for (const field of fields) {
    const value = source[field.id];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    // Auf die Raste runden: Ein Schieberegler, der 0.5000000000000001 abliefert,
    // schreibt sonst eine Zahl in den Speicher, die niemand wiedererkennt.
    const stepped = Math.round(value / field.step) * field.step;
    out[field.id] = Math.min(field.max, Math.max(field.min, Number(stepped.toFixed(4))));
  }
  return out as T;
}

/** Jede Zahl in ihre Grenzen; alles Unbekannte auf die Voreinstellung. */
export function clampTuning(value: unknown): BotTuning {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    monster: clampField(MONSTER_FIELDS, raw.monster, DEFAULT_TUNING.monster),
    technician: clampField(TECHNICIAN_FIELDS, raw.technician, DEFAULT_TUNING.technician),
  };
}

/** Eine Kopie, die niemand versehentlich mit dem Original teilt. */
export function copyTuning(tuning: BotTuning): BotTuning {
  return { monster: { ...tuning.monster }, technician: { ...tuning.technician } };
}

/** Der Wert eines Feldes als Text für die Schalttafel. */
export function fieldText<T>(field: TuningField<T>, value: number): string {
  if (field.unit === '%') return `${Math.round(value * 100)} %`;
  if (field.unit === '') return String(Math.round(value));
  return `${value.toFixed(2)} ${field.unit}`;
}

/**
 * Aus dem Browser-Speicher lesen. Ein kaputter Eintrag ist keine Ausnahme,
 * sondern der Normalfall nach einer Änderung an den Feldern: Es gilt dann
 * die Voreinstellung, und zwar ohne Absturz.
 */
export function loadTuning(store: Pick<Storage, 'getItem'> | null = safeStore()): BotTuning {
  try {
    const raw = store?.getItem(STORE_KEY);
    return clampTuning(raw ? JSON.parse(raw) : null);
  } catch {
    return clampTuning(null);
  }
}

export function saveTuning(
  tuning: BotTuning,
  store: Pick<Storage, 'setItem'> | null = safeStore(),
): void {
  try {
    store?.setItem(STORE_KEY, JSON.stringify(clampTuning(tuning)));
  } catch {
    // Ein privates Fenster ohne Speicher darf die Runde nicht anhalten.
  }
}

function safeStore(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
