import { sharedAudio } from '../../core/Audio';
import { ShipAudio, SHIP_AUDIO_VOICES, spatialMix } from './shipAudio';

jest.mock('../../core/Audio', () => ({ sharedAudio: jest.fn() }));

function fakeAudio(): {
  context: AudioContext;
  scheduled: Array<{ onended: (() => void) | null; stop: jest.Mock }>;
} {
  const scheduled: Array<{ onended: (() => void) | null; stop: jest.Mock }> = [];
  const parameter = () => ({
    value: 0,
    setValueAtTime: jest.fn(),
    setTargetAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  });
  const node = () => {
    const one = {
      gain: parameter(),
      pan: parameter(),
      frequency: parameter(),
      playbackRate: parameter(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      onended: null as (() => void) | null,
      type: 'sine',
    };
    one.connect.mockReturnValue(one);
    return one;
  };
  const source = (buffer: boolean) => {
    const one = node();
    if (buffer) Object.assign(one, { buffer: null });
    scheduled.push(one);
    return one;
  };
  return {
    scheduled,
    context: {
      state: 'running',
      currentTime: 0,
      sampleRate: 32,
      destination: node(),
      createGain: node,
      createStereoPanner: node,
      createOscillator: () => source(false),
      createBufferSource: () => source(true),
      createBuffer: () => ({ getChannelData: () => new Float32Array(32) }),
    } as unknown as AudioContext,
  };
}

describe('station spatial audio', () => {
  test('the same source moves from the right ear to left ear when the listener turns', () => {
    const listener = { x: 0, z: 0 },
      source = { x: 3, z: 0 };
    expect(spatialMix(listener, { x: 0, z: -1 }, source).pan).toBe(1);
    expect(spatialMix(listener, { x: 0, z: 1 }, source).pan).toBe(-1);
    expect(spatialMix(listener, { x: 1, z: 0 }, source).pan).toBe(0);
  });
  test('distance falloff is bounded, monotonic and silent beyond the audible radius', () => {
    const listener = { x: 0, z: 0 },
      forward = { x: 0, z: -1 };
    const samples = [0, 2, 8, 14, 29].map((z) => spatialMix(listener, forward, { x: 0, z }).gain);
    expect(samples[0]).toBe(1);
    for (let i = 1; i < samples.length; i++) expect(samples[i]).toBeLessThan(samples[i - 1]!);
    expect(samples.at(-1)).toBe(0);
    expect(spatialMix(listener, forward, { x: NaN, z: Infinity })).toEqual({ pan: 0, gain: 0 });
    const scratch = { pan: 0, gain: 0 };
    expect(spatialMix(listener, forward, { x: 2, z: 0 }, scratch)).toBe(scratch);
    expect(scratch.pan).toBe(1);
  });

  test('a burst cannot exceed eight voices, freed slots are reused, and disposal stops every source', () => {
    const { context, scheduled } = fakeAudio();
    (sharedAudio as jest.Mock).mockReturnValue(context);
    const audio = new ShipAudio();
    for (let i = 0; i < 100; i++) audio.play('spark', { x: 0, z: 0 });
    expect(audio.activeVoices).toBe(SHIP_AUDIO_VOICES);
    expect(scheduled).toHaveLength(SHIP_AUDIO_VOICES + 1); // one persistent machine oscillator
    scheduled[1]!.onended!();
    audio.play('door', { x: 0, z: 0 });
    expect(audio.activeVoices).toBe(SHIP_AUDIO_VOICES);
    audio.dispose();
    audio.dispose();
    expect(audio.activeVoices).toBe(0);
    for (const source of scheduled) expect(source.stop).toHaveBeenCalled();
    const before = scheduled.length;
    audio.play('step', { x: 0, z: 0 });
    expect(scheduled).toHaveLength(before);
  });

  test('safe training never emits automatic hostile footsteps or vent sounds', () => {
    const { context, scheduled } = fakeAudio();
    (sharedAudio as jest.Mock).mockReturnValue(context);
    const audio = new ShipAudio();
    for (let i = 0; i < 100; i++)
      audio.update(0.1, {
        listener: { x: 0, z: 0 },
        forward: { x: 0, z: -1 },
        monster: { x: 1, z: 0 },
        kind: 'crawler',
        active: true,
        test: true,
        venting: i % 2 === 0,
      });
    expect(audio.activeVoices).toBe(0);
    expect(scheduled).toHaveLength(1);
    audio.setEnabled(false);
    audio.play('step', { x: 0, z: 0 });
    expect(audio.activeVoices).toBe(0);
    audio.dispose();
  });

  test('the technician can hear quiet walking and exertion in training without any monster', () => {
    const { context, scheduled } = fakeAudio();
    (sharedAudio as jest.Mock).mockReturnValue(context);
    const audio = new ShipAudio();
    audio.update(0.05, {
      listener: { x: 2, z: 1 },
      forward: { x: 0, z: -1 },
      monster: null,
      kind: 'crawler',
      active: false,
      test: true,
      venting: false,
      playerSpeed: 3,
      exertion: 0.8,
    });
    expect(audio.activeVoices).toBe(2);
    expect(scheduled).toHaveLength(3);
    audio.dispose();
  });
});
