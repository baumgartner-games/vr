import {
  START_POINTS,
  addPoint,
  decodePov,
  encodePov,
  fullOutline,
  items,
  movePoint,
  polyline,
  removePoint,
} from './povCalibration';

describe('VR-POV kalibrieren', () => {
  it('fängt mit einem Rechteck aus einem Eckpunkt an', () => {
    expect(START_POINTS).toHaveLength(1);
    const outline = fullOutline(START_POINTS);
    const { az, el } = START_POINTS[0]!;
    for (const corner of [
      [az, el],
      [az, -el],
      [-az, -el],
      [-az, el],
    ]) {
      expect(outline).toContainEqual(corner);
    }
  });

  it('bietet die Mitte jeder Kante zum Hinzufügen an, abwechselnd mit den Punkten', () => {
    const list = items(START_POINTS);
    expect(list.map((item) => item.kind)).toEqual(['add', 'point', 'add']);
    expect(list[0]!.at).toEqual({ az: 15, el: 25 });
    expect(list[2]!.at).toEqual({ az: 30, el: 12.5 });
  });

  it('teilt eine Kante mit A und nimmt den Punkt mit B wieder weg', () => {
    const added = addPoint(START_POINTS, items(START_POINTS)[2]!);
    expect(added).toEqual([
      { az: 30, el: 25 },
      { az: 30, el: 12.5 },
    ]);
    expect(items(added).map((item) => item.kind)).toEqual(['add', 'point', 'add', 'point', 'add']);
    expect(polyline(added).at(-1)).toEqual({ az: 30, el: 0 });
    expect(removePoint(added, 0)).toEqual([{ az: 30, el: 12.5 }]);
    // Der letzte bleibt.
    expect(removePoint(START_POINTS, 0)).toEqual([...START_POINTS]);
  });

  it('verschiebt einen Punkt in den Grenzen', () => {
    expect(movePoint(START_POINTS, 0, 5, -3)).toEqual([{ az: 35, el: 22 }]);
    expect(movePoint(START_POINTS, 0, -100, 100)).toEqual([{ az: 0, el: 90 }]);
  });

  it('macht einen Code zum Abtippen und liest ihn zurück', () => {
    const points = [
      { az: 40, el: 35 },
      { az: 38.5, el: 12 },
      { az: 33, el: 0.5 },
    ];
    const code = encodePov(points);
    expect(code).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{1,4})+$/);
    expect(code).not.toMatch(/[ILOU]/);
    expect(decodePov(code)).toEqual(points);
    // Abgetippt: klein, mit Leerzeichen, I statt 1, O statt 0.
    const typed = code.toLowerCase().replace(/-/g, ' ').replace(/1/g, 'i').replace(/0/g, 'o');
    expect(decodePov(typed)).toEqual(points);
    expect(encodePov(START_POINTS).length).toBeLessThanOrEqual(9);
  });

  it('merkt einen Tippfehler', () => {
    const code = encodePov(START_POINTS);
    const wrong = code.slice(0, 3) + (code[3] === 'A' ? 'B' : 'A') + code.slice(4);
    expect(decodePov(wrong)).toBeNull();
    expect(decodePov('kein code')).toBeNull();
  });
});
