/**
 * **Die Liste der Weltänderungen** — was jemand umgestellt hat, als Text zum
 * Mitnehmen.
 *
 * Gewünscht war sie so: ein Menü _Weltänderungen_, darin ein Häkchen, dass
 * Änderungen mitgeschrieben werden, und darunter _Kopieren_ und _Einfügen_ —
 * „dann kann ich dir Änderungen leichter mitteilen, ggf. muss ja nur Position
 * und Gegenstand gespeichert werden." Genau das steht hier: **welches Ding,
 * von wo, wohin**, und sonst nichts.
 *
 * **Eine Bilanz und kein Protokoll.** Wer den Herd dreimal umstellt, hat ihn
 * einmal umgestellt — von dort, wo er vorher stand, nach dort, wo er jetzt
 * steht. Ein Protokoll mit drei Zeilen müsste der Leser selbst zusammenrechnen,
 * und wer einen Herd an seinen alten Platz zurückstellt, hat gar nichts
 * geändert: Dann verschwindet die Zeile wieder (`recordFurniture`).
 *
 * **Zwei Sorten, weil es zwei Sorten Umstellen gibt:**
 *
 * - **Möbel der Küche** stehen auf Kacheln und schauen in eine von vier
 *   Richtungen. Ihre Lage ist deshalb `[x, z, Drehung]` in Kacheln **relativ
 *   zur Küche** — genau die Zahlen, die im Aufbau stehen
 *   (`test/zones/kitchenPlan.KITCHEN_SPOTS`). Was hier herauskommt, lässt sich
 *   dort ohne Umrechnen eintragen.
 * - **Modelle aus dem Regal** stehen irgendwo in der Welt; ihre Lage ist ein
 *   Punkt in Weltmetern und eine Drehung in Grad.
 *
 * **Gespeichert wird im Browser**, anders als der Spielmodus nebenan
 * (`core/gameMode.ts`): Eine Liste, die beim Neuladen verschwindet, bevor man
 * sie kopiert hat, ist eine halbe Stunde Einrichten, die niemand mehr
 * nachvollziehen kann.
 */

/** Wo ein Möbel steht: Kachel und Viertelumdrehungen, relativ zur Küche. */
export interface TilePose {
  readonly x: number;
  readonly z: number;
  readonly turn: number;
}

/** Ein Möbel der Küche, das umgestellt wurde — oder neu dazugekommen ist. */
export interface FurnitureChange {
  readonly kind: 'furniture';
  /** Der Name im Katalog der Küche (`core/kitchenFit.KITCHEN_PIECES`). */
  readonly piece: string;
  /** Wo es vorher stand — `null`, wenn es aus dem Katalog neu kam. */
  readonly from: TilePose | null;
  readonly to: TilePose;
}

/** Ein Modell aus dem Regal, das irgendwo hingestellt wurde. */
export interface ModelChange {
  readonly kind: 'model';
  /** Die Adresse im Regal, z. B. `block-bits/barrel.glb`. */
  readonly path: string;
  /** Der Punkt in Weltmetern. */
  readonly at: { readonly x: number; readonly y: number; readonly z: number };
  /** Die Drehung um die Hochachse in Grad. */
  readonly yaw: number;
}

export type WorldChange = FurnitureChange | ModelChange;

const KEY = 'vr-weltaenderungen';

let tracking = false;
const changes = new Map<string, WorldChange>();
const listeners = new Set<() => void>();
let loaded = false;

/**
 * **Ein Schlüssel je Ding, der auch nach dem Neuladen nicht wiederkommt.**
 *
 * Ein Zähler allein finge nach dem Neuladen wieder bei eins an, und das
 * erste Möbel der neuen Sitzung überschriebe die Zeile des ersten Möbels der
 * alten — zwei verschiedene Herde unter einem Namen. Der Zeitstempel davor
 * trennt die Sitzungen.
 */
const SESSION = Date.now().toString(36);
let counter = 0;

