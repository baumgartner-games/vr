import {
  PAD_CATCH_SPEED,
  PAD_CORE,
  PAD_HEIGHT,
  PAD_MAX_SINK,
  PAD_REST,
  overPad,
  padAtRest,
  padCatches,
  padDrive,
  padHit,
  padRise,
  padSlide,
  padTop,
  padTurned,
  rampBox,
  stepPad,
  RAMP_THICK,
  type PadSpring,
} from './crashPad';
import { MAX_SLOPE_DEG } from '../../physics/PhysicsLocomotion';

const RECT = { minX: -4, maxX: 4, minZ: -2, maxZ: 2 };

/**
 * Ein Sprung ins Kissen, Bild für Bild — und zurückgegeben wird, was in der
 * Brille zählt: wie tief es einsinkt, **wie lange der Blick dabei nach unten
 * fährt** und wann alles zur Ruhe gekommen ist.
 */
function jump(speed: number, fps = 72) {
  const dt = 1 / fps;
  let spring = padHit({ sink: PAD_REST, rate: 0 }, speed);
  let time = 0;
  let deepest = spring.sink;
  let falling: number | null = null;
  let settled: number | null = null;
  let overshoot = 0;

  for (let i = 0; i < fps * 4; i++) {
    spring = stepPad(spring, PAD_REST, dt);
    time += dt;
    deepest = Math.max(deepest, spring.sink);
    if (falling === null && padTurned(spring)) falling = time;
    if (falling !== null) overshoot = Math.max(overshoot, PAD_REST - spring.sink);
    const still = Math.abs(spring.rate) < 0.15 && Math.abs(spring.sink - PAD_REST) < 0.03;
    if (settled === null && falling !== null && still) settled = time;
  }
  return { deepest, falling: falling ?? Infinity, settled: settled ?? Infinity, overshoot };
}

describe('Das Sprungkissen', () => {
  it('liegt im Ruhezustand auf voller Höhe', () => {
    expect(padTop(padAtRest())).toBeCloseTo(PAD_HEIGHT);
    expect(padRise(padAtRest())).toBeCloseTo(0);
  });

  it('sinkt unter einem Stehenden auf seine Ruhelage und bleibt dort', () => {
    let spring = padAtRest();
    for (let i = 0; i < 200; i++) spring = stepPad(spring, PAD_REST, 1 / 72);
    expect(spring.sink).toBeCloseTo(PAD_REST, 2);
    expect(padTop(spring)).toBeCloseTo(PAD_HEIGHT - PAD_REST, 2);
  });

  it('kommt von selbst wieder hoch, sobald niemand mehr darauf steht', () => {
    let spring: PadSpring = { sink: 0.8, rate: 0 };
    for (let i = 0; i < 200; i++) spring = stepPad(spring, 0, 1 / 72);
    expect(spring.sink).toBeCloseTo(0, 2);
  });

  /**
   * **Der Grund, warum es das Kissen gibt.** Ein Sprung vom Podest auf 6,50 m
   * kommt mit gut zehn Metern in der Sekunde an. Ohne Kissen steht der Blick
   * im nächsten Bild — bei 72 Hz nach 14 Millisekunden. Das Kissen macht
   * daraus mindestens eine Zehntelsekunde nach unten, und danach hört die
   * Bewegung immer noch nicht auf, sondern kehrt um.
   */
  it('macht aus dem einen Bild eine Zehntelsekunde nach unten', () => {
    const hard = jump(10.2);
    expect(hard.falling).toBeGreaterThan(0.1);
    expect(hard.settled).toBeGreaterThan(0.4);
  });

  it('lässt auch den kleinen Sprung nicht sofort anhalten', () => {
    // Eine Stufe herunter — auch das darf kein Anschlag sein.
    const small = jump(3);
    expect(small.falling).toBeGreaterThan(0.1);
  });

  /**
   * **Die Zeit nach unten hängt nicht am Tempo.** Das ist die Eigenschaft
   * einer Feder und der Grund, weshalb hier eine steht und keine feste
   * Bremsstrecke: Ein fester Weg bremst den schnellen Sturz umso härter, je
   * schneller er ist — genau verkehrt herum.
   */
  it('braucht für den harten Sprung nicht weniger Zeit als für den weichen', () => {
    const soft = jump(3);
    const hard = jump(10.2);
    expect(hard.falling).toBeGreaterThan(soft.falling * 0.6);
  });

  it('fängt auch den Sturz vom höchsten Podest ab, ohne durchzuschlagen', () => {
    // Vom Überhangpodest auf 7 m: knapp elf Meter in der Sekunde.
    const deepest = jump(11).deepest;
    expect(deepest).toBeLessThan(PAD_MAX_SINK);
    expect(PAD_HEIGHT - deepest).toBeGreaterThan(PAD_CORE);
    // Und es nutzt seine Dicke auch wirklich aus — ein Kissen, das bei einem
    // Sturz aus sieben Metern zehn Zentimeter nachgibt, ist eine Bodenplatte.
    expect(deepest).toBeGreaterThan(0.6);
  });

  it('bleibt selbst bei absurdem Tempo über dem festen Kern', () => {
    expect(jump(30).deepest).toBeLessThanOrEqual(PAD_MAX_SINK);
  });

  it('schiebt einen wieder heraus, ohne zum Trampolin zu werden', () => {
    const hard = jump(10.2);
    expect(hard.overshoot).toBeGreaterThan(0);
    expect(hard.overshoot).toBeLessThan(0.1);
  });

  /**
   * Eine Feder, die bei 45 Hz anders schwingt als bei 120, ist keine
   * Federung, sondern eine Eigenschaft der Grafikkarte — deshalb rechnet
   * `stepPad` in festen Teilschritten.
   */
  it('federt bei jeder Bildrate gleich', () => {
    const slow = jump(10.2, 45);
    const fast = jump(10.2, 120);
    expect(slow.deepest).toBeCloseTo(fast.deepest, 2);
    expect(slow.falling).toBeCloseTo(fast.falling, 1);
  });

  it('nimmt vom Einschlag das höhere Tempo und nicht das letzte', () => {
    expect(padHit({ sink: 0.3, rate: 5 }, 2).rate).toBe(5);
    expect(padHit({ sink: 0.3, rate: 5 }, 9).rate).toBe(9);
  });

  describe('wann es zupackt', () => {
    it('lässt den Schritt in Ruhe und fängt den Sturz', () => {
      expect(padCatches(0.01, PAD_CATCH_SPEED - 0.5, 1 / 72)).toBe(false);
      expect(padCatches(0.01, 6, 1 / 72)).toBe(true);
    });

    it('packt ein Bild zu früh zu statt ein Bild zu spät', () => {
      // Zehn Meter in der Sekunde legen bei 72 Hz 14 cm je Bild zurück: Wer
      // 10 cm über der Fläche steht, steht im nächsten Bild darin.
      expect(padCatches(0.1, 10, 1 / 72)).toBe(true);
      // Einen halben Meter darüber aber noch nicht.
      expect(padCatches(0.5, 10, 1 / 72)).toBe(false);
    });
  });

  describe('wie es den Körper führt', () => {
    it('nimmt ihn mit dem Tempo der Fläche mit', () => {
      // Fläche sinkt mit 8 m/s, die Füße liegen genau darauf.
      expect(padDrive(0, -8)).toBeCloseTo(-8);
    });

    it('holt einen Rest Abstand auf, ohne loszuschießen', () => {
      expect(padDrive(0.1, 0)).toBeLessThan(0);
      expect(Math.abs(padDrive(50, -30))).toBeLessThanOrEqual(16);
    });

    it('lässt die Seitwärtsbewegung auslaufen statt sie abzuschneiden', () => {
      expect(padSlide(1 / 72)).toBeGreaterThan(0.9);
      expect(padSlide(0.5)).toBeLessThan(0.1);
    });

    it('gibt am tiefsten Punkt wieder ab', () => {
      expect(padTurned({ sink: 0.5, rate: 3 })).toBe(false);
      expect(padTurned({ sink: 0.9, rate: 0 })).toBe(true);
      expect(padTurned({ sink: 0.8, rate: -2 })).toBe(true);
    });
  });

  describe('sein Rechteck', () => {
    it('kennt drüber und daneben', () => {
      expect(overPad(RECT, 0, 0)).toBe(true);
      expect(overPad(RECT, 4.2, 0)).toBe(false);
      expect(overPad(RECT, 4.2, 0, 0.3)).toBe(true);
      expect(overPad(RECT, 0, -2.5)).toBe(false);
    });
  });
});

