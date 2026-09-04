import { eulerXYZ, quatFromEulerXYZ } from './toolPose';
import type { Handedness } from '../../../core/XRInput';

/**
 * Der **Kurzcode**: alles, was zu *einem* Werkzeug an *einer* Hand gehört, in
 * gut zwei Dutzend Zeichen — und in Zeichen, die man ablesen kann.
 *
 * Der große Konfig-Code (`gearCodec.ts`) kann alles und ist deshalb für den
 * häufigsten Fall zu breit: eine Werkzeugpose kostete darin 22 Zeichen — genau
 * so viele wie die sechs Zahlen im Klartext (`4,-2.8,1.7,-44,26,-105`). Ein
 * Code, der nicht kürzer ist als das, was er ersetzt, ist keiner. Der Grund war
 * nie die Menge, sondern die Verpackung: Abschnittsmaske, Feldmaske, Varints,
 * ein Kompressions-Flag und zwei Byte Prüfsumme sind zusammen mehr als die
 * Nutzlast, wenn die Nutzlast sechs Zahlen ist.
 *
 * ## Die Wertebereiche
 *
 * | Wert | Bereich | Schrittweite | Zustände |
 * | --- | --- | --- | --- |
 * | `x`, `y`, `z` | −30,0 … +30,0 cm | 0,1 cm | 601 |
 * | `pitch`, `roll` | 0 … 359° | 1° | 360 |
 * | `yaw` | −90 … +90° | 1° | 181 |
 *
 * 0° und 360° sind derselbe Winkel, also wird nur 0…359 geführt. Und **Yaw
 * braucht nur die halbe Runde**: `eulerXYZ` bestimmt den mittleren Winkel mit
 * `Math.asin`, der kann gar nicht über ±90° hinaus (mit 20 000 gleichverteilten
 * Drehungen nachgemessen, größter Wert 89,12°). In der Tabelle der Vorlage
 * stand dafür `pitch` — in *diesem* Code ist es `yaw`, weil hier die Y-Achse
 * die mittlere ist. Eine getippte Haltung mit größerem Yaw geht trotzden nicht
 * verloren: sie wird vor dem Packen einmal durch das Quaternion geschickt, und
 * das liefert dieselbe Drehung mit |yaw| ≤ 90.
 *
 * ## Wie das gepackt wird
 *
 * Alles, was in einem Code steht, wird zu **einer** Ganzzahl zur gemischten
 * Basis: jeder Wert bekommt so viele Stufen, wie er wirklich hat, und die Zahl
 * wird anschließend im Alphabet unten geschrieben.
 *
 * ```
 * N = x + 601·y + 601²·z + 601³·pitch + 601³·360·yaw + 601³·360·181·roll
 * ```
 *
 * Wie viele Zeichen das braucht, entscheidet das **Produkt** der Stufen und
 * nicht ihre Summe:
 *
 * ```
 * 601³ · 360 · 181 · 360 = 5 092 218 055 137 600   ≈ 5,09 · 10^15
 *                        = 52,18 bit
 * 59^8  =     146 830 437 604 321   zu wenig
 * 59^9  =   8 662 995 818 654 939   reicht
 * ```
 *
 * Also **neun** Zeichen für eine ganze Pose und **achtzehn** für zwei. Nicht
 * acht und sechzehn: dafür müsste die Pose in 46 bit passen, und sie braucht
 * 53. Gerechnet wird mit `BigInt`, weil zwei Posen zusammen über 2⁵³ liegen —
 * ab dort zählt eine JavaScript-Zahl nicht mehr in Einsen.
 *
 * Zwei Posen werden dabei nicht einzeln gepackt, sondern zusammen in dieselbe
 * Zahl gehängt (`N = N₁ + M·N₂`). Hier kommt am Ende dasselbe heraus; sobald
 * ein Block dazukommt, dessen Stufenzahl keine Zweierpotenz ist, spart es ein
 * Zeichen, das sonst beim Aufrunden verloren ginge.
 *
 * ## Das Alphabet
 *
 * 59 Zeichen, und zwar die, die man **nicht verwechselt**: kein `0`/`O`, kein
 * `1`/`I`/`l`. Ein Code wird in einer Brille von einer Tafel abgelesen und mit
 * einer Zeigehand eingetippt; dort ist eine Null, die wie ein O aussieht, kein
 * Schönheitsfehler, sondern ein Fehlversuch. Alle 59 sind URL-sicher (`-` und
 * `_` gehören zu den *unreserved characters* aus RFC 3986).
 *
 * 59 statt 64 kostet nichts: `log₂(59) = 5,88` bit je Zeichen statt 6, und weil
 * 59⁹ immer noch über den 5,09·10¹⁵ Möglichkeiten liegt, bleibt es bei neun
 * Zeichen. Lesbarkeit gratis.
 *
 * ## Was ein Kurzcode trägt
 *
 * ```
 * BP <Platz:1> <Flags:1> <Nutzlast> <Summe:2>
 *
 * BPFxYc7mQpTvK4hR2nDsWgb   # Werkzeugpose *und* Griff
 * ```
 *
 * - **Platz**: welches Werkzeug (`SHORT_SLOTS`) — oder die leere Hand.
 * - **Flags**: was drinsteht, und welche Hand gemeint ist.
 * - **Nutzlast**: 9 Zeichen je Pose, 7 für die Finger, alles in einer Zahl.
 * - **Summe**: zwei Zeichen gewichtete Quersumme. Eines hätte *fast* gereicht —
 *   von 166 vertauschten Zeichen kamen vier durch, und ein Code, der in vier
 *   von hundert Fällen still eine fremde Handhaltung einträgt, ist schlimmer
 *   als einer, der ein Zeichen länger ist.
 *
 * Damit kostet eine einzelne Pose **15** Zeichen und „Werkzeug plus Griff"
 * **24** — gegen 22 und 66 beim großen Code. Für die *ganze* Ausrüstung bleibt
 * der zuständig: siebzig Posen sind nun einmal siebzig Posen.
 */

