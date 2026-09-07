/**
 * Der Wurf: das Tempo, mit dem etwas die Hand verlässt, die Richtung, in die
 * es geht, und die Achse, um die sich ein Messer dabei überschlägt.
 */
import {
  AIM_TAIL,
  GAZE_FADE,
  GAZE_LOCK,
  HandSpeed,
  THROW_WINDOW,
  gazeWeight,
  spinBetween,
  throwDirection,
  tumbleAxis,
  type Quat,
  type Vec3,
} from './throwMotion';

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

describe('wie schnell sich die Hand dabei dreht', () => {
  /** Eine Drehung um `axis` um `angle` Radiant. */
  function turn(axis: Vec3, angle: number): Quat {
    const length = Math.hypot(axis.x, axis.y, axis.z) || 1;
    const half = Math.sin(angle / 2) / length;
    return { x: axis.x * half, y: axis.y * half, z: axis.z * half, w: Math.cos(angle / 2) };
  }

  /** Eine Hand, die sich Bild für Bild um `rate` Radiant je Sekunde um Y dreht. */
  function spun(rates: readonly number[], dt = FRAME): HandSpeed {
    const hand = new HandSpeed();
    let angle = 0;
    hand.feed(vec(), dt, turn(vec(0, 1, 0), angle));
    for (const rate of rates) {
      angle += rate * dt;
      hand.feed(vec(), dt, turn(vec(0, 1, 0), angle));
    }
    return hand;
  }

  it('rechnet aus zwei Lagen die Winkelgeschwindigkeit', () => {
    const out = vec();
    spinBetween(turn(vec(0, 1, 0), 0), turn(vec(0, 1, 0), 0.1), 0.1, out);
    expect(out.x).toBeCloseTo(0, 6);
    expect(out.y).toBeCloseTo(1, 3);
    expect(out.z).toBeCloseTo(0, 6);
  });

  it('nimmt den kürzeren Bogen, auch wenn das Vorzeichen kippt', () => {
    const from = turn(vec(0, 1, 0), 3.1);
    const to = turn(vec(0, 1, 0), 3.2);
    const out = vec();
    spinBetween(from, { x: -to.x, y: -to.y, z: -to.z, w: -to.w }, 0.1, out);
    expect(out.y).toBeCloseTo(1, 3);
  });

  it('gibt dem Wurf den schnellsten Drall aus dem Fenster mit', () => {
    const hand = spun([1, 4, 9, 3, 1]);
    const spin = hand.throwSpin(vec());
    // Der Gipfel liegt bei 9 rad/s; über zwei Bilder gemittelt bleiben 6.
    expect(spin.y).toBeGreaterThan(5.5);
    expect(spin.y).toBeLessThan(9.1);
    expect(Math.abs(spin.x)).toBeCloseTo(0, 3);
  });

  it('bleibt bei null, solange keine Lage mitkommt', () => {
    expect(swing([6, 8, 6]).throwSpin(vec())).toEqual(vec());
  });

  it('vergisst eine Drehung, die länger her ist als das Fenster', () => {
    const hand = spun([9, 9, 9]);
    const still = turn(vec(0, 1, 0), 9 * 3 * FRAME);
    for (let i = 0; i < Math.ceil((THROW_WINDOW * 2) / FRAME); i++) {
      hand.feed(vec(), FRAME, still);
    }
    const spin = hand.throwSpin(vec());
    expect(Math.hypot(spin.x, spin.y, spin.z)).toBeCloseTo(0, 6);
  });
});

describe('wohin die Hand am Ende zeigte', () => {
  /**
   * Eine Hand, die still steht und dabei nacheinander in `aims` zeigt — das
   * letzte Bild zuletzt.
   */
  function pointing(aims: readonly Vec3[], dt = FRAME): HandSpeed {
    const hand = new HandSpeed();
    hand.feed(vec(), dt, undefined, aims[0]);
    for (const aim of aims) hand.feed(vec(), dt, undefined, aim);
    return hand;
  }

  const AHEAD = vec(0, 0, -1);
  const RIGHT = vec(1, 0, 0);

  it('nimmt die letzten Bilder und nicht das Ausholen davor', () => {
    // So viele Bilder passen noch in den Anlauf — das jüngste ist null alt.
    const tail = Math.floor(AIM_TAIL / FRAME) + 1;
    const aims = [...Array<Vec3>(10).fill(RIGHT), ...Array<Vec3>(tail).fill(AHEAD)];
    const aim = vec();
    expect(pointing(aims).throwAim(aim)).toBe(true);
    expect(aim.z).toBeCloseTo(-1, 6);
    expect(aim.x).toBeCloseTo(0, 6);
  });

  it('lässt sich von einem zuckenden Bild nicht umstellen', () => {
    // So viele Bilder passen noch in den Anlauf — das jüngste ist null alt.
    const tail = Math.floor(AIM_TAIL / FRAME) + 1;
    const aims = [...Array<Vec3>(tail - 1).fill(AHEAD), RIGHT];
    const aim = vec();
    expect(pointing(aims).throwAim(aim)).toBe(true);
    // Ein Bild von vier bis fünf verrutscht die Richtung, kippt sie aber nicht.
    expect(-aim.z).toBeGreaterThan(0.9);
    expect(Math.hypot(aim.x, aim.y, aim.z)).toBeCloseTo(1, 6);
  });

  it('hat ohne Zeigerichtung keine Antwort', () => {
    const aim = vec(1, 2, 3);
    expect(swing([6, 8, 6]).throwAim(aim)).toBe(false);
    expect(aim).toEqual(vec(1, 2, 3));
  });

  it('vergisst eine Zeigerichtung, die länger her ist als der Anlauf', () => {
    const hand = pointing([RIGHT]);
    for (let i = 0; i < Math.ceil((AIM_TAIL * 2) / FRAME); i++) {
      hand.feed(vec(), FRAME, undefined, AHEAD);
    }
    const aim = vec();
    expect(hand.throwAim(aim)).toBe(true);
    expect(aim.x).toBeCloseTo(0, 6);
    expect(aim.z).toBeCloseTo(-1, 6);
  });
});

