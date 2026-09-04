import {
  ByteReader,
  ByteWriter,
  CODE_VERSION,
  formatCode,
  packCode,
  unpackCode,
} from './configCode';

describe('packCode/unpackCode', () => {
  const payload = Uint8Array.from([0, 1, 2, 250, 255, 7, 7, 7]);

  it('gives the very same bytes back', () => {
    expect(Array.from(unpackCode(packCode(payload))!.payload)).toEqual(Array.from(payload));
  });

  it('says whose code it is, so a wrong paste is caught at a glance', () => {
    expect(packCode(payload).startsWith(`BG${CODE_VERSION}`)).toBe(true);
  });

  /**
   * Die Version steht im Prefix, nicht im Payload — das spart das Byte, und
   * ein Leser weiß vor dem ersten Byte, wie er zu lesen hat.
   */
  it('carries its format version in the prefix, and gives it back', () => {
    expect(unpackCode(packCode(payload))!.version).toBe(CODE_VERSION);
    expect(unpackCode(packCode(payload, 2))!.version).toBe(2);
    expect(packCode(payload, 2).startsWith('BG2')).toBe(true);
  });

  it('survives being read out loud in groups', () => {
    const code = packCode(payload);
    expect(Array.from(unpackCode(formatCode(code))!.payload)).toEqual(Array.from(payload));
    expect(formatCode(code).replace(/ /g, '')).toBe(code);
  });

  it('refuses what is not one of ours', () => {
    expect(unpackCode('')).toBeNull();
    expect(unpackCode('hallo')).toBeNull();
    expect(unpackCode('BG3')).toBeNull();
    expect(unpackCode('BG3!!!!')).toBeNull();
    // Ohne Versionsziffer ist es keiner unserer Codes.
    expect(unpackCode('BGAAAA')).toBeNull();
  });

  it('refuses a code with a typo in it', () => {
    const code = packCode(payload);
    const at = 5;
    const swapped = code[at] === 'A' ? 'B' : 'A';
    const broken = code.slice(0, at) + swapped + code.slice(at + 1);
    expect(broken).not.toBe(code);
    expect(unpackCode(broken)).toBeNull();
  });

  it('refuses a truncated code', () => {
    const code = packCode(payload);
    expect(unpackCode(code.slice(0, code.length - 4))).toBeNull();
  });

  it('is deterministic — the same bytes always read the same', () => {
    expect(packCode(payload)).toBe(packCode(payload));
  });
});

describe('ByteWriter/ByteReader', () => {
  it('round-trips whole numbers, signed and unsigned', () => {
    const values = [0, 1, 127, 128, 300, 65535, 1234567, -1, -127, -128, -100000];
    const out = new ByteWriter();
    for (const value of values) out.int(value);
    const input = new ByteReader(out.bytes());
    expect(values.map(() => input.int())).toEqual(values);
  });

  it('spends one byte on a small number', () => {
    expect(new ByteWriter().int(0).bytes().length).toBe(1);
    expect(new ByteWriter().int(-12).bytes().length).toBe(1);
    expect(new ByteWriter().uint(127).bytes().length).toBe(1);
  });

  it('keeps a value on the grid it was written on', () => {
    const out = new ByteWriter().fixed(-1.2, 10).fixed(3.45, 100).fixed(0.06, 1000);
    const input = new ByteReader(out.bytes());
    expect(input.fixed(10)).toBe(-1.2);
    expect(input.fixed(100)).toBe(3.45);
    expect(input.fixed(1000)).toBe(0.06);
  });

  it('round-trips text with umlauts and punctuation', () => {
    const text = 'Röntgen-Scanner · 30° · „Kimme und Korn"';
    const input = new ByteReader(new ByteWriter().text(text).bytes());
    expect(input.text()).toBe(text);
  });

  it('reads zeros past the end instead of throwing', () => {
    const input = new ByteReader(Uint8Array.from([]));
    expect(input.done).toBe(true);
    expect(input.byte()).toBe(0);
    expect(input.uint()).toBe(0);
    expect(input.int()).toBe(0);
    expect(input.text()).toBe('');
  });
});