/** Marker eines Kurzcodes. `B` wie das Projekt, `P` wie Pose. */
const PREFIX = 'BP';

/**
 * Die 59 Zeichen, in denen ein Kurzcode geschrieben wird.
 *
 * Ohne `0`, `O`, `1`, `I` und `l` — die fünf, die man beim Abtippen
 * verwechselt. Die Reihenfolge ist Teil des Formats: wer sie ändert, macht aus
 * jedem alten Code einen, der etwas anderes meint.
 */
export const POSE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_';

/** Wie weit ein Versatz reicht, in Zentimetern — darüber wird beschnitten. */
export const POSE_LIMIT = 30;
/** Auf wie viel er gerundet wird. */
export const POSE_STEP = 0.1;

/** Stufen je Achse: −30,0 … +30,0 in Zehntelschritten. */
const POSE_RADIX = Math.round((POSE_LIMIT * 2) / POSE_STEP) + 1;
/** Stufen einer vollen Runde: 0 … 359 in ganzen Grad. */
const TURN_RADIX = 360;
/** Stufen des mittleren Winkels: −90 … +90 in ganzen Grad. */
const HALF_RADIX = 181;

const CURL_RADIX = 101;
const SPREAD_LIMIT = 30;
const SPREAD_RADIX = SPREAD_LIMIT * 2 + 1;

/**
 * Die Stufen einer Pose, in der Reihenfolge der Werte: x, y, z, pitch, yaw,
 * roll. Yaw steht in der Mitte und bekommt die halbe Runde (siehe oben).
 */
const POSE_BASES = [POSE_RADIX, POSE_RADIX, POSE_RADIX, TURN_RADIX, HALF_RADIX, TURN_RADIX];
const FINGER_BASES = [CURL_RADIX, CURL_RADIX, CURL_RADIX, CURL_RADIX, CURL_RADIX, SPREAD_RADIX];

/** Wie viele Zeichen eine Pose allein kostet. */
export const POSE_CHARS = charsFor(POSE_BASES);
/** Wie viele Zeichen Krümmung und Spreizung allein kosten. */
export const FINGER_CHARS = charsFor(FINGER_BASES);

