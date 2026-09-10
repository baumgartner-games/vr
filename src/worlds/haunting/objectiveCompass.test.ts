import {
  bearingOf,
  cardinalMarks,
  compassMarks,
  compassOffset,
  wrapAngle,
} from './objectiveCompass';

describe('objectiveCompass', () => {
  test('ein Ziel geradeaus steht in der Mitte, eines rechts rechts, eines hinten am Rand', () => {
    const at = { x: 0, z: 0 };
    // Blick nach Norden (-z). Ein Ziel im Norden: Mitte.
    expect(compassOffset(0, bearingOf(at, { x: 0, z: -10 }))).toEqual({ offset: 0, behind: false });
    // Ein Ziel im Osten (+x) liegt rechts.
    const east = compassOffset(0, bearingOf(at, { x: 10, z: 0 }));
    expect(east.offset).toBeCloseTo(1);
    expect(east.behind).toBe(false);
    // Im Westen links.
    expect(compassOffset(0, bearingOf(at, { x: -10, z: 0 })).offset).toBeCloseTo(-1);
    // Hinten: am Rand geklemmt, und als hinten markiert.
    const south = compassOffset(0, bearingOf(at, { x: 1, z: 10 }));
    expect(Math.abs(south.offset)).toBe(1);
    expect(south.behind).toBe(true);
  });

  test('die Blickrichtung dreht den Streifen mit', () => {
    const at = { x: 0, z: 0 };
    // Blick nach Osten (yaw -π/2): Ein Ziel im Osten steht in der Mitte.
    expect(compassOffset(-Math.PI / 2, bearingOf(at, { x: 10, z: 0 })).offset).toBeCloseTo(0);
    // Und Norden liegt dann links.
    const north = cardinalMarks(-Math.PI / 2).find((m) => m.label === 'N')!;
    expect(north.offset).toBeCloseTo(-1);
    expect(
      cardinalMarks(-Math.PI / 2)
        .map((m) => m.label)
        .sort(),
    ).toEqual(['N', 'O', 'S']);
  });

  test('wrapAngle bleibt in [-π, π]', () => {
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-Math.PI * 2.5)).toBeCloseTo(-Math.PI / 2);
    expect(wrapAngle(0.3)).toBeCloseTo(0.3);
  });

  test('compassMarks nennt Entfernung und das nächste Ziel', () => {
    const marks = compassMarks(0, { x: 0, z: 0 }, [
      { id: 'a', at: { x: 3, z: -4 }, label: 'A', next: true },
      { id: 'b', at: { x: 0, z: 10 }, label: 'B', next: false },
    ]);
    expect(marks[0]).toMatchObject({ id: 'a', distance: 5, next: true, behind: false });
    expect(marks[1]).toMatchObject({ id: 'b', distance: 10, next: false, behind: true });
  });
});
