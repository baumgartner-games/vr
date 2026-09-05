/**
 * A handful of synthesised sounds. No assets: everything here is a couple of
 * oscillators, which keeps the whole game a single download.
 *
 * Browsers only let audio start after the player has done something, so the
 * context is created lazily on the first sound and quietly does nothing while
 * it is still suspended.
 */

type Ctor = typeof AudioContext;

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (context) {
    if (context.state === 'suspended') void context.resume();
    return context;
  }
  const Constructor = (window.AudioContext ??
    (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext) as Ctor | undefined;
  if (!Constructor) return null;
  try {
    context = new Constructor();
  } catch {
    return null;
  }
  return context;
}

interface ToneOptions {
  type?: OscillatorType;
  /** Start frequency in Hz. */
  from: number;
  /** Frequency at the end of the sound; defaults to `from`. */
  to?: number;
  duration: number;
  gain?: number;
  /** Seconds to wait before this tone starts. */
  delay?: number;
}

/**
 * Derselbe Kontext für alles, was klingt — auch für die Stimmen der anderen
 * (`net/Voice.ts`).
 *
 * Ein zweiter Kontext wäre nicht falsch, aber teuer: jeder kostet eine eigene
 * Audio-Hardware-Verbindung, und der Browser gibt sie nur nach einer Geste des
 * Spielers frei. Wer schon einmal einen bekommen hat, teilt ihn.
 */
export function sharedAudio(): AudioContext | null {
  return audio();
}

/** One short tone, optionally sweeping from one pitch to another. */
export function playTone(options: ToneOptions): void {
  const ctx = audio();
  if (!ctx) return;

  const start = ctx.currentTime + (options.delay ?? 0);
  const end = start + options.duration;
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();

  oscillator.type = options.type ?? 'square';
  oscillator.frequency.setValueAtTime(options.from, start);
  if (options.to !== undefined && options.to !== options.from) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(options.to, 1), end);
  }

  const peak = options.gain ?? 0.12;
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.012, options.duration / 3));
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(envelope).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

/** Dry click of a gun going off. */
export function playShot(): void {
  playTone({ type: 'square', from: 780, to: 90, duration: 0.09, gain: 0.09 });
  playTone({ type: 'sawtooth', from: 180, to: 50, duration: 0.14, gain: 0.06 });
}

/** Magazine out, magazine in. */
export function playReload(): void {
  playTone({ type: 'square', from: 240, to: 160, duration: 0.06, gain: 0.05 });
  playTone({ type: 'square', from: 320, to: 420, duration: 0.07, gain: 0.05, delay: 0.22 });
}

/** Empty chamber. */
export function playEmpty(): void {
  playTone({ type: 'square', from: 120, to: 90, duration: 0.05, gain: 0.05 });
}

/**
 * The stopwatch. Winding down runs a row of ticks that get lower and slower —
 * the sound everybody knows from the crates in Crash Bandicoot — and winding
 * back up runs the same row in reverse.
 */
export function playStopwatch(slowing: boolean): void {
  const steps = 7;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const progress = slowing ? t : 1 - t;
    playTone({
      type: 'triangle',
      from: 1200 - progress * 780,
      duration: 0.05,
      gain: 0.07,
      // The gaps stretch as it slows down, and close up again as it speeds up.
      delay: slowing ? t * t * 0.55 : t * 0.3,
    });
  }
}

/** Soft blip for picking something up or putting it away. */
export function playPick(up: boolean): void {
  playTone({
    type: 'triangle',
    from: up ? 520 : 420,
    to: up ? 760 : 300,
    duration: 0.07,
    gain: 0.05,
  });
}

/** Der Korken einer Sektflasche: der Knall, der Schlag darunter, das Zischen danach. */
export function playPop(): void {
  playTone({ type: 'square', from: 1500, to: 320, duration: 0.05, gain: 0.09 });
  playTone({ type: 'sine', from: 200, to: 60, duration: 0.14, gain: 0.08 });
  playTone({ type: 'sawtooth', from: 2800, to: 1600, duration: 0.55, gain: 0.012, delay: 0.04 });
}

/** A light switch, a torch: the plastic click, up and down. */
export function playSwitch(on: boolean): void {
  playTone({
    type: 'square',
    from: on ? 900 : 700,
    to: on ? 1500 : 420,
    duration: 0.035,
    gain: 0.05,
  });
}
