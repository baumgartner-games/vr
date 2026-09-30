import * as THREE from 'three';
import type { WallOcclusion } from '../../core/graphicsSettings';

/**
 * **Wie eine Wand vor der Figur aussieht** — durchsichtig, abgeschnitten oder
 * mit einem Loch (`GraphicsSettings.wallOcclusion`, _Menü → Grafik → Wände
 * vorn_).
 *
 * Welche Wände es trifft, rechnet `wallGhost.ts`; hier steht nur, was aus
 * ihrem Material wird. Drei Fassungen:
 *
 * - `fade` — der durchsichtige Zwilling, den es immer gab (`modelGhost.ts`,
 *   `GridWorld.ghostFor`): gleiche Farbe, ein Viertel Deckkraft.
 * - `cut` — **Wall Cutaway** wie in den Sims: Alles über einem Sockel
 *   (`CUT_HEIGHT` über den Füßen) wird im Shader verworfen. Die Wand bleibt
 *   fest und schreibt in den Tiefenpuffer, es gibt also kein Sortieren wie bei
 *   Durchsichtigem.
 * - `hole` — **See-through Circle**: verworfen wird, was näher als
 *   `HOLE_RADIUS` an der Sichtlinie von der Kamera zur Figur liegt, und nur
 *   **vor** ihr. Der Rest der Wand steht.
 *
 * **Ohne Deckel.** Eine abgeschnittene Wand ist oben offen; von schräg oben
 * sieht man in sie hinein auf ihre Innenseiten. Deshalb zeichnen beide
 * Zwillinge auch die Rückseiten, und zwar dunkler — so liest sich die offene
 * Oberkante wie eine Schnittfläche, und kein zweites Netz ist nötig.
 *
 * Gerechnet wird in **Weltkoordinaten** über ein eigenes `varying`, nicht mit
 * den Schnittebenen des Renderers: Die müsste jede Welt erst freischalten
 * (`localClippingEnabled`), und die Portalwelt schaltet sie selbst um.
 */

/** Die drei Arten, eine Wand aus dem Weg zu nehmen. */
export type WallLook = 'fade' | 'cut' | 'hole';

/** Welche Fassung zu einer Einstellung gehört. */
export function lookOfOcclusion(mode: WallOcclusion): WallLook {
  if (mode === 'cutaway') return 'cut';
  if (mode === 'hole') return 'hole';
  return 'fade';
}

/**
 * **Wie hoch der Sockel stehen bleibt**, in Metern über den Füßen. Knapp über
 * dem Knie des Wand-Ghostings (`GHOST_KNEE` 0,5 m) wäre zu viel — dann läse
 * sich die Wand noch als Wand; ein Drittel Meter ist die Fußleiste der Sims.
 */
export const CUT_HEIGHT = 0.35;

/**
 * **Wie weit das Loch ist**, in Metern um die Sichtlinie. Eine Figur ist gut
 * einen halben Meter breit und anderthalb hoch; 1,1 m lässt sie ganz frei
 * und dazu einen Rand, in dem man sieht, wohin sie läuft.
 */
export const HOLE_RADIUS = 1.1;

/** Wie hell die Innenseite einer aufgeschnittenen Wand ist — die Schnittfläche. */
const INSIDE_SHADE = 0.55;

/**
 * **Die Werte, die jedes Bild neu gesetzt werden** — geteilt von allen
 * Zwillingen, weil es immer nur eine Figur und eine Kamera gibt, nach denen
 * geschnitten wird (`GridWorld.stepWallGhosts`).
 */
export const WALL_CUT_UNIFORMS = {
  uWallCutY: { value: CUT_HEIGHT },
  uWallHoleEye: { value: new THREE.Vector3() },
  uWallHoleAim: { value: new THREE.Vector3() },
  uWallHoleRadius: { value: HOLE_RADIUS },
};

/** Schnitthöhe und Sichtlinie für dieses Bild. */
export function aimWallCut(floorY: number, eye: THREE.Vector3Like, aim: THREE.Vector3Like): void {
  WALL_CUT_UNIFORMS.uWallCutY.value = floorY + CUT_HEIGHT;
  WALL_CUT_UNIFORMS.uWallHoleEye.value.copy(eye);
  WALL_CUT_UNIFORMS.uWallHoleAim.value.copy(aim);
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
 * **Der Zwilling eines Materials, der abschneidet oder ein Loch hat.**
 *
 * Ein Klon und kein Umbau am Original, aus demselben Grund wie beim
 * durchsichtigen Zwilling: Das Original teilen sich viele Wände, und nur die
 * vor der Figur sollen es tragen. Ein eigenes `onBeforeCompile` des Originals
 * (die Tapete, `house/wallpaperSkin.ts`; die Stufen des Comics,
 * `core/materialLook.ts`) läuft zuerst, der Schnitt kommt danach dazu.
 */
export function wallCutTwin(material: THREE.Material, look: 'cut' | 'hole'): THREE.Material {
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
    injectCut(shader, look);
  };
  made.customProgramCacheKey = () => `${material.customProgramCacheKey()}|wall-${look}`;
  return made;
}

/** Der Shader-Umbau selbst — Weltposition hinüberreichen, dann verwerfen. */
export function injectCut(shader: THREE.WebGLProgramParametersWithUniforms, look: WallLook): void {
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
  const test =
    look === 'cut'
      ? 'if ( vWallCutPos.y > uWallCutY ) discard;'
      : `{
  vec3 wallAxis = uWallHoleAim - uWallHoleEye;
  float wallT = dot( vWallCutPos - uWallHoleEye, wallAxis ) / max( dot( wallAxis, wallAxis ), 1e-6 );
  vec3 wallNear = uWallHoleEye + wallAxis * clamp( wallT, 0.0, 1.0 );
  if ( wallT < 1.0 && distance( vWallCutPos, wallNear ) < uWallHoleRadius ) discard;
}`;
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
varying vec3 vWallCutPos;
uniform float uWallCutY;
uniform vec3 uWallHoleEye;
uniform vec3 uWallHoleAim;
uniform float uWallHoleRadius;`,
    )
    .replace('#include <clipping_planes_fragment>', `${test}\n#include <clipping_planes_fragment>`)
    .replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>\nif ( ! gl_FrontFacing ) gl_FragColor.rgb *= ${INSIDE_SHADE.toFixed(2)};`,
    );
}
