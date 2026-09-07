import {
  FATIGUE_FLOOR,
  JAM_MAX,
  ONE_HAND,
  REACH_FLOOR,
  SPAN_FLOOR,
  TILT_FLOOR,
  gripReport,
  handQuality,
  jamBonus,
  reachFactor,
  seatOf,
  spanFactor,
  tiltFactor,
  type ClimbPose,
  type HandGrip,
  type Vec3,
} from './gripQuality';
import type { HoldFeature, HoldMaterial } from './holds';

/** Eine Wand, die nach +z schaut, und die gegenüberliegende. */
const OUT: Vec3 = { x: 0, y: 0, z: 1 };
const BACK: Vec3 = { x: 0, y: 0, z: -1 };

function grip(
  material: HoldMaterial,
  feature: HoldFeature,
  point: Vec3,
  normal: Vec3 = OUT,
  seat = 1,
): HandGrip {
  return { material, feature, seat, normal, point };
}

/** Ein Kletterer auf 1,6 m Augenhöhe, ohne Tritte und bei voller Kraft. */
function pose(over: Partial<ClimbPose> = {}): ClimbPose {
  return {
    left: null,
    right: null,
    headY: 4,
    eyeHeight: 1.6,
    footing: false,
    strength: 1,
    ...over,
  };
}

describe('Sitz auf dem Griff', () => {
  it('ist voll in der Mitte und null jenseits des Randes', () => {
    expect(seatOf(0, 0.1)).toBe(1);
    expect(seatOf(0.2, 0.1)).toBe(0);
    expect(seatOf(0.05, 0.1)).toBeGreaterThan(0);
    expect(seatOf(0.05, 0.1)).toBeLessThan(1);
  });

  it('nimmt einen Griff ohne Ausdehnung nicht an', () => {
    expect(seatOf(0, 0)).toBe(0);
  });
});

describe('Wo die Hände stehen', () => {
  it('gibt vollen Halt von Kopfhöhe bis vor die Brust und weniger darunter', () => {
    expect(reachFactor(4.2, 4, 1.6)).toBe(1); // über dem Kopf
    expect(reachFactor(4, 4, 1.6)).toBe(1);
    expect(reachFactor(3.6, 4, 1.6)).toBe(1); // Brusthöhe zählt noch als voll
    expect(reachFactor(3.2, 4, 1.6)).toBeLessThan(1); // Hüfthöhe
    expect(reachFactor(2.4, 4, 1.6)).toBeCloseTo(REACH_FLOOR, 5); // auf Fußhöhe
  });

  it('fällt monoton, je tiefer die Hand hängt', () => {
    let last = 1;
    for (let y = 4; y > 2.2; y -= 0.2) {
      const now = reachFactor(y, 4, 1.6);
      expect(now).toBeLessThanOrEqual(last + 1e-9);
      last = now;
    }
  });

  it('nimmt auch eine unsinnige Augenhöhe hin', () => {
    expect(reachFactor(4, 4, 0)).toBe(1);
    expect(Number.isFinite(reachFactor(0, 4, 0))).toBe(true);
  });

  it('macht denselben Griff am Überhang schlechter als an der senkrechten Wand', () => {
    expect(tiltFactor(OUT)).toBe(1); // senkrecht
    expect(tiltFactor({ x: 0, y: 0.5, z: 0.866 })).toBe(1); // Platte, kein Abzug
    const bulge = tiltFactor({ x: 0, y: -Math.sin(0.6), z: Math.cos(0.6) });
    expect(bulge).toBeLessThan(1);
    expect(tiltFactor({ x: 0, y: -1, z: 0 })).toBeCloseTo(TILT_FLOOR, 5); // Dach
    expect(tiltFactor({ x: 0, y: -1, z: 0 })).toBeLessThan(bulge);
  });

  it('bestraft weit auseinanderstehende Hände', () => {
    expect(spanFactor(0.4)).toBe(1);
    expect(spanFactor(1.1)).toBeLessThan(1);
    expect(spanFactor(2)).toBeCloseTo(SPAN_FLOOR, 5);
  });
});

