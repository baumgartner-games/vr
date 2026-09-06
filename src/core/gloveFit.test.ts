import {
  MIDDLE_ROOT_Z,
  PALM_BACK_Z,
  PALM_LENGTH,
  SCALE_MAX,
  SCALE_MIN,
  fitGlove,
  quatFromBasis,
  type GloveJoints,
  type Point3,
  type Quat,
} from './gloveFit';

/** Eine Hand in Ruhelage: Handgelenk im Nullpunkt, Finger nach -Z. */
function restingHand(side: 'left' | 'right', scale = 1): GloveJoints {
  const mirror = side === 'right' ? 1 : -1;
  return {
    wrist: { x: 0, y: 0, z: 0 },
    middleKnuckle: { x: 0, y: 0, z: -PALM_LENGTH * scale },
    // Der Zeigefinger liegt auf der Daumenseite: rechts bei -X, links bei +X.
    indexKnuckle: { x: -0.028 * mirror * scale, y: 0, z: -0.046 * scale },
    pinkyKnuckle: { x: 0.028 * mirror * scale, y: 0, z: -0.042 * scale },
  };
}

function turn(point: Point3, q: Quat): Point3 {
  const { x, y, z } = point;
  const ix = q.w * x + q.y * z - q.z * y;
  const iy = q.w * y + q.z * x - q.x * z;
  const iz = q.w * z + q.x * y - q.y * x;
  const iw = -q.x * x - q.y * y - q.z * z;
  return {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
  };
}

function moved(joints: GloveJoints, q: Quat, by: Point3): GloveJoints {
  const shift = (point: Point3 | null): Point3 | null => {
    if (!point) return null;
    const spun = turn(point, q);
    return { x: spun.x + by.x, y: spun.y + by.y, z: spun.z + by.z };
  };
  return {
    wrist: shift(joints.wrist),
    middleKnuckle: shift(joints.middleKnuckle),
    indexKnuckle: shift(joints.indexKnuckle),
    pinkyKnuckle: shift(joints.pinkyKnuckle),
  };
}

/** Wo ein Punkt des gebauten Modells landet, wenn die Passung gilt. */
function place(local: Point3, fit: { position: Point3; rotation: Quat; scale: number }): Point3 {
  const spun = turn(
    { x: local.x * fit.scale, y: local.y * fit.scale, z: local.z * fit.scale },
    fit.rotation,
  );
  return {
    x: spun.x + fit.position.x,
    y: spun.y + fit.position.y,
    z: spun.z + fit.position.z,
  };
}

function near(a: Point3, b: Point3, tolerance = 1e-6): void {
  expect(a.x).toBeCloseTo(b.x, 6);
  expect(a.y).toBeCloseTo(b.y, 6);
  expect(a.z).toBeCloseTo(b.z, 6);
  void tolerance;
}

