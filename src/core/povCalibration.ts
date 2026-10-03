/**
 * **VR-POV kalibrieren — die Rechnung** (`core/PovCalibrator.ts` zeichnet und
 * bedient sie). Reine Zahlen, kein three.js.
 *
 * Gewünscht: _„beim anwählen will ich dann starten mit einem rechteck welches
 * ich sehe, aber nur mit einem eckpunkt den wir anpassen können (aus diesem
 * eckpunkt wird das rechteck angezeigt (indem die anderen gespiegelt
 * werden)."_ Also liegen hier nur die Punkte **eines Viertels**: rechts oben,
 * in Grad um die gefühlte Null (`questView.GAZE_PITCH`), `az` nach rechts,
 * `el` nach oben. Die Form ist dieses Viertel, an beiden Achsen gespiegelt
 * (`fullOutline`).
 *
 * Die Punkte stehen der Reihe nach von der senkrechten Achse (oben) zur
 * waagerechten (rechts). Davor und dahinter liegt je ein Punkt auf der Achse,
 * der nicht gewählt wird: oben auf der Höhe des ersten Punkts, rechts auf der
 * Breite des letzten (`polyline`) — so bleibt die Form an den Achsen glatt.
 *
 * **Hinzufügbar ist die Mitte jeder Kante** (`items`): _„die anderen punkte,
 * welche noch hinzufügbar sind, sind immer mittig auf den linien, sodass ich
 * eine kante subdividen kann."_
 */

export interface PovPoint {
  /** Grad nach rechts, 0 bis `MAX_ANGLE`. */
  readonly az: number;
  /** Grad nach oben, 0 bis `MAX_ANGLE`. */
  readonly el: number;
}

/** Weiter als so geht kein Punkt. */
export const MAX_ANGLE = 90;

/**
 * **Der Rand der Quest 3, wie in der Brille eingestellt** (am 3. Oktober
 * 2026, `questView.QUEST_VIEW_CODE`) — damit fängt das Kalibrieren an, und
 * daraus wird das Sichtfeld (`questView.QUEST_VIEW`). Davor fing es mit
 * einem Rechteck aus einem Eckpunkt an (30° · 25°).
 */
export const START_POINTS: readonly PovPoint[] = [
  { az: 2, el: 34.5 },
  { az: 6.5, el: 35 },
  { az: 15.5, el: 35 },
  { az: 23.5, el: 32 },
  { az: 31, el: 25.5 },
  { az: 35.5, el: 17 },
  { az: 37.5, el: 9 },
  { az: 38.5, el: 1.5 },
];

/**
 * **Die Ecke des sicheren Bereichs** — ein zweites Rechteck aus einem
 * Eckpunkt, gespiegelt wie der Rand. Gewünscht: _„ein zusätzliches
 * rechteck […] als save area, aber dafür nur eine ecke, dass man sieht wo
 * der sichere Bereich ist"_. Anfangs ungefähr so weit wie der bisherige
 * sichere Bereich.
 */
export const START_SAFE: PovPoint = { az: 25, el: 20 };

/** Was eingestellt ist: der Rand und die Ecke des sicheren Bereichs. */
export interface PovConfig {
  readonly points: readonly PovPoint[];
  readonly safe: PovPoint;
}

/**
 * Ein Ding, auf dem die Auswahl stehen kann: ein Punkt, die Mitte einer
 * Kante — oder die Ecke des sicheren Bereichs (`safe`, am Ende der Reihe).
 */
export type PovItem =
  | { readonly kind: 'point'; readonly index: number; readonly at: PovPoint }
  | { readonly kind: 'add'; readonly index: number; readonly at: PovPoint }
  | { readonly kind: 'safe'; readonly index: 0; readonly at: PovPoint };

const clampAngle = (value: number): number => Math.min(MAX_ANGLE, Math.max(0, value));

/** Ein Punkt in den Grenzen. */
export function clampPoint(point: PovPoint): PovPoint {
  return { az: clampAngle(point.az), el: clampAngle(point.el) };
}

/** Das Viertel samt den beiden Punkten auf den Achsen. */
export function polyline(points: readonly PovPoint[]): PovPoint[] {
  if (points.length === 0) return [];
  return [{ az: 0, el: points[0]!.el }, ...points, { az: points[points.length - 1]!.az, el: 0 }];
}

/**
 * **Alles, was die Auswahl anlaufen kann**, der Reihe nach: Mitte der
 * ersten Kante, erster Punkt, Mitte der nächsten Kante … Mitte der letzten.
 * `index` ist bei einer Mitte die Stelle, an der ein neuer Punkt eingefügt
 * würde.
 */
export function items(points: readonly PovPoint[], safe?: PovPoint): PovItem[] {
  const line = polyline(points);
  const out: PovItem[] = [];
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    out.push({ kind: 'add', index: i, at: { az: (a.az + b.az) / 2, el: (a.el + b.el) / 2 } });
    if (i < points.length) out.push({ kind: 'point', index: i, at: points[i]! });
  }
  if (safe) out.push({ kind: 'safe', index: 0, at: safe });
  return out;
}

/** Einen Punkt an der Mitte einfügen. */
export function addPoint(points: readonly PovPoint[], item: PovItem): PovPoint[] {
  if (item.kind !== 'add') return [...points];
  const next = [...points];
  next.splice(item.index, 0, item.at);
  return next;
}

/** Einen Punkt löschen — der letzte bleibt, sonst gäbe es keine Form mehr. */
export function removePoint(points: readonly PovPoint[], index: number): PovPoint[] {
  if (points.length <= 1) return [...points];
  return points.filter((_, i) => i !== index);
}

