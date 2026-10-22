/**
 * **Welcher Renderer zeichnet** — der bewährte `WebGLRenderer` oder der
 * `WebGPURenderer` von three im WebGL-2-Betrieb, der in der Brille
 * **Multiview** kann: beide Augen in einem Zeichenaufruf statt in zweien.
 * Gewünscht: _„Kannst du in Einstellungen es Einbauen dass ich wechseln kann
 * dazwischen"_ (nach der Schätzung, dass Multiview Haunting 3–5 ms je Bild
 * sparen könnte).
 *
 * Der neue Renderer ist ein **Versuch**: Er kennt kein `ShaderMaterial` und
 * kein `onBeforeCompile`; was davon lebt, sieht dort einfacher aus oder fehlt.
 * Gewechselt wird beim Neuladen der Seite — ein Renderer lässt sich nicht im
 * laufenden Bild austauschen.
 *
 * Woher die Wahl kommt: `?renderer=webgpu|webgl` in der Adresse gewinnt, sonst
 * gilt die Einstellung (`GraphicsSettings.renderer`).
 */
export type RendererKind = 'webgl' | 'webgpu';

export const RENDERER_KINDS = ['webgl', 'webgpu'] as const;

export const RENDERER_LABELS: Readonly<Record<RendererKind, string>> = {
  webgl: 'WebGL (bewährt)',
  webgpu: 'Multiview (Versuch)',
};

/** Kurz, für die Zusammenfassung unter _Grafik_ (`graphicsSummary`). */
export const RENDERER_SHORT: Readonly<Record<RendererKind, string>> = {
  webgl: 'WebGL',
  webgpu: 'Multiview (Versuch)',
};

export const RENDERER_SUBS: Readonly<Record<RendererKind, string>> = {
  webgl: 'Der Renderer, mit dem alles gebaut ist · jedes Auge einzeln',
  webgpu: 'three WebGPURenderer über WebGL 2 · beide Augen in einem Aufruf · lädt die Seite neu',
};

export function readRendererKind(raw: unknown): RendererKind {
  return raw === 'webgpu' ? 'webgpu' : 'webgl';
}

/** Die Wahl aus der Adresse, wenn dort eine steht — sie gewinnt über die Einstellung. */
export function rendererFromUrl(search: string): RendererKind | null {
  const raw = new URLSearchParams(search).get('renderer');
  return raw === 'webgpu' || raw === 'webgl' ? raw : null;
}