/** Ein neuer Schlüssel für ein Ding, das mitgeschrieben werden will. */
export function changeKey(prefix: string): string {
  counter += 1;
  return `${prefix}:${SESSION}:${counter}`;
}

/** Ob gerade mitgeschrieben wird. */
export function trackingChanges(): boolean {
  load();
  return tracking;
}

/** Mitschreiben an oder aus — die Liste bleibt dabei, wie sie ist. */
export function setTrackingChanges(on: boolean): void {
  load();
  if (tracking === on) return;
  tracking = on;
  save();
}

/** Alles, was bisher mitgeschrieben wurde — in der Reihenfolge des ersten Mals. */
export function worldChanges(): WorldChange[] {
  load();
  return [...changes.values()];
}

/** Die Liste leeren. Das Häkchen bleibt, wie es ist. */
export function clearWorldChanges(): void {
  load();
  if (!changes.size) return;
  changes.clear();
  save();
}

/** Zuhören, wenn sich die Liste ändert — zurück kommt das Abmelden. */
export function onWorldChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function samePose(a: TilePose | null, b: TilePose): boolean {
  return a !== null && a.x === b.x && a.z === b.z && (a.turn - b.turn) % 4 === 0;
}

/**
 * **Ein Möbel ist umgestellt worden.**
 *
 * Beim ersten Mal zählt `from`, danach nur noch `to`: Wo es **vor** allem
 * Umstellen stand, weiß nur die erste Meldung. Landet es wieder dort, ist
 * nichts geändert, und die Zeile geht.
 *
 * @param key  derselbe Schlüssel für dasselbe Möbel (`changeKey`)
 * @param from wo es vorher stand — `null` für ein Stück frisch aus dem Katalog
 */
export function recordFurniture(
  key: string,
  piece: string,
  from: TilePose | null,
  to: TilePose,
): void {
  load();
  if (!tracking) return;
  const was = changes.get(key);
  const start = was?.kind === 'furniture' ? was.from : from;
  if (samePose(start, to)) changes.delete(key);
  else changes.set(key, { kind: 'furniture', piece, from: start, to: { ...to } });
  save();
}

/** **Ein Modell aus dem Regal ist hingestellt worden** — oder noch einmal umgestellt. */
export function recordModel(
  key: string,
  path: string,
  at: { x: number; y: number; z: number },
  yaw: number,
): void {
  load();
  if (!tracking) return;
  changes.set(key, {
    kind: 'model',
    path,
    at: { x: round(at.x), y: round(at.y), z: round(at.z) },
    yaw: Math.round(yaw),
  });
  save();
}

/**
 * **Die Zeile eines Dings streichen** — es ist abgerissen worden
 * (`core/craneBomb.ts`). Ein Modell, das erst hingestellt und dann wieder
 * abgerissen wurde, hat an der Welt nichts geändert.
 */
