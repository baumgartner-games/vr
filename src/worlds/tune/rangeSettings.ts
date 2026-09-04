/**
 * Wo der Justierstand im Schießgang steht.
 *
 * Derselbe Gedanke wie beim Tisch nebenan (`tableSettings.ts`): eine Höhe, die
 * zum eigenen Körper passt, ist keine, die man ausrechnet, sondern eine, die
 * man einmal einstellt und dann behält. Ein Stand, der jedem gleich hoch
 * kommt, kommt niemandem richtig — im Sessel steht er zu hoch, im Stehen zu
 * tief, und wer ein Werkzeug einmessen will, hält den Arm dabei die ganze Zeit
 * in einer Haltung, die er sich nicht ausgesucht hat.
 *
 * Verstellt wird er nicht über Zahlenfelder, sondern an **zwei Griffen**, die
 * bewusst weit seitlich in der Luft hängen (`ToolRange.ts`) — so weit, dass
 * die Hand, die nach dem Werkzeug greift, sie nicht streift. Hier stehen nur
 * die Zahlen dahinter und ihre Grenzen.
 *
 * Zentimeter, gemessen im Raum des Gangs: `x` quer (nach links negativ), `z`
 * längs zur Scheibe hin, `height` über dem Boden. Keine Drehung — die ergibt
 * sich, weil die Aufnahme immer die Scheibe ansieht, wo der Stand auch steht.
 */

export interface RangeSettings {
  /** Höhe der Aufnahme über dem Boden, in Zentimetern. */
  height: number;
  /** Quer im Gang, in Zentimetern von der Mitte. */
  x: number;
  /** Längs im Gang, in Zentimetern hinter der Tür. */
  z: number;
}

export const DEFAULT_RANGE: RangeSettings = {
  height: 106,
  // Auf der einen Seite des Gangs, mit Platz für den Kreis auf dem Boden und
  // für den Griffstand gegenüber — der soll außerhalb des Kreises stehen,
  // sonst wird die Welt durchsichtig, während man dort eine Boxhand ansieht.
  x: -65,
  z: 155,
};

/** Eine Zahl des Standes samt dem Bereich, der Sinn ergibt. */
export interface RangeField {
  key: keyof RangeSettings;
  label: string;
  min: number;
  max: number;
}

export const RANGE_FIELDS: readonly RangeField[] = [
  // Vom Sessel bis über Schulterhöhe — darunter greift niemand, darüber sieht
  // niemand mehr an der eigenen Hand vorbei.
  { key: 'height', label: 'Höhe', min: 40, max: 170 },
  // Innerhalb des Gangs bleiben, und zwar mit dem Ausleger: ein Stand in der
  // Wand ist keiner, und ein Griff darin auch nicht.
  { key: 'x', label: 'Quer', min: -160, max: 160 },
  // Hinter der Tür anfangen, vor der Scheibe aufhören.
  { key: 'z', label: 'Längs', min: 60, max: 600 },
];

/** Ein Einstellungsobjekt, bei dem jeder Wert erlaubt ist. */
export function clampRange(settings: Partial<RangeSettings> | undefined): RangeSettings {
  const next = { ...DEFAULT_RANGE, ...settings };
  for (const field of RANGE_FIELDS) {
    const value = next[field.key];
    next[field.key] = Number.isFinite(value)
      ? Math.round(Math.min(field.max, Math.max(field.min, value)) * 10) / 10
      : DEFAULT_RANGE[field.key];
  }
  return next;
}

// --- der Speicher ----------------------------------------------------------

const KEY = 'bgvr.tuneRange';

type Listener = () => void;

const listeners = new Set<Listener>();

/** Wird nach jeder Änderung gerufen, damit der Gang sich nachzieht. */
export function onRangeChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function rangeSettings(): RangeSettings {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return clampRange(raw ? (JSON.parse(raw) as Partial<RangeSettings>) : {});
  } catch {
    // Privater Modus, kein Speicher, kaputtes JSON — nichts davon ist einen
    // Absturz wert.
    return clampRange({});
  }
}

/** Ändert, was übergeben wird, und lässt den Rest stehen. */
export function saveRangeSettings(settings: Partial<RangeSettings>): RangeSettings {
  const next = clampRange({ ...rangeSettings(), ...settings });
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* siehe oben */
  }
  for (const listener of listeners) listener();
  return next;
}

export function clearRangeSettings(): RangeSettings {
  return saveRangeSettings({ ...DEFAULT_RANGE });
}

/** Eine Zeile zum Vorlesen — der Stand sagt, wo er steht. */
export function formatRange(settings: RangeSettings): string {
  const round = (value: number): number => Math.round(value * 10) / 10;
  return `Höhe ${round(settings.height)} cm · quer ${round(settings.x)} · längs ${round(settings.z)}`;
}