/**
 * Wofür ein Kurzcode gilt, in fester Reihenfolge.
 *
 * **Nur anhängen, nie umsortieren**: die Zahl steht im Code, und wer die Liste
 * dreht, macht aus jedem alten Code einen, der etwas anderes meint. `''` ist
 * die leere Hand — sie hat keine Werkzeugpose, aber eine Grundhaltung.
 */
export const SHORT_SLOTS = [
  '',
  'grab',
  'gun-blue',
  'gun-red',
  'gun-dual',
  'gizmo',
  'brush',
  'duplicator',
  'inspect',
  'pistol',
  'shuriken',
  'stopwatch',
  'flashlight',
  'grapple',
  'gravity-glove',
  'translate-glove',
  'superman-glove',
  'welder',
  'xray',
  'drone',
  'tape',
  'teleport',
  'eraser',
  'hand-box',
  'controller-left',
  'controller-right',
] as const;

const FLAG_POSE = 1;
const FLAG_GRIP = 2;
const FLAG_LEFT = 4;
const FLAG_FINGERS = 8;

/** Was in einem Kurzcode steht. Alles außer Werkzeug und Hand darf fehlen. */
export interface ShortGear {
  /** Werkzeug-Id, `grab` fürs Objekt, `''` für die leere Hand. */
  toolId: string;
  hand: Handedness;
  /** Lage des Werkzeugs im Griff: x, y, z in cm, dann Pitch, Yaw, Roll. */
  pose?: readonly number[] | null;
  /** Wie die Hand es umfasst — dieselben sechs Zahlen. */
  grip?: readonly number[] | null;
  /** Krümmung je Finger (0…1) und Spreizung in Grad. */
  fingers?: { curls: readonly number[]; spread: number } | null;
}

/** Ein Kurzcode aus dem, was zu einem Werkzeug an einer Hand gehört. */
export function packShortGear(gear: ShortGear): string {
  const slot = Math.max(0, SHORT_SLOTS.indexOf(gear.toolId as (typeof SHORT_SLOTS)[number]));
  let flags = gear.hand === 'left' ? FLAG_LEFT : 0;
  const digits: number[] = [];
  const bases: number[] = [];

  if (gear.pose) {
    flags |= FLAG_POSE;
    digits.push(...poseDigits(gear.pose));
    bases.push(...POSE_BASES);
  }
  if (gear.grip) {
    flags |= FLAG_GRIP;
    digits.push(...poseDigits(gear.grip));
    bases.push(...POSE_BASES);
  }
  if (gear.fingers) {
    flags |= FLAG_FINGERS;
    digits.push(...fingerDigits(gear.fingers.curls, gear.fingers.spread));
    bases.push(...FINGER_BASES);
  }

  // Alles in **eine** Zahl: zwei Posen nebeneinander zu packen verschenkt das,
  // was beim Aufrunden jeder einzelnen übrig bleibt.
  const body = digit(slot) + digit(flags) + packDigits(digits, bases);
  const sum = checksum(body);
  return PREFIX + body + digit(Math.floor(sum / 59)) + digit(sum % 59);
}

/**
 * Zurück — oder `null`, wenn das keiner von uns ist, jemand sich vertippt hat
 * oder die Länge nicht zu den Flags passt. Ein Code wird in einer Brille
 * abgetippt: ein Tippfehler muss in einem Schulterzucken enden, nicht in einer
 * verstellten Hand.
 */
