import type { Handedness } from '../../core/XRInput';

/**
 * Der **zweite** Stand im Schießgang, und was auf ihm liegt.
 *
 * Er steht neben dem ersten und beantwortet die andere Hälfte der Frage. Der
 * erste misst, *wie ich das Werkzeug halte* — die echte Hand greift zu, das
 * Werkzeug merkt sich, wo es dabei lag. Der zweite misst, *wie die virtuelle
 * Hand es umfasst*: dort hängt eine unbewegliche Kopie des Werkzeugs, und die
 * Boxhand daran lässt sich anfassen und zurechtrücken.
 *
 * Warum zwei: eine Hand an einer Pistole zeigt mit dem Zeigefinger in dieselbe
 * Richtung wie der Lauf, und das sieht richtig aus. Dieselbe Haltung an einer
 * Taschenlampe zeigt schräg nach oben, weil deren Lichtkegel dort hinausgeht,
 * wo bei der Pistole der Lauf sitzt. Beide Male stimmt die Zielrichtung, und
 * beide Male sieht nur eine der beiden Hände nach Hand aus.
 *
 * Gespeichert wird hier nur, **wo der Stand steht** und **was daraufliegt** —
 * die Haltung selbst gehört der Hand und liegt in `core/handPoseStore.ts`,
 * genau wie jede andere. Zentimeter im Raum des Gangs, dieselben Achsen wie
 * beim ersten Stand (`rangeSettings.ts`).
 */

export interface GripSettings {
  /** Höhe der Kopie über dem Boden, in Zentimetern. */
  height: number;
  /** Quer im Gang, in Zentimetern von der Mitte. */
  x: number;
  /** Längs im Gang, in Zentimetern hinter der Tür. */
  z: number;
  /** Welche Hand umfasst — die Boxhand ist deren Spiegelbild oder nicht. */
  side: Handedness;
  /** Die Id des Werkzeugs, dessen Kopie dort hängt. */
  tool: string;
}

export const DEFAULT_GRIP: GripSettings = {
  height: 106,
  /*
   * Auf der anderen Seite des Gangs als der Halter. Mit genug Luft dazwischen,
   * dass die Hand am einen nicht die Griffe des anderen streift, und weit
   * genug aus dem Kreis am Halter heraus, dass man hier eine Boxhand ansieht
   * statt durch eine durchsichtige Welt zu schauen.
   */
  x: 85,
  z: 155,
  side: 'right',
  tool: 'pistol',
};

/** Eine Zahl des Standes samt dem Bereich, der Sinn ergibt. */
export interface GripField {
  key: 'height' | 'x' | 'z';
  label: string;
  min: number;
  max: number;
}

export const GRIP_FIELDS: readonly GripField[] = [
  { key: 'height', label: 'Höhe', min: 40, max: 170 },
  // Innerhalb des Gangs bleiben, Ausleger eingerechnet.
  { key: 'x', label: 'Quer', min: -160, max: 160 },
  { key: 'z', label: 'Längs', min: 60, max: 600 },
];

/** Ein Einstellungsobjekt, bei dem jeder Wert erlaubt ist. */
export function clampGrip(settings: Partial<GripSettings> | undefined): GripSettings {
  const next = { ...DEFAULT_GRIP, ...settings };
  for (const field of GRIP_FIELDS) {
    const value = next[field.key];
    next[field.key] = Number.isFinite(value)
      ? Math.round(Math.min(field.max, Math.max(field.min, value)) * 10) / 10
      : DEFAULT_GRIP[field.key];
  }
  if (next.side !== 'left' && next.side !== 'right') next.side = DEFAULT_GRIP.side;
  // Eine leere oder abhandengekommene Werkzeug-Id ist kein Grund für einen
  // leeren Stand — dann liegt eben wieder die Pistole da.
  if (typeof next.tool !== 'string' || !next.tool) next.tool = DEFAULT_GRIP.tool;
  return next;
}

// --- der Speicher ----------------------------------------------------------

const KEY = 'bgvr.tuneGrip';

type Listener = () => void;

const listeners = new Set<Listener>();

/** Wird nach jeder Änderung gerufen, damit der Gang sich nachzieht. */
export function onGripChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function gripSettings(): GripSettings {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return clampGrip(raw ? (JSON.parse(raw) as Partial<GripSettings>) : {});
  } catch {
    // Privater Modus, kein Speicher, kaputtes JSON — nichts davon ist einen
    // Absturz wert.
    return clampGrip({});
  }
}

/** Ändert, was übergeben wird, und lässt den Rest stehen. */
export function saveGripSettings(settings: Partial<GripSettings>): GripSettings {
  const next = clampGrip({ ...gripSettings(), ...settings });
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* siehe oben */
  }
  for (const listener of listeners) listener();
  return next;
}

/** Zurück auf den Auslieferungszustand — der Ort, nicht die Handhaltung. */
export function clearGripSettings(): GripSettings {
  return saveGripSettings({ height: DEFAULT_GRIP.height, x: DEFAULT_GRIP.x, z: DEFAULT_GRIP.z });
}

/** Eine Zeile zum Vorlesen — der Stand sagt, wo er steht. */
export function formatGrip(settings: GripSettings): string {
  const round = (value: number): number => Math.round(value * 10) / 10;
  return `Höhe ${round(settings.height)} cm · quer ${round(settings.x)} · längs ${round(settings.z)}`;
}
