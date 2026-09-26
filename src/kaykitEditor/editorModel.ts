/**
 * **Der KayKit-Editor, ohne Bild** — was eingestellt ist, welche Zellen das
 * belegt, was sich geändert hat und was am Ende herausgeht.
 *
 * Gewünscht: _„bei Space Station [haben] die Objekte zum Teil zu große Boxen,
 * an denen ein Spieler nicht laufen kann, oder [sind] nicht korrekt
 * positioniert (also verbrauchen eigentlich nur 1×1 Feld, sind aber mittig
 * positioniert, wodurch die dann 2×2 verbrauchen)."_ Die Seite
 * (`kaykit-editor.html`, `main.ts`) zeigt ein Element von oben auf dem
 * Zellgitter; hier steht die Rechnung dazu, ohne three.js und deshalb geprüft
 * (`editorModel.test.ts`).
 *
 * Gesperrt wird nach **derselben Regel wie im Spiel**: jede Zelle, in die die
 * Grundfläche mindestens 15 cm hineinragt (`nav/cellGrid.boxCells`,
 * `map/stationCells.FIXTURE_OVERLAP`). Was der Editor rot zeigt, sperrt also
 * auch die Station — vorausgesetzt, die Grundfläche wird übernommen.
 */
import { boxCells, CELL } from '../worlds/nav/cellGrid';
import {
  CARGO_SIZE,
  CONSOLE_SIZE,
  FIXTURE_CATALOG,
  LOCKER_SIZE,
  type FixtureSize,
} from '../worlds/haunting/fixtureDimensions';
import type { MarkId } from '../worlds/haunting/house';

/** So weit muss eine Grundfläche in eine Zelle ragen, damit sie sie sperrt — wie im Spiel. */
export const OVERLAP = 0.15;

/** Ein Element, das der Editor kennt: ein Modell aus dem Regal und, wenn es eine hat, seine Stellfläche. */
export interface EditorElement {
  /** Der Schlüssel in der Ausgabe — bei der Station das Kennzeichen (`MarkId`, `locker`, …). */
  readonly id: string;
  readonly label: string;
  /** Die Adresse unter `models/kaykit/`. */
  readonly path: string;
  /**
   * Die Stellfläche, in die das Spiel das Modell heute einpasst
   * (`stationProps.fitProp`), oder `null` für ein Modell, das so bleibt, wie
   * das Regal es liefert.
   */
  readonly fit: FixtureSize | null;
  /** Ob das Spiel jede Achse für sich streckt (Spinde) statt gleichmäßig zu skalieren. */
  readonly stretch: boolean;
}

/**
 * **Die Einrichtung der Raumstation** — dieselben Paare aus Kennzeichen und
 * Modell wie `world3d/stationProps.FIXTURE_MODELS`. Abgeschrieben und nicht
 * importiert, weil jene Datei three.js mitbringt; `editorModel.test.ts` hält
 * beide Listen gleich.
 */
const STATION: ReadonlyArray<readonly [MarkId, string, string]> = [
  ['wanne', 'Kryokapsel (Liege)', 'furniture-bits/bed_single_B.glb'],
  ['dusche', 'Dekontamination (Wassertank)', 'space-base-bits/water_storage.glb'],
  ['ofen', 'Nährstoffdrucker (Ofen)', 'restaurant-bits/oven.glb'],
  ['spuele', 'Wasseraufbereitung (Spüle)', 'restaurant-bits/kitchencounter_sink.glb'],
  ['bett', 'Schlafkoje (Stockbett)', 'dungeon/bed_A_stacked.glb'],
  ['buecher', 'Serverrack (Regal)', 'furniture-bits/shelf_B_large_decorated.glb'],
  ['werkbank', 'Antriebskern (Werkbank)', 'prototype-bits/Workbench_Decorated.glb'],
  ['klavier', 'Kommunikation (Schreibtisch)', 'furniture-bits/desk_decorated.glb'],
  ['kamin', 'Reaktor (Container)', 'space-base-bits/containers_C.glb'],
  ['standuhr', 'Sauerstofftank (Fass)', 'resource-bits/Fuel_A_Barrel.glb'],
  ['sessel', 'Pilotensitz (Sessel)', 'furniture-bits/armchair.glb'],
  ['kiste', 'Frachtcontainer (Fracht)', 'space-base-bits/cargo_A_stacked.glb'],
  ['schaukelpferd', 'Probenkammer (Kühlschrank)', 'restaurant-bits/fridge_B.glb'],
  ['esstisch', 'Hydroponik (Farm)', 'space-base-bits/space_farm_small.glb'],
  ['ausgabe', 'Kantinenausgabe (Herdzeile)', 'restaurant-bits/stove_multi_decorated.glb'],
];

