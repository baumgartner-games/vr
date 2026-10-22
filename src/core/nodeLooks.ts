import * as THREE from 'three';
import type * as WebGPU from 'three/webgpu';
import { webgpuModule } from './appRenderer';

/**
 * **Die eigenen Shader noch einmal, für den neuen Renderer.**
 *
 * Der `WebGPURenderer` (_Grafik → Renderer: Multiview_, `core/rendererKind.ts`)
 * kennt kein `ShaderMaterial`: Was eins trägt, zeichnet er gar nicht
 * („Material "ShaderMaterial" is not compatible"). Für die Stellen, die man in
 * Haunting sieht, steht hier dieselbe Rechnung als Knotenmaterial (TSL).
 *
 * Damit die Stellen selbst fast nichts merken, trägt jedes Knotenmaterial ein
 * `uniforms`-Feld wie ein `ShaderMaterial`: dieselben Namen, und hinter jedem
 * steht ein Knoten mit `.value`. Wer `material.uniforms.uFog.value = 0.4`
 * schreibt, schreibt in den Knoten. Zurückgegeben wird es deshalb als
 * `ShaderMaterial` — es sieht für die Aufrufer genauso aus.
 *
 * Jede Funktion gibt `null` zurück, solange WebGL zeichnet; dann baut die
 * Stelle ihr `ShaderMaterial` wie immer.
 */

type Uniforms = Record<string, { value: unknown }>;

function wrap(material: WebGPU.NodeMaterial, uniforms: Uniforms): THREE.ShaderMaterial {
  (material as unknown as { uniforms: Uniforms }).uniforms = uniforms;
  return material as unknown as THREE.ShaderMaterial;
}

/** **Der Himmel** (`shared/environment.createSky`): Verlauf von unten nach oben. */
export function skyNodeMaterial(
  top: THREE.Color,
  bottom: THREE.Color,
  shown: { value: number },
): THREE.ShaderMaterial | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const { TSL } = gpu;
  const topColor = TSL.uniform(top);
  const bottomColor = TSL.uniform(bottom);
  const skyShown = TSL.uniform(shown.value).onRenderUpdate(() => shown.value);
  const material = new gpu.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false });
  const h = TSL.clamp(TSL.normalize(TSL.positionLocal).y.mul(0.5).add(0.5), 0, 1);
  material.colorNode = TSL.mix(bottomColor, topColor, TSL.pow(h, 0.8));
  material.opacityNode = skyShown;
  material.transparent = false;
  material.alphaTest = 0.5;
  material.fog = false;
  return wrap(material, { topColor, bottomColor, skyShown });
}

/**
 * **Ein Saum als umgestülpte Hülle** (`outlineShell.ts`, `highlight.ts`) —
 * aufgeblasen entlang `bgvrOutlineNormal`, so viel, dass die Kante auf dem
 * Bild gleich breit bleibt, gedeckelt bei `maxGrow`. `scale` ist die größte
 * Weltskalierung des Netzes: Aufgeblasen wird im eigenen Raum des Netzes.
 */
export function shellNodeMaterial(
  thickness: number,
  maxGrow: number,
  color: THREE.Color,
  scale: number,
): THREE.ShaderMaterial | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const { TSL } = gpu;
  const uThickness = TSL.uniform(thickness);
  const uMaxGrow = TSL.uniform(maxGrow);
  const uScale = TSL.uniform(Math.max(scale, 1e-4));
  const diffuse = TSL.uniform(color);
  const material = new gpu.MeshBasicNodeMaterial({ side: THREE.BackSide });
  const normal = TSL.normalize(TSL.attribute('bgvrOutlineNormal', 'vec3'));
  const view = TSL.modelViewMatrix.mul(TSL.vec4(TSL.positionLocal, 1));
  const distance = TSL.max(view.z.negate(), 0.02);
  // P · (0, 1, 0, 0) ist die zweite Spalte, ihr y also P[1][1].
  const projY = TSL.max(TSL.cameraProjectionMatrix.mul(TSL.vec4(0, 1, 0, 0)).y, 0.0001);
  const grow = TSL.min(uThickness.mul(distance).div(projY), uMaxGrow).div(uScale);
  material.positionNode = TSL.positionLocal.add(normal.mul(grow));
  material.colorNode = diffuse;
  material.fog = false;
  return wrap(material, { thickness: uThickness, maxGrow: uMaxGrow, diffuse });
}

