import { MAX_LAG, shortestAngle, stepViewYaw, type ViewFollow } from './kartView';

const DEG = Math.PI / 180;
const STEP = 1 / 90;

/** Nur der Nachlauf, ohne Totzone und ohne Deckel — das Verhalten von vorher. */
function plain(lag: number): ViewFollow {
  return { lag, dead: 0, rate: 0 };
}

/** Dreht das Kart `seconds` lang mit `rate` rad/s und zieht den Blick nach. */
function drive(follow: ViewFollow, rate: number, seconds: number): { view: number; kart: number } {
  let view = 0;
  let kart = 0;
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    kart += rate * STEP;
    view = stepViewYaw(view, kart, follow, STEP);
  }
  return { view, kart };
}

describe('stepViewYaw', () => {
  it('screws the head to the kart when there is no lag', () => {
    expect(stepViewYaw(0, 1.2, plain(0), STEP)).toBe(1.2);
    expect(stepViewYaw(0, 1.2, plain(-1), STEP)).toBe(1.2);
  });

  it('does nothing without time', () => {
    expect(stepViewYaw(0.3, 1.2, plain(0.2), 0)).toBe(1.2);
  });

  it('catches up roughly two thirds within one time constant', () => {
    // Ein Sprung des Karts — klein genug, dass der Deckel nicht mitredet —,
    // danach eine Zeitkonstante lang nachziehen.
    let view = 0;
    for (let i = 0; i < Math.round(0.2 / STEP); i++) {
      view = stepViewYaw(view, 0.3, plain(0.2), STEP);
    }
    expect(view / 0.3).toBeGreaterThan(0.58);
    expect(view / 0.3).toBeLessThan(0.68);
  });

  it('gets there in the end', () => {
    let view = 0;
    for (let i = 0; i < Math.round(3 / STEP); i++) view = stepViewYaw(view, 1, plain(0.2), STEP);
    expect(view).toBeCloseTo(1, 3);
  });

  it('stays behind the kart while it turns, and not in front of it', () => {
    const { view, kart } = drive(plain(0.2), 1, 1.5);
    expect(view).toBeLessThan(kart);
    // Bei 1 rad/s und 0,2 s Nachlauf sind das rund 0,2 rad.
    expect(kart - view).toBeCloseTo(0.2, 1);
  });

  it('never falls further behind than the cap', () => {
    // Eine Drehrate, die weit über allem liegt, was ein Kart schafft.
    const { view, kart } = drive(plain(0.4), 6, 2);
    expect(Math.abs(shortestAngle(kart - view))).toBeLessThanOrEqual(MAX_LAG * DEG + 1e-9);
  });

  it('takes the short way round the wrap', () => {
    // Kurz vor +π und kurz dahinter: der Weg ist zwei Hundertstel und nicht
    // fast ein voller Kreis.
    const view = stepViewYaw(Math.PI - 0.01, -Math.PI + 0.01, plain(0.2), 1);
    expect(Math.abs(shortestAngle(view - Math.PI))).toBeLessThan(0.05);
  });

  it('lands in the same place whether it is one step or ten', () => {
    const once = stepViewYaw(0, 0.3, plain(0.2), 0.1);
    let many = 0;
    for (let i = 0; i < 10; i++) many = stepViewYaw(many, 0.3, plain(0.2), 0.01);
    expect(many).toBeCloseTo(once, 9);
  });

  describe('die Totzone', () => {
    const dead: ViewFollow = { lag: 0.15, dead: 10, rate: 0 };

    it('lässt den Kopf bei kleinen Winkeln ganz stehen', () => {
      expect(stepViewYaw(0, 9 * DEG, dead, STEP)).toBe(0);
      expect(stepViewYaw(0, -9 * DEG, dead, STEP)).toBe(0);
    });

    it('nimmt ihn erst am Rand des Fensters mit', () => {
      const view = stepViewYaw(0, 40 * DEG, dead, STEP);
      expect(view).toBeGreaterThan(0);
      // Und niemals über den Rand hinaus: Sein Ziel ist die Fahrtrichtung
      // minus der Totzone, nicht die Fahrtrichtung.
      expect(view).toBeLessThan(30 * DEG);
    });

    it('hält eine kurze Ausweichbewegung ganz vom Kopf fern', () => {
      // Links-rechts-links um je 8°: Genau der Fall, für den es sie gibt.
      let view = 0;
      for (const kart of [8, 0, -8, 0, 8, 0]) {
        for (let i = 0; i < 6; i++) view = stepViewYaw(view, kart * DEG, dead, STEP);
      }
      expect(view).toBe(0);
    });

    it('kommt in einer langen Kurve genau am Rand zur Ruhe', () => {
      // Das Kart dreht sich einmal um 90° und steht dann still; der Kopf holt
      // auf, bis die Totzone anfängt — und nicht weiter.
      let view = 0;
      for (let i = 0; i < Math.round(4 / STEP); i++) {
        view = stepViewYaw(view, Math.PI / 2, dead, STEP);
      }
      expect(view).toBeCloseTo(Math.PI / 2 - 10 * DEG, 3);
    });

    it('schraubt ihn auch ohne Nachlauf nur an den Rand', () => {
      expect(stepViewYaw(0, 40 * DEG, { lag: 0, dead: 10, rate: 0 }, STEP)).toBeCloseTo(
        30 * DEG,
        9,
      );
    });
  });

  describe('der Deckel auf der Drehrate', () => {
    it('lässt den Kopf nie schneller drehen als erlaubt', () => {
      // 6°/s bei einem Sechzigstel Sekunde: ein Zehntelgrad. Der Nachlauf
      // allein käme bei 17° Rückstand auf das Fünfzigfache.
      const step = stepViewYaw(0, 0.3, { lag: 0.05, dead: 0, rate: 6 }, 1 / 60);
      expect(step).toBeCloseTo(0.1 * DEG, 9);
      expect(stepViewYaw(0, 0.3, plain(0.05), 1 / 60)).toBeGreaterThan(0.05);
    });

    it('bremst nur, wo es zu schnell wäre', () => {
      // Ein kleiner Rückstand liegt unter dem Deckel — dann rechnet allein der
      // Nachlauf, und es kommt dasselbe heraus wie ohne Deckel.
      const capped = stepViewYaw(0, 0.01, { lag: 0.15, dead: 0, rate: 120 }, STEP);
      expect(capped).toBeCloseTo(stepViewYaw(0, 0.01, plain(0.15), STEP), 12);
    });

    it('nimmt ihn am harten Deckel trotzdem mit', () => {
      // Sehr langsam gestellt und trotzdem nicht quer zur Fahrt: `MAX_LAG` ist
      // keine Einstellung.
      const { view, kart } = drive({ lag: 0.15, dead: 10, rate: 5 }, 1.5, 3);
      expect(Math.abs(shortestAngle(kart - view))).toBeLessThanOrEqual(MAX_LAG * DEG + 1e-9);
    });
  });
});
