/**
 * **Die Belegung der Eingaben — und die Karte des Geräts darunter.**
 *
 * Zwei Dinge können an einem Pad falsch sein, und sie sehen gleich aus:
 *
 * 1. **Der Treiber lügt über die Lage.** Ein Backbone am iPhone meldet den
 *    unteren Gesichtsknopf als `buttons[1]` und den rechten als `buttons[0]` —
 *    getauscht gegenüber dem Standard-Mapping. Wer dort unten drückt, benutzt
 *    nichts, weil _Benutzen_ auf Nummer 0 liegt.
 * 2. **Die Belegung passt nicht.** Nummer und Lage stimmen, aber man will
 *    schießen, wo bisher gezoomt wurde.
 *
 * Der Fehler ist derselbe („mein Knopf tut nichts"), die Ursache nicht — und
 * genau deshalb stehen hier **zwei** Karten und nicht eine:
 *
 * - Die **Gerätekarte** (`PadLayout`) sagt, **welche Nummer wo sitzt**. Sie
 *   gehört dem Gerät, wird unter dessen Kennung gespeichert und gilt für jedes
 *   andere Gerät nicht.
 * - Die **Belegung** (`PadBinding`, `KeyBinding`) sagt, **welche Stelle was
 *   tut**. Sie gehört dem Menschen und gilt für alle Geräte.
 *
 * **Warum Aktionen an Stellen hängen und nicht an Nummern.** _Benutzen_ ist
 * „der untere Gesichtsknopf" und nicht „Nummer 0". Hängte die Belegung an
 * Nummern, müsste man sie an jedem Pad neu einstellen, das seine Nummern
 * anders sortiert — und die Gerätekarte wäre eine Kosmetik, die nur das Bild
 * auf der Eingabeseite richtet und das Spiel weiter falsch lässt. So richtet
 * **eine** Angabe beides: Steht in der Karte, dass Nummer 1 unten sitzt, dann
 * benutzt Nummer 1, und im Bild leuchtet unten.
 *
 * Und was hier **nicht** steht: die Sticks. Laufen und Zielen sind Achsen und
 * keine Knöpfe (`AXIS_MOVE_X` … in `gamepad.ts`); eine Achse auf einen Knopf
 * zu legen wäre ein anderes Gefühl und nicht dieselbe Sache. Am Pad sind
 * deshalb die sechs Knopf-Absichten einstellbar, an der Tastatur auch das
 * Laufen — dort ist es ohnehin je eine Taste.
 *
 * Reine Rechnung: kein DOM, kein `navigator`, kein `localStorage` (der steht in
 * `inputStore.ts`). Was hier passiert, rechnet ein Test nach — im Container
 * steckt kein Controller, und ein Backbone erst recht nicht.
 */

import { PAD_BUTTONS, type PadSlot } from './gamepadReport';

/**
 * **Was ein Knopf am Pad auslösen kann** — genau die sechs Absichten, die
 * `GamepadFrame` kennt, und keine erfundene dazu: Eine Belegung, die etwas
 * anbietet, das das Spiel nicht liest, ist ein Schalter ohne Draht.
 */
export const PAD_ACTIONS = ['use', 'fire', 'sprint', 'tools', 'zoomIn', 'zoomOut'] as const;
export type PadAction = (typeof PAD_ACTIONS)[number];

/** **Und was eine Taste auslösen kann.** Hier gehört das Laufen dazu. */
export const KEY_ACTIONS = [
  'forward',
  'back',
  'left',
  'right',
  'sprint',
  'jump',
  'use',
  'tools',
] as const;
export type KeyAction = (typeof KEY_ACTIONS)[number];

/** Wie eine Aktion in einem Menü heißt, und was sie tut. */
export const ACTION_LABELS: Record<PadAction | KeyAction, { label: string; sub: string }> = {
  use: { label: 'Benutzen', sub: 'Was in Reichweite steht — sonst springen' },
  fire: { label: 'Schießen', sub: 'Der Trigger der rechten Hand' },
  sprint: { label: 'Sprint', sub: 'Schneller laufen' },
  tools: { label: 'Werkzeugliste', sub: 'Das Regal auf- und zuklappen' },
  zoomIn: { label: 'Zoom heran', sub: 'Von oben: eine Stufe näher' },
  zoomOut: { label: 'Zoom zurück', sub: 'Von oben: eine Stufe weiter weg' },
  forward: { label: 'Vorwärts', sub: 'Nach Norden — auch wenn die Figur anders schaut' },
  back: { label: 'Zurück', sub: 'Nach Süden' },
  left: { label: 'Links', sub: 'Nach Westen' },
  right: { label: 'Rechts', sub: 'Nach Osten' },
  jump: { label: 'Springen', sub: 'Immer, auch mit etwas in Reichweite' },
};