/**
 * **Der dunkle Rand der Bewegungshilfe** (`haunting/HauntingComfort.ts`) —
 * eine Fläche über dem ganzen Bild, zum Rand hin schwarz.
 */
export function comfortBorderNodeMaterial(): THREE.ShaderMaterial | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const { TSL } = gpu;
  const amount = TSL.uniform(0);
  const primaryView = TSL.uniform(1);
  const material = new gpu.MeshBasicNodeMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  material.toneMapped = false;
  material.vertexNode = TSL.vec4(TSL.positionGeometry.xy, 0, 1);
  material.colorNode = TSL.vec3(0, 0, 0);
  const rim = TSL.smoothstep(0.46, 0.94, TSL.length(TSL.positionGeometry.xy));
  material.opacityNode = rim.mul(amount).mul(primaryView);
  return wrap(material, { amount, primaryView });
}

/** **Der beschlagene Helm** (`haunting/helmetCondensation.ts`). */
export function condensationNodeMaterial(): THREE.ShaderMaterial | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const { TSL } = gpu;
  const fogAmount = TSL.uniform(0);
  const damage = TSL.uniform(0);
  const time = TSL.uniform(0);
  const material = new gpu.MeshBasicNodeMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const p = TSL.uv().sub(0.5).mul(2);
  const load = TSL.smoothstep(0.05, 0.9, fogAmount);
  const breath = TSL.sin(time.mul(fogAmount.mul(1.2).add(2.4)))
    .mul(0.15)
    .add(0.85);
  const white = load.mul(0.42).mul(breath);
  const edge = TSL.smoothstep(0.5, 1, TSL.length(p.mul(TSL.vec2(0.82, 1))));
  const hurt = edge.mul(damage).mul(0.2);
  material.colorNode = TSL.mix(
    TSL.vec3(1, 1, 1),
    TSL.vec3(0.61, 0.1, 0.12),
    hurt.div(TSL.max(white.add(hurt), 0.001)),
  );
  material.opacityNode = TSL.min(white.add(hurt), 0.6);
  return wrap(material, { fogAmount, damage, time });
}

/**
 * **Das beschlagene Visier** (`core/visorFog.ts`) — ohne das Rauschen am Rand
 * des Fächers, sonst dieselbe Rechnung.
 */
export function visorFogNodeMaterial(): THREE.ShaderMaterial | null {
  const gpu = webgpuModule();
  if (!gpu) return null;
  const { TSL } = gpu;
  const uFog = TSL.uniform(0);
  const uRealistic = TSL.uniform(1);
  const uImage = TSL.uniform(0);
  const blank = new THREE.Texture();
  const map = TSL.texture(blank);
  const uMap = {
    get value(): THREE.Texture | null {
      return map.value === blank ? null : map.value;
    },
    set value(next: THREE.Texture | null) {
      map.value = next ?? blank;
    },
  };
  const uBoxMin = TSL.uniform(new THREE.Vector3());
  const uBoxSize = TSL.uniform(new THREE.Vector3(1, 1, 1));
  const material = new gpu.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4,
  });
  const local = TSL.positionGeometry.sub(uBoxMin).div(uBoxSize.x);
  const p = TSL.clamp(TSL.positionGeometry.xy.sub(uBoxMin.xy).div(uBoxSize.xy), 0, 1);
  const grain = TSL.select(uImage.greaterThan(0.5), map.sample(local.xy.mul(1.5)).r, 0.5);
  const d = TSL.vec2(p.x.sub(0.5).mul(1.15), p.y.mul(1.35));
  const reach = TSL.mix(0.12, 1.9, uFog);
  const r = TSL.length(d);
  const realistic = uRealistic.greaterThan(0.5);
  const cover = TSL.select(realistic, TSL.smoothstep(reach.mul(0.55), reach, r).oneMinus(), 1);
  const density = TSL.select(
    realistic,
    uFog.mul(TSL.mix(1.25, 0.8, TSL.clamp(r.div(TSL.max(reach, 0.001)), 0, 1))),
    uFog,
  );
  material.colorNode = TSL.vec3(0.86, 0.9, 0.93).mul(TSL.mix(0.93, 1.06, grain));
  material.opacityNode = TSL.clamp(density.mul(cover).mul(TSL.mix(0.8, 1.12, grain)), 0, 0.94);
  return wrap(material, { uFog, uRealistic, uImage, uMap, uBoxMin, uBoxSize });
}
