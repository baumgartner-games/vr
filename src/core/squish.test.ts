import {
  breathCurve,
  IDLE_AMPLITUDE,
  IDLE_PERIOD,
  SQUISH_AMPLITUDE,
  squishCurve,
  squishPose,
} from './squish';

/**
 * Die Kurve selbst ist Geschmack, und über Geschmack entscheidet kein Test.
 * Vier Eigenschaften sind trotzdem Rechnung, und ohne sie sieht man der Figur
 * sofort an, dass etwas nicht stimmt: Sie muss **rund über die Naht** zwischen
 * zwei Schritten laufen (sonst zuckt die Figur bei jedem Schritt), sie muss in
 * ihrem Band bleiben, sie muss **asymmetrisch** sein (sonst hätte ein Sinus
 * gereicht), und im Stehen muss sie verschwinden.
 */
describe('die Stauchungskurve', () => {
  it('läuft rund über die Naht zwischen zwei Schritten', () => {
    // Gleicher Wert am Anfang und am Ende — sonst springt die Figur.
    expect(squishCurve(0)).toBeCloseTo(squishCurve(1), 10);
    // Und gleiche Steigung: Der letzte Schritt vor der Naht und der erste
    // danach unterscheiden sich um fast nichts. Ein Knick wäre hier das
    // Zehnfache.
    const step = 1e-6;
    const before = (squishCurve(1 - step) - squishCurve(1 - 2 * step)) / step;
    const after = (squishCurve(step) - squishCurve(0)) / step;
    expect(Math.abs(before - after)).toBeLessThan(0.01);
    // Zum Vergleich: In der Mitte des Schrittes ist die Kurve unterwegs, dort
    // ist die Steigung deutlich von null verschieden. Eine Kurve, die überall
    // flach ist, wäre keine.
    expect(Math.abs((squishCurve(0.5 + step) - squishCurve(0.5)) / step)).toBeGreaterThan(0.5);
    // Was über 1 hinausgeht, fängt wieder von vorn an.
    expect(squishCurve(2.4)).toBeCloseTo(squishCurve(0.4), 10);
    expect(squishCurve(-0.6)).toBeCloseTo(squishCurve(0.4), 10);
  });

  it('bleibt zwischen flach und lang', () => {
    for (let i = 0; i <= 1000; i++) {
      const value = squishCurve(i / 1000);
      expect(value).toBeGreaterThanOrEqual(-1.05);
      expect(value).toBeLessThanOrEqual(1.05);
    }
  });

  /**
   * **Das ist der Grund für die Hermite-Kurve.** Ein Sinus wäre symmetrisch:
   * gleich lange hinauf wie hinunter. Diese Bewegung ist es nicht — das
   * Strecken beim Abstoßen geht schnell, das Zurücksinken zieht sich, und
   * genau daran erkennt das Auge einen Schritt und kein Pulsieren.
   */
  it('streckt schnell und sinkt langsam', () => {
    let peak = 0;
    let bestAt = 0;
    for (let i = 0; i <= 1000; i++) {
      const value = squishCurve(i / 1000);
      if (value > peak) {
        peak = value;
        bestAt = i / 1000;
      }
    }
    // Am längsten ist die Figur im ersten Drittel des Schrittes …
    expect(bestAt).toBeGreaterThan(0.15);
    expect(bestAt).toBeLessThan(0.35);
    // … und am flachsten beim Aufsetzen, also an der Naht.
    expect(squishCurve(0)).toBeCloseTo(-1, 10);
    // Die zweite Hälfte des Schrittes ist das Absinken: von oben nach unten,
    // ohne noch einmal umzukehren.
    for (let i = 700; i < 1000; i++) {
      expect(squishCurve((i + 1) / 1000)).toBeLessThan(squishCurve(i / 1000));
    }
  });
});

