import * as THREE from 'three';
import type { WallOcclusion } from '../../core/graphicsSettings';

/**
 * **Wie eine Wand vor der Figur aussieht** — durchsichtig oder abgeschnitten
 * (`GraphicsSettings.wallOcclusion`, _Menü → Grafik → Wände vorn_).
 *
 * Welche Wände es trifft, rechnet `roomWalls.ts`; hier steht nur, was aus
 * ihrem Material wird. Zwei Fassungen:
 *
 * - `fade` — der durchsichtige Zwilling, den es immer gab (`modelGhost.ts`,
 *   `GridWorld.ghostFor`): gleiche Farbe, ein Viertel Deckkraft.
 * - `cut` — **Wall Cutaway** wie in den Sims: Alles über einem Sockel
 *   (`CUT_HEIGHT` über den Füßen) wird im Shader verworfen. Die Wand bleibt
 *   fest und schreibt in den Tiefenpuffer, es gibt also kein Sortieren wie bei
 *   Durchsichtigem.
 *
 * **Ohne Deckel.** Eine abgeschnittene Wand ist oben offen; von schräg oben
 * sieht man in sie hinein auf ihre Innenseiten. Deshalb zeichnet der Zwilling
 * auch die Rückseiten, und zwar dunkler — so liest sich die offene
 * Oberkante wie eine Schnittfläche, und kein zweites Netz ist nötig.
 *
 * Gerechnet wird in **Weltkoordinaten** über ein eigenes `varying`, nicht mit
 * den Schnittebenen des Renderers: Die müsste jede Welt erst freischalten
 * (`localClippingEnabled`), und die Portalwelt schaltet sie selbst um.
 */

/** Die beiden Arten, eine Wand aus dem Weg zu nehmen. */
export type WallLook = 'fade' | 'cut';

/** Welche Fassung zu einer Einstellung gehört. */
export function lookOfOcclusion(mode: WallOcclusion): WallLook {
  return mode === 'cutaway' ? 'cut' : 'fade';
}

/**
 * **Wie hoch der Sockel stehen bleibt**, in Metern über den Füßen. Knapp über
 * dem Knie des Wand-Ghostings (`GHOST_KNEE` 0,5 m) wäre zu viel — dann läse
 * sich die Wand noch als Wand; ein Drittel Meter ist die Fußleiste der Sims.
 */
export const CUT_HEIGHT = 0.35;

/** Wie hell die Innenseite einer aufgeschnittenen Wand ist — die Schnittfläche. */
const INSIDE_SHADE = 0.55;

/**
 * **Die Schnitthöhe, jedes Bild neu gesetzt** — geteilt von allen Zwillingen,
 * weil es immer nur eine Figur gibt, nach der geschnitten wird
 * (`GridWorld.stepWallGhosts`).
 */
export const WALL_CUT_UNIFORMS = {
  uWallCutY: { value: CUT_HEIGHT },
};

/** Die Schnitthöhe für dieses Bild: ein Sockel über den Füßen. */
export function aimWallCut(floorY: number): void {
  WALL_CUT_UNIFORMS.uWallCutY.value = floorY + CUT_HEIGHT;
}

/**
 * **Welche Fassung gerade gilt** — gesetzt von der Welt, gelesen von jedem
 * `ModelGhosts`. Ein Wert für alle, weil es nur eine Einstellung gibt; so
 * muss ihn nicht jede Wand aus dem Regal einzeln erfahren
 * (`haunting/world3d/stationWalls.ts`).
 */
let current: WallLook = 'fade';

export function wallLook(): WallLook {
  return current;
}

export function setWallLook(look: WallLook): void {
  current = look;
}

/**
 * **Der Zwilling eines Materials, der abschneidet.**
 *
 * Ein Klon und kein Umbau am Original, aus demselben Grund wie beim
 * durchsichtigen Zwilling: Das Original teilen sich viele Wände, und nur die
 * vor der Figur sollen es tragen. Ein eigenes `onBeforeCompile` des Originals
 * (die Tapete, `house/wallpaperSkin.ts`; die Stufen des Comics,
 * `core/materialLook.ts`) läuft zuerst, der Schnitt kommt danach dazu.
 */
export function wallCutTwin(material: THREE.Material): THREE.Material {
  const made = material.clone();
  made.side = THREE.DoubleSide;
  // Der Comic baut Materialien der Szene um (`materialLook.applyLook`) und
  // würde den Schnitt dabei überschreiben — dieser Zwilling bleibt draußen.
  made.userData['bgvrNoLook'] = true;
  const own = Object.prototype.hasOwnProperty.call(material, 'onBeforeCompile')
    ? material.onBeforeCompile.bind(material)
    : null;
  made.onBeforeCompile = (shader, renderer) => {
    own?.(shader, renderer);
    injectCut(shader);
  };
  made.customProgramCacheKey = () => `${material.customProgramCacheKey()}|wall-cut`;
  return made;
}

/** Der Shader-Umbau selbst — Weltposition hinüberreichen, dann verwerfen. */
export function injectCut(shader: THREE.WebGLProgramParametersWithUniforms): void {
  Object.assign(shader.uniforms, WALL_CUT_UNIFORMS);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWallCutPos;')
    .replace(
      '#include <project_vertex>',
      `#include <project_vertex>
vec4 wallCutPos = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  wallCutPos = batchingMatrix * wallCutPos;
#endif
#ifdef USE_INSTANCING
  wallCutPos = instanceMatrix * wallCutPos;
#endif
vWallCutPos = ( modelMatrix * wallCutPos ).xyz;`,
    );
  const test = 'if ( vWallCutPos.y > uWallCutY ) discard;';
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
varying vec3 vWallCutPos;
uniform float uWallCutY;`,
    )
    .replace('#include <clipping_planes_fragment>', `${test}\n#include <clipping_planes_fragment>`)
    .replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>\nif ( ! gl_FrontFacing ) gl_FragColor.rgb *= ${INSIDE_SHADE.toFixed(2)};`,
    );
}
