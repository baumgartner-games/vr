import * as THREE from 'three';
import type * as WebGPU from 'three/webgpu';
import { usingWebGPU, webgpuModule } from '../../core/appRenderer';
import { asShaderMaterial } from '../../core/nodeLooks';

/**
 * **Spiegel und Portale im neuen Renderer** (_Grafik → Renderer: Multiview_,
 * `core/appRenderer.ts`).
 *
 * Beide Flächen lesen ihr Bild in **Bildschirmkoordinaten** ab
 * (`screenSurface.ts`): Es entsteht in einem Ziel, das genauso aufgebaut ist
 * wie der Puffer, in den gerade gezeichnet wird. Hier steht, was der neue
 * Renderer dafür anders braucht — die Flächen als Knotenmaterial, das Ziel,
 * die umgedrehte Aussortierung, der Ausschnitt und die geliehene
 * Brillenkamera. Unter WebGL läuft nichts davon; jede Funktion gibt dort
 * `null` zurück oder tut, was der alte Renderer immer schon tat.
 *
 * **Mit Multiview** zeichnet der neue Renderer beide Augen in **ein
 * Texturfeld mit zwei Ebenen** (`OVR_multiview2`): jedes Auge in seiner Ebene,
 * beide mit dem Viewport `(0, 0, Breite, Höhe)`. Die Sicht durch Spiegel und
 * Portal entsteht dann genauso — in einem Ziel mit zwei Ebenen, in einem
 * Durchgang für beide Augen —, und die Fläche liest in der Ebene ihres Auges
 * (`gl_ViewID_OVR`). Anders ginge es auch gar nicht: Solange die Brille in ein
 * Multiview-Ziel zeichnet, übersetzt der Renderer **jedes** Material mit
 * `layout(num_views = 2)` (`NodeManager._createNodeBuilder` fragt nach
 * `getOutputRenderTarget().multiview`, nicht nach dem Ziel des Durchgangs),
 * und ein solches Programm darf nur in einen Puffer mit zwei Ebenen zeichnen.
 */

type Gpu = NonNullable<ReturnType<typeof webgpuModule>>;
type Vec3 = WebGPU.Node<'vec3'>;
type Uniforms = Record<string, { value: unknown }>;

/** Das Bild, solange eine Fläche keines hat — eins je Art des Ziels. */
let flatBlank: THREE.DataTexture | null = null;
let layeredBlank: THREE.DataArrayTexture | null = null;

/**
 * **Das Bild der Fläche, in Bildschirmkoordinaten abgelesen** — samt dem
 * Feld `uTexture`, über das die Fläche es setzt.
 *
 * Zwei Texturen stehen dahinter, und jede Übersetzung nimmt genau eine: am
 * Schirm und in der Brille ohne Multiview die gewöhnliche, mit Multiview die
 * mit zwei Ebenen (`builder.camera.isMultiViewCamera`, dieselbe Frage, die
 * three für die Kameramatrizen stellt). Das Feld verteilt das gesetzte Bild
 * auf die passende und legt in die andere einen Platzhalter — ein Ziel, das
 * gerade weggeräumt wurde, bleibt so nirgends gebunden.
 *
 * `gl_FragCoord` und nicht `screenCoordinate`: Das kippt three für WebGL um
 * die Höhe des **Schirms**, und die ist in der Brille nicht die des Puffers.
 * Kippen muss trotzdem einer — three liest Renderziele kopfüber
 * (`TextureNode.setupUV`) und dreht das wieder zurück.
 */
