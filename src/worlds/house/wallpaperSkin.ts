import * as THREE from 'three';
import { WALLPAPER_SIZE, wallpaperById, wallpaperPixels } from './wallpaper';

/**
 * **Die Tapete auf einer Seite einer Wand** — gezeichnet auf dem Modell aus
 * dem Regal, nicht davor.
 *
 * Jedes Netz der Wand bekommt einen Zwilling seines Materials, der dort, wo
 * die Fläche zur **Vorderseite** zeigt, das Muster der einen Tapete zeichnet,
 * und dort, wo sie zur **Rückseite** zeigt, das der anderen. Kanten und die
 * Leibung einer Tür zeigen weder nach vorn noch nach hinten und bleiben, wie
 * sie sind — deshalb braucht eine Tür oder ein Fenster keine eigene Form: Die
 * Öffnung ist im Modell, und das Muster liegt nur auf dessen Flächen.
 *
 * Gemessen wird in der Welt: längs der Wand (`along`) und in der Höhe, in
 * Metern. So stoßen zwei Stücke derselben Tapete ohne Sprung aneinander.
 *
 * **Hervorheben** geht auf demselben Weg (`glow`): Mit einer Tapete in der
 * Hand leuchten genau die Seiten, die sie bekäme — und nicht die ganze Wand.
 */

/** Was eine Wand gerade trägt — und was davon leuchtet. */
export interface WallSkin {
  readonly front: string | null;
  readonly back: string | null;
  readonly glowFront: boolean;
  readonly glowBack: boolean;
}

export const BARE_WALL: WallSkin = { front: null, back: null, glowFront: false, glowBack: false };

/** Die Lage der Wand in der Welt: Mitte, Richtung längs, Richtung der Vorderseite. */
export interface WallFrame {
  readonly centre: THREE.Vector3;
  readonly along: THREE.Vector3;
  readonly front: THREE.Vector3;
}

/** Ob eine Wand gar nichts Eigenes trägt. */
export function isBare(skin: WallSkin): boolean {
  return !skin.front && !skin.back && !skin.glowFront && !skin.glowBack;
}

const textures = new Map<string, THREE.DataTexture>();

/** Das Muster als Textur — einmal je Tapete gebaut und geteilt. */
function wallpaperTexture(id: string): THREE.DataTexture {
  let texture = textures.get(id);
  if (!texture) {
    texture = new THREE.DataTexture(wallpaperPixels(id), WALLPAPER_SIZE, WALLPAPER_SIZE);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textures.set(id, texture);
  }
  return texture;
}

/** Ein leerer Platzhalter, damit der Shader immer zwei Texturen hat. */
let blank: THREE.DataTexture | null = null;
function blankTexture(): THREE.DataTexture {
  if (!blank) {
    blank = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    blank.needsUpdate = true;
  }
  return blank;
}

/** Das Pulsieren des Hervorhebens — ein Wert für alle Wände. */
const pulse = { value: 0 };

/** Je Bild einmal: das Hervorheben atmen lassen. */
export function stepWallpaperGlow(seconds: number): void {
  pulse.value = 0.55 + 0.45 * Math.sin(seconds * 4);
}

interface SkinUniforms {
  uWpFront: { value: THREE.Vector3 };
  uWpAlong: { value: THREE.Vector3 };
  uWpOrigin: { value: THREE.Vector3 };
  uWpMapF: { value: THREE.Texture };
  uWpMapB: { value: THREE.Texture };
  uWpHasF: { value: number };
  uWpHasB: { value: number };
  uWpRepF: { value: number };
  uWpRepB: { value: number };
  uWpGlowF: { value: number };
  uWpGlowB: { value: number };
  uWpPulse: { value: number };
}

interface SkinnedData {
  /** Netz → sein eigenes Material, zurückgelegt, solange es die Tapete trägt. */
  originals: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
  /** Die Uniforms je Zwilling — geändert wird hier, nicht am Shader. */
  uniforms: SkinUniforms[];
  twins: THREE.Material[];
}

const SKIN_KEY = 'wallpaperSkin';

function skinnedData(object: THREE.Object3D): SkinnedData | undefined {
  return (object.userData as Record<string, unknown>)[SKIN_KEY] as SkinnedData | undefined;
}

