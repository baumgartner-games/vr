import { sharedAudio } from '../../../core/Audio';
import { assets, assetsOf, registerAsset } from '../registry';
import { AUDIO_CUES, CUE_IDS, cueAssetId, type CueId } from './cues';
import { registerAudioCues } from './cues.register';
import { AUDIO_HZ, HauntingAudio } from './hauntingAudio';
import { Mixer, MIXER_VOICES } from './mixer';
import type { SoundEvent } from './soundscape';
import { emptySnapshot } from '../map/mapSnapshot';

jest.mock('../../../core/Audio', () => ({ sharedAudio: jest.fn() }));

interface Fake {
  context: AudioContext;
  scheduled: Array<{
    onended: (() => void) | null;
    stop: jest.Mock;
    start: jest.Mock;
    buffer?: unknown;
    type?: string;
  }>;
  gains: Array<{ gain: { setTargetAtTime: jest.Mock; setValueAtTime: jest.Mock } }>;
}

function fakeAudio(): Fake {
  const scheduled: Fake['scheduled'] = [];
  const gains: Fake['gains'] = [];
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
    gains,
    context: {
      state: 'running',
      currentTime: 0,
      sampleRate: 32,
      destination: node(),
      createGain: () => {
        const one = node();
        gains.push(one);
        return one;
      },
      createStereoPanner: node,
      createOscillator: () => source(false),
      createBufferSource: () => source(true),
      createBuffer: () => ({ getChannelData: () => new Float32Array(32), duration: 1 }),
    } as unknown as AudioContext,
  };
}

const event = (cue: SoundEvent['cue'], gain = 1): SoundEvent => ({
  cue,
  at: { x: 0, z: 0 },
  from: { x: 0, z: 0 },
  distance: 0,
  gain,
  pan: 0,
  delay: 0,
});

beforeEach(() => {
  assets.clear();
});

describe('Die Cues in der Registry', () => {
  it('meldet fünf Audio-Assets des Pakets audio an, jedes mit Platzhalter', () => {
    registerAudioCues();
    const entries = assetsOf('audio');
    expect(entries.map((e) => e.id).sort()).toEqual(CUE_IDS.map(cueAssetId).sort());
    for (const entry of entries) {
      expect(entry.owner).toBe('audio');
      expect(entry.load()).toBe(AUDIO_CUES[entry.id.slice('audio:'.length) as CueId].placeholder);
    }
    for (const cue of Object.values(AUDIO_CUES)) expect(cue.file).toMatch(/\.ogg$/);
  });
});