/**
 * **Die Belegung ab Werk am Pad** — Zeile für Zeile das, was dieses Projekt
 * immer hatte (`core/gamepad.ts`), nur in Stellen statt in Nummern
 * ausgedrückt. Wer nichts einstellt, merkt von dieser Datei nichts.
 *
 * `fire` hat **zwei** Stellen, und das ist kein Versehen: `B` ist ein Schalter,
 * der Trigger ist analog, und beide sollen schießen. Der Zug kommt dann von
 * der Stelle, die am weitesten gedrückt ist.
 */
export const DEFAULT_PAD: Record<PadAction, readonly PadSlot[]> = {
  use: ['face-down'],
  fire: ['face-right', 'trigger-right'],
  sprint: ['stick-left'],
  tools: ['face-up'],
  zoomIn: ['shoulder-left'],
  zoomOut: ['shoulder-right'],
};

/** **Und an der Tastatur** — ebenfalls genau das, was bisher gilt. */
export const DEFAULT_KEYS: Record<KeyAction, readonly string[]> = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft'],
  jump: ['Space'],
  use: ['KeyE', 'Enter', 'NumpadEnter'],
  tools: ['Tab'],
};

/**
 * **Die Karte eines Geräts: Nummer → Stelle.** Nur die Abweichungen stehen
 * darin; alles, was fehlt, sitzt dort, wo das Standard-Mapping es hinlegt.
 */
export type PadLayout = Readonly<Record<number, PadSlot>>;

/** Alles, was ein Mensch an seinen Eingaben verstellt hat. */
export interface InputConfig {
  /** Je Gerätekennung die Abweichungen seiner Tastenlage. */
  layouts: Readonly<Record<string, PadLayout>>;
  /** Je Aktion die Stellen, die sie auslösen — nur die geänderten. */
  pad: Readonly<Partial<Record<PadAction, readonly PadSlot[]>>>;
  /** Je Aktion die Tasten, die sie auslösen — nur die geänderten. */
  keys: Readonly<Partial<Record<KeyAction, readonly string[]>>>;
}

/** Nichts verstellt — und damit alles auf Standard. */
export function defaultInputConfig(): InputConfig {
  return { layouts: {}, pad: {}, keys: {} };
}

/** Ob überhaupt etwas verstellt ist (für die Zeile „auf Standard"). */
export function isDefaultConfig(config: InputConfig): boolean {
  return (
    Object.keys(config.layouts).length === 0 &&
    Object.keys(config.pad).length === 0 &&
    Object.keys(config.keys).length === 0
  );
}

/**
 * **Der Name, unter dem eine Gerätekarte liegt.**
 *
 * `gamepad.id` ist die ganze Kennung samt Hersteller- und Produktnummer, und
 * genau die soll es sein: Zwei Backbones sind dasselbe Gerät und sollen
 * dieselbe Karte bekommen, ein DualSense daneben eine eigene. Gekürzt wird nur
 * der Weißraum und die Groß-/Kleinschreibung — derselbe Treiber schreibt seine
 * Kennung nicht immer gleich —, und die Länge, damit ein Treiber mit
 * Romanlänge nicht den Speicher füllt.
 */
export function deviceKey(id: string | null | undefined): string {
  return (id ?? '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
}

/** Wo eine Nummer im **Standard-Mapping** sitzt. */
function standardSlot(index: number): PadSlot | null {
  return PAD_BUTTONS[index]?.slot ?? null;
}

/**
 * **Die Lage aller Nummern dieses Geräts** — die Karte, aufgelöst.
 *
 * Zuerst gelten die Abweichungen, dann füllen die übrigen Nummern ihre
 * Standardstelle auf — **aber nur, wenn eine Abweichung sie nicht schon
 * beansprucht hat.** Ohne diese Bedingung behauptete nach einem Tausch die
 * getauschte Nummer _und_ ihre alte Nachbarin dieselbe Stelle, und welche von
 * beiden das Spiel hört, entschiede die Reihenfolge einer Schleife. Wer dabei
 * heraussortiert wird, hat eben keine Stelle (`null`) — er steht auf der
 * Eingabeseite dann als Nummer da, und das ist die Wahrheit.
 */
export function layoutSlots(layout: PadLayout, count: number): (PadSlot | null)[] {
  const slots: (PadSlot | null)[] = new Array<PadSlot | null>(count).fill(null);
  const taken = new Set<PadSlot>();
  for (const [key, slot] of Object.entries(layout)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= count) continue;
    slots[index] = slot;
    taken.add(slot);
  }
  for (let index = 0; index < count; index++) {
    if (slots[index]) continue;
    const slot = standardSlot(index);
    if (slot && !taken.has(slot)) {
      slots[index] = slot;
      taken.add(slot);
    }
  }
  return slots;
}

