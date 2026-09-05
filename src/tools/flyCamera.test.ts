import {
  FLY_PITCH_LIMIT,
  flyDolly,
  flyLook,
  flyStep,
  forwardOf,
  isMoving,
  rightOf,
  type FlyView,
} from './flyCamera';

/**
 * Die freie Kamera auf der Werkzeugseite.
 *
 * Geprüft werden die **Vorzeichen** — genau das, was man im Bild zwar sofort
 * merkt, aber erst, nachdem man in die falsche Richtung geflogen ist: dass
 * vorwärts dorthin geht, wohin man sieht, dass rechts waagerecht bleibt, auch
 * wenn man nach oben schaut, dass hoch die Welt-Y ist und nicht die eigene, und
 * dass schräg nicht schneller ist als geradeaus. Dazu die Grenze beim Nicken,
 * ohne die die Ansicht überkopf umkippt.
 */

const HOME: FlyView = { position: { x: 0, y: 0, z: 0 }, yaw: 0, pitch: 0 };

function at(view: FlyView, x: number, y: number, z: number): void {
  expect(view.position.x).toBeCloseTo(x, 9);
  expect(view.position.y).toBeCloseTo(y, 9);
  expect(view.position.z).toBeCloseTo(z, 9);
}

describe('wohin die freie Kamera sieht', () => {
  it('schaut ohne Winkel nach -Z, wie jede Kamera in three.js', () => {
    const ahead = forwardOf(HOME);
    expect(ahead.x).toBeCloseTo(0, 9);
    expect(ahead.y).toBeCloseTo(0, 9);
    expect(ahead.z).toBeCloseTo(-1, 9);
  });

  it('dreht beim Gieren nach links herum — eine Vierteldrehung schaut nach -X', () => {
    const ahead = forwardOf({ ...HOME, yaw: Math.PI / 2 });
    expect(ahead.x).toBeCloseTo(-1, 9);
    expect(ahead.z).toBeCloseTo(0, 9);
  });

  it('schaut bei positivem Nicken nach oben', () => {
    expect(forwardOf({ ...HOME, pitch: 0.4 }).y).toBeGreaterThan(0);
  });

  it('hält „rechts" waagerecht, auch mit dem Blick zum Himmel', () => {
    const side = rightOf({ ...HOME, pitch: 1.2 });
    expect(side.y).toBe(0);
    expect(side.x).toBeCloseTo(1, 9);
  });
});

describe('fliegen', () => {
  it('geht vorwärts dorthin, wohin die Kamera sieht', () => {
    at(flyStep(HOME, { forward: 1, right: 0, up: 0 }, 2, 3), 0, 0, -6);
  });

  it('nimmt dabei das Nicken mit — Blick nach unten heißt Flug nach unten', () => {
    const view = flyStep(
      { ...HOME, pitch: -FLY_PITCH_LIMIT },
      { forward: 1, right: 0, up: 0 },
      1,
      4,
    );
    expect(view.position.y).toBeLessThan(-3);
  });

  it('geht seitwärts nach rechts, ohne dabei zu steigen', () => {
    at(flyStep({ ...HOME, pitch: 0.8 }, { forward: 0, right: 1, up: 0 }, 1, 2), 2, 0, 0);
  });

  it('steigt in der Welt-Y und nicht in der eigenen', () => {
    at(flyStep({ ...HOME, pitch: -1, yaw: 2 }, { forward: 0, right: 0, up: 1 }, 1, 5), 0, 5, 0);
  });

  it('ist schräg nicht schneller als geradeaus', () => {
    const straight = flyStep(HOME, { forward: 1, right: 0, up: 0 }, 1, 6);
    const diagonal = flyStep(HOME, { forward: 1, right: 1, up: 1 }, 1, 6);
    const length = (v: FlyView): number => Math.hypot(v.position.x, v.position.y, v.position.z);
    expect(length(diagonal)).toBeCloseTo(length(straight), 9);
  });

  it('bleibt stehen, wenn nichts gedrückt ist', () => {
    expect(isMoving({ forward: 0, right: 0, up: 0 })).toBe(false);
    expect(isMoving({ forward: 0, right: -1, up: 0 })).toBe(true);
    at(flyStep(HOME, { forward: 0, right: 0, up: 0 }, 1, 9), 0, 0, 0);
  });

  it('schiebt am Rad ebenfalls nach vorn — und rückwärts bei Minus', () => {
    at(flyDolly(HOME, 3), 0, 0, -3);
    at(flyDolly(HOME, -3), 0, 0, 3);
  });
});

describe('umsehen', () => {
  it('addiert das Wischen auf beide Winkel', () => {
    const view = flyLook({ ...HOME, yaw: 0.2, pitch: 0.1 }, 0.3, -0.05);
    expect(view.yaw).toBeCloseTo(0.5, 9);
    expect(view.pitch).toBeCloseTo(0.05, 9);
  });

  it('lässt den Blick nicht überkopf kippen', () => {
    expect(flyLook(HOME, 0, 99).pitch).toBe(FLY_PITCH_LIMIT);
    expect(flyLook(HOME, 0, -99).pitch).toBe(-FLY_PITCH_LIMIT);
  });

  it('dreht das Gieren dagegen weiter, so oft man will', () => {
    expect(flyLook(HOME, 99, 0).yaw).toBe(99);
  });

  it('bewegt die Kamera dabei nicht von der Stelle', () => {
    at(flyLook({ ...HOME, position: { x: 1, y: 2, z: 3 } }, 1, 1), 1, 2, 3);
  });
});