describe('Der Mixer', () => {
  it('holt beim Start Platzhalter und versprochene Aufnahmen ab — danach nichts mehr', async () => {
    registerAudioCues();
    const buffer = { getChannelData: () => new Float32Array(8), duration: 0.3 };
    registerAsset({
      id: cueAssetId('monster-call'),
      kind: 'audio',
      owner: 'audio',
      load: () => Promise.resolve(buffer),
    });
    registerAsset({
      id: cueAssetId('heartbeat'),
      kind: 'audio',
      owner: 'audio',
      load: () => Promise.reject(new Error('fehlt')),
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const mixer = new Mixer();
    expect(mixer.ready).toBe(false);
    await mixer.prime();
    expect(mixer.ready).toBe(true);
    expect(mixer.sourceOf('monster-run')).toBe(AUDIO_CUES['monster-run'].placeholder);
    expect(mixer.sourceOf('monster-call')).toBe(buffer);
    expect(mixer.sourceOf('heartbeat')).toBe(AUDIO_CUES.heartbeat.placeholder);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('nimmt ohne Registry die Tabelle und spielt eine Aufnahme wie einen Platzhalter', async () => {
    const { context, scheduled } = fakeAudio();
    (sharedAudio as jest.Mock).mockReturnValue(context);
    const buffer = { getChannelData: () => new Float32Array(8), duration: 0.3 };
    registerAsset({
      id: cueAssetId('monster-walk'),
      kind: 'audio',
      owner: 'audio',
      load: () => buffer,
    });
    const mixer = new Mixer();
    await mixer.prime();
    mixer.play(event('monster-walk'));
    mixer.play(event('monster-run'));
    mixer.play(event('heartbeat'));
    expect(mixer.activeVoices).toBe(3);
    expect(scheduled[0]!.buffer).toBe(buffer);
    expect(scheduled[1]!.buffer).not.toBeUndefined(); // Rauschen
    expect(scheduled[2]!.type).toBe('sine');
    mixer.dispose();
  });

  it('begrenzt die Stimmen, gibt sie nach dem Ende frei und räumt beim Entsorgen alles ab', () => {
    const { context, scheduled } = fakeAudio();
    (sharedAudio as jest.Mock).mockReturnValue(context);
    const mixer = new Mixer();
    for (let i = 0; i < 40; i++) mixer.play(event('player-step'));
    expect(mixer.activeVoices).toBe(MIXER_VOICES);
    expect(scheduled).toHaveLength(MIXER_VOICES);
    scheduled[2]!.onended!();
    expect(mixer.activeVoices).toBe(MIXER_VOICES - 1);
    mixer.play(event('monster-call'));
    expect(mixer.activeVoices).toBe(MIXER_VOICES);
    // Zu leise für ein Ohr: gar nicht erst anlegen.
    mixer.play(event('monster-walk', 0.001));
    expect(scheduled).toHaveLength(MIXER_VOICES + 1);
    mixer.dispose();
    mixer.dispose();
    expect(mixer.activeVoices).toBe(0);
    for (const source of scheduled) expect(source.stop).toHaveBeenCalled();
    mixer.play(event('heartbeat'));
    expect(scheduled).toHaveLength(MIXER_VOICES + 1);
  });

  it('spielt nichts, solange kein Kontext läuft oder der Ton aus ist', () => {
    (sharedAudio as jest.Mock).mockReturnValue(null);
    const silent = new Mixer();
    silent.play(event('heartbeat'));
    expect(silent.activeVoices).toBe(0);
    const { context, scheduled } = fakeAudio();
    (sharedAudio as jest.Mock).mockReturnValue(context);
    const mixer = new Mixer();
    mixer.setEnabled(false);
    mixer.play(event('heartbeat'));
    expect(scheduled).toHaveLength(0);
    mixer.setEnabled(true);
    mixer.play(event('heartbeat'));
    expect(scheduled).toHaveLength(1);
    mixer.dispose();
  });

  it('führt klingende Stimmen nach, wenn die Regie es sagt', () => {
    const { context, gains } = fakeAudio();
    (sharedAudio as jest.Mock).mockReturnValue(context);
    const mixer = new Mixer();
    mixer.play({ ...event('monster-walk', 0.5), at: { x: 3, z: 4 } });
    mixer.play(event('heartbeat', 0.8));
    const seen: string[] = [];
    mixer.remix((voice) => {
      seen.push(voice.cue);
      return voice.cue === 'monster-walk' ? { gain: 0.25, pan: -1 } : null;
    });
    expect(seen.sort()).toEqual(['heartbeat', 'monster-walk']);
    const moved = gains.filter((g) => g.gain.setTargetAtTime.mock.calls.length > 0);
    expect(moved).toHaveLength(1);
    expect(moved[0]!.gain.setTargetAtTime.mock.calls[0]![0]).toBeCloseTo(
      AUDIO_CUES['monster-walk'].placeholder.gain * 0.25,
      9,
    );
    mixer.dispose();
  });
});

describe('HauntingAudio', () => {
  it('rechnet die Regie in 20-Hz-Schritten und spielt, was sie sagt', () => {
    const { context, scheduled } = fakeAudio();
    (sharedAudio as jest.Mock).mockReturnValue(context);
    const audio = new HauntingAudio();
    const snapshot = emptySnapshot();
    const input = {
      snapshot,
      listener: { at: { x: 0, z: 0 }, forward: { x: 0, z: -1 }, speed: 2.6 },
      kind: 'stalker' as const,
    };
    // 72 Bilder je Sekunde, drei Sekunden: Schritte alle 0,56 s, also fünf oder sechs.
    for (let i = 0; i < 72 * 3; i++) {
      audio.update(1 / 72, input);
      for (const source of scheduled) source.onended?.();
    }
    expect(scheduled.length).toBeGreaterThanOrEqual(5);
    expect(scheduled.length).toBeLessThanOrEqual(6);
    expect(AUDIO_HZ).toBe(20);
    expect(audio.heartbeat).toBe(0);
    const lookup = audio.lookup(snapshot, { x: 0, z: 0 });
    expect(lookup({ x: 3, z: 4 })).toEqual({ distance: 5, from: { x: 3, z: 4 } });
    audio.dispose();
  });
});
