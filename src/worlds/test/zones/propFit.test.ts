import { PROP_CENTRE, PROP_FOOT, propFit, type PropBox, type PropVec } from './propFit';

/** Der Würfel der Block-Pakete, nachgemessen: 2 Quelleinheiten um die Mitte. */
const CUBE: PropBox = { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } };
/** Und der Keil aus `prototype-bits`: 4 × 4 × 4, mit dem Fuß auf null. */
const WEDGE: PropBox = { min: { x: -2, y: 0, z: -2 }, max: { x: 2, y: 4, z: 2 } };

/** Wohin ein Punkt des Modells kommt — erst der Maßstab, dann die Verschiebung. */
function place(fit: { scale: PropVec; shift: PropVec }, point: PropVec): PropVec {
  return {
    x: point.x * fit.scale.x + fit.shift.x,
    y: point.y * fit.scale.y + fit.shift.y,
    z: point.z * fit.scale.z + fit.shift.z,
  };
}

describe('Ein Regalmodell in einen gerechneten Kasten', () => {
  it('trifft die bestellten Maße auf jeder Achse einzeln', () => {
    const fit = propFit(CUBE, { x: 1, y: 0.6, z: 1 });
    expect(fit.scale.x).toBeCloseTo(0.5);
    expect(fit.scale.y).toBeCloseTo(0.3);
    expect(fit.scale.z).toBeCloseTo(0.5);

    const low = place(fit, CUBE.min);
    const high = place(fit, CUBE.max);
    expect(high.x - low.x).toBeCloseTo(1);
    expect(high.y - low.y).toBeCloseTo(0.6);
    expect(high.z - low.z).toBeCloseTo(1);
  });

  it('setzt den Ursprung in die Mitte — der Platz eines Bündeleintrags', () => {
    const fit = propFit(CUBE, { x: 1, y: 0.6, z: 1 }, PROP_CENTRE);
    expect(place(fit, CUBE.min)).toEqual({ x: -0.5, y: -0.3, z: -0.5 });
    expect(place(fit, CUBE.max)).toEqual({ x: 0.5, y: 0.3, z: 0.5 });
  });

  it('und mit dem Fuß auf den Boden, wenn er dort hingehört', () => {
    const fit = propFit(WEDGE, { x: 2.2, y: 1.4, z: 1.6 }, PROP_FOOT);
    const low = place(fit, WEDGE.min);
    const high = place(fit, WEDGE.max);
    expect(low.y).toBeCloseTo(0);
    expect(high.y).toBeCloseTo(1.4);
    expect(low.x).toBeCloseTo(-1.1);
    expect(high.x).toBeCloseTo(1.1);
    expect(low.z).toBeCloseTo(-0.8);
    expect(high.z).toBeCloseTo(0.8);
  });

  it('rechnet auch, wenn der Ursprung des Modells irgendwo sitzt', () => {
    // Ein Netz, das ganz im Plus liegt: 3 breit, 6 hoch, 3 tief, und sein
    // Ursprung steht in der Ecke davor. Nach dem Einpassen darf davon nichts
    // mehr zu merken sein — genau dafür wird gemessen und nicht abgeschrieben.
    const odd: PropBox = { min: { x: 2, y: 1, z: 2 }, max: { x: 5, y: 7, z: 5 } };
    const fit = propFit(odd, { x: 1, y: 0.6, z: 1 });
    const low = place(fit, odd.min);
    const high = place(fit, odd.max);
    expect(low.x).toBeCloseTo(-0.5);
    expect(low.y).toBeCloseTo(-0.3);
    expect(low.z).toBeCloseTo(-0.5);
    expect(high.x).toBeCloseTo(0.5);
    expect(high.y).toBeCloseTo(0.3);
    expect(high.z).toBeCloseTo(0.5);
  });

  it('lässt eine platte Achse, wie sie ist, statt sie aufzublasen', () => {
    const flat: PropBox = { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 0, z: 1 } };
    const fit = propFit(flat, { x: 1, y: 0.6, z: 1 });
    expect(fit.scale.y).toBe(1);
    // Und sie bleibt trotzdem dort, wo der Anker sie haben will.
    expect(place(fit, flat.min).y).toBe(0);
  });

  it('und eine bestellte Größe, die keine ist, ebenso', () => {
    const fit = propFit(CUBE, { x: 0, y: -1, z: Number.NaN });
    expect(fit.scale).toEqual({ x: 1, y: 1, z: 1 });
    expect(place(fit, CUBE.min)).toEqual({ x: -1, y: -1, z: -1 });
  });
});