export function forgetChange(key: string): void {
  load();
  if (!tracking || !changes.delete(key)) return;
  save();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// --- als Text -----------------------------------------------------------------

/**
 * **Die Liste als Text** — eine Kopfzeile für Menschen, darunter JSON.
 *
 * Eine Zeile je Änderung und nicht ein eingerückter Baum: So liest man sie im
 * Chat, und jede Zeile ist für sich verständlich. Die Lage steht als kurze
 * Liste (`[x, z, Drehung]`) und nicht als Objekt mit drei Schlüsseln — bei
 * zwanzig Möbeln ist das der Unterschied zwischen einer Seite und dreien.
 */
export function formatChanges(list: readonly WorldChange[]): string {
  // Dieselbe Zeile wie im Speicher (`toRow`): ein Format und nicht zwei.
  const rows = list.map((change) => JSON.stringify(toRow(change)));
  const head =
    `Weltänderungen · ${list.length} · ` +
    'kitchen: [x, z, Drehung] in Kacheln relativ zur Küche (wie KITCHEN_SPOTS, Drehung 0=N 1=W 2=S 3=O) · ' +
    'model: [x, y, z] in Weltmetern, yaw in Grad';
  return `${head}\n[\n${rows.join(',\n')}\n]`;
}

/**
 * **Und zurück** — aus einem kopierten Text die Liste, oder `null`, wenn
 * darin keine steht.
 *
 * Die Kopfzeile darf dabei sein oder fehlen, und was davor oder dahinter im
 * Chat stand, auch: Gelesen wird von der ersten eckigen Klammer bis zur
 * letzten. Einträge, die nicht passen, fallen einzeln heraus, statt die ganze
 * Liste zu verwerfen.
 */
export function parseChanges(text: string): WorldChange[] | null {
  // Die erste Klammer, hinter der eine Zeile anfängt — und nicht die aus der
  // Kopfzeile, in der `[x, z, Drehung]` steht.
  const open = text.search(/\[\s*[{\]]/);
  const close = text.lastIndexOf(']');
  if (open < 0 || close <= open) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(open, close + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(raw)) return null;
  const out: WorldChange[] = [];
  for (const row of raw) {
    const change = parseRow(row);
    if (change) out.push(change);
  }
  return out;
}

function parseRow(row: unknown): WorldChange | null {
  if (!row || typeof row !== 'object') return null;
  const data = row as Record<string, unknown>;
  if (typeof data.kitchen === 'string') {
    const to = tilePose(data.to);
    if (!to) return null;
    const from = data.from === null || data.from === undefined ? null : tilePose(data.from);
    if (data.from !== null && data.from !== undefined && !from) return null;
    return { kind: 'furniture', piece: data.kitchen, from, to };
  }
  if (typeof data.model === 'string') {
    const at = numbers(data.at, 3);
    if (!at) return null;
    const yaw = typeof data.yaw === 'number' && Number.isFinite(data.yaw) ? data.yaw : 0;
    return { kind: 'model', path: data.model, at: { x: at[0]!, y: at[1]!, z: at[2]! }, yaw };
  }
  return null;
}

function tilePose(value: unknown): TilePose | null {
  const list = numbers(value, 3);
  if (!list || !list.every(Number.isInteger)) return null;
  return { x: list[0]!, z: list[1]!, turn: ((list[2]! % 4) + 4) % 4 };
}

function numbers(value: unknown, count: number): number[] | null {
  if (!Array.isArray(value) || value.length !== count) return null;
  if (!value.every((one) => typeof one === 'number' && Number.isFinite(one))) return null;
  return value as number[];
}

// --- Speicher -----------------------------------------------------------------

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as { on?: unknown; list?: unknown };
    tracking = data.on === true;
    if (!Array.isArray(data.list)) return;
    for (const entry of data.list) {
      if (!Array.isArray(entry) || typeof entry[0] !== 'string') continue;
      const change = parseRow(entry[1]);
      if (change) changes.set(entry[0], change);
    }
  } catch {
    /* kaputt oder gesperrt — dann eben leer */
  }
}

function save(): void {
  try {
    const list = [...changes.entries()].map(([key, change]) => [key, toRow(change)]);
    globalThis.localStorage?.setItem(KEY, JSON.stringify({ on: tracking, list }));
  } catch {
    /* privater Modus — dann gilt die Liste nur bis zum Neuladen */
  }
  for (const listener of listeners) listener();
}

function toRow(change: WorldChange): unknown {
  return change.kind === 'furniture'
    ? {
        kitchen: change.piece,
        from: change.from ? [change.from.x, change.from.z, change.from.turn] : null,
        to: [change.to.x, change.to.z, change.to.turn],
      }
    : { model: change.path, at: [change.at.x, change.at.y, change.at.z], yaw: change.yaw };
}

/** Nur für Tests: alles auf Anfang, als wäre die Seite frisch geladen. */
export function resetWorldChangesForTest(): void {
  tracking = false;
  changes.clear();
  loaded = false;
  counter = 0;
}
