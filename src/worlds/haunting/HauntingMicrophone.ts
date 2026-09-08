import { sharedAudio } from '../../core/Audio';

export type MicrophoneStatus = 'off' | 'requesting' | 'on' | 'denied' | 'unavailable';
export interface HauntingMicrophoneOptions {
  changed(): void;
  say(text: string): void;
}

/** Explicit local noise sensing: no recording, playback, network send, or automatic permission request. */
export class HauntingMicrophone {
  private readonly samples = new Float32Array(512);
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private generation = 0;
  private disposed = false;
  private currentStatus: MicrophoneStatus = 'off';
  private smoothed = 0;
  private clock = 0;

  constructor(private readonly options: HauntingMicrophoneOptions) {}

  get enabled(): boolean {
    return this.currentStatus === 'on';
  }
  get pending(): boolean {
    return this.currentStatus === 'requesting';
  }
  get status(): MicrophoneStatus {
    return this.currentStatus;
  }
  get level(): number {
    return this.enabled ? this.smoothed : 0;
  }

  /** Called only by the player's microphone menu/button. A second toggle cancels a pending request. */
  async toggle(): Promise<void> {
    if (this.disposed) return;
    if (this.enabled || this.pending) {
      this.generation++;
      this.release();
      this.change('off');
      this.options.say('Mikrofon für Gegnergeräusche ausgeschaltet.');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.change('unavailable');
      this.options.say('Mikrofonanalyse ist in diesem Browser nicht verfügbar.');
      return;
    }
    const token = ++this.generation;
    this.change('requesting');
    try {
      // Start/resume the existing shared context during the explicit user gesture.
      const context = sharedAudio();
      if (!context) {
        this.change('unavailable');
        this.options.say('Dieser Browser unterstützt die lokale Audioanalyse nicht.');
        return;
      }
      const resume = context.state === 'suspended' ? context.resume() : Promise.resolve();
      // Attach a handler immediately, even while the permission sheet is still open.
      const resumed = resume.then(
        () => true,
        () => false,
      );
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
        video: false,
      });
      if (this.disposed || token !== this.generation) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      this.stream = stream;
      if (!(await resumed)) throw new Error('Audio context could not resume');
      if (this.disposed || token !== this.generation) return;
      if (!stream.getAudioTracks().some((track) => track.readyState === 'live'))
        throw new Error('No live microphone track');
      const analyser = context.createAnalyser();
      this.analyser = analyser;
      analyser.fftSize = this.samples.length;
      analyser.smoothingTimeConstant = 0;
      const source = context.createMediaStreamSource(stream);
      this.source = source;
      source.connect(analyser);
      // The analyser has no output connection: the microphone is never played back.
      for (const track of stream.getAudioTracks()) track.addEventListener('ended', this.ended);
      this.change('on');
      this.options.say('Lokale Mikrofonanalyse an. Laute Geräusche können den Gegner anlocken.');
    } catch (error) {
      if (this.disposed || token !== this.generation) return;
      this.release();
      const denied =
        error instanceof Error &&
        (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError');
      this.change(denied ? 'denied' : 'unavailable');
      this.options.say(
        denied
          ? 'Mikrofon nicht freigegeben. Das Spiel funktioniert weiterhin ohne Mikrofon.'
          : 'Mikrofon konnte nicht gestartet werden. Das Spiel funktioniert weiterhin ohne Mikrofon.',
      );
    }
  }

  /** Samples at most 20 Hz into one reused buffer; only the gated scalar survives each sample. */
  update(dt: number): void {
    if (!this.enabled || !this.analyser || !Number.isFinite(dt)) return;
    this.clock += Math.max(0, Math.min(0.1, dt));
    if (this.clock < 0.05) return;
    const elapsed = this.clock;
    this.clock %= 0.05;
    this.analyser.getFloatTimeDomainData(this.samples);
    let sum = 0,
      squares = 0;
    for (let i = 0; i < this.samples.length; i++) {
      const value = Number.isFinite(this.samples[i]) ? this.samples[i]! : 0;
      sum += value;
      squares += value * value;
    }
    const mean = sum / this.samples.length;
    const rms = Math.sqrt(Math.max(0, squares / this.samples.length - mean * mean));
    const target = Math.max(0, Math.min(1, (rms - 0.012) / 0.18));
    const speed = target > this.smoothed ? 14 : 5;
    this.smoothed += (target - this.smoothed) * (1 - Math.exp(-elapsed * speed));
    if (this.smoothed < 0.005) this.smoothed = 0;
  }

  private readonly ended = (): void => {
    if (this.disposed || !this.enabled) return;
    this.generation++;
    this.release();
    this.change('off');
    this.options.say('Mikrofonverbindung beendet; Geräuscherkennung ist aus.');
  };

  private change(status: MicrophoneStatus): void {
    this.currentStatus = status;
    this.options.changed();
  }

  private release(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.removeEventListener('ended', this.ended);
        track.stop();
      }
    }
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.source = null;
    this.analyser = null;
    this.stream = null;
    this.smoothed = 0;
    this.clock = 0;
    this.samples.fill(0);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation++;
    this.release();
    this.currentStatus = 'off';
  }
}
