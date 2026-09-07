import { CRASH_PAD, landOnCushion, newViewSink, stepViewSink } from './viewSink';

/** Eine ganze Landung durchrechnen und mitschreiben, was die Sicht macht. */
function fall(speed: number, seconds = 2, dt = 1 / 90): number[] {
  const sink = newViewSink();
  landOnCushion(sink, speed);
  const track: number[] = [];
  for (let t = 0; t < seconds; t += dt) track.push(stepViewSink(sink, dt));
  return track;
}

describe('landOnCushion', () => {
  it('rührt sich nicht ohne Aufprall', () => {
    const sink = newViewSink();
    landOnCushion(sink, 0);
    expect(stepViewSink(sink, 1 / 90)).toBe(0);
  });

  it('sinkt ein und kommt wieder hoch', () => {
    const track = fall(6);
    const deepest = Math.max(...track);
    expect(deepest).toBeGreaterThan(0.05);
    // Und am Ende steht die Sicht wieder dort, wo sie hingehört.
    expect(track[track.length - 1]).toBeCloseTo(0, 3);
  });

  it('federt über die Ruhelage hinaus zurück — daran erkennt man ein Kissen', () => {
    const track = fall(6);
    expect(Math.min(...track)).toBeLessThan(0);
  });

  it('sinkt tiefer, je härter der Aufprall', () => {
    expect(Math.max(...fall(8))).toBeGreaterThan(Math.max(...fall(3)));
  });

  it('sinkt nie tiefer als das Kissen dick ist', () => {
    // Freier Fall aus der Halle heraus, und noch einmal das Doppelte.
    for (const speed of [12, 24, 100]) {
      const track = fall(speed);
      expect(Math.max(...track)).toBeLessThanOrEqual(CRASH_PAD.maxDepth + 1e-9);
      expect(Math.min(...track)).toBeGreaterThanOrEqual(-CRASH_PAD.maxRise - 1e-9);
    }
  });

  it('ist in gut einer halben Sekunde durch', () => {
    const dt = 1 / 90;
    const track = fall(6, 1, dt);
    const settled = track.findIndex((depth, i) => i > 20 && Math.abs(depth) < 0.01);
    expect(settled).toBeGreaterThan(0);
    expect(settled * dt).toBeLessThan(0.8);
  });

  it('die zweite Landung im selben Moment schwächt die erste nicht ab', () => {
    const sink = newViewSink();
    landOnCushion(sink, 8);
    const hard = sink.rate;
    landOnCushion(sink, 1);
    expect(sink.rate).toBe(hard);
  });
});

describe('stepViewSink', () => {
  it('bleibt auch bei einem Bild von einer halben Sekunde ruhig', () => {
    const sink = newViewSink();
    landOnCushion(sink, 10);
    // Ein Nachladeruckler mitten in der Landung darf die Feder nicht sprengen.
    for (let i = 0; i < 20; i++) {
      const depth = stepViewSink(sink, 0.5);
      expect(Number.isFinite(depth)).toBe(true);
      expect(Math.abs(depth)).toBeLessThanOrEqual(CRASH_PAD.maxDepth + 1e-9);
    }
  });

  it('kommt in Ruhe wirklich auf null und bleibt dort', () => {
    const sink = newViewSink();
    landOnCushion(sink, 5);
    for (let i = 0; i < 400; i++) stepViewSink(sink, 1 / 90);
    expect(sink.depth).toBe(0);
    expect(sink.rate).toBe(0);
    expect(stepViewSink(sink, 1 / 90)).toBe(0);
  });

  it('landet bei 20 wie bei 90 Bildern in der Sekunde an derselben Stelle', () => {
    // Genau dafür sind die Unterschritte da: Die Federung darf nicht davon
    // abhängen, wie schnell die Brille gerade zeichnet.
    const depthAfter = (dt: number): number => {
      const sink = newViewSink();
      landOnCushion(sink, 6);
      for (let t = 0; t + 1e-9 < 0.5; t += dt) stepViewSink(sink, dt);
      return sink.depth;
    };
    expect(depthAfter(1 / 20)).toBeCloseTo(depthAfter(1 / 90), 3);
  });
});