export function parseShortGear(code: string): ShortGear | null {
  const text = code.replace(/\s+/g, '');
  if (!text.startsWith(PREFIX)) return null;
  const rest = text.slice(PREFIX.length);
  if (rest.length < 4) return null;

  const body = rest.slice(0, rest.length - 2);
  const sum = checksum(body);
  if (digit(Math.floor(sum / 59)) !== rest[rest.length - 2]) return null;
  if (digit(sum % 59) !== rest[rest.length - 1]) return null;

  const slot = value(body[0]!);
  const flags = value(body[1]!);
  if (slot < 0 || flags < 0 || slot >= SHORT_SLOTS.length) return null;

  const bases: number[] = [];
  if (flags & FLAG_POSE) bases.push(...POSE_BASES);
  if (flags & FLAG_GRIP) bases.push(...POSE_BASES);
  if (flags & FLAG_FINGERS) bases.push(...FINGER_BASES);
  // Die Flags sagen, wie lang die Nutzlast sein muss. Stimmt das nicht, ist der
  // Code verstümmelt — und das fällt hier auf und nicht erst an der Hand.
  const payload = body.slice(2);
  if (payload.length !== charsFor(bases)) return null;

  const digits = bases.length > 0 ? unpackDigits(payload, bases) : [];
  if (!digits) return null;

  const gear: ShortGear = {
    toolId: SHORT_SLOTS[slot]!,
    hand: flags & FLAG_LEFT ? 'left' : 'right',
  };
  let at = 0;
  if (flags & FLAG_POSE) {
    gear.pose = poseValues(digits.slice(at, (at += 6)));
  }
  if (flags & FLAG_GRIP) {
    gear.grip = poseValues(digits.slice(at, (at += 6)));
  }
  if (flags & FLAG_FINGERS) {
    gear.fingers = fingerValues(digits.slice(at, (at += 6)));
  }
  return gear;
}

/** Eine einzelne Pose als Zeichenkette — neun Zeichen. */
export function packPose(values: readonly number[]): string {
  return packDigits(poseDigits(values), POSE_BASES);
}

/** Und zurück, in genau der Form, in der sie hineinging. */
export function unpackPose(text: string): number[] | null {
  const digits = unpackDigits(text, POSE_BASES);
  return digits ? poseValues(digits) : null;
}

// --- Werte zu Ziffern und zurück -------------------------------------------

/**
 * Die sechs Zahlen einer Pose als Ziffern ihrer Basen.
 *
 * Die Drehung geht dabei einmal durch das Quaternion: `eulerXYZ` liefert den
 * mittleren Winkel immer in ±90°, und genau darauf ist die Basis 181 gebaut.
 * Eine getippte Haltung mit Yaw 120° beschreibt dieselbe Drehung wie eine mit
 * |yaw| ≤ 90 — sie wird hier in diese Form gebracht statt beschnitten.
 */
function poseDigits(values: readonly number[]): number[] {
  const [pitch, yaw, roll] = canonicalAngles(values[3] ?? 0, values[4] ?? 0, values[5] ?? 0);
  return [
    place(values[0] ?? 0),
    place(values[1] ?? 0),
    place(values[2] ?? 0),
    turn(pitch),
    Math.min(HALF_RADIX - 1, Math.max(0, Math.round(yaw) + 90)),
    turn(roll),
  ];
}

function poseValues(digits: readonly number[]): number[] {
  return [
    round1(digits[0]! * POSE_STEP - POSE_LIMIT),
    round1(digits[1]! * POSE_STEP - POSE_LIMIT),
    round1(digits[2]! * POSE_STEP - POSE_LIMIT),
    signed(digits[3]!),
    digits[4]! - 90,
    signed(digits[5]!),
  ];
}

function fingerDigits(curls: readonly number[], spread: number): number[] {
  const digits = [0, 1, 2, 3, 4].map((i) =>
    clampInt(Math.round((curls[i] ?? 0) * 100), CURL_RADIX),
  );
  digits.push(clampInt(Math.round(spread) + SPREAD_LIMIT, SPREAD_RADIX));
  return digits;
}

function fingerValues(digits: readonly number[]): { curls: number[]; spread: number } {
  return {
    curls: digits.slice(0, 5).map((d) => Math.round(d) / 100),
    spread: digits[5]! - SPREAD_LIMIT,
  };
}

/**
 * Dieselbe Drehung, aber mit dem mittleren Winkel in ±90°.
 *
 * Der Weg über das Quaternion und zurück ist genau die Normalform, die
 * `eulerXYZ` ohnehin liefert — für eine gemessene Haltung ändert er nichts,
 * für eine getippte macht er aus Yaw 120° die gleichwertige Zahlenreihe, die
 * hier hineinpasst.
 */
