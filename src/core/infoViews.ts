/**
 * **Wie die Info-Ansichten aussehen** — ein kleines Optionsfeld, dasselbe für
 * jede.
 *
 * Es gibt inzwischen ein halbes Dutzend Ansichten, die nichts bauen, sondern
 * etwas **zeigen**: die Karte in der Hand, das Navigationsgitter, die
 * Gitterlinien, die Hitboxen in 2D und 3D, das Ghosting, die Griffe. Jede
 * davon war ein Häkchen und sonst nichts, und jede hatte deshalb genau eine
 * Antwort auf die Frage, wie viel sie zeigt: alles. Gewünscht war das
 * Gegenteil — „nur 2D-Pfad", „Wände an/aus", „Räume", „NPCs/Ziele", etwas
 * Transparenz —, und zwar **überall mit denselben Bedienelementen**.
 *
 * Daraus folgen drei Entscheidungen:
 *
 * - **Fünf Optionen und nicht fünf je Ansicht.** `flat`, `walls`, `rooms`,
 *   `actors`, `opacity` bedeuten in jeder Ansicht dasselbe; eine Ansicht sagt
 *   nur, welche davon sie **kennt** (`InfoViewSpec.supports`). Was sie nicht
 *   kennt, steht in ihrem Feld gar nicht erst da — ein Schalter „Wände" an den
 *   Griffen wäre ein Schalter, der nichts tut.
 * - **Reine Rechnung ohne three.js**, wie jede Einstellung hier
 *   (`graphicsSettings.ts`): Voreinstellung, Einlesen eines alten Stands,
 *   Umschalten und die Zeile im Menü sind geprüft (`infoViews.test.ts`), bevor
 *   irgendeine Ansicht sie liest. Angewandt wird in `infoViewScene.ts`, das
 *   Menü baut `ui/infoViewMenu.ts`.
 * - **Ein eigener Schlüssel im Browser** (`bgvr.infoViews`) und nicht ein Feld
 *   mehr in der Grafik: Das sind acht mal fünf Werte, und die Grafik ist die
 *   Seite, die gerade am meisten umgebaut wird. Was hier steht, lässt sich an
 *   jede neue Menüstruktur hängen, ohne dass die alte etwas davon merkt.
 */

/** Die Ansichten, die ein Optionsfeld haben. */
export type InfoViewId =
  'map' | 'nav' | 'gridLines' | 'cells' | 'gridHitBoxes' | 'hitBoxes' | 'ghost' | 'handles';

/** Die fünf Optionen — dieselben für jede Ansicht. */
export type InfoOption = 'flat' | 'walls' | 'rooms' | 'actors' | 'opacity';

/** Die Rasten der Deckkraft: voll, gedämpft, ein Hauch. */
export type InfoOpacity = 1 | 0.7 | 0.4;
export const INFO_OPACITIES: readonly InfoOpacity[] = [1, 0.7, 0.4];

export interface InfoViewOptions {
  /**
   * **Nur 2D-Pfad** — Wege und Umrisse flach auf dem Boden, als Linien; alles,
   * was in die Höhe geht oder eine Fläche füllt (Verbindungsbögen,
   * Sichtfächer, gefüllte Kacheln), bleibt weg.
   */
  flat: boolean;
  /** Wände, Türen, Fenster und geschlossene Kanten. */
  walls: boolean;
  /** Räume: Böden, Kacheln, Zellen — die Fläche, auf der man steht. */
  rooms: boolean;
  /** NPCs und ihre Ziele: Punkte, Wege, Sichtbereiche. */
  actors: boolean;
  /** Wie deckend die Ansicht gezeichnet wird. */
  opacity: InfoOpacity;
}

export interface InfoViewSpec {
  id: InfoViewId;
  label: string;
  /** Wo sie zu finden ist — eine Zeile fürs Menü. */
  sub: string;
  /** Welche der fünf Optionen diese Ansicht kennt, in Menüreihenfolge. */
  supports: readonly InfoOption[];
}

/**
 * **Die Bestandsaufnahme.** Jede Info-Ansicht des Spiels, mit dem, was sie
 * darstellen kann. Wer eine neue baut, trägt sie hier ein — und bekommt das
 * Optionsfeld im Menü umsonst.
 */
