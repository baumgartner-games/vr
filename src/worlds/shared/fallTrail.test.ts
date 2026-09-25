import { FallTrail, TRAIL_SIZE, TRAIL_STEP, fallReportText } from './fallTrail';

describe('Die Spur vor einem Sturz', () => {
  it('merkt sich alle paar Zehntel eine Stelle und nur die letzten', () => {
    const trail = new FallTrail();
    for (let i = 0; i < 1000; i++) trail.record(1 / 60, i * 0.01, 0, 0, true);
    expect(trail.trail).toHaveLength(TRAIL_SIZE);
    const gaps = trail.trail.slice(1).map((p, i) => p.t - trail.trail[i]!.t);
    for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(TRAIL_STEP - 1e-9);
    // Die jüngste Stelle ist die zuletzt gelaufene.
    expect(trail.trail.at(-1)!.x).toBeGreaterThan(9);
  });

  it('schreibt einen Bericht mit der letzten Stelle, an der Boden war', () => {
    const trail = new FallTrail();
    trail.record(0.3, 1.25, 0, 2.5, true);
    trail.record(0.3, 1.75, 0, 2.0, true);
    trail.record(0.3, 2.1, -3, 1.6, false);
    const text = fallReportText('#haunting', trail.trail, { x: 2.2, y: -31, z: 1.5 });
    const lines = text.split('\n');
    expect(lines[0]).toContain('#haunting');
    expect(lines[0]).toContain('x 2.20 z 1.50');
    expect(lines).toHaveLength(5);
    expect(lines[3]).toContain('← letzter Boden');
    expect(lines[3]).toContain('1|2');
    expect(lines[4]).toContain('~');
  });
});
