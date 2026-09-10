/**
 * **Die Geräusche des Pakets Audio** — eine Tabelle, kein Fragezeichen-Baum.
 *
 * Jeder Cue hat eine **Lautstärke** in Vielfachen der Hörweite (`hearing.ts`:
 * Reichweite = Lautstärke × `HEARING`), eine **Herkunft** (in der Welt oder
 * am Ohr), seine **Dateien** unter `public/audio/haunting/` (CC0, Quellen in
 * `CREDITS.md` dort) und einen **Platzhalter-Klang** aus Oszillator oder
 * Rauschen für den Fall, dass eine Datei fehlt oder noch nicht entpackt ist.
 *
 * `cues.register.ts` meldet jeden Cue als Asset an; der Mixer (`mixer.ts`)
 * holt beim Start alle Dateien einmal ab und nimmt bis dahin den Platzhalter
 * — nichts wird mitten in der Runde nachgeladen.
 */
export type CueId =
  | 'player-step'
  | 'monster-walk'
  | 'monster-run'
  | 'monster-call'
  /** Das Kratzen im Schacht, aus der nächsten Klappe. */
  | 'monster-vent'
  | 'heartbeat'
  /** Das Grundbrummen der Station, als Schleife am Ohr. */
  | 'ambient-hum'
  /** Der tiefere Zustand ohne Strom oder Licht, als Schleife am Ohr. */
  | 'ambient-dark'
  /** Ein Knarren irgendwo in der Station — ein Fehlalarm mit Ort. */
  | 'creak'
  /** Blech, das sich setzt — dasselbe, nur härter. */
  | 'metal';

/**
 * **Wie laut etwas ist**, in Vielfachen der Hörweite — die eine Tabelle, aus
 * der Spieler, Monster und Trainingssimulation lesen. Die Asymmetrie des
 * Spiels steckt hier und nirgends sonst: Das Monster ist in jeder Gangart
 * lauter als der Spieler in seiner, deshalb hört man es früher, als es einen
 * hört. Ab `LOUD` (`threat.ts`, 1) weiß das Monster, dass dort etwas ist.
 */
export const NOISE = {
  /** Der Spieler: schleichen, gehen, rennen. */
  sneak: 0.25,
  walk: 0.5,
  sprint: 1.5,
  /** Hantieren an Fracht, Konsole, Schrank; ein Rätselzug; ein Schalter. */
  interact: 0.8,
  click: 0.5,
  light: 0.6,
  /** Eine Tür ver- oder entriegeln; eine Tür, die zufällt. */
  door: 1,
  slam: 2,
  /** Das Monster: lauern ist still, schleichen leise, gehen laut, rennen lauter, der Ruf am lautesten. */
  monsterStalk: 0.5,
  monsterWalk: 1.2,
  monsterRun: 2,
  monsterCall: 3.5,
  /** Blech leitet: Das Kratzen im Schacht trägt weit — durch den Schacht. */
  monsterVent: 2,
} as const;

/** Die Lautstärke eigener Schritte aus dem Tempo: unter 0,1 m/s still, geduckt leise, ab Sprinttempo laut. */
export function stepLoudness(speed: number, crouched = false): number {
  if (!(speed > 0.1)) return 0;
  if (crouched) return NOISE.sneak;
  return speed > 3.6 ? NOISE.sprint : NOISE.walk;
}

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
   * Wie weit es trägt, in Vielfachen der Hörweite. `0` heißt: Es sitzt am
   * Ohr (Herzschlag, eigene Schritte, Schleifen) und hat keine Entfernung.
   */
  loudness: number;
  /** Ob es als Schleife läuft (Ambiente) statt als Ereignis. */
  loop?: boolean;
  /** Dateinamen unter `SOUND_DIR`; mehrere sind Varianten, aus denen der Mixer zufällig wählt. Leer: nur Platzhalter. */
  files: readonly string[];
  /** Spitzenlautstärke einer Datei 0…1, vor Entfernung und Master. */
  gain: number;
  placeholder: CuePlaceholder;
}

/** Wo die Dateien liegen, relativ zur Seite (`public/`). */
export const SOUND_DIR = 'audio/haunting/';