describe('die gestauchte Figur', () => {
  it('steht im Stehen still und ohne eingeschaltete Stauchung ohnehin', () => {
    // Im Stand federt niemand — solange nichts atmet (siehe unten).
    expect(squishPose({ phase: 1.2, stride: 0, amount: 1 })).toEqual({ height: 1, width: 1 });
    expect(squishPose({ phase: 1.2, stride: 1, amount: 0 })).toEqual({ height: 1, width: 1 });
    // Und ein Tempo von 0 wäre eine Figur, die in einer Haltung einfriert.
    expect(squishPose({ phase: 1.2, stride: 1, amount: 1, tempo: 0 })).toEqual({
      height: 1,
      width: 1,
    });
  });

  /**
   * **Das Tempo streckt den Takt und nicht den Ausschlag.** Ein Federn je
   * Schritt war die erste Fassung und zu schnell; bei ×0,5 zieht sich dasselbe
   * Federn über zwei Schritte. Wie **weit** die Figur dabei geht, ändert sich
   * nicht — sonst wäre das Tempo ein zweiter Stärkeregler.
   */
  it('zieht die Kurve über mehr Schritte, ohne den Ausschlag zu ändern', () => {
    // Bei halbem Tempo steht an Phase 2π dasselbe wie bei vollem an π.
    expect(squishPose({ phase: 2 * Math.PI, stride: 1, amount: 1, tempo: 0.5 }).height).toBeCloseTo(
      squishPose({ phase: Math.PI, stride: 1, amount: 1, tempo: 1 }).height,
      10,
    );
    // Der tiefste Punkt bleibt der tiefste, er kommt nur seltener.
    expect(squishPose({ phase: 0, stride: 1, amount: 1, tempo: 0.5 }).height).toBeCloseTo(
      squishPose({ phase: 0, stride: 1, amount: 1, tempo: 1 }).height,
      10,
    );
    let flattest = 1;
    let longest = 1;
    for (let i = 0; i <= 400; i++) {
      const { height } = squishPose({
        phase: (i / 400) * 4 * Math.PI,
        stride: 1,
        amount: 1,
        tempo: 0.5,
      });
      flattest = Math.min(flattest, height);
      longest = Math.max(longest, height);
    }
    expect(flattest).toBeCloseTo(1 - SQUISH_AMPLITUDE, 4);
    expect(longest).toBeGreaterThan(1 + SQUISH_AMPLITUDE * 0.85);
  });

  it('behält beim Federn ihr Volumen', () => {
    // Breite mal Breite mal Höhe bleibt 1: Wer sich streckt, wird schmaler.
    for (let i = 0; i < 40; i++) {
      const pose = squishPose({ phase: (i / 40) * Math.PI, stride: 1, amount: 2 });
      expect(pose.width * pose.width * pose.height).toBeCloseTo(1, 10);
      expect(pose.height > 1 ? pose.width < 1 : pose.width >= 1).toBe(true);
    }
  });

  it('schlägt so weit aus, wie die Stärke sagt', () => {
    // Beim Aufsetzen (Phase 0) ist die Figur am flachsten, und zwar um den
    // gemessenen Ausschlag mal Stärke mal Lauftempo.
    expect(squishPose({ phase: 0, stride: 1, amount: 1 }).height).toBeCloseTo(
      1 - SQUISH_AMPLITUDE,
      10,
    );
    expect(squishPose({ phase: 0, stride: 1, amount: 2 }).height).toBeCloseTo(
      1 - 2 * SQUISH_AMPLITUDE,
      10,
    );
    // Halbes **Lauftempo**, halber Ausschlag — im Schlendern federt niemand
    // wie im Rennen. Das ist `stride` und nicht der Tempo-Regler daneben: Der
    // ändert den Takt und nicht die Weite.
    expect(squishPose({ phase: 0, stride: 0.5, amount: 1 }).height).toBeCloseTo(
      1 - SQUISH_AMPLITUDE / 2,
      10,
    );
    // Und ein Schritt später dasselbe wieder: Die Figur setzt zweimal je Takt
    // auf, genau wie das Watscheln daneben.
    expect(squishPose({ phase: Math.PI, stride: 1, amount: 1 }).height).toBeCloseTo(
      squishPose({ phase: 0, stride: 1, amount: 1 }).height,
      10,
    );
  });

  it('schreibt in das Objekt, das sie bekommt', () => {
    // Je Bild und Figur kein neues Objekt — dieselbe Bauart wie die Vektoren
    // in `AvatarBody`.
    const out = { height: 0, width: 0 };
    expect(squishPose({ phase: 0.4 * Math.PI, stride: 1, amount: 1 }, out)).toBe(out);
    expect(out.height).not.toBe(0);
  });
});

/**
 * **Das Atmen** ist die zweite Bewegung, und sie hat genau eine Aufgabe: dass
 * die Figur im **Stand** nicht wie eine Statue dasteht. Alles, was hier
 * geprüft wird, hängt daran — sie muss im Stehen laufen, sie muss beim Gehen
 * verschwinden, sie muss flacher sein als ein Schritt, und sie darf die Figur
 * nicht im Mittel kleiner machen.
 */
