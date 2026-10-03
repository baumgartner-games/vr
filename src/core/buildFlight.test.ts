import {
  BUILD_MAX_EYE,
  BUILD_MIN_EYE,
  BUILD_MIN_SPEED,
  BUILD_PAN,
  buildFlight,
  flightStep,
  onBuildFlight,
  setBuildFlight,
} from './buildFlight';

describe('flightStep', () => {
  it('fliegt mit dem linken Stick nach vorn dorthin, wohin der Kopf schaut', () => {
    // Blick nach −z (yaw 0), Stick ganz nach vorn (y = −1).
    const step = flightStep({ x: 0, y: -1 }, 0, 0, 20, 0.5);
    expect(step.x).toBeCloseTo(0);
    expect(step.z).toBeCloseTo(-20 * BUILD_PAN * 0.5);
    expect(step.y).toBe(0);
  });

  it('fliegt seitwärts quer zum Blick und dreht mit dem Kopf', () => {
    const right = flightStep({ x: 1, y: 0 }, 0, 0, 10, 1);
    expect(right.x).toBeGreaterThan(0);
    expect(right.z).toBeCloseTo(0);
    // Nach links gedreht (yaw +90°): vorn ist −x.
    const turned = flightStep({ x: 0, y: -1 }, 0, Math.PI / 2, 10, 1);
    expect(turned.x).toBeLessThan(0);
    expect(turned.z).toBeCloseTo(0);
  });

  it('wird mit der Höhe schneller und unten nicht langsamer als die Untergrenze', () => {
    const high = flightStep({ x: 0, y: -1 }, 0, 0, 100, 1);
    const low = flightStep({ x: 0, y: -1 }, 0, 0, 2, 1);
    expect(Math.abs(high.z)).toBeGreaterThan(Math.abs(low.z));
    expect(Math.abs(low.z)).toBeCloseTo(BUILD_MIN_SPEED * BUILD_PAN);
  });

  it('steigt mit dem rechten Stick nach vorn und sinkt nach hinten', () => {
    expect(flightStep({ x: 0, y: 0 }, -1, 0, 20, 0.1).y).toBeGreaterThan(0);
    expect(flightStep({ x: 0, y: 0 }, 1, 0, 20, 0.1).y).toBeLessThan(0);
  });

  it('bleibt zwischen der tiefsten und der höchsten Augenhöhe', () => {
    expect(BUILD_MIN_EYE + flightStep({ x: 0, y: 0 }, 1, 0, BUILD_MIN_EYE, 1).y).toBe(
      BUILD_MIN_EYE,
    );
    expect(BUILD_MAX_EYE + flightStep({ x: 0, y: 0 }, -1, 0, BUILD_MAX_EYE, 1).y).toBe(
      BUILD_MAX_EYE,
    );
    // Wer darunter steht, darf nur steigen.
    expect(flightStep({ x: 0, y: 0 }, 1, 0, 1, 1).y).toBe(0);
    expect(flightStep({ x: 0, y: 0 }, -1, 0, 1, 1).y).toBeGreaterThan(0);
  });

  it('ruht in der Totzone und ohne Zeit', () => {
    expect(flightStep({ x: 0.1, y: -0.1 }, 0.1, 0, 20, 1)).toEqual({ x: 0, y: 0, z: 0 });
    expect(flightStep({ x: 1, y: 1 }, 1, 0, 20, 0)).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe('buildFlight', () => {
  afterEach(() => setBuildFlight(false));

  it('fängt aus an und sagt einen Wechsel genau einmal', () => {
    expect(buildFlight()).toBe(false);
    const heard: boolean[] = [];
    const off = onBuildFlight((on) => heard.push(on));
    setBuildFlight(true);
    setBuildFlight(true);
    setBuildFlight(false);
    off();
    setBuildFlight(true);
    expect(heard).toEqual([true, false]);
  });
});
