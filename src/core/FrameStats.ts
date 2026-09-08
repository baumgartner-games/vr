/** Frame cadence is measured from animation timestamps, never the clamped game dt. */
export interface FrameSample {
  fps: number;
  frameMs: number;
  cpuMs: number;
  calls: number;
  triangles: number;
}

/** Half-second averages; no timers, scene traversal or per-frame DOM work. */
export class FrameSampler {
  private lastTime: number | null = null;
  private elapsed = 0;
  private frames = 0;
  private cpu = 0;
  private calls = 0;
  private triangles = 0;

  sample(time: number, cpuMs: number, calls: number, triangles: number): FrameSample | null {
    const previous = this.lastTime;
    this.lastTime = time;
    if (previous === null) return null;
    const interval = time - previous;
    // A suspended/background tab must not poison the next measurement window.
    if (interval <= 0 || interval > 2000 || !Number.isFinite(interval)) {
      this.clearWindow();
      return null;
    }
    this.elapsed += interval;
    this.frames += 1;
    this.cpu += cpuMs;
    this.calls += calls;
    this.triangles += triangles;
    if (this.elapsed < 500) return null;
    const result = {
      fps: (this.frames * 1000) / this.elapsed,
      frameMs: this.elapsed / this.frames,
      cpuMs: this.cpu / this.frames,
      calls: this.calls / this.frames,
      triangles: this.triangles / this.frames,
    };
    this.clearWindow();
    return result;
  }

  reset(): void {
    this.lastTime = null;
    this.clearWindow();
  }

  private clearWindow(): void {
    this.elapsed = 0;
    this.frames = 0;
    this.cpu = 0;
    this.calls = 0;
    this.triangles = 0;
  }
}

/** Compact web diagnostics, automatically shown in Haunting; F3 toggles anywhere. */
export class FrameStats {
  private readonly element = document.createElement('div');
  private readonly sampler = new FrameSampler();
  private requested: boolean | null = null;
  private haunting = false;
  private immersive = false;

  constructor() {
    this.element.className = 'frame-stats';
    this.element.hidden = true;
    this.element.setAttribute('aria-label', 'Bildrate und Grafikleistung');
    this.element.title =
      'F3: Anzeige umschalten. Mittelwerte über 0,5 s. CPU misst JavaScript, nicht GPU-Zeit. ' +
      'Draw Calls und Dreiecke enthalten auch Spiegel und weitere Renderdurchgänge.';
    document.body.append(this.element);
    window.addEventListener('keydown', this.onKeyDown);
  }

  setWorld(id: string): void {
    this.haunting = id === 'haunting';
    this.refresh();
  }

  setImmersive(on: boolean): void {
    this.immersive = on;
    this.refresh();
  }

  update(time: number, cpuMs: number, render: { calls: number; triangles: number }): void {
    if (this.element.hidden) return;
    const sample = this.sampler.sample(time, cpuMs, render.calls, render.triangles);
    if (!sample) return;
    this.element.textContent =
      `${sample.fps.toFixed(0)} FPS · ${sample.frameMs.toFixed(1)} ms · F3\n` +
      `CPU ${sample.cpuMs.toFixed(1)} ms · ${sample.calls.toFixed(0)} Draws · ` +
      `${(sample.triangles / 1000).toFixed(1)}k Dreiecke`;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.element.remove();
  }

  private refresh(): void {
    this.element.hidden = this.immersive || !(this.requested ?? this.haunting);
    this.element.textContent = 'FPS wird gemessen … · F3';
    this.sampler.reset();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== 'F3' || event.repeat) return;
    event.preventDefault();
    this.requested = !(this.requested ?? this.haunting);
    this.refresh();
  };
}
