/**
 * **Die 2D-Welt als Daten** — Kacheln in Ebenen, sonst nichts.
 *
 * Das hier ist die Wahrheit, aus der später alles andere folgt. Eine Welt ist
 * ein Raster aus Kacheln, `cols` breit und `rows` hoch, und auf diesem Raster
 * liegen **Ebenen** übereinander: der Boden, die Dinge darauf, und was über
 * dem Kopf hängt. Jede Ebene ist eine Liste von Kachel-Kennungen, Zeile für
 * Zeile, `0` heißt leer. Was eine Kennung ist — Gras, Wasser, Mauer, Baum —,
 * sagt der Katalog (`tiles.ts`), und ob man hindurchkann, steht dort auch.
 *
 * **Eine Kachel ist ein Meter.** Das ist die Brücke in die 3D-Welt: Spalte
 * und Zeile hier sind x und z dort, und eine Mauer, die hier steht, steht
 * dort an derselben Stelle. Gezeichnet wird sie in Bildpunkten (`TILE_PX`),
 * gerechnet in Metern (`TILE_M`) — wer die beiden verwechselt, bekommt eine
 * Welt, in der man sechzehnmal so schnell läuft wie geplant.
 *
 * Kein Phaser, kein DOM: Diese Datei lässt sich ohne Browser lesen, prüfen
 * und in eine Datei schreiben. Der Editor ändert sie, Phaser zeichnet sie,
 * und die 3D-Welt wird sie eines Tages lesen.
 */

/** Bildpunkte je Kachel — der Maßstab der Vorlage: sechzehn, wie auf dem SNES. */
export const TILE_PX = 16;
/** Meter je Kachel — die Brücke zur 3D-Welt. */
export const TILE_M = 1;

/** Eine Kachel-Kennung; `0` ist die leere Zelle. */
export type TileId = number;

/**
 * Was eine Ebene ist — und damit, wo sie im Bild liegt.
 *
 * - `ground`: der Boden. Liegt unter allem, man geht darauf.
 * - `objects`: was auf dem Boden steht. Bäume, Mauern, Kisten — hier wohnt
 *   die Kollision, und der Held läuft dazwischen.
 * - `overlay`: was über dem Kopf hängt. Baumkronen, Dächer, Brückengeländer —
 *   der Held verschwindet darunter, statt darüber zu laufen.
 */
export type LayerKind = 'ground' | 'objects' | 'overlay';

export interface LayerData {
  id: string;
  name: string;
  kind: LayerKind;
  visible: boolean;
  /** `cols × rows` Kennungen, Zeile für Zeile. */
  tiles: TileId[];
}

export interface Level {
  /** Die Welt, zu der dieser Plan gehört (`worlds/index.ts`). */
  id: string;
  name: string;
  cols: number;
  rows: number;
  /** Wo der Held anfängt, in Kacheln. */
  spawn: { col: number; row: number };
  /** Von unten nach oben. */
  layers: LayerData[];
}

/** Das Dateiformat, mit Fassung — damit eine alte Datei erkannt wird. */
export const LEVEL_FORMAT = 'baumgartner-level2d';
export const LEVEL_VERSION = '0.1.0';

/** Wo ein Plan im Browser liegt, je Welt. */
export const LEVEL_STORAGE = 'bgvr.level2d.v1';

/** Die drei Ebenen, mit denen jede Welt anfängt. */
export const DEFAULT_LAYERS: ReadonlyArray<Pick<LayerData, 'id' | 'name' | 'kind'>> = [
  { id: 'ground', name: 'Boden', kind: 'ground' },
  { id: 'objects', name: 'Dinge', kind: 'objects' },
  { id: 'overlay', name: 'Darüber', kind: 'overlay' },
];

export function emptyLayer(
  spec: Pick<LayerData, 'id' | 'name' | 'kind'>,
  cells: number,
): LayerData {
  return { ...spec, visible: true, tiles: new Array<TileId>(cells).fill(0) };
}

export function emptyLevel(id: string, name: string, cols: number, rows: number): Level {
  return {
    id,
    name,
    cols,
    rows,
    spawn: { col: Math.floor(cols / 2), row: Math.floor(rows / 2) },
    layers: DEFAULT_LAYERS.map((spec) => emptyLayer(spec, cols * rows)),
  };
}

export function inside(level: Pick<Level, 'cols' | 'rows'>, col: number, row: number): boolean {
  return col >= 0 && row >= 0 && col < level.cols && row < level.rows;
}

export function tileAt(level: Level, layer: LayerData, col: number, row: number): TileId {
  if (!inside(level, col, row)) return 0;
  return layer.tiles[row * level.cols + col] ?? 0;
}

