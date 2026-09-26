import { DIR_E, DIR_N, DIR_S, DIR_W } from '../nav/navTile';
import { HALL_HALF, hubGrid } from './hubGrid';
import { HALL_WALL, archColor, hubDecor, wallPoint, yawToCentre } from './hubDecor';

describe('Die Ausstattung der Lobby', () => {
  const hub = hubGrid(4);
  const accents = [0xf2a33a, 0x65dce5, 0x39d0ff, 0x5ee0a0];
  const pieces = hubDecor(hub.corridors, accents);

  it('gibt jeder Welt einen Bogen in ihrer Farbe', () => {
    expect(archColor(0xf2a33a)).toBe('yellow');
    expect(archColor(0x65dce5)).toBe('blue');
    expect(archColor(0x39d0ff)).toBe('blue');
    expect(archColor(0x5ee0a0)).toBe('green');
    expect(archColor(0xff4d55)).toBe('red');
    expect(archColor(0x808080)).toBe('blue');
    const arches = pieces.filter((piece) => piece.corridor !== undefined);
    expect(arches.map((piece) => piece.path)).toEqual([
      'platformer/yellow/arch_tall_yellow.glb',
      'platformer/blue/arch_tall_blue.glb',
      'platformer/blue/arch_tall_blue.glb',
      'platformer/green/arch_tall_green.glb',
    ]);
  });

  it('nimmt nur Stücke aus dem Regal', () => {
    for (const piece of pieces) {
      expect(piece.path).toMatch(/^[a-z-]+\/[\w/-]+\.glb$/);
      expect(piece.height).toBeGreaterThan(0);
    }
  });

  it('stellt alles in die Halle oder in die Mündung, nichts in den Weg zur Mitte', () => {
    for (const piece of pieces) {
      expect(Math.abs(piece.x)).toBeLessThanOrEqual(HALL_WALL + 0.5);
      expect(Math.abs(piece.z)).toBeLessThanOrEqual(HALL_WALL + 0.5);
      // Die Mitte der Halle bleibt frei: Dort steht man beim Ankommen.
      expect(Math.hypot(piece.x, piece.z)).toBeGreaterThan(HALL_HALF - 1);
    }
  });

  it('lässt die Mündungen frei — außer dem Bogen darüber', () => {
    for (const piece of pieces) {
      if (piece.corridor !== undefined) continue;
      const onAxis = Math.min(Math.abs(piece.x), Math.abs(piece.z));
      const nearWall = Math.max(Math.abs(piece.x), Math.abs(piece.z)) > HALL_HALF - 1;
      // Ein Stück an der Wand steht nie vor einer offenen Gangmündung (±1,5 m).
      if (nearWall) expect(onAxis).toBeGreaterThanOrEqual(1.5);
    }
  });

  it('dreht alles, was an einer Wand steht, zur Mitte', () => {
    expect(yawToCentre(DIR_N)).toBeCloseTo(0);
    expect(Math.abs(yawToCentre(DIR_S))).toBeCloseTo(Math.PI);
    expect(yawToCentre(DIR_E)).toBeCloseTo(-Math.PI / 2);
    expect(yawToCentre(DIR_W)).toBeCloseTo(Math.PI / 2);
    // Norden ist −Z, rechts davon Osten (+X).
    const north = wallPoint(DIR_N, 5, 2);
    expect(north.x).toBeCloseTo(2);
    expect(north.z).toBeCloseTo(-5);
  });

  it('legt bei gleicher Eingabe immer dasselbe hin', () => {
    expect(hubDecor(hub.corridors, accents)).toEqual(pieces);
  });
});
