/**
 * **Die Malpalette — was darauf liegt** (`PaintPaletteTool.ts` zeigt und
 * bedient es). Reine Daten und ein bisschen Speicher, kein three.js.
 *
 * Gewünscht: _„In vr kann ich den gegenstand halten als malerpalette und
 * gegenstände die ich in der anderen hand halte, darauf ablegen um diese dort
 * zu ‚speichern'. Ich kann die elemente dort dann beliebig häufig rausnehmen
 * […] Ich will bei der malerpalette auch mehrere paletten abspeichern können
 * […] in der liste ich dann die aktuelle palette speichern kann oder andere
 * laden kann oder eine neue palette holen kann. Ich kann paletten auch einen
 * namen geben und sehe in der liste die 9 items die darauf passen."_
 *
 * - **Neun Fächer** (`SLOTS`), jedes leer oder mit einem Ding. Ein Ding ist
 *   eine Adresse (`PaletteItem.ref`) und kein Gegenstand: Herausnehmen holt
 *   jedes Mal ein frisches, beliebig oft.
 * - Drei Arten von Dingen, an der Vorsilbe zu erkennen: `element:<id>` ein
 *   Spielelement aus dem Katalog, `model:<pfad>` ein Modell aus dem Regal,
 *   `prop:<sorte>` ein Ding aus dem magischen Beutel.
 * - **Die aktuelle Palette** ist die, die man in der Hand hat; jede Änderung
 *   gilt sofort und bleibt über das Neuladen. **Gespeicherte Paletten** sind
 *   Kopien davon in einer Liste: _Speichern_ schreibt die aktuelle dorthin
 *   (über die, aus der sie geladen wurde, sonst als neue), _Laden_ holt eine
 *   als aktuelle, _Neue Palette_ fängt leer an.
 */

/** Wie viele Fächer eine Palette hat. */
export const SLOTS = 9;

export interface PaletteItem {
  /** Woher es kommt: `element:<id>`, `model:<pfad>` oder `prop:<sorte>`. */
  readonly ref: string;
  /** Wie es heißt — fürs Schild und die Liste. */
  readonly label: string;
}

export type PaletteSlots = readonly (PaletteItem | null)[];

export interface Palette {
  readonly name: string;
  readonly slots: PaletteSlots;
}

export interface PaletteState {
  /** Die Palette in der Hand. */
  readonly current: Palette;
  /** Aus welcher gespeicherten sie geladen wurde — `null`: noch nie gespeichert. */
  readonly from: number | null;
  /** Die gespeicherten. */
  readonly saved: readonly Palette[];
}

export type PaletteRefKind = 'element' | 'model' | 'prop';

/** Welche Art Ding eine Adresse meint — `null` für eine unbekannte. */
export function refKind(ref: string): PaletteRefKind | null {
  const cut = ref.indexOf(':');
  if (cut <= 0 || cut === ref.length - 1) return null;
  const kind = ref.slice(0, cut);
  return kind === 'element' || kind === 'model' || kind === 'prop' ? kind : null;
}

/** Was nach der Vorsilbe steht: Element-Id, Pfad oder Sorte. */
export function refValue(ref: string): string {
  return ref.slice(ref.indexOf(':') + 1);
}

export function emptySlots(): (PaletteItem | null)[] {
  return Array.from({ length: SLOTS }, () => null);
}

/** Ein Name für eine neue Palette, der in der Liste noch nicht vorkommt. */
export function freshName(saved: readonly Palette[]): string {
  for (let n = saved.length + 1; ; n++) {
    const name = `Palette ${n}`;
    if (!saved.some((palette) => palette.name === name)) return name;
  }
}

export const INITIAL_STATE: PaletteState = {
  current: { name: 'Palette 1', slots: emptySlots() },
  from: null,
  saved: [],
};

/** Ein Ding in ein Fach legen (oder es mit `null` leeren). */
export function setSlot(state: PaletteState, slot: number, item: PaletteItem | null): PaletteState {
  if (slot < 0 || slot >= SLOTS) return state;
  const slots = [...state.current.slots];
  slots[slot] = item;
  return { ...state, current: { ...state.current, slots } };
}

