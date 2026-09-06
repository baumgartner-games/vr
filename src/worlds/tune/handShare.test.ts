import { packHandShare, parseHandShare, type HandShare } from './handShare';

const SHARE: HandShare = {
  hand: 'left',
  toolId: 'pistol',
  at: [1.7, 2.4, 2.7, -43, -17, -90],
  curls: [0.55, 0.1, 0.85, 0.9, 0.9],
  spread: 4,
  code: 'BPKGSwKKT7nssF8',
  saved: true,
};

describe('handShare', () => {
  it('kommt an, wie es losgeschickt wurde', () => {
    expect(parseHandShare(packHandShare(SHARE))).toEqual(SHARE);
  });

  it('trägt auch die blanke Hand', () => {
    const bare: HandShare = { ...SHARE, toolId: null, hand: 'right', saved: false };
    expect(parseHandShare(packHandShare(bare))).toEqual(bare);
  });

  it('rundet, statt zwanzig Nachkommastellen zu verschicken', () => {
    const packed = packHandShare({ ...SHARE, at: [1 / 3, 0, 0, 0, 0, 0] });
    expect((packed['a'] as number[])[0]).toBe(0.33);
  });

  it('verwirft, was keine Haltung ist', () => {
    expect(parseHandShare(null)).toBeNull();
    expect(parseHandShare('BP…')).toBeNull();
    expect(parseHandShare([1, 2, 3])).toBeNull();
    expect(parseHandShare({})).toBeNull();
  });

  it('verwirft eine Pose, der eine Zahl fehlt', () => {
    const packed = packHandShare(SHARE);
    expect(parseHandShare({ ...packed, a: [1, 2, 3] })).toBeNull();
    expect(parseHandShare({ ...packed, c: [0.1, 0.2] })).toBeNull();
    expect(parseHandShare({ ...packed, a: [1, 2, 3, 4, 5, 'sechs'] })).toBeNull();
  });

  it('verwirft eine Zeile, die für einen Code viel zu lang ist', () => {
    const packed = packHandShare({ ...SHARE, code: 'B'.repeat(500) });
    expect(parseHandShare(packed)).toBeNull();
  });

  it('hält die Krümmungen in ihrem Bereich', () => {
    const packed = packHandShare({ ...SHARE, curls: [-3, 4, 0.5, 0.5, 0.5] });
    expect(parseHandShare(packed)?.curls).toEqual([0, 1, 0.5, 0.5, 0.5]);
  });
});
