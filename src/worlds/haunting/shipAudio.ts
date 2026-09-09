import { sharedAudio } from '../../core/Audio';
import type { MonsterKind } from './mission';
import { ENTITY_PROFILES, type SignalPoint } from './threat';

export const SHIP_AUDIO_VOICES = 8;
export type ShipSound = 'door' | 'spark' | 'vent' | 'step' | 'pickup' | 'crew-step' | 'breath';
export interface ShipAudioFrame {
  listener: SignalPoint;
  forward: SignalPoint;
  monster: SignalPoint | null;
  kind: MonsterKind;
  active: boolean;
  test: boolean;
  venting: boolean;
  machine?: SignalPoint;
  engineRepaired?: boolean;
  /** Metres per second of actual walking, excluding spectator flight. */
  playerSpeed?: number;
  /** In-game exertion 0..1; never microphone or breathing-tracker input. */
  exertion?: number;
}
interface Voice {
  gain: GainNode;
  pan: StereoPannerNode;
  source: AudioScheduledSourceNode | null;
  envelope: GainNode | null;
  at: SignalPoint;
  volume: number;
}

/** Head-relative stereo with inverse-square falloff; no HRTF convolution on mobile. */
export function spatialMix(
  listener: SignalPoint,
  forward: SignalPoint,
  source: SignalPoint,
  output: { pan: number; gain: number } = { pan: 0, gain: 0 },
): { pan: number; gain: number } {
  const dx = source.x - listener.x,
    dz = source.z - listener.z;
  const distance = Math.hypot(dx, dz),
    length = Math.hypot(forward.x, forward.z);
  if (!Number.isFinite(distance) || !Number.isFinite(length)) {
    output.pan = 0;
    output.gain = 0;
    return output;
  }
  const pan =
    distance > 0.01 && length > 0.01 ? (dx * -forward.z + dz * forward.x) / (distance * length) : 0;
  output.pan = Math.min(1, Math.max(-1, pan));
  output.gain = distance > 28 ? 0 : 1 / (1 + (distance / 3.5) ** 2);
  return output;
}

/** Eight reusable stereo/envelope slots plus one machine oscillator, all synthesised locally. */
export class ShipAudio {
  private context: AudioContext | null = null;
  private readonly voices: Voice[] = [];
  private master: GainNode | null = null;
  private hum: { oscillator: OscillatorNode; gain: GainNode; pan: StereoPannerNode } | null = null;
  private noise: AudioBuffer | null = null;
  private listener: SignalPoint = { x: 0, z: 0 };
  private forward: SignalPoint = { x: 0, z: -1 };
  private readonly mix = { gain: 0, pan: 0 };
  private enabled = true;
  private disposed = false;
  private stepClock = 0;
  private playerStepClock = 0;
  private breathClock = 0;
  private ventBefore = false;

  get activeVoices(): number {
    let count = 0;
    for (const voice of this.voices) if (voice.source) count++;
    return count;
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(value ? 0.5 : 0, this.context.currentTime, 0.02);
  }

  update(dt: number, frame: ShipAudioFrame): void {
    if (this.disposed || !this.enabled || !this.ensure()) return;
    const ctx = this.context!;
    this.listener.x = frame.listener.x;
    this.listener.z = frame.listener.z;
    this.forward.x = frame.forward.x;
    this.forward.z = frame.forward.z;
    for (const voice of this.voices)
      if (voice.source) {
        const mix = spatialMix(this.listener, this.forward, voice.at, this.mix);
        voice.pan.pan.setTargetAtTime(mix.pan, ctx.currentTime, 0.03);
        voice.gain.gain.setTargetAtTime(voice.volume * mix.gain, ctx.currentTime, 0.03);
      }
    if (this.hum) {
      const mix = this.mix;
      if (frame.machine) spatialMix(this.listener, this.forward, frame.machine, mix);
      else {
        mix.gain = 0;
        mix.pan = 0;
      }
      this.hum.gain.gain.setTargetAtTime(
        mix.gain * (frame.engineRepaired ? 0.012 : 0.025),
        ctx.currentTime,
        0.3,
      );
      this.hum.pan.pan.setTargetAtTime(mix.pan, ctx.currentTime, 0.1);
      this.hum.oscillator.frequency.setTargetAtTime(
        frame.engineRepaired ? 56 : 49,
        ctx.currentTime,
        0.3,
      );
    }
    const elapsed = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
    this.stepClock -= elapsed;
    this.playerStepClock -= elapsed;
    this.breathClock -= elapsed;
    const speed = Number.isFinite(frame.playerSpeed)
      ? Math.max(0, Math.min(8, frame.playerSpeed!))
      : 0;
    const exertion = Number.isFinite(frame.exertion)
      ? Math.max(0, Math.min(1, frame.exertion!))
      : 0;
    if (speed > 0.25 && this.playerStepClock <= 0) {
      this.playerStepClock = Math.max(0.28, 1.45 / speed);
      this.play('crew-step', this.listener);
    }
    if (exertion > 0.25 && this.breathClock <= 0) {
      this.breathClock = 2.5 - exertion * 1.2;
      this.play('breath', this.listener);
    }
    const hostile = frame.active && !frame.test && frame.monster;
    if (hostile && frame.venting && !this.ventBefore) this.play('vent', frame.monster!, frame.kind);
    this.ventBefore = frame.venting;
    if (hostile && !frame.venting && this.stepClock <= 0) {
      this.stepClock = ENTITY_PROFILES[frame.kind].cadence;
      this.play('step', frame.monster!, frame.kind);
    }
  }

