/**
 * Konfig-Codes: a whole settings object squeezed into one short string.
 *
 * Every number the player can turn — where a tool sits in the hand, how the
 * hand holds it, what the pistol does — is worth keeping and worth passing on.
 * Reading two dozen values off a display and typing them back somewhere else
 * is not, so this packs the lot into a single line that can be read out, sent
 * in a chat message and typed back in.
 *
 * This file is only the envelope: bytes in, one line out, and back again.
 * What those bytes *mean* is `tools/gearCodec.ts`, and that is where most of
 * the shortness comes from — a schema both ends know needs no field names, no
 * braces and no quotes. The rest is squeezed out here: the same pose written
 * for sixteen tools is the same handful of bytes sixteen times over, and a
 * tiny LZSS pass (dictionary in the stream, so no library and no
 * `CompressionStream`) turns every repeat into two bytes.
 *
 * The line is `BG2` plus base64url of
 *
 * ```
 *   [1 byte: 0 raw, 1 packed] [payload] [2 byte checksum]
 * ```
 *
 * Packing is only used when it actually wins, so a short code never grows.
 *
 * Free of three.js on purpose, like the rest of the tested maths.
 */

/** Marks our own codes, so a mistyped one fails early instead of oddly. */
const PREFIX = 'BG2';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** One line from a payload: prefix, base64url, checksum. */
export function packCode(payload: Uint8Array): string {
  const squeezed = compress(payload);
  const packed = squeezed.length < payload.length;
  const body = packed ? squeezed : payload;

  const bytes = new Uint8Array(body.length + 3);
  bytes[0] = packed ? 1 : 0;
  bytes.set(body, 1);
  const sum = checksum(bytes.subarray(0, body.length + 1));
  bytes[body.length + 1] = (sum >> 8) & 0xff;
  bytes[body.length + 2] = sum & 0xff;
  return PREFIX + toBase64Url(bytes);
}

/**
 * The payload behind a code, or `null` when the line is not one of ours, was
 * mistyped, or does not survive its own checksum. Never throws: a typo in a
 * headset is normal, a crash is not.
 */
export function unpackCode(code: string): Uint8Array | null {
  const trimmed = code.replace(/\s+/g, '');
  if (!trimmed.startsWith(PREFIX)) return null;
  const bytes = fromBase64Url(trimmed.slice(PREFIX.length));
  if (!bytes || bytes.length < 3) return null;

  const end = bytes.length - 2;
  const sum = checksum(bytes.subarray(0, end));
  if (bytes[end] !== ((sum >> 8) & 0xff) || bytes[end + 1] !== (sum & 0xff)) return null;

  const body = bytes.subarray(1, end);
  return bytes[0] === 1 ? decompress(body) : body;
}

/** A code split into groups of eight, for reading it off a display. */
export function formatCode(code: string): string {
  return (code.match(/.{1,8}/g) ?? []).join(' ');
}

// --- LZSS ------------------------------------------------------------------

/** How far back a match may reach: 12 bits of distance. */
const WINDOW = 4096;
/** Below this a match costs more than the literals it replaces. */
const MIN_MATCH = 3;
/** 4 bits of length on top of `MIN_MATCH`. */
const MAX_MATCH = MIN_MATCH + 15;

/**
 * Literals and back-references, eight at a time behind a flag byte: bit set =
 * one literal byte, bit clear = two bytes of `distance-1` (12 bits) and
 * `length-MIN_MATCH` (4 bits).
 *
 * A config payload is at most a couple of kilobytes and this runs when a code
 * is shown, not per frame, so the match search is a plain scan backwards — a
 * hash table would be more code for time nobody notices.
 */
