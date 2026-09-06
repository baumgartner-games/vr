/**
 * Der Wurf: das Tempo, mit dem etwas die Hand verlässt, und die Achse, um die
 * sich ein Messer dabei überschlägt.
 */
import { HandSpeed, THROW_WINDOW, tumbleAxis, type Vec3 } from './throwMotion';

const FRAME = 1 / 72;

function vec(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

/** Eine Hand, die `speeds` Meter je Sekunde nacheinander nach vorn fährt. */
function swing(speeds: readonly number[], dt = FRAME): HandSpeed {
  const hand = new HandSpeed();
  const at = vec();
  hand.feed(at, dt);
  for (const speed of speeds) {
    at.z -= speed * dt;
    hand.feed({ ...at }, dt);
  }
  return hand;
}

describe('wie schnell die Hand beim Loslassen war', () => {
  it('nimmt den schnellsten Moment und nicht das Abbremsen danach', () => {
    // Ausholen, werfen, abbremsen — losgelassen wird beim Abbremsen.
    const hand = swing([0.5, 2, 5, 8, 7, 3, 1]);
    const thrown = hand.throwVelocity(vec());
    // Der Gipfel liegt bei 8 m/s; über zwei Bilder gemittelt bleiben 7,5.
    expect(-thrown.z).toBeGreaterThan(7);
    // …und das laufende, geglättete Tempo ist längst darunter.
    expect(-hand.velocity.z).toBeLessThan(-thrown.z);
  });

  it('vergisst, was länger her ist als das Fenster', () => {
    const hand = swing([9, 9, 9]);
    const at = vec(0, 0, -1);
    // Zweimal das Fenster still stehen: vom Wurf bleibt nichts.
    for (let i = 0; i < Math.ceil((THROW_WINDOW * 2) / FRAME); i++) hand.feed({ ...at }, FRAME);
    const thrown = hand.throwVelocity(vec());
    expect(Math.hypot(thrown.x, thrown.y, thrown.z)).toBeCloseTo(0, 6);
  });

  it('lässt sich von einem einzelnen Ausreißerbild nicht überreden', () => {
    const hand = swing([0.2, 0.2, 12, 0.2, 0.2]);
    const thrown = hand.throwVelocity(vec());
    // Ein Bild allein ist kein Wurf: gemittelt bleibt gut die Hälfte übrig.
    expect(-thrown.z).toBeLessThan(7);
    expect(-thrown.z).toBeGreaterThan(4);
  });

  it('hat ohne Vorgeschichte keinen Wurf', () => {
    const hand = new HandSpeed();
    hand.feed(vec(), FRAME);
    expect(hand.throwVelocity(vec())).toEqual(vec());
    const moved = swing([6, 6]);
    moved.forget();
    expect(moved.throwVelocity(vec())).toEqual(vec());
  });
});

describe('worum sich ein geworfenes Messer dreht', () => {
  /** Wohin ein Punkt bei `axis` wandert: das Kreuzprodukt ω × Punkt. */
  function turns(axis: Vec3, point: Vec3): Vec3 {
    return {
      x: axis.y * point.z - axis.z * point.y,
      y: axis.z * point.x - axis.x * point.z,
      z: axis.x * point.y - axis.y * point.x,
    };
  }

  it('schlägt die Spitze oben herum nach vorn — geradeaus geworfen', () => {
    const axis = vec();
    expect(tumbleAxis(vec(0, 0, -6), axis)).toBe(true);
    // Die Klinge steht aufrecht in der Faust; sie soll nach vorn kippen.
    const tip = turns(axis, vec(0, 1, 0));
    expect(tip.z).toBeLessThan(0);
    expect(Math.abs(tip.x)).toBeCloseTo(0, 6);
  });

  it('dreht in jede Wurfrichtung nach vorn, nicht nach hinten', () => {
    for (const flight of [vec(0, 0, 6), vec(5, 1, 0), vec(-3, -1, 4), vec(2, 0, -2)]) {
      const axis = vec();
      expect(tumbleAxis(flight, axis)).toBe(true);
      const tip = turns(axis, vec(0, 1, 0));
      // „Vorn" heißt: die Spitze geht in die Richtung, in die geworfen wurde.
      const along = tip.x * flight.x + tip.z * flight.z;
      expect(along).toBeGreaterThan(0);
      expect(Math.hypot(axis.x, axis.y, axis.z)).toBeCloseTo(1, 6);
      // Die Achse liegt waagerecht — der Überschlag geht in der Ebene des Wurfs.
      expect(axis.y).toBe(0);
    }
  });

  it('hat bei einem Wurf senkrecht nach oben keine Ebene', () => {
    const axis = vec(1, 1, 1);
    expect(tumbleAxis(vec(0, 7, 0), axis)).toBe(false);
    expect(axis).toEqual(vec(1, 1, 1));
  });
});