describe('Verspreizen', () => {
  const left = grip('rough', 'flat', { x: -0.4, y: 3.6, z: 0 }, OUT);
  const right = grip('rough', 'flat', { x: 0.4, y: 3.6, z: 0 }, BACK);

  it('gibt es nur an entgegengesetzten Flächen', () => {
    expect(jamBonus(left, right)).toBeGreaterThan(0);
    // Beide Hände an derselben Wand: nichts zu drücken.
    const same = grip('rough', 'flat', { x: 0.4, y: 3.6, z: 0 }, OUT);
    expect(jamBonus(left, same)).toBe(0);
  });

  it('braucht Hände, die nah genug beieinander sind', () => {
    const far = grip('rough', 'flat', { x: 1.6, y: 3.6, z: 0 }, BACK);
    expect(jamBonus(left, far)).toBeLessThan(jamBonus(left, right));
    const tooFar = grip('rough', 'flat', { x: 2.4, y: 3.6, z: 0 }, BACK);
    expect(jamBonus(left, tooFar)).toBe(0);
  });

  it('bleibt unter dem Höchstwert', () => {
    const touching = grip('rough', 'flat', { x: -0.4, y: 3.6, z: 0 }, BACK);
    expect(jamBonus(left, touching)).toBeLessThanOrEqual(JAM_MAX);
  });

  it('gibt es an der Leiter nicht — dort ist nichts mehr zu holen', () => {
    const rung = grip('perfect', 'rung', { x: 0.4, y: 3.6, z: 0 }, BACK);
    expect(jamBonus(left, rung)).toBe(0);
  });
});

describe('Halt einer Hand', () => {
  const at: Vec3 = { x: 0, y: 3.9, z: 0 };

  it('ist an der Leiter immer voll — auch tief, allein und ohne Kraft', () => {
    const rung = grip('perfect', 'rung', { x: 0, y: 2.2, z: 0 });
    const state = pose({ left: rung, strength: 0 });
    expect(handQuality(rung, state, null, 0)).toBe(1);
  });

  it('wird von der Form getragen: Henkel schlägt Kante schlägt Fläche', () => {
    const state = pose();
    const value = (feature: HoldFeature): number =>
      handQuality(grip('rough', feature, at), state, null, 0);
    expect(value('jug')).toBeGreaterThan(value('edge'));
    expect(value('edge')).toBeGreaterThan(value('sloper'));
    expect(value('sloper')).toBeGreaterThan(value('flat'));
  });

  it('gibt an glattem Fels weniger her als an rauem', () => {
    const state = pose();
    expect(handQuality(grip('smooth', 'edge', at), state, null, 0)).toBeLessThan(
      handQuality(grip('rough', 'edge', at), state, null, 0),
    );
  });

  it('macht aus einer verfehlten Kante eine blanke Fläche', () => {
    const state = pose();
    const missed = handQuality(grip('rough', 'edge', at, OUT, 0), state, null, 0);
    const flat = handQuality(grip('rough', 'flat', at), state, null, 0);
    expect(missed).toBeCloseTo(flat, 6);
  });

  it('belohnt Füße unter dem Körper', () => {
    const hold = grip('rough', 'edge', at);
    expect(handQuality(hold, pose({ footing: true }), null, 0)).toBeGreaterThan(
      handQuality(hold, pose({ footing: false }), null, 0),
    );
  });

  it('lässt leere Ausdauer den Griff schlechter machen, aber nicht wertlos', () => {
    const hold = grip('rough', 'jug', at);
    const full = handQuality(hold, pose({ strength: 1 }), null, 0);
    const empty = handQuality(hold, pose({ strength: 0 }), null, 0);
    expect(empty).toBeLessThan(full);
    expect(empty).toBeCloseTo(full * FATIGUE_FLOOR, 6);
  });

  it('bleibt zwischen 0 und 1', () => {
    const hold = grip('rough', 'jug', at);
    const value = handQuality(hold, pose({ footing: true }), null, JAM_MAX);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  });
});

