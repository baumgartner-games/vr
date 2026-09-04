/**
 * Die Physik der Welt selbst — Schwerkraft, Absprung, Reibung, Sprungkraft der
 * Objekte.
 *
 * Bis hierher war das alles eine Konstante irgendwo im Code: −9,81 in
 * `PhysicsWorld.create()`, dieselbe Zahl nochmal in `PhysicsLocomotion`, 0,7
 * Reibung an jedem Prop. Für einen Sandkasten ist das genau die falsche Stelle,
 * denn „was passiert bei Mondschwerkraft" ist keine Frage an den Quelltext,
 * sondern eine an die Welt: eine Zeile im Menü, sofort wirksam, und beim
 * nächsten Aufsetzen der Brille noch da.
 *
 * **Welt-Standard** ist dabei eigene Raste und nicht bloß ein Zahlenwert: der
 * Mond ist mit 1,62 m/s² gebaut, das Labor mit 9,81, und wer nichts einstellt,
 * will genau das — nicht die Erdschwere auf dem Mond, nur weil sie einmal
 * getippt wurde. Erst ein bewusst gesetzter Wert überstimmt die Welt.
 *
 * Reine Daten und Beschriftungen, kein three.js und kein Rapier. Wer die Werte
 * anwendet, ist `PortalWorld`; wie sie im Menü stehen, sagt `worldPhysicsLabel`.
 */

const KEY = 'bgvr.worldPhysics';

export interface WorldPhysics {
  /** Fallbeschleunigung in m/s², als positive Zahl (nach unten). */
  gravity: number;
  /** Solange gesetzt, gilt die Schwerkraft, die die Welt selbst mitbringt. */
  autoGravity: boolean;
  /** Absprunggeschwindigkeit in m/s. */
  jump: number;
  /** Reibung der Objekte, 0 = Eis. */
  friction: number;
  /** Rückprall der Objekte, 0 = Sandsack, 1 = Flummi. */
  bounce: number;
}

/** Die Erde, und ein Absprung, der eine Kistenhöhe schafft. */
export const DEFAULT_WORLD_PHYSICS: WorldPhysics = {
  gravity: 9.81,
  autoGravity: true,
  jump: 4.4,
  friction: 0.7,
  bounce: 0.05,
};

/** Was eine Welt mitbringt, wenn sie nichts anderes sagt. */
export const EARTH_GRAVITY = 9.81;

export interface PhysicsField {
  key: 'gravity' | 'jump' | 'friction' | 'bounce';
  label: string;
  unit: string;
  min: number;
  max: number;
  decimals: number;
  sub: string;
  /** Die Rasten, durch die ein Druck auf die Zeile weiterschaltet. */
  steps: readonly number[];
}

export const PHYSICS_FIELDS: readonly PhysicsField[] = [
  {
    key: 'gravity',
    label: 'Schwerkraft',
    unit: 'm/s²',
    min: 0,
    max: 40,
    decimals: 2,
    sub: 'Schwerelos · Mond · Mars · Erde · schwer',
    steps: [0, 1.62, 3.71, 9.81, 16, 25],
  },
  {
    key: 'jump',
    label: 'Sprungkraft',
    unit: 'm/s',
    min: 0,
    max: 30,
    decimals: 1,
    sub: 'Wie hart der Absprung ist',
    steps: [2.5, 4.4, 6, 8, 12],
  },
  {
    key: 'friction',
    label: 'Reibung',
    unit: '',
    min: 0,
    max: 2,
    decimals: 2,
    sub: '0 ist Eis, 1 ist Gummi auf Beton',
    steps: [0, 0.15, 0.4, 0.7, 1.2],
  },
  {
    key: 'bounce',
    label: 'Rückprall',
    unit: '',
    min: 0,
    max: 1,
    decimals: 2,
    sub: '0 ist ein Sandsack, 0,9 ist ein Flummi',
    steps: [0, 0.05, 0.3, 0.6, 0.9],
  },
];

/** Eine Zahl in ihrem Bereich, auf ihre Stellen gerundet. */
export function clampPhysicsField(field: PhysicsField, value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return DEFAULT_WORLD_PHYSICS[field.key];
  const factor = 10 ** field.decimals;
  return Math.round(Math.min(field.max, Math.max(field.min, number)) * factor) / factor;
}

/** Ein Einstellungsobjekt, bei dem jeder Wert erlaubt ist. */
export function clampWorldPhysics(settings: Partial<WorldPhysics> | undefined): WorldPhysics {
  const next: WorldPhysics = { ...DEFAULT_WORLD_PHYSICS, ...settings };
  for (const field of PHYSICS_FIELDS) next[field.key] = clampPhysicsField(field, next[field.key]);
  next.autoGravity = next.autoGravity !== false;
  return next;
}

/**
 * Die nächste Raste über dem eingestellten Wert, oben wieder von vorn. Ein
 * Wert, der auf keiner Raste liegt (getippt oder aus einer Welt geerbt),
 * bricht das Weiterschalten nicht.
 */
export function nextPhysicsStep(field: PhysicsField, value: number): number {
  return field.steps.find((step) => step > value + 1e-9) ?? field.steps[0]!;
}

/** Wie die Zahl auf der Menüzeile steht. */
export function physicsFieldLabel(field: PhysicsField, value: number): string {
  const number = value.toFixed(field.decimals);
  return field.unit ? `${number} ${field.unit}` : number;
}

/** Der Name für eine Schwerkraft, die man kennt. */
export function gravityName(value: number): string | null {
  const known: Array<[number, string]> = [
    [0, 'schwerelos'],
    [1.62, 'Mond'],
    [3.71, 'Mars'],
    [9.81, 'Erde'],
  ];
  return known.find(([step]) => Math.abs(step - value) < 0.05)?.[1] ?? null;
}

/**
 * Was die Simulation nach unten zieht: die Zahl der Welt, solange niemand eine
 * eigene gesetzt hat.
 */
export function effectiveGravity(settings: WorldPhysics, worldGravity: number): number {
  return settings.autoGravity ? clampPhysicsField(PHYSICS_FIELDS[0]!, worldGravity) : settings.gravity;
}

/** Wie die Schwerkraft-Zeile im Menü aussieht. */
export function gravityLabel(settings: WorldPhysics, worldGravity: number): string {
  const value = effectiveGravity(settings, worldGravity);
  const name = gravityName(value);
  const number = `${value.toFixed(2)} m/s²`;
  const prefix = settings.autoGravity ? 'Welt-Standard · ' : '';
  return name ? `${prefix}${name} · ${number}` : `${prefix}${number}`;
}

// --- der Speicher ----------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

/** Läuft nach jeder Änderung, damit ein offenes Menü sich neu zeichnet. */
export function onWorldPhysicsChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function worldPhysics(): WorldPhysics {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return clampWorldPhysics(raw ? (JSON.parse(raw) as Partial<WorldPhysics>) : {});
  } catch {
    return { ...DEFAULT_WORLD_PHYSICS };
  }
}

/** Speichert die Änderung und gibt zurück, was davon angekommen ist. */
export function saveWorldPhysics(settings: Partial<WorldPhysics>): WorldPhysics {
  const next = clampWorldPhysics({ ...worldPhysics(), ...settings });
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode; nothing we can do about it */
  }
  for (const listener of listeners) listener();
  return next;
}

export function clearWorldPhysics(): WorldPhysics {
  return saveWorldPhysics({ ...DEFAULT_WORLD_PHYSICS });
}
