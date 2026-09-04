import { BASE64_ALPHABET } from '../../../core/configCode';
import type { Handedness } from '../../../core/XRInput';

/**
 * Der **Kurzcode**: alles, was zu *einem* Werkzeug an *einer* Hand gehört, in
 * zwei Dutzend Zeichen.
 *
 * Der große Konfig-Code (`gearCodec.ts`) kann alles und ist deshalb für den
 * häufigsten Fall zu breit: eine Werkzeugpose kostete darin 22 Zeichen — genau
 * so viele wie die sechs Zahlen im Klartext (`4,-2.8,1.7,-44,26,-105`). Ein
 * Code, der nicht kürzer ist als das, was er ersetzt, ist keiner.
 *
 * Der Grund war nie die Menge, sondern die **Verpackung**: Abschnittsmaske,
 * Feldmaske, Varints, ein Kompressions-Flag und zwei Byte Prüfsumme sind
 * zusammen mehr als die Nutzlast, wenn die Nutzlast sechs Zahlen ist. Also
 * hier ein zweiter Code, der nur den einen Fall kann und dafür nichts
 * mitschleppt.
 *
 * ## Wie eine Pose in neun Zeichen passt
 *
 * Man schreibt die Zahlen nicht einzeln, sondern **eine** Zahl zur gemischten
 * Basis. Jeder Wert bekommt so viele Stufen, wie er wirklich hat:
 *
 * - **Ort**: ±36,0 cm in Zehntelschritten → 721 Stufen je Achse.
 * - **Winkel**: 0…359 in ganzen Grad → 360 Stufen je Achse.
 *
 * Zusammen sind das 721³ · 360³ = 17 486 806 953 216 000 Möglichkeiten. Wie
 * viele Zeichen dafür nötig sind, entscheidet nicht die *Summe* der Stufen,
 * sondern ihr **Produkt** — daran ist die naheliegende Rechnung schuld, die
 * hier zuerst stand: 360+360+360 = 1080 „passt bequem in zwei Zeichen". Es
 * sind aber 360·360·360 = 46 656 000 Kombinationen, und zwei Base64-Zeichen
 * tragen 64² = 4096 davon. Richtig gerechnet:
 *
 * ```
 * 64⁸ =  281 474 976 710 656   zu wenig
 * 64⁹ = 18 014 398 509 481 984 reicht (mit 3 % Luft)
 * ```
 *
 * Also **neun** Zeichen für eine ganze Pose — nicht vier, aber auch nicht 22.
 *
 * Gerechnet wird mit `BigInt`, und das ist keine Vorsicht: 1,75·10¹⁶ liegt
 * über 2⁵³, und ab dort zählt eine JavaScript-Zahl nicht mehr in Einsen.
 *
 * ## Was ein Kurzcode trägt
 *
 * ```
 * BGK <Platz:1> <Flags:1> [Pose:9] [Griff:9] [Finger:7] <Summe:2>
 * ```
 *
 * - **Platz**: welches Werkzeug (`SHORT_SLOTS`) — oder die leere Hand.
 * - **Flags**: was überhaupt drinsteht, und welche Hand gemeint ist.
 * - **Pose**: wie das Werkzeug im Griff liegt.
 * - **Griff**: wie die Hand es umfasst — dieselben sechs Zahlen.
 * - **Finger**: Krümmung und Spreizung, nur wenn sie verstellt sind. Fünf
 *   Finger zu je 101 Stufen und eine Spreizung zu 61 sind 6,4·10¹¹, also
 *   sieben Zeichen.
 * - **Summe**: zwei Zeichen gewichtete Quersumme. Eines hätte gereicht, um
 *   *fast* jeden Tippfehler zu fangen — von 166 vertauschten Zeichen kamen
 *   vier durch, und ein Code, der in vier von hundert Fällen still eine
 *   fremde Handhaltung einträgt, ist schlimmer als einer, der zu lang ist. Mit
 *   zwölf Bit kommt keiner mehr durch (der Test probiert sie alle).
 *
 * Damit kostet „Werkzeug plus Griff" 25 Zeichen statt 66, und eine einzelne
 * Pose 16 statt 22. Für die *ganze* Ausrüstung bleibt der große Code
 * zuständig: 24 Werkzeuge und 48 Griffe sind siebzig Posen, und siebzig Posen
 * sind nun einmal siebzig Posen.
 */

