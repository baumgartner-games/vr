import { archParts } from './PhysicsWorld';

/** **Ein Durchgang ist ein Bogen** — zwei Pfosten und ein Sturz, dazwischen frei. */
describe('Die Teile eines Bogens', () => {
  it('lässt die Öffnung frei und schließt oben', () => {
    // Ein Durchgang von 1 m Breite, 2,8 m Höhe, 0,27 m Tiefe; Öffnung 0,8 m, 2,1 m hoch.
    const parts = archParts({ open: 0.8, top: 0.75, along: 'x' }, { x: 0.5, y: 1.4, z: 0.135 });
    expect(parts).toHaveLength(3);
    const [lintel, left, right] = parts;
    // Der Sturz beginnt auf 2,1 m (von unten, also 0,7 über der Mitte).
    expect(lintel!.at.y - lintel!.half.y).toBeCloseTo(0.7, 6);
    expect(lintel!.at.y + lintel!.half.y).toBeCloseTo(1.4, 6);
    // Die Pfosten stehen außerhalb der Öffnung von ±0,4 m.
    expect(left!.at.x + left!.half.x).toBeCloseTo(-0.4, 6);
    expect(right!.at.x - right!.half.x).toBeCloseTo(0.4, 6);
  });

  it('dreht mit, wenn der Bogen längs z steht', () => {
    const [lintel] = archParts({ open: 0.9, top: 0.75, along: 'z' }, { x: 0.135, y: 1.4, z: 1 });
    expect(lintel!.half.z).toBeCloseTo(0.9, 6);
    expect(lintel!.half.x).toBeCloseTo(0.135, 6);
  });
});
