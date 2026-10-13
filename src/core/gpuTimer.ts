import type * as THREE from 'three';

interface TimerQueryExt {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

/**
 * **Wie lange die Grafikkarte an einem Bild rechnet** — gemessen mit
 * `EXT_disjoint_timer_query_webgl2` um das ganze Zeichnen eines Bildes
 * (beide Augen, Schattenkarten, Spiegel).
 *
 * Gewünscht: _„Könnenwir das noch weiter erhöhen?"_ — und dafür muss man
 * wissen, **was** bremst. Die CPU-Zeit misst die Anzeige schon lange; ob die
 * Brille auf ihre Grafikkarte wartet, sagte bisher keine Zahl. Am Schreibtisch
 * lässt sich das nicht nachstellen (dort zeichnet ein Software-Rasterizer).
 *
 * Gibt der Browser die Erweiterung nicht her, bleibt die Zahl leer
 * (`available`). Abgefragt wird nur, solange jemand hinsieht
 * (`GraphicsSettings.showFps`): Das Ergebnis kommt ein paar Bilder später an,
 * und dazwischen liegen höchstens vier offene Messungen.
 */
export class GpuTimer {
  private readonly gl: WebGL2RenderingContext | null;
  private readonly ext: TimerQueryExt | null;
  private readonly pending: WebGLQuery[] = [];
  private active: WebGLQuery | null = null;
  private sum = 0;
  private count = 0;

  constructor(renderer: THREE.WebGLRenderer) {
    const gl = renderer.getContext();
    const two =
      typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    this.gl = two ? gl : null;
    this.ext = two
      ? (gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerQueryExt | null)
      : null;
  }

  /** Ob die Grafikkarte überhaupt gemessen werden kann. */
  get available(): boolean {
    return this.ext !== null;
  }

  /** Vor dem Zeichnen eines Bildes. */
  begin(): void {
    const { gl, ext } = this;
    if (!gl || !ext || this.active || this.pending.length >= 4) return;
    const query = gl.createQuery();
    if (!query) return;
    gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
    this.active = query;
  }

  /** Nach dem Zeichnen — und die fertigen Messungen der Bilder davor einsammeln. */
  end(): void {
    const { gl, ext } = this;
    if (!gl || !ext) return;
    if (this.active) {
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      this.pending.push(this.active);
      this.active = null;
    }
    while (this.pending.length) {
      const query = this.pending[0]!;
      if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) break;
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT) as boolean;
      const nanoseconds = gl.getQueryParameter(query, gl.QUERY_RESULT) as number;
      this.pending.shift();
      gl.deleteQuery(query);
      if (!disjoint) {
        this.sum += nanoseconds / 1e6;
        this.count += 1;
      }
    }
  }

  /** Das Mittel seit dem letzten Abholen in Millisekunden — `null`, wenn keine Messung kam. */
  take(): number | null {
    if (this.count === 0) return null;
    const mean = this.sum / this.count;
    this.sum = 0;
    this.count = 0;
    return mean;
  }
}
