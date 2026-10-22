import * as THREE from 'three';
import type * as WebGPU from 'three/webgpu';
import { webgpuModule } from './appRenderer';
import { asShaderMaterial } from './nodeLooks';

/**
 * **Bilder in eigene Ziele, im neuen Renderer** — die Unschärfe von oben und
 * das Wetter (`core/levelBlur.ts`) und die Kamerabilder der Drohne und des
 * Zielfernrohrs (`portal/tools`).
 *
 * Zwei Dinge fehlten dem neuen Renderer (_Grafik → Renderer: Multiview_,
 * `core/appRenderer.ts`) dafür:
 *
 * 1. **Ein eigenes Ziel braucht eigene Shader.** Tonemapping und sRGB rechnet
 *    dort jedes Knotenmaterial selbst an seine Ausgabe, wenn es ins Bild
 *    zeichnet, und gar nicht, wenn es in ein eigenes Ziel zeichnet
 *    (`appRenderer.inlineOutput`) — entschieden beim Übersetzen. Übersetzt
 *    wird aber einmal je Material und Umgebung, und „ins Bild oder ins Ziel"
 *    gehört bei three nicht zur Umgebung (es kannte den Unterschied im
 *    Material nie). Ein Material, das schon im Bild stand, zeichnete im Ziel
 *    also mit Tonemapping und sRGB — das Bild der Drohne war blass, die
 *    Unschärfe von oben doppelt getönt —, und umgekehrt. `intoTarget`
 *    tauscht deshalb für die Dauer des Zeichnens den Zusammenhang des
 *    Renderers (`renderer.contextNode`) gegen einen eigenen: Sein Kennzeichen
 *    geht in den Schlüssel jedes Übersetzens ein, und so bekommt jedes
 *    Material fürs Ziel seinen eigenen Shader. three selbst macht es für
 *    seine Quad-Ebenen genauso (`XRManager.renderLayers`).
 * 2. **Der Durchgang über das fertige Bild** war ein `ShaderMaterial` — hier
 *    dieselbe Rechnung als Knotenmaterial (`levelBlurNodeMaterial`).
 */

/** Der Zusammenhang des Renderers, soweit er hier gebraucht wird (`ContextNode`). */
interface ContextNode {
  context(values: object): ContextNode;
}
type Renderer = { contextNode: ContextNode };
interface OutputTarget {
  getOutputRenderTarget(): object | null;
  setOutputRenderTarget(target: object | null): void;
}

/** Je Zusammenhang des Renderers der fürs eigene Ziel — einmal gebaut, immer derselbe. */
const targetContexts = new WeakMap<object, ContextNode>();
const nothing = (): void => {};

/**
 * **Ab hier in ein eigenes Ziel** — gibt zurück, was danach wieder umstellt.
 * Unter WebGL tut es nichts. Gerufen um jedes `setRenderTarget(ziel)` …
 * `render` … `setRenderTarget(vorher)`, das ein Bild für die Szene zeichnet.
 */
export function intoTarget(renderer: THREE.WebGLRenderer): () => void {
  const gpu = webgpuModule();
  if (!gpu) return nothing;
  const r = renderer as unknown as Renderer;
  const before = r.contextNode;
  let mine = targetContexts.get(before);
  if (!mine) {
    // Ein leerer Zusammenhang über dem bisherigen: dieselben Werte, ein neues Kennzeichen.
    mine = before.context({});
    targetContexts.set(before, mine);
    // Und er selbst ist schon einer fürs Ziel — zweimal hinein bleibt drin.
    targetContexts.set(mine, mine);
  }
  r.contextNode = mine;
  // **In der Brille mit Multiview** übersetzte er sonst auch fürs eigene Ziel
  // mit beiden Augen in einem Aufruf (`NodeManager`: Multiview, wenn das
  // Ausgabeziel der Brille es ist) — in ein Ziel mit nur einer Ebene. Solange
  // ins eigene Ziel gezeichnet wird, gibt es deshalb kein Ausgabeziel.
  const output = renderer as unknown as OutputTarget;
  const xrTarget = output.getOutputRenderTarget();
  if (xrTarget !== null) output.setOutputRenderTarget(null);
  return () => {
    r.contextNode = before;
    if (xrTarget !== null) output.setOutputRenderTarget(xrTarget);
  };
}

/**
 * **Das Bild aus einem eigenen Ziel richtig herum** — der neue Renderer liest
 * ein eigenes Ziel beim Abtasten kopfstehend (`TextureNode`, `isFlipY`: so
 * legt es WebGPU ab). Für eine Fläche, die ein Kamerabild zeigt (Drohne,
 * Zielfernrohr), werden deshalb ihre Texturkoordinaten einmal umgedreht.
 * Unter WebGL bleibt sie, wie sie ist.
 */