function screenImage(gpu: Gpu): {
  sample: Vec3;
  resolution: { value: THREE.Vector2 };
  texture: { value: THREE.Texture | null };
} {
  const { TSL } = gpu;
  if (!flatBlank) {
    flatBlank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    flatBlank.needsUpdate = true;
  }
  if (!layeredBlank) {
    layeredBlank = new THREE.DataArrayTexture(new Uint8Array(8), 1, 1, 2);
    layeredBlank.needsUpdate = true;
  }
  const flatEmpty = flatBlank;
  const layeredEmpty = layeredBlank;
  const flat = TSL.texture(flatEmpty);
  const layered = TSL.texture(layeredEmpty);
  let current: THREE.Texture | null = null;
  const texture = {
    get value(): THREE.Texture | null {
      return current;
    },
    set value(next: THREE.Texture | null) {
      current = next;
      const isLayered = next?.isArrayTexture === true;
      flat.value = next && !isLayered ? next : flatEmpty;
      layered.value = next && isLayered ? next : layeredEmpty;
    },
  };
  const resolution = TSL.uniform(new THREE.Vector2(1, 1));
  type Builder = { camera?: THREE.Camera & { isMultiViewCamera?: boolean } };
  const build = TSL.Fn((builder: Builder) => {
    const frag = TSL.vec2(TSL.expression('gl_FragCoord.xy', 'vec2') as any);
    const uv = TSL.vec2(frag.x.div(resolution.x), TSL.float(1).sub(frag.y.div(resolution.y)));
    if (builder.camera?.isMultiViewCamera === true) {
      // Im Eckpunkt gelesen und weitergereicht — dort gibt es die Nummer des
      // Auges sicher, und sie ist für alle Ecken eines Dreiecks dieselbe.
      const eye = TSL.float(TSL.expression('float( gl_ViewID_OVR )', 'float') as any);
      return layered.sample(uv).depth(eye.toVarying('vBgvrEye')).rgb;
    }
    return flat.sample(uv).rgb;
  }) as unknown as () => Vec3;
  return { sample: build(), resolution, texture };
}

/**
 * **Die Spiegelfläche** (`shared/Mirror.ts`) als Knotenmaterial — dieselbe
 * Rechnung wie ihr Shader: das Bild um 8 % abgedunkelt und getönt, ohne Bild
 * blindes Glas mit einem flachen Schein. `null` unter WebGL.
 */
export function mirrorNodeMaterial(tint: number): THREE.ShaderMaterial | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const { TSL } = gpu;
  const image = screenImage(gpu);
  const uTint = TSL.uniform(new THREE.Color(tint));
  const uActive = TSL.uniform(0);
  const uv = TSL.uv();
  const sheen = TSL.clamp(uv.x.mul(0.45).add(uv.y.mul(0.55)), 0, 1);
  const blind = uTint.mul(sheen.mul(0.075).add(0.035));
  const material = new gpu.MeshBasicNodeMaterial();
  material.colorNode = TSL.select(
    uActive.greaterThan(0.5),
    image.sample.mul(uTint).mul(0.92),
    blind,
  );
  material.fog = false;
  return asShaderMaterial(material, {
    uTexture: image.texture,
    uResolution: image.resolution,
    uTint,
    uActive,
  } as Uniforms);
}

/**
 * **Die Portalfläche** (`portal/Portal.ts`) als Knotenmaterial: ein
 * elliptisches Loch, darin das Bild oder ohne Bild der Wirbel, zum Rand hin
 * in die Farbe des Portals. `null` unter WebGL.
 */
export function portalNodeMaterial(color: THREE.Color): THREE.ShaderMaterial | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const { TSL } = gpu;
  const image = screenImage(gpu);
  const uColor = TSL.uniform(color);
  const uActive = TSL.uniform(0);
  const uTime = TSL.uniform(0);
  const material = new gpu.MeshBasicNodeMaterial();
  material.colorNode = TSL.Fn(() => {
    const p = TSL.uv().mul(2).sub(1);
    const r = TSL.length(p);
    TSL.Discard(r.greaterThan(1));
    const swirl = TSL.sin(TSL.atan(p.y, p.x).mul(4).add(uTime.mul(2)).sub(r.mul(7)))
      .mul(0.5)
      .add(0.5);
    const idle = uColor.mul(swirl.mul(0.25).add(0.08));
    const inside = TSL.select(uActive.greaterThan(0.5), image.sample, idle);
    const edge = TSL.smoothstep(0.78, 1, r);
    return TSL.mix(inside, uColor.mul(2.4), edge);
  })();
  material.fog = false;
  return asShaderMaterial(material, {
    uTexture: image.texture,
    uResolution: image.resolution,
    uColor,
    uActive,
    uTime,
  } as Uniforms);
}

