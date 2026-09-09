import { SPRINT_RING, STICK_DEADZONE, STICK_RADIUS, stickValue } from './joystick';

describe('Der Stock', () => {
  it('tut in der Totzone nichts und danach ohne Sprung', () => {
    expect(stickValue(0, 0)).toEqual({ x: 0, z: 0, magnitude: 0, sprint: false });
    const dead = stickValue(STICK_RADIUS * STICK_DEADZONE * 0.9, 0);
    expect(dead.magnitude).toBe(0);
    const edge = stickValue(STICK_RADIUS * (STICK_DEADZONE + 0.001), 0);
    expect(edge.magnitude).toBeLessThan(0.01);
    expect(edge.x).toBeGreaterThan(0);
  });

  it('bleibt in der Einheitsscheibe und rennt am Ring', () => {
    const far = stickValue(300, -400);
    expect(Math.hypot(far.x, far.z)).toBeCloseTo(1);
    expect(far.sprint).toBe(true);
    expect(far.z).toBeLessThan(0);
    const walk = stickValue(STICK_RADIUS * (SPRINT_RING - 0.05), 0);
    expect(walk.sprint).toBe(false);
    expect(walk.magnitude).toBeGreaterThan(0.5);
  });
});
