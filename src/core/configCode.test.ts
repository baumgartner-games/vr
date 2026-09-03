import { decode, encode, formatCode } from './configCode';

/** A configuration of the size the game actually produces. */
const CONFIG = {
  v: 1,
  tools: {
    pistol: { x: 0, y: -1.2, z: 3, pitch: -12, yaw: 0, roll: 0 },
    xray: { x: 0, y: 2, z: -2, pitch: 0, yaw: 0, roll: 0 },
    'gun-blue': { x: 0.5, y: -1.2, z: 3, pitch: -8, yaw: 2, roll: 0 },
  },
  hands: {
    left: {
      idle: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0, curls: [0.1, 0.08, 0.08, 0.1, 0.12] },
      hold: {
        pistol: { x: 0, y: -1, z: 1, pitch: 5, yaw: 0, roll: 0, curls: [0.6, 0.2, 0.9, 0.95, 0.95] },
      },
    },
    right: {
      idle: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0, curls: [0.1, 0.08, 0.08, 0.1, 0.12] },
      hold: {},
    },
  },
  attachments: {
    'pistol:reddot': { x: 0, y: 3.4, z: -4, pitch: 0, yaw: 0, roll: 0 },
    'pistol:irons': { x: 0, y: 3.2, z: -8, pitch: 0, yaw: 0, roll: 0 },
  },
  weapon: {
    mass: 0.14,
    speed: 45,
    rate: 9,
    magazine: 12,
    reload: 1.15,
    burst: 3,
    mode: 'burst',
    ammo: 'tracer',
    sight: 'reddot',
  },
};

describe('encode/decode', () => {
  it('gives the very same object back', () => {
    const code = encode(CONFIG);
    expect(decode(code)).toEqual(CONFIG);
  });

  it('makes the line markedly shorter than the raw JSON', () => {
    const code = encode(CONFIG);
    const raw = JSON.stringify(CONFIG);
    expect(code.length).toBeLessThan(raw.length * 0.7);
    // And it says whose code it is, so a wrong paste is caught at a glance.
    expect(code.startsWith('BGVR1')).toBe(true);
  });

  it('turns the repetition JSON is made of into almost nothing', () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({
      id: `tool-${i}`,
      pose: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 },
    }));
    const code = encode(rows);
    expect(code.length).toBeLessThan(JSON.stringify(rows).length * 0.12);
    expect(decode(code)).toEqual(rows);
  });

  it('round-trips the small and awkward values too', () => {
    for (const value of [
      {},
      { a: [] },
      { nested: { deep: { deeper: [1, 2, 3, { x: null }] } } },
      { negative: -12.5, zero: 0, big: 1234567.25, exp: 1e-7 },
      { text: 'Röntgen-Scanner · 30° · „Kimme und Korn"' },
      { repeated: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
      { list: Array.from({ length: 200 }, (_, i) => ({ id: `tool-${i}`, pose: [i, -(i + 1), 0] })) },
      true,
      42,
      'plain string',
      null,
    ]) {
      expect(decode(encode(value))).toEqual(value);
    }
  });

  it('is deterministic — the same settings always read the same', () => {
    expect(encode(CONFIG)).toBe(encode(CONFIG));
  });

  it('survives being read out loud in groups', () => {
    const code = encode(CONFIG);
    expect(decode(formatCode(code))).toEqual(CONFIG);
    expect(formatCode(code).replace(/ /g, '')).toBe(code);
  });

  it('refuses what is not one of ours', () => {
    expect(decode('')).toBeNull();
    expect(decode('hallo')).toBeNull();
    expect(decode('BGVR1')).toBeNull();
    expect(decode('BGVR1!!!!')).toBeNull();
  });

  it('refuses a code with a typo in it', () => {
    const code = encode(CONFIG);
    // Swap one character in the body for another from the same alphabet.
    const at = 12;
    const swapped = code[at] === 'A' ? 'B' : 'A';
    const broken = code.slice(0, at) + swapped + code.slice(at + 1);
    expect(broken).not.toBe(code);
    expect(decode(broken)).toBeNull();
  });

  it('refuses a truncated code', () => {
    const code = encode(CONFIG);
    expect(decode(code.slice(0, code.length - 4))).toBeNull();
  });
});
