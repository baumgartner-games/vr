import { clampSign, DEFAULT_SIGN, type SignSettings } from './signSettings';
import { sanitizeSign, type SharedSign } from './signShare';

/**
 * **Was ein Schild überlebt** — der Neustart des Browsers.
 *
 * Zwei Dinge werden aufgehoben, und sie sind verschieden genug, um getrennt zu
 * stehen:
 *
 * - Die **Vorlage**: Schriftgröße, Farben, Markdown, Rolltempo. Wer sich das
 *   einmal eingestellt hat, will es beim nächsten Schild wiederhaben — es ist
 *   dieselbe Sorte Einstellung wie die Feuerrate der Pistole.
 * - Die **eigenen aufgestellten Schilder**, je Welt. Ein Aushang in der Lobby,
 *   der nach einem Neuladen weg ist, ist kein Aushang, sondern eine Notiz.
 *
 * Aufgehoben wird dabei **nur, was man selbst aufgestellt hat**. Die Schilder
 * der anderen kommen über das Netz, wenn die anderen da sind; sie hier
 * mitzuschreiben hieße, dass ein Schild, das jemand längst abgeräumt hat, beim
 * nächsten Besuch wieder an der Wand hängt.
 */

const TEMPLATE_KEY = 'bgvr.sign';
const BOARDS_KEY = 'bgvr.signs';

type Listener = () => void;

const listeners = new Set<Listener>();

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    /* privater Modus; dann gilt es eben nur für diese Sitzung */
  }
  for (const listener of listeners) listener();
}

/** Nach jeder Änderung hier — ein offenes Menü schreibt sich dann neu. */
export function onSignChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Wie das nächste Schild aussieht, das jemand aufstellt. */
export function signTemplate(): SignSettings {
  return clampSign(readJson<Partial<SignSettings>>(TEMPLATE_KEY, DEFAULT_SIGN));
}

export function saveSignTemplate(settings: Partial<SignSettings>): SignSettings {
  const next = clampSign(settings);
  writeJson(TEMPLATE_KEY, next);
  return next;
}

export function clearSignTemplate(): void {
  try {
    globalThis.localStorage?.removeItem(TEMPLATE_KEY);
  } catch {
    /* siehe oben */
  }
  for (const listener of listeners) listener();
}

type StoredBoards = Record<string, SharedSign[]>;

/** Die eigenen Schilder dieser Welt, so wie sie zuletzt standen. */
export function storedSigns(worldId: string): SharedSign[] {
  const all = readJson<StoredBoards>(BOARDS_KEY, {});
  const list = Array.isArray(all[worldId]) ? all[worldId]! : [];
  return list.map((entry) => sanitizeSign(entry)).filter((entry): entry is SharedSign => !!entry);
}

export function saveSigns(worldId: string, signs: readonly SharedSign[]): void {
  const all = readJson<StoredBoards>(BOARDS_KEY, {});
  if (signs.length > 0) all[worldId] = [...signs];
  else delete all[worldId];
  writeJson(BOARDS_KEY, all);
}