/** Marker eines Kurzcodes. `BG` wie überall, `K` wie kurz. */
const PREFIX = 'BGK';

/** Wie weit ein Versatz reicht, in Zentimetern — darüber wird beschnitten. */
export const POSE_LIMIT = 36;
/** Auf wie viel er gerundet wird. */
export const POSE_STEP = 0.1;

/** Stufen je Achse: −36,0 … +36,0 in Zehntelschritten. */
const POSE_RADIX = Math.round((POSE_LIMIT * 2) / POSE_STEP) + 1;
/** Stufen je Winkel: 0 … 359 in ganzen Grad. */
const ANGLE_RADIX = 360;

const CURL_RADIX = 101;
const SPREAD_LIMIT = 30;
const SPREAD_RADIX = SPREAD_LIMIT * 2 + 1;

const POSE_BASES = [POSE_RADIX, POSE_RADIX, POSE_RADIX, ANGLE_RADIX, ANGLE_RADIX, ANGLE_RADIX];
const FINGER_BASES = [
  CURL_RADIX,
  CURL_RADIX,
  CURL_RADIX,
  CURL_RADIX,
  CURL_RADIX,
  SPREAD_RADIX,
];

/** Wie viele Zeichen eine Pose kostet. */
export const POSE_CHARS = charsFor(POSE_BASES);
/** Wie viele Zeichen Krümmung und Spreizung kosten. */
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
  let body = '';

  if (gear.pose) {
    flags |= FLAG_POSE;
    body += packPose(gear.pose);
  }
  if (gear.grip) {
    flags |= FLAG_GRIP;
    body += packPose(gear.grip);
  }
  if (gear.fingers) {
    flags |= FLAG_FINGERS;
    body += packFingers(gear.fingers.curls, gear.fingers.spread);
  }

  const head = digit(slot) + digit(flags);
  const sum = checksum(head + body);
  return PREFIX + head + body + digit(sum >> 6) + digit(sum & 63);
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
  if (digit(sum >> 6) !== rest[rest.length - 2]) return null;
  if (digit(sum & 63) !== rest[rest.length - 1]) return null;

  const slot = value(body[0]!);
  const flags = value(body[1]!);
  if (slot < 0 || flags < 0 || slot >= SHORT_SLOTS.length) return null;

  let at = 2;
  const take = (count: number): string | null => {
    if (at + count > body.length) return null;
    const part = body.slice(at, at + count);
    at += count;
    return part;
  };

  const gear: ShortGear = {
    toolId: SHORT_SLOTS[slot]!,
    hand: flags & FLAG_LEFT ? 'left' : 'right',
  };

  if (flags & FLAG_POSE) {
    const part = take(POSE_CHARS);
    const pose = part && unpackPose(part);
    if (!pose) return null;
    gear.pose = pose;
  }
  if (flags & FLAG_GRIP) {
    const part = take(POSE_CHARS);
    const grip = part && unpackPose(part);
    if (!grip) return null;
    gear.grip = grip;
  }
  if (flags & FLAG_FINGERS) {
    const part = take(FINGER_CHARS);
    const fingers = part && unpackFingers(part);
    if (!fingers) return null;
    gear.fingers = fingers;
  }
  // Zu viel ist genauso falsch wie zu wenig: dann stimmt die Länge nicht zu
  // dem, was die Flags versprechen, und der Code ist verstümmelt.
  return at === body.length ? gear : null;
}

/** Sechs Zahlen als eine — Ort in Zehntel-Zentimetern, Winkel in Grad. */
export function packPose(values: readonly number[]): string {
  const digits = [
    step(values[0] ?? 0),
    step(values[1] ?? 0),
    step(values[2] ?? 0),
    angle(values[3] ?? 0),
    angle(values[4] ?? 0),
    angle(values[5] ?? 0),
  ];
  return packDigits(digits, POSE_BASES, POSE_CHARS);
}