export const INFO_VIEWS: readonly InfoViewSpec[] = [
  {
    id: 'map',
    label: 'Karte in der Hand',
    sub: 'Das Werkzeug „Karte" · Böden, Wände, NPCs und ihre Wege',
    supports: ['flat', 'walls', 'rooms', 'actors', 'opacity'],
  },
  {
    id: 'nav',
    label: 'Navigationsgitter',
    sub: 'NPC → Navigation zeigen · Kacheln, Wände, Wege, Sicht',
    supports: ['flat', 'walls', 'rooms', 'actors', 'opacity'],
  },
  {
    id: 'gridLines',
    label: 'Gitterlinien',
    sub: 'Grafik → Gitterlinien · das Kachelnetz der eigenen Ebene',
    supports: ['opacity'],
  },
  {
    id: 'cells',
    label: 'Belegte Felder',
    sub: 'Grafik → Belegte Felder · halbe Kacheln und die 2×2 der Figuren',
    supports: ['rooms', 'actors', 'opacity'],
  },
  {
    id: 'gridHitBoxes',
    label: 'Hitboxen (2D-Gitter)',
    sub: 'Grafik → Hitboxen 2D · Zellen, Wandlinien, Treppenpfeile',
    supports: ['walls', 'rooms', 'opacity'],
  },
  {
    id: 'hitBoxes',
    label: 'Hitboxen (3D)',
    sub: 'Grafik → Hitboxen 3D · die Körper der Physik',
    supports: ['opacity'],
  },
  {
    id: 'ghost',
    label: 'Ghosting',
    sub: 'Grafik → Ghosting zeigen · Kästen und Spalte',
    supports: ['walls', 'opacity'],
  },
  {
    id: 'handles',
    label: 'Griffe',
    sub: 'Grafik → Griffe zeigen · Achsenkreuze und Haltezylinder',
    supports: ['opacity'],
  },
];

export const INFO_VIEW_IDS: readonly InfoViewId[] = INFO_VIEWS.map((view) => view.id);

export function infoViewSpec(id: InfoViewId): InfoViewSpec {
  return INFO_VIEWS.find((view) => view.id === id)!;
}

/** Beschriftung der fünf Optionen — für jede Ansicht dieselbe. */
export const INFO_OPTION_LABELS: Readonly<Record<InfoOption, string>> = {
  flat: 'Nur 2D-Pfad',
  walls: 'Wände',
  rooms: 'Räume',
  actors: 'NPCs und Ziele',
  opacity: 'Deckkraft',
};

export const INFO_OPTION_SUBS: Readonly<Record<InfoOption, string>> = {
  flat: 'Wege und Umrisse flach als Linien — ohne Flächen, Bögen und Fächer',
  walls: 'Wände, Türen, Fenster und geschlossene Kanten',
  rooms: 'Böden, Kacheln und Zellen — die Fläche, auf der man steht',
  actors: 'NPCs, ihre Wege, Ziele und Sichtbereiche',
  opacity: 'Wie deckend die Ansicht über der Welt liegt',
};

export const INFO_OPACITY_LABELS: Readonly<Record<InfoOpacity, string>> = {
  1: '100 %',
  0.7: '70 %',
  0.4: '40 %',
};

/** Der Auslieferungszustand: alles an, voll deckend — das Bild von vorher. */
export const DEFAULT_INFO_VIEW: Readonly<InfoViewOptions> = {
  flat: false,
  walls: true,
  rooms: true,
  actors: true,
  opacity: 1,
};

export type InfoViewSettings = Record<InfoViewId, InfoViewOptions>;

export function defaultInfoViews(): InfoViewSettings {
  const out = {} as InfoViewSettings;
  for (const id of INFO_VIEW_IDS) out[id] = { ...DEFAULT_INFO_VIEW };
  return out;
}

/**
 * Ein Stand, bei dem jeder Wert erlaubt ist — aus dem Browser, aus einem Code,
 * von gestern. Was fehlt oder nicht passt, wird der Auslieferungszustand, und
 * zwar **je Feld**: Ein Stand, der nur `walls: false` kennt, behält das.
 */
export function clampInfoViews(raw: unknown): InfoViewSettings {
  const out = defaultInfoViews();
  if (!raw || typeof raw !== 'object') return out;
  const source = raw as Record<string, unknown>;
  for (const id of INFO_VIEW_IDS) {
    out[id] = clampInfoView(source[id]);
  }
  return out;
}

export function clampInfoView(raw: unknown): InfoViewOptions {
  const out = { ...DEFAULT_INFO_VIEW };
  if (!raw || typeof raw !== 'object') return out;
  const value = raw as Partial<Record<InfoOption, unknown>>;
  for (const key of ['flat', 'walls', 'rooms', 'actors'] as const) {
    if (typeof value[key] === 'boolean') out[key] = value[key];
  }
  if (INFO_OPACITIES.includes(value.opacity as InfoOpacity)) {
    out.opacity = value.opacity as InfoOpacity;
  }
  return out;
}