/**
 * **Ein Ziel für eine Sicht** im neuen Renderer: wie das des alten (halbe
 * Gleitkommazahlen, Tiefe, kein Stencil), mit `layers === 2` eines mit zwei
 * Ebenen für Multiview — die Tiefe dazu legt three selbst als Feld an
 * (`Textures.updateRenderTarget`). Weitergereicht wird es als
 * `WebGLRenderTarget`, wie der Renderer selbst (`appRenderer.createRenderer`).
 */
export function gpuViewTarget(
  width: number,
  height: number,
  samples: number,
  layers: number,
): THREE.WebGLRenderTarget {
  const gpu = webgpuModule()!;
  const target = new gpu.RenderTarget(width, height, {
    type: THREE.HalfFloatType,
    depthBuffer: true,
    stencilBuffer: false,
    samples: layers > 1 ? 0 : samples,
    depth: layers,
    multiview: layers > 1,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: false,
  });
  return target as unknown as THREE.WebGLRenderTarget;
}

/**
 * **Welche Seite weggelassen wird** — für die Spiegeldurchgänge, in denen alle
 * Dreiecke andersherum laufen. Der alte Renderer hat dafür `state.setCullFace`;
 * der neue hat es in seinem WebGL-Teil auch (`WebGLState.setCullFace`), und
 * wie beim alten rührt das Material es nicht an: Es schaltet nur das
 * Weglassen ein oder aus und die Vorderseite um (`setMaterial`).
 */
export function setCullFace(renderer: THREE.WebGLRenderer, face: THREE.CullFace): void {
  if (!usingWebGPU()) {
    renderer.state.setCullFace(face);
    return;
  }
  const backend = (renderer as unknown as { backend: { state?: WebGLStateLike } }).backend;
  backend.state?.setCullFace(face);
}

interface WebGLStateLike {
  setCullFace(face: THREE.CullFace): void;
}

/**
 * **Viewport und Schere von oben gezählt.** Der alte Renderer zählt sie wie
 * WebGL von unten, der neue wie WebGPU von oben (`WebGLBackend.updateViewport`
 * rechnet `height − h − y`). Der Ausschnitt einer Portalsicht wird von unten
 * gerechnet (`portalView.pixelRect`) und hier für den neuen umgeklappt.
 */
export function flipTargetRect(target: THREE.RenderTarget): void {
  const height = target.height;
  target.viewport.y = height - target.viewport.y - target.viewport.w;
  target.scissor.y = height - target.scissor.y - target.scissor.w;
}

/** Ob die Brille gerade mit Multiview zeichnet (nur der neue Renderer kann das). */
export function layeredEyes(xrCamera: THREE.ArrayCamera | null): boolean {
  return (xrCamera as { isMultiViewCamera?: boolean } | null)?.isMultiViewCamera === true;
}

/**
 * **Wie groß jede Ebene des Brillenbilds mit Multiview ist** — die des Ziels
 * der Brille, nicht die Viewports der Augen. three zeichnet mit Multiview
 * über das ganze Ziel (`_renderScene` nimmt dessen `viewport`, die Augen
 * kommen nicht vor). Auf der Quest ist beides dasselbe; die nachgestellte
 * Brille meldet für ihr Texturfeld aber die doppelte Breite. Schreibt die
 * Größe nach `target` und sagt, ob es so ist.
 */
export function layeredFrameSize(
  renderer: THREE.WebGLRenderer,
  xrCamera: THREE.ArrayCamera | null,
  target: THREE.Vector2,
): boolean {
  if (!layeredEyes(xrCamera)) return false;
  const output = (
    renderer as unknown as { getOutputRenderTarget?(): THREE.RenderTarget | null }
  ).getOutputRenderTarget?.();
  if (!output) return false;
  target.set(output.width, output.height);
  return true;
}