/** Wie das Paket seine Cues in der Asset-Registry nennt. */
export const ASSET_PREFIX = 'audio:';

export function cueAssetId(id: CueId): string {
  return `${ASSET_PREFIX}${id}`;
}

export const AUDIO_CUES: Readonly<Record<CueId, AudioCue>> = {
  'player-step': {
    id: 'player-step',
    label: 'Eigener Schritt',
    loudness: 0,
    files: ['player-step-0.ogg', 'player-step-1.ogg', 'player-step-2.ogg', 'player-step-3.ogg'],
    gain: 0.28,
    placeholder: { wave: 'sine', from: 105, to: 38, duration: 0.11, attack: 0.008, gain: 0.05 },
  },
  'monster-walk': {
    id: 'monster-walk',
    label: 'Monster geht',
    loudness: NOISE.monsterWalk,
    files: ['monster-walk-0.ogg', 'monster-walk-1.ogg', 'monster-walk-2.ogg'],
    gain: 0.7,
    placeholder: { wave: 'sine', from: 62, to: 24, duration: 0.24, attack: 0.012, gain: 0.16 },
  },
  'monster-run': {
    id: 'monster-run',
    label: 'Monster rennt',
    loudness: NOISE.monsterRun,
    files: ['monster-run-0.ogg', 'monster-run-1.ogg', 'monster-run-2.ogg'],
    gain: 0.8,
    placeholder: { wave: 'noise', from: 1.6, to: 0.9, duration: 0.14, attack: 0.004, gain: 0.2 },
  },
  'monster-call': {
    id: 'monster-call',
    label: 'Ruf bei der Verfolgung',
    loudness: NOISE.monsterCall,
    files: ['monster-call-0.ogg', 'monster-call-1.ogg', 'monster-call-2.ogg'],
    gain: 0.9,
    placeholder: { wave: 'sawtooth', from: 160, to: 420, duration: 1.1, attack: 0.18, gain: 0.2 },
  },
  'monster-vent': {
    id: 'monster-vent',
    label: 'Kratzen im Schacht',
    loudness: NOISE.monsterVent,
    files: ['monster-vent-0.ogg', 'monster-vent-1.ogg', 'monster-vent-2.ogg'],
    gain: 0.5,
    placeholder: { wave: 'noise', from: 0.7, to: 1.1, duration: 0.3, attack: 0.05, gain: 0.1 },
  },
  heartbeat: {
    id: 'heartbeat',
    label: 'Herzschlag',
    loudness: 0,
    files: [],
    gain: 1,
    placeholder: { wave: 'sine', from: 58, to: 22, duration: 0.16, attack: 0.01, gain: 0.14 },
  },
  'ambient-hum': {
    id: 'ambient-hum',
    label: 'Grundbrummen der Station',
    loudness: 0,
    loop: true,
    files: ['ambient-hum.ogg'],
    gain: 0.16,
    placeholder: { wave: 'triangle', from: 49, to: 49, duration: 4, attack: 1.5, gain: 0.03 },
  },
  'ambient-dark': {
    id: 'ambient-dark',
    label: 'Ohne Strom, ohne Licht',
    loudness: 0,
    loop: true,
    files: ['ambient-dark.ogg'],
    gain: 0.22,
    placeholder: { wave: 'sine', from: 31, to: 31, duration: 4, attack: 2, gain: 0.05 },
  },
  creak: {
    id: 'creak',
    label: 'Knarren',
    loudness: 1.2,
    files: ['creak-0.ogg', 'creak-1.ogg', 'creak-2.ogg'],
    gain: 0.45,
    placeholder: { wave: 'sawtooth', from: 220, to: 140, duration: 0.5, attack: 0.15, gain: 0.04 },
  },
  metal: {
    id: 'metal',
    label: 'Blech setzt sich',
    loudness: 1.5,
    files: ['metal-0.ogg', 'metal-1.ogg', 'metal-2.ogg'],
    gain: 0.4,
    placeholder: { wave: 'square', from: 900, to: 300, duration: 0.25, attack: 0.005, gain: 0.04 },
  },
};

export const CUE_IDS = Object.keys(AUDIO_CUES) as CueId[];
