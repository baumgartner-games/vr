import { TOAST_GAP, TOAST_MAX_WIDTH, toastPlace, toastSeconds } from './shipToast';

const rect = (left: number, top: number, right: number, bottom: number) => ({
  left,
  top,
  right,
  bottom,
});

describe('toastPlace', () => {
  /** Desktop: Die Tafel steht links, daneben ist Platz — die Meldung steht dort, oben. */
  it('steht am Desktop neben der Tafel, unter dem Kompass', () => {
    const panel = rect(16, 12, 436, 150);
    const compass = rect(360, 12, 920, 50);
    const spot = toastPlace({ width: 1280, height: 800 }, 12, panel, [
      compass,
      rect(260, 730, 1020, 790),
    ]);
    expect(spot.left).toBeGreaterThanOrEqual(panel.right + TOAST_GAP);
    expect(spot.width).toBe(TOAST_MAX_WIDTH);
    expect(spot.top).toBe(compass.bottom + TOAST_GAP);
  });

  /** Telefon hochkant: Die Tafel geht über die ganze Breite — die Meldung darunter. */
  it('steht am Telefon hochkant unter der Tafel', () => {
    const panel = rect(8, 12, 382, 170);
    const spot = toastPlace({ width: 390, height: 844 }, 12, panel, [rect(300, 508, 366, 570)]);
    expect(spot.top).toBe(panel.bottom + TOAST_GAP);
    expect(spot.left).toBeGreaterThanOrEqual(TOAST_GAP);
    expect(spot.left + spot.width).toBeLessThanOrEqual(390 - TOAST_GAP);
  });

  /**
   * Telefon quer: rechts neben der Tafel, unter der Tastenhilfe oben und
   * links vom Zielstock und `A` — über keinem davon.
   */
  it('steht am Telefon quer zwischen Tafel und Knöpfen, unter der Tastenhilfe', () => {
    const panel = rect(16, 12, 436, 140);
    const hints = rect(480, 56, 745, 90);
    const aim = rect(674, 128, 740, 194);
    const tool = rect(758, 55, 820, 115);
    const spot = toastPlace({ width: 844, height: 390 }, 12, panel, [hints, aim, tool]);
    expect(spot.left).toBeGreaterThanOrEqual(panel.right + TOAST_GAP);
    expect(spot.left + spot.width).toBeLessThanOrEqual(aim.left - TOAST_GAP);
    expect(spot.top).toBe(hints.bottom + TOAST_GAP);
  });

  it('steht ohne Tafel und Kompass oben mittig', () => {
    const spot = toastPlace({ width: 1000, height: 700 }, 12, null);
    expect(spot.left + spot.width / 2).toBe(500);
    expect(spot.top).toBe(12);
  });
});

describe('toastSeconds', () => {
  it('zeigt zwei bis drei Sekunden', () => {
    expect(toastSeconds('Leer.')).toBeGreaterThanOrEqual(2);
    expect(toastSeconds('x'.repeat(400))).toBe(3);
  });
});