/** Setzt eine Kachel und sagt, ob sich etwas geändert hat. */
export function setTile(
  level: Level,
  layer: LayerData,
  col: number,
  row: number,
  tile: TileId,
): boolean {
  if (!inside(level, col, row)) return false;
  const at = row * level.cols + col;
  if (layer.tiles[at] === tile) return false;
  layer.tiles[at] = tile;
  return true;
}

export function layerOf(level: Level, id: string): LayerData | undefined {
  return level.layers.find((layer) => layer.id === id);
}

/**
 * **Ob man auf diese Zelle darf.** Fest ist, was auf irgendeiner sichtbaren
 * Ebene fest ist — eine unsichtbar geschaltete Mauer hält niemanden auf,
 * das ist genau der Sinn des Ausblendens im Editor.
 *
 * @param solid welche Kennungen fest sind (`tiles.ts`).
 */
export function isSolidAt(
  level: Level,
  solid: ReadonlySet<TileId>,
  col: number,
  row: number,
): boolean {
  if (!inside(level, col, row)) return true;
  for (const layer of level.layers) {
    if (!layer.visible) continue;
    if (solid.has(tileAt(level, layer, col, row))) return true;
  }
  return false;
}

// --- Speichern und Laden ----------------------------------------------------

export function serializeLevel(level: Level): string {
  return JSON.stringify({ format: LEVEL_FORMAT, version: LEVEL_VERSION, level }, null, 0);
}

/**
 * Aus fremdem Text einen Plan — oder `null`, wenn es keiner ist. Geprüft
 * wird, was einen Absturz bedeuten würde: Maße, Ebenen, die Länge jeder
 * Kachelliste. Was fehlt, wird ergänzt; was zu lang ist, wird gekürzt.
 */
export function parseLevel(text: string): Level | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const bag = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
  const level = bag?.['format'] === LEVEL_FORMAT ? bag['level'] : (bag?.['level'] ?? bag);
  if (!level || typeof level !== 'object') return null;
  const data = level as Record<string, unknown>;
  const cols = Number(data['cols']);
  const rows = Number(data['rows']);
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1) return null;
  if (cols > 512 || rows > 512) return null;
  const cells = cols * rows;
  const layersRaw = Array.isArray(data['layers']) ? (data['layers'] as unknown[]) : [];
  const layers: LayerData[] = [];
  for (const entry of layersRaw) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    const kind = item['kind'];
    if (kind !== 'ground' && kind !== 'objects' && kind !== 'overlay') continue;
    const tiles = Array.isArray(item['tiles'])
      ? (item['tiles'] as unknown[])
          .slice(0, cells)
          .map((t) => (Number.isInteger(t) ? (t as number) : 0))
      : [];
    while (tiles.length < cells) tiles.push(0);
    layers.push({
      id: asText(item['id'], kind),
      name: asText(item['name'], kind),
      kind,
      visible: item['visible'] !== false,
      tiles,
    });
  }
  if (layers.length === 0) return null;
  const spawnRaw = data['spawn'] as Record<string, unknown> | undefined;
  const spawn = {
    col: clampInt(Number(spawnRaw?.['col']), 0, cols - 1, Math.floor(cols / 2)),
    row: clampInt(Number(spawnRaw?.['row']), 0, rows - 1, Math.floor(rows / 2)),
  };
  return {
    id: asText(data['id'], 'level'),
    name: asText(data['name'], 'Level'),
    cols,
    rows,
    spawn,
    layers,
  };
}

/** Eine Zeichenkette aus fremdem Text — oder der Ersatz, wenn es keine ist. */
function asText(value: unknown, spare: string): string {
  return typeof value === 'string' && value.length > 0 ? value : spare;
}

function clampInt(value: number, min: number, max: number, spare: number): number {
  if (!Number.isFinite(value)) return spare;
  return Math.min(max, Math.max(min, Math.round(value)));
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storage(): Store | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Der gemerkte Plan einer Welt, oder `null`. */
export function loadLevel(worldId: string, store: Store | null = storage()): Level | null {
  try {
    const raw = store?.getItem(`${LEVEL_STORAGE}.${worldId}`);
    return raw ? parseLevel(raw) : null;
  } catch {
    return null;
  }
}

export function saveLevel(level: Level, store: Store | null = storage()): void {
  try {
    store?.setItem(`${LEVEL_STORAGE}.${level.id}`, serializeLevel(level));
  } catch {
    // Privater Modus, voller Speicher: dann lebt der Plan nur bis zum Neuladen.
  }
}

export function forgetLevel(worldId: string, store: Store | null = storage()): void {
  try {
    store?.removeItem(`${LEVEL_STORAGE}.${worldId}`);
  } catch {
    /* siehe oben */
  }
}
