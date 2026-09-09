import { sharedAudio } from '../../../core/Audio';
import { assets } from '../registry';
import { AUDIO_CUES, CUE_IDS, cueAssetId, type CueId, type CuePlaceholder } from './cues';
import type { SoundEvent } from './soundscape';

/**
 * **Der Mixer** — spielt, was die Regie (`soundscape.ts`) entschieden hat.
 *
 * Sechs wiederverwendete Stimmen (Hüllkurve → Lautstärke → Balance →
 * Master) auf dem gemeinsamen `AudioContext` (`core/Audio.ts`), damit die
 * Stimmen der Mitspieler und die Geräusche der Station dieselbe
 * Hardware-Verbindung teilen. Eine siebte gleichzeitige Quelle fällt weg,
 * statt Knoten ohne Ende anzulegen.
 *
 * **Nichts wird mitten in der Runde geladen.** `prime()` holt beim Start
 * jeden Cue aus der Asset-Registry — heute Platzhalter aus Oszillator und
 * Rauschen, morgen vielleicht ein `AudioBuffer` — und bis eine Aufnahme da
 * ist, klingt der Platzhalter. Das Rauschen für Renn-Schritte wird einmal
 * gerechnet, wenn der Kontext läuft, nie im Bild.
 *
 * Kein Aufruf hier blockiert: Web Audio plant auf seinem eigenen Thread,
 * und jeder Aufruf ohne laufenden Kontext (vor der ersten Geste des
 * Spielers) kehrt leise zurück.
 */
export const MIXER_VOICES = 6;

/** Was aus `load()` eines Audio-Assets kommen darf. */
export type CueSource = CuePlaceholder | AudioBuffer;

export interface Voice {
  cue: CueId;
  /** Wo es passiert ist — für das Nachführen, wenn der Zuhörer weitergeht. */
  at: { x: number; z: number };
  gain: GainNode;
  pan: StereoPannerNode;
  source: AudioScheduledSourceNode | null;
  envelope: GainNode | null;
  /** Spitzenlautstärke des Platzhalters bzw. 1 für eine Aufnahme. */
  peak: number;
}

export class Mixer {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private readonly slots: Voice[] = [];
  private readonly sources = new Map<CueId, CueSource>();
  private enabled = true;
  private disposed = false;
  private primed = false;

  /** Die Stimmen, die gerade klingen — für das Nachführen durch die Regie. */
  get voices(): readonly Voice[] {
    return this.slots.filter((voice) => voice.source !== null);
  }

  get activeVoices(): number {
    let count = 0;
    for (const voice of this.slots) if (voice.source) count++;
    return count;
  }

  /** Ob alle Cues eingesammelt sind. */
  get ready(): boolean {
    return this.primed;
  }

  /** Woher ein Cue gerade klingt — Platzhalter oder Aufnahme. Für Tests und Anzeigen. */
  sourceOf(id: CueId): CueSource {
    return this.sources.get(id) ?? AUDIO_CUES[id].placeholder;
  }

  /**
   * Alle Cues einmal abholen. Eine Fabrik, die eine Aufnahme verspricht,
   * wird abgewartet; bis dahin klingt der Platzhalter. Fehlt ein Eintrag in
   * der Registry, gilt die Tabelle in `cues.ts`.
   */
  async prime(): Promise<void> {
    const waits: Promise<void>[] = [];
    for (const id of CUE_IDS) {
      this.sources.set(id, AUDIO_CUES[id].placeholder);
      const entry = assets.get(cueAssetId(id));
      if (!entry) continue;
      let loaded: unknown;
      try {
        loaded = entry.load();
      } catch (error) {
        console.warn(`Audio: Cue "${id}" lässt sich nicht laden`, error);
        continue;
      }
      if (isThenable(loaded))
        waits.push(
          Promise.resolve(loaded).then(
            (value) => this.accept(id, value),
            (error: unknown) => console.warn(`Audio: Cue "${id}" kam nicht an`, error),
          ),
        );
      else this.accept(id, loaded);
    }
    await Promise.all(waits);
    this.primed = true;
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(value ? 0.5 : 0, this.context.currentTime, 0.02);
  }

