import { sharedAudio } from '../../../core/Audio';
import { assets, assetsOf, registerAsset } from '../registry';
import { AUDIO_CUES, CUE_IDS, cueAssetId, type CueId } from './cues';
import { cueFiles, registerAudioCues } from './cues.register';
import { AUDIO_HZ, HauntingAudio } from './hauntingAudio';
import { Mixer, MIXER_VOICES } from './mixer';
import {
  DEFAULT_LEVELS,
  clampLevels,
  levelLabel,
  loadAudioLevels,
  nextLevel,
  saveAudioLevels,
} from './settings';
import type { SoundEvent } from './soundscape';
import { emptySnapshot } from '../map/mapSnapshot';

jest.mock('../../../core/Audio', () => ({ sharedAudio: jest.fn() }));

interface FakeNode {
  onended: (() => void) | null;
  stop: jest.Mock;
  start: jest.Mock;
  connect: jest.Mock;
  buffer?: unknown;
  loop?: boolean;
  type?: string;
  gain: { setTargetAtTime: jest.Mock; setValueAtTime: jest.Mock; value: number };
}

interface Fake {
  context: AudioContext;
  scheduled: FakeNode[];
  gains: FakeNode[];
  decoded: number;
}

function fakeAudio(): Fake {
  const scheduled: FakeNode[] = [];
  const gains: FakeNode[] = [];
  const fake: Fake = { scheduled, gains, decoded: 0, context: null as unknown as AudioContext };
  const parameter = () => ({
    value: 0,
    setValueAtTime: jest.fn(),
    setTargetAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  });
  const node = (): FakeNode => {
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
    if (buffer) Object.assign(one, { buffer: null, loop: false });
    scheduled.push(one);
    return one;
  };
  fake.context = {
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
    decodeAudioData: (bytes: ArrayBuffer) => {
      fake.decoded++;
      return Promise.resolve({
        getChannelData: () => new Float32Array(8),
        duration: bytes.byteLength / 100,
      });
    },
  } as unknown as AudioContext;
  return fake;
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

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  assets.clear();
  (sharedAudio as jest.Mock).mockReturnValue(null);
});

describe('Die Cues in der Registry', () => {
  it('meldet jeden Cue des Pakets audio an — ohne Audiogerät mit Platzhalter, ohne Netzzugriff', () => {
    registerAudioCues();
    const entries = assetsOf('audio');
    expect(entries.map((e) => e.id).sort()).toEqual(CUE_IDS.map(cueAssetId).sort());
    for (const entry of entries) {
      expect(entry.owner).toBe('audio');
      const id = entry.id.slice('audio:'.length) as CueId;
      // `sharedAudio()` liefert hier null: kein Kontext, also gleich der Platzhalter.
      expect(entry.load()).toBe(AUDIO_CUES[id].placeholder);
    }
    for (const cue of Object.values(AUDIO_CUES))
      for (const file of cue.files) expect(file).toMatch(/\.ogg$/);
    expect(AUDIO_CUES.heartbeat.files).toHaveLength(0);
    expect(cueFiles(AUDIO_CUES.heartbeat)).toBeNull();
  });

  it('holt die Dateien nur, wenn es einen Kontext gibt — und nimmt, was ankommt', async () => {
    const { context } = fakeAudio();
    (sharedAudio as jest.Mock).mockReturnValue(context);
    const fetched: string[] = [];
    const fetchMock = jest.fn((url: string) => {
      fetched.push(url);
      const ok = !url.includes('monster-walk-1');
      return Promise.resolve({
        ok,
        status: ok ? 200 : 404,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(url.length)),
      });
    });
    const globals = globalThis as { fetch?: unknown; document?: unknown };
    const before = { fetch: globals.fetch, document: globals.document };
    globals.fetch = fetchMock;
    globals.document = { baseURI: 'https://example.test/vr/' };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const bytes = await cueFiles(AUDIO_CUES['monster-walk'])!;
      expect(fetched).toEqual(
        AUDIO_CUES['monster-walk'].files.map((f) => `https://example.test/vr/audio/haunting/${f}`),
      );
      expect(bytes).toHaveLength(AUDIO_CUES['monster-walk'].files.length - 1);
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      globals.fetch = before.fetch;
      globals.document = before.document;
      warn.mockRestore();
    }
  });
});

