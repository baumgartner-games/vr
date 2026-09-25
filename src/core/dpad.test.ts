import { dpadDirection } from './dpad';

describe('Das Steuerkreuz', () => {
  it('zeigt in acht Richtungen, immer mit voller Auslenkung', () => {
    expect(dpadDirection(40, 0)).toEqual({ x: 1, y: 0, name: 'e' });
    expect(dpadDirection(0, -40)).toEqual({ x: 0, y: -1, name: 'n' });
    expect(dpadDirection(-40, 3)).toEqual({ x: -1, y: 0, name: 'w' });
    const ne = dpadDirection(30, -28);
    expect(ne.name).toBe('ne');
    expect(Math.hypot(ne.x, ne.y)).toBeCloseTo(1);
    expect(ne.x).toBeCloseTo(Math.SQRT1_2);
    expect(ne.y).toBeCloseTo(-Math.SQRT1_2);
  });

  it('tut in der Mitte nichts', () => {
    expect(dpadDirection(5, -6)).toEqual({ x: 0, y: 0, name: '' });
  });
});
