import { fitPaper, onPaper, onPaperLength } from './mapPaper';

const BOX = { minX: -10, maxX: 10, minZ: -5, maxZ: 5 };

describe('fitPaper', () => {
  it('legt die Mitte des Plans in die Mitte des Blattes', () => {
    const paper = fitPaper(BOX, 400, 300);
    const middle = onPaper(paper, 0, 0);
    expect(middle.x).toBeCloseTo(200);
    expect(middle.y).toBeCloseTo(150);
  });

  it('nimmt für beide Achsen denselben Maßstab', () => {
    // Sonst sähe ein quadratisches Zimmer auf einem breiten Blatt aus wie ein
    // Flur.
    const paper = fitPaper(BOX, 400, 300, 0);
    const along = onPaperLength(paper, 1);
    expect(onPaper(paper, 1, 1).x - onPaper(paper, 0, 0).x).toBeCloseTo(along);
    expect(onPaper(paper, 1, 1).y - onPaper(paper, 0, 0).y).toBeCloseTo(along);
  });

  it('füllt das Blatt bis auf den Rand — in der engeren Richtung', () => {
    const paper = fitPaper(BOX, 400, 300, 10);
    // 20 m auf 380 Pixel sind 19 Pixel je Meter; 10 m brauchen davon 190 und
    // passen in die 280 der Höhe. Also entscheidet die Breite.
    expect(paper.scale).toBeCloseTo(19);
    expect(onPaper(paper, BOX.minX, 0).x).toBeCloseTo(10);
    expect(onPaper(paper, BOX.maxX, 0).x).toBeCloseTo(390);
  });

  it('legt Norden nach oben', () => {
    const paper = fitPaper(BOX, 400, 300);
    // −Z ist vorn und damit Norden; auf dem Blatt ist oben das kleinere y.
    expect(onPaper(paper, 0, -5).y).toBeLessThan(onPaper(paper, 0, 5).y);
  });

  it('stürzt an einem leeren Plan nicht ab', () => {
    const paper = fitPaper({ minX: 0, maxX: 0, minZ: 0, maxZ: 0 }, 400, 300);
    expect(Number.isFinite(paper.scale)).toBe(true);
    expect(Number.isFinite(onPaper(paper, 0, 0).x)).toBe(true);
  });

  it('lässt sich von einem Blatt kleiner als sein Rand nicht kippen', () => {
    const paper = fitPaper(BOX, 10, 10, 40);
    expect(paper.scale).toBeGreaterThan(0);
    expect(Number.isFinite(paper.scale)).toBe(true);
  });
});
