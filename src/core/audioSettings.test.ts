import {
  DEFAULT_AUDIO,
  audioLevels,
  audioSettings,
  audioSummary,
  clampAudio,
  saveAudioSettings,
} from './audioSettings';

describe('audioSettings', () => {
  it('startet mit allem an', () => {
    expect(DEFAULT_AUDIO).toEqual({ sound: true, music: true, effects: true });
    expect(audioLevels(DEFAULT_AUDIO)).toEqual({ master: 1, music: 1, effects: 1 });
  });

  it('nimmt aus einem fremden Stand nur Wahrheitswerte', () => {
    expect(clampAudio({ sound: false, music: 'nein', effects: 0 })).toEqual({
      sound: false,
      music: true,
      effects: true,
    });
  });

  it('schaltet Musik und Effekte getrennt, und Ton trägt beide', () => {
    expect(audioLevels({ sound: true, music: false, effects: true })).toEqual({
      master: 1,
      music: 0,
      effects: 1,
    });
    expect(audioLevels({ sound: false, music: true, effects: true }).master).toBe(0);
  });

  it('sagt in der Unterzeile, was gilt', () => {
    expect(audioSummary(DEFAULT_AUDIO)).toBe('Ton an · Musik und Effekte');
    expect(audioSummary({ sound: false, music: true, effects: true })).toBe('Ton aus');
    expect(audioSummary({ sound: true, music: false, effects: true })).toBe('Ton an · Musik aus');
    expect(audioSummary({ sound: true, music: true, effects: false })).toBe('Ton an · Effekte aus');
    expect(audioSummary({ sound: true, music: false, effects: false })).toBe(
      'Ton an · Musik und Effekte aus',
    );
  });

  it('speichert und liest zurück', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };
    const previous = (globalThis as { localStorage?: unknown }).localStorage;
    (globalThis as { localStorage?: unknown }).localStorage = storage;
    try {
      expect(saveAudioSettings({ music: false })).toEqual({
        sound: true,
        music: false,
        effects: true,
      });
      expect(audioSettings().music).toBe(false);
      saveAudioSettings({ sound: false });
      expect(audioSettings()).toEqual({ sound: false, music: false, effects: true });
    } finally {
      (globalThis as { localStorage?: unknown }).localStorage = previous;
    }
  });
});
