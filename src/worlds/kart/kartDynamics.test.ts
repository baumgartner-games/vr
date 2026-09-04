import { clampKart } from './kartSettings';
import {
  kartAt,
  kartForwardSpeed,
  kartSlip,
  kartSpeed,
  stepKart,
  type KartInput,
  type KartMotion,
} from './kartDynamics';

const STEP = 1 / 60;
const IDLE: KartInput = { throttle: 0, brake: 0, steer: 0 };

/** Drives a kart for `seconds` with one fixed input. */
function drive(motion: KartMotion, input: Partial<KartInput>, seconds: number, settings = clampKart({})): KartMotion {
  let state = motion;
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    state = stepKart(state, { ...IDLE, ...input }, settings, STEP);
  }
  return state;
}

describe('stepKart', () => {
  it('does nothing without time', () => {
    const start = kartAt(1, 2, 0.5);
    expect(stepKart(start, { throttle: 1, brake: 0, steer: 1 }, clampKart({}), 0)).toEqual(start);
  });

  it('accelerates towards the top speed and stops there', () => {
    const settings = clampKart({});
    const after = drive(kartAt(0, 0, 0), { throttle: 1 }, 20, settings);
    const speed = kartForwardSpeed(after);
    expect(speed).toBeGreaterThan((settings.topSpeed / 3.6) * 0.9);
    expect(speed).toBeLessThanOrEqual(settings.topSpeed / 3.6 + 1e-9);
  });

  it('drives along its own nose', () => {
    // yaw 0 looks along -Z, so a kart at rest there goes straight backwards.
    const after = drive(kartAt(0, 0, 0), { throttle: 1 }, 2);
    expect(after.z).toBeLessThan(-1);
    expect(Math.abs(after.x)).toBeLessThan(1e-9);
  });

  it('rolls out to a stop when the throttle is let go', () => {
    const rolling = drive(kartAt(0, 0, 0), { throttle: 1 }, 5);
    const coasted = drive(rolling, {}, 12);
    expect(kartSpeed(coasted)).toBe(0);
  });

  it('brakes harder than it coasts', () => {
    const rolling = drive(kartAt(0, 0, 0), { throttle: 1 }, 5);
    const coasted = drive(rolling, {}, 0.6);
    const braked = drive(rolling, { brake: 1 }, 0.6);
    expect(kartForwardSpeed(braked)).toBeLessThan(kartForwardSpeed(coasted));
  });

  it('uses the brake as the reverse gear once it stands', () => {
    const settings = clampKart({});
    const back = drive(kartAt(0, 0, 0), { brake: 1 }, 6, settings);
    const speed = kartForwardSpeed(back);
    expect(speed).toBeLessThan(-1);
    expect(speed).toBeGreaterThanOrEqual(-settings.reverse / 3.6 - 1e-9);
  });

  it('does not turn while it stands still', () => {
    const after = drive(kartAt(0, 0, 0), { steer: 1 }, 2);
    expect(after.yaw).toBe(0);
  });

  it('turns left with a positive steering input', () => {
    const rolling = drive(kartAt(0, 0, 0), { throttle: 1 }, 3);
    const left = drive(rolling, { throttle: 1, steer: 1 }, 1);
    const right = drive(rolling, { throttle: 1, steer: -1 }, 1);
    expect(left.yaw).toBeGreaterThan(rolling.yaw);
    expect(right.yaw).toBeLessThan(rolling.yaw);
  });

  it('turns tighter with a shorter wheelbase', () => {
    const short = clampKart({ wheelbase: 0.7 });
    const long = clampKart({ wheelbase: 2.2 });
    const rollingShort = drive(kartAt(0, 0, 0), { throttle: 1 }, 3, short);
    const rollingLong = drive(kartAt(0, 0, 0), { throttle: 1 }, 3, long);
    const turnedShort = drive(rollingShort, { throttle: 1, steer: 1 }, 1, short).yaw - rollingShort.yaw;
    const turnedLong = drive(rollingLong, { throttle: 1, steer: 1 }, 1, long).yaw - rollingLong.yaw;
    expect(turnedShort).toBeGreaterThan(turnedLong);
  });

  it('makes a heavy kart pull away worse than a light one', () => {
    const light = clampKart({ mass: 70 });
    const heavy = clampKart({ mass: 650 });
    const afterLight = drive(kartAt(0, 0, 0), { throttle: 1 }, 1, light);
    const afterHeavy = drive(kartAt(0, 0, 0), { throttle: 1 }, 1, heavy);
    expect(kartSpeed(afterLight)).toBeGreaterThan(kartSpeed(afterHeavy));
  });

  it('slides through a corner when the tyres have no grip', () => {
    const slippery = clampKart({ traction: 0.15 });
    const sticky = clampKart({ traction: 1 });
    const cornerSlippery = drive(
      drive(kartAt(0, 0, 0), { throttle: 1 }, 4, slippery),
      { throttle: 1, steer: 1 },
      0.8,
      slippery,
    );
    const cornerSticky = drive(
      drive(kartAt(0, 0, 0), { throttle: 1 }, 4, sticky),
      { throttle: 1, steer: 1 },
      0.8,
      sticky,
    );
    expect(kartSlip(cornerSlippery)).toBeGreaterThan(kartSlip(cornerSticky));
  });
});