function compress(input: Uint8Array): Uint8Array {
  const out: number[] = [];
  let flagAt = 0;
  let flagBit = 0;

  for (let i = 0; i < input.length; ) {
    if (flagBit === 0) {
      flagAt = out.length;
      out.push(0);
      flagBit = 1;
    }
    let bestAt = -1;
    let bestLength = 0;
    for (let start = Math.max(0, i - WINDOW); start < i; start++) {
      let length = 0;
      while (
        length < MAX_MATCH &&
        i + length < input.length &&
        input[start + length] === input[i + length]
      ) {
        length++;
      }
      if (length > bestLength) {
        bestLength = length;
        bestAt = start;
      }
    }
    if (bestLength >= MIN_MATCH) {
      const distance = i - bestAt - 1;
      out.push((distance >> 4) & 0xff, ((distance & 0x0f) << 4) | (bestLength - MIN_MATCH));
      i += bestLength;
    } else {
      out[flagAt]! |= flagBit;
      out.push(input[i]!);
      i++;
    }
    flagBit = (flagBit << 1) & 0xff;
  }
  return Uint8Array.from(out);
}

function decompress(input: Uint8Array): Uint8Array {
  const out: number[] = [];
  let at = 0;
  let flags = 0;
  let flagBit = 0;

  while (at < input.length) {
    if (flagBit === 0) {
      flags = input[at++]!;
      flagBit = 1;
    }
    if (flags & flagBit) {
      if (at < input.length) out.push(input[at++]!);
    } else {
      if (at + 1 >= input.length) break;
      const high = input[at++]!;
      const low = input[at++]!;
      const distance = ((high << 4) | (low >> 4)) + 1;
      const run = (low & 0x0f) + MIN_MATCH;
      const from = out.length - distance;
      if (from < 0) break;
      // Byte by byte: a run may overlap itself, which is how "aaaa…" gets short.
      for (let k = 0; k < run; k++) out.push(out[from + k]!);
    }
    flagBit = (flagBit << 1) & 0xff;
  }
  return Uint8Array.from(out);
}

// --- bytes ----------------------------------------------------------------

/**
 * Numbers into bytes, as few as possible.
 *
 * Everything is a varint: seven bits per byte, the top bit saying "another one
 * follows". Signed values go through zigzag first (-1 → 1, 1 → 2, …), because
 * a small negative angle should cost one byte, not five.
 */
export class ByteWriter {
  private readonly out: number[] = [];

  byte(value: number): this {
    this.out.push(value & 0xff);
    return this;
  }

  /** An unsigned whole number. */
  uint(value: number): this {
    let rest = Math.max(0, Math.round(value)) >>> 0;
    while (rest >= 0x80) {
      this.out.push((rest & 0x7f) | 0x80);
      rest >>>= 7;
    }
    this.out.push(rest);
    return this;
  }

  /** A whole number that may be negative. */
  int(value: number): this {
    const rounded = Math.round(value) | 0;
    return this.uint((rounded << 1) ^ (rounded >> 31));
  }

  /** A number with `scale` steps per unit — 10 keeps one decimal. */
  fixed(value: number, scale: number): this {
    return this.int(Number.isFinite(value) ? value * scale : 0);
  }

  /** Text, as its UTF-8 bytes behind a length. */
  text(value: string): this {
    const bytes = new TextEncoder().encode(value);
    this.uint(bytes.length);
    for (const byte of bytes) this.out.push(byte);
    return this;
  }

  bytes(): Uint8Array {
    return Uint8Array.from(this.out);
  }
}

/** The other direction. Reading past the end gives zeros, never an exception. */
export class ByteReader {
  private at = 0;

  constructor(private readonly source: Uint8Array) {}

  get done(): boolean {
    return this.at >= this.source.length;
  }

  byte(): number {
    return this.at < this.source.length ? this.source[this.at++]! : 0;
  }

  uint(): number {
    let value = 0;
    let shift = 0;
    while (this.at < this.source.length) {
      const byte = this.source[this.at++]!;
      value += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
      if (shift > 42) break;
    }
    return value;
  }

  int(): number {
    const value = this.uint();
    return (value % 2 === 0 ? value / 2 : -(value + 1) / 2) | 0;
  }

  fixed(scale: number): number {
    // Rounded back onto the grid it was written on: 12.3, never 12.299999.
    return Math.round((this.int() / scale) * 1e6) / 1e6;
  }

  text(): string {
    const length = this.uint();
    const end = Math.min(this.at + length, this.source.length);
    const slice = this.source.subarray(this.at, end);
    this.at = end;
    return new TextDecoder().decode(slice);
  }
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
