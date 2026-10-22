/**
 * **Den gewählten Renderer bauen** (`core/rendererKind.ts` sagt, welche es
 * gibt). Der neue wird erst nachgeladen, wenn er gewählt ist — ein eigener
 * Chunk, den niemand lädt, der WebGL fährt.
 */
import * as THREE from 'three';
import { graphics } from './graphicsSettings';
import { rendererFromUrl, type RendererKind } from './rendererKind';

/** Die Wahl für diesen Seitenaufruf: `?renderer=` in der Adresse vor der Einstellung. */
export function chosenRenderer(): RendererKind {
  const fromUrl = typeof location === 'undefined' ? null : rendererFromUrl(location.search);
  return fromUrl ?? graphics().renderer;
}

type WebGPUModule = typeof import('three/webgpu');
let webgpu: WebGPUModule | null = null;

/**
 * **Vor dem Bau der App**: den neuen Renderer nachladen, wenn er gewählt ist
 * (`main.startApp`). Ein eigener Chunk — wer WebGL fährt, lädt ihn nie.
 */
export async function prepareRenderer(kind: RendererKind): Promise<void> {
  if (kind === 'webgpu' && !webgpu) webgpu = await import('three/webgpu');
}

/** Welcher Renderer in diesem Seitenaufruf zeichnet. */
export function activeRenderer(): RendererKind {
  return active;
}

/** Ob gerade der neue Renderer zeichnet. */
export function usingWebGPU(): boolean {
  return active === 'webgpu';
}

let active: RendererKind = 'webgl';

/**
 * **Den Renderer bauen.** Der neue wird als `WebGLRenderer` weitergereicht —
 * er hat dieselbe Oberfläche für alles, was die App von ihm will (`render`,
 * `xr`, `setSize`, `shadowMap`, …); wo nicht, fragt die Stelle `usingWebGPU()`.
 */
export function createRenderer(
  kind: RendererKind,
  params: THREE.WebGLRendererParameters,
): THREE.WebGLRenderer {
  if (kind === 'webgpu' && webgpu) {
    active = 'webgpu';
    const renderer = new webgpu.WebGPURenderer({
      canvas: params.canvas as HTMLCanvasElement,
      antialias: params.antialias ?? false,
      alpha: params.alpha ?? false,
      powerPreference: params.powerPreference === 'low-power' ? 'low-power' : 'high-performance',
      forceWebGL: true,
      // `?multiview=0` zum Vergleichen: derselbe Renderer, jedes Auge einzeln.
      multiview: !/[?&]multiview=0\b/.test(location.search),
    });
    hideUnported(webgpu, renderer);
    void renderer.init().then(() => patchMultiview(renderer.backend));
    return renderer as unknown as THREE.WebGLRenderer;
  }
  active = 'webgl';
  return new THREE.WebGLRenderer(params);
}

/**
 * **Multiview mit Kantenglättung, auch ohne `OCULUS_multiview`.** three ruft
 * im XR-Bild `framebufferTextureMultisampleMultiviewOVR` an der Erweiterung
 * `OVR_multiview2` auf — die Funktion gehört aber zu `OCULUS_multiview`
 * (Quest). Fehlt sie (die nachgestellte Brille, `?xr=sim`), brach jedes Bild
 * ab. Dann leiht sie sich `OCULUS_multiview`, wenn es da ist, sonst wird ohne
 * Kantenglättung angehängt.
 */
function patchMultiview(backend: unknown): void {
  const gl = (backend as { gl?: WebGL2RenderingContext }).gl;
  if (!gl) return;
  type Multiview = {
    framebufferTextureMultiviewOVR?: (
      ...args: number[] | [number, number, WebGLTexture | null, number, number, number]
    ) => void;
    framebufferTextureMultisampleMultiviewOVR?: (...args: unknown[]) => void;
  };
  const ovr = gl.getExtension('OVR_multiview2') as Multiview | null;
  if (!ovr || ovr.framebufferTextureMultisampleMultiviewOVR) return;
  const oculus = gl.getExtension('OCULUS_multiview') as Multiview | null;
  ovr.framebufferTextureMultisampleMultiviewOVR =
    oculus?.framebufferTextureMultisampleMultiviewOVR?.bind(oculus) ??
    ((target, attachment, texture, level, _samples, base, views) =>
      (ovr.framebufferTextureMultiviewOVR as (...a: unknown[]) => void)(
        target,
        attachment,
        texture,
        level,
        base,
        views,
      ));
}