/** Der Zwilling eines Materials mit der Tapete im Shader. */
function twinOf(base: THREE.Material): { twin: THREE.Material; uniforms: SkinUniforms } | null {
  if (!(base instanceof THREE.MeshStandardMaterial)) return null;
  const twin = base.clone();
  const uniforms: SkinUniforms = {
    uWpFront: { value: new THREE.Vector3(0, 0, 1) },
    uWpAlong: { value: new THREE.Vector3(1, 0, 0) },
    uWpOrigin: { value: new THREE.Vector3() },
    uWpMapF: { value: blankTexture() },
    uWpMapB: { value: blankTexture() },
    uWpHasF: { value: 0 },
    uWpHasB: { value: 0 },
    uWpRepF: { value: 1 },
    uWpRepB: { value: 1 },
    uWpGlowF: { value: 0 },
    uWpGlowB: { value: 0 },
    uWpPulse: pulse,
  };
  twin.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vWpWorld;\nvarying vec3 vWpNormal;',
      )
      .replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          'vWpWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
          'vWpNormal = normalize(mat3(modelMatrix) * objectNormal);',
        ].join('\n'),
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        [
          '#include <common>',
          'varying vec3 vWpWorld;',
          'varying vec3 vWpNormal;',
          'uniform vec3 uWpFront;',
          'uniform vec3 uWpAlong;',
          'uniform vec3 uWpOrigin;',
          'uniform sampler2D uWpMapF;',
          'uniform sampler2D uWpMapB;',
          'uniform float uWpHasF;',
          'uniform float uWpHasB;',
          'uniform float uWpRepF;',
          'uniform float uWpRepB;',
          'uniform float uWpGlowF;',
          'uniform float uWpGlowB;',
          'uniform float uWpPulse;',
        ].join('\n'),
      )
      .replace(
        '#include <map_fragment>',
        [
          '#include <map_fragment>',
          'float wpGlow = 0.0;',
          '{',
          '  float wpSide = dot(normalize(vWpNormal), uWpFront);',
          '  vec3 wpRel = vWpWorld - uWpOrigin;',
          '  float wpAlong = dot(wpRel, uWpAlong);',
          '  if (wpSide > 0.6) {',
          '    if (uWpHasF > 0.5) diffuseColor.rgb = texture2D(uWpMapF, vec2(wpAlong, vWpWorld.y) / uWpRepF).rgb;',
          '    wpGlow = uWpGlowF;',
          '  } else if (wpSide < -0.6) {',
          '    if (uWpHasB > 0.5) diffuseColor.rgb = texture2D(uWpMapB, vec2(-wpAlong, vWpWorld.y) / uWpRepB).rgb;',
          '    wpGlow = uWpGlowB;',
          '  }',
          '}',
        ].join('\n'),
      )
      .replace(
        '#include <emissivemap_fragment>',
        [
          '#include <emissivemap_fragment>',
          'totalEmissiveRadiance += vec3(1.0, 0.8, 0.3) * (0.08 + 0.17 * uWpPulse) * wpGlow;',
        ].join('\n'),
      );
  };
  // Ein Programm für alle Wände: Was sich unterscheidet, steht in den Uniforms.
  twin.customProgramCacheKey = () => `${base.customProgramCacheKey()}|wallpaper-skin`;
  return { twin, uniforms };
}

/**
 * **Einer Wand eine Tapete geben** — oder, mit `BARE_WALL`, ihre eigenen
 * Materialien zurück.
 *
 * @returns ob die Wand jetzt Eigenes trägt (und darum für sich gezeichnet
 *   werden muss, `PortalWorld.looseWalls`)
 */
export function skinWall(object: THREE.Object3D, frame: WallFrame, skin: WallSkin): boolean {
  let data = skinnedData(object);
  if (isBare(skin)) {
    if (data) {
      for (const [mesh, material] of data.originals) mesh.material = material;
      for (const twin of data.twins) twin.dispose();
      delete (object.userData as Record<string, unknown>)[SKIN_KEY];
    }
    return false;
  }
  if (!data) {
    data = { originals: new Map(), uniforms: [], twins: [] };
    const made = new Map<THREE.Material, THREE.Material>();
    const found = data;
    object.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      const base = mesh.material;
      let twin = made.get(base);
      if (!twin) {
        const built = twinOf(base);
        if (!built) return;
        twin = built.twin;
        made.set(base, twin);
        found.twins.push(twin);
        found.uniforms.push(built.uniforms);
      }
      found.originals.set(mesh, base);
      mesh.material = twin;
    });
    (object.userData as Record<string, unknown>)[SKIN_KEY] = data;
  }
  const front = skin.front ? wallpaperById(skin.front) : null;
  const back = skin.back ? wallpaperById(skin.back) : null;
  for (const u of data.uniforms) {
    u.uWpFront.value.copy(frame.front);
    u.uWpAlong.value.copy(frame.along);
    u.uWpOrigin.value.copy(frame.centre);
    u.uWpMapF.value = front ? wallpaperTexture(front.id) : blankTexture();
    u.uWpMapB.value = back ? wallpaperTexture(back.id) : blankTexture();
    u.uWpHasF.value = front ? 1 : 0;
    u.uWpHasB.value = back ? 1 : 0;
    u.uWpRepF.value = front?.repeat ?? 1;
    u.uWpRepB.value = back?.repeat ?? 1;
    u.uWpGlowF.value = skin.glowFront ? 1 : 0;
    u.uWpGlowB.value = skin.glowBack ? 1 : 0;
  }
  return true;
}