/** Die Station: fünfzehn Geräte, dazu Schutzschrank, Frachtschrank und Konsole. */
export const STATION_ELEMENTS: readonly EditorElement[] = [
  ...STATION.map(([id, label, path]) => ({
    id,
    label,
    path,
    fit: FIXTURE_CATALOG[id],
    stretch: false,
  })),
  {
    id: 'locker',
    label: 'Schutzschrank (Spind)',
    path: 'prototype-bits/Locker.glb',
    fit: LOCKER_SIZE,
    stretch: true,
  },
  {
    id: 'cargo',
    label: 'Frachtschrank (Spind, verziert)',
    path: 'prototype-bits/Locker_Decorated.glb',
    fit: CARGO_SIZE,
    stretch: true,
  },
  {
    id: 'console',
    label: 'Reparaturkonsole (Schreibtisch)',
    path: 'furniture-bits/desk.glb',
    // `ShipExperience` passt den Unterbau kleiner ein als die Stellfläche
    // (`CONSOLE_SIZE`) — der Bildschirm steht darüber.
    fit: { width: 1.18, height: 0.8, depth: 0.5 },
    stretch: false,
  },
];

/** Ein Modell, das nicht zur Station gehört — so, wie das Regal es liefert. */
export function customElement(path: string): EditorElement {
  const name = path.split('/').pop() ?? path;
  return {
    id: `kaykit:${path}`,
    label: name.replace(/\.(glb|gltf)$/i, ''),
    path,
    fit: null,
    stretch: false,
  };
}

/** Die Stellfläche des Spiels für ein Element — für die Konsole die ganze, nicht nur der Unterbau. */
export function gameFootprint(element: EditorElement): FixtureSize | null {
  if (element.id === 'console') return CONSOLE_SIZE;
  return element.fit;
}

/** Was je Element eingestellt ist. */
export interface ElementTune {
  /** Faktor auf das, was das Spiel heute daraus macht — 1 ist unverändert. */
  scale: number;
  /** Verschiebung in Metern gegenüber der Kachelmitte, nach Osten (+x). */
  offsetX: number;
  /** Verschiebung in Metern gegenüber der Kachelmitte, von oben gesehen nach unten (+z). */
  offsetZ: number;
  /** Drehung um die Hochachse in Grad, in Vierteln. */
  yaw: number;
}

export type TuneField = keyof ElementTune;

export const DEFAULT_TUNE: Readonly<ElementTune> = { scale: 1, offsetX: 0, offsetZ: 0, yaw: 0 };

export const SCALE_MIN = 0.1;
export const SCALE_MAX = 3;
/** So weit lässt sich verschieben, in jede Richtung. */
export const OFFSET_MAX = 2;

/** Ein Wert in seinen Grenzen und auf ein Raster gerundet, das sich abschreiben lässt. */
export function clampTune(field: TuneField, value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_TUNE[field];
  switch (field) {
    case 'scale':
      return round(Math.min(SCALE_MAX, Math.max(SCALE_MIN, value)), 3);
    case 'yaw':
      return (((Math.round(value / 90) * 90) % 360) + 360) % 360;
    default:
      return round(Math.min(OFFSET_MAX, Math.max(-OFFSET_MAX, value)), 3);
  }
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  const out = Math.round(value * f) / f;
  return Object.is(out, -0) ? 0 : out;
}

/** Ob ein Element gegenüber dem Spiel verändert ist. */
export function isChanged(tune: ElementTune): boolean {
  return (Object.keys(DEFAULT_TUNE) as TuneField[]).some((k) => tune[k] !== DEFAULT_TUNE[k]);
}

/** Ein Rechteck auf dem Boden, in Metern. */
export interface FloorBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * **Wo der Editor das Element hinstellt** — auf die Mitte einer Kachel, also
 * genau auf eine Ecke von vier Zellen. Dort steht ein kleines Ding „mittig"
 * und nimmt alle vier; eine Verschiebung um eine Viertelkachel setzt es in
 * eine einzige.
 */