/** Das erste leere Fach — `-1`, wenn alle voll sind. */
export function firstFree(slots: PaletteSlots): number {
  return slots.findIndex((slot) => slot === null);
}

export function rename(state: PaletteState, name: string): PaletteState {
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed) return state;
  return { ...state, current: { ...state.current, name: trimmed } };
}

/** Die aktuelle in die Liste — über die, aus der sie kam, sonst hinten an. */
export function saveCurrent(state: PaletteState): PaletteState {
  const copy: Palette = { name: state.current.name, slots: [...state.current.slots] };
  if (state.from !== null && state.from < state.saved.length) {
    const saved = [...state.saved];
    saved[state.from] = copy;
    return { ...state, saved };
  }
  return { ...state, saved: [...state.saved, copy], from: state.saved.length };
}

/** Eine gespeicherte als aktuelle holen. */
export function loadSaved(state: PaletteState, index: number): PaletteState {
  const palette = state.saved[index];
  if (!palette) return state;
  return { ...state, current: { name: palette.name, slots: [...palette.slots] }, from: index };
}

/** Leer anfangen — die alte bleibt, wie sie gespeichert war. */
export function newPalette(state: PaletteState): PaletteState {
  return { ...state, current: { name: freshName(state.saved), slots: emptySlots() }, from: null };
}

/** Eine gespeicherte aus der Liste nehmen. */
export function deleteSaved(state: PaletteState, index: number): PaletteState {
  if (index < 0 || index >= state.saved.length) return state;
  const saved = state.saved.filter((_, i) => i !== index);
  const from =
    state.from === null || state.from === index
      ? null
      : state.from > index
        ? state.from - 1
        : state.from;
  return { ...state, saved, from };
}

// --- gemerkt ------------------------------------------------------------------

const KEY = 'bgvr.paintPalettes';

function cleanItem(raw: unknown): PaletteItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const { ref, label } = raw as { ref?: unknown; label?: unknown };
  if (typeof ref !== 'string' || refKind(ref) === null) return null;
  return { ref, label: typeof label === 'string' && label ? label : refValue(ref) };
}

function cleanPalette(raw: unknown, fallbackName: string): Palette {
  const value = (raw ?? {}) as { name?: unknown; slots?: unknown };
  const slots = emptySlots();
  if (Array.isArray(value.slots)) {
    value.slots.slice(0, SLOTS).forEach((slot, i) => (slots[i] = cleanItem(slot)));
  }
  const name = typeof value.name === 'string' && value.name.trim() ? value.name : fallbackName;
  return { name, slots };
}

/** Aus Unsinn wird ein brauchbarer Stand. */
export function cleanState(raw: unknown): PaletteState {
  if (!raw || typeof raw !== 'object') return INITIAL_STATE;
  const value = raw as { current?: unknown; from?: unknown; saved?: unknown };
  const saved = Array.isArray(value.saved)
    ? value.saved.slice(0, 50).map((one, i) => cleanPalette(one, `Palette ${i + 1}`))
    : [];
  const from =
    typeof value.from === 'number' && value.from >= 0 && value.from < saved.length
      ? Math.floor(value.from)
      : null;
  return { current: cleanPalette(value.current, freshName(saved)), from, saved };
}

const listeners = new Set<() => void>();
let state: PaletteState | null = null;

/** Der Stand, gelesen beim ersten Mal. */
export function palettes(): PaletteState {
  if (!state) {
    try {
      const raw = globalThis.localStorage?.getItem(KEY);
      state = raw ? cleanState(JSON.parse(raw)) : INITIAL_STATE;
    } catch {
      state = INITIAL_STATE;
    }
  }
  return state;
}

/** Einen neuen Stand setzen — gemerkt, und alle, die zuhören, erfahren es. */
export function updatePalettes(change: (now: PaletteState) => PaletteState): PaletteState {
  const next = change(palettes());
  if (next === state) return next;
  state = next;
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // Ohne Speicher gilt es bis zum Neuladen.
  }
  for (const listener of listeners) listener();
  return next;
}

export function onPalettesChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Nur für Tests: den gemerkten Stand vergessen. */
export function resetPalettesForTest(): void {
  state = null;
}