describe('wie stark der Blick den Wurf zieht', () => {
  it('nimmt ihn im engen Kegel ganz und weit draußen gar nicht', () => {
    expect(gazeWeight(0)).toBe(1);
    expect(gazeWeight(GAZE_LOCK)).toBe(1);
    expect(gazeWeight(GAZE_FADE)).toBe(0);
    expect(gazeWeight(Math.PI)).toBe(0);
  });

  it('verläuft dazwischen weich und fällt', () => {
    const half = gazeWeight((GAZE_LOCK + GAZE_FADE) / 2);
    expect(half).toBeCloseTo(0.5, 6);
    let last = 1;
    for (let angle = GAZE_LOCK; angle <= GAZE_FADE; angle += 0.02) {
      const weight = gazeWeight(angle);
      expect(weight).toBeLessThanOrEqual(last + 1e-9);
      last = weight;
    }
  });
});

describe('wohin ein Wurf geht', () => {
  /** Der Winkel zwischen zwei Richtungen, in Grad. */
  function degrees(a: Vec3, b: Vec3): number {
    const la = Math.hypot(a.x, a.y, a.z);
    const lb = Math.hypot(b.x, b.y, b.z);
    const dot = (a.x * b.x + a.y * b.y + a.z * b.z) / (la * lb);
    return (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
  }

  const AHEAD = vec(0, 0, -1);

  it('ist ohne Hilfe die Bewegung, normiert', () => {
    const out = vec();
    expect(throwDirection(vec(0, 0, -9), null, null, out)).toBe(true);
    expect(out).toEqual(AHEAD);
  });

  it('rettet den Wurf, der beim Zielen von oben nach unten fährt', () => {
    // Der Arm fährt 45° nach unten, die Klinge und der Blick liegen waagerecht
    // auf dem Ziel — genau der Wurf, der vorher im Boden landete.
    const out = vec();
    expect(throwDirection(vec(0, -7, -7), AHEAD, AHEAD, out)).toBe(true);
    expect(degrees(vec(0, -7, -7), AHEAD)).toBeCloseTo(45, 6);
    expect(degrees(out, AHEAD)).toBeLessThan(8);
    expect(Math.hypot(out.x, out.y, out.z)).toBeCloseTo(1, 6);
  });

  it('zieht den Wurf im engen Kegel genau auf den Blick', () => {
    const gaze = vec(0.08, 0, -1);
    const out = vec();
    throwDirection(vec(0, 0, -9), null, gaze, out);
    expect(degrees(out, gaze)).toBeCloseTo(0, 6);
  });

  it('lässt einen Wurf weit neben dem Blick in Ruhe', () => {
    // Nach rechts geworfen, geradeaus geschaut: das ist Absicht.
    const aside = vec(9, 0, 0);
    const out = vec();
    throwDirection(aside, null, AHEAD, out);
    expect(degrees(out, aside)).toBeCloseTo(0, 6);
  });

  it('mischt Bewegung und Zeigerichtung, statt eine davon zu übergehen', () => {
    const motion = vec(0, 0, -6);
    const aim = vec(1, 0, -1);
    const out = vec();
    throwDirection(motion, aim, null, out);
    // Näher an der Hand als an der Bewegung, aber nicht auf ihr.
    expect(degrees(out, aim)).toBeGreaterThan(1);
    expect(degrees(out, aim)).toBeLessThan(degrees(out, motion));
  });

  it('übergeht eine Zeigerichtung, die dem Wurf entgegensteht', () => {
    const out = vec();
    throwDirection(vec(0, 0, -6), vec(0, 0, 1), null, out);
    expect(out).toEqual(AHEAD);
  });

  it('ist ohne Bewegung kein Wurf', () => {
    const out = vec(1, 2, 3);
    expect(throwDirection(vec(), AHEAD, AHEAD, out)).toBe(false);
    expect(out).toEqual(vec(1, 2, 3));
  });
});
