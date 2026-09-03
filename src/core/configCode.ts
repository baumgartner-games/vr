/**
 * Konfig-Codes: a whole settings object squeezed into one short string.
 *
 * Every number the player can turn — where a tool sits in the hand, how the
 * hand holds it, what the pistol does — is worth keeping and worth passing on.
 * Reading two dozen values off a display and typing them back somewhere else
 * is not, so this packs the lot into a single line that can be read out, sent
 * in a chat message and typed back in.
 *
 * It is *not* a hash: nothing is thrown away. `decode(encode(x))` gives `x`
 * back, field for field — that is the whole point, and the test insists on it.
 *
 * The line is `BGVR1` plus base64url of
 *
 * ```
 *   [varint original length] [LZSS stream] [2 byte checksum]
 * ```
 *
 * LZSS is old, tiny and completely deterministic — no library, no async
 * `CompressionStream`, and it runs the same in the headset and in Jest. JSON
 * repeats its own key names constantly, which is exactly what it eats: a full
 * configuration lands at roughly a third of its raw size.
 *
 * Free of three.js on purpose, like the rest of the tested maths.
 */

/** Marks our own codes, so a mistyped one fails early instead of oddly. */
const PREFIX = 'BGVR1';

/** How far back a match may reach: 12 bits of distance. */
const WINDOW = 4096;
/** Below this a match costs more than the literals it replaces. */
const MIN_MATCH = 3;
/**
 * 4 bits of length, counted from `MIN_MATCH`. The top value is an escape: one
 * more byte follows and carries up to 255 on top. JSON says
 * `"pitch": 0, "yaw": 0, "roll": 0` over and over, and those runs are far
 * longer than 18 bytes — capping them there costs more than the escape does.
 */
const SHORT_MATCH = 15;
const MAX_MATCH = MIN_MATCH + SHORT_MATCH + 255;
/** Candidates per hash bucket — a cap keeps the search from crawling. */
const MAX_CHAIN = 64;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Turns any JSON-able value into one line. */
export function encode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const body = compress(bytes);
  const payload = new Uint8Array(varintSize(bytes.length) + body.length + 2);
  let at = writeVarint(payload, 0, bytes.length);
  payload.set(body, at);
  at += body.length;
  const sum = checksum(payload.subarray(0, at));
  payload[at] = (sum >> 8) & 0xff;
  payload[at + 1] = sum & 0xff;
  return PREFIX + toBase64Url(payload);
}

/**
 * The value a code was made from, or `null` when the line is not one of ours,
 * was mistyped, or does not survive its own checksum. Never throws: a typo in
 * a headset is normal, a crash is not.
 */
