import { pointOnCanvas, rayOnCanvas } from './paintCanvas';

const W = 0.7;
const H = 0.9;

describe('pointOnCanvas', () => {
  it('legt die Mitte auf die Mitte und dreht v nach unten', () => {
    expect(pointOnCanvas({ x: 0, y: 0, z: 0 }, W, H, 0.03)).toEqual({
      u: 0.5,
      v: 0.5,
      distance: 0,
    });
    // Oben im Blatt ist +y — und v zählt von oben, also klein.
    const top = pointOnCanvas({ x: 0, y: H / 2, z: 0 }, W, H, 0.03)!;
    expect(top.v).toBeCloseTo(0, 6);
    const left = pointOnCanvas({ x: -W / 2, y: 0, z: 0 }, W, H, 0.03)!;
    expect(left.u).toBeCloseTo(0, 6);
  });

  it('lässt die Spitze von beiden Seiten heran, aber nur so tief wie erlaubt', () => {
    expect(pointOnCanvas({ x: 0, y: 0, z: 0.02 }, W, H, 0.03)).not.toBeNull();
    expect(pointOnCanvas({ x: 0, y: 0, z: -0.02 }, W, H, 0.03)).not.toBeNull();
    expect(pointOnCanvas({ x: 0, y: 0, z: 0.05 }, W, H, 0.03)).toBeNull();
  });

  it('malt nicht neben das Blatt', () => {
    expect(pointOnCanvas({ x: W, y: 0, z: 0 }, W, H, 0.03)).toBeNull();
    expect(pointOnCanvas({ x: 0, y: H, z: 0 }, W, H, 0.03)).toBeNull();
  });
});

describe('rayOnCanvas', () => {
  it('trifft die Mitte, wenn er gerade darauf zeigt', () => {
    const hit = rayOnCanvas({ x: 0, y: 0, z: 1.5 }, { x: 0, y: 0, z: -1 }, W, H, 4)!;
    expect(hit.u).toBeCloseTo(0.5, 6);
    expect(hit.v).toBeCloseTo(0.5, 6);
    expect(hit.distance).toBeCloseTo(1.5, 6);
  });

  it('trifft sie auch von hinten — eine Staffelei hat zwei Seiten', () => {
    const hit = rayOnCanvas({ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 1 }, W, H, 4);
    expect(hit).not.toBeNull();
  });

  it('zählt nicht, was hinter dem Rücken liegt oder zu weit weg ist', () => {
    // Der Strahl zeigt von der Leinwand weg.
    expect(rayOnCanvas({ x: 0, y: 0, z: 1.5 }, { x: 0, y: 0, z: 1 }, W, H, 4)).toBeNull();
    // Sie liegt weiter weg, als der Pinsel reicht.
    expect(rayOnCanvas({ x: 0, y: 0, z: 9 }, { x: 0, y: 0, z: -1 }, W, H, 4)).toBeNull();
  });

  it('lässt einen Strahl parallel zur Fläche ins Leere laufen', () => {
    expect(rayOnCanvas({ x: 0, y: 0, z: 0.2 }, { x: 1, y: 0, z: 0 }, W, H, 4)).toBeNull();
  });

  it('rechnet den schrägen Treffer aus, nicht den Fußpunkt', () => {
    // Ein Meter vor der Mitte, 45° nach rechts oben: der Treffer liegt einen
    // Meter rechts und einen Meter über der Mitte — also längst daneben.
    expect(rayOnCanvas({ x: 0, y: 0, z: 1 }, { x: 1, y: 1, z: -1 }, W, H, 4)).toBeNull();
    // Dieselbe Schräge, aber aus zehn Zentimetern: das trifft noch.
    const near = rayOnCanvas({ x: 0, y: 0, z: 0.1 }, { x: 1, y: 1, z: -1 }, W, H, 4)!;
    expect(near.u).toBeCloseTo(0.5 + 0.1 / W, 6);
    expect(near.v).toBeCloseTo(0.5 - 0.1 / H, 6);
  });
});
