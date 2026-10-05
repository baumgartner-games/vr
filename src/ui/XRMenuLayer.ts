import * as THREE from 'three';
import type { UIPanel } from './UIPanel';

const _ref = new THREE.Matrix4();
const _parent = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

/**
 * **Der Bildschirm als Ebene des Kompositors** — damit die Schrift scharf ist.
 *
 * Gewünscht: _„die schrift und alles in diesem menü [ist] nicht scharf genug
 * bzw. wirkt so verschwommen/unscharf […] da müssten wir alternative ideen
 * finden"_. Größer machen hilft nur ein Stück. Unscharf wird ein Panel in der
 * Szene, weil es **zweimal abgetastet** wird: erst die Leinwand ins Bild für
 * jedes Auge — in dessen Auflösung (`framebufferScale`) und an den Rändern
 * gröber (Foveated Rendering) —, dann dieses Bild noch einmal vom Kompositor
 * durch die Linsenverzerrung.
 *
 * Eine **Quad-Ebene** (WebXR Layers, `XRQuadLayer`) überspringt den ersten
 * Schritt: Der Kompositor der Brille liest die Leinwand selbst und tastet sie
 * einmal ab, in voller Auflösung des Displays, und mit `quality:
 * 'text-optimized'` noch mit Überabtastung für Schrift. So zeigt die Quest
 * auch ihre eigenen Menüs.
 *
 * Die Ebene liegt **unter** dem Bild der Szene (`layers: [quad, projection]`);
 * das Panel in der Szene stanzt dafür ein Loch (Farbe und Alpha 0, mit Tiefe),
 * durch das man sie sieht. Was vor dem Panel steht — die kleinen Modelle in den
 * Kacheln, die Figur, der Kreis am Strahl — zeichnet die Szene weiter darüber.
 *
 * Ohne Layers-Unterstützung (oder außerhalb der Brille) bleibt alles, wie es
 * war: das Panel mit seiner Leinwand als Textur.
 */