function canonicalAngles(pitch: number, yaw: number, roll: number): [number, number, number] {
  const euler = eulerXYZ(
    quatFromEulerXYZ({
      x: (deg(pitch) * Math.PI) / 180,
      y: (deg(yaw) * Math.PI) / 180,
      z: (deg(roll) * Math.PI) / 180,
    }),
  );
  return [(euler.x * 180) / Math.PI, (euler.y * 180) / Math.PI, (euler.z * 180) / Math.PI];
}

// --- die gemischte Basis ---------------------------------------------------

/** Wie viele Zeichen dieses Stellenwertsystem braucht. */
function charsFor(bases: readonly number[]): number {
  let total = 1n;
  for (const base of bases) total *= BigInt(base);
  let chars = 0;
  let room = 1n;
  const radix = BigInt(POSE_ALPHABET.length);
  while (room < total) {
    room *= radix;
    chars++;
  }
  return chars;
}

/**
 * Ziffern zu gemischter Basis in eine Zahl, die Zahl ins Alphabet.
 *
 * `BigInt`, weil das Produkt der Basen über 2⁵³ liegt, sobald zwei Posen
 * zusammenkommen — mit `number` würde ab dort jede zweite Pose zur nächsten
 * gerundet, und zwar unbemerkt.
 */
function packDigits(digits: readonly number[], bases: readonly number[]): string {
  const radix = BigInt(POSE_ALPHABET.length);
  let total = 0n;
  for (let i = 0; i < bases.length; i++) {
    total = total * BigInt(bases[i]!) + BigInt(clampInt(digits[i] ?? 0, bases[i]!));
  }
  let out = '';
  for (let i = charsFor(bases); i > 0; i--) {
    out = POSE_ALPHABET[Number(total % radix)] + out;
    total /= radix;
  }
  return out;
}

function unpackDigits(text: string, bases: readonly number[]): number[] | null {
  const radix = BigInt(POSE_ALPHABET.length);
  let total = 0n;
  for (const character of text) {
    const index = value(character);
    if (index < 0) return null;
    total = total * radix + BigInt(index);
  }
  const digits: number[] = [];
  for (let i = bases.length - 1; i >= 0; i--) {
    const base = BigInt(bases[i]!);
    digits[i] = Number(total % base);
    total /= base;
  }
  // Was übrig bleibt, gehört nicht dazu: ein Code mit einem verdrehten Zeichen
  // trägt sonst eine Pose, die nie jemand gemessen hat.
  return total === 0n ? digits : null;
}

// --- Kleinkram -------------------------------------------------------------

function digit(index: number): string {
  return POSE_ALPHABET[clampInt(index, POSE_ALPHABET.length)]!;
}

function value(character: string): number {
  return POSE_ALPHABET.indexOf(character);
}

/**
 * Zwei Zeichen gewichtete Quersumme — damit auch zwei vertauschte auffallen.
 *
 * Die Stelle geht mit ein, sonst wäre jede Vertauschung dieselbe Summe. Der
 * Startwert ist nicht null, damit eine Zeile aus lauter `A` (Index 0) nicht
 * dieselbe Summe hat wie eine kürzere.
 */
function checksum(body: string): number {
  const span = POSE_ALPHABET.length * POSE_ALPHABET.length;
  let sum = 1234;
  for (let i = 0; i < body.length; i++) {
    sum = (sum * 31 + (i + 1) * (value(body[i]!) + 1)) % span;
  }
  return sum;
}

function place(centimetres: number): number {
  const value = deg(centimetres);
  return Math.round((Math.min(POSE_LIMIT, Math.max(-POSE_LIMIT, value)) + POSE_LIMIT) / POSE_STEP);
}

/** 0 … 359: eine volle Runde, und 360° ist wieder 0°. */
function turn(degrees: number): number {
  return ((Math.round(deg(degrees)) % 360) + 360) % 360;
}

/** 0…359 zurück nach −180…179 — so, wie die Anzeigen sie führen. */
function signed(value: number): number {
  return value >= 180 ? value - 360 : value;
}

function deg(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function clampInt(value: number, radix: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(radix - 1, Math.max(0, Math.round(value)));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