/** Einen Punkt verschieben, in Grad. */
export function movePoint(
  points: readonly PovPoint[],
  index: number,
  daz: number,
  del: number,
): PovPoint[] {
  return points.map((point, i) =>
    i === index ? clampPoint({ az: point.az + daz, el: point.el + del }) : point,
  );
}

/**
 * **Die ganze Form** als Umriss `[az, el]` um die gefühlte Null, im
 * Uhrzeigersinn ab oben Mitte: das Viertel, gespiegelt nach unten, nach
 * links und nach links unten.
 */
export function fullOutline(points: readonly PovPoint[]): [number, number][] {
  const quarter = polyline(points).map((p): [number, number] => [p.az, p.el]);
  const right = [...quarter, ...[...quarter].reverse().map(([a, e]): [number, number] => [a, -e])];
  const left = [...right].reverse().map(([a, e]): [number, number] => [-a, e]);
  return [...right, ...left];
}

/** Das Rechteck aus einer Ecke, im Uhrzeigersinn ab oben rechts. */
export function rectOutline(corner: PovPoint): [number, number][] {
  return [
    [corner.az, corner.el],
    [corner.az, -corner.el],
    [-corner.az, -corner.el],
    [-corner.az, corner.el],
  ];
}

// --- der Code ----------------------------------------------------------------

/**
 * **Der Code zum Abtippen** — gewünscht: _„Bei config anzeigen soll dann ein
 * hash angezeigt werden, den ich abtippen kann um diese dir zu geben. der code
 * lässt sich auch decomprimieren."_
 *
 * Crockfords Base32 (ohne I, L, O, U — nichts, was man verwechselt), in
 * Vierergruppen: die Fassung, die Zahl der Punkte, je Punkt zwei Zeichen für
 * `az` und zwei für `el` in halben Grad, und am Ende ein Zeichen Prüfsumme.
 * `P1` ist nur der Rand; `P2` hat danach noch die Ecke des sicheren Bereichs
 * (vier Zeichen mehr). `decodePov` nimmt ihn
 * auch klein geschrieben, mit Leerzeichen und mit I/L statt 1 und O statt 0.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const VERSION = 'P1';
const VERSION_SAFE = 'P2';

function digits(value: number, count: number): string {
  let out = '';
  let rest = Math.max(0, Math.round(value));
  for (let i = 0; i < count; i++) {
    out = ALPHABET[rest % 32]! + out;
    rest = Math.floor(rest / 32);
  }
  return out;
}

function checksum(body: string): string {
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum = (sum * 7 + ALPHABET.indexOf(body[i]!) + 1) % 32;
  return ALPHABET[sum]!;
}

export function encodePov(points: readonly PovPoint[], safe?: PovPoint): string {
  const count = Math.min(points.length, 31);
  let body = (safe ? VERSION_SAFE : VERSION) + digits(count, 1);
  const pair = (point: PovPoint): string => {
    const p = clampPoint(point);
    return digits(p.az * 2, 2) + digits(p.el * 2, 2);
  };
  for (const point of points.slice(0, count)) body += pair(point);
  if (safe) body += pair(safe);
  body += checksum(body);
  return body.match(/.{1,4}/g)!.join('-');
}

/** Den Code zurück — `null`, wenn er nicht stimmt. Ohne Ecke (`P1`) ist `safe` `null`. */
export function decodePovConfig(
  code: string,
): { points: PovPoint[]; safe: PovPoint | null } | null {
  const body = code.toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
  const withSafe = body.startsWith(VERSION_SAFE);
  if ((!withSafe && !body.startsWith(VERSION)) || body.length < VERSION.length + 2) return null;
  const sum = body[body.length - 1]!;
  const rest = body.slice(0, -1);
  if (checksum(rest) !== sum) return null;
  const read = (from: number, count: number): number => {
    let value = 0;
    for (let i = 0; i < count; i++) {
      const at = ALPHABET.indexOf(rest[from + i] ?? '');
      if (at < 0) return Number.NaN;
      value = value * 32 + at;
    }
    return value;
  };
  const count = read(VERSION.length, 1);
  const pairs = count + (withSafe ? 1 : 0);
  if (!(count >= 1) || rest.length !== VERSION.length + 1 + pairs * 4) return null;
  const all: PovPoint[] = [];
  for (let i = 0; i < pairs; i++) {
    const at = VERSION.length + 1 + i * 4;
    const az = read(at, 2) / 2;
    const el = read(at + 2, 2) / 2;
    if (!Number.isFinite(az) || !Number.isFinite(el)) return null;
    all.push(clampPoint({ az, el }));
  }
  return withSafe
    ? { points: all.slice(0, count), safe: all[count]! }
    : { points: all, safe: null };
}

/** Nur der Rand aus dem Code. */
export function decodePov(code: string): PovPoint[] | null {
  return decodePovConfig(code)?.points ?? null;
}

// --- gemerkt -------------------------------------------------------------------

const KEY = 'bgvr.povCalibration';

/** Was zuletzt eingestellt war — sonst der Rand der Quest 3. */
export function loadPov(): PovConfig {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    const decoded = raw ? decodePovConfig(raw) : null;
    if (decoded) return { points: decoded.points, safe: decoded.safe ?? START_SAFE };
  } catch {
    // Ohne Speicher gilt die Vorgabe.
  }
  return { points: [...START_POINTS], safe: START_SAFE };
}

export function savePov(config: PovConfig): void {
  try {
    globalThis.localStorage?.setItem(KEY, encodePov(config.points, config.safe));
  } catch {
    // Ohne Speicher gilt die Einstellung bis zum Neuladen.
  }
}