export const ANCHOR = { x: 0.5, z: 0.5 } as const;

/** Die belegten Zellen einer Grundfläche, nach der Regel des Spiels. */
export function occupiedCells(box: FloorBox): Array<{ ix: number; iz: number }> {
  return boxCells(box, OVERLAP);
}

/** Wie viele Zellen eine Grundfläche in jeder Richtung und insgesamt belegt. */
export function cellSpan(box: FloorBox): { x: number; z: number; count: number } {
  const cells = occupiedCells(box);
  if (cells.length === 0) return { x: 0, z: 0, count: 0 };
  const xs = new Set(cells.map((c) => c.ix));
  const zs = new Set(cells.map((c) => c.iz));
  return { x: xs.size, z: zs.size, count: cells.length };
}

/** Eine Stellfläche um einen Punkt, gedreht in Vierteln — so rechnet auch `stationLayout`. */
export function footprintBox(
  size: { width: number; depth: number },
  at: { x: number; z: number },
  yaw = 0,
): FloorBox {
  const turned = Math.round(yaw / 90) % 2 !== 0;
  const w = turned ? size.depth : size.width;
  const d = turned ? size.width : size.depth;
  return { minX: at.x - w / 2, maxX: at.x + w / 2, minZ: at.z - d / 2, maxZ: at.z + d / 2 };
}

/** Eine Änderung im Protokoll. */
export interface ChangeEntry {
  /** Zeitpunkt als ISO-Zeichenkette. */
  at: string;
  id: string;
  field: TuneField | 'reset';
  from: number | null;
  to: number | null;
}

/** Zwei Änderungen am selben Regler in so kurzer Zeit sind ein Zug, kein zweiter Eintrag. */
export const MERGE_MS = 1500;
/** So viele Einträge hält das Protokoll höchstens. */
export const LOG_LIMIT = 1000;

/** Was der Editor sich merkt — über ein Neuladen hinweg. */
export interface EditorState {
  version: 1;
  /** Das gerade gezeigte Element. */
  current: string;
  /** Die eigenen Modelle, die dazugenommen wurden (Adressen). */
  custom: string[];
  tunes: Record<string, ElementTune>;
  /** Die zuletzt gemessene Grundfläche des Modells je Element, in Metern. */
  measured: Record<string, { width: number; depth: number; height: number }>;
  log: ChangeEntry[];
}

export function emptyState(): EditorState {
  return {
    version: 1,
    current: STATION_ELEMENTS[0]!.id,
    custom: [],
    tunes: {},
    measured: {},
    log: [],
  };
}

export function tuneOf(state: EditorState, id: string): ElementTune {
  return { ...DEFAULT_TUNE, ...state.tunes[id] };
}

/** Ein Wert ändern — und ins Protokoll schreiben. Gibt zurück, ob sich etwas geändert hat. */
export function setTune(
  state: EditorState,
  id: string,
  field: TuneField,
  value: number,
  now = Date.now(),
): boolean {
  const tune = tuneOf(state, id);
  const next = clampTune(field, value);
  if (tune[field] === next) return false;
  const from = tune[field];
  tune[field] = next;
  if (isChanged(tune)) state.tunes[id] = tune;
  else delete state.tunes[id];
  const last = state.log[state.log.length - 1];
  if (last && last.id === id && last.field === field && now - Date.parse(last.at) <= MERGE_MS) {
    last.to = next;
    last.at = new Date(now).toISOString();
    if (last.from === last.to) state.log.pop();
  } else {
    state.log.push({ at: new Date(now).toISOString(), id, field, from, to: next });
  }
  if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
  return true;
}

/** Ein Element auf den Stand des Spiels zurück. */
export function resetTune(state: EditorState, id: string, now = Date.now()): boolean {
  if (!state.tunes[id]) return false;
  delete state.tunes[id];
  state.log.push({ at: new Date(now).toISOString(), id, field: 'reset', from: null, to: null });
  return true;
}

/** Alle Elemente, die der Editor gerade kennt: die Station, dann die eigenen. */
export function allElements(state: EditorState): EditorElement[] {
  return [...STATION_ELEMENTS, ...state.custom.map(customElement)];
}