  /** Ein Ereignis der Regie spielen — oder leise fallen lassen, wenn keine Stimme frei ist. */
  play(event: SoundEvent): void {
    if (this.disposed || !this.enabled || event.gain <= 0.005 || !this.ensure()) return;
    const ctx = this.context!;
    let voice: Voice | undefined;
    for (const slot of this.slots)
      if (slot.source === null) {
        voice = slot;
        break;
      }
    if (!voice) return;
    const source = this.sources.get(event.cue) ?? AUDIO_CUES[event.cue].placeholder;
    const start = ctx.currentTime + Math.max(0, event.delay);
    const envelope = ctx.createGain();
    let node: AudioScheduledSourceNode;
    let duration: number;
    if (isBuffer(source)) {
      const buffer = ctx.createBufferSource();
      buffer.buffer = source;
      node = buffer;
      duration = source.duration;
      envelope.gain.setValueAtTime(1, start);
      voice.peak = 1;
    } else {
      duration = source.duration;
      if (source.wave === 'noise') {
        const buffer = ctx.createBufferSource();
        buffer.buffer = this.noise;
        buffer.playbackRate.setValueAtTime(source.from, start);
        buffer.playbackRate.exponentialRampToValueAtTime(
          Math.max(0.05, source.to),
          start + duration,
        );
        node = buffer;
      } else {
        const oscillator = ctx.createOscillator();
        oscillator.type = source.wave;
        oscillator.frequency.setValueAtTime(source.from, start);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, source.to), start + duration);
        node = oscillator;
      }
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(1, start + Math.min(source.attack, duration / 2));
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      voice.peak = source.gain;
    }
    voice.cue = event.cue;
    voice.at.x = event.at.x;
    voice.at.z = event.at.z;
    voice.source = node;
    voice.envelope = envelope;
    voice.gain.gain.setValueAtTime(voice.peak * event.gain, ctx.currentTime);
    voice.pan.pan.setValueAtTime(event.pan, ctx.currentTime);
    node.connect(envelope).connect(voice.gain);
    node.onended = () => {
      node.disconnect();
      envelope.disconnect();
      if (voice.source === node) {
        voice.source = null;
        voice.envelope = null;
      }
    };
    node.start(start);
    node.stop(start + duration + 0.02);
  }

  /**
   * Klingende Stimmen nachführen: Die Regie sagt je Stimme, wie laut und von
   * wo sie jetzt zu hören ist — oder `null`, wenn sie bleiben soll, wie sie ist.
   */
  remix(mix: (voice: Voice) => { gain: number; pan: number } | null): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const voice of this.slots) {
      if (!voice.source) continue;
      const next = mix(voice);
      if (!next) continue;
      voice.gain.gain.setTargetAtTime(voice.peak * next.gain, now, 0.03);
      voice.pan.pan.setTargetAtTime(next.pan, now, 0.03);
    }
  }

  private accept(id: CueId, value: unknown): void {
    if (isBuffer(value) || isPlaceholder(value)) this.sources.set(id, value);
    else console.warn(`Audio: Cue "${id}" liefert weder Aufnahme noch Platzhalter`);
  }

  private ensure(): boolean {
    if (this.context) return this.context.state === 'running';
    const ctx = sharedAudio();
    if (!ctx || ctx.state !== 'running') return false;
    this.context = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.5 : 0;
    this.master.connect(ctx.destination);
    for (let i = 0; i < MIXER_VOICES; i++) {
      const gain = ctx.createGain(),
        pan = ctx.createStereoPanner();
      gain.connect(pan).connect(this.master);
      this.slots.push({
        cue: 'player-step',
        at: { x: 0, z: 0 },
        gain,
        pan,
        source: null,
        envelope: null,
        peak: 0,
      });
    }
    // Eine Sekunde gefärbtes Rauschen — einmal, nicht je Schritt.
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const samples = this.noise.getChannelData(0);
    let seed = 90403,
      filtered = 0;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      filtered = filtered * 0.8 + (((seed >>> 0) / 0xffffffff) * 2 - 1) * 0.2;
      samples[i] = filtered;
    }
    return true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const voice of this.slots) {
      if (voice.source) {
        voice.source.stop();
        voice.source.disconnect();
      }
      voice.envelope?.disconnect();
      voice.gain.disconnect();
      voice.pan.disconnect();
    }
    this.slots.length = 0;
    this.master?.disconnect();
    this.master = null;
    this.noise = null;
  }
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    !!value && typeof value === 'object' && typeof (value as { then?: unknown }).then === 'function'
  );
}

function isBuffer(value: unknown): value is AudioBuffer {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as AudioBuffer).getChannelData === 'function' &&
    typeof (value as AudioBuffer).duration === 'number'
  );
}

function isPlaceholder(value: unknown): value is CuePlaceholder {
  const raw = value as Partial<CuePlaceholder> | null;
  return (
    !!raw &&
    typeof raw === 'object' &&
    typeof raw.wave === 'string' &&
    typeof raw.from === 'number' &&
    typeof raw.to === 'number' &&
    typeof raw.duration === 'number' &&
    typeof raw.attack === 'number' &&
    typeof raw.gain === 'number'
  );
}
