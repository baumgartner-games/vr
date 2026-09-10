/**
 * **Zwei Regler, drei Stufen** — Effekte und Ambiente, jeweils aus, leise
 * oder normal. Gespeichert im Browser wie die Gewichte der Bots
 * (`botTuning.ts`); ein kaputter Eintrag ist die Voreinstellung, kein Absturz.
 */
export type Level = 0 | 0.5 | 1;

export interface AudioLevels {
  /** Schritte, Monster, Herzschlag. */
  effects: Level;
  /** Grundbrummen, Dunkelheit, Knarren. */
  ambient: Level;
}

export const LEVELS: readonly Level[] = [0, 0.5, 1];

export const DEFAULT_LEVELS: AudioLevels = { effects: 1, ambient: 0.5 };

const STORE_KEY = 'haunting.audio.v1';

export function levelLabel(level: Level): string {
  return level === 0 ? 'aus' : level === 0.5 ? 'leise' : 'normal';
}

/** Die nächste Stufe im Kreis: aus → leise → normal → aus. */
export function nextLevel(level: Level): Level {
  return LEVELS[(LEVELS.indexOf(level) + 1) % LEVELS.length]!;
}

function asLevel(value: unknown, fallback: Level): Level {
  return value === 0 || value === 0.5 || value === 1 ? value : fallback;
}

export function clampLevels(value: unknown): AudioLevels {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    effects: asLevel(raw.effects, DEFAULT_LEVELS.effects),
    ambient: asLevel(raw.ambient, DEFAULT_LEVELS.ambient),
  };
}

export function loadAudioLevels(store: Pick<Storage, 'getItem'> | null = safeStore()): AudioLevels {
  try {
    const raw = store?.getItem(STORE_KEY);
    return clampLevels(raw ? JSON.parse(raw) : null);
  } catch {
    return clampLevels(null);
  }
}

export function saveAudioLevels(
  levels: AudioLevels,
  store: Pick<Storage, 'setItem'> | null = safeStore(),
): void {
  try {
    store?.setItem(STORE_KEY, JSON.stringify(clampLevels(levels)));
  } catch {
    // Ein privates Fenster ohne Speicher darf den Ton nicht anhalten.
  }
}

function safeStore(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
