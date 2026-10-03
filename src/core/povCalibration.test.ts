import {
  START_POINTS,
  START_SAFE,
  addPoint,
  decodePov,
  decodePovConfig,
  encodePov,
  fullOutline,
  items,
  movePoint,
  polyline,
  rectOutline,
  removePoint,
  type PovPoint,
} from './povCalibration';

/** Ein Rechteck aus einem Eckpunkt — so fing das Kalibrieren einmal an. */
const RECT: readonly PovPoint[] = [{ az: 30, el: 25 }];

describe('VR-POV kalibrieren', () => {
  it('macht aus einem Eckpunkt ein Rechteck', () => {
    const outline = fullOutline(RECT);
    for (const corner of [
      [30, 25],
      [30, -25],
      [-30, -25],
      [-30, 25],
    ]) {
      expect(outline).toContainEqual(corner);
    }
    expect(rectOutline(START_SAFE)).toContainEqual([-START_SAFE.az, -START_SAFE.el]);
  });

  it('bietet die Mitte jeder Kante zum Hinzufügen an, abwechselnd mit den Punkten', () => {
    const list = items(RECT);
    expect(list.map((item) => item.kind)).toEqual(['add', 'point', 'add']);
    expect(list[0]!.at).toEqual({ az: 15, el: 25 });
    expect(list[2]!.at).toEqual({ az: 30, el: 12.5 });
    // Mit sicherem Bereich steht seine Ecke am Ende der Reihe.
    expect(items(RECT, START_SAFE).at(-1)).toEqual({ kind: 'safe', index: 0, at: START_SAFE });
  });

  it('teilt eine Kante mit A und nimmt den Punkt mit B wieder weg', () => {
    const added = addPoint(RECT, items(RECT)[2]!);
    expect(added).toEqual([
      { az: 30, el: 25 },
      { az: 30, el: 12.5 },
    ]);
    expect(items(added).map((item) => item.kind)).toEqual(['add', 'point', 'add', 'point', 'add']);
    expect(polyline(added).at(-1)).toEqual({ az: 30, el: 0 });
    expect(removePoint(added, 0)).toEqual([{ az: 30, el: 12.5 }]);
    expect(removePoint(RECT, 0)).toEqual([...RECT]);
  });

  it('verschiebt einen Punkt in den Grenzen', () => {
    expect(movePoint(RECT, 0, 5, -3)).toEqual([{ az: 35, el: 22 }]);
    expect(movePoint(RECT, 0, -100, 100)).toEqual([{ az: 0, el: 90 }]);
  });

  it('fängt mit dem eingestellten Rand der Quest 3 an', () => {
    expect(decodePov('P180-4250-D260-Z261-F201-Y1K2-7122-B0J2-D03K')).toEqual(START_POINTS);
  });

  it('macht einen Code zum Abtippen und liest ihn zurück', () => {
    const points = [
      { az: 40, el: 35 },
      { az: 38.5, el: 12 },
      { az: 33, el: 0.5 },
    ];
    const code = encodePov(points);
    expect(code).toMatch(/^P1[0-9A-Z]{2}(-[0-9A-Z]{1,4})+$/);
    expect(code).not.toMatch(/[ILOU]/);
    expect(decodePov(code)).toEqual(points);
    const typed = code.toLowerCase().replace(/-/g, ' ').replace(/1/g, 'i').replace(/0/g, 'o');
    expect(decodePov(typed)).toEqual(points);
    expect(encodePov(RECT).length).toBeLessThanOrEqual(9);
  });

  it('nimmt die Ecke des sicheren Bereichs mit in den Code', () => {
    const code = encodePov(START_POINTS, START_SAFE);
    expect(code.startsWith('P2')).toBe(true);
    expect(decodePovConfig(code)).toEqual({ points: START_POINTS, safe: START_SAFE });
    // Ein alter Code ohne Ecke geht weiter.
    expect(decodePovConfig(encodePov(RECT))).toEqual({ points: RECT, safe: null });
  });

  it('merkt einen Tippfehler', () => {
    const code = encodePov(RECT);
    const wrong = code.slice(0, 3) + (code[3] === 'A' ? 'B' : 'A') + code.slice(4);
    expect(decodePov(wrong)).toBeNull();
    expect(decodePov('kein code')).toBeNull();
    // So kam er zuerst: ein Zeichen falsch, die Prüfsumme merkt es.
    expect(decodePov('P180-4250-D260-Z261-F201-D1K2-7122-B0J2-D03K')).toBeNull();
  });
});