/** Die nächste Raste der Deckkraft, unten wieder von vorn. */
export function nextInfoOpacity(opacity: InfoOpacity): InfoOpacity {
  const index = INFO_OPACITIES.indexOf(opacity);
  return INFO_OPACITIES[(index + 1) % INFO_OPACITIES.length]!;
}

/**
 * Eine Option weiterschalten — ein Häkchen kippt, die Deckkraft geht eine
 * Raste weiter. Gibt einen neuen Stand zurück und lässt den alten stehen.
 */
export function toggleInfoOption(options: InfoViewOptions, option: InfoOption): InfoViewOptions {
  if (option === 'opacity') return { ...options, opacity: nextInfoOpacity(options.opacity) };
  return { ...options, [option]: !options[option] };
}

/**
 * **Was eine Ansicht gerade zeigt**, als Zeile — nur die Abweichungen, wie in
 * der Grafik (`graphicsSummary`): „Alles" ist der Normalfall, „2D · ohne
 * Wände · 40 %" erklärt ein Bild, in dem die Hälfte fehlt. Gezählt wird nur,
 * was die Ansicht überhaupt kennt.
 */
export function infoViewSummary(id: InfoViewId, options: InfoViewOptions): string {
  const supports = infoViewSpec(id).supports;
  const parts: string[] = [];
  if (supports.includes('flat') && options.flat) parts.push('2D');
  if (supports.includes('walls') && !options.walls) parts.push('ohne Wände');
  if (supports.includes('rooms') && !options.rooms) parts.push('ohne Räume');
  if (supports.includes('actors') && !options.actors) parts.push('ohne NPCs');
  if (supports.includes('opacity') && options.opacity !== 1) {
    parts.push(INFO_OPACITY_LABELS[options.opacity]);
  }
  return parts.length === 0 ? 'Alles' : parts.join(' · ');
}

/**
 * **Welcher Teil einer Ansicht zu sehen ist.** Jede Ansicht sortiert, was sie
 * zeichnet, in diese vier Fächer (`infoViewScene.ts`, `userData.infoPart`);
 * ein Teil ohne Fach ist immer zu sehen. `solid` ist alles, was eine Fläche
 * füllt oder in die Höhe geht — das, was „Nur 2D-Pfad" weglässt.
 */
export type InfoPart = 'walls' | 'rooms' | 'actors' | 'solid';

export function infoPartVisible(
  options: InfoViewOptions,
  part: InfoPart | readonly InfoPart[] | undefined,
): boolean {
  if (Array.isArray(part)) return part.every((one: InfoPart) => infoPartVisible(options, one));
  if (part === 'walls') return options.walls;
  if (part === 'rooms') return options.rooms;
  if (part === 'actors') return options.actors;
  if (part === 'solid') return !options.flat;
  return true;
}

// --- der Speicher ------------------------------------------------------------

const KEY = 'bgvr.infoViews';

type Listener = () => void;
const listeners = new Set<Listener>();
/**
 * Zählt jede Änderung. Eine Ansicht merkt sich die Zahl, bei der sie zuletzt
 * angewandt hat, und fasst ihre Materialien nur an, wenn sie sich bewegt hat —
 * sonst liefe jedes Bild eine Baumwanderung für nichts.
 */
let version = 1;
let cache: InfoViewSettings | null = null;

export function onInfoViewsChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function infoViewsVersion(): number {
  return version;
}

export function infoViews(): InfoViewSettings {
  if (cache) return cache;
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    cache = clampInfoViews(raw ? JSON.parse(raw) : null);
  } catch {
    cache = defaultInfoViews();
  }
  return cache;
}

export function infoView(id: InfoViewId): InfoViewOptions {
  return infoViews()[id];
}

/** Speichert eine Ansicht und gibt zurück, was davon angekommen ist. */
export function saveInfoView(id: InfoViewId, patch: Partial<InfoViewOptions>): InfoViewOptions {
  const next = { ...infoViews(), [id]: clampInfoView({ ...infoViews()[id], ...patch }) };
  cache = next;
  version++;
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* privater Modus — es gilt trotzdem bis zum Neuladen */
  }
  for (const listener of listeners) listener();
  return next[id];
}

/** Alle Ansichten zurück auf den Auslieferungszustand. */
export function resetInfoViews(): void {
  for (const id of INFO_VIEW_IDS) saveInfoView(id, DEFAULT_INFO_VIEW);
}

/** Nur für Tests: den Zwischenspeicher vergessen, damit neu gelesen wird. */
export function forgetInfoViewCache(): void {
  cache = null;
  version++;
}
