import { sharedAudio } from '../../../core/Audio';
import { assets } from '../registry';
import { AUDIO_CUES, CUE_IDS, cueAssetId, type CueId, type CuePlaceholder } from './cues';
import type { AudioLevels } from './settings';
import type { SoundEvent } from './soundscape';

/**
 * **Der Mixer** — spielt, was die Regie (`soundscape.ts`) entschieden hat.
 *
 * Sechs wiederverwendete Stimmen (Hüllkurve → Lautstärke → Balance → Bus)
 * für Ereignisse, dazu je Schleife eine feste Stimme, auf dem gemeinsamen
 * `AudioContext` (`core/Audio.ts`), damit die Stimmen der Mitspieler und die
 * Geräusche der Station dieselbe Hardware-Verbindung teilen. Zwei Busse —
 * **Effekte** und **Ambiente** — hängen am Master; ihre Pegel sind die
 * beiden Regler der Einstellungen (`settings.ts`). Eine siebte gleichzeitige
 * Quelle fällt weg, statt Knoten ohne Ende anzulegen.
 *
 * **Nichts wird mitten in der Runde geladen.** `prime()` holt beim Start
 * jeden Cue aus der Asset-Registry: Platzhalter sofort, Dateien als Bytes.
 * Entpackt wird, sobald der Kontext läuft (`decodeAudioData`, einmal je
 * Datei, im Audio-Thread); bis dahin klingt der Platzhalter. Mehrere Dateien
 * je Cue sind Varianten, aus denen zufällig gewählt wird, damit zehn
 * Schritte nicht zehnmal derselbe Schritt sind.
 *
 * Kein Aufruf hier blockiert: Web Audio plant auf seinem eigenen Thread,
 * und jeder Aufruf ohne laufenden Kontext (vor der ersten Geste des
 * Spielers) kehrt leise zurück.
 */
export const MIXER_VOICES = 6;

/** Was aus `load()` eines Audio-Assets kommen darf — auch als Versprechen und in Listen. */
export type CueSource = CuePlaceholder | AudioBuffer | ArrayBuffer;

export interface Voice {
  cue: CueId;
  /** Wo es passiert ist — für das Nachführen, wenn der Zuhörer weitergeht. */
  at: { x: number; z: number };
  gain: GainNode;
  pan: StereoPannerNode;
  source: AudioScheduledSourceNode | null;
  envelope: GainNode | null;
  /** Spitzenlautstärke der Quelle, vor Entfernung und Bus. */
  peak: number;
}

interface Loop {
  source: AudioScheduledSourceNode;
  gain: GainNode;
  /** Ob gerade der Platzhalter läuft — dann wird getauscht, sobald eine Datei entpackt ist. */
  placeholder: boolean;
  level: number;
}

interface Stock {
  placeholder: CuePlaceholder;
  buffers: AudioBuffer[];
  /** Bytes, die noch auf einen Kontext warten. */
  pending: ArrayBuffer[];
}

export class Mixer {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private effects: GainNode | null = null;
  private ambient: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private readonly slots: Voice[] = [];
  private readonly loops = new Map<CueId, Loop>();
  private readonly stock = new Map<CueId, Stock>();
  private levels: AudioLevels = { effects: 1, ambient: 0.5 };
  private enabled = true;
  private disposed = false;
  private primed = false;
  private decoding = false;

  constructor() {
    for (const id of CUE_IDS)
      this.stock.set(id, { placeholder: AUDIO_CUES[id].placeholder, buffers: [], pending: [] });
  }

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

  /** Woher ein Cue gerade klingt: seine entpackten Aufnahmen, sonst der Platzhalter. */
  sourceOf(id: CueId): CuePlaceholder | readonly AudioBuffer[] {
    const stock = this.stock.get(id)!;
    return stock.buffers.length ? stock.buffers : stock.placeholder;
  }

  /** Wie viele Dateien eines Cues noch auf das Entpacken warten. */
  pendingOf(id: CueId): number {
    return this.stock.get(id)!.pending.length;
  }

