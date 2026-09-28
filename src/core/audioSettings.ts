/**
 * **Was man hören will** — Ton überhaupt, Musik, Effekte.
 *
 * Drei Schalter und keine Regler: gewünscht war _„Audio komplett ein und
 * ausschalten, nur Musik aus, Effekte an aus"_. Sie gelten für das Gerät und
 * nicht für die Welt, genau wie die Grafik (`graphicsSettings.ts`) — wer im
 * Hub den Ton abdreht, will ihn in der Küche nicht wieder hören.
 *
 * Wie daraus Pegel werden, steht in `core/Audio.ts` (`audioBus`): Musik und
 * Effekte hängen je an einer eigenen Schiene, und beide Schienen — dazu die
 * Stimmen der Mitspieler — hängen an einer gemeinsamen, die _Ton_ schaltet.
 *
 * Kein DOM, kein Web Audio: Der Test (`audioSettings.test.ts`) prüft das
 * Speichern und das Rechnen ohne Browser.
 */

const KEY = 'bgvr.audio';

export interface AudioSettings {
  /** Alles — Musik, Effekte und die Stimmen der anderen. */
  readonly sound: boolean;
  /** Das Radio in der Küche und alles, was sonst Musik ist. */
  readonly music: boolean;
  /** Alles übrige, was klingt: Schüsse, Schritte, Töne der Küche, der Haunting-Mixer. */
  readonly effects: boolean;
}

export const DEFAULT_AUDIO: AudioSettings = { sound: true, music: true, effects: true };

/** Ein gespeicherter Stand, von dem man nicht weiß, was darin steht. */
export function clampAudio(raw: Partial<Record<keyof AudioSettings, unknown>>): AudioSettings {
  const flag = (value: unknown, fallback: boolean): boolean =>
    typeof value === 'boolean' ? value : fallback;
  return {
    sound: flag(raw.sound, DEFAULT_AUDIO.sound),
    music: flag(raw.music, DEFAULT_AUDIO.music),
    effects: flag(raw.effects, DEFAULT_AUDIO.effects),
  };
}

/** Die Pegel der drei Schienen, 0 oder 1. Die Schiene _Ton_ trägt die beiden anderen. */
export function audioLevels(settings: AudioSettings): {
  master: number;
  music: number;
  effects: number;
} {
  return {
    master: settings.sound ? 1 : 0,
    music: settings.music ? 1 : 0,
    effects: settings.effects ? 1 : 0,
  };
}

/** Die Unterzeile im Menü: was gerade gilt. */
export function audioSummary(settings: AudioSettings): string {
  if (!settings.sound) return 'Ton aus';
  if (settings.music && settings.effects) return 'Ton an · Musik und Effekte';
  if (!settings.music && !settings.effects) return 'Ton an · Musik und Effekte aus';
  return settings.music ? 'Ton an · Effekte aus' : 'Ton an · Musik aus';
}

export function audioSettings(): AudioSettings {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return clampAudio(raw ? (JSON.parse(raw) as Partial<AudioSettings>) : {});
  } catch {
    return { ...DEFAULT_AUDIO };
  }
}

/** Speichert die Änderung und gibt zurück, was davon angekommen ist. */
export function saveAudioSettings(settings: Partial<AudioSettings>): AudioSettings {
  const next = clampAudio({ ...audioSettings(), ...settings });
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode; nothing we can do about it */
  }
  return next;
}