export class XRMenuLayer {
  private session: XRSession | null = null;
  private layer: XRQuadLayer | null = null;
  /** Ob die Ebene gerade in der Liste der Sitzung steht. */
  private shown = false;
  /** Welche Fassung der Leinwand zuletzt hinübergeschrieben wurde. */
  private drawn = -1;
  private readonly hole: THREE.MeshBasicMaterial;
  private readonly normal: THREE.MeshBasicMaterial;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    /** Die Kamera der Szene — ihr Elternteil ist der Raum der Brille. */
    private readonly camera: THREE.Camera,
    private readonly panel: UIPanel,
  ) {
    this.normal = panel.material;
    // Farbe und Alpha 0, ohne Mischen: Hier ist das Bild der Szene durchsichtig.
    this.hole = new THREE.MeshBasicMaterial({
      color: 0x000000,
      opacity: 0,
      transparent: false,
      blending: THREE.NoBlending,
      depthFunc: THREE.AlwaysDepth,
      toneMapped: false,
      // **Ohne Nebel** (`noFog.ts`): Mit ihm bekäme das Loch die Farbe des
      // Nebels bei Alpha 0, und die legte sich im Kompositor über die Ebene.
      fog: false,
    });
    // Die Lage der Ebene unmittelbar vor dem Zeichnen: Dann stimmt sie mit dem
    // Loch überein, auch wenn sich das Rig im selben Bild noch bewegt hat.
    panel.onBeforeRender = () => this.place();
  }

  /** Ob gerade die Ebene das Menü zeigt — und nicht die Textur in der Szene. */
  get active(): boolean {
    return this.shown;
  }

  /**
   * Jedes Bild, vor dem Zeichnen. `visible` sagt, ob das Menü offen ist.
   */
  update(visible: boolean): void {
    const xr = this.renderer.xr;
    const session = xr.isPresenting ? xr.getSession() : null;
    if (session !== this.session) this.reset(session);
    const want = visible && session !== null && this.ensureLayer();
    if (want !== this.shown) this.show(want);
    if (want) this.redraw();
  }

  dispose(): void {
    this.reset(null);
    this.hole.dispose();
    if (this.panel.onBeforeRender === this.place) this.panel.onBeforeRender = () => {};
  }

  /** Eine neue Sitzung (oder keine): Die alte Ebene gehört der alten. */
  private reset(session: XRSession | null): void {
    if (this.shown) this.show(false);
    try {
      this.layer?.destroy();
    } catch {
      // Die Sitzung ist schon zu — dann ist die Ebene ohnehin weg.
    }
    this.layer = null;
    this.drawn = -1;
    this.session = session;
  }

  /** Die Ebene anlegen, wenn die Brille das kann. `false` heißt: Textur wie bisher. */
  private ensureLayer(): boolean {
    if (this.layer) return true;
    const xr = this.renderer.xr;
    const base = xr.getBaseLayer();
    const space = xr.getReferenceSpace();
    // Ohne Projektionsebene (alte API, `XRWebGLLayer`) gibt es keine Liste,
    // in die eine zweite Ebene gehörte.
    if (!base || !('textureWidth' in base) || !space) return false;
    const binding = xr.getBinding();
    if (!binding || typeof binding.createQuadLayer !== 'function') return false;
    const canvas = this.panel.canvas;
    const { width, height } = this.panel.geometry.parameters;
    try {
      // `clearOnAccess` steht noch nicht in den Typen, die Brille kennt es.
      const init: XRQuadLayerInit & { clearOnAccess: boolean } = {
        space,
        viewPixelWidth: canvas.width,
        viewPixelHeight: canvas.height,
        layout: 'mono',
        // **Halbe** Breite und Höhe: Die Quest liest die Maße als Halbachsen
        // (so übergibt es auch three.js, `XRManager.createXRLayer`). Mit den
        // ganzen Maßen war die Ebene doppelt so groß wie ihr Loch — das Menü
        // stand stark vergrößert im Rahmen, die Kacheln am Rand abgeschnitten.
        width: width / 2,
        height: height / 2,
        // Nicht bei jedem Zugriff leeren: Geschrieben wird nur, wenn sich die
        // Leinwand geändert hat.
        clearOnAccess: false,
      };
      const layer = binding.createQuadLayer(init);
      try {
        layer.quality = 'text-optimized';
      } catch {
        // Ältere Brillen kennen die Eigenschaft nicht — dann eben ohne.
      }
      this.layer = layer;
    } catch (error) {
      console.warn('Menü-Ebene nicht verfügbar, das Menü bleibt eine Textur', error);
      return false;
    }
    // Die Szene darüber muss durchsichtig sein dürfen, wo das Loch ist.
    (base as XRProjectionLayer).blendTextureSourceAlpha = true;
    return true;
  }

  private show(on: boolean): void {
    const session = this.session;
    const base = this.renderer.xr.getBaseLayer() as XRProjectionLayer | null;
    this.shown = on;
    this.panel.material = on ? this.hole : this.normal;
    if (!session || !base) return;
    try {
      void session.updateRenderState({ layers: on && this.layer ? [this.layer, base] : [base] });
    } catch (error) {
      console.warn('Menü-Ebene ließ sich nicht setzen', error);
      this.shown = false;
      this.panel.material = this.normal;
    }
    this.drawn = -1;
  }

  /** Die Leinwand hinüberschreiben — nur wenn sie neu ist oder die Brille darum bittet. */
  private redraw(): void {
    const layer = this.layer;
    const frame = this.renderer.xr.getFrame();
    if (!layer || !frame) return;
    if (this.drawn === this.panel.revision && !layer.needsRedraw) return;
    const binding = this.renderer.xr.getBinding();
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sub = binding.getSubImage(layer, frame);
    // **Nichts verstellen, was three.js sich merkt.** Es führt Buch über
    // gebundene Texturen und Entpack-Schalter; also wird hier vorher gelesen
    // und hinterher genau das wieder hergestellt. Nicht `renderer.resetState()`:
    // Das vergisst mitten in der Sitzung auch das Ziel der Brille, und danach
    // blieb das Bild der Szene schwarz (in der Simulation nachgestellt).
    const bound = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;
    const flip = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL) as boolean;
    const premultiply = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL) as boolean;
    gl.bindTexture(gl.TEXTURE_2D, sub.colorTexture);
    // Leinwand oben links, Textur unten links — und der Kompositor rechnet
    // mit vormultipliziertem Alpha.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.panel.canvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
    gl.bindTexture(gl.TEXTURE_2D, bound);
    this.drawn = this.panel.revision;
  }

  /** Lage der Ebene im Raum der Brille = Lage des Panels relativ zum Elternteil der Kamera. */
  private place = (): void => {
    const layer = this.layer;
    if (!this.shown || !layer) return;
    const parent = this.camera.parent;
    _ref.copy(this.panel.matrixWorld);
    if (parent) _ref.premultiply(_parent.copy(parent.matrixWorld).invert());
    _ref.decompose(_pos, _quat, _scale);
    layer.transform = new XRRigidTransform(
      { x: _pos.x, y: _pos.y, z: _pos.z },
      { x: _quat.x, y: _quat.y, z: _quat.z, w: _quat.w },
    );
  };
}
