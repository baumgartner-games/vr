import { npcSkin, type NpcKind } from './npcKinds';
import { readRecording, type Recording } from './npcRecording';

/**
 * **Die gespeicherten Charaktere** — eine Haut und die Aktion, die man ihr
 * beigebracht hat, im Browser abgelegt wie die übrige Ausrüstung
 * (`gearStore.ts`, `bgvr.*`).
 *
 * Ein Charakter ist hier genau das: ein NPC, dem man eine Aufnahme mitgegeben
 * hat. Wer die Übungspuppe übernimmt, ihr die Heizdecke abnimmt und das
 * speichert, bekommt einen Eintrag, der nach dem Neuladen noch da ist —
 * _Menü → NPC → Charaktere_ stellt ihn wieder hin, und _Abspielen_ lässt ihn
 * die Decke noch einmal abnehmen.
 *
 * **Eigener Schlüssel, eigener Speicher.** Der Rest der Ausrüstung sind ein
 * paar Zahlen; eine Aufnahme sind tausend Bilder. Läge beides unter einem
 * Schlüssel, würde jede Einstellung am Hirn die Aufnahmen mit umschreiben.
 * Und weil der Browser bei rund fünf Megabyte dichtmacht, wird vor dem
 * Schreiben gemessen (`STORE_LIMIT`): Ein Charakter, der nicht mehr
 * hineinpasst, wird gemeldet und nicht halb geschrieben.
 */

export const CHARACTER_KEY = 'bgvr.characters';

/** Was zusammen im Speicher liegen darf, in Zeichen — gut unter dem Deckel des Browsers. */
export const STORE_LIMIT = 3_500_000;

export interface SavedCharacter {
  readonly id: string;
  readonly name: string;
  readonly kind: NpcKind;
  /** Wann gespeichert, als ISO-Zeit. */
  readonly created: string;
  readonly recording: Recording;
}

type Listener = () => void;
const listeners = new Set<Listener>();

/** Wird nach jeder Änderung gerufen, damit ein offenes Menü neu zeichnet. */
export function onCharactersChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Der Speicher, wie `gearStore` ihn liest — austauschbar für den Test. */
export interface KeyStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStore(): KeyStore | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Alle gespeicherten Charaktere, die neuesten zuerst. Unlesbares wird übersprungen. */
export function listCharacters(store: KeyStore | null = browserStore()): SavedCharacter[] {
  let raw: unknown;
  try {
    const text = store?.getItem(CHARACTER_KEY);
    raw = text ? JSON.parse(text) : [];
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const found: SavedCharacter[] = [];
  for (const entry of raw) {
    const character = readCharacter(entry);
    if (character) found.push(character);
  }
  return found;
}

export function characterById(
  id: string,
  store: KeyStore | null = browserStore(),
): SavedCharacter | null {
  return listCharacters(store).find((character) => character.id === id) ?? null;
}

/**
 * Legt einen Charakter ab. Gibt den Eintrag zurück — oder `null`, wenn er
 * nicht mehr in den Speicher passt oder der Browser keinen hergibt.
 */
export function saveCharacter(
  input: { name?: string; kind: NpcKind; recording: Recording; now?: Date },
  store: KeyStore | null = browserStore(),
): SavedCharacter | null {
  if (!store) return null;
  const all = listCharacters(store);
  const now = input.now ?? new Date();
  const character: SavedCharacter = {
    id: `${now.getTime().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    name: input.name?.trim() || nextCharacterName(input.kind, all, now),
    kind: input.kind,
    created: now.toISOString(),
    recording: input.recording,
  };
  const next = [character, ...all];
  const text = JSON.stringify(next);
  if (text.length > STORE_LIMIT) return null;
  try {
    store.setItem(CHARACTER_KEY, text);
  } catch {
    return null;
  }
  for (const listener of listeners) listener();
  return character;
}

export function deleteCharacter(id: string, store: KeyStore | null = browserStore()): boolean {
  if (!store) return false;
  const all = listCharacters(store);
  const next = all.filter((character) => character.id !== id);
  if (next.length === all.length) return false;
  try {
    store.setItem(CHARACTER_KEY, JSON.stringify(next));
  } catch {
    return false;
  }
  for (const listener of listeners) listener();
  return true;
}

/**
 * Ein Name, den niemand eintippen muss: die Haut und die Uhrzeit —
 * „Übungspuppe 14:32". Gibt es den schon, wird durchnummeriert.
 */
export function nextCharacterName(
  kind: NpcKind,
  existing: readonly SavedCharacter[],
  now: Date = new Date(),
): string {
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const base = `${npcSkin(kind).label} ${hours}:${minutes}`;
  const taken = new Set(existing.map((character) => character.name));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Wie groß der Speicher gerade ist, in Zeichen — für die Anzeige. */
export function storeSize(store: KeyStore | null = browserStore()): number {
  try {
    return store?.getItem(CHARACTER_KEY)?.length ?? 0;
  } catch {
    return 0;
  }
}

function readCharacter(raw: unknown): SavedCharacter | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<SavedCharacter>;
  if (typeof value.id !== 'string' || typeof value.name !== 'string') return null;
  if (typeof value.kind !== 'string' || typeof value.created !== 'string') return null;
  const recording = readRecording(value.recording);
  if (!recording) return null;
  return {
    id: value.id,
    name: value.name,
    kind: value.kind as NpcKind,
    created: value.created,
    recording,
  };
}