describe('Der Halt beider Hände', () => {
  const high: Vec3 = { x: -0.2, y: 4, z: 0 };
  const alsoHigh: Vec3 = { x: 0.2, y: 4, z: 0 };

  it('meldet gar nichts, wenn keine Hand an der Wand ist', () => {
    const report = gripReport(pose());
    expect(report).toEqual({
      left: null,
      right: null,
      support: 0,
      drain: 0,
      jam: 0,
      hanging: false,
    });
  });

  it('trägt mit zwei Händen mehr als mit einer, aber nie über eins hinaus', () => {
    const one = gripReport(pose({ left: grip('rough', 'edge', high) }));
    const two = gripReport(
      pose({ left: grip('rough', 'edge', high), right: grip('rough', 'edge', alsoHigh) }),
    );
    expect(two.support).toBeGreaterThan(one.support);
    expect(two.support).toBeLessThanOrEqual(1);
  });

  it('macht den Kamin erst durch das Verspreizen begehbar', () => {
    const flatWall = pose({
      left: grip('rough', 'flat', { x: -0.45, y: 4, z: 0 }, OUT),
      right: grip('rough', 'flat', { x: 0.45, y: 4, z: 0 }, OUT),
    });
    const chimney = pose({
      left: grip('rough', 'flat', { x: -0.45, y: 4, z: 0 }, OUT),
      right: grip('rough', 'flat', { x: 0.45, y: 4, z: 0 }, BACK),
    });
    expect(gripReport(flatWall).jam).toBe(0);
    expect(gripReport(chimney).jam).toBeGreaterThan(0);
    expect(gripReport(chimney).support).toBeGreaterThan(gripReport(flatWall).support);
  });

  it('lässt weit auseinandergerissene Arme schlechter dastehen', () => {
    const close = gripReport(
      pose({
        left: grip('rough', 'edge', { x: -0.3, y: 4, z: 0 }),
        right: grip('rough', 'edge', { x: 0.3, y: 4, z: 0 }),
      }),
    );
    const wide = gripReport(
      pose({
        left: grip('rough', 'edge', { x: -1.1, y: 4, z: 0 }),
        right: grip('rough', 'edge', { x: 1.1, y: 4, z: 0 }),
      }),
    );
    expect(wide.support).toBeLessThan(close.support);
  });

  it('lässt Hände weit unter dem Körper schlechter dastehen', () => {
    const chest = gripReport(pose({ left: grip('rough', 'edge', { x: 0, y: 3.9, z: 0 }) }));
    const low = gripReport(pose({ left: grip('rough', 'edge', { x: 0, y: 2.4, z: 0 }) }));
    expect(low.support).toBeLessThan(chest.support);
  });

  it('lässt einarmig hängen teurer sein als beidhändig am selben Griff', () => {
    const hold = grip('rough', 'jug', high);
    const one = gripReport(pose({ left: hold }));
    expect(one.support).toBeLessThan(one.left!);
    expect(one.support).toBeCloseTo(one.left! * ONE_HAND, 6);
  });

  it('lässt einen aber nie einarmig von der Leiter fallen', () => {
    expect(gripReport(pose({ left: grip('perfect', 'rung', high) })).support).toBe(1);
  });

  it('zieht am glatten Fels schneller ab als am rauen', () => {
    const rough = gripReport(pose({ left: grip('rough', 'edge', high) }));
    const smooth = gripReport(pose({ left: grip('smooth', 'edge', high) }));
    expect(smooth.drain).toBeGreaterThan(rough.drain);
  });

  it('kostet nichts, sobald eine Hand an der Sprosse hängt', () => {
    const report = gripReport(
      pose({
        left: grip('perfect', 'rung', high),
        right: grip('smooth', 'flat', alsoHigh),
      }),
    );
    expect(report.drain).toBe(0);
    expect(report.hanging).toBe(true);
  });
});