describe('fitGlove', () => {
  it('legt die Ruhelage genau auf den Nullpunkt', () => {
    const fit = fitGlove('right', restingHand('right'))!;
    expect(fit).not.toBeNull();
    expect(fit.scale).toBeCloseTo(1, 6);
    // Der Nullpunkt der gebauten Hand liegt eine Handwurzel vor dem Gelenk.
    near(fit.position, { x: 0, y: 0, z: -PALM_BACK_Z });
    expect(Math.abs(fit.rotation.w)).toBeCloseTo(1, 6);
  });

  it('setzt Handgelenk und Knöchel auf die gemessenen Gelenke', () => {
    // Irgendeine Lage im Raum, damit nichts an einer Achse hängen bleibt.
    const spin: Quat = { x: 0.2, y: -0.35, z: 0.1, w: 0.9 };
    const norm = Math.hypot(spin.x, spin.y, spin.z, spin.w);
    const q: Quat = { x: spin.x / norm, y: spin.y / norm, z: spin.z / norm, w: spin.w / norm };
    const joints = moved(restingHand('right'), q, { x: 0.4, y: 1.2, z: -0.3 });

    const fit = fitGlove('right', joints)!;
    near(place({ x: 0, y: 0, z: PALM_BACK_Z }, fit), joints.wrist!);
    near(place({ x: 0, y: 0, z: MIDDLE_ROOT_Z }, fit), joints.middleKnuckle!);
  });

  it('nimmt das Maß der echten Hand', () => {
    const big = fitGlove('right', restingHand('right', 1.3))!;
    expect(big.scale).toBeCloseTo(1.3, 6);
    const small = fitGlove('right', restingHand('right', 0.8))!;
    expect(small.scale).toBeCloseTo(0.8, 6);
  });

  it('bleibt bei einem ausgerutschten Gelenk in vernünftigen Grenzen', () => {
    expect(fitGlove('right', restingHand('right', 12))!.scale).toBe(SCALE_MAX);
    expect(fitGlove('right', restingHand('right', 0.05))!.scale).toBe(SCALE_MIN);
  });

  it('unterscheidet links von rechts an genau einem Vorzeichen', () => {
    // Dieselben Gelenke, andere Seite: der Handschuh dreht sich um die
    // Handachse, denn Zeige- und kleiner Finger tauschen die Plätze.
    const right = fitGlove('right', restingHand('right'))!;
    const left = fitGlove('left', restingHand('right'))!;
    expect(Math.abs(right.rotation.w)).toBeCloseTo(1, 6);
    expect(Math.abs(left.rotation.z)).toBeCloseTo(1, 6);
  });

  it('verträgt eine schiefe Querachse', () => {
    // Eine echte Hand ist kein Rechteck: die Knöchel stehen gestaffelt.
    const joints = restingHand('right');
    const fit = fitGlove('right', {
      ...joints,
      indexKnuckle: { x: -0.03, y: 0.004, z: -0.05 },
      pinkyKnuckle: { x: 0.026, y: -0.002, z: -0.038 },
    })!;
    // Trotzdem eine saubere Drehung — keine gestauchte Basis.
    expect(Math.hypot(fit.rotation.x, fit.rotation.y, fit.rotation.z, fit.rotation.w)).toBeCloseTo(
      1,
      6,
    );
    near(place({ x: 0, y: 0, z: PALM_BACK_Z }, fit), joints.wrist!);
  });

  it('sagt nichts, solange die Brille nicht genug liefert', () => {
    const joints = restingHand('right');
    expect(fitGlove('right', { ...joints, wrist: null })).toBeNull();
    expect(fitGlove('right', { ...joints, middleKnuckle: null })).toBeNull();
    expect(fitGlove('right', { ...joints, indexKnuckle: null })).toBeNull();
    // Und auch nicht, wenn zwei Gelenke aufeinanderliegen.
    expect(fitGlove('right', { ...joints, middleKnuckle: { x: 0, y: 0, z: 0 } })).toBeNull();
  });
});

describe('quatFromBasis', () => {
  it('macht aus der Einheitsbasis die Ruhe', () => {
    const q = quatFromBasis({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 });
    expect(q.w).toBeCloseTo(1, 6);
  });

  it('trifft jede der drei Fallunterscheidungen', () => {
    // Eine halbe Drehung um jede Achse — dort ist die Spur negativ, und jede
    // Achse gewinnt einmal.
    const turns: Array<[Point3, Point3, Point3]> = [
      [
        { x: 1, y: 0, z: 0 },
        { x: 0, y: -1, z: 0 },
        { x: 0, y: 0, z: -1 },
      ],
      [
        { x: -1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 0, z: -1 },
      ],
      [
        { x: -1, y: 0, z: 0 },
        { x: 0, y: -1, z: 0 },
        { x: 0, y: 0, z: 1 },
      ],
    ];
    for (const [x, y, z] of turns) {
      const q = quatFromBasis(x, y, z);
      expect(Math.hypot(q.x, q.y, q.z, q.w)).toBeCloseTo(1, 6);
      // Die Drehung bildet die Basis wirklich ab.
      near(turn({ x: 1, y: 0, z: 0 }, q), x);
      near(turn({ x: 0, y: 1, z: 0 }, q), y);
      near(turn({ x: 0, y: 0, z: 1 }, q), z);
    }
  });
});
