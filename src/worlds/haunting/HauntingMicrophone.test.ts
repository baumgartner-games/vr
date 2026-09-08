import { sharedAudio } from '../../core/Audio';
import { HauntingMicrophone } from './HauntingMicrophone';

jest.mock('../../core/Audio', () => ({ sharedAudio: jest.fn() }));

function deferred<T>(): {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
} {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function microphoneRig(): {
  context: AudioContext;
  stream: MediaStream;
  track: { stop: jest.Mock; ended: (() => void) | null };
  analyser: { getFloatTimeDomainData: jest.Mock; disconnect: jest.Mock };
  source: { connect: jest.Mock; disconnect: jest.Mock };
  setAmplitude(value: number): void;
} {
  let amplitude = 0;
  const track = {
    readyState: 'live',
    ended: null as (() => void) | null,
    stop: jest.fn(),
    addEventListener: jest.fn((_event: string, callback: () => void) => {
      track.ended = callback;
    }),
    removeEventListener: jest.fn(() => {
      track.ended = null;
    }),
  };
  const stream = {
    getTracks: () => [track],
    getAudioTracks: () => [track],
  } as unknown as MediaStream;
  const analyser = {
    fftSize: 0,
    smoothingTimeConstant: 0,
    disconnect: jest.fn(),
    getFloatTimeDomainData: jest.fn((array: Float32Array) => {
      for (let i = 0; i < array.length; i++) array[i] = i % 2 ? amplitude : -amplitude;
    }),
  };
  const source = { connect: jest.fn(), disconnect: jest.fn() };
  const context = {
    state: 'running',
    createAnalyser: () => analyser,
    createMediaStreamSource: () => source,
  } as unknown as AudioContext;
  return {
    context,
    stream,
    track,
    analyser,
    source,
    setAmplitude: (value) => {
      amplitude = value;
    },
  };
}

describe('explicit local microphone sensing', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let getUserMedia: jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
    getUserMedia = jest.fn();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { mediaDevices: { getUserMedia } },
    });
  });
  afterAll(() => {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else Reflect.deleteProperty(globalThis, 'navigator');
  });

  test('construction and frame updates cannot request permission or create audio nodes', () => {
    const mic = new HauntingMicrophone({ changed: jest.fn(), say: jest.fn() });
    for (let i = 0; i < 200; i++) mic.update(0.05);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(sharedAudio).not.toHaveBeenCalled();
    expect(mic.enabled).toBe(false);
    expect(mic.level).toBe(0);
    mic.dispose();
  });

  test('only explicit toggle captures audio; a reused 20 Hz buffer produces bounded, gated levels', async () => {
    const rig = microphoneRig();
    (sharedAudio as jest.Mock).mockReturnValue(rig.context);
    getUserMedia.mockResolvedValue(rig.stream);
    const mic = new HauntingMicrophone({ changed: jest.fn(), say: jest.fn() });
    await mic.toggle();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia.mock.calls[0]![0].video).toBe(false);
    expect(mic.enabled).toBe(true);
    expect(rig.source.connect).toHaveBeenCalledWith(rig.analyser);
    rig.setAmplitude(0.005);
    for (let i = 0; i < 100; i++) mic.update(0.01);
    expect(rig.analyser.getFloatTimeDomainData.mock.calls.length).toBeLessThanOrEqual(20);
    expect(mic.level).toBe(0);
    rig.setAmplitude(0.2);
    for (let i = 0; i < 20; i++) mic.update(0.05);
    expect(mic.level).toBeGreaterThan(0.95);
    expect(mic.level).toBeLessThanOrEqual(1);
    const buffers = rig.analyser.getFloatTimeDomainData.mock.calls.map((call) => call[0]);
    expect(new Set(buffers).size).toBe(1);
    rig.setAmplitude(0);
    for (let i = 0; i < 30; i++) mic.update(0.05);
    expect(mic.level).toBe(0);
    await mic.toggle();
    expect(mic.enabled).toBe(false);
    expect(rig.track.stop).toHaveBeenCalledTimes(1);
    expect(rig.source.disconnect).toHaveBeenCalledTimes(1);
    expect(rig.analyser.disconnect).toHaveBeenCalledTimes(1);
  });

  test.each(['cancel', 'dispose'] as const)(
    'a late permission result after %s is immediately stopped',
    async (action) => {
      const rig = microphoneRig(),
        request = deferred<MediaStream>();
      (sharedAudio as jest.Mock).mockReturnValue(rig.context);
      getUserMedia.mockReturnValue(request.promise);
      const changed = jest.fn(),
        say = jest.fn();
      const mic = new HauntingMicrophone({ changed, say });
      const pending = mic.toggle();
      expect(mic.pending).toBe(true);
      if (action === 'dispose') mic.dispose();
      else await mic.toggle();
      const calls = changed.mock.calls.length;
      request.resolve(rig.stream);
      await pending;
      expect(mic.enabled).toBe(false);
      expect(mic.level).toBe(0);
      expect(rig.track.stop).toHaveBeenCalledTimes(1);
      expect(rig.source.connect).not.toHaveBeenCalled();
      expect(changed).toHaveBeenCalledTimes(calls);
    },
  );

  test('permission refusal leaves no stream and requires another explicit attempt', async () => {
    const rig = microphoneRig();
    (sharedAudio as jest.Mock).mockReturnValue(rig.context);
    getUserMedia.mockRejectedValue(
      Object.assign(new Error('refused'), { name: 'NotAllowedError' }),
    );
    const say = jest.fn(),
      mic = new HauntingMicrophone({ changed: jest.fn(), say });
    await mic.toggle();
    for (let i = 0; i < 100; i++) mic.update(0.1);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(mic.status).toBe('denied');
    expect(mic.enabled).toBe(false);
    expect(say).toHaveBeenCalledWith(expect.stringContaining('ohne Mikrofon'));
  });

  test('unplugging or disposal releases active capture and disconnects its graph', async () => {
    const rig = microphoneRig();
    (sharedAudio as jest.Mock).mockReturnValue(rig.context);
    getUserMedia.mockResolvedValue(rig.stream);
    const mic = new HauntingMicrophone({ changed: jest.fn(), say: jest.fn() });
    await mic.toggle();
    rig.track.ended!();
    expect(mic.enabled).toBe(false);
    expect(rig.track.stop).toHaveBeenCalledTimes(1);
    expect(rig.source.disconnect).toHaveBeenCalledTimes(1);
    mic.dispose();
    mic.dispose();
    expect(rig.track.stop).toHaveBeenCalledTimes(1);
  });

  test('cancelling during context resume stops the already acquired stream', async () => {
    const rig = microphoneRig(),
      resume = deferred<void>();
    (sharedAudio as jest.Mock).mockReturnValue({
      ...rig.context,
      state: 'suspended',
      resume: () => resume.promise,
    });
    getUserMedia.mockResolvedValue(rig.stream);
    const mic = new HauntingMicrophone({ changed: jest.fn(), say: jest.fn() });
    const pending = mic.toggle();
    await Promise.resolve();
    mic.dispose();
    resume.resolve();
    await pending;
    expect(rig.track.stop).toHaveBeenCalledTimes(1);
    expect(rig.source.connect).not.toHaveBeenCalled();
  });
});
