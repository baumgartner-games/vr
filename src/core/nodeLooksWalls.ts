import * as THREE from 'three';
import type * as WebGPU from 'three/webgpu';
import { webgpuModule } from './appRenderer';
import { asShaderMaterial } from './nodeLooks';

/**
 * **Wände, Tapete und Tor noch einmal, für den neuen Renderer** — wie
 * `core/nodeLooks.ts`, nur für die Stellen, die unter WebGL mit
 * `onBeforeCompile` in den Shader des Regals greifen (Tapete, Wandschnitt)
 * oder ein eigenes `ShaderMaterial` haben (die Torscheibe im Hub).
 *
 * Der `WebGPURenderer` übergeht `onBeforeCompile` stillschweigend: Eine Wand
 * mit Tapete stand dort nackt da, eine abgeschnittene Wand ganz. Hier steht
 * dieselbe Rechnung als Knoten am Knotenmaterial (`colorNode`,
 * `emissiveNode`, `maskNode`, `outputNode`).
 *
 * Jede Funktion gibt `null` zurück, solange WebGL zeichnet; dann baut die
 * Stelle ihren Zwilling wie immer.
 */

type Gpu = NonNullable<ReturnType<typeof webgpuModule>>;

/**
 * **Ein Material des Regals als Knotenmaterial** — genau so, wie der neue
 * Renderer es selbst täte (`NodeLibrary.fromMaterial`: die passende Klasse,
 * jedes Feld hinübergeschrieben). So sieht eine Wand mit Tapete oder Schnitt
 * im Übrigen aus wie ihre Nachbarin ohne. Ein Knotenmaterial (die Tapete, die
 * danach geschnitten wird) wird geklont; seine Knoten teilt der Klon, und
 * damit auch die Uniforms, die die Tapete weiter setzt.
 */
function toNodeMaterial(gpu: Gpu, material: THREE.Material): WebGPU.NodeMaterial | null {
  if ((material as { isNodeMaterial?: boolean }).isNodeMaterial) {
    return (material as unknown as WebGPU.NodeMaterial).clone();
  }
  const name = material.type.replace(/Material$/, 'NodeMaterial');
  const Made = (gpu as unknown as Record<string, unknown>)[name];
  if (typeof Made !== 'function') return null;
  const made = new (Made as new () => WebGPU.NodeMaterial)();
  // Ein Klon als Quelle: eigene `uuid`, das Original bleibt unberührt.
  const source = material.clone() as unknown as Record<string, unknown>;
  const target = made as unknown as Record<string, unknown>;
  for (const key in source) target[key] = source[key];
  return made;
}

/** Was `house/wallpaperSkin.ts` je Zwilling setzt — dieselben Namen wie im Shader. */
export interface WallpaperNodeUniforms {
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

/**
 * Der Platzhalter der Tapete, **als sRGB**: Der neue Renderer entscheidet beim
 * Übersetzen nach der Textur, die gerade im Knoten steckt, ob er umrechnet —
 * steckte dort ein linearer Platzhalter, käme jede Tapete danach zu hell.
 */
let blankSrgb: THREE.DataTexture | null = null;
function blankWallpaper(): THREE.DataTexture {
  if (!blankSrgb) {
    blankSrgb = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    blankSrgb.colorSpace = THREE.SRGBColorSpace;
    blankSrgb.needsUpdate = true;
  }
  return blankSrgb;
}

/**
 * **Der Zwilling einer Wand mit der Tapete** (`house/wallpaperSkin.twinOf`) —
 * vorn das eine Muster, hinten das andere, Kanten und Leibungen wie im Regal,
 * und das Leuchten der Seiten, die die Tapete in der Hand bekäme.
 *
 * `pulse` ist das eine Atmen für alle Wände; gelesen wird es je Bild.
 */
export function wallpaperNodeTwin(
  base: THREE.MeshStandardMaterial,
  pulse: { value: number },
): { twin: THREE.Material; uniforms: WallpaperNodeUniforms } | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const twin = toNodeMaterial(gpu, base);
  if (!twin) return null;
  const { TSL } = gpu;
  const uWpFront = TSL.uniform(new THREE.Vector3(0, 0, 1));
  const uWpAlong = TSL.uniform(new THREE.Vector3(1, 0, 0));
  const uWpOrigin = TSL.uniform(new THREE.Vector3());
  const uWpMapF = TSL.texture(blankWallpaper());
  const uWpMapB = TSL.texture(blankWallpaper());
  const uWpHasF = TSL.uniform(0);
  const uWpHasB = TSL.uniform(0);
  const uWpRepF = TSL.uniform(1);
  const uWpRepB = TSL.uniform(1);
  const uWpGlowF = TSL.uniform(0);
  const uWpGlowB = TSL.uniform(0);
  const uWpPulse = TSL.uniform(pulse.value).onRenderUpdate(() => pulse.value);