  /**
   * Alle Cues einmal abholen. Eine Fabrik, die etwas verspricht, wird
   * abgewartet; bis dahin klingt der Platzhalter. Fehlt ein Eintrag in der
   * Registry, gilt die Tabelle in `cues.ts`.
   */
  async prime(): Promise<void> {
    const waits: Promise<void>[] = [];
    for (const id of CUE_IDS) {
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
    this.decodePending();
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(value ? 0.5 : 0, this.context.currentTime, 0.02);
  }

  /** Die zwei Regler: Effekte und Ambiente. */
  setLevels(levels: AudioLevels): void {
    this.levels = { ...levels };
    if (!this.context || !this.effects || !this.ambient) return;
    const now = this.context.currentTime;
    this.effects.gain.setTargetAtTime(levels.effects, now, 0.05);
    this.ambient.gain.setTargetAtTime(levels.ambient, now, 0.3);
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
    const start = ctx.currentTime + Math.max(0, event.delay);
    const built = this.build(event.cue, start, false);
    voice.cue = event.cue;
    voice.at.x = event.at.x;
    voice.at.z = event.at.z;
    voice.source = built.source;
    voice.envelope = built.envelope;
    voice.peak = built.peak;
    voice.gain.gain.setValueAtTime(built.peak * event.gain, ctx.currentTime);
    voice.pan.pan.setValueAtTime(event.pan, ctx.currentTime);
    built.source.connect(built.envelope).connect(voice.gain);
    const source = built.source;
    source.onended = () => {
      source.disconnect();
      built.envelope.disconnect();
      if (voice.source === source) {
        voice.source = null;
        voice.envelope = null;
      }
    };
    source.start(start);
    source.stop(start + built.duration + 0.02);
  }

  /**
   * Eine Schleife auf diesen Pegel bringen — anlegen beim ersten Aufruf,
   * danach nur noch der Pegel. Läuft noch der Platzhalter und die Datei ist
   * inzwischen entpackt, wird getauscht.
   */
  loop(cue: CueId, level: number): void {
    if (this.disposed || !this.enabled || !this.ensure()) return;
    const ctx = this.context!;
    const wanted = Math.max(0, Math.min(1, level));
    let loop = this.loops.get(cue);
    const stock = this.stock.get(cue)!;
    if (loop && loop.placeholder && stock.buffers.length) {
      loop.source.stop();
      loop.source.disconnect();
      loop.gain.disconnect();
      this.loops.delete(cue);
      loop = undefined;
    }
    if (!loop) {
      if (wanted <= 0.001) return;
      const built = this.build(cue, ctx.currentTime, true);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      built.source.connect(built.envelope).connect(gain).connect(this.ambient!);
      built.source.start();
      loop = { source: built.source, gain, placeholder: !stock.buffers.length, level: -1 };
      this.loops.set(cue, loop);
    }
    if (loop.level !== wanted) {
      loop.level = wanted;
      loop.gain.gain.setTargetAtTime(wanted * AUDIO_CUES[cue].gain, ctx.currentTime, 0.6);
    }
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
    const stock = this.stock.get(id)!;
    const list = Array.isArray(value) ? value : [value];
    for (const item of list) {
      if (isPlaceholder(item)) stock.placeholder = item;
      else if (isBuffer(item)) stock.buffers.push(item);
      else if (item instanceof ArrayBuffer) stock.pending.push(item);
      else console.warn(`Audio: Cue "${id}" liefert weder Aufnahme noch Platzhalter`);
    }
  }

  /** Bytes zu Aufnahmen machen — nur mit Kontext, einmal je Datei, nie im Bild. */
  private decodePending(): void {
    const ctx = this.context;
    if (!ctx || this.decoding) return;
    const work: Promise<void>[] = [];
    for (const [id, stock] of this.stock) {
      const pending = stock.pending.splice(0);
      for (const bytes of pending)
        work.push(
          Promise.resolve()
            .then(() => ctx.decodeAudioData(bytes.slice(0)))
            .then(
              (buffer) => {
                stock.buffers.push(buffer);
              },
              (error: unknown) =>
                console.warn(`Audio: Cue "${id}" lässt sich nicht entpacken`, error),
            ),
        );
    }
    if (!work.length) return;
    this.decoding = true;
    void Promise.all(work).then(() => {
      this.decoding = false;
    });
  }

  /** Eine Quelle samt Hüllkurve für einen Cue: eine Aufnahme, wenn es eine gibt, sonst der Platzhalter. */
  private build(
    cue: CueId,
    start: number,
    loop: boolean,
  ): { source: AudioScheduledSourceNode; envelope: GainNode; duration: number; peak: number } {
    const ctx = this.context!;
    const stock = this.stock.get(cue)!;
    const envelope = ctx.createGain();
    if (stock.buffers.length) {
      const buffer = stock.buffers[Math.floor(Math.random() * stock.buffers.length)]!;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;
      envelope.gain.setValueAtTime(1, start);
      return { source, envelope, duration: buffer.duration, peak: AUDIO_CUES[cue].gain };
    }
    const spec = stock.placeholder;
    const duration = spec.duration;
    let source: AudioScheduledSourceNode;
    if (spec.wave === 'noise') {
      const buffer = ctx.createBufferSource();
      buffer.buffer = this.noise;
      buffer.loop = loop;
      buffer.playbackRate.setValueAtTime(spec.from, start);
      if (!loop)
        buffer.playbackRate.exponentialRampToValueAtTime(Math.max(0.05, spec.to), start + duration);
      source = buffer;
    } else {
      const oscillator = ctx.createOscillator();
      oscillator.type = spec.wave;
      oscillator.frequency.setValueAtTime(spec.from, start);
      if (!loop)
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, spec.to), start + duration);
      source = oscillator;
    }
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(1, start + Math.min(spec.attack, duration / 2));
    if (!loop) envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    return { source, envelope, duration, peak: spec.gain };
  }

  private ensure(): boolean {
    if (this.context) return this.context.state === 'running';
    const ctx = sharedAudio();
    if (!ctx || ctx.state !== 'running') return false;
    this.context = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.5 : 0;
    this.master.connect(ctx.destination);
    this.effects = ctx.createGain();
    this.effects.gain.value = this.levels.effects;
    this.effects.connect(this.master);
    this.ambient = ctx.createGain();
    this.ambient.gain.value = this.levels.ambient;
    this.ambient.connect(this.master);
    for (let i = 0; i < MIXER_VOICES; i++) {
      const gain = ctx.createGain(),
        pan = ctx.createStereoPanner();
      gain.connect(pan).connect(this.effects);
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
    this.decodePending();
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
    for (const loop of this.loops.values()) {
      loop.source.stop();
      loop.source.disconnect();
      loop.gain.disconnect();
    }
    this.loops.clear();
    this.effects?.disconnect();
    this.ambient?.disconnect();
    this.master?.disconnect();
    this.master = this.effects = this.ambient = null;
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
