import './cues.register';
import type { MapPoint } from '../map/mapSnapshot';
import { AUDIO_CUES } from './cues';
import type { HearingWorld } from './hearing';
import { Mixer } from './mixer';
import {
  loadAudioLevels,
  nextLevel,
  saveAudioLevels,
  type AudioLevels,
  type Level,
} from './settings';
import { Soundscape, type SoundscapeInput } from './soundscape';

/**
 * **Die eine Klasse, die eine Welt braucht** — Regie und Mixer zusammen.
 *
 * `update(dt, input)` je Bild; die Regie rechnet in `AUDIO_HZ` Schritten
 * (Schrittfolgen und Herzschlag brauchen keine 72 Hz), der Mixer plant auf
 * dem Audio-Thread. Nichts hier wartet, nichts lädt im Bild: Die Cues sind
 * beim Bau schon angefordert (`Mixer.prime`).
 *
 * Die 2D-Welt gibt den Snapshot ihrer Runde und die Kennung des Zuhörers;
 * das Headset gibt denselben Snapshot (`HauntingWorld.mapSnapshot()`) und
 * den Zuhörer ausdrücklich — Kopf, Blick, gemessenes Tempo —, weil der
 * Snapshot der 3D-Welt das Tempo nicht kennt.
 *
 * Die zwei Regler (`settings.ts`) liest sie beim Bau aus dem Browser und
 * schreibt sie bei jeder Änderung zurück.
 */
export const AUDIO_HZ = 20;

export class HauntingAudio {
  readonly soundscape = new Soundscape();
  private readonly mixer = new Mixer();
  private levels_: AudioLevels;
  private budget = 0;
  private last: SoundscapeInput | null = null;

  constructor(levels: AudioLevels = loadAudioLevels()) {
    this.levels_ = { ...levels };
    this.mixer.setLevels(this.levels_);
    void this.mixer.prime();
  }

  /** Wie laut das Herz gerade klopft (0…1). */
  get heartbeat(): number {
    return this.soundscape.heartbeat;
  }

  get activeVoices(): number {
    return this.mixer.activeVoices;
  }

  get levels(): Readonly<AudioLevels> {
    return this.levels_;
  }

  setEnabled(value: boolean): void {
    this.mixer.setEnabled(value);
  }

  /** Beide Regler setzen und merken. */
  setLevels(levels: AudioLevels): void {
    this.levels_ = { ...levels };
    this.mixer.setLevels(this.levels_);
    saveAudioLevels(this.levels_);
  }

  /** Einen Regler eine Stufe weiterdrehen: aus → leise → normal → aus. */
  cycle(which: keyof AudioLevels): Level {
    const next = nextLevel(this.levels_[which]);
    this.setLevels({ ...this.levels_, [which]: next });
    return next;
  }

  update(dt: number, input: SoundscapeInput): void {
    this.budget += Number.isFinite(dt) ? Math.max(0, Math.min(0.5, dt)) : 0;
    if (this.budget < 1 / AUDIO_HZ) return;
    const step = this.budget;
    this.budget = 0;
    this.last = input;
    for (const event of this.soundscape.tick(step, input)) this.mixer.play(event);
    for (const [cue, level] of Object.entries(this.soundscape.ambience))
      this.mixer.loop(cue as keyof typeof this.soundscape.ambience, level);
    // Stimmen, die noch klingen, ziehen mit dem Zuhörer mit — durch dieselbe Tür.
    this.mixer.remix((voice) =>
      AUDIO_CUES[voice.cue].loudness > 0 ? this.soundscape.mix(input, voice.cue, voice.at) : null,
    );
  }

  /**
   * Das Hörmodell für fremde Geräusche derselben Welt (`shipAudio.ts`:
   * Türen, Funken, Klacken): effektive Entfernung und Herkunft einer Quelle
   * für den zuletzt gemeldeten Zuhörer.
   */
  lookup(
    world: HearingWorld,
    listener: MapPoint,
  ): (source: MapPoint) => { distance: number; from: MapPoint } {
    return (source) => {
      const path = this.soundscape.hearing.path(world, source, listener);
      return { distance: path.distance, from: path.from };
    };
  }

  /** Der Snapshot des letzten Regie-Schritts — für Anzeigen. */
  get lastInput(): SoundscapeInput | null {
    return this.last;
  }

  dispose(): void {
    this.mixer.dispose();
  }
}
