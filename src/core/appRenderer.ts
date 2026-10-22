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