interface SavedEye {
  readonly world: THREE.Matrix4;
  readonly inverse: THREE.Matrix4;
  readonly projection: THREE.Matrix4;
  readonly projectionInverse: THREE.Matrix4;
  readonly viewport: THREE.Vector4;
  layers: number;
}

/**
 * **Die Brillenkamera geliehen** — für die Durchgänge in der Brille im neuen
 * Renderer.
 *
 * Der alte Renderer zeichnet eine Sicht mit einer **eigenen** `ArrayCamera`.
 * Der neue kann das nicht: Seine Kameramatrizen für mehrere Augen sind
 * **ein** gemeinsamer Knoten für alle Materialien (`accessors/Camera.js`,
 * `_cameraProjectionMatrixArray` und Geschwister), und der zeigt auf die
 * Matrizen der Kamera, mit der zuletzt **irgendein** Material übersetzt
 * wurde (`.array = matrices` beim Übersetzen, gelesen bei jedem Bild). Eine
 * zweite `ArrayCamera` lenkte ihn um, und das nächste Brillenbild stünde in
 * den Augen des Spiegels. Also wird die Kamera der Brille selbst benutzt:
 * ihre Augen bekommen für den Durchgang die Matrizen der Sicht, danach ihre
 * eigenen zurück — Lage, Projektion, Viewport und Ebenen, auch die der
 * Kamera selbst, aus deren Lage three die Lichter ins Auge rechnet
 * (`lightViewPosition`). Und solange sie geliehen ist, rechnet `render` ihre
 * Weltmatrix nicht nach (`matrixWorldAutoUpdate`): Sie hat keinen Elternteil
 * und verlöre sonst das Gestell.
 */
export class XrEyeLoan {
  camera: THREE.ArrayCamera | null = null;
  readonly world = new THREE.Matrix4();
  readonly inverse = new THREE.Matrix4();
  layers = 0;
  readonly eyes: SavedEye[] = [];
  private autoUpdate = true;

  borrow(camera: THREE.ArrayCamera): THREE.ArrayCamera {
    this.camera = camera;
    this.world.copy(camera.matrixWorld);
    this.inverse.copy(camera.matrixWorldInverse);
    this.layers = camera.layers.mask;
    this.autoUpdate = camera.matrixWorldAutoUpdate;
    camera.matrixWorldAutoUpdate = false;
    while (this.eyes.length < camera.cameras.length) {
      this.eyes.push({
        world: new THREE.Matrix4(),
        inverse: new THREE.Matrix4(),
        projection: new THREE.Matrix4(),
        projectionInverse: new THREE.Matrix4(),
        viewport: new THREE.Vector4(),
        layers: 0,
      });
    }
    camera.cameras.forEach((eye, i) => {
      const saved = this.eyes[i]!;
      saved.world.copy(eye.matrixWorld);
      saved.inverse.copy(eye.matrixWorldInverse);
      saved.projection.copy(eye.projectionMatrix);
      saved.projectionInverse.copy(eye.projectionMatrixInverse);
      if (eye.viewport) saved.viewport.copy(eye.viewport);
      saved.layers = eye.layers.mask;
    });
    return camera;
  }

  restore(): void {
    const camera = this.camera;
    if (!camera) return;
    this.camera = null;
    camera.matrixWorld.copy(this.world);
    camera.matrixWorldInverse.copy(this.inverse);
    camera.layers.mask = this.layers;
    camera.matrixWorldAutoUpdate = this.autoUpdate;
    camera.cameras.forEach((eye, i) => {
      const saved = this.eyes[i];
      if (!saved) return;
      eye.matrixWorld.copy(saved.world);
      eye.matrixWorldInverse.copy(saved.inverse);
      eye.projectionMatrix.copy(saved.projection);
      eye.projectionMatrixInverse.copy(saved.projectionInverse);
      eye.viewport?.copy(saved.viewport);
      eye.layers.mask = saved.layers;
    });
  }
}
