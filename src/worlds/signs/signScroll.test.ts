import {
  SCROLL_PAUSE,
  STICK_DEAD_ZONE,
  clampScroll,
  maxScroll,
  newAutoScroll,
  stepAutoScroll,
  stickActive,
  stickScroll,
} from './signScroll';

describe('maxScroll und clampScroll', () => {
  it('rollt gar nicht, was hineinpasst', () => {
    expect(maxScroll({ content: 80, view: 100 })).toBe(0);
    expect(clampScroll(50, { content: 80, view: 100 })).toBe(0);
  });

  it('holt einen Stand zurück, der von einem längeren Text übrig ist', () => {
    expect(clampScroll(400, { content: 300, view: 100 })).toBe(200);
  });

  it('nimmt auch kaputte Zahlen an', () => {
    expect(clampScroll(Number.NaN, { content: 300, view: 100 })).toBe(0);
  });
});

describe('stepAutoScroll', () => {
  const limits = { content: 300, view: 100 };

  it('steht still, solange die erste Pause läuft', () => {
    const state = stepAutoScroll(newAutoScroll(), 1, { ...limits, speed: 50 });
    expect(state.offset).toBe(0);
    expect(state.wait).toBeCloseTo(SCROLL_PAUSE - 1);
  });

  it('läuft nach der Pause mit dem eingestellten Tempo', () => {
    const state = stepAutoScroll({ offset: 0, wait: 0 }, 0.5, { ...limits, speed: 50 });
    expect(state.offset).toBeCloseTo(25);
  });

  it('bleibt unten stehen und wartet, bevor es zurückspringt', () => {
    const bottom = stepAutoScroll({ offset: 190, wait: 0 }, 1, { ...limits, speed: 50 });
    expect(bottom.offset).toBe(200);
    expect(bottom.wait).toBeCloseTo(SCROLL_PAUSE);
    const holding = stepAutoScroll(bottom, 1, { ...limits, speed: 50 });
    expect(holding.offset).toBe(200);
    const wrapped = stepAutoScroll({ offset: 200, wait: 0.1 }, 0.2, { ...limits, speed: 50 });
    expect(wrapped.offset).toBe(0);
    expect(wrapped.wait).toBeCloseTo(SCROLL_PAUSE);
  });

  it('rollt nicht, was hineinpasst — und nicht, was auf null steht', () => {
    expect(
      stepAutoScroll({ offset: 40, wait: 0 }, 1, { content: 50, view: 100, speed: 50 }),
    ).toEqual({
      offset: 0,
      wait: SCROLL_PAUSE,
    });
    expect(stepAutoScroll({ offset: 40, wait: 0 }, 1, { ...limits, speed: 0 }).offset).toBe(0);
  });
});

describe('stickScroll', () => {
  const limits = { content: 500, view: 100 };

  it('lässt einen ruhenden Stick in Ruhe', () => {
    expect(stickScroll(120, 0.1, 1, 20, limits)).toBe(120);
    expect(stickActive(0.1)).toBe(false);
    expect(stickActive(STICK_DEAD_ZONE)).toBe(true);
  });

  it('fängt am Rand der toten Zone bei null Tempo an', () => {
    const barely = stickScroll(100, STICK_DEAD_ZONE + 0.001, 1, 20, limits);
    expect(barely - 100).toBeLessThan(0.5);
  });

  it('rollt mit vollem Ausschlag sechs Zeilen je Sekunde', () => {
    expect(stickScroll(0, 1, 1, 20, limits)).toBeCloseTo(120);
    expect(stickScroll(200, -1, 1, 20, limits)).toBeCloseTo(80);
  });

  it('kommt nicht über die Grenzen hinaus', () => {
    expect(stickScroll(390, 1, 1, 20, limits)).toBe(400);
    expect(stickScroll(10, -1, 1, 20, limits)).toBe(0);
  });
});