  play(kind: ShipSound, at: SignalPoint, monster: MonsterKind = 'stalker'): void {
    if (this.disposed || !this.enabled || !this.ensure()) return;
    const ctx = this.context!;
    let voice: Voice | undefined;
    for (const slot of this.voices)
      if (slot.source === null) {
        voice = slot;
        break;
      }
    const mix = spatialMix(this.listener, this.forward, at, this.mix);
    // Drop a distant or ninth simultaneous event; never let a spark burst allocate unbounded nodes.
    if (!voice || mix.gain < 0.015) return;
    const noisy =
      kind === 'spark' ||
      kind === 'vent' ||
      kind === 'door' ||
      kind === 'breath' ||
      (kind === 'step' && monster === 'crawler');
    const duration =
      kind === 'door'
        ? 0.46
        : kind === 'vent'
          ? 0.55
          : kind === 'spark'
            ? 0.13
            : kind === 'breath'
              ? 0.72
              : kind === 'crew-step'
                ? 0.12
                : 0.2;
    const source = noisy ? ctx.createBufferSource() : ctx.createOscillator();
    if ('buffer' in source) {
      source.buffer = this.noise;
      source.playbackRate.value =
        kind === 'door' ? 0.45 : kind === 'vent' ? 0.7 : kind === 'breath' ? 0.32 : 1.2;
    } else {
      source.type = kind === 'pickup' ? 'sine' : monster === 'sentinel' ? 'triangle' : 'sine';
      const frequency =
        kind === 'pickup'
          ? 580
          : kind === 'crew-step'
            ? 105
            : ENTITY_PROFILES[monster].stepFrequency;
      source.frequency.setValueAtTime(frequency, ctx.currentTime);
      source.frequency.exponentialRampToValueAtTime(
        kind === 'pickup' ? 840 : frequency * 0.35,
        ctx.currentTime + duration,
      );
    }
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, ctx.currentTime);
    envelope.gain.exponentialRampToValueAtTime(
      1,
      ctx.currentTime + (kind === 'breath' ? 0.22 : 0.012),
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    voice.source = source;
    voice.envelope = envelope;
    voice.at.x = at.x;
    voice.at.z = at.z;
    voice.volume =
      kind === 'step'
        ? 0.14 * ENTITY_PROFILES[monster].sound
        : kind === 'spark'
          ? 0.06
          : kind === 'crew-step'
            ? 0.038
            : kind === 'breath'
              ? 0.045
              : 0.08;
    voice.gain.gain.setValueAtTime(voice.volume * mix.gain, ctx.currentTime);
    voice.pan.pan.setValueAtTime(mix.pan, ctx.currentTime);
    source.connect(envelope).connect(voice.gain);
    source.onended = () => {
      source.disconnect();
      envelope.disconnect();
      if (voice.source === source) {
        voice.source = null;
        voice.envelope = null;
      }
    };
    source.start();
    source.stop(ctx.currentTime + duration + 0.02);
  }

  private ensure(): boolean {
    if (this.context) return this.context.state === 'running';
    const ctx = sharedAudio();
    if (!ctx || ctx.state !== 'running') return false;
    this.context = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.5 : 0;
    this.master.connect(ctx.destination);
    for (let i = 0; i < SHIP_AUDIO_VOICES; i++) {
      const gain = ctx.createGain(),
        pan = ctx.createStereoPanner();
      gain.connect(pan).connect(this.master);
      this.voices.push({ gain, pan, source: null, envelope: null, at: { x: 0, z: 0 }, volume: 0 });
    }
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const samples = this.noise.getChannelData(0);
    let seed = 71371,
      filtered = 0;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      filtered = filtered * 0.72 + (((seed >>> 0) / 0xffffffff) * 2 - 1) * 0.28;
      samples[i] = filtered;
    }
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain(),
      pan = ctx.createStereoPanner();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 49;
    gain.gain.value = 0;
    oscillator.connect(gain).connect(pan).connect(this.master);
    oscillator.start();
    this.hum = { oscillator, gain, pan };
    return true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const voice of this.voices) {
      if (voice.source) {
        voice.source.stop();
        voice.source.disconnect();
      }
      voice.gain.disconnect();
      voice.pan.disconnect();
      voice.envelope?.disconnect();
    }
    this.voices.length = 0;
    this.hum?.oscillator.stop();
    this.hum?.oscillator.disconnect();
    this.hum?.gain.disconnect();
    this.hum?.pan.disconnect();
    this.hum = null;
    this.master?.disconnect();
    this.master = null;
    this.noise = null;
  }
}