export function elementById(state: EditorState, id: string): EditorElement | null {
  return allElements(state).find((e) => e.id === id) ?? null;
}

/** Ein Element in der Ausgabe. */
export interface ExportedElement {
  id: string;
  label: string;
  path: string;
  scale: number;
  offsetX: number;
  offsetZ: number;
  yaw: number;
  /** Die Stellfläche, in die das Spiel heute einpasst — `null` für ein Modell ohne. */
  gameFit: FixtureSize | null;
  /** Das Modell, so wie es mit dieser Einstellung dasteht, in Metern. */
  model: { width: number; depth: number; height: number } | null;
  /** Belegte Zellen mit dieser Einstellung (Mitte auf `ANCHOR` + Verschiebung). */
  cells: { x: number; z: number; count: number } | null;
  /** Belegte Zellen der heutigen Stellfläche des Spiels, auf `ANCHOR`. */
  gameCells: { x: number; z: number; count: number } | null;
}

function round3(value: number): number {
  return round(value, 3);
}

/** Wo das Modell mit dieser Einstellung steht — seine Grundfläche in Weltmetern. */
export function tunedBox(measured: { width: number; depth: number }, tune: ElementTune): FloorBox {
  return footprintBox(
    measured,
    { x: ANCHOR.x + tune.offsetX, z: ANCHOR.z + tune.offsetZ },
    tune.yaw,
  );
}

/**
 * **Was an Claude geht** — jedes veränderte Element mit seiner Einstellung,
 * dem gemessenen Modell und den Zellen, die es damit belegt, und dazu das
 * Protokoll aller Änderungen.
 *
 * `measured` ist die Grundfläche des Modells **mit** Faktor und ohne Drehung
 * (so misst die Seite); die Zellen rechnet diese Funktion selbst.
 */
export function exportState(state: EditorState, all = false): string {
  const elements: ExportedElement[] = [];
  for (const element of allElements(state)) {
    const tune = tuneOf(state, element.id);
    if (!all && !isChanged(tune)) continue;
    const measured = state.measured[element.id] ?? null;
    const game = gameFootprint(element);
    elements.push({
      id: element.id,
      label: element.label,
      path: element.path,
      scale: tune.scale,
      offsetX: tune.offsetX,
      offsetZ: tune.offsetZ,
      yaw: tune.yaw,
      gameFit: element.fit,
      model: measured
        ? {
            width: round3(measured.width),
            depth: round3(measured.depth),
            height: round3(measured.height),
          }
        : null,
      cells: measured ? cellSpan(tunedBox(measured, tune)) : null,
      gameCells: game ? cellSpan(footprintBox(game, ANCHOR)) : null,
    });
  }
  return JSON.stringify(
    {
      tool: 'kaykit-editor',
      version: 1,
      note:
        'scale: Faktor auf die heutige Einpassung (fitProp). offsetX/offsetZ: Meter gegenüber der ' +
        `Kachelmitte, Zelle = ${CELL} m. cells: belegte Zellen mit ${OVERLAP} m Überstand.`,
      elements,
      log: state.log,
    },
    null,
    2,
  );
}

/** Einen gespeicherten Stand lesen — alles, was nicht passt, fällt auf den Anfang zurück. */
export function parseState(raw: string | null): EditorState {
  const state = emptyState();
  if (!raw) return state;
  try {
    const data = JSON.parse(raw) as Partial<EditorState>;
    if (!data || data.version !== 1) return state;
    if (Array.isArray(data.custom))
      state.custom = data.custom.filter((p): p is string => typeof p === 'string');
    if (data.tunes && typeof data.tunes === 'object')
      for (const [id, tune] of Object.entries(data.tunes)) {
        const clean = { ...DEFAULT_TUNE };
        for (const key of Object.keys(DEFAULT_TUNE) as TuneField[])
          clean[key] = clampTune(
            key,
            Number((tune as Partial<ElementTune>)?.[key] ?? DEFAULT_TUNE[key]),
          );
        if (isChanged(clean)) state.tunes[id] = clean;
      }
    if (data.measured && typeof data.measured === 'object') state.measured = data.measured;
    if (Array.isArray(data.log)) state.log = data.log.slice(-LOG_LIMIT);
    if (typeof data.current === 'string' && elementById(state, data.current))
      state.current = data.current;
  } catch {
    return emptyState();
  }
  return state;
}