/** Wo Nummer `index` an diesem Gerät sitzt. */
export function slotOf(layout: PadLayout, index: number, count: number): PadSlot | null {
  return layoutSlots(layout, count)[index] ?? null;
}

/** Und umgekehrt: welche Nummer an dieser Stelle sitzt. */
export function indexOf(layout: PadLayout, slot: PadSlot, count: number): number | null {
  const slots = layoutSlots(layout, count);
  const found = slots.indexOf(slot);
  return found < 0 ? null : found;
}

/**
 * **Wie viele Nummern ein Pad hat, für die Auflösung der Karte.**
 *
 * Die Tabelle kennt achtzehn; ein Pad kann mehr melden (ein Adapter) oder
 * weniger (ein Ministick). Gerechnet wird mit dem größeren von beiden, damit
 * eine Karte, die Nummer 19 eine Stelle gibt, sie auch behält.
 */
export function layoutSize(buttonCount: number): number {
  return Math.max(PAD_BUTTONS.length, buttonCount);
}

/**
 * **Eine Nummer auf eine Stelle legen — und die vorige mitnehmen.**
 *
 * Das ist der Kern der ganzen Datei, und der Tausch ist Absicht: Wer sagt
 * „unten sitzt in Wirklichkeit Nummer 1", sagt damit unvermeidlich auch etwas
 * über Nummer 0 — sie kann nicht auch unten sitzen. Sie bekommt deshalb die
 * Stelle, die Nummer 1 gerade abgibt. Damit ist der häufigste Fall überhaupt
 * — zwei verwechselte Knöpfe — **ein** Handgriff und nicht zwei, und es kann
 * keine Karte entstehen, in der eine Stelle zweimal vorkommt.
 *
 * Ist die Stelle frei (weil die Zahl der Knöpfe nicht reicht), wird nur
 * zugewiesen. Liegt die Nummer schon dort, kommt die Karte unverändert zurück.
 */
export function assignSlot(
  config: InputConfig,
  key: string,
  index: number,
  slot: PadSlot,
  count = PAD_BUTTONS.length,
): InputConfig {
  const size = layoutSize(count);
  if (!key || !Number.isInteger(index) || index < 0 || index >= size) return config;
  const layout = config.layouts[key] ?? {};
  const slots = layoutSlots(layout, size);
  if (slots[index] === slot) return config;

  const next: Record<number, PadSlot> = {};
  // Die ganze aufgelöste Karte wird hingeschrieben und nicht nur die zwei
  // geänderten Zeilen: Eine halbe Karte wäre eine, deren Rest sich mitverschiebt,
  // sobald jemand später eine dritte Stelle antippt.
  for (let i = 0; i < size; i++) {
    const at = slots[i];
    if (at) next[i] = at;
  }
  const previous = slots[index] ?? null;
  const holder = slots.indexOf(slot);
  next[index] = slot;
  if (holder >= 0 && holder !== index) {
    if (previous) next[holder] = previous;
    else delete next[holder];
  }
  return { ...config, layouts: { ...config.layouts, [key]: next } };
}

/** Die Karte eines Geräts wieder wegwerfen — Standard-Mapping, wie geliefert. */
export function resetDevice(config: InputConfig, key: string): InputConfig {
  if (!(key in config.layouts)) return config;
  const layouts = { ...config.layouts };
  delete layouts[key];
  return { ...config, layouts };
}

/** Welche Stellen eine Pad-Aktion auslösen. */
export function padSlotsFor(config: InputConfig, action: PadAction): readonly PadSlot[] {
  return config.pad[action] ?? DEFAULT_PAD[action];
}

