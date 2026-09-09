/**
 * **Die Geräusche des Pakets Audio** — eine Tabelle, kein Fragezeichen-Baum.
 *
 * Jeder Cue hat eine **Lautstärke** in Vielfachen der Hörweite (`hearing.ts`:
 * Reichweite = Lautstärke × Hörweite des Zuhörers), eine **Herkunft** (in der
 * Welt oder am Ohr) und einen **Platzhalter-Klang** aus einem Oszillator oder
 * Rauschen, damit das Spiel ohne eine einzige Datei klingt und nichts mitten
 * in der Runde nachgeladen wird.
 *
 * Echte Aufnahmen kommen später an dieselbe Stelle: `cues.register.ts`
 * meldet jeden Cue als Asset an (`registerAsset({ kind: 'audio' })`), und
 * wer eine Datei hat, lässt `load()` statt des Platzhalters ein
 * `Promise<AudioBuffer>` liefern. Der Mixer (`mixer.ts`) holt alles beim
 * Start einmal ab (`prime`) und nimmt bis dahin den Platzhalter.
 */
export type CueId = 'player-step' | 'monster-walk' | 'monster-run' | 'monster-call' | 'heartbeat';

/** Ein Klang aus dem Nichts: Wellenform, Tonhöhe, Hüllkurve. */
export interface CuePlaceholder {
  wave: OscillatorType | 'noise';
  /** Tonhöhe am Anfang in Hz; bei Rauschen die Abspielrate. */
  from: number;
  /** Tonhöhe am Ende; gleitet exponentiell. */
  to: number;
  /** Sekunden. */
  duration: number;
  /** Sekunden bis zur vollen Lautstärke. */
  attack: number;
  /** Spitzenlautstärke 0…1 vor Entfernung und Master. */
  gain: number;
}

export interface AudioCue {
  readonly id: CueId;
  label: string;
  /**
   * Wie weit es trägt, in Vielfachen der Hörweite des Zuhörers. `0` heißt:
   * Es sitzt am Ohr (Herzschlag, eigene Schritte) und hat keine Entfernung.
   */
  loudness: number;
  /** Wo die echte Datei einmal liegen soll — heute liegt dort nichts. */
  file: string;
  placeholder: CuePlaceholder;
}

/** Wie das Paket seine Cues in der Asset-Registry nennt. */
export const ASSET_PREFIX = 'audio:';

export function cueAssetId(id: CueId): string {
  return `${ASSET_PREFIX}${id}`;
}

/**
 * Die Lautstärke eigener Schritte, wie `threat.ts` sie rechnet: Tempo durch
 * 4,2 m/s, gedeckelt bei 1. Gehen (2,6 m/s) ist 0,62, Sprint ist 1. Damit
 * hört das Monster einen Sprintenden auf seiner vollen Hörweite.
 */
export function stepLoudness(speed: number): number {
  return speed < 0.1 ? 0 : Math.min(1, speed / 4.2);
}

export const AUDIO_CUES: Readonly<Record<CueId, AudioCue>> = {
  'player-step': {
    id: 'player-step',
    label: 'Eigener Schritt',
    loudness: 0,
    file: 'audio/haunting/player-step.ogg',
    placeholder: { wave: 'sine', from: 105, to: 38, duration: 0.11, attack: 0.008, gain: 0.05 },
  },
  'monster-walk': {
    id: 'monster-walk',
    label: 'Monster geht',
    loudness: 1,
    file: 'audio/haunting/monster-walk.ogg',
    placeholder: { wave: 'sine', from: 62, to: 24, duration: 0.24, attack: 0.012, gain: 0.16 },
  },
  'monster-run': {
    id: 'monster-run',
    label: 'Monster rennt',
    loudness: 1.6,
    file: 'audio/haunting/monster-run.ogg',
    placeholder: { wave: 'noise', from: 1.6, to: 0.9, duration: 0.14, attack: 0.004, gain: 0.2 },
  },
  'monster-call': {
    id: 'monster-call',
    label: 'Ruf bei der Verfolgung',
    loudness: 3.2,
    file: 'audio/haunting/monster-call.ogg',
    placeholder: { wave: 'sawtooth', from: 160, to: 420, duration: 1.1, attack: 0.18, gain: 0.2 },
  },
  heartbeat: {
    id: 'heartbeat',
    label: 'Herzschlag',
    loudness: 0,
    file: 'audio/haunting/heartbeat.ogg',
    placeholder: { wave: 'sine', from: 58, to: 22, duration: 0.16, attack: 0.01, gain: 0.14 },
  },
};

export const CUE_IDS = Object.keys(AUDIO_CUES) as CueId[];
