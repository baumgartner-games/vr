import { PAD_HEIGHT, RAMP_THICK, rampBox } from './crashPad';
import { rampStand, type RampStand, type RampVec } from './padRamp';
import { PROP_FOOT, propFit } from '../test/zones/propFit';

/** Die Rampe der Kletterwand, in ihren eigenen Zahlen. */
const RAMP_X = 26;
const EDGE_Z = 13;
const FOOT_Z = 15.2;
const RAMP_W = 1.6;

/** Der Keil, wie er in der Datei liegt — nachgemessen an `Primitive_Slope.glb`. */
const WEDGE = { min: { x: -2, y: 0, z: -2 }, max: { x: 2, y: 4, z: 2 } };

/**
 * Ein Punkt des Modells in der Welt: erst einpassen, dann drehen, dann
 * hinstellen — genau die drei Schritte, die `climb.ts` an der Gruppe macht.
 */
function place(stand: RampStand, point: RampVec): RampVec {
  const fit = propFit(WEDGE, stand.size, PROP_FOOT);
  const local = {
    x: point.x * fit.scale.x + fit.shift.x,
    y: point.y * fit.scale.y + fit.shift.y,
    z: point.z * fit.scale.z + fit.shift.z,
  };
  const cos = Math.cos(stand.yaw);
  const sin = Math.sin(stand.yaw);
  return {
    x: stand.at.x + local.x * cos + local.z * sin,
    y: stand.at.y + local.y,
    z: stand.at.z - local.x * sin + local.z * cos,
  };
}

/** Die beiden Enden der **Oberseite** des gebauten Quaders — die Lauffläche. */
function walkway() {
  const box = rampBox(EDGE_Z, FOOT_Z);
  const midY = box.centreY + (RAMP_THICK / 2) * Math.cos(box.slope);
  const midZ = box.centreZ + (RAMP_THICK / 2) * Math.sin(box.slope);
  const half = box.length / 2;
  return {
    high: { y: midY + half * Math.sin(box.slope), z: midZ - half * Math.cos(box.slope) },
    foot: { y: midY - half * Math.sin(box.slope), z: midZ + half * Math.cos(box.slope) },
    slope: box.slope,
  };
}

describe('Der Keil über der gebauten Rampe', () => {
  it('fällt nach Süden, weil das Kissen im Norden liegt', () => {
    const stand = rampStand(RAMP_X, EDGE_Z, FOOT_Z, RAMP_W);
    expect(stand.size).toEqual({ x: FOOT_Z - EDGE_Z, y: PAD_HEIGHT, z: RAMP_W });
    // Die hohe Kante des Modells liegt auf seinem −x; nach der Drehung liegt
    // sie im Norden, und zwar genau an der Kissenkante.
    const high = place(stand, { x: WEDGE.min.x, y: WEDGE.max.y, z: 0 });
    const foot = place(stand, { x: WEDGE.max.x, y: WEDGE.min.y, z: 0 });
    expect(high.z).toBeCloseTo(EDGE_Z);
    expect(foot.z).toBeCloseTo(FOOT_Z);
    expect(high.y).toBeGreaterThan(foot.y);
  });

  it('setzt seine beiden Kanten genau auf die Enden der Lauffläche', () => {
    const stand = rampStand(RAMP_X, EDGE_Z, FOOT_Z, RAMP_W);
    const walk = walkway();
    const high = place(stand, { x: WEDGE.min.x, y: WEDGE.max.y, z: 0 });
    const foot = place(stand, { x: WEDGE.max.x, y: WEDGE.min.y, z: 0 });
    expect(high.y).toBeCloseTo(walk.high.y);
    expect(high.z).toBeCloseTo(walk.high.z);
    expect(foot.y).toBeCloseTo(walk.foot.y);
    expect(foot.z).toBeCloseTo(walk.foot.z);
    expect(walk.high.y).toBeCloseTo(PAD_HEIGHT);
    expect(walk.foot.y).toBeCloseTo(0);
  });

  it('liegt auch dazwischen nirgends unter der Lauffläche', () => {
    const stand = rampStand(RAMP_X, EDGE_Z, FOOT_Z, RAMP_W);
    const walk = walkway();
    for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      // Ein Punkt auf der Schräge des Modells: zwischen hoher Kante und Fuß.
      const on = place(stand, {
        x: WEDGE.min.x + (WEDGE.max.x - WEDGE.min.x) * t,
        y: WEDGE.max.y * (1 - t),
        z: 0,
      });
      // Und die Lauffläche an derselben Stelle.
      const floor = PAD_HEIGHT * ((walk.foot.z - on.z) / (walk.foot.z - walk.high.z));
      expect(on.y).toBeCloseTo(floor, 6);
      expect(on.y).toBeGreaterThanOrEqual(floor - 1e-9);
    }
  });

  it('ist so breit wie die gebaute Rampe und steht mittig über ihr', () => {
    const stand = rampStand(RAMP_X, EDGE_Z, FOOT_Z, RAMP_W);
    const west = place(stand, { x: 0, y: 0, z: WEDGE.min.z });
    const east = place(stand, { x: 0, y: 0, z: WEDGE.max.z });
    expect(Math.abs(east.x - west.x)).toBeCloseTo(RAMP_W);
    expect((east.x + west.x) / 2).toBeCloseTo(RAMP_X);
  });

  it('steht mit dem Fuß auf dem Hallenboden', () => {
    const stand = rampStand(RAMP_X, EDGE_Z, FOOT_Z, RAMP_W);
    const under = place(stand, { x: 0, y: WEDGE.min.y, z: 0 });
    expect(under.y).toBeCloseTo(0);
  });
});