describe('der Atem im Stehen', () => {
  it('geht hin und zurück und fängt bei der natürlichen Höhe an', () => {
    // Bei u = 0 steht die Figur, wie sie steht — ein Atem, den man einschaltet,
    // soll sie nicht im selben Bild kürzer machen.
    expect(breathCurve(0)).toBeCloseTo(0, 10);
    expect(breathCurve(0.25)).toBeCloseTo(1, 10);
    expect(breathCurve(0.75)).toBeCloseTo(-1, 10);
    // Und er läuft rund: Was über 1 hinausgeht, ist derselbe Atemzug wieder.
    expect(breathCurve(3.4)).toBeCloseTo(breathCurve(0.4), 10);
  });

  it('bewegt die Figur, während sie steht', () => {
    // Ein Viertel Atemzug nach dem Einschalten ist sie am längsten.
    const pose = squishPose({
      phase: 0,
      stride: 0,
      clock: IDLE_PERIOD / 4,
      idleAmount: 1,
      idleTempo: 1,
    });
    expect(pose.height).toBeCloseTo(1 + IDLE_AMPLITUDE, 10);
    // Und das Volumen bleibt auch hier erhalten.
    expect(pose.width * pose.width * pose.height).toBeCloseTo(1, 10);
  });

  it('streckt den Atemzug mit dem Tempo, ohne ihn tiefer zu machen', () => {
    // Bei halbem Tempo steht nach der doppelten Zeit dasselbe da.
    expect(
      squishPose({ phase: 0, stride: 0, clock: IDLE_PERIOD / 2, idleAmount: 1, idleTempo: 0.5 })
        .height,
    ).toBeCloseTo(
      squishPose({ phase: 0, stride: 0, clock: IDLE_PERIOD / 4, idleAmount: 1, idleTempo: 1 })
        .height,
      10,
    );
    // Und der tiefste Atemzug ist bei jedem Tempo gleich tief.
    for (const idleTempo of [0.25, 1, 2]) {
      let lowest = 1;
      let highest = 1;
      for (let i = 0; i <= 2000; i++) {
        const { height } = squishPose({
          phase: 0,
          stride: 0,
          clock: (i / 2000) * 4 * IDLE_PERIOD,
          idleAmount: 1,
          idleTempo,
        });
        lowest = Math.min(lowest, height);
        highest = Math.max(highest, height);
      }
      expect(lowest).toBeCloseTo(1 - IDLE_AMPLITUDE, 4);
      expect(highest).toBeCloseTo(1 + IDLE_AMPLITUDE, 4);
    }
  });

  /**
   * **Flacher als ein Schritt, und zwar bei gleicher Stärke.** Das ist der
   * ganze Unterschied zwischen den beiden Bewegungen: Dieselbe Zahl im Menü
   * heißt im Stehen weniger als beim Laufen — sonst pumpte eine wartende
   * Figur so stark, wie eine laufende federt.
   */
  it('bleibt flacher als das Federn beim Laufen', () => {
    expect(IDLE_AMPLITUDE).toBeLessThan(SQUISH_AMPLITUDE / 2);
    // Sogar bei doppelter Stärke bleibt das Atmen unter einem Schritt bei ×1.
    expect(2 * IDLE_AMPLITUDE).toBeLessThan(SQUISH_AMPLITUDE);
  });

  it('verschwindet, sobald die Figur losgeht', () => {
    // Im vollen Lauf ist vom Atem nichts mehr übrig: `stride` blendet ihn aus
    // und das Federn ein. Bei Phase 0 und voller Stärke steht deshalb genau
    // der Laufwert da, egal wie tief der Atem eingestellt ist.
    const walking = squishPose({
      phase: 0,
      stride: 1,
      clock: IDLE_PERIOD / 4,
      amount: 1,
      idleAmount: 2,
    });
    expect(walking.height).toBeCloseTo(1 - SQUISH_AMPLITUDE, 10);
    // Auf halbem Weg liegt die Mischung dazwischen — und beide Gewichte
    // zusammen sind eins, also blitzt beim Losgehen nichts auf.
    const half = squishPose({
      phase: 0,
      stride: 0.5,
      clock: IDLE_PERIOD / 4,
      amount: 1,
      idleAmount: 1,
    });
    expect(half.height).toBeCloseTo(1 - SQUISH_AMPLITUDE / 2 + IDLE_AMPLITUDE / 2, 10);
  });

  it('steht still, wenn er nicht eingeschaltet ist', () => {
    expect(squishPose({ phase: 0, stride: 0, clock: 1.7 })).toEqual({ height: 1, width: 1 });
    // Und ein Tempo von 0 wäre auch hier eine eingefrorene Haltung.
    expect(squishPose({ phase: 0, stride: 0, clock: 1.7, idleAmount: 1, idleTempo: 0 })).toEqual({
      height: 1,
      width: 1,
    });
  });
});
