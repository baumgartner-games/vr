import {
  HAMMER_HOME,
  HAMMER_SHAFT,
  MIN_SPAN,
  SWING_MAX,
  SWING_MIN,
  SWING_TRANSFER,
  clampShaftGrip,
  spanPole,
  swingPush,
  type Vec3,
} from './poleGrip';

/** Der Punkt, an dem der Stielpunkt `z` liegt, wenn der Stab so im Raum hängt. */
function pointAt(span: { origin: Vec3; axis: Vec3 }, z: number): Vec3 {
  return {
    x: span.origin.x + span.axis.x * z,
    y: span.origin.y + span.axis.y * z,
    z: span.origin.z + span.axis.z * z,
  };
}

function near(a: number, b: number): void {
  expect(a).toBeCloseTo(b, 6);
}

describe('Griff am Stiel', () => {
  it('lässt die Hand nicht in den Kopf und nicht hinter den Knauf', () => {
    expect(clampShaftGrip(HAMMER_SHAFT, -5)).toBe(HAMMER_SHAFT.front);
    expect(clampShaftGrip(HAMMER_SHAFT, 5)).toBe(HAMMER_SHAFT.back);
    expect(clampShaftGrip(HAMMER_SHAFT, 0.1)).toBe(0.1);
  });

  it('nimmt bei einer kaputten Zahl den Knauf', () => {
    expect(clampShaftGrip(HAMMER_SHAFT, Number.NaN)).toBe(HAMMER_SHAFT.back);
  });

  it('hat den Auslieferungsgriff wirklich am Stiel', () => {
    expect(clampShaftGrip(HAMMER_SHAFT, HAMMER_HOME)).toBe(HAMMER_HOME);
    // Weit hinten, sonst ist es kein Hammer, sondern ein Stock in der Mitte.
    expect(HAMMER_HOME).toBeGreaterThan(0);
  });
});

describe('Stab zwischen zwei Händen', () => {
  it('legt beide Stielpunkte in ihre Hände', () => {
    const a = { point: { x: 0, y: 1, z: 0.4 }, z: 0.4 };
    const b = { point: { x: 0, y: 1, z: 0 }, z: 0 };
    const span = spanPole(a, b)!;
    expect(span).not.toBeNull();
    near(span.axis.x, 0);
    near(span.axis.y, 0);
    near(span.axis.z, 1);
    for (const hold of [a, b]) {
      const at = pointAt(span, hold.z);
      near(at.x, hold.point.x);
      near(at.y, hold.point.y);
      near(at.z, hold.point.z);
    }
  });

  it('lässt den Kopf nach vorn zeigen, egal welche Hand führt', () => {
    // Die hintere Hand greift weiter hinten am Stiel. Der Kopf liegt bei -z,
    // muss also von der hinteren Hand weg zeigen — und zwar in beiden
    // Reihenfolgen, in denen die Welt die beiden Hände hereingibt.
    const back = { point: { x: 0, y: 1, z: 0.5 }, z: 0.36 };
    const front = { point: { x: 0, y: 1, z: 0.1 }, z: -0.04 };
    const one = spanPole(back, front)!;
    const two = spanPole(front, back)!;
    near(one.axis.z, 1);
    near(two.axis.z, 1);
    near(one.origin.z, two.origin.z);
    // Der Kopf, ein Stück vor dem vorderen Griff, liegt vor beiden Händen.
    expect(pointAt(one, -0.52).z).toBeLessThan(front.point.z);
  });

  it('verteilt eine falsche Handspanne auf beide Hände', () => {
    // Die Hände stehen 20 cm auseinander, die Griffe am Stiel 40 — der Stab
    // wird davon nicht kürzer, also liegt er in beiden Händen gleich falsch.
    const a = { point: { x: 0, y: 0, z: 0.2 }, z: 0.4 };
    const b = { point: { x: 0, y: 0, z: 0 }, z: 0 };
    const span = spanPole(a, b)!;
    const errorA = pointAt(span, a.z).z - a.point.z;
    const errorB = pointAt(span, b.z).z - b.point.z;
    near(errorA, -errorB);
    near(Math.abs(errorA), 0.1);
  });

  it('gibt eine Einheitsachse zurück, auch schräg im Raum', () => {
    const span = spanPole(
      { point: { x: 0.3, y: 1.4, z: -0.2 }, z: 0.3 },
      { point: { x: -0.1, y: 1.1, z: 0.1 }, z: -0.1 },
    )!;
    near(Math.hypot(span.axis.x, span.axis.y, span.axis.z), 1);
  });

  it('sagt nichts, wenn beide Fäuste dieselbe Stelle halten', () => {
    const point = { x: 0, y: 1, z: 0 };
    expect(spanPole({ point, z: 0.2 }, { point, z: 0.2 })).toBeNull();
    // Dieselbe Stelle im Raum, verschiedene Griffe: keine Richtung, nur Rauschen.
    expect(spanPole({ point, z: 0.3 }, { point: { ...point }, z: -0.2 })).toBeNull();
  });

  it('bleibt einhändig, solange die Griffe zu dicht beieinander liegen', () => {
    const a = { point: { x: 0, y: 1, z: 0.1 }, z: 0.1 };
    const b = { point: { x: 0, y: 1, z: 0 }, z: 0.1 - MIN_SPAN * 0.9 };
    expect(spanPole(a, b)).toBeNull();
    expect(spanPole({ ...a }, { ...b, z: 0.1 - MIN_SPAN })).not.toBeNull();
  });
});

describe('Schlag', () => {
  it('lässt eine ruhige Hand nichts anstoßen', () => {
    expect(swingPush(0)).toBe(0);
    expect(swingPush(SWING_MIN - 0.01)).toBe(0);
    expect(swingPush(Number.NaN)).toBe(0);
  });

  it('gibt einen Teil des Tempos weiter', () => {
    expect(swingPush(SWING_MIN)).toBeCloseTo(SWING_MIN * SWING_TRANSFER, 6);
    expect(swingPush(4)).toBeCloseTo(4 * SWING_TRANSFER, 6);
  });

  it('deckelt das Zucken', () => {
    expect(swingPush(60)).toBeCloseTo(SWING_MAX * SWING_TRANSFER, 6);
  });
});
