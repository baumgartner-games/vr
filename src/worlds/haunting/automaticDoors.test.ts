import { AutomaticDoors } from './automaticDoors';

describe('automatic station doors', () => {
  for (const alongX of [true, false]) {
    const at = { x: 10, z: 20, alongX };
    const approach = (distance: number) =>
      alongX ? { x: 10, z: 20 + distance } : { x: 10 + distance, z: 20 };
    it(`opens from both sides and holds clear of the player (${alongX})`, () => {
      const doors = new AutomaticDoors();
      for (const side of [-1, 1]) {
        expect(doors.step('a', at, false, [approach(side * 2.8)], 0.1)).toBe(true);
        expect(doors.step('a', at, false, [approach(side * 0.2)], 0.1)).toBe(true);
      }
      for (let i = 0; i < 14; i++) doors.step('a', at, false, [], 0.1);
      expect(doors.isOpen('a')).toBe(false);
    });
    it(`never crushes a crossing player but obeys a lock once clear (${alongX})`, () => {
      const doors = new AutomaticDoors();
      doors.step('a', at, false, [approach(-2)], 0.1);
      expect(doors.step('a', at, true, [approach(0.1)], 0.1)).toBe(true);
      expect(doors.step('a', at, true, [approach(1.2)], 0.1)).toBe(false);
      expect(doors.step('a', at, true, [approach(-2)], 0.1)).toBe(false);
    });
  }
  it('ignores actors above the ceiling, and resets between rounds', () => {
    const doors = new AutomaticDoors();
    const at = { x: 0, z: 0, alongX: true };
    expect(doors.step('a', at, false, [{ x: 0, y: 8, z: 1 }], 1)).toBe(false);
    expect(doors.step('a', at, false, [{ x: 0, y: 2.1, z: 1 }], 0.1)).toBe(true);
    doors.clear();
    expect(doors.isOpen('a')).toBe(false);
  });
});