/**
 * **Die Bausteine des neuen Renderers** — Knotenmaterialien und TSL, für die
 * Stellen, die ein eigenes `ShaderMaterial` haben und es dort ersetzen
 * (`core/nodeLooks.ts`). `null`, solange WebGL zeichnet.
 */
export function webgpuModule(): WebGPUModule | null {
  return active === 'webgpu' ? webgpu : null;
}

/**
 * **Zeichenaufrufe und Dreiecke dieses Bildes** — für das Schild und die
 * Bildrate (`FrameStats`). Der neue Renderer zählt in `render.calls` die
 * Aufrufe von `render()`; die Zeichenaufrufe stehen bei ihm in `drawCalls`.
 */
export function drawStats(renderer: THREE.WebGLRenderer): { calls: number; triangles: number } {
  const render = renderer.info.render as typeof renderer.info.render & { drawCalls?: number };
  if (active === 'webgpu') return { calls: render.drawCalls ?? 0, triangles: render.triangles };
  return render;
}

/**
 * **Die Ebenen der Kamera auch in der Brille** — der alte Renderer reicht
 * `camera.layers` an die beiden Augen weiter (`WebXRManager`: „inherit camera
 * layers"), der neue nicht. Ohne das fehlte in der Brille alles, was nur auf
 * einer eigenen Ebene liegt — allen voran der Helm um den Blick
 * (`core/selfHelmet.ts`, `LAYER_EYE`). Ebene 1 und 2 sind wie im alten das
 * linke und das rechte Auge.
 */
export function syncXrLayers(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void {
  if (active !== 'webgpu') return;
  const xr = renderer.xr.getCamera();
  const mask = camera.layers.mask | 0b110;
  // Jedes Bild alle drei: Die Augen gibt es erst nach dem ersten Bild der Sitzung.
  xr.layers.mask = mask;
  const [left, right] = xr.cameras;
  if (left) left.layers.mask = mask & ~0b100;
  if (right) right.layers.mask = mask & ~0b010;
}

/**
 * **Was er nicht zeichnen kann, zeichnet er gar nicht.** Ein `ShaderMaterial`,
 * für das es noch keine Fassung als Knotenmaterial gibt (`core/nodeLooks.ts`),
 * meldete der neue Renderer als „not compatible" und zeichnete es dann mit
 * einem leeren Ersatz — schwarz. Die Windspur in Hexland lag so als schwarzer
 * Balken über dem Brett. Jetzt wird es mit einem Ersatz übersetzt, der weder
 * Farbe noch Tiefe schreibt: Es fehlt, statt falsch dazustehen.
 */
function hideUnported(
  gpu: WebGPUModule,
  renderer: InstanceType<WebGPUModule['WebGPURenderer']>,
): void {
  type Builder = Parameters<InstanceType<WebGPUModule['MeshBasicNodeMaterial']>['setup']>[0];
  class Unported extends gpu.MeshBasicNodeMaterial {
    override setup(builder: Builder): void {
      // Nach dem Abschreiben der Felder des alten Materials (`NodeLibrary.fromMaterial`).
      this.colorWrite = false;
      this.depthWrite = false;
      super.setup(builder);
    }
  }
  // In den Typen fehlt `addMaterial`; in `NodeLibrary` steht es.
  const library = renderer.library as unknown as {
    addMaterial(material: typeof Unported, type: string): void;
  };
  library.addMaterial(Unported, 'ShaderMaterial');
  library.addMaterial(Unported, 'RawShaderMaterial');
}
