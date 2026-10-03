import { BOARD, paletteSpots } from './PaintPaletteTool';
import { slotOfKey } from '../paletteBar';

describe('die Malpalette als Werkzeug', () => {
  it('hat ihre neun Fächer und den Knopf auf dem Brett', () => {
    const spots = paletteSpots();
    expect(spots).toHaveLength(10);
    for (const spot of spots) {
      // Mit Rand: Der Klecks unter einem Ding liegt ganz auf dem Holz.
      const dx = (spot.x - BOARD.x) / (BOARD.rx - 0.03);
      const dz = (spot.z - BOARD.z) / (BOARD.rz - 0.03);
      expect(dx * dx + dz * dz).toBeLessThanOrEqual(1);
    }
  });

  it('liest die Ziffern 1–9 als Fächer', () => {
    expect(slotOfKey('Digit1')).toBe(0);
    expect(slotOfKey('Numpad9')).toBe(8);
    expect(slotOfKey('Digit0')).toBe(-1);
    expect(slotOfKey('KeyA')).toBe(-1);
  });
});