export function showsTarget<T extends THREE.BufferGeometry>(geometry: T): T {
  if (!webgpuModule()) return geometry;
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  uv.needsUpdate = true;
  return geometry;
}

/** Die festen Zahlen der Unschärfe (`core/levelBlur.ts`) — hier hineingereicht, um keinen Kreis zu bauen. */
export interface LevelBlurConstants {
  start: number;
  full: number;
  aboveStart: number;
  aboveFull: number;
  taps: number;
}

type Uniforms = Record<string, { value: unknown }>;

/**
 * **Unschärfe und Wetter als Knotenmaterial** — Zeile für Zeile der Shader aus
 * `core/levelBlur.ts`, mit denselben Namen in `uniforms`. Ins Bild gezeichnet
 * hängt `appRenderer.inlineOutput` Tonemapping und sRGB an, wie unter WebGL
 * `tonemapping_fragment` und `colorspace_fragment`.
 */
export function levelBlurNodeMaterial(
  color: THREE.Texture,
  depth: THREE.DepthTexture,
  c: LevelBlurConstants,
): THREE.ShaderMaterial | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const { TSL } = gpu;
  const tColor = TSL.texture(color);
  const tDepth = TSL.texture(depth);
  const projectionInverse = TSL.uniform(new THREE.Matrix4());
  const cameraWorld = TSL.uniform(new THREE.Matrix4());
  const floorY = TSL.uniform(0);
  const aboveY = TSL.uniform(0);
  const below = TSL.uniform(0);
  const above = TSL.uniform(0);
  const radius = TSL.uniform(new THREE.Vector2());
  const weather = TSL.uniform(0);
  const wLight = TSL.uniform(new THREE.Vector3(1, 1, 1));
  const wKeepBright = TSL.uniform(0);
  const wFogColor = TSL.uniform(new THREE.Vector3());
  const wFogStrength = TSL.uniform(0);
  const wFogSwirl = TSL.uniform(0);
  const wFogShape = TSL.uniform(new THREE.Vector4(5, 20, 1.6, 0.15));
  const wSaturation = TSL.uniform(1);
  const wContrast = TSL.uniform(1);
  const wTint = TSL.uniform(new THREE.Vector3(1, 1, 1));
  const wVignette = TSL.uniform(0);
  const wTime = TSL.uniform(0);
  const wPlayer = TSL.uniform(new THREE.Vector3());

  type Vec2 = WebGPU.Node<'vec2'>;
  type Vec3 = WebGPU.Node<'vec3'>;
  type Float = WebGPU.Node<'float'>;
  const luma = TSL.vec3(0.2126, 0.7152, 0.0722);
  // **Ein eigenes Ziel liest der neue Renderer kopfstehend** — er dreht beim
  // Abtasten jedes Ziel um (`TextureNode`, `isFlipY`), weil WebGPU es so
  // ablegt. Gerechnet wird hier mit der Lage unter WebGL (unten links 0, 0);
  // gelesen wird umgedreht, und die Drehung des Renderers hebt es wieder auf.
  const depthAt = (uv: Vec2): Float => tDepth.sample(TSL.vec2(uv.x, uv.y.oneMinus())).x;
  const colorAt = (uv: Vec2) => tColor.sample(TSL.vec2(uv.x, uv.y.oneMinus()));

  const worldAt = (uv: Vec2, d: Float): Vec3 => {
    const clip = TSL.vec4(uv.mul(2).sub(1), d.mul(2).sub(1), 1);
    const view = projectionInverse.mul(clip);
    return cameraWorld.mul(TSL.vec4(view.xyz.div(view.w), 1)).xyz;
  };
  const hash = (p: Vec2): Float =>
    TSL.fract(TSL.sin(TSL.dot(p, TSL.vec2(127.1, 311.7))).mul(43758.5453));
  const noise = (p: Vec2): Float => {
    const i = TSL.floor(p);
    const f = TSL.fract(p);
    const u = f.mul(f).mul(TSL.vec2(3).sub(f.mul(2)));
    return TSL.mix(
      TSL.mix(hash(i), hash(i.add(TSL.vec2(1, 0))), u.x),
      TSL.mix(hash(i.add(TSL.vec2(0, 1))), hash(i.add(TSL.vec2(1, 1))), u.x),
      u.y,
    );
  };
  // Zwei Lagen Rauschen, die gegeneinander ziehen: Schwaden statt Fläche.
  const swirl = (p: Vec2): Float => {
    const a = noise(p.mul(0.18).add(TSL.vec2(wTime.mul(0.05), wTime.mul(0.02))));
    const b = noise(p.mul(0.41).sub(TSL.vec2(wTime.mul(0.03), wTime.mul(-0.06))));
    return a.mul(0.65).add(b.mul(0.35));
  };

  const applyWeather = (input: Vec3, uv: Vec2): Vec3 => {
    const color = TSL.vec3(input).toVar();
    // Tageszeit: abdunkeln und färben, was nicht selbst leuchtet.
    const lum = TSL.dot(color, luma);
    const keep = wKeepBright.mul(TSL.smoothstep(0.75, 2.2, lum));
    color.mulAssign(TSL.mix(wLight, TSL.vec3(1), keep));
    // Nebel: liegt unten, reißt um die Figur herum auf, wabert.
    TSL.If(wFogStrength.greaterThan(0), () => {
      const d = depthAt(uv);
      const amount = TSL.float(0).toVar();
      TSL.If(d.greaterThanEqual(0.99999), () => {
        amount.assign(wFogStrength.mul(TSL.mix(0.85, 1, wFogShape.w)));
      }).Else(() => {
        const p = worldAt(uv, d).toVar();
        const lying = TSL.exp(TSL.max(0, p.y.sub(wPlayer.y)).negate().div(wFogShape.z));
        const away = TSL.smoothstep(wFogShape.x, wFogShape.y, TSL.distance(p.xz, wPlayer.xz));
        const s = TSL.mix(1, TSL.smoothstep(0.2, 0.8, swirl(p.xz)).mul(1.5), wFogSwirl);
        amount.assign(wFogStrength.mul(away).mul(TSL.clamp(lying.mul(s).add(wFogShape.w), 0, 1)));
      });
      color.assign(TSL.mix(color, wFogColor, TSL.clamp(amount, 0, 1)));
    });
    // Filter: Sättigung, Kontrast (um ein mittleres Grau), Tönung.
    const grey = TSL.dot(color, luma);
    color.assign(TSL.mix(TSL.vec3(grey), color, wSaturation));
    color.assign(TSL.max(TSL.vec3(0), color.sub(0.18).mul(wContrast).add(0.18)));
    color.mulAssign(wTint);
    // Vignette: die Ecken dunkler, rund nach Bildhöhe.
    const dv = uv.sub(0.5).mul(TSL.vec2(radius.y.div(radius.x), 1));
    const v = TSL.smoothstep(0.35, 0.95, TSL.length(dv));
    return color.mul(TSL.float(1).sub(wVignette.mul(v)));
  };

  const blurAt = (uv: Vec2): Float => {
    const y = worldAt(uv, depthAt(uv)).y;
    const down = below.mul(TSL.smoothstep(c.start, c.full, floorY.sub(y)));
    const up = above.mul(TSL.smoothstep(c.aboveStart, c.aboveFull, y.sub(aboveY)));
    return TSL.max(down, up);
  };

  const main = TSL.Fn(() => {
    const vUv = TSL.uv();
    const center = colorAt(vUv).toVar();
    const amount = TSL.float(0).toVar();
    TSL.If(below.add(above).greaterThan(0), () => {
      amount.assign(blurAt(vUv));
    });
    const rgb = center.rgb.toVar();
    TSL.If(amount.greaterThan(0.01), () => {
      const sum = center.rgb.toVar();
      const weight = TSL.float(1).toVar();
      // Eine Scheibe im goldenen Winkel: gleichmäßig verteilt, ohne Muster.
      TSL.Loop(c.taps, ({ i }) => {
        const fi = TSL.float(i);
        const f = fi.add(0.5).div(c.taps);
        const a = fi.mul(2.39996323);
        const uv = vUv.add(
          TSL.vec2(TSL.cos(a), TSL.sin(a)).mul(TSL.sqrt(f)).mul(radius).mul(amount),
        );
        const w = blurAt(uv).toVar();
        sum.addAssign(colorAt(uv).rgb.mul(w));
        weight.addAssign(w);
      });
      rgb.assign(sum.div(weight));
    });
    TSL.If(weather.greaterThan(0), () => {
      rgb.assign(applyWeather(rgb, vUv));
    });
    return TSL.vec4(rgb, center.a);
  });

  const material = new gpu.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false });
  material.vertexNode = TSL.vec4(TSL.positionGeometry.xy, 0, 1);
  material.colorNode = main();
  material.fog = false;
  const uniforms: Uniforms = {
    tColor,
    tDepth,
    projectionInverse,
    cameraWorld,
    floorY,
    aboveY,
    below,
    above,
    radius,
    weather,
    wLight,
    wKeepBright,
    wFogColor,
    wFogStrength,
    wFogSwirl,
    wFogShape,
    wSaturation,
    wContrast,
    wTint,
    wVignette,
    wTime,
    wPlayer,
  };
  return asShaderMaterial(material as unknown as WebGPU.NodeMaterial, uniforms);
}