/** Welche Tasten eine Tastatur-Aktion auslösen. */
export function keysFor(config: InputConfig, action: KeyAction): readonly string[] {
  return config.keys[action] ?? DEFAULT_KEYS[action];
}

/**
 * **Eine Stelle auf eine Aktion legen.**
 *
 * Die Stelle wird dabei allem anderen **weggenommen**: Ein Knopf, der zugleich
 * schießt und zoomt, ist kein eingestellter Knopf, sondern ein
 * unvorhersehbarer. Was dadurch leer läuft, bleibt leer — eine Aktion ohne
 * Knopf ist eine Entscheidung und kein Fehler, und die Zeile im Menü sagt sie.
 */
export function bindPad(config: InputConfig, action: PadAction, slot: PadSlot): InputConfig {
  const pad: Partial<Record<PadAction, readonly PadSlot[]>> = {};
  for (const other of PAD_ACTIONS) {
    const slots = padSlotsFor(config, other).filter((s) => s !== slot);
    if (other === action) pad[other] = [slot];
    else if (slots.length !== padSlotsFor(config, other).length) pad[other] = slots;
    else if (config.pad[other]) pad[other] = config.pad[other];
  }
  return { ...config, pad: prune(pad, DEFAULT_PAD) };
}

/** Dasselbe für eine Taste, mit derselben Regel: eine Taste, eine Aktion. */
export function bindKey(config: InputConfig, action: KeyAction, code: string): InputConfig {
  if (!code) return config;
  const keys: Partial<Record<KeyAction, readonly string[]>> = {};
  for (const other of KEY_ACTIONS) {
    const list = keysFor(config, other).filter((c) => c !== code);
    if (other === action) keys[other] = [code];
    else if (list.length !== keysFor(config, other).length) keys[other] = list;
    else if (config.keys[other]) keys[other] = config.keys[other];
  }
  return { ...config, keys: prune(keys, DEFAULT_KEYS) };
}

/** Eine einzelne Aktion auf Standard — der kleine Rückweg neben dem großen. */
export function resetAction(config: InputConfig, action: PadAction | KeyAction): InputConfig {
  const pad = { ...config.pad };
  const keys = { ...config.keys };
  if (action in DEFAULT_PAD) delete pad[action as PadAction];
  if (action in DEFAULT_KEYS) delete keys[action as KeyAction];
  return { ...config, pad, keys };
}

/** Alle Belegungen auf Standard; die Gerätekarten bleiben. */
export function resetBindings(config: InputConfig): InputConfig {
  return { ...config, pad: {}, keys: {} };
}

/**
 * **Was das Spiel wirklich abfragt: Nummern.**
 *
 * Hier laufen die beiden Karten zusammen — die Belegung sagt die Stelle, die
 * Gerätekarte die Nummer dazu. Heraus kommt je Aktion eine Liste von Nummern,
 * und `readGamepad` muss danach von Stellen, Geräten und Belegungen nichts
 * mehr wissen. Eine Stelle, die dieses Pad nicht hat, fällt dabei heraus: Ein
 * Pad ohne Touchpad hat keine Nummer dafür, und `undefined` in einer Liste von
 * Nummern wäre ein Knopf, der zufällig irgendwo anliegt.
 */
export type PadPlan = Record<PadAction, readonly number[]>;

export function padPlan(config: InputConfig, layout: PadLayout, buttonCount: number): PadPlan {
  const size = layoutSize(buttonCount);
  const slots = layoutSlots(layout, size);
  const plan = {} as Record<PadAction, number[]>;
  for (const action of PAD_ACTIONS) {
    plan[action] = padSlotsFor(config, action)
      .map((slot) => slots.indexOf(slot))
      .filter((index) => index >= 0 && index < buttonCount);
  }
  return plan;
}

/** Der Plan ohne alles: Standard-Belegung auf einem Standard-Pad. */
export function defaultPadPlan(buttonCount = PAD_BUTTONS.length): PadPlan {
  return padPlan(defaultInputConfig(), {}, buttonCount);
}

// --- Lesen und Schreiben -----------------------------------------------------

/** Die Fassung im Speicher. Eine unbekannte wird verworfen, nicht geraten. */
export const INPUT_CONFIG_VERSION = 1;

interface StoredConfig {
  v?: number;
  layouts?: Record<string, Record<string, string>>;
  pad?: Record<string, string[]>;
  keys?: Record<string, string[]>;
}