export function decode(code: string): unknown | null {
  const trimmed = code.replace(/\s+/g, '');
  if (!trimmed.toUpperCase().startsWith(PREFIX)) return null;
  const payload = fromBase64Url(trimmed.slice(PREFIX.length));
  if (!payload || payload.length < 3) return null;

  const end = payload.length - 2;
  const sum = checksum(payload.subarray(0, end));
  if (payload[end] !== ((sum >> 8) & 0xff) || payload[end + 1] !== (sum & 0xff)) return null;

  const header = readVarint(payload, 0);
  if (!header) return null;
  const bytes = decompress(payload.subarray(header.at, end), header.value);
  if (!bytes) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/** A code split into groups of eight, for reading it off a display. */
export function formatCode(code: string): string {
  return (code.match(/.{1,8}/g) ?? []).join(' ');
}

// --- LZSS -----------------------------------------------------------------

/**
 * Literals and back-references, eight at a time behind a flag byte: bit set =
 * one literal byte, bit clear = two bytes of `distance-1` (12 bits) and
 * `length-MIN_MATCH` (4 bits).
 */
function compress(input: Uint8Array): Uint8Array {
  const out: number[] = [];
  /** Positions where each three-byte sequence was last seen. */
  const chains = new Map<number, number[]>();
  let flagAt = 0;
  let flagBit = 0;

  for (let i = 0; i < input.length; ) {
    if (flagBit === 0) {
      flagAt = out.length;
      out.push(0);
      flagBit = 1;
    }

    let match = findMatch(input, i, chains);
    // Lazy matching: when the next position starts a longer match, this byte
    // is worth more as a literal than as the head of a short reference.
    if (match && match.length < MAX_MATCH) {
      const later = findMatch(input, i + 1, chains);
      if (later && later.length > match.length) match = null;
    }
    if (match) {
      const distance = i - match.at - 1;
      const length = match.length - MIN_MATCH;
      const code = Math.min(length, SHORT_MATCH);
      out.push((distance >> 4) & 0xff, ((distance & 0x0f) << 4) | code);
      if (code === SHORT_MATCH) out.push(length - SHORT_MATCH);
      for (let k = 0; k < match.length; k++) remember(input, i + k, chains);
      i += match.length;
    } else {
      out[flagAt]! |= flagBit;
      out.push(input[i]!);
      remember(input, i, chains);
      i++;
    }

    flagBit = (flagBit << 1) & 0xff;
  }

  return Uint8Array.from(out);
}

function decompress(input: Uint8Array, length: number): Uint8Array | null {
  const out = new Uint8Array(length);
  let written = 0;
  let at = 0;
  let flags = 0;
  let flagBit = 0;

  while (written < length) {
    if (flagBit === 0) {
      if (at >= input.length) return null;
      flags = input[at++]!;
      flagBit = 1;
    }
    if (flags & flagBit) {
      if (at >= input.length) return null;
      out[written++] = input[at++]!;
    } else {
      if (at + 1 >= input.length) return null;
      const high = input[at++]!;
      const low = input[at++]!;
      const distance = ((high << 4) | (low >> 4)) + 1;
      let code = low & 0x0f;
      if (code === SHORT_MATCH) {
        if (at >= input.length) return null;
        code += input[at++]!;
      }
      const run = code + MIN_MATCH;
      const from = written - distance;
      if (from < 0 || written + run > length) return null;
      // Byte by byte: a run may overlap itself, which is how "aaaa…" gets short.
      for (let k = 0; k < run; k++) out[written + k] = out[from + k]!;
      written += run;
    }
    flagBit = (flagBit << 1) & 0xff;
  }

  return out;
}

/** The longest back-reference that starts here, if it is worth having. */
function findMatch(
  input: Uint8Array,
  at: number,
  chains: Map<number, number[]>,
): { at: number; length: number } | null {
  if (at + MIN_MATCH > input.length) return null;
  const candidates = chains.get(keyAt(input, at));
  if (!candidates) return null;

  let best: { at: number; length: number } | null = null;
  for (let c = candidates.length - 1; c >= 0 && candidates.length - c <= MAX_CHAIN; c--) {
    const start = candidates[c]!;
    if (at - start > WINDOW) break;
    let length = 0;
    while (
      length < MAX_MATCH &&
      at + length < input.length &&
      input[start + length] === input[at + length]
    ) {
      length++;
    }
    if (length >= MIN_MATCH && (!best || length > best.length)) best = { at: start, length };
    if (best?.length === MAX_MATCH) break;
  }
  return best;
}

function remember(input: Uint8Array, at: number, chains: Map<number, number[]>): void {
  if (at + MIN_MATCH > input.length) return;
  const key = keyAt(input, at);
  const list = chains.get(key);
  if (list) list.push(at);
  else chains.set(key, [at]);
}

function keyAt(input: Uint8Array, at: number): number {
  return (input[at]! << 16) | (input[at + 1]! << 8) | input[at + 2]!;
}

// --- small pieces ----------------------------------------------------------

/** FNV-1a, folded to 16 bits: enough to catch a typo, cheap to carry. */
function checksum(bytes: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return ((hash >>> 16) ^ (hash & 0xffff)) & 0xffff;
}

function varintSize(value: number): number {
  let size = 1;
  while (value >= 0x80) {
    value >>>= 7;
    size++;
  }
  return size;
}

function writeVarint(target: Uint8Array, at: number, value: number): number {
  while (value >= 0x80) {
    target[at++] = (value & 0x7f) | 0x80;
    value >>>= 7;
  }
  target[at++] = value;
  return at;
}

function readVarint(source: Uint8Array, at: number): { value: number; at: number } | null {
  let value = 0;
  let shift = 0;
  while (at < source.length) {
    const byte = source[at++]!;
    value |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return { value: value >>> 0, at };
    shift += 7;
    if (shift > 28) return null;
  }
  return null;
}

function toBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const triple = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += ALPHABET[(triple >> 18) & 63]! + ALPHABET[(triple >> 12) & 63]!;
    if (b === undefined) break;
    out += ALPHABET[(triple >> 6) & 63]!;
    if (c === undefined) break;
    out += ALPHABET[triple & 63]!;
  }
  return out;
}

function fromBase64Url(text: string): Uint8Array | null {
  const out: number[] = [];
  let bits = 0;
  let held = 0;
  for (const char of text) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) return null;
    held = (held << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((held >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}