describe('Der Mixer', () => {
  it('holt beim Start Platzhalter, Bytes und Aufnahmen ab und entpackt die Bytes, sobald ein Kontext läuft', async () => {
    registerAudioCues();
    const buffer = { getChannelData: () => new Float32Array(8), duration: 0.3 };
    registerAsset({
      id: cueAssetId('monster-call'),
      kind: 'audio',
      owner: 'audio',
      load: () => Promise.resolve(buffer),
    });
    registerAsset({
      id: cueAssetId('monster-walk'),
      kind: 'audio',
      owner: 'audio',
      load: () => Promise.resolve([new ArrayBuffer(50), new ArrayBuffer(80)]),
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
    expect(mixer.sourceOf('monster-call')).toEqual([buffer]);
    expect(mixer.sourceOf('heartbeat')).toBe(AUDIO_CUES.heartbeat.placeholder);
    // Ohne Kontext bleiben die Bytes liegen — nichts wird entpackt.
    expect(mixer.pendingOf('monster-walk')).toBe(2);
    expect(mixer.sourceOf('monster-walk')).toBe(AUDIO_CUES['monster-walk'].placeholder);
    expect(warn).toHaveBeenCalledTimes(1);
    // Der erste Kontext entpackt alles, was wartet.
    const fake = fakeAudio();
    (sharedAudio as jest.Mock).mockReturnValue(fake.context);
    mixer.play(event('heartbeat'));
    await flush();
    expect(fake.decoded).toBe(2);
    expect(mixer.pendingOf('monster-walk')).toBe(0);
    expect(mixer.sourceOf('monster-walk')).toHaveLength(2);
    // Ab jetzt spielt eine Aufnahme statt des Platzhalters.
    mixer.play(event('monster-walk'));
    expect(fake.scheduled.at(-1)!.buffer).not.toBeNull();
    warn.mockRestore();
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

  it('hält Schleifen als eigene Stimmen, führt ihren Pegel nach und tauscht den Platzhalter gegen die Aufnahme', async () => {
    const fake = fakeAudio();
    (sharedAudio as jest.Mock).mockReturnValue(fake.context);
    const mixer = new Mixer();
    mixer.loop('ambient-hum', 0);
    expect(fake.scheduled).toHaveLength(0); // Stumm anlegen lohnt nicht.
    mixer.loop('ambient-hum', 1);
    mixer.loop('ambient-hum', 1);
    mixer.loop('ambient-dark', 0.5);
    expect(fake.scheduled).toHaveLength(2);
    expect(fake.scheduled[0]!.type).toBe('triangle');
    expect(fake.scheduled[0]!.start).toHaveBeenCalledTimes(1);
    // Eine Schleife zählt nicht zu den sechs Stimmen der Ereignisse.
    expect(mixer.activeVoices).toBe(0);
    registerAsset({
      id: cueAssetId('ambient-hum'),
      kind: 'audio',
      owner: 'audio',
      load: () => [new ArrayBuffer(400)],
    });
    await mixer.prime();
    await flush();
    mixer.loop('ambient-hum', 1);
    expect(fake.scheduled[0]!.stop).toHaveBeenCalled();
    expect(fake.scheduled).toHaveLength(3);
    expect(fake.scheduled[2]!.loop).toBe(true);
    mixer.dispose();
    for (const source of fake.scheduled) expect(source.stop).toHaveBeenCalled();
  });

  it('legt die zwei Regler auf zwei Busse', () => {
    const fake = fakeAudio();
    (sharedAudio as jest.Mock).mockReturnValue(fake.context);
    const mixer = new Mixer();
    mixer.setLevels({ effects: 0.5, ambient: 0 });
    mixer.play(event('heartbeat'));
    // Master, Effekte, Ambiente — in dieser Reihenfolge angelegt.
    expect(fake.gains[1]!.gain.value).toBe(0.5);
    expect(fake.gains[2]!.gain.value).toBe(0);
    mixer.setLevels({ effects: 1, ambient: 1 });
    expect(fake.gains[1]!.gain.setTargetAtTime).toHaveBeenCalledWith(1, 0, 0.05);
    expect(fake.gains[2]!.gain.setTargetAtTime).toHaveBeenCalledWith(1, 0, 0.3);
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

describe('Die Einstellungen', () => {
  it('kennt drei Stufen im Kreis, merkt sie sich und verwirft Unsinn', () => {
    expect(nextLevel(0)).toBe(0.5);
    expect(nextLevel(0.5)).toBe(1);
    expect(nextLevel(1)).toBe(0);
    expect([0, 0.5, 1].map((l) => levelLabel(l as 0 | 0.5 | 1))).toEqual([
      'aus',
      'leise',
      'normal',
    ]);
    expect(clampLevels({ effects: 0.7, ambient: 0 })).toEqual({ ...DEFAULT_LEVELS, ambient: 0 });
    const store = new Map<string, string>();
    const fake = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };
    saveAudioLevels({ effects: 0.5, ambient: 1 }, fake);
    expect(loadAudioLevels(fake)).toEqual({ effects: 0.5, ambient: 1 });
    store.set('haunting.audio.v1', '{nicht json');
    expect(loadAudioLevels(fake)).toEqual(DEFAULT_LEVELS);
    expect(loadAudioLevels(null)).toEqual(DEFAULT_LEVELS);
  });
});

describe('HauntingAudio', () => {
  it('rechnet die Regie in 20-Hz-Schritten, spielt Schritte und startet die Ambiente', () => {
    const { context, scheduled } = fakeAudio();
    (sharedAudio as jest.Mock).mockReturnValue(context);
    const audio = new HauntingAudio({ effects: 1, ambient: 0.5 });
    const snapshot = emptySnapshot();
    const input = {
      snapshot,
      listener: { at: { x: 0, z: 0 }, forward: { x: 0, z: -1 }, speed: 2.6 },
      kind: 'stalker' as const,
    };
    // 72 Bilder je Sekunde, drei Sekunden: Schritte alle 0,56 s, also fünf oder
    // sechs — dazu die eine Schleife des Brummens (Strom an, kein Raum: nicht dunkel).
    for (let i = 0; i < 72 * 3; i++) {
      audio.update(1 / 72, input);
      for (const source of scheduled) source.onended?.();
    }
    const loops = scheduled.filter((s) => s.type === 'triangle' || s.loop === true);
    expect(loops).toHaveLength(1);
    expect(scheduled.length - loops.length).toBeGreaterThanOrEqual(5);
    expect(scheduled.length - loops.length).toBeLessThanOrEqual(6);
    expect(AUDIO_HZ).toBe(20);
    expect(audio.heartbeat).toBe(0);
    expect(audio.levels).toEqual({ effects: 1, ambient: 0.5 });
    expect(audio.cycle('ambient')).toBe(1);
    expect(audio.cycle('ambient')).toBe(0);
    const lookup = audio.lookup(snapshot, { x: 0, z: 0 });
    expect(lookup({ x: 3, z: 4 })).toEqual({ distance: 5, from: { x: 3, z: 4 } });
    audio.dispose();
  });
});
