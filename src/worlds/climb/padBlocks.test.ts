import { PAD_HEIGHT, type PadRect } from './crashPad';
import { PAD_BLOCK_AIM, PAD_BLOCK_LAYERS, padBlockField } from './padBlocks';

/** Das Kissen der Kletterwand, in seinen eigenen Maßen: 8 × 3 m. */
const PAD: PadRect = { minX: 24 + 1, maxX: 24 + 10 - 1, minZ: 10, maxZ: 13 };

describe('Das Kissen als Feld aus Klötzen', () => {
  it('teilt 8 × 3 m ohne Rest in Klötze von einem Meter', () => {
    const field = padBlockField(PAD, PAD_HEIGHT);
    expect(field.cols).toBe(8);
    expect(field.rows).toBe(3);
    expect(field.layers).toBe(PAD_BLOCK_LAYERS);
    expect(field.size.x).toBeCloseTo(PAD_BLOCK_AIM);
    expect(field.size.z).toBeCloseTo(PAD_BLOCK_AIM);
    expect(field.spots).toHaveLength(8 * 3 * 2);
  });

  it('legt zwei Lagen zu 70 cm übereinander — zusammen die volle Dicke', () => {
    const field = padBlockField(PAD, PAD_HEIGHT);
    expect(field.size.y).toBeCloseTo(0.7);
    const heights = [...new Set(field.spots.map((spot) => spot.y))].sort((a, b) => a - b);
    expect(heights).toHaveLength(2);
    expect(heights[0]! - field.size.y / 2).toBeCloseTo(-PAD_HEIGHT / 2);
    expect(heights[1]! + field.size.y / 2).toBeCloseTo(PAD_HEIGHT / 2);
  });

  it('füllt das Rechteck lückenlos aus und steht nirgends über', () => {
    const field = padBlockField(PAD, PAD_HEIGHT);
    const half = { x: field.size.x / 2, z: field.size.z / 2 };
    const minX = Math.min(...field.spots.map((spot) => spot.x - half.x));
    const maxX = Math.max(...field.spots.map((spot) => spot.x + half.x));
    const minZ = Math.min(...field.spots.map((spot) => spot.z - half.z));
    const maxZ = Math.max(...field.spots.map((spot) => spot.z + half.z));
    // Gerechnet wird um die Mitte des Quaders — genau dort hängt das Bündel.
    expect(minX).toBeCloseTo(-(PAD.maxX - PAD.minX) / 2);
    expect(maxX).toBeCloseTo((PAD.maxX - PAD.minX) / 2);
    expect(minZ).toBeCloseTo(-(PAD.maxZ - PAD.minZ) / 2);
    expect(maxZ).toBeCloseTo((PAD.maxZ - PAD.minZ) / 2);
  });

  it('stellt keine zwei Klötze auf denselben Platz', () => {
    const field = padBlockField(PAD, PAD_HEIGHT);
    const seen = new Set(
      field.spots.map((spot) => `${spot.x.toFixed(4)}|${spot.y.toFixed(4)}|${spot.z.toFixed(4)}`),
    );
    expect(seen.size).toBe(field.spots.length);
  });

  it('rundet auf ganze Klötze und lässt keinen Streifen offen', () => {
    // 8,40 m gehen nicht in Meter auf: acht Klötze zu 1,05 m, nicht acht zu
    // einem Meter mit vierzig Zentimetern daneben.
    const wide = padBlockField({ minX: 0, maxX: 8.4, minZ: 0, maxZ: 3 }, PAD_HEIGHT);
    expect(wide.cols).toBe(8);
    expect(wide.size.x).toBeCloseTo(1.05);
    expect(wide.cols * wide.size.x).toBeCloseTo(8.4);
  });

  it('kommt auch mit einer einzigen Lage und mit einem Kissen ohne Fläche aus', () => {
    const one = padBlockField(PAD, PAD_HEIGHT, 1);
    expect(one.layers).toBe(1);
    expect(one.size.y).toBeCloseTo(PAD_HEIGHT);
    expect(one.spots).toHaveLength(24);
    expect(one.spots[0]!.y).toBeCloseTo(0);

    const none = padBlockField({ minX: 5, maxX: 5, minZ: 5, maxZ: 5 }, 0);
    expect(none.spots).toHaveLength(1 * 1 * PAD_BLOCK_LAYERS);
    expect(none.size).toEqual({ x: 0, y: 0, z: 0 });
  });
});