  // Wie unter WebGL: Weltlage und Weltnormale der Ecke, im Bild verteilt.
  const world = TSL.positionWorld;
  const normal = TSL.varying(TSL.modelWorldMatrix.mul(TSL.vec4(TSL.normalLocal, 0)).xyz);
  const side = TSL.dot(TSL.normalize(normal), uWpFront);
  const along = TSL.dot(world.sub(uWpOrigin), uWpAlong);
  const isFront = side.greaterThan(0.6);
  const isBack = side.lessThan(-0.6);
  // Wie `setupDiffuseColor`: Farbe mal Textur des Regals, als vec4.
  const own = TSL.vec4(TSL.materialColor as unknown as WebGPU.Node<'vec4'>);
  const paperF = uWpMapF.sample(TSL.vec2(along, world.y).div(uWpRepF)).rgb;
  const paperB = uWpMapB.sample(TSL.vec2(along.negate(), world.y).div(uWpRepB)).rgb;
  const rgb = TSL.select(
    isFront.and(uWpHasF.greaterThan(0.5)),
    paperF,
    TSL.select(isBack.and(uWpHasB.greaterThan(0.5)), paperB, own.rgb),
  );
  twin.colorNode = TSL.vec4(rgb, own.a);
  const glow = TSL.select(isFront, uWpGlowF, TSL.select(isBack, uWpGlowB, 0));
  (twin as WebGPU.MeshStandardNodeMaterial).emissiveNode = TSL.materialEmissive.add(
    TSL.vec3(1, 0.8, 0.3).mul(uWpPulse.mul(0.17).add(0.08)).mul(glow),
  );
  const uniforms = {
    uWpFront,
    uWpAlong,
    uWpOrigin,
    uWpMapF,
    uWpMapB,
    uWpHasF,
    uWpHasB,
    uWpRepF,
    uWpRepB,
    uWpGlowF,
    uWpGlowB,
    uWpPulse,
  } as unknown as WallpaperNodeUniforms;
  return { twin: twin as unknown as THREE.Material, uniforms };
}

/** Die Schnitthöhe als Knoten — einer für alle Zwillinge, wie das Uniform unter WebGL. */
let cutY: ReturnType<typeof cutUniform> | null = null;
function cutUniform(gpu: Gpu, cut: { value: number }) {
  return gpu.TSL.uniform(cut.value).onRenderUpdate(() => cut.value);
}

/**
 * **Der Zwilling einer Wand, der abschneidet** (`grid/wallCut.wallCutTwin`):
 * Alles über `uWallCutY` (Weltkoordinaten, mit Bündeln und Instanzen) fällt
 * weg, beide Seiten werden gezeichnet, und die Rückseiten — die offene
 * Oberkante von schräg oben — nach allem anderen um `insideShade` dunkler,
 * wie unter WebGL nach dem Tonemapping und der Umrechnung nach sRGB.
 *
 * Trägt das Original schon eigene Knoten (die Tapete), bleiben sie: Der
 * Schnitt kommt dazu, wie unter WebGL nach dem eigenen `onBeforeCompile`.
 */
export function wallCutNodeTwin(
  material: THREE.Material,
  cut: { value: number },
  insideShade: number,
): THREE.Material | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const made = toNodeMaterial(gpu, material);
  if (!made) return null;
  const { TSL } = gpu;
  cutY ??= cutUniform(gpu, cut);
  made.side = THREE.DoubleSide;
  const keep = TSL.positionWorld.y.lessThanEqual(cutY);
  const had = made.maskNode as WebGPU.Node<'bool'> | null;
  made.maskNode = had ? had.and(keep) : keep;
  const shade = TSL.select(TSL.frontFacing, TSL.float(1), TSL.float(insideShade));
  made.outputNode = TSL.vec4(TSL.output.rgb.mul(shade), TSL.output.a);
  return made as unknown as THREE.Material;
}

/**
 * **Die wirbelnde Scheibe im Tor** (`hub/gate.buildGate`). Das
 * `ShaderMaterial` schreibt seine Farbe roh ins Bild — ohne Tonemapping und
 * ohne Umrechnung nach sRGB —, deshalb steht sie hier als `outputNode`, an
 * `setupOutput` (und damit an `appRenderer.inlineOutput`) vorbei.
 */
export function gateDiscNodeMaterial(accent: THREE.Color): THREE.ShaderMaterial | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const { TSL } = gpu;
  const uTime = TSL.uniform(0);
  const uColor = TSL.uniform(accent);
  const material = new gpu.MeshBasicNodeMaterial({ transparent: true, side: THREE.DoubleSide });
  material.fog = false;
  material.toneMapped = false;
  // Dieselbe Absprache wie die übrigen Nachbauten roher Shader
  // (`appRenderer`): nichts anhängen. Der `outputNode` geht ohnehin vorbei.
  material.userData.rawOutput = true;
  const p = TSL.uv().mul(2).sub(1);
  const r = TSL.length(p);
  const a = TSL.atan(p.y, p.x);
  const swirl = TSL.sin(a.mul(3).add(uTime.mul(1.4)).sub(r.mul(7)))
    .mul(0.5)
    .add(0.5);
  const glow = TSL.smoothstep(1, 0.25, r);
  const alpha = glow.mul(swirl.mul(0.45).add(0.35));
  material.outputNode = TSL.vec4(uColor.mul(swirl.mul(0.8).add(0.6)), alpha);
  return asShaderMaterial(material, { uTime, uColor });
}