/**
 * **Die Rampe.** Ohne sie ist ein Kissen eine Falle: Man springt hinein und
 * kommt nie wieder hinauf, denn 1,40 m sind gut das Vierfache dessen, was
 * diese Fortbewegung als Stufe nimmt.
 */
describe('Die Rampe auf ein Sprungkissen', () => {
  const box = rampBox(-1.1, 1.9);

  /** Die Ecken ihrer Oberseite, aus Mitte, Neigung und Länge zurückgerechnet. */
  function topEnd(sign: number): { y: number; z: number } {
    // Um +x gedreht: lokal +y zeigt nach oben und nach Süden, lokal +z den
    // Hang hinunter.
    const upY = Math.cos(box.slope);
    const upZ = Math.sin(box.slope);
    const alongY = -Math.sin(box.slope);
    const alongZ = Math.cos(box.slope);
    return {
      y: box.centreY + (RAMP_THICK / 2) * upY + sign * (box.length / 2) * alongY,
      z: box.centreZ + (RAMP_THICK / 2) * upZ + sign * (box.length / 2) * alongZ,
    };
  }

  it('schließt oben genau an der Kissenkante an', () => {
    const high = topEnd(-1);
    expect(high.z).toBeCloseTo(-1.1);
    expect(high.y).toBeCloseTo(PAD_HEIGHT);
  });

  it('und kommt unten genau auf dem Boden an', () => {
    const low = topEnd(1);
    expect(low.z).toBeCloseTo(1.9);
    expect(low.y).toBeCloseTo(0);
  });

  it('ist flacher als alles, was der Körper noch hinaufkommt', () => {
    expect((box.slope * 180) / Math.PI).toBeLessThan(MAX_SLOPE_DEG);
    // Und nicht so flach, dass sie die halbe Halle einnimmt.
    expect((box.slope * 180) / Math.PI).toBeGreaterThan(15);
  });
});
