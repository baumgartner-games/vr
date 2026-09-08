import { FrameSampler } from './FrameStats';

describe('frame diagnostics', () => {
  it('measures a slow animation cadence without the game-dt clamp', () => {
    const sampler = new FrameSampler();
    sampler.sample(0, 1, 0, 0);
    let result = null;
    for (let time = 100; time <= 500; time += 100) result = sampler.sample(time, 12, 80, 2400);
    expect(result).toEqual({ fps: 10, frameMs: 100, cpuMs: 12, calls: 80, triangles: 2400 });
  });

  it('publishes no more than twice per second, including variable rendering costs', () => {
    const sampler = new FrameSampler();
    sampler.sample(0, 0, 0, 0);
    for (let time = 100; time < 500; time += 100) {
      expect(sampler.sample(time, 2, 100, 1000)).toBeNull();
    }
    expect(sampler.sample(500, 12, 200, 6000)).toEqual({
      fps: 10,
      frameMs: 100,
      cpuMs: 4,
      calls: 120,
      triangles: 2000,
    });
    expect(sampler.sample(600, 2, 100, 1000)).toBeNull();
  });

  it('discards a suspended tab instead of averaging its pause into the next sample', () => {
    const sampler = new FrameSampler();
    sampler.sample(0, 1, 1, 1);
    sampler.sample(100, 99, 9999, 9999);
    expect(sampler.sample(10000, 99, 9999, 9999)).toBeNull();
    expect(sampler.sample(10500, 5, 10, 100)).toEqual({
      fps: 2,
      frameMs: 500,
      cpuMs: 5,
      calls: 10,
      triangles: 100,
    });
  });

  it('starts a fresh measurement after a world or visibility change', () => {
    const sampler = new FrameSampler();
    sampler.sample(0, 1, 1, 1);
    sampler.sample(100, 1, 1, 1);
    sampler.reset();
    expect(sampler.sample(10000, 1, 1, 1)).toBeNull();
    expect(sampler.sample(10500, 1, 1, 1)?.fps).toBe(2);
  });
});