/** Und zurück, in genau der Form, in der sie hineingingen. */
export function unpackPose(text: string): number[] | null {
  const digits = unpackDigits(text, POSE_BASES);
  if (!digits) return null;
  return [
    round1(digits[0]! * POSE_STEP - POSE_LIMIT),
    round1(digits[1]! * POSE_STEP - POSE_LIMIT),
    round1(digits[2]! * POSE_STEP - POSE_LIMIT),
    signed(digits[3]!),
    signed(digits[4]!),
    signed(digits[5]!),
  ];
}

/** Fünf Krümmungen und die Spreizung. */
export function packFingers(curls: readonly number[], spread: number): string {
  const digits = [0, 1, 2, 3, 4].map((i) => clampInt(Math.round((curls[i] ?? 0) * 100), CURL_RADIX));
  digits.push(clampInt(Math.round(spread) + SPREAD_LIMIT, SPREAD_RADIX));
  return packDigits(digits, FINGER_BASES, FINGER_CHARS);
}

export function unpackFingers(text: string): { curls: number[]; spread: number } | null {
  const digits = unpackDigits(text, FINGER_BASES);
  if (!digits) return null;
  return {
    curls: digits.slice(0, 5).map((d) => Math.round(d) / 100),
    spread: digits[5]! - SPREAD_LIMIT,
  };
}

// --- die gemischte Basis ---------------------------------------------------

/** Wie viele Base64-Zeichen dieses Stellenwertsystem braucht. */
function charsFor(bases: readonly number[]): number {
  let total = 1n;
  for (const base of bases) total *= BigInt(base);
  let chars = 0;
  let room = 1n;
  while (room < total) {
    room *= 64n;
    chars++;
  }
  return chars;
}

/**
 * Ziffern zu gemischter Basis in eine Zahl, die Zahl in Base64.
 *
 * `BigInt`, weil das Produkt der Basen über 2⁵³ liegt — mit `number` würde ab
 * dort jede zweite Pose zur nächsten gerundet, und zwar unbemerkt.
 */
function packDigits(digits: readonly number[], bases: readonly number[], chars: number): string {
  let total = 0n;
  for (let i = 0; i < bases.length; i++) {
    total = total * BigInt(bases[i]!) + BigInt(clampInt(digits[i] ?? 0, bases[i]!));
  }
  let out = '';
  for (let i = 0; i < chars; i++) {
    out = BASE64_ALPHABET[Number(total % 64n)] + out;
    total /= 64n;
  }
  return out;
}

function unpackDigits(text: string, bases: readonly number[]): number[] | null {
  let total = 0n;
  for (const character of text) {
    const index = value(character);
    if (index < 0) return null;
    total = total * 64n + BigInt(index);
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
  return BASE64_ALPHABET[clampInt(index, 64)]!;
}

function value(character: string): number {
  return BASE64_ALPHABET.indexOf(character);
}

/**
 * Zwölf Bit, gewichtet — damit auch zwei vertauschte Zeichen auffallen.
 *
 * Die Stelle geht mit ein, sonst wäre jede Vertauschung dieselbe Summe. Der
 * Startwert ist nicht null, damit eine Zeile aus lauter `A` (Index 0) nicht
 * dieselbe Summe hat wie eine kürzere.
 */
function checksum(body: string): number {
  let sum = 0x2f7;
  for (let i = 0; i < body.length; i++) {
    sum = (sum * 31 + (i + 1) * (value(body[i]!) + 1)) % 4096;
  }
  return sum;
}

function step(centimetres: number): number {
  const value = Number.isFinite(centimetres) ? centimetres : 0;
  return Math.round((clamp(value, POSE_LIMIT) + POSE_LIMIT) / POSE_STEP);
}

function angle(degrees: number): number {
  const value = Number.isFinite(degrees) ? Math.round(degrees) : 0;
  return ((value % 360) + 360) % 360;
}

/** 0…359 zurück nach −180…179 — so, wie die Anzeigen sie führen. */
function signed(value: number): number {
  return value >= 180 ? value - 360 : value;
}

function clamp(value: number, limit: number): number {
  return Math.min(limit, Math.max(-limit, value));
}

function clampInt(value: number, radix: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(radix - 1, Math.max(0, Math.round(value)));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