/**
 * **Was im Speicher steht, misstrauisch gelesen.**
 *
 * Es ist fremder Text: von Hand verstellt, aus einer älteren Fassung, oder von
 * einem Browser, der `localStorage` zwischendurch abgeräumt hat. Jede Zeile
 * wird deshalb geprüft und im Zweifel weggelassen — eine Belegung, die zur
 * Hälfte aus Müll besteht, ist schlimmer als die Standardbelegung, denn sie
 * lässt sich nicht erklären.
 */
export function parseInputConfig(text: string | null | undefined): InputConfig {
  if (!text) return defaultInputConfig();
  let raw: StoredConfig;
  try {
    raw = JSON.parse(text) as StoredConfig;
  } catch {
    return defaultInputConfig();
  }
  if (!raw || typeof raw !== 'object' || raw.v !== INPUT_CONFIG_VERSION) {
    return defaultInputConfig();
  }

  const slots = new Set<string>(PAD_BUTTONS.map((spec) => spec.slot));
  const layouts: Record<string, PadLayout> = {};
  for (const [key, map] of Object.entries(raw.layouts ?? {})) {
    if (!key || !map || typeof map !== 'object') continue;
    const layout: Record<number, PadSlot> = {};
    for (const [at, slot] of Object.entries(map)) {
      const index = Number(at);
      if (!Number.isInteger(index) || index < 0 || index > 64) continue;
      if (typeof slot === 'string' && slots.has(slot)) layout[index] = slot as PadSlot;
    }
    if (Object.keys(layout).length) layouts[deviceKey(key)] = layout;
  }

  const pad: Partial<Record<PadAction, readonly PadSlot[]>> = {};
  for (const action of PAD_ACTIONS) {
    const list = raw.pad?.[action];
    if (!Array.isArray(list)) continue;
    pad[action] = list.filter(
      (slot): slot is PadSlot => typeof slot === 'string' && slots.has(slot),
    );
  }

  const keys: Partial<Record<KeyAction, readonly string[]>> = {};
  for (const action of KEY_ACTIONS) {
    const list = raw.keys?.[action];
    if (!Array.isArray(list)) continue;
    // `KeyboardEvent.code` ist ein kurzer Name aus Buchstaben und Ziffern;
    // alles andere kam nicht von einer Tastatur.
    keys[action] = list.filter(
      (code): code is string => typeof code === 'string' && /^[A-Za-z0-9]{1,24}$/.test(code),
    );
  }

  return { layouts, pad: prune(pad, DEFAULT_PAD), keys: prune(keys, DEFAULT_KEYS) };
}

/** Und hinaus damit — nur die Abweichungen, damit der Standard nachziehen darf. */
export function serializeInputConfig(config: InputConfig): string {
  const stored: StoredConfig = { v: INPUT_CONFIG_VERSION };
  if (Object.keys(config.layouts).length) {
    stored.layouts = {};
    for (const [key, layout] of Object.entries(config.layouts)) {
      stored.layouts[key] = Object.fromEntries(
        Object.entries(layout).map(([index, slot]) => [index, slot]),
      );
    }
  }
  if (Object.keys(config.pad).length) {
    stored.pad = {};
    for (const [action, slots] of Object.entries(config.pad)) stored.pad[action] = [...slots!];
  }
  if (Object.keys(config.keys).length) {
    stored.keys = {};
    for (const [action, codes] of Object.entries(config.keys)) stored.keys[action] = [...codes!];
  }
  return JSON.stringify(stored);
}

/**
 * **Was gleich dem Standard ist, wird nicht gespeichert.** Sonst friert eine
 * Belegung ein: Wer heute `Tab` ausdrücklich auf die Werkzeugliste legt, hätte
 * sie morgen weiter dort, auch wenn die Voreinstellung längst eine bessere
 * Taste kennt. Gespeichert wird nur der Widerspruch.
 */
function prune<K extends string, V extends readonly string[]>(
  values: Partial<Record<K, V>>,
  defaults: Record<K, V>,
): Partial<Record<K, V>> {
  const out: Partial<Record<K, V>> = {};
  for (const [key, list] of Object.entries(values) as [K, V | undefined][]) {
    if (!list) continue;
    const base = defaults[key];
    if (base.length === list.length && base.every((value, at) => value === list[at])) continue;
    out[key] = list;
  }
  return out;
}
